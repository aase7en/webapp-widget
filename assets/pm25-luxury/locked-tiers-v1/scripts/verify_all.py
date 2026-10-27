#!/usr/bin/env python3
"""Strict provenance, per-tier 54-frame export, geometry-lock and motion checks."""
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
import hashlib,json,numpy as np
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT.parent/'frame-first-v1'
tiers=('green','yellow','orange','red')
for t in tiers:
 folder=ROOT/t;m=json.loads((folder/'manifest.json').read_text())
 assert m['tier']==t and m['nativeSourceFrames']==10 and m['derivedFrames']==54
 assert m['sourceFrameSize']==[1296,120] and m['mp4FramesDecoded']==54
 native=sorted((SOURCE/t/'frames').glob('frame-*.webp'))
 assert len(native)==10 and len(m['ownerSourceFrameHashes'])==10
 for i,f in enumerate(native):
  assert f.name==f'frame-{i+1:02}.webp'
  assert hashlib.sha256(f.read_bytes()).hexdigest()==m['ownerSourceFrameHashes'][i]
  assert Image.open(f).size==(1296,120)
 first=np.asarray(Image.open(folder/'qa/first-lossless.png'))
 middle=np.asarray(Image.open(folder/'qa/mid-lossless.png'))
 for name,(l,u,r,b) in m['staticLandmarkBoxes'].items():
  assert np.array_equal(first[u:b,l:r],middle[u:b,l:r]),('ROI_CHANGED',t,name)
 assert m['staticPixelLockVerified'] and m['lockedPixels']>40000
 assert m['skyMotionHalfLoop']>2.5 and m['waterMotionHalfLoop']>3.0
 im=Image.open(folder/f'{t}-locked-54f.webp')
 assert im.size==(1296,120) and im.n_frames==54
 a=[]
 for k in range(54):
  im.seek(k);a.append(im.convert('RGB').copy())
 seam=sum(ImageStat.Stat(ImageChops.difference(a[0],a[-1])).mean)/3
 assert seam<3.0,('SEAM',t,seam)
 assert (folder/f'{t}-locked-54f.mp4').stat().st_size>=10000
 assert (folder/'qa/motion-masks.webp').is_file()
 assert (folder/'qa/six-moments.webp').is_file()
 print('TIER_VERIFY_PASS',t,'original=10','derived=54','seam_rgb',round(seam,3),
       'locked_pixel_count',m['lockedPixels'],'sky',m['skyMotionHalfLoop'],'water',m['waterMotionHalfLoop'])
print('ALL_FOUR_TIERS_PASS')
