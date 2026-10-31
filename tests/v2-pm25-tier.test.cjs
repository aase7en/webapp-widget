'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const m=require('../v2/pm25-tier.js');
const NOW=Date.parse('2026-10-26T16:00:00+07:00');
const H=3600*1000;
const OK=(v,extra)=>Object.assign({status:'ok',value:v,unit:'µg/m³'},extra||{});

/* ---------- Thai DoH 2026 boundary semantics ---------- */
test('boundary fixtures: 0≤v≤15 blue; 15<v≤25 green; 25<v≤37.5 yellow; 37.5<v≤75 orange; v>75 red',()=>{
  const rows=[
    [0,'blue'],[15,'blue'],[15.1,'green'],[25,'green'],[25.1,'yellow'],
    [37.5,'yellow'],[37.51,'yellow'],[37.55,'orange'],[75,'orange'],[75.1,'red'],[120,'red']
  ];
  for(const [v,key] of rows){
    const r=m.tierFor(v);
    assert.equal(r.key,key,String(v)+' µg/m³');
    assert.equal(r.isHealthTier,true,String(v)+' µg/m³');
    assert.ok(m.HEALTH_STATUSES);
  }
});
test('boundary tier labels and colors carry Thai DoH wording',()=>{
  assert.deepEqual(m.tierFor(10),{key:'blue',labelThai:'ดีมาก',colorThai:'น้ำเงิน',isHealthTier:true,displayValue:10,reason:null});
  assert.deepEqual(m.tierFor(22.5),{key:'green',labelThai:'ดี',colorThai:'เขียว',isHealthTier:true,displayValue:22.5,reason:null});
  assert.deepEqual(m.tierFor(30),{key:'yellow',labelThai:'ปานกลาง',colorThai:'เหลือง',isHealthTier:true,displayValue:30,reason:null});
  assert.deepEqual(m.tierFor(50),{key:'orange',labelThai:'เริ่มมีผลกระทบต่อสุขภาพ',colorThai:'ส้ม',isHealthTier:true,displayValue:50,reason:null});
  assert.deepEqual(m.tierFor(90),{key:'red',labelThai:'มีผลกระทบต่อสุขภาพ',colorThai:'แดง',isHealthTier:true,displayValue:90,reason:null});
});
test('22.5 µg/m³ is GREEN ดี (Thai DoH 2026), not ดีมาก',()=>{
  const r=m.tierFor(22.5,{unit:'µg/m³'});
  assert.equal(r.key,'green');
  assert.equal(r.labelThai,'ดี');
  assert.notEqual(r.labelThai,'ดีมาก');
  const c=m.classify(OK(22.5,{observedAt:'2026-10-26T15:00:00+07:00',source:'GISTDA ต.อุทัย'}),{now:NOW});
  assert.equal(c.key,'green');
  assert.equal(c.tier,undefined);
});

/* ---------- R1: 1-decimal half-up rounding BEFORE banding ---------- */
test('rounding fixtures: 15.04→15.0 blue; 25.04→25.0 green; 37.549→37.5 yellow; 75.04→75.0 orange; 15.05→15.1 green; 37.55→37.6 orange; 37.6→orange (ROADMAP literal)',()=>{
  const rows=[
    [15.04,'blue',15],[25.04,'green',25],[37.549,'yellow',37.5],
    [75.04,'orange',75],[15.05,'green',15.1],[37.55,'orange',37.6],[37.6,'orange',37.6]
  ];
  for(const [v,key,disp] of rows){
    const r=m.tierFor(v);
    assert.equal(r.key,key,String(v)+' band');
    assert.equal(r.displayValue,disp,String(v)+' displayValue');
    assert.equal(r.isHealthTier,true,String(v)+' health');
  }
});
test('displayValue is exported on every tier result, incl. historical nested tier and unavailable',()=>{
  const h=m.tierFor(37.55,{observedAt:NOW-4*H,now:NOW});
  assert.equal(h.key,'historical');
  assert.equal(h.displayValue,37.6);
  assert.equal(h.tier.key,'orange');
  assert.equal(h.tier.displayValue,37.6);
  assert.equal(m.tierFor(null).displayValue,null);
  assert.equal(m.classify(OK(37.55)).displayValue,37.6);
});
test('rounding applies before staleness banding too',()=>{
  const h=m.tierFor(25.04,{observedAt:NOW-4*H,now:NOW});
  assert.equal(h.key,'historical');
  assert.equal(h.tier.key,'green');
  assert.equal(h.tier.displayValue,25);
});
test('bad-unit results carry displayValue null (never a mislabelled number)',()=>{
  const r=m.classify({status:'ok',value:37.55,unit:'ppb'});
  assert.equal(r.key,'unavailable');
  assert.equal(r.displayValue,null);
});

