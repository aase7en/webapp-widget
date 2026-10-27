#!/usr/bin/env python3
"""UTHIAY 432x40 PM2.5 cinematic scene, 5x16 frame loops and independent weather/nature effects.

Art-only, never imply actual PM2.5/weather observation. Source photographs are user-supplied generated storyboards.
The source grids contain 12/10/10/10/10 genuine image cells. The 16-frame animations are authored from one
locked camera background with continuous transparent overlays, not falsely counted original cells.
"""
from __future__ import annotations
from PIL import Image, ImageOps, ImageDraw, ImageFilter, ImageEnhance, ImageChops, ImageStat
import numpy as np
from pathlib import Path
import hashlib,json,math,random,os,sys

ROOT=Path(__file__).resolve().parent
ORIGINALS=ROOT/'originals';SOURCES=ROOT/'source_frames';MASTERS=ROOT/'master';EFFECTS=ROOT/'effects';ATLASES=ROOT/'atlases';LOOPS=ROOT/'loops'
TIER_ORDER=['blue','green','yellow','orange','red']
# Grid boundaries were independently measured from the actual black row separators in each JPEG.
CONFIG={
 'blue': {'filename':'11D8EEE5-F7BA-433C-B47C-8226E57F61B6.jpeg','bands':[0,93,182,271,356,450,569],'fog':.09,'sun':1.0,'dust':.18,'wind':1.,'cloud':.65,'smoke':.04,'birds':1.,'rgb':(49,207,255)},
 'green':{'filename':'B813DE0D-2580-4812-82D3-B56625221C3A.jpeg','bands':[0,94,185,276,371,512],'fog':.16,'sun':.87,'dust':.26,'wind':.85,'cloud':.74,'smoke':.13,'birds':.8,'rgb':(71,238,178)},
 'yellow':{'filename':'6E2935B0-DEE8-433E-A3A0-2F248755024E.jpeg','bands':[0,98,196,300,401,512],'fog':.4,'sun':.59,'dust':.48,'wind':.63,'cloud':.85,'smoke':.42,'birds':.53,'rgb':(250,208,104)},
 'orange':{'filename':'D28AAB6C-51CB-4CC9-9D20-FDA23E0CF092.jpeg','bands':[0,94,186,281,376,512],'fog':.73,'sun':.34,'dust':.78,'wind':.3,'cloud':.95,'smoke':.69,'birds':.12,'rgb':(244,136,83)},
 'red':{'filename':'EB284AA1-DC81-4739-956B-912142A5CFBC.jpeg','bands':[0,94,186,280,375,512],'fog':1.0,'sun':.13,'dust':1.,'wind':.08,'cloud':1.,'smoke':1.,'birds':0.,'rgb':(188,91,79)}
}
W,H=1296,120;N=16;FRAME_MS=100;COLS=4
FX=['sunshafts','clouds','fog','smoke','dust','airflow','leaves','birds','water_reflections']
EXCLUSIVE=['light_rain']

def sha(p:Path):return hashlib.sha256(p.read_bytes()).hexdigest()
def ensure():
 for d in (ORIGINALS,SOURCES,MASTERS,EFFECTS,ATLASES,LOOPS):d.mkdir(parents=True,exist_ok=True)

def crop_source(tier:str):
 conf=CONFIG[tier];source=Path('/mnt/data')/conf['filename']
 # For Mac, allow local staged originals to serve as the exact source.
 if not source.is_file():source=ORIGINALS/conf['filename']
 im=Image.open(source).convert('RGB')
 assert im.width==1536 and im.height==conf['bands'][-1],tier
 outoriginal=ORIGINALS/conf['filename']
 if not outoriginal.exists():outoriginal.write_bytes(source.read_bytes())
 assert sha(source)==sha(outoriginal)
 frames=[]
 # Exclude black separator strips, with 7px X margins and 4-6px Y margins.
 xbounds=((6,760),(777,1532))
 for row,(y0,y1) in enumerate(zip(conf['bands'][:-1],conf['bands'][1:])):
  for col,(x0,x1) in enumerate(xbounds):
   ytop=y0+(7 if row>0 else 4)
   ybottom=y1-7
   f=im.crop((x0,ytop,x1,ybottom))
   assert f.width>700 and f.height>65,(tier,row,col,f.size)
   d=SOURCES/tier;d.mkdir(exist_ok=True)
   path=d/f'original-cell-{len(frames)+1:02d}.webp'
   f.save(path,'WEBP',quality=88,method=3)
   frames.append({'path':str(path.relative_to(ROOT)),'originalGridRow':row,'originalGridColumn':col,'pixels':list(f.size),'sha256':sha(path)})
 # Lock all 16 output backgrounds to one cropped source image. Geometry never changes.
 rowstart,rowstop=conf['bands'][:2]
 first=im.crop((9,rowstart+7,758,rowstop-6))
 master=ImageOps.fit(first,(W,H),method=Image.Resampling.LANCZOS,centering=(.5,.52))
 # Keep panorama contrasts from source; do not tone-map sensor values.
 mpath=MASTERS/f'{tier}.webp';master.save(mpath,'WEBP',quality=88,method=3)
 return master,frames,{'path':str(mpath.relative_to(ROOT)),'sha256':sha(mpath),'pixels':[W,H]}

