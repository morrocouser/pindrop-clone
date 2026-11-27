// Rendu des pages publiques : échappement et remplissage des gabarits (sans base de données)
import { contentSchema } from '../src/sites/content';
import { esc, renderSite } from '../src/sites/render';
import { STYLE_BY_KEY } from '../src/sites/styles';
import { PACK_TEMPLATE, SIMPLE_TEMPLATE, content } from './helpers';

const XSS = '<script>alert(1)</script>"\'><img src=x onerror=alert(1)>';

function render(templateKey: string, over: Record<string, unknown> = {}, name = 'Café', lang = 'fr') {
  const c = contentSchema.parse(content(over));
  return renderSite({ name, lang, content: c, style: STYLE_BY_KEY.get(templateKey)!, templateKey, noindex: true });
}

describe('esc', () => {
  it('échappe les cinq caractères spéciaux du HTML', () => {
    expect(esc(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
});

describe.each([
  ['modèle simple', SIMPLE_TEMPLATE],
  ['modèle complet', PACK_TEMPLATE]
])('%s', (_label, key) => {
  it('échappe tous les champs saisis', () => {
    const html = render(key, { headline: XSS, tagline: XSS, about: XSS, services: [XSS], hours: [XSS], cta: '"><script>alert(1)</script>', address: XSS }, XSS);
    expect(html).not.toContain('<script>alert');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('ne laisse pas une valeur fermer le bloc JSON-LD', () => {
    const html = render(key, { about: '</script><script>alert(1)</script>' });
    expect(html).not.toContain('</script><script>alert');
    expect(html).toContain('\\u003c/script>');
  });

  it('passe la page en droite-à-gauche pour l’arabe', () => {
    expect(render(key, {}, 'مقهى', 'ar')).toMatch(/<html[^>]*dir="rtl"/);
  });
});

describe('gabarit complet : remplissage en un seul passage', () => {
  it('ne réinterprète pas « {{…}} » contenu dans une URL de photo', () => {
    const html = render(PACK_TEMPLATE, { photos: ['https://a.example/{{jsonld}}'] });
    expect(html).toContain('src="https://a.example/{{jsonld}}"');
    expect(html).not.toMatch(/src="https:\/\/a\.example\/<script/);
  });

  it('ne réinterprète pas « {{…}} » contenu dans un texte', () => {
    const html = render(PACK_TEMPLATE, { headline: '{{jsonld}} {{ar_head}}' });
    expect(html).toContain('{{jsonld}} {{ar_head}}');
  });

  it('garde l’image du gabarit quand aucune photo n’est fournie, et utilise celle fournie sinon', () => {
    expect(render(PACK_TEMPLATE)).toContain('./assets/images/hero-slider-1.jpg');
    const html = render(PACK_TEMPLATE, { photos: ['https://img.example/1.jpg'] });
    expect(html).toContain('src="https://img.example/1.jpg"');
  });

  it('ne laisse aucun champ {{…}} non rempli', () => {
    expect(render(PACK_TEMPLATE)).not.toMatch(/\{\{[#/]?[\w:.\-/]+\}\}/);
  });
});
