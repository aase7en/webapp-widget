---
name: a-2-5d-animation
description: "Create or review vivid luxury game-like 2.5D animated backgrounds from a locked master scene, with independent clouds, sunlight, water, flowers, foliage and crop-safe API overlays. Invoke on 'A-2.5DAnimation', layered animation, multi-frame scenic loops, or environment-status scenes; offer image-backed A/B/C/D visual style choices and GrillMe for unresolved artistic decisions before rendering."
---

# A-2.5DAnimation

**Purpose:** Repeatable, reproducible 2.5D motion art for digital signage, environmental widgets and scenes. Make high-quality moving landscapes without independently regenerating static buildings in every frame. Separate **illustrative scene art** from real API data.

## Entry / intent gate — coordinate with GrillMe

1. Read the user's approved scene/style and prior references first; do not re-ask known decisions. Check the relevant source files, `AGENTS.md`, ownership and work order before changing a repository. Do not treat a local `SKILL.md` as authorization to modify a repo.
2. If the *art direction or output target is unresolved*, invite or invoke the installed **@GrillMe** plugin (its `entry-grill-me` → `grill-with-docs` in a repo or `grill-me` otherwise). This is an interview/design decision workflow, **not** a renderer. If the plugin is unavailable, conduct the same bounded questions conversationally and state that the plugin itself was not run.
3. Ask only for unresolved decisions, in dependency order: (a) scene subject / faithful-real vs stylized illustration; (b) final display and visual composition / UI safe area; (c) mood/palette and intensity; (d) allowed movements vs locked objects; (e) deliverables (image, alpha layers, GIF, MP4, HTML, loop length). Present a recommended default for each round; do not ask tool-retrievable facts. Record explicit owner decisions and stop after agreement; if user already approved the style, proceed without another interview.
4. Default when not specified: **vivid, elegant, luxury Japanese-game-like illustration**, fixed camera, landscape master, static architecture, 24 FPS / 6-second loop, iPhone-compatible MP4 + GIF, full-width and target-display proofs; no production deployment.


## Visual-style selection — image-first GrillMe (v0.2.0)

**Before generating new artwork, check whether the user has already approved a style.** Reuse the existing approval without repeating questions. If undecided, show the **four visually referenced options A/B/C/D** from the image-backed A/B/C/D gallery in the connected private ChatGPT plugin when available; repository-only copies provide the named text options using images from the connected ChatGPT plugin when available. Use the installed @GrillMe interview when the user explicitly invokes it, choosing `entry-grill-me → grill-with-docs` for work in a repository and `entry-grill-me → grill-me` in standalone creative work. If unavailable, ask the same bounded questions conversationally and do not imply that the GrillMe plugin was invoked.

- **A / Anime Japanese Game Luxury 2.5D**: painterly anime linework, cel-shaded soft clouds, peach/cream/lilac puff smoke, vibrant luminous water, stylized foliage. **Current PM2.5 orange owner preference — select by default here.**
- **B / Pastoral Storybook 2.5D**: cozy stylized farming, rice and flowers with delicate motion.
- **C / Cinematic Painterly 2.5D**: atmospheric golden-hour depth, brush textures, subdued linework.
- **D / Semi-realistic CGI 2.5D**: near-realistic materials, only when requested (not the selected orange style).

Show a thumbnail for each option if a corresponding image asset is accessible; otherwise state that previews are unavailable and present labeled textual choices; do **not** make four versions of a scene just to ask a style question. In ChatGPT a selection UI is optional, but present the four image-backed choices by default when style is unknown. Ask at most **one unresolved style question at a time**, then motion strength, target crop, and export format only as needed. The visual decision is recorded as `style_id`, `style_ref`, `approved_by_user`, `locked_objects`, `moving_layers`, `target_viewport`, `motion_intensity`.

Style selection does not constitute production release approval. **12 generated images being present does not establish motion success.** Render deterministic independent-layer frames, measure meaningful motion in the relevant regions, inspect actual MP4/GIF on mobile, and request owner visual sign-off.

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

## Natural Motion Taxonomy — mandatory for all animated scenes (v0.3.0)

