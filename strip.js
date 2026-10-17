/* Uthai Hospital LED — production presentation layer.
 * Renders the fixed 432x40 strip (clock + PM2.5 / water / weather+HI) from the
 * backend read API normalised by led-rotation.js. No demo fixtures, no state
 * parameters, no direct upstream API calls: the ONLY network request is the
 * fixed Apps Script exec endpoint, scheduled here (15 min, single-flight,
 * 12 s timeout) and repainted on slide exposure, visibility change and the
 * 60 s freshness tick so an aged payload greys out instead of lying.
 * Severity bands are inherited verbatim from the legacy Apps Script
 * Code.gs criteria (0–25 / 26–37 / 38–50 / 51–90 / ≥91 µg/m³); the Thai
 * mascot colours/expressions follow the user's approved reference image.
 * Water stays UNAVAILABLE in v1: no approved level thresholds or
 * discharge→height conversion exist, so a spoofed payload cannot move it.
 */
(function (root) {
'use strict';

const D = root.UthaiLEDRotation || null;
const ROTATE_MS = D ? D.ROTATE_MS : 12000;
const REFRESH_MS = D ? D.REFRESH_MS : 15 * 60 * 1000;
const REPAINT_MS = 60000;
const CLOCK_MS = 30000;
const HANDOFF_SETTLE_MS = 1680;   // 1000ms fade out + 650ms fade/slide in + margin

/* ---------- approved classification surfaces (mirror of the demo rig) ---------- */
const PM_ICON = {
  good: 'pm-good', moderate: 'pm-moderate', unhealthy: 'pm-unhealthy',
  protective: 'pm-protective', severe: 'pm-severe', unavailable: 'pm-unavailable',
};
const PM_STATUS_NOTE = {
  good: 'ทำกิจกรรมได้ตามปกติ',
  moderate: 'กลุ่มเสี่ยงเฝ้าระวังตัวเอง',
  unhealthy: 'เลี่ยงกิจกรรมกลางแจ้งที่ใช้แรงมาก',
  protective: 'ลดหรือจำกัดกิจกรรมนอกบ้าน',
  severe: 'งดกิจกรรมนอกบ้าน สวมหน้ากาก N95',
  unavailable: 'รอข้อมูล PM2.5',
};
const PM_SEV_TOKEN = {
  good: 'pm-good', moderate: 'good', unhealthy: 'watch',
  protective: 'danger', severe: 'critical', unavailable: 'unavailable',
};
const PM_DIAMOND = { unhealthy: true, protective: true, severe: true };

/* heat: band math lives in led-rotation.js; only compact display labels here
 * (the full ' · คำนวณ' wording stays in the docs, the caption carries the
 * marker on the strip). */
const HEAT_KEY = {
  'heat-extreme': 'extreme', 'heat-danger': 'danger', 'heat-caution': 'caution',
  'heat-watch': 'watch', 'heat-below': 'below', 'no-data': 'no-data',
};
const HEAT_COMPACT = {
  extreme: 'วิกฤต', danger: 'อันตราย', caution: 'เตือนภัย',
  watch: 'เฝ้าระวัง', below: 'ระดับต่ำ', 'no-data': 'รอข้อมูล',
};
const HEAT_SEV = {
  extreme: 'critical', danger: 'danger', caution: 'watch',
  watch: 'good', below: 'heat-below', 'no-data': 'unavailable',
};
const HEAT_RGB = {
  below: '63,169,245', watch: '53,209,111', caution: '245,197,66',
  danger: '255,146,45', extreme: '255,68,91', 'no-data': '132,144,158',
};
const HEAT_DIAMOND = { danger: true, extreme: true };

/* WMO weather_code -> icon key (icon differs from heat severity) */
function weatherIconKey(code) {
  if (typeof code !== 'number' || !Number.isFinite(code)) return 'weather-unavailable';
  if (code === 0) return 'weather-sunny';
  if (code === 1 || code === 2) return 'weather-partly';
  if (code === 3) return 'weather-cloudy';
  if (code === 45 || code === 48) return 'weather-fog';
  if (code === 77) return 'weather-windy';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    const heavy = code === 63 || code === 65 || code === 67 || code === 81 || code === 82;
    return heavy ? 'weather-heavy-rain' : 'weather-rain';
  }
  if (code >= 95) return 'weather-thunder';
  return 'weather-cloudy';
}
const WEATHER_STATUS_NOTE = {
  sunny: 'ท้องฟ้าแจ่มใส',
  partly: 'มีเมฆสลับแดด',
  cloudy: 'เมฆมาก',
  fog: 'มีหมอก',
  windy: 'ลมแรง',
  rain: 'มีฝนบางช่วง',
  'heavy-rain': 'ฝนตกหนักบางพื้นที่',
  thunder: 'มีฝนฟ้าคะนอง',
  unavailable: 'รอข้อมูลสภาพอากาศ',
};

/* water: v1 live mapping is UNAVAILABLE only; the rig states exist in the
 * demo preview and are unreachable here. */
const WATER_RGB = { unavailable: '158,158,158' };

/* ---------- rendering ---------- */
function $(id) { return root.document.getElementById(id); }

function paintClock() {
  let text = '--:--', day = '';
  try {
    const now = new Date();
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Bangkok', weekday: 'short', year: 'numeric', month: 'numeric',
      day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(now).map(part => [part.type, part.value]));
    const days = { Sun:'อา.', Mon:'จ.', Tue:'อ.', Wed:'พ.', Thu:'พฤ.', Fri:'ศ.', Sat:'ส.' };
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    text = parts.hour + ':' + parts.minute;
    day = `${days[parts.weekday]} ${parts.day} ${months[Number(parts.month) - 1]} ${String((Number(parts.year) + 543) % 100).padStart(2, '0')}`;
  } catch { /* keep placeholder */ }
  const clock = $('clock-a'), date = $('day-a');
  if (clock) clock.textContent = text;
  if (date) date.textContent = day;
}

