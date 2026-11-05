# Weather LED Readability — isolated A/B web demo

**Project:** `aase7en/webapp-widget` (NOT `env-wastewater-webapp`)
**Baseline:** `main` 81d584fbe457dee7f356802ed3d7bbebe758af78 (2026-11-04).
**Handoff:** PR #91, branch `docs/handoff-weather-led-demo-20261104`, commit `67f5b25cc1342e9f12e628c92cde7e967e6875d2`.

## How to preview

Open `demo/weather-led-readability-ab/index.html` from a static web server (e.g. `python3 -m http.server 8000` at repository root). No build, npm install, remote assets, environment variables or weather-data network requests are needed. Original artwork is bundled locally in assets/.

- **A:** all seven days simultaneously in a native **432 × 40 CSS-pixel** strip.
- **B:** first four days, then last three days, swapping every 8, 9 (default) or 10 seconds.
- Both renderers show today’s temperature, rain chance, humidity, max and min temperature; forecast days show high/low and rain chance.
- Zoom inspector (1–8×) preserves the 432×40 underlying CSS pixel geometry; iPhone/desktop can horizontally scroll.
- Manual paging, pause, simulated normal/edge/missing test cases, seven-day numeric table, keyboard controls.
- Prefers-reduced-motion pauses timed paging by default; users may enable it.
- Every number is **SIMULATED / LOCAL FIXTURE**. `observedAt = null`, `source = SIMULATED / LOCAL FIXTURE`. No real weather values are used; missing remains “—” while genuine fixture 0 renders 0.
- Production Weather, Water Level, PM2.5, Google Sheet, Apps Script and existing transport files are unchanged. Not a deployment authorization.

## Evidence + QA

Earlier **production** screenshot, 4-day CSS-only concept, and DOM Geometry are in the owner-local checkpoint folder `PM25-WebappWidget-Handoff-2026-10-29/LED-READABILITY-DEMO-20261104` (outside repo). They document tiny native forecast text (3.33px for rain, 4.33px highs); they are not a functional A/B demo.

Browser QA should capture `#native-stage` for A / B page 1 / B page 2 at 432×40, and the full page at iPhone 390×844 and desktop 1280×800; verify 7/4/3 counts, 9-second timer, zoom geometry, null ≠ zero, no overlap/clipping, no console/network issues. Physical outdoor LED viewing distance and controller scaling remain **UNVERIFIED** until actual operator visual approval.

**No merge or production deployment.** External preview publish, if performed, must be isolated from the production GitHub Pages site.
## Verified Browser QA · 2026-11-04

Executed with real Google Chrome headless and Puppeteer; results in `evidence/qa-report.json`, plus `evidence/A-7days-432x40.png`, `B-first4-432x40.png`, `B-last3-432x40.png`, `mobile-390.png`, and `desktop-1280.png`.

**PASS (12 checks):** native 432×40, A=7 / B=4+3, 9-second rotation, 1–8× zoom dimensions, 390×844 mobile scrolling, extreme 100%/negative data, null-vs-zero, reduced-motion default pause, no per-cell text clipping, no Browser errors and zero external HTTP requests. Demo A native rain percentage uses 10.5px; B uses 13px; previous production rain text was 3.33px. Screenshot comparisons are visual evidence, not physical display approval.

Run: `NODE_PATH=<path-to-installed-puppeteer-node_modules> PREVIEW_CHROME_PATH=<Chrome-executable> node demo/weather-led-readability-ab/browser-qa.cjs`.

**UNVERIFIED:** physical LED controller mapping, real viewing distance/readability, Safari/iPhone hardware render, independent design approval and production rollout.


## Visual asset restoration · 2026-11-05

The owner explicitly asked to retain the original scenic background and weather icon animations, not create a text-only LED. This iteration reuses the exact existing `v2/weather-assets` source artwork (no regeneration or re-encoding):

- Weather panorama: `rain.webp`, `thunderstorm.webp`, `cloudy.webp`.
- Original animated icons: `rain.apng`, `thunderstorm.apng`, `cloudy.apng` (96-frame APNG each).
- Original static fallback: matching `*-poster.png` when `prefers-reduced-motion: reduce`.
- Filled SVG symbols replace the words for today's rain, humidity, high and low; a subtle trend line uses only the displayed fixture highs and does not bridge missing values.
- The “ภาพฉาก + Animation” switch toggles decorative visual layers on/off so reviewers can compare readability without changing any measurements or data provenance.

Conditions are **visual examples only**: normal→rain, edge→thunderstorm, missing→cloudy. They do not assert current meteorological observations, and every value remains **SIMULATED**, `observedAt=null`. The weather scene/animation is never required for reading numbers; reduced-motion and no-effects states retain the data.

