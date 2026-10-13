/* Existing PM2.5 iframe remains untouched. Heat = DERIVED weather model.
   Water level = UNAVAILABLE until a verified gate sensor/API is approved. */
(function(root){
'use strict';
const ROTATE_MS = 12000;
const REFRESH_MS = 15*60*1000;
const HEAT_FRESHNESS_MS = 3*3600000;
const URL = 'https://api.open-meteo.com/v1/forecast?latitude=14.36147&longitude=100.64424&current=temperature_2m%2Crelative_humidity_2m&timezone=Asia%2FBangkok&forecast_days=1';
const finite = x => typeof x === 'number' && Number.isFinite(x);
function heatCelsius(temp, humidity){
  if(!finite(temp)||temp < -40||temp > 65||!finite(humidity)||humidity < 0||humidity > 100)return null;
  const t=temp*9/5+32;
  let hi=0.5*(t+61+1.2*(t-68)+0.094*humidity);
  hi=(hi+t)/2;
  if(hi>=80){
    hi=-42.379+2.04901523*t+10.14333127*humidity
      -0.22475541*t*humidity-0.00683783*t*t-0.05481717*humidity*humidity
      +0.00122874*t*t*humidity+0.00085282*t*humidity*humidity
      -0.00000199*t*t*humidity*humidity;
    if(humidity<13&&t>=80&&t<=112)hi-=(13-humidity)/4*Math.sqrt((17-Math.abs(t-95))/17);
    if(humidity>85&&t>=80&&t<=87)hi+=(humidity-85)/10*((87-t)/5);
  }
  const c=(hi-32)*5/9;
  return finite(c)?c:null;
}
function parseBangkokTime(v){
  if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(v))return null;
  const ms=Date.parse(v+'+07:00');
  return Number.isFinite(ms)?ms:null;
}
function parseHeat(payload,now){
  if(!payload||payload.timezone!=='Asia/Bangkok'||!payload.current||!payload.current_units ||
      payload.current_units.temperature_2m!=='°C'||
      payload.current_units.relative_humidity_2m!=='%')return null;
  const time=parseBangkokTime(payload.current.time);
  if(time===null||time>now+5*60000||now-time>HEAT_FRESHNESS_MS)return null;
  const v=heatCelsius(payload.current.temperature_2m,payload.current.relative_humidity_2m);
  return v===null?null:{value:v,type:'DERIVED',time};
}
async function requestHeat(fetcher,now){
  const ctl=new AbortController();
  const timeout=setTimeout(()=>ctl.abort(),12000);
  try{
    const r=await fetcher(URL,{signal:ctl.signal,cache:'no-store'});
    if(!r.ok)return null;
    return parseHeat(await r.json(),now());
  }catch{return null;}
  finally{clearTimeout(timeout);}
}
const HEAT_CLASSES=['heat-below','heat-watch','heat-caution','heat-danger','heat-extreme'];
// Ministry of Natural Resources and Environment / public-health impact bands:
// green 27–32.9, yellow 33–41.9, orange 42–51.9, red >= 52 °C.
// Below 27 is NOT an official green "safe" classification.
function heatSeverity(value){
  if(!finite(value))return {cls:'no-data',label:'รอข้อมูล'};
  const shown=Number(value.toFixed(1));
  if(shown>=52)return {cls:'heat-extreme',label:'อันตรายมาก · คำนวณ'};
  if(shown>=42)return {cls:'heat-danger',label:'อันตราย · คำนวณ'};
  if(shown>=33)return {cls:'heat-caution',label:'เตือนภัย · คำนวณ'};
  if(shown>=27)return {cls:'heat-watch',label:'เฝ้าระวัง · คำนวณ'};
  return {cls:'heat-below',label:'ต่ำกว่าเกณฑ์ · คำนวณ'};
}
function shortHeatLabel(v){return heatSeverity(v).label;}
function freshHeat(reading,nowMs){
  if(!reading||!finite(reading.value)||!finite(reading.time)||
      reading.type!=='DERIVED'||!finite(nowMs)||
      reading.time>nowMs+5*60000||nowMs-reading.time>HEAT_FRESHNESS_MS)return null;
  return reading;
}
const api={heatCelsius,parseBangkokTime,parseHeat,requestHeat,heatSeverity,shortHeatLabel,freshHeat,ROTATE_MS,REFRESH_MS,HEAT_FRESHNESS_MS,URL};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.UthaiLEDRotation=api;
if(!root.document)return;
const slides=['slide-pm','slide-water','slide-heat'].map(id=>root.document.getElementById(id));
const heatValue=root.document.getElementById('heat-value');
const heatStatus=root.document.getElementById('heat-status');
const heatPanel=root.document.getElementById('slide-heat');
if(slides.some(x=>!x)||!heatValue||!heatStatus||!heatPanel)return;
let index=0,running=false,latestReading=null;
function show(i){
  // Revalidate the timestamp at every heat-slide exposure, including after
  // background-tab throttling or an overnight power/sleep resumption.
  if(i===2)paintHeat();
  index=i;
  slides.forEach((el,n)=>{
    const active=n===i;
    el.classList.toggle('active',active);
    el.setAttribute('aria-hidden',active?'false':'true');
  });
}
function renderHeat(value){
  const severity=heatSeverity(value);
  for(const cls of HEAT_CLASSES)heatPanel.classList.remove(cls);
  heatPanel.classList.toggle('no-data',severity.cls==='no-data');
  if(severity.cls!=='no-data')heatPanel.classList.add(severity.cls);
  heatValue.textContent=value===null?'—':value.toFixed(1);
  heatStatus.textContent=severity.label;
}
function paintHeat(){
  const fresh=freshHeat(latestReading,Date.now());
  if(!fresh)latestReading=null;
  renderHeat(fresh?fresh.value:null);
}
async function update(){
  if(running)return;
  running=true;
  try{
    latestReading=typeof root.fetch==='function'
      ? await requestHeat(root.fetch.bind(root),()=>Date.now()):null;
  }catch{latestReading=null;}
  finally{running=false;paintHeat();}
}
show(0);
update();
root.setInterval(()=>show((index+1)%slides.length),ROTATE_MS);
root.setInterval(update,REFRESH_MS);
root.setInterval(paintHeat,60000);
if(root.document.addEventListener)root.document.addEventListener('visibilitychange',()=>{
  paintHeat();
  if(root.document.visibilityState==='visible')update();
});
})(typeof window!=='undefined'?window:globalThis);
