// Captures de référence pour vérifier qu'un rangement du CSS ne change rien à l'écran.
// node test/visuel.js <dossier>  -> une capture par état, thème et largeur
const path=require('path');const fs=require('fs');const {chromium}=require('playwright');const root=path.join(__dirname,'..');
const out=process.argv[2]?path.join(root,'shots',process.argv[2]):path.join(__dirname,'donnees','captures-reference');fs.mkdirSync(out,{recursive:true});
(async()=>{const b=require('./outils/hors-ligne.js')(await chromium.launch());const errs=[];let n=0;
for(const [w,h,dev] of [[1280,900,'pc'],[390,844,'mob']]) for(const scheme of ['light','dark']){
 const ctx=await b.newContext({viewport:{width:w,height:h},colorScheme:scheme,reducedMotion:'reduce'});const p=await ctx.newPage();
 p.on('pageerror',e=>errs.push(e.message));await p.route(/open-meteo\.com|fonts\.g/,r=>r.abort());
 await p.addInitScript(()=>{window.__TODAY__='2026-10-11'});await p.goto('file://'+root+'/dist/appli-course-a-pied.html');await p.waitForSelector('.week');
 const shot=async(name,full=true)=>{await p.addStyleTag({content:'#toast{display:none!important}'});await p.mouse.move(0,0);await p.waitForTimeout(60);await p.screenshot({path:path.join(out,`${dev}-${scheme}-${name}.png`),fullPage:full});n++;};
 await shot('vide');
 await p.click('[data-act=pickxlsx] >> nth=0').catch(()=>{});
 await p.setInputFiles('#file-xlsx >> nth=0',root+'/test/donnees/plan-test.xlsx');await p.waitForSelector('#imp-race');await shot('import');
 await p.click('[data-act=useplan]');await p.waitForSelector('.week');
 await p.evaluate(()=>{setTrack('2026-10-06',{done:true,feel:4,note:'ok'});setTrack('2026-10-07',{skipped:true});S.logs['2026-10-09']=[{id:'a',type:'footing',min:40,km:7,feel:3,note:'x'}];S.remindUntil='2099-01-01';saveStore();render();});
 await shot('semaine');
 await p.click('[data-act=mode][data-mode=month]');await shot('mois');await p.click('[data-act=mode][data-mode=week]');await p.click('[data-act=today]');
 await p.click('[data-act=open][data-date="2026-10-08"] >> nth=0');await p.waitForSelector('.panel');await shot('modale',false);
 await p.click('[data-act=lognew]');await shot('modale-sortie',false);await p.click('[data-act=close]');
 await p.click('[data-act=next]');await p.click('[data-act=next]');await p.click('[data-act=open][data-date="2026-10-25"] >> nth=0');await p.waitForSelector('#race-result');
 await p.fill('#race-result',"3h25'12");await p.press('#race-result','Tab');await p.waitForTimeout(80);await shot('modale-course',false);await p.click('[data-act=close]');
 await shot('semaine-course');
 for(const v of ['vma','race','bilan','data','plans','profile']){if(v==='profile'){await p.click('.profpill');}else if(v==='plans'){await p.click('.tabs [data-view=plan]');await p.click('[data-act=tab][data-view=plans] >> nth=0');}else await p.click(`.tabs [data-view=${v}]`);if(v==='data'){await p.click('details[data-pref=wx] summary');await p.click('details[data-pref=look] summary');}await shot(v);}
 await p.click('.tabs [data-view=race]');await p.click('.racecta [data-act=racemode]');await shot('ecran-course');await p.click('[data-act=racequit]');
 await p.evaluate(()=>{S.ui.accent='braise';saveStore();render();});await p.click('.tabs [data-view=plan]');await shot('braise');
 await ctx.close();}
console.log(n,'captures dans',out,errs.length?errs:'· pas d\'erreur');await b.close();})();
