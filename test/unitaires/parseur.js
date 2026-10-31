const fs = require('fs');
const path = require('path');
const core = require('../../src/core.js');

function sheetsFromDump(txt) {
  const sheets = [];
  let cur = null;
  const lines = txt.split('\n');
  for (const line of lines) {
    const m = /^## Sheet: (.*)$/.exec(line);
    if (m) { cur = { name: m[1], rows: [] }; sheets.push(cur); continue; }
    if (!cur) continue;
    const cells = line.split('\t').map((c) => {
      if (c === '') return null;
      if (/^-?\d+(\.\d+)?(E-?\d+)?$/i.test(c)) return Number(c);
      return c;
    });
    cur.rows.push(cells);
  }
  // retire la ligne vide qui suit l'en-tête et la ligne de fin
  for (const s of sheets) { if (s.rows.length && s.rows[0].every((c) => c === null)) s.rows.shift(); }
  return sheets;
}

module.exports = { sheetsFromDump };

if (require.main === module) {
  const txt = fs.readFileSync(path.join(__dirname, '..', 'donnees', 'dump.txt'), 'utf8');
  const sheets = sheetsFromDump(txt);
  console.log('Onglets :', sheets.map((s) => s.name).join(' | '));
  const res = core.buildPlan(sheets, 'test.xlsx');
  console.log('OK =', res.ok);
  res.checks.forEach((c) => console.log(' ', c.ok ? '✓' : '✗', c.msg));
  res.errors.forEach((e) => console.log('ERREUR', e));
  res.warnings.forEach((e) => console.log('AVERT', e));
  console.log('À vérifier :', res.review.length);
  res.review.forEach((r) => console.log('  ', r.week, r.date, r.dow, '|', r.raw));
  if (res.plan) {
    console.log('Course :', res.plan.raceDate, ' VMA', res.plan.vma, ' niveaux', res.plan.levels.map((l) => l.label + '=' + l.pct.toFixed(3)).join(', '));
    const settings = core.makeSettings(res.plan);
    console.log('Réglages par défaut :', settings, core.fmtHMS(settings.targetSec));
    const ctx = core.paceCtx(res.plan, settings);
    const only = process.argv[2];
    for (const w of res.plan.weeks) {
      if (only && w.id !== only) continue;
      console.log('\n==', w.id, w.start, '→', w.end, 'total', w.totalMin, w.assimilation ? '(assimilation)' : '');
      for (const d of w.days) {
        if (d.rest) { console.log('  ', d.date, d.dow.slice(0, 3), 'repos'); continue; }
        console.log('  ', d.date, d.dow.slice(0, 3), d.category, '|', d.typeText, '|', d.objective, '|', d.durationText, d.durationMin);
        for (const s of d.steps) {
          const t = core.describeStep(s, ctx);
          console.log('       -', t.tone.padEnd(6), t.title, t.sub.length ? ' ~ ' + t.sub.join(' ; ') : '', t.review ? ' [À VÉRIFIER]' : '');
        }
      }
    }
  }
}
