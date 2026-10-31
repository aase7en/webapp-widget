const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'v2/weather-luxury.html'),'utf8');
const js=fs.readFileSync(path.join(ROOT,'v2/weather-luxury.js'),'utf8');

test('fixed .icon-glow box is fully removed from markup and CSS',()=>{
 assert.doesNotMatch(html,/icon-glow/,'no icon-glow div or rule may remain');
});

test('halo is shape-fitted: base .icon rule stacks at least two drop-shadow layers',()=>{
 const iconRule=html.match(/\.icon\{left:333px;top:-20px;width:205px;height:205px;filter:[^}]*\}/);
 assert.ok(iconRule,'the approved sun/cloud baseline stays at top:-20px');
 const layers=(iconRule[0].match(/drop-shadow\(/g)||[]).length;
 assert.ok(layers>=2,'.icon filter must stack >=2 drop-shadow layers, got '+layers);
 assert.match(iconRule[0],/filter:drop-shadow\(0 1px 3px rgba\(0,0,0,\.65\)\) drop-shadow\(0 0 6px rgba\(2,8,20,\.55\)\) drop-shadow\(0 0 16px rgba\(0,5,15,\.5\)\)/);
});

test('all weather conditions have shape-fitted icons and rain variants fit the viewport',()=>{
 assert.match(html,/\.icon\[data-condition="night"\]\{top:-7px\}/);
 for(const id of ['night-rain','night-thunderstorm','rain','thunderstorm']){
  assert.match(html,new RegExp('\\.icon\\[data-condition="'+id+'"\\]'),'positioned '+id);
 }
 assert.match(html,/width:160px;height:160px;left:355px/g,'tall rain assets are scaled as a group');
 assert.match(html,/cloud-only conditions are raised by six board pixels/i);
 assert.match(html,/\.icon\[data-condition="cloudy"\],\.icon\[data-condition="fog"\]\{top:-26px\}/,'clouds move up two native pixels from the sun/cloud baseline');
});

test('paint() sets dataset.condition on the reduced-motion poster too',()=>{
 assert.match(js,/\$\('#poster'\)\.dataset\.condition=id/,'poster mirrors the icon condition attribute');
 assert.match(js,/\$\('#icon'\)\.dataset\.condition=id/);
});

test('cache versions bumped to 20261031-icon-fit-3 across the embed chain',()=>{
 assert.match(html,/weather-luxury\.js\?v=20261031-icon-fit-3/,'weather-luxury.js embed in its own page');
 assert.match(html,/src="weather-snapshot\.js"/,'snapshot adapter stays unversioned (pinned by tests)');
 const screen=fs.readFileSync(path.join(ROOT,'v2/index.html'),'utf8');
 assert.match(screen,/weather-luxury\.html\?v=20261031-icon-fit-3/,'v2/index.html weather embed');
 const root=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
 assert.match(root,/v2\/index\.html\?display=led&amp;v=20261031-icon-fit-3/,'root index.html switcher embed');
});
