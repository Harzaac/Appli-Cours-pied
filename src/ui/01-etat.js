/* ============================================================
   Appli course à pied — interface
   ============================================================ */
const KEY = 'appli-marathon-v1';
const ACCENTS = [{ id: 'ocean', name: 'Océan', a: '#1457C4', b: '#0B8467' }, { id: 'foret', name: 'Forêt', a: '#1D6A3A', b: '#45841F' }, { id: 'braise', name: 'Braise', a: '#C2490A', b: '#A32A1B' }, { id: 'aurore', name: 'Aurore', a: '#5B3CC4', b: '#B8336A' }, { id: 'lagon', name: 'Lagon', a: '#0B6E8A', b: '#0B8068' }];
const $app = document.getElementById('app');
// Copie du fichier tel qu'il est avant que l'appli ne s'affiche : sert à fabriquer « une copie avec mes données ».
const SRC_HTML = '<!doctype html>\n' + document.documentElement.outerHTML;

const ICON = {
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  cross: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7l10 10M17 7L7 17"/></svg>',
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v12M7 11l5 5 5-5M4 20h16"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  gauge: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 18a8 8 0 1 1 16 0M12 18l4-6"/></svg>',
};

/* ---------- état ---------- */
function todayISO() {
  if (window.__TODAY__) return window.__TODAY__;
  const d = new Date();
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}
const TODAY = todayISO();
function validPlan(p) {
  if (!p || p.app !== 'appli-marathon' || !Array.isArray(p.weeks) || !p.weeks.length || typeof p.vma !== 'number') return false;
  return p.weeks.every((w) => w && w.start && Array.isArray(w.days) && w.days.length === 7 && w.days.every((d) => d && d.date && Array.isArray(d.steps)));
}
// Accepte l'ancien format (un seul plan) et le nouveau (plusieurs plans).
function normalizeData(d) {
  if (!d || typeof d !== 'object') return {};
  let plans = Array.isArray(d.plans) ? d.plans.filter((e) => e && validPlan(e.plan)) : [];
  if (!plans.length && validPlan(d.plan)) plans = [{ id: 'p1', plan: d.plan, settings: d.settings || null }];
  const seen = {};
  plans.forEach((e, k) => {
    if (!e.id || seen[e.id]) e.id = 'p' + (k + 1) + (seen[e.id] ? 'b' : '');
    seen[e.id] = true;
    if (!e.settings || !e.settings.vma) e.settings = makeSettings(e.plan);
  });
  const out = Object.assign({}, d, { plans });
  if (!out.weather && plans[0] && plans[0].settings && plans[0].settings.weather) out.weather = plans[0].settings.weather;
  return out;
}
function loadStore() {
  try { const raw = localStorage.getItem(KEY); return raw ? normalizeData(JSON.parse(raw)) : null; } catch (e) { return null; }
}
function loadEmbedded() {
  try { const el = document.getElementById('embedded-data'); const t = el && el.textContent.trim(); return t ? normalizeData(JSON.parse(t)) : null; } catch (e) { return null; }
}
// Données du navigateur ou données contenues dans le fichier : on garde les plus récentes.
const saved = (() => {
  const a = loadStore(), b = loadEmbedded();
  if (!a) return b || {};
  if (!b || !b.plans.length) return a;
  return (b.savedAt || '') > (a.savedAt || '') ? b : a;
})();
function rangeOf(e) { return planRange(e.plan); }
// Plan affiché au départ : celui en cours, sinon le prochain à venir, sinon le plus récent.
function pickActive(plans) {
  if (!plans.length) return null;
  const cur = plans.find((e) => TODAY >= rangeOf(e).start && TODAY <= rangeOf(e).end);
  if (cur) return cur.id;
  const up = plans.filter((e) => rangeOf(e).start > TODAY).sort((a, b) => (rangeOf(a).start < rangeOf(b).start ? -1 : 1));
  if (up.length) return up[0].id;
  return plans.slice().sort((a, b) => (rangeOf(b).start < rangeOf(a).start ? -1 : 1))[0].id;
}
const S = {
  plans: saved.plans || [],
  activeId: null,
  plan: null,
  settings: null,
  tracking: saved.tracking || {},
  moves: saved.moves || {},
  logs: saved.logs && typeof saved.logs === 'object' ? saved.logs : {},
  races: Array.isArray(saved.races) ? saved.races : [],
  profile: null,
  weather: saved.weather && typeof saved.weather === 'object' ? saved.weather : null,
  crest: typeof saved.crest === 'string' ? saved.crest : '',
  ctaOff: saved.ctaOff === true || typeof saved.ctaOff === 'string' ? saved.ctaOff : false,
  remindUntil: typeof saved.remindUntil === 'string' ? saved.remindUntil : '',
  lastCopy: typeof saved.lastCopy === 'string' ? saved.lastCopy : '',
  wx: saved.wx && saved.wx.train && saved.wx.race ? saved.wx : null,
  wxState: {},
  ui: { theme: saved.theme || 'auto', accent: ACCENTS.some((a) => a.id === saved.accent) ? saved.accent : 'ocean', view: 'plan', mode: 'week', weekId: null, monthKey: null, modal: null, strategy: 'even', confirmWipe: false },
  imp: { stage: 'idle' },
  msg: {},
  byDate: {},
  weeks: [],
};
function entryOf(id) { return S.plans.find((e) => e.id === id) || null; }
function curEntry() { return entryOf(S.activeId); }
function activate(id) {
  const cur = curEntry();
  if (cur && S.settings && S.settings !== S.profile) cur.settings = S.settings;
  const e = entryOf(id);
  if (!e) return;
  S.activeId = id; S.plan = e.plan; S.settings = e.settings;
}
// Profil du coureur : VMA et objectif utilisés quand aucun plan n'est affiché, et repris à l'ajout d'un plan.
function defaultProfile() {
  const last = S.plans.slice().sort((a, b) => (rangeOf(a).start < rangeOf(b).start ? 1 : -1))[0];
  const base = last && last.settings ? last.settings : { vma: 15, targetSec: 4 * 3600 };
  return { vma: base.vma, targetSec: base.targetSec, targetMode: 'time', cautKm: 10, cautD: 3 };
}
S.profile = saved.profile && saved.profile.vma ? saved.profile : defaultProfile();
// Sans plan, les réglages affichés sont ceux du profil.
function useProfile() { S.activeId = null; S.plan = null; S.settings = S.profile; }
if (S.plans.length) activate(entryOf(saved.activeId) ? saved.activeId : pickActive(S.plans)); else useProfile();

