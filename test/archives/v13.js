const path=require('path');const {chromium}=require('playwright');
const root=path.join(__dirname,'..');
(async()=>{const b=await chromium.launch();const errs=[];
const p=await b.newPage({viewport:{width:1280,height:900}});
p.on('pageerror',e=>errs.push(e.message));
await p.addInitScript(()=>{window.__TODAY__='2026-10-08'});
await p.goto('file://'+root+'/dist/appli-marathon.html');
await p.setInputFiles('#file-xlsx',root+'/test/plan-test.xlsx');await p.click('[data-act=useplan]');await p.waitForSelector('.week');
const row=async()=>console.log(await p.$$eval('.dcard',c=>c.map(x=>x.querySelector('.dow').textContent+':'+(x.querySelector('.chip')?x.querySelector('.chip').textContent:'Repos')+(x.querySelector('.moved')?'*':'')).join(' | ')));
await row();
// glisser mercredi (VMA) vers vendredi (repos)
await p.dragAndDrop('[data-slot="2026-10-07"]','[data-slot="2026-10-09"]');
await row();console.log('note:',await p.textContent('.movebar'));
await p.screenshot({path:root+'/shots/v13-deplace.png',fullPage:true});
await p.click('[data-act=moveundo]');await row();
// mode clic : Déplacer jeudi -> mardi
await p.click('[data-act=movestart][data-date="2026-10-08"]');
await p.click('[data-act=moveto][data-date="2026-10-06"]');await row();
// suivi suit la séance
await p.click('[data-act=open][data-date="2026-10-06"] >> nth=0');await p.click('[data-act=done]');await p.click('[data-act=close]');
await p.click('[data-act=moveundo]');
console.log('fait après annulation (jeudi):',await p.$eval('[data-slot="2026-10-08"]',e=>e.classList.contains('done')),'mardi:',await p.$eval('[data-slot="2026-10-06"]',e=>e.classList.contains('done')));
await p.dragAndDrop('[data-slot="2026-10-07"]','[data-slot="2026-10-11"]');console.log('vers dimanche (sortie longue) échange:');await row();
await p.click('[data-act=resetweek]');await row();
await p.dragAndDrop('[data-slot="2026-10-07"]','[data-slot="2026-10-09"]');
await p.reload();await p.waitForSelector('.week');console.log('après rechargement:');await row();
await p.click('[data-act=mode][data-mode=month]');await p.screenshot({path:root+'/shots/v13-mois.png'});
console.log(errs.length?errs:'pas d\'erreur');await b.close();})();
