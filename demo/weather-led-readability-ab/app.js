"use strict";
(() => {
  // LIVE Production Weather layout template is used in an isolated Shadow DOM.
  // Only local SIMULATED fixtures are shown. No backend calls or sensor readings.
  const layout=window.UTH_WEATHER_LUXURY_TEMPLATE;
  if(!layout)throw Error("Production Luxury template not loaded");
  const $=id=>document.getElementById(id);
  const cases=Object.freeze({
    normal:{condition:"rain",current:{temp:28,feels:34,rain:54,humidity:85,high:33,low:25},forecast:[[33,25,81],[33,24,92],[31,24,87],[32,25,71],[32,25,84],[32,24,31],[30,23,6]]},
    edge:{condition:"thunderstorm",current:{temp:42,feels:48,rain:100,humidity:100,high:45,low:-9},forecast:[[45,-9,100],[41,29,100],[40,28,99],[39,25,100],[44,31,100],[42,-8,0],[38,25,87]]},
    missing:{condition:"cloudy",current:{temp:null,feels:null,rain:0,humidity:null,high:null,low:25},forecast:[[null,25,null],[0,0,0],[32,null,10],[null,null,null],[33,25,0],[null,-2,100],[28,21,45]]}
  });
  const state={mode:"A",page:0,scenario:"normal",seconds:9,paused:window.matchMedia("(prefers-reduced-motion: reduce)").matches,zoom:4,effects:true,compact:true};
  const boards=new WeakMap();
  let deadline=Date.now()+9000;
  const fmt=(n,u="")=>Number.isFinite(n)?Math.round(n)+u:"—";
  const ns="http://www.w3.org/2000/svg";
  function make(tag,cls,value){
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(value!==undefined)node.textContent=value;
    return node;
  }
  function boardFor(target){
    if(boards.has(target))return boards.get(target);
    const shadow=target.attachShadow({mode:"open"});
    const base=document.createElement("style");base.textContent=layout.css;
    const over=document.createElement("link");over.rel="stylesheet";over.href="./luxury-overrides.css";
    const html=document.createElement("template");html.innerHTML=layout.html;
    shadow.append(base,over,html.content.cloneNode(true));
    const board=shadow.querySelector("#board");
    if(!board)throw Error("Production board missing");
    board.setAttribute("aria-label","ข้อมูลอากาศจำลอง · Luxury Weather Demo");
    boards.set(target,board);return board;
  }
  function localDay(i){
    return new Intl.DateTimeFormat("th-TH",{weekday:"short",timeZone:"Asia/Bangkok"}).format(new Date(Date.now()+i*86400000));
  }
  function clock(){
    const now=new Date();
    const time=new Intl.DateTimeFormat("th-TH",{timeZone:"Asia/Bangkok",hour:"2-digit",minute:"2-digit",hour12:false}).format(now);
    const date=new Intl.DateTimeFormat("th-TH",{timeZone:"Asia/Bangkok",weekday:"short",day:"numeric",month:"short",year:"2-digit"}).format(now);
    for(const target of [$("native-stage"),$("zoom-stage")]){
      const board=boardFor(target);
      board.querySelector("#time").textContent=time;
      board.querySelector("#date").textContent=date;
    }
  }
  function color(x){
    if(!Number.isFinite(x))return "#86d6ec";
    if(x<=24)return "#50cafa";
    if(x<=28)return "#64dc95";
    if(x<=33)return "#ffc37c";
    return "#ff8963";
  }
  function drawGraph(board,fixture,days){
    const svg=board.querySelector(".graph");
    const line=svg.querySelector("#line"),area=svg.querySelector("#area"),grad=svg.querySelector("#graphfill"),points=svg.querySelector("#points");
    const vals=days.map(i=>fixture.forecast[i][0]);
    const valid=vals.filter(Number.isFinite);
    grad.replaceChildren();points.replaceChildren();
    if(valid.length<2){line.setAttribute("d","");area.setAttribute("d","");return;}
    const low=Math.min(...valid)-1,high=Math.max(...valid)+1;
    let path="",drawing=false;
    vals.forEach((v,i)=>{
      if(!Number.isFinite(v)){drawing=false;return;}
      const x=i*350/(vals.length-1),y=18-(v-low)*16/(high-low);
      path+=(drawing?" L":" M")+x.toFixed(2)+" "+y.toFixed(2);drawing=true;
      const dot=document.createElementNS(ns,"circle");dot.setAttribute("cx",x);dot.setAttribute("cy",y);dot.setAttribute("r","2");points.append(dot);
    });
    vals.forEach((v,i)=>{
      const stop=document.createElementNS(ns,"stop");
      stop.setAttribute("offset",i*100/(vals.length-1)+"%");
      stop.setAttribute("stop-color",color(v));grad.append(stop);
    });
    line.setAttribute("d",path.trim());
    area.setAttribute("d",""); // Do not interpolate missing measurements.
  }
  function paint(target){
    const board=boardFor(target),fixture=cases[state.scenario],d=fixture.current;
    const days=state.mode==="A"?[0,1,2,3,4,5,6]:state.page===0?[0,1,2,3]:[4,5,6];
    board.dataset.mode=state.mode;
    board.style.setProperty("--forecast-columns",String(days.length));
    board.classList.toggle("effects-off",!state.effects);
    board.classList.toggle("layout-compact",state.compact);
    const set=(id,value)=>{board.querySelector("#"+id).textContent=value;};
    set("temp",fmt(d.temp));set("feels",fmt(d.feels,"°"));
    set("rain",fmt(d.rain,"%"));set("humidity",fmt(d.humidity,"%"));
    set("high",fmt(d.high,"°"));set("low",fmt(d.low,"°"));
    for(const id of ["rain","humidity","high","low"])board.querySelector("#"+id).classList.add("metric-value");
    const tag=board.querySelector("#advice");
    tag.hidden=false;tag.textContent="SIM";tag.title="SIMULATED DATA · ข้อมูลจำลอง ไม่ใช่สถานการณ์จริง";
    const icon=board.querySelector("#icon"),poster=board.querySelector("#poster"),scene=board.querySelector("#scene");
    if(icon.dataset.condition!==fixture.condition){
      scene.src="./assets/"+fixture.condition+".webp";
      icon.src="./assets/"+fixture.condition+".apng";
      poster.src="./assets/"+fixture.condition+"-poster.png";
      icon.dataset.condition=fixture.condition;
      poster.dataset.condition=fixture.condition;
    }
    const cells=days.map(i=>{
      const [hi,low,rain]=fixture.forecast[i];
      const cell=make("div","day day-cell");cell.dataset.day=String(i);
      cell.title=localDay(i)+" สูงสุด "+fmt(hi,"°")+" ต่ำสุด "+fmt(low,"°")+" ฝน "+fmt(rain,"%");
      const name=make("span","day-name",localDay(i));
      const tempRow=make("div","day-temps");
      for(const [cls,txt] of [["day-high",fmt(hi,"°")],["day-divider","/"],["day-low",fmt(low,"°")]])tempRow.append(make("span",cls,txt));
      const rainRow=make("div","day-rain");
      const drop=document.createElement("img");drop.src="./assets/drop.png";drop.alt="";
      rainRow.append(drop,make("span","rain-number",fmt(rain,"%")));
      rainRow.setAttribute("aria-label","โอกาสฝน "+fmt(rain,"%"));
      cell.append(name,tempRow,rainRow);return cell;
    });
    board.querySelector("#days").replaceChildren(...cells);
    drawGraph(board,fixture,days);
    target.setAttribute("aria-label","Weather Luxury · SIMULATED ข้อมูลจำลอง · "+days.map(i=>localDay(i)+" "+fmt(fixture.forecast[i][0],"°")+" ฝน "+fmt(fixture.forecast[i][2],"%")).join(" · "));
  }
  function renderTable(){
    const body=$("details-body"),forecast=cases[state.scenario].forecast;
    body.replaceChildren(...forecast.map(([high,low,rain],i)=>{
      const row=document.createElement("tr");
      for(const item of [localDay(i),fmt(high),fmt(low),fmt(rain)])row.append(make("td",null,item));
      return row;
    }));
  }
  function renderControls(){
    const b=state.mode==="B";
    $("opt-a").classList.toggle("selected",!b);$("opt-b").classList.toggle("selected",b);
    $("opt-a").setAttribute("aria-pressed",String(!b));$("opt-b").setAttribute("aria-pressed",String(b));
    for(const id of ["prev","next","pause"])$(id).disabled=!b;
    $("pause").textContent=state.paused?"เริ่มสลับ":"หยุดสลับ";
    $("effects").textContent=state.effects?"ภาพฉาก + Animation: เปิด":"ภาพฉาก + Animation: ปิด";
    $("effects").setAttribute("aria-pressed",String(state.effects));
    $("layout").textContent=state.compact?"จัดวาง: ขยับซ้าย":"จัดวาง: ต้นฉบับ";
    $("layout").setAttribute("aria-pressed",String(state.compact));
    $("page-status").textContent=b?"Option B · หน้า "+(state.page+1)+"/2 · "+(state.page===0?"วัน 1–4":"วัน 5–7"):"Option A · ครบ 7 วัน";
    $("rotation-status").textContent=b?(state.paused?"หยุดสลับชั่วคราว":"สลับทุก "+state.seconds+" วินาที"):"โหมด A แสดง 7 วันพร้อมกัน";
  }
  function render(){paint($("native-stage"));paint($("zoom-stage"));clock();renderTable();renderControls();}
  function reset(){deadline=Date.now()+state.seconds*1000;}
  function setMode(mode){if(!["A","B"].includes(mode))return;state.mode=mode;state.page=0;reset();render();}
  function setPage(page){if(state.mode!=="B")return;state.page=page===1?1:0;reset();render();}
  function setScenario(v){if(!Object.hasOwn(cases,v))return;state.scenario=v;$("scenario").value=v;reset();render();}
  function setPaused(v){state.paused=!!v;reset();renderControls();}
  function setEffects(v){state.effects=!!v;render();}
  function setCompact(v){state.compact=!!v;render();}
  function setIntervalSeconds(v){if(![8,9,10].includes(Number(v)))return;state.seconds=Number(v);$("interval").value=String(v);reset();renderControls();}
  function setZoom(v){
    state.zoom=Math.max(1,Math.min(8,Math.round(Number(v)||1)));
    $("zoom").value=String(state.zoom);
    $("zoom-value").textContent=state.zoom+"×";
    $("zoom-frame").style.width=432*state.zoom+"px";
    $("zoom-frame").style.height=40*state.zoom+"px";
    $("zoom-stage").style.setProperty("--zoom",String(state.zoom));
  }
  $("opt-a").addEventListener("click",()=>setMode("A"));
  $("opt-b").addEventListener("click",()=>setMode("B"));
  $("prev").addEventListener("click",()=>setPage(1-state.page));
  $("next").addEventListener("click",()=>setPage(1-state.page));
  $("pause").addEventListener("click",()=>setPaused(!state.paused));
  $("effects").addEventListener("click",()=>setEffects(!state.effects));
  $("layout").addEventListener("click",()=>setCompact(!state.compact));
  $("scenario").addEventListener("change",e=>setScenario(e.target.value));
  $("interval").addEventListener("change",e=>setIntervalSeconds(e.target.value));
  $("zoom").addEventListener("input",e=>setZoom(e.target.value));
  document.addEventListener("visibilitychange",()=>{if(!document.hidden){reset();clock();}});
  window.setInterval(()=>{if(state.mode==="B"&&!state.paused&&!document.hidden&&Date.now()>=deadline)setPage(1-state.page);},200);
  window.setInterval(clock,30000);
  window.WeatherLedDemo=Object.freeze({
    getState:()=>({...state,dayCount:7,visibleDays:state.mode==="A"?7:state.page===0?4:3,
      source:"SIMULATED / LOCAL FIXTURE",observedAt:null,productionTemplateSha256:layout.productionSha256}),
    setMode,setPage,setScenario,setPaused,setEffects,setCompact,setIntervalSeconds,setZoom
  });
  setZoom(state.zoom);render();
})();