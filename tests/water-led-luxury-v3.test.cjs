const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'demo/water-led-luxury-v3.html'),'utf8');
test('V3 isolated demo uses exactly two independent station scenes within LED border',()=>{
 assert.match(html,/class="widget v3"/);
 assert.match(html,/id="stationA"/);assert.match(html,/id="stationB"/);
 assert.match(html,/grid-template-columns:165px minmax\(0,1fr\) minmax\(0,1fr\) 83px/);
 assert.match(html,/class="foam-front"/);assert.match(html,/mask-image:linear-gradient/);
 assert.match(html,/1296px; height:120px/);
});
test('V3 retains five approved manual animation bands and stable dam architecture',()=>{
 for(const v of ['0_0pct','1_1_25pct','2_26_50pct','4_76_100pct','3_51_75pct'])assert.ok(html.includes(v));
 assert.match(html,/ctx\.rect\(0,h\*\.43,w,h\*\.57\)/);
 assert.match(html,/drawFoam\(frame\)/);
 assert.match(html,/prefers-reduced-motion:reduce/);
});
test('V3 prevents simulated flood classifications posing as operational data',()=>{
 assert.match(html,/const state=\{band:3,frame:0,badgeSample:false,numberSample:false\}/);
 assert.match(html,/เฝ้าระวัง · DEMO/);
 assert.match(html,/ไม่ใช่ผลตรวจวัดจริงหรือสถานะเตือนภัย/);
 assert.match(html,/TEST_FIXTURE|ค่าตัวอย่างจากภาพอ้างอิง/);
 assert.match(html,/Number\.isFinite\(st\.value\)/);
 assert.doesNotMatch(html,/SpreadsheetApp\.|googleapis\.com\/sheets\/v4\/spreadsheets/);
});
test('V3 uses current live source only for measured readings and leaves production untouched',()=>{
 assert.match(html,/src="\.\.\/v2\/index\.html\?display=led"/);
 assert.match(html,/value:null/);
 assert.match(html,/rอข้อมูล|รอข้อมูล/);
 assert.match(html,/aria-pressed="false"/);
});

const css=fs.readFileSync(path.join(root,'demo/water-led-luxury-v3-polish.css'),'utf8');
test('V3.1 shares dam artwork behind clock and data using translucent gradients',()=>{
 assert.match(html,/href="water-led-luxury-v3-polish.css"/);
 assert.match(css,/\.widget\.v3 \.clock\{/);
 assert.match(css,/rgba\(0,8,18,\.13\)/);
 assert.match(css,/\.widget\.v3 \.station \.art-zone/);
 assert.match(css,/left:-83px/);
 assert.match(css,/mask-image:linear-gradient/);
 assert.match(css,/width:360px;height:180px/); // preserve 2:1 source ratio
});
test('V3.1 reclaims right source strip for two large station readings and adjacent status',()=>{
 assert.doesNotMatch(html,/<div class="source-strip"/);
 assert.match(css,/grid-template-columns:180px minmax\(0,1fr\) minmax\(0,1fr\)/);
 assert.match(html,/class="reading-row"/);
 assert.match(html,/<span class="badge \$\{badge\}">\$\{badgeText\}<\/span>/);
 assert.match(css,/\.widget\.v3 \.big-level\{[\s\S]*?font-size:65px/);
 assert.match(css,/\.widget\.v3 \.foam-front\{/);
});
