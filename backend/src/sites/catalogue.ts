import { prisma } from '../database';
import { SITE_STYLES } from './styles';

/** Synchronise le catalogue de templates en base avec la liste définie dans le code. */
export async function syncTemplates(): Promise<void> {
  for (const s of SITE_STYLES) {
    const data = {
      name: s.name,
      category: s.category,
      industry: s.industry,
      description: s.description,
      features: ['Textes modifiables', 'Couleurs personnalisables', 'Aperçu de 7 jours'],
      languages: ['fr', 'en']
    };
    await prisma.template.upsert({ where: { key: s.key }, update: data, create: { key: s.key, ...data } });
  }
}
