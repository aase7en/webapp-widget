/* Hospital LED data layer (v2, 2026-10-17).
 * Heat math = DERIVED weather model (NOAA), byte-for-byte the original rules:
 * green 27–32.9, yellow 33–41.9, orange 42–51.9, red >= 52 °C; below 27 is
 * NOT an official "safe" class. Every derived label carries คำนวณ.
 * Water level = UNAVAILABLE until a verified gate sensor/API is approved.
 * The page no longer calls Open-Meteo (or any upstream) directly. The ONLY
 * network request is the fixed original Apps Script exec endpoint with fixed
 * parameters (?action=data&v=1); transport = fetch (12 s timeout, redirect
 * follow, no-store) with a one-shot JSONP fallback (internally generated
 * strict callback id, never read from the page URL) for CORS-only failures.
 * Freshness authority is each channel's observedAt: missing/unparseable,
 * future > 5 min or age > 3 h renders that channel unavailable — generatedAt
 * is the response time and is NEVER used as a freshness fallback.
 * PM tier colors follow the 2026 criteria (ดีมาก ≤15 · ดี 15.1–25 · ปานกลาง
 * 25.1–37.5 · เริ่มมีผลกระทบต่อสุขภาพ 37.6–75 · มีผลต่อสุขภาพ >75 µg/m³)
 * applied to the GISTDA 24-hour average: the backend-emitted band string
 * (derived from the rounded pm25Avg24hr) is preferred; the local 2026
 * cutoffs are the fallback. A band string that disagrees with the known
 * vocabulary fails closed.
 */
