#!/usr/bin/env python3
# ★[NARR_GO_1122 대표님 11/22 10:02 «나레이션 추천대로» · 대본 NARR_GO_1122] 새 소리 둘을 지금 사이트 소리에서 잘라 붙인다(받은 소리 그대로 · 높이 · 빠르기 손대지 않음 · 43 처럼 전용 조립기)
#   384_narr-vow-in-face = 13_narr-vow-in 에서 둘째 문장(«신랑 신부는 서로 마주 보고 서주시기 바랍니다.»)만 도려냄 — 첫 문장 뒤 쉼은 13 그대로
#   385_narr-open-online = ONLINE_GREET_1119 우성 후보 a(_takes/ONLINE_GREET_1119/u60 · ×1.0) + 137 첫 문장 뒤 쉼 그대로 + 137 둘째 · 셋째 문장 그대로
#     첫 문장 크기 = 137 첫 문장 말소리 중앙값에 맞춤(나머지 두 문장과 같은 크기) · 앞 무음 · 끝은 137 그대로
#   같은 입력이면 같은 결과(손으로 다듬지 않는다) · 쓰기: python3 scripts/splice-narr-go-1122.py [--check]
import os, sys, subprocess, numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
N = os.path.join(ROOT, 'assets/audio/narration'); SR = 48000
def load(f): return np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout, dtype=np.float32).copy()
def save(x, f):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '192k', '-ar', str(SR), '-ac', '1', f], input=x.astype(np.float32).tobytes(), check=True)
def frames_db(x, w=0.02):
    n = int(SR * w); m = len(x) // n; f = x[:m * n].reshape(m, n); return 20 * np.log10(np.sqrt((f ** 2).mean(1)) + 1e-9), n
def sentences(x, thr=-45, gap=0.7):
    # 말 구간(문장) — gap 초 넘는 무음으로 나눈다
    db, n = frames_db(x); on = db > thr; segs = []; i = 0; m = len(on)
    while i < m:
        if on[i]:
            j = i
            while j < m and (on[j] or (j + int(gap / 0.02) < m and on[j:j + int(gap / 0.02)].any())): j += 1
            segs.append([i * n / SR, j * n / SR]); i = j
        else: i += 1
    return segs
def speech_med(x):
    db, _ = frames_db(x); v = db[db > -40]; return float(np.median(v)) if len(v) else -30.0
def trim(x, thr=-50, keep=0.05):
    db, n = frames_db(x, 0.005); idx = np.where(db > thr)[0]; a = max(0, idx[0] * n - int(keep * SR)); b = min(len(x), (idx[-1] + 1) * n + int(keep * SR)); return x[a:b]
S = lambda t: int(round(t * SR))
def vow_face():
    x = load(os.path.join(N, '13_narr-vow-in.mp3')); g = sentences(x); assert len(g) == 4, ('13 문장 수', g)
    return np.concatenate([x[:S(g[1][0] - 0.05)], x[S(g[2][0] - 0.05):]]), g
def open_online():
    x = load(os.path.join(N, '137_narr-open.mp3')); g = sentences(x); assert len(g) == 3, ('137 문장 수', g)
    u = trim(load(os.path.join(ROOT, 'assets/audio/_src/_takes/ONLINE_GREET_1119/u60__narr-open-online-0.flac')))
    u = u * (10 ** ((speech_med(x[S(g[0][0]):S(g[0][1])]) - speech_med(u)) / 20))
    fi = int(0.015 * SR); u[:fi] *= np.linspace(0, 1, fi)
    gap0 = g[1][0] - g[0][1]
    return np.concatenate([x[:S(g[0][0] - 0.05)], u, np.zeros(max(0, S(gap0 - 0.10)), np.float32), x[S(g[1][0] - 0.05):]]), g, gap0
if __name__ == '__main__':
    a, ga = vow_face(); b, gb, gap0 = open_online()
    print('13 문장', [[round(p, 2) for p in s] for s in ga], '→ 384', round(len(a) / SR, 2), '초')
    print('137 문장', [[round(p, 2) for p in s] for s in gb], '첫 문장 뒤 쉼', round(gap0, 2), '→ 385', round(len(b) / SR, 2), '초')
    if '--check' not in sys.argv:
        save(a, os.path.join(N, '384_narr-vow-in-face.mp3')); save(b, os.path.join(N, '385_narr-open-online.mp3'))
        # 녹음 기록(_recorded.json · RECORDED_TRUTH) — 실제로 들어간 글 · 13 · 137 기록에서 문장을 그대로 옮긴다
        import json, re
        rf = os.path.join(N, '_recorded.json'); R = json.load(open(rf, encoding='utf-8')); c = R['clips']
        sp = lambda t: [x for x in re.split(r'(?<=[.!?])\s+', t.strip()) if x]
        v13, v137 = sp(c['13_narr-vow-in']['text']), sp(c['137_narr-open']['text'])
        c['384_narr-vow-in-face'] = {'text': ' '.join([v13[0]] + v13[2:]), 'voice': '우성', 'layer': 6, 'splice': 'NARR_GO_1122 · 13 둘째 문장 뺌'}
        c['385_narr-open-online'] = {'text': ' '.join(['오늘 두 사람을 축복해 주시기 위하여 현장에 자리해 주신 하객분들과, 온라인으로 함께해 주시는 분들께 양가를 대표하여 감사의 말씀을 드립니다.'] + v137[1:]), 'voice': '우성', 'layer': 6, 'splice': 'NARR_GO_1122 · 첫 문장 ONLINE_GREET_1119 u60 + 137 #1 · #2'}
        json.dump(R, open(rf, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); open(rf, 'a', encoding='utf-8').write('\n')
        print('썼다 384 · 385 · 녹음 기록')
