const path=require('path');const fs=require('fs');const {chromium}=require('playwright');const root=path.join(__dirname,'..','..');
(async()=>{const b=await chromium.launch();const errs=[];const ctx=await b.newContext({viewport:{width:1280,height:900},acceptDownloads:true});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.__TODAY__='2026-10-11'});await p.goto('file://'+root+'/dist/appli-marathon.html');
await p.setInputFiles('#file-xlsx',root+'/test/donnees/plan-test.xlsx');await p.click('[data-act=useplan]');await p.waitForSelector('.week');
await p.click('[data-act=open][data-date="2026-10-07"] >> nth=0');await p.waitForSelector('.garmin');
await p.fill('#fit-tol','3');await p.press('#fit-tol','Tab');
const [dl]=await Promise.all([p.waitForEvent('download'),p.click('[data-act=fitexport]')]);
const f=root+'/shots/'+dl.suggestedFilename();await dl.saveAs(f);console.log('fichier:',dl.suggestedFilename(),fs.statSync(f).size,'octets');
console.log(await p.textContent('.garmin [role=status]'));
await p.screenshot({path:root+'/shots/v20-modal.png'});
// course : pas d'export
await p.click('[data-act=close]');await p.click('[data-act=next]');await p.click('[data-act=next]');await p.click('[data-act=open][data-date="2026-10-25"] >> nth=0');
console.log('export sur jour de course:',!!(await p.$('.garmin')));
console.log(errs.length?errs:'pas d\'erreur');await b.close();})();
