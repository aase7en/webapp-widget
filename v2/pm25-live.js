/* Owner-approved PM2.5 display. All values are supplied by the verified parent.
 * 2026 option A: the big number is the latest HOURLY reading; the badge and scene are banded from the GISTDA 24-hour average
 * (pm25Avg24hr); number color and scale marker follow the hourly reading.
 * A missing/invalid average never becomes zero: the tier renders grey
 * unavailable and the secondary readout hides, while the hourly number stays. */
(()=>{
'use strict';
const tiers=[
 {id:'blue',status:'ดีมาก',advice:'ทำกิจกรรมกลางแจ้งได้ตามปกติ',light:'#b4f8ff',dark:'#168ff2',shade:'#035387',glow:'#30d2ffbb'},
 {id:'green',status:'ดี',advice:'ทำกิจกรรมได้ตามปกติ ผู้ไวต่อฝุ่นสังเกตอาการ',light:'#caffbb',dark:'#14b85d',shade:'#05713d',glow:'#22f68abb'},
 {id:'yellow',status:'ปานกลาง',advice:'ผู้ไวต่อฝุ่นควรลดเวลาอยู่นอกอาคาร',light:'#fff8b2',dark:'#dba912',shade:'#a96d00',glow:'#ffcc37bb'},
 {id:'orange',status:'เริ่มมีผลต่อสุขภาพ',advice:'ลดกิจกรรมกลางแจ้ง สวม N95 เมื่อจำเป็น',light:'#ffdfad',dark:'#f17a25',shade:'#a84008',glow:'#ff9f38bb'},
 {id:'red',status:'มีผลต่อสุขภาพ',advice:'หลีกเลี่ยงกิจกรรมกลางแจ้ง อยู่ในอาคารอากาศสะอาด',light:'#ffd0ce',dark:'#ec3f47',shade:'#98152a',glow:'#ff4b57bb'}];
const $=s=>document.querySelector(s),board=$('#board'),video=$('video'),poster=$('.scene img');let selected='';
/* Band vocabulary: backend band keys -> 2026 tier keys. A band that maps to
 * something other than the locally derived tier fails closed inside classify
 * (reason 'band-conflict'). */
const VOCAB=new Map([['very_good','blue'],['good','green'],['moderate','yellow'],['unhealthy_sensitive','orange'],['unhealthy','red']]);
const GREY={light:'#cbd8e2',dark:'#778a9b',shade:'#495a69',glow:'#89adbb66'};
const BANDS=[[0,15],[15,25],[25,37.5],[37.5,75],[75,150]];
function tick(){const d=new Date();$('.date').textContent=new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',weekday:'short',day:'numeric',month:'short',year:'2-digit'}).format(d);$('.time').textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit',hour12:false}).format(d)}
function bandOf(v){const r=typeof PM25Tier!=='undefined'&&PM25Tier&&PM25Tier.tierFor&&PM25Tier.tierFor(v,{});return r&&r.isHealthTier?tiers.find(x=>x.id===r.key)||GREY:GREY}
// Non-linear visual-only Y axis: expand 15–35 µg/m³, compress both tails.
// The plotted data values, observed timestamps and health tier thresholds never change.
function pmHistoryY(value, max){
 const warp=v=>Math.asinh((v-25)/5);
 const bottom=warp(0),top=warp(max);
 return 35-((warp(Math.max(0,Math.min(max,value)))-bottom)/(top-bottom))*31.5;
}
function drawHistory(points,historyStatus){
 const ns='http://www.w3.org/2000/svg',g=$('#series');while(g.firstChild)g.removeChild(g.firstChild);if(!Array.isArray(points))points=[];
 const now=Date.now(),start=now-24*3600000;
 const valid=points.filter(p=>p&&typeof p.value==='number'&&Number.isFinite(p.value)&&p.value>=0&&p.value<=1000&&typeof p.observedAt==='string'&&Number.isFinite(Date.parse(p.observedAt))&&Date.parse(p.observedAt)>=start&&Date.parse(p.observedAt)<=now+120000).sort((a,b)=>Date.parse(a.observedAt)-Date.parse(b.observedAt));
 const note=$('#history-note');
 if(note){
  const message=valid.length?(historyStatus==='retained'?'ข้อมูลย้อนหลังเดิม':''):
   historyStatus==='loading'?'กำลังโหลดประวัติ':
   historyStatus==='empty'||historyStatus==='ok'?'ไม่มีข้อมูลใน 24 ชม.':'ยังโหลดประวัติไม่ได้';
  note.hidden=!message;note.textContent=message;
 }

 $('.trend-plot').setAttribute('aria-label','กราฟค่าฝุ่นจริงย้อนหลัง 24 ชั่วโมง เชื่อมจุดค่าที่วัดได้ต่อเนื่อง สีเส้นและพื้นที่ใต้เส้นต่อเนื่องทั้งกราฟ ไล่ตามค่าฝุ่นจริงแต่ละจุด (น้ำเงินดีมาก เขียวดี เหลืองปานกลาง ส้มเริ่มมีผลต่อสุขภาพ แดงมีผลต่อสุขภาพ) เมื่อข้อมูลขาดหายเส้นทึบเชื่อมเฉพาะค่าที่มีจริงเพื่อให้ดูแนวโน้ม ไม่ใช่ค่าฝุ่นที่วัดได้ระหว่างจุด ไม่มีการสร้างค่าฝุ่นใหม่ในช่วงดังกล่าว สเกลแนวตั้งไม่เชิงเส้นเพื่อขยายความแตกต่างช่วง 15–35 ไมโครกรัมต่อลูกบาศก์เมตร');
 const max=Math.max(50,...valid.map(p=>p.value));
 const xy=valid.map(p=>{const t=Date.parse(p.observedAt);return {t,x:Math.max(0,Math.min(300,(t-start)/86400000*300)),y:pmHistoryY(p.value,max),c:bandOf(p.value).dark}});
 let host=document.querySelector('#pm25-segs');if(!host){host=document.createElementNS(ns,'g');host.setAttribute('id','pm25-segs');(document.querySelector('defs')||g).append(host)}while(host.firstChild)host.removeChild(host.firstChild);
 for(let i=1;i<xy.length;i++){
  const a=xy[i-1],b=xy[i],gap=b.t-a.t>90*60000||Math.floor(b.t/3600000)-Math.floor(a.t/3600000)>1;
  const id='pm25-seg-'+(i-1);
  const gr=document.createElementNS(ns,'linearGradient');gr.setAttribute('id',id);
  gr.setAttribute('gradientUnits','userSpaceOnUse');gr.setAttribute('x1',a.x.toFixed(1));gr.setAttribute('x2',b.x.toFixed(1));
  for(const [o,c] of [[0,a.c],[1,b.c]]){const st=document.createElementNS(ns,'stop');st.setAttribute('offset',o);st.setAttribute('stop-color',c);gr.append(st)}host.append(gr);

  // Shade by the SAME distance below every observed line, including peaks.
  // Narrow translucent ribbons share endpoints, avoiding adjacent SVG masks
  // whose different angles caused visible alternating vertical color bars.
  const area=document.createElementNS(ns,'g');
  area.setAttribute('class',gap?'trend-area trend-area-gap':'trend-area');
  area.setAttribute('fill','url(#'+id+')');area.setAttribute('fill-opacity','.96');
  if(gap)area.setAttribute('data-gap','true');
  for(let depth=0;depth<36;depth+=1.2){
   const topA=Math.min(39,a.y+depth),topB=Math.min(39,b.y+depth);
   const endA=Math.min(39,a.y+depth+1.2),endB=Math.min(39,b.y+depth+1.2);
   if(topA>=39&&topB>=39)break;
   const ribbon=document.createElementNS(ns,'path');
   ribbon.setAttribute('d','M'+a.x.toFixed(1)+' '+topA.toFixed(2)+' L'+b.x.toFixed(1)+' '+topB.toFixed(2)+' L'+b.x.toFixed(1)+' '+endB.toFixed(2)+' L'+a.x.toFixed(1)+' '+endA.toFixed(2)+' Z');
   const alpha=.96*Math.exp(-Math.pow((depth+.6)/11.5,1.4));
   ribbon.setAttribute('fill-opacity',alpha.toFixed(3));
   area.append(ribbon);
  }
  g.append(area);
  // Constant-width solid stroke (including bridges across missing hours).
  // A data-gap marker keeps missingness testable; only the two real endpoints
  // are measurements and the bridge never creates synthetic observations.
  const line=document.createElementNS(ns,'path');
  line.setAttribute('d','M'+a.x.toFixed(1)+' '+a.y.toFixed(1)+' L'+b.x.toFixed(1)+' '+b.y.toFixed(1));
  line.setAttribute('class',gap?'trend-line trend-gap':'trend-line');
  line.style.setProperty('stroke','url(#'+id+')');if(gap)line.setAttribute('data-gap','true');g.append(line);
 }
 /* Tiny luminous reading points. Each real observation gets one faint
    colored halo and a smaller crisp core; no extra synthetic samples. */
 for(const p of xy){
  const halo=document.createElementNS(ns,'circle');halo.setAttribute('cx',p.x.toFixed(1));halo.setAttribute('cy',p.y.toFixed(1));halo.setAttribute('r','4.0');halo.setAttribute('class','point-halo');halo.style.setProperty('fill',p.c);g.append(halo);
  const circle=document.createElementNS(ns,'circle');circle.setAttribute('cx',p.x.toFixed(1));circle.setAttribute('cy',p.y.toFixed(1));circle.setAttribute('r','1.4');circle.setAttribute('class','point');circle.style.setProperty('fill',p.c);circle.style.setProperty('--point-light',p.c);g.append(circle);
 }
}
function setNumber(value){
 const txt=Number.isInteger(value)?String(value):value.toFixed(1);$('.number').textContent=txt;$('.number').style.setProperty('--value-size',txt.length>4?'82px':txt.length>3&&!txt.includes('.')?'90px':txt.length>3&&value>=100?'95px':'100px');const shell=$('.number-shell'),num=$('.number');shell.style.width='max-content';const natural=num.offsetWidth,room=218-$('.unit').offsetWidth;if(natural>0&&room>0){num.style.setProperty('--number-scale',Math.min(1,room/natural));shell.style.width=Math.min(natural,room)+'px'}
 // The main PM reading can be 3-4 digits. Protect the unit from the chart:
 // default 674 board px expands the chart 30px, while large readings move
 // its left edge only as far right as needed (12 board px/4 LED px clearance).
 // The chart's right edge and the approved warning badge never move.
 let chartLeft=674,unit=$('.unit');
 if(typeof board.getBoundingClientRect==='function'&&typeof unit.getBoundingClientRect==='function'){
  const boardRect=board.getBoundingClientRect(),scale=board.offsetWidth>0?boardRect.width/board.offsetWidth:1;
  const unitRight=(unit.getBoundingClientRect().right-boardRect.left)/scale;
  if(Number.isFinite(unitRight))chartLeft=Math.max(674,Math.ceil(unitRight+12));
 }
 board.style.setProperty('--pm-chart-left',chartLeft+'px');
}
function render(pm,history,historyStatus){
 const valid=pm&&pm.status==='latest'&&typeof pm.value==='number'&&Number.isFinite(pm.value)&&pm.value>=0&&pm.value<=1000;
 if(!valid){board.style.setProperty('--pm-chart-left','674px');board.classList.add('unavailable');board.dataset.tier='';for(const key of ['light','dark','glow'])board.style.setProperty('--number-'+key,GREY[key]);$('.number').textContent='—';$('.badge').textContent='รอข้อมูล';$('.advice').textContent='ไม่พบข้อมูลล่าสุด';$('.avg-note').hidden=true;$('.scale-arrow').hidden=true;video.pause();drawHistory(history,historyStatus);return}

 const value=Math.round(pm.value*10)/10;setNumber(value); /* big number: hourly, unchanged */
 /* Tier from the 24h average. observedAt is the source-observation time; the
  * module's freshness contract needs `now` whenever observedAt is supplied,
  * so it is passed explicitly (staleAfterMs default 3 h). */
 const avg=(typeof pm.avg24h==='number'&&Number.isFinite(pm.avg24h)&&pm.avg24h>=0)?pm.avg24h:null;
 const cls=avg===null?null:PM25Tier.classify({value:avg,observedAt:pm.observedAt,status:pm.status,unit:pm.unit||'µg/m³',band:pm.band==null?null:pm.band},{now:Date.now(),bandVocabulary:VOCAB});
 const t=cls&&cls.isHealthTier?tiers.find(x=>x.id===cls.key):null;
 if(!t){ /* avg absent/unavailable/historical/conflicted: grey tier, hourly number stays, never zero-filled */
  board.classList.add('unavailable');board.dataset.tier='';
  for(const key of ['light','dark','shade','glow'])board.style.setProperty('--'+key,GREY[key]);for(const key of ['light','dark','glow'])board.style.setProperty('--number-'+key,GREY[key]);
  $('.badge').textContent='รอข้อมูล';$('.advice').textContent='รอค่าเฉลี่ย 24 ชม.';$('.avg-note').hidden=true;$('.scale-arrow').hidden=true;video.pause();drawHistory(history,historyStatus);return;
 }
 const hourly=PM25Tier.classify({value,observedAt:pm.observedAt,status:pm.status,unit:pm.unit||'µg/m³'},{now:Date.now()});
 const ht=hourly.isHealthTier?tiers.find(x=>x.id===hourly.key):null;
 board.classList.remove('unavailable');board.dataset.tier=t.id;for(const key of ['light','dark','shade','glow'])board.style.setProperty('--'+key,t[key]);
 $('.badge').textContent=t.status;$('.advice').textContent=t.advice;
 $('.avg-note').hidden=false;$('.avg-note').textContent='เฉลี่ย 24 ชม. '+cls.displayValue.toFixed(1);
 if(ht){const idx=tiers.indexOf(ht),band=BANDS[idx];for(const key of ['light','dark','glow'])board.style.setProperty('--number-'+key,ht[key]);const frac=Math.max(.025,Math.min(.975,(hourly.displayValue-band[0])/(band[1]-band[0])));$('.scale-arrow').style.left=20*(idx+frac)+'%';$('.scale-arrow').hidden=false;}else{$('.scale-arrow').hidden=true;for(const key of ['light','dark','glow'])board.style.setProperty('--number-'+key,GREY[key]);}
 if(selected!==t.id){selected=t.id;poster.src='pm25-media/'+selected+'.jpg';video.classList.remove('ready');video.dataset.fallback='0';if(!matchMedia('(prefers-reduced-motion: reduce)').matches){video.src='pm25-media/'+selected+'-optimized.mp4';video.load()}}
 if(!matchMedia('(prefers-reduced-motion: reduce)').matches)video.play().catch(()=>{});drawHistory(history,historyStatus);
}
video.addEventListener('loadeddata',()=>video.classList.add('ready'));
video.addEventListener('error',()=>{if(selected&&video.dataset.fallback!=='1'&&video.canPlayType('video/webm')){video.dataset.fallback='1';video.src='pm25-media/'+selected+'.webm';video.load();video.play().catch(()=>{})}});
window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent||!e.data||e.data.type!=='uth-pm25-live')return;render(e.data.pm25,e.data.history,e.data.historyStatus)});
tick();setInterval(tick,15000);
})();
