from pathlib import Path
import numpy as np
from PIL import Image
import subprocess, json, shutil, re
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'videos';OUT.mkdir(exist_ok=True)
for tier in ('blue','green','yellow','orange','red'):
 im=Image.open(ROOT/'loops'/f'{tier}-16f.webp')
 assert im.n_frames==16
 frames=[]
 for i in range(16):
  im.seek(i)
  frames.append(np.array(im.convert('RGB'),dtype=np.uint8))
 file=OUT/f'{tier}-preview-30fps.mp4'
 args=['ffmpeg','-nostdin','-loglevel','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s','1296x120','-r','30','-i','-','-c:v','libx264','-preset','veryfast','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',str(file)]
 proc=subprocess.Popen(args,stdin=subprocess.PIPE,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
 # 16 keyframes, 3 subframes/keyframe, 4 repeat loops; no hard transition at wrap.
 try:
  for cycle in range(4):
   for a in range(16):
    f1=frames[a].astype(np.uint16)
    f2=frames[(a+1)%16].astype(np.uint16)
    for fraction in range(3):
     buf=((3-fraction)*f1+fraction*f2)//3
     proc.stdin.write(buf.astype(np.uint8).tobytes())
  proc.stdin.close();code=proc.wait(timeout=35)
  if code:raise RuntimeError(proc.stderr.read().decode()[:200])
 except Exception:
  proc.kill();raise
 if shutil.which('ffprobe'):
  probe=subprocess.run(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=nb_frames,width,height,avg_frame_rate','-of','json',str(file)],capture_output=True,text=True,check=True)
  data=json.loads(probe.stdout)['streams'][0]
 else:
  # ffprobe is not installed on the authorized Mac, so decode the actual video.
  probe=subprocess.run(['ffmpeg','-v','info','-i',str(file),'-f','null','-'],capture_output=True,text=True,check=True)
  matches=re.findall(r'frame=\s*(\d+)',probe.stderr)
  assert matches,('cannot verify encoded frame count',tier)
  data={'nb_frames':int(matches[-1]),'width':1296,'height':120,'avg_frame_rate':'30/1','checkedWith':'ffmpeg decode'}
 assert int(data['nb_frames'])==192,(tier,data)
 assert (data['width'],data['height'])==(1296,120)
 print('VIDEO_PASS',tier,data,'bytes',file.stat().st_size,flush=True)
