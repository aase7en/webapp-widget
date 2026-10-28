---
name: a-2-5d-animation
description: "Create or review vivid luxury game-like 2.5D animated backgrounds from a locked master scene, with independent clouds, sunlight, water, flowers, foliage and crop-safe API overlays. Invoke on 'A-2.5DAnimation', layered animation, multi-frame scenic loops, or environment-status scenes; use GrillMe for unresolved artistic decisions before rendering."
---

# A-2.5DAnimation

**Purpose:** Repeatable, reproducible 2.5D motion art for digital signage, environmental widgets and scenes. Make high-quality moving landscapes without independently regenerating static buildings in every frame. Separate **illustrative scene art** from real API data.

## Entry / intent gate — coordinate with GrillMe

1. Read the user's approved scene/style and prior references first; do not re-ask known decisions. Check the relevant source files, `AGENTS.md`, ownership and work order before changing a repository. Do not treat a local `SKILL.md` as authorization to modify a repo.
2. If the *art direction or output target is unresolved*, invite or invoke the installed **@GrillMe** plugin (its `entry-grill-me` → `grill-with-docs` in a repo or `grill-me` otherwise). This is an interview/design decision workflow, **not** a renderer. If the plugin is unavailable, conduct the same bounded questions conversationally and state that the plugin itself was not run.
3. Ask only for unresolved decisions, in dependency order: (a) scene subject / faithful-real vs stylized illustration; (b) final display and visual composition / UI safe area; (c) mood/palette and intensity; (d) allowed movements vs locked objects; (e) deliverables (image, alpha layers, GIF, MP4, HTML, loop length). Present a recommended default for each round; do not ask tool-retrievable facts. Record explicit owner decisions and stop after agreement; if user already approved the style, proceed without another interview.
4. Default when not specified: **vivid, elegant, luxury Japanese-game-like illustration**, fixed camera, landscape master, static architecture, 24 FPS / 6-second loop, iPhone-compatible MP4 + GIF, full-width and target-display proofs; no production deployment.

## Scene and source contract

- Reference art must be supplied/verified; fictional scenic art is marked `ILLUSTRATIVE`. For actual landmarks, cross-check primary visual references and **do not claim a generated imitation is an exact rendering**.
- Create **one master composition** at high resolution in the *intended landscape aspect ratio*. Do not scale an arbitrary square image to an ultrawide strip. For a 432×40 LED, the full physical strip is 10.8:1; if imagery only occupies left 1/3, its physical segment is 144×40 = 3.6:1. Define a separate *source stage*, *crop rectangle*, *safe architecture region*, *UI overlay region*, *logical LED viewport*.
- Scene is background; live numeric values/status, units, timestamps and provenance remain on a distinct semantic **UI/API layer**. Never infer PM2.5 readings or real emissions from art; unknown values stay unknown; do not bake text labels or readings into generated art.

## Layer contract (depth order)

1. `sky-base`: a stable color gradient / original sky texture.
2. `clouds-far`, `clouds-near`: independently masked cloud textures at different speeds; **wrap tiles/offsets continuously** without snapping from right edge to left.
3. `sunlight`: ray/occlusion maps derived from the changing cloud gap, with subtle exposure and no flashing.
4. `midground`: locked temple, statue, pavilion, house, bridges, mountains with a protected matte. Keep every protected source pixel identical frame-to-frame before compression.
5. `water`: river/pond masks only; advect reflections with gentle periodic displacement and physically plausible highlight drift. Do **not** warp flowers, roofs, benches, trees or the whole frame as though they were water.
6. `vegetation`: separate leaf groups, stems, petals, rice stalks and grasses with low-amplitude sway around plausible pivot points; trunks remain stable. Repair any uncovered holes behind moving cutouts.
7. `foreground`: optional drifting haze/pollen when subtle and source-matched; do not add cartoon dots or unauthorized birds.
8. `readability-overlay` + `api-ui`: darkening gradient/glass/labels remain separate. Respect contrast, semantics and reduced-motion.

Store **transparent alpha layers**, alpha/structure masks and source metadata when creating a reusable/editable master. Prefer one reproducible deterministic compositor (`Pillow+NumPy`, Canvas2D, or WebGL with fallback) over asking AI to generate 12 fully independent pictures. 12 images may be reference *key moments*, not guaranteed pixel-consistent render frames.

## Motion and timing

- Keep camera scale, crop, projection and structure position constant. No skew, independent whole-image stretching, or fake parallax that moves protected architecture.
- Use normalized periodic time `theta=2*pi*frame/frame_count` and phase-consistent transforms. Seamless first/last **transition** must be tested against a typical neighboring-frame difference; exporting a duplicate final frame is acceptable as a proof but not the only seam test.
- Motion: near clouds slightly faster than far clouds; rays track cloud occlusion, water shimmer low amplitude, foliage gentle sway and slight phase offsets. Avoid abrupt phase reversal and moving a still-image's old clouds underneath new ones.
- Preserve original approved base imagery and owner art hashes; changes to a single tier must not rebuild or overwrite unrelated tiers.

## Production pipeline

`Owner brief / GrillMe if needed → visual references → one approved master → precise alpha layers/masks → locked-structure geometry → deterministic compositor → 12 key-moment proofs → smooth full-frame output → validation → owner visual signoff → optional separately authorized integration`.

Recommended output for every preview: (1) mobile-visible GIF or directly usable image, (2) H.264 Baseline/yuv420p/faststart MP4 with safe dimensions, (3) six-moment contact sheet **only for QA** with labels outside the actual animation, (4) original master/alpha PNGs, (5) technical QA manifest and reproducible source package. Show media via real verified links, not a filesystem path alone. Always verify that every linked artifact exists in the current session before sharing.

## QA / acceptance gates — never self-approve art

- **Structure lock:** exact same pre-encode pixels across all frames for the protected architecture mask; report pixel count, number changed and hash. Masks must include the complete structure and attached shadows, without hiding actual movement failures by locking giant arbitrary regions.
- **Dimensions & crop:** frame dimensions identical; target crop uses `cover` with *uniform scaling* or an explicit crop, never stretch. Verify both full 3:1 style stage and actual LED viewport, including left-zone geometry and right-side API readability.
- **Isolation:** water motion only inside water mask; plant sways do not touch water/architecture; no blended ghost structures or holes.
- **Timing:** check 12 representative stages and each adjacent frame, especially the last→first seam; no visible jumps, reverse clouds, frame numerals/borders, or black gutters.
- **Device:** decode MP4 with ffprobe/ffmpeg, browser playback/pause/speed and reduced-motion static fallback; test mobile and low-end fallback. Don't claim physical LED verified without a real display test.
- **Data truth:** art is `ILLUSTRATIVE/SIMULATED`, never a measurement. Never add invented sensor values/labels; only approved API semantics show as measured.
- **Ownership/release:** obey actual repo `AGENTS.md`, approved WOs, one-writer scope and CI/review gates. No unapproved merge, sensor data mutation, production deployment, or destructive Git operation.

If any hard QA gate fails, correct the source/layer separation and re-render; **do not solve jumpy motion by interpolating deformed architecture**. Summarize verified vs unverified evidence and obtain owner *visual approval* before integration.

## Handy user invocations

- "@A-2.5DAnimation ช่วย @GrillMe ถามโจทย์ฉาก PM2.5 สีส้ม แล้วทำ Master ให้ฉันเลือก"
- "Use A-2.5DAnimation: green rice field, locked Thai pavilion, animated clouds/sunlight/pond/rice leaves, 6s loop, safe for left third of 432×40 LED, demo only."
