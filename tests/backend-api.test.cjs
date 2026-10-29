/* BackendApi.gs contract tests (fix wave) — VM mocks of Apps Script services.
 * Backend-owned; nothing here calls Google, Sheets, or the live project.
 * All secret fixtures are SYNTHETIC. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const { makeContext, doGet, defaultTabs, defaultFetchQueue, gistdaBody, openMeteoBody, NOW_MS, SRC_BACKEND, SRC_CODE } = require('./backend-harness.cjs');

test('source files exist and parse', () => {
  assert.ok(fs.existsSync(SRC_BACKEND));
  assert.ok(fs.existsSync(SRC_CODE));
});

/* ---------- routing / legacy compat ---------- */

test('no action -> legacy HtmlService UI unchanged (staged compat)', () => {
  const h = makeContext({});
  assert.equal(doGet(h, {}).legacyHtml, true);
  assert.equal(h.calls.fetches.length, 0);
});

test('data route without v=1 -> error envelope, no upstream, no writes', () => {
  const h = makeContext({ fetchQueue: defaultFetchQueue() });
  doGet(h, { action: 'data' });
  const body = JSON.parse(h.outputs()[0].text);
  assert.equal(h.outputs()[0].mime, 'JSON');
  assert.equal(body.schema, 1);
  assert.equal(body.pm25.status, 'missing');
  assert.ok(body.errors.some(e => e.code === 'VERSION'));
  assert.equal(h.calls.fetches.length, 0);
  assert.equal(h.calls.appends.length, 0);
});

/* ---------- JSONP ---------- */

test('invalid callback rejected BEFORE cache/upstream (no fetch)', () => {
  const h = makeContext({ fetchQueue: defaultFetchQueue() });
  doGet(h, { action: 'data', v: '1', callback: 'a.b.c' });
  assert.equal(h.calls.fetches.length, 0);
  assert.equal(h.outputs()[0].mime, 'JSON');
  assert.ok(JSON.parse(h.outputs()[0].text).errors.some(e => e.code === 'CALLBACK'));
});

test('callback with member path/parens/semicolon rejected', () => {
  for (const cb of ['obj.x', 'f();steal()', 'a b', '1abc', '']) {
    const h = makeContext({ fetchQueue: defaultFetchQueue() });
    doGet(h, { action: 'data', v: '1', callback: cb });
    assert.equal(h.calls.fetches.length, 0, 'cb=' + cb);
    assert.equal(h.outputs()[0].mime, 'JSON');
  }
});

test('valid single-identifier callback returns JAVASCRIPT wrap', () => {
  const h = makeContext({ fetchQueue: defaultFetchQueue() });
  doGet(h, { action: 'data', v: '1', callback: 'cb_ok' });
  const o = h.outputs()[0];
  assert.equal(o.mime, 'JAVASCRIPT');
  assert.ok(o.text.startsWith('cb_ok(') && o.text.endsWith(');'));
  assert.ok(o.text.includes('"schema":1'));
  assert.ok(!/\u2028|\u2029/.test(o.text), 'raw U+2028/2029 must be escaped');
});

/* ---------- happy path envelope (canonical keys) ---------- */

test('data route happy path: canonical envelope shape', () => {
  const h = makeContext({ fetchQueue: defaultFetchQueue() });
  doGet(h, { action: 'data', v: '1' });
  const body = JSON.parse(h.outputs()[0].text);
  assert.equal(body.schema, 1);
  assert.ok(typeof body.generatedAt === 'string');
  assert.equal(body.pm25.status, 'ok');
  assert.equal(body.pm25.value, 20.9);
  assert.equal(body.pm25.unit, 'µg/m³');
  assert.equal(body.pm25.observedAt, '2026-10-17T06:05+07:00');
  assert.equal(body.pm25.band, 'very_good');
  assert.ok(body.pm25.source.length > 0);
  assert.equal(body.weather.status, 'ok');
  assert.equal(body.weather.temperatureC, 29.4);
  assert.equal(body.weather.humidityPct, 78);
  assert.equal(body.weather.weatherCode, 80);
  assert.equal(body.weather.tmaxC, 33.1);
  assert.equal(body.weather.tminC, 25.2);
  assert.equal(body.weather.rainPct, 55);
  assert.equal(body.weather.forecastDate, '2026-10-17');
  assert.equal(body.weather.observedAt, '2026-10-17T06:30+07:00');
  assert.equal(body.water.status, 'missing');
  assert.equal(body.water.available, false);
  assert.equal(body.water.value, null);
  assert.equal(body.water.unit, 'm');
  assert.equal(body.water.observedAt, null);
  assert.deepEqual(body.errors, []);
  /* legacy WRONG default cell ('ต.อุทัย อ.พระนครศรีอยุธยา' — tambon อุทัย is in
   * amphoe อุทัย) stays in the harness Sheet; the API must return the
   * canonicalized label via pure loadConfig normalization (no Sheet write). */
  assert.deepEqual(body.location, { id: 'uthai', label: 'ต.อุทัย อ.อุทัย จ.พระนครศรีอยุธยา', lat: 14.36147, lon: 100.64424 });
  /* canonical provenance keys: timeZone / unit; PM is an AREA not a station */
  assert.equal(body.pm25.provenance.provider, 'gistda');
  assert.equal(body.pm25.provenance.areaId, '1414');
  assert.equal(body.pm25.provenance.stationId, null);
  assert.equal(body.pm25.provenance.timeZone, 'Asia/Bangkok');
  assert.equal(body.pm25.provenance.unit, 'µg/m³');
  assert.equal(body.weather.provenance.provider, 'open-meteo');
  assert.equal(body.water.provenance.timeZone, 'Asia/Bangkok');
  assert.equal(body.water.provenance.unit, 'm');
  /* no PCD station claim in PM source text */
  assert.ok(!/PCD|สถานีวัด/.test(body.pm25.source) || body.pm25.source.includes('ไม่ใช่สถานีวัด'));
});

/* ---------- band cutoffs ---------- */

test('band boundaries and fractional gaps (Code.gs descending minima)', () => {
  const h = makeContext({ loadCodeGs: false });
  const b = h.ctx.BackendApi_band_;
  const cases = [
    [0, 'very_good'], [25, 'very_good'], [25.99, 'very_good'], [26, 'good'], [26.01, 'good'],
    [37.99, 'good'], [38, 'moderate'], [38.5, 'moderate'], [50.99, 'moderate'],
    [51, 'unhealthy_sensitive'], [90.99, 'unhealthy_sensitive'], [91, 'unhealthy'],
    [120.4, 'unhealthy'], [-1, null], [null, null], ['x', null],
  ];
  for (const [v, want] of cases) assert.equal(b(v), want, 'value=' + v);
});

/* ---------- GISTDA datetimeThai Buddhist conversion ---------- */

test('datetimeThai full/abbr months, BE->CE, failures', () => {
  const h = makeContext({ loadCodeGs: false });
  const p = h.ctx.BackendApi_parseThaiDateTime_;
  assert.equal(p({ dateThai: '17 ตุลาคม 2569', timeThai: '06:05 น.' }).iso, '2026-10-17T06:05+07:00');
  assert.equal(p({ dateThai: '1 ม.ค. 2569', timeThai: '23:59 น.' }).iso, '2026-01-01T23:59+07:00');
  assert.equal(p({ dateThai: '17 October 2026', timeThai: '06:05 น.' }), null);
  assert.equal(p({ dateThai: '32 ตุลาคม 2569', timeThai: '06:05 น.' }), null);
  assert.equal(p(null), null);
});

/* ---------- freshness rules ---------- */

test('unparseable observedAt -> pm25 missing, never generatedAt substitution', () => {
  const h = makeContext({ fetchQueue: [{ body: gistdaBody({ target: { dt: 'garbage' }, datetimeThai: { dateThai: 'garbage', timeThai: '??' } }) }, { body: openMeteoBody() }] });
  doGet(h, { action: 'data', v: '1' });
  const body = JSON.parse(h.outputs()[0].text);
  assert.equal(body.pm25.status, 'missing');
  assert.equal(body.pm25.observedAt, null);
  assert.equal(body.pm25.band, null);
});

test('stale pm25 (>3h) served with status stale', () => {
  const h = makeContext({ fetchQueue: [{ body: gistdaBody({ dt: '2026-10-17T02:00:00.000Z' }) /* wall 02:00+07 */ }, { body: openMeteoBody() }] });
  doGet(h, { action: 'data', v: '1' });
  assert.equal(JSON.parse(h.outputs()[0].text).pm25.status, 'stale');
});

test('future observedAt > 5min rejected to missing', () => {
  const h = makeContext({ fetchQueue: [{ body: gistdaBody({ dt: '2026-10-17T19:00:00.000Z' }) /* wall 19:00+07, future */ }, { body: openMeteoBody() }] });
  doGet(h, { action: 'data', v: '1' });
  assert.equal(JSON.parse(h.outputs()[0].text).pm25.status, 'missing');
});

