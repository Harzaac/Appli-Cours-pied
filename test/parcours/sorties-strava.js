// Import d'un fichier de sorties (Strava) : séances cochées avec le réalisé, courses, sorties libres, pas de doublon, Annuler.
const path=require('path');const {chromium}=require('playwright');const root=path.join(__dirname,'..','..');
const check=(lbl,ok)=>console.log((ok?'ok    ':'ÉCHEC ')+lbl);const file=root+'/test/donnees/sorties-exemple.json';
(async()=>{const b=require('../outils/hors-ligne.js')(await chromium.launch());const errs=[];
const p=await (await b.newContext({viewport:{width:1280,height:900}})).newPage();p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.__TODAY__='2026-11-01'});await p.goto('file://'+root+'/dist/appli-course-a-pied.html');
await p.setInputFiles('#file-xlsx',root+'/test/donnees/plan-test.xlsx');await p.fill('#imp-race','2026-10-25');await p.dispatchEvent('#imp-race','change');await p.click('[data-act=useplan]');await p.waitForSelector('.week');
await p.evaluate(()=>{setTrack('2026-10-25',{done:true,result:12302});setTrack('2026-10-20',{note:'ma note'});render();});
await p.click('.profpill');await p.setInputFiles('#file-sorties',file);await p.waitForTimeout(200);
const st=await p.evaluate(()=>({t20:S.tracking['2026-10-20'],t04:S.tracking['2026-10-04'],t25:S.tracking['2026-10-25'],logs:S.logs,races:S.races}));
check('séance du 20 cochée avec le réalisé, note gardée',st.t20.done&&st.t20.act.sid==='1'&&st.t20.note==='ma note');
check('semi un jour de séance : course sans plan + séance cochée par la course',st.races.some(r=>r.sid==='3'&&r.km===21.0975)&&st.t04.act.sid==='3');
check('échauffement du 4 en sortie libre',(st.logs['2026-10-04']||[]).some(l=>l.sid==='2'));
check('marathon : chrono saisi gardé, réalisé ajouté',st.t25.result===12302&&st.t25.act.sid==='5');
check('renfo et footing hors plan en sorties libres',(st.logs['2026-10-26']||[])[0].type==='renfo'&&(st.logs['2026-10-27']||[])[0].title==='Footing de reprise');
check('course sans titre nommée « 10 km · Acigné »',st.races.some(r=>r.name==='10 km · Acigné'&&r.result===2851));
check('message de bilan',/8 sorties ajoutées/.test(await p.textContent('[role=status]')));
await p.click('#toast button');
check('Annuler retire l\'import',await p.evaluate(()=>!S.tracking['2026-10-20'].act&&S.races.length===0&&S.tracking['2026-10-20'].note==='ma note'));
await p.setInputFiles('#file-sorties',file);await p.waitForTimeout(200);
await p.setInputFiles('#file-sorties',file);await p.waitForTimeout(200);
check('second import : rien en double',/Rien de nouveau/.test(await p.textContent('[role=status]'))&&await p.evaluate(()=>S.races.length===2&&Object.values(S.logs).flat().length===4));
// le bouton « Importer un profil » ajoute aussi (ne remplace pas) un fichier de sorties
await p.evaluate(()=>{S.races=[];S.logs={};Object.keys(S.tracking).forEach(d=>delete S.tracking[d].act);render();});
await p.setInputFiles('#file-json',file);await p.waitForTimeout(200);
check('fichier de sorties via Importer un profil : ajouté, plan gardé',await p.evaluate(()=>S.plans.length===1&&S.races.length===2&&S.tracking['2026-10-25'].result===12302));
await p.evaluate(()=>{S.ui.view='plan';S.ui.modal='2026-10-04';render();});
check('fenêtre du jour : bloc Réalisé',/Réalisé[\s\S]*21,5 km/.test(await p.textContent('#modal .actbox')));
console.log(errs.length?errs:'pas d\'erreur');await b.close();})();
