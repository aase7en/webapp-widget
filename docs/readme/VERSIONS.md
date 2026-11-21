# Version and Asset Cache Matrix

Repository candidate v1.0.1 (verify merged GitHub main and Pages SHA before claiming deployed). Prior confirmed production baseline v1.0.0 SHA 97b3ec75cdfbdce523d99f9a6008c9a78422fc50. Product version and asset cache keys are different concepts.

| Resource | Cache pin |
| --- | --- |
| Root index to v2 index | 20261121-six-hour-1 |
| v2 index to PM and Water iframe | 20261121-six-hour-1 |
| PM iframe to pm25-live.js | 20261121-six-hour-1 |
| v2 index to api-client.js and live-widgets.js | 20261121-six-hour-1 |
| Water iframe to Water CSS, overlay CSS, JS and api-client.js | 20261121-six-hour-1 |
| Weather iframe / core JS | 20261113-led-contrast-1 (unchanged) |
| Weather hybrid JS | 20261109-compact-1 (unchanged) |
| PM Tier JS | 20261101-live-fix-3 (unchanged; PM renderer overrides 6h window) |

Measured PM/Water display age <=6h from observedAt, after that a dash plus ข้อมูลเก่าเกิน 6 ชม. Weather model remains 3h. The existing backend collector is unchanged, while PM read-only history fallback from the same Sheet bridges its 3h snapshot filter. For source and release gates see docs/work-orders/WO-WIDGET-SIX-HOUR-FRESHNESS-20261121.md.
