const path=require('path');const {chromium}=require('playwright');const root=path.join(__dirname,'..','..');
(async()=>{const b=require('../outils/hors-ligne.js')(await chromium.launch());const errs=[];
async function open(today,w){const ctx=await b.newContext({viewport:{width:w,height:900}});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));await p.route(/open-meteo\.com/,r=>r.abort());
 await p.addInitScript((t)=>{window.__TODAY__=t},today);await p.goto('file://'+root+'/dist/appli-course-a-pied.html');
 await p.setInputFiles('#file-xlsx',root+'/test/donnees/plan-test.xlsx');await p.click('[data-act=useplan]');await p.waitForSelector('.week, .racemode');return p;}
let p=await open('2026-10-11',1280);
console.log('J-14 bandeau:',!!(await p.$('.racecta-banner')));
await p.click('[data-act=tab][data-view=race]');
console.log('carte écran de course:',await p.textContent('.racecta h2'));
await p.screenshot({path:root+'/shots/v28-course.png',clip:{x:0,y:430,width:1280,height:300}});
await p.click('.racecta [data-act=racemode]');console.log('écran de course ouvert:',!!(await p.$('.racemode')));
await p.click('[data-act=racequit]');
p=await open('2026-10-22',400);
console.log('J-3 bandeau:',!!(await p.$('.racecta-banner')),'|',(await p.textContent('.racecta-banner strong')));
await p.screenshot({path:root+'/shots/v28-j3.png',clip:{x:0,y:560,width:400,height:240}}).catch(()=>{});
await p.click('.racecta-banner [data-act=ctaoff]');console.log('après ✕:',!!(await p.$('.racecta-banner')));
await p.reload();await p.waitForSelector('.week');console.log('après rechargement:',!!(await p.$('.racecta-banner')));
console.log(errs.length?errs:'pas d\'erreur');await b.close();})();
