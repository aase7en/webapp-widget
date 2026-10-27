# PM2.5 BLUE — Locked-Master Luxury Motion V1.1

Status: DEMO ONLY / owner visual gate pending. No backend, PM live data, or production modifications.

## Visual intent and factual source
- 12 BLUE frame images already verified from owner collages in ../frame-first-v1/blue/frames/, with hashes saved to manifest.json.
- One original frame 04 is the geometry-locked master. Hospital, bridge, skyline and temple remain unchanged, as do all pixels outside feathered atmosphere and water masks.
- Cloud details are shifted by a periodic slow wind field sourced from the image itself (27px primary plus 4.5px secondary horizontal travel at 1296 source width, ~9–10 LED pixels). Master sky is 78%; changing owner-sourced frames are 22%.
- Surface ripple: shallow, broad refraction of original water highlights, 2.25px primary and 0.9px secondary x offsets, 0.65px y. Reflection changes also come from original frames. No hand-painted water stripes.
- One early stronger water warp was rejected by the visual reviewer: it looked like digital chevrons. The gentler broad-wave version is the approved candidate for owner review.
- No additional birds, leaf sprites, floating particles, imported scene objects, or camera zoom.
- 66 DERIVED output frames at 11 FPS (~6 sec), with smoothed wrap. Do not call them 66 original photos; 12 are original BLUE storyboard cells.

## Regenerate and verify
From repo root, execute:
1. python3 assets/pm25-luxury/blue-locked-visual-v11/scripts/build.py
2. python3 assets/pm25-luxury/blue-locked-visual-v11/scripts/export_mp4.py
3. python3 assets/pm25-luxury/blue-locked-visual-v11/scripts/verify_v11.py
4. node --test tests/*.test.cjs

The first command uses Pillow, NumPy, SciPy; second uses installed ffmpeg; third verifies 12 SHA-256 source hashes, 66 frames, static landmark boxes, living sky/river regions and loop seam.

## Review files
- index.html: interactive V1.1 vs V1 animation comparison, 432x40 true LED simulation, play/pause, speed, reduced motion
- blue-locked-66f.mp4 / blue-locked-66f.webp: motion assets
- blue-still.webp: fallback
- qa/blue-locked-mask-proof.webp: green water + cyan sky allowed zones and pink protected architecture boxes
- qa/blue-locked-contact-6views.webp: six stages of derived animation
- qa/chrome-visual-proof.png: Chrome screenshot

The imagery is illustrative, not a measurement of actual PM2.5 or weather. Owner visual and real hardware validation remain outstanding.
