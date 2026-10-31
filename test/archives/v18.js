const path=require('path');const {chromium}=require('playwright');const root=path.join(__dirname,'..');
(async()=>{const b=await chromium.launch();const errs=[];
for(const [w,h,n] of [[1280,900,'bureau'],[390,844,'mobile']]){
const p=await b.newPage({viewport:{width:w,height:h}});p.on('pageerror',e=>errs.push(e.message));
await p.route('**/api.open-meteo.com/**',r=>{const t=[],c=[],mx=[],mn=[],pp=[],rn=[],wd=[],g=[];for(let i=0;i<16;i++){const d=new Date(Date.UTC(2026,9,11+i));t.push(d.toISOString().slice(0,10));c.push([0,2,3,61][i%4]);mx.push(i==15?null:14+i%4);mn.push(7);pp.push(20);rn.push(0);wd.push(15);g.push(25);}
r.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({daily:{time:t,weather_code:c,temperature_2m_max:mx,temperature_2m_min:mn,precipitation_probability_max:pp,precipitation_sum:rn,wind_speed_10m_max:wd,wind_gusts_10m_max:g}})});});
await p.addInitScript(()=>{window.__TODAY__='2026-10-11'});await p.goto('file://'+root+'/dist/appli-marathon.html');
await p.setInputFiles('#file-xlsx',root+'/test/plan-test.xlsx');await p.click('[data-act=useplan]');await p.waitForSelector('.week');
await p.waitForSelector('.wx');console.log(n,'semaine: cartes avec météo =',await p.$$eval('.dcard .wx',e=>e.length));
await p.click('[data-act=mode][data-mode=month]');await p.waitForSelector('.wxm');console.log(n,'mois: cellules avec météo =',await p.$$eval('.wxm',e=>e.length));
await p.screenshot({path:root+'/shots/v18-mois-'+n+'.png',fullPage:true});
console.log(n,'overflow',await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1));}
console.log(errs.length?errs:'pas d\'erreur');await b.close();})();
