// Prépare la base des tests d'intégration.
// - TEST_DATABASE_URL défini (CI, Postgres déjà lancé) : cette base est utilisée telle quelle.
// - Sinon : un Postgres jetable (embedded-postgres) est démarré, en UTF-8, puis supprimé à la fin.
// Les migrations Prisma sont appliquées dans les deux cas. Jamais la base de développement (.env).
import { execFileSync } from 'child_process';
import fs from 'fs';
import net from 'net';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

export default async function globalSetup() {
  let url = process.env.TEST_DATABASE_URL;
  if (!url) {
    const { default: EmbeddedPostgres } = await import('embedded-postgres');
    const port = await freePort();
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pindrop-jest-'));
    const pg = new EmbeddedPostgres({
      databaseDir: dir,
      user: 'pindrop_test',
      password: 'pindrop_test',
      port,
      persistent: false,
      // UTF-8 obligatoire : les pages contiennent des caractères (arabe, U+2066…) absents de WIN1252
      initdbFlags: ['--encoding=UTF8', '--locale=C'],
      onLog: () => {}
    });
    await pg.initialise();
    await pg.start();
    await pg.createDatabase('pindrop_test');
    globalThis.__PINDROP_PG__ = pg;
    url = `postgresql://pindrop_test:pindrop_test@127.0.0.1:${port}/pindrop_test`;
  }

  // Les processus de test héritent de ces variables (et dotenv ne les écrase pas)
  Object.assign(process.env, {
    DATABASE_URL: url,
    NODE_ENV: 'test',
    JWT_SECRET: 'jest-secret-0123456789abcdef0123456789',
    BCRYPT_ROUNDS: '4',
    CORS_ORIGIN: 'http://localhost:5173',
    PUBLIC_BASE_URL: 'http://127.0.0.1:3000',
    PAYMENTS_MODE: 'test',
    OMNIROUTE_API_KEY: '',
    // Les tests choisissent l'adresse du client par cet en-tête (comme le CDN en production)
    CLIENT_IP_HEADER: 'x-test-client-ip'
  });

  execFileSync(process.execPath, [path.join(backendDir, 'node_modules', 'prisma', 'build', 'index.js'), 'migrate', 'deploy'], {
    cwd: backendDir,
    env: process.env,
    stdio: 'pipe'
  });
}
