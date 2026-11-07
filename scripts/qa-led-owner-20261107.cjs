'use strict';
// Real production DOM/JS renderers, simulated fixtures only, never operational data.
const puppeteer=require('puppeteer'),fs=require('node:fs'),path=require('node:path');
const assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const ROOT=path.join(__dirname,'..'),OUT=path.join(ROOT,'docs/led-aligned-review-20261107');
const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox','--allow-file-access-from-files']});
 const evidence={source:'SIMULATED QA only; real local PM and Water frontend renderers, no live API',size:'432x40 DPR 3',pm:[],water:null};
 try{
  const page=await browser.newPage();await page.setViewport({width:432,height:40,deviceScaleFactor:3});
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await page.setRequestInterception(true);
  page.on('request',r=>r.url().startsWith('file:')?r.continue():r.abort());
  await page.goto(pathToFileURL(path.join(ROOT,'v2/pm25-live.html')).href,{waitUntil:'load'});
  const cases=[
   {tier:'blue',avg:8,status:'ดีมาก'},
   {tier:'green',avg:20,status:'ดี'},
   {tier:'yellow',avg:31,status:'ปานกลาง'},
   {tier:'orange',avg:55,status:'เริ่มมีผลต่อสุขภาพ'},
   {tier:'red',avg:90,status:'มีผลต่อสุขภาพ'}
  ];
  for(const item of cases){
   const state=await page.evaluate(({avg,status})=>{
    const now=Date.now();
    const history=Array.from({length:24},(_,i)=>({value:Math.max(1,avg+(i%5-2)*1.8),observedAt:new Date(now-(23-i)*3600e3).toISOString()}));
    window.dispatchEvent(new MessageEvent('message',{source:window,origin:location.origin,data:{
     type:'uth-pm25-live',pm25:{status:'latest',value:avg,avg24h:avg,observedAt:new Date(now).toISOString(),unit:'µg/m³'},history}}));
    document.querySelector('.clock .time').textContent='23:59';
    const $=s=>document.querySelector(s),r=e=>{const g=e.getBoundingClientRect();return {left:g.left,right:g.right,top:g.top,bottom:g.bottom,width:g.width,height:g.height}};
    const badge=$('.inline-guidance .badge'),advice=$('.inline-guidance .advice'),chart=$('.right'),unit=$('.unit'),label=$('.pm-label'),readout=$('.readout');
    return {tier:$('#board').dataset.tier,status:badge.textContent,advice:advice.textContent,
     label:r(label),readout:r(readout),number:r($('.number')),unit:r(unit),chart:r(chart),badge:r(badge),adviceRect:r(advice),avgRect:r($('.avg-note')),
     lineCount:$('#series').querySelectorAll('path').length,icon:getComputedStyle(badge,'::before').backgroundImage,
     badgeScrollHeight:badge.scrollHeight,badgeClientHeight:badge.clientHeight,adviceScrollHeight:advice.scrollHeight,adviceClientHeight:advice.clientHeight};
   },item);
   assert.equal(state.tier,item.tier);
   assert.equal(state.status,item.status);
   assert(Math.abs(state.label.left-(374+2)/3)<.25,'PM label shifts precisely -2 LED px');
   assert(Math.abs(state.readout.left-(484+2)/3)<.25,'PM number+unit group shifts precisely -2 LED px');
   assert(Math.abs(state.chart.left-(674+2)/3)<.25,'default chart moves left 10 native LED px');
   assert(state.chart.width>=110,'chart should grow from baseline 101 to at least 110 LED px');
   assert(state.unit.right<=state.chart.left+1,'number/unit must not intersect chart');
   assert(state.chart.right<=state.badge.left+.75,'chart must not intersect status badge');
   assert(state.badge.right<=432,'badge inside LED');
   assert(state.adviceRect.right<=432,'health advice inside LED');
   assert(state.badgeScrollHeight<=state.badgeClientHeight+1,'badge text must not overflow height');
   assert(state.adviceScrollHeight<=state.adviceClientHeight+1,'advice text must not overflow height');
   assert(state.lineCount>0,'production graph must render a real SVG from fixture history');
   if(['blue','green'].includes(item.tier))assert(state.icon.includes('pm-status-sun-outline.svg'),'minimal white SVG line icon must render');
   else assert(!state.icon.includes('pm-status-sun-outline.svg'),'only short labels get white line icon');
   await page.screenshot({path:path.join(OUT,'pm-owner-'+item.tier+'-432x40.png')});
   evidence.pm.push(state);
  }
  // Extreme valid hourly values: geometry reflows, while 24h average stays valid.
  for(const value of [100,999.9,1000]){
   const state=await page.evaluate(value=>{
    window.dispatchEvent(new MessageEvent('message',{source:window,origin:location.origin,data:{
     type:'uth-pm25-live',pm25:{status:'latest',value,avg24h:20,observedAt:new Date().toISOString(),unit:'µg/m³'},history:[]}}));
    const r=e=>{const g=e.getBoundingClientRect();return {left:g.left,right:g.right,width:g.width}};
    return {value,unit:r(document.querySelector('.unit')),chart:r(document.querySelector('.right')),
      badge:r(document.querySelector('.inline-guidance .badge')),shown:document.querySelector('.number').textContent,
      dynamicLeft:document.querySelector('#board').style.getPropertyValue('--pm-chart-left')};
   },value);
   assert(state.chart.left>=state.unit.right+3.9,'expanded graph must clear wide reading/unit');
   assert(state.chart.right<=state.badge.left+.75,'wide reading reflow must not hit badge');
   assert(state.chart.width>=94,'graph must remain readable for wide readings');
   assert.equal(state.shown,String(value),'hourly value stays intact in fallback');
   if(value===1000)await page.screenshot({path:path.join(OUT,'pm-graph-wide-1000-432x40.png')});
   (evidence.wideNumbers||(evidence.wideNumbers=[])).push(state);
  }
  // The existing unavailable semantics are checked with the same live renderer.
  const unavailable=await page.evaluate(()=>{
   window.dispatchEvent(new MessageEvent('message',{source:window,origin:location.origin,data:{
    type:'uth-pm25-live',pm25:{status:'latest',value:31,avg24h:null,observedAt:new Date().toISOString()},history:[]}}));
   return {tier:document.querySelector('#board').dataset.tier,badge:document.querySelector('.badge').textContent,avgHidden:document.querySelector('.avg-note').hidden};
  });
  assert.equal(unavailable.tier,'');assert.equal(unavailable.badge,'รอข้อมูล');assert.equal(unavailable.avgHidden,true);
  evidence.unavailable=unavailable;
  await page.screenshot({path:path.join(OUT,'pm-owner-unavailable-432x40.png')});
  await page.close();
  const water=await browser.newPage();await water.setViewport({width:432,height:40,deviceScaleFactor:3});
  await water.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await water.evaluateOnNewDocument(()=>{
   window.UthApiClient={getWater:async()=>({stations:{
    HDA004:{status:'historical',levelMsl:3.21,observedAt:'2026-11-06T01:00:00Z'},
    S5:{status:'historical',levelMsl:4.06,observedAt:'2026-11-06T01:00:00Z'}}})};
  });
  await water.setRequestInterception(true);
  water.on('request',r=>r.url().includes('/api-client.js')?r.abort():r.url().startsWith('file:')?r.continue():r.abort());
  await water.goto(pathToFileURL(path.join(ROOT,'v2/water-luxury-live.html')).href,{waitUntil:'load'});
  await water.waitForFunction(()=>[...document.querySelectorAll('.big-level')].some(e=>e.textContent.includes('3.21')),{timeout:7000});
  const clock=await water.evaluate(()=>{
   const t=document.querySelector('.clock .time');t.textContent='23:59';
   const c=document.querySelector('.clock'),r=document.createRange();r.selectNodeContents(t);
   const box=e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom}};
   return {clock:box(c),time:box(t),glyph:box(r),overflow:getComputedStyle(c).overflow,clockZ:getComputedStyle(c).zIndex,
    decorationZ:getComputedStyle(document.querySelector('.widget'),'::after').zIndex,
    stations:[...document.querySelectorAll('.big-level')].map(e=>e.textContent),
    statuses:[...document.querySelectorAll('.status-trend .badge')].map(e=>e.textContent)};
  });
  assert.equal(clock.overflow,'visible','clock must no longer clip last glyph');
  assert(clock.glyph.right>clock.clock.right,'fixture actually reproduces the original clipping');
  assert(clock.glyph.right<432,'all time glyphs must be inside physical LED');
  assert(Number(clock.clockZ)>Number(clock.decorationZ),'clock must overlay decorative border');
  assert.deepEqual(clock.statuses,['ข้อมูลเก่า','ข้อมูลเก่า'],'historical fixtures must remain labelled old');
  evidence.water=clock;
  await water.screenshot({path:path.join(OUT,'water-owner-clock-432x40.png')});
  await water.close();
  fs.writeFileSync(path.join(OUT,'owner-feedback-browser-qa.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log('PASS owner feedback: 5 PM health tiers + unavailable and SVG icon, all real PM renderer; Water real renderer clock z-index and overflow');
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack);process.exit(1)});
