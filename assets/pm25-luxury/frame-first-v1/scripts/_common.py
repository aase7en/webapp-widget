"""Shared paths + helpers for frame-first-v1 pipeline scripts.

Read-only source of truth: assets/pm25-luxury/locked-scene-v3/
This package (committed output): assets/pm25-luxury/frame-first-v1/
Scratch (untracked): <worktree>/.tmp/
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

PKG_ROOT = Path(__file__).resolve().parents[1]           # .../frame-first-v1
REPO_ROOT = PKG_ROOT.parents[2]                          # worktree root
LOCKED_V3 = REPO_ROOT / "assets" / "pm25-luxury" / "locked-scene-v3"
TMP_ROOT = REPO_ROOT / ".tmp"
QA_DIR = PKG_ROOT / "qa"
MANIFEST_PATH = PKG_ROOT / "manifest.json"
TIERS = ["blue", "green", "yellow", "orange", "red"]
EXPECTED_COUNTS = {"blue": 12, "green": 10, "yellow": 10, "orange": 10, "red": 10}
FRAME_W = 1296
FRAME_H = 120
BASE_COMMIT = "34cebfa9bcf81316d67742452d6158368c3d7b0f"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def load_locked_manifest() -> dict:
    return json.loads((LOCKED_V3 / "manifest.json").read_text())


def load_provenance() -> dict:
    path = QA_DIR / "provenance.json"
    if path.exists():
        return json.loads(path.read_text())
    return {}
