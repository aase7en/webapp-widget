#!/usr/bin/env python3
"""Deterministic five-band scenic prototypes. Not a live PM classification engine."""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from pathlib import Path
import random, math, json, hashlib, io
ROOT=Path(__file__).resolve().parent
W,H=1296,160
TIERS={
 "blue": dict(sky=(5,73,128),horizon=(37,184,237),fog=(61,191,251),fog_op=25,water=(4,56,93)),
 "green":dict(sky=(5,78,116),horizon=(83,185,144),fog=(61,172,144),fog_op=48,water=(7,72,74)),
 "yellow":dict(sky=(75,61,70),horizon=(247,177,81),fog=(230,194,92),fog_op=90,water=(78,64,45)),
 "orange":dict(sky=(75,42,55),horizon=(230,126,60),fog=(199,110,62),fog_op=135,water=(75,42,42)),
 "red":dict(sky=(67,31,45),horizon=(142,60,69),fog=(129,67,64),fog_op=185,water=(48,32,40))
}
# City and vegetation seeds fixed across all five states: geometry never changes.
rng=random.Random(7331)
buildings=[]
x=178
while x<W+30:
 bw=rng.randint(14,32);height=rng.randint(32,93)
 buildings.append((x,bw,height,rng.choice([0,3,6])))
 x+=bw+rng.randint(3,8)
