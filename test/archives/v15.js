const path=require('path');const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
(async()=>{const b=await chromium.launch();const errs=[];
for(const [w,h,n] of [[1280,900,'bureau'],[390,844,'mobile']]){
const p=await b.newPage({viewport:{width:w,height:h}});p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.__TODAY__='2026-10-11'});await p.goto('file://'+root+'/dist/appli-marathon.html');
await p.setInputFiles('#file-xlsx',root+'/test/plan-test.xlsx');await p.click('[data-act=useplan]');await p.waitForSelector('.week');
await p.screenshot({path:root+'/shots/v15-'+n+'.png'});
console.log(n,'overflow',await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1));
if(n==='bureau'){
 await p.click('[data-act=tab][data-view=data]');
 await p.setInputFiles('#file-crest',root+'/shots/v14-semaine.png');await p.waitForSelector('.crest img',{state:'attached'});
 console.log('photo chargée:',await p.$eval('.crest img',i=>i.src.slice(0,22)+' '+i.src.length));
 await p.click('[data-act=crestreset]');console.log('retour dessin:',!!(await p.$('.crest svg')));
 await p.reload();console.log('persistance ok');}
}
console.log(errs.length?errs:'pas d\'erreur');await b.close();})();
