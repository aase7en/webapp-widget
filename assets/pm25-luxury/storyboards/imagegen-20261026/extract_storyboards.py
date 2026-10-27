#!/usr/bin/env python3
"""Extract real ImageGen contact-sheet cells as review frames, not certified sprite motion."""
from pathlib import Path
from PIL import Image,ImageChops,ImageStat
import hashlib,json
ROOT=Path(__file__).resolve().parent
GRIDS={'blue':(3,5),'green':(3,4),'yellow':(2,5),'orange':(3,4),'red':(4,4)}
EXPECTED={
'blue':'35955be9364a149e55e5b9a576f54a5dc69bf1ec6a1795c6b8ff9b39f1268fa0',
'green':'4048600c06559a4d28d16ad167f320a3ebb54d65e000a8173f8dccde912605b7',
'yellow':'79dd305f90d7aea39dac9413508b9886704064bdb50d278638ac24087153affa',
'orange':'699254eec7f9937b92ce4ac65083066044b4bdbad788767afcf2f31fd65e3655',
'red':'bf4b8501a25604255a9ca0c7a36ae5908b393963f184784cc2aadd8207542d0c'}
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
result={'schema':1,'state':'DESIGN_REVIEW_ONLY_NOT_PRODUCTION','source':'ImageGen original composite contact sheets user supplied 2026-10-26',
'notes':['Frame cells are extracted from ImageGen STORYBOARDS. A storyboard is not proof of physically continuous motion.',
        'Counts follow visible grid geometry, not filenames such as 16-frame.',
        'Do not crop/stretch raw frames to 432x40 without designing a correct LED composition.',
        'No PM values or health assessments are inferred from the images.'],
'tiers':{}}
for tier,(cols,rows) in GRIDS.items():
 source=ROOT/'originals'/f'{tier}.png'
 assert sha(source)==EXPECTED[tier],tier
 im=Image.open(source).convert('RGB')
 assert im.size==(2172,724)
 dest=ROOT/'frames'/tier;dest.mkdir(parents=True,exist_ok=True)
 cells=[];means=[]
 for row in range(rows):
  for col in range(cols):
   x0=round(col*im.width/cols)+3; x1=round((col+1)*im.width/cols)-3
   y0=round(row*im.height/rows)+3;y1=round((row+1)*im.height/rows)-3
   assert x1>x0 and y1>y0
   image=im.crop((x0,y0,x1,y1))
   fname=f'frame-{len(cells)+1:02d}.webp';file=dest/fname
   image.save(file,'WEBP',quality=85,method=6)
   cells.append({'path':str(file.relative_to(ROOT)),'sha256':sha(file),'width':image.width,'height':image.height})
   if len(cells)>1:
    prior=Image.open(ROOT/cells[-2]['path']).convert('RGB')
    if prior.size!=image.size:prior=prior.resize(image.size)
    dif=ImageChops.difference(prior,image)
    means.append(round(sum(ImageStat.Stat(dif).mean)/3,3))
 # Motion preview preserving natural source frame ratio, not stretched LED.
 imgs=[Image.open(ROOT/entry['path']).convert('RGB') for entry in cells]
 W=960;H=round(W*imgs[0].height/imgs[0].width)
 thumbs=[im.resize((W,H),Image.Resampling.LANCZOS) for im in imgs]
 anim=ROOT/'previews'/f'{tier}-storyboard-animation.webp';anim.parent.mkdir(exist_ok=True)
 thumbs[0].save(anim,format='WEBP',save_all=True,append_images=thumbs[1:],duration=240,loop=0,quality=72,method=6)
 check=Image.open(anim);assert getattr(check,'n_frames',1)==len(cells),(tier,check.n_frames,len(cells))
 result['tiers'][tier]={'originalPath':str(source.relative_to(ROOT)),'originalSha256':sha(source),'grid':{'columns':cols,'rows':rows},
                         'frameCount':len(cells),'frames':cells,'meanAdjacentRGBDifference':means,
                         'animatedPreview':str(anim.relative_to(ROOT)),'animatedPreviewSha256':sha(anim),
                         'sourceFrameAspect':round(imgs[0].width/imgs[0].height,3),
                         'ledReady':False}
 print(tier,'cells',len(cells),'frame',imgs[0].size,'preview',anim.stat().st_size,'meanFrameDelta',round(sum(means)/len(means),1))
(ROOT/'manifest.json').write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n')
print('STORYBOARD_FRAMES_VERIFIED',sum(len(v['frames']) for v in result['tiers'].values()))
