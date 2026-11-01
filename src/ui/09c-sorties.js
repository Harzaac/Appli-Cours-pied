/* ============================================================
   Sorties importées (Strava aujourd'hui, synchro automatique demain)
   Un fichier { app: 'appli-marathon', kind: 'sorties', activities: [...] } s'ajoute aux données
   sans rien remplacer. Chaque activité garde son numéro (sid) : un second import ne crée pas de doublon.
   - une course à pied un jour de séance du plan coche la séance et garde le réalisé (tracking.act) ;
   - une course (tag Course sur Strava) devient le résultat du plan ce jour-là, sinon une course sans plan
     (qui coche aussi la séance prévue ce jour-là ; elle n'est comptée qu'une fois dans les bilans) ;
   - le reste devient une sortie libre.
   ============================================================ */
function isSortiesFile(raw) { return !!(raw && raw.app === 'appli-marathon' && raw.kind === 'sorties' && Array.isArray(raw.activities)); }

function knownSids() {
  const s = new Set();
  Object.keys(S.tracking).forEach((d) => { const a = S.tracking[d].act; if (a && a.sid) s.add(a.sid); });
  Object.keys(S.logs).forEach((d) => S.logs[d].forEach((l) => { if (l.sid) s.add(l.sid); }));
  S.races.forEach((r) => { if (r.sid) s.add(r.sid); });
  return s;
}
function actInfo(a) {
  return { sid: a.sid, src: 'Strava', time: a.time || '', title: a.title || '', note: a.note || '', km: a.km || null, sec: a.sec || 0, elapsed: a.elapsed || 0, dplus: a.dplus || null };
}
function plannedDay(date) {
  const ref = S.byDate[date];
  return ref && ref.entry && !ref.day.free && !ref.day.rest ? ref.day : null;
}

function importSorties(raw) {
  const seen = knownSids();
  const acts = raw.activities.filter((a) => a && a.sid && /^\d{4}-\d{2}-\d{2}$/.test(a.date || '') && !seen.has(String(a.sid)));
  const res = { total: raw.activities.length, added: 0, done: 0, races: 0, logs: 0, until: '' };
  const byDate = {};
  acts.forEach((a) => { a.sid = String(a.sid); (byDate[a.date] = byDate[a.date] || []).push(a); });
  Object.keys(byDate).sort().forEach((date) => {
    const list = byDate[date].slice().sort((x, y) => (y.km || 0) - (x.km || 0));
    const day = plannedDay(date);
    const used = new Set();
    // 1. courses
    list.filter((a) => a.race).forEach((a) => {
      if (day && day.category === 'race' && !track(date).act) {
        const t = track(date);
        S.tracking[date] = Object.assign({}, t, { done: true, result: t.result || a.elapsed || a.sec, act: actInfo(a) });
        res.done++;
      } else {
        const km = a.raceKm || a.km;
        const same = S.races.find((r) => r.date === date && Math.abs(r.km - km) / km < 0.05);
        if (same) { if (!same.result) same.result = a.elapsed || a.sec; same.sid = a.sid; }
        else S.races.push({ id: 'c' + a.sid, sid: a.sid, name: a.title || (raceKmLabel(km) === 'semi' ? 'Semi-marathon' : raceKmLabel(km) === 'marathon' ? 'Marathon' : raceKmLabel(km)) + (a.where ? ' · ' + a.where : ''), date, km, targetSec: null, result: a.elapsed || a.sec, pr: false, url: '' });
        // course courue à la place d'une séance du plan (un semi en allure marathon, par exemple) : elle coche aussi la séance
        if (day && !track(date).act) { S.tracking[date] = Object.assign({}, track(date), { done: true, act: actInfo(a) }); delete S.tracking[date].skipped; res.done++; }
      }
      res.races++; used.add(a.sid);
    });
    // 2. la plus longue course à pied coche la séance prévue
    if (day && day.category !== 'race' && !track(date).act) {
      const main = list.find((a) => a.run && !used.has(a.sid));
      if (main) {
        S.tracking[date] = Object.assign({}, track(date), { done: true, act: actInfo(main) });
        delete S.tracking[date].skipped;
        used.add(main.sid); res.done++;
      }
    }
    // 3. le reste : sorties libres
    list.filter((a) => !used.has(a.sid)).forEach((a) => {
      const l = Object.assign({ id: 's' + a.sid, type: LOG_TYPES.some((t) => t[0] === a.type) ? a.type : 'autre', min: a.sec ? Math.round(a.sec / 60) : null, feel: 0 }, actInfo(a));
      (S.logs[date] = S.logs[date] || []).push(l);
      res.logs++;
    });
    res.added += list.length;
    if (date > res.until) res.until = date;
  });
  if (res.until && (!S.profile.sortiesUntil || res.until > S.profile.sortiesUntil)) S.profile.sortiesUntil = res.until;
  rebuildIndex(); saveStore();
  return res;
}
function sortiesMsg(r) {
  if (!r.added) return 'Rien de nouveau : ces ' + r.total + ' sorties sont déjà dans l\'appli.';
  const parts = [r.done + ' séance' + (r.done > 1 ? 's' : '') + ' du plan cochée' + (r.done > 1 ? 's' : ''), r.logs + ' sortie' + (r.logs > 1 ? 's' : '') + ' libre' + (r.logs > 1 ? 's' : '')];
  if (r.races) parts.push(r.races + ' course' + (r.races > 1 ? 's' : ''));
  return r.added + ' sortie' + (r.added > 1 ? 's' : '') + ' ajoutée' + (r.added > 1 ? 's' : '') + ' : ' + parts.join(', ') + '.' + (r.total > r.added ? ' ' + (r.total - r.added) + ' déjà présente' + (r.total - r.added > 1 ? 's' : '') + ', ignorée' + (r.total - r.added > 1 ? 's' : '') + '.' : '');
}
function sortiesFromText(text) {
  let raw;
  try { raw = JSON.parse(text); } catch (e) { raw = null; }
  if (!isSortiesFile(raw)) { S.msg.sorties = 'Ce fichier ne contient pas de sorties pour l\'appli.'; S.msg.sortiesErr = true; render(); return; }
  const seen = knownSids();
  if (!raw.activities.some((a) => a && a.sid && !seen.has(String(a.sid)))) { S.msg.sorties = sortiesMsg({ added: 0, total: raw.activities.length }); S.msg.sortiesErr = false; render(); return; }
  withUndo('Sorties ajoutées', () => { const r = importSorties(raw); S.msg.sorties = sortiesMsg(r); S.msg.sortiesErr = false; render(); });
}

