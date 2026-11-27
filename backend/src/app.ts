import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { config } from './config';
import authRoutes from './routes/authRoutes';
import businessRoutes from './routes/businessRoutes';
import templateRoutes from './routes/templateRoutes';
import prospectRoutes from './routes/prospectRoutes';
import { packRouter, payRouter, siteRouter } from './routes/publicRoutes';
import sitesRoutes, { earningsRouter } from './routes/sitesRoutes';

const app = express();
// Pas de « trust proxy » : X-Forwarded-For est falsifiable. L'adresse du client utilisée pour la
// limitation de débit vient d'un en-tête posé par l'hébergeur (voir src/lib/rateLimit.ts).
app.set('etag', false); // pas de réponses 304 : voir netlify/functions/api.cts

app.use(helmet());
app.use(cors({ origin: config.corsOrigins, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

app.use('/api/auth', authRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/sites', sitesRoutes);
app.use('/api/earnings', earningsRouter);
app.use('/api/pay', payRouter);
app.use('/api', prospectRoutes);
app.use('/s', siteRouter);
app.use('/t', packRouter);

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// JSON mal formé, corps trop gros, etc.
app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status && err.status >= 400 && err.status < 500 ? err.status : 500;
  if (status === 500) console.error('unhandled error:', err);
  res.status(status).json({ error: status === 500 ? 'Internal server error' : 'Bad request' });
});

export default app;