**Browser QA rerun (13 cases, Chrome/Puppeteer on 2026-11-05): PASS.** Includes original scene/APNG/poster asset loading, SVG symbols, graph, effect toggle, 7/4/3 day counts, 9s paging, missing vs zero, 100% edge values, 432×40 geometry, 390px mobile scrolling, no text clipping, reduced-motion poster, and no external data requests. See `evidence/qa-report.json` and updated screenshots.

**Not yet verified:** physical LED controller, outdoor viewing distance, actual iPhone Safari GPU rendering, independent visual approval, and authorized Production release.

## Production Luxury fidelity correction — 2026-11-05

**Reason:** A/B demo's earlier custom layout removed the large clock, relocated the panoramic scene/animation and current temperature, and did not look like approved Production Luxury. The owner requested fidelity to the actual live website.

**Verified source:** `https://aase7en.github.io/webapp-widget/v2/weather-luxury.html`, downloaded and SHA-256 matched to `origin/main:v2/weather-luxury.html`: `e0cf3d2aadc267b90e7e8696088b15d225cdc992f75e34326bda05996bae3e48`. The Mac root worktree's Weather HTML differs from the live original; it was **not** used as visual authority.

**Implementation:** `production-luxury-template.js` carries the live Production board and CSS (asset paths rebased to local copies). Each 432×40 Demo stage renders this board in an isolated Shadow DOM, preserving the exact original 1296×120 scaled-by-1/3 composition: large Asia/Bangkok clock, scenic background, animated weather icon + reduced-motion poster, large current temperature, feels-like badge, four icon metrics, original luminous border and temperature trend. Only the forecast panel inside its original ~122px footprint is varied between A and B using `luxury-overrides.css`. The Demo makes zero Weather API calls.

**Readability trade-off:** In A, seven compact daily forecast cells show day, high and rain; individual daily lows remain in the full seven-day table below the LED because the 122px section cannot display all fields legibly at once. In B, four then three larger forecast cells show day, high/low and rain. The four current conditions (rain, humidity, high, low) remain on the main LED in both modes. This keeps the original Luxury composition rather than replacing it with full-width numbers.

**Data integrity:** The clock/date are actual formatted device time in `Asia/Bangkok`; all Weather values/conditions/forecast and the graph are explicitly `SIMULATED`, `observedAt:null`, and never represented as real current readings. “—” remains distinct from 0.

**Browser QA — 2026-11-05:** PASS on Chrome/Puppeteer: 14 checks for original geometry (clock at x≈7, large temperature x≈179, scenic background x≈27, stats x≈235, forecast x≈306), A=7 and B=4+3, 9s timer, 100%/negative and missing vs zero, no clipped daily cells, original scene/APNG/poster loaded, mobile 390px/zoom, and reduced-motion fallback. Full evidence and screenshots are in `evidence/`. Production main and the approved Water / PM2.5 / Google Sheet / Apps Script are untouched.

**Not yet verified:** physical LED viewing distance, actual iPhone Safari and independent visual approval. PR remains draft. No production merge/deploy.

## Compact left-shift visual candidate · 2026-11-05

Owner-requested **isolated Demo** refinement after reviewing the restored live Luxury composition. Default is **Compact / ขยับซ้าย**, and the button **จัดวาง: ขยับซ้าย / ต้นฉบับ** switches between Compact and the previous **unchanged original Luxury positions** on both native 432×40 and Zoom Inspector screens.

The source of the Luxury template and its SHA-256 remain identical; only an opt-in `.board.layout-compact` override changes board-space geometry. Physical shifts below are **native 432×40 CSS pixels** (the original board is authored at 1296×120 and rendered at 1/3 scale):

- Clock/date and luminous frame: **unchanged**.
- Scenic panorama crop: width 158.33 → 142.33 (**−16**), same left position, same original background image and fade.
- Condition APNG/poster: **−10** horizontal; original animation and reduced-motion poster retained.
- Current temperature / feels-like badge: **−10**.
- Four metrics: x 234.67 → 221.33 (**−13.33**).
- Forecast: x 306.33 → 294.33 (**−12**); width 122.33 → 134.33 (**+12**, **+9.8%**) with the original right edge intact.

The candidate is a visual trade-off, **not** a guaranteed physical LED readability improvement. Cloudy sprite has intentional transparent overscan, so its bounding image can extend near the clock/temperature even when painted cloud pixels do not obscure the digits; inspect on the real display. No weather data requests or live claims: weather fixture is always **SIMULATED**, `observedAt:null`.

