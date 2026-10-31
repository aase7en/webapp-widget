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
const SHEET_WATER='https://script.google.com/macros/s/AKfycbwwUQCeJoz4N0P9UuRJF39pt17mBjPz0_yMDDxTO7BoiUiTQaO7Yay0UKq80EvE6dk/exec?action=water_history';
const SHEET_SNAPSHOT='https://script.google.com/macros/s/AKfycbwwUQCeJoz4N0P9UuRJF39pt17mBjPz0_yMDDxTO7BoiUiTQaO7Yay0UKq80EvE6dk/exec?action=snapshot_v1';
const BKK_MS=7*60*60*1000;
const stations={HDA004:471583,S5:2607};
const LIVE_TTL_MS=180000,WATER_TTL_MS=15*60000,RETRY_AFTER_FAIL_MS=45000,STALE_KEEP_MS=3*3600000;
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
   out.stations[code]={...s,status:'historical',risk:'unassessed'};
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
   // Read only the fixed, owner-bound Sheet snapshot. No direct provider fallback.
   const snapshot=await sheetsJsonp(12000,SHEET_SNAPSHOT);
   if(!snapshot||snapshot.schema!==1||!snapshot.location||!snapshot.channels)throw Error('snapshot unavailable');
   const channels=snapshot.channels;
   const channel=name=>{const c=channels[name];return c&&freshBy(c.observedAt,tnow,STALE_KEEP_MS)&&freshBy(c.savedAt,tnow,STALE_KEEP_MS)&&c.data&&typeof c.data==='object'?c.data:null};
   const payload={location:snapshot.location,pm25:channel('pm25'),weather:channel('weather')},loc=payload.location;
   if(loc.id!=='uthai'||!finite(loc.lat,14,15)||!finite(loc.lon,100,101))throw Error('wrong locality');
   out.location={id:'uthai',lat:loc.lat,lon:loc.lon};
   const pm=payload.pm25||{};
   if(pm.status==='ok'&&finite(pm.value,0,1000)&&pm.unit==='µg/m³'&&freshBy(pm.observedAt,tnow,STALE_KEEP_MS)){
    // 2026 option A: pass the 24h average + backend band through the strict
    // whitelist. avg24h invalid -> null (never 0); consumers fail closed to
    // grey. The big number remains the hourly value.
    const band=['very_good','good','moderate','unhealthy_sensitive','unhealthy'].includes(pm.band)?pm.band:null;
    out.pm25={status:'latest',value:pm.value,avg24h:finite(pm.avg24h,0,1000)?pm.avg24h:null,band,
     observedAt:pm.observedAt,source:text(pm.source,240),unit:pm.unit};
   }
   const w=payload.weather||{};
   if(w.status==='ok'&&finite(w.temperatureC,-40,65)&&finite(w.humidityPct,0,100)&&freshBy(w.observedAt,tnow,STALE_KEEP_MS)){
    out.weather={status:'model_latest',temperatureC:w.temperatureC,humidityPct:w.humidityPct,
     weatherCode:Number.isInteger(w.weatherCode)?w.weatherCode:null,
     observedAt:w.observedAt,source:text(w.source,240),windKmh:null};
   }
   // Hourly forecast is a separate MODEL source; its failure cannot invalidate PM.
   try{
    const f=channel('forecast');
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
/* Read-only bound Apps Script route. This NEVER contacts HII: the upstream
   provider is fetched only by Google Apps Script's twice-daily trigger.
   JSONP handles ContentService redirects/CORS; callback id is generated here,
   and the response is strictly validated before any display. */
let sheetSeq=0;
function sheetsJsonp(timeoutMs,endpoint){
 return new Promise((resolve,reject)=>{
  if(!root.document)return reject(Error('no DOM'));
  const cb='__uthWaterHistoryCb'+Date.now().toString(36)+(sheetSeq++).toString(36);
  const script=root.document.createElement('script');let finished=false;
  const done=(error,value)=>{
   if(finished)return;finished=true;clearTimeout(timer);
   delete root[cb];script.remove();error?reject(error):resolve(value);
  };
  root[cb]=payload=>done(null,payload);
  const timer=setTimeout(()=>done(Error('sheet timeout')),timeoutMs);
  script.onerror=()=>done(Error('sheet unavailable'));
  script.src=(endpoint||SHEET_WATER)+'&callback='+cb;
  root.document.head.appendChild(script);
 });
}
function sheetWaterPayload(raw,tnow){
 if(!raw||raw.schema!==1||raw.kind!=='LAST_OBSERVATION_NOT_LIVE'||!raw.stations)
  throw Error('invalid Sheet water contract');
 const out={source:'ThaiWater/HII · Google Sheet historical snapshots; not local hospital telemetry',stations:{}};
 const stamps={};
 for(const code of Object.keys(stations)){
  const s=raw.stations[code];
  if(!s||s.stationId!==stations[code]||!['ok','historical','missing'].includes(s.status))
   throw Error('invalid water station');
  const stamp=typeof s.observedAt==='string'?Date.parse(s.observedAt):NaN;
  const validStamp=Number.isFinite(stamp)&&stamp<=tnow+120000;
  const level=numeric(s.levelMsl,-50,200);
  const bank=numeric(s.bankM,-50,200),ground=numeric(s.groundMsl,-100,200);
  const good=validStamp&&level!==null&&bank!==null&&ground!==null&&bank>ground;
  const age=tnow-stamp;
  const status=good?(age<=STALE_KEEP_MS?'ok':'historical'):'missing';
  const base=missing(code);base.status=status;
  if(bank!==null&&ground!==null&&bank>ground){base.bankM=bank;base.groundMsl=ground;}
  if(good){
   base.levelMsl=level;
   base.observedTimeTH=typeof s.observedTimeTH==='string'?s.observedTimeTH.slice(0,24):null;
   base.observedAt=s.observedAt;
   base.risk='unassessed'; // no formally approved flood thresholds
   stamps[code]=stamp;
  }
  const ts=Array.isArray(s.trendObservedAt)?s.trendObservedAt:[];
  const vals=Array.isArray(s.trendPoints)?s.trendPoints:[];
  if(vals.length===ts.length&&vals.length<=30){
   const seen=new Set(),accepted=[];
   vals.forEach((v,i)=>{
    const m=Date.parse(ts[i]),n=numeric(v,-50,200);
    if(Number.isFinite(m)&&m<=tnow+120000&&tnow-m<=14*86400000&&n!==null&&!seen.has(m)){
     seen.add(m);accepted.push({t:m,n});
    }
   });
   accepted.sort((a,b)=>a.t-b.t);
   base.trendPoints=accepted.map(v=>v.n);
   base.trendObservedAt=accepted.map(v=>new Date(v.t).toISOString());
  }
  out.stations[code]=base;
 }
 return {out,stamps};
}
async function water(opts){
 const tnow=opts&&typeof opts.now==='function'?opts.now():realNow();
 if(cache.water&&tnow-cache.waterAt<WATER_TTL_MS)return revalidateWater(cache.water,tnow);
 if(cache.waterPending)return cache.waterPending;
 if(cache.waterFailAt&&tnow-cache.waterFailAt<RETRY_AFTER_FAIL_MS&&tnow-cache.waterAt>=WATER_TTL_MS)
  return cache.water?revalidateWater(cache.water,tnow):cache.waterFail;
 cache.waterPending=(async()=>{
  const result={source:'ThaiWater/HII via canonical Google Sheet · unavailable',
   stations:{HDA004:missing('HDA004'),S5:missing('S5')}};
  const stamps={HDA004:0,S5:0};
  try{
   // Primary: owner-bound Google Sheet, never a provider network fetch.
   const sheet=sheetWaterPayload(await sheetsJsonp(9000),tnow);
   cache.water=sheet.out;cache.waterAt=tnow;cache.waterStamps=sheet.stamps;
   cache.waterFailAt=0;cache.waterFail=null;
   return sheet.out;
  }catch(_sheetError){
   /* Canonical Sheet is the ONLY operational water source.
      A provider API failure does not erase the last verified Sheet reading.
      If the Sheet endpoint itself is unreachable, preserve the verified
      in-memory snapshot with original observedAt and historical badge.
      Do NOT substitute a direct HII/GitHub feed or fabricate a new value. */
   cache.waterFailAt=tnow;cache.waterFail=result;
   return cache.water?revalidateWater(cache.water,tnow):result;
  }
 })().finally(()=>cache.waterPending=null);
 return cache.waterPending;
}
root.UthApiClient={getLive:live,getWater:water,
 CACHE_POLICY:{liveTtlMs:LIVE_TTL_MS,waterTtlMs:WATER_TTL_MS,retryAfterFailMs:RETRY_AFTER_FAIL_MS,staleKeepMs:STALE_KEEP_MS},
 validateWaterHistory:sheetWaterPayload};
})(window);
