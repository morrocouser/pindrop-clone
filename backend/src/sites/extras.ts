import { esc } from './render-utils';
import { SiteContent } from './content';

export type Lang = 'fr' | 'en' | 'ar';

export const normalizeLang = (l: string): Lang => (l === 'en' || l === 'ar' ? l : 'fr');
/** Isole un numéro en sens gauche-droite : sinon, dans une page arabe, ses groupes de chiffres s'affichent à l'envers. */
export const ltr = (s: string): string => (s ? '⁦' + s + '⁩' : s);
export const dirOf = (l: Lang): 'rtl' | 'ltr' => (l === 'ar' ? 'rtl' : 'ltr');

/** Police dessinée pour l'arabe : les polices latines des modèles n'ont pas ces caractères. */
export const ARABIC_FONT = 'Cairo';

const WA_GREETING: Record<Lang, string> = {
  fr: "Bonjour, je vous contacte depuis votre site.",
  en: 'Hello, I am contacting you from your website.',
  ar: 'السلام عليكم، أتواصل معكم من موقعكم.'
};

export const WA_LABEL: Record<Lang, string> = { fr: 'WhatsApp', en: 'WhatsApp', ar: 'واتساب' };

/** Lien WhatsApp avec un message prérédigé ; chaîne vide si aucun numéro valide. */
export function whatsappHref(digits: string, lang: Lang): string {
  if (!/^\d{8,15}$/.test(digits)) return '';
  return `https://wa.me/${digits}?text=${encodeURIComponent(WA_GREETING[lang])}`;
}

/** Type schema.org selon le modèle choisi (aide le référencement local). */
export function schemaTypeFor(templateKey: string): string {
  switch (templateKey) {
    case 'braise':
    case 'grilli':
      return 'Restaurant';
    case 'torrefacteur':
      return 'CafeOrCoffeeShop';
    case 'lin':
    case 'barbier':
      return 'BeautySalon';
    case 'chantier':
      return 'HomeAndConstructionBusiness';
    case 'clinique':
      return 'MedicalBusiness';
    case 'immo':
      return 'RealEstateAgent';
    default:
      return 'LocalBusiness';
  }
}

/** Données structurées JSON-LD (schema.org). Aucun script exécutable : simple bloc de données. */
export function jsonLd(schemaType: string, name: string, content: SiteContent): string {
  const data: Record<string, unknown> = { '@context': 'https://schema.org', '@type': schemaType, name };
  if (content.about) data.description = content.about;
  if (content.phone) data.telephone = content.phone;
  if (content.email) data.email = content.email;
  if (content.address) data.address = { '@type': 'PostalAddress', streetAddress: content.address };
  if (content.photos[0]) data.image = content.photos[0];
  // « < » échappé : impossible de refermer la balise <script> depuis une valeur saisie
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}

/** Bouton WhatsApp flottant + barre d'actions en bas d'écran sur mobile (zone du pouce). */
export function actionBar(opts: { phoneDigits: string; wa: string; lang: Lang; callLabel: string }): { css: string; html: string } {
  const { phoneDigits, wa, lang, callLabel } = opts;
  if (!phoneDigits && !wa) return { css: '', html: '' };
  const css = `
.wa-fab,.act-bar{font-family:system-ui,sans-serif}
.wa-fab{position:fixed;inset-inline-end:16px;bottom:16px;z-index:50;display:none;align-items:center;gap:8px;padding:12px 18px;border-radius:999px;background:#128c4a;color:#fff;font-weight:700;text-decoration:none;box-shadow:0 8px 24px rgb(0 0 0/.25)}
.act-bar{position:fixed;inset-inline:0;bottom:0;z-index:50;display:none;gap:8px;padding:8px 12px calc(8px + env(safe-area-inset-bottom));background:#fff;border-top:1px solid #0001}
.act-bar a{flex:1;display:flex;align-items:center;justify-content:center;min-height:48px;border-radius:12px;font-weight:700;text-decoration:none;color:#fff;background:#222}
.act-bar a.wa{background:#128c4a}
@media(min-width:701px){.wa-fab{display:inline-flex}}
@media(max-width:700px){.act-bar{display:flex}body{padding-bottom:72px}}`;
  const call = phoneDigits ? `<a href="tel:${esc(phoneDigits)}">${esc(callLabel)}</a>` : '';
  const waLink = wa ? `<a class="wa" href="${esc(wa)}" target="_blank" rel="noopener noreferrer">${esc(WA_LABEL[lang])}</a>` : '';
  const fab = wa ? `<a class="wa-fab" href="${esc(wa)}" target="_blank" rel="noopener noreferrer">${esc(WA_LABEL[lang])}</a>` : '';
  return { css, html: `${fab}<nav class="act-bar" aria-label="Contact">${call}${waLink}</nav>` };
}
