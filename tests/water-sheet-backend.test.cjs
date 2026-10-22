const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');

const SOURCE=fs.readFileSync(path.join(__dirname,'../apps-script/WaterSheetBackend.gs'),'utf8');
const headers={
 water_latest:['station_code','station_id','station_name_th','level_msl_m','observed_at_iso','fetched_at_iso','bank_msl_m','ground_msl_m','provider','source_url','updated_at_utc','record_key'],
 water_history:['record_key','station_code','station_id','station_name_th','level_msl_m','observed_at_iso','fetched_at_iso','bank_msl_m','ground_msl_m','provider','source_url','stored_at_utc','source_status'],
 sync_log:['run_at_utc','trigger','source','success_count','error_code','http_status','notes'],
};
function makeRows(name){const data=[headers[name].slice()];return {
 data,getLastRow:()=>data.length,appendRow:r=>{data.push(r.slice());return data.length},
 getRange:(r,c,n,m)=>({getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>data[r+i-1]?.[c+j-1]??'')),
  setValues:rows=>{for(let i=0;i<rows.length;i++){const ix=r+i-1;while(data.length<=ix)data.push([]);
   rows[i].forEach((v,j)=>data[ix][c+j-1]=v)}}})
};}
function makeHarness(){
 const sheets=Object.fromEntries(Object.keys(headers).map(n=>[n,makeRows(n)]));
 let upstream={},triggerList=[];
 const scripts={
  timeBased(){return this},inTimezone(){return this},atHour(h){this.hour=h;return this},
  nearMinute(){return this},everyDays(){return this},create(){triggerList.push({handler:'syncWaterLevels',hour:this.hour})}
 };
 const context={
  Date,JSON,Math,Object,Number,String,RegExp,Set,Error,
  PropertiesService:{getScriptProperties:()=>({getProperty:()=> 'test_sheet_id_abcdefghijklmnopq'})},
  SpreadsheetApp:{openById:()=>({getSheetByName:n=>sheets[n]})},
  LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock:()=>{}})},
  UrlFetchApp:{fetch:url=>{
   if (!(url in upstream)) throw Error('NETWORK_DOWN');
   const val=upstream[url];return {getResponseCode:()=>val.status||200,getContentText:()=>JSON.stringify(val.body)};
  }},
  ScriptApp:{getProjectTriggers:()=>triggerList.map(t=>({getHandlerFunction:()=>t.handler})),
   newTrigger:()=>scripts},
  ContentService:{MimeType:{TEXT:'text',JSON:'json',JAVASCRIPT:'javascript'},createTextOutput:s=>({
   getContent:()=>s, setMimeType(m){this.mimeType=m;return this}
  })},
 };
 vm.createContext(context);vm.runInContext(SOURCE,context);
 return {c:context,sheets,upstream,triggerList};
}
function payload(when,opts={}){
 return {waterlevel_data:{result:'OK',data:[
  {station:{id:471583,tele_station_oldcode:'HDA004',min_bank:3.03,ground_level:.227},
   waterlevel_datetime:when,waterlevel_msl:opts.level===undefined?2.93:opts.level},
  {station:{id:2607,tele_station_oldcode:'S.5',min_bank:4.7,ground_level:-8.59},
   waterlevel_datetime:when,waterlevel_msl:2.87}
 ]}};
}
function ictString(ms){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(ms)).replace(', ',' ').replace(/\//g,'-');}
function observed(ms){const f=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(ms));const v=Object.fromEntries(f.map(x=>[x.type,x.value]));return v.year+'-'+v.month+'-'+v.day+' '+v.hour+':'+v.minute}
test('strict timestamp rejects invalid dates and future dates',()=>{
 const {c}=makeHarness();
 assert.equal(c.uthTime_('2026-02-30 12:30'),null);
 assert.equal(c.uthTime_('not a date'),null);
 assert.equal(c.uthTime_('2026-10-22 12:30').iso,'2026-10-22T05:30:00.000Z');
 const future=payload('2099-01-01 12:00');
 assert.equal(Object.keys(c.uthExtract_(future,Date.now(),'source')).length,0);
});
test('rejects impossible level, station-code collision and stale observations',()=>{
 const {c}=makeHarness(),now=Date.now(),valid=observed(now-120000);
 assert.equal(Object.keys(c.uthExtract_(payload(valid,{level:'invalid'}),now,'source')).length,1);
 const stale=payload(observed(now-49*3600000));
 assert.equal(Object.keys(c.uthExtract_(stale,now,'source')).length,0);
 const swap=payload(valid);swap.waterlevel_data.data[0].station.tele_station_oldcode='S.5';
 assert.equal(Object.keys(c.uthExtract_(swap,now,'source')).length,1);
});
test('scheduled sync only stores newer validated observations and never replaces with zero on failure',()=>{
 const h=makeHarness(),url='https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load';
 // lexical const not exported through vm context properties by design
 const first=observed(Date.now()-4*60000);
 h.upstream[url]={body:payload(first)};
 let r=h.c.syncWaterLevels(); assert.equal(r.stored,2);
 assert.equal(h.sheets.water_latest.data.length,3);
 assert.equal(h.sheets.water_history.data.length,3);
 assert.equal(h.c.syncWaterLevels().stored,0);
 assert.equal(h.sheets.water_history.data.length,3);
 delete h.upstream[url];
 h.upstream['https://raw.githubusercontent.com/aase7en/webapp-widget/water-data/water.json']={body:payload(first)};
 assert.equal(h.c.syncWaterLevels().stored,0);
 assert.equal(h.sheets.water_latest.data[1][3],2.93);
});
test('total upstream outage fails loudly but preserves latest values',()=>{
 const h=makeHarness(),now=new Date().toISOString();
 h.sheets.water_latest.appendRow(['HDA004',471583,'HDA004 ช่องสะเดา',2.7,now,now,3.03,.227,'ThaiWater/HII','source',now,'x']);
 assert.throws(()=>h.c.syncWaterLevels(),/ALL_SOURCES_UNAVAILABLE/);
 assert.equal(h.sheets.water_latest.data[1][3],2.7);
 assert.equal(h.sheets.sync_log.data.length,2);
 assert.equal(h.sheets.sync_log.data[1][4],'ALL_SOURCES_UNAVAILABLE_OR_OUTDATED');
});
test('last observation is historical after three hours, never live',()=>{
 const h=makeHarness(),now=Date.now(),when=new Date(now-4*3600000).toISOString();
 h.sheets.water_latest.appendRow(['HDA004',471583,'HDA004 ช่องสะเดา',2.91,when,new Date(now).toISOString(),3.03,.227,'ThaiWater/HII','source',new Date(now).toISOString(),'x']);
 let out=h.c.uthReadPublic_(now);
 assert.equal(out.stations.HDA004.status,'historical');
 assert.equal(out.stations.HDA004.levelMslM,2.91);
 assert.equal(out.stations.S5.status,'missing');
 out=h.c.uthReadPublic_(now+49*3600000);
 assert.equal(out.stations.HDA004.status,'missing');assert.equal(out.stations.HDA004.levelMslM,null);
});
test('JSONP rejects injection and accepts safe callback',()=>{
 const h=makeHarness();
 const good=h.c.doGet({parameter:{action:'water',callback:'cb_1'}}).getContent();
 assert.match(good,/^cb_1\(\{/);
 const bad=h.c.doGet({parameter:{action:'water',callback:'x);alert(1)//'}}).getContent();
 assert.equal(bad,'Invalid callback');
});
test('trigger installation is idempotent and creates exactly morning/evening jobs',()=>{
 const h=makeHarness();
 assert.match(h.c.installWaterTriggers(),/Created/);
 assert.deepEqual(h.triggerList.map(x=>x.hour),[6,18]);
 assert.match(h.c.installWaterTriggers(),/Already/);
 assert.equal(h.triggerList.length,2);
});
