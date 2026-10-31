document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  if (act === 'closebg') { if (ev.target === el) { S.ui.modal = null; renderModal(); } return; }
  if (el.tagName === 'ARTICLE' && ev.target.closest('button') && ev.target.closest('button') !== el) return;
  switch (act) {
    case 'tab': S.ui.view = el.dataset.view; S.imp = S.plan ? { stage: 'idle' } : S.imp; S.msg = {}; render(); window.scrollTo(0, 0); break;
    case 'theme': S.ui.theme = effectiveDark() ? 'light' : 'dark'; saveStore(); render(); break;
    case 'mode': S.ui.mode = el.dataset.mode; if (S.ui.mode === 'month') { const w = weekByKey(S.ui.weekId); const k = w.start.slice(0, 7); if (monthKeys().includes(k)) S.ui.monthKey = k; } else { const ref = S.byDate[S.ui.monthKey + '-15'] || S.byDate[S.ui.monthKey + '-01']; if (ref) { S.ui.weekId = ref.week.key; syncActiveToWeek(); } } render(); break;
    case 'prev': go(-1); render(); break;
    case 'next': go(1); render(); break;
    case 'today': goToday(); render(); break;
    case 'open': { const ref = S.byDate[el.dataset.date]; if (ref && ref.entry && ref.entry.id !== S.activeId) { activate(ref.entry.id); render(); } S.ui.modal = el.dataset.date; renderModal(); break; }
    case 'close': S.ui.modal = null; S.ui.logEdit = null; S.msg.log = ''; S.msg.result = ''; renderModal(); break;
    case 'movestart': S.ui.moving = el.dataset.date; S.ui.moveNote = null; render(); break;
    case 'movecancel': S.ui.moving = null; render(); break;
    case 'moveto': doMove(S.ui.moving, el.dataset.date); break;
    case 'moveundo': { const n = S.ui.moveNote; S.ui.moveNote = null; if (n) doMove(n.a, n.b); S.ui.moveNote = null; render(); break; }
    case 'resetweek': resetWeek(weekByKey(S.ui.weekId)); break;
    case 'daynav': { const d = addDays(S.ui.modal, Number(el.dataset.d)); const ref = S.byDate[d]; S.ui.logEdit = null; S.msg.log = ''; S.msg.result = ''; if (ref) { if (ref.entry && ref.entry.id !== S.activeId) { activate(ref.entry.id); S.ui.weekId = ref.week.key; render(); } S.ui.modal = d; renderModal(); } break; }
    case 'accent': S.ui.accent = el.dataset.id; saveStore(); render(); break;
    case 'quickdone': setTrack(el.dataset.date, { done: !track(el.dataset.date).done, skipped: false }); render(); break;
    case 'done': setTrack(S.ui.modal, { done: !track(S.ui.modal).done, skipped: false }); render(); break;
    case 'fitinfo': S.ui.fitInfo = !S.ui.fitInfo; renderModal(); break;
    case 'fitexport': exportFit(); break;
    case 'skip': setTrack(S.ui.modal, { skipped: !track(S.ui.modal).skipped, done: false }); render(); break;
    case 'bulkdone': { const w = weekByKey(S.ui.weekId); weekDays(w).forEach((d) => { if (!d.rest && d.date <= TODAY && !track(d.date).done && !track(d.date).skipped) setTrack(d.date, { done: true }); }); render(); break; }
    case 'racemode': if (el.dataset.id && entryOf(el.dataset.id)) activate(el.dataset.id); S.ui.raceMode = true; render(); window.scrollTo(0, 0); break;
    case 'racequit': S.ui.raceMode = false; render(); break;
    case 'feel': { const n = Number(el.dataset.n); setTrack(S.ui.modal, { feel: track(S.ui.modal).feel === n ? 0 : n }); renderModal(); break; }
    case 'strategy': S.ui.strategy = el.dataset.s; render(); break;
    case 'ravmode': { const r = ravSettings(); S.settings.rav = { mode: el.dataset.m, every: el.dataset.m === 'min' ? 30 : 5 }; S.msg.rav = ''; saveStore(); render(); break; }
    case 'printrace': try { window.print(); } catch (e) { S.msg.race = "L'impression n'est pas disponible ici : ouvre le fichier dans ton navigateur."; render(); } break;
    case 'copyrace': copyText(raceText(), () => { S.msg.race = 'Texte copié : colle-le dans tes notes ou un message.'; render(); }, () => { S.msg.race = 'La copie est bloquée ici. Ouvre le fichier dans ton navigateur.'; render(); }); break;
    case 'raceadd': if (addRace()) { toast('Course ajoutée'); } render(); break;
    case 'racedel': if (S.ui.confirmRace !== el.dataset.id) { S.ui.confirmRace = el.dataset.id; render(); } else { S.races = S.races.filter((r) => r.id !== el.dataset.id); S.ui.confirmRace = null; rebuildIndex(); saveStore(); toast('Course supprimée'); render(); } break;
    case 'racedelcancel': S.ui.confirmRace = null; render(); break;
    case 'racedraft': S.ui.raceDraft = el.dataset.date; S.ui.modal = null; S.ui.view = 'plans'; S.msg.race2 = ''; render(); { const c = document.getElementById('races-card'); if (c) c.scrollIntoView(); const n = document.getElementById('rc-name'); if (n) n.focus(); } break;
    case 'recadd': { const err = addRecoveryPlan(((document.getElementById('rec-date') || {}).value || '')); S.msg.rec = err; if (!err) { S.ui.view = 'plan'; S.ui.mode = 'week'; toast('Plan de reprise ajouté'); } render(); if (!err) window.scrollTo(0, 0); break; }
    case 'lognew': S.ui.logEdit = { date: S.ui.modal, id: null, feel: 0 }; S.msg.log = ''; renderModal(); break;
    case 'logedit': { const l = logsOf(S.ui.modal).find((x) => x.id === el.dataset.id); if (l) { S.ui.logEdit = { date: S.ui.modal, id: l.id, feel: l.feel || 0 }; S.msg.log = ''; renderModal(); } break; }
    case 'logfeel': { const n = Number(el.dataset.n); if (S.ui.logEdit) { keepLogForm(); S.ui.logEdit.feel = S.ui.logEdit.feel === n ? 0 : n; renderModal(); restoreLogForm(); } break; }
    case 'logcancel': S.ui.logEdit = null; S.msg.log = ''; renderModal(); break;
    case 'logsave': keepLogForm(); saveLog(); render(); if (S.ui.logEdit) restoreLogForm(); else toast('Sortie enregistrée'); break;
    case 'commit': commitFields(); break;
    case 'logdel': deleteLog(S.ui.modal, el.dataset.id); if (S.ui.logEdit && S.ui.logEdit.id === el.dataset.id) S.ui.logEdit = null; render(); break;
    case 'refset': {
      const km = Number((document.getElementById('ref-km') || {}).value);
      const raw = ((document.getElementById('ref-time') || {}).value || '').trim();
      const sec = parseChrono(raw);
      if (!km || sec == null) { S.msg.ref = "Le chrono doit ressembler à 3h25'00, 3:25:00 ou 45'30."; render(); break; }
      S.profile.ref = { km, sec, label: 'saisi le ' + frDate(TODAY) }; S.msg.ref = ''; saveStore(); render(); break;
    }
    case 'refclear': delete S.profile.ref; S.msg.ref = ''; saveStore(); render(); break;
    case 'tmode': S.settings.targetMode = el.dataset.m; S.msg.level = ''; saveStore(); render(); break;
    case 'resetvals': if (!S.plan) break; S.settings = makeSettings(S.plan); S.msg.level = ''; saveStore(); render(); break;
    case 'pickxlsx': { const inp = document.getElementById('file-xlsx'); if (inp) inp.click(); break; }
    case 'wxtoggle': wxSet({ on: !wxCfg().on }); if (wxCfg().on) fetchWeather(true); render(); break;
    case 'wxrefresh': S.msg.wx = ''; fetchWeather(true); render(); break;
    case 'wxsearch': { const q = (document.getElementById('wx-city') || {}).value || ''; if (q.trim()) searchCity(q.trim(), false); break; }
    case 'wxrsearch': { const q = (document.getElementById('wx-rcity') || {}).value || ''; if (q.trim()) searchCity(q.trim(), true); break; }
    case 'pickcrest': { const inp = document.getElementById('file-crest'); if (inp) inp.click(); break; }
    case 'crestreset': S.crest = ''; S.msg.crest = ''; saveStore(); render(); break;
    case 'pickjson': { const inp = document.getElementById('file-json'); if (inp) inp.click(); break; }
    case 'useplan': usePlan(el.dataset.replace || null); break;
    case 'impcancel': S.imp = { stage: 'idle' }; render(); break;
    case 'planshow': showPlan(el.dataset.id); S.ui.view = 'plan'; S.ui.mode = 'week'; render(); window.scrollTo(0, 0); break;
    case 'plandel': if (S.ui.confirmDel !== el.dataset.id) { S.ui.confirmDel = el.dataset.id; render(); } else deletePlan(el.dataset.id); break;
    case 'plandelcancel': S.ui.confirmDel = null; render(); break;
    case 'redate': S.ui.redate = el.dataset.id; S.msg.redate = ''; render(); break;
    case 'redatecancel': S.ui.redate = null; S.msg.redate = ''; render(); break;
    case 'redateok': { const inp = document.getElementById('redate-' + el.dataset.id); const err = redatePlan(el.dataset.id, inp ? inp.value : ''); S.msg.redate = err; if (!err) { S.ui.redate = null; S.msg.backup = ''; } render(); break; }
    case 'htmlcopy': saveHtmlCopy(false); break;
    case 'copyinfo': S.ui.copyInfo = !S.ui.copyInfo; render(); break;
    case 'ctaoff': { const up = entryOf(el.dataset.id) || upcomingRace(); S.ctaOff = up ? up.id + ':' + up.plan.raceDate : true; saveStore(); render(); break; }
    case 'remindlater': S.remindUntil = addDays(TODAY, 7); saveStore(); render(); break;
    case 'htmlcoach': saveHtmlCopy(true); break;
    case 'download': {
      try {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([backupText()], { type: 'application/json' }));
        a.download = profileFileName();
        S.lastCopy = TODAY; saveStore();
        document.body.appendChild(a); a.click(); a.remove();
        S.msg.backup = 'Profil exporté : « ' + profileFileName() + ' ». Garde ce fichier, c\'est ta sauvegarde.'; toast('Profil exporté');
      } catch (e) { S.msg.backup = 'Le téléchargement est bloqué ici : ouvre l\'appli depuis ton disque.'; }
      render(); break;
    }
    case 'wipe':
      if (!S.ui.confirmWipe) { S.ui.confirmWipe = true; render(); break; }
      try { localStorage.removeItem(KEY); } catch (e) { /* rien */ }
      S.plans = []; S.weeks = []; S.tracking = {}; S.moves = {}; S.logs = {}; S.races = []; S.profile = defaultProfile(); useProfile(); S.crest = ''; S.byDate = {}; S.ui.confirmWipe = false; S.ui.view = 'plan'; S.ui.modal = null; S.imp = { stage: 'idle' };
      S.ui.weekId = null; S.ui.monthKey = null; rebuildIndex();
      render(); break;
    case 'wipecancel': S.ui.confirmWipe = false; render(); break;
    default: break;
  }
});

