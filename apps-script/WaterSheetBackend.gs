/**
 * UTH[AI] water-sheet-cache candidate — ISOLATED Apps Script project only.
 * DO NOT paste over the existing PM2.5 Code.gs/BackendApi.gs or change its triggers.
 * Install a NEW standalone Apps Script project after review and owner authorization.
 * Public station data only. Read operations never fetch upstream.
 */
const UTH_WATER = Object.freeze({
  property: 'UTH_WATER_SHEET_ID',
  primary: 'https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load',
  backup: 'https://raw.githubusercontent.com/aase7en/webapp-widget/water-data/water.json',
  zone: 'Asia/Bangkok',
  freshnessMs: 3 * 60 * 60 * 1000,
  historicalMs: 48 * 60 * 60 * 1000,
  futureSkewMs: 2 * 60 * 1000,
  stations: Object.freeze({
    HDA004: { id: 471583, oldcode: 'HDA004', name: 'HDA004 ช่องสะเดา' },
    S5: { id: 2607, oldcode: 'S.5', name: 'S.5 สะพานปรีดี-ธำรง' }
  })
});
const UTH_HEADER = Object.freeze({
  water_latest: ['station_code','station_id','station_name_th','level_msl_m','observed_at_iso','fetched_at_iso','bank_msl_m','ground_msl_m','provider','source_url','updated_at_utc','record_key'],
  water_history: ['record_key','station_code','station_id','station_name_th','level_msl_m','observed_at_iso','fetched_at_iso','bank_msl_m','ground_msl_m','provider','source_url','stored_at_utc','source_status'],
  sync_log: ['run_at_utc','trigger','source','success_count','error_code','http_status','notes']
});
function uthSheet_(name) {
  const id = PropertiesService.getScriptProperties().getProperty(UTH_WATER.property);
  if (!id || !/^[\w-]{20,100}$/.test(id)) throw Error('UTH_WATER_SHEET_ID not configured');
  const sheet = SpreadsheetApp.openById(id).getSheetByName(name);
  if (!sheet) throw Error('MISSING_TAB_' + name);
  const actual = sheet.getRange(1, 1, 1, UTH_HEADER[name].length).getValues()[0].map(String);
  if (actual.join('|') !== UTH_HEADER[name].join('|')) throw Error('HEADER_MISMATCH_' + name);
  return sheet;
}
function uthNumber_(value, low, high) {
  const n = typeof value === 'number' ? value :
    (typeof value === 'string' && /^[-+]?\d+(?:\.\d+)?$/.test(value.trim()) ? Number(value) : NaN);
  return Number.isFinite(n) && n >= low && n <= high ? n : null;
}
function uthTime_(raw) {
  if (typeof raw !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(raw);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  const ms = Date.UTC(parts[0], parts[1]-1, parts[2], parts[3]-7, parts[4]);
  const d = new Date(ms + 7 * 3600000);
  if (d.getUTCFullYear() !== parts[0] || d.getUTCMonth() !== parts[1]-1 ||
      d.getUTCDate() !== parts[2] || d.getUTCHours() !== parts[3] ||
      d.getUTCMinutes() !== parts[4]) return null;
  return { ms, iso: new Date(ms).toISOString() };
}
function uthExtract_(payload, now, url) {
  const response = payload && payload.waterlevel_data;
  if (!response || response.result !== 'OK' || !Array.isArray(response.data))
    throw Error('BAD_HII_CONTRACT');
  const out = {};
  for (const [code, cfg] of Object.entries(UTH_WATER.stations)) {
    const row = response.data.find(r => r && r.station &&
      r.station.id === cfg.id && r.station.tele_station_oldcode === cfg.oldcode);
    if (!row) continue;
    const level = uthNumber_(row.waterlevel_msl, -50, 200);
    const bank = uthNumber_(row.station.min_bank, -50, 200);
    const ground = uthNumber_(row.station.ground_level, -100, 200);
    const time = uthTime_(row.waterlevel_datetime);
    if (level === null || bank === null || ground === null || ground >= bank ||
        !time || time.ms > now + UTH_WATER.futureSkewMs ||
        now - time.ms > UTH_WATER.historicalMs) continue;
    out[code] = {
      code, id: cfg.id, name: cfg.name, level, observedAt: time.iso, at: time.ms,
      bank, ground, provider: 'ThaiWater/HII', sourceUrl: url,
      key: code + '|' + time.iso
    };
  }
  return out;
}
function uthFetch_(url) {
  const response = UrlFetchApp.fetch(url, {
    method:'get', muteHttpExceptions:true, followRedirects:true,
    headers:{Accept:'application/json'}
  });
  const http = response.getResponseCode();
  if (http !== 200) throw Error('UPSTREAM_HTTP_' + http);
  let json;
  try { json = JSON.parse(response.getContentText('UTF-8')); }
  catch (e) { throw Error('UPSTREAM_INVALID_JSON'); }
  return json;
}
function uthRows_(sheet) {
  const end = sheet.getLastRow();
  return end > 1 ? sheet.getRange(2,1,end-1,UTH_HEADER.water_latest.length).getValues() : [];
}
function uthLog_(when, status, count, error, details) {
  uthSheet_('sync_log').appendRow([when.toISOString(), 'scheduled', 'ThaiWater/HII / GitHub verified cache',
    count, error || '', '', String(details || status).slice(0,300)]);
}
/** Only called by scheduled/manual triggers. Never from doGet(). */
function syncWaterLevels() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw Error('WATER_SYNC_LOCK_BUSY');
  const now = new Date(), seen = {}, failures = [];
  let created = 0;
  try {
    for (const url of [UTH_WATER.primary, UTH_WATER.backup]) {
      try {
        const candidates = uthExtract_(uthFetch_(url), now.getTime(), url);
        for (const [code, c] of Object.entries(candidates))
          if (!seen[code] || c.at > seen[code].at) seen[code] = c;
      } catch (e) { failures.push(url === UTH_WATER.primary ? 'HII:' + e.message : 'CACHE:' + e.message); }
    }
    if (!Object.keys(seen).length) throw Error('ALL_SOURCES_UNAVAILABLE_OR_OUTDATED');
    const latest = uthSheet_('water_latest'), history = uthSheet_('water_history');
    const old = Object.fromEntries(uthRows_(latest).filter(r => r[0]).map((r,idx) => [r[0],{row:idx+2, at:Date.parse(String(r[4]))}]));
    const rows = [];
    for (const code of Object.keys(UTH_WATER.stations)) {
      const c = seen[code]; if (!c) continue;
      if (old[code] && Number.isFinite(old[code].at) && c.at <= old[code].at) continue;
      const fetchedAt = now.toISOString();
      // Values are validated/constant: prevent arbitrary spreadsheet formulas.
      const h = [c.key,c.code,c.id,c.name,c.level,c.observedAt,fetchedAt,c.bank,c.ground,c.provider,c.sourceUrl,fetchedAt,'VALIDATED'];
      const l = [c.code,c.id,c.name,c.level,c.observedAt,fetchedAt,c.bank,c.ground,c.provider,c.sourceUrl,fetchedAt,c.key];
      rows.push({code,h,l,row:old[code] && old[code].row});
    }
    // One writer via LockService; dedupe history across interrupted retries.
    const historyEnd=history.getLastRow();
    const knownKeys = new Set(historyEnd>1 ?
      history.getRange(2,1,historyEnd-1,1).getValues().map(x=>String(x[0])) : []);
    for (const item of rows) {
      if (!knownKeys.has(item.h[0])) { history.appendRow(item.h); knownKeys.add(item.h[0]); }
      if (item.row) latest.getRange(item.row,1,1,item.l.length).setValues([item.l]);
      else latest.appendRow(item.l);
      created++;
    }
    uthLog_(now, 'OK', created, failures.length ? 'UPSTREAM_PARTIAL' : '',
      'valid_station_count=' + Object.keys(seen).length + '; ' + failures.join('; '));
    return { stored: created, received: Object.keys(seen).length, failures: failures.length };
  } catch (e) {
    try { uthLog_(now, 'FAILED', created, String(e.message).slice(0,80), 'No data backfilled'); }
    catch (logError) { /* Preserve original failure. */ }
    throw e;
  } finally { lock.releaseLock(); }
}
function uthReadPublic_(nowMs) {
  const out = { schema:1, generatedAt:new Date(nowMs).toISOString(),
    kind:'LAST_OBSERVATION_NOT_LIVE', stations:{}, provenance:'ThaiWater/HII public waterlevel_load' };
  const rows=uthRows_(uthSheet_('water_latest'));
  for (const [code, cfg] of Object.entries(UTH_WATER.stations)) {
    const row=rows.find(r=>r[0]===code && r[1]===cfg.id);
    const empty = { status:'missing', levelMslM:null, bankMslM:null,
      observedAt:null, stationCode:code, stationName:cfg.name };
    if (!row) { out.stations[code]=empty; continue; }
    const observedAt=String(row[4]), ms=Date.parse(observedAt);
    const level=uthNumber_(row[3],-50,200), bank=uthNumber_(row[6],-50,200);
    const ground=uthNumber_(row[7],-100,200);
    if (!Number.isFinite(ms) || ms>nowMs+UTH_WATER.futureSkewMs ||
        level===null || bank===null || ground===null || bank<=ground ||
        nowMs-ms > UTH_WATER.historicalMs) {
      out.stations[code]={...empty,lastKnownAt:Number.isFinite(ms)?observedAt:null}; continue;
    }
    out.stations[code]={
      status:nowMs-ms<=UTH_WATER.freshnessMs?'fresh':'historical',
      levelMslM:level, bankMslM:bank, groundMslM:ground, observedAt,
      fetchedAt:String(row[5]), stationCode:code, stationName:cfg.name,
      provider:String(row[8]), sourceUrl:String(row[9]),
      stale:nowMs-ms>UTH_WATER.freshnessMs
    };
  }
  return out;
}
function doGet(e) {
  const parameters=e&&e.parameter?e.parameter:{};
  const action=String(parameters.action||'water');
  if(action!=='water') return ContentService.createTextOutput('Not Found')
    .setMimeType(ContentService.MimeType.TEXT);
  const output=uthReadPublic_(Date.now());
  const data=JSON.stringify(output).replace(/</g,'\\u003c').replace(/\u2028|\u2029/g,'');
  const callback=parameters.callback;
  if(callback!==undefined) {
    if(typeof callback!=='string'||!/^[A-Za-z_$][A-Za-z0-9_$]{0,63}$/.test(callback))
      return ContentService.createTextOutput('Invalid callback').setMimeType(ContentService.MimeType.TEXT);
    return ContentService.createTextOutput(callback+'('+data+');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(data).setMimeType(ContentService.MimeType.JSON);
}
/** For a NEW standalone Apps Script project. Set UTH_WATER_SHEET_ID in Script Properties first.
 * Safe/idempotent: never deletes unrelated triggers; fails on partial pre-existing state. */
function installWaterTriggers() {
  uthSheet_('water_latest'); uthSheet_('water_history'); uthSheet_('sync_log');
  const existing=ScriptApp.getProjectTriggers()
    .filter(t=>t.getHandlerFunction()==='syncWaterLevels');
  if(existing.length===2) return 'Already has two syncWaterLevels triggers; verify schedule in editor.';
  if(existing.length!==0) throw Error('PARTIAL_TRIGGER_STATE_VERIFY_MANUALLY');
  ScriptApp.newTrigger('syncWaterLevels').timeBased().inTimezone(UTH_WATER.zone)
    .atHour(6).nearMinute(0).everyDays(1).create();
  ScriptApp.newTrigger('syncWaterLevels').timeBased().inTimezone(UTH_WATER.zone)
    .atHour(18).nearMinute(0).everyDays(1).create();
  return 'Created ~06:00 and ~18:00 Bangkok time; Apps Script times may jitter.';
}
