/* ----- Données ----- */
function upcomingRace() {
  const list = S.plans.filter((e) => e.plan.raceDate && e.plan.raceDate >= TODAY).sort((a, b) => (a.plan.raceDate < b.plan.raceDate ? -1 : 1));
  return list[0] || null;
}
function raceCtaBanner() {
  const up = upcomingRace();
  if (!up || S.ui.view !== 'plan' || S.imp.stage !== 'idle' || S.ctaOff === up.id + ':' + up.plan.raceDate) return '';
  const n = diffDays(up.plan.raceDate, TODAY);
  if (n < 0 || n > 3) return '';
  return `<div class="remind racecta-banner" role="note"><span><strong>${n === 0 ? "C'est aujourd'hui !" : n === 1 ? 'La course, c\'est demain.' : 'La course approche (J-' + n + ').'}</strong> Ton écran de course est prêt : allure, passages, ravitaillements, météo.</span>
    <span class="row"><button class="btn small primary" data-act="racemode" data-id="${esc(up.id)}">Ouvrir l'écran de course</button><button class="iconbtn small" data-act="ctaoff" data-id="${esc(up.id)}" aria-label="Masquer ce rappel">✕</button></span></div>`;
}
function backupBanner() {
  if (!S.plan || S.ui.view !== 'plan' || S.imp.stage !== 'idle') return '';
  const n = Object.keys(S.tracking).filter((k) => S.tracking[k].done || S.tracking[k].note).length;
  if (n < 3) return '';
  if (S.lastCopy && diffDays(TODAY, S.lastCopy) < 7) return '';
  if (S.remindUntil && S.remindUntil > TODAY) return '';
  return `<div class="remind" role="note"><span>${S.lastCopy ? 'Ta dernière sauvegarde date du ' + esc(frDate(S.lastCopy)) + '.' : 'Tu as déjà ' + n + ' séances suivies.'} Pense à exporter ton profil.</span>
    <span class="row"><button class="btn small" data-act="download">Exporter mon profil</button><button class="iconbtn small" data-act="remindlater" aria-label="Me le rappeler dans une semaine">✕</button></span></div>`;
}
function plansForSave() { saveStore(); return S.plans.map((e) => ({ id: e.id, plan: e.plan, settings: e.settings })); }
function htmlCopy(forCoach) {
  const cur = curEntry();
  const data = forCoach
    ? { savedAt: new Date().toISOString(), plans: [{ id: cur.id, plan: cur.plan, settings: cur.settings }], activeId: cur.id }
    : { savedAt: new Date().toISOString(), plans: plansForSave(), activeId: S.activeId, tracking: S.tracking, moves: S.moves, weather: S.weather, crest: S.crest, wx: S.wx, theme: S.ui.theme, accent: S.ui.accent, lastCopy: TODAY, remindUntil: S.remindUntil, logs: S.logs, races: S.races, profile: S.profile, ctaOff: S.ctaOff };
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const re = /(<script type="application\/json" id="embedded-data">)[\s\S]*?(<\/script>)/;
  if (!re.test(SRC_HTML)) return null;
  return SRC_HTML.replace(re, (m, a, b) => a + json + b);
}
function saveHtmlCopy(forCoach) {
  try {
    if (!forCoach) { S.lastCopy = TODAY; saveStore(); }
    const html = htmlCopy(forCoach);
    if (!html) throw new Error('src');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    a.download = forCoach ? 'appli-course-a-pied-plan-coach.html' : 'appli-course-a-pied-' + TODAY + '.html';
    document.body.appendChild(a); a.click(); a.remove();
    S.msg.backup = forCoach ? 'Version « plan seul » générée : sans ton suivi ni tes notes.' : 'Copie générée. Remplace ton ancien fichier par celui-ci : ton plan et ton suivi sont dedans.';
  } catch (e) { S.msg.backup = 'Le téléchargement est bloqué ici : ouvre l\'appli depuis ton disque.'; }
  render();
}
function backupText() {
  return JSON.stringify({ app: 'appli-marathon', version: 2, exportedAt: new Date().toISOString(), plans: plansForSave(), activeId: S.activeId, plan: S.plan, settings: S.settings, tracking: S.tracking, moves: S.moves, logs: S.logs, races: S.races, profile: S.profile, weather: S.weather, crest: S.crest, accent: S.ui.accent, theme: S.ui.theme });
}
function dataView() {
  const nTr = Object.keys(S.tracking).filter((k) => S.tracking[k].done || S.tracking[k].skipped || S.tracking[k].note || S.tracking[k].feel).length + Object.keys(S.logs).reduce((a, k) => a + S.logs[k].length, 0);
  return `<div class="stack narrow">
    <div>

    <section class="card stack"><div><h2>Préférences</h2><p class="sub">Réglages rangés par thème : ouvre celui qui t'intéresse.</p></div>
      <details class="raw pref"${S.ui.pref === 'wx' ? ' open' : ''} data-pref="wx"><summary>Météo</summary><div class="stack prefbody"><p class="sub">Prévisions affichées sur les jours du plan (service Open-Meteo, sans compte). Les jours d'entraînement utilisent ta ville d'entraînement ; le jour de la course utilise la ville de la course. Seule la position de la ville est envoyée. Il faut une connexion internet : sans réseau, la dernière météo reçue reste affichée.</p>

      <div class="row"><button class="btn small" data-act="wxtoggle" aria-pressed="${wxCfg().on}">${wxCfg().on ? 'Météo activée' : 'Météo désactivée'}</button><button class="btn small" data-act="wxrefresh" ${wxCfg().on ? '' : 'disabled'}>Actualiser</button></div>
      <div class="fields"><div class="field"><label for="wx-city">Ville d'entraînement : ${esc(wxCfg().name)}</label><input type="text" id="wx-city" placeholder="Autre ville…" autocomplete="off"></div>
        <div class="field"><label>&nbsp;</label><button class="btn small" data-act="wxsearch">Chercher cette ville</button></div></div>
      ${curEntry() ? `<div class="fields"><div class="field"><label for="wx-rcity">Ville de la course (${esc(planName(curEntry()))}) : ${esc(raceCity(curEntry()).name)}</label><input type="text" id="wx-rcity" placeholder="Autre ville…" autocomplete="off"></div>
        <div class="field"><label>&nbsp;</label><button class="btn small" data-act="wxrsearch">Chercher cette ville</button></div></div>` : ''}
      <div class="fields3"><div class="field"><label for="wx-wind">Vent fort dès (km/h)</label><input type="text" id="wx-wind" inputmode="numeric" value="${wxCfg().wind}"></div>
        <div class="field"><label for="wx-rain">Pluie probable dès (%)</label><input type="text" id="wx-rain" inputmode="numeric" value="${wxCfg().rain}"></div>
        <div class="field"><label for="wx-hot">Chaleur dès (°)</label><input type="text" id="wx-hot" inputmode="numeric" value="${wxCfg().hot}"></div>
        <div class="field"><label for="wx-cold">Froid jusqu'à (°)</label><input type="text" id="wx-cold" inputmode="numeric" value="${wxCfg().cold}"></div></div>
      <div><button class="btn small primary" data-act="commit">${ICON.check}Enregistrer</button></div>
      <p class="sub" role="status">${S.msg.wx ? esc(S.msg.wx) : S.wxState.loading ? 'Chargement…' : S.wxState.err ? (S.wx ? 'Pas de connexion : dernière météo du ' + esc(frDate(S.wx.fetchedAt.slice(0, 10))) + ' affichée. ' : 'Météo indisponible. ') + 'Détail : ' + esc(S.wxState.why || 'inconnu') + (location.protocol === 'file:' ? ' · fichier ouvert depuis le disque.' : ' · page web (l\'aperçu dans Claude bloque la météo : ouvre le fichier depuis ton disque).') : S.wx ? 'Dernière mise à jour : ' + esc(frDate(S.wx.fetchedAt.slice(0, 10))) + ' à ' + esc(new Date(S.wx.fetchedAt).toTimeString().slice(0, 5)) + '.' : ''}</p></div></details>
      <details class="raw pref"${S.ui.pref === 'look' ? ' open' : ''} data-pref="look"><summary>Apparence</summary><div class="stack prefbody"><p class="sub">Choisis la couleur du bandeau et des boutons. Les couleurs des types de séance ne changent pas. Le mode clair ou sombre se règle avec le bouton en haut de page.</p>

      <div class="swatches" role="group" aria-label="Couleur de l'appli">${ACCENTS.map((a) => `<button class="swatch" data-act="accent" data-id="${a.id}" aria-pressed="${S.ui.accent === a.id}"><span class="dot" style="background:linear-gradient(135deg,${a.a},${a.b})"></span>${a.name}</button>`).join('')}</div>
      <p class="sub">Pour changer l'image du rond du bandeau (logo du club ou ta photo), clique simplement dessus.</p></div></details>
      <details class="raw pref"${S.ui.pref === 'wipe' ? ' open' : ''} data-pref="wipe"><summary>Effacer mes données</summary><div class="stack prefbody"><p class="sub">Supprime les plans, les réglages, le suivi et les sorties de cet appareil. Pense à télécharger une sauvegarde avant.</p>

      <div class="row">${S.ui.confirmWipe ? '<button class="btn danger" data-act="wipe">Oui, tout effacer</button><button class="btn" data-act="wipecancel">Annuler</button>' : '<button class="btn danger" data-act="wipe">Effacer mes données</button>'}</div></div></details>
    </section>
    </div>
  </div>`;
}

