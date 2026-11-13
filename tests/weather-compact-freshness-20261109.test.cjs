'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('v2/weather-luxury.html'),css=read('v2/weather-hybrid-live.css');
const core=read('v2/weather-luxury.js'),hybrid=read('v2/weather-hybrid-live.js');
test('Forecast has zero oversized freshness overlay and keeps status accessibility',()=>{
 assert.doesNotMatch(html,/hybrid-status/);
 assert.doesNotMatch(css,/\.hybrid-status/);
 assert.doesNotMatch(hybrid,/hybrid-status|status\.textContent/);
 assert.match(hybrid,/panel\.append\(metrics,daysEl\)/);
 assert.match(hybrid,/panel\.dataset\.freshness=freshness/);
 assert.match(hybrid,/panel\.dataset\.observedAt=/);
 assert.match(hybrid,/panel\.setAttribute\('aria-label'/);
});
test('Compact source-age note lives under clock, not in Feels or Forecast',()=>{
 assert.match(html,/<div class="clock">[\s\S]*?<span class="source-at" id="source-at" aria-live="off" hidden><\/span><\/div>/);
 assert.doesNotMatch(html,/<div class="feel">[\s\S]*?id="source-at"/);
 assert.match(css,/\.board \.clock \.source-at:not\(\[hidden\]\)/);
 assert.match(core,/const note=old\?'เก่า '\+\(timeShort\|\|'เวลาไม่พร้อม'\)/);
 assert.match(core,/timeZone:'Asia\/Bangkok'/);
 assert.match(core,/stamp\.setAttribute\('aria-label',full\)/);
 assert.match(core,/old\?'HISTORICAL':/);
});
test('Historical Feels and advice remain visible but explicitly marked OLD',()=>{
 assert.match(core,/const feelAvailable=Number\.isFinite\(d\.feelsC\)/);
 assert.match(core,/feeling\.hidden=!feelAvailable/);
 assert.match(core,/feeling\.dataset\.historical=old\?'yes':'no'/);
 assert.match(core,/label:'เดิม: '\+prior\.compact/);
 assert.match(core,/badge\.dataset\.historical=advice\.historical\?'yes':'no'/);
 assert.match(core,/ไม่ใช่คำเตือนความร้อนปัจจุบัน/);
 assert.match(css,/\.board \.feel-value\[data-historical="yes"\]/);
 assert.match(css,/\.board \.temp-guidance\[data-historical="yes"\]/);
 assert.match(core,/if\(!Number\.isFinite\(t\)\)return null/);
});
test('4+3 rain rows fit inside native 38 px panel after historical border',()=>{
 assert.match(css,/\.hybrid-days\{[^\n]*height:100%/);
 assert.match(css,/\.hybrid-day\{[^\n]*height:100%/);
 assert.match(css,/\.hybrid-day-name\{[^\n]*height:7px/);
 assert.match(css,/\.hybrid-day-icon\{[^\n]*height:13px/);
 assert.match(css,/\.hybrid-days \.rf-weather-svg\{[^\n]*height:13px/);
 assert.match(css,/\.hybrid-rain\{[^\n]*height:6px/);
 assert.match(hybrid,/range=page===0\?\[0,1,2,3\]:\[4,5,6\]/);
});
test('Scoped cache chain updates Weather only; PM and Water unchanged',()=>{
 const page=read('v2/index.html'),entry=read('index.html');
 assert(html.includes('weather-hybrid-live.js?v=20261109-compact-1'));
 assert(html.includes('weather-luxury.js?v=20261113-led-contrast-1'));
 assert(html.includes('weather-hybrid-live.css?v=20261109-icons-2'));
 assert(page.includes('weather-luxury.html?v=20261113-led-contrast-1'));
 assert(entry.includes('v2/index.html?display=led&amp;v=20261113-led-contrast-1'));
 assert(page.includes('pm25-live.html?v=20261113-led-contrast-1'));
 assert(page.includes('water-luxury-live.html?v=20261108-label-1'));
 assert.doesNotMatch(core,/#advice|\.heat-tag/);
});
