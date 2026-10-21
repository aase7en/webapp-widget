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
