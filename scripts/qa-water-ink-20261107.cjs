'use strict';
// SIMULATED read-only fixture; exercises the UNMODIFIED production Water JS renderer.
const puppeteer=require('puppeteer');
const sharp=require('sharp');
const fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/led-aligned-review-20261107');
const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
const sameRGB=(a,b,i,threshold=65)=>Math.max(...[0,1,2].map(j=>Math.abs(a[i+j]-b[i+j])))>threshold;
(async()=>{
 const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox','--allow-file-access-from-files']});
 try {
  const page=await browser.newPage();await page.setViewport({width:432,height:40,deviceScaleFactor:3});
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await page.evaluateOnNewDocument(()=>{
   // Intercept every network route. Fixture must NEVER reach a real data transport.
   window.UthApiClient={getWater:async()=>({stations:{
    HDA004:{status:'historical',levelMsl:3.21,observedAt:'2026-11-06T01:00:00Z'},
    S5:{status:'historical',levelMsl:4.06,observedAt:'2026-11-06T01:00:00Z'}
   }})};
  });
  await page.setRequestInterception(true);
  page.on('request',req=>req.url().includes('/api-client.js')?req.abort():req.url().startsWith('file:')?req.continue():req.abort());
  await page.goto(pathToFileURL(path.join(root,'v2/water-luxury-live.html')).href,{waitUntil:'load'});
  await page.waitForFunction(()=>[...document.querySelectorAll('.big-level')].some(e=>e.textContent.includes('3.21')),{timeout:7000});
  const geometry=await page.evaluate(()=>{
   const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}};
   return ['#stationA','#stationB'].map(s=>{
    const q=x=>document.querySelector(s+' '+x);
    return {station:s,box:rect(document.querySelector(s)),reading:rect(q('.reading-row')),
      value:rect(q('.big-level')),unit:rect(q('.big-level .unit')),
      detail:rect(q('.reading-detail')),trend:rect(q('.status-trend')),
      name:rect(q('.station-name')),levelText:q('.big-level').textContent,
      badge:q('.badge').textContent,source:q('.delta').textContent};
   });
  });
  for(const g of geometry){
   assert.equal(g.badge,'ข้อมูลเก่า','simulated historical reading must not become current flood status');
   assert(g.value.w>0&&g.value.h>0);
   assert(g.unit.x+g.unit.w <=g.box.x+g.box.w,'unit must stay in its own station');
  }
  // Screenshot before muting decorative canvas: representative full renderer output.
  await page.screenshot({path:path.join(out,'water-real-render-432x40.png')});
  await page.evaluate(()=>{document.querySelectorAll('canvas').forEach(e=>e.style.visibility='hidden')});
  const screens={};
  for(const [key,row,detail,trend] of [['baseline',false,false,false],['row',true,false,false],
    ['detail',false,true,false],['trend',false,false,true]]){
   await page.evaluate(({row,detail,trend})=>{
    for(const [selector,on] of [['.reading-row',row],['.reading-detail',detail],['.status-trend',trend]]){
     document.querySelectorAll(selector).forEach(e=>e.style.visibility=on?'visible':'hidden');
    }
   },{row,detail,trend});
   const png=await page.screenshot({path:path.join(out,'water-ink-'+key+'-432x40.png')});
   const decoded=await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   screens[key]=decoded;
  }
  const {width,height,channels}=screens.baseline.info;
  assert.equal(width,1296);assert.equal(height,120);assert.equal(channels,4);
  const masks={},base=screens.baseline.data;
  for(const key of ['row','detail','trend']){
   const bytes=screens[key].data;const flag=new Uint8Array(width*height);
   for(let p=0;p<width*height;p++)flag[p]=sameRGB(bytes,base,p*channels)?1:0;
   masks[key]=flag;
  }
  const overlaps={};
  for(const g of geometry){
   const left=Math.max(0,Math.floor(g.box.x*3)),right=Math.min(width,Math.ceil((g.box.x+g.box.w)*3));
   const top=Math.max(0,Math.floor(g.box.y*3)),bottom=Math.min(height,Math.ceil((g.box.y+g.box.h)*3));
   let rowDetail=0,rowTrend=0;
   for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
    const i=y*width+x;if(masks.row[i]&&masks.detail[i])rowDetail++;
    if(masks.row[i]&&masks.trend[i])rowTrend++;
   }
   overlaps[g.station]={rowDetailInkPixels:rowDetail,rowTrendInkPixels:rowTrend};
   assert.equal(rowDetail,0,g.station+' reading ink must not cover reading detail ink');
   assert.equal(rowTrend,0,g.station+' reading ink must not cover trend/status ink');
  }
  const record={source:'QA_SIMULATED, intercepted UthApiClient; unmodified production water-luxury-live.js',
    size:'432x40 native, 3x devicePixelRatio',thresholdRGB:65,readings:'HISTORICAL fixtures, never LIVE',
    geometry,overlaps,sourceRenderer:'production water-luxury-live.js; only API client stubbed'};
  fs.writeFileSync(path.join(out,'water-ink-verification.json'),JSON.stringify(record,null,2)+'\n');
  console.log(JSON.stringify({result:'WATER_REAL_RENDER_INK_QA_PASS',overlaps,values:geometry.map(x=>x.levelText)}));
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack);process.exit(1)});
