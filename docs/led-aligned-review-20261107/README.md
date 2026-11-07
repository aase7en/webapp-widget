# LED 432×40 — Aligned Typography + Weather Badges visual review

**SIMULATED VISUAL FIXTURES ONLY. NO REAL WEATHER, PM2.5 OR WATER MEASUREMENTS.**
These PNGs are generated locally from the actual production DOM/CSS with all
remote API traffic blocked. Clock, values and warning states are QA fixtures.
The owner-approved typography reference remains the 2026-11-06 Aligned variant.

| Screen | After candidate (at native 432×40 CSS px) |
|---|---|
| PM2.5 | ![PM aligned; simulated 32](./pm-aligned-432x40.png) |
| Weather + heat alert | ![Weather 32°C; simulated heat warning](./weather-hot-432x40.png) |
| Weather + mild heat | ![Weather warm; simulated](./weather-warm-432x40.png) |
| Weather + long warning | ![Adaptive warning; full text remains accessible](./weather-long-warning-432x40.png) |
| Water two stations | ![Water station value alignment; simulated levels](./water-aligned-432x40.png) |

Also verified: `weather-negative-432x40.png`, `weather-triple-digit-432x40.png`,
`weather-unavailable-432x40.png`, `weather-historical-432x40.png`,
`weather-reduced-motion-432x40.png`, `weather-mobile-390.png`.

- Browser geometry and scenario state: [browser-qa.json](./browser-qa.json).
- Reproducer: `node scripts/qa-led-aligned-20261107.cjs` (Puppeteer + Chrome).
- Browser checks: separate badge y-safe-zones, no overlap, °C before forecast panel,
  original clock untouched, correct visible/non-visible warning behavior,
  full long-warning text in `aria-label`/`title`, historical/unavailable,
  reduced-motion poster, mobile 390 and two Water stations.
- The current Weather production heat-index warnings remain unchanged:
  `ระวังร้อน` / `ระวังร้อนจัด`; the synthetic longer message is ONLY to
  exercise the compact-display fallback, not a new warning policy.
- Real hardware distance readability and iPhone Safari remain UNVERIFIED.

## Owner feedback round (2026-11-07)

SIMULATED QA FIXTURES — NOT LIVE READINGS. These images use the
production PM2.5 JS render() and the production Water renderer with
intercepted test data; no real network API read is performed.

| Health tier | Updated screenshot |
|---|---|
| Blue / ดีมาก | ![PM blue](./pm-owner-blue-432x40.png) |
| Green / ดี | ![PM green](./pm-owner-green-432x40.png) |
| Yellow / ปานกลาง | ![PM yellow](./pm-owner-yellow-432x40.png) |
| Orange / เริ่มมีผลต่อสุขภาพ | ![PM orange](./pm-owner-orange-432x40.png) |
| Red / มีผลต่อสุขภาพ | ![PM red](./pm-owner-red-432x40.png) |
| Unavailable average | ![PM unavailable](./pm-owner-unavailable-432x40.png) |
| Water clock never clipped | ![Water clock](./water-owner-clock-432x40.png) |

Reproduce: NODE_PATH=<installed-puppeteer> node scripts/qa-led-owner-20261107.cjs.
Evidence: owner-feedback-browser-qa.json and water-ink-verification.json.
The original green/blue emoji sun was replaced with a minimal white SVG outline.
The last Water clock glyph was formerly clipped because it extended beyond the
clock's overflow:hidden boundary; it now renders atop decorative layers.
