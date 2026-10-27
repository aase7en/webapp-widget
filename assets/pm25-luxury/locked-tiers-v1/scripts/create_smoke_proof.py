#!/usr/bin/env python3
"""Create repeatable evidence crops from actual exported WebP frames."""
from pathlib import Path
from PIL import Image, ImageDraw
ROOT=Path(__file__).resolve().parents[1]
for tier in ('orange','red'):
    folder=ROOT/tier
    source=Image.open(folder/(tier+'-locked-54f.webp'))
    indices=(0,9,18,27,36,45)
    crop=(675,0,1000,60) if tier=='orange' else (675,0,1000,60)
    cell_w,cell_h=650,120
    result=Image.new('RGB',(cell_w*3,(cell_h+21)*2),(4,15,26))
    draw=ImageDraw.Draw(result)
    for k,idx in enumerate(indices):
        source.seek(idx)
        piece=source.convert('RGB').crop(crop).resize((cell_w,cell_h),Image.Resampling.LANCZOS)
        x=(k%3)*cell_w;y=(k//3)*(cell_h+21)
        draw.text((x+7,y+4),f'{tier.upper()} | SMOKE FORWARD FRAME {idx+1:02}/54',fill=(226,244,255))
        result.paste(piece,(x,y+21))
    result.save(folder/'qa'/'stack-motion-six-zoom.webp','WEBP',quality=92,method=5)
    print('ZOOM_PROOF',tier,(cell_w*3,(cell_h+21)*2))
