import express, { Request, Response } from 'express';
import { prisma } from '../database';
import { idParam } from '../lib/auth';

const router = express.Router();

// Le catalogue est défini dans src/sites/styles.ts et synchronisé en base au démarrage.
// Il est public et en lecture seule.
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

export default router;
