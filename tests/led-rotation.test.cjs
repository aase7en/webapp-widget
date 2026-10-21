'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const w=require('../led-rotation.js');
const now=Date.parse('2026-10-17T08:25:00+07:00');
const OBS='2026-10-17T08:00:00+07:00';
const payload=()=>({
  schema:1,
  generatedAt:'2026-10-17T08:24:00+07:00',
  pm25:{status:'ok',value:22.4,unit:'µg/m³',observedAt:OBS,source:'GISTDA ต.อุทัย',band:'very_good'},
  weather:{status:'ok',temperatureC:32,humidityPct:72,weatherCode:1,tmaxC:36,tminC:26,
    rainPct:40,observedAt:OBS,forecastDate:'2026-10-17',source:'OPEN_METEO'},
  water:{status:'missing',available:false,value:null,unit:'m',observedAt:null,source:'NONE'},
  errors:[]
});

/* ---------- unchanged heat math (legacy behaviour, still authoritative) ---------- */
test('NOAA heat index is derived from temp and RH, not reported as a sensor',()=>{
  const value=w.heatCelsius(32,72);
  assert.ok(value>38 && value<47);
});
test('zero/missing and invalid humidity are not collapsed to 0 heat index',()=>{
  assert.equal(w.heatCelsius(32,null),null);
  assert.equal(w.heatCelsius(32,undefined),null);
  assert.equal(w.heatCelsius(32,101),null);
  assert.equal(w.heatCelsius(NaN,70),null);
  assert.equal(w.heatCelsius(32,0)!==null,true);
});
test('strict legacy Bangkok minute parser kept for compatibility',()=>{
  assert.equal(w.parseBangkokTime('2026-10-14T08:15'),Date.parse('2026-10-14T08:15+07:00'));
  assert.equal(w.parseBangkokTime('2026-10-14T08:15Z'),null);
});
test('Thai heat severity colours use displayed one-decimal temperature and agency cutoffs',()=>{
  const levels=[
    [26.9,'heat-below','ต่ำกว่าเกณฑ์'],
    [27,'heat-watch','เฝ้าระวัง'],
    [32.9,'heat-watch','เฝ้าระวัง'],
    [33,'heat-caution','เตือนภัย'],
    [41.9,'heat-caution','เตือนภัย'],
    [42,'heat-danger','อันตราย'],
    [51.9,'heat-danger','อันตราย'],
    [52,'heat-extreme','อันตรายมาก'],
    [32.95,'heat-caution','เตือนภัย'],
    [41.95,'heat-danger','อันตราย'],
    [51.95,'heat-extreme','อันตรายมาก']
  ];
  for(const [num,cls,name] of levels){
    const result=w.heatSeverity(num);
    assert.equal(result.cls,cls,String(num));
    assert.match(result.label,new RegExp(name),String(num));
    assert.match(result.label,/คำนวณ/,String(num));
  }
  assert.equal(w.heatSeverity(null).cls,'no-data');
  assert.equal(w.heatSeverity(NaN).cls,'no-data');
  assert.notEqual(w.heatSeverity(0).cls,'no-data');
});
test('short labels are marked as derived, not an official safety warning',()=>{
  assert.match(w.shortHeatLabel(40),/คำนวณ/);
  assert.match(w.shortHeatLabel(44),/คำนวณ/);
  assert.equal(w.shortHeatLabel(null),'รอข้อมูล');
});
test('stale heat-model readings expire regardless of refresh timers',()=>{
  const now=Date.parse('2026-10-17T10:00:00+07:00');
  const good={value:41.9,time:now-w.HEAT_FRESHNESS_MS,type:'DERIVED'};
  assert.equal(w.freshHeat(good,now).value,41.9);
  assert.equal(w.freshHeat(good,now+1),null);
  assert.equal(w.freshHeat({...good,time:now-4*3600000},now),null);
  assert.equal(w.freshHeat({...good,time:now+6*60000},now),null);
  assert.equal(w.freshHeat({...good,type:'MEASURED'},now),null);
  assert.equal(w.freshHeat(null,now),null);
  assert.equal(w.freshHeat({value:null,time:now,type:'DERIVED'},now),null);
  /* the visibility/exposure revalidation now lives in the presentation layer */
  assert.match(fs.readFileSync(path.join(__dirname,'../strip.js'),'utf8'),/visibilitychange/);
});

