# Environmental LED Widget — สถานการณ์สิ่งแวดล้อมรายพื้นที่

เว็บประชาสัมพันธ์สำหรับหน้าจอ LED ของโรงพยาบาลอุทัย และให้หน่วยงานอื่นนำลิงก์ไปฝังในเว็บ/จอของตนเองได้ โดยกำหนด **latitude / longitude** เท่านั้น

> **สถานะ 9 ต.ค. 2026:** หน้าเดิมของโรงพยาบาลยังใช้ Google Apps Script Web App ตามเดิม เพื่อไม่ให้จอหน้ารพ.หยุดทำงาน รุ่น `portable.html` เป็นเส้นทางใหม่ที่ยังต้องทดสอบ Deployment ก่อนสลับเป็นค่าเริ่มต้น ห้ามตีความค่าจากแบบจำลองว่าเป็นสถานีวัดจริง

## ใช้งานทันที

**ลิงก์จอโรงพยาบาลเดิม (ไม่เปลี่ยน):** https://aase7en.github.io/webapp-widget/

**ลิงก์แบบกำหนดพื้นที่เอง:**

```text
https://aase7en.github.io/webapp-widget/?lat=14.36147&lon=100.64424&name=โรงพยาบาลอุทัย
```

`lat` คือ **ละติจูด** (-90 ถึง 90), `lon` คือ **ลองจิจูด** (-180 ถึง 180), `name` เป็นชื่อหน่วยงานที่แสดงบนจอ (ไม่เกิน 75 ตัวอักษร) ค่าในตัวอย่างคือพิกัดอ้างอิงโดยประมาณ ต้องตรวจสอบจุดปักหมุดจริงก่อนนำไปใช้เป็นคำเตือนเฉพาะสถานที่

สำหรับแถบจอ LED สูง 40px ให้เติม `&compact=1` เพื่อซ่อนบรรทัดชื่อสถานที่และคำอธิบาย (แต่ต้องรักษาเครื่องหมายแยก `MODELLED/DERIVED/UNAVAILABLE` ภายในเนื้อหา); หากต้องการดูทั้งสามช่องพร้อมกัน เติม `&layout=cards` ท้าย URL; หากไม่เติม ระบบจะสลับข้อมูลทุก 10 วินาทีเพื่อแสดงในแถบ LED ความสูง 40 px

### ฝังในเว็บไซต์หรือจอ LED (Embed)

```html
<iframe
  title="สถานการณ์สิ่งแวดล้อมในพื้นที่"
  src="https://aase7en.github.io/webapp-widget/?lat=14.36147&amp;lon=100.64424&amp;name=อุทัย&amp;compact=1"
  style="width:432px;height:40px;border:0"
  loading="lazy"></iframe>
```

หากไม่ได้เติม `compact=1` ความสูงประมาณ 78 px รวมบรรทัดชื่อสถานที่และข้อมูลประกอบ หากใช้ `layout=cards` ควรเพิ่มความสูงอย่างน้อย 330 px บนมือถือ ผู้ใช้งานจอ 432×40 แบบเดิมให้ใช้ URL เดิมซึ่งแสดงเพียง iframe Apps Script เท่านั้น

## ข้อมูลที่แสดงจริงและข้อจำกัด

| ชนิด | Portable widget | แหล่งข้อมูล/การตีความ |
| --- | --- | --- |
| PM2.5 | แสดงค่าเฉลี่ย **24 ชั่วโมง** เมื่อมีข้อมูลรายชั่วโมงครบ 24 ค่า | **GISTDA CheckPhoon ตามพิกัด** เป็นแหล่งหลัก (ค่าประมาณรายพื้นที่ ไม่ใช่เซนเซอร์ที่โรงพยาบาล); หาก GISTDA ขัดข้อง/ข้อมูลเก่าให้ใช้ Open-Meteo/CAMS แบบจำลองเป็นแหล่งสำรอง พร้อมป้ายบอกแหล่งข้อมูล |
| Heat Index | คำนวณจากอุณหภูมิ/ความชื้นตามสูตร NOAA | Open-Meteo Weather (**DERIVED** จากแบบจำลอง) ไม่ใช่การวัด ณ ที่ตั้ง |
| Flood risk | **UNAVAILABLE** จนเชื่อม Server-side API ที่ได้รับสิทธิ์และทดสอบ Schema | GISTDA FloodCheck รองรับพิกัด แต่การเรียกโดยไม่มี API Key ได้ HTTP 403; ห้ามแสดงว่า "ปลอดภัย" เมื่อไม่มีข้อมูล |

