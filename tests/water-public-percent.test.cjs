const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(base,p),'utf8');
const js=read('v2/water-luxury-live.js'),css=read('v2/water-percent-public.css'),original=read('v2/water-luxury-live.css'),html=read('v2/water-luxury-live.html'),rot=read('v2/index.html'),root=read('index.html');
const begin=js.indexOf('function bankIntervalPercent('),end=js.indexOf('function trendCaption(',begin);
assert.ok(begin>=0&&end>begin);
const fraction=Function(js.slice(begin,end)+';return bankIntervalPercent;')();
const dirStart=js.indexOf('function observedDirection('),dirEnd=js.indexOf('function renderStation(',dirStart);
assert.ok(dirStart>=0&&dirEnd>dirStart);
const direction=Function('const WATER_DISPLAY_MS=6*3600000;'+js.slice(dirStart,dirEnd)+';return observedDirection;')();
const freshNow=()=>new Date(Date.now()-9*60000).toISOString();
const st=(levels=[2.25,2.36],age=9)=>{const now=Date.now(),last=now-age*60000;return{status:'ok',datum:'MSL',value:levels.at(-1),bankM:3.03,groundMsl:.227,observedAt:new Date(last).toISOString(),
 historyReading:{trendPoints:levels,trendObservedAt:[new Date(last-60*60000).toISOString(),new Date(last).toISOString()]},observed:'วัดตัวอย่าง'};};
