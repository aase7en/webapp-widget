/**
 * BackendApi.gs — PROPOSED, UNDEPLOYED additive JSON API + config/history layer
 * for the Uthai hospital LED backend (Apps Script project "API Report_PM2.5").
 *
 * STATUS (2026-10-18 charts wave): local implementation + tests only (adds
 * the 'Charts' dashboard tab + embedded charts; see the charts block below).
 * NOT
 * pushed to the live Apps Script project. The REMOTE CANDIDATE is built from a
 * FRESH pull of the live source (@31 or whatever is current at deploy time)
 * with a minimal patch (doGet hook + createDailyTrigger guard + this file) —
 * never a blind push of the repo reference. This public repo copy is a
 * SANITIZED REFERENCE (live WAQI token and commented LINE tokens redacted to
 * Script Property NAMES; see apps-script/Code.gs header). Legacy functions in
 * Code.gs are preserved byte-for-byte from live except the two documented
 * patches:
 *   1. doGet hook:     function doGet(e) { return BackendApi_doGet(e); }
 *   2. createDailyTrigger guard (legacy body deleted ALL project triggers —
 *      now refuses without explicit authorization + valid config).
 * No action on doGet = legacy HtmlService UI (staged migration / rollback).
 *
 * Canonical contract (must match frontend led-rotation.js normalizePayload —
 * cross-checked by tests/backend-contract.test.cjs):
 *   GET {exec}?action=data&v=1[&callback=IDENT]
 *   -> { schema:1, generatedAt, location:{id,label,lat,lon},
 *        pm25:{status:'ok'|'stale'|'missing', value, unit:'µg/m³',
 *              observedAt, source, band, provenance{provider,agency,service,
 *              areaId,stationId,sourceUrl,termsUrl,timeZone,unit,datum}},
 *        weather:{status, temperatureC, humidityPct, weatherCode(0..99 int),
 *                 tmaxC, tminC, rainPct, observedAt, forecastDate(today BKK),
 *                 source, provenance},
 *        water:{status:'missing', available:false, value:null, unit:'m',
 *               observedAt:null, source, provenance},
 *        errors:[{channel,code,message}] }
 *  - provenance keys are canonical singular/plural-exact: timeZone, unit.
 *    GISTDA PM is a TAMBON AREA aggregate (areaId), never claimed as a
 *    station/sensor; no PCD attribution claims. GISTDA publishes official
 *    hourly area ESTIMATES (satellite + ground assimilation) — not a physical
 *    measurement station at the hospital. Open-Meteo is a weather MODEL
 *    (current conditions interpolated), not an on-site measurement; no
 *    accuracy percentage is claimed anywhere.
 *  - observedAt is ALWAYS the upstream observation time (Bangkok +07:00 ISO);
 *    never substituted with generatedAt/fetch time. Unknown -> missing.
 *    Future >5 min rejects; age >3h -> 'stale'.
 *  - Read route performs ZERO Sheet/history/trigger/notification/property
 *    writes (CacheService only). Cache is PER-CHANNEL under the shared
 *    ScriptCache: key = 'bapi_v2_' + location id + config_version +
 *    fingerprint (coords+providers+areaId+tambon+station+datum+label) so
 *    Sheet edits without a version bump can never serve another
 *    station/coords/label's cache. PM TTL 1800 s, weather TTL 600 s,
 *    per-channel last-good 21600 s (CacheService maximum). Cadence is
 *    on-demand best-effort: CacheService may evict early and NO scheduler
 *    refreshes the read cache — without client requests there are zero
 *    upstream fetches, so "30 min" means max staleness while clients poll,
 *    never a guaranteed wall-clock refresh rate.
 *  - Upstream HTTP 429/5xx (and network/HTTP failures generally) trigger a
 *    bounded PASSIVE cooldown stored in the same cache (default 300 s;
 *    Retry-After honored as seconds ONLY when the provider actually sends
 *    it — no assumed guarantee — clamped to 30..3600 s). While a channel is
 *    in cooldown the read route serves that channel's last-good (relabeled
 *    stale when older than 3 h) or honest 'missing' — never 0, never
 *    fabricated freshness. No retry loop exists anywhere.
 *  - Location labels: the KNOWN legacy default 'ต.อุทัย อ.พระนครศรีอยุธยา'
 *    (wrong: tambon อุทัย is in amphoe อุทัย) is canonicalized IN MEMORY to
 *    'ต.อุทัย อ.อุทัย จ.พระนครศรีอยุธยา' by pure loadConfig normalization.
 *    The Sheet cell is NEVER rewritten by the backend — the physical text
 *    stays until the owner corrects it; every other label passes through
 *    untouched. The label is part of the cache fingerprint so a stale
 *    provenance/label can never linger in cache.
 *  - History = exactly TWO scheduled batches/day (morning+evening), one row
 *    per enabled location, idempotent per (date, slot, location); a batch run
 *    only records inside an explicit ±2h jitter window around its configured
 *    hour (manual noon run cannot preconsume the evening batch). Batches
 *    REUSE the per-channel read cache (refreshing only channels past their
 *    TTL inside the existing fetch helper) so history adds at most a
 *    TTL-bounded refresh per channel per batch, never a guaranteed extra
 *    fetch; recorded rows always carry the source observedAt/status of the
 *    data actually used.
 */

