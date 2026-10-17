/* Production LED frontend browser suite — entirely offline: the fixed backend
 * endpoint is route-intercepted and served controlled payloads; NO live API is
 * ever contacted. Any unexpected external request fails the test.
 * Run: NODE_PATH=/Users/aase7en/.npm/_npx/31e32ef8478fbf80/node_modules \
 *      PREVIEW_BROWSER_E2E=1 PREVIEW_CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
 *      PREVIEW_CAPTURE_DIR=/tmp/widget-production-frontend-captures \
 *      node --test tests/browser-led.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';

const require = createRequire(import.meta.url);
const chrome = process.env.PREVIEW_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
let chromium;
try { ({chromium} = require('playwright')); } catch { /* optional local browser dependency */ }
const base = pathToFileURL(new URL('../index.html', import.meta.url).pathname).href;
const browserReady = process.env.PREVIEW_BROWSER_E2E === '1' && !!chromium && existsSync(chrome);
const browserSkip = browserReady ? false : 'Set PREVIEW_BROWSER_E2E=1 with Playwright and Chrome available';
const ENDPOINT = 'https://script.google.com/macros/s/AKfycbwwUQCeJoz4N0P9UuRJF39pt17mBjPz0_yMDDxTO7BoiUiTQaO7Yay0UKq80EvE6dk/exec';
const NOW = Date.now();
const iso = ms => new Date(ms).toISOString().replace('Z', '+07:00'); /* display only */
const obs = ms => new Date(ms).toLocaleString('sv-SE', {timeZone:'Asia/Bangkok'}).replace(' ', 'T') + '+07:00';
const today = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Bangkok', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date());

function payload(over = {}) {
  return Object.assign({
    schema: 1,
    generatedAt: iso(NOW),
    location: {id:'uthai_tambon', label:'ต.อุทัย จ.อุทัยธานี', lat:14.36147, lon:100.64424},
    pm25: {status:'ok', value:20.9, unit:'µg/m³', observedAt:obs(NOW - 10*60000), source:'GISTDA', band:'very_good',
      provenance:{provider:'GISTDA', agency:'GISTDA', service:'PM25 tambon/area estimate',
        stationId:'1414', sourceUrl:'https://gistda.or.th/', termsUrl:null,
        timeZone:'Asia/Bangkok', unit:'µg/m³', datum:null}},
    weather: {status:'ok', temperatureC:31, humidityPct:64, weatherCode:1, tmaxC:36, tminC:26,
      rainPct:40, observedAt:obs(NOW - 10*60000), forecastDate:today(), source:'OPEN_METEO',
      provenance:{provider:'Open-Meteo', agency:null, service:'forecast API', stationId:null,
        sourceUrl:'https://open-meteo.com/', termsUrl:'https://open-meteo.com/terms',
        timeZone:'Asia/Bangkok', unit:'°C/%', datum:null}},
    water: {status:'missing', available:false, value:null, unit:'m', observedAt:null, source:'NONE',
      provenance:{provider:null, agency:null, service:null, stationId:null, sourceUrl:null,
        termsUrl:null, timeZone:'Asia/Bangkok', unit:'m', datum:'msl'}},
    errors: [],
  }, over);
}
function capture(locator, name) {
  return locator.screenshot().then(bytes => {
    assert.ok(bytes.length > 1000, `${name} screenshot empty`);
    const dir = process.env.PREVIEW_CAPTURE_DIR || '/tmp/widget-production-frontend-captures';
    mkdirSync(dir, {recursive:true});
    writeFileSync(join(dir, `${name}.png`), bytes);
  });
}
async function openPage(browser, {payload:body, viewport = {width:432, height:40}, reduce = false, mode = 'ok'} = {}) {
  const context = await browser.newContext({viewport, deviceScaleFactor:2, reducedMotion: reduce ? 'reduce' : 'no-preference'});
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));
  const external = [];
  page.on('request', r => { if (!r.url().startsWith('file://')) external.push(r.url()); });
  await page.route(ENDPOINT + '**', async route => {
    const req = route.request();
    if (mode === 'offline') return route.abort('connectionrefused');
    if (mode === 'jsonp' && req.resourceType() === 'script') {
      const cb = new URL(req.url()).searchParams.get('callback');
      return route.fulfill({status:200, contentType:'application/javascript',
        body: `${cb}(${JSON.stringify(typeof body === 'function' ? body() : body)});`});
    }
    if (mode === 'jsonp') return route.abort('connectionrefused');
    if (body === undefined) return route.abort('connectionrefused');
    return route.fulfill({status:200, contentType:'application/json',
      headers:{'Access-Control-Allow-Origin':'*'},
      body: JSON.stringify(typeof body === 'function' ? body() : body)});
  });
  await page.goto(base);
  await page.waitForLoadState('networkidle');
  return {context, page, pageErrors, external};
}
const show = (page, id) => page.evaluate(slideId => {
  document.querySelectorAll('.slide').forEach(s => {
    s.classList.remove('active', 'leaving', 'entering');
    s.setAttribute('aria-hidden', 'true');
  });
  const t = document.getElementById(slideId);
  t.classList.add('active');
  t.setAttribute('aria-hidden', 'false');
}, id);
const moodValues = {good:18, moderate:30, unhealthy:45, protective:70, severe:120};