def transparent():return Image.new('RGBA',(W,H),(0,0,0,0))
def new_draw():
 im=transparent();return im,ImageDraw.Draw(im,'RGBA')
def c_alpha(color,a):return (color[0],color[1],color[2],max(0,min(255,int(a))))
def over(a,b):return Image.alpha_composite(a,b)
def fade(im,alpha):
 if alpha>=1:return im
 a=im.getchannel('A').point(lambda x:int(x*alpha));out=im.copy();out.putalpha(a);return out

def layer_sunshafts(tier,k):
 cfg=CONFIG[tier];intensity=cfg['sun']
 out=transparent();soft=transparent();d=ImageDraw.Draw(soft,'RGBA')
 phase=k*math.tau/N
 sx,sy=110,18
 for j in range(7):
  center=180+j*125+12*math.sin(phase+j*.34)
  target=center+30*math.sin(phase+.6*j)
  width=30+j*3
  d.polygon(((sx,sy),(target-width,117),(target+width,117)),fill=c_alpha((255,246,181),40*intensity*(.75+.25*math.sin(phase+j*.7))))
 soft=soft.filter(ImageFilter.GaussianBlur(10));out=over(out,soft)
 # scattered warm glints near the actual sun; they breathe, never strobe.
 bright=transparent();bd=ImageDraw.Draw(bright,'RGBA')
 for j in range(3):
  spread=12+j*15+3*math.sin(phase+j)
  bd.ellipse((sx-spread,sy-spread*.55,sx+spread,sy+spread*.55),fill=c_alpha((255,222,149),24*intensity))
 bright=bright.filter(ImageFilter.GaussianBlur(14));return over(out,bright)

def layer_clouds(tier,k):
 """Recognizable, moving cumulus banks: 50-75px sweep, soft edges, cyclic end pose.

 Geometry stays locked in master; clouds alone drift and reshape slightly.
 """
 cfg=CONFIG[tier];phase=k*math.tau/N
 haze=transparent();soft=ImageDraw.Draw(haze,'RGBA')
 crisp=transparent();sharp=ImageDraw.Draw(crisp,'RGBA')
 light=(245,251,255) if tier in ('blue','green') else ((227,211,179) if tier=='yellow' else (173,147,131))
 shade=(65,97,126) if tier in ('blue','green') else ((116,101,92) if tier=='yellow' else (83,66,66))
 positions=((260,24,40),(472,35,47),(688,17,35),(925,24,45),(1114,32,37))
 opacity=0.80 if tier in ('blue','green') else min(0.94,.70+cfg['cloud']*.21)
 for ix,(base_x,base_y,sz) in enumerate(positions):
  drift=62*math.sin(phase+ix*.65) + 13*math.sin(2*phase+ix*.31)
  cx=base_x+drift
  cy=base_y+2.8*math.cos(phase+ix*.43)
  puff=((-.92,.13,.80,.47),(-.46,-.23,1.02,.57),(.03,-.34,1.01,.68),(.57,-.12,.86,.49),(.95,.16,.61,.37))
  for offsetx,offsety,rx,ry in puff:
   x=cx+offsetx*sz;y=cy+offsety*sz
   soft.ellipse((x-rx*sz*1.18,y-ry*sz*1.3,x+rx*sz*1.18,y+ry*sz*1.3),fill=c_alpha(shade,53*opacity))
   sharp.ellipse((x-rx*sz,y-ry*sz,x+rx*sz,y+ry*sz),fill=c_alpha(light,102*opacity))
 # Defined contours survive a downscale to 432x40 while cloud banks feather naturally.
 return over(haze.filter(ImageFilter.GaussianBlur(6)),crisp.filter(ImageFilter.GaussianBlur(2.9)))

