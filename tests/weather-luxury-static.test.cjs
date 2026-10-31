const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const ROOT=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'v2/weather-luxury.html'),'utf8');
const js=fs.readFileSync(path.join(ROOT,'v2/weather-luxury.js'),'utf8');

test('fixed .icon-glow box is fully removed from markup and CSS',()=>{
 assert.doesNotMatch(html,/icon-glow/,'no icon-glow div or rule may remain');
});

test('weather icons have a shape-fitted soft shadow and condition-specific alignment',()=>{
 assert.match(html,/drop-shadow\(0 0 19px rgba\(0,5,15,\.52\)\)/);
 for(const id of ['night','cloudy','fog','wind','rain','thunderstorm','night-rain','night-wind','night-thunderstorm'])assert.match(html,new RegExp('\\.icon\\[data-condition="'+id+'"\\]'));
 assert.match(html,/left:350px;top:-28px;width:170px;height:170px/);
 assert.match(html,/left:350px;top:-24px;width:170px;height:170px/);
});

test('paint() sets dataset.condition on the reduced-motion poster too',()=>{
 assert.match(js,/\$\('#poster'\)\.dataset\.condition=id/,'poster mirrors the icon condition attribute');
 assert.match(js,/\$\('#icon'\)\.dataset\.condition=id/);
});

test('cache versions bumped to 20261031-final-ui-4 across the embed chain',()=>{
 assert.match(html,/weather-luxury\.js\?v=20261031-final-ui-4/,'weather-luxury.js embed in its own page');
 assert.match(html,/src="weather-snapshot\.js"/,'snapshot adapter stays unversioned (pinned by tests)');
 const screen=fs.readFileSync(path.join(ROOT,'v2/index.html'),'utf8');
 assert.match(screen,/weather-luxury\.html\?v=20261031-final-ui-4/,'v2/index.html weather embed');
 const root=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
 assert.match(root,/v2\/index\.html\?display=led&amp;v=20261031-final-ui-4/,'root index.html switcher embed');
});
