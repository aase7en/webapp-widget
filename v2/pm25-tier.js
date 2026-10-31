/* PM2.5 five-tier classification (Thai Department of Health 2026, mass
 * concentration in µg/m³). PURE + UNWIRED: no network, no DOM, no clock, no
 * file access. Deterministic boundary semantics (valid numeric values are
 * rounded to 1 decimal BEFORE banding):
 *   0 ≤ v ≤ 15      blue   น้ำเงิน  ดีมาก
 *   15 < v ≤ 25     green  เขียว    ดี
 *   25 < v ≤ 37.5   yellow เหลือง   ปานกลาง
 *   37.5 < v ≤ 75   orange ส้ม      เริ่มมีผลกระทบต่อสุขภาพ
 *   v > 75          red    แดง      มีผลกระทบต่อสุขภาพ
 * The legacy Apps Script cutoffs (>=91 unhealthy, >=51 unhealthy_sensitive,
 * >=38 moderate, >=26 good, else very_good) are OUTDATED for 2026. Legacy band
 * names must NOT silently map onto 2026 tiers.
 * Rounding policy: valid numeric values are rounded to 1 decimal (half-up,
 * epsilon-guarded) BEFORE banding; the rounded value is exported as
 * displayValue on every tier result so consumers print one canonical number.
 * Conflict policy: any present payload band conflicts by default (the backend
 * band vocabulary is legacy) and fails closed to unavailable
 * (reason 'band-conflict'); an explicit opts.bandVocabulary Map
 * (band-string → 2026 tier key) allowlists self-consistent bands to pass.
 * Freshness contract: a missing observedAt is treated as current and relies on
 * the backend contract that observedAt is always emitted — Phase E consumers
 * must not bypass this module. An invalid staleAfterMs (non-finite or ≤ 0)
 * fails closed to unavailable (reason 'bad-option'), never silently current.
 * Fail-closed iron rules: never fake, never zero-for-unknown. null/undefined/
 * NaN, negative values, non-µg/m³ units, non-'ok'/'latest' statuses, future
 * observations (> 5 min ahead) and unparseable freshness inputs render
 * UNAVAILABLE; observations older than staleAfterMs (default 3 h) render
 * HISTORICAL with the underlying tier preserved for labeling only.
 * 'unavailable' and 'historical' are error/meta states, NEVER health tiers
 * (no purple sixth tier exists).
 */
