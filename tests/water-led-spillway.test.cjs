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
  // both stations kept with banks, % ของตลิ่ง, ม.รทก. units, observed time
  assert.match(html,/S\.5 สะพานปรีดี/);
  assert.match(html,/S\.26 ท้ายเขื่อน ร\.6/);
  assert.match(html,/ของตลิ่ง 4\.70 ม\./);
  assert.match(html,/ของตลิ่ง 7\.20 ม\./);
  assert.match(html,/ม\.รทก\./);
  // fail-closed: fetch errors paint grey wait values, never fabricated numbers
  assert.match(html,/paintStation\(cfg\.id===349\?'a':'b',null\)/);
  assert.match(html,/รอข้อมูล/);
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
