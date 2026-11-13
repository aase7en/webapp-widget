'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const PM25Tier=require('../v2/pm25-tier.js');
const PALETTE={blue:'#168ff2',green:'#14b85d',yellow:'#dba912',orange:'#f17a25',red:'#ec3f47'};
const bandHex=v=>PALETTE[PM25Tier.tierFor(v,{}).key];
const grab=(x,cls)=>x.get('#series').children.filter(e=>e.attrs.class===cls);
function start(){
 class Elem{constructor(){this.textContent='';this.style={setProperty:(k,v)=>{this.style[k]=v}};this.hidden=false;this.children=[];this.attrs={};this.dataset={};this.classList={add(){},remove(){}}}setAttribute(k,v){this.attrs[k]=v}append(x){this.children.push(x)}removeChild(){this.children.shift()}get firstChild(){return this.children[0]}addEventListener(){}pause(){}load(){}play(){return Promise.resolve()}}
 const els=new Map(),get=k=>{if(!els.has(k))els.set(k,new Elem());return els.get(k)};let handler;const parent={};
 const ctx={document:{querySelector:get,createElementNS:()=>new Elem()},window:{addEventListener:(type,fn)=>{if(type==='message')handler=fn}},parent,location:{origin:'https://test.invalid'},matchMedia:()=>({matches:false}),setInterval:()=>{},Date,Intl,Number,Array,Math,Promise};
 /* pm25-tier.js runs in the SAME vm realm as the page script (like two script
  * tags in one browser document), so the bandVocabulary Map passes the
  * module's `instanceof Map` gate the same way it does in production. */
 vm.runInNewContext(fs.readFileSync('v2/pm25-tier.js','utf8'),ctx);
 ctx.PM25Tier=ctx.window.PM25Tier;
 vm.runInNewContext(fs.readFileSync('v2/pm25-live.js','utf8'),ctx);return{get,send:(data,origin='https://test.invalid')=>handler({origin,source:parent,data:{type:'uth-pm25-live',...data}})};
}
const freshISO=()=>new Date(Date.now()-5*60000).toISOString();
/* 2026 option A: the badge is banded from avg24h (PM25Tier.classify), the big
 * number stays the hourly value. Band table: ≤15 ดีมาก · 15.1–25 ดี ·
 * 25.1–37.5 ปานกลาง · 37.6–75 เริ่มมีผลต่อสุขภาพ · >75 มีผลต่อสุขภาพ. */