test('Chrome: fresh good payload renders the native strip at exact 432x40', {skip: browserSkip}, async () => {
  const browser = await chromium.launch({headless:true, executablePath:chrome});
  try {
    const {context, page, pageErrors, external} = await openPage(browser, {payload: payload()});
    const box = await page.locator('.stage').evaluate(el => {
      const r = el.getBoundingClientRect();
      return {x:r.x, y:r.y, width:r.width, height:r.height};
    });
    assert.equal(box.x, 0); assert.equal(box.y, 0);
    assert.ok(Math.abs(box.width - 432) < 0.6, 'width ' + box.width);
    assert.ok(Math.abs(box.height - 40) < 0.6, 'height ' + box.height);
    assert.match(await page.locator('#clock-a').textContent(), /^\d\d:\d\d$/);
    assert.match(await page.locator('#day-a').textContent(), /อ\.|จ\.|อา\.|พ\.|พฤ\.|ศ\.|ส\./);
    await page.locator('#slide-pm[data-pm-mood="good"]').waitFor();
    assert.equal(await page.locator('#pm-value').textContent(), '20.9');
    assert.equal(await page.locator('#pm-badge').textContent(), 'ดีมาก');
    assert.equal(await page.locator('.pm-rig img').count(), 17);
    assert.equal(await page.locator('.pm-rig img').first().evaluate(el => el.naturalWidth > 0), true);
    assert.equal(await page.locator('img.error').count(), 0);
    assert.equal(await page.locator('iframe').count(), 0);
    /* the ONLY external traffic is the fixed backend endpoint */
    for (const url of external) assert.ok(url.startsWith(ENDPOINT), url);
    assert.deepEqual(pageErrors, []);
    await capture(page.locator('.led'), 'strip-432x40-good');
    await context.close();
  } finally { await browser.close(); }
});

test('Chrome: all six PM moods render from controlled fresh payloads', {skip: browserSkip}, async () => {
  const browser = await chromium.launch({headless:true, executablePath:chrome});
  try {
    const cases = [
      ['good', 'ดีมาก', '18'], ['moderate', 'ดี', '30'], ['unhealthy', 'ปานกลาง', '45'],
      ['protective', 'เริ่มมีผลกระทบ', '70'], ['severe', 'มีผลกระทบ', '120'],
      ['unavailable', 'รอข้อมูล', '—'],
    ];
    for (const [mood, badge, text] of cases) {
      const body = payload();
      body.pm25.value = mood === 'unavailable' ? null : moodValues[mood];
      if (mood !== 'unavailable') {
        body.pm25.band = mood === 'good' && moodValues[mood] <= 25 ? 'very_good'
          : moodValues[mood] <= 37 ? 'good' : moodValues[mood] <= 50 ? 'moderate'
          : moodValues[mood] <= 90 ? 'unhealthy_sensitive' : 'unhealthy';
      }
      const {context, page, pageErrors} = await openPage(browser, {payload: body});
      await page.locator(`#slide-pm[data-pm-mood="${mood}"]`).waitFor();
      assert.equal(await page.locator('#pm-badge').textContent(), badge, mood);
      assert.equal(await page.locator('#pm-value').textContent(), text, mood);
      assert.deepEqual(pageErrors, []);
      await capture(page.locator('#slide-pm'), `pm-${mood}`);
      await context.close();
    }
  } finally { await browser.close(); }
});

