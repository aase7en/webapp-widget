/* Golden cross-module contract test: a REAL BackendApi.gs payload (built in
 * the VM harness) must pass the REAL frontend normalizePayload from
 * led-rotation.js — so backend/frontend envelope drift fails CI. The frontend
 * file is loaded READ-ONLY (backend never edits it). */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { makeContext, doGet, defaultFetchQueue, gistdaBody, openMeteoBody, NOW_MS } = require('./backend-harness.cjs');

const frontend = require(path.join(__dirname, '..', 'led-rotation.js'));
const pm25Tier = require(path.join(__dirname, '..', 'v2', 'pm25-tier.js'));

/* Backend band key -> 2026 tier key, the exact vocabulary Map pm25-live.js uses. */
const BAND_VOCABULARY = new Map([['very_good', 'blue'], ['good', 'green'], ['moderate', 'yellow'], ['unhealthy_sensitive', 'orange'], ['unhealthy', 'red']]);

function backendPayload(h) {
  doGet(h, { action: 'data', v: '1' });
  const raw = JSON.parse(h.outputs()[0].text);
  h.outputsReset();
  return raw;
}

test('frontend normalizePayload accepts a real fresh BackendApi payload', () => {
  const h = makeContext({ fetchQueue: defaultFetchQueue() });
  const raw = backendPayload(h);
  const state = frontend.normalizePayload(raw, NOW_MS);
  assert.deepEqual(state.errors, []);
  /* PM: hourly 20.9 stays the display value; the 2026 mood comes from the
   * 24h average 18.9 -> good (2026) -> mood moderate. The wire band is the
   * legacy hourly derivation with explicit adapter metadata. */
  assert.equal(state.pm.status, 'ok');
  assert.equal(state.pm.value, 20.9);
  assert.equal(state.pm.moodKey, 'moderate');
  assert.equal(state.pm.observedAt, '2026-10-17T06:05+07:00');
  assert.equal(raw.pm25.band, 'very_good');
  assert.equal(raw.pm25.avg24hBand, 'good');
  assert.equal(raw.pm25.bandBasis, 'hourly-legacy');
  /* weather: temp+rh -> frontend derives HI locally */
  assert.equal(state.weather.status, 'ok');
  assert.equal(state.weather.tempC, 29.4);
  assert.equal(state.weather.code, 80);
  assert.equal(state.weather.rainPct, 55);
  const hi = frontend.heatCelsius(29.4, 78);
  assert.ok(state.weather.hiC > 30 && Math.abs(state.weather.hiC - hi) < 1e-9);
  /* water stays unavailable; no unapproved-claim error; provenance passes through */
  assert.equal(state.water.status, 'unavailable');
  assert.equal(state.water.value, null);
  assert.equal(state.water.provenance.provider, 'none');
  assert.equal(state.water.provenance.unit, 'm');
});

test('frontend normalizer greys a real STALE BackendApi payload (no fabricated freshness)', () => {
  const h = makeContext({ fetchQueue: [{ body: gistdaBody({ dt: '2026-10-17T02:00:00.000Z' }) }, { body: openMeteoBody({ current: { time: '2026-10-17T02:00', temperature_2m: 30, relative_humidity_2m: 70, weather_code: 3 } }) }] });
  const raw = backendPayload(h);
  const state = frontend.normalizePayload(raw, NOW_MS);
  assert.equal(raw.pm25.status, 'stale');
  assert.equal(state.pm.status, 'unavailable', 'frontend greys stale per contract');
  assert.ok(state.errors.some(e => e.includes('pm25-stale')));
});

test('frontend normalizer fail-closes a real MISSING weather channel', () => {
  const h = makeContext({ fetchQueue: [{ body: gistdaBody() }, { error: new Error('down') }] });
  const raw = backendPayload(h);
  const state = frontend.normalizePayload(raw, NOW_MS);
  assert.equal(state.pm.status, 'ok');
  assert.equal(state.weather.status, 'unavailable');
});

