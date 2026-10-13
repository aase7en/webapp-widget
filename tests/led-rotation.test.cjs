'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const w=require('../led-rotation.js');
const now=Date.parse('2026-10-14T08:25:00+07:00');
const payload=()=>({timezone:'Asia/Bangkok',current_units:{temperature_2m:'°C',relative_humidity_2m:'%'},current:{time:'2026-10-14T08:15',temperature_2m:32,relative_humidity_2m:72}});
test('NOAA heat index is derived from temp and RH, not reported as a sensor',()=>{
 const value=w.heatCelsius(32,72);
 assert.ok(value>38 && value<47);
 assert.equal(w.parseHeat(payload(),now).type,'DERIVED');
});
test('zero/missing and invalid humidity are not collapsed to 0 heat index',()=>{
 assert.equal(w.heatCelsius(32,null),null);
 assert.equal(w.heatCelsius(32,undefined),null);
 assert.equal(w.heatCelsius(32,101),null);
 assert.equal(w.heatCelsius(NaN,70),null);
 assert.equal(w.heatCelsius(32,0)!==null,true);
});
test('strict sources, units, timezone and freshness, with no fake default',()=>{
 assert.equal(w.parseHeat({...payload(),timezone:'UTC'},now),null);
 assert.equal(w.parseHeat({...payload(),current_units:{temperature_2m:'°F',relative_humidity_2m:'%'}},now),null);
 assert.equal(w.parseHeat({...payload(),current:{...payload().current,temperature_2m:null}},now),null);
 assert.equal(w.parseHeat({...payload(),current:{...payload().current,time:'2026-10-13T00:00'}},now),null);
 assert.equal(w.parseHeat({...payload(),current:{...payload().current,time:'2026-10-15T00:00'}},now),null);
 assert.equal(w.parseBangkokTime('2026-10-14T08:15'),Date.parse('2026-10-14T08:15+07:00'));
 assert.equal(w.parseBangkokTime('2026-10-14T08:15Z'),null);
});
test('failed, invalid or offline weather API degrades only heat slide',async()=>{
 for(const fetcher of [
  async()=>{throw Error('offline')},
  async()=>({ok:false}),
  async()=>({ok:true,json:async()=>({})})
 ]){
   assert.equal(await w.requestHeat(fetcher,()=>now),null);
 }
 const got=await w.requestHeat(async(url,init)=>{
  assert.equal(url.includes('timezone=Asia%2FBangkok'),true);
  assert.equal(init.cache,'no-store');
  return {ok:true,json:async()=>payload()};
 },()=>now);
 assert.equal(got.type,'DERIVED');
});
test('Thai heat severity colours use displayed one-decimal temperature and agency cutoffs',()=>{
  const levels=[
    [26.9,'heat-below','ต่ำกว่าเกณฑ์'],
    [27,'heat-watch','เฝ้าระวัง'],
    [32.9,'heat-watch','เฝ้าระวัง'],
    [33,'heat-caution','เตือนภัย'],
    [41.9,'heat-caution','เตือนภัย'],
    [42,'heat-danger','อันตราย'],
    [51.9,'heat-danger','อันตราย'],
    [52,'heat-extreme','อันตรายมาก'],
    [32.95,'heat-caution','เตือนภัย'],
    [41.95,'heat-danger','อันตราย'],
    [51.95,'heat-extreme','อันตรายมาก']
  ];
  for(const [num,cls,name] of levels){
    const result=w.heatSeverity(num);
    assert.equal(result.cls,cls,String(num));
    assert.match(result.label,new RegExp(name),String(num));
    assert.match(result.label,/คำนวณ/,String(num));
  }
  assert.equal(w.heatSeverity(null).cls,'no-data');
  assert.equal(w.heatSeverity(NaN).cls,'no-data');
  assert.notEqual(w.heatSeverity(0).cls,'no-data');
});
test('water stays neutral with no real gauge and colours are reserved for confirmed agency alerts',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.match(html,/id="slide-water" class="slide water no-data"/);
 assert.match(html,/\.water\.water-watch \.label/);
 assert.match(html,/\.water\.water-warning \.label/);
 assert.match(html,/\.water\.water-danger \.label/);
 assert.match(html,/\.water\.water-critical \.label/);
 assert.match(html,/\.heat\.heat-watch \.label/);
 assert.match(html,/\.heat\.heat-caution \.label/);
 assert.match(html,/\.heat\.heat-danger \.label/);
 assert.match(html,/\.heat\.heat-extreme \.label/);
 assert.match(html,/\.heat\.no-data \.label/);
 assert.match(html,/id="water-value">—/);
 assert.match(html,/รอข้อมูลจริง/);
});
test('stale heat-model readings expire regardless of refresh timers',()=>{
  const now=Date.parse('2026-10-14T10:00:00+07:00');
  const good={value:41.9,time:now-w.HEAT_FRESHNESS_MS,type:'DERIVED'};
  assert.equal(w.freshHeat(good,now).value,41.9);
  assert.equal(w.freshHeat(good,now+1),null);
  assert.equal(w.freshHeat({...good,time:now-4*3600000},now),null);
  assert.equal(w.freshHeat({...good,time:now+6*60000},now),null);
  assert.equal(w.freshHeat({...good,type:'MEASURED'},now),null);
  assert.equal(w.freshHeat(null,now),null);
  assert.equal(w.freshHeat({value:null,time:now,type:'DERIVED'},now),null);
  assert.match(require('node:fs').readFileSync(require('node:path').join(__dirname,'../led-rotation.js'),'utf8'),/visibilitychange/);
});
test('short labels are marked as derived, not an official safety warning',()=>{
 assert.match(w.shortHeatLabel(40),/คำนวณ/);
 assert.match(w.shortHeatLabel(44),/คำนวณ/);
 assert.equal(w.shortHeatLabel(null),'รอข้อมูล');
});
test('legacy iframe ID is unchanged; three panels and high-contrast large text',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.match(html,/AKfycbwwUQCeJoz4N0P9UuRJF39pt17mBjPz0_yMDDxTO7BoiUiTQaO7Yay0UKq80EvE6dk\/exec/);
 for(const id of ['slide-pm','slide-water','slide-heat','heat-value','heat-status','water-value','water-status'])
   assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(html,/class="slide active"/);
 assert.match(html,/font-size:19px/);
 assert.match(html,/@media\(min-height:220px\)/);
 assert.match(html,/flex:30 1 0;min-height:0/);
 assert.match(html,/flex:38 1 0;min-height:0/);
 assert.match(html,/flex:26 1 0;min-height:0/);
 assert.match(html,/id="water-value">—/);
 assert.match(html,/รอข้อมูลจริง/);
 assert.match(html,/คลองข้าวเม่า/);
 assert.match(html,/ดัชนีร้อน/);
 assert.match(html,/textContent|html/);
 assert.equal(w.ROTATE_MS,12000);
 assert.equal(w.REFRESH_MS,15*60*1000);
});
