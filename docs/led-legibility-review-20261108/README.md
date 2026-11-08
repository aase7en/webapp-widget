# UTH LED Weather degree + Water Level history: November 8, 2026

**All images are SIMULATED QA FIXTURES, not LIVE or measured environmental data.**
The browser uses actual production HTML/CSS/JS renderers, with synthetic fixtures.

## Verified causes in production before proposed changes
- Weather: the degree used a negative -6px margin and +11px raised baseline,
  overlapping the temperature or falling behind the 4+3 forecast panel.
- Water: at check time, each station had 30 verified samples, but HDA004 only
  covered ~31 hours and S.5 ~41 hours within the last 168h. The old X-axis
  pinned samples to seven full days, leaving short paths at the right.
  Maximum observed gaps: 2h at HDA004, 3h at S.5.
- ThaiWater standard m MSL equals metres relative to mean sea level, i.e.
  Thai ม.รทก. No datum conversion or new weather/water value was introduced.
- Water station A datum previously overlapped the sparkline rectangle by
  about 5 native LED pixels. Reading-unit group moves left so it clears.

## Candidate presentation
- Weather temperature followed by smaller, lowered and legible °C.
- Water level next to m MSL, followed by concise HII reference, OBS timestamp,
  GROUND–BANK percent. Bank comparison badges remain Thai because they
  are descriptive and not official flood warnings.
- Seven-day lookback stays fixed for selecting valid samples; the graph
  *horizontal drawing range* expands to the span actually observed.
  Label 31H / 7D means 31 observed hours inside seven-day lookback,
  not that seven complete days were measured. SVG aria details preserve
  precise duration and count. Fewer than 2 time-distinct samples:
  7D HISTORY / NO DATA, never a synthetic trend.

## Reproducible browser QA, SIMULATED
- weather-24-432x40.png: clearly visible trailing degree.
- weather-100-432x40.png: 3-digit stress case.
- weather-1000-432x40.png: 4-digit extreme stress case.
- water-31h-41h-432x40.png: 2-station real renderer with simulated 30
  points each, honest 31H/41H time coverage and no unit-vs-graph overlap.
- water-no-history-432x40.png: absent history explicitly indicated.
- browser-qa.json: actual Chromium geometry and assertion results.
- Reproducer: scripts/qa-led-legibility-20261108.cjs with local Puppeteer.
- All changes are on a candidate branch; no production change yet.
- Physical LED/iPhone Safari NOT VERIFIED. Backend, Sheet, Script unchanged.
