/* VM DOM contract test for v2/weather-luxury.js against REAL snapshot shapes.
 * Reproduces the 2026-11-01 production outage: GitHub dropped the hourly
 * transport-cache runs, the backend's direct Open-Meteo attempt hit HTTP 429
 * (weatherDiagnostic.status='failed'), and snapshot_v1 served only the pm25
 * channel for ~1 h. Contract proven here against the REAL renderer + REAL
 * parser (no regex scraping, no demo boundary splice):
 *   1. a degraded payload (no weather/forecast channel) paints fail-safe
 *      placeholders — no exception, no fabricated values, graph cleared;
 *   2. a fresh good payload renders data end-to-end (incl. the span
 *      data-condition forecast minis and the 7-stop trend gradient);
 *   3. a degraded payload after a good one keeps lastGood on screen
 *      (transient backend failures never blank a working board). */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SNAPSHOT_SRC = path.join(__dirname, '..', 'v2', 'weather-snapshot.js');
const LUXURY_SRC = path.join(__dirname, '..', 'v2', 'weather-luxury.js');
const WORKFLOW = path.join(__dirname, '..', '.github', 'workflows', 'weather-cache-publish.yml');

function makeEl(tag) {
  const el = {
    tag, children: [], dataset: {}, attrs: {}, textContent: '', src: '', hidden: false,
    style: { setProperty(k, v) { el.style[k] = v; } },
    setAttribute(k, v) { el.attrs[k] = v; },
    getAttribute(k) { return k in el.attrs ? el.attrs[k] : null; },
    removeAttribute(k) { delete el.attrs[k]; },
    appendChild(c) { el.children.push(c); return c; },
    append(...cs) { cs.forEach(c => el.children.push(c)); },
    removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); return c; },
    remove() {},
    get firstChild() { return el.children[0] || null; },
    addEventListener() {},
  };
  return el;
}

