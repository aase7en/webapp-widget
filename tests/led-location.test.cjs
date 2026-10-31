'use strict';
/* Multi-location + provenance contract (additive, canonical 2026-10-17):
 * root location {id,label,lat,lon}, per-channel source:string + optional
 * provenance {provider,agency,service,stationId,sourceUrl,termsUrl,timeZone,
 * unit,datum} — public string/null only. The frontend must never lie about
 * WHERE a reading comes from: labels follow the active Sheet location, and a
 * failed channel under a new location never reuses the previous location's
 * data. */
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const w=require('../led-rotation.js');
const strip=require('../strip.js');
const now=Date.parse('2026-10-17T08:25:00+07:00');
const OBS='2026-10-17T08:00:00+07:00';

function payload(over={}){
  return Object.assign({
    schema:1,
    generatedAt:'2026-10-17T08:24:00+07:00',
    location:{id:'uthai_tambon',label:'ต.อุทัย จ.อุทัยธานี',lat:14.36147,lon:100.64424},
    pm25:{status:'ok',value:22.4,unit:'µg/m³',observedAt:OBS,source:'GISTDA',
      provenance:{provider:'GISTDA',agency:'GISTDA',service:'PM25 tambon/area estimate',
        stationId:'1414',sourceUrl:'https://gistda.or.th/',termsUrl:null,
        timeZone:'Asia/Bangkok',unit:'µg/m³',datum:null}},
    weather:{status:'ok',temperatureC:32,humidityPct:72,weatherCode:1,tmaxC:36,tminC:26,
      rainPct:40,observedAt:OBS,forecastDate:'2026-10-17',source:'OPEN_METEO',
      provenance:{provider:'Open-Meteo',agency:null,service:'forecast API',
        stationId:null,sourceUrl:'https://open-meteo.com/',termsUrl:'https://open-meteo.com/terms',
        timeZone:'Asia/Bangkok',unit:'°C/%',datum:null}},
    water:{status:'missing',available:false,value:null,unit:'m',observedAt:null,source:'NONE',
      provenance:{provider:null,agency:null,service:null,stationId:null,sourceUrl:null,
        termsUrl:null,timeZone:'Asia/Bangkok',unit:'m',datum:'msl'}},
    errors:[]
  },over);
}

/* ---------- location sanitisation ---------- */
test('location passes through valid id/label/coords',()=>{
  const loc=w.normalizeLocation({id:'uthai_tambon',label:'ต.อุทัย',lat:14.36147,lon:100.64424});
  assert.deepEqual(loc,{id:'uthai_tambon',label:'ต.อุทัย',lat:14.36147,lon:100.64424});
});
test('lat/lon range validation never coerces null to 0',()=>{
  for(const [mut,field] of [
    [r=>{r.lat=91;},'lat'],[r=>{r.lat=-90.1;},'lat'],[r=>{r.lat=null;},'lat'],
    [r=>{r.lat='14.36';},'lat'],[r=>{r.lat=Number.NaN;},'lat'],[r=>{r.lat=Infinity;},'lat'],
    [r=>{r.lon=180.1;},'lon'],[r=>{r.lon=-181;},'lon'],[r=>{r.lon=null;},'lon'],
    [r=>{r.lon='0';},'lon'],
  ]){
    const base={id:'x',label:'L',lat:14.36,lon:100.64};
    mut(base);
    const loc=w.normalizeLocation(base);
    assert.equal(loc[field],null,field+' '+JSON.stringify(base));
    if(field==='lat')assert.equal(loc.lon,100.64); /* independent fields */
  }
  assert.equal(w.normalizeLocation({id:'x',label:'L',lat:-90,lon:180}).lat,-90);
  assert.equal(w.normalizeLocation({id:'x',label:'L',lat:90,lon:-180}).lon,-180);
  assert.equal(w.normalizeLocation({id:'x',label:'L',lat:0,lon:0}).lat,0); /* 0 is a real value */
});
test('location ids allow only known safe characters',()=>{
  assert.equal(w.safeId('uthai_tambon.01-A'),'uthai_tambon.01-A');
  for(const bad of ['javascript:alert(1)','<script>','data:x','a b','../etc','x'.repeat(65),''])
    assert.equal(w.safeId(bad),null,bad);
});
test('labels and provenance strings are type/length sanitized',()=>{
  assert.equal(w.sanitizeText('  ต.อุทัย  ',40),'ต.อุทัย');
  assert.equal(w.sanitizeText('x'.repeat(300),40).length,40);
  for(const bad of [null,undefined,42,{},[]])assert.equal(w.sanitizeText(bad,40),null);
  assert.equal(w.sanitizeText('   ',40),null);
});
test('missing or malformed location root degrades to all-null without throwing',()=>{
  for(const bad of [undefined,null,42,'x',[],{},{id:7,label:9,lat:'a'}]){
    const loc=w.normalizeLocation(bad);
    assert.equal(loc.id,null);
    assert.equal(loc.label,null);
    assert.equal(loc.lat,null);
    assert.equal(loc.lon,null);
  }
});

