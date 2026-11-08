'use strict';
// REAL frontend renderer, SIMULATED QA fixtures only; not measured weather.
const p=require('puppeteer'),path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const root=path.join(__dirname,'..'),out=path.join(root,'docs/led-weather-advice-20261108');
const src=pathToFileURL(path.join(root,'v2/weather-luxury.html')).href;
const cases=[
 ['cold',10,50,'สวมเสื้อให้อุ่น'],['jacket',18,55,'พกเสื้อกันหนาว'],
 ['mild',24,55,'อากาศไม่ร้อนจัด'],['warm',28,40,'พักและดื่มน้ำ'],
 ['sun',30,75,'หลีกเลี่ยงแดดจัด'],['heat',36,70,'ระวัง Heatstroke'],
 ['extreme',42,75,'ระวัง Heatstroke'],['triple',100,70,'ตรวจสอบข้อมูล'],
 ['quad',1000,70,'ตรวจสอบข้อมูล'],['negative',-10,50,'สวมเสื้อให้อุ่น'],
 ['without-rh',30,null,'ดื่มน้ำและพัก'],['invalid-rh',36,300,'ร้อนจัด เลี่ยงแดด'],['missing',null,null,null],
 ['historical',36,70,null,true]
];
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 const b=await p.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox','--allow-file-access-from-files']});
 const evidence={kind:'SIMULATED_QA_NOT_LIVE',viewport:'432x40 DPR3',cases:[]};
 try{
 const pg=await b.newPage();await pg.setViewport({width:432,height:40,deviceScaleFactor:3});
 await pg.setRequestInterception(true);pg.on('request',r=>r.url().startsWith('file:')?r.continue():r.abort());
 await pg.goto(src,{waitUntil:'load'});
 for(const [id,t,rh,want,old] of cases){
 const x=await pg.evaluate(({id,t,rh,old})=>{
  document.querySelector('#board').classList.add('layout-hybrid');
  paint({temperatureC:t,humidityPct:rh,feelsC:t,high:28,low:21,rainPct:25,days:[],observedAt:new Date().toISOString(),historical:!!old,icon:null});
  const $=s=>document.querySelector(s),r=e=>{const b=e.getBoundingClientRect();return {l:+b.left.toFixed(2),right:+b.right.toFixed(2),top:+b.top.toFixed(2),bottom:+b.bottom.toFixed(2)}};
  const u=$('.temp small'),guidance=$('#temp-guidance'),warning=$('#advice'),unitBox=u.getBoundingClientRect();
  return {id,value:$('#temp').textContent,font:getComputedStyle($('.temp')).fontSize,num:r($('#temp')),unit:r(u),guide:r(guidance),heatWarn:r(warning),feels:r($('.feel-value')),clock:r($('.clock .time')),panel:r($('.hybrid-panel')),text:guidance.textContent,hidden:guidance.hidden,warningVisible:!warning.hidden,warningText:warning.textContent,title:guidance.title,scroll:guidance.scrollWidth,client:guidance.clientWidth,unitVisible:document.elementFromPoint(unitBox.x+unitBox.width/2,unitBox.y+unitBox.height/2)===u};
 },{id,t,rh,old});
 assert.equal(x.font,'90px','temperature never shrinks '+id);
 assert(x.unitVisible,'degree not hidden '+id);
 assert(x.unit.right<202,'degree clear of metrics '+id);
 assert(x.num.l>x.clock.right+20,'temperature clear of clock '+id);
 if(want){
  assert.equal(x.text,want,'advice text '+id);
  assert(!x.hidden&&x.guide.top>=31.5&&x.guide.bottom<=39.5,'badge below digits '+id);
  assert(x.guide.right<201&&x.scroll<=x.client+1,'advice no overlap or clip '+id);
  assert(x.title.length>12,'complete advice accessible '+id);
 }else{assert(x.hidden&&!x.warningVisible,'stale/missing no guidance '+id)}
 if(t>=100||rh===300)assert(!x.warningVisible,'invalid temperature/humidity must not create a heat alert');
 if(x.warningVisible)assert(x.heatWarn.right<x.feels.l&&x.heatWarn.bottom<x.guide.top-20,'warning retained without overlap');
 evidence.cases.push(x);
 if(['cold','mild','sun','heat','triple','quad','missing','historical'].includes(id))await pg.screenshot({path:path.join(out,'weather-'+id+'-432x40.png')});
 }
 // Fallback geometry without hybrid renderer, same 90px font and advice.
 evidence.fallback=await pg.evaluate(()=>{
  window.UthWeatherHybrid={render:()=>{throw Error('simulated renderer failure')}};
  paint({temperatureC:1000,humidityPct:65,feelsC:1000,days:[],observedAt:new Date().toISOString(),historical:false,icon:null});
  const e=document.querySelector('.temp small').getBoundingClientRect();
  return {font:getComputedStyle(document.querySelector('.temp')).fontSize,unitRight:e.right,hybrid:document.querySelector('#board').classList.contains('layout-hybrid'),guide:document.querySelector('#temp-guidance').textContent};
 });
 assert.equal(evidence.fallback.hybrid,false);assert.equal(evidence.fallback.font,'90px');assert(evidence.fallback.unitRight<202);await pg.screenshot({path:path.join(out,'weather-fallback-1000-432x40.png')});
 // Legacy fallback with plausible hot weather: both badges must remain distinct.
 evidence.fallbackHeat=await pg.evaluate(()=>{
  paint({temperatureC:36,humidityPct:70,feelsC:36,days:[],observedAt:new Date().toISOString(),historical:false,icon:null});
  const w=document.querySelector('#advice'),t=document.querySelector('#temp-guidance'),f=document.querySelector('.feel-value');
  const r=e=>{const b=e.getBoundingClientRect();return {left:b.left,right:b.right,top:b.top,bottom:b.bottom}};
  return {warning:w.textContent,warningVisible:!w.hidden,warningBox:r(w),guidance:t.textContent,guidanceBox:r(t),feelsBox:r(f),hybrid:document.querySelector('#board').classList.contains('layout-hybrid')};
 });
 assert.equal(evidence.fallbackHeat.hybrid,false);
 assert(evidence.fallbackHeat.warningVisible&&evidence.fallbackHeat.warning.includes('ร้อนจัด'));
 assert(evidence.fallbackHeat.warningBox.right<evidence.fallbackHeat.feelsBox.left);
 assert(evidence.fallbackHeat.warningBox.bottom<evidence.fallbackHeat.guidanceBox.top-20);
 await pg.screenshot({path:path.join(out,'weather-fallback-heat-432x40.png')});
 await pg.close();
 const rm=await b.newPage();await rm.setViewport({width:432,height:40,deviceScaleFactor:3});
 await rm.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
 await rm.setRequestInterception(true);rm.on('request',r=>r.url().startsWith('file:')?r.continue():r.abort());
 await rm.goto(src,{waitUntil:'load'});
 evidence.reduced=await rm.evaluate(()=>{
  document.querySelector('#board').classList.add('layout-hybrid');
  paint({temperatureC:36,humidityPct:70,feelsC:36,days:[],observedAt:new Date().toISOString(),historical:false,icon:null});
  return {font:getComputedStyle(document.querySelector('.temp')).fontSize,text:document.querySelector('#temp-guidance').textContent};
 });
 assert.equal(evidence.reduced.font,'90px');assert.equal(evidence.reduced.text,'ระวัง Heatstroke');
 await rm.screenshot({path:path.join(out,'weather-reduced-motion-432x40.png')});await rm.close();
 fs.writeFileSync(path.join(out,'browser-qa.json'),JSON.stringify(evidence,null,2)+'\n');
 console.log('PASS '+cases.length+' cases: no font shrink, °C, advice, existing warnings, stale/missing, fallback, reduced motion');
 }finally{await b.close()}
})().catch(e=>{console.error(e.stack);process.exit(1)});