/* ----- Mes plans (ouvert depuis le Calendrier) ----- */
function plansView() {
  return `<div class="stack">
    <section class="card stack"><div class="row between"><div><h2>Mes plans</h2><p class="sub">Chaque plan se place dans le calendrier selon sa date de course. Les anciens plans restent consultables avec ton suivi.</p></div><button class="btn small" data-act="tab" data-view="plan">${ICON.left}Retour au calendrier</button></div>
      ${S.plans.length ? '' : '<p class="sub">Aucun plan pour l\'instant.</p>'}<ul class="planlist">${S.plans.slice().sort((a, b) => (rangeOf(a).start < rangeOf(b).start ? -1 : 1)).map((e) => {
        const r = rangeOf(e), nSess = e.plan.weeks.reduce((a, w) => a + w.days.filter((d) => !d.rest).length, 0);
        const done = Object.keys(S.tracking).filter((k) => S.tracking[k].done && S.byDate[k] && S.byDate[k].entry === e).length;
        const del = S.ui.confirmDel === e.id;
        return `<li class="planitem${e.id === S.activeId ? ' on' : ''}"><div class="stack" style="gap:2px"><strong>${esc(planName(e))}</strong>
          <span class="sub">${esc(planState(e))} · ${esc(frDate(r.start))} → ${esc(frDate(r.end))}${e.plan.raceDate ? ' · course le ' + esc(frDate(e.plan.raceDate)) : ''}</span>
          ${e.plan.raceDate && track(e.plan.raceDate).result ? `<span class="sub"><strong>Chrono ${esc(fmtHMS(track(e.plan.raceDate).result))}</strong>${track(e.plan.raceDate).pr ? ' · record personnel' : ''}${e.settings && e.settings.targetSec ? ' · objectif ' + esc(fmtHMS(e.settings.targetSec)) : ''}</span>` : ''}
          <span class="sub">${e.plan.weeks.length} semaines · ${done}/${nSess} séances faites${e.plan.source ? ' · fichier « ' + esc(e.plan.source) + ' »' : ''}</span></div>
          <div class="row">${e.id === S.activeId ? '<span class="badge">Affiché</span>' : `<button class="btn small" data-act="planshow" data-id="${esc(e.id)}">Afficher</button>`}
          ${del ? `<button class="btn small danger" data-act="plandel" data-id="${esc(e.id)}">Oui, supprimer</button><button class="btn small" data-act="plandelcancel">Annuler</button>` : `<button class="btn small" data-act="plandel" data-id="${esc(e.id)}" aria-label="Supprimer ${esc(planName(e))}">Supprimer</button>`}</div>
          ${del ? '<p class="sub" style="flex-basis:100%">Le plan et le suivi de ses séances seront effacés de cet appareil.</p>' : ''}
          ${e.plan.raceDate ? (S.ui.redate === e.id ? `<div class="redate"><div class="field"><label for="redate-${esc(e.id)}">Nouvelle date de course</label><input type="date" id="redate-${esc(e.id)}" value="${esc(e.plan.raceDate)}"></div>
            <div class="row"><button class="btn small primary" data-act="redateok" data-id="${esc(e.id)}">Recaler le plan</button><button class="btn small" data-act="redatecancel">Annuler</button></div>
            <p class="sub">Tout le plan se décale par semaines entières, avec tes séances cochées, tes notes et tes déplacements.</p>
            ${S.msg.redate ? `<p class="errtxt" role="alert">${esc(S.msg.redate)}</p>` : ''}</div>` : `<button class="linkbtn" data-act="redate" data-id="${esc(e.id)}">Changer la date de course</button>`) : ''}</li>`;
      }).join('')}</ul>
      <div><input type="file" id="file-xlsx" accept=".xlsx" class="sr"><button class="btn" data-act="pickxlsx">${ICON.up}Ajouter un plan (fichier Excel)</button></div>
      <p class="sub">Le fichier est contrôlé avant d'être utilisé, et tu choisis la date de la course. Pour mettre à jour un plan déjà chargé, recharge son fichier : ton suivi est conservé.</p></section>
    <div class="grid2 top">${racesCardHTML()}${recoveryCardHTML()}</div>
  </div>`;
}

