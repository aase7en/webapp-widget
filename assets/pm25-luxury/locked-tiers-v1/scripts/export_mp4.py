#!/usr/bin/env python3
"""Export checked 54 keyframe WebP to H264 MP4 at ~9 fps (6 seconds per tier)."""
from pathlib import Path
from PIL import Image
import argparse,tempfile,subprocess,re,shutil,json
HERE=Path(__file__).resolve().parents[1]
TIERS=('green','yellow','orange','red')
def main(tier):
 src=HERE/tier/f'{tier}-locked-54f.webp'
 target=HERE/tier/f'{tier}-locked-54f.mp4'
 assert shutil.which('ffmpeg'),'ffmpeg unavailable'
 frames=Image.open(src)
 assert frames.n_frames==54 and frames.size==(1296,120)
 with tempfile.TemporaryDirectory(prefix=f'uth-pm25-{tier}-') as tmp:
  root=Path(tmp)
  for n in range(frames.n_frames):
   frames.seek(n)
   frames.convert('RGB').save(root/f'frame-{n:03}.png')
  subprocess.run(['ffmpeg','-y','-v','error','-framerate','9',
                  '-i',str(root/'frame-%03d.png'),'-c:v','libx264',
                  '-preset','medium','-crf','18','-pix_fmt','yuv420p',
                  '-movflags','+faststart',str(target)],check=True)
 check=subprocess.run(['ffmpeg','-v','info','-i',str(target),'-f','null','-'],
                      capture_output=True,text=True,check=True)
 amounts=re.findall(r'frame=\s*(\d+)',check.stderr)
 assert amounts and int(amounts[-1])==54,('incorrect decoded frames',tier,amounts[-3:])
 manifest=HERE/tier/'manifest.json'
 m=json.loads(manifest.read_text())
 m['exportedMp4Bytes']=target.stat().st_size
 m['mp4FramesDecoded']=int(amounts[-1])
 m['mp4Fps']=9
 manifest.write_text(json.dumps(m,indent=2,ensure_ascii=False)+'\n')
 print('MP4_PASS',tier,'54_frames_9fps','bytes',target.stat().st_size,flush=True)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--tier',required=True,choices=TIERS+('all',))
 o=p.parse_args()
 for t in TIERS if o.tier=='all' else (o.tier,):main(t)
