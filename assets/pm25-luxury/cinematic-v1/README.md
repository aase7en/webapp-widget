# Cinematic Luxury PM2.5 Scenic Master Assets — v1 (design review)

**Status: DRAFT ASSETS / NOT LIVE / NOT APPROVED AS A HEALTH CLASSIFICATION.**

This directory contains the **five exact ChatGPT Image Generation images** from the owner-requested panoramic artistic direction. Their original PNG SHA-256 values have been independently compared with the originals mounted in ChatGPT and transferred via the owner's connected Drive without resynthesis.

## Files
- `originals/{blue,green,yellow,orange,red}.png`: full-res generated source (2172×724), including white presentation margins, original neon frame.
- `scenes/{tier}.webp`: cleaned panoramic art cropped *inside* the existing neon border, 1296×221. **Preferred for prototype Canvas/CSS backdrop** to avoid double borders.
- `scenes/{tier}-led-crop.webp`: sample 1296×120 physical-LED-aspect (3×432×40), not guaranteed the final crop; adjust per UI safe zones.
- `review-five-tier.webp`: combined five-band review panel. English labels appear only on the contact sheet, not on master art.
- `manifest.json`: exact SHA-256 hashes, crop details, dimensions, provenance and cautions.
- `build_assets.py` / `verify_assets.py`: deterministic optimizer and local verification.

## Source mapping
BLUE: clear bright blue sky (third ImageGen landscape).
GREEN: clear lush trees and blue-night atmospheric scene (first).
YELLOW: gold moderate haze (fourth).
ORANGE: orange dense haze (second).
RED: red smog (fifth).

The five ImageGen variations have a coherent **design language** but **not pixel-identical building geometry**. Do not claim they have a perfectly locked camera. Avoid hard cuts between PM severity states, use crossfades, or perform a separate geometry-alignment step after visual review.

## KiloCode handoff / ownership
This is an **asset-only addition** in PR #49. KiloCode may inspect the manifest and this directory without touching its implementation hotspots. Use the accepted scene images for a DEMO only after visual approval; do not merge PR #49 into production without a verified test/review and owner release decision. PM2.5 Health tiers and values must be calculated independently from verified source data and observation averaging period. Static backgrounds are illustrations, not live optical air quality data.

**All dynamic date/time, health status labels, unit, source/freshness and numerical PM readings stay in DOM.** Do not bake sample numbers or labels into the art. Do not use the artwork's neon frame and a second CSS frame simultaneously.

## Outstanding visual deliverables
1. Image-based review at real 432×40 crop next to the live Water Luxury.
2. Harmonize skyline geometry/lighting if the five-tier transitions are visibly discontinuous.
3. Make independent transparent dust/haze and airflow sprite layers for each tier (the earlier procedural v0 has only a GREEN 8-frame motion proof).
4. Ensure 22-second slideshow/clock anchor stays stable, reduced motion works, historical/unknown PM readings are not misclassified, and no expensive atlas is loaded unnecessarily.

This package does **not** change `v2/`, Apps Script, Water Luxury, Weather, Sheet or main.
