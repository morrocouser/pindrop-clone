import path from 'path';
import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { prisma } from '../database';
import { contentSchema } from '../sites/content';
import { esc, renderSite } from '../sites/render';
import { PACKS_DIR } from '../sites/packs';
import { getPreview } from '../sites/previewStore';
import { SITE_STYLES, STYLE_BY_KEY } from '../sites/styles';

export const siteRouter = express.Router();
export const payRouter = express.Router();

// Pages générées à partir de contenus saisis par des utilisateurs : aucun script autorisé,
// et la page est isolée (sandbox) de l'origine de l'API.
const SITE_CSP = [
  "default-src 'none'",
  "style-src 'unsafe-inline' https://fonts.googleapis.com",
  'font-src https://fonts.gstatic.com',
  'img-src https: data:',
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'",
  'sandbox'
].join('; ');

// Gabarits open source complets : ils ont leurs propres scripts (menu, animations) et chargent
// polices et icônes depuis des CDN. La page reste isolée (sandbox sans allow-same-origin).
// Page sandboxée = origine opaque : « 'self' » ne correspond plus à rien, on nomme donc l'origine de l'API.
const SELF = config.publicBaseUrl;
const PACK_CSP = [
  "default-src 'none'",
  `script-src ${SELF} 'unsafe-inline' https://unpkg.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://code.jquery.com`,
  `style-src ${SELF} 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net`,
  `font-src ${SELF} data: https://fonts.gstatic.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net`,
  `img-src ${SELF} https: data:`,
  // Les icônes Ionicons sont chargées par fetch depuis unpkg
  "connect-src https://unpkg.com https://cdn.jsdelivr.net",
  `base-uri ${SELF}`,
  "form-action 'none'",
  "frame-ancestors 'none'"
].join('; ');

const STATIC_EXT = new Set(['.css', '.js', '.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.eot']);

/** Fichiers statiques des gabarits : /t/<clé>/... (jamais le HTML source, qui contient les champs). */
export const packRouter = express.Router();
packRouter.use('/:key', (req: Request, res: Response, next) => {
  const known = SITE_STYLES.some((s) => s.pack === req.params.key);
  if (!known || (req.path !== '/LICENSE' && !STATIC_EXT.has(path.extname(req.path).toLowerCase()))) return res.status(404).end();
  // Les pages de sites sont isolées (origine « null ») : leurs polices et modules exigent un en-tête CORS ouvert
  res.removeHeader('Access-Control-Allow-Credentials');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  return express.static(path.join(PACKS_DIR, req.params.key), { index: false, dotfiles: 'ignore', maxAge: '1h' })(req, res, next);
});

function infoPage(title: string, message: string): string {
  return `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title><body style="font:18px/1.5 system-ui;max-width:32rem;margin:20vh auto;padding:0 20px"><h1 style="font-size:1.6rem">${esc(title)}</h1><p>${esc(message)}</p></body></html>`;
}

// Aperçu d'un brouillon (voir previewStore) : URL non devinable, expire au bout de 10 minutes
siteRouter.get('/_p/:id', async (req: Request, res: Response) => {
  const p = await getPreview(req.params.id).catch(() => null);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (!p) return res.status(404).send(infoPage('Aperçu expiré', "Rechargez l'éditeur pour régénérer l'aperçu."));
  // Seul l'éditeur (origines autorisées de l'application) peut afficher cet aperçu dans un iframe
  res.removeHeader('X-Frame-Options');
  res.setHeader('Content-Security-Policy', (p.pack ? PACK_CSP : SITE_CSP).replace("frame-ancestors 'none'", 'frame-ancestors ' + config.corsOrigins.join(' ')));
  return res.send(p.html);
});

siteRouter.get('/:slug', async (req: Request, res: Response) => {
  res.setHeader('Content-Security-Policy', SITE_CSP);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  try {
    // Le gabarit choisi détermine la politique : les modèles complets ont besoin de leurs scripts
    const chosen = await prisma.site.findUnique({ where: { slug: req.params.slug }, select: { template_key: true } });
    if (chosen && STYLE_BY_KEY.get(chosen.template_key)?.pack) res.setHeader('Content-Security-Policy', PACK_CSP);
    const site = await prisma.site.findUnique({ where: { slug: req.params.slug } });
    if (!site || site.status === 'draft') return res.status(404).send(infoPage('Page introuvable', "Ce site n'existe pas ou n'est pas publié."));
    if (site.status === 'preview' && site.preview_expires_at && site.preview_expires_at < new Date()) {
      return res.status(410).send(infoPage('Aperçu expiré', "L'aperçu de 7 jours de ce site est terminé."));
    }
    const style = STYLE_BY_KEY.get(site.template_key);
    const content = contentSchema.safeParse(site.content);
    if (!style || !content.success) return res.status(500).send(infoPage('Erreur', "Ce site ne peut pas être affiché pour l'instant."));
    // Les aperçus restent cachés des moteurs de recherche ; seuls les sites payés sont indexables
    if (site.status === 'preview') res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(renderSite({ name: site.name, lang: site.lang, content: content.data, style, templateKey: site.template_key, noindex: site.status !== 'live' }));
  } catch (error) {
    console.error('serve site failed:', error);
    return res.status(500).send(infoPage('Erreur', 'Réessayez dans un instant.'));
  }
});

payRouter.use(rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));

payRouter.get('/:token', async (req: Request, res: Response) => {
  try {
    const link = await prisma.paymentLink.findUnique({ where: { token: req.params.token }, include: { site: { select: { name: true } } } });
    if (!link) return res.status(404).json({ error: 'Lien de paiement introuvable' });
    return res.json({
      business_name: link.site.name,
      setup_cents: link.setup_cents,
      monthly_cents: link.monthly_cents,
      currency: link.currency,
      status: link.status,
      mode: config.paymentsMode
    });
  } catch (error) {
    console.error('pay details failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Mode test : simule le paiement. Un vrai débit nécessite l'intégration Stripe, non branchée ici.
payRouter.post('/:token/confirm', async (req: Request, res: Response) => {
  if (config.paymentsMode !== 'test') return res.status(501).json({ error: "Le paiement par carte n'est pas encore configuré." });
  try {
    const link = await prisma.paymentLink.findUnique({ where: { token: req.params.token } });
    if (!link) return res.status(404).json({ error: 'Lien de paiement introuvable' });
    const total = link.setup_cents + link.monthly_cents;
    const fee = Math.round(total * config.platformFeeRate);
    const now = new Date();
    // Transition atomique pending -> paid : un double clic ne peut pas payer deux fois
    const paid = await prisma.$transaction(async (tx) => {
      const claimed = await tx.paymentLink.updateMany({
        where: { id: link.id, status: 'pending' },
        data: { status: 'paid', fee_cents: fee, payout_cents: total - fee, paid_at: now }
      });
      if (claimed.count === 0) return false; // déjà payé ou annulé : le site ne change pas
      await tx.site.update({ where: { id: link.site_id }, data: { status: 'live', published_at: now, preview_expires_at: null } });
      return true;
    });
    if (!paid) return res.status(409).json({ error: "Ce lien n'est plus valable." });
    return res.json({ status: 'paid' });
  } catch (error) {
    console.error('pay confirm failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
