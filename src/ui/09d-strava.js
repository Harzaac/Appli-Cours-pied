/* ============================================================
   Synchro Strava par l'API (version en ligne seulement)
   - « Connecter Strava » envoie sur la page d'autorisation de Strava, qui revient sur l'appli avec un code ;
     le relais (relais-strava/worker.js, qui garde le secret client) l'échange contre des jetons.
   - Les jetons restent sur cet appareil, sous une clé à part (jamais dans un profil exporté).
   - La synchro lit les activités depuis la dernière sortie importée et les passe dans le même import
     que les fichiers de sorties (09c-sorties.js) : séances cochées, courses, sorties libres, sans doublon.
   ============================================================ */
const STRAVA_KEY = KEY + '-strava';
const STRAVA_API = 'https://www.strava.com/api/v3';
const STRAVA_SYNC_EVERY = 30 * 60 * 1000; // synchro automatique à l'ouverture, au plus toutes les 30 min

function stravaReady() { return !!(STRAVA_CLIENT_ID && STRAVA_RELAY) && isWeb(); }
function stravaTok() { try { return JSON.parse(localStorage.getItem(STRAVA_KEY) || 'null'); } catch (e) { return null; } }
function stravaSaveTok(t) { try { if (t) localStorage.setItem(STRAVA_KEY, JSON.stringify(t)); else localStorage.removeItem(STRAVA_KEY); } catch (e) { /* stockage bloqué : storeBanner prévient */ } }
function stravaRedirect() { return location.origin + location.pathname.replace(/index\.html$/, ''); }

/* ----- Conversion d'une activité de l'API (SummaryActivity) au format « sorties » ----- */
// Même règles que outils/strava-vers-appli.py (import par fichier).
const STRAVA_GENERIC = /^(course à pied|evening run|morning run|lunch run|afternoon run|night run|entraînement aux poids|vélo elliptique|gravel|rameur|vélo|sortie à vélo|marche|randonnée|natation)\b/i;
const STRAVA_RACE_NAME = /\b(semi|marathon|10 ?km|5 ?km|trail|corrida|foulées|course de|cross)\b/i;
const STRAVA_WORKOUT = /(\d+\s*x\s*\d+|fraction|vma|allure|seuil|piste|côtes|cotes|tempo|\d{3,5}\s*\/\s*\d{3,5})/i;
const STRAVA_STD = [5, 10, 21.0975, 42.195];
const STRAVA_SPORT = { Run: 'run', VirtualRun: 'run', TrailRun: 'trail', Ride: 'velo', GravelRide: 'velo', MountainBikeRide: 'velo', VirtualRide: 'velo', EBikeRide: 'velo', Swim: 'natation', WeightTraining: 'renfo', Workout: 'renfo', Crossfit: 'renfo', Yoga: 'renfo', Pilates: 'renfo' };
function stravaSnap(km) { const s = STRAVA_STD.find((x) => Math.abs(km - x) / x < 0.035); return s || Math.round(km * 100) / 100; }
function stravaToSortie(a) {
  const km = (a.distance || 0) / 1000;
  const name = (a.name || '').trim(), desc = (a.description || '').trim();
  const sport = a.sport_type || a.type || '';
  const kind = STRAVA_SPORT[sport] || 'autre';
  const std = STRAVA_STD.some((x) => km && Math.abs(km - x) / x < 0.035);
  // workout_type 1 = « Course » cochée sur Strava (course à pied)
  const race = (sport === 'Run' || sport === 'TrailRun') && (a.workout_type === 1 || (STRAVA_RACE_NAME.test(name) && std));
  const type = race ? 'course' : kind === 'run' ? (km >= 18 ? 'long' : STRAVA_WORKOUT.test(name + ' ' + desc) ? 'fractionne' : 'footing') : kind;
  let title = STRAVA_GENERIC.test(name) ? '' : name;
  if (sport === 'VirtualRun' && !title) title = 'Tapis';
  if (kind === 'autre' && !title) title = name;
  const local = a.start_date_local || '';
  return {
    sid: String(a.id), date: local.slice(0, 10), time: local.slice(11, 16), sport, run: kind === 'run' || kind === 'trail', type, title, note: desc,
    km: km ? Math.round(km * 100) / 100 : null, sec: a.moving_time || 0, elapsed: a.elapsed_time || 0,
    dplus: Math.round(a.total_elevation_gain || 0) || null, race: !!race, raceKm: race ? stravaSnap(km) : null, where: a.location_city || '',
  };
}

