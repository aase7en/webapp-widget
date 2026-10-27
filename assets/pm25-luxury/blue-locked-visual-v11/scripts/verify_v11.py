#!/usr/bin/env python3
"""Source hashes, animation continuity, motion regions and locked structures."""
import hashlib,json
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
import numpy as np
HERE=Path(__file__).resolve().parents[1]
REPO=HERE.parents[2]
data=json.loads((HERE/'manifest.json').read_text())
assert data['renderedFrames']==66 and data['sourceFrames']==12
assert data['staticRegionExact'] and data['protectedPixelCount']>=66000
source=REPO/'assets/pm25-luxury/frame-first-v1/blue/frames'
for k,h in enumerate(data['sourceFrameSha256'],1):
 assert hashlib.sha256((source/f'frame-{k:02}.webp').read_bytes()).hexdigest()==h
assert data['windMotion']['cloudDriftSourcePx']>=24
assert data['windMotion']['waterRippleXSourcePx']>=2
anim=Image.open(HERE/'blue-locked-66f.webp')
assert anim.n_frames==66 and anim.size==(1296,120)
frames=[]
for k in range(66):
 anim.seek(k)
 frames.append(anim.convert('RGB').copy())
diff=[sum(ImageStat.Stat(ImageChops.difference(frames[k],frames[(k+1)%66])).mean)/3 for k in range(66)]
assert 0<diff[-1]<2*sum(diff)/len(diff), ('obvious seam',diff[-1])
assert max(diff)<4, ('flash',max(diff))
first=np.asarray(Image.open(HERE/'qa/blue-first-pixel-locked.png'))
mid=np.asarray(Image.open(HERE/'qa/blue-mid-pixel-locked.png'))
for name,(x0,y0,x1,y1) in data['landmarkBoxes'].items():
 assert np.array_equal(first[y0:y1,x0:x1],mid[y0:y1,x0:x1]), ('structure moved',name)
for label,(x0,y0,x1,y1) in {'sky':(485,0,720,48),'river':(430,102,970,119)}.items():
 delta=np.abs(np.asarray(frames[0]).astype(np.int16)[y0:y1,x0:x1]-
              np.asarray(frames[33]).astype(np.int16)[y0:y1,x0:x1]).mean()
 assert delta>7, ('motion imperceptible',label,delta)
 print('ACTIVE_REGION',label,round(float(delta),2))
print('BLUE_V11_VERIFY_PASS',{'sourceFrames':12,'renderedFrames':66,'seam':round(diff[-1],3),
                            'avgAdjacent':round(sum(diff)/66,3),'staticLocked':True})
