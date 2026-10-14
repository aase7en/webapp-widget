# Hospital Uthai LED: main URL rotating environmental readings

The main URL `https://aase7en.github.io/webapp-widget/` keeps the existing production PM2.5 **iframe source** exactly unchanged. A small client-side outer carousel now rotates PM2.5 -> water -> Heat Index every 12 seconds. Its initial HTML displays PM2.5 even if Javascript is blocked.

At 432×40 CSS pixels, labels and glyphs are large relative to the existing original iframe (snapshot original PM 16px numeric / 15px status). The new panel uses 19px value / 15px status. On both phones and LED devices, all three panels retain the same horizontal 40px strip height. Keyboard/screen-reader labels and `aria-hidden` are synchronized with the visible slide; icons are inline SVG, no image downloads.

Water slide: **ACTUAL WATER LEVEL UNAVAILABLE**. Since there is NO VERIFIED station API for Khlong Khao Mao (including gates 492334 and 492335), show an em dash, not `0`, not a synthetic level. Do NOT substitute forecast river discharge m³/s, GloFAS model grid or a remotely related station level. No flood safety classification.

Heat slide: **DERIVED** NOAA heat index using Open-Meteo keyless *weather model* temp/RH at the public known Uthai area coordinates (14.36147,100.64424), local Bangkok timestamp, Celsius/% units and <=3-hour data freshness. No claim of hospital thermometry. When missing, stale or API/CORS fails, show em dash and "รอข้อมูล". The short label always includes `คำนวณ` when displaying a value; its non-official "ร้อนมาก/ร้อนจัด" copy is not an agency-issued heat warning. Temperature/humidity are never inferred from PM2.5 values.

Controls: a 12-second fixed sequence and weather refresh every 15 minutes while page remains open, abort timeout 12s. No new Google Apps Script code, triggers, keys, private Sheet data or other operational sources were modified. Previously published opt-in `/water.html` remains available.

Verification: `node --check led-rotation.js` and `node --test tests/led-rotation.test.cjs`. Also test source in browser at 432x40 and 432x288; on-device LED controller/firmware still requires validation before claiming physical screen acceptance.

**Rollback:** revert only the corresponding `index.html` and `led-rotation.js` change or restore the earlier GitHub Pages main commit `0abf8196010fd44371240a6708a9ebc3b4744de4` through a safe revert PR. Do not rotate PM2.5 Apps Script credentials or touch its triggers. Follow accepted PR/CI/release gates.

Historical: the first release briefly expanded panels vertically above 220px to avoid clipping. The mobile-height fix supersedes that approach by keeping the same 40px strip at every viewport height.

## Heat and water severity colours (2026-10-14)

Heat Index uses explicit Thai public-health impact bands for the *derived*
one-decimal value: below 27°C light blue (below the watch band; NOT a
declaration of safety), 27.0–32.9 green/watch, 33.0–41.9 yellow/alert,
42.0–51.9 orange/danger, >=52.0 red/extreme danger. Colour is accompanied by
short Thai wording including "คำนวณ" so passengers do not mistake computed
weather-model data for an official warning or measured hospital thermometer.
No-data/stale/API error is GREY with an em dash and "รอข้อมูล". Classification
uses the displayed rounded value, not an invisible second precision.

Source bands: https://hub.mnre.go.th/th/knowledge/detail/65788 and
https://spd.moph.go.th/wp-content/uploads/2025/03/5.2-Heat-V2.pdf
(NOAA algorithm: https://www.weather.gov/ama/heatindex).

Water has future thematic classes (watch blue, warning yellow, danger orange,
critical red). They MUST NOT be activated until a verified local agency
alert or reliable station-plus-authorised location-specific thresholds
is integrated and reviewed. The water slide **currently uses grey
UNAVAILABLE** with em dash and "รอข้อมูลจริง". Missing data, absent news,
and modelled GloFAS discharge must never render a green safe water condition.

Independent review prevention: A model heat reading is rechecked against its actual source timestamp every minute, before the heat slide becomes visible, and when browser visibility returns. Any reading older than three hours becomes an unavailable grey dash even if a background browser paused/throttled its normal 15-minute fetch timer.


## Mobile / tall viewport regression (2026-10-14)

Root-cause: the old `@media(min-height:220px)` rule treated an iPhone's
*tall browser viewport* as a full-height LED panel, while the original
PM2.5 iframe only occupied a 40px-high strip at the top. This made
heat/water pages balloon vertically on phones.

Fix: pin the **whole** widget to 40 CSS px tall regardless of viewport
height; do not switch to a vertical layout based only on browser height.
Retain all three horizontal slides at equal dimensions and restore
the black unused page area, matching the prior PM2.5 visual footprint.
No changes to iframe target, data-source contracts, environmental
measurements, colour thresholds or slide cadence.

At 390×844 (mobile), 432×40 (LED), 432×288 (LED frame/preview),
and 1280×720 (desktop), all slide rectangles must be 40px high.
Screenshot and browser computed-geometry tests should guard against
an accidental full-height mobile view. Restore the old `main` index
only through a safe Git revert if deployment needs rollback.
