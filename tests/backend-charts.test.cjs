/* Backend charts dashboard contract tests (2026-10-18 charts wave) — RED-first
 * suite pinning: idempotent 'Charts' tab creation by setup/refresh, Sheets
 * EMBEDDED line charts (official EmbeddedChartBuilder surface only) fed from
 * History_Batch BY HEADER NAME with a 30-day window, gaps preserved (no zero
 * fabrication, zero History_Batch writes), marker-based idempotent refresh
 * (3 consecutive runs, no duplicates), water chart only when real numeric
 * water data exists, doGet zero chart mutations, strict owner guard on
 * refreshLedCharts, and scheduled-batch rebuild + failure isolation.
 * Backend-owned; nothing here calls Google/Sheets/live. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { makeContext, doGet, defaultTabs, defaultFetchQueue, NOW_MS } = require('./backend-harness.cjs');

const SRC_BACKEND = require('path').join(__dirname, '..', 'apps-script', 'BackendApi.gs');
const MARKER = ' [อัตโนมัติ]';
const T_PM = 'PM2.5 (µg/m³) ย้อนหลัง 30 วัน';
const T_TEMP = 'อุณหภูมิ (°C) ย้อนหลัง 30 วัน';
const T_HUM = 'ความชื้นสัมพัทธ์ (%) ย้อนหลัง 30 วัน';
const T_RAIN = 'โอกาสฝนวันนี้ (%) ย้อนหลัง 30 วัน';
const T_WATER = 'ระดับน้ำหน้า รพ. (ม.) ย้อนหลัง 30 วัน';
/* production History_Batch header (22 cols incl. pm25_tambon_name) */
const HIST_HEADER = ['batch_id', 'batch_date', 'slot', 'location_id', 'lat', 'lon', 'pm25_value',
  'pm25_observed_at', 'pm25_status', 'pm25_provider', 'pm25_area_id', 'pm25_tambon_name',
  'wx_temp_c', 'wx_rh_pct', 'wx_code', 'wx_observed_at', 'wx_status', 'wx_provider',
  'water_status', 'water_station_id', 'water_datum', 'created_at'];
function histRow(o = {}) {
  const r = new Array(HIST_HEADER.length).fill('');
  r[0] = o.batchId != null ? o.batchId : o.date + ':' + (o.slot || 'morning');
  r[1] = o.date; r[2] = o.slot || 'morning'; r[3] = o.loc || 'uthai';
  if (o.pm != null) r[6] = o.pm;
  if (o.pmObs != null) r[7] = o.pmObs;
  r[8] = o.pmStatus || (o.pm != null ? 'ok' : 'missing');
  if (o.temp != null) r[12] = o.temp;
  if (o.rh != null) r[13] = o.rh;
  if (o.code != null) r[14] = o.code;
  return r;
}
/* NOW_MS = 2026-10-17T07:00+07 -> 30d window cutoff date = 2026-09-17 */
function tabsWithHistory(rows, extra = {}) {
  const t = defaultTabs();
  t.History_Batch = [HIST_HEADER.slice(), ...rows];
  return Object.assign(t, extra);
}
const IN_WINDOW = [
  histRow({ date: '2026-09-10', pm: 55, temp: 31, rh: 70 }),          /* outside 30d window */
  histRow({ date: '2026-09-18', pm: 40.5, temp: 30.1, rh: 72 }),      /* first in window (sheet row 3) */
  histRow({ date: '2026-10-01', pm: null, temp: null, rh: 80 }),      /* missing values must stay gaps */
  histRow({ date: '2026-10-16', pm: 61.2, temp: 28.9, rh: 77, slot: 'evening' }),
];
function refresh(h) { return h.ctx.refreshLedCharts(); }
function titles(h) { return h.charts('Charts').map(c => c.getOptions().title); }
function anchorPairs(h) {
  return h.charts('Charts').map(c => {
    const ci = c.getContainerInfo();
    return [ci.getAnchorRow(), ci.getAnchorColumn()];
  });
}