/* ---------- value status: fail closed, never zero-for-unknown ---------- */
test('null, undefined, NaN and negative values are unavailable, never a health tier',()=>{
  for(const v of [null,undefined,NaN,-1,-0.001,-15]){
    const r=m.tierFor(v);
    assert.deepEqual(r,{key:'unavailable',labelThai:'ไม่มีข้อมูล',isHealthTier:false,displayValue:null,reason:null},String(v));
  }
});
test('numeric strings are rejected unless opts.allowNumericString',()=>{
  assert.deepEqual(m.tierFor('22.5'),{key:'unavailable',labelThai:'ไม่มีข้อมูล',isHealthTier:false,displayValue:null,reason:null});
  assert.equal(m.tierFor('22.5',{allowNumericString:true}).key,'green');
  assert.deepEqual(m.tierFor('22.5',{allowNumericString:true}).isHealthTier,true);
  assert.equal(m.tierFor('  25  ',{allowNumericString:true}).key,'green');
  assert.equal(m.tierFor('abc',{allowNumericString:true}).key,'unavailable');
  assert.equal(m.tierFor('',{allowNumericString:true}).key,'unavailable');
  assert.equal(m.tierFor('75',{allowNumericString:true}).key,'orange');
});

/* ---------- time semantics: future → unavailable, stale → historical ---------- */
test('observation 1 h old classifies the current tier',()=>{
  const r=m.tierFor(22.5,{observedAt:NOW-H,now:NOW});
  assert.equal(r.key,'green');
  assert.equal(r.isHealthTier,true);
});
test('observation 4 h old (default 3 h staleness) is historical with underlying tier preserved',()=>{
  const r=m.tierFor(22.5,{observedAt:NOW-4*H,now:NOW});
  assert.deepEqual(r,{key:'historical',labelThai:'ข้อมูลเก่า',isHealthTier:false,displayValue:22.5,reason:null,tier:{key:'green',labelThai:'ดี',colorThai:'เขียว',displayValue:22.5}});
  assert.notEqual(r.key,'purple');
});
test('observation in the future (+1 h) is unavailable',()=>{
  const r=m.tierFor(22.5,{observedAt:NOW+H,now:NOW});
  assert.deepEqual(r,{key:'unavailable',labelThai:'ไม่มีข้อมูล',isHealthTier:false,displayValue:22.5,reason:null});
});
test('future tolerance is exactly 5 minutes (> not ≥)',()=>{
  assert.equal(m.tierFor(22.5,{observedAt:NOW+5*60*1000,now:NOW}).key,'green');
  assert.equal(m.tierFor(22.5,{observedAt:NOW+5*60*1000+1,now:NOW}).key,'unavailable');
});
test('staleness honours opts.staleAfterMs overrides',()=>{
  assert.equal(m.tierFor(22.5,{observedAt:NOW-4*H,now:NOW,staleAfterMs:5*H}).key,'green');
  assert.equal(m.tierFor(22.5,{observedAt:NOW-4*H,now:NOW,staleAfterMs:2*H}).key,'historical');
  assert.equal(m.tierFor(22.5,{observedAt:NOW-4*H,now:NOW,staleAfterMs:4*H}).key,'green');
});

/* ---------- R3: staleAfterMs validation fails closed ---------- */
test('R3: non-finite or ≤0 staleAfterMs is bad-option unavailable, never silently current',()=>{
  for(const bad of ['abc',-1,NaN,0]){
    const r=m.tierFor(22.5,{observedAt:NOW-4*H,now:NOW,staleAfterMs:bad});
    assert.equal(r.key,'unavailable',String(bad));
    assert.equal(r.isHealthTier,false,String(bad));
    assert.equal(r.reason,'bad-option',String(bad));
    assert.deepEqual(r.conflict,undefined,String(bad));
  }
  const c=m.classify(OK(22.5,{observedAt:NOW-4*H}),{now:NOW,staleAfterMs:'abc'});
  assert.equal(c.key,'unavailable');
  assert.equal(c.isHealthTier,false);
  assert.equal(c.reason,'bad-option');
});
test('R3: valid staleAfterMs values keep working',()=>{
  assert.equal(m.tierFor(22.5,{observedAt:NOW-4*H,now:NOW,staleAfterMs:5*H}).reason,null);
  assert.equal(m.tierFor(22.5,{observedAt:NOW-4*H,now:NOW,staleAfterMs:0.5*H}).key,'historical');
});

