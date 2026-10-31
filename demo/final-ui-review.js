/* UI review only: values below are illustrative and never written to a backend.
 * The PM iframe receives its normal parent message. Weather uses the current
 * production document and renderer, with its network bootstrap removed. */
(() => {
  'use strict';
  const pmCases = [
    {id:'blue', label:'ดีมาก', detail:'สีฟ้า', color:'#3fcafa', value:8.2, avg:10.6},
    {id:'green', label:'ดี', detail:'สีเขียว', color:'#36d384', value:32.2, avg:21.3},
    {id:'yellow', label:'ปานกลาง', detail:'สีเหลือง', color:'#f4d64a', value:31.2, avg:30.5},
    {id:'orange', label:'เริ่มมีผลต่อสุขภาพ', detail:'สีส้ม', color:'#ff9c44', value:55.1, avg:48.1},
    {id:'red', label:'มีผลต่อสุขภาพ', detail:'สีแดง', color:'#f1626a', value:105.2, avg:88.3},
    {id:'unavailable', label:'รอข้อมูล', detail:'สถานะเมื่อข้อมูลไม่ครบ', color:'#9babb8', value:null},
  ];
  const weatherCases = [
    {id:'partly-cloudy', label:'แดดสลับเมฆ', detail:'กลางวัน', color:'#ffd16b', t:32, rh:62, rain:20},
    {id:'cloudy', label:'เมฆมาก', detail:'กลางวัน', color:'#bad7e8', t:30, rh:72, rain:35},
    {id:'rain', label:'ฝนตก', detail:'กลางวัน', color:'#59c9f6', t:28, rh:88, rain:80},
    {id:'thunderstorm', label:'ฝนฟ้าคะนอง', detail:'กลางวัน', color:'#c29cff', t:27, rh:90, rain:90},
    {id:'fog', label:'หมอก', detail:'กลางวัน', color:'#b6d1df', t:25, rh:90, rain:15},
    {id:'wind', label:'ลมแรง', detail:'กลางวัน', color:'#81e0de', t:30, rh:68, rain:30},
    {id:'night', label:'พระจันทร์และเมฆ', detail:'กลางคืน', color:'#ffe0a2', t:26, rh:76, rain:10},
    {id:'night-rain', label:'ฝนตก', detail:'กลางคืน', color:'#6ec2ef', t:25, rh:90, rain:80},
    {id:'night-wind', label:'ลมแรง', detail:'กลางคืน', color:'#7dcddd', t:26, rh:78, rain:25},
    {id:'night-thunderstorm', label:'ฝนฟ้าคะนอง', detail:'กลางคืน', color:'#b69aff', t:25, rh:92, rain:90},
  ];
  const $ = s => document.querySelector(s);
  const viewport = $('#preview-viewport'), stage = $('#preview-stage'), choices = $('#choices');
  const initial = new URLSearchParams(location.search);
  let page = initial.get('page') === 'weather' ? 'weather' : 'pm25';
  const selected = {pm25:'blue', weather:'partly-cloudy'};
  if ((page === 'pm25' ? pmCases : weatherCases).some(x => x.id === initial.get('state'))) selected[page] = initial.get('state');
  let zoom = 'fit', frame = null, weatherTemplate = null, generation = 0;

  function activeCase() { return (page === 'pm25' ? pmCases : weatherCases).find(x => x.id === selected[page]); }
  function history(value, now) {
    if (value === null) return [];
    return Array.from({length:24}, (_,i) => ({observedAt:new Date(now-(23-i)*3600000).toISOString(), value:Math.max(0,Math.round((value + Math.sin(i/3)*Math.max(2,value*.12))*10)/10)}));
  }
  function weatherData(item) {
    const icons=['partly-cloudy','rain','cloudy','partly-cloudy','thunderstorm','cloudy','partly-cloudy'];
    const high=[35,34,33,35,36,34,35], rain=[20,55,30,15,70,35,20];
    const days=high.map((hi,i)=>({day:new Intl.DateTimeFormat('th-TH',{weekday:'short',timeZone:'Asia/Bangkok'}).format(new Date(Date.now()+i*86400000)),hi,p:rain[i],ico:icons[i]}));
    return {temperatureC:item.t,humidityPct:item.rh,feelsC:item.t+3,rainPct:item.rain,high:item.t+3,low:item.t-4,icon:item.id,days};
  }
  function sendFixture() {
    if (!frame || !frame.contentWindow) return;
    const item=activeCase(), now=Date.now();
    if(page==='pm25') {
      const pm=item.value===null ? null : {status:'latest',value:item.value,avg24h:item.avg,observedAt:new Date(now).toISOString(),unit:'µg/m³'};
      frame.contentWindow.postMessage({type:'uth-pm25-live',pm25:pm,history:history(item.value,now)},location.origin);
    } else frame.contentWindow.postMessage({type:'uth-weather-review',weather:weatherData(item)},location.origin);
  }
  function resize() {
    const scale=zoom==='native'?1:zoom==='double'?2:Math.min(3,viewport.clientWidth/432);
    stage.style.width=(432*scale)+'px'; stage.style.height=(40*scale)+'px';
    if(frame)frame.style.transform='scale('+scale+')';
    $('#scale-note').textContent=zoom==='fit'?'พอดีกับความกว้างหน้าจอ':zoom==='native'?'ขนาดจริง 432 × 40 พิกเซล':'ขยาย 2 เท่า · เลื่อนซ้าย–ขวาได้';
  }
  function announceError(message) { $('#error').textContent=message; $('#error').hidden=false; }

  async function buildWeatherPreview() {
    if(weatherTemplate) return weatherTemplate;
    const htmlUrl=new URL('../v2/weather-luxury.html',location.href), response=await fetch(htmlUrl);
    if(!response.ok)throw Error('weather document unavailable');
    const html=await response.text();
    const tag=html.match(/<script\s+src="(weather-luxury\.js(?:\?[^"]*)?)"><\/script>/);
    if(!tag)throw Error('weather renderer not found');
    const jsResponse=await fetch(new URL(tag[1],htmlUrl));
    if(!jsResponse.ok)throw Error('weather renderer unavailable');
    const source=await jsResponse.text(), marker='\nlet pending=false,seq=0,lastGood=null,revalidateTimer=null;';
    const boundary=source.indexOf(marker);
    if(boundary<0 || source.indexOf(marker,boundary+1)>=0 || /<\/script/i.test(source.slice(0,boundary)))throw Error('weather renderer boundary changed');
    const bridge='\nclock();setInterval(clock,30000);window.addEventListener("message",function(e){if(e.origin!=='+JSON.stringify(location.origin)+'||e.source!==parent||!e.data||e.data.type!=="uth-weather-review")return;paint(e.data.weather)});';
    const script='<script>'+source.slice(0,boundary)+bridge+'<\/script>';
    const base='<base href="'+new URL('../v2/',location.href).href+'">';
    weatherTemplate=html.replace('<head>','<head>'+base).replace(tag[0],script);
    return weatherTemplate;
  }
  async function loadFrame() {
    const token=++generation; $('#error').hidden=true;
    stage.replaceChildren(); const loading=document.createElement('div');loading.className='loading';loading.textContent='กำลังโหลดตัวอย่าง…';stage.append(loading);
    let html;
    if(page==='weather') {
      try { html=await buildWeatherPreview(); }
      catch (_) {if(token===generation){loading.remove();announceError('โหลดตัวอย่าง Weather ไม่สำเร็จ กรุณาลองเปิดหน้าใหม่');}return;}
    }
    if(token!==generation)return;
    frame=document.createElement('iframe');frame.title=page==='pm25'?'ตัวอย่างป้าย PM2.5 ข้อมูลจำลอง':'ตัวอย่างป้าย Weather ข้อมูลจำลอง';frame.setAttribute('allow','autoplay');
    frame.addEventListener('load',()=>{
      if(token!==generation)return;
      if(page==='pm25') {
        const chart=frame.contentDocument.querySelector('.trend-plot'),label='กราฟค่าฝุ่นจำลองย้อนหลัง 24 ชั่วโมงสำหรับตรวจหน้าจอ';
        if(chart) {const mark=()=>{if(chart.getAttribute('aria-label')!==label)chart.setAttribute('aria-label',label);};new MutationObserver(mark).observe(chart,{attributes:true,attributeFilter:['aria-label']});mark();}
      }
      loading.remove();sendFixture();
    });
    if(page==='weather')frame.srcdoc=html;else frame.src='../v2/pm25-live.html';
    stage.append(frame);resize();
  }
  function syncUI() {
    const items=page==='pm25'?pmCases:weatherCases,item=activeCase();
    document.querySelectorAll('[data-page]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.page===page)));
    $('#preview-title').textContent=(page==='pm25'?'PM2.5':'Weather')+' · '+item.label+(page==='weather'?' ('+item.detail+')':'');
    $('#choose-title').textContent=page==='pm25'?'เลือกระดับค่าฝุ่น':'เลือกสภาพอากาศ';
    $('#hint').textContent=page==='pm25'?'สีอิงค่าเฉลี่ย 24 ชั่วโมง ส่วนตัวเลขใหญ่เป็นค่ารายชั่วโมงจำลอง · เมื่อขยายภาพ เลื่อนซ้าย–ขวาได้':'แตะสถานะเพื่อเปลี่ยนตัวอย่างทันที · เมื่อขยายภาพ เลื่อนซ้าย–ขวาได้';
    $('#count').textContent=(items.indexOf(item)+1)+' / '+items.length;
    choices.replaceChildren(...items.map(x=>{const b=document.createElement('button'),small=document.createElement('small');b.type='button';b.className='choice';b.dataset.state=x.id;b.style.setProperty('--swatch',x.color);b.setAttribute('aria-pressed',String(x.id===item.id));b.append(document.createTextNode(x.label));small.textContent=x.detail;b.append(small);return b;}));
    const url=new URL(location.href);url.searchParams.set('page',page);url.searchParams.set('state',item.id);historyReplace(url);
  }
  function historyReplace(url){window.history.replaceState(null,'',url);}
  document.querySelector('.pages').addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(!b||b.dataset.page===page)return;page=b.dataset.page;syncUI();loadFrame();});
  choices.addEventListener('click',e=>{const b=e.target.closest('[data-state]');if(!b)return;selected[page]=b.dataset.state;syncUI();sendFixture();});
  document.querySelector('.zoom').addEventListener('click',e=>{const b=e.target.closest('[data-zoom]');if(!b)return;zoom=b.dataset.zoom;document.querySelectorAll('[data-zoom]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));resize();});
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(resize).observe(viewport);else window.addEventListener('resize',resize);
  syncUI();loadFrame();
})();
