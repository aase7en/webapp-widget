# PM2.5 Luxury — new ImageGen storyboard imports (2026-10-26)

**Status:** DRAFT asset-only PR #49, not Production, not a scientifically accurate animation.

These are the **five most recent generated storyboard composites** from the user's October 26 visual work, imported byte-for-byte via connected Google Drive into this isolated Git worktree. SHA-256 hashes from the conversation's actual uploaded files were compared with all stored originals.

## Contents

- `originals/{blue,green,yellow,orange,red}.png`: FIVE untouched 2172×724 storyboard composites.
- `frames/<tier>/frame-XX.webp`: extracted individual storyboard cells. Do **not** assume each file contains 16 frames. Visual grids produce:
  - BLUE: 3 × 5 = **15**
  - GREEN: 3 × 4 = **12**
  - YELLOW: 2 × 5 = **10**
  - ORANGE: 3 × 4 = **12**
  - RED: 4 × 4 = **16**
  - Total **65** extracted source frames.
- `previews/<tier>-storyboard-animation.webp`: animated WebP playback at preserved frame aspect ratios, for image review (no forced 432×40 distortion).
- `index.html`: interactive static HTML review, five tier selectors, play/pause, 1×/2× playback, optional inter-frame crossfade.
- `manifest.json`: original, frame and preview SHA-256, dimensions, grid layout, provenance and warnings.
- `extract_storyboards.py`: deterministic extraction/preview pipeline.

## Essential limitations

The five composites are **ImageGen storyboard art**, not certified coherent optical-flow motion and not validated transparent RGBA sprite layers. Individual buildings, clouds and environmental shapes may jump between cells; crossfade masks the cut but does not magically create continuous 2.5D physical motion. The source cells also have different aspect ratios. **Do not use these directly in the 432×40 LED Production renderer** without a separately reviewed composition, 2.5D layer separation, temporal consistency review, performance benchmark, data-contract validation and owner approval.

The separate `assets/pm25-luxury/cinematic-v1/` and `motion/visible-v2/` remain intact; KiloCode's ongoing engineering work retains ownership of renderer, PM classification/health semantics, Weather and runtime. This asset branch does not change code under `v2/`, any Backend, any Sheet, or `main`.

No image implies the actual measured PM level or weather at Uthai; no values, timestamps or alerts are embedded into a real operational display.

## Safe next step

KiloCode can inspect exact PR #49 HEAD and use these storyboard cells as visual reference only. A visual owner must inspect coherence and select acceptable frames/layers. Build a geometry-locked scene with independent cloud, sunshaft, volumetric haze, dust and airflow animations before releasing to the hospital LED.
