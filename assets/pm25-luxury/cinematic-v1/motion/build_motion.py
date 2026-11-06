#!/usr/bin/env python3
"""Deterministic looping alpha atmospheric effects for five cinematic PM art tiers.
A visual *illustration*, never real PM measurements. No new source imagery generated here.
"""
from PIL import Image,ImageDraw,ImageFilter,ImageChops,ImageOps,ImageStat
from pathlib import Path
import math,random,json,hashlib
BASE=Path(__file__).resolve().parent.parent;HERE=Path(__file__).resolve().parent
W,H=648,112;N=8;COLS=4
CFG={'blue':((70,211,255),.25),'green':((67,238,176),.39),
     'yellow':((253,219,114),.64),'orange':((255,170,86),.84),
     'red':((230,103,84),1.0)}
manifest={'schema':1,'kind':'illustrative-transparent-atmospheric-motion','reviewOnly':True,
          'frameSize':[W,H],'frames':N,'atlasGrid':[COLS,2],'trialFps':8,
          'tiers':{},'notes':'Framing is the same for each tier; density and color are artistic abstractions, not measurements.'}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
for tier,(rgb,strength) in CFG.items():
 atlas=Image.new('RGBA',(W*COLS,H*2),(0,0,0,0));frames=[]
 mot_rng=random.Random(43101)
 centers=[(mot_rng.uniform(-60,W+60),mot_rng.uniform(0,H),mot_rng.uniform(13,52),mot_rng.uniform(0,2*math.pi)) for _ in range(27)]
 lights=[(mot_rng.uniform(0,W),mot_rng.uniform(6,H-6),mot_rng.uniform(0,2*math.pi)) for _ in range(65)]
 for t in range(N):
  theta=2*math.pi*t/N
  fog=Image.new('RGBA',(W,H),(0,0,0,0));paint=ImageDraw.Draw(fog,'RGBA')
  for x,y,r,phase in centers:
   dx=14*math.sin(theta+phase);dy=5*math.cos(theta+phase)
   a=round((5+6*(y/H))*strength)
   paint.ellipse((x+dx-r*2,y+dy-r/2,x+dx+r*2,y+dy+r/2),fill=(*rgb,a))
  fog=fog.filter(ImageFilter.GaussianBlur(13))
  sparks=Image.new('RGBA',(W,H),(0,0,0,0));sd=ImageDraw.Draw(sparks,'RGBA')
  for x,y,phase in lights:
   xx=x+5*math.sin(theta+phase); yy=y+3*math.cos(theta*.7+phase)
   a=round((8+11*(.5+.5*math.cos(theta+phase)))*strength)
   sd.ellipse((xx-1,yy-1,xx+1,yy+1),fill=(195,241,255,a))
  # Continuous lower-edge airflow luma; never obscures actual status/number.
  for band in range(2):
   pts=[(x,round(92-band*6+3*math.sin(x/93+theta+band*1.9))) for x in range(0,W+1,6)]
   sd.line(pts,fill=(*rgb,round((14-band*5)*strength)),width=1)
  frame=Image.alpha_composite(fog,sparks)
  frames.append(frame)
  atlas.alpha_composite(frame,((t%COLS)*W,(t//COLS)*H))
 path=HERE/f'{tier}-haze-atlas.png';atlas.save(path,optimize=True)
 # Review GIF is merely an inspected motion sample, not a deployable sprite file.
 scene=Image.open(BASE/'scenes'/f'{tier}-led-crop.webp').convert('RGBA').resize((W,H),Image.Resampling.LANCZOS)
 preview=[]
 for frame in frames:
  merged=Image.alpha_composite(scene,frame).convert('RGB').quantize(colors=96)
  preview.append(merged)
 gif=HERE/f'{tier}-motion-preview.gif'
 preview[0].save(gif,save_all=True,append_images=preview[1:],duration=125,loop=0,optimize=False)
 assert Image.open(path).getchannel('A').getextrema()[0]==0
 assert Image.open(gif).n_frames==N
 # Validate loop continuity against adjacent frames (including last->first).
 diffs=[]
 for i in range(N):
  a=frames[i].getchannel('A');b=frames[(i+1)%N].getchannel('A')
  diffs.append(ImageStat.Stat(ImageChops.difference(a,b)).mean[0])
 assert max(diffs)<12,(tier,max(diffs))
 manifest['tiers'][tier]={'atlas':path.name,'atlasSha256':sha(path),'atlasBytes':path.stat().st_size,
    'previewGif':gif.name,'gifSha256':sha(gif),'frameCount':N,'alpha':True,
    'colorRGB':list(rgb),'artisticIntensity':strength,'maxAlphaFrameDelta':round(max(diffs),3)}
 (HERE/'motion-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 print('MOTION_PASS',tier,'atlas',path.stat().st_size,'gif',gif.stat().st_size,'maxDelta',round(max(diffs),3))
