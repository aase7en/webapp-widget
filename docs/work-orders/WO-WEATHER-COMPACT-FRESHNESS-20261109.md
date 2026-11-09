# WO — Weather live historical banner compact + Feels/Advice restore (2026-11-09)

## Current evidence and authority
- Target: aase7en/webapp-widget, NOT env-wastewater-webapp.
- Owner's screenshots (2026-11-09, local ~12:42): source-age banner over 4+3 forecast, rain percentages clipped at bottom, Feels Like and guidance absent.
- Real Chrome 2026-11-09T05:50Z confirmed native 432x40 DPR3, HTTP 200, HISTORICAL from Open-Meteo observedAt 2026-11-09T02:30:00Z (09:30 Bangkok) exceeding 3h freshness threshold. weather-luxury.js explicitly hides .feel-value when historical; weatherGuidance returns null on historical. Hybrid .hybrid-status overlays 143x10 native px over forecast. First rain row bounds y=34..40 (bottom at LED edge).
- Production main exact SHA d223f8263a4ecd02b727cb43604bf885f7863faa (PR #98 merged).
- Isolated writer branch fix/weather-clock-freshness-20261109; worktree /Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-weather-freshness-20261109 clean from exact main. Other owner worktrees protected.
- Repo-local AGENTS.md and predecessor WO reviewed. Latest owner request authorizes Weather-only visual change without fabricated operational measurements.

## Scoped change
1. Remove visible freshness/availability overlay from Forecast entirely; preserve observedAt, HISTORICAL/UNAVAILABLE, accessible forecast description and source values.
2. Tiny source-age note below clock with abbreviated Bangkok observation date/time when historical; full source label in title/ARIA; unavailable gets 'ไม่มีข้อมูล'.
3. Restore Feels Like if valid feelsC exists even historical, explicitly qualify as OLD/model-derived, not current.
4. Restore lower comfort/health advice derived from old values with a visible 'เดิม:' prefix and amber stale cue; accessible detail explicitly states advice is HISTORICAL, not a live health warning. Never create advice if temperature unavailable; preserve validity limits and NWS bands.
5. Shift 4+3-day probability labels up within native 38-pixel forecast; preserve 4+3 rotation, clock, 90px digits, Celsius, storm assets, reduced-motion and responsive.
6. Scoped root/Weather cache keys, tests and SIMULATED QA screenshots/evidence.

## Forbidden
No PM2.5, Water Level, Google Sheet, Apps Script, backend or API mutations; no changing sensor/model values or timestamps; never convert missing/historical into current.

## Gates
Local Node tests; Chrome 432x40 DPR3 simulated fresh/historical/unavailable fixtures with geometry, both forecast pages, fallback/reduced-motion/390 mobile; independent exact-SHA review + hosted CI; PR exact-head merge; real GitHub Pages build/deployment and post-release Browser QA before claiming success. Retain reversible scoped visual changes and exact SHA.


## Implementation and QA checkpoint
- Reproduced exact Production HISTORICAL source age at 12:50 Bangkok,
  model observedAt 09:30. Hybrid status overlay deleted.
- Weather source note now beneath clock; daily rain percentages moved
  ~2 native px upward, visible both 4-day and 3-day pages.
- Feels restored for valid historical feelsC, tinted amber with original
  timestamp; advice shows 'เดิม:' and old-data caveat, never live alert.
- Root/Weather HTML, JS, CSS and hybrid JS cache keys consistently
  20261109-compact-1. PM and Water cache keys unchanged.
- Full Node suite 534/534 PASS. Browser 432x40 DPR3 simulated fixtures:
  historical, fresh, unavailable, missing forecast, 9sec 4+3, fallback,
  reduced-motion, and storm artwork visible. Evidence in
  docs/weather-clock-freshness-review-20261109/.
- Pending exact-SHA independent review, hosted CI, PR and production
  deployment/verification gates.


## Additional integrity QA before exact-SHA release
- Invalid historical observedAt remains HISTORICAL (not current).
- Missing historical feelsC never becomes 0°C, including accessible text.
- Dedicated browser QA includes both synthetic edge cases and unchanged
  NWS thresholds / observedAt separation.
