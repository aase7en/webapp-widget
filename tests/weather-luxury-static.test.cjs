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
  assert.match(html,/left:345px;top:-49px;width:180px;height:180px/);
  assert.match(html,/left:370px;top:-15px;width:129px;height:129px/);
});

test('every condition icon spans the temperature reading height (y 8..100)',()=>{
  /* Box geometry is derived from each poster's alpha bounds so the visible
     art spans the .temp block (top:8px, 92px line-height). Rain and
     thunderstorm are owner-tuned two board pixels lower and slightly taller.
     Keep rows in sync with the artwork in v2/weather-assets. */
  const boxes={'partly-cloudy':[346,-2,179],'night':[305,-39,262],'cloudy':[213,-155,393],'fog':[224,-149,380],'wind':[292,-117,302],'rain':[345,-49,180],'thunderstorm':[345,-49,180],'night-rain':[370,-15,129],'night-thunderstorm':[370,-15,129],'night-wind':[353,-11,155]};
  const rows={'partly-cloudy':[7,66,8,92],'night':[23,45,8,92],'cloudy':[53,30,8,92],'fog':[53,31,8,92],'wind':[53,39,8,92],'rain':[42,72,10,101],'thunderstorm':[42,72,10,101],'night-rain':[23,91,8,92],'night-thunderstorm':[23,91,8,92],'night-wind':[16,76,8,92]};
  for(const [cond,[left,top,size]] of Object.entries(boxes)){
    assert.match(html,new RegExp('left:'+left+'px;top:'+top+'px;width:'+size+'px;height:'+size+'px'),cond+' box CSS');
    const [y0,rowsPx,expTop,expH]=rows[cond],artTop=top+y0/128*size,artH=size*rowsPx/128;
    assert.ok(Math.abs(artTop-expTop)<=1.5,cond+' art top ~'+expTop+', got '+artTop.toFixed(1));
    assert.ok(Math.abs(artH-expH)<=1.5,cond+' art height ~'+expH+', got '+artH.toFixed(1));
    assert.ok(artTop+artH<=119,cond+' art must stay inside the 120px board');
  }
});

test('paint() sets dataset.condition on the reduced-motion poster too',()=>{
 assert.match(js,/\$\('#poster'\)\.dataset\.condition=id/,'poster mirrors the icon condition attribute');
 assert.match(js,/\$\('#icon'\)\.dataset\.condition=id/);
});

test('cache versions bumped to 20261101-final-ui-6 across the embed chain',()=>{
  assert.match(html,/weather-luxury\.js\?v=20261101-final-ui-6/,'weather-luxury.js embed in its own page');
  assert.match(html,/src="weather-snapshot\.js"/,'snapshot adapter stays unversioned (pinned by tests)');
  const screen=fs.readFileSync(path.join(ROOT,'v2/index.html'),'utf8');
  assert.match(screen,/weather-luxury\.html\?v=20261101-final-ui-6/,'v2/index.html weather embed');
  const root=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  assert.match(root,/v2\/index\.html\?display=led&amp;v=20261101-final-ui-6/,'root index.html switcher embed');
});

test('temperature trend renders with fewer than seven days after midnight',()=>{
  assert.match(js,/const vals=\(d\.days\|\|\[\]\)\.map\(x=>x\.hi\),n=vals\.length;/);
  assert.match(js,/n>=2&&vals\.every\(Number\.isFinite\)/,'graph requires at least two finite points');
  assert.match(js,/i\*350\/\(n-1\)/,'point x positions scale to the available day count');
  assert.match(js,/i\*100\/\(n-1\)/,'gradient stops scale to the available day count');
});
