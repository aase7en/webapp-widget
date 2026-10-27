#!/usr/bin/env python3
"""Source-derived, non-generative visual proof: source atmosphere, locked architecture.

Always composes from ONE fixed blue frame. No floating particle/bird/leaf assets.
Render 66 lossless source-composite frames, contact proof and animation.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageChops, ImageStat
import numpy as np
import json, hashlib, math
HERE=Path(__file__).resolve().parents[1]
PKG=HERE.parent/'frame-first-v1'/'blue'/'frames'
KEYS=[Image.open(PKG/f'frame-{i:02}.webp').convert('RGB') for i in range(1,13)]
SIZE=(1296,120)
assert all(im.size==SIZE for im in KEYS)
MASTER_IDX=4    # original frame 04, 1-based
BASE=KEYS[MASTER_IDX-1].copy()
BASEARR=np.asarray(BASE,dtype=np.float32)
W,H=SIZE
def poly_mask(points,blur=0):
 m=Image.new('L',SIZE,0);p=ImageDraw.Draw(m);p.polygon(points,fill=255)
 return np.asarray(m.filter(ImageFilter.GaussianBlur(blur)),dtype=np.float32)/255.
def gaussian(x,y,cx,cy,sx,sy):
 return np.exp(-(((x-cx)/sx)**2+((y-cy)/sy)**2)*.5)
xx,yy=np.meshgrid(np.arange(W,dtype=np.float32),np.arange(H,dtype=np.float32))
# Sky regions are hand-selected based on visual review of the original art. Buildings,
# bridge, temple spire, shore and skyline are permanently excluded by construction.
sky=np.zeros((H,W),dtype=np.float32)
sky_shapes=[
 [(385,0),(754,0),(746,15),(725,27),(694,39),(666,45),(612,49),(553,50),(516,44),(486,39),(451,37),(417,23)],
 [(928,0),(1084,0),(1065,15),(1042,23),(1022,30),(972,35),(947,22)],
 [(235,0),(358,0),(355,12),(280,12),(240,6)],
]
for polygon in sky_shapes: sky=np.maximum(sky,poly_mask(polygon,3.5))
# Keep sky influence moderate and coherent. The source-derived whole-cloud
# transitions are smooth, never globally moving architecture.
SKY_ALPHA=(.48*sky*gaussian(xx,yy,630,18,260,67)+.32*sky*gaussian(xx,yy,995,12,115,35)).astype(np.float32)
# Water begins at the shore; feather in below y=94. Render source ripple variation,
# but NEVER alter the shoreline or bridge structure.
water_y=np.clip((yy-94)/12,0,1)
WATER_ALPHA=(.52*water_y*gaussian(xx,yy,670,109,810,29)).astype(np.float32)
# Soft seasonal haze around mountains, still only luminosity changes (no geometry).
HAZE_ALPHA=(.09*gaussian(xx,yy,615,72,195,13)).astype(np.float32)
HAZE_ALPHA[yy<53]=0
HAZE_ALPHA[yy>82]=0
# Sun glow modulation on the locked master is color/light only (trees stay fixed).
SUN_GLOW=gaussian(xx,yy,132,25,76,39).astype(np.float32)
# PROTECTED regions are entirely zero in all transition masks.
landmarks={
 'hospital':(182,17,389,87),'bridge':(474,71,718,93),
 'skyline':(768,12,917,88),'temple':(1072,13,1256,89),
}
for left,top,right,bottom in landmarks.values():
 SKY_ALPHA[top:bottom,left:right]=0
 WATER_ALPHA[top:bottom,left:right]=0
 HAZE_ALPHA[top:bottom,left:right]=0
 SUN_GLOW[top:bottom,left:right]=0
# Additional exact no-motion band on horizon.
SKY_ALPHA[yy>=70]=0
WATER_ALPHA[yy<94]=0
SUN_GLOW[:,180:]=0
for name,m in [('sky',SKY_ALPHA),('water',WATER_ALPHA),('haze',HAZE_ALPHA),('sun',SUN_GLOW)]:
 assert np.isfinite(m).all() and m.max()>0,name

# Loop uses 12 source images forward then reversed to prevent a 12->1 reset.
# 3 in-betweens each key transition, 66 output frames.
path=list(range(12))+list(range(10,0,-1))
assert len(path)==22 and path[0]==0 and path[-1]==1
out_frames=[]
preview_indices=[0,12,24,36,48,60]
for pos in range(66):
 i=pos//3; t=(pos%3)/3
 ia=path[i];ib=path[(i+1)%len(path)]
 a=np.asarray(KEYS[ia],dtype=np.float32)
 b=np.asarray(KEYS[ib],dtype=np.float32)
 derived=(1-t)*a+t*b
 phase=pos*math.tau/66
 # Camera and architecture are LOCKED to frame 04. Environmental color changes
 # are allowed only inside conservative sky/water masks.
 alpha=np.maximum(SKY_ALPHA,WATER_ALPHA)
 result=BASEARR*(1-alpha[:,:,None])+derived*alpha[:,:,None]
 # tiny haze luminance variation from source, never an independently drawn object.
 haze=(np.mean(derived,axis=2)-np.mean(BASEARR,axis=2))*HAZE_ALPHA
 result+=haze[:,:,None]*.42
 # smooth solar lux fluctuation (brightness only); not a moving sun graphic.
 sun_strength=(math.sin(phase-.6)+1)/2
 result+=SUN_GLOW[:,:,None]*sun_strength*9
 result=np.uint8(np.clip(np.rint(result),0,255))
 frame=Image.fromarray(result,'RGB')
 out_frames.append(frame)
 if pos in preview_indices:
  frame.save(HERE/'qa'/f'blue-frame-{pos:02}.png')
# Exact lock test protects architectural content before any lossy WebP encode.
ref=np.asarray(out_frames[0])
for f in out_frames[1:]:
 v=np.asarray(f)
 for label,(x0,y0,x1,y1) in landmarks.items():
  assert np.array_equal(v[y0:y1,x0:x1],ref[y0:y1,x0:x1]),('STRUCTURE_MOVED',label)
# All pixels outside active masks + solar luminosity should be constant, too.
outside=(SKY_ALPHA<=0)&(WATER_ALPHA<=0)&(HAZE_ALPHA<=0)&(SUN_GLOW<=0)
assert outside.any() and not outside.all(), 'invalid protection mask'
for f in out_frames[1:]:
 assert np.array_equal(np.asarray(f)[outside],ref[outside]),'LOCKED SCENE MOVED'

# Animated proof files. The master screenshot at frame 00 is provided for pause mode.
out_frames[0].save(HERE/'blue-still.webp','WEBP',quality=93,method=5)
out_frames[0].save(HERE/'qa'/'blue-first-pixel-locked.png')
out_frames[33].save(HERE/'qa'/'blue-mid-pixel-locked.png')
out_frames[0].save(HERE/'blue-locked-66f.webp','WEBP',save_all=True,
 append_images=out_frames[1:],duration=90,loop=0,quality=88,method=5)
# Contact sheet of six sequential phases, no AI generated decorations.
cols,rows,scale,gutter=3,2,.5,22
fw,fh=int(W*scale),int(H*scale)
contact=Image.new('RGB',(cols*fw,rows*(fh+gutter)),(3,20,37))
dr=ImageDraw.Draw(contact)
for n,idx in enumerate(preview_indices):
 x=(n%cols)*fw;y=(n//cols)*(fh+gutter)
 contact.paste(out_frames[idx].resize((fw,fh),Image.Resampling.LANCZOS),(x,y+gutter))
 dr.text((x+8,y+3),f'LOCKED FRAME {idx+1:02}/66',fill=(220,246,253))
contact.save(HERE/'qa'/'blue-locked-contact-6views.webp','WEBP',quality=90,method=5)
# Mask proof: blue sky / teal river / gold solar / coral haze, outlines protect landmarks.
maskview=BASE.convert('RGB').copy()
layer=Image.new('RGBA',SIZE,(0,0,0,0))
can=ImageDraw.Draw(layer)
for y in range(H):
 for x in range(W):
  if SKY_ALPHA[y,x]>.03:can.point((x,y),fill=(5,209,255,85))
  elif WATER_ALPHA[y,x]>.08:can.point((x,y),fill=(7,238,174,105))
  elif SUN_GLOW[y,x]>.30 and x<180:can.point((x,y),fill=(255,198,50,90))
maskview=Image.alpha_composite(maskview.convert('RGBA'),layer)
d=ImageDraw.Draw(maskview)
for name,bounds in landmarks.items():
 d.rectangle(bounds,outline=(255,80,126,255),width=2)
maskview.convert('RGB').save(HERE/'qa'/'blue-locked-mask-proof.webp','WEBP',quality=91,method=4)

# Measured frame differences: structural boxes are precisely pixel equal in constructed frames.
def roi_mean(imgA,imgB,roi):
 arrA=np.asarray(imgA).astype(np.int16)
 arrB=np.asarray(imgB).astype(np.int16)
 delta=np.mean(np.abs(arrA-arrB),axis=2)
 return round(float(delta[roi].mean()),3)
stats={
 'sourceFrames':12,'renderedFrames':66,'fpsNominal':11.11,
 'masterIndex':MASTER_IDX,
 'masterFile':str(PKG/'frame-04.webp'),
 'sourceFrameSha256':[hashlib.sha256((PKG/f'frame-{i:02}.webp').read_bytes()).hexdigest() for i in range(1,13)],
 'colorMode':'owner-source-derived-region-blends', 'geometry':'pixel-locked',
 'motionMasks':{'sky':round(float(SKY_ALPHA.max()),3),'water':round(float(WATER_ALPHA.max()),3)},
 'protectedPixelCount':int(outside.sum()),'pixelTotal':W*H,
 'landmarkBoxes':{k:list(v) for k,v in landmarks.items()},
 'nonstaticSkyMeanDiff':roi_mean(out_frames[0],out_frames[33],SKY_ALPHA>.035),
 'nonstaticWaterMeanDiff':roi_mean(out_frames[0],out_frames[33],WATER_ALPHA>.08),
 'staticRegionExact':True,
 'outputWebPBytes':(HERE/'blue-locked-66f.webp').stat().st_size,
 'provenance':'locked-scene-v3 original owner collage -> native cells -> frame-first-v1 blue frames',
 'mode':'DEMO ONLY. No production write, no added birds/leaves/particles.',
}
(HERE/'manifest.json').write_text(json.dumps(stats,indent=2,ensure_ascii=False)+'\n')
print('BLUE_LOCKED_VISUAL_BUILD_PASS',json.dumps({
 k:stats[k] for k in ['renderedFrames','protectedPixelCount','pixelTotal','nonstaticSkyMeanDiff','nonstaticWaterMeanDiff','outputWebPBytes']
}))
