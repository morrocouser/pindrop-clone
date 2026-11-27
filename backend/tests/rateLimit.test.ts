import type { Request } from 'express';
import type { Options } from 'express-rate-limit';
import { config } from '../src/config';
import { PgStore, clientKey } from '../src/lib/rateLimit';
import { IP_HEADER, api, freshIp } from './helpers';

const badLogin = (ip: string, xff?: string) => {
  const r = api().post('/api/auth/login').set(IP_HEADER, ip);
  if (xff) r.set('X-Forwarded-For', xff);
  return r.send({ email: 'brute@test.local', password: 'mauvais' });
};

describe('limitation des tentatives de connexion', () => {
  it('bloque (429) après 20 tentatives, même en changeant X-Forwarded-For', async () => {
    const ip = freshIp();
    for (let i = 0; i < 20; i++) expect((await badLogin(ip, `1.2.3.${i}`)).status).toBe(401);
    const blocked = await badLogin(ip, '9.9.9.9');
    expect(blocked.status).toBe(429);
    expect(blocked.headers['ratelimit-remaining']).toBe('0');
  });

  it('ne pénalise pas une autre adresse', async () => {
    const ip = freshIp();
    for (let i = 0; i < 21; i++) await badLogin(ip);
    expect((await badLogin(freshIp())).status).toBe(401);
  });
});

describe('clientKey', () => {
  const fakeReq = (headers: Record<string, string>) =>
    ({ headers, socket: { remoteAddress: '127.0.0.1' } }) as unknown as Request;
  const saved = config.clientIpHeader;
  afterEach(() => {
    config.clientIpHeader = saved;
  });

  it('sans en-tête d’hébergeur : adresse TCP, X-Forwarded-For ignoré', () => {
    config.clientIpHeader = '';
    expect(clientKey(fakeReq({ 'x-forwarded-for': '6.6.6.6' }))).toBe('127.0.0.1');
  });

  it('avec l’en-tête de l’hébergeur : sa première adresse', () => {
    config.clientIpHeader = 'x-nf-client-connection-ip';
    expect(clientKey(fakeReq({ 'x-nf-client-connection-ip': '5.5.5.5', 'x-forwarded-for': '6.6.6.6' }))).toBe('5.5.5.5');
    expect(clientKey(fakeReq({}))).toBe('127.0.0.1');
  });
});

describe('PgStore (compteurs en base)', () => {
  const make = (windowMs: number) => {
    const s = new PgStore('test');
    s.init({ windowMs } as Options);
    return s;
  };

  it('partage le compteur entre deux instances de l’API', async () => {
    const key = freshIp();
    const a = make(60_000);
    const b = make(60_000);
    await a.increment(key);
    await b.increment(key);
    expect((await a.increment(key)).totalHits).toBe(3);
  });

  it('incrémente de façon atomique sous requêtes simultanées', async () => {
    const key = freshIp();
    const s = make(60_000);
    const hits = await Promise.all(Array.from({ length: 30 }, () => s.increment(key)));
    expect(hits.map((h) => h.totalHits).sort((x, y) => x - y)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it('repart de zéro à la fin de la fenêtre, et sait décrémenter et réinitialiser', async () => {
    const key = freshIp();
    const s = make(300);
    await s.increment(key);
    await s.increment(key);
    await s.decrement(key);
    expect((await s.increment(key)).totalHits).toBe(2);
    await new Promise((r) => setTimeout(r, 400));
    expect((await s.increment(key)).totalHits).toBe(1);
    await s.resetKey(key);
    expect((await s.increment(key)).totalHits).toBe(1);
  });
});
