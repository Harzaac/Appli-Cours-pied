/* ============================================================
   Rendu
   ============================================================ */
function emptyHeaderHTML() {
  const dark = effectiveDark();
  if (!['plan', 'plans', 'vma', 'bilan', 'data', 'profile'].includes(S.ui.view)) S.ui.view = 'plan';
  return `<header><div class="band"><div class="wrap"><div class="brandrow"><div class="brand">${APP_NAME}</div>
      <div class="tools"><button class="pill" data-act="tab" data-view="vma" aria-label="Mon niveau">${ICON.gauge}<span class="num">VMA ${fmtVma(S.settings.vma)}</span></button><button class="pill" data-act="theme">${dark ? ICON.sun + '<span>Clair</span>' : ICON.moon + '<span>Sombre</span>'}</button>${profilePill()}</div></div>
      <div class="hero"><div class="herol">${crestHTML()}${(() => { const r = nextRace(); return r ? `<div class="count"><span class="big num">${diffDays(r.date, TODAY) > 0 ? 'J-' + diffDays(r.date, TODAY) : 'Jour J'}</span><span class="lbl"><strong>${esc(r.name)}</strong><span>${esc(frDate(r.date, true))} · ${esc(raceKmLabel(r.km))}${r.targetSec ? ' · objectif ' + esc(fmtHMS(r.targetSec)) : ''}</span></span></div><div class="count empty">` : '<div class="count empty"><span class="lbl"><strong>Pas de course prévue</strong><span>Ajoute le plan de ton coach : il se place tout seul dans le calendrier selon ta date de course.</span></span>'; })()}
        <div style="margin-top:12px"><input type="file" id="file-xlsx" accept=".xlsx" class="sr"><button class="pill" data-act="pickxlsx">${ICON.up}<span>Ajouter un plan</span></button></div></div></div></div></div></div>
    <nav class="wrap tabs" aria-label="Sections">${tabsHTML(false)}</nav></header>`;
}
function shellHTML() {
  if (!S.plan) {
    const head = emptyHeaderHTML();
    const body = S.imp.stage !== 'idle' ? importView() : S.ui.view === 'data' ? dataView() : S.ui.view === 'profile' ? profileView() : S.ui.view === 'plans' ? plansView() : S.ui.view === 'vma' ? vmaView() : S.ui.view === 'bilan' ? bilanView() : S.ui.mode === 'week' ? weekView() : monthView();
    return head + `<main class="wrap">${body}</main>${footHTML()}`;
  }
  let body;
  if (S.ui.raceMode && S.imp.stage === 'idle') return raceModeHTML();
  if (S.imp.stage !== 'idle') body = importView();
  else if (S.ui.view === 'plan') body = S.ui.mode === 'week' ? weekView() : monthView();
  else if (S.ui.view === 'vma') body = vmaView();
  else if (S.ui.view === 'race' && S.plan.raceDate) body = raceView();
  else if (S.ui.view === 'race') { S.ui.view = 'plan'; body = S.ui.mode === 'week' ? weekView() : monthView(); }
  else if (S.ui.view === 'bilan') body = bilanView();
  else if (S.ui.view === 'plans') body = plansView();
  else if (S.ui.view === 'profile') body = profileView();
  else body = dataView();
  return headerHTML() + `<main class="wrap">${raceCtaBanner()}${backupBanner()}${body}</main>` + footHTML();
}
function raceModeHTML() {
  const { m, rows } = raceRows();
  const n = S.plan.raceDate ? diffDays(S.plan.raceDate, TODAY) : null;
  const dark = effectiveDark();
  const body = rows.map((r) => `<tr class="${r.end || r.semi ? 'hl' : ''}"><td>${esc(r.label)}${r.rav ? ' <span class="badge">Ravito</span>' : ''}</td><td>${fmtHMS(r.t)}</td><td>${fmtPace(r.seg)}</td></tr>`).join('');
  return `<div class="band racemode-band"><div class="wrap"><div class="brandrow"><button class="backbtn" data-act="racequit"><span aria-hidden="true">←</span> Quitter l'écran de course</button><div class="tools">
      <button class="pill" data-act="theme">${dark ? ICON.sun + '<span>Clair</span>' : ICON.moon + '<span>Sombre</span>'}</button></div></div>
    <div class="rm-hero"><div><div class="rm-k">${esc(raceNameOf())} · ${n != null && n > 0 ? 'dans ' + n + ' jour' + (n > 1 ? 's' : '') : n === 0 ? 'Jour de course' : 'Course terminée'}</div>
      <div class="rm-pace num">${fmtPace(m.pace)}<small>/km</small></div></div>
      <div class="rm-side"><div><span class="num">${fmtHMS(S.settings.targetSec)}</span><small>objectif</small></div><div><span class="num">${(3600 / m.pace).toFixed(1).replace('.', ',')}</span><small>km/h</small></div></div></div></div></div>
    <main class="wrap racemode"><section class="card stack">${raceWeatherHTML()}<div class="tablewrap"><table class="rm-table"><thead><tr><th>Repère</th><th>Passage</th><th>Allure /km</th></tr></thead><tbody>${body}</tbody></table></div>
      ${S.settings.raceNote ? `<p class="racenote">${esc(S.settings.raceNote).replace(/\n/g, '<br>')}</p>` : ''}
      <p class="sub">${m.cautious ? 'Départ prudent : ' + String(m.K).replace('.', ',') + ' premiers km à +' + String(m.d).replace('.', ',') + ' s/km, puis un peu plus vite.' : 'Allure régulière du début à la fin.'}</p>
      <div class="row noprint"><button class="btn small" data-act="printrace">Imprimer cette page</button><button class="btn small" data-act="copyrace">Copier en texte</button></div>
      ${S.msg.race ? `<p class="sub noprint" role="status">${esc(S.msg.race)}</p>` : ''}</section></main>`;
}

function render() {
  applyTheme();
  const y = window.scrollY;
  const old = document.querySelector('#modal .panel');
  const top = old ? old.scrollTop : 0;
  $app.innerHTML = '<div id="shell">' + shellHTML() + '</div><div id="modal">' + modalHTML() + '</div>';
  window.scrollTo(0, y);
  const nw = document.querySelector('#modal .panel');
  if (nw) nw.scrollTop = top;
}
function renderModal() {
  const old = document.querySelector('#modal .panel');
  const top = old ? old.scrollTop : 0;
  document.getElementById('modal').innerHTML = modalHTML();
  const nw = document.querySelector('#modal .panel');
  if (nw) nw.scrollTop = top;
}