/* ----- affichage du réalisé ----- */
// « 24,1 km · 2h02 · 5'04"/km · D+ 50 m »
function actLine(a) {
  const pace = a.km && a.sec ? fmtPace(a.sec / a.km) + '/km' : '';
  return [a.km ? String(Math.round(a.km * 10) / 10).replace('.', ',') + ' km' : '', a.sec ? fmtMin(Math.round(a.sec / 60)) : '', pace, a.dplus ? 'D+ ' + a.dplus + ' m' : ''].filter(Boolean).join(' · ');
}
function actHTML(a) {
  return `<div class="actbox stack" style="gap:4px"><div class="row between"><strong>Réalisé</strong><span class="sub">${esc(a.src || 'Import')}${a.time ? ' · ' + esc(a.time.replace(':', 'h')) : ''}</span></div>
    <div class="num">${esc(actLine(a))}</div>${a.title ? `<div>${esc(a.title)}</div>` : ''}${a.note ? `<div class="sub prewrap">${esc(a.note)}</div>` : ''}</div>`;
}
function sortiesCardHTML() {
  return `<section class="card stack"><div><h2>Sorties de la montre</h2><p class="sub">Une course à pied un jour de séance coche la séance avec le réalisé ; les autres deviennent des sorties libres. Rien n'est remplacé, et une sortie déjà importée n'est jamais ajoutée en double.</p></div>
    ${stravaBlockHTML()}
    <p class="sub">${stravaBlockHTML() ? 'Ou à partir d\'un fichier' : 'Ajoute-les à partir d\'un fichier'} de sorties (.json, préparé depuis Strava) :</p>
    <div class="row"><input type="file" id="file-sorties" accept=".json,application/json" class="sr"><button class="btn" data-act="picksorties">${ICON.up}Ajouter des sorties</button>${S.profile.sortiesUntil ? `<span class="sub">Sorties importées jusqu'au ${esc(frDate(S.profile.sortiesUntil))} ${esc(S.profile.sortiesUntil.slice(0, 4))}</span>` : ''}</div>
    ${S.msg.sorties ? `<p class="${S.msg.sortiesErr ? 'errtxt' : 'sub'}" role="status">${esc(S.msg.sorties)}</p>` : ''}</section>`;
}