function setDotShape(el, hazard) {
  if (el) el.classList.toggle('diamond', !!hazard);
}

function paintPM(pm) {
  const state = pm || {};
  const mood = PM_ICON[state.moodKey] ? state.moodKey : 'unavailable';
  const value = $('pm-value'), unit = $('pm-unit'), badge = $('pm-badge'), note = $('pm-note');
  if (value) {
    value.textContent = typeof state.value === 'number' && Number.isFinite(state.value)
      ? (Number.isInteger(state.value) ? String(state.value) : state.value.toFixed(1))
      : '—';
  }
  if (unit) unit.textContent = 'µg/m³';
  if (badge) badge.textContent = mood === 'unavailable' ? 'รอข้อมูล'
    : ({ good: 'ดีมาก', moderate: 'ดี', unhealthy: 'ปานกลาง', protective: 'เริ่มมีผลกระทบ', severe: 'มีผลกระทบ' })[mood];
  if (note) note.textContent = PM_STATUS_NOTE[mood];
  const slide = $('slide-pm');
  const symbol = slide && slide.querySelector('.status-symbol');
  if (symbol) symbol.textContent = mood === 'good' ? '✓' : mood === 'unavailable' ? '?' : '!';
  if (slide) slide.dataset.pmMood = mood;
  if (slide) slide.dataset.sev = PM_SEV_TOKEN[mood];
  setDotShape(symbol, PM_DIAMOND[mood]);
}