def layer_fog(tier,k):
 cfg=CONFIG[tier];phase=k*math.tau/N
 img=transparent();d=ImageDraw.Draw(img,'RGBA')
 tone=(226,237,226) if tier in ('blue','green') else ((218,201,161) if tier=='yellow' else (132,107,92))
 for i in range(12):
  y=49+i*6.2+1.8*math.sin(phase+i*.42)
  alpha=(7+i*1.7)*cfg['fog']
  d.line((0,int(y),W,int(y)),fill=c_alpha(tone,alpha),width=8)
 for i in range(10):
  cx=105+i*128+23*math.sin(phase+i*.8)
  cy=62+i%4*12
  d.ellipse((cx-160,cy-22,cx+160,cy+22),fill=c_alpha(tone,30*cfg['fog']))
 return img.filter(ImageFilter.GaussianBlur(11))

def layer_smoke(tier,k):
 cfg=CONFIG[tier];strength=cfg['smoke'];phase=k*math.tau/N
 img=transparent();d=ImageDraw.Draw(img,'RGBA')
 # Only stylized broad upper-atmosphere diffuse haze. Never attaches smoke to a real factory/stack.
 tone=(141,143,140) if tier in ('blue','green') else ((128,113,104) if tier=='yellow' else (92,74,72))
 for stream in range(4):
  cx=560+stream*154
  for dot in range(10):
   y=63-dot*5+4*math.sin(phase+stream*.6+dot*.4)
   x=cx+dot*6+24*math.sin(phase+stream*1.1+dot*.31)
   r=14+dot*2.2
   d.ellipse((x-r,y-r*.35,x+r,y+r*.35),fill=c_alpha(tone,(20+dot*1)*strength))
 return img.filter(ImageFilter.GaussianBlur(10))

def layer_dust(tier,k):
 cfg=CONFIG[tier];strength=cfg['dust'];phase=k*math.tau/N
 out=transparent();glow=transparent();gd=ImageDraw.Draw(glow,'RGBA');d=ImageDraw.Draw(out,'RGBA')
 rng=random.Random(93841)
 tone=(197,236,244) if tier in ('blue','green') else ((252,208,127) if tier=='yellow' else (201,167,130))
 for i in range(100):
  x0=rng.uniform(150,W-35);y0=rng.uniform(6,H-6)
  orbit=rng.uniform(3,24)*(0.55+strength*.6)
  x=x0+orbit*math.sin(phase+rng.random()*math.tau)
  y=y0+2.5*math.cos(phase+rng.random()*math.tau)
  r=.45+(i%3)*.45
  alpha=(12+22*math.sin(phase+i*.17)**2)*strength
  d.ellipse((x-r,y-r,x+r,y+r),fill=c_alpha(tone,alpha))
  if i%7==0:gd.ellipse((x-4,y-4,x+4,y+4),fill=c_alpha(tone,alpha*.5))
 return over(glow.filter(ImageFilter.GaussianBlur(3)),out)

def layer_airflow(tier,k):
 cfg=CONFIG[tier];strength=cfg['wind'];phase=k*math.tau/N
 img=transparent();glow=transparent();gd=ImageDraw.Draw(glow,'RGBA');d=ImageDraw.Draw(img,'RGBA')
 for lane in range(4):
  ybase=89+lane*6.2
  # Bright travelling segments, cyclic at 16 frames, with no hard resets at wrap.
  for m in range(-2,8):
   period=258+lane*28
   start=42+m*period+phase*period/math.tau+lane*32
   length=100+lane*21
   pts=[]
   for j in range(0,length,4):
    x=start+j
    if x<0 or x>=W:continue
    y=ybase+3.2*math.sin(x/97+lane*.7+phase*.4)
    pts.append((x,y))
   if len(pts)>3:
    gd.line(pts,fill=c_alpha((68,228,253),40*strength),width=4)
    d.line(pts,fill=c_alpha((196,255,247),90*strength),width=1)
 return over(glow.filter(ImageFilter.GaussianBlur(5)),img)

def leaf_polygon(cx,cy,rotation,sz):
 return [(cx+(-sz*math.cos(rotation)-sz*.28*math.sin(rotation)),cy+(-sz*math.sin(rotation)+sz*.28*math.cos(rotation))),
 (cx+sz*.6*math.cos(rotation),cy+sz*.6*math.sin(rotation)),
 (cx+(-sz*.4*math.cos(rotation)+sz*.45*math.sin(rotation)),cy+(-sz*.4*math.sin(rotation)-sz*.45*math.cos(rotation)))]

