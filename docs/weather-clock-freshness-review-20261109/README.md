# Weather LED — compact source age + restored historical cues (2026-11-09)

## Proven source of Production defect
- Target aase7en/webapp-widget, not env-wastewater-webapp.
- Read-only Chrome on Production at 2026-11-09T05:50Z:
  model observedAt=2026-11-09T02:30:00Z (09:30 Bangkok),
  browser time 12:50 Bangkok; HISTORICAL under existing 3-hour threshold.
  Backend source times and cadence were NOT changed in this patch.
- Former .hybrid-status was a 143x10 native-pixel opaque overlay across
  4+3-day forecast. First forecast rain percentage rect y=34..40, at
  the bottom of native 40-pixel LED frame.
- Previous weather-luxury.js deliberately hid Feels Like on HISTORICAL and
  returned null health guidance, despite valid historical model values.

## Weather-only presentation repair
- Removed visible hybrid-status overlay DOM/CSS/JS. Full source state
  HISTORICAL/UNAVAILABLE, model observedAt, and forecast aria label remain.
- Moved source-at into clock below time, abbreviated text e.g.
  'เก่า 09/11 09:04'; title and aria-label show full Bangkok time and
  old-data disclaimer. UNAVAILABLE -> 'ไม่มีข้อมูล', missing forecast ->
  'พย. ไม่พร้อม', current forecast -> no extra badge.
- Feels Like restored for finite feelsC, even historical, with amber
  OLD-data cue and accessible original model timestamp. Null remains
  unavailable, NEVER 0.
- Historical advice is a clearly marked old suggestion with visible
  'เดิม:' prefix and amber border, accessible full caveat: not a current
  heat warning. No health advice if temperature unavailable. NWS heat
  ranges, valid RH guard, 90px big-number font, Celsius glyph unchanged.
- Forecast 4+3 still rotates; compact day label and pictogram heights fit
  the historical 1px border. Rain percentage y=32..38 after fix (rather
  than y=34..40), fully inside both page 0 and page 1 of the 432x40 strip.

## Browser QA is SIMULATED — NOT operational measurements
- scripts/qa-weather-clock-freshness-20261109.cjs uses real local
  production frontend HTML/CSS/JS with synthetic controlled QA fixtures.
- Browser-qa.json and PNGs in this directory cover fresh, historical,
  historical high heat, missing historical Feels, invalid historical timestamp, unavailable, missing forecast, 4+3 page rotation,
  legacy fallback and reduced motion. Clock source note below clock and
  rain in-bounds are asserted by actual Chromium bounding rectangles.
- Historical Weather advice QA regression script updated to new owner
  requirements, but previous Nov 8 screenshot evidence remains untouched.
- No PM2.5, Water Level, Google Sheet, bound Apps Script, API/backend
  or sensor/model measurements changed.
- Physical LED and real Safari device remain UNVERIFIED.

## Production gate
Local tests and Puppeteer QA -> independent exact-SHA review -> hosted
CI -> expected-head merge -> Github Pages deployment of merge SHA ->
read-only actual Production Chrome verification, including stale state.


## Fail-closed source-integrity QA
- When historical data has no valid observedAt value, the board remains
  HISTORICAL and displays 'เก่า เวลาไม่พร้อม' rather than being
  reclassified as current.
- If feelsC is null with an otherwise valid historical model snapshot,
  the Feels badge stays unavailable and accessibility text does not
  substitute a false 0°C value. Other measured/modelled values remain
  explicitly historical.
