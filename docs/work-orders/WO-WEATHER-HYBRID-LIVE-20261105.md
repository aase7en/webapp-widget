# WO — Weather Luxury + Icons 4+3 Production Integration (2026-11-05)

## Decision / scope
Owner explicitly authorized replacing the real Weather page on 2026-11-05 after approving the separate demo.
Repository: `aase7en/webapp-widget`, NOT `env-wastewater-webapp`.
Base Production main: `f8c3cd829bf578ff07ca0d1c69f49bd31e552baa`.
Isolated clean worktree: `/Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-weather-luxury-icons-live-20261105`.
Branch: `feat/weather-luxury-icons-live-20261105`; do not edit the dirty root or other worktrees.

**Allowed changes:** Weather overlay renderer/CSS and its scoped integration in `v2/weather-luxury.html` and `v2/weather-luxury.js`, Weather-only versioned iframe URLs, test updates and this Work Order.
**Forbidden changes:** PM2.5 and Water renderer/DOM, Google Sheet, bound Apps Script, deployed API, other data transport, local storage namespace and legacy fallback mechanisms.

## Source of truth / data integrity
The canonical Weather source remains the existing bound Sheet snapshot_v1 via `UthWeatherSnapshot.parse` in `v2/weather-snapshot.js`. The existing validated local lastGood and read-only GitHub weather-data continuity transport remain unchanged. Weather is an **Open-Meteo model**, not a physical sensor stream.

The new overlay receives the actual parsed data object from the existing `paint(d)`, using `d.temperatureC`, `d.feelsC`, `d.rainPct`, `d.humidityPct`, `d.high`, `d.low`, each `d.days[].day/hi/lo/p/ico` and real `d.observedAt`/provenance. No fixture values are embedded in Production. Unknown stays `—`; true 0 remains 0. Real daily weather-code mapping drives SVG weather pictograms, **never a guessed icon based solely on temperature/rain**.

Preserve `MODEL_LATEST`, `HISTORICAL`, `UNAVAILABLE` and visibly surface actual `observedAt` when historical. No fabricated source times; no stale source labeled live. Decorative heat colors at 35°C/38°C are **not** health thresholds. The original advice calculations and suppression on historical data remain owned by the existing renderer.

## Visual / runtime
Preserve original Luxury clock size and x-position, APNG, reduced-motion poster, scenic artwork and glowing frame. Shift scenery/current temperature/animated icon left as approved. Show crisp colored SVG icons + values for RAIN/HUM/HIGH/LOW. No visible graph. Show daily weather icons, high/low and precipitation in 4-day first page and 3-day second page at a fixed 9-second interval. Original 432×40 screen and mobile scrolling remain supported.

The hybrid JS/CSS must fail closed: if JS fails to initialize, original renderer remains; if a runtime hybrid paint fails, original renderer is restored. Source-unavailable scene/image elements must not render broken-image glyphs.

## Verification / release gates
Pre-release: inspect diff (no Water/PM2.5 changes), JS syntax, all repository tests, deterministic 432×40 Browser QA (fresh, 4+3 rotation, historical observedAt, missing/null, 100%/extreme values, image fallback, reduced motion, mobile), independent read-only code review of frozen SHA, and Hosted GitHub CI on that SHA. Reconcile every blocker before merge.

Do not infer physical LED or real iPhone Safari verification from desktop Chrome; owner can perform that visual check after hosted rollout. No additional authorization is needed for this owner-requested Weather-only deployment when gates pass.

## Rollback / post-release
Rollback is GitHub revert of the exact Weather integration merge commit (with intact previous `f8c3cd8` Weather renderer and cache versions), wait for GitHub Pages to rebuild, verify real URL/iframe asset status and Last-Known behavior. No Sheet, Apps Script or trigger rollback is permitted or required.

Post-release verify main SHA/PR, GitHub Pages build, actual Weather URL HTTP 200, new CSS/JS, 432×40 and B rotation, visible source provenance (including old/unavailable), and untouched PM2.5/Water iframe URLs/blobs. Distinguish QA fixtures from actual operational data. Report `Verified`/`Unverified` with final live URL.
