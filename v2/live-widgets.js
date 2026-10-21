/* Read-only live data bridge for isolated UTH LED preview.
   No invented PM2.5/temperature/water values. Daily and hourly model forecasts are labeled. */
(()=>{
'use strict';
const $=s=>document.querySelector(s);
const NUM=n=>typeof n==='number'&&Number.isFinite(n);
const box=$('#pm'),core=$('.mascot'),hero=$('.pm-num');
const cutoffs=[0,26,38,51,91,151];
function arrowPercent(v){
  if(!NUM(v)||v<0)return null;
  let segment=0;
  while(segment<5&&v>=cutoffs[segment+1])segment++;
  segment=Math.min(4,segment);
  let ratio=Math.max(0,Math.min(1,(v-cutoffs[segment])/(cutoffs[segment+1]-cutoffs[segment])));
  return Math.min(99,Math.max(1,(segment+ratio)*20));
}
function mood(v){
  if(v>=91)return{base:'severe',text:'มีผลกระทบ',advice:'ลดกิจกรรมกลางแจ้ง',color:'#ff737d',masked:true};
  if(v>=51)return{base:'protective',text:'เริ่มมีผลกระทบ',advice:'ลดกิจกรรมกลางแจ้ง',color:'#ffad53',masked:true};
  if(v>=38)return{base:'unhealthy',text:'ปานกลาง',advice:'กลุ่มเสี่ยงควรระวัง',color:'#ffc958',masked:false};
  if(v>=26)return{base:'moderate',text:'ดี',advice:'ทำกิจกรรมได้ทั่วไป',color:'#ffe16b',masked:false};
  return{base:'good',text:'ดีมาก',advice:'สภาพอากาศโดยรวมดี',color:'#77efa6',masked:false};
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
 const m=mood(p.value);
 hero.textContent=p.value.toFixed(1);
 hero.style.color=m.color;
 mascot(m);
 $('.pm-status .pill').lastChild.textContent=' '+m.text;
 $('.pm-status .pill i').textContent=['good','moderate'].includes(m.base)?'✓':m.base==='unhealthy'?'•':'!';
 $('.pm-status .sub').textContent=m.advice;
 const pct=arrowPercent(p.value);
 $('.scalePM .levels').style.setProperty('--marker-pos',pct+'%');
 $('.scalePM .levels').style.setProperty('--marker-show','1');
 $('.scalePM .levels').title='PM2.5 '+p.value.toFixed(1)+' µg/m³ · เกณฑ์ในแอป: <26 / 26–37 / 38–50 / 51–90 / ≥91';
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
async function refresh(){
 try{
 const data=await window.UthApiClient.getLive();
 paintPm(data);paintWeatherSmall(data);
 }catch(e){resetPm('PM2.5: UNAVAILABLE · API ไม่ตอบสนอง');}
 const waterButton=$('#real');if(waterButton)waterButton.click();
}
const refreshBtn=$('#refresh-all');if(refreshBtn)refreshBtn.addEventListener('click',refresh);
refresh();setInterval(refresh,5*60*1000);
})();
