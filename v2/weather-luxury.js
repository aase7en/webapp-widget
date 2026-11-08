'use strict';
const $=s=>document.querySelector(s);
function replace(el,nodes){while(el.firstChild)el.removeChild(el.firstChild);(nodes||[]).forEach(node=>el.appendChild(node))}
// Decorative temperature palette, not heat-index or an official health warning.
function temperatureColor(v){
 const stops=[[20,[47,189,242]],[24,[77,225,143]],[28,[255,225,76]],[33,[255,148,43]],[38,[246,71,55]]];
 if(v<=stops[0][0])return 'rgb('+stops[0][1].join(',')+')';
 for(let i=1;i<stops.length;i++){const a=stops[i-1],b=stops[i];if(v<=b[0]){const f=(v-a[0])/(b[0]-a[0]);return 'rgb('+a[1].map((n,j)=>Math.round(n+(b[1][j]-n)*f)).join(',')+')';}}
 return 'rgb('+stops[stops.length-1][1].join(',')+')';
}
function draw(d){const fmt=(v,s='')=>Number.isFinite(v)?Math.round(v)+s:'—';$('#temp').textContent=fmt(d.temperatureC);$('#feels').textContent=fmt(d.feelsC,'°');const warn=$('#advice'),fullWarning=d.advice||'';warn.hidden=!fullWarning;warn.textContent=fullWarning?'⚠ '+fullWarning:'';if(fullWarning&&warn.offsetWidth>126)warn.textContent='⚠ ระวังความร้อน';warn.setAttribute('aria-label',fullWarning);warn.title=fullWarning;$('#rain').textContent=fmt(d.rainPct,'%');$('#humidity').textContent=fmt(d.humidityPct,'%');$('#high').textContent=fmt(d.high,'°');$('#low').textContent=fmt(d.low,'°');replace($('#days'));for(let i=0;i<7;i++){const x=(d.days||[])[i]||{},el=document.createElement('div');el.className='day';const day=document.createElement('span');day.textContent=x.day||'—';const ico=document.createElement('span');ico.className='forecast-icon';if(x.ico)ico.dataset.condition=x.ico;const hi=document.createElement('b');hi.textContent=fmt(x.hi,'°');const rain=document.createElement('span');rain.className='rain-chance';const drop=document.createElement('img');drop.src='weather-assets/drop.png';drop.alt='';rain.append(drop,document.createTextNode(fmt(x.p,'%')));el.append(day,ico,hi,rain);$('#days').append(el)}/* Draw the trend for however many contiguous days the snapshot still covers.
   Right after Bangkok midnight the cached forecast still starts yesterday, so
   six points must render instead of clearing the line. */
const vals=(d.days||[]).map(x=>x.hi),n=vals.length;if(n>=2&&vals.every(Number.isFinite)){const gradient=$('#graphfill');replace(gradient,vals.map((v,i)=>{let e=document.createElementNS('http://www.w3.org/2000/svg','stop');e.setAttribute('offset',(i*100/(n-1))+'%');e.setAttribute('stop-color',temperatureColor(v));return e}));let lo=Math.min(...vals)-1,hi=Math.max(...vals)+1;let pts=vals.map((v,i)=>[i*350/(n-1),18-(v-lo)/(hi-lo)*16]);let line=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');$('#line').setAttribute('d',line);$('#area').setAttribute('d',line+' L350 20 L0 20 Z');replace($('#points'),pts.map(([x,y])=>{let e=document.createElementNS('http://www.w3.org/2000/svg','circle');e.setAttribute('cx',x);e.setAttribute('cy',y);e.setAttribute('r','2');return e}))}else{$('#line').setAttribute('d','');$('#area').setAttribute('d','');replace($('#points'))}}

const API='https://script.google.com/macros/s/AKfycbwwUQCeJoz4N0P9UuRJF39pt17mBjPz0_yMDDxTO7BoiUiTQaO7Yay0UKq80EvE6dk/exec?action=snapshot_v1';
const scenes={'partly-cloudy':'clear',cloudy:'cloudy',rain:'rain',thunderstorm:'thunderstorm',fog:'fog',wind:'cloudy',night:'night','night-rain':'night','night-wind':'night','night-thunderstorm':'night'};
function clock(){let d=new Date();$('#time').textContent=new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit',hour12:false}).format(d);$('#date').textContent=new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',weekday:'short',day:'numeric',month:'short',year:'2-digit'}).format(d)}
function heat(t,rh){if(!Number.isFinite(t)||!Number.isFinite(rh))return null;let f=t*9/5+32,h=(.5*(f+61+1.2*(f-68)+.094*rh)+f)/2;if(h>=80){h=-42.379+2.04901523*f+10.14333127*rh-.22475541*f*rh-.00683783*f*f-.05481717*rh*rh+.00122874*f*f*rh+.00085282*f*rh*rh-.00000199*f*f*rh*rh;if(rh<13&&f>=80&&f<=112)h-=(13-rh)/4*Math.sqrt((17-Math.abs(f-95))/17);if(rh>85&&f>=80&&f<=87)h+=(rh-85)/10*((87-f)/5)}return (h-32)*5/9}
/* Practical display-only advice. NWS heat-index bands (27/32.2/39.4/
   51.7 degrees Celsius, converted from 80/90/103/125 degrees Fahrenheit)
   account for humidity; these are NOT official Thai local alerts.
   Cold clothing tips are editorial comfort suggestions, not WHO thresholds.
   Do not call any air temperature universally safe. Suppress stale/missing. */
function weatherGuidance(t,h,old){
 if(old||!Number.isFinite(t))return null;
 if(t>60||t< -50)return {level:'uncertain',label:'ตรวจสอบข้อมูล',compact:'ตรวจสอบข้อมูล',detail:'อุณหภูมิอยู่นอกช่วงใช้งานทั่วไป ห้ามตีความเป็นคำเตือนสุขภาพที่ตรวจยืนยันแล้ว'};
 if(t<16)return {level:'cold',label:'สวมเสื้อให้อุ่น',compact:'สวมเสื้อให้อุ่น',detail:'อุณหภูมิต่ำ ควรสวมเสื้อผ้าที่ช่วยรักษาความอบอุ่น'};
 if(t<20)return {level:'cold',label:'พกเสื้อกันหนาว',compact:'พกเสื้อกันหนาว',detail:'อากาศค่อนข้างเย็น พิจารณาเสื้อกันหนาวตามความเหมาะสม'};
 if(Number.isFinite(h)){
  if(h>=51.7)return {level:'extreme',label:'ระวัง Heatstroke',compact:'เสี่ยงลมร้อน',detail:'ดัชนีความร้อนสูงมาก หลีกเลี่ยงการอยู่กลางแจ้งและกิจกรรมหนัก เสี่ยงโรคลมร้อน (Heatstroke)'};
  if(h>=39.4)return {level:'danger',label:'ระวัง Heatstroke',compact:'เสี่ยงลมร้อน',detail:'ดัชนีความร้อนอยู่ในระดับอันตราย เสี่ยงโรคลมร้อนหากสัมผัสความร้อนนานหรือออกแรง'};
  if(h>=32.2)return {level:'caution',label:'หลีกเลี่ยงแดดจัด',compact:'เลี่ยงแดดจัด',detail:'ดัชนีความร้อนสูง ควรลดกิจกรรมกลางแจ้ง พักและดื่มน้ำ'};
  if(h>=26.7)return {level:'caution',label:'พักและดื่มน้ำ',compact:'พักดื่มน้ำ',detail:'เริ่มมีความเสี่ยงจากความร้อนเมื่อสัมผัสนาน ควรพักและดื่มน้ำ'};
 }
 if(t>=35)return {level:'danger',label:'ร้อนจัด เลี่ยงแดด',compact:'เลี่ยงแดดจัด',detail:'อุณหภูมิอากาศสูง แต่ไม่มีข้อมูลความชื้นสำหรับประเมินดัชนีความร้อน ให้ลดการอยู่กลางแดด'};
 if(t>=28)return {level:'caution',label:'ดื่มน้ำและพัก',compact:'พักดื่มน้ำ',detail:'อากาศร้อน ควรดื่มน้ำและพักเมื่อมีกิจกรรมกลางแจ้ง'};
 return {level:'mild',label:'อากาศไม่ร้อนจัด',compact:'อากาศทั่วไป',detail:'อุณหภูมิไม่ร้อนจัด ทั้งนี้ความปลอดภัยขึ้นอยู่กับแสงแดด การออกแรง สุขภาพและสภาพแวดล้อมด้วย'};
}
function paintGuidance(d,h,digits){
 const badge=$('#temp-guidance'),box=$('.temp'),board=$('#board');
 // All number lengths use 90 board-pixel font. Long values move left only.
 box.style.fontSize='90px';box.dataset.tempDigits=String(Math.min(digits,5));box.dataset.longTemp=digits>=4?'yes':'no';
 const offset=digits>=5?-225:digits===4?-185:digits===3?-133:-81;
 const width=typeof box.offsetWidth==='number'&&box.offsetWidth>0?box.offsetWidth:
   (digits>=5?290:digits===4?241:digits===3?185:140);
 const left=Math.max(260,Math.min(405,Math.round(537+offset+width/2-97.5)));
 board.style.setProperty('--temp-guidance-left',left+'px');
 const advice=weatherGuidance(d.temperatureC,h,!!d.historical);
 badge.hidden=!advice;
 badge.textContent=advice?advice.label:'';
 if(!advice){badge.title='';badge.removeAttribute('title');badge.removeAttribute('aria-label');delete badge.dataset.level;return}
 badge.dataset.level=advice.level;
 badge.title=advice.detail;badge.setAttribute('aria-label',advice.detail);
 if(badge.scrollWidth>badge.clientWidth+1)badge.textContent=advice.compact;
}
function paint(d){
 const stamp=$('#source-at'),old=!!d.historical&&!!d.observedAt;
 const observedLabel=d.observedAt?new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(d.observedAt)):'';
 if(stamp){stamp.hidden=!old;stamp.textContent=old?'ข้อมูล ณ '+observedLabel:'';}
 const feeling=$('.feel-value');if(feeling)feeling.hidden=old;
 const board=$('#board');if(board){board.dataset.freshness=old?'HISTORICAL':Number.isFinite(d.temperatureC)?'MODEL_LATEST':'UNAVAILABLE';
  board.setAttribute('aria-label',Number.isFinite(d.temperatureC)?'สภาพอากาศแบบจำลอง Open-Meteo ข้อมูล ณ '+observedLabel:'สภาพอากาศยังไม่มีข้อมูล');}
 const digits=Number.isFinite(d.temperatureC)?String(Math.round(d.temperatureC)).length:1;const h=Number.isFinite(d.temperatureC)&&d.temperatureC>= -50&&d.temperatureC<=60&&Number.isFinite(d.humidityPct)&&d.humidityPct>=0&&d.humidityPct<=100?heat(d.temperatureC,d.humidityPct):null;d.advice=d.historical?null:h>=40?'ระวังร้อนจัด':h>=33?'ระวังร้อน':null;draw(d);paintGuidance(d,h,digits);try{window.UthWeatherHybrid?.render?.(d)}catch(error){document.documentElement.classList.remove("weather-hybrid-ready");document.querySelector("#board")?.classList.remove("layout-hybrid");console.error("weather-hybrid fallback",error)}const id=d.icon;if(id&&scenes[id]){if($('#icon').dataset.condition!==id){$('#scene').src='weather-assets/'+scenes[id]+'.webp';$('#icon').src='weather-assets/'+id+'.apng'+(['rain','thunderstorm','night-rain','night-thunderstorm'].includes(id)?'?v=20261106-storm-clarity-1':'');$('#poster').src='weather-assets/'+id+(['rain','thunderstorm','night-rain','night-thunderstorm'].includes(id)?'-led-poster.png':'-poster.png')+(['rain','thunderstorm','night-rain','night-thunderstorm'].includes(id)?'?v=20261106-storm-clarity-1':'');$('#icon').dataset.condition=id;$('#poster').dataset.condition=id}}else{$('#scene').removeAttribute('src');$('#icon').removeAttribute('src');$('#poster').removeAttribute('src');delete $('#icon').dataset.condition;delete $('#poster').dataset.condition}}
const LAST_GOOD_KEY='uth-weather-last-good';
const FEED_URL='https://raw.githubusercontent.com/aase7en/webapp-widget/weather-data/weather.json';
const isNumber=x=>typeof x==='number'&&Number.isFinite(x);
function anySnapshot(raw,now){
 const fresh=UthWeatherSnapshot.parse(raw,now);
 return isNumber(fresh.temperatureC)?fresh:UthWeatherSnapshot.parse(raw,now,{allowHistorical:true});
}
function observedMs(raw){const time=raw?.channels?.weather?.observedAt;return typeof time==='string'?Date.parse(time):NaN}
function better(candidate,current,now){
 const next=anySnapshot(candidate,now),stamp=observedMs(candidate),prev=observedMs(current);
 if(!isNumber(next.temperatureC)||!Number.isFinite(stamp))return false;
 if(!current||!Number.isFinite(prev))return true;
 if(stamp>prev)return true;
 return stamp===prev&&candidate.channels?.forecast&&!current.channels?.forecast;
}
function store(data){try{localStorage.setItem(LAST_GOOD_KEY,JSON.stringify(data))}catch(_){/* localStorage is optional */}}
function stored(){
 try{const raw=localStorage.getItem(LAST_GOOD_KEY),data=raw&&JSON.parse(raw);
 return data&&isNumber(anySnapshot(data,Date.now()).temperatureC)?data:null}catch(_){return null}
}
let pending=false,seq=0,lastGood=null,revalidateTimer=null;
function display(){paint(lastGood?anySnapshot(lastGood,Date.now()):{days:[]})}
function accept(candidate){
 if(better(candidate,lastGood,Date.now())){lastGood=candidate;store(candidate);return true}
 return false;
}
function revalidate(){
 clearTimeout(revalidateTimer);display();
 // At each Bangkok hour recompute the forecast probability. Preserve historical
 // model values instead of treating a clock tick as new observations.
 const now=Date.now();
 revalidateTimer=setTimeout(revalidate,Math.max(1000,(Math.floor(now/3600000)+1)*3600000-now+1));
}
function snapshotJsonp(){
 return new Promise((resolve,reject)=>{
  const id='__uthWeather'+Date.now().toString(36)+(seq++).toString(36),script=document.createElement('script');
  let timer,settled=false;
  function done(error,value){if(settled)return;settled=true;clearTimeout(timer);script.remove();delete window[id];error?reject(error):resolve(value)}
  window[id]=value=>done(null,value);
  script.onerror=()=>done(Error('snapshot unavailable'));
  timer=setTimeout(()=>done(Error('snapshot timeout')),12000);
  script.src=API+'&callback='+id;document.head.appendChild(script);
 });
}
async function fallbackTransport(){
 if(typeof fetch!=='function')return null;
 const ctrl=typeof AbortController==='function'?new AbortController():null;
 const timer=setTimeout(()=>{if(ctrl)ctrl.abort()},9000);
 try{
  const response=await fetch(FEED_URL,{cache:'no-store',...(ctrl?{signal:ctrl.signal}:{})});
  if(!response.ok)return null;
  return UthWeatherSnapshot.fromTransport(await response.json(),Date.now());
 }catch(_){return null}finally{clearTimeout(timer)}
}
async function refresh(){
 if(pending)return;
 pending=true;
 try{
  let sheetIsFresh=false;
  try{
   const response=await snapshotJsonp(),parsed=UthWeatherSnapshot.parse(response,Date.now());
   sheetIsFresh=isNumber(parsed.temperatureC);
   accept(response);
   display(); // Paint any valid Sheet observation immediately; do not wait for a slow fallback.
  }catch(_){/* a failed JSONP read is not a new zero or unavailable value */}
  // A successful owner-bound Sheet read always wins when fresh. The published
  // weather-data branch is a bounded, read-only transport continuity fallback,
  // never a separate canonical datastore or another provider API request.
  if(!sheetIsFresh){
   const candidate=await fallbackTransport();
   if(candidate)accept(candidate);
  }
  display();revalidate();
 }finally{pending=false}
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden){revalidate();refresh()}});
window.addEventListener('pageshow',()=>{revalidate();refresh()});
clock();setInterval(clock,30000);
lastGood=stored();display();revalidate();refresh();setInterval(refresh,300000);