document.addEventListener('change', (ev) => {
  const t = ev.target;
  if (t.id === 'plan-select') { showPlan(t.value); render(); return; }
  if (t.id === 'imp-race') { if (/^\d{4}-\d{2}-\d{2}$/.test(t.value)) S.imp.raceDate = t.value; render(); return; }
  if (t.id === 'imp-keep') { S.imp.keep = t.checked; render(); return; }
  if (t.id === 'file-xlsx' && t.files && t.files[0]) { const f = t.files[0]; t.value = ''; importFile(f); return; }
  if (/^wx-(wind|rain|hot|cold)$/.test(t.id)) {
    const k = t.id.slice(3), n = Number(norm(t.value).replace(',', '.'));
    const lim = { wind: [10, 100], rain: [10, 100], hot: [10, 40], cold: [-15, 10] }[k];
    if (!(n >= lim[0] && n <= lim[1]) || t.value.trim() === '') S.msg.wx = 'Valeur entre ' + lim[0] + ' et ' + lim[1] + '.';
    else { S.msg.wx = ''; wxSet({ [k]: Math.round(n) }); toast('Seuil météo enregistré'); }
    render(); return;
  }
  if (t.id === 'fit-tol') {
    const n = Number(norm(t.value).replace(',', '.'));
    if (!(n >= 1 && n <= 30)) { S.msg.fitErr = true; S.msg.fit = 'Tolérance entre 1 et 30 s/km.'; } else { S.settings.fitTol = Math.round(n); S.msg.fit = ''; saveStore(); toast('Tolérance enregistrée : ±' + Math.round(n) + ' s/km'); }
    renderModal(); return;
  }
  if (t.id === 'file-crest' && t.files && t.files[0]) { loadCrest(t.files[0]); return; }
  if (t.id === 'file-json' && t.files && t.files[0]) { const f = t.files[0]; f.text().then((txt) => restoreFrom(/\.html?$/i.test(f.name) || /^\s*<(!doctype|html)/i.test(txt) ? embeddedFromHtml(txt) : txt), () => { S.msg.restore = 'Fichier illisible.'; S.msg.restoreErr = true; render(); }); t.value = ''; return; }
  if (t.id === 'race-result' && S.ui.modal) {
    const raw = t.value.trim();
    if (!raw) { setTrack(S.ui.modal, { result: 0 }); S.msg.result = ''; render(); return; }
    const sec = parseChrono(raw);
    if (sec == null) { S.msg.result = "Chrono non compris : écris par exemple 3h25'12 ou 3:25:12."; renderModal(); return; }
    setTrack(S.ui.modal, { result: sec, done: true, skipped: false }); S.msg.result = ''; toast('Chrono enregistré : ' + fmtHMS(sec)); render(); return;
  }
  if (/^rres-/.test(t.id)) {
    const r = S.races.find((x) => x.id === t.id.slice(5)); if (!r) return;
    const raw = t.value.trim(); const sec = raw ? parseChrono(raw) : 0;
    if (raw && sec == null) { toast('Chrono non compris'); return; }
    r.result = sec || 0; saveStore(); if (sec) toast('Chrono enregistré : ' + fmtHMS(sec)); render(); return;
  }
  if (/^rpr-/.test(t.id)) { const r = S.races.find((x) => x.id === t.id.slice(4)); if (r) { r.pr = t.checked; saveStore(); render(); } return; }
  if (t.id === 'pf-name' || t.id === 'pf-club') { S.profile[t.id === 'pf-name' ? 'name' : 'club'] = t.value.trim(); saveStore(); toast('Profil enregistré'); render(); return; }
  if (t.id === 'note-input' && S.ui.modal) { toast('Note enregistrée'); return; }
  if (t.id === 'race-pr' && S.ui.modal) { setTrack(S.ui.modal, { pr: t.checked }); render(); return; }
  if (t.id === 'vma-input') {
    const v = parseVmaInput(t.value);
    if (v == null) S.msg.level = 'La VMA doit être comprise entre 8 et 25 km/h (par exemple 16,5).';
    else { S.settings.vma = v; S.msg.level = ''; saveStore(); toast('VMA enregistrée : ' + fmtVma(v) + ' km/h'); }
    render(); return;
  }
  if (t.id === 'target-input') {
    if (S.settings.targetMode === 'pace') {
      const p = parsePaceInput(t.value);
      if (p == null) S.msg.level = "L'allure doit ressembler à 4'40 ou 4:40 (par km, entre 3'03 et 9'57).";
      else { S.settings.targetSec = Math.round(p * MARATHON_KM); S.msg.level = ''; saveStore(); toast('Objectif enregistré : ' + fmtPace(p) + '/km'); }
    } else {
      const v = parseTarget(t.value);
      if (v == null) S.msg.level = "Le temps visé doit ressembler à 3h15'00 ou 3:15:00 (entre 1h30 et 7h).";
      else { S.settings.targetSec = v; S.msg.level = ''; saveStore(); toast('Objectif enregistré : ' + fmtHMS(v)); }
    }
    render(); return;
  }
  if (t.id === 'race-note') { S.settings.raceNote = t.value; saveStore(); toast('Notes de course enregistrées'); render(); return; }
  if (t.id === 'rav-every') {
    const r = ravSettings(); const n = Number(norm(t.value).replace(',', '.'));
    const [lo, hi] = r.mode === 'min' ? [5, 60] : [1, 20];
    if (!(n >= lo && n <= hi) || t.value.trim() === '') S.msg.rav = 'Valeur entre ' + lo + ' et ' + hi + (r.mode === 'min' ? ' minutes.' : ' km.');
    else { S.settings.rav = { mode: r.mode, every: n }; S.msg.rav = ''; saveStore(); toast('Ravitaillement enregistré'); }
    render(); return;
  }
  if (t.id === 'caut-pace') {
    const p = parsePaceInput(t.value), pace = passageModel().pace;
    const d = p == null ? null : Math.round((p - pace) * 10) / 10;
    if (d == null || d < 0 || d > 15) S.msg.caut = "L'allure du départ doit être entre " + fmtPace(pace) + ' et ' + fmtPace(pace + 15) + "/km (plus lente que l'allure marathon).";
    else { S.settings.cautD = d; S.msg.caut = ''; saveStore(); toast('Départ prudent enregistré'); }
    render(); return;
  }
  if (t.id === 'caut-km' || t.id === 'caut-d') {
    const n = Number(norm(t.value).replace(',', '.'));
    const km = t.id === 'caut-km';
    if (!(n >= (km ? 1 : 0) && n <= (km ? 35 : 15)) || t.value.trim() === '') S.msg.caut = km ? 'Distance entre 1 et 35 km.' : 'Écart entre 0 et 15 s/km.';
    else { S.settings[km ? 'cautKm' : 'cautD'] = n; S.msg.caut = ''; saveStore(); toast('Départ prudent enregistré'); }
    render(); return;
  }
});
document.addEventListener('input', (ev) => {
  if (ev.target.id === 'note-input' && S.ui.modal) setTrack(S.ui.modal, { note: ev.target.value });
});
document.addEventListener('dragstart', (ev) => {
  const a = ev.target.closest && ev.target.closest('article[data-slot][draggable="true"]');
  if (!a) return;
  S.ui.drag = a.dataset.slot;
  try { ev.dataTransfer.setData('text/plain', a.dataset.slot); ev.dataTransfer.effectAllowed = 'move'; } catch (e) { /* rien */ }
  a.classList.add('dragging');
});
function dropOk(el) { const src = S.ui.drag && S.byDate[S.ui.drag]; return el && src && el.dataset.slot !== S.ui.drag && el.dataset.race !== '1' && src.week.key === el.dataset.wk; }
// Un fichier Excel glissé n'importe où dans la page lance l'ajout d'un plan.
function draggingFile(ev) { return ev.dataTransfer && Array.from(ev.dataTransfer.types || []).includes('Files'); }
document.addEventListener('dragover', (ev) => {
  if (draggingFile(ev)) { ev.preventDefault(); return; }
  const a = ev.target.closest && ev.target.closest('article[data-slot]');
  if (a && dropOk(a)) { ev.preventDefault(); a.classList.add('dropok'); }
});
document.addEventListener('dragleave', (ev) => { const a = ev.target.closest && ev.target.closest('article[data-slot]'); if (a) a.classList.remove('dropok'); });
document.addEventListener('drop', (ev) => {
  if (draggingFile(ev)) { ev.preventDefault(); const f = ev.dataTransfer.files[0]; if (f && /\.xlsx$/i.test(f.name)) importFile(f); return; }
  const a = ev.target.closest && ev.target.closest('article[data-slot]');
  if (a && dropOk(a)) { ev.preventDefault(); const from = S.ui.drag; S.ui.drag = null; doMove(from, a.dataset.slot); }
});
document.addEventListener('dragend', () => { S.ui.drag = null; document.querySelectorAll('.dragging,.dropok').forEach((e) => e.classList.remove('dragging', 'dropok')); });
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape' && S.ui.moving) { S.ui.moving = null; render(); return; }
  if (ev.key === 'Escape' && S.ui.modal) { S.ui.modal = null; S.ui.logEdit = null; renderModal(); }
  if (ev.key === 'Enter' && (ev.target.id === 'vma-input' || ev.target.id === 'target-input' || ev.target.id === 'caut-km' || ev.target.id === 'caut-d' || ev.target.id === 'caut-pace')) ev.target.blur();
});

