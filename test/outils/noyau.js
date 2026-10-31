// Charge le noyau (src/noyau/*.js, concaténés comme dans le build) et renvoie ses exports.
const fs = require('fs'); const path = require('path');
const dir = path.join(__dirname, '..', '..', 'src', 'noyau');
const source = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort().map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('\n');
const m = { exports: {} };
new Function('module', source)(m);
m.exports.source = source;
module.exports = m.exports;
