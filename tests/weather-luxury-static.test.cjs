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
 assert.ok(iconRule,'final .icon rule (left:333/top:-20/205x205) must exist');
 const layers=(iconRule[0].match(/drop-shadow\(/g)||[]).length;
 assert.ok(layers>=2,'.icon filter must stack >=2 drop-shadow layers, got '+layers);
 assert.match(iconRule[0],/filter:drop-shadow\(0 1px 3px rgba\(0,0,0,\.65\)\) drop-shadow\(0 0 6px rgba\(2,8,20,\.55\)\) drop-shadow\(0 0 16px rgba\(0,5,15,\.5\)\)/);
});

test('per-condition vertical alignment keeps partly-cloudy reference and offsets moon/no-luminary groups',()=>{
 assert.match(html,/\/\* icon align: sun\/moon baseline \*\//,'group logic documented in CSS');
 for(const id of ['night','night-rain','night-thunderstorm','night-wind']){
  assert.match(html,new RegExp('\\.icon\\[data-condition="'+id+'"\\]\\{top:-7px\\}'),id+' moon group -> -7px');
 }
 for(const id of ['cloudy','fog','rain','thunderstorm','wind']){
  assert.match(html,new RegExp('\\.icon\\[data-condition="'+id+'"\\]\\{top:-26px\\}'),id+' no-luminary group -> -26px (two native LED pixels up)');
 }
 assert.match(html,/\.icon\{left:333px;top:-20px;/,'partly-cloudy reference baseline stays top:-20px');
});

test('no-luminary icons move two native LED pixels, not two enlarged board pixels',()=>{
 const scale=Number(html.match(/transform:scale\(([^)]+)\)/)[1]);
 const referenceTop=Number(html.match(/\.icon\{left:333px;top:(-?\d+)px;/)[1]);
 for(const id of ['cloudy','fog','rain','thunderstorm','wind']){
  const top=Number(html.match(new RegExp('\\.icon\\[data-condition="'+id+'"\\]\\{top:(-?\\d+)px\\}'))[1]);
  assert.ok(Math.abs((top-referenceTop)*scale+2)<1e-8,id+' must move up two 432x40 display pixels');
 }
});

test('paint() sets dataset.condition on the reduced-motion poster too',()=>{
 assert.match(js,/\$\('#poster'\)\.dataset\.condition=id/,'poster mirrors the icon condition attribute');
 assert.match(js,/\$\('#icon'\)\.dataset\.condition=id/);
});

test('cache versions bumped to 20261031-icon-align-2 across the embed chain',()=>{
 assert.match(html,/weather-luxury\.js\?v=20261031-icon-align-2/,'weather-luxury.js embed in its own page');
 assert.match(html,/src="weather-snapshot\.js"/,'snapshot adapter stays unversioned (pinned by tests)');
 const screen=fs.readFileSync(path.join(ROOT,'v2/index.html'),'utf8');
 assert.match(screen,/weather-luxury\.html\?v=20261031-icon-align-2/,'v2/index.html weather embed');
 const root=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
 assert.match(root,/v2\/index\.html\?display=led&amp;v=20261031-icon-align-2/,'root index.html switcher embed');
});
