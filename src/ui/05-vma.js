/* ----- VMA ----- */
// Distances courtes du fichier (< 1 km) puis 5 / 10 / 21 / 30 / 42 km ; disponibilité par % reprise de la ligne la plus proche du fichier.
const LONG_DISTS = [5000, 10000, 21097.5, 30000, 42195];
function tableRows(vt) {
  if (!vt || !vt.rows) return vt;
  const longSrc = vt.rows.filter((r) => r.dist >= 1000);
  const rows = vt.rows.filter((r) => r.dist < 1000 && r.dist !== 50 && r.dist !== 100).concat(LONG_DISTS.map((d) => {
    let best = null;
    longSrc.forEach((r) => { if (!best || Math.abs(r.dist - d) < Math.abs(best.dist - d)) best = r; });
    const out = { dist: d, avail: best ? best.avail : vt.pcts.map(() => true) };
    // la couleur du coach n'est reprise que si la distance est la même (à 1 % près)
    if (best && best.fill && Math.abs(best.dist - d) / d < 0.01) out.fill = best.fill;
    return out;
  }));
  return { pcts: vt.pcts, rows };
}
function distLabel(d) { return d === 21097.5 ? '21,1 km (semi)' : d === 42195 ? '42,195 km (marathon)' : d >= 1000 ? (d / 1000).toString().replace('.', ',') + ' km' : d + ' m'; }
function fmtTableTime(t) { return t < 60 ? Math.round(t) + '"' : t < 3600 ? fmtMS(t) : fmtHMS(t); }
// Tableau par défaut quand aucun plan n'est chargé (mêmes pourcentages que les plans du coach).
const DEFAULT_VT = { pcts: [65, 70, 75, 80, 85, 90, 95, 100, 110, 120], rows: [150, 200, 300, 400, 500, 600, 800].map((dist) => ({ dist, avail: Array(10).fill(true) })).concat([{ dist: 1000, avail: Array(10).fill(true) }]) };
// Part de la VMA tenue en course selon la distance (fourchette courante chez les coureurs entraînés).
const PRED_DISTS = [
  { km: 5, name: '5 km', lo: 93, hi: 97 },
  { km: 10, name: '10 km', lo: 88, hi: 92 },
  { km: 21.0975, name: 'Semi-marathon', lo: 82, hi: 86 },
  { km: MARATHON_KM, name: 'Marathon', lo: 75, hi: 80 },
];
const REF_KMS = [[5, '5 km'], [10, '10 km'], [21.0975, 'Semi-marathon'], [MARATHON_KM, 'Marathon']];
function predRef() {
  const m = S.profile.ref;
  if (m && m.km && m.sec) return Object.assign({ manual: true }, m);
  const r = lastRaceResult();
  return r ? { km: r.km, sec: r.sec, label: r.name + ' · ' + frDate(r.date) } : null;
}
function riegel(sec, km1, km2) { return sec * Math.pow(km2 / km1, 1.06); }
function predictionHTML(vma) {
  const ref = predRef();
  const refName = ref ? (REF_KMS.find((x) => Math.abs(x[0] - ref.km) < 0.01) || [0, ref.km + ' km'])[1] : '';
  const rows = PRED_DISTS.map((d) => {
    const fast = d.km / (vma * d.hi / 100) * 3600, slow = d.km / (vma * d.lo / 100) * 3600;
    const rg = ref ? riegel(ref.sec, ref.km, d.km) : null;
    const same = ref && Math.abs(ref.km - d.km) < 0.01;
    return `<tr${d.km === MARATHON_KM ? ' class="hl"' : ''}><td>${d.km === 21.0975 ? '<span class="wide">Semi-marathon</span><span class="narrow">Semi</span>' : d.name}</td><td class="num range"><span>${fmtHMS(fast)} –</span> <span>${fmtHMS(slow)}</span></td><td class="num">${rg ? (same ? '<strong>' + fmtHMS(ref.sec) + '</strong> <span class="real">réalisé</span>' : fmtHMS(rg)) + '<span class="cellsub">' + fmtPace(rg / d.km) + '/km</span>' : '–'}</td></tr>`;
  }).join('');
  let vmaEq = '';
  if (ref) {
    const near = PRED_DISTS.reduce((a, d) => (Math.abs(d.km - ref.km) < Math.abs(a.km - ref.km) ? d : a), PRED_DISTS[0]);
    const v = (ref.km / (ref.sec / 3600)) / ((near.lo + near.hi) / 200);
    vmaEq = `<p class="sub">Ce chrono correspond à une VMA d'environ <strong>${fmtVma(Math.round(v * 2) / 2)} km/h</strong> (ta VMA réglée : ${fmtVma(vma)} km/h).</p>`;
  }
  const curKm = ref ? ref.km : MARATHON_KM;
  return `<section class="card stack predcard"><div><h2>Prédictions de course</h2><p class="sub">Des estimations, pas des promesses : la forme du jour, le parcours et la météo comptent beaucoup.</p></div>
    <div class="tablewrap"><table class="predtable"><thead><tr><th>Distance</th><th>Selon ta VMA</th><th>Selon ${ref ? 'ta course' : 'une course'}</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="sub"><strong>Selon ta VMA</strong> : la part de VMA que tiennent en général les coureurs entraînés sur chaque distance. <strong>Selon ta course</strong> : la formule de Riegel, qui extrapole un chrono réel vers les autres distances (plus fiable quand la distance est proche).</p>
    <div class="stack" style="gap:8px"><strong>Course de référence</strong>
      <p class="sub">${ref ? esc(refName) + ' en ' + esc(fmtHMS(ref.sec)) + (ref.label ? ' · ' + esc(ref.label) : '') : 'Aucune pour l\'instant : saisis un chrono récent, ou ton résultat le jour de ta course.'}</p>
      ${vmaEq}
      <div class="fields"><div class="field"><label for="ref-km">Distance</label><select id="ref-km">${REF_KMS.map(([k, n]) => `<option value="${k}"${Math.abs(k - curKm) < 0.01 ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="field"><label for="ref-time">Chrono</label><input type="text" id="ref-time" placeholder="ex. 3h25'00 ou 45'30" autocomplete="off"></div></div>
      <div class="row"><button class="btn small" data-act="refset">Utiliser ce chrono</button>${ref && ref.manual ? '<button class="btn small" data-act="refclear">Revenir à mon dernier résultat de course</button>' : ''}</div>
      ${S.msg.ref ? `<p class="errtxt" role="alert">${esc(S.msg.ref)}</p>` : ''}</div></section>`;
}
/* ----- Temps de passage pour n'importe quelle distance (allure régulière) ----- */
// Chrono proposé : l'objectif du plan pour le marathon, sinon la course de référence (Riegel), sinon le milieu de la fourchette VMA.
function splitDefault(km, vma) {
  if (Math.abs(km - MARATHON_KM) < 0.01 && S.plan && S.settings && S.settings.targetSec) return S.settings.targetSec;
  const ref = predRef();
  if (ref) return Math.round(riegel(ref.sec, ref.km, km));
  const d = PRED_DISTS.find((x) => Math.abs(x.km - km) < 0.01);
  return Math.round(km / (vma * (d.lo + d.hi) / 200) * 3600);
}
function splitMarks(km) {
  if (km <= 10.01) return Array.from({ length: Math.round(km) }, (_, i) => i + 1);
  const out = [];
  for (let k = 5; k < km; k += 5) out.push(k);
  if (km > 30) out.splice(out.findIndex((k) => k > 21.0975), 0, 21.0975);
  out.push(km);
  return out;
}
function splitsHTML(vma) {
  const sp = S.ui.split || {};
  const km = PRED_DISTS.some((d) => Math.abs(d.km - sp.km) < 0.01) ? sp.km : (predRef() ? PRED_DISTS.reduce((a, d) => (Math.abs(d.km - predRef().km) < Math.abs(a.km - predRef().km) ? d : a)).km : MARATHON_KM);
  const sec = sp.sec && sp.km === km ? sp.sec : splitDefault(km, vma);
  const pace = sec / km;
  const lab = (k) => Math.abs(k - 21.0975) < 0.01 && km > 30 ? 'Semi' : Math.abs(k - km) < 0.01 ? 'Arrivée' : String(k).replace('.', ',') + ' km';
  const rows = splitMarks(km).map((k) => `<tr${Math.abs(k - km) < 0.01 ? ' class="hl"' : ''}><td>${lab(k)}</td><td class="num">${fmtHMS(k * pace)}</td></tr>`).join('');
  return `<section class="card stack"><div><h2>Temps de passage</h2><p class="sub">Pour n'importe quelle distance, à allure régulière. Le plan de course complet (départ prudent, ravitaillements) est dans l'onglet Course quand un plan a une date de course.</p></div>
    <div class="fields"><div class="field"><label for="split-km">Distance</label><select id="split-km">${PRED_DISTS.map((d) => `<option value="${d.km}"${Math.abs(d.km - km) < 0.01 ? ' selected' : ''}>${d.name}</option>`).join('')}</select></div>
      <div class="field"><label for="split-time">Chrono visé</label><input type="text" id="split-time" value="${esc(fmtHMS(sec))}" autocomplete="off" placeholder="ex. 3h25'00 ou 45'30"></div></div>
    ${S.msg.split ? `<p class="errtxt" role="alert">${esc(S.msg.split)}</p>` : ''}
    <p class="sub">Allure : <strong class="num">${fmtPace(pace)}/km</strong> · ${fmtVma(Math.round(km / sec * 3600 * 10) / 10)} km/h · ${Math.round(km / sec * 3600 / vma * 100)} % de ta VMA</p>
    <div class="tablewrap"><table><thead><tr><th>Repère</th><th>Passage</th></tr></thead><tbody>${rows}</tbody></table></div></section>`;
}
/* ----- cases mises en avant dans le tableau VMA ----- */
const VC_NAMES = { 'vc-green': 'vert', 'vc-yellow': 'jaune', 'vc-orange': 'orange', 'vc-red': 'rouge', 'vc-blue': 'bleu', 'vc-violet': 'violet', 'vc-dark': 'gris foncé' };
// Classe une couleur Excel dans une famille de couleurs de l'appli (les gris clairs, fond habituel du tableau, sont ignorés).
function fillClass(hex) {
  if (!hex) return '';
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (sat < 0.18) return l < 0.55 ? 'vc-dark' : '';
  if (l > 0.95) return '';
  let h = d === 0 ? 0 : mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  if (h < 18 || h >= 340) return 'vc-red';
  if (h < 42) return 'vc-orange';
  if (h < 68) return 'vc-yellow';
  if (h < 170) return 'vc-green';
  if (h < 260) return 'vc-blue';
  return 'vc-violet';
}
function vmaHighlights(vt) {
  const coach = vt.rows.some((r) => r.fill && r.fill.some((f) => fillClass(f)));
  const cls = vt.rows.map((r) => vt.pcts.map((p, k) => {
    if (coach) return r.fill ? fillClass(r.fill[k]) : '';
    // sans couleurs du coach : la fourchette réalisable en course (la même que pour les prédictions)
    const pd = PRED_DISTS.find((x) => Math.abs(x.km * 1000 - r.dist) / r.dist < 0.01);
    if (!pd) return '';
    // une seule case par distance : la colonne la plus proche du milieu de la fourchette (la plus rapide en cas d'égalité)
    const mid = (pd.lo + pd.hi) / 2;
    const best = vt.pcts.reduce((a, q) => (Math.abs(q - mid) < Math.abs(a - mid) || (Math.abs(q - mid) === Math.abs(a - mid) && q > a) ? q : a), vt.pcts[0]);
    return p === best && r.avail[k] ? 'vc-green' : '';
  }));
  let legend;
  if (coach) {
    const used = Object.keys(VC_NAMES).filter((c) => cls.some((row) => row.includes(c)));
    legend = `<p class="sub vclegend">Cases mises en avant comme dans le fichier du coach : ${used.map((c) => `<span class="vcsw ${c}"></span>${VC_NAMES[c]}`).join(' · ')}.</p>`;
  } else {
    legend = `<p class="sub vclegend"><span class="vcsw vc-green"></span>Temps réalisables en course avec ta VMA sur 5 km, 10 km, semi et marathon (même fourchette que les prédictions).</p>`;
  }
  return { cls, legend };
}
function vmaView() {
  const c = ctx();
  const { vma, targetSec } = S.settings;
  const marPct = (3600 / c.marathon) / vma * 100;
  const err = S.msg.level;
  const byPace = S.settings.targetMode === 'pace';
  const vt = tableRows(S.plan && S.plan.vmaTable && S.plan.vmaTable.rows ? S.plan.vmaTable : DEFAULT_VT);
  let table = '';
  if (vt && vt.rows.length) {
    const hl = vmaHighlights(vt);
    table = `${hl.legend}<div class="tablewrap" style="max-height:560px"><table class="vmatable"><thead><tr><th>Distance</th>${vt.pcts.map((p) => `<th>${p} %</th>`).join('')}</tr>
      <tr><th>Allure / km</th>${vt.pcts.map((p) => `<th>${fmtPace(paceSecPerKm(vma, p))}</th>`).join('')}</tr></thead><tbody>
      ${vt.rows.map((r, i) => `<tr><td>${distLabel(r.dist)}</td>${vt.pcts.map((p, k) => r.avail[k] ? `<td${hl.cls[i][k] ? ` class="${hl.cls[i][k]}"` : ''}>${fmtTableTime(r.dist / (vma / 3.6 * p / 100))}</td>` : '<td class="na">·</td>').join('')}</tr>`).join('')}
      </tbody></table></div>`;
  }
  const refs = ((S.plan && S.plan.refs) || []).map((r) => {
    const isMar = Math.abs(r.km - 42.195) < 0.5;
    const realPct = (r.km * 1000 / r.realSec) * 3.6 / vma * 100;
    const objPct = isMar ? marPct : (r.objPct != null ? r.objPct * 100 : null);
    const objSec = isMar ? targetSec : (objPct ? r.km * paceSecPerKm(vma, objPct) : null);
    const name = isMar ? 'Marathon' : r.km === 10 ? '10 km' : 'Semi-marathon';
    return `<tr${isMar ? ' class="hl"' : ''}><td>${name}</td><td>${fmtHMS(r.realSec)}</td><td>${Math.round(realPct)} %</td><td>${objSec ? fmtHMS(objSec) : '–'}</td><td>${objPct ? Math.round(objPct * 10) / 10 + ' %' : '–'}</td></tr>`;
  }).join('');
  const lv = (re, fb) => levelPct(S.plan, re, fb);
  const scope = S.plan ? (S.plans.length > 1 ? `Réglages du plan « ${esc(planName(curEntry()))} ». ` : '') : 'Aucun plan affiché : ce sont tes réglages par défaut, repris quand tu ajoutes un plan. ';
  return `<div class="grid2 vmagrid">
    <section class="card stack"><div><h2>Mon niveau</h2><p class="sub">${scope}La VMA règle les allures en pourcentage (footing, séances de vitesse). Le temps visé règle les allures marathon. Les deux se complètent.</p></div>
      <div class="fields">
        <div class="field"><label for="vma-input">VMA (km/h)</label><input type="text" id="vma-input" inputmode="decimal" value="${fmtVma(vma)}" autocomplete="off"></div>
        <div class="field"><label for="target-input">Objectif marathon</label>
          <div class="seg" role="group" aria-label="Saisir"><button data-act="tmode" data-m="time" aria-pressed="${!byPace}">Temps</button><button data-act="tmode" data-m="pace" aria-pressed="${byPace}">Allure</button></div>
          <input type="text" id="target-input" value="${esc(byPace ? fmtPace(c.marathon) : Math.floor(targetSec / 3600) + "h" + pad2(Math.floor(targetSec % 3600 / 60)) + "'" + pad2(Math.round(targetSec % 60)))}" autocomplete="off" placeholder="${byPace ? "4'10" : "2h55'49"}">
          <span class="sub">${byPace ? '= ' + fmtHMS(targetSec) + ' au marathon' : '= ' + fmtPace(c.marathon) + '/km'}</span></div>
      </div>
      ${err ? `<p class="errtxt" role="alert">${esc(err)}</p>` : `<div class="row"><button class="btn small primary" data-act="commit">${ICON.check}Enregistrer</button><span class="sub">ou appuie sur Entrée : c'est enregistré tout de suite.</span></div>`}
      <div class="kpis">
        <div class="kpi"><span class="v num">${fmtPace(c.marathon)}</span><span class="l">allure marathon · ${Math.round(marPct * 10) / 10} % de la VMA</span></div>
        <div class="kpi"><span class="v num">${fmtPace(c.pct(100))}</span><span class="l">100 % VMA · ${fmtVma(vma)} km/h</span></div>
        <div class="kpi"><span class="v num">${fmtPace(c.semi)}</span><span class="l">allure semi · ${Math.round(lv(/semi/, 92.8) * 10) / 10} %</span></div>
        <div class="kpi"><span class="v num">${fmtPace(c.pct(65))}</span><span class="l">footing · 65 % VMA</span></div>
      </div>
      ${S.plan ? '<div><button class="btn small" data-act="resetvals">Revenir aux valeurs du fichier du coach</button></div>' : ''}</section>
    ${predictionHTML(vma)}
    ${splitsHTML(vma)}
    ${vmaTestsHTML()}
    ${refs ? `<section class="card stack"><div><h2>Références du plan</h2><p class="sub">Les temps réalisés et les objectifs notés par le coach dans le fichier, recalculés avec ta VMA.</p></div>
      <div class="tablewrap"><table><thead><tr><th>Distance</th><th>Réalisé</th><th>% VMA</th><th>Objectif</th><th>% VMA</th></tr></thead><tbody>${refs}</tbody></table></div></section>` : ''}
  </div>
  <section class="card stack"><div><h2>Tableau des temps selon la VMA</h2><p class="sub">Temps pour parcourir chaque distance à un pourcentage de VMA, calculé avec ${fmtVma(vma)} km/h.</p></div>${table}</section>`;
}

/* ----- Passage marathon ----- */
function passageModel() {
  const pace = ctx().marathon;
  const cautious = S.ui.strategy === 'cautious';
  const d = S.settings.cautD != null ? S.settings.cautD : 3;
  const K = S.settings.cautKm != null ? S.settings.cautKm : 10;
  const cum = (km) => {
    if (!cautious) return km * pace;
    if (km <= K) return km * (pace + d);
    return K * (pace + d) + (km - K) * (pace - d * K / (MARATHON_KM - K));
  };
  return { pace, cautious, d, K, cum };
}
function cautiousFields(m) {
  const f1 = (n) => String(Math.round(n * 10) / 10).replace('.', ',');
  const later = m.pace - m.d * m.K / (MARATHON_KM - m.K);
  return `<div class="fields3"><div class="field"><label for="caut-km">Départ prudent sur (km)</label><input type="text" id="caut-km" inputmode="decimal" value="${f1(m.K)}" autocomplete="off"></div>
    <div class="field"><label for="caut-pace">Allure du départ (/km)</label><input type="text" id="caut-pace" value="${esc(fmtPace(m.pace + m.d))}" autocomplete="off"></div>
    <div class="field"><label for="caut-d">ou écart (s/km)</label><input type="text" id="caut-d" inputmode="decimal" value="${f1(m.d)}" autocomplete="off"></div></div>
    ${S.msg.caut ? `<p class="errtxt" role="alert">${esc(S.msg.caut)}</p>` : ''}
    <p class="sub">Les ${f1(m.K)} premiers km à ${fmtPace(m.pace + m.d)}/km, puis ${fmtPace(later)}/km jusqu'à l'arrivée pour tenir ${fmtHMS(S.settings.targetSec)}. Allure marathon : ${fmtPace(m.pace)}/km.</p>`;
}

/* ----- tests de VMA ----- */
const VMA_TESTS = [
  { id: 'demicooper', name: 'Demi-Cooper (6 min)', ask: 'Distance parcourue (m)', ph: 'ex. 1650', calc: (v) => v / 100, ok: (v) => v >= 800 && v <= 2500, help: 'Courir le plus loin possible en 6 minutes. VMA = distance ÷ 100.' },
  { id: 'cooper', name: 'Cooper (12 min)', ask: 'Distance parcourue (m)', ph: 'ex. 3100', calc: (v) => v / 200 / 0.95, ok: (v) => v >= 1500 && v <= 4800, help: 'Courir le plus loin possible en 12 minutes, tenu à environ 95 % de la VMA.' },
  { id: 'paliers', name: 'Test par paliers (VAMEVAL, Léger…)', ask: 'Vitesse du dernier palier terminé (km/h)', ph: 'ex. 16,5', calc: (v) => v, ok: (v) => v >= 8 && v <= 25, help: 'La vitesse du dernier palier complet est ta VMA.' },
];
function vmaTestsHTML() {
  const list = (S.profile.vmaTests || []).slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const cur = (S.settings || S.profile).vma;
  const kind = VMA_TESTS.find((t) => t.id === (S.ui.vtKind || 'demicooper')) || VMA_TESTS[0];
  const last = list[list.length - 1];
  let chart = '';
  if (list.length >= 2) {
    const W = 320, H = 90, P = 10;
    const vs = list.map((t) => t.vma), lo = Math.min(...vs) - 0.5, hi = Math.max(...vs) + 0.5;
    const t0 = parseISO(list[0].date).getTime(), t1 = parseISO(list[list.length - 1].date).getTime() || t0 + 1;
    const pts = list.map((t) => [P + (W - 2 * P) * ((parseISO(t.date).getTime() - t0) / ((t1 - t0) || 1)), H - P - (H - 2 * P) * ((t.vma - lo) / (hi - lo))]);
    chart = `<svg class="vmachart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Évolution de la VMA : ${list.map((t) => frDate(t.date) + ' ' + fmtVma(t.vma)).join(', ')}"><polyline points="${pts.map((p) => p.map((x) => x.toFixed(1)).join(',')).join(' ')}" fill="none" stroke="var(--band-a)" stroke-width="2.5" stroke-linejoin="round"/>${pts.map((p, k) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="4" fill="var(--band-b)"><title>${esc(frDate(list[k].date) + ' : ' + fmtVma(list[k].vma) + ' km/h')}</title></circle>`).join('')}</svg>`;
  }
  return `<section class="card stack"><div><h2>Tests de VMA</h2><p class="sub">Note tes tests pour suivre ta VMA dans le temps et mettre à jour tes allures.</p></div>
    ${list.length ? `<ul class="vtlist">${list.slice().reverse().map((t) => `<li><div class="stack" style="gap:2px"><strong class="num">${fmtVma(t.vma)} km/h</strong><span class="sub">${esc(frDate(t.date, true))} · ${esc((VMA_TESTS.find((x) => x.id === t.type) || { name: 'Test' }).name)}${t.type === 'paliers' ? '' : ' · ' + t.value + ' m'}</span></div>
      <div class="row">${Math.abs(t.vma - cur) >= 0.05 ? `<button class="btn small" data-act="vtuse" data-id="${esc(t.id)}">Utiliser ${fmtVma(t.vma)} km/h</button>` : '<span class="badge ok">VMA actuelle</span>'}<button class="btn small" data-act="vtdel" data-id="${esc(t.id)}">Supprimer</button></div></li>`).join('')}</ul>` : ''}
    ${chart}
    ${last && list.length >= 2 ? `<p class="sub">Depuis le premier test : ${(last.vma - list[0].vma >= 0 ? '+' : '') + fmtVma(Math.round((last.vma - list[0].vma) * 10) / 10)} km/h.</p>` : ''}
    <div class="logform stack"><strong>Ajouter un test</strong>
      <div class="fields3"><div class="field"><label for="vt-kind">Test</label><select id="vt-kind">${VMA_TESTS.map((t) => `<option value="${t.id}"${t.id === kind.id ? ' selected' : ''}>${t.name}</option>`).join('')}</select></div>
        <div class="field"><label for="vt-value">${kind.ask}</label><input type="text" id="vt-value" inputmode="decimal" placeholder="${kind.ph}" autocomplete="off"></div>
        <div class="field"><label for="vt-date">Date</label><input type="date" id="vt-date" value="${TODAY}"></div></div>
      <p class="sub">${esc(kind.help)}</p>
      ${S.msg.vt ? `<p class="errtxt" role="alert">${esc(S.msg.vt)}</p>` : ''}
      <div><button class="btn small primary" data-act="vtadd">${ICON.check}Ajouter le test</button></div></div></section>`;
}
function addVmaTest() {
  const kind = VMA_TESTS.find((t) => t.id === ((document.getElementById('vt-kind') || {}).value)) || VMA_TESTS[0];
  const v = Number(((document.getElementById('vt-value') || {}).value || '').trim().replace(',', '.'));
  const date = ((document.getElementById('vt-date') || {}).value || '');
  if (!kind.ok(v)) { S.msg.vt = kind.id === 'paliers' ? 'Vitesse entre 8 et 25 km/h.' : 'Distance non plausible pour ce test.'; return null; }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { S.msg.vt = 'Choisis la date du test.'; return null; }
  const vma = Math.round(kind.calc(v) * 10) / 10;
  const t = { id: 'v' + Date.now().toString(36), date, type: kind.id, value: v, vma };
  S.profile.vmaTests = (S.profile.vmaTests || []).concat([t]);
  S.msg.vt = ''; saveStore();
  return t;
}
function useVma(v) {
  S.settings.vma = v; if (S.settings !== S.profile) S.profile.vma = v;
  saveStore();
}
