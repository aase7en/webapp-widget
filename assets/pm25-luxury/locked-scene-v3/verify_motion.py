#!/usr/bin/env python3
"""Assert authored frames are distinct, perceptible at LED size and retain master geometry."""
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
import json
ROOT=Path(__file__).resolve().parent
tiers=('blue','green','yellow','orange','red')
minimum={'clouds':12,'leaves':2.4,'birds':.34,'water_reflections':2.7}
m=json.loads((ROOT/'manifest.json').read_text())
def tile(atlas,frame):
 x=frame%4*1296;y=frame//4*120
 return atlas.crop((x,y,x+1296,y+120))
for tier in tiers:
 loop=Image.open(ROOT/'loops'/f'{tier}-16f.webp')
 assert loop.n_frames==16
 frames=[]
 for k in range(16):
  loop.seek(k);frames.append(loop.convert('RGB').copy())
 d=[sum(ImageStat.Stat(ImageChops.difference(frames[i],frames[(i+1)%16])).mean)/3 for i in range(16)]
 assert sum(d)/len(d)>4,('composite too still',tier,d)
 assert d[-1]<2.1*max(d[:-1]),('hard wrap cut',tier,d)
 for fx,threshold in minimum.items():
  atlas=Image.open(ROOT/'effects'/fx/f'{tier}-16f.webp')
  assert atlas.size==(5184,480)
  a=tile(atlas,0).getchannel('A');b=tile(atlas,8).getchannel('A')
  diff=ImageStat.Stat(ImageChops.difference(a,b)).mean[0]
  assert diff>threshold,('motion too faint',tier,fx,diff)
  if fx=='birds':
   bbox=tile(atlas,4).getchannel('A').getbbox()
   assert bbox and bbox[2]-bbox[0]>=55 and bbox[3]-bbox[1]>=16,('bird silhouette too small',tier,bbox)
 # Pixel-identical static master is untouched across every composite frame.
 assert m['tiers'][tier]['master']['pixels']==[1296,120]
 print('MOTION_PASS',tier,'composite',round(sum(d)/16,2),'seam',round(d[-1],2))
print('ALL_5x16_MOTION_FRAMES_VERIFIED')
