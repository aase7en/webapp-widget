# Air Quality Widget — PM2.5 (ตำบลอุทัย)

Widget แสดงค่าฝุ่น PM2.5 ของพื้นที่ตำบลอุทัย ดึงข้อมูลจาก GISTDA / Air4Thai / WAQI
ตัว `index.html` ใน repo นี้เป็นเพียงตัว wrapper ที่ฝัง iframe ของ Web App ที่ deploy จาก Google Apps Script

## ที่มาของโค้ด

โค้ดหลักของ widget อยู่ใน Google Apps Script project ชื่อ:

**📜 API Report_PM2.5**

🔗 ลิ้งสำหรับเข้าไปแก้ไข/อัพเดทโค้ด:
https://script.google.com/home/projects/1H7_0yH9yFDSDKhe66IhhRvyeVgV4rdI8R96stDY0cIbnOfemiCHvlejj/edit

> ⚠️ เวลาจะแก้ไข/อัพเดท widget ให้ไปแก้ที่ Google Apps Script ตามลิ้งด้านบน
> หลังแก้แล้วต้อง **Deploy → New deployment** ใหม่ แล้วนำ URL มาใส่แทนที่ใน `index.html` ของ repo นี้
> (หรือเลือก **Manage deployments → Edit → New version** เพื่อให้ URL เดิมใช้งานได้ต่อ)

## โครงสร้างไฟล์

| ไฟล์ | รายละเอียด |
| --- | --- |
| `index.html` | Wrapper หน้าเว็บที่ฝัง iframe ของ Apps Script Web App |
| `apps-script/Code.gs` | สำเนาโค้ด Server-side ของ Apps Script (ไว้อ้างอิง / version control) |
| `apps-script/index.html` | สำเนาโค้ด UI ของ widget ที่อยู่ใน Apps Script |

> ไฟล์ใน `apps-script/` เป็นเพียง **สำเนาเพื่ออ้างอิง** การแก้ไขจริงต้องไปทำใน Google Apps Script editor ตามลิ้งด้านบน

## API ที่ใช้

- **GISTDA**: `https://pm25.gistda.or.th/rest/getPm25byTambon?ap_idn=1414` (แหล่งข้อมูลหลัก — ตำบลอุทัย)
- **Air4Thai (PCD)**: `http://air4thai.pcd.go.th/services/getNewAQI_JSON.php?stationID=21t`
- **WAQI Global**: `https://api.waqi.info/feed/A419398/`

## Google Sheet ที่เก็บข้อมูล

Spreadsheet ID: `1kBUKdezfAxIziq167e-RJV1nNZkeiaz6YQcpVAMja9w`

- **ชีต1**: เก็บข้อมูล AQI / PM10 / PM2.5 / PM2.5 24hr Avg (เก็บ 7 วันล่าสุด)
- **ชีต2**: log ค่าเฉลี่ย PM2.5 24 ชม. ของตำบล

## Trigger เวลาทำงานอัตโนมัติ

| ฟังก์ชัน | เวลา (GMT+7) |
| --- | --- |
| `main` (รายงาน + บันทึกชีต1) | 06:00 และ 16:00 ทุกวัน |
| `logGistdaData` (บันทึกชีต2) | 08:00 และ 20:00 ทุกวัน |

หากต้องการสร้าง trigger ใหม่ ให้รันฟังก์ชัน `createDailyTrigger()` ใน Apps Script editor

---

## Backend JSON API v1 (contract — proposed, not yet deployed)

หน้า LED ใหม่เรียก backend เดิมทางเดียว: `GET {exec}?action=data&v=1`
(เพิ่ม `&callback=IDENT` เฉพาะกรณี JSONP fallback; IDENT ต้องเป็น identifier เดี่ยว
`^[A-Za-z_$][A-Za-z0-9_$]*$` เท่านั้น) — frontend ไม่เรียก upstream เองเลย

การตอบ (ทุกช่อง fail-closed แยกอิสระ):

