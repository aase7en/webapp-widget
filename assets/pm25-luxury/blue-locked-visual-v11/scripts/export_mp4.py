#!/usr/bin/env python3
"""Encode existing 66-frame source-derived WebP into 11fps H.264 with deterministic order."""
from pathlib import Path
from PIL import Image
import subprocess, shutil, tempfile
HERE=Path(__file__).resolve().parents[1]
webp=HERE/'blue-locked-66f.webp'
target=HERE/'blue-locked-66f.mp4'
assert shutil.which('ffmpeg'), 'ffmpeg required for MP4 preview export'
with tempfile.TemporaryDirectory(prefix='uth-pm25-blue-v11-') as tmp:
 frames=Image.open(webp)
 assert frames.n_frames==66, frames.n_frames
 for n in range(frames.n_frames):
  frames.seek(n)
  frames.convert('RGB').save(Path(tmp)/f'frame-{n:03}.png')
 subprocess.run(['ffmpeg','-y','-v','error','-framerate','11','-i',
                 str(Path(tmp)/'frame-%03d.png'),'-c:v','libx264',
                 '-preset','medium','-crf','18','-pix_fmt','yuv420p',
                 '-movflags','+faststart',str(target)],check=True)
 out=subprocess.run(['ffmpeg','-v','info','-i',str(target),
                     '-f','null','-'],capture_output=True,text=True,check=True)
 assert 'frame=   66 ' in out.stderr, 'video did not decode 66 frames'
 print('V11_MP4_EXPORT_PASS',target.stat().st_size,'bytes',frames.n_frames,'frames')
