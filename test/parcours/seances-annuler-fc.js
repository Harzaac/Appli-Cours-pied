const path=require('path');const {chromium}=require('playwright');const root=path.join(__dirname,'..','..');
const log=(...a)=>console.log(...a);
(async()=>{const b=require('../outils/hors-ligne.js')(await chromium.launch());const errs=[];const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.__TODAY__='2026-10-11'});await p.goto('file://'+root+'/dist/appli-course-a-pied.html');await p.waitForSelector('.week');
await p.setInputFiles('#file-xlsx >> nth=0',root+'/test/donnees/plan-test.xlsx');await p.click('[data-act=useplan]');await p.waitForSelector('.week');
// 1. modifier une séance du plan
await p.click('article[data-date="2026-10-08"]');await p.click('[data-act=edit]');
await p.selectOption('#ed-cat','vma');await p.fill('#ed-title','VMA courte');await p.fill('#ed-dur','');
await p.fill('#ed-lines',"0h15 éch\n6 x 400m 95% VMA\nrécup 1'\nretour au calme 0h10\nune ligne bizarre");
await p.click('[data-act=editsave]');await p.waitForTimeout(100);
log('1 toast:',await p.textContent('#toast'),'| carte:',(await p.textContent('article[data-date="2026-10-08"] .chip')).trim(),'| durée',await p.evaluate(()=>S.byDate['2026-10-08'].day.durationMin));
log('  étapes:',await p.$$eval('.bigsteps .t1',e=>e.map(x=>x.textContent).join(' | ')));
await p.click('[data-act=editreset]');await p.waitForTimeout(80);log('  remise:',(await p.textContent('article[data-date="2026-10-08"] .chip')).trim());
await p.click('#toast .toastbtn');await p.waitForTimeout(80);log('  annuler la remise:',(await p.textContent('article[data-date="2026-10-08"] .chip')).trim());
await p.click('[data-act=close]');
// 2. planifier une séance un jour libre
await p.click('[data-act=next]');await p.click('[data-act=next]');await p.click('[data-act=next]');
log('2 semaine',await p.textContent('.navlabel'));
await p.click('article[data-date="2026-10-28"]');await p.click('[data-act=edit]');await p.fill('#ed-lines','45\' 65% VMA');await p.fill('#ed-dur','45');await p.click('[data-act=editsave]');await p.waitForTimeout(80);
await p.click('[data-act=close]');log('  carte du jour libre:',(await p.textContent('article[data-date="2026-10-28"]')).replace(/\s+/g,' ').trim().slice(0,60));
// 3. supprimer une sortie puis annuler
await p.click('article[data-date="2026-10-29"]');await p.click('[data-act=lognew]');await p.fill('#log-dur','30');await p.click('[data-act=logsave]');
await p.waitForTimeout(80);await p.click('.logitem [data-act=logdel]');log('3 après suppression:',await p.evaluate(()=>(S.logs['2026-10-29']||[]).length));
await p.click('#toast .toastbtn');await p.waitForTimeout(80);log('  après Annuler:',await p.evaluate(()=>(S.logs['2026-10-29']||[]).length));await p.click('[data-act=close]');
// 4. supprimer un plan puis annuler
await p.click('[data-act=tab][data-view=plans] >> nth=0');const id=await p.evaluate(()=>S.plans[0].id);
await p.click(`[data-act=plandel][data-id=${id}]`);log('4 plans après suppression:',await p.evaluate(()=>S.plans.length));
await p.click('#toast .toastbtn');await p.waitForTimeout(80);log('  après Annuler:',await p.evaluate(()=>S.plans.length),'| séance modifiée gardée:',await p.evaluate(()=>!!S.edits['2026-10-08']));
// 5. FC max
await p.click('.profpill');await p.fill('#pf-fcmax','190');await p.press('#pf-fcmax','Tab');await p.waitForTimeout(80);
log('5 zones:',await p.$$eval('.zones tbody tr',r=>r.map(x=>x.cells[2].textContent).join(' / ')));
await p.click('.tabs [data-view=plan]');await p.click('[data-act=today]');log('  objectif:',await p.textContent('article[data-date="2026-10-06"] .obj'));
await p.reload();await p.waitForSelector('.week');log('6 après rechargement: séance modifiée',await p.evaluate(()=>S.byDate['2026-10-08'].day.typeText),'| FC max',await p.evaluate(()=>S.profile.fcmax));
log(errs.length?errs:'pas d\'erreur');await b.close();})().catch(e=>{console.log('ÉCHEC',e.message.split('\n')[0]);process.exit(1)});
