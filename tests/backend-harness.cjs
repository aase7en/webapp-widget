/* Shared VM harness: loads apps-script/BackendApi.gs (and optionally the
 * sanitized repo Code.gs) into a vm context with mocked Apps Script services.
 * Backend-owned; no Google/network/Sheet access. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC_BACKEND = path.join(__dirname, '..', 'apps-script', 'BackendApi.gs');
const SRC_CODE = path.join(__dirname, '..', 'apps-script', 'Code.gs');

/* Fixed test clock: 2026-10-17T07:00+07:00 == 2026-10-17T00:00Z */
const NOW_MS = Date.UTC(2026, 9, 17, 0, 0, 0);

/* REAL GISTDA response shape for ap_idn=1414 (amphoe-level): 11 tambon
 * rows, target NOT first, row-level ISO dt, weekday-prefixed datetimeThai.
 * Values are SYNTHETIC; only structure matches the live API. */
function gistdaBody(opts = {}) {
  const mk = (tb_tn, tb_en, tb_idn, pm25) => ({ tb_tn, tb_en, tb_idn, pm25, pm25Avg24hr: pm25 - 2, dt: opts.dt != null ? opts.dt : '2026-10-17T06:05:00.000Z' /* Bangkok wall 06:05, fake Z */ });
  const others = opts.others || [
    mk('คานหาม', 'Khan Ham', 141401, 42.1),
    mk('ธนู', 'Tha-nu', 141410, 42.0),
    mk('บ้านช้าง', 'Ban Chang', 141402, 41.8),
    mk('ไผ่จำศีล', 'Phai Cham Sin', 141403, 40.2),
    mk('ที่ว่าง', 'Thi Wang', 141404, 39.7),
    mk('บางเดี่ยว', 'Bang Diao', 141405, 38.9),
    mk('บ้านแถว', 'Ban Thaeo', 141406, 38.0),
    mk('สำโรง', 'Sam Rong', 141407, 37.4),
    mk('หนองน้อย', 'Nong Noi', 141408, 36.8),
    mk('บ้านเลน', 'Ban Len', 141409, 35.5),
  ];
  const target = Object.assign(mk('อุทัย', 'U Thai', 141411, opts.pm25 != null ? opts.pm25 : 20.9), opts.target || {});
  const data = opts.data != null ? opts.data : [...others.slice(0, 4), target, ...others.slice(4)];
  return JSON.stringify({
    status: 200,
    datetimeThai: opts.datetimeThai || { dateThai: 'วันเสาร์ที่ 17 ตุลาคม 2569', timeThai: 'เวลา 06:05 น.' },
    datetimeEng: 'Saturday, October 17, 2026 06:05 AM',
    errMsg: '',
    data,
  });
}
function openMeteoBody(opts = {}) {
  return JSON.stringify(Object.assign({
    timezone: 'Asia/Bangkok',
    latitude: 14.36147, longitude: 100.64424,
    current_units: { temperature_2m: '°C', relative_humidity_2m: '%' },
    current: { time: '2026-10-17T06:30', temperature_2m: 29.4, relative_humidity_2m: 78, weather_code: 80 },
    daily_units: { temperature_2m_max: '°C', temperature_2m_min: '°C', precipitation_probability_max: '%' },
    daily: { time: ['2026-10-17'], temperature_2m_max: [33.1], temperature_2m_min: [25.2], precipitation_probability_max: [55] },
  }, opts));
}

