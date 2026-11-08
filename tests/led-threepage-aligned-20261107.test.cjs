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
 assert.match(wxJS,/box.style.fontSize='90px'/);
 assert.match(waCSS,/\.widget\.v3 \.big-level\{font-size:68px;/);
 assert.match(waCSS,/\.widget\.v3 \.reading-row\{transform:translateY\(4px\)\}/);
 assert.match(wx,/\.time\{font-size:64px;line-height:\.96;font-weight:900/);
 assert.match(waCSS,/\.widget\.v3 \.clock \.time\{font-size:64px;/);
});
test('Weather flags remain in separate native LED y safe zones with minimal thermometer icon',()=>{
 assert.match(wx,/class="feel-thermometer" viewBox="0 0 16 20"/);
 assert.match(wxCSS,/\.board \.feel\{\s*top:4px;bottom:auto/);
 assert.doesNotMatch(wxCSS,/\.heat-tag/);
 assert.match(wxCSS,/\.board \.feel-value\[hidden\],\.board \.source-at\[hidden\]/);
 assert.match(wxCSS,/\.board\.layout-hybrid \.feel\{left:478px;width:126px;transform:none\}/);
 assert.doesNotMatch(wxCSS,/\.board\.layout-hybrid \.clock\{/);
});
test('Exactly one lower risk badge; heat-index calculation and freshness remain available',()=>{
 assert.match(wx,/id="temp-guidance" role="status" aria-live="polite" aria-atomic="true"/);
 assert.doesNotMatch(wx,/id="advice"|class="heat-tag"/);
 assert.doesNotMatch(wxCSS,/\.heat-tag/);
 assert.doesNotMatch(wxJS,/#advice|d\.advice|warn\.offsetWidth/);
 assert.match(wxJS,/const h=Number\.isFinite\(d\.temperatureC\).*?\?heat\(d\.temperatureC,d\.humidityPct\):null/);
 assert.match(wxJS,/badge\.setAttribute\('aria-label',advice\.detail\)/);
 assert.match(wxJS,/board\.dataset\.freshness=old\?'HISTORICAL':/);
 assert.match(wxJS,/UthWeatherSnapshot\.parse/);
});
test('New scoped cache keys refresh only changed page/css/js and preserve weather animation asset version',()=>{
 const index=read('v2/index.html'),entry=read('index.html'),water=read('v2/water-luxury-live.html');
 for(const [file,version] of [['pm25-live','20261107-graph-3'],['weather-luxury','20261108-single-3'],['water-luxury-live','20261108-label-1']])assert.match(index,new RegExp(file+'\\.html\\?v='+version));
 assert.match(entry,/v2\/index\.html\?display=led&amp;v=20261108-single-3/);
 assert.match(pm,/pm25-live\.js\?v=20261107-graph-3/);
 assert.match(wx,/weather-hybrid-live\.css\?v=20261108-single-3/);
 assert.match(wx,/weather-luxury\.js\?v=20261108-single-3/);
 assert.match(water,/water-luxury-live\.css\?v=20261108-label-1/);
 assert.match(wxJS,/rain','thunderstorm','night-rain','night-thunderstorm'/);
 assert.match(wxJS,/\?v=20261106-storm-clarity-1/);
});

test('Owner Water clock stays visibly on top and cannot clip final time digits',()=>{
 assert.match(waCSS,/\.widget\.v3 \.clock\{overflow:visible;z-index:12\}/);
 assert.match(waCSS,/\.widget\.v3 \.clock \.date,\.widget\.v3 \.clock \.time\{position:relative;z-index:13\}/);
});
test('Owner PM badge layout, icon and simple guidance: original tier semantics unchanged',()=>{
 assert.match(pm,/\.pm-label\{left:374px\}/);
 assert.match(pm,/\.readout\{left:484px\}/);
 assert.match(pm,/\.right\{left:var\(--pm-chart-left,674px\);right:285px\}/);
 assert.match(pmJS,/Math\.max\(674,Math\.ceil\(unitRight\+12\)\)/);
 assert.match(pmJS,/board\.style\.setProperty\('--pm-chart-left','674px'\)/);
 assert.match(pm,/\.inline-guidance\{left:529px\}/);
 assert.match(pm,/pm-status-sun-outline\.svg/);
 assert.match(read('v2/pm-status-sun-outline.svg'),/stroke="#ffffff"/);
 assert.match(pmJS,/advice:'ทำกิจกรรมกลางแจ้งได้ตามปกติ'/);
 assert.match(pmJS,/advice:'ผู้ไวต่อฝุ่นควรลดเวลาอยู่นอกอาคาร'/);
 assert.match(pmJS,/advice:'ลดกิจกรรมกลางแจ้ง สวม N95 เมื่อจำเป็น'/);
 assert.match(pmJS,/advice:'หลีกเลี่ยงกิจกรรมกลางแจ้ง อยู่ในอาคารอากาศสะอาด'/);
 assert.match(pmJS,/const cls=avg===null\?null:PM25Tier\.classify/);
 assert.match(pmJS,/const ht=hourly\.isHealthTier\?tiers\.find/);
});
