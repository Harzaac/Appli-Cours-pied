const fs = require('fs');
const path = require('path');
const read = (p) => fs.readFileSync(path.join(__dirname, p), 'utf8');
const css = fs.readdirSync(path.join(__dirname, 'src/css')).filter((f) => f.endsWith('.css')).sort().map((f) => read('src/css/' + f)).join('\n');
const uiFiles = fs.readdirSync(path.join(__dirname, 'src/ui')).filter((f) => f.endsWith('.js')).sort();
const noyau = fs.readdirSync(path.join(__dirname, 'src/noyau')).filter((f) => f.endsWith('.js')).sort().map((f) => read('src/noyau/' + f));
const js = noyau.concat([read('src/fit.js')]).concat(uiFiles.map((f) => read('src/ui/' + f))).join('\n');
const fonts = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&display=swap';
const TITLE = 'Appli course à pied';
// Fichier autonome : polices Google chargées sans bloquer l'affichage (hors ligne ou réseau lent, l'appli s'ouvre tout de suite avec les polices du système).
const PKG_VERSION = require('./package.json').version;
const VERSION = PKG_VERSION.replace(/\.0$/, '');
const OUT = 'appli-course-a-pied.html';
// Adresse de la version en ligne (GitHub Pages du dépôt Harzaac/Appli-Cours-pied).
const APP_URL = 'https://harzaac.github.io/Appli-Cours-pied/';
const dataUri = (p) => 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, p)).toString('base64');
// le logo du club et l'icône sont embarqués dans le fichier
const assetsJs = `const APP_NAME = ${JSON.stringify(TITLE)};\nconst APP_VERSION = ${JSON.stringify(VERSION)};\nconst APP_URL = ${JSON.stringify(APP_URL)};\nconst CLUB_NAME = 'AC Haute Vilaine';\nconst CLUB_LOGO = '${dataUri('assets/logo-achv.png')}';\n`;
const icon = `<link rel="icon" type="image/png" href="${dataUri('assets/icone-64.png')}">`;

const body = `<div id="app"></div>\n<script type="application/json" id="embedded-data"></script>\n<script>\n${assetsJs}${js.replace(/<\/script/gi, '<\\/script')}\n</script>`;

// Balises propres à la version en ligne. Elles portent data-web : la « copie avec mes données » faite
// depuis la version en ligne les retire (voir htmlCopy), pour redonner un fichier autonome.
const webHead = `<link rel="manifest" href="manifest.webmanifest" data-web>
<meta name="theme-color" content="#1457C4" data-web>
<link rel="apple-touch-icon" href="icone-maskable-192.png" data-web>`;

const page = (extraHead) => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${TITLE}</title>
${icon}${extraHead ? '\n' + extraHead : ''}
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${fonts}" media="print" onload="this.media='all'">
<style>
${css}
</style>
</head>
<body>
${body}
</body>
</html>
`;
const standalone = page('');
const web = page(webHead);

const artifact = `<title>${TITLE}</title>
${icon}
<link rel="stylesheet" href="${fonts}">
<style>
${css}
</style>
${body}
`;

/* ----- Version en ligne (PWA) : dist/web/, publiée sur GitHub Pages ----- */
const ICONS = ['icone-64.png', 'icone-192.png', 'icone-512.png', 'icone-maskable-192.png', 'icone-maskable-512.png'];
const manifest = {
  id: './',
  name: TITLE,
  short_name: 'Course ACHV',
  description: "Calendrier d'entraînement de course à pied de l'AC Haute Vilaine : plans du coach, allures, suivi des séances.",
  lang: 'fr',
  dir: 'ltr',
  start_url: './',
  scope: './',
  display: 'standalone',
  orientation: 'any',
  background_color: '#F1F7FB',
  theme_color: '#1457C4',
  categories: ['sports', 'health', 'fitness'],
  icons: [
    { src: 'icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icone-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    { src: 'icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
// le nom du cache suit le contenu de la page : toute modification publiée déclenche une mise à jour
const hash = require('crypto').createHash('sha256').update(web).digest('hex').slice(0, 8);
const sw = read('src/web/sw.js').replace('__VERSION__', PKG_VERSION + '-' + hash).replace('__SHELL__', JSON.stringify(['./', 'manifest.webmanifest'].concat(ICONS)));

const dist = path.join(__dirname, 'dist');
const webDir = path.join(dist, 'web');
fs.mkdirSync(webDir, { recursive: true });
fs.writeFileSync(path.join(dist, OUT), standalone);
fs.writeFileSync(path.join(dist, 'artifact.html'), artifact);
fs.writeFileSync(path.join(webDir, 'index.html'), web);
fs.writeFileSync(path.join(webDir, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(webDir, 'sw.js'), sw);
fs.writeFileSync(path.join(webDir, '.nojekyll'), '');
ICONS.forEach((f) => fs.copyFileSync(path.join(__dirname, 'assets', f), path.join(webDir, f)));
console.log('standalone', (standalone.length / 1024).toFixed(0) + ' Ko', '| artifact', (artifact.length / 1024).toFixed(0) + ' Ko', '| web', (web.length / 1024).toFixed(0) + ' Ko + manifeste, service worker, ' + ICONS.length + ' icônes');
