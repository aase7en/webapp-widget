/*
 * One-year bounded history retention for the EXISTING container-bound
 * API Report_PM2.5 script. This adds NO spreadsheet, NO new trigger,
 * and NO callable public web route.
 *
 * Crucially, deletion of History_Batch is DISABLED BY DEFAULT.
 * Before enabling on the actual bound script, an authorized owner must:
 *  1) export/verify a restorable timestamped backup,
 *  2) inventory live triggers, retired legacy sheets and latest data,
 *  3) inspect a dry-run plan,
 *  4) set widget_retention_mode_v1=APPROVED_AFTER_BACKUP AND
 *     widget_retention_backup_verified_at_v1=ISO timestamp from owner-verified backup.
 *
 * A source-controlled .gs file is NOT proof that the live bound script was
 * installed/deployed. Any unknown/malformed row is deliberately protected.
 */
var WidgetRetention = (function () {
  'use strict';
  var TZ = 'Asia/Bangkok', DAYS = 365, DAY_MS = 86400000;
  var MODE_KEY = 'widget_retention_mode_v1';
  var BACKUP_KEY = 'widget_retention_backup_verified_at_v1';
  var ALLOWED_MODE = 'APPROVED_AFTER_BACKUP';
  var MAX_DELETE_PER_BATCH = 150;
  var HEADER = ['batch_id','batch_date','slot','location_id','lat','lon',
    'pm25_value','pm25_observed_at','pm25_status','pm25_provider','pm25_area_id','pm25_tambon_name',
    'wx_temp_c','wx_rh_pct','wx_code','wx_observed_at','wx_status','wx_provider',
    'water_status','water_station_id','water_datum','created_at'];

  function dateKey(value) {
    var out = null;
    if (typeof value === 'string') out = value.trim();
    else if (Object.prototype.toString.call(value) === '[object Date]' && isFinite(value.getTime()))
      out = Utilities.formatDate(value, TZ, 'yyyy-MM-dd');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(out || '')) return null;
    var y=Number(out.slice(0,4)),m=Number(out.slice(5,7)),d=Number(out.slice(8,10));
    var check=new Date(Date.UTC(y,m-1,d));
    if (check.getUTCFullYear()!==y || check.getUTCMonth()!==m-1 || check.getUTCDate()!==d)
      return null;
    return out;
  }
  function olderThan(now) {
    if (!isFinite(now)) throw Error('INVALID_RETENTION_CLOCK');
    // Calendar dates in Bangkok, rather than raw midnight UTC, are used:
    // the date exactly 365 calendar days ago is retained inclusively.
    return Utilities.formatDate(new Date(now-DAYS*DAY_MS), TZ, 'yyyy-MM-dd');
  }
  function exactHeader(rows) {
    return !!(rows && rows.length && rows[0] && rows[0].length===HEADER.length &&
      HEADER.every(function(h,i){return String(rows[0][i])===h;}));
  }
  function owned(row, date) {
    if (!row || row.length!==HEADER.length || !date) return false;
    var slot=String(row[2]),location=String(row[3]);
    if (['morning','evening','hourly'].indexOf(slot)<0 ||
      !/^[a-z0-9_]{1,32}$/.test(location) || String(row[0])!==date+':'+slot) return false;
    var created = row[21];
    var ms = Object.prototype.toString.call(created)==='[object Date]' ?
      created.getTime() : Date.parse(String(created || ''));
    return isFinite(ms);
  }
  function plan(rows,now) {
    if(!exactHeader(rows))throw Error('HISTORY_BATCH_SCHEMA_MISMATCH');
    var cutoff=olderThan(now),eligible=[],protectedOld=0,invalidDates=0;
    for(var i=1;i<rows.length;i++){
      var r=rows[i],date=dateKey(r[1]);
      if(!date){invalidDates++;continue;}
      if(date>=cutoff)continue;
      if(owned(r,date))eligible.push(i+1); // 1-based sheet row; header is row 1
      else protectedOld++;
    }
    return {tab:'History_Batch',cutoffExclusive:cutoff,retentionDays:DAYS,
      eligibleRows:eligible,eligibleCount:eligible.length,protectedOldCount:protectedOld,
      invalidDateCount:invalidDates,totalDataRows:Math.max(0,rows.length-1)};
  }
  function enabled(now) {
    var props=PropertiesService.getScriptProperties();
    if (props.getProperty(MODE_KEY)!==ALLOWED_MODE) return false;
    var raw=props.getProperty(BACKUP_KEY),stamp=raw?Date.parse(raw):NaN;
    // Owner explicitly activates a durable one-year policy after a backup;
    // no repeated manual approvals are needed for the existing daily trigger.
    return isFinite(stamp) && stamp<=now;
  }
  function pruneSheet(sheet,rows,now) {
    if(!sheet || !rows || sheet.getLastColumn()!==HEADER.length)throw Error('HISTORY_BATCH_COLUMN_SCOPE_MISMATCH');
    var p=plan(rows,now),allowed=enabled(now);
    if(!allowed)return {mode:'DRY_RUN',...summary(p),deleted:0};
    // Bounded deletes, always descending physical row, keeping header and
    // any unknown, recent, or user-owned rows untouched.
    var targets=p.eligibleRows.slice(0,MAX_DELETE_PER_BATCH).sort(function(a,b){return b-a;});
    var deleted=0;
    for(var i=0;i<targets.length;){
      var last=targets[i],first=last;i++;
      while(i<targets.length && targets[i]===first-1){first=targets[i];i++;}
      sheet.deleteRows(first,last-first+1);
      deleted+=last-first+1;
    }
    return {mode:'APPLY_VERIFIED_BACKUP',...summary(p),deleted:deleted};
  }
  function summary(p) {
    return {tab:p.tab,retentionDays:p.retentionDays,cutoffExclusive:p.cutoffExclusive,
      totalDataRows:p.totalDataRows,eligibleCount:p.eligibleCount,
      protectedOldCount:p.protectedOldCount,invalidDateCount:p.invalidDateCount};
  }
  function inspectSheet(sheet,now) {
    if(!sheet || sheet.getLastColumn()!==HEADER.length)throw Error('HISTORY_BATCH_COLUMN_SCOPE_MISMATCH');
    var rows=sheet.getDataRange().getValues();
    return {mode:'DRY_RUN',...summary(plan(rows,now)),deleted:0};
  }
  return {HEADER:HEADER,plan:plan,pruneSheet:pruneSheet,inspectSheet:inspectSheet};
})();

/* Owner-only manual dry-run. Never deletes Sheet rows, never invokes provider. */
function widgetRetentionPreview_() {
  BackendApi.assertTrustedCaller('widgetRetentionPreview_',true);
  var sh=SpreadsheetApp.openById('1kBUKdezfAxIziq167e-RJV1nNZkeiaz6YQcpVAMja9w')
    .getSheetByName('History_Batch');
  return WidgetRetention.inspectSheet(sh,Date.now());
}
