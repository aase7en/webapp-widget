'use strict';
// All screenshots are SIMULATED QA. They are NOT actual live observations.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url'),p=require('puppeteer');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/weather-compact-review-20261109');
const src=pathToFileURL(path.join(root,'v2/weather-luxury.html')).href;
const scenarios=[
 {id:'historical',t:29,rh:71,feel:32,old:true,n:7,want:'ตรวจข้อมูลล่าสุด',stamp:'ข้อมูลเดิม'},
 {id:'fresh-hot',t:36,rh:70,feel:39,old:false,n:7,want:'ระวัง Heatstroke',stamp:null},
 {id:'fresh-mild',t:24,rh:55,feel:26,old:false,n:7,want:'อากาศไม่ร้อนจัด',stamp:null},
 {id:'no-weather',t:null,rh:null,feel:null,old:false,n:0,want:'ข้อมูลไม่พร้อม',stamp:'ไม่มีข้อมูลอากาศ'},
 {id:'no-forecast',t:24,rh:55,feel:26,old:false,n:0,want:'อากาศไม่ร้อนจัด',stamp:'พยากรณ์ไม่พร้อม'},
 {id:'four-digit',t:1000,rh:50,feel:1000,old:false,n:7,want:'ตรวจสอบข้อมูล',stamp:null},
];
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await p.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox','--allow-file-access-from-files']});
 const evidence={kind:'SIMULATED_QA_NOT_LIVE',viewport:'432x40 DPR3',scenarios:[]};
 try{
  const page=await browser.newPage();await page.setViewport({width:432,height:40,deviceScaleFactor:3});
  await page.setRequestInterception(true);
  page.on('request',r=>r.url().startsWith('file:')?r.continue():r.abort());
  await page.goto(src,{waitUntil:'load'});
  for(const s of scenarios){
   const x=await page.evaluate(s=>{
    const days=Array.from({length:s.n},(_,i)=>({day:['จ.','อ.','พ.','พฤ.','ศ.','ส.','อา.'][i],date:'2026-11-0'+(9+i),hi:32,lo:25,p:45,ico:'rain'}));
    paint({temperatureC:s.t,humidityPct:s.rh,feelsC:s.feel,historical:s.old,observedAt:'2026-11-09T02:30:00.000Z',rainPct:0,high:32,low:25,days,icon:'rain',provenance:'SIMULATED_QA'});
    const box=sel=>{const e=document.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect();return {x:+r.x.toFixed(2),y:+r.y.toFixed(2),right:+r.right.toFixed(2),bottom:+r.bottom.toFixed(2)}};
    const el=sel=>document.querySelector(sel);
    return {id:s.id,freshness:el('#board').dataset.freshness,stamp:el('#source-at').textContent,stampHidden:el('#source-at').hidden,stampTitle:el('#source-at').title,stampBox:box('#source-at'),timeBox:box('#time'),feels:el('.feel-value').textContent,feelsHidden:el('.feel-value').hidden,feelsFreshness:el('.feel-value').dataset.freshness,feelsTitle:el('.feel-value').title,guidance:el('#temp-guidance').textContent,guidanceHidden:el('#temp-guidance').hidden,guidanceTitle:el('#temp-guidance').title,topStatus:document.querySelectorAll('.hybrid-status').length,roleStatus:document.querySelectorAll('[role=status]').length,firstRainBox:box('.hybrid-rain'),panelBox:box('#weather-hybrid-panel'),tempFont:getComputedStyle(el('.temp')).fontSize,unit:el('.temp small').textContent,sourceAria:el('#weather-hybrid-panel').getAttribute('aria-label')};
   },s);
   assert.equal(x.guidance,s.want,s.id+' safe visible recommendation');
   assert(!x.guidanceHidden&&x.guidanceTitle.length>6,'full guidance accessible');
   assert.equal(x.topStatus,0,'no forecast-wide overlay');
   assert.equal(x.roleStatus,1,'one and only one guidance status');
   assert.equal(x.tempFont,'90px');assert.equal(x.unit,'°C');
   assert.equal(x.stampHidden,s.stamp===null);
   if(s.stamp){assert(x.stamp.includes(s.stamp),'clock freshness cue '+s.id);
    assert(x.stampBox.y>=x.timeBox.bottom+.1&&x.stampBox.bottom<=39,'small label under clock inside border');
    assert(x.stampBox.right<65,'notice may not cover art/numeric');
    assert(x.stampTitle,'full observed-at in title');}
   if(s.id==='historical'){
    assert.equal(x.freshness,'HISTORICAL');assert(!x.feelsHidden,'old Feels Like may display but must be labeled');
    assert.equal(x.feelsFreshness,'HISTORICAL');assert(x.feelsTitle.includes('ข้อมูลย้อนหลัง'));
    assert(x.sourceAria.includes('ข้อมูลเดิม'));}
   if(s.id==='no-weather')assert(x.feelsHidden,'null Feels Like must remain unavailable');
   if(s.n){assert(x.firstRainBox.bottom<=38.1,'rain chance stays fully inside frame');}
   evidence.scenarios.push(x);
   await page.screenshot({path:path.join(out,'weather-'+s.id+'-432x40.png')});
  }
  // Optional hybrid failure must still show compact clock notice and stale-safe advice.
  evidence.fallback=await page.evaluate(()=>{
   window.UthWeatherHybrid={render:()=>{throw Error('SIMULATED hybrid failure')}};
   paint({temperatureC:29,humidityPct:71,feelsC:32,historical:true,observedAt:'2026-11-09T02:30:00.000Z',days:[],icon:null});
   return {hybrid:document.querySelector('#board').classList.contains('layout-hybrid'),clock:document.querySelector('#source-at').textContent,feelsHidden:document.querySelector('.feel-value').hidden,advice:document.querySelector('#temp-guidance').textContent};
  });
  assert(!evidence.fallback.hybrid&&evidence.fallback.clock.includes('ข้อมูลเดิม')&&!evidence.fallback.feelsHidden);
  await page.screenshot({path:path.join(out,'weather-fallback-historical-432x40.png')});
  await page.close();
  const reduced=await browser.newPage();await reduced.setViewport({width:432,height:40,deviceScaleFactor:3});
  await reduced.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await reduced.setRequestInterception(true);reduced.on('request',r=>r.url().startsWith('file:')?r.continue():r.abort());
  await reduced.goto(src,{waitUntil:'load'});
  evidence.reduced=await reduced.evaluate(()=>{paint({temperatureC:29,humidityPct:71,feelsC:32,historical:true,observedAt:'2026-11-09T02:30:00.000Z',days:[],icon:null});return {clock:document.querySelector('#source-at').textContent,advice:document.querySelector('#temp-guidance').textContent,feelsHidden:document.querySelector('.feel-value').hidden}});
  assert(evidence.reduced.clock.includes('ข้อมูลเดิม')&&evidence.reduced.advice==='ตรวจข้อมูลล่าสุด'&&!evidence.reduced.feelsHidden);
  await reduced.screenshot({path:path.join(out,'weather-reduced-motion-432x40.png')});await reduced.close();
  fs.writeFileSync(path.join(out,'browser-qa.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log('PASS: 6 scenarios + fallback + reduced motion; banner removed, rain/clock/old badges safe');
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack);process.exit(1)});