function defaultTabs() {
  return {
    Settings: [
      ['key', 'value'],
      ['active_location_id', 'uthai'],
      ['history_morning_hour', '6'],
      ['history_evening_hour', '16'],
      ['timezone', 'Asia/Bangkok'],
      ['config_version', '1'],
    ],
    Locations: [
      ['id', 'label', 'enabled', 'lat', 'lon', 'pm_provider', 'pm_location_id', 'weather_provider', 'water_provider', 'water_station_id', 'water_datum', 'official_bank_crest_m', 'water_thresholds'],
      ['uthai', 'ต.อุทัย อ.พระนครศรีอยุธยา', 'TRUE', 14.36147, 100.64424, 'gistda', '1414', 'open-meteo', '', '', '', '', ''],
    ],
    API_Sources: [
      ['provider', 'agency', 'service', 'source_url', 'docs_url', 'terms_url', 'auth_method', 'units', 'datum', 'credential_property', 'notes'],
      ['gistda', 'GISTDA', 'getPm25byTambon', 'https://pm25.gistda.or.th/', 'https://pm25.gistda.or.th/', 'https://pm25.gistda.or.th/', 'none (public)', 'µg/m³', '', '', ''],
      ['open-meteo', 'Open-Meteo', 'forecast v1', 'https://api.open-meteo.com/', 'https://open-meteo.com/en/docs', 'https://open-meteo.com/en/terms', 'none (keyless)', '°C, %, WMO code', '', '', ''],
    ],
    History_Batch: [
      ['batch_id', 'batch_date', 'slot', 'location_id', 'lat', 'lon', 'pm25_value', 'pm25_observed_at', 'pm25_status', 'pm25_provider', 'pm25_area_id', 'wx_temp_c', 'wx_rh_pct', 'wx_code', 'wx_observed_at', 'wx_status', 'wx_provider', 'water_status', 'water_station_id', 'water_datum', 'created_at'],
    ],
  };
}
function defaultFetchQueue() {
  return [{ body: gistdaBody() }, { body: openMeteoBody() }];
}

