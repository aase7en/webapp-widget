'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('apps-script/flood-news-watch/Code.gs','utf8')
 .replace('__PRIVATE_SHEET_ID__','TEST_SHEET_ID');
function env(opts={}){
 const names={water:'ระดับน้ำ',news:'ข่าวและประกาศ',sources:'ทะเบียนแหล่งข่าว',runs:'บันทึกการทำงาน'};
 const headers={water:['record_id','fetched_at_BKK','target_area','source','data_kind','forecast_date','value','unit','grid_lat','grid_lon','river_mapping_verified','hospital_risk','source_url','observation_time','quality','note'],
 news:['evidence_id','captured_at_BKK','priority','area_scope','platform','source_name','published_at','title_or_claim','post_url','source_type','verification','review_status','event_type','reviewed_by','reviewed_at','note'],
 sources:['priority','area','organization_or_page','platform','official_or_community','url','access_method','permission_status','enabled','note'],
 runs:['run_id','started_at_BKK','finished_at_BKK','status','glofas_records','news_records','error_code','details']};
 const data={};const sheets={};
 for(const key of Object.keys(names)){
  const rows=[headers[key]];data[key]=rows;
  sheets[names[key]]={getLastRow:()=>rows.length,getRange:(r,c,n,columns)=>({getValues:()=>rows.slice(r-1,r-1+n).map(x=>x.slice(c-1,c-1+columns))}),appendRow:(row)=>rows.push(row)};
 }
 if(opts.sourceRow)data.sources.push(opts.sourceRow);
 const seen=[];let triggers=[];
 const ctx={
   SpreadsheetApp:{openById:id=>{assert.equal(id,'TEST_SHEET_ID');return {getSheetByName:n=>sheets[n]}}},
   UrlFetchApp:{fetch(url){seen.push(url);if(opts.outage)throw Error('OUTAGE');
     if(url.includes('open-meteo'))return {getResponseCode:()=>200,getContentText:()=>JSON.stringify({daily_units:{river_discharge:'m³/s'},daily:{time:['2026-10-13','2026-10-14'],river_discharge:[0,150]},latitude:14.36,longitude:100.64})};
     const xml=opts.xml||'<rss><channel><item><title>น้ำท่วม อยุธยา อุทัย</title><link>https://news.example.com/?id=123</link><pubDate>Tue, 13 Oct 2026 03:00:00 GMT</pubDate></item></channel></rss>';
     return {getResponseCode:()=>200,getContentText:()=>xml};
   }},
   LockService:{getScriptLock:()=>({tryLock:()=>true,releaseLock(){}})},
   Utilities:{DigestAlgorithm:{SHA_256:'SHA256'},computeDigest:(_,x)=>Array.from(Buffer.from(require('node:crypto').createHash('sha256').update(x).digest()).values()).map(x=>x>127?x-256:x),formatDate:(d,tz,fmt)=>'2026-10-13 10:00:00'},
   ScriptApp:{getProjectTriggers:()=>triggers,newTrigger:n=>({timeBased:()=>({everyMinutes:m=>({create:()=>triggers.push({getHandlerFunction:()=>n,minutes:m})})})}),deleteTrigger:t=>{triggers=triggers.filter(x=>x!==t)}},
   XmlService:{parse:()=>{throw Error('xml not needed in non-source test')}}
 };
 vm.createContext(ctx);vm.runInContext(source,ctx);
 return {ctx,data,seen,addSource:row=>data.sources.push(row),triggers:()=>triggers};
}
test('dry run checks schema and model only; never writes data',()=>{
 const e=env();const v=e.ctx.dryRunWatch();assert.equal(v.status,'DRY_RUN_OK');assert.equal(v.model_records,2);
 for(const k of Object.keys(e.data))assert.equal(e.data[k].length,1);
});
test('a production run appends authentic zero discharge as model, never hospital safe',()=>{
 const e=env();const v=e.ctx.runWatch();assert.equal(v.status,'OK');assert.equal(v.hospital_flood_status,'UNAVAILABLE');
 assert.equal(e.data.water.length,3);assert.equal(e.data.water[1][6],0);assert.equal(e.data.water[1][7],'m³/s');
 assert.equal(e.data.water[1][10],false);assert.equal(e.data.water[1][11],'');assert.equal(e.data.water[1][4],'MODELLED_FORECAST');
 assert.equal(e.data.runs.length,2);assert.equal(e.data.news.length,1);
 // same minute (simulated clock) must not append duplicate snapshot
 e.ctx.runWatch();assert.equal(e.data.water.length,3);
});
test('failure logs a failed run and never fabricates a model reading',()=>{
 const e=env({outage:true});assert.throws(()=>e.ctx.runWatch(),/WATCH_RUN_PARTIAL/);
 assert.equal(e.data.water.length,1);assert.equal(e.data.runs[1][3],'PARTIAL_OR_FAILED');
});
test('priority Uthai then Ayutthaya then neighboring area, never Uthai Thani',()=>{
 const e=env();assert.equal(e.ctx.priorityForNews_('น้ำท่วม อุทัย อยุธยา','',2),1);
 assert.equal(e.ctx.priorityForNews_('ระดับน้ำ พระนครศรีอยุธยา','',2),2);
 assert.equal(e.ctx.priorityForNews_('ระดับน้ำ อ่างทอง','',3),3);
 assert.equal(e.ctx.priorityForNews_('น้ำท่วม อุทัยธานี','',3),null);
 assert.equal(e.ctx.priorityForNews_('อบต อุทัย กิจกรรมกีฬา','อุทัย',1),null);
 assert.equal(e.ctx.priorityForNews_('อากาศดี อยุธยา','',2),null);
});
test('news ingestion disabled before source permission even with source row',()=>{
 const e=env({sourceRow:[1,'อำเภออุทัย','ที่นี่อุทัย','Facebook','COMMUNITY','','OFFICIAL_API_OR_PERMISSION','PENDING','NO','']});
 const v=e.ctx.runWatch();assert.equal(v.news_records,0);assert.equal(e.seen.length,1);
});
test('triggers created only on explicit opt-in and once; unrelated triggers preserved',()=>{
 const e=env();assert.equal(e.triggers().length,0);
 const first=e.ctx.installThirtyMinuteTrigger();assert.equal(first.status,'TRIGGER_30_MIN_CREATED');
 assert.equal(e.triggers()[0].minutes,30);
 assert.equal(e.ctx.installThirtyMinuteTrigger().status,'ALREADY_CONFIGURED');
 assert.equal(e.triggers().length,1);assert.equal(e.ctx.disableWatchTrigger().disabled,1);
 assert.equal(e.triggers().length,0);
});
test('timestamps with no timezone or invalid sources are rejected',()=>{
 const e=env();assert.equal(e.ctx.watchTimestamp_('2026-10-13T11:00:00'),null);
 assert.equal(e.ctx.watchSourceUrl_('http://page.example.com/rss'),null);
 assert.equal(e.ctx.watchSourceUrl_('https://a.example.com:444/rss'),null);
 assert.equal(e.ctx.watchSourceUrl_('https://user@a.example.com/rss'),null);
});
test('untrusted news title is never treated as a Sheets formula',()=> {
 const e=env();
 assert.equal(e.ctx.sheetSafeText_('=HYPERLINK()').startsWith("'"),true);
 assert.equal(e.ctx.sheetSafeText_('@SUM(1,2)').startsWith("'"),true);
 assert.equal(e.ctx.sheetSafeText_('ข่าวระดับน้ำ อยุธยา'),'ข่าวระดับน้ำ อยุธยา');
});
test('approved RSS source ingests once, holds headline for human review and preserves source-area basis',()=>{
 const pub=new Date(Date.now()-3600000).toUTCString();
 const sourceRow=[1,'อำเภออุทัย','เทศบาลตำบลอุทัย','Website','OFFICIAL','https://feed.example.org/rss','APPROVED_RSS','APPROVED','YES','authorized-test-feed'];
 const e=env({sourceRow});
 const item=(title,link,when)=>({getChildText:k=>({title,link,pubDate:when})[k]||''});
 e.ctx.XmlService.parse=()=>({getRootElement:()=>({getName:()=> 'rss',getChild:n=>n==='channel'?{getChildren:k=>k==='item'?[
   item('น้ำหลาก ถนนหน้าอำเภอ', 'https://feed.example.org/article?id=41',pub),
   item('กิจกรรมวันเด็ก', 'https://feed.example.org/article?id=42',pub),
   item('น้ำท่วม อุทัยธานี', 'https://feed.example.org/article?id=43',pub),
   item('ระดับน้ำ อุทัย อยุธยา', 'https://feed.example.org/article?id=44',pub),
   item('น้ำสูง อยุธยา', 'https://feed.example.org/article?id=45','2000-01-01T00:00:00Z')
 ]:[]}:null})});
 const r=e.ctx.runWatch();assert.equal(r.news_records,2);
 assert.equal(e.data.news.length,3);
 assert.equal(e.data.news[1][11],'PENDING_REVIEW');
 assert.equal(e.data.news[1][10],'UNVERIFIED');
 assert.match(e.data.news[1][3],/SOURCE_CONTEXT_ONLY/);
 assert.match(e.data.news[2][3],/HEADLINE_TEXT/);
 e.ctx.runWatch();assert.equal(e.data.news.length,3);
});
test('approved Atom source parses correctly and source errors do not fabricate news',()=>{
 const now=new Date(Date.now()-3600000).toISOString();
 const sourceRow=[2,'จังหวัดพระนครศรีอยุธยา','ศูนย์ข่าวท้องถิ่น','Website','OFFICIAL','https://feed.example.org/atom','APPROVED_RSS','APPROVED','YES','authorized'];
 const e=env({sourceRow});
 const ns={};
 e.ctx.XmlService.parse=()=>({getRootElement:()=>({getName:()=> 'feed',getNamespace:()=>ns,
   getChildren:key=>key==='entry'?[{
     getChildText:key=>({title:'แจ้งเตือนระดับน้ำ พระนครศรีอยุธยา',published:now})[key]||'',
     getChildren:key=>key==='link'?[{getAttribute:key=>key==='href'?{getValue:()=> 'https://feed.example.org/news?id=10'}:null}]:[]
   }]:[]})});
 assert.equal(e.ctx.runWatch().news_records,1);
 assert.equal(e.data.news[1][2],2);
 const f=env({sourceRow});
 f.ctx.XmlService.parse=()=>{throw Error('malformed xml')};
 assert.throws(()=>f.ctx.runWatch(),/WATCH_RUN_PARTIAL/);
 assert.equal(f.data.news.length,1);
 assert.equal(f.data.runs[1][3],'PARTIAL_OR_FAILED');
});