/* ---------- PM band derivation: legacy Code.gs cutoffs incl. fractional edges ---------- */
test('PM bands inherit the legacy Code.gs cutoffs with exact fractional edges',()=>{
  const cases=[
    [0,'very_good'],[25,'very_good'],[25.9,'very_good'],[26,'good'],[37.9,'good'],
    [38,'moderate'],[50.9,'moderate'],[51,'unhealthy_sensitive'],[90.9,'unhealthy_sensitive'],
    [91,'unhealthy'],[120,'unhealthy']
  ];
  for(const [v,band] of cases)assert.equal(w.pmBandKey(v),band,String(v));
  for(const bad of [null,undefined,NaN,Infinity,-1,-0.1,'30'])assert.equal(w.pmBandKey(bad),null,String(bad));
});
test('legacy criteria are labelled inherited, never an externally verified standard',()=>{
  const md=fs.readFileSync(path.join(__dirname,'../LED-ROTATION.md'),'utf8');
  assert.match(md,/Code\.gs/);
  assert.match(md,/ยังไม่ได้|ไม่ใช่มาตรฐาน|inherited|legacy/i);
});

/* ---------- normalisation (fail closed per channel) ---------- */
test('fresh ok payload maps every channel; water stays unavailable',()=>{
  const s=w.normalizePayload(payload(),now);
  assert.equal(s.pm.status,'ok');
  assert.equal(s.pm.value,22.4);
  assert.equal(s.pm.moodKey,'good'); /* very_good -> approved blue mood */
  assert.equal(s.weather.status,'ok');
  assert.equal(s.weather.tempC,32);
  assert.ok(s.weather.hiC>38 && s.weather.hiC<47);
  assert.equal(s.weather.rainPct,40);
  assert.equal(s.water.status,'unavailable');
  assert.equal(s.water.value,null);
  assert.deepEqual(s.errors,[]);
});
test('payload source/provenance reach render state only as sanitized text (no link schemes)',()=>{
  const s=w.normalizePayload(payload(),now);
  assert.equal(s.pm.source,'GISTDA ต.อุทัย');   /* display metadata, string only */
  assert.equal(typeof s.pm.provenance,'object');/* fields string/null, https links only */
  const raw=payload();
  raw.pm25.source='<img src=x onerror=window.__xss=1>';
  raw.weather.source='<script>window.__xss=1</script>';
  raw.pm25.provenance={sourceUrl:'javascript:window.__xss=2',termsUrl:'data:text/html,x'};
  const s2=w.normalizePayload(raw,now);
  assert.equal(typeof s2.pm.source,'string');   /* inert text; strip renders textContent-only */
  assert.ok(s2.pm.source.length<=80);
  assert.equal(s2.pm.provenance.sourceUrl,null); /* unsafe schemes dropped outright */
  assert.equal(s2.pm.provenance.termsUrl,null);
});
test('PM mood mapping covers all five legacy bands',()=>{
  for(const [v,mood] of [[10,'good'],[30,'moderate'],[45,'unhealthy'],[70,'protective'],[120,'severe']]){
    const raw=payload(); raw.pm25.value=v; raw.pm25.band=null; /* local authority decides */
    const got=w.normalizePayload(raw,now);
    assert.equal(got.pm.moodKey,mood,String(v));
  }
});
test('a payload band string conflicting with the local derivation fails closed',()=>{
  const raw=payload(); raw.pm25.value=40; raw.pm25.band='good'; /* local says moderate */
  const s=w.normalizePayload(raw,now);
  assert.equal(s.pm.status,'unavailable');
  assert.equal(s.pm.value,null);
  assert.ok(s.errors.some(e=>String(e).startsWith('pm25-band-conflict:good')));
  const okRaw=payload(); okRaw.pm25.value=40; okRaw.pm25.band='moderate';
  assert.equal(w.normalizePayload(okRaw,now).pm.status,'ok');
  const noBand=payload(); noBand.pm25.band=null;
  assert.equal(w.normalizePayload(noBand,now).pm.status,'ok'); /* local authority decides */
});
test('PM unit, value sanity and null handling never fabricate a reading',()=>{
  for(const [mutate,err] of [
    [r=>{r.pm25.unit='ug/m3';},'pm25-unit'],
    [r=>{r.pm25.unit=null;},'pm25-unit'],
    [r=>{r.pm25.value=null;},'pm25-value'],
    [r=>{r.pm25.value=-3;},'pm25-value'],
    [r=>{r.pm25.value='30';},'pm25-value'],
    [r=>{r.pm25.value=Number.NaN;},'pm25-value'],
  ]){
    const raw=payload(); mutate(raw);
    const s=w.normalizePayload(raw,now);
    assert.equal(s.pm.status,'unavailable',err);
    assert.equal(s.pm.value,null);
    assert.equal(s.pm.moodKey,'unavailable');
    assert.ok(s.errors.includes(err),err);
  }
});
test('observedAt governs freshness; generatedAt is never a fallback',()=>{
  const t=(iso)=>{const raw=payload();raw.pm25.observedAt=iso;return w.normalizePayload(raw,now);};
  assert.equal(t(OBS).pm.status,'ok');
  assert.equal(t('2026-10-17T01:00:00.000Z').pm.status,'ok'); /* Z form = 08:00+07, fresh */
  assert.equal(t('2026-10-17T15:00Z').pm.status,'unavailable'); /* 22:00+07 is future */
  assert.equal(t('2026-10-17T05:26:00+07:00').pm.status,'ok'); /* just under 3h */
  assert.equal(t('2026-10-17T05:24:59+07:00').pm.status,'unavailable'); /* just over 3h */
  assert.equal(t('2026-10-17T08:36:00+07:00').pm.status,'unavailable'); /* future >5min */
  assert.equal(t('2026-10-17 08:00:00').pm.status,'unavailable'); /* not ISO */
  assert.equal(t(undefined).pm.status,'unavailable');
  assert.equal(t(null).pm.status,'unavailable');
  const raw=payload(); delete raw.pm25.observedAt; /* generatedAt still present */
  const s=w.normalizePayload(raw,now);
  assert.equal(typeof raw.generatedAt,'string');
  assert.equal(s.pm.status,'unavailable');
});
test('weather channel degrades independently of PM',()=>{
  const raw=payload();
  raw.weather.observedAt='2026-10-17T04:00:00+07:00'; /* >3h old */
  const s=w.normalizePayload(raw,now);
  assert.equal(s.pm.status,'ok');
  assert.equal(s.weather.status,'unavailable');
  assert.ok(s.errors.includes('weather-observedAt'));
  for(const status of ['stale','missing']){
    const r2=payload(); r2.weather.status=status;
    const s2=w.normalizePayload(r2,now);
    assert.equal(s2.weather.status,'unavailable',status);
    assert.equal(s2.pm.status,'ok',status);
  }
});
test('missing forecast must not blank a valid current temperature or HI',()=>{
  const raw=payload();
  raw.weather.forecastDate='2026-10-16'; /* yesterday, Bangkok calendar */
  const s=w.normalizePayload(raw,now);
  assert.equal(s.weather.rainPct,null);
  assert.equal(s.weather.tempC,32);
  assert.ok(s.weather.hiC>38);
  const r2=payload(); r2.weather.rainPct=null;
  const s2=w.normalizePayload(r2,now);
  assert.equal(s2.weather.rainPct,null);
  assert.equal(s2.weather.tempC,32);
  const r3=payload(); r3.weather.humidityPct=null;
  const s3=w.normalizePayload(r3,now);
  assert.equal(s3.weather.tempC,32);   /* current temp intact */
  assert.equal(s3.weather.hiC,null);   /* HI needs both raw fields */
});
test('Bangkok calendar day decides forecast validity',()=>{
  assert.equal(w.bangkokToday(Date.parse('2026-10-17T17:30:00Z')),'2026-10-18');
  assert.equal(w.bangkokToday(now),'2026-10-17');
  const raw=payload();
  raw.weather.forecastDate=w.bangkokToday(Date.parse('2026-10-17T17:30:00Z'));
  assert.equal(w.normalizePayload(raw,now).weather.rainPct,null); /* tomorrow for now */
});
test('water can never be enabled by a payload claim in v1',()=>{
  const raw=payload();
  raw.water={status:'ok',available:true,value:4.2,unit:'m',observedAt:OBS,source:'SPOOF'};
  const s=w.normalizePayload(raw,now);
  assert.equal(s.water.status,'unavailable');
  assert.equal(s.water.value,null);
  assert.ok(s.errors.includes('water-unapproved-claim'));
});
test('schema/version failures return the all-unavailable state',()=>{
  for(const bad of [null,undefined,'x',42,[],{}, {...payload(),schema:2},{...payload(),schema:'1'}]){
    const s=w.normalizePayload(bad,now);
    assert.equal(s.pm.status,'unavailable');
    assert.equal(s.weather.status,'unavailable');
    assert.equal(s.water.status,'unavailable');
    assert.ok(s.errors.includes('schema')||bad===undefined||bad===null);
  }
});

