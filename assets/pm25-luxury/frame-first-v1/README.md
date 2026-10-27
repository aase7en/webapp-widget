# PM2.5 frame-first-v1 — provenance-verified native frame pipeline

**Status:** `DEMO_ONLY_NOT_PRODUCTION` — BLUE proof complete; other tiers normalized + measured but pending owner visual gate.

This package derives **genuine native frame sequences** (BLUE 12 frames; GREEN/YELLOW/ORANGE/RED 10 each) from the committed cells in the read-only source of truth, with byte-level provenance evidence, deterministic geometric normalization, and numeric loop QA. It complements `../locked-scene-v3/` (whose 16-frame loops use a fixed master + procedural effect layers). Nothing in `locked-scene-v3/` was modified.

## Provenance chain

```
owner-supplied JPEG collages (locked-scene-v3/originals/*.jpeg, sha256 in locked-scene-v3/manifest.json)
  └─ verified crops ─→ source_frames/<tier>/original-cell-NN.webp (committed; WEBP q88 m3 re-encode)
       └─ deterministic normalization ─→ frame-first-v1/<tier>/frames/frame-NN.webp (NATIVE)
            └─ deterministic recombination ─→ preview-step / preview-xfade250 / preview-pingpong (blue only)
```

Evidence (`qa/provenance.json`):

1. **Stage 1** (`scripts/verify_sequence.py`): 5 collages + 52 cells sha256-verified against `locked-scene-v3/manifest.json`, decoded pixel dims matched, counts asserted (12/10/10/10/10). Exit non-zero on any mismatch.
2. **Grid re-derivation** (`scripts/extract_frames.py`): the manifest has NO explicit crop rects, so the collage grid was independently re-derived by FFT-SSD template matching + ±3px local SAD refine. Result: left column x=6 (w=754), right column x=777 (w=755), uniform 14px row gaps, top margin 4px — **52/52 cells match** `build_pack.py`'s measured bands (`crop_source`: `xbounds=((6,760),(777,1532))`, `ytop=y0+(7 if row>0 else 4)`, `ybottom=y1-7`).
3. **Re-extraction equivalence**: raw crops re-extracted from the JPEG collages (`.tmp/reextract/`, untracked). File byte-match vs committed WebP is 0/52 (expected: committed cells are post-processed `WEBP quality=88 method=3` re-encodes — see `build_pack.py:53`); the spec's pixel threshold (mean diff < 2.0/255) also misses (2.3–3.9 mean gray levels of q88 quantization noise, recorded as `ruleA`). The **authoritative rule B** passes **52/52**: re-encoding the re-extracted crop with the identical codec settings reproduces the committed cell **bit-exactly** (sha256 AND decoded-RGB array equality). The committed cells are provably exact crops of the original collages.

## Normalization (deterministic, geometry only)

`scripts/build_sequence.py normalize` — from the COMMITTED cells only:

1. Uniform rescale to width 1296 (PIL LANCZOS); resulting H = 122–180 (blue), up to 218 (green's tallest cell).
2. **Horizon registration**: row maximizing Σ|vertical gradient| (luminance) within [0.45H, 0.75H], 8% side margins excluded; 120-row crop places the horizon at y=84 (clamped at edges; actual y recorded — no clamp was needed, horizonYUsed=84 on every frame).
3. **Horizontal registration**: column-luminance profile circular cross-correlation vs frame-01, integer shift −40..+40 px, applied as circular roll (no black bars; shifts recorded per frame).
4. Saved `WEBP quality=95 method=6` as `<tier>/frames/frame-NN.webp`. Per-frame `sourceCell`, `scale`, `scaledHeight`, `horizonRowRaw`, `horizonYUsed`, `cropTop`, `shiftPx`, `sha256` in `manifest.json`.

No pixels are invented or retouched — this is geometric registration only.

## BLUE proof (three loop approaches)

| approach | file | composition | size |
|---|---|---|---|
| A step | `blue/preview-step.webp` | 12 native frames @100ms hard step | 509 KB |
| B xfade250 | `blue/preview-xfade250.webp` | 12 native dwell @100ms + 252ms crossfade per transition = 6 `Image.blend` intermediates @42ms (wrap 12→1 included) — 84 slots | 2.13 MB |
| C pingpong | `blue/preview-pingpong.webp` | 1→12→1, 22 steps @80ms, no blend | 615 KB |

**Native vs derived:** `frames/frame-NN.webp` are NATIVE. The xfade preview's blend intermediates are DERIVED (labeled `type: "blendDerived"` with explicit sources + alpha in `manifest.json → perTier.blue.previews.approachB_xfade250.compositionExplicit`); they must never be presented as native frames.

Numeric loop metrics (`qa/blue-metrics.json`): blue seam 12→1 mean diff 38.40 vs adjacent median 25.91 → ratio 1.48 (within 3×); green dry-run seam ratio 1.09. Per-frame luminance curves and shift corrections included.

Browser proof: `qa/blue-player.html` (self-contained, no external requests) — approach select, fps slider 4–16, play/pause, frame step, frame counter, 432×40 logical viewport + full 1296×120, reduced-motion aware. Playwright QA (`.tmp/frame-first-qa/`, untracked): 0 console errors, 21 screenshots (each approach at frames 01/06/12, both viewports, xfade held mid-blend 03→04), rAF ≈60fps with correct 10fps advance for step/pingpong, `prefers-reduced-motion` → paused at frame 01.

## Immutability rules

- `../locked-scene-v3/**` is read-only; scripts never write there.
- This package never copies the original collages; provenance is by sha256 reference.
- `.tmp/` (re-extractions, QA artifacts, state fragments) stays untracked.
- Regenerate with the commands below; outputs are byte-deterministic on this toolchain (Pillow 12.2.0, libwebp via Pillow).

## No-overlay policy (this phase)

Decorative overlays are intentionally disabled: **no birds, leaves, particles, smoke sprites, or any new overlay/decoration assets** were created here. The locked-scene-v3 effect atlases are untouched. This package is pure frame registration + playback engineering.

## Regeneration

```bash
cd assets/pm25-luxury/frame-first-v1
python3 scripts/verify_sequence.py            # Stage 1 — provenance gate (non-zero exit on mismatch)
python3 scripts/extract_frames.py             # Stage 2a — grid re-derivation + re-extraction equivalence
python3 scripts/build_sequence.py all         # Stage 2b/3 — normalize + contact sheets + blue proof + metrics + manifest
# Playwright QA (optional): serve repo root on :8797, then
# NODE_PATH=<playwright modules> node .tmp/frame-first-qa/qa-blue-player.cjs
```

## BLUE-proof-first status

GREEN/YELLOW/ORANGE/RED are normalized + measured (metrics in `qa/blue-metrics.json → allTiers`) but have **no animated previews** and remain pending the owner visual gate. Blue previews are demo-only pending the same gate and hardware LED 432×40 contrast/performance testing.
