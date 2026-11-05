"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const {pathToFileURL}=require("node:url");
const puppeteer=require("puppeteer");
(async()=>{
 const out=process.env.PREVIEW_CAPTURE_DIR||"/tmp/uth-weather-luxury-fidelity-qa";
 fs.mkdirSync(out,{recursive:true});
 const browser=await puppeteer.launch({headless:true,executablePath:process.env.PREVIEW_CHROME_PATH||"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",args:["--no-sandbox"]});
 const report={checkedAt:new Date().toISOString(),result:"UNKNOWN",cases:[],errors:[],externalRequests:[]};
 try{
  const page=await browser.newPage();
  page.on("pageerror",e=>report.errors.push("pageerror: "+e.message));
  page.on("console",m=>{if(m.type()==="error")report.errors.push("console: "+m.text())});
  page.on("request",r=>{if(/^https?:/.test(r.url()))report.externalRequests.push(r.url())});
  await page.setViewport({width:1280,height:800,deviceScaleFactor:1});
  await page.goto(pathToFileURL(path.join(__dirname,"index.html")).href,{waitUntil:"load"});
  await page.waitForFunction(()=>!!window.WeatherLedDemo);
  await page.evaluate(()=>{WeatherLedDemo.setVisual("luxury");WeatherLedDemo.setMode("A");});
  await page.waitForFunction(()=>{const root=document.querySelector("#native-stage").shadowRoot;return root&&[...root.querySelectorAll("#scene,#icon,#poster")].every(x=>x.complete&&x.naturalWidth>0)});
  await page.waitForFunction(()=>Number.parseFloat(getComputedStyle(document.querySelector("#native-stage").shadowRoot.querySelector(".day-rain")).fontSize)>=15);
  const baseline=await page.evaluate(()=>WeatherLedDemo.getState());
  assert.equal(baseline.productionTemplateSha256,"e0cf3d2aadc267b90e7e8696088b15d225cdc992f75e34326bda05996bae3e48","matches actual live production HTML");
  assert.equal(baseline.source,"SIMULATED / LOCAL FIXTURE");
  assert.equal(baseline.observedAt,null);
  async function verify(label,mode,count,screenshot){
    const state=await page.evaluate(()=>WeatherLedDemo.getState());
    assert.equal(state.mode,mode,label+": mode");
    const data=await page.evaluate(()=>{
      const stage=document.querySelector("#native-stage"),root=stage.shadowRoot;
      const s=stage.getBoundingClientRect();
      const g=selector=>{const el=root.querySelector(selector),r=el.getBoundingClientRect();return {x:r.x-s.x,y:r.y-s.y,w:r.width,h:r.height,text:el.textContent,font:getComputedStyle(el).fontSize,visible:getComputedStyle(el).display!=="none"}};
      const dayCells=[...root.querySelectorAll(".day-cell")];
      const overflow=dayCells.filter(e=>e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1).map(n=>({text:n.textContent,className:n.className,sw:n.scrollWidth,cw:n.clientWidth,sh:n.scrollHeight,ch:n.clientHeight}));
      return {size:{width:s.width,height:s.height},clock:g(".clock"),time:g("#time"),date:g("#date"),scene:g("#scene"),icon:g("#icon"),temp:g(".temp"),stats:g(".stats"),forecast:g(".forecast"),dayCount:dayCells.length,days:dayCells.map(e=>Number(e.dataset.day)),rainFont:g(".day-rain").font,overflow,
       graphPath:root.querySelector("#line").getAttribute("d"),
       sceneLoaded:root.querySelector("#scene").naturalWidth>0,
       iconLoaded:root.querySelector("#icon").naturalWidth>0,
       posterLoaded:root.querySelector("#poster").naturalWidth>0,
       iconCondition:root.querySelector("#icon").dataset.condition,
       simBadge:root.querySelector("#advice").textContent,
       shownTemps:[...root.querySelectorAll(".day-cell .day-high")].map(x=>x.textContent)
      };
    });
    assert.deepEqual(data.size,{width:432,height:40},label+": native exact size");
    assert.equal(data.dayCount,count,label+": day count");
    assert.ok(data.time.x>=5&&data.time.x<=9&&data.time.w>=50,label+": original clock x");
    assert.match(data.time.text,/^\d\d:\d\d$/,label+": working actual clock");
    assert.ok(data.scene.x>=25&&data.scene.x<=31,label+": original panorama anchor");
    if(state.compact){
      assert.ok(data.temp.x>=165&&data.temp.x<=173,label+": hero temperature shifted left");
      assert.ok(data.scene.w>=140&&data.scene.w<=145,label+": scenic footprint 16px narrower");
      if(data.iconCondition==="cloudy"){
        assert.ok(data.icon.x>=59&&data.icon.x<=65,label+": preserve large cloudy animation placement");
      }else{
        assert.ok(data.icon.x>=101&&data.icon.x<=108,label+": animated icon shifted left");
        assert.ok(data.icon.x+data.icon.w<=data.temp.x+0.5,label+": compact icon not over hero");
      }
      assert.ok(data.stats.x>=219&&data.stats.x<=225,label+": metric block shifted left");
      assert.ok(data.forecast.x>=292&&data.forecast.x<=297,label+": forecast expanded to left");
      assert.ok(data.forecast.w>=133&&data.forecast.w<=136,label+": forecast width expanded");
      // Cloudy APNG intentionally contains transparent overscan; validate its actual visual in screenshots.
      assert.ok(data.temp.x+data.temp.w<=data.stats.x,label+": hero not over metrics");
      assert.ok(data.stats.x+data.stats.w<=data.forecast.x,label+": metrics not over forecast");
    }else{
      assert.ok(data.temp.x>=175&&data.temp.x<=185,label+": original hero temperature location");
      assert.ok(data.scene.w>=157&&data.scene.w<=160,label+": original panoramic width");
      assert.ok(data.stats.x>=232&&data.stats.x<=238,label+": original weather stats location");
      assert.ok(data.forecast.x>=303&&data.forecast.x<=309,label+": original forecast location");
    }
    assert.ok(data.sceneLoaded&&data.iconLoaded&&data.posterLoaded,label+": original assets load");
    assert.equal(data.simBadge,"SIM",label+": demo is labeled");
    assert.equal(data.overflow.length,0,label+": no visible forecast text clipping: "+JSON.stringify(data.overflow));
    if(screenshot)await (await page.$("#native-stage")).screenshot({path:path.join(out,screenshot)});
    report.cases.push({label,...data});
    return data;
  }
  const a=await verify("A-7days-compact", "A",7,"A-7days-432x40.png");
  assert.ok(a.graphPath&&a.graphPath.includes("L"),"original forecast line is retained");
  await page.evaluate(()=>WeatherLedDemo.setCompact(false));
  const original=await verify("A-7days-original-comparison","A",7,"A-original-432x40.png");
  assert.ok(a.forecast.w-original.forecast.w>=11.5,"compact gains at least 11.5px forecast width");
  assert.ok(original.temp.x-a.temp.x>=9.5,"hero moves left by around 10 native pixels");
  assert.ok(original.stats.x-a.stats.x>=11.5,"metrics move left by around 12 native pixels");
  assert.ok(Math.abs(original.time.x-a.time.x)<0.2,"clock unchanged across layout choices");
  await page.evaluate(()=>WeatherLedDemo.setCompact(true));
  assert.equal(await page.$eval("#layout",e=>e.getAttribute("aria-pressed")),"true","layout switch restored Compact");
  report.cases.push({label:"compact-original-toggle-and-geometry",originalForecast:original.forecast,compactForecast:a.forecast,passed:true});
  await page.evaluate(()=>WeatherLedDemo.setMode("B"));
  const b=await verify("B-first4-luxury","B",4,"B-first4-432x40.png");
  assert.ok(Number.parseFloat(b.rainFont)>Number.parseFloat(a.rainFont),"B daily rain font is larger than A");
  await page.evaluate(()=>WeatherLedDemo.setPage(1));
  await verify("B-last3-luxury","B",3,"B-last3-432x40.png");
  await page.evaluate(()=>WeatherLedDemo.setEffects(false));
  assert.equal(await page.evaluate(()=>getComputedStyle(document.querySelector("#native-stage").shadowRoot.querySelector("#scene")).display),"none");
  await page.evaluate(()=>WeatherLedDemo.setEffects(true));
  assert.notEqual(await page.evaluate(()=>getComputedStyle(document.querySelector("#native-stage").shadowRoot.querySelector("#scene")).display),"none");
  report.cases.push({label:"effects-toggle",passed:true});
  for(const scenario of ["edge","missing"]){
    await page.evaluate(s=>WeatherLedDemo.setScenario(s),scenario);
    for(const [mode,pageIndex,count] of [["A",0,7],["B",0,4],["B",1,3]]){
      await page.evaluate(({mode,pageIndex})=>{WeatherLedDemo.setMode(mode);if(mode==="B")WeatherLedDemo.setPage(pageIndex)},{mode,pageIndex});
      const data=await verify(scenario+"-"+mode+"-"+pageIndex,mode,count,null);
      assert.equal(data.iconCondition,scenario==="edge"?"thunderstorm":"cloudy");
    }
  }
  await page.evaluate(()=>{WeatherLedDemo.setMode("A");WeatherLedDemo.setScenario("missing")});
  const missing=await page.evaluate(()=>{
    const root=document.querySelector("#native-stage").shadowRoot;
    return {dash:[...root.querySelectorAll(".day-high")].some(n=>n.textContent==="—"),zero:[...root.querySelectorAll(".rain-number")].some(n=>n.textContent==="0%"),currentZero:root.querySelector("#rain").textContent};
  });
  assert.ok(missing.dash&&missing.zero&&missing.currentZero==="0%","unknown != zero, real fixture 0 retained");
  report.cases.push({label:"missing-vs-zero",missing});
  await page.evaluate(()=>{WeatherLedDemo.setScenario("normal");WeatherLedDemo.setMode("B");WeatherLedDemo.setPaused(false);WeatherLedDemo.setIntervalSeconds(9)});
  await page.waitForFunction(()=>WeatherLedDemo.getState().page===1,{timeout:12000,polling:200});
  report.cases.push({label:"9-second-automatic-rotation",passed:true});
  await page.evaluate(()=>{WeatherLedDemo.setPaused(true);WeatherLedDemo.setZoom(6)});
  const zoom=await page.$eval("#zoom-frame",e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}));
  assert.deepEqual(zoom,{w:2592,h:240});
  await page.screenshot({path:path.join(out,"desktop-1280.png"),fullPage:true});
  await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});
  await page.screenshot({path:path.join(out,"mobile-390.png"),fullPage:true});
  const mobile=await page.evaluate(()=>({stage:document.querySelector("#native-stage").getBoundingClientRect().width,scrollable:document.querySelector(".stage-scroll").scrollWidth>document.querySelector(".stage-scroll").clientWidth,zoomScrollable:document.querySelector("#zoom-viewport").scrollWidth>document.querySelector("#zoom-viewport").clientWidth}));
  assert.equal(mobile.stage,432);assert.ok(mobile.scrollable&&mobile.zoomScrollable);
  report.cases.push({label:"mobile-390",mobile,zoom});
  const reduced=await browser.newPage();
  await reduced.emulateMediaFeatures([{name:"prefers-reduced-motion",value:"reduce"}]);
  await reduced.goto(pathToFileURL(path.join(__dirname,"index.html")).href,{waitUntil:"load"});
  const reduction=await reduced.evaluate(()=>{
    const root=document.querySelector("#native-stage").shadowRoot;
    return {paused:WeatherLedDemo.getState().paused,animated:getComputedStyle(root.querySelector("#icon")).display,poster:getComputedStyle(root.querySelector("#poster")).display};
  });
  assert.equal(reduction.paused,true);assert.equal(reduction.animated,"none");assert.notEqual(reduction.poster,"none");
  await reduced.close();report.cases.push({label:"reduced-motion-fallback",reduction});
  // Visual-reference mode is the default and preserves Luxury mode as a regression baseline.
  await page.setViewport({width:1280,height:800,deviceScaleFactor:1});
  await page.evaluate(()=>{WeatherLedDemo.setScenario("normal");WeatherLedDemo.setVisual("reference");WeatherLedDemo.setMode("A");WeatherLedDemo.setEffects(true)});
  await page.waitForFunction(()=>getComputedStyle(document.querySelector("#native-stage").shadowRoot.querySelector(".rf-day-name")).fontSize==="6.2px");
  const referenceMetrics=await page.evaluate(()=>{
    const stage=document.querySelector("#native-stage"),root=stage.shadowRoot,board=root.querySelector(".rf-board");
    const frame=stage.getBoundingClientRect();
    const rect=q=>{const n=board.querySelector(q),r=n.getBoundingClientRect();return{x:+(r.left-frame.left).toFixed(2),y:+(r.top-frame.top).toFixed(2),w:+r.width.toFixed(2),h:+r.height.toFixed(2),txt:n.textContent}};
    return {
      frame:{w:frame.width,h:frame.height},visible:getComputedStyle(board).display,
      clock:rect(".rf-clock"),hero:rect(".rf-hero"),rain:rect('.rf-metric[data-kind="rain"]'),
      forecast:rect(".rf-forecast"),dayCount:board.querySelectorAll(".rf-day").length,
      icons:board.querySelectorAll(".rf-weather-svg").length,graphPoints:board.querySelectorAll(".rf-dot").length,
      graphSegments:board.querySelectorAll(".rf-line").length,
      current:board.querySelector(".rf-temp-number").textContent,
      high:board.querySelector('.rf-metric[data-kind="high"] .rf-metric-value').textContent,
      humidity:board.querySelector('.rf-metric[data-kind="humidity"] .rf-metric-value').textContent,
      rainText:board.querySelector('.rf-metric[data-kind="rain"] .rf-metric-value').textContent,
      scenario:WeatherLedDemo.getState().scenario,
      source:WeatherLedDemo.getState().source,
      observedAt:WeatherLedDemo.getState().observedAt,
      load:[...board.querySelectorAll(".rf-scene,.rf-hero-weather")].map(n=>({url:n.getAttribute("src"),loaded:n.complete&&n.naturalWidth>0}))
    };
  });
  assert.deepEqual(referenceMetrics.frame,{w:432,h:40},"reference native 432x40");
  assert.equal(referenceMetrics.visible,"grid");
  assert.ok(referenceMetrics.hero.x>=0&&referenceMetrics.hero.w>=131);
  assert.ok(referenceMetrics.forecast.x>=230&&referenceMetrics.forecast.x<=233);
  assert.equal(referenceMetrics.current,"32");assert.equal(referenceMetrics.rainText,"40%");
  assert.equal(referenceMetrics.humidity,"72%");assert.equal(referenceMetrics.high,"36°");
  assert.equal(referenceMetrics.dayCount,7);assert.equal(referenceMetrics.icons,7);
  assert.equal(referenceMetrics.graphPoints,7);assert.equal(referenceMetrics.graphSegments,6);
  const graphY=await page.evaluate(()=>[...document.querySelector("#native-stage").shadowRoot.querySelectorAll(".rf-dot")].map(el=>({y:Number(el.getAttribute("cy")),x:Number(el.getAttribute("cx")),color:el.getAttribute("fill")})));
  assert.ok(graphY[5].y<graphY[2].y,"higher temperature is plotted higher on graph");
  assert.notEqual(graphY[2].color,graphY[5].color,"line/dot coloring changes with temperature");
  report.cases.push({label:"reference-chart-high-temperature-axis-and-color",graphY});
  assert.ok(referenceMetrics.clock.txt.includes(":"));
  assert.equal(referenceMetrics.source,"SIMULATED / LOCAL FIXTURE");
  assert.equal(referenceMetrics.observedAt,null);
  assert.ok(referenceMetrics.load.every(x=>x.loaded),"reference preserves scenic/APNG/poster assets");
  await (await page.$("#native-stage")).screenshot({path:path.join(out,"Reference-A-7days-432x40.png")});
  report.cases.push({label:"reference-visual-native-A-7",referenceMetrics});
  await page.click("#opt-b");
  assert.equal(await page.evaluate(()=>WeatherLedDemo.getState().visibleDays),4);
  const firstPage=await page.evaluate(()=>document.querySelector("#native-stage").shadowRoot.querySelectorAll(".rf-day").length);
  assert.equal(firstPage,4);
  await (await page.$("#native-stage")).screenshot({path:path.join(out,"Reference-B-first4-432x40.png")});
  await page.click("#next");
  const secondPage=await page.evaluate(()=>document.querySelector("#native-stage").shadowRoot.querySelectorAll(".rf-day").length);
  assert.equal(secondPage,3);
  await (await page.$("#native-stage")).screenshot({path:path.join(out,"Reference-B-last3-432x40.png")});
  report.cases.push({label:"reference-visual-B-4+3",counts:[firstPage,secondPage]});
  await page.evaluate(()=>{WeatherLedDemo.setScenario("edge");WeatherLedDemo.setMode("A")});
  const extreme=await page.evaluate(()=>{
    const root=document.querySelector("#native-stage").shadowRoot,ref=root.querySelector(".rf-board");
    return{heat:ref.dataset.heat,temp:ref.querySelector(".rf-temp-number").textContent,
      rain:ref.querySelector('.rf-metric[data-kind="rain"] .rf-metric-value').textContent,
      red:ref.querySelectorAll(".rf-day-high[data-heat=hot]").length,
      graphPoints:ref.querySelectorAll(".rf-dot").length};
  });
  assert.equal(extreme.heat,"hot");assert.equal(extreme.temp,"42");assert.equal(extreme.rain,"100%");
  assert.ok(extreme.red>=1&&extreme.graphPoints===7);
  await (await page.$("#native-stage")).screenshot({path:path.join(out,"Reference-edge-432x40.png")});
  report.cases.push({label:"reference-heat-color-thresholds",extreme});
  await page.evaluate(()=>WeatherLedDemo.setScenario("missing"));
  const missingRef=await page.evaluate(()=>{
    const ref=document.querySelector("#native-stage").shadowRoot.querySelector(".rf-board");
    return{zero:[...ref.querySelectorAll(".rf-rain")].some(x=>x.textContent==="0%"),
      unknown:[...ref.querySelectorAll(".rf-day-high")].some(x=>x.textContent==="—"),
      graphPoints:ref.querySelectorAll(".rf-dot").length,
      firstIcon:ref.querySelector(".rf-weather-svg")!==null};
  });
  assert.ok(missingRef.zero&&missingRef.unknown&&missingRef.graphPoints<7&&missingRef.firstIcon);
  report.cases.push({label:"reference-unknown-not-zero",missingRef});
  await page.evaluate(()=>{WeatherLedDemo.setScenario("normal");WeatherLedDemo.setMode("A")});
  await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});
  await page.screenshot({path:path.join(out,"Reference-mobile-390.png"),fullPage:true});
  const refMobile=await page.evaluate(()=>({stage:document.querySelector("#native-stage").getBoundingClientRect().width,scrollable:document.querySelector(".stage-scroll").scrollWidth>document.querySelector(".stage-scroll").clientWidth,zoom:document.querySelector("#zoom-frame").getBoundingClientRect().width}));
  assert.equal(refMobile.stage,432);assert.ok(refMobile.scrollable);report.cases.push({label:"reference-mobile-390",refMobile});
  await page.click("#visual-luxury");
  assert.equal(await page.evaluate(()=>WeatherLedDemo.getState().visual),"luxury");
  await page.click("#visual-reference");
  assert.equal(await page.evaluate(()=>WeatherLedDemo.getState().visual),"reference");
  report.cases.push({label:"reference-vs-luxury-view-toggle",passed:true});
  const reducedRefPage=await browser.newPage();
  await reducedRefPage.emulateMediaFeatures([{name:"prefers-reduced-motion",value:"reduce"}]);
  await reducedRefPage.goto(pathToFileURL(path.join(__dirname,"index.html")).href,{waitUntil:"load"});
  await reducedRefPage.evaluate(()=>WeatherLedDemo.setVisual("reference"));
  await reducedRefPage.waitForFunction(()=>getComputedStyle(document.querySelector("#native-stage").shadowRoot.querySelector(".rf-board")).display==="grid");
  const reducedReference=await reducedRefPage.evaluate(()=>{
    const root=document.querySelector("#native-stage").shadowRoot;
    const ref=root.querySelector(".rf-board");
    return{animated:getComputedStyle(ref.querySelector(".rf-hero-weather:not(.rf-hero-poster)")).display,
      poster:getComputedStyle(ref.querySelector(".rf-hero-poster")).display,paused:WeatherLedDemo.getState().paused};
  });
  assert.equal(reducedReference.animated,"none");
  assert.notEqual(reducedReference.poster,"none");
  assert.equal(reducedReference.paused,true);
  await reducedRefPage.close();
  report.cases.push({label:"reference-reduced-motion",reducedReference});
  assert.deepEqual(report.errors,[],"no console/page errors");
  assert.deepEqual(report.externalRequests,[],"no backend/external requests");
  report.result="PASS";
  fs.writeFileSync(path.join(out,"qa-report.json"),JSON.stringify(report,null,2));
  console.log(JSON.stringify({result:report.result,cases:report.cases.map(c=>c.label),captureDir:out,productionTemplateSha256:baseline.productionTemplateSha256,fonts:{A:a.rainFont,B:b.rainFont},errors:report.errors,externalRequests:report.externalRequests}));
 }catch(e){report.result="FAIL";report.failure=e.stack;fs.writeFileSync(path.join(out,"qa-report.json"),JSON.stringify(report,null,2));console.error(e.stack);process.exitCode=1;}finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1});