test('unparseable or unverifiable freshness fails closed',()=>{
  assert.equal(m.tierFor(22.5,{observedAt:'not-a-date',now:NOW}).key,'unavailable');
  assert.equal(m.tierFor(22.5,{observedAt:NOW-H}).key,'unavailable');
  assert.equal(m.tierFor(22.5,{observedAt:NOW-H,now:NaN}).key,'unavailable');
});
test('ISO string observedAt is accepted deterministically',()=>{
  assert.equal(m.tierFor(22.5,{observedAt:'2026-10-26T15:00:00+07:00',now:NOW}).key,'green');
  assert.equal(m.tierFor(22.5,{observedAt:'2026-10-26T10:00:00+07:00',now:NOW}).key,'historical');
});

/* ---------- backend status semantics ---------- */
test('status missing → unavailable; status ok/latest → health tier',()=>{
  assert.deepEqual(m.classify({status:'missing',value:22.5}),{key:'unavailable',labelThai:'ไม่มีข้อมูล',colorThai:undefined,isHealthTier:false,tier:undefined,displayValue:null,reason:null,conflict:false,legacyCutoffsOutdated:true,band:null});
  assert.equal(m.classify(OK(22.5)).key,'green');
  assert.equal(m.classify({status:'latest',value:22.5,unit:'µg/m³'}).key,'green');
  assert.equal(m.classify({status:'ok',value:22.5,unit:'µg/m³'},{}).isHealthTier,true);
  assert.equal(m.tierFor(22.5,{status:'weird'}).key,'unavailable');
});
test('status stale → historical semantics with underlying tier preserved',()=>{
  const r=m.classify({status:'stale',value:22.5,unit:'µg/m³'});
  assert.equal(r.key,'historical');
  assert.equal(r.labelThai,'ข้อมูลเก่า');
  assert.equal(r.isHealthTier,false);
  assert.equal(r.tier.key,'green');
});
test('full backend pm25 channel payload classifies with provenance intact',()=>{
  const payload={status:'ok',value:22.5,unit:'µg/m³',observedAt:'2026-10-26T15:00:00+07:00',source:'GISTDA ต.อุทัย',band:'good'};
  const r=m.classify(payload,{now:NOW,bandVocabulary:new Map([['good','green']])});
  assert.equal(r.key,'green');
  assert.equal(r.isHealthTier,true);
  assert.equal(r.legacyCutoffsOutdated,true);
  assert.equal(r.band,'good');
});

/* ---------- unit guard ---------- */
test('unit guard: only µg/m³ classifies; anything else fails closed',()=>{
  assert.equal(m.tierFor(22.5,{unit:'µg/m³'}).key,'green');
  assert.equal(m.tierFor(22.5,{unit:'ug/m³'}).key,'unavailable');
  assert.equal(m.tierFor(22.5,{unit:'ppb'}).key,'unavailable');
  assert.equal(m.tierFor(22.5,{unit:''}).key,'unavailable');
  assert.equal(m.tierFor(22.5).key,'green');
  assert.equal(m.classify({status:'ok',value:22.5,unit:'ppb'}).key,'unavailable');
});

