#!/usr/bin/env python3
"""Verify saved originals and generated cinematic PM asset manifest, no live data."""
from pathlib import Path
from PIL import Image, ImageStat
import hashlib, json
ROOT=Path(__file__).resolve().parent
TIERS=('blue','green','yellow','orange','red')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
m=json.loads((ROOT/'manifest.json').read_text())
assert set(m['tiers'])==set(TIERS)
assert m['notForProductionUntilApproved'] is True
total=0
for tier in TIERS:
 d=m['tiers'][tier]
 for file_key,hash_key,size in [('sourceFile','sourceSha256',(2172,724)),('scenicFile','scenicSha256',(1296,221)),('ledCropFile','ledCropSha256',(1296,120))]:
  p=ROOT/d[file_key]
  assert p.is_file(),f'{tier}: missing {p}'
  assert Image.open(p).size==size, f'{tier}: {file_key} size drift'
  assert sha(p)==d[hash_key], f'{tier}: SHA mismatch {file_key}'
  total+=p.stat().st_size
 image=Image.open(ROOT/d['scenicFile']).convert('RGB')
 assert ImageStat.Stat(image).mean[0]<220, f'{tier}: white background not trimmed'
 assert not d['containsText'] and not d['approved']
assert sha(ROOT/m['preview']['file'])==m['preview']['sha256']
assert Image.open(ROOT/m['preview']['file']).size==(1320,773)
motion=json.loads((ROOT/'motion/motion-manifest.json').read_text())
assert set(motion['tiers'])==set(TIERS) and motion['frames']==8
for tier in TIERS:
 rec=motion['tiers'][tier]
 atlas=ROOT/'motion'/rec['atlas'];gif=ROOT/'motion'/rec['previewGif']
 assert atlas.is_file() and gif.is_file()
 assert Image.open(atlas).size==(2592,224)
 assert Image.open(atlas).getchannel('A').getextrema()[0]==0
 assert Image.open(atlas).getchannel('A').getextrema()[1]>0
 assert Image.open(gif).n_frames==8
 assert sha(atlas)==rec['atlasSha256'] and sha(gif)==rec['gifSha256']
print(f'CINEMATIC_ASSET_QA_PASS: {len(TIERS)} original PNGs, {len(TIERS)} scene WebPs, {len(TIERS)} LED crops, manifest hashes valid, bytes={total}')
