const path=require('path');const {chromium}=require('playwright');const root=path.join(__dirname,'..');
(async()=>{const b=await chromium.launch();const errs=[];
for(const scheme of ['light','dark']){
 const ctx=await b.newContext({viewport:{width:1280,height:860},colorScheme:scheme});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
 await p.route(/open-meteo\.com/,r=>r.abort());
 await p.addInitScript(()=>{window.__TODAY__='2026-10-11'});await p.goto('file://'+root+'/dist/appli-marathon.html');
 await p.setInputFiles('#file-xlsx',root+'/test/plan-test.xlsx');await p.click('[data-act=useplan]');await p.waitForSelector('.week');
 await p.evaluate(()=>{['2026-10-06','2026-10-07'].forEach(d=>setTrack(d,{done:true}));S.remindUntil='2099-01-01';wxSet({on:false});render();});
 for(const id of ['ocean','foret','braise','graphite']){
  await p.evaluate((id)=>{S.ui.accent=id;saveStore();render();},id);
  await p.screenshot({path:`${root}/shots/th-${scheme}-${id}.png`});
 }
 if(scheme==='light'){await p.evaluate(()=>{S.ui.accent='foret';S.ui.view='data';render();});await p.screenshot({path:root+'/shots/th-donnees.png',clip:{x:0,y:520,width:1280,height:380}});
  console.log('lien .linkbtn couleur:',await p.evaluate(()=>{S.ui.view='plan';render();const l=document.querySelector('.linkbtn');return l?getComputedStyle(l).color:'-'}));}
 await ctx.close();}
console.log(errs.length?errs:'pas d\'erreur');await b.close();})();
