/* ============================================================
   Version en ligne (PWA) : installation sur le téléphone, mises à jour, stockage durable.
   Dans le fichier HTML, rien de tout ça ne s'active : seule la carte « Version en ligne » s'affiche.
   ============================================================ */
// Version en ligne = page servie en http(s) avec un manifeste (dist/web/index.html).
function isWeb() { return /^https?:$/.test(location.protocol) && !!document.querySelector('link[rel=manifest]'); }
function isInstalled() { return !!(window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true; }
const INSTALL_KEY = KEY + '-installer'; // petit réglage à part : « ne plus proposer l'installation »
S.web = {
  on: isWeb(), waiting: null, asked: false, prompt: null, persisted: null,
  installOff: (() => { try { return localStorage.getItem(INSTALL_KEY) === '1'; } catch (e) { return false; } })(),
};
// Un événement du navigateur peut arriver pendant une saisie : on attend la fin de la saisie pour redessiner.
function webRender() {
  const a = document.activeElement;
  if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) { a.addEventListener('blur', () => setTimeout(render, 0), { once: true }); return; }
  render();
}
if (S.web.on) {
  // Stockage durable : le navigateur ne vide pas les données de l'appli pour faire de la place.
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persisted().then((p) => p || navigator.storage.persist()).then((p) => { S.web.persisted = !!p; }).catch(() => {});
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      // une nouvelle version est prête seulement s'il y en avait déjà une (pas au tout premier passage)
      const ready = (w) => { if (w && navigator.serviceWorker.controller) { S.web.waiting = w; webRender(); } };
      if (reg.waiting) ready(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (w) w.addEventListener('statechange', () => { if (w.state === 'installed') ready(w); });
      });
      // l'appli installée reste souvent ouverte : on regarde s'il y a du nouveau quand elle revient au premier plan
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch(() => { /* pas de service worker (navigation privée…) : l'appli marche quand même, en ligne */ });
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (S.web.asked) location.reload(); });
  }
  window.addEventListener('beforeinstallprompt', (ev) => { ev.preventDefault(); S.web.prompt = ev; webRender(); });
  window.addEventListener('appinstalled', () => { S.web.prompt = null; toast('Appli installée'); webRender(); });
  if (S.ui.view === 'data') render(); // la carte des Paramètres change selon la version
}

function updateBanner() {
  if (!S.web || !S.web.waiting) return '';
  return `<div class="remind" role="status"><span><strong>Nouvelle version de l'appli prête.</strong> Tes données sont gardées.</span>
    <span class="row"><button class="btn small primary" data-act="webupdate">Mettre à jour</button></span></div>`;
}
function installBanner() {
  if (!S.web || !S.web.prompt || S.web.installOff || S.ui.view !== 'plan' || S.imp.stage !== 'idle') return '';
  return `<div class="remind" role="note"><span>Installe l'appli sur cet appareil : une icône sur l'écran d'accueil, et elle s'ouvre même sans réseau.</span>
    <span class="row"><button class="btn small primary" data-act="webinstall">Installer</button><button class="iconbtn small" data-act="webinstalloff" aria-label="Ne plus proposer l'installation">✕</button></span></div>`;
}
function webUpdate() {
  const w = S.web.waiting;
  if (!w) return;
  S.web.asked = true; saveStore();
  w.postMessage('SKIP_WAITING'); // le service worker prend la main, puis la page se recharge (controllerchange)
}
function webInstall() {
  const p = S.web.prompt;
  if (!p) return;
  p.prompt();
  p.userChoice.then((c) => {
    S.web.prompt = null;
    if (c && c.outcome === 'accepted' && navigator.storage && navigator.storage.persist) navigator.storage.persist().then((x) => { S.web.persisted = !!x; }).catch(() => {});
    render();
  }).catch(() => {});
}
function webInstallOff() {
  S.web.installOff = true;
  try { localStorage.setItem(INSTALL_KEY, '1'); } catch (e) { /* rien */ }
  render();
}

// Carte des Paramètres : installer la version en ligne, ou la trouver depuis le fichier.
function appCardHTML() {
  const host = APP_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (S.web && S.web.on) {
    const how = isInstalled()
      ? '<p class="sub">L\'appli est installée sur cet appareil. Quand une nouvelle version sort, un bandeau te propose « Mettre à jour » : tes données sont gardées.</p>'
      : S.web.prompt
        ? '<div><button class="btn primary" data-act="webinstall">' + ICON.down + 'Installer l\'appli</button></div><p class="sub">Une icône sur l\'écran d\'accueil, et l\'appli s\'ouvre même sans réseau.</p>'
        : '<p class="sub">Pour l\'installer sur Android : dans Chrome, menu ⋮ › « Installer l\'appli » (ou « Ajouter à l\'écran d\'accueil »). L\'appli s\'ouvre ensuite même sans réseau.</p>';
    return `<section class="card stack"><div><h2>Sur ton téléphone</h2><p class="sub">Version en ligne ${esc(APP_VERSION)} · ${esc(host)}</p></div>
      ${how}
      ${S.web.persisted === false ? '<p class="sub">Ce navigateur peut effacer les données d\'un site peu utilisé : exporte ton profil de temps en temps (Mon profil).</p>' : ''}
      <p class="sub">Tes données restent sur cet appareil. Pour les passer sur un autre appareil ou dans la version fichier : Mon profil › Exporter mon profil, puis Importer un profil de l'autre côté.</p></section>`;
  }
  return `<section class="card stack"><div><h2>Version en ligne</h2><p class="sub">L'appli existe aussi en ligne, à installer sur ton téléphone Android comme une vraie appli : icône sur l'écran d'accueil, utilisable sans réseau, mises à jour automatiques.</p></div>
    <p><a class="linkbtn" href="${esc(APP_URL)}" target="_blank" rel="noopener">${esc(host)}</a></p>
    <ul class="howto"><li>Ici : Mon profil › Exporter mon profil, et envoie le fichier sur ton téléphone.</li><li>Sur le téléphone : ouvre l'adresse dans Chrome, installe l'appli, puis Mon profil › Importer un profil.</li></ul>
    <p class="sub">Les deux versions ne partagent pas leurs données : chacune garde les siennes sur son appareil.</p></section>`;
}
