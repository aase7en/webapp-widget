/* Static GitHub Pages client: read-only and fail-closed. No proxy, synthetic values,
   user-provided URLs, or station conversions. */
(function(root){
'use strict';
const API='https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load';
const FORECAST='https://api.open-meteo.com/v1/forecast';
const BKK_MS=7*60*60*1000;
const stations={HDA004:471583,S5:2607};
const localHistory={HDA004:[],S5:[]};
const cache={live:null,water:null,liveAt:0,waterAt:0,livePending:null,waterPending:null};
const now=()=>Date.now();
const finite=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
const text=(v,n)=>typeof v==='string'?v.slice(0,n):null;
function fresh(iso,maxAge=3*3600000){
 if(typeof iso!=='string')return false;
 const ms=Date.parse(iso);
 return Number.isFinite(ms)&&ms<=now()+5*60000&&now()-ms<=maxAge;
}
async function fetchJson(url,timeoutMs=12000){
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeoutMs);
 try{const res=await fetch(url,{cache:'no-store',signal:ctl.signal});
  if(!res.ok)throw Error('source unavailable');return await res.json();
 }finally{clearTimeout(timer)}
}
function unavailableLive(){
 return {location:{id:'uthai'},pm25:{status:'unavailable'},weather:{status:'unavailable'},forecast:{status:'unavailable',hours:[]}};
}
async function live(){
 if(cache.live&&now()-cache.liveAt<180000)return cache.live;
 if(cache.livePending)return cache.livePending;
 cache.livePending=(async()=>{
  const out=unavailableLive();
  try{
   // This is the repository's existing canonical fixed endpoint, including the
   // tested one-shot JSONP fallback for CORS failures.
   const D=root.UthaiLEDRotation;
   if(!D||typeof D.requestBackendData!=='function')throw Error('no trusted backend');
   const response=await D.requestBackendData(root.fetch.bind(root),now(),{timeoutMs:12000});
   if(!response.ok||!response.raw)throw Error('backend unavailable');
   const payload=response.raw,loc=payload.location||{};
   if(loc.id!=='uthai'||!finite(loc.lat,14,15)||!finite(loc.lon,100,101))throw Error('wrong locality');
   out.location={id:'uthai',lat:loc.lat,lon:loc.lon};
   const pm=payload.pm25||{};
   if(pm.status==='ok'&&finite(pm.value,0,1000)&&pm.unit==='µg/m³'&&fresh(pm.observedAt)){
    out.pm25={status:'latest',value:pm.value,observedAt:pm.observedAt,source:text(pm.source,240),unit:pm.unit};
   }
   const w=payload.weather||{};
   if(w.status==='ok'&&finite(w.temperatureC,-40,65)&&finite(w.humidityPct,0,100)&&fresh(w.observedAt)){
    out.weather={status:'model_latest',temperatureC:w.temperatureC,humidityPct:w.humidityPct,
     weatherCode:Number.isInteger(w.weatherCode)?w.weatherCode:null,
     observedAt:w.observedAt,source:text(w.source,240),windKmh:null};
   }
   // Hourly forecast is a separate MODEL source; its failure cannot invalidate PM.
   try{
    const q=new URLSearchParams({latitude:String(loc.lat),longitude:String(loc.lon),
     current:'wind_speed_10m',hourly:'temperature_2m,precipitation_probability,weather_code',
     forecast_days:'2',timezone:'Asia/Bangkok'});
    const f=await fetchJson(FORECAST+'?'+q.toString(),12000);
    if(f.timezone==='Asia/Bangkok'&&Array.isArray(f.hourly?.time)){
     const next=new Date(Math.floor((now()+BKK_MS)/3600000)*3600000+3600000-BKK_MS);
     const hours=[];
     for(let i=0;i<f.hourly.time.length;i++){
      const raw=f.hourly.time[i];if(typeof raw!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(raw))continue;
      const when=Date.parse(raw+'+07:00');if(!Number.isFinite(when)||when<next.getTime())continue;
      const code=f.hourly.weather_code?.[i],rain=f.hourly.precipitation_probability?.[i];
      hours.push({time:raw.slice(-5),weatherCode:Number.isInteger(code)?code:null,
       rainProbabilityPct:finite(rain,0,100)?rain:null});
      if(hours.length===5)break;
     }
     if(hours.length===5)out.forecast={status:'model_forecast',hours,source:'Open-Meteo forecast model'};
     const wSpeed=f.current?.wind_speed_10m;
     if(out.weather.status==='model_latest'&&finite(wSpeed,0,300))
      out.weather.windKmh=wSpeed;
    }
   }catch{ /* A missing forecast is UNAVAILABLE, never a fabricated five-hour model. */ }
  }catch{ /* Upstream failure leaves each channel UNAVAILABLE. */ }
  cache.live=out;cache.liveAt=now();return out;
 })().finally(()=>cache.livePending=null);
 return cache.livePending;
}
const missing=(code)=>({stationId:stations[code],status:'missing',levelMsl:null,
 observedTimeTH:null,bankM:null,groundMsl:null,deltaM:null,trendPoints:[],risk:'unassessed'});
function numeric(raw,lo,hi){
 const n=typeof raw==='number'?raw:typeof raw==='string'&&/^[-+]?\d+(\.\d+)?$/.test(raw.trim())?Number(raw):NaN;
 return finite(n,lo,hi)?n:null;
}
function parsedStation(r,code){
 const s=missing(code);
 if(!r||r.station?.id!==stations[code])return s;
 const level=numeric(r.waterlevel_msl,-50,200);
 const bank=numeric(r.station?.min_bank,-50,200);
 const ground=numeric(r.station?.ground_level,-100,200);
 const obs=r.waterlevel_datetime;
 if(bank!==null&&ground!==null&&ground<bank){s.bankM=bank;s.groundMsl=ground;}
 if(level===null||typeof obs!=='string'||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(obs))return s;
 const stamp=Date.parse(obs.replace(' ','T')+ '+07:00');
 if(!Number.isFinite(stamp))return s;
 const age=now()-stamp;
 if(age>3*3600000||age<-(2*60000))return s;
 s.status='ok';s.levelMsl=level;s.observedTimeTH=obs.slice(8,10)+'/'+obs.slice(5,7)+' '+obs.slice(11);
 if(bank!==null){
  s.risk=level>=bank?'critical':level>=bank-.50?'watch':'below_watch';
  s.watchLevelMsl=Number((bank-.50).toFixed(2));s.criticalLevelMsl=bank;
 }
 const samples=localHistory[code];
 if(!samples.length||samples.at(-1).timestamp!==stamp){
  samples.push({timestamp:stamp,level});if(samples.length>30)samples.shift();
 }
 if(samples.length>=2){
  s.deltaM=Number((samples.at(-1).level-samples.at(-2).level).toFixed(2));
  s.trendPoints=samples.map(v=>v.level);
 }
 return s;
}
async function water(){
 if(cache.water&&now()-cache.waterAt<240000)return cache.water;
 if(cache.waterPending)return cache.waterPending;
 cache.waterPending=(async()=>{
  const result={source:'ThaiWater/HII waterlevel_load · station references, not Uthai Hospital gauge',
   stations:{HDA004:missing('HDA004'),S5:missing('S5')}};
  try{
   const data=await fetchJson(API,15000);
   if(data?.waterlevel_data?.result!=='OK'||!Array.isArray(data.waterlevel_data.data))throw Error('bad data');
   const ids=new Set(Object.values(stations));
   const rows=data.waterlevel_data.data.filter(r=>ids.has(r?.station?.id));
   for(const [code,id] of Object.entries(stations)){
    const hit=rows.find(r=>r?.station?.id===id);
    result.stations[code]=parsedStation(hit,code);
   }
  }catch{ /* Unavailable must never be treated as zero, safe or flood. */ }
  cache.water=result;cache.waterAt=now();return result;
 })().finally(()=>cache.waterPending=null);
 return cache.waterPending;
}
root.UthApiClient={getLive:live,getWater:water};
})(window);
