# Hospital Uthai LED: main URL rotating environmental readings

The main URL `https://aase7en.github.io/webapp-widget/` keeps the existing production PM2.5 **iframe source** exactly unchanged. A small client-side outer carousel now rotates PM2.5 -> water -> Heat Index every 12 seconds. Its initial HTML displays PM2.5 even if Javascript is blocked.

At 432×40 CSS pixels, labels and glyphs are large relative to the existing original iframe (snapshot original PM 16px numeric / 15px status). The new panel uses 19px value / 15px status. At heights >=220 CSS pixels the new panels use responsive, larger centered typography. Keyboard/screen-reader labels and `aria-hidden` are synchronized with the visible slide; icons are inline SVG, no image downloads.

Water slide: **ACTUAL WATER LEVEL UNAVAILABLE**. Since there is NO VERIFIED station API for Khlong Khao Mao (including gates 492334 and 492335), show an em dash, not `0`, not a synthetic level. Do NOT substitute forecast river discharge m³/s, GloFAS model grid or a remotely related station level. No flood safety classification.

Heat slide: **DERIVED** NOAA heat index using Open-Meteo keyless *weather model* temp/RH at the public known Uthai area coordinates (14.36147,100.64424), local Bangkok timestamp, Celsius/% units and <=3-hour data freshness. No claim of hospital thermometry. When missing, stale or API/CORS fails, show em dash and "รอข้อมูล". The short label always includes `คำนวณ` when displaying a value; its non-official "ร้อนมาก/ร้อนจัด" copy is not an agency-issued heat warning. Temperature/humidity are never inferred from PM2.5 values.

Controls: a 12-second fixed sequence and weather refresh every 15 minutes while page remains open, abort timeout 12s. No new Google Apps Script code, triggers, keys, private Sheet data or other operational sources were modified. Previously published opt-in `/water.html` remains available.

Verification: `node --check led-rotation.js` and `node --test tests/led-rotation.test.cjs`. Also test source in browser at 432x40 and 432x288; on-device LED controller/firmware still requires validation before claiming physical screen acceptance.

**Rollback:** revert only the corresponding `index.html` and `led-rotation.js` change or restore the earlier GitHub Pages main commit `0abf8196010fd44371240a6708a9ebc3b4744de4` through a safe revert PR. Do not rotate PM2.5 Apps Script credentials or touch its triggers. Follow accepted PR/CI/release gates.

Independent review found a potential clipped status at intermediate heights (120–220 CSS px). The revised layout retains the horizontal bar below 220px and uses min-height=0 flex-weighted vertical regions above it. Screenshot-verified at 432×220 and 432×288.
