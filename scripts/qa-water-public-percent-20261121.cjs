'use strict';
// Local headless Chrome QA with explicitly simulated data. No provider API or Sheet calls.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const puppeteer=require('puppeteer');
const root=path.join(__dirname,'..'),out=process.env.WIDGET_QA_OUTPUT_DIR||path.join(root,'docs/readme/screenshots'),results=[];
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.apng':'image/apng'};
const server=http.createServer((req,res)=>{
 let p=path.resolve(root,'.'+new URL(req.url,'http://127.0.0.1').pathname);
 if(!p.startsWith(root+path.sep)){res.writeHead(403);res.end('blocked');return}
 if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');
 fs.readFile(p,(err,content)=>{res.writeHead(err?404:200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'});res.end(err?'missing':content)});
});
function fixture(name){
 const now=Date.now(),latest=new Date(now-9*60000).toISOString(),previous=new Date(now-69*60000).toISOString();
 const make=(code)=>{
  const a=code==='HDA004',ground=a?.227:-8.59,bank=a?3.03:4.70,raw=a?2.36:.88;
  if(name==='missing')return {status:'missing',levelMsl:null,bankM:null,groundMsl:null,observedAt:null,trendPoints:[],trendObservedAt:[]};
  const factor=name==='near'?.94:name==='at'?1:name==='above'?(a?1.035:1.025):null;
  const level=factor===null?raw:ground+(bank-ground)*factor;
  const stale=name==='stale',within6=name==='within6',levelPrevious=a?level-.11:level+.10;
  return {stationId:a?471583:2607,status:stale||within6?'historical':'ok',levelMsl:level,
   bankM:bank,groundMsl:ground,
   observedAt:stale?new Date(now-7*3600000).toISOString():within6?new Date(now-5*3600000).toISOString():latest,
   trendPoints:[levelPrevious,level],
   trendObservedAt:stale?[new Date(now-8*3600000).toISOString(),new Date(now-7*3600000).toISOString()]:
    within6?[new Date(now-6*3600000).toISOString(),new Date(now-5*3600000).toISOString()]:[previous,latest]};
 };
 return {source:'SIMULATED browser fixture for screenshot only',stations:{HDA004:make('HDA004'),S5:make('S5')}};
}
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await puppeteer.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox']});
 try{
  for(const scenario of ['sample','near','at','above','within6','stale','missing']){
   const page=await browser.newPage(),errors=[],bad=[],network=[];
   page.on('pageerror',e=>errors.push(e.message));
   page.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon.ico'))bad.push(r.status()+' '+r.url())});
   await page.setViewport({width:432,height:40,deviceScaleFactor:scenario==='sample'?3:1});
   await page.setRequestInterception(true);
   page.on('request',req=>{
    const u=req.url();if(u.includes('/v2/api-client.js?')){
     const js='window.UthApiClient={getWater:async()=>{window.__fixtureApplied=true;return '+JSON.stringify(fixture(scenario))+'}};';
     req.respond({status:200,contentType:'text/javascript',body:js});return;
    }
    if(!u.startsWith('http://127.0.0.1')){network.push(u);req.abort();return}
    req.continue();
   });
   const url='http://127.0.0.1:'+server.address().port+'/v2/water-luxury-live.html';
   const r=await page.goto(url,{waitUntil:'networkidle0',timeout:25000});
   await page.waitForFunction(()=>window.__fixtureApplied&&!!document.querySelector('#stationA .distance-to-bank'),{timeout:12000});
   await page.waitForFunction(()=>document.querySelector('#stationA .water-canvas')?.dataset.frame!==undefined,{timeout:12000});
   const q=await page.evaluate(()=>{
    const station=id=>{const card=document.getElementById(id),big=card.querySelector('.big-level'),reading=card.querySelector('.reading-row'),
     d=card.querySelector('.distance-to-bank'),arrow=card.querySelector('.preview-trend'),graph=card.querySelector('.spark'),outer=card.getBoundingClientRect(),
     rm=reading.getBoundingClientRect(),dm=d.getBoundingClientRect(),gx=graph?.getBoundingClientRect();
     const range=document.createRange();range.selectNodeContents(d);
     return {value:big.textContent,arrow:arrow.textContent,dist:d.textContent,htmlTitle:big.getAttribute('title'),accessibleName:big.getAttribute('aria-label'),
      badge:card.querySelector('.badge').textContent,badgeFits:card.querySelector('.badge').scrollHeight<=card.querySelector('.badge').clientHeight+1,graph:!!graph,spriteFrame:card.querySelector('.water-canvas').dataset.frame,
      fitsReading:reading.scrollWidth<=reading.clientWidth+1,readingClient:reading.clientWidth,readingScroll:reading.scrollWidth,readingToGraph:gx?gx.left-rm.right:null,distInside:dm.right<=outer.right&&dm.bottom<=outer.bottom,
      distTextBottomGap:outer.bottom-range.getBoundingClientRect().bottom,
      arrowGap:gx?gx.left-arrow.getBoundingClientRect().right:null};
    };
    return{a:station('stationA'),b:station('stationB'),canvas:[innerWidth,innerHeight]};
   });
   assert.equal(r.status(),200);
   assert.deepEqual(q.canvas,[432,40]);
   assert.equal(q.a.value,scenario==='sample'?'76.1%':scenario==='near'?'94.0%':scenario==='at'?'100.0%':scenario==='above'?'103.5%':scenario==='within6'?'76.1%':'—');
   if(scenario==='sample'){assert.equal(q.b.value,'71.3%');assert.equal(q.a.arrow,'↑');assert.equal(q.b.arrow,'↓');assert.ok(q.a.dist.includes('0.67'));assert.ok(q.b.dist.includes('3.82'));assert.ok(q.a.accessibleName.includes('2.36 m MSL')&&q.a.accessibleName.includes('วัด'),'staff accessible level/time must be present');assert.ok(q.b.accessibleName.includes('0.88 m MSL'));
    const cdp=await page.createCDPSession();await cdp.send('Accessibility.enable');const ax=await cdp.send('Accessibility.getFullAXTree');
    const named=ax.nodes.filter(n=>!n.ignored&&n.name?.value?.includes('m MSL')&&n.name?.value?.includes('วัด')&&n.role?.value!=='generic');
    assert.ok(named.some(n=>n.name.value.includes('2.36 m MSL'))&&named.some(n=>n.name.value.includes('0.88 m MSL')),
      'computed accessibility tree must expose both measured m MSL + observation time; found '+JSON.stringify(named.map(n=>({role:n.role?.value,name:n.name?.value.slice(0,130)}))));
    await cdp.detach();}
   if(scenario==='stale'||scenario==='missing')for(const x of [q.a,q.b]){assert.equal(x.arrow,'—');assert.equal(x.value,'—');assert.equal(x.badge,scenario==='stale'?'ข้อมูลเก่าเกิน 6 ชม.':'รอข้อมูล');;}
   if(scenario==='within6')for(const x of [q.a,q.b]){assert.equal(x.value, x===q.a?'76.1%':'71.3%');assert.notEqual(x.arrow,'—');}
   if(scenario==='above')for(const x of [q.a,q.b])assert.ok(x.dist.includes('สูงกว่าตลิ่ง'));
   for(const x of[q.a,q.b]){
    assert.ok(x.fitsReading&&x.distInside&&x.distTextBottomGap>=.5&&x.badgeFits,'text must fit physical 40px '+scenario+JSON.stringify(x));
    assert.ok(x.arrowGap===null||x.arrowGap>=2,'arrow must not overlap chart');
    if(scenario==='sample')assert.ok(x.graph&&x.spriteFrame!==undefined,'retain old animation and chart');
   }
   assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);assert.deepEqual(network,[]);
   if(scenario==='sample')await page.screenshot({path:path.join(out,'water-percent-production-simulated.png'),fullPage:false});
   if(scenario==='above')await page.screenshot({path:path.join(out,'water-percent-above-simulated.png'),fullPage:false});
   results.push({scenario,valueA:q.a.value,valueB:q.b.value,arrowA:q.a.arrow,arrowB:q.b.arrow,textFits:true});
   await page.close();
  }
  console.log(JSON.stringify({result:'PASS',native:'432x40',dpr3Screenshot:'water-percent-production-simulated.png',scenarios:results,noExternalApi:true}));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error('BROWSER_QA_FAILED',e.stack);server.close();process.exitCode=1});
