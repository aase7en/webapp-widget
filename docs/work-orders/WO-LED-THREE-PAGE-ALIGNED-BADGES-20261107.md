# WO — LED Three-Page Aligned Typography & Weather Badges (2026-11-07)

## Authoritative owner approval (newer than PR #96)
Owner expressly APPROVED Aligned Typography on **all three** PM2.5, Weather and Water Level
screens. No reapproval of this visual choice is needed. Before release, repair Weather
Feels Like + heat-warning badge overlap, add simple meaningful icons and preserve the original
warning thresholds, weather model provenance and all environmental data transports.
2.5D cloud depth is out of scope.

## Identity, ownership and dependency
- Repository: **aase7en/webapp-widget**, never env-wastewater-webapp.
- Base: storm asset PR #95 HEAD `2e76f427c4ef51f9963be44a75505f1b87cb14d5`;
  remote production main at work-order start `aa2c61ed4390c87e465d05695c2019e1aada4d08`.
- Isolated worktree: `/Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-led-aligned-badges-20261107`.
- Branch/owner: `feat/led-three-page-aligned-badges-20261107` / integration lane.
- PR #95 independent exact-SHA review remains a release dependency.
- PR #91 and PR #96 both modify the canonical `SESSION-HANDOFF.md`;
  neither may be overwritten or merged blindly. This Work Order does not replace the handoff.
- Mac/Windows roots and all prior agent-owned worktrees remain untouched.

## Allowed scope and implementation
Only scoped PM, Weather, Water LED CSS/DOM presentation, matching frontend script
temperature/number sizes, cache keys, QA scripts/tests, screenshots and this Work Order.
No weather heat-index equations, health thresholds, source/observedAt, API,
Google Sheets/bound Apps Script, backend/fallback changes or fixture data in Production.
- PM default 112px/1000 → 100px/900 (original clock and numerical fallback intact).
- Weather default 92px/900 → 90px/900; slight top optical shift, °C remains visible.
- Water station levels 66px/1000 → 68px/1000; reading row shifts 4 board px,
  not 6, after deterministic pixel-mask QA showed 6 px can intersect detail ink.
- Weather Feels gets a compact thermometer SVG in top safe area; heat warning
  occupies a separate bottom safe area. Existing warning logic still chooses
  the two original Thai messages and suppresses current warnings on historical data.
- If a longer future warning exceeds the 126 board-pixel safe width, the
  LED still shows explicit '⚠ ระวังความร้อน' while the complete original warning remains
  in both aria-label and title. This is display compaction, not new risk logic.
- Weather storm APNG assets, reduced-motion posters and all original forecast
  graphics/4+3 rotation remain unchanged relative to PR #95.

## Validation and bounded evidence
- Deterministic layout fixture only, **SIMULATED / NOT operational observations**.
- QA source: `scripts/qa-led-aligned-20261107.cjs`. Run Puppeteer/Chrome
  with network blocked, native LED 432×40 @3x, 390px mobile and reduced motion.
- Browser geometry and warning-state results:
  `docs/led-aligned-review-20261107/browser-qa.json`.
- All screenshot names under `docs/led-aligned-review-20261107/`
  identify the visual state, not live meteorological measurements.
- Water 2-pixel vs 4-pixel vs 6-pixel shift differential analysis used
  separately rendered reading/detail pixel masks; 4px showed no overlap.
- Targeted tests: `tests/led-threepage-aligned-20261107.test.cjs`.
- Full tests (local Chrome / Node 22) 520/520 PASS on dirty pre-candidate,
  must rerun after candidate freeze. Actual iPhone Safari/physical LED distance UNVERIFIED.


## Owner visual corrections — 2026-11-07 06:25 UTC (LATEST)
- Weather visuals accepted. Retain previous warning/badge and storm behavior.
- Water Level last clock digit was clipped: original clock range glyph reached
  x=64.55 LED px while the 180-board-px clock ended x=63.67; the glass-card
  set overflow:hidden. Root fix: clock overflow:visible, z-index:12 and
  date/time z-index:13, above widget border decorations (z-index:7).
  Keep both station displays, time and water simulation semantics unchanged.
- PM: move label and value/µg/m³ group exactly 6 board px (2 LED px) left;
  chart/scale move 16 board px left and its right edge 30 board px left;
  health status has more space and a larger font, with a white SVG line sun icon
  only for short blue/green labels (no emoji-dependent rendering).
- Guidance copy simplified for 5 existing bands. This is display text only;
  PM25Tier.classify bounds, source, hourly-vs-24h semantics, transport,
  failure/freshness handling and missing-average fallback remain untouched.
- Visual QA uses the actual production PM render() via MessageEvent and
  production Water JS with stubbed historical API. All QA fixtures explicitly
  SIMULATED, never measurements. Reproducer: scripts/qa-led-owner-20261107.cjs.
  Evidence: pm-owner-{blue,green,yellow,orange,red,unavailable}-432x40.png,
  water-owner-clock-432x40.png, owner-feedback-browser-qa.json.
- No Production release until independent exact-SHA review, required CI and PR
  dependency/ownership gates are satisfied.

## Merge/release gate & rollback
1. Freeze exact branch HEAD, inspect PR diff/asset footprint.
2. Independent review at PR #95 HEAD plus integrated candidate exact SHA.
3. Hosted CI on required accepted SHA; browser QA on final candidate.
4. Resolve PR #91/#96 canonical handoff conflict without deleting history.
5. Merge PR #95 first only when its own review/CI gates pass. Then retarget/reconcile
   stacked three-page PR to main, preserving exact reviewed diff and no unsafe overwrite.
6. Release via GitHub Pages; verify actual PM/Weather/Water URLs and network
   cache-busters, Source/observedAt/HISTORICAL/UNAVAILABLE, 4+3 and fallback.
7. Roll back only the visual integration merge commit, preserving Weather data,
   canonical Sheet/Script and already accepted Weather motion if that PR is merged.

## ONE next safe action
At 2026-11-07 work-order creation: freeze a reviewable candidate and request
independent exact-SHA review plus hosted CI. No Production release before gates.