Portable widget ดึงข้อมูลใหม่ทุก 30 นาที (ต้องเปิดหน้าค้างไว้และมีอินเทอร์เน็ต) โดยแยก Failure ของข้อมูลแต่ละชนิด สามารถเปิดไว้ 24 ชั่วโมงได้ แต่ไม่ได้รับรองข้อมูลจะพร้อมตลอดเวลา แสดง `ไม่มีข้อมูล` เมื่อข้อมูลไม่มีคุณภาพหรือ Provider ล่ม

**เกณฑ์ PM2.5** สำหรับค่าเฉลี่ย 24 ชั่วโมงที่แสดง: 0–15, มากกว่า 15–25, มากกว่า 25–37.5, มากกว่า 37.5–75 และมากกว่า 75 µg/m³ ตามช่วงระดับของไทย (ตรวจฉบับล่าสุดก่อนเปลี่ยนเป็นป้ายเตือนสุขภาพอย่างเป็นทางการ) ไม่ใช้ WAQI `iaqi.pm25.v` มาแสดงเป็น µg/m³

**ข้อมูลน้ำ:** แยกความเสี่ยงน้ำท่วม (modelled flood risk), ขอบเขตน้ำท่วมจากดาวเทียม (observed extent) และระดับน้ำเซนเซอร์ (water level) เสมอ ห้ามอนุมานว่าระดับน้ำโรงพยาบาลปกติจากการไม่มีข้อมูล FloodCheck

## GISTDA CheckPhoon API จากเอกสารที่ได้รับ

