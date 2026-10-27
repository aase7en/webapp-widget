# PM2.5 Luxury — GREEN, YELLOW, ORANGE and RED locked-master scenes

Status: DEMO ONLY. Production Water Level/Weather/PM frontend, PM real data, Google Sheet, Apps Script and thresholds were NOT edited.

## Source provenance

10 owner-original normalized frames each for GREEN/YELLOW/ORANGE/RED, size 1296x120 pixels. Originals remain at assets/pm25-luxury/frame-first-v1/{tier}/frames/frame-01.webp through frame-10.webp. Native SHA-256 hashes are recorded per tier in manifest.json. BLUE has 12 originals, not 10.

GREEN master frame 05, YELLOW 04, ORANGE 03, RED 04, all chosen by image inspection. The master image never pans, scales or shifts. Source cloud, sky, haze and river pixel textures move only inside hand-protected feathered masks, with 4 distinct landmark rectangles (hospital/buildings, bridge, skyline, temple) unchanged in all 54 lossless pre-encode frames. Pixels outside all masks are also strictly unchanged.

River: shallow long-wave refraction and moving highlights from original source imagery; no fake ripple stripes. Sky: gentle cloud parallax. Trees: very subtle luminance shimmer without individual fake leaf sprites. ORANGE/RED: source smoke-looking cloud variation only within safe skyline-sky mask, no fabricated stack/plumes. Source building geometry is always fixed.

Each tier: 10 original cells → 18 ping-pong source keys → 54 DERIVED frames (3 substeps) → MP4 9fps ~6 seconds, plus 54f Animated WebP. Do NOT mislabel derived keys as native owner frames.

## Build and QA

From repository root run:
- python3 assets/pm25-luxury/locked-tiers-v1/scripts/build.py --tier all
- python3 assets/pm25-luxury/locked-tiers-v1/scripts/export_mp4.py --tier all
- python3 assets/pm25-luxury/locked-tiers-v1/scripts/verify_all.py
- node --test tests/*.test.cjs

Tools: existing Pillow, NumPy, SciPy and ffmpeg; no new external dependencies. Source images never rewritten.

Interactive proof: assets/pm25-luxury/locked-tiers-v1/index.html
- Select 4 colors; Play/Pause, speed, prefers-reduced-motion and static fallback
- Actual logical LED 432x40 simulated crop
- Contact sheet of the 10 original frames for each color and 6 stages of the derived animation
- qa/browser-green.png etc are real Chrome screenshots
- Tier manifest verifies source frame counts/hashes, motion zone metrics and export metadata.

Scene is ILLUSTRATIVE and is not a sensor map, PM2.5 measurement or live emissions visualization. Final physical LED review and owner artistic acceptance required before integration/merge/release.

## ORANGE/RED forward-only smokestack revision — 27 Oct 2026

Owner requested chimney smoke to rise and drift downwind without playing in reverse, and RED atmospheric dust visible through the sky. This demo-only revision affects only these two tiers.

- Four physical stack mouths per tier emit smoke packets at staggered six-frame intervals. Packet age always increases, X drifts left downwind, Y rises, packets fade before respawn. Chimneys and source architecture stay fixed.
- Inside the plume, fine texture also travels in one direction with seamless periodic phase. The 54-key encoded video loops, but individual smoke ages do NOT run backward.
- RED has fine floating aerosols and volumetric reddish haze; motes are small, feathered, and palette-matched rather than cartoon dots. No new birds or leaves.
- These are ILLUSTRATIVE effects, not observed pollutant distribution or measured industrial emissions, and not evidence of real regional polluters.
- Source owner images, GREEN and YELLOW tier outputs are byte-unchanged. Renderer builds 54 derived frames from ten original sources per tier, 1296×120 internal resolution with 432×40 LED preview.
- Test: python3 scripts/verify_emissions.py and python3 scripts/verify_all.py from this folder, or run from the repo root with exact paths.

Review: qa/stack-motion-six-zoom.webp for ORANGE/RED shows chimney sky at six spaced points of the *actual* 54-frame animation. The full original scene remains viewable at locked-tiers-v1/index.html. Reproduce zoom contact: python3 scripts/create_smoke_proof.py from locked-tiers-v1.
