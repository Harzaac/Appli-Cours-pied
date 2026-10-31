/* ============================================================
   Appli Marathon — noyau : lecture .xlsx, contrôle du plan, séances en étapes, allures
   Aucune dépendance. Fonctionne dans le navigateur ; la partie "plan" se teste aussi sous Node.
   ============================================================ */

const DOW = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const DOW_SHORT = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/* ---------- dates (UTC, sans décalage horaire) ---------- */
function pad2(n) { return String(n).padStart(2, '0'); }
function isoFromUTC(d) { return d.getUTCFullYear() + '-' + pad2(d.getUTCMonth() + 1) + '-' + pad2(d.getUTCDate()); }
function parseISO(s) { const p = s.split('-').map(Number); return new Date(Date.UTC(p[0], p[1] - 1, p[2])); }
function addDays(iso, n) { const d = parseISO(iso); d.setUTCDate(d.getUTCDate() + n); return isoFromUTC(d); }
function diffDays(a, b) { return Math.round((parseISO(a) - parseISO(b)) / 86400000); }
function weekdayIndex(iso) { return (parseISO(iso).getUTCDay() + 6) % 7; }

/* ---------- texte ---------- */
function norm(s) {
  return String(s == null ? '' : s)
    .replace(/[‘’ʼ`´′]/g, "'")
    .replace(/[“”″]/g, '"')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
function cellText(v) {
  if (v == null) return '';
  if (typeof v === 'number') return String(v);
  return norm(v);
}
function parseHM(str) {
  const m = /(\d+)\s*h\s*(\d{0,2})/i.exec(String(str || ''));
  if (!m) return null;
  return Number(m[1]) * 60 + (Number(m[2]) || 0);
}

/* ============================================================
   1. Lecture d'un fichier .xlsx (zip + XML), sans bibliothèque
   ============================================================ */
async function inflateRaw(u8) {
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([u8]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function unzip(buf) {
  const u8 = new Uint8Array(buf);
  const dv = new DataView(buf);
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Ce fichier n'est pas un classeur Excel (.xlsx).");
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const files = {};
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const method = dv.getUint16(p + 10, true);
    const csize = dv.getUint32(p + 20, true);
    const nlen = dv.getUint16(p + 28, true);
    const elen = dv.getUint16(p + 30, true);
    const clen = dv.getUint16(p + 32, true);
    const loff = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(u8.subarray(p + 46, p + 46 + nlen));
    files[name] = { method, csize, loff };
    p += 46 + nlen + elen + clen;
  }
  async function get(name) {
    const f = files[name];
    if (!f) return null;
    const nl = dv.getUint16(f.loff + 26, true);
    const el = dv.getUint16(f.loff + 28, true);
    const start = f.loff + 30 + nl + el;
    const data = u8.subarray(start, start + f.csize);
    if (f.method === 0) return data;
    if (f.method === 8) return inflateRaw(data);
    throw new Error('Compression du fichier non prise en charge.');
  }
  return { get };
}

function colIndex(ref) {
  const m = /^([A-Z]+)/.exec(ref);
  let n = 0;
  for (const ch of m[1]) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}
function rowIndex(ref) { return Number(/(\d+)$/.exec(ref)[1]) - 1; }
function colLetters(c) { let s = ''; c += 1; while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; }

async function readXlsx(buf) {
  const z = await unzip(buf);
  const text = async (n) => { const b = await z.get(n); return b ? new TextDecoder().decode(b) : null; };
  const xml = (s) => new DOMParser().parseFromString(s, 'application/xml');

  const wbXml = await text('xl/workbook.xml');
  if (!wbXml) throw new Error("Ce fichier n'est pas un classeur Excel (.xlsx).");
  const rels = {};
  const relXml = await text('xl/_rels/workbook.xml.rels');
  if (relXml) {
    for (const r of xml(relXml).getElementsByTagName('Relationship')) rels[r.getAttribute('Id')] = r.getAttribute('Target');
  }
  const shared = [];
  const ssXml = await text('xl/sharedStrings.xml');
  if (ssXml) {
    for (const si of xml(ssXml).getElementsByTagName('si')) {
      let t = '';
      for (const x of si.getElementsByTagName('t')) {
        if (x.parentNode && x.parentNode.nodeName === 'rPh') continue;
        t += x.textContent;
      }
      shared.push(t);
    }
  }
  const fillOfStyle = readFills(xml(await text('xl/styles.xml') || '<x/>'), xml(await text('xl/theme/theme1.xml') || '<x/>'));
  const sheets = [];
  let n = 0;
  for (const s of xml(wbXml).getElementsByTagName('sheet')) {
    n++;
    const name = s.getAttribute('name');
    const rid = s.getAttribute('r:id');
    let target = rels[rid] || ('worksheets/sheet' + n + '.xml');
    target = target.charAt(0) === '/' ? target.slice(1) : 'xl/' + target;
    const sx = await text(target);
    if (!sx) continue;
    const rows = [];
    const fills = {};
    for (const c of xml(sx).getElementsByTagName('c')) {
      const ref = c.getAttribute('r');
      if (!ref) continue;
      const st = c.getAttribute('s');
      if (st && fillOfStyle[Number(st)]) fills[ref] = fillOfStyle[Number(st)];
      const t = c.getAttribute('t');
      const vEl = c.getElementsByTagName('v')[0];
      let val = null;
      if (t === 'inlineStr') {
        val = Array.from(c.getElementsByTagName('t')).map((x) => x.textContent).join('');
      } else if (vEl) {
        const raw = vEl.textContent;
        if (t === 's') val = shared[Number(raw)];
        else if (t === 'str') val = raw;
        else if (t === 'b') val = raw === '1';
        else if (t === 'e') val = null;
        else val = Number(raw);
      }
      if (val === null || val === undefined || val === '') continue;
      const r = rowIndex(ref);
      (rows[r] = rows[r] || [])[colIndex(ref)] = val;
    }
    for (let i = 0; i < rows.length; i++) rows[i] = rows[i] ? Array.from(rows[i], (v) => (v === undefined ? null : v)) : [];
    sheets.push({ name, rows, fills });
  }
  return sheets;
}

// Couleur de fond (« #RRGGBB ») de chaque style de cellule, ou null. Gère les couleurs RVB, indexées et du thème (avec nuance).
const XL_INDEXED = ['000000','FFFFFF','FF0000','00FF00','0000FF','FFFF00','FF00FF','00FFFF','000000','FFFFFF','FF0000','00FF00','0000FF','FFFF00','FF00FF','00FFFF','800000','008000','000080','808000','800080','008080','C0C0C0','808080','9999FF','993366','FFFFCC','CCFFFF','660066','FF8080','0066CC','CCCCFF','000080','FF00FF','FFFF00','00FFFF','800080','800000','008080','0000FF','00CCFF','CCFFFF','CCFFCC','FFFF99','99CCFF','FF99CC','CC99FF','FFCC99','3366FF','33CCCC','99CC00','FFCC00','FF9900','FF6600','666699','969696','003366','339966','003300','333300','993300','993366','333399','333333'];
function tintHex(hex, tint) {
  if (!tint) return hex;
  const c = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const out = c.map((v) => Math.round(tint < 0 ? v * (1 + tint) : v + (255 - v) * tint));
  return out.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('').toUpperCase();
}
function readFills(stylesDoc, themeDoc) {
  const theme = [];
  const scheme = themeDoc.getElementsByTagName('a:clrScheme')[0] || themeDoc.getElementsByTagNameNS('*', 'clrScheme')[0];
  if (scheme) {
    const kids = Array.from(scheme.children);
    const val = (el) => { const x = el && el.children[0]; return x ? (x.getAttribute('lastClr') || x.getAttribute('val') || '') : ''; };
    const byName = {}; kids.forEach((k) => { byName[k.localName] = val(k); });
    // ordre des index de thème dans Excel : fond 1, texte 1, fond 2, texte 2, accents 1 à 6
    ['lt1', 'dk1', 'lt2', 'dk2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'].forEach((k) => theme.push(byName[k] || ''));
  }
  const colorOf = (el) => {
    if (!el) return null;
    let hex = null;
    if (el.getAttribute('rgb')) hex = el.getAttribute('rgb').slice(-6);
    else if (el.getAttribute('indexed') != null) hex = XL_INDEXED[Number(el.getAttribute('indexed'))] || null;
    else if (el.getAttribute('theme') != null) hex = theme[Number(el.getAttribute('theme'))] || null;
    if (!hex || !/^[0-9A-Fa-f]{6}$/.test(hex)) return null;
    return tintHex(hex.toUpperCase(), Number(el.getAttribute('tint') || 0));
  };
  const fills = Array.from(stylesDoc.getElementsByTagName('fill')).map((f) => {
    const pf = f.getElementsByTagName('patternFill')[0];
    if (!pf || pf.getAttribute('patternType') !== 'solid') return null;
    const hex = colorOf(pf.getElementsByTagName('fgColor')[0]);
    return hex ? '#' + hex : null;
  });
  const xfs = stylesDoc.getElementsByTagName('cellXfs')[0];
  if (!xfs) return [];
  return Array.from(xfs.getElementsByTagName('xf')).map((x) => fills[Number(x.getAttribute('fillId') || 0)] || null);
}

/* ============================================================
   2. Lecture des séances (texte libre du coach -> étapes)
   ============================================================ */
function parseLines(lines) {
  const steps = [];
  let pendingSets = null;
  const last = () => steps[steps.length - 1];
  const RE_Q = '["\']{1,2}';

  for (const raw of lines) {
    const l = norm(raw);
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
  for (const r of R) for (const c of r) if (typeof c === 'string' && /MARATHON DE/i.test(c) && c.length < 60) { title = c; break; }
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
    title: sommaire.title || 'MARATHON DE LILLE 2026',
    source: sourceName || '', importedAt: new Date().toISOString(),
    vma: sommaire.vma, levels: sommaire.levels, refs: sommaire.refs, vmaTable,
    raceDate, weeks,
  } : null;
  return { ok, errors, warnings, checks, review, plan };
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
// « MARATHON DE LILLE 2026 » -> « Marathon de Lille »
function raceLabel(plan) {
  const t = String((plan && plan.title) || '').replace(/\b(19|20)\d{2}\b/g, '').replace(/\s+/g, ' ').trim();
  if (!t) return 'Course';
  const low = t.toLowerCase();
  return low.charAt(0).toUpperCase() + low.slice(1).replace(/\b(lille|paris|rennes|nantes|lyon|nice|bordeaux|toulouse|strasbourg|marseille|annecy|montpellier|la rochelle|saint-malo)\b/g, (m) => m.replace(/(^|[ -])(\w)/g, (x, a, b) => a + b.toUpperCase()));
}

/* ============================================================
   6. Allures
   ============================================================ */
function paceSecPerKm(vma, pct) { return 3600 / (vma * pct / 100); }
function fmtPace(sec) {
  let m = Math.floor(sec / 60), s = Math.round(sec - m * 60);
  if (s === 60) { m++; s = 0; }
  return m + "'" + pad2(s) + '"';
}
function fmtMS(sec) {
  let s = Math.round(sec);
  const m = Math.floor(s / 60);
  s -= m * 60;
  return m + "'" + pad2(s) + '"';
}
function fmtHMS(sec) {
  let s = Math.round(sec);
  const h = Math.floor(s / 3600);
  s -= h * 3600;
  const m = Math.floor(s / 60);
  s -= m * 60;
  if (!h) return m + "'" + pad2(s) + '"';
  return h + 'h' + pad2(m) + "'" + pad2(s) + '"';
}
function fmtMin(min) {
  if (min == null) return '';
  const h = Math.floor(min / 60), m = min % 60;
  return h ? h + 'h' + pad2(m) : m + ' min';
}
function fmtKm(km) { return (Math.round(km * 10) / 10).toString().replace('.', ',') + ' km'; }
function fmtVma(v) { return (Math.round(v * 10) / 10).toString().replace('.', ','); }

function parseTarget(str) {
  const s = norm(str).toLowerCase().replace(/"/g, '').replace(/,/g, '.');
  let m = /^(\d+)\s*(?:h|:)\s*(\d{1,2})(?:\s*(?:'|m|min|:)\s*(\d{1,2})?)?\s*(?:s)?$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]), mi = Number(m[2]), se = Number(m[3] || 0);
  if (mi > 59 || se > 59) return null;
  const total = h * 3600 + mi * 60 + se;
  return total >= 1.5 * 3600 && total <= 7 * 3600 ? total : null;
}
// Chrono de course : 3h25'00, 3h25, 3:25:00, 45'30, 45:30. Renvoie des secondes (entre 5 min et 8 h).
function parseChrono(str) {
  const s = norm(str || '').toLowerCase().replace(/"/g, '').replace(/\s+/g, '');
  let m = /^(\d{1,2})(?:h|:)(\d{1,2})(?:(?:'|m|min|:)(\d{1,2})?)?s?$/.exec(s);
  let t = null;
  if (m && (s.includes('h') || (s.match(/:/g) || []).length === 2)) {
    if (Number(m[2]) > 59 || Number(m[3] || 0) > 59) return null;
    t = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3] || 0);
  } else if ((m = /^(\d{1,3})(?:'|:|m|min)(\d{1,2})?s?$/.exec(s))) {
    if (Number(m[2] || 0) > 59) return null;
    t = Number(m[1]) * 60 + Number(m[2] || 0);
  }
  return t != null && t >= 300 && t <= 8 * 3600 ? t : null;
}
// Durée d'une sortie : 45, 45 min, 1h05, 1h, 1:05 (heures:minutes). Renvoie des minutes (1 à 900).
function parseDurationMin(str) {
  const s = norm(str || '').toLowerCase().replace(/\s+/g, '').replace(/minutes?|mn/g, 'min');
  let m, t = null;
  if ((m = /^(\d{1,3})(?:min|')?$/.exec(s))) t = Number(m[1]);
  else if ((m = /^(\d{1,2})(?:h|:)(\d{1,2})?(?:min|')?$/.exec(s))) { if (Number(m[2] || 0) > 59) return null; t = Number(m[1]) * 60 + Number(m[2] || 0); }
  return t != null && t >= 1 && t <= 900 ? t : null;
}
function parsePaceInput(str) {
  const s = norm(str).toLowerCase().replace(/"/g, '').replace(/\/\s*km|min\/km/g, '').replace(/,/g, '.').trim();
  const m = /^(\d{1,2})\s*(?:'|:|m|min)\s*(\d{1,2})?\s*(?:s)?$/.exec(s);
  if (!m) return null;
  const mi = Number(m[1]), se = Number(m[2] || 0);
  if (se > 59) return null;
  const p = mi * 60 + se;
  return p * 42.195 >= 1.5 * 3600 && p * 42.195 <= 7 * 3600 ? p : null;
}
function parseVmaInput(str) {
  const n = Number(norm(str).replace(',', '.').replace(/[^\d.]/g, ''));
  return n >= 8 && n <= 25 ? n : null;
}

const MARATHON_KM = 42.195;
function levelPct(plan, re, fallback) {
  const lv = ((plan && plan.levels) || []).find((l) => re.test(l.label.toLowerCase()));
  return lv ? lv.pct * 100 : fallback;
}
function makeSettings(plan) {
  const vma = plan.vma;
  const mar = plan.refs && plan.refs.find((r) => Math.abs(r.km - 42.195) < 0.5);
  let target = mar && mar.objSec ? Math.round(mar.objSec) : Math.round(paceSecPerKm(vma, levelPct(plan, /^marathon$/, 87.3)) * MARATHON_KM);
  return { vma, targetSec: target, targetMode: 'time', cautKm: 10, cautD: 3 };
}
function paceCtx(plan, settings) {
  return {
    vma: settings.vma,
    marathon: settings.targetSec / MARATHON_KM,
    semi: paceSecPerKm(settings.vma, levelPct(plan, /semi/, 92.8)),
    pct(p) { return paceSecPerKm(settings.vma, p); },
  };
}

/* Texte lisible d'une étape. Retourne { tone, title, sub[], review } */
function describeStep(st, ctx) {
  const out = { tone: 'easy', title: '', sub: [], review: !!st.review };
  const pctTxt = (p) => (p[0] === p[1] ? p[0] + ' %' : p[0] + '/' + p[1] + ' %');
  const paceRange = (p) => (p[0] === p[1] ? fmtPace(ctx.pct(p[0])) : fmtPace(ctx.pct(p[0])) + '–' + fmtPace(ctx.pct(p[1])));
  const timeRange = (d, p) => {
    const t = (pc) => (d / 1000) * ctx.pct(pc);
    return p[0] === p[1] ? fmtMS(t(p[0])) : fmtMS(t(p[1])) + '–' + fmtMS(t(p[0]));
  };
  const paceOf = (st2) => (st2.pace === 'marathon' ? ctx.marathon : st2.pace === 'semi' ? ctx.semi : null);
  const paceName = (st2) => (st2.pace === 'marathon' ? 'allure marathon' : 'allure semi');
  const rec = () => { if (st.rec && st.rec.length) out.sub.push('Récup ' + st.rec.join(' · ')); };
  const dist = (m) => (m >= 1000 ? (m / 1000).toString().replace('.', ',') + ' km' : m + ' m');

  switch (st.k) {
    case 'warmup':
      out.title = 'Échauffement';
      out.sub.push(st.minMax ? st.min + "–" + st.minMax + ' min' : st.min + ' min');
      if (st.pct) out.sub.push(pctTxt(st.pct) + ' VMA');
      break;
    case 'drills': out.title = 'Éducatifs et accélérations'; break;
    case 'cooldown': out.title = 'Retour au calme'; out.sub.push(st.min ? st.min + ' min' : ''); break;
    case 'steady': {
      let p = null;
      if (st.pace) { p = paceOf(st); out.title = fmtMin(st.min) + ' · ' + paceName(st); out.tone = 'mp'; }
      else {
        p = ctx.pct((st.pct[0] + st.pct[1]) / 2);
        out.title = fmtMin(st.min) + ' · ' + pctTxt(st.pct) + ' VMA';
        out.tone = st.pct[0] <= 75 ? 'steady' : 'tempo';
      }
      out.sub.push(fmtPace(p) + '/km · ≈ ' + fmtKm((st.min * 60) / p));
      rec();
      break;
    }
    case 'reps': {
      const head = (st.sets > 1 ? st.sets + ' × (' : '') + st.n + ' × ' + dist(st.dist) + (st.sets > 1 ? ')' : '');
      out.title = head;
      if (st.pct) {
        out.tone = st.pct[0] >= 90 ? 'fast' : 'tempo';
        out.sub.push(pctTxt(st.pct) + ' VMA · ' + timeRange(st.dist, st.pct) + ' par ' + dist(st.dist));
      } else if (st.pace) {
        out.tone = 'mp';
        const p = paceOf(st);
        out.sub.push(paceName(st) + ' · ' + fmtPace(p) + '/km · ' + fmtMS((st.dist / 1000) * p) + ' par ' + dist(st.dist));
        if (st.km) out.sub.push(fmtKm(st.km) + ' au total');
      } else { out.tone = 'tempo'; out.sub.push('allure à préciser'); out.review = true; }
      rec();
      break;
    }
    case 'combo':
      out.title = (st.sets > 1 ? st.sets + ' séries de ' : '') + st.n + ' × (' + dist(st.dists[0]) + ' + ' + dist(st.dists[1]) + ')';
      out.tone = 'fast';
      out.sub.push(pctTxt(st.pct) + ' VMA · ' + timeRange(st.dists[0], st.pct) + ' puis ' + timeRange(st.dists[1], st.pct));
      rec();
      break;
    case 'timed':
      out.title = st.sets + ' × (' + st.n + ' × ' + st.on + '"/' + st.off + '")';
      out.tone = 'fast';
      out.sub.push(pctTxt(st.pct) + ' VMA · ' + paceRange(st.pct) + '/km');
      rec();
      break;
    case 'tempo': {
      const mins = st.mins;
      out.title = st.blocks ? mins.join("' / ") + "'" : st.n + ' × ' + mins[0] + ' min';
      out.tone = 'tempo';
      const p = st.pace === 'semi' ? ctx.semi : null;
      out.sub.push(p ? 'allure semi · ' + fmtPace(p) + '/km' : 'effort seuil');
      rec();
      break;
    }
    case 'blocks': {
      out.title = st.dists.map(dist).join(' + ');
      out.tone = 'mp';
      const p = paceOf(st);
      if (p) out.sub.push(paceName(st) + ' · ' + fmtPace(p) + '/km · ' + fmtKm(st.km) + ' ≈ ' + fmtHMS(st.km * p));
      else { out.sub.push(fmtKm(st.km) + ' · allure à préciser'); out.review = true; }
      rec();
      break;
    }
    case 'dist': {
      out.title = fmtKm(st.km) + ' · allure marathon' + (st.plus ? ' ' + st.plus : '');
      out.tone = 'mp';
      out.sub.push(fmtPace(ctx.marathon) + '/km · ≈ ' + fmtHMS(st.km * ctx.marathon));
      if (st.note) out.sub.push(st.note.replace(/[()]/g, ''));
      break;
    }
    case 'recovery': out.title = 'Récupération ' + st.text; out.tone = 'rest'; break;
    case 'strides': out.title = st.n + ' lignes droites souples'; out.tone = 'easy'; break;
    case 'event': out.title = st.label; out.tone = 'event'; break;
    case 'race':
      out.title = 'Marathon de Lille'; out.tone = 'race';
      out.sub.push(fmtHMS(ctx.marathon * MARATHON_KM) + ' · ' + fmtPace(ctx.marathon) + '/km');
      break;
    case 'text': out.title = st.raw; out.tone = 'fast'; out.sub.push('texte du coach'); break;
    default: out.title = st.raw; out.tone = 'raw'; out.review = true; out.sub.push('à vérifier');
  }
  out.sub = out.sub.filter(Boolean);
  return out;
}

if (typeof module !== 'undefined') {
  module.exports = {
    buildPlan, parseLines, parseWeekSheet, parseSommaire, parseVmaSheet, describeStep, makeSettings, paceCtx,
    paceSecPerKm, fmtPace, fmtHMS, fmtMS, fmtMin, parseTarget, parsePaceInput, parseVmaInput, addDays, diffDays, readXlsx, norm,
    planRange, mondayOf, shiftPlanToRace, shiftPlan, raceLabel, parseChrono, parseDurationMin,
  };
}
