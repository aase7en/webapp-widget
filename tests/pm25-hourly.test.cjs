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
 assert.equal(h.calls.fetches.length,1);assert.equal(h.calls.appends.length,1);assert.equal(h.calls.appends[0].row[3],'2026-10-17T06:05+07:00');assert.equal(h.calls.triggerDeletes.length,0);
});
test('untrusted caller cannot run the hourly write',()=>{const h=makeContext({session:{active:'',effective:''}});assert.throws(()=>h.ctx.BackendApiPm25Hourly_({triggerUid:'fake'}),/not authorized/);assert.equal(h.calls.fetches.length,0)});

test('other districts do not cause extra calls and never reuse a wrong district',()=>{const h=makeContext({fetchQueue:[{body:gistdaBody()}]});h.ctx.BackendApi.gistdaPayload(url,false);assert.throws(()=>h.ctx.BackendApi.gistdaPayload('https://pm25.gistda.or.th/rest/getPm25byTambon?ap_idn=1415',false),/hourly gate/);assert.equal(h.calls.fetches.length,1)});
test('polling before each trigger preserves real hourly observations without duplicate provider calls',()=>{
 const tabs=defaultTabs();tabs.History_Batch[0].splice(11,0,'pm25_tambon_name');
 const {openMeteoBody}=require('./backend-harness.cjs');
 const h=makeContext({tabs,triggers:[{handler:'BackendApiPm25Hourly_',id:'hourly'}],fetchQueue:[{body:gistdaBody()},{body:openMeteoBody()},{body:gistdaBody({pm25:25,dt:'2026-10-17T07:05:00.000Z'})},{body:openMeteoBody()}]});
 doGet(h,{action:'data',v:'1'});h.setNow(NOW_MS+60000);h.ctx.BackendApiPm25Hourly_({triggerUid:'hourly'});
 h.setNow(NOW_MS+61*60000);h.outputsReset();doGet(h,{action:'data',v:'1'});h.setNow(NOW_MS+62*60000);h.ctx.BackendApiPm25Hourly_({triggerUid:'hourly'});
 const rows=h.calls.appends.filter(x=>x.sheet==='PM25_Hourly').map(x=>x.row);assert.deepEqual(rows.map(r=>r[3]),['2026-10-17T06:05+07:00','2026-10-17T07:05+07:00']);assert.equal(h.calls.fetches.filter(x=>x.includes('gistda')).length,2);
});
test('legacy sheet writes the real observation time when last-good follows a provider failure',()=>{
 const tabs=defaultTabs();tabs['ชีต1']=[['Timestamp','AQI (US)','PM10 (µg/m³)','PM2.5 (µg/m³)','PM2.5 24hr Avg (µg/m³)']];
 const h=makeContext({tabs,fetchQueue:[{body:gistdaBody()},{code:429}]});h.ctx.BackendApi.gistdaPayload(url,false);h.setNow(NOW_MS+3600000);assert.throws(()=>h.ctx.BackendApi.gistdaPayload(url,false));h.setNow(NOW_MS+3660000);h.ctx.main_();
 const row=h.calls.appends.find(x=>x.sheet==='ชีต1').row;assert.equal(row[0],'2026-10-16T23:05:00.000Z');assert.equal(row[3],20.9);assert.equal(h.calls.fetches.length,2);
});
for(const missingPayloadTime of [false,true])test('legacy writers prefer row observation time '+(missingPayloadTime?'when payload time missing':'when payload time differs'),()=>{
 const tabs=defaultTabs();tabs['ชีต1']=[['Timestamp','AQI (US)','PM10 (µg/m³)','PM2.5 (µg/m³)','PM2.5 24hr Avg (µg/m³)']];tabs['ชีต2']=[['วันที่-เวลา','ตำบล','ค่าเฉลี่ย PM2.5 (24 ชม.)']];
 const payload=JSON.parse(gistdaBody());if(missingPayloadTime)delete payload.datetimeThai;else payload.datetimeThai.timeThai='เวลา 06:30 น.';
 const h=makeContext({tabs,fetchQueue:[{body:JSON.stringify(payload)}]});const data=h.ctx.gistdaForMain_();h.ctx.importDataToSpreadsheet_(data);h.ctx.logPm25ToSheet2_(data);
 assert.equal(h.calls.appends.find(x=>x.sheet==='ชีต1').row[0],'2026-10-16T23:05:00.000Z');assert.equal(h.calls.appends.find(x=>x.sheet==='ชีต2').row[0],'2026-10-16T23:05:00.000Z');
});
test('legacy combined provider path retains the row observation time',()=>{
 const h=makeContext({fetchQueue:[{body:'{}'},{body:'{}'},{body:gistdaBody({datetimeThai:{dateThai:'17 ตุลาคม 2569',timeThai:'06:30 น.'}})}]});const out=h.ctx.fetchAirQualityData();assert.equal(out.gistda.observedMs,Date.parse('2026-10-16T23:05:00Z'));
});

