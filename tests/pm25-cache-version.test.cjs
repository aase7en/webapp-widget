'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('PM frame and its script share one cache version; the root switcher embed is versioned independently',()=>{
 const root=fs.readFileSync('index.html','utf8'),index=fs.readFileSync('v2/index.html','utf8'),page=fs.readFileSync('v2/pm25-live.html','utf8');
 const outer=root.match(/v2\/index\.html\?display=led&amp;v=([\w-]+)/),frame=index.match(/pm25-live\.html\?v=([\w-]+)/),script=page.match(/pm25-live\.js\?v=([\w-]+)/);
 assert.ok(outer&&frame&&script,'all three resources must be versioned');assert.equal(frame[1],script[1]);
});
