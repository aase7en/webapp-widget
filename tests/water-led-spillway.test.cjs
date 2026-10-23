const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const page=path.join(root,'demo/water-led-spillway.html');
const read=p=>fs.readFileSync(p,'utf8');

test('water-led-spillway page exists as an isolated demo (no production file references)',()=>{
  assert.ok(fs.existsSync(page),'demo/water-led-spillway.html must exist');
  const html=read(page);
  // additive demo page: must NOT reference or modify production widget files
  assert.doesNotMatch(html,/(\.\.\/)?index\.html/);
  assert.doesNotMatch(html,/water\.html|strip\.js|strip\.css|led-rotation\.js|apps-script/);
  // embeds the spillway demo via the additive embed mode, not a copied bundle
  assert.match(html,/spillway-3d\/\?display=embed/);
});

test('honest labels: SIMULATED spillway + real RID source + fail-closed grey values',()=>{
  const html=read(page);
  assert.match(html,/จำลอง \(SIMULATED\)/);
  assert.match(html,/ไม่ใช่การปล่อยน้ำจริง/);
  assert.match(html,/RID กรมชลประทาน · วัดจริงรายชั่วโมง/);
  assert.match(html,/ไม่แสดง 0 แทนข้อมูลที่ไม่ทราบ|รอข้อมูล/);
  // both stations kept with banks, % ของระดับตลิ่ง, ม.รทก. units
  assert.match(html,/S\.5 สะพานปรีดี/);
  assert.match(html,/S\.26 ท้ายเขื่อน ร\.6/);
  assert.match(html,/ระดับตลิ่ง 4\.70 ม\./);
  assert.match(html,/ระดับตลิ่ง 7\.20 ม\./);
  assert.match(html,/ม\.รทก\./);
  // fail-closed: fetch errors paint grey wait values, never fabricated numbers
  assert.match(html,/paintStation\(cfg\.sid,null,cfg\.bank\)/);
  assert.match(html,/รอข้อมูล/);
  // no observed date/time on the strip (caption carries it)
  const strip=html.slice(html.indexOf('led-frame'),html.indexOf('</div>\n  </div></div>'));
  assert.doesNotMatch(strip,/observedAt/);
});
test('v2 layout: clock leftmost, no สถานี ก/ข chips, level+name left-aligned stack',()=>{
  const html2=read(page);
  assert.match(html2,/\.st-name\{position:absolute;top:2px;right:6px/); // name pinned top-right of its column
  assert.match(html2,/\.spill-slot\{width:100px;flex:0 0 100px/);        // 3D slot widened to ~100px
  const html=read(page);
  const iClock=html.indexOf('class="clock"'),iSpill=html.indexOf('class="spill-slot"'),
        iA=html.indexOf('id="st-a"'),iB=html.indexOf('id="st-b"');
  assert.ok(iClock>-1&&iClock<iSpill&&iSpill<iA&&iA<iB,'strip order must be clock -> spillway -> S.5 -> S.26');
  assert.doesNotMatch(html,/สถานี ก|สถานี ข/);                 // ก/ข chips removed per spec
  assert.match(html,/class="st-name" id="a-name"/);            // name is the highlighted header
  assert.match(html,/class="st-numline"/);                     // left-aligned number stack
});
test('color bands: amber >= bank-0.50, red >= bank; glow on numbers',()=>{
  const js=read(path.join(root,'demo/spillway-3d/main.js'));
  const html=read(page);
  assert.match(html,/if\(level>=bank\)return 'band-red';/);
  assert.match(html,/if\(level>=bank-0\.50\)return 'band-amber';/);
  assert.match(html,/band-green/);
  assert.match(html,/text-shadow:0 0 7px/);                    // subtle glow like the PM numbers
});
test('symbolic gate drive: max(%bank) -> opening, idle floor 15, honest note',()=>{
  const html=read(page);
  assert.match(html,/applyGateFromData/);
  assert.match(html,/Math\.max\.apply\(null,lastPcts\)/);
  assert.match(html,/Math\.max\(15,Math\.min\(100,eff\)\)/);  // idle floor 15%, linear clamp
  assert.match(html,/ประตูเปิดตามสัดส่วนระดับจริง \(แสดงเชิงสัญลักษณ์ ไม่ใช่สั่งการเขื่อนจริง\)/);
  assert.match(html,/sendFlow\(open\)/); // blocked path -> idle 15% target
});
test('robust embed handshake: ready ping + retries + flowAck + blocked slider sync',()=>{
  const html=read(page);
  const js=read(path.join(root,'demo/spillway-3d/main.js'));
  // iframe announces readiness (listener attach + after scene init) and acks applied flow
  assert.match(js,/postMessage\(\{source:'spillway',type:'ready'\}/);
  assert.match(js,/type:'flowAck',value:v/);
  // parent tracks readiness and re-sends the stored target
  assert.match(html,/embedReady/);
  assert.match(html,/type:'ready'/);
  assert.match(html,/lastTarget/);
  assert.match(html,/300\)/);
  assert.match(html,/900\)/);
  // blocked path syncs the parent slider to the idle 15%
  assert.match(html,/fd\.value=String\(open\);fdv\.textContent=open\+'%';/);
  assert.match(html,/var open=15;/);
});
test('embed drone camera path: ping-pong upper-right -> lower-left, reduced static, sector-clamped',()=>{
  const js=read(path.join(root,'demo/spillway-3d/main.js'));
  assert.match(js,/droneAz=\(45-70\*e\)/);                   // +45deg -> -25deg sweep
  assert.match(js,/droneEl=\(24-18\*e\)/);                   // 24deg -> 6deg descend
  assert.match(js,/if\(reduced\)\{droneAz=10\*Math\.PI\/180;droneEl=14\*Math\.PI\/180;\}/);
  assert.match(js,/camAz/);                                    // exposed for verification
});

test('RID direct pattern: colModel -> hourly rows -> latest non-empty, manual refresh only',()=>{
  const html=read(page);
  assert.match(html,/hyd-app-db\.rid\.go\.th/);
  assert.match(html,/GetColModelHL/);
  assert.match(html,/getGroupHourlyWaterLevelReportHL/);
  assert.match(html,/704/);
  assert.match(html,/wlvalues/);
  assert.match(html,/TIMEOUT_MS=12000/);
  assert.match(html,/ridInFlight/);                       // single-flight
  assert.doesNotMatch(html,/setInterval\(\s*(?:async\s*)?\(\)\s*=>\s*\{?\s*ridFetch/); // no polling loop
  assert.match(html,/rid-refresh/);                        // manual refresh button
  // no wall/gate icon assets: the old ฉากกั้น icon rig is replaced by the 3D spillway slot
  assert.doesNotMatch(html,/wall\.png|liquid-normal\.png|icons3d/);
  assert.match(html,/spill-slot/);
});

test('embed demo hook: postMessage flow control is embed-gated',()=>{
  const js=read(path.join(root,'demo/spillway-3d/main.js'));
  assert.match(js,/const EMBED=new URLSearchParams\(location\.search\)\.get\('display'\)==='embed'/);
  assert.match(js,/e\.data\.type!=='spillway-flow'/);
  assert.match(js,/EMBED\?0\.5:1/);                        // reduced particle budget in embed
});
