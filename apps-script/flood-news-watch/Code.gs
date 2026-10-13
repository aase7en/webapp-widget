/** Uthai Flood News Watch — separate Apps Script project (NOT API Report_PM2.5).
 * PRIVATE_SHEET_ID is injected only in the owner's hospital Google Drive source.
 * No scraping/social login bypass; unsupported/unknown != SAFE or 0.
 */
const WATER_WATCH = Object.freeze({
  SHEET_ID: '__PRIVATE_SHEET_ID__',
  LAT: 14.36147, LON: 100.64424,
  URL: 'https://flood-api.open-meteo.com/v1/flood',
  NEWS_MAX_AGE_HOURS: 48,
  SOURCE_MAX: 8, ARTICLES_PER_SOURCE: 15,
  MODEL_DAYS: 3
});
const WATER_TABS = Object.freeze({ water: 'ระดับน้ำ', news: 'ข่าวและประกาศ',
  sources: 'ทะเบียนแหล่งข่าว', runs: 'บันทึกการทำงาน' });
const WATER_HEADERS = Object.freeze({
  water: ['record_id','fetched_at_BKK','target_area','source','data_kind','forecast_date','value','unit','grid_lat','grid_lon','river_mapping_verified','hospital_risk','source_url','observation_time','quality','note'],
  news: ['evidence_id','captured_at_BKK','priority','area_scope','platform','source_name','published_at','title_or_claim','post_url','source_type','verification','review_status','event_type','reviewed_by','reviewed_at','note'],
  sources: ['priority','area','organization_or_page','platform','official_or_community','url','access_method','permission_status','enabled','note'],
  runs: ['run_id','started_at_BKK','finished_at_BKK','status','glofas_records','news_records','error_code','details']
});
const WATER_TERMS = /น้ำท่วม|น้ำล้น|ระดับน้ำ|น้ำหลาก|น้ำสูง|น้ำป่า|เจ้าพระยา|เตือนภัยน้ำ|ระบายน้ำ/;
const NEIGHBOR_PROVINCES = /อ่างทอง|ปทุมธานี|สระบุรี|ลพบุรี|สุพรรณบุรี/;

