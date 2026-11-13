# WO — LED storm icon and PM2.5 trend contrast (2026-11-13)

## Contract and ownership
- **Repository:** `aase7en/webapp-widget` (NOT `env-wastewater-webapp`).
- **User request:** strengthen dark/night rain cloud contrast with white cloud stroke, larger rain drops, larger lightning and synchronized cloud illumination; increase PM chart fill contrast and emphasize values 15–35 µg/m³ with log-like vertical compression of outliers.
- **Branch/worktree:** `fix/led-storm-pm-contrast-20261113` / `/Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-led-storm-pm-contrast-20261113`.
- **Base:** verified `origin/main` `43dd11044a88c1b0a3432de6e56b66e9f8e92cf6`.
- **Owner:** one isolated visual/frontend implementation lane; independent reviewer required before release.
- **Allowed:** weather 2.5D sprite generator and its 4 APNGs/4 LED posters, weather asset cache pin, PM chart renderer/CSS/SVG and scoped cache chain, relevant tests and QA script.
- **Forbidden:** production Sheets/Apps Script/backend, sensor measurements, environmental values/tiers, Water Level, third-party services/secrets.

## Implemented behavior
- Slate-grey shaded rain/storm clouds, with darker night palette and white outer rim.
- Broader/brighter rain streaks; larger branched yellow-white bolts synchronized with cloud flash aura. Retains 128x128 transparency, 96 frames at 50ms, repeat loop and reduced-motion posters.
- PM plotted Y uses monotonic `asinh((value-25)/5)` normalized to a chart max of at least 50. This **changes display geometry only**, not observations, units, time, or PM health bands.
- Increased area fill opacity, preserving lighter dashed-gap segments and adding a vertical highlight fade. SVG accessible label discloses the non-linear visual scale.
- **Existing PM chart is 24h historical**, not seven days; no unsupported data source or synthetic samples added.

## Verification, fixtures and scope limits
- `node --test tests/*.test.cjs`: **543/543 PASS** (2026-11-13).
- `git diff --check`: PASS.
- `scripts/qa-weather-storm-motion.cjs` with existing Puppeteer from `NODE_PATH`: PASS at 432×40 DPR3, four conditions, reduced-motion poster, mobile 390, no browser JS errors; uses **SIMULATED QA** fixtures.
- `scripts/qa-weather-icon-pm24-glow-20261109.cjs` run from an isolated temporary wrapper: PASS, 14 synthetic history points/14 halos, five health colors, 8-second retry recovery, eight Weather conditions.
- APNG inspection: 96 frames each; night non-flash cloud mean RGB ~79 and peak frame 12 ~189 (localized synchronized flash), compared with day unlit ~107.
- Real physical LED, iPhone Safari, live backend and post-deployment Pages **not verified**.
- Open PR #99 also edits Weather source; check base/ownership and re-review overlapping boundaries before accepting either merge.

## Release gates / next safe action
1. Freeze exact candidate SHA and inspect intended diff; ensure no generated/cache files or confidential data.
2. Create a PR; verify GitHub PR diff and hosted CI on exact HEAD.
3. Obtain independent review, reconcile overlap with PR #99 and repair if warranted.
4. Merge only under current repo policy, then verify Pages deployed artifact and physical LED when available.
