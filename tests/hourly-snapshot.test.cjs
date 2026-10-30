'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('apps-script/HourlySnapshot.gs','utf8');
const now=Date.parse('2026-10-30T10:00:00Z');
const H=['record_type','location_id','location_fingerprint','channel','observed_at','saved_at','payload_json'];
function setup(rows=[H],opts={}) {
 const data=rows.map(r=>r.slice()),calls={fetches:0,deletions:[],appends:0};const cache=new Map();
 const sh={getLastRow:()=>data.length,getRange(row,col,n){return {getValues:()=>data.slice(row-1,row-1+(n||1)).map(r=>r.slice()),setValues:v=>{data[0]=v[0]}}},getDataRange(){return {getValues:()=>data.map(r=>r.slice())}},deleteRows(start,n){calls.deletions.push([start,n]);data.splice(start-1,n)},appendRow(r){calls.appends++;data.push(r)}};
 const book={getSheetByName:()=>sh,insertSheet:()=>sh};
 const cfg={ok:true,active:{id:'uthai',lat:14.36147,lon:100.64424}};
 const properties=new Map(),MockDate=class extends Date {constructor(...args){super(...(args.length?args:[now]))}static now(){return now}};
 const ContentService={MimeType:{TEXT:'text',JSON:'json',JAVASCRIPT:'js'},createTextOutput:text=>({text,setMimeType(type){this.type=type;return this}})};
 const ctx={Date:MockDate,JSON,Math,Array,Object,String,Number,isFinite,encodeURIComponent,Error,ContentService,
  BackendApi:{loadConfig:()=>cfg,locationFingerprint:()=> 'abc123',isOwnerSession:()=>!!opts.owner,getCachedPm:()=>{calls.fetches++;return {status:'ok',value:22,observedAt:new Date(now).toISOString()}}},
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>properties.has(k)?properties.get(k):null,setProperty:(k,v)=>properties.set(k,v)})},CacheService:{getScriptCache:()=>({get:k=>cache.get(k)||null,put:(k,v)=>cache.set(k,v)})},SpreadsheetApp:{openById:()=>book},ScriptApp:{getProjectTriggers:()=>[]},LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},Utilities:{formatDate:()=> '2026-10-30'},UrlFetchApp:{fetch(url){calls.fetches++;if(opts.forecast&&String(url).includes('api.open-meteo.com'))return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(opts.forecast)};throw Error('offline')}}};
 vm.runInNewContext(source,ctx);return{api:ctx.HourlySnapshot,data,calls};
}
const row=(channel,time,payload={value:22})=>['widget_snapshot_v1','uthai','abc123',channel,time,time,JSON.stringify(payload)];
test('unauthorized caller cannot query or write any provider',()=>{const h=setup();assert.throws(()=>h.api.collect({}),/not authorized/);assert.equal(h.calls.fetches,0);assert.equal(h.calls.appends,0)});
test('snapshot read is read-only and rejects stale or wrong-location observations',()=>{const fresh=new Date(now-3600000).toISOString(),old=new Date(now-4*3600000).toISOString(),wrong=row('weather',fresh);wrong[1]='other';const h=setup([H,row('pm25',old),row('pm25',fresh),wrong]);const result=h.api.read(now);assert.equal(result.channels.pm25.data.value,22);assert.equal(result.channels.weather,undefined);assert.equal(h.calls.fetches,0);assert.equal(h.calls.appends,0)});
test('pruning removes only valid expired rows and preserves unknown or malformed data',()=>{const old=new Date(now-91*86400000).toISOString(),fresh=new Date(now-3600000).toISOString(),unknown=row('pm25',old);unknown[0]='unknown';const broken=row('weather',old);broken[6]='bad';const h=setup([H,row('pm25',old),unknown,broken,row('pm25',fresh)]);h.api.prune({deleteRows:(i,n)=>{h.calls.deletions.push([i,n]);h.data.splice(i-1,n)}},h.data.map(r=>r.slice()),now);assert.equal(h.data.length,4);assert.equal(h.data[1][0],'unknown');assert.equal(h.data[2][6],'bad');assert.equal(h.calls.deletions.length,1)});

test('failed weather forecast does not trigger repeated provider calls within an hour',()=>{const h=setup([H],{owner:true});const first=h.api.collect({});assert.equal(first.written,1);assert.equal(h.calls.fetches,2);const second=h.api.collect({});assert.equal(second.reason,'attempt_throttled');assert.equal(h.calls.fetches,2);assert.equal(h.calls.appends,1)});

test('public JSONP read rejects executable callbacks and never calls providers',()=>{const fresh=new Date(now-3600000).toISOString(),h=setup([H,row('pm25',fresh)]);let result=h.api.web({parameter:{callback:'x);alert(1)//'}});assert.equal(result.type,'text');assert.equal(result.text,'Invalid callback');result=h.api.web({parameter:{callback:'widget_cb'}});assert.equal(result.type,'js');assert.match(result.text,/^widget_cb\(/);assert.equal(h.calls.fetches,0);assert.equal(h.calls.appends,0)});

test('forecast snapshots expire after two days while weather history retains 90 days',()=>{const age=new Date(now-3*86400000).toISOString(),h=setup([H,row('forecast',age),row('weather',age)]);h.api.prune({deleteRows:(i,n)=>h.data.splice(i-1,n)},h.data.map(r=>r.slice()),now);assert.equal(h.data.length,2);assert.equal(h.data[1][3],'weather')});

test('cached data cannot remain current after its source time expires',()=>{const stamp=new Date(now-2*3600000).toISOString(),h=setup([H,row('pm25',stamp)]);assert.equal(h.api.read(now).status,'ok');assert.equal(h.api.read(now+2*3600000).status,'unavailable');assert.equal(h.calls.fetches,0)});

test('one weather response supplies both current conditions and forecast',()=>{const forecast={timezone:'Asia/Bangkok',current_units:{temperature_2m:'°C',relative_humidity_2m:'%'},current:{time:'2026-10-30T17:00',temperature_2m:30,relative_humidity_2m:70,weather_code:3},hourly:{time:['2026-10-30T18:00']},daily:{time:['2026-10-30'],temperature_2m_max:[33],temperature_2m_min:[25],precipitation_probability_max:[80]}};const h=setup([H],{owner:true,forecast});const result=h.api.collect({});assert.equal(result.written,3);assert.equal(h.data.find(r=>r[3]==='weather')[6].includes('temperatureC'),true);assert.equal(h.calls.fetches,3)});