/* ---------- module surface ---------- */

test('exports chart constants: Charts tab, 30-day window, channel palette', () => {
  const h = makeContext({ fetchQueue: [] });
  const B = h.ctx.BackendApi;
  assert.equal(B.TABS.charts, 'Charts');
  assert.equal(B.CHART_WINDOW_DAYS, 30);
  assert.equal(B.PM_TTL_S, 1800, 'prior wave exports intact');
});

test('refreshLedCharts is a visible no-arg wrapper with the strict owner guard', () => {
  const src = fs.readFileSync(SRC_BACKEND, 'utf8');
  assert.ok(/^function refreshLedCharts\(\) \{/m.test(src), 'visible wrapper missing');
  assert.ok(src.includes("BackendApi.assertTrustedCaller('BackendApiRefreshLedCharts_', true)"), 'must strict-guard');
});

test('anonymous refreshLedCharts refused BEFORE any write (surface rule)', () => {
  const h = makeContext({ session: { active: '', effective: 'a.richbusinessman@gmail.com' }, tabs: tabsWithHistory(IN_WINDOW.slice(1)), fetchQueue: [] });
  assert.throws(() => refresh(h), /not the trusted owner/);
  assert.equal(h.calls.sheetInserts.length + h.calls.chartInserts.length + h.calls.chartRemoves.length, 0, 'zero writes');
});

/* ---------- empty / zero-row history ---------- */

test('zero-row history: tab created, no charts, no crash', () => {
  const h = makeContext({ fetchQueue: [] });
  const r = refresh(h);
  assert.equal(r.ok, true);
  assert.equal(r.tab, 'Charts');
  assert.equal(r.charts.length, 0);
  assert.ok(h.calls.sheetInserts.includes('Charts'));
  assert.equal(h.charts('Charts').length, 0);
});

test('Charts tab creation is idempotent (note cell written once)', () => {
  const h = makeContext({ tabs: tabsWithHistory(IN_WINDOW.slice(1)), fetchQueue: [] });
  refresh(h); refresh(h);
  assert.equal(h.calls.sheetInserts.filter(n => n === 'Charts').length, 1);
  assert.equal(h.calls.rangeSets.filter(s => s.sheet === 'Charts').length, 1, 'A1 note written only at creation');
});

/* ---------- chart set from real schema ---------- */

test('creates PM/temp/humidity line charts with Thai titles + marker', () => {
  const h = makeContext({ tabs: tabsWithHistory(IN_WINDOW), fetchQueue: [] });
  const r = refresh(h);
  assert.equal(r.charts.length, 3);
  const t = titles(h);
  assert.ok(t.includes(T_PM + MARKER));
  assert.ok(t.includes(T_TEMP + MARKER));
  assert.ok(t.includes(T_HUM + MARKER));
  for (const c of h.charts('Charts')) assert.equal(c._meta.type, 'LINE');
});

test('line chart options: smooth curveType function, small points, palette, legend, axes, gridlines', () => {
  const h = makeContext({ tabs: tabsWithHistory(IN_WINDOW), fetchQueue: [] });
  refresh(h);
  const byColor = {};
  for (const c of h.charts('Charts')) byColor[c.getOptions().colors[0]] = c.getOptions();
  const pm = byColor['#FF8C00'], temp = byColor['#E53935'], hum = byColor['#42A5F5'];
  assert.ok(pm && temp && hum, 'palette must match widget severity colors');
  for (const o of [pm, temp, hum]) {
    assert.equal(o.curveType, 'function', 'smooth curve');
    assert.ok(o.pointSize >= 2 && o.pointSize <= 6, 'small pointSize');
    assert.equal(o.legend.position, 'bottom');
    assert.equal(o.hAxis.format, 'd MMM');
    assert.equal(o.vAxis.format, 'decimal');
    assert.ok(typeof o.hAxis.gridlines.color === 'string' && typeof o.vAxis.gridlines.color === 'string', 'subtle gridlines');
    assert.equal(o.width, 600); assert.equal(o.height, 300);
  }
});

test('ranges: correct columns BY HEADER NAME + exact 30-day window boundaries', () => {
  const h = makeContext({ tabs: tabsWithHistory(IN_WINDOW), fetchQueue: [] });
  refresh(h);
  const pmCol = HIST_HEADER.indexOf('pm25_value') + 1;
  const tempCol = HIST_HEADER.indexOf('wx_temp_c') + 1;
  const rhCol = HIST_HEADER.indexOf('wx_rh_pct') + 1;
  const dateCol = HIST_HEADER.indexOf('batch_date') + 1;
  for (const c of h.charts('Charts')) {
    const rs = c.getRanges().map(r => ({ sheet: r.sheetName, row: r.r, col: r.c, nr: r.nr, nc: r.nc }));
    assert.equal(rs.length, 2, 'timestamp range + value range');
    assert.ok(rs.every(r => r.sheet === 'History_Batch'));
    /* window starts at the FIRST in-window row (sheet row 3) through the last row (5) */
    assert.deepEqual(rs[0], { sheet: 'History_Batch', row: 3, col: dateCol, nr: 3, nc: 1 });
    assert.equal(rs[1].row, 3); assert.equal(rs[1].nr, 3); assert.equal(rs[1].nc, 1);
  }
  const cols = h.charts('Charts').map(c => c.getRanges()[1].c).sort();
  assert.deepEqual(cols, [pmCol, tempCol, rhCol].sort(), 'value columns resolved by name');
});

test('missing values remain gaps: zero writes to History_Batch, null never becomes 0', () => {
  const h = makeContext({ tabs: tabsWithHistory(IN_WINDOW), fetchQueue: [] });
  refresh(h);
  assert.equal(h.calls.rangeSets.filter(s => s.sheet === 'History_Batch').length, 0, 'charts must never rewrite history');
  assert.equal(h.calls.appends.length, 0);
  const rows = h.tabs.get('History_Batch');
  assert.ok(rows[3][6] === null || rows[3][6] === '', 'missing pm cell stays empty (gap)'); /* sheet row 4 = fixture row 3 */
  assert.notEqual(rows[3][6], 0, 'never zero-fabricated');
});

/* ---------- idempotency / marker bookkeeping ---------- */

test('three consecutive refreshes: no duplicates, stale owned charts replaced', () => {
  const h = makeContext({ tabs: tabsWithHistory(IN_WINDOW), fetchQueue: [] });
  refresh(h);
  const s = h.sheet('Charts');
  /* simulate a stale owned chart from an older refresh plus an untouched user chart */
  s.insertChart(s.newChart().asLineChart().setOption('title', T_PM + ' (เก่า)' + MARKER).build());
  s.insertChart(s.newChart().asLineChart().setOption('title', 'ผู้ใช้สร้างเอง').build());
  const r2 = refresh(h);
  const r3 = refresh(h);
  assert.equal(r3.charts.length, 3);
  const owned = h.charts('Charts').filter(c => String(c.getOptions().title).indexOf(MARKER) >= 0);
  assert.equal(owned.length, 3, 'no owned duplicates after 3 refreshes');
  assert.ok(r2.removed >= 4, 'stale owned charts (incl. planted one) removed');
  const t = titles(h);
  assert.ok(!t.includes(T_PM + ' (เก่า)' + MARKER), 'stale variant gone');
  assert.ok(t.includes('ผู้ใช้สร้างเอง'), 'user chart without marker is NEVER touched');
});

test('anchor grid: 2-column layout with non-overlapping chart rectangles', () => {
  const h = makeContext({ tabs: tabsWithHistory(IN_WINDOW), fetchQueue: [] });
  refresh(h);
  assert.deepEqual(anchorPairs(h).sort((a, b) => a[0] - b[0] || a[1] - b[1]), [[2, 1], [2, 8], [18, 1]]);
  /* px rectangles: col-1)*100 x width, (row-1)*21 x height — pairwise overlap must be 0 */
  const rects = h.charts('Charts').map(c => {
    const ci = c.getContainerInfo(), o = c.getOptions();
    return { x: (ci.getAnchorColumn() - 1) * 100, y: (ci.getAnchorRow() - 1) * 21, w: o.width, h: o.height };
  });
  for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
    const a = rects[i], b = rects[j];
    const ox = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
    const oy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    assert.equal(ox * oy, 0, 'charts ' + i + ',' + j + ' overlap');
  }
});