var BackendApi = (function () {
  'use strict';

  var SCHEMA = 1;
  var PM_UNIT = 'µg/m³';
  var FRESH_MS = 3 * 3600000;
  var FUTURE_MS = 5 * 60000;
  /* Per-channel cadence (best-effort, request-driven; CacheService may evict
   * earlier). PM 30 min / weather 10 min / last-good 6 h (= service max). */
  var PM_TTL_S = 3600;
  var WX_TTL_S = 600;
  var LASTGOOD_TTL_S = 6 * 3600;
  /* Bounded passive failure cooldown: default when the provider sends no
   * usable Retry-After; Retry-After (delta-seconds) honored only if actually
   * present. Clamped to [COOLDOWN_MIN_S, COOLDOWN_MAX_S]. */
  var COOLDOWN_DEFAULT_S = 300;
  var COOLDOWN_MIN_S = 30;
  var COOLDOWN_MAX_S = 3600;
  /* Location label canonicalization (PURE normalization — never a Sheet
   * write). Map is EXACT-match on the trimmed NFC legacy default only;
   * every other label passes through untouched. */
  var CANONICAL_UTHAI_LABEL = 'ต.อุทัย อ.อุทัย จ.พระนครศรีอยุธยา';
  var LEGACY_LABEL_FIXES = (function () {
    var m = {};
    m['ต.อุทัย อ.พระนครศรีอยุธยา'] = CANONICAL_UTHAI_LABEL; /* legacy default seed: tambon อุทัย sits in amphoe อุทัย */
    return m;
  })();
  var GISTDA_BASE = 'https://pm25.gistda.or.th/rest/getPm25byTambon';
  var OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
  var BANGKOK_OFFSET_MS = 7 * 3600000;
  var CALLBACK_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
  var URL_ALLOWLIST = /^https:\/\/(pm25\.gistda\.or\.th|api\.open-meteo\.com|open-meteo\.com|air4thai\.pcd\.go\.th|www\.numron\.go\.th)(\/|$)/;
  var SAFE_ID_RE = /^[a-z0-9_]{1,32}$/;
  var PM_PROVIDER_ENUM = ['gistda'];
  var WEATHER_PROVIDER_ENUM = ['open-meteo'];
  var WATER_PROVIDER_ENUM = ['', 'none'];
  var PM_BANDS = [[91, 'unhealthy'], [51, 'unhealthy_sensitive'], [38, 'moderate'], [26, 'good']];
  var SLOT_JITTER_H = 2; /* batch records only within configuredHour ± 2h */
  var LEGACY_HISTORY_HANDLERS = ['main', 'logGistdaData'];
  var OWNED_HISTORY_HANDLER = 'BackendApiHistoryBatch_';
  var OWNER_EMAIL_FALLBACK = ''; /* set only if Session identity is ambiguous; empty = strict session equality */
  var THAI_MONTHS_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  var THAI_MONTHS_ABBR = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
    'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  var TAB_SETTINGS = 'Settings';
  var TAB_LOCATIONS = 'Locations';
  var TAB_SOURCES = 'API_Sources';
  var TAB_HISTORY = 'History_Batch';
  var TAB_PM_HOURLY = 'PM25_Hourly';
  var PM_RETENTION_MS = 90 * 86400000;
  var PM_HISTORY_HEADER = ['record_type','location_id','pm25_value','pm25_observed_at','pm25_status','pm25_provider','pm25_area_id','pm25_tambon_name','created_at'];
  function validPmHourlyRow(r) {
    var n = asNumber(r[2]);
    function timestamp(v) { return v instanceof Date ? v.getTime() : Date.parse(String(v || '')); }
    return r[0] === 'pm25_hourly_v1' && SAFE_ID_RE.test(String(r[1] || '')) &&
      n !== null && n >= 0 && n <= 1000 && isFinite(timestamp(r[3])) &&
      r[4] === 'ok' && r[5] === 'gistda' && /^\d{1,10}$/.test(String(r[6] || '')) &&
      String(r[7] || '').trim() !== '' && String(r[7]).trim().length <= 60 && isFinite(timestamp(r[8]));
  }
  var TAB_CHARTS = 'Charts';

  /* ---------------- charts dashboard ('Charts' tab) ----------------
   * Sheets EMBEDDED charts (official EmbeddedChartBuilder surface only:
   * sheet.newChart()/asLineChart()/addRange()/setOption()/setPosition()/
   * build()/insertChart()/getCharts()/removeChart()). Data comes from
   * History_Batch BY HEADER NAME for the ACTIVE location over the last
   * CHART_WINDOW_DAYS days. Missing cells are never rewritten — charts
   * reference raw cells so gaps stay gaps (never 0). Owned charts carry a
   * title marker; refresh removes ONLY marked charts (user charts are never
   * touched) then re-inserts. Rain ('wx_rain_pct') and water
   * ('water_level_m') columns are NOT in the shipped history schema — those
   * charts appear automatically as soon as the columns carry real recorded
   * data; water additionally requires >=1 numeric value (never a fabricated
   * placeholder series). History_Batch rows/headers are NEVER modified. */
  var CHART_WINDOW_DAYS = 30;
  var CHART_MARKER = ' [อัตโนมัติ]';
  var CHART_W = 600;
  var CHART_H = 300;
  var CHART_ANCHOR_ROW = 2;   /* first chart band; A1 holds the auto-note */
  var CHART_ANCHOR_COL = 1;
  var CHART_COL_SPAN = 7;     /* 600px ~= 6 default 100px columns + gutter */
  var CHART_ROW_SPAN = 16;    /* 300px ~= 15 default 21px rows + gutter */
  var CHART_GRID_COLOR = '#eeeeee';
  var CHART_CHANNELS = (function () {
    var defs = [
      { key: 'pm25', name: 'PM2.5 (µg/m³)', col: 'pm25_value', color: '#FF8C00' },
      { key: 'temp', name: 'อุณหภูมิ (°C)', col: 'wx_temp_c', color: '#E53935' },
      { key: 'humidity', name: 'ความชื้นสัมพัทธ์ (%)', col: 'wx_rh_pct', color: '#42A5F5' },
      { key: 'rain', name: 'โอกาสฝนวันนี้ (%)', col: 'wx_rain_pct', color: '#1E88E5' },
      { key: 'water', name: 'ระดับน้ำหน้า รพ. (ม.)', col: 'water_level_m', color: '#1565C0', needsNumeric: true },
    ];
    return defs.map(function (d) {
      d.title = d.name + ' ย้อนหลัง ' + CHART_WINDOW_DAYS + ' วัน';
      return d;
    });
  })();

  function nowMs() { return new Date().getTime(); }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function bangkokParts(ms) {
    var d = new Date(ms + BANGKOK_OFFSET_MS);
    return { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes() };
  }
  function bangkokDateStr(ms) {
    var p = bangkokParts(ms);
    return p.y + '-' + pad2(p.mo) + '-' + pad2(p.d);
  }
  function bangkokIsoObserved(ms) {
    var p = bangkokParts(ms);
    return p.y + '-' + pad2(p.mo) + '-' + pad2(p.d) + 'T' + pad2(p.h) + ':' + pad2(p.mi) + '+07:00';
  }
  function isoZ(ms) { return new Date(ms).toISOString(); }
  function safeParse(s) { try { var v = JSON.parse(s); return v && typeof v === 'object' ? v : null; } catch (e) { return null; } }
  function canonicalLocationLabel(label) {
    var t = String(label == null ? '' : label).trim().normalize('NFC');
    return Object.prototype.hasOwnProperty.call(LEGACY_LABEL_FIXES, t) ? LEGACY_LABEL_FIXES[t] : t;
  }

  /** GISTDA datetimeThai -> {iso, ms}; พ.ศ.>2400 -> -543; calendar roundtrip
   * verified; null when unparseable (channel must then go missing). */
  function parseThaiDateTime(dt) {
    if (!dt || typeof dt !== 'object') return null;
    /* Real GISTDA shape: dateThai 'วันเสาร์ที่ 17 ตุลาคม 2569',
     * timeThai 'เวลา 06:05 น.' — optional weekday + เวลา prefixes. */
    var dm = /^(?:วัน[\u0e00-\u0e7f]+ที่\s*)?(\d{1,2})\s+(\S+)\s+(\d{4})$/.exec(String(dt.dateThai || '').trim().normalize('NFC'));
    var tm = /^(?:เวลา\s*)?(\d{1,2}):(\d{2})/.exec(String(dt.timeThai || '').trim().normalize('NFC'));
    if (!dm || !tm) return null;
    var day = parseInt(dm[1], 10), monthName = dm[2], year = parseInt(dm[3], 10);
    var month = -1;
    for (var i = 0; i < 12; i++) if (monthName === THAI_MONTHS_FULL[i] || monthName === THAI_MONTHS_ABBR[i]) { month = i + 1; break; }
    if (month < 1) return null;
    if (year > 2400) year -= 543;
    if (year < 1000 || year > 3000) return null;
    var hour = parseInt(tm[1], 10), minute = parseInt(tm[2], 10);
    if (hour > 23 || minute > 59) return null;
    var ms = Date.UTC(year, month - 1, day, hour, minute) - BANGKOK_OFFSET_MS;
    var back = bangkokParts(ms);
    if (back.y !== year || back.mo !== month || back.d !== day || back.h !== hour || back.mi !== minute) return null;
    return { iso: bangkokIsoObserved(ms), ms: ms };
  }

  function parseBangkokLocalTime(v) {
    if (typeof v !== 'string') return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v);
    if (!m) return null;
    var ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - BANGKOK_OFFSET_MS;
    if (bangkokDateStr(ms) !== m[1] + '-' + m[2] + '-' + m[3]) return null;
    return ms;
  }

  function band(value) {
    if (typeof value !== 'number' || !isFinite(value) || value < 0) return null;
    for (var i = 0; i < PM_BANDS.length; i++) if (value >= PM_BANDS[i][0]) return PM_BANDS[i][1];
    return 'very_good';
  }

  function freshness(obsMs, now) {
    if (obsMs === null || obsMs === undefined) return 'missing';
    if (obsMs > now + FUTURE_MS) return 'future';
    if (now - obsMs > FRESH_MS) return 'stale';
    return 'ok';
  }

  function err(channel, code, message) {
    var msg = String(message == null ? '' : message).split('\n')[0];
    return { channel: channel, code: code, message: msg.slice(0, 120) };
  }

  /**
   * Owner authentication. A verifiedHistoryOnly-style bool is CONSENT UX,
   * never authentication: the legacy public HtmlService UI exposes every
   * non-underscore top-level function to google.script.run, executing as the
   * deploying owner. The only acceptable proofs here:
   *   (a) editor/owner session: Session.getActiveUser().getEmail() is
   *       non-empty AND equals getEffectiveUser().getEmail() (the signed-in
   *       caller IS the owner); or
   *   (b) scheduled context: ScriptApp.getScriptTrigger() returns the time
   *       trigger whose handler is exactly fnName (legacy owner-installed
   *       triggers keep working through staged migration).
   * Anonymous webapp viewers have activeUser === '' and no script trigger.
   */
  function isOwnerSession() {
    var a = '', e = '';
    try { a = String(Session.getActiveUser().getEmail() || '').toLowerCase(); } catch (x) { a = ''; }
    try { e = String(Session.getEffectiveUser().getEmail() || '').toLowerCase(); } catch (x) { e = ''; }
    if (OWNER_EMAIL_FALLBACK) return a !== '' && a === String(OWNER_EMAIL_FALLBACK).toLowerCase();
    return a !== '' && e !== '' && a === e;
  }
  function isScheduledFor(fnName) {
    try {
      var t = ScriptApp.getScriptTrigger();
      return !!(t && t.getHandlerFunction && t.getHandlerFunction() === fnName);
    } catch (x) { return false; }
  }
  function assertTrustedCaller(fnName, strictOwnerOnly) {
    if (!strictOwnerOnly && isScheduledFor(fnName)) return;
    if (isOwnerSession()) return;
    throw new Error('BackendApi guard: caller is not the trusted owner (fn=' + fnName + ') — refusing.');
  }

  /* Sheets-formula-injection guard for string cells written to History:
   * neutralise leading = + - @ (tab/CR). Numeric values pass through
   * untouched (negative temperatures stay numbers). */
  function safeSheetString(v) {
    if (typeof v !== 'string') return v;
    if (/^[=+\-@\t\r]/.test(v)) return "'" + v;
    return v;
  }

  function openSpreadsheet() {
    var id = (typeof CONFIG !== 'undefined' && CONFIG && CONFIG.SPREADSHEET_ID) ? CONFIG.SPREADSHEET_ID : '';
    return SpreadsheetApp.openById(id);
  }
  function readTabRows(name) {
    var sheet = openSpreadsheet().getSheetByName(name);
    if (!sheet) return null;
    return sheet.getDataRange().getValues();
  }
  function truthy(v) {
    return v === true || v === 1 || v === '1' || (typeof v === 'string' && /^(true|yes|y)$/i.test(v.trim()));
  }
  function asNumber(v) {
    if (typeof v === 'number') return isFinite(v) ? v : null;
    if (typeof v === 'string' && v.trim() !== '' && isFinite(Number(v))) return Number(v);
    return null;
  }
  function rowsToObjects(rows) {
    if (!rows || rows.length < 2) return [];
    var head = rows[0], out = [];
    for (var r = 1; r < rows.length; r++) {
      var o = {}, empty = true;
      for (var c = 0; c < head.length; c++) {
        o[String(head[c])] = rows[r][c];
        if (rows[r][c] !== '' && rows[r][c] !== null && rows[r][c] !== undefined) empty = false;
      }
      if (!empty) out.push(o);
    }
    return out;
  }

  function configError(reason) { return { ok: false, reason: reason }; }

  function loadConfig() {
    var settingsRows = readTabRows(TAB_SETTINGS);
    var locationRows = readTabRows(TAB_LOCATIONS);
    if (!settingsRows || !locationRows) return configError('missing tabs');
    var sourceRows = readTabRows(TAB_SOURCES);

    var settings = {};
    rowsToObjects(settingsRows).forEach(function (r) { settings[String(r.key)] = r.value; });
    var activeId = String(settings.active_location_id || '').trim();
    if (!activeId) return configError('active_location_id');
    if (!SAFE_ID_RE.test(activeId)) return configError('active_location_id unsafe');
    var morning = asNumber(settings.history_morning_hour);
    var evening = asNumber(settings.history_evening_hour);
    if (morning === null || morning < 0 || morning > 23) morning = 6;
    if (evening === null || evening < 0 || evening > 23) evening = 16;
    if (morning === evening) return configError('morning==evening hour');
    if (Math.abs(morning - evening) <= 2 * SLOT_JITTER_H) return configError('slot windows overlap');
    var tz = String(settings.timezone || 'Asia/Bangkok').trim();
    if (tz !== 'Asia/Bangkok') return configError('timezone');
    var configVersion = asNumber(settings.config_version);
    if (configVersion === null || configVersion < 1) configVersion = 1;

    var locations = rowsToObjects(locationRows);
    var active = null, enabledSeen = {}, ambiguity = false;
    for (var i = 0; i < locations.length; i++) {
      var L = locations[i];
      var id = String(L.id || '').trim();
      var enabled = truthy(L.enabled);
      /* Disabled malformed rows must NOT blank the active config. Only the
       * active row and enabled rows are strictly validated; a disabled row
       * sharing the active id is ambiguous and fails closed. */
      if (!enabled) {
        if (id === activeId) ambiguity = true;
        continue;
      }
      if (!SAFE_ID_RE.test(id)) return configError('enabled location id unsafe');
      if (enabledSeen[id]) return configError('duplicate enabled location id');
      enabledSeen[id] = true;
      if (id === activeId && active) ambiguity = true; /* cannot happen with dup check; kept explicit */
      var lat = asNumber(L.lat), lon = asNumber(L.lon);
      if (lat === null || lat < -90 || lat > 90) return configError('lat range');
      if (lon === null || lon < -180 || lon > 180) return configError('lon range');
      var pmProvider = String(L.pm_provider || '').trim();
      if (PM_PROVIDER_ENUM.indexOf(pmProvider) < 0) return configError('pm_provider enum');
      var pmLocId = String(L.pm_location_id == null ? '' : L.pm_location_id).trim();
      if (pmProvider === 'gistda' && !/^\d{1,10}$/.test(pmLocId)) return configError('pm_location_id');
      /* OPTIONAL per-location tambon name (header may not exist on the live
       * tab — absent is valid). The ONLY default is the vetted legacy seed:
       * id uthai + area 1414 == tambon อุทัย (matches live Code.js
       * tb_tn === 'อุทัย'). Everything else must configure it explicitly;
       * names are never inferred from labels or coordinates. */
      var pmTambon = String(L.pm_tambon_name == null ? '' : L.pm_tambon_name).trim().normalize('NFC');
      if (pmTambon.length > 60) return configError('pm_tambon_name too long');
      if (pmTambon === '' && id === 'uthai' && pmLocId === '1414') pmTambon = 'อุทัย';
      var wxProvider = String(L.weather_provider || '').trim();
      if (WEATHER_PROVIDER_ENUM.indexOf(wxProvider) < 0) return configError('weather_provider enum');
      var waterProvider = String(L.water_provider == null ? '' : L.water_provider).trim();
      if (WATER_PROVIDER_ENUM.indexOf(waterProvider) < 0) return configError('water_provider enum');
      var waterStation = String(L.water_station_id == null ? '' : L.water_station_id).trim();
      if (waterStation !== '' && !/^\d{1,20}$/.test(waterStation)) return configError('water_station_id');
      if (id === activeId) {
        active = {
          id: id, label: canonicalLocationLabel(L.label || id), lat: lat, lon: lon,
          pmProvider: pmProvider, pmAreaId: pmLocId, pmTambonName: pmTambon, wxProvider: wxProvider,
          waterProvider: waterProvider, waterStationId: waterStation,
          waterDatum: String(L.water_datum == null ? '' : L.water_datum).trim(),
        };
      }
    }
    if (ambiguity) return configError('ambiguous active id');
    if (!active) return configError('no enabled active location');

    var sources = {};
    var sourceObjs = sourceRows ? rowsToObjects(sourceRows) : [];
    for (var s = 0; s < sourceObjs.length; s++) {
      var S = sourceObjs[s];
      var provider = String(S.provider || '').trim();
      if (!provider) continue;
      ['source_url', 'docs_url', 'terms_url'].forEach(function (k) {
        var u = String(S[k] == null ? '' : S[k]).trim();
        if (u !== '' && !URL_ALLOWLIST.test(u)) throw { config: 'url allowlist: ' + provider };
      });
      var credProp = String(S.credential_property == null ? '' : S.credential_property).trim();
      if (credProp !== '' && !/^[A-Za-z0-9_.]{1,64}$/.test(credProp)) throw { config: 'credential_property: ' + provider };
      for (var key in S) {
        if (Object.prototype.hasOwnProperty.call(S, key) && /token=|secret|password|Bearer\s/i.test(String(S[key]))) {
          throw { config: 'secret-shaped value in API_Sources' };
        }
      }
      sources[provider] = {
        agency: String(S.agency || '').trim(),
        service: String(S.service || '').trim(),
        sourceUrl: String(S.source_url || '').trim(),
        termsUrl: String(S.terms_url || '').trim(),
        unit: String(S.units || '').trim(),
        datum: String(S.datum || '').trim(),
      };
    }

    return {
      ok: true, active: active, locations: locations, settings: {
        activeId: activeId, morningHour: morning, eveningHour: evening,
        timezone: tz, configVersion: configVersion,
      }, sources: sources,
    };
  }
  function loadConfigSafe() {
    try { return loadConfig(); }
    catch (x) { return (x && x.config) ? configError(String(x.config)) : configError('config exception'); }
  }

  /* Retry-After: delta-seconds form only (HTTP-date form ignored — no
   * assumed provider guarantee). null when absent/unusable. */
  function parseRetryAfterS(v) {
    if (v == null) return null;
    var s = String(v).trim();
    if (!/^\d{1,5}$/.test(s)) return null;
    var n = parseInt(s, 10);
    return n >= 0 && n <= 86400 ? n : null;
  }
  function cooldownSeconds(retryAfterS) {
    var s = retryAfterS != null ? retryAfterS : COOLDOWN_DEFAULT_S;
    return Math.max(COOLDOWN_MIN_S, Math.min(s, COOLDOWN_MAX_S));
  }
  function fetchJson(url) {
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    var code = response.getResponseCode();
    if (code !== 200) {
      var e = new Error('http ' + code);
      e.httpCode = code;
      var hdr = null;
      try { hdr = response.getHeaders ? response.getHeaders() : null; } catch (x) { hdr = null; }
      e.retryAfterSec = hdr ? parseRetryAfterS(hdr['Retry-After'] != null ? hdr['Retry-After'] : hdr['retry-after']) : null;
      throw e;
    }
    return JSON.parse(response.getContentText());
  }
  /* Global, durable one-hour GISTDA attempt gate. Caller must hold the script
   * lock or let this helper acquire it. Failure to persist the attempt prevents
   * the network call; cache eviction returns unavailable, never an early retry. */
  function gistdaPayload(url, locked) {
    if (!/^https:\/\/pm25\.gistda\.or\.th\/rest\/getPm25byTambon\?ap_idn=\d{1,10}$/.test(url)) throw new Error('unsupported GISTDA URL');
    var lock = null;
    if (!locked) {
      lock = LockService.getScriptLock();
      if (!lock.tryLock(10000)) throw new Error('GISTDA busy');
    }
    try {
      var now = nowMs(), props = PropertiesService.getScriptProperties();
      var rawLast = props.getProperty('pm25_gistda_last_attempt_ms');
      var last = rawLast == null ? null : Number(rawLast);
      if (last !== null && (!isFinite(last) || now < last)) throw new Error('invalid GISTDA attempt clock');
      var areaId = url.split('=').pop(), cacheKey = 'pm25_gistda_payload_' + areaId;
      var lastGoodKey = 'pm25_gistda_lastgood_' + areaId;
      if (last !== null && now - last < 3600000) {
        var cached = safeParse(cache().get(cacheKey)) || safeParse(props.getProperty(lastGoodKey));
        if (cached) return cached;
        throw new Error('GISTDA hourly gate: no cached response');
      }
      props.setProperty('pm25_gistda_last_attempt_ms', String(now));
      var payload = fetchJson(url);
      var serialized = JSON.stringify(payload);
      try { cache().put(cacheKey, serialized, 21600); } catch (e) { /* gate remains active */ }
      try { if (serialized.length <= 2000) props.setProperty(lastGoodKey, serialized); } catch (e) { /* last-good is best effort */ }
      return payload;
    } finally { if (lock) lock.releaseLock(); }
  }

  /* Uniform bounded passive failure marker: every upstream failure (HTTP or
   * network) sets a cooldown so concurrent/serial read requests cannot hammer
   * a struggling provider; rate-limit responses may extend it via the
   * provider's own Retry-After. Error CODE stays 'UPSTREAM' (stable contract);
   * only the human message varies. */
  function upstreamFailure(base, channel, x, label) {
    var code = x && x.httpCode ? x.httpCode : 0;
    if (code === 429 || code >= 500) {
      base._err = err(channel, 'UPSTREAM', label + ' source rate-limited (http ' + code + ') — passive cooldown');
      base._cooldownS = cooldownSeconds(x && x.retryAfterSec);
    } else if (code > 0) {
      base._err = err(channel, 'UPSTREAM', label + ' source unavailable (http ' + code + ')');
      base._cooldownS = COOLDOWN_DEFAULT_S;
    } else {
      base._err = err(channel, 'UPSTREAM', label + ' source unavailable');
      base._cooldownS = COOLDOWN_DEFAULT_S;
    }
    return base;
  }

  /* provenance keys are canonical EXACT: timeZone / unit (not timezone/units).
   * areaId = provider area key (GISTDA tambon id); stationId reserved for a
   * real station id (water, when a verified one exists). */
  function provenance(cfg, provider, extra) {
    var s = (cfg.sources && cfg.sources[provider]) || {};
    extra = extra || {};
    return {
      provider: provider,
      agency: s.agency || '',
      service: s.service || '',
      areaId: extra.areaId != null ? extra.areaId : null,
      areaLevel: provider === 'gistda' ? 'amphoe (district) id — response lists tambons' : null,
      tambonName: extra.tambonName != null && extra.tambonName !== '' ? extra.tambonName : null,
      stationId: extra.stationId != null ? extra.stationId : null,
      sourceUrl: s.sourceUrl || '',
      termsUrl: s.termsUrl || '',
      timeZone: 'Asia/Bangkok',
      unit: extra.unit || s.unit || '',
      datum: extra.datum || s.datum || null,
    };
  }

  function pm25Missing() {
    return { status: 'missing', value: null, unit: PM_UNIT, observedAt: null, source: '', band: null, provenance: null, _err: null };
  }

  function pm25Base(cfg) {
    var loc = cfg.active;
    var prov = provenance(cfg, loc.pmProvider, { areaId: loc.pmAreaId, unit: PM_UNIT, tambonName: loc.pmTambonName });
    var base = pm25Missing();
    base.provenance = prov;
    base.source = 'GISTDA getPm25byTambon · ต.' + (loc.pmTambonName || '?') + ' จากพื้นที่อำเภอ (เฉลี่ยระดับตำบล · ไม่ใช่สถานีวัดโดยตรง)';
    if (loc.pmTambonName === '') {
      base._err = err('pm25', 'CONFIG', 'pm_tambon_name not configured for this location');
    }
    return base;
  }

  function gistdaObservedMs(item, payload) {
    /* observedAt: the ROW's own dt (source time) first; weekday-tolerant
     * datetimeThai fallback. Never fetch time / generatedAt. */
    var obsMs = null;
    if (typeof item.dt === 'string' && item.dt !== '') {
      /* GISTDA row dt is BANGKOK WALL TIME mislabeled with a 'Z' suffix
       * (verified: dt '23:00:00.000Z' pairs with timeThai 'เวลา 23:00 น.'
       * for the same rows). Parse the wall components as +07:00. */
      var dw = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(item.dt);
      if (dw) {
        var ms = Date.UTC(+dw[1], +dw[2] - 1, +dw[3], +dw[4], +dw[5]) - BANGKOK_OFFSET_MS;
        if (bangkokDateStr(ms) === dw[1] + '-' + dw[2] + '-' + dw[3]) obsMs = ms;
      }
    }
    if (obsMs === null) {
      var thai = parseThaiDateTime(payload.datetimeThai);
      if (thai) obsMs = thai.ms;
    }
    return obsMs;
  }

  function channelPm25(cfg, now, locked) {
    var loc = cfg.active;
    var base = pm25Base(cfg);
    var prov = base.provenance;
    if (base._err) return base;
    try {
      var payload = gistdaPayload(GISTDA_BASE + '?ap_idn=' + encodeURIComponent(loc.pmAreaId), locked === true);
      var rows = payload && payload.data;
      if (!Array.isArray(rows) || rows.length === 0) {
        base._err = err('pm25', 'PARSE', 'GISTDA returned no rows for configured area');
        return base;
      }
      /* ap_idn is DISTRICT (amphoe) level: response lists every tambon.
       * EXACT NFC+trim tb_tn equality only — no first-row, substring, label
       * or coordinate inference. Zero or duplicate matches -> missing. */
      var want = loc.pmTambonName;
      var matches = rows.filter(function (r) {
        return String(r && r.tb_tn != null ? r.tb_tn : '').trim().normalize('NFC') === want;
      });
      if (matches.length !== 1) {
        base._err = err('pm25', 'PARSE', matches.length === 0
          ? 'GISTDA row for configured tambon not found in area response'
          : 'GISTDA tambon match ambiguous (duplicates)');
        return base;
      }
      var item = matches[0];
      var raw = asNumber(item.pm25);
      if (raw === null || raw < 0) { base._err = err('pm25', 'PARSE', 'invalid pm25 value'); return base; }
      var obsMs = gistdaObservedMs(item, payload);
      if (obsMs === null) { base._err = err('pm25', 'OBSERVED_AT', 'no usable source timestamp on row/payload'); return base; }
      var fresh = freshness(obsMs, now);
      if (fresh === 'future') {
        var m2 = pm25Missing(); m2.provenance = prov; m2.source = base.source;
        m2._err = err('pm25', 'OBSERVED_AT', 'future timestamp rejected');
        return m2;
      }
      var value = Math.round(raw * 10) / 10;
      return {
        status: fresh === 'stale' ? 'stale' : 'ok', value: value, unit: PM_UNIT,
        observedAt: bangkokIsoObserved(obsMs), source: base.source, band: band(value),
        provenance: prov, _err: null,
      };
    } catch (x) {
      return upstreamFailure(base, 'pm25', x, 'PM');
    }
  }

    function weatherMissing(prov) {
    return {
      status: 'missing', temperatureC: null, humidityPct: null, weatherCode: null,
      tmaxC: null, tminC: null, rainPct: null, observedAt: null, forecastDate: null,
      source: '', provenance: prov || null, _err: null,
    };
  }

  function weatherBase(cfg) {
    var loc = cfg.active;
    var prov = provenance(cfg, loc.wxProvider, { unit: '°C / % / WMO code' });
    var base = weatherMissing(prov);
    base.source = 'Open-Meteo weather model · พิกัด ' + loc.lat + ',' + loc.lon + ' (DERIVED ไม่ใช่การวัดที่ รพ.)';
    return base;
  }

  function channelWeather(cfg, now) {
    var loc = cfg.active;
    var base = weatherBase(cfg);
    var prov = base.provenance;
    try {
      var url = OPEN_METEO_BASE +
        '?latitude=' + encodeURIComponent(String(loc.lat)) +
        '&longitude=' + encodeURIComponent(String(loc.lon)) +
        '&current=temperature_2m%2Crelative_humidity_2m%2Cweather_code' +
        '&daily=temperature_2m_max%2Ctemperature_2m_min%2Cprecipitation_probability_max' +
        '&timezone=Asia%2FBangkok&forecast_days=1';
      var p = fetchJson(url);
      if (!p || p.timezone !== 'Asia/Bangkok' || !p.current || !p.current_units ||
        p.current_units.temperature_2m !== '°C' || p.current_units.relative_humidity_2m !== '%' ||
        !p.daily || !Array.isArray(p.daily.time) || p.daily.time.length < 1) {
        base._err = err('weather', 'PARSE', 'unexpected Open-Meteo shape/units');
        return base;
      }
      var obsMs = parseBangkokLocalTime(p.current.time);
      if (obsMs === null) { base._err = err('weather', 'OBSERVED_AT', 'current.time unparseable'); return base; }
      var fresh = freshness(obsMs, now);
      if (fresh === 'future') {
        var m = weatherMissing(prov); m.source = base.source;
        m._err = err('weather', 'OBSERVED_AT', 'future timestamp rejected');
        return m;
      }
      var t = asNumber(p.current.temperature_2m);
      var rh = asNumber(p.current.relative_humidity_2m);
      var code = p.current.weather_code;
      if (t === null || t < -40 || t > 65 || rh === null || rh < 0 || rh > 100 ||
        typeof code !== 'number' || !isFinite(code) || Math.floor(code) !== code || code < 0 || code > 99) {
        base._err = err('weather', 'PARSE', 'weather fields invalid (code must be int 0..99)');
        return base;
      }
      /* forecastDate strict: calendar format AND Bangkok TODAY, else the
       * forecast-day fields drop independently of current conditions. */
      var today = bangkokDateStr(now);
      var fdate = p.daily.time[0];
      var forecastOk = typeof fdate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fdate) && fdate === today;
      var tmax = asNumber(p.daily.temperature_2m_max && p.daily.temperature_2m_max[0]);
      var tmin = asNumber(p.daily.temperature_2m_min && p.daily.temperature_2m_min[0]);
      var rain = asNumber(p.daily.precipitation_probability_max && p.daily.precipitation_probability_max[0]);
      return {
        status: fresh === 'stale' ? 'stale' : 'ok',
        temperatureC: t, humidityPct: rh, weatherCode: code,
        tmaxC: forecastOk && tmax !== null && tmax >= -80 && tmax <= 80 ? tmax : null,
        tminC: forecastOk && tmin !== null && tmin >= -80 && tmin <= 80 ? tmin : null,
        rainPct: forecastOk && rain !== null && rain >= 0 && rain <= 100 ? rain : null,
        observedAt: bangkokIsoObserved(obsMs),
        forecastDate: forecastOk ? fdate : null,
        source: base.source, provenance: prov, _err: null,
      };
    } catch (x) {
      return upstreamFailure(base, 'weather', x, 'weather');
    }
  }

  function channelWater(cfg) {
    var loc = cfg.active;
    var stationNote = loc.waterStationId !== '' ? ' · ทะเบียน ' + loc.waterStationId + ' (ยังไม่มีช่องทางข้อมูลที่ยืนยัน)' : '';
    return {
      status: 'missing', available: false, value: null, unit: 'm', observedAt: null,
      source: 'ไม่มีสถานีระดับน้ำที่ยืนยันแล้ว — รอข้อมูลจริง' + stationNote +
        ' (GloFAS discharge = MODELLED แสดงเฉพาะหน้า water เท่านั้น ห้ามแปลงเป็นระดับ/ความรุนแรง; คลัง HII รายเดือนสิ้นสุด 30 ก.ย. = ไม่ใช่ real-time)',
      provenance: {
        provider: 'none', agency: '', service: '',
        areaId: null, stationId: loc.waterStationId !== '' ? loc.waterStationId : null,
        sourceUrl: '', termsUrl: '', timeZone: 'Asia/Bangkok', unit: 'm',
        datum: loc.waterDatum !== '' ? loc.waterDatum : null,
        note: 'no verified station API; HII monthly archive ends Sep 30 (stale); thresholds pending engineer confirmation; station coords may differ ~131m from OSM hospital pin — no coord shift applied',
      },
      _err: null,
    };
  }

  function stripInternal(ch) {
    var out = {};
    for (var k in ch) if (k !== '_err' && k !== '_cooldownS' && Object.prototype.hasOwnProperty.call(ch, k)) out[k] = ch[k];
    return out;
  }

  function buildChannels(cfg, now) {
    var pm = channelPm25(cfg, now);
    var wx = channelWeather(cfg, now);
    var water = channelWater(cfg);
    var errors = [];
    if (pm._err) errors.push(pm._err);
    if (wx._err) errors.push(wx._err);
    return { pm25: stripInternal(pm), weather: stripInternal(wx), water: stripInternal(water), errors: errors };
  }

  /* Cache key fingerprint: everything about the location that changes what
   * upstream data means — coords, providers, PM area id, station, datum and
   * the canonicalized human label — so a Sheet edit without config_version
   * bump can never serve stale-key data from another station/coords/label. */
  function locationFingerprint(loc) {
    var raw = [loc.lat, loc.lon, loc.pmProvider, loc.pmAreaId, loc.pmTambonName, loc.wxProvider, loc.waterProvider, loc.waterStationId, loc.waterDatum, canonicalLocationLabel(loc.label)].join('|');
    var h = 5381;
    for (var i = 0; i < raw.length; i++) h = ((h << 5) + h + raw.charCodeAt(i)) & 0xffffffff;
    return (h >>> 0).toString(36);
  }
  function channelKeys(cfg, ch) {
    var base = 'bapi_v2_' + cfg.active.id + '_' + cfg.settings.configVersion + '_' + locationFingerprint(cfg.active);
    return { primary: base + ':' + ch, lastGood: base + ':' + ch + '_lg', cooldown: base + ':' + ch + '_cd' };
  }

  function cache() { return CacheService.getScriptCache(); }

  /* Re-derive staleness on every read so an aged cached channel greys out
   * instead of lying; observedAt is the upstream time, never fabricated. */
  function rechannelStaleness(ch, now) {
    var out = {};
    for (var k in ch) if (Object.prototype.hasOwnProperty.call(ch, k)) out[k] = ch[k];
    if (out.status === 'ok' && typeof out.observedAt === 'string') {
      var ms = Date.parse(out.observedAt);
      if (isFinite(ms) && now - ms > FRESH_MS) out.status = 'stale';
    }
    return out;
  }

  function lastGoodOrMissing(cfg, ch, makeBase, keys, now, busy) {
    var lg = safeParse(cache().get(keys.lastGood));
    if (lg) return rechannelStaleness(lg, now);
    var m = makeBase(cfg);
    m._err = err(ch, 'UPSTREAM', busy ? 'busy' : 'upstream cooldown (rate-limit backoff)');
    return m;
  }

  /* Shared refresh used by BOTH the read route and history batches: fetch the
   * channel, record a bounded cooldown on failure, persist primary+last-good
   * on success, and fall back to last-good on a failing build (relabeled
   * stale when aged; the live outage reason is surfaced in errors[]). */
  function refreshChannel(cfg, ch, fetchFresh, makeBase, ttlS, now, c, keys) {
    var built = fetchFresh(cfg, now, true);
    if (built._cooldownS) {
      try { c.put(keys.cooldown, '1', built._cooldownS); } catch (e) { /* cooldown is best-effort */ }
    }
    if (built.status !== 'missing') {
      c.put(keys.primary, JSON.stringify(stripInternal(built)), ttlS);
      c.put(keys.lastGood, JSON.stringify(stripInternal(built)), LASTGOOD_TTL_S);
      return built;
    }
    var lg = safeParse(c.get(keys.lastGood));
    if (lg) {
      var out = rechannelStaleness(lg, now);
      if (built._err) out._err = built._err;
      return out;
    }
    return built; /* honest missing — never 0, never fabricated freshness */
  }

  /* On-demand per-channel read (PM 1800 s / weather 600 s best-effort; no
   * scheduler drives it — zero requests means zero upstream calls).
   * noLock=true ONLY for callers that already hold the script lock (history
   * batch) so the nested tryLock can never self-deadlock. */
  function getChannelCached(cfg, ch, fetchFresh, makeBase, ttlS, now, noLock) {
    var keys = channelKeys(cfg, ch);
    var c = cache();
    var hit = safeParse(c.get(keys.primary));
    if (hit) return rechannelStaleness(hit, now);
    if (c.get(keys.cooldown)) return lastGoodOrMissing(cfg, ch, makeBase, keys, now, false);
    if (noLock) return refreshChannel(cfg, ch, fetchFresh, makeBase, ttlS, now, c, keys);
    var lock = LockService.getScriptLock();
    var got = false;
    try { got = lock.tryLock(10000); } catch (e) { got = false; }
    if (!got) return lastGoodOrMissing(cfg, ch, makeBase, keys, now, true);
    try {
      hit = safeParse(c.get(keys.primary));
      if (hit) return rechannelStaleness(hit, now);
      if (c.get(keys.cooldown)) return lastGoodOrMissing(cfg, ch, makeBase, keys, now, false);
      return refreshChannel(cfg, ch, fetchFresh, makeBase, ttlS, now, c, keys);
    } finally {
      try { lock.releaseLock(); } catch (e) { /* noop */ }
    }
  }

  function getDataPayload(cfg, now) {
    var pm = getChannelCached(cfg, 'pm25', channelPm25, pm25Base, PM_TTL_S, now, false);
    var wx = getChannelCached(cfg, 'weather', channelWeather, weatherBase, WX_TTL_S, now, false);
    var water = channelWater(cfg);
    var errors = [];
    if (pm._err) errors.push(pm._err);
    if (wx._err) errors.push(wx._err);
    return { pm25: stripInternal(pm), weather: stripInternal(wx), water: stripInternal(water), errors: errors };
  }

  function allMissingEnvelope(errors, location) {
    return {
      schema: SCHEMA, generatedAt: isoZ(nowMs()),
      location: location || { id: '', label: '', lat: null, lon: null },
      pm25: stripInternal(pm25Missing()),
      weather: stripInternal(weatherMissing(null)),
      water: stripInternal(channelWater({ active: { label: '', waterStationId: '', waterDatum: '' } })),
      errors: errors,
    };
  }

  function textOutput(obj) {
    return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
  }
  function jsonpOutput(callbackId, obj) {
    var safe = JSON.stringify(obj).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    return ContentService.createTextOutput(callbackId + '(' + safe + ');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  /** Every data-route response (success OR error envelope) honors a valid
   * callback with the same wrap; only invalid callbacks are never wrapped. */
  function respond(callbackId, errors, fields) {
    var envelope = fields ? {
      schema: SCHEMA, generatedAt: fields.generatedAt, location: fields.location,
      pm25: fields.pm25, weather: fields.weather, water: fields.water, errors: errors,
    } : allMissingEnvelope(errors);
    return callbackId === null ? textOutput(envelope) : jsonpOutput(callbackId, envelope);
  }

  function doGet(e) {
    var params = (e && e.parameter) || {};
    if (params.action === 'snapshot_v1') return HourlySnapshot.web(e);
    if (params.action === 'pm25_history') return historyResponse(params);
    if (params.action !== 'data') {
      return HtmlService.createTemplateFromFile('index')
        .evaluate().setTitle('Air Quality Widget')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }
    var callbackId = params.callback == null ? null : String(params.callback);
    if (callbackId !== null && !CALLBACK_RE.test(callbackId)) {
      /* rejected BEFORE any cache/upstream/Sheet access; never wrapped */
      return textOutput(allMissingEnvelope([err('callback', 'CALLBACK', 'callback must be a single identifier')]));
    }
    if (params.v !== '1') {
      return respond(callbackId, [err('version', 'VERSION', 'unsupported or missing v (expected 1)')], null);
    }
    var cfg = loadConfigSafe();
    if (!cfg.ok) {
      return respond(callbackId, [err('config', 'CONFIG', 'configuration invalid: ' + cfg.reason)], null);
    }
    var now = nowMs();
    var channels;
    if (PropertiesService.getScriptProperties().getProperty('widget_snapshot_mode_v1') === 'enabled') {
      /* Once cut over, web requests never refresh a provider. Fail closed if
         the snapshot is missing or stale; the scheduled collector repairs it. */
      var snap=null; try { snap=HourlySnapshot.read(now); } catch (_) { /* unavailable */ }
      var c=snap && snap.channels || {};
      channels={pm25:c.pm25 ? c.pm25.data : stripInternal(pm25Missing()),
        weather:c.weather ? c.weather.data : stripInternal(weatherMissing()),
        water:stripInternal(channelWater(cfg)),errors:[]};
    } else channels = getDataPayload(cfg, now);
    return respond(callbackId, channels.errors || [], {
      schema: SCHEMA, generatedAt: isoZ(now),
      location: { id: cfg.active.id, label: cfg.active.label, lat: cfg.active.lat, lon: cfg.active.lon },
      pm25: channels.pm25, weather: channels.weather, water: channels.water,
    });
  }

  /* Read only observed PM values from the existing History_Batch tab. */
  function historyResponse(params) {
    var cb = params.callback == null ? null : String(params.callback);
    if (cb !== null && !CALLBACK_RE.test(cb)) return textOutput({schema: 1, status: 'unavailable', points: []});
    var out = {schema: 1, status: 'unavailable', location: null, points: []};
    try {
      var cfg = loadConfigSafe(), now = nowMs();
      if (!cfg.ok) throw new Error('config unavailable');
      var book = openSpreadsheet(), sheets = [book.getSheetByName(TAB_HISTORY), book.getSheetByName(TAB_PM_HOURLY)].filter(function(s){return !!s});
      if (!sheets.length) throw new Error('history unavailable');
      var seen = {}, readable = 0;
      sheets.forEach(function(sheet) { try {
      var rows = sheet.getDataRange().getValues(), header = rows[0] || [];
      var hourly = sheet.getName() === TAB_PM_HOURLY;
      if (hourly && (header.length !== PM_HISTORY_HEADER.length || PM_HISTORY_HEADER.some(function(name, i){return header[i] !== name}))) return;
      var loc = header.indexOf('location_id'), val = header.indexOf('pm25_value'), obs = header.indexOf('pm25_observed_at'), stat = header.indexOf('pm25_status');
      var provider = header.indexOf('pm25_provider'), area = header.indexOf('pm25_area_id'), tambon = header.indexOf('pm25_tambon_name');
      if (loc < 0 || val < 0 || obs < 0 || stat < 0 || provider < 0 || area < 0 || tambon < 0) return;
      readable++;
      for (var i = 1; i < rows.length; i++) {
        var r = rows[i], n = asNumber(r[val]), t = r[obs] instanceof Date ? r[obs].getTime() : Date.parse(String(r[obs] || ''));
        if (hourly && !validPmHourlyRow(r)) continue;
        if (String(r[loc]) !== cfg.active.id || String(r[provider]).trim() !== cfg.active.pmProvider || String(r[area]).trim() !== cfg.active.pmAreaId || String(r[tambon]).trim().normalize('NFC') !== cfg.active.pmTambonName || ['ok','stale'].indexOf(String(r[stat])) < 0 || n === null || n < 0 || n > 1000 || !isFinite(t) || t < now - 86400000 || t > now + 120000 || seen[t]) continue;
        seen[t] = true; out.points.push({value:n, observedAt:isoZ(t)});
      }
      } catch (sheetError) { /* one damaged tab must not hide another */ } });
      if (!readable) throw new Error('history schema unavailable');
      out.points.sort(function(a,b){return Date.parse(a.observedAt)-Date.parse(b.observedAt)});
      out.status = 'ok'; out.location = cfg.active.id;
    } catch (e) { /* honest unavailable, never synthetic history */ }
    return cb === null ? textOutput(out) : jsonpOutput(cb, out);
  }

  /* Scheduled every hour; preserve existing triggers and append each actual
   * observation once. Failed or repeated observations never invent a row. */
  function hourlyHistory(event) {
    var uid = event && event.triggerUid != null ? String(event.triggerUid) : '';
    var scheduled = uid !== '' && ScriptApp.getProjectTriggers().some(function(t){
      return t.getHandlerFunction() === 'BackendApiPm25Hourly_' && String(t.getUniqueId()) === uid;
    });
    if (!scheduled && !isOwnerSession()) throw new Error('hourly trigger not authorized');
    var cfg = loadConfigSafe(); if (!cfg.ok) return;
    var lock = LockService.getScriptLock(); if (!lock.tryLock(15000)) return;
    try {
      var book = openSpreadsheet(), sheet = book.getSheetByName(TAB_PM_HOURLY), now = nowMs();
      if (!sheet) {
        sheet = book.insertSheet(TAB_PM_HOURLY);
        sheet.getRange(1, 1, 1, PM_HISTORY_HEADER.length).setValues([PM_HISTORY_HEADER]);
      }
      var rows = sheet.getDataRange().getValues(), h = rows[0] || [], li = h.indexOf('location_id'), oi = h.indexOf('pm25_observed_at');
      if (h.length !== PM_HISTORY_HEADER.length || PM_HISTORY_HEADER.some(function(name, i){return h[i] !== name})) return;
      /* Remove only expired, parseable observations in this dedicated tab.
       * Unknown dates and all legacy mixed weather/water rows are preserved. */
      var runEnd = -1;
      for (var r = rows.length - 1; r >= 0; r--) {
        var stamp = r > 0 ? (rows[r][oi] instanceof Date ? rows[r][oi].getTime() : Date.parse(String(rows[r][oi] || ''))) : NaN;
        if (r > 0 && validPmHourlyRow(rows[r]) && isFinite(stamp) && stamp < now - PM_RETENTION_MS) { if (runEnd < 0) runEnd = r; }
        else if (runEnd >= 0) { sheet.deleteRows(r + 2, runEnd - r); rows.splice(r + 1, runEnd - r); runEnd = -1; }
      }
      var pm = getChannelCached(cfg, 'pm25', channelPm25, pm25Base, PM_TTL_S, now, true);
      if (pm.status !== 'ok' || pm.value === null || !pm.observedAt) return;
      var observed = Date.parse(pm.observedAt);
      if (!isFinite(observed) || observed < now - PM_RETENTION_MS || observed > now + 120000) return;
      for (var i = Math.max(1, rows.length-1000); i < rows.length; i++) {
        var old = rows[i][oi] instanceof Date ? rows[i][oi].getTime() : Date.parse(String(rows[i][oi] || ''));
        if (validPmHourlyRow(rows[i]) && String(rows[i][li]) === cfg.active.id &&
            String(rows[i][5]).trim() === cfg.active.pmProvider && String(rows[i][6]).trim() === cfg.active.pmAreaId &&
            String(rows[i][7]).trim().normalize('NFC') === cfg.active.pmTambonName &&
            Math.floor(old / 3600000) === Math.floor(observed / 3600000)) return;
      }
      sheet.appendRow(['pm25_hourly_v1',cfg.active.id,pm.value,pm.observedAt,pm.status,cfg.active.pmProvider,cfg.active.pmAreaId,cfg.active.pmTambonName,isoZ(now)]);
    } finally { lock.releaseLock(); }
  }
  function installHourlyTrigger() {
    assertTrustedCaller('BackendApiInstallPm25Hourly_', true);
    var found = ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction() === 'BackendApiPm25Hourly_'});
    if (found.length > 1) throw new Error('multiple hourly triggers; preserve and inspect');
    if (!found.length) ScriptApp.newTrigger('BackendApiPm25Hourly_').timeBased().everyHours(1).create();
    return {hourlyTriggerCount: ScriptApp.getProjectTriggers().filter(function(t){return t.getHandlerFunction() === 'BackendApiPm25Hourly_'}).length};
  }

  /* ---------------- history: exactly two batches per day ---------------- */

  /* Slot windows are explicit: a run records only when the current Bangkok
   * hour is within configuredHour ± SLOT_JITTER_H. Non-overlap is enforced
   * at settings load (|morning-evening| > 2*jitter). A manual noon run can
   * therefore never preconsume the 16:00 batch. */
  function slotForRun(hour, settings) {
    var slots = [['morning', settings.morningHour], ['evening', settings.eveningHour]];
    for (var i = 0; i < slots.length; i++) {
      if (Math.abs(hour - slots[i][1]) <= SLOT_JITTER_H) return slots[i][0];
    }
    return null;
  }

  function historyRowKey(batchId, locationId) { return batchId + '|' + locationId; }

  function historyBatch() {
    assertTrustedCaller(OWNED_HISTORY_HANDLER, false); /* scheduled or owner only */
    var cfg = loadConfigSafe();
    if (!cfg.ok) { Logger.log('BackendApi history: config invalid, skipping'); return; }
    var sheet = openSpreadsheet().getSheetByName(TAB_HISTORY);
    if (!sheet) { Logger.log('BackendApi history: ' + TAB_HISTORY + ' tab missing, run setup first'); return; }
    var now = nowMs();
    var p = bangkokParts(now);
    var slot = slotForRun(p.h, cfg.settings);
    if (!slot) { Logger.log('BackendApi history: hour ' + p.h + ' outside ±' + SLOT_JITTER_H + 'h of configured slots, no batch recorded'); return; }
    var batchDate = bangkokDateStr(now);
    var batchId = batchDate + ':' + slot;

    var lock = LockService.getScriptLock();
    var got = false;
    try { got = lock.tryLock(15000); } catch (e) { got = false; }
    if (!got) { Logger.log('BackendApi history: another batch run holds the lock, exiting'); return; }
    try {
      var existing = {};
      var rows = sheet.getDataRange().getValues();
      var scanFrom = Math.max(1, rows.length - 500); /* bounded duplicate lookup */
      for (var r = scanFrom; r < rows.length; r++) {
        existing[historyRowKey(String(rows[r][0]), String(rows[r][3]))] = true;
      }
      var locations = cfg.locations.filter(function (L) { return truthy(L.enabled); });
      for (var i = 0; i < locations.length; i++) {
        var L = locations[i];
        var locId = String(L.id).trim();
        if (existing[historyRowKey(batchId, locId)]) continue; /* appendSuccess/crash/retry safe */
        var single = singleLocationConfig(cfg, L);
        if (!single.ok) {
          appendHistoryRow(sheet, batchId, batchDate, slot, L,
            stripInternal(pm25Missing()), stripInternal(weatherMissing(null)),
            stripInternal(channelWater({ active: { label: '', waterStationId: '', waterDatum: '' } })),
            [err('config', 'CONFIG', 'location config invalid')]);
          existing[historyRowKey(batchId, locId)] = true;
          continue;
        }
        /* History REUSES the per-channel read cache inside the same fetch
         * helper (noLock: this batch already holds the script lock): a warm
         * batch adds ZERO upstream calls; only channels past their TTL are
         * refreshed. Rows record the observedAt/status of the data actually
         * used — a cached PM value may be up to 30 min old at batch time. */
        var pm = getChannelCached(single, 'pm25', channelPm25, pm25Base, PM_TTL_S, now, true);
        var wx;
        if(PropertiesService.getScriptProperties().getProperty('widget_snapshot_mode_v1')==='enabled') {
          var stored=null;try {if(single.active.id===cfg.active.id)stored=HourlySnapshot.read(now);}catch (_){}
          wx=stored&&stored.channels.weather?stored.channels.weather.data:weatherMissing(null);
        } else wx = getChannelCached(single, 'weather', channelWeather, weatherBase, WX_TTL_S, now, true);
        var water = channelWater(single);
        var errs = [];
        if (pm._err) errs.push(pm._err);
        if (wx._err) errs.push(wx._err);
        appendHistoryRow(sheet, batchId, batchDate, slot, L, stripInternal(pm), stripInternal(wx), stripInternal(water), errs);
        existing[historyRowKey(batchId, locId)] = true;
      }
      /* Charts rebuild AFTER appends in the same guarded scheduled context.
       * Lazily creates the 'Charts' tab on the first batch (zero extra owner
       * step post-deploy). Chart failures must NEVER break history rows. */
      try { refreshCharts(); } catch (chartErr) {
        Logger.log('BackendApi history: chart refresh failed (history rows intact): ' + chartErr);
      }
    } finally {
      try { lock.releaseLock(); } catch (e) { /* noop */ }
    }
  }

  function singleLocationConfig(cfg, L) {
    var loc = {
      id: String(L.id || '').trim(), label: canonicalLocationLabel(L.label || L.id),
      lat: asNumber(L.lat), lon: asNumber(L.lon),
      pmProvider: String(L.pm_provider || '').trim(),
      pmAreaId: String(L.pm_location_id == null ? '' : L.pm_location_id).trim(),
      pmTambonName: String(L.pm_tambon_name == null ? '' : L.pm_tambon_name).trim().normalize('NFC'),
      wxProvider: String(L.weather_provider || '').trim(),
      waterProvider: String(L.water_provider == null ? '' : L.water_provider).trim(),
      waterStationId: String(L.water_station_id == null ? '' : L.water_station_id).trim(),
      waterDatum: String(L.water_datum == null ? '' : L.water_datum).trim(),
    };
    if (!SAFE_ID_RE.test(loc.id) || loc.lat === null || loc.lat < -90 || loc.lat > 90 ||
      loc.lon === null || loc.lon < -180 || loc.lon > 180 ||
      PM_PROVIDER_ENUM.indexOf(loc.pmProvider) < 0 ||
      WEATHER_PROVIDER_ENUM.indexOf(loc.wxProvider) < 0 ||
      (loc.pmProvider === 'gistda' && !/^\d{1,10}$/.test(loc.pmAreaId))) {
      return { ok: false };
    }
    if (loc.pmTambonName === '' && loc.id === 'uthai' && loc.pmAreaId === '1414') loc.pmTambonName = 'อุทัย';
    return { ok: true, active: loc, sources: cfg.sources, settings: cfg.settings };
  }

  function singleTambon(L) {
    var t = String(L.pm_tambon_name == null ? '' : L.pm_tambon_name).trim().normalize('NFC');
    if (t === '' && String(L.id || '').trim() === 'uthai' && String(L.pm_location_id || '').trim() === '1414') return 'อุทัย';
    return t;
  }
  function appendHistoryRow(sheet, batchId, batchDate, slot, L, pm, wx, water, errors) {
    var locId = String(L.id || '').trim();
    var lat = asNumber(L.lat), lon = asNumber(L.lon);
    var pmProvider = String(L.pm_provider || '').trim();
    var pmAreaId = String(L.pm_location_id == null ? '' : L.pm_location_id).trim();
    var waterStationId = String(L.water_station_id == null ? '' : L.water_station_id).trim();
    var waterDatum = String(L.water_datum == null ? '' : L.water_datum).trim();
    var wxProvider = String(L.weather_provider || '').trim();
    sheet.appendRow([
      safeSheetString(batchId), safeSheetString(batchDate), safeSheetString(slot), safeSheetString(locId),
      lat, lon,
      pm && pm.status !== 'missing' ? pm.value : null,
      pm ? pm.observedAt : null,
      pm ? safeSheetString(pm.status) : 'missing',
      safeSheetString(pmProvider), safeSheetString(pmAreaId), safeSheetString(singleTambon(L)),
      wx && wx.status !== 'missing' ? wx.temperatureC : null,
      wx && wx.status !== 'missing' ? wx.humidityPct : null,
      wx && wx.status !== 'missing' ? wx.weatherCode : null,
      wx ? wx.observedAt : null,
      wx ? safeSheetString(wx.status) : 'missing',
      safeSheetString(wxProvider),
      water ? safeSheetString(water.status) : 'missing',
      safeSheetString(waterStationId), safeSheetString(waterDatum),
      isoZ(nowMs()),
    ]);
    if (errors && errors.length) Logger.log('BackendApi history ' + locId + ' errors: ' + errors.length);
  }

  /* ---------------- charts dashboard (auto-managed 'Charts' tab) ---------------- */

  /** Idempotent tab creation: only creates when absent, writes the A1 note
   * exactly once, never touches any other tab. Called from setup, from the
   * scheduled history batch (lazy: zero extra owner step post-deploy), and
   * from the owner refresh wrapper. */
  function ensureChartsTab(ss) {
    var sheet = ss.getSheetByName(TAB_CHARTS);
    if (sheet) return { sheet: sheet, created: false };
    sheet = ss.insertSheet(TAB_CHARTS);
    sheet.getRange(1, 1, 1, 1).setValues([[
      'กราฟอัตโนมัติจาก History_Batch · ย้อนหลัง ' + CHART_WINDOW_DAYS +
      ' วัน · สร้างใหม่เองหลังบันทึกประวัติเช้า/เย็น หรือรัน refreshLedCharts · ห้ามลบแท็บนี้',
    ]]);
    Logger.log('BackendApi charts: created tab ' + TAB_CHARTS);
    return { sheet: sheet, created: true };
  }

  function chartColumnsByHeader(header) {
    var map = {};
    for (var c = 0; c < header.length; c++) map[String(header[c] != null ? header[c] : '').trim()] = c + 1;
    return map;
  }

  /** Removes ONLY charts whose title carries CHART_MARKER. Charts created
   * by a human (no marker) are never touched. */
  function removeOwnedCharts(sheet, result) {
    sheet.getCharts().forEach(function (ch) {
      var t = '';
      try { t = String((ch.getOptions() || {}).title || ''); } catch (x) { t = ''; }
      if (t.indexOf(CHART_MARKER) >= 0) {
        sheet.removeChart(ch);
        result.removed++;
      }
    });
  }

  /** Rebuilds the embedded line charts from History_Batch for the ACTIVE
   * location over the last CHART_WINDOW_DAYS days. Safe on empty history
   * (tab exists, zero charts), skips honestly when the active location's
   * rows are interleaved with other locations (never charts mixed data),
   * and never writes to History_Batch. */
  function refreshCharts() {
    var ss = openSpreadsheet();
    var tab = ensureChartsTab(ss);
    var sheet = tab.sheet;
    var result = { ok: true, tab: TAB_CHARTS, created: tab.created, charts: [], removed: 0, skipped: [] };
    var hist = ss.getSheetByName(TAB_HISTORY);
    var rows = hist ? hist.getDataRange().getValues() : null;
    if (!rows || rows.length < 2) {
      removeOwnedCharts(sheet, result);
      result.skipped.push('no history rows yet — charts appear after the first batch');
      return result;
    }
    var cfg = loadConfigSafe();
    if (!cfg.ok) {
      removeOwnedCharts(sheet, result);
      result.skipped.push('config invalid: ' + cfg.reason);
      return result;
    }
    var activeId = cfg.settings.activeId;
    var cols = chartColumnsByHeader(rows[0]);
    var dateCol = cols['batch_date'], locCol = cols['location_id'];
    if (!dateCol || !locCol) {
      removeOwnedCharts(sheet, result);
      result.skipped.push('history header lacks batch_date/location_id');
      return result;
    }
    var cutoff = bangkokDateStr(nowMs() - CHART_WINDOW_DAYS * 86400000);
    var firstIdx = -1, r;
    for (r = 1; r < rows.length; r++) {
      var locId = String(rows[r][locCol - 1] != null ? rows[r][locCol - 1] : '').trim();
      var d = String(rows[r][dateCol - 1] != null ? rows[r][dateCol - 1] : '').trim();
      if (locId === activeId && /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= cutoff) { firstIdx = r; break; }
    }
    if (firstIdx < 0) {
      removeOwnedCharts(sheet, result);
      result.skipped.push('no ' + activeId + ' rows in the last ' + CHART_WINDOW_DAYS + '-day window');
      return result;
    }
    for (r = firstIdx; r < rows.length; r++) {
      var mid = String(rows[r][locCol - 1] != null ? rows[r][locCol - 1] : '').trim();
      if (mid !== activeId) {
        removeOwnedCharts(sheet, result);
        result.skipped.push('active-location rows interleaved with other locations — charts skipped (never mixed data)');
        return result;
      }
    }
    var enabledCount = 0;
    (cfg.locations || []).forEach(function (L) { if (truthy(L.enabled)) enabledCount++; });
    var labelSuffix = enabledCount > 1 ? ' · ' + cfg.active.label : '';
    var numRows = rows.length - firstIdx;
    removeOwnedCharts(sheet, result);
    CHART_CHANNELS.forEach(function (ch) {
      var colIdx = cols[ch.col];
      if (!colIdx) {
        result.skipped.push(ch.key + ' column absent in history');
        return;
      }
      if (ch.needsNumeric) {
        var seen = 0;
        for (var r2 = firstIdx; r2 < rows.length; r2++) if (asNumber(rows[r2][colIdx - 1]) !== null) seen++;
        if (seen === 0) {
          result.skipped.push(ch.key + ' รอข้อมูลจริง (no numeric value in window — never fabricated)');
          return;
        }
      }
      var title = ch.title + labelSuffix + CHART_MARKER;
      var chart = sheet.newChart()
        .asLineChart()
        .addRange(hist.getRange(firstIdx + 1, dateCol, numRows, 1))
        .addRange(hist.getRange(firstIdx + 1, colIdx, numRows, 1))
        .setOption('title', title)
        .setOption('colors', [ch.color])
        .setOption('curveType', 'function')
        .setOption('pointSize', 4)
        .setOption('lineWidth', 2)
        .setOption('legend', { position: 'bottom' })
        .setOption('hAxis', { format: 'd MMM', gridlines: { color: CHART_GRID_COLOR } })
        .setOption('vAxis', { format: 'decimal', gridlines: { color: CHART_GRID_COLOR } })
        .setOption('width', CHART_W)
        .setOption('height', CHART_H)
        .setPosition(
          CHART_ANCHOR_ROW + Math.floor(result.charts.length / 2) * CHART_ROW_SPAN,
          CHART_ANCHOR_COL + (result.charts.length % 2) * CHART_COL_SPAN,
          0, 0)
        .build();
      sheet.insertChart(chart);
      result.charts.push(title);
    });
    return result;
  }

  /* ---------------- setup (idempotent, preserves existing data) ---------------- */

  var SETUP_TABS = [
    {
      name: TAB_SETTINGS, header: ['key', 'value'],
      seed: [
        ['active_location_id', 'uthai'],
        ['history_morning_hour', '6'],
        ['history_evening_hour', '16'],
        ['timezone', 'Asia/Bangkok'],
        ['config_version', '1'],
      ],
    },
    {
      name: TAB_LOCATIONS,
      header: ['id', 'label', 'enabled', 'lat', 'lon', 'pm_provider', 'pm_location_id', 'pm_tambon_name', 'weather_provider', 'water_provider', 'water_station_id', 'water_datum', 'official_bank_crest_m', 'water_thresholds'],
      seed: [
        ['uthai', 'ต.อุทัย อ.อุทัย จ.พระนครศรีอยุธยา', 'TRUE', 14.36147, 100.64424, 'gistda', '1414', 'อุทัย', 'open-meteo', '', '', '', '', ''],
      ],
    },
    {
      name: TAB_SOURCES,
      header: ['provider', 'agency', 'service', 'source_url', 'docs_url', 'terms_url', 'auth_method', 'units', 'datum', 'credential_property', 'notes'],
      seed: [
        ['gistda', 'GISTDA', 'getPm25byTambon (tambon area aggregate, not a station)', 'https://pm25.gistda.or.th/', 'https://pm25.gistda.or.th/', 'https://pm25.gistda.or.th/', 'none (public)', 'µg/m³', '', '', ''],
        ['open-meteo', 'Open-Meteo', 'forecast v1 (weather model)', 'https://api.open-meteo.com/', 'https://open-meteo.com/en/docs', 'https://open-meteo.com/en/terms', 'none (keyless)', '°C, %, WMO code', '', '', 'NOT hospital thermometry; HI derived client-side'],
      ],
    },
    { name: TAB_HISTORY, header: ['batch_id', 'batch_date', 'slot', 'location_id', 'lat', 'lon', 'pm25_value', 'pm25_observed_at', 'pm25_status', 'pm25_provider', 'pm25_area_id', 'pm25_tambon_name', 'wx_temp_c', 'wx_rh_pct', 'wx_code', 'wx_observed_at', 'wx_status', 'wx_provider', 'water_status', 'water_station_id', 'water_datum', 'created_at'], seed: [] },
  ];

  function setupSheets() {
    var ss = openSpreadsheet();
    SETUP_TABS.forEach(function (def) {
      var sheet = ss.getSheetByName(def.name);
      if (sheet) return; /* existing tab never rewritten, data preserved */
      sheet = ss.insertSheet(def.name);
      sheet.getRange(1, 1, 1, def.header.length).setValues([def.header]);
      (def.seed || []).forEach(function (row) { sheet.appendRow(row); });
      Logger.log('BackendApi setup: created tab ' + def.name);
    });
    ensureChartsTab(ss); /* dashboard tab, idempotent, header-less note only */
    Logger.log('BackendApi setup complete (idempotent)');
  }

  /* ---------------- triggers + two-batch/day migration ---------------- */

  function settingsHours() {
    var map = {};
    rowsToObjects(readTabRows(TAB_SETTINGS) || []).forEach(function (r) { map[String(r.key)] = r.value; });
    var m = asNumber(map.history_morning_hour), e = asNumber(map.history_evening_hour);
    if (m === null || m < 0 || m > 23) m = 6;
    if (e === null || e < 0 || e > 23) e = 16;
    if (m === e || Math.abs(m - e) <= 2 * SLOT_JITTER_H) { m = 6; e = 16; }
    return { morning: m, evening: e };
  }

  function ownedTriggerCount() {
    return ScriptApp.getProjectTriggers().filter(function (t) {
      return t.getHandlerFunction() === OWNED_HISTORY_HANDLER;
    }).length;
  }

  function installTriggers() {
    var hours = settingsHours();
    ScriptApp.getProjectTriggers().forEach(function (t) {
      if (t.getHandlerFunction() === OWNED_HISTORY_HANDLER) ScriptApp.deleteTrigger(t);
    });
    /* Apps Script daily triggers fire at an approximate hour, not exact minute. */
    ScriptApp.newTrigger(OWNED_HISTORY_HANDLER).timeBased().atHour(hours.morning).everyDays(1).create();
    ScriptApp.newTrigger(OWNED_HISTORY_HANDLER).timeBased().atHour(hours.evening).everyDays(1).create();
    Logger.log('BackendApi triggers installed at ~' + hours.morning + ' and ~' + hours.evening + ' Bangkok');
    return ownedTriggerCount();
  }

  function backupTriggerMetadata(label) {
    var list = ScriptApp.getProjectTriggers().map(function (t) { return { handler: t.getHandlerFunction() }; });
    PropertiesService.getScriptProperties()
      .setProperty('bapi_trigger_backup_' + label + '_' + nowMs(), JSON.stringify(list));
    return list;
  }

  function planLegacyMigration() {
    var list = backupTriggerMetadata('plan'); /* metadata backup is write-safe */
    return {
      triggers: list,
      legacyHistoryHandlers: LEGACY_HISTORY_HANDLERS,
      legacyHistoryTriggers: list.filter(function (t) { return LEGACY_HISTORY_HANDLERS.indexOf(t.handler) >= 0; }),
      ownedTriggerCount: ownedTriggerCount(),
      proposedActions: [
        'install/verify exactly TWO owned ' + OWNED_HISTORY_HANDLER + ' triggers at configured hours',
        'retire legacy HISTORY handlers main (06/16 ชีต1) + logGistdaData (08/20 ชีต2) — live source verified history-only at @24 (main has no active LINE send; logger is history-only)',
        'refuse to report cadenceComplete while any legacy history trigger remains',
      ],
      notes: 'Read-only plan. Creator limitation: Apps Script triggers do not expose their creator, so retirement matches by exact handler NAME from the verified known-history list — unrelated/notification handlers are never touched.',
    };
  }

  /**
   * Safe two-batch/day migration. Default REFUSES to retire anything and
   * reports cadenceComplete:false — legacy main 06/16 + logGistdaData 08/20
   * would otherwise run 4 history batches/day. Retirement happens only when
   * opts.verifiedHistoryOnly === true (source-level verification that live
   * main()/logGistdaData() are history-only — done against the live pull),
   * and even then the result reports cadenceComplete:false if any legacy
   * history trigger survived (e.g., recreated concurrently).
   */
  function installAndMigrate(opts) {
    opts = opts || {};
    var before = backupTriggerMetadata('pre');
    var ownedAfter = installTriggers(); /* rebuilds OWNED triggers only */
    var retired = [];
    var refusal = null;
    if (opts.verifiedHistoryOnly === true) {
      ScriptApp.getProjectTriggers().forEach(function (t) {
        var handler = t.getHandlerFunction();
        if (LEGACY_HISTORY_HANDLERS.indexOf(handler) >= 0) {
          try {
            ScriptApp.deleteTrigger(t);
            retired.push(handler);
          } catch (e) {
            Logger.log('BackendApi migration: delete failed for ' + handler + ' (concurrent change?) — will report incomplete');
          }
        }
      });
    } else {
      refusal = 'verifiedHistoryOnly flag missing — legacy history handlers (main, logGistdaData) retained; cadence is NOT 2/day yet';
    }
    var remainingLegacy = backupTriggerMetadata('post').filter(function (t) {
      return LEGACY_HISTORY_HANDLERS.indexOf(t.handler) >= 0;
    });
    return {
      installed: ownedAfter === 2, ownedTriggerCount: ownedAfter,
      retired: retired, remainingLegacyHistoryTriggers: remainingLegacy,
      cadenceComplete: ownedAfter === 2 && remainingLegacy.length === 0,
      refusalReason: refusal, inventoryBefore: before,
    };
  }

  /* Kept for editor convenience; same safe semantics as installAndMigrate. */
  function applyLegacyMigration(confirm, opts) {
    if (confirm !== true) return { applied: false, reason: 'requires explicit confirm=true' };
    var r = installAndMigrate({ verifiedHistoryOnly: (opts && opts.verifiedHistoryOnly) === true });
    r.applied = true;
    return r;
  }

  /**
   * ONE owner entry point for deployment: creates any missing config tabs
   * (never overwrites), validates config, backs up trigger inventory,
   * installs/verifies exactly two owned BackendApiHistoryBatch_ triggers,
   * then retires the known history-only legacy handlers. Never appends a
   * sample history row. STRICT owner-session guard (no scheduled bypass).
   * Returns a sanitized summary (no trigger ids, tokens, or history data).
   */
  function ownerInitialize() {
    assertTrustedCaller('BackendApiOwnerInitialize_', true);
    var before = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
    setupSheets();
    var cfg = loadConfigSafe();
    if (!cfg.ok) {
      return { ok: false, stage: 'config', reason: cfg.reason, tabsTouched: tabNames(), legacyRetired: [], ownedTriggerCount: ownedTriggerCount() };
    }
    var backup = backupTriggerMetadata('init');
    var ownedAfter = installTriggers();
    var retired = [];
    ScriptApp.getProjectTriggers().forEach(function (t) {
      var handler = t.getHandlerFunction();
      if (LEGACY_HISTORY_HANDLERS.indexOf(handler) >= 0) {
        try { ScriptApp.deleteTrigger(t); retired.push(handler); } catch (e) { /* reported below */ }
      }
    });
    var remaining = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); })
      .filter(function (h) { return LEGACY_HISTORY_HANDLERS.indexOf(h) >= 0; });
    return {
      ok: ownedAfter === 2 && remaining.length === 0,
      stage: 'done',
      activeLocationId: cfg.active.id,
      configVersion: cfg.settings.configVersion,
      morningHour: cfg.settings.morningHour, eveningHour: cfg.settings.eveningHour,
      ownedHandler: OWNED_HISTORY_HANDLER,
      ownedTriggerCount: ownedAfter,
      legacyRetired: retired,
      legacyRemaining: remaining,
      cadenceComplete: ownedAfter === 2 && remaining.length === 0,
      tabsTouched: tabNames(),
      inventoryBackedUp: backup.length,
    };
  }

  /** Read-only owner verification summary (counts only, no ids/tokens/rows). */
  function ownerVerify() {
    assertTrustedCaller('BackendApiOwnerVerify_', true);
    var cfg = loadConfigSafe();
    var handlers = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
    var historySheet = openSpreadsheet().getSheetByName(TAB_HISTORY);
    return {
      ok: cfg.ok,
      activeLocationId: cfg.ok ? cfg.active.id : null,
      configVersion: cfg.ok ? cfg.settings.configVersion : null,
      tabs: tabNames(),
      historyRowCount: historySheet ? Math.max(0, historySheet.getLastRow() - 1) : 0,
      ownedTriggerCount: handlers.filter(function (h) { return h === OWNED_HISTORY_HANDLER; }).length,
      legacyHistoryTriggers: handlers.filter(function (h) { return LEGACY_HISTORY_HANDLERS.indexOf(h) >= 0; }).length,
      otherHandlers: handlers.filter(function (h) { return h !== OWNED_HISTORY_HANDLER && LEGACY_HISTORY_HANDLERS.indexOf(h) < 0; }).length,
    };
  }

  function tabNames() {
    var names = [];
    SETUP_TABS.forEach(function (def) {
      if (openSpreadsheet().getSheetByName(def.name)) names.push(def.name);
    });
    return names;
  }

  return {
    SCHEMA: SCHEMA, PM_UNIT: PM_UNIT, FRESH_MS: FRESH_MS, FUTURE_MS: FUTURE_MS,
    SLOT_JITTER_H: SLOT_JITTER_H,
    PM_TTL_S: PM_TTL_S, WX_TTL_S: WX_TTL_S, LASTGOOD_TTL_S: LASTGOOD_TTL_S,
    COOLDOWN_DEFAULT_S: COOLDOWN_DEFAULT_S, COOLDOWN_MIN_S: COOLDOWN_MIN_S, COOLDOWN_MAX_S: COOLDOWN_MAX_S,
    canonicalLocationLabel: canonicalLocationLabel,
    parseThaiDateTime: parseThaiDateTime, gistdaObservedMs: gistdaObservedMs, band: band, freshness: freshness,
    loadConfig: loadConfigSafe, buildChannels: buildChannels, getCachedPm: function(cfg,now){return stripInternal(getChannelCached(cfg,'pm25',channelPm25,pm25Base,PM_TTL_S,now,false));},
    doGet: doGet, historyBatch: historyBatch, hourlyHistory: hourlyHistory, installHourlyTrigger: installHourlyTrigger, gistdaPayload: gistdaPayload, setupSheets: setupSheets,
    refreshCharts: refreshCharts, ensureChartsTab: ensureChartsTab,
    CHART_WINDOW_DAYS: CHART_WINDOW_DAYS,
    installTriggers: installTriggers,
    planLegacyMigration: planLegacyMigration,
    installAndMigrate: installAndMigrate,
    applyLegacyMigration: applyLegacyMigration,
    ownerInitialize: ownerInitialize,
    ownerVerify: ownerVerify,
    isOwnerSession: isOwnerSession,
    assertTrustedCaller: assertTrustedCaller,
    locationFingerprint: locationFingerprint,
    TABS: { settings: TAB_SETTINGS, locations: TAB_LOCATIONS, sources: TAB_SOURCES, history: TAB_HISTORY, charts: TAB_CHARTS },
  };
})();

