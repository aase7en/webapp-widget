/*
 * WaterHistory.gs: additive backend for the EXISTING container-bound
 * API Report_PM2.5 Apps Script (not a standalone project).
 *
 * All provider requests piggyback on the EXISTING BackendApiHistoryBatch_ trigger.
 * HTTP doGet -> waterHistoryRead_ ONLY reads existing Water_Level_History.
 * Never invent readings. Historical != current flood-safety information.
 */
var WaterHistory = (function () {
  'use strict';
  var TAB='Water_Level_History';
  var URL='https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load';
  var BACKUP='https://raw.githubusercontent.com/aase7en/webapp-widget/water-data/water.json';
  var BKK=7*3600000, MAX_AGE=48*3600000, FRESH_AGE=3*3600000;
  var HII={HDA004:{id:471583,oldcode:'HDA004',name:'HDA004 ช่องสะเดา'},S5:{id:2607,oldcode:'S.5',name:'S.5 สะพานปรีดี-ธำรง'}};
  var HEAD=['batch_key','batch_date','slot','location_id','station_code','station_id','station_name_th','level_msl_m','observed_at_th','fetched_at_utc','reading_status','provider','source_url','bank_msl_m','ground_msl_m','datum','location_relation','saved_at_utc'];
  function sheet_(){
    var ss=SpreadsheetApp.openById('1kBUKdezfAxIziq167e-RJV1nNZkeiaz6YQcpVAMja9w');
    if(!ss || ss.getId()!=='1kBUKdezfAxIziq167e-RJV1nNZkeiaz6YQcpVAMja9w')
      throw Error('CANONICAL_SHEET_REQUIRED');
    var sh=ss.getSheetByName(TAB);
    if(!sh)throw Error('WATER_HISTORY_TAB_MISSING');
    var h=sh.getRange(1,1,1,HEAD.length).getValues()[0].map(String);
    if(h.join('|')!==HEAD.join('|'))throw Error('WATER_HISTORY_HEADER_MISMATCH');
    return sh;
  }
  function num_(v,lo,hi){
    var n=typeof v==='number'?v:typeof v==='string'&&/^[-+]?\d+(?:\.\d+)?$/.test(v.trim())?Number(v):NaN;
    return isFinite(n)&&n>=lo&&n<=hi?n:null;
  }
  function obs_(v){
    // Existing Water_Level_History was written with text dates for verified
    // seed rows, but Sheets turns scheduled rows into typed DATE_TIME cells.
    // Apps Script getValues() returns JS Date for the latter, not string.
    if(Object.prototype.toString.call(v)==='[object Date]'){
      var stamp=v.getTime();
      if(!isFinite(stamp))return null;
      var th=new Date(stamp+BKK),pad=function(n){return n<10?'0'+n:String(n);};
      v=th.getUTCFullYear()+'-'+pad(th.getUTCMonth()+1)+'-'+pad(th.getUTCDate())+
        ' '+pad(th.getUTCHours())+':'+pad(th.getUTCMinutes());
    }
    if(typeof v!=='string')return null;
    var m=/^(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d)$/.exec(v);
    if(!m)return null;
    var a=m.slice(1).map(Number), ms=Date.UTC(a[0],a[1]-1,a[2],a[3]-7,a[4]),check=new Date(ms+BKK);
    if(check.getUTCFullYear()!==a[0]||check.getUTCMonth()!==a[1]-1||
      check.getUTCDate()!==a[2]||check.getUTCHours()!==a[3]||check.getUTCMinutes()!==a[4])return null;
    return {utcMs:ms,th:v};
  }
  function parse_(json,now){
    if(!json||!json.waterlevel_data||json.waterlevel_data.result!=='OK'||!Array.isArray(json.waterlevel_data.data))
      throw Error('INVALID_HII_CONTRACT');
    var out={};
    Object.keys(HII).forEach(function(code){
      var m=HII[code],r=json.waterlevel_data.data.find(function(v){return v&&v.station&&v.station.id===m.id&&v.station.tele_station_oldcode===m.oldcode;});
      if(!r)return;
      var n=num_(r.waterlevel_msl,-50,200),b=num_(r.station.min_bank,-50,200),g=num_(r.station.ground_level,-100,200),t=obs_(r.waterlevel_datetime);
      if(n===null||b===null||g===null||g>=b||!t||t.utcMs>now+120000||now-t.utcMs>MAX_AGE)return;
      out[code]={code:code,id:m.id,name:m.name,level:n,bank:b,ground:g,time:t.th,stamp:t.utcMs};
    });
    return out;
  }
  function fetch_(url){
    var r=UrlFetchApp.fetch(url,{method:'get',muteHttpExceptions:true,followRedirects:true,
      headers:{Accept:'application/json'}});
    if(r.getResponseCode()!==200)throw Error('HTTP_'+r.getResponseCode());
    return JSON.parse(r.getContentText('UTF-8'));
  }
  function owner_(){
    var active=Session.getActiveUser().getEmail(),effective=Session.getEffectiveUser().getEmail();
    if(!active||!effective||active.toLowerCase()!==effective.toLowerCase())throw Error('OWNER_REQUIRED');
  }
  function slot_(now){
    var settings=SpreadsheetApp.openById('1kBUKdezfAxIziq167e-RJV1nNZkeiaz6YQcpVAMja9w').getSheetByName('Settings');
    if(!settings)throw Error('EXISTING_SETTINGS_TAB_REQUIRED');
    var rows=settings.getRange(1,1,Math.min(20,settings.getLastRow()),2).getValues();
    var values={};
    rows.forEach(function(r){values[String(r[0])]=r[1];});
    var morning=Number(values.history_morning_hour),evening=Number(values.history_evening_hour);
    if(!isFinite(morning)||!isFinite(evening)||morning<0||evening>23||
      Math.abs(morning-evening)<=4)throw Error('UNVERIFIED_TRIGGER_HOURS');
    var hour=Number(Utilities.formatDate(new Date(now),'Asia/Bangkok','H'));
    return Math.abs(hour-morning)<=2?'morning':Math.abs(hour-evening)<=2?'evening':null;
  }
  function sync_(){
    var lock=LockService.getScriptLock();
    if(!lock.tryLock(20000))throw Error('SYNC_BUSY');
    try {
      var now=Date.now(),slot=slot_(now);
      if(!slot)throw Error('OUTSIDE_APPROVED_2_DAILY_SLOTS');
      var sh=sheet_(),found={},errors=[];
      // This is the only upstream access. At most one request per source per scheduled run.
      [URL,BACKUP].forEach(function(url){
        if(Object.keys(found).length===Object.keys(HII).length)return;
        try {
          var parsed=parse_(fetch_(url),now);
          Object.keys(parsed).forEach(function(code){
            if(!found[code]||parsed[code].stamp>found[code].stamp)found[code]=Object.assign({sourceUrl:url},parsed[code]);
          });
        } catch(e){errors.push((url===URL?'HII':'CACHE')+':'+e.message);}
      });
      if(!Object.keys(found).length)throw Error('NO_VERIFIED_STATION: '+errors.join('; '));
      var date=Utilities.formatDate(new Date(now),'Asia/Bangkok','yyyy-MM-dd');
      var batch=date+':'+slot, fetched=new Date(now).toISOString(),last=sh.getLastRow();
      var stored=last>1?sh.getRange(2,1,last-1,HEAD.length).getValues():[];
      var keys={};
      stored.forEach(function(r){
        var cfg=HII[String(r[4])],stamp=obs_(r[8]);
        if(cfg&&Number(r[5])===cfg.id&&stamp)keys[String(r[4])+'|'+stamp.th]=true;
      });
      var appended=0;
      Object.keys(HII).forEach(function(code){
        var x=found[code];if(!x)return;
        var unique=code+'|'+x.time;
        if(keys[unique])return;
        // Preserve the original observed-at, not the fetch time. Two provider
        // snapshots with same observed timestamp must never become two new points.
        var age=now-x.stamp,status=age<=FRESH_AGE?'LATEST':'HISTORICAL';
        var row=[batch,date,slot,'uthai',x.code,x.id,x.name,x.level,x.time,fetched,status,
          'ThaiWater/HII',x.sourceUrl,
          x.bank,x.ground,'MSL','reference_station_not_hospital_sensor',fetched];
        sh.appendRow(row);keys[unique]=true;appended++;
      });
      Logger.log('WaterHistory scheduled: stored='+appended+',verified='+Object.keys(found).length+',sourceErrors='+errors.length);
      return {stored:appended,verified:Object.keys(found).length,sourceErrors:errors.length};
    }finally{lock.releaseLock();}
  }
  function read_(now){
    var sh=sheet_(),count=sh.getLastRow();
    var rows=count>1?sh.getRange(Math.max(2,count-398),1,Math.min(399,count-1),HEAD.length).getValues():[];
    var result={schema:1,kind:'LAST_OBSERVATION_NOT_LIVE',source:'ThaiWater/HII via API Report_PM2.5 Google Sheet',
      generatedAt:new Date(now).toISOString(),stations:{}};
    Object.keys(HII).forEach(function(code){
      var cfg=HII[code],pts=[],seen={},current=null;
      rows.forEach(function(r){
        if(r[4]!==code||Number(r[5])!==cfg.id||r[11]!=='ThaiWater/HII'||r[15]!=='MSL')return;
        var o=obs_(r[8]),level=num_(r[7],-50,200),bank=num_(r[13],-50,200),ground=num_(r[14],-100,200);
        if(!o||o.utcMs>now+120000||level===null||bank===null||ground===null||ground>=bank)return;
        if(!seen[o.utcMs]&&now-o.utcMs<=14*86400000){pts.push({time:o.utcMs,level:level});seen[o.utcMs]=true;}
        if(!current||o.utcMs>current.ms)current={ms:o.utcMs,th:o.th,level:level,bank:bank,ground:ground};
      });
      pts.sort(function(a,b){return a.time-b.time;});
      var recent=pts.slice(-30),age=current?now-current.ms:Infinity;
      result.stations[code]={
        stationId:cfg.id,status:!current?'missing':age<=FRESH_AGE?'ok':'historical',
        levelMsl:!current?null:current.level,
        observedTimeTH:!current?null:current.th.slice(8,10)+'/'+current.th.slice(5,7)+' '+current.th.slice(11),
        observedAt:!current?null:new Date(current.ms).toISOString(),
        bankM:current?current.bank:null,groundMsl:current?current.ground:null,
        trendPoints:recent.map(function(p){return p.level;}),
        trendObservedAt:recent.map(function(p){return new Date(p.time).toISOString();}),
        risk:'unassessed'
      };
      // No station-specific, formally approved watch/critical thresholds
      // are registered. Bank elevation alone does NOT authorize risk status.
      // Until threshold and freshness contracts are approved, risk remains
      // 'unassessed' even when the measured level is recent.
    });
    return result;
  }
  function web_(e){
    var p=e&&e.parameter?e.parameter:{},j=JSON.stringify(read_(Date.now())).replace(/</g,'\\u003c');
    if(p.callback!==undefined){
      if(typeof p.callback!=='string'||!/^[a-zA-Z_$][a-zA-Z0-9_$]{0,55}$/.test(p.callback))
        return ContentService.createTextOutput('Invalid callback').setMimeType(ContentService.MimeType.TEXT);
      return ContentService.createTextOutput(p.callback+'('+j+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
    }
    return ContentService.createTextOutput(j).setMimeType(ContentService.MimeType.JSON);
  }
  return {parse:parse_,read:read_,web:web_,sync:sync_};
})();
function waterHistoryRead_(e){ return WaterHistory.web(e); }