function makeContext(opts = {}) {
  const calls = {
    fetches: [], appends: [], deleteRows: [], rangeSets: [], propSets: [],
    triggerCreates: [], triggerDeletes: [], sheetInserts: [], logs: [], threw: [],
    chartInserts: [], chartRemoves: [], chartUpdates: [],
  };
  let mockNow = opts.now != null ? opts.now : NOW_MS;
  class CtxDate extends Date {
    constructor(...a) { if (a.length === 0) super(mockNow); else super(...a); }
    static now() { return mockNow; }
  }
  const store = new Map();
  const cache = {
    get(k) { const e = store.get(k); return e && e.exp > mockNow ? e.v : null; },
    put(k, v, s) { store.set(k, { v, exp: mockNow + s * 1000 }); },
    remove(k) { store.delete(k); },
  };
  /* holdLock: simulate another execution holding the script lock */
  let held = opts.holdLock === true;
  const lock = {
    tryLock() { if (held) return false; held = true; return true; },
    releaseLock() { held = false; },
    hasLock: () => held,
  };
  const tabs = new Map(Object.entries(opts.tabs || defaultTabs()));
  /* Embedded charts, mirroring the official Sheets API surface used by
   * BackendApi: sheet.newChart() -> builder(asLineChart/addRange/setOption/
   * setPosition/build), sheet.insertChart/getCharts/removeChart/updateChart,
   * chart.getOptions/getRanges/getContainerInfo/getChartId/modify(). */
  const sheetCharts = new Map();
  let nextChartId = 1000;
  function makeChart(state) {
    const ch = {
      _id: -1,
      _meta: state,
      getChartId() { return ch._id; },
      getOptions() { return Object.assign({}, state.options); },
      getRanges() { return state.ranges.slice(); },
      getContainerInfo() {
        return {
          getAnchorRow: () => state.anchor.row,
          getAnchorColumn: () => state.anchor.col,
          getOffsetX: () => state.anchor.offX,
          getOffsetY: () => state.anchor.offY,
        };
      },
      modify() { return newChartBuilder(state.sheetName, ch); },
    };
    return ch;
  }
  function newChartBuilder(sheetName, fromChart) {
    const st = fromChart
      ? { sheetName, type: fromChart._meta.type, ranges: fromChart._meta.ranges.slice(),
          options: Object.assign({}, fromChart._meta.options), anchor: Object.assign({}, fromChart._meta.anchor) }
      : { sheetName, type: null, ranges: [], options: {}, anchor: { row: 1, col: 1, offX: 0, offY: 0 } };
    const b = {
      asLineChart() { st.type = 'LINE'; return b; },
      asAreaChart() { st.type = 'AREA'; return b; },
      setChartType(t) { st.type = t; return b; },
      addRange(rg) { st.ranges.push(rg); return b; },
      removeRange(rg) { const i = st.ranges.indexOf(rg); if (i >= 0) st.ranges.splice(i, 1); return b; },
      clearRanges() { st.ranges = []; return b; },
      setOption(k, v) { st.options[k] = v; return b; },
      setPosition(r, c, ox, oy) { st.anchor = { row: r, col: c, offX: ox, offY: oy }; return b; },
      build() { return makeChart(st); },
    };
    return b;
  }
  function sheetFor(name) {
    const rows = tabs.get(name);
    if (!rows) return null;
    if (!sheetCharts.has(name)) sheetCharts.set(name, []);
    const charts = sheetCharts.get(name);
    return {
      getName: () => name,
      getLastRow: () => rows.length,
      getRange(r, c, nr = 1, nc = 1) {
        const out = [];
        for (let i = 0; i < nr; i++) {
          const row = rows[r - 1 + i] || [];
          const seg = [];
          for (let j = 0; j < nc; j++) seg.push(row[c - 1 + j] !== undefined ? row[c - 1 + j] : '');
          out.push(seg);
        }
        return {
          sheetName: name, r, c, nr, nc,
          getValues: () => out,
          setValues(vals) {
            calls.rangeSets.push({ sheet: name, r, c });
            for (let i = 0; i < vals.length; i++) {
              rows[r - 1 + i] = rows[r - 1 + i] || [];
              for (let j = 0; j < vals[i].length; j++) rows[r - 1 + i][c - 1 + j] = vals[i][j];
            }
          },
          setNumberFormat() { return this; },
        };
      },
      appendRow(row) { calls.appends.push({ sheet: name, row: row.slice() }); rows.push(row.slice()); },
      deleteRows(start, count = 1) { calls.deleteRows.push(name); rows.splice(start - 1, count); },
      getDataRange() { if (opts.readErrorSheets && opts.readErrorSheets.includes(name)) throw new Error("mock sheet read failure"); const w = Math.max(1, ...rows.map(r => r.length)); return this.getRange(1, 1, Math.max(1, rows.length), w); },
      newChart: () => newChartBuilder(name),
      insertChart(chart) {
        chart._id = nextChartId++;
        charts.push(chart);
        calls.chartInserts.push({ sheet: name, title: chart.getOptions().title });
        return chart;
      },
      getCharts: () => charts.slice(),
      removeChart(chart) {
        const i = charts.indexOf(chart);
        if (i >= 0) { charts.splice(i, 1); calls.chartRemoves.push({ sheet: name, title: chart.getOptions().title }); }
      },
      updateChart(chart) {
        const i = charts.findIndex(c => c.getChartId() === chart.getChartId());
        if (i >= 0) { charts[i] = chart; calls.chartUpdates.push({ sheet: name, title: chart.getOptions().title }); }
      },
    };
  }
  const ss = {
    getSheetByName: sheetFor,
    insertSheet(name) {
      calls.sheetInserts.push(name);
      if (opts.insertSheetError && opts.insertSheetError.includes(name)) throw new Error('mock insertSheet failure: ' + name);
      if (!tabs.has(name)) tabs.set(name, []);
      return sheetFor(name);
    },
  };
  const props = new Map(opts.props || []);
  const scriptProps = {
    getProperty: k => (props.has(k) ? props.get(k) : null),
    setProperty: (k, v) => { calls.propSets.push(k); props.set(k, v); },
    deleteProperty: k => props.delete(k),
  };
  let triggers = (opts.triggers || []).slice();
  const session = Object.assign({ active: 'a.richbusinessman@gmail.com', effective: 'a.richbusinessman@gmail.com' }, opts.session || {});
  const scriptTriggerHandler = opts.scriptTrigger || null;
  function builder(fn) {
    const t = { handler: fn, hour: null, days: null };
    const b = {
      timeBased() { return b; }, atHour(h) { t.hour = h; return b; }, everyDays(d) { t.days = d; return b; }, everyHours(h) { t.hours = h; return b; },
      create() { calls.triggerCreates.push(t); triggers.push(t); return t; },
    };
    return b;
  }
  const scriptApp = {
    getProjectTriggers: () => triggers.map(t => ({ getHandlerFunction: () => t.handler, getUniqueId: () => t.id || 'test-trigger-id', _t: t })),
    getScriptTrigger: () => (scriptTriggerHandler ? { getHandlerFunction: () => scriptTriggerHandler } : null),
    newTrigger: fn => builder(fn),
    deleteTrigger: (trig) => { calls.triggerDeletes.push(trig.getHandlerFunction()); triggers = triggers.filter(t => t !== trig._t); },
  };
  const queue = (opts.fetchQueue || []).slice();
  const urlFetch = {
    fetch(url) {
      calls.fetches.push(String(url));
      const next = queue.shift();
      if (!next) throw new Error('no fixture');
      if (next.error) throw next.error;
      const code = next.code != null ? next.code : 200;
      return {
        getContentText: () => next.body != null ? next.body : '',
        getResponseCode: () => code,
        getHeaders: () => next.headers || {},
      };
    },
  };
  let outputs = [];
  const contentService = {
    MimeType: { JSON: 'JSON', JAVASCRIPT: 'JAVASCRIPT' },
    createTextOutput(text) { const o = { text, mime: null, setMimeType(m) { this.mime = m; return this; } }; outputs.push(o); return o; },
  };
  const htmlService = {
    XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' },
    createTemplateFromFile: () => ({ evaluate: () => { const o = { legacyHtml: true, setTitle() { return this; }, setXFrameOptionsMode() { return this; } }; return o; } }),
  };
  const ctx = {
    Date: CtxDate, JSON, Math, Number, String, Array, Object, RegExp, Error, TypeError, Infinity, NaN,
    isFinite, isNaN, parseInt, parseFloat, encodeURIComponent,
    CacheService: { getScriptCache: () => cache },
    LockService: { getScriptLock: () => lock },
    SpreadsheetApp: { openById: () => ss },
    PropertiesService: { getScriptProperties: () => scriptProps },
    ScriptApp: scriptApp,
    Session: {
      getActiveUser: () => ({ getEmail: () => session.active }),
      getEffectiveUser: () => ({ getEmail: () => session.effective }),
    },
    UrlFetchApp: urlFetch,
    ContentService: contentService,
    HtmlService: htmlService,
    Utilities: { sleep() {}, formatDate: d => d.toISOString() },
    Logger: { log: (...a) => calls.logs.push(a.join(' ')) },
    console: { log() {} },
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  try {
    if (opts.loadCodeGs !== false && fs.existsSync(SRC_CODE)) vm.runInContext(fs.readFileSync(SRC_CODE, 'utf8'), ctx, { filename: 'Code.gs' });
    if (fs.existsSync(SRC_BACKEND)) vm.runInContext(fs.readFileSync(SRC_BACKEND, 'utf8'), ctx, { filename: 'BackendApi.gs' });
  } catch (e) { calls.threw.push(String(e && e.message)); }
  return {
    ctx, calls, tabs, cacheStore: store,
    sheet: sheetFor, charts: name => (sheetCharts.get(name) || []).slice(),
    outputs: () => outputs, outputsReset: () => { outputs = []; },
    setNow: ms => { mockNow = ms; },
  };
}

/* Calls the REAL legacy doGet hook (Code.gs) so tests exercise the shipped routing. */
function doGet(h, params) { return h.ctx.doGet({ parameter: params }); }

module.exports = { makeContext, doGet, defaultTabs, defaultFetchQueue, gistdaBody, openMeteoBody, NOW_MS, SRC_BACKEND, SRC_CODE };
