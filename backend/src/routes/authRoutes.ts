import bcrypt from 'bcryptjs';
import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { config } from '../config';
import { prisma } from '../database';
import { signToken } from '../lib/auth';
import { requireAuth } from '../middleware/auth';

const router = express.Router();

// Limite les tentatives de connexion / inscription (anti brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
});

const registerSchema = z.object({
  email: z.string().email().max(255).transform((e) => e.toLowerCase()),
  password: z.string().min(8).max(72), // bcrypt ignore au-delà de 72 octets
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional()
});

const loginSchema = z.object({
  email: z.string().email().transform((e) => e.toLowerCase()),
  password: z.string().min(1).max(72)
});

function publicUser(u: { id: number; email: string; first_name: string | null; last_name: string | null; role: string; credits: number }) {
  return { id: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name, role: u.role, credits: u.credits };
}

router.post('/register', authLimiter, async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors });
  }
  const { email, password, firstName, lastName } = parsed.data;

  try {
    const user = await prisma.user.create({
      data: {
        email,
        password_hash: await bcrypt.hash(password, config.bcryptRounds),
        first_name: firstName,
        last_name: lastName
        // le rôle reste "customer" (défaut) : jamais choisi par le client
      }
    });
    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    return res.status(201).json({ token, user: publicUser(user) });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return res.status(409).json({ error: 'User already exists' });
    }
    console.error('register failed:', error);
    return res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', authLimiter, async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    const valid = user ? await bcrypt.compare(password, user.password_hash) : false;
    if (!user || !valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    await prisma.user.update({ where: { id: user.id }, data: { last_login: new Date() } });
    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    return res.json({ token, user: publicUser(user) });
  } catch (error) {
    console.error('login failed:', error);
    return res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json(publicUser(user));
  } catch (error) {
    console.error('me failed:', error);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
});

export default router;
