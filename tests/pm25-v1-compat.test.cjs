/* PM v1 data-route backward compatibility (2026-10-31).
 * The DEPLOYED legacy client (git c3bbbc8:led-rotation.js, blob
 * d16a94f074ea46ed50d7678eadd44e772dd77780) derives its band from the HOURLY
 * value with the pre-2026 cutoffs (>=26/38/51/91, inclusive) and fails closed
 * on ANY disagreement. The backend therefore adapts ONLY the
 * action=data&v=1 response (on a clone): band = legacy hourly cutoffs,
 * avg24hBand = 2026 band of the rounded 24h average,
 * bandBasis = 'hourly-legacy'. The cached channel and the snapshot_v1 route
 * keep the canonical avg-based band. The ACTUAL old normalizer is loaded via
 * read-only `git show` into a vm — both rollout orders are proven here. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { makeContext, doGet, defaultFetchQueue, gistdaBody, openMeteoBody, NOW_MS } = require('./backend-harness.cjs');
const frontend = require('../led-rotation.js');

const OLD_REF = 'c3bbbc8:led-rotation.js';
const OLD_BLOB_SHA = 'd16a94f074ea46ed50d7678eadd44e772dd77780';

let oldSource = null;
try {
  const sha = execFileSync('git', ['rev-parse', OLD_REF],
    { cwd: path.join(__dirname, '..'), encoding: 'utf8' }).trim();
  assert.equal(sha, OLD_BLOB_SHA, 'unexpected ' + OLD_REF + ' blob: ' + sha);
  oldSource = execFileSync('git', ['show', OLD_REF],
    { cwd: path.join(__dirname, '..'), encoding: 'utf8' });
} catch (e) { oldSource = null; }
const skipReason = oldSource ? false : 'git history for ' + OLD_REF + ' unavailable in this checkout';

/* Loads the ACTUAL previous client in a vm sandbox (same pattern as the
 * led-rotation JSONP sandbox) and returns its exported normalizer. */
function loadOldNormalizer() {
  const sandbox = { window: {}, console, Date, Math, Intl, Object, Number, String,
    Array, RegExp, JSON, Boolean, Promise, Error, TypeError, AbortController,
    module: { exports: {} }, globalThis: null, setTimeout, clearTimeout };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(oldSource, sandbox, { filename: 'led-rotation@c3bbbc8.js' });
  return sandbox.module.exports;
}

test('old c3bbbc8 client accepts the adapted action=data&v=1 JSON envelope (divergent hourly 20.9 vs avg 18.9)', { skip: skipReason }, () => {
  const old = loadOldNormalizer();
  const h = makeContext({ fetchQueue: defaultFetchQueue() }); /* hourly 20.9, avg 18.9 */
  doGet(h, { action: 'data', v: '1' });
  const raw = JSON.parse(h.outputs()[0].text);
  /* adapted envelope on the wire */
  assert.equal(raw.pm25.band, 'very_good');        /* legacy hourly cutoffs */
  assert.equal(raw.pm25.avg24hBand, 'good');       /* 2026 band of avg 18.9 */
  assert.equal(raw.pm25.bandBasis, 'hourly-legacy');
  /* OLD client: derives legacy(hourly)=very_good, sees a MATCHING band.
   * (Cross-realm arrays: assert by value, not deepEqual.) */
  const state = old.normalizePayload(raw, NOW_MS);
  assert.equal(state.errors.length, 0, 'errors: ' + JSON.stringify(state.errors));
  assert.equal(state.pm.status, 'ok');
  assert.equal(state.pm.value, 20.9);
  assert.equal(state.pm.moodKey, 'good');          /* old mood from hourly 20.9 -> very_good */
  /* SAME envelope drives the NEW client to the 2026 mood from the average */
  const fresh = frontend.normalizePayload(raw, NOW_MS);
  assert.deepEqual(fresh.errors, []);
  assert.equal(fresh.pm.status, 'ok');
  assert.equal(fresh.pm.moodKey, 'moderate');      /* avg 18.9 -> good (2026) */
});

test('old client accepts the JSONP-wrapped adapted envelope', { skip: skipReason }, () => {
  const old = loadOldNormalizer();
  const h = makeContext({ fetchQueue: defaultFetchQueue() });
  doGet(h, { action: 'data', v: '1', callback: 'cb_compat' });
  const o = h.outputs()[0];
  assert.equal(o.mime, 'JAVASCRIPT');
  const inner = o.text.slice(o.text.indexOf('(') + 1, o.text.lastIndexOf(')'));
  const state = old.normalizePayload(JSON.parse(inner), NOW_MS);
  assert.equal(state.errors.length, 0, 'errors: ' + JSON.stringify(state.errors));
  assert.equal(state.pm.status, 'ok');
  assert.equal(state.pm.moodKey, 'good');
});

