const path=require('path');const fs=require('fs');const {chromium}=require('playwright');const root=path.join(__dirname,'..','..');
const out=[];const log=(...a)=>{out.push(a.join(' '));console.log(...a)};
(async()=>{const b=await chromium.launch();const errs=[];
const ctx=await b.newContext({viewport:{width:1280,height:900},acceptDownloads:true});const p=await ctx.newPage();
p.on('pageerror',e=>errs.push(e.message));await p.route(/open-meteo\.com|fonts\.g/,r=>r.abort());
await p.addInitScript(()=>{window.__TODAY__='2026-10-31'});
const url='file://'+root+'/dist/appli-marathon.html';
await p.goto(url);
// A. ancien format (v2) -> migration
await p.setInputFiles('#file-xlsx',root+'/test/donnees/plan-test.xlsx');await p.waitForSelector('#imp-race');
log('A0 date proposée pour un plan déjà passé:',await p.inputValue('#imp-race'));
await p.fill('#imp-race','2026-10-25');await p.dispatchEvent('#imp-race','change');await p.waitForTimeout(150);
await p.click('[data-act=useplan]');await p.waitForSelector('.week');
await p.evaluate(()=>{const old={savedAt:new Date().toISOString(),plan:S.plan,settings:Object.assign({},S.settings,{vma:17}),tracking:{'2026-10-07':{done:true,note:'ANCIENNE-NOTE'}},moves:{},theme:'auto'};localStorage.setItem('appli-marathon-v1',JSON.stringify(old));});
await p.reload();await p.waitForSelector('.week');
log('A migration: plans',await p.evaluate(()=>S.plans.length),'| VMA',await p.evaluate(()=>S.settings.vma),'| note',await p.evaluate(()=>track('2026-10-07').note));
// B. semaine actuelle après la course
log('B semaine affichée:',await p.textContent('.navlabel'),'| en-tête:',(await p.textContent('.count')).replace(/\s+/g,' ').trim());
await p.click('[data-act=prev]');log('  précédente:',await p.textContent('.navlabel'));
// D. ajout d'un 2e plan au printemps
await p.click('.tabs [data-view=plan]');await p.click('[data-act=tab][data-view=plans] >> nth=0');
await p.setInputFiles('#file-xlsx',root+'/test/donnees/plan-test.xlsx');await p.waitForSelector('#imp-race');
log('D date proposée:',await p.inputValue('#imp-race'));
await p.fill('#imp-race','2027-04-11');await p.dispatchEvent('#imp-race','change');await p.waitForTimeout(150);
log('  texte:',(await p.textContent('#imp-race >> xpath=../../..')).replace(/\s+/g,' ').slice(0,230));
await p.click('[data-act=useplan]:not([data-replace])');await p.waitForSelector('.week');
log('  plans:',await p.evaluate(()=>S.plans.map(e=>planName(e)+' '+rangeOf(e).start+'→'+e.plan.raceDate).join(' | ')));
log('  semaine affichée:',await p.textContent('.navlabel'),'| en-tête:',(await p.textContent('.count')).replace(/\s+/g,' ').trim());
log('  sélecteur de plan:',await p.$$eval('#plan-select option',o=>o.map(x=>x.textContent).join(' / ')));
await p.click('[data-act=today]');log('  aujourd\'hui ->',await p.textContent('.navlabel'));
// E. chevauchement
await p.click('.tabs [data-view=plan]');await p.click('[data-act=tab][data-view=plans] >> nth=0');
await p.setInputFiles('#file-xlsx',root+'/test/donnees/plan-test.xlsx');await p.waitForSelector('#imp-race');
await p.fill('#imp-race','2027-04-25');await p.dispatchEvent('#imp-race','change');await p.waitForTimeout(150);
log('E chevauchement:',(await p.textContent('[role=alert]').catch(()=>'aucun')).trim(),'| bouton ajout:',!!(await p.$('[data-act=useplan]:not([data-replace])')));
await p.fill('#imp-race','2027-04-11');await p.dispatchEvent('#imp-race','change');await p.waitForTimeout(150);
log('  même date -> bouton mise à jour:',!!(await p.$('[data-act=useplan][data-replace]')));
await p.click('[data-act=impcancel]');
// F. suivi dans le plan 2 puis recalage
const p2=await p.evaluate(()=>S.plans.find(e=>e.plan.raceDate==='2027-04-11').id);
const d2=await p.evaluate((id)=>entryOf(id).plan.weeks[3].days.find(d=>!d.rest).date,p2);
await p.evaluate((d)=>{setTrack(d,{done:true,note:'NOTE-P2'});},d2);
await p.click('.tabs [data-view=plan]');await p.click('[data-act=tab][data-view=plans] >> nth=0');
await p.click(`[data-act=redate][data-id=${p2}]`);await p.fill(`#redate-${p2}`,'2027-05-02');await p.click(`[data-act=redateok][data-id=${p2}]`);
const d2b=await p.evaluate(([d])=>addDays(d,21),[d2]);
log('F recalage:',await p.evaluate((id)=>entryOf(id).plan.raceDate,p2),'| suivi déplacé:',await p.evaluate(([a,b])=>JSON.stringify([track(a).note||null,track(b).note||null]),[d2,d2b]));
// G. recalage qui chevauche le plan 1
const p1=await p.evaluate(()=>S.plans.find(e=>e.plan.raceDate==='2026-10-25').id);
await p.click('.tabs [data-view=plan]');await p.click('[data-act=tab][data-view=plans] >> nth=0');
await p.click(`[data-act=redate][data-id=${p2}]`);await p.fill(`#redate-${p2}`,'2026-11-15');await p.click(`[data-act=redateok][data-id=${p2}]`);
log('G chevauchement au recalage:',(await p.textContent('.redate [role=alert]').catch(()=>'aucun')).trim());
await p.click('[data-act=redatecancel]');
await p.screenshot({path:root+'/shots/v32-donnees.png',fullPage:false,clip:{x:0,y:480,width:1280,height:420}});
// I. copie + restauration
await p.click('.tabs [data-view=data]');const [dl]=await Promise.all([p.waitForEvent('download'),p.click('[data-act=htmlcopy]')]);await dl.saveAs(root+'/shots/v32-copie.html');
const c2=await b.newContext({viewport:{width:390,height:844}});const q=await c2.newPage();q.on('pageerror',e=>errs.push('mobile: '+e.message));await q.route(/open-meteo\.com|fonts\.g/,r=>r.abort());
await q.addInitScript(()=>{window.__TODAY__='2026-10-31'});await q.goto('file://'+root+'/shots/v32-copie.html');await q.waitForSelector('.week');
log('I copie ouverte: plans',await q.evaluate(()=>S.plans.length),'| notes',await q.evaluate(([a,b])=>[track(a).note,track(b).note].join(','),['2026-10-07',d2b]));
log('  mobile débordement:',await q.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
await q.screenshot({path:root+'/shots/v32-mobile.png'});
await q.click('[data-act=mode][data-mode=month]');for(let k=0;k<8;k++){await q.click('[data-act=next]').catch(()=>{});}
log('  mois après 8 clics:',await q.textContent('.navlabel'));
await c2.close();
// H. suppression du plan 2
await p.click('.tabs [data-view=plan]');await p.click('[data-act=tab][data-view=plans] >> nth=0');
await p.click(`[data-act=plandel][data-id=${p2}]`);await p.click(`[data-act=plandel][data-id=${p2}]`);
log('H après suppression: plans',await p.evaluate(()=>S.plans.length),'| note plan 1',await p.evaluate(()=>track('2026-10-07').note),'| note plan 2',await p.evaluate((d)=>track(d).note||'effacée',d2b));
// J. vue mois PC
await p.click('[data-act=tab][data-view=plan]');await p.click('[data-act=mode][data-mode=month]');
log('J mois:',await p.textContent('.navlabel'));
await p.screenshot({path:root+'/shots/v32-mois.png'});
log(errs.length?errs:'pas d\'erreur');await b.close();})().catch(e=>{console.log('ÉCHEC',e.message.split('\n')[0]);process.exit(1)});
