"use strict";
(() => {
  // The full original Luxury board (including clock and APNG) remains rendered.
  // This overlay only replaces the old metrics/forecast area in isolated DEMO.
  const memo = new WeakMap();
  const fmt = (v,unit="") => Number.isFinite(v) ? Math.round(v)+unit : "—";
  const node = (tag,cls,txt) => {
    const n=document.createElement(tag);
    if(cls)n.className=cls;
    if(txt!==undefined)n.textContent=txt;
    return n;
  };
  function get(target) {
    if(memo.has(target))return memo.get(target);
    const root=target.shadowRoot;
    if(!root)throw Error("Luxury Shadow DOM must load before hybrid");
    const css=node("link");css.rel="stylesheet";css.href="./hybrid-style.css";
    root.append(css);
    const panel=node("section","hybrid-panel");
    panel.setAttribute("aria-label","ข้อมูลอากาศจำลอง พร้อมพยากรณ์ 4+3 วัน");
    const metrics=node("div","hybrid-metrics");
    const days=node("div","hybrid-days");
    panel.append(metrics,days);
    const icons=window.WeatherReferenceRenderer;
    for(const kind of ["rain","humidity","high","low"]) {
      const item=node("div","hybrid-metric");
      item.dataset.kind=kind;
      const label=node("span","hybrid-label",{rain:"RAIN",humidity:"HUM",high:"HIGH",low:"LOW"}[kind]);
      const value=node("strong","hybrid-value","—");
      item.append(icons.metricIcon(kind),label,value);
      metrics.append(item);
    }
    root.append(panel);memo.set(target,panel);
    return panel;
  }
  function render(target,{fixture,days,dayName,effects,page}) {
    const panel=get(target),icons=window.WeatherReferenceRenderer;
    const current=fixture.current;
    panel.dataset.page=String(page);
    panel.style.setProperty("--hybrid-day-count",String(days.length));
    const units={rain:"%",humidity:"%",high:"°",low:"°"};
    for(const kind of Object.keys(units)) {
      const metric=panel.querySelector('.hybrid-metric[data-kind="'+kind+'"]');
      metric.dataset.heat=kind==="high"?icons.heat(current.high):"";
      metric.querySelector(".hybrid-value").textContent=fmt(current[kind],units[kind]);
      metric.setAttribute("aria-label",kind+" "+fmt(current[kind],units[kind]));
    }
    const nodes=days.map(i=>{
      const [hi,lo,rain]=fixture.forecast[i];
      const item=node("div","hybrid-day");
      item.dataset.day=String(i);
      item.title=dayName(i)+" สูงสุด "+fmt(hi,"°")+" ต่ำสุด "+fmt(lo,"°")+" โอกาสฝน "+fmt(rain,"%");
      item.append(node("span","hybrid-day-name",dayName(i)));
      const picture=icons.pictogram(icons.selectIcon(rain,hi,fixture.condition));
      picture.classList.add("hybrid-day-icon");
      item.append(picture);
      const temperature=node("div","hybrid-day-temp");
      const high=node("span","hybrid-high",fmt(hi,"°"));
      high.dataset.heat=icons.heat(hi);
      temperature.append(high,node("span","hybrid-slash","/"),node("span","hybrid-low",fmt(lo,"°")));
      const chance=node("div","hybrid-rain");
      chance.append(icons.drop(),node("span",null,fmt(rain,"%")));
      item.append(temperature,chance);
      return item;
    });
    panel.querySelector(".hybrid-days").replaceChildren(...nodes);
    return panel;
  }
  window.WeatherHybridRenderer=Object.freeze({render});
})();
