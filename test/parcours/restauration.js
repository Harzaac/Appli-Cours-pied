const path=require('path');const fs=require('fs');const {chromium}=require('playwright');const root=path.join(__dirname,'..','..');
(async()=>{const b=await chromium.launch();const errs=[];
const c1=await b.newContext({viewport:{width:1280,height:900},acceptDownloads:true});const p=await c1.newPage();p.on('pageerror',e=>errs.push(e.message));
await p.route(/open-meteo\.com/,r=>r.abort());
await p.addInitScript(()=>{window.__TODAY__='2026-10-11'});await p.goto('file://'+root+'/dist/appli-course.html');
await p.setInputFiles('#file-xlsx',root+'/test/donnees/plan-test.xlsx');await p.click('[data-act=useplan]');await p.waitForSelector('.week');
await p.evaluate(()=>{setTrack('2026-10-07',{done:true,note:'MA-NOTE'});S.ui.accent='braise';saveStore();render();});
await p.click('[data-act=tab][data-view=data]');
await p.screenshot({path:root+'/shots/v27-donnees.png',clip:{x:0,y:480,width:1280,height:520}});
const [d1]=await Promise.all([p.waitForEvent('download'),p.click('[data-act=htmlcopy]')]);await d1.saveAs(root+'/shots/r-copie.html');
const [d2]=await Promise.all([p.waitForEvent('download'),p.click('[data-act=htmlcoach]')]);await d2.saveAs(root+'/shots/r-coach.html');
await p.click('details.raw:has-text("Autre format") summary');
const [d3]=await Promise.all([p.waitForEvent('download'),p.click('[data-act=download]')]);await d3.saveAs(root+'/shots/r-save.json');
console.log('textarea restante:',await p.$$eval('textarea.json',e=>e.length));
// nouvelle version = fichier vierge, contexte neuf
for(const [nom,f] of [['copie .html','r-copie.html'],['sauvegarde .json','r-save.json'],['plan coach .html','r-coach.html']]){
 const c=await b.newContext({viewport:{width:1280,height:900}});const q=await c.newPage();q.on('pageerror',e=>errs.push(nom+': '+e.message));
 await q.addInitScript(()=>{window.__TODAY__='2026-10-11'});await q.goto('file://'+root+'/dist/appli-course.html');
 // écran vide : accès à la restauration ?
 const btn=await q.$('[data-act=pickjson]');
 if(!btn){await q.click('[data-act=tab][data-view=data]').catch(()=>{});}
 await q.setInputFiles('#file-json',root+'/shots/'+f);await q.waitForTimeout(400);
 const ok=await q.$('.week');let note='-',acc='-';
 if(ok){acc=await q.evaluate(()=>S.ui.accent);note=await q.evaluate(()=>(track('2026-10-07')||{}).note||'');}
 console.log(nom,'→ plan restauré:',!!ok,'| note:',JSON.stringify(note),'| couleur:',acc);
 await c.close();}
// fichier invalide
const c=await b.newContext();const q=await c.newPage();await q.goto('file://'+root+'/dist/appli-course.html');
await q.click('[data-act=tab][data-view=data]');await q.setInputFiles('#file-json',root+'/dist/appli-course.html');await q.waitForTimeout(300);
console.log('copie vierge →',(await q.textContent('[role=status]').catch(()=>'?')).slice(0,70));
console.log(errs.length?errs:'pas d\'erreur');await b.close();})();