```json
{
  "schema": 1,
  "generatedAt": "ISO-8601 (เวลาตอบ, ไม่ใช่เวลาวัด)",
  "location": { "id": "uthai", "label": "…", "lat": 14.36147, "lon": 100.64424 },
  "pm25": {
    "status": "ok | stale | missing",
    "value": 20.9, "unit": "µg/m³",
    "observedAt": "2026-10-17T06:05+07:00 (เวลาวัดจริงจาก GISTDA datetimeThai แปลง พ.ศ.→ค.ศ.)",
    "source": "GISTDA pm25.gistda.or.th · …",
    "band": "very_good|good|moderate|unhealthy_sensitive|unhealthy (>=91/>=51/>=38/>=26 ตาม Code.gs เดิม)",
    "provenance": { "provider", "agency", "service", "areaId", "stationId", "sourceUrl", "termsUrl", "timeZone", "unit", "datum" }  // canonical keys: timeZone/unit (exact); PM GISTDA = tambon areaId ไม่ใช่สถานีวัด
  },
  "weather": {
    "status": "ok | stale | missing",
    "temperatureC": 29.4, "humidityPct": 78, "weatherCode": 80,
    "tmaxC": 33.1, "tminC": 25.2, "rainPct": 55,
    "observedAt": "…+07:00", "forecastDate": "YYYY-MM-DD (กรุงเทพฯ)",
    "source": "Open-Meteo (weather model) · …", "provenance": { … }
  },
  "water": {
    "status": "missing", "available": false, "value": null, "unit": "m",
    "observedAt": null,
    "source": "ไม่มีสถานีระดับน้ำที่ยืนยันแล้ว — รอข้อมูลจริง …",
    "provenance": { …, "note": "no verified station API; thresholds pending engineer confirmation" }
  },
  "errors": [ { "channel": "pm25|weather|water|config|version|callback", "code": "UPSTREAM|PARSE|OBSERVED_AT|CONFIG|VERSION|CALLBACK", "message": "…" } ]
}
```

กติกาสำคัญ:

- `observedAt` = เวลาที่ต้นทางวัดเท่านั้น ห้ามแทนด้วยเวลา fetch/generatedAt — ไม่รู้เวลาวัด = `missing`
- อนาคต > 5 นาที ถูกตีตก; อายุ > 3 ชม. = `stale` (frontend แสดงเทา)
- Read route ไม่เขียน Sheet/trigger/properties ใดๆ ทั้งสิ้น (cooldown ก็เก็บใน
  CacheService อย่างเดียว); ใช้ CacheService แบบแยกรายช่อง: PM2.5 TTL 1,800 วิ
  (30 นาที) / อากาศ TTL 600 วิ (10 นาที) / last-good รายช่อง 21,600 วิ (6 ชม. =
  ค่าสูงสุดของบริการ); key = `bapi_v2_{location}_{config_version}_
  {fingerprint(พิกัด+providers+areaId+tambon+station+datum+label)}` +
  LockService กัน stampede; upstream ล่มเสิร์บ last-good รายช่อง พร้อมยกเป็น
  `stale` — ไม่เคยปลอมค่าสด ไม่เคยคืน 0
- ไม่มี secret/token/Spreadsheet ID/ประวัติดิบใน payload เด็ดขาด

### จังหวะการดึงข้อมูล (cadence — best-effort ทั้งหมด ห้ามอ้างเป็น rate ที่แน่นอน)

- frontend: อ่าน backend ทุก 15 นาที (`REFRESH_MS` ใน led-rotation.js, ไม่เปลี่ยน)
  และ refresh เมื่อแท็บกลับมา visible; freshness tick 60 วิ เป็นการ repaint
  จาก observedAt เท่านั้น (ไม่มี network); ไม่มี retry loop — JSONP fallback
  ครั้งเดียวเฉพาะกรณี CORS
- backend → upstream: PM2.5 (GISTDA) เติมใหม่เมื่อพ้น 30 นาที / อากาศ
  (Open-Meteo) เมื่อพ้น 10 นาที "ต่อการเข้ามาอ่าน" — cache หมดอายุจะถูกเติม
  เฉพาะเมื่อมี request เข้ามา (ไม่มี scheduler/cron รีเฟรช read cache)
  ไม่มี client เปิดอยู่ = ไม่มีการยิง upstream; CacheService อาจ evict
  ก่อนอายุจริง ดังนั้นทุกตัวเลข cadence เป็น best-effort upper bound
  ของความสด ไม่ใช่การรับประกันจังหวะเข็มนาฬิกา
