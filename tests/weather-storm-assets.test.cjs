"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const asset=name=>path.join(root,"v2","weather-assets",name);
const read=filename=>fs.readFileSync(path.join(root,filename),"utf8");
const conditions=["rain","thunderstorm","night-rain","night-thunderstorm"];
const SIGNATURE=Buffer.from([137,80,78,71,13,10,26,10]);
function inspectPng(file) {
 const buf=fs.readFileSync(file);
 assert.ok(buf.subarray(0,8).equals(SIGNATURE),"valid PNG/APNG signature: "+file);
 let pos=8,animated=null,frames=0,durations=[],dimensions;
 while(pos+12<=buf.length){
  const len=buf.readUInt32BE(pos),type=buf.subarray(pos+4,pos+8).toString("ascii");
  const data=pos+8;
  assert.ok(pos+len+12<=buf.length,"valid PNG chunk bounds");
  if(type==="IHDR")dimensions=[buf.readUInt32BE(data),buf.readUInt32BE(data+4)];
  if(type==="acTL")animated={frames:buf.readUInt32BE(data),plays:buf.readUInt32BE(data+4)};
  if(type==="fcTL"){
   frames++;
   const numerator=buf.readUInt16BE(data+20);
   const denominator=buf.readUInt16BE(data+22)||100;
   durations.push(numerator*1000/denominator);
  }
  pos+=len+12;
  if(type==="IEND")break;
 }
 return {dimensions,animated,frames,durations,bytes:buf.length};
}
test("Rain and storm animations retain 128px/96-frame APNG compatibility",()=>{
 for(const name of conditions){
  const result=inspectPng(asset(name+".apng"));
  assert.deepEqual(result.dimensions,[128,128],name+" dimensions");
  assert.deepEqual(result.animated,{frames:96,plays:0},name+" APNG loop");
  assert.equal(result.frames,96,name+" fcTL count");
  assert.ok(result.durations.every(x=>Math.abs(x-50)<.1),name+" duration 50 ms");
  assert.ok(result.bytes>100000&&result.bytes<1800000,name+" file-size budget");
 }
});
test("Reduced-motion posters exist and match sprite canvas",()=>{
 for(const name of conditions){
  const poster=inspectPng(asset(name+"-led-poster.png"));
  assert.deepEqual(poster.dimensions,[128,128],name+" poster");
  assert.equal(poster.animated,null,name+" static PNG (not APNG)");
  assert.ok(poster.bytes<100000,name+" poster size");
 }
});
test("Selected animated conditions receive a scoped cache-buster; other weather conditions remain unchanged",()=>{
 const js=read("v2/weather-luxury.js");
 const html=read("v2/weather-luxury.html");
 const css=read("v2/weather-hybrid-live.css");
 const display=read("v2/index.html");
 const outer=read("index.html");
 assert.match(js,/rain','thunderstorm','night-rain','night-thunderstorm/);
 assert.match(js,/\.apng'.*\?v=20261106-storm-clarity-1/);
 assert.match(js,/-poster\.png'.*\?v=20261106-storm-clarity-1/);
 assert.match(html,/weather-luxury\.js\?v=20261109-compact-1/);
 assert.match(html,/weather-hybrid-live\.css\?v=20261109-icons-2/);
 assert.match(display,/weather-luxury\.html\?v=20261109-icons-2/);
 assert.match(outer,/v2\/index\.html\?display=led&amp;v=20261109-pm24-2/);
 assert.match(display,/pm25-live\.html\?v=20261109-pm24-2/);
 assert.match(display,/water-luxury-live\.html\?v=20261108-label-1/);
 assert.match(css,/\.board\.layout-hybrid \.icon\[data-condition="rain"\]/);
 assert.match(css,/\.board\.layout-hybrid \.icon\[data-condition="night-thunderstorm"\]/);
 assert.doesNotMatch(css,/\.board\.layout-hybrid \.clock/);
});
test("Deterministic source generates large rain and explicit lightning flashes",()=>{
 const source=read("scripts/build-weather-storm-motion.py");
 assert.match(source,/def rainfall_layer\(frame, storm=False\)/);
 assert.match(source,/def lightning_layer\(frame, dark=False\)/);
 assert.match(source,/bursts = \(\(10, 15\), \(33, 39\), \(62, 68\), \(83, 87\)\)/);
 assert.match(source,/FRAMES = 96/);
 assert.match(source,/FRAME_MS = 50/);
 assert.doesNotMatch(source,/requests|urllib|http\.client|random\.random/);
});
