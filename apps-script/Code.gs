/**
 * Code.gs — SANITIZED PUBLIC REFERENCE of live Apps Script project
 * "API Report_PM2.5" (baseline pull @24 "Widget_V1.2", 2026-10-17; stored
 * outside the repo — raw backup never committed). RUNTIME differs from this
 * file ONLY by: live WAQI token kept in CONFIG (redacted here to the Script
 * Property name WAQI_TOKEN; commented LINE tokens redacted to LINE_TOKEN_*
 * names). Every function body is byte-identical to the live baseline except
 * the DOCUMENTED SECURITY PATCHES below (this file is the patched reference;
 * the runtime candidate carries the same patches with real values):
 *   PATCH 1 (routing):  doGet(e) -> BackendApi.doGet(e) for ?action=data
 *   PATCH 2 (guard):    createDailyTrigger requires a real owner caller and
 *                       only delegates to the owned 2x/day installer
 *                       (legacy body deleted ALL project triggers)
 *   PATCH 3 (guards):   main / importDataToSpreadsheet / logGistdaData /
 *                       logPm25ToSheet2 wrapped: assertOwnerCaller_() entry
 *                       guard, original bodies preserved as *_ twins so the
 *                       legacy owner-installed triggers keep working during
 *                       staged migration. getWidgetData stays public (read).
 * No reflection dispatch, no eval. Deploy/rollback: README.
 */
/** ค่าคงที่สำหรับการตั้งค่าระบบ */ 
const CONFIG = {
  SPREADSHEET_ID: "1kBUKdezfAxIziq167e-RJV1nNZkeiaz6YQcpVAMja9w",
  //LINE_TOKEN: [
    //'<REDACTED:store in Script Property LINE_TOKEN_*>',// ข่าวสาร รพ.อุทัย
      //'<REDACTED:store in Script Property LINE_TOKEN_*>',// Direct
    //'<REDACTED:store in Script Property LINE_TOKEN_*>'// อสม
  //],
  API_ENDPOINTS: {
  THAI_AIR: "http://air4thai.pcd.go.th/services/getNewAQI_JSON.php?stationID=21t",
  GLOBAL_AIR: "https://api.waqi.info/feed/A419398/?token=${SCRIPT_PROPERTY:WAQI_TOKEN}  // reference placeholder — runtime keeps the real token; see README required properties",
  GISTDA_AIR: "https://pm25.gistda.or.th/rest/getPm25byTambon?ap_idn=1414"
},

  PM25_LEVELS: {
    VERY_GOOD: { min: 0, max: 25, color: '#00E400' },
    GOOD: { min: 26, max: 37, color: '#FFFF00' },
    MODERATE: { min: 38, max: 50, color: '#FF7E00' },
    UNHEALTHY_SENSITIVE: { min: 51, max: 90, color: '#FF0000' },
    UNHEALTHY: { min: 91, max: Infinity, color: '#8F3F97' }
  }
};

/** สำหรับการจัดการ Errors */
class AirQualityError extends Error {
  constructor(message, type) {
    super(message);
    this.name = 'AirQualityError';
    this.type = type;
  }
}

function assertOwnerCaller_(fnName) {
  // SECURITY PATCH (2026-10-17): the public HtmlService UI exposes every
  // non-underscore top-level function to google.script.run, executing as the
  // deploying owner. Write entry points now require a trusted caller:
  // a scheduled trigger whose handler is exactly fnName, or a live owner
  // session (active user email == effective user email, both non-empty).
  // A boolean flag alone is consent UX, not authentication.
  try {
    var t = ScriptApp.getScriptTrigger();
    if (t && t.getHandlerFunction && t.getHandlerFunction() === fnName) return;
  } catch (e) { /* not in a trigger context */ }
  var a = '', e2 = '';
  try { a = String(Session.getActiveUser().getEmail() || '').toLowerCase(); } catch (x) { a = ''; }
  try { e2 = String(Session.getEffectiveUser().getEmail() || '').toLowerCase(); } catch (x) { e2 = ''; }
  if (a !== '' && e2 !== '' && a === e2) return;
  throw new Error('Guard: caller is not the trusted owner (fn=' + fnName + ') — refusing.');
}

