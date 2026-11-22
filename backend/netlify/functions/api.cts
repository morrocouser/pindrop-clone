import serverless from 'serverless-http';
import { withLambda } from '@netlify/aws-lambda-compat';
import app from '../../src/app';
import { syncTemplates } from '../../src/sites/catalogue';

// Une seule synchronisation du catalogue de modèles par instance de la fonction
let warm: Promise<void> | null = null;
const warmup = (): Promise<void> => (warm ??= syncTemplates().catch((e) => console.error('template sync failed:', e)));

const handle = serverless(app);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default withLambda(async (event: any, context: any) => {
  await warmup();
  const res = (await handle(event, context)) as { statusCode: number; body?: string };
  // L'adaptateur Netlify ne sait pas fabriquer une réponse 204/205/304 (corps interdit) : on renvoie 200 sans corps.
  // Cas visés : préflight CORS (204) et requêtes conditionnelles (304).
  if (res && [204, 205, 304].includes(res.statusCode)) return { ...res, statusCode: 200, body: '' };
  return res;
});

// L'API et les pages de sites passent par cette fonction ; /t/* est servi par le CDN (voir scripts/prepare-netlify.cjs)
export const config = { path: ['/api/*', '/s/*'] };
