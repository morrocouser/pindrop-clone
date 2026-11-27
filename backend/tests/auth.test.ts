import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../src/config';
import { IP_HEADER, api, freshIp, registerUser } from './helpers';

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');

describe('inscription', () => {
  it('crée un compte client avec 3000 crédits et renvoie un jeton', async () => {
    const email = `new${crypto.randomBytes(4).toString('hex')}@test.local`;
    const res = await api().post('/api/auth/register').set(IP_HEADER, freshIp()).send({ email, password: 'Password123!' });
    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ email, role: 'customer', credits: 3000 });
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  it('ignore un rôle choisi par le client', async () => {
    const email = `adm${crypto.randomBytes(4).toString('hex')}@test.local`;
    const res = await api().post('/api/auth/register').set(IP_HEADER, freshIp()).send({ email, password: 'Password123!', role: 'admin' });
    expect(res.body.user.role).toBe('customer');
  });

  it('refuse un e-mail déjà inscrit (409) et une saisie invalide (400)', async () => {
    const u = await registerUser();
    expect((await api().post('/api/auth/register').set(IP_HEADER, freshIp()).send({ email: u.email, password: 'Password123!' })).status).toBe(409);
    expect((await api().post('/api/auth/register').set(IP_HEADER, freshIp()).send({ email: 'pas-un-email', password: 'court' })).status).toBe(400);
  });
});

describe('connexion', () => {
  it('accepte le bon mot de passe, quelle que soit la casse de l’e-mail', async () => {
    const u = await registerUser();
    const res = await api().post('/api/auth/login').set(IP_HEADER, freshIp()).send({ email: u.email.toUpperCase(), password: 'Password123!' });
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(u.id);
  });

  it('refuse un mauvais mot de passe et un compte inconnu avec la même réponse', async () => {
    const u = await registerUser();
    const wrong = await api().post('/api/auth/login').set(IP_HEADER, freshIp()).send({ email: u.email, password: 'mauvais' });
    const unknown = await api().post('/api/auth/login').set(IP_HEADER, freshIp()).send({ email: 'personne@test.local', password: 'mauvais' });
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
  });

  it('calcule un bcrypt même pour un compte inconnu (pas d’énumération au chronomètre)', async () => {
    const spy = jest.spyOn(bcrypt, 'compare');
    try {
      await api().post('/api/auth/login').set(IP_HEADER, freshIp()).send({ email: 'inconnu@test.local', password: 'mauvais' });
      expect(spy).toHaveBeenCalledTimes(1);
    } finally {
      spy.mockRestore();
    }
  });
});

describe('jetons', () => {
  it('/me renvoie l’utilisateur sans son empreinte de mot de passe', async () => {
    const u = await registerUser();
    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${u.token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: u.id, email: u.email });
    expect(res.body).not.toHaveProperty('password_hash');
  });

  it('refuse l’absence de jeton et les jetons falsifiés', async () => {
    const u = await registerUser();
    const payload = { userId: u.id, email: u.email, role: 'admin' };
    const forged = [
      'abc.def.ghi',
      `${b64({ alg: 'none', typ: 'JWT' })}.${b64(payload)}.`,
      jwt.sign(payload, 'un-autre-secret-0123456789abcdef'),
      jwt.sign({ ...payload, exp: Math.floor(Date.now() / 1000) - 60 }, config.jwtSecret),
      jwt.sign({ userId: 'x', email: u.email, role: 'root' }, config.jwtSecret)
    ];
    expect((await api().get('/api/sites')).status).toBe(401);
    for (const t of forged) {
      expect((await api().get('/api/sites').set('Authorization', `Bearer ${t}`)).status).toBe(401);
    }
  });
});
