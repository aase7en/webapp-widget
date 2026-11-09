'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('v2/weather-luxury.html'),style=read('v2/weather-hybrid-live.css'),base=read('v2/weather-luxury.js'),hybrid=read('v2/weather-hybrid-live.js');
test('forecast-wide status removed; source timestamps and freshness remain',()=>{
 assert.doesNotMatch(hybrid,/hybrid-status|status\.textContent/);
 assert.doesNotMatch(style,/\.hybrid-status/);
 assert.match(hybrid,/panel\.dataset\.freshness=freshness/);
 assert.match(hybrid,/panel\.dataset\.observedAt/);
 assert.match(hybrid,/panel\.setAttribute\('aria-label'/);
});
test('small notice appears below clock with complete source in its accessibility title',()=>{
 assert.match(html,/id="source-at" role="note" hidden/);
 assert.match(style,/\.board \.clock \.source-at\{/);
 assert.match(base,/stamp\.textContent='ข้อมูลเดิม '/);
 assert.match(base,/stamp\.title='ข้อมูลย้อนหลัง ณ '/);
 assert.match(base,/stamp\.setAttribute\('aria-label',stamp\.title\)/);
});
test('historical feels marked, null feels hidden, outdated health guidance not presented as current',()=>{
 assert.match(base,/const hasFeels=hasValue&&Number\.isFinite\(d\.feelsC\)/);
 assert.match(base,/feeling\.hidden=!hasFeels/);
 assert.match(base,/feeling\.dataset\.freshness=old\?'HISTORICAL'/);
 assert.match(style,/\.board \.feel-value\[data-freshness="HISTORICAL"\]/);
 assert.match(base,/label:'ตรวจข้อมูลล่าสุด'/);
 assert.match(base,/จึงไม่แสดงคำแนะนำจาก Heat Index เสมือนเป็นข้อมูลปัจจุบัน/);
 assert.match(base,/level:'uncertain',label:'ข้อมูลไม่พร้อม'/);
});
test('rain chance lifted above LED border and 4+3 model forecast preserved',()=>{
 assert.match(style,/\.hybrid-rain\{height:6px;position:relative;top:-2px/);
 assert.match(hybrid,/range=page===0\?\[0,1,2,3\]:\[4,5,6\]/);
 assert.match(hybrid,/fmt\(x\?\.p,'%'/);
 assert.match(hybrid,/setInterval\(rotate,9000\)/);
});
test('only weather cache routes change, PM/Water and storm asset versions retained',()=>{
 assert.match(read('index.html'),/v2\/index\.html\?display=led&amp;v=20261109-compact-1/);
 assert.match(read('v2/index.html'),/weather-luxury\.html\?v=20261109-compact-1/);
 assert.match(html,/weather-luxury\.js\?v=20261109-compact-1/);
 assert.match(html,/weather-hybrid-live\.css\?v=20261109-compact-1/);
 assert.match(html,/weather-hybrid-live\.js\?v=20261109-compact-1/);
 assert.match(read('v2/index.html'),/pm25-live\.html\?v=20261107-graph-3/);
 assert.match(read('v2/index.html'),/water-luxury-live\.html\?v=20261108-label-1/);
 assert.match(base,/\?v=20261106-storm-clarity-1/);
});
