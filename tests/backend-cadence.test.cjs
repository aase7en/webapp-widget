/* Backend cadence contract tests (2026-10-17 cadence wave) — RED-first suite
 * pinning: per-channel ScriptCache (PM 1800 s / weather 600 s / last-good
 * 21600 s), bounded passive upstream cooldown (Retry-After honored only when
 * the provider actually sends it), canonical location label via PURE
 * normalization (no Sheet mutation), and history batches REUSING the
 * per-channel cache. Backend-owned; nothing here calls Google/Sheets/live. */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { makeContext, doGet, defaultTabs, defaultFetchQueue, gistdaBody, openMeteoBody, NOW_MS } = require('./backend-harness.cjs');

const MIN = 60 * 1000;
const CANONICAL = 'ต.อุทัย อ.อุทัย จ.พระนครศรีอยุธยา';
const LEGACY = 'ต.อุทัย อ.พระนครศรีอยุธยา';
const om = (time, temp) => openMeteoBody({ current: { time, temperature_2m: temp != null ? temp : 29.4, relative_humidity_2m: 78, weather_code: 80 } });

function data(h) {
  doGet(h, { action: 'data', v: '1' });
  return JSON.parse(h.outputs()[0].text);
}
const gistdaFetches = h => h.calls.fetches.filter(f => f.includes('gistda')).length;
const openMeteoFetches = h => h.calls.fetches.filter(f => f.includes('open-meteo')).length;

/* ---------- exported cadence constants ---------- */

test('exports per-channel TTL + cooldown constants', () => {
  const h = makeContext({ loadCodeGs: false, fetchQueue: [] });
  const B = h.ctx.BackendApi;
  assert.equal(B.PM_TTL_S, 3600, 'PM upstream refresh at most hourly');
  assert.equal(B.WX_TTL_S, 600, 'weather upstream refresh 10 min');
  assert.equal(B.LASTGOOD_TTL_S, 21600, 'last-good capped at CacheService max 6 h');
  assert.equal(B.COOLDOWN_DEFAULT_S, 300, 'passive failure cooldown default 5 min');
});

/* ---------- per-channel expiry ---------- */

test('t+20min: PM served from cache, ONLY weather refetched', () => {
  const h = makeContext({ fetchQueue: [{ body: gistdaBody() }, { body: om('2026-10-17T06:30') }, { body: om('2026-10-17T06:45', 31.2) }] });
  const first = data(h);
  assert.equal(first.pm25.value, 20.9);
  assert.equal(h.calls.fetches.length, 2);
  h.setNow(NOW_MS + 20 * MIN);
  h.outputsReset();
  const second = data(h);
  assert.equal(gistdaFetches(h), 1, 'PM must NOT refetch before 30 min');
  assert.equal(openMeteoFetches(h), 2, 'weather must refetch after 10 min');
  assert.equal(second.pm25.value, 20.9);
  assert.equal(second.pm25.observedAt, first.pm25.observedAt, 'cached PM keeps source time');
  assert.equal(second.weather.temperatureC, 31.2, 'fresh weather value');
});

test('t+5min: zero upstream calls (both channels cached)', () => {
  const h = makeContext({ fetchQueue: defaultFetchQueue() });
  data(h);
  h.setNow(NOW_MS + 5 * MIN);
  h.outputsReset();
  data(h);
  assert.equal(h.calls.fetches.length, 2);
});

test('t+35min: weather refetches while PM stays inside hourly gate', () => {
  const h = makeContext({ fetchQueue: [...defaultFetchQueue(), { body: om('2026-10-17T06:50') }] });
  data(h);
  h.setNow(NOW_MS + 35 * MIN);
  h.outputsReset();
  const body = data(h);
  assert.equal(h.calls.fetches.length, 3);
  assert.equal(body.pm25.value, 20.9);
  assert.equal(body.weather.observedAt, '2026-10-17T06:50+07:00');
});

/* ---------- rate-limit cooldown (bounded, passive, per channel) ---------- */

