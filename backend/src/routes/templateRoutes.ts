import express, { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../database';
import { idParam } from '../lib/auth';
import { requireAuth, requireRole } from '../middleware/auth';

const router = express.Router();

const createSchema = z.object({
  name: z.string().min(1).max(255),
  category: z.string().min(1).max(100),
  industry: z.string().min(1).max(100),
  description: z.string().optional(),
  thumbnail_url: z.string().url().max(500).optional(),
  price: z.number().min(0).max(99999999).default(0),
  features: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional()
});

// Le catalogue de templates est public (lecture seule)
router.get('/', async (_req: Request, res: Response) => {
  try {
    res.json(await prisma.template.findMany({ orderBy: { id: 'asc' } }));
  } catch (error) {
    console.error('list templates failed:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  const id = idParam.safeParse(req.params.id);
  if (!id.success) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  try {
    const template = await prisma.template.findUnique({ where: { id: id.data } });
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    return res.json(template);
  } catch (error) {
    console.error('get template failed:', error);
    return res.status(500).json({ error: 'Failed to fetch template' });
  }
});

router.post('/', requireAuth, requireRole('admin'), async (req: Request, res: Response) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
  }
  try {
    const template = await prisma.template.create({
      data: { ...parsed.data, created_by: req.user!.userId }
    });
    return res.status(201).json(template);
  } catch (error) {
    console.error('create template failed:', error);
    return res.status(500).json({ error: 'Failed to create template' });
  }
});

export default router;