/* ---------- provenance sanitisation ---------- */
test('provenance keeps public strings and drops unsafe link schemes',()=>{
  const p=w.normalizeProvenance({provider:'GISTDA',agency:'กรมควบคุมมลพิษ',service:'Air4Thai',
    stationId:'t50_x',sourceUrl:'https://example.org/a',termsUrl:'https://example.org/t',
    timeZone:'Asia/Bangkok',unit:'µg/m³',datum:'msl'});
  assert.equal(p.sourceUrl,'https://example.org/a');
  assert.equal(p.termsUrl,'https://example.org/t');
  assert.equal(p.agency,'กรมควบคุมมลพิษ');
  assert.equal(p.datum,'msl');
});
test('javascript:/data: URLs and oversized/mistyped fields are rejected',()=>{
  const p=w.normalizeProvenance({provider:'P',sourceUrl:'javascript:window.__xss=1',
    termsUrl:'data:text/html,<script>',agency:'x'.repeat(200),stationId:42});
  assert.equal(p.sourceUrl,null);
  assert.equal(p.termsUrl,null);
  assert.ok(p.agency.length<=120);
  assert.equal(p.stationId,null);
  assert.equal(w.normalizeProvenance(null),null);
  assert.equal(w.normalizeProvenance('x'),null);
  assert.equal(w.normalizeProvenance([]),null);
});
test('http links are not silently promoted either (https-only metadata)',()=>{
  const p=w.normalizeProvenance({sourceUrl:'http://example.org/'});
  assert.equal(p.sourceUrl,null); /* text-only provenance; no live links rendered */
});

/* ---------- additive payload normalisation ---------- */
test('payload carries sanitized location + per-channel provenance alongside unchanged channels',()=>{
  const s=w.normalizePayload(payload(),now);
  assert.equal(s.location.label,'ต.อุทัย จ.อุทัยธานี');
  assert.equal(s.location.lat,14.36147);
  assert.equal(s.pm.status,'ok');          /* unchanged channel semantics */
  assert.equal(s.pm.moodKey,'moderate'); /* 22.4 hourly fallback -> 2026 'good' band -> ดี mood */
  assert.equal(s.pm.source,'GISTDA');
  assert.equal(s.pm.provenance.agency,'GISTDA');
  assert.equal(s.pm.provenance.stationId,'1414');
  assert.equal(s.weather.source,'OPEN_METEO');
  assert.equal(s.weather.provenance.service,'forecast API');
  assert.equal(s.water.status,'unavailable'); /* v1 verified-only rule intact */
  assert.equal(s.water.value,null);
  assert.ok(s.errors.includes('water-unapproved-claim')===false);
});
test('older contract without location root keeps valid readings and degrades labels',()=>{
  const raw=payload();
  delete raw.location;
  delete raw.pm25.provenance;
  const s=w.normalizePayload(raw,now);
  assert.equal(s.pm.status,'ok');
  assert.equal(s.pm.moodKey,'moderate'); /* 2026: 22.4 -> 'good' band -> ดี mood */
  assert.equal(s.pm.provenance,null);
  assert.deepEqual(s.location,{id:null,label:null,lat:null,lon:null});
  assert.deepEqual(s.errors,[]);
});
test('malformed location/provenance never fail the channels',()=>{
  const raw=payload();
  raw.location={id:'<svg onload=1>',label:5,lat:999};
  raw.pm25.provenance={agency:{},sourceUrl:'javascript:x'};
  const s=w.normalizePayload(raw,now);
  assert.equal(s.pm.status,'ok');
  assert.equal(s.location.id,null);
  assert.equal(s.location.label,null);
  assert.equal(s.location.lat,null);
  assert.equal(s.pm.provenance.agency,null);
  assert.equal(s.pm.provenance.sourceUrl,null);
});

