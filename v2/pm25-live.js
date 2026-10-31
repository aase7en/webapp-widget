/* Owner-approved PM2.5 display. All values are supplied by the verified parent.
 * 2026 option A: the big number is the latest HOURLY reading; the tier color,
 * badge and scale marker are banded from the GISTDA 24-hour average
 * (pm25Avg24hr) via PM25Tier.classify (1-decimal half-up BEFORE banding).
 * A missing/invalid average never becomes zero: the tier renders grey
 * unavailable and the secondary readout hides, while the hourly number stays. */
(()=>{
'use strict';
const tiers=[
 {id:'blue',status:'ดีมาก',advice:'ทำกิจกรรมได้ตามปกติ',light:'#b4f8ff',dark:'#168ff2',shade:'#035387',glow:'#30d2ffbb'},
 {id:'green',status:'ดี',advice:'กลุ่มเสี่ยงเฝ้าระวังอาการ',light:'#caffbb',dark:'#14b85d',shade:'#05713d',glow:'#22f68abb'},
 {id:'yellow',status:'ปานกลาง',advice:'กลุ่มเสี่ยงลดกิจกรรมกลางแจ้ง',light:'#fff8b2',dark:'#dba912',shade:'#a96d00',glow:'#ffcc37bb'},
 {id:'orange',status:'เริ่มมีผลต่อสุขภาพ',advice:'ลดกิจกรรมกลางแจ้ง สวม N95',light:'#ffdfad',dark:'#f17a25',shade:'#a84008',glow:'#ff9f38bb'},
 {id:'red',status:'มีผลต่อสุขภาพ',advice:'เลี่ยงกลางแจ้ง อยู่ในห้องปลอดฝุ่น',light:'#ffd0ce',dark:'#ec3f47',shade:'#98152a',glow:'#ff4b57bb'}];
const $=s=>document.querySelector(s),board=$('#board'),video=$('video'),poster=$('.scene img');let selected='';
/* Band vocabulary: backend band keys -> 2026 tier keys. A band that maps to
 * something other than the locally derived tier fails closed inside classify
 * (reason 'band-conflict'). */
const VOCAB=new Map([['very_good','blue'],['good','green'],['moderate','yellow'],['unhealthy_sensitive','orange'],['unhealthy','red']]);
const GREY={light:'#cbd8e2',dark:'#778a9b',shade:'#495a69',glow:'#89adbb66'};
const BANDS=[[0,15],[15,25],[25,37.5],[37.5,75],[75,150]];
function tick(){const d=new Date();$('.date').textContent=new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',weekday:'short',day:'numeric',month:'short',year:'2-digit'}).format(d);$('.time').textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit',hour12:false}).format(d)}
function drawHistory(points){
 const ns='http://www.w3.org/2000/svg',g=$('#series');while(g.firstChild)g.removeChild(g.firstChild);if(!Array.isArray(points))points=[];
 const now=Date.now(),start=now-24*3600000;
 let valid=points.filter(p=>p&&typeof p.value==='number'&&Number.isFinite(p.value)&&p.value>=0&&p.value<=1000&&Number.isFinite(Date.parse(p.observedAt))&&Date.parse(p.observedAt)>=start&&Date.parse(p.observedAt)<=now+120000).sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt));
 $('.trend-plot').setAttribute('aria-label','กราฟค่าฝุ่นจริงย้อนหลัง 24 ชั่วโมง ช่วงที่ไม่มีข้อมูลเว้นว่าง');
 const max=Math.max(50,...valid.map(p=>p.value)),groups=[];let group=[];
 for(const p of valid){if(group.length&&(Date.parse(p.observedAt)-Date.parse(group[group.length-1].observedAt)>90*60000||Math.floor(Date.parse(p.observedAt)/3600000)-Math.floor(Date.parse(group[group.length-1].observedAt)/3600000)>1)){groups.push(group);group=[]}group.push(p)}if(group.length)groups.push(group);
 for(const samples of groups){const xy=samples.map(p=>[Math.max(0,Math.min(300,(Date.parse(p.observedAt)-start)/86400000*300)),31-Math.min(1,p.value/max)*27]);if(xy.length>1){let line=xy.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');const area=document.createElementNS(ns,'path');area.setAttribute('d',line+' L'+xy[xy.length-1][0].toFixed(1)+' 35 L'+xy[0][0].toFixed(1)+' 35 Z');area.setAttribute('fill','url(#fill)');g.append(area);const path=document.createElementNS(ns,'path');path.setAttribute('d',line);path.setAttribute('class','trend-line');g.append(path)}for(const [x,y] of xy){const circle=document.createElementNS(ns,'circle');circle.setAttribute('cx',x.toFixed(1));circle.setAttribute('cy',y.toFixed(1));circle.setAttribute('r','1.8');circle.setAttribute('class','point');g.append(circle)}}
}
function setNumber(value){
 const txt=Number.isInteger(value)?String(value):value.toFixed(1);$('.number').textContent=txt;$('.number').style.setProperty('--value-size',txt.length>4?'82px':txt.length>3&&!txt.includes('.')?'90px':txt.length>3&&value>=100?'95px':'112px');const shell=$('.number-shell'),num=$('.number');shell.style.width='max-content';const natural=num.offsetWidth,room=218-$('.unit').offsetWidth;if(natural>0&&room>0){num.style.setProperty('--number-scale',Math.min(1,room/natural));shell.style.width=Math.min(natural,room)+'px'}
}
function render(pm,history){
 const valid=pm&&pm.status==='latest'&&typeof pm.value==='number'&&Number.isFinite(pm.value)&&pm.value>=0&&pm.value<=1000;
 if(!valid){board.classList.add('unavailable');board.dataset.tier='';$('.number').textContent='—';$('.badge').textContent='รอข้อมูล';$('.advice').textContent='ไม่พบข้อมูลล่าสุด';$('.avg-note').hidden=true;$('.scale-arrow').hidden=true;video.pause();drawHistory(history);return}

 const value=Math.round(pm.value*10)/10;setNumber(value); /* big number: hourly, unchanged */
 /* Tier from the 24h average. observedAt is the source-observation time; the
  * module's freshness contract needs `now` whenever observedAt is supplied,
  * so it is passed explicitly (staleAfterMs default 3 h). */
 const avg=(typeof pm.avg24h==='number'&&Number.isFinite(pm.avg24h)&&pm.avg24h>=0)?pm.avg24h:null;
 const cls=avg===null?null:PM25Tier.classify({value:avg,observedAt:pm.observedAt,status:pm.status,unit:pm.unit||'µg/m³',band:pm.band==null?null:pm.band},{now:Date.now(),bandVocabulary:VOCAB});
 const t=cls&&cls.isHealthTier?tiers.find(x=>x.id===cls.key):null;
 if(!t){ /* avg absent/unavailable/historical/conflicted: grey tier, hourly number stays, never zero-filled */
  board.classList.add('unavailable');board.dataset.tier='';
  for(const key of ['light','dark','shade','glow'])board.style.setProperty('--'+key,GREY[key]);
  $('.badge').textContent='รอข้อมูล';$('.advice').textContent='รอค่าเฉลี่ย 24 ชม.';$('.avg-note').hidden=true;$('.scale-arrow').hidden=true;video.pause();drawHistory(history);return;
 }
 const idx=tiers.indexOf(t),band=BANDS[idx];
 board.classList.remove('unavailable');board.dataset.tier=t.id;for(const key of ['light','dark','shade','glow'])board.style.setProperty('--'+key,t[key]);
 $('.badge').textContent=t.status;$('.advice').textContent=t.advice;
 $('.avg-note').hidden=false;$('.avg-note').textContent='เฉลี่ย 24 ชม. '+cls.displayValue.toFixed(1);
 const frac=Math.max(.025,Math.min(.975,(cls.displayValue-band[0])/(band[1]-band[0])));$('.scale-arrow').style.left=20*(idx+frac)+'%';$('.scale-arrow').hidden=false;
 if(selected!==t.id){selected=t.id;poster.src='pm25-media/'+selected+'.jpg';video.classList.remove('ready');video.dataset.fallback='0';if(!matchMedia('(prefers-reduced-motion: reduce)').matches){video.src='pm25-media/'+selected+'-optimized.mp4';video.load()}}
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches)video.play().catch(()=>{});drawHistory(history);
}
video.addEventListener('loadeddata',()=>video.classList.add('ready'));
video.addEventListener('error',()=>{if(selected&&video.dataset.fallback!=='1'&&video.canPlayType('video/webm')){video.dataset.fallback='1';video.src='pm25-media/'+selected+'.webm';video.load();video.play().catch(()=>{})}});
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent||!e.data||e.data.type!=='uth-pm25-live')return;render(e.data.pm25,e.data.history)});
tick();setInterval(tick,15000);
})();
