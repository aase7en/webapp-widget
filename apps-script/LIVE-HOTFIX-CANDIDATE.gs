/**
 * CANDIDATE ONLY — never drop in as an extra live file with duplicate names.
 * Replace ONLY main() and importDataToSpreadsheet() in the live Code.gs,
 * and ADD gistdaForMain_() / optionalPM25_() once, after privately backing up
 * the real live source. No Google Sheet or Script deployment is modified here.
 *
 * This isolated production hotfix does not depend on WAQI / Air4Thai.
 * It requires the EXISTING CONFIG.SPREADSHEET_ID and
 * CONFIG.API_ENDPOINTS.GISTDA_AIR and formatThaiDateTime() from the live script.
 */
function optionalPM25_(raw) {
  if ((typeof raw !== 'number' && typeof raw !== 'string') ||
      (typeof raw === 'string' && raw.trim() === '')) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function gistdaForMain_() {
  const response = UrlFetchApp.fetch(CONFIG.API_ENDPOINTS.GISTDA_AIR, {
    muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 200) {
    throw new Error('GISTDA HTTP ' + response.getResponseCode());
  }
  const payload = JSON.parse(response.getContentText());
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
      datetime: payload.datetimeThai || null
    }
  };
}

function main() {
  try {
    // This pathway runs independently of WAQI/PM10 and Air4Thai.
    const airData = gistdaForMain_();
    importDataToSpreadsheet(airData);
    Logger.log('PM2.5 primary sheet recorded using GISTDA');
  } catch (error) {
    // Rethrow so the Apps Script execution is FAILED, not false SUCCESS.
    Logger.log('main failed: ' + error.message);
    throw error;
  }
}

function importDataToSpreadsheet(airData) {
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
  const newRow = [formatThaiDateTime(new Date()), '', '', pm25 === null ? '' : pm25,
    avg24 === null ? '' : avg24];
  sheet.appendRow(newRow);
  sheet.getRange(sheet.getLastRow(), 2, 1, 4).setNumberFormat('0.00');
  // Never delete historical sheet rows as a side-effect of a hotfix.
}
