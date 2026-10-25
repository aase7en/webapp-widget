const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.join(__dirname,'..');
const demo=fs.readFileSync(path.join(root,'demo/water-led-glass-overlay.html'),'utf8');
const script=demo.split('<script>')[1].split('</script>')[0];

test('new demo is isolated from public production and reads existing water UI',()=>{
 assert.match(demo,/\.\.\/v2\/index\.html\?display=led/);
 assert.match(script,/contentDocument/);
 assert.match(script,/#history-hda/);
 assert.match(script,/#history-s5/);
 assert.match(demo,/API Report_PM2\.5/);
 assert.match(demo,/Water_Level_History/);
 assert.doesNotMatch(demo,/2\.87|3\.17|2\.05|2026-10-21T01:39/);
 assert.doesNotMatch(demo,/api-v3\.thaiwater\.net|script\.google\.com/);
});

test('five approved states and high-level visual swap preserve original assets',()=>{
 for(const n of ['0_0pct','1_1_25pct','2_26_50pct','4_76_100pct','3_51_75pct']){
  assert.match(script,new RegExp(n));
  assert.ok(fs.existsSync(path.join(root,'assets/water-gate/5-levels/uth_led_water_'+n+'_spritestrip.png')));
 }
 assert.match(script,/const BANDS=\[/);
 assert.match(script,/state\.band=band/);
 assert.match(script,/rect\(0,h\*\.43,w,h\*\.57\)/);
 assert.match(script,/canvas\.dataset\.locked/);
});

test('does not fabricate water telemetry and supports reduced motion / responsive display',()=>{
 assert.match(script,/value:null/);
 assert.match(script,/status:'unavailable'/);
 assert.match(script,/reduced=matchMedia/);
 assert.match(script,/if\(!reduced\)raf=requestAnimationFrame/);
 assert.match(script,/window\.__uthGlassDemo/);
 assert.match(demo,/Math\.min\(1,\(el\.clientWidth-2\)\/1296\)/);
 assert.match(demo,/สถานการณ์จำลอง/);
});
