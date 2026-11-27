import { config } from '../src/config';
import { prisma } from '../src/database';
import { IP_HEADER, api, auth, createSite, freshIp, registerUser } from './helpers';

const pay = (token: string) => api().post(`/api/pay/${token}/confirm`).set(IP_HEADER, freshIp());

async function siteWithLink(setup = 1500, monthly = 99.99, currency = 'MAD') {
  const u = await registerUser();
  const s = await createSite(u);
  const res = await api().post(`/api/sites/${s.id}/payment-link`).set(auth(u)).send({ setup_amount: setup, monthly_amount: monthly, currency });
  expect(res.status).toBe(201);
  return { u, s, link: res.body.payment_links[0] as { token: string; setup_cents: number; monthly_cents: number } };
}

describe('liens de paiement', () => {
  it.each([
    ['montant négatif', { setup_amount: -5, monthly_amount: 0 }],
    ['deux montants à zéro', { setup_amount: 0, monthly_amount: 0 }],
    ['devise inconnue', { setup_amount: 10, monthly_amount: 0, currency: 'BTC' }]
  ])('refuse : %s', async (_l, body) => {
    const u = await registerUser();
    const s = await createSite(u);
    expect((await api().post(`/api/sites/${s.id}/payment-link`).set(auth(u)).send(body)).status).toBe(400);
  });

  it('convertit en centimes et annule l’ancien lien en attente', async () => {
    const { u, s, link } = await siteWithLink();
    expect(link).toMatchObject({ setup_cents: 150000, monthly_cents: 9999 });
    const again = await api().post(`/api/sites/${s.id}/payment-link`).set(auth(u)).send({ setup_amount: 10, monthly_amount: 0 });
    expect(again.body.payment_links.map((p: { status: string }) => p.status)).toEqual(['pending', 'canceled']);
    expect((await pay(link.token)).status).toBe(409);
  });

  it('renvoie 404 pour un lien inconnu', async () => {
    expect((await api().get('/api/pay/inexistant').set(IP_HEADER, freshIp())).status).toBe(404);
  });
});

describe('paiement simulé (développement)', () => {
  it('paie une seule fois, même avec 8 confirmations simultanées, puis met le site en ligne', async () => {
    const { u, s, link } = await siteWithLink();
    const info = await api().get(`/api/pay/${link.token}`).set(IP_HEADER, freshIp());
    expect(info.body).toMatchObject({ business_name: 'Café Test', currency: 'MAD', status: 'pending', payable: true });

    const results = await Promise.all(Array.from({ length: 8 }, () => pay(link.token)));
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(7);

    const site = await api().get(`/api/sites/${s.id}`).set(auth(u));
    expect(site.body.status).toBe('live');

    const earnings = await api().get('/api/earnings').set(auth(u));
    const total = 150000 + 9999;
    expect(earnings.body.by_currency).toEqual([
      { currency: 'MAD', total_paid_out_cents: total - Math.round(total * 0.1), monthly_recurring_cents: Math.round(9999 * 0.9) }
    ]);

    expect((await api().post(`/api/sites/${s.id}/payment-link`).set(auth(u)).send({ setup_amount: 10, monthly_amount: 0 })).status).toBe(409);
  });

  it('les revenus d’un utilisateur sont invisibles pour les autres', async () => {
    const { link } = await siteWithLink();
    await pay(link.token);
    const other = await registerUser();
    expect((await api().get('/api/earnings').set(auth(other))).body.payments).toEqual([]);
  });
});

describe('paiement simulé coupé en production', () => {
  const saved = config.allowTestPayments;
  beforeEach(() => {
    config.allowTestPayments = false;
  });
  afterEach(() => {
    config.allowTestPayments = saved;
  });

  it('refuse la confirmation : le propriétaire ne peut plus mettre son site en ligne gratuitement', async () => {
    const { s, link } = await siteWithLink(0.01, 0);
    expect((await api().get(`/api/pay/${link.token}`).set(IP_HEADER, freshIp())).body.payable).toBe(false);
    expect((await pay(link.token)).status).toBe(503);
    const site = await prisma.site.findUniqueOrThrow({ where: { id: s.id }, include: { payment_links: true } });
    expect(site.status).toBe('draft');
    expect(site.payment_links[0].status).toBe('pending');
  });
});