rebuildIndex();
render();
fetchWeather();

// Le formulaire de sortie survit aux re-rendus de la fenêtre (choix d'une sensation, erreur de saisie).
let LOG_FORM = null;
function keepLogForm() { const g = (id) => (document.getElementById(id) || {}).value; LOG_FORM = { type: g('log-type'), dur: g('log-dur'), km: g('log-km'), note: g('log-note') }; }
function restoreLogForm() {
  if (!LOG_FORM) return;
  const set = (id, v) => { const e = document.getElementById(id); if (e && v != null) e.value = v; };
  set('log-type', LOG_FORM.type); set('log-dur', LOG_FORM.dur); set('log-km', LOG_FORM.km); set('log-note', LOG_FORM.note);
}

// Les rubriques repliables des Préférences restent ouvertes après un re-rendu.
document.addEventListener('toggle', (ev) => {
  const d = ev.target;
  if (!d || !d.dataset || !d.dataset.pref) return;
  if (d.open) S.ui.pref = d.dataset.pref; else if (S.ui.pref === d.dataset.pref) S.ui.pref = null;
}, true);

// Confirmation discrète après chaque enregistrement.
let TOAST_AT = 0, TOAST_TIMER = null;
function toast(msg) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); document.body.appendChild(el); }
  el.innerHTML = ICON.check + '<span>' + esc(msg) + '</span>';
  el.classList.add('on'); TOAST_AT = Date.now();
  clearTimeout(TOAST_TIMER); TOAST_TIMER = setTimeout(() => el.classList.remove('on'), 2200);
}
// Bouton « Enregistrer » : valide le champ en cours de saisie ; sinon confirme que tout est déjà enregistré.
function commitFields() {
  const a = document.activeElement;
  if (a && /^(INPUT|TEXTAREA)$/.test(a.tagName)) a.blur();
  setTimeout(() => { if (Date.now() - TOAST_AT > 400) toast('Tout est déjà enregistré'); }, 60);
}
