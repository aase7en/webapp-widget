# Final owner-approved UTH LED Weather: one advisory badge (2026-11-08)

**SIMULATED QA ONLY — screenshots are NOT live weather data or official alerts.**

The owner approved PM2.5, Water Level and Weather typography/°C and new
health/comfort badge, with one final change prior to production:
remove the **duplicate top orange warning** entirely.

## Actual frontend change
- Deleted `#advice.heat-tag` element rather than hiding it.
- Deleted duplicate badge rendering JS and dead CSS; no duplicate screen-reader
  status. The only live `role=status` is `#temp-guidance`, below temperature.
- Existing heat-index `heat()` calculation is still used to select advice
  based on observed/model temperature + valid RH (0..100) and source freshness.
  It is general NWS-derived guidance, **not** an official local public alert.
- No health advice if historical or unavailable; impossible 100/1000°C stress
  inputs show `ตรวจสอบข้อมูล`. Full accessibility description preserved.
- Font size stays 90 board-px, three/four-digit numbers translate left; clock,
  storm animations, °C, Feels Like, 4+3 panel, other screens and backend stay.

## Reproducible tests and images
- `scripts/qa-weather-advice-20261108.cjs` uses real frontend renderer
  and synthetic fixtures, *not* weather backend measurements.
- `browser-qa.json` records 14 weather states, statusBadgeCount==1 and
  upperWarningCount==0, geometry, disabled/stale, extreme values, reduction,
  fallback heat, no accidental forecast/clock overlap.
- `weather-heat-432x40.png`: bottom `ระวัง Heatstroke` only, no orange top.
- `weather-mild-432x40.png`: ordinary weather and lower label.
- `weather-quad-432x40.png`: 1000°C stress, full-size number and QA alert.
- `weather-fallback-heat-432x40.png`: single badge when optional 4+3
  hybrid renderer fails.

Supersedes the earlier visual evidence at
`docs/led-weather-advice-20261108/` (which preserves the pre-removal design).
The historical screenshot files remain for audit only.
