// Synchro Strava par l'API, dans la version en ligne : connexion (aller-retour par Strava simulé), import des activités,
// synchro suivante sans doublon, jeton renouvelé par le relais, accès retiré, déconnexion. Strava et le relais sont simulés.
const path = require('path'); const fs = require('fs'); const http = require('http'); const { chromium } = require('playwright');
const root = path.join(__dirname, '..', '..'); const web = path.join(root, 'dist', 'web');
const check = (lbl, ok) => console.log((ok ? 'ok    ' : 'ÉCHEC ') + lbl);
const RELAY = 'https://relais.test';
// page configurée comme si l'appli Strava et le relais existaient
const page = fs.readFileSync(path.join(web, 'index.html'), 'utf8').replace('const STRAVA_CLIENT_ID = "";', 'const STRAVA_CLIENT_ID = "4242";').replace('const STRAVA_RELAY = "";', 'const STRAVA_RELAY = "' + RELAY + '";');
const server = http.createServer((req, res) => {
  const p = req.url.split('?')[0];
  if (p === '/' || p === '/index.html') { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(page); return; }
  const f = path.join(web, p);
  if (f.startsWith(web) && fs.existsSync(f)) { res.writeHead(200); res.end(fs.readFileSync(f)); return; }
  res.writeHead(404); res.end();
});
const A = (id, date, name, km, sec, extra) => Object.assign({ id, name, sport_type: 'Run', distance: km * 1000, moving_time: sec, elapsed_time: sec + 20, total_elevation_gain: 30, start_date_local: date + 'T18:30:00Z', workout_type: 0 }, extra || {});
let ACTS = [A(101, '2026-10-20', 'Course à pied du soir', 8, 2700), A(102, '2026-10-25', 'Marathon de Lille', 42.3, 12300, { workout_type: 1 }), A(103, '2026-10-27', 'Entraînement aux poids', 0, 1800, { sport_type: 'WeightTraining' })];
const log = { token: 0, refresh: 0, deauth: 0, api: [], authHeaders: [] };
let apiStatus = 200;
(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://localhost:' + server.address().port + '/';
  const b = await chromium.launch({ args: ['--no-proxy-server', '--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1:9, MAP fonts.gstatic.com 127.0.0.1:9, MAP *.open-meteo.com 127.0.0.1:9'] });
  const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, serviceWorkers: 'block', timezoneId: 'Europe/Paris' });
  const errs = [];
  // Strava : page d'autorisation (accepte et revient sur l'appli), API des activités
  await ctx.route('https://www.strava.com/**', async (route) => {
    const u = new URL(route.request().url());
    if (u.pathname === '/oauth/authorize') {
      const back = u.searchParams.get('redirect_uri') + '?state=' + u.searchParams.get('state') + '&code=CODE1&scope=read,activity:read_all';
      return route.fulfill({ status: 302, headers: { Location: back } });
    }
    if (u.pathname === '/api/v3/athlete/activities') {
      log.api.push(u.search); log.authHeaders.push(route.request().headers().authorization);
      if (apiStatus !== 200) return route.fulfill({ status: apiStatus, body: '{}', headers: { 'Access-Control-Allow-Origin': '*' } });
      const after = +u.searchParams.get('after');
      const list = ACTS.filter((a) => new Date(a.start_date_local).getTime() / 1000 >= after - 86400);
      return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(u.searchParams.get('page') === '1' ? list : []) });
    }
    return route.fulfill({ status: 404, body: '' });
  });
  // relais simulé
  await ctx.route(RELAY + '/**', async (route) => {
    const req = route.request(); const p = new URL(req.url()).pathname;
    const cors = { 'Access-Control-Allow-Origin': base.replace(/\/$/, ''), 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    const body = JSON.parse(req.postData() || '{}');
    if (p === '/token') { log.token++; return route.fulfill({ status: body.code === 'CODE1' ? 200 : 401, headers: cors, contentType: 'application/json', body: JSON.stringify({ access_token: 'A1', refresh_token: 'R1', expires_at: Math.floor(Date.now() / 1000) + 3600, athlete: { id: 7, firstname: 'Adrien' } }) }); }
    if (p === '/refresh') { log.refresh++; return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ access_token: 'A2', refresh_token: 'R2', expires_at: Math.floor(Date.now() / 1000) + 21600 }) }); }
    if (p === '/deauthorize') { log.deauth++; return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: '{"ok":true}' }); }
    return route.fulfill({ status: 404, headers: cors, body: '{}' });
  });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => { window.__TODAY__ = '2026-11-01'; });
  await p.goto(base); await p.waitForSelector('#shell');
  await p.evaluate(() => { S.ui.view = 'profile'; render(); });
  check('Mon profil : bouton « Connecter Strava »', !!(await p.$('[data-act=stravaconnect]')));
  check('pas encore de jeton enregistré', await p.evaluate(() => !stravaTok()));

  // connexion : aller chez Strava, retour avec le code, échange par le relais, première synchro
  await p.click('[data-act=stravaconnect]');
  await p.waitForFunction(() => /sorties? ajoutée/.test(S.msg.strava || ''), null, { timeout: 10000 });
  check('retour de Strava : adresse nettoyée (plus de code)', !/code=/.test(p.url()));
  check('code échangé une fois par le relais', log.token === 1);
  const st = await p.evaluate(() => ({ tok: stravaTok(), t25: S.tracking['2026-10-25'], races: S.races, logs: S.logs, until: S.profile.sortiesUntil, text: document.querySelector('main').textContent }));
  check('jetons gardés sur l\'appareil, avec le prénom', st.tok.access_token === 'A1' && st.tok.name === 'Adrien' && st.tok.lastSync > 0);
  check('jetons absents du profil exporté', await p.evaluate(() => !/A1|R1/.test(backupText())));
  check('jeton envoyé dans l\'en-tête Authorization', log.authHeaders[0] === 'Bearer A1');
  check('première synchro depuis le 1er janvier', /after=1767222000&/.test(log.api[0]));
  check('marathon tagué Course : course sans plan avec le temps', st.races.some((r) => r.sid === '102' && r.km === 42.195 && r.result === 12320));
  check('footing et renfo en sorties libres', (st.logs['2026-10-20'] || []).some((l) => l.sid === '101' && l.type === 'footing') && (st.logs['2026-10-27'] || [])[0].type === 'renfo');
  check('« Connecté à Strava (Adrien) » affiché', /Connecté à Strava \(Adrien\)/.test(st.text));
  check('date des sorties importées avancée', st.until === '2026-10-27');

  // synchro suivante : seulement les nouvelles activités, jeton expiré renouvelé par le relais
  ACTS.push(A(104, '2026-10-30', 'Fractionné 10x400', 9, 2900));
  await p.evaluate(() => { const t = stravaTok(); t.expires_at = 1; stravaSaveTok(t); });
  await p.click('[data-act=stravasync]');
  await p.waitForFunction(() => /1 sortie ajoutée/.test(S.msg.strava || ''), null, { timeout: 10000 });
  check('synchro : la nouvelle sortie seulement (fractionné)', await p.evaluate(() => (S.logs['2026-10-30'] || []).some((l) => l.sid === '104' && l.type === 'fractionne') && S.races.length === 1));
  check('jeton expiré renouvelé par le relais', log.refresh === 1 && log.authHeaders[log.authHeaders.length - 1] === 'Bearer A2');
  check('reprise 3 jours avant la dernière sortie importée', /after=1792792800&/.test(log.api[log.api.length - 1]));
  await p.click('[data-act=stravasync]');
  await p.waitForFunction(() => /rien de nouveau/.test(S.msg.strava || ''), null, { timeout: 10000 });
  check('synchro sans nouveauté : « À jour »', true);

  // accès retiré depuis Strava : on le dit, on oublie le jeton
  apiStatus = 401;
  await p.click('[data-act=stravasync]');
  await p.waitForFunction(() => /retiré l'accès/.test(S.msg.strava || ''), null, { timeout: 10000 });
  check('accès retiré : message et jeton oublié, bouton Connecter revenu', await p.evaluate(() => !stravaTok() && !!document.querySelector('[data-act=stravaconnect]')));
  check('sorties déjà importées gardées', await p.evaluate(() => S.races.length === 1 && (S.logs['2026-10-30'] || []).length === 1));

  // reconnexion puis déconnexion volontaire
  apiStatus = 200;
  await p.click('[data-act=stravaconnect]');
  await p.waitForFunction(() => !!stravaTok() && !S.strava.busy, null, { timeout: 10000 });
  await p.waitForSelector('[data-act=stravaoff]');
  await p.click('[data-act=stravaoff]'); await p.waitForTimeout(150);
  check('déconnexion : jeton oublié et accès retiré chez Strava', await p.evaluate(() => !stravaTok()) && log.deauth === 1);

  // retour refusé (état falsifié) : rien n'est échangé
  const before = log.token;
  await p.goto(base + '?state=faux&code=CODE1&scope=read,activity:read_all'); await p.waitForSelector('#shell'); await p.waitForTimeout(150);
  check('réponse de Strava non demandée : refusée sans échange', log.token === before && /ne correspond pas/.test(await p.textContent('main')));
  await p.goto(base + '?error=access_denied'); await p.waitForSelector('#shell'); await p.waitForTimeout(100);
  check('« Annuler » chez Strava : message clair', /Connexion à Strava annulée/.test(await p.textContent('main')));

  await b.close(); server.close();
  console.log(errs.length ? 'ÉCHEC erreurs : ' + errs.join(' | ') : "pas d'erreur");
})().catch((e) => { console.log('ÉCHEC ' + e.message); server.close(); process.exit(1); });
