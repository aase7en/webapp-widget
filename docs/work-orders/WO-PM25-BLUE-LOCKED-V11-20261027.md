# WO-PM25-BLUE-LOCKED-V11-20261027

**Status:** BLUE DEMO V1.1 complete for human visual assessment. Not production approved.

## Authority and ownership
- Owner directly instructed this assistant to modify BLUE Locked Scene via SundayMCP Mac (not delegate to Kilo) after reviewing V1: clouds and river need more visible motion, particularly subtle wind ripples.
- Repo: aase7en/webapp-widget, NOT ENV webapp.
- Worktree: /Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-pm25-blue-v11-20261027
- Branch: sol/pm25-blue-locked-motion-v11-20261027
- Base V1 SHA: 0fd4c3eb0a7911653967e010b9d2e2975d447439.
- Allowed mutation: assets/pm25-luxury/blue-locked-visual-v11/**, this Work Order, append-only SESSION-HANDOFF.md.
- Forbidden: main, PM live classification, other tiers, Water/Weather, Google Sheet, Apps Script, backend, source collages, original V1, dirty original root and Kilo/GLM lanes.
- SAFE_TO_MUTATE_DEMO_V11=YES under latest explicit owner request; SAFE_TO_MUTATE_PRODUCTION=NO.

## Changes made and visual QA
- Preserved original BLUE master source frame 04 without whole-scene translation. Pixel-locked hospital, bridge, skyline and temple; unchanged pixels outside selected masks.
- Cloud parallax up to ~31 source px horizontal, limited to protected upper-sky mask with 78% master / 22% derived scene.
- Wind-driven river ripple uses a broad, shallow refraction of original water pixels (2.25+0.9 horizontal, .65 vertical source px), with changing source reflection. No new leaf/bird/wave sprites.
- Initial short-wavelength water distortion rendered zig-zag artifacts and was rejected by visual owner immediately. Replaced by longer-wave low-amplitude motion before test/release.
- Closing loop blends the final half second back to initial frame to avoid flash. 12 original source tiles -> 66 DERIVED frames, about 6s.
- New side-by-side V1 vs V1.1 browser review page, original contact, masks and Chrome screenshot.
- Generated standalone pipeline build.py, export_mp4.py and verify_v11.py.

## Verification and thresholds
- Compositor checks ALL 66 lossless frames: four protected landmark boxes and all pixels outside masks are identical. Original 12 SHA-256 source hashes validated.
- Animated WebP 66 frames at 1296x120; H.264 MP4 decoded 66 frames, 11fps. Actual LED viewport 432x40.
- Sky and river temporal differences non-zero and >7 RGB in active sample. Last-to-first seam below 2× average interframe difference, no big flash.
- Chrome (local): movie moves, Pause freezes, reduced motion switches to still, zero JS exceptions. Only lossless source retains strict pixel-identity; H.264 exhibits minor codec artifact variation with no camera movement.
- Repo-wide Node tests 313/313 pass in verified baseline; rerun against exact finalized candidate.
- Keep Draft PR and do NOT merge. Owner physical and aesthetic acceptance pending.
