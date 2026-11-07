'use strict';
// Read-only visual QA. Every displayed value is a SIMULATED layout fixture.
// Usage: node scripts/qa-led-aligned-20261107.cjs (requires Puppeteer + Chrome).
const puppeteer=require('puppeteer');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const assert=require('node:assert/strict');
const ROOT=path.join(__dirname,'..'),OUT=path.join(ROOT,'docs/led-aligned-review-20261107');
fs.mkdirSync(OUT,{recursive:true});
const rect=e=>{const x=e.getBoundingClientRect();return {x:+x.x.toFixed(2),y:+x.y.toFixed(2),w:+x.width.toFixed(2),h:+x.height.toFixed(2)}};
function overlaps(a,b){return a.x < b.x+b.w && b.x<a.x+a.w && a.y<b.y+b.h && b.y<a.y+a.h}
(async()=>{
 const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox','--allow-file-access-from-files']});
 const evidence={source:'SIMULATED QA fixture, NEVER operational observations',device:'Chrome headless 432x40 @3x',scenarios:[]};
 try{
  const page=await browser.newPage();await page.setViewport({width:432,height:40,deviceScaleFactor:3});
  // Explicitly block ALL remote API and image fetches; permit local static assets only.
  await page.setRequestInterception(true);
  page.on('request',r=>r.url().startsWith('file:')?r.continue():r.abort());
  await page.goto(pathToFileURL(path.join(ROOT,'v2/weather-luxury.html')).href,{waitUntil:'domcontentloaded'});
  const weatherCases=[
   {key:'hot',t:32,rh:70,feels:38,advice:'ระวังร้อนจัด'},
   {key:'warm',t:31,rh:65,feels:35,advice:'ระวังร้อน'},
   {key:'long-warning',t:32,rh:70,feels:38,advice:'ระวังอาการเจ็บป่วยจากความร้อน/ลมแดด'},
   {key:'triple-digit',t:100,rh:60,feels:105,advice:'ระวังร้อนจัด'},
   {key:'negative',t:-9,rh:50,feels:-12,advice:null},
   {key:'historical',t:32,rh:70,feels:38,advice:null,historical:true},
   {key:'unavailable',t:null,feels:null,advice:null}
  ];
  for(const state of weatherCases){
   const item=await page.evaluate(s=>{
    const $=q=>document.querySelector(q);
    const rect=e=>{const x=e.getBoundingClientRect();return {x:+x.x.toFixed(2),y:+x.y.toFixed(2),w:+x.width.toFixed(2),h:+x.height.toFixed(2)}};
    const overlaps=(a,b)=>a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;
    $('#time').textContent='03:58';$('#date').textContent='เสาร์ 7 พ.ย. 69';
    const fixture={temperatureC:s.t,feelsC:s.feels,humidityPct:s.rh??null,rainPct:null,high:null,low:null,
      days:[],historical:!!s.historical,observedAt:s.historical?'2026-11-06T20:58:00Z':null,
      icon:'rain',provenance:'QA_SIMULATED'};
    // Invoke the real production renderer and heat threshold logic, never recreate them here.
    paint(fixture);
    if(s.key==='long-warning'){fixture.advice=s.advice;draw(fixture);}
    const warn=$('#advice');
    const nodes={};for(const name of ['.clock','.icon','.temp','.temp small','.feel-value','#advice','.hybrid-panel'])nodes[name]=rect($(name));
    return {key:s.key,nodes,warningVisible:!warn.hidden,fullLabel:warn.getAttribute('aria-label'),displayedWarning:warn.textContent,feelVisible:!$('.feel-value').hidden,warningOutside:!warn.hidden&&(nodes['#advice'].y<1||nodes['#advice'].y+nodes['#advice'].h>39||nodes['#advice'].x+nodes['#advice'].w>202),unitOverlapsPanel:overlaps(nodes['.temp small'],nodes['.hybrid-panel']),badgeOverlap:!warn.hidden&&overlaps(nodes['.feel-value'],nodes['#advice'])};
   },state);
   assert.equal(item.warningOutside,false,state.key+' warning must fit warning-safe region');
   assert.equal(item.unitOverlapsPanel,false,state.key+' °C must remain left of forecast');
   assert.equal(item.badgeOverlap,false,state.key+' badges must not intersect');
   assert.equal(item.warningVisible,!!state.advice);
   assert.equal(item.fullLabel,state.advice||'');
   if(state.key==='historical')assert.equal(item.feelVisible,false,'historical feels badge must be suppressed');
   if(state.key==='long-warning')assert.equal(item.displayedWarning,'⚠ ระวังความร้อน');
   await page.screenshot({path:path.join(OUT,'weather-'+state.key+'-432x40.png')});
   evidence.scenarios.push(item);
  }
  await page.evaluate(()=>{
    paint({temperatureC:32,feelsC:38,humidityPct:70,rainPct:55,high:33,low:26,
      days:[],provenance:'QA_SIMULATED',observedAt:null,icon:'rain',historical:false});
  });
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  const reduced=await page.evaluate(()=>({
    animated:getComputedStyle(document.querySelector('#icon')).display,
    poster:getComputedStyle(document.querySelector('#poster')).display,
    clock:document.querySelector('#time').textContent,
    warning:document.querySelector('#advice').textContent
  }));
  assert.equal(reduced.animated,'none','reduced-motion animation must be hidden');
  assert.notEqual(reduced.poster,'none','reduced-motion static poster must display');
  evidence.reducedMotion=reduced;
  await page.screenshot({path:path.join(OUT,'weather-reduced-motion-432x40.png')});
  await page.setViewport({width:390,height:720,deviceScaleFactor:2});
  await page.screenshot({path:path.join(OUT,'weather-mobile-390.png')});
  await page.close();
  for(const [name,html] of [['pm','pm25-live.html'],['water','water-luxury-live.html']]){
   const p=await browser.newPage();await p.setViewport({width:432,height:40,deviceScaleFactor:3});
   await p.setRequestInterception(true);
   p.on('request',r=>r.url().startsWith('file:')&&!r.url().includes('.js')?r.continue():r.abort());
   await p.goto(pathToFileURL(path.join(ROOT,'v2',html)).href,{waitUntil:'load'});
   const state=await p.evaluate(name=>{
    const $=s=>document.querySelector(s),r=e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height}};
    if(name==='pm'){$('.clock .time').textContent='03:58';$('.clock .date').textContent='เสาร์ 7 พ.ย. 69';$('.number').textContent='32';return {clock:r($('.clock')),number:r($('.number')),font:getComputedStyle($('.number')).fontSize,weight:getComputedStyle($('.number')).fontWeight}};
    $('.clock .time').textContent='03:58';$('.clock .date').textContent='เสาร์ 7 พ.ย. 69';
    const station=(id,value)=>{document.querySelector(id).innerHTML='<div class="station-card"><div class="art-zone"></div><div class="info"><div class="station-name">'+id.slice(1)+'<small>สถานีอ้างอิง HII</small></div><div class="reading-row"><div class="big-level">'+value+'<span class="unit">ม.รทก.</span></div></div><div class="status-trend"><span class="badge">ไม่พร้อม</span><div class="trend-box">ย้อนหลัง 7 วัน</div></div><div class="reading-detail"><div class="delta">ไม่มีค่าที่ตรวจสอบได้</div><div class="bank-percent">ช่วงพื้น–ตลิ่ง —%</div></div></div></div>'};
    station('#stationA','3.21');station('#stationB','4.06');
    return {clock:r($('.clock')),levels:[...document.querySelectorAll('.big-level')].map(e=>({rect:r(e),font:getComputedStyle(e).fontSize})),rows:[...document.querySelectorAll('.reading-row')].map(r)};
   },name);
   assert.equal(name==='pm'?state.font:state.levels[0].font,name==='pm'?'100px':'68px');
   await p.screenshot({path:path.join(OUT,name+'-aligned-432x40.png')});
   evidence[name]=state;await p.close();
  }
  fs.writeFileSync(path.join(OUT,'browser-qa.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log('PASS Weather 7 warning states + Reduced Motion + Mobile; PM and Water 432x40; '+OUT);
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack);process.exit(1)});
