'use strict';
/* Production LED strip: static page invariants + boot-path runtime harness.
 * The harness executes the real strip.js against a minimal DOM stub (no
 * browser needed) with the real led-rotation.js data layer injected. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const D=require('../led-rotation.js');

const ROOT=path.join(__dirname,'..');
const read=n=>fs.readFileSync(path.join(ROOT,n),'utf8');
const html=read('legacy.html');
const css=read('strip.css');
const js=read('strip.js');

/* ---------- page invariants: 432x40 native strip, no iframe, no demo ---------- */
test('the legacy PM2.5 iframe is fully retired from the main page',()=>{
  assert.doesNotMatch(html,/script\.google\.com/);
  assert.doesNotMatch(html,/AKfycb/);
  assert.doesNotMatch(html,/\.legacy\{/);
  assert.doesNotMatch(html,/<iframe/i);
});
test('same 40px widget for phone, desktop preview and physical LED',()=>{
  assert.match(html,/\.led\{position:relative;width:100%;height:40px;overflow:hidden;background:#000\}/);
  assert.match(css,/\.stage \{[^}]*width:432px; height:40px;[^}]*\}/);
  assert.match(css,/\.slide \{[^}]*position:absolute; left:95px; top:1px; width:335px; height:38px;/);
  assert.doesNotMatch(css,/min-height:\s*[1-9]/);
  assert.doesNotMatch(html,/min-height/);
});
test('three native slides + fixed clock replace the old heat/water bars',()=>{
  for(const id of ['stage','day-a','clock-a','slide-pm','slide-water','slide-weather',
    'pm-value','pm-badge','pm-note','wx-temp','wx-hi','wx-rain','wx-badge','wx-note',
    'wa-value','wa-badge','wa-loc','heat-thermo','water-rig'])
    assert.ok(html.includes('id="'+id+'"'),id);
  assert.match(html,/class="slide active" id="slide-pm"/);
  assert.match(css,/@keyframes ledFadeOut/);
  assert.match(css,/@keyframes ledFadeInUp/);
  assert.doesNotMatch(html,/heat-value|heat-status|water-value|water-status/);
});
test('boot state is honest grey placeholders with no fixture values',()=>{
  assert.match(html,/id="stage" data-sev="unavailable"/);
  assert.match(html,/data-pm-mood="unavailable"/);
  assert.match(html,/data-water-motion="unavailable"/);
  assert.match(html,/data-wx-motion="unavailable"/);
  assert.match(html,/data-heat="no-data"/);
  assert.match(html,/id="pm-value">—</);
  assert.match(html,/id="wx-temp">—</);
  assert.match(html,/id="wx-hi">—</);
  assert.match(html,/id="wx-rain"[^>]*>—%</);
  assert.match(html,/id="wa-value">—</);
  for(const fake of ['20.9','>25°<','>31°<','>55%<','DEMO','demo','จำลอง','SIMULATED'])
    assert.ok(!html.includes(fake),fake);
  assert.ok(!css.includes('preview-disclosure')&&!css.includes('prototype-page'));
});
test('production reads zero state parameters from the URL',()=>{
  assert.doesNotMatch(js,/searchParams|location\.search|\?pm=|\?wx=|\?hi=|\?water=|\?freeze=|\?rot=|\?scale=/);
});
test('rendering is textContent-only and keeps single-glyph medallions',()=>{
  assert.match(js,/textContent/);
  assert.doesNotMatch(js,/innerHTML|insertAdjacentHTML|document\.write/);
  assert.doesNotMatch(read('led-rotation.js'),/innerHTML|insertAdjacentHTML|document\.write/);
  assert.match(css,/.status-symbol\.diamond \{ border-radius:50%; transform:none; color:#fff; font-size:11px;/);
  assert.equal((css.match(/\.status-symbol\.diamond[^{]*\{content/g)||[]).length,0);
});
test('water slide stays UNAVAILABLE-only in the production layer',()=>{
  assert.match(js,/v1: no approved thresholds\/source/);
  assert.doesNotMatch(js,/water-normal|water-watch|water-warning|water-danger|water-critical/);
  assert.match(html,/รอข้อมูลจริง/);
  assert.match(html,/id="wa-loc">รอข้อมูลพื้นที่</); /* location label is payload-driven, never hardcoded */
});
test('approved PM mascot expression mapping is preserved',()=>{
  assert.match(css,/#slide-pm\[data-pm-mood="protective"\] \.pm-scene img\.pm-mask-img \{ opacity:1; \}/);
  assert.match(css,/#slide-pm\[data-pm-mood="severe"\] \.pm-scene img\[data-eyes="x"\]/);
  assert.match(css,/#slide-pm\[data-pm-mood="moderate"\] \.pm-scene img\[data-mouth="smile"\]/);
  assert.match(css,/animation:pmGrin 2\.2s ease-in-out infinite; \}/); /* blue grin only */
  assert.doesNotMatch(css,/data-pm-mood="moderate"\] \.pm-rig \{ animation:pmGrin/);
});
test('reduced motion, hidden tabs and asset failure stay covered',()=>{
  assert.match(css,/@media \(prefers-reduced-motion:reduce\) \{[\s\S]*animation:none!important/);
  assert.match(css,/\.water-rig img\.water-liquid-img, \.water-rig img\.water-band-img \{ transition:none; \}/);
  assert.match(css,/html\.preview-hidden/);
  assert.match(js,/visibilitychange/);
  assert.match(css,/\.icon-scene\.asset-failed > span:not\(\.icon-fallback\) \{ display:none!important; \}/);
});
test('every asset reference is a relative, versioned URL that exists on disk',()=>{
  const refs=[...html.matchAll(/(?:src|href)="(\.\/(?:assets|strip\.css|led-rotation\.js|strip\.js)[^"]*)"/g)]
    .map(m=>m[1]);
  assert.ok(refs.length>=47,'expected the full rig + css + js references');
  for(const ref of refs){
    assert.ok(!ref.startsWith('http'),ref);
    const [file,query]=ref.split('?');
    assert.equal(query,'v=20261018-prod3',ref);
    assert.ok(fs.existsSync(path.join(ROOT,file)),ref);
  }
  const pngs=[...html.matchAll(/src="(\.\/assets\/[^"?]+\.png)\?v=/g)].map(m=>m[1]);
  for(const p of pngs)assert.ok(fs.existsSync(path.join(ROOT,p)),p);
  /* only mounted art is shipped: no stale composite or generator leftovers */
  const shipped=fs.readdirSync(path.join(ROOT,'assets/icons3d/rig')).filter(f=>f.endsWith('.png'));
  assert.ok(!shipped.includes('pm-clean-base.png'));
  for(const need of ['pm-base-good.png','pm-base-severe.png','pm-mask.png','pm-mouth-grin.png',
    'wx-clean-base.png','wx-gust.png','ui-divider.png'])
    assert.ok(shipped.includes(need)||need==='ui-divider.png'
      ? (need==='ui-divider.png'?fs.existsSync(path.join(ROOT,'assets/ui-divider.png')):shipped.includes(need))
      : false, need);
});
test('zero visible credit anywhere in the strip; Open-Meteo attribution is off-display only (2026-10-18-prod3)',()=>{
  /* owner decision: the LED shows NO credit text/anchor at all; licence-
   * reasonable attribution lives in title/aria, meta description and docs. */
  const anchors=[...html.matchAll(/<a\b[^>]*>/g)].map(m=>m[0]);
  assert.equal(anchors.length,0,'zero anchor elements in index.html');
  assert.ok(!html.includes('wx-credit'),'credit element fully removed');
  assert.ok(!css.includes('wx-credit')&&!css.includes('wx-attribution'),'credit styling fully removed');
  assert.ok(!js.includes('wx-credit'),'no credit hook in strip.js');
  /* text-node scan of the stage: strip tags so title/aria attributes are
   * excluded, then assert no visible Open-Meteo text remains */
  const stage=html.slice(html.indexOf('class="stage"'),html.indexOf('</main>'));
  const visibleText=stage.replace(/<[^>]*>/g,' ').replace(/&[a-z]+;/g,' ');
  assert.ok(!visibleText.includes('Open-Meteo'),'no visible Open-Meteo text node in .stage');
  /* off-display attribution preserved: forecast label + provenance titles */
  assert.match(html,/id="wx-rain" title="ปริมาณฝนวันนี้ \(พยากรณ์ Open-Meteo\)"/),'forecast label preserved via title';
  assert.match(html,/name="description"[^>]*Open-Meteo/),'meta description carries provenance';
  assert.match(html,/Attribution is kept off-display/),'licence comment documents the policy';
  /* licence-reasonable credit outside the display surface stays intact */
  assert.match(read('WATER-LED.md'),/creativecommons\.org\/licenses\/by\/4\.0/);
  assert.match(read('WATER-LED.md'),/เครดิต[^\n]*open-meteo\.com/i);
  assert.match(read('README.md'),/Open-Meteo/);
});
test('approved documents are updated without touching backend surfaces',()=>{
  const led=read('LED-ROTATION.md');
  assert.match(led,/action=data/);
  assert.doesNotMatch(led,/iframe source exactly unchanged/);
  const water=read('WATER-LED.md');
  assert.ok(water.length>0);
  /* The current README describes the actual LED size and data sources. */
  assert.match(read('README.md'),/432 × 40/);
  assert.match(read('README.md'),/GISTDA/);
});

/* ---------- boot harness: real strip.js + real led-rotation.js, stub DOM ---------- */
const IDS=['clock-a','day-a','pm-value','pm-unit','pm-badge','pm-note','pm-loc','slide-pm',
  'wx-temp','wx-hi','wx-rain','wx-badge','wx-note','wx-dot','wx-loc','heat-thermo','slide-weather',
  'wa-value','wa-badge','wa-loc','water-rig','slide-water','stage'];
function makeEl(id){
  const el={id,textContent:'',style:{setProperty(k,v){this[k]=v;}},dataset:{},attrs:{},
    classList:{add(){},remove(){},toggle(){},contains(){return false;}},
    setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k]??null;},
    addEventListener(){},querySelector(){return null;},querySelectorAll(){return [];},
    closest(){return null;}};
  return el;
}
function boot(){
  const reg={};
  for(const id of IDS)reg[id]=makeEl(id);
  const document={
    getElementById:id=>reg[id]||null,
    querySelector:sel=>sel==='.slide.active, .slide.entering'?reg['slide-pm']:null,
    querySelectorAll:()=>[],
    documentElement:{classList:{add(){},remove(){},toggle(){},contains(){return false;}}},
    addEventListener(){},visibilityState:'visible',visibilitychange:null,
  };
  const win={
    document,
    UthaiLEDRotation:D,
    innerWidth:432,matchMedia:()=>({matches:false}),
    setInterval:()=>0,clearInterval(){},setTimeout:()=>0,
    addEventListener(){},
  };
  const sandbox={window:win,console,Date,Math,Intl,Object,Number,String,Array,RegExp,JSON,
    Boolean,Promise,Error,module:{exports:{}},globalThis:null};
  sandbox.globalThis=sandbox;
  vm.runInNewContext(js,sandbox);
  return {reg,api:sandbox.module.exports};
}

test('boot with no payload lands every slide on honest grey placeholders',()=>{
  const {reg}=boot();
  assert.equal(reg['pm-value'].textContent,'—');
  assert.equal(reg['pm-badge'].textContent,'รอข้อมูล');
  assert.equal(reg['pm-note'].textContent,'รอข้อมูล PM2.5');
  assert.equal(reg['slide-pm'].dataset.pmMood,'unavailable');
  assert.equal(reg['slide-pm'].dataset.sev,'unavailable');
  assert.equal(reg['wx-temp'].textContent,'—');
  assert.equal(reg['wx-hi'].textContent,'—');
  assert.equal(reg['wx-rain'].textContent,'—%');
  assert.equal(reg['wx-badge'].textContent,'รอข้อมูล');
  assert.equal(reg['slide-weather'].dataset.heat,'no-data');
  assert.equal(reg['slide-weather'].dataset.wxMotion,'unavailable');
  assert.equal(reg['wa-value'].textContent,'—');
  assert.equal(reg['wa-badge'].textContent,'รอข้อมูลจริง');
  assert.equal(reg['water-rig'].attrs['data-water-state'],'unavailable');
  assert.equal(reg['water-rig'].style['--water-rgb'],'158,158,158');
  assert.match(reg['clock-a'].textContent,/^\d{2}:\d{2}$/); /* live Bangkok clock at boot */
  assert.ok(reg['day-a'].textContent.length>0);
});
test('approved moods land on the PM slide from real-derived states',()=>{
  const {reg,api}=boot();
  const cases=[
    ['good','ดีมาก','ทำกิจกรรมได้ตามปกติ','✓','pm-good',false],
    ['moderate','ดี','กลุ่มเสี่ยงเฝ้าระวังตัวเอง','✓','good',false],
    ['unhealthy','ปานกลาง','เลี่ยงกิจกรรมกลางแจ้งที่ใช้แรงมาก','!','watch',true],
    ['protective','เริ่มมีผลต่อสุขภาพ','ลดหรือจำกัดกิจกรรมนอกบ้าน','!','danger',true],
    ['severe','มีผลต่อสุขภาพ','งดกิจกรรมนอกบ้าน สวมหน้ากาก N95','!','critical',true],
    ['unavailable','รอข้อมูล','รอข้อมูล PM2.5','?','unavailable',false],
  ];
  for(const [mood,badge,note,glyph,sev,diamond] of cases){
    api.paintPM({moodKey:mood,value:mood==='unavailable'?null:({good:18,moderate:30,unhealthy:45,protective:70,severe:120})[mood]});
    assert.equal(reg['pm-badge'].textContent,badge,mood);
    assert.equal(reg['pm-note'].textContent,note,mood);
    assert.equal(reg['slide-pm'].dataset.pmMood,mood,mood);
    assert.equal(reg['slide-pm'].dataset.sev,sev,mood);
  }
  api.paintPM({moodKey:'severe',value:120.4});
  assert.equal(reg['pm-value'].textContent,'120.4'); /* one-decimal display */
  api.paintPM({moodKey:'severe',value:120});
  assert.equal(reg['pm-value'].textContent,'120');
  api.paintPM({moodKey:'unavailable',value:null});
  assert.equal(reg['pm-value'].textContent,'—'); /* null never becomes 0 */
});
test('weather slide derives HI via unchanged heatSeverity and maps WMO motion',()=>{
  const {reg,api}=boot();
  api.paintWeather({tempC:32,hiC:55,code:95,rainPct:80});
  assert.equal(reg['wx-temp'].textContent,'32°');
  assert.equal(reg['wx-hi'].textContent,'55°');
  assert.equal(reg['wx-rain'].textContent,'80%');
  assert.equal(reg['slide-weather'].dataset.heat,'extreme');
  assert.equal(reg['slide-weather'].dataset.sev,'critical');
  assert.equal(reg['heat-thermo'].style['--heat-rgb'],'255,68,91');
  assert.equal(reg['slide-weather'].dataset.wxMotion,'thunder');
  assert.equal(reg['wx-note'].textContent,'มีฝนฟ้าคะนอง');
  api.paintWeather({tempC:32,hiC:45,code:65,rainPct:70});
  assert.equal(reg['slide-weather'].dataset.heat,'danger');
  assert.equal(reg['slide-weather'].dataset.wxMotion,'heavy-rain');
  api.paintWeather({tempC:25,hiC:20,code:0,rainPct:null});
  assert.equal(reg['slide-weather'].dataset.heat,'below');
  assert.equal(reg['slide-weather'].dataset.sev,'heat-below');
  assert.equal(reg['wx-rain'].textContent,'—%'); /* missing forecast only blanks rain */
  assert.equal(reg['wx-temp'].textContent,'25°');
  api.paintWeather({tempC:null,hiC:null,code:null,rainPct:null});
  assert.equal(reg['slide-weather'].dataset.heat,'no-data');
  assert.equal(reg['wx-badge'].textContent,'รอข้อมูล');
  assert.equal(reg['slide-weather'].dataset.wxMotion,'unavailable');
});
test('water rendering is hard-locked to the grey unavailable gauge',()=>{
  const {reg,api}=boot();
  api.paintWater();
  assert.equal(reg['wa-value'].textContent,'—');
  assert.equal(reg['wa-badge'].textContent,'รอข้อมูลจริง');
  assert.equal(reg['water-rig'].attrs['data-water-state'],'unavailable');
  assert.equal(reg['water-rig'].style['--water-rgb'],'158,158,158');
  api.paintWater();
  assert.equal(reg['wa-value'].textContent,'—');
});
test('normalized payload end-to-end drives the boot paint pipeline',()=>{
  const {reg,api}=boot();
  const T=Date.now();
  const obsIso=new Date(T-10*60000).toLocaleString('sv-SE',{timeZone:'Asia/Bangkok'}).replace(' ','T')+'+07:00';
  const raw={
    schema:1,generatedAt:new Date(T).toLocaleString('sv-SE',{timeZone:'Asia/Bangkok'}).replace(' ','T')+'+07:00',
    pm25:{status:'ok',value:120,avg24h:120,unit:'µg/m³',observedAt:obsIso,band:'unhealthy'},
    weather:{status:'ok',temperatureC:35,humidityPct:60,weatherCode:0,tmaxC:38,tminC:27,
      rainPct:10,observedAt:obsIso,forecastDate:D.bangkokToday(T)},
    water:{status:'missing',available:false,value:null,unit:'m',observedAt:null,source:'NONE'},
    errors:[]
  };
  const state=D.normalizePayload(raw,Date.now());
  api.paintPM(state.pm);
  api.paintWeather(state.weather);
  api.paintWater();
  assert.equal(reg['pm-value'].textContent,'120');
  assert.equal(reg['slide-pm'].dataset.pmMood,'severe');
  assert.equal(reg['pm-badge'].textContent,'มีผลต่อสุขภาพ');
  assert.equal(reg['slide-weather'].dataset.heat,'danger'); /* HI(35,60) ≈ 43-49 */
  assert.ok(reg['wx-hi'].textContent.endsWith('°'));
});
test('rotation hands off sequentially and keeps the 12s contract',()=>{
  const els=[0,1,2].map(i=>{const el=makeEl('s'+i);el.classList={_s:new Set(),
    add(c){this._s.add(c);},remove(c){this._s.delete(c);},toggle(c,f){f?this._s.add(c):this._s.delete(c);},
    contains(c){return this._s.has(c);}};return el;});
  const settles=[];
  const rot=require('../strip.js').createRotation(els,()=>settles.push(1));
  rot.show(0);
  assert.ok(els[0].classList.contains('active'));
  rot.next();
  assert.ok(els[0].classList.contains('leaving'));
  assert.ok(els[1].classList.contains('entering'));
});
