#!/usr/bin/env python3
# ★[TRIBUTE_GO_1122 대표님 11/22 15:50 «E가 좋은 거 같은데» · 대본 TRIBUTE_GO_1122 · REC141_1122] 새 141 = 한 문장 통째 다시 받기 테이크 5(후보 E)
#   받은 소리 그대로 — 높이 · 빠르기 손대지 않음 · 자르기 / 이어 붙이기 없음(앞뒤 빈소리도 받은 그대로 · 48k 로 옮기기만)
#   크기만 시범 판(docs handoff_1111/pilot_1122 · meas141.json now −16.27 / e −17.52 LUFS)처럼 지금 141 에 맞춤 = +1.25 dB
#   최고는 조립기 LOUD_ADJ 길과 같은 −1.5 dBFS 리미터(받은 소리 최고 −0.87 dBFS + 1.25 dB 가 넘치는 몇 ms 만) · 앞뒤 0.015 / 0.04 초 페이드(모든 클립과 같게)
#   같은 입력이면 같은 결과 · 쓰기: python3 scripts/rec141-1122.py [--check]
import os, sys, json, subprocess, numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
N = os.path.join(ROOT, 'assets/audio/narration'); SR = 48000
TAKE = os.path.join(ROOT, 'assets/audio/_src/_takes/REC141_1122/e5__narr-tribute-name-0.flac')
OUT = os.path.join(N, '141_narr-tribute-name.mp3')
GAIN_DB = 1.25   # 시범 판 meas141.json: 지금 141 −16.27 LUFS − 후보 e −17.52 LUFS
TEXT = '기쁘면서도 섭섭하고, 대견하면서도 마음 한편이 뭉클하실 부모님께, 신랑 신부가 감사의 마음을 전하겠습니다.'
def load(f): return np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout, dtype=np.float32).copy()
def save(x, f):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'libmp3lame', '-b:a', '192k', '-ar', str(SR), '-ac', '1', f], input=x.astype(np.float32).tobytes(), check=True)
if __name__ == '__main__':
    x0 = load(TAKE); tot = len(x0) / SR
    af = f'volume={GAIN_DB}dB,alimiter=limit=0.8414:level=disabled:attack=3:release=40,afade=t=in:st=0:d=0.015,afade=t=out:st={max(0, tot - 0.04):.3f}:d=0.04'
    x = np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-af', af, '-f', 'f32le', '-'], input=x0.tobytes(), capture_output=True, check=True).stdout, dtype=np.float32).copy()
    assert abs(len(x) - len(x0)) < SR * 0.01, ('길이가 바뀜', len(x0), len(x))
    pk = float(np.abs(x).max()); assert pk < 0.99, ('넘침', pk)
    print('141 새 판', round(len(x) / SR, 2), '초 · 최고', round(20 * np.log10(pk), 2), 'dBFS · +', GAIN_DB, 'dB')
    if '--check' not in sys.argv:
        save(x, OUT)
        rf = os.path.join(N, '_recorded.json'); R = json.load(open(rf, encoding='utf-8')); c = R['clips']
        c['141_narr-tribute-name'] = {'text': TEXT, 'voice': '우성', 'layer': 6, 'splice': 'TRIBUTE_GO_1122 · REC141_1122 테이크 5(후보 E) 통째 · +1.25 dB'}
        json.dump(R, open(rf, 'w', encoding='utf-8'), ensure_ascii=False, indent=1); open(rf, 'a', encoding='utf-8').write('\n')
        print('썼다 141 · 녹음 기록')
