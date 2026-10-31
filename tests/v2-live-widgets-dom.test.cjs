/* VM DOM contract test for v2/live-widgets.js (2026-10-31 PM contract).
 * Runs the REAL module IIFE against a minimal fake DOM and drives paintPm()
 * through UthApiClient.getLive() — no regex source scraping. Contract:
 * the mascot/badge mood REQUIRES a valid avg24h; the plain band string never
 * decides the mood alone; explicit avg-band metadata (avg24hBand) must agree
 * with the 2026 derivation of the average; out-of-vocabulary bands fail
 * closed to the grey unavailable tier while the hourly number stays visible. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRC = path.join(__dirname, '..', 'v2', 'live-widgets.js');
const OBS = new Date(Date.now() - 10 * 60000).toISOString();

function makeEl(sel) {
  const el = {
    tag: sel, children: {}, dataset: {}, attrs: {}, textContent: '', src: '',
    title: '', hidden: false, lastChild: { textContent: '' },
    style: { setProperty(k, v) { el.style[k] = v; } },
    classList: { toggle() {}, add() {}, remove() {}, contains: () => false },
    querySelector(s) { if (!el.children[s]) el.children[s] = makeEl(s); return el.children[s]; },
    querySelectorAll() { return { forEach() {} }; },
    addEventListener() {}, appendChild() {}, remove() {}, click() {},
  };
  return el;
}

/* Fresh DOM + module instance per case; getLive() resolves the controlled
 * payload, exactly the shape v2/api-client.js whitelists from snapshot_v1
 * (and, hypothetically, the adapted data route). */
function runWith(pm25, weatherStatus) {
  const registry = {};
  for (const sel of ['#pm', '.mascot', '.pm-num', '.pm-status .pill', '.pm-status .pill i',
    '.pm-status .sub', '.scalePM .levels', '#pm-provenance', '.climate', '.climate-temp',
    '.climate-humidity-value', '.climate-wind', '#pm-live-frame', '#refresh-all']) {
    registry[sel] = makeEl(sel);
  }
  const doc = {
    querySelector: sel => registry[sel] || (registry[sel] = makeEl(sel)),
    createElement: tag => makeEl(tag),
    head: { appendChild() {} },
  };
  const ctx = {
    document: doc,
    location: { origin: 'https://test.local' },
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    Date, Math, console,
    UthaiLEDRotation: { BACKEND_URL: 'https://exec.example' },
    UthApiClient: { getLive: async () => ({ pm25, weather: { status: weatherStatus || 'unavailable' } }) },
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(SRC, 'utf8'), ctx, { filename: 'live-widgets.js' });
  /* flush the refresh() microtask chain */
  return Promise.all([new Promise(r => setImmediate(r)), new Promise(r => setImmediate(r))])
    .then(() => registry);
}

const base = over => Object.assign({
  status: 'latest', value: 20.9, avg24h: 18.9, unit: 'µg/m³',
  observedAt: OBS, source: 'GISTDA', band: 'good',
}, over);

test('no usable avg24h -> grey unavailable tier while the hourly number stays visible', async () => {
  for (const avg of [null, undefined, NaN, -1]) {
    const dom = await runWith(base({ avg24h: avg }));
    assert.equal(dom['#pm'].dataset.pmBand, 'unavailable', 'avg=' + avg);
    assert.equal(dom['.pm-num'].textContent, '20.9', 'hourly kept, avg=' + avg);
    assert.equal(dom['.pm-status .pill'].lastChild.textContent, ' รอข้อมูล', 'avg=' + avg);
    assert.equal(dom['.pm-status .sub'].textContent, 'รอค่าเฉลี่ย 24 ชม.', 'avg=' + avg);
    assert.equal(dom['.mascot'].style['--lid-color'], '#8c9ba8', 'grey shade, avg=' + avg);
  }
});

test('old-backend shape (vocabulary band, no avg24h at all) cannot masquerade as 24h', async () => {
  const dom = await runWith({ status: 'latest', value: 70, unit: 'µg/m³', observedAt: OBS, source: 'GISTDA', band: 'unhealthy_sensitive' });
  assert.equal(dom['#pm'].dataset.pmBand, 'unavailable'); /* band alone never decides */
  assert.equal(dom['.pm-num'].textContent, '70.0');      /* hourly number kept */
});

test('snapshot shape (raw avg-based band) renders the 2026 mood from the average', async () => {
  const dom = await runWith(base({ band: 'good' }));
  assert.equal(dom['#pm'].dataset.pmBand, 'moderate'); /* avg 18.9 -> good (2026) */
  assert.equal(dom['.pm-num'].textContent, '20.9');
});

test('adapted v1 envelope (legacy band + avg24hBand + bandBasis) renders the avg-driven mood', async () => {
  const dom = await runWith(base({ value: 20.9, avg24h: 18.9, band: 'very_good', avg24hBand: 'good' }));
  assert.equal(dom['#pm'].dataset.pmBand, 'moderate'); /* NOT the legacy very_good mood */
  assert.equal(dom['.pm-num'].textContent, '20.9');
});

test('conflicting avg-band metadata fails closed; out-of-vocabulary band fails closed', async () => {
  const conflict = await runWith(base({ avg24h: 18.9, band: 'very_good', avg24hBand: 'moderate' }));
  assert.equal(conflict['#pm'].dataset.pmBand, 'unavailable');
  const vocab = await runWith(base({ band: 'hazard', avg24hBand: undefined }));
  assert.equal(vocab['#pm'].dataset.pmBand, 'unavailable'); /* unknown band -> grey even with valid avg */
});

test('2026 boundary fixtures classify from the average at every canonical edge', async () => {
  const cases = [
    [15, 'good'], [15.1, 'moderate'], [25, 'moderate'], [25.1, 'unhealthy'],
    [37.5, 'unhealthy'], [37.6, 'protective'], [75, 'protective'], [75.1, 'severe'],
  ];
  for (const [avg, mood] of cases) {
    const dom = await runWith(base({ value: avg, avg24h: avg, band: null, avg24hBand: undefined }));
    assert.equal(dom['#pm'].dataset.pmBand, mood, 'avg=' + avg);
  }
});

test('non-latest status keeps the reset path: dash, grey, wait badge', async () => {
  const dom = await runWith({ status: 'stale', value: null });
  assert.equal(dom['.pm-num'].textContent, '—');
  assert.equal(dom['#pm'].dataset.pmBand, 'unavailable');
  assert.equal(dom['#pm-provenance'].textContent, 'PM2.5: UNAVAILABLE · ไม่มีค่าที่สดและตรวจสอบได้');
});
