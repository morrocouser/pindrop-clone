// Comportement HTTP général : santé, catalogue, fichiers statiques, CORS, en-têtes, erreurs
import { syncTemplates } from '../src/sites/catalogue';
import { IP_HEADER, api, auth, freshIp, registerUser } from './helpers';

it('répond sur /api/health', async () => {
  const res = await api().get('/api/health');
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('ok');
});

it('liste le catalogue de modèles', async () => {
  await syncTemplates();
  const res = await api().get('/api/templates');
  expect(res.status).toBe(200);
  expect(res.body.length).toBeGreaterThan(0);
  expect((await api().get(`/api/templates/${res.body[0].id}`)).body.key).toBe(res.body[0].key);
  expect((await api().get('/api/templates/abc')).status).toBe(400);
});

describe('fichiers des gabarits (/t)', () => {
  it('sert les fichiers statiques', async () => {
    const res = await api().get('/t/grilli/assets/css/style.css');
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  it.each(['/t/grilli/index.html', '/t/grilli/../../.env', '/t/grilli/..%2f..%2f.env', '/t/grilli/..%2f..%2fsrc%2fconfig.ts', '/t/inconnu/style.css'])(
    'refuse %s',
    async (path) => {
      const res = await api().get(path);
      expect(res.status).toBe(404);
      expect(res.text).not.toContain('JWT_SECRET');
    }
  );
});

describe('CORS et en-têtes', () => {
  it('autorise l’origine de l’application, pas les autres', async () => {
    expect((await api().get('/api/health').set('Origin', 'http://localhost:5173')).headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect((await api().get('/api/health').set('Origin', 'https://evil.example')).headers['access-control-allow-origin']).toBeUndefined();
  });

  it('pose les en-têtes de sécurité', async () => {
    const res = await api().get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('erreurs', () => {
  it('JSON mal formé : 400 sans détail interne', async () => {
    const res = await api().post('/api/auth/login').set(IP_HEADER, freshIp()).set('Content-Type', 'application/json').send('{"email":');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Bad request' });
  });

  it('corps trop gros : 413', async () => {
    const res = await api().post('/api/auth/login').set(IP_HEADER, freshIp()).send({ email: 'a@b.c', password: 'x'.repeat(200_000) });
    expect(res.status).toBe(413);
  });

  it('route inconnue : 404', async () => {
    expect((await api().get('/api/nimporte')).status).toBe(404);
  });

  it('prospection : authentification et coordonnées vérifiées', async () => {
    expect((await api().get('/api/prospects?lat=33.5&lon=-7.6')).status).toBe(401);
    const u = await registerUser();
    expect((await api().get('/api/prospects?lat=999&lon=0').set(auth(u)).set(IP_HEADER, freshIp())).status).toBe(400);
  });
});
