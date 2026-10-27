from pathlib import Path
from PIL import Image
import hashlib,json
ROOT=Path(__file__).resolve().parent
p=ROOT/'manifest.json';m=json.loads(p.read_text())
for tier in ('blue','green','yellow','orange','red'):
 im=Image.open(ROOT/'loops'/f'{tier}-16f.webp')
 atlas=Image.new('RGB',(5184,480))
 for n in range(16):
  im.seek(n)
  atlas.paste(im.convert('RGB'),((n%4)*1296,(n//4)*120))
 path=ROOT/'atlases'/f'{tier}-composite-16f.webp'
 atlas.save(path,'WEBP',quality=84,method=2)
 m['tiers'][tier]['compositeAtlas']={'path':str(path.relative_to(ROOT)),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'dimensions':[5184,480],'frameSize':[1296,120],'frameCount':16,'grid':[4,4]}
 print('COMPOSITE_ATLAS_OK',tier,path.stat().st_size)
p.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