/* ---------- R2: band conflict fails closed; bandVocabulary allowlist ---------- */
test('R2: {value:22.5, band:"good"} → unavailable with reason band-conflict, never a health tier',()=>{
  const payload=OK(22.5,{band:'good'});
  const r=m.classify(payload);
  assert.equal(r.key,'unavailable');
  assert.equal(r.isHealthTier,false);
  assert.equal(r.reason,'band-conflict');
  assert.deepEqual(r.conflict,{payloadBand:'good',derivedTier:'green'});
  assert.equal(r.band,'good');
  assert.equal(m.failClosedOnConflict(payload,{key:'green'}),true);
});
test('R2: default vocabulary — any present band conflicts (legacy backend vocabulary)',()=>{
  for(const band of ['good','very_good','moderate','unhealthy_sensitive','unhealthy','green','2026:green']){
    const r=m.classify(OK(22.5,{band}));
    assert.equal(r.key,'unavailable',band);
    assert.equal(r.isHealthTier,false,band);
    assert.equal(r.reason,'band-conflict',band);
    assert.deepEqual(r.conflict,{payloadBand:band,derivedTier:'green'},band);
  }
});
test('R2: bandVocabulary Map passes a matching self-consistent band through',()=>{
  const vocab=new Map([['2026:green','green']]);
  const r=m.classify(OK(22.5,{band:'2026:green'}),{bandVocabulary:vocab});
  assert.equal(r.key,'green');
  assert.equal(r.isHealthTier,true);
  assert.equal(r.displayValue,22.5);
  assert.equal(r.conflict,false);
  assert.equal(r.band,'2026:green');
  const mismatched=m.classify(OK(30,{band:'2026:green'}),{bandVocabulary:vocab});
  assert.equal(mismatched.key,'unavailable');
  assert.equal(mismatched.reason,'band-conflict');
  assert.deepEqual(mismatched.conflict,{payloadBand:'2026:green',derivedTier:'yellow'});
});
test('absent/null/"" band never conflicts; present band conflicts by default; vocabulary can agree',()=>{
  assert.equal(m.failClosedOnConflict({value:22.5},{key:'green'}),false);
  assert.equal(m.failClosedOnConflict({band:null},{key:'green'}),false);
  assert.equal(m.failClosedOnConflict({band:''},{key:'green'}),false);
  assert.equal(m.failClosedOnConflict({band:'green'},{key:'green'}),true);
  assert.equal(m.failClosedOnConflict({band:'green'},{key:'green'},{bandVocabulary:new Map([['green','green']])}),false);
  assert.equal(m.failClosedOnConflict({band:'green'},{key:'yellow'},{bandVocabulary:new Map([['green','green']])}),true);
  assert.equal(m.failClosedOnConflict({band:'other'},{key:'green'},{bandVocabulary:new Map([['green','green']])}),true);
});
test('every legacy band name is outdated and never silently maps',()=>{
  assert.equal(m.legacyCutoffsAreOutdated(),true);
  for(const legacy of ['very_good','good','moderate','unhealthy_sensitive','unhealthy']){
    assert.equal(m.failClosedOnConflict({band:legacy},{key:'green'}),true,legacy);
    const r=m.classify(OK(22.5,{band:legacy}));
    assert.equal(r.key,'unavailable',legacy);
    assert.equal(r.reason,'band-conflict',legacy);
    assert.equal(r.isHealthTier,false,legacy);
  }
});

/* ---------- TIERS shape: five tiers, no purple sixth tier ---------- */
test('TIERS is frozen, ordered, five tiers, and contains no purple',()=>{
  assert.equal(Object.isFrozen(m.TIERS),true);
  assert.equal(m.TIERS.length,5);
  assert.deepEqual(m.TIERS.map(t=>t.key),['blue','green','yellow','orange','red']);
  assert.equal(m.TIERS.some(t=>t.key==='purple'),false);
  assert.equal(JSON.stringify(m.TIERS).indexOf('purple'),-1);
  for(let i=1;i<m.TIERS.length;i++){
    assert.equal(m.TIERS[i].min,m.TIERS[i-1].max,'tiers share cut points');
    assert.equal(m.TIERS[i].minExclusive,true);
  }
  assert.equal(m.TIERS[0].minExclusive,undefined);
  assert.equal(m.TIERS[4].max,null);
});

/* ---------- determinism + browser global ---------- */
test('classify is deterministic: identical inputs give identical results',()=>{
  const p={status:'ok',value:37.5,unit:'µg/m³',observedAt:NOW,source:'GISTDA',band:null};
  assert.deepEqual(m.classify(p,{now:NOW}),m.classify(p,{now:NOW}));
});
test('module is usable as a browser global (root.PM25Tier)',()=>{
  assert.equal(typeof globalThis.PM25Tier,'object');
  assert.equal(typeof globalThis.PM25Tier.tierFor,'function');
  assert.equal(globalThis.PM25Tier.tierFor(22.5).key,'green');
});
