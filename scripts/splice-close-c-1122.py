#!/usr/bin/env python3
# ★[CLOSE_C_GO_1122 대표님 11/22 19:17 «추천대로» · 대본 CLOSE_C_GO_1122 · CLOSE_ONE_BOW_1122] 온라인 날 폐식 인사 — 구령 앞에 감사 한 줄
#   «현장과 화면 너머에서 함께해 주신 모든 분들, 정말 고맙습니다.» = CLOSE_C_TUNE 추천 테이크 r1(_takes/CLOSE_C_1122/r1 · 우성 일반 · ×1.0 · 받은 소리 그대로)
#   폐식 판 넷(108 · 185 · 186 · 187)마다: 구령 «신랑 신부, 하객 여러분께 인사!» 바로 앞에 이 줄 · 앞 문장 → 이 줄 쉼은 그 판의 구령 앞 쉼 그대로 · 이 줄 → 구령 말끝 → 말머리 1.2초
#   크기만 맞춤(구령 앞 문장 말소리 중앙값) · 높이 · 빠르기 손대지 않음 · 이 줄 앞뒤 빈소리만 걷음 · 같은 입력이면 같은 결과
#   쓰기: python3 scripts/splice-close-c-1122.py [--check]
import os, sys, json, re, subprocess, numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
N = os.path.join(ROOT, 'assets/audio/narration'); SR = 48000; GAP = 1.2
TAKE = os.path.join(ROOT, 'assets/audio/_src/_takes/CLOSE_C_1122/r1__narr-close-bow-online-0.flac')
LINE = '현장과 화면 너머에서 함께해 주신 모든 분들, 정말 고맙습니다.'
CALL = '신랑 신부, 하객 여러분께 인사!'
SRC = {'108_narr-close-bow': '386_narr-close-bow-online', '185_narr-close-bow-ex2': '387_narr-close-bow-ex2-online',
       '186_narr-close-bow-ex3': '388_narr-close-bow-ex3-online', '187_narr-close-bow-ex4': '389_narr-close-bow-ex4-online'}
def load(f): return np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout, dtype=np.float32).copy()
def save(x, f): subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '192k', '-ar', str(SR), '-ac', '1', f], input=x.astype(np.float32).tobytes(), check=True)
def frames_db(x, w=0.01):
    n = int(SR * w); m = len(x) // n; f = x[:m * n].reshape(m, n); return 20 * np.log10(np.sqrt((f ** 2).mean(1)) + 1e-9), n
def speech(x, thr=-45):
    db, n = frames_db(x); i = np.where(db > thr)[0]; return i[0] * n / SR, (i[-1] + 1) * n / SR
def runs(x, thr=-45, gap=0.45):
    db, n = frames_db(x); on = db > thr; segs = []; i = 0; m = len(on); g = int(gap / 0.01)
    while i < m:
        if on[i]:
            j = i
            while j < m and (on[j] or on[j:j + g].any()): j += 1
            segs.append([i * n / SR, j * n / SR]); i = j
        else: i += 1
    return segs
def med(x):
    db, _ = frames_db(x, 0.02); v = db[db > -40]; return float(np.median(v)) if len(v) else -30.0
S = lambda t: int(round(t * SR))
def build(src):
    x = load(os.path.join(N, src + '.mp3')); g = runs(x)
    c0 = g[-1][0]; assert 2.0 < g[-1][1] - c0 < 3.6, (src, '구령 길이', g[-1]); prev = g[-2]
    u = load(TAKE); a, b = speech(u); u = u[max(0, S(a - 0.05)):S(b + 0.05)]
    u = u * (10 ** ((med(x[S(prev[0]):S(prev[1])]) - med(u)) / 20)); fi = int(0.015 * SR); u[:fi] *= np.linspace(0, 1, fi); u[-fi:] *= np.linspace(1, 0, fi)
    # 이 줄 말끝(뒤 0.05 남김) → 구령 말머리 = GAP
    pad = GAP - 0.05 - 0.05
    y = np.concatenate([x[:S(c0 - 0.05)], u, np.zeros(S(pad), np.float32), x[S(c0 - 0.05):]])
    return y, c0 - prev[1]
if __name__ == '__main__':
    out = {}
    for src, dst in SRC.items():
        y, pre = build(src); out[dst] = y
        gg = runs(y); gp = gg[-1][0] - gg[-2][1]
        print(src, '→', dst, round(len(y) / SR, 2), '초 · 앞 문장 → 이 줄', round(pre, 2), '초 · 이 줄 → 구령', round(gp, 2), '초')
        assert abs(gp - GAP) < 0.06, ('구령 앞 쉼', dst, gp)
    if '--check' not in sys.argv:
        rf = os.path.join(N, '_recorded.json'); R = json.load(open(rf, encoding='utf-8')); c = R['clips']
        for src, dst in SRC.items():
            save(out[dst], os.path.join(N, dst + '.mp3'))
            t = c[src]['text']; assert t.endswith(CALL), (src, t)
            c[dst] = {'text': t[:-len(CALL)] + LINE + ' ' + CALL, 'voice': '우성', 'layer': 6, 'splice': 'CLOSE_C_GO_1122 · ' + src.split('_')[0] + ' 구령 앞에 CLOSE_C_TUNE r1 · 구령 앞 1.2초'}
        json.dump(R, open(rf, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); open(rf, 'a', encoding='utf-8').write('\n')
        print('썼다 386 ~ 389 · 녹음 기록')