test('Chrome: weather + HI render per WMO code with คำนวณ marker and forecast guard', {skip: browserSkip}, async () => {
  const browser = await chromium.launch({headless:true, executablePath:chrome});
  try {
    const cases = [
      [0, 'sunny', 25, 60, 'below'], [1, 'partly', 29, 60, 'watch'],
      [3, 'cloudy', 33, 40, 'caution'], [45, 'fog', 35, 60, 'danger'],
      [77, 'windy', 38, 70, 'extreme'], [61, 'rain', 25, 60, 'below'],
      [65, 'heavy-rain', 35, 60, 'danger'], [95, 'thunder', 38, 70, 'extreme'],
      [null, 'unavailable', 29, 60, 'watch'],
    ];
    for (const [code, motion, temp, rh, heat] of cases) {
      const body = payload();
      body.weather.weatherCode = code;
      body.weather.temperatureC = temp;
      body.weather.humidityPct = rh;
      const {context, page} = await openPage(browser, {payload: body});
      await show(page, "slide-weather");
      await page.locator(`#slide-weather[data-wx-motion="${motion}"]`).waitFor();
      assert.equal(await page.locator('#slide-weather').getAttribute('data-heat'), heat, String(code));
      assert.match(await page.locator('#wx-hi').textContent(), /^\d+°$/);
      assert.equal(await page.locator('.weather-caption').first().textContent(), 'คำนวณ');
      assert.equal(await page.locator('#wx-temp').textContent(), temp + '°');
      await capture(page.locator('#slide-weather'), `weather-${motion}-heat-${heat}`);
      await context.close();
    }
    /* a stale forecastDate must not blank the valid current temperature/HI */
    const body = payload();
    body.weather.forecastDate = '2020-01-01';
    const {context, page} = await openPage(browser, {payload: body});
    await show(page, "slide-weather");
    assert.equal(await page.locator('#wx-rain').textContent(), '—%');
    assert.match(await page.locator('#wx-temp').textContent(), /^\d+°$/);
    assert.match(await page.locator('#wx-hi').textContent(), /^\d+°$/);
    await context.close();
  } finally { await browser.close(); }
});

test('Chrome: water stays grey unavailable even against a spoofed available payload', {skip: browserSkip}, async () => {
  const browser = await chromium.launch({headless:true, executablePath:chrome});
  try {
    const body = payload();
    body.water = {status:'ok', available:true, value:4.2, unit:'m', observedAt:obs(NOW), source:'SPOOF'};
    const {context, page, pageErrors} = await openPage(browser, {payload: body});
    await show(page, "slide-water");
    assert.equal(await page.locator('#wa-value').textContent(), '—');
    assert.equal(await page.locator('#wa-badge').textContent(), 'รอข้อมูลจริง');
    assert.equal(await page.locator('#slide-water').getAttribute('data-water-motion'), 'unavailable');
    assert.deepEqual(pageErrors, []);
    await capture(page.locator('#slide-water'), 'water-unavailable');
    await context.close();
  } finally { await browser.close(); }
});

test('Chrome: stale, future and missing observedAt grey the PM channel', {skip: browserSkip}, async () => {
  const browser = await chromium.launch({headless:true, executablePath:chrome});
  try {
    const cases = [
      ['stale', obs(NOW - 4 * 3600000)],
      ['future', obs(NOW + 11 * 60000)],
    ];
    for (const [name, observedAt] of cases) {
      const body = payload();
      body.pm25.observedAt = observedAt;
      const {context, page} = await openPage(browser, {payload: body});
      await page.locator('#slide-pm[data-pm-mood="unavailable"]').waitFor();
      assert.equal(await page.locator('#pm-value').textContent(), '—', name);
      await capture(page.locator('#slide-pm'), `pm-grey-${name}`);
      await context.close();
    }
    const missing = payload();
    delete missing.pm25.observedAt; /* generatedAt present but never a fallback */
    const {context, page} = await openPage(browser, {payload: missing});
    await page.locator('#slide-pm[data-pm-mood="unavailable"]').waitFor();
    assert.equal(await page.locator('#pm-value').textContent(), '—');
    await context.close();
    const nullValue = payload();
    nullValue.pm25.value = null; nullValue.pm25.band = null;
    const c3 = await openPage(browser, {payload: nullValue});
    await c3.page.locator('#slide-pm[data-pm-mood="unavailable"]').waitFor();
    assert.equal(await c3.page.locator('#pm-value').textContent(), '—');
    await c3.context.close();
  } finally { await browser.close(); }
});

