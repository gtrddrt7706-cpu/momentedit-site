#!/usr/bin/env python3
# mp4 → 일정 간격 프레임 묶음(시각 라벨) · 검토용
import subprocess, sys, os
from PIL import Image, ImageDraw
src, out, step = sys.argv[1], sys.argv[2], float(sys.argv[3] if len(sys.argv) > 3 else 3)
dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src]).decode())
tmp = out + '_f'
os.makedirs(tmp, exist_ok=True)
ts, t = [], 0.5
while t < dur:
    ts.append(t); t += step
ims = []
for i, t in enumerate(ts):
    p = f'{tmp}/{i:03d}.jpg'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', str(t), '-i', src, '-frames:v', '1', '-vf', 'scale=480:-1', p], check=True)
    im = Image.open(p).convert('RGB'); d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 58, 18), fill=(0, 0, 0)); d.text((4, 3), f'{t:5.1f}s', fill=(255, 255, 0))
    ims.append(im)
cols = 4
w, h = ims[0].size
for k in range(0, len(ims), 16):
    chunk = ims[k:k + 16]
    rows = (len(chunk) + cols - 1) // cols
    S = Image.new('RGB', (cols * w, rows * h), 'white')
    for j, im in enumerate(chunk):
        S.paste(im, ((j % cols) * w, (j // cols) * h))
    S.save(f'{out}_{k // 16 + 1}.jpg', quality=85)
    print(f'{out}_{k // 16 + 1}.jpg')
