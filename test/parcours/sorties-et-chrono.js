const path=require('path');const {chromium}=require('playwright');const root=path.join(__dirname,'..','..');
const log=(...a)=>console.log(...a);
(async()=>{const b=await chromium.launch();const errs=[];
const ctx=await b.newContext({viewport:{width:1280,height:900},acceptDownloads:true});const p=await ctx.newPage();
p.on('pageerror',e=>{errs.push(e.message);log('ERR',e.message)});await p.route(/open-meteo\.com|fonts\.g/,r=>r.abort());
await p.addInitScript(()=>{window.__TODAY__='2026-10-31'});await p.goto('file://'+root+'/dist/appli-course-a-pied.html');await p.waitForSelector('.week');
log('1 onglets sans plan:',await p.$$eval('.tabs button',e=>e.map(x=>x.textContent).join('/')));
await p.click('.tabs [data-view=vma]');
log('  VMA sans plan: titres',await p.$$eval('main h2',e=>e.map(x=>x.textContent).join(' | ')));
await p.selectOption('#ref-km',String(42.195));await p.fill('#ref-time',"3h25'00");await p.click('[data-act=refset]');
log('  prédictions:',(await p.$$eval('main table',t=>t[0].innerText)).replace(/\t/g,' ').split('\n').slice(1,5).join(' / '));
log('  VMA équivalente:',(await p.textContent('main section:nth-of-type(2) p:has(strong)').catch(()=>'-')).trim().slice(0,90));
await p.screenshot({path:root+'/shots/v35-vma.png',fullPage:true});
// 2. sortie libre
await p.click('.tabs [data-view=plan]');
await p.click('article.free[data-date="2026-10-31"]');await p.waitForSelector('[data-act=lognew]');
await p.click('[data-act=lognew]');await p.selectOption('#log-type','footing');await p.fill('#log-dur','45');await p.fill('#log-km','8,5');
await p.click('[data-act=logfeel][data-n="4"]');log('  durée gardée après sensation:',await p.inputValue('#log-dur'));
await p.fill('#log-note','Récup tranquille');await p.click('[data-act=logsave]');
log('2 sortie enregistrée:',await p.evaluate(()=>JSON.stringify(S.logs)));
await p.click('[data-act=lognew]');await p.fill('#log-dur','abc');await p.click('[data-act=logsave]');log('  erreur saisie:',await p.textContent('.logform [role=alert]'));
await p.click('[data-act=logcancel]');
await p.screenshot({path:root+'/shots/v35-modale-sortie.png'});
await p.click('[data-act=close]');
log('  carte:',(await p.textContent('article[data-date="2026-10-31"] .loglist')).trim());
await p.click('[data-act=mode][data-mode=month]');log('  mois:',(await p.textContent('.mcell[data-date="2026-10-31"]')).replace(/\s+/g,' ').trim());
await p.click('[data-act=mode][data-mode=week]');
// 3. bilan sans plan
await p.click('.tabs [data-view=bilan]');log('3 bilan:',(await p.textContent('main .kpis')).replace(/\s+/g,' ').trim(),'| barres',await p.$$eval('.ycol',e=>e.length));
// 4. plan + résultat
await p.click('.tabs [data-view=plan]');await p.click('[data-act=tab][data-view=plans] >> nth=0');
await p.setInputFiles('#file-xlsx',root+'/test/donnees/plan-test.xlsx');await p.waitForSelector('#imp-race');
await p.fill('#imp-race','2026-10-25');await p.dispatchEvent('#imp-race','change');await p.waitForTimeout(100);
log('4 case VMA:',(await p.textContent('label.check')).trim().slice(0,60));
await p.click('[data-act=useplan]');await p.waitForSelector('.navlabel');
log('  en-tête avant chrono:',(await p.textContent('.count')).replace(/\s+/g,' ').trim());
await p.click('.count [data-act=open]');await p.waitForSelector('#race-result');
await p.fill('#race-result',"3h25'12");await p.press('#race-result','Tab');await p.waitForTimeout(100);
await p.check('#race-pr');await p.waitForTimeout(100);
log('  boîte résultat:',(await p.textContent('.resultbox .sub')).trim().slice(0,110));
await p.click('[data-act=close]');
log('  en-tête après chrono:',(await p.textContent('.count')).replace(/\s+/g,' ').trim());
await p.screenshot({path:root+'/shots/v35-entete.png',clip:{x:0,y:0,width:1280,height:520}});
await p.click('.tabs [data-view=vma]');await p.click('[data-act=refclear]').catch(()=>{});
log('  réf. prédiction:',(await p.$$eval('main section',s=>s.find(x=>x.querySelector('h2').textContent.includes('Prédictions')).querySelector('.stack p').textContent)).trim());
// 5. préférences repliables
await p.click('.tabs [data-view=plan]');await p.click('[data-act=tab][data-view=plans] >> nth=0');
log('5 plan list:',(await p.textContent('.planitem')).replace(/\s+/g,' ').trim().slice(0,160));
await p.click('.tabs [data-view=data]');
await p.click('details[data-pref=look] summary');await p.click('[data-act=accent][data-id=foret]');
log('  Apparence reste ouverte:',await p.$eval('details[data-pref=look]',d=>d.open));
await p.screenshot({path:root+'/shots/v35-donnees.png',fullPage:true});
// 6. copie
const [dl]=await Promise.all([p.waitForEvent('download'),(async()=>{await p.evaluate(()=>document.querySelectorAll('details.raw').forEach(d=>d.open=true));await p.click('[data-act=htmlcopy]');})()]);await dl.saveAs(root+'/shots/v35-copie.html');
const q=await (await b.newContext({viewport:{width:390,height:844}})).newPage();q.on('pageerror',e=>errs.push('m:'+e.message));await q.route(/open-meteo\.com|fonts\.g/,r=>r.abort());
await q.addInitScript(()=>{window.__TODAY__='2026-10-31'});await q.goto('file://'+root+'/shots/v35-copie.html');await q.waitForSelector('.week');
log('6 copie: sorties',await q.evaluate(()=>Object.keys(S.logs).length),'| chrono',await q.evaluate(()=>track('2026-10-25').result),'| réf profil',await q.evaluate(()=>!!S.profile.ref));
log('  mobile débordement:',await q.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
await q.screenshot({path:root+'/shots/v35-mobile.png'});
for(const v of ['vma','bilan','data']){await q.click(`.tabs [data-view=${v}]`);log('  mobile',v,'débordement:',await q.evaluate(()=>document.documentElement.scrollWidth>innerWidth));}
await q.click('.tabs [data-view=bilan]');await q.screenshot({path:root+'/shots/v35-bilan-mob.png',fullPage:true});
log(errs.length?errs:'pas d\'erreur');await b.close();})().catch(e=>{console.log('ÉCHEC',e.message.split('\n').slice(0,3).join(' '));process.exit(1)});
