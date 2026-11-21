# WO — Water Level public percentage production adoption (2026-11-21)

## Owner authorization and active boundary

Owner explicitly approved the **original production Water visual plus percent/arrow/gap** preview (dedicated preview PR #8) and requested deployment to **webapp-widget main**, along with professional docs, screenshots and versioning. This supersedes the prior DEMO-only no-release decision for the Water public metric feature, but does NOT authorize data-source replacement or unvalidated official flood warning claims.

- Repository: aase7en/webapp-widget (not env-wastewater-webapp)
- Verified base main: 48bd6745e2dab22b3c2eb1cb5b45f3a44812f799
- Mac SundayMCP clean one-writer worktree: /Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-water-percent-production-20261121 ; branch feat/water-percent-production-20261121
- Other repo root worktree is dirty with untracked .kilo/.tmp/kilo; do not touch. No changes to canonical Google Sheet, bound Apps Script, HII, GISTDA, Open-Meteo API clients, backend, PM/Weather display semantics, original water core CSS/animation/7-day graph.
- Allowed: scoped Water DOM display, separate CSS override, cache pin cascade, tests, local SIMULATED browser QA screenshots, documentation and release evidence.

## Real data and correctness

- Existing trusted client: window.UthApiClient.getWater(), from ONLY canonical Google Sheet API Report_PM2.5, bound Apps Script water_history endpoint, not a browser-direct HII provider call.
- Two HII reference stations HDA004 and S5; they do not measure actual flood safety at a hospital.
- Same-datum fraction: 100*(levelMsl-groundMsl)/(bankM-groundMsl), existing bankIntervalPercent keeps the below-ground display guard; over 100% is never clamped. Units: % of ground-to-bank interval, not capacity, flood probability or official warning.
- Physical below/at/above gap in metres: bankM-levelMsl. Staff-accessible original m MSL preserved as title/accessible metadata; observed time displayed explicitly.
- Only show a fresh dominant percent when station status ok, observedAt valid/fresh within existing 3h rule, and bank/ground valid; otherwise —% and historic/missing cue.
- A screen-reader-accessible label includes the original m MSL and observation time; new attribute text is HTML-escaped. Conflicting same-timestamp series values fail closed to unknown, exact duplicate records are collapsed without order-dependence.
- Direction arrow is derived, never guessed: verify latest trend timestamp within 15 minutes of current observation, level within 0.05 m; prior distinct measurement between 30 minutes and 6 hours earlier. Up/down threshold 0.015 m. Otherwise —. Verified history path drawing remains exactly as before.
- No new flood alerts, emergency actions, physical gauge inference, storage/sluice capacity metrics or fabricated sensor readings.

## Verification / release

- Local Node focused 18/18; full Node 558/558 (after scoped cache test refresh).
- Native Chromium 432x40 and DPR3 screenshot, six explicitly SIMULATED statuses (sample/near/at/above/stale/missing); original gate canvas animates and sparkline remains, no external API calls, no page JS errors, every reading/secondary label fits bounds and arrows do not overlap graph.
- Chrome screenshots captured by actual source renderer with mocked UthApiClient, NOT operational measurements.
- Gate: exact-SHA independent reviewer, GitHub hosted PR CI, expected-head merge, Pages built SHA, production HTTP byte check and public Chrome smoke without mocks. Physical LED panel and Safari verification remain separate limitations; revert targeted PR if unanticipated issues.
- README/changelog/version and multi-site adoption plan may be delivered in a separately reviewed/docs PR after core production release; no speculative live data or API credentials.
