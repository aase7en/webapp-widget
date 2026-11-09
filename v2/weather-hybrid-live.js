/* Production Luxury + Icons 4+3 renderer. No fixtures, API requests or synthetic observations. */
(function(root){
'use strict';
const panel=document.getElementById('weather-hybrid-panel'),board=document.getElementById('board');
if(!panel||!board)return; // The verified original Weather renderer remains the fallback.
const ns='http://www.w3.org/2000/svg', fmt=(v,s='')=>Number.isFinite(v)?Math.round(v)+s:'—';
const heat=v=>!Number.isFinite(v)?'unknown':v>=38?'hot':v>=35?'warm':'cool';
const e=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
const svg=(tag,attrs={})=>{const n=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([key,val])=>n.setAttribute(key,String(val)));return n};
const metrics=e('div','hybrid-metrics'),daysEl=e('div','hybrid-days');
const names={rain:'RAIN',humidity:'HUM',high:'HIGH',low:'LOW'};
const values={rain:'%',humidity:'%',high:'°',low:'°'};
const ariaNames={rain:'โอกาสฝนตก',humidity:'ความชื้น',high:'อุณหภูมิสูงสุด',low:'อุณหภูมิต่ำสุด'};
function metricIcon(kind){
 const s=svg('svg',{viewBox:'0 0 24 28','aria-hidden':'true',focusable:'false'});
 if(kind==='rain'||kind==='humidity'){
  s.append(svg('path',{d:'M12 2C7 10.5 4 13.5 4 18a8 8 0 1 0 16 0c0-4.5-3-7.5-8-16Z',fill:kind==='rain'?'#61e1ff':'#5af0d9',stroke:'#d9faff','stroke-width':'1.1'}));
  s.append(svg('path',{d:'M8 14q-2 7 3 9',fill:'none',stroke:'#f1ffff','stroke-width':'1.4','stroke-linecap':'round'}));
 }else{
  const c=kind==='high'?'#ff766a':'#61d3ff';
  s.append(svg('rect',{x:9,y:2,width:6,height:17,rx:3,fill:'#092943',stroke:c,'stroke-width':'1.7'}));
  s.append(svg('circle',{cx:12,cy:21,r:5.3,fill:c,stroke:'#d2f7ff','stroke-width':'1'}));
  s.append(svg('rect',{x:11,y:10,width:2,height:12,rx:1,fill:c}));
 }
 return s;
}
function drop(){
 const s=svg('svg',{viewBox:'0 0 12 16','aria-hidden':'true'});
 s.append(svg('path',{d:'M6 1C4 5 1 9 1 11a5 5 0 1 0 10 0C11 9 8 5 6 1Z'}));
 return s;
}
function pictogram(code){
 if(!['partly-cloudy','cloudy','fog','wind','rain','thunderstorm','night','night-rain','night-wind','night-thunderstorm'].includes(code))return e('span','hybrid-missing-icon','—');
 const s=svg('svg',{viewBox:'0 0 32 24',class:'rf-weather-svg hybrid-day-icon','aria-hidden':'true'});
 const moon=code.startsWith('night'),isStorm=code.includes('thunderstorm'),isRain=code.includes('rain')||isStorm;
 if(code==='partly-cloudy'||moon){
  if(moon){
   s.append(svg('path',{d:'M22 2A8 8 0 1 0 28 15 8 8 0 0 1 22 2Z',fill:'#d7edff',stroke:'#7bc8ff','stroke-width':'.8'}));
  }else{
   s.append(svg('circle',{cx:22,cy:8,r:5,fill:'#ffd052',stroke:'#fff1ac','stroke-width':'.8'}));
   for(let i=0;i<8;i++){const a=i*Math.PI/4;s.append(svg('line',{x1:(22+8*Math.cos(a)).toFixed(2),y1:(8+8*Math.sin(a)).toFixed(2),x2:(22+10.5*Math.cos(a)).toFixed(2),y2:(8+10.5*Math.sin(a)).toFixed(2),stroke:'#ffd55f','stroke-width':'1.4','stroke-linecap':'round'}))}
  }
 }
 if(code!=='night'){
  s.append(svg('path',{d:'M7.4 18a4.2 4.2 0 0 1-1.1-8.3 7.6 7.6 0 0 1 14.3-1.3A4.7 4.7 0 1 1 23.7 18Z',fill:'#e1f3ff',stroke:'#95c8ec','stroke-width':'1.1'}));
  s.append(svg('path',{d:'M7.5 14.6Q14 11.8 23.5 13.2',fill:'none',stroke:'#fff',opacity:'.78','stroke-width':'1.1'}));
  if(isRain)for(const x of [9,16,23])s.append(svg('path',{d:'M'+x+' 19l-2 4',fill:'none',stroke:'#3dd9ff','stroke-width':'2.2','stroke-linecap':'round'}));
  if(isStorm)s.append(svg('path',{d:'M18 12h-5l2 5h-3l4 5 1-5h-2Z',fill:'#ffd45d'}));
  if(code==='fog')for(const y of [19,22])s.append(svg('path',{d:'M4 '+y+'h24',stroke:'#c3ebff','stroke-width':'.9','stroke-linecap':'round',opacity:'.7'}));
  if(code.includes('wind'))for(const y of [20,23])s.append(svg('path',{d:'M4 '+y+'h24',stroke:'#7bdeff','stroke-width':'.9','stroke-linecap':'round'}));
 }
 return s;
}
for(const kind of Object.keys(names)){
 const cell=e('div','hybrid-metric'),label=e('span','hybrid-label',names[kind]),value=e('strong','hybrid-value','—');
 cell.dataset.kind=kind;cell.append(metricIcon(kind),label,value);metrics.append(cell);
}
panel.append(metrics,daysEl);
let current=null,page=0;
function stampLabel(observedAt){
 const ms=typeof observedAt==='string'?Date.parse(observedAt):NaN;
 if(!Number.isFinite(ms))return 'ข้อมูลเก่า';
 return 'ข้อมูล ณ '+new Intl.DateTimeFormat('th-TH',{timeZone:'Asia/Bangkok',day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(ms));
}
function card(x,index){
 const item=e('div','hybrid-day');item.dataset.day=String(index);
 item.title=x?[
   x.date||'วันไม่ระบุ','สูงสุด '+fmt(x.hi,'°'),'ต่ำสุด '+fmt(x.lo,'°'),'ฝน '+fmt(x.p,'%'),
   'สภาพอากาศ '+(x.ico||'ไม่พร้อม')
 ].join(' · '):'ไม่มีข้อมูลพยากรณ์รายวัน';
 item.append(e('span','hybrid-day-name',x?.day||'—'),pictogram(x?.ico));
 const temp=e('div','hybrid-day-temp'),high=e('span','hybrid-high',fmt(x?.hi,'°'));
 high.dataset.heat=heat(x?.hi);
 temp.append(high,e('span','hybrid-slash','/'),e('span','hybrid-low',fmt(x?.lo,'°')));
 const rain=e('div','hybrid-rain');rain.append(drop(),e('span',null,fmt(x?.p,'%')));
 item.append(temp,rain);return item;
}
function draw(){
 const d=current||{days:[]},available=Array.isArray(d.days)?d.days:[],range=page===0?[0,1,2,3]:[4,5,6];
 const freshness=board.dataset.freshness||'UNAVAILABLE';
 panel.dataset.page=String(page);panel.dataset.freshness=freshness;
 panel.dataset.forecast=available.length?'MODEL_FORECAST':'UNAVAILABLE';
 panel.dataset.observedAt=typeof d.observedAt==='string'?d.observedAt:'';
 panel.dataset.source=d.provenance||'UNAVAILABLE';
 panel.style.setProperty('--hybrid-day-count',String(range.length));
 for(const kind of Object.keys(names)){
  const cell=metrics.querySelector('.hybrid-metric[data-kind="'+kind+'"]');
  const number={rain:d.rainPct,humidity:d.humidityPct,high:d.high,low:d.low}[kind];
  cell.querySelector('.hybrid-value').textContent=fmt(number,values[kind]);
  cell.dataset.heat=kind==='high'?heat(number):'';
  cell.setAttribute('aria-label',ariaNames[kind]+' '+fmt(number,values[kind]));
 }
 daysEl.replaceChildren(...range.map(i=>card(available[i],i)));
 panel.setAttribute('aria-label',[
   'พยากรณ์จากแบบจำลอง Open-Meteo',
   freshness==='UNAVAILABLE'?'ไม่พร้อม':freshness==='HISTORICAL'?'ข้อมูลเดิม: '+stampLabel(d.observedAt):'ข้อมูลล่าสุดจากแบบจำลอง',
   available.length?'':'พยากรณ์รายวันไม่พร้อม',
   'วัน '+(page===0?'1 ถึง 4':'5 ถึง 7')
 ].join(' · '));
 board.classList.add('layout-hybrid');
 document.documentElement.classList.add('weather-hybrid-ready');
}
function render(d){current=d;draw();}
function rotate(){if(document.hidden)return;page=page===0?1:0;draw();}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&current)draw()});
const timer=setInterval(rotate,9000);
root.UthWeatherHybrid=Object.freeze({render,getState:()=>({page,dayCount:page===0?4:3,source:current?.provenance||null,observedAt:current?.observedAt||null,freshness:panel.dataset.freshness||'UNAVAILABLE'}),intervalMs:9000});
})(window);