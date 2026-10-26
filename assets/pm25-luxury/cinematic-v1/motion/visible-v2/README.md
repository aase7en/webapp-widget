# PM2.5 luxury visible motion — Preview v2

Status: **ART PROTOTYPE / NOT PRODUCTION / owner review required**.

## Why this was created
User opened the former `green-motion-preview.gif` at GitHub and could not perceive any movement.
The original GIF had 8 real frames but average per-channel frame difference was only approximately 1.0–1.65 / 255. Rendering a 648×112 animation down to the physical 432×40 screen made this nearly invisible; opening the GitHub blob viewer compounded the problem.

## Improvements
- Full native LED-aspect 1296×120 transparent motion (3× 432×40), **no squashing of cinematic background**.
- Five separate alpha sprite atlases, one per color tier, **8 frames each** (4×2 grid, frames 1296×120).
- More visible moving semi-transparent wind trails and drifting particles. ImageGen city background is static, motion layers are procedural; never claim the scenes actually show observed pollution.
- An actual Canvas2D demo `index.html` with five-band toggle, 1×/2× speed, pause/play and hide/show motion. Full LED view and an enlarged motion detail view let users inspect movement on mobile. The preview is NOT a classifier, does not call API or write any Sheet.
- GIFs are a convenience only: use the HTML Canvas preview for reliable interaction, especially on phones where GitHub's embedded GIF viewer may show a still.
- Supports reduced-motion preference (starts paused).
- The prior `motion/` files are untouched for deterministic comparison and KiloCode compatibility; all new assets are isolated in `motion/visible-v2/`.

## Asset contract
- `{blue,green,yellow,orange,red}-haze-visible-atlas.png` (RGBA 5184×240)
- `{blue,green,yellow,orange,red}-visible-motion.gif` (8-frame animated review, 1296×120)
- `manifest.json` with exact SHA-256 per asset, reference frame timings and dimensions
- `../build_visible_v2.py` deterministic Pillow generator
- `index.html` directly playable Canvas demo with no external libraries

## Local QA
- Pillow verified every GIF contains 8 frames with frame changes, alpha channel preserved, exact LED dimensions, and SHA-256 manifest.
- Chrome executed `index.html` from a local HTTP server: green frame counter advanced 1 → 4, Pause froze, switching to RED loaded and resumed, 2× speed worked, no JS exception.
- Visual review at 432×40 and hardware FPS remain required. This is stronger motion to approve, NOT permission to overwrite the live Water or PM slides.
