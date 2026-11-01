// Onglet VMA : temps de passage pour toute distance, sans plan chargé.
const path=require('path');const {chromium}=require('playwright');const root=path.join(__dirname,'..','..');
const check=(lbl,ok)=>console.log((ok?'ok    ':'ÉCHEC ')+lbl);
(async()=>{const b=require('../outils/hors-ligne.js')(await chromium.launch());const errs=[];
const p=await (await b.newContext({viewport:{width:400,height:850}})).newPage();p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.__TODAY__='2026-11-01'});await p.goto('file://'+root+'/dist/appli-course-a-pied.html');
await p.click('[data-act=tab][data-view=vma]');
check('carte Temps de passage présente sans plan',!!(await p.$('#split-km')));
await p.selectOption('#split-km','10');await p.fill('#split-time',"42'00");await p.press('#split-time','Enter');
const rows=await p.$$eval('#split-km >> xpath=ancestor::section//tbody/tr',t=>t.map(r=>r.textContent));
check('10 km : 10 repères, 5e à 21\'00"',rows.length===10&&rows[4].includes("21'00"));
await p.selectOption('#split-km','21.0975');await p.fill('#split-time',"1h30'00");await p.press('#split-time','Enter');
const semi=await p.$$eval('#split-km >> xpath=ancestor::section//tbody/tr',t=>t.map(r=>r.textContent));
check('semi : 5,10,15,20 km + arrivée en 1h30\'00"',semi.length===5&&semi[4].includes("1h30'00"));
await p.fill('#split-time','abc');await p.press('#split-time','Enter');
check('chrono illisible → message',!!(await p.$('#split-km >> xpath=ancestor::section//p[@role="alert"]')));
check('pas de débordement mobile',!(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth)));
console.log(errs.length?errs:'pas d\'erreur');await b.close();})();