/* Entry points. EVERYTHING mutating or inventory-sensitive ends with a
 * trailing underscore so google.script.run can never reach it from the
 * public legacy UI (official Apps Script private-function rule). There is NO
 * public mutator and no public inventory reader. The only public read paths
 * remain the routed doGet (HTTP) and the legacy UI's own getWidgetData. */
function BackendApiHistoryBatch_() {
  var result, pmError=null;
  try { result=BackendApi.historyBatch(); } catch(e) { pmError=e; }
  /* Reuse the existing two daily owner triggers; a failed PM history fetch
     must not prevent water history. A failed water fetch never breaks PM history. */
  try { WaterHistory.sync(); }
  catch (e) { Logger.log('Water history sync unavailable: '+String(e.message).slice(0,120)); }
  if(pmError)throw pmError;
  return result;
}
function BackendApiOwnerInitialize_() { return BackendApi.ownerInitialize(); }
function BackendApiOwnerVerify_() { return BackendApi.ownerVerify(); }
/* Private test/editor helpers (read-only, still not client-callable). */
function BackendApi_band_(v) { return BackendApi.band(v); }
function BackendApi_parseThaiDateTime_(dt) { return BackendApi.parseThaiDateTime(dt); }
/* Mutating private wrappers also carry a strict owner guard (defense in depth:
 * underscore already blocks google.script.run; the guard blocks any other
 * top-level-caller path that might ever appear). */