test('weather 429 with warm last-good: lg served, error surfaced, Retry-After honored', () => {
  const h = makeContext({
    fetchQueue: [
      { body: gistdaBody() }, { body: om('2026-10-17T06:30') },
      { code: 429, headers: { 'Retry-After': '120' } },
      { body: om('2026-10-17T07:25') },
    ],
  });
  data(h); /* warm both channels */
  h.setNow(NOW_MS + 20 * MIN);
  h.outputsReset();
  const during = data(h);
  assert.equal(during.pm25.status, 'ok', 'PM unaffected by weather outage');
  assert.equal(during.weather.status, 'ok', 'last-good keeps channel alive');
  assert.equal(during.weather.temperatureC, 29.4, 'lg value, never zero');
  assert.ok(during.errors.some(e => e.channel === 'weather' && /rate-limited|cooldown/i.test(e.message)), 'outage visible in errors');
  assert.equal(openMeteoFetches(h), 2, 'exactly one failed attempt');
  /* cooldown active at t+22-20=+2min after the 429 (Retry-After 120) */
  h.setNow(NOW_MS + 22 * MIN - 5 * 1000);
  h.outputsReset();
  data(h);
  assert.equal(openMeteoFetches(h), 2, 'cooldown suppresses refetch before Retry-After elapses');
  /* after cooldown: single retry allowed (no client-driven storm) */
  h.setNow(NOW_MS + 23 * MIN);
  h.outputsReset();
  const after = data(h);
  assert.equal(openMeteoFetches(h), 3, 'one retry after cooldown, then cached');
  assert.equal(after.weather.observedAt, '2026-10-17T07:25+07:00');
  assert.equal(gistdaFetches(h), 1, 'PM untouched across the whole outage');
});

test('cold 429 (no last-good): channel missing not zero; default 300s cooldown, no retry storm', () => {
  const h = makeContext({ fetchQueue: [{ body: gistdaBody() }, { code: 429 }, { body: om('2026-10-17T07:00') }] });
  const body = data(h);
  assert.equal(body.pm25.status, 'ok');
  assert.equal(body.weather.status, 'missing');
  assert.equal(body.weather.temperatureC, null);
  assert.notEqual(body.weather.temperatureC, 0);
  assert.equal(body.weather.observedAt, null);
  assert.ok(body.errors.some(e => e.channel === 'weather'));
  h.setNow(NOW_MS + 4 * MIN);
  h.outputsReset();
  data(h);
  assert.equal(openMeteoFetches(h), 1, 'default cooldown still active at +4min');
  h.setNow(NOW_MS + 6 * MIN);
  h.outputsReset();
  const retry = data(h);
  assert.equal(openMeteoFetches(h), 2, 'retry allowed after default cooldown');
  assert.equal(retry.weather.status, 'ok');
});

test('network failure writes passive cooldown too (no per-request hammering)', () => {
  const h = makeContext({ fetchQueue: [...defaultFetchQueue(), { error: new Error('dns boom') }] });
  data(h);
  h.setNow(NOW_MS + 20 * MIN);
  h.outputsReset();
  const body = data(h);
  assert.equal(body.weather.status, 'ok', 'lg served during network outage');
  assert.equal(body.pm25.status, 'ok', 'PM cached');
  assert.equal(h.calls.fetches.length, 3);
  h.setNow(NOW_MS + 20 * MIN + 10 * 1000);
  h.outputsReset();
  data(h);
  assert.equal(h.calls.fetches.length, 3, 'cooldown blocks immediate re-attempt');
});

test('cooldown is scoped per location (one location outage never blocks another)', () => {
  const tabs = defaultTabs();
  tabs.Locations[0].push('pm_tambon_name');
  tabs.Locations.push(['uthai2', 'ทดสอบสอง', 'TRUE', 14.4, 100.7, 'gistda', '1414', 'open-meteo', '', '', '', '', '', 'อุทัย']);
  const h = makeContext({ tabs, fetchQueue: [
    { body: gistdaBody() }, { body: om('2026-10-17T06:30') },
    { code: 429 }, /* uthai weather 429 at +20min */
    { body: om('2026-10-17T07:10') }, /* uthai2: PM shares district payload */
  ] });
  data(h);
  h.setNow(NOW_MS + 20 * MIN);
  h.outputsReset();
  data(h); /* uthai wx -> 429 + lg */
  assert.equal(openMeteoFetches(h), 2);
  tabs.Settings.find(r => r[0] === 'active_location_id')[1] = 'uthai2';
  h.outputsReset();
  const other = data(h);
  assert.equal(other.location.id, 'uthai2');
  assert.equal(other.weather.status, 'ok', 'uthai2 weather unaffected by uthai cooldown');
  assert.equal(other.pm25.status, 'ok');
  assert.equal(openMeteoFetches(h), 3);
});

