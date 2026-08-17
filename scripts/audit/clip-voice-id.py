#!/usr/bin/env python3
# 조립된 mp3 가 **대장에 적힌 성우의 목소리인가** [VOICE_ID]
#
#   python3 scripts/audit/clip-voice-id.py                전수(107클립)
#   python3 scripts/audit/clip-voice-id.py --only 84_     한 자리만
#
# ★왜 만드나 — 2026-08-17 사용자 *"나래이션 성우 각각맞게 입힌거지 ?"*
#   대장(manifest.voice[role])과 붙여넣기 파일을 맞대는 검사는 이미 있다. 그런데 그 둘은
#   **둘 다 글**이다. 사고가 정확히 그 틈에서 났다 — 붙여넣기 파일을 손으로 쓰면서 화자를
#   「우성」으로 적었고 대장은 처음부터 「잔희」였다. 글끼리는 아무 데도 안 걸렸고 사람이 귀로 잡았다
#   (PHOTO_ASK 2026-08-16). ★그래서 여기서는 **mp3 그 자체**를 잰다. 글이 아니라 파형이다.
#   ASR 이 «무슨 말을 하나»를 실물로 가져왔듯(ASR_TRUTH), 이건 «누가 말하나»를 실물로 가져온다.
#
# ★두 가지를 잰다 — 하나로는 못 가른다
#   ① 기본주파수(F0) 중앙값 — 자기상관 · 70~350Hz · 40ms 창 · 20ms 홉 · 소리 있는 프레임만
#      ★F0 만으로는 사람을 못 지목한다. 실측: 「주하(어머님)」 145Hz 와 「우성」 151Hz 는 거의 같다.
#        높낮이가 닮은 두 사람은 흔하다. 그래서 F0 는 «덩어리에서 혼자 떨어졌나»만 본다.
#   ② 음색(장기 평균 멜 스펙트럼 24밴드, 평균 차감 후 정규화) — 목소리의 «결»이다.
#      같은 성우로 적힌 클립들의 평균(중심)을 만들고, 클립마다 **어느 중심에 가장 가까운지** 본다.
#      ★자기 클립은 중심에서 빼고 잰다(leave-one-out). 안 빼면 자기가 자기를 끌어당겨
#        클립이 적은 성우일수록 «무조건 맞다»가 나온다 — 검사가 아니라 거울이 된다.
#
# ★못 재는 자리를 «통과»로 세지 않는다
#   클립이 하나뿐인 성우(권일·주하·영목·김호인)는 뺄 중심이 없어 leave-one-out 이 성립하지 않는다.
#   그런 자리는 **판정 불가**로 따로 세어 적는다. 다른 성우 중심들과의 거리만 참고로 찍는다.
#
# ★합창(mix)은 뺀다 — 두 목소리가 겹친 자리라 «한 사람»이 아니다.
# ★화자가 '신랑|신부'처럼 겹친 클립(ENTRY_ALT)도 뺀다 — 한 클립 안에서 사람이 바뀐다.
#
# ★종료 코드 [CANT_LOOK] 0 통과 · 1 재서 틀림 · 2 재지 못함
import json
import os
import subprocess
import sys

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MAN = os.path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json')
SR = 16000
LO, HI = 70, 350          # 사람 목소리 기본주파수 범위
NF, NMEL = 512, 24


def die(m, c=2):
    print('✗ ' + m, file=sys.stderr)
    sys.exit(c)


def _melfb():
    f2m = lambda f: 2595 * np.log10(1 + f / 700.0)
    m2f = lambda m: 700 * (10 ** (m / 2595.0) - 1)
    edges = m2f(np.linspace(f2m(80), f2m(7000), NMEL + 2))
    b = np.floor((NF + 1) * edges / SR).astype(int)
    fb = np.zeros((NMEL, NF // 2 + 1))
    for i in range(NMEL):
        a, c, d = b[i], b[i + 1], b[i + 2]
        for k in range(a, c):
            fb[i, k] = (k - a) / max(1, c - a)
        for k in range(c, d):
            fb[i, k] = (d - k) / max(1, d - c)
    return fb


FB = _melfb()


def pcm(path):
    p = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 's16le',
                        '-acodec', 'pcm_s16le', '-ac', '1', '-ar', str(SR), '-'],
                       capture_output=True)
    if p.returncode != 0 or not p.stdout:
        return np.zeros(0)
    return np.frombuffer(p.stdout, dtype='<i2').astype(np.float64) / 32768.0


def f0_median(x):
    if x.size < SR // 4:
        return 0.0
    win, hop = int(SR * 0.040), int(SR * 0.020)
    lag_lo, lag_hi = SR // HI, SR // LO
    peak = np.abs(x).max() or 1.0
    out = []
    for s in range(0, x.size - win, hop):
        fr = x[s:s + win]
        if np.sqrt(np.mean(fr * fr)) < 0.04 * peak:     # 무음·숨소리는 뺀다
            continue
        fr = fr - fr.mean()
        ac = np.correlate(fr, fr, 'full')[win - 1:]
        if ac[0] <= 0:
            continue
        seg = ac[lag_lo:lag_hi]
        if seg.size < 3:
            continue
        k = int(np.argmax(seg))
        if seg[k] < 0.30 * ac[0]:      # 봉우리가 얕으면 «음정 없는 소리»(잡음·마찰음)로 보고 버린다
            continue
        out.append(SR / float(lag_lo + k))
    return float(np.median(out)) if len(out) >= 10 else 0.0


