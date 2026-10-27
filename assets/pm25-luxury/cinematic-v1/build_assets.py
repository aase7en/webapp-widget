#!/usr/bin/env python3
"""Generate lossless-preserved, text-free scenic derivatives from five ImageGen source files."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import hashlib, json
ROOT=Path(__file__).resolve().parent
TIERS=('blue','green','yellow','orange','red')
GENERATED={
 'blue':'b01c8211af7c2ae77ae01810',
 'green':'59908211ba5c20ea06eac96a',
 'yellow':'523c8207ab99d850735c1bad',
 'orange':'7b448211a0bef4ac77b8479c',
 'red':'94dc8207a561dffabdd30bad'
}
def digest(p):
 return hashlib.sha256(p.read_bytes()).hexdigest()
def build():
 out=ROOT/'scenes';out.mkdir(exist_ok=True)
 rows=[];manifest={'schema':1,'type':'cinematic-art-direction','version':'v1-review',
     'notForProductionUntilApproved':True,'source':'ChatGPT Image Generation, user-approved aesthetic exploration',
     'canvas':{'liveLEDWidth':432,'liveLEDHeight':40,'logicalRatio':10.8},
     'notes':['All 5 source images have visible neon LED border and white surrounding canvas; scenes crop those away.',
       'City/skyline geometry varies between independently generated images. Do not hard-cut between tiers; use crossfade or refined common matte.',
       'Art only, not actual PM2.5 measurements. Preserve observedAt, band thresholds and stale labels in DOM.',
       'No motion frames are contained in this cinematic-v1 package. Transparent motion layers are an outstanding workstream.'],
     'tiers':{}}
 for tier in TIERS:
  src=ROOT/'originals'/f'{tier}.png'
  im=Image.open(src).convert('RGB')
  assert im.size==(2172,724), (tier,im.size)
  # Trim white generator presentation margin and the neon glass border;
  # keep the panoramic city, waterfront, clouds, trees, and atmospheric glow.
  scene=im.crop((42,183,2130,538))
  scenic=scene.resize((1296,221),Image.Resampling.LANCZOS)
  path=out/f'{tier}.webp';scenic.save(path,'WEBP',quality=85,method=6)
  assert Image.open(path).size==(1296,221)
  # Strip preview for exact 432x40 3x-resolution LED contact-sheet judging.
  led=ImageOps.fit(scenic,(1296,120),Image.Resampling.LANCZOS,centering=(.5,.52))
  ledpath=out/f'{tier}-led-crop.webp';led.save(ledpath,'WEBP',quality=83,method=6)
  rows.append((tier,led.copy()))
  manifest['tiers'][tier]={
    'generationRefSuffix':GENERATED[tier],
    'sourceFile':str(src.relative_to(ROOT)),'sourceSha256':digest(src),'sourceSizeBytes':src.stat().st_size,
    'scenicFile':str(path.relative_to(ROOT)),'scenicSha256':digest(path),'scenicWidth':1296,'scenicHeight':221,
    'ledCropFile':str(ledpath.relative_to(ROOT)),'ledCropSha256':digest(ledpath),'ledCropWidth':1296,'ledCropHeight':120,
    'alpha':False, 'containsText':False, 'approved':False}
 # Contact sheet labels sit outside each master scene to avoid any baked-in UI.
 review=Image.new('RGB',(1320,5*151+18),(11,19,33));draw=ImageDraw.Draw(review)
 for i,(tier,scene) in enumerate(rows):
  y=8+i*151
  draw.text((14,y),tier.upper()+'  /  CINEMATIC MASTER SCENE — DRAFT',fill='#e7faff')
  review.paste(scene,(12,y+20))
  draw.rectangle((11,y+19,1309,y+140),outline='#11b6ff',width=1)
 review.save(ROOT/'review-five-tier.webp','WEBP',quality=86,method=6)
 manifest['preview']={'file':'review-five-tier.webp','sha256':digest(ROOT/'review-five-tier.webp')}
 (ROOT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 print('CINEMATIC_EXPORT_DONE',[(k,manifest['tiers'][k]['scenicWidth'],manifest['tiers'][k]['scenicHeight']) for k in TIERS])
if __name__=='__main__':build()
