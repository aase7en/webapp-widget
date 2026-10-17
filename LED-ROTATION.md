# Hospital Uthai LED: main URL rotating environmental readings

The main URL `https://aase7en.github.io/webapp-widget/` renders the **native 432×40 LED strip** (fixed clock + three rotating slides: PM2.5 -> water -> weather/Heat Index). The legacy PM2.5 iframe was retired on **2026-10-17 by explicit user approval**; the original Apps Script project stays the backend (read API + Google Sheets history). Its initial HTML shows grey "รอข้อมูล" placeholders even if Javascript is blocked — never a fake value.

At 432×40 CSS pixels the strip is the approved demo composition: fixed clock panel (94 px) + slides (335 px), PM mascot Thai palette (blue/green/yellow/orange/red/grey), weather scene with HI thermometer, water staff gauge. On phones the stage scales down proportionally (never reflows, never grows taller than 40 px).

## Native frontend migration (2026-10-17)

- **Single backend read API:** the ONLY network call is the fixed original exec endpoint `…/exec?action=data&v=1` (GET, 12 s timeout, `cache: no-store`). One request per 15 minutes, single-flight, repaint on slide exposure, visibility return and a 60 s freshness tick. A one-shot JSONP fallback (internally generated strict callback id, same fixed origin) runs only when `fetch` fails at the network/CORS level; it is never URL-controlled. **No Open-Meteo call remains client-side** — weather arrives in the backend payload (one server-side aggregation).
- **Contract (canonical, parent-approved):** `{schema:1, generatedAt, pm25:{status,value,unit,observedAt,source,band}, weather:{status,temperatureC,humidityPct,weatherCode,tmaxC,tminC,rainPct,observedAt,forecastDate,source}, water:{status:'missing',available:false,...}, errors}`. Nullable fields fail closed per channel. `generatedAt` is response time and is NEVER a freshness fallback: each channel validates its own `observedAt` (missing/unparseable, future > 5 min or age > 3 h → grey "รอข้อมูล"; `status:'stale'/'missing'` → grey, never the old value).
- **PM bands:** inherited verbatim from the legacy Apps Script `Code.gs` cutoffs — ≥91 unhealthy, ≥51 unhealthy_sensitive, ≥38 moderate, ≥26 good, else very_good — mapped to the approved moods มีผลกระทบ/เริ่มมีผลกระทบ/ปานกลาง/ดี/ดีมาก (red X-eyes / orange mask+tear / yellow worry / green closed smile / blue grin). These are **legacy criteria for source compatibility, not an externally verified official standard**. The strip derives bands locally from the same cutoffs; a payload `band` string that disagrees fails closed. The retired live-iframe UI thresholds (15/25/37.5/75) are intentionally NOT preserved.
- **Heat Index:** still DERIVED client-side with the unchanged NOAA `heatCelsius` from the payload's raw temp/RH; the `คำนวณ` marker rides the HI caption on the strip (full `· คำนวณ` wording stays in badges/docs). Missing humidity blanks HI only — never the valid temperature.
- **Water:** UNAVAILABLE grey em dash "รอข้อมูลจริง" in v1 — no approved level thresholds or discharge→height conversion exist, so even a payload claiming `available:true` is ignored (recorded as an error, still grey). The prepared gauge art stays dormant.
- **No demo in production:** no fixtures, no DEMO labels, and zero URL state parameters (`?pm/wx/water/hi/freeze/rot/scale` were demo-only). Rendering is `textContent`-only, no client secrets, no query reflection. Rig PNGs are versioned (`?v=…`) before first load; a broken primary icon retires the scene to its text glyph.
- **Multi-location + provenance (additive 2026-10-17):** the payload carries the active Sheet-selected location (`location:{id,label,lat,lon}`) and per-channel provenance (`provider/agency/service/stationId/sourceUrl/termsUrl/timeZone/unit/datum`, public string/null). Frontend validates strictly (lat −90..90, lon −180..180, no null→0, ids limited to safe `[A-Za-z0-9._-]`, strings type+length capped, `javascript:`/`data:` link schemes dropped — provenance is text-only `title`/`aria`, never raw HTML or live links). Visible short labels (`pm-loc`/`wx-loc`/`wa-loc`) follow the active location and switch atomically with the channels from one payload snapshot — a failed channel under a new location NEVER reuses the previous location's data. Missing/invalid config shows the neutral `รอข้อมูลพื้นที่`, never hardcoded names. No location URL overrides, no frontend editing, no credentials. Canonical PM emitter names: provider/agency **GISTDA**, service "PM25 tambon/area estimate"; the GISTDA id is an **area code**, labelled `พื้นที่/รหัสพื้นที่ …` in the provenance title (the `สถานี …` wording is reserved for a future genuine gauge source) — never presented as a PCD/Air4Thai measured station.
- **Open-Meteo attribution — off-display only (2026-10-18-prod3):** the data owner removed the visible credit from the LED ("เอาออกไปเลยไม่ให้เห็น"); the strip now renders **zero anchors and zero visible Open-Meteo text** at every viewport (`index.html` has no `<a>` at all; the `.wx-credit` element/CSS and the prod1/prod2 microcaption are fully retired). Licence-reasonable attribution stays off-display: the forecast column title `ปริมาณฝนวันนี้ (พยากรณ์ Open-Meteo)`, per-slide provenance `title`/`aria` text, the page `<meta name="description">` + HTML licence comment, and the README / WATER-LED.md credit notes. Backend provenance `source` strings are unchanged. The rain value keeps its exact previous box (top-aligned 2px inset replaces the old value+credit column), so removal causes zero layout shift; Chrome tests pin the prod2-measured geometry at 432/390 and prove no overlap with pill/HI/thermo/temp/note/clock across ok/danger/missing at 432/390/320.
- **Files:** `index.html` (page shell + strip markup), `strip.js` (presentation/rotation/clock/lifecycle), `strip.css` (approved visual rig), `assets/icons3d/rig/**` + `assets/ui-divider.png` (mounted art), `led-rotation.js` (heat math + transport + normalisation). Tests: `tests/led-rotation.test.cjs`, `tests/led-strip.test.cjs`, `tests/led-location.test.cjs`, `tests/browser-led.test.mjs` (route-mocked backend, offline).