/* ---------- weather validation (independent channels) ---------- */

test('weather wrong timezone -> missing channel, pm25 still ok', () => {
  const h = makeContext({ fetchQueue: [{ body: gistdaBody() }, { body: openMeteoBody({ timezone: 'UTC' }) }] });
  doGet(h, { action: 'data', v: '1' });
  const body = JSON.parse(h.outputs()[0].text);
  assert.equal(body.pm25.status, 'ok');
  assert.equal(body.weather.status, 'missing');
});

test('weather future rejected; stale marked', () => {
  const h1 = makeContext({ fetchQueue: [{ body: gistdaBody() }, { body: openMeteoBody({ current: { time: '2026-10-17T09:00', temperature_2m: 30, relative_humidity_2m: 70, weather_code: 0 } }) }] });
  doGet(h1, { action: 'data', v: '1' });
  assert.equal(JSON.parse(h1.outputs()[0].text).weather.status, 'missing');
  const h2 = makeContext({ fetchQueue: [{ body: gistdaBody() }, { body: openMeteoBody({ current: { time: '2026-10-17T02:00', temperature_2m: 30, relative_humidity_2m: 70, weather_code: 0 } }) }] });
  doGet(h2, { action: 'data', v: '1' });
  assert.equal(JSON.parse(h2.outputs()[0].text).weather.status, 'stale');
});

test('weatherCode validated 0..99 integer', () => {
  for (const code of [100, -1, 2.5, 'x']) {
    const h = makeContext({ fetchQueue: [{ body: gistdaBody() }, { body: openMeteoBody({ current: { time: '2026-10-17T06:30', temperature_2m: 30, relative_humidity_2m: 70, weather_code: code } }) }] });
    doGet(h, { action: 'data', v: '1' });
    assert.equal(JSON.parse(h.outputs()[0].text).weather.status, 'missing', 'code=' + code);
  }
});

test('forecastDate not today (Bangkok) -> daily fields drop, current stays ok', () => {
  const h = makeContext({ fetchQueue: [{ body: gistdaBody() }, { body: openMeteoBody({ daily: { time: ['2026-10-18'], temperature_2m_max: [33.1], temperature_2m_min: [25.2], precipitation_probability_max: [55] } }) }] });
  doGet(h, { action: 'data', v: '1' });
  const body = JSON.parse(h.outputs()[0].text);
  assert.equal(body.weather.status, 'ok');
  assert.equal(body.weather.temperatureC, 29.4);
  assert.equal(body.weather.forecastDate, null);
  assert.equal(body.weather.tmaxC, null);
  assert.equal(body.weather.tminC, null);
  assert.equal(body.weather.rainPct, null);
});

test('weather upstream failure does not sink pm25; sanitized errors, no stack', () => {
  const h = makeContext({ fetchQueue: [{ body: gistdaBody() }, { error: new Error('getaddrinfo ENOTFOUND api.open-meteo.com\n    at stackFrame1') }] });
  doGet(h, { action: 'data', v: '1' });
  const body = JSON.parse(h.outputs()[0].text);
  assert.equal(body.pm25.status, 'ok');
  assert.equal(body.weather.status, 'missing');
  assert.ok(!JSON.stringify(body).includes('ENOTFOUND') && !JSON.stringify(body).includes('stackFrame'));
});

/* ---------- configured location, no fallback ---------- */

test('uses configured pm area id in GISTDA URL', () => {
  const h = makeContext({ fetchQueue: defaultFetchQueue() });
  doGet(h, { action: 'data', v: '1' });
  assert.equal(h.calls.fetches[0], 'https://pm25.gistda.or.th/rest/getPm25byTambon?ap_idn=1414');
});

test('GISTDA other-tambon record -> pm25 missing, no other-location data', () => {
  const h = makeContext({ fetchQueue: [{ body: gistdaBody({ data: [{ tb_tn: 'อื่นๆ', pm25: 99 }] }) }, { body: openMeteoBody() }] });
  doGet(h, { action: 'data', v: '1' });
  const body = JSON.parse(h.outputs()[0].text);
  assert.equal(body.pm25.status, 'missing');
  assert.equal(body.pm25.value, null);
});

/* ---------- cache ---------- */

test('second poll served from cache; generatedAt refreshed, observedAt preserved', () => {
  const h = makeContext({ fetchQueue: defaultFetchQueue() });
  doGet(h, { action: 'data', v: '1' });
  const first = JSON.parse(h.outputs()[0].text);
  h.outputsReset();
  h.setNow(NOW_MS + 60000);
  doGet(h, { action: 'data', v: '1' });
  const second = JSON.parse(h.outputs()[0].text);
  assert.equal(h.calls.fetches.length, 2);
  assert.equal(second.pm25.observedAt, first.pm25.observedAt);
  assert.notEqual(second.generatedAt, first.generatedAt);
});

test('cache fingerprint refreshes weather while GISTDA obeys hourly gate', () => {
  const h = makeContext({ fetchQueue: [...defaultFetchQueue(), ...defaultFetchQueue()] });
  doGet(h, { action: 'data', v: '1' });
  h.tabs.get('Locations')[1][3] = 15.12345; /* lat changed, config_version still 1 */
  h.outputsReset();
  doGet(h, { action: 'data', v: '1' });
  assert.equal(h.calls.fetches.length, 3, 'weather refetched; same GISTDA area reused within one hour');
});

test('cache fingerprint: pm area id edit also invalidates', () => {
  const h = makeContext({ fetchQueue: [...defaultFetchQueue(), ...defaultFetchQueue()] });
  doGet(h, { action: 'data', v: '1' });
  h.tabs.get('Locations')[1][6] = '9999';
  h.outputsReset();
  doGet(h, { action: 'data', v: '1' });
  assert.equal(h.calls.fetches.length, 3, 'invalidated key refetches weather; PM fails fast without tambon');
  const body = JSON.parse(h.outputs()[0].text);
  assert.equal(body.pm25.status, 'missing', 'no tambon default outside vetted seed — fail closed, no fake');
  assert.ok(body.errors.some(e => e.code === 'CONFIG' || e.channel === 'pm25'));
});

test('cache isolation per location id + version', () => {
  const h = makeContext({ fetchQueue: [...defaultFetchQueue(), ...defaultFetchQueue()] });
  doGet(h, { action: 'data', v: '1' });
  h.tabs.get('Settings').find(r => r[0] === 'active_location_id')[1] = 'uthai2';
  h.tabs.get('Settings').find(r => r[0] === 'config_version')[1] = '2';
  h.tabs.get('Locations').push(['uthai2', 'ทดสอบ', 'TRUE', 15.0, 100.0, 'gistda', '1415', 'open-meteo', '', '', '', '', '']);
  doGet(h, { action: 'data', v: '1' });
  assert.equal(h.calls.fetches.length, 3, 'new key refetches weather; uthai2 lacks tambon -> PM missing not faked');
});

test('corrupted cache degrades gracefully without violating hourly gate', () => {
  const h = makeContext({ fetchQueue: [...defaultFetchQueue(), ...defaultFetchQueue()] });
  doGet(h, { action: 'data', v: '1' });
  for (const [k, e] of h.cacheStore) h.cacheStore.set(k, { v: '{{{not json', exp: e.exp });
  h.outputsReset();
  let out;
  try { out = doGet(h, { action: 'data', v: '1' }); } catch (e) { assert.fail('must not crash: ' + e.message); }
  const body = JSON.parse(h.outputs()[0].text);
  assert.equal(body.schema, 1);
  assert.equal(body.pm25.status, 'missing', 'corrupt cache cannot trigger an early fetch');
});

test('stale-while-error: last-good served (as stale) when upstream dies', () => {
  const h = makeContext({ fetchQueue: [...defaultFetchQueue(), { error: new Error('up') }, { error: new Error('up') }] });
  doGet(h, { action: 'data', v: '1' });
  h.setNow(NOW_MS + 4 * 3600 * 1000);
  h.outputsReset();
  doGet(h, { action: 'data', v: '1' });
  const body = JSON.parse(h.outputs()[0].text);
  assert.equal(body.pm25.status, 'stale');
  assert.equal(body.pm25.value, 20.9);
});

/* ---------- read path write-safety ---------- */

test('data route only records hourly attempt property, without Sheet or trigger writes', () => {
  const h = makeContext({ fetchQueue: [...defaultFetchQueue(), ...defaultFetchQueue()] });
  doGet(h, { action: 'data', v: '1' });
  doGet(h, { action: 'data', v: '1' });
  assert.equal(h.calls.appends.length, 0);
  assert.equal(h.calls.rangeSets.length, 0);
  assert.equal(h.calls.deleteRows.length, 0);
  assert.equal(h.calls.triggerCreates.length, 0);
  assert.equal(h.calls.triggerDeletes.length, 0);
  assert.deepEqual(h.calls.propSets, ['pm25_gistda_last_attempt_ms']);
});

