/* ============================================================
   Export Garmin : séance structurée au format .fit
   (aucune bibliothèque : le format est écrit à la main)
   ============================================================ */
const FIT_CRC_TABLE = [0x0000, 0xCC01, 0xD801, 0x1400, 0xF001, 0x3C00, 0x2800, 0xE401, 0xA001, 0x6C00, 0x7800, 0xB401, 0x5000, 0x9C01, 0x8801, 0x4400];
function fitCrc(bytes, from, to) {
  let crc = 0;
  for (let i = from; i < to; i++) {
    const b = bytes[i];
    let tmp = FIT_CRC_TABLE[crc & 0xF];
    crc = (crc >> 4) & 0x0FFF;
    crc = crc ^ tmp ^ FIT_CRC_TABLE[b & 0xF];
    tmp = FIT_CRC_TABLE[crc & 0xF];
    crc = (crc >> 4) & 0x0FFF;
    crc = crc ^ tmp ^ FIT_CRC_TABLE[(b >> 4) & 0xF];
  }
  return crc;
}
function fitAscii(s, max) {
  let t = String(s == null ? '' : s);
  try { t = t.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { /* rien */ }
  t = t.replace(/[^\x20-\x7e]/g, ' ').replace(/\s+/g, ' ').trim();
  return t.slice(0, max);
}

const FIT = { enum: 0x00, u8: 0x02, string: 0x07, u16: 0x84, u32: 0x86, u32z: 0x8C };
const DUR = { time: 0, dist: 1, open: 5, repeat: 6 };
const INTENSITY = { active: 0, rest: 1, warmup: 2, cooldown: 3, recovery: 4, interval: 5 };

function fitEncode(workoutName, flat, unixNow) {
  const body = [];
  const u8 = (v) => body.push(v & 0xFF);
  const u16 = (v) => { u8(v); u8(v >> 8); };
  const u32 = (v) => { u8(v); u8(v >> 8); u8(v >> 16); u8(v >>> 24); };
  const str = (s, size) => { const t = fitAscii(s, size - 1); for (let i = 0; i < size; i++) u8(i < t.length ? t.charCodeAt(i) : 0); };
  const def = (local, global, fields) => {
    u8(0x40 | local); u8(0); u8(0); u16(global); u8(fields.length);
    fields.forEach((f) => { u8(f[0]); u8(f[1]); u8(f[2]); });
  };
  const NAME = 20, STEP = 16, NOTE = 48;

  // 0 : file_id
  def(0, 0, [[0, 1, FIT.enum], [1, 2, FIT.u16], [2, 2, FIT.u16], [3, 4, FIT.u32z], [4, 4, FIT.u32]]);
  u8(0); u8(5); u16(255); u16(0); u32(1); u32(Math.max(0, Math.floor(unixNow) - 631065600));
  // 1 : workout
  def(1, 26, [[4, 1, FIT.enum], [6, 2, FIT.u16], [8, NAME, FIT.string]]);
  u8(1); u8(1); u16(flat.length); str(workoutName, NAME);
  // 2 : workout_step complet / 3 : étape de répétition
  def(2, 27, [[254, 2, FIT.u16], [0, STEP, FIT.string], [1, 1, FIT.enum], [2, 4, FIT.u32], [3, 1, FIT.enum], [4, 4, FIT.u32], [5, 4, FIT.u32], [6, 4, FIT.u32], [7, 1, FIT.enum], [8, NOTE, FIT.string]]);
  def(3, 27, [[254, 2, FIT.u16], [1, 1, FIT.enum], [2, 4, FIT.u32], [4, 4, FIT.u32]]);
  flat.forEach((s, i) => {
    if (s.repeat) {
      u8(3); u16(i); u8(DUR.repeat); u32(s.from); u32(s.repeat);
      return;
    }
    u8(2); u16(i); str(s.name, STEP);
    u8(DUR[s.durType]);
    u32(s.durType === 'time' ? Math.round(s.durVal * 1000) : s.durType === 'dist' ? Math.round(s.durVal * 100) : 0);
    if (s.target) {
      u8(0); u32(0);
      u32(Math.round(1e6 / s.target.slow)); u32(Math.round(1e6 / s.target.fast));
    } else { u8(2); u32(0); u32(0); u32(0); }
    u8(INTENSITY[s.intensity] != null ? INTENSITY[s.intensity] : 0);
    str(s.notes || '', NOTE);
  });

  const out = new Uint8Array(14 + body.length + 2);
  const dv = new DataView(out.buffer);
  out[0] = 14; out[1] = 0x20; dv.setUint16(2, 2132, true); dv.setUint32(4, body.length, true);
  out[8] = 0x2E; out[9] = 0x46; out[10] = 0x49; out[11] = 0x54;
  dv.setUint16(12, fitCrc(out, 0, 12), true);
  out.set(body, 14);
  dv.setUint16(14 + body.length, fitCrc(out, 0, 14 + body.length), true);
  return out;
}

/* ---- séance de l'appli -> étapes Garmin ---- */
function fitParseRec(list) {
  const out = { rep: null, set: null };
  const items = Array.isArray(list) ? list : (list ? [list] : []);
  const one = (x) => {
    let m = /(\d+)\s*'\s*(\d{0,2})/.exec(x);
    if (m) return { sec: Number(m[1]) * 60 + (Number(m[2]) || 0) };
    m = /(\d+)\s*"/.exec(x);
    if (m) return { sec: Number(m[1]) };
    m = /(\d+)\s*(?:mn|min)\b/.exec(x);
    if (m) return { sec: Number(m[1]) * 60 };
    return null;
  };
  items.forEach((raw) => {
    const t = String(raw).toLowerCase().replace(/''/g, '"');
    if (/s[ée]rie/.test(t)) { if (!out.set) out.set = one(t); return; }
    const parts = t.split('/');
    if (!out.rep) out.rep = one(parts[0]);
    if (parts.length > 1 && !/\d+\s*m\b/.test(parts[1])) { const s2 = one(parts[1]); if (s2 && !out.set) out.set = s2; }
  });
  return out;
}

function workoutFromDay(day, ctx, tol) {
  const items = [];
  const notes = [];
  const T = tol || 5;
  const around = (p) => ({ slow: p + T, fast: Math.max(60, p - T) });
  const byPct = (pct) => (pct[0] !== pct[1] ? { slow: ctx.pct(Math.min(pct[0], pct[1])), fast: ctx.pct(Math.max(pct[0], pct[1])) } : around(ctx.pct(pct[0])));
  const byName = (n) => (n === 'marathon' ? around(ctx.marathon) : n === 'semi' ? around(ctx.semi) : null);
  const step = (o) => Object.assign({ name: '', durType: 'open', durVal: 0, target: null, intensity: 'active', notes: '' }, o);
  const recStep = (r, name) => (r ? step({ name: name || 'Recup', durType: 'time', durVal: r.sec, intensity: 'rest' }) : null);
  const block = (n, inner) => { if (n > 1) items.push({ repeat: n, items: inner }); else inner.forEach((x) => items.push(x)); };
  const push = (list) => list.filter(Boolean).forEach((x) => items.push(x));

  for (const st of day.steps) {
    const rec = fitParseRec(st.rec);
    switch (st.k) {
      case 'warmup': push([step({ name: 'Echauffement', durType: st.min ? 'time' : 'open', durVal: (st.min || 0) * 60, intensity: 'warmup' })]); break;
      case 'drills': push([step({ name: 'Educatifs+accel.', intensity: 'warmup', notes: 'Bouton lap pour finir' })]); break;
      case 'cooldown': push([step({ name: 'Retour au calme', durType: st.min ? 'time' : 'open', durVal: (st.min || 0) * 60, intensity: 'cooldown' })]); break;
      case 'steady': {
        const tg = st.pace ? byName(st.pace) : (st.pct ? byPct(st.pct) : null);
        push([step({ name: st.pace ? 'Allure ' + st.pace : 'Footing', durType: 'time', durVal: st.min * 60, target: tg, intensity: st.pace || (st.pct && st.pct[0] > 75) ? 'interval' : 'active' })]);
        if (rec.rep) push([recStep(rec.rep)]);
        break;
      }
      case 'reps': {
        const tg = st.pct ? byPct(st.pct) : (st.pace ? byName(st.pace) : null);
        const sets = st.sets || 1;
        for (let s = 0; s < sets; s++) {
          const inner = [step({ name: st.dist + ' m', durType: 'dist', durVal: st.dist, target: tg, intensity: 'interval', notes: tg ? '' : 'Allure a preciser' })];
          if (rec.rep) inner.push(recStep(rec.rep));
          block(st.n, inner);
          if (s < sets - 1 && rec.set) push([recStep(rec.set, 'Recup serie')]);
        }
        break;
      }
      case 'combo': {
        const tg = byPct(st.pct);
        const sets = st.sets || 1;
        for (let s = 0; s < sets; s++) {
          const inner = st.dists.map((d) => step({ name: d + ' m', durType: 'dist', durVal: d, target: tg, intensity: 'interval' }));
          if (rec.rep) inner.push(recStep(rec.rep));
          block(st.n, inner);
          if (s < sets - 1 && rec.set) push([recStep(rec.set, 'Recup serie')]);
        }
        break;
      }
      case 'timed': {
        const tg = byPct(st.pct);
        const sets = st.sets || 1;
        for (let s = 0; s < sets; s++) {
          block(st.n, [step({ name: st.on + ' s vite', durType: 'time', durVal: st.on, target: tg, intensity: 'interval' }), step({ name: st.off + ' s lent', durType: 'time', durVal: st.off, intensity: 'rest' })]);
          if (s < sets - 1) push([recStep(rec.set || rec.rep, 'Recup serie')]);
        }
        break;
      }
      case 'tempo': {
        const tg = st.pace ? byName(st.pace) : null;
        if (st.blocks) {
          st.mins.forEach((m, i) => { push([step({ name: m + ' min seuil', durType: 'time', durVal: m * 60, target: tg, intensity: 'interval' })]); if (rec.rep && i < st.mins.length - 1) push([recStep(rec.rep)]); });
        } else {
          const inner = [step({ name: st.mins[0] + ' min seuil', durType: 'time', durVal: st.mins[0] * 60, target: tg, intensity: 'interval', notes: tg ? '' : 'Effort seuil' })];
          if (rec.rep) inner.push(recStep(rec.rep));
          block(st.n, inner);
        }
        break;
      }
      case 'blocks': {
        const tg = st.pace ? byName(st.pace) : null;
        st.dists.forEach((d) => push([step({ name: d + ' m', durType: 'dist', durVal: d, target: tg, intensity: 'interval', notes: tg ? '' : 'Allure a preciser' })]));
        break;
      }
      case 'dist': push([step({ name: st.km + ' km allure mar.', durType: 'dist', durVal: st.km * 1000, target: byName('marathon'), intensity: 'interval' })]); break;
      case 'recovery': { const r = fitParseRec(st.text).rep; push([r ? recStep(r) : step({ name: 'Recup', intensity: 'rest', notes: st.text })]); break; }
      case 'strides': block(st.n, [step({ name: '20 s vite', durType: 'time', durVal: 20, intensity: 'interval' }), step({ name: '40 s lent', durType: 'time', durVal: 40, intensity: 'rest' })]); break;
      default: {
        push([step({ name: 'A faire', intensity: 'active', notes: st.raw || st.label || '' })]);
        notes.push(st.raw || st.label || 'étape');
      }
    }
  }
  // aplatir
  const flat = [];
  const walk = (list) => list.forEach((it) => {
    if (it.repeat) { const from = flat.length; walk(it.items); flat.push({ repeat: it.repeat, from }); } else flat.push(it);
  });
  walk(items);
  return { flat, unsupported: notes };
}

function fitFileName(weekId, day) {
  const names = { footing: 'footing', vma: 'vma', spe: 'spe', long: 'longue', hills: 'cotes', other: 'seance' };
  return fitAscii(weekId.replace('G', 'G') + '_' + ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'][day.i] + String(day.date).slice(8) + '_' + (names[day.category] || 'seance'), 40).replace(/ /g, '') + '.fit';
}

if (typeof module !== 'undefined') module.exports = { fitEncode, workoutFromDay, fitParseRec, fitCrc, fitFileName, fitAscii };
