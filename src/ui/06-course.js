/* ----- Plan de course (une page, imprimable) ----- */
function ravSettings() {
  const r = S.settings.rav || {};
  return { mode: r.mode === 'min' ? 'min' : 'km', every: r.every > 0 ? r.every : (r.mode === 'min' ? 30 : 5) };
}
function kmAtTime(t, m) { // inverse de cum()
  if (!m.cautious) return t / m.pace;
  if (t <= m.K * (m.pace + m.d)) return t / (m.pace + m.d);
  return m.K + (t - m.K * (m.pace + m.d)) / (m.pace - m.d * m.K / (MARATHON_KM - m.K));
}
function fmtKmLabel(km) { return (Math.abs(km - Math.round(km)) < 0.05 ? String(Math.round(km)) : km.toFixed(1).replace('.', ',')) + ' km'; }
function raceRows() {
  const m = passageModel();
  const rv = ravSettings();
  const total = m.cum(MARATHON_KM);
  const pts = [];
  if (rv.mode === 'km') for (let k = rv.every; k < MARATHON_KM - 1; k += rv.every) pts.push(k);
  else for (let t = rv.every * 60; t < total - 120; t += rv.every * 60) pts.push(kmAtTime(t, m));
  const rows = pts.map((km) => ({ km, rav: true }));
  const semi = 21.0975;
  const near = rows.find((r) => Math.abs(r.km - semi) < 0.3);
  if (near) near.semi = true; else rows.push({ km: semi, semi: true });
  rows.push({ km: MARATHON_KM, end: true });
  rows.sort((a, b) => a.km - b.km);
  let pk = 0, pt = 0;
  rows.forEach((r) => {
    r.t = m.cum(r.km);
    r.seg = (r.t - pt) / (r.km - pk);
    r.label = r.end ? 'Arrivée' : r.semi ? (r.rav ? fmtKmLabel(r.km) + ' · semi' : 'Semi · 21,1 km') : fmtKmLabel(r.km);
    pk = r.km; pt = r.t;
  });
  return { m, rows, total };
}
function raceText() {
  const { m, rows } = raceRows();
  const head = raceNameOf() + ' · objectif ' + fmtHMS(S.settings.targetSec) + ' · ' + fmtPace(m.pace) + '/km' + (m.cautious ? ' · départ prudent ' + m.K + ' km (+' + m.d + ' s/km)' : '');
  return head + '\n' + rows.map((r) => r.label + ' ' + fmtHMS(r.t) + ' (' + fmtPace(r.seg) + '/km)' + (r.rav ? ' ravito' : '')).join('\n') + (S.settings.raceNote ? '\n' + S.settings.raceNote : '');
}
function raceView() {
  const { m, rows } = raceRows();
  const rv = ravSettings();
  const byMin = rv.mode === 'min';
  const body = rows.map((r) => `<tr class="${r.end || r.semi ? 'hl' : ''}"><td>${esc(r.label)}</td><td>${fmtHMS(r.t)}</td><td>${fmtPace(r.seg)}/km</td><td>${r.rav ? '<span class="badge">Ravito</span>' : ''}</td></tr>`).join('');
  return `<div class="stack">
    <section class="card racecta noprint"><div class="stack" style="gap:4px"><h2>Écran de course</h2><p class="sub">Un écran simplifié pour le jour J : allure, passages, ravitaillements et météo de ${esc(raceCity(curEntry()).name.replace(/ \(\w+\)$/, ''))}, lisible d'un coup d'œil. Il s'ouvre tout seul le ${esc(S.plan.raceDate ? frDate(S.plan.raceDate) : 'jour de la course')}. Tu peux l'ouvrir dès maintenant pour le tester et en sortir quand tu veux.</p></div>
      <button class="btn primary big" data-act="racemode">Ouvrir l'écran de course</button></section>
    <section class="card stack noprint"><div><h2>Plan de course</h2><p class="sub">Une page à imprimer ou à garder sur ton téléphone. Les allures viennent de ton objectif (<button class="linkbtn" data-act="tab" data-view="vma">onglet VMA</button>).</p></div>
      <div class="seg" role="group" aria-label="Stratégie"><button data-act="strategy" data-s="even" aria-pressed="${!m.cautious}">Allure régulière</button><button data-act="strategy" data-s="cautious" aria-pressed="${m.cautious}">Départ prudent</button></div>
      ${m.cautious ? cautiousFields(m) : ''}
      <div class="fields"><div class="field"><label>Ravitaillement</label><div class="seg" role="group" aria-label="Mode ravitaillement"><button data-act="ravmode" data-m="km" aria-pressed="${!byMin}">Tous les km</button><button data-act="ravmode" data-m="min" aria-pressed="${byMin}">Toutes les minutes</button></div></div>
        <div class="field"><label for="rav-every">${byMin ? 'Toutes les (minutes)' : 'Tous les (km)'}</label><input type="text" id="rav-every" inputmode="decimal" value="${String(rv.every).replace('.', ',')}" autocomplete="off"></div></div>
      ${S.msg.rav ? `<p class="errtxt" role="alert">${esc(S.msg.rav)}</p>` : ''}
      <div class="field"><label for="race-note">Notes de course (gels, boissons, repères…)</label><textarea class="note" id="race-note" rows="3" placeholder="Ex. gel aux km 10, 20, 30 · eau à chaque ravito">${esc(S.settings.raceNote || '')}</textarea></div>
    </section>
    <section class="card stack raceplan"><div class="row between"><div><h2>${esc(raceNameOf())}${S.plan.raceDate ? ' · ' + esc(frDate(S.plan.raceDate, true)) : ''}</h2><p class="sub">${m.cautious ? 'Départ prudent : ' + String(m.K).replace('.', ',') + ' premiers km à +' + String(m.d).replace('.', ',') + ' s/km, puis un peu plus vite.' : 'Allure régulière.'}</p></div></div>
      <div class="kpis"><div class="kpi"><span class="v num">${fmtHMS(S.settings.targetSec)}</span><span class="l">objectif</span></div>
        <div class="kpi"><span class="v num">${fmtPace(m.pace)}</span><span class="l">allure moyenne /km</span></div>
        <div class="kpi"><span class="v num">${(3600 / m.pace).toFixed(1).replace('.', ',')}</span><span class="l">km/h</span></div></div>
      ${raceWeatherHTML()}
      <div class="tablewrap"><table><thead><tr><th>Repère</th><th>Passage</th><th>Allure du tronçon</th><th></th></tr></thead><tbody>${body}</tbody></table></div>
      ${S.settings.raceNote ? `<p class="racenote">${esc(S.settings.raceNote).replace(/\n/g, '<br>')}</p>` : ''}</section></div>`;
}
