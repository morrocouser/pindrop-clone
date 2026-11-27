import express, { Request, Response } from 'express';
import { z } from 'zod';
import { limiter as rateLimiter } from '../lib/rateLimit';
import { requireAuth } from '../middleware/auth';
import { findProspects, geocode } from '../services/prospects';

const router = express.Router();
// Les services OpenStreetMap sont publics et partagés : on limite les appels par IP.
// L'authentification est posée route par route : ce routeur est monté sur /api tout entier.
const limiter = rateLimiter('osm', 60 * 1000, 30);

const searchSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().int().min(200).max(3000).default(1200)
});

router.get('/prospects', requireAuth, limiter, async (req: Request, res: Response) => {
  const q = searchSchema.safeParse(req.query);
  if (!q.success) return res.status(400).json({ error: 'Invalid input', details: q.error.flatten().fieldErrors });
  try {
    return res.json(await findProspects(q.data.lat, q.data.lon, q.data.radius));
  } catch (error) {
    console.error('prospects failed:', error);
    return res.status(502).json({ error: 'Le service de cartographie ne répond pas. Réessayez dans un instant.' });
  }
});

router.get('/geocode', requireAuth, limiter, async (req: Request, res: Response) => {
  const q = z.string().trim().min(2).max(200).safeParse(req.query.q);
  if (!q.success) return res.status(400).json({ error: 'Invalid input' });
  try {
    return res.json(await geocode(q.data));
  } catch (error) {
    console.error('geocode failed:', error);
    return res.status(502).json({ error: 'La recherche de lieu ne répond pas. Réessayez dans un instant.' });
  }
});

export default router;
