#!/usr/bin/env python3
"""Generate GREEN/YELLOW/ORANGE/RED locked-master source-derived animation.

Use real normalized 10 owner cells/tier. Static architecture is pixel-locked;
only feathered sky, water, existing haze/light and limited foliage luminance change.
No novel scene generation and no floating bird/leaf/particle sprites.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageStat
from scipy.ndimage import map_coordinates
import numpy as np, json, hashlib, math, argparse
from smoke_atmosphere import apply as apply_emissions, protected_structure, stack_field, red_haze, red_suspended_dust

HERE=Path(__file__).resolve().parents[1]
SOURCE=HERE.parent/'frame-first-v1'
W,H=1296,120
SETTINGS={
 'green':  dict(master=5,cloud=26,water=2.35,waterY=.65,skyGain=.78,waterGain=.76,sun=8.0,
               hospital=(150,0,420,90),bridge=(510,70,685,98),skyline=(720,8,990,92),temple=(1035,0,1255,97),bank=97,
               clouds=[[(415,0),(745,0),(730,17),(692,34),(650,47),(601,53),(546,48),(481,32),(440,24)],
                       [(956,0),(1101,0),(1064,18),(1027,26),(973,23)]],smoke=False),
 'yellow': dict(master=4,cloud=19,water=2.12,waterY=.55,skyGain=.68,waterGain=.70,sun=5.0,
               hospital=(130,0,400,91),bridge=(475,73,724,98),skyline=(682,11,975,94),temple=(1020,0,1259,97),bank=97,
               clouds=[[(400,0),(736,0),(715,14),(680,30),(623,50),(572,44),(526,34),(451,27)],
                       [(959,0),(1092,0),(1070,16),(1011,28),(976,21)]],smoke=False),
 'orange': dict(master=3,cloud=17,water=2.05,waterY=.5,skyGain=.60,waterGain=.65,sun=4.2,
               hospital=(130,0,400,90),bridge=(476,74,722,98),skyline=(680,12,977,94),temple=(1018,0,1260,97),bank=98,
               clouds=[[(400,0),(733,0),(715,17),(685,36),(620,47),(571,43),(512,30),(451,23)],
                       [(953,0),(1098,0),(1074,19),(1010,29),(968,21)]],smoke=True),
 'red':    dict(master=4,cloud=15,water=1.80,waterY=.42,skyGain=.53,waterGain=.58,sun=3.2,
               hospital=(127,0,401,90),bridge=(475,75,721,98),skyline=(684,11,981,95),temple=(1018,0,1264,98),bank=99,
               clouds=[[(398,0),(735,0),(714,17),(674,37),(620,47),(565,39),(518,29),(458,18)],
                       [(962,0),(1101,0),(1074,17),(1012,29),(970,18)]],smoke=True),
}
def mask_polygon(vertices,blur):
 p=Image.new('L',(W,H),0)
 ImageDraw.Draw(p).polygon(vertices,fill=255)
 return np.asarray(p.filter(ImageFilter.GaussianBlur(blur)),dtype=np.float32)/255.
def bell(xx,yy,x,y,sx,sy):
 return np.exp(-.5*(((xx-x)/sx)**2+((yy-y)/sy)**2)).astype(np.float32)
def warp(arr,dx,dy,xx,yy):
 coords=[yy+dy,xx+dx]
 return np.stack([map_coordinates(arr[:,:,i],coords,order=1,mode='nearest',prefilter=False)
                  for i in range(3)],axis=2).astype(np.float32)
def difference(a,b,region):
 diff=np.abs(a.astype(np.int16)-b.astype(np.int16)).mean(axis=2)
 return round(float(diff[region].mean()),3)
def run(tier):
 cfg=SETTINGS[tier]
 dest=HERE/tier; proof=dest/'qa'; proof.mkdir(exist_ok=True,parents=True)
 src=SOURCE/tier/'frames'
 files=sorted(src.glob('frame-*.webp'))
 assert len(files)==10 and [f.name for f in files]==[f'frame-{i:02}.webp' for i in range(1,11)],tier
 originals=[Image.open(f).convert('RGB') for f in files]
 assert all(im.size==(W,H) for im in originals),(tier,[im.size for im in originals])
 hashes=[hashlib.sha256(f.read_bytes()).hexdigest() for f in files]
 base=np.asarray(originals[cfg['master']-1],dtype=np.float32)
 xx,yy=np.meshgrid(np.arange(W,dtype=np.float32),np.arange(H,dtype=np.float32))
 box={name:cfg[name] for name in ('hospital','bridge','skyline','temple')}
 sky=np.zeros((H,W),dtype=np.float32)
 for vertices in cfg['clouds']:
  sky=np.maximum(sky,mask_polygon(vertices,4))
 sky=(cfg['skyGain']*sky*bell(xx,yy,654,16,390,72)).clip(0,.85)
 sky[yy>=67]=0
 river=np.clip((yy-cfg['bank'])/12,0,1)*cfg['waterGain']*bell(xx,yy,630,109,930,30)
 river[yy<cfg['bank']]=0
 haze=.11*bell(xx,yy,620,76,240,12)
 haze[(yy<62)|(yy>89)]=0
 # Fixed sun is brightened/dimmed but never translated.
 sun=bell(xx,yy,114,21,78,42);sun[:,185:]=0
 # Limited foliage canopy shimmer, light modulation only, NOT translated leaves.
 canopy=.45*bell(xx,yy,458,76,37,8)+.30*bell(xx,yy,995,77,26,9)
 canopy[(yy<65)|(yy>89)]=0
 # On hazier scenes diffuse EXISTING smoky cloud textures above stacks;
 # never animate the physical smokestacks themselves.
 smoke=np.zeros((H,W),dtype=np.float32)
 for l,t,r,b in box.values():
  for mask in (sky,river,haze,sun,canopy,smoke):
   mask[t:b,l:r]=0
 # Restrict all water to water polygon below shoreline.
 river[yy<cfg['bank']]=0
 active=np.maximum.reduce([sky,river,haze,sun,canopy,smoke])>0
 smoke_allowed=np.zeros((H,W),dtype=bool)
 if cfg['smoke']:
  # The union is a conservative TEST mask; physical landmarks remain protected.
  for step in range(54):
   smoke_allowed|=(stack_field(tier,step)>.0001)
   if tier=='red':
    smoke_allowed|=(red_haze(step)>.0001)
    smoke_allowed|=(red_suspended_dust(step)>.0001)
  active|=smoke_allowed
 assert active.any() and (~active).any()
 for name,mask in [('sky',sky),('river',river),('sun',sun)]:
  assert mask.max()>.2,name
 frames=[];first_background=None
 source_path=list(range(10))+list(range(8,0,-1))
 assert len(source_path)==18
 total=54
 for i in range(total):
  path_i=i//3;t=(i%3)/3
  a=np.asarray(originals[source_path[path_i]],dtype=np.float32)
  b=np.asarray(originals[source_path[(path_i+1)%18]],dtype=np.float32)
  derived=(1-t)*a+t*b
  phase=i*math.tau/total
  cloud_dx=cfg['cloud']*math.sin(phase+.21)+3.3*np.sin(2*phase+xx/220)
  cloud_dy=1.65*np.sin(phase+xx/310)
  cloud_img=warp(base,-cloud_dx,-cloud_dy,xx,yy)*.76+warp(derived,-.72*cloud_dx,-.56*cloud_dy,xx,yy)*.24
  water_dx=(cfg['water']*np.sin(1.35*phase+(yy-cfg['bank'])*.15)
            +.84*np.sin(2*phase-xx*.027+(yy-cfg['bank'])*.055))
  water_dy=cfg['waterY']*np.sin(1.53*phase-xx*.020+(yy-cfg['bank'])*.075)
  water_img=warp(base,-water_dx,-water_dy,xx,yy)*.54+warp(derived,-.82*water_dx,-.80*water_dy,xx,yy)*.46
  output=base*(1-sky[:,:,None])+cloud_img*sky[:,:,None]
  output=output*(1-river[:,:,None])+water_img*river[:,:,None]
  diff=derived.mean(axis=2)-base.mean(axis=2)
  output+=diff[:,:,None]*haze[:,:,None]*.42
  output+=sun[:,:,None]*(math.sin(phase-.5)+1)*.5*cfg['sun']
  output+=canopy[:,:,None]*(.8*math.sin(phase*1.0+.65)+.6*math.sin(2*phase+.15))
  if i==0: first_background=output.copy()
  if i>=48:
   # The BACKGROUND scene returns to frame zero, but emitted smoke never rewinds.
   u=min(1.,(i-47)/6)
   f=u*u*(3-2*u)
   output=output*(1-f)+first_background*f
  if cfg['smoke']:
   output,_=apply_emissions(tier,i,output)
  image=Image.fromarray(np.uint8(np.clip(np.rint(output),0,255)),'RGB')
  frames.append(image)
 # Locked-master check on all UNCOMPRESSED frames, not lossy video.
 reference=np.asarray(frames[0])
 for image in frames[1:]:
  arr=np.asarray(image)
  for name,(l,t,r,b) in box.items():
   if cfg['smoke'] and name=='skyline':
    # Existing skyline must stay fixed; only sky above chimney mouths unlocks.
    assert np.array_equal(arr[36:b,l:r],reference[36:b,l:r]),('SKYLINE_JITTER',tier)
   else:
    assert np.array_equal(arr[t:b,l:r],reference[t:b,l:r]),('STATIC_JITTER',tier,name)
  if cfg['smoke']:
   protected=protected_structure(tier)
   assert np.array_equal(arr[protected],reference[protected]),('STRUCTURE_JITTER',tier)
  assert np.array_equal(arr[~active],reference[~active]),('UNMASKED_MOTION',tier)
 # Export 54 derived frames; 10 genuine source frames remain immutable.
 still=dest/f'{tier}-still.webp'
 frames[0].save(still,'WEBP',quality=93,method=5)
 animated=dest/f'{tier}-locked-54f.webp'
 frames[0].save(animated,'WEBP',save_all=True,append_images=frames[1:],
                duration=110,loop=0,quality=88,method=5)
 frames[0].save(proof/'first-lossless.png')
 frames[27].save(proof/'mid-lossless.png')
 # Contact proof uses six phases from the ACTUAL 54 frame animation.
 indices=[0,9,18,27,36,45]
 cw,ch=648,60
 sheet=Image.new('RGB',(cw*3,(ch+20)*2),(4,18,31));d=ImageDraw.Draw(sheet)
 for n,j in enumerate(indices):
  x=(n%3)*cw;y=(n//3)*(ch+20)
  d.text((x+9,y+3),f'{tier.upper()} | DERIVED FRAME {j+1:02d}/54',fill=(209,247,253))
  sheet.paste(frames[j].resize((cw,ch),Image.Resampling.LANCZOS),(x,y+20))
 sheet.save(proof/'six-moments.webp','WEBP',quality=90,method=5)
 # Paint mask diagnostic. Structural rectangles highlighted separately.
 overlay=Image.new('RGBA',(W,H),(0,0,0,0));d=ImageDraw.Draw(overlay)
 colors=np.zeros((H,W,4),dtype=np.uint8)
 colors[sky>.06]=[10,210,245,77]
 colors[river>.07]=[25,230,170,86]
 colors[(sun>.4)&(xx<180)&(sky<=.06)]=[255,205,45,75]
 colors[(smoke>.02)&(sky>.02)]=[245,120,95,85]
 overlay=Image.fromarray(colors,'RGBA')
 composite=Image.alpha_composite(originals[cfg['master']-1].convert('RGBA'),overlay)
 d=ImageDraw.Draw(composite)
 for name,bbox in box.items():
  d.rectangle(bbox,outline=(255,85,128,255),width=2)
 composite.convert('RGB').save(proof/'motion-masks.webp','WEBP',quality=92,method=4)
 # Native frame contact: reference the already committed source contact and copies
 # are not made. Preview only with its original 10 tile hashes for traceability.
 s=np.asarray(frames[0]);m=np.asarray(frames[27])
 def region_diff(mask):return difference(s,m,mask)
 idx=lambda s: [float(v) for v in s]
 im=Image.open(animated)
 assert getattr(im,'n_frames',0)==total
 def adj_diffs():
  copied=[]
  for k in range(total):
   im.seek(k);copied.append(im.convert('RGB').copy())
  return [sum(ImageStat.Stat(ImageChops.difference(copied[k],copied[(k+1)%total])).mean)/3 for k in range(total)]
 differences=adj_diffs()
 # With almost-static RED haze, a ratio to tiny average movement is misleading.
 # The pre-encode last frame is pixel-identical to the first; cap WebP wrap
 # by absolute visible RGB difference too (lossy WebP codec).
 assert differences[-1]<max(3.0,2.5*max(.2,np.mean(differences[:-1]))),('BAD_SEAM',tier,differences[-1])
 assert max(differences)<6.5,('FLASH',tier,max(differences))
 values=dict(tier=tier,nativeSourceFrames=10,derivedFrames=total,sourceFrameSize=[W,H],
             masterFrame=cfg['master'],ownerSourceFrameHashes=hashes,
             masterPath=f'assets/pm25-luxury/frame-first-v1/{tier}/frames/frame-{cfg["master"]:02}.webp',
             stage='DEMO_ONLY_NOT_LIVE',staticLandmarkBoxes={k:list(v) for k,v in box.items()},
             lockedPixels=int((~active).sum()),staticPixelLockVerified=True,
             cloudMaxSourcePx=cfg['cloud']+3.3,waterPrimaryRipplePx=cfg['water'],
             waterSecondaryRipplePx=.84,waterRippleVerticalPx=cfg['waterY'],
             skyMotionHalfLoop=region_diff(sky>.06),waterMotionHalfLoop=region_diff(river>.08),
             seamMeanRgb=round(float(differences[-1]),3),
             averageFrameDifferenceRgb=round(float(np.mean(differences)),3),
             frameDurationMs=110,
             renderedSource=('10 owner native cells + locked architecture +'
               ' illustrative procedurally simulated stack smoke and red airborne haze/dust'
               if cfg['smoke'] else 'same-tier original 10 native owner cells; masked source-derived textures'),
             smoke=('forward-only staggered stack emissions, no ping-pong or reversed plume ages'
                    if cfg['smoke'] else 'none'),
             plumeModel=('forward-lifetime=42f; birth-interval=6f; 4 physical chimney mouths'
                          if cfg['smoke'] else 'none'),
             smokeAllowedPixels=int(smoke_allowed.sum()),
             ambientDust=('170 tiny staggered forward-drifting aerosols + moving volumetric haze' if tier=='red' else 'none'),
             foreground='foliage light shimmer, no leaf silhouette displacement')
 (dest/'manifest.json').write_text(json.dumps(values,ensure_ascii=False,indent=2)+'\n')
 print('LOCKED_TIER_PASS',tier,'native',len(files),'derived',total,'sky_half',values['skyMotionHalfLoop'],
       'water_half',values['waterMotionHalfLoop'],'wrap',values['seamMeanRgb'],
       'size_bytes',animated.stat().st_size,flush=True)
if __name__=='__main__':
 parser=argparse.ArgumentParser()
 parser.add_argument('--tier',choices=list(SETTINGS)+['all'],required=True)
 args=parser.parse_args()
 for tier in SETTINGS if args.tier=='all' else [args.tier]:
  run(tier)
