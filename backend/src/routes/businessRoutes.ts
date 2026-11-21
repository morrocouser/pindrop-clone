import express, { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../database';
import { idParam } from '../lib/auth';
import { requireAuth } from '../middleware/auth';

const router = express.Router();
router.use(requireAuth);

const createSchema = z.object({
  name: z.string().min(1).max(255),
  industry: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().max(255).optional(),
  website_url: z.string().url().max(500).optional(),
  // seul un admin peut choisir le propriétaire et le statut
  user_id: z.number().int().positive().optional(),
  status: z.enum(['pending', 'active', 'inactive']).optional()
});

// Un admin voit tout ; les autres voient uniquement leurs entreprises
router.get('/', async (req: Request, res: Response) => {
  try {
    const where = req.user!.role === 'admin' ? {} : { user_id: req.user!.userId };
    res.json(await prisma.business.findMany({ where, orderBy: { id: 'asc' } }));
  } catch (error) {
    console.error('list businesses failed:', error);
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  const id = idParam.safeParse(req.params.id);
  if (!id.success) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  try {
    const business = await prisma.business.findUnique({ where: { id: id.data } });
    // 404 aussi pour une entreprise d'autrui : on ne révèle pas son existence
    if (!business || (req.user!.role !== 'admin' && business.user_id !== req.user!.userId)) {
      return res.status(404).json({ error: 'Business not found' });
    }
    return res.json(business);
  } catch (error) {
    console.error('get business failed:', error);
    return res.status(500).json({ error: 'Failed to fetch business' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
  }
  const { user_id, status, ...fields } = parsed.data;
  const isAdmin = req.user!.role === 'admin';

  try {
    const business = await prisma.business.create({
      data: {
        ...fields,
        user_id: isAdmin && user_id ? user_id : req.user!.userId,
        status: isAdmin && status ? status : 'pending'
      }
    });
    return res.status(201).json(business);
  } catch (error) {
    console.error('create business failed:', error);
    return res.status(500).json({ error: 'Failed to create business' });
  }
});

export default router;