/* ---------- outage fallback integrity ---------- */

test('stale last-good served as stale with ORIGINAL observedAt, never fabricated', () => {
  const h = makeContext({ fetchQueue: [...defaultFetchQueue(), { error: new Error('down') }, { error: new Error('down') }] });
  data(h);
  h.setNow(NOW_MS + 4 * 3600 * 1000);
  h.outputsReset();
  const body = data(h);
  assert.equal(body.pm25.status, 'stale');
  assert.equal(body.pm25.value, 20.9);
  assert.equal(body.pm25.observedAt, '2026-10-17T06:05+07:00', 'source time intact');
  assert.equal(body.weather.status, 'stale');
  assert.equal(body.weather.observedAt, '2026-10-17T06:30+07:00');
  assert.ok(body.errors.length >= 2);
});

test('lock held elsewhere: busy per channel, zero fetches, no crash', () => {
  const h = makeContext({ holdLock: true, fetchQueue: [] });
  const body = data(h);
  assert.equal(body.pm25.status, 'missing');
  assert.equal(body.weather.status, 'missing');
  assert.ok(body.errors.some(e => e.message === 'busy'));
  assert.equal(h.calls.fetches.length, 0);
});

test('corrupt last-good degrades gracefully (primary still serves, later refetch recovers)', () => {
  const h = makeContext({ fetchQueue: [...defaultFetchQueue(), ...defaultFetchQueue()] });
  data(h);
  for (const [k, e] of h.cacheStore) if (k.includes('_lg')) h.cacheStore.set(k, { v: '{{{not json', exp: e.exp });
  h.setNow(NOW_MS + 5 * MIN);
  h.outputsReset();
  let body;
  try { body = data(h); } catch (e) { assert.fail('must not crash: ' + e.message); }
  assert.equal(body.pm25.status, 'ok', 'primary hit needs no lg');
  assert.equal(h.calls.fetches.length, 2);
});

/* ---------- cache key layout ---------- */

test('cache keys: bapi_v2_ prefix with per-channel suffixes; no bapi_v1_', () => {
  const h = makeContext({ fetchQueue: defaultFetchQueue() });
  data(h);
  const keys = [...h.cacheStore.keys()];
  assert.ok(keys.some(k => k.startsWith('bapi_v2_') && k.includes(':pm25') && !k.includes('_lg') && !k.includes('_cd')), 'PM primary');
  assert.ok(keys.some(k => k.startsWith('bapi_v2_') && k.includes(':weather') && !k.includes('_lg') && !k.includes('_cd')), 'WX primary');
  assert.ok(keys.every(k => !k.startsWith('bapi_v1_')), 'stale aggregate layout must be gone');
});

/* ---------- canonical location label (pure normalization, no writes) ---------- */

test('legacy default label canonicalized in payload; Sheet cell never rewritten', () => {
  const h = makeContext({ fetchQueue: defaultFetchQueue() }); /* harness seed carries the LEGACY cell */
  const body = data(h);
  assert.equal(body.location.label, CANONICAL, 'API returns the corrected tambon/amphoe/changwat text');
  assert.equal(h.tabs.get('Locations')[1][1], LEGACY, 'physical cell untouched');
  assert.equal(h.calls.rangeSets.length, 0);
  assert.equal(h.calls.appends.length, 0);
});

test('custom and other-location labels pass through untouched', () => {
  const tabs = defaultTabs();
  tabs.Locations[1][1] = 'คลินิกทดสอบระยะใกล้';
  tabs.Locations[0].push('pm_tambon_name');
  tabs.Locations.push(['bkkguy', 'ทดสอบกรุงเทพ', 'TRUE', 13.75, 100.5, 'gistda', '1415', 'open-meteo', '', '', '', '', '', 'อุทัย']);
  const h = makeContext({ tabs, fetchQueue: [...defaultFetchQueue(), ...defaultFetchQueue()] });
  assert.equal(data(h).location.label, 'คลินิกทดสอบระยะใกล้');
  tabs.Settings.find(r => r[0] === 'active_location_id')[1] = 'bkkguy';
  h.outputsReset();
  assert.equal(data(h).location.label, 'ทดสอบกรุงเทพ', 'only the KNOWN legacy default is mapped');
});

