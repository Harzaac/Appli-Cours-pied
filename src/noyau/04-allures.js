/* Noyau, 4/4 : allures, VMA, chronos, description des étapes */

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
      out.title = 'Marathon'; out.tone = 'race';
      out.sub.push(fmtHMS(ctx.marathon * MARATHON_KM) + ' · ' + fmtPace(ctx.marathon) + '/km');
      break;
    case 'text': out.title = st.raw; out.tone = 'fast'; out.sub.push('texte du coach'); break;
    default: out.title = st.raw; out.tone = 'raw'; out.review = true; out.sub.push('à vérifier');
  }
  out.sub = out.sub.filter(Boolean);
  return out;
}
