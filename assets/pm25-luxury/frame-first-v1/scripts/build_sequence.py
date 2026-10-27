#!/usr/bin/env python3
"""Stage 2b/3 — deterministic frame normalization, contact sheets, BLUE loop proof,
numeric QA metrics, and manifest assembly for frame-first-v1.

Subcommands:
  normalize       — per tier: committed source_frames cells -> frames/frame-NN.webp
                    (1296x120) via: uniform scale to 1296 wide; horizon registration
                    (max |vertical gradient| row in [0.45H,0.75H] band, 8% side margins
                    ignored; 120-row crop with horizon at y=84, clamped at edges);
                    horizontal registration (column-luminance circular cross-correlation
                    vs frame-01, integer shift -40..+40 applied as circular roll).
                    Saved WEBP quality=95. All parameters recorded.
  contact-sheets  — per tier contact-sheet.webp (6x2 blue / 5x2 others, tiles at 50%,
                    4px gutters, index numbers ONLY in the label gutter strip) plus
                    all-levels-contact-overview.webp (5 tier rows x first/mid/last).
  blue-proof      — three genuine-loop previews from blue/frames/*.webp:
                    A step      : 12 frames @100ms hard step
                    B xfade250  : 12 native frames @100ms + 250ms crossfade per
                                  transition (6 PIL Image.blend intermediates @42ms,
                                  wrap 12->1 included) — intermediates are DERIVED,
                                  never native
                    C pingpong  : 1->12->1, 22 steps @80ms, no blend
                    Target <600KB per preview; quality ladder 90->85->82->80.
  metrics         — qa/blue-metrics.json: per adjacent pair + wrap pair mean abs
                    pixel diff (0-255) on the registered frames, per-frame mean
                    luminance curve, per-frame shift corrections, loop-seam ratio
                    (wrap diff vs median adjacent diff). Blue (12 frames) and green
                    (10 frames) to prove the engine handles both counts.
  manifest        — assemble manifest.json from state fragments + qa evidence.
  all             — run normalize, contact-sheets, blue-proof, metrics, manifest.

Inputs are the COMMITTED immutable cells in locked-scene-v3/source_frames; nothing in
locked-scene-v3 is modified. Scratch state lives in .tmp/frame-first-v1-state/.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

from _common import (
    BASE_COMMIT,
    EXPECTED_COUNTS,
    FRAME_H,
    FRAME_W,
    PKG_ROOT,
    QA_DIR,
    REPO_ROOT,
    TIERS,
    load_locked_manifest,
    sha256_file,
)

TEMP_STATE = REPO_ROOT / ".tmp" / "frame-first-v1-state"

HORIZON_TARGET_Y = 84
HORIZON_BAND = (0.45, 0.75)
MARGIN_FRAC = 0.08
SHIFT_RANGE = 40
PREVIEW_QUALITY_LADDER = [90, 85, 82, 80]
PREVIEW_SIZE_TARGET = 600 * 1024
TILE_SCALE = 0.5
GUTTER = 4
LABEL_STRIP_H = 14


# ---------------------------------------------------------------- helpers
def rel(p: Path) -> str:
    return str(Path(p).relative_to(REPO_ROOT))


def font(size: int = 12) -> ImageFont.FreeTypeFont:
    try:
        return ImageFont.load_default(size=size)
    except TypeError:
        return ImageFont.load_default()


def save_state(name: str, data: dict) -> None:
    TEMP_STATE.mkdir(parents=True, exist_ok=True)
    (TEMP_STATE / f"{name}.json").write_text(json.dumps(data, indent=1) + "\n")


def load_state(name: str) -> dict:
    return json.loads((TEMP_STATE / f"{name}.json").read_text())


def tier_cells(tier: str) -> list[Path]:
    return sorted((REPO_ROOT / "assets/pm25-luxury/locked-scene-v3/source_frames" / tier).glob("original-cell-*.webp"))


def preview_quality_ladder_save(path: Path, frames: list[Image.Image], durations: list[int]) -> dict:
    """Save animated WebP trying the quality ladder until < target size.

    Spec keeps quality within 80–90; if even 80 misses the 600KB target the q80
    result is kept and the full ladder trace is returned as deviation evidence.
    """
    ladder = []
    chosen = None
    for q in PREVIEW_QUALITY_LADDER:
        frames[0].save(
            path, "WEBP", save_all=True, append_images=frames[1:],
            duration=durations, loop=0, quality=q, method=6,
        )
        size = path.stat().st_size
        ladder.append({"quality": q, "bytes": size})
        if size <= PREVIEW_SIZE_TARGET:
            chosen = (q, size)
            break
    if chosen is None:
        chosen = (PREVIEW_QUALITY_LADDER[-1], path.stat().st_size)
    return {"quality": chosen[0], "bytes": chosen[1],
            "under600KB": chosen[1] <= PREVIEW_SIZE_TARGET,
            "qualityLadderTried": ladder}


# ---------------------------------------------------------------- normalize
def normalize_tier(tier: str) -> dict:
    cells = tier_cells(tier)
    expected = EXPECTED_COUNTS[tier]
    if len(cells) != expected:
        raise SystemExit(f"{tier}: expected {expected} committed cells, found {len(cells)}")
    out_dir = PKG_ROOT / tier / "frames"
    out_dir.mkdir(parents=True, exist_ok=True)
    ref_profile = None
    entries = []
    for i, cell in enumerate(cells, start=1):
        im = Image.open(cell).convert("RGB")
        w0, h0 = im.size
        scale = FRAME_W / w0
        scaled_h = int(round(h0 * scale))
        scaled = im.resize((FRAME_W, scaled_h), Image.LANCZOS)
        gray = np.asarray(scaled.convert("L"), dtype=np.float64)

        margin = int(round(FRAME_W * MARGIN_FRAC))
        band_lo = max(1, int(np.ceil(HORIZON_BAND[0] * scaled_h)))
        band_hi = min(scaled_h - 2, int(np.floor(HORIZON_BAND[1] * scaled_h)))
        grad = np.abs(np.diff(gray, axis=0))  # transition rows 0..H-2
        row_score = grad[:, margin : FRAME_W - margin].sum(axis=1)
        horizon_raw = band_lo + int(np.argmax(row_score[band_lo : band_hi + 1]))

        top = int(horizon_raw - HORIZON_TARGET_Y)
        top = max(0, min(top, scaled_h - FRAME_H))
        horizon_y_used = int(horizon_raw - top)
        cropped = scaled.crop((0, top, FRAME_W, top + FRAME_H))
        crop_arr = np.asarray(cropped, dtype=np.uint8)

        profile = crop_arr.astype(np.float64).mean(axis=2).mean(axis=0)
        if i == 1:
            ref_profile = profile
            shift = 0
        else:
            lags = range(-SHIFT_RANGE, SHIFT_RANGE + 1)
            errs = [float(np.abs(np.roll(profile, lag) - ref_profile).sum()) for lag in lags]
            shift = int(list(lags)[int(np.argmin(errs))])
        final_arr = np.roll(crop_arr, shift, axis=1)
        final = Image.fromarray(final_arr, mode="RGB")

        out_path = out_dir / f"frame-{i:02d}.webp"
        final.save(out_path, "WEBP", quality=95, method=6)
        entries.append(
            {
                "frame": i,
                "file": rel(out_path),
                "sourceCell": rel(cell),
                "sourceCellSha256": sha256_file(cell),
                "sourcePixels": [w0, h0],
                "scale": round(scale, 8),
                "scaledHeight": scaled_h,
                "horizonRowRaw": int(horizon_raw),
                "horizonBand": list(HORIZON_BAND),
                "cropTop": top,
                "horizonYUsed": horizon_y_used,
                "shiftPx": shift,
                "sha256": sha256_file(out_path),
                "bytes": out_path.stat().st_size,
            }
        )
    normalization = {
        "output": FRAME_W,
        "frameHeight": FRAME_H,
        "resample": "PIL LANCZOS (uniform scale to width 1296)",
        "horizon": {
            "rule": "row in [0.45H,0.75H] maximizing sum|vertical gradient| (luminance), 8% side margins excluded",
            "targetYInOutput": HORIZON_TARGET_Y,
            "clampRule": "crop top clamped to [0, H-120]; recorded per frame",
        },
        "horizontal": {
            "rule": f"circular cross-correlation of column-luminance profile vs frame-01, integer shift -{SHIFT_RANGE}..+{SHIFT_RANGE}, applied as circular roll",
            "reference": "frame-01",
        },
        "encoding": "WEBP quality=95 method=6",
        "frames": entries,
    }
    print(
        f"{tier}: {len(entries)} frames | H={min(e['scaledHeight'] for e in entries)}.."
        f"{max(e['scaledHeight'] for e in entries)} horizonYUsed={entries[0]['horizonYUsed']} "
        f"shifts={[e['shiftPx'] for e in entries]}"
    )
    return {"tier": tier, "nativeFrameCount": len(entries), "normalization": normalization}


# ---------------------------------------------------------------- contact sheets
def make_contact_sheet(tier: str, frame_paths: list[Path], out_path: Path, cols: int) -> dict:
    tw, th = int(FRAME_W * TILE_SCALE), int(FRAME_H * TILE_SCALE)  # 648x60
    rows = (len(frame_paths) + cols - 1) // cols
    width = GUTTER + cols * (tw + GUTTER)
    height = GUTTER + rows * (th + LABEL_STRIP_H + GUTTER)
    sheet = Image.new("RGB", (width, height), (250, 250, 250))
    draw = ImageDraw.Draw(sheet)
    f = font(12)
    for idx, fp in enumerate(frame_paths):
        r, c = divmod(idx, cols)
        x = GUTTER + c * (tw + GUTTER)
        y = GUTTER + r * (th + LABEL_STRIP_H + GUTTER)
        im = Image.open(fp).convert("RGB").resize((tw, th), Image.LANCZOS)
        sheet.paste(im, (x, y))
        draw.text(
            (x + tw // 2, y + th + LABEL_STRIP_H // 2),
            f"frame-{idx + 1:02d}",
            fill=(60, 60, 60),
            font=f,
            anchor="mm",
        )
    sheet.save(out_path, "WEBP", quality=90, method=6)
    return {"file": rel(out_path), "grid": [cols, rows], "tilePixels": [tw, th],
            "gutterPx": GUTTER, "labelStripPx": LABEL_STRIP_H,
            "bytes": out_path.stat().st_size}


def contact_sheets() -> dict:
    out = {}
    for tier in TIERS:
        frame_paths = sorted((PKG_ROOT / tier / "frames").glob("frame-*.webp"))
        cols = 6 if tier == "blue" else 5
        info = make_contact_sheet(tier, frame_paths, PKG_ROOT / tier / "contact-sheet.webp", cols)
        out[tier] = {"contactSheet": info, "frameCount": len(frame_paths)}
        print(f"{tier}: contact-sheet.webp {info['bytes']}B grid={info['grid']}")
    # all-levels overview: 5 rows x first/mid/last
    tile_w, tile_h = int(FRAME_W * TILE_SCALE), int(FRAME_H * TILE_SCALE)
    label_strip_w = 90
    per_row = 3
    width = GUTTER + label_strip_w + per_row * (tile_w + GUTTER)
    height = GUTTER + len(TIERS) * (tile_h + LABEL_STRIP_H + GUTTER)
    sheet = Image.new("RGB", (width, height), (250, 250, 250))
    draw = ImageDraw.Draw(sheet)
    f = font(12)
    for r, tier in enumerate(TIERS):
        frame_paths = sorted((PKG_ROOT / tier / "frames").glob("frame-*.webp"))
        picks = [0, len(frame_paths) // 2, len(frame_paths) - 1]
        y = GUTTER + r * (tile_h + LABEL_STRIP_H + GUTTER)
        draw.text(
            (GUTTER + label_strip_w // 2, y + tile_h // 2),
            tier.upper(),
            fill=(30, 30, 30),
            font=font(14),
            anchor="mm",
        )
        for c, fi in enumerate(picks):
            x = GUTTER + label_strip_w + c * (tile_w + GUTTER)
            im = Image.open(frame_paths[fi]).convert("RGB").resize((tile_w, tile_h), Image.LANCZOS)
            sheet.paste(im, (x, y))
            draw.text(
                (x + tile_w // 2, y + tile_h + LABEL_STRIP_H // 2),
                f"frame-{fi + 1:02d}",
                fill=(60, 60, 60),
                font=f,
                anchor="mm",
            )
    out_path = PKG_ROOT / "all-levels-contact-overview.webp"
    sheet.save(out_path, "WEBP", quality=90, method=6)
    out["overview"] = {
        "file": rel(out_path),
        "rows": TIERS,
        "picksPerTier": "first / mid (n//2 0-based) / last",
        "bytes": out_path.stat().st_size,
    }
    print(f"overview: {out['overview']['bytes']}B")
    return out


# ---------------------------------------------------------------- blue proof
def load_tier_frames(tier: str) -> list[Image.Image]:
    return [Image.open(p).convert("RGB") for p in sorted((PKG_ROOT / tier / "frames").glob("frame-*.webp"))]


def blue_proof() -> dict:
    frames = load_tier_frames("blue")
    n = len(frames)
    if n != EXPECTED_COUNTS["blue"]:
        raise SystemExit(f"blue: expected 12 normalized frames, found {n}")
    out_dir = PKG_ROOT / "blue"
    out_dir.mkdir(parents=True, exist_ok=True)

    # A — step
    path_a = out_dir / "preview-step.webp"
    a_info = preview_quality_ladder_save(path_a, frames, [100] * n)

    # B — xfade250: native @100ms + 6 blend intermediates @42ms per transition (wrap included)
    frames_b: list[Image.Image] = []
    durations_b: list[int] = []
    composition_b = []
    for i in range(n):
        frames_b.append(frames[i])
        durations_b.append(100)
        composition_b.append({"slot": len(frames_b) - 1, "type": "native", "sourceFrame": i + 1})
        nxt = (i + 1) % n
        for k in range(1, 7):
            frames_b.append(Image.blend(frames[i], frames[nxt], k / 7.0))
            durations_b.append(42)
            composition_b.append(
                {"slot": len(frames_b) - 1, "type": "blendDerived",
                 "sources": [i + 1, nxt + 1], "alpha": round(k / 7.0, 6), "durationMs": 42}
            )
    path_b = out_dir / "preview-xfade250.webp"
    b_info = preview_quality_ladder_save(path_b, frames_b, durations_b)

    # C — pingpong 1->12->1, 22 steps @80ms, no blend
    order = list(range(n)) + list(range(n - 2, 0, -1))
    frames_c = [frames[i] for i in order]
    path_c = out_dir / "preview-pingpong.webp"
    c_info = preview_quality_ladder_save(path_c, frames_c, [80] * len(frames_c))

    result = {
        "approachA_step": {
            "file": rel(path_a), "frameCount": n, "durationMsPerFrame": 100,
            "composition": "12 native frames only",
            **a_info,
        },
        "approachB_xfade250": {
            "file": rel(path_b), "totalSlots": len(frames_b),
            "nativeSlots": n, "blendSlots": n * 6,
            "crossfadeMs": 252, "blendSubframeMs": 42, "nativeDwellMs": 100,
            "compositionExplicit": composition_b,
            "note": "blend intermediates are DERIVED from adjacent native frames; never native",
            **b_info,
        },
        "approachC_pingpong": {
            "file": rel(path_c), "frameCount": len(frames_c),
            "durationMsPerFrame": 80, "order": [i + 1 for i in order],
            "composition": "native frames only, ping-pong order",
            **c_info,
        },
    }
    print(
        f"previews: step={a_info['bytes']}B(q{a_info['quality']}) "
        f"xfade250={b_info['bytes']}B(q{b_info['quality']}, {len(frames_b)} slots) "
        f"pingpong={c_info['bytes']}B(q{c_info['quality']}, {len(frames_c)} frames)"
    )
    return result


# ---------------------------------------------------------------- metrics
def frame_metrics(tier: str) -> dict:
    paths = sorted((PKG_ROOT / tier / "frames").glob("frame-*.webp"))
    arrs = [np.asarray(Image.open(p).convert("RGB"), dtype=np.float64) for p in paths]
    lum = [round(float(np.asarray(Image.open(p).convert("L"), dtype=np.float64).mean()), 4) for p in paths]
    n = len(arrs)
    adj = []
    for i in range(n - 1):
        adj.append(round(float(np.abs(arrs[i] - arrs[i + 1]).mean()), 5))
    wrap = round(float(np.abs(arrs[-1] - arrs[0]).mean()), 5)
    med = float(np.median(adj))
    norm = load_state("normalize")["perTier"][tier]["normalization"]["frames"]
    shifts = [e["shiftPx"] for e in norm]
    return {
        "nativeFrameCount": n,
        "adjacentPairMeanDiff255": {f"{i + 1:02d}->{i + 2:02d}": d for i, d in enumerate(adj)},
        "wrapPairMeanDiff255": f"{n:02d}->01",
        "wrapPairValue": wrap,
        "adjacentMedianDiff255": round(med, 5),
        "seamRatioWrapVsMedian": round(wrap / med, 4) if med > 0 else None,
        "seamWithin3xMedian": bool(wrap <= 3.0 * med) if med > 0 else None,
        "frameMeanLuminance": lum,
        "perFrameShiftPx": shifts,
        "maxAbsShiftPx": max(abs(s) for s in shifts),
        "note": "diffs computed on the final registered/saved WEBP frames (decoded), registration included",
    }


def metrics() -> dict:
    QA_DIR.mkdir(parents=True, exist_ok=True)
    per_tier = {tier: frame_metrics(tier) for tier in TIERS}
    data = {
        "blue": per_tier["blue"],
        "green": per_tier["green"],
        "greenNote": "green included as dry-run of the 10-frame path (metrics only, no preview)",
        "allTiers": per_tier,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }
    (QA_DIR / "blue-metrics.json").write_text(json.dumps(data, indent=1) + "\n")
    for tier in ("blue", "green"):
        m = data[tier]
        print(
            f"{tier}: seam wrap={m['wrapPairValue']} vs adjacentMedian={m['adjacentMedianDiff255']} "
            f"ratio={m['seamRatioWrapVsMedian']} | maxShift={m['maxAbsShiftPx']}"
        )
    return data


# ---------------------------------------------------------------- manifest
def manifest() -> dict:
    norm = load_state("normalize")
    sheets = load_state("contact-sheets")
    proof = load_state("blue-proof")
    metrics_data = json.loads((QA_DIR / "blue-metrics.json").read_text())
    prov = json.loads((QA_DIR / "provenance.json").read_text())
    locked = load_locked_manifest()

    per_tier = {}
    for tier in TIERS:
        entry = {
            "nativeFrameCount": EXPECTED_COUNTS[tier],
            "frames": norm["perTier"][tier]["normalization"]["frames"],
            "normalization": {k: v for k, v in norm["perTier"][tier]["normalization"].items() if k != "frames"},
            "contactSheet": sheets[tier]["contactSheet"],
            "sourceCollageSha256": locked["tiers"][tier]["originalSHA256"],
            "sourceCellsSha256Verified": prov["stage1"]["tiers"][tier]["cellsShaMatch"],
            "metrics": metrics_data["allTiers"][tier],
            "previews": None,
        }
        per_tier[tier] = entry
    per_tier["blue"]["previews"] = {
        "approachA_step": proof["approachA_step"],
        "approachB_xfade250": proof["approachB_xfade250"],
        "approachC_pingpong": proof["approachC_pingpong"],
    }

    data = {
        "schema": 1,
        "kind": "FRAME_FIRST_SEQUENCE_V1",
        "status": "DEMO_ONLY_NOT_PRODUCTION",
        "baseCommit": BASE_COMMIT,
        "created": datetime.now(timezone.utc).isoformat(),
        "generator": [
            "scripts/verify_sequence.py",
            "scripts/extract_frames.py",
            "scripts/build_sequence.py",
        ],
        "regenerationCommand": (
            "python3 scripts/verify_sequence.py && python3 scripts/extract_frames.py && "
            "python3 scripts/build_sequence.py all   # run inside assets/pm25-luxury/frame-first-v1/"
        ),
        "sourceOfTruth": {
            "lockedSceneRoot": "assets/pm25-luxury/locked-scene-v3/",
            "originalCollages": "originals/*.jpeg (sha256 recorded per tier; DO NOT duplicate into this package)",
            "committedCells": "source_frames/<tier>/original-cell-NN.webp (sha256 in locked-scene-v3/manifest.json)",
            "note": (
                "locked-scene-v3 is immutable read-only input. Normalized frames here are built "
                "ONLY from the committed cells; originals are never copied."
            ),
        },
        "nativeVsDerivedPolicy": (
            "frames/frame-NN.webp are NATIVE frames (deterministic geometric normalization of "
            "committed cells only: uniform rescale + horizon crop + circular shift). No pixels are "
            "invented. preview-xfade250.webp additionally contains DERIVED blended intermediates "
            "(PIL Image.blend of adjacent native frames); they are labeled type=blendDerived in "
            "approachB_xfade250.compositionExplicit and must never be presented as native."
        ),
        "perTier": per_tier,
        "playbackEvaluated": [
            {"approach": "step", "fps": 10,
             "description": "12 native frames @100ms hard step (preview-step.webp)"},
            {"approach": "xfade250", "fps": 10,
             "description": "native dwell 100ms + 252ms crossfade per transition implemented as 6 blend intermediates @42ms (preview-xfade250.webp)"},
            {"approach": "pingpong", "fps": 10,
             "description": "1->12->1, 22 steps @80ms, no blend (preview-pingpong.webp)"},
        ],
        "noOverlayPolicy": (
            "This phase produces geometric registration ONLY. No decorative overlay assets "
            "(birds/leaves/particles/smoke or any sprite layers) were created; locked-scene-v3 "
            "effects atlases are untouched."
        ),
        "provenanceSummary": {
            "stage1": prov["stage1"]["summary"],
            "derivedGeometryCrossCheck": {
                tier: prov["derivedGeometry"]["tiers"][tier]["crossCheckVsBuildPack"]["cellsMatched"]
                for tier in TIERS
            },
            "reextraction": {
                tier: {
                    "byteMatchRate": prov["reextraction"]["tiers"][tier]["byteMatchRate"],
                    "ruleARuleAPassRate": prov["reextraction"]["tiers"][tier]["ruleAPassRate"],
                    "ruleBPassRate": prov["reextraction"]["tiers"][tier]["ruleBPassRate"],
                    "equivalenceVerdict": prov["reextraction"]["tiers"][tier]["equivalenceVerdict"],
                }
                for tier in TIERS
            },
            "reextractionVerdict": prov["reextractionVerdict"],
            "evidenceFile": "qa/provenance.json",
        },
    }
    (PKG_ROOT / "manifest.json").write_text(json.dumps(data, indent=1) + "\n")
    print(f"manifest.json written ({(PKG_ROOT / 'manifest.json').stat().st_size}B)")
    return data


# ---------------------------------------------------------------- driver
def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("stage", choices=["normalize", "contact-sheets", "blue-proof", "metrics", "manifest", "all"])
    args = ap.parse_args()

    def run(stage: str) -> None:
        if stage == "normalize":
            per = {}
            for tier in TIERS:
                per[tier] = normalize_tier(tier)
            save_state("normalize", {"perTier": per,
                                     "runAt": datetime.now(timezone.utc).isoformat()})
        elif stage == "contact-sheets":
            save_state("contact-sheets", contact_sheets())
        elif stage == "blue-proof":
            save_state("blue-proof", blue_proof())
        elif stage == "metrics":
            metrics()
        elif stage == "manifest":
            manifest()

    if args.stage == "all":
        for stage in ["normalize", "contact-sheets", "blue-proof", "metrics", "manifest"]:
            run(stage)
    else:
        run(args.stage)
    return 0


if __name__ == "__main__":
    sys.exit(main())
