# WO — PM2.5 historical chart area-fill bottom must stay flat

## Owner correction and exact task
- User screenshot/review follow-up (2026-11-14 local): the lower edge of colored graph fill rises and falls irregularly. Keep the existing smooth PM2.5 top curve, but make ALL shaded segments extend to one perfectly flat, full-height bottom baseline. Do not change source data, real readings, chart time domain, risk colors or gap handling.
- Authoritative repository: aase7en/webapp-widget, not ENV wastewater repo.
- Base main 1aa40f06a9cfabfd62a1cf811560762140caa060 / PR #104 merged.
- One-writer isolated worktree: /Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-pm-flat-baseline-20261114; branch fix/pm25-flat-area-baseline-20261114.
- Allowed: PM SVG area renderer, its static SVG shared mask, scoped cache version chain, relevant test and QA expectations, this Work Order. Forbidden: Sheet, Apps Script, backend/API, Water/Weather implementation, source observations/aggregation, thresholds, historical interpolation to stored records, secrets.

## Root cause and repair
- Previous implementation paints per-segment translucent ribbon strips at fixed distances beneath each PCHIP curve; the ribbons become too faint or terminate at differing heights. The visible colored mass has a visibly wavy, uneven lower boundary.
- Replace ribbons with one closed SVG area path per observed interval: PCHIP top curve → right (x,40) → left (x,40) → Z. Shared, fixed y=40 is the true bottom of the 0 0 300 40 viewBox; no per-point bottom geometry.
- Apply one shared viewport-anchored vertical alpha mask to all area paths (same 0..40 fade, nonzero 34% at bottom), preserve per-interval horizontal measured-tier colors. Same PCHIP neon line, true observation circles, gap metadata and accessible label remain unchanged.
- Keep no white gap slashes or dots; don't draw beyond latest actual observation. True source gaps remain internal data-gap markers; the line in a gap is a visual connection, not measured data.

## Verification acceptance
- Focused Node PM/Weather 81/81 PASS; full Node 550/550 PASS; git diff --check PASS (2026-11-14).
- Chrome headless 432×40 DPR3 SIMULATED QA: continuous 24 real-fixture points / 23 closed fills, missing fixture 18 / 17, outlier fixture 23 / 22; every fill path shares y=40 baseline and one static mask, zero visual gap cues/dashes, all curves cubic, no JS errors, pixel screenshots visually inspected.
- No physical LED/Safari post-change verification yet.
- Release gates: review frozen SHA, GitHub hosted CI, exact-HEAD merge; Pages deployed main SHA and HTTP exact-file check. No CI-green-alone or merged-alone production claim.
