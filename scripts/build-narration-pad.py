#!/usr/bin/env python3
"""[KNOBS_1031] 나레이션 파일마다 앞 · 뒤 무음 길이(ms)를 재서 assets/narration-pad.js 로 쓴다.
쉼 = 목표 쉼 − (앞 클립 뒤 무음 + 다음 클립 앞 무음) · 0 아래면 0 — 화면(order-preview)과 당일 콘솔이 이 표를 읽는다.
  python3 scripts/build-narration-pad.py          # 다시 재서 쓴다(miniaudio 필요 · pip install miniaudio)
  python3 scripts/build-narration-pad.py --check  # 파일 목록이 표와 같은지만(소리를 풀지 않는다 · merge-guard)
말소리 기준 = 10ms 창 RMS 가 −45 dBFS 를 넘는 첫 · 마지막 창."""
import os, sys, json, re, math
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIR = os.path.join(ROOT, 'assets', 'audio', 'narration')
OUT = os.path.join(ROOT, 'assets', 'narration-pad.js')
THR = -45.0
names = sorted(f[:-4] for f in os.listdir(DIR) if f.endswith('.mp3'))

def read_table():
    if not os.path.exists(OUT): return {}
    m = re.search(r'PAD = (\{.*?\});', open(OUT, encoding='utf-8').read(), re.S)
    return json.loads(m.group(1)) if m else {}

if '--check' in sys.argv:
    t = read_table(); miss = [n for n in names if n not in t]; extra = [n for n in t if n not in names]
    if miss or extra:
        print('FAIL narration-pad: 표에 없는 파일 %s · 파일이 없는 표 %s — python3 scripts/build-narration-pad.py' % (miss[:5], extra[:5])); sys.exit(1)
    print('ok narration-pad %d' % len(names)); sys.exit(0)

import miniaudio
pad = {}
for n in names:
    d = miniaudio.decode_file(os.path.join(DIR, n + '.mp3'), output_format=miniaudio.SampleFormat.FLOAT32, nchannels=1, sample_rate=24000)
    s = d.samples; sr = d.sample_rate; W = sr // 100; fr = len(s) // W
    lim = 10 ** (THR / 20); on = []
    for i in range(fr):
        seg = s[i * W:(i + 1) * W]; rms = math.sqrt(sum(x * x for x in seg) / W)
        on.append(rms > lim)
    if True not in on: pad[n] = [0, 0]; continue
    a = on.index(True); b = len(on) - 1 - on[::-1].index(True)
    pad[n] = [a * 10, max(0, (fr - 1 - b) * 10)]
body = json.dumps(pad, ensure_ascii=False, separators=(',', ':'))
open(OUT, 'w', encoding='utf-8').write(
    '/* ★[KNOBS_1031] 나레이션 파일 앞 · 뒤 무음(ms) — scripts/build-narration-pad.py 가 만든다(손으로 고치지 말 것) · 파일을 바꾸면 다시 돌린다.\n'
    '   쉼은 «말끝 → 말머리»로 한 번만: 쉼 = 목표 − (앞 클립 뒤 무음 + 다음 클립 앞 무음) · 0 아래면 0 */\n'
    '(function (g) {\n  var PAD = ' + body + ';\n'
    '  function of(f) { var p = PAD[String(f || \'\').replace(/^.*\\//, \'\').replace(/\\.mp3$/, \'\')]; return p || null; }\n'
    '  function gap(prev, next, target) { var a = of(prev), b = of(next); if (!a || !b) return target; return Math.max(0, Math.round(target - a[1] - b[0])); }\n'
    '  var api = { PAD: PAD, of: of, gap: gap, THR: ' + str(THR) + ' };\n'
    '  if (typeof module !== \'undefined\' && module.exports) module.exports = api; else g.NarrPad = api;\n'
    '})(typeof window !== \'undefined\' ? window : this);\n')
print('wrote %d · lead 평균 %d ms · tail 평균 %d ms' % (len(pad), sum(v[0] for v in pad.values()) / len(pad), sum(v[1] for v in pad.values()) / len(pad)))