/* ---------- water & rain (columns resolve only when real data exists) ---------- */

test('water chart absent without water data (no column = no fabricated series)', () => {
  const h = makeContext({ tabs: tabsWithHistory(IN_WINDOW), fetchQueue: [] });
  const r = refresh(h);
  assert.equal(r.charts.length, 3);
  assert.ok(!titles(h).some(t => t.includes('ระดับน้ำ')));
  assert.ok(r.skipped.some(s => String(s).includes('water')));
});

test('water chart appears when a water_level_m column carries one numeric value', () => {
  const header = HIST_HEADER.concat(['water_level_m']);
  const rows = IN_WINDOW.map(r => r.concat([null]));
  rows[2][22] = 2.75; /* one verified numeric value inside the window */
  const t = defaultTabs(); t.History_Batch = [header, ...rows];
  const h = makeContext({ tabs: t, fetchQueue: [] });
  const r = refresh(h);
  assert.equal(r.charts.length, 4);
  const wc = h.charts('Charts').find(c => c.getOptions().title.includes('ระดับน้ำ'));
  assert.equal(wc.getOptions().colors[0], '#1565C0');
  assert.equal(wc.getRanges()[1].c, 23, 'water value column by name');
});

test('water column present but all empty in window -> still absent', () => {
  const header = HIST_HEADER.concat(['water_level_m']);
  const rows = IN_WINDOW.map(r => r.concat([null]));
  const t = defaultTabs(); t.History_Batch = [header, ...rows];
  const h = makeContext({ tabs: t, fetchQueue: [] });
  const r = refresh(h);
  assert.equal(r.charts.length, 3);
  assert.ok(r.skipped.some(s => String(s).includes('water')));
});

