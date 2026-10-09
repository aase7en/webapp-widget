/**
 * Version-controlled snapshot for Google Apps Script project "API Report_PM2.5".
 * Deployment is independent of GitHub Pages. Update live project via reviewed release only.
 * No credentials or LINE Notify (retired in 2025) may be committed here.
 */
const CONFIG = Object.freeze({
  SPREADSHEET_ID: '1kBUKdezfAxIziq167e-RJV1nNZkeiaz6YQcpVAMja9w',
  GISTDA_AIR: 'https://pm25.gistda.or.th/rest/getPm25byTambon?ap_idn=1414',
  SHEET_PRIMARY: 'ชีต1',
  SHEET_HISTORY: 'ชีต2'
});

function validConcentration(raw) {
  // Explicit null/blank are unavailable, not zero.
  // Reject booleans/arrays/objects: Number(false) and Number([]) falsely become 0.
  if (typeof raw !== 'number' && typeof raw !== 'string') return null;
  if (typeof raw === 'string' && raw.trim() === '') return null;
  const v = Number(raw);
  return Number.isFinite(v) && v >= 0 ? v : null;
}
function getGistdaUthaiData() {
  const res = UrlFetchApp.fetch(CONFIG.GISTDA_AIR, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('GISTDA request failed: HTTP ' + res.getResponseCode());
  const payload = JSON.parse(res.getContentText());
  if (payload?.status !== undefined && Number(payload.status) !== 200) throw new Error('GISTDA returned an error status');
  if (!Array.isArray(payload?.data)) throw new Error('Invalid GISTDA response structure');
  const uthai = payload.data.find(row => row.tb_tn === 'อุทัย');
  if (!uthai) throw new Error('Uthai tambon not found in GISTDA response');
  return {
    tambon: uthai.tb_tn,
    pm25: validConcentration(uthai.pm25),
    pm25Avg24hr: validConcentration(uthai.pm25Avg24hr),
    datetime: payload.datetimeThai || null,
    source: 'GISTDA PM2.5 tambon API',
    status: 'LATEST'
  };
}
// Compatibility entry point for any existing callers; never synthesize unavailable WAQI data.
function fetchAirQualityData() {
  return { gistda: getGistdaUthaiData(), thai: null, global: null };
}
function getWidgetData() {
  try {
    const data = getGistdaUthaiData();
    return { gistda: { selectedArea: {
      pm25: data.pm25, pm25Avg24hr: data.pm25Avg24hr, area: data.tambon,
      dateTime: data.datetime, source: data.source, status: data.status
    }}};
  } catch (error) {
    console.error('Widget data unavailable: ' + String(error.message));
    return { error: true, message: 'ไม่สามารถดึงข้อมูลคุณภาพอากาศได้' };
  }
}
function createMessage(airData) {
  // Historical helper retained for callers; sending LINE Notify has been retired.
  const g = airData?.gistda;
  if (!g) throw new Error('Missing GISTDA data');
  return { message: 'รายงาน PM2.5 ตำบล' + g.tambon +
    ': ' + (g.pm25 === null ? 'ไม่มีข้อมูล' : g.pm25 + ' µg/m³') +
    ' (จาก GISTDA)', imageFile: null };
}
function ensureSheet(name, headers) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(name);
  if (!sheet) throw new Error('Sheet missing: ' + name);
  if (!sheet.getRange(1, 1).getValue()) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sheet;
}
function main() {
  // Preserve existing five-column layout. AQI and PM10 have no verified concentration
  // source in this pipeline: write blanks rather than misinformation (or "NaN").
  const g = getGistdaUthaiData();
  if (g.pm25 === null && g.pm25Avg24hr === null) throw new Error('GISTDA concentrations unavailable');
  const sheet = ensureSheet(CONFIG.SHEET_PRIMARY,
    ['Timestamp (recorded)', 'AQI (US)', 'PM10 (µg/m³)', 'PM2.5 (µg/m³)', 'PM2.5 24hr Avg (µg/m³)']);
  sheet.appendRow([new Date(), '', '', g.pm25, g.pm25Avg24hr]);
  console.log('Primary PM2.5 reading recorded (GISTDA; AQI/PM10 unavailable)');
}
function logPm25ToSheet2(airData) {
  const g = airData?.gistda;
  if (!g || g.pm25Avg24hr === null) throw new Error('GISTDA 24h average unavailable');
  const sheet = ensureSheet(CONFIG.SHEET_HISTORY,
    ['วันที่-เวลาบันทึก', 'ตำบล', 'ค่าเฉลี่ย PM2.5 (24 ชม.)']);
  sheet.appendRow([new Date(), g.tambon, g.pm25Avg24hr]);
}
function logGistdaData() { logPm25ToSheet2(fetchAirQualityData()); }
function createDailyTrigger() {
  // Only replace triggers owned by this widget. Never delete unrelated triggers.
  const functions = new Set(['main', 'logGistdaData']);
  ScriptApp.getProjectTriggers().filter(t => functions.has(t.getHandlerFunction()))
    .forEach(t => ScriptApp.deleteTrigger(t));
  [[ 'main', 6 ], [ 'main', 16 ], [ 'logGistdaData', 8 ], [ 'logGistdaData', 20 ]]
    .forEach(([func, hour]) => ScriptApp.newTrigger(func).timeBased().atHour(hour).everyDays(1).create());
}
function doGet() {
  return HtmlService.createTemplateFromFile('index').evaluate()
    .setTitle('Air Quality Widget').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
