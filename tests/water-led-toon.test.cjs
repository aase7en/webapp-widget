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

test('card v4: 2.5D painted scene on the card, no 3D embed, flow slider on the card',()=>{
 const html=read(page);
 assert.match(html,/id="scene-canvas"/);                          // 2.5D painted scene canvas
 assert.match(html,/function drawScene\(/);                       // single painter reused by card + LED
 assert.doesNotMatch(html,/<iframe/);                             // three.js embed dropped from this page
 assert.match(html,/class="scene-flow"/);                         // flow slider lives ON the card
 assert.match(html,/flowOverride/);                               // slider overrides art only
 assert.match(html,/applyGateFromData/);                          // default flow derives from real %bank
 assert.match(html,/id="led-frame"/);
 assert.match(html,/led-clock/);                                  // clock/date over the LED scene
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

test('mobile layout: card stacks vertically <=720px (clock row / full-width 16:9 stage / full-width HUD) + LED strip auto-scales, no fixed micro-columns',()=>{
 const html=read(page);
 assert.match(html,/@media \(max-width:720px\)/);
 assert.match(html,/\.card\{display:flex;flex-direction:column;aspect-ratio:auto;height:auto\}/);
 assert.match(html,/\.scene\{aspect-ratio:16\/9;width:100%;height:auto/);
 assert.match(html,/\.clockzone\{flex-direction:row/);
 assert.doesNotMatch(html,/grid-template-columns:120px 1fr 200px/); // old fixed micro-columns removed
 assert.match(html,/id="led-wrap"/);                                // LED scale wrapper
 assert.match(html,/function sizeLed\(\)/);                         // auto-fit <=432
 assert.match(html,/wrap\.style\.width=\(432\*s\)/);
});
test('data: canonical API Report_PM2.5 Sheet read-only JSONP, no direct HII 429, 15-minute cache-friendly checks',()=>{
 const js=read(page);
 assert.match(js,/SHEET_WATER_URL/);
 assert.match(js,/action=water_history/);
 assert.match(js,/471583/);
 assert.match(js,/2607/);
 assert.match(js,/TIMEOUT_MS=12000/);
 assert.match(js,/900000/); // only Google Sheet read cadence, not provider API
 assert.match(js,/document\.addEventListener\('visibilitychange'/);
 assert.match(js,/fetchInFlight/);
 assert.match(js,/verifiedSheetStation/);
 assert.match(js,/historical/);
 assert.doesNotMatch(js,/api-v3\.thaiwater\.net/);
 assert.doesNotMatch(js,/fetchT\(/);
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

test('five user-controlled illustrated gate presets with explicit simulated meaning',()=>{
 const html=read(page);
 for(const x of [0,25,50,75,100])assert.match(html,new RegExp('data-gate="'+x+'"'));
 assert.match(html,/flow=selected\/100/);
 assert.match(html,/step="25" value="75"/);
 assert.match(html,/ประตูน้ำเป็นภาพจำลอง 5 ระดับ/);
 assert.doesNotMatch(html,/flowData=open\/100/);
 assert.match(html,/function applyGateFromData\(\)\{\s*flowData=flow/);
 assert.match(html,/toggle-motion/);
});

test('moving water sheets, foam spray, impact ripples and accessible motion controls',()=>{
 const html=read(page);
 assert.match(html,/Moving highlights clipped INSIDE each water curtain/);
 assert.match(html,/t\*speed/);
 assert.match(html,/Impact jets, outward-running foam and spray/);
 assert.match(html,/c\.ellipse\(center,poolY/);
 assert.match(html,/var openF=0\.90\*fl/);
 assert.match(html,/if\(fl>0\.001\)/); // zero release really closes water flow
 assert.match(html,/reduced\|\|paused/);
 assert.match(html,/paused\?\'เล่นภาพ\':\'หยุดภาพ\'/);
});

test('the original user-provided luxury blue-gold scene is backed by a local sprite atlas',()=>{
 const html=read(page),asset=path.join(root,'demo/assets/water-gate-5levels-4frames.webp');
 assert.ok(fs.existsSync(asset),'local 5-level × 4-frame atlas must exist');
 const bytes=fs.readFileSync(asset);
 assert.equal(bytes.subarray(0,4).toString('ascii'),'RIFF');
 assert.equal(bytes.subarray(8,12).toString('ascii'),'WEBP');
 assert.match(html,/gateAtlas\.src='assets\/water-gate-5levels-4frames\.webp'/);
 assert.match(html,/drawAtlasScene\(c,W,H,t,fl\)/);
 assert.match(html,/tile\(next,eased\)/);
 assert.match(html,/if\(atlasReady\)\{drawAtlasScene/);
 assert.match(html,/gateAtlas\.onerror/); // procedural fallback if unavailable
});
