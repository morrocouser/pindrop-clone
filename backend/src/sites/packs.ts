import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { esc } from './render-utils';
import { SiteContent } from './content';
import { ARABIC_FONT, WA_LABEL, dirOf, jsonLd, ltr, normalizeLang, whatsappHref } from './extras';

/**
 * Modèles « réels » : des gabarits open source complets (HTML, CSS, JS, images) placés dans
 * backend/templates/<clé>/. Leur index.html contient des champs {{...}} remplis avec le contenu du site.
 * Les fichiers statiques sont servis par /t/<clé>/ ; le HTML n'est jamais servi tel quel.
 */
/** Dossier des gabarits : selon l'hébergement (local, fonction Netlify), il n'est pas au même endroit. */
function findPacksDir(): string {
  const task = process.env.LAMBDA_TASK_ROOT;
  const candidates = [
    process.env.PACKS_DIR,
    path.resolve(__dirname, '../../templates'),
    path.resolve(process.cwd(), 'templates'),
    task && path.join(task, 'templates'),
    task && path.join(task, 'backend', 'templates')
  ].filter((d): d is string => !!d);
  return candidates.find((d) => fs.existsSync(d)) ?? candidates[1];
}
export const PACKS_DIR = findPacksDir();

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
  ar: { home: 'الرئيسية', about: 'من نحن', contact: 'اتصل بنا', visit: 'زورونا', book: 'تواصل', call: 'اتصلوا بنا', story: 'قصتنا' },
  en: { home: 'Home', about: 'About', contact: 'Contact', visit: 'Visit us', book: 'Contact', call: 'Call us', story: 'Our story' }
};

export interface PackInput {
  pack: string;
  name: string;
  lang: string;
  content: SiteContent;
  noindex: boolean;
  schemaType: string;
}

export function renderPack({ pack, name, lang, content, noindex, schemaType }: PackInput): string {
  const lg = normalizeLang(lang);
  const l = LABELS[lg];
  const wa = whatsappHref(content.whatsapp, lg);
  // Arabe : les polices du modèle n'ont pas ces caractères, on redéfinit ses variables de police
  const arHead =
    lg === 'ar'
      ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${ARABIC_FONT}:wght@400;700&amp;display=swap"><style>:root{--fontFamily-forum:'${ARABIC_FONT}',sans-serif;--fontFamily-dm_sans:'${ARABIC_FONT}',sans-serif}body{letter-spacing:0}</style>`
      : '';
  const li = (items: string[]) => items.map((i) => `<li>${esc(i)}</li>`).join('');
  const lastPart = content.address.split(',').pop()?.trim() ?? '';

  // Valeurs de texte : échappées au remplacement. Les valeurs *_html sont construites déjà échappées.
  const text: Record<string, string> = {
    name, headline: content.headline, tagline: content.tagline, about: content.about, cta: content.cta || l.contact,
    phone: ltr(content.phone), phone_digits: content.phone.replace(/[^\d+]/g, ''), email: content.email, address: content.address,
    city: lastPart, hours_line: content.hours[0] ?? '', year: String(new Date().getFullYear()),
    l_home: l.home, l_about: l.about, l_contact: l.contact, l_visit: l.visit, l_book: l.book, l_call: l.call, l_story: l.story
  };
  const raw: Record<string, string> = {
    services_html: li(content.services),
    hours_html: li(content.hours),
    html_lang: lg,
    html_dir: dirOf(lg),
    ar_head: arHead,
    jsonld: jsonLd(schemaType, name, content),
    wa_href: esc(wa),
    wa_label: esc(WA_LABEL[lg])
  };
  const present = (k: string): boolean => (k === 'whatsapp' ? wa !== '' : k in raw ? raw[k] !== '' : (text[k] ?? '') !== '') || (k === 'services' && content.services.length > 0) || (k === 'hours' && content.hours.length > 0);

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
