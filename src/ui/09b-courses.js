/* ----- Courses sans plan (10 km, semi, trail du club…) et plan de reprise ----- */
function racesOn(date) { return S.races.filter((r) => r.date === date); }
function raceKmLabel(km) {
  if (Math.abs(km - MARATHON_KM) < 0.01) return 'marathon';
  if (Math.abs(km - 21.0975) < 0.01) return 'semi';
  return String(Math.round(km * 100) / 100).replace('.', ',') + ' km';
}
function raceChip(r) { return `<span class="chip c-race">${esc(r.name)} · ${esc(raceKmLabel(r.km))}${r.result ? ' · ' + esc(fmtHMS(r.result)) : ''}</span>`; }
function nextRace() {
  const list = S.races.filter((r) => r.date >= TODAY).sort((a, b) => (a.date < b.date ? -1 : 1));
  return list[0] || null;
}
// Lundi proposé pour la reprise : celui qui suit la dernière course passée, au plus tôt cette semaine.
function recoveryMonday() {
  let last = '';
  S.plans.forEach((e) => { if (e.plan.raceDate && e.plan.raceDate <= TODAY && e.plan.raceDate > last) last = e.plan.raceDate; });
  S.races.forEach((r) => { if (r.date <= TODAY && r.date > last) last = r.date; });
  const m = last ? addDays(mondayOf(last), 7) : addDays(mondayOf(TODAY), 7);
  return m < mondayOf(TODAY) ? mondayOf(TODAY) : m;
}
function racesCardHTML() {
  const items = S.races.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).map((r) => `<li class="planitem"><div class="stack" style="gap:2px"><strong>${esc(r.name)}</strong>
      <span class="sub">${esc(frDate(r.date, true))} · ${esc(raceKmLabel(r.km))}${r.targetSec ? ' · objectif ' + esc(fmtHMS(r.targetSec)) : ''}${r.result ? ' · <strong>chrono ' + esc(fmtHMS(r.result)) + '</strong>' + (r.pr ? ' · record' : '') : ''}</span></div>
      <div class="row">${r.date <= TODAY ? `<button class="btn small" data-act="open" data-date="${r.date}">${r.result ? 'Modifier le chrono' : 'Saisir mon chrono'}</button>` : ''}<button class="btn small" data-act="racedel" data-id="${esc(r.id)}">Supprimer</button></div></li>`).join('');
  const kms = [[5, '5 km'], [10, '10 km'], [21.0975, 'Semi-marathon'], [MARATHON_KM, 'Marathon'], ['autre', 'Autre distance']];
  return `<section class="card stack" id="races-card"><div><h2>Courses sans plan</h2><p class="sub">Un 10 km, un semi ou un trail du club, sans plan d'entraînement à part. La course apparaît dans le calendrier, dans Progression, et ton chrono sert aux prédictions.</p></div>
    ${items ? `<ul class="planlist">${items}</ul>` : ''}
    <div class="logform stack"><strong>Ajouter une course</strong>
      <div class="fields"><div class="field"><label for="rc-name">Nom</label><input type="text" id="rc-name" placeholder="ex. 10 km de Rennes" autocomplete="off"></div>
        <div class="field"><label for="rc-date">Date</label><input type="date" id="rc-date" value="${esc(S.ui.raceDraft || '')}"></div></div>
      <div class="fields3"><div class="field"><label for="rc-km">Distance</label><select id="rc-km">${kms.map(([k, n]) => `<option value="${k}"${k === 10 ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="field"><label for="rc-other">Autre distance (km)</label><input type="text" id="rc-other" inputmode="decimal" placeholder="si « Autre »" autocomplete="off"></div>
        <div class="field"><label for="rc-target">Objectif (facultatif)</label><input type="text" id="rc-target" placeholder="ex. 42'30" autocomplete="off"></div></div>
      ${S.msg.race2 ? `<p class="errtxt" role="alert">${esc(S.msg.race2)}</p>` : ''}
      <div><button class="btn small primary" data-act="raceadd">${ICON.check}Ajouter la course</button></div></div></section>`;
}
function recoveryCardHTML() {
  return `<section class="card stack"><div><h2>Plan de reprise</h2><p class="sub">Trois semaines pour revenir en douceur après un marathon : footings courts au début, puis lignes droites, un fartlek léger et une sortie longue tranquille. C'est un modèle prudent : fais-le valider par ton coach.</p></div>
    <div class="fields"><div class="field"><label for="rec-date">Début de la reprise (lundi)</label><input type="date" id="rec-date" value="${esc(recoveryMonday())}"></div></div>
    ${S.msg.rec ? `<p class="errtxt" role="alert">${esc(S.msg.rec)}</p>` : ''}
    <div><button class="btn small primary" data-act="recadd">${ICON.check}Ajouter le plan de reprise</button></div></section>`;
}
function racesModalHTML(date) {
  return racesOn(date).map((r) => {
    const diff = r.result && r.targetSec ? r.result - r.targetSec : null;
    return `<div class="stack resultbox"><div style="font-weight:700">${esc(r.name)} · ${esc(raceKmLabel(r.km))}${r.targetSec ? ' · objectif ' + esc(fmtHMS(r.targetSec)) : ''}</div>
      <div class="fields"><div class="field"><label for="rres-${esc(r.id)}">Chrono officiel</label><input type="text" id="rres-${esc(r.id)}" value="${r.result ? esc(fmtHMS(r.result)) : ''}" placeholder="ex. 42'30" autocomplete="off"></div>
        <div class="field"><label>&nbsp;</label><label class="check"><input type="checkbox" id="rpr-${esc(r.id)}"${r.pr ? ' checked' : ''}> Record personnel</label></div></div>
      ${r.result ? `<p class="sub">${diff != null ? (diff <= 0 ? esc(fmtHMS(-diff)) + ' sous l\'objectif · ' : esc(fmtHMS(diff)) + ' au-dessus de l\'objectif · ') : ''}${esc(fmtPace(r.result / r.km))}/km de moyenne.</p>` : ''}</div>`;
  }).join('');
}
function addRace() {
  const g = (id) => ((document.getElementById(id) || {}).value || '').trim();
  const name = g('rc-name') || 'Course', date = g('rc-date'), kmSel = g('rc-km'), other = g('rc-other').replace(',', '.'), tgt = g('rc-target');
  const km = kmSel === 'autre' ? Number(other) : Number(kmSel);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { S.msg.race2 = 'Choisis la date de la course.'; return false; }
  if (!(km > 0 && km < 300)) { S.msg.race2 = 'Indique la distance en km (par exemple 15 ou 32,5).'; return false; }
  const targetSec = tgt ? parseChrono(tgt) : null;
  if (tgt && targetSec == null) { S.msg.race2 = "Objectif non compris : écris par exemple 42'30 ou 1h35'00."; return false; }
  S.races.push({ id: 'c' + Date.now().toString(36), name, date, km, targetSec: targetSec || null, result: 0, pr: false });
  S.msg.race2 = ''; S.ui.raceDraft = null;
  rebuildIndex(); saveStore();
  return true;
}
function addRecoveryPlan(dateIso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso || '')) return 'Choisis la date de début.';
  const base = S.settings || S.profile;
  const plan = buildRecoveryPlan(mondayOf(dateIso), base.vma, new Date().toISOString());
  const rg = planRange(plan);
  const clash = S.plans.find((x) => rangeOf(x).start <= rg.end && rangeOf(x).end >= rg.start);
  if (clash) return 'Ces trois semaines chevauchent « ' + planName(clash) + ' ». Choisis une autre date.';
  const settings = { vma: base.vma, targetSec: base.targetSec, targetMode: 'time', cautKm: 10, cautD: 3 };
  const e = { id: nextPlanId(), plan, settings };
  S.plans.push(e);
  activate(e.id);
  S.ui.weekId = null; S.ui.monthKey = null;
  rebuildIndex();
  S.ui.weekId = defaultWeekFor(e).key; S.ui.monthKey = defaultWeekFor(e).start.slice(0, 7);
  saveStore();
  return '';
}
