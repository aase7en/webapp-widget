const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'demo/water-led-luxury-v2.html'),'utf8');
const js=html.split('<script>')[1].split('</script>')[0];

test('isolated faithful LED water luxury V2 preserves 432x40 and 3x review',()=>{
 assert.match(html,/width:1296px; height:120px/);
 assert.match(html,/const scale=Math.min\(1,\(el.clientWidth-2\)\/1296\)/);
 assert.match(html,/Water Level — Luxury V2/);
 assert.match(html,/water-canvas/);
 assert.match(html,/mask-image:linear-gradient/);
 assert.match(html,/width:204px;height:102px/);
 assert.match(html,/width:246px;height:123px/);
 assert.match(html,/background:linear-gradient\(90deg,rgba\(0,2,7,.98\)/);
});

test('both layouts are selectable, with two stations still available',()=>{
 for(const q of ['data-layout="dual"','data-layout="focus"','data-focus="s1"','data-focus="s2"'])
  assert.ok(html.includes(q),q);
 assert.match(js,/function applyLayout/);
 assert.match(js,/layout.mode===.focus./);
 assert.ok(js.includes("document.querySelectorAll('.station')"));
});

test('five owner-corrected art states remain visual simulation, not hydraulic claims',()=>{
 assert.match(js,/const BANDS=\[/);
 for(const n of ['0_0pct','1_1_25pct','2_26_50pct','4_76_100pct','3_51_75pct']){
  assert.match(js,new RegExp(n));
  assert.ok(fs.existsSync(path.join(root,'assets/water-gate/5-levels/uth_led_water_'+n+'_spritestrip.png')));
 }
 assert.match(js,/if\(canvas.dataset.locked!==.1.\)/);
 assert.match(js,/ctx.rect\(0,h\*\.43,w,h\*\.57\)/);
 assert.match(js,/const reduced=matchMedia/);
});

test('no alternate backend or hardcoded real-looking water metric',()=>{
 assert.match(html,/API Report_PM2.5/);
 assert.match(html,/Water_Level_History/);
 assert.match(html,/src="\.\.\/v2\/index\.html\?display=led"/);
 assert.match(js,/value:null/);
 assert.match(html,/ไม่ทราบสถานะ/);
 assert.doesNotMatch(html,/https:\/\/script.google.com/);
 assert.doesNotMatch(html,/2\.87|3\.17/);
});