/* ----- Connexion ----- */
function stravaConnect() {
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
  try { sessionStorage.setItem(STRAVA_KEY + '-state', state); } catch (e) { /* rien */ }
  const q = new URLSearchParams({ client_id: STRAVA_CLIENT_ID, response_type: 'code', redirect_uri: stravaRedirect(), approval_prompt: 'auto', scope: 'read,activity:read_all', state });
  location.assign('https://www.strava.com/oauth/authorize?' + q.toString());
}
async function stravaRelay(route, body) {
  const r = await fetch(STRAVA_RELAY.replace(/\/$/, '') + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(d.error || 'relais injoignable'); e.auth = r.status === 401; throw e; }
  return d;
}
// Retour de la page d'autorisation de Strava : ?code=…&scope=…&state=… (ou ?error=access_denied)
async function stravaCallback() {
  const q = new URLSearchParams(location.search);
  if (!q.has('code') && !q.has('error')) return false;
  let expected = null;
  try { expected = sessionStorage.getItem(STRAVA_KEY + '-state'); sessionStorage.removeItem(STRAVA_KEY + '-state'); } catch (e) { /* rien */ }
  history.replaceState(null, '', stravaRedirect()); // l'adresse redevient propre (le code ne sert qu'une fois)
  S.ui.view = 'profile';
  if (q.get('error')) { S.msg.strava = 'Connexion à Strava annulée.'; S.msg.stravaErr = true; render(); return true; }
  if (!expected || q.get('state') !== expected) { S.msg.strava = 'Connexion refusée : la réponse de Strava ne correspond pas à ta demande. Réessaie.'; S.msg.stravaErr = true; render(); return true; }
  if (!/activity:read/.test(q.get('scope') || '')) { S.msg.strava = 'Strava n\'a pas donné accès à tes activités : reconnecte-toi en laissant cochée la case « Voir les données de vos activités ».'; S.msg.stravaErr = true; render(); return true; }
  S.strava.busy = true; S.msg.strava = 'Connexion à Strava…'; S.msg.stravaErr = false; render();
  try {
    const t = await stravaRelay('/token', { code: q.get('code') });
    stravaSaveTok({ access_token: t.access_token, refresh_token: t.refresh_token, expires_at: t.expires_at, name: (t.athlete && t.athlete.firstname) || '', lastSync: 0 });
    S.strava.busy = false;
    await stravaSync(false);
  } catch (e) {
    S.strava.busy = false; S.msg.strava = 'Connexion impossible : ' + e.message + '.'; S.msg.stravaErr = true; render();
  }
  return true;
}
async function stravaAccess() {
  const t = stravaTok();
  if (!t) throw Object.assign(new Error('pas connecté'), { auth: true });
  if (t.expires_at && t.expires_at - 120 > Date.now() / 1000) return t.access_token;
  const n = await stravaRelay('/refresh', { refresh_token: t.refresh_token });
  stravaSaveTok(Object.assign(t, { access_token: n.access_token, refresh_token: n.refresh_token || t.refresh_token, expires_at: n.expires_at }));
  return n.access_token;
}
async function stravaGet(path) {
  const r = await fetch(STRAVA_API + path, { headers: { Authorization: 'Bearer ' + (await stravaAccess()) } });
  if (r.status === 401) throw Object.assign(new Error('accès retiré'), { auth: true });
  if (r.status === 429) throw new Error('trop de demandes à Strava pour l\'instant, réessaie dans un quart d\'heure');
  if (!r.ok) throw new Error('Strava ne répond pas (' + r.status + ')');
  return r.json();
}
// Début de la synchro : 3 jours avant la dernière sortie importée (activités envoyées en retard), sinon le 1er janvier.
function stravaSince() {
  const from = S.profile.sortiesUntil ? addDays(S.profile.sortiesUntil, -3) : TODAY.slice(0, 4) + '-01-01';
  return Math.floor(new Date(from + 'T00:00:00').getTime() / 1000);
}

