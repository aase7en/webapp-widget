# Product Version and Asset Cache Matrix

**Audited 21 November 2026 (Asia/Bangkok).** Latest Water feature production source: merged main commit 33926944e3535f7e7fae14ac4584f60de01e4b29 (PR #109). GitHub Pages built at the same SHA; root index, v2 index, Water HTML/JS/original CSS/new CSS and api-client.js verified HTTP 200 and byte-identical 7/7.

## Version meanings

- **Product Version:** v1.0.0, recorded in root VERSION and CHANGELOG.md. This is the first official Semantic Version for the single-site Uthai deployment.
- **Asset Query Version:** a cache-busting identifier attached to a given HTML/CSS/JS dependency. It is not a product version; unchanged assets may retain older identifiers.
- No older product SemVer tag or GitHub Release was discovered at initial audit; prior cache query strings are not formal releases.

## Verified current production pins

| Resource | Cache key |
| --- | --- |
| root index → v2/index.html | 20261121-water-percent-1 |
| v2/index → PM2.5 iframe | 20261114-pm-softfade-1 |
| PM2.5 HTML → JS | 20261114-pm-softfade-1 |
| v2/index → Weather iframe | 20261113-led-contrast-1 |
| Weather HTML → core JS | 20261113-led-contrast-1 |
| Weather HTML → hybrid JS | 20261109-compact-1 |
| v2/index → Water iframe | 20261121-water-percent-1 |
| Water HTML → original CSS | 20261121-water-percent-1 |
| Water HTML → percentage CSS | 20261121-water-percent-1 |
| Water HTML → Water JS | 20261121-water-percent-1 |
| Water HTML → existing api-client.js | 20261031-pm25-24h-1 |

Do not alter cache strings merely to change the Product Version. PR #109 changed Water presentation, not PM/Weather data/API.

## Release verification

Confirm repo source and owner Work Order; run Node tests and browser native 432×40 QA with real animation plus simulated boundary states; exact-SHA independent reviewer and CI; expected-HEAD merge; Pages build SHA and public HTTP byte comparison; public browser smoke without Mock; physical LED is a separate visual acceptance.

**Planned future adoption:** multi-site config and API adapters are only a documented roadmap in docs/architecture/MULTI-SITE-ADOPTION-PLAN.md, not current v1.0.0 functionality. Existing Uthai bound Sheet/Apps Script remains the operational source of truth.
