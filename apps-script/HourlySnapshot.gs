/* Candidate: scheduled-only shared PM and weather snapshot.
 * This module is not routed or installed yet; production cutover must first
 * verify the bound script, trigger inventory, and rollback for all consumers.
 * Only rows with the exact private schema are eligible for 90-day pruning. */
var HourlySnapshot = (function () {
  'use strict';
  var TAB = 'Widget_Hourly_Snapshots', HEADER = ['record_type','location_id','location_fingerprint','channel','observed_at','saved_at','payload_json'];
  var TYPE = 'widget_snapshot_v1', KEEP_MS = 90 * 86400000, FORECAST_KEEP_MS = 2 * 86400000, FUTURE_MS = 120000;
  var FORECAST_URL = 'https://api.open-meteo.com/v1/forecast', ATTEMPT_KEY = 'widget_snapshot_attempt_ms_v1';
  function validRow(r) {
    if (!r || r.length !== HEADER.length || r[0] !== TYPE || r[1] !== 'uthai' || !/^[a-z0-9]+$/.test(String(r[2])) || ['pm25','weather','forecast'].indexOf(r[3]) < 0) return false;
    var observed = Date.parse(String(r[4])), saved = Date.parse(String(r[5]));
    if (!isFinite(observed) || !isFinite(saved) || typeof r[6] !== 'string' || r[6].length > 45000) return false;
    try { var data = JSON.parse(r[6]); return !!data && typeof data === 'object' && !Array.isArray(data); } catch (_) { return false; }
  }
  function openSheet(create) {
    var book = SpreadsheetApp.openById('1kBUKdezfAxIziq167e-RJV1nNZkeiaz6YQcpVAMja9w');
    var sh = book.getSheetByName(TAB);
    if (!sh && create) { sh = book.insertSheet(TAB); sh.getRange(1,1,1,HEADER.length).setValues([HEADER]); }
    if (!sh) return null;
    var headers = sh.getRange(1,1,1,HEADER.length).getValues()[0];
    if (headers.length !== HEADER.length || HEADER.some(function(h,i){return headers[i] !== h;})) throw Error('snapshot schema mismatch');
    return sh;
  }
  function prune(sh,rows,now) {
    var end=-1, removed=0;
    for (var i=rows.length-1;i>=0;i--) {
      var retention=i>0 && rows[i][3]==='forecast' ? FORECAST_KEEP_MS : KEEP_MS;
      var remove=i>0 && validRow(rows[i]) && Date.parse(String(rows[i][5])) < now-retention;
      if (remove) { if (end<0) end=i; }
      else if (end>=0) { sh.deleteRows(i+2,end-i); removed+=end-i; end=-1; }
    }
    return removed;
  }
  function forecast(loc) {
    var url=FORECAST_URL+'?latitude='+encodeURIComponent(String(loc.lat))+'&longitude='+encodeURIComponent(String(loc.lon))+
      '&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day,apparent_temperature,uv_index,wind_gusts_10m'+
      '&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weather_code,uv_index,wind_speed_10m,wind_gusts_10m'+
      '&daily=sunrise,sunset,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max,weather_code&forecast_days=7&timezone=Asia%2FBangkok';
    var response=UrlFetchApp.fetch(url,{muteHttpExceptions:true,followRedirects:true});
    if (response.getResponseCode()!==200) throw Error('forecast unavailable');
    var f=JSON.parse(response.getContentText());
    if (!f || f.timezone!=='Asia/Bangkok' || !f.current || !f.hourly || !Array.isArray(f.hourly.time) || !f.daily || !Array.isArray(f.daily.time)) throw Error('invalid forecast');
    return f;
  }
  function authorized(event) {
    var uid=event && event.triggerUid != null ? String(event.triggerUid) : '';
    var scheduled=uid!=='' && ScriptApp.getProjectTriggers().some(function(t){return ['BackendApiSnapshotHourly_','BackendApiPm25Hourly_'].indexOf(t.getHandlerFunction())>=0 && String(t.getUniqueId())===uid;});
    return scheduled || BackendApi.isOwnerSession();
  }
  function collect(event) {
    if (!authorized(event)) throw Error('snapshot caller not authorized');
    var cfg=BackendApi.loadConfig(); if (!cfg.ok || cfg.active.id!=='uthai') throw Error('snapshot config invalid');
    /* A durable attempt gate prevents duplicate provider requests even after a
       failed request or CacheService eviction. Lock only around the gate; the
       existing GISTDA fetch takes the same lock internally. */
    var now=Date.now(), gate=LockService.getScriptLock();
    if (!gate.tryLock(15000)) throw Error('snapshot busy');
    try {
      var props=PropertiesService.getScriptProperties(), raw=props.getProperty(ATTEMPT_KEY), last=raw===null ? null : Number(raw);
      if (raw!==null && (!isFinite(last) || last>now+FUTURE_MS)) throw Error('invalid attempt timestamp');
      if (last!==null && Math.floor(now/3600000)===Math.floor(last/3600000)) return {written:0,reason:'attempt_throttled'};
      props.setProperty(ATTEMPT_KEY,String(now));
    } finally { gate.releaseLock(); }
    var pm=null, f=null;
    try { pm=BackendApi.getCachedPm(cfg,now); } catch (_) { /* weather remains independent */ }
    try { f=forecast(cfg.active); } catch (_) { /* other channels remain independent */ }
    if(f) try {
      var floodUrl='https://flood-api.open-meteo.com/v1/flood?latitude='+encodeURIComponent(String(cfg.active.lat))+'&longitude='+encodeURIComponent(String(cfg.active.lon))+'&daily=river_discharge&forecast_days=3&timezone=Asia%2FBangkok';
      var floodResponse=UrlFetchApp.fetch(floodUrl,{muteHttpExceptions:true,followRedirects:true});
      if(floodResponse.getResponseCode()===200){var flood=JSON.parse(floodResponse.getContentText());
        if(flood && flood.daily_units && flood.daily_units.river_discharge==='m³/s' && flood.daily && Array.isArray(flood.daily.time) && Array.isArray(flood.daily.river_discharge)) f.widgetFlood={fetchedAt:new Date(Date.now()).toISOString(),data:flood};}
    } catch (_) { /* forecast remains usable if flood model fails */ }
    var lock=LockService.getScriptLock(); if (!lock.tryLock(15000)) throw Error('snapshot busy');
    try {
      var sh=openSheet(true),rows=sh.getDataRange().getValues(),fingerprint=BackendApi.locationFingerprint(cfg.active), saved=new Date(now).toISOString();
      prune(sh,rows,now);
      var wx=null;
      if(f && f.current_units && f.current_units.temperature_2m==='°C' && f.current_units.relative_humidity_2m==='%' && f.current && f.daily){
        var cur=f.current,t=cur.temperature_2m,rh=cur.relative_humidity_2m,code=cur.weather_code,obs=Date.parse(String(cur.time)+'+07:00');
        if(typeof t==='number'&&isFinite(t)&&t>=-40&&t<=65&&typeof rh==='number'&&isFinite(rh)&&rh>=0&&rh<=100&&Number.isInteger(code)&&code>=0&&code<=99&&isFinite(obs)){
          var today=Utilities.formatDate(new Date(now),'Asia/Bangkok','yyyy-MM-dd'),i=f.daily.time.indexOf(today),get=function(k){var v=i>=0&&Array.isArray(f.daily[k])?f.daily[k][i]:null;return typeof v==='number'&&isFinite(v)?v:null};
          wx={status:'ok',temperatureC:t,humidityPct:rh,weatherCode:code,observedAt:new Date(obs).toISOString(),source:'Open-Meteo weather model',tmaxC:get('temperature_2m_max'),tminC:get('temperature_2m_min'),rainPct:get('precipitation_probability_max'),forecastDate:i>=0?today:null};
        }
      }
      var candidates=[['pm25',pm],['weather',wx]];
      if (f) candidates.push(['forecast',f]);
      var written=0;
      candidates.forEach(function(entry){
        var ch=entry[0],p=entry[1]; if (!p || (ch!=='forecast' && p.status!=='ok')) return;
        var obs=ch==='forecast' ? Date.parse(String(f.current.time)+'+07:00') : Date.parse(p.observedAt);
        if (!isFinite(obs) || obs>now+FUTURE_MS || now-obs>3*3600000) return;
        var payload=JSON.stringify(p); if (payload.length>45000) return;
        sh.appendRow([TYPE,cfg.active.id,fingerprint,ch,new Date(obs).toISOString(),saved,payload]); written++;
      });
      return {written:written};
    } finally { lock.releaseLock(); }
  }
  /* Pure reader: never fetches any upstream provider or edits sheet state. */
  function read(now) {
    var cfg=BackendApi.loadConfig(); if (!cfg.ok || cfg.active.id!=='uthai') throw Error('snapshot config invalid');
    var fingerprint=BackendApi.locationFingerprint(cfg.active),out={schema:1,status:'unavailable',location:{id:cfg.active.id,lat:cfg.active.lat,lon:cfg.active.lon},channels:{}};
    var cache=null,key='widget_snapshot_read_v1_'+fingerprint;
    try {cache=CacheService.getScriptCache();var raw=cache.get(key),cached=raw&&JSON.parse(raw);
      if(cached&&cached.schema===1&&cached.location&&cached.location.id===cfg.active.id&&cached.channels){
        Object.keys(cached.channels).forEach(function(k){var v=cached.channels[k],obs=Date.parse(v.observedAt),saved=Date.parse(v.savedAt);
          if(!isFinite(obs)||!isFinite(saved)||obs>now+FUTURE_MS||saved>now+FUTURE_MS||now-obs>3*3600000||now-saved>3*3600000)delete cached.channels[k];});
        cached.status=Object.keys(cached.channels).length?'ok':'unavailable';return cached;
      }
    } catch (_) { cache=null; }
    var sh=openSheet(false); if (!sh) return out;
    var count=sh.getLastRow(), start=Math.max(2,count-24), rows=count>=2?sh.getRange(start,1,count-start+1,HEADER.length).getValues():[];
    for (var i=rows.length-1;i>=0;i--) {
      var r=rows[i]; if (!validRow(r) || r[1]!==cfg.active.id || r[2]!==fingerprint || out.channels[r[3]]) continue;
      var observed=Date.parse(String(r[4])),saved=Date.parse(String(r[5]));
      if (observed>now+FUTURE_MS || saved>now+FUTURE_MS || now-observed>3*3600000 || now-saved>3*3600000) continue;
      out.channels[r[3]]={observedAt:r[4],savedAt:r[5],data:JSON.parse(r[6])};
    }
    if (Object.keys(out.channels).length) out.status='ok';
    try {if(cache && out.status==='ok')cache.put(key,JSON.stringify(out),60);} catch (_) { /* cache is best effort */ }
    return out;
  }
  function web(e) {
    var params=e && e.parameter || {},cb=params.callback;
    if (cb!==undefined && (typeof cb!=='string' || !/^[a-zA-Z_$][a-zA-Z0-9_$]{0,55}$/.test(cb)))
      return ContentService.createTextOutput('Invalid callback').setMimeType(ContentService.MimeType.TEXT);
    var result;
    try { result=read(Date.now()); } catch (_) { result={schema:1,status:'unavailable',location:null,channels:{}}; }
    var json=JSON.stringify(result).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
    return cb===undefined ? ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON) :
      ContentService.createTextOutput(cb+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return {collect:collect,authorized:authorized,read:read,web:web,validRow:validRow,prune:prune,HEADER:HEADER};
})();
function BackendApiSnapshotHourly_(event) {
  if(!HourlySnapshot.authorized(event))throw Error('snapshot caller not authorized');
  var result;
  try { result=HourlySnapshot.collect(event); } catch (_) { result={status:'unavailable'}; }
  // Water has its own durable hourly gate; attempt even if the snapshot tab
  // is unavailable, while preserving the same authorization boundary.
  try { result.water=WaterHistory.syncHourly(); } catch (_) { result.water={status:'unavailable'}; }
  return result;
}

/* Owner-only staged cutover; cannot be invoked through google.script.run. */
function BackendApiEnableSnapshotMode_() {
  BackendApi.assertTrustedCaller('BackendApiEnableSnapshotMode_',true);
  var s=HourlySnapshot.read(Date.now()), c=s.channels||{};
  if(!c.pm25||!c.weather||!c.forecast)throw Error('snapshot channels not ready');
  PropertiesService.getScriptProperties().setProperty('widget_snapshot_mode_v1','enabled');
  return {enabled:true};
}
function BackendApiDisableSnapshotMode_() {
  BackendApi.assertTrustedCaller('BackendApiDisableSnapshotMode_',true);
  PropertiesService.getScriptProperties().deleteProperty('widget_snapshot_mode_v1');
  return {enabled:false};
}
