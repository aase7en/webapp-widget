'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
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
test('incomplete history shows only real points with gaps',()=>{const x=start(),now=Date.now();x.send({pm25:{status:'latest',value:20,avg24h:20,observedAt:freshISO(),unit:'µg/m³'},history:[{value:12,observedAt:new Date(now-3*3600000).toISOString()},{value:14,observedAt:new Date(now-2*3600000).toISOString()},{value:20,observedAt:new Date(now).toISOString()}]});const children=x.get('#series').children;assert.equal(children.filter(e=>e.attrs.class==='trend-line').length,1);assert.equal(children.filter(e=>e.attrs.class==='point').length,3);assert.match(x.get('.trend-plot').attrs['aria-label'],/ข้อมูล.*เว้นว่าง/)});
test('no readings result in an empty graph',()=>{const x=start();x.send({pm25:{status:'unavailable'},history:[]});assert.equal(x.get('#series').children.length,0)});
test('24 genuine hourly observations are rendered',()=>{const x=start(),now=Date.now(),history=Array.from({length:24},(_,i)=>({value:i+10,observedAt:new Date(now-(23-i)*3600000).toISOString()}));x.send({pm25:{status:'latest',value:20,avg24h:20,observedAt:freshISO(),unit:'µg/m³'},history});assert.equal(x.get('#series').children.filter(e=>e.attrs.class==='point').length,24)});

test('missing hour remains a gap even when measurements are only 61 minutes apart',()=>{const x=start(),hour=Math.floor(Date.now()/3600000)*3600000;x.send({pm25:{status:'latest',value:20,avg24h:20,observedAt:freshISO(),unit:'µg/m³'},history:[{value:12,observedAt:new Date(hour-4*3600000+59*60000).toISOString()},{value:14,observedAt:new Date(hour-2*3600000).toISOString()}]});assert.equal(x.get('#series').children.filter(e=>e.attrs.class==='trend-line').length,0);assert.equal(x.get('#series').children.filter(e=>e.attrs.class==='point').length,2)});

test('graph styling follows the PM tier and points stay compact',()=>{const x=start(),now=Date.now();x.send({pm25:{status:'latest',value:50,avg24h:50,observedAt:freshISO(),unit:'µg/m³',band:'unhealthy_sensitive'},history:[{value:50,observedAt:new Date(now).toISOString()}]});assert.equal(x.get('#board').dataset.tier,'orange');assert.equal(x.get('#series').children[0].attrs.r,'1.8');x.send({pm25:{status:'unavailable'},history:[]});assert.equal(x.get('#board').dataset.tier,'')});

test('hourly reading colors the number and moves the marker independently of 24h status',()=>{const x=start();x.send({pm25:{status:'latest',value:32.2,avg24h:21.3,observedAt:freshISO(),unit:'µg/m³',band:'good'}});assert.equal(x.get('.badge').textContent,'ดี');assert.equal(x.get('#board').dataset.tier,'green');assert.equal(x.get('#board').style['--number-dark'],'#dba912');assert.ok(Math.abs(parseFloat(x.get('.scale-arrow').style.left)-51.52)<0.01);});

test('unavailable hourly data removes the previous hourly number color',()=>{const x=start();x.send({pm25:{status:'latest',value:32.2,avg24h:21.3,observedAt:freshISO(),unit:'µg/m³'}});x.send({pm25:{status:'unavailable'}});assert.equal(x.get('#board').style['--number-dark'],'#778a9b');assert.equal(x.get('.scale-arrow').hidden,true)});
