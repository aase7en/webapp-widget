/* Source-grounded, non-official weather safety guidance.
   Not a forecast hazard warning system. Only uses fresh model_latest weather
   and model_forecast WMO conditions; HI is derived from model T/RH.
   WHO/CDC: https://www.who.int/news-room/fact-sheets/detail/climate-change-heat-and-health
   NWS: https://www.weather.gov/safety/lightning-safety-overview
   NWS fog: https://www.weather.gov/safety/fog-driving
*/
(function(root){
'use strict';
const isCode=(n)=>Number.isInteger(n)&&n>=0&&n<=99;
const storm=(n)=>isCode(n)&&n>=95&&n<=99;
const hardRain=(n)=>[65,67,82].indexOf(n)>=0;
const rain=(n)=>isCode(n)&&((n>=51&&n<=67)||(n>=80&&n<=82));
const fog=(n)=>n===45||n===48;
function status(kind,label,line1,line2,description){
 return {kind:kind,label:label,line1:line1,line2:line2,description:description,
  source:'Open-Meteo model · คำแนะนำเบื้องต้น ไม่ใช่ประกาศเตือนภัยอย่างเป็นทางการ'};
}
function evaluate(weather,forecast,heatIndex){
 if(!weather||weather.status!=='model_latest'||!isCode(weather.weatherCode))
  return status('unavailable','ข้อมูลไม่พร้อม','โปรดตรวจแหล่งข้อมูล','Open-Meteo','ไม่มีข้อมูลอากาศล่าสุดที่ยืนยันได้');
 const c=weather.weatherCode;
 const hours=forecast&&forecast.status==='model_forecast'&&Array.isArray(forecast.hours)?
  forecast.hours.filter(h=>h&&isCode(h.weatherCode)):[];
 // Forecast-only storm advice must be described as FORECAST, not active lightning.
 if(storm(c))return status('storm','ระวังฟ้าผ่า','มีพายุฟ้าคะนอง','เข้าที่ปลอดภัย','แบบจำลองแสดงรหัสพายุฝนฟ้าคะนองปัจจุบัน ควรหลบภายในอาคาร');
 if(hours.some(h=>storm(h.weatherCode)))return status('storm','เฝ้าระวังพายุ','คาดมีฟ้าคะนอง','เตรียมหลบในอาคาร','แบบจำลองพยากรณ์พายุในห้าชั่วโมงข้างหน้า ยังไม่ใช่ประกาศเตือนภัย');
 // Derived local model heat index display threshold (not official HeatRisk).
 if(typeof heatIndex==='number'&&Number.isFinite(heatIndex)&&heatIndex>=40)
  return status('heat-high','ระวังร้อนจัด','เลี่ยงกิจกรรมกลางแจ้ง','พักที่เย็น ดื่มน้ำ','HI จากอุณหภูมิและความชื้นในแบบจำลอง อาจเสี่ยงการเจ็บป่วยจากความร้อน');
 if(typeof heatIndex==='number'&&Number.isFinite(heatIndex)&&heatIndex>=33)
  return weather.isDay===true?
   status('heat','ระวังอากาศร้อน','เลี่ยงแดดนานๆ','พักร่ม ดื่มน้ำ','คำแนะนำลดการสัมผัสความร้อนและกิจกรรมกลางแจ้ง'):
   status('heat','ระวังอากาศร้อน','พักในที่เย็น','ดื่มน้ำสม่ำเสมอ','ดัชนีความร้อนจากแบบจำลอง ไม่บ่งชี้อุณหภูมิที่โรงพยาบาล');
 if(hardRain(c))return status('rain','เฝ้าระวังฝนหนัก','แบบจำลองมีฝนหนัก','ระวังถนนลื่น','ความเข้มฝนจัดตามรหัส WMO ปัจจุบัน ไม่ใช่คำเตือนน้ำท่วม');
 if(hours.some(h=>hardRain(h.weatherCode)))return status('rain','เฝ้าระวังฝนหนัก','คาดมีฝนหนัก','วางแผนเดินทาง','พยากรณ์แบบจำลองอาจมีฝนหนัก ไม่ใช่ประกาศเตือนภัย');
 if(fog(c))return status('fog','ระวังหมอก','ทัศนวิสัยอาจลด','ขับช้า ใช้ไฟต่ำ','หมอกตามแบบจำลอง ไม่ใช่ค่าระยะการมองเห็นที่วัดโดยตรง');
 if(hours.some(h=>fog(h.weatherCode)))return status('fog','เฝ้าระวังหมอก','อาจมีหมอก','ระวังเมื่อขับรถ','คาดการณ์หมอกจากแบบจำลอง');
 if(rain(c)||hours.some(h=>rain(h.weatherCode)))
  return status('rain','ระวังฝนตก','อาจมีฝน','เดินทางระมัดระวัง','รหัสฝนจาก Open-Meteo เป็นแบบจำลองและพยากรณ์ ไม่ใช่การตรวจวัด');
 if(!forecast||forecast.status!=='model_forecast'||hours.length===0)
  return status('unavailable','ข้อมูลปัจจุบัน','พยากรณ์ไม่พร้อม','Open-Meteo','ไม่มีพยากรณ์ที่จะประเมินอันตรายล่วงหน้า ไม่ใช่คำยืนยันว่าปลอดภัย');
 return status('none','ติดตามอากาศ','ยังไม่มีเหตุเด่น','Open-Meteo','ไม่มีสภาวะเข้ากฎแนะนำของแถบนี้ ไม่ใช่คำยืนยันว่าปลอดภัย');
}
root.UthWeatherAdvisories={evaluate:evaluate};
})(window);