def timbre(x):
    if x.size < SR // 4:
        return None
    win, hop = NF, NF // 2
    w = np.hanning(win)
    peak = np.abs(x).max() or 1.0
    acc = []
    for s in range(0, x.size - win, hop):
        fr = x[s:s + win]
        if np.sqrt(np.mean(fr * fr)) < 0.05 * peak:
            continue
        S = np.abs(np.fft.rfft(fr * w)) ** 2
        acc.append(np.log(FB @ S + 1e-10))
    if len(acc) < 10:
        return None
    m = np.mean(acc, axis=0)
    m = m - m.mean()                  # 음량·채널 차이를 지운다(켑스트럼 평균 차감과 같은 뜻)
    n = np.linalg.norm(m)
    return m / n if n else None


def main():
    only = None
    if '--only' in sys.argv:
        only = sys.argv[sys.argv.index('--only') + 1]
    if not os.path.exists(MAN):
        die('manifest.json 이 없다')
    man = json.load(open(MAN, encoding='utf-8'))
    V = man.get('voice', {})

    rows = []
    for c in man['clips']:
        cid = '%02d_%s' % (int(c['no']), c['file'])
        if only and only not in cid:
            continue
        src = ''
        for d in ('narration', 'cast'):
            p = os.path.join(ROOT, 'assets/audio', d, cid + '.mp3')
            if os.path.exists(p):
                src = p
                break
        if not src:
            continue
        role = c.get('role', '')            # ★[EXPORT_TRUTH] 화자는 대장에서만 읽는다
        x = pcm(src)
        rows.append({'id': cid, 'who': V.get(role, role), 'f0': f0_median(x),
                     'v': timbre(x), 'mix': bool(c.get('mix')), 'alt': '|' in str(role)})
    if not rows:
        die('잰 클립이 없다 — mp3 가 있는지 보라')

    solo = [r for r in rows if not r['mix'] and not r['alt'] and r['v'] is not None]
    grp = {}
    for r in solo:
        grp.setdefault(r['who'], []).append(r)

    print('── ① 기본주파수 덩어리 [VOICE_ID] · 잰 클립 %d개' % len(rows))
    med = {}
    for who in sorted(grp, key=lambda w: -len(grp[w])):
        v = sorted(x['f0'] for x in grp[who] if x['f0'] > 0)
        if not v:
            continue
        med[who] = float(np.median(v))
        print('  %-5s %2d클립 · 중앙 %5.1fHz · 폭 %5.1f~%5.1f' % (who, len(v), med[who], v[0], v[-1]))
    far = []
    for who, g in grp.items():
        m = med.get(who)
        if m is None:
            continue
        for r in g:
            if r['f0'] > 0 and abs(r['f0'] - m) > max(35.0, 0.28 * m):
                far.append((r, m))
    if far:
        for r, m in sorted(far, key=lambda t: t[0]['id']):
            print('  · %-26s 적힘 %-4s(중앙 %.0fHz) · 잰 값 %.0fHz — 덩어리에서 %+.0fHz'
                  % (r['id'], r['who'], m, r['f0'], r['f0'] - m))
    else:
        print('  ✓ 덩어리에서 떨어진 클립 없음')

    print('\n── ② 음색 대조 (leave-one-out) — 클립마다 어느 성우 중심에 가장 가까운가')
    bad, unknown = [], []
    for r in solo:
        cent = {}
        for who, g in grp.items():
            pool = [x['v'] for x in g if x is not r]
            if not pool:
                continue
            c = np.mean(pool, axis=0)
            n = np.linalg.norm(c)
            if n:
                cent[who] = c / n
        if r['who'] not in cent:              # 자기 클립 하나뿐 → 뺄 중심이 없다
            unknown.append(r)
            continue
        d = sorted(((float(r['v'] @ c), w) for w, c in cent.items()), reverse=True)
        mine = dict((w, s) for s, w in d)[r['who']]
        if d[0][1] != r['who']:
            bad.append((r, d[0][1], d[0][0], mine))
    ok = len(solo) - len(bad) - len(unknown)
    print('  ✓ 적힌 성우가 가장 가까운 클립 %d개' % ok)
    for r, w, s, mine in sorted(bad, key=lambda t: t[0]['id']):
        print('  ★ %-26s 적힘 %-4s → 가장 가까운 목소리 %-4s (%.3f · 적힌 쪽 %.3f)'
              % (r['id'], r['who'], w, s, mine))
    if unknown:
        print('  ? 판정 불가 %d개 — 그 성우의 클립이 하나뿐이라 뺄 중심이 없다:' % len(unknown))
        for r in sorted(unknown, key=lambda x: x['id']):
            others = sorted(((float(r['v'] @ (np.mean([y['v'] for y in g], axis=0)
                                              / (np.linalg.norm(np.mean([y['v'] for y in g], axis=0)) or 1.))), w)
                             for w, g in grp.items() if w != r['who']), reverse=True)
            print('     %-26s 적힘 %-4s · F0 %.0fHz · 가장 닮은 남 %s(%.2f)'
                  % (r['id'], r['who'], r['f0'], others[0][1], others[0][0]))

    skip = [r for r in rows if r['mix'] or r['alt']]
    if skip:
        print('\n· 한 사람이 아니라 뺀 클립 %d개(합창·번갈아 읽기): %s'
              % (len(skip), ' · '.join(x['id'] for x in skip)))

    if bad:
        print('\n✗ 대장에 적힌 성우와 다른 목소리로 보이는 클립이 %d개 있습니다.' % len(bad))
        sys.exit(1)
    print('\n✓ 음색으로 판정한 %d클립 전부 대장에 적힌 성우와 맞습니다 (판정 불가 %d · 제외 %d).'
          % (ok, len(unknown), len(skip)))
    sys.exit(0)


if __name__ == '__main__':
    main()