test('Chrome: total transport failure degrades every slide to placeholders', {skip: browserSkip}, async () => {
  const browser = await chromium.launch({headless:true, executablePath:chrome});
  try {
    const {context, page, pageErrors} = await openPage(browser, {mode:'offline', payload: undefined});
    await page.waitForTimeout(700);
    assert.equal(await page.locator('#pm-value').textContent(), '—');
    assert.equal(await page.locator('#wx-temp').textContent(), '—');
    assert.equal(await page.locator('#wx-hi').textContent(), '—');
    assert.equal(await page.locator('#wa-value').textContent(), '—');
    assert.equal(await page.locator('#slide-pm').getAttribute('data-pm-mood'), 'unavailable');
    assert.equal(await page.locator('#slide-weather').getAttribute('data-heat'), 'no-data');
    assert.deepEqual(pageErrors, []);
    await capture(page.locator('.led'), 'transport-failure');
    await context.close();
  } finally { await browser.close(); }
});

test('Chrome: CORS failure falls back to JSONP once and renders the payload', {skip: browserSkip}, async () => {
  const browser = await chromium.launch({headless:true, executablePath:chrome});
  try {
    const body = payload();
    body.pm25.value = 70; body.pm25.band = 'unhealthy_sensitive';
    const {context, page, external} = await openPage(browser, {payload: body, mode:'jsonp'});
    await page.locator('#slide-pm[data-pm-mood="protective"]').waitFor();
    assert.equal(await page.locator('#pm-value').textContent(), '70');
    const scripts = external.filter(u => u.includes('callback='));
    assert.equal(scripts.length, 1, 'exactly one JSONP attempt: ' + scripts.join());
    assert.match(scripts[0], /callback=__uthaiLedCb[A-Za-z0-9]+$/);
    await context.close();
  } finally { await browser.close(); }
});

test('Chrome: payload source strings cannot inject markup (textContent-only)', {skip: browserSkip}, async () => {
  const browser = await chromium.launch({headless:true, executablePath:chrome});
  try {
    const body = payload();
    body.pm25.source = '<img src=x onerror="window.__xss=1">';
    body.weather.source = '<img src=x onerror="window.__xss2=1">';
    const {context, page} = await openPage(browser, {payload: body});
    await page.locator('#slide-pm[data-pm-mood="good"]').waitFor();
    assert.equal(await page.evaluate(() => window.__xss), undefined);
    assert.equal(await page.evaluate(() => window.__xss2), undefined);
    assert.equal(await page.locator('img').count(), await page.evaluate(() =>
      document.querySelectorAll('.col.icon img, .heat-thermo img').length));
    await context.close();
  } finally { await browser.close(); }
});

