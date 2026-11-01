/* Service worker de la version en ligne (copié dans dist/web/sw.js par build.js).
   - L'appli (page, manifeste, icônes) est gardée en cache : elle s'ouvre sans réseau.
   - Une nouvelle version s'installe en arrière-plan ; elle ne prend la main que quand la page le demande
     (bouton « Mettre à jour »), pour ne jamais recharger l'appli au milieu d'une saisie.
   - Les polices Google sont gardées après le premier passage ; la météo et le reste passent par le réseau.
   - Les données ne sont pas ici : elles restent dans le stockage du navigateur (localStorage), que les mises à jour ne touchent pas. */
const VERSION = '__VERSION__';
const CACHE = 'appli-course-' + VERSION;
const FONTS = 'appli-course-polices';
const SHELL = __SHELL__;

self.addEventListener('install', (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', (ev) => {
  ev.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('appli-course-') && k !== CACHE && k !== FONTS).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('message', (ev) => {
  if (ev.data === 'SKIP_WAITING') self.skipWaiting();
  if (ev.data === 'VERSION' && ev.source) ev.source.postMessage({ version: VERSION });
});

self.addEventListener('fetch', (ev) => {
  const req = ev.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // la page : celle de la version installée (même hors ligne) ; le reste de l'appli : cache d'abord
    if (req.mode === 'navigate') {
      ev.respondWith(caches.open(CACHE).then((c) => c.match('./').then((r) => r || fetch(req))));
      return;
    }
    ev.respondWith(caches.open(CACHE).then((c) => c.match(req, { ignoreSearch: true }).then((r) => r || fetch(req))));
    return;
  }
  if (/^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    // polices : la copie gardée tout de suite, rafraîchie en arrière-plan
    ev.respondWith(caches.open(FONTS).then((c) => c.match(req).then((hit) => {
      const net = fetch(req).then((r) => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
  }
  // météo, Strava… : réseau direct, sans cache
});
