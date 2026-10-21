const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),demo=path.join(root,'demo/spillway-3d');
const read=n=>fs.readFileSync(path.join(demo,n),'utf8');
test('WebGL 3D concept is isolated from live 432x40 homepage and v2',()=>{
 const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const live=fs.readFileSync(path.join(root,'v2/index.html'),'utf8');
 assert.match(home,/v2\/index\.html\?display=led/);
 assert.doesNotMatch(home,/spillway-3d/);
 assert.doesNotMatch(live,/spillway-3d/);
 assert.match(read('index.html'),/DEMO · SIMULATED/);
 assert.match(read('index.html'),/ไม่ใช่ข้อมูลหรือประตูน้ำจริง/);
});
test('3D prototype uses pinned WebGL renderer, GLSL water, controls and fail-soft static SVG',()=>{
 const js=read('main.js'),html=read('index.html');
 assert.match(js,/three@0\.180\.0/);
 assert.match(js,/WebGLRenderer/);
 assert.match(js,/ShaderMaterial/);
 assert.match(js,/float ripple/);
 assert.match(js,/prefers-reduced-motion/);
 assert.match(js,/renderer\?\.dispose\(\)/);
 assert.match(js,/stage\.addEventListener\('pointermove'/);
 assert.match(html,/<svg viewBox=/);
 assert.match(html,/id="flow" type="range"/);
 assert.match(html,/id="play"/);
 assert.match(html,/id="reset"/);
});