function paintWeather(wx) {
  const state = wx || {};
  const iconKey = weatherIconKey(state.code);
  const heatCls = D ? D.heatSeverity(typeof state.hiC === 'number' && Number.isFinite(state.hiC) ? state.hiC : null).cls : 'no-data';
  const heatKey = HEAT_KEY[heatCls] || 'no-data';
  const tempEl = $('wx-temp'), hiEl = $('wx-hi'), rainEl = $('wx-rain'), badge = $('wx-badge'), note = $('wx-note');
  if (tempEl) tempEl.textContent = typeof state.tempC === 'number' && Number.isFinite(state.tempC) ? Math.round(state.tempC) + '°' : '—';
  if (hiEl) hiEl.textContent = typeof state.hiC === 'number' && Number.isFinite(state.hiC) ? Math.round(state.hiC) + '°' : '—';
  if (rainEl) rainEl.textContent = typeof state.rainPct === 'number' && Number.isFinite(state.rainPct) ? Math.round(state.rainPct) + '%' : '—%';
  if (badge) badge.textContent = HEAT_COMPACT[heatKey];
  if (note) note.textContent = WEATHER_STATUS_NOTE[iconKey.slice('weather-'.length)];
  setDotShape($('wx-dot'), HEAT_DIAMOND[heatKey]);
  const thermo = $('heat-thermo');
  if (thermo) {
    thermo.style.setProperty('--heat-rgb', HEAT_RGB[heatKey]);
    thermo.setAttribute('data-heat-state', heatKey);
  }
  const slide = $('slide-weather');
  if (slide) slide.dataset.wxMotion = iconKey.slice('weather-'.length);
  if (slide) slide.dataset.heat = heatKey;
  if (slide) slide.dataset.sev = HEAT_SEV[heatKey];
}

function paintWater() {
  /* v1: no approved thresholds/source — the gauge stays grey with a dash
   * no matter what the payload claims. */
  const value = $('wa-value'), badge = $('wa-badge'), rig = $('water-rig');
  if (rig) {
    rig.style.setProperty('--water-rgb', WATER_RGB.unavailable);
    rig.setAttribute('data-water-state', 'unavailable');
  }
  if (value) value.textContent = '—';
  if (badge) badge.textContent = 'รอข้อมูลจริง';
  const slide = $('slide-water');
  if (slide) {
    slide.dataset.waterMotion = 'unavailable';
    slide.dataset.sev = 'unavailable';
    slide.classList.add('no-value');
  }
  setDotShape(slide && slide.querySelector('.status-symbol'), false);
}

function syncStageSev() {
  if (!root.document) return;
  const active = root.document.querySelector('.slide.active, .slide.entering');
  const stage = $('stage');
  if (active && stage) stage.dataset.sev = active.dataset.sev || 'unavailable';
}

/* ---------- location + provenance (multi-location, canonical 2026-10-17) ----------
 * The active location comes from the payload (server-side Sheet selection);
 * the frontend NEVER invents names/coords and falls back to a neutral
 * placeholder when config is missing. Provenance is inspectable text only:
 * title attributes + aria labels — never raw HTML, never live links. */