function saveStore() {
  const cur = curEntry();
  if (cur) { cur.plan = S.plan; cur.settings = S.settings; }
  // le profil suit la dernière VMA saisie
  if (S.settings && S.settings !== S.profile && S.settings.vma) S.profile.vma = S.settings.vma;
  try { localStorage.setItem(KEY, JSON.stringify({ savedAt: new Date().toISOString(), profile: S.profile, logs: S.logs, races: S.races, plans: S.plans.map((e) => ({ id: e.id, plan: e.plan, settings: e.settings })), activeId: S.activeId, tracking: S.tracking, moves: S.moves, weather: S.weather, crest: S.crest, wx: S.wx, theme: S.ui.theme, accent: S.ui.accent, lastCopy: S.lastCopy, remindUntil: S.remindUntil, ctaOff: S.ctaOff })); } catch (e) { /* stockage indisponible */ }
}
function planName(e) {
  const y = (e.plan.raceDate || rangeOf(e).end).slice(0, 4);
  return raceLabel(e.plan) + ' ' + y;
}
function planState(e) {
  const r = rangeOf(e);
  if (TODAY < r.start) return 'à venir';
  if (e.plan.raceDate ? TODAY > e.plan.raceDate : TODAY > r.end) return 'terminé';
  return 'en cours';
}
function defaultWeekFor(e) {
  const ws = e.plan.weeks;
  const cur = ws.find((w) => TODAY >= w.start && TODAY <= w.end);
  return cur || (TODAY < ws[0].start ? ws[0] : ws[ws.length - 1]);
}

