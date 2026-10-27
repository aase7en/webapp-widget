# WO-PM25-GREEN-RED-LOCKED-20261027

Status: IN_PROGRESS / demo assets only / owner artistic acceptance pending.
Authority: owner explicitly assigned this assistant (SundayMCP Mac) to produce the remaining PM2.5 tier animations, starting GREEN then YELLOW, ORANGE and RED, each grounded in existing owner storyboard source cells; no Kilo visual delegation.
Repository: aase7en/webapp-widget, not ENV app.
Base exact SHA: 0e6c24ec6cf82a8d51ab715b157bfaf08c53e88b (accepted BLUE Locked V1.1 demo).
Isolated worktree: /Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-pm25-tiers-locked-20261027
Branch: sol/pm25-green-red-locked-visual-20261027
One writer: visual integrator. Existing Kilo/GLM, V1 and BLUE V1.1 worktrees, their .tmp evidence, production root and remote main protected.
Allowed paths only: assets/pm25-luxury/locked-tiers-v1/**, this Work Order, append-only SESSION-HANDOFF.md.
No touch: main, frontend v2, PM/Water/Weather live, Google Sheet/Apps Script, original collages, original 10 frame cells, PM tier classification, backend, source/manifest of BLUE, other lanes.
SAFE_TO_MUTATE_ISOLATED_DEMO=YES after verified repo HEAD, clean worktree, AGENTS.md and visual assets.
SAFE_TO_MUTATE_MAIN_PRODUCTION=NO. Merging/release requires explicit separate owner acceptance.

Actual original green/yellow/orange/red frame count=10 each; each native normalized cell is already 1296x120. Never claim native 12 or fabricate missing cells. Existing BLUE=12.
Work DAG:
G0 reverify exact frame SHA and 10 cell geometry (complete).
G1 choose GREEN locked master by image-based review, conservative safe masks, deliver native contact + masked GREEN motion, pixel lock test and preview.
G2 reuse tested compositor with reviewed severity-specific configs for YELLOW then ORANGE then RED. Each must keep same building/temple/bridge/shore stability.
G3 test true WebP frame count, MP4 decode, source hashes, loop seam, non-static cloud/water, optional atmospheric plume ONLY above chimney stacks, LED preview and reduced-motion.
G4 isolated commit/push and Draft PR to previous BLUE visual branch; no live integration.
Owner decides final style and production integration after preview.

Art direction: premium calm original-sourced sky/water/sun/haze motion, no unrelated floating bird/leaf/dust overlays. Trees may have extremely small canopy light modulation; industrial plume only if seen in original and static chimney stack remains pixel-locked. Preserve distinct original palette for each severity level. No data or medical claims inferred from illustrative imagery.

## Actual generated results (2026-10-27)
- GREEN: 10 native → 54 derived, 87,335 locked pixels, sky half-loop difference 8.945 RGB, water difference 10.195, wrap 2.183.
- YELLOW: 10 → 54, 91,909 locked pixels, sky 3.986, water 6.169, wrap 1.640.
- ORANGE: 10 → 54, 93,354 locked pixels, sky 3.226, water 5.327, wrap 1.292.
- RED: 10 → 54, 95,587 locked pixels, sky 3.668, water 4.121, wrap 1.574.
- Four videos decoded 54 frames each, 9fps, 1296x120. Sizes GREEN 347KB, YELLOW 284KB, ORANGE 250KB, RED 186KB.
- Deterministic verify_all.py checks exactly 10 source frames, SHA-256, 54 animated WebP keys per tier, first/mid lossless locked geometry, RGB sky/water motion, seam bounds, manifests and QA assets.
- Chrome CDP-driven QA: all four tiers load correct MP4s and show changing displayed screenshots; Pause freezes and reveals original still; reduced-motion invokes static fallback; JavaScript exceptions 0. Browser screenshot evidence in each qa/browser-color.png.
- An early relative-only seam criterion failed ORANGE/RED because these hazy scenes have almost no average motion; fixed loop closing to be exactly first frame in the uncompressed source, and changed verification to impose an absolute <3 RGB seam bound instead of trusting a tiny denominator.
- Visual reviewer compared the original 10-cell contacts, six-stage composites, masks and browser screenshots for each color. Original imagery/palette preserved; no added birds/leaves/particles.

Pending: final source-branch Git verification, exact commit, CI, hosted Chrome check, owner acceptance on real LED. Production and PM2.5 backend remain untouched.
