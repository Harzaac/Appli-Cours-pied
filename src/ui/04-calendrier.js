/* ----- Plan : semaine ----- */
function stepsCompact(day) {
  const c = ctx();
  return '<ul class="steps">' + day.steps.map((st) => {
    const t = describeStep(st, c);
    return `<li class="tone-${t.tone}"><span class="bar"></span><span class="tx"><span class="t1">${esc(t.title)}</span>${t.sub[0] ? `<span class="t2">${esc(t.sub[0])}</span>` : ''}</span></li>`;
  }).join('') + '</ul>';
}
const HARD = ['vma', 'spe', 'long'];
function swapSlots(a, b) {
  const ca = S.moves[a] || a, cb = S.moves[b] || b;
  S.moves[a] = cb; S.moves[b] = ca;
  if (S.moves[a] === a) delete S.moves[a];
  if (S.moves[b] === b) delete S.moves[b];
  const ta = S.tracking[a], tb = S.tracking[b];
  delete S.tracking[a]; delete S.tracking[b];
  if (tb) S.tracking[a] = tb;
  if (ta) S.tracking[b] = ta;
}
function resetWeek(w) {
  let guard = 0;
  while (guard++ < 10) {
    const k = w.days.find((d) => S.moves[d.date]);
    if (!k) break;
    swapSlots(k.date, S.moves[k.date]);
  }
  S.ui.moveNote = null; S.ui.moving = null;
  rebuildIndex(); saveStore(); render();
}
function hardPairs(week) {
  const out = [];
  for (let k = 0; k < 6; k++) {
    const x = S.byDate[week.days[k].date].day, y = S.byDate[week.days[k + 1].date].day;
    if (HARD.includes(x.category) && HARD.includes(y.category)) out.push(x.date + '|' + y.date);
  }
  return out;
}
function canMove(day) { return !day.rest && day.category !== 'race'; }
function doMove(a, b) {
  const ra = S.byDate[a], rb = S.byDate[b];
  S.ui.moving = null;
  if (!ra || !rb || a === b || ra.week !== rb.week || ra.day.category === 'race' || rb.day.category === 'race') { render(); return; }
  const before = hardPairs(ra.week);
  const nameA = dayChipLabel(ra.day), nameB = rb.day.rest ? 'repos' : dayChipLabel(rb.day);
  swapSlots(a, b);
  rebuildIndex(); saveStore();
  const fresh = hardPairs(ra.week).filter((p) => !before.includes(p));
  let text = 'Séance déplacée : ' + frDate(a, true).toLowerCase() + ' ↔ ' + frDate(b, true).toLowerCase() + '.';
  let warn = false;
  if (fresh.length) {
    warn = true;
    const [d1, d2] = fresh[0].split('|');
    text = 'Attention : ' + dayChipLabel(S.byDate[d1].day).toLowerCase() + ' (' + frDate(d1, true).toLowerCase() + ') et ' + dayChipLabel(S.byDate[d2].day).toLowerCase() + ' (' + frDate(d2, true).toLowerCase() + ') se suivent, sans jour facile entre les deux.';
  }
  S.ui.moveNote = { text, warn, a, b };
  render();
}
function moveNotice(w) {
  const mv = S.ui.moving && S.byDate[S.ui.moving];
  const n = S.ui.moveNote;
  const any = w.days.some((d) => S.moves[d.date]);
  let h = '';
  if (mv && mv.week === w) h += `<div class="movebar"><span>Choisis le jour où placer la séance du <strong>${esc(frDate(S.ui.moving, true).toLowerCase())}</strong> (les deux jours s'échangent).</span><button class="btn small" data-act="movecancel">Annuler</button></div>`;
  else if (n && S.byDate[n.a] && S.byDate[n.a].week === w) h += `<div class="movebar ${n.warn ? 'warn' : ''}" role="status"><span>${esc(n.text)}</span><button class="btn small" data-act="moveundo">Annuler le déplacement</button></div>`;
  if (any) h += `<div><button class="linkbtn" data-act="resetweek">Remettre cette semaine comme dans le plan du coach</button></div>`;
  return h ? `<div class="stack" style="gap:8px;margin-top:10px">${h}</div>` : '';
}
function dayCard(day) {
  const tr = track(day.date);
  const cls = ['dcard'];
  if (day.rest) cls.push('rest');
  if (day.date === TODAY) cls.push('today');
  if (tr.done) cls.push('done');
  if (tr.skipped) cls.push('skipped');
  const moving = S.ui.moving;
  const refw = S.byDate[day.date].week;
  const target = moving && moving !== day.date && S.byDate[moving] && S.byDate[moving].week === refw && day.category !== 'race';
  if (moving === day.date) cls.push('moving');
  if (target) cls.push('target');
  const drag = canMove(day) ? ' draggable="true"' : '';
  const slot = ` data-slot="${day.date}" data-wk="${esc(refw.key)}" data-race="${day.category === 'race' ? 1 : 0}"`;
  const qc = day.rest ? '' : `<button class="qcheck${tr.done ? ' on' : ''}" data-act="quickdone" data-date="${day.date}" aria-pressed="${!!tr.done}" aria-label="${tr.done ? 'Séance faite, décocher' : 'Marquer la séance comme faite'} (${DOW[day.i].toLowerCase()} ${parseISO(day.date).getUTCDate()})">${tr.done ? ICON.check + '<span>Fait</span>' : ''}</button>`;
  const head = `<div class="dhead"><div><span class="dow">${DOW_SHORT[day.i]}</span><span class="dnum num">${parseISO(day.date).getUTCDate()}</span></div><div class="dright">${tr.skipped && !tr.done ? `<span class="tick skip" title="Séance sautée">${ICON.cross}<span class="sr">Séance sautée</span></span>` : ''}${qc}</div></div>`;
  const movedTag = day.from ? `<span class="badge moved">Décalée depuis ${DOW_SHORT[weekdayIndex(day.from)].toLowerCase()}.</span>` : '';
  const logs = logsOf(day.date);
  const dayRaces = racesOn(day.date);
  const logChips = logs.length || dayRaces.length ? `<ul class="loglist">${dayRaces.map((r) => `<li>${raceChip(r)}</li>`).join('')}${logs.map((l) => `<li><span class="chip c-free">${esc(logLine(l))}</span></li>`).join('')}</ul>` : '';
  const dayLbl = DOW[day.i].toLowerCase() + ' ' + parseISO(day.date).getUTCDate();
  if (day.free) return `<article class="dcard rest free${day.date === TODAY ? ' today' : ''}${logs.length ? ' haslog' : ''}" data-act="open" data-date="${day.date}"><div class="dhead"><div><span class="dow">${DOW_SHORT[day.i]}</span><span class="dnum num">${parseISO(day.date).getUTCDate()}</span></div></div>${wxMini(day.date, false)}${logChips || '<p class="restlabel">Libre</p>'}<button class="addlog" data-act="open" data-date="${day.date}" aria-label="Noter une sortie le ${dayLbl}">+ Noter une sortie</button></article>`;
  if (day.rest) return `<article class="${cls.join(' ')}${logs.length ? ' haslog' : ''}"${slot}${target ? '' : ` data-act="open" data-date="${day.date}"`}>${head}${wxMini(day.date, false)}${logChips || '<p class="restlabel">Repos</p>'}${target ? '' : `<button class="addlog" data-act="open" data-date="${day.date}" aria-label="Noter une sortie le ${dayLbl}">+ Noter une sortie</button>`}${target ? `<button class="btn small" data-act="moveto" data-date="${day.date}">Placer ici</button>` : ''}</article>`;
  const act = target ? `<button class="btn small primary" data-act="moveto" data-date="${day.date}">Échanger ici</button>`
    : `<div class="cardbtns"><button class="btn small" data-act="open" data-date="${day.date}" aria-label="Ouvrir la séance du ${DOW[day.i].toLowerCase()} ${parseISO(day.date).getUTCDate()}">Détail et suivi</button>${canMove(day) ? `<button class="btn small" data-act="movestart" data-date="${day.date}" aria-label="Déplacer cette séance">Déplacer</button>` : ''}</div>`;
  return `<article class="${cls.join(' ')}"${slot}${drag} data-act="open" data-date="${day.date}">${head}${wxMini(day.date, true)}
    <div class="stack" style="gap:6px"><span class="chip c-${day.category}" style="align-self:flex-start">${esc(dayChipLabel(day))}</span>${movedTag}
    <div class="dur num">${esc(dayDuration(day))}</div>${day.objective ? `<div class="obj">${esc(day.objective)}</div>` : ''}</div>
    ${stepsCompact(day)}
    ${dayRaces.length ? `<ul class="loglist">${dayRaces.map((r) => `<li>${raceChip(r)}</li>`).join('')}</ul>` : ''}
    ${logs.length ? `<div class="sub">+ ${esc(logs.map(logLine).join(', '))}</div>` : ''}
    ${act}</article>`;
}
function weekView() {
  const weeks = S.weeks;
  const idx = weeks.findIndex((w) => w.key === S.ui.weekId);
  const w = weeks[idx];
  if (w.free) return freeWeekView(w, idx);
  const planned = w.days.reduce((a, d) => a + (d.durationMin || 0), 0);
  const wd = weekDays(w);
  const nDone = wd.filter((d) => !d.rest && track(d.date).done).length;
  const nSkip = wd.filter((d) => !d.rest && track(d.date).skipped).length;
  const nSess = wd.filter((d) => !d.rest).length;
  const nPast = wd.filter((d) => !d.rest && d.date <= TODAY && !track(d.date).done && !track(d.date).skipped).length;
  return `<div class="toolbar">
      <div class="navgroup"><button class="iconbtn" data-act="prev" aria-label="Semaine précédente" ${idx === 0 ? 'disabled' : ''}>${ICON.left}</button>
        <h2 class="navlabel">${w.id.replace('G', ' G')} · ${frDate(w.start)} → ${frDate(w.end)}</h2>
        <button class="iconbtn" data-act="next" aria-label="Semaine suivante" ${idx === weeks.length - 1 ? 'disabled' : ''}>${ICON.right}</button></div>
      <div class="navgroup">${modeSeg()}<button class="btn small" data-act="today">Aujourd'hui</button><button class="btn small" data-act="tab" data-view="plans">Mes plans</button></div></div>
    <div class="weekhead">${S.plans.length > 1 ? `<span class="badge plan">${esc(planName(curEntry()))}</span>` : ''}<span class="badge">${w.general ? 'Préparation générale' : 'Plan spécifique'}</span>
      ${w.assimilation ? '<span class="badge warn">Semaine d\'assimilation</span>' : ''}
      <span class="muted num">${fmtMin(planned)} prévues · ${nDone}/${nSess} séances faites${nSkip ? ' · ' + nSkip + ' sautée' + (nSkip > 1 ? 's' : '') : ''}</span>${nPast ? `<button class="linkbtn" data-act="bulkdone">Marquer les séances passées comme faites (${nPast})</button>` : ''}</div>
    ${moveNotice(w)}
    ${weatherNotice(w)}
    ${taperBanner(w)}
    <div class="week">${w.days.map((d) => dayCard(S.byDate[d.date].day)).join('')}</div>`;
}
function freeWeekView(w, idx) {
  const weeks = S.weeks;
  return `<div class="toolbar">
      <div class="navgroup"><button class="iconbtn" data-act="prev" aria-label="Semaine précédente" ${idx === 0 ? 'disabled' : ''}>${ICON.left}</button>
        <h2 class="navlabel">${frDate(w.start)} → ${frDate(w.end)}</h2>
        <button class="iconbtn" data-act="next" aria-label="Semaine suivante" ${idx === weeks.length - 1 ? 'disabled' : ''}>${ICON.right}</button></div>
      <div class="navgroup">${modeSeg()}<button class="btn small" data-act="today">Aujourd'hui</button><button class="btn small" data-act="tab" data-view="plans">Mes plans</button></div></div>
    <div class="weekhead"><span class="badge">Pas de plan cette semaine</span>${S.plans.length ? `<span><input type="file" id="file-xlsx" accept=".xlsx" class="sr"><button class="btn small" data-act="pickxlsx">${ICON.up}Ajouter un plan</button></span>` : ''}</div>
    <div class="week">${w.days.map((d) => dayCard(d)).join('')}</div>`;
}
function taperBanner(w) {
  if (!S.plan.raceDate || w.general) return '';
  const toRace = diffDays(S.plan.raceDate, w.start);
  if (toRace > 14 || toRace < 0) return '';
  const mins = (x) => x.days.reduce((a, d) => a + (d.durationMin || 0), 0);
  const peak = Math.max(...S.plan.weeks.filter((x) => !x.general).map(mins));
  const cur = mins(w);
  const raceWeek = toRace < 7;
  const drop = peak > 0 && cur > 0 ? Math.round((1 - cur / peak) * 100) : 0;
  const tips = raceWeek
    ? ['Rien de nouveau : chaussures, tenue, gels et petit-déjeuner déjà testés à l\'entraînement.', 'Prépare ton sac et ton plan de course dès le début de semaine (onglet Course).', 'Dors régulièrement, surtout les deux nuits avant la course : la veille compte moins.', 'Garde les allures du plan, même si les jambes sont impatientes.']
    : ['Le volume baisse, pas l\'intensité : garde les allures prévues sans en faire plus.', 'Rien de nouveau : pas de nouvelles chaussures, de nouvelle tenue ni de nouveaux aliments.', 'Teste ton petit-déjeuner et tes gels de course lors d\'une séance, pas le jour J.', 'Hydratation et sommeil réguliers.'];
  return `<section class="taper" aria-label="Affûtage"><div class="taperhead"><strong>${raceWeek ? 'Semaine de la course' : 'Affûtage'}</strong><span class="muted num">${fmtMin(cur)} prévues${drop > 0 ? ' · ' + drop + ' % de moins que ta semaine la plus chargée (' + fmtMin(peak) + ')' : ''}</span></div>
    <ul>${tips.map((t) => '<li>' + esc(t) + '</li>').join('')}</ul></section>`;
}
function modeSeg() {
  return `<div class="seg" role="group" aria-label="Affichage"><button data-act="mode" data-mode="week" aria-pressed="${S.ui.mode === 'week'}">Semaine</button><button data-act="mode" data-mode="month" aria-pressed="${S.ui.mode === 'month'}">Mois</button></div>`;
}

