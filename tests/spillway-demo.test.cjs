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
test('photoreal upgrade pins PBR lighting, pinned-CDN addons, procedural textures and merged geometry',()=>{
 const js=read('main.js');
 assert.match(js,/ACESFilmicToneMapping/);
 assert.match(js,/toneMappingExposure/);
 assert.match(js,/PCFSoftShadowMap/);
 assert.match(js,/PMREMGenerator/);
 assert.match(js,/HemisphereLight/);
 assert.match(js,/DirectionalLight/);
 assert.match(js,/UnrealBloomPass/);
 assert.match(js,/OutputPass/);
 assert.match(js,/EffectComposer/);
 assert.match(js,/OrbitControls/);
 assert.match(js,/BufferGeometryUtils/);
 assert.match(js,/mergeGeometries/);
 assert.match(js,/InstancedMesh/);
 assert.match(js,/ExtrudeGeometry/);
 assert.match(js,/CanvasTexture/);
 // WebGL-fallback is an intentional state: logged as info, never as console.error
 assert.match(js,/console\.info\('Demo fallback/);
 assert.doesNotMatch(js,/console\.error/);
 // all CDN modules stay on the same pinned three@0.180.0 jsdelivr origin (no vendored assets, no other CDNs)
 const urls=[...js.matchAll(/https:\/\/([^/]+)\/npm\/three@([0-9.]+)\//g)].map(m=>m[0]);
 assert.ok(urls.length>=6,'main.js must import three + addons from pinned CDN');
 for(const u of urls)assert.match(u,/https:\/\/cdn\.jsdelivr\.net\/npm\/three@0\.180\.0\//);
 assert.doesNotMatch(js,/https:\/\/(?!cdn\.jsdelivr\.net)/);
});
test('water system layers: sheets, pool, whitewater A-G and flow-driven gate opening',()=>{
 const js=read('main.js');
 assert.match(js,/gateOpening/);
 assert.match(js,/AdditiveBlending/);
 assert.match(js,/THREE\.Points/);
 assert.match(js,/aeration|aer=/);
 assert.match(js,/uOpen/);
 assert.match(js,/fbm/);
 assert.match(js,/isMobile\?1000:2600/);
 assert.match(js,/THREE\.Fog/);
});
test('camera presets, damping, idle drift and adaptive pixel ratio exist',()=>{
 const js=read('main.js'),html=read('index.html');
 assert.match(html,/id="preset-1"/);
 assert.match(html,/id="preset-2"/);
 assert.match(html,/id="preset-3"/);
 assert.match(js,/enableDamping=true;controls\.dampingFactor=0\.08/);
 assert.match(js,/autoRotate/);
 assert.match(js,/setPixelRatio/);
 assert.match(js,/fps<45/);
 assert.match(js,/fps>58/);
 assert.match(js,/document\.hidden/);
 assert.match(js,/performance\.now\(\)-lastInteraction\)>5000/);
});
test('honesty labels preserved: SIMULATED framing stays on page and reduced-motion static frame',()=>{
 const html=read('index.html');
 assert.match(html,/SIMULATED WATER · NOT TELEMETRY/);
 assert.match(html,/ต้นแบบจำลอง ไม่ใช่ข้อมูลหรือประตูน้ำจริง/);
 assert.match(html,/ปรับการไหลและมุมมองเพื่อพิจารณาดีไซน์ ไม่เกี่ยวข้องกับข้อมูลน้ำของโรงพยาบาลหรือการควบคุมเขื่อน/);
 const js=read('main.js');
 assert.match(js,/reduced\?10\.0:0/);
 assert.match(js,/renderOnce/);
 const readme=read('README.md');
 assert.match(readme,/SIMULATED/i);
});
test('discharge model couples slider to gate opening, sheet thickness and impact energy (SIMULATED)',()=>{
 const js=read('main.js'),html=read('index.html');
 assert.match(js,/function flowState\(/);
 assert.match(js,/const A_MAX=/);
 assert.match(js,/const Q_MAX_M3S=/);
 assert.match(js,/Math\.pow\(Q,1\.3\)/);                    // impact energy keyed superlinear to discharge
 assert.match(js,/gateOpening=s=>flowState\(s\)\.a/);       // gate lift derives from the model
 assert.match(js,/t0=\(0\.045\+0\.92\*uOpen\)/);            // sheet lip thickness anchored to opening
 assert.match(js,/taper=1\.0-0\.18/);                       // continuity taper downstream
 assert.match(js,/key:'E'/);                                // impact materials keyed to energy scaler
 assert.match(js,/const GZ=-0\.40/);                        // leaf in front of breast stubs (visible lift)
 assert.match(js,/Math\.exp\(-dt\/0\.13\)/);              // ~0.4s eased leaf lift animation
 assert.match(js,/lip=vec2\(-0\.36,2\.75\+open\)/);        // sheet lip anchored to the leaf bottom line
 assert.match(js,/seal bar/);                               // bright moving bottom edge on the leaf
 assert.match(js,/Q ~ \$\{FS\.m3s\} m³\/s \(จำลอง\)/);      // live readout derives from the model
 assert.match(html,/ช่องเปิดประตู \(จำลอง\)/);               // honest slider meaning
 assert.match(html,/id="q-readout"/);
 assert.match(html,/m³\/s \(จำลอง\)/);
});
