<div align="center">

# UTH Environmental Widget

**ป้ายข้อมูลสิ่งแวดล้อมสำหรับโรงพยาบาลอุทัย**<br>
PM2.5 · สภาพอากาศ · ระดับน้ำสถานีอ้างอิง

[เปิด Widget หลัก](https://aase7en.github.io/webapp-widget/) · [ดูหน้า Weather](https://aase7en.github.io/webapp-widget/v2/weather-luxury.html) · [ดูหน้าระดับน้ำ](https://aase7en.github.io/webapp-widget/v2/water-luxury-live.html) · [หน้ารวมตัวอย่าง](https://aase7en.github.io/webapp-widget/v2/)

</div>

## โปรเจกต์นี้ทำอะไร

แสดงข้อมูลสิ่งแวดล้อมที่อ่านได้รวดเร็วบริเวณโรงพยาบาลอุทัย จังหวัดพระนครศรีอยุธยา บนแถบ LED **432 × 40 พิกเซล** ซึ่งใช้พื้นที่ส่วนหนึ่งของจอจริงขนาด 432 × 288 พิกเซล หน้าหลักสลับระหว่างฝุ่น สภาพอากาศ และระดับน้ำโดยอัตโนมัติ พร้อมภาพเคลื่อนไหวและภาพนิ่งสำรองสำหรับอุปกรณ์หรือการตั้งค่าที่ลดการเคลื่อนไหว

ข้อมูลที่แสดงเป็นข้อมูลประกอบการติดตามสถานการณ์ ไม่ใช่เครื่องมือวินิจฉัยหรือระบบแจ้งเตือนภัยฉุกเฉินโดยลำพัง ควรตรวจสอบเวลาและประกาศทางการประกอบเสมอ

| หน้า | แสดงอะไร | ที่มาของข้อมูล |
| --- | --- | --- |
| PM2.5 | ค่ารายชั่วโมงล่าสุด (ตัวเลขใหญ่) โดยระดับสีและคำระดับอิงค่าเฉลี่ย 24 ชั่วโมง พร้อมกราฟย้อนหลังสูงสุด 24 ชั่วโมง | เช็คฝุ่น GISTDA ผ่าน Google Sheet |
| Weather | อุณหภูมิ ความรู้สึก ความชื้น โอกาสฝน ค่าสูงสุด/ต่ำสุด และพยากรณ์ 7 วัน | แบบจำลอง Open-Meteo ผ่าน Google Sheet |
| Water | สถานีอ้างอิง HDA004 ช่องสะเดา และ S.5 สะพานปรีดี พร้อมกราฟประวัติ | ThaiWater/HII ผ่าน Google Sheet |

> **ข้อจำกัดสำคัญ:** PM2.5 เป็นค่าประมาณระดับพื้นที่ ไม่ใช่เครื่องวัดหน้าโรงพยาบาล; อากาศเป็นผลแบบจำลอง; สถานีน้ำเป็นสถานีอ้างอิง ไม่ใช่เซนเซอร์ของโรงพยาบาล ภาพประตูน้ำเป็นภาพประกอบ ไม่ได้บอกสถานะประตูจริง
>
> ระดับสี PM2.5 อิง **ค่าเฉลี่ย 24 ชั่วโมง** (pm25Avg24hr จาก GISTDA เกณฑ์ปี 2569: ดีมาก ≤15 · ดี 15.1–25 · ปานกลาง 25.1–37.5 · เริ่มมีผลกระทบต่อสุขภาพ 37.6–75 · มีผลต่อสุขภาพ >75 µg/m³) ส่วนตัวเลขใหญ่ยังเป็นค่ารายชั่วโมงล่าสุด หากไม่มีค่าเฉลี่ยรอบนั้นระดับสีจะขึ้นเป็น "รอข้อมูล" ไม่แทนค่าด้วยศูนย์

## ตัวอย่างหน้าจอ

ภาพต่อไปนี้แสดงงานออกแบบในขนาด 3 เท่าของแถบ LED 432 × 40 เพื่อให้อ่านง่าย ภาพ PM2.5 และ Weather จับอัตโนมัติด้วย Playwright จาก canvas ออกแบบ 1296 × 120 หลังตรวจขนาดจริง 432 × 40 แยกแล้ว **ค่าฝุ่น กราฟ ค่าพยากรณ์ และภาพสถานะน้ำในชุดสาธิตเป็นข้อมูลจำลองเพื่อแสดงรูปแบบเท่านั้น ไม่ใช่ข้อมูลปัจจุบัน** ส่วนภาพน้ำที่ระบุว่าเป็นภาพจริงบันทึก ณ วันที่ 31 ตุลาคม 2569 เวลา 08:45 น. ค่าอาจเปลี่ยนไปหรือเก่าแล้ว ให้เปิดลิงก์หน้าเว็บเพื่อตรวจข้อมูลล่าสุด ภาพนิ่งไม่แสดงการเคลื่อนไหวของ animation

### PM2.5 — ห้าระดับสี

[<img src="docs/readme/brands/gistda.png" alt="โลโก้ GISTDA" width="105">](https://www.gistda.or.th/)

**เครดิตข้อมูลหน้า PM2.5:** [GISTDA — เช็คฝุ่น](https://pm25.gistda.or.th/) ให้ข้อมูลค่าฝุ่นประมาณระดับพื้นที่; กราฟใช้ประวัติที่บันทึกใน Google Sheet ของโครงการ [ดูหน้า Widget](https://aase7en.github.io/webapp-widget/)

ภาพชุดนี้แสดงตัวเลขใหญ่เป็นค่ารายชั่วโมง และบรรทัดรองเป็นค่าเฉลี่ย 24 ชั่วโมงที่ใช้จัดสี จึงตั้งข้อมูลจำลองสองค่าให้ต่างกันเพื่อแสดงพฤติกรรมนี้

| ฟ้า · ดีมาก | เขียว · ดี |
| --- | --- |
| ![ตัวอย่าง PM2.5 สีฟ้า ค่าจำลอง](docs/readme/screenshots/pm25-blue.png) | ![ตัวอย่าง PM2.5 สีเขียว ค่าจำลอง](docs/readme/screenshots/pm25-green.png) |
| **เหลือง · ปานกลาง** | **ส้ม · เริ่มมีผลต่อสุขภาพ** |
| ![ตัวอย่าง PM2.5 สีเหลือง ค่าจำลอง](docs/readme/screenshots/pm25-yellow.png) | ![ตัวอย่าง PM2.5 สีส้ม ค่าจำลอง](docs/readme/screenshots/pm25-orange.png) |
| **แดง · มีผลต่อสุขภาพ** | |
| ![ตัวอย่าง PM2.5 สีแดง ค่าจำลอง](docs/readme/screenshots/pm25-red.png) | |

### Weather — ไอคอนและฉากตามสภาพอากาศ

[<img src="docs/readme/brands/open-meteo.png" alt="โลโก้ Open-Meteo" width="75">](https://open-meteo.com/)

**เครดิตข้อมูลหน้า Weather:** [Open-Meteo Weather API](https://open-meteo.com/en/docs) ให้ข้อมูลและพยากรณ์จากแบบจำลอง โดยข้อมูลเผยแพร่ภายใต้ [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) และอยู่ภายใต้ [เงื่อนไขบริการ](https://open-meteo.com/en/terms) [ดูหน้า Weather](https://aase7en.github.io/webapp-widget/v2/weather-luxury.html)

ค่าทุกภาพในส่วนนี้เป็น **ข้อมูลจำลอง** เพื่อแสดงสภาพอากาศและหน้าตาแต่ละแบบ

ตรวจทั้ง APNG และ poster ในโหมดลดการเคลื่อนไหวแล้ว ขอบเบลอตามรูปทรงไอคอนแทนกล่องพื้นหลังขนาดตายตัว และกลุ่มที่ไม่มีดวงอาทิตย์/ดวงจันทร์ยกขึ้น 2 พิกเซลบนจอ LED จริง โดยยังใช้ภาพโรงพยาบาลอุทัยเป็นฉากหลัง

<details open><summary><strong>สภาพอากาศกลางวัน</strong></summary>

| แดดสลับเมฆ | เมฆมาก |
| --- | --- |
| ![แดดสลับเมฆ ข้อมูลจำลอง](docs/readme/screenshots/weather-partly-cloudy.png) | ![เมฆมาก ข้อมูลจำลอง](docs/readme/screenshots/weather-cloudy.png) |
| **ฝน** | **พายุฝนฟ้าคะนอง** |
| ![ฝน ข้อมูลจำลอง](docs/readme/screenshots/weather-rain.png) | ![พายุ ข้อมูลจำลอง](docs/readme/screenshots/weather-thunderstorm.png) |
| **หมอก** | **ลมแรง** |
| ![หมอก ข้อมูลจำลอง](docs/readme/screenshots/weather-fog.png) | ![ลมแรง ข้อมูลจำลอง](docs/readme/screenshots/weather-wind.png) |

</details>

<details open><summary><strong>สภาพอากาศกลางคืน — กดเพื่อดู</strong></summary>

| กลางคืน | ฝนกลางคืน |
| --- | --- |
| ![กลางคืน ข้อมูลจำลอง](docs/readme/screenshots/weather-night.png) | ![ฝนกลางคืน ข้อมูลจำลอง](docs/readme/screenshots/weather-night-rain.png) |
| **ลมแรงกลางคืน** | **พายุฝนฟ้าคะนองกลางคืน** |
| ![ลมแรงกลางคืน ข้อมูลจำลอง](docs/readme/screenshots/weather-night-wind.png) | ![พายุกลางคืน ข้อมูลจำลอง](docs/readme/screenshots/weather-night-thunderstorm.png) |

</details>

กราฟพยากรณ์ใช้สีฟ้า → เขียว → เหลือง → ส้ม → แดง เพื่อช่วยอ่านความแตกต่างของอุณหภูมิ **สีกราฟเป็นการออกแบบภาพ ไม่ใช่เกณฑ์เตือนสุขภาพอย่างเป็นทางการ**

### ระดับน้ำ — สถานีอ้างอิง

[<img src="docs/readme/brands/hii.png" alt="โลโก้สถาบันสารสนเทศทรัพยากรน้ำ" width="110">](https://www.hii.or.th/)

**เครดิตข้อมูลหน้าระดับน้ำ:** [ThaiWater / สถาบันสารสนเทศทรัพยากรน้ำ (HII)](https://www.thaiwater.net/) ให้บริการข้อมูลสถานีอ้างอิง HDA004 และ S.5 ผ่าน API; ประวัติที่แสดงอ่านผ่าน Google Sheet ของโครงการ [ดูหน้าระดับน้ำ](https://aase7en.github.io/webapp-widget/v2/water-luxury-live.html)

![ตัวอย่างหน้าระดับน้ำ บันทึกเมื่อ 31 ตุลาคม 2569](docs/readme/screenshots/water-live.png)

<details open><summary><strong>ตัวอย่างสถานะน้ำ — ข้อมูลจำลอง กดเพื่อดู</strong></summary>

| ต่ำกว่าตลิ่ง | ถึงตลิ่ง |
| --- | --- |
| ![ตัวอย่างต่ำกว่าตลิ่ง ข้อมูลจำลอง](docs/readme/screenshots/water-below.png) | ![ตัวอย่างถึงตลิ่ง ข้อมูลจำลอง](docs/readme/screenshots/water-at-bank.png) |
| **สูงกว่าตลิ่ง** | **ข้อมูลเก่า** |
| ![ตัวอย่างสูงกว่าตลิ่ง ข้อมูลจำลอง](docs/readme/screenshots/water-above.png) | ![ตัวอย่างข้อมูลเก่า ข้อมูลจำลอง](docs/readme/screenshots/water-historical.png) |
| **รอข้อมูล** | |
| ![ตัวอย่างรอข้อมูล ข้อมูลจำลอง](docs/readme/screenshots/water-unavailable.png) | |

</details>

ค่าที่ขาดหรือเก่าต้องพิจารณาตามเวลาวัดและสถานะบนหน้าจอ เทียบระดับกับตลิ่งเฉพาะเมื่อมีข้อมูลอ้างอิงที่ถูกต้อง ป้ายระดับน้ำไม่ใช่คำสั่งอพยพ

## แหล่งข้อมูลและเครดิต

ขอบคุณผู้ให้บริการข้อมูลและหน่วยงานที่เกี่ยวข้อง เครื่องหมายด้านล่างใช้เพื่อระบุแหล่งที่มา ไม่ได้แสดงการรับรองโครงการจากเจ้าของเครื่องหมาย

| ผู้ให้บริการ | บทบาทในระบบ | ข้อมูลและเงื่อนไข |
| --- | --- | --- |
| [<img src="docs/readme/brands/gistda.png" alt="GISTDA" width="105">](https://www.gistda.or.th/) | ค่า PM2.5 ประมาณรายชั่วโมงระดับตำบล | [เช็คฝุ่น GISTDA](https://pm25.gistda.or.th/) · [แหล่งโลโก้](https://www.gistda.or.th/about/download-gistda-logo-2/) |
| [<img src="docs/readme/brands/open-meteo.png" alt="Open-Meteo" width="85">](https://open-meteo.com/) | ข้อมูลและพยากรณ์อากาศแบบจำลอง รวมถึงข้อมูลแบบจำลองน้ำที่ backend ดึงไว้ | [Weather API](https://open-meteo.com/en/docs) · [Flood API](https://open-meteo.com/en/docs/flood-api) · ข้อมูล [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) · [เงื่อนไขบริการ](https://open-meteo.com/en/terms) |
| [<img src="docs/readme/brands/hii.png" alt="สถาบันสารสนเทศทรัพยากรน้ำ" width="110">](https://www.hii.or.th/) | ThaiWater/HII รวบรวมและให้บริการข้อมูลระดับน้ำจากสถานีอ้างอิง | [ThaiWater](https://www.thaiwater.net/) · [ข้อมูลหน่วยงานและเครื่องหมาย](https://www.hii.or.th/เครื่องหมาย-สสน/) |

โค้ดเดิมในโปรเจกต์ยังอ้างถึง [Air4Thai / กรมควบคุมมลพิษ](https://www.air4thai.com/) และ [World Air Quality Index (WAQI)](https://aqicn.org/) สำหรับงานเดิมบางส่วน แต่ **ไม่ใช่แหล่งหลักที่ยืนยันว่าป้อนสามหน้าหลักในปัจจุบัน** เครดิตและโลโก้แสดงไว้เพื่อให้เห็นที่มาของโค้ดเดิม:

[<img src="docs/readme/brands/pcd.png" alt="กรมควบคุมมลพิษ Air4Thai" width="120">](https://www.pcd.go.th/)　[<img src="docs/readme/brands/waqi.png" alt="World Air Quality Index" width="65">](https://aqicn.org/media/)

ภาพเครื่องหมายเป็นทรัพย์สินของเจ้าของแต่ละราย ดูที่มาไฟล์ได้ใน [รายการแหล่งโลโก้](docs/readme/brands/SOURCES.md) การใช้งานข้อมูลและ API ต้องเป็นไปตามเงื่อนไขของผู้ให้บริการแต่ละราย

## ระบบทำงานอย่างไร

```text
GISTDA ──────┐
Open-Meteo ──┼─→ Apps Script ของชีตเดิม ─→ Google Sheet / snapshot ─→ GitHub Pages ─→ จอ LED
ThaiWater ───┘
```

- ตัวเก็บข้อมูลถูกตั้งให้ทำงานรายชั่วโมงและมีตัวจำกัดการเรียกข้อมูลซ้ำในชั่วโมงเดียวกัน หน้าเว็บอ่าน snapshot จาก Apps Script/Sheet แทนการให้ทุกหน้าเว็บเรียกผู้ให้บริการโดยตรง การทำงานจริงขึ้นกับ trigger และความพร้อมของต้นทาง
- เวลาข้อมูลจากต้นทางและเวลาบันทึกเป็นคนละค่า ข้อมูลเก่าหรือข้อมูลที่ไม่มีต้องไม่ถูกแสดงเป็นข้อมูลสดหรือแทนด้วยศูนย์ กราฟจะเว้นช่องที่ไม่มีข้อมูลจริง
- ข้อมูล PM และ snapshot ที่ระบบใหม่เป็นเจ้าของมีนโยบายเก็บสูงสุด 90 วัน; snapshot พยากรณ์เก็บ 2 วัน แถวระดับน้ำที่ระบบใหม่เป็นเจ้าของและผ่านการตรวจรูปแบบมีนโยบาย 90 วัน ไม่ลบข้อมูลเก่าที่ระบุเจ้าของไม่ได้โดยอัตโนมัติ
- ใช้ Google Sheet และ Apps Script เดิมที่ผูกกันอยู่ ไม่สร้างฐานข้อมูลแยกสำหรับป้ายนี้
- ณ จุดตรวจวันที่ 31 ตุลาคม 2569 การดึงและบันทึกด้วยมือผ่านแล้ว แต่ **ยังรอหลักฐานรอบ trigger รายชั่วโมงอัตโนมัติหลังติดตั้ง** อย่าใช้เอกสารนี้แทนการตรวจสถานะปัจจุบัน

ตรวจเลข cache version ของแต่ละหน้าและขอบเขตการตรวจล่าสุดได้ที่ [บันทึกเวอร์ชัน](docs/readme/VERSIONS.md)

## สำหรับผู้พัฒนา

| เส้นทาง | หน้าที่ |
| --- | --- |
| `index.html`, `v2/index.html` | หน้าหลักและการสลับหน้าของป้าย |
| `v2/pm25-live.*`, `v2/weather-luxury.*`, `v2/water-luxury-live.*` | หน้าฝุ่น อากาศ และน้ำตามลำดับ |
| `v2/api-client.js`, `v2/live-widgets.js`, `v2/weather-snapshot.js` | อ่านและตรวจข้อมูลสำหรับหน้าเว็บ |
| `apps-script/BackendApi.gs`, `HourlySnapshot.gs`, `WaterHistory.gs` | backend, การเก็บ snapshot และประวัติน้ำ |
| `docs/readme/` | ภาพตัวอย่างและเครดิตเครื่องหมาย |

ทดสอบแบบ local จากโฟลเดอร์ repo:

```sh
python3 -m http.server 8000
node --test tests/weather-snapshot.test.cjs
```

เปิด `http://localhost:8000/` การรัน local ยังต้องเข้าถึง backend ที่ตั้งค่าไว้หากต้องการข้อมูลจริง ก่อนแก้ระบบจริงให้ตรวจ [AGENTS.md](AGENTS.md) และ [SESSION-HANDOFF.md](SESSION-HANDOFF.md) รวมถึงสถานะ deployment และ trigger ล่าสุด ห้ามนำ secrets ลง repo เอกสารเทคนิคเพิ่มเติม: [LED rotation](LED-ROTATION.md) · [Water LED](WATER-LED.md) · [README เดิม — เก็บไว้เป็นประวัติ ไม่ใช่สถานะปัจจุบัน](docs/archive/README-legacy-20261031.md)
