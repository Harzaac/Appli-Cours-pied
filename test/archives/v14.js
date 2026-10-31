const path=require('path');const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
(async()=>{const b=await chromium.launch();const errs=[];
async function open(today,w,h){const p=await b.newPage({viewport:{width:w,height:h}});p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript((t)=>{window.__TODAY__=t},today);await p.goto('file://'+root+'/dist/appli-marathon.html');
await p.setInputFiles('#file-xlsx',root+'/test/plan-test.xlsx');await p.click('[data-act=useplan]');return p;}
let p=await open('2026-10-09',1280,900);await p.waitForSelector('.week');
console.log('avant:',await p.textContent('.weekhead'));
await p.click('[data-act=bulkdone]');console.log('après bulk:',await p.textContent('.weekhead'));
await p.click('[data-act=open][data-date="2026-10-10"] >> nth=0');await p.click('[data-act=skip]');await p.click('[data-act=close]');
console.log('sautée:',await p.textContent('.weekhead'),'| carte samedi:',await p.$eval('[data-slot="2026-10-10"]',e=>e.className+' / '+e.querySelector('.tick')?.textContent));
await p.screenshot({path:root+'/shots/v14-semaine.png',fullPage:true});
await p.click('[data-act=tab][data-view=bilan]');console.log('bilan:',(await p.textContent('.kpis')).replace(/\s+/g,' '));
await p.click('[data-act=tab][data-view=race]');await p.click('[data-act=racemode]');await p.screenshot({path:root+'/shots/v14-jourJ.png',fullPage:true});
await p.click('[data-act=racequit]');console.log('quitter ok:',!!(await p.$('.week, .raceplan')));
let q=await open('2026-10-25',390,844);await q.waitForSelector('.rm-pace');console.log('jour J auto:',await q.textContent('.rm-k'));
await q.screenshot({path:root+'/shots/v14-jourJ-mobile.png',fullPage:true});
console.log('overflow mobile',await q.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1));
console.log(errs.length?errs:'pas d\'erreur');await b.close();})();