test('rain chart resolves when wx_rain_pct column exists with values', () => {
  const header = HIST_HEADER.slice(0, 18).concat(['wx_rain_pct'], HIST_HEADER.slice(18));
  const rows = IN_WINDOW.map(r => { const n = r.slice(0, 18).concat([65], r.slice(18)); return n; });
  rows[0][18] = 40;
  const t = defaultTabs(); t.History_Batch = [header, ...rows];
  const h = makeContext({ tabs: t, fetchQueue: [] });
  const r = refresh(h);
  assert.equal(r.charts.length, 4);
  const rc = h.charts('Charts').find(c => c.getOptions().title === T_RAIN + MARKER);
  assert.equal(rc.getOptions().colors[0], '#1E88E5');
});

/* ---------- read route purity ---------- */

test('doGet data route performs ZERO chart mutations and never creates the tab', () => {
  const h = makeContext({ tabs: tabsWithHistory(IN_WINDOW), fetchQueue: defaultFetchQueue() });
  refresh(h);
  const before = h.charts('Charts').map(c => c.getChartId());
  const inserts = h.calls.chartInserts.length, removes = h.calls.chartRemoves.length, sheets = h.calls.sheetInserts.length;
  doGet(h, { action: 'data', v: '1' });
  doGet(h, { action: 'data', v: '1', callback: 'cb' });
  assert.equal(h.calls.chartInserts.length, inserts, 'no chart inserts from reads');
  assert.equal(h.calls.chartRemoves.length, removes, 'no chart removes from reads');
  assert.equal(h.calls.chartUpdates.length, 0);
  assert.equal(h.calls.sheetInserts.length, sheets, 'no tab creation from reads');
  assert.deepEqual(h.charts('Charts').map(c => c.getChartId()), before);
});

