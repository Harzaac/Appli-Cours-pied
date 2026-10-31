/* ============================================================
   Actions
   ============================================================ */
async function importFile(file) {
  S.imp = { stage: 'loading' };
  render();
  try {
    const buf = await file.arrayBuffer();
    const sheets = await readXlsx(buf);
    S.imp = { stage: 'review', res: buildPlan(sheets, file.name), fileName: file.name };
  } catch (e) {
    S.imp = { stage: 'error', message: (e && e.message) || "Le fichier est illisible." };
  }
  render();
}
function nextPlanId() {
  let n = 0;
  S.plans.forEach((e) => { const m = /^p(\d+)/.exec(e.id); if (m) n = Math.max(n, Number(m[1])); });
  return 'p' + (n + 1);
}
function usePlan(replaceId) {
  const res = S.imp.res;
  const sh = res.plan.raceDate ? shiftPlanToRace(res.plan, S.imp.raceDate || defaultRaceDate(res.plan)).plan : res.plan;
  const cur = curEntry();
  let target = replaceId ? entryOf(replaceId) : null;
  if (target) {
    // mise à jour : on garde réglages, suivi et déplacements ; seuls les déplacements hors du nouveau plan sont retirés
    const oldDates = {};
    target.plan.weeks.forEach((w) => w.days.forEach((d) => { oldDates[d.date] = true; }));
    const newDates = {};
    sh.weeks.forEach((w) => w.days.forEach((d) => { newDates[d.date] = true; }));
    Object.keys(S.moves).forEach((k) => { if (oldDates[k] && !newDates[k]) delete S.moves[k]; });
    if (target.id === S.activeId) S.plan = sh;
    target.plan = sh;
    activate(target.id);
  } else {
    const settings = makeSettings(sh);
    const src = cur ? cur.settings : S.profile;
    ['fitTol', 'rav', 'cautKm', 'cautD', 'targetMode'].forEach((k) => { if (src[k] != null) settings[k] = src[k]; });
    if (S.imp.keep) { settings.vma = src.vma; settings.targetSec = src.targetSec; }
    target = { id: nextPlanId(), plan: sh, settings };
    S.plans.push(target);
    activate(target.id);
  }
  S.ui.view = 'plan';
  S.ui.weekId = null; S.ui.monthKey = null;
  S.imp = { stage: 'idle' };
  rebuildIndex();
  const e = curEntry();
  S.ui.weekId = defaultWeekFor(e).key;
  S.ui.monthKey = (S.byDate[TODAY] && S.byDate[TODAY].entry === e ? TODAY : defaultWeekFor(e).start).slice(0, 7);
  S.ui.raceAutoDone = false; rebuildIndex();
  saveStore();
  render();
  fetchWeather();
}
function embeddedFromHtml(html) {
  const open = '<script type="application/json" id="embedded-data">';
  const i = html.indexOf(open);
  if (i < 0) return '';
  const j = html.indexOf('</script>', i);
  const raw = html.slice(i + open.length, j).trim();
  if (!raw) return '';
  try { const d = JSON.parse(raw); d.app = 'appli-marathon'; return JSON.stringify(d); } catch (e) { return ''; }
}
function restoreFrom(text) {
  try {
    const raw = JSON.parse(text);
    if (!raw || raw.app !== 'appli-marathon') throw new Error('format');
    const d = normalizeData(raw);
    const hasLogs = d.logs && typeof d.logs === 'object' && Object.keys(d.logs).length;
    const hasRaces = Array.isArray(d.races) && d.races.length;
    if (!d.plans.length && !hasLogs && !hasRaces) throw new Error('format');
    S.races = hasRaces ? d.races : [];
    S.edits = d.edits && typeof d.edits === 'object' ? d.edits : {};
    S.plans = d.plans;
    S.activeId = null; S.plan = null; S.settings = null;
    S.tracking = d.tracking || {};
    S.moves = d.moves || {};
    S.logs = hasLogs ? d.logs : {};
    S.profile = d.profile && d.profile.vma ? d.profile : defaultProfile();
    S.weather = d.weather && typeof d.weather === 'object' ? d.weather : S.weather;
    S.crest = typeof d.crest === 'string' && d.crest.indexOf('data:image/') === 0 ? d.crest : '';
    if (ACCENTS.some((a) => a.id === d.accent)) S.ui.accent = d.accent;
    if (d.theme === 'light' || d.theme === 'dark' || d.theme === 'auto') S.ui.theme = d.theme;
    if (typeof d.lastCopy === 'string') S.lastCopy = d.lastCopy;
    if (S.plans.length) activate(entryOf(d.activeId) ? d.activeId : pickActive(S.plans)); else useProfile();
    S.ui.view = 'plan'; S.ui.weekId = null; S.ui.monthKey = null;
    S.msg = {};
    rebuildIndex(); saveStore(); render();
  } catch (e) {
    S.msg.restore = "Ce fichier ne contient pas de données de l'appli (une copie faite avant d'avoir chargé un plan est vide). Vérifie que tu as choisi la bonne copie ou sauvegarde.";
    S.msg.restoreErr = true;
    render();
  }
}
function setTrack(date, patch) {
  S.tracking[date] = Object.assign({}, S.tracking[date], patch);
  const t = S.tracking[date];
  if (!t.done && !t.skipped && !t.feel && !t.note && !t.result && !t.pr) delete S.tracking[date];
  saveStore();
}
function go(delta) {
  S.ui.moving = null;
  if (S.ui.mode === 'week') {
    const weeks = S.weeks;
    const i = weeks.findIndex((w) => w.key === S.ui.weekId) + delta;
    if (i >= 0 && i < weeks.length) { S.ui.weekId = weeks[i].key; syncActiveToWeek(); }
  } else {
    const keys = monthKeys();
    const i = keys.indexOf(S.ui.monthKey) + delta;
    if (i >= 0 && i < keys.length) S.ui.monthKey = keys[i];
  }
}
function goToday() {
  const ref = S.byDate[TODAY];
  const weeks = S.weeks;
  let w;
  if (ref) w = ref.week;
  else {
    const e = curEntry();
    w = e ? defaultWeekFor(e) : (TODAY < weeks[0].start ? weeks[0] : weeks[weeks.length - 1]);
  }
  S.ui.weekId = w.key; syncActiveToWeek();
  const mk = (ref ? TODAY : w.start).slice(0, 7);
  S.ui.monthKey = monthKeys().includes(mk) ? mk : monthKeys()[0];
}
function showPlan(id) {
  const e = entryOf(id);
  if (!e) return;
  activate(id);
  const w = defaultWeekFor(e);
  S.ui.weekId = w.key; S.ui.monthKey = w.start.slice(0, 7); S.ui.moving = null; S.ui.moveNote = null;
}
// Décale un plan déjà chargé vers une nouvelle date de course, avec le suivi et les déplacements de ses jours.
function redatePlan(id, newRace) {
  const e = entryOf(id);
  if (!e || !e.plan.raceDate) return 'Ce plan n\'a pas de date de course.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newRace || '')) return 'Choisis une date valide.';
  const sh = shiftPlanToRace(e.plan, newRace);
  if (!sh.delta) return '';
  const rg = planRange(sh.plan);
  const clash = S.plans.find((x) => x !== e && rangeOf(x).start <= rg.end && rangeOf(x).end >= rg.start);
  if (clash) return 'Avec cette date, le plan chevaucherait « ' + planName(clash) + ' ». Choisis une autre date.';
  const dates = [];
  e.plan.weeks.forEach((w) => w.days.forEach((d) => dates.push(d.date)));
  const tr = {}, mv = {};
  dates.forEach((d) => {
    if (S.tracking[d]) { tr[addDays(d, sh.delta)] = S.tracking[d]; delete S.tracking[d]; }
    if (S.moves[d]) { mv[addDays(d, sh.delta)] = addDays(S.moves[d], sh.delta); delete S.moves[d]; }
  });
  Object.assign(S.tracking, tr); Object.assign(S.moves, mv);
  e.plan = sh.plan;
  if (S.activeId === id) S.plan = sh.plan;
  activate(id);
  S.ui.weekId = null; S.ui.monthKey = null; S.ui.raceAutoDone = false;
  rebuildIndex();
  const w = defaultWeekFor(e); S.ui.weekId = w.key;
  saveStore();
  return '';
}
function deletePlan(id) {
  const e = entryOf(id);
  if (!e) return;
  const dates = {};
  e.plan.weeks.forEach((w) => w.days.forEach((d) => { dates[d.date] = true; }));
  Object.keys(S.tracking).forEach((k) => { if (dates[k]) delete S.tracking[k]; });
  Object.keys(S.moves).forEach((k) => { if (dates[k]) delete S.moves[k]; });
  S.plans = S.plans.filter((x) => x.id !== id);
  S.ui.confirmDel = null;
  if (!S.plans.length) {
    useProfile(); S.ui.view = 'plan'; S.ui.modal = null; S.imp = { stage: 'idle' }; S.ui.weekId = null; S.ui.monthKey = null;
    rebuildIndex(); saveStore(); render(); return;
  }
  if (S.activeId === id) { S.activeId = null; S.plan = null; S.settings = null; activate(pickActive(S.plans)); }
  S.ui.weekId = null; S.ui.monthKey = null;
  rebuildIndex(); saveStore(); render();
}
function exportFit() {
  const ref = S.byDate[S.ui.modal];
  if (!ref || ref.day.rest || ref.day.category === 'race') return;
  const { week, day } = ref;
  try {
    const wk = workoutFromDay(day, ctx(), fitTol());
    const lab = { footing: 'Footing', vma: 'VMA', spe: 'Spe marathon', long: 'Sortie longue', hills: 'Cotes' }[day.category] || 'Seance';
    const bytes = fitEncode(week.id + ' ' + DOW_SHORT[day.i] + parseISO(day.date).getUTCDate() + ' ' + lab, wk.flat, Date.now() / 1000);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
    a.download = fitFileName(week.id, day);
    document.body.appendChild(a); a.click(); a.remove();
    S.ui.fitInfo = true; S.msg.fitErr = false;
    S.msg.fit = 'Fichier « ' + fitFileName(week.id, day) + ' » créé (' + wk.flat.length + ' étapes). Si rien ne se télécharge, ouvre l\'appli depuis ton disque (pas depuis l\'aperçu dans Claude).' + (wk.unsupported.length ? ' À vérifier : ' + wk.unsupported.length + ' étape(s) exportée(s) en étape libre (texte du coach dans la montre).' : '');
  } catch (e) { S.msg.fitErr = true; S.msg.fit = "L'export a échoué : " + String((e && e.message) || e).slice(0, 80); }
  renderModal();
}
function searchCity(q, forRace) {
  S.msg.wx = 'Recherche…'; render();
  fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(q) + '&count=1&language=fr').then((r) => r.json()).then((j) => {
    const r = j.results && j.results[0];
    if (!r) { S.msg.wx = 'Ville introuvable : essaie un autre nom.'; render(); return; }
    const city = { lat: Math.round(r.latitude * 1000) / 1000, lon: Math.round(r.longitude * 1000) / 1000, name: r.name + (r.country_code ? ' (' + r.country_code + ')' : '') };
    if (forRace) { S.settings.raceCity = city; saveStore(); } else wxSet(city);
    S.msg.wx = ''; fetchWeather(true); render();
  }).catch(() => { S.msg.wx = 'Recherche impossible sans connexion.'; render(); });
}
// Recadre une image en carré et la réduit ; appelle done(dataUrl) ou fail().
function squareImage(file, size, done, fail) {
  if (!/^image\//.test(file.type)) { fail(); return; }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const side = Math.min(img.width, img.height);
      c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      done(c.toDataURL('image/jpeg', 0.85));
    } catch (e) { fail(); }
    URL.revokeObjectURL(url);
  };
  img.onerror = () => { URL.revokeObjectURL(url); fail(); };
  img.src = url;
}
function loadAvatar(file) {
  squareImage(file, 200, (data) => { S.profile.photo = data; S.ui.avMenu = false; S.msg.av = ''; saveStore(); toast('Photo de profil changée'); render(); },
    () => { S.msg.av = "Cette image n'a pas pu être lue. Choisis une photo JPG ou PNG."; render(); });
}
function loadCrest(file) {
  const fail = () => { S.msg.crest = "Cette image n'a pas pu être lue. Choisis une photo JPG ou PNG."; render(); };
  if (!/^image\//.test(file.type)) { fail(); return; }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    try {
      const size = 360, c = document.createElement('canvas');
      c.width = c.height = size;
      const side = Math.min(img.width, img.height);
      c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      S.crest = c.toDataURL('image/jpeg', 0.85);
      S.msg.crest = ''; S.ui.crestMenu = false; saveStore(); toast('Image du bandeau changée'); render();
    } catch (e) { fail(); }
    URL.revokeObjectURL(url);
  };
  img.onerror = () => { URL.revokeObjectURL(url); fail(); };
  img.src = url;
}
function copyText(text, onOk, onFail) {
  try { navigator.clipboard.writeText(text).then(onOk, onFail); } catch (e) { onFail(); }
}
