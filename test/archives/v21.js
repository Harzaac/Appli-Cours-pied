const path=require('path');const fs=require('fs');const {chromium}=require('playwright');const root=path.join(__dirname,'..');
(async()=>{const b=await chromium.launch();const errs=[];
const c1=await b.newContext({viewport:{width:1280,height:900},acceptDownloads:true});const p=await c1.newPage();p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.__TODAY__='2026-10-11'});await p.goto('file://'+root+'/dist/appli-marathon.html');
await p.setInputFiles('#file-xlsx',root+'/test/plan-test.xlsx');await p.click('[data-act=useplan]');await p.waitForSelector('.week');
// suivi : marquer une séance faite avec une note
await p.click('[data-act=open][data-date="2026-10-07"] >> nth=0');await p.waitForSelector('textarea.note');
await p.fill('textarea.note','NOTE-TEST-ADRIEN');await p.press('textarea.note','Tab');
const dn=await p.$('[data-act=done]');if(dn)await dn.click();
await p.click('[data-act=close]');
await p.click('[data-act=tab][data-view=data]');
const [d1]=await Promise.all([p.waitForEvent('download'),p.click('[data-act=htmlcopy]')]);
const f1=root+'/shots/copie-test.html';await d1.saveAs(f1);console.log('copie:',d1.suggestedFilename(),(fs.statSync(f1).size/1024).toFixed(0),'Ko');
const [d2]=await Promise.all([p.waitForEvent('download'),p.click('[data-act=htmlcoach]')]);
const f2=root+'/shots/coach-test.html';await d2.saveAs(f2);console.log('coach:',d2.suggestedFilename(),(fs.statSync(f2).size/1024).toFixed(0),'Ko');
// ouvrir chaque copie dans un contexte vierge
for(const [nom,f] of [['copie',f1],['coach',f2]]){
 const c=await b.newContext({viewport:{width:1280,height:900},acceptDownloads:true});const q=await c.newPage();q.on('pageerror',e=>errs.push(nom+': '+e.message));
 await q.addInitScript(()=>{window.__TODAY__='2026-10-11'});await q.goto('file://'+f);
 const hasWeek=!!(await q.waitForSelector('.week',{timeout:4000}).catch(()=>null));
 let note='-';
 if(hasWeek){await q.click('[data-act=open][data-date="2026-10-07"] >> nth=0');await q.waitForSelector('textarea.note');note=await q.inputValue('textarea.note');await q.click('[data-act=close]');}
 console.log(nom,'→ plan présent:',hasWeek,'| note:',JSON.stringify(note));
 if(nom==='copie'){ // la copie peut être recopiée, une seule balise de données
   await q.click('[data-act=tab][data-view=data]');
   const [d3]=await Promise.all([q.waitForEvent('download'),q.click('[data-act=htmlcopy]')]);const f3=root+'/shots/copie2-test.html';await d3.saveAs(f3);
   const t=fs.readFileSync(f3,'utf8');console.log('recopie: balises embedded-data =',(t.match(/id="embedded-data"/g)||[]).length,'| doctype:',t.startsWith('<!doctype html>'));
 }
 await c.close();}
console.log(errs.length?errs:'pas d\'erreur');await b.close();})();
