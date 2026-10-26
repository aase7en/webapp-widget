const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ui=read('v2/water-luxury-live.html'),js=read('v2/water-luxury-live.js'),css=read('v2/water-luxury-live.css'),rot=read('v2/index.html');
test('only water slide is overlaid; PM and weather still coexist in original rotation',()=>{
 assert.match(rot,/id="pm"/);assert.match(rot,/src="\.\/weather\.html"/);
 assert.match(rot,/src="\.\/water-luxury-live\.html"/);assert.match(rot,/id="water"/);
 assert.match(rot,/main>article/);
});
test('physical 432x40 water-only view contains two reference stations with no fixture controls',()=>{
 assert.match(css,/width:432px;height:40px/);
 assert.match(css,/scale\(\.3333333333\)/);
 assert.match(ui,/stationA/);assert.match(ui,/stationB/);
 assert.doesNotMatch(ui+js,/(?:numberSample|statusSample|แสดงค่าตัวอย่าง|TEST_FIXTURE|2\.87\s*ม\.|3\.17\s*ม\.)/);
 assert.doesNotMatch(js,/(?:fetch\(['"]https:\/\/api-v3|new XMLHttpRequest|localStorage)/);
});
test('client uses only canonical old bounded Sheet backend and never claims live or flood safety',()=>{
 assert.match(ui,/api-client\.js/);assert.match(js,/UthApiClient\.getWater\(\)/);
 assert.match(js,/reading\.observedAt/);assert.match(js,/historical/);
 assert.match(js,/historyPath/);assert.match(js,/risk/)==false; // no real-risk classification in live water
 assert.match(js,/unassessed|ไม่ใช่ความจุน้ำ|ภาพการไหลประกอบ/);
});
test('source script preserves typed dates and last stored result without interpreting old data as new',()=>{
 const gas=read('apps-script/WaterHistory.gs'),api=read('v2/api-client.js');
 assert.match(gas,/Object\.prototype\.toString\.call\(v\)==='\[object Date\]'/);
 assert.match(gas,/status:!current\?'missing':age<=FRESH_AGE\?'ok':'historical'/);
 assert.match(gas,/risk:'unassessed'/);
 assert.doesNotMatch(gas,/status:!current\|\|age>MAX_AGE/);
 assert.match(api,/const validStamp=Number\.isFinite\(stamp\)&&stamp<=tnow\+120000;/);
});
