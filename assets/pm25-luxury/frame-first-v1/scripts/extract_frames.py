#!/usr/bin/env python3
"""Stage 2a — deterministic re-derivation of the locked-scene-v3 collage grid
and re-extraction of raw cells from the original JPEG collages.

locked-scene-v3/manifest.json carries per-cell `originalGridRow`/`originalGridColumn`
+ `pixels` but NO explicit crop rects, so the grid geometry is RE-DERIVED here by
FFT-accelerated SSD template matching of each committed cell inside its original
collage, refined by local ±3px SAD search. The derived geometry is additionally
cross-checked against build_pack.py's measured band configuration (read-only import).

Results recorded in qa/provenance.json:
  * derivedGeometry — per tier: column x offsets, row y rects, gaps, margins, plus
    `crossCheckVsBuildPack` (exact rect match verdicts)
  * reextraction    — per cell:
      - byteMatchRate: sha256(re-extracted PNG) vs sha256(committed WebP). Bytes
        can never match across formats; committed cells are post-processed
        (build_pack.py saves WEBP quality=88, method=3).
      - ruleA_specThreshold: mean abs pixel diff (0–255 scale) < 2.0, i.e.
        < 2.0/255 normalized. Reported for transparency; NOT met because q88 WebP
        quantization noise alone measures ~3.3–3.9 mean gray levels on this pack.
      - ruleB_reencodeEquivalence (authoritative): re-encode the re-extracted crop
        with the exact committed codec settings (WEBP q88 m3) and compare sha256 to
        the committed cell; if encoder builds differ byte-wise, fall back to
        decoded-RGB array equality of (committed webp) vs (re-encoded webp).

Re-extracted cells go to .tmp/reextract/<tier>/ (NOT committed).
Exit non-zero only if ruleB equivalence fails (provenance chain broken).
"""
from __future__ import annotations

import importlib.util
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image

from _common import (
    LOCKED_V3,
    QA_DIR,
    TMP_ROOT,
    TIERS,
    load_locked_manifest,
    load_provenance,
    sha256_file,
)

SPEC_THRESHOLD_255 = 2.0  # spec's equivalence threshold: mean diff < 2.0/255 normalized


def ssd_template_match(collage: np.ndarray, tmpl: np.ndarray) -> tuple[int, int]:
    """Exhaustive SSD search of tmpl inside collage (single-channel float64)."""
    H, W = collage.shape
    h, w = tmpl.shape
    F = np.fft.rfft2(collage)
    F2 = np.fft.rfft2(collage**2)
    Tp = np.zeros_like(collage)
    Tp[:h, :w] = tmpl  # no flip: conj(fft(K)) already yields cross-correlation
    Op = np.zeros_like(collage)
    Op[:h, :w] = 1.0
    corr = np.fft.irfft2(F * np.conj(np.fft.rfft2(Tp)), s=collage.shape)
    corr2 = np.fft.irfft2(F2 * np.conj(np.fft.rfft2(Op)), s=collage.shape)
    ssd = corr2 - 2.0 * corr + float((tmpl**2).sum())
    valid = ssd[: H - h + 1, : W - w + 1]
    y, x = np.unravel_index(int(np.argmin(valid)), valid.shape)
    return int(y), int(x)


def local_sad_refine(collage, tmpl, y, x, radius=3):
    h, w = tmpl.shape
    best_y, best_x, best_sad = y, x, None
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            yy, xx = y + dy, x + dx
            if yy < 0 or xx < 0 or yy + h > collage.shape[0] or xx + w > collage.shape[1]:
                continue
            sad = float(np.abs(collage[yy : yy + h, xx : xx + w] - tmpl).mean())
            if best_sad is None or sad < best_sad:
                best_sad, best_y, best_x = sad, yy, xx
    return best_y, best_x, float(best_sad)


