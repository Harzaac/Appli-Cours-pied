const path=require('path');const {chromium}=require('playwright');const root=path.join(__dirname,'..');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push('console: '+m.text())});
await p.route(/open-meteo\.com/,r=>r.abort());
await p.addInitScript(()=>{window.__TODAY__='2026-10-11'});await p.goto('file://'+root+'/dist/appli-marathon.html');
await p.setInputFiles('#file-xlsx',root+'/test/plan-test.xlsx');await p.waitForSelector('[data-act=useplan]');
console.log('aperçu import:',(await p.textContent('.card .sub strong').catch(()=>'-')));
await p.click('[data-act=useplan]');await p.waitForSelector('.week');
console.log('plans:',await p.evaluate(()=>S.plans.length),'| semaine:',await p.textContent('.navlabel'));
console.log(errs.length?errs:'pas d\'erreur');await b.close();})();
