import crypto from 'crypto';
import express, { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { config } from '../config';
import { prisma } from '../database';
import { idParam } from '../lib/auth';
import { requireAuth } from '../middleware/auth';
import { AiError, aiConfigured, rewriteContent } from '../services/ai';
import { SiteContent, contentSchema } from '../sites/content';
import { generateContent } from '../sites/generate';
import { savePreview } from '../sites/previewStore';
import { renderSite } from '../sites/render';
import { STYLE_BY_KEY } from '../sites/styles';

export const SITE_CREATION_COST = 100;
export const AI_EDIT_COST = 10;
const PREVIEW_DAYS = 7;

const router = express.Router();
router.use(requireAuth);

const langSchema = z.enum(['fr', 'en', 'ar']);

const createSchema = z.object({
  name: z.string().trim().min(1).max(255),
  template_key: z.string().min(1).max(50),
  lang: langSchema.default('fr'),
  kind: z.string().max(50).optional(),
  address: z.string().max(300).optional(),
  phone: z.string().max(50).optional(),
  email: z.union([z.literal(''), z.string().email().max(255)]).optional(),
  source: z.object({ id: z.string().max(60), lat: z.number(), lon: z.number() }).optional()
});

const updateSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  template_key: z.string().min(1).max(50).optional(),
  lang: langSchema.optional(),
  content: contentSchema.optional()
});

const previewSchema = z.object({
  name: z.string().trim().min(1).max(255),
  template_key: z.string().min(1).max(50),
  lang: langSchema.default('fr'),
  content: contentSchema
});

const paymentSchema = z
  .object({
    setup_amount: z.number().min(0).max(100000),
    monthly_amount: z.number().min(0).max(10000),
    currency: z.enum(['USD', 'EUR', 'MAD']).default('USD')
  })
  .refine((v) => v.setup_amount > 0 || v.monthly_amount > 0, 'Indiquez au moins un montant');

const publishSchema = z.object({ mode: z.enum(['preview', 'live']) });
const aiSchema = z.object({ instruction: z.string().trim().min(3).max(500) });

const toCents = (n: number): number => Math.round(n * 100);

function slugify(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return `${base || 'site'}-${crypto.randomBytes(3).toString('hex')}`;
}

type SiteWithLinks = Prisma.SiteGetPayload<{ include: { payment_links: true } }>;

function siteDto(site: SiteWithLinks) {
  const expired = site.status === 'preview' && !!site.preview_expires_at && site.preview_expires_at < new Date();
  return {
    id: site.id,
    name: site.name,
    slug: site.slug,
    template_key: site.template_key,
    lang: site.lang,
    content: site.content,
    status: site.status,
    preview_expired: expired,
    preview_expires_at: site.preview_expires_at,
    published_at: site.published_at,
    public_url: site.status === 'draft' ? null : `${config.publicBaseUrl}/s/${site.slug}`,
    created_at: site.created_at,
    updated_at: site.updated_at,
    payment_links: site.payment_links
      .slice()
      .sort((a, b) => b.id - a.id)
      .map((p) => ({
        id: p.id,
        token: p.token,
        setup_cents: p.setup_cents,
        monthly_cents: p.monthly_cents,
        currency: p.currency,
        status: p.status,
        payout_cents: p.payout_cents,
        paid_at: p.paid_at
      }))
  };
}

async function findOwned(req: Request, res: Response): Promise<SiteWithLinks | null> {
  const id = idParam.safeParse(req.params.id);
  if (!id.success) {
    res.status(400).json({ error: 'Invalid id' });
    return null;
  }
  const site = await prisma.site.findFirst({
    where: { id: id.data, user_id: req.user!.userId },
    include: { payment_links: true }
  });
  if (!site) {
    res.status(404).json({ error: 'Site not found' });
    return null;
  }
  return site;
}

function fail(res: Response, label: string, error: unknown) {
  console.error(`${label} failed:`, error);
  return res.status(500).json({ error: 'Internal server error' });
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const sites = await prisma.site.findMany({
      where: { user_id: req.user!.userId },
      include: { payment_links: true },
      orderBy: { updated_at: 'desc' }
    });
    return res.json(sites.map(siteDto));
  } catch (error) {
    return fail(res, 'list sites', error);
  }
});

