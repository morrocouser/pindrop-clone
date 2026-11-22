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
  fr: { services: 'Ce que nous proposons', about: 'À propos', hours: 'Horaires', contact: 'Nous trouver', call: 'Appeler', mail: 'Écrire', menu: 'La carte', visit: 'Nous rendre visite' },
  en: { services: 'What we offer', about: 'About', hours: 'Opening hours', contact: 'Find us', call: 'Call', mail: 'Email', menu: 'Menu', visit: 'Visit us' }
};

/** Enveloppe commune : <head>, polices, métadonnées. */
function page(input: RenderInput, css: string, body: string): string {
  const { name, lang, style, noindex } = input;
  const fonts = [...new Set([style.fontDisplay, style.fontBody])].map(fontParam).join('&amp;');
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
<style>${css}</style>
</head>
<body>
${body}
</body>
</html>`;
}

/**
 * Mise en page « Grill », adaptée du modèle Grilli (MIT, © 2022 Sadee) : fond noir, filets dorés,
 * grand titre centré. Seuls la palette, les polices et la structure sont repris (voir THIRD_PARTY_NOTICES.md).
 */
function renderGrill(input: RenderInput): string {
  const { name, lang, content, style } = input;
  const l = lang === 'en' ? LABELS.en : LABELS.fr;
  const gold = safeHex(content.colors.primary, style.primary);
  const phoneDigits = content.phone.replace(/[^\d+]/g, '');
  const ctaHref = phoneDigits ? `tel:${phoneDigits}` : content.email ? `mailto:${esc(content.email)}` : '#visit';
  const hero = content.photos[0] ? `<img class="bg" src="${esc(content.photos[0])}" alt="" referrerpolicy="no-referrer">` : '';
  const gallery = content.photos.slice(1).map((u) => `<img src="${esc(u)}" alt="" loading="lazy" referrerpolicy="no-referrer">`).join('');
  const dishes = content.services.map((s) => `<li>${esc(s)}</li>`).join('');
  const hours = content.hours.map((h) => `<li>${esc(h)}</li>`).join('');
  const contact = [
    content.address && `<p>${esc(content.address)}</p>`,
    content.phone && `<p><a href="tel:${esc(phoneDigits)}">${esc(content.phone)}</a></p>`,
    content.email && `<p><a href="mailto:${esc(content.email)}">${esc(content.email)}</a></p>`
  ].filter(Boolean).join('');

  const css = `
:root{--bg:${style.bg};--surface:${style.surface};--ink:${style.ink};--muted:${style.muted};--gold:${gold}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.7 '${esc(style.fontBody)}',system-ui,sans-serif}
h1,h2{font-family:'${esc(style.fontDisplay)}',Georgia,serif;font-weight:400;margin:0;line-height:1.05}
a{color:inherit}
.wrap{max-width:980px;margin:0 auto;padding:0 24px}
.label{letter-spacing:.3em;text-transform:uppercase;font-size:.78rem;color:var(--gold)}
.btn{display:inline-block;padding:14px 34px;border:1px solid var(--gold);color:var(--gold);text-decoration:none;letter-spacing:.2em;text-transform:uppercase;font-size:.8rem;font-weight:700;transition:background .25s,color .25s}
.btn:hover{background:var(--gold);color:var(--bg)}
.top{padding:22px 0;text-align:center;font-family:'${esc(style.fontDisplay)}',serif;font-size:1.6rem;letter-spacing:.08em}
.hero{position:relative;min-height:78vh;display:grid;place-items:center;text-align:center;padding:80px 24px;overflow:hidden;isolation:isolate}
.hero .bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.35;z-index:-1}
.hero h1{font-size:clamp(2.8rem,9vw,6rem);margin:14px 0 22px;text-wrap:balance}
.hero p.tag{max-width:46ch;margin:0 auto 34px;color:var(--muted);font-size:1.1rem}
.rule{width:1px;height:56px;background:var(--gold);margin:0 auto 18px;opacity:.7}
section{padding:72px 0;border-top:1px solid color-mix(in srgb,var(--ink) 12%,transparent)}
section h2{font-size:clamp(2rem,5vw,3rem);margin:10px 0 22px}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:56px;align-items:start}
.about p{color:var(--muted);max-width:52ch}
.menu{list-style:none;margin:0;padding:0}
.menu li{padding:14px 0;border-bottom:1px dotted color-mix(in srgb,var(--ink) 30%,transparent);font-family:'${esc(style.fontDisplay)}',serif;font-size:1.5rem}
.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;padding:0 0 72px}
.gallery img{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}
.visit{background:var(--surface);border:1px solid color-mix(in srgb,var(--gold) 55%,transparent);padding:44px;text-align:center}
.visit ul{list-style:none;margin:12px 0 0;padding:0;color:var(--muted)}
.visit p{margin:6px 0}
footer{padding:36px 0;text-align:center;color:var(--muted);font-size:.85rem}
@media(max-width:720px){.cols{grid-template-columns:1fr;gap:28px}.visit{padding:28px 20px}section{padding:52px 0}}`;

  const body = `<div class="top">${esc(name)}</div>
