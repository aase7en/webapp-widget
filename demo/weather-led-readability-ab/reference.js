"use strict";
// Reference-inspired LED renderer. Weather numbers come only from simulated app.js fixtures.
(() => {
 const NS="http://www.w3.org/2000/svg", cache=new WeakMap();
 const fmt=(v,s="")=>Number.isFinite(v)?Math.round(v)+s:"—";
 const heat=v=>!Number.isFinite(v)?"unknown":v>=38?"hot":v>=35?"warm":"cool";
 const tone=v=>!Number.isFinite(v)?"#a2bed0":v>=38?"#ff6253":v>=35?"#ff9a64":v>=33?"#ffce75":v>=29?"#86dfff":"#55caff";
 const e=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n};
 const s=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n};
 function pictogram(kind){
   const svg=s("svg",{class:"rf-weather-svg",viewBox:"0 0 32 24","aria-hidden":"true",focusable:"false"});
   if(kind==="sun"||kind==="partly"){
     const x=kind==="sun"?16:23,y=kind==="sun"?12:8;
     svg.append(s("circle",{cx:x,cy:y,r:kind==="sun"?6:5,fill:"#ffd052",stroke:"#fff1ac","stroke-width":".8"}));
     for(let a=0;a<8;a++){const v=a*Math.PI/4;svg.append(s("line",{x1:(x+8*Math.cos(v)).toFixed(2),y1:(y+8*Math.sin(v)).toFixed(2),x2:(x+10.5*Math.cos(v)).toFixed(2),y2:(y+10.5*Math.sin(v)).toFixed(2),stroke:"#ffd55f","stroke-width":"1.5","stroke-linecap":"round"}));}
   }
   if(kind!=="sun"){
     svg.append(s("path",{d:"M7.4 18a4.2 4.2 0 0 1-1.1-8.3 7.6 7.6 0 0 1 14.3-1.3A4.7 4.7 0 1 1 23.7 18Z",fill:"#e1f3ff",stroke:"#95c8ec","stroke-width":"1.1"}));
     svg.append(s("path",{d:"M7.5 14.6Q14 11.8 23.5 13.2",fill:"none",stroke:"#fff",opacity:".78","stroke-width":"1.1"}));
     if(kind==="rain"||kind==="storm")for(const x of [9,16,23])svg.append(s("path",{d:"M"+x+" 19l-2 4",fill:"none",stroke:"#3dd9ff","stroke-width":"2.2","stroke-linecap":"round"}));
     if(kind==="storm")svg.append(s("path",{d:"M18 12h-5l2 5h-3l4 5 1-5h-2Z",fill:"#ffd45d"}));
   }
   return svg;
 }
 function metricIcon(kind){
   const el=s("svg",{viewBox:"0 0 24 28","aria-hidden":"true"});
   if(kind==="rain"||kind==="humidity"){
     el.append(s("path",{d:"M12 2C7 10.5 4 13.5 4 18a8 8 0 1 0 16 0c0-4.5-3-7.5-8-16Z",fill:kind==="rain"?"#61e1ff":"#5af0d9",stroke:"#d9faff","stroke-width":"1.1"}));
     el.append(s("path",{d:"M8 14q-2 7 3 9",fill:"none",stroke:"#f1ffff","stroke-width":"1.4","stroke-linecap":"round"}));
   }else{
     const c=kind==="high"?"#ff766a":"#61d3ff";
     el.append(s("rect",{x:9,y:2,width:6,height:17,rx:3,fill:"#092943",stroke:c,"stroke-width":"1.7"}));
     el.append(s("circle",{cx:12,cy:21,r:5.3,fill:c,stroke:"#d2f7ff","stroke-width":"1"}));
     el.append(s("rect",{x:11,y:10,width:2,height:12,rx:1,fill:c}));
   }
   return el;
 }
 function drop(){
   const svg=s("svg",{viewBox:"0 0 12 16","aria-hidden":"true"});
   svg.append(s("path",{d:"M6 1C4 5 1 9 1 11a5 5 0 1 0 10 0C11 9 8 5 6 1Z"}));return svg;
 }
 function selectIcon(rain,high,condition){
   if(!Number.isFinite(rain))return "cloud";
   if(rain>=95)return condition==="thunderstorm"?"storm":"rain";
   if(rain>=60)return "rain";
   if(rain>20)return "partly";
   return Number.isFinite(high)&&high>=30?"sun":"partly";
 }
 function ensure(target){
   if(cache.has(target))return cache.get(target);
   const root=target.shadowRoot;if(!root)throw Error("Luxury shadow root must exist");
   const link=e("link");link.rel="stylesheet";link.href="./reference-style.css";root.append(link);
   const board=e("section","rf-board");
   board.innerHTML='<div class="rf-hero"><img class="rf-scene" alt=""><div class="rf-hero-glow"></div><span class="rf-clock"></span><span class="rf-sim">SIM</span><img class="rf-hero-weather" alt=""><img class="rf-hero-weather rf-hero-poster" alt=""><div class="rf-main-temperature"><strong class="rf-temp-number">—</strong><span class="rf-temp-unit">°C</span></div><div class="rf-feels"><span>FEELS</span><strong>—</strong></div><div class="rf-high-badge"><span class="rf-badge-label">HIGH</span><strong>—</strong></div></div><div class="rf-metrics"></div><div class="rf-forecast"><div class="rf-day-grid"></div><svg class="rf-forecast-chart" viewBox="0 0 200 9" preserveAspectRatio="none" aria-hidden="true"></svg></div>';
   const warning=s("svg",{viewBox:"0 0 16 16","aria-hidden":"true"});
   warning.append(s("path",{d:"M8 1 15 14H1Z",fill:"#ffe69a",stroke:"#fff3c5","stroke-width":".6"}));
   warning.append(s("path",{d:"M8 5v5",stroke:"#78491d","stroke-width":"2"}));
   board.querySelector(".rf-high-badge").prepend(warning);
   for(const kind of ["rain","humidity","high","low"]){
     const m=e("div","rf-metric");m.dataset.kind=kind;
     m.append(metricIcon(kind),e("span","rf-metric-label",{rain:"RAIN",humidity:"HUM",high:"HIGH",low:"LOW"}[kind]),e("strong","rf-metric-value","—"));
     board.querySelector(".rf-metrics").append(m);
   }
   root.append(board);cache.set(target,board);return board;
 }
 function renderGraph(svg,values){
   svg.replaceChildren();
   const v=values.filter(Number.isFinite);if(v.length<2)return;
   const lo=Math.min(...v)-1,hi=Math.max(...v)+1;
   const pts=values.map((n,i)=>Number.isFinite(n)?{x:(i+.5)*200/values.length,y:8-(n-lo)*6/(hi-lo),n}:null);
   for(const p of pts)if(p)svg.append(s("line",{class:"rf-guide",x1:p.x,y1:0,x2:p.x,y2:9}));
   for(let i=1;i<pts.length;i++){
     const a=pts[i-1],b=pts[i];if(!a||!b)continue;
     const color=tone((a.n+b.n)/2);
     svg.append(s("path",{class:"rf-area",d:"M"+a.x+" 9 L"+a.x+" "+a.y+" L"+b.x+" "+b.y+" L"+b.x+" 9 Z",fill:color}));
     svg.append(s("line",{class:"rf-line",x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:color}));
   }
   for(const p of pts)if(p)svg.append(s("circle",{class:"rf-dot",cx:p.x,cy:p.y,r:1.65,fill:tone(p.n)}));
 }
 function render(target,{fixture,days,mode,effects,dayName}){
   const board=ensure(target),now=fixture.current;
   board.dataset.heat=heat(now.temp);board.dataset.mode=mode;board.style.setProperty("--rf-days",String(days.length));
   board.classList.toggle("effects-off",!effects);
   const set=(q,val)=>{board.querySelector(q).textContent=val};
   set(".rf-temp-number",fmt(now.temp));set(".rf-feels strong",fmt(now.feels,"°"));
   set(".rf-high-badge strong",fmt(now.high,"°"));
   set(".rf-badge-label",Number.isFinite(now.high)&&now.high>=35?"HOT":"HIGH");
   const scene=board.querySelector(".rf-scene");
   if(scene.dataset.condition!==fixture.condition){
     scene.src="./assets/"+fixture.condition+".webp";
     board.querySelector(".rf-hero-weather:not(.rf-hero-poster)").src="./assets/"+fixture.condition+".apng";
     board.querySelector(".rf-hero-poster").src="./assets/"+fixture.condition+"-poster.png";
     scene.dataset.condition=fixture.condition;
   }
   const units={rain:"%",humidity:"%",high:"°",low:"°"};
   for(const kind of Object.keys(units)){
     const m=board.querySelector('.rf-metric[data-kind="'+kind+'"]');
     m.querySelector(".rf-metric-value").textContent=fmt(now[kind],units[kind]);
     m.dataset.heat=kind==="high"?heat(now.high):"";
     m.setAttribute("aria-label",{rain:"ฝน",humidity:"ความชื้น",high:"อุณหภูมิสูง",low:"อุณหภูมิต่ำ"}[kind]+" "+fmt(now[kind],units[kind]));
   }
   const cards=days.map(i=>{
     const [high,low,rain]=fixture.forecast[i],day=e("div","rf-day");
     day.dataset.day=String(i);
     day.title=dayName(i)+" สูง "+fmt(high,"°")+" ต่ำ "+fmt(low,"°")+" ฝน "+fmt(rain,"%");
     day.append(e("span","rf-day-name",dayName(i)),pictogram(selectIcon(rain,high,fixture.condition)));
     const temps=e("div","rf-temps"),a=e("span","rf-day-high",fmt(high,"°"));
     a.dataset.heat=heat(high);
     temps.append(a,e("span","rf-divider","/"),e("span","rf-day-low",fmt(low,"°")));
     const rainEl=e("div","rf-rain");rainEl.append(drop(),e("span",null,fmt(rain,"%")));
     day.append(temps,rainEl);return day;
   });
   board.querySelector(".rf-day-grid").replaceChildren(...cards);
   renderGraph(board.querySelector(".rf-forecast-chart"),days.map(i=>fixture.forecast[i][0]));
   target.dataset.referenceMode=mode;
   return board;
 }
 function clock(target,time){const board=cache.get(target);if(board)board.querySelector(".rf-clock").textContent=time}
 window.WeatherReferenceRenderer=Object.freeze({render,clock,tone,heat});
})();