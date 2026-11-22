import { z } from 'zod';

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Couleur invalide (format #rrggbb)');
const text = (max: number) => z.string().trim().max(max);

export const contentSchema = z.object({
  headline: text(120),
  tagline: text(200),
  about: text(1500),
  services: z.array(text(80)).max(8),
  hours: z.array(text(80)).max(8),
  phone: text(50),
  email: z.union([z.literal(''), z.string().trim().email().max(255)]),
  address: text(300),
  cta: text(40),
  // Seules les URL https sont acceptées : ces valeurs finissent dans une page publique
  photos: z.array(z.string().url().max(500).refine((u) => u.startsWith('https://'), 'URL https requise')).max(6),
  colors: z.object({ primary: hex, accent: hex })
});

export type SiteContent = z.infer<typeof contentSchema>;