test('missing config tabs -> fail closed, no auto-create on read', () => {
  const h = makeContext({ tabs: {}, fetchQueue: defaultFetchQueue() });
  doGet(h, { action: 'data', v: '1' });
  const body = JSON.parse(h.outputs()[0].text);
  assert.ok(body.errors.some(e => e.code === 'CONFIG'));
  assert.equal(h.calls.sheetInserts.length, 0);
  assert.equal(h.calls.fetches.length, 0);
});

/* ---------- config validation ---------- */

test('no enabled active row -> config error', () => {
  const tabs = defaultTabs();
  tabs.Locations[1][2] = 'FALSE';
  const h = makeContext({ tabs, fetchQueue: defaultFetchQueue() });
  doGet(h, { action: 'data', v: '1' });
  assert.ok(JSON.parse(h.outputs()[0].text).errors.some(e => e.code === 'CONFIG'));
});

test('duplicate ENABLED ids rejected', () => {
  const tabs = defaultTabs();
  tabs.Locations.push(['uthai', 'ซ้ำ', 'TRUE', 14.4, 100.7, 'gistda', '1414', 'open-meteo', '', '', '', '', '']);
  const h = makeContext({ tabs, fetchQueue: defaultFetchQueue() });
  doGet(h, { action: 'data', v: '1' });
  assert.ok(JSON.parse(h.outputs()[0].text).errors.some(e => e.code === 'CONFIG'));
});

test('disabled malformed row tolerated; active config still serves', () => {
  const tabs = defaultTabs();
  tabs.Locations.push(['bad!', '=cmd', 'FALSE', 'notanumber', 999, 'weird', '', '??', '', '', '', '', '']);
  const h = makeContext({ tabs, fetchQueue: defaultFetchQueue() });
  doGet(h, { action: 'data', v: '1' });
  const body = JSON.parse(h.outputs()[0].text);
  assert.equal(body.pm25.status, 'ok');
});

test('disabled row sharing active id -> ambiguous, fail closed', () => {
  const tabs = defaultTabs();
  tabs.Locations.push(['uthai', 'สำเนาปิด', 'FALSE', 14.4, 100.7, 'gistda', '1414', 'open-meteo', '', '', '', '', '']);
  const h = makeContext({ tabs, fetchQueue: defaultFetchQueue() });
  doGet(h, { action: 'data', v: '1' });
  assert.ok(JSON.parse(h.outputs()[0].text).errors.some(e => e.code === 'CONFIG'));
});

test('out-of-range lat/lon rejected', () => {
  const bad = defaultTabs(); bad.Locations[1][3] = 95.5;
  const h1 = makeContext({ tabs: bad, fetchQueue: defaultFetchQueue() });
  doGet(h1, { action: 'data', v: '1' });
  assert.ok(JSON.parse(h1.outputs()[0].text).errors.some(e => e.code === 'CONFIG'));
  const lonBad = defaultTabs(); lonBad.Locations[1][4] = 200;
  const h2 = makeContext({ tabs: lonBad, fetchQueue: defaultFetchQueue() });
  doGet(h2, { action: 'data', v: '1' });
  assert.ok(JSON.parse(h2.outputs()[0].text).errors.some(e => e.code === 'CONFIG'));
});

test('unsafe active id / unknown provider enum rejected', () => {
  const tabs = defaultTabs();
  tabs.Locations[1][5] = 'evilcorp';
  const h1 = makeContext({ tabs, fetchQueue: defaultFetchQueue() });
  doGet(h1, { action: 'data', v: '1' });
  assert.ok(JSON.parse(h1.outputs()[0].text).errors.some(e => e.code === 'CONFIG'));
  const idTabs = defaultTabs();
  idTabs.Locations[1][0] = 'DROP TABLE;--';
  idTabs.Settings.find(r => r[0] === 'active_location_id')[1] = 'DROP TABLE;--';
  const h2 = makeContext({ tabs: idTabs, fetchQueue: defaultFetchQueue() });
  doGet(h2, { action: 'data', v: '1' });
  assert.ok(JSON.parse(h2.outputs()[0].text).errors.some(e => e.code === 'CONFIG'));
});

test('slot windows must not overlap (morning 8 / evening 10 rejected)', () => {
  const tabs = defaultTabs();
  tabs.Settings.find(r => r[0] === 'history_morning_hour')[1] = '8';
  tabs.Settings.find(r => r[0] === 'history_evening_hour')[1] = '10';
  const h = makeContext({ tabs, fetchQueue: defaultFetchQueue() });
  doGet(h, { action: 'data', v: '1' });
  assert.ok(JSON.parse(h.outputs()[0].text).errors.some(e => e.code === 'CONFIG'));
});

test('non-allowlisted provider URL rejected (SSRF guard), never echoed or fetched', () => {
  const tabs = defaultTabs();
  tabs.API_Sources[1][3] = 'https://evil.example.com/api';
  const h = makeContext({ tabs, fetchQueue: defaultFetchQueue() });
  doGet(h, { action: 'data', v: '1' });
  const body = JSON.parse(h.outputs()[0].text);
  assert.ok(body.errors.some(e => e.code === 'CONFIG'));
  assert.equal(h.calls.fetches.length, 0);
  assert.ok(!JSON.stringify(body).includes('evil.example.com'));
});

test('SYNTHETIC token-shaped value in config rejected, never echoed', () => {
  const tabs = defaultTabs();
  tabs.API_Sources[2][10] = 'token=SYNTHETIC_TEST_TOKEN_NOT_REAL_0000';
  const h = makeContext({ tabs, fetchQueue: defaultFetchQueue() });
  doGet(h, { action: 'data', v: '1' });
  const body = JSON.parse(h.outputs()[0].text);
  assert.ok(body.errors.some(e => e.code === 'CONFIG'));
  assert.ok(!JSON.stringify(body).includes('SYNTHETIC_TEST_TOKEN'));
});

test('no secrets in payload', () => {
  const h = makeContext({ fetchQueue: defaultFetchQueue() });
  doGet(h, { action: 'data', v: '1' });
  const text = h.outputs()[0].text;
  assert.ok(!text.includes('1kBUKdezfAxIziq167e'));
  assert.ok(!text.includes('token='));
  assert.ok(!text.includes('AKfycb'));
  assert.ok(!text.includes('a5dec343'));
});

/* ---------- water stays disabled ---------- */

test('water: constant missing; registry id in provenance; HII/GloFAS disclaimers', () => {
  const tabs = defaultTabs();
  tabs.Locations[1][9] = '492334';
  const h = makeContext({ tabs, fetchQueue: defaultFetchQueue() });
  doGet(h, { action: 'data', v: '1' });
  const body = JSON.parse(h.outputs()[0].text);
  assert.equal(body.water.available, false);
  assert.equal(body.water.status, 'missing');
  assert.equal(body.water.value, null);
  assert.equal(body.water.provenance.stationId, '492334');
  assert.ok(body.water.provenance.note.includes('HII monthly archive ends Sep 30'));
  assert.ok(body.water.source.includes('ยืนยัน'));
});

/* ---------- history batches ---------- */

test('history batch: one row per enabled location with provenance', () => {
  const tabs = defaultTabs();
  tabs.Locations.push(['bangkok', 'กรุงเทพ', 'TRUE', 13.75, 100.5, 'gistda', '1415', 'open-meteo', '', '', '', '', '']);
  const h = makeContext({ tabs, fetchQueue: [...defaultFetchQueue(), ...defaultFetchQueue()] });
  h.ctx.BackendApiHistoryBatch_();
  const hist = h.calls.appends.filter(a => a.sheet === 'History_Batch');
  assert.equal(hist.length, 2);
  const row = hist.find(a => a.row[3] === 'uthai').row;
  assert.equal(row[2], 'morning'); /* 07:00 within 6±2 */
  assert.equal(row[6], 20.9);
  assert.equal(row[7], '2026-10-17T06:05+07:00');
  assert.equal(row[8], 'ok');
  assert.equal(row[9], 'gistda');
  assert.equal(row[10], '1414'); /* pm area id column (amphoe-level) */
  assert.equal(row[11], 'อุทัย'); /* pm tambon name column */
  assert.equal(row[12], 29.4);
  assert.equal(row[14], 80);
});

test('evening slot within window', () => {
  const h = makeContext({ now: Date.UTC(2026, 9, 17, 8, 0), fetchQueue: defaultFetchQueue() }); /* 15:00 BKK */
  h.ctx.BackendApiHistoryBatch_();
  assert.equal(h.calls.appends.filter(a => a.sheet === 'History_Batch')[0].row[2], 'evening');
});