const LOC_BASE_ARIA = {
  'slide-pm': 'คุณภาพอากาศ PM2.5',
  'slide-weather': 'อากาศและดัชนีความร้อน',
  'slide-water': 'ระดับน้ำ (ยังไม่มีข้อมูลจริง)',
};
function shortLabel(label) {
  const s = typeof label === 'string' && label.length ? label : null;
  if (!s) return D ? D.LOCATION_PLACEHOLDER : 'รอข้อมูลพื้นที่';
  return s.length > 18 ? s.slice(0, 17) + '…' : s;
}
function provenanceTitle(prefix, prov, source, loc) {
  const parts = [prefix];
  if (loc && typeof loc.label === 'string' && loc.label) parts.push('พื้นที่: ' + loc.label);
  const agency = (prov && prov.agency) ||
    (typeof source === 'string' && source && source !== 'NONE' ? source : null);
  if (agency) parts.push('ที่มา: ' + agency);
  if (prov && prov.provider && prov.provider !== agency) parts.push(prov.provider);
  if (prov && prov.stationId) {
    /* GISTDA ids are tambon/AREA codes, not physical stations — label them as
     * areas; a genuine gauge id (future water source) keeps the สถานี label. */
    const isAreaCode = (prov.provider === 'GISTDA' || prov.agency === 'GISTDA');
    parts.push((isAreaCode ? 'พื้นที่/รหัสพื้นที่ ' : 'สถานี ') + prov.stationId);
  }
  if (prov && prov.service) parts.push(prov.service);
  if (prov && prov.datum) parts.push('มาตรฐาน ' + prov.datum);
  if (prov && prov.unit) parts.push(prov.unit);
  if (prov && prov.timeZone) parts.push('เขตเวลา ' + prov.timeZone);
  if (loc && typeof loc.lat === 'number' && typeof loc.lon === 'number') {
    parts.push('พิกัด ' + loc.lat.toFixed(4) + ',' + loc.lon.toFixed(4));
  }
  return parts.join(' · ');
}
function setSlideProvenance(id, title) {
  const el = $(id);
  if (!el) return;
  const text = String(title);
  el.setAttribute('title', text);
  const base = LOC_BASE_ARIA[id] || '';
  el.setAttribute('aria-label', base + ' — ' + text);
}
function applyLocation(state) {
  const st = state || {};
  const loc = st.location || { id:null, label:null, lat:null, lon:null };
  const short = shortLabel(loc.label);
  for (const id of ['pm-loc', 'wx-loc', 'wa-loc']) {
    const el = $(id);
    if (el) {
      el.textContent = short;
      /* native title carries the FULL label where the strip shows ellipsis */
      if (typeof loc.label === 'string' && loc.label) el.setAttribute('title', loc.label);
    }
  }
  const pm = st.pm || {}, wx = st.weather || {}, wa = st.water || {};
  setSlideProvenance('slide-pm', provenanceTitle('PM2.5', pm.provenance, pm.source, loc));
  setSlideProvenance('slide-weather', provenanceTitle('อากาศ · HI คำนวณ', wx.provenance, wx.source, loc));
  const waKnown = wa.provenance && (wa.provenance.agency || wa.provenance.provider);
  setSlideProvenance('slide-water', waKnown
    ? provenanceTitle('ระดับน้ำ', wa.provenance, wa.source, loc)
    : provenanceTitle('ระดับน้ำ — ยังไม่มีแหล่งข้อมูลที่ยืนยัน', null, null, loc));
  /* Open-Meteo licence: visible credit next to the data. The anchor text may
   * come from the sanitized provider field; the href stays a FIXED safe URL
   * written in the markup and is never rewritten from payload data. */
  /* The Open-Meteo credit is a fixed markup label in the forecast rain column
   * (see index.html); strip.js never rewrites its text or href. */
}

/* ---------- rotation with sequential hand-off (approved demo motion) ---------- */
function createRotation(slides, onSettle) {
  let index = 0, switching = false;
  function settle(to) {
    slides.forEach((el, n) => {
      el.classList.remove('leaving', 'entering');
      el.classList.toggle('active', n === to);
      el.setAttribute('aria-hidden', n === to ? 'false' : 'true');
    });
    switching = false;
    if (onSettle) onSettle();
  }
  function next() {
    if (switching || slides.length < 2) return;
    switching = true;
    const to = (index + 1) % slides.length;
    const from = index;
    index = to;
    const out = slides[from], inn = slides[to];
    if (root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      settle(to);
      return;
    }
    out.classList.remove('active');
    out.classList.add('leaving');
    inn.classList.remove('active');
    inn.classList.add('entering');
    inn.setAttribute('aria-hidden', 'false');
    syncStageSev();
    root.setTimeout(() => settle(to), HANDOFF_SETTLE_MS);
  }
  function show(i) {
    index = i;
    settle(i);
  }
  return { next, show };
}

/* ---------- fit the fixed 432x40 stage to narrow viewports (scale down only) ---------- */
function fitWidth() {
  const stage = $('stage');
  if (!stage) return;
  const widths = [root.innerWidth,
    root.document.documentElement && root.document.documentElement.clientWidth,
    root.visualViewport && root.visualViewport.width,
    root.screen && root.screen.width]
    .filter(n => Number.isFinite(n) && n > 0);
  const vw = widths.length ? Math.min(...widths) : 432;
  const sc = Math.min(1, vw / 432);
  stage.style.transform = sc < 1 ? 'scale(' + sc + ')' : '';
}

/* ---------- data lifecycle: one fixed backend read, no other network ---------- */
let lastRaw = null;
let refreshing = false;
let timers = [];

