import crypto from 'crypto';
import request from 'supertest';
import app from '../src/app';
import { SITE_STYLES } from '../src/sites/styles';

export const api = () => request(app);

/** Adresse client unique : chaque test a ses propres compteurs de limitation. */
export const freshIp = (): string => `10.${crypto.randomInt(256)}.${crypto.randomInt(256)}.${crypto.randomInt(1, 255)}`;
export const IP_HEADER = 'x-test-client-ip';

export const SIMPLE_TEMPLATE = SITE_STYLES.find((s) => !s.pack)!.key;
export const PACK_TEMPLATE = SITE_STYLES.find((s) => s.pack)!.key;

export interface TestUser {
  id: number;
  email: string;
  token: string;
}

export async function registerUser(): Promise<TestUser> {
  const email = `u${crypto.randomBytes(6).toString('hex')}@test.local`;
  const res = await api().post('/api/auth/register').set(IP_HEADER, freshIp()).send({ email, password: 'Password123!' });
  if (res.status !== 201) throw new Error(`inscription impossible : ${res.status} ${res.text}`);
  return { id: res.body.user.id, email, token: res.body.token };
}

export const auth = (u: TestUser) => ({ Authorization: `Bearer ${u.token}` });

export async function createSite(u: TestUser, template_key = SIMPLE_TEMPLATE, name = 'Café Test') {
  const res = await api().post('/api/sites').set(auth(u)).send({ name, template_key, lang: 'fr', phone: '0600000000' });
  if (res.status !== 201) throw new Error(`création impossible : ${res.status} ${res.text}`);
  return res.body as { id: number; slug: string; content: Record<string, unknown> };
}

export const content = (over: Record<string, unknown> = {}) => ({
  headline: 'Bienvenue',
  tagline: 'Le meilleur du quartier',
  about: 'Une histoire',
  services: ['Café', 'Pâtisserie'],
  hours: ['Lun-Ven 9h-18h'],
  phone: '+212 6 61 98 43 21',
  email: 'contact@exemple.ma',
  address: '1 rue X, Casablanca',
  cta: 'Appeler',
  whatsapp: '212661984321',
  photos: [] as string[],
  colors: { primary: '#123456', accent: '#abcdef' },
  ...over
});
