# Weather icon clearance and PM2.5 24h chart resilience — 2026-11-09

**All screenshots here are SIMULATED QA**, not real PM2.5 measurements, weather observations or health alerts. The visuals use the actual changed frontend renderer.

## Proven read-only Production baseline
- Direct backend JSONP action=pm25_history returned status=ok, schema=1,
  location=uthai and 14 genuine points (2026-11-08T08:00Z 14.5 µg/m³ through
  2026-11-09T05:00Z 14.3 µg/m³).
- One Production browser load showed empty SVG series (0 children) while PM
  hourly reading existed; another rendered 14 actual points (40 children).
  Failure was intermittent frontend retrieval/render, not no backend history.
- Old history bridge cleared lastHistory on any 9s JSONP failure and waited
  up to 15min before ordinary retry. No transparent loading/error state.
- Weather icon partly-cloudy x~87..159 native LED vs advice beginning
  x135; opaque cloud could touch the health advice. Clock ends near x64.

## Repair
- PM bridge keeps previously verified actual history on transient failure
  with status RETAINED, bounded retries after 8/20/60 seconds (max 3)
  and one in-flight request. Ordinary 15min refresh remains. Full 24h
  source timestamp filter stays in renderer: no fabricated points.
- Clear chart statuses: loading / temporarily unavailable / genuinely
  empty within 24h / retained from previous successful request.
- True observed points keep existing 5-tier colors and line/area gradients.
  Tiny 1.2 SVG-unit core (old 1.8) plus soft static 3.1 SVG-unit halo,
  both colored from unchanged PM25Tier.tierFor(value).
- Weather condition-specific icon and reduced-motion poster move left;
  no asset resizing or metric/clock/advice displacement.

## Browser and test evidence (SIMULATED fixtures)
- scripts/qa-weather-icon-pm24-glow-20261109.cjs uses local same-origin
  server and actual PM and Weather production HTML/CSS/JS.
- 14 synthetic readings cover all five tier colors and form 14 cores
  + 14 glows. A mocked first JSONP error then valid 8s retry recovers
  all 14 readings, with zero injected Production measurements.
- Weather icons tested in 8 weather conditions plus reduced-motion poster parity. Screenshots include
  pm24-glow-432x40.png, weather-icon-partly-cloudy-432x40.png and others.
- browser-qa.json stores actual geometry, point hues and fallback paths.
- Focused unit tests for history retries, retained source, empty source,
  risk-based colors and statuses.
- Backend, Google Sheet, Apps Script and Water Level are NOT modified.
- Physical LED panel and Safari device NOT VERIFIED.

## Gate
Full Node tests, Browser QA, independent read-only exact-SHA review,
hosted GitHub CI, PR exact-head merge, GitHub Pages deployment and
real Production Chrome with genuine backend data.
