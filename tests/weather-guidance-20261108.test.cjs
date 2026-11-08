'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const js=read('v2/weather-luxury.js'),css=read('v2/weather-hybrid-live.css'),html=read('v2/weather-luxury.html');
const start=js.indexOf('function weatherGuidance('),end=js.indexOf('\nfunction paintGuidance(',start);
assert(start>=0&&end>start);
const suggest=Function(js.slice(start,end)+';return weatherGuidance;')();

test('international NWS heat-index bands converted to degrees C; no universal claim of safety',()=>{
 assert.equal(suggest(24,26.6,false).label,'อากาศไม่ร้อนจัด');
 assert.equal(suggest(28,26.7,false).label,'พักและดื่มน้ำ');
 assert.equal(suggest(30,32.2,false).label,'หลีกเลี่ยงแดดจัด');
 assert.equal(suggest(36,39.4,false).label,'ระวัง Heatstroke');
 assert.equal(suggest(42,51.7,false).level,'extreme');
 assert.notEqual(suggest(24,26.6,false).label,'ไม่อันตราย');
});
test('cold comfort tips are editorial, not an invented world health standard',()=>{
 assert.equal(suggest(10,11,false).label,'สวมเสื้อให้อุ่น');
 assert.equal(suggest(18,19,false).label,'พกเสื้อกันหนาว');
 assert.equal(suggest(24,null,false).label,'อากาศไม่ร้อนจัด');
});
test('missing/historical and physically impossible values fail closed',()=>{
 assert.equal(suggest(null,null,false),null);
 assert.equal(suggest(36,48,true),null);
 assert.equal(suggest(100,50,false).label,'ตรวจสอบข้อมูล');
 assert.equal(suggest(1000,50,false).label,'ตรวจสอบข้อมูล');
 assert.equal(suggest(30,null,false).label,'ดื่มน้ำและพัก');
 assert.match(js,/d\.temperatureC>= -50&&d\.temperatureC<=60&&Number\.isFinite\(d\.humidityPct\)&&d\.humidityPct>=0&&d\.humidityPct<=100\?heat/);
});
test('90px numeric font remains constant; long 3-4 digits move left only',()=>{
 assert.match(js,/box\.style\.fontSize='90px'/);
 assert.doesNotMatch(js,/digits>=4\?60:digits>=3\?70:90/);
 assert.match(css,/data-temp-digits="3"\]\{transform:translateX\(-133px\)/);
 assert.match(css,/data-temp-digits="4"\]\{transform:translateX\(-185px\)/);
 assert.match(css,/layout-hybrid\) \.temp\[data-temp-digits="4"/);
});
test('one lower health badge replaces duplicate top warning, preserving accessible message',()=>{
 assert.match(html,/id="temp-guidance" role="status" aria-live="polite" aria-atomic="true" hidden/);
 assert.match(css,/\.temp-guidance\{[\s\S]*?top:97px;/);
 assert.doesNotMatch(html,/id="advice"|class="heat-tag"/);
 assert.doesNotMatch(css,/\.heat-tag/);
 assert.doesNotMatch(js,/#advice|d\.advice/);
 assert.match(js,/badge\.hidden=!advice/);
 assert.match(js,/badge\.setAttribute\('aria-label',advice\.detail\)/);
 assert.match(js,/if\(h>=39\.4\)return/);
 assert.match(js,/if\(h>=51\.7\)return/);
});