/* ----- Plan : mois ----- */
function monthView() {
  const keys = monthKeys();
  const i = keys.indexOf(S.ui.monthKey);
  const [y, m] = S.ui.monthKey.split('-').map(Number);
  const first = y + '-' + pad2(m) + '-01';
  const off = weekdayIndex(first);
  const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const total = Math.ceil((off + dim) / 7) * 7;
  const cells = [];
  for (let k = 0; k < total; k++) {
    const date = addDays(first, k - off);
    const inMonth = date.slice(0, 7) === S.ui.monthKey;
    const ref = S.byDate[date];
    const n = parseISO(date).getUTCDate();
    const cls = ['mcell'];
    if (!inMonth) cls.push('out');
    if (date === TODAY) cls.push('today');
    const tr = track(date);
    if (ref && !ref.day.rest && !ref.day.free) {
      const d = ref.day;
      cells.push(`<button class="${cls.join(' ')}" data-act="open" data-date="${date}" aria-label="${esc(frDate(date, true) + ' : ' + dayChipLabel(d))}">
        <span class="n num"><span>${n}</span>${tr.done ? `<span class="tick">${ICON.check}</span>` : tr.skipped ? `<span class="tick skip">${ICON.cross}</span>` : ''}</span>
        <span><span class="chip c-${d.category}">${esc(dayChipLabel(d))}</span><span class="dot d-${d.category}"></span><span class="dd num" style="display:block;margin-top:4px">${esc(dayDuration(d))}</span>${wxMonth(date)}</span></button>`);
    } else {
      const real = ref && !ref.day.free;
      const lg = logsOf(date);
      const rc = racesOn(date);
      if (!real && !lg.length && !rc.length) cls.push('empty');
      const inner = `<span class="n num"><span>${n}</span></span>${rc.length ? `<span><span class="chip c-race">${esc(rc[0].name)}</span><span class="dot d-race"></span></span>` : lg.length ? `<span><span class="chip c-free">${esc(logTypeLabel(lg[0].type))}${lg.length > 1 ? ' +' + (lg.length - 1) : ''}</span><span class="dd num" style="display:block;margin-top:4px">${esc(lg[0].min ? fmtMin(lg[0].min) : lg[0].km ? String(lg[0].km).replace('.', ',') + ' km' : '')}</span></span>` : real ? '<span class="dd">Repos</span>' : ''}${ref ? wxMonth(date) : ''}`;
      cells.push(ref ? `<button class="${cls.join(' ')}" data-act="open" data-date="${date}" aria-label="${esc(frDate(date, true))}${lg.length ? ' : ' + esc(lg.map(logLine).join(', ')) : ''}">${inner}</button>` : `<div class="${cls.join(' ')}">${inner}</div>`);
    }
  }
  return `<div class="toolbar">
      <div class="navgroup"><button class="iconbtn" data-act="prev" aria-label="Mois précédent" ${i <= 0 ? 'disabled' : ''}>${ICON.left}</button>
        <h2 class="navlabel">${MONTHS[m - 1].charAt(0).toUpperCase() + MONTHS[m - 1].slice(1)} ${y}</h2>
        <button class="iconbtn" data-act="next" aria-label="Mois suivant" ${i >= keys.length - 1 ? 'disabled' : ''}>${ICON.right}</button></div>
      <div class="navgroup">${modeSeg()}<button class="btn small" data-act="today">Aujourd'hui</button><button class="btn small" data-act="tab" data-view="plans">Mes plans</button></div></div>
    <div class="monthwrap"><div class="month">${DOW_SHORT.map((d) => `<div class="mh"><span class="mhl">${d}</span><span class="mhs">${d.charAt(0)}</span></div>`).join('')}${cells.join('')}</div></div>
    <div class="legend" aria-label="Légende des couleurs"><span class="d-footing"><i></i>Footing</span><span class="d-vma"><i></i>VMA et côtes</span><span class="d-spe"><i></i>Spé marathon</span><span class="d-long"><i></i>Sortie longue</span><span class="d-race"><i></i>Course</span></div>`;
}