function watchClock_(date) { return Utilities.formatDate(date, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm:ss'); }
function watchId_(value) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value);
  return bytes.map(b => ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2)).join('');
}
function watchSourceUrl_(value) {
  try {
    const s = String(value || '').trim();
    if (s.length > 500 || !/^https:\/\//i.test(s) || /[\s@]/.test(s)) return null;
    // Conservative URL validation prevents passing user-info and non-HTTPS endpoints.
    const m = s.match(/^https:\/\/([^/?:#]+)(?::(\d+))?(?:[/?#]|$)/i);
    if (!m || !/^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(m[1]) || (m[2] && m[2] !== '443')) return null;
    return s;
  } catch (_) { return null; }
}
function sheetSafeText_(value) {
  const text = String(value == null ? '' : value).slice(0, 500);
  return /^[\s]*[=+\-@]/.test(text) ? "'" + text : text;
}
function watchTimestamp_(raw) {
  if (typeof raw !== 'string' || raw.length > 85 || !/(?:Z|GMT|UT|[+-]\d\d:?\d\d)$/i.test(raw.trim())) return null;
  const d = new Date(raw);
  return Number.isFinite(d.valueOf()) ? d : null;
}
function watchNumeric_(v) { return typeof v === 'number' && Number.isFinite(v) && v >= 0; }

function watchSheet_(tabKey) {
  if (WATER_WATCH.SHEET_ID === '__PRIVATE_SHEET_ID__') throw Error('PRIVATE_SHEET_LINK_MISSING');
  const sheet = SpreadsheetApp.openById(WATER_WATCH.SHEET_ID).getSheetByName(WATER_TABS[tabKey]);
  if (!sheet) throw Error('MISSING_TAB_' + tabKey);
  const expected = WATER_HEADERS[tabKey];
  if (expected) {
    const actual = sheet.getRange(1, 1, 1, expected.length).getValues()[0];
    if (expected.some((key, i) => actual[i] !== key)) throw Error('SCHEMA_MISMATCH_' + tabKey);
  }
  return sheet;
}
function waterUrl_() {
  return WATER_WATCH.URL + '?latitude=' + WATER_WATCH.LAT + '&longitude=' + WATER_WATCH.LON +
    '&daily=river_discharge&past_days=1&forecast_days=' + WATER_WATCH.MODEL_DAYS + '&timezone=GMT';
}
function readFloodForecast_() {
  const url = waterUrl_();
  const response = UrlFetchApp.fetch(url, {muteHttpExceptions: true, followRedirects: false});
  if (response.getResponseCode() !== 200) throw Error('FLOOD_API_HTTP_' + response.getResponseCode());
  const raw = response.getContentText('UTF-8');
  if (raw.length > 200000) throw Error('FLOOD_API_TOO_LARGE');
  const data = JSON.parse(raw);
  if (!data || data.error || !data.daily || !data.daily_units ||
      data.daily_units.river_discharge !== 'm³/s') throw Error('FLOOD_API_SCHEMA');
  const dates = data.daily.time, vals = data.daily.river_discharge;
  if (!Array.isArray(dates) || !Array.isArray(vals) || dates.length !== vals.length || dates.length > 30)
    throw Error('FLOOD_API_SERIES');
  const entries = [];
  for (let i = 0; i < dates.length; i++) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dates[i])) continue;
    if (!watchNumeric_(vals[i])) continue;
    entries.push({date: dates[i], value: vals[i]});
  }
  if (!entries.length) throw Error('FLOOD_DATA_UNAVAILABLE');
  return {source_url: url, model_lat: watchNumeric_(data.latitude) ? data.latitude : '',
    model_lon: watchNumeric_(data.longitude) ? data.longitude : '', entries};
}
function priorityForNews_(headline, trustedSourceArea, sourcePriority) {
  const title = String(headline || '').slice(0, 300);
  if (!WATER_TERMS.test(title)) return null;
  if (/อุทัยธานี/.test(title) && !/พระนครศรีอยุธยา|อยุธยา|อายุธยา|อ่างทอง|ปทุมธานี|สระบุรี|ลพบุรี|สุพรรณบุรี/.test(title)) return null;
  const isAyutthaya = /พระนครศรีอยุธยา|อยุธยา|อายุธยา/.test(title);
  const uthaiClaim = /อุทัย/.test(title) && !/อุทัยธานี/.test(title);
  if (sourcePriority === 1 && /อุทัย/.test(trustedSourceArea)) return 1;
  if (uthaiClaim && isAyutthaya) return 1;
  if (isAyutthaya || (sourcePriority === 2 && /อยุธยา/.test(trustedSourceArea))) return 2;
  if (NEIGHBOR_PROVINCES.test(title) || sourcePriority === 3) return 3;
  return null;
}
function readyNewsSources_() {
  const s = watchSheet_('sources');
  if (s.getLastRow() <= 1) return [];
  return s.getRange(2, 1, Math.min(s.getLastRow()-1, 200), 10).getValues()
    .filter(r => r[8] === 'YES' && r[7] === 'APPROVED' &&
      r[6] === 'APPROVED_RSS' && watchSourceUrl_(r[5]) && [1,2,3].includes(Number(r[0])))
    .slice(0, WATER_WATCH.SOURCE_MAX).map(r => ({priority: Number(r[0]), area: String(r[1]),
      name: String(r[2]), platform: String(r[3]), type: String(r[4]), feed: String(r[5])}));
}
function feedItems_(source) {
  const response = UrlFetchApp.fetch(source.feed, {muteHttpExceptions: true, followRedirects: false});
  if (response.getResponseCode() !== 200) throw Error('NEWS_HTTP_' + response.getResponseCode());
  const xml = response.getContentText('UTF-8');
  if (xml.length > 200000 || /<!DOCTYPE|<!ENTITY/i.test(xml)) throw Error('NEWS_XML_REJECTED');
  const doc = XmlService.parse(xml), root = doc.getRootElement(), result = [];
  if (root.getName() === 'rss') {
    const channel = root.getChild('channel');
    if (!channel) throw Error('NEWS_MISSING_CHANNEL');
    const items = channel.getChildren('item').slice(0, WATER_WATCH.ARTICLES_PER_SOURCE);
    for (const i of items) result.push({title: i.getChildText('title'), link: i.getChildText('link'),
      published: i.getChildText('pubDate')});
  } else if (root.getName() === 'feed') {
    const ns = root.getNamespace();
    for (const e of root.getChildren('entry', ns).slice(0, WATER_WATCH.ARTICLES_PER_SOURCE)) {
      const link = e.getChildren('link', ns).find(l => !l.getAttribute('rel') || l.getAttribute('rel').getValue() === 'alternate');
      result.push({title: e.getChildText('title', ns),
        link: link && link.getAttribute('href') ? link.getAttribute('href').getValue() : '',
        published: e.getChildText('published', ns) || e.getChildText('updated', ns)});
    }
  } else throw Error('NEWS_XML_UNSUPPORTED');
  return result;
}
function collectEvidence_(now) {
  const nowMs = now.valueOf(), gathered = [], errors = [];
  for (const source of readyNewsSources_()) {
    try {
      for (const item of feedItems_(source)) {
        const date = watchTimestamp_(item.published);
        const url = watchSourceUrl_(item.link);
        const title = String(item.title || '').trim().slice(0, 300);
        const priority = priorityForNews_(title, source.area, source.priority);
        if (!date || !url || !title || priority === null || date.getTime() > nowMs + 300000 ||
            nowMs - date.getTime() > WATER_WATCH.NEWS_MAX_AGE_HOURS * 3600000) continue;
        gathered.push({id: watchId_(source.name + '|' + url + '|' + date.toISOString()),
          captured: watchClock_(now), priority, area: source.area, platform: source.platform,
          name: source.name, published: date.toISOString(), title, url,
          type: source.type, event: /น้ำท่วม|น้ำล้น|น้ำหลาก/.test(title) ? 'FLOOD_CLAIM' : 'WATER_LEVEL_CLAIM'});
      }
    } catch (error) { errors.push(source.name.slice(0, 50) + ':' + String(error.message).slice(0, 70)); }
  }
  return {articles: gathered.sort((a,b) => a.priority-b.priority), errors};
}
function recentIds_(sheet, maxRows) {
  const last = sheet.getLastRow();
  if (last < 2) return new Set();
  const n = Math.min(last-1, maxRows);
  return new Set(sheet.getRange(last-n+1, 1, n, 1).getValues().map(x => String(x[0])));
}
function addModelRows_(sheet, forecast, now) {
  const keyBase = watchClock_(now).slice(0,16); // one run/snapshot per minute, retried run idempotent
  const existing = recentIds_(sheet, 600), staged = new Set();
  let inserted = 0;
  for (const entry of forecast.entries) {
    const id = watchId_('GLOFAS|'+keyBase+'|'+entry.date+'|'+entry.value);
    if (existing.has(id) || staged.has(id)) continue;
    sheet.appendRow([id, watchClock_(now), 'อำเภออุทัย จ.พระนครศรีอยุธยา',
      'Open-Meteo / Copernicus GloFAS', 'MODELLED_FORECAST', entry.date, entry.value, 'm³/s',
      forecast.model_lat, forecast.model_lon, false, '', forecast.source_url, '',
      'MODELLED_UNVERIFIED_RIVER_GRID', 'พยากรณ์อัตราการไหล ไม่ใช่ระดับน้ำสถานีหรือความเสี่ยงที่โรงพยาบาล']);
    inserted++; staged.add(id);
  }
  return inserted;
}
function addNewsRows_(sheet, articles) {
  const existing = recentIds_(sheet, 1000), staged = new Set();
  let inserted = 0;
  for (const n of articles.slice(0, 100)) {
    if (existing.has(n.id) || staged.has(n.id)) continue;
    sheet.appendRow([n.id,n.captured,n.priority,sheetSafeText_(n.area),sheetSafeText_(n.platform),
      sheetSafeText_(n.name),n.published,sheetSafeText_(n.title),sheetSafeText_(n.url),
      n.type,'UNVERIFIED','PENDING_REVIEW',n.event,'','','AI ไม่ใช่การยืนยันเหตุการณ์']);
    inserted++; staged.add(n.id);
  }
  return inserted;
}
function writeRun_(started, result, errors) {
  const now = new Date();
  watchSheet_('runs').appendRow([watchId_('RUN|'+started.toISOString()),watchClock_(started),
    watchClock_(now), errors.length ? 'PARTIAL_OR_FAILED' : 'OK',result.water || 0,result.news || 0,
    errors.length ? 'SOURCE_ERRORS' : '',errors.join(' | ').slice(0, 400)]);
}
/** Trigger target; isolated from PM2.5. Never automatically issues flood-risk warnings. */
function runWatch() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1500)) throw Error('ALREADY_RUNNING');
  const started = new Date(), stats = {water: 0, news: 0};
  const errors = [];
  try {
    const w = watchSheet_('water');
    const n = watchSheet_('news');
    watchSheet_('runs'); watchSheet_('sources');
    try { stats.water = addModelRows_(w,readFloodForecast_(),started); }
    catch (err) { errors.push('FLOOD:' + err.message); }
    const news = collectEvidence_(started);
    stats.news = addNewsRows_(n, news.articles);
    errors.push(...news.errors);
    writeRun_(started,stats,errors);
    if (errors.length) throw Error('WATCH_RUN_PARTIAL_CHECK_RUNS');
    return {status:'OK',water_records:stats.water,news_records:stats.news,
      hospital_flood_status:'UNAVAILABLE'};
  } finally { lock.releaseLock(); }
}
/** Zero writes; validates linkage and model endpoint before approval to schedule. */
function dryRunWatch() {
  watchSheet_('water'); watchSheet_('news');watchSheet_('sources');watchSheet_('runs');
  const water = readFloodForecast_();
  const sources = readyNewsSources_();
  return {status:'DRY_RUN_OK',model_records:water.entries.length,
    news_enabled_sources:sources.length,hospital_flood_status:'UNAVAILABLE'};
}
/** One-time explicit opt-in. Deletes ONLY old triggers for runWatch within this NEW script. */
function installThirtyMinuteTrigger() {
  dryRunWatch();
  const all = ScriptApp.getProjectTriggers();
  const ours = all.filter(t => t.getHandlerFunction() === 'runWatch');
  if (ours.length === 1) return {status:'ALREADY_CONFIGURED'};
  if (ours.length > 1) throw Error('DUPLICATE_TRIGGER_REVIEW_REQUIRED');
  ScriptApp.newTrigger('runWatch').timeBased().everyMinutes(30).create();
  return {status:'TRIGGER_30_MIN_CREATED'};
}
/** Safer rollback: remove ONLY this project's matching trigger. */
function disableWatchTrigger() {
  const ours = ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'runWatch');
  ours.forEach(t => ScriptApp.deleteTrigger(t));
  return {disabled:ours.length};
}
