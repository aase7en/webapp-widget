# PM2.5 Luxury LED — five-state art & sprite plan

Status: PROPOSED / OWNER ART APPROVAL PENDING. Design planning only, not a production patch.
Checked: 2026-10-26 (Asia/Bangkok). Repo: aase7en/webapp-widget, NOT ENV app.
Reference: Water Luxury V3.2 PR #47, accepted composition and 2026-10-26 PM/Weather concept imagery.
Task authority: docs/work-orders/WO-PM25-LUXURY-SPRITES-20261026.md.

## Objective
Build PM2.5 visual states with the luxury luminous-cyan frame, semi-background 3D-like atmospheric scene, oversized readable numeric value, soft gradients and coherent motion. Reuse its style later for Weather. The physical LED logical canvas is 432x40. Every PM/Weather/Water slide MUST show date/time at the same pixel position and approximate size, with no perceptible jump.

## Source-of-truth: Thai 5 colors, concentrations NOT AQI
Source: Thai Dept. of Health, 27 Mar 2569:
https://multimedia.anamai.moph.go.th/infographics/info1287_pm2-5_42/
Cross-check: https://multimedia.anamai.moph.go.th/news/news201066/
These are PM2.5 mass concentration ranges (µg/m³) for Thai guidance tied to 24-hour concentrations:
1. BLUE 0–15.0: ดีมาก — crystal-clear sky, crisp skyline, airy blue glow.
2. GREEN >15.0–25.0: ดี — green growth, mostly clear sky, very light mist.
3. YELLOW >25.0–37.5: ปานกลาง — golden atmospheric haze, softened skyline.
4. ORANGE >37.5–75.0: เริ่มมีผลกระทบต่อสุขภาพ — amber smog, thicker haze, subdued distance.
5. RED >75.0: มีผลกระทบต่อสุขภาพ — red-brown heavy smog, muted skyline, legible high-contrast text.
No PURPLE tier; the grey UNAVAILABLE display is an error state, NOT a sixth health tier.
Crucial defect discovered in actual origin/main v2/live-widgets.js: cutoffs [0,26,38,51,91,151] and 22 labelled 'ดีมาก'. A 22 µg/m³ Thai current-tier example should be GREEN/ดี. A separate reviewed classification correction is REQUIRED before connecting artwork to real health messaging.
Before implementing thresholds, verify the backend PM field's observation window, aggregation (24h average vs latest/hourly), unit, observedAt and source. Do not quietly classify incompatible measurements as 24-hour exposure.

## Asset and animation contract
- FIVE master static background plates minimum; fixed city/horizon geometry and view/camera across tiers. Change sunlight, opacity, smog and particles rather than rebuilding totally different compositions.
- FIVE independently controllable haze/particle layers (prototype 8–12 transparent frames/tier), 1–2 shared airflow/glint strips; all frame counts are provisional until benchmarked.
- Render in layers: (0) base plate, (1) smog/haze particles, (2) drifting light/airflow, (3) fade-to-dark legibility mask, (4) real DOM numbers/labels/status/clock, (5) border highlights. DOM text never part of generated sprite.
- Keep particles away from text safe zones. Gradients feather at edges and avoid horizontal seam lines; no distracting extreme flash.
- Asset directory (PROPOSED, not created yet): assets/pm25-luxury/scenes/{blue,green,yellow,orange,red}/ and shared/. Each atlas will get a JSON manifest with frame sizes, fps, alpha, source, license, checksum and byte weight.
- Green is the FIRST motion proof: locked single master image + 8-frame drifting haze strip. Compare identical first/last pose for seamless loop.
- Do NOT generate 40 independent full-scene images: subject geometry would flicker between frames. Move independent transparent overlays above one consistent master scene.

## Rendering, consistency and reliability
- Primary path: reuse existing Canvas2D sprite strip player from Water Luxury under assets/water-gate/5-levels; minimal dependencies. Prototype on 432x40 at 3x authoring resolution. Do not add PixiJS unless measured perf shows need.
- Freeze common clock/date x/y/w/h in all three slides. Screenshot coordinate-diff target <=1 CSS pixel. Prototype fixed anchors first; evaluate one parent-level persistent clock only as separate reviewed refactor if that cannot meet spec.
- Visual FPS target to test: 8–12 frames/sec; 22-second slide rotation must not stall. Measure on actual LED browser low-end device; memory/network budget set from findings, not guesses. Only active scene's atlas loaded; other scene assets lazy.
- reduced-motion => still plate; image/Canvas fail => static CSS; pause animation when document hidden; time, main metrics and status remain DOM-visible.
- Environmental imagery is ILLUSTRATIVE (not a photograph or sensor map). Null/unknown not zero. Real reading with old observedAt is HISTORICAL, not LIVE. No fake rain/forecast/medical advice or green safety claim from visuals.

## Decisions for owner review
D1 preferred: five base plates + layered sprite loop, not five full-motion video files.
D2 preferred: Thai 5 concentration bands after verified backend aggregation.
D3 preferred: CSS-aligned clock first; shared parent clock only if quantified slide jumps remain.
D4 Weather phase follows PM prototype and preserves true weather API semantics.
No art generation, UI source edits, external dependencies or production release until design gate.

## References
- A-Sunday Conductor local: 00-AGENT-ENTRY.md, PROJECT-GRAPH.yaml, AGENTS.md, CURRENT-WORK.md, FAST_EXECUTION_PROTOCOL.md — borrow bounded WO, risk/claim, evidence and handoff; do not clone the control plane.
- AI Hero https://www.aihero.dev/skills — reuse /research -> /to-spec -> /to-tickets -> /prototype -> /code-review -> /handoff concepts without install.
- https://github.com/mattpocock/skills — open coding-agent skills.
- https://github.com/pixijs/pixijs — optional atlas runtime. https://github.com/pixijs/pixijs/blob/dev/skills/pixijs-assets/references/spritesheet.md
- https://github.com/Orama-Interactive/Pixelorama — frame/layer editor (pixel art bias).
- https://github.com/aldegad/sprite-gen — optional agent-assisted sprite frame generation; validate license and quality before importing.
- https://github.com/lovell/sharp — atlas composite/compression candidate.