test('visible hourly setup and run entry points enforce owner identity',()=>{const h=makeContext({session:{active:'',effective:''}});assert.throws(()=>h.ctx.installPm25Hourly(),/not the trusted owner/);assert.throws(()=>h.ctx.runPm25HourlyNow(),/not authorized/);assert.equal(h.calls.triggerCreates.length,0);assert.equal(h.calls.fetches.length,0)});

test('retention removes only PM hourly rows older than 90 days and preserves unknown dates and mixed legacy history',()=>{
 const tabs=defaultTabs(),header=['record_type','location_id','pm25_value','pm25_observed_at','pm25_status','pm25_provider','pm25_area_id','pm25_tambon_name','created_at'];
 const row=(timestamp)=>['pm25_hourly_v1','uthai',20,timestamp,'ok','gistda','1414','อุทัย',new Date(NOW_MS).toISOString()];
 tabs.PM25_Hourly=[header,row(new Date(NOW_MS-91*86400000).toISOString()),row(new Date(NOW_MS-90*86400000).toISOString()),row('invalid date')];
 const before=JSON.stringify(tabs.History_Batch),h=makeContext({tabs,triggers:[{handler:'BackendApiPm25Hourly_',id:'hourly'}],fetchQueue:[{code:429}]});
 h.ctx.BackendApiPm25Hourly_({triggerUid:'hourly'});
 assert.equal(JSON.stringify(tabs.History_Batch),before);assert.equal(tabs.PM25_Hourly.length,3);assert.equal(tabs.PM25_Hourly[1][3],new Date(NOW_MS-90*86400000).toISOString());assert.equal(tabs.PM25_Hourly[2][3],'invalid date');assert.deepEqual(h.calls.deleteRows,['PM25_Hourly']);
});

test('incompatible hourly schema never prunes rows',()=>{
 const tabs=defaultTabs();tabs.PM25_Hourly=[['unknown'],['old']];const h=makeContext({tabs,triggers:[{handler:'BackendApiPm25Hourly_',id:'hourly'}]});h.ctx.BackendApiPm25Hourly_({triggerUid:'hourly'});assert.equal(h.calls.deleteRows.length,0);assert.equal(h.calls.fetches.length,0);
});

test('retention keeps unowned rows and refuses rows with extra mixed data',()=>{
 const header=['record_type','location_id','pm25_value','pm25_observed_at','pm25_status','pm25_provider','pm25_area_id','pm25_tambon_name','created_at'];
 for(const extra of [false,true]){const tabs=defaultTabs(),row=['other','uthai',20,new Date(NOW_MS-91*86400000).toISOString(),'ok','gistda','1414','อุทัย',''];if(extra){row[0]='pm25_hourly_v1';header.push('water_station_id');row.push('HDA004')}tabs.PM25_Hourly=[header.slice(),row];const h=makeContext({tabs,triggers:[{handler:'BackendApiPm25Hourly_',id:'hourly'}]});h.ctx.BackendApiPm25Hourly_({triggerUid:'hourly'});assert.equal(tabs.PM25_Hourly.length,2);assert.equal(h.calls.deleteRows.length,0);if(extra)header.pop()}
});
test('malformed hourly tab does not hide valid legacy observations',()=>{const tabs=defaultTabs(),head=tabs.History_Batch[0];head.splice(11,0,'pm25_tambon_name');const row=Array(head.length).fill('');for(const [k,v] of Object.entries({location_id:'uthai',pm25_value:20,pm25_observed_at:'2026-10-16T22:00:00Z',pm25_status:'ok',pm25_provider:'gistda',pm25_area_id:'1414',pm25_tambon_name:'อุทัย'}))row[head.indexOf(k)]=v;tabs.History_Batch.push(row);tabs.PM25_Hourly=[['wrong']];const h=makeContext({tabs});doGet(h,{action:'pm25_history'});const data=JSON.parse(h.outputs()[0].text);assert.equal(data.status,'ok');assert.equal(data.points.length,1)});

