const path=require('path');const fs=require('fs');const {chromium}=require('playwright');const root=path.join(__dirname,'..','..');
const log=(...a)=>console.log(...a);
(async()=>{const b=await chromium.launch();const errs=[];const ctx=await b.newContext({viewport:{width:1280,height:900},acceptDownloads:true});const p=await ctx.newPage();
p.on('pageerror',e=>errs.push(e.message));await p.route(/open-meteo\.com|fonts\.g/,r=>r.abort());await p.addInitScript(()=>{window.__TODAY__='2026-10-31'});
await p.goto('file://'+root+'/dist/appli-course-a-pied.html');await p.waitForSelector('.week');
// plan de Lille 2026 + chrono
await p.click('[data-act=tab][data-view=plans] >> nth=0');
await p.setInputFiles('#file-xlsx >> nth=0',root+'/test/donnees/plan-test.xlsx');await p.waitForSelector('#imp-race');
await p.fill('#imp-race','2026-10-25');await p.dispatchEvent('#imp-race','change');await p.waitForTimeout(80);await p.click('[data-act=useplan]');await p.waitForSelector('.navlabel');
await p.evaluate(()=>{setTrack('2026-10-25',{done:true,result:12312,pr:true});render();});
// course sans plan
await p.click('[data-act=tab][data-view=plans] >> nth=0');
await p.fill('#rc-name','10 km de Rennes');await p.fill('#rc-date','2026-11-22');await p.selectOption('#rc-km','10');await p.fill('#rc-target',"42'30");
await p.click('[data-act=raceadd]');log('1 course ajoutée:',JSON.stringify(await p.evaluate(()=>S.races.map(r=>[r.name,r.date,r.km,r.targetSec]))));
await p.fill('#rc-date','');await p.click('[data-act=raceadd]');log('  sans date:',await p.textContent('#races-card [role=alert]'));
// plan de reprise
log('2 date de reprise proposée:',await p.inputValue('#rec-date'));
await p.click('[data-act=recadd]');await p.waitForSelector('.navlabel');
log('  en-tête:',(await p.textContent('.count')).replace(/\s+/g,' ').trim(),'| semaine:',await p.textContent('.navlabel'),'| onglets:',await p.$$eval('.tabs button',e=>e.map(x=>x.textContent).join('/')));
log('  séances S1:',await p.$$eval('.week .dcard:not(.rest) .chip',e=>e.map(x=>x.textContent).join(', ')));
await p.click('[data-act=tab][data-view=plans] >> nth=0');await p.click('[data-act=recadd]');log('  2e reprise:',(await p.textContent('[role=alert]')).trim().slice(0,90));
// course dans le calendrier
await p.click('.tabs [data-view=plan]');for(let k=0;k<3;k++)await p.click('[data-act=next]');
log('3 semaine',await p.textContent('.navlabel'),'| puce course:',await p.$$eval('.dcard .chip.c-race',e=>e.map(x=>x.textContent).join(',')));
await p.evaluate(()=>{window.__TODAY__=null;});
await p.click('[data-act=open][data-date="2026-11-22"] >> nth=0');await p.waitForSelector('#rres-'+await p.evaluate(()=>S.races[0].id));
const rid=await p.evaluate(()=>S.races[0].id);await p.fill('#rres-'+rid,"41'50");await p.press('#rres-'+rid,'Tab');await p.waitForTimeout(100);
log('  chrono course:',await p.evaluate(()=>S.races[0].result));await p.click('[data-act=close]');
// progression
await p.click('.tabs [data-view=bilan]');log('4 mes courses:',(await p.textContent('.races')).replace(/\s+/g,' ').trim().slice(0,200));
// profil
await p.click('.tabs [data-view=data]');await p.fill('#pf-name','Adrien');await p.press('#pf-name','Tab');await p.waitForTimeout(80);
log('5 résumé:',(await p.textContent('h2:text-is("Mon profil") >> xpath=../..')).match(/Adrien[^.]*/)[0].slice(0,140));
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('[data-act=download]')]);const f=root+'/shots/'+dl.suggestedFilename();await dl.saveAs(f);
log('  export:',dl.suggestedFilename(),'| contient',Object.keys(JSON.parse(fs.readFileSync(f,'utf8'))).filter(k=>['plans','races','logs','profile','tracking'].includes(k)).join(','));
const c2=await b.newContext();const q=await c2.newPage();q.on('pageerror',e=>errs.push('q:'+e.message));await q.route(/open-meteo\.com|fonts\.g/,r=>r.abort());await q.addInitScript(()=>{window.__TODAY__='2026-10-31'});
await q.goto('file://'+root+'/dist/appli-course-a-pied.html');await q.waitForSelector('.week');await q.click('.hero [data-view=data]');await q.setInputFiles('#file-json',f);await q.waitForTimeout(300);
log('6 import sur appareil vierge: plans',await q.evaluate(()=>S.plans.length),'| courses',await q.evaluate(()=>S.races.length),'| prénom',await q.evaluate(()=>S.profile.name));
log(errs.length?errs:'pas d\'erreur');await b.close();})().catch(e=>{console.log('ÉCHEC',e.message.split('\n')[0]);process.exit(1)});
