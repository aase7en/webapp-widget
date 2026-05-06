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
