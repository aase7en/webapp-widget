'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const pm=read('v2/pm25-live.html'),pmJS=read('v2/pm25-live.js');
const wx=read('v2/weather-luxury.html'),wxJS=read('v2/weather-luxury.js');
const wxCSS=read('v2/weather-hybrid-live.css');
const waCSS=read('v2/water-luxury-live.css');
test('Owner-approved Aligned optical geometry has explicit font values and unchanged clock',()=>{
 assert.match(pm,/\.number\{font-size:var\(--value-size,100px\);font-weight:900;/);
 assert.match(pmJS,/:'100px'\)/);
 assert.match(wx,/\.temp\{top:11px;left:489px;font-size:90px;/);
 assert.match(wxJS,/digits>=4\?60:digits>=3\?70:90/);
 assert.match(waCSS,/\.widget\.v3 \.big-level\{font-size:68px;/);
 assert.match(waCSS,/\.widget\.v3 \.reading-row\{transform:translateY\(4px\)\}/);
 assert.match(wx,/\.time\{font-size:64px;line-height:\.96;font-weight:900/);
 assert.match(waCSS,/\.widget\.v3 \.clock \.time\{font-size:64px;/);
});
test('Weather flags remain in separate native LED y safe zones with minimal thermometer icon',()=>{
 assert.match(wx,/class="feel-thermometer" viewBox="0 0 16 20"/);
 assert.match(wxCSS,/\.board \.feel\{\s*top:4px;bottom:auto/);
 assert.match(wxCSS,/\.board \.heat-tag\{top:92px;/);
 assert.match(wxCSS,/\.board \.feel-value\[hidden\],\.board \.heat-tag\[hidden\]/);
 assert.match(wxCSS,/\.board\.layout-hybrid \.feel\{left:478px;width:126px;transform:none\}/);
 assert.doesNotMatch(wxCSS,/\.board\.layout-hybrid \.clock\{/);
});
test('Warnings preserve original heat index thresholds, freshness gate, and full accessible message',()=>{
 assert.match(wxJS,/d\.advice=d\.historical\?null:h>=40\?'ระวังร้อนจัด':h>=33\?'ระวังร้อน':null/);
 assert.match(wxJS,/warn\.setAttribute\('aria-label',fullWarning\)/);
 assert.match(wxJS,/warn\.title=fullWarning/);
 assert.match(wxJS,/fullWarning\.length>17\?'⚠ ระวังความร้อน'/);
 assert.match(wxJS,/warn\.hidden=!fullWarning/);
 assert.match(wxJS,/board\.dataset\.freshness=old\?'HISTORICAL':/);
 assert.match(wxJS,/UthWeatherSnapshot\.parse/);
});
test('New scoped cache keys refresh only changed page/css/js and preserve weather animation asset version',()=>{
 const index=read('v2/index.html'),entry=read('index.html'),water=read('v2/water-luxury-live.html');
 for(const file of ['pm25-live','weather-luxury','water-luxury-live'])assert.match(index,new RegExp(file+'\\.html\\?v=20261107-aligned-1'));
 assert.match(entry,/v2\/index\.html\?display=led&amp;v=20261107-aligned-1/);
 assert.match(pm,/pm25-live\.js\?v=20261107-aligned-1/);
 assert.match(wx,/weather-hybrid-live\.css\?v=20261107-aligned-1/);
 assert.match(wx,/weather-luxury\.js\?v=20261107-aligned-1/);
 assert.match(water,/water-luxury-live\.css\?v=20261107-aligned-1/);
 assert.match(wxJS,/rain','thunderstorm','night-rain','night-thunderstorm'/);
 assert.match(wxJS,/\?v=20261106-storm-clarity-1/);
});