<main>
<div class="hero">${hero}<div><div class="rule"></div><span class="label">${esc(content.address.split(',').slice(-1)[0]?.trim() || '')}</span><h1>${esc(content.headline)}</h1><p class="tag">${esc(content.tagline)}</p><a class="btn" href="${ctaHref}">${esc(content.cta || l.call)}</a></div></div>
<div class="wrap">
<section class="cols">
<div class="about"><span class="label">${esc(l.about)}</span><h2>${esc(name)}</h2>${content.about ? `<p>${esc(content.about)}</p>` : ''}</div>
${dishes ? `<div><span class="label">${esc(l.menu)}</span><ul class="menu">${dishes}</ul></div>` : '<div></div>'}
</section>
</div>
${gallery ? `<div class="wrap"><div class="gallery">${gallery}</div></div>` : ''}
<div class="wrap"><section id="visit"><div class="visit"><span class="label">${esc(l.visit)}</span><h2>${esc(content.cta || l.visit)}</h2>${contact}${hours ? `<ul>${hours}</ul>` : ''}<p style="margin-top:26px"><a class="btn" href="${ctaHref}">${esc(content.cta || l.call)}</a></p></div></section></div>
</main>
<footer><div class="wrap">© ${new Date().getFullYear()} ${esc(name)}</div></footer>`;

  return page(input, css, body);
}

export function renderSite(input: RenderInput): string {
  if (input.style.layout === 'grill') return renderGrill(input);
  const { name, lang, content, style, noindex } = input;
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
  const list = (items: string[], tiles = false) =>
    items.length ? `<ul${tiles ? ' class="tiles"' : ''}>${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : '';

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
.hero.split .art{aspect-ratio:4/3;border-radius:16px;background:var(--primary);color:var(--on-primary);overflow:hidden;display:grid;place-items:center}
.hero.split .art span{font-family:'${esc(style.fontDisplay)}',serif;font-size:clamp(5rem,14vw,9rem);font-weight:800;line-height:1}
.hero.split .art img{width:100%;height:100%;object-fit:cover;display:block}
section{padding:40px 0}
section h2{font-size:1.7rem;margin-bottom:12px}
ul{padding-left:1.1rem;margin:0}li{margin:6px 0}
ul.tiles{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
ul.tiles li{margin:0;padding:16px;background:var(--surface);border:1px solid color-mix(in srgb,var(--ink) 16%,transparent);border-radius:10px;font-weight:600}
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
${style.hero === 'split' ? `<div class="art">${content.photos[0] ? `<img src="${esc(content.photos[0])}" alt="" referrerpolicy="no-referrer">` : `<span aria-hidden="true">${esc(Array.from(name.trim())[0]?.toUpperCase() ?? '')}</span>`}</div>` : ''}
</div></div>
<div class="wrap">
<div class="cols">
${section(l.about, content.about ? `<p>${esc(content.about)}</p>` : '')}
${section(l.services, list(content.services, !!style.tiles))}
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
