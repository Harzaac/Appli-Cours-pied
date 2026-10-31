/* Noyau, 3/4 : le format des plans du coach (onglets semaine, Sommaire, VMA), contrôle d'import, plans dans le calendrier */

/* ============================================================
   2. Lecture des séances (texte libre du coach -> étapes)
   ============================================================ */
function parseLines(lines) {
  const steps = [];
  let pendingSets = null;
  const last = () => steps[steps.length - 1];
  const RE_Q = '["\']{1,2}';

  for (const raw of lines) {
    // « 45' 65% VMA », « 15 min éch », « retour au calme 10' » : minutes écrites sans heures -> « 0h45 … »
    const toH = (n) => Math.floor(n / 60) + 'h' + String(n % 60).padStart(2, '0');
    const l = norm(raw).replace(/^(retour au calme\s*)?(\d{1,3})\s*(?:'|min\b|mn\b)(?!\d)/i, (x, rc, n) => (rc || '') + toH(Number(n)));
    const lo = l.toLowerCase();
    let m;

    if ((m = /^retour au calme\s*(\d+)\s*h\s*(\d{0,2})/.exec(lo))) { steps.push({ k: 'cooldown', min: Number(m[1]) * 60 + (Number(m[2]) || 0), raw: l }); continue; }
    if (/^retour au calme/.test(lo)) { steps.push({ k: 'cooldown', min: null, raw: l }); continue; }

    if ((m = /^(\d+)\s*h\s*(\d{0,2})(?:\s*\/\s*(\d+))?\s*'?\s*[ée]ch/.exec(lo))) {
      const min = Number(m[1]) * 60 + (Number(m[2]) || 0);
      const st = { k: 'warmup', min, raw: l };
      if (m[3]) st.minMax = Number(m[3]);
      steps.push(st);
      const rest = /(\d+)(?:\s*\/\s*(\d+))?\s*%\s*vma/.exec(lo);
      if (rest) st.pct = [Number(rest[1]), Number(rest[2] || rest[1])];
      continue;
    }
    if (/pr[ée]pa|[ée]duc/.test(lo)) { steps.push({ k: 'drills', raw: l }); continue; }
    if ((m = /^(\d+)\s*s[ée]ries?\b/.exec(lo))) { pendingSets = Number(m[1]); continue; }

    if (/^r[ée]cup\b/.test(lo) || /^r\s*=/.test(lo)) {
      const txt = l.replace(/^r[ée]cup\s*/i, '').replace(/^r\s*=\s*/i, '');
      const prev = last();
      if (prev && !['warmup', 'drills', 'cooldown'].includes(prev.k)) (prev.rec = prev.rec || []).push(txt);
      else steps.push({ k: 'recovery', text: txt, raw: l });
      continue;
    }
    if (/^\(?\s*allure marathon\s*\)?$/.test(lo)) { if (last()) last().pace = 'marathon'; else steps.push({ k: 'raw', raw: l, review: true }); continue; }
    if (/^\(?\s*allure semi( haute)?\s*\)?$/.test(lo)) { if (last()) last().pace = 'semi'; else steps.push({ k: 'raw', raw: l, review: true }); continue; }
    if (/^\(\s*selon sensations\s*\)/.test(lo)) { if (last()) last().note = l; continue; }

    const PCT = '\\s*(\\d+)(?:\\s*\\/\\s*(\\d+))?\\s*%\\s*vma';
    const pctOf = (a, b) => [Number(a), Number(b || a)];

    if ((m = new RegExp('^(\\d+)\\s*x\\s*\\(\\s*(\\d+)\\s*x\\s*(\\d+)\\s*m\\s*\\)' + PCT).exec(lo))) {
      steps.push({ k: 'reps', sets: Number(m[1]), n: Number(m[2]), dist: Number(m[3]), pct: pctOf(m[4], m[5]), raw: l }); pendingSets = null; continue;
    }
    if ((m = new RegExp('^(\\d+)\\s*x\\s*\\(\\s*(\\d+)\\s*m\\s*-\\s*(\\d+)\\s*m\\s*\\)' + PCT).exec(lo))) {
      steps.push({ k: 'combo', sets: pendingSets || 1, n: Number(m[1]), dists: [Number(m[2]), Number(m[3])], pct: pctOf(m[4], m[5]), raw: l }); pendingSets = null; continue;
    }
    if ((m = new RegExp('^(\\d+)\\s*x\\s*\\(\\s*(\\d+)\\s*x\\s*(\\d+)\\s*' + RE_Q + '\\s*\\/\\s*(\\d+)\\s*' + RE_Q + '\\s*\\)' + PCT).exec(lo))) {
      steps.push({ k: 'timed', sets: Number(m[1]), n: Number(m[2]), on: Number(m[3]), off: Number(m[4]), pct: pctOf(m[5], m[6]), raw: l }); pendingSets = null; continue;
    }
    if ((m = new RegExp('^(\\d+)\\s*x\\s*(\\d+)\\s*m\\b[^%]*?' + PCT).exec(lo))) {
      steps.push({ k: 'reps', sets: pendingSets || 1, n: Number(m[1]), dist: Number(m[2]), pct: pctOf(m[3], m[4]), raw: l }); pendingSets = null; continue;
    }
    if ((m = /^(\d+)\s*x\s*(\d+)\s*m\s*\(\s*(\d+)\s*km\s*\)/.exec(lo))) {
      steps.push({ k: 'reps', sets: 1, n: Number(m[1]), dist: Number(m[2]), km: Number(m[3]), pct: null, pace: null, raw: l }); continue;
    }
    if ((m = /^(\d+(?:\s*m)?(?:\s*[\/+]\s*\d+(?:\s*m)?)+)\s*\(\s*(\d+)\s*km\s*\)/.exec(lo))) {
      steps.push({ k: 'blocks', dists: m[1].match(/\d+/g).map(Number), km: Number(m[2]), pace: null, raw: l }); continue;
    }
    if ((m = /^(\d+)\s*x\s*(\d+)\s*m\s*$/.exec(lo))) {
      steps.push({ k: 'reps', sets: 1, n: Number(m[1]), dist: Number(m[2]), pct: null, pace: null, raw: l }); continue;
    }
    if ((m = /^(\d+(?:[.,]\d+)?)\s*km\s*allure marathon\s*(\+\+|\+)?/.exec(lo))) {
      steps.push({ k: 'dist', km: Number(m[1].replace(',', '.')), pace: 'marathon', plus: m[2] || '', raw: l }); continue;
    }
    if (/^semi\b/.test(lo)) { steps.push({ k: 'event', label: l, raw: l }); continue; }
    if (/^marathon$/.test(lo)) { steps.push({ k: 'race', label: l, raw: l }); continue; }
    if ((m = /^(\d+)\s*ld\b/.exec(lo))) { steps.push({ k: 'strides', n: Number(m[1]), raw: l }); continue; }

    if ((m = /^(\d+)\s*h\s*(\d{0,2})\s*allure marathon/.exec(lo))) {
      steps.push({ k: 'steady', min: Number(m[1]) * 60 + (Number(m[2]) || 0), pct: null, pace: 'marathon', raw: l }); continue;
    }
    if ((m = new RegExp("^(\\d+)\\s*h\\s*(\\d{0,2})\\s*(?:'|mn|min)?" + PCT).exec(lo))) {
      steps.push({ k: 'steady', min: Number(m[1]) * 60 + (Number(m[2]) || 0), pct: pctOf(m[3], m[4]), raw: l }); continue;
    }
    if ((m = /^rappel seuil\s*(\d+)\s*x\s*(\d+)\s*(?:mn|min|')/.exec(lo))) {
      steps.push({ k: 'tempo', n: Number(m[1]), mins: [Number(m[2])], pace: null, raw: l }); continue;
    }
    if ((m = /^(\d+)\s*x\s*(\d+)\s*'\s*r\s*=\s*(.+)$/.exec(lo))) {
      steps.push({ k: 'tempo', n: Number(m[1]), mins: [Number(m[2])], pace: null, rec: [m[3]], raw: l }); continue;
    }
    if ((m = /^((?:\d+\s*'\s*\/?\s*)+)\s*r\s*=\s*(.+)$/.exec(lo))) {
      steps.push({ k: 'tempo', n: 1, mins: m[1].match(/\d+/g).map(Number), pace: null, rec: [m[2]], blocks: true, raw: l }); continue;
    }
    if (/^\d+\s*x\s*\d+\s*\([^)]*\)/.test(lo)) { steps.push({ k: 'text', raw: l }); continue; }

    steps.push({ k: 'raw', raw: l, review: true });
  }
  for (const st of steps) {
    if ((st.k === 'reps' && st.pct == null && !st.pace) || (st.k === 'blocks' && !st.pace)) st.review = true;
  }
  return steps;
}

function categoryOf(typeText) {
  const t = typeText.toLowerCase();
  if (/comp[ée]tition|course/.test(t)) return 'race';
  if (/sp[ée] marathon|sp[ée]cifique/.test(t)) return 'spe';
  if (/sortie longue/.test(t)) return 'long';
  if (/c[ôo]tes?/.test(t)) return 'hills';
  if (/vma/.test(t)) return 'vma';
  if (/footing/.test(t)) return 'footing';
  return t ? 'other' : 'rest';
}

/* ============================================================
   3. Lecture d'un onglet de semaine
   ============================================================ */
function findRow(R, pred, from) {
  for (let i = from || 0; i < R.length; i++) if (pred(R[i], i)) return i;
  return -1;
}

function parseDateLabel(label) {
  const m = /du\s+(\d{1,2})(?:\/(\d{1,2}))?(?:\/(\d{4}))?\s+au\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i.exec(label);
  if (!m) return null;
  const d2 = Number(m[4]), m2 = Number(m[5]), y2 = Number(m[6]);
  const d1 = Number(m[1]);
  let m1 = m[2] ? Number(m[2]) : m2;
  let y1 = m[3] ? Number(m[3]) : y2;
  if (!m[2] && d1 > d2) { m1 = m2 - 1; if (m1 < 1) { m1 = 12; y1 = y2 - 1; } }
  const start = y1 + '-' + pad2(m1) + '-' + pad2(d1);
  const end = y2 + '-' + pad2(m2) + '-' + pad2(d2);
  return { start, end };
}

function parseWeekSheet(sheet) {
  const R = sheet.rows.map((r) => r.map(cellText));
  let hdr = -1, c0 = -1;
  for (let i = 0; i < R.length && hdr < 0; i++) {
    const r = R[i];
    for (let c = 0; c + 6 < r.length; c++) {
      if (r[c] === 'L' && r[c + 1] === 'M' && r[c + 2] === 'Me' && r[c + 3] === 'J' && r[c + 4] === 'V' && r[c + 5] === 'S' && r[c + 6] === 'D') { hdr = i; c0 = c; break; }
    }
  }
  if (hdr < 0) return { error: 'la grille des jours (L M Me J V S D) est introuvable' };
  const typeRow = findRow(R, (r) => /^type de s[ée]ance/i.test(r[0] || ''), hdr);
  if (typeRow < 0) return { error: 'la ligne « type de séance » est introuvable' };
  const durRow = findRow(R, (r) => /^dur[ée]e s[ée]ance/i.test(r[0] || ''), typeRow);
  if (durRow < 0) return { error: 'la ligne « durée séance » est introuvable' };
  const objRow = /^objectif/i.test((R[typeRow + 1] || [])[0] || '') ? typeRow + 1 : -1;

  let label = '';
  for (let i = hdr; i <= durRow; i++) { const t = (R[i] || [])[0] || ''; if (/^S\s*\d+\s*G?\s+du\b/i.test(t)) { label = t; break; } }
  const lm = /^S\s*(\d+)\s*(G?)/i.exec(label);
  if (!lm) return { error: 'la période de la semaine (« S6 du 05 au 11/10/2026 ») est introuvable' };
  const dates = parseDateLabel(label);
  if (!dates) return { error: 'les dates de la semaine sont illisibles : « ' + label + ' »' };

  const warnings = [];
  if (weekdayIndex(dates.start) !== 0) warnings.push('la semaine ne commence pas un lundi');
  if (diffDays(dates.end, dates.start) !== 6) warnings.push('la semaine ne compte pas 7 jours');

  let totalMin = null;
  const tr = findRow(R, (r) => /^total semaine/i.test(r[0] || ''), hdr);
  if (tr >= 0) {
    const nx = (R[tr + 1] || [])[0];
    const v = parseHM(nx);
    if (v != null) totalMin = v;
  }
  let assimilation = false;
  for (let i = hdr; i <= durRow; i++) if (/assimilation/i.test((R[i] || [])[0] || '')) assimilation = true;

  const days = [];
  for (let i = 0; i < 7; i++) {
    const col = c0 + i;
    const typeText = (R[typeRow] || [])[col] || '';
    const objective = objRow >= 0 ? ((R[objRow] || [])[col] || '') : '';
    const lines = [];
    for (let r = (objRow >= 0 ? objRow : typeRow) + 1; r < durRow; r++) {
      const t = (R[r] || [])[col];
      if (t) lines.push(t);
    }
    const durationText = (R[durRow] || [])[col] || '';
    const rest = !typeText && !lines.length && !durationText;
    const category = rest ? 'rest' : categoryOf(typeText);
    const steps = rest ? [] : parseLines(lines);
    const date = addDays(dates.start, i);
    days.push({
      i, dow: DOW[i], date, rest, category, typeText, objective, lines,
      durationText, durationMin: parseHM(durationText), steps,
    });
  }
  return {
    week: {
      id: 'S' + Number(lm[1]) + (lm[2] ? 'G' : ''),
      num: Number(lm[1]), general: !!lm[2], label, start: dates.start, end: dates.end,
      totalMin, assimilation, days,
    },
    warnings,
  };
}

/* ============================================================
   4. Onglets Sommaire et VMA
   ============================================================ */
function parseSommaire(sheet) {
  const R = sheet.rows.map((r) => r.map((v) => (typeof v === 'number' ? v : cellText(v))));
  let title = '';
  for (const r of R) for (const c of r) if (typeof c === 'string' && /\b(MARATHON|SEMI|\d+ ?KM|TRAIL)\b.*\bDE\b/i.test(c) && c.length < 60) { title = c; break; }
  let vma = null;
  for (const r of R) if (r[0] === 'VMA' && typeof r[1] === 'number') { vma = r[1]; break; }
  const hdr = findRow(R, (r) => /^distance$/i.test(String(r[0] || '')));
  const levels = [], refs = [];
  if (hdr >= 0) {
    for (let i = hdr + 1; i < R.length; i++) {
      const r = R[i];
      if (typeof r[4] === 'string' && r[4] && typeof r[6] === 'number') levels.push({ label: r[4], pct: r[6] });
      if (typeof r[0] === 'number' && typeof r[1] === 'number') {
        refs.push({
          km: r[0], realSec: r[1] * 86400, realPct: r[3],
          label: r[4] || '', objSec: typeof r[7] === 'number' ? r[7] * 86400 : null, objPct: typeof r[6] === 'number' ? r[6] : null,
        });
      }
    }
  }
  return { title, vma, levels, refs };
}

function parseVmaSheet(sheet) {
  const R = sheet.rows;
  const hdr = findRow(R.map((r) => r.map(cellText)), (r) => /^en m[èe]tres/i.test(r[0] || ''));
  if (hdr < 0) return null;
  const pcts = [];
  const cols = [];
  R[hdr].forEach((v, c) => { if (c > 0 && typeof v === 'number' && v >= 50 && v <= 150) { pcts.push(v); cols.push(c); } });
  const rows = [];
  for (let i = hdr + 1; i < R.length; i++) {
    const r = R[i];
    if (typeof r[0] !== 'number') { if (rows.length) break; else continue; }
    const fill = cols.map((c) => (sheet.fills && sheet.fills[colLetters(c) + (i + 1)]) || null);
    const row = { dist: r[0], avail: cols.map((c) => typeof r[c] === 'number') };
    if (fill.some(Boolean)) row.fill = fill;
    rows.push(row);
  }
  return { pcts, rows };
}

/* ============================================================
   5. Contrôle d'import + construction du plan
   ============================================================ */
function buildPlan(sheets, sourceName) {
  const errors = [], warnings = [], checks = [];
  const byName = {};
  for (const s of sheets) byName[s.name.replace(/\s+/g, ' ').trim().toUpperCase()] = s;
  const add = (ok, msg) => checks.push({ ok, msg });

  const som = byName['SOMMAIRE'];
  const vmaSheet = byName['VMA'];
  add(!!som, 'Onglet « Sommaire » présent');
  add(!!vmaSheet, 'Onglet « VMA » présent');

  let sommaire = null;
  if (som) {
    sommaire = parseSommaire(som);
    const okTitle = !!(sommaire.title && sommaire.title.trim().length >= 3);
    add(okTitle, okTitle ? 'Titre « ' + sommaire.title + ' » reconnu' : 'Titre du plan introuvable dans le Sommaire');
    const okVma = sommaire.vma && sommaire.vma >= 10 && sommaire.vma <= 25;
    add(!!okVma, okVma ? 'VMA du plan : ' + String(sommaire.vma).replace('.', ',') + ' km/h' : 'VMA du plan introuvable ou invraisemblable');
    add(sommaire.levels.length >= 3, 'Allures cibles du coach (10 km, semi, marathon, endurance)');
  }

  const weeks = [];
  const weekNames = Object.keys(byName).filter((n) => /^S\d+( G)?$/.test(n));
  const need = [];
  let maxN = 0;
  for (const n of weekNames) { const m = /^S(\d+)( G)?$/.exec(n); if (m && !m[2]) maxN = Math.max(maxN, Number(m[1])); }
  maxN = Math.max(maxN, 4);
  for (let i = 1; i <= maxN; i++) need.push('S' + i);
  const missing = need.filter((n) => !byName[n]);
  add(missing.length === 0, missing.length ? 'Onglets de semaine manquants : ' + missing.join(', ') : 'Onglets S1 à S' + maxN + ' présents');

  for (const n of weekNames) {
    const res = parseWeekSheet(byName[n]);
    if (res.error) { errors.push('Onglet « ' + byName[n].name + ' » : ' + res.error + '.'); continue; }
    for (const w of res.warnings) warnings.push('Onglet « ' + byName[n].name + ' » : ' + w + '.');
    weeks.push(res.week);
  }
  const weeksOk = weeks.filter((w) => !w.general).length >= 4 && errors.length === 0;
  add(weeksOk, weeksOk ? 'Grilles de semaine lues (' + weeks.length + ' semaines, dates cohérentes)' : 'Certaines semaines sont illisibles');

  weeks.sort((a, b) => (a.start < b.start ? -1 : 1));
  for (let i = 1; i < weeks.length; i++) {
    const gap = diffDays(weeks[i].start, weeks[i - 1].end);
    if (gap !== 1) warnings.push('Entre ' + weeks[i - 1].id + ' et ' + weeks[i].id + ' : ' + (gap > 1 ? gap - 1 + ' jour(s) sans programme' : 'chevauchement') + '.');
  }
  for (const w of weeks) {
    const hasRace = w.days.some((d) => d.category === 'race');
    const sum = w.days.reduce((a, d) => a + (d.durationMin || 0), 0);
    if (w.totalMin != null && !hasRace && sum !== w.totalMin) warnings.push(w.id + ' : total écrit ' + fmtMin(w.totalMin) + ', somme des séances ' + fmtMin(sum) + '.');
  }

  const vmaTable = vmaSheet ? parseVmaSheet(vmaSheet) : null;
  const structOk = checks.every((c) => c.ok) && errors.length === 0;
  const ok = structOk;
  if (!ok) {
    const failed = checks.filter((c) => !c.ok).map((c) => c.msg);
    if (failed.length) errors.unshift("Ce fichier ne ressemble pas au plan du coach : " + failed.join(' ; ') + '.');
  }

  let raceDate = null;
  for (const w of weeks) for (const d of w.days) if (d.category === 'race') raceDate = d.date;

  const review = [];
  for (const w of weeks) for (const d of w.days) for (const s of d.steps) if (s.review) review.push({ week: w.id, date: d.date, dow: d.dow, type: d.typeText, raw: s.raw });

  const plan = ok ? {
    app: 'appli-marathon', version: 1,
    title: sommaire.title || titleFromFile(sourceName),
    source: sourceName || '', importedAt: new Date().toISOString(),
    vma: sommaire.vma, levels: sommaire.levels, refs: sommaire.refs, vmaTable,
    raceDate, weeks,
  } : null;
  return { ok, errors, warnings, checks, review, plan };
}

// Sans titre dans le fichier : « plan_semi-rennes 2027.xlsx » -> « plan semi-rennes 2027 », sinon « Mon plan ».
function titleFromFile(name) {
  const t = String(name || '').replace(/\.[a-z0-9]+$/i, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return t || 'Mon plan';
}

/* ============================================================
   5b. Plans dans le calendrier : recalage, étendue, nom de course
   ============================================================ */
function planRange(plan) { return { start: plan.weeks[0].start, end: plan.weeks[plan.weeks.length - 1].end }; }
function mondayOf(iso) { return addDays(iso, -weekdayIndex(iso)); }
// Recale tout le plan par semaines entières : le jour de course tombe dans la semaine de la date voulue, avec le même jour de la semaine que dans le fichier.
function shiftPlanToRace(plan, newRace) {
  if (!plan.raceDate) return { plan, delta: 0 };
  const delta = diffDays(mondayOf(newRace), mondayOf(plan.raceDate));
  return { plan: shiftPlan(plan, delta), delta };
}
function shiftPlan(plan, delta) {
  const c = JSON.parse(JSON.stringify(plan));
  if (!delta) return c;
  for (const w of c.weeks) {
    w.start = addDays(w.start, delta); w.end = addDays(w.end, delta);
    for (const d of w.days) d.date = addDays(d.date, delta);
  }
  if (c.raceDate) c.raceDate = addDays(c.raceDate, delta);
  return c;
}
// Plan de reprise après un marathon : 3 semaines de footings progressifs, à valider avec son coach.
function buildRecoveryPlan(startMon, vma, nowIso) {
  const foot = (min, pct) => [{ k: 'steady', min, pct: [pct, pct], raw: fmtMinPlain(min) + ' ' + pct + '% VMA' }];
  const S_ = (cat, type, obj, steps) => ({ cat, type, obj, steps });
  const R = null;
  const weeks = [
    [R, R, S_('footing', 'Footing', 'très facile, en aisance', foot(30, 65)), R, R, S_('footing', 'Footing', 'très facile, en aisance', foot(35, 65)), R],
    [R, S_('footing', 'Footing', 'facile', foot(40, 65)), R, S_('footing', 'Footing', 'facile, avec lignes droites', foot(35, 65).concat([{ k: 'strides', n: 6, raw: '6 LD' }])), R, S_('footing', 'Footing', 'facile', foot(45, 65)), R],
    [R, S_('footing', 'Footing', 'facile', foot(45, 65)), R, S_('vma', 'Fartlek léger', 'réveil musculaire, sans forcer', [{ k: 'warmup', min: 15, raw: '0h15 éch' }, { k: 'timed', sets: 1, n: 6, on: 60, off: 60, pct: [85, 85], raw: '6 x 1\'/1\' 85% VMA' }, { k: 'cooldown', min: 10, raw: 'retour au calme 0h10' }]), R, S_('footing', 'Footing', 'facile', foot(45, 65)), S_('long', 'Sortie longue', 'tranquille', foot(60, 65))],
  ];
  const DOWS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const plan = { app: 'appli-marathon', version: 1, kind: 'recovery', title: 'REPRISE APRÈS MARATHON', source: '', importedAt: nowIso || '', vma, levels: [], refs: [], vmaTable: null, raceDate: null, weeks: [] };
  weeks.forEach((wk, n) => {
    const start = addDays(startMon, 7 * n);
    const days = wk.map((x, i) => {
      const date = addDays(start, i);
      if (!x) return { i, dow: DOWS[i], date, rest: true, category: 'rest', typeText: '', objective: '', lines: [], durationText: '', durationMin: null, steps: [] };
      const min = x.steps.reduce((a, st) => a + (st.min || (st.k === 'timed' ? st.n * (st.on + st.off) / 60 : 0)), 0);
      return { i, dow: DOWS[i], date, rest: false, category: x.cat, typeText: x.type, objective: x.obj, lines: x.steps.map((st) => st.raw), durationText: fmtMinPlain(min), durationMin: min, steps: x.steps };
    });
    plan.weeks.push({ id: 'R' + (n + 1), num: n + 1, general: false, label: 'Reprise ' + (n + 1), start, end: addDays(start, 6), totalMin: days.reduce((a, d) => a + (d.durationMin || 0), 0), assimilation: false, days });
  });
  return plan;
}
function fmtMinPlain(min) { const h = Math.floor(min / 60), m = Math.round(min % 60); return h + 'h' + String(m).padStart(2, '0'); }
// « MARATHON DE LILLE 2026 » -> « Marathon de Lille »
function raceLabel(plan) {
  const t = String((plan && plan.title) || '').replace(/\b(19|20)\d{2}\b/g, '').replace(/\s+/g, ' ').trim();
  if (!t) return 'Course';
  const low = t.toLowerCase();
  return low.charAt(0).toUpperCase() + low.slice(1).replace(/\b(lille|paris|rennes|nantes|lyon|nice|bordeaux|toulouse|strasbourg|marseille|annecy|montpellier|la rochelle|saint-malo)\b/g, (m) => m.replace(/(^|[ -])(\w)/g, (x, a, b) => a + b.toUpperCase()));
}
