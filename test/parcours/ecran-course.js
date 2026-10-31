const path=require('path');const {chromium}=require('playwright');const root=path.join(__dirname,'..','..');
(async()=>{const b=await chromium.launch();const errs=[];
for(const [w,n] of [[1280,'pc'],[390,'mob']]){
const p=await b.newPage({viewport:{width:w,height:820},colorScheme:'dark'});p.on('pageerror',e=>errs.push(e.message));
await p.route(/open-meteo\.com/,r=>r.abort());await p.addInitScript(()=>{window.__TODAY__='2026-10-11'});await p.goto('file://'+root+'/dist/appli-marathon.html');
await p.setInputFiles('#file-xlsx',root+'/test/donnees/plan-test.xlsx');await p.click('[data-act=useplan]');await p.waitForSelector('.week');
await p.click('[data-act=tab][data-view=race]');await p.click('.racecta [data-act=racemode]');await p.waitForSelector('.racemode');
await p.screenshot({path:root+`/shots/v30-${n}.png`});
console.log(n,'texte:',await p.textContent('.rm-k'),'| débordement:',await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
if(n==='pc'){await p.pdf({path:root+'/shots/v30-print.pdf',format:'A4',printBackground:true});}
await p.click('.backbtn');console.log(' retour au plan via le haut:',!!(await p.$('.racecta')));

}
console.log(errs.length?errs:'pas d\'erreur');await b.close();})();