function BackendApiSetupSheets_() { BackendApi.assertTrustedCaller('BackendApiSetupSheets_', true); return BackendApi.setupSheets(); }
function BackendApiInstallTriggers_() { BackendApi.assertTrustedCaller('BackendApiInstallTriggers_', true); return BackendApi.installTriggers(); }
function BackendApiPlanLegacyMigration_() { BackendApi.assertTrustedCaller('BackendApiPlanLegacyMigration_', true); return BackendApi.planLegacyMigration(); }
function BackendApiInstallAndMigrate_(opts) { BackendApi.assertTrustedCaller('BackendApiInstallAndMigrate_', true); return BackendApi.installAndMigrate(opts); }

/* ---------- VISIBLE owner entry points (usability fix 2026-10-17) ----------
 * The Apps Script editor Run dropdown HIDES trailing-underscore functions,
 * so the owner could not select BackendApiOwnerInitialize_. These no-arg,
 * clearly-named wrappers are selectable in the editor file BackendApi.js.
 * They ARE reachable via google.script.run while the legacy UI is public —
 * by design: the STRICT owner guard (Session active non-empty AND equal to
 * effective) executes FIRST; anonymous callers and spoofed arguments are
 * refused before any write, tab creation, or inventory access. No token,
 * Sheet id, raw history, trigger id, or email ever appears in logs/returns. */