// Rendu à la volée du brouillon en cours d'édition (rien n'est enregistré)
router.post('/preview', async (req: Request, res: Response) => {
  const parsed = previewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
  const style = STYLE_BY_KEY.get(parsed.data.template_key);
  if (!style) return res.status(400).json({ error: 'Unknown template' });
  const html = renderSite({ name: parsed.data.name, lang: parsed.data.lang, content: parsed.data.content, style, templateKey: parsed.data.template_key, noindex: true });
  try {
    const id = await savePreview(req.user!.userId, html, !!style.pack);
    return res.json({ url: `${config.publicBaseUrl}/s/_p/${id}` });
  } catch (error) {
    return fail(res, 'save preview', error);
  }
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
  const d = parsed.data;
  const style = STYLE_BY_KEY.get(d.template_key);
  if (!style) return res.status(400).json({ error: 'Unknown template' });

  const userId = req.user!.userId;
  try {
    const site = await prisma.$transaction(async (tx) => {
      // Débit conditionnel : évite de passer sous zéro, même avec deux requêtes simultanées
      const debit = await tx.user.updateMany({
        where: { id: userId, credits: { gte: SITE_CREATION_COST } },
        data: { credits: { decrement: SITE_CREATION_COST } }
      });
      if (debit.count === 0) return null;
      await tx.creditEntry.create({ data: { user_id: userId, delta: -SITE_CREATION_COST, reason: `Création du site « ${d.name.slice(0, 60)} »` } });
      return tx.site.create({
        data: {
          user_id: userId,
          name: d.name,
          slug: slugify(d.name),
          template_key: d.template_key,
          lang: d.lang,
          content: generateContent({ name: d.name, kind: d.kind, address: d.address, phone: d.phone, email: d.email, lang: d.lang }, style),
          source: d.source ?? Prisma.JsonNull
        },
        include: { payment_links: true }
      });
    });
    if (!site) return res.status(402).json({ error: `Crédits insuffisants : une création coûte ${SITE_CREATION_COST} crédits.` });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } });
    return res.status(201).json({ ...siteDto(site), credits_left: user?.credits ?? 0 });
  } catch (error) {
    return fail(res, 'create site', error);
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const site = await findOwned(req, res);
    if (site) res.json(siteDto(site));
  } catch (error) {
    fail(res, 'get site', error);
  }
});

router.patch('/:id', async (req: Request, res: Response) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
  if (parsed.data.template_key && !STYLE_BY_KEY.has(parsed.data.template_key)) return res.status(400).json({ error: 'Unknown template' });
  try {
    const site = await findOwned(req, res);
    if (!site) return;
    const updated = await prisma.site.update({
      where: { id: site.id },
      data: parsed.data as { name?: string; template_key?: string; lang?: string; content?: SiteContent },
      include: { payment_links: true }
    });
    res.json(siteDto(updated));
  } catch (error) {
    fail(res, 'update site', error);
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const site = await findOwned(req, res);
    if (!site) return;
    await prisma.site.delete({ where: { id: site.id } });
    res.status(204).end();
  } catch (error) {
    fail(res, 'delete site', error);
  }
});

router.post('/:id/publish', async (req: Request, res: Response) => {
  const parsed = publishSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input' });
  try {
    const site = await findOwned(req, res);
    if (!site) return;
    const now = new Date();
    if (parsed.data.mode === 'live' && !site.payment_links.some((p) => p.status === 'paid')) {
      return res.status(402).json({ error: 'Le site passe en ligne dès que le client a payé. Créez un lien de paiement et envoyez-le.' });
    }
    const data =
      parsed.data.mode === 'live'
        ? { status: 'live' as const, published_at: now, preview_expires_at: null }
        : { status: 'preview' as const, published_at: now, preview_expires_at: new Date(now.getTime() + PREVIEW_DAYS * 86400000) };
    const updated = await prisma.site.update({ where: { id: site.id }, data, include: { payment_links: true } });
    res.json(siteDto(updated));
  } catch (error) {
    fail(res, 'publish site', error);
  }
});

router.get('/ai/status', (_req: Request, res: Response) => {
  res.json({ configured: aiConfigured(), cost: AI_EDIT_COST });
});