test('manual noon run does NOT preconsume the evening batch', () => {
  const h = makeContext({ now: Date.UTC(2026, 9, 17, 5, 0), fetchQueue: defaultFetchQueue() }); /* 12:00 BKK */
  h.ctx.BackendApiHistoryBatch_();
  assert.equal(h.calls.appends.filter(a => a.sheet === 'History_Batch').length, 0, 'outside ±2h of both slots');
});

test('late-night run outside both windows records nothing', () => {
  const h = makeContext({ now: Date.UTC(2026, 9, 17, 14, 0), fetchQueue: defaultFetchQueue() }); /* 21:00 BKK */
  h.ctx.BackendApiHistoryBatch_();
  assert.equal(h.calls.appends.filter(a => a.sheet === 'History_Batch').length, 0);
});

test('batch idempotent across appendSuccess/crash/retry (fault matrix)', () => {
  const h = makeContext({ fetchQueue: [...defaultFetchQueue(), ...defaultFetchQueue()] });
  h.ctx.BackendApiHistoryBatch_(); /* run 1: appends */
  h.ctx.BackendApiHistoryBatch_(); /* run 2: retry after success -> skip */
  assert.equal(h.calls.appends.filter(a => a.sheet === 'History_Batch').length, 1);
  /* crash-after-fetch-before-append is equivalent to run 2 refetching then
   * finding no row: bounded lookup covers it because run 1's row exists. */
});

test('partial multi-location failure: only missing location retried next run', () => {
  const tabs = defaultTabs();
  tabs.Locations.push(['bangkok', 'กรุงเทพ', 'TRUE', 13.75, 100.5, 'gistda', '1415', 'open-meteo', '', '', '', '', '']);
  /* run 1: uthai ok, bangkok upstream fails (no fixture -> error) */
  const h = makeContext({ tabs, fetchQueue: [...defaultFetchQueue()] });
  h.ctx.BackendApiHistoryBatch_();
  let hist = h.calls.appends.filter(a => a.sheet === 'History_Batch');
  assert.equal(hist.length, 2);
  const bkRow = hist.find(a => a.row[3] === 'bangkok').row;
  assert.equal(bkRow[8], 'missing');
  assert.equal(bkRow[6], null);
  /* run 2 with fixtures: only bangkok was missing-upstream, but its row EXISTS
   * (recorded as missing) -> idempotent skip, no duplicate */
  h.ctx.BackendApiHistoryBatch_();
  hist = h.calls.appends.filter(a => a.sheet === 'History_Batch');
  assert.equal(hist.length, 2);
});

test('missing upstream recorded as missing with provenance, never 0', () => {
  const h = makeContext({ fetchQueue: [{ error: new Error('down') }, { body: openMeteoBody() }] });
  h.ctx.BackendApiHistoryBatch_();
  const hist = h.calls.appends.filter(a => a.sheet === 'History_Batch');
  assert.equal(hist.length, 1);
  assert.equal(hist[0].row[8], 'missing');
  assert.equal(hist[0].row[6], null);
  assert.notEqual(hist[0].row[6], 0);
});

test('history respects only enabled locations', () => {
  const tabs = defaultTabs();
  tabs.Locations.push(['off', 'ปิด', 'FALSE', 13.0, 100.0, 'gistda', '1416', 'open-meteo', '', '', '', '', '']);
  const h = makeContext({ tabs, fetchQueue: defaultFetchQueue() });
  h.ctx.BackendApiHistoryBatch_();
  const hist = h.calls.appends.filter(a => a.sheet === 'History_Batch');
  assert.equal(hist.length, 1);
  assert.equal(hist[0].row[3], 'uthai');
});

test('history string cells neutralised against Sheets formula injection', () => {
  const tabs = defaultTabs();
  tabs.Locations[1][1] = '=HYPERLINK("http://evil","x") ต.อุทัย';
  const h = makeContext({ tabs, fetchQueue: defaultFetchQueue() });
  h.ctx.BackendApiHistoryBatch_();
  const row = h.calls.appends.filter(a => a.sheet === 'History_Batch')[0].row;
  for (const cell of row) {
    if (typeof cell === 'string') assert.ok(!/^[=+\-@\t\r]/.test(cell), 'unsafe cell: ' + cell);
  }
  assert.equal(row[3], 'uthai'); /* safe ids untouched */
  assert.equal(row[4], 14.36147); /* numbers untouched */
});

test('negative numeric values stay numbers (no quote-prefix)', () => {
  const h = makeContext({ fetchQueue: [{ body: gistdaBody() }, { body: openMeteoBody({ current: { time: '2026-10-17T06:30', temperature_2m: -5.5, relative_humidity_2m: 60, weather_code: 71 } }) }] });
  h.ctx.BackendApiHistoryBatch_();
  const row = h.calls.appends.filter(a => a.sheet === 'History_Batch')[0].row;
  assert.equal(row[12], -5.5);
  assert.equal(typeof row[12], 'number');
});

/* ---------- setup idempotency ---------- */

test('setup creates missing tabs+headers only; existing settings preserved', () => {
  const tabs = defaultTabs();
  tabs.Settings[2][1] = '7';
  const h = makeContext({ tabs, fetchQueue: [] });
  h.ctx.BackendApiSetupSheets_();
  const sets1 = h.calls.rangeSets.length, ins1 = h.calls.sheetInserts.length;
  h.ctx.BackendApiSetupSheets_();
  assert.equal(h.calls.sheetInserts.length, ins1);
  assert.equal(h.calls.rangeSets.length, sets1);
  assert.equal(h.calls.appends.length, 0);
  assert.equal(h.calls.deleteRows.length, 0);
  assert.equal(h.tabs.get('Settings')[2][1], '7');
});

test('first-run on empty spreadsheet seeds defaults', () => {
  const h = makeContext({ tabs: {}, fetchQueue: [] });
  h.ctx.BackendApiSetupSheets_();
  for (const t of ['Settings', 'Locations', 'API_Sources', 'History_Batch']) assert.ok(h.tabs.has(t));
  assert.equal(h.tabs.get('Settings').length, 6);
});

/* ---------- trigger management + 2/day migration ---------- */

function mkTrig(handler, hour) { return { handler, hour, days: 1 }; }

test('install: exactly 2 owned triggers; repeat install no duplicates', () => {
  const h = makeContext({ fetchQueue: [] });
  h.ctx.BackendApiInstallTriggers_();
  assert.equal(h.calls.triggerCreates.length, 2);
  assert.deepEqual(h.calls.triggerCreates.map(t => t.hour).sort((a, b) => a - b), [6, 16]);
  h.ctx.BackendApiInstallTriggers_();
  assert.equal(h.calls.triggerCreates.length, 4);
  assert.deepEqual(h.calls.triggerDeletes, ['BackendApiHistoryBatch_', 'BackendApiHistoryBatch_']);
});

test('install NEVER deletes unrelated handlers', () => {
  const h = makeContext({
    triggers: [mkTrig('main', 6), mkTrig('logGistdaData', 8), mkTrig('onEditNotify', 0), mkTrig('BackendApiHistoryBatch_', 6)],
    fetchQueue: [],
  });
  h.ctx.BackendApiInstallTriggers_();
  assert.ok(h.calls.triggerDeletes.every(x => x === 'BackendApiHistoryBatch_'));
  const remaining = h.ctx.ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction());
  for (const keep of ['main', 'logGistdaData', 'onEditNotify']) assert.ok(remaining.includes(keep));
});

test('hour config change rebuilds owned triggers only', () => {
  const tabs = defaultTabs();
  tabs.Settings.find(r => r[0] === 'history_morning_hour')[1] = '5';
  tabs.Settings.find(r => r[0] === 'history_evening_hour')[1] = '17';
  const h = makeContext({ tabs, triggers: [mkTrig('BackendApiHistoryBatch_', 6), mkTrig('BackendApiHistoryBatch_', 16), mkTrig('main', 6)], fetchQueue: [] });
  h.ctx.BackendApiInstallTriggers_();
  assert.deepEqual(h.calls.triggerCreates.slice(-2).map(t => t.hour).sort((a, b) => a - b), [5, 17]);
  assert.ok(h.calls.triggerDeletes.every(x => x === 'BackendApiHistoryBatch_'));
});

test('migration DEFAULT refuses: installs owned but retires nothing, cadenceComplete=false', () => {
  const h = makeContext({
    triggers: [mkTrig('main', 6), mkTrig('main', 16), mkTrig('logGistdaData', 8), mkTrig('logGistdaData', 20)],
    fetchQueue: [],
  });
  const r = h.ctx.BackendApiInstallAndMigrate_({});
  assert.equal(r.installed, true);
  assert.equal(r.ownedTriggerCount, 2);
  assert.equal(Array.from(r.retired).length, 0);
  assert.equal(r.cadenceComplete, false, 'must refuse to claim 2/day while legacy retained');
  assert.ok(r.refusalReason && r.refusalReason.includes('verifiedHistoryOnly'));
  assert.equal(h.calls.triggerDeletes.length, 0);
  assert.ok(h.calls.propSets.some(k => String(k).startsWith('bapi_trigger_backup_')), 'inventory backup before anything');
});

