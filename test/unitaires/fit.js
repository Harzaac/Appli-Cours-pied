// Vérifie le fichier .fit avec un décodeur écrit à part (structure, CRC, valeurs).
const fs = require('fs'); const path = require('path');
const core = require('../../src/core.js'); const fit = require('../../src/fit.js');
const { sheetsFromDump } = require('./parseur.js');
const res = core.buildPlan(sheetsFromDump(fs.readFileSync(path.join(__dirname, '..', 'donnees', 'dump.txt'), 'utf8')), 'x');
const plan = res.plan; const settings = core.makeSettings(plan); const ctx = core.paceCtx(plan, settings);

function crc16(b, from, to) { let c = 0; for (let i = from; i < to; i++) { let x = b[i]; for (let k = 0; k < 8; k++) { const lsb = (c ^ x) & 1; c >>= 1; if (lsb) c ^= 0xA001; x >>= 1; } } return c; } // variante bit à bit
function decode(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (buf[0] !== 14 || String.fromCharCode(buf[8], buf[9], buf[10], buf[11]) !== '.FIT') throw new Error('en-tête');
  const dataSize = dv.getUint32(4, true);
  if (buf.length !== 14 + dataSize + 2) throw new Error('taille');
  if (dv.getUint16(12, true) !== crc16(buf, 0, 12)) throw new Error('crc en-tête');
  if (dv.getUint16(14 + dataSize, true) !== crc16(buf, 0, 14 + dataSize)) throw new Error('crc fichier');
  const defs = {}, msgs = []; let p = 14;
  while (p < 14 + dataSize) {
    const h = buf[p++];
    if (h & 0x40) {
      const local = h & 0x0F; p++; const arch = buf[p++]; if (arch !== 0) throw new Error('arch');
      const g = dv.getUint16(p, true); p += 2; const n = buf[p++]; const fields = [];
      for (let i = 0; i < n; i++) { fields.push({ num: buf[p], size: buf[p + 1], type: buf[p + 2] }); p += 3; }
      defs[local] = { g, fields };
    } else {
      const d = defs[h & 0x0F]; if (!d) throw new Error('def manquante'); const m = { g: d.g };
      for (const f of d.fields) {
        let v;
        if (f.type === 0x07) { let s = ''; for (let i = 0; i < f.size && buf[p + i]; i++) s += String.fromCharCode(buf[p + i]); v = s; }
        else if (f.size === 1) v = buf[p]; else if (f.size === 2) v = dv.getUint16(p, true); else v = dv.getUint32(p, true);
        m[f.num] = v; p += f.size;
      }
      msgs.push(m);
    }
  }
  if (p !== 14 + dataSize) throw new Error('fin de données');
  return msgs;
}
let n = 0, bad = 0, withUnsup = [];
for (const w of plan.weeks) for (const d of w.days) {
  if (d.rest || d.category === 'race') continue;
  const { flat, unsupported } = fit.workoutFromDay(d, ctx, 5);
  let bytes; try { bytes = fit.fitEncode('Test ' + w.id, flat, 1760000000); const msgs = decode(bytes);
    const wk = msgs.find((m) => m.g === 26), steps = msgs.filter((m) => m.g === 27);
    if (wk[6] !== flat.length || steps.length !== flat.length) throw new Error('nombre d\'étapes');
    steps.forEach((s, i) => { if (s[254] !== i) throw new Error('index'); if (s[1] === 6 && !(s[2] < i && s[4] >= 2)) throw new Error('répétition incohérente ' + JSON.stringify(s)); if (s[3] === 0 && s[1] !== 6 && s[5] > s[6]) throw new Error('allure lente/rapide'); });
  } catch (e) { bad++; console.log('ERREUR', w.id, d.date, e.message); }
  n++; if (unsupported.length) withUnsup.push(w.id + ' ' + d.date + ' : ' + unsupported.join(' | '));
}
console.log(n, 'séances encodées, erreurs :', bad);
console.log('Étapes non reconnues (exportées en étape libre) :', withUnsup.length ? '\n' + withUnsup.join('\n') : 'aucune');
// exemple lisible
const ex = plan.weeks.find((w) => w.id === 'S6').days.find((d) => d.category === 'vma');
const { flat } = fit.workoutFromDay(ex, ctx, 5);
console.log('\nExemple S6 (VMA) :');
flat.forEach((s, i) => console.log(i, s.repeat ? 'RÉPÈTE ×' + s.repeat + ' depuis ' + s.from : [s.name, s.durType + ' ' + s.durVal, s.intensity, s.target ? core.fmtPace(s.target.fast) + '–' + core.fmtPace(s.target.slow) : 'sans allure'].join(' | ')));
if (process.argv[2]) {
  const msgs = decode(new Uint8Array(fs.readFileSync(process.argv[2])));
  console.log('\nFichier téléchargé : CRC et structure OK,', msgs.length, 'messages');
  msgs.forEach((m) => { if (m.g === 26) console.log('séance :', m[8], '| étapes', m[6]); if (m.g === 27) console.log(' ', m[254], m[0] !== undefined ? m[0] : 'répétition', '| durée', m[1], m[2], m[1] === 6 ? '(x' + m[4] + ')' : '', m[3] === 0 ? '| allure ' + (1e6 / m[6] / 1).toFixed(0) + '–' + (1e6 / m[5]).toFixed(0) + ' s/km' : ''); });
}
