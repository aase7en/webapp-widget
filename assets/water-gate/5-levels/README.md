# Water Gate Animated Assets — approved visual baseline (2026-10-25)

**Project:** `aase7en/webapp-widget` · **Scope:** visual assets only.

This folder preserves the **five gate-discharge animation variants approved in chat** as committed, checksum-verifiable binary resources for future use in the Uthai Hospital LED water-level widget. The public widget's live API, Apps Script, Google Sheet, displayed numeric readings, and current UI remain unchanged by this asset-archive commit.

| Visual scenario | Animated WebP (preferred) | Animated GIF (fallback) | Editable frame strip (PNG) |
| --- | --- | --- | --- |
| Gate closed 0% | [0% WebP](uth_led_water_0_0pct_animated.webp) | [0% GIF](uth_led_water_0_0pct_animated.gif) | [source frames](uth_led_water_0_0pct_spritestrip.png) |
| 1–25% | [1–25% WebP](uth_led_water_1_1_25pct_animated.webp) | [1–25% GIF](uth_led_water_1_1_25pct_animated.gif) | [source frames](uth_led_water_1_1_25pct_spritestrip.png) |
| 26–50% | [26–50% WebP](uth_led_water_2_26_50pct_animated.webp) | [26–50% GIF](uth_led_water_2_26_50pct_animated.gif) | [source frames](uth_led_water_2_26_50pct_spritestrip.png) |
| 51–75% | [51–75% WebP](uth_led_water_3_51_75pct_animated.webp) | [51–75% GIF](uth_led_water_3_51_75pct_animated.gif) | [source frames](uth_led_water_3_51_75pct_spritestrip.png) |
| 76–100% | [76–100% WebP](uth_led_water_4_76_100pct_animated.webp) | [76–100% GIF](uth_led_water_4_76_100pct_animated.gif) | [source frames](uth_led_water_4_76_100pct_spritestrip.png) |

**Technical:** Animated WebP 640×320, 6 looped frames per level; GIF 480×240, 6 frames; source strips 2560×320, 4 frames. Preview at [`/demo/water-gate-assets.html`](../../../demo/water-gate-assets.html).

**Operational honesty:** Percentages above are **SIMULATED visual presets only**, not measured gate aperture or flow rate. Never derive them from water gauge height, stream velocity, water API values, or Sheet history without a separately validated gate-opening sensor/contract.

**Current limitation:** These are 4 generated keyframes with looping 6-frame sequences, not simulated fluid dynamics. Some minor image registration/architectural jitter may be visible between frames. The desired future improvement is to lock the dam architecture to a common plate and animate only water, foam, spray, and ripples. Do not claim cinematic FLIP simulation fidelity.

**Integration:** For browsers prefer WebP with GIF fallback; use `prefers-reduced-motion` to offer a still first frame from the PNG strip or a play/pause control. Keep all numeric readouts and alerts in real semantic HTML outside the animation. Do not load all five assets into the 432×40 production LED at once; select one by an explicit approved visual state.

**Source provenance:** Original 5-level Animated Assets ZIP provided/approved in the same ChatGPT project, with frame strips generated in that project; binary file identities are preserved in the Git blobs rather than rebuilt on the developer machine.
