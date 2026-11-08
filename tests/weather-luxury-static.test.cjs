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
  assert.match(html,/left:343px;top:-46px;width:185px;height:185px/);
  assert.match(html,/left:358px;top:-19px;width:156px;height:156px/);
  assert.match(html,/left:329px;top:-24px;width:200px;height:200px/);
});

test('forecast mini icons are art-fitted luxury 3D posters',()=>{
  /* The same luxury 3D poster assets, cropped to their alpha bounds so the
     visible art fills a uniform 26px slot (a 32x27 object-fit canvas shrank
     cloudy/fog/wind art to ~6-8px). JS must set data-condition, not src. */
  assert.match(js,/if\(x\.ico\)ico\.dataset\.condition=x\.ico;/);
  assert.doesNotMatch(js,/ico\.src='weather-assets\/'\+x\.ico/);
  const minis={'partly-cloudy':['30.3px','49.7','-9.7px -2.3px'],'cloudy':['48.5px','79.6','-15.5px -25.6px'],'fog':['48.5px','79.6','-15.5px -26.2px'],'night':['39px','64','-12.5px -8px'],'night-rain':['20.7px','34','-6.4px -4.2px'],'night-thunderstorm':['20.7px','34','-6.4px -4.2px'],'night-wind':['34.1px','43.2','0 -5.1px'],'rain':['28.2px','46.2','-8.7px -15.2px'],'thunderstorm':['28.2px','46.2','-8.7px -15.2px'],'wind':['48.5px','61.5','0 -18.2px']};
  for(const [cond,[w,size,pos]] of Object.entries(minis)){
    const pat='\\.day \\.forecast-icon\\[data-condition="'+cond+'"\\]\\{width:'+w.replace(/\./g,'\\.')+';background-image:url\\(weather-assets/'+cond+'-poster\\.png\\);background-size:'+size.replace(/\./g,'\\.')+'px;background-position:'+pos.replace(/\./g,'\\.')+'\\}';
    assert.match(html,new RegExp(pat),cond+' mini icon rule');
  }
});

test('icon boxes keep poster-derived geometry inside the board',()=>{
  /* Box geometry is derived from each poster's alpha bounds. Most
     conditions keep their art spanning the .temp block (top:8px, 92px
     line-height). The owner enlarged the rain ensembles and the
     sun-and-cloud art (+20%): their visible bounds are pinned per
     condition and must stay inside the 120px board (40 native LED rows
     x3). Night rain/thunderstorm art already spans y6.4..118.9 at 147px,
     so the requested +30% cannot fit; the owner then explicitly approved
     the max-fit unclipped alternative: 156px (+6.1%) with art pushed to
     the board edges (0.5..119.9, center 6 board px higher than before).
     Night wind takes +29% (200px) with its art center exactly 2 native
     px lower. Night rows use alpha>=25 APNG frame-union bounds (96
     frames). Keep rows in sync with v2/weather-assets. */
  const boxes={'partly-cloudy':[328,-4,215],'night':[305,-39,262],'cloudy':[213,-155,393],'fog':[224,-149,380],'wind':[292,-117,302],'rain':[343,-46,185],'thunderstorm':[343,-46,185],'night-rain':[358,-19,156],'night-thunderstorm':[358,-19,156],'night-wind':[329,-24,200]};
  const rows={'partly-cloudy':[7,66,7.8,110.9],'night':[23,45,8,92],'cloudy':[53,30,8,92],'fog':[53,31,8,92],'wind':[53,39,8,92],'rain':[42,72,14.7,104.1],'thunderstorm':[42,72,14.7,104.1],'night-rain':[16,98,0.5,119.4],'night-thunderstorm':[16,98,0.5,119.4],'night-wind':[16,76,1,118.8]};
  for(const [cond,[left,top,size]] of Object.entries(boxes)){
    assert.match(html,new RegExp('left:'+left+'px;top:'+top+'px;width:'+size+'px;height:'+size+'px'),cond+' box CSS');
    const [y0,rowsPx,expTop,expH]=rows[cond],artTop=top+y0/128*size,artH=size*rowsPx/128;
    assert.ok(Math.abs(artTop-expTop)<=1.5,cond+' art top ~'+expTop+', got '+artTop.toFixed(1));
    assert.ok(Math.abs(artH-expH)<=1.5,cond+' art height ~'+expH+', got '+artH.toFixed(1));
    assert.ok(artTop+artH<=120,cond+' art must stay inside the 120px board');
  }
  /* Night wind visible art center must sit 2 native px (6 board px) lower
     than the previous 155px box; art spans y16..92 (alpha>=25). */
  const nw=boxes['night-wind'],nwTop=nw[1]+16/128*nw[2],nwBot=nw[1]+92/128*nw[2];
  assert.ok(Math.abs((nwTop+nwBot)/2-60.4)<=0.5,'night-wind art center ~60.4, got '+((nwTop+nwBot)/2).toFixed(1));
});

test('paint() sets dataset.condition on the reduced-motion poster too',()=>{
 assert.match(js,/\$\('#poster'\)\.dataset\.condition=id/,'poster mirrors the icon condition attribute');
 assert.match(js,/\$\('#icon'\)\.dataset\.condition=id/);
});

test('production embeds use new hybrid version while review demo remains pinned',()=>{
  assert.match(html,/weather-luxury\.js\?v=20261108-health-2/,'weather-luxury.js embed in its own page');
  assert.match(html,/src="weather-snapshot\.js"/,'snapshot adapter stays unversioned (pinned by tests)');
  assert.match(html,/weather-hybrid-live\.css\?v=20261108-health-2/,'hybrid CSS cache-bust');
  assert.match(html,/weather-hybrid-live\.js\?v=20261105-hybrid-live-1/,'hybrid JS cache-bust');
  const screen=fs.readFileSync(path.join(ROOT,'v2/index.html'),'utf8');
  assert.match(screen,/weather-luxury\.html\?v=20261108-health-2/,'v2/index.html weather embed');
  const root=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
  assert.match(root,/v2\/index\.html\?display=led&amp;v=20261108-health-2/,'root index.html switcher embed');
  const demoHtml=fs.readFileSync(path.join(ROOT,'demo/final-ui-review.html'),'utf8');
  assert.match(demoHtml,/final-ui-review\.js\?v=20261104-lastknown-1/,'demo page script embed');
  const demo=fs.readFileSync(path.join(ROOT,'demo/final-ui-review.js'),'utf8');
  assert.match(demo,/\.\.\/v2\/weather-luxury\.html\?v=20261104-lastknown-1/,'demo fetches the current weather document');
});

test('temperature trend renders with fewer than seven days after midnight',()=>{
  assert.match(js,/const vals=\(d\.days\|\|\[\]\)\.map\(x=>x\.hi\),n=vals\.length;/);
  assert.match(js,/n>=2&&vals\.every\(Number\.isFinite\)/,'graph requires at least two finite points');
  assert.match(js,/i\*350\/\(n-1\)/,'point x positions scale to the available day count');
  assert.match(js,/i\*100\/\(n-1\)/,'gradient stops scale to the available day count');
});
