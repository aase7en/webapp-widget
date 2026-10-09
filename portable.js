/* Public, keyless portable widget. Data is MODELLED/DERIVED, never a hospital sensor reading. */
(function (root) {
  'use strict';
  const REFRESH_MS = 30 * 60 * 1000;
  const ROTATE_MS = 10000;
  const THRESHOLDS = [
    { max: 15, label: 'ดีมาก', tone: 'excellent' },
    { max: 25, label: 'ดี', tone: 'good' },
    { max: 37.5, label: 'ปานกลาง', tone: 'moderate' },
    { max: 75, label: 'เริ่มมีผลกระทบ', tone: 'warning' },
    { max: Infinity, label: 'มีผลกระทบ', tone: 'danger' }
  ];
  const HEAT_LEVELS = [
    { max: 27, label: 'ต่ำกว่าเกณฑ์เฝ้าระวัง', tone: 'good' },
    { max: 33, label: 'เฝ้าระวัง', tone: 'moderate' },
    { max: 42, label: 'เตือนภัย', tone: 'warning' },
    { max: 52, label: 'อันตราย', tone: 'danger' },
    { max: Infinity, label: 'อันตรายมาก', tone: 'danger' }
  ];
  function finite(value) { return typeof value === 'number' && Number.isFinite(value); }
  function classify(value, levels, inclusive = false) {
    if (!finite(value) || value < 0) return null;
    return levels.find(item => inclusive ? value <= item.max : value < item.max) || null;
  }
  function parseLocation(search) {
    const p = new URLSearchParams(search || '');
    const lat = Number(p.get('lat'));
    const lon = Number(p.get('lon'));
    if (!p.has('lat') || !p.has('lon') ||
        !p.get('lat')?.trim() || !p.get('lon')?.trim() ||
        !Number.isFinite(lat) || !Number.isFinite(lon) ||
        lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
    const rawName = p.get('name') || 'พื้นที่ที่เลือก';
    return { lat, lon, name: rawName.slice(0, 75), cards: p.get('layout') === 'cards', compact: p.get('compact') === '1' };
  }
  function heatIndexCelsius(temp, humidity) {
    if (!finite(temp) || !finite(humidity) || humidity < 0 || humidity > 100) return null;
    const t = temp * 9 / 5 + 32;
    let hi = 0.5 * (t + 61 + 1.2 * (t - 68) + 0.094 * humidity);
    hi = (hi + t) / 2;
    if (hi >= 80) {
      hi = -42.379 + 2.04901523 * t + 10.14333127 * humidity
        - 0.22475541 * t * humidity - 0.00683783 * t * t
        - 0.05481717 * humidity * humidity + 0.00122874 * t * t * humidity
        + 0.00085282 * t * humidity * humidity
        - 0.00000199 * t * t * humidity * humidity;
      if (humidity < 13 && t >= 80 && t <= 112) {
        hi -= (13 - humidity) / 4 * Math.sqrt((17 - Math.abs(t - 95)) / 17);
      } else if (humidity > 85 && t >= 80 && t <= 87) {
        hi += (humidity - 85) / 10 * ((87 - t) / 5);
      }
    }
    return (hi - 32) * 5 / 9;
  }
  function pm24HourAverage(data) {
    const times = data?.hourly?.time;
    const vals = data?.hourly?.pm2_5;
    const now = data?.current?.time;
    if (!Array.isArray(times) || !Array.isArray(vals) || typeof now !== 'string' ||
        times.length !== vals.length) return null;
    const samples = times.map((t, i) => ({ t, v: vals[i] }))
      .filter(x => typeof x.t === 'string' && x.t <= now)
      .slice(-24);
    if (samples.length !== 24 || !samples.every(x => finite(x.v) && x.v >= 0)) return null;
    // Require 24 consecutive hourly samples, not sparse or silently filled observations.
    const hours = samples.map(x => Date.parse(x.t + ':00Z'));
    if (hours.some(t => !Number.isFinite(t))) return null;
    for (let i = 1; i < hours.length; i++) {
      if (hours[i] - hours[i - 1] !== 3600000) return null;
    }
    return samples.reduce((sum, x) => sum + x.v, 0) / 24;
  }
  function normalizedFlood(data) {
    // Only accept a contract supplied by a reviewed server-side provider adapter.
    if (!data || data.status !== 'AVAILABLE' || !['LOW','WATCH','WARNING','CRITICAL'].includes(data.risk_level) ||
        typeof data.observed_at !== 'string' || typeof data.source !== 'string' || !data.source.trim()) return null;
    const observed = Date.parse(data.observed_at);
    if (!Number.isFinite(observed) || observed > Date.now() + 5 * 60000 ||
        Date.now() - observed > 4 * 3600000) return null;
    const risks = {
      LOW: ['ไม่พบสัญญาณเตือนในข้อมูล', 'good'],
      WATCH: ['เฝ้าระวัง', 'moderate'],
      WARNING: ['เตือนภัย', 'warning'],
      CRITICAL: ['วิกฤต', 'danger']
    };
    return { title: 'น้ำท่วม', value: risks[data.risk_level][0], tone: risks[data.risk_level][1],
      note: data.source.slice(0, 70) + ' · ' + data.observed_at, type: 'รายงานจากแหล่งที่ระบุ' };
  }
  function apiUrl(base, fields, location) {
    const url = new URL(base);
    url.searchParams.set('latitude', String(location.lat));
    url.searchParams.set('longitude', String(location.lon));
    url.searchParams.set('timezone', 'auto');
    for (const [k, v] of Object.entries(fields)) url.searchParams.set(k, String(v));
    return url.toString();
  }
  async function json(url) {
    const ctl = new AbortController();
    const timeout = setTimeout(() => ctl.abort(), 12000);
    try {
      const r = await fetch(url, { signal: ctl.signal, cache: 'no-store' });
      if (!r.ok) throw new Error('API HTTP ' + r.status);
      return await r.json();
    } finally { clearTimeout(timeout); }
  }
  function unavailable(title, note) {
    return { title, value: 'ไม่มีข้อมูล', tone: 'unavailable', note, type: 'UNAVAILABLE' };
  }
  // GISTDA CheckPhoon location response is an area estimate, not a ground sensor.
  // API expects "lng" even though embeddable public URL uses "lon".
  function gistdaObservedAt(data) {
    const date = data?.datetimeEng?.dateEng;
    const time = data?.datetimeEng?.timeEng;
    if (typeof date !== 'string' || typeof time !== 'string') return null;
    const parts = date.match(/(?:^|\s)(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/);
    const clock = time.match(/^(\d{1,2}):(\d{2})$/);
    if (!parts || !clock) return null;
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const day = Number(parts[1]), month = months.indexOf(parts[2]) + 1, year = Number(parts[3]);
    const hour = Number(clock[1]), minute = Number(clock[2]);
    if (day < 1 || day > 31 || hour > 23 || minute > 59) return null;
    const stamp = Date.parse(year + '-' + String(month).padStart(2,'0') + '-' +
      String(day).padStart(2,'0') + 'T' + String(hour).padStart(2,'0') + ':' +
      String(minute).padStart(2,'0') + ':00+07:00');
    if (!Number.isFinite(stamp) || stamp > Date.now() + 5 * 60000 ||
        Date.now() - stamp > 4 * 3600000) return null;
    return stamp;
  }
  function gistdaPmTile(payload) {
    if (payload?.status !== 200 || typeof payload?.data !== 'object' || !payload.data) return null;
    const data = payload.data;
    const value = data.pm25Avg24hrs;
    const observedAt = gistdaObservedAt(data);
    const level = classify(value, THRESHOLDS, true);
    if (!level || observedAt === null) return null;
    return { title: 'PM2.5', value: value.toFixed(1) + ' µg/m³', tone: level.tone,
      note: 'GISTDA CheckPhoon · 24 ชม. (ประมาณการพื้นที่) · ' +
        new Date(observedAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', hour12: false }),
      type: 'MODELLED', label: level.label };
  }
  async function openMeteoFallback(location) {
    try {
      const url = apiUrl('https://air-quality-api.open-meteo.com/v1/air-quality',
        { current: 'pm2_5', hourly: 'pm2_5', past_hours: 24, forecast_hours: 1 }, location);
      const data = await json(url);
      const v = pm24HourAverage(data);
      const level = classify(v, THRESHOLDS, true);
      if (level && typeof data.current?.time === 'string') {
        return { title: 'PM2.5', value: v.toFixed(1) + ' µg/m³',
          tone: level.tone, note: 'แหล่งสำรอง CAMS/Open-Meteo · 24 ชม. (แบบจำลอง) · ' + data.current.time,
          type: 'MODELLED', label: level.label };
      }
    } catch { /* Fail closed to UNAVAILABLE. */ }
    return unavailable('PM2.5', 'GISTDA และแบบจำลองสำรองไม่พร้อมใช้งาน');
  }
  async function fetchTiles(location, floodEndpoint) {
    const gistda = new URL('https://pm25.gistda.or.th/rest/getPm25byLocation');
    gistda.searchParams.set('lat', String(location.lat));
    gistda.searchParams.set('lng', String(location.lon));
    const wx = apiUrl('https://api.open-meteo.com/v1/forecast',
      { current: 'temperature_2m,relative_humidity_2m', forecast_days: 1 }, location);
    const jobs = [json(gistda.toString()), json(wx)];
    if (floodEndpoint) {
      const f = new URL(floodEndpoint);
      if (f.protocol !== 'https:') throw new Error('Flood proxy must use HTTPS');
      f.searchParams.set('lat', location.lat);
      f.searchParams.set('lon', location.lon);
      jobs.push(json(f.toString()));
    }
    const results = await Promise.allSettled(jobs);
    const primary = results[0].status === 'fulfilled' ? gistdaPmTile(results[0].value) : null;
    const pm = primary || await openMeteoFallback(location);
    let heat = unavailable('ดัชนีความร้อน', 'ข้อมูลอุณหภูมิ/ความชื้นไม่พร้อม');
    if (results[1].status === 'fulfilled') {
      const data = results[1].value;
      const v = heatIndexCelsius(data?.current?.temperature_2m, data?.current?.relative_humidity_2m);
      const level = classify(v, HEAT_LEVELS);
      if (level && typeof data.current?.time === 'string') {
        heat = { title: 'ดัชนีความร้อน', value: v.toFixed(1) + ' °C', tone: level.tone,
          note: 'คำนวณจากแบบจำลอง Open-Meteo · ' + data.current.time,
          type: 'DERIVED', label: level.label };
      }
    }
    let flood = unavailable('น้ำท่วม', 'ยังไม่เชื่อมข้อมูลเฝ้าระวังตามพิกัด');
    if (floodEndpoint) {
      flood = results[2]?.status === 'fulfilled'
        ? normalizedFlood(results[2].value) || unavailable('น้ำท่วม', 'ข้อมูลเฝ้าระวังเก่า/ผิดรูปแบบ')
        : unavailable('น้ำท่วม', 'ติดต่อแหล่งข้อมูลไม่ได้');
    }
    return [pm, heat, flood];
  }
  const core = { parseLocation, heatIndexCelsius, pm24HourAverage, normalizedFlood, gistdaPmTile, gistdaObservedAt, classify, fetchTiles };
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  root.UTHWidget = core;
  if (!root.document) return;
  const loc = parseLocation(root.location.search);
  const title = document.getElementById('place');
  const canvas = document.getElementById('content');
  const meta = document.getElementById('metadata');
  const help = document.getElementById('instructions');
  if (!title || !canvas || !meta) return;
  if (!loc) {
    title.textContent = 'กรุณาระบุพิกัด lat/lon';
    canvas.textContent = 'ตัวอย่าง: ?lat=14.36&lon=100.64&name=โรงพยาบาลอุทัย';
    if (help) help.hidden = false;
    return;
  }
  title.textContent = loc.name;
  document.body.classList.toggle('cards-mode', loc.cards);
  document.body.classList.toggle('compact-mode', loc.compact && !loc.cards);
  let tiles = [unavailable('PM2.5', 'กำลังโหลด'), unavailable('ดัชนีความร้อน', 'กำลังโหลด'),
    unavailable('น้ำท่วม', 'ยังไม่เชื่อมข้อมูล')];
  let active = 0;
  const floodEndpoint = document.querySelector('meta[name="flood-proxy"]')?.content || '';
  function render() {
    const list = loc.cards ? tiles : [tiles[active]];
    canvas.replaceChildren();
    for (const item of list) {
      const article = document.createElement('article');
      article.className = 'tile ' + item.tone;
      const label = document.createElement('strong'); label.textContent = item.title;
      const value = document.createElement('span'); value.className = 'number'; value.textContent = item.value;
      const status = document.createElement('span'); status.className = 'status';
      status.textContent = item.label || item.type;
      const note = document.createElement('small'); note.textContent = item.note;
      article.append(label, value, status, note);
      canvas.append(article);
    }
    meta.textContent = 'พื้นที่: ' + loc.lat + ', ' + loc.lon + ' · ' +
      (tiles[active]?.type || 'UNAVAILABLE') + ' · ไม่ใช่การวัด ณ จุดติดตั้ง';
  }
  let updating = false;
  async function update() {
    if (updating) return;
    updating = true;
    try { tiles = await fetchTiles(loc, floodEndpoint); }
    catch { tiles = [unavailable('PM2.5','ดึงข้อมูลไม่ได้'), unavailable('ดัชนีความร้อน','ดึงข้อมูลไม่ได้'),
      unavailable('น้ำท่วม','ข้อมูลไม่พร้อม')]; }
    finally { updating = false; render(); }
  }
  render();
  update();
  setInterval(update, REFRESH_MS);
  if (!loc.cards) setInterval(() => { active = (active + 1) % tiles.length; render(); }, ROTATE_MS);
})(typeof window !== 'undefined' ? window : globalThis);
