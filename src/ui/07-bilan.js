/* ----- Progression ----- */
/* ----- Bilan sur 12 mois : séances du plan cochées + sorties libres + course ----- */
function weekActivity(mon) {
  let min = 0, km = 0, n = 0;
  for (let k = 0; k < 7; k++) {
    const d = addDays(mon, k);
    const ref = S.byDate[d];
    const t = track(d);
    if (ref && ref.entry && !ref.day.rest && t.done) {
      n++;
      if (ref.day.category === 'race') { min += t.result ? t.result / 60 : 0; km += MARATHON_KM; } else min += ref.day.durationMin || 0;
    }
    logsOf(d).forEach((l) => { n++; min += l.min || 0; km += l.km || 0; });
    racesOn(d).forEach((r) => { if (r.result) { n++; min += r.result / 60; km += r.km; } });
  }
  return { mon, min: Math.round(min), km, n };
}
function yearBilanHTML() {
  const thisMon = mondayOf(TODAY);
  const dates = Object.keys(S.logs).concat(Object.keys(S.tracking).filter((d) => S.tracking[d].done)).sort();
  if (!dates.length) return `<section class="card stack"><div><h2>Sur 12 mois</h2><p class="sub">Rien à afficher pour l'instant : coche tes séances ou note une sortie depuis le calendrier, elles apparaîtront ici semaine par semaine.</p></div></section>`;
  const first = mondayOf(dates[0]);
  const from = addDays(thisMon, -51 * 7) > first ? addDays(thisMon, -51 * 7) : first;
  const weeks = [];
  for (let m = from; m <= thisMon; m = addDays(m, 7)) weeks.push(weekActivity(m));
  const max = Math.max(60, ...weeks.map((w) => w.min));
  const tot = weeks.reduce((a, w) => a + w.min, 0), totKm = weeks.reduce((a, w) => a + w.km, 0), totN = weeks.reduce((a, w) => a + w.n, 0);
  const last12 = weeks.slice(-12);
  const avg12 = last12.reduce((a, w) => a + w.min, 0) / last12.length;
  const best = weeks.reduce((a, w) => (w.min > a.min ? w : a), weeks[0]);
  const bars = weeks.map((w, k) => {
    const h = w.min ? Math.max(4, Math.round(w.min / max * 100)) : 0;
    const newMonth = k === 0 || w.mon.slice(5, 7) !== weeks[k - 1].mon.slice(5, 7);
    const label = 'Semaine du ' + frDate(w.mon) + ' : ' + (w.min ? fmtMin(w.min) : 'rien de noté') + (w.km ? ' · ' + (Math.round(w.km * 10) / 10).toString().replace('.', ',') + ' km' : '');
    return `<div class="ycol${w.mon === thisMon ? ' now' : ''}" title="${esc(label)}"><i style="height:${h}%"></i>${newMonth ? `<span class="ym">${MONTHS[Number(w.mon.slice(5, 7)) - 1].slice(0, 3)}</span>` : ''}</div>`;
  }).join('');
  return `<section class="card stack"><div><h2>${weeks.length >= 52 ? 'Sur 12 mois' : 'Depuis le ' + esc(frDate(weeks[0].mon))}</h2><p class="sub">Temps d'entraînement par semaine, tous plans confondus : séances cochées, sorties libres et courses.</p></div>
    <div class="kpis"><div class="kpi"><span class="v num">${fmtMin(tot) || '0 min'}</span><span class="l">${totN} séance${totN > 1 ? 's' : ''} et sorties</span></div>
      <div class="kpi"><span class="v num">${fmtMin(Math.round(avg12)) || '0 min'}</span><span class="l">par semaine, en moyenne sur ${last12.length > 1 ? 'les ' + last12.length + ' dernières semaines' : 'la semaine'}</span></div>
      <div class="kpi"><span class="v num">${fmtMin(best.min) || '–'}</span><span class="l">semaine la plus chargée${best.min ? ' (' + esc(frDate(best.mon)) + ')' : ''}</span></div>
      ${totKm ? `<div class="kpi"><span class="v num">${Math.round(totKm)} km</span><span class="l">notés (sorties avec distance et courses)</span></div>` : ''}</div>
    <div class="yearwrap"><div class="yearbars" style="min-width:${Math.max(0, weeks.length * 10)}px" role="img" aria-label="Temps d'entraînement par semaine sur la période">${bars}</div></div></section>`;
}
/* ----- Progression : où j'en suis, suivi du plan, mes courses, l'année ----- */
function pctDelta(cur, ref) {
  if (!ref) return '';
  const d = Math.round((cur - ref) / ref * 100);
  if (Math.abs(d) < 3) return '<span class="delta">stable</span>';
  return `<span class="delta ${d > 0 ? 'up' : 'down'}">${d > 0 ? '+' : ''}${d} %</span>`;
}
function nowHTML() {
  const thisMon = mondayOf(TODAY);
  const weeks = [];
  for (let k = 8; k >= 0; k--) weeks.push(weekActivity(addDays(thisMon, -7 * k)));
  // 0-3 : les 4 semaines d'avant ; 4-7 : les 4 dernières semaines ; 8 : la semaine en cours
  const cur = weeks[8], last4 = weeks.slice(4, 8), prev4 = weeks.slice(0, 4);
  const sum = (ws, k) => ws.reduce((a, w) => a + w[k], 0);
  const m4 = sum(last4, 'min'), mp = sum(prev4, 'min');
  const km4 = sum(last4, 'km'), n4 = sum(last4, 'n');
  const max = Math.max(60, ...weeks.slice(4).map((w) => w.min));
  const cols = weeks.slice(4).map((w) => `<div class="wk${w.mon === thisMon ? ' now' : ''}"><div class="wkbar" title="${esc('Semaine du ' + frDate(w.mon) + ' : ' + (fmtMin(w.min) || 'rien de noté'))}"><i style="height:${w.min ? Math.max(4, Math.round(w.min / max * 100)) : 0}%"></i></div><span class="num">${fmtMin(w.min) || '–'}</span><span class="wkl">${w.mon === thisMon ? 'cette sem.' : esc(frDate(w.mon).replace(/ (\S{3})\S*$/, ' $1.'))}</span></div>`).join('');
  return `<section class="card stack"><div><h2>Où j'en suis</h2><p class="sub">Les 4 dernières semaines et la semaine en cours : séances cochées, sorties libres et courses.</p></div>
    <div class="kpis">
      <div class="kpi"><span class="v num">${fmtMin(cur.min) || '0 min'}</span><span class="l">cette semaine · ${cur.n} sortie${cur.n > 1 ? 's' : ''}</span></div>
      <div class="kpi"><span class="v num">${fmtMin(Math.round(m4 / 4)) || '0 min'}</span><span class="l">par semaine sur 4 semaines ${pctDelta(m4, mp)}</span></div>
      <div class="kpi"><span class="v num">${n4}</span><span class="l">sorties en 4 semaines${km4 ? ' · ' + Math.round(km4) + ' km notés' : ''}</span></div>
    </div>
    <div class="weeks5">${cols}</div>
    <p class="sub">L'évolution compare les 4 dernières semaines aux 4 précédentes.</p></section>`;
}
function planFollowHTML() {
  if (!S.plan) return '';
  const e = curEntry();
  let nPast = 0, nDone = 0, nSkip = 0, pMin = 0, dMin = 0;
  const rows = S.plan.weeks.map((w) => {
    const sess = weekDays(w).filter((d) => !d.rest);
    const p = sess.reduce((a, d) => a + (d.durationMin || 0), 0);
    const dn = Math.round(sess.filter((d) => track(d.date).done).reduce((a, d) => a + (d.category === 'race' && track(d.date).result ? track(d.date).result / 60 : (d.durationMin || 0)), 0));
    sess.forEach((d) => { if (d.date <= TODAY) { nPast++; pMin += d.durationMin || 0; if (track(d.date).done) nDone++; if (track(d.date).skipped) nSkip++; } });
    dMin += dn;
    const pct = p ? Math.min(100, Math.round(dn / p * 100)) : 0;
    const future = w.start > TODAY;
    return `<div class="bar-row ${w.general ? 'gen' : ''}${future ? ' future' : ''}"><span class="num"><strong>${w.id.replace('G', ' G')}</strong></span>
      <div class="track" role="img" aria-label="${w.id} : ${fmtMin(dn) || '0 min'} faites sur ${fmtMin(p)}"><i style="width:${pct}%"></i></div><span class="num muted">${future ? 'à venir · ' + fmtMin(p) : (fmtMin(dn) || '0 min') + ' / ' + fmtMin(p)}</span></div>`;
  }).join('');
  const rate = nPast ? Math.round(nDone / nPast * 100) : null;
  const st = planState(e);
  return `<section class="card stack"><div><h2>Suivi du plan</h2><p class="sub">${esc(planName(e))} · ${esc(st)}${S.plans.length > 1 ? ' · change de plan avec le sélecteur en haut de page' : ''}.</p></div>
    <div class="kpis">
      <div class="kpi"><span class="v num">${rate == null ? '–' : rate + ' %'}</span><span class="l">${nPast ? nDone + (nDone > 1 ? ' séances faites' : ' séance faite') + ' sur ' + nPast + ' passées' : 'le plan n\'a pas commencé'}${nSkip ? ' · ' + nSkip + ' sautée' + (nSkip > 1 ? 's' : '') : ''}</span></div>
      <div class="kpi"><span class="v num">${fmtMin(dMin) || '0 min'}</span><span class="l">faites${pMin ? ' sur ' + fmtMin(pMin) + ' prévues à ce jour' : ''}</span></div>
    </div>
    <div class="bars">${rows}</div></section>`;
}
function racesHTML() {
  const list = S.plans.filter((e) => e.plan.raceDate).map((e) => { const t = track(e.plan.raceDate); return { name: planName(e), date: e.plan.raceDate, km: MARATHON_KM, result: t.result, pr: t.pr, tgt: e.settings && e.settings.targetSec }; })
    .concat(S.races.map((r) => ({ name: r.name, date: r.date, km: r.km, result: r.result, pr: r.pr, tgt: r.targetSec })))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const ref = S.profile && S.profile.ref;
  if (!list.length && !ref) return `<section class="card stack"><div><h2>Mes courses</h2><p class="sub">Tes courses et leurs chronos apparaîtront ici : ajoute un plan ou une course (Calendrier › Mes plans), puis saisis ton résultat le jour J.</p></div></section>`;
  const items = list.map((x) => {
    const past = x.date <= TODAY;
    const diff = x.result && x.tgt ? x.result - x.tgt : null;
    const near = PRED_DISTS.reduce((a, d) => (Math.abs(d.km - x.km) < Math.abs(a.km - x.km) ? d : a), PRED_DISTS[0]);
    const vmaEq = x.result ? (x.km / (x.result / 3600)) / ((near.lo + near.hi) / 200) : null;
    return `<li class="race${x.pr ? ' pr' : ''}"><div class="stack" style="gap:2px"><strong>${esc(x.name)}</strong><span class="sub">${esc(frDate(x.date, true))} · ${esc(raceKmLabel(x.km))}${x.tgt ? ' · objectif ' + esc(fmtHMS(x.tgt)) : ''}</span></div>
      <div class="raceres">${x.result ? `<span class="num big2">${esc(fmtHMS(x.result))}</span><span class="sub">${x.pr ? '<span class="badge ok">Record</span> ' : ''}${diff != null ? (diff <= 0 ? esc(fmtHMS(-diff)) + ' sous l\'objectif' : esc(fmtHMS(diff)) + ' au-dessus') + ' · ' : ''}VMA ≈ ${fmtVma(Math.round(vmaEq * 2) / 2)}</span>` : past ? `<button class="btn small" data-act="open" data-date="${x.date}">Saisir mon chrono</button>` : `<span class="sub">dans ${diffDays(x.date, TODAY)} jours</span>`}</div></li>`;
  }).join('');
  return `<section class="card stack"><div><h2>Mes courses</h2><p class="sub">Tes chronos, tes records, et la VMA qu'ils laissent supposer.</p></div>
    <ul class="races">${items}</ul>
    ${ref ? `<p class="sub">Course de référence des prédictions : ${esc(fmtHMS(ref.sec))} sur ${esc(raceKmLabel(ref.km))} (onglet VMA).</p>` : ''}</section>`;
}
function notesHTML() {
  const items = [];
  Object.keys(S.tracking).forEach((k) => { const t = S.tracking[k]; const ref = S.byDate[k]; if (ref && ref.entry && (t.note || t.feel)) items.push({ date: k, what: dayChipLabel(ref.day), feel: t.feel, note: t.note }); });
  Object.keys(S.logs).forEach((k) => S.logs[k].forEach((l) => { if (l.note || l.feel) items.push({ date: k, what: logLine(l), feel: l.feel, note: l.note }); }));
  items.sort((a, b) => (a.date < b.date ? 1 : -1));
  const feels = items.filter((x) => x.feel).slice(0, 10);
  const avg = feels.length ? feels.reduce((a, x) => a + x.feel, 0) / feels.length : null;
  return `<section class="card stack"><div><h2>Sensations et notes</h2><p class="sub">${avg == null ? 'Note tes sensations dans une séance ou une sortie : elles s\'afficheront ici.' : 'Moyenne des 10 dernières sensations : <strong>' + avg.toFixed(1).replace('.', ',') + ' / 5</strong> (' + FEELS[Math.round(avg) - 1].toLowerCase() + ').'}</p></div>
    ${items.length ? `<ul class="notes">${items.slice(0, 8).map((x) => `<li><div class="row between"><strong>${esc(frDate(x.date, true))} · ${esc(x.what)}</strong><span class="muted">${x.feel ? FEELS[x.feel - 1] : ''}</span></div>${x.note ? `<div class="sub">${esc(x.note)}</div>` : ''}</li>`).join('')}</ul>` : ''}</section>`;
}
function bilanView() {
  return `<div class="stack">
    <div class="grid2 top">${nowHTML()}${racesHTML()}</div>
    ${S.plan ? `<div class="grid2 top">${planFollowHTML()}${notesHTML()}</div>` : notesHTML()}
    ${yearBilanHTML()}
  </div>`;
}
