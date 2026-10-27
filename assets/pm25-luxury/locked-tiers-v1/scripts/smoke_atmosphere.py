#!/usr/bin/env python3
"""Source-matched stack emissions: forward-age plume + periodic advected red atmospheric haze.

Only illustrative scene motion: NOT measured actual emissions or live sensor data.
Never reverse ages at the 54-frame loop. Architecture stays pixel-locked.
"""
import math
import numpy as np

PERIOD = 54
STACKS = {
 'orange': ((771,30), (792,32), (810,31), (881,17)),
 'red': ((762,26), (792,33), (806,34), (886,20)),
}
PALETTE = {'orange': (147,111,86), 'red': (118,79,66)}  # warm smoke tones sampled against owner master art
DIAMETER = {'orange': 0.88, 'red': 1.26}

def packet_state(tier, stack_index, birth, frame):
    """Packets ONLY travel up and left as age increases; 0 alpha at birth/expiry."""
    age = (frame - birth) % PERIOD
    if age >= 42:
        return None
    outlet_x, outlet_y = STACKS[tier][stack_index]
    drift = (0.83 + stack_index * .07) * age
    x = outlet_x - drift + 1.5*math.sin(age*.21 + stack_index)
    y = outlet_y - (.76 + stack_index*.06)*age
    radius_x = 3.5 + .39*age
    radius_y = 2.9 + .30*age
    fade_in = min(1.0, age / 5.0)
    fade_out = min(1.0, max(0, (42-age)/10.0))
    alpha = fade_in * fade_out * DIAMETER[tier] * .73  # prevent opaque diagonal slabs at LED scale
    return {'x':x,'y':y,'rx':radius_x,'ry':radius_y,'alpha':alpha,'age':age}

def protected_structure(tier, w=1296, h=120):
    """True = cannot change: source hospital/temple/bridge, buildings and chimney walls."""
    protected = np.zeros((h,w),dtype=bool)
    static = {
      'orange':((130,0,400,90),(476,74,722,98),(1018,0,1260,97)),
      'red':((127,0,401,90),(475,75,721,98),(1018,0,1264,98))
    }
    for x0,y0,x1,y1 in static[tier]:
        protected[y0:y1,x0:x1]=True
    # ALL skyline below top 36 is pixel-locked, including physical stack bodies.
    skyline = {'orange':(680,12,977,94), 'red':(684,11,981,95)}[tier]
    lx,uy,rx,by = skyline
    protected[36:by,lx:rx]=True
    # Chimney walls extend above skyline y36; protected below respective mouth tops.
    for x,y in STACKS[tier]:
        protected[max(0,y-1):36,max(0,x-5):min(w,x+6)] = True
    return protected

def stack_field(tier,frame,w=1296,h=120):
    assert tier in STACKS and 0 <= frame < PERIOD
    layer=np.zeros((h,w),dtype=np.float32)
    for stack_index in range(len(STACKS[tier])):
        for birth in range(0,PERIOD,6):
            p=packet_state(tier,stack_index,birth,frame)
            if p is None or p['alpha']<.005: continue
            x,y,rx,ry=p['x'],p['y'],p['rx'],p['ry']
            x0=max(0,int(x-2.5*rx));x1=min(w,int(x+2.5*rx)+1)
            y0=max(0,int(y-2.5*ry));y1=min(h,int(y+2.5*ry)+1)
            if x1<=x0 or y1<=y0:continue
            yy,xx=np.mgrid[y0:y1,x0:x1].astype(np.float32)
            u=(xx-x)/rx;v=(yy-y)/ry
            shape=np.exp(-.5*(u*u+v*v))
            # Soft, correlated-looking smoke variation (never circular stamped outlines).
            texture=(.81+.12*np.sin(xx*.21+v*.75+birth*.24)
                     +.08*np.sin(yy*.38-xx*.11+stack_index*1.7))
            rise_clip=np.clip((STACKS[tier][stack_index][1]-1-yy)/3,0,1)
            density=(.72*p['alpha']*shape*texture*rise_clip).astype(np.float32)
            sub=layer[y0:y1,x0:x1]
            sub[:]=1-(1-sub)*(1-density.clip(0,.7))
    # Advect the TEXTURE within a continuous plume in one direction.
    # Without this, dense overlapping smoke packets form a visually static cloud.
    yy,xx=np.mgrid[:h,:w].astype(np.float32)
    phase=frame/PERIOD
    fine=np.sin(2*math.pi*(xx/45+yy/31+phase))
    swirls=np.sin(2*math.pi*(xx/19+yy/23+2*phase+.17))
    moving_texture=np.clip(.73+.37*fine+.17*swirls,.15,1.25)
    layer*=moving_texture
    layer[protected_structure(tier)]=0
    return layer.clip(0,.80)

