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
  /** Dossier d'un gabarit open source complet dans backend/templates/ (sinon rendu par render.ts). */
  pack?: string;
  /** Affiche les services en tuiles plutôt qu'en liste. */
  tiles?: boolean;
  /** Mention de licence si le modèle est adapté d'un projet open source. */
  credit?: string;
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
  },
  {
    // Gabarit réel : Grilli, © 2022 Sadee, licence MIT (voir THIRD_PARTY_NOTICES.md)
    key: 'grilli',
    name: 'Grilli',
    category: 'Restauration',
    industry: 'Restaurant, bar, traiteur',
    description: "Le modèle open source Grilli : fond noir, filets dorés, grande photo d'accueil. Remplacez les photos pour l'adapter au restaurant.",
    hero: 'center',
    pack: 'grilli',
    credit: 'Grilli par Sadee (licence MIT)',
    fontDisplay: 'Forum',
    fontBody: 'DM Sans',
    bg: '#0c0b09',
    surface: '#161514',
    ink: '#ffffff',
    muted: '#a6a6a6',
    primary: '#e4c590',
    accent: '#e4c590'
  },
  {
    key: 'barbier',
    name: 'Barbier',
    category: 'Beauté et bien-être',
    industry: 'Barbier, tatoueur, salon masculin',
    description: 'Anthracite et cuivre, titres condensés : un salon qui assume son caractère.',
    hero: 'band',
    tiles: true,
    fontDisplay: 'Oswald',
    fontBody: 'Work Sans',
    bg: '#1f2226',
    surface: '#2a2e33',
    ink: '#f1ede8',
    muted: '#aeb3b8',
    primary: '#b4693a',
    accent: '#d98f5c'
  },
  {
    key: 'immo',
    name: 'Immo',
    category: 'Services',
    industry: 'Agence immobilière, notaire, conseil',
    description: 'Bleu nuit et serif classique : de la sobriété pour inspirer confiance.',
    hero: 'split',
    tiles: true,
    fontDisplay: 'Playfair Display',
    fontBody: 'Source Sans 3',
    bg: '#f6f7f9',
    surface: '#ffffff',
    ink: '#14213d',
    muted: '#566078',
    primary: '#14213d',
    accent: '#c8a24a'
  },
  {
    key: 'torrefacteur',
    name: 'Torréfacteur',
    category: 'Commerce de proximité',
    industry: 'Café, torréfacteur, salon de thé',
    description: 'Brun expresso et titres généreux : chaleureux et gourmand.',
    hero: 'center',
    fontDisplay: 'DM Serif Display',
    fontBody: 'Karla',
    bg: '#fbf6ef',
    surface: '#ffffff',
    ink: '#2b1d14',
    muted: '#765f4e',
    primary: '#3b2417',
    accent: '#d9822b'
  }
];

export const STYLE_BY_KEY = new Map(SITE_STYLES.map((s) => [s.key, s]));
