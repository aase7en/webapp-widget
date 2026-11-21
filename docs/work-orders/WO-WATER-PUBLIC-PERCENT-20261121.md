# WO — Public Water Level percent / distance-to-bank: DEMO FIRST (2026-11-21)

## Decision
- Owner approved an interactive DEMO to evaluate a public-facing percentage-first layout alongside remaining metres to bank, while preserving staff-accessible m MSL. No production layout/release decision was made.
- Widget GitHub main checked at 6b4111ec5413983ece25788a074dc3e7e9c2b95b; canonical backend remains existing API Report_PM2.5 Sheet and bound Apps Script.
- Preview repo aase7en/uth-weather-led-ab-preview-20261104, published isolated demo SHA 36e5798cd30f3e8953b3ebc4d47848aad5785da2. All demo readings are SIMULATED.

## Measurement and safety contract
- Current UthApiClient reading fields include levelMsl, groundMsl, bankM, observedAt and status; the display currently assigns its local datum='MSL' state to valid observations, which is NOT proof of a datum field from the upstream API. Verify common MSL datum at source before release. HDA004 and S5 are reference stations, NOT hospital sensors.
- Formula = 100*(levelMsl-groundMsl)/(bankM-groundMsl), requiring finite, compatible MSL references and bank>ground. Existing production bankIntervalPercent() in v2/water-luxury-live.js already returns null when level<ground; this is a display guard, NOT evidence that the source measurement is invalid. A future feature must explicitly review signed/below-ground values before deciding how to present them. Never silently clamp >100; invalid/null/unknown != zero.
- Gap-to-bank = bankM-levelMsl metres. Sign must be disclosed as below/at/above bank reference. Percentage is NOT flood probability, river capacity, certified flood alert or evacuation instruction.
- Preserve real m MSL for staff, station name and observedAt (not fetchedAt). Existing production water-luxury-live.js classifies observations older than 3 hours as HISTORICAL (renderStation/bankBadge/apply); this is a current client freshness rule, NOT a new source or official flood-warning threshold. Revalidate its suitability with current API/data policy before adopting future features. Trend arrows require verified timestamped actual observations; preview arrows are visual fixtures only.

## Ownership and allowed scope
- Isolated Mac SundayMCP docs worktree /Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-water-bank-docs-20261121; branch docs/water-bank-percent-demo-audit-20261121. Root weather worktree is dirty and protected.
- Allowed before owner review: README, VERSIONS, AGENTS, v2 README status pointer, DESIGN-SYSTEM, root SESSION-HANDOFF, UX defect-memory document and this Work Order.
- Forbidden: production frontend code, data-source mapping, backend, Sheet, Apps Script, CI, sensor data, secrets, raw exports. Demo preview repo is separate.

## Verification and next action
- Chrome 432x40/mobile/reduced motion, dual/focus, six SIMULATED scenarios, no API calls/no JS errors PASS. Fixture HDA004 2.36/.227/3.03 -> 76.1%, 0.67m; S5 .88/-8.59/4.7 -> 71.3%, 3.82m.
- Preview Pages built SHA 36e5798, HTML/CSS/JS 3/3 HTTP 200 EXACT. Physical LED and Safari post-design not verified.
- ONE next safe action: owner reviews https://aase7en.github.io/uth-weather-led-ab-preview-20261104/water-bank-clarity-20261121/ ; only after approval prepare production feature PR with data quality, CI and exact-SHA independent review. No automatic Production merge.
