// Stockage bloqué → bandeau d'alerte ; textes du bandeau du haut indépendants du marathon ; version lue dans package.json.
const path=require('path');const {chromium}=require('playwright');const root=path.join(__dirname,'..','..');
const check=(lbl,ok)=>console.log((ok?'ok    ':'ÉCHEC ')+lbl);
(async()=>{const b=require('../outils/hors-ligne.js')(await chromium.launch());const errs=[];
const url='file://'+root+'/dist/appli-course-a-pied.html';
// 1. stockage bloqué
const c1=await b.newContext({viewport:{width:1280,height:900}});const p=await c1.newPage();p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.__TODAY__='2026-10-11';Storage.prototype.setItem=function(){throw new Error('QuotaExceededError');};});
await p.goto(url);await p.waitForSelector('#shell');
check('bandeau stockage bloqué sans plan',!!(await p.$('.remind.alert')));
await p.setInputFiles('#file-xlsx',root+'/test/donnees/plan-test.xlsx');await p.click('[data-act=useplan]');await p.waitForSelector('.week');
check('bandeau stockage bloqué avec plan',!!(await p.$('.remind.alert')));
await p.screenshot({path:root+'/shots/stockage-bloque.png'});
// 2. stockage normal : pas de bandeau, textes du bandeau du haut
const c2=await b.newContext({viewport:{width:1280,height:900}});const q=await c2.newPage();q.on('pageerror',e=>errs.push(e.message));
await q.addInitScript(()=>{window.__TODAY__='2026-10-11'});await q.goto(url);
await q.setInputFiles('#file-xlsx',root+'/test/donnees/plan-test.xlsx');await q.click('[data-act=useplan]');await q.waitForSelector('.week');
check('pas de bandeau quand le stockage marche',!(await q.$('.remind.alert')));
const head=await q.textContent('header');
check('bandeau : « avant la course » + nom de la course',/avant la course/.test(head)&&!/avant le marathon/.test(head));
const foot=await q.textContent('footer');const v=require(root+'/package.json').version.replace(/\.0$/,'');
check('version du pied de page = package.json ('+v+')',foot.includes('version '+v));
check('pas de titre Lille par défaut',await q.evaluate(()=>titleFromFile('plan_semi rennes.xlsx')==='plan semi rennes'&&titleFromFile('')==='Mon plan'));
console.log(errs.length?errs:'pas d\'erreur');await b.close();})();
