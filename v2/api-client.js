/* Static GitHub Pages client: read-only and fail-closed. No proxy, synthetic values,
   user-provided URLs, or station conversions.
   Cache policy (review fix 2026-10-21):
   - Success TTL fast path: live 180 s, water 240 s.
   - A FAILED fetch is never cached for the success TTL: retry is allowed after
     RETRY_AFTER_FAIL (45 s); inside that window the previous last-known-good is
     served, revalidated against each channel's own observedAt/timestamp
     (never generatedAt). Channels that outlived STALE_KEEP are demoted to
     unavailable/missing — stale data is never shown as current, and null is
     never turned into 0. With no prior success, the failure shape (unavailable/
     missing) is served until the retry window opens. In-flight requests are
     de-duplicated in both directions. */
(function(root){
'use strict';
const API='https://raw.githubusercontent.com/aase7en/webapp-widget/water-data/water.json';
const FORECAST='https://api.open-meteo.com/v1/forecast';
const BKK_MS=7*60*60*1000;
const stations={HDA004:471583,S5:2607};
const localHistory={HDA004:[],S5:[]};
const LIVE_TTL_MS=180000,WATER_TTL_MS=240000,RETRY_AFTER_FAIL_MS=45000,STALE_KEEP_MS=3*3600000;
const cache={live:null,water:null,liveAt:0,waterAt:0,
 liveFail:null,waterFail:null,liveFailAt:0,waterFailAt:0,
 liveFcFrom:0,waterStamps:null,
 livePending:null,waterPending:null};
const realNow=()=>Date.now();
const finite=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
const text=(v,n)=>typeof v==='string'?v.slice(0,n):null;
function freshBy(iso,tnow,maxAge){
 if(typeof iso!=='string')return false;
 const ms=Date.parse(iso);
 return Number.isFinite(ms)&&ms<=tnow+5*60000&&tnow-ms<=maxAge;
}
async function fetchJson(url,timeoutMs,tnow){
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeoutMs);
 try{const res=await fetch(url,{cache:'no-store',signal:ctl.signal});
  if(!res.ok)throw Error('source unavailable');return await res.json();
 }finally{clearTimeout(timer)}
}
function unavailableLive(){
 return {location:{id:'uthai'},pm25:{status:'unavailable'},weather:{status:'unavailable'},forecast:{status:'unavailable',hours:[]}};
}
/* Serve a possibly-aged last-known-good snapshot honestly: keep only channels whose
   own observation timestamps are still inside the freshness window; demote the rest.
   ObservedAt values are copied verbatim — nothing is re-labeled or extended. */
function revalidateLive(src,tnow){
 const out={location:src.location,pm25:src.pm25,weather:src.weather,forecast:src.forecast};
 if(out.pm25.status==='latest'&&!freshBy(out.pm25.observedAt,tnow,STALE_KEEP_MS))
  out.pm25={status:'unavailable'};
 if(out.weather.status==='model_latest'&&!freshBy(out.weather.observedAt,tnow,STALE_KEEP_MS))
  out.weather={status:'unavailable'};
 if(out.forecast.status==='model_forecast'&&cache.liveFcFrom&&tnow>cache.liveFcFrom)
  out.forecast={status:'unavailable',hours:[]};
 return out;
}
function revalidateWater(src,tnow){
 const out={source:src.source,stations:{}};
 for(const code of Object.keys(stations)){
  const s=src.stations[code];
  if(s&&s.status==='ok'&&(!cache.waterStamps||tnow-cache.waterStamps[code]>STALE_KEEP_MS)){
   const aged=missing(code);aged.bankM=s.bankM;aged.groundMsl=s.groundMsl;
   out.stations[code]=aged;
  }else out.stations[code]=s;
 }
 return out;
}
async function live(opts){
 const tnow=opts&&typeof opts.now==='function'?opts.now():realNow();
 if(cache.live&&tnow-cache.liveAt<LIVE_TTL_MS)return revalidateLive(cache.live,tnow);
 if(cache.livePending)return cache.livePending;
 if(cache.liveFailAt&&tnow-cache.liveFailAt<RETRY_AFTER_FAIL_MS&&tnow-cache.liveAt>=LIVE_TTL_MS)
  return cache.live?revalidateLive(cache.live,tnow):cache.liveFail;
 cache.livePending=(async()=>{
  const out=unavailableLive();let fcFrom=0;
  try{
   // This is the repository's existing canonical fixed endpoint, including the
   // tested one-shot JSONP fallback for CORS failures.
   const D=root.UthaiLEDRotation;
   if(!D||typeof D.requestBackendData!=='function')throw Error('no trusted backend');
   const response=await D.requestBackendData(root.fetch.bind(root),tnow,{timeoutMs:12000});
   if(!response.ok||!response.raw)throw Error('backend unavailable');
   const payload=response.raw,loc=payload.location||{};
   if(loc.id!=='uthai'||!finite(loc.lat,14,15)||!finite(loc.lon,100,101))throw Error('wrong locality');
   out.location={id:'uthai',lat:loc.lat,lon:loc.lon};
   const pm=payload.pm25||{};
   if(pm.status==='ok'&&finite(pm.value,0,1000)&&pm.unit==='µg/m³'&&freshBy(pm.observedAt,tnow,STALE_KEEP_MS)){
    out.pm25={status:'latest',value:pm.value,observedAt:pm.observedAt,source:text(pm.source,240),unit:pm.unit};
   }
   const w=payload.weather||{};
   if(w.status==='ok'&&finite(w.temperatureC,-40,65)&&finite(w.humidityPct,0,100)&&freshBy(w.observedAt,tnow,STALE_KEEP_MS)){
    out.weather={status:'model_latest',temperatureC:w.temperatureC,humidityPct:w.humidityPct,
     weatherCode:Number.isInteger(w.weatherCode)?w.weatherCode:null,
     observedAt:w.observedAt,source:text(w.source,240),windKmh:null};
   }
   // Hourly forecast is a separate MODEL source; its failure cannot invalidate PM.
   try{
    const q=new URLSearchParams({latitude:String(loc.lat),longitude:String(loc.lon),
     current:'wind_speed_10m,is_day',hourly:'temperature_2m,precipitation_probability,weather_code',
     daily:'sunrise,sunset',forecast_days:'2',timezone:'Asia/Bangkok'});
    const f=await fetchJson(FORECAST+'?'+q.toString(),12000,tnow);
    const hourly=f&&f.hourly?f.hourly:null;
    if(f&&f.timezone==='Asia/Bangkok'&&hourly&&Array.isArray(hourly.time)){
     const next=new Date(Math.floor((tnow+BKK_MS)/3600000)*3600000+3600000-BKK_MS);
     const hours=[];let firstSlot=0;
     for(let i=0;i<hourly.time.length;i++){
      const raw=hourly.time[i];if(typeof raw!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(raw))continue;
      const when=Date.parse(raw+'+07:00');if(!Number.isFinite(when)||when<next.getTime())continue;
      const codeArray=hourly.weather_code||[],rainArray=hourly.precipitation_probability||[];
      const code=codeArray[i],rain=rainArray[i],daily=f.daily||{};
      const days=Array.isArray(daily.time)?daily.time:[];
      const dayIndex=days.indexOf(raw.slice(0,10));
      const rise=dayIndex>=0&&Array.isArray(daily.sunrise)?daily.sunrise[dayIndex]:null;
      const set=dayIndex>=0&&Array.isArray(daily.sunset)?daily.sunset[dayIndex]:null;
      // Do not infer sunlight from wall-clock hour. The location-specific
      // sunrise/sunset is model data; unknown remains null (no sun icon).
      const validSolar=typeof rise==='string'&&typeof set==='string'&&
       /^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(rise)&&
       /^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(set)&&rise<set;
      const isDay=validSolar?raw>=rise&&raw<set:null;
      hours.push({time:raw.slice(-5),weatherCode:Number.isInteger(code)?code:null,
       rainProbabilityPct:finite(rain,0,100)?rain:null,isDay:isDay});
      if(!firstSlot)firstSlot=when;
      if(hours.length===5)break;
     }
     if(hours.length===5){out.forecast={status:'model_forecast',hours,source:'Open-Meteo forecast model'};fcFrom=firstSlot;}
     const cur=f.current?f.current:null;
     const wSpeed=cur?cur.wind_speed_10m:undefined;
     if(out.weather.status==='model_latest')
      out.weather.isDay=cur&&(cur.is_day===1||cur.is_day===0)?cur.is_day===1:null;
     if(out.weather.status==='model_latest'&&finite(wSpeed,0,300))
      out.weather.windKmh=wSpeed;
    }
   }catch{ /* A missing forecast is UNAVAILABLE, never a fabricated five-hour model. */ }
   cache.live=out;cache.liveAt=tnow;cache.liveFailAt=0;cache.liveFail=null;cache.liveFcFrom=fcFrom;
   return out;
  }catch{
   /* Upstream failure: remember WHEN it failed so the retry window (not the
      success TTL) governs the next attempt; keep the last-known-good for
      honest revalidated display. */
   cache.liveFailAt=tnow;cache.liveFail=out;
   return cache.live?revalidateLive(cache.live,tnow):out;
  }
 })().finally(()=>cache.livePending=null);
 return cache.livePending;
}
const missing=(code)=>({stationId:stations[code],status:'missing',levelMsl:null,
 observedTimeTH:null,bankM:null,groundMsl:null,deltaM:null,trendPoints:[],risk:'unassessed'});
function numeric(raw,lo,hi){
 const n=typeof raw==='number'?raw:typeof raw==='string'&&/^[-+]?\d+(\.\d+)?$/.test(raw.trim())?Number(raw):NaN;
 return finite(n,lo,hi)?n:null;
}
function parsedStation(r,code,tnow){
 const s=missing(code);
 const rst=r?r.station:null;
 if(!r||!rst||rst.id!==stations[code])return s;
 const level=numeric(r.waterlevel_msl,-50,200);
 const bank=numeric(rst.min_bank,-50,200);
 const ground=numeric(rst.ground_level,-100,200);
 const obs=r.waterlevel_datetime;
 if(bank!==null&&ground!==null&&ground<bank){s.bankM=bank;s.groundMsl=ground;}
 if(level===null||typeof obs!=='string'||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(obs))return s;
 const stamp=Date.parse(obs.replace(' ','T')+ '+07:00');
 if(!Number.isFinite(stamp))return s;
 const age=tnow-stamp;
 if(age>STALE_KEEP_MS||age<-(2*60000))return s;
 s.status='ok';s.levelMsl=level;s.observedTimeTH=obs.slice(8,10)+'/'+obs.slice(5,7)+' '+obs.slice(11);
 if(bank!==null){
  s.risk=level>=bank?'critical':level>=bank-.50?'watch':'below_watch';
  s.watchLevelMsl=Number((bank-.50).toFixed(2));s.criticalLevelMsl=bank;
 }
 const samples=localHistory[code];
 const last=samples[samples.length-1];
 if(!samples.length||last.timestamp!==stamp){
  samples.push({timestamp:stamp,level});if(samples.length>30)samples.shift();
 }
 if(samples.length>=2){
  const a=samples[samples.length-1],b=samples[samples.length-2];
  s.deltaM=Number((a.level-b.level).toFixed(2));
  s.trendPoints=samples.map(v=>v.level);
 }
 return s;
}
async function water(opts){
 const tnow=opts&&typeof opts.now==='function'?opts.now():realNow();
 if(cache.water&&tnow-cache.waterAt<WATER_TTL_MS)return revalidateWater(cache.water,tnow);
 if(cache.waterPending)return cache.waterPending;
 if(cache.waterFailAt&&tnow-cache.waterFailAt<RETRY_AFTER_FAIL_MS&&tnow-cache.waterAt>=WATER_TTL_MS)
  return cache.water?revalidateWater(cache.water,tnow):cache.waterFail;
 cache.waterPending=(async()=>{
  const result={source:'ThaiWater/HII waterlevel_load · station references, not Uthai Hospital gauge',
   stations:{HDA004:missing('HDA004'),S5:missing('S5')}};
  const stamps={HDA004:0,S5:0};
  try{
   // One central, time-validated low-rate ThaiWater snapshot. GitHub raw CORS *;
   // source waterlevel_datetime (not commit time) controls freshness.
   const data=await fetchJson(API,15000,tnow);
   const wd=data?data.waterlevel_data:null;
   if(!wd||wd.result!=='OK'||!Array.isArray(wd.data))throw Error('bad data');
   const ids=new Set(Object.values(stations));
   const rows=wd.data.filter(function(r){const st=r?r.station:null;return st&&ids.has(st.id)});
   for(const pair of Object.entries(stations)){
    const code=pair[0],id=pair[1];
    const hit=rows.find(function(r){const st=r?r.station:null;return st&&st.id===id});
    const parsed=parsedStation(hit,code,tnow);
    if(parsed.status==='ok'){
     const obs=hit.waterlevel_datetime;
     stamps[code]=Date.parse(obs.replace(' ','T')+'+07:00');
    }
    result.stations[code]=parsed;
   }
   cache.water=result;cache.waterAt=tnow;cache.waterStamps=stamps;
   cache.waterFailAt=0;cache.waterFail=null;
   return result;
  }catch{
   /* Unavailable must never be treated as zero, safe or flood. */
   cache.waterFailAt=tnow;cache.waterFail=result;
   return cache.water?revalidateWater(cache.water,tnow):result;
  }
 })().finally(()=>cache.waterPending=null);
 return cache.waterPending;
}
root.UthApiClient={getLive:live,getWater:water,
 CACHE_POLICY:{liveTtlMs:LIVE_TTL_MS,waterTtlMs:WATER_TTL_MS,retryAfterFailMs:RETRY_AFTER_FAIL_MS,staleKeepMs:STALE_KEEP_MS}};
})(window);
