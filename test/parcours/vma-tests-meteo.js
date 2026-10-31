const path=require('path');const {chromium}=require('playwright');const root=path.join(__dirname,'..','..');
const log=(...a)=>console.log(...a);
(async()=>{const b=require('../outils/hors-ligne.js')(await chromium.launch());const errs=[];const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errs.push(e.message));
// météo simulée : chaud le mardi 13, venteux et pluvieux le mercredi 14, froid le jeudi 15
await p.route(/open-meteo\.com/,r=>{const t=[],mx=[],mn=[],pp=[],w=[],g=[],c=[],rs=[];for(let k=0;k<16;k++){const d=new Date(Date.UTC(2026,9,11+k)).toISOString().slice(0,10);t.push(d);mx.push(d==='2026-10-13'?29:16);mn.push(d==='2026-10-15'?-1:9);pp.push(d==='2026-10-14'?80:10);w.push(d==='2026-10-14'?42:12);g.push(d==='2026-10-14'?60:20);c.push(3);rs.push(0);}
 r.fulfill({contentType:'application/json',body:JSON.stringify({daily:{time:t,weather_code:c,temperature_2m_max:mx,temperature_2m_min:mn,precipitation_probability_max:pp,precipitation_sum:rs,wind_speed_10m_max:w,wind_gusts_10m_max:g}})});});
await p.addInitScript(()=>{window.__TODAY__='2026-10-11'});await p.goto('file://'+root+'/dist/appli-course-a-pied.html');await p.waitForSelector('.week');
await p.setInputFiles('#file-xlsx >> nth=0',root+'/test/donnees/plan-test.xlsx');await p.click('[data-act=useplan]');await p.waitForSelector('.week');await p.waitForTimeout(400);
await p.click('[data-act=next]');
for(const d of ['2026-10-13','2026-10-14','2026-10-15']){
  const has=await p.$(`article[data-date="${d}"][data-act=open]`);if(!has){log(d,'repos');continue;}
  await p.click(`article[data-date="${d}"]`);await p.waitForSelector('.panel');
  log(d,await p.evaluate((d)=>S.byDate[d].day.category,d),'→',(await p.$$eval('.wxtip li',e=>e.map(x=>x.textContent.slice(0,70)))).join(' / ')||'(aucun conseil)');
  await p.click('[data-act=close]');
}
// tests de VMA
await p.click('.tabs [data-view=vma]');
await p.fill('#vt-value','1650');await p.fill('#vt-date','2026-09-01');await p.click('[data-act=vtadd]');
await p.selectOption('#vt-kind','paliers');await p.fill('#vt-value','17');await p.fill('#vt-date','2026-10-10');await p.click('[data-act=vtadd]');
log('tests:',await p.$$eval('.vtlist li strong',e=>e.map(x=>x.textContent).join(', ')),'| graphique:',!!(await p.$('.vmachart')),'|',(await p.textContent('.vtlist + svg + p').catch(()=>'')).trim());
await p.click('.vtlist [data-act=vtuse] >> nth=0');log('VMA utilisée:',await p.evaluate(()=>S.settings.vma),'| toast:',await p.textContent('#toast'));
await p.click('#toast .toastbtn');log('annulé → VMA',await p.evaluate(()=>S.settings.vma));
await p.locator('section.card:has(h2:text-is("Tests de VMA"))').screenshot({path:root+'/shots/tests-vma.png'});
log(errs.length?errs:'pas d\'erreur');await b.close();})().catch(e=>{console.log('ÉCHEC',e.message.split('\n')[0]);process.exit(1)});
