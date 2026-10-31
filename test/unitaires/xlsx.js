// Vérifie que la lecture d'un vrai .xlsx (zip + XML, dans Chromium) donne le même plan que la lecture du dump.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const core = require('../outils/noyau.js');
const { sheetsFromDump } = require('./parseur.js');

(async () => {
  const root = path.join(__dirname, '..', '..');
  const expected = core.buildPlan(sheetsFromDump(fs.readFileSync(path.join(root, 'test', 'donnees', 'dump.txt'), 'utf8')), 'x');
  const xlsx = fs.readFileSync(path.join(root, 'test', 'donnees', 'plan-test.xlsx'));
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.setContent('<html><body></body></html>');
  await page.addScriptTag({ content: core.source });
  const got = await page.evaluate(async (b64) => {
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const sheets = await readXlsx(u8.buffer);
    const res = buildPlan(sheets, 'plan-test.xlsx');
    return { names: sheets.map((s) => s.name), ok: res.ok, errors: res.errors, warnings: res.warnings, review: res.review.length, plan: res.plan };
  }, xlsx.toString('base64'));
  await browser.close();
  console.log('Onglets lus :', got.names.join(' | '));
  console.log('ok =', got.ok, '| erreurs =', got.errors.length, '| avertissements =', got.warnings.length, '| à vérifier =', got.review);
  const a = JSON.stringify(got.plan.weeks);
  const b = JSON.stringify(expected.plan.weeks);
  console.log('Semaines identiques au dump :', a === b);
  if (a !== b) {
    for (let i = 0; i < expected.plan.weeks.length; i++) {
      if (JSON.stringify(got.plan.weeks[i]) !== JSON.stringify(expected.plan.weeks[i])) { console.log('Différence en', expected.plan.weeks[i].id); break; }
    }
  }
  console.log('VMA', got.plan.vma, '| course', got.plan.raceDate, '| table VMA', got.plan.vmaTable && got.plan.vmaTable.rows.length + ' distances × ' + got.plan.vmaTable.pcts.length + ' %');
  console.log('refs', JSON.stringify(got.plan.refs.map((r) => [r.km, Math.round(r.realSec), r.objSec && Math.round(r.objSec)])));
  if (errors.length) console.log('Erreurs page :', errors);
})();
