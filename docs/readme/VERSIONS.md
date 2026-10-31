# ตรวจเวอร์ชันหน้าเว็บ

ตรวจเมื่อ 31 ตุลาคม 2569 ก่อนแก้เอกสาร: เปรียบเทียบ SHA-256 ของไฟล์ HTML, JavaScript และ CSS ที่ติดตามใน Git และเผยแพร่ผ่าน Pages รวม 31 ไฟล์ กับ `origin/main` ที่ `cefb08ac2b2876047ed450ca83915bbfa171f33c` พบว่าตรงกันทั้ง 31 ไฟล์ การตรวจนี้ไม่รวม binary media, Apps Script deployment และ cache ที่ค้างอยู่บนอุปกรณ์ผู้ชม

| ส่วน | ไฟล์ | cache version ใน URL |
| --- | --- | --- |
| ตัวสลับหน้าที่ `index.html` โหลด | `v2/index.html` | `20261031-weather-graph-2` |
| PM2.5 | `v2/pm25-live.html` และ `v2/pm25-live.js` | `20261031-weather-graph-2` |
| Weather | `v2/weather-luxury.html` | `20261031-weather-graph-2` |
| Weather script | `v2/weather-luxury.js` | `20261031-graph-colors` |
| Water | `v2/water-luxury-live.html`, CSS และ script | `20261030-water-1` |
| ตัวอ่านข้อมูล Sheet | `v2/api-client.js` | `20261030-hourly-1` |

ตัวเลขใน query string เป็น cache key ไม่ใช่หมายเลขรุ่นผลิตภัณฑ์และไม่จำเป็นต้องเท่ากันทุกไฟล์ ไฟล์ที่ไม่เปลี่ยนไม่จำเป็นต้องมีวันเดียวกับไฟล์ที่แก้ล่าสุด การตรวจไฟล์ที่ server ตรงกันไม่ได้ยืนยันว่าเบราว์เซอร์ผู้ชมทุกเครื่องไม่มี cache เดิม ควรตรวจซ้ำหลัง deployment แต่ละครั้ง
