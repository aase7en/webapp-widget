# WO — Remove PM chart break marks and curve the historical trend (2026-11-14)

## Authority, verified scope and ownership
- Repository: aase7en/webapp-widget, **not** env-wastewater-webapp.
- User's latest explicit instruction after physical LED feedback: remove all white break/double-slash marks; do not emphasize missing hours visually; draw a continuous smoothed trend between known values using softer curves rather than angular zigzags; keep gradient/fill color visually continuous.
- This supersedes the prior WO-PM25-LED-GRADIENT-SMOOTH-20261113 visual requirement to display a white gap cue. The user owns that visual trade-off; the **data integrity** rule remains absolute.
- Base main: 96f463cb359e06115d36a695ff0e11598ffcdcb4.
- Branch: fix/pm25-natural-curve-no-gap-markers-20261114.
- Worktree: /Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-pm-natural-curve-20261114.
- One writer: integrator. Other dirty worktrees, Weather PR #99, shared Sheet, Apps Script, Water, sensors and real data are forbidden scope and untouched.

## Implementation contract and data honesty
- Keep valid historical PM samples and source timestamps unmodified; preserve the original hour-to-X coordinate and nonlinear asinh Y height (15–35 emphasis). Reject invalid, null, negative, non-finite and out-of-window observations as before.
- Use shape-preserving monotone cubic Hermite (PCHIP) through *only actually observed endpoints*. Adjacent cubic segments share derivatives and never overshoot measured extrema. Sparse/missing hours are covered by a smooth **visual estimate** between known endpoints, not by creating or persisting artificial PM values.
- Remove ALL `trend-gap-cue` DOM elements, white double slashes and stroke dashes. Maintain `data-gap=true` on derived bridge segments internally and explain approximation in the SVG accessibility label; no extrapolation past the last observed sample.
- Use the identical cubic shape for the neon stroke and alpha-decaying SVG ribbon fill. Retain actual PM tier endpoint colors, glow and real measurement circles. Reduced DOM ribbon count is desirable for low-end kiosk.
- Scoped page/script cache pins refresh root iframe -> PM iframe -> PM script. Weather/Water pins and data sources remain identical.

## Verification / risk / release
- Tests: focused PM/Weather, full Node suite, Chrome 432x40 DPR3 with SIMULATED continuous/missing/outlier historical payload, SVG path geometry checks (monotone/no-overshoot/shared tangents), missing semantics/no artificial observation, no white marks/dashes, no JS errors, diff check.
- Since a visually connected trend conceals missing-hour gaps by user decision, visual graph must **not be read as an hourly measurement for every position**. This limitation is disclosed here and in accessible SVG metadata. Source observations, provenance and timestamps are preserved.
- Exact-SHA read-only independent review and applicable hosted CI are required before expected-SHA merge. After merge, verify Pages deployed build SHA and production HTML/JS byte-for-byte.
- Physical LED and Safari visual acceptance remain unverified until a new on-device check. Chrome fixture data must always be labelled SIMULATED QA.
