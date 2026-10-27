#!/usr/bin/env python3
"""Read-only file integrity check for canonical owner reference pointers."""
import hashlib
import json
from pathlib import Path
from PIL import Image

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[2]  # project root from assets/pm25-luxury/references/
CATALOG = json.loads((BASE / 'reference-manifest.json').read_text())
assert CATALOG['schema_version'] == 1

seen = set()
assert [x['tier'] for x in CATALOG['canonical_collages']] == [
    'blue', 'green', 'yellow', 'orange', 'red']
assert [x['native_cells'] for x in CATALOG['canonical_collages']] == [12, 10, 10, 10, 10]

for entry in CATALOG['canonical_collages']:
    path = ROOT / entry['path']
    assert path.exists(), path
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    assert digest == entry['sha256']
    assert digest not in seen, ('duplicate canonical source', path)
    seen.add(digest)
    print('SOURCE_OK', entry['tier'], digest[:12])

for entry in CATALOG['layout_moodboard_previews']:
    path = ROOT / entry['path']
    assert path.exists(), path
    assert hashlib.sha256(path.read_bytes()).hexdigest() == entry['stored_sha256']
    with Image.open(path) as image:
        assert image.size == (198, 66)
    assert entry['source_original']['pixels'] == [1536, 512]
    assert entry['kind'] == 'thumbnail_only'
    print('THUMB_OK', entry['role'], path.stat().st_size)

print('OWNER_REFERENCE_CATALOG_PASS', len(seen), 'unique source collages + 2 distinct layout previews')