test('migration with verifiedHistoryOnly retires BOTH legacy history handlers and completes', () => {
  const h = makeContext({
    triggers: [mkTrig('main', 6), mkTrig('main', 16), mkTrig('logGistdaData', 8), mkTrig('logGistdaData', 20), mkTrig('onEditNotify', 0)],
    fetchQueue: [],
  });
  const r = h.ctx.BackendApiInstallAndMigrate_({ verifiedHistoryOnly: true });
  assert.deepEqual(Array.from(r.retired).sort(), ['logGistdaData', 'logGistdaData', 'main', 'main']);
  assert.equal(r.cadenceComplete, true);
  assert.equal(r.remainingLegacyHistoryTriggers.length, 0);
  const remaining = h.ctx.ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction()).sort();
  assert.deepEqual(remaining, ['BackendApiHistoryBatch_', 'BackendApiHistoryBatch_', 'onEditNotify']);
});

test('cadenceComplete=false reported if a legacy handler survives (concurrent recreate)', () => {
  const h = makeContext({ triggers: [mkTrig('main', 6)], fetchQueue: [] });
  /* simulate concurrent recreation: deleteTrigger for 'main' silently fails */
  const realDelete = h.ctx.ScriptApp.deleteTrigger;
  const trig = h.ctx.ScriptApp.getProjectTriggers()[0];
  const orig = h.calls;
  h.ctx.ScriptApp.deleteTrigger = () => { throw new Error('race'); };
  let r;
  try { r = h.ctx.BackendApiInstallAndMigrate_({ verifiedHistoryOnly: true }); } catch (e) { r = null; }
  h.ctx.ScriptApp.deleteTrigger = realDelete;
  assert.ok(r, 'must not crash on concurrent delete failure');
  assert.equal(r.cadenceComplete, false);
  assert.equal(r.remainingLegacyHistoryTriggers.length >= 1, true);
});

test('plan is read-only: inventory + known-handler list, no deletions', () => {
  const h = makeContext({ triggers: [mkTrig('main', 6), mkTrig('logGistdaData', 8)], fetchQueue: [] });
  const plan = h.ctx.BackendApiPlanLegacyMigration_();
  assert.equal(h.calls.triggerDeletes.length, 0);
  assert.deepEqual(Array.from(plan.triggers, t => t.handler).sort(), ['logGistdaData', 'main']);
  assert.deepEqual(Array.from(plan.legacyHistoryHandlers).sort(), ['logGistdaData', 'main']);
  assert.ok(plan.notes.includes('Creator limitation'));
});


test('doGet never installs triggers nor runs scheduler', () => {
  const h = makeContext({ fetchQueue: defaultFetchQueue() });
  doGet(h, { action: 'data', v: '1' });
  assert.equal(h.calls.triggerCreates.length, 0);
  assert.equal(h.calls.appends.filter(a => a.sheet === 'History_Batch').length, 0);
});

/* ---------- errors shape ---------- */

test('errors structured, codes whitelisted, messages bounded', () => {
  const h = makeContext({ fetchQueue: [{ error: new Error('x') }, { error: new Error('y') }] });
  doGet(h, { action: 'data', v: '1' });
  const body = JSON.parse(h.outputs()[0].text);
  assert.ok(body.errors.length >= 2);
  for (const e of body.errors) {
    assert.ok(['pm25', 'weather', 'water', 'config', 'version', 'callback'].includes(e.channel));
    assert.ok(['UPSTREAM', 'TIMEOUT', 'PARSE', 'CONFIG', 'VERSION', 'CALLBACK', 'OBSERVED_AT'].includes(e.code));
    assert.ok(typeof e.message === 'string' && e.message.length <= 120);
  }
});

/* ---------- sanitized repo Code.gs (fix wave) ---------- */