def layer_leaves(tier,k):
 """Foreground foliage anchored to visibly bending twigs; no whole-scene translation."""
 phase=k*math.tau/N
 img=transparent();d=ImageDraw.Draw(img,'RGBA')
 bark=(49,79,43) if tier in ('blue','green') else (85,70,47)
 leaf=(38,122,64) if tier in ('blue','green') else ((139,114,52) if tier=='yellow' else (92,72,50))
 edge=(137,221,117) if tier in ('blue','green') else (191,149,87)
 # Nearby vegetation already exists in master at top-left and bottom corners.
 clusters=((8,6,1,1.0),(83,3,1,.75),(32,117,-1,.97),(1220,114,-1,-.85),(1289,12,1,-.95))
 for group,(ax,ay,direction,scale) in enumerate(clusters):
  wave=math.sin(phase+group*.61)
  sway=9.5*wave*abs(scale)+3*math.sin(2*phase+group*.33)
  for branch in range(6):
   angle=(branch-2.5)*.43
   length=18+branch%3*7
   ex=ax+scale*(length*math.sin(angle)+sway*(.65+branch*.08))
   ey=ay+direction*(length*.85+3.5*math.sin(phase+branch*.7+group))
   d.line((ax,ay,ax+scale*7,ay+direction*9,ex,ey),fill=c_alpha(bark,170),width=2)
   for side in (-1,1):
    off=8*side+4*math.sin(phase+branch*.52+side)
    lx=ex+off
    ly=ey+direction*side*5
    theta=angle+side*.8+.35*wave
    size=8+branch%3*2.4
    poly=leaf_polygon(lx,ly,theta,size)
    d.polygon(poly,fill=c_alpha(leaf,165),outline=c_alpha(edge,130))
 return img.filter(ImageFilter.GaussianBlur(.26))

def layer_birds(tier,k):
 """Birds fly THROUGH, flap visibly, and fade at loop seam; never 'mosquito' arcs."""
 cfg=CONFIG[tier];im=transparent();d=ImageDraw.Draw(im,'RGBA')
 # Even smoky states may contain a distant bird; keep illustration independent of PM safety.
 strength=max(.54,cfg['birds'])
 t=k/N
 # One larger near bird plus one smaller distant follower. Large silhouette survives 3x->LED.
 for which in range(2):
  progress=(t+(.21 if which else 0))%1
  envelope=min(1,progress*9,(1-progress)*9)
  alpha=int(245*envelope*strength*(1 if which==0 else .8))
  if alpha<=2:continue
  x=(278 if which==0 else 210)+progress*(680 if which==0 else 590)
  y=(30 if which==0 else 17)+4.5*math.sin(progress*math.tau+which*.64)
  scale=1 if which==0 else .66
  # 2 full wing cycles in 16 authored frames. Wing tips move about 23px,
  # not sub-pixel arcs which previously resembled mosquitoes at LED size.
  flap=math.sin(4*math.pi*progress+which*.45)
  span=33*scale
  lift=(15+16*flap)*scale
  ink=(16,35,45,alpha) if tier in ('blue','green') else (38,35,37,alpha)
  rim=(223,238,233,int(alpha*.44)) if tier in ('blue','green') else (227,187,146,int(alpha*.38))
  left=[(x-3*scale,y),(x-11*scale,y-5*scale),
        (x-span*.84,y-lift*.79),(x-span,y-lift),
        (x-span*.82,y-lift+6*scale),(x-12*scale,y+2*scale)]
  right=[(x+3*scale,y),(x+11*scale,y-5*scale),
         (x+span*.84,y-lift*.79),(x+span,y-lift),
         (x+span*.82,y-lift+6*scale),(x+12*scale,y+2*scale)]
  d.polygon(left,fill=ink);d.polygon(right,fill=ink)
  d.line(left[2:5],fill=rim,width=max(1,round(1.5*scale)))
  d.line(right[2:5],fill=rim,width=max(1,round(1.5*scale)))
  d.ellipse((x-8*scale,y-3.8*scale,x+8*scale,y+4.6*scale),fill=ink)
  # small head, pointed tail and beak reinforce an actual bird silhouette
  d.ellipse((x+6*scale,y-3.8*scale,x+11*scale,y+1.2*scale),fill=ink)
  d.polygon([(x+11*scale,y-2*scale),(x+17*scale,y),(x+10*scale,y+1*scale)],fill=ink)
  d.polygon([(x-6*scale,y),(x-19*scale,y-6*scale),(x-13*scale,y+3*scale),
             (x-18*scale,y+8*scale)],fill=ink)
 return im

