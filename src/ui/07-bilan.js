/* ----- Bilan ----- */
function planBilanHTML() {
  const weeks = S.plan.weeks;
  const planLine = S.plans.length > 1 ? `<p class="sub">Bilan du plan « ${esc(planName(curEntry()))} ». Change de plan avec le sélecteur en haut de page.</p>` : '';
  let totalP = 0, totalD = 0, nS = 0, nD = 0, nSk = 0;
  const rows = weeks.map((w) => {
    const sess = weekDays(w).filter((d) => !d.rest);
    nSk += sess.filter((d) => track(d.date).skipped).length;
    const p = sess.reduce((a, d) => a + (d.durationMin || 0), 0);
    const dn = Math.round(sess.filter((d) => track(d.date).done).reduce((a, d) => a + (d.category === 'race' && track(d.date).result ? track(d.date).result / 60 : (d.durationMin || 0)), 0));
    totalP += p; totalD += dn; nS += sess.length; nD += sess.filter((d) => track(d.date).done).length;
    const pct = p ? Math.min(100, Math.round(dn / p * 100)) : 0;
    return `<div class="bar-row ${w.general ? 'gen' : ''}"><span class="num"><strong>${w.id.replace('G', ' G')}</strong></span>
      <div class="track" role="img" aria-label="${w.id} : ${fmtMin(dn)} faites sur ${fmtMin(p)}"><i style="width:${pct}%"></i></div><span class="num muted">${fmtMin(dn) || '0 min'} / ${fmtMin(p)}</span></div>`;
  }).join('');
  const feels = Object.keys(S.tracking).filter((k) => S.tracking[k].feel && S.byDate[k]);
  const avg = feels.length ? feels.reduce((a, k) => a + S.tracking[k].feel, 0) / feels.length : null;
  const notes = Object.keys(S.tracking).filter((k) => S.byDate[k] && (S.tracking[k].note || S.tracking[k].feel)).sort().reverse().slice(0, 8);
  return `<div class="grid2">
    <section class="card stack"><div><h2>Volume prévu et réalisé</h2><p class="sub">Les séances comptent quand tu les marques comme faites.</p>${planLine}</div>
      <div class="kpis"><div class="kpi"><span class="v num">${nD}/${nS}</span><span class="l">séances faites${nSk ? ' · ' + nSk + ' sautée' + (nSk > 1 ? 's' : '') : ''}</span></div>
      <div class="kpi"><span class="v num">${fmtMin(totalD) || '0 min'}</span><span class="l">faites sur ${fmtMin(totalP)}</span></div>
      <div class="kpi"><span class="v num">${avg == null ? '–' : avg.toFixed(1).replace('.', ',')}</span><span class="l">sensations moyennes (sur 5)</span></div></div>
      <div class="bars">${rows}</div></section>
    <section class="card stack"><div><h2>Dernières séances notées</h2></div>
      ${notes.length ? `<ul class="notes">${notes.map((k) => { const t = S.tracking[k], d = S.byDate[k].day; return `<li><div class="row between"><strong>${esc(frDate(k, true))} · ${esc(dayChipLabel(d))}</strong><span class="muted">${t.feel ? FEELS[t.feel - 1] : ''}</span></div>${t.note ? `<div class="muted">${esc(t.note)}</div>` : ''}</li>`; }).join('')}</ul>` : '<p class="muted">Aucune séance notée pour l\'instant. Ouvre une séance du plan pour la marquer comme faite et noter tes sensations.</p>'}
    </section></div>`;
}

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
function bilanView() {
  const year = yearBilanHTML();
  return `<div class="stack">${year}${S.plan ? planBilanHTML() : ''}</div>`;
}