**QA:** Chrome/Puppeteer on Mac — **16 checks PASS**, including original/compact toggle, original clock x≈6.67 unchanged, left-shift geometry, A=7 / B=4+3, extreme/missing scenarios, 9-second rotation, 390px mobile scroll, Zoom, no numeric-cell overflow, reduced-motion fallback and zero external API calls. See `evidence/qa-report.json`, `evidence/A-7days-432x40.png`, `evidence/A-original-432x40.png`, `evidence/B-first4-432x40.png`, and `evidence/mobile-390.png`. Safari iPhone hardware / physical LED approval remain **UNVERIFIED**. No change to Production, Water Level, PM2.5, Google Sheet or Apps Script.

## User-supplied visual reference design — 2026-11-05

The user supplied a 1204x265 reference screenshot (aspect 4.54:1) with a huge glowing temperature, vividly colored large weather pictograms, four rich rain/humidity/high/low indicators, and a full seven-day temperature trend chart. The physical LED is 432x40 px (10.8:1); exact pixel reproduction is impossible, so the Demo adapts its relative hierarchy while preserving all data.

New default visual: "ตัวเลขใหญ่ + Icon + Graph", implemented in isolated reference.js and reference-style.css. The original Production Luxury and Compact layouts remain selectable; no Production files are edited. The new visual retains a small real Asia/Bangkok clock, the original scenic WebP and animated APNG/poster for reduced motion, a prominent simulated data label, large temperature readout, rich SVG metric icons, 7-day SVG weather pictograms, and a computed trend line using daily highs with cyan/yellow/orange/red based on temperature.

The normal fixture now matches the sample image numbers: 32°C, feels 38°, chance of rain 40%, humidity 72%, high 36°, low 26°; daily highs [33,32,31,32,33,34,34], lows [26,25,25,25,26,26,27], rain percentages [60,40,70,20,20,10,20]. ALL weather conditions and values are SIMULATED with observedAt=null and zero weather API calls. The clock shows actual browser time in Asia/Bangkok; its time is not a weather observation. Graph has no interpolated data across missing daily highs.

A/B retains all 7 days in A and 4+3 days rotating 8/9/10 sec in B, manual paging, pause, 1-8x Zoom Inspector, Mobile scroll, and a complete numeric table. Display warm-color design thresholds are >=35°C and hot-red thresholds are >=38°C; these are visual choices and NOT clinical heat alerts or heat-index classifications.

Chrome/Puppeteer Browser QA: 24 cases PASS, covering original Luxury regression, reference geometry 432x40, SVG icon and line-graph counts, high-temp color/edge values, missing != 0, A/B rotation, Mobile 390, reduced-motion poster, no JS errors or external requests. Evidence: evidence/Reference-*.png and evidence/qa-report.json. Physical LED readability and iPhone Safari remain UNVERIFIED. No production merge, production deploy, Apps Script or Google Sheet change.

## Owner-approved design direction: Luxury + Icons 4+3 (2026-11-05)

**This is a visual DEMO candidate, not Production authorization.** It retains the exact live-Production Luxury board, glowing frame, date/time clock at the same native 432×40 position and size, original scenic WebP and animated APNG (static poster for reduced motion). New default hybrid view uses the original Luxury clock and current temperature, but makes more space for daily forecasts:
- Current temperature and original animated weather icon shift LEFT by 21 and 22 native CSS pixels, respectively. Panoramic background shrinks from 158.33 to 128.33 native pixels (30px narrower). The original clock remains x=6.67 native pixels, without translation, resizing, or replacing it.
- Four metrics Rain / Humidity / High / Low are recreated using **the same SVG pictograms, palette and near-native font hierarchy from Demo R**. Their values remain readable and use the SIMULATED local fixture.
- **No chart is visible in hybrid mode.** The metrics + 4/3 forecast occupy the remaining width; each day displays an SVG weather condition icon and high/low temperatures and precipitation chance, with 4 days then 3 days switching automatically every 8, 9 (default), or 10 seconds. The old A and legacy R/Luxury modes remain available for comparison, but Option A is disabled in the new hybrid view.
- No weather API/Google Sheet/Apps Script reads. Data status SIMULATED, observedAt=null, and missing is not zero. Visual symbol selection is illustrative rather than a real forecast.

**Verified via Mac Chrome/Puppeteer:** Hybrid visual/geometry/clock and 8-second timer, edge 100%, missing vs zero, mobile 390px, and reduced-motion all PASS (8 checks) with screenshots and hybrid-qa-report.json. Existing R/Luxury suite: 24 regression cases PASS after accounting for the new default visual and 4+3 mode. Real outdoor LED viewing distance and iPhone Safari are still UNVERIFIED.

**SAFE:** Only files under demo/weather-led-readability-ab are changed. The original live Production 1296×120 template, production weather page, Water Level, PM2.5, Google Sheet, Apps Script, and release configuration are NOT modified. PR remains DRAFT; NO merge/Production deploy before owner Visual Approval.
