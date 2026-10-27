# UTH PM2.5 Luxury 2.5D Animation Asset Package v3

**Status:** Visual prototype / not Production. True logical LED canvas: **432×40**; source and render: **1296×120** (3× supersampling). Images are artistic AI-generated Ayutthaya/Uthai-inspired illustrations, not measured geography or air quality.

## Exact user-provided sources and geometry

Five user-supplied JPEG collages are preserved unmodified in `originals/` with SHA-256 in `manifest.json`. Original two-column source grid counts are **BLUE=12; GREEN=YELLOW=ORANGE=RED=10 each**. They are cropped along individually verified dark separator bands (rather than naïve equal grids) into `source_frames/<tier>/original-cell-NN.webp`. **There are NOT 16 original image cells per source.** No invented claim of sixteen original photographs.

The 16-frame animated output for each tier uses a **fixed master** cropped from the first tile. Buildings, temple, horizon, water and camera **do not shift across frames**. Nine independent transparent effect atlases (each with 16 frames in a 4×4 grid) generate moving sunlight, clouds, haze, industrial-like diffuse smoke, airborne particulates, wind, leaves, birds and reflected light. A **tenth rain atlas** is reserved for Weather. These effects are **procedural illustrated graphics**, not ImageGen native output or inferred sensor observations.

## Files

- `originals/*.jpeg` — exact input collages.
- `source_frames/<tier>/original-cell-NN.webp` — correctly cropped genuine cells.
- `master/<tier>.webp` — one geometrically stable 1296×120 frame per tier.
- `effects/<kind>/<tier>-16f.webp` — nine transparent 16-frame atmospheric effects per tier.
- `effects/light_rain/<tier>-weather-16f.webp` — **weather-only** 16-frame rain layer, default disabled.
- `loops/<tier>-16f.webp` — five animated WebP previews, authored from a fixed master with effects (no rain).
- `index.html` — Canvas2D preview; five tiers, on/off per effect, play/pause, speed and **explicit rain simulation toggle**. 60Hz RAF blending between 16 sprite keys for visual smoothness.
- `build_pack.py` — repeatable deterministic cropping, effect generation and manifest pipeline.
- `manifest.json` — hashes, dimensions, original frame counts, all layers and provenance.
- `qa/` and `review-contact.webp` — visual review crops/contact sheet.

## Integration notes

1. PM tier must use verified official 24-hour-mean data where specified; NEVER infer the reading from illustration color or fake sample values.
2. Rain atlas must be toggled **only from verified Weather precipitation**, never from high PM tiers; fall back to static imagery on failure/reduced motion.
3. Do not render all five tier atlases simultaneously; load only the current tier and dispose other images when switching.
4. No AI-generated effects should cover essential date/time, PM reading, health status or source timestamp. Overlay DOM legibility masks and accessible text above the image.
5. The first tile is locked within each tier. **Across tiers**, underlying AI-generated city geometry may still differ; prefer crossfade/geometry normalization when switching tier, not an instantaneous hard cut.
6. The user described Uthai Hospital, Rojana Industrial Park and Wat Sakae as *artistic cues*; no claim of photoreal architectural accuracy or real river geography.

## Limitations / next QA

Technical frame-count and hash tests must pass; owner visual approval and hardware LED 432×40 contrast/animation performance testing are still required. Prototype transparency may require polish before production; do not merge this branch into `main` without explicit owner release decision and independent review.
