# Changelog — UTH[AI] Environmental LED Widget

All notable changes are grounded in merged GitHub PRs and production verification. Product Semantic Versioning begins at v1.0.0; earlier UI PRs did not have formal version tags.

## [1.0.0] — 2026-11-21

**First formally versioned Uthai single-site baseline** — three rotating environmental panels on a 432×40 LED, served by static GitHub Pages.

### Features

- PM2.5: hourly main value, 24-hour average context, colored chart and honest missing-data handling, improved chart contrast from earlier merged PRs.
- Weather: temperature, Feels Like, humidity, rainfall probability and forecast; day/night animations, historical/unavailable labeling and Reduced Motion fallback.
- Water: original luminous 2.5D dam/water animation, seven-day observed-history graph and frame; large fraction of ground-to-bank elevation interval, physical metres remaining to bank, verified direction arrow when possible; original measured m MSL and observed timestamp in accessible label. Not an official flood warning. Delivered through PR #109; merge SHA 33926944e3535f7e7fae14ac4584f60de01e4b29.
- Data come through the existing canonical Uthai Google Sheet and bound Apps Script: no new backend, sensor claims or fabricated environmental readings.

### Documentation and governance

- README refresh with representative three-panel imagery and clear SIMULATED QA picture labels.
- VERSION, CHANGELOG and production cache matrix now separated.
- Multi-Site Adoption Plan added for a possible future API adapter + site profiles; **not included as executable functionality in v1.0.0**.
- Current AGENTS, single SESSION-HANDOFF, Design System, Water Work Order and historical UX Defect Memory updated to match verified state.

### Current limits

- Site configuration, backend endpoint, local station codes and provider contracts remain Uthai-specific.
- Provider rights, asset licensing and a future software LICENSE need an explicit owner decision before encouraging third-party redistribution.
- Chrome QA and data-source semantics were checked; physical LED/Safari remain distinct verification steps.

## Historical PRs (before formal SemVer)

- 2026-11-13/14 — Weather storm contrast and PM trend/chart gradient improvements (PR #102–#106).
- 2026-11-21 — Water public-readability percentage and measured direction, PR #109.
- Exact changes and deployment evidence remain authoritative in GitHub PR/commit and release history, not these retrospective notes.
