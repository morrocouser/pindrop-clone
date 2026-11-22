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
      features: ['Textes modifiables', s.pack ? 'Photos remplaçables' : 'Couleurs personnalisables', 'Aperçu de 7 jours'],
      languages: ['fr', 'en']
    };
    await prisma.template.upsert({ where: { key: s.key }, update: data, create: { key: s.key, ...data } });
  }

  // Modèle « grill » (réécriture maison) remplacé par le vrai gabarit Grilli : on migre les sites existants
  await prisma.site.updateMany({ where: { template_key: 'grill' }, data: { template_key: 'grilli' } });

  // Retire du catalogue les modèles qui n'existent plus dans le code
  await prisma.template.deleteMany({ where: { key: { notIn: SITE_STYLES.map((s) => s.key) } } });
}
