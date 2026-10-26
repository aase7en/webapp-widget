#!/usr/bin/env python3
"""Clearly visible, cyclic luxury-airflow sprite prototype for a 432×40 LED (3x).
Demo/asset only. Not a measurement of PM2.5, not a production classifier.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageChops, ImageStat
from pathlib import Path
import math, random, hashlib, json
BASE=Path(__file__).resolve().parent.parent
OUT=Path(__file__).resolve().parent/'visible-v2'
OUT.mkdir(exist_ok=True)
W,H=1296,120
N,COLS=8,4
TIERS={
 'blue': ((49,210,255),0.72),
 'green': ((73,255,188),0.90),
 'yellow': ((255,219,83),0.98),
 'orange': ((255,164,71),1.04),
 'red': ((255,116,87),1.10)
}
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def draw_wisp(mask,fy,phase,speed,alpha_scale):
    d=ImageDraw.Draw(mask,'L')
    # Multiple segmented ribbons move visibly in one direction but loop every 8 frames.
    for lane in range(3):
        period=216+lane*40
        shift=phase*period/8
        for n in range(-2,9):
            start=60+n*period+shift+lane*42
            span=104+lane*26
            for j in range(0,span,3):
                x=start+j
                if x<0 or x>=W: continue
                envelope=math.sin(math.pi*j/span)**1.4
                y=fy+(lane-1)*7+math.sin(x/(106+lane*11)+lane*.8+phase*.35)*3.9
                inten=int((100+lane*12)*envelope*alpha_scale)
                if inten>1:
                    r=2 if lane==0 else 1
                    d.ellipse((int(x-r),int(y-r),int(x+r),int(y+r)),fill=inten)
def frame_for(tier,rgb,intensity,step):
    phase=(step/N)
    # Transparent plume haze; slowly grows/shifts sinusoidally across 8-frame cycle.
    haze=Image.new('L',(W,H))
    hd=ImageDraw.Draw(haze,'L')
    for band in range(9):
       x=195+(band*147)%1080+40*math.sin(2*math.pi*phase+band*1.8)
       y=83+(band%4)*6+7*math.cos(2*math.pi*phase+band*2.1)
       wd=100+(band%3)*35
       hd.ellipse((int(x-wd),int(y-17),int(x+wd),int(y+19)),fill=int(14*intensity))
    haze=haze.filter(ImageFilter.GaussianBlur(16))
    plume=Image.new('RGBA',(W,H),(*rgb,0));plume.putalpha(haze)
    # A brighter continuous glow beneath the thin moving ribbons.
    mask=Image.new('L',(W,H))
    draw_wisp(mask,93,phase,1,intensity)
    glow=mask.filter(ImageFilter.GaussianBlur(5))
    glow=glow.point(lambda a:min(160,round(a*1.25)))
    luminous=Image.new('RGBA',(W,H),(*rgb,0));luminous.putalpha(glow)
    out=Image.alpha_composite(plume,luminous)
    core_mask=mask.point(lambda a:min(190,round(a*1.38)))
    core=Image.new('RGBA',(W,H),(190,249,242,0));core.putalpha(core_mask)
    out=Image.alpha_composite(out,core)
    # Discrete drifting particles with a realistic halo and obvious cyclic movement.
    sparkle=Image.new('RGBA',(W,H),(0,0,0,0))
    halo=Image.new('RGBA',(W,H),(0,0,0,0))
    ds=ImageDraw.Draw(sparkle,'RGBA'); dh=ImageDraw.Draw(halo,'RGBA')
    rng=random.Random(20261026)
    for k in range(64):
        x0=rng.uniform(140,1160);y0=rng.uniform(60,113)
        travel=20+12*(k%4)
        x=x0+travel*math.sin(2*math.pi*phase+k*1.04)
        y=y0+3*math.cos(2*math.pi*phase+k*.89)
        opacity=math.sin(math.pi*(.15+.7*((step+(k%8))%8)/8))**2
        a=int((55+125*opacity)*intensity)
        if a<5:continue
        r=1.3+(k%3)*.45
        dh.ellipse((x-5,y-5,x+5,y+5),fill=(*rgb,min(a,100)))
        ds.ellipse((x-r,y-r,x+r,y+r),fill=(212,255,248,min(a,205)))
    halo=halo.filter(ImageFilter.GaussianBlur(3))
    return Image.alpha_composite(Image.alpha_composite(out,halo),sparkle)
manifest={'schema':2,'kind':'visible-luxury-haze-loop','reviewOnly':True,'canvas':{'width':1296,'height':120,'LEDLogicalWidth':432,'LEDLogicalHeight':40},'frames':8,'frameMs':125,'columns':4,'tiers':{},'warning':'Art-only; text/status/time must be DOM; not a PM measurement'}
for tier,(rgb,intensity) in TIERS.items():
    frames=[frame_for(tier,rgb,intensity,i) for i in range(N)]
    atlas=Image.new('RGBA',(W*COLS,H*2),(0,0,0,0))
    for i,frm in enumerate(frames):atlas.alpha_composite(frm,((i%COLS)*W,(i//COLS)*H))
    atlaspath=OUT/f'{tier}-haze-visible-atlas.png'
    atlas.save(atlaspath,optimize=True)
    # RGB composite with the real Cinematic (ImageGen) background, not compressed sideways.
    bg=Image.open(BASE/'scenes'/f'{tier}-led-crop.webp').convert('RGBA')
    preview=[]
    for f in frames:
       pic=Image.alpha_composite(bg,f).convert('RGB')
       preview.append(pic.quantize(colors=192,method=Image.Quantize.MEDIANCUT))
    gif=OUT/f'{tier}-visible-motion.gif'
    preview[0].save(gif,save_all=True,append_images=preview[1:],loop=0,duration=125,disposal=2,optimize=False)
    # Visible change must be perceptibly > v1; continuity across the loop.
    diffs=[sum(ImageStat.Stat(ImageChops.difference(frames[i].convert('RGB'),frames[(i+1)%N].convert('RGB'))).mean)/3 for i in range(N)]
    first_last=diffs[-1];peak=max(diffs)
    assert Image.open(gif).n_frames==8
    assert Image.open(atlaspath).getchannel('A').getextrema()[0]==0
    assert peak>0.5, (tier,peak)
    manifest['tiers'][tier]={'atlas':atlaspath.name,'gif':gif.name,'atlasSHA256':sha(atlaspath),'gifSHA256':sha(gif),'frameCount':8,'maxFrameRGBDelta':round(peak,2),'loopRGBDelta':round(first_last,2),'atlasBytes':atlaspath.stat().st_size}
    print(tier,'GIF',gif.stat().st_size,'atlas',atlaspath.stat().st_size,'max RGB',round(peak,3),'wrap RGB',round(first_last,3))
(OUT/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