def layer_water_reflections(tier,k):
 """Specular streaks and ripples tracked to the master image's lower 25px water."""
 phase=k*math.tau/N
 rgb=(185,244,255) if tier in ('blue','green') else ((255,218,149) if tier=='yellow' else (242,177,139))
 glow=transparent();g=ImageDraw.Draw(glow,'RGBA')
 lines=transparent();d=ImageDraw.Draw(lines,'RGBA')
 rng=random.Random(2145)
 # Repeated horizontal light bands are anchored in water y>=93 rather than sky.
 for patch,origin in enumerate((160,485,805,1095)):
  intensity=.88 if tier in ('blue','green') else .64
  wobble=19*math.sin(phase+patch*.72)
  for j in range(15):
   cx=origin+rng.uniform(-118,118)+wobble
   y=96+(j*7+patch*4)%23+1.8*math.sin(phase*2+j*.57)
   wide=13+rng.uniform(0,64)
   bright=(.45+.55*math.sin(phase+j*.68+patch*.4)**2)*intensity
   d.line((cx-wide*.5,y,cx+wide*.5,y),fill=c_alpha(rgb,70+110*bright),width=2 if j%3 else 3)
   if j%4==0:
    g.ellipse((cx-35,y-4,cx+35,y+4),fill=c_alpha(rgb,32+70*bright))
    d.line((cx-7,y-2,cx+9,y-2),fill=c_alpha((248,255,255),115*bright),width=2)
 # Subtle coherent long blue shimmer runs along shoreline at bottom of frame.
 for i in range(7):
  y=103+i*2.2
  for j in range(5):
   x=70+j*254+23*math.sin(phase+i*.6+j)
   wide=46+17*math.sin(phase+j*.8+i*.2)**2
   d.line((x,y,x+wide,y),fill=c_alpha(rgb,45+50*math.sin(phase+i+j)**2),width=1)
 return over(glow.filter(ImageFilter.GaussianBlur(5)),lines.filter(ImageFilter.GaussianBlur(.35)))

def layer_light_rain(tier,k):
 # WEATHER-ONLY. Do not activate from PM severity or model-fabricated data.
 phase=k/N;im=transparent();d=ImageDraw.Draw(im,'RGBA')
 rng=random.Random(81427)
 for j in range(108):
  x0=rng.uniform(0,W);y0=rng.uniform(-H,H)
  x=(x0+31*phase)%W
  y=(y0+H*phase)%H
  l=7+rng.uniform(0,7)
  d.line((x,y,x-3.5,y+l),fill=(173,228,255,round(22+rng.random()*38)),width=1)
 return im.filter(ImageFilter.GaussianBlur(.28))

FX_FUNC={name:globals()['layer_'+name] for name in FX+EXCLUSIVE}

