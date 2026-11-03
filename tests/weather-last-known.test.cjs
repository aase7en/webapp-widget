'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {parse,fromTransport}=require('../v2/weather-snapshot');
const now=Date.parse('2026-11-04T01:30:00Z');
const observed=Date.parse('2026-11-03T17:00:00Z'); // 8.5 h old
const obsWall=new Date(observed+7*3600000).toISOString().slice(0,16);
const today=new Date(now+7*3600000).toISOString().slice(0,10);
const day=i=>new Date(Date.parse(today+'T00:00:00Z')+i*86400000).toISOString().slice(0,10);
function feed(){
 const dates=Array.from({length:8},(_,i)=>day(i));
 return {schema:1,requestedLocation:{lat:14.36147,lon:100.64424},
  fetchedAt:new Date(observed+25*60000).toISOString(),
  data:{latitude:14.376099,longitude:100.66667,timezone:'Asia/Bangkok',
   current_units:{temperature_2m:'°C',relative_humidity_2m:'%'},
   current:{time:obsWall,temperature_2m:28.4,relative_humidity_2m:84,weather_code:3,is_day:0,apparent_temperature:32},
   hourly_units:{precipitation_probability:'%'},
   hourly:{time:[obsWall],precipitation_probability:[25]},
   daily_units:{temperature_2m_max:'°C',temperature_2m_min:'°C',precipitation_probability_max:'%'},
   daily:{time:dates,temperature_2m_max:Array(8).fill(33),temperature_2m_min:Array(8).fill(25),precipitation_probability_max:Array(8).fill(60),weather_code:Array(8).fill(3)}}};
}
test('cold-start transport cache accepts a validated historical model but never calls it current',()=>{
 const raw=fromTransport(feed(),now);
 assert.ok(raw,'valid model transport is normalized');
 assert.equal(raw.channels.weather.observedAt,new Date(observed).toISOString());
 assert.equal(raw.channels.weather.savedAt,new Date(observed+25*60000).toISOString());
 assert.equal(parse(raw,now).temperatureC,null,'fresh-only parse remains strict');
 const latest=parse(raw,now,{allowHistorical:true});
 assert.equal(latest.temperatureC,28.4);
 assert.equal(latest.humidityPct,84);
 assert.equal(latest.historical,true);
 assert.equal(latest.observedAt,new Date(observed).toISOString());
 assert.equal(latest.rainPct,null,'older hourly probability is not fabricated for the current hour');
});
test('recovered fresh feed switches back to model_latest, without making new observation times',()=>{
 const f=feed(),near=Date.parse('2026-11-03T17:40:00Z');
 const raw=fromTransport(f,near);
 const d=parse(raw,near);
 assert.equal(d.temperatureC,28.4);
 assert.equal(d.historical,false);
 assert.equal(d.observedAt,new Date(observed).toISOString());
});
test('wrong location, invalid provider units or impossible measurement is rejected',()=>{
 let f=feed();f.requestedLocation.lat=13.1;assert.equal(fromTransport(f,now),null);
 f=feed();f.data.latitude=12.5;assert.equal(fromTransport(f,now),null);
 f=feed();f.data.current_units.temperature_2m='°F';assert.equal(fromTransport(f,now),null);
 f=feed();f.data.current.temperature_2m=NaN;assert.equal(fromTransport(f,now),null);
 f=feed();f.data.current.time='nonsense';assert.equal(fromTransport(f,now),null);
});
test('future observation and future transport timestamp fail closed',()=>{
 let f=feed();f.data.current.time='2026-11-04T18:00';assert.equal(fromTransport(f,now),null);
 f=feed();f.fetchedAt='2026-11-05T00:00:00Z';assert.equal(fromTransport(f,now),null);
});
test('historical parser never accepts unknown status or missing source observation time',()=>{
 const f=feed(),r=fromTransport(f,now);
 r.channels.weather.data.status='unavailable';
 assert.equal(parse(r,now,{allowHistorical:true}).temperatureC,null);
 r.channels.weather.data.status='ok';r.channels.weather.observedAt='invalid';
 assert.equal(parse(r,now,{allowHistorical:true}).temperatureC,null);
});