test('label edit without version bump invalidates cache (label is in the fingerprint)', () => {
  const h = makeContext({ fetchQueue: [...defaultFetchQueue(), ...defaultFetchQueue()] });
  data(h);
  h.tabs.get('Locations')[1][1] = 'ต.อุทัย อ.อุทัย จ.อยุธยา (ทดสอบ)';
  h.outputsReset();
  data(h);
  assert.equal(h.calls.fetches.length, 3, 'weather refreshed and district PM reused');
  assert.equal(JSON.parse(h.outputs()[0].text).location.label, 'ต.อุทัย อ.อุทัย จ.อยุธยา (ทดสอบ)');
});

test('fresh setup seeds the CANONICAL label', () => {
  const h = makeContext({ tabs: {}, fetchQueue: [] });
  h.ctx.BackendApiSetupSheets_();
  assert.equal(h.tabs.get('Locations')[1][1], CANONICAL);
});

/* ---------- history reuses the per-channel cache ---------- */

test('history batch with warm cache: zero extra upstream calls, rows carry source times', () => {
  const h = makeContext({ fetchQueue: defaultFetchQueue() });
  data(h); /* warm pm+wx at t0 */
  h.ctx.BackendApiHistoryBatch_();
  assert.equal(h.calls.fetches.length, 2, 'history must reuse the read-path cache');
  const row = h.calls.appends.filter(a => a.sheet === 'History_Batch')[0].row;
  assert.equal(row[3], 'uthai');
  assert.equal(row[6], 20.9);
  assert.equal(row[7], '2026-10-17T06:05+07:00', 'PM row keeps cached source time');
  assert.equal(row[8], 'ok');
  assert.equal(row[12], 29.4);
});

test('history at t+20min refreshes ONLY the expired weather channel', () => {
  const h = makeContext({ fetchQueue: [{ body: gistdaBody() }, { body: om('2026-10-17T06:30') }, { body: om('2026-10-17T06:45') }] });
  data(h);
  h.setNow(NOW_MS + 20 * MIN);
  h.ctx.BackendApiHistoryBatch_();
  assert.equal(gistdaFetches(h), 1, 'PM history must not fetch early');
  assert.equal(openMeteoFetches(h), 2);
  const row = h.calls.appends.filter(a => a.sheet === 'History_Batch')[0].row;
  assert.equal(row[6], 20.9, 'PM value from 30-min cache');
  assert.equal(row[7], '2026-10-17T06:05+07:00');
  assert.equal(row[15], '2026-10-17T06:45+07:00', 'weather row uses refreshed value');
});

/* ---------- write safety under cooldown paths ---------- */

test('doGet under all-429 persists only the PM attempt, no Sheets or triggers', () => {
  const h = makeContext({ fetchQueue: [{ code: 429 }, { code: 503 }] });
  const body = data(h);
  assert.equal(body.pm25.status, 'missing');
  assert.equal(body.weather.status, 'missing');
  assert.equal(h.calls.rangeSets.length, 0);
  assert.equal(h.calls.appends.length, 0);
  assert.deepEqual(h.calls.propSets, ['pm25_gistda_last_attempt_ms']);
  assert.equal(h.calls.triggerCreates.length + h.calls.triggerDeletes.length, 0);
});

test('enabled snapshot mode serves legacy data route without provider calls',()=>{
 const h=makeContext({props:[['widget_snapshot_mode_v1','enabled']],fetchQueue:[]});
 h.ctx.HourlySnapshot={read:()=>({channels:{pm25:{data:{status:'ok',value:20.9,unit:'µg/m³'}},weather:{data:{status:'ok',temperatureC:29,humidityPct:70}}}})};
 const result=data(h);assert.equal(result.pm25.value,20.9);assert.equal(h.calls.fetches.length,0);
});
test('snapshot read failure fails closed without a provider fallback',()=>{
 const h=makeContext({props:[['widget_snapshot_mode_v1','enabled']],fetchQueue:[]});h.ctx.HourlySnapshot={read:()=>{throw Error('sheet down')}};
 const result=data(h);assert.equal(result.pm25.status,'missing');assert.equal(result.weather.status,'missing');assert.equal(h.calls.fetches.length,0);
});
