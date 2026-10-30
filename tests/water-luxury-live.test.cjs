const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const ui=read('v2/water-luxury-live.html'),js=read('v2/water-luxury-live.js'),css=read('v2/water-luxury-live.css'),rot=read('v2/index.html');
test('new Water Slide replaces old DOM entirely; PM and Weather remain in three-slide rotation',()=>{
 assert.match(rot,/id="pm"/);assert.match(rot,/src="\.\/weather\.html"/);
 assert.match(rot,/src="\.\/water-luxury-live\.html\?v=[\w-]+"/);assert.doesNotMatch(rot,/id="water"|id="s1"|id="s2"|class="spill-sheet"|class="water-station"/);
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

test('comparison badge is descriptive, requires fresh data, and never uses historical values as present',()=>{
 const begin=js.indexOf('function bankBadge(st,now=Date.now()){'),end=js.indexOf('\n// Only a dimensionless',begin);assert.ok(begin>0&&end>begin);
 const badge=Function(js.slice(begin,end)+';return bankBadge;')();
 const fresh={status:'ok',datum:'MSL',value:2,bankM:3,observedAt:new Date().toISOString()};
 assert.equal(badge(fresh).text,'ต่ำกว่าตลิ่ง');assert.equal(badge({...fresh,value:3}).text,'ถึงตลิ่ง');assert.equal(badge({...fresh,value:3.1}).text,'สูงกว่าตลิ่ง');
 assert.equal(badge({...fresh,status:'historical',value:3.1}).text,'ข้อมูลเก่า');assert.equal(badge({...fresh,observedAt:new Date(Date.now()-4*3600000).toISOString(),value:3.1}).text,'ข้อมูลเก่า');assert.equal(badge({...fresh,bankM:null}).text,'รอข้อมูล');assert.equal(badge({...fresh,datum:'other'}).text,'รอข้อมูล');
});
test('spark area uses station-specific gradient and rejects malformed paths',()=>{
 const begin=js.indexOf('function sparkSvg('),end=js.indexOf('\nfunction bankBadge(',begin);assert.ok(begin>0&&end>begin);
 const spark=Function(js.slice(begin,end)+';return sparkSvg;')();
 const first=spark('M5.0 20.0 L332.0 110.0','s1'),second=spark('M5.0 20.0 L332.0 110.0','s2');
 assert.match(first,/id="water-fill-s1"/);assert.match(second,/id="water-fill-s2"/);assert.match(first,/L332\.0 125 L5\.0 125 Z/);assert.match(first,/stop-opacity="\.65"/);assert.match(first,/stop-opacity="\.03"/);
 assert.match(spark('M5 20 L332 110 Z" onload="evil','s1'),/รอประวัติ/);assert.match(spark('M5 20 L332 110','unexpected'),/รอประวัติ/);
});

test('history chart uses a fixed seven-day time window and excludes old or future points',()=>{
 const begin=js.indexOf('function historyPath('),end=js.indexOf('\nfunction apply(',begin);const history=Function(js.slice(begin,end)+';return historyPath;')();
 const now=Date.parse('2026-10-30T12:00:00Z'),times=[-9,-6,-1,0.1].map(d=>new Date(now+d*86400000).toISOString());
 const p=history({trendPoints:[9,1,2,8],trendObservedAt:times},now);assert.match(p,/^M51\.7 /);assert.match(p,/ L285\.3 /);assert.equal((p.match(/[ML]/g)||[]).length,2);
 const sparse=history({trendPoints:[1,2],trendObservedAt:[new Date(now-7200000).toISOString(),new Date(now-3600000).toISOString()]},now);assert.match(sparse,/^M328\.1 /);assert.match(sparse,/ L330\.1 /);
});
