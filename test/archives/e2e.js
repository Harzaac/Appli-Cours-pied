// Parcours complet dans Chromium : import, vérification, semaine, mois, détail, VMA, passage, bilan, données, thème sombre, mobile.
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const root = path.join(__dirname, '..');
const out = path.join(root, 'shots');
fs.mkdirSync(out, { recursive: true });
const file = 'file://' + path.join(root, 'dist', 'appli-marathon.html');
const xlsx = path.join(root, 'test', 'plan-test.xlsx');

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  async function open(width, height, today) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
    await page.addInitScript((t) => { window.__TODAY__ = t; }, today);
    await page.goto(file);
    return { ctx, page };
  }
  const snap = (page, name, full) => page.screenshot({ path: path.join(out, name + '.png'), fullPage: !!full });

  // ---- bureau ----
  let { ctx, page } = await open(1280, 900, '2026-10-10');
  await snap(page, '01-import', true);
  await page.setInputFiles('#file-xlsx', xlsx);
  await page.waitForSelector('text=Vérification du plan');
  await snap(page, '02-verification', true);
  await page.click('[data-act=useplan]');
  await page.waitForSelector('.week');
  await snap(page, '03-semaine', true);
  await page.click('[data-act=open][data-date="2026-10-10"] >> nth=0');
  await page.waitForSelector('.panel');
  await snap(page, '04-detail');
  await page.click('[data-act=done]');
  await page.click('[data-act=feel][data-n="4"]');
  await page.fill('#note-input', 'Bonnes sensations, vent de face au retour.');
  await page.click('[data-act=close]');
  await page.click('[data-act=mode][data-mode=month]');
  await snap(page, '05-mois', true);
  await page.click('[data-act=tab][data-view=vma]');
  await snap(page, '06-vma', true);
  await page.fill('#target-input', "3h30'00");
  await page.press('#target-input', 'Enter');
  await page.waitForTimeout(100);
  await snap(page, '06b-vma-temps-vise', false);
  await page.click('[data-act=tab][data-view=passage]');
  await snap(page, '07-passage', true);
  await page.click('[data-act=tab][data-view=bilan]');
  await snap(page, '08-bilan', true);
  await page.click('[data-act=tab][data-view=data]');
  await snap(page, '09-donnees', true);
  // rechargement : le plan et le suivi doivent persister
  await page.reload();
  await page.waitForSelector('.week, .dcard, .month', { timeout: 3000 }).catch(() => {});
  const persisted = await page.evaluate(() => ({ hasPlan: !!document.querySelector('header .count'), done: JSON.parse(localStorage.getItem('appli-marathon-v1')).tracking }));
  console.log('Persistance :', JSON.stringify(persisted));
  // thème sombre
  await page.click('[data-act=theme]');
  await page.click('[data-act=tab][data-view=plan]');
  await page.click('[data-act=mode][data-mode=week]');
  await snap(page, '10-sombre-semaine', true);
  await ctx.close();

  // ---- mobile ----
  ({ ctx, page } = await open(390, 844, '2026-10-10'));
  await page.setInputFiles('#file-xlsx', xlsx);
  await page.click('[data-act=useplan]');
  await page.waitForSelector('.week');
  await snap(page, '11-mobile-semaine', true);
  await page.click('[data-act=mode][data-mode=month]');
  await snap(page, '12-mobile-mois', true);
  await page.click('[data-act=open][data-date="2026-10-10"]');
  await snap(page, '13-mobile-detail');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  console.log('Débordement horizontal mobile :', overflow);
  await ctx.close();

  // ---- fichier invalide ----
  ({ ctx, page } = await open(1280, 800, '2026-10-10'));
  fs.writeFileSync(path.join(root, 'test', 'faux.xlsx'), fs.readFileSync(path.join(root, 'package.json')));
  await page.setInputFiles('#file-xlsx', path.join(root, 'test', 'faux.xlsx'));
  await page.waitForSelector('.errtxt');
  await snap(page, '14-fichier-invalide');
  await ctx.close();

  await browser.close();
  console.log(errors.length ? 'ERREURS :\n' + errors.join('\n') : 'Aucune erreur console.');
})();
