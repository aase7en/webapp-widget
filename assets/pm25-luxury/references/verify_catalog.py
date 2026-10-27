#!/usr/bin/env python3
"""Read-only file integrity check for canonical owner reference pointers."""
import hashlib
import json
from pathlib import Path
from PIL import Image

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[2]  # project root from assets/pm25-luxury/references/
CATALOG = json.loads((BASE / 'reference-manifest.json').read_text())
assert CATALOG['schema_version'] == 2

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

ref_hashes = set()
for entry in CATALOG['layout_moodboard_references']:
    path = ROOT / entry['path']
    assert path.is_file(), path
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    assert digest == entry['stored_sha256'], path
    assert digest not in seen and digest not in ref_hashes, ('reference duplicate', path)
    ref_hashes.add(digest)
    with Image.open(path) as image:
        assert image.size == (1536, 512), (path, image.size)
        image.verify()
    assert entry['stored_pixels'] == [1536, 512]
    assert entry['source_original']['pixels'] == [1536, 512]
    assert digest != entry['source_original']['sha256'], 'transfer is declared re-encoded'
    assert entry['stored_bytes'] == path.stat().st_size
    assert entry['kind'] == 'full_resolution_reencoded_reference'
    print('FULL_RES_OK', entry['role'], digest[:12], path.stat().st_size)

# Exactly two reference JPEGs; zero extra thumbnails, zero duplicate content.
assert {x.name for x in BASE.glob('*.jpg')} == {
    'pm25-layout-preview.jpg','weather-layout-preview.jpg'}
print('OWNER_REFERENCE_CATALOG_PASS', len(seen),
      'canonical source collages +', len(ref_hashes), 'full-resolution visual references')
