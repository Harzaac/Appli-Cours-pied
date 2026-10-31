/* ============================================================
   Écrans
   ============================================================ */
const SKYLINE = `<svg viewBox="0 0 200 200" role="img" aria-label="Silhouettes de Lille : le beffroi, la Vieille Bourse et la Porte de Paris" preserveAspectRatio="xMidYMid slice">
  <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1457C4"/><stop offset=".6" stop-color="#2E9AD0"/><stop offset="1" stop-color="#8FE3C6"/></linearGradient></defs>
  <rect width="200" height="200" fill="url(#cg)"/>
  <circle cx="150" cy="50" r="17" fill="#FFD25A"/>
  <g fill="#0B4F7E" opacity=".5"><rect x="0" y="128" width="26" height="50"/><polygon points="0,128 6,118 13,128 20,118 26,128"/><rect x="174" y="122" width="26" height="56"/><polygon points="174,122 180,112 187,122 194,112 200,122"/></g>
  <g fill="#0B2236">
    <rect x="86" y="74" width="28" height="100"/><rect x="82" y="70" width="36" height="6"/>
    <rect x="90" y="50" width="20" height="20"/><rect x="88" y="46" width="24" height="5"/>
    <polygon points="91,46 109,46 100,12"/><rect x="99" y="4" width="2" height="12"/>
    <circle cx="100" cy="60" r="5" fill="#FFD25A"/>
    <rect x="94" y="90" width="4" height="10" fill="#FFD25A"/><rect x="102" y="90" width="4" height="10" fill="#FFD25A"/>
    <rect x="94" y="112" width="4" height="10" fill="#FFD25A"/><rect x="102" y="112" width="4" height="10" fill="#FFD25A"/>
    <path d="M18 172 V134 H26 V126 H34 V118 H42 V126 H50 V118 H58 V126 H66 V134 H74 V172 Z"/>
    <rect x="26" y="146" width="6" height="12" fill="#FFD25A"/><rect x="40" y="146" width="6" height="12" fill="#FFD25A"/><rect x="54" y="146" width="6" height="12" fill="#FFD25A"/>
    <path fill-rule="evenodd" d="M126 172 V122 H184 V172 H165 V146 A11 11 0 0 0 143 146 V172 Z"/>
    <polygon points="126,122 155,104 184,122"/><rect x="150" y="108" width="10" height="8" fill="#FFD25A"/>
  </g>
  <rect y="170" width="200" height="30" fill="#0B2236"/><rect y="170" width="200" height="3" fill="#134A7A"/>
</svg>`;
function crestHTML() {
  return `<div class="crest">${S.crest ? `<img src="${S.crest}" alt="Image du bandeau">` : SKYLINE}</div>`;
}
function headerHTML() {
  const plan = S.plan;
  const c = ctx();
  const n = plan.raceDate ? diffDays(plan.raceDate, TODAY) : null;
  const res = plan.raceDate ? track(plan.raceDate) : {};
  const chrono = n != null && n <= 0 && res.result;
  const big = n == null ? '' : chrono ? fmtHMS(res.result) : n > 0 ? 'J-' + n : n === 0 ? 'Jour J' : 'Bravo';
  const tgt = S.settings && S.settings.targetSec;
  const lbl = n == null ? '' : chrono
    ? '<strong>' + esc(raceNameOf()) + (res.pr ? ' · record personnel' : '') + '</strong><span>' + frDate(plan.raceDate, true) + (tgt ? ' · objectif ' + fmtHMS(tgt) : '') + '</span>'
    : n >= 0
    ? '<strong>' + (n === 0 ? 'Aujourd\'hui, c\'est la course' : 'avant le marathon') + '</strong><span>' + frDate(plan.raceDate, true) + '</span>'
    : '<strong>Marathon couru</strong><span>' + frDate(plan.raceDate, true) + ' · <button class="linkbtn onband" data-act="open" data-date="' + plan.raceDate + '">saisir mon chrono</button></span>';
  const nx = nextSession();
  let next = '';
  if (nx) {
    const nc = ctx(nx.entry);
    const when = nx.day.date === TODAY ? 'Aujourd\'hui' : nx.day.date === addDays(TODAY, 1) ? 'Demain' : frDate(nx.day.date, true);
    const main = mainStepTitle(nx.day, nc, nx.entry);
    next = `<div class="next"><div class="k">Prochaine séance · ${esc(when)}</div>
      <div class="row"><span class="chip c-${nx.day.category}">${esc(dayChipLabel(nx.day))}</span><span class="muted num">${esc(dayDuration(nx.day))}</span></div>
      <div class="t">${esc(main)}</div>
      ${nextSteps(nx.day, nc)}
      <div><button class="btn small" data-act="open" data-date="${nx.day.date}">Voir la séance</button></div></div>`;
  }
  const dark = effectiveDark();
  return `<header>
    <div class="band"><div class="wrap">
      <div class="brandrow"><div class="brand">${S.plans.length > 1 ? `<label class="sr" for="plan-select">Plan affiché</label><select class="plansel" id="plan-select">${S.plans.slice().sort((a, b) => (rangeOf(a).start < rangeOf(b).start ? -1 : 1)).map((e) => `<option value="${esc(e.id)}"${e.id === S.activeId ? ' selected' : ''}>${esc(planName(e))} · ${planState(e)}</option>`).join('')}</select>` : esc(plan.title)}</div>
        <div class="tools">
          <button class="pill" data-act="tab" data-view="vma" aria-label="Mon niveau">${ICON.gauge}<span class="num">VMA ${fmtVma(S.settings.vma)} · ${fmtPace(c.marathon)}/km</span></button>
          <button class="pill" data-act="theme" aria-label="${dark ? 'Passer au thème clair' : 'Passer au thème sombre'}">${dark ? ICON.sun : ICON.moon}<span>${dark ? 'Clair' : 'Sombre'}</span></button>
        </div></div>
      <div class="hero"><div class="herol">${crestHTML()}<div class="count"><span class="big num${chrono ? ' chrono' : ''}">${big}</span><span class="lbl">${lbl}</span></div></div>${next}</div>
    </div></div>
    <nav class="wrap tabs" aria-label="Sections">
      ${[['plan', 'Calendrier'], ['vma', 'VMA'], ['race', 'Course'], ['bilan', 'Bilan'], ['data', 'Données']].map(([v, l]) => `<button data-act="tab" data-view="${v}" ${S.ui.view === v ? 'aria-current="page"' : ''}>${l}</button>`).join('')}
    </nav></header>`;
}

