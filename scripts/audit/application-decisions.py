#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""신청서 게이트 [DECISION_GATE] — 대표가 정한 것이 본문에 들어갔는가.

왜 있나 (2026-09-13)
  대표가 답해 준 두 가지(세 곳을 넘긴 이유 · 스마트스토어 1등)를 길게 칭찬만
  하고 파일에 넣지 않은 적이 있다. 칭찬은 반영이 아닌데 "처리했다"는 느낌은 남는다.
  대화는 저장소가 아니라 화제가 옮겨가면 사라지고, 파일엔 흔적이 없어 아무도 못 찾는다.
  누락을 잡은 건 대표가 물어봐 준 덕이었지 절차가 아니었다 → 사람이 지킬 규칙을
  없애고 푸시를 막는 게이트로 바꾼다(merge-guard 의 GATE_AT_EXIT 와 같은 취지).

검사 셋
  ① MUST  — 대장의 문자열이 본문에 있는가
  ② NEVER — 없어야 할 문자열이 본문에 없는가
  ③ 자수  — 줄바꿈이 \r\n 으로 저장되는 최악의 경우까지 한도 안인가
            (실측 2026-09-13: Q2 2,018자 · Q3-1 2,019자로 잘릴 상태였다.
             폼은 문단마다 1자를 더 먹는다. 문단이 많은 문항일수록 위험하다.)

종료코드 0=통과 1=실패. 인자 없음.
"""
import io, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DOC = os.path.join(ROOT, 'docs/국가지원금/모두의창업_신청서_최종본.md')
LEDGER = os.path.join(ROOT, 'docs/국가지원금/대표결정_반영대장.tsv')
LIMIT = {'Q1': 100, 'Q2': 2000, 'Q3-1': 2000, 'Q3-2': 2000,
         'Q4-1': 2000, 'Q4-2': 1000, 'Q8': 2000, 'Q10': 100}
def margin(lim):
    """최악의 경우에도 남겨 둘 여유 — 한도의 1%, 최소 2자.
    한도에 비례해야 한다. 100자 칸(Q1·Q10)은 문단이 하나라 CRLF 로 늘어날 여지가
    없고, 2,000자 칸은 문단이 열 개 넘어 늘어날 여지가 그만큼 크다.
    고정값 20자로 두면 Q1(여유 2자)이 멀쩡한데도 빨강이 된다 — 실측으로 확인."""
    return max(2, lim // 100)


def bodies(path):
    t = io.open(path, encoding='utf-8').read()
    out = {}
    for q in LIMIT:
        h = '## %s.' % q
        if h not in t:
            raise SystemExit('신청서에 %s 항목이 없다: %s' % (q, path))
        i = t.index(h); j = t.index('```', i); k = t.index('```', j + 3)
        out[q] = t[j + 4:k].strip()
    return out


def main():
    for p in (DOC, LEDGER):
        if not os.path.exists(p):
            print('FAIL application-decisions: 파일 없음 %s' % p); return 1
    B = bodies(DOC)
    ALL = ''.join(B.values())
    fail = []

    rows = 0
    for ln, raw in enumerate(io.open(LEDGER, encoding='utf-8'), 1):
        s = raw.rstrip('\n')
        if not s.strip() or s.lstrip().startswith('#'):
            continue
        parts = s.split('\t')
        if len(parts) < 5:
            fail.append('대장 %d행: 탭 5칸이 아니다 — %r' % (ln, s[:50])); continue
        kind, date, what, needle, q = (p.strip() for p in parts[:5])
        if not needle:
            fail.append('대장 %d행: 검증문자열이 비었다' % ln); continue
        rows += 1
        hay = ALL if q in ('전체', '') else B.get(q, ALL)
        c = hay.count(needle)
        if kind == 'MUST' and c == 0:
            fail.append('MUST 누락 [%s] %s — 「%s」 가 %s 본문에 없다' % (date, what, needle, q))
        elif kind == 'NEVER' and c > 0:
            fail.append('NEVER 위반 [%s] %s — 「%s」 가 %s 본문에 %d회 있다' % (date, what, needle, q, c))
        elif kind not in ('MUST', 'NEVER'):
            fail.append('대장 %d행: 종류가 MUST/NEVER 가 아니다 — %r' % (ln, kind))

    if rows == 0:
        fail.append('대장이 비었다 — 게이트가 아무것도 검사하지 않는다')

    for q, lim in LIMIT.items():
        b = B[q]
        worst = len(b) + b.count('\n')   # \n → \r\n 이면 문단마다 1자 증가
        if worst > lim:
            fail.append('자수 초과 %s — 최악 %d자 > 한도 %d자 (잘린다)' % (q, worst, lim))
        elif lim - worst < margin(lim):
            fail.append('자수 위험 %s — 최악 %d/%d, 여유 %d자 (%d자 미만)'
                        % (q, worst, lim, lim - worst, margin(lim)))

    if fail:
        print('FAIL application-decisions: %d건' % len(fail))
        for f in fail:
            print('  - ' + f)
        return 1
    print('ok application-decisions: 대표결정 %d건 반영 · 자수 8문항 최악의 경우도 한도 내' % rows)
    return 0


if __name__ == '__main__':
    sys.exit(main())
