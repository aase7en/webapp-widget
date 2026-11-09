'use strict';
// Real production frontend renderers + SIMULATED QA data; never actual readings.
const p=require('puppeteer'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..'),out=path.join(root,'docs/weather-icon-pm24-review-20261109');
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.apng':'image/apng','.mp4':'video/mp4'};
const now=Date.now(),fixtureHistory=Array.from({length:14},(_,i)=>({value:[10,17,23,28,46,92,80,55,32,19,10,12,17,14][i],observedAt:new Date(now-(21-i*21/13)*3600000).toISOString()}));
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
 if(pathname==='/v2/api-client.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end('window.UthApiClient={getLive:async()=>({pm25:{status:"latest",value:14.3,avg24h:18,band:"good",unit:"µg/m³",observedAt:new Date().toISOString(),source:"SIMULATED QA"},weather:{status:"unavailable"}}),getWater:async()=>({stations:{}})};');return;}
 if(pathname==='/__qa_pm'){
 const payload=JSON.stringify({type:'uth-pm25-live',pm25:{status:'latest',value:14.3,avg24h:18,band:'good',unit:'µg/m³',observedAt:new Date().toISOString()},history:fixtureHistory,historyStatus:'ok'});
 res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});
 res.end('<!doctype html><html><body style="margin:0;background:black"><iframe id="f" width="432" height="40" frameborder="0" style="display:block;border:0" src="/v2/pm25-live.html"></iframe><script>document.querySelector("#f").onload=()=>document.querySelector("#f").contentWindow.postMessage('+payload+',location.origin)</script></body></html>');return;
 }
 const full=path.resolve(root,'.'+pathname);
 if(!full.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(full,(err,data)=>{if(err){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(full).toLowerCase()]||'application/octet-stream'});res.end(data)});
});
const rect=e=>{const r=e.getBoundingClientRect();return {l:+r.left.toFixed(2),r:+r.right.toFixed(2),t:+r.top.toFixed(2),b:+r.bottom.toFixed(2)}};
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await p.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox']});
 const evidence={kind:'SIMULATED_QA_NOT_LIVE',baseline:'Production main 95b2c924',historyMock:fixtureHistory.length,pm:null,retry:null,weather:[]};
 try{
  // Actual v2 PM renderer inside a same-origin parent: 14 genuine-shaped
  // synthetic points, five existing health colors, 14 halos + 14 crisp cores.
  const sample=await browser.newPage();await sample.setViewport({width:432,height:40,deviceScaleFactor:3});
  await sample.goto(base+'/__qa_pm',{waitUntil:'domcontentloaded',timeout:15000});
  const frame=()=>sample.frames().find(f=>f.url().includes('/v2/pm25-live.html'));
  await sample.waitForFunction(()=>document.querySelector('#f')?.contentWindow?.document?.querySelectorAll('.point')?.length===14,{timeout:8000});
  evidence.pm=await frame().evaluate(()=>{const root=document,pts=[...root.querySelectorAll('#series circle.point')],halos=[...root.querySelectorAll('#series circle.point-halo')],note=root.querySelector('#history-note');return {count:pts.length,halos:halos.length,radii:pts.map(x=>x.getAttribute('r')),haloRadii:halos.map(x=>x.getAttribute('r')),colors:[...new Set(pts.map(x=>x.style.fill))],haloColors:[...new Set(halos.map(x=>x.style.fill))],noteHidden:note.hidden,noteText:note.textContent,lines:root.querySelectorAll('#series path.trend-line').length,svg:root.querySelector('.trend-plot').getBoundingClientRect().toJSON(),styles:{blur:getComputedStyle(halos[0]).filter,coreFilter:getComputedStyle(pts[0]).filter}}});
  assert.equal(evidence.pm.count,14);assert.equal(evidence.pm.halos,14);
  assert(evidence.pm.radii.every(x=>x==='1.2')&&evidence.pm.haloRadii.every(x=>x==='3.1'));
  assert.equal(evidence.pm.noteHidden,true);assert(evidence.pm.lines>0);assert.equal(evidence.pm.colors.length,5);
  await sample.screenshot({path:path.join(out,'pm24-glow-432x40.png')});await sample.close();

  // Deliberately fail first history request, then respond to bounded 8s retry.
  const bridge=await browser.newPage();await bridge.setViewport({width:432,height:40,deviceScaleFactor:3});
  await bridge.evaluateOnNewDocument(history=>{
   window.__qaHistoryRequests=0;
   const original=HTMLHeadElement.prototype.appendChild;
   HTMLHeadElement.prototype.appendChild=function(node){
    if(node.tagName==='SCRIPT'&&node.src?.includes('action=pm25_history')){
     window.__qaHistoryRequests++;const n=window.__qaHistoryRequests;
     const cb=new URL(node.src).searchParams.get('callback');
     setTimeout(()=>{if(n===1){node.onerror?.(new Event('error'))}
       else window[cb]?.({schema:1,status:'ok',location:'uthai',points:history})},35);
     return node;
    }
    return original.call(this,node);
   };
  },fixtureHistory);
  await bridge.goto(base+'/v2/index.html?display=led',{waitUntil:'domcontentloaded',timeout:16000});
  await bridge.waitForFunction(()=>window.__qaHistoryRequests>=2,{timeout:15000});
  await bridge.waitForFunction(()=>document.querySelector('#pm-live-frame')?.contentWindow?.document?.querySelectorAll('.point')?.length===14,{timeout:8000});
  evidence.retry=await bridge.evaluate(()=>({requests:window.__qaHistoryRequests,points:document.querySelector('#pm-live-frame').contentWindow.document.querySelectorAll('.point').length,noteHidden:document.querySelector('#pm-live-frame').contentWindow.document.querySelector('#history-note').hidden}));
  assert.equal(evidence.retry.requests,2);assert.equal(evidence.retry.points,14);assert(evidence.retry.noteHidden);
  await bridge.close();

  // Main Weather icon condition vs single lower advice pill. Use real HTML,
  // same image and CSS selectors as production; never edit pixel assets.
  const weather=await browser.newPage();await weather.setViewport({width:432,height:40,deviceScaleFactor:3});
  await weather.goto(base+'/v2/weather-luxury.html',{waitUntil:'load',timeout:16000});
  for(const condition of ['partly-cloudy','rain','night-rain','night','cloudy','fog','wind','thunderstorm']){
   const result=await weather.evaluate(condition=>{
    const d={temperatureC:32,humidityPct:75,feelsC:38,high:32,low:25,rainPct:20,icon:condition,observedAt:new Date().toISOString(),historical:false,days:Array.from({length:7},(_,i)=>({day:'จ.',date:'2026-11-'+String(i+9).padStart(2,'0'),hi:32,lo:25,p:15,ico:condition}))};
    paint(d);
    const el=document.querySelector('#icon'),pill=document.querySelector('#temp-guidance'),clock=document.querySelector('.clock');
    const rr=e=>{const x=e.getBoundingClientRect();return {left:+x.left.toFixed(2),right:+x.right.toFixed(2),top:+x.top.toFixed(2),bottom:+x.bottom.toFixed(2)}};
    return {condition,transform:getComputedStyle(el).transform,icon:rr(el),pill:rr(pill),clock:rr(clock),iconUrl:el.currentSrc.split('/').at(-1),label:pill.textContent};
   },condition);
   assert(result.icon.left>result.clock.right-30,'art must not cover clock face '+condition);
   evidence.weather.push(result);
   if(['partly-cloudy','rain','night-rain','cloudy'].includes(condition))await weather.screenshot({path:path.join(out,'weather-icon-'+condition+'-432x40.png')});
  }
  await weather.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await weather.evaluate(()=>{
   paint({temperatureC:29,humidityPct:60,feelsC:32,high:31,low:25,rainPct:20,icon:'partly-cloudy',
    observedAt:new Date().toISOString(),historical:false,days:[]});
  });
  evidence.reduced=await weather.evaluate(()=>({
   animated:getComputedStyle(document.querySelector('#icon')).display,
   poster:getComputedStyle(document.querySelector('#poster')).display,
   posterTransform:getComputedStyle(document.querySelector('#poster')).transform,
   posterCondition:document.querySelector('#poster').dataset.condition
  }));
  assert.equal(evidence.reduced.animated,'none');
  assert.notEqual(evidence.reduced.poster,'none');
  assert.equal(evidence.reduced.posterCondition,'partly-cloudy');
  assert(evidence.reduced.posterTransform.includes('-111'));
  await weather.screenshot({path:path.join(out,'weather-icon-partly-cloudy-reduced-motion-432x40.png')});
  await weather.close();
  fs.writeFileSync(path.join(out,'browser-qa.json'),JSON.stringify(evidence,null,2)+'\n');
  console.log(JSON.stringify({passed:true,historyPoints:evidence.pm.count,riskColors:evidence.pm.colors,retry:evidence.retry,weatherConditions:evidence.weather.length}));
 }finally{await browser.close();server.close()}
})().catch(e=>{server.close();console.error(e.stack);process.exit(1)});
