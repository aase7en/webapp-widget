#!/usr/bin/env python3
"""Produce visible proof that each exported WebP actually has 16 different frames."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'qa';OUT.mkdir(exist_ok=True)
tiers=('blue','green','yellow','orange','red')
thumb_w,thumb_h=648,60
def frames(tier):
 im=Image.open(ROOT/'loops'/f'{tier}-16f.webp')
 assert im.n_frames==16
 seq=[]
 for k in range(16):
  im.seek(k);seq.append(im.convert('RGB').resize((thumb_w,thumb_h),Image.Resampling.LANCZOS))
 return seq
for tier in tiers:
 seq=frames(tier)
 sheet=Image.new('RGB',(thumb_w*4,(thumb_h+22)*4),(5,17,30))
 d=ImageDraw.Draw(sheet)
 for k,f in enumerate(seq):
  x=(k%4)*thumb_w;y=(k//4)*(thumb_h+22)
  d.text((x+9,y+4),f'{tier.upper()} | FRAME {k+1:02d}/16',fill='#bdeaff')
  sheet.paste(f,(x,y+22))
 sheet.save(OUT/f'{tier}-contact-16f.webp','WEBP',quality=88,method=4)
 print('CONTACT_PROOF',tier,sheet.size)
summary=Image.new('RGB',(thumb_w*4,(thumb_h+25)*5),(4,16,30))
d=ImageDraw.Draw(summary)
for j,tier in enumerate(tiers):
 seq=frames(tier)
 for k,i in enumerate((0,4,8,12)):
  x=k*thumb_w;y=j*(thumb_h+25)
  d.text((x+9,y+5),f'{tier.upper()} | FRAME {i+1:02d}/16',fill='#cefaff')
  summary.paste(seq[i],(x,y+25))
summary.save(OUT/'all-tiers-motion-proof.webp','WEBP',quality=86,method=4)
print('ALL_TIERS_PROOF',summary.size)