test('malformed owned rows are preserved and unowned rows never appear as real history',()=>{
 const tabs=defaultTabs(),header=['record_type','location_id','pm25_value','pm25_observed_at','pm25_status','pm25_provider','pm25_area_id','pm25_tambon_name','created_at'];
 const old=new Date(NOW_MS-91*86400000).toISOString(),recent=new Date(NOW_MS-3600000).toISOString();
 tabs.PM25_Hourly=[header,['pm25_hourly_v1','uthai','not a number',old,'bad','other','1414','อุทัย','bad'],['other','uthai',77,recent,'ok','gistda','1414','อุทัย',recent]];
 tabs.History_Batch[0].splice(11,0,'pm25_tambon_name');
 const h=makeContext({tabs,triggers:[{handler:'BackendApiPm25Hourly_',id:'hourly'}]});h.ctx.BackendApiPm25Hourly_({triggerUid:'hourly'});assert.equal(tabs.PM25_Hourly.length,3);assert.equal(h.calls.deleteRows.length,0);doGet(h,{action:'pm25_history'});assert.equal(JSON.parse(h.outputs()[0].text).points.length,0);
});

test('a damaged tab read does not hide valid data from another tab',()=>{
 const tabs=defaultTabs();tabs.PM25_Hourly=[['record_type','location_id','pm25_value','pm25_observed_at','pm25_status','pm25_provider','pm25_area_id','pm25_tambon_name','created_at'],['pm25_hourly_v1','uthai',20,'2026-10-16T22:00:00Z','ok','gistda','1414','อุทัย','2026-10-16T22:10:00Z']];const h=makeContext({tabs,readErrorSheets:['History_Batch']});doGet(h,{action:'pm25_history'});const result=JSON.parse(h.outputs()[0].text);assert.equal(result.status,'ok');assert.equal(result.points.length,1);
});

test('unowned, malformed and different source rows do not block real hourly recording',()=>{
 const header=['record_type','location_id','pm25_value','pm25_observed_at','pm25_status','pm25_provider','pm25_area_id','pm25_tambon_name','created_at'];
 for(const variant of ['unowned','malformed','different-area']){
  const tabs=defaultTabs(),row=['pm25_hourly_v1','uthai',20,'2026-10-17T06:05+07:00','ok','gistda','1414','อุทัย','2026-10-17T06:10+07:00'];
  if(variant==='unowned')row[0]='other';if(variant==='malformed')row[2]='not-a-number';if(variant==='different-area')row[6]='1415';
  tabs.PM25_Hourly=[header.slice(),row];const h=makeContext({tabs,triggers:[{handler:'BackendApiPm25Hourly_',id:'hourly'}],fetchQueue:[{body:gistdaBody()}]});
  h.ctx.BackendApiPm25Hourly_({triggerUid:'hourly'});assert.equal(h.calls.appends.filter(x=>x.sheet==='PM25_Hourly').length,1,variant);
 }
});

test('malformed location and area identifiers are not removed',()=>{const header=['record_type','location_id','pm25_value','pm25_observed_at','pm25_status','pm25_provider','pm25_area_id','pm25_tambon_name','created_at'], old=new Date(NOW_MS-91*86400000).toISOString(),created=new Date(NOW_MS).toISOString(),tabs=defaultTabs();tabs.PM25_Hourly=[header,['pm25_hourly_v1','bad location',20,old,'ok','gistda','1414','อุทัย',created],['pm25_hourly_v1','uthai',20,old,'ok','gistda','BAD-DISTRICT','อุทัย',created]];const h=makeContext({tabs,triggers:[{handler:'BackendApiPm25Hourly_',id:'hourly'}]});h.ctx.BackendApiPm25Hourly_({triggerUid:'hourly'});assert.equal(tabs.PM25_Hourly.length,3);assert.equal(h.calls.deleteRows.length,0)});
