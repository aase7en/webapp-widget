# WO-PM25-BLUE-LOCKED-VISUAL-20261027

Status: DEMO BLUE VISUAL PROOF PREPARED. Owner visual review required before any wider tier expansion or production integration.
Owner's explicit complaint: all BLUE full-frame animations look like an earthquake; buildings, temples, trees and bridges shift and cause dizziness. Owner asked the image-capable assistant to take ownership rather than telling Kilo to judge visual assets.
Scope: isolated new proof assets under assets/pm25-luxury/blue-locked-visual-v1/**; this work order; append-only existing SESSION-HANDOFF.md. No modifications to PM code, Water, Weather, live LED, data, Sheets, Apps Script, locked-scene originals or the other agent's worktrees.
Repo: aase7en/webapp-widget, task worktree /Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-pm25-blue-locked-visual-20261027, branch sol/pm25-blue-locked-master-proof-20261027, base exact b07680dc8797af3ad96f7b649158751eb2e357b2.
Ownership: single visual owner in a clean isolated worktree; existing Kilo frame-first worktree remains untouched except existing untracked .tmp.
SAFE_TO_MUTATE_DEMO_ONLY=YES. SAFE_TO_MUTATE_MAIN/PRODUCTION=NO.

## Diagnosis
Crops and translation can line up a horizon, but the independently AI-generated source cells change architectural structure. Transitioning their entire RGB planes inherently shifts temples, hospital, bridge and trees even with perfect framing. Crossfade does not solve double edges; pingpong only solves the wrap direction.

## Creative implementation
- Select one genuine source BLUE frame 04 as the locked master for the entire scene.
- Reuse the 12 genuine native BLUE frames as source data only for sky/cloud, water reflection, and gentle sun/haze changes. No generated decorative objects. Conservative masks based on visual inspection.
- Mask rectangles protect 4 structural landmarks. All pixels outside source-change masks and sun-only illumination masks remain exactly identical before encoding.
- 66 derived frames at 11 FPS, output WebP and MP4 with screenshot/contact/mask evidence.
- Owner can compare the new stable proof against the rejected old full-frame STEP animation at the same 10.8:1 aspect.

## Acceptance and verification
- Re-run the generation deterministically; assert all 4 landmark ROI pixel arrays identical for all 66 source-composite frames and all unmasked pixels unchanged. Compare source frame hashes.
- Require visible nonzero sky/water source-derived motion and a bounded end-loop seam, actual browser video play/pause/reduced-motion and 432x40 display.
- Check zero browser uncaught JS errors and unchanged full regression tests, no production changes.
- Human visual review still required; do not claim physically perceived smoothness from numerical motion scores alone.

## Next gate
Send user demo preview + six selected frames + mask proof; if accepted, use same method for GREEN then other colors after scoped asset ownership check. No main merge authorized.