function profileSummary() {
  const nTr = Object.keys(S.tracking).filter((k) => S.tracking[k].done || S.tracking[k].note || S.tracking[k].feel).length + Object.keys(S.logs).reduce((a, k) => a + S.logs[k].length, 0);
  const parts = [esc(S.profile.name || 'Coureur ou coureuse'), esc(S.profile.club || CLUB_NAME), 'VMA ' + fmtVma((S.settings || S.profile).vma) + ' km/h',
    S.plans.length + ' plan' + (S.plans.length > 1 ? 's' : ''), S.races.length + ' course' + (S.races.length > 1 ? 's' : '') + ' sans plan', nTr + (nTr > 1 ? ' séances et sorties notées' : ' séance ou sortie notée')];
  return parts.join(' · ');
}
function profileFileName() {
  const slug = (S.profile.name || 'coureur').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'coureur';
  return 'profil-' + slug + '-' + TODAY + '.json';
}

/* ----- Mon profil (ouvert depuis l'avatar, en haut à droite) ----- */
function initials() {
  const n = (S.profile.name || '').trim();
  return n ? n.split(/\s+/).map((x) => x.charAt(0)).join('').slice(0, 2).toUpperCase() : '';
}
function avatarHTML(cls) { const t = initials(); return `<span class="avatar ${cls || ''}" aria-hidden="true">${t ? esc(t) : ICON.user}</span>`; }
function bestTimes() {
  const all = S.plans.filter((e) => e.plan.raceDate && track(e.plan.raceDate).result).map((e) => ({ km: MARATHON_KM, sec: track(e.plan.raceDate).result, date: e.plan.raceDate, name: planName(e) }))
    .concat(S.races.filter((r) => r.result).map((r) => ({ km: r.km, sec: r.result, date: r.date, name: r.name })));
  const out = {};
  all.forEach((x) => { const k = raceKmLabel(x.km); if (!out[k] || x.sec < out[k].sec) out[k] = x; });
  return Object.keys(out).map((k) => Object.assign({ label: k }, out[k])).sort((a, b) => a.km - b.km);
}
function profileView() {
  const best = bestTimes();
  const nTr = Object.keys(S.tracking).filter((k) => S.tracking[k].done).length + Object.keys(S.logs).reduce((a, k) => a + S.logs[k].length, 0);
  return `<div class="stack">
    <section class="card stack profilecard"><div class="row profhead">${avatarHTML('big')}<div class="stack" style="gap:2px"><h2>${esc(S.profile.name || 'Mon profil')}</h2><span class="sub">${esc(S.profile.club || CLUB_NAME)}</span></div>
        <button class="btn small" data-act="tab" data-view="plan" style="margin-left:auto">${ICON.left}Retour</button></div>
      <div class="fields"><div class="field"><label for="pf-name">Prénom</label><input type="text" id="pf-name" value="${esc(S.profile.name || '')}" placeholder="ex. Adrien" autocomplete="off"></div>
        <div class="field"><label for="pf-club">Club</label><input type="text" id="pf-club" value="${esc(S.profile.club || CLUB_NAME)}" autocomplete="off"></div></div>
      <div class="kpis">
        <div class="kpi"><span class="v num">${fmtVma((S.settings || S.profile).vma)}</span><span class="l">VMA (km/h) · <button class="linkbtn" data-act="tab" data-view="vma">modifier</button></span></div>
        <div class="kpi"><span class="v num">${nTr}</span><span class="l">séances faites et sorties notées</span></div>
        <div class="kpi"><span class="v num">${S.plans.length}</span><span class="l">plan${S.plans.length > 1 ? 's' : ''} · ${S.races.length} course${S.races.length > 1 ? 's' : ''} sans plan</span></div>
      </div>
      ${best.length ? `<div class="stack" style="gap:6px"><strong>Mes meilleurs chronos</strong><ul class="besttimes">${best.map((x) => `<li><span>${esc(x.label)}</span><strong class="num">${esc(fmtHMS(x.sec))}</strong><span class="sub">${esc(x.name)} · ${esc(frDate(x.date))}</span></li>`).join('')}</ul></div>` : '<p class="sub">Tes meilleurs chronos s\'afficheront ici dès que tu auras saisi un résultat de course.</p>'}
    </section>
    <section class="card stack"><div><h2>Sauvegarde du profil</h2><p class="sub">Tout ce qui te concerne : réglages, plans, suivi, sorties et courses. Exporte-le pour le garder ou le passer sur un autre appareil ; importe-le pour tout retrouver.</p></div>
      <div class="row"><button class="btn primary" data-act="download">${ICON.down}Exporter mon profil</button><input type="file" id="file-json" accept=".html,.htm,.json,text/html,application/json" class="sr"><button class="btn" data-act="pickjson">${ICON.up}Importer un profil</button></div>
      <p class="sub">L'import remplace les données de cet appareil par celles du profil (un profil exporté ou une copie de l'appli).</p>
      ${S.msg.backup ? `<p class="sub" role="status">${esc(S.msg.backup)}</p>` : ''}
      ${S.msg.restore ? `<p class="${S.msg.restoreErr ? 'errtxt' : 'sub'}" role="status">${esc(S.msg.restore)}</p>` : ''}
      <details class="raw"><summary>Copie de l'appli avec mes données</summary><div class="stack" style="gap:10px;margin-top:10px">
        <div class="row nowrap"><button class="btn grow" data-act="htmlcopy">${ICON.down}<span>Enregistrer une copie avec mes données</span></button><button class="iconbtn" data-act="copyinfo" aria-label="À quoi sert cette copie ?" aria-expanded="${!!S.ui.copyInfo}">ⓘ</button></div>
        ${S.ui.copyInfo ? `<div class="fitinfo" role="note"><span>Un nouveau fichier de l'appli qui contient déjà ton plan, tes réglages et ton suivi. Remplace l'ancien fichier par celui-ci, ou envoie-le sur ton téléphone : il s'ouvre directement, sans rien restaurer.</span></div>` : ''}
        ${S.plans.length ? `<div><button class="btn small" data-act="htmlcoach">Version plan seul (pour le coach)</button><p class="sub" style="margin-top:6px">Sans ton suivi ni tes notes : à envoyer à Pierre.</p></div>` : ''}</div></details>
      <details class="raw"><summary>Comment ça marche ?</summary><ul class="howto"><li>Tes données (suivi, notes, réglages) restent dans ce navigateur, sur cet appareil. Rien n'est envoyé ailleurs.</li><li>« Exporter mon profil » crée un petit fichier avec tout ce qui te concerne. Garde-le : c'est ta sauvegarde.</li><li>Pour changer d'appareil ou passer à une nouvelle version de l'appli, ouvre le nouveau fichier et utilise « Importer un profil ».</li></ul></details>
    </section>
  </div>`;
}