test('old client accepts the adapted envelope when the 24h average is absent this refresh', { skip: skipReason }, () => {
  const old = loadOldNormalizer();
  const h = makeContext({ fetchQueue: [{ body: gistdaBody({ target: { pm25Avg24hr: null } }) }, { body: openMeteoBody() }] });
  doGet(h, { action: 'data', v: '1' });
  const raw = JSON.parse(h.outputs()[0].text);
  assert.equal(raw.pm25.avg24h, null);
  assert.equal(raw.pm25.avg24hBand, null);
  assert.equal(raw.pm25.band, 'very_good');        /* legacy of hourly 20.9 — old client agrees */
  const state = old.normalizePayload(raw, NOW_MS);
  assert.equal(state.errors.length, 0, 'errors: ' + JSON.stringify(state.errors));
  assert.equal(state.pm.status, 'ok');
  /* new client: no average -> grey mood, hourly value preserved for display */
  const fresh = frontend.normalizePayload(raw, NOW_MS);
  assert.deepEqual(fresh.errors, []);
  assert.equal(fresh.pm.moodKey, 'unavailable');
  assert.equal(fresh.pm.value, 20.9);
});

/* Builds a harness with the REAL HourlySnapshot.gs loaded and a stored pm25
 * snapshot channel carrying the canonical avg-based band ('good' for 18.9). */
function snapshotHarness() {
  const h = makeContext({ fetchQueue: defaultFetchQueue(), props: [['widget_snapshot_mode_v1', 'enabled']] });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'HourlySnapshot.gs'), 'utf8'),
    h.ctx, { filename: 'HourlySnapshot.gs' });
  const cfg = h.ctx.BackendApi.loadConfig();
  const fp = h.ctx.BackendApi.locationFingerprint(cfg.active);
  const pmRow = JSON.stringify({
    status: 'ok', value: 20.9, avg24h: 18.9, unit: 'µg/m³',
    observedAt: '2026-10-17T06:05+07:00', source: 'GISTDA snapshot fixture',
    band: 'good', provenance: null,
  });
  const wxRow = JSON.stringify({
    status: 'ok', temperatureC: 29.4, humidityPct: 78, weatherCode: 80,
    tmaxC: 33.1, tminC: 25.2, rainPct: 55, observedAt: '2026-10-16T23:30:00.000Z',
    forecastDate: '2026-10-17', source: 'Open-Meteo weather model',
  });
  h.tabs.set('Widget_Hourly_Snapshots', [
    ['record_type', 'location_id', 'location_fingerprint', 'channel', 'observed_at', 'saved_at', 'payload_json'],
    ['widget_snapshot_v1', 'uthai', fp, 'pm25', '2026-10-16T23:05:00.000Z', '2026-10-16T23:40:00.000Z', pmRow],
    ['widget_snapshot_v1', 'uthai', fp, 'weather', '2026-10-16T23:30:00.000Z', '2026-10-16T23:40:00.000Z', wxRow],
  ]);
  return { h, before: pmRow };
}

test('snapshot mode: data route adapts on a clone; snapshot_v1 keeps the raw avg band; zero provider fetches', () => {
  const { h, before } = snapshotHarness();
  doGet(h, { action: 'data', v: '1' });
  assert.equal(h.calls.fetches.length, 0, 'snapshot mode never fetches providers');
  const raw = JSON.parse(h.outputs()[0].text);
  h.outputsReset();
  assert.equal(raw.pm25.status, 'ok');
  assert.equal(raw.pm25.band, 'very_good');
  assert.equal(raw.pm25.avg24hBand, 'good');
  assert.equal(raw.pm25.bandBasis, 'hourly-legacy');
  /* the stored snapshot row is NOT mutated by the response transform */
  const row = h.tabs.get('Widget_Hourly_Snapshots')[1];
  assert.equal(row[6], before);
  assert.equal(JSON.parse(row[6]).band, 'good');
  /* snapshot_v1 route unchanged: raw avg-based band, no adapter metadata */
  doGet(h, { action: 'snapshot_v1' });
  const snap = JSON.parse(h.outputs()[0].text);
  assert.equal(snap.channels.pm25.data.band, 'good');
  assert.equal(snap.channels.pm25.data.avg24hBand, undefined);
  assert.equal(snap.channels.pm25.data.bandBasis, undefined);
  /* the same adapted response also passes the new normalizer */
  const fresh = frontend.normalizePayload(raw, NOW_MS);
  assert.deepEqual(fresh.errors, []);
  assert.equal(fresh.pm.moodKey, 'moderate');
});

