const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'demo/water-led-five-levels.html'),'utf8');
const script=html.split('<script>',2)[1].split('</script>',1)[0];

test('isolated demo keeps exactly the existing LED UI and data paths',()=>{
  assert.match(html,/src="\.\.\/v2\/index\.html\?display=led"/);
  assert.match(script,/querySelectorAll\('#water \.gate'\)/);
  assert.match(script,/\.water-fig,#water \.trend/);
  assert.match(html,/iframe id="led"/m);
  assert.doesNotMatch(script,/api-v3\.thaiwater|script\.google\.com|SpreadsheetApp|UrlFetchApp|new Date\(\)\.toISOString\(\)/);
  assert.doesNotMatch(html,/>\s*2\.87\s*</);
});
test('five visual-only release bands use the approved exact files, including high-level swap',()=>{
  for(const x of ['0_0pct','1_1_25pct','2_26_50pct','4_76_100pct','3_51_75pct']){
    assert.ok(html.includes("short:'"+x+"'"),x);
  }
  assert.match(html,/51–75%/);
  assert.match(html,/76–100%/);
  assert.match(html,/ภาพจำลองเพื่อทดสอบดีไซน์/);
  assert.match(html,/ไม่สามารถนำมาคำนวณเปอร์เซ็นต์เปิดประตูได้โดยตรง/);
  assert.match(script,/window\.__uthWaterGateDemo/);
  const assetDir=path.join(root,'assets/water-gate/5-levels');
  for(const k of ['0_0pct','1_1_25pct','2_26_50pct','3_51_75pct','4_76_100pct']){
    for(const ext of ['animated.webp','animated.gif','spritestrip.png']){
      const f=path.join(assetDir,'uth_led_water_'+k+'_'+ext);
      assert.ok(fs.existsSync(f),f);
      assert.ok(fs.statSync(f).size>10000,f);
    }
  }
});
test('actual sprite-strip frame timing and reduced-motion fallback are supported',()=>{
  assert.match(script,/const frame=Math\.floor\(now\/140\)%4/);
  assert.match(script,/ctx\.drawImage\(im,sx,0,srcW,fh,0,0,w,h\)/);
  assert.match(script,/ctx\.rect\(0,h\*\.45,w,h\*\.55\)/);
  assert.match(script,/if\(!reduced\)requestAnimationFrame\(animate\)/);
  assert.match(script,/if\(reduced\)/);
  assert.match(script,/uth-demo-water-poster/);
  assert.match(script,/uth-demo-water-canvas/);
  assert.match(script,/canvas.dataset.fixed/);
  assert.match(script,/canvas.dataset.ready/);
  assert.match(html,/uth-gallery-poster/);
});
