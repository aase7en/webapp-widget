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
  /* PM: 20.9 -> very_good -> mood good */
  assert.equal(state.pm.status, 'ok');
  assert.equal(state.pm.value, 20.9);
  assert.equal(state.pm.moodKey, 'good');
  assert.equal(state.pm.observedAt, '2026-10-17T06:05+07:00');
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

test('band agreement: backend band always equals frontend pmBandKey on the EMITTED value', () => {
  for (const pm of [10, 25.9, 26, 37.5, 38.2, 51, 75, 91, 130]) {
    const h = makeContext({ fetchQueue: [{ body: gistdaBody({ pm25: pm }) }, { body: openMeteoBody() }] });
    const raw = backendPayload(h);
    assert.equal(raw.pm25.status, 'ok', 'pm=' + pm);
    assert.equal(raw.pm25.band, frontend.pmBandKey(raw.pm25.value), 'band drift at pm=' + pm);
    const state = frontend.normalizePayload(raw, NOW_MS);
    assert.equal(state.pm.status, 'ok', 'frontend accepts pm=' + pm);
    assert.deepEqual(state.errors, [], 'no band-conflict at pm=' + pm);
  }
});

test('tampered band string in an otherwise valid payload fails closed (both sides pin this)', () => {
  const h = makeContext({ fetchQueue: defaultFetchQueue() });
  const raw = backendPayload(h);
  raw.pm25.band = 'good'; /* tampered: value 20.9 is very_good */
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
