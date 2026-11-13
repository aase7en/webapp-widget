'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const file=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=file('v2/weather-luxury.html');
const render=file('v2/weather-hybrid-live.js');
const css=file('v2/weather-hybrid-live.css');
const bridge=file('v2/weather-luxury.js');
const index=file('v2/index.html'),entry=file('index.html');

test('Production Weather uses existing validated snapshot + unchanged live model pipeline',()=>{
 assert.match(html,/src="weather-snapshot\.js"/);
 assert.match(html,/weather-hybrid-live\.js\?v=20261109-compact-1/);
 assert.match(html,/weather-hybrid-live\.css\?v=20261109-icons-2/);
 assert.match(html,/weather-luxury\.js\?v=20261113-led-contrast-1/);
 assert.match(bridge,/UthWeatherSnapshot\.parse/);
 assert.match(bridge,/UthWeatherHybrid\?\.render/);
 assert.match(bridge,/fallbackTransport\(\)/);
 assert.match(bridge,/LAST_GOOD_KEY/);
 assert.doesNotMatch(render,/SIMULATED\s*\/\s*LOCAL FIXTURE|const cases=|Math\.random\(/);
 assert.doesNotMatch(render,/\bfetch\s*\(|XMLHttpRequest|script\.google\.com|raw\.githubusercontent/);
});

test('Only Weather embed changes; main rotation and PM/Water iframe remain routed',()=>{
 assert.match(index,/weather-luxury\.html\?v=20261113-led-contrast-1/);
 assert.match(index,/pm25-live\.html\?v=20261113-led-contrast-1/);
 assert.match(index,/water-luxury-live\.html\?v=20261108-label-1/);
 assert.match(entry,/v2\/index\.html\?display=led&amp;v=20261113-led-contrast-1/);
 assert.match(index,/setInterval\(\(\)=>\{sections\[current\]/);
});

test('Luxury clock and native 432x40 geometry remain on original DOM',()=>{
 assert.match(html,/class="clock"/);
 assert.match(html,/id="date"/);
 assert.match(html,/id="time"/);
 assert.match(html,/transform:scale\(0\.3333333333\)/);
 assert.match(html,/width:1296px;height:120px/);
 assert.match(css,/\.board\.layout-hybrid \.temp/);
 assert.match(css,/\.board\.layout-hybrid \.icon/);
 assert.match(css,/\.board\.layout-hybrid \.graph\{display:none!important\}/);
 assert.doesNotMatch(css,/\.board\.layout-hybrid \.clock/);
});

test('Production 4+3 page switching uses condition codes from parsed daily model',()=>{
 assert.match(render,/range=page===0\?\[0,1,2,3\]:\[4,5,6\]/);
 assert.match(render,/const timer=setInterval\(rotate,9000\)/);
 assert.match(render,/pictogram\(x\?\.ico\)/);
 assert.match(render,/hi,lo,rain|x\?\.hi|x\?\.lo|x\?\.p/);
 assert.match(render,/temperatureC|humidityPct|rainPct/);
 assert.match(render,/source:current\?\.provenance/);
 assert.match(render,/observedAt:current\?\.observedAt/);
});

test('Unavailable and historical model values must remain honest and visible',()=>{
 assert.match(render,/Number\.isFinite\(v\)\?Math\.round\(v\)\+s:'—'/);
 assert.match(render,/freshness==='HISTORICAL'/);
 assert.doesNotMatch(render,/hybrid-status|status\.textContent/);
 assert.match(render,/available.length\?'':'พยากรณ์รายวันไม่พร้อม'/);
 assert.match(render,/data\.provenance|d\.provenance/);
 assert.match(render,/Asia\/Bangkok/);
 assert.match(css,/\.board \.clock \.source-at:not\(\[hidden\]\)/);
 assert.doesNotMatch(css,/\.hybrid-status/);
 assert.match(css,/#scene:not\(\[src\]\)/);
});

test('Crisp icon metrics preserve color without glowing text or bitmap upscaling',()=>{
 assert.match(css,/\.hybrid-value\{[^}]*text-shadow:none\}/);
 assert.match(css,/\.hybrid-metric svg\{[^}]*filter:none\}/);
 assert.match(css,/#weather-hybrid-panel|\.hybrid-panel/);
 assert.match(css,/html\.weather-hybrid-ready \.hybrid-panel\{display:grid\}/);
 assert.match(bridge,/console\.error\("weather-hybrid fallback",error\)/);
});

test('°C stays compact and the complete Luxury border overlays the nested hybrid panel',()=>{
 assert.match(html,/<section class="hybrid-panel"[^>]*><\/section><\/section>/,'hybrid panel is inside original Luxury board, not a sibling covering its border');
 assert.match(css,/\.board \.temp small,\.board\.layout-hybrid \.temp small\{[\s\S]*?margin-left:7px;/,'°C visibly follows number with a positive gap');
 assert.match(css,/-webkit-text-fill-color:#e6faff/,'solid degree symbol never inherits gradient transparent fill');
 assert.match(css,/\.board\.layout-hybrid \.temp\{transform:translateX\(-81px\)/,'degree cleared from hybrid panel');
 assert.match(css,/\.board \.hybrid-panel\{[^}]*left:606px;[^}]*top:3px;[^}]*transform:scale\(3\);/,'native panel geometry unchanged after nesting');
 assert.match(html,/\.board:after\{[^}]*z-index:9\}/,'original border remains top paint layer');
});
