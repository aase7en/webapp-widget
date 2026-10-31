'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

test('review demo reuses the Weather renderer without its live network bootstrap',()=>{
  const html=fs.readFileSync('v2/weather-luxury.html','utf8');
  const source=fs.readFileSync('v2/weather-luxury.js','utf8');
  const demo=fs.readFileSync('demo/final-ui-review.js','utf8');
  const marker='\nlet pending=false,seq=0,lastGood=null,revalidateTimer=null;';
  const boundary=source.indexOf(marker);
  assert.ok(boundary>0,'Weather renderer boundary must exist');
  assert.equal(source.indexOf(marker,boundary+1),-1,'Weather boundary must be unique');
  assert.match(html,/<script\s+src="weather-luxury\.js(?:\?[^"]*)?"><\/script>/);
  assert.ok(demo.includes("marker='\\nlet pending=false,seq=0,lastGood=null,revalidateTimer=null;'"));
  const renderer=source.slice(0,boundary);
  assert.match(renderer,/function paint\(/);
  assert.match(renderer,/function clock\(/);
  assert.doesNotMatch(renderer,/\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b|sendBeacon\s*\(/,'preview renderer must not call a live provider');
  assert.doesNotMatch(renderer,/<\/script/i,'renderer must remain safe to embed in the review document');
});

test('review page identifies illustrative data and links to the actual PM page',()=>{
  const html=fs.readFileSync('demo/final-ui-review.html','utf8');
  const demo=fs.readFileSync('demo/final-ui-review.js','utf8');
  assert.match(html,/ข้อมูลจำลอง/);
  assert.match(demo,/\.\.\/v2\/pm25-live\.html/);
  assert.match(demo,/กราฟค่าฝุ่นจำลองย้อนหลัง 24 ชั่วโมง/);
  assert.match(demo,/weather-luxury\.html/);
});
