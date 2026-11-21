import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config';

export type Role = 'admin' | 'customer' | 'business';

export interface AuthPayload {
  userId: number;
  email: string;
  role: Role;
}

const payloadSchema = z.object({
  userId: z.number().int(),
  email: z.string(),
  role: z.enum(['admin', 'customer', 'business'])
});

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: '24h' });
}

/** Vérifie un token ; renvoie null s'il est invalide ou expiré. */
export function verifyToken(token: string): AuthPayload | null {
  try {
    return payloadSchema.parse(jwt.verify(token, config.jwtSecret));
  } catch {
    return null;
  }
}

export const idParam = z.coerce.number().int().positive();
