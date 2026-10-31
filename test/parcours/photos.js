const path=require('path');const {chromium}=require('playwright');const root=path.join(__dirname,'..','..');
(async()=>{const b=require('../outils/hors-ligne.js')(await chromium.launch());const errs=[];const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errs.push(e.message));
await p.route(/open-meteo\.com|fonts\.g/,r=>r.abort());await p.addInitScript(()=>{window.__TODAY__='2026-10-31'});
await p.goto('file://'+root+'/dist/appli-course-a-pied.html');await p.waitForSelector('.week');
const img=root+'/assets/icone-192.png';
// rond du bandeau
await p.click('button.crest');await p.setInputFiles('#file-crest',img);await p.waitForTimeout(400);
console.log('bandeau : photo',await p.evaluate(()=>S.crest.slice(0,15)),'| menu fermé',!(await p.$('.crestmenu')));
await p.click('button.crest');await p.click('[data-act=crestreset]');console.log('  logo remis',await p.evaluate(()=>S.crest===''));
// avatar du profil
await p.click('.profpill');await p.fill('#pf-name','Adrien');await p.press('#pf-name','Tab');await p.waitForTimeout(100);
await p.click('.avbtn');await p.setInputFiles('#file-av',img);await p.waitForTimeout(400);
console.log('avatar : photo',!!(await p.evaluate(()=>S.profile.photo)),'| dans la pastille',!!(await p.$('.profpill img')));
await p.click('.avbtn');await p.keyboard.press('Escape');console.log('  Échap ferme le menu',!(await p.$('.crestmenu')));
await p.reload();await p.waitForSelector('.week');console.log('  après rechargement',!!(await p.$('.profpill img')));
await p.click('.profpill');await p.click('.avbtn');await p.click('[data-act=avreset]');console.log('  initiales remises :',(await p.textContent('.profpill .avatar')).trim());
console.log(errs.length?errs:'pas d\'erreur');await b.close();})().catch(e=>{console.log('ÉCHEC',e.message.split('\n')[0]);process.exit(1)});
