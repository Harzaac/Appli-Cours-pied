const path=require('path');const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
(async()=>{const b=await chromium.launch();const errs=[];
for (const today of ['2026-10-11','2026-10-20']) {
const p=await b.newPage({viewport:{width:1280,height:900}});
p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript((t)=>{window.__TODAY__=t},today);
await p.goto('file://'+root+'/dist/appli-marathon.html');
await p.setInputFiles('#file-xlsx',root+'/test/plan-test.xlsx');await p.click('[data-act=useplan]');await p.waitForSelector('.week');
await p.screenshot({path:root+'/shots/v12-accueil-'+today+'.png',fullPage:true});
console.log(today,'taper:',await p.$eval('.taper',e=>e.innerText.replace(/\s+/g,' ')).catch(()=> 'aucun'));
if(today==='2026-10-11'){
 await p.click('[data-act=tab][data-view=race]');
 console.log(await p.$$eval('.raceplan tbody tr',r=>r.map(x=>x.innerText.replace(/\s+/g,' ')).join('\n')));
 await p.click('[data-act=ravmode][data-m=min]');await p.fill('#rav-every','30');await p.press('#rav-every','Enter');
 await p.fill('#race-note','Gel km 10, 20, 30');await p.press('#race-note','Tab');
 console.log('--- 30 min');console.log(await p.$$eval('.raceplan tbody tr',r=>r.map(x=>x.innerText.replace(/\s+/g,' ')).join('\n')));
 await p.screenshot({path:root+'/shots/v12-course.png',fullPage:true});
 await p.emulateMedia({media:'print'});await p.screenshot({path:root+'/shots/v12-print.png',fullPage:true});
 await p.setViewportSize({width:390,height:844});await p.emulateMedia({media:'screen'});await p.screenshot({path:root+'/shots/v12-course-mobile.png',fullPage:true});
 console.log('overflow mobile',await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1));
}
}
console.log(errs.length?errs:'pas d\'erreur');await b.close();})();
