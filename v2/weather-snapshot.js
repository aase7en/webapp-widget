/* Read a recent owner-bound Sheet snapshot; never substitute demo values. */
(function(root){
'use strict';
const FRESH=3*3600000, FUTURE=5*60000;
const number=(v,lo,hi)=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi?v:null;
function fresh(v,now,allowHistorical=false){const t=typeof v==='string'?Date.parse(v):NaN;return Number.isFinite(t)&&t<=now+FUTURE&&(allowHistorical||now-t<=FRESH);}
function condition(c,day,wind){
 if(!Number.isInteger(c)||![0,1,2,3,45,48,51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(c))return null;
 const rain=c>=51&&c<=82, storm=c>=95;
 if(day===0)return storm?'night-thunderstorm':rain?'night-rain':number(wind,0,300)!==null&&wind>=40?'night-wind':'night';
 if(day!==1)return null;
 return storm?'thunderstorm':rain?'rain':c===45||c===48?'fog':number(wind,0,300)!==null&&wind>=40?'wind':c===3?'cloudy':'partly-cloudy';
}
function parse(raw,now,options){
 const allowHistorical=options&&options.allowHistorical===true;
 const none={temperatureC:null,humidityPct:null,feelsC:null,rainPct:null,high:null,low:null,icon:null,days:[]};
 if(!raw||raw.schema!==1||(!raw.location||raw.location.id!=='uthai')||number(raw.location.lat,14,15)===null||number(raw.location.lon,100,101)===null||!raw.channels)return none;
 const channel=n=>{let c=raw.channels[n];return c&&fresh(c.observedAt,now,allowHistorical)&&fresh(c.savedAt,now,allowHistorical)&&c.data&&typeof c.data==='object'?c.data:null};
 let w=channel('weather'), f=channel('forecast');
 if(!w||w.status!=='ok'||!fresh(w.observedAt,now,allowHistorical))return none;
 let d={...none,temperatureC:number(w.temperatureC,-40,65),humidityPct:number(w.humidityPct,0,100),
  observedAt:raw.channels.weather.observedAt,
  provenance:'Open-Meteo weather model',
  historical:now-Date.parse(raw.channels.weather.observedAt)>FRESH};
 // A valid temperature is useful even when humidity is genuinely absent:
 // preserve the last measured/modelled field and leave unknown humidity null.
 if(d.temperatureC===null)return none;
 if(!f||f.timezone!=='Asia/Bangkok')return d;
 let cur=f.current||{},daily=f.daily||{},hourly=f.hourly||{};
 if((f.current_units||{}).temperature_2m!=='°C'||(f.current_units||{}).relative_humidity_2m!=='%')return d;
 const currentTime=typeof cur.time==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(cur.time)?cur.time:null;
 const observed=currentTime?Date.parse(currentTime+'+07:00'):NaN;
 if(!Number.isFinite(observed)||observed>now+FUTURE||(!allowHistorical&&now-observed>FRESH)||Math.abs(observed-Date.parse(w.observedAt))>15*60000)return d;
 d.feelsC=number(cur.apparent_temperature,-50,80);
 d.icon=condition(w.weatherCode,cur.is_day,cur.wind_speed_10m);
 // Hourly probability describes the displayed Bangkok clock hour, even
 // when the most recent successful snapshot is older than this hour.
 const currentHour=new Date(now+7*3600000).toISOString().slice(0,13)+':00';
 const hourIndex=Array.isArray(hourly.time)?hourly.time.indexOf(currentHour):-1;
 d.rainPct=hourIndex>=0&&(f.hourly_units||{}).precipitation_probability==='%'?number((hourly.precipitation_probability||[])[hourIndex],0,100):null;
 let today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
 let dates=Array.isArray(daily.time)?daily.time:[], start=dates.indexOf(today);
 if((f.daily_units||{}).temperature_2m_max!=='°C'||(f.daily_units||{}).temperature_2m_min!=='°C'||(f.daily_units||{}).precipitation_probability_max!=='%')return d;
 if(start<0)return d;
 for(let i=0;i<7;i++){
  let date=dates[start+i];if(typeof date!=='string'||!/^\d{4}-\d\d-\d\d$/.test(date))break;
  const expected=new Date(Date.parse(today+'T12:00:00+07:00')+i*86400000);
  const expectedDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(expected);
  if(date!==expectedDate)break;
  d.days.push({date,day:new Intl.DateTimeFormat('th-TH',{weekday:'short',timeZone:'Asia/Bangkok'}).format(expected),hi:number((daily.temperature_2m_max||[])[start+i],-40,65),lo:number((daily.temperature_2m_min||[])[start+i],-40,65),p:number((daily.precipitation_probability_max||[])[start+i],0,100),ico:condition((daily.weather_code||[])[start+i],1,null)});
 }
 d.high=d.days.length?d.days[0].hi:null;d.low=d.days.length?d.days[0].lo:null;return d;
}
/* The public GitHub weather-data branch is a read-only transport fallback;
 * the canonical operational store remains the existing Google Sheet.
 * Preserve the model observation time instead of pretending the cache is live. */
function fromTransport(feed,now){
 const loc=feed&&feed.requestedLocation,f=feed&&feed.data,c=f&&f.current;
 if(feed?.schema!==1||!loc||!Number.isFinite(loc.lat)||!Number.isFinite(loc.lon)||Math.abs(loc.lat-14.36147)>1e-4||Math.abs(loc.lon-100.64424)>1e-4||!f||
   f.timezone!=='Asia/Bangkok'||!c||!f.current_units||!f.daily||!f.hourly||
   f.current_units.temperature_2m!=='°C'||f.current_units.relative_humidity_2m!=='%')return null;
 const fetched=Date.parse(feed.fetchedAt);
 if(!Number.isFinite(fetched)||fetched>now+FUTURE)return null;
 if(typeof c.time!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(c.time))return null;
 const observed=Date.parse(c.time+'+07:00');
 if(!Number.isFinite(observed)||observed>now+FUTURE||observed>fetched+FUTURE)return null;
 if(number(c.temperature_2m,-40,65)===null||number(c.relative_humidity_2m,0,100)===null||
   !Number.isInteger(c.weather_code)||c.weather_code<0||c.weather_code>99)return null;
 if(!Number.isFinite(f.latitude)||!Number.isFinite(f.longitude)||
   Math.abs(f.latitude-loc.lat)>.3||Math.abs(f.longitude-loc.lon)>.3)return null;
 if(!Array.isArray(f.daily.time)||!Array.isArray(f.hourly.time)||!Array.isArray(f.daily.temperature_2m_max)||
   !Array.isArray(f.daily.temperature_2m_min)||!Array.isArray(f.daily.precipitation_probability_max)||
   !Array.isArray(f.daily.weather_code)||!Array.isArray(f.hourly.precipitation_probability)||
   f.hourly.time.length!==f.hourly.precipitation_probability.length||f.hourly.time.length===0||
   f.daily.time.length!==f.daily.temperature_2m_max.length||
   f.daily.time.length!==f.daily.temperature_2m_min.length||
   f.daily.time.length!==f.daily.precipitation_probability_max.length||
   f.daily.time.length!==f.daily.weather_code.length)return null;
 const iso=new Date(observed).toISOString();
 return {schema:1,location:{id:'uthai',lat:loc.lat,lon:loc.lon},
  channels:{weather:{observedAt:iso,savedAt:feed.fetchedAt,data:{
   status:'ok',temperatureC:c.temperature_2m,humidityPct:c.relative_humidity_2m,
   weatherCode:c.weather_code,observedAt:iso,source:'Open-Meteo weather model via GitHub transport cache'}},
   forecast:{observedAt:iso,savedAt:feed.fetchedAt,data:f}},
  transport:'github-weather-data',originalObservation:iso};
}

const api={parse,condition,fromTransport};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.UthWeatherSnapshot=api;
})(typeof window==='undefined'?globalThis:window);