function setupLedBackend() {
  BackendApi.assertTrustedCaller('BackendApiOwnerInitialize_', true);
  var r = BackendApi.ownerInitialize();
  var log = {
    ok: r.ok, stage: r.stage, cadenceComplete: r.cadenceComplete,
    ownedTriggerCount: r.ownedTriggerCount,
    legacyRetiredCount: (r.legacyRetired || []).length,
    legacyRemainingCount: (r.legacyRemaining || []).length,
    activeLocationId: r.activeLocationId || null,
    slots: (r.morningHour != null ? r.morningHour + '/' + r.eveningHour : null),
  };
  try { Logger.log('setupLedBackend: ' + JSON.stringify(log)); } catch (e) { /* logging must never break init */ }
  return r;
}
function verifyLedBackend() {
  BackendApi.assertTrustedCaller('BackendApiOwnerVerify_', true);
  var v = BackendApi.ownerVerify();
  try { Logger.log('verifyLedBackend: ' + JSON.stringify(v)); } catch (e) { /* noop */ }
  return v;
}

/* Charts dashboard owner entry (2026-10-18 charts wave): rebuilds the
 * embedded line charts on the 'Charts' tab from History_Batch (last
 * CHART_WINDOW_DAYS days, active location). Strict owner guard first —
 * anonymous callers and spoofed arguments are refused before any tab
 * creation or chart mutation. The returned summary and editor log carry
 * titles/counts only: no emails, Sheet ids, tokens, or raw history. */
