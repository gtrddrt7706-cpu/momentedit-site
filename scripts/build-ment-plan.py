#!/usr/bin/env python3
# 멘트 개편 진행표를 «자동으로» 뽑는다 [MENT_PLAN] (2026-09-20)
#
# 손으로 클립 목록을 적으면 반드시 빠진다 — 이번에 실제로 17클립(18.7%)을 통째로 빠뜨렸고,
# 그 안에 사장님이 손수 고쳐 주신 문장이 하나 들어 있었다. 그래서 목록은 기계가 만든다.
#
#   python3 scripts/build-ment-plan.py > docs/plans/식순연구/진행표_멘트개편_20260920.md
import io, json, re, sys

M = json.load(io.open('docs/plans/식순연구/타입캐스트/manifest.json', encoding='utf-8'))
cue = io.open('assets/ritual-cue.js', encoding='utf-8').read()
b = re.search(r'var RETIRED = \{(.*?)\};', cue, re.S)
RET = set(re.findall(r"'([^']+)'\s*:\s*1", b.group(1))) if b else set()
V = M.get('voice', {})
syl = lambda s: len(re.findall(r'[가-힣]', s))

# ★★[SLUG_NOT_KEY 2026-09-20] 클립의 열쇠는 `file` 이 **아니다**. 슬러그가 여덟 쌍 겹친다 —
#   entry-A~F 여섯 쌍(당일 나레이션 vs 입장 인사)과 letter-parent·letter-each 두 쌍.
#   letter-parent 는 cast 쪽이 «신부가 부모님께 읽는 편지»이고, narration 쪽은
#   우성이 「지금 직접 읽어 주시면 됩니다」라고 넘겨주는 **진행 안내**다. 전혀 다른 글이다.
#   `no` 도 유일하지 않다(27 이 둘). 그래서 **(dir, file)** 로 잡는다.
#   ★실제 사고: 이 파일 첫 판이 file 로만 걸러 재작성 목록에 우성 두 줄이 끼었고,
#     「8묶음 79문장 · 전부 미리듣기」라고 적혔다(참값은 6묶음 75문장).
#     그 전에 `{c['file']: c}` 딕셔너리로 확인할 때는 뒤엣것이 앞엣것을 덮어써서 안 보였다.
#     ★사본을 재면 이렇게 조용히 틀린다 — 겹침은 Counter 로 세어야 보인다.

# [LETTER_REWRITE] 2026-09-20 사장님 「어머니 아버지 신랑 신부 편지부분도 전부 다시 짤거야」
#   + 실청에서 같은 판정(억지감동·스토리 어색)을 이미 받은 둘.  글을 새로 짠다.
CAST = 'assets/audio/cast'
REWRITE = {(CAST, 'bless-father'): '아버지 덕담', (CAST, 'bless-mother'): '어머니 덕담',
           (CAST, 'letter-parent'): '신부 → 부모님', (CAST, 'letter-each'): '신랑 → 신부',
           (CAST, 'tribute'): '헌정(신랑)', (CAST, 'tribute-reply'): '어머니 답사'}
key = lambda c: ((c.get('dir') or ''), c['file'])
# 사장님이 실청에서 직접 짚은 자리 (문면을 고쳐 주신 것 포함)
OWNER = {'narr-vow-in', 'narr-vow-out', 'narr-ring-out', 'narr-declare-family-intro',
         'narr-bless-end-long', 'letter-parent', 'letter-each', 'letter-both', 'tribute-in',
         'toast-cake', 'toast-both', 'toast-toast', 'toast-both-b', 'narr-entry-out',
         'narr-entry-out-B', 'narr-entry-out-C', 'narr-entry-out-D', 'narr-entry-out-E',
         'narr-entry-out-F', 'entry-A', 'entry-B', 'entry-C', 'entry-D', 'entry-E', 'entry-F',
         'declare-ask-b', 'bless-father', 'bless-mother', 'tribute', 'toast', 'tribute-reply',
         'welcome-groom', 'vow-bride'}

def end(t):
    t = t.strip().rstrip('.!?…')
    if re.search(r'니다$', t): return '다'
    if re.search(r'(세요|어요|아요|예요|에요|고요|네요|군요|요)$', t): return '요'
    return '기타'

def run(c):
    es = [end(s['text']) for s in c['sents']]
    if len(es) < 2: return 1
    best = cur = 1
    for i in range(1, len(es)):
        cur = cur + 1 if es[i] == es[i - 1] else 1
        best = max(best, cur)
    return best