/* ----- Synchro ----- */
async function stravaSync(quiet) {
  if (S.strava.busy || !stravaTok()) return;
  S.strava.busy = true;
  if (!quiet) { S.msg.strava = 'Synchro en cours…'; S.msg.stravaErr = false; render(); }
  try {
    const acts = [];
    for (let page = 1; page <= 20; page++) {
      const list = await stravaGet('/athlete/activities?after=' + stravaSince() + '&per_page=100&page=' + page);
      acts.push.apply(acts, list);
      if (list.length < 100) break;
    }
    const t = stravaTok(); if (t) { t.lastSync = Date.now(); stravaSaveTok(t); }
    S.strava.busy = false;
    const raw = { app: 'appli-marathon', kind: 'sorties', source: 'Strava', activities: acts.map(stravaToSortie).filter((a) => a.date) };
    const seen = knownSids();
    if (!raw.activities.some((a) => !seen.has(a.sid))) { if (!quiet) { S.msg.strava = 'À jour : rien de nouveau sur Strava.'; render(); } return; }
    withUndo('Sorties Strava ajoutées', () => { const r = importSorties(raw); S.msg.strava = sortiesMsg(r); S.msg.stravaErr = false; render(); });
  } catch (e) {
    S.strava.busy = false;
    if (e.auth) { stravaSaveTok(null); S.msg.strava = 'Strava a retiré l\'accès de l\'appli : reconnecte-toi.'; }
    else S.msg.strava = 'Synchro impossible : ' + e.message + '.';
    S.msg.stravaErr = true;
    if (!quiet || e.auth) render();
  }
}
async function stravaOff() {
  const t = stravaTok();
  stravaSaveTok(null);
  S.msg.strava = 'Strava déconnecté. Les sorties déjà importées restent dans l\'appli.'; S.msg.stravaErr = false; render();
  if (t) { try { await stravaRelay('/deauthorize', { access_token: t.access_token }); } catch (e) { /* déjà retiré côté Strava */ } }
}

/* ----- Affichage (dans la carte « Sorties de la montre ») ----- */
function stravaBlockHTML() {
  if (!STRAVA_CLIENT_ID || !STRAVA_RELAY) return '';
  if (!isWeb()) return '<p class="sub">La synchro automatique avec Strava se fait dans la version en ligne de l\'appli (Paramètres › Version en ligne).</p>';
  const t = stravaTok();
  const last = t && t.lastSync ? new Date(t.lastSync) : null;
  const msg = S.msg.strava ? `<p class="${S.msg.stravaErr ? 'errtxt' : 'sub'}" role="status">${esc(S.msg.strava)}</p>` : '';
  if (!t) {
    return `<div class="stravabox stack"><div class="row"><button class="btn strava" data-act="stravaconnect"${S.strava.busy ? ' disabled' : ''}>Connecter Strava</button></div>
      <p class="sub">Tes nouvelles sorties arrivent toutes seules à chaque ouverture de l'appli. Strava te demande ton accord ; tu peux couper l'accès à tout moment.</p>${msg}</div>`;
  }
  return `<div class="stravabox stack"><p class="sub"><strong>Connecté à Strava${t.name ? ' (' + esc(t.name) + ')' : ''}</strong>${last ? ' · dernière synchro le ' + esc(frDate(last.toISOString().slice(0, 10))) + ' à ' + esc(last.toTimeString().slice(0, 5)) : ''}</p>
    <div class="row"><button class="btn small primary" data-act="stravasync"${S.strava.busy ? ' disabled' : ''}>${S.strava.busy ? 'Synchro…' : 'Synchroniser'}</button><button class="btn small" data-act="stravaoff"${S.strava.busy ? ' disabled' : ''}>Déconnecter</button></div>${msg}
    <p class="sub stravacredit">Données fournies par Strava</p></div>`;
}

/* ----- Au démarrage ----- */
S.strava = { busy: false };
if (stravaReady()) {
  setTimeout(() => {
    stravaCallback().then((handled) => {
      const t = stravaTok();
      if (!handled && t && Date.now() - (t.lastSync || 0) > STRAVA_SYNC_EVERY) stravaSync(true);
    });
  }, 0);
  // l'appli installée reste ouverte en arrière-plan : on resynchronise quand elle revient au premier plan
  document.addEventListener('visibilitychange', () => {
    const t = stravaTok();
    if (document.visibilityState === 'visible' && t && Date.now() - (t.lastSync || 0) > STRAVA_SYNC_EVERY) stravaSync(true);
  });
}