- งบเรียกต่อวัน (ต่อ active location, กรณี LED เปิดตลอด): GISTDA ~48 ครั้ง
  + มากสุด ~2 จาก history batch; Open-Meteo ~96 + ~2 — history กับ read route
  ใช้ cache/helper เดียวกัน ช่องที่ยังอุ่นไม่ fetch เพิ่ม (batch อุ่น = 0 call
  เพิ่ม) จึงห้ามเขียนว่า "48 เป๊ะ" — ให้เขียน "~48+2 best-effort"
- HTTP 429/5xx หรือ network failure → cooldown แบบ passive เก็บใน cache รายช่อง
  (ค่าเริ่มต้น 300 วิ; ใช้ `Retry-After` เฉพาะเมื่อต้นทางส่งจริง — delta-seconds
  เท่านั้น — กันขอบไว้ 30–3,600 วิ) ระหว่าง cooldown: เสิร์บ last-good รายช่อง
  (เก่าเกิน 3 ชม. ขึ้น `stale`/เทา พร้อม observedAt เดิม) หรือ `missing`
  ตรงๆ หากไม่เคยมีค่าดี — ไม่มี retry storm จากฝั่งไหน
- history: ยังวันละ 2 รอบเช้า/เย็นตามเดิมทุกประการ (cadence ไม่เปลี่ยน)
  เพียงดึงข้อมูลผ่าน per-channel cache เดียวกับ read route; แถวบันทึก
  observedAt/status ของข้อมูลที่ใช้จริง (ค่า PM ในแถวอาจเก่าได้ถึง 30 นาที
  ถ้า batch เดินทางมาตอน cache ยังอุ่น)
- ชนิดของข้อมูล: GISTDA = ค่าประมาณรายชั่วโมงระดับตำบล (official estimate:
  ดาวเทียม+ภาคพื้นผสม) ไม่ใช่สถานีวัดหน้าโรงพยาบาล; Open-Meteo = โมเดลอากาศ
  (current เป็นค่า interpolate ของโมเดล) ไม่ใช่การวัดจริงที่ รพ. — ไม่มี
  การอ้างเปอร์เซ็นต์ความแม่นยำของสภาพอากาศในที่ใดของเอกสาร/หน้าจอ

### การตั้งค่า (แท็บใหม่ใน Spreadsheet เดิม — ไม่แตะ ชีต1/ชีต2)

- `Settings`: active_location_id, history_morning_hour (default 06),
  history_evening_hour (default 16), timezone, config_version
- `Locations`: id,label,enabled,lat,lon,pm_provider(gistda),pm_location_id,
  weather_provider(open-meteo),water_provider,water_station_id,water_datum,
  official_bank_crest_m,water_thresholds (ค่า datum/threshold เว้นว่างจนกว่า
  วิศวกรยืนยันสถานี) — สร้างแท็บโดยรัน `BackendApiSetupSheets()` (idempotent,
  อยู่แล้วไม่ทับ)
  - label: default เดิมที่ผิด `'ต.อุทัย อ.พระนครศรีอยุธยา'` (ต.อุทัยอยู่ใน อ.อุทัย)
    ถูกแปลงเป็น `'ต.อุทัย อ.อุทัย จ.พระนครศรีอยุธยา'` แบบ pure normalization
    ตอน backend อ่านค่า — API/หน้าจอคืนข้อความที่ถูกต้อง โดยที่ backend
    ไม่เขียนแก้ cell ใน Sheet เด็ดขาด (ข้อความเดิมใน cell คงอยู่จนเจ้าของ
    แก้เอง); label อื่นที่ไม่ใช่ legacy ตัวนี้ผ่านค่าตรงๆ ไม่ถูกแตะ
    และ label เป็นส่วนหนึ่งของ cache fingerprint (แก้ label = cache เปลี่ยน)
- `API_Sources`: metadata สาธารณะของ provider (URL ต้องผ่าน allowlist แค่ใช้
  อ้างอิง ไม่ถูก fetch จาก sheet; ห้ามใส่ API key — ใช้ชื่อ Script Property
  อย่างเดียวถ้าจำเป็น)
