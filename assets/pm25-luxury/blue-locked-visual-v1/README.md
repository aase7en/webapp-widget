# BLUE luxury — pixel-locked source-derived environmental motion

Status: ISOLATED DEMO FOR OWNER VISUAL ASSESSMENT. No changes to main, production or backend.

This is a correction of rejected BLUE frame-first full-frame playback, whose AI-authored building/temple/bridge geometry differs from frame to frame and caused dizziness.

## Visual production by the integrating visual reviewer

- Master is the ORIGINAL registered BLUE frame 04 in assets/pm25-luxury/frame-first-v1/blue/frames/frame-04.webp, derived from owner collage. It never shifts during playback.
- Allowed scene variation is captured from the already verified original source frames: upper-sky/cloud illumination, sun brightness, and lower water surface/reflection through feathered region masks.
- Hospital, bridge, skyline and temple rectangles remain RGB pixel-exact in all uncompressed generated frames. Outside the sky/water/sun/haze masks is pixel-exact throughout.
- NO independent birds, foliage/leaf sprites, dust, new scene architecture, camera zoom or camera shake.
- 66 source-derived composited frames (ping-pong 12 forward/10 reverse with three blends per transition), 11fps, ~6s loop.
- MP4 is an 11fps compressed derivative of those 66 frames; compact animated WebP is also provided for browser review.
- At actual physical LED scale 432x40, inspect clouds, water and sunlight in browser; pixel-lock is necessary but not by itself proof of luxury aesthetics.

## Regenerate

Run script:
  python3 assets/pm25-luxury/blue-locked-visual-v1/scripts/build.py

For an MP4 re-encode:
  python3 -m http.server 8798

The encode uses ffmpeg from a temporary PNG sequence in .tmp, not committed to Git. All primary derived assets including a ready MP4 are checked into this demo branch. The script itself uses Pillow and NumPy already present in the authorized Mac environment.

The generated manifest.json records source frame hashes, the exact master, locked regions, motion masks and measured sky/water differences. The mask contact is a diagnostic file, NOT a public air-quality claim.

This demo does not integrate with live PM2.5, weather, Water Luxury or real environmental data.
