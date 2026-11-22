import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { esc } from './render-utils';
import { SiteContent } from './content';

/**
 * Modèles « réels » : des gabarits open source complets (HTML, CSS, JS, images) placés dans
 * backend/templates/<clé>/. Leur index.html contient des champs {{...}} remplis avec le contenu du site.
 * Les fichiers statiques sont servis par /t/<clé>/ ; le HTML n'est jamais servi tel quel.
 */
export const PACKS_DIR = path.resolve(__dirname, '../../templates');

const htmlCache = new Map<string, string>();

function loadHtml(pack: string): string {
  let html = htmlCache.get(pack);
  if (html === undefined) {
    // Le nom du gabarit vient du code (styles.ts), jamais d'une saisie utilisateur
    html = fs.readFileSync(path.join(PACKS_DIR, pack, 'index.html'), 'utf8');
    htmlCache.set(pack, html);
  }
  return html;
}

const LABELS = {
  fr: { home: 'Accueil', about: 'À propos', contact: 'Contact', visit: 'Nous rendre visite', book: 'Contact', call: 'Appelez-nous', story: 'Notre histoire' },
  en: { home: 'Home', about: 'About', contact: 'Contact', visit: 'Visit us', book: 'Contact', call: 'Call us', story: 'Our story' }
};

export interface PackInput {
  pack: string;
  name: string;
  lang: string;
  content: SiteContent;
  noindex: boolean;
}

export function renderPack({ pack, name, lang, content, noindex }: PackInput): string {
  const l = lang === 'en' ? LABELS.en : LABELS.fr;
  const li = (items: string[]) => items.map((i) => `<li>${esc(i)}</li>`).join('');
  const lastPart = content.address.split(',').pop()?.trim() ?? '';

  // Valeurs de texte : échappées au remplacement. Les valeurs *_html sont construites déjà échappées.
  const text: Record<string, string> = {
    name, headline: content.headline, tagline: content.tagline, about: content.about, cta: content.cta || l.contact,
    phone: content.phone, phone_digits: content.phone.replace(/[^\d+]/g, ''), email: content.email, address: content.address,
    city: lastPart, hours_line: content.hours[0] ?? '', year: String(new Date().getFullYear()),
    l_home: l.home, l_about: l.about, l_contact: l.contact, l_visit: l.visit, l_book: l.book, l_call: l.call, l_story: l.story
  };
  const raw: Record<string, string> = { services_html: li(content.services), hours_html: li(content.hours) };
  const present = (k: string): boolean => (k in raw ? raw[k] !== '' : (text[k] ?? '') !== '') || (k === 'services' && content.services.length > 0) || (k === 'hours' && content.hours.length > 0);

  let html = loadHtml(pack);
  // {{#champ}}…{{/champ}} : bloc affiché seulement si le champ est renseigné
  html = html.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_m, key: string, inner: string) => (present(key) ? inner : ''));
  // {{photo:N:défaut}} : photo N fournie par l'utilisateur, sinon l'image d'origine du gabarit
  html = html.replace(/\{\{photo:(\d):([^}]+)\}\}/g, (_m, n: string, fallback: string) => esc(content.photos[Number(n) - 1] ?? fallback));
  html = html.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => (key in raw ? raw[key] : esc(text[key] ?? '')));
  // Les URL relatives du gabarit pointent vers ses fichiers statiques
  const robots = noindex ? '\n<meta name="robots" content="noindex, nofollow">' : '';
  return html.replace('<head>', `<head>\n<base href="${config.publicBaseUrl}/t/${pack}/">${robots}`);
}