/* ----- fenêtre de détail ----- */
const FEELS = ['Très dur', 'Dur', 'Correct', 'Bien', 'Super'];
function fitTol() { const v = S.settings && S.settings.fitTol; return v >= 1 && v <= 30 ? v : 5; }
function garminHTML(day) {
  if (day.rest || day.category === 'race') return '';
  const info = S.ui.fitInfo;
  return `<div class="stack garmin" style="gap:8px"><div class="row between"><div style="font-weight:700">Montre Garmin</div>
      <button class="iconbtn" data-act="fitinfo" aria-label="Comment installer la séance sur la montre" aria-expanded="${!!info}">ⓘ</button></div>
    ${info ? `<div class="fitinfo" role="note"><strong>Installer la séance sur la Forerunner 945</strong><ol>
      <li>Branche la montre au PC avec son câble.</li>
      <li>Dans l'explorateur, ouvre « Forerunner 945 », puis <em>Primary</em> (ou « Stockage interne »), puis <em>GARMIN</em>, puis <em>NewFiles</em>.</li>
      <li>Glisse le fichier .fit dans ce dossier <em>NewFiles</em>.</li>
      <li>Débranche la montre : elle enregistre la séance.</li>
      <li>Sur la montre : Course à pied, maintiens le bouton du haut, puis Entraînement › Séances, et choisis la séance.</li></ol>
      <p class="sub">Les chemins et menus peuvent varier selon la version de la montre : si tu ne trouves pas, dis-le-moi et on ajuste.</p></div>` : ''}
    <div class="row"><button class="btn small primary" data-act="fitexport">Exporter pour Garmin (.fit)</button>
      <label class="fittol" for="fit-tol">Tolérance allure ± <input type="text" id="fit-tol" inputmode="numeric" value="${fitTol()}" autocomplete="off"> s/km</label></div>
    ${S.msg.fit ? `<p class="${S.msg.fitErr ? 'errtxt' : 'sub'}" role="status">${esc(S.msg.fit)}</p>` : ''}</div>`;
}
function modalHTML() {
  const date = S.ui.modal;
  const ref = date && S.byDate[date];
  if (!ref) return '';
  const { week, day } = ref;
  const tr = track(date);
  const c = ctx(ref.entry);
  const steps = day.steps.map((st) => {
    const t = describeStep(st, c);
    return `<li class="tone-${t.tone}"><span class="bar"></span><div><div class="t1">${esc(t.title)}${t.review ? ' <span class="badge warn">à vérifier</span>' : ''}</div>${t.sub.map((s) => `<div class="t2">${esc(s)}</div>`).join('')}</div></li>`;
  }).join('');
  const rawTxt = [day.typeText, day.objective].filter(Boolean).concat(day.lines, day.durationText ? ['Durée : ' + day.durationText] : []).join('\n');
  const prev = S.byDate[addDays(date, -1)], nxt = S.byDate[addDays(date, 1)];
  return `<div class="overlay" data-act="closebg"><div class="panel" role="dialog" aria-modal="true" aria-label="Séance du ${esc(frDate(date, true))}">
    <div class="row between">
      <div class="row"><button class="iconbtn" data-act="daynav" data-d="-1" aria-label="Jour précédent" ${prev ? '' : 'disabled'}>${ICON.left}</button>
        <button class="iconbtn" data-act="daynav" data-d="1" aria-label="Jour suivant" ${nxt ? '' : 'disabled'}>${ICON.right}</button></div>
      <button class="iconbtn" data-act="close" aria-label="Fermer">${ICON.cross}</button></div>
    <div class="stack" style="gap:8px">
      <div class="muted">${esc(frDate(date, true))}${week.id ? ' · ' + week.id.replace('G', ' G') : ''}${S.plans.length > 1 && ref.entry ? ' · ' + esc(planName(ref.entry)) : ''}${week.assimilation ? ' · semaine d\'assimilation' : ''}</div>
      ${day.free ? '<h2>Jour libre</h2>' : day.rest ? '<h2>Repos</h2>' : `<h2>${esc(day.category === 'race' ? raceNameOf(ref.entry) : mainStepTitle(day, c, ref.entry))}</h2>
      <div class="row"><span class="chip c-${day.category}">${esc(dayChipLabel(day))}</span><span class="num"><strong>${esc(dayDuration(day))}</strong></span>${day.objective ? `<span class="muted">${esc(day.objective)}</span>` : ''}</div>`}
    </div>
    ${day.free ? '<p class="muted">Aucun plan ne couvre ce jour.</p>' : day.rest ? '<p class="muted">Pas de séance prévue ce jour-là.</p>' : `<ul class="bigsteps">${steps}</ul>
    ${day.category === 'race' ? raceResultHTML(date, tr, ref.entry) : ''}
    <details class="raw"><summary>Texte du coach</summary><pre>${esc(rawTxt)}</pre></details>
    ${garminHTML(day)}
    <div class="stack">
      <button class="btn toggle-done" data-act="done" aria-pressed="${!!tr.done}">${tr.done ? ICON.check + 'Séance faite' : 'Marquer la séance comme faite'}</button>
      <button class="btn small" data-act="skip" aria-pressed="${!!tr.skipped}">${tr.skipped ? 'Séance sautée · annuler' : 'Marquer comme sautée'}</button>
      <div class="stack" style="gap:6px"><div style="font-weight:700">Sensations</div>
        <div class="feel" role="group" aria-label="Sensations">${FEELS.map((f, i) => `<button data-act="feel" data-n="${i + 1}" aria-pressed="${tr.feel === i + 1}">${f}</button>`).join('')}</div></div>
      <div class="field"><label for="note-input">Notes</label><textarea class="note" id="note-input" placeholder="Allure réelle, terrain, fatigue…">${esc(tr.note || '')}</textarea></div>
    </div>`}
    ${racesModalHTML(date)}
    ${logsHTML(date, day)}
  </div></div>`;
}

