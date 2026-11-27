import crypto from 'crypto';
import { prisma } from '../database';

/**
 * Aperçus du brouillon en cours d'édition : le HTML rendu est gardé quelques minutes et servi
 * par une URL non devinable, pour pouvoir s'afficher dans un iframe (avec ses fichiers statiques)
 * sans exposer l'application. Un seul aperçu par utilisateur.
 * Stocké en base (et non en mémoire) car l'API tourne en fonctions sans état.
 */
const TTL_MS = 10 * 60 * 1000;

export async function savePreview(userId: number, html: string, pack: boolean): Promise<string> {
  const now = new Date();
  const expires_at = new Date(now.getTime() + TTL_MS);
  await prisma.draftPreview.deleteMany({ where: { expires_at: { lt: now } } });
  const existing = await prisma.draftPreview.findUnique({ where: { user_id: userId }, select: { token: true } });
  const token = existing?.token ?? crypto.randomBytes(18).toString('hex');
  await prisma.draftPreview.upsert({
    where: { user_id: userId },
    update: { html, pack, expires_at },
    create: { user_id: userId, token, html, pack, expires_at }
  });
  return token;
}

export async function getPreview(token: string): Promise<{ html: string; pack: boolean } | null> {
  const p = await prisma.draftPreview.findUnique({ where: { token } });
  if (!p || p.expires_at < new Date()) return null;
  return { html: p.html, pack: p.pack };
}
