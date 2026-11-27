import { prisma } from '../src/database';
import { PACK_TEMPLATE, SIMPLE_TEMPLATE, api, auth, content, createSite, registerUser } from './helpers';

describe('création et édition', () => {
  it('crée un site et débite 100 crédits', async () => {
    const u = await registerUser();
    const res = await api().post('/api/sites').set(auth(u)).send({ name: 'Boulangerie', template_key: SIMPLE_TEMPLATE });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ status: 'draft', credits_left: 2900, public_url: null });
    expect(await prisma.creditEntry.count({ where: { user_id: u.id } })).toBe(1);
  });

  it('refuse un modèle inconnu', async () => {
    const u = await registerUser();
    expect((await api().post('/api/sites').set(auth(u)).send({ name: 'X', template_key: 'inexistant' })).status).toBe(400);
  });

  it('enregistre le contenu, la langue et le modèle', async () => {
    const u = await registerUser();
    const s = await createSite(u);
    const res = await api().patch(`/api/sites/${s.id}`).set(auth(u)).send({ lang: 'ar', template_key: PACK_TEMPLATE, content: content() });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ lang: 'ar', template_key: PACK_TEMPLATE, content: { headline: 'Bienvenue' } });
  });

  it.each([
    ['couleur invalide', { colors: { primary: 'red', accent: '#000000' } }],
    ['photo javascript:', { photos: ['javascript:alert(1)'] }],
    ['photo en http', { photos: ['http://exemple.com/a.jpg'] }],
    ['WhatsApp non numérique', { whatsapp: '123"><script>' }],
    ['trop de services', { services: Array(9).fill('x') }]
  ])('refuse : %s', async (_label, over) => {
    const u = await registerUser();
    const s = await createSite(u);
    expect((await api().patch(`/api/sites/${s.id}`).set(auth(u)).send({ content: content(over) })).status).toBe(400);
  });

  it('empêche de passer sous zéro crédit, même avec 40 créations simultanées', async () => {
    const u = await registerUser();
    const all = await Promise.all(
      Array.from({ length: 40 }, (_, i) => api().post('/api/sites').set(auth(u)).send({ name: `S${i}`, template_key: SIMPLE_TEMPLATE }))
    );
    expect(all.filter((r) => r.status === 201)).toHaveLength(30);
    expect(all.filter((r) => r.status === 402)).toHaveLength(10);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).credits).toBe(0);
  });
});

describe('publication', () => {
  it('suit le cycle brouillon → aperçu → dépublié → supprimé', async () => {
    const u = await registerUser();
    const s = await createSite(u);
    expect((await api().get(`/s/${s.slug}`)).status).toBe(404);

    const pub = await api().post(`/api/sites/${s.id}/publish`).set(auth(u)).send({ mode: 'preview' });
    expect(pub.body.status).toBe('preview');
    const page = await api().get(`/s/${s.slug}`);
    expect(page.status).toBe(200);
    expect(page.headers['x-robots-tag']).toContain('noindex');

    expect((await api().post(`/api/sites/${s.id}/unpublish`).set(auth(u))).body.status).toBe('draft');
    expect((await api().get(`/s/${s.slug}`)).status).toBe(404);
    expect((await api().delete(`/api/sites/${s.id}`).set(auth(u))).status).toBe(204);
  });

  it('refuse la mise en ligne sans paiement', async () => {
    const u = await registerUser();
    const s = await createSite(u);
    expect((await api().post(`/api/sites/${s.id}/publish`).set(auth(u)).send({ mode: 'live' })).status).toBe(402);
  });

  it('marque un aperçu expiré (410)', async () => {
    const u = await registerUser();
    const s = await createSite(u);
    await prisma.site.update({ where: { id: s.id }, data: { status: 'preview', preview_expires_at: new Date(Date.now() - 1000) } });
    expect((await api().get(`/s/${s.slug}`)).status).toBe(410);
  });

  it('sert l’aperçu du brouillon (UTF-8, arabe et numéro isolé)', async () => {
    const u = await registerUser();
    const res = await api().post('/api/sites/preview').set(auth(u)).send({ name: 'مقهى', template_key: SIMPLE_TEMPLATE, lang: 'ar', content: content() });
    expect(res.status).toBe(200);
    const path = new URL(res.body.url).pathname;
    const page = await api().get(path);
    expect(page.status).toBe(200);
    expect(page.text).toContain('مقهى');
    expect(page.headers['content-security-policy']).toContain('frame-ancestors http://localhost:5173');
    expect((await api().get('/s/_p/inexistant')).status).toBe(404);
  });
});

