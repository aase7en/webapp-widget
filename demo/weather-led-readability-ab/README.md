# Weather LED Readability — isolated A/B web demo

**Project:** `aase7en/webapp-widget` (NOT `env-wastewater-webapp`)
**Baseline:** `main` 81d584fbe457dee7f356802ed3d7bbebe758af78 (2026-11-04).
**Handoff:** PR #91, branch `docs/handoff-weather-led-demo-20261104`, commit `67f5b25cc1342e9f12e628c92cde7e967e6875d2`.

## How to preview

Open `demo/weather-led-readability-ab/index.html` from a static web server (e.g. `python3 -m http.server 8000` at repository root). No build, npm install, external assets, environment variables or network data requests are needed.

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
