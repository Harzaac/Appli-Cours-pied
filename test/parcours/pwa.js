// Version en ligne (PWA) : manifeste, service worker, ouverture hors ligne avec les données, mise à jour proposée
// puis appliquée sans perte, copie « avec mes données » redevenue un fichier autonome. Et côté fichier : la carte « Version en ligne ».
const path = require('path'); const fs = require('fs'); const http = require('http'); const { chromium } = require('playwright');
const root = path.join(__dirname, '..', '..'); const web = path.join(root, 'dist', 'web');
const check = (lbl, ok) => console.log((ok ? 'ok    ' : 'ÉCHEC ') + lbl);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
let swOverride = null; // pour simuler la publication d'une nouvelle version
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]).replace(/^\/appli\//, '/');
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(web, p);
  if (!f.startsWith(web) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  let body = fs.readFileSync(f);
  if (p === '/sw.js' && swOverride) body = Buffer.from(swOverride);
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  res.end(body);
});
(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://localhost:' + server.address().port + '/appli/';
  // réseau externe coupé net (polices, météo) : rien ne doit en dépendre
  const b = await chromium.launch({ args: ['--no-proxy-server', '--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1:9, MAP fonts.gstatic.com 127.0.0.1:9, MAP *.open-meteo.com 127.0.0.1:9'] });
  const ctx = await b.newContext({ viewport: { width: 412, height: 860 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));

  const man = JSON.parse(fs.readFileSync(path.join(web, 'manifest.webmanifest'), 'utf8'));
  check('manifeste : nom, démarrage, affichage autonome', man.name === 'Appli course à pied' && man.start_url === './' && man.display === 'standalone');
  check('manifeste : icônes 192/512 normales et adaptatives présentes', ['any', 'maskable'].every((pu) => ['192x192', '512x512'].every((s) => man.icons.some((i) => i.purpose === pu && i.sizes === s && fs.existsSync(path.join(web, i.src))))));

  await p.goto(base); await p.waitForSelector('#shell');
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 10000 });
  check('service worker actif et page contrôlée', await p.evaluate(() => !!navigator.serviceWorker.controller));
  check('premier passage : pas de bandeau de mise à jour', !(await p.$('[data-act=webupdate]')));
  check('page reconnue comme version en ligne', await p.evaluate(() => isWeb() && S.web.on));

  await p.evaluate(() => { S.profile.name = 'Adrien'; saveStore(); S.ui.view = 'data'; render(); });
  check('Paramètres : carte « Sur ton téléphone » avec la marche à suivre', /Sur ton téléphone[\s\S]*Installer l'appli/.test(await p.textContent('main')));
  const meta = await p.evaluate(() => { S.ui.accent = 'braise'; render(); const c = document.querySelector('meta[name=theme-color]').content; S.ui.accent = 'ocean'; render(); return c; });
  check('barre du téléphone à la couleur de l\'accent', meta.toUpperCase() === '#C2490A');

  // hors ligne : l'appli s'ouvre depuis le cache, avec les données
  await ctx.setOffline(true);
  await p.reload(); await p.waitForSelector('#shell');
  check('hors ligne : l\'appli s\'ouvre et garde le profil', await p.evaluate(() => S.profile.name === 'Adrien'));
  await ctx.setOffline(false);

  // copie « avec mes données » depuis la version en ligne
  const copy = await p.evaluate(() => htmlCopy(false));
  check('copie depuis la version en ligne : sans manifeste ni balises web', !!copy && !/data-web|rel="manifest"|theme-color/.test(copy.split('<script')[0]));
  check('copie : données embarquées', /"name":"Adrien"/.test(copy));

  // nouvelle version publiée : proposée, puis appliquée à la demande, sans perte
  swOverride = fs.readFileSync(path.join(web, 'sw.js'), 'utf8').replace(/const VERSION = '[^']+'/, "const VERSION = 'test-nouvelle'");
  await p.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r.update()));
  await p.waitForSelector('[data-act=webupdate]', { timeout: 10000 });
  check('nouvelle version : bandeau « Mettre à jour »', /Nouvelle version de l'appli prête/.test(await p.textContent('main')));
  await Promise.all([p.waitForNavigation(), p.click('[data-act=webupdate]')]);
  await p.waitForSelector('#shell');
  const after = await p.evaluate(async () => ({ name: S.profile.name, keys: await caches.keys(), banner: !!document.querySelector('[data-act=webupdate]') }));
  check('après mise à jour : rechargée, profil gardé, bandeau parti', after.name === 'Adrien' && !after.banner);
  check('ancien cache supprimé, nouveau en place', after.keys.includes('appli-course-test-nouvelle') && after.keys.filter((k) => /^appli-course-\d/.test(k)).length === 0);

  // installation proposée par le navigateur (simulée) : bandeau sur le calendrier, masquable
  await p.evaluate(() => { const ev = new Event('beforeinstallprompt'); ev.prompt = () => { window.__asked = true; }; ev.userChoice = Promise.resolve({ outcome: 'dismissed' }); window.dispatchEvent(ev); S.ui.view = 'plan'; render(); });
  check('bandeau « Installer » sur le calendrier', !!(await p.$('.remind [data-act=webinstall]')));
  await p.click('.remind [data-act=webinstall]'); await p.waitForTimeout(50);
  check('Installer ouvre la demande du navigateur', await p.evaluate(() => window.__asked === true && !S.web.prompt));
  await p.evaluate(() => { const ev = new Event('beforeinstallprompt'); ev.prompt = () => {}; ev.userChoice = Promise.resolve({}); window.dispatchEvent(ev); });
  await p.click('[data-act=webinstalloff]');
  check('✕ : l\'installation n\'est plus proposée sur le calendrier', !(await p.$('.remind [data-act=webinstall]')));

  // le fichier HTML : pas de service worker, carte « Version en ligne » avec l'adresse
  const f = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); f.on('pageerror', (e) => errs.push(e.message));
  await f.goto('file://' + root + '/dist/appli-course-a-pied.html'); await f.waitForSelector('#shell');
  await f.evaluate(() => { S.ui.view = 'data'; render(); });
  check('fichier : carte « Version en ligne » avec le lien', /Version en ligne[\s\S]*harzaac\.github\.io\/Appli-Cours-pied/.test(await f.textContent('main')) && !!(await f.$('a[href="https://harzaac.github.io/Appli-Cours-pied/"]')));
  check('fichier : rien de la version en ligne ne s\'active', await f.evaluate(() => !isWeb() && !document.querySelector('link[rel=manifest]')));

  await b.close(); server.close();
  console.log(errs.length ? 'ÉCHEC erreurs : ' + errs.join(' | ') : "pas d'erreur");
})().catch((e) => { console.log('ÉCHEC ' + e.message); server.close(); process.exit(1); });