/* ---------- presentation: labels, titles, atomic switch ---------- */
function bootAndPaint(raw,nowMs){
  const {reg,api}=require('./helpers/location-boot.cjs').boot(raw,nowMs);
  return {reg,api};
}
test('boot without config shows neutral รอข้อมูลพื้นที่, never hardcoded names',()=>{
  const {reg}=bootAndPaint(null);
  for(const id of ['pm-loc','wx-loc','wa-loc'])
    assert.equal(reg[id].textContent,'รอข้อมูลพื้นที่',id);
});
test('active location label lands on all three slides',()=>{
  const {reg}=bootAndPaint(payload(),now);
  const short=reg['pm-loc'].textContent;
  assert.ok(short.includes('อุทัย'),short);
  assert.equal(reg['wx-loc'].textContent,reg['pm-loc'].textContent);
  assert.equal(reg['wa-loc'].textContent,reg['pm-loc'].textContent);
});
test('provenance is inspectable via title/aria text without links or HTML',()=>{
  const {reg}=bootAndPaint(payload(),now);
  const title=reg['slide-pm'].attrs['title']||'';
  assert.match(title,/GISTDA/);
  assert.match(title,/PM25 tambon\/area estimate/);
  assert.ok(!/javascript:|data:|<img|<script/i.test(title),title);
  const aria=reg['slide-pm'].attrs['aria-label']||'';
  assert.match(aria,/GISTDA/);
  /* GISTDA 'stationId' is an AREA code, not a station: labelled as area */
  assert.match(title,/พื้นที่\/รหัสพื้นที่ 1414/);
  assert.ok(!/สถานี 1414/.test(title),title);
  const wtitle=reg['slide-water'].attrs['title']||'';
  assert.match(wtitle,/ยังไม่มีแหล่งข้อมูล|ยืนยัน/); /* honest v1 water provenance */
  const etitle=reg['slide-weather'].attrs['title']||'';
  assert.match(etitle,/Open-Meteo/);
});
test('provenance title includes coordinates only when both are valid',()=>{
  const {reg}=bootAndPaint(payload(),now);
  assert.match(reg['slide-weather'].attrs['title'],/14\.3615/);
  const raw=payload();
  raw.location={id:'b',label:'สถานี บี',lat:91,lon:100}; /* invalid lat */
  const r2=bootAndPaint(raw,now);
  assert.equal(/พิกัด/.test(r2.reg['slide-weather'].attrs['title']||''),false);
});
test('location A -> B with B channels failed: labels switch, NO stale A data',()=>{
  const A=payload();
  const rawB=payload({
    location:{id:'station_b',label:'สถานี บี',lat:15.1,lon:101.2},
  });
  rawB.pm25.status='stale';
  rawB.weather.status='missing';
  rawB.weather.observedAt=null;
  const first=require('./helpers/location-boot.cjs').boot(A,now);
  assert.notEqual(first.reg['wx-temp'].textContent,'—');   /* A renders */
  assert.ok(first.reg['pm-loc'].textContent.includes('อุทัย'));
  const {reg,api}=require('./helpers/location-boot.cjs').boot(A,now);
  api.paintAllFrom(A,now);
  const tA=reg['wx-temp'].textContent;
  assert.notEqual(tA,'—');
  api.paintAllFrom(rawB,now);
  assert.equal(reg['wx-temp'].textContent,'—');       /* B weather failed: no A reuse */
  assert.equal(reg['pm-value'].textContent,'—');      /* B pm stale: no A reuse */
  assert.equal(reg['pm-badge'].textContent,'รอข้อมูล');
  assert.ok(reg['pm-loc'].textContent.includes('บี'));
  assert.ok(reg['wx-loc'].textContent.includes('บี'));
  assert.ok(reg['wa-loc'].textContent.includes('บี'));
  assert.equal(reg['slide-weather'].dataset.heat,'no-data');
  assert.match(reg['slide-pm'].attrs['title'],/บี/);
});
test('water display never exposes thresholds or heights in any v1 state',()=>{
  const {reg,api}=require('./helpers/location-boot.cjs').boot(payload(),now);
  api.paintAllFrom(payload(),now);
  assert.equal(reg['wa-value'].textContent,'—');
  const title=reg['slide-water'].attrs['title']||'';
  assert.ok(!/\d+\s*(ม\.|m)\b.*(?:วิกฤต|อันตราย|เฝ้าระวัง)/.test(title));
});