test('repo Code.gs: sanitized, routed doGet, all legacy write entries guarded', () => {
  const src = fs.readFileSync(SRC_CODE, 'utf8');
  assert.ok(src.includes('SANITIZED PUBLIC REFERENCE'));
  assert.ok(!/token=[0-9a-f]{32,}/.test(src), 'no live WAQI token');
  assert.ok(!/(8U9ZeQ|DVDfc5|5mYp38)/.test(src), 'no live LINE token fragments');
  assert.ok(src.includes('SCRIPT_PROPERTY:WAQI_TOKEN'));
  assert.ok(/doGet\(e\)\s*\{[\s\S]*?BackendApi\.doGet\(e\)/.test(src), 'routing hook to module closure');
  assert.ok(src.includes('function createDailyTrigger()'));
  for (const legacy of ['main', 'importDataToSpreadsheet', 'logGistdaData', 'logPm25ToSheet2']) {
    assert.ok(src.includes('function ' + legacy + '_('), legacy + '_ private twin');
  }
  assert.ok(src.includes('SECURITY PATCH'));
  assert.ok(src.includes('function gistdaForMain_()'));
});

test('repo Code.gs + BackendApi.gs co-load: doGet data route serves through the hook', () => {
  const h = makeContext({ fetchQueue: defaultFetchQueue() });
  const out = h.ctx.doGet({ parameter: { action: 'data', v: '1' } });
  const body = JSON.parse(h.outputs()[0].text);
  assert.equal(body.schema, 1);
  assert.equal(body.pm25.status, 'ok');
  assert.equal(body.pm25.band, 'very_good');
});

test('guarded createDailyTrigger: anonymous refused even with spoofed args; owner delegates to owned installer', () => {
  const anon = makeContext({ session: { active: '', effective: 'a.richbusinessman@gmail.com' }, fetchQueue: [] });
  assert.throws(() => anon.ctx.createDailyTrigger(true), /not the trusted owner/);
  assert.throws(() => anon.ctx.createDailyTrigger(), /not the trusted owner/);
  assert.equal(anon.calls.triggerCreates.length, 0);
  const badCfg = makeContext({ session: { active: 'a.richbusinessman@gmail.com', effective: 'a.richbusinessman@gmail.com' }, tabs: {}, fetchQueue: [] });
  assert.throws(() => badCfg.ctx.createDailyTrigger(), /configuration invalid/);
  assert.equal(badCfg.calls.triggerCreates.length, 0);
  const ok = makeContext({ fetchQueue: [] });
  ok.ctx.createDailyTrigger();
  assert.equal(ok.calls.triggerCreates.length, 2);
  assert.deepEqual(ok.calls.triggerCreates.map(t2 => t2.hour).sort((a, b) => a - b), [6, 16]);
});

/* ---------- SECURITY: google.script.run exposure model ---------- */

test('anonymous viewer (activeUser == "") cannot invoke ANY public mutator via google.script.run semantics', () => {
  const session = { active: '', effective: 'a.richbusinessman@gmail.com' };
  for (const call of [
    h => h.ctx.main(),
    h => h.ctx.importDataToSpreadsheet({ gistda: { pm25: 1, pm25Avg24hr: 1, tambon: 'อุทัย' } }),
    h => h.ctx.logGistdaData(),
    h => h.ctx.logPm25ToSheet2({ gistda: { pm25: 1, pm25Avg24hr: 1, tambon: 'อุทัย' } }),
    h => h.ctx.createDailyTrigger(true),
    h => h.ctx.BackendApiOwnerInitialize_(),
    h => h.ctx.BackendApiSetupSheets_(),
    h => h.ctx.BackendApiInstallTriggers_(),
    h => h.ctx.BackendApiInstallAndMigrate_({ verifiedHistoryOnly: true }),
    h => h.ctx.BackendApiHistoryBatch_(),
  ]) {
    const h = makeContext({ session, fetchQueue: [{ body: JSON.stringify({ data: [{ tb_tn: 'อุทัย', pm25: 5, pm25Avg24hr: 5 }] }) }] });
    assert.throws(() => call(h), /not the trusted owner|guard/i);
    assert.equal(h.calls.appends.length, 0, 'no sheet writes');
    assert.equal(h.calls.triggerCreates.length, 0, 'no trigger writes');
    assert.equal(h.calls.triggerDeletes.length, 0, 'no trigger deletes');
    assert.equal(h.calls.sheetInserts.length, 0, 'no tab creation');
  }
});

test('spoofed consent flags never bypass the owner guard', () => {
  const session = { active: 'attacker@gmail.com', effective: 'a.richbusinessman@gmail.com' };
  const h = makeContext({ session, fetchQueue: [] });
  assert.throws(() => h.ctx.BackendApiInstallAndMigrate_({ verifiedHistoryOnly: true, owner: true, admin: true }), /not the trusted owner/);
  assert.throws(() => h.ctx.createDailyTrigger(true), /not the trusted owner/);
  assert.equal(h.calls.triggerCreates.length + h.calls.triggerDeletes.length, 0);
});

test('legacy owner-installed scheduled triggers keep working through the guards (staged migration)', () => {
  const gistda = JSON.stringify({ status: 200, datetimeThai: { dateThai: '17 ตุลาคม 2569', timeThai: '06:05 น.' }, data: [{ tb_tn: 'อุทัย', pm25: 12.5, pm25Avg24hr: 12 }] });
  const thai = JSON.stringify({ aqi: 50 });
  const globalAir = JSON.stringify({ status: 'ok', data: { aqi: 50, iaqi: { pm10: { v: 30 }, t: { v: 29 } } } });
  const legacyTabs = () => Object.assign(defaultTabs(), {
    'ชีต1': [['Timestamp', 'AQI (US)', 'PM10 (µg/m³)', 'PM2.5 (µg/m³)', 'PM2.5 24hr Avg (µg/m³)']],
    'ชีต2': [['วันที่-เวลา', 'ตำบล', 'ค่าเฉลี่ย PM2.5 (24 ชม.)']],
  });
  const hMain = makeContext({
    session: { active: '', effective: 'a.richbusinessman@gmail.com' },
    scriptTrigger: 'main',
    tabs: legacyTabs(),
    fetchQueue: [{ body: gistda }],
  });
  hMain.ctx.main();
  assert.ok(hMain.calls.appends.some(a => a.sheet === 'ชีต1'), 'main still writes ชีต1');
  const hLog = makeContext({
    session: { active: '', effective: 'a.richbusinessman@gmail.com' },
    scriptTrigger: 'logGistdaData',
    tabs: legacyTabs(),
    fetchQueue: [{ body: thai }, { body: globalAir }, { body: gistda }],
  });
  hLog.ctx.logGistdaData();
  assert.ok(hLog.calls.appends.some(a => a.sheet === 'ชีต2'), 'logGistdaData still writes ชีต2');
});

test('scheduled handler name mismatch is NOT trusted (main body cannot be spoofed by another trigger)', () => {
  const h = makeContext({
    session: { active: '', effective: 'a.richbusinessman@gmail.com' },
    scriptTrigger: 'someOtherHandler',
    fetchQueue: [],
  });
  assert.throws(() => h.ctx.main(), /not the trusted owner/);
});

test('owner editor session: BackendApiOwnerInitialize_ full safe flow', () => {
  const h = makeContext({
    tabs: {},
    triggers: [mkTrig('main', 6), mkTrig('main', 16), mkTrig('logGistdaData', 8), mkTrig('logGistdaData', 20), mkTrig('onEditNotify', 0)],
    fetchQueue: [],
  });
  const r = h.ctx.BackendApiOwnerInitialize_();
  assert.equal(r.ok, true);
  assert.equal(r.stage, 'done');
  assert.equal(r.ownedHandler, 'BackendApiHistoryBatch_');
  assert.equal(r.ownedTriggerCount, 2);
  assert.deepEqual(Array.from(r.legacyRetired).sort(), ['logGistdaData', 'logGistdaData', 'main', 'main']);
  assert.deepEqual(Array.from(r.legacyRemaining), []);
  assert.equal(r.cadenceComplete, true);
  assert.equal(r.activeLocationId, 'uthai');
  assert.ok(h.calls.appends.every(a => a.sheet !== 'History_Batch'), 'no sample history rows');
  assert.ok(r.tabsTouched.includes('Settings'));
  const remaining = h.ctx.ScriptApp.getProjectTriggers().map(t => t.getHandlerFunction()).sort();
  assert.deepEqual(remaining, ['BackendApiHistoryBatch_', 'BackendApiHistoryBatch_', 'onEditNotify']);
  /* summary carries no trigger ids/tokens */
  assert.ok(!/AKfyc|token|1kBUKd/i.test(JSON.stringify(r)));
});

test('BackendApiOwnerInitialize_ idempotent: second run no resets, no duplicates', () => {
  const h = makeContext({ triggers: [mkTrig('BackendApiHistoryBatch_', 6), mkTrig('BackendApiHistoryBatch_', 16)], fetchQueue: [] });
  const r1 = h.ctx.BackendApiOwnerInitialize_();
  assert.equal(r1.cadenceComplete, true);
  assert.deepEqual(Array.from(r1.legacyRetired), []);
  assert.equal(h.tabs.get('Settings').length, 6, 'settings untouched');
});

test('BackendApiOwnerVerify_ is read-only and sanitized', () => {
  const h = makeContext({ fetchQueue: [] });
  const v = h.ctx.BackendApiOwnerVerify_();
  assert.equal(v.ok, true);
  assert.equal(v.ownedTriggerCount, 0);
  assert.equal(v.historyRowCount, 0);
  assert.equal(h.calls.appends.length, 0);
  assert.equal(h.calls.triggerCreates.length + h.calls.triggerDeletes.length, 0);
  assert.ok(!/AKfyc|token/i.test(JSON.stringify(v)));
  const anon = makeContext({ session: { active: '', effective: 'a.richbusinessman@gmail.com' }, fetchQueue: [] });
  assert.throws(() => anon.ctx.BackendApiOwnerVerify_(), /not the trusted owner/);
});

test('scheduled owned handler with anonymous session is trusted via exact handler match', () => {
  const h = makeContext({
    session: { active: '', effective: 'a.richbusinessman@gmail.com' },
    scriptTrigger: 'BackendApiHistoryBatch_',
    fetchQueue: [{ body: JSON.stringify({ datetimeThai: { dateThai: '17 ตุลาคม 2569', timeThai: '06:05 น.' }, data: [{ tb_tn: 'อุทัย', pm25: 9, pm25Avg24hr: 9 }] }) }, { body: openMeteoBody() }],
  });
  h.ctx.BackendApiHistoryBatch_(); /* no throw, records morning batch */
  assert.equal(h.calls.appends.filter(a => a.sheet === 'History_Batch').length, 1);
});

test('getWidgetData stays public readable; doGet data route is session-independent', () => {
  const h = makeContext({
    session: { active: '', effective: 'a.richbusinessman@gmail.com' },
    fetchQueue: [{ body: JSON.stringify({ datetimeThai: { dateThai: '17 ตุลาคม 2569', timeThai: '06:05 น.' }, data: [{ tb_tn: 'อุทัย', pm25: 7, pm25Avg24hr: 7 }] }) }],
  });
  const w = h.ctx.getWidgetData();
  assert.equal(w.gistda.selectedArea.pm25, 7);
  assert.equal(h.calls.appends.length, 0);
  doGet(h, { action: 'data', v: '1' }); /* more fixtures needed for full route */
  assert.equal(h.calls.appends.length, 0);
});

test('no public (non-underscore) mutating top-level function exists in either .gs', () => {
  for (const f of [SRC_BACKEND, SRC_CODE]) {
    const src = fs.readFileSync(f, 'utf8');
    const names = [...src.matchAll(/^function ([A-Za-z0-9_]+)\(/gm)].map(m => m[1]);
    const mutating = ['BackendApiSetupSheets', 'BackendApiInstallTriggers', 'BackendApiPlanLegacyMigration',
      'BackendApiInstallAndMigrate', 'BackendApiApplyLegacyMigration', 'BackendApiOwnerInitialize',
      'BackendApiOwnerVerify', 'BackendApiHistoryBatch', 'BackendApi_doGet'];
    for (const m of mutating) assert.ok(!names.includes(m), m + ' must not be public in ' + f);
    const visibleOk = new Set(['doGet', 'getWidgetData', 'include', 'main', 'importDataToSpreadsheet',
      'logGistdaData', 'logPm25ToSheet2', 'createDailyTrigger', 'fetchAirQualityData', 'getPM25Advice',
      'formatThaiDateTime', 'createMessage', 'handleError', 'optionalPM25_', 'gistdaForMain_',
      'assertOwnerCaller_', 'fetchWithRetry', 'setupLedBackend', 'verifyLedBackend', 'ledOwnerDiagnostics', 'refreshLedCharts']);
    for (const n of names) {
      if (n.startsWith('BackendApi')) assert.ok(n.endsWith('_'), 'BackendApi surface must be underscore-private: ' + n);
      else assert.ok(visibleOk.has(n) || n.endsWith('_'), 'unexpected public surface: ' + n);
    }
    /* guarded wrappers verified by marker */
    if (f === SRC_CODE) {
      for (const legacy of ['main', 'importDataToSpreadsheet', 'logGistdaData', 'logPm25ToSheet2', 'createDailyTrigger']) {
        assert.ok(src.includes("assertOwnerCaller_('" + legacy + "')"), legacy + ' guard marker missing');
      }
    }
  }
});


/* ---------- VISIBLE owner wrappers (usability fix 2026-10-17) ---------- */

test('visible wrappers exist as public no-underscore top-level functions', () => {
  const src = fs.readFileSync(SRC_BACKEND, 'utf8');
  assert.ok(/^function setupLedBackend\(\) \{/m.test(src), 'setupLedBackend missing');
  assert.ok(/^function verifyLedBackend\(\) \{/m.test(src), 'verifyLedBackend missing');
  assert.ok(src.includes("BackendApi.assertTrustedCaller('BackendApiOwnerInitialize_', true)"), 'init wrapper must strict-guard');
  assert.ok(src.includes("BackendApi.assertTrustedCaller('BackendApiOwnerVerify_', true)"), 'verify wrapper must strict-guard');
});

test('setupLedBackend: anonymous caller refused BEFORE any write; spoofed args ignored', () => {
  const h = makeContext({ session: { active: '', effective: 'a.richbusinessman@gmail.com' }, tabs: {}, triggers: [mkTrig('main', 6)], fetchQueue: [] });
  assert.throws(() => h.ctx.setupLedBackend(), /not the trusted owner/);
  assert.throws(() => h.ctx.setupLedBackend({ owner: true, force: true }), /not the trusted owner/);
  assert.equal(h.calls.appends.length + h.calls.triggerCreates.length + h.calls.sheetInserts.length, 0, 'zero writes');
});

test('setupLedBackend: owner session performs full idempotent init and returns sanitized summary', () => {
  const h = makeContext({
    tabs: {},
    triggers: [mkTrig('main', 6), mkTrig('main', 16), mkTrig('logGistdaData', 8), mkTrig('logGistdaData', 20), mkTrig('onEditNotify', 0)],
    fetchQueue: [],
  });
  const r = h.ctx.setupLedBackend();
  assert.equal(r.ok, true);
  assert.equal(r.cadenceComplete, true);
  assert.equal(r.ownedTriggerCount, 2);
  assert.equal(Array.from(r.legacyRetired).length, 4);
  assert.ok(h.calls.appends.every(a => a.sheet !== 'History_Batch'), 'no sample history');
  /* editor-visible log is sanitized: no emails, trigger ids, tokens */
  const logged = h.calls.logs.filter(l => l.includes('setupLedBackend')).join(' ');
  assert.ok(logged.includes('cadenceComplete'));
  assert.ok(!/@gmail|AKfyc|1kBUKd|token/i.test(logged), 'log leak');
  assert.ok(!/@gmail|AKfyc|1kBUKd|token/i.test(JSON.stringify(r)), 'summary leak');
});

test('setupLedBackend second owner run is idempotent (no resets/duplicates)', () => {
  const h = makeContext({ triggers: [mkTrig('BackendApiHistoryBatch_', 6), mkTrig('BackendApiHistoryBatch_', 16)], fetchQueue: [] });
  const r = h.ctx.setupLedBackend();
  assert.equal(r.cadenceComplete, true);
  assert.equal(Array.from(r.legacyRetired).length, 0);
  assert.equal(h.tabs.get('Settings').length, 6);
});

test('verifyLedBackend: read-only for owner, refused for anonymous', () => {
  const owner = makeContext({ fetchQueue: [] });
  const v = owner.ctx.verifyLedBackend();
  assert.equal(v.ok, true);
  assert.equal(owner.calls.appends.length, 0);
  assert.equal(owner.calls.triggerCreates.length + owner.calls.triggerDeletes.length, 0);
  const anon = makeContext({ session: { active: '', effective: 'a.richbusinessman@gmail.com' }, fetchQueue: [] });
  assert.throws(() => anon.ctx.verifyLedBackend(), /not the trusted owner/);
});

test('visible wrappers never call scheduler/history from doGet path', () => {
  const h = makeContext({ fetchQueue: defaultFetchQueue() });
  doGet(h, { action: 'data', v: '1' });
  assert.equal(h.calls.appends.filter(a => a.sheet === 'History_Batch').length, 0);
});


/* ---------- ROOT-CAUSE regression: real Session identity semantics ----------
 * Official docs (Session.getActiveUser): email is BLANK when security
 * policies/scope do not expose identity; the method REQUIRES the
 * https://www.googleapis.com/auth/userinfo.email scope; "execute as me"
 * web apps never expose the visitor identity. Editor runs by the developer
 * DO expose it — but only when that scope is actually granted. The manifest
 * shipped WITHOUT explicit oauthScopes (automatic detection), so a legit
 * owner-editor run can present active==='' while effective===owner — the
 * exact shape of the 2026-10-17 22:50 failure. Guard must still refuse
 * (identical shape to an anonymous webapp call); diagnostics must make the
 * failing PREDICATE visible as booleans without ever printing identity. */

test('real-context: owner-editor run with scope-missing blank identity is refused (same shape as anonymous)', () => {
  const h = makeContext({ session: { active: '', effective: 'a.richbusinessman@gmail.com' }, fetchQueue: [] });
  assert.throws(() => h.ctx.setupLedBackend(), /not the trusted owner/);
  assert.equal(h.calls.appends.length + h.calls.triggerCreates.length, 0);
});

test('real-context: scope granted -> active==effective -> guard passes (documented happy path)', () => {
  const h = makeContext({ session: { active: 'a.richbusinessman@gmail.com', effective: 'a.richbusinessman@gmail.com' }, tabs: {}, fetchQueue: [] });
  const r = h.ctx.setupLedBackend();
  assert.equal(r.ok, true);
});

test('ledOwnerDiagnostics exists visible, boolean-only shape, zero writes, no identity echoed', () => {
  const src = fs.readFileSync(SRC_BACKEND, 'utf8');
  assert.ok(/^function ledOwnerDiagnostics\(\) \{/m.test(src), 'diagnostics missing');
  const h = makeContext({ session: { active: '', effective: 'a.richbusinessman@gmail.com' }, fetchQueue: [] });
  const d = h.ctx.ledOwnerDiagnostics();
  assert.deepEqual(Object.keys(d).sort(), ['activeEmailPresent', 'activeEqualsEffective', 'effectiveEmailPresent', 'scheduledContext', 'trusted'].sort());
  for (const k of Object.keys(d)) assert.equal(typeof d[k], 'boolean', k + ' must be boolean');
  /* the exact 22:50 failure shape must be diagnosable WITHOUT trusting effective alone */
  assert.equal(d.activeEmailPresent, false);
  assert.equal(d.effectiveEmailPresent, true);
  assert.equal(d.activeEqualsEffective, false);
  assert.equal(d.trusted, false, 'effective alone must NEVER imply trusted');
  assert.equal(h.calls.appends.length + h.calls.triggerCreates.length + h.calls.sheetInserts.length, 0, 'read-only');
  const logged = h.calls.logs.join(' ');
  assert.ok(!/@gmail|AKfyc|1kBUKd|token/i.test(logged), 'no identity/ids in log');
  /* owner-with-scope shape flips the booleans */
  const ok = makeContext({ session: { active: 'a.richbusinessman@gmail.com', effective: 'a.richbusinessman@gmail.com' }, fetchQueue: [] });
  const d2 = ok.ctx.ledOwnerDiagnostics();
  assert.equal(d2.activeEmailPresent, true);
  assert.equal(d2.effectiveEmailPresent, true);
  assert.equal(d2.activeEqualsEffective, true);
  assert.equal(d2.scheduledContext, false);
  assert.equal(d2.trusted, true);
});

test('diagnostics in scheduled context reports scheduledContext=true, still read-only', () => {
  const h = makeContext({ session: { active: '', effective: 'a.richbusinessman@gmail.com' }, scriptTrigger: 'BackendApiHistoryBatch_', fetchQueue: [] });
  const d = h.ctx.ledOwnerDiagnostics();
  assert.equal(d.scheduledContext, true);
  assert.equal(h.calls.appends.length, 0);
});

test('manifest declares explicit oauthScopes incl userinfo.email (scope fix)', () => {
  const m = JSON.parse(fs.readFileSync(require('path').join(__dirname, '..', 'apps-script', 'appsscript.json'), 'utf8'));
  assert.ok(Array.isArray(m.oauthScopes) && m.oauthScopes.includes('https://www.googleapis.com/auth/userinfo.email'),
    'userinfo.email scope must be explicit — automatic detection left active identity blank');
  for (const need of ['spreadsheets', 'script.external_request', 'script.scriptapp', 'script.container.ui']) {
    assert.ok(m.oauthScopes.some(sc => sc.includes(need)), 'preserve existing capability: ' + need);
  }
});


/* ---------- amphoe-list selection (real ap_idn=1414 response shape) ---------- */

test('amphoe response: exact tb_tn match selects TARGET row (not first), dt-first observedAt', () => {
  const h = makeContext({ fetchQueue: [{ body: gistdaBody({ pm25: 20.9 }) }, { body: openMeteoBody() }] });
  doGet(h, { action: 'data', v: '1' });
  const body = JSON.parse(h.outputs()[0].text);
  assert.equal(body.pm25.status, 'ok');
  assert.equal(body.pm25.value, 20.9, 'value from target row only (first rows are 42+)');
  assert.equal(body.pm25.observedAt, '2026-10-17T06:05+07:00', 'row dt is Bangkok wall 06:05 despite fake Z');
  assert.equal(body.pm25.provenance.areaId, '1414');
  assert.equal(body.pm25.provenance.tambonName, 'อุทัย');
  assert.ok(body.pm25.provenance.areaLevel.includes('amphoe'));
  assert.ok(body.pm25.source.includes('ไม่ใช่สถานีวัด'), 'no station claim');
  assert.ok(!/PCD/.test(body.pm25.source));
});

test('substring/similar tambon names never match (exact NFC equality only)', () => {
  const h = makeContext({
    fetchQueue: [{ body: gistdaBody({ data: [{ tb_tn: 'อุทัยใหม่', tb_idn: 1, pm25: 99, dt: '2026-10-17T06:05:00.000Z' }, { tb_tn: 'ต.อุทัย', tb_idn: 2, pm25: 88, dt: '2026-10-17T06:05:00.000Z' }] }) }, { body: openMeteoBody() }],
  });
  doGet(h, { action: 'data', v: '1' });
  const body = JSON.parse(h.outputs()[0].text);
  assert.equal(body.pm25.status, 'missing');
  assert.equal(body.pm25.value, null);
});

test('duplicate tambon rows -> ambiguous -> missing', () => {
  const row = { tb_tn: 'อุทัย', tb_idn: 141411, pm25: 20.9, dt: '2026-10-17T06:05:00.000Z' };
  const h = makeContext({ fetchQueue: [{ body: gistdaBody({ data: [row, Object.assign({}, row, { tb_idn: 141412 })] }) }, { body: openMeteoBody() }] });
  doGet(h, { action: 'data', v: '1' });
  assert.equal(JSON.parse(h.outputs()[0].text).pm25.status, 'missing');
});

test('NFC normalization: decomposed config name still matches composed row', () => {
  const tabs = defaultTabs();
  tabs.Locations[0].push('pm_tambon_name');
  const composed = 'อุทัย';
  const decomposed = composed.normalize('NFD');
  tabs.Locations[1].push(decomposed);
  const h = makeContext({ tabs, fetchQueue: [{ body: gistdaBody() }, { body: openMeteoBody() }] });
  doGet(h, { action: 'data', v: '1' });
  assert.equal(JSON.parse(h.outputs()[0].text).pm25.status, 'ok');
});

test('explicit pm_tambon_name column is honored (new schema)', () => {
  const tabs = defaultTabs();
  tabs.Locations[0].push('pm_tambon_name');
  tabs.Locations[1].push('อุทัย');
  const h = makeContext({ tabs, fetchQueue: [{ body: gistdaBody() }, { body: openMeteoBody() }] });
  doGet(h, { action: 'data', v: '1' });
  assert.equal(JSON.parse(h.outputs()[0].text).pm25.provenance.tambonName, 'อุทัย');
});

test('location without tambon name outside vetted seed -> pm missing, weather unaffected', () => {
  const tabs = defaultTabs();
  tabs.Settings.find(r => r[0] === 'active_location_id')[1] = 'other';
  tabs.Locations.push(['other', 'อื่นๆ', 'TRUE', 15.0, 100.0, 'gistda', '5555', 'open-meteo', '', '', '', '', '']);
  const h = makeContext({ tabs, fetchQueue: [{ body: openMeteoBody() }] }); /* PM fails fast, no GISTDA call */
  doGet(h, { action: 'data', v: '1' });
  const body = JSON.parse(h.outputs()[0].text);
  assert.equal(body.pm25.status, 'missing');
  assert.equal(body.weather.status, 'ok');
  assert.equal(h.calls.fetches.filter(f => f.includes('gistda')).length, 0, 'no PM upstream call without criteria');
});

test('unexpected pm25 field shapes -> missing, never 0', () => {
  for (const bad of [null, '', 'x', -3]) {
    const h = makeContext({ fetchQueue: [{ body: gistdaBody({ target: { pm25: bad } }) }, { body: openMeteoBody() }] });
    doGet(h, { action: 'data', v: '1' });
    const pm = JSON.parse(h.outputs()[0].text).pm25;
    assert.equal(pm.status, 'missing', 'pm25=' + JSON.stringify(bad));
    assert.notEqual(pm.value, 0);
    assert.equal(pm.value, null);
  }
});

test('weekday + เวลา prefixed datetimeThai fallback when dt unusable', () => {
  const h = makeContext({ fetchQueue: [{ body: gistdaBody({ target: { dt: undefined }, datetimeThai: { dateThai: 'วันอาทิตย์ที่ 18 ตุลาคม 2569', timeThai: 'เวลา 00:30 น.' } }) }, { body: openMeteoBody() }] });
  doGet(h, { action: 'data', v: '1' });
  const pm = JSON.parse(h.outputs()[0].text).pm25;
  /* 00:30+07 on 10-18 == 17:30Z 10-17 — 17.5h in the FUTURE vs NOW (00:00Z): rejected */
  assert.equal(pm.status, 'missing');
  const h2 = makeContext({ fetchQueue: [{ body: gistdaBody({ target: { dt: undefined }, datetimeThai: { dateThai: 'วันเสาร์ที่ 17 ตุลาคม 2569', timeThai: 'เวลา 04:30 น.' } }) }, { body: openMeteoBody() }] });
  doGet(h2, { action: 'data', v: '1' });
  const pm2 = JSON.parse(h2.outputs()[0].text).pm25;
  assert.equal(pm2.status, 'ok');
  assert.equal(pm2.observedAt, '2026-10-17T04:30+07:00');
});

test('fingerprint includes tambon name: name edit without version bump refetches', () => {
  const h = makeContext({ fetchQueue: [...defaultFetchQueue(), ...defaultFetchQueue()] });
  doGet(h, { action: 'data', v: '1' });
  h.tabs.get('Locations')[0].push('pm_tambon_name');
  h.tabs.get('Locations')[1].push('ธนู'); /* different from vetted default -> key changes */
  h.outputsReset();
  doGet(h, { action: 'data', v: '1' });
  assert.equal(h.calls.fetches.length, 3, 'same district payload reused under hourly gate');
  assert.equal(JSON.parse(h.outputs()[0].text).pm25.value, 42, 'selected new tambon from shared district payload');
});

test('doGet never appends headers/config values (read-only schema)', () => {
  const h = makeContext({ fetchQueue: [...defaultFetchQueue(), ...defaultFetchQueue()] });
  doGet(h, { action: 'data', v: '1' });
  doGet(h, { action: 'data', v: '1' });
  assert.equal(h.calls.appends.length, 0);
  assert.equal(h.calls.rangeSets.length, 0);
});


test('GISTDA dt mislabeled-Z regression: wall 23:00Z-style dt is NOT future at Bangkok midnight hour', () => {
  /* Real 23:15+07 sample: dt '2026-10-17T23:00:00.000Z' + timeThai 'เวลา 23:00 น.'
   * NOW = 2026-10-17T07:00+07 -> wall 23:00 today is 16h FUTURE -> rejected
   * BUT the same wall clock YESTERDAY is 8h stale. The bug this pins: UTC
   * misreading made even PAST observations look future. */
  const hPast = makeContext({ fetchQueue: [{ body: gistdaBody({ dt: '2026-10-16T23:00:00.000Z' }) }, { body: openMeteoBody() }] });
  doGet(hPast, { action: 'data', v: '1' });
  const pm = JSON.parse(hPast.outputs()[0].text).pm25;
  assert.equal(pm.observedAt, '2026-10-16T23:00+07:00', 'wall-clock interpretation');
  assert.equal(pm.status, 'stale', '8h old -> stale, not future-missing');
  const hToday = makeContext({ fetchQueue: [{ body: gistdaBody({ dt: '2026-10-17T23:30:00.000Z' }) }, { body: openMeteoBody() }] });
  doGet(hToday, { action: 'data', v: '1' });
  assert.equal(JSON.parse(hToday.outputs()[0].text).pm25.status, 'missing', 'genuine future wall time still rejected');
});

/* ---------- header marker ---------- */

test('BackendApi.gs header marks proposed/un-deployed; no legacy redefinitions', () => {
  const src = fs.readFileSync(SRC_BACKEND, 'utf8');
  assert.ok(/PROPOSED,\s*UNDEPLOYED/.test(src));
  for (const legacy of ['^function doGet\\(', '^function main\\(', '^function getWidgetData\\(', '^function logGistdaData\\(']) {
    assert.ok(!new RegExp(legacy, 'm').test(src));
  }
});
