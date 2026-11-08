'use strict';
// VISUAL QA FIXTURES ARE SIMULATED; never claim these are actual measurements.
const p=require('puppeteer'),path=require('path'),fs=require('fs'),assert=require('node:assert/strict');
const {pathToFileURL}=require('url');
const ROOT=path.join(__dirname,'..'),OUT=path.join(ROOT,'docs/led-legibility-review-20261108');
const URL=file=>pathToFileURL(path.join(ROOT,'v2',file)).href;
const rect=e=>{const r=e.getBoundingClientRect();return {l:+r.left.toFixed(2),r:+r.right.toFixed(2),t:+r.top.toFixed(2),b:+r.bottom.toFixed(2)}};
const lock=page=>{page.setRequestInterception(true);page.on('request',r=>r.url().startsWith('file:')&&!r.url().includes('api-client.js')?r.continue():r.abort())};
const fixture=()=>{const now=Date.now(),mk=(level,span)=>({status:'ok',levelMsl:level,bankM:level+.7,groundMsl:level-1,observedAt:new Date(now-240000).toISOString(),trendPoints:Array.from({length:30},(_,i)=>+(level+Math.sin(i*.37)*.08).toFixed(3)),trendObservedAt:Array.from({length:30},(_,i)=>new Date(now-(span-i*span/29)*3600000).toISOString())});return {stations:{HDA004:mk(2.34,31),S5:mk(1.91,41)}}};
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 const b=await p.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox','--allow-file-access-from-files']});
 const evidence={kind:'SIMULATED_QA_NOT_LIVE',viewport:'432x40 DPR3',weather:[],water:[],missing:null};
 try{
  const w=await b.newPage();await w.setViewport({width:432,height:40,deviceScaleFactor:3});await lock(w);await w.goto(URL('weather-luxury.html'),{waitUntil:'load'});await new Promise(resolve=>setTimeout(resolve,2500));
  for(const value of ['24','-10','100','1000','—']){
   const x=await w.evaluate(value=>{
    const temp=document.querySelector('.temp'),digits=document.querySelector('#temp'),unit=temp.querySelector('small');
    digits.textContent=value;const n=value.length;temp.style.fontSize=(n>=4?60:n>=3?70:90)+'px';temp.dataset.longTemp=n>=4?'yes':'no';
    const b=e=>{const r=e.getBoundingClientRect();return {l:+r.left.toFixed(2),r:+r.right.toFixed(2),t:+r.top.toFixed(2),b:+r.bottom.toFixed(2)}};
    const u=unit.getBoundingClientRect(),panel=document.querySelector('.hybrid-panel');
    return {value,digits:b(digits),unit:b(unit),panel:b(panel),text:unit.textContent,opaque:getComputedStyle(unit).webkitTextFillColor,front:document.elementFromPoint(u.x+u.width/2,u.y+u.height/2)===unit};
   },value);
   assert.equal(x.text,'°C');assert(x.front,'degree unit visible above all layers: '+value);
   assert(x.unit.l>=x.digits.r+1,'positive readable gap after digit '+value);
   assert(x.unit.r<=x.panel.l-.5,'°C must clear 4+3 forecast panel '+value);
   assert(x.unit.b<40&&x.unit.t>=0,'°C inside 432×40 LED '+value);
   assert.notEqual(x.opaque,'rgba(0, 0, 0, 0)','degree glyph cannot be transparent');
   evidence.weather.push(x);
   if(['24','100','1000'].includes(value))await w.screenshot({path:path.join(OUT,'weather-'+value+'-432x40.png')});
   assert.equal(await w.evaluate(()=>document.querySelector('#temp')?.textContent),value,'Weather QA screenshot displays requested numeric fixture');
  }await w.close();
  const makeWater=async(kind)=>{
   const pg=await b.newPage();await pg.setViewport({width:432,height:40,deviceScaleFactor:3});
   await pg.evaluateOnNewDocument(kind=>{
    const now=Date.now(),mk=(level,span)=>({status:'ok',levelMsl:level,bankM:level+.7,groundMsl:level-1,observedAt:new Date(now-240000).toISOString(),trendPoints:span?Array.from({length:30},(_,i)=>+(level+Math.sin(i*.37)*.08).toFixed(3)):[],trendObservedAt:span?Array.from({length:30},(_,i)=>new Date(now-(span-i*span/29)*3600000).toISOString()):[]});
    window.UthApiClient={getWater:async()=>({stations:{HDA004:mk(2.34,kind==='missing'?0:31),S5:mk(1.91,kind==='missing'?0:41)}})};
   },kind);
   await lock(pg);await pg.goto(URL('water-luxury-live.html'),{waitUntil:'load'});
   await pg.waitForFunction(()=>document.querySelector('#stationA .big-level')?.textContent.includes('2.34'),{timeout:8000});
   return pg;
  };
  const water=await makeWater('full');
  const states=await water.evaluate(()=>[...document.querySelectorAll('.station')].map(e=>{
   const b=x=>{const r=e.querySelector(x)?.getBoundingClientRect();return r?{l:+r.left.toFixed(2),r:+r.right.toFixed(2),t:+r.top.toFixed(2),b:+r.bottom.toFixed(2)}:null};
   const d=e.querySelector('.spark path[stroke]')?.getAttribute('d')||'';
   return {id:e.id,value:e.querySelector('.big-level')?.textContent,unit:b('.unit'),spark:b('.spark'),title:e.querySelector('.trend-title')?.textContent,aria:e.querySelector('.spark')?.getAttribute('aria-label'),first:d.match(/^M([0-9.]+) /)?.[1],last:[...d.matchAll(/ L([0-9.]+) /g)].at(-1)?.[1],count:(d.match(/[ML]/g)||[]).length,detail:e.querySelector('.delta')?.textContent,bank:e.querySelector('.bank-percent')?.textContent,status:e.querySelector('.badge')?.textContent};
  }));
  assert.deepEqual(states.map(x=>x.title),['31H / 7D','41H / 7D']);
  for(const x of states){
   assert(x.value.endsWith('m MSL'),'standard English water datum');
   assert(x.spark.l>=x.unit.r+1,'unit may not overlap spark at '+x.id);
   assert.equal(x.first,'5.0');assert.equal(x.last,'332.0');assert.equal(x.count,30);
   assert(x.aria.includes('seven-day lookback'),'accessible honest 7-day limit');
   assert(x.aria.includes('30 observed readings'),'sample count retained');
   assert(x.detail.startsWith('OBS '),'English observed time visible');
   assert(x.bank.startsWith('GROUND–BANK '),'ground-bank comparison named');
  }
  evidence.water=states;await water.screenshot({path:path.join(OUT,'water-31h-41h-432x40.png')});await water.close();
  const empty=await makeWater('missing');
  evidence.missing=await empty.evaluate(()=>[...document.querySelectorAll('.station')].map(e=>({id:e.id,title:e.querySelector('.trend-title')?.textContent,text:e.querySelector('.unavailable-message')?.textContent,spark:e.querySelectorAll('.spark').length})));
  assert(evidence.missing.every(x=>x.title==='7D HISTORY'&&x.text==='NO DATA'&&x.spark===0),'never fabricate missing history');
  await empty.screenshot({path:path.join(OUT,'water-no-history-432x40.png')});await empty.close();
  fs.writeFileSync(path.join(OUT,'browser-qa.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log('PASS 432x40: five Weather degrees and both Water sparks, honest 31H/41H coverage, English m MSL, missing history');
 }finally{await b.close();}
})().catch(e=>{console.error(e.stack);process.exit(1)});
