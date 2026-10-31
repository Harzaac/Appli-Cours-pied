const path=require('path');const {chromium}=require('playwright');const root=path.join(__dirname,'..','..');
(async()=>{const b=require('../outils/hors-ligne.js')(await chromium.launch());const errs=[];
for(const [w,n] of [[1280,'pc'],[390,'mob']]){
const p=await b.newPage({viewport:{width:w,height:900}});p.on('pageerror',e=>{errs.push(n+': '+e.message);console.log('ERR',e.message)});await p.route(/open-meteo\.com|fonts\.g/,r=>r.abort());
await p.addInitScript(()=>{window.__TODAY__='2026-10-31'});await p.goto('file://'+root+'/dist/appli-course-a-pied.html');
await p.waitForSelector('.week');
console.log(n,'accueil sans plan:',await p.textContent('.navlabel'),'| onglets:',await p.$$eval('.tabs button',e=>e.map(x=>x.textContent).join('/')),'| cartes:',await p.$$eval('.week .dcard',e=>e.length));
await p.screenshot({path:root+`/shots/v34-vide-${n}.png`,fullPage:n==='pc'});
for(let k=0;k<3;k++) await p.click('[data-act=next]');console.log('  +3 semaines:',await p.textContent('.navlabel'));
await p.click('[data-act=mode][data-mode=month]');console.log('  mois:',await p.textContent('.navlabel'));
await p.click('.tabs [data-view=plan]');await p.click('[data-act=tab][data-view=plans] >> nth=0');console.log('  Mes plans ok:',!!(await p.$('h2:text-is("Mes plans")')));await p.click('[data-act=tab][data-view=data]');console.log('  Paramètres ok:',!!(await p.$('h2:text-is("Préférences")')),'| bouton coach caché:',!(await p.$('[data-act=htmlcoach]')));
// ajouter un plan depuis l'en-tête
await p.setInputFiles('#file-xlsx',root+'/test/donnees/plan-test.xlsx');await p.waitForSelector('#imp-race');
await p.click('[data-act=impcancel]');console.log('  annuler import -> calendrier/données:',!!(await p.$('.tabs')));
await p.setInputFiles('#file-xlsx',root+'/test/donnees/plan-test.xlsx');await p.waitForTimeout(1000);console.log('DBG',await p.evaluate(()=>S.imp.stage+' '+(S.imp.message||'')+' '+S.ui.view+' '+document.querySelectorAll('#imp-race').length+' '+JSON.stringify(document.querySelector('#imp-race').getBoundingClientRect())+' '+getComputedStyle(document.querySelector('#imp-race')).display));await p.waitForSelector('#imp-race');
await p.fill('#imp-race','2027-04-11');await p.dispatchEvent('#imp-race','change');await p.waitForTimeout(100);
await p.click('[data-act=useplan]');await p.waitForSelector('.navlabel');
console.log('  après ajout:',await p.textContent('.navlabel'),'| onglets:',await p.$$eval('.tabs button',e=>e.map(x=>x.textContent).join('/')));
await p.click('[data-act=mode][data-mode=week]');await p.click('[data-act=today]');console.log('  aujourd\'hui:',await p.textContent('.navlabel'));
// supprimer le seul plan -> retour au calendrier vide
await p.click('.tabs [data-view=plan]');await p.click('[data-act=tab][data-view=plans] >> nth=0');const id=await p.evaluate(()=>S.plans[0].id);
await p.click(`[data-act=plandel][data-id=${id}]`);
console.log('  après suppression:',await p.evaluate(()=>S.plans.length),'plan(s) | vue',await p.evaluate(()=>S.ui.view),'| semaines',await p.evaluate(()=>S.weeks.length));
await p.click('[data-act=tab][data-view=plan]');console.log('  calendrier:',await p.textContent('.navlabel'));
console.log('  débordement:',await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
await p.close();}
console.log(errs.length?errs:'pas d\'erreur');await b.close();})().catch(e=>{console.log('ÉCHEC',e.message.split('\n')[0]);process.exit(1)});
