#!/usr/bin/env python3
"""Forwards-only physical motion proof; does not claim actual PM emissions."""
from PIL import Image
import json,sys
from pathlib import Path
import numpy as np
from smoke_atmosphere import PERIOD,STACKS,packet_state,stack_field,red_haze,red_suspended_dust,protected_structure
BASE=Path(__file__).resolve().parents[1]
assert PERIOD==54
for tier in ('orange','red'):
    manifest=json.loads((BASE/tier/'manifest.json').read_text())
    assert manifest['nativeSourceFrames']==10 and manifest['derivedFrames']==54
    assert manifest['plumeModel'].startswith('forward-lifetime=42f')
    for i in range(len(STACKS[tier])):
        for birth in range(0,PERIOD,6):
            snapshots=[packet_state(tier,i,birth,(birth+a)%PERIOD) for a in range(0,42)]
            assert all(snapshots[j+1]['x']<snapshots[j]['x'] for j in range(41)),(tier,i,birth,'smoke reverses horizontally')
            assert all(snapshots[j+1]['y']<snapshots[j]['y'] for j in range(41)),(tier,i,birth,'smoke reverses vertically')
            assert packet_state(tier,i,birth,(birth+42)%PERIOD) is None
    first=stack_field(tier,0)
    middle=stack_field(tier,23)
    assert np.count_nonzero(first)>150 and np.count_nonzero(middle)>150
    assert np.mean(np.abs(first-middle))>.00007,('SMOKE_STATIC',tier)
    protected=protected_structure(tier)
    assert not np.any(first[protected]) and not np.any(middle[protected]),('SMOKE_OVER_BUILDINGS',tier)
    original=Image.open(BASE/tier/'qa/first-lossless.png').convert('RGB')
    changed=Image.open(BASE/tier/'qa/mid-lossless.png').convert('RGB')
    a=np.asarray(original);b=np.asarray(changed)
    smoke_area=(first>.0001)|(middle>.0001)
    contrast=np.abs(a.astype(np.int16)-b.astype(np.int16)).mean(axis=2)
    mean_change=round(float(contrast[smoke_area].mean()),3)
    assert mean_change>2.0,('SMOKE_NOT_VISIBLE',tier,mean_change)
    print('PLUME_PASS',tier,'chimneys',len(STACKS[tier]),'packages_per_chimney',9,
          'real_forward_stages',42,'source_RGB_delta',mean_change)
d0=red_suspended_dust(0);d12=red_suspended_dust(12)
assert (d0>0).sum()>180 and np.mean(np.abs(d0-d12))>.00007
assert not np.any(d0[protected_structure('red')])
assert (red_haze(0)>0).sum()>10000
print('RED_AEROSOL_PASS','haze_pixels',int((red_haze(0)>0).sum()),'dust_nonzero',int((d0>0).sum()))
print('FORWARD_ONLY_SMOKE_AND_DUST_VERIFIED')