Water slide: **ACTUAL WATER LEVEL UNAVAILABLE**. Since there is NO VERIFIED station API for Khlong Khao Mao (including the unverified candidate legacy gate IDs 492334/492335 — no supporting match in checked official station metadata, not enabled or used in production, and not proven nonexistent; see WATER-LED.md), show an em dash, not `0`, not a synthetic level. Do NOT substitute forecast river discharge m³/s, GloFAS model grid or a remotely related station level. No flood safety classification.

Heat slide: **DERIVED** NOAA heat index from the backend payload's weather-model temp/RH (server-side Open-Meteo aggregation at the public known Uthai area coordinates 14.36147,100.64424), local Bangkok timestamp, Celsius/% units and <=3-hour data freshness. No claim of hospital thermometry. When missing, stale or the API fails, show em dash and "รอข้อมูล". The `คำนวณ` marker always accompanies a displayed value; its non-official wording is not an agency-issued heat warning. Temperature/humidity are never inferred from PM2.5 values.

Controls: a 12-second fixed sequence, one backend GET every 15 minutes, 60-second freshness re-derivation, abort timeout 12s. Previously published opt-in `/water.html` remains available and unchanged.

Verification: `node --check led-rotation.js strip.js water.js` and `node --test tests/led-rotation.test.cjs tests/led-strip.test.cjs tests/led-location.test.cjs tests/water-led.test.cjs`. CI (`.github/workflows/led-rotation.yml`) runs those suites plus `node --test tests/*.test.cjs` (backend/contract suites included) and parse-only VM syntax checks for `apps-script/BackendApi.gs`; **CI does NOT run the browser suite**. Real-Chrome browser suite is local-only, entirely route-mocked against the backend (never a live API): `NODE_PATH=/Users/aase7en/.npm/_npx/31e32ef8478fbf80/node_modules PREVIEW_BROWSER_E2E=1 PREVIEW_CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" PREVIEW_CAPTURE_DIR=/tmp/widget-production-frontend-captures node --test tests/browser-led.test.mjs`. Also inspect source at 432x40 and 432x288; on-device LED controller/firmware still requires validation before claiming physical screen acceptance.

**Rollback:** revert the 2026-10-17 native-strip migration commit (restores the iframe wrapper `index.html` + old `led-rotation.js`) or restore the pre-migration main commit `5169029` through a safe revert PR. Do not rotate PM2.5 Apps Script credentials or touch its triggers. Follow accepted PR/CI/release gates.

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
No changes to environmental measurements, colour thresholds or slide
cadence. (The 2026-10-17 native-strip migration intentionally supersedes
the iframe-specific wording of this section; the 40px invariant is kept.)

At 390×844 (mobile), 432×40 (LED), 432×288 (LED frame/preview),
and 1280×720 (desktop), all slide rectangles must be 40px high.
Screenshot and browser computed-geometry tests should guard against
an accidental full-height mobile view. Restore the old `main` index
only through a safe Git revert if deployment needs rollback.