/* ----- résultat de course ----- */
function raceResultHTML(date, tr, entry) {
  const tgt = entry && entry.settings ? entry.settings.targetSec : null;
  const diff = tr.result && tgt ? tr.result - tgt : null;
  return `<div class="stack resultbox"><div style="font-weight:700">Ton résultat</div>
    <div class="fields"><div class="field"><label for="race-result">Chrono officiel</label><input type="text" id="race-result" value="${tr.result ? esc(fmtHMS(tr.result)) : ''}" placeholder="3h25'00" autocomplete="off"></div>
      <div class="field"><label>&nbsp;</label><label class="check"><input type="checkbox" id="race-pr"${tr.pr ? ' checked' : ''}> Record personnel</label></div></div>
    ${S.msg.result ? `<p class="errtxt" role="alert">${esc(S.msg.result)}</p>` : tr.result ? `<p class="sub">${tgt ? 'Objectif ' + esc(fmtHMS(tgt)) + ' · ' + (diff <= 0 ? esc(fmtHMS(-diff)) + ' de mieux' : esc(fmtHMS(diff)) + ' de plus') + ' · ' : ''}${esc(fmtPace(tr.result / MARATHON_KM))}/km de moyenne. Il sert aussi de référence pour les prédictions (onglet VMA).</p>` : '<p class="sub">Saisis ton chrono après la course : il s\'affiche en haut de l\'appli et sert de référence pour les prédictions.</p>'}</div>`;
}

