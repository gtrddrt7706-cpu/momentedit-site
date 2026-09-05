#!/usr/bin/env python3
# 저널 낭독 조립기 — 타입캐스트 「문장별 분리」 wav 를 한 편의 mp3 로  [JOURNAL_ASSEMBLE]
#
#   python3 scripts/build-journal-audio.py --in <받은 폴더>
#     받은 폴더 안에 1/ 2/ (또는 zip 을 푼 폴더 아무 이름)이 있으면 문장 개수로 편을 짚는다.
#
# ★왜 손으로 안 붙이나 — 문장이 서른아홉 개다. 사이 여백·음량·머리 무음을 손으로 맞추면
#   매번 다르게 붙고, 다시 녹음하는 날 처음부터 다시 해야 한다.
#
# ★[HEAD_PAD] 머리에 무음을 붙인다 (2026-09-05 사용자 지시 "씹히는거방지")
#   화면 쪽에도 2초 리드인이 있지만(parents.html 과 같은 처방), 그것만으로는 부족하다 —
#   리드인은 «소리 장치를 깨우는» 시간이고, 그래도 첫 프레임 몇십 ms 는 기기에 따라 날아간다.
#   그 자리에 «말» 대신 «무음»이 있으면 무엇이 날아가도 첫 글자는 살아남는다. 방어선이 둘이다.
#
# ★[GAP_RULES] 사이 여백은 규칙으로 둔다 — 문장 사이 0.65초가 기본이고 둘만 예외다.
#   · 화자가 바뀌는 자리는 길게(1.0초). 붙으면 한 사람이 말을 잇는 것처럼 들린다
#   · 한 문장을 두 줄로 쪼갠 자리는 짧게(0.30초). 길면 두 문장으로 들린다
#   예외는 대본이 아니라 여기 적는다 — 대본은 화면 글과 글자까지 같아야 해서 표시를 넣을 수 없다.
#
# ★[LEVEL] 음량은 RMS 로 맞추고 피크로 잡는다. 두 편이 다른 크기로 나가면 듣는 사람이 볼륨을 만진다.
import argparse, glob, io, os, re, sys, wave, array, math

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS = {
    '1': ('docs/plans/저널낭독/1_혼주라는이름.txt', 'assets/audio/essay/1_honju.mp3'),
    '2': ('docs/plans/저널낭독/2_신혼여행첫날.txt', 'assets/audio/essay/2_honeymoon.mp3'),
}
HEAD_PAD   = 0.30     # [HEAD_PAD] 첫 글자 앞 무음
TAIL_PAD   = 0.60     # 끝 여운 — 뚝 끊기면 «끊겼다»로 들린다
GAP        = 0.65     # 문장 사이 기본
GAP_SPEAKER= 1.00     # 화자가 바뀌는 자리
GAP_SPLIT  = 0.30     # 한 문장을 두 줄로 쪼갠 자리
TARGET_RMS = 0.10     # ≒ -20 dBFS
PEAK_MAX   = 0.89     # ≒ -1 dBFS
HEAD_TRIM_KEEP = 0.06 # 클립 앞뒤 무음을 걷되 이만큼은 남긴다(말의 시작을 자르지 않으려고)
SILENCE    = 0.004    # 무음 판정 진폭

# 한 문장을 두 줄로 쪼갠 자리 — 앞줄이 이것으로 끝나면 다음 줄과의 여백을 줄인다
SPLIT_TAIL = ('있고,',)