trees=[(rng.randint(100,1210),rng.randint(2,12),rng.randint(6,24)) for _ in range(90)]
specks=[(rng.randint(0,W-1),rng.randint(0,H-1),rng.random()) for _ in range(120)]
def mix(a,b,t):return tuple(round(a[i]*(1-t)+b[i]*t) for i in range(3))
def grad_scene(tier):
 cfg=TIERS[tier]
 base=Image.new('RGB',(W,H));pix=base.load()
 for y in range(H):
  k=min(1,max(0,y/120))
  top=mix(cfg['sky'],cfg['horizon'],(k**.95)*.86)
  if y>112:top=mix(cfg['water'],cfg['sky'],.15)
  for x in range(W):
   lit=max(0,1-abs(x-700)/600)*.10
   pix[x,y]=mix(top,(255,203,117),lit*(.7 if tier in ('blue','green') else .45))
 d=ImageDraw.Draw(base,'RGBA')
 # soft, cinematic halo centered away from the clock and readings
 halo=Image.new('RGBA',(W,H));hd=ImageDraw.Draw(halo,'RGBA')
 for radius,opacity in [(120,6),(85,10),(53,15),(27,20)]:
  hd.ellipse((690-radius,53-radius,690+radius,53+radius),fill=(255,205,125,opacity))
 halo=halo.filter(ImageFilter.GaussianBlur(24))
 base=Image.alpha_composite(base.convert('RGBA'),halo)
 d=ImageDraw.Draw(base,'RGBA')
 # Mountains, horizon and clouds are shared shape
 d.polygon([(65,102),(225,69),(325,92),(450,65),(602,102),(779,76),(895,100),(1039,70),(1194,101),(W,81),(W,130),(0,130)],fill=(*mix(cfg['sky'],cfg['horizon'],.4),100))
 clouds=Image.new('RGBA',(W,H));cd=ImageDraw.Draw(clouds)
 rngc=random.Random(7788)
 for _ in range(22):
  cx=rngc.randint(125,1150);cy=rngc.randint(3,69);rw=rngc.randint(22,88)
  cd.ellipse((cx-rw,cy-8,cx+rw,cy+15),fill=(*cfg['horizon'],rngc.randint(12,32)))
 clouds=clouds.filter(ImageFilter.GaussianBlur(9))
 base=Image.alpha_composite(base,clouds)
 d=ImageDraw.Draw(base,'RGBA')
 # Buildings fixed positions & window rhythms; distant city
 for bx,bw,bh,s in buildings:
  top=111-bh
  col=mix((9,26,46),cfg['fog'],.25 if tier in ('blue','green') else .38)
  d.rectangle((bx,top,bx+bw,125),fill=(*col,236))
  d.rectangle((bx+2,top-3,bx+bw-2,top),fill=(16,25,37,155))
  if s==6:d.line((bx+bw//2,top-17,bx+bw//2,top),fill=(116,163,173,116),width=1)
  for xx in range(bx+3,bx+bw-2,6):
   for yy in range(top+6,116,8):
    if ((xx*13+yy*7)%11)<=3:
     d.rectangle((xx,yy,xx+1,yy+2),fill=(255,216,135,110 if tier in ('blue','green') else 70))
 # Water horizon, reflections
 d.rectangle((0,120,W,H),fill=(*cfg['water'],191))
 for index in range(90):
  xx=(index*109)%W
  yy=121+(index*17)%37
  ww=max(2,12-(yy-120)//3)
  a=60 if tier in ('blue','green') else 40
  d.line((xx,yy,xx+ww,yy),fill=(110,230,242,a),width=1)
 # Trees along water's near bank
 for tx,tw,th in trees:
  y=120+(tx*3)%13
  shadow=mix((8,31,28),cfg['sky'],.24)
  d.line((tx,y+10,tx,y-th//2),fill=(*shadow,235),width=2)
  for k in range(3):
   rad=max(3,tw-k*2)
   d.ellipse((tx-rad+k*2,y-th-rad//2+k*4,tx+rad+k*2,y-th+rad//2+k*4),fill=(*mix((11,73,50),cfg['fog'],.23),205))
 # Air pollution increases as an actual opaque atmospheric wash
 wash=Image.new('RGBA',(W,H),(*cfg['fog'],0));wd=ImageDraw.Draw(wash,'RGBA')
 for i in range(28):
  y=34+i*3
  opacity=round(cfg['fog_op']*.29*(i/27)**1.3)
  wd.line((0,y,W,y),fill=(*cfg['fog'],opacity),width=7)
 wash=wash.filter(ImageFilter.GaussianBlur(14))
 base=Image.alpha_composite(base,wash)
 # soft atmospheric light ribbons aligned with luxury water design
 air=Image.new('RGBA',(W,H));ad=ImageDraw.Draw(air,'RGBA')
 for j in range(3):
  path=[(x,int(133+5*math.sin(x/110+j*1.4)-j*5)) for x in range(0,W,8)]
  ad.line(path,fill=(100,231,255,19 if tier in ('red','orange') else 42),width=2)
 base=Image.alpha_composite(base,air.filter(ImageFilter.GaussianBlur(2)))
 # Fade where overlay text will sit: clock left and numeric/info right
 shade=Image.new('RGBA',(W,H));sp=shade.load()
 for y in range(H):
  for x in range(W):
   a_left=max(0,1-x/265)
   a_right=max(0,min(1,(x-930)/300))
   alpha=int(max(a_left*.73,a_right*.38)*193)
   sp[x,y]=(0,5,20,alpha)
 base=Image.alpha_composite(base,shade)
 return base.convert('RGB')

out={}
for name in TIERS:
 image=grad_scene(name)
 file=ROOT/('master-'+name+'.webp')
 image.save(file,'WEBP',quality=83,method=6)
 out[name]={'file':file.name,'width':W,'height':H,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'bytes':file.stat().st_size}

# Transparent 8-frame GREEN sprite atlas, intended as proof only, NOT production-ready.
fw,fh=648,80
atlas=Image.new('RGBA',(fw*4,fh*2),(0,0,0,0))
for i in range(8):
 frame=Image.new('RGBA',(fw,fh));l=Image.new('RGBA',(fw,fh));ld=ImageDraw.Draw(l,'RGBA')
 for j in range(6):
  x=(j*135+i*13)%810-60;y=46+j%3*6
  ld.ellipse((x-100,y-16,x+110,y+12),fill=(145,220,214,7+j*3))
 l=l.filter(ImageFilter.GaussianBlur(12))
 frame=Image.alpha_composite(frame,l)
 fd=ImageDraw.Draw(frame,'RGBA')
 for n in range(48):
  x=(n*47+i*11)%fw;y=17+(n*19)%58
  fd.ellipse((x,y,x+1+(n%2),y+1+(n%2)),fill=(166,238,245,14+(n%6)*4))
 atlas.alpha_composite(frame,(i%4*fw,i//4*fh))
a=ROOT/'green-haze-8f.png';atlas.save(a,optimize=True)
# Small animated review proof. Engine should use the transparent atlas, not GIF in production.
green=Image.open(ROOT/'master-green.webp').convert('RGBA').resize((fw,fh))
preview=[]
for k in range(8):
 layer=atlas.crop((k%4*fw,k//4*fh,(k%4+1)*fw,(k//4+1)*fh))
 preview.append(Image.alpha_composite(green,layer).convert('RGB').quantize(colors=128))
gif=ROOT/'green-motion-preview.gif'
preview[0].save(gif,save_all=True,append_images=preview[1:],duration=125,loop=0,optimize=False)
manifest={'schema':1,'artifactStatus':'DRAFT_PROPOSAL_NOT_LIVE','productionCompatible':False,'source':'deterministic procedural design study; reviewed source of PM data still required',
 'baseSize':{'width':W,'height':H},'tiers':out,
 'animationProof':{'tier':'green','file':a.name,'frames':8,'columns':4,'frameWidth':fw,'frameHeight':fh,'fpsTrial':8,'alpha':True,'sha256':hashlib.sha256(a.read_bytes()).hexdigest()},
 'animatedReview':{'file':gif.name,'frames':8,'previewOnly':True},
 'semantics':'Environmental scene is stylized illustration, NEVER a measured sky or PM sensor visualization; no text or fake PM numbers baked into artwork.'}
(ROOT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
# Review collage — images are kept independent of label graphics
p=Image.new('RGB',(1296,470),(3,9,22));d=ImageDraw.Draw(p)
order=['blue','green','yellow','orange','red']
for i,key in enumerate(order):
 sc=Image.open(ROOT/('master-'+key+'.webp'))
 width=624 if i<4 else 1260
 scene=sc.resize((width,130))
 x=12+(i%2)*648 if i<4 else 18;y=14+(i//2)*155
 if i==4:y=322
 p.paste(scene,(x,y))
 d.rectangle((x,y,x+width,y+130),outline={'blue':'#13B6FF','green':'#28D38C','yellow':'#FFDC35','orange':'#FF9445','red':'#FF5252'}[key],width=3)
 d.text((x+8,y+6),key.upper()+' · SCENE DRAFT (NO DATA)',fill='white')
p.save(ROOT/'review-contact-sheet.webp','WEBP',quality=80,method=6)
print('ASSET_PACK_CREATED',json.dumps({'scene_bytes':{k:v['bytes'] for k,v in out.items()},'green_atlas_bytes':a.stat().st_size,'review_bytes':(ROOT/'review-contact-sheet.webp').stat().st_size},indent=2))
