/* Noyau, 2/4 : lecture d'un .xlsx, valeurs et couleurs de cellules */

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
