/** Définition des templates : le catalogue en base est synchronisé depuis cette liste au démarrage. */
export interface SiteStyle {
  key: string;
  name: string;
  category: string;
  industry: string;
  description: string;
  hero: 'split' | 'band' | 'center';
  fontDisplay: string; // nom Google Fonts
  fontBody: string;
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  primary: string;
  accent: string;
}

export const SITE_STYLES: SiteStyle[] = [
  {
    key: 'chantier',
    name: 'Chantier',
    category: 'Artisans',
    industry: 'Bâtiment, garage, plomberie',
    description: "Typographie lourde et jaune de signalisation : pour les métiers qui travaillent de leurs mains.",
    hero: 'band',
    fontDisplay: 'Archivo',
    fontBody: 'Public Sans',
    bg: '#f4f4f1',
    surface: '#ffffff',
    ink: '#1b1f24',
    muted: '#5b636d',
    primary: '#1b1f24',
    accent: '#f2b705'
  },
  {
    key: 'lin',
    name: 'Lin',
    category: 'Beauté et bien-être',
    industry: 'Coiffure, soins, spa',
    description: 'Tons doux et serif élégant, pensé pour les salons et les instituts.',
    hero: 'split',
    fontDisplay: 'Cormorant Garamond',
    fontBody: 'Nunito Sans',
    bg: '#f3efe9',
    surface: '#fbf9f6',
    ink: '#3a3330',
    muted: '#7a6f68',
    primary: '#8a6f5a',
    accent: '#c9a48a'
  },
  {
    key: 'braise',
    name: 'Braise',
    category: 'Restauration',
    industry: 'Restaurant, bar, traiteur',
    description: 'Fond sombre et accent chaud : met la salle et les plats en scène.',
    hero: 'center',
    fontDisplay: 'Fraunces',
    fontBody: 'DM Sans',
    bg: '#1d1714',
    surface: '#2a211c',
    ink: '#f4ece4',
    muted: '#b9a99b',
    primary: '#e4572e',
    accent: '#f2a65a'
  },
  {
    key: 'maree',
    name: 'Marée',
    category: 'Commerce de proximité',
    industry: 'Boulangerie, café, boutique',
    description: 'Bleus frais et lumineux, lisible et chaleureux pour les commerces du quartier.',
    hero: 'split',
    fontDisplay: 'Bricolage Grotesque',
    fontBody: 'Figtree',
    bg: '#eef5f8',
    surface: '#ffffff',
    ink: '#10303f',
    muted: '#51707f',
    primary: '#0d6e8c',
    accent: '#ff9f43'
  },
  {
    key: 'clinique',
    name: 'Clinique',
    category: 'Santé',
    industry: 'Cabinet, pharmacie, dentiste',
    description: 'Blanc, vert menthe et grande lisibilité : rassurant, sans fioriture.',
    hero: 'split',
    fontDisplay: 'Manrope',
    fontBody: 'Manrope',
    bg: '#f5faf8',
    surface: '#ffffff',
    ink: '#143229',
    muted: '#55706a',
    primary: '#1f8a70',
    accent: '#7fd1b9'
  },
  {
    key: 'cadre',
    name: 'Cadre',
    category: 'Créatifs',
    industry: 'Photographe, studio, galerie',
    description: 'Mise en page épurée en noir et blanc, laisse toute la place aux images.',
    hero: 'band',
    fontDisplay: 'Space Grotesk',
    fontBody: 'Inter',
    bg: '#ffffff',
    surface: '#f2f2f2',
    ink: '#111111',
    muted: '#666666',
    primary: '#111111',
    accent: '#ff4d2e'
  }
];

export const STYLE_BY_KEY = new Map(SITE_STYLES.map((s) => [s.key, s]));
