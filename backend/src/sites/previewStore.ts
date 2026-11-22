import crypto from 'crypto';

/**
 * Aperçus du brouillon en cours d'édition : le HTML rendu est gardé quelques minutes en mémoire
 * et servi par une URL non devinable, pour pouvoir s'afficher dans un iframe (avec ses fichiers
 * statiques) sans exposer l'application. Un seul aperçu par utilisateur.
 */
interface Entry {
  id: string;
  html: string;
  pack: boolean;
  expires: number;
}

const TTL_MS = 10 * 60 * 1000;
const byUser = new Map<number, Entry>();

export function savePreview(userId: number, html: string, pack: boolean): string {
  const now = Date.now();
  for (const [uid, e] of byUser) if (e.expires < now) byUser.delete(uid);
  const prev = byUser.get(userId);
  const id = prev?.id ?? crypto.randomBytes(18).toString('hex');
  byUser.set(userId, { id, html, pack, expires: now + TTL_MS });
  return id;
}

export function getPreview(id: string): { html: string; pack: boolean } | null {
  const now = Date.now();
  for (const e of byUser.values()) if (e.id === id && e.expires >= now) return { html: e.html, pack: e.pack };
  return null;
}