def read_wav(path):
    w = wave.open(path, 'rb')
    assert w.getsampwidth() == 2, f'16bit 아님: {path}'
    ch, sr, n = w.getnchannels(), w.getframerate(), w.getnframes()
    a = array.array('h'); a.frombytes(w.readframes(n)); w.close()
    if ch == 2:                                   # 스테레오면 평균으로 모노화
        a = array.array('h', [(a[i] + a[i + 1]) // 2 for i in range(0, len(a), 2)])
    return a, sr


def trim(a, sr):
    """앞뒤 무음을 걷는다 — 타입캐스트 클립마다 머리 무음이 제각각이라 그대로 붙이면 여백이 들쭉날쭉해진다."""
    lim = int(SILENCE * 32768)
    i = 0
    while i < len(a) and abs(a[i]) < lim: i += 1
    j = len(a) - 1
    while j > i and abs(a[j]) < lim: j -= 1
    keep = int(HEAD_TRIM_KEEP * sr)
    return a[max(0, i - keep): min(len(a), j + keep)]


def build(part, files, lines):
    sr = None; out = array.array('h')
    def sil(sec):
        out.extend(array.array('h', [0]) * int(sec * sr))
    for i, (f, ln) in enumerate(zip(files, lines)):
        a, s = read_wav(f)
        if sr is None:
            sr = s; sil(HEAD_PAD)                                   # [HEAD_PAD]
        assert s == sr, f'샘플레이트가 섞였다: {f}'
        if i:
            prev_who, who = lines[i - 1][0], ln[0]
            prev_txt = lines[i - 1][1]
            gap = (GAP_SPEAKER if prev_who != who
                   else GAP_SPLIT if prev_txt.endswith(SPLIT_TAIL) else GAP)
            sil(gap)
        out.extend(trim(a, sr))
    sil(TAIL_PAD)
    # [LEVEL] RMS 정렬 후 피크로 잡는다
    rms = math.sqrt(sum(float(v) * v for v in out) / max(1, len(out))) / 32768.0
    peak = max(abs(v) for v in out) / 32768.0
    g = min(TARGET_RMS / rms if rms else 1.0, PEAK_MAX / peak if peak else 1.0)
    out = array.array('h', [max(-32768, min(32767, int(v * g))) for v in out])
    return out, sr, rms, peak, g


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--in', dest='src', required=True, help='타입캐스트에서 받은 폴더(하위에 wav 들)')
    a = ap.parse_args()
    try:
        import lameenc
    except ImportError:
        sys.exit('lameenc 가 없다 — pip install lameenc')

    # 폴더 이름은 안 맞춰도 된다: 문장 개수로 편을 짚는다(식순 조립기 PART_AUTOMATCH 와 같은 방식)
    pools = {}
    for d, _, fs in os.walk(a.src):
        w = [os.path.join(d, f) for f in fs if f.lower().endswith('.wav')]
        if w: pools[d] = sorted(w, key=lambda p: int(re.search(r'audio_(\d+)_', os.path.basename(p)).group(1)))

    for part, (script, outrel) in SCRIPTS.items():
        lines = [tuple(l.split(': ', 1)) for l in
                 io.open(os.path.join(ROOT, script), encoding='utf-8').read().strip().split('\n')]
        hit = [p for p in pools.values() if len(p) == len(lines)]
        if len(hit) != 1:
            sys.exit(f'{part}편({len(lines)}문장)에 맞는 폴더가 {len(hit)}개다 — 폴더를 확인할 것')
        files = hit[0]
        # 파일 이름에 남은 문장과 대본을 맞대 «순서»를 확인한다(이름은 잘려 있으므로 앞부분만)
        for f, (_, txt) in zip(files, lines):
            nm = re.sub(r'^audio_\d+_', '', os.path.basename(f))[:-4].replace('~', '')
            x = re.sub(r'[^가-힣]', '', nm)
            if x and re.sub(r'[^가-힣]', '', txt)[:len(x)] != x:
                sys.exit(f'순서가 어긋난다 — 파일 {os.path.basename(f)} / 대본 {txt}')
        pcm, sr, rms, peak, g = build(part, files, lines)
        enc = lameenc.Encoder()
        enc.set_bit_rate(64); enc.set_in_sample_rate(sr); enc.set_channels(1); enc.set_quality(2)
        mp3 = enc.encode(pcm.tobytes()) + enc.flush()
        dst = os.path.join(ROOT, outrel); os.makedirs(os.path.dirname(dst), exist_ok=True)
        open(dst, 'wb').write(mp3)
        print(f'{outrel} · {len(pcm)/sr:6.1f}초 · {len(mp3)/1024:6.0f}KB '
              f'· 문장 {len(files)} · 이득 {g:.2f}(rms {rms:.3f} peak {peak:.2f})')


main()