describe('isolation des pages publiques (CSP)', () => {
  async function publishedCsp(template: string) {
    const u = await registerUser();
    const s = await createSite(u, template);
    await api().post(`/api/sites/${s.id}/publish`).set(auth(u)).send({ mode: 'preview' });
    const page = await api().get(`/s/${s.slug}`);
    expect(page.status).toBe(200);
    return String(page.headers['content-security-policy']);
  }

  it('modèle simple : sandbox sans scripts, liens WhatsApp (nouvel onglet) autorisés', async () => {
    const csp = await publishedCsp(SIMPLE_TEMPLATE);
    expect(csp).toMatch(/(^|; )sandbox allow-popups allow-popups-to-escape-sandbox($|;)/);
    expect(csp).not.toContain('allow-scripts');
    expect(csp).not.toContain('allow-same-origin');
    expect(csp).not.toContain('script-src');
  });

  it('modèle simple : le bouton WhatsApp s’ouvre dans un nouvel onglet', async () => {
    const u = await registerUser();
    const s = await createSite(u);
    await api().patch(`/api/sites/${s.id}`).set(auth(u)).send({ content: content() });
    await api().post(`/api/sites/${s.id}/publish`).set(auth(u)).send({ mode: 'preview' });
    const page = await api().get(`/s/${s.slug}`);
    expect(page.text).toMatch(/<a class="wa-fab" href="https:\/\/wa\.me\/212661984321\?text=[^"]+" target="_blank"/);
  });

  it('modèle complet : sandbox avec scripts, mais jamais allow-same-origin', async () => {
    const csp = await publishedCsp(PACK_TEMPLATE);
    expect(csp).toMatch(/(^|; )sandbox allow-scripts/);
    expect(csp).not.toContain('allow-same-origin');
  });

  it('échappe un contenu malveillant sur la page publiée', async () => {
    const u = await registerUser();
    const s = await createSite(u, PACK_TEMPLATE);
    const xss = '<script>alert(1)</script>';
    await api().patch(`/api/sites/${s.id}`).set(auth(u)).send({ content: content({ headline: xss, photos: ['https://a.example/{{jsonld}}'] }) });
    await api().post(`/api/sites/${s.id}/publish`).set(auth(u)).send({ mode: 'preview' });
    const page = await api().get(`/s/${s.slug}`);
    expect(page.text).not.toContain(xss);
    expect(page.text).not.toMatch(/src="https:\/\/a\.example\/<script/);
  });
});

describe('cloisonnement entre utilisateurs', () => {
  it('un utilisateur ne peut ni voir ni modifier les sites d’un autre', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const s = await createSite(a);
    const calls = [
      api().get(`/api/sites/${s.id}`),
      api().patch(`/api/sites/${s.id}`).send({ name: 'piraté' }),
      api().post(`/api/sites/${s.id}/publish`).send({ mode: 'preview' }),
      api().post(`/api/sites/${s.id}/unpublish`),
      api().post(`/api/sites/${s.id}/payment-link`).send({ setup_amount: 1, monthly_amount: 0 }),
      api().post(`/api/sites/${s.id}/ai`).send({ instruction: 'bonjour' }),
      api().delete(`/api/sites/${s.id}`)
    ];
    for (const call of calls) expect((await call.set(auth(b))).status).toBe(404);
    expect((await api().get('/api/sites').set(auth(b))).body).toEqual([]);
    expect((await prisma.site.findUniqueOrThrow({ where: { id: s.id } })).name).toBe('Café Test');
  });

  it('entreprises : propriétaire et statut imposés, invisibles pour les autres', async () => {
    const a = await registerUser();
    const b = await registerUser();
    const res = await api().post('/api/businesses').set(auth(a)).send({ name: 'Biz', user_id: b.id, status: 'active' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ user_id: a.id, status: 'pending' });
    expect((await api().get(`/api/businesses/${res.body.id}`).set(auth(b))).status).toBe(404);
    expect((await api().get('/api/businesses').set(auth(b))).body).toEqual([]);
  });
});

describe('IA', () => {
  it('sans OmniRoute configuré : 503 et aucun crédit débité', async () => {
    const u = await registerUser();
    const s = await createSite(u);
    expect((await api().get('/api/sites/ai/status').set(auth(u))).body).toEqual({ configured: false, cost: 10 });
    expect((await api().post(`/api/sites/${s.id}/ai`).set(auth(u)).send({ instruction: 'Plus chaleureux' })).status).toBe(503);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: u.id } })).credits).toBe(2900);
  });
});
