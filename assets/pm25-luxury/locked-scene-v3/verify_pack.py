"""Deterministic asset integrity validation, independent of runtime Kilo widget."""
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
import hashlib,json
ROOT=Path(__file__).resolve().parent
m=json.loads((ROOT/'manifest.json').read_text())
assert m['assetStatus']=='REVIEW_ONLY_NOT_PRODUCTION'
assert m['canvas']['logicalWidth']==432 and m['canvas']['logicalHeight']==40
assert m['animation']['framesPerTier']==16
assert set(m['tiers'])==set(('blue','green','yellow','orange','red'))
for name,meta in m['tiers'].items():
    src=ROOT/'originals'/meta['sourceFile']
    assert hashlib.sha256(src.read_bytes()).hexdigest()==meta['originalSHA256']
    assert meta['sourceFrameCount']==(12 if name=='blue' else 10)
    assert len(meta['sourceOriginalCells'])==meta['sourceFrameCount']
    for cell in meta['sourceOriginalCells']:
        p=ROOT/cell['path']
        assert p.is_file()
        assert hashlib.sha256(p.read_bytes()).hexdigest()==cell['sha256']
        assert Image.open(p).size==tuple(cell['pixels'])
    bg=ROOT/meta['master']['path']
    assert Image.open(bg).size==(1296,120)
    assert hashlib.sha256(bg.read_bytes()).hexdigest()==meta['master']['sha256']
    preview=ROOT/meta['loop']['path']
    image=Image.open(preview)
    assert image.size==(1296,120) and image.n_frames==16
    assert hashlib.sha256(preview.read_bytes()).hexdigest()==meta['loop']['sha256']
    # Scene silhouette cannot jump since the master never changes across the 16 authored frames.
    assert len(meta['effects'])==10
    for effect,info in meta['effects'].items():
        f=ROOT/info['path'];im=Image.open(f)
        assert info['grid']==[4,4] and info['frameCount']==16
        assert im.size==(5184,480)
        assert im.mode=='RGBA', (name,effect,im.mode)
        if not ((effect=='birds' and name=='red') or (effect=='smoke' and name=='blue')):
            assert im.getchannel('A').getextrema()[1]>0,(name,effect)
        assert hashlib.sha256(f.read_bytes()).hexdigest()==info['sha256']
    print('PASS',name,'original',meta['sourceFrameCount'],'authored',meta['loop']['frameCount'],'effects',len(meta['effects']))
assert (ROOT/'index.html').exists() and (ROOT/'build_pack.py').exists()
print('ALL_ASSETS_VERIFIED')