test('Chrome: reduced motion freezes animation yet keeps representative shapes', {skip: browserSkip}, async () => {
  const browser = await chromium.launch({headless:true, executablePath:chrome});
  try {
    const body = payload();
    body.weather.weatherCode = 65;
    const {context, page} = await openPage(browser, {payload: body, reduce:true, viewport:{width:432, height:288}});
    await page.locator('#slide-pm[data-pm-mood="good"]').waitFor();
    assert.equal(await page.locator('.pm-rig').first().evaluate(el => getComputedStyle(el).animationName), 'none');
    await show(page, "slide-water");
    assert.equal(await page.locator('.water-liquid-img').first().evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    await show(page, "slide-weather");
    assert.equal(await page.locator('.wx-rain i').first().evaluate(el => Number(getComputedStyle(el).opacity) > 0), true);
    await capture(page.locator('.led'), 'reduced-motion-432x288');
    await context.close();
  } finally { await browser.close(); }
});

test('Chrome: strip bounds across 432x288, 390 and 320 viewports (scale down only)', {skip: browserSkip}, async () => {
  const browser = await chromium.launch({headless:true, executablePath:chrome});
  try {
    for (const vp of [{width:432, height:288}, {width:390, height:844}, {width:320, height:568}]) {
      const {context, page} = await openPage(browser, {payload: payload(), viewport: vp});
      const box = await page.locator('.stage').evaluate(el => {
        const r = el.getBoundingClientRect();
        return {x:r.x, y:r.y, width:r.width, height:r.height};
      });
      assert.ok(box.x <= 0.5, vp.width + ' x');
      assert.ok(box.y <= 0.5, vp.width + ' y');
      assert.ok(box.width <= vp.width + 0.6, vp.width + ' width ' + box.width);
      assert.ok(box.height <= 40.6, vp.width + ' height ' + box.height);
      if (vp.width < 432) {
        assert.ok(box.width > vp.width * 0.9, 'scaled down, not reflowed: ' + box.width);
        assert.ok(box.height < 40, 'scaled height: ' + box.height);
      }
      await capture(page.locator('.led'), `strip-${vp.width}`);
      await context.close();
    }
  } finally { await browser.close(); }
});

test('Chrome: active-location labels and inspectable provenance render on all slides', {skip: browserSkip}, async () => {
  const browser = await chromium.launch({headless:true, executablePath:chrome});
  try {
    /* missing config first: neutral placeholder, no hardcoded location names */
    const {context, page} = await openPage(browser, {payload: (() => {const b = payload(); delete b.location; return b;})()});
    await page.locator('#slide-pm[data-pm-mood="good"]').waitFor();
    for (const id of ['pm-loc', 'wx-loc', 'wa-loc'])
      assert.equal(await page.locator('#' + id).textContent(), 'รอข้อมูลพื้นที่', id);
    await context.close();

    /* configured location: short labels + title/aria provenance (text-only) */
    const body = payload();
    body.location = {id:'station_b', label:'สถานี บี คลองหลวง', lat:15.1, lon:101.2};
    const c2 = await openPage(browser, {payload: body});
    const p2 = c2.page;
    await p2.locator('#slide-pm[data-pm-mood="good"]').waitFor();
    for (const id of ['pm-loc', 'wx-loc', 'wa-loc']) {
      const t = await p2.locator('#' + id).textContent();
      assert.ok(t.includes('สถานี บี'), id + ': ' + t);
    }
    const pmTitle = await p2.locator('#slide-pm').getAttribute('title');
    assert.match(pmTitle, /GISTDA/);
    assert.match(pmTitle, /PM25 tambon\/area estimate/);
    assert.match(pmTitle, /พื้นที่\/รหัสพื้นที่ 1414/);
    assert.match(pmTitle, /พิกัด 15\.1000,101\.2000/);
    assert.ok(!/javascript:|data:|<img|<script/i.test(pmTitle));
    assert.match(await p2.locator('#slide-pm').getAttribute('aria-label'), /GISTDA/);
    assert.match(await p2.locator('#slide-weather').getAttribute('title'), /Open-Meteo/);
    const waTitle = await p2.locator('#slide-water').getAttribute('title');
    assert.match(waTitle, /ยังไม่มีแหล่งข้อมูล/);
    /* exactly one sanctioned anchor: the fixed Open-Meteo attribution */
    assert.equal(await p2.locator('a').count(), 1);
    assert.equal(await p2.locator('a').getAttribute('href'), 'https://open-meteo.com/');
    await capture(p2.locator('.led'), 'location-b-labels');
    await c2.context.close();
  } finally { await browser.close(); }
});

test('Chrome: location A -> B switches atomically; failed B channels never reuse A data', {skip: browserSkip}, async () => {
  const browser = await chromium.launch({headless:true, executablePath:chrome});
  try {
    const A = payload();
    const B = payload({location:{id:'station_b', label:'สถานี บี', lat:15.1, lon:101.2}});
    B.pm25.status = 'stale';
    B.weather.status = 'missing';
    let current = A;
    const context = await browser.newContext({viewport:{width:432, height:40}, deviceScaleFactor:2});
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', e => pageErrors.push(e.message));
    await page.route(ENDPOINT + '**', route => route.fulfill({status:200,
      contentType:'application/json', headers:{'Access-Control-Allow-Origin':'*'},
      body: JSON.stringify(typeof current === 'function' ? current() : current)}));
    await page.goto(base);
    await page.waitForLoadState('networkidle');
    await page.locator('#slide-pm[data-pm-mood="good"]').waitFor();
    assert.match(await page.locator('#wx-temp').textContent(), /^\d+°$/);
    assert.ok((await page.locator('#wx-loc').textContent()).includes('อุทัย'));
    /* server switches the active location; next refresh cycle serves B */
    current = B;
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.locator('#slide-pm[data-pm-mood="unavailable"]').waitFor();
    assert.equal(await page.locator('#pm-value').textContent(), '—');
    assert.equal(await page.locator('#wx-temp').textContent(), '—');
    assert.equal(await page.locator('#wx-hi').textContent(), '—');
    assert.equal(await page.locator('#wa-value').textContent(), '—');
    for (const id of ['pm-loc', 'wx-loc', 'wa-loc'])
      assert.ok((await page.locator('#' + id).textContent()).includes('สถานี บี'), id);
    assert.match(await page.locator('#slide-pm').getAttribute('title'), /สถานี บี/);
    assert.deepEqual(pageErrors, []);
    await capture(page.locator('.led'), 'location-a-to-b-atomic');
    await context.close();
  } finally { await browser.close(); }
});

test('Chrome: malicious location/provenance metadata stays inert text', {skip: browserSkip}, async () => {
  const browser = await chromium.launch({headless:true, executablePath:chrome});
  try {
    const body = payload();
    body.location = {id:'x<img src=y onerror=window.__xssL=1>', label:'<img src=x onerror=window.__xssL=2>',
      lat:15, lon:101};
    body.pm25.provenance = {agency:'<img src=x onerror=window.__xssL=3>',
      sourceUrl:'javascript:window.__xssL=4', stationId:'<script>window.__xssL=5</script>'};
    const {context, page} = await openPage(browser, {payload: body});
    await page.locator('#slide-pm[data-pm-mood="good"]').waitFor();
    for (const k of ['__xssL1','__xssL2','__xssL3','__xssL4','__xssL5'])
      assert.equal(await page.evaluate(flag => window[flag], k), undefined, k);
    const pmTitle = await page.locator('#slide-pm').getAttribute('title');
    assert.ok(!/javascript:|data:/.test(pmTitle));
    const label = await page.locator('#pm-loc').textContent(); /* rendered as text only */
    assert.ok(label.length > 0);
    await context.close();
  } finally { await browser.close(); }
});

test('Chrome: single readable Open-Meteo attribution anchor, fixed safe URL', {skip: browserSkip}, async () => {
  const browser = await chromium.launch({headless:true, executablePath:chrome});
  try {
    const {context, page} = await openPage(browser, {payload: payload(), viewport:{width:432, height:40}, reduce:false});
    await page.locator('#slide-pm[data-pm-mood="good"]').waitFor();
    await show(page, "slide-weather"); /* credit is visible exactly while weather data shows */
    const anchors = page.locator('a');
    assert.equal(await anchors.count(), 1);
    const a = page.locator('#wx-credit');
    assert.equal(await a.getAttribute('href'), 'https://open-meteo.com/');
    assert.equal(await a.getAttribute('target'), '_blank');
    assert.equal(await a.getAttribute('rel'), 'noopener noreferrer');
    assert.match(await a.textContent(), /Open-Meteo/);
    const geo = await a.evaluate(el => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {x:r.x, y:r.y, w:r.width, h:r.height, fontSize:parseFloat(cs.fontSize), visible:cs.visibility==='visible' && cs.display!=='none'};
    });
    assert.equal(geo.visible, true);
    assert.ok(geo.fontSize >= 8, 'readable microcaption, got ' + geo.fontSize + 'px');
    assert.ok(geo.fontSize < 40, 'not a giant replacement panel');
    assert.ok(geo.x >= 0 && geo.y >= 0 && geo.y + geo.h <= 40.6 && geo.x + geo.w <= 432.6,
      'anchor inside the 432x40 stage: ' + JSON.stringify(geo));
    const box = await page.locator('.stage').evaluate(el => {const r = el.getBoundingClientRect(); return {h:r.height, w:r.width};});
    assert.ok(Math.abs(box.h - 40) < 0.6 && Math.abs(box.w - 432) < 0.6, 'strip geometry unchanged');
    await show(page, "slide-weather");
    await capture(page.locator('#slide-weather'), 'attribution-432x40');
    await context.close();
    /* 390/320: attribution stays inside the scaled strip */
    for (const vp of [{width:390, height:844}, {width:320, height:568}]) {
      const c2 = await openPage(browser, {payload: payload(), viewport: vp});
      const g2 = await c2.page.locator('#wx-credit').evaluate(el => {
        const r = el.getBoundingClientRect();
        return {x:r.x, y:r.y, w:r.width, h:r.height};
      });
      assert.ok(g2.x >= 0 && g2.y >= 0 && g2.x + g2.w <= vp.width + 0.6, vp.width + ' ' + JSON.stringify(g2));
      await capture(c2.page.locator('.led'), 'final-' + vp.width);
      await c2.context.close();
    }
  } finally { await browser.close(); }
});