- `History_Batch`: ประวัติ "วันละ 2 รอบ" เช้า/เย็น แถวละ location ที่ enabled,
  idempotent ตาม (date, slot, location_id); ติดตั้ง trigger โดยรัน
  `BackendApiInstallTriggers()` (สร้างเฉพาะ trigger ของ BackendApiHistoryBatch —
  trigger ของ main/logGistdaData อื่นไม่ถูกลบ; trigger Apps Script ทำงาน
  ใกล้ชั่วโมง ไม่ตรงนาที)
- Migration ประวัติเดิม (วันละ 2 รอบ): `BackendApiPlanLegacyMigration()` (อ่านอย่างเดียว)
  แสง inventory + backup metadata; การ migrate จริงใช้
  `BackendApiInstallAndMigrate({verifiedHistoryOnly:true})` — ติดตั้ง/ตรวจ 2 trigger ใหม่
  ก่อน แล้วจึง retire เฉพาะ legacy history handlers ที่รู้จัก (main 06/16 + logGistdaData
  08/20 — ยืนยันจาก live source แล้วว่าเป็นงาน history ล้วน ไม่มีการส่ง LINE ที่ทำงานอยู่)
  หากไม่ส่ง verifiedHistoryOnly ระบบจะปฏิเสธ (retire ไม่ทำ) และรายงาน
  cadenceComplete:false — ปล่อยไว้จะได้ 4 batches/วัน ไม่ใช่ 2; creator limitation:
  trigger ไม่เปิดเผยผู้สร้าง จึงจับคู่ตามชื่อ handler ที่ยืนยันแล้วเท่านั้น
  งาน/แจ้งเตือนอื่นไม่ถูกแตะ; การลบที่ล้มเหลวแบบ concurrent รายงาน incomplete ไม่ claim สำเร็จ
- `createDailyTrigger` เดิม (เคยลบ trigger ทั้งโปรเจ็กต์) ถูก guard ใน candidate:
  ไม่ทำงานเว้นแต่เรียกพร้อม flag และ config ถูกต้อง แล้ว redirect ไป installer ใหม่
  (2 รอบ/วัน) เท่านั้น

### แท็บ Charts (กราฟฝังใน Google Sheet — สร้างอัตโนมัติ)

