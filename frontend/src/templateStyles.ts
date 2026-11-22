/** Palettes des templates, pour les vignettes (le rendu réel est fait par l'API). */
export interface TemplateLook {
  bg: string;
  ink: string;
  primary: string;
  accent: string;
  font: string;
  /** Chemin d'une image du gabarit réel (servie par l'API), utilisée comme vignette. */
  thumb?: string;
}

export const TEMPLATE_LOOKS: Record<string, TemplateLook> = {
  chantier: { bg: '#f4f4f1', ink: '#1b1f24', primary: '#1b1f24', accent: '#f2b705', font: 'Archivo' },
  lin: { bg: '#f3efe9', ink: '#3a3330', primary: '#8a6f5a', accent: '#c9a48a', font: 'Cormorant Garamond' },
  braise: { bg: '#1d1714', ink: '#f4ece4', primary: '#e4572e', accent: '#f2a65a', font: 'Fraunces' },
  maree: { bg: '#eef5f8', ink: '#10303f', primary: '#0d6e8c', accent: '#ff9f43', font: 'Bricolage Grotesque' },
  clinique: { bg: '#f5faf8', ink: '#143229', primary: '#1f8a70', accent: '#7fd1b9', font: 'Manrope' },
  cadre: { bg: '#ffffff', ink: '#111111', primary: '#111111', accent: '#ff4d2e', font: 'Space Grotesk' },
  grilli: { bg: '#0c0b09', ink: '#ffffff', primary: '#e4c590', accent: '#e4c590', font: 'Forum', thumb: '/t/grilli/assets/images/hero-slider-1.jpg' },
  barbier: { bg: '#1f2226', ink: '#f1ede8', primary: '#b4693a', accent: '#d98f5c', font: 'Oswald' },
  immo: { bg: '#f6f7f9', ink: '#14213d', primary: '#14213d', accent: '#c8a24a', font: 'Playfair Display' },
  torrefacteur: { bg: '#fbf6ef', ink: '#2b1d14', primary: '#3b2417', accent: '#d9822b', font: 'DM Serif Display' }
};
