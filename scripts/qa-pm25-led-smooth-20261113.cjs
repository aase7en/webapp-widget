'use strict';
const p=require('puppeteer'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..'),OUT=process.env.PM25_LED_QA_OUT||'/tmp/uth-pm-smooth-led-browser-20261113';fs.mkdirSync(OUT,{recursive:true});
const mime={'.html':'text/html;charset=utf-8','.js':'application/javascript;charset=utf-8','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.mp4':'video/mp4'};
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost');
 if(u.pathname==='/__qa'){res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end('<!doctype html><html><body style="margin:0;background:#000"><iframe id="f" src="/v2/pm25-live.html" style="width:432px;height:40px;border:0;display:block"></iframe></body></html>');return;}
 const full=path.resolve(ROOT,'.'+u.pathname);if(!full.startsWith(ROOT+'/')){res.writeHead(403);res.end();return;}
 fs.readFile(full,(err,data)=>{res.writeHead(err?404:200,{'Content-Type':mime[path.extname(full).toLowerCase()]||'application/octet-stream'});res.end(err?'Not Found':data)})
});
(async()=>{
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const browser=await p.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox']});
 try{
  const base='http://127.0.0.1:'+server.address().port;
  for(const variant of ['continuous','missing','outlier']){
   const page=await browser.newPage();await page.setViewport({width:432,height:40,deviceScaleFactor:3});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/__qa',{waitUntil:'load'});
   const now=Date.now();let vals=[19,23,27,18,17,19,22,20,21,26,24,28,29,22,17,18,20,25,28,31,22,19,28,30];
   let history=vals.map((value,i)=>({value,observedAt:new Date(now-(23-i)*3600000).toISOString()}));
   if(variant==='missing')history=history.filter((_,i)=>![3,7,8,11,12,19].includes(i));
   if(variant==='outlier'){history[12].value=1000;history[14].value=null;}
   await page.evaluate(history=>{
    const f=document.querySelector('#f');
    f.contentWindow.postMessage({type:'uth-pm25-live',pm25:{status:'latest',value:30,avg24h:25,observedAt:new Date().toISOString(),unit:'µg/m³'},history,historyStatus:'ok'},location.origin)
   },history);
   await page.waitForFunction(count=>document.querySelector('#f').contentDocument.querySelectorAll('#series circle.point').length===count,{timeout:7000},history.filter(x=>typeof x.value==='number'&&Number.isFinite(x.value)&&x.value>=0&&x.value<=1000).length);
   const evidence=await page.evaluate(()=>{const d=document.querySelector('#f').contentDocument;const rect=sel=>{const e=d.querySelector(sel),r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}};return {points:d.querySelectorAll('#series circle.point').length,continuous:d.querySelectorAll('.trend-line:not(.trend-gap)').length,gaps:d.querySelectorAll('.trend-gap').length,dashes:d.querySelectorAll('.trend-line[stroke-dasharray]').length,cues:d.querySelectorAll('#series .trend-gap-cue').length,lines:d.querySelectorAll('#series .trend-line').length,curves:[...d.querySelectorAll('#series .trend-line')].filter(e=>e.getAttribute('d').includes(' C')).length,filledSegments:d.querySelectorAll('#series path.trend-area').length,flatBaseline:[...d.querySelectorAll('#series path.trend-area')].every(p=>/ L[0-9.]+ 40 L[0-9.]+ 40 Z$/.test(p.getAttribute('d'))),svg:rect('.trend-plot'),frame:rect('.chart-frame'),times:getComputedStyle(d.querySelector('.graph-times')).fontSize,errors:[],areaMask:d.querySelector('.trend-area')?.getAttribute('mask')}})
   assert.equal(evidence.dashes,0);
   assert.equal(evidence.cues,0,'no white slashes or any gap markers');
   assert.equal(evidence.curves,evidence.lines,'every trend segment is a smooth cubic');
   assert.equal(evidence.gaps,variant==='continuous'?0:variant==='missing'?4:1);
   assert.ok(evidence.svg.height>14);
   assert.equal(evidence.filledSegments,evidence.lines,'one closed fill to baseline per curve segment');
   assert.ok(evidence.flatBaseline,'all area fills close on the same baseline y=40');
   assert.equal(evidence.areaMask,'url(#pm-area-flat-baseline-mask)');
   assert.equal(errors.length,0);
   await page.screenshot({path:OUT+'/'+variant+'-432x40.png'});
   console.log(JSON.stringify({variant,evidence}));
   await page.close();
  }
 }finally{await browser.close();server.close()}
})().catch(err=>{console.error(err.stack);server.close();process.exitCode=1});
