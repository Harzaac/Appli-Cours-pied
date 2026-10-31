// Lance tous les tests : node test/tout.js  (après node build.js)
const { spawnSync } = require('child_process');
const fs = require('fs'); const path = require('path');
const env = Object.assign({}, process.env, { NODE_PATH: process.env.NODE_PATH || '/opt/node22/lib/node_modules' });
let ok = 0, ko = 0;
for (const dir of ['unitaires', 'parcours']) {
  for (const f of fs.readdirSync(path.join(__dirname, dir)).filter((x) => x.endsWith('.js')).sort()) {
    const r = spawnSync('node', [path.join(__dirname, dir, f)], { env, encoding: 'utf8', timeout: 240000 });
    const outp = (r.stdout || '') + (r.stderr || '');
    const last = outp.trim().split('\n').pop() || '';
    const good = r.status === 0 && !/ÉCHEC|Error|ERR /.test(outp) && (dir === 'unitaires' || /pas d'erreur/.test(last));
    console.log((good ? 'ok   ' : 'ÉCHEC') + ' ' + dir + '/' + f + (good ? '' : '\n      ' + last.slice(0, 200)));
    good ? ok++ : ko++;
  }
}
console.log(ok + ' réussi(s), ' + ko + ' échec(s)');
process.exit(ko ? 1 : 0);