/* ---------- scheduled-batch integration ---------- */

test('scheduled history batch lazily creates the tab and rebuilds charts (no owner session)', () => {
  const h = makeContext({
    session: { active: '', effective: 'a.richbusinessman@gmail.com' },
    scriptTrigger: 'BackendApiHistoryBatch_',
    fetchQueue: defaultFetchQueue(),
  });
  h.ctx.BackendApiHistoryBatch_();
  assert.equal(h.calls.appends.filter(a => a.sheet === 'History_Batch').length, 1, 'history row recorded');
  assert.ok(h.calls.sheetInserts.includes('Charts'), 'lazy tab create on first batch');
  const t = titles(h);
  assert.equal(h.charts('Charts').length, 3, 'pm/temp/humidity from the fresh row');
  assert.ok(t.includes(T_PM + MARKER) && t.includes(T_HUM + MARKER));
  assert.ok(t.every(x => !x.includes('ระดับน้ำ')), 'water still absent');
});

test('chart refresh failure NEVER breaks the history batch', () => {
  const h = makeContext({
    scriptTrigger: 'BackendApiHistoryBatch_',
    insertSheetError: ['Charts'],
    fetchQueue: defaultFetchQueue(),
  });
  h.ctx.BackendApiHistoryBatch_(); /* insertSheet('Charts') throws inside chart refresh */
  assert.equal(h.calls.appends.filter(a => a.sheet === 'History_Batch').length, 1, 'history intact');
  assert.ok(h.calls.logs.some(l => l.includes('chart refresh failed')));
});

/* ---------- multi-location honesty ---------- */

test('interleaved multi-location rows: active-location charts skipped, no crash, honest reason', () => {
  const rows = [
    histRow({ date: '2026-09-18', pm: 30, temp: 29, rh: 71 }),
    histRow({ date: '2026-09-18', pm: 25, temp: 28, rh: 69, loc: 'bangkok' }),
    histRow({ date: '2026-10-16', pm: 48, temp: 27, rh: 75, slot: 'evening' }),
    histRow({ date: '2026-10-16', pm: 44, temp: 26, rh: 73, loc: 'bangkok', slot: 'evening' }),
  ];
  const h = makeContext({ tabs: tabsWithHistory(rows), fetchQueue: [] });
  const r = refresh(h);
  assert.equal(r.ok, true);
  assert.equal(r.charts.length, 0, 'never chart mixed-location ranges');
  assert.equal(h.charts('Charts').length, 0);
  assert.ok(r.skipped.some(s => String(s).includes('interleaved')));
});

test('harness 21-col header (no pm25_tambon_name) still charts via by-name lookup', () => {
  const t = defaultTabs(); /* History_Batch header without pm25_tambon_name */
  t.History_Batch.push(['2026-10-10:morning', '2026-10-10', 'morning', 'uthai', 14.36147, 100.64424, 33.3, '2026-10-10T06:05+07:00', 'ok', 'gistda', '1414', 29.5, 66, 80, '2026-10-10T06:30+07:00', 'ok', 'open-meteo', 'missing', '', '', '2026-10-10T06:00:00.000Z']);
  const h = makeContext({ tabs: t, fetchQueue: [] });
  const r = refresh(h);
  assert.equal(r.charts.length, 3);
  for (const c of h.charts('Charts')) {
    const vcol = c.getRanges()[1].c;
    assert.ok([7, 12, 13].includes(vcol), 'by-name columns in the 21-col layout');
  }
});
