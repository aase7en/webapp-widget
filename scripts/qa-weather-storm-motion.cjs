"use strict";
// Read-only deterministic browser QA. Never calls a weather API or edits Production.
const {strict:assert}=require("node:assert");
const {pathToFileURL}=require("node:url");
const path=require("node:path");
const fs=require("node:fs");
const puppeteer=require("puppeteer");
const ROOT=path.resolve(__dirname,"..");
const OUTPUT=process.env.WEATHER_MOTION_QA_OUT||"/tmp/uth-weather-storm-browserqa-20261106";
fs.mkdirSync(OUTPUT,{recursive:true});
const names=["rain","thunderstorm","night-rain","night-thunderstorm"];
const makeFixture=(icon,extras={})=>{
  const now=new Date();
  const days=Array.from({length:7},(_,i)=>({
    day:["ศ.","ส.","อา.","จ.","อ.","พ.","พฤ."][i],
    hi:33+i%4,lo:25+i%2,p:[75,85,95,40,35,55,65][i],
    ico:icon,date:new Date(now.getTime()+i*86400000).toISOString().slice(0,10)
  }));
  return {temperatureC:31,feelsC:36,rainPct:75,humidityPct:81,high:34,low:25,
    icon,days,provenance:"QA fixture - not operational data",historical:false,
    observedAt:now.toISOString(),...extras};
};
(async()=>{
 const browser=await puppeteer.launch({headless:true,
   executablePath:process.env.QA_CHROME||"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
   args:["--no-sandbox"]});
 const report={status:"UNKNOWN",cases:[],errors:[],blockedExternalRequests:[],at:new Date().toISOString()};
 try{
  const page=await browser.newPage();
  await page.setRequestInterception(true);
  page.on("request",req=>{if(/^https?:/i.test(req.url())){report.blockedExternalRequests.push(req.url().split("?")[0]);req.abort();}else req.continue();});
  page.on("pageerror",err=>report.errors.push(err.message));
  await page.setViewport({width:432,height:40,deviceScaleFactor:3});
  await page.goto(pathToFileURL(path.join(ROOT,"v2/weather-luxury.html")).href,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>window.UthWeatherHybrid&&typeof window.paint==="function");
  const baseline=await page.evaluate(()=>{
    const el=document.querySelector("#board");
    const a=el.getBoundingClientRect(),clock=document.querySelector("#time").getBoundingClientRect();
    return {size:[a.width,a.height],clockX:+(clock.x-a.x).toFixed(2)};
  });
  assert.deepEqual(baseline.size,[432,40]);assert.ok(baseline.clockX>=5&&baseline.clockX<=9);
  for(const condition of names){
    await page.evaluate(f=>window.paint(f),makeFixture(condition));
    await page.waitForFunction(cond=>{const im=document.querySelector("#icon");return im.dataset.condition===cond&&im.complete&&im.naturalWidth>0&&document.querySelector("#poster").naturalWidth>0},{timeout:10000},condition);
    // APNG has time to step into its animated raindrops/lightning.
    await new Promise(resolve=>setTimeout(resolve,condition.includes("thunderstorm")?720:150));
    const result=await page.evaluate(()=>{
      const stage=document.querySelector("#board"),root=stage.getBoundingClientRect();
      const g=sel=>{const el=document.querySelector(sel),rect=el.getBoundingClientRect(),s=getComputedStyle(el);
        return{x:+(rect.x-root.x).toFixed(2),y:+(rect.y-root.y).toFixed(2),
          width:+rect.width.toFixed(2),height:+rect.height.toFixed(2),
          top:s.top,transform:s.transform,src:el.getAttribute("src")}};
      return {
        condition:document.querySelector("#icon").dataset.condition,
        clock:g("#time"),temp:g(".temp"),icon:g("#icon"),poster:g("#poster"),
        board:[root.width,root.height],freshness:stage.dataset.freshness,
        source:document.querySelector("#weather-hybrid-panel").dataset.source,
        observedAt:document.querySelector("#weather-hybrid-panel").dataset.observedAt,
        values:[...document.querySelectorAll(".hybrid-value")].map(e=>e.textContent),
        days:document.querySelectorAll(".hybrid-day").length,
        graph:getComputedStyle(document.querySelector(".graph")).display,
        border:getComputedStyle(stage,"::after").display
      };
    });
    assert.equal(result.condition,condition);
    assert.equal(result.days,4);assert.equal(result.graph,"none");
    assert.equal(result.source,"QA fixture - not operational data");
    assert.deepEqual(result.values,["75%","81%","34°","25°"]);
    assert.ok(result.observedAt);assert.equal(result.freshness,"MODEL_LATEST");
    assert.equal(result.clock.x,baseline.clockX);
    assert.ok(result.icon.src.endsWith(".apng?v=20261106-storm-clarity-1"));
    assert.ok(result.poster.src.endsWith("-led-poster.png?v=20261106-storm-clarity-1"));
    // Cloud art is inside the visual gap between fixed clock and hero temp.
    assert.ok(result.icon.x>=65&&result.icon.x<120,JSON.stringify(result.icon));
    assert.ok(result.temp.x>150,"temperature must remain on right of icon");
    assert.equal(result.border,"block");
    await page.screenshot({path:path.join(OUTPUT,condition+"-432x40.png")});
    report.cases.push({name:"condition-"+condition,result});
  }
  // Fallback with native poster when reduced motion is requested.
  const reduce=await browser.newPage();
  await reduce.setRequestInterception(true);
  reduce.on("request",req=>/^https?:/.test(req.url())?req.abort():req.continue());
  await reduce.emulateMediaFeatures([{name:"prefers-reduced-motion",value:"reduce"}]);
  await reduce.goto(pathToFileURL(path.join(ROOT,"v2/weather-luxury.html")).href,{waitUntil:"domcontentloaded"});
  await reduce.waitForFunction(()=>window.UthWeatherHybrid&&typeof window.paint==="function");
  await reduce.evaluate(f=>window.paint(f),makeFixture("thunderstorm"));
  await reduce.waitForFunction(()=>document.querySelector("#poster").complete&&document.querySelector("#poster").naturalWidth>0,{timeout:10000});
  const motion=await reduce.evaluate(()=>({
    animation:getComputedStyle(document.querySelector("#icon")).display,
    poster:getComputedStyle(document.querySelector("#poster")).display,
    posterLoaded:document.querySelector("#poster").naturalWidth>0
  }));
  assert.equal(motion.animation,"none");
  assert.notEqual(motion.poster,"none");
  assert.ok(motion.posterLoaded);
  await reduce.screenshot({path:path.join(OUTPUT,"reduced-motion-poster.png")});
  await reduce.close();
  report.cases.push({name:"reduced-motion-poster",motion});
  await page.evaluate(f=>window.paint(f),makeFixture("rain",{temperatureC:null,observedAt:null,rainPct:0,humidityPct:null,high:null,low:null,historical:true}));
  const missing=await page.evaluate(()=>({
    current:document.querySelector("#temp").textContent,
    rain:document.querySelector('.hybrid-metric[data-kind="rain"] .hybrid-value').textContent,
    humidity:document.querySelector('.hybrid-metric[data-kind="humidity"] .hybrid-value').textContent
  }));
  assert.deepEqual(missing,{current:"—",rain:"0%",humidity:"—"});
  report.cases.push({name:"missing-not-zero",missing});
  await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});
  await page.evaluate(f=>window.paint(f),makeFixture("rain"));
  await page.screenshot({path:path.join(OUTPUT,"mobile-390.png"),fullPage:true});
  report.cases.push({name:"mobile-390",passed:true});
  assert.deepEqual(report.errors,[]);
  report.status="PASS";
  console.log(JSON.stringify({status:"PASS",cases:report.cases.map(c=>c.name),clockX:baseline.clockX,
    conditions:names,blockedExternal:report.blockedExternalRequests.length}));
 }catch(e){report.status="FAIL";report.failure=e.stack;console.error(e.stack);process.exitCode=1;}
 finally{fs.writeFileSync(path.join(OUTPUT,"report.json"),JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