**Pipeline clarification:** A 2.5D scene is an *editable deterministic compositor*. It generates a **Frame Sequence** (individual complete images sampled at times `t_i`), then encodes those frames to **MP4/GIF**. A collection of 12 independently generated AI stills or a single MP4 is **not** proof of valid 2.5D animation. Show the user the actual frame sequence AND encoded playable video when requested.

Choose movement mode by the object’s physical behavior rather than animating everything with a sine wave:

| Entity / layer | Motion class | Physics / looping policy | Prohibited artifact |
|---|---|---|---|
| clouds, windborne smoke/haze | **Directional / through-frame** | cloud layer translates right→left (or owner-specified prevailing wind) using monotone coordinates; starts outside visible frame; exits the opposite edge. Use independent alpha sprites/tiles with seamless **spatial wrapping**, never reverse direction to fake a temporal loop. Smoke puffs are generated at each stack mouth, move UP + prevailing wind, expand/fade by age, and leave the top before recycling. | boomerang/bouncing clouds, reverse smoke, seam jump, cutting the sky into sliding slabs |
| birds / flying vehicles | **Directional / through-frame** | Spawn outside stage, move continuously until entirely offscreen, optionally repeat after a natural gap. Separate wing flapping (oscillation) from body travel (unidirectional). | birds reversing midair, teleporting inside visible viewport |
| flowing river or traveling water waves | **Traveling Wave / advection** | spatial wavefront propagates downstream using monotone phase; tile seamlessly or use an integer number of phase cycles over the clip. Distort only water-masked pixels, with soft, non-rectangular boundaries. | reversing river flow, sheared waterfront, water distortions on roofs/grass |
| foliage, rice stalks, flowers | **Bounded Oscillation** | pivot/elastic sway about stems or joints using phase-offset periodic motion; mask background holes; trunks and hard geometry remain still. | whole-frame wobble, growing/shrinking buildings |
| localized water glints, sunlight strength / light shafts | **Bounded Oscillation / modulation** | brighten/dim, rotate subtly or sweep within limited area, following cloud occlusion. Use **integer periodic temporal harmonics** if exporting exact seamless loops; rays must not slide across rigid source pixels. | abrupt flicker, temporal phase mismatch at seam |
| architecture, statue, smokestack, bridge, dashboard API labels | **Static Lock** | 0 pixel displacement before video encoding; overlays remain separate from scene. | camera drift, distortion, random redraw between frames |

**Loop algorithm for directional layers:** define deterministic tile positions `x_i(t) = x_i(0) - v*t - period*k` across enough repeated offscreen copies. If requiring an exactly 6-second loop, choose spatial period `P = v*6s` and ensure all moving sprites have sufficient padding: the same tile reappears only **outside** the visible viewport. Distinguish *wrapped texture motion* from resetting an individual sprite on screen. For standalone birds and smoke packets, keep age/lifetime and entrance/exit visibility; a live animation need not visibly loop after 6 seconds if preserving credible one-way motion matters more than the clip seam.

**Source-asset integrity:** never apply global `remap` / `warp` to a sky, image, or MP4 whose clouds or smoke are baked into a static master; fading in a shifted copy produces **sheared/doubled structures**. First create a clean plate, or keep the source untouched and overlay **transparent cloud/smoke sprites**. If baked cloud/smoke remains, disclose it as a quality limitation and do not claim complete layer isolation. Correct alpha/crop edges to avoid rectangular sprite boundaries.

**QA mandatory tests:** (1) sample 12 distinct key moments and inspect motion at actual target size; (2) track every directional object’s world-space centroid to assert monotonically increasing travel toward its exit (allow small turbulent eddies without reversing overall travel); (3) prove at least one cloud/bird/smoke packet crosses an edge and exits without bouncing; (4) measure per-region nontrivial movement separate from static geometry; (5) evaluate final→first seam against nearby frame pairs, including water and cloud regions; (6) reject temporal harmonics with non-integer cycle counts for looping oscillations, and reject visible discontinuities; (7) verify locked architecture pixel count over all raw frames and UI readability. An MP4 that decodes 144 frames is **not** an animation acceptance test. If visible artifacts remain, mark **REJECTED / visual approval pending**; do not claim PASS solely from synthetic metrics.

Reference: the motion patterns and algorithms above are self-contained in this SKILL.md; no relative asset is required.

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