function nextSteps(day, c) {
  if (day.category === 'race') return '';
  c = c || ctx();
  const items = day.steps.map((st) => describeStep(st, c)).filter((t) => t.title);
  if (!items.length) return '';
  const shown = items.slice(0, 5);
  return '<ul class="nsteps">' + shown.map((t) => `<li><b>${esc(t.title)}</b>${t.sub[0] ? `<span>${esc(t.sub[0])}</span>` : ''}</li>`).join('') + (items.length > shown.length ? `<li class="more">+ ${items.length - shown.length} autres étapes dans le détail</li>` : '') + '</ul>';
}
function mainStepTitle(day, c, e) {
  if (day.category === 'race') return raceNameOf(e || (S.byDate[day.date] && S.byDate[day.date].entry));
  c = c || ctx();
  const pri = ['fast', 'mp', 'tempo'];
  let best = null;
  for (const st of day.steps) {
    const t = describeStep(st, c);
    if (pri.includes(t.tone)) { best = t; break; }
  }
  if (!best) {
    const steady = day.steps.filter((s) => s.k === 'steady' && s.pct);
    if (steady.length >= 2) {
      const a = Math.round(steady[0].pct[0]), b = Math.round(steady[steady.length - 1].pct[1]);
      return 'Progressif ' + a + ' → ' + b + ' % VMA';
    }
    const longest = steady.sort((a, b) => b.min - a.min)[0];
    best = longest ? describeStep(longest, c) : null;
  }
  return best ? best.title : (day.durationText ? dayDuration(day) : day.typeText);
}
function nextSession() {
  const list = Object.keys(S.byDate).sort();
  for (const d of list) {
    if (d < TODAY) continue;
    const ref = S.byDate[d];
    if (ref.day.rest || !ref.entry) continue;
    if (d === TODAY && (track(d).done || track(d).skipped)) continue;
    return ref;
  }
  return null;
}
function footHTML() {
  return `<footer class="foot"><div class="wrap"><p>Tes plans d'entraînement et tes sorties dans un même calendrier. Les allures sont calculées à partir de ta VMA et de ton objectif. Tes données restent sur cet appareil : pense à enregistrer une copie (onglet Données).</p><p class="ver">Appli Marathon · version 3.2</p></div></footer>`;
}