for(const [value,name,band] of [
 [0,'ดีมาก','very_good'],[15,'ดีมาก','very_good'],[15.1,'ดี','good'],[25,'ดี','good'],
 [25.1,'ปานกลาง','moderate'],[37.5,'ปานกลาง','moderate'],[37.6,'เริ่มมีผลต่อสุขภาพ','unhealthy_sensitive'],
 [75,'เริ่มมีผลต่อสุขภาพ','unhealthy_sensitive'],[75.1,'มีผลต่อสุขภาพ','unhealthy']]){
 test('classifies '+value+' from the 24h average (band '+band+')',()=>{const x=start();x.send({pm25:{status:'latest',value,avg24h:value,observedAt:freshISO(),unit:'µg/m³',band}});assert.equal(x.get('.badge').textContent,name);assert.equal(x.get('.scale-arrow').hidden,false);assert.equal(x.get('.avg-note').hidden,false)});
 test('classifies '+value+' even when the payload band is absent (local derivation)',()=>{const x=start();x.send({pm25:{status:'latest',value,avg24h:value,observedAt:freshISO(),unit:'µg/m³'}});assert.equal(x.get('.badge').textContent,name)});
}
test('22 µg/m³ shows ดี (2026 regression: hourly-only banding showed ดีมาก)',()=>{const x=start();x.send({pm25:{status:'latest',value:22,avg24h:22.5,observedAt:freshISO(),unit:'µg/m³',band:'good'}});assert.equal(x.get('.badge').textContent,'ดี');assert.equal(x.get('.number').textContent,'22');assert.equal(x.get('.avg-note').textContent,'เฉลี่ย 24 ชม. 22.5')});
test('missing/null/negative avg24h -> grey unavailable, hourly number kept, secondary hidden',()=>{
 for(const avg of [undefined,null,-3,Number.NaN]){
  const x=start();x.send({pm25:{status:'latest',value:22.5,avg24h:avg,observedAt:freshISO(),unit:'µg/m³'}});
  assert.equal(x.get('.number').textContent,'22.5','avg='+avg);
  assert.equal(x.get('.badge').textContent,'รอข้อมูล','avg='+avg);
  assert.equal(x.get('.advice').textContent,'รอค่าเฉลี่ย 24 ชม.','avg='+avg);
  assert.equal(x.get('#board').dataset.tier,'','avg='+avg);
  assert.equal(x.get('.avg-note').hidden,true,'avg='+avg);
  assert.equal(x.get('.scale-arrow').hidden,true,'avg='+avg);
 }
});
test('band that disagrees with the avg-derived tier fails closed to grey',()=>{const x=start();x.send({pm25:{status:'latest',value:20,avg24h:20,observedAt:freshISO(),unit:'µg/m³',band:'red'}});assert.equal(x.get('#board').dataset.tier,'');assert.equal(x.get('.badge').textContent,'รอข้อมูล')});
test('stale observedAt renders grey (historical is not a health tier)',()=>{const x=start();x.send({pm25:{status:'latest',value:20,avg24h:20,observedAt:new Date(Date.now()-4*3600000).toISOString(),unit:'µg/m³',band:'good'}});assert.equal(x.get('#board').dataset.tier,'');assert.equal(x.get('.badge').textContent,'รอข้อมูล')});
test('missing PM is not turned into zero or a marker',()=>{const x=start();x.send({pm25:{status:'unavailable'}});assert.equal(x.get('.number').textContent,'—');assert.equal(x.get('.scale-arrow').hidden,true)});
test('untrusted origin ignored',()=>{const x=start();x.send({pm25:{status:'latest',value:90}},'https://evil.invalid');assert.equal(x.get('.badge').textContent,'')});
test('adjacent hourly readings connect with per-segment tier gradients and fill',()=>{const x=start(),h=Math.floor(Date.now()/3600000)*3600000;x.send({pm25:{status:'latest',value:20,avg24h:20,observedAt:freshISO(),unit:'µg/m³'},history:[{value:12,observedAt:new Date(h-3*3600000).toISOString()},{value:14,observedAt:new Date(h-2*3600000).toISOString()},{value:20,observedAt:new Date(h-3600000).toISOString()}]});assert.equal(grab(x,'trend-line').length,2);assert.equal(grab(x,'trend-area').length,2);assert.equal(grab(x,'trend-area trend-area-gap').length,0);assert.ok(grab(x,'trend-area').every(a=>a.attrs['fill-opacity']==='.96'));assert.equal(grab(x,'point').length,3);const gr=x.get('#pm25-segs').children;assert.equal(gr.length,2);assert.deepEqual(gr[0].children.map(s=>s.attrs['stop-color']),[bandHex(12),bandHex(14)]);assert.deepEqual(gr[1].children.map(s=>s.attrs['stop-color']),[bandHex(14),bandHex(20)]);assert.match(x.get('.trend-plot').attrs['aria-label'],/พื้นที่ใต้เส้นต่อเนื่องทั้งกราฟ/)});
test('20 links green and 10 links blue with the fill interpolated between them',()=>{const x=start(),h=Math.floor(Date.now()/3600000)*3600000;x.send({pm25:{status:'latest',value:20,avg24h:20,observedAt:freshISO(),unit:'µg/m³'},history:[{value:20,observedAt:new Date(h-3600000).toISOString()},{value:10,observedAt:new Date(h-1800000).toISOString()}]});const gr=x.get('#pm25-segs').children[0];assert.deepEqual(gr.children.map(s=>s.attrs['stop-color']),[bandHex(20),bandHex(10)]);assert.deepEqual(gr.children.map(s=>s.attrs['stop-color']),['#14b85d','#168ff2']);const area=grab(x,'trend-area')[0];assert.equal(area.attrs.fill,'url(#pm25-seg-0)');assert.deepEqual(grab(x,'point').map(p=>p.style.fill),['#14b85d','#168ff2']);assert.match(grab(x,'trend-line')[0].style.stroke,/^url\(#pm25-seg-0\)$/)});
test('no readings result in an empty graph',()=>{const x=start();x.send({pm25:{status:'unavailable'},history:[]});assert.equal(x.get('#series').children.length,0)});
test('24 genuine hourly observations are rendered',()=>{const x=start(),now=Date.now(),history=Array.from({length:24},(_,i)=>({value:i+10,observedAt:new Date(now-(23-i)*3600000).toISOString()}));x.send({pm25:{status:'latest',value:20,avg24h:20,observedAt:freshISO(),unit:'µg/m³'},history});assert.equal(grab(x,'point').length,24);assert.equal(grab(x,'trend-line').length,23);assert.equal(grab(x,'trend-area').length,23);assert.equal(grab(x,'trend-gap-cue').length,0)});

test('a gap over 90 minutes keeps a solid marked bridge and a uniformly shaded area with a visible missing-data cue between the real endpoints',()=>{const x=start(),hour=Math.floor(Date.now()/3600000)*3600000;x.send({pm25:{status:'latest',value:20,avg24h:20,observedAt:freshISO(),unit:'µg/m³'},history:[{value:12,observedAt:new Date(hour-4*3600000+59*60000).toISOString()},{value:14,observedAt:new Date(hour-2*3600000).toISOString()}]});const kids=x.get('#series').children;assert.equal(kids.filter(e=>/trend-line/.test(e.attrs.class)).length,1);const gapLine=kids.filter(e=>e.attrs.class==='trend-line trend-gap');assert.equal(gapLine.length,1);assert.equal(gapLine[0].attrs['data-gap'],'true');assert.equal(gapLine[0].attrs['stroke-dasharray'],undefined);const gapAreas=grab(x,'trend-area trend-area-gap');assert.equal(gapAreas.length,1);assert.equal(gapAreas[0].attrs['fill-opacity'],'.96');assert.equal(gapAreas[0].attrs.fill,'url(#pm25-seg-0)');assert.equal(grab(x,'trend-area').length,0);assert.equal(grab(x,'point').length,2)});
test('a skipped hour remains marked as a gap even when readings are only 62 minutes apart',()=>{const x=start(),hour=Math.floor(Date.now()/3600000)*3600000;x.send({pm25:{status:'latest',value:20,avg24h:20,observedAt:freshISO(),unit:'µg/m³'},history:[{value:12,observedAt:new Date(hour-3600000-60000).toISOString()},{value:14,observedAt:new Date(hour+60000).toISOString()}]});assert.equal(grab(x,'trend-line trend-gap').length,1);const gapAreas=grab(x,'trend-area trend-area-gap');assert.equal(gapAreas.length,1);assert.equal(gapAreas[0].attrs['fill-opacity'],'.96');assert.equal(grab(x,'trend-area').length,0);assert.equal(grab(x,'point').length,2)});
test('a lone reading between two gaps renders marked solid bridges with visible missing-data cues on both sides',()=>{const x=start(),h=Math.floor(Date.now()/3600000)*3600000;x.send({pm25:{status:'latest',value:20,avg24h:20,observedAt:freshISO(),unit:'µg/m³'},history:[{value:12,observedAt:new Date(h-5*3600000).toISOString()},{value:14,observedAt:new Date(h-3*3600000).toISOString()},{value:16,observedAt:new Date(h-3600000).toISOString()}]});assert.equal(grab(x,'trend-line trend-gap').length,2);const gapAreas=grab(x,'trend-area trend-area-gap');assert.equal(gapAreas.length,2);assert.ok(gapAreas.every(a=>a.attrs['fill-opacity']==='.96'));assert.equal(grab(x,'trend-area').length,0);assert.equal(grab(x,'point').length,3)});
test('a single reading renders one colored point with no line or fill',()=>{const x=start();x.send({pm25:{status:'latest',value:50,avg24h:50,observedAt:freshISO(),unit:'µg/m³'},history:[{value:50,observedAt:freshISO()}]});assert.equal(grab(x,'trend-line').length,0);assert.equal(grab(x,'trend-area').length,0);assert.equal(grab(x,'trend-area trend-area-gap').length,0);assert.equal(grab(x,'point').length,1);assert.equal(grab(x,'point')[0].style.fill,'#f17a25')});
test('a missing hourly reading is never drawn as zero and its hour stays a gap',()=>{const x=start(),h=Math.floor(Date.now()/3600000)*3600000;x.send({pm25:{status:'latest',value:20,avg24h:20,observedAt:freshISO(),unit:'µg/m³'},history:[{value:12,observedAt:new Date(h-2*3600000).toISOString()},{value:null,observedAt:new Date(h-3600000).toISOString()},{value:10,observedAt:new Date(h).toISOString()}]});assert.equal(grab(x,'point').length,2);assert.equal(grab(x,'trend-line trend-gap').length,1);assert.equal(grab(x,'trend-area').length,0);const gapAreas=grab(x,'trend-area trend-area-gap');assert.equal(gapAreas.length,1);assert.equal(gapAreas[0].attrs['fill-opacity'],'.96');const gr=x.get('#pm25-segs').children[0];assert.deepEqual(gr.children.map(s=>s.attrs['stop-color']),[bandHex(12),bandHex(10)],'gap fill interpolates only the two real endpoint values')});

test('point and gradient colors follow the pm25-tier thresholds',()=>{for(const [v,k] of [[10,'blue'],[15,'blue'],[15.1,'green'],[25,'green'],[25.1,'yellow'],[37.5,'yellow'],[37.6,'orange'],[75,'orange'],[75.1,'red']]){const x=start(),h=Math.floor(Date.now()/3600000)*3600000;x.send({pm25:{status:'latest',value:v,avg24h:v,observedAt:freshISO(),unit:'µg/m³'},history:[{value:v,observedAt:new Date(h-3600000).toISOString()},{value:v,observedAt:new Date(h-1800000).toISOString()}]});const gr=x.get('#pm25-segs').children[0];assert.deepEqual(gr.children.map(s=>s.attrs['stop-color']),[PALETTE[k],PALETTE[k]],'value '+v);assert.equal(grab(x,'point')[0].style.fill,PALETTE[k],'value '+v)}});
test('a segment crossing a band boundary interpolates between the two tier colors',()=>{const x=start(),h=Math.floor(Date.now()/3600000)*3600000;x.send({pm25:{status:'latest',value:15.1,avg24h:15.1,observedAt:freshISO(),unit:'µg/m³'},history:[{value:15,observedAt:new Date(h-3600000).toISOString()},{value:15.1,observedAt:new Date(h-1800000).toISOString()}]});const gr=x.get('#pm25-segs').children[0];assert.deepEqual(gr.children.map(s=>s.attrs['stop-color']),[PALETTE.blue,PALETTE.green]);assert.equal(gr.attrs.gradientUnits,'userSpaceOnUse')});
test('geometry keeps the real observedAt timestamps',()=>{const x=start(),h=Math.floor(Date.now()/3600000)*3600000;x.send({pm25:{status:'latest',value:20,avg24h:20,observedAt:freshISO(),unit:'µg/m³'},history:[{value:14,observedAt:new Date(h-2*3600000).toISOString()},{value:20,observedAt:new Date(h-3600000).toISOString()}]});const gr=x.get('#pm25-segs').children[0],s=Date.now()-24*3600000,x1=((h-2*3600000)-s)/86400000*300,x2=((h-3600000)-s)/86400000*300;assert.ok(Math.abs(parseFloat(gr.attrs.x1)-x1)<0.5,'x1 '+gr.attrs.x1+' vs '+x1);assert.ok(Math.abs(parseFloat(gr.attrs.x2)-x2)<0.5,'x2 '+gr.attrs.x2+' vs '+x2)});

test('graph styling follows the PM tier and points stay compact',()=>{const x=start(),now=Date.now();x.send({pm25:{status:'latest',value:50,avg24h:50,observedAt:freshISO(),unit:'µg/m³',band:'unhealthy_sensitive'},history:[{value:50,observedAt:new Date(now).toISOString()}]});assert.equal(x.get('#board').dataset.tier,'orange');assert.equal(grab(x,'point-halo')[0].attrs.r,'4.0');assert.equal(grab(x,'point')[0].attrs.r,'1.4');x.send({pm25:{status:'unavailable'},history:[]});assert.equal(x.get('#board').dataset.tier,'')});

test('hourly reading colors the number and moves the marker independently of 24h status',()=>{const x=start();x.send({pm25:{status:'latest',value:32.2,avg24h:21.3,observedAt:freshISO(),unit:'µg/m³',band:'good'}});assert.equal(x.get('.badge').textContent,'ดี');assert.equal(x.get('#board').dataset.tier,'green');assert.equal(x.get('#board').style['--number-dark'],'#dba912');assert.ok(Math.abs(parseFloat(x.get('.scale-arrow').style.left)-51.52)<0.01);});

test('unavailable hourly data removes the previous hourly number color',()=>{const x=start();x.send({pm25:{status:'latest',value:32.2,avg24h:21.3,observedAt:freshISO(),unit:'µg/m³'}});x.send({pm25:{status:'unavailable'}});assert.equal(x.get('#board').style['--number-dark'],'#778a9b');assert.equal(x.get('.scale-arrow').hidden,true)});

test('value number paints above the PM2.5 watermark (label z4 < readout feathers z2 < number-line z6 < frame z7)',()=>{
 const css=fs.readFileSync('v2/pm25-live.html','utf8');
 assert.match(css,/\.pm-label\{position:absolute;z-index:4;/,'watermark stays at z 4');
 assert.match(css,/\.readout\{z-index:auto;isolation:auto\}/,'readout must not stay a stacking context or it pins the number under the label');
 assert.match(css,/\.readout::before\{z-index:2\}/,'readout feather keeps its old effective layer (above scene, below watermark)');
 assert.match(css,/\.number-line\{z-index:6\}/,'number-line tops the watermark at every value and shrink-to-fit state');
});


test('one colored luminous halo and smaller crisp point per genuine PM observation',()=>{
 const x=start(),h=Math.floor(Date.now()/3600000)*3600000;
 x.send({pm25:{status:'latest',value:20,avg24h:20,observedAt:freshISO(),unit:'µg/m³'},
 history:[{value:10,observedAt:new Date(h-3600000).toISOString()},{value:50,observedAt:new Date(h-1800000).toISOString()}],historyStatus:'ok'});
 assert.equal(grab(x,'point').length,2);assert.equal(grab(x,'point-halo').length,2);
 assert.deepEqual(grab(x,'point-halo').map(p=>p.style.fill),[bandHex(10),bandHex(50)]);
 assert.deepEqual(grab(x,'point').map(p=>p.style['--point-light']),[bandHex(10),bandHex(50)]);
 assert.equal(x.get('#history-note').hidden,true);
});
test('transport problem never masquerades as missing measurements',()=>{
 const x=start();
 x.send({pm25:{status:'unavailable'},history:[],historyStatus:'loading'});
 assert.match(x.get('#history-note').textContent,/กำลังโหลด/);
 x.send({pm25:{status:'unavailable'},history:[],historyStatus:'unavailable'});
 assert.match(x.get('#history-note').textContent,/ยังโหลด/);
 x.send({pm25:{status:'unavailable'},history:[],historyStatus:'empty'});
 assert.match(x.get('#history-note').textContent,/ไม่มีข้อมูล/);
});


test('non-linear height emphasizes 15–35 while retaining genuine readings and compressed tails',()=>{
 const x=start(),now=Date.now(),values=[0,15,25,35,50];
 const history=values.map((value,i)=>({value,observedAt:new Date(now-(4-i)*3600000).toISOString()}));
 x.send({pm25:{status:'latest',value:25,avg24h:25,observedAt:freshISO(),unit:'µg/m³'},history});
 const cy=grab(x,'point').map(p=>Number(p.attrs.cy));
 assert.equal(cy.length,5);
 assert.ok(cy.every(Number.isFinite));
 assert.ok(cy.every((v,i)=>i===0||v<cy[i-1]),'increasing values remain strictly higher');
 const center=cy[1]-cy[3],lowTail=cy[0]-cy[1],highTail=cy[3]-cy[4];
 assert.ok(center>lowTail+highTail,'height differences 15–35 exceed both tails combined');
 assert.ok(grab(x,'trend-area').every(p=>p.children.length>=2&&p.children.every(r=>r.attrs['fill-opacity'])));
 assert.match(x.get('.trend-plot').attrs['aria-label'],/สเกลแนวตั้งไม่เชิงเส้น/);
 const html=fs.readFileSync('v2/pm25-live.html','utf8');
 assert.match(fs.readFileSync('v2/pm25-live.js','utf8'),/for\(let depth=0;depth<36;/);
 assert.match(html,/viewBox="0 0 300 40"/);
});
test('extreme 1000 does not flatten the visual differences at 15–35 or add samples',()=>{
 const x=start(),now=Date.now(),values=[0,15,25,35,1000];
 const history=values.map((value,i)=>({value,observedAt:new Date(now-(4-i)*3600000).toISOString()}));
 x.send({pm25:{status:'latest',value:25,avg24h:25,observedAt:freshISO(),unit:'µg/m³'},history});
 const cy=grab(x,'point').map(p=>Number(p.attrs.cy));
 assert.equal(cy.length,5);
 assert.ok(cy[1]-cy[3]>7,'15–35 occupies readable space despite far outlier');
 assert.equal(grab(x,'trend-line').length,4);
});


test('distance-below-curve ribbons fade uniformly across adjacent segments without masking seams',()=>{
 const x=start(),h=Math.floor(Date.now()/3600000)*3600000,history=[
  {value:10,observedAt:new Date(h-3*3600000).toISOString()},
  {value:27,observedAt:new Date(h-2*3600000).toISOString()},
  {value:19,observedAt:new Date(h-3600000).toISOString()}];
 x.send({pm25:{status:'latest',value:19,avg24h:19,observedAt:freshISO(),unit:'µg/m³'},history});
 const areas=grab(x,'trend-area'),lines=grab(x,'trend-line');
 assert.equal(areas.length,2);assert.equal(lines.length,2);
 for(let i=0;i<2;i++){
  const area=areas[i],ribbons=area.children;
  assert.ok(ribbons.length>=12&&ribbons.length<=30);
  assert.equal(area.attrs['fill-opacity'],'.96');
  assert.equal(area.attrs.fill,'url(#pm25-seg-'+i+')');
  assert.equal(lines[i].attrs['stroke-dasharray'],undefined);
  assert.ok(Number(ribbons[0].attrs['fill-opacity'])>.9,'bright and opaque directly below the real line');
  let previous=Infinity;
  for(const r of ribbons){const alpha=Number(r.attrs['fill-opacity']);assert.ok(alpha<previous);previous=alpha}
  // First ribbon begins exactly on measured Y and reaches the next point.
  const observed=grab(x,'point').map(p=>Number(p.attrs.cy));
  const path=ribbons[0].attrs.d;
  const match=path.match(/^M([\d.]+) ([\d.]+) L([\d.]+) ([\d.]+)/);
  assert.ok(match,'ribbon starts on the two observed values');
  assert.ok(Math.abs(Number(match[1])-Number(grab(x,'point')[i].attrs.cx))<.1);
  assert.ok(Math.abs(Number(match[2])-observed[i])<.11);
  assert.ok(Math.abs(Number(match[3])-Number(grab(x,'point')[i+1].attrs.cx))<.1);
  assert.ok(Math.abs(Number(match[4])-observed[i+1])<.11);
 }
 assert.equal(areas[0].children[0].attrs['fill-opacity'],areas[1].children[0].attrs['fill-opacity'],
  'both sides of shared node have equal brightness right under the line');
 assert.match(fs.readFileSync('v2/pm25-live.html','utf8'),/viewBox="0 0 300 40"/);
 assert.doesNotMatch(fs.readFileSync('v2/pm25-live.html','utf8'),/pm-area-mask/);
});
test('missing PM hour still creates only measured points and a solid marked bridge, never a made-up value',()=>{
 const x=start(),h=Math.floor(Date.now()/3600000)*3600000;
 x.send({pm25:{status:'latest',value:21,avg24h:21,observedAt:freshISO(),unit:'µg/m³'},history:[
  {value:12,observedAt:new Date(h-3*3600000).toISOString()},
  {value:null,observedAt:new Date(h-2*3600000).toISOString()},
  {value:21,observedAt:new Date(h-3600000).toISOString()}
 ]});
 assert.equal(grab(x,'point').length,2);
 assert.equal(grab(x,'trend-line trend-gap').length,1);
 assert.equal(grab(x,'trend-line trend-gap')[0].attrs['data-gap'],'true');
 assert.equal(grab(x,'trend-gap-cue').length,1,'one visible double-slash for the missing interval');
 assert.equal(grab(x,'trend-gap-cue')[0].children.length,2);
 assert.equal(grab(x,'trend-line trend-gap')[0].attrs['stroke-dasharray'],undefined);
 assert.match(x.get('.trend-plot').attrs['aria-label'],/ไม่ใช่ค่าฝุ่นที่วัดได้ระหว่างจุด/);
});
test('bad PM values cannot enter trend as zero observations',()=>{
 const x=start(),now=Date.now();
 const history=[-1,NaN,Infinity,null,16].map((value,i)=>({value,observedAt:new Date(now-(4-i)*3600000).toISOString()}));
 x.send({pm25:{status:'latest',value:16,avg24h:16,observedAt:freshISO(),unit:'µg/m³'},history});
 assert.equal(grab(x,'point').length,1);
 assert.equal(grab(x,'trend-line').length,0);
});

test('visible double-slash cue appears for each marked missing-hour bridge and never invents readings',()=>{
 const x=start(),h=Math.floor(Date.now()/3600000)*3600000;
 x.send({pm25:{status:'latest',value:22,avg24h:22,observedAt:freshISO(),unit:'µg/m³'},history:[
  {value:18,observedAt:new Date(h-5*3600000).toISOString()},
  {value:20,observedAt:new Date(h-3*3600000).toISOString()},
  {value:22,observedAt:new Date(h-3600000).toISOString()}
 ]});
 assert.equal(grab(x,'point').length,3);
 assert.equal(grab(x,'trend-line trend-gap').length,2);
 const marks=grab(x,'trend-gap-cue');
 assert.equal(marks.length,2);
 assert.ok(marks.every(c=>c.attrs['aria-label'].includes('ขาดหาย')));
 assert.ok(marks.every(c=>c.children.length===2&&c.children[1].attrs.stroke==='#f4faff'));
 assert.equal(grab(x,'point').length,3,'cues must not masquerade as PM points');
});
