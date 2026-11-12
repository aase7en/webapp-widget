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
 c=CONFIG[tier];phase=k*math.tau/N
 img=transparent();d=ImageDraw.Draw(img,'RGBA')
 seed=random.Random(24027)
 color=(239,244,254) if tier in ('blue','green') else ((204,196,175) if tier=='yellow' else (117,103,94))
 # Clouds stay in upper 40% of panorama, drifting cyclically while buildings stay fixed.
 for cluster in range(13):
  cx=275+cluster*95+14*math.sin(phase+cluster*.37)
  cy=22+12*math.sin(cluster*1.3)
  r=20+seed.randint(0,15)
  alpha=(12+22*c['cloud'])*(0.8+.2*math.cos(phase+cluster*.9))
  for q in range(5):
   ox=(q-2)*r*.51;oy=math.sin(q*1.2+cluster)*6
   d.ellipse((cx+ox-r*.7,cy+oy-r*.3,cx+ox+r*.7,cy+oy+r*.3),fill=c_alpha(color,alpha))
 return img.filter(ImageFilter.GaussianBlur(9))

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
 phase=k*math.tau/N
 cfg=CONFIG[tier];img=transparent();d=ImageDraw.Draw(img,'RGBA')
 # Vary only foliage overlay; no long rigid translation of the shoreline.
 rng=random.Random(61721)
 for i in range(42):
  side=i%2
  x0=rng.uniform(0,138) if side==0 else rng.uniform(W-112,W)
  y0=rng.uniform(0,26) if i%3 else rng.uniform(96,H)
  theta=(i*.37)+.27*math.sin(phase+i*.52)
  sz=rng.uniform(2.2,6.5)
  alpha=80 if tier in ('blue','green') else 55
  color=(31,121,67) if tier in ('blue','green') else ((111,99,48) if tier=='yellow' else (74,68,50))
  d.polygon(leaf_polygon(x0+1.6*math.sin(phase+i),y0,theta,sz),fill=c_alpha(color,alpha),outline=c_alpha((173,207,96),40))
 return img

def layer_birds(tier,k):
 c=CONFIG[tier];strength=c['birds'];phase=k*math.tau/N
 im=transparent();d=ImageDraw.Draw(im,'RGBA')
 if strength<.05:return im
 for bird in range(5):
  x=520+bird*63+12*math.sin(phase+bird*.8)
  y=27+bird%3*4+2*math.cos(phase+bird*.7)
  span=3.3+bird%3
  wing=2.2*math.sin(phase*2+bird*.8)
  color=c_alpha((14,36,47) if tier in ('blue','green') else (53,50,43),100*strength)
  d.arc((x-span,y-wing,x,y+span),205,355,fill=color,width=1)
  d.arc((x,y-wing,x+span,y+span),185,340,fill=color,width=1)
 return im.filter(ImageFilter.GaussianBlur(.25))

def layer_water_reflections(tier,k):
 c=CONFIG[tier];phase=k*math.tau/N
 im=transparent();d=ImageDraw.Draw(im,'RGBA')
 rgb=(111,225,248) if tier in ('blue','green') else ((248,192,112) if tier=='yellow' else (204,137,100))
 rng=random.Random(2145)
 for i in range(58):
  x=rng.uniform(20,W-20);y=rng.uniform(94,119)
  width=rng.uniform(5,45)
  alpha=(10+18*math.sin(phase+i*.45)**2)
  d.line((x,y,x+width,y),fill=c_alpha(rgb,alpha),width=1)
 return im.filter(ImageFilter.GaussianBlur(.4))

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