function rebuildIndex() {
  S.byDate = {}; S.weeks = [];
  const racing = S.plans.find((e) => e.plan.raceDate === TODAY);
  if (!S.ui.raceAutoDone && racing) { activate(racing.id); S.ui.raceMode = true; S.ui.raceAutoDone = true; }
  const real = [];
  for (const e of S.plans) {
    const orig = {};
    for (const w of e.plan.weeks) { w.key = e.id + ':' + w.id; w.planId = e.id; real.push(w); for (const d of w.days) orig[d.date] = d; }
    for (const w of e.plan.weeks) for (const d of w.days) {
      const sd = S.moves[d.date];
      const src = sd && sd !== d.date && w.days.some((x) => x.date === sd) ? orig[sd] : d;
      S.byDate[d.date] = { week: w, entry: e, day: src === d ? d : Object.assign({}, src, { date: d.date, i: d.i, from: src.date }) };
    }
  }
  real.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  // Semaines libres : le calendrier existe même sans plan. Il couvre les plans, la semaine en cours et au moins 12 semaines devant.
  const free = [];
  const thisMon = mondayOf(TODAY);
  const ahead = addDays(thisMon, 12 * 7);
  const firstMon = real.length && mondayOf(real[0].start) < thisMon ? mondayOf(real[0].start) : thisMon;
  const lastMon = real.length ? mondayOf(real.reduce((a, w) => (w.end > a ? w.end : a), real[0].end)) : thisMon;
  const stopMon = ahead > lastMon ? ahead : lastMon;
  for (let m = firstMon; m <= stopMon; m = addDays(m, 7)) {
    let covered = false;
    for (let k = 0; k < 7 && !covered; k++) if (S.byDate[addDays(m, k)]) covered = true;
    if (covered) continue;
    const fw = { key: 'free:' + m, id: '', free: true, start: m, end: addDays(m, 6), general: false, days: [] };
    for (let k = 0; k < 7; k++) {
      const date = addDays(m, k);
      const day = { i: k, dow: DOW[k], date, rest: true, free: true, category: 'rest', typeText: '', objective: '', lines: [], durationText: '', durationMin: null, steps: [] };
      fw.days.push(day);
      S.byDate[date] = { week: fw, entry: null, day };
    }
    free.push(fw);
  }
  S.weeks = real.concat(free).sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  const keys = S.weeks.map((w) => w.key);
  if (!S.ui.weekId || !keys.includes(S.ui.weekId)) {
    const ref = S.byDate[TODAY];
    const e = curEntry();
    S.ui.weekId = ref ? ref.week.key : (e ? defaultWeekFor(e).key : S.weeks[0].key);
    if (!e && ref) S.ui.weekId = ref.week.key;
  }
  const mks = monthKeys();
  const wk = weekByKey(S.ui.weekId);
  const mk = (S.ui.monthKey && mks.includes(S.ui.monthKey)) ? S.ui.monthKey : null;
  S.ui.monthKey = mk || (mks.includes(TODAY.slice(0, 7)) ? TODAY.slice(0, 7) : (wk || S.weeks[0]).start.slice(0, 7));
  syncActiveToWeek();
}
function weekByKey(k) { return S.weeks.find((w) => w.key === k) || null; }
// Le plan affiché suit la semaine affichée : les allures et le suivi restent ceux du bon plan.
function syncActiveToWeek() {
  const w = weekByKey(S.ui.weekId);
  if (w && !w.free && w.planId && w.planId !== S.activeId) activate(w.planId);
}
function monthKeys() {
  const keys = [];
  if (!S.weeks.length) return keys;
  const first = S.weeks[0].start, last = S.weeks[S.weeks.length - 1].end;
  let [y, m] = first.split('-').map(Number);
  const [ly, lm] = last.split('-').map(Number);
  while (y < ly || (y === ly && m <= lm)) { keys.push(y + '-' + pad2(m)); m++; if (m > 12) { m = 1; y++; } }
  return keys;
}
function ctx(e) { return e ? paceCtx(e.plan, e.id === S.activeId ? S.settings : e.settings) : paceCtx(S.plan, S.settings); }
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function frDate(iso, withDow) {
  const d = parseISO(iso);
  return (withDow ? DOW[(d.getUTCDay() + 6) % 7] + ' ' : '') + d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()];
}
function dayChipLabel(day) { return day.category === 'race' ? 'Marathon' : (day.typeText || 'Séance'); }
function dayDuration(day) { return day.durationMin != null ? fmtMin(day.durationMin) : (day.category === 'race' ? 'Course' : ''); }
function weekDays(w) { return w.days.map((d) => S.byDate[d.date].day); }
function raceNameOf(e) { return raceLabel((e || curEntry() || {}).plan || {}); }
function track(date) { return S.tracking[date] || {}; }
function logsOf(date) { return (S.logs[date] || []).slice(); }
const LOG_TYPES = [['footing', 'Footing'], ['fractionne', 'Fractionné'], ['long', 'Sortie longue'], ['course', 'Course'], ['trail', 'Trail'], ['velo', 'Vélo'], ['natation', 'Natation'], ['renfo', 'Renforcement'], ['autre', 'Autre']];
function logTypeLabel(t) { const x = LOG_TYPES.find((y) => y[0] === t); return x ? x[1] : 'Sortie'; }
function logLine(l) { return [logTypeLabel(l.type), l.min ? fmtMin(l.min) : '', l.km ? String(l.km).replace('.', ',') + ' km' : ''].filter(Boolean).join(' · '); }
// Dernier chrono de course saisi, tous plans confondus.
function lastRaceResult() {
  let best = null;
  S.plans.forEach((e) => {
    const d = e.plan.raceDate;
    const t = d && S.tracking[d];
    if (t && t.result && (!best || d > best.date)) best = { date: d, sec: t.result, km: MARATHON_KM, pr: !!t.pr, name: planName(e), target: e.settings && e.settings.targetSec };
  });
  S.races.forEach((r) => { if (r.result && r.date <= TODAY && (!best || r.date > best.date)) best = { date: r.date, sec: r.result, km: r.km, pr: !!r.pr, name: r.name, target: r.targetSec }; });
  return best;
}