function D_empty() {
  return {
    location: { id:null, label:null, lat:null, lon:null },
    pm: { status: 'unavailable', value: null, moodKey: 'unavailable', source: null, provenance: null },
    weather: { status: 'unavailable', tempC: null, hiC: null, code: null, rainPct: null, source: null, provenance: null },
    water: { status: 'unavailable', value: null, source: null, provenance: null },
    errors: ['no-data'],
  };
}
/* One payload snapshot drives labels + all three channels + provenance:
 * a new location always switches atomically and a failed channel under the
 * new location can never fall back to the previous location's data. */
function paintAllFrom(raw, nowMs) {
  const state = D ? D.normalizePayload(raw, nowMs) : D_empty();
  applyLocation(state);
  paintPM(state.pm);
  paintWeather(state.weather);
  paintWater();
  syncStageSev();
}
function paintAll() {
  paintAllFrom(lastRaw, Date.now());
}
async function refresh() {
  if (!D || refreshing) return;
  refreshing = true;
  try {
    const res = await D.requestBackendData(
      typeof root.fetch === 'function' ? root.fetch.bind(root) : null, Date.now());
    if (res && res.ok) lastRaw = res.raw;
  } catch { /* requestBackendData resolves; keep last known payload */ }
  refreshing = false;
  paintAll();
}

function start() {
  if (!root.document || !D) return;
  const slides = ['slide-pm', 'slide-water', 'slide-weather']
    .map(id => root.document.getElementById(id)).filter(Boolean);
  slides.forEach((el, n) => el.setAttribute('aria-hidden', n === 0 ? 'false' : 'true'));
  const rotation = createRotation(slides, paintAll);
  rotation.show(0);
  paintAll();
  paintClock();
  fitWidth();
  /* image fallback: a broken PRIMARY icon retires the scene to its text glyph */
  root.document.querySelectorAll('.col.icon img').forEach(img => {
    img.addEventListener('error', () => {
      img.classList.add('error');
      const decorative = img.classList.contains('wx-sun-img') || /wx-(cloud|bolt|shade)/.test(img.className);
      if (!decorative && img.closest) {
        const scene = img.closest('.icon-scene');
        if (scene) scene.classList.add('asset-failed');
      }
    });
  });
  root.document.documentElement.classList.toggle('preview-hidden', root.document.visibilityState === 'hidden');
  timers.push(root.setInterval(rotation.next, ROTATE_MS));
  timers.push(root.setInterval(refresh, REFRESH_MS));
  timers.push(root.setInterval(() => { paintClock(); }, CLOCK_MS));
  /* freshness tick: re-derive state so an aged observedAt greys the channel */
  timers.push(root.setInterval(paintAll, REPAINT_MS));
  if (root.document.addEventListener) root.document.addEventListener('visibilitychange', () => {
    root.document.documentElement.classList.toggle('preview-hidden', root.document.visibilityState === 'hidden');
    paintClock();
    paintAll();
    if (root.document.visibilityState === 'visible') refresh();
  });
  if (root.addEventListener) {
    root.addEventListener('resize', fitWidth);
    if (root.visualViewport) root.visualViewport.addEventListener('resize', fitWidth);
  }
  refresh();
}
function stop() {
  timers.forEach(t => root.clearInterval(t));
  timers = [];
}

/* ---------- exports (pure surfaces for tests) ---------- */
const api = {
  paintPM, paintWeather, paintWater, paintClock, syncStageSev, paintAll, paintAllFrom,
  applyLocation, provenanceTitle, shortLabel, fitWidth,
  weatherIconKey, PM_ICON, PM_STATUS_NOTE, PM_SEV_TOKEN, PM_DIAMOND,
  HEAT_KEY, HEAT_COMPACT, HEAT_SEV, HEAT_RGB, WEATHER_STATUS_NOTE, WATER_RGB,
  ROTATE_MS, REFRESH_MS, REPAINT_MS, createRotation, start, stop,
  getRaw: () => lastRaw,
};
if (typeof module !== 'undefined' && module.exports) module.exports = api;
root.UthaiLEDStrip = api;

if (root.document) start();
})(typeof window !== 'undefined' ? window : globalThis);
