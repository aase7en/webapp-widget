# WO — Weather compact freshness and stale safe badges — 2026-11-09

Repo aase7en/webapp-widget ONLY (NOT env-wastewater-webapp).
Base GitHub origin/main: d223f8263a4ecd02b727cb43604bf885f7863faa.
Isolated writer: fix/weather-compact-freshness-feels-20261109.
Owner-reported live screenshots: gigantic historical observation banner covers 4+3 forecast and chance-of-rain near bottom; Feels Like and practical guidance missing.

Read-only production Chrome 432x40 observed:
- `#board.dataset.freshness=HISTORICAL`, observedAt 2026-11-09T02:30:00Z, while browser local clock 12:50 Bangkok; must retain provenance and not call this live.
- `.hybrid-status` x289..432 y2..12 native LED covers forecast header. Its CSS forces display under historical/unavailable; original data cards have rain x~296 y34..40, partly masked by 1px frame.
- `.feel-value[hidden]` true because `feeling.hidden=old` in paint(); lower `#temp-guidance` hidden by `weatherGuidance(...,old)`. Both appear with fresh test fixtures but disappear on real historical fallback.
- Clock time ends y33.07 with ~5px native space underneath for small source-time label.

Authorized scope: Weather-only HTML/CSS/JS, focused tests/QA and scoped cache bust. No PM/Water/backend/Google Sheet/Apps Script/transport/provenance mutation.

Design:
- Remove large in-forecast status DOM/CSS; preserve precise source label and historical/unavailable/forecast status via tiny clock-line beneath time. Full observedAt still in title/aria and panel aria.
- Restore historical Feels reading only if finite and mark it visibly historical, with timestamp via clock. NEVER describe stale data as live.
- Keep bottom advice visible in historical mode as 'เช็กข้อมูลล่าสุด' (check latest), NOT heat-index recommendation from stale values; fresh cases retain owner-approved NWS Heat Index mapping, missing data fails closed or displays only unavailable note.
- Lift rain chance 2 native pixels above bottom frame, without changing the 4+3 forecast, rain probability values, metric sizes, or source.
- Evidence: local 529+ Node tests, real Chrome 432x40 fresh/historical/unavailable/hybrid+legacy/reduced motion, independently challenge final SHA, 2 hosted CI, exact-SHA merge and Pages Deploy verification before any production claim.

## Candidate verification / release gates
- Real frontend Chrome 432×40 DPR3 simulated QA: six scenarios
  (historical/fresh hot/fresh mild/unavailable/forecast missing/1000),
  historical hybrid fallback, reduced motion PASS. Exact browser evidence:
  docs/weather-compact-review-20261109/browser-qa.json and screenshots.
- Historical truth: preserved OBS source timestamp, clock source label
  underneath time with complete ARIA/title; stale Feels Like marked amber/star;
  bottom advice instructs check latest data (no stale heat risk inference).
- Forecast header overlay DOM/CSS removed, chance of rain row y32..38 native
  entirely inside bottom border; 4+3 cards, probabilities unchanged.
- Full Node tests 534/534 PASS, changed source and cache tags Weather only.
- Next: independent exact-SHA read-only review, GitHub CI 2/2, merge to main
  with expected head SHA only after release gates, Pages build+Chrome smoke.
- Physical LED and mobile Safari not verified.
