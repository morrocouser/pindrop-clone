// Prépare le dossier publié par Netlify : fichiers statiques des gabarits (/t/<clé>/...) servis par le CDN.
// Le HTML source des gabarits (index.html, avec ses champs) reste côté fonction et n'est jamais publié.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const out = path.join(root, 'publish');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 't'), { recursive: true });

for (const key of fs.readdirSync(path.join(root, 'templates'))) {
  fs.cpSync(path.join(root, 'templates', key), path.join(out, 't', key), {
    recursive: true,
    filter: (src) => path.basename(src) !== 'index.html'
  });
}

// Les pages de sites (origine différente) chargent polices et modules depuis /t : CORS ouvert, ressources publiques
fs.writeFileSync(
  path.join(out, '_headers'),
  ['/t/*', '  Access-Control-Allow-Origin: *', '  Cross-Origin-Resource-Policy: cross-origin', '  Cache-Control: public, max-age=3600', ''].join('\n')
);
fs.writeFileSync(path.join(out, 'index.html'), '<!doctype html><meta charset="utf-8"><title>Pindrop API</title><p>Pindrop API</p>\n');
console.log('publish/ prêt :', fs.readdirSync(path.join(out, 't')).join(', '));
