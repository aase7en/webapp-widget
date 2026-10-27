# WO-PM25-WEATHER-OWNER-REFERENCES-20261027

**Status:** Catalog-only, owner requested save visual references in repo and avoid duplicate images.
**Repo:** `aase7en/webapp-widget`; isolated worktree `webapp-widget-pm25-owner-reference-20261027`, branch `docs/pm25-weather-owner-reference-20261027` from exact b07680dc8797af3ad96f7b649158751eb2e357b2.
**Scope:** `assets/pm25-luxury/references/**`, this WO and append-only `SESSION-HANDOFF.md`. One writer. No production, backend, API/Sheet, Water, Weather or other code mutation. Protected root has pre-existing dirty changes; frame-first lane has `.tmp/`. Both remain untouched.
**Gate:** SAFE_TO_MUTATE_CATALOG_ONLY=YES; SAFE_TO_DELETE_HISTORICAL_ASSETS=NO.

## Actual dedup evidence
- SHA-256 current owner uploads BLUE/GREEN/YELLOW/ORANGE equals existing JPEG under `locked-scene-v3/originals/`. RED also already there. No extra source collage copy added, no original deleted.
- Source grid yields native BLUE=12, others=10; do not generate a false claim that there are 16 source images per tier.
- Exact binary duplicates detected in historical procedural effect atlases in `locked-scene-v3/effects/`: light_rain, leaves, water_reflections. Their use in old manifests and regression code means deleting them now is not safe; the owner wanted reference deduplication, not breaking reproducibility.
- PM/Weather concept originals 1536×512 attached by owner, imported to connected Canva library as full-size references. Repo includes only low-resolution 198×66 thumbnails (size/limitation explicitly recorded), SHA metadata, Canva media IDs. No claim that thumbnail equals full-resolution original.

## Deliverables
- `assets/pm25-luxury/references/README.md` — canonical five original paths, UI composition refs, priority.
- `assets/pm25-luxury/references/reference-manifest.json` — SHA, frame counts, source original IDs and thumbnail metadata.
- `assets/pm25-luxury/references/{pm25-layout-preview,weather-layout-preview}.jpg` — low-resolution visual bookmarks.
- Append-only canonical `SESSION-HANDOFF.md` checkpoint.

## Verification and release boundary
Validate all reference file paths, hashes and image dimensions deterministically; inspect Git staged scope, no accidental changes outside allowed. Push separate branch; Draft PR with base `feat/pm25-frame-first-v1-20261027`, do not merge or touch main without owner coordination. The original full-resolution mockups would require a separate lossless transfer into repo to make the reference package fully self-contained.

## Follow-on completion — full-size in-repository references
- Separate verified worktree and branch: `/Volumes/MAC_WORK/DevWorkspace/Github/webapp-widget-owner-fullres-20261027`, `docs/pm25-weather-owner-fullres-20261027`, based on the catalog commit `1b3003129063ef47fce511d111df969f31755208`.
- Replaced both thumbnail file CONTENTS in place at `assets/pm25-luxury/references/pm25-layout-preview.jpg` and `weather-layout-preview.jpg`, preserving their stable relative links. Both now contain full 1536×512 pixels rather than 198×66. There are still only two reference JPEG files — no duplicate thumbnail or source collage was introduced.
- Transfer was through the owner's two already-attached assets and an authorized connected high-resolution image export, which re-encoded each JPEG. The exact owner-upload originals have different SHA-256 checksums; the catalog now records `source_original.sha256`, `stored_sha256`, both pixel sizes, file size, transfer asset IDs, and a prominent provenance disclaimer. Do not conflate visual full resolution with byte-for-byte fidelity.
- Original BLUE/GREEN/YELLOW/ORANGE files from this message SHA-match existing `locked-scene-v3/originals` files; RED is already canonical in the same directory. Reuse only, no duplicate import.
- Historic exact-duplicate procedural overlay files are still used by legacy scripts/manifests and have NOT been deleted. Deleting them would break unrelated historical Demo paths and is not authorized by reference cleanup.
- `verify_catalog.py` now fails for wrong reference bytes, non-1536×512 resolution, duplicate references, incorrect frame counts, extra .jpg copies or missing canonical originals. Review docs + references only. No source code that drives the LED was touched, no production deployment authorized.
- Gate for this follow-on: SAFE_TO_MUTATE_REFERENCES_ONLY=YES after isolated worktree+HEAD+remote match; SAFE_TO_DELETE_HISTORICAL_ASSETS=NO; SAFE_TO_MERGE_PRODUCTION=NO. Suggested PR base `feat/pm25-frame-first-v1-20261027`; no overwrite of its .tmp artifacts or Agent-owned work.
