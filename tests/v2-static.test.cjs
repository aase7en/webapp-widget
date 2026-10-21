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
 const calls={backend:0,openMeteo:0,water:0};
 const state={backendFails:false,waterFails:false,omFails:false,backendDelayMs:0,pm:23.1};
 const iso=(ageMin)=>new Date(t-ageMin*60000).toISOString();
 const forecastFor=()=>{
  const hourly=[];
  for(let h=1;h<=8;h++){
   const d=new Date(Math.floor((t+7*3600000)/3600000)*3600000+h*3600000-7*3600000);
   hourly.push(bangkokStamp(d).replace(' ','T'));
  }
  return {timezone:'Asia/Bangkok',hourly:{time:hourly,weather_code:hourly.map(()=>61),
   precipitation_probability:hourly.map(()=>35)},current:{wind_speed_10m:12}};
 };
 const dataFor=()=>({location:{id:'uthai',lat:14.36147,lon:100.64424},
  pm25:{status:'ok',unit:'µg/m³',value:state.pm,observedAt:iso(20),source:'GISTDA Uthai'},
  weather:{status:'ok',temperatureC:29,humidityPct:81,weatherCode:53,observedAt:iso(20),source:'Open-Meteo model'}});
 const waterFor=()=>({waterlevel_data:{result:'OK',data:[
  {station:{id:471583,min_bank:3.03,ground_level:0.227},waterlevel_datetime:bangkokStamp(new Date(t-20*60000)),waterlevel_msl:2.87},
  {station:{id:2607,min_bank:4.70,ground_level:-8.59},waterlevel_datetime:bangkokStamp(new Date(t-20*60000)),waterlevel_msl:3.15}
 ]}});
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const window={fetch:async(url)=>{
   if(url.includes('open-meteo')){calls.openMeteo++;if(state.omFails)throw Error('net');return{ok:true,json:async()=>forecastFor()}}
   calls.water++;if(state.waterFails)throw Error('net');return{ok:true,json:async()=>waterFor()}
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
 assert.equal(p.liveTtlMs,180000);assert.equal(p.waterTtlMs,240000);
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
 ctl.advance(300000);                            // past water success TTL
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