test('live mode: the response transform never rewrites the cached channel', () => {
  const h = makeContext({ fetchQueue: defaultFetchQueue() });
  doGet(h, { action: 'data', v: '1' });
  let cached = null;
  for (const entry of h.cacheStore.values()) {
    /* harness cache stores {v:"<json>",exp}; the backend cached the RAW channel */
    const raw = entry && typeof entry === 'object' && typeof entry.v === 'string' ? entry.v : null;
    let parsed; try { parsed = raw ? JSON.parse(raw) : entry; } catch { continue; }
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) &&
        parsed.status === 'ok' && parsed.unit === 'µg/m³' && 'avg24h' in parsed) cached = parsed;
  }
  assert.ok(cached, 'pm25 channel expected in the script cache');
  assert.equal(cached.band, 'good');          /* canonical avg-based band */
  assert.equal(cached.avg24hBand, undefined); /* adapter metadata never cached */
  assert.equal(cached.bandBasis, undefined);
});

test('client-first order: new normalizer accepts the current (pre-fix) backend payload shape', () => {
  /* avg-based band, no adapter metadata — what the backend emitted before this fix */
  const raw = { schema: 1, generatedAt: '2026-10-17T00:00:00Z',
    pm25: { status: 'ok', value: 20.9, avg24h: 18.9, unit: 'µg/m³',
      observedAt: '2026-10-17T06:05+07:00', source: 'GISTDA', band: 'good' },
    weather: { status: 'ok', temperatureC: 29.4, humidityPct: 78, weatherCode: 80,
      tmaxC: 33.1, tminC: 25.2, rainPct: 55, observedAt: '2026-10-17T06:30+07:00',
      forecastDate: '2026-10-17', source: 'OPEN_METEO' },
    water: { status: 'missing', available: false, value: null, unit: 'm',
      observedAt: null, source: 'NONE' }, errors: [] };
  const s = frontend.normalizePayload(raw, NOW_MS);
  assert.deepEqual(s.errors, []);
  assert.equal(s.pm.status, 'ok');
  assert.equal(s.pm.moodKey, 'moderate'); /* avg decides; band never masquerades */
});

test('v1 route boundary fixtures: avg24hBand uses the canonical 2026 cutoffs on the rounded average', () => {
  const avgCases = [
    [15, 'very_good'], [15.1, 'good'], [25, 'good'], [25.1, 'moderate'],
    [37.5, 'moderate'], [37.6, 'unhealthy_sensitive'], [75, 'unhealthy_sensitive'], [75.1, 'unhealthy'],
  ];
  for (const [avg, want] of avgCases) {
    const h = makeContext({ fetchQueue: [{ body: gistdaBody({ target: { pm25Avg24hr: avg } }) }, { body: openMeteoBody() }] });
    doGet(h, { action: 'data', v: '1' });
    const raw = JSON.parse(h.outputs()[0].text);
    assert.equal(raw.pm25.status, 'ok', 'avg=' + avg);
    assert.equal(raw.pm25.avg24h, avg, 'rounded avg passthrough at avg=' + avg);
    assert.equal(raw.pm25.avg24hBand, want, '2026 band at avg=' + avg);
    assert.equal(raw.pm25.band, 'very_good', 'legacy band of hourly 20.9 at avg=' + avg);
    assert.equal(raw.pm25.bandBasis, 'hourly-legacy', 'basis marker at avg=' + avg);
  }
});

test('v1 route legacy band boundaries on the hourly value (inclusive >=26/38/51/91)', () => {
  const cases = [
    [25.9, 'very_good'], [26, 'good'], [37.9, 'good'], [38, 'moderate'],
    [50.9, 'moderate'], [51, 'unhealthy_sensitive'], [90.9, 'unhealthy_sensitive'], [91, 'unhealthy'],
  ];
  for (const [value, want] of cases) {
    const h = makeContext({ fetchQueue: [{ body: gistdaBody({ pm25: value, target: { pm25Avg24hr: value } }) }, { body: openMeteoBody() }] });
    doGet(h, { action: 'data', v: '1' });
    const raw = JSON.parse(h.outputs()[0].text);
    assert.equal(raw.pm25.band, want, 'legacy band at hourly=' + value);
    assert.equal(raw.pm25.avg24hBand, frontend.pmBandKey(value), '2026 avg band at hourly=' + value);
  }
});
