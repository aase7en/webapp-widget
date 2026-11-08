# WO — LED Weather degree + Water 7D honest chart/readability (2026-11-08)

## Identity and authority
- **Repo:** aase7en/webapp-widget (not env-wastewater-webapp).
- **Owner:** current chat request (2026-11-08) to audit placement, make Weather °C a legible trailing unit, examine short Water Level 7D trend and English units/captions.
- **Production base:** exact origin/main 42504de35987f93f95ca0e84c8ff98beb175c382, previous PR #95/#96/#97 merged and Chrome smoke verified.
- **Isolated writer:** /Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-weather-water-legibility-20261108, branch fix/weather-degree-water-7d-label-20261108, clean at start. Other worktrees and protected dirty Mac/Windows roots untouched.
- **Allowed:** presentation CSS/HTML/JS of v2 Weather+Water, related scoped cache versions, tests/browser screenshots, this Work Order, review-only preview repository.
- **Forbidden:** PM2.5 design/threshold, API/backend/Google Sheet/Apps Script/triggers, transport, water datum/measurements, status/freshness, weather heat-index rules, observedAt, clock/storm/4+3, simulation as real data.

## Verified root causes (real production, checked 2026-11-08 Bangkok)
- Weather hybrid °C: negative -6px margin and +11px vertical raise, plus hybrid panel z7 beginning at LED x202; degree sometimes hidden/indistinguishable after digit. A positive gap, explicit opaque color and lower trailing position should restore °C without covering forecast panel.
- Water graph: historyPath uses x position relative to fixed **168h** window. Current verified frontend API reported 30 readings for each station, but HDA004 covers only 31h and S.5 only 41h of the last 7 days, making paths x270..330 and x249..329 in a 340-wide SVG. Max sample gaps 2h and 3h respectively. This is not 7 full days of observations.
- Unit ม.รทก. means metres relative to mean sea level and is equivalent to **m MSL** in ThaiWater water-level standard. Datum MSL is the recorded API convention; no conversion should be applied.
- Current Water unit and SVG bounding rectangles overlap horizontally on both stations in Production; improve spacing while keeping the 432x40 LED layout.

## Design and data honesty
- Render Weather '°C' as small trailing/hanging unit, always within main hero safe zone and legible for 1/2/3-digit, negative, unavailable and reduced-motion.
- Water sparkline: continue filtering source-observed times to the **last seven days**; only when >=2 valid time-distinct samples, distribute plotted x over their **actual observed extent** (not pretend to cover 7 days); title shows available coverage *within* 7-day lookback (e.g. '31H / 7D'), accessible label spells out both periods and sample count. No interpolation/backfill/additional samples.
- Standardize compact visual labels to m MSL, HII reference, OBS timestamp, GROUND–BANK percentage; keep Thai station names and bank comparison badges to avoid changing the interpreted risk semantics. Full provenance in accessibility titles.
- Unknown/null/old != 0/current. Missing history must stay unavailable. 7-day *lookback* is not presented as a full seven-day record.

## Gate and rollback
1. Local tests and Puppeteer 432x40 actual production renderer with **SIMULATED QA fixtures** clearly labeled, plus 390px mobile/reduced motion and water stale/missing data.
2. No collision/occlusion among °C, weather number/panel/Feels; no collision among station number+m MSL+badge/graph.
3. Independent exact-SHA review, hosted CI, PR diff against main; explicit user visual feedback before Production release of **new** revision.
4. Rollback only scoped frontend release; never touch Sheets/Script/measurement transports. Record exact SHAs and source dates on closeout.

## Candidate implementation + test checkpoint
- Weather hybrid trailing °C: positive spacing, solid text, 22px board-unit
  glyph, vertical lowering. Long 4-character extreme shifts separately.
- Water: 7-day source-time filter preserved; X-axis now spans observed
  timestamps. Honest 31H / 7D label for partial data; NO DATA fail-safe;
  standardized m MSL and English OBS/GROUND–BANK labels.
- Reading group shifts 21 board px left for clean sparkline separation.
- Puppeteer real production renderers with synthetic fixtures verify
  five temperature cases, two station histories and no-data state at
  native 432×40 DPR3; see docs/led-legibility-review-20261108/.
- Local Node test suite: 524/524 PASS at pre-candidate.
- Next safe action: freeze SHA, independent review and hosted CI, preview
  user-facing design; no Production merge until approval of this revision.
