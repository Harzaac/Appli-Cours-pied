/* ----- Import ----- */
// Date proposée à l'import : celle du fichier si la course n'est pas passée, sinon la même course décalée d'années entières (même jour de la semaine).
function defaultRaceDate(plan) {
  const same = S.plans.find((e) => raceLabel(e.plan) === raceLabel(plan) && e.plan.raceDate && e.plan.raceDate >= TODAY);
  if (same) return same.plan.raceDate;
  let d = plan.raceDate;
  for (let k = 0; k < 10 && d < TODAY; k++) d = addDays(d, 364);
  return d;
}
function impPreview() {
  const r = S.imp.res;
  const want = S.imp.raceDate || defaultRaceDate(r.plan);
  const sh = shiftPlanToRace(r.plan, want || r.plan.raceDate);
  const rg = planRange(sh.plan);
  const conflicts = S.plans.filter((e) => rangeOf(e).start <= rg.end && rangeOf(e).end >= rg.start);
  // Un plan identique déjà chargé (même nom, mêmes dates) peut être mis à jour sans doublon.
  const twin = S.plans.find((e) => raceLabel(e.plan) === raceLabel(sh.plan) && e.plan.raceDate === sh.plan.raceDate) || null;
  const otherConf = conflicts.filter((e) => e !== twin);
  return { want, sh, rg, conflicts, twin, otherConf };
}
function importView() {
  const imp = S.imp;
  const cancel = '<button class="btn" data-act="impcancel">Annuler</button>';
  if (imp.stage === 'loading') return '<section class="card"><h2>Lecture du fichier…</h2></section>';
  if (imp.stage === 'error') {
    return `<section class="card stack"><h2>Ce fichier n'a pas pu être lu</h2><p class="errtxt" role="alert">${esc(imp.message)}</p><div class="row">${pickButton('Choisir un autre fichier')}${cancel}</div></section>`;
  }
  if (imp.stage === 'review') {
    const r = imp.res;
    const checks = r.checks.map((c) => `<li><span class="ic ${c.ok ? 'ok' : 'ko'}">${c.ok ? ICON.check : ICON.cross}</span><span>${esc(c.msg)}</span></li>`).join('');
    if (!r.ok) {
      return `<section class="card stack"><h2>Ce fichier n'est pas un plan du coach</h2><p class="sub">L'appli lit les plans Excel du coach Pierre (même présentation : onglets Sommaire, VMA et une grille par semaine). Voici ce qui a été vérifié dans « ${esc(imp.fileName)} ».</p>
        <ul class="checks">${checks}</ul>${r.errors.map((e) => `<p class="errtxt">${esc(e)}</p>`).join('')}<div class="row">${pickButton('Choisir un autre fichier')}${cancel}</div></section>`;
    }
    const nSess = r.plan.weeks.reduce((a, w) => a + w.days.filter((d) => !d.rest).length, 0);
    const pv = r.plan.raceDate ? impPreview() : null;
    const name = raceLabel(r.plan);
    let when = '';
    if (pv) {
      const sameDate = pv.want === pv.sh.plan.raceDate;
      when = `<div class="stack" style="gap:8px"><strong>Date de la course</strong>
        <div class="fields"><div class="field"><label for="imp-race">Quand as-tu ta course ?</label><input type="date" id="imp-race" value="${esc(pv.want)}"></div></div>
        <p class="sub">Le plan est calé sur cette date : il commence le <strong>${esc(frDate(pv.rg.start, true).toLowerCase())}</strong> et se termine le <strong>${esc(frDate(pv.rg.end, true).toLowerCase())}</strong>, avec la course le <strong>${esc(frDate(pv.sh.plan.raceDate, true).toLowerCase())}</strong> (${esc(String(parseISO(pv.sh.plan.raceDate).getUTCFullYear()))}).${sameDate ? '' : ' Dans le fichier du coach, la course est un ' + esc(DOW[weekdayIndex(r.plan.raceDate)].toLowerCase()) + ' : le plan garde cette organisation de semaine.'}</p>
        ${pv.otherConf.length ? `<p class="errtxt" role="alert">Ces dates se chevauchent avec « ${esc(planName(pv.otherConf[0]))} ». Choisis une autre date de course.</p>` : pv.twin ? `<p class="sub">Ce plan est déjà dans ton calendrier : tu peux le mettre à jour (ton suivi est conservé), ou changer la date de course pour l'ajouter une seconde fois.</p>` : ''}</div>`;
    }
    const canAdd = !pv || !pv.conflicts.length;
    const canRep = pv && pv.twin && !pv.otherConf.length;
    const keepBox = `<label class="check"><input type="checkbox" id="imp-keep"${imp.keep ? ' checked' : ''}> Garder ma VMA (${fmtVma((S.settings || S.profile).vma)} km/h) et mon objectif actuels pour ce plan, au lieu de ceux du fichier</label>`;
    return `<section class="card stack"><div><h2>Vérification du plan</h2><p class="sub">« ${esc(imp.fileName)} » est bien un plan du coach : ${esc(name)}, ${r.plan.weeks.length} semaines, ${nSess} séances${r.plan.raceDate ? ', course le ' + esc(frDate(r.plan.raceDate, true).toLowerCase()) + ' dans le fichier' : ''}.</p></div>
      ${when}
      <ul class="checks">${checks}</ul>
      ${r.warnings.length ? `<div class="stack" style="gap:6px"><strong>Écarts relevés dans le fichier</strong>${r.warnings.map((w) => `<p class="sub">${esc(w)}</p>`).join('')}</div>` : ''}
      ${r.review.length ? `<div class="stack" style="gap:6px"><strong>${r.review.length} ligne(s) que l'appli n'a pas pu interpréter</strong><p class="sub">Elles s'affichent telles quelles dans la séance, avec la mention « à vérifier ».</p>${r.review.map((x) => `<p class="sub"><span class="badge warn">${esc(x.week.replace('G', ' G'))}</span> ${esc(frDate(x.date, true))} : « ${esc(x.raw)} »</p>`).join('')}</div>` : '<p class="sub">Toutes les lignes de séance ont été comprises.</p>'}
      ${keepBox}
      <div class="row">${canAdd ? `<button class="btn primary" data-act="useplan">${S.plans.length ? 'Ajouter ce plan au calendrier' : 'Utiliser ce plan'}</button>` : ''}${canRep ? `<button class="btn${canAdd ? '' : ' primary'}" data-act="useplan" data-replace="${esc(pv.twin.id)}">Mettre à jour « ${esc(planName(pv.twin))} » (garde mon suivi)</button>` : ''}${pickButton('Choisir un autre fichier', true)}${cancel}</div></section>`;
  }
  return '';
}
function pickButton(label, small) {
  return `<span><input type="file" id="file-xlsx" accept=".xlsx" class="sr"><button class="btn ${small ? '' : 'primary'}" data-act="pickxlsx">${ICON.up}${label}</button></span>`;
}
