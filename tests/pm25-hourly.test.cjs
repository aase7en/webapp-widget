'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {makeContext,doGet,defaultTabs,gistdaBody,NOW_MS}=require('./backend-harness.cjs');
const url='https://pm25.gistda.or.th/rest/getPm25byTambon?ap_idn=1414';
test('successful fetch, legacy reads and cache eviction cannot exceed the hourly gate',()=>{
 const h=makeContext({fetchQueue:[{body:gistdaBody()},{body:gistdaBody({pm25:33})}]});
 assert.equal(h.ctx.BackendApi.gistdaPayload(url,false).data[4].pm25,20.9);
 h.setNow(NOW_MS+1800000);assert.equal(h.ctx.gistdaForMain_().gistda.pm25,20.9);assert.equal(h.calls.fetches.length,1);
 h.cacheStore.clear();assert.equal(h.ctx.BackendApi.gistdaPayload(url,false).data[4].pm25,20.9);assert.equal(h.calls.fetches.length,1);
 h.setNow(NOW_MS+3600000);assert.equal(h.ctx.BackendApi.gistdaPayload(url,false).data[4].pm25,33);assert.equal(h.calls.fetches.length,2);
});
test('failed upstream attempt is also throttled for a full hour',()=>{
 const h=makeContext({fetchQueue:[{code:429},{body:gistdaBody()}]});
 assert.throws(()=>h.ctx.BackendApi.gistdaPayload(url,false));h.setNow(NOW_MS+120000);assert.throws(()=>h.ctx.BackendApi.gistdaPayload(url,false));assert.equal(h.calls.fetches.length,1);
 h.setNow(NOW_MS+3600000);assert.equal(h.ctx.BackendApi.gistdaPayload(url,false).data[4].pm25,20.9);assert.equal(h.calls.fetches.length,2);
});
test('history response uses real recent observations for active location, without filling gaps',()=>{
 const tabs=defaultTabs(),head=tabs.History_Batch[0];head.splice(11,0,'pm25_tambon_name');
 const row=(id,value,observed,status)=>{const r=Array(head.length).fill('');r[head.indexOf('location_id')]=id;r[head.indexOf('pm25_value')]=value;r[head.indexOf('pm25_observed_at')]=observed;r[head.indexOf('pm25_status')]=status;r[head.indexOf('pm25_provider')]='gistda';r[head.indexOf('pm25_area_id')]='1414';r[head.indexOf('pm25_tambon_name')]='อุทัย';return r};
 const wrong=row('uthai',99,'2026-10-16T23:00:00Z','ok');wrong[head.indexOf('pm25_area_id')]='9999';tabs.History_Batch.push(row('uthai',20,'2026-10-16T22:00:00Z','ok'),row('elsewhere',99,'2026-10-16T23:00:00Z','ok'),row('uthai',null,'2026-10-16T23:00:00Z','missing'),wrong);
 const h=makeContext({tabs});doGet(h,{action:'pm25_history'});const data=JSON.parse(h.outputs()[0].text);assert.equal(data.status,'ok');assert.deepEqual(data.points,[{value:20,observedAt:'2026-10-16T22:00:00.000Z'}]);assert.equal(h.calls.fetches.length,0);
});

test('hourly trigger installs once without deleting existing triggers',()=>{
 const h=makeContext({triggers:[{handler:'existingWater',id:'water'}]});
 assert.equal(h.ctx.BackendApiInstallPm25Hourly_().hourlyTriggerCount,1);assert.equal(h.ctx.BackendApiInstallPm25Hourly_().hourlyTriggerCount,1);
 assert.equal(h.calls.triggerCreates.length,1);assert.equal(h.calls.triggerCreates[0].hours,1);assert.equal(h.calls.triggerDeletes.length,0);
});
test('scheduled hourly write keeps observation time and deduplicates without mutating other triggers',()=>{
 const tabs=defaultTabs();tabs.History_Batch[0].splice(11,0,'pm25_tambon_name');
 const h=makeContext({tabs,triggers:[{handler:'BackendApiPm25Hourly_',id:'hourly'}],session:{active:'',effective:''},fetchQueue:[{body:gistdaBody()}]});
 h.ctx.BackendApiPm25Hourly_({triggerUid:'hourly'});h.ctx.BackendApiPm25Hourly_({triggerUid:'hourly'});
 assert.equal(h.calls.fetches.length,1);assert.equal(h.calls.appends.length,1);assert.equal(h.calls.appends[0].row[7],'2026-10-17T06:05+07:00');assert.equal(h.calls.triggerDeletes.length,0);
});
test('untrusted caller cannot run the hourly write',()=>{const h=makeContext({session:{active:'',effective:''}});assert.throws(()=>h.ctx.BackendApiPm25Hourly_({triggerUid:'fake'}),/not authorized/);assert.equal(h.calls.fetches.length,0)});

test('other districts do not cause extra calls and never reuse a wrong district',()=>{const h=makeContext({fetchQueue:[{body:gistdaBody()}]});h.ctx.BackendApi.gistdaPayload(url,false);assert.throws(()=>h.ctx.BackendApi.gistdaPayload('https://pm25.gistda.or.th/rest/getPm25byTambon?ap_idn=1415',false),/hourly gate/);assert.equal(h.calls.fetches.length,1)});
test('polling before each trigger preserves real hourly observations without duplicate provider calls',()=>{
 const tabs=defaultTabs();tabs.History_Batch[0].splice(11,0,'pm25_tambon_name');
 const {openMeteoBody}=require('./backend-harness.cjs');
 const h=makeContext({tabs,triggers:[{handler:'BackendApiPm25Hourly_',id:'hourly'}],fetchQueue:[{body:gistdaBody()},{body:openMeteoBody()},{body:gistdaBody({pm25:25,dt:'2026-10-17T07:05:00.000Z'})},{body:openMeteoBody()}]});
 doGet(h,{action:'data',v:'1'});h.setNow(NOW_MS+60000);h.ctx.BackendApiPm25Hourly_({triggerUid:'hourly'});
 h.setNow(NOW_MS+61*60000);h.outputsReset();doGet(h,{action:'data',v:'1'});h.setNow(NOW_MS+62*60000);h.ctx.BackendApiPm25Hourly_({triggerUid:'hourly'});
 const rows=h.calls.appends.filter(x=>x.sheet==='History_Batch').map(x=>x.row);assert.deepEqual(rows.map(r=>r[7]),['2026-10-17T06:05+07:00','2026-10-17T07:05+07:00']);assert.equal(h.calls.fetches.filter(x=>x.includes('gistda')).length,2);
});
