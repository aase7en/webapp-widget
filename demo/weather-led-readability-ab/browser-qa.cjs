"use strict";
const puppeteer=require("puppeteer");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {pathToFileURL}=require("node:url");
(async()=>{
  const out=process.env.PREVIEW_CAPTURE_DIR||"/tmp/uth-widget-weather-ab-qa-20261104";
  fs.mkdirSync(out,{recursive:true});
  const browser=await puppeteer.launch({
    headless:true,
    executablePath:process.env.PREVIEW_CHROME_PATH||"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args:["--no-sandbox"]
  });
  const report={at:new Date().toISOString(),cases:[],errors:[],httpRequests:[]};
  try{
    const page=await browser.newPage();
    page.on("pageerror",e=>report.errors.push("pageerror: "+e.message));
    page.on("console",m=>{if(m.type()==="error")report.errors.push("console: "+m.text())});
    page.on("request",req=>{if(/^https?:/.test(req.url()))report.httpRequests.push(req.url())});
    await page.setViewport({width:1280,height:800,deviceScaleFactor:1});
    await page.goto(pathToFileURL(path.join(__dirname,"index.html")).href,{waitUntil:"load"});
    await page.waitForFunction(()=>!!window.WeatherLedDemo);
    await page.waitForFunction(()=>[...document.querySelectorAll("#native-stage .today-scene,#native-stage .today-animation,#native-stage .today-poster")].length===3 &&
      [...document.querySelectorAll("#native-stage .today-scene,#native-stage .today-animation,#native-stage .today-poster")].every(x=>x.complete&&x.naturalWidth>0));
    const artwork=await page.evaluate(()=>({
      scene:document.querySelector("#native-stage .today-scene").getAttribute("src"),
      animation:document.querySelector("#native-stage .today-animation").getAttribute("src"),
      poster:document.querySelector("#native-stage .today-poster").getAttribute("src"),
      metrics:document.querySelectorAll("#native-stage .metric-symbol").length,
      graph:!!document.querySelector("#native-stage .mini-trend"),
      motion:getComputedStyle(document.querySelector("#native-stage .today-animation")).display,
      on:WeatherLedDemo.getState().effects
    }));
    assert.ok(artwork.scene.endsWith("rain.webp")&&artwork.animation.endsWith("rain.apng")&&artwork.poster.endsWith("rain-poster.png"),"production scene and APNG/poster reused");
    assert.ok(artwork.metrics>=11&&artwork.graph&&artwork.motion!=="none"&&artwork.on,"rich visual layers rendered");
    await page.evaluate(()=>WeatherLedDemo.setEffects(false));
    assert.equal(await page.$eval("#native-stage .today-scene",n=>getComputedStyle(n).display),"none","effects off hides scene");
    await page.evaluate(()=>WeatherLedDemo.setEffects(true));
    assert.notEqual(await page.$eval("#native-stage .today-scene",n=>getComputedStyle(n).display),"none","effects on restores scene");
    report.cases.push({label:"original-scene-apng-icon-graph-toggle",artwork,passed:true});
    async function measure(label,expectCount,screenshot){
      const geom=await page.evaluate(()=>{
        const box=document.querySelector("#native-stage");
        const bounds=box.getBoundingClientRect();
        const cells=[...box.querySelectorAll(".day-cell")];
        const selectors=[".day-name",".day-temps",".day-rain",".metric-value"];
        const clipped=[...box.querySelectorAll(selectors.join(","))].filter(n=>n.scrollWidth>n.clientWidth+1||n.scrollHeight>n.clientHeight+1)
          .map(n=>({className:n.className,text:n.textContent,scrollW:n.scrollWidth,clientW:n.clientWidth,scrollH:n.scrollHeight,clientH:n.clientHeight}));
        return {native:{width:bounds.width,height:bounds.height},dayCount:cells.length,
          dayIndices:cells.map(n=>Number(n.getAttribute("data-day"))),
          maxCellRight:Math.max(...cells.map(n=>n.getBoundingClientRect().right-bounds.left)),
          maxCellBottom:Math.max(...cells.map(n=>n.getBoundingClientRect().bottom-bounds.top)),
          clipped,
          fontSizeRain:getComputedStyle(box.querySelector(".day-rain")).fontSize,
          fontSizeTemps:getComputedStyle(box.querySelector(".day-temps")).fontSize,
          zoomFrame:{width:document.querySelector("#zoom-frame").getBoundingClientRect().width,height:document.querySelector("#zoom-frame").getBoundingClientRect().height}
        };
      });
      assert.deepEqual(geom.native,{width:432,height:40},label+" native dimensions");
      assert.equal(geom.dayCount,expectCount,label+" day count");
      assert.ok(geom.maxCellRight<=432.1&&geom.maxCellBottom<=40.1,label+" cells in LED");
      assert.deepEqual(geom.clipped,[],label+" no text overflow");
      if(screenshot)await (await page.$("#native-stage")).screenshot({path:path.join(out,screenshot)});
      report.cases.push({label,...geom});
      return geom;
    }
    await measure("A-normal-7",7,"A-7days-432x40.png");
    const AFont=Number.parseFloat(report.cases.at(-1).fontSizeRain);
    await page.evaluate(()=>WeatherLedDemo.setMode("B"));
    await measure("B-normal-4",4,"B-first4-432x40.png");
    const BFont=Number.parseFloat(report.cases.at(-1).fontSizeRain);
    assert.ok(BFont>AFont,"B enlarges rain chance");
    await page.evaluate(()=>WeatherLedDemo.setPage(1));
    await measure("B-normal-3",3,"B-last3-432x40.png");
    for(const scenario of ["edge","missing"]){
      await page.evaluate(s=>WeatherLedDemo.setScenario(s),scenario);
      const currentArt=await page.$eval("#native-stage .today-animation",n=>n.getAttribute("src"));
      assert.ok(currentArt.endsWith((scenario==="edge"?"thunderstorm":"cloudy")+".apng"),"fixture condition chooses approved animated asset");
      for(const [mode,pageIndex,count] of [["A",0,7],["B",0,4],["B",1,3]]){
        await page.evaluate(({mode,pageIndex})=>{WeatherLedDemo.setMode(mode);if(mode==="B")WeatherLedDemo.setPage(pageIndex);},{mode,pageIndex});
        await measure(scenario+"-"+mode+"-"+pageIndex,count,null);
      }
    }
    const missing=await page.evaluate(()=>({zero:[...document.querySelectorAll("#native-stage .rain-number")].some(n=>n.textContent==="0%"),
      dash:[...document.querySelectorAll("#native-stage .day-high")].some(n=>n.textContent==="—"),
      provenance:WeatherLedDemo.getState()}));
    assert.ok(missing.zero&&missing.dash,"0 remains zero while missing renders emdash");
    assert.equal(missing.provenance.source,"SIMULATED / LOCAL FIXTURE");
    assert.equal(missing.provenance.observedAt,null);
    await page.evaluate(()=>{WeatherLedDemo.setScenario("normal");WeatherLedDemo.setMode("B");WeatherLedDemo.setPaused(false);WeatherLedDemo.setIntervalSeconds(9)});
    await page.waitForFunction(()=>WeatherLedDemo.getState().page===1,{timeout:12000,polling:200});
    report.cases.push({label:"auto-rotation-9s",passed:true});
    await page.evaluate(()=>{WeatherLedDemo.setPaused(true);WeatherLedDemo.setZoom(6)});
    const actualZoom=await page.$eval("#zoom-frame",n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height}));
    assert.deepEqual(actualZoom,{width:2592,height:240},"6x inspector");
    await page.screenshot({path:path.join(out,"desktop-1280.png"),fullPage:true});
    await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});
    await page.screenshot({path:path.join(out,"mobile-390.png"),fullPage:true});
    const mobile=await page.evaluate(()=>({
      vw:document.documentElement.clientWidth,
      innerW:window.innerWidth,
      stageW:document.querySelector("#native-stage").getBoundingClientRect().width,
      stageH:document.querySelector("#native-stage").getBoundingClientRect().height,
      scrollable:document.querySelector(".stage-scroll").scrollWidth>document.querySelector(".stage-scroll").clientWidth,
      zoomScrollable:document.querySelector("#zoom-viewport").scrollWidth>document.querySelector("#zoom-viewport").clientWidth
    }));
    assert.equal(mobile.stageW,432);
    assert.equal(mobile.stageH,40);
    assert.equal(mobile.scrollable,true);
    assert.equal(mobile.zoomScrollable,true);
    report.cases.push({label:"mobile-390x844",...mobile});
    const reduced=await browser.newPage();
    await reduced.emulateMediaFeatures([{name:"prefers-reduced-motion",value:"reduce"}]);
    await reduced.goto(pathToFileURL(path.join(__dirname,"index.html")).href,{waitUntil:"load"});
    const state=await reduced.evaluate(()=>WeatherLedDemo.getState());
    assert.equal(state.paused,true,"reduced-motion default paused");
    const reducedArtwork=await reduced.evaluate(()=>({
      animation:getComputedStyle(document.querySelector("#native-stage .today-animation")).display,
      poster:getComputedStyle(document.querySelector("#native-stage .today-poster")).display,
      scene:getComputedStyle(document.querySelector("#native-stage .today-scene")).display
    }));
    assert.equal(reducedArtwork.animation,"none","reduced-motion hides animated APNG");
    assert.notEqual(reducedArtwork.poster,"none","reduced-motion shows original poster fallback");
    assert.notEqual(reducedArtwork.scene,"none","reduced-motion retains scenic backdrop");
    report.cases.push({label:"reduced-motion",paused:state.paused,reducedArtwork});
    await reduced.close();
    assert.deepEqual(report.errors,[],"browser errors");
    assert.deepEqual(report.httpRequests,[],"demo must never fetch remote data");
    fs.writeFileSync(path.join(out,"qa-report.json"),JSON.stringify({...report,result:"PASS"},null,2));
    console.log(JSON.stringify({result:"PASS",captureDir:out,cases:report.cases.map(c=>c.label),AFont,BFont,mobile,errors:report.errors,httpRequests:report.httpRequests}));
  }catch(e){
    fs.writeFileSync(path.join(out,"qa-report.json"),JSON.stringify({...report,result:"FAIL",failure:e.message},null,2));
    console.error(e.stack);process.exitCode=1;
  }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1});