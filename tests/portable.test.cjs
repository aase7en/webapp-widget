'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const w=require('../portable.js');
test('coordinates validate both ranges and accept zero',()=>{
 assert.equal(w.parseLocation('?lat=14.3'),null);
 assert.equal(w.parseLocation('?lat=&lon=100'),null);
 assert.equal(w.parseLocation('?lat=91&lon=100'),null);
 assert.deepEqual(w.parseLocation('?lat=0&lon=0&name=Central&layout=cards'),{lat:0,lon:0,name:'Central',cards:true});
});
test('pm average validates 24 complete consecutive hourly samples',()=>{
 const iso=i=>new Date(Date.UTC(2026,9,8,4)+i*3600000).toISOString().slice(0,16);
 const data={current:{time:iso(23)},hourly:{time:Array.from({length:24},(_,i)=>iso(i)),pm2_5:Array(24).fill(0)}};
 assert.equal(w.pm24HourAverage(data),0);
 data.hourly.pm2_5[1]=null;assert.equal(w.pm24HourAverage(data),null);
 data.hourly.pm2_5[1]=24;assert.equal(w.pm24HourAverage(data),1);
 data.hourly.time[2]=data.hourly.time[1];assert.equal(w.pm24HourAverage(data),null);
});
test('model-derived heat index rejects missing humidity',()=>{
 assert.ok(w.heatIndexCelsius(32,70)>39);
 assert.equal(w.heatIndexCelsius(32,null),null);
 assert.equal(w.heatIndexCelsius(32,120),null);
});
test('flood adapter cannot report LOW without valid recent timestamp and source',()=>{
 assert.equal(w.normalizedFlood({status:'AVAILABLE',risk_level:null,observed_at:new Date().toISOString(),source:'X'}),null);
 assert.equal(w.normalizedFlood({status:'AVAILABLE',risk_level:'LOW',observed_at:'2022-01-01T00:00:00Z',source:'X'}),null);
 assert.equal(w.normalizedFlood({status:'AVAILABLE',risk_level:'LOW',observed_at:new Date().toISOString(),source:null}),null);
 assert.equal(w.normalizedFlood({status:'AVAILABLE',risk_level:'WATCH',observed_at:new Date().toISOString(),source:'verified'}).value,'เฝ้าระวัง');
});

test('PM thresholds keep exact 15 and 25 in their inclusive class',()=>{
 assert.equal(w.classify(15,[{max:15,label:'good'},{max:25,label:'next'}],true).label,'good');
 assert.equal(w.classify(25,[{max:15,label:'good'},{max:25,label:'next'}],true).label,'next');
});
