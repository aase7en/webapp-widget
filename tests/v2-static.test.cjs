const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ROOT=path.join(__dirname,'..');
const SOURCE=fs.readFileSync(path.join(ROOT,'v2/api-client.js'),'utf8');
function bangkokStamp(date=new Date()){
 return new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(date).replace(' ',' ');
}
function boot({pm=23.1,levelA=2.87,levelB=3.15,ageMin=20,weather=true,apiFails=false}={}){
 const current=new Date(Date.now()-ageMin*60000),iso=current.toISOString(),hourly=[];
 for(let h=1;h<=8;h++){
  const d=new Date(Math.floor((Date.now()+7*3600000)/3600000)*3600000+h*3600000-7*3600000);
  hourly.push(bangkokStamp(d).replace(' ','T'));
 }
 const data={location:{id:'uthai',lat:14.36147,lon:100.64424},
  pm25:{status:'ok',unit:'µg/m³',value:pm,observedAt:iso,source:'GISTDA Uthai'},
  weather:{status:'ok',temperatureC:29,humidityPct:81,weatherCode:53,observedAt:iso,source:'Open-Meteo model'}};
 const forecast={timezone:'Asia/Bangkok',hourly:{time:hourly,weather_code:hourly.map(()=>61),precipitation_probability:hourly.map(()=>35)},
   current:{wind_speed_10m:12}};
 const water={waterlevel_data:{result:'OK',data:[
  {station:{id:471583,min_bank:3.03,ground_level:0.227},waterlevel_datetime:bangkokStamp(current),waterlevel_msl:levelA},
  {station:{id:2607,min_bank:4.70,ground_level:-8.59},waterlevel_datetime:bangkokStamp(current),waterlevel_msl:levelB}
 ]}};
 const fetcher=async(url)=>({ok:!apiFails,json:async()=>url.includes('open-meteo')?forecast:water});
 const window={fetch:fetcher,UthaiLEDRotation:{requestBackendData:async()=>({ok:true,raw:weather?data:{...data,weather:{status:'missing'}}})}};
 const context=vm.createContext({window,fetch:fetcher,Date,Math,Number,Set,URLSearchParams,AbortController,setTimeout,clearTimeout,Promise,Error,Intl});
 vm.runInContext(SOURCE,context,{filename:'api-client.js'});
 return window.UthApiClient;
}
test('static v2 ships no loopback/mocked operational inputs',()=>{
 const names=['index.html','weather.html','api-client.js','live-widgets.js','weather-live.js'];
 for(const file of names){
  const content=fs.readFileSync(path.join(ROOT,'v2',file),'utf8');
  assert.doesNotMatch(content,/127\.0\.0\.1|fetch\(['"]\/api\/(live|water)|SIMULATED|MOCK \/ /,file);
 }
 assert.match(fs.readFileSync(path.join(ROOT,'v2/index.html'),'utf8'),/pm-num/);
 assert.match(fs.readFileSync(path.join(ROOT,'v2/weather.html'),'utf8'),/weather-live.js/);
});
test('PM and weather use actual values and model forecast with provenance',async()=>{
 const data=await boot().getLive();
 assert.equal(data.pm25.status,'latest');assert.equal(data.pm25.value,23.1);
 assert.equal(data.pm25.source,'GISTDA Uthai');
 assert.equal(data.weather.status,'model_latest');assert.equal(data.weather.temperatureC,29);
 assert.equal(data.weather.windKmh,12);
 assert.equal(data.forecast.status,'model_forecast');assert.equal(data.forecast.hours.length,5);
 assert.equal(data.forecast.hours[0].rainProbabilityPct,35);
});
test('PM stale/invalid channel is unavailable instead of zero',async()=>{
 const old=await boot({ageMin:241}).getLive();
 assert.equal(old.pm25.status,'unavailable');assert.equal(old.weather.status,'unavailable');
 const bad=await boot({pm:null}).getLive();assert.equal(bad.pm25.status,'unavailable');
});
test('Water: station-specific min_bank drives 0.50 m watch and critical, not local hospital safety',async()=>{
 const res=await boot({levelA:2.87,levelB:3.15}).getWater();
 assert.equal(res.stations.HDA004.status,'ok');assert.equal(res.stations.HDA004.risk,'watch');
 assert.equal(res.stations.S5.status,'ok');assert.equal(res.stations.S5.risk,'below_watch');
 assert.equal(res.stations.HDA004.watchLevelMsl,2.53);
 const critical=await boot({levelA:3.03,levelB:4.7}).getWater();
 assert.equal(critical.stations.HDA004.risk,'critical');assert.equal(critical.stations.S5.risk,'critical');
});
test('Missing and stale water does not become level zero or safe',async()=>{
 const stale=await boot({ageMin:241}).getWater();
 assert.equal(stale.stations.HDA004.status,'missing');assert.equal(stale.stations.HDA004.levelMsl,null);
 assert.equal(stale.stations.HDA004.risk,'unassessed');
 const offline=await boot({apiFails:true}).getWater();
 assert.equal(offline.stations.S5.levelMsl,null);
 assert.equal(offline.stations.S5.risk,'unassessed');
});
test('No historical trend invented with a single station timestamp',async()=>{
 const water=await boot().getWater();
 assert.deepEqual(Array.from(water.stations.HDA004.trendPoints),[]);
 assert.equal(water.stations.HDA004.deltaM,null);
});

test('production root embeds exact physical 432x40 rotation, preserving a legacy fallback',()=>{
 const html=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
 const legacy=fs.readFileSync(path.join(ROOT,'legacy.html'),'utf8');
 const screen=fs.readFileSync(path.join(ROOT,'v2/index.html'),'utf8');
 assert.match(html,/src="\.\/v2\/index\.html\?display=led"/);
 assert.match(html,/width:432px;height:40px/);
 assert.match(html,/Open-Meteo/);
 assert.doesNotMatch(html,/script\.google\.com|localhost|AKfycb/);
 assert.match(legacy,/id="slide-pm"/);
 assert.match(screen,/main>article/);
 assert.match(screen,/22000/);
 assert.match(screen,/\.led-current/);
});

/* ---------- Review-fix P1 harness: controllable clock + failure phases ---------- */
function bootCtl(){
 let t=Date.now();
 const now=()=>t;
 const calls={backend:0,openMeteo:0,water:0,waterReferrer:null,waterUrl:null,openMeteoReferrer:null};
 const state={backendFails:false,waterFails:false,omFails:false,backendDelayMs:0,pm:23.1,observationAgeMin:20};
 const iso=(ageMin)=>new Date(t-ageMin*60000).toISOString();
 const forecastFor=()=>{
  const hourly=[];
  for(let h=1;h<=8;h++){
   const d=new Date(Math.floor((t+7*3600000)/3600000)*3600000+h*3600000-7*3600000);
   hourly.push(bangkokStamp(d).replace(' ','T'));
  }
  const days=[...new Set(hourly.map(x=>x.slice(0,10)))];
  return {timezone:'Asia/Bangkok',hourly:{time:hourly,weather_code:hourly.map(()=>61),
   precipitation_probability:hourly.map(()=>35)},
   daily:{time:days,sunrise:days.map(d=>d+'T06:00'),sunset:days.map(d=>d+'T18:00')},
   current:{wind_speed_10m:12,is_day:0}};
 };
 const dataFor=()=>({location:{id:'uthai',lat:14.36147,lon:100.64424},
  pm25:{status:'ok',unit:'µg/m³',value:state.pm,observedAt:iso(state.observationAgeMin),source:'GISTDA Uthai'},
  weather:{status:'ok',temperatureC:29,humidityPct:81,weatherCode:53,observedAt:iso(state.observationAgeMin),source:'Open-Meteo model'}});
 const waterFor=()=>({waterlevel_data:{result:'OK',data:[
  {station:{id:471583,min_bank:3.03,ground_level:0.227},waterlevel_datetime:bangkokStamp(new Date(t-state.observationAgeMin*60000)),waterlevel_msl:2.87},
  {station:{id:2607,min_bank:4.70,ground_level:-8.59},waterlevel_datetime:bangkokStamp(new Date(t-state.observationAgeMin*60000)),waterlevel_msl:3.15}
 ]}});
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const window={fetch:async(url,init)=>{
   if(url.includes('open-meteo')){calls.openMeteoReferrer=init?.referrerPolicy||null;calls.openMeteo++;if(state.omFails)throw Error('net');return{ok:true,json:async()=>forecastFor()}}
   calls.waterReferrer=init?.referrerPolicy||null;calls.waterUrl=url;calls.water++;if(state.waterFails)throw Error('net');return{ok:true,json:async()=>waterFor()}
  },
  UthaiLEDRotation:{requestBackendData:async()=>{
   calls.backend++;if(state.backendDelayMs)await wait(state.backendDelayMs);
   if(state.backendFails)return{ok:false};
   return{ok:true,raw:dataFor()};
  }}};
 const context=vm.createContext({window,fetch:window.fetch,Date,Math,Number,Set,URLSearchParams,AbortController,setTimeout,clearTimeout,Promise,Error,Intl});
 vm.runInContext(SOURCE,context,{filename:'api-client.js'});
 return {api:window.UthApiClient,calls,state,advance:ms=>{t+=ms},now};
}
test('P1 cache policy constants are pinned and sane',()=>{
 const ctl=bootCtl();
 const p=ctl.api.CACHE_POLICY;
 assert.equal(p.liveTtlMs,180000);assert.equal(p.waterTtlMs,15*60000);
 assert.ok(p.retryAfterFailMs>=30000&&p.retryAfterFailMs<=60000);
 assert.equal(p.staleKeepMs,3*3600000);
});
test('P1 success is cached for the success TTL (no duplicate fetch)',async()=>{
 const ctl=bootCtl();
 const first=await ctl.api.getLive({now:ctl.now});
 assert.equal(first.pm25.status,'latest');assert.equal(ctl.calls.backend,1);
 ctl.advance(60000);
 const second=await ctl.api.getLive({now:ctl.now});
 assert.equal(ctl.calls.backend,1);
 assert.equal(second.pm25.value,first.pm25.value);
});
test('P1 single backend failure serves last-known-good, retries only after the retry window, then recovers',async()=>{
 const ctl=bootCtl();
 await ctl.api.getLive({now:ctl.now});           // seed success
 ctl.advance(200000);                            // past success TTL
 ctl.state.backendFails=true;
 const during=await ctl.api.getLive({now:ctl.now}); // failure attempt #2
 assert.equal(ctl.calls.backend,2);
 assert.equal(during.pm25.status,'latest');       // last-good, same observation
 assert.equal(during.pm25.value,23.1);
 ctl.advance(30000);                             // still inside 45 s retry window
 const held=await ctl.api.getLive({now:ctl.now});
 assert.equal(ctl.calls.backend,2);               // no refetch yet
 assert.equal(held.pm25.status,'latest');
 ctl.advance(20000);                             // retry window expired
 ctl.state.backendFails=false;
 const recovered=await ctl.api.getLive({now:ctl.now});
 assert.equal(ctl.calls.backend,3);               // retry happened
 assert.equal(recovered.pm25.status,'latest');assert.equal(recovered.pm25.value,23.1);
});
test('P1 last-known-good past the freshness window is demoted, never shown as current and never zero',async()=>{
 const ctl=bootCtl();
 const seeded=await ctl.api.getLive({now:ctl.now});
 assert.equal(seeded.pm25.status,'latest');
 ctl.advance((3*3600000)+ (25*60000));           // success TTL long gone; observation now >3 h old
 ctl.state.backendFails=true;
 const aged=await ctl.api.getLive({now:ctl.now});
 assert.notEqual(aged.pm25.status,'latest');
 assert.equal(aged.pm25.status,'unavailable');
 assert.equal(aged.pm25.value,undefined);         // not 0, not a number
 assert.equal(aged.weather.status,'unavailable');
 assert.equal(aged.forecast.status,'unavailable'); // all forecast slots already elapsed
 assert.equal(aged.forecast.hours.length,0);
});
test('P1 first-load failure stays unavailable (no synthetic data) and recovers when the API returns',async()=>{
 const ctl=bootCtl();
 ctl.state.backendFails=true;
 const first=await ctl.api.getLive({now:ctl.now});
 assert.equal(first.pm25.status,'unavailable');
 assert.equal(first.pm25.value,undefined);
 assert.equal(first.forecast.hours.length,0);
 ctl.advance(30000);
 const held=await ctl.api.getLive({now:ctl.now});
 assert.equal(ctl.calls.backend,1);               // inside retry window: no spam
 ctl.advance(20000);
 ctl.state.backendFails=false;
 const recovered=await ctl.api.getLive({now:ctl.now});
 assert.equal(ctl.calls.backend,2);
 assert.equal(recovered.pm25.status,'latest');assert.equal(recovered.pm25.value,23.1);
});
test('P1 water failure keeps last-known-good, then demotes to missing (not zero) once observations expire',async()=>{
 const ctl=bootCtl();
 const seeded=await ctl.api.getWater({now:ctl.now});
 assert.equal(seeded.stations.HDA004.status,'ok');
 assert.equal(seeded.stations.HDA004.levelMsl,2.87);
 ctl.advance(15*60000+1000);                   // past NEW 15-minute Sheets cache TTL
 ctl.state.waterFails=true;
 const during=await ctl.api.getWater({now:ctl.now});
 assert.equal(during.stations.HDA004.status,'ok'); // last-good with real timestamp
 assert.equal(during.stations.HDA004.levelMsl,2.87);
 ctl.advance(30000);
 const held=await ctl.api.getWater({now:ctl.now});
 assert.equal(ctl.calls.water,2);                 // inside retry window: no refetch
 ctl.advance((3*3600000)+(25*60000));
 const aged=await ctl.api.getWater({now:ctl.now});
 assert.equal(ctl.calls.water,3);                 // retry window long expired
 assert.equal(aged.stations.HDA004.status,'missing');
 assert.equal(aged.stations.HDA004.levelMsl,null); // never 0
 assert.equal(aged.stations.HDA004.risk,'unassessed');
 assert.equal(aged.stations.HDA004.bankM,3.03);    // static station geometry retained
});
test('P1 concurrent callers share one in-flight request',async()=>{
 const ctl=bootCtl();
 ctl.state.backendDelayMs=40;
 const [a,b]=await Promise.all([ctl.api.getLive({now:ctl.now}),ctl.api.getLive({now:ctl.now})]);
 assert.equal(ctl.calls.backend,1);
 assert.equal(a.pm25.status,b.pm25.status);
});
test('P3 rotation order is pinned PM → Weather → Water and pages depend on led-rotation.js',()=>{
 const screen=fs.readFileSync(path.join(ROOT,'v2/index.html'),'utf8');
 const weatherPage=fs.readFileSync(path.join(ROOT,'v2/weather.html'),'utf8');
 const pmPos=screen.indexOf('id="pm"');
 const wxPos=screen.indexOf('./weather.html');
 const waPos=screen.indexOf('id="water"');
 assert.ok(pmPos>-1&&wxPos>-1&&waPos>-1,'all three strip markers present');
 assert.ok(pmPos<wxPos&&wxPos<waPos,'article DOM order pm → weather → water');
 assert.match(screen,/src="\.\.\/led-rotation\.js"/,'v2/index.html loads the canonical backend reader');
 assert.match(weatherPage,/src="\.\.\/led-rotation\.js"/,'v2/weather.html loads the canonical backend reader');
});
test('P3 review cleanup: dead QA CSS removed and legacy geography corrected',()=>{
 const screen=fs.readFileSync(path.join(ROOT,'v2/index.html'),'utf8');
 assert.doesNotMatch(screen,/expression-review|expression-face|blinkOnce|happy-swap-now/);
 assert.match(screen,/@supports \(mix-blend-mode:screen\)/,'specular layers degrade gracefully');
 const legacy=fs.readFileSync(path.join(ROOT,'legacy.html'),'utf8');
 assert.doesNotMatch(legacy,/อุทัยธานี/);
 assert.match(legacy,/โรงพยาบาลอุทัย จ\.พระนครศรีอยุธยา/);
});
test('P2 legacy-engine syntax floor: v2 scripts avoid .at(), replaceChildren and optional chaining',()=>{
 for(const file of ['v2/api-client.js','v2/weather-live.js','v2/live-widgets.js']){
  const src=fs.readFileSync(path.join(ROOT,file),'utf8');
  assert.doesNotMatch(src,/\.at\(/,file+' no Array.prototype.at');
  assert.doesNotMatch(src,/replaceChildren/,file+' no replaceChildren');
  assert.doesNotMatch(src,/\?\./,file+' no optional chaining');
  assert.doesNotMatch(src,/(\w|\))\?\?/,file+' no nullish coalescing');
 }
 const screen=fs.readFileSync(path.join(ROOT,'v2/index.html'),'utf8');
 assert.doesNotMatch(screen,/\.at\(-?\d/,'v2/index.html inline scripts avoid Array.prototype.at');
 assert.match(screen,/#pm \.mascot::before\{animation:none!important\}/,'halo pseudo-animation killed under reduced motion');
});

test('P1 hot cache never serves a value that aged past observation freshness within TTL',async()=>{
 const ctl=bootCtl();
 ctl.state.observationAgeMin=179;
 const first=await ctl.api.getLive({now:ctl.now});
 assert.equal(first.pm25.status,'latest');
 assert.equal(first.weather.status,'model_latest');
 ctl.advance(120000); // 181 min old, but cache entry still within 180-second success TTL
 const second=await ctl.api.getLive({now:ctl.now});
 assert.equal(ctl.calls.backend,1,'must not re-fetch within success TTL');
 assert.equal(second.pm25.status,'unavailable');
 assert.equal(second.pm25.value,undefined);
 assert.equal(second.weather.status,'unavailable');
 const waterCtl=bootCtl();
 waterCtl.state.observationAgeMin=179;
 const w1=await waterCtl.api.getWater({now:waterCtl.now});
 assert.equal(w1.stations.HDA004.status,'ok');
 waterCtl.advance(120000);
 const w2=await waterCtl.api.getWater({now:waterCtl.now});
 assert.equal(waterCtl.calls.water,1);
 assert.equal(w2.stations.HDA004.status,'missing');
 assert.equal(w2.stations.HDA004.levelMsl,null);
 assert.equal(w2.stations.HDA004.risk,'unassessed');
 assert.equal(w2.stations.S5.status,'missing');
});

test('weather 432x40 copy distinguishes source/model from alarm and hides unpopulated FE/UV',()=>{
 const html=fs.readFileSync(path.join(ROOT,'v2/weather.html'),'utf8');
 const js=fs.readFileSync(path.join(ROOT,'v2/weather-live.js'),'utf8');
 assert.doesNotMatch(html,/FE\s*—|UV\s*—|class="bang"/);
 assert.match(html,/forecast-label/);
 assert.match(html,/aria-label="คำแนะนำการเฝ้าระวังเบื้องต้นจากแบบจำลอง Open-Meteo ไม่ใช่ประกาศเตือนภัยอย่างเป็นทางการ"/);
 assert.match(html,/Heat Index: คำนวณ/);
 assert.match(js,/forecast\.status|f\.status==='model_forecast'/);
 const advisory=fs.readFileSync(path.join(ROOT,'v2/weather-advisories.js'),'utf8');
 assert.match(js,/UthWeatherAdvisories\.evaluate\(weather,f,hi\)/);
 assert.match(advisory,/พยากรณ์ไม่พร้อม/);
 assert.match(advisory,/แบบจำลอง/);
 assert.match(js,/ข้อมูลจากแบบจำลองสภาพอากาศ ไม่ใช่ประกาศเตือนภัยทางการ/);
 assert.doesNotMatch(js,/พยากรณ์แบบจำลอง/);
});

test('weather/PM preview provenance must never claim live readings are mock samples',()=>{
 const page=fs.readFileSync(path.join(ROOT,'v2/index.html'),'utf8');
 assert.doesNotMatch(page,/PM2\.5 และ Weather เป็นค่าจำลองเพื่อรีวิวดีไซน์/);
 assert.match(page,/GISTDA ระดับตำบล/);
 assert.match(page,/อุณหภูมิและพยากรณ์ฝนมาจากแบบจำลอง Open-Meteo/);
 assert.match(page,/สถานีอ้างอิง ThaiWater\/HII/);
});

test('day/night weather icons classify WMO thunder rain fog and reject fake sunshine',()=>{
 const source=fs.readFileSync(path.join(ROOT,'v2/weather-conditions.js'),'utf8');
 const ctx=vm.createContext({window:{},Number});
 vm.runInContext(source,ctx);
 const fn=ctx.window.UthWeatherConditions.classify;
 assert.equal(fn(0,true),'sun'); assert.equal(fn(0,false),'moon');
 assert.equal(fn(1,true),'partly');assert.equal(fn(2,false),'moon-partly');
 assert.equal(fn(2,null),'cloud');assert.equal(fn(0,undefined),'cloud');
 assert.equal(fn(3,false),'cloud');assert.equal(fn(45,false),'fog');assert.equal(fn(48,true),'fog');
 assert.equal(fn(51,false),'rain');assert.equal(fn(61,true),'rain');
 assert.equal(fn(80,false),'rain');assert.equal(fn(95,false),'storm');
 assert.equal(fn(99,true),'storm');assert.equal(fn(71,false),'snow');
 assert.equal(fn(null,false),'unknown');assert.equal(fn(999,true),'unknown');
});
test('weather scene supports night/moon, fog layers, rain, thunder bolts and reduced motion',()=>{
 const markup=fs.readFileSync(path.join(ROOT,'v2/weather.html'),'utf8');
 const logic=fs.readFileSync(path.join(ROOT,'v2/weather-live.js'),'utf8');
 assert.match(markup,/symbol id="moon"/);
 assert.match(markup,/symbol id="moon-partly"/);
 assert.match(markup,/symbol id="fog"/);
 assert.match(markup,/class="fog-band"/);
 assert.match(markup,/uth-fog-drift/);
 assert.match(markup,/lightningFlicker/);
 assert.match(markup,/rainTravel/);
 assert.match(markup,/prefers-reduced-motion:reduce/);
 assert.match(markup,/weather-conditions.js/);
 assert.match(logic,/weatherIcon\(forecast.weatherCode,forecast.isDay\)/);
 assert.match(logic,/weatherIcon\(weather.weatherCode,weather.isDay\)/);
 assert.match(logic,/createSVG\('unknown'\)/);
});
test('Open-Meteo forecast contract requests sunrise/sunset and current is_day',()=>{
 assert.match(SOURCE,/current:'wind_speed_10m,is_day'/);
 assert.match(SOURCE,/daily:'sunrise,sunset'/);
 assert.match(SOURCE,/const isDay=validSolar\?raw>=rise&&raw<set:null/);
 assert.match(SOURCE,/cur.is_day===1\|\|cur.is_day===0/);
});
test('water station stack fits inside the 40px LED with breathing room',()=>{
 const html=fs.readFileSync(path.join(ROOT,'v2/index.html'),'utf8');
 assert.match(html,/#water \.water-fig \.name\{line-height:7px;transform:translateY\(2px\)\}/);
 assert.match(html,/#water \.water-fig \.num\{line-height:18px\}/);
 assert.match(html,/#water \.water-fig \.observed\{line-height:7px;transform:translateY\(-2px\)/);
});

test('Open-Meteo source is_day and future hourly sunrise/sunset per date are applied',async()=>{
 const ctl=bootCtl();const d=await ctl.api.getLive({now:ctl.now});
 assert.equal(d.weather.isDay,false);
 assert.equal(d.forecast.status,'model_forecast');
 assert.equal(d.forecast.hours.length,5);
 for(const hour of d.forecast.hours){
  const shouldBeDay=hour.time>='06:00'&&hour.time<'18:00';
  assert.equal(hour.isDay,shouldBeDay, 'hour '+hour.time+' uses per-date sunrise/sunset');
 }
});

test('every classified weather scene has an actual SVG symbol for day and night',()=>{
 const html=fs.readFileSync(path.join(ROOT,'v2/weather.html'),'utf8');
 const symbols=['sun','moon','partly','moon-partly','cloud','fog','rain','storm','snow','unknown'];
 for(const x of symbols){assert.match(html,new RegExp('<symbol id="'+x+'"'),x+' icon must not be blank');}
});

test('Rain percentages are labeled as hourly precipitation probability with color-matched Thai copy',()=>{
 const html=fs.readFileSync(path.join(ROOT,'v2/weather.html'),'utf8');
 const js=fs.readFileSync(path.join(ROOT,'v2/weather-live.js'),'utf8');
 assert.match(html,/id="current-weather-label"[^>]*>โอกาสฝน<\/div>/);
 assert.match(html,/role="group" aria-label="โอกาสฝนตกรายชั่วโมง หน่วยเปอร์เซ็นต์ จากพยากรณ์ Open-Meteo"/);
 assert.match(html,/ตัวเลข % ใต้แต่ละชั่วโมง คือโอกาสที่ฝนจะตกในช่วงเวลานั้น ไม่ใช่ปริมาณฝน/);
 assert.match(html,/\.led \.current-info \.place\{color:#28d2ff!important/);
 assert.match(html,/\.hour \.rain-pct\{color:#28d2ff/);
 assert.match(js,/\$\('\.place'\)\.textContent='โอกาสฝน'/);
 assert.match(js,/โอกาสฝนตก.*พยากรณ์ Open-Meteo/);
 assert.match(js,/ไม่มีข้อมูลโอกาสฝนตกสำหรับช่วงเวลานี้/);
 assert.match(js,/showSource\('Open-Meteo/);
});

test('PM 84% weather cell explicitly labels relative humidity and keeps unknown unavailable',()=>{
 const html=fs.readFileSync(path.join(ROOT,'v2/index.html'),'utf8');
 const js=fs.readFileSync(path.join(ROOT,'v2/live-widgets.js'),'utf8');
 assert.match(html,/class="climate-humidity-label">ความชื้น<\/span>/);
 assert.match(html,/title="ความชื้นสัมพัทธ์ \(Relative Humidity\) หน่วยเปอร์เซ็นต์"/);
 assert.match(html,/จากแบบจำลอง Open-Meteo แยกจากค่าฝุ่น PM2\.5/);
 assert.match(html,/#pm \.climate \.climate-humidity-value\{font-size:9px;line-height:10px/);
 assert.match(js,/const humidity=\$\('\.climate-humidity-value'\)/);
 assert.match(js,/NUM\(w\.humidityPct\)\?Math\.round\(w\.humidityPct\)\+'%'/);
 assert.match(js,/temperature\.textContent='—';humidity\.textContent='—';wind\.textContent='ลม —'/);
});

test('golden 3D-gloss night crescent, including partly cloudy, replaces silver gradient',()=>{
 const html=fs.readFileSync(path.join(ROOT,'v2/weather.html'),'utf8');
 assert.match(html,/<radialGradient id="moonBody"[^>]*>[\s\S]*?stop-color="#ffc638"/);
 assert.match(html,/class="moon-gold-body"/);
 assert.match(html,/class="moon-gold-glint"/);
 assert.match(html,/<symbol id="moon-partly"[^>]*>[\s\S]*?<use href="#moon"/);
 assert.match(html,/@keyframes uth-luxury-moon-float/);
 assert.match(html,/@keyframes uth-luxury-moon-glint/);
 assert.match(html,/prefers-reduced-motion:reduce/);
});
test('premium icon foreground crosses INTERNAL dividers without losing critical text',()=>{
 const pm=fs.readFileSync(path.join(ROOT,'v2/index.html'),'utf8');
 const wx=fs.readFileSync(path.join(ROOT,'v2/weather.html'),'utf8');
 assert.match(pm,/#pm \.pm-core\{padding-left:11px!important;overflow:visible!important/);
 assert.match(pm,/#pm \.mascot\{z-index:55!important;overflow:visible!important/);
 assert.match(pm,/#water \.water-station \.gate\{z-index:48!important;overflow:visible!important/);
 assert.match(pm,/#water \.water-fig,#water \.trend\{position:relative;z-index:52\}/);
 assert.match(wx,/\.led \.current\{overflow:visible!important;z-index:28!important/);
 assert.match(wx,/\.led \.hour\{overflow:visible!important;isolation:auto!important/);
 assert.match(wx,/width:29px!important;height:18px!important;scale:1\.12/);
 assert.match(wx,/\.led \.hour \.t,\.led \.hour \.rain-pct\{position:relative;z-index:47\}/);
 assert.match(pm,/width:432px;height:40px/);
 assert.match(wx,/width:432px;height:40px/);
});

test('PM units avoid optical overlap with long numeric values after centering',()=>{
 const pm=fs.readFileSync(path.join(ROOT,'v2/index.html'),'utf8');
 assert.match(pm,/#pm \.pm-unit\{left:auto!important;right:2px!important;top:2px!important/);
 assert.match(pm,/#pm \.pm-core\{padding-left:11px!important/);
});

test('HII water client consumes centrally cached public station feed, not a direct rate-limited browser request',async()=>{
 const c=bootCtl();const w=await c.api.getWater({now:c.now});
 assert.equal(w.stations.HDA004.status,'ok');
 assert.equal(c.calls.waterReferrer,null);
 assert.equal(c.calls.waterUrl,'https://raw.githubusercontent.com/aase7en/webapp-widget/water-data/water.json');
 await c.api.getLive({now:c.now});
 assert.equal(c.calls.openMeteoReferrer,null);
 const bad=bootCtl();bad.state.waterFails=true;
 const failed=await bad.api.getWater({now:bad.now});
 assert.equal(failed.stations.HDA004.status,'missing');
 assert.equal(failed.stations.HDA004.levelMsl,null);
 assert.equal(failed.stations.HDA004.risk,'unassessed');
});
