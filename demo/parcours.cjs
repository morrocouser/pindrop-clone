'use strict';
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { chromium } = require('playwright');

// Ce scénario ne cible que l'installation locale de démonstration.
const web = 'http://127.0.0.1:5173';
const api = 'http://127.0.0.1:3000';
async function localContext(browser) {
  const ctx = await browser.newContext({ locale: 'fr-FR' });
  await ctx.route('**/*', route => {
    const origin = new URL(route.request().url()).origin;
    return [web, api].includes(origin) ? route.continue() : route.abort();
  });
  ctx.setDefaultTimeout(20000);
  return ctx;
}

async function run() {
  const browser = await chromium.launch();
  try {
    const seller = await localContext(browser);
    const page = await seller.newPage();
    const id = randomUUID();
    const name = 'Café du Papier — Démo';
    const headline = `Une pause au café ${id.slice(0, 8)}`;
    await page.goto(`${web}/register`);
    await page.getByLabel('E-mail', { exact: true }).fill(`essai-${id}@example.invalid`);
    await page.getByLabel(/Mot de passe/).fill(`Test-${randomUUID()}`);
    await page.getByRole('button', { name: "S'inscrire" }).click();
    await page.getByRole('button', { name: 'Essayer avec un commerce fictif' }).click();
    await page.getByRole('heading', { name, exact: true }).waitFor();
    await page.getByRole('button', { name: 'Créer son site' }).click();
    assert.equal(await page.getByLabel('Nom', { exact: true }).inputValue(), name);
    assert.match(await page.getByLabel('Adresse', { exact: true }).inputValue(), /fictive/);
    await page.locator('label.tpl').filter({ hasText: 'Torréfacteur' }).click();
    await page.getByRole('button', { name: /Créer le site/ }).click();
    await page.getByRole('heading', { name, exact: true }).waitFor();
    console.log('Compte, commerce fictif et création du site : OK');
    await page.getByLabel('Titre principal', { exact: true }).fill(headline);
    await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await page.getByRole('button', { name: 'Enregistré', exact: true }).waitFor();
    await page.reload();
    assert.equal(await page.getByLabel('Titre principal', { exact: true }).inputValue(), headline);
    await page.frameLocator('iframe[title="Aperçu du site"]').getByRole('heading', { name: headline, exact: true }).waitFor();
    console.log('Titre enregistré après rechargement et visible dans l’éditeur : OK');
    const publication = page.waitForResponse(r => r.request().method() === 'POST' && /\/sites\/\d+\/publish$/.test(r.url()));
    await page.getByRole('button', { name: 'Publier un aperçu de 7 jours' }).click();
    const result = await publication;
    assert.equal(result.status(), 200);
    const site = await result.json();
    assert.equal(site.status, 'preview');
    assert.equal(Date.parse(site.preview_expires_at) - Date.parse(site.published_at), 7 * 86400000);
    const url = await page.getByRole('link', { name: 'Ouvrir', exact: true }).getAttribute('href');
    assert.equal(url, site.public_url);
    assert.equal(new URL(url).origin, api);
    assert.match(new URL(url).pathname, /^\/s\/[a-z0-9-]+$/);
    const guest = await localContext(browser);
    const visitor = await guest.newPage();
    const response = await visitor.goto(url);
    assert.equal(response.status(), 200);
    assert.match(response.headers()['x-robots-tag'], /noindex/);
    await visitor.getByRole('heading', { name: headline, exact: true }).waitFor();
    console.log('Lien de 7 jours ouvert sans compte, avec le bon titre : OK');
    await page.getByRole('button', { name: "Retirer l'aperçu" }).click();
    await page.getByRole('button', { name: 'Publier un aperçu de 7 jours' }).waitFor();
    assert.equal((await visitor.reload()).status(), 404);
    console.log('Lien retiré, page inaccessible au visiteur : OK');
  } finally {
    await browser.close();
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