test('source fraction is not flood probability; never clamp above bank or convert unknown to zero',()=>{
 assert.equal(fraction(2.36,.227,3.03,'MSL'),76.1);
 assert.equal(fraction(.88,-8.59,4.7,'MSL'),71.3);
 assert.ok(fraction(3.2,.227,3.03,'MSL')>100);
 for(const args of [[null,.227,3.03,'MSL'],[2.36,.227,.227,'MSL'],[2.36,.227,3.03,null],[.1,.227,3.03,'MSL']])assert.equal(fraction(...args),null);
});
test('verified latest station trend arrow derives ONLY matched actual observation pairs',()=>{
 const now=Date.now();
 assert.equal(direction(st([2.25,2.36]),now).arrow,'↑');
 assert.equal(direction(st([2.46,2.36]),now).arrow,'↓');
 assert.equal(direction(st([2.355,2.36]),now).arrow,'→');
 assert.equal(direction({...st(),status:'historical'},now).arrow,'—');
 assert.equal(direction(st([2.25,2.36],430),now).arrow,'—');
 assert.equal(direction({...st(),historyReading:{trendPoints:[],trendObservedAt:[]}},now).arrow,'—');
 const misaligned=st();misaligned.historyReading.trendPoints=[2.22,2.12];assert.equal(direction(misaligned,now).arrow,'—');
 const wrongTime=st();wrongTime.historyReading.trendObservedAt=[new Date(now-8*3600000).toISOString(),new Date(now-7*3600000).toISOString()];assert.equal(direction(wrongTime,now).arrow,'—');
 const bigGap=st();bigGap.historyReading.trendObservedAt[0]=new Date(now-3*86400000).toISOString();assert.equal(direction(bigGap,now).arrow,'—');
 const shortGap=st();shortGap.historyReading.trendObservedAt[0]=new Date(now-15*60000).toISOString();assert.equal(direction(shortGap,now).arrow,'—');
 const future=st();future.historyReading.trendObservedAt[1]=new Date(now+3600000).toISOString();assert.equal(direction(future,now).arrow,'—');
 assert.equal(direction({...st(),status:'missing'},now).arrow,'—');
 const dupBase=st(),last=new Date(now-9*60000).toISOString(),prev=new Date(now-69*60000).toISOString();
 const conflict=points=>({...dupBase,historyReading:{trendPoints:points,trendObservedAt:[prev,prev,last]}});
 assert.equal(direction(conflict([2.46,2.25,2.36]),now).arrow,'—','conflicting earlier duplicates');
 assert.equal(direction(conflict([2.25,2.46,2.36]),now).arrow,'—','order must not alter direction');
 const latestConflict={...dupBase,historyReading:{trendPoints:[2.25,2.36,2.11],trendObservedAt:[prev,last,last]}};
 assert.equal(direction(latestConflict,now).arrow,'—','conflicting last point duplicates');
 const exact={...dupBase,historyReading:{trendPoints:[2.25,2.25,2.36],trendObservedAt:[prev,prev,last]}};
 assert.equal(direction(exact,now).arrow,'↑','identical duplicates safely collapse');

});
const escStart=js.indexOf('function escapeMarkup('),escEnd=js.indexOf('function renderStation(',escStart);
const escapeMarkup=Function(js.slice(escStart,escEnd)+';return escapeMarkup;')();
const startRender=js.indexOf('function renderStation(st){'),endRender=js.indexOf('function historyPath(',startRender);
assert.ok(startRender>=0&&endRender>startRender);
function render(station){
 const target={innerHTML:''};
 const fakeDoc={querySelector:()=>target};
 const f=Function('document','bankIntervalPercent','observedDirection','bankBadge','trendCaption','sparkSvg','escapeMarkup',
  'const WATER_DISPLAY_MS=6*3600000;'+js.slice(startRender,endRender)+';return renderStation;')(
  fakeDoc,fraction,direction,()=>({text:'ต่ำกว่าตลิ่ง',style:'unavailable'}),()=>({label:'2H / 7D',description:'Measured time range'}),()=>'<svg class="spark"></svg>',escapeMarkup);
 f({el:'#stationA',id:'s1',name:'HDA004 ช่องสะเดา',observed:'ข้อมูลตรวจวัด',historyPath:'M5.0 20.0 L332.0 110.0',...station});
 return target.innerHTML;
}
test('production DOM keeps original water art, badge and 7D graph; percent is dominant and original mMSL accessible',()=>{
 const html=render(st());
 assert.match(html,/water-canvas/);assert.match(html,/foam|water-canvas/);
 assert.match(html,/class="big-level"/);assert.match(html,/76\.1<span class="unit"[^>]*>%<\/span>/);
 assert.match(html,/preview-trend up/);assert.match(html,/↑/);
 assert.match(html,/distance-to-bank/);assert.match(html,/ต่ำกว่าตลิ่ง 0\.67 ม\./);
 assert.match(html,/2\.36 m MSL/);assert.match(html,/aria-label="[^"]*ระดับน้ำอ้างอิงเดิม 2\.36 m MSL[^"]*วัดตัวอย่าง/);
 assert.match(html,/class="spark"/);
 assert.match(html,/HII REFERENCE/);assert.doesNotMatch(html,/DEMO|SIMULATED|ความเสี่ยงน้ำท่วม \d+%/);
});
test('historical and missing data fail closed instead of presenting fabricated current percent or arrow',()=>{
 const old=render({...st(),status:'historical'});
 assert.match(old,/class="big-level"[^>]*>—<\/output>/);
 assert.match(old,/ข้อมูลเก่าเกิน 6 ชม\./);
 assert.match(old,/preview-trend unknown/);
 const missing=render({...st(),status:'missing',value:null,bankM:null,groundMsl:null,datum:null,observedAt:null});
 assert.match(missing,/class="big-level"[^>]*>—<\/output>/);
 assert.match(missing,/รอข้อมูลอ้างอิง/);
});
test('percentage over 100 is not clamped; water color, original animation and trend renderer remain intact',()=>{
 const html=render({...st(),value:3.17,historyReading:undefined});
 assert.match(html,/class="big-level wide-pct"/);
 assert.match(html,/สูงกว่าตลิ่ง 0\.14 ม\./);
 assert.match(css,/\.widget\.v3 \.preview-trend/);assert.match(css,/\.widget\.v3 \.distance-to-bank/);
 assert.match(original,/\.widget\.v3 \.foam-front/);
 assert.match(js,/ctx\.drawImage\(image,frame\*frameW/);
 assert.match(js,/function drawFoam\(frame\)/);
 assert.match(js,/function historyPath\(st,now=Date\.now\(\)\)/);
});
test('scoped cache pins load new CSS/JS and rotated water page without altering other pages',()=>{
 assert.match(html,/water-luxury-live\.css\?v=20261121-six-hour-1/);
 assert.match(html,/water-percent-public\.css\?v=20261121-six-hour-1/);
 assert.match(html,/water-luxury-live\.js\?v=20261121-six-hour-1/);
 assert.match(rot,/water-luxury-live\.html\?v=20261121-six-hour-1/);
 assert.match(root,/v2\/index\.html\?display=led&amp;v=20261121-six-hour-1/);
 assert.match(rot,/weather-luxury\.html\?v=20261113-led-contrast-1/);
 assert.match(rot,/pm25-live\.html\?v=20261121-six-hour-1/);
});


test('escaped observation strings do not introduce HTML attributes or user-controlled markup',()=>{
 const x=render({...st(),observed:'วัด x" onmouseover="alert(1)<svg>'});
 assert.doesNotMatch(x,/" onmouseover="/);
 assert.doesNotMatch(x,/<svg>[^<]/);
 assert.match(x,/&quot; onmouseover=&quot;alert\(1\)&lt;svg&gt;/);
});
