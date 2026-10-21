# Uthai LED v2 — static release candidate (2026-10-21)

Visual baseline: user-approved local preview at `http://127.0.0.1:8128/`.
This `v2/` tree is **static** and does not require or reference the Mac
read-only Python proxy. The candidate root `index.html` now embeds the 432×40 rotating v2 mode.
The previous native strip is preserved at `legacy.html` for rollback.
Nothing is deployed until exact-SHA review/CI and release gates pass.

## Data contracts

- PM2.5: Existing Apps Script `?action=data&v=1` via the existing
  repository's canonical CORS/JSONP-safe reader (`../led-rotation.js`).
  GISTDA Tambon-level concentration, **not a hospital-mounted sensor**.
- Weather: Existing Apps Script Open-Meteo model data with observedAt,
  and separate Open-Meteo model hourly forecasts from the approved
  location coordinates. Forecasts are predictions, not measured weather.
  Attribution: [Open-Meteo CC BY 4.0](https://open-meteo.com/en/terms).
- Water: Public [ThaiWater/HII waterlevel_load](https://api-v3.thaiwater.net/api/v1/thaiwater30/public/waterlevel_load),
  stations HDA004 (471583) and S.5 (2607). Values are meters MSL
  (`waterlevel_msl`). `min_bank`/ `ground_level` serve only station
  geometry; neither station is a flood sensor at Uthai Hospital.
- The **orange within 0.50 m of bank** is a conservative UI tracking
  threshold previously selected for this display, **not verified as an
  official station-specific warning order**. Red at bank level indicates
  overtopping of the station reference, not an established hospital
  flood threshold; cyan means only below the local UI tracking band.
- Missing/stale records, absent coordinates, missing bank metadata, and
  API failures must remain unavailable, never silently 0/safe/normal.
  The trend delta is only shown after two distinct live observations
  observed during the same browsing session. No synthetic 7-day history.

## Release

UI at `/v2/` presents three separate 432 × 40 CSS-pixel strips
for visual inspection. `/v2/index.html?display=led` presents a single
432 × 40 strip rotating PM2.5 → Weather → Water every 22 seconds.
Only presentation changes with this URL parameter; the data source is fixed. The root displays the same single-strip rotation via an iframe.
This candidate is not live on `main` until accepted and merged.

Changes to the root/production require current repo ownership and safe
release gate, exact-SHA PR review, GitHub Actions checks, and live website
verification. Do not mistake passing static-unit tests for production
approval. Never force-push the dirty inherited KiloCode branch.

Run:
```
node --check v2/api-client.js
node --check v2/live-widgets.js
node --check v2/weather-live.js
node --test tests/v2-static.test.cjs
node --test tests/*.test.cjs
```

## Glass, safety advice and illustrative overflow (2026-10-21)

- The 432×40 glass edge is drawn as a thin, semi-transparent inset rim. The
  center-top highlight is low opacity and placed **behind labels** to keep
  timestamps, temperatures and station names legible.
- The Weather advice badge is **not an official watch/warning**. It is a
  source-based *informational* recommendation derived from fresh Open-Meteo
  WMO code, a five-hour model forecast and (when available) the existing
  derived Heat Index. Conditions outrank color/design: missing current data
  shows UNAVAILABLE; missing forecast must not be described as all-clear.
  Heat guidance: [WHO heat and health](https://www.who.int/news-room/fact-sheets/detail/climate-change-heat-and-health),
  [CDC](https://www.cdc.gov/extreme-heat/signs-symptoms/index.html).
  Thunder/lightning: [NWS](https://www.weather.gov/safety/lightning-safety-overview).
  Fog driving: [NWS](https://www.weather.gov/safety/fog-driving).
  The display's 33°C/40°C Heat Index bands are **local UI advice triggers**;
  they are not authoritative Thailand or NWS official alert criteria.
- Water crest/foam animations depict a water sheet over the colored-gate
  illustration **only** when a fresh actual ThaiWater station value reaches
  or exceeds its source bank reference (`data-risk=critical`). This is
  still a visualization, not video evidence of a physical dam/wall spilling,
  and does **not** represent hospital flood exposure or an official warning.
  When below the station bank, WATCH, or UNKNOWN, the overbank spill sheet
  is hidden. Reduced Motion freezes the illustration.
- The previous straight pipe-like seep/outflow visuals are suppressed;
  no backend, trigger, data source, spreadsheet, or logging contract changed.

## Foreground icons and golden moon (2026-10-21)

- Midnight/weather crescent uses a **gold PBR-inspired SVG gradient and animated
  gloss**, with moon-and-cloud referencing the same golden crescent. It is
  SVG/CSS 2.5D (not an actual GPU 3D scene) with a Reduced Motion still.
- PM mascot/value grouping is optically centered within its 126px panel; PM
  measurement units move next to the label to avoid overlap for 3-digit PM.
- Mascot, weather clouds/moon, station gate and status glyph may extend over
  **internal** dividers without content-box clipping. The physical LED output
  remains **432 x 40 pixels**, so content cannot render outside the actual
  device edge. Important numeric data/percentages remain readable and in front
  where layers might otherwise collide.
- No water-level animation, observation, hospital reading, forecast, threshold,
  API/backend or source semantics are changed by this visual release. The
  separate movable spillway/dam prototype is intentionally not installed.
