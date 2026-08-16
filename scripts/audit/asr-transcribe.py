#!/usr/bin/env python3
# 소리를 **글로 받아 적는다** — 대장과 맞대기 위한 유일한 실물 증거 [ASR_TRUTH]
#
#   python3 scripts/audit/asr-transcribe.py [--model small] [--out _asr/heard.json]
#
# ★왜 필요한가 — 2026-08-16 사용자
#   *"지금 실제 멘트랑 적혀있는 나레이션 문구랑 안 맞는게 많아 점검해봐"*
#   이 저장소의 모든 글↔글 대조가 「어긋남 0」이라고 말하는 동안, 스피커에서는 다른 말이 났다.
#
# ★왜 여태 못 잡았나 — _recorded.json 의 **씨앗**이 대장에서 떴다
#   RECORDED_TRUTH 는 「실제로 녹음된 글」을 따로 두자는 처방이었는데, 그 파일의 첫 값은
#   그 시점의 manifest 를 그대로 복사한 것이다. 그러니 옛 클립에 대해서는 A=A 다.
#   대조는 늘 초록이고, mp3 만 옛말을 한다. **글끼리 아무리 촘촘히 맞대도 소리를 못 본다.**
#
# ★그래서 소리를 글로 바꾼다. 이것이 이 저장소에서 «소리 쪽»의 첫 실물 증거다.
#   ★받아쓰기는 틀린다 — 그래서 판정하지 않고 **적어만 둔다.** 닮은 정도를 함께 남겨
#   사람이 어느 것을 먼저 들어 볼지 고르게 한다. 최종 판정은 귀가 한다 [CANT_HEAR].
import argparse, json, os, re, sys, difflib, time

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
ap = argparse.ArgumentParser()
ap.add_argument('--model', default='small')      # tiny/base/small/medium
ap.add_argument('--out', default=os.path.join(ROOT, '_asr', 'heard.json'))
ap.add_argument('--only', default='')            # 슬러그 일부만
ap.add_argument('--score', action='store_true')  # 이미 받아 적은 것에서 점수만 다시 낸다
a = ap.parse_args()

man = json.load(open(os.path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json'), encoding='utf-8'))
def src(c):
    for d in ('narration', 'cast'):
        p = os.path.join(ROOT, 'assets/audio', d, f"{c['no']}_{c['file']}.mp3")
        if os.path.exists(p): return p
    return ''

norm = lambda s: re.sub(r'[^0-9A-Za-z가-힣]+', '', str(s or ''))

# ★[IN_ORDER_COVER] 「이 문장이 저 글 안에 **차례대로** 얼마나 들어 있나」
#   ─ 글자 주머니로 세면 안 된다. 한국어는 흔한 글자가 많아 «전혀 다른 문장»도 반쯤 닮게 나온다
#     (실측: 주머니 방식으로 재니 105클립 중 91개가 「문장 빠짐」으로 뜨는 헛경보가 났다).
#   ─ 차례를 지켜 겹치는 만큼만 센다(difflib 의 matching blocks). 실측 분리가 뚜렷하다:
#       들어 있는 문장 0.82~1.00  ·  통째로 빠진 문장 0.12~0.62
#   ─ 뒤집어서도 잰다(rev) — 소리에 «대본에 없는 말»이 붙어 있으면 여기서 떨어진다.
def cover(q, H):
    q, H = norm(q), norm(H)
    if not q or not H: return 0.0
    m = difflib.SequenceMatcher(None, q, H, autojunk=False)
    return round(sum(b.size for b in m.get_matching_blocks()) / len(q), 3)

model = None
if not a.score:
    from faster_whisper import WhisperModel
    model = WhisperModel(a.model, device='cpu', compute_type='int8')

os.makedirs(os.path.dirname(a.out), exist_ok=True)
out = {'_왜': '소리를 받아 적은 것. 받아쓰기는 틀릴 수 있으므로 판정이 아니라 «먼저 들어 볼 순서»를 정하는 데 쓴다.',
       '_모델': a.model, 'clips': {}}
if os.path.exists(a.out):
    try: out['clips'] = json.load(open(a.out, encoding='utf-8')).get('clips', {})
    except Exception: pass

todo = [c for c in man['clips'] if src(c) and (not a.only or a.only in c['file'])]
t0 = time.time()
for i, c in enumerate(todo, 1):
    cid = f"{c['no']}_{c['file']}"
    if cid in out['clips'] and not a.score:
        continue
    if a.score:
        e = out['clips'].get(cid)
        if not e: continue
        e['sent'] = [{'t': s['text'], 'cov': cover(s['text'], e['heard'])} for s in c.get('sents', [])]
        e['rev'] = cover(e['heard'], e['want'])
        continue
    segs, _ = model.transcribe(src(c), language='ko', beam_size=5, vad_filter=False)
    heard = ' '.join(s.text.strip() for s in segs).strip()
    want = ' '.join(s['text'] for s in c.get('sents', []))
    r = difflib.SequenceMatcher(None, norm(want), norm(heard)).ratio()
    out['clips'][cid] = {'want': want, 'heard': heard, 'ratio': round(r, 3),
                         'sent': [{'t': s['text'], 'cov': cover(s['text'], heard)} for s in c.get('sents', [])],
                         'rev': cover(heard, want)}
    print(f"[{i}/{len(todo)}] {cid}  닮음 {r:.2f}  {int(time.time()-t0)}s", flush=True)
    json.dump(out, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(out, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)   # ★--score 모드도 반드시 쓴다
print(f"→ {a.out} ({len(out['clips'])}클립 · {int(time.time()-t0)}초)")
