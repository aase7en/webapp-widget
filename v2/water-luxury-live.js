/* Production: fixed-origin canonical Sheet history via existing UthApiClient.
   Last stored reading is never labelled LIVE, and sprites are illustrative. */
(()=>{'use strict';
const BANDS=[{file:'3_51_75pct'}],ASSETS='../assets/water-gate/5-levels/';
const $=id=>document.getElementById(id),reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
const state={band:0,frame:0};
const figures=[
 {el:'#stationA',id:'s1',code:'HDA004',name:'HDA004 ช่องสะเดา',subtitle:'สถานีอ้างอิง',value:null,groundMsl:null,bankM:null,datum:null,observed:'รอข้อมูล',observedAt:null,status:'missing',historyPath:''},
 {el:'#stationB',id:'s2',code:'S5',name:'S.5 สะพานปรีดี',subtitle:'สถานีอ้างอิง',value:null,groundMsl:null,bankM:null,datum:null,observed:'รอข้อมูล',observedAt:null,status:'missing',historyPath:''}];
const atlas=BANDS.map(b=>{const im=new Image();im.src=ASSETS+'uth_led_water_'+b.file+'_spritestrip.png';return im});
let raf=0;
function clock(){const now=new Date();$('clockDate').textContent=new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',weekday:'short',day:'numeric',month:'short',year:'2-digit'}).format(now);$('clockTime').textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit',hour12:false}).format(now)}
function sparkSvg(path,isDemo){
 if(!path||!/^[MmLlHhVvCcSsQqTtAaZz0-9.,+\-\seE]+$/.test(path))return '<span class="unavailable-message">รอประวัติ 7 วัน</span>';
 return `<svg class="spark" viewBox="0 0 340 125" aria-label="${'กราฟระดับน้ำตรวจวัดจริงย้อนหลัง'}"><path d="${path}" fill="none" stroke="#61ecff" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" /></svg>`;
}
// Only a dimensionless fraction of the ground-to-lowest-bank interval;
 // not flood risk, reservoir capacity, or sluice-gate opening percentage.
function bankIntervalPercent(level,ground,bank,datum){
 if(datum!=='MSL'||![level,ground,bank].every(Number.isFinite)||bank<=ground||level<ground)return null;
 return Math.round(((level-ground)/(bank-ground))*1000)/10;
}
function renderStation(st){
 const target=document.querySelector(st.el);if(!target)return;
 const value=typeof st.value==='number'&&Number.isFinite(st.value)?st.value.toFixed(2):'—';
 const percent=bankIntervalPercent(st.value,st.groundMsl,st.bankM,st.datum);
 const label=percent===null?'ช่วงพื้น–ตลิ่ง —%':'ช่วงพื้น–ตลิ่ง '+percent.toFixed(1)+'%';
 const badge=st.status==='historical'?'ข้อมูลย้อนหลัง':st.status==='ok'?'ค่าล่าสุด':'รอข้อมูล';
 const safePath=st.historyPath||'';
 target.innerHTML=`<div class="station-card"><div class="art-zone"><canvas class="water-canvas" width="420" height="210" aria-label="ภาพการไหลประกอบ ไม่ใช่สถานะประตูจริง"></canvas></div>
 <div class="info"><div class="station-name">${st.name}<small>สถานีอ้างอิง HII</small></div>
 <div class="reading-row"><div class="big-level">${value}<span class="unit">ม.รทก.</span></div></div>
 <div class="status-trend"><span class="badge unavailable">${badge}</span><div class="trend-box"><div class="trend-title">ย้อนหลัง 7 วัน</div>${sparkSvg(safePath,false)}</div></div>
 <div class="reading-detail"><div class="delta" title="${st.observed}">${st.observed}</div><div class="bank-percent" title="สัดส่วนระดับพื้นอ้างอิงถึงตลิ่งต่ำสุด ไม่ใช่ความจุน้ำหรือระดับการเปิดประตู">${label}</div></div>
 </div></div>`;
}
function historyPath(st){
 const vals=st?.trendPoints,times=st?.trendObservedAt;
 if(!Array.isArray(vals)||!Array.isArray(times)||vals.length<2||vals.length!==times.length)return '';
 const points=vals.map((level,i)=>({level,ms:Date.parse(times[i])})).filter(x=>Number.isFinite(x.level)&&Number.isFinite(x.ms)).sort((a,b)=>a.ms-b.ms);
 if(points.length<2||points[points.length-1].ms===points[0].ms)return '';
 const min=Math.min(...points.map(x=>x.level)),max=Math.max(...points.map(x=>x.level));
 const extent=Math.max(.15,max-min),span=points[points.length-1].ms-points[0].ms;
 return points.map((v,i)=>(i?'L':'M')+(5+327*(v.ms-points[0].ms)/span).toFixed(1)+' '+(110-82*(v.level-min)/extent).toFixed(1)).join(' ');
}
function apply(st,reading,now){
 const obs=Date.parse(reading?.observedAt);
 const valid=Number.isFinite(obs)&&obs<=now+120000&&
  typeof reading?.levelMsl==='number'&&Number.isFinite(reading.levelMsl)&&
  ['ok','historical'].includes(reading.status);
 // Failed/stale transport must not erase the last VERIFIED reading in this
 // page session. Never regress to an older measurement from a fallback feed.
 const prior=Date.parse(st.observedAt);
 if((!valid || (Number.isFinite(prior)&&obs<prior))&&
     Number.isFinite(prior)&&prior<=now+120000){
  st.status=now-prior<=3*3600000?'ok':'historical';
  renderStation(st);return;
 }
 st.value=valid?reading.levelMsl:null;
 st.observedAt=valid?reading.observedAt:null;
 st.bankM=valid&&Number.isFinite(reading.bankM)?reading.bankM:null;
 st.groundMsl=valid&&Number.isFinite(reading.groundMsl)?reading.groundMsl:null;
 st.datum=valid?'MSL':null;
 st.status=valid?(now-obs<=3*3600000?'ok':'historical'):'missing';
 st.observed=valid?'วัด '+new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',day:'2-digit',month:'short',year:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(obs)):'ไม่มีค่าที่ตรวจสอบได้';
 st.historyPath=historyPath(reading);
 renderStation(st);
}
let reading=false;
async function refresh(){
 if(reading)return;reading=true;
 try{
  const payload=await window.UthApiClient.getWater(),now=Date.now();
  for(const st of figures)apply(st,payload?.stations?.[st.code],now);
  $('water-data-status').textContent=figures.map(st=>st.name+': '+st.observed+(st.status==='historical'?' ข้อมูลย้อนหลัง':'')).join('; ');
 }catch(_e){
  // Preserve last valid per-station values in RAM during a temporary transport failure,
  // but never extend the actual observedAt; reclassify using the real clock.
  const now=Date.now();
  for(const st of figures){
   if(st.observedAt&&Number.isFinite(Date.parse(st.observedAt))){
    if(now-Date.parse(st.observedAt)>3*3600000)st.status='historical';
   }
   renderStation(st);
  }
  $('water-data-status').textContent='เชื่อมต่อข้อมูลไม่ได้ · แสดงข้อมูลที่เคยตรวจวัดเมื่อ '+figures.map(x=>x.observed).join('; ');
 }finally{
  reading=false;
  document.querySelectorAll('.water-canvas').forEach(c=>drawCanvas(c,reduced?0:state.frame));
  drawFoam(reduced?0:state.frame);
 }
}
function drawCanvas(canvas,frame){const image=atlas[state.band];if(!image.complete||!image.naturalWidth)return;const ctx=canvas.getContext('2d');if(!ctx)return;
 const w=canvas.width,h=canvas.height;const frameW=image.naturalWidth/4;const frameH=image.naturalHeight;
 const srcW=frameW;const destW=w,destH=h;
 // Original aspect ratio: 640×320 = 2:1. We always draw to a 2:1 canvas.
 if(canvas.dataset.locked!=='1'){ctx.clearRect(0,0,w,h);ctx.drawImage(image,0,0,srcW,frameH,0,0,destW,destH);canvas.dataset.locked='1'}
 // Fixed architecture; update only water and foam in the lower half.
 ctx.save();ctx.beginPath();ctx.rect(0,h*.43,w,h*.57);ctx.clip();ctx.drawImage(image,frame*frameW,0,srcW,frameH,0,0,destW,destH);ctx.restore()
 canvas.dataset.frame=String(frame);
}

