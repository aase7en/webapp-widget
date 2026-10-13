'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const w=require('../portable.js');
test('coordinates validate both ranges and accept zero',()=>{
 assert.equal(w.parseLocation('?lat=14.3'),null);
 assert.equal(w.parseLocation('?lat=&lon=100'),null);
 assert.equal(w.parseLocation('?lat=91&lon=100'),null);
 assert.deepEqual(w.parseLocation('?lat=0&lon=0&name=Central&layout=cards'),{lat:0,lon:0,name:'Central',cards:true,compact:false});
});
test('pm average validates 24 complete consecutive hourly samples',()=>{
 const iso=i=>new Date(Date.UTC(2026,9,8,4)+i*3600000).toISOString().slice(0,16);
 const data={current:{time:iso(23)},hourly:{time:Array.from({length:24},(_,i)=>iso(i)),pm2_5:Array(24).fill(0)}};
 assert.equal(w.pm24HourAverage(data),0);
 data.hourly.pm2_5[1]=null;assert.equal(w.pm24HourAverage(data),null);
 data.hourly.pm2_5[1]=24;assert.equal(w.pm24HourAverage(data),1);
 data.hourly.time[2]=data.hourly.time[1];assert.equal(w.pm24HourAverage(data),null);
});
test('model-derived heat index rejects missing humidity',()=>{
 assert.ok(w.heatIndexCelsius(32,70)>39);
 assert.equal(w.heatIndexCelsius(32,null),null);
 assert.equal(w.heatIndexCelsius(32,120),null);
});
test('flood adapter cannot report LOW without valid recent timestamp and source',()=>{
 assert.equal(w.normalizedFlood({status:'AVAILABLE',risk_level:null,observed_at:new Date().toISOString(),source:'X'}),null);
 assert.equal(w.normalizedFlood({status:'AVAILABLE',risk_level:'LOW',observed_at:'2022-01-01T00:00:00Z',source:'X'}),null);
 assert.equal(w.normalizedFlood({status:'AVAILABLE',risk_level:'LOW',observed_at:new Date().toISOString(),source:null}),null);
 assert.equal(w.normalizedFlood({status:'AVAILABLE',risk_level:'WATCH',observed_at:new Date().toISOString(),source:'verified'}).value,'เฝ้าระวัง');
});

test('PM thresholds keep exact 15 and 25 in their inclusive class',()=>{
 assert.equal(w.classify(15,[{max:15,label:'good'},{max:25,label:'next'}],true).label,'good');
 assert.equal(w.classify(25,[{max:15,label:'good'},{max:25,label:'next'}],true).label,'next');
});

test('portable 40-pixel embed is opt-in',()=>{
 assert.equal(w.parseLocation('?lat=14&lon=100&compact=1').compact,true);
});

test('GISTDA location adapter needs verifiable fresh 24-hour average, not the instant value',()=>{
 const now=new Date();
 const date=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok', day:'numeric',month:'long',year:'numeric'}).format(now);
 const time=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit',hour12:false}).format(now);
 const live={status:200,data:{pm25:200,pm25Avg24hrs:0,datetimeEng:{dateEng:date,timeEng:time}}};
 const card=w.gistdaPmTile(live);
 assert.ok(card,'fresh status=200 with complete 24h average should display');
 assert.equal(card.value,'0.0 µg/m³');
 assert.match(card.note,/GISTDA CheckPhoon/);
 assert.equal(card.type,'MODELLED');
 assert.equal(w.gistdaPmTile({...live,status:404}),null);
 assert.equal(w.gistdaPmTile({status:200,data:{...live.data,pm25Avg24hrs:null}}),null);
 assert.equal(w.gistdaPmTile({status:200,data:{...live.data,pm25Avg24hrs:'0'}}),null);
 assert.equal(w.gistdaPmTile({status:200,data:{...live.data,datetimeEng:{dateEng:'9 October 2020',timeEng:'12:00'}}}),null);
});
test('GISTDA coordinate request uses lng, never exposes a secret or maps lon incorrectly',async()=>{
 const before=global.fetch;
 const seen=[];
 const now=new Date();
 const date=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',day:'numeric',month:'long',year:'numeric'}).format(now);
 const time=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit',hour12:false}).format(now);
 global.fetch=async url=>{
   const u=new URL(url);
   seen.push(u);
   if(u.hostname==='pm25.gistda.or.th'){
     return {ok:true,json:async()=>({status:200,data:{pm25:9,pm25Avg24hrs:10,datetimeEng:{dateEng:date,timeEng:time}}})};
   }
   if(u.hostname==='api.open-meteo.com') return {ok:true,json:async()=>({current:{temperature_2m:31,relative_humidity_2m:70,time:'2026-10-09T12:00'}})};
   throw Error('Unexpected remote provider '+u.hostname);
 };
 try {
   const tiles=await w.fetchTiles({lat:14.36147,lon:100.64424},'');
   assert.equal(tiles.length,3);
   assert.match(tiles[0].note,/GISTDA CheckPhoon/);
   assert.equal(tiles[2].type,'UNAVAILABLE');
   assert.equal(seen.filter(u=>u.hostname==='pm25.gistda.or.th').length,1);
   const gust=seen.find(u=>u.hostname==='pm25.gistda.or.th');
   assert.equal(gust.searchParams.get('lng'),'100.64424');
   assert.equal(gust.searchParams.has('lon'),false);
   assert.equal(gust.searchParams.has('token'),false);
 } finally {global.fetch=before;}
});
test('GISTDA backend failure does not suppress independent heat and flood unavailable',async()=>{
 const before=global.fetch;
 global.fetch=async url=>{
   const u=new URL(url);
   if(u.hostname==='pm25.gistda.or.th') throw Error('GISTDA offline');
   if(u.hostname==='air-quality-api.open-meteo.com') throw Error('CAMS offline');
   if(u.hostname==='api.open-meteo.com') return {ok:true,json:async()=>({current:{temperature_2m:31,relative_humidity_2m:70,time:'2026-10-09T12:00'}})};
   throw Error('Unexpected provider');
 };
 try {
   const tiles=await w.fetchTiles({lat:14,lon:100},'');
   assert.equal(tiles[0].type,'UNAVAILABLE');
   assert.equal(tiles[1].type,'DERIVED');
   assert.equal(tiles[2].type,'UNAVAILABLE');
 } finally {global.fetch=before;}
});