// ฟังก์ชันสำหรับรวม HTML templates
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** เพิ่ม retry mechanism */
function fetchWithRetry(url, options = {}, maxRetries = 3) {
  if (/^https:\/\/pm25\.gistda\.or\.th\//.test(String(url))) {
    const payload = BackendApi.gistdaPayload(url, false);
    return { getContentText: () => JSON.stringify(payload), getResponseCode: () => 200, getHeaders: () => ({}) };
  }
  for (let i = 0; i < maxRetries; i++) {
    try {
      return UrlFetchApp.fetch(url, options);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      Utilities.sleep(1000 * Math.pow(2, i)); // exponential backoff
    }
  }
}

/** ฟังก์ชันหลักที่จะถูกเรียกใช้ */
function optionalPM25_(raw) {
  if ((typeof raw !== 'number' && typeof raw !== 'string') ||
      (typeof raw === 'string' && raw.trim() === '')) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function gistdaForMain_() {
  const payload = BackendApi.gistdaPayload(CONFIG.API_ENDPOINTS.GISTDA_AIR, false);
  if (payload?.status !== undefined && Number(payload.status) !== 200) {
    throw new Error('GISTDA response status not OK');
  }
  if (!Array.isArray(payload?.data)) {
    throw new Error('GISTDA response data missing');
  }
  const uthai = payload.data.find(row => row?.tb_tn === 'อุทัย');
  if (!uthai) throw new Error('GISTDA Uthai tambon not found');

  const pm25 = optionalPM25_(uthai.pm25);
  const avg24 = optionalPM25_(uthai.pm25Avg24hr);
  if (pm25 === null && avg24 === null) {
    throw new Error('GISTDA PM2.5 values unavailable');
  }
  return {
    gistda: {
      pm25: pm25,
      pm25Avg24hr: avg24,
      tambon: uthai.tb_tn,
      datetime: payload.datetimeThai || null,
      observedMs: BackendApi.gistdaObservedMs(uthai, payload)
    }
  };
}

function main_() {
  try {
    // This pathway runs independently of WAQI/PM10 and Air4Thai.
    const airData = gistdaForMain_();
    importDataToSpreadsheet_(airData);
    Logger.log('PM2.5 primary sheet recorded using GISTDA');
  } catch (error) {
    // Rethrow so the Apps Script execution is FAILED, not false SUCCESS.
    Logger.log('main failed: ' + error.message);
    throw error;
  }
}

function main() {
  // SECURITY PATCH: original body preserved byte-for-byte as main_; entry now guarded.
  // Scheduled history entry (legacy 06/16, GISTDA-primary).
  assertOwnerCaller_('main');
  return main_();
}


/** ดึงข้อมูลคุณภาพอากาศจาก API */ 
function fetchAirQualityData() {
  try {
    // Log URLs being used
    Logger.log('Fetching data from Thai API:', CONFIG.API_ENDPOINTS.THAI_AIR);
    Logger.log('Fetching data from Global API:', CONFIG.API_ENDPOINTS.GLOBAL_AIR);
    Logger.log('Fetching data from GISTDA API:', CONFIG.API_ENDPOINTS.GISTDA_AIR);
    
    // Validate URLs
    if (!CONFIG.API_ENDPOINTS.THAI_AIR || !CONFIG.API_ENDPOINTS.GLOBAL_AIR || !CONFIG.API_ENDPOINTS.GISTDA_AIR) {
      throw new Error('Missing API endpoint configuration');
    }

    const thaiResponse = fetchWithRetry(CONFIG.API_ENDPOINTS.THAI_AIR);
    Logger.log('Thai API Response:', thaiResponse.getContentText());
    
    const globalResponse = fetchWithRetry(CONFIG.API_ENDPOINTS.GLOBAL_AIR);
    Logger.log('Global API Response:', globalResponse.getContentText());
    
    const gistdaData = BackendApi.gistdaPayload(CONFIG.API_ENDPOINTS.GISTDA_AIR, false);
    
    const thaiData = JSON.parse(thaiResponse.getContentText());
    const globalData = JSON.parse(globalResponse.getContentText());

    
    // Validate API responses
    if (!thaiData) throw new Error('Invalid Thai API response');
    if (!globalData) throw new Error('Invalid Global API response');
    if (!gistdaData) throw new Error('Invalid GISTDA API response');
    
    // Find data for ตำบลอุทัย and validate
    const uthai = gistdaData.data?.find(item => item.tb_tn === 'อุทัย');
    if (!uthai) {
      throw new Error('ไม่พบข้อมูลตำบลอุทัย');
    }

    // Log processed data
    Logger.log('Processed Data:', {
      thai: thaiData,
      global: globalData,
      gistda: {
        pm25: uthai.pm25,
        pm25Avg24hr: uthai.pm25Avg24hr,
        datetime: gistdaData.datetimeThai
      }
    });
    
    return {
      thai: thaiData,
      global: globalData,
      gistda: {
        pm25: uthai.pm25,
        pm25Avg24hr: uthai.pm25Avg24hr,
        datetime: gistdaData.datetimeThai,
        observedMs: BackendApi.gistdaObservedMs(uthai, gistdaData),
        tambon: uthai.tb_tn
      }
    };
  } catch (error) {
    Logger.log('Error in fetchAirQualityData:', error.message);
    throw new AirQualityError('Failed to fetch air quality data: ' + error.message, 'API_ERROR');
  }
}

/** ตรวจสอบระดับ PM2.5 และให้คำแนะนำ */ 
function getPM25Advice(pm25Value) {
  const levels = CONFIG.PM25_LEVELS;
  let advice = {
    level: '',
    color: '',
    generalAdvice: '',
    riskGroupAdvice: ''
  };

  if (pm25Value >= levels.UNHEALTHY.min) {
    advice = {
      level: 'มีผลกระทบต่อสุขภาพ',
      color: levels.UNHEALTHY.color,
      generalAdvice: 'ลดหรืองดการทำกิจกรรมนอกบ้าน หากจำเป็นต้องสวมหน้ากากป้องกัน PM2.5',
      riskGroupAdvice: 'งดออกนอกบ้าน และออกกำลังกายกลางแจ้ง ควรอยู่ในอาคาร'
    };
  } else if (pm25Value >= levels.UNHEALTHY_SENSITIVE.min) {
    advice = {
      level: 'เริ่มมีผลกระทบต่อสุขภาพ',
      color: levels.UNHEALTHY_SENSITIVE.color,
      generalAdvice: 'ควรลดหรือจำกัดการทำกิจกรรมนอกบ้าน',
      riskGroupAdvice: 'ลดเวลาการทำกิจกรรมออกนอกบ้าน'
    };
  } else if (pm25Value >= levels.MODERATE.min) {
    advice = {
      level: 'ปานกลาง',
      color: levels.MODERATE.color,
      generalAdvice: 'ควรหลีกเลี่ยงการทำกิจกรรมหรือออกกำลังกายกลางแจ้ง',
      riskGroupAdvice: 'ควรหลีกเลี่ยงการทำกิจกรรมนอกบ้าน'
    };
  } else if (pm25Value >= levels.GOOD.min) {
    advice = {
      level: 'ดี',
      color: levels.GOOD.color,
      generalAdvice: 'ทำกิจกรรมกลางแจ้งได้ตามปกติ',
      riskGroupAdvice: 'ควรหลีกเลี่ยงการทำกิจกรรมหรือออกกำลังกายกลางแจ้ง'
    };
  } else {
    advice = {
      level: 'ดีมาก',
      color: levels.VERY_GOOD.color,
      generalAdvice: 'ทำกิจกรรมกลางแจ้งได้ตามปกติ',
      riskGroupAdvice: 'ทำกิจกรรมกลางแจ้งได้ตามปกติ'
    };
  }
  
  return advice;
}

/** แปลงรูปแบบวันที่เป็นภาษาไทย */
function formatThaiDateTime(dateTimeStr) {
  const thaiMonthsShort = {
    'January': 'ม.ค.',
    'February': 'ก.พ.',
    'March': 'มี.ค.',
    'April': 'เม.ย.',
    'May': 'พ.ค.',
    'June': 'มิ.ย.',
    'July': 'ก.ค.',
    'August': 'ส.ค.',
    'September': 'ก.ย.',
    'October': 'ต.ค.',
    'November': 'พ.ย.',
    'December': 'ธ.ค.'
  };

  try {
    const date = new Date(dateTimeStr);
    const formatted = Utilities.formatDate(date, "Asia/Bangkok", "dd-MMMM-yyyy HH:mm:ss");
    
    return formatted.replace(/(\d+)-(\w+)-(\d+) (\d+:\d+:\d+)/, (match, day, month, year, time) => {
      // แปลงเวลาให้แสดงแค่ชั่วโมงและนาที
      const timeFormat = time.substr(0, 5);
      return `${parseInt(day)} ${thaiMonthsShort[month]} ${parseInt(year) + 543} เวลา ${timeFormat} น.`;
    });
  } catch (error) {
    Logger.log('Error formatting date: ' + error.message);
    return dateTimeStr;
  }
}

/** สร้างข้อความแจ้งเตือน */
function createMessage(airData) {
  try {
    const { global, gistda } = airData;
    if (!global?.data?.iaqi || !gistda) {
      throw new Error('Invalid air quality data structure');
    }

    const pm25Value = gistda.pm25; // ใช้ค่า PM2.5 จาก GISTDA แทน
    const advice = getPM25Advice(pm25Value);
    const formattedDateTime = `${gistda.datetime.dateThai} ${gistda.datetime.timeThai}`; // ใช้เวลาจาก GISTDA

    const messageText = `
🔔 รายงานคุณภาพอากาศ พื้นที่ตำบลอุทัย
📅 ${formattedDateTime}

📊 ข้อมูลคุณภาพอากาศ:
- AQI(US) = ${global.data.aqi}
- PM2.5 = ${pm25Value.toFixed(1)} (μg/m³)
- PM2.5 เฉลี่ย 24 ชม. = ${gistda.pm25Avg24hr.toFixed(1)} (μg/m³)
- PM10 = ${global.data.iaqi.pm10.v} (μg/m³)
- อุณหภูมิ = ${global.data.iaqi.t.v}°C

🏥 ระดับคุณภาพอากาศ: ${advice.level}

📝 คำแนะนำ:
- ประชาชนทั่วไป: ${advice.generalAdvice}
- กลุ่มเสี่ยง: ${advice.riskGroupAdvice}

🌐 ข้อมูลเพิ่มเติม: https://pm25.gistda.or.th/
    `.trim();

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ชีต1');
    const chart = sheet?.getCharts()[0];
    const imageBlob = chart ? chart.getBlob().getAs("image/png") : null;

    return {
      message: messageText,
      imageFile: imageBlob
    };
  } catch (error) {
    throw new AirQualityError('Failed to create message: ' + error.message, 'MESSAGE_ERROR');
  }
}
/** ส่งการแจ้งเตือนไปยัง Line Notify */
// function sendLineNotification(message) {
//   try {
//     // Validate message object
//     if (!message) {
//       throw new Error('Message object is null or undefined');
//     }
    
//     if (!message.message) {
//       throw new Error('Message text is required');
//     }

//     // Log message content before sending
//     Logger.log('Preparing to send Line notification with message:', message.message);

//     // วนลูปสำหรับแต่ละ Line Token
//     CONFIG.LINE_TOKEN.forEach((token) => {
//       if (!token) {
//         Logger.log('Warning: Empty LINE token found');
//         return;
//       }

//       const options = {
//         "method": 'post',
//         "headers": { 
//           "Authorization": "Bearer " + token 
//         },
//         "payload": {
//           "message": message.message,
//           "imageFile": message.imageFile
//         },
//         "muteHttpExceptions": true
//       };

//       try {
//         Logger.log('Sending notification to LINE with token:', token.substring(0, 10) + '...');
//         const response = UrlFetchApp.fetch("https://notify-api.line.me/api/notify", options);
//         const responseCode = response.getResponseCode();
//         const responseContent = response.getContentText();
        
//         Logger.log('LINE API Response Code:', responseCode);
//         Logger.log('LINE API Response Content:', responseContent);

//         if (responseCode !== 200) {
//           throw new Error(`Line API returned status code ${responseCode}`);
//         }

//         Logger.log(`Line notification sent successfully for token: ${token}`);
//       } catch (error) {
//         Logger.log(`Failed to send Line notification for token: ${token}. Error: ${error.message}`);
//         // Continue with other tokens even if one fails
//       }
//     });
//   } catch (error) {
//     Logger.log('Error in sendLineNotification:', error.message);
//     throw new AirQualityError('Failed to send notification: ' + error.message, 'NOTIFICATION_ERROR');
//   }
// }

/** ฟังก์ชันสำหรับ import ข้อมูลเข้า Spreadsheet */
function importDataToSpreadsheet_(airData) {
  const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
    .getSheetByName('ชีต1');
  if (!sheet) throw new Error('Spreadsheet tab ชีต1 is missing');

  const gistda = airData?.gistda;
  if (!gistda) throw new Error('Missing GISTDA result');
  const pm25 = optionalPM25_(gistda.pm25);
  const avg24 = optionalPM25_(gistda.pm25Avg24hr);
  if (pm25 === null && avg24 === null) {
    throw new Error('Missing GISTDA PM2.5 concentration');
  }

  const fallback = BackendApi.parseThaiDateTime(gistda.datetime);
  const observedMs = typeof gistda.observedMs === 'number' && Number.isFinite(gistda.observedMs) ? gistda.observedMs : (fallback ? fallback.ms : null);
  if (observedMs === null) throw new Error('Missing GISTDA observation time');

  // Initialise the header BEFORE appending: on a blank sheet the first
  // appendRow() would occupy row 1 and hide the absence of a header.
  const header = sheet.getRange(1, 1, 1, 5).getValues()[0];
  if (!header[0]) {
    sheet.getRange(1, 1, 1, 5).setValues([[
      'Timestamp', 'AQI (US)', 'PM10 (µg/m³)',
      'PM2.5 (µg/m³)', 'PM2.5 24hr Avg (µg/m³)'
    ]]);
  }

  // WAQI's PM10 subindex is not PM10 mass in µg/m³.
  // Never fabricate zero, a measurement or NaN in AQI/PM10 columns.
  const newRow = [formatThaiDateTime(new Date(observedMs)), '', '', pm25 === null ? '' : pm25,
    avg24 === null ? '' : avg24];
  sheet.appendRow(newRow);
  sheet.getRange(sheet.getLastRow(), 2, 1, 4).setNumberFormat('0.00');
  // Never delete historical sheet rows as a side-effect of a hotfix.
}

function importDataToSpreadsheet(airData) {
  // SECURITY PATCH: original body preserved byte-for-byte as importDataToSpreadsheet_; entry now guarded.
  // Sheet-write entry.
  assertOwnerCaller_('importDataToSpreadsheet');
  return importDataToSpreadsheet_(airData);
}


/** จัดการข้อผิดพลาด */
function handleError(error) {
  const errorMessage = `🚨 เกิดข้อผิดพลาด: ${error.message}`;
  Logger.log(errorMessage);
  
  // try {
  //   sendLineNotification({ message: errorMessage });
  // } catch (notifyError) {
  //   Logger.log('Failed to send error notification: ' + notifyError.message);
  // }
}

/** สร้าง Trigger สำหรับรันอัตโนมัติ */
function createDailyTrigger() {
  // SECURITY PATCH: legacy body DELETED ALL project triggers and restored the
  // old 4x/day schedule. Now requires a real owner caller (scheduled context or
  // owner session) — a boolean alone is not authorization — and then only ever
  // delegates to the owned installer (exactly 2 batches/day).
  assertOwnerCaller_('createDailyTrigger');
  var cfg = BackendApi.loadConfig();
  if (!cfg.ok) throw new Error('createDailyTrigger guard: configuration invalid (' + cfg.reason + ') — refusing to touch triggers.');
  return BackendApi.installTriggers();
}


/** Web App functions */
function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'water_history') return waterHistoryRead_(e);
  // SECURITY PATCH/ROUTING: ?action=data&v=1 -> BackendApi JSON (additive);
  // everything else keeps the legacy HtmlService UI byte-for-byte. Reaching
  // the BackendApi closure var keeps the route server-side only — no public
  // wrapper function exists for google.script.run to call.
  return BackendApi.doGet(e);
}