function harness(initialFixture, seedStorage, fetchImpl) {
  const registry = {};
  for (const sel of ['#temp', '#feels', '#temp-guidance', '#rain', '#humidity', '#high', '#low',
    '#days', '#graphfill', '#line', '#area', '#points', '#time', '#date', '.temp',
    '#icon', '#scene', '#poster']) registry[sel] = makeEl(sel);
  const doc = {
    querySelector: sel => registry[sel] || (registry[sel] = makeEl(sel)),
    createElement: tag => makeEl(tag),
    createElementNS: (ns, tag) => makeEl(tag),
    createTextNode: text => ({ tag: '#text', textContent: text }),
    head: { appendChild() {} },
    hidden: false,
    addEventListener() {},
  };
  let fixture = initialFixture;
  const intervals = [];
  const ctx = {
    document: doc,
    location: { origin: 'https://test.local' },
    setTimeout: () => 0, clearTimeout() {},
    setInterval(fn, ms) { intervals.push({ fn, ms }); return intervals.length; }, clearInterval() {},
    Date, Math, console, Intl,
    addEventListener() {},
  };
  if (fetchImpl) ctx.fetch = fetchImpl;
  const storage = new Map();
  if (seedStorage) for (const [k, v] of seedStorage) storage.set(k, v);
  ctx.localStorage = {
    getItem: k => storage.has(k) ? storage.get(k) : null,
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: k => storage.delete(k),
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  doc.head.appendChild = node => {
    const cb = /callback=([A-Za-z0-9_$]+)/.exec(node.src);
    if (cb && ctx.window[cb[1]]) queueMicrotask(() => { const fn = ctx.window[cb[1]]; if (ctx.window[cb[1]]) fn(fixture); });
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(SNAPSHOT_SRC, 'utf8'), ctx, { filename: 'weather-snapshot.js' });
  vm.runInContext(fs.readFileSync(LUXURY_SRC, 'utf8'), ctx, { filename: 'weather-luxury.js' });
  const flush = () => Promise.all([new Promise(r => setImmediate(r)), new Promise(r => setImmediate(r))]);
  return {
    registry, storage, flush,
    setFixture(next) { fixture = next; },
    refresh: () => { const r = intervals.find(x => x.ms === 300000); assert.ok(r, 'refresh interval registered'); return r.fn(); },
  };
}

/* Boot a fresh instance with pre-seeded storage (simulates a reload during a
 * backend outage): no refresh is driven, only the boot path. */
function bootWithStorage(storage) {
  return harness(degradedPayload(Date.now()), storage);
}

/* Payload builders use the REAL backend envelope (schema 1, channels map,
 * weatherDiagnostic) as captured from production snapshot_v1. */
function degradedPayload(now) {
  return {
    schema: 1, status: 'ok', location: { id: 'uthai', lat: 14.36147, lon: 100.64424 },
    channels: { pm25: { observedAt: new Date(now - 3600000).toISOString(), savedAt: new Date(now - 120000).toISOString(), data: { pm25: 20.9 } } },
    weatherDiagnostic: { attemptedAt: new Date(now - 120000).toISOString(), status: 'failed', httpStatus: 429 },
  };
}
function goodPayload(now) {
  const iso = t => new Date(t).toISOString();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
  const currentHour = new Date(now + 7 * 3600000).toISOString().slice(0, 13) + ':00';
  const observed = now - 8 * 60000;
  const currentTime = new Date(observed + 7 * 3600000).toISOString().slice(0, 16);
  const days = Array.from({ length: 8 }, (_, i) => new Date(Date.parse(today + 'T00:00:00Z') + i * 86400000).toISOString().slice(0, 10));
  /* Open-Meteo with timezone=Asia/Bangkok returns Bangkok WALL-clock strings;
   * the parser matches them against the Bangkok wall hour of now. */
  const wall = t => new Date(t + 7 * 3600000).toISOString();
  const base = Date.parse(currentHour + ':00+07:00');
  const hourly = Array.from({ length: 24 }, (_, i) => wall(base + (i - 12) * 3600000).slice(0, 13) + ':00');
  return {
    schema: 1, status: 'ok', location: { id: 'uthai', lat: 14.36147, lon: 100.64424 },
    channels: {
      pm25: { observedAt: iso(now - 3600000), savedAt: iso(now - 120000), data: { pm25: 20.9 } },
      weather: { observedAt: iso(observed), savedAt: iso(now - 120000), data: { status: 'ok', temperatureC: 31.6, humidityPct: 61, weatherCode: 63, observedAt: iso(observed), source: 'Open-Meteo weather model', tmaxC: 35, tminC: 27, rainPct: 70, forecastDate: today } },
      forecast: {
        observedAt: iso(observed), savedAt: iso(now - 120000),
        data: {
          timezone: 'Asia/Bangkok',
          current_units: { temperature_2m: '°C', relative_humidity_2m: '%' },
          current: { time: currentTime, temperature_2m: 31.6, relative_humidity_2m: 61, weather_code: 63, wind_speed_10m: 12, is_day: 1, apparent_temperature: 36 },
          hourly_units: { precipitation_probability: '%' },
          hourly: { time: hourly, precipitation_probability: hourly.map((_, i) => (i === 12 ? 70 : (i % 4) * 10)) },
          daily_units: { temperature_2m_max: '°C', temperature_2m_min: '°C', precipitation_probability_max: '%' },
          daily: {
            time: days,
            temperature_2m_max: [35, 34, 33, 35, 36, 34, 33, 33],
            temperature_2m_min: [27, 26, 26, 27, 27, 26, 26, 25],
            precipitation_probability_max: [70, 55, 30, 15, 70, 35, 25, 20],
            weather_code: [63, 3, 2, 1, 95, 45, 2, 3],
          },
        },
      },
    },
  };
}

function miniIcons(daysEl) {
  return daysEl.children.map(day => {
    const ico = day.children[1];
    return ico && ico.dataset ? (ico.dataset.condition || '') : null;
  });
}

test('degraded snapshot (429 diagnostic, no weather channel) paints placeholders without throwing', async () => {
  const h = harness(degradedPayload(Date.now()));
  await h.flush();
  const r = h.registry;
  assert.equal(r['#temp'].textContent, '—', 'missing weather never becomes zero');
  assert.equal(r['#rain'].textContent, '—');
  assert.equal(r['#humidity'].textContent, '—');
  assert.equal(r['#icon'].dataset.condition, undefined, 'no icon condition invented');
  assert.equal(r['#icon'].src, '', 'no scene swap without data');
  assert.equal(r['#graphfill'].children.length, 0, 'trend gradient cleared');
  assert.equal(r['#line'].attrs.d, '', 'trend line cleared');
  assert.equal(r['#days'].children.length, 7, 'seven day slots keep layout');
  assert.deepEqual(miniIcons(r['#days']), ['', '', '', '', '', '', '']);
  assert.equal(r['#high'].textContent, '—', 'hi/lo stay placeholders, never zero');
});

test('a later good payload renders end-to-end on the 5-minute refresh path', async () => {
  const h = harness(degradedPayload(Date.now()));
  await h.flush();
  h.setFixture(goodPayload(Date.now()));
  h.refresh();
  await h.flush();
  const r = h.registry;
  assert.equal(r['#temp'].textContent, '32');
  assert.equal(r['#rain'].textContent, '70%');
  assert.equal(r['#high'].textContent, '35°');
  assert.equal(r['#icon'].dataset.condition, 'rain', 'real weatherCode 63 maps to rain');
  assert.match(r['#scene'].src, /rain\.webp$/);
  assert.match(r['#icon'].src, /rain\.apng\?v=20261106-storm-clarity-1$/);
  assert.equal(r['#graphfill'].children.length, 7, 'per-day trend gradient stops');
  assert.ok(r['#line'].attrs.d.startsWith('M'), 'trend path drawn');
  assert.equal(r['#days'].children.length, 7);
  assert.deepEqual(miniIcons(r['#days']), ['rain', 'cloudy', 'partly-cloudy', 'partly-cloudy', 'thunderstorm', 'fog', 'partly-cloudy']);
});

test('a degraded payload after a good one keeps lastGood on screen (no blanking)', async () => {
  const h = harness(degradedPayload(Date.now()));
  await h.flush();
  h.setFixture(goodPayload(Date.now()));
  h.refresh();
  await h.flush();
  h.setFixture(degradedPayload(Date.now()));
  h.refresh();
  await h.flush();
  const r = h.registry;
  assert.equal(r['#temp'].textContent, '32', 'last good weather persists');
  assert.equal(r['#icon'].dataset.condition, 'rain');
  assert.equal(r['#graphfill'].children.length, 7);
});

test('a good payload is persisted to localStorage for reload survival', async () => {
  const h = harness(degradedPayload(Date.now()));
  await h.flush();
  h.setFixture(goodPayload(Date.now()));
  h.refresh();
  await h.flush();
  const raw = h.storage.get('uth-weather-last-good');
  assert.ok(raw, 'last good payload stored');
  const parsed = JSON.parse(raw);
  assert.equal(parsed.channels.weather.data.temperatureC, 31.6);
  const blank = harness(degradedPayload(Date.now()));
  await blank.flush();
  assert.equal(blank.storage.has('uth-weather-last-good'), false, 'degraded payloads are never stored');
});

test('a fresh persisted payload paints at boot before any refresh', async () => {
  const good = goodPayload(Date.now());
  const storage = new Map([['uth-weather-last-good', JSON.stringify(good)]]);
  const originalHarness = harness;
  const h = bootWithStorage(storage);
  await h.flush();
  const r = h.registry;
  assert.equal(r['#temp'].textContent, '32', 'restored last good weather at boot');
  assert.equal(r['#icon'].dataset.condition, 'rain');
  assert.equal(r['#graphfill'].children.length, 7);
});

test('a stale persisted payload remains visible with its original observation time', async () => {
  const stale = goodPayload(Date.now() - 4 * 3600000);
  const h = bootWithStorage(new Map([['uth-weather-last-good', JSON.stringify(stale)]]));
  await h.flush();
  assert.equal(h.registry['#temp'].textContent, '32', 'last observed model value stays visible');
  assert.equal(h.registry['#board'].dataset.freshness,'HISTORICAL','stale is never labeled live');
  assert.equal(h.registry['#source-at'].hidden,false,'observation-time cue appears instead of a stale warning');
});

test('corrupt stored JSON is ignored', async () => {
  const h = bootWithStorage(new Map([['uth-weather-last-good', '{not json']]));
  await h.flush();
  assert.equal(h.registry['#temp'].textContent, '—');
});

test('transport-cache workflow keeps spread schedule chances plus push recovery', () => {
  const wf = fs.readFileSync(WORKFLOW, 'utf8');
  const crons = wf.match(/cron: '[0-9*, ]+'/g) || [];
  assert.ok(crons.length >= 4, 'at least four spread cron chances per hour');
  for (const minute of ['06', '21', '36', '51']) assert.match(wf, new RegExp(`cron: '${minute} \\* \\* \\* \\*'`), ':' + minute + ' chance present');
  assert.match(wf, /push:\s*\n\s*branches: \[main\]/, 'every main push retries the cache when the feed is stale');
  assert.match(wf, /workflow_dispatch/, 'owner can force a refresh');
  const gate = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'build-weather-feed.mjs'), 'utf8');
  assert.match(gate, /isFreshEnough/, 'age-based gate dedupes provider fetches');
  assert.match(gate, /fetchForecastWithRetry/, 'transport failures retry with backoff');
});


