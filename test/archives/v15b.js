const path=require('path');const {chromium}=require('playwright');const root=path.join(__dirname,'..');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});
await p.addInitScript(()=>{window.__TODAY__='2026-10-11'});await p.goto('file://'+root+'/dist/appli-marathon.html');
await p.setInputFiles('#file-xlsx',root+'/test/plan-test.xlsx');await p.click('[data-act=useplan]');await p.waitForSelector('.week');await p.evaluate(()=>window.scrollTo(0,0));
await p.screenshot({path:root+'/shots/v15-mobile-top.png'});await b.close();})();