def save_atlas(frames:list[Image.Image],file:Path,format='WEBP',quality=86):
 assert len(frames)==N
 atlas=Image.new('RGBA',(W*COLS,H*4),(0,0,0,0))
 for i,frame in enumerate(frames):atlas.alpha_composite(frame,((i%COLS)*W,(i//COLS)*H))
 atlas.save(file,format,quality=quality,method=2,lossless=False)
 return {'path':str(file.relative_to(ROOT)),'sha256':sha(file),'pixels':[W*COLS,H*4],'tilePixels':[W,H],'grid':[4,4],'frameCount':16,'bytes':file.stat().st_size}

def write_preview(tier,frames:list[Image.Image]):
 assert len(frames)==N
 dest=LOOPS/f'{tier}-16f.webp'
 # Animated webp is convenient to inspect; Chrome Canvas renderer is recommended for 60FPS crossfade.
 frames[0].save(dest,'WEBP',save_all=True,append_images=frames[1:],duration=FRAME_MS,loop=0,quality=84,method=3)
 check=Image.open(dest)
 assert getattr(check,'n_frames',0)==16,(tier,getattr(check,'n_frames',0))
 return {'path':str(dest.relative_to(ROOT)),'sha256':sha(dest),'frameCount':16,'durationMs':FRAME_MS,'pixels':[W,H],'bytes':dest.stat().st_size}

def paint(tier,base):
 data={};layers={}
 for kind in FX:
  layers[kind]=[FX_FUNC[kind](tier,i) for i in range(N)]
  directory=EFFECTS/kind;directory.mkdir(exist_ok=True)
  data[kind]=save_atlas(layers[kind],directory/f'{tier}-16f.webp')
 # Weather-only rain overlay, stored separately and NEVER automatically triggered by PM band.
 rain=[layer_light_rain(tier,i) for i in range(N)]
 (EFFECTS/'light_rain').mkdir(exist_ok=True)
 data['light_rain']=save_atlas(rain,EFFECTS/'light_rain'/f'{tier}-weather-16f.webp')
 composites=[];rgba=base.convert('RGBA')
 for k in range(N):
  out=rgba.copy()
  # soft weather and nature composition; layer ordering intentionally fixed.
  for name in ('sunshafts','clouds','fog','smoke','water_reflections','airflow','dust','birds','leaves'):
   out=over(out,layers[name][k])
  composites.append(out.convert('RGB'))
 loop=write_preview(tier,composites)
 # Extract full-size frame 0 & frame 8 for objective visual checks.
 qa_dir=ROOT/'qa';qa_dir.mkdir(exist_ok=True)
 for idx in (0,8):composites[idx].save(qa_dir/f'{tier}-frame-{idx+1:02d}.webp','WEBP',quality=88,method=3)
 return data,loop,composites

def main():
 ensure()
 manifest={'schema':3,'kind':'UTH_LUXURY_PM25_ENVIRONMENT_ANIMATION','assetStatus':'REVIEW_ONLY_NOT_PRODUCTION',
 'repo':'aase7en/webapp-widget','sourceProvenance':'Five images explicitly supplied in ChatGPT conversation, 2026-10-27',
 'canvas':{'logicalWidth':432,'logicalHeight':40,'renderScale':3,'physicalFrameWidth':W,'physicalFrameHeight':H},
 'animation':{'framesPerTier':16,'frameMs':FRAME_MS,'fps':1000/FRAME_MS,'gridColumns':COLS,'gridRows':4,'loop':True},
 'important':['The user-supplied source contact sheets have 12 blue cells and 10 each of green/yellow/orange/red, NOT 16 original cells each.',
  'We preserve every original cell, then author exactly 16 animation frames using a single locked scene master and independent procedural transparent effects.',
  'Original fake grids cannot be treated as temporally coherent camera footage; no rigid background reframe, no changing horizon.',
  'All visual scenes are artistic illustrations, never measured PM2.5/precipitation levels; PM category and rain activation must use verified external data.',
  'Rain layer is disabled by default and only meant for verified Weather precipitation events, not tied to PM2.5 severity.',
  'Frames do not contain a clock, measured numbers, risk wording, or hospital-specific identifying text; DOM overlays should use verified data.'],
 'tiers':{}}
 contact=Image.new('RGB',(W,5*(H+18)),(5,13,26));draw=ImageDraw.Draw(contact)
 for j,tier in enumerate(TIER_ORDER):
  base,originals,meta=crop_source(tier)
  layers,loop,composites=paint(tier,base)
  manifest['tiers'][tier]={'sourceFile':CONFIG[tier]['filename'],'originalSHA256':sha(ORIGINALS/CONFIG[tier]['filename']),
      'sourceFrameCount':len(originals),'sourceOriginalCells':originals,'master':meta,'effects':layers,'loop':loop,
      'riskArtParameters':{k:CONFIG[tier][k] for k in ('sun','dust','fog','smoke','wind','cloud','birds')}}
  draw.text((10,j*(H+18)+4),tier.upper()+' — locked-scene 16f illustrative PM tier',fill='white')
  contact.paste(composites[0],(0,j*(H+18)+18))
  print('COMPLETE',tier,'source',len(originals),'AUTHORED',loop['frameCount'],'effects',len(layers),'preview bytes',loop['bytes'],flush=True)
 contact_path=ROOT/'review-contact.webp';contact.save(contact_path,'WEBP',quality=86,method=3)
 manifest['contactSheet']={'path':str(contact_path.relative_to(ROOT)),'sha256':sha(contact_path)}
 (ROOT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 print('PACKAGE_READY',ROOT,'sizeMB',round(sum(f.stat().st_size for f in ROOT.rglob('*') if f.is_file())/1e6,2),flush=True)
if __name__=='__main__':main()