(function(root){
'use strict';
const ROTATE_MS = 12000;
const REFRESH_MS = 15*60*1000;
const HEAT_FRESHNESS_MS = 3*3600000;
const FRESH_MS = HEAT_FRESHNESS_MS;
const FUTURE_MS = 5*60000;
const FETCH_TIMEOUT_MS = 12000;
const PM_UNIT = 'µg/m³';
const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbwwUQCeJoz4N0P9UuRJF39pt17mBjPz0_yMDDxTO7BoiUiTQaO7Yay0UKq80EvE6dk/exec';
const BACKEND_QUERY = '?action=data&v=1';
const finite = x => typeof x === 'number' && Number.isFinite(x);
function heatCelsius(temp, humidity){
  if(!finite(temp)||temp < -40||temp > 65||!finite(humidity)||humidity < 0||humidity > 100)return null;
  const t=temp*9/5+32;
  let hi=0.5*(t+61+1.2*(t-68)+0.094*humidity);
  hi=(hi+t)/2;
  if(hi>=80){
    hi=-42.379+2.04901523*t+10.14333127*humidity
      -0.22475541*t*humidity-0.00683783*t*t-0.05481717*humidity*humidity
      +0.00122874*t*t*humidity+0.00085282*t*humidity*humidity
      -0.00000199*t*t*humidity*humidity;
    if(humidity<13&&t>=80&&t<=112)hi-=(13-humidity)/4*Math.sqrt((17-Math.abs(t-95))/17);
    if(humidity>85&&t>=80&&t<=87)hi+=(humidity-85)/10*((87-t)/5);
  }
  const c=(hi-32)*5/9;
  return finite(c)?c:null;
}
function parseBangkokTime(v){
  if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(v))return null;
  const ms=Date.parse(v+'+07:00');
  return Number.isFinite(ms)?ms:null;
}
const HEAT_CLASSES=['heat-below','heat-watch','heat-caution','heat-danger','heat-extreme'];
// Ministry of Natural Resources and Environment / public-health impact bands:
// green 27–32.9, yellow 33–41.9, orange 42–51.9, red >= 52 °C.
// Below 27 is NOT an official green "safe" classification.
function heatSeverity(value){
  if(!finite(value))return {cls:'no-data',label:'รอข้อมูล'};
  const shown=Number(value.toFixed(1));
  if(shown>=52)return {cls:'heat-extreme',label:'อันตรายมาก · คำนวณ'};
  if(shown>=42)return {cls:'heat-danger',label:'อันตราย · คำนวณ'};
  if(shown>=33)return {cls:'heat-caution',label:'เตือนภัย · คำนวณ'};
  if(shown>=27)return {cls:'heat-watch',label:'เฝ้าระวัง · คำนวณ'};
  return {cls:'heat-below',label:'ต่ำกว่าเกณฑ์ · คำนวณ'};
}
function shortHeatLabel(v){return heatSeverity(v).label;}
function freshHeat(reading,nowMs){
  if(!reading||!finite(reading.value)||!finite(reading.time)||
      reading.type!=='DERIVED'||!finite(nowMs)||
      reading.time>nowMs+5*60000||nowMs-reading.time>HEAT_FRESHNESS_MS)return null;
  return reading;
}

/* ---------- PM band derivation (2026 thresholds, local fallback) ----------
 * Owner-validated option A (2026-10-31): color tiers come from the GISTDA
 * 24-hour average (backend band, derived from the rounded pm25Avg24hr, is
 * authoritative). These local 2026 cutoffs are the fallback only, applied to
 * the emitted avg24h when the band string is absent, else the hourly value
 * (legacy payloads). Exclusive lower bounds: ≤15 very_good, 15.1–25 good,
 * 25.1–37.5 moderate, 37.6–75 unhealthy_sensitive, >75 unhealthy — same
 * table as v2/pm25-tier.js. A band string outside the vocabulary fails
 * closed. */
const PM_BAND_CUTOFFS=[[75,'unhealthy'],[37.5,'unhealthy_sensitive'],[25,'moderate'],[15,'good']];
function pmBandKey(value){
  if(!finite(value)||value<0)return null;
  for(const cut of PM_BAND_CUTOFFS)if(value>cut[0])return cut[1];
  return 'very_good';
}
const PM_MOOD={very_good:'good',good:'moderate',moderate:'unhealthy',unhealthy_sensitive:'protective',unhealthy:'severe'};
const PM_BAND_VOCAB=['very_good','good','moderate','unhealthy_sensitive','unhealthy'];

/* ---------- multi-location + provenance (additive, canonical 2026-10-17) ----------
 * The active location is selected server-side from Google Sheet config; the
 * frontend never edits it, never accepts URL overrides, and never invents
 * names/coords. Everything here is public string/null with strict type,
 * length and scheme checks; provenance is rendered as text only (title/aria),
 * so unsafe link schemes are dropped outright (https-only, and no live links
 * are rendered at all). */
const LOCATION_PLACEHOLDER='รอข้อมูลพื้นที่';
function sanitizeText(v,maxLen){
  if(typeof v!=='string')return null;
  const t=v.trim();
  if(!t)return null;
  return t.length>maxLen?t.slice(0,maxLen):t;
}
function safeId(v){
  if(typeof v!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(v))return null;
  return v;
}
function safeLink(v){
  if(typeof v!=='string')return null;
  const t=v.trim();
  return /^https:\/\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=%-]{1,300}$/.test(t)?t:null;
}
const PROVENANCE_FIELDS=['provider','agency','service','stationId','sourceUrl','termsUrl','timeZone','unit','datum'];
function normalizeProvenance(p){
  if(!p||typeof p!=='object'||Array.isArray(p))return null;
  const out={};
  for(const f of PROVENANCE_FIELDS){
    out[f]=(f==='sourceUrl'||f==='termsUrl')?safeLink(p[f]):sanitizeText(p[f],120);
  }
  return out; /* valid object -> explicit nulls; absent/malformed -> null */
}
function normalizeLocation(l){
  const empty={id:null,label:null,lat:null,lon:null};
  if(!l||typeof l!=='object'||Array.isArray(l))return empty;
  return {
    id:safeId(l.id),
    label:sanitizeText(l.label,60),
    lat:finite(l.lat)&&l.lat>=-90&&l.lat<=90?l.lat:null,
    lon:finite(l.lon)&&l.lon>=-180&&l.lon<=180?l.lon:null,
  };
}

/* ---------- strict observation timestamps ---------- */
function parseObservedAt(v){
  if(typeof v!=='string'||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(v))return null;
  const ms=Date.parse(v);
  return Number.isFinite(ms)?ms:null;
}
function bangkokToday(nowMs){
  try{
    return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',
      year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(nowMs));
  }catch{return null;}
}
function staleTime(observedAt,nowMs){
  const t=parseObservedAt(observedAt);
  if(t===null)return false;
  if(t>nowMs+FUTURE_MS)return false;
  if(nowMs-t>FRESH_MS)return false;
  return true;
}