def red_haze(frame,w=1296,h=120):
    """Moving coherent haze, not particle dots, and no reverse-direction keyframes."""
    yy,xx=np.mgrid[:h,:w].astype(np.float32)
    t=frame/PERIOD
    wave=(.5+.24*np.sin(2*math.pi*(xx/365 + t))
          +.13*np.sin(2*math.pi*(xx/162+yy/91+2*t+.3)))
    vertical=np.clip((yy-1)/64,0,1)*np.clip((92-yy)/29,0,1)
    horizontal=np.clip((xx-180)/140,0,1)*np.clip((1150-xx)/140,0,1)
    haze=(.11+.15*wave)*vertical*horizontal
    protected=protected_structure('red',w,h)
    # The lower river, monuments and permanent buildings are never dust particles.
    haze[protected]=0
    haze[yy>86]=0
    return haze.clip(0,.32).astype(np.float32)

def red_suspended_dust(frame,w=1296,h=120):
    """Small tone-matched aerosols born/fading throughout the air, never reversing.

    No large decorative dots; an illustrative depiction, not actual PM sensor data.
    """
    assert 0<=frame<PERIOD
    density=np.zeros((h,w),dtype=np.float32)
    rng=np.random.default_rng(20261027)
    structures=protected_structure('red',w,h)
    for idx in range(170):
        start=int(rng.integers(0,PERIOD))
        age=(frame-start)%PERIOD
        life=int(rng.integers(32,46))
        x0=float(rng.uniform(390,1110)); y0=float(rng.uniform(4,72))
        radius=float(rng.uniform(1.5,3.4))
        opacity=float(rng.uniform(.15,.42))
        if age>=life:continue
        # Every particle moves toward left/up; fade out BEFORE its lifetime resets.
        x=x0-.33*age; y=y0-.115*age
        fade=min(1.0,age/6.0,(life-age)/8.0)
        if fade<=.01:continue
        x1=max(0,int(x-3*radius));x2=min(w,int(x+3*radius)+1)
        y1=max(0,int(y-3*radius));y2=min(h,int(y+3*radius)+1)
        if x2<=x1 or y2<=y1:continue
        yy,xx=np.mgrid[y1:y2,x1:x2]
        puff=(opacity*fade*np.exp(-.5*(((xx-x)/radius)**2+((yy-y)/(radius*.8))**2))).astype(np.float32)
        sub=density[y1:y2,x1:x2]
        sub[:]=1-(1-sub)*(1-puff)
    density[structures]=0
    density[80:,:]=0
    return density.clip(0,.45)

def apply(tier, frame, image):
    """Alpha composite warm smoke onto the existing sky; return image + changed mask."""
    base=np.asarray(image,dtype=np.float32)
    alpha=stack_field(tier,frame)
    fog=None;dust=None
    if tier=='red':
        fog=red_haze(frame)
        dust=red_suspended_dust(frame)
        fog_color=np.array([121,81,74],dtype=np.float32)
        base=base*(1-fog[:,:,None])+fog_color*fog[:,:,None]
        # Dust specks are always small, blur into background and have the source ash palette.
        base=base*(1-dust[:,:,None])+np.array([79,62,58],dtype=np.float32)*dust[:,:,None]
        alpha=alpha*(1-.12*fog)
    base=base*(1-alpha[:,:,None])+np.array(PALETTE[tier],dtype=np.float32)*alpha[:,:,None]
    changed=(alpha>.0001)
    if tier=='red': changed|=((fog>.0001)|(dust>.0001))
    return np.clip(base,0,255), changed
