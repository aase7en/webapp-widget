# Weather Rain + Thunderstorm LED Motion — 2026-11-06

## User direction / visual intent
Improve the real **aase7en/webapp-widget** Weather Luxury 432×40 LED icon only:
bigger, plumper blue cloud centered lower; vivid rain streaks of deliberately mixed
sizes; visible white-yellow branching lightning and wind on day/night thunderstorm.
Keep the already accepted Luxury clock, 4+3 forecast, crisp metrics, °C and border.

## Repo / ownership / source of truth
- Exact origin: `https://github.com/aase7en/webapp-widget.git`.
- Verified base `origin/main`: `aa2c61ed4390c87e465d05695c2019e1aada4d08` (post PR #94).
- Isolated worktree: `/Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-weather-storm-clarity-20261106`.
- Branch: `feat/weather-storm-clarity-20261106`. Mac root and Windows dirty worktrees left untouched.
- Existing `AGENTS.md`, `.agents/skills/handoff/SKILL.md`, `SESSION-HANDOFF.md` read-only.
- Do not mix with ENV wastewater repo. No Google Sheet / bound Apps Script / PM2.5 / Water changes.

## Exact implementation
- Four 128×128 transparent 96-frame APNG sprites at 50 ms/frame (4.8 seconds/loop):
  `rain`, `thunderstorm`, `night-rain`, `night-thunderstorm`.
- Matching static posters, including visible lightning in both storm posters
  for `prefers-reduced-motion`.
- Source generator: `scripts/build-weather-storm-motion.py` (deterministic Pillow).
- Cloud silhouette now physically taller and wider, blue-cyan highlights, modest
  shadow edge. Rain uses 23/27 drops in three sizes, brighter aqua/cyan, seamless
  frame trajectories. Storm has wind streaks and distinct irregular lightning pulses.
- Condition-only CSS positioning: day rain/storm top -30px / X -96px;
  night rain/storm top -14px / X -90px (pre-scaled 1296×120 board coordinates).
- Targeted APNG/poster cache-busters plus Weather-only iframe/script/style version.
  No modified weather model `source`, `observedAt`, transport, storage or values.

## Evidence / gate
- Browser QA with local non-operational fixture (no external Weather requests):
  4 condition renders, 432×40 geometry and clock unchanged, font/data, poster,
  missing != 0, mobile 390. Screenshots in `docs/weather-animation-review-20261106`.
- Repository tests: 516/516 PASS; image signature/frame count/50ms checks.
- Alpha/pixel proof: lightning f0=0 vs f12=193 bright pixels in each storm,
  rain/night-rain 264 bright cyan pixels in y80–124 region.
- Real iPhone Safari and physical distance-view LED remain UNVERIFIED.
- Must obtain independent exact-SHA read-only review and GitHub hosted CI
  before any Production merge. Preview can publish separately for Visual Approval.

## Rollback
Revert only exact Weather motion commit/PR (sprites, posters, CSS, source
cache-busters). Confirm GitHub Pages rebuild, real Weather model/source/observedAt,
clock, 4+3 rotation, and untouched PM2.5/Water. Do not roll back Google data.