/* ---------- Open-Meteo attribution: off-display only (2026-10-18-prod3) ---------- */
test('no credit node exists at runtime; provenance stays text-only on slides',()=>{
  const {reg,api}=require('./helpers/location-boot.cjs').boot(payload(),now);
  api.paintAllFrom(payload(),now);
  assert.equal(reg['wx-credit'],undefined,'no credit element in the DOM registry');
  /* hostile payload data must not conjure any credit back — and provenance
   * titles keep carrying the provider off-display */
  const evil=payload();
  evil.weather.provenance.provider='javascript:window.__xssC=1';
  evil.weather.source='<script>window.__xssC2=1</script>';
  api.paintAllFrom(evil,now);
  assert.equal(reg['wx-credit'],undefined,'no credit element after hostile payload');
  /* provenance stays text-only: title is a plain string attribute, never
   * markup (inert even under hostile source strings; rendering is pinned
   * textContent-only in led-strip + browser suites) */
  assert.equal(typeof reg['slide-weather'].attrs['title'],'string');
});

/* ---------- 2026-10-18-prod3: visible credit removed, attribution off-display ---------- */
test('index.html has zero anchors and zero visible Open-Meteo text in the stage',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../legacy.html'),'utf8');
  assert.equal([...html.matchAll(/<a\b[^>]*>/g)].length,0,'zero anchors in document');
  assert.ok(!html.includes('wx-credit'),'credit element gone');
  assert.ok(!html.includes('open-meteo.com/'),'no credit href anywhere');
  assert.ok(!html.includes('wx-attribution'),'button class retired');
  const stage=html.slice(html.indexOf('class="stage"'),html.indexOf('</main>'));
  const visibleText=stage.replace(/<[^>]*>/g,' ').replace(/&[a-z]+;/g,' ');
  assert.ok(!visibleText.includes('Open-Meteo'),'no visible Open-Meteo text node in .stage');
  /* off-display provenance pins */
  assert.match(html,/id="wx-rain" title="ปริมาณฝนวันนี้ \(พยากรณ์ Open-Meteo\)"/);
  assert.match(html,/name="description"[^>]*Open-Meteo/);
});
test('credit CSS is fully removed; rain value keeps its position; strip.js stays clean',()=>{
  const css=fs.readFileSync(path.join(__dirname,'../strip.css'),'utf8');
  assert.ok(!/\.wx-credit/.test(css),'no .wx-credit rules left');
  assert.ok(!css.includes('wx-attribution'),'no retired button class');
  /* the rain metric keeps the old top-aligned 2px inset so removing the
   * credit element causes zero layout shift on the LED */
  assert.match(css,/#slide-weather \.weather-rain \{ justify-content:flex-start; padding-top:2px; \}/);
  const js=fs.readFileSync(path.join(__dirname,'../strip.js'),'utf8');
  assert.ok(!js.includes('wx-credit'),'strip.js renders no credit');
  assert.ok(!/พระนครศรีอยุธยา|ต\.อุทัย/.test(js),'no hardcoded location strings in frontend');
});
test('water label regression: correct Sheet label renders verbatim, wrong seed never auto-fixed',()=>{
  const full='ต.อุทัย อ.อุทัย จ.พระนครศรีอยุธยา';
  const raw2=payload();
  raw2.location={id:'uthai_tambon',label:full,lat:14.36147,lon:100.64424};
  const {reg,api}=require('./helpers/location-boot.cjs').boot(raw2,now);
  api.paintAllFrom(raw2,now);
  assert.match(reg['slide-water'].attrs['title'],new RegExp(full));
  assert.equal(reg['wa-loc'].attrs['title'],full); /* full label in native title */
  assert.ok(!/อ\.พระนครศรีอยุธยา/.test(reg['slide-water'].attrs['title']));
  /* frontend renders whatever the backend sends without rewriting labels */
  const wrong=payload();
  wrong.location={id:'uthai_tambon',label:'ต.อุทัย อ.พระนครศรีอยุธยา',lat:14.36147,lon:100.64424};
  const wr=require('./helpers/location-boot.cjs').boot(wrong,now);
  wr.api.paintAllFrom(wrong,now);
  assert.equal(wr.reg['wa-loc'].attrs['title'],'ต.อุทัย อ.พระนครศรีอยุธยา'); /* verbatim, no silent fix */
});
