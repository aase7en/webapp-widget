'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const panel = require('../water.js');
const at = new Date('2026-10-13T06:00:00Z');
const good = () => ({
  latitude: 14.375, longitude: 100.625,
  daily_units: {time: 'iso8601',river_discharge: 'm³/s'},
  daily: {time: ['2026-10-12','2026-10-13','2026-10-14'],river_discharge: [7,0,11.5]}
});
test('model zero remains a model discharge and local stations remain unavailable',()=>{
  const x=panel.normalizeForecast(good(),at);
  assert.equal(x.state,'MODELLED');
  assert.equal(x.value,0);
  assert.equal(x.date,'2026-10-13');
  assert.deepEqual(x.grid,[14.375,100.625]);
  assert.equal(panel.formatFlow(x),'0.0 m³/s');
  assert.equal(panel.STATIONS.length,4);
  assert.ok(panel.STATIONS.every(p=>p.source==='UNAVAILABLE'));
  assert.ok(panel.STATIONS.every(p=>p.label.includes('รอระดับน้ำจริง')));
});
test('invalid model/missing/mismatched units never become numeric zeros or safety status',()=>{
  for(const payload of [null, {}, {error:true}, {...good(),daily_units:{river_discharge:'m'}},
    {...good(),daily:{time:['2026-10-13'],river_discharge:[]}},
    {...good(),daily:{time:['2026-10-14'],river_discharge:[3]}},
    {...good(),daily:{time:['2026-10-13'],river_discharge:[null]}},
    {...good(),daily:{time:['2026-10-13'],river_discharge:[-1]}},
    {...good(),daily:{time:['2026-10-13'],river_discharge:['5']}},
    {...good(),daily:{time:['2026-10-13'],river_discharge:[Infinity]}}
  ]) {
    const v=panel.normalizeForecast(payload,at);
    assert.equal(v.state,'UNAVAILABLE');
    assert.equal(v.value,null);
    assert.equal(panel.formatFlow(v),'ไม่มีข้อมูล');
  }
});
test('day selection uses Bangkok calendar day and never a future default',()=>{
  assert.equal(panel.bangkokDate(new Date('2026-10-13T17:30:00Z')),'2026-10-14');
  const x=panel.normalizeForecast(good(),new Date('2026-10-13T17:30:00Z'));
  assert.equal(x.date,'2026-10-14');
  assert.equal(x.value,11.5);
  assert.equal(panel.bangkokDate(new Date('bad')),null);
});
test('invalid day strings and missing today fail closed',()=>{
  assert.equal(panel.validDay('2026-02-30'),false);
  assert.equal(panel.validDay('2026-10-13'),true);
  assert.equal(panel.validDay('2026-10-13T00:00'),false);
  assert.equal(panel.normalizeForecast(good(),new Date('2026-11-01T06:00:00Z')).state,'UNAVAILABLE');
});
test('uses static keyless public Open-Meteo endpoint, Bangkok timezone and correct metric',()=>{
  const u=new URL(panel.forecastUrl());
  assert.equal(u.origin,'https://flood-api.open-meteo.com');
  assert.equal(u.searchParams.get('daily'),'river_discharge');
  assert.equal(u.searchParams.get('timezone'),'Asia/Bangkok');
  assert.equal(u.searchParams.has('apikey'),false);
  assert.equal(u.searchParams.has('token'),false);
});
test('HTTP errors, offline and bad JSON fail closed',async()=>{
  for(const fn of [
    async()=>{throw Error('offline')},
    async()=>({ok:false}),
    async()=>({ok:true,json:async()=>{throw SyntaxError('bad JSON')}})
  ]){
    const result=await panel.fetchForecast(fn,()=>at);
    assert.equal(result.state,'UNAVAILABLE');
    assert.equal(result.value,null);
  }
});
test('LED page is independent of the retired legacy iframe and is 40px-responsive',()=>{
  const page=fs.readFileSync(require('node:path').resolve(__dirname,'../water.html'),'utf8');
  const js=fs.readFileSync(require('node:path').resolve(__dirname,'../water.js'),'utf8');
  const main=fs.readFileSync(require('node:path').resolve(__dirname,'../index.html'),'utf8');
  /* user-approved 2026-10-17: index.html is now the native strip; no iframe remains */
  assert.doesNotMatch(main,/AKfycbwwUQCeJoz4N0P9UuRJF39pt17mBjPz0_yMDDxTO7BoiUiTQaO7Yay0UKq80EvE6dk/);
  assert.doesNotMatch(main,/script\.google\.com/);
  assert.match(main,/id="wa-value">—/);
  assert.match(main,/รอข้อมูลจริง/);
  assert.match(page,/compact-strip/);
  for (const id of ['flow-value','flow-detail','updated','strip-title','strip-value','strip-source']) {
    assert.match(page,new RegExp('id=\"'+id+'\"'));
  }
  assert.match(js,/source:'MODELLED'/);
  assert.match(page,/max-height:100px/);
  assert.match(page,/ปตร\.กลางคลองข้าวเม่า/);
  assert.match(page,/492335/);
  assert.match(page,/492334/);
  assert.match(page,/MODELLED/);
  assert.match(page,/UNAVAILABLE/);
  assert.match(page,/Open-Meteo \/ Copernicus GloFAS/);
  assert.match(js,/textContent/);
  assert.doesNotMatch(js,/innerHTML/);
});
