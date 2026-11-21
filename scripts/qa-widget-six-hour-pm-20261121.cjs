'use strict';
// Exact PM LED renderer QA with SIMULATED timestamps only; no API calls.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const puppeteer=require('puppeteer');
const root=path.join(__dirname,'..');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webm':'video/webm','.mp4':'video/mp4'};
const server=http.createServer((req,res)=>{
 const p=path.resolve(root,'.'+new URL(req.url,'http://127.0.0.1').pathname);
 if(!p.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
 fs.readFile(p,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'});res.end(err?'missing':data)});
});
(async()=>{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const browser=await puppeteer.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox']});
 try{
  const report=[];
  for(const age of [5,7]){
   const page=await browser.newPage(),errors=[],badExternal=[];
   page.on('pageerror',x=>errors.push(x.message));
   await page.setViewport({width:432,height:40,deviceScaleFactor:3});
   await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
   await page.setRequestInterception(true);page.on('request',r=>{
    if(r.url().startsWith('http://127.0.0.1:'))r.continue();
    else{badExternal.push(r.url());r.abort()}
   });
   const url='http://127.0.0.1:'+server.address().port+'/v2/pm25-live.html';
   const response=await page.goto(url,{waitUntil:'networkidle0',timeout:20000});
   const pm=age===5?
    {status:'latest',value:20.4,avg24h:20.4,unit:'µg/m³',observedAt:new Date(Date.now()-5*3600000).toISOString(),band:'good'}:
    {status:'stale',reason:'older_than_6h'};
   await page.evaluate(input=>window.postMessage({type:'uth-pm25-live',pm25:input,history:[],historyStatus:'empty'},location.origin),pm);
   await page.waitForFunction(t=>document.querySelector('.badge')?.textContent===t,{timeout:6500},age===5?'ดี':'ข้อมูลเก่าเกิน 6 ชม.');
   const result=await page.evaluate(()=>{
    const n=document.querySelector('.number'),b=document.querySelector('.badge'),board=document.querySelector('#board'),a=document.querySelector('.advice');
    const nr=n.getBoundingClientRect(),br=b.getBoundingClientRect(),rr=board.getBoundingClientRect(),ar=a.getBoundingClientRect();
    return {value:n.textContent,badge:b.textContent,advice:a.textContent,badgeFits:b.scrollHeight<=b.clientHeight+1&&b.scrollWidth<=b.clientWidth+1,
     badgeInside:br.left>=rr.left-1&&br.right<=rr.right+1&&br.top>=rr.top-1&&br.bottom<=rr.bottom+1,
     boardWidth:rr.width,boardHeight:rr.height,numberInside:nr.left>=rr.left-1&&nr.right<=rr.right+1,adviceInside:ar.right<=rr.right+1};
   });
   assert.equal(response.status(),200);
   assert.equal(result.value,age===5?'20.4':'—');
   assert.equal(result.badge,age===5?'ดี':'ข้อมูลเก่าเกิน 6 ชม.');
   assert.ok(result.badgeFits&&result.badgeInside&&result.numberInside&&result.adviceInside,JSON.stringify(result));
   assert.deepEqual(errors,[]);assert.deepEqual(badExternal,[]);
   if(process.env.WIDGET_QA_OUTPUT_DIR){
    fs.mkdirSync(process.env.WIDGET_QA_OUTPUT_DIR,{recursive:true});
    await page.screenshot({path:path.join(process.env.WIDGET_QA_OUTPUT_DIR,'pm-'+age+'h.png')});
   }
   report.push({hours:age,...result});
   await page.close();
  }
  console.log(JSON.stringify({status:'PASS',native:'432x40',source:'SIMULATED browser fixtures',report}));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error('PM_LED_QA_FAILED',e.stack);server.close();process.exitCode=1});
