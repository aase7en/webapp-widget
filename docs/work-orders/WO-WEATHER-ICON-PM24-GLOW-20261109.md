# WO — Weather icon clearance + PM2.5 24h graph recovery and smaller glow points (2026-11-09)

## Authority and actual baseline
- Target aase7en/webapp-widget, NOT env-wastewater-webapp. Owner requested two LIVE visual bugfixes: move occluded Weather art left of lower advice label; restore missing PM2.5 24h graph and make tiny luminous, risk-colored points.
- Repo AGENTS.md read; existing Google Sheet API Report_PM2.5 and bound Apps Script are canonical, neither touched.
- Main exact base 95b2c924c9740a7ef8a50bc83f3cfd8284c80206 (PR #100 merged). Isolated writer worktree /Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-weather-pm24-glow-20261109, branch fix/weather-icon-pm24-glow-20261109 clean at start. Other worktrees, including open PR #99, protected.
- Live Production Chrome around 2026-11-09T06:49Z observed PM iframe #series EMPTY (0 SVG children) with PM hourly value present; separate reload received 14 backend historical points and rendered 40 SVG children. Direct backend JSONP action=pm25_history schema=1,status=ok,location=uthai, 14 real points, first 2026-11-08T08:00Z / 14.5 µg/m³ and last 2026-11-09T05:00Z / 14.3 µg/m³. Frontend retrieval/render intermittent. Current bridge clears lastHistory on ANY 9-second failure and refreshes only every 15 minutes.
- Actual Weather partly-cloudy animated icon bounds ~x87..159 native LED, lower advice x135..200, opaque cloud overlaps advice; clock ends x64.

## Allowed changes
1. Weather: scoped CSS left translation of selected icon/poster sprites, preserving all other weather elements and reduced-motion poster.
2. PM bridge: transient history failure cannot discard previously confirmed real samples; mark stale/transport state and bounded retry, retain 15min refresh. Renderer filters strictly to last 24h, no invented measurements.
3. PM SVG: draw real observed points/gradient segments and compact honest loading/no-history state instead of unexplained blank chart.
4. PM point light: reduce core radius and subtle risk-colored halo from existing PM25Tier classification. Preserve five health tiers, dashed gaps, timestamps, low-end performance.
5. Scoped cache chain, browser QA native 432x40/390 mobile and full Node tests, SIMULATED fixtures only for stress QA.

## Forbidden/gates
- No changes to Google Sheet, bound Apps Script, backend, values, health thresholds, sensors, observedAt, PM/Water provenance. Unknown !=0; historical !=latest.
- Tests, browser QA, independent exact-SHA review, CI, exact-head merge; verify GitHub Pages and real Production after release.
- Respect one-writer-per-hotspot and current repo-local AGENTS.md.


## Final candidate QA notes
- Local Node suite expanded with bounded retry cap and PM point-color tests.
- Chrome local same-origin end-to-end test forces first JSONP script error,
  then waits for 8sec retry with 14 SIMULATED points; verifies five tiers
  and no false data. 8 Weather conditions and reduced-motion poster parity
  passed at native 432x40 DPR3.
- Source evidence/readme under docs/weather-icon-pm24-review-20261109.
- Preserve open PR #99 (another Weather branch) untouched; merge only this
  exact diff after independent reviewer and CI.