test('v1 wire contract: band = legacy hourly cutoffs, avg24hBand = 2026 band of the rounded average, at every relevant point', () => {
  /* the derivation the DEPLOYED c3bbbc8 client re-computes and enforces */
  const legacyBandKey = v => {
    if (typeof v !== 'number' || !isFinite(v) || v < 0) return null;
    for (const [cut, key] of [[91, 'unhealthy'], [51, 'unhealthy_sensitive'], [38, 'moderate'], [26, 'good']])
      if (v >= cut) return key;
    return 'very_good';
  };
  const points = [10, 15, 15.1, 16, 25, 25.1, 26, 37.5, 37.6, 38, 75, 75.1, 76, 130];
  for (const pm of points) {
    const h = makeContext({ fetchQueue: [{ body: gistdaBody({ pm25: pm, target: { pm25Avg24hr: pm } }) }, { body: openMeteoBody() }] });
    const raw = backendPayload(h);
    assert.equal(raw.pm25.status, 'ok', 'pm=' + pm);
    assert.equal(raw.pm25.avg24h, pm, 'rounded avg passthrough at pm=' + pm);
    /* wire band = the old client's own hourly derivation (inclusive legacy cutoffs) */
    assert.equal(raw.pm25.band, legacyBandKey(raw.pm25.value), 'legacy band drift at pm=' + pm);
    /* explicit metadata = the canonical 2026 band of the EMITTED average */
    assert.equal(raw.pm25.avg24hBand, frontend.pmBandKey(raw.pm25.avg24h), 'avg-band drift at avg=' + pm);
    assert.equal(raw.pm25.bandBasis, 'hourly-legacy', 'basis marker at pm=' + pm);
    /* the avg-band metadata passes PM25Tier.classify without conflict, landing
     * on the vocabulary's tier key (what pm25-live.js renders) */
    const cls = pm25Tier.classify(
      { value: raw.pm25.avg24h, observedAt: raw.pm25.observedAt, status: 'latest', unit: 'µg/m³', band: raw.pm25.avg24hBand },
      { now: NOW_MS, bandVocabulary: BAND_VOCABULARY });
    assert.equal(cls.conflict, false, 'band-conflict at avg=' + pm);
    assert.equal(cls.key, BAND_VOCABULARY.get(raw.pm25.avg24hBand), 'tier key mismatch at avg=' + pm);
    assert.equal(cls.isHealthTier, true, 'health tier at avg=' + pm);
    /* the NEW frontend normalizer accepts the adapted envelope and takes the
     * 2026 mood from the average — never from the legacy wire band */
    const state = frontend.normalizePayload(raw, NOW_MS);
    assert.equal(state.pm.status, 'ok', 'frontend accepts pm=' + pm);
    assert.deepEqual(state.errors, [], 'no band-conflict at pm=' + pm);
    const moodByBand = { very_good: 'good', good: 'moderate', moderate: 'unhealthy', unhealthy_sensitive: 'protective', unhealthy: 'severe' };
    assert.equal(state.pm.moodKey, moodByBand[raw.pm25.avg24hBand], 'mood mapping at avg=' + pm);
  }
});

test('conflicting avg-band metadata on the wire fails closed for new consumers', () => {
  const h = makeContext({ fetchQueue: defaultFetchQueue() });
  const raw = backendPayload(h);
  assert.equal(raw.pm25.avg24hBand, 'good'); /* avg 18.9 */
  raw.pm25.avg24hBand = 'moderate'; /* disagrees with the 2026 derivation of 18.9 */
  const state = frontend.normalizePayload(raw, NOW_MS);
  assert.equal(state.pm.status, 'unavailable');
  assert.ok(state.errors.some(e => e.includes('pm25-avg-band-conflict')));
});

test('tampered band string (outside the 2026 vocabulary) fails closed (both sides pin this)', () => {
  const h = makeContext({ fetchQueue: defaultFetchQueue() });
  const raw = backendPayload(h);
  raw.pm25.band = 'hazard'; /* not in the vocabulary: very_good/good/moderate/unhealthy_sensitive/unhealthy */
  const state = frontend.normalizePayload(raw, NOW_MS);
  assert.equal(state.pm.status, 'unavailable');
  assert.ok(state.errors.some(e => e.includes('pm25-band-conflict')));
});

test('JSONP-wrapped payload body is the same contract object', () => {
  const h = makeContext({ fetchQueue: defaultFetchQueue() });
  doGet(h, { action: 'data', v: '1', callback: 'cb1' });
  const o = h.outputs()[0];
  assert.equal(o.mime, 'JAVASCRIPT');
  const inner = o.text.slice(o.text.indexOf('(') + 1, o.text.lastIndexOf(')'));
  const state = frontend.normalizePayload(JSON.parse(inner), NOW_MS);
  assert.equal(state.pm.status, 'ok');
});