/* ---------- normalisation (fail closed per channel) ---------- */
function emptyState(errors){
  return {
    location:{id:null,label:null,lat:null,lon:null},
    pm:{status:'unavailable',value:null,moodKey:'unavailable',observedAt:null,source:null,provenance:null},
    weather:{status:'unavailable',tempC:null,hiC:null,code:null,rainPct:null,source:null,provenance:null},
    water:{status:'unavailable',value:null,source:null,provenance:null},
    errors:errors||[],
  };
}
function normalizePayload(raw,nowMs){
  const errors=[];
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.schema!==1){
    errors.push('schema');
    return emptyState(errors);
  }
  const location=normalizeLocation(raw.location); /* additive; never gates channels */
  let pm={status:'unavailable',value:null,moodKey:'unavailable',observedAt:null,source:null,provenance:null};
  const p=raw.pm25;
  if(!p||typeof p!=='object'||Array.isArray(p)){errors.push('pm25-shape');}
  else if(p.status==='stale'){errors.push('pm25-stale');}
  else if(p.status!=='ok'){errors.push('pm25-'+(p.status||'unknown'));}
  else if(p.unit!==PM_UNIT){errors.push('pm25-unit');}
  else if(!staleTime(p.observedAt,nowMs)){errors.push('pm25-observedAt');}
  else{
    /* 2026 option A: mood/band from the 24h average. The hourly value must
     * still be a valid reading (fail closed); the backend band string is
     * authoritative for the mood when in the vocabulary, else local 2026
     * cutoffs classify the emitted avg24h, else the hourly value (legacy
     * payloads). A non-empty band outside the vocabulary fails closed. */
    const hasBand=typeof p.band==='string'&&PM_BAND_VOCAB.indexOf(p.band)>=0;
    const avg24=finite(p.avg24h)&&p.avg24h>=0?p.avg24h:null;
    if(!finite(p.value)||p.value<0){errors.push('pm25-value');}
    else if(typeof p.band==='string'&&p.band!==''&&!hasBand){
      errors.push('pm25-band-conflict:'+p.band); /* fail closed: tampered/buggy band string */
    }
    else{
      const bandKey=hasBand?p.band:(avg24!==null?pmBandKey(avg24):pmBandKey(p.value));
      pm={status:'ok',value:p.value,moodKey:PM_MOOD[bandKey],observedAt:p.observedAt||null,
      source:sanitizeText(p.source,80),provenance:normalizeProvenance(p.provenance)};
    }
  }
  let wx={status:'unavailable',tempC:null,hiC:null,code:null,rainPct:null,source:null,provenance:null};
  const wch=raw.weather;
  if(!wch||typeof wch!=='object'||Array.isArray(wch)){errors.push('weather-shape');}
  else if(wch.status==='stale'){errors.push('weather-stale');}
  else if(wch.status!=='ok'){errors.push('weather-'+(wch.status||'unknown'));}
  else if(!staleTime(wch.observedAt,nowMs)){errors.push('weather-observedAt');}
  else{
    const tempC=finite(wch.temperatureC)&&wch.temperatureC>=-40&&wch.temperatureC<=65?wch.temperatureC:null;
    const rh=finite(wch.humidityPct)&&wch.humidityPct>=0&&wch.humidityPct<=100?wch.humidityPct:null;
    const code=Number.isInteger(wch.weatherCode)?wch.weatherCode:null;
    const today=bangkokToday(nowMs);
    const rainPct=(today!==null&&wch.forecastDate===today&&
        finite(wch.rainPct)&&wch.rainPct>=0&&wch.rainPct<=100)?wch.rainPct:null;
    const hiC=(tempC!==null&&rh!==null)?heatCelsius(tempC,rh):null;
    wx={status:'ok',tempC,hiC,code,rainPct,
      source:sanitizeText(wch.source,80),provenance:normalizeProvenance(wch.provenance)};
  }
  /* water: v1 has NO approved thresholds or discharge→height conversion;
   * a payload claiming availability is recorded and still ignored. */
  const wtr=raw.water;
  if(wtr&&typeof wtr==='object'&&wtr.available===true)errors.push('water-unapproved-claim');
  const water={status:'unavailable',value:null,
    source:wtr&&typeof wtr==='object'&&!Array.isArray(wtr)?sanitizeText(wtr.source,80):null,
    provenance:wtr&&typeof wtr==='object'&&!Array.isArray(wtr)?normalizeProvenance(wtr.provenance):null};
  return {location,pm,weather:wx,water,errors};
}

