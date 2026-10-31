const path=require('path');const {chromium}=require('playwright');const root=path.join(__dirname,'..','..');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errs.push(e.message));
await p.route(/open-meteo\.com|fonts\.g/,r=>r.abort());await p.addInitScript(()=>{window.__TODAY__='2026-10-11'});
await p.goto('file://'+root+'/dist/appli-marathon.html');await p.waitForSelector('.week');
// sans plan : fourchette calculée
await p.click('.tabs [data-view=vma]');
console.log('sans plan :',await p.$$eval('.vmatable td[class^=vc-]',e=>e.length),'cases |',(await p.textContent('.vclegend')).trim().slice(0,60));
await p.setInputFiles('#file-xlsx >> nth=0',root+'/test/donnees/plan-couleurs.xlsx');await p.waitForSelector('#imp-race');
await p.click('[data-act=useplan]');await p.waitForSelector('.navlabel');
await p.click('.tabs [data-view=vma]');
const cells=await p.$$eval('.vmatable tbody tr',rows=>rows.map(r=>[r.cells[0].textContent,[...r.cells].slice(1).map((c,k)=>c.className?k+':'+c.className:'').filter(Boolean).join(',')]).filter(x=>x[1]));
console.log('avec le fichier du coach :',JSON.stringify(cells));
console.log('légende :',(await p.textContent('.vclegend')).trim());
await p.locator('section.card:has(h2:text-is("Tableau des temps selon la VMA"))').screenshot({path:root+'/shots/couleurs-vma.png'});
console.log(errs.length?errs:'pas d\'erreur');await b.close();})().catch(e=>{console.log('ÉCHEC',e.message.split('\n')[0]);process.exit(1)});
