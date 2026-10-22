const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const text=fs.readFileSync(path.join(__dirname,'../apps-script/WaterHistory.gs'),'utf8');
const HEADER=['batch_key','batch_date','slot','location_id','station_code','station_id','station_name_th','level_msl_m','observed_at_th','fetched_at_utc','reading_status','provider','source_url','bank_msl_m','ground_msl_m','datum','location_relation','saved_at_utc'];
const TIME=Date.parse('2026-10-22T00:00:00.000Z'); // 07:00 Asia/Bangkok
const data=(hour='2026-10-22 06:40')=>({waterlevel_data:{result:'OK',data:[
 {station:{id:471583,tele_station_oldcode:'HDA004',min_bank:3.03,ground_level:.227},waterlevel_datetime:hour,waterlevel_msl:2.93},
 {station:{id:2607,tele_station_oldcode:'S.5',min_bank:4.7,ground_level:-8.59},waterlevel_datetime:hour,waterlevel_msl:2.87}
]}});
function harness(sheetId='1kBUKdezfAxIziq167e-RJV1nNZkeiaz6YQcpVAMja9w'){
 let values=[HEADER],called=0,answers={},triggers=[];
 const sh={getLastRow:()=>values.length,appendRow:r=>{values.push(r.slice())},getRange:(row,col,rows,cols)=>({getValues:()=>Array.from({length:rows},(_,i)=>Array.from({length:cols},(_,j)=>values[i+row-1]?.[j+col-1]??''))})};
 class Clock extends Date{constructor(...args){super(...(args.length?args:[TIME]))} static now(){return TIME}}
 const installer={timeBased(){return this},inTimezone(){return this},atHour(h){this.hour=h;return this},nearMinute(){return this},everyDays(){return this},create(){triggers.push(this.hour)}};
 const env={Date:Clock,JSON,Math,Object,Array,Number,String,RegExp,Set,Error,parseInt,isFinite,
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
const CACHE='https://raw.githubusercontent.com/aase7en/webapp-widget/water-data/water.json';
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
test('HTTP 429 on primary falls back to verified cache without inventing data',()=>{const h=harness();h.answers[CACHE]={data:data('2026-10-22 06:00')};
 const r=h.env.WaterHistory.sync();assert.equal(r.stored,2);assert.equal(r.sourceErrors,1);
 assert.equal(h.values[1][12],CACHE);
});
test('both sources fail and history never replaced by zero',()=>{const h=harness();
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
