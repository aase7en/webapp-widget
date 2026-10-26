const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
function boot(){
 const src=fs.readFileSync(path.join(root,'v2/weather-advisories.js'),'utf8');
 const context=vm.createContext({window:{},Number,Array});
 vm.runInContext(src,context,{filename:'weather-advisories.js'});
 return context.window.UthWeatherAdvisories.evaluate;
}
const wx=(code,day=true)=>({status:'model_latest',weatherCode:code,isDay:day});
const forecast=(...codes)=>({status:'model_forecast',hours:codes.map(weatherCode=>({weatherCode}))});
test('no upstream reading never claims safe conditions or alerts',()=>{
 const f=boot();assert.equal(f(null,null,null).kind,'unavailable');
 assert.equal(f({status:'unavailable',weatherCode:95},forecast(95),50).kind,'unavailable');
 assert.equal(f(wx(null),forecast(95),44).kind,'unavailable');
 assert.equal(f(wx(0),forecast(),null).kind,'unavailable');
 assert.equal(f(wx(0),forecast(0),null).kind,'none');
});
test('current thunderstorm takes priority and suggests actual indoor shelter',()=>{
 const d=boot()(wx(95),forecast(65),43);
 assert.equal(d.kind,'storm');assert.match(d.label,/ฟ้าผ่า/);assert.match(d.line1,/พายุ/);
 assert.match(d.line2,/ปลอดภัย/);assert.match(d.source,/ไม่ใช่ประกาศเตือนภัยอย่างเป็นทางการ/);
});
test('forecast storm is forecast, not current lightning',()=>{
 const d=boot()(wx(0),forecast(95),30);
 assert.equal(d.kind,'storm');assert.match(d.line1,/คาด/);assert.match(d.description,/พยากรณ์/);
});
test('heat advice relies on calculated heat index, and separates day/night precautions',()=>{
 const f=boot();
 assert.equal(f(wx(0,true),forecast(),39.7).kind,'heat');
 assert.match(f(wx(0,true),forecast(),35).line1,/แดด/);
 assert.doesNotMatch(f(wx(0,false),forecast(),35).line1,/แดด/);
 assert.equal(f(wx(0,true),forecast(),40).kind,'heat-high');
 assert.equal(f(wx(0),forecast(),null).kind,'unavailable');
 assert.equal(f(wx(0),forecast(0),null).kind,'none');
});
test('rain, fog and unknown conditions fail closed',()=>{
 const f=boot();
 assert.equal(f(wx(65),forecast(),null).kind,'rain');
 assert.equal(f(wx(0),forecast(82),null).kind,'rain');
 assert.equal(f(wx(45),forecast(),null).kind,'fog');
 assert.equal(f(wx(0),forecast(48),null).kind,'fog');
 assert.equal(f(wx(53),forecast(),null).kind,'rain');
 assert.equal(f(wx(999),forecast(95),null).kind,'unavailable');
});
test('glass rim is translucent, behind labels, narrow and reduced highlights',()=>{
 const h=fs.readFileSync(path.join(root,'v2/index.html'),'utf8');
 const w=fs.readFileSync(path.join(root,'v2/weather.html'),'utf8');
 assert.match(h,/#water \.water-station\[data-water="ok"\]\[data-risk="critical"\] \.spill-sheet/);
 assert.match(h,/\.stage\{border:1px solid transparent/);
 assert.match(w,/\.led\{border:1px solid transparent/);
 assert.match(w,/\.led \.clock,\.led \.current,\.led \.hour,\.led \.warning\{position:relative;z-index:2\}/);
 assert.match(h,/\.stage \.clock,\.stage \.seg\{position:relative;z-index:2\}/);
});
test('replacement Water Luxury is the sole scene; old spillway station DOM is absent',()=>{
 const parent=fs.readFileSync(path.join(root,'v2/index.html'),'utf8');
 const child=fs.readFileSync(path.join(root,'v2/water-luxury-live.html'),'utf8');
 const css=fs.readFileSync(path.join(root,'v2/water-luxury-live.css'),'utf8');
 assert.equal((parent.match(/class="spill-sheet"/g)||[]).length,0);
 assert.doesNotMatch(parent,/id="water"|id="s1"|id="s2"|class="water-station"/);
 assert.match(parent,/src="\.\/water-luxury-live\.html"/);
 assert.equal((parent.match(/class="ledframe water-luxury-live-frame"/g)||[]).length,1);
 assert.match(child,/class="foam-front"/);
 assert.match(css,/foam-front/);
 assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
});
test('caution copy stays educational and does not falsely claim official alert',()=>{
 const w=fs.readFileSync(path.join(root,'v2/weather.html'),'utf8');
 const js=fs.readFileSync(path.join(root,'v2/weather-live.js'),'utf8');
 assert.match(w,/weather-advisories\.js/);
 assert.match(js,/UthWeatherAdvisories\.evaluate\(weather,f,hi\)/);
 assert.match(js,/UthWeatherAdvisories\.evaluate\(null,null,null\)/);
 assert.match(w,/ไม่ใช่ประกาศเตือนภัยอย่างเป็นทางการ/);
});
