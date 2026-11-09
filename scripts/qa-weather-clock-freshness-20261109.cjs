'use strict';
// REAL Weather renderer + SIMULATED QA values; never production measurements.
const p=require('puppeteer'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const root=path.join(__dirname,'..'),out=path.join(root,'docs/weather-clock-freshness-review-20261109');
const src=pathToFileURL(path.join(root,'v2/weather-luxury.html')).href;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const variants=['historical','fresh','historical-high','historical-no-feels','historical-invalid-time','unavailable','no-forecast'];
const capture=kind=>{
 const old=kind.startsWith('historical'),bad=kind==='unavailable',noForecast=kind==='no-forecast';
 const temp=bad?null:kind==='historical-high'?36:29;
 const now=Date.now(),days=Array.from({length:7},(_,i)=>({day:['จ.','อ.','พ.','พฤ.','ศ.','ส.','อา.'][i],date:'2026-11-'+String(i+9).padStart(2,'0'),hi:32-i,lo:24,p:40+i*5,ico:'rain'}));
 paint({temperatureC:temp,humidityPct:bad?null:kind==='historical-high'?70:71,
  feelsC:bad||kind==='historical-no-feels'?null:temp+3,high:bad?null:32,low:bad?null:25,rainPct:bad?null:0,
  days:bad||noForecast?[]:days,icon:bad||noForecast?null:'rain',historical:old,
  observedAt:bad?null:kind==='historical-invalid-time'?'invalid':new Date(now-(old?4:0)*3600000).toISOString(),provenance:'SIMULATED_QA_NOT_MEASURED'});
 const $=s=>document.querySelector(s),rect=e=>{
  if(!e)return null;const r=e.getBoundingClientRect();
  return {l:+r.left.toFixed(2),r:+r.right.toFixed(2),t:+r.top.toFixed(2),b:+r.bottom.toFixed(2)};
 };
 const feel=$('.feel-value'),tip=$('#temp-guidance'),note=$('#source-at'),panel=$('#weather-hybrid-panel');
 return {kind,board:$('#board').dataset.freshness,source:{text:note.textContent,hidden:note.hidden,box:rect(note),aria:note.getAttribute('aria-label')},
  feels:{text:feel.textContent,hidden:feel.hidden,stale:feel.dataset.historical,aria:feel.getAttribute('aria-label'),box:rect(feel)},
  advice:{text:tip.textContent,hidden:tip.hidden,stale:tip.dataset.historical,box:rect(tip),aria:tip.getAttribute('aria-label')},
  clock:rect($('#time')),panel:rect(panel),page:panel.dataset.page,
  largeStatusCount:document.querySelectorAll('.hybrid-status').length,
  rain:[...document.querySelectorAll('.hybrid-day .hybrid-rain')].map(rect),
  statusCount:document.querySelectorAll('[role="status"]').length,
  numberFont:getComputedStyle($('.temp')).fontSize,degree:$('.temp small').textContent};
};
function verify(x){
 assert.equal(x.largeStatusCount,0,'no oversized banner in forecast');
 assert.equal(x.statusCount,1,'one lower guidance status element only');
 assert.equal(x.numberFont,'90px');assert.equal(x.degree,'°C');
 assert(x.rain.length===4||x.rain.length===3);
 for(const r of x.rain)assert(r.b<=x.panel.b-0.5,'rain probability clipped by lower panel border');
 if(x.kind.startsWith('historical')){
  assert.equal(x.board,'HISTORICAL');assert(x.source.text.startsWith('เก่า '));
  assert(x.source.box.t>x.clock.b&&x.source.box.b<39,'tiny timestamp must be beneath clock');
  assert(x.source.aria.includes('ไม่ใช่ข้อมูลล่าสุด'));
  if(x.kind==='historical-invalid-time')assert(x.source.text.includes('เวลาไม่พร้อม'),'bad observation time never becomes current');
  if(x.kind==='historical-no-feels'){
   assert(x.feels.hidden&&x.feels.aria.includes('ไม่มีข้อมูล')&&!x.feels.aria.includes('0 องศา'),'missing feels never 0');
  }else assert(!x.feels.hidden&&x.feels.stale==='yes','historical Feels visible but qualified');
  assert(!x.advice.hidden&&x.advice.stale==='yes'&&x.advice.text.startsWith('เดิม:'),'old advice clearly labelled');
  assert(x.advice.aria.includes('ไม่ใช่คำเตือนความร้อนปัจจุบัน'));
 }
 if(x.kind==='fresh'){
  assert.equal(x.board,'MODEL_LATEST');assert(x.source.hidden);
  assert(!x.feels.hidden&&!x.advice.hidden);
  assert.equal(x.advice.stale,'no');
 }
 if(x.kind==='unavailable'){
  assert.equal(x.board,'UNAVAILABLE');assert.equal(x.source.text,'ไม่มีข้อมูล');
  assert(x.feels.hidden&&x.advice.hidden,'no missing-as-live');
 }
 if(x.kind==='no-forecast')assert.equal(x.source.text,'พย. ไม่พร้อม');
}
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const browser=await p.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox','--allow-file-access-from-files']});
 const evidence={kind:'SIMULATED_QA_NOT_LIVE',board:'432x40 DPR3',results:[],rotation:null,reduced:null,fallback:null};
 const newPage=async reduced=>{
  const pg=await browser.newPage();await pg.setViewport({width:432,height:40,deviceScaleFactor:3});
  if(reduced)await pg.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await pg.setRequestInterception(true);pg.on('request',r=>r.url().startsWith('file:')?r.continue():r.abort());
  await pg.goto(src,{waitUntil:'load'});await delay(1400);
  return pg;
 };
 try{
  const page=await newPage(false);
  for(const kind of variants){
   const item=await page.evaluate(capture,kind);verify(item);evidence.results.push(item);
   await page.screenshot({path:path.join(out,'weather-'+kind+'-432x40.png')});
  }
  await page.evaluate(capture,'historical');
  await page.waitForFunction(()=>document.querySelector('#weather-hybrid-panel')?.dataset.page==='1',{timeout:10500});
  evidence.rotation=await page.evaluate(()=>{
   const p=document.querySelector('#weather-hybrid-panel');return {
    page:p.dataset.page,rain:[...document.querySelectorAll('.hybrid-day .hybrid-rain')].map(e=>({bottom:e.getBoundingClientRect().bottom})),
    panelBottom:p.getBoundingClientRect().bottom,statusCount:document.querySelectorAll('.hybrid-status').length,
    note:document.querySelector('#source-at').textContent};
  });
  assert.equal(evidence.rotation.page,'1','3-day page rotates automatically');
  assert.equal(evidence.rotation.rain.length,3);
  assert(evidence.rotation.rain.every(x=>x.bottom<=evidence.rotation.panelBottom-.5));
  assert.equal(evidence.rotation.statusCount,0);
  await page.screenshot({path:path.join(out,'weather-historical-page1-432x40.png')});
  await page.evaluate(()=>{window.UthWeatherHybrid={render:()=>{throw Error('QA: optional hybrid unavailable')}};});
  evidence.fallback=await page.evaluate(capture,'historical');
  evidence.fallback.hybrid=await page.evaluate(()=>document.querySelector('#board').classList.contains('layout-hybrid'));
  assert.equal(evidence.fallback.hybrid,false);
  assert(!evidence.fallback.feels.hidden&&!evidence.fallback.advice.hidden);
  await page.screenshot({path:path.join(out,'weather-historical-fallback-432x40.png')});
  await page.close();
  const rm=await newPage(true);evidence.reduced=await rm.evaluate(capture,'historical');verify(evidence.reduced);
  await rm.screenshot({path:path.join(out,'weather-historical-reduced-motion-432x40.png')});await rm.close();
  fs.writeFileSync(path.join(out,'browser-qa.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log('PASS Weather: compact old timestamp under clock, historic Feels+qualified advice, 4+3 rain fits, fallback and reduced motion');
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack);process.exit(1)});
