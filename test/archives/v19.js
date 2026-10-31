const path=require('path');const {chromium}=require('playwright');const root=path.join(__dirname,'..');
(async()=>{const b=await chromium.launch();const errs=[];const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errs.push(e.message));
const urls=[];
await p.route('**/api.open-meteo.com/**',r=>{const u=new URL(r.request().url());const lat=Number(u.searchParams.get('latitude'));urls.push(lat);const base=lat>50?5:15;const t=[],c=[],mx=[],mn=[],pp=[],rn=[],wd=[],g=[];for(let i=0;i<16;i++){const d=new Date(Date.UTC(2026,9,11+i));t.push(d.toISOString().slice(0,10));c.push(2);mx.push(base+i%3);mn.push(base-4);pp.push(20);rn.push(0);wd.push(15);g.push(25);}
r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({daily:{time:t,weather_code:c,temperature_2m_max:mx,temperature_2m_min:mn,precipitation_probability_max:pp,precipitation_sum:rn,wind_speed_10m_max:wd,wind_gusts_10m_max:g}})});});
await p.route('**/geocoding-api.open-meteo.com/**',r=>r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({results:[{name:'Nantes',latitude:47.218,longitude:-1.553,country_code:'FR'}]})}));
await p.addInitScript(()=>{window.__TODAY__='2026-10-11'});await p.goto('file://'+root+'/dist/appli-marathon.html');
await p.setInputFiles('#file-xlsx',root+'/test/plan-test.xlsx');await p.click('[data-act=useplan]');await p.waitForSelector('.week');await p.waitForSelector('.wx');
console.log('requêtes (latitudes):',urls.join(', '));
await p.click('[data-act=next]');console.log('entraînement mar 13 :',await p.$eval('[data-slot="2026-10-13"] .wx1',e=>e.innerText));
await p.click('[data-act=next]');console.log('jour J (dim 25):',await p.$eval('[data-slot="2026-10-25"] .wx1',e=>e.innerText),'| lun 19:',await p.$eval('[data-slot="2026-10-19"] .wx1',e=>e.innerText));
await p.click('[data-act=tab][data-view=race]');console.log(await p.$eval('.wxrace strong',e=>e.innerText));
await p.click('[data-act=tab][data-view=data]');console.log(await p.textContent('label[for=wx-city]'));
await p.fill('#wx-city','Nantes');await p.click('[data-act=wxsearch]');await p.waitForTimeout(300);console.log(await p.textContent('label[for=wx-city]'),'| requêtes:',urls.join(', '));
console.log(errs.length?errs:'pas d\'erreur');await b.close();})();
