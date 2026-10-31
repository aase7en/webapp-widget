/* Hourly public transport cache for Open-Meteo; the canonical store remains
 * the owner-bound Google Sheet. Never manufacture values or timestamps. */
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const LAT=14.36147,LON=100.64424;
const URL='https://api.open-meteo.com/v1/forecast?latitude='+LAT+'&longitude='+LON+
 '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day,apparent_temperature,uv_index,wind_gusts_10m'+
 '&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,uv_index,wind_speed_10m,wind_gusts_10m'+
 '&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max,weather_code&forecast_days=7&timezone=Asia%2FBangkok';
export function validateForecast(f,now=Date.now()){
 if(!f||f.timezone!=='Asia/Bangkok'||!f.current||!f.current_units||f.current_units.temperature_2m!=='°C'||f.current_units.relative_humidity_2m!=='%'||!f.hourly||!Array.isArray(f.hourly.time)||!f.daily||!Array.isArray(f.daily.time)||f.daily.time.length!==7)throw Error('forecast shape invalid');
 const c=f.current,t=c.temperature_2m,rh=c.relative_humidity_2m;
 if(!Number.isFinite(t)||t< -40||t>65||!Number.isFinite(rh)||rh<0||rh>100||!Number.isInteger(c.weather_code))throw Error('current conditions invalid');
 if(typeof c.time!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(c.time))throw Error('source time invalid');
 const observed=Date.parse(c.time+'+07:00');if(!Number.isFinite(observed)||observed>now+120000||now-observed>3*3600000)throw Error('source time stale or future');
 const today=new Date(now+7*3600000).toISOString().slice(0,10),dates=f.daily.time;
 if(dates.some((date,i)=>date!==new Date(Date.parse(today+'T00:00:00Z')+i*86400000).toISOString().slice(0,10)))throw Error('forecast dates invalid');
 if(f.hourly_units?.precipitation_probability!=='%'||f.daily_units?.temperature_2m_max!=='°C'||f.daily_units?.temperature_2m_min!=='°C'||f.daily_units?.precipitation_probability_max!=='%')throw Error('forecast units invalid');
 if(!Array.isArray(f.hourly.precipitation_probability)||f.hourly.precipitation_probability.length!==f.hourly.time.length||!f.hourly.time.length)throw Error('hourly forecast invalid');
 for(const key of ['temperature_2m_max','temperature_2m_min','precipitation_probability_max','weather_code'])if(!Array.isArray(f.daily[key])||f.daily[key].length!==7)throw Error('daily forecast invalid');
 if(!Number.isFinite(f.latitude)||!Number.isFinite(f.longitude)||Math.abs(f.latitude-LAT)>.3||Math.abs(f.longitude-LON)>.3)throw Error('provider grid is too far from requested location');
 if(JSON.stringify(f).length>44000)throw Error('forecast exceeds Sheet cell budget');return f;
}
export function isFreshSameHour(feed,now=Date.now()){
 const t=Date.parse(feed?.fetchedAt);if(feed?.schema!==1||feed?.requestedLocation?.lat!==LAT||feed?.requestedLocation?.lon!==LON||!Number.isFinite(t)||t>now+120000||Math.floor(t/3600000)!==Math.floor(now/3600000))return false;
 try{validateForecast(feed.data,now);return true}catch(_){return false}
}
export async function main(){
 const dest=process.argv[2],old=process.argv[3];if(!dest)throw Error('output path required');
 if(old){try{const last=JSON.parse(await readFile(old,'utf8'));if(isFreshSameHour(last)){console.log('Already fetched in this clock hour; retaining previous feed.');return}}catch(_){/* absent first run */}}
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),20000);let res;try{res=await fetch(URL,{signal:ctrl.signal,headers:{accept:'application/json'}})}finally{clearTimeout(timer)}
 if(!res.ok)throw Error('Open-Meteo HTTP '+res.status);
 const f=validateForecast(await res.json()),feed={schema:1,requestedLocation:{lat:LAT,lon:LON},fetchedAt:new Date().toISOString(),data:f};await writeFile(dest,JSON.stringify(feed)+'\n','utf8');console.log('Validated Open-Meteo feed:',f.current.time);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error('Weather feed not updated:',e.message);process.exitCode=1});