- ดูกราฟ: เปิด Spreadsheet → แท็บ **Charts** — กราฟเส้น (smooth) ฝังในชีต
  PM2.5 (#FF8C00), อุณหภูมิ (#E53935), ความชื้น (#42A5F5) จากข้อมูล
  `History_Batch` ของพื้นที่ active **ย้อนหลัง 30 วัน** (แกนวันที่ `d MMM`,
  ค่าที่ขาดหายเป็นช่องว่าง ไม่เติม 0; ไม่แตะแถว/คอลัมน์ History_Batch เด็ดขาด)
- ระบบสร้างกราฟใหม่เองหลังบันทึกประวัติเช้า/เย็นทุกรอบ (สร้างแท็บครั้งแรก
  แบบ lazy — เจ้าของไม่ต้อง setup เพิ่ม) และเจ้าของรัน
  **refreshLedCharts** ใน Editor (dropdown ของไฟล์ BackendApi.js) เพื่อ
  refresh ด้วยมือได้ทันที — ปลอดภัยแม้ยังไม่มีข้อมูล (จะไม่สร้างกราฟ ไม่พัง)
- กราฟของระบบมี title ลงท้าย `[อัตโนมัติ]` — refresh จะลบ/สร้างใหม่เฉพาะ
  กราฟที่มี marker นี้ กราฟที่มนุษย์สร้างเองไม่ถูกแตะ; route อ่านข้อมูล
  (`?action=data`) ไม่แตะกราฟ/แท็บเลย
- **ฝน** (`wx_rain_pct`) และ **ระดับน้ำ** (`water_level_m`): ยังไม่มีคอลัมน์
  ใน History_Batch ปัจจุบัน — กราฟจะปรากฏเองทันทีเมื่อมีคอลัมน์พร้อมข้อมูล
  จริงที่บันทึก; กราฟน้ำต้องมีอย่างน้อย 1 ค่าตัวเลขจริงในหน้าต่าง 30 วัน
  (ไม่สร้างชุดข้อมูลปลอม — "น้ำรอข้อมูลจริง" เช่นเดียวกับหน้าจอ LED)
- หลาย location ที่ enabled พร้อมกัน: ถ้าแถวต่าง location สลับกันระบบจะ
  ไม่วาดกราฟ (ไม่ปนกัน) และเขียนเหตุผลไว้ในผลลัพธ์ของ refreshLedCharts


### ขั้นตอน deploy และ rollback (เมื่ออนุมัติ)

1. Login เจ้าของ: `npx @google/clasp login` (บัญชีเจ้าของโปรเจ็กต์) — credential
   เก็บเฉพาะ `~/.clasprc.json`; สำรอง source จริงก่อนเสมอ:
   `npx @google/clasp clone <scriptId>` แล้ว diff กับ `apps-script/` ใน repo
2. เพิ่มไฟล์ `BackendApi.gs` + แก้ `doGet` เดิมเป็นบรรทัดเดียว
   `return BackendApi_doGet(e);` (ไม่มี action = UI เดิมทุกประการ)
3. Deploy: **Manage deployments → Edit → New version** (URL exec เดิมไม่เปลี่ยน)
4. Rollback: (ก) ย้อน deployment กลับ version ก่อนหน้า ใน Apps Script editor
   หรือ (ข) revert frontend ตามเอกสาร LED-ROTATION.md — สองทางแยกอิสระ

### Runtime vs public reference (สำคัญ)

`apps-script/Code.gs` ใน repo = สำเนา SANITIZED ของ live @24 "Widget_V1.2"
(pull 2026-10-17 ผ่าน clasp เก็บที่ /tmp นอก repo): token จริงถูกเปลี่ยนเป็นชื่อ
Script Property — ที่ runtime ต้องมี: `WAQI_TOKEN` (และ `LINE_TOKEN_*` ถ้าเปิด
แจ้งเตือนในอนาคต) — ฟังก์ชันอื่นทั้งหมด (รวม main/GISTDA-primary/hotfix
`gistdaForMain_`/`optionalPM25_`) byte-for-byte ตาม live ยกเว้น 2 patch ที่
document ไว้ใน header: (1) doGet hook ไป BackendApi_doGet (2) guard
createDailyTrigger การ deploy จริงสร้างจาก candidate ใน /tmp (live + 2 patch +
BackendApi.gs) ไม่ใช่ push repo ตรงๆ; ไม่หมุน/เปลี่ยน key ที่ยังทำงานอยู่โดยเงียบ

### การรัน setup/migration ของเจ้าของ (เมื่ออนุมัติ)

- ขั้นตอนรันเจ้าขอย (ครั้งเดียว หลัง deploy @27+): **ชื่อฟังก์ชันแบบเห็นใน dropdown แล้ว**
  1) เปิด https://script.google.com/home/projects/1H7_0yH9yFDSDKhe66IhhRvyeVgV4rdI8R96stDY0cIbnOfemiCHvlejj/edit
     ด้วยบัญชี a.richbusinessman@gmail.com (รีเฟรช Editor ถ้าเปิดค้างจากก่อน deploy)
  2) เลือกไฟล์ **BackendApi.js** (ใน Editor ชื่อไฟล์ลงท้าย .js) → ใน dropdown
     ฟังก์ชันข้างปุ่ม Debug เลือก **setupLedBackend** → กด **Run**
     (ฟังก์ชันที่ลงท้าย `_` ถูกซ่อนใน dropdown — นั่นคือสาเหตุที่เลือก
     BackendApiOwnerInitialize_ ไม่เจอ; setupLedBackend เป็นชื่อหน้ากากที่ guard
     ความปลอดภัยชุดเดิมทุกประการ)
  3) ครั้งแรก Google ขอ Authorization → Review permissions → เลือกบัญชี → Allow
  3.5) ถ้า Run แล้วเจอ "caller is not the trusted owner" — เลือก
     `ledOwnerDiagnostics` → Run (ขอสิทธิ์ครั้งแรกตามหน้า Review permissions
     ปกติ) แล้วส่งเฉพาะบรรทัด boolean ที่ได้ให้ทีม
     ({activeEmailPresent,effectiveEmailPresent,activeEqualsEffective,
     scheduledContext,trusted}) — ห้ามส่งอีเมล/ค่าอื่น
  4) Execution log ต้องเห็น: setupLedBackend: {"ok":true,"stage":"done",
     "cadenceComplete":true,"ownedTriggerCount":2,"legacyRetiredCount":4,...}
  5) ตรวจซ้ำ: เลือก **verifyLedBackend** → Run (อ่านอย่างเดียว:
     ownedTriggerCount:2, legacyHistoryTriggers:0, tabs 4 รายการ)
