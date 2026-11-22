import { SiteContent } from './content';
import { SiteStyle } from './styles';

export interface RenderInput {
  name: string;
  lang: string;
  content: SiteContent;
  style: SiteStyle;
  noindex: boolean;
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) => ESCAPES[c]);

const safeHex = (v: string, fallback: string): string => (/^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback);

/** Choisit noir ou blanc selon la luminance du fond, pour garder un texte lisible sur les boutons. */
function readableOn(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return lum > 0.4 ? '#111111' : '#ffffff';
}

const fontParam = (f: string): string => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;600;800`;

const LABELS = {
  fr: { services: 'Ce que nous proposons', about: 'À propos', hours: 'Horaires', contact: 'Nous trouver', call: 'Appeler', mail: 'Écrire' },
  en: { services: 'What we offer', about: 'About', hours: 'Opening hours', contact: 'Find us', call: 'Call', mail: 'Email' }
};

export function renderSite({ name, lang, content, style, noindex }: RenderInput): string {
  const l = lang === 'en' ? LABELS.en : LABELS.fr;
  const primary = safeHex(content.colors.primary, style.primary);
  const accent = safeHex(content.colors.accent, style.accent);
  const phoneDigits = content.phone.replace(/[^\d+]/g, '');
  const ctaHref = phoneDigits ? `tel:${phoneDigits}` : content.email ? `mailto:${esc(content.email)}` : '#contact';

  const fonts = [...new Set([style.fontDisplay, style.fontBody])].map(fontParam).join('&amp;');
  const photos = content.photos
    .map((u) => `<img src="${esc(u)}" alt="" loading="lazy" referrerpolicy="no-referrer">`)
    .join('');

  const section = (title: string, body: string) => (body ? `<section><h2>${esc(title)}</h2>${body}</section>` : '');
  const list = (items: string[]) => (items.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '');

  const contactLines = [
    content.address && `<p>${esc(content.address)}</p>`,
    content.phone && `<p><a href="tel:${esc(phoneDigits)}">${esc(content.phone)}</a></p>`,
    content.email && `<p><a href="mailto:${esc(content.email)}">${esc(content.email)}</a></p>`
  ]
    .filter(Boolean)
    .join('');

  return `<!doctype html>
<html lang="${lang === 'en' ? 'en' : 'fr'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${noindex ? '<meta name="robots" content="noindex, nofollow">' : ''}
<title>${esc(name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${fonts}&amp;display=swap">
<style>
:root{--bg:${style.bg};--surface:${style.surface};--ink:${style.ink};--muted:${style.muted};--primary:${primary};--on-primary:${readableOn(primary)};--accent:${accent};--on-accent:${readableOn(accent)}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.6 '${esc(style.fontBody)}',system-ui,sans-serif}
h1,h2{font-family:'${esc(style.fontDisplay)}',Georgia,serif;line-height:1.1;margin:0}
a{color:inherit}
.wrap{max-width:960px;margin:0 auto;padding:0 20px}
header.top{padding:18px 0;border-bottom:1px solid color-mix(in srgb,var(--ink) 14%,transparent)}
header.top .wrap{display:flex;justify-content:space-between;align-items:center;gap:16px}
.brand{font-family:'${esc(style.fontDisplay)}',serif;font-weight:800;font-size:1.2rem;text-decoration:none}
.btn{display:inline-block;background:var(--accent);color:var(--on-accent);padding:12px 22px;border-radius:999px;font-weight:700;text-decoration:none}
.hero{padding:72px 0 56px}
.hero h1{font-size:clamp(2.2rem,6vw,4rem);font-weight:800;max-width:16ch;text-wrap:balance}
.hero p.tag{font-size:1.2rem;color:var(--muted);max-width:44ch;margin:16px 0 28px}
.hero.band{background:var(--primary);color:var(--on-primary)}
.hero.band p.tag{color:inherit;opacity:.85}
.hero.center{text-align:center}
.hero.center h1,.hero.center p.tag{margin-left:auto;margin-right:auto}
.hero.split .wrap{display:grid;grid-template-columns:1.2fr 1fr;gap:32px;align-items:center}
.hero.split .art{aspect-ratio:4/3;border-radius:16px;background:linear-gradient(135deg,var(--primary),var(--accent));overflow:hidden}
.hero.split .art img{width:100%;height:100%;object-fit:cover;display:block}
section{padding:40px 0}
section h2{font-size:1.7rem;margin-bottom:12px}
ul{padding-left:1.1rem;margin:0}li{margin:6px 0}
.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:32px}
.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;padding:8px 0 40px}
.gallery img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:12px}
footer{padding:28px 0;color:var(--muted);font-size:.9rem;border-top:1px solid color-mix(in srgb,var(--ink) 14%,transparent)}
@media(max-width:700px){.hero{padding:48px 0 36px}.hero.split .wrap{grid-template-columns:1fr}}
</style>
</head>
<body>
<header class="top"><div class="wrap"><a class="brand" href="#">${esc(name)}</a><a class="btn" href="${ctaHref}">${esc(content.cta || l.call)}</a></div></header>
<main>
<div class="hero ${style.hero}"><div class="wrap">
<div><h1>${esc(content.headline)}</h1><p class="tag">${esc(content.tagline)}</p><a class="btn" href="${ctaHref}">${esc(content.cta || l.call)}</a></div>
${style.hero === 'split' ? `<div class="art">${content.photos[0] ? `<img src="${esc(content.photos[0])}" alt="" referrerpolicy="no-referrer">` : ''}</div>` : ''}
</div></div>
<div class="wrap">
<div class="cols">
${section(l.about, content.about ? `<p>${esc(content.about)}</p>` : '')}
${section(l.services, list(content.services))}
</div>
${photos ? `<div class="gallery">${photos}</div>` : ''}
<div class="cols" id="contact">
${section(l.hours, list(content.hours))}
${section(l.contact, contactLines)}
</div>
</div>
</main>
<footer><div class="wrap">© ${new Date().getFullYear()} ${esc(name)}</div></footer>
</body>
</html>`;
}
