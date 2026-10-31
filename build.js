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
const VERSION = require('./package.json').version.replace(/\.0$/, '');
const OUT = 'appli-course-a-pied.html';
const dataUri = (p) => 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, p)).toString('base64');
// le logo du club et l'icône sont embarqués dans le fichier
const assetsJs = `const APP_NAME = ${JSON.stringify(TITLE)};\nconst APP_VERSION = ${JSON.stringify(VERSION)};\nconst CLUB_NAME = 'AC Haute Vilaine';\nconst CLUB_LOGO = '${dataUri('assets/logo-achv.png')}';\n`;
const icon = `<link rel="icon" type="image/png" href="${dataUri('assets/icone-64.png')}">`;

const body = `<div id="app"></div>\n<script type="application/json" id="embedded-data"></script>\n<script>\n${assetsJs}${js.replace(/<\/script/gi, '<\\/script')}\n</script>`;

const standalone = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${TITLE}</title>
${icon}
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

const artifact = `<title>${TITLE}</title>
${icon}
<link rel="stylesheet" href="${fonts}">
<style>
${css}
</style>
${body}
`;

fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', OUT), standalone);
fs.writeFileSync(path.join(__dirname, 'dist/artifact.html'), artifact);
console.log('standalone', (standalone.length / 1024).toFixed(0) + ' Ko', '| artifact', (artifact.length / 1024).toFixed(0) + ' Ko');
