/* Five-hour forecast from local read-only bridge (Open-Meteo model). */
(()=>{
'use strict';
const $=s=>document.querySelector(s),valid=n=>typeof n==='number'&&Number.isFinite(n);
/* Older-engine safe node clearing (firstChild loop). */
const clearNode=el=>{while(el&&el.firstChild)el.removeChild(el.firstChild)};
function showSource(text){
 const label=(parent!==window?parent.document:document).getElementById('weather-source');
 if(label)label.textContent=text;
}
const weatherIcon=code=>{
 if(!Number.isInteger(code))return 'cloud';
 if(code<=1)return 'partly';
 if(code<=3||code===45||code===48)return 'cloud';
 if(code>=95)return 'storm';
 if((code>=51&&code<=82)||(code>=85&&code<=86))return 'rain';
 return 'cloud';
};
function heat(temp,humidity){
 if(!valid(temp)||!valid(humidity))return null;
 const t=temp*9/5+32,rh=humidity;
 let hi=(.5*(t+61+1.2*(t-68)+.094*rh)+t)/2;
 if(hi>=80){
 hi=-42.379+2.04901523*t+10.14333127*rh-.22475541*t*rh-.00683783*t*t-.05481717*rh*rh
 +.00122874*t*t*rh+.00085282*t*rh*rh-.00000199*t*t*rh*rh;
 if(rh<13&&t>=80&&t<=112)hi-=(13-rh)/4*Math.sqrt((17-Math.abs(t-95))/17);
 if(rh>85&&t>=80&&t<=87)hi+=(rh-85)/10*((87-t)/5);
 }
 return (hi-32)*5/9;
}
const ns='http://www.w3.org/2000/svg';
function createSVG(kind){
 const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 32 32');
 const use=document.createElementNS(ns,'use');use.setAttribute('href','#'+kind);svg.appendChild(use);
 if(kind==='rain'||kind==='storm'){
 const group=document.createElementNS(ns,'g');group.setAttribute('class','rain-particles');
 [7,17.7,26].forEach((x,i)=>{
 const d=document.createElementNS(ns,'path');d.setAttribute('class','rain-drop');
 d.setAttribute('d','M'+x+' 23l-1 4 2-.2Z');d.setAttribute('fill','url(#neonRain)');
 d.style.animationDelay=['-.06s','-.49s','-.92s'][i];group.appendChild(d);
 });
 svg.appendChild(group);
 if(kind==='storm'){
 const bolt=document.createElementNS(ns,'path');bolt.setAttribute('class','lightning-bolt');
 bolt.setAttribute('d','M16.5 20.9H23L19.6 25.2H22.1L13.3 32L15.1 26.4H12.8Z');
 bolt.setAttribute('fill','url(#goldBolt)');bolt.setAttribute('stroke','#fff6a0');bolt.setAttribute('stroke-width','.65');
 svg.appendChild(bolt);
 }
 }
 // Non-blurring specular arc follows the original SVG artwork/animation.
 const gleam=document.createElementNS(ns,'path');
 gleam.setAttribute('class','uth-icon-specular');
 gleam.setAttribute('d','M7.5 12.4 Q12.2 6.6 19.1 8.6');
 gleam.setAttribute('fill','none');
 gleam.setAttribute('stroke','#f6ffff');
 gleam.setAttribute('stroke-width','1.1');
 gleam.setAttribute('stroke-linecap','round');
 svg.appendChild(gleam);
 return svg;
}
function setClock(){
 const now=new Date();
 const t=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit',hour12:false}).format(now);
 const day=new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',weekday:'short',day:'numeric',month:'short',year:'2-digit'}).format(now);
 $('#mock-time').textContent=t;$('#mock-day').textContent=day;
}
function noData(){
 $('.temp strong').textContent='—';$('.hi strong').textContent='—';$('.place').textContent='ต.อุทัย · รอข้อมูล';
 clearNode($('#hours'));
 for(let i=0;i<5;i++){
 const item=document.createElement('div');item.className='hour';item.dataset.weather='none';
 const lbl=document.createElement('span');lbl.className='t';lbl.textContent='--:--';
 const pct=document.createElement('span');pct.className='rain-pct';pct.textContent='—%';
 item.append(lbl,createSVG('cloud'),pct);$('#hours').append(item);
 }
 $('.warning .pill').lastChild.textContent='รอข้อมูล';
 $('.warning .under').textContent='พยากรณ์ไม่พร้อม';
 showSource('UNAVAILABLE · ไม่ใช้ข้อมูลจำลองแทน');
}
function paint(d){
 const weather=d.weather||{},f=d.forecast||{};
 if(weather.status!=='model_latest'||!valid(weather.temperatureC)){noData();return;}
 $('.temp strong').textContent=Math.round(weather.temperatureC)+'°';
 const hi=heat(weather.temperatureC,weather.humidityPct);
 $('.hi strong').textContent=valid(hi)?Math.round(hi)+'°':'—';
 const kind=weatherIcon(weather.weatherCode);
 const icon=$('#current-weather-icon');
 const box=icon?icon.closest('.current'):null;
 if(icon&&box){
 box.dataset.weather=kind==='partly'?'partly':kind;
 icon.setAttribute('viewBox','0 0 32 32');clearNode(icon);
 const scene=createSVG(kind);while(scene.firstChild)icon.append(scene.firstChild);
 }
 $('.place').textContent='ต.อุทัย · แบบจำลอง';
 clearNode($('#hours'));
 const hourData=f.status==='model_forecast'?f.hours:[];
 for(let i=0;i<5;i++){
 const forecast=hourData[i]||{},wx=weatherIcon(forecast.weatherCode);
 const item=document.createElement('div');item.className='hour';item.dataset.weather=hourData[i]?wx:'none';
 const t=document.createElement('span');t.className='t';t.textContent=forecast.time||'--:--';
 const pct=document.createElement('span');pct.className='rain-pct';pct.textContent=valid(forecast.rainProbabilityPct)?forecast.rainProbabilityPct+'%':'—%';
 item.append(t,createSVG(hourData[i]?wx:'cloud'),pct);$('#hours').append(item);
 }
 $('.warning .pill').lastChild.textContent='ข้อมูลอากาศ';
 $('.warning .under').textContent='พยากรณ์แบบจำลอง';
 showSource('Open-Meteo · พิกัดต.อุทัย · แบบจำลอง ณ '+new Date(weather.observedAt).toLocaleTimeString('th-TH',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit'}));
}
async function refresh(){
 try{paint(await window.UthApiClient.getLive())}
 catch{noData()}
}
setClock();setInterval(setClock,60000);noData();refresh();setInterval(refresh,300000);
})();