test('cold-start with a degraded Sheet uses older validated public transport as historical, then fresh Sheet wins', async () => {
  const now = Date.now(), oldNow = now - 8*3600000;
  const forecast = goodPayload(oldNow).channels.forecast.data;
  forecast.latitude = 14.376099; forecast.longitude = 100.66667;
  forecast.current.temperature_2m = 31.6;
  forecast.current.relative_humidity_2m = 61;
  forecast.current.weather_code = 63;
  const feed = { schema:1, requestedLocation:{lat:14.36147,lon:100.64424},
    fetchedAt:new Date(oldNow+60000).toISOString(),data:forecast };
  let fetchCalls=0;
  const h = harness(degradedPayload(now), null, async () => {
    fetchCalls++;
    return {ok:true,json:async()=>feed};
  });
  await h.flush(); await h.flush();
  assert.equal(h.registry['#temp'].textContent,'32','historical temperature from real-shaped transport');
  assert.equal(h.registry['#board'].dataset.freshness,'HISTORICAL');
  assert.equal(h.registry['#source-at'].hidden,false);
  assert.equal(fetchCalls,1,'only one fallback read, no direct weather provider calls');
  h.setFixture(goodPayload(Date.now()));
  h.refresh();
  await h.flush(); await h.flush();
  assert.equal(h.registry['#temp'].textContent,'32');
  assert.equal(h.registry['#board'].dataset.freshness,'MODEL_LATEST');
  assert.equal(h.registry['#source-at'].hidden,true);
  assert.equal(fetchCalls,1,'fresh canonical Sheet wins without extra transport request');
});
test('stale-but-valid Sheet snapshot is painted before a slow fallback completes',async()=>{
  const stale=goodPayload(Date.now()-8*3600000);
  const h=harness(stale,null,()=>new Promise(()=>{}));
  await h.flush();
  assert.equal(h.registry['#temp'].textContent,'32','show latest available from Sheet immediately');
  assert.equal(h.registry['#board'].dataset.freshness,'HISTORICAL');
});