/* ----- sorties libres ----- */
function logsHTML(date, day) {
  const list = logsOf(date);
  const ed = S.ui.logEdit && S.ui.logEdit.date === date ? S.ui.logEdit : null;
  const cur = ed && ed.id ? list.find((l) => l.id === ed.id) || {} : {};
  const title = day.free || day.rest ? 'Sorties' : 'Autres sorties ce jour-là';
  const form = ed ? `<div class="logform stack">
      <div class="fields3"><div class="field"><label for="log-type">Type</label><select id="log-type">${LOG_TYPES.map(([k, n]) => `<option value="${k}"${(cur.type || 'footing') === k ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="field"><label for="log-dur">Durée</label><input type="text" id="log-dur" value="${cur.min ? esc(fmtMin(cur.min)) : ''}" placeholder="45 ou 1h05" autocomplete="off"></div>
        <div class="field"><label for="log-km">Distance (km)</label><input type="text" id="log-km" inputmode="decimal" value="${cur.km ? String(cur.km).replace('.', ',') : ''}" placeholder="facultatif" autocomplete="off"></div></div>
      <div class="feel" role="group" aria-label="Sensations">${FEELS.map((f, i) => `<button data-act="logfeel" data-n="${i + 1}" aria-pressed="${ed.feel === i + 1}">${f}</button>`).join('')}</div>
      <div class="field"><label for="log-note">Note</label><textarea class="note" id="log-note" rows="2" placeholder="Parcours, allure, fatigue…">${esc(cur.note || '')}</textarea></div>
      ${S.msg.log ? `<p class="errtxt" role="alert">${esc(S.msg.log)}</p>` : ''}
      <div class="row"><button class="btn small primary" data-act="logsave">Enregistrer</button><button class="btn small" data-act="logcancel">Annuler</button></div></div>` : '';
  const items = list.map((l) => `<li class="logitem"><div class="stack" style="gap:2px"><strong>${esc(logLine(l))}</strong>${l.feel ? `<span class="sub">${FEELS[l.feel - 1]}</span>` : ''}${l.note ? `<span class="sub">${esc(l.note)}</span>` : ''}</div>
      <div class="row"><button class="btn small" data-act="logedit" data-id="${esc(l.id)}">Modifier</button><button class="btn small" data-act="logdel" data-id="${esc(l.id)}">Supprimer</button></div></li>`).join('');
  return `<section class="stack logsec"><div style="font-weight:700">${title}</div>
    ${items ? `<ul class="logitems">${items}</ul>` : ''}
    ${form || `<div class="row"><button class="btn small" data-act="lognew">+ Noter une sortie</button><button class="btn small" data-act="racedraft" data-date="${date}">+ Ajouter une course ce jour-là</button></div>`}</section>`;
}
function saveLog() {
  const ed = S.ui.logEdit;
  if (!ed) return;
  const type = (document.getElementById('log-type') || {}).value || 'footing';
  const durTxt = ((document.getElementById('log-dur') || {}).value || '').trim();
  const kmTxt = ((document.getElementById('log-km') || {}).value || '').trim().replace(',', '.');
  const note = ((document.getElementById('log-note') || {}).value || '').trim();
  const min = durTxt ? parseDurationMin(durTxt) : null;
  const km = kmTxt ? Number(kmTxt) : null;
  if (durTxt && min == null) { S.msg.log = 'Durée non comprise : écris par exemple 45 ou 1h05.'; return; }
  if (kmTxt && !(km > 0 && km < 400)) { S.msg.log = 'Distance non comprise : écris par exemple 8 ou 10,5.'; return; }
  if (!min && !km) { S.msg.log = 'Indique au moins une durée ou une distance.'; return; }
  const list = S.logs[ed.date] || [];
  const item = { id: ed.id || Date.now().toString(36), type, min: min || null, km: km || null, feel: ed.feel || 0, note };
  const k = list.findIndex((l) => l.id === item.id);
  if (k >= 0) list[k] = item; else list.push(item);
  S.logs[ed.date] = list;
  S.ui.logEdit = null; S.msg.log = '';
  saveStore();
}
function deleteLog(date, id) {
  const list = (S.logs[date] || []).filter((l) => l.id !== id);
  if (list.length) S.logs[date] = list; else delete S.logs[date];
  saveStore();
}
