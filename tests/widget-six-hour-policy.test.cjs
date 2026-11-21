'use strict';
// Source-contract regression: 3h→6h display policy for measured PM+Water only.
// No fabricated values, no changes to canonical Sheet/Apps Script or Weather.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),source=p=>fs.readFileSync(path.join(root,p),'utf8');
const pmBridge=source('v2/live-widgets.js'),waterJs=source('v2/water-luxury-live.js'),api=source('v2/api-client.js');
const start=pmBridge.indexOf('function pmForDisplay('),end=pmBridge.indexOf('function publishPm(',start);
assert(start>0&&end>start);
const pm=Function(pmBridge.slice(start,end)+';return pmForDisplay;')();
const now=Date.parse('2026-11-21T15:00:00.000Z'),when=(age)=>new Date(now-age).toISOString(),H=3600000;
function point(age,value){return {observedAt:when(age),value}}
test('PM latest from verified Sheet hourly history works between 3h and exact 6h with NO invented avg24h or tier',()=>{
 for(const age of [3*H+60000,5*H,6*H]){
  const out=pm({status:'unavailable'},[point(age,19.6)],'ok',now);
  assert.equal(out.status,'latest','age='+age);assert.equal(out.value,19.6);
  assert.equal(out.observedAt,when(age));assert.equal(out.avg24h,null);
  assert.equal(out.band,null);assert.equal(out.historyFallback,true);
  assert.equal(out.source,'GISTDA via verified Google Sheet PM history');
 }
});
test('PM over six hours displays explicit stale status, never re-labels old measurement as current',()=>{
 for(const age of [6*H+1,7*H,24*H]){
  const out=pm({status:'unavailable'},[point(age,19.6)],'ok',now);
  assert.equal(out.status,'stale');assert.equal(out.reason,'older_than_6h');
  assert.equal(out.value,undefined);
 }
});
test('PM fails closed on unavailable history, invalid readings, contradictory duplicate timestamps and future readings',()=>{
 for(const [readings,mode] of [
  [[point(5*H,20)],'unavailable'],[[], 'ok'],
  [[point(5*H,-1)],'ok'],[[point(-4*60000,20)],'ok'],
  [[point(5*H,20),point(5*H,21)],'ok']
 ]){
  const out=pm({status:'unavailable'},readings,mode,now);
  assert.equal(out.status,'unavailable');assert.equal(out.value,undefined);
 }
 const dedup=pm({status:'unavailable'},[point(5*H,20),point(5*H,20)],'retained',now);
 assert.equal(dedup.status,'latest');assert.equal(dedup.value,20);
});
test('PM verified snapshot itself remains valid for <=6h; Weather model stays at 3h',()=>{
 const latest={status:'latest',value:19.6,avg24h:17.5,observedAt:when(5*H),unit:'µg/m³'};
 assert.deepEqual(pm(latest,[],'unavailable',now),latest);
 assert.match(api,/PM_DISPLAY_MS=6\*3600000/);assert.match(api,/WATER_DISPLAY_MS=6\*3600000/);
 assert.match(api,/STALE_KEEP_MS=3\*3600000/); // weather/forecast original semantics
 assert.match(api,/freshBy\(w\.observedAt,tnow,STALE_KEEP_MS\)/);
 assert.match(api,/name==='pm25'\?PM_DISPLAY_MS:STALE_KEEP_MS/);
});
test('Water badge returns original status until six hours; over six hours explicit stale text',()=>{
 const begin=waterJs.indexOf('function bankBadge('),end=waterJs.indexOf('// Only a dimensionless',begin);
 assert(begin>0&&end>begin);
 const badge=Function('const WATER_DISPLAY_MS=6*3600000;'+waterJs.slice(begin,end)+';return bankBadge;')();
 const st={status:'ok',datum:'MSL',value:2.36,bankM:3.03,groundMsl:.227};
 assert.equal(badge({...st,observedAt:when(5*H)},now).text,'ต่ำกว่าตลิ่ง');
 assert.equal(badge({...st,observedAt:when(6*H)},now).text,'ต่ำกว่าตลิ่ง');
 assert.equal(badge({...st,observedAt:when(6*H+1)},now).text,'ข้อมูลเก่าเกิน 6 ชม.');
 assert.equal(badge({...st,status:'historical',observedAt:when(7*H)},now).text,'ข้อมูลเก่าเกิน 6 ชม.');
});
test('Policy not reflected by manipulating capture timestamps, changing the data provider or source backend',()=>{
 const waterHTML=source('v2/water-luxury-live.html');
 assert.match(api,/action=water_history/);
 assert.match(api,/action=snapshot_v1/);
 assert.match(pmBridge,/action=pm25_history/);
 assert.match(waterHTML,/api-client\.js/);
 assert.doesNotMatch(pmBridge,/api\.open-meteo\.com|api-v3\.thaiwater\.net|localStorage/);
 assert.match(waterJs,/WATER_DISPLAY_MS=6\*3600000/);
});


test('PM chooses the newest measured Sheet observation rather than older snapshot when both exist',()=>{
 const olderSnapshot={status:'latest',value:18,avg24h:17,unit:'µg/m³',observedAt:when(4*H)};
 const newer=pm(olderSnapshot,[point(1*H,21.3)],'ok',now);
 assert.equal(newer.value,21.3);
 assert.equal(newer.observedAt,when(1*H));
 assert.equal(newer.avg24h,null,'do not reuse prior 24h average for newer hour');
 assert.equal(newer.historyFallback,true);
 const earlier=pm({...olderSnapshot,observedAt:when(1*H)},[point(4*H,21.3)],'ok',now);
 assert.equal(earlier.value,18);
 assert.equal(earlier.avg24h,17);
 const equalConflict=pm(olderSnapshot,[point(4*H,33.3)],'ok',now);
 assert.equal(equalConflict.status,'unavailable');
});
