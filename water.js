/* Public LED water-status panel. Only the GloFAS river discharge is MODELLED.
   Measured local water levels remain UNAVAILABLE until an approved station API exists. */
(function(root) {
  'use strict';
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbwwUQCeJoz4N0P9UuRJF39pt17mBjPz0_yMDDxTO7BoiUiTQaO7Yay0UKq80EvE6dk/exec?action=snapshot_v1';
  const REFRESH_MS = 30 * 60 * 1000;
  const ROTATE_MS = 10 * 1000;
  const STATIONS = [
    {name:'ปตร.กลางคลองข้าวเม่า',label:'รอระดับน้ำจริง',source:'UNAVAILABLE'},
    {name:'ปตร.กระมัง',label:'รอระดับน้ำจริง',source:'UNAVAILABLE'},
    {name:'ปตร.หันตรา',label:'รอระดับน้ำจริง',source:'UNAVAILABLE'},
    {name:'จุดสูบน้ำวัดเกาะแก้ว',label:'รอระดับน้ำจริง',source:'UNAVAILABLE'}
  ];
  function bangkokDate(value) {
    if (!(value instanceof Date) || !Number.isFinite(value.getTime())) return null;
    const parts = new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(value);
    const d = Object.fromEntries(parts.map(p=>[p.type,p.value]));
    return d.year+'-'+d.month+'-'+d.day;
  }
  function validDay(day) {
    if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
    const date = new Date(day+'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === day;
  }
  function normalizeForecast(payload, asOf) {
    const missing = {state:'UNAVAILABLE',value:null,date:null,grid:null,reason:'ข้อมูลแบบจำลองไม่พร้อม'};
    if (!payload || payload.error || payload.daily_units?.river_discharge !== 'm³/s' ||
        !Array.isArray(payload.daily?.time) || !Array.isArray(payload.daily?.river_discharge) ||
        payload.daily.time.length !== payload.daily.river_discharge.length ||
        payload.daily.time.length > 31) return missing;
    const today = bangkokDate(asOf);
    if (!today) return missing;
    const index = payload.daily.time.findIndex(x => x === today && validDay(x));
    if (index < 0) return {...missing,reason:'ไม่พบข้อมูลพยากรณ์สำหรับวันนี้'};
    const v = payload.daily.river_discharge[index];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0)
      return {...missing,reason:'แบบจำลองไม่มีค่าตัวเลขที่ใช้งานได้'};
    const lat = payload.latitude, lon = payload.longitude;
    const grid = typeof lat === 'number' && Number.isFinite(lat) &&
                 typeof lon === 'number' && Number.isFinite(lon) ? [lat,lon] : null;
    return {state:'MODELLED',value:v,date:today,grid,reason:''};
  }
  function forecastUrl() { return ENDPOINT; }
  let callbackSequence=0;
  function snapshotJsonp() {
    if(!root.document)return Promise.reject(Error('no document'));
    return new Promise((resolve,reject)=>{
      const callback='__uthFloodSnapshot'+Date.now().toString(36)+(callbackSequence++).toString(36),script=root.document.createElement('script');
      let done=false;const finish=(err,data)=>{if(done)return;done=true;clearTimeout(timer);delete root[callback];script.remove();err?reject(err):resolve(data)};
      const timer=setTimeout(()=>finish(Error('snapshot timeout')),12000);
      root[callback]=data=>finish(null,data);script.onerror=()=>finish(Error('snapshot unavailable'));
      script.src=ENDPOINT+'&callback='+callback;root.document.head.appendChild(script);
    });
  }
  async function fetchForecast(request, clock) {
    try {
      let snapshot;
      try { const response=await request(forecastUrl(),{cache:'no-store'});if(!response.ok)throw Error('snapshot HTTP error');snapshot=await response.json(); }
      catch (e) { if(!(e instanceof TypeError))throw e;snapshot=await snapshotJsonp(); }
      const forecast=snapshot&&snapshot.schema===1&&snapshot.location&&snapshot.location.id==='uthai'&&snapshot.channels&&snapshot.channels.forecast;
      const flood=forecast&&forecast.data&&forecast.data.widgetFlood, now=clock(), stamp=flood&&Date.parse(flood.fetchedAt);
      if(!flood||!Number.isFinite(stamp)||stamp>now.getTime()+120000||now.getTime()-stamp>3*3600000)throw Error('snapshot stale');
      return normalizeForecast(flood.data,now);
    } catch { return {state:'UNAVAILABLE',value:null,date:null,grid:null,reason:'ดึงแบบจำลองไม่ได้'}; }
  }
  function formatFlow(model) {
    return model.state === 'MODELLED' ? model.value.toFixed(1)+' m³/s' : 'ไม่มีข้อมูล';
  }
  const api = {bangkokDate, validDay, normalizeForecast, forecastUrl, fetchForecast, formatFlow, STATIONS};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.UthaiWaterLED = api;
  if (!root.document) return;
  const doc = root.document;
  const compact = new URLSearchParams(root.location.search).get('compact') === '1';
  if (compact) doc.body.classList.add('compact');
  const value = doc.getElementById('flow-value');
  const detail = doc.getElementById('flow-detail');
  const updated = doc.getElementById('updated');
  const stripTitle = doc.getElementById('strip-title');
  const stripValue = doc.getElementById('strip-value');
  const stripSource = doc.getElementById('strip-source');
  if (![value,detail,updated,stripTitle,stripValue,stripSource].every(Boolean)) return;
  let model = {state:'UNAVAILABLE',value:null,date:null,grid:null,reason:'กำลังตรวจสอบ'};
  let active = 0;
  let running = false;
  function cards() {
    const flow = model.state === 'MODELLED'
      ? {name:'GloFAS (แบบจำลอง)',label:formatFlow(model),source:'MODELLED'}
      : {name:'GloFAS (แบบจำลอง)',label:'ไม่มีข้อมูล',source:'UNAVAILABLE'};
    return [...STATIONS,flow];
  }
  function draw() {
    const c = cards()[active % (STATIONS.length+1)];
    stripTitle.textContent = c.name;
    stripValue.textContent = c.label;
    stripSource.textContent = c.source;
    value.textContent = formatFlow(model);
    detail.textContent = model.state === 'MODELLED'
      ? 'วันที่พยากรณ์ '+model.date+' (เวลาไทย) · Grid '+(model.grid?model.grid.join(', '):'ไม่ระบุ')+
        ' · ยังไม่ยืนยันแม่น้ำที่ใช้คำนวณ'
      : model.reason+' · ไม่ใช่ระดับน้ำโรงพยาบาล';
  }
  async function update() {
    if(running)return;
    running=true;
    try {
      if (typeof root.fetch !== 'function') throw Error('Fetch unavailable');
      model=await fetchForecast(root.fetch.bind(root),()=>new Date());
      updated.textContent = 'ตรวจข้อมูล '+new Date().toLocaleString('th-TH',{timeZone:'Asia/Bangkok',hour12:false,day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
    } catch {
      model={state:'UNAVAILABLE',value:null,date:null,grid:null,reason:'โหลดข้อมูลไม่ได้'};
      updated.textContent='ระบบข้อมูลไม่พร้อม';
    } finally{running=false;draw();}
  }
  draw();
  update();
  root.setInterval(update,REFRESH_MS);
  root.setInterval(()=>{active=(active+1)%(STATIONS.length+1);draw();},ROTATE_MS);
})(typeof window !== 'undefined' ? window : globalThis);
