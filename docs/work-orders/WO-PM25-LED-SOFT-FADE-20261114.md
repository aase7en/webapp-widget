# WO — PM2.5 LED gradual vertical transparency refinement (2026-11-14)

## Owner / scope / authority
- Latest owner instruction: keep accepted flat-bottom area and PCHIP curve; make PM2.5 area colors stronger at top and increasingly translucent towards bottom.
- Repo: aase7en/webapp-widget (NOT env-wastewater-webapp); Mac SundayMCP isolated worktree /Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-pm-soft-fade-20261114, branch fix/pm25-led-soft-fade-20261114, base main a4c7aae937027baee2254458e24b1239c40c3345.
- One mutable owner on macOS; Windows SundayMCP Windows is read-only audit because its checkout is a dirty old preview branch.
- Allowed: SVG mask stops in v2/pm25-live.html, scoped cache pins root -> v2 index -> PM HTML JS pin, relevant tests/Chrome QA and this document. Forbidden: PM JS geometry/source/observations, data sheets, backend/API, Weather/Water, secrets/raw files.

## Visual contract
- Preserve closed filled PCHIP area with shared y=40 flat baseline and the same one viewport-fixed mask, no new gap symbols, no synthetic data points, same risk colors and lines.
- Vertical mask opacity stops at 0%=0.96, 22%=0.84, 48%=0.62, 74%=0.38, 100%=0.18. More saturated near top, progressive fading down to a still-visible constant horizontal baseline.
- Only update render cache string to 20261114-pm-softfade-1; do not change data/real measurement timestamps/health classifications.

## Acceptance
- Focused and full Node tests, diff/check, Chrome 432x40 DPR3 with SIMULATED continuous/missing/outlier, gradient-stop structural assertion and visually inspect screenshot.
- Freeze exact SHA -> independent review and hosted CI -> exact-head PR merge if policy permits -> Pages build SHA and production HTTP byte comparison.
- Physical LED and Safari post-deployment observations require separate verification.