function BackendApiRefreshLedCharts_() {
  BackendApi.assertTrustedCaller('BackendApiRefreshLedCharts_', true);
  return BackendApi.refreshCharts();
}
function refreshLedCharts() {
  BackendApi.assertTrustedCaller('BackendApiRefreshLedCharts_', true);
  var r = BackendApi.refreshCharts();
  var log = {
    ok: r.ok, tab: r.tab, created: r.created,
    charts: r.charts.length, removed: r.removed, skipped: r.skipped.length,
  };
  try { Logger.log('refreshLedCharts: ' + JSON.stringify(log)); } catch (e) { /* logging must never break refresh */ }
  return r;
}

/* Root-cause diagnostics (2026-10-17 22:50 incident): Session.getActiveUser
 * email is BLANK unless the userinfo.email scope is actually granted — the
 * shipped manifest relied on automatic scope detection and a legit
 * owner-editor run presented active==='' with effective===owner, so the
 * strict equality guard correctly refused. This READ-ONLY, visible function
 * reports ONLY BOOLEANS about the identity predicates so the operator can
 * see exactly which one fails. It never prints emails/ids, performs zero
 * writes, and NEVER infers trust from effectiveUser alone. */
function ledOwnerDiagnostics() {
  var a = '', e = '';
  try { a = String(Session.getActiveUser().getEmail() || '').toLowerCase(); } catch (x) { a = ''; }
  try { e = String(Session.getEffectiveUser().getEmail() || '').toLowerCase(); } catch (x) { e = ''; }
  var sched = false;
  try {
    var t = ScriptApp.getScriptTrigger();
    sched = !!(t && t.getHandlerFunction && t.getHandlerFunction());
  } catch (x) { sched = false; }
  var d = {
    activeEmailPresent: a !== '',
    effectiveEmailPresent: e !== '',
    activeEqualsEffective: a !== '' && e !== '' && a === e,
    scheduledContext: sched,
    trusted: (a !== '' && e !== '' && a === e),
  };
  try { Logger.log('ledOwnerDiagnostics: ' + JSON.stringify(d)); } catch (x) { /* noop */ }
  return d;
}

function BackendApiPm25Hourly_(event) {
  var result=BackendApi.hourlyHistory(event);
  try { BackendApiSnapshotHourly_(event); } catch (e) { Logger.log('Snapshot collector failed: '+String(e).slice(0,160)); }
  return result;
}
function BackendApiInstallPm25Hourly_() { return BackendApi.installHourlyTrigger(); }
/* Visible editor entry points; underlying functions enforce owner identity. */
function installPm25Hourly() { return BackendApi.installHourlyTrigger(); }
function runPm25HourlyNow() { return BackendApi.hourlyHistory(); }