// Réécriture assistée par IA (via OmniRoute). La proposition n'est pas enregistrée :
// l'utilisateur la relit, puis l'enregistre. Les crédits ne sont débités qu'en cas de succès.
router.post('/:id/ai', async (req: Request, res: Response) => {
  const parsed = aiSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
  try {
    const site = await findOwned(req, res);
    if (!site) return;
    const userId = req.user!.userId;
    const me = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } });
    if (!me || me.credits < AI_EDIT_COST) return res.status(402).json({ error: `Crédits insuffisants : une modification par IA coûte ${AI_EDIT_COST} crédits.` });

    const current = contentSchema.safeParse(site.content);
    if (!current.success) return res.status(500).json({ error: 'Le contenu du site est invalide.' });

    let content: SiteContent;
    try {
      content = await rewriteContent({ name: site.name, lang: site.lang, instruction: parsed.data.instruction, current: current.data });
    } catch (error) {
      if (error instanceof AiError) return res.status(error.status).json({ error: error.message });
      throw error;
    }

    const debit = await prisma.$transaction(async (tx) => {
      const d = await tx.user.updateMany({ where: { id: userId, credits: { gte: AI_EDIT_COST } }, data: { credits: { decrement: AI_EDIT_COST } } });
      if (d.count === 0) return false;
      await tx.creditEntry.create({ data: { user_id: userId, delta: -AI_EDIT_COST, reason: `Modification IA du site « ${site.name.slice(0, 60)} »` } });
      return true;
    });
    if (!debit) return res.status(402).json({ error: 'Crédits insuffisants.' });
    const after = await prisma.user.findUnique({ where: { id: userId }, select: { credits: true } });
    return res.json({ content, credits_left: after?.credits ?? 0 });
  } catch (error) {
    return fail(res, 'ai edit', error);
  }
});

router.post('/:id/unpublish', async (req: Request, res: Response) => {
  try {
    const site = await findOwned(req, res);
    if (!site) return;
    const updated = await prisma.site.update({
      where: { id: site.id },
      data: { status: 'draft', preview_expires_at: null },
      include: { payment_links: true }
    });
    res.json(siteDto(updated));
  } catch (error) {
    fail(res, 'unpublish site', error);
  }
});

router.post('/:id/payment-link', async (req: Request, res: Response) => {
  const parsed = paymentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().formErrors.concat(Object.values(parsed.error.flatten().fieldErrors).flat() as string[]) });
  try {
    const site = await findOwned(req, res);
    if (!site) return;
    if (site.payment_links.some((p) => p.status === 'paid')) return res.status(409).json({ error: 'Ce site a déjà été payé.' });
    await prisma.$transaction([
      prisma.paymentLink.updateMany({ where: { site_id: site.id, status: 'pending' }, data: { status: 'canceled' } }),
      prisma.paymentLink.create({
        data: {
          site_id: site.id,
          token: crypto.randomBytes(24).toString('hex'),
          setup_cents: toCents(parsed.data.setup_amount),
          monthly_cents: toCents(parsed.data.monthly_amount),
          currency: parsed.data.currency
        }
      })
    ]);
    const updated = await prisma.site.findUniqueOrThrow({ where: { id: site.id }, include: { payment_links: true } });
    res.status(201).json(siteDto(updated));
  } catch (error) {
    fail(res, 'create payment link', error);
  }
});

export const earningsRouter = express.Router();
earningsRouter.use(requireAuth);

earningsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const paid = await prisma.paymentLink.findMany({
      where: { status: 'paid', site: { user_id: req.user!.userId } },
      include: { site: { select: { id: true, name: true, status: true } } },
      orderBy: { paid_at: 'desc' }
    });
    const keep = 1 - config.platformFeeRate;
    res.json({
      mode: config.paymentsMode,
      commission_rate: config.platformFeeRate,
      // Un total par devise : on n'additionne jamais des dirhams et des dollars
      by_currency: [...new Set(paid.map((p) => p.currency))].map((currency) => ({
        currency,
        total_paid_out_cents: paid.filter((p) => p.currency === currency).reduce((s, p) => s + p.payout_cents, 0),
        monthly_recurring_cents: Math.round(
          paid.filter((p) => p.currency === currency && p.site.status === 'live').reduce((s, p) => s + p.monthly_cents, 0) * keep
        )
      })),
      payments: paid.map((p) => ({
        id: p.id,
        site_id: p.site.id,
        site_name: p.site.name,
        total_cents: p.setup_cents + p.monthly_cents,
        currency: p.currency,
        fee_cents: p.fee_cents,
        payout_cents: p.payout_cents,
        paid_at: p.paid_at
      }))
    });
  } catch (error) {
    fail(res, 'earnings', error);
  }
});

export default router;