- วิธีที่ใช้ได้ทันที ( SECURITY ): เปิด Apps Script editor → เลือกฟังก์ชัน
  `BackendApiOwnerInitialize_` (ขึ้นต้นด้วย underscore = private ต่อ google.script.run)
  ใน dropdown ข้าง Debug แล้วกด Run — ครั้งเดียวจบ: สร้างแท็บที่ขาด + ตรวจ config +
  สำรอง trigger inventory + ติดตั้ง 2 trigger `BackendApiHistoryBatch_` + retire
  legacy history (main/logGistdaData) — ไม่เขียนแถวตัวอย่าง ไม่มี token/trigger id
  ในผลลัพธ์ หาก dropdown ไม่แสดงฟังก์ชัน _ ให้แจ้งทีมเพื่อเพิ่ม no-arg wrapper
  ที่มี owner guard เดียวกัน (ห้ามแก้เองโดยลด guard) ตรวจสอบผลทีหลังด้วยการรัน
  `BackendApiOwnerVerify_` (อ่านอย่างเดียว เช่นเดียวกัน)
- `clasp run` (scripts.run API): ยังใช้ไม่ได้กับ deployment ปัจจุบัน — manifest
  เป็น webapp only (ไม่มี executionApi access) และต้องเปิด Apps Script API
  ใน user settings ก่อน → blocker ที่ต้องตัดสินใจของเจ้าขอยหากจะใช้ทางนี้

### ข้อมูลน้ำ (สถานะวิจัยล่าสุด)

คง DISABLED/unknown: คลัง HII เป็นรายเดือนสิ้นสุด 30 ก.ย. (ไม่ใช่ real-time),
สถานี 492334/492335 ยังไม่ผ่านการยืนยัน, พิกัดโดยประมาณอาจต่างจากหมุด OSM
โรงพยาบาล ~131 ม. — ห้ามเลื่อนพิกัด/พื้นที่ PM เพื่อเอาใจแหล่งน้ำ; API_Sources
เปิดรายการ catalog (docs เท่านั้น) ได้แต่ห้ามเปิดใช้ gate alerts/ระดับที่เดา

### Security model (google.script.run exposure) — 2026-10-17

- ปัญหาเดิม: UI HtmlService สาธารณะเปิดฟังก์ชัน top-level ทุกตัวผ่าน
  google.script.run (รันในนามผู้ deploy) — flag ยืนยันเป็นแค่ consent ไม่ใช่
  authentication
- แก้: ฟังก์ชัน mutating/inventory ทุกตัวลงท้าย `_` (private ต่อ
  google.script.run ตาม official docs) และ entry หลัก BackendApiOwnerInitialize_
  บังคับ owner session จริง (Session.getActiveUser email ไม่ว่างเปล่าและเท่ากับ
  getEffectiveUser); legacy write entries (main/importDataToSpreadsheet/
  logGistdaData/logPm25ToSheet2/createDailyTrigger) ใส่ guard เดียวกันโดยคง
  body เดิมไว้เป็น *_ — trigger เดิมของเจ้าขอยยังทำงานต่อ (ยกเว้นช่วง migrate)
  เพราะ context ของ time-trigger ที่ handler ตรงกันถือว่า trusted
- สิ่งที่ยังเป็น public โดยตั้งใจ: doGet (route อ่าน + legacy UI) และ
  getWidgetData (อ่านอย่างเดียว) เท่านั้น; ไม่มี public mutator/Inventory
- consent: การเพิ่ม Session/getScriptTrigger อาจทำให้ Google ขอ authorize
  scope เพิ่มครั้งเดียวตอนเจ้าขอยกด Run — อนุมัติได้ตามปกติ
- token เดิมที่เคยตกไปใน repo สาธารณะเป็นปัญหาเชิงประวัติศาสตร์: ไม่เปลี่ยน
  visibility ของ repo และไม่หมุน key ที่ยังทำงานอยู่โดยไม่ได้รับอนุญาต —
  mirror สาธารณะ (redacted) กับ runtime candidate (ค่าจริง) แยกกันเสมอ
