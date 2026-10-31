'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {parse,condition}=require('../v2/weather-snapshot');
const now=Date.parse('2026-10-31T05:30:00Z'),iso='2026-10-31T05:00:00Z';
const daily={time:Array.from({length:7},(_,i)=>`2026-${i===0?'10-31':'11-'+String(i).padStart(2,'0')}`),temperature_2m_max:[33,34,35,36,37,38,39],temperature_2m_min:[25,25,25,25,25,25,25],precipitation_probability_max:[20,30,40,50,60,70,80],weather_code:[0,1,3,61,95,45,2]};
function snapshot(){let c=data=>({observedAt:iso,savedAt:iso,data});return {schema:1,location:{id:'uthai',lat:14.4,lon:100.6},channels:{weather:c({status:'ok',temperatureC:32,humidityPct:72,weatherCode:2,observedAt:iso}),forecast:c({timezone:'Asia/Bangkok',current_units:{temperature_2m:'°C',relative_humidity_2m:'%'},hourly_units:{precipitation_probability:'%'},daily_units:{temperature_2m_max:'°C',temperature_2m_min:'°C',precipitation_probability_max:'%'},current:{time:'2026-10-31T12:00',is_day:1,apparent_temperature:38,wind_speed_10m:5},hourly:{time:['2026-10-31T11:00','2026-10-31T12:00'],precipitation_probability:[5,40]},daily})}}}
test('reads matching hour probability and 7 daily maxima',()=>{let d=parse(snapshot(),now);assert.equal(d.rainPct,40);assert.equal(d.feelsC,38);assert.equal(d.days.length,7);assert.equal(d.days[3].ico,'rain');assert.equal(d.high,33)});
test('stale or wrong location fails closed without demo values',()=>{let s=snapshot();s.location.id='other';assert.equal(parse(s,now).temperatureC,null);s=snapshot();s.channels.weather.observedAt='2026-10-30T00:00:00Z';assert.equal(parse(s,now).temperatureC,null)});
test('missing hourly match and invalid forecast are unavailable',()=>{let s=snapshot();s.channels.forecast.data.hourly.time=[];assert.equal(parse(s,now).rainPct,null);s.channels.forecast.data.current_units.temperature_2m='F';assert.equal(parse(s,now).days.length,0)});
test('day/night conditions do not invent icons for unknown codes',()=>{assert.equal(condition(95,0,3),'night-thunderstorm');assert.equal(condition(61,0,3),'night-rain');assert.equal(condition(2,1,45),'wind');assert.equal(condition(77,1,5),null);assert.equal(condition(1,null,5),null)});

test('different weather and forecast observations are not mixed',()=>{let s=snapshot();s.channels.weather.data.observedAt='2026-10-31T04:00:00Z';let d=parse(s,now);assert.equal(d.temperatureC,32);assert.equal(d.rainPct,null);assert.equal(d.days.length,0)});
test('wrong coordinates and missing units fail closed',()=>{let s=snapshot();s.location.lon=99;assert.equal(parse(s,now).temperatureC,null);s=snapshot();s.channels.forecast.data.hourly_units={};assert.equal(parse(s,now).rainPct,null);s.channels.forecast.data.daily_units={};assert.equal(parse(s,now).days.length,0)});

test('quarter-hour model time uses the containing hour probability',()=>{let s=snapshot();s.channels.forecast.data.current.time='2026-10-31T12:15';s.channels.weather.data.observedAt='2026-10-31T05:15:00Z';assert.equal(parse(s,now).rainPct,40)});

test('probability follows the current Bangkok hour, not an older model observation',()=>{let s=snapshot();s.channels.weather.data.observedAt='2026-10-31T04:00:00Z';s.channels.forecast.data.current.time='2026-10-31T11:00';s.channels.forecast.data.hourly.time=['2026-10-31T11:00','2026-10-31T12:00'];s.channels.forecast.data.hourly.precipitation_probability=[5,90];assert.equal(parse(s,now).rainPct,90)});
test('missing current-hour forecast is unavailable instead of an older probability',()=>{let s=snapshot();s.channels.forecast.data.hourly.time=['2026-10-31T11:00'];assert.equal(parse(s,now).rainPct,null)});

test('clear day uses sun/cloud and clear night uses moon/cloud',()=>{assert.equal(condition(1,1,3),'partly-cloudy');assert.equal(condition(1,0,3),'night')});

test('after Bangkok midnight a feed cached from yesterday still yields six days',()=>{
  let s=snapshot(),nightNow=Date.parse('2026-10-31T17:30:00Z');
  s.channels.weather.observedAt='2026-10-31T17:15:00Z';s.channels.weather.savedAt='2026-10-31T17:15:00Z';
  s.channels.forecast.observedAt='2026-10-31T17:15:00Z';s.channels.forecast.savedAt='2026-10-31T17:15:00Z';
  s.channels.weather.data.observedAt='2026-10-31T17:15:00Z';
  s.channels.forecast.data.current={time:'2026-11-01T00:15',is_day:0,apparent_temperature:30,wind_speed_10m:5};
  s.channels.forecast.data.hourly={time:['2026-10-31T23:00','2026-11-01T00:00'],precipitation_probability:[10,55]};
  s.channels.forecast.data.daily={time:['2026-10-31','2026-11-01','2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06'],temperature_2m_max:[30,31,32,33,34,35,36],temperature_2m_min:[24,24,24,24,24,24,24],precipitation_probability_max:[10,20,30,40,50,60,70],weather_code:[0,1,3,61,95,45,2]};
  const d=parse(s,nightNow);
  assert.equal(d.rainPct,55,'current Bangkok hour probability still resolves');
  assert.equal(d.days.length,6,'yesterday-starting feed exposes the six remaining days');
  assert.equal(d.days[0].date,'2026-11-01');
  assert.equal(d.high,31);assert.equal(d.low,24);
});

test('an eight-day transport feed keeps the seventh page day through Bangkok midnight',()=>{
  let s=snapshot(),nightNow=Date.parse('2026-10-31T17:30:00Z');
  s.channels.weather.observedAt='2026-10-31T17:15:00Z';s.channels.weather.savedAt='2026-10-31T17:15:00Z';
  s.channels.forecast.observedAt='2026-10-31T17:15:00Z';s.channels.forecast.savedAt='2026-10-31T17:15:00Z';
  s.channels.weather.data.observedAt='2026-10-31T17:15:00Z';
  s.channels.forecast.data.current={time:'2026-11-01T00:15',is_day:0,apparent_temperature:30,wind_speed_10m:5};
  s.channels.forecast.data.hourly={time:['2026-10-31T23:00','2026-11-01T00:00'],precipitation_probability:[10,55]};
  s.channels.forecast.data.daily={time:['2026-10-31','2026-11-01','2026-11-02','2026-11-03','2026-11-04','2026-11-05','2026-11-06','2026-11-07'],temperature_2m_max:[30,31,32,33,34,35,36,33],temperature_2m_min:[24,24,24,24,24,24,24,24],precipitation_probability_max:[10,20,30,40,50,60,70,40],weather_code:[0,1,3,61,95,45,2,1]};
  const d=parse(s,nightNow);
  assert.equal(d.days.length,7,'eight-day feed still fills all seven page columns');
  assert.equal(d.days[6].date,'2026-11-07','the coming Saturday survives the midnight rollover');
  assert.equal(d.days[6].hi,33);
});
