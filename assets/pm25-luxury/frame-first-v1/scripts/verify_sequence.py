#!/usr/bin/env python3
"""Stage 1 — provenance verification for frame-first-v1.

Verifies, deterministically, that every byte of the read-only source of truth
(assets/pm25-luxury/locked-scene-v3) matches its own manifest.json:
  * per-tier original collage JPEG sha256 (manifest tiers.*.originalSHA256)
  * per-cell committed WebP sha256 + decoded pixel dims (manifest sourceOriginalCells)
  * cell counts (blue==12, others==10)

Writes evidence to qa/provenance.json. Exits non-zero on ANY mismatch.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

from _common import (
    EXPECTED_COUNTS,
    LOCKED_V3,
    QA_DIR,
    REPO_ROOT,
    TIERS,
    load_locked_manifest,
    sha256_file,
)


def main() -> int:
    manifest = load_locked_manifest()
    QA_DIR.mkdir(parents=True, exist_ok=True)
    mismatches: list[str] = []
    collages = []
    tiers_out = {}

    for tier in TIERS:
        t = manifest["tiers"][tier]
        exp_count = EXPECTED_COUNTS[tier]

        # --- original collage ---
        collage_rel = f"originals/{t['sourceFile']}"
        collage_path = LOCKED_V3 / "originals" / t["sourceFile"]
        actual_sha = sha256_file(collage_path)
        with Image.open(collage_path) as im:
            decoded = list(im.size)
        sha_match = actual_sha == t["originalSHA256"]
        if not sha_match:
            mismatches.append(
                f"{tier}: collage sha mismatch expected={t['originalSHA256']} actual={actual_sha}"
            )
        collages.append(
            {
                "tier": tier,
                "file": collage_rel,
                "manifestSha256": t["originalSHA256"],
                "actualSha256": actual_sha,
                "shaMatch": sha_match,
                "decodedPixels": decoded,
            }
        )

        # --- cells ---
        cell_files = sorted((LOCKED_V3 / "source_frames" / tier).glob("original-cell-*.webp"))
        count = len(cell_files)
        count_ok = count == exp_count
        if not count_ok:
            mismatches.append(f"{tier}: cell count {count} != expected {exp_count}")
        manifest_cells = {Path(c["path"]).name: c for c in t["sourceOriginalCells"]}
        if set(manifest_cells) != {p.name for p in cell_files}:
            mismatches.append(f"{tier}: manifest cell filename set differs from on-disk cells")
        cells_out = []
        for cf in cell_files:
            actual_cell_sha = sha256_file(cf)
            with Image.open(cf) as im:
                dec = list(im.size)
            m = manifest_cells.get(cf.name)
            sha_ok = bool(m) and m["sha256"] == actual_cell_sha
            px_ok = bool(m) and list(m["pixels"]) == dec
            if not sha_ok:
                mismatches.append(
                    f"{tier}/{cf.name}: sha mismatch expected={m['sha256'] if m else None} "
                    f"actual={actual_cell_sha}"
                )
            if not px_ok:
                mismatches.append(
                    f"{tier}/{cf.name}: pixels mismatch expected={m['pixels'] if m else None} "
                    f"decoded={dec}"
                )
            cells_out.append(
                {
                    "file": f"source_frames/{tier}/{cf.name}",
                    "manifestSha256": m["sha256"] if m else None,
                    "actualSha256": actual_cell_sha,
                    "shaMatch": sha_ok,
                    "manifestPixels": m["pixels"] if m else None,
                    "decodedPixels": dec,
                    "pixelsMatch": px_ok,
                    "manifestGridRow": m["originalGridRow"] if m else None,
                    "manifestGridColumn": m["originalGridColumn"] if m else None,
                }
            )
        tiers_out[tier] = {
            "expectedCellCount": exp_count,
            "actualCellCount": count,
            "countMatch": count_ok,
            "collage": collages[-1],
            "cells": cells_out,
            "cellsShaMatch": all(c["shaMatch"] for c in cells_out),
            "cellsPixelsMatch": all(c["pixelsMatch"] for c in cells_out),
        }

    prov = {
        "stage1": {
            "runAt": datetime.now(timezone.utc).isoformat(),
            "sourceOfTruthRoot": str(
                REPO_ROOT.relative_to(REPO_ROOT) / "assets/pm25-luxury/locked-scene-v3"
            ).replace(str(REPO_ROOT), "."),
            "collagesVerified": collages,
            "tiers": tiers_out,
            "summary": {
                "collageCount": len(collages),
                "collagesShaMatch": all(c["shaMatch"] for c in collages),
                "cellCount": sum(len(t["cells"]) for t in tiers_out.values()),
                "cellsShaMatch": all(t["cellsShaMatch"] for t in tiers_out.values()),
                "cellsPixelsMatch": all(t["cellsPixelsMatch"] for t in tiers_out.values()),
                "countsMatch": all(t["countMatch"] for t in tiers_out.values()),
                "mismatchCount": len(mismatches),
            },
            "mismatches": mismatches,
        },
        "status": "FAILED" if mismatches else "OK",
    }

    out = QA_DIR / "provenance.json"
    out.write_text(json.dumps(prov, indent=1) + "\n")
    s = prov["stage1"]["summary"]
    print(
        f"provenance: {s['collageCount']} collages shaMatch={s['collagesShaMatch']} | "
        f"{s['cellCount']} cells shaMatch={s['cellsShaMatch']} pixelsMatch={s['cellsPixelsMatch']} "
        f"countsMatch={s['countsMatch']} | mismatches={s['mismatchCount']} -> status={prov['status']}"
    )
    return 1 if mismatches else 0


if __name__ == "__main__":
    sys.exit(main())
