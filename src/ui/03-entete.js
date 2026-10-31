/* ============================================================
   Écrans
   ============================================================ */
// Le rond du bandeau : un clic ouvre un petit menu pour changer l'image (comme une photo de profil).
function crestHTML() {
  const img = S.crest ? `<img src="${S.crest}" alt="">` : `<img src="${CLUB_LOGO}" alt="">`;
  const menu = S.ui.crestMenu ? `<div class="crestmenu" role="menu"><button role="menuitem" data-act="pickcrest">${ICON.up}Choisir une photo</button>${S.crest ? `<button role="menuitem" data-act="crestreset">Remettre le logo du club</button>` : ''}<button role="menuitem" data-act="crestclose">Annuler</button>${S.msg.crest ? `<p class="errtxt" role="alert">${esc(S.msg.crest)}</p>` : ''}</div>` : '';
  return `<div class="crestwrap"><input type="file" id="file-crest" accept="image/*" class="sr"><button class="crest${S.crest ? '' : ' club'}" data-act="crestmenu" aria-haspopup="menu" aria-expanded="${!!S.ui.crestMenu}" aria-label="Changer l'image du bandeau (actuellement : ${S.crest ? 'ta photo' : esc(CLUB_NAME)})">${img}<span class="crestedit" aria-hidden="true">${ICON.edit}</span></button>${menu}</div>`;
}
function headerHTML() {
  const plan = S.plan;
  const c = ctx();
  const n = plan.raceDate ? diffDays(plan.raceDate, TODAY) : null;
  const res = plan.raceDate ? track(plan.raceDate) : {};
  const chrono = n != null && n <= 0 && res.result;
  let big = n == null ? '' : chrono ? fmtHMS(res.result) : n > 0 ? 'J-' + n : n === 0 ? 'Jour J' : 'Bravo';
  const tgt = S.settings && S.settings.targetSec;
  let lbl = n == null ? '' : chrono
    ? '<strong>' + esc(raceNameOf()) + (res.pr ? ' · record personnel' : '') + '</strong><span>' + frDate(plan.raceDate, true) + (tgt ? ' · objectif ' + fmtHMS(tgt) : '') + '</span>'
    : n >= 0
    ? '<strong>' + (n === 0 ? 'Aujourd\'hui, c\'est la course' : 'avant le marathon') + '</strong><span>' + frDate(plan.raceDate, true) + '</span>'
    : '<strong>Marathon couru</strong><span>' + frDate(plan.raceDate, true) + ' · <button class="linkbtn onband" data-act="open" data-date="' + plan.raceDate + '">saisir mon chrono</button></span>';
  // plan sans course (plan de reprise) : on montre la semaine en cours du plan
  if (!plan.raceDate) {
    const ws = plan.weeks, k = ws.findIndex((w) => TODAY >= w.start && TODAY <= w.end);
    if (TODAY < ws[0].start) { const d = diffDays(ws[0].start, TODAY); big = 'J-' + d; lbl = '<strong>avant le début du plan</strong><span>' + esc(planName(curEntry())) + ' · ' + frDate(ws[0].start, true) + '</span>'; }
    else if (k >= 0) { big = 'S' + (k + 1); lbl = '<strong>semaine ' + (k + 1) + ' sur ' + ws.length + '</strong><span>' + esc(planName(curEntry())) + ' · jusqu\'au ' + frDate(ws[ws.length - 1].end) + '</span>'; }
    else { big = 'Fini'; lbl = '<strong>plan terminé</strong><span>' + esc(planName(curEntry())) + '</span>'; }
  }
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
          ${profilePill()}
        </div></div>
      <div class="hero"><div class="herol">${crestHTML()}<div class="count"><span class="big num${chrono ? ' chrono' : ''}">${big}</span><span class="lbl">${lbl}</span></div></div>${next}</div>
    </div></div>
    <nav class="wrap tabs" aria-label="Sections">
      ${tabsHTML(!!plan.raceDate)}
    </nav></header>`;
}

// Onglets : « Mes plans » dépend du Calendrier ; Paramètres se réduit à une roue dentée sur petit écran.
function profilePill() { return `<button class="pill profpill" data-act="tab" data-view="profile" aria-label="Mon profil"${S.ui.view === 'profile' ? ' aria-current="page"' : ''}>${avatarHTML()}<span>${esc(S.profile.name || 'Mon profil')}</span></button>`; }
function tabsHTML(withPlan) {
  const list = [['plan', 'Calendrier'], ['vma', 'VMA']].concat(withPlan ? [['race', 'Course']] : [], [['bilan', 'Progression'], ['data', 'Paramètres']]);
  const cur = S.ui.view === 'plans' ? 'plan' : S.ui.view;
  return list.map(([v, l]) => `<button data-act="tab" data-view="${v}" ${cur === v ? 'aria-current="page"' : ''}${v === 'data' ? ' class="tabgear" aria-label="Paramètres"' : ''}>${v === 'data' ? ICON.gear + '<span>' + l + '</span>' : l}</button>`).join('');
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
    if (ref.day.rest || (!ref.entry && !ref.day.custom)) continue;
    if (d === TODAY && (track(d).done || track(d).skipped)) continue;
    return ref;
  }
  return null;
}
function footHTML() {
  return `<footer class="foot"><div class="wrap"><p>Tes plans d'entraînement et tes sorties dans un même calendrier. Les allures sont calculées à partir de ta VMA et de ton objectif. Tes données restent sur cet appareil : pense à exporter ton profil (bouton en haut à droite).</p><p class="ver">${APP_NAME} · ${CLUB_NAME} · version 3.11</p></div></footer>`;
}