/* ---------- transport: one fixed endpoint, single flight, no retry storm ---------- */
let inflight=null;
function fetchJSON(fetcher,timeoutMs){
  const ctl=new AbortController();
  const timeout=setTimeout(()=>ctl.abort(),timeoutMs||FETCH_TIMEOUT_MS);
  return fetcher(BACKEND_URL+BACKEND_QUERY,{redirect:'follow',cache:'no-store',signal:ctl.signal})
    .then(async r=>{
      if(!r.ok)throw Object.assign(new Error('http '+r.status),{name:'HttpStatusError'});
      return JSON.parse(await r.text());
    })
    .finally(()=>clearTimeout(timeout));
}
const JSONP_PREFIX='__uthaiLedCb';
let jsonpSeq=0;
/* One-shot JSONP fallback for CORS-only failures: the callback identifier is
 * generated internally (strict single identifier), targets the same trusted
 * fixed exec origin, and always cleans up script/global/timer. */
function jsonpRequest(timeoutMs){
  const doc=root.document;
  if(!doc||typeof doc.createElement!=='function')return Promise.reject(new Error('no-doc'));
  return new Promise((resolve,reject)=>{
    const id=JSONP_PREFIX+Date.now().toString(36)+(jsonpSeq++).toString(36);
    if(!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(id))return reject(new Error('callback-id'));
    let done=false;
    const script=doc.createElement('script');
    const cleanup=()=>{
      if(Object.prototype.hasOwnProperty.call(root,id))delete root[id];
      if(script&&script.parentNode&&typeof script.parentNode.removeChild==='function'){
        script.parentNode.removeChild(script);
      }
      clearTimeout(timer);
    };
    const timer=setTimeout(()=>{if(done)return;done=true;cleanup();reject(new Error('jsonp-timeout'));},
      timeoutMs||FETCH_TIMEOUT_MS);
    root[id]=data=>{if(done)return;done=true;cleanup();resolve(data);};
    script.onerror=()=>{if(done)return;done=true;cleanup();reject(new Error('jsonp-error'));};
    script.src=BACKEND_URL+BACKEND_QUERY+'&callback='+id;
    (doc.head||doc.documentElement||doc).appendChild(script);
  });
}
async function requestBackendData(fetcher,nowMs,opts){
  if(inflight)return inflight;
  inflight=(async()=>{
    try{
      const raw=await fetchJSON(fetcher,opts&&opts.timeoutMs);
      return {ok:true,raw,errors:[]};
    }catch(err){
      /* AbortError = our own 12 s timeout (no fallback); HTTP status / JSON
       * parse failures are not CORS (no fallback). Only a fetch-level
       * TypeError (network/CORS) earns the one-shot JSONP attempt. */
      if(!err||err.name!=='TypeError'){
        return {ok:false,errors:[err&&err.name==='AbortError'?'timeout':'fetch'],raw:null};
      }
      try{
        const raw=await jsonpRequest(opts&&opts.timeoutMs);
        return {ok:true,raw,errors:[]};
      }catch(e2){return {ok:false,errors:['network'],raw:null};}
    }finally{inflight=null;}
  })();
  return inflight;
}

const api={heatCelsius,parseBangkokTime,heatSeverity,shortHeatLabel,freshHeat,HEAT_CLASSES,
  ROTATE_MS,REFRESH_MS,HEAT_FRESHNESS_MS,FRESH_MS,FUTURE_MS,FETCH_TIMEOUT_MS,
  PM_UNIT,BACKEND_URL,BACKEND_QUERY,pmBandKey,parseObservedAt,bangkokToday,staleTime,
  normalizePayload,emptyState,requestBackendData,jsonpRequest,
  LOCATION_PLACEHOLDER,sanitizeText,safeId,safeLink,normalizeProvenance,normalizeLocation};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.UthaiLEDRotation=api;
})(typeof window!=='undefined'?window:globalThis);
