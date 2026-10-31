/* Read-only live data bridge for isolated UTH LED preview.
   No invented PM2.5/temperature/water values. Daily and hourly model forecasts are labeled. */
(()=>{
'use strict';
const $=s=>document.querySelector(s);
const NUM=n=>typeof n==='number'&&Number.isFinite(n);
const box=$('#pm'),core=$('.mascot'),hero=$('.pm-num');
const cutoffs=[0,15,25,37.5,75,151];
function arrowPercent(v){
  if(!NUM(v)||v<0)return null;
  let segment=0;
  while(segment<5&&v>=cutoffs[segment+1])segment++;
  segment=Math.min(4,segment);
  let ratio=Math.max(0,Math.min(1,(v-cutoffs[segment])/(cutoffs[segment+1]-cutoffs[segment])));
  return Math.min(99,Math.max(1,(segment+ratio)*20));
}
/* 2026 option A: badge/mascot band from the GISTDA 24-hour average. The mood
 * REQUIRES a valid avg24h and is classified with the 2026 cutoffs below — a
 * backend band string is never trusted on vocabulary alone (its basis is
 * unknowable on old payloads, so an old hourly band cannot masquerade as a
 * 24h tier). Explicit metadata is verified instead: avg24hBand must be in
 * the vocabulary AND agree with the avg derivation. No usable average -> null
 * (grey/unavailable); the hourly number still renders — never zero-filled. */
const BAND_TO_BASE={very_good:'good',good:'moderate',moderate:'unhealthy',unhealthy_sensitive:'protective',unhealthy:'severe'};
const MOODS={
 good:{base:'good',text:'ดีมาก',advice:'สภาพอากาศโดยรวมดี',color:'#77efa6',masked:false},
 moderate:{base:'moderate',text:'ดี',advice:'ทำกิจกรรมได้ทั่วไป',color:'#ffe16b',masked:false},
 unhealthy:{base:'unhealthy',text:'ปานกลาง',advice:'กลุ่มเสี่ยงควรระวัง',color:'#ffc958',masked:false},
 protective:{base:'protective',text:'เริ่มมีผลต่อสุขภาพ',advice:'ลดกิจกรรมกลางแจ้ง',color:'#ffad53',masked:true},
 severe:{base:'severe',text:'มีผลต่อสุขภาพ',advice:'ลดกิจกรรมกลางแจ้ง',color:'#ff737d',masked:true}
};
function mood(v){
  if(v>75)return MOODS.severe;
  if(v>37.5)return MOODS.protective;
  if(v>25)return MOODS.unhealthy;
  if(v>15)return MOODS.moderate;
  return MOODS.good;
}
function pmMood(p){
 const avg=NUM(p.avg24h)&&p.avg24h>=0?p.avg24h:null; /* avg REQUIRED: no avg -> grey */
 if(typeof p.avg24hBand==='string'&&p.avg24hBand!==''){
  const base=BAND_TO_BASE[p.avg24hBand]; /* metadata must be known AND agree with the avg */
  if(!base)return null;
  const m=avg!==null?mood(avg):null;
  return m&&m.base===base?m:null;
 }
 if(typeof p.band==='string'&&p.band!==''&&!BAND_TO_BASE[p.band])return null; /* unknown band fails closed */
 return avg!==null?mood(avg):null; /* plain band never decides the mood */
}
function mascot(m){
 const files='../assets/icons3d/rig/';
 const base=core.querySelector('img[data-base]'),eyes=core.querySelector('img[data-eyes]');
 const brows=core.querySelector('img[data-brows]'),mask=core.querySelector('img[data-mask]');
 const mouth=core.querySelector('img[data-mouth]');
 if(base)base.src=files+'pm-base-'+m.base+'.png';
 const happy=m.base==='good'||m.base==='moderate';
 core.classList.toggle('happy-eye-mode',happy);
 if(eyes)eyes.src=files+'pm-eyes'+(happy?'-happy':'')+'.png';
 if(brows)brows.style.display=(m.base==='severe')?'block':'none';
 if(mask)mask.style.display=m.masked?'block':'none';
 if(mouth){
   mouth.style.display=m.masked?'none':'block';
   if(!m.masked)mouth.src=files+'pm-mouth'+(m.base==='good'?'-grin':m.base==='unhealthy'?'-flat':'')+'.png';
 }
 const shade={
  good:['#409ee2','#83cff6','#1866b2'],
  moderate:['#32b55a','#8af59c','#1d722f'],
  unhealthy:['#e0a83a','#fff09a','#9d6d21'],
  protective:['#e97e2d','#ffc26d','#a9441b'],
  severe:['#c93648','#ff7d7d','#8b213a'],
  unavailable:['#8c9ba8','#cbd8e2','#5e7082']
 }[m.base]||['#8c9ba8','#cbd8e2','#5e7082'];
 core.style.setProperty('--lid-color',shade[0]);
 core.style.setProperty('--lid-hi',shade[1]);
 core.style.setProperty('--lid-dark',shade[2]);
 core.dataset.masked=m.masked?'1':'0';
 core.dataset.state=m.base;
 box.dataset.pmBand=m.base;
}

function resetPm(message){
 hero.textContent='—';
 mascot({base:'unavailable',masked:false});
 core.dataset.masked='0';
 const mask=core.querySelector('img[data-mask]');if(mask)mask.style.display='none';
 const mouth=core.querySelector('img[data-mouth]');if(mouth)mouth.style.display='none';
 $('.pm-status .pill').lastChild.textContent=' รอข้อมูล';
 $('.pm-status .pill i').textContent='?';
 $('.pm-status .sub').textContent='ไม่พบค่าล่าสุด';
 $('.scalePM .levels').style.setProperty('--marker-show','0');
 $('.climate').querySelectorAll('strong,small').forEach(n=>n.textContent='—');
 $('#pm-provenance').textContent=message||'PM2.5: UNAVAILABLE · ไม่ใช้ค่า 0 แทน';
}
function paintPm(d){
 const p=d.pm25||{};
 if(p.status!=='latest'||!NUM(p.value)){resetPm('PM2.5: UNAVAILABLE · ไม่มีค่าที่สดและตรวจสอบได้');return}
 hero.textContent=p.value.toFixed(1); /* big number stays the latest hourly reading */
 const m=pmMood(p); /* 2026: band/mascot from the 24h average, null = unavailable */
 if(m){
  hero.style.color=m.color;
  mascot(m);
  $('.pm-status .pill').lastChild.textContent=' '+m.text;
  $('.pm-status .pill i').textContent=['good','moderate'].includes(m.base)?'✓':m.base==='unhealthy'?'•':'!';
  $('.pm-status .sub').textContent=m.advice;
 }else{ /* avg24h absent this refresh: grey/unavailable tier, hourly number unchanged */
  mascot({base:'unavailable',masked:false});
  hero.style.color='#cbd8e2';
  $('.pm-status .pill').lastChild.textContent=' รอข้อมูล';
  $('.pm-status .pill i').textContent='?';
  $('.pm-status .sub').textContent='รอค่าเฉลี่ย 24 ชม.';
 }
 const pct=arrowPercent(p.value);
 $('.scalePM .levels').style.setProperty('--marker-pos',pct+'%');
 $('.scalePM .levels').style.setProperty('--marker-show','1');
 $('.scalePM .levels').title='PM2.5 '+p.value.toFixed(1)+' µg/m³ · เกณฑ์สีจากค่าเฉลี่ย 24 ชม.: ≤15 / 15.1–25 / 25.1–37.5 / 37.6–75 / >75';
 $('#pm-provenance').textContent='LATEST · '+(p.source||'GISTDA')+' · วัด '+new Date(p.observedAt).toLocaleTimeString('th-TH',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit'});
}
function paintWeatherSmall(d){
 const w=d.weather||{};
 const temperature=$('.climate-temp');
 const humidity=$('.climate-humidity-value');
 const wind=$('.climate-wind');
 if(w.status!=='model_latest'){
  temperature.textContent='—';humidity.textContent='—';wind.textContent='ลม —';
  return;
 }
 temperature.textContent=NUM(w.temperatureC)?Math.round(w.temperatureC)+'°':'—';
 humidity.textContent=NUM(w.humidityPct)?Math.round(w.humidityPct)+'%':'—';
 wind.textContent='ลม '+(NUM(w.windKmh)?Math.round(w.windKmh)+' กม./ชม.':'—');
}
let lastPm={status:'unavailable'},lastHistory=[];
function publishPm(){const f=$('#pm-live-frame');if(f&&f.contentWindow)f.contentWindow.postMessage({type:'uth-pm25-live',pm25:lastPm,history:lastHistory},location.origin)}
let historySeq=0;
function readPmHistory(){return new Promise((resolve,reject)=>{
 const cb='__uthPmHistory'+Date.now().toString(36)+(historySeq++).toString(36),script=document.createElement('script');let done=false;
 const finish=(err,data)=>{if(done)return;done=true;clearTimeout(timer);delete window[cb];script.remove();err?reject(err):resolve(data)};
 window[cb]=data=>finish(null,data);const timer=setTimeout(()=>finish(Error('history timeout')),9000);
 script.onerror=()=>finish(Error('history unavailable'));script.src=window.UthaiLEDRotation.BACKEND_URL+'?action=pm25_history&callback='+cb;document.head.appendChild(script);
})}
async function refreshPmHistory(){try{const h=await readPmHistory();if(h&&h.schema===1&&h.status==='ok'&&h.location==='uthai'&&Array.isArray(h.points))lastHistory=h.points;else lastHistory=[]}catch(e){lastHistory=[]}publishPm()}
const pmFrame=$('#pm-live-frame');if(pmFrame)pmFrame.addEventListener('load',publishPm);
async function refresh(){
 try{
 const data=await window.UthApiClient.getLive();
 paintPm(data);paintWeatherSmall(data);lastPm=data.pm25||{status:'unavailable'};publishPm();
 }catch(e){resetPm('PM2.5: UNAVAILABLE · API ไม่ตอบสนอง');lastPm={status:'unavailable'};publishPm();}
 const waterButton=$('#real');if(waterButton)waterButton.click();
}
const refreshBtn=$('#refresh-all');if(refreshBtn)refreshBtn.addEventListener('click',refresh);
refresh();refreshPmHistory();setInterval(refresh,5*60*1000);setInterval(refreshPmHistory,15*60*1000);
})();
