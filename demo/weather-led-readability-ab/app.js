"use strict";
(() => {
  // Self-contained VISUAL FIXTURES: no fetch, sensor feed, Sheet, Script, or production side effects.
  const dayNames = ["พุธ","พฤ","ศุกร์","เสาร์","อา","จ","อ"];
  const longDayNames = ["พุธ","พฤหัสบดี","ศุกร์","เสาร์","อาทิตย์","จันทร์","อังคาร"];
  const source = "SIMULATED / LOCAL FIXTURE";
  const conditions = Object.freeze({normal:"rain",edge:"thunderstorm",missing:"cloudy"});
  const observedAt = null;
  const cases = Object.freeze({
    normal: {
      current: {temp:28,rain:54,humidity:85,high:33,low:25},
      forecast: [[33,25,81],[33,24,92],[31,24,87],[32,25,71],[32,25,84],[32,24,31],[30,23,6]]
    },
    edge: {
      current: {temp:42,rain:100,humidity:100,high:45,low:-9},
      forecast: [[45,-9,100],[41,29,100],[40,28,99],[39,25,100],[44,31,100],[42,-8,0],[38,25,87]]
    },
    missing: {
      current: {temp:null,rain:0,humidity:null,high:null,low:25},
      forecast: [[null,25,null],[0,0,0],[32,null,10],[null,null,null],[33,25,0],[null,-2,100],[28,21,45]]
    }
  });
  const $ = id => document.getElementById(id);
  const state = {mode:"A",page:0,scenario:"normal",seconds:9,paused:window.matchMedia("(prefers-reduced-motion: reduce)").matches,zoom:4,effects:true};
  let deadline = Date.now() + 9000;
  const format = value => Number.isFinite(value) ? String(value) : "—";
  const deg = value => Number.isFinite(value) ? value + "°" : "—";
  const pct = value => Number.isFinite(value) ? value + "%" : "—";

  function el(tag,className,text,attributes) {
    const node = document.createElement(tag);
    if(className) node.className = className;
    if(text !== undefined) node.textContent = text;
    if(attributes) for(const [key,val] of Object.entries(attributes)) node.setAttribute(key,val);
    return node;
  }
  const SVG_NS = "http://www.w3.org/2000/svg";
  function icon(kind) {
    // Filled shapes at 8–10px. Icon titles/accessible names remain in metric aria-label.
    const shapes = {
      rain: ["M6 16a4 4 0 0 1-.8-7.9A6 6 0 0 1 16.5 7 4.3 4.3 0 0 1 18 16H6Z","M8 17h2l-1.6 4H6.4ZM14 17h2l-1.6 4h-2Z"],
      humidity: ["M12 2C9 6.2 5 10 5 14.2a7 7 0 1 0 14 0C19 10 15 6.2 12 2Z"],
      high: ["M12 3 3 18h18Z"],
      low: ["m12 21 9-15H3Z"]
    };
    const svg = document.createElementNS(SVG_NS,"svg");
    svg.setAttribute("class","metric-symbol symbol-"+kind);
    svg.setAttribute("viewBox","0 0 24 24");
    svg.setAttribute("aria-hidden","true");
    svg.setAttribute("focusable","false");
    for(const d of shapes[kind]) {
      const path=document.createElementNS(SVG_NS,"path");
      path.setAttribute("d",d);
      svg.append(path);
    }
    return svg;
  }
  function miniTrend(forecast,indices) {
    // Decorative chart uses only existing simulated fixture highs; never bridges missing values.
    const vals=indices.map(i=>forecast[i][0]);
    const valid=vals.filter(Number.isFinite);
    if(valid.length<2)return null;
    const low=Math.min(...valid)-1,high=Math.max(...valid)+1;
    const points=vals.map((v,i)=>Number.isFinite(v)?[i*100/(vals.length-1),13-(v-low)*10/(high-low)]:null);
    let d="",lastValid=false;
    for(const p of points) {
      if(!p){lastValid=false;continue;}
      d+=(lastValid?"L":"M")+p[0].toFixed(2)+" "+p[1].toFixed(2)+" ";
      lastValid=true;
    }
    const svg=document.createElementNS(SVG_NS,"svg");
    svg.setAttribute("class","mini-trend");
    svg.setAttribute("viewBox","0 0 100 16");
    svg.setAttribute("preserveAspectRatio","none");
    svg.setAttribute("aria-hidden","true");
    const path=document.createElementNS(SVG_NS,"path");
    path.setAttribute("d",d.trim());svg.append(path);
    return svg;
  }
  function metric(label,value,kind) {
    const node = el("div","metric",undefined,{"data-kind":kind,"title":label+" "+value,"aria-label":label+" "+value});
    const symbol=el("span","metric-label");
    symbol.append(icon(kind));
    node.append(symbol,el("strong","metric-value",value));
    return node;
  }
  function buildStage(target) {
    const fixture = cases[state.scenario];
    const days = state.mode === "A" ? [0,1,2,3,4,5,6] : state.page === 0 ? [0,1,2,3] : [4,5,6];
    target.classList.toggle("mode-b",state.mode==="B");
    target.classList.toggle("effects-off",!state.effects);
    target.style.setProperty("--columns",String(days.length));
    const condition = conditions[state.scenario];
    const today = el("div","today-block");
    const scene = el("img","today-scene",undefined,{src:"./assets/"+condition+".webp",alt:"",decoding:"async","aria-hidden":"true"});
    const now = el("div","today-main");
    const animated = el("img","today-animation",undefined,{src:"./assets/"+condition+".apng",alt:"",decoding:"async","aria-hidden":"true"});
    const poster = el("img","today-poster",undefined,{src:"./assets/"+condition+"-poster.png",alt:"","aria-hidden":"true"});
    now.append(el("span","today-tag","SIM"),animated,poster,el("strong","today-temp",deg(fixture.current.temp)));
    const metrics = el("div","today-metrics");
    metrics.append(
      metric("ฝน",pct(fixture.current.rain),"rain"),
      metric("ชื้น",pct(fixture.current.humidity),"humidity"),
      metric("สูง",deg(fixture.current.high),"high"),
      metric("ต่ำ",deg(fixture.current.low),"low")
    );
    today.append(scene,now,metrics);
    const forecast = el("div","forecast-grid");
    days.forEach(index => {
      const [high,low,rain] = fixture.forecast[index];
      const cell = el("div","day-cell",undefined,{"data-day":String(index),"title":longDayNames[index]+" สูงสุด "+deg(high)+" ต่ำสุด "+deg(low)+" โอกาสฝน "+pct(rain)});
      const temps = el("div","day-temps");
      temps.append(el("span","day-high",deg(high)),el("span","day-divider","/"),el("span","day-low",deg(low)));
      const rainEl = el("div","day-rain",undefined,{"aria-label":"โอกาสฝน "+pct(rain)});
      rainEl.append(icon("rain"),el("span","rain-number",pct(rain)));
      cell.append(el("div","day-name",dayNames[index]),temps,rainEl);
      forecast.append(cell);
    });
    const trend=miniTrend(fixture.forecast,days);
    if(trend)forecast.append(trend);
    target.replaceChildren(today,forecast);
    target.setAttribute("aria-label","ข้อมูลจำลอง วันนี้ "+deg(fixture.current.temp)+" ฝน "+pct(fixture.current.rain)+" ชื้น "+pct(fixture.current.humidity)+" สูง "+deg(fixture.current.high)+" ต่ำ "+deg(fixture.current.low)+" พยากรณ์ "+days.map(i=>longDayNames[i]+" "+deg(fixture.forecast[i][0])+"/"+deg(fixture.forecast[i][1])+" ฝน "+pct(fixture.forecast[i][2])).join(" · "));
  }
  function renderTable() {
    const body=$("details-body");
    const rows=cases[state.scenario].forecast.map(([high,low,rain],i)=>{
      const row=el("tr");
      row.append(
        el("td",null,longDayNames[i],{"data-col":"day"}),
        el("td",null,format(high),{"data-col":"high"}),
        el("td",null,format(low),{"data-col":"low"}),
        el("td",null,format(rain),{"data-col":"rain"})
      );
      return row;
    });
    body.replaceChildren(...rows);
  }
  function renderControls() {
    const isB=state.mode==="B";
    $("opt-a").classList.toggle("selected",!isB);
    $("opt-b").classList.toggle("selected",isB);
    $("opt-a").setAttribute("aria-pressed",String(!isB));
    $("opt-b").setAttribute("aria-pressed",String(isB));
    $("pause").disabled=!isB;
    $("prev").disabled=!isB;
    $("next").disabled=!isB;
    $("pause").textContent=state.paused?"เริ่มสลับ":"หยุดสลับ";
    $("effects").setAttribute("aria-pressed",String(state.effects));
    $("effects").textContent=state.effects?"ภาพฉาก + Animation: เปิด":"ภาพฉาก + Animation: ปิด";
    $("page-status").textContent=isB ? "Option B · หน้า "+(state.page+1)+"/2 · "+(state.page===0?"วัน 1–4":"วัน 5–7") : "Option A · แสดงครบ 7 วัน";
    $("rotation-status").textContent=isB ? (state.paused ? "พักการสลับ · เลือกหน้าเองได้" : "สลับอัตโนมัติทุก "+state.seconds+" วินาที") : "โหมด A แสดงครบ 7 วันพร้อมกัน";
  }
  function render() {
    buildStage($("native-stage"));
    buildStage($("zoom-stage"));
    renderTable();
    renderControls();
  }
  function resetDeadline() { deadline=Date.now() + state.seconds*1000; }
  function setMode(mode) {
    if(mode!=="A"&&mode!=="B")return;
    state.mode=mode;state.page=0;resetDeadline();render();
  }
  function setScenario(name) {
    if(!Object.hasOwn(cases,name))return;
    state.scenario=name;$("scenario").value=name;resetDeadline();render();
  }
  function setPage(page) {
    if(state.mode!=="B")return;
    state.page=page===1?1:0;resetDeadline();render();
  }
  function setPaused(paused) {state.paused=!!paused;resetDeadline();renderControls();}
  function setEffects(enabled) {state.effects=!!enabled;render();}
  function setIntervalSeconds(seconds) {
    if(![8,9,10].includes(Number(seconds)))return;
    state.seconds=Number(seconds);$("interval").value=String(seconds);resetDeadline();renderControls();
  }
  function setZoom(zoom) {
    const val=Math.max(1,Math.min(8,Math.round(Number(zoom)||1)));
    state.zoom=val;
    $("zoom").value=String(val);
    $("zoom-value").value=val+"×";$("zoom-value").textContent=val+"×";
    const frame=$("zoom-frame");
    frame.style.width=(432*val)+"px";frame.style.height=(40*val)+"px";
    $("zoom-stage").style.setProperty("--zoom",String(val));
  }
  $("opt-a").addEventListener("click",()=>setMode("A"));
  $("opt-b").addEventListener("click",()=>setMode("B"));
  $("scenario").addEventListener("change",event=>setScenario(event.target.value));
  $("interval").addEventListener("change",event=>setIntervalSeconds(event.target.value));
  $("prev").addEventListener("click",()=>setPage(1-state.page));
  $("next").addEventListener("click",()=>setPage(1-state.page));
  $("pause").addEventListener("click",()=>setPaused(!state.paused));
  $("effects").addEventListener("click",()=>setEffects(!state.effects));
  $("zoom").addEventListener("input",event=>setZoom(event.target.value));
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)resetDeadline();});
  window.setInterval(()=>{
    if(state.mode!=="B"||state.paused||document.hidden)return;
    if(Date.now()>=deadline)setPage(1-state.page);
  },200);
  window.WeatherLedDemo=Object.freeze({
    getState:()=>({...state,source,observedAt,dayCount:7,visibleDays:state.mode==="A"?7:state.page===0?4:3}),
    setMode,setScenario,setPage,setPaused,setEffects,setIntervalSeconds,setZoom
  });
  setZoom(state.zoom);
  render();
})();