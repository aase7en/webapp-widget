/** ค่าคงที่สำหรับการตั้งค่าระบบ */
const CONFIG = {
  SPREADSHEET_ID: "1kBUKdezfAxIziq167e-RJV1nNZkeiaz6YQcpVAMja9w",
  //LINE_TOKEN: [
    //'8U9ZeQKj0N0SRdxK0sbeHta8yfX2AgzsWDVRPAREj33',// ข่าวสาร รพ.อุทัย
      //'DVDfc5aTttR3eUCG1pJCKj0ANO2ZDrOqPeZXqKvL6AI',// Direct
    //'5mYp38Vlqd8KiYNkNZPFjjT43mv5SleerZ8Dko6pkDQ'// อสม
  //],
  API_ENDPOINTS: {
  THAI_AIR: "http://air4thai.pcd.go.th/services/getNewAQI_JSON.php?stationID=21t",
  GLOBAL_AIR: "https://api.waqi.info/feed/A419398/?token=a5dec343b1b32382758bf6f2d07c3f4af6238ebc",
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

// ฟังก์ชันสำหรับรวม HTML templates
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/** เพิ่ม retry mechanism */
function fetchWithRetry(url, options = {}, maxRetries = 3) {
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
function main() {
  try {
    const airData = fetchAirQualityData();
    importDataToSpreadsheet(airData);
    const message = createMessage(airData);
    //sendLineNotification(message);
    Logger.log('Air quality monitoring completed successfully');
  } catch (error) {
    handleError(error);
  }
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

    const gistdaResponse = fetchWithRetry(CONFIG.API_ENDPOINTS.GISTDA_AIR);
    Logger.log('GISTDA API Response:', gistdaResponse.getContentText());

    const thaiData = JSON.parse(thaiResponse.getContentText());
    const globalData = JSON.parse(globalResponse.getContentText());
    const gistdaData = JSON.parse(gistdaResponse.getContentText());

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
function importDataToSpreadsheet(airData) {
  try {
    const sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName("ชีต1");
    if (!sheet) {
      throw new Error('Sheet not found');
    }

    const { global, gistda } = airData;
    if (!global?.data || !gistda) {
      throw new Error('Invalid air data structure');
    }

    // Format date from GISTDA data
    const now = new Date();
    const formattedDate = formatThaiDateTime(now);

    // Manage rows (keep only last 7 days of data)
    if (sheet.getLastRow() > 7) {
      sheet.deleteRows(2, 1);
    }

    // Add new row with specified data and format numbers to 2 decimal places
    const newRow = [
      formattedDate,
      global.data.aqi ? Number(global.data.aqi).toFixed(2) : '-',
      global.data.iaqi.pm10.v ? Number(global.data.iaqi.pm10.v).toFixed(2) : '-',
      gistda.pm25 ? Number(gistda.pm25).toFixed(2) : '-',
      gistda.pm25Avg24hr ? Number(gistda.pm25Avg24hr).toFixed(2) : '-'
    ];

    // Add the row
    sheet.appendRow(newRow);

    // Get the range of the newly added row
    const lastRow = sheet.getLastRow();
    const dataRange = sheet.getRange(lastRow, 2, 1, 4); // Columns B-E (numeric columns)

    // Format numbers in the range
    dataRange.setNumberFormat('0.00');

    // Set column headers if not already set
    const headers = sheet.getRange(1, 1, 1, 5).getValues()[0];
    if (!headers[0]) {
      sheet.getRange(1, 1, 1, 5).setValues([
        ['Timestamp', 'AQI (US)', 'PM10 (µg/m³)', 'PM2.5 (µg/m³)', 'PM2.5 24hr Avg (µg/m³)']
      ]);
    }

    Logger.log("Data imported successfully to spreadsheet");
  } catch (error) {
    throw new AirQualityError('Failed to import data to spreadsheet: ' + error.message, 'SPREADSHEET_ERROR');
  }
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
  // ลบ Trigger เดิมทั้งหมดเพื่อป้องกันการซ้ำซ้อน
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    ScriptApp.deleteTrigger(trigger);
  }

  // --- Trigger เดิมสำหรับแจ้งเตือน LINE และบันทึกลง "ชีต1" ---
  // สร้าง Trigger ใหม่สำหรับเวลา 6:00 น. (GMT+7)
  ScriptApp.newTrigger('main')
    .timeBased()
    .atHour(6)
    .everyDays(1)
    .create();

  // สร้าง Trigger ใหม่สำหรับเวลา 16:00 น. (GMT+7)
  ScriptApp.newTrigger('main')
    .timeBased()
    .atHour(16)
    .everyDays(1)
    .create();

  // --- Trigger ใหม่สำหรับบันทึกข้อมูลลง "ชีต2" ---
  // สร้าง Trigger ใหม่สำหรับเวลา 8:00 น. (GMT+7)
  ScriptApp.newTrigger('logGistdaData')
    .timeBased()
    .atHour(8)
    .everyDays(1)
    .create();

  // สร้าง Trigger ใหม่สำหรับเวลา 20:00 น. (GMT+7)
  ScriptApp.newTrigger('logGistdaData')
    .timeBased()
    .atHour(20)
    .everyDays(1)
    .create();

  Logger.log('All triggers have been created successfully.');
}

/** Web App functions */
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Air Quality Widget')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getWidgetData() {
  try {
    const response = UrlFetchApp.fetch(CONFIG.API_ENDPOINTS.GISTDA_AIR);
    const gistdaData = JSON.parse(response.getContentText());

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
function logPm25ToSheet2(airData) {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    let sheet = spreadsheet.getSheetByName("ชีต2");

    // ถ้ายังไม่มี "ชีต2" ให้สร้างขึ้นมาใหม่พร้อมหัวตารางใหม่
    if (!sheet) {
      sheet = spreadsheet.insertSheet("ชีต2");
      // กำหนดหัวตารางตามที่เจ้านายต้องการ
      sheet.appendRow(['วันที่-เวลา', 'ตำบล', 'ค่าเฉลี่ย PM2.5 (24 ชม.)']);
    }

    const { gistda } = airData;
    if (!gistda || !gistda.tambon) { // ตรวจสอบว่ามีข้อมูลตำบลด้วย
      throw new Error('Invalid GISTDA data structure or missing tambon name');
    }

    // ใช้เวลาปัจจุบันในการบันทึกข้อมูล
    const now = new Date();
    const formattedTimestamp = Utilities.formatDate(now, "Asia/Bangkok", "dd/MM/yyyy HH:mm:ss");

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

/** ฟังก์ชันสำหรับ Trigger เพื่อดึงและบันทึกข้อมูล GISTDA ลงชีต2 */
function logGistdaData() {
  try {
    const airData = fetchAirQualityData();
    logPm25ToSheet2(airData);
  } catch (error) {
    handleError(error); // ใช้ handleError เดิมในการจัดการ Error
  }
}