/* ---------- 2026-10-18-prod2: credit relocated out of the alert column ---------- */
test('Chrome: credit box never intersects alert pill / HI / thermo / temp / note at any viewport or state', {skip: browserSkip}, async () => {
  const browser = await chromium.launch({headless:true, executablePath:chrome});
  try {
    const states = [
      ['ok', payload()],
      ['danger', (() => {const b = payload(); b.weather.weatherCode = 95; b.weather.temperatureC = 38; b.weather.humidityPct = 70; return b;})()],
      ['missing', (() => {const b = payload(); b.weather.status = 'missing'; return b;})()],
    ];
    for (const vp of [{width:432, height:40}, {width:390, height:844}, {width:320, height:568}]) {
      for (const [name, body] of states) {
        const {context, page} = await openPage(browser, {payload: body, viewport: vp});
        await page.locator('#slide-pm[data-pm-mood="good"]').waitFor();
        await show(page, 'slide-weather');
        const m = await page.evaluate(() => {
          const g = sel => {
            const el = document.querySelector(sel);
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return {x:r.x, y:r.y, w:r.width, h:r.height};
          };
          const credit = g('#wx-credit');
          const cs = getComputedStyle(document.getElementById('wx-credit'));
          return {
            credit,
            pill: g('#slide-weather .pill'),
            hi: g('#wx-hi'),
            thermo: g('#heat-thermo'),
            temp: g('.weather-temp'),
            note: g('#wx-note'),
            clock: g('.clock-panel'),
            fontSize: parseFloat(cs.fontSize),
            border: cs.borderStyle !== 'none' && parseFloat(cs.borderWidth) > 0,
            bg: cs.backgroundColor !== 'rgba(0, 0, 0, 0)',
            pad: parseFloat(cs.paddingTop) + parseFloat(cs.paddingLeft),
          };
        });
        assert.ok(m.credit, vp.width + ' credit exists');
        const ix = (a, b) => !a || !b ? 0 :
          Math.max(0, Math.min(a.x+a.w, b.x+b.w) - Math.max(a.x, b.x)) *
          Math.max(0, Math.min(a.y+a.h, b.y+b.h) - Math.max(a.y, b.y));
        for (const k of ['pill', 'hi', 'thermo', 'temp', 'note', 'clock'])
          assert.equal(ix(m.credit, m[k]), 0, `${vp.width}/${name}: credit×${k} overlap`);
        assert.ok(m.fontSize >= 8, vp.width + '/' + name + ' fontSize ' + m.fontSize);
        if (vp.width >= 432) {
          assert.ok(m.credit.h >= 8, vp.width + '/' + name + ' credit box readable height ' + m.credit.h);
        } else {
          /* natural scale-down of the whole strip is allowed below 432 */
          assert.ok(m.credit.h >= 5, vp.width + '/' + name + ' scaled credit height ' + m.credit.h);
        }
        assert.equal(m.border, false, 'no button border');
        assert.equal(m.bg, false, 'no button background');
        assert.equal(m.pad, 0, 'no button padding');
        assert.ok(m.credit.y >= 0 && m.credit.y + m.credit.h <= 40.6 && m.credit.x >= 0 &&
          m.credit.x + m.credit.w <= vp.width + 0.6, vp.width + '/' + name + ' inside strip');
        if (vp.width === 432 && name === 'ok')
          await capture(page.locator('#slide-weather'), 'after-432x40-weather');
        if (vp.width === 390)
          await capture(page.locator('.led'), 'after-390');
        if (vp.width === 320)
          await capture(page.locator('.led'), 'after-320');
        await context.close();
      }
    }
  } finally { await browser.close(); }
});
