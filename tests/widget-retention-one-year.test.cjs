'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const js=fs.readFileSync('apps-script/WidgetRetention.gs','utf8');
const NOW=Date.parse('2026-11-21T15:00:00Z');
const HEADER=['batch_id','batch_date','slot','location_id','lat','lon','pm25_value','pm25_observed_at','pm25_status','pm25_provider','pm25_area_id','pm25_tambon_name','wx_temp_c','wx_rh_pct','wx_code','wx_observed_at','wx_status','wx_provider','water_status','water_station_id','water_datum','created_at'];
function row(date,slot='morning',opts={}){
 const r=Array(22).fill('');r[0]=date+':'+slot;r[1]=date;r[2]=slot;r[3]='uthai';r[21]='2026-11-21T14:00:00.000Z';
 if(opts.invalid)r[0]='hand-entered';return r;
}
function harness(initial,opts={}){
 const data=initial.map(x=>x.slice()),props=new Map(),deleted=[];
 if(opts.enabled)props.set('widget_retention_mode_v1','APPROVED_AFTER_BACKUP');
 if(opts.backup)props.set('widget_retention_backup_verified_at_v1',new Date(NOW-3600000).toISOString());
 const sh={getLastColumn:()=>opts.extraCol?23:22,getLastRow:()=>data.length,
   getDataRange:()=>({getValues:()=>data.map(x=>x.slice())}),
   deleteRows:(first,count)=>{deleted.push([first,count]);data.splice(first-1,count)}};
 const context={
  Date,JSON,Math,Number,String,Array,Object,Error,isFinite,
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k)||null})},
  Utilities:{formatDate:(d,tz,pattern)=>{assert.equal(tz,'Asia/Bangkok');assert.equal(pattern,'yyyy-MM-dd');return new Date(d.getTime()+7*3600000).toISOString().slice(0,10)}},
  SpreadsheetApp:{openById:id=>({getSheetByName:name=>{assert.equal(name,'History_Batch');return sh}})},
  BackendApi:{assertTrustedCaller:()=>{}}
 };
 vm.createContext(context);vm.runInContext(js,context);
 return {api:context.WidgetRetention,sh,data,deleted,props,preview:()=>context.widgetRetentionPreview_()};
}
test('retention 365d inclusive boundary, original data untouched under dry-run',()=>{
 const rows=[HEADER,row('2025-11-20'),row('2025-11-21'),row('2026-11-20')];
 const x=harness(rows),plan=x.api.plan(x.data,NOW);
 assert.equal(plan.cutoffExclusive,'2025-11-21');assert.equal(plan.eligibleCount,1);
 assert.equal(plan.totalDataRows,3);assert.equal(x.api.pruneSheet(x.sh,x.data,NOW).deleted,0);
 assert.equal(x.preview().eligibleCount,1);assert.equal(x.data.length,4);assert.equal(x.deleted.length,0);
});
test('an authorized removal mode without verified backup does NOT delete',()=>{
 for(const [enabled,backup] of [[false,false],[true,false],[false,true]]){
  const x=harness([HEADER,row('2024-01-01')],{enabled,backup});
  assert.equal(x.api.pruneSheet(x.sh,x.data,NOW).mode,'DRY_RUN');
  assert.equal(x.data.length,2);assert.deepEqual(x.deleted,[]);
 }
});
test('recognized expired rows delete only after explicit gated opt-in and backup',()=>{
 const x=harness([HEADER,row('2024-01-01'),row('2024-02-02', 'evening'),row('2025-11-21'),row('2026-01-01')],{enabled:true,backup:true});
 const out=x.api.pruneSheet(x.sh,x.data,NOW);
 assert.equal(out.mode,'APPLY_VERIFIED_BACKUP');assert.equal(out.eligibleCount,2);assert.equal(out.deleted,2);
 assert.equal(x.data.length,3);assert.deepEqual(x.deleted,[[2,2]]);
 assert.equal(x.data[1][1],'2025-11-21');
});
test('non-owned or malformed rows never pruned and extra column blocks all deletions',()=>{
 const unknown=row('2024-05-20','morning',{invalid:true});
 const future=row('2026-12-01');
 const invalidDate=row('2025-02-31');
 const x=harness([HEADER,unknown,invalidDate,future,row('2024-01-01')],{enabled:true,backup:true});
 const p=x.api.plan(x.data,NOW);
 assert.equal(p.eligibleCount,1);assert.equal(p.protectedOldCount,1);assert.equal(p.invalidDateCount,1);
 const result=x.api.pruneSheet(x.sh,x.data,NOW);
 assert.equal(result.deleted,1);assert.equal(x.data.length,4);
 const wrong=harness([HEADER,row('2024-01-01')],{enabled:true,backup:true,extraCol:true});
 assert.throws(()=>wrong.api.pruneSheet(wrong.sh,wrong.data,NOW),/COLUMN_SCOPE_MISMATCH/);
 assert.equal(wrong.data.length,2);
});
test('batch delete cap protects Apps Script quota and preserves unknown interleaved rows',()=>{
 const many=[HEADER,...Array.from({length:320},(_,i)=>row(i%2?'2024-01-01':'2024-02-01'))];
 many.splice(66,0,row('2024-01-01','morning',{invalid:true}));
 const x=harness(many,{enabled:true,backup:true});
 const report=x.api.pruneSheet(x.sh,x.data,NOW);
 assert.equal(report.eligibleCount,320);assert.equal(report.deleted,150);
 assert.equal(x.data.length,172);
 assert.ok(x.data.some(x=>x[0]==='hand-entered'));
});
test('untrusted header and invalid clock fail closed',()=>{
 const x=harness([['wrong'],row('2024-01-01')],{enabled:true,backup:true});
 assert.throws(()=>x.api.plan(x.data,NOW),/SCHEMA_MISMATCH/);
 assert.throws(()=>x.api.plan([HEADER],NaN),/INVALID_RETENTION_CLOCK/);
});
test('collector retention ceilings: PM and Water 365d; snapshots 90d and forecast 2d',()=>{
 const pm=fs.readFileSync('apps-script/BackendApi.gs','utf8');
 const water=fs.readFileSync('apps-script/WaterHistory.gs','utf8');
 const snap=fs.readFileSync('apps-script/HourlySnapshot.gs','utf8');
 assert.match(pm,/PM_RETENTION_MS = 365 \* 86400000/);
 assert.match(water,/t\.utcMs<now-365\*86400000&&saved<now-365\*86400000/);
 assert.match(snap,/KEEP_MS = 90 \* 86400000, FORECAST_KEEP_MS = 2 \* 86400000/);
 assert.match(pm,/WidgetRetention\.pruneSheet\(sheet, sheet\.getDataRange\(\)\.getValues\(\), now\)/);
 assert.doesNotMatch(js,/ScriptApp\.newTrigger/);
});


test('one-time owner backup approval allows automatic scheduled retention on future days',()=>{
 const x=harness([HEADER,row('2024-01-01')],{enabled:true,backup:true});
 const later=NOW+180*86400000;
 const out=x.api.pruneSheet(x.sh,x.data,later);
 assert.equal(out.deleted,1);
 assert.equal(out.mode,'APPLY_VERIFIED_BACKUP');
});