(function(root){
'use strict';

const PM25_UNIT='µg/m³';
const FUTURE_TOLERANCE_MS=5*60*1000;
const DEFAULT_STALE_MS=3*3600*1000;
const HEALTH_STATUSES=['ok','latest'];

const TIERS=Object.freeze([
  Object.freeze({key:'blue',  colorThai:'น้ำเงิน', labelThai:'ดีมาก',                  min:0,    max:15,   maxInclusive:true}),
  Object.freeze({key:'green', colorThai:'เขียว',  labelThai:'ดี',                      min:15,   max:25,   minExclusive:true, maxInclusive:true}),
  Object.freeze({key:'yellow',colorThai:'เหลือง', labelThai:'ปานกลาง',                 min:25,   max:37.5, minExclusive:true, maxInclusive:true}),
  Object.freeze({key:'orange',colorThai:'ส้ม',    labelThai:'เริ่มมีผลกระทบต่อสุขภาพ', min:37.5, max:75,   minExclusive:true, maxInclusive:true}),
  Object.freeze({key:'red',   colorThai:'แดง',    labelThai:'มีผลกระทบต่อสุขภาพ',      min:75,   max:null, minExclusive:true})
]);

/* Gazette rounding: 1 decimal, half-up, epsilon-guarded against float drift.
 * The second round normalizes residual artifacts of the first (37.549 →
 * 37.5 stays 37.5, never 37.499999999999996). */
function round1(v){
  const r=Math.round((v+Number.EPSILON)*10)/10;
  return Math.round(r*10)/10;
}

function metaUnavailable(extra){
  return Object.assign({key:'unavailable',labelThai:'ไม่มีข้อมูล',isHealthTier:false,displayValue:null,reason:null},extra||{});
}
function metaHistorical(tier,displayValue){
  return {key:'historical',labelThai:'ข้อมูลเก่า',isHealthTier:false,tier:{key:tier.key,labelThai:tier.labelThai,colorThai:tier.colorThai,displayValue},displayValue,reason:null};
}

function findHealthTier(v){
  for(const t of TIERS){
    const aboveMin=t.minExclusive?v>t.min:v>=t.min;
    const belowMax=(t.max==null)||(t.maxInclusive?v<=t.max:v<t.max);
    if(aboveMin&&belowMax)return t;
  }
  return null;
}

/* Strict numeric gate: numbers only. Strings are rejected unless
 * opts.allowNumericString, in which case the trimmed string must parse to a
 * finite number ('' and whitespace-only never parse). */
function toNumber(value,opts){
  if(typeof value==='number')return Number.isFinite(value)?value:NaN;
  if(typeof value==='string'&&opts&&opts.allowNumericString){
    const trimmed=value.trim();
    if(trimmed==='')return NaN;
    const parsed=Number(trimmed);
    return Number.isFinite(parsed)?parsed:NaN;
  }
  return NaN;
}

/* observedAt accepts an ms epoch (number) or an ISO string (Date.parse); both
 * must be finite, else fail closed. */
function toMs(observedAt){
  if(typeof observedAt==='number')return Number.isFinite(observedAt)?observedAt:NaN;
  if(typeof observedAt==='string'){
    const parsed=Date.parse(observedAt);
    return Number.isFinite(parsed)?parsed:NaN;
  }
  return NaN;
}

function tierFor(value,opts){
  const o=opts||{};
  if(o.unit!=null&&o.unit!==PM25_UNIT)return metaUnavailable();
  let statusGate='none';
  if(o.status!=null){
    if(HEALTH_STATUSES.indexOf(o.status)>=0)statusGate='health';
    else if(o.status==='stale')statusGate='stale';
    else return metaUnavailable();
  }
  const raw=toNumber(value,o);
  if(!Number.isFinite(raw)||raw<0)return metaUnavailable();
  const v=round1(raw);
  if(o.observedAt!=null){
    const at=toMs(o.observedAt);
    if(!Number.isFinite(at))return metaUnavailable({displayValue:v});
    const nowMs=toMs(o.now);
    if(!Number.isFinite(nowMs))return metaUnavailable({displayValue:v});
    if(at>nowMs+FUTURE_TOLERANCE_MS)return metaUnavailable({displayValue:v});
    const staleMs=o.staleAfterMs==null?DEFAULT_STALE_MS:o.staleAfterMs;
    if(typeof staleMs!=='number'||!Number.isFinite(staleMs)||staleMs<=0){
      return metaUnavailable({displayValue:v,reason:'bad-option'});
    }
    if(nowMs-at>staleMs){
      const t=findHealthTier(v);
      return t?metaHistorical(t,v):metaUnavailable({displayValue:v});
    }
  }
  if(statusGate==='stale'){
    const t=findHealthTier(v);
    return t?metaHistorical(t,v):metaUnavailable({displayValue:v});
  }
  const t=findHealthTier(v);
  return t?{key:t.key,labelThai:t.labelThai,colorThai:t.colorThai,isHealthTier:true,displayValue:v,reason:null}:metaUnavailable({displayValue:v});
}

/* Legacy band names ('very_good','good','moderate','unhealthy_sensitive',
 * 'unhealthy') are outdated legacy criteria and must NOT silently map to the
 * 2026 five tiers. Always true. */
function legacyCutoffsAreOutdated(){return true;}

/* A payload band that is present conflicts unless an explicit opts.bandVocabulary
 * allowlist (Map band-string → 2026 tier key) maps it to the locally derived
 * tier key. Default: the backend band vocabulary is legacy, so ANY present
 * band is a conflict (fail closed). Absent/null/'' band never conflicts. */
function failClosedOnConflict(payload,derived,opts){
  const band=payload&&payload.band;
  if(band==null||band==='')return false;
  const vocab=opts&&opts.bandVocabulary;
  if(vocab instanceof Map)return vocab.get(band)!==derived.key;
  return true;
}

function classify(payload,opts){
  const p=payload||{};
  const o=opts||{};
  const merged={
    status:p.status,
    unit:p.unit!=null?p.unit:o.unit,
    observedAt:p.observedAt,
    now:o.now,
    staleAfterMs:o.staleAfterMs,
    allowNumericString:o.allowNumericString,
    bandVocabulary:o.bandVocabulary
  };
  const derived=tierFor(p.value,merged);
  const band=p.band==null?null:p.band;
  const result={
    key:derived.key,
    labelThai:derived.labelThai,
    colorThai:derived.colorThai,
    isHealthTier:derived.isHealthTier,
    tier:derived.tier,
    displayValue:derived.displayValue==null?null:derived.displayValue,
    reason:derived.reason==null?null:derived.reason,
    conflict:false,
    legacyCutoffsOutdated:legacyCutoffsAreOutdated(),
    band:band
  };
  if(failClosedOnConflict(p,derived,o)){
    result.key='unavailable';
    result.labelThai='ไม่มีข้อมูล';
    result.colorThai=undefined;
    result.isHealthTier=false;
    result.tier=undefined;
    result.reason='band-conflict';
    result.conflict={payloadBand:band,derivedTier:derived.key};
  }
  return result;
}

const api={TIERS,tierFor,classify,failClosedOnConflict,legacyCutoffsAreOutdated,
  PM25_UNIT,FUTURE_TOLERANCE_MS,DEFAULT_STALE_MS,HEALTH_STATUSES};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.PM25Tier=api;
})(typeof window!=='undefined'?window:globalThis);
