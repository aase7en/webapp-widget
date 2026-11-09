# UTH Weather LED — compact observation-time cue, 9 November 2026

All screenshots in this folder are SIMULATED QA fixtures, not live weather
measurements or official health alerts. Real HTML/CSS/JS renderers are exercised
with synthetic inputs at 432x40 DPR3.

Read-only Production inspection confirmed HISTORICAL with observedAt
2026-11-09T02:30:00Z (09:30 Bangkok). The former large status overlay covered
the Forecast panel; the old historic-data logic hid Feels Like and guidance.
The original last daily-rain row extended to the bottom LED border.

Fix: remove overlay DOM/CSS entirely; preserve original observedAt and source
state via a small notice directly beneath the clock with full date/time in
title and ARIA. The Feels Like chip is still displayed from historical data
with amber coloring, a star and explicit historical title. The lower advice
says check latest data rather than falsely offering current heat guidance.
Fresh values retain the NWS-derived heat advice. Missing measurements remain
unavailable rather than converting to zero. Rain chance row is raised two
native pixels, without fabricating or changing rainfall percentages.

Evidence: historical/fresh/unavailable/no-forecast/four-digit screenshots,
fallback and reduced-motion screenshots, and browser-qa.json. Reproducible
with scripts/qa-weather-compact-20261109.cjs.

PM2.5, Water, Google Sheet, Apps Script, forecast API/transport, °C, clocks,
animation assets and the 22-second three-page rotation are untouched.
