# UTH Widget — Production cache versions and GitHub state

**Checked:** 21 November 2026 (Asia/Bangkok). **Source of Truth:** GitHub aase7en/webapp-widget main SHA 6b4111ec5413983ece25788a074dc3e7e9c2b95b at audit time. GitHub Pages build status built at this exact SHA (latest build updated 2026-11-13T18:38:11Z).

HTTP/byte-level production verification performed 21 November for index.html, v2/index.html, v2/water-luxury-live.html, v2/water-luxury-live.js, v2/water-luxury-live.css and the previous docs/readme/VERSIONS.md: all HTTP 200 and EXACT compared to audit main, before this document-only PR. This validates served files, not browser cache or physical LED.

## Current production asset cache keys (from actual HTML)

| Rendering entry or resource | Current query version on main |
| --- | --- |
| Root index.html → v2/index.html?display=led | 20261114-pm-softfade-1 |
| v2/index.html → PM2.5 iframe | 20261114-pm-softfade-1 |
| v2/pm25-live.html → pm25-live.js | 20261114-pm-softfade-1 |
| v2/index.html → Weather iframe | 20261113-led-contrast-1 |
| v2/weather-luxury.html → weather-luxury.js | 20261113-led-contrast-1 |
| v2/weather-luxury.html → weather-hybrid-live.js | 20261109-compact-1 |
| v2/index.html → Water iframe | 20261108-label-1 |
| v2/water-luxury-live.html → water-luxury-live.css/js | 20261108-label-1 |
| v2/water-luxury-live.html → api-client.js | 20261031-pm25-24h-1 |

These are browser cache-busting **asset identifiers**, not a coherent Semantic Version (SemVer) of the application. Some unaffected scripts intentionally use older query keys. No package/product version number is defined in the inspected root tree. Never change cache identifiers merely to suggest a new release.

## Boundary: future Water public clarity

A separate static SIMULATED preview is published at https://aase7en.github.io/uth-weather-led-ab-preview-20261104/water-bank-clarity-20261121/ (preview repo merge 36e5798cd30f3e8953b3ebc4d47848aad5785da2). That is NOT a new asset version of the production Water page. Current production still presents m MSL as the dominant reading; owner review is required before a separate production feature PR.

Recheck GitHub ref, app source, GitHub Pages build SHA, HTTP served bytes and (separately) kiosk refresh before concluding that a later change is live. Canonical continuity is root SESSION-HANDOFF.md, not this snapshot.