def load_build_pack_config():
    """Read-only import of locked-scene-v3/build_pack.py to expose CONFIG bands."""
    spec = importlib.util.spec_from_file_location("locked_build_pack", LOCKED_V3 / "build_pack.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.CONFIG


def build_pack_expected_rects(config) -> dict[str, list[list[int]]]:
    out = {}
    xbounds = ((6, 760), (777, 1532))
    for tier, conf in config.items():
        rects = []
        for row, (y0, y1) in enumerate(zip(conf["bands"][:-1], conf["bands"][1:])):
            ytop = y0 + (7 if row > 0 else 4)
            ybottom = y1 - 7
            for col, (x0, x1) in enumerate(xbounds):
                rects.append([x0, ytop, x1 - x0, ybottom - ytop])
        out[tier] = rects
    return out


def derive_tier_geometry(tier: str, tinfo: dict) -> tuple[dict, Path, np.ndarray]:
    collage_path = LOCKED_V3 / "originals" / tinfo["sourceFile"]
    collage_rgb = np.asarray(Image.open(collage_path).convert("RGB"), dtype=np.float64)
    collage_gray = collage_rgb.mean(axis=2)
    cells = sorted((LOCKED_V3 / "source_frames" / tier).glob("original-cell-*.webp"))
    placements = []
    for cf in cells:
        cell_rgb = np.asarray(Image.open(cf).convert("RGB"), dtype=np.float64)
        cy, cx = ssd_template_match(collage_gray, cell_rgb.mean(axis=2))
        y, x, sad = local_sad_refine(collage_gray, cell_rgb.mean(axis=2), cy, cx)
        placements.append(
            {"cell": cf.name, "x": x, "y": y, "w": cell_rgb.shape[1], "h": cell_rgb.shape[0],
             "matchSadMean255": round(sad, 4)}
        )
    placements.sort(key=lambda p: (p["y"], p["x"]))
    left = [p for p in placements if p["w"] == 754]
    right = [p for p in placements if p["w"] == 755]
    left_xs = sorted({p["x"] for p in left})
    right_xs = sorted({p["x"] for p in right})

    rows = []
    for p in placements:
        if rows and abs(rows[-1]["y"] - p["y"]) <= 2:
            rows[-1]["cells"].append(p)
            rows[-1]["y"] = min(rows[-1]["y"], p["y"])
        else:
            rows.append({"y": p["y"], "cells": [p]})
    for r in rows:
        r["heights"] = sorted({c["h"] for c in r["cells"]})
    rows.sort(key=lambda r: r["y"])
    gaps = [b["y"] - (a["y"] + max(a["heights"])) for a, b in zip(rows, rows[1:])]
    top_margin = rows[0]["y"]
    bottom_margin = int(collage_gray.shape[0] - (rows[-1]["y"] + max(rows[-1]["heights"])))

    geometry = {
        "tier": tier,
        "collageFile": f"originals/{tinfo['sourceFile']}",
        "collagePixels": [int(collage_gray.shape[1]), int(collage_gray.shape[0])],
        "method": "fft-ssd-template-match + ±3px local SAD refine (single-channel float64)",
        "columnSplit": {"left": left_xs, "right": right_xs},
        "rows": [
            {"row": i, "y": r["y"], "heights": r["heights"],
             "cells": [{"cell": c["cell"], "x": c["x"], "y": c["y"], "w": c["w"], "h": c["h"],
                        "matchSadMean255": c["matchSadMean255"]}
                       for c in sorted(r["cells"], key=lambda c: c["x"])]}
            for i, r in enumerate(rows)
        ],
        "gapsBetweenRows": gaps,
        "topMargin": top_margin,
        "bottomMargin": bottom_margin,
        "warnings": [],
    }
    if len(left_xs) != 1 or len(right_xs) != 1:
        geometry["warnings"].append(f"column x not constant: left={left_xs} right={right_xs}")
    if any(g < 0 for g in gaps):
        geometry["warnings"].append(f"negative row gap detected: {gaps}")
    return geometry, collage_path, collage_rgb


def main() -> int:
    manifest = load_locked_manifest()
    prov = load_provenance()
    bp_config = load_build_pack_config()
    expected_rects = build_pack_expected_rects(bp_config)
    reextract_root = TMP_ROOT / "reextract"
    reextract_root.mkdir(parents=True, exist_ok=True)

    derived = {}
    reextr = {}
    ruleB_failures = []
    for tier in TIERS:
        tinfo = manifest["tiers"][tier]
        geometry, collage_path, collage_rgb = derive_tier_geometry(tier, tinfo)

        # cross-check derived rects vs build_pack.py measured rects (row-major cell order)
        committed_cells = sorted((LOCKED_V3 / "source_frames" / tier).glob("original-cell-*.webp"))
        all_cells = [c for r in geometry["rows"] for c in r["cells"]]
        derived_by_name = {p["cell"]: [p["x"], p["y"], p["w"], p["h"]] for p in all_cells}
        cross = []
        for i, cf in enumerate(committed_cells):
            exp = expected_rects[tier][i] if i < len(expected_rects[tier]) else None
            got = derived_by_name.get(cf.name)
            cross.append({"cell": cf.name, "derived": got, "buildPackExpected": exp,
                          "match": got == exp})
        geometry["crossCheckVsBuildPack"] = {
            "rule": "x=(6,760)/(777,1532); ytop=y0+(7 if row>0 else 4); ybottom=y1-7 (build_pack.py crop_source)",
            "cellsMatched": f"{sum(1 for c in cross if c['match'])}/{len(cross)}",
            "allMatch": all(c["match"] for c in cross),
            "cells": cross,
        }
        if not geometry["crossCheckVsBuildPack"]["allMatch"]:
            geometry["warnings"].append("derived rects differ from build_pack.py expectations")
        derived[tier] = geometry

        out_dir = reextract_root / tier
        out_dir.mkdir(parents=True, exist_ok=True)
        cell_results = []
        for r in geometry["rows"]:
            for c in r["cells"]:
                x, y, w, h = c["x"], c["y"], c["w"], c["h"]
                crop = collage_rgb[y : y + h, x : x + w].astype(np.uint8)
                crop_img = Image.fromarray(crop, mode="RGB")
                png_path = out_dir / (Path(c["cell"]).stem + ".png")
                crop_img.save(png_path, format="PNG")
                committed = LOCKED_V3 / "source_frames" / tier / c["cell"]
                committed_arr = np.asarray(Image.open(committed).convert("RGB"), dtype=np.uint8)
                diff = np.abs(committed_arr.astype(np.int64) - crop.astype(np.int64))
                mean255 = float(diff.mean())

                # Rule B: deterministic re-encode with committed codec settings
                reenc_path = out_dir / ("reencode-" + c["cell"])
                crop_img.save(reenc_path, format="WEBP", quality=88, method=3)
                reenc_arr = np.asarray(Image.open(reenc_path).convert("RGB"), dtype=np.uint8)
                sha_byte_match = sha256_file(reenc_path) == sha256_file(committed)
                reenc_decoded_equal = bool(np.array_equal(reenc_arr, committed_arr))
                reenc_decoded_mean = float(
                    np.abs(reenc_arr.astype(np.int64) - committed_arr.astype(np.int64)).mean()
                )
                rule_b_pass = sha_byte_match or reenc_decoded_equal
                entry = {
                    "cell": f"source_frames/{tier}/{c['cell']}",
                    "reextractedPng": str(png_path),
                    "reencodedWebp": str(reenc_path),
                    "derivedRect": [x, y, w, h],
                    "fileSha256MatchVsCommitted": sha256_file(png_path) == sha256_file(committed),
                    "decodedPixelBytesMatch": bool(np.array_equal(committed_arr, crop)),
                    "pixelDiffMean255": round(mean255, 5),
                    "pixelDiffMax255": int(diff.max()),
                    "ruleA_specThreshold2of255Pass": mean255 < SPEC_THRESHOLD_255,
                    "ruleB_reencodeShaMatch": sha_byte_match,
                    "ruleB_reencodeDecodedArrayEqual": reenc_decoded_equal,
                    "ruleB_reencodeDecodedDiffMean255": round(reenc_decoded_mean, 6),
                    "ruleB_equivalencePass": rule_b_pass,
                }
                if not rule_b_pass:
                    ruleB_failures.append(f"{tier}/{c['cell']}: ruleB failed")
                cell_results.append(entry)
        reextr[tier] = {
            "cells": cell_results,
            "byteMatchRate": f"{sum(1 for e in cell_results if e['fileSha256MatchVsCommitted'])}/{len(cell_results)}",
            "ruleAPassRate": f"{sum(1 for e in cell_results if e['ruleA_specThreshold2of255Pass'])}/{len(cell_results)}",
            "ruleBPassRate": f"{sum(1 for e in cell_results if e['ruleB_equivalencePass'])}/{len(cell_results)}",
            "ruleAMeanDiff255Range": [
                round(min(e["pixelDiffMean255"] for e in cell_results), 3),
                round(max(e["pixelDiffMean255"] for e in cell_results), 3),
            ],
            "equivalenceVerdict": "PASS" if all(e["ruleB_equivalencePass"] for e in cell_results) else "FAIL",
        }
        print(
            f"{tier}: crossCheck={geometry['crossCheckVsBuildPack']['cellsMatched']} "
            f"byteMatch={reextr[tier]['byteMatchRate']} ruleA={reextr[tier]['ruleAPassRate']} "
            f"ruleB={reextr[tier]['ruleBPassRate']} meanDiff255={reextr[tier]['ruleAMeanDiff255Range']} "
            f"warnings={geometry['warnings']}"
        )

    prov["derivedGeometry"] = {
        "runAt": datetime.now(timezone.utc).isoformat(),
        "method": derived["blue"]["method"],
        "tiers": derived,
    }
    prov["reextraction"] = {
        "runAt": datetime.now(timezone.utc).isoformat(),
        "outputDir": ".tmp/reextract/ (untracked)",
        "committedCellPostProcessing": "build_pack.py crop_source saves WEBP quality=88 method=3",
        "ruleA_spec": "mean abs pixel diff (0-255 scale) < 2.0 (= < 2.0/255 normalized)",
        "ruleB_authoritative": (
            "re-encode re-extracted crop as WEBP q88 m3; pass if sha256 matches committed "
            "cell OR decoded RGB arrays are exactly equal (encoder-build independent)"
        ),
        "tiers": reextr,
        "ruleBAllPass": not ruleB_failures,
        "ruleBFailures": ruleB_failures,
    }
    prov["reextractionVerdict"] = "PASS" if not ruleB_failures else "FAIL"
    if ruleB_failures:
        prov["status"] = "FAILED"

    QA_DIR.mkdir(parents=True, exist_ok=True)
    (QA_DIR / "provenance.json").write_text(json.dumps(prov, indent=1) + "\n")
    total = sum(len(t["cells"]) for t in reextr.values())
    bpass = sum(int(t["ruleBPassRate"].split("/")[0]) for t in reextr.values())
    print(
        f"reextraction: {total} cells | ruleB equivalence {bpass}/{total} -> {prov['reextractionVerdict']}"
    )
    return 1 if ruleB_failures else 0


if __name__ == "__main__":
    sys.exit(main())
