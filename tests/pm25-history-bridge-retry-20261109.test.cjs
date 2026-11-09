'use strict';
// Isolated source-contract test for browser-side JSONP recovery. No real network.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const source=fs.readFileSync('v2/live-widgets.js','utf8');
const begin=source.indexOf("let lastPm={status:'unavailable'},lastHistory=[]");
const end=source.indexOf("const pmFrame=$('#pm-live-frame');",begin);
assert(begin>0&&end>begin);
function harness(){
 const requests=[],posts=[],timers=new Map();let id=0;
 const clock=(fn,ms)=>{const key=++id;timers.set(key,{fn,ms});return key};
 const clear=key=>timers.delete(key);
 const fakeWindow={UthaiLEDRotation:{BACKEND_URL:'https://example.invalid/exec'}};
 const fakeDocument={createElement:()=>({src:'',onerror:null,remove(){this.wasRemoved=true}}),head:{appendChild(script){requests.push(script)}}};
 const fake$=s=>s==='#pm-live-frame'?{contentWindow:{postMessage(data){posts.push({status:data.historyStatus,points:data.history.length,values:data.history.map(x=>x.value)})}}}:null;
 const factory=Function('$','document','window','location','setTimeout','clearTimeout',source.slice(begin,end)+';return {refreshPmHistory,inspect:()=>({historyState,historyFailures,historyActive,lastHistory:lastHistory.slice()})}');
 const internals=factory(fake$,fakeDocument,fakeWindow,{origin:'https://example.invalid'},clock,clear);
 const callback=request=>new URL(request.src).searchParams.get('callback');
 return {requests,posts,timers,internals,fakeWindow,callback,tick(ms){const found=[...timers].find(([key,t])=>t.ms===ms);assert(found,'missing retry at '+ms+'ms');timers.delete(found[0]);found[1].fn()}};
}
test('one 9s timeout failure schedules 8s retry, then valid history reaches PM iframe',async()=>{
 const h=harness();const op=h.internals.refreshPmHistory();assert.equal(h.requests.length,1);
 h.requests[0].onerror();await op;
 assert.deepEqual(h.posts.at(-1),{status:'unavailable',points:0,values:[]});
 assert([...h.timers.values()].some(x=>x.ms===8000));
 h.tick(8000);assert.equal(h.requests.length,2);
 const cb=h.callback(h.requests[1]),value={value:13.4,observedAt:new Date().toISOString()};
 h.fakeWindow[cb]({schema:1,status:'ok',location:'uthai',points:[value]});
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(h.posts.at(-1),{status:'ok',points:1,values:[13.4]});
 assert.equal(h.internals.inspect().historyFailures,0);
});
test('subsequent transport failures retain known verified point rather than erase graph',async()=>{
 const h=harness(),point={value:26.1,observedAt:new Date().toISOString()};
 let op=h.internals.refreshPmHistory();h.fakeWindow[h.callback(h.requests[0])]({schema:1,status:'ok',location:'uthai',points:[point]});await op;
 assert.equal(h.internals.inspect().lastHistory.length,1);
 op=h.internals.refreshPmHistory();h.requests[1].onerror();await op;
 assert.equal(h.internals.inspect().historyState,'retained');
 assert.deepEqual(h.internals.inspect().lastHistory,[point]);
 assert.deepEqual(h.posts.at(-1),{status:'retained',points:1,values:[26.1]});
 assert([...h.timers.values()].some(x=>x.ms===8000));
});
test('successful empty history is reported as empty, never filled from latest PM number',async()=>{
 const h=harness(),op=h.internals.refreshPmHistory();h.fakeWindow[h.callback(h.requests[0])]({schema:1,status:'ok',location:'uthai',points:[]});await op;
 assert.deepEqual(h.posts.at(-1),{status:'empty',points:0,values:[]});
 assert.equal(h.timers.size,0);
});

test('retry backoff is bounded and does not spin indefinitely on persistent failure',async()=>{
 const h=harness(),op=h.internals.refreshPmHistory();
 h.requests.at(-1).onerror();await op;
 for(const wait of [8000,20000,60000]){
  h.tick(wait);h.requests.at(-1).onerror();
  await new Promise(resolve=>setImmediate(resolve));
 }
 assert.equal(h.requests.length,4,'initial + three bounded retries only');
 assert.equal(h.timers.size,0);
 assert.equal(h.internals.inspect().historyState,'unavailable');
 assert.equal(h.internals.inspect().historyFailures,3);
});