/* ---------- transport: one fixed endpoint, single flight, JSONP fallback ---------- */
test('single fixed backend endpoint replaces all direct upstream API calls',()=>{
  assert.equal(w.BACKEND_URL,'https://script.google.com/macros/s/AKfycbwwUQCeJoz4N0P9UuRJF39pt17mBjPz0_yMDDxTO7BoiUiTQaO7Yay0UKq80EvE6dk/exec');
  assert.equal(w.BACKEND_QUERY,'?action=data&v=1');
  assert.equal(w.ROTATE_MS,12000);
  assert.equal(w.REFRESH_MS,15*60*1000);
  assert.equal(w.FETCH_TIMEOUT_MS,12000);
  assert.equal(w.FUTURE_MS,5*60000);
  assert.equal(w.FRESH_MS,3*3600000);
  for(const f of ['led-rotation.js','strip.js','legacy.html','strip.css'])
    assert.doesNotMatch(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),/api\.open-meteo\.com/);
});
test('backend GET uses the fixed URL, no-store and follow redirects',async()=>{
  let called=0;
  const got=await w.requestBackendData(async(url,init)=>{
    called++;
    assert.equal(url,w.BACKEND_URL+w.BACKEND_QUERY);
    assert.equal(init.cache,'no-store');
    assert.equal(init.redirect,'follow');
    return {ok:true,text:async()=>JSON.stringify(payload())};
  },now);
  assert.equal(called,1);
  assert.equal(got.ok,true);
  assert.equal(got.raw.schema,1);
});
test('concurrent callers share one in-flight GET and failures do not retry-storm',async()=>{
  let fetches=0;
  const failing=async()=>{fetches++;throw new TypeError('cors-ish network failure');};
  const [a,b]=await Promise.all([w.requestBackendData(failing,now,{timeoutMs:200}),
                                 w.requestBackendData(failing,now,{timeoutMs:200})]);
  assert.equal(a.ok,false);
  assert.equal(b.ok,false);
  assert.deepEqual(a.errors,['network']); /* JSONP fallback attempted, no document in tests */
  assert.equal(fetches,1); /* single flight */
  await w.requestBackendData(failing,now,{timeoutMs:200});
  assert.equal(fetches,2); /* one fresh attempt per scheduled cycle, never a loop */
});
test('a hanging backend call times out at the configured budget without JSONP',async()=>{
  const hanging=async(url,init)=>new Promise((_,reject)=>{
    init.signal.addEventListener('abort',()=>{
      const e=new Error('aborted');e.name='AbortError';reject(e);
    });
  });
  const got=await w.requestBackendData(hanging,now,{timeoutMs:80});
  assert.equal(got.ok,false);
  assert.deepEqual(got.errors,['timeout']);
});
test('HTTP status failures surface as fetch errors without a JSONP attempt',async()=>{
  const got=await w.requestBackendData(async()=>({ok:false,status:500,text:async()=>'{}'}),now);
  assert.equal(got.ok,false);
  assert.deepEqual(got.errors,['fetch']);
});
function sandboxedApi(){
  const src=fs.readFileSync(path.join(__dirname,'../led-rotation.js'),'utf8');
  const created=[];
  const head={appendChild(el){el.parentNode=head;},removeChild(el){el.parentNode=null;}};
  const doc={
    createElement:tag=>{const el={tag,src:null,parentNode:null,onerror:null};created.push(el);return el;},
    head,
  };
  const win={document:doc,setTimeout,clearTimeout};
  const sandbox={window:win,console,setTimeout,clearTimeout,Date,Math,Intl,Object,Number,String,
    Array,RegExp,JSON,Boolean,Promise,Error,TypeError,AbortController,module:{exports:{}},globalThis:null};
  sandbox.globalThis=sandbox;
  vm.runInNewContext(src,sandbox);
  return {api:sandbox.module.exports,win,created};
}
test('JSONP fallback resolves once with a strict generated callback and full cleanup',async()=>{
  const {api,win,created}=sandboxedApi();
  const pending=api.jsonpRequest(1000);
  const el=created[0];
  assert.equal(el.tag,'script');
  assert.match(el.src,/\/exec\?action=data&v=1&callback=__uthaiLedCb[A-Za-z0-9]+$/);
  const cbId=el.src.split('callback=')[1];
  assert.match(cbId,/^[A-Za-z_$][A-Za-z0-9_$]*$/);
  assert.equal(typeof win[cbId],'function');
  win[cbId]({schema:1,pm25:{status:'ok'}});
  const raw=await pending;
  assert.equal(raw.schema,1);
  assert.equal(win[cbId],undefined);
  assert.equal(el.parentNode,null);
});
test('JSONP timeout rejects and still cleans up script, global and timer',async()=>{
  const {api,win,created}=sandboxedApi();
  await assert.rejects(api.jsonpRequest(60),/jsonp-timeout/);
  assert.equal(win[Object.keys(win).find(k=>k.startsWith('__uthaiLedCb'))],undefined);
  assert.equal(created[0].parentNode,null);
});
test('JSONP network error rejects and cleans up',async()=>{
  const {api,win,created}=sandboxedApi();
  const pending=api.jsonpRequest(1000);
  const el=created[0];
  el.onerror();
  await assert.rejects(pending,/jsonp-error/);
  assert.equal(el.parentNode,null);
  assert.equal(win[el.src.split('callback=')[1]],undefined);
});
