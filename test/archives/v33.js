const path=require('path');const {chromium}=require('playwright');const root=path.join(__dirname,'..');
(async()=>{const b=await chromium.launch();const errs=[];
for(const [w,n] of [[1280,'pc'],[390,'mob']]){
const p=await b.newPage({viewport:{width:w,height:900}});p.on('pageerror',e=>errs.push(e.message));await p.route(/open-meteo\.com|fonts\.g/,r=>r.abort());
await p.addInitScript(()=>{window.__TODAY__='2026-10-31'});await p.goto('file://'+root+'/shots/v32-copie.html');await p.waitForSelector('.week');
await p.screenshot({path:root+`/shots/v33-semaine-${n}.png`,clip:{x:0,y:n==='pc'?480:540,width:w,height:n==='pc'?420:420}});
await p.click('[data-act=tab][data-view=data]');
const id=await p.evaluate(()=>S.plans[1].id);await p.click(`[data-act=redate][data-id=${id}]`);
await p.locator('section.card:has(h2:text-is("Mes plans"))').screenshot({path:root+`/shots/v33-plans-${n}.png`});
console.log(n,'débordement',await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth));}
console.log(errs.length?errs:'pas d\'erreur');await b.close();})();
