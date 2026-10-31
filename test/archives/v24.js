const path=require('path');const {chromium}=require('playwright');const root=path.join(__dirname,'..');
(async()=>{const b=await chromium.launch();const p=await b.newPage();let calls=[];
await p.route(/open-meteo\.com/,r=>{calls.push(r.request().url().split('?')[0]);r.abort();});
await p.addInitScript(()=>{window.__TODAY__='2026-10-11'});await p.goto('file://'+root+'/dist/appli-marathon.html');
await p.setInputFiles('#file-xlsx',root+'/test/plan-test.xlsx');await p.click('[data-act=useplan]');await p.waitForSelector('.week');await p.waitForTimeout(500);
console.log('météo activée par défaut:',await p.evaluate(()=>wxCfg().on),'| requêtes:',calls.length);await b.close();})();