live = [c for c in M['clips'] if not c.get('mix') and c['file'] not in RET]
# [SLUG_NOT_KEY] 겹침이 늘거나 줄면 멈춘다 — 모르는 채 목록을 내보내면 또 조용히 틀린다
from collections import Counter
_dup = sorted(k for k, v in Counter(c['file'] for c in live).items() if v > 1)
_EXPECT = ['entry-A', 'entry-B', 'entry-C', 'entry-D', 'entry-E', 'entry-F', 'letter-each', 'letter-parent']
if _dup != _EXPECT:
    sys.stderr.write(f'✗ [SLUG_NOT_KEY] 겹치는 슬러그가 달라졌습니다\n  지금: {_dup}\n  전에: {_EXPECT}\n'
                     '  → (dir, file) 열쇠와 REWRITE 목록을 다시 보고 이 기대값을 고치세요.\n')
    sys.exit(1)
o = sys.stdout.write
o('# 진행표 — 멘트 개편 (2026-09-20)\n\n')
o('★**자동 생성이다. 손으로 클립을 적지 않는다** — 손 목록은 반드시 빠진다'
  '(이번에 17클립을 그렇게 빠뜨렸고 그 안에 사장님이 고쳐 주신 문장이 있었다).\n')
o('```\npython3 scripts/build-ment-plan.py > docs/plans/식순연구/진행표_멘트개편_20260920.md\n```\n\n')
o('체크 칸 뜻 — `[ ]` 아직 · `[x]` 글 고침 · `[s]` 소리까지 받음 · `[-]` 손 안 댐(이유 적기)\n\n')

o('## 1. ★전면 재작성 — 글을 새로 짠다 [LETTER_REWRITE]\n\n')
o('사장님 지시 「어머니 아버지 신랑 신부 편지부분도 전부 다시 짤거야」 + 실청에서 같은 판정을 받은 둘.\n')
o('어조 재녹음이 아니라 **문안을 처음부터** 다시 쓴다. 기준은 `편지_재작성_20260920.md`.\n\n')
o('| 체크 | 번호 | 클립 | 성우 | 문장 | 음절 | 무엇 |\n|---|---|---|---|---:|---:|---|\n')
rw = [c for c in live if key(c) in REWRITE]
for c in sorted(rw, key=lambda x: x['no']):
    o(f"| [ ] | {c['no']} | `{c['file']}` | {V.get(c.get('role'), '?')} | {len(c['sents'])} | "
      f"{sum(syl(s['text']) for s in c['sents'])} | {REWRITE[key(c)]} |\n")
o(f"\n**{len(rw)}묶음 {sum(len(c['sents']) for c in rw)}문장 "
  f"{sum(sum(syl(s['text']) for s in c['sents']) for c in rw)}음절** · 전부 미리듣기(`assets/audio/cast/`)\n\n")

o('## 2. 나머지 전부\n\n')
o('| 체크 | 번호 | 클립 | 성우 | 문장 | 음절 | 어미연속 | 사장님지적 | 층 |\n')
o('|---|---|---|---|---:|---:|---:|---|---|\n')
for c in sorted(live, key=lambda x: (0 if 'cast' not in (x.get('dir') or '') else 1, x['no'])):
    if key(c) in REWRITE: continue
    r = run(c)
    o(f"| [ ] | {c['no']} | `{c['file']}` | {V.get(c.get('role'), '?')} | {len(c['sents'])} | "
      f"{sum(syl(s['text']) for s in c['sents'])} | {r}{'⚠' if r >= 3 else ''} | "
      f"{'★' if c['file'] in OWNER else ''} | {'당일' if 'cast' not in (c.get('dir') or '') else '**미리듣기**'} |\n")

n = len(live)
o(f"\n**합 {n}클립** · 당일 {sum(1 for c in live if 'cast' not in (c.get('dir') or ''))} · "
  f"미리듣기 {sum(1 for c in live if 'cast' in (c.get('dir') or ''))}\n")
o(f"· 어미 3연속 이상 **{sum(1 for c in live if run(c) >= 3)}개** · "
  f"사장님이 지적한 것 **{sum(1 for c in live if c['file'] in OWNER)}개** · "
  f"전면 재작성 **{len(rw)}개**\n\n")
o('---\n\n## 3. 끝내기 전에 다시 잴 것 (집필 후 · 고치면 값이 바뀐다)\n\n')
o('```\npython3 scripts/audit/letter-formula.py   # 편지 여섯의 틀이 흩어졌나\n')
o('node scripts/check-narr-len.mjs           # 길이·문장 수와 주석이 맞나\n')
o('node scripts/audit/no-tradition.mjs       # 옛 의례 낱말 0건\n')
o('node scripts/audit/guest-ear.js damback   # 하객이 궁금할 것에 답이 있나\n')
o('sh scripts/gate.sh                        # 빨간 줄 0건이어야 한다\n```\n\n')
o('★**「~주시면 됩니다」를 다시 센다**(지금 14회 13클립). 상한을 안 정하면 다른 어미로 몰린다.\n')
o('★**「이어 들리는 순서」로도 어미 연속을 잰다** — 클립 단위로는 3연속인데 이어 들으면 7연속인 자리가 있다.\n')