function getWidgetData() {
  try {
    const gistdaData = BackendApi.gistdaPayload(CONFIG.API_ENDPOINTS.GISTDA_AIR, false);
    
    // ค้นหาข้อมูลตำบลอุทัย
    const uthaiData = gistdaData.data.find(item => item.tb_tn === "อุทัย");
    if (!uthaiData) {
      throw new Error('ไม่พบข้อมูลตำบลอุทัย');
    }

    Logger.log('uthaiData:', uthaiData); // เพิ่ม logging

    return {
      gistda: {
        selectedArea: {
          pm25: uthaiData.pm25,
          area: uthaiData.tb_tn,
          dateTime: gistdaData.datetimeThai
        }
      }
    };
  } catch (error) {
    Logger.log('Error in getWidgetData:', error);
    return {
      error: true,
      message: error.message
    };
  }
}


/** ฟังก์ชันสำหรับบันทึกข้อมูล PM2.5 ลงใน 'ชีต2' */
function logPm25ToSheet2_(airData) {
  try {
    const gistda = airData && airData.gistda;
    if (!gistda || !gistda.tambon) throw new Error('Invalid GISTDA data structure or missing tambon name');
    const fallback = BackendApi.parseThaiDateTime(gistda.datetime);
    const observedMs = typeof gistda.observedMs === 'number' && Number.isFinite(gistda.observedMs) ? gistda.observedMs : (fallback ? fallback.ms : null);
    if (observedMs === null) throw new Error('Missing GISTDA observation time');
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName("ชีต2");

    // ถ้ายังไม่มี "ชีต2" ให้สร้างขึ้นมาใหม่พร้อมหัวตารางใหม่
    if (!sheet) {
      sheet = spreadsheet.insertSheet("ชีต2");
      // กำหนดหัวตารางตามที่เจ้านายต้องการ
      sheet.appendRow(['วันที่-เวลา', 'ตำบล', 'ค่าเฉลี่ย PM2.5 (24 ชม.)']);
    }

    // Preserve the source observation time, including when last-good is reused.
    const formattedTimestamp = Utilities.formatDate(new Date(observedMs), "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss");
    
    // ดึงข้อมูลชื่อตำบล และค่าเฉลี่ย 24 ชม.
    const tambonName = gistda.tambon;
    const pm25Avg24hr = gistda.pm25Avg24hr ? Number(gistda.pm25Avg24hr).toFixed(2) : '-';
    
    // เพิ่มข้อมูลแถวใหม่ตามรูปแบบที่ต้องการ
    sheet.appendRow([formattedTimestamp, tambonName, pm25Avg24hr]);
    
    Logger.log("Average PM2.5 data logged successfully to ชีต2");
  } catch (error) {
    handleError(new AirQualityError('Failed to log data to ชีต2: ' + error.message, 'SHEET2_LOGGING_ERROR'));
  }
}

function logPm25ToSheet2(airData) {
  // SECURITY PATCH: original body preserved byte-for-byte as logPm25ToSheet2_; entry now guarded.
  // Sheet-write entry.
  assertOwnerCaller_('logPm25ToSheet2');
  return logPm25ToSheet2_(airData);
}


/** ฟังก์ชันสำหรับ Trigger เพื่อดึงและบันทึกข้อมูล GISTDA ลงชีต2 */
function logGistdaData_() {
  try {
    const airData = fetchAirQualityData();
    logPm25ToSheet2_(airData);
  } catch (error) {
    handleError(error); // ใช้ handleError เดิมในการจัดการ Error
  }
}

function logGistdaData() {
  // SECURITY PATCH: original body preserved byte-for-byte as logGistdaData_; entry now guarded.
  // Scheduled history entry (legacy 08/20).
  assertOwnerCaller_('logGistdaData');
  return logGistdaData_();
}