คัดลอก PDF คู่มือเดิมมาจาก Repository `Report-PM2.5` โดย **ไม่แก้ไขเนื้อหา**:
[เอกสาร GISTDA CheckPhoon APIs (4 ธ.ค. 2024)](docs/reference/GISTDA-CheckPhoon-APIs-2024-12-04.pdf) — แหล่งที่มา [Repository เดิม](https://github.com/aase7en/Report-PM2.5). เอกสาร 11 หน้า ระบุ Endpoint แต่ **ไม่มี API Key**. ตรวจสิทธิ์ใช้งานและเงื่อนไขเผยแพร่จาก GISTDA แยกต่างหาก

**GISTDA PM2.5 ตามพิกัดที่ทดสอบแล้ว:**

```text
https://pm25.gistda.or.th/rest/getPm25byLocation?lat=14.36147&lng=100.64424
```

- เปลี่ยน `lat`/`lon` ในลิงก์ Widget ได้ โดย JavaScript แปลง `lon` เป็น `lng` ให้ GISTDA โดยอัตโนมัติ
- ทดสอบ HTTP 200 + JSON `status:200` + CORS `Access-Control-Allow-Origin: *` วันที่ 9 ต.ค. 2026
- ค่า PM2.5 เฉลี่ย 24 ชั่วโมงอยู่ใน `data.pm25Avg24hrs` (มีตัว s ท้าย **hrs**) ส่วน `data.pm25` เป็นค่าคนละช่วงเวลา อย่านำมาใช้แทน
- ใช้ `data.datetimeEng` ตรวจความสดใหม่ โดยข้อมูลเกิน 4 ชั่วโมงหรือไม่ได้เวลาจริงต้องถือว่าไม่พร้อมและไปแหล่งสำรอง
- ให้ระบุผลเป็น `MODELLED` / การประมาณการจาก GISTDA **ไม่ใช่สถานีวัด ณ โรงพยาบาล**
- เอกสารนี้เป็น API ของ PM2.5 **ไม่ใช่** สิทธิ์ API ของ Heat Index หรือ FloodCheck

## API และการเชื่อม GISTDA

- GISTDA FloodCheck: https://opendata.gistda.or.th/dataset/floodcheck
- GISTDA LifeDee / Heat Index: https://opendata.gistda.or.th/dataset/lifedee
- ขอสิทธิ์ API/เงื่อนไขการเผยแพร่ได้ที่ `innotech@gistda.or.th` **ห้ามฝัง API Key ใน `portable.js`, HTML, query string หรือ GitHub**
- GISTDA PM2.5 ตำบลอุทัยที่ใช้ใน **Legacy Apps Script**: `https://pm25.gistda.or.th/rest/getPm25byTambon?ap_idn=1414` ไม่ใช่ API พิกัดทั่วประเทศ จึงไม่เหมาะสำหรับ Widget แบบพกพาโดยตรง
- Open-Meteo AQ (model): https://open-meteo.com/en/docs/air-quality-api
- Open-Meteo Weather (model): https://open-meteo.com/en/docs

### ระบบเฝ้าระวังน้ำและข่าวท้องถิ่น (ต้นแบบที่ไม่ต้องรอ GISTDA)

เพิ่ม [Flood Evidence Watch (Python)](monitor/README.md): ดึง GloFAS/Open-Meteo
**river discharge (m³/s, แบบจำลอง)** และข้อมูลประกาศ/ข่าวพื้นที่อยุธยาจากไฟล์ RSS/JSON ที่ตรวจสิทธิ์แล้ว
ส่งเข้า **คิวให้เจ้าหน้าที่ตรวจสอบ** พร้อม URL/เวลา/สถานะข้อมูล
สามารถเปิด Gemini/OpenRouter จากเครื่องที่เก็บ Key อย่างปลอดภัยเพื่อช่วยสกัด
*คำกล่าวอ้างในพาดหัวข่าว* เท่านั้น ไม่มีการประเมินระดับน้ำท่วมโรงพยาบาลอัตโนมัติ
และยังไม่สร้างงานตั้งเวลา/แจ้งเตือน/เผยแพร่บนป้ายจริง ค่าเริ่มต้น
`hospital_flood_status = UNAVAILABLE` และ `hospital_risk_level = null`
เสมอจนมีสถานีวัดและเกณฑ์พื้นที่ที่ตรวจสอบแล้ว

### สำหรับผู้ดูแล: เชื่อม Flood API เมื่อได้สิทธิ์แล้ว

1. ทำ **Server-side adapter** (Cloudflare Worker / Apps Script backend / service ที่เก็บ Secret) รับพิกัดที่ validate แล้วและติดต่อ GISTDA ด้วย Key ที่เก็บเป็น Environment Secret เท่านั้น
2. อ่านรูปแบบ Response จริงและกำหนด Mapping โดยผู้รับผิดชอบวิชาการ/ด้านภัยพิบัติ ก่อนประกาศความเสี่ยงต่อสาธารณะ
3. หลังผ่าน Integration Test แล้วค่อยตั้งค่า `<meta name="flood-proxy" content="https://...">` ใน `portable.html` ผ่านการ Review
4. Proxy ต้องคืน JSON ที่ตรวจสอบได้ตาม Contract ตัวอย่างนี้ (ใช้เพื่อการพัฒนาเท่านั้น ไม่ใช่การยืนยัน API Schema ของ GISTDA):

```json
{
  "status": "AVAILABLE",
  "risk_level": "WATCH",
  "observed_at": "2026-10-09T04:00:00Z",
  "source": "Verified GISTDA adapter"
}
```

ค่า `risk_level`: `LOW | WATCH | WARNING | CRITICAL`; ถ้าข้อมูลไม่พร้อมหรือเกิน 4 ชั่วโมง **ต้อง** ตอบ `UNAVAILABLE` ไม่ส่ง `LOW` แทน Unknown. ห้ามเผยแพร่ค่าทดสอบหรือข้อความสมมติเป็นสถานการณ์จริง การเปิดใช้งาน Proxy ที่ให้บริการประชาชนต้องผ่านการตรวจ provenance, freshness, spatial resolution และ source agreement

## ระบบเดิม (คงไว้ใน Production)

- **Root `index.html` ที่ไม่มีพิกัด:** ฝัง Apps Script URL เดิมด้วย iframe คงเดิม
- Apps Script Project ชื่อ **API Report_PM2.5**: https://script.google.com/home/projects/1H7_0yH9yFDSDKhe66IhhRvyeVgV4rdI8R96stDY0cIbnOfemiCHvlejj/edit
- Google Sheet **API Report_PM2.5**: เก็บ `ชีต1` (สรุป) และ `ชีต2` (24-hour history); อย่าลบ/เขียนทับข้อมูลเดิมโดยไม่สำรอง
- `apps-script/Code.gs` และ `apps-script/index.html` เป็น **Versioned Copies** เท่านั้น ไม่ใช่โค้ดที่ Deploy เองจาก GitHub
- แก้ Apps Script แล้วให้ใช้ **Manage deployments → Edit → New version** ของ Deployment เดิม เมื่อผ่านการทดสอบ เพื่อคง URL `/exec`

### การแก้ `ชีต1` สำหรับ Live Apps Script (ระหว่างรอ GISTDA API)

ได้เตรียม [ตัวอย่าง Hotfix เฉพาะจุด](apps-script/LIVE-HOTFIX-CANDIDATE.gs)
และ [คู่มือติดตั้ง/ทดสอบ/ย้อนกลับ](apps-script/SAFE-ROLLOUT.md) เพิ่มแล้ว
เพื่อแก้ปัญหา `global.data.iaqi.pm10.v` ใน `main()` โดยไม่พึ่ง WAQI,
ไม่แปลงค่าที่ไม่มีเป็นศูนย์, ไม่ลบประวัติในชีต และให้การบันทึกล้มเหลว
แสดงสถานะ Error ใน Executions จริง

**หมายเหตุ:** นี่เป็นไฟล์ต้นแบบสำหรับแก้ Live Script แบบยืนยันความแตกต่าง
ไม่ใช่สคริปต์ที่ Deploy แล้ว ห้ามเพิ่มไฟล์นี้ทั้งไฟล์เข้า Apps Script
โดยไม่แทนที่ `main` และ `importDataToSpreadsheet` ของเดิม:
ฟังก์ชันชื่อซ้ำอาจทำงานผิดความคาดหมาย และต้องสำรอง Live Source
ก่อนทุกครั้ง

### ปัญหาที่พบและวิธีป้องกัน

- LINE Notify **ยุติบริการ 31 มี.ค. 2025** จึงไม่ได้เป็นส่วนของ Portable Widget; หากต้องส่ง LINE จริงให้ใช้อีกโครงการ LINE Messaging API
- สำเนา Legacy เคยมี API Tokens ใน Git History: ต้อง **Rotate/Revoke** Keys ที่ยังใช้ได้แม้ลบข้อความจาก HEAD แล้ว และตรวจความลับในระบบอื่นที่แชร์ Key
- WAQI `iaqi` เป็น **AQI** ไม่ใช่ค่า `µg/m³`; ตัวเลข `NaN`, `null`, `0` ต้องจัดการต่างกัน
- `ชีต1` พบข้อมูลหยุดที่ 2 ส.ค. 2569 ในขณะที่ `ชีต2` ยังอัปเดต 9 ต.ค. 2569 — ต้องตรวจ Apps Script **Executions/Triggers ของ Live Project** ก่อนสลับ Backend
- Trigger แบบเดิมลบ Trigger ทั้งหมด เสี่ยงกระทบงานร่วมกัน; สำเนาใหม่ลบเฉพาะ Handler ที่เป็นเจ้าของ
- ทดสอบกับจอจริง, Mobile, Network Failure, วัน/เวลาไทย, การสูญเสีย API, ความถูกต้องของหน่วย, HTTP & CORS ก่อนเปิดให้ประชาชนใช้

**สำหรับแก้ข้อผิดพลาด Live Apps Script กรณี PM10 หาย:** [คู่มือแก้ไขและปล่อยเวอร์ชันอย่างปลอดภัย](apps-script/SAFE-ROLLOUT.md) — ต้องตรวจ Source/Deployment จริงก่อน ห้าม Paste โค้ดจาก GitHub ทับทันที

## การพัฒนาและเผยแพร่โดยไม่กระทบป้าย 24/7

1. แก้ใน Feature Branch/PR ไม่แก้ `main` ตรง ๆ และไม่เปลี่ยน Apps Script Live ระหว่างทดสอบ
2. รัน `node --check portable.js && node --test tests/*.test.cjs` แล้วตรวจ GitHub Actions บน exact commit
3. เปิด Preview ของ `portable.html?lat=...&lon=...&layout=cards`; ยืนยันค่ากับแหล่งข้อมูลจริงและทดสอบ Network Loss
4. ตรวจประสิทธิภาพ/การอ่านจริงที่ความละเอียดจอ LED หน้างาน ก่อน Merge
5. ปรับ URL Apps Script เฉพาะเมื่อ Deployment ใหม่ผ่าน Smoke Test และ Rollback พร้อม
6. เก็บ `Report-PM2.5` และ `IQAir_widget` ไว้จนตรวจว่าไม่มีผู้ใช้ Pages/External Embed; **การลบ Repo ไม่ใช่การเพิกถอน API Key**. หากไม่มี Dependency แนะนำ Archive ก่อน Delete

## โครงสร้าง

```text
index.html               Legacy iframe (default) + portable query routing
portable.html            Public embeddable widget; keyless
portable.js              Validated coordinates, source-aware data, tests
tests/portable.test.cjs  Pure function/regression tests
apps-script/Code.gs      Safe candidate backend snapshot (NOT live)
apps-script/index.html   Legacy GAS widget snapshot (NOT live)
.github/workflows/       GitHub CI
```

### Scope of public warnings

ระบบนี้เป็นสื่อประชาสัมพันธ์ข้อมูลสิ่งแวดล้อม ไม่ใช่ระบบสั่งการภัยพิบัติ (Emergency Dispatch) ให้ตรวจประกาศจากหน่วยงานรัฐ/ท้องถิ่นก่อนตัดสินใจเพื่อความปลอดภัย ข้อมูลจากแบบจำลองไม่เท่ากับ Sensor ณ จุด และข้อมูล `UNAVAILABLE` ไม่เท่ากับ "ปกติ".
