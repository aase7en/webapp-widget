const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ui=read('v2/water-luxury-live.html'),js=read('v2/water-luxury-live.js'),css=read('v2/water-luxury-live.css'),rot=read('v2/index.html');
test('new Water Slide replaces old DOM entirely; PM and Weather remain in three-slide rotation',()=>{
 assert.match(rot,/id="pm"/);assert.match(rot,/src="\.\/weather\.html"/);
 assert.match(rot,/src="\.\/water-luxury-live\.html"/);assert.doesNotMatch(rot,/id="water"|id="s1"|id="s2"|class="spill-sheet"|class="water-station"/);
 assert.match(rot,/main>article/);assert.equal((rot.match(/class="ledframe water-luxury-live-frame"/g)||[]).length,1);
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
test('verified latest station survives missing and older responses without fake current status',()=>{
 const begin=js.indexOf('function apply(st,reading,now){');
 const end=js.indexOf('\nlet reading=false;',begin);
 assert.ok(begin>0&&end>begin);
 const applied=[];
 const apply=Function('renderStation','historyPath',js.slice(begin,end)+';return apply;')(
   st=>applied.push([st.value,st.status,st.observedAt]),()=>'' );
 const now=Date.parse('2026-10-26T12:00:00.000Z');
 const st={value:null,observedAt:null,observed:'รอข้อมูล',status:'missing'};
 const reading={status:'ok',levelMsl:2.81,bankM:3.03,groundMsl:.227,observedAt:'2026-10-26T11:00:00.000Z',trendPoints:[]};
 apply(st,reading,now);
 assert.equal(st.value,2.81);assert.equal(st.status,'ok');
 apply(st,{status:'missing',levelMsl:null,observedAt:null},now+20*60*1000);
 assert.equal(st.value,2.81);assert.equal(st.observedAt,reading.observedAt);
 apply(st,{...reading,levelMsl:1.11,observedAt:'2026-10-26T10:00:00.000Z'},now+5*3600000);
 assert.equal(st.value,2.81);assert.equal(st.status,'historical');
 assert.match(st.observed,/วัด /);
 assert.equal(applied.length,3);
});
