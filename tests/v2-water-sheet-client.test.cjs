const {test}=require('node:test');
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const src=fs.readFileSync(path.join(__dirname,'../v2/api-client.js'),'utf8');
const NOW=Date.parse('2026-10-22T10:00:00Z');
function client(){let win={fetch:async()=>{throw Error('network')},UthaiLEDRotation:{requestBackendData:async()=>({ok:false})}};
let c=vm.createContext({window:win,fetch:win.fetch,Date,Math,Number,Set,URLSearchParams,AbortController,setTimeout,clearTimeout,Promise,Error,Intl});
vm.runInContext(src,c);return win.UthApiClient;}
function record(t,level){return {status:'ok',stationId:471583,levelMsl:level,bankM:3.03,groundMsl:.227,observedAt:t,observedTimeTH:'22/10 16:50',trendPoints:[2.80,level],trendObservedAt:['2026-10-22T06:00:00Z',t],risk:'below_watch'}}
function data(recordHDA){return{schema:1,kind:'LAST_OBSERVATION_NOT_LIVE',stations:{HDA004:recordHDA,S5:{stationId:2607,status:'missing',trendPoints:[],trendObservedAt:[]}}};}
test('correctly transforms 2 public Sheet observations into a readable history',()=>{
let api=client();const raw=data(record('2026-10-22T09:50:00Z',2.90));const s=api.validateWaterHistory(raw,NOW);
assert.equal(s.out.stations.HDA004.status,'ok');assert.equal(s.out.stations.HDA004.levelMsl,2.90);
assert.equal(s.out.stations.HDA004.trendPoints.length,2);assert.equal(s.out.stations.S5.levelMsl,null);
});
test('3h-old source data becomes historical with NO present safety classification',()=>{
let api=client(),r=record('2026-10-22T06:00:00Z',2.9);
let x=api.validateWaterHistory(data(r),NOW).out.stations.HDA004;
assert.equal(x.status,'historical');assert.equal(x.risk,'unassessed');assert.equal(x.levelMsl,2.9);
});
test('last saved measurement older than 48h remains historical with the original observation time',()=>{
 let api=client(),r=record('2026-10-15T06:00:00Z',0);
 let x=api.validateWaterHistory(data(r),NOW).out.stations.HDA004;
 assert.equal(x.status,'historical');assert.equal(x.levelMsl,0);
 assert.equal(x.observedAt,'2026-10-15T06:00:00Z');
 assert.equal(x.risk,'unassessed');
});
test('missing or future observation time cannot become latest-available value',()=>{
 let api=client(),r=record('2099-10-15T06:00:00Z',2.1);
 let x=api.validateWaterHistory(data(r),NOW).out.stations.HDA004;
 assert.equal(x.status,'missing');assert.equal(x.levelMsl,null);
});

test('station mismatch and invalid payload fail closed',()=>{
let api=client(),r=record('2026-10-22T09:50:00Z',2.9);r.stationId=2607;
assert.throws(()=>api.validateWaterHistory(data(r),NOW),/invalid water station/);
assert.throws(()=>api.validateWaterHistory({schema:0,stations:{}},NOW),/invalid Sheet water contract/);
});
test('the only upstream water URL in frontend is static GitHub fallback and Sheets public reader',()=>{
assert.match(src,/water-data\/water\.json/);
assert.match(src,/action=water_history/);
assert.doesNotMatch(src,/api-v3\.thaiwater\.net\/api\/v1/);
});
