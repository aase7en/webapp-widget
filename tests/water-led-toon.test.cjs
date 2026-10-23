const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const page=path.join(root,'demo/water-led-toon.html');
const read=p=>fs.readFileSync(p,'utf8');

test('toon water card exists as a self-contained demo (zero external deps, no production refs)',()=>{
  assert.ok(fs.existsSync(page),'demo/water-led-toon.html must exist');
  const html=read(page);
  // zero dependencies: no external script/link/canvas-source, pure inline HTML/CSS/Canvas-2D
  assert.doesNotMatch(html,/<script[^>]*src=/);
  assert.doesNotMatch(html,/<link[^>]*href=["']?https?:/);
  assert.doesNotMatch(html,/three\.js|three\.module|jsdelivr|unpkg|cdn\./);
  assert.match(html,/<canvas id="toon-canvas"/);   // rebuilt: single full-bleed card canvas
  assert.match(html,/<canvas id="strip-canvas"/);
  // no production file references
  assert.doesNotMatch(html,/index\.html|water\.html(?!-toon)|strip\.js|strip\.css|led-rotation|apps-script|v2\//);
});

test('honest labels: SIMULATED scene + real ThaiWater source + no fabricated 7-day history',()=>{
  const html=read(page);
  assert.match(html,/ภาพจำลอง \(SIMULATED\)/);
  assert.match(html,/ไม่ใช่คำเตือนภัย/);
  assert.match(html,/ThaiWater\/HII/);
  // no fabricated 7-day history: only the honest placeholder wording is allowed
  assert.match(html,/รอแหล่งข้อมูลยืนยัน|ยังไม่เปิดใช้/);
  assert.doesNotMatch(html,/ข้อมูลย้อนหลัง 7 วันจริง|ประวัติการใช้น้ำ 7 วัน/);
  // fail-closed wording present
  assert.match(html,/รอข้อมูล/);
});

test('data: ThaiWater direct fetch (HDA004 471583 + S.5 2607), fail-closed, 12s timeout, 5-min auto, visibility pause',()=>{
  const js=read(page);
  assert.match(js,/api-v3\.thaiwater\.net\/api\/v1\/thaiwater30\/public\/waterlevel_load/);
  assert.match(js,/471583/);
  assert.match(js,/2607/);
  assert.match(js,/min_bank/);
  assert.match(js,/TIMEOUT_MS=12000|12000/);
  assert.match(js,/300000/);                                   // 5-min auto refresh
  assert.match(js,/document\.addEventListener\('visibilitychange'/); // pause when hidden
  assert.match(js,/fetchInFlight/);                            // single-flight
  // fail-closed paint
  assert.match(js,/applyData\(\[\{sid:'a',v:null\},\{sid:'s5',v:null\}\]\)/);
});

test('animation quality: แรงน้ำ slider, reduced-motion static, DPR-aware, foreground waves/foam/spray',()=>{
  const js=read(page);
  assert.match(js,/แรงน้ำ \(จำลอง\)/);
  assert.match(js,/prefers-reduced-motion: reduce/);
  assert.match(js,/drawAll\(\)/);                              // static composed frame
  assert.match(js,/devicePixelRatio/);                         // DPR-aware
  assert.match(js,/requestAnimationFrame/);
  assert.match(js,/impact foam|foam/i);
  assert.match(js,/bwY=0\.88\*H/);                      // rebuilt: rippled water band across the lower edge
 assert.match(js,/T\.bandStreak/);                        // #6699BD streaks on the band
  assert.match(js,/sparkle|glow/); // rebuilt: glow + sparkle accents
});