function drawFoam(frame){
 const image=atlas[state.band],canvas=document.querySelector('.foam-front');
 if(!canvas||!image.complete||!image.naturalWidth)return;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const fw=image.naturalWidth/4,fh=image.naturalHeight,w=canvas.width,h=canvas.height;
 ctx.clearRect(0,0,w,h);ctx.save();
 // Compose two native sprite whitewater patches instead of tiled horizontal strip.
 // Each patch fades on ALL sides so falling-water edges blend into low ripples.
 document.querySelectorAll('.station:not(.is-not-focus)').forEach(st=>{
  const patch=document.createElement('canvas');patch.width=465;patch.height=h;
  const p=patch.getContext('2d');if(!p)return;
  p.drawImage(image,frame*fw,fh*.67,fw,fh*.31,0,0,465,h);
  p.globalCompositeOperation='destination-in';
  const feather=p.createLinearGradient(0,0,465,0);
  feather.addColorStop(0,'rgba(0,0,0,0)');
  feather.addColorStop(.13,'rgba(0,0,0,.6)');
  feather.addColorStop(.38,'#000');feather.addColorStop(.58,'#000');
  feather.addColorStop(.85,'rgba(0,0,0,.55)');feather.addColorStop(1,'rgba(0,0,0,0)');
  p.fillStyle=feather;p.fillRect(0,0,465,h);
  const wave=p.createLinearGradient(0,0,0,h);
  wave.addColorStop(0,'rgba(0,0,0,0)');
  wave.addColorStop(.34,'rgba(0,0,0,.75)');
  wave.addColorStop(1,'#000');
  p.fillStyle=wave;p.fillRect(0,0,465,h);
  p.globalCompositeOperation='source-over';
  // A little more visible under the clock; feathered edges remain inside the LED.
  const start=st.offsetLeft-(st.id==='stationA'?202:135);
  ctx.globalAlpha=st.id==='stationA'?.96:.79;ctx.drawImage(patch,start,0);
 });
 ctx.restore();canvas.dataset.frame=String(frame);
}
function animate(ts){const frame=Math.floor(ts/150)%4;if(frame!==state.frame){state.frame=frame;document.querySelectorAll('.water-canvas').forEach(el=>drawCanvas(el,frame));drawFoam(frame)}raf=requestAnimationFrame(animate)}
clock();setInterval(clock,15000);
figures.forEach(renderStation);
atlas.forEach(img=>img.addEventListener('load',()=>{document.querySelectorAll('.water-canvas').forEach(c=>{c.dataset.locked='0';drawCanvas(c,reduced?0:state.frame)});drawFoam(reduced?0:state.frame)}));
if(!reduced)raf=requestAnimationFrame(animate);
window.addEventListener('load',()=>{void refresh()},{once:true});
setInterval(()=>{void refresh()},180000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refresh()});
window.addEventListener('online',()=>{void refresh()});
})();
