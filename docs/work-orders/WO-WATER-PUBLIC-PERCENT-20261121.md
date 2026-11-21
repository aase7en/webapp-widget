# WO — Public Water Level percent / distance-to-bank: DEMO FIRST (2026-11-21)

## Decision
- Owner approved an interactive DEMO, not a production release, for replacing dominant m MSL with percentage of validated ground-to-lowest-bank interval plus remaining metres.
- Widget GitHub main checked at 6b4111ec5413983ece25788a074dc3e7e9c2b95b; canonical backend remains existing API Report_PM2.5 Sheet and bound Apps Script.
- Preview repo aase7en/uth-weather-led-ab-preview-20261104, published isolated demo SHA 36e5798cd30f3e8953b3ebc4d47848aad5785da2. All demo readings are SIMULATED.

## Measurement and safety contract
- Real source fields: levelMsl, groundMsl, bankM, observedAt, status, datum MSL. HDA004 and S5 are reference stations, NOT hospital sensors.
- Percentage = 100*(levelMsl-groundMsl)/(bankM-groundMsl), requiring finite same-datum MSL, bank>ground and level>=ground. Never clamp >100; invalid/null/unknown != zero.
- Gap-to-bank = bankM-levelMsl metres. Sign must be disclosed as below/at/above bank reference. Percentage is NOT flood probability, river capacity, certified flood alert or evacuation instruction.
- Preserve real m MSL in staff detail, station name, observedAt (not fetchedAt). Historical observations older than 3h must not appear current. Trend arrows require verified timestamped actual observations; preview arrows are visual fixtures only.

## Ownership and allowed scope
- Isolated Mac SundayMCP docs worktree /Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-water-bank-docs-20261121; branch docs/water-bank-percent-demo-audit-20261121. Root weather worktree is dirty and protected.
- Allowed before owner review: README, VERSIONS, AGENTS, v2 README status pointer, DESIGN-SYSTEM, root SESSION-HANDOFF, UX defect-memory document and this Work Order.
- Forbidden: production frontend code, data-source mapping, backend, Sheet, Apps Script, CI, sensor data, secrets, raw exports. Demo preview repo is separate.

## Verification and next action
- Chrome 432x40/mobile/reduced motion, dual/focus, six SIMULATED scenarios, no API calls/no JS errors PASS. Fixture HDA004 2.36/.227/3.03 -> 76.1%, 0.67m; S5 .88/-8.59/4.7 -> 71.3%, 3.82m.
- Preview Pages built SHA 36e5798, HTML/CSS/JS 3/3 HTTP 200 EXACT. Physical LED and Safari post-design not verified.
- ONE next safe action: owner reviews https://aase7en.github.io/uth-weather-led-ab-preview-20261104/water-bank-clarity-20261121/ ; only after approval prepare production feature PR with data quality, CI and exact-SHA independent review. No automatic Production merge.
