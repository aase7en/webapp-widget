const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const text=fs.readFileSync(path.join(__dirname,'../apps-script/WaterHistory.gs'),'utf8');
const HEADER=['batch_key','batch_date','slot','location_id','station_code','station_id','station_name_th','level_msl_m','observed_at_th','fetched_at_utc','reading_status','provider','source_url','bank_msl_m','ground_msl_m','datum','location_relation','saved_at_utc'];
const TIME=Date.parse('2026-10-22T00:00:00.000Z'); // 07:00 Asia/Bangkok
const data=(hour='2026-10-22 06:40')=>({waterlevel_data:{result:'OK',data:[
 {station:{id:471583,tele_station_oldcode:'HDA004',min_bank:3.03,ground_level:.227},waterlevel_datetime:hour,waterlevel_msl:2.93},
 {station:{id:2607,tele_station_oldcode:'S.5',min_bank:4.7,ground_level:-8.59},waterlevel_datetime:hour,waterlevel_msl:2.87}
]}});
function harness(sheetId='1kBUKdezfAxIziq167e-RJV1nNZkeiaz6YQcpVAMja9w'){
 let values=[HEADER],called=0,answers={},triggers=[],props=new Map();
 const sh={getLastRow:()=>values.length,getLastColumn:()=>HEADER.length,deleteRows:(row,count)=>values.splice(row-1,count),appendRow:r=>{values.push(r.slice())},getRange:(row,col,rows,cols)=>({getValues:()=>Array.from({length:rows},(_,i)=>Array.from({length:cols},(_,j)=>values[i+row-1]?.[j+col-1]??''))})};
 class Clock extends Date{constructor(...args){super(...(args.length?args:[TIME]))} static now(){return TIME}}
 const installer={timeBased(){return this},inTimezone(){return this},atHour(h){this.hour=h;return this},nearMinute(){return this},everyDays(){return this},create(){triggers.push(this.hour)}};
 const env={Date:Clock,JSON,Math,Object,Array,Number,String,RegExp,Set,Error,parseInt,isFinite,
 PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.has(k)?props.get(k):null,setProperty:(k,v)=>props.set(k,v)})},
 SpreadsheetApp:{openById:()=>({getId:()=>sheetId,getSheetByName:n=>n==='Water_Level_History'?sh:n==='Settings'?{
   getLastRow:()=>6,getRange:()=>({getValues:()=>[['key','value'],['active_location_id','uthai'],['history_morning_hour',6],['history_evening_hour',16],['timezone','Asia/Bangkok'],['config_version',1]]})
  }:null})},
 Utilities:{formatDate:(d,tz,f)=>f==='H'?'7':'2026-10-22'},
 LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
 UrlFetchApp:{fetch:u=>{called++;if(!answers[u])throw Error('HTTP 429');return{getResponseCode:()=>answers[u].status||200,getContentText:()=>JSON.stringify(answers[u].data)}}},
 Logger:{log:()=>{}},
 Session:{getActiveUser:()=>({getEmail:()=> 'owner@example.test'}),getEffectiveUser:()=>({getEmail:()=> 'owner@example.test'})},
 ScriptApp:{getProjectTriggers:()=>triggers.map(()=>({getHandlerFunction:()=> 'WaterHistorySync_'})),newTrigger:()=>Object.create(installer)},
 ContentService:{MimeType:{TEXT:'TEXT',JSON:'JSON',JAVASCRIPT:'JAVASCRIPT'},createTextOutput:src=>({getContent:()=>src,setMimeType(){return this}})}
 };
 vm.createContext(env);vm.runInContext(text,env);
 return {env,values,answers,triggers,calls:()=>called};
}
const PRIMARY='https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load';
test('source ID and date validation; null is not 0',()=>{const x=harness().env.WaterHistory;
 assert.equal(Object.keys(x.parse(data(),TIME)).length,2);
 const bad=data('2026-02-30 06:40');assert.equal(Object.keys(x.parse(bad,TIME)).length,0);
 const future=data('2099-10-22 06:40');assert.equal(Object.keys(x.parse(future,TIME)).length,0);
 const fake=data();fake.waterlevel_data.data[0].station.tele_station_oldcode='S.5';fake.waterlevel_data.data[1].waterlevel_msl='**';
 assert.equal(Object.keys(x.parse(fake,TIME)).length,0);
});
test('twice daily sync writes two true station rows; deduplicates reruns',()=>{const h=harness();h.answers[PRIMARY]={data:data()};const r=h.env.WaterHistory.sync();
 assert.equal(r.stored,2);assert.equal(h.values.length,3);assert.equal(h.calls(),1);
 assert.equal(h.values[1][4],'HDA004');assert.equal(h.values[1][7],2.93);
 assert.equal(h.values[1][8],'2026-10-22 06:40');assert.equal(h.values[1][10],'LATEST');
 assert.equal(h.env.WaterHistory.sync().stored,0);assert.equal(h.values.length,3);
});
test('HII API HTTP 429 preserves the previous stored Sheet reading, makes no new rows and never fetches a second source',()=>{
 const h=harness();
 h.values.push(['old','2026-10-21','evening','uthai','HDA004',471583,'name',2.7,'2026-10-21 17:00','','HISTORICAL','ThaiWater/HII',PRIMARY,3.03,.227,'MSL','reference','']);
 assert.throws(()=>h.env.WaterHistory.sync(),/NO_VERIFIED_STATION/);
 assert.equal(h.calls(),1);
 assert.equal(h.values.length,2);
 assert.equal(h.values[1][7],2.7);
 const r=h.env.WaterHistory.read(TIME).stations.HDA004;
 assert.equal(r.levelMsl,2.7);assert.equal(r.status,'historical');
});
test('provider failure keeps stored history and does not replace it with zero',()=>{const h=harness();
 h.values.push(['old','2026-10-21','evening','uthai','S5',2607,'name',2.7,'2026-10-21 17:00']);
 assert.throws(()=>h.env.WaterHistory.sync(),/NO_VERIFIED_STATION/);
 assert.equal(h.values.length,2);assert.equal(h.values[1][7],2.7);
});
test('public read is Sheet-only, provides source times and honest history for 2 points',()=>{
 const h=harness();h.answers[PRIMARY]={data:data()};
 h.env.WaterHistory.sync();
 const more=data('2026-10-22 06:20');more.waterlevel_data.data[0].waterlevel_msl=2.8;
 const x=h.env.WaterHistory.parse(more,TIME);
 h.values.push(['older','2026-10-22','morning','uthai','HDA004',471583,'name',x.HDA004.level,x.HDA004.time,'','LATEST','ThaiWater/HII',PRIMARY,x.HDA004.bank,x.HDA004.ground,'MSL','reference','']);
 const calls=h.calls(),out=h.env.WaterHistory.read(TIME);
 assert.equal(h.calls(),calls);assert.equal(out.stations.HDA004.status,'ok');
 assert.equal(out.stations.HDA004.trendPoints.length,2);
 assert.equal(out.stations.S5.trendPoints.length,1);
 assert.match(out.stations.HDA004.observedAt,/Z$/);
});
test('JSONP rejects injection; water schedule reuses existing BackendApiHistoryBatch trigger',()=>{
 const h=harness();assert.equal(h.env.waterHistoryRead_({parameter:{callback:'x);alert(1)//'}}).getContent(),'Invalid callback');
 assert.match(h.env.waterHistoryRead_({parameter:{callback:'verifiedCb1'}}).getContent(),/^verifiedCb1\(\{/);
 assert.doesNotMatch(text,/ScriptApp\.newTrigger|deleteTrigger|function installWaterHistoryTriggers/);
 const base=fs.readFileSync(path.join(__dirname,'../apps-script/BackendApi.gs'),'utf8');
 assert.match(base,/function BackendApiHistoryBatch_\(\)\s*\{[\s\S]{0,400}WaterHistory\.sync\(\)/);
});
test('cannot read unrelated sheet',()=>{const h=harness('another_sheet_id');
 assert.throws(()=>h.env.WaterHistory.read(TIME),/CANONICAL_SHEET_REQUIRED/);
});


test('typed Google Sheets DATE_TIME cells are parsed as observed-at Bangkok time without dropping latest rows',()=>{
 const h=harness();
 h.answers[PRIMARY]={data:data()};
 h.env.WaterHistory.sync();
 const original='2026-10-22 06:40';
 // User-entered seed row stays text. Scheduled rows are auto-converted by
 // Sheets to DATE_TIME effectiveValue, returned as Date by getValues().
 h.values[1][8]=new Date('2026-10-21T23:40:00.000Z');
 const out=h.env.WaterHistory.read(TIME).stations.HDA004;
 assert.equal(out.levelMsl,2.93);
 assert.equal(out.status,'ok');
 assert.equal(out.observedTimeTH,'22/10 06:40');
 assert.equal(out.observedAt,'2026-10-21T23:40:00.000Z');
 assert.equal(out.trendPoints.length,1);
 assert.equal(out.risk,'unassessed'); // Never invent a flood threshold.
 assert.equal(h.env.WaterHistory.sync().stored,0,'Date typed row must dedupe on next schedule');
 assert.equal(h.values.length,3);
});

test('mixed text and Date cells, invalid timestamps and unknown thresholds preserve history integrity',()=>{
 const h=harness();
 h.answers[PRIMARY]={data:data()};
 h.env.WaterHistory.sync();
 const older=['older','2026-10-22','morning','uthai','HDA004',471583,'name',2.81,
   '2026-10-22 06:20','','LATEST','ThaiWater/HII',PRIMARY,3.03,.227,'MSL','reference',''];
 const invalid=older.slice();invalid[8]=new Date(NaN);invalid[7]=0;
 h.values.push(older,invalid);
 // Sheets converts the latest timestamp to Date on the server.
 h.values[1][8]=new Date('2026-10-21T23:40:00Z');
 const out=h.env.WaterHistory.read(TIME).stations.HDA004;
 assert.deepEqual(Array.from(out.trendPoints),[2.81,2.93]);
 assert.equal(out.risk,'unassessed');
 assert.equal(out.levelMsl,2.93);
});

test('latest stored value survives beyond 48h as historical; 7-day graph uses only recent real points',()=>{
 const h=harness();h.answers[PRIMARY]={data:data()};
 h.env.WaterHistory.sync();
 const old=Date.parse('2026-12-02T00:00:00Z');
 const got=h.env.WaterHistory.read(old).stations.HDA004;
 assert.equal(got.status,'historical');
 assert.equal(got.levelMsl,2.93);
 assert.equal(got.observedAt,'2026-10-21T23:40:00.000Z');
 assert.equal(got.risk,'unassessed');
 assert.equal(got.trendPoints.length,0);
});

test('only scheduled HII API is queried and loss of API cannot switch to shadow transport',()=>{
 assert.doesNotMatch(text,/water-data\/water\.json|\[URL,BACKUP\]/);
 assert.match(text,/\[URL\]\.forEach/);
});

test('hourly collector shares the one-hour provider gate with the legacy collector',()=>{const h=harness();h.answers[PRIMARY]={data:data()};assert.equal(h.env.WaterHistory.syncHourly().stored,2);assert.equal(h.env.WaterHistory.sync().stored,0);assert.equal(h.calls(),1)});

test('hourly cleanup removes only expired scheduled water readings and preserves backfill',()=>{const h=harness();const old=['old','2026-01-01','hourly','uthai','HDA004',471583,'name',2.7,'2026-01-01 17:00','','HISTORICAL','ThaiWater/HII',PRIMARY,3.03,.227,'MSL','reference',''];const back=old.slice();back[10]='VERIFIED_BACKFILL';h.values.push(old,back);h.answers[PRIMARY]={data:data()};h.env.WaterHistory.syncHourly();assert.equal(h.values.filter(r=>r[8]==='2026-01-01 17:00').length,1);assert.equal(h.values[1][10],'VERIFIED_BACKFILL')});
test('failed HII request is not retried within the same hourly window',()=>{const h=harness();assert.throws(()=>h.env.WaterHistory.syncHourly(),/NO_VERIFIED_STATION/);const retry=h.env.WaterHistory.syncHourly();assert.equal(retry.reason,'attempt_throttled');assert.equal(h.calls(),1)});
