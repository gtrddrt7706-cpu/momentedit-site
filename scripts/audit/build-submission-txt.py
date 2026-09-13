#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""제출용 문안 txt 를 정본에서 다시 만든다 [SUBMIT_BUILD]

왜 있나 (2026-09-13)
  제출용 txt 를 손으로 고쳐 왔다. 그러면 «문면은 고쳤는데 자수는 안 고친» 판이 생긴다.
  [RULE_MEASURED] 가 말하는 바로 그 사고다 — 재고 나서 고치면 그 값은 더 이상 그 문장의 값이 아니다.
  그래서 문면과 자수를 «같은 추출»에서 함께 만든다. 둘이 갈라질 수가 없다.
  머리말(붙여넣기 절차)은 정본이 아니라 이 파일에 있으므로 기존 txt 에서 그대로 물려받는다.

쓰는 법: python3 scripts/audit/build-submission-txt.py            → 다시 만든다
        python3 scripts/audit/build-submission-txt.py --check    → 갈라졌는지만 본다(쓰지 않음)
        merge-guard 가 --check 를 돌린다. 정본을 고치고 txt 를 안 만들면 푸시가 막힌다.
"""
import io, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DOC = os.path.join(ROOT, 'docs/국가지원금/모두의창업_신청서_최종본.md')
TXT = os.path.join(ROOT, 'docs/국가지원금/제출용_문안_20260912.txt')
BAR = '=' * 64

SECTIONS = [
    ('Q1',   'Q1. 한 줄 소개',            100),
    ('Q2',   'Q2. 아이디어 배경',        2000),
    ('Q3-1', 'Q3-1. 차별점·문제 해결',   2000),
    ('Q3-2', 'Q3-2. 수익 모델',          2000),
    ('Q4-1', 'Q4-1. 사업화 계획',        2000),
    ('Q4-2', 'Q4-2. 멘토 요청',          1000),
    ('Q8',   'Q8. 본인 역량',            2000),
    ('Q10',  'Q10. 공개 자랑 (선택)',     100),
]


def body(t, q):
    h = '## %s.' % q
    i = t.index(h); j = t.index('```', i); k = t.index('```', j + 3)
    return t[j + 4:k].strip()


def head_block(path):
    """기존 txt 의 머리말(첫 구분선 앞까지)을 그대로 물려받는다.
    붙여넣기 절차·회수하기 경고는 정본에 없는 정보라 여기서만 산다."""
    if not os.path.exists(path):
        raise SystemExit('기존 txt 가 없다 — 머리말을 물려받을 수 없다: %s' % path)
    out = []
    for ln in io.open(path, encoding='utf-8'):
        if ln.startswith(BAR):
            break
        out.append(ln.rstrip('\n'))
    while out and not out[-1].strip():
        out.pop()
    return out


def main(check=False):
    t = io.open(DOC, encoding='utf-8').read()
    L = list(head_block(TXT))
    summary = []
    for q, label, lim in SECTIONS:
        b = body(t, q)
        n = len(b)
        w = n + b.count('\n')          # \n → \r\n 이면 문단마다 1자 증가
        if w > lim:
            print('FAIL build-submission-txt: %s 최악 %d자 > 한도 %d자' % (q, w, lim))
            return 1
        L += ['', BAR,
              '%s   %s / %s자  (최악 %s · 여유 %s)'
              % (label, format(n, ','), format(lim, ','), format(w, ','), format(lim - w, ',')),
              BAR, '', b]
        summary.append('%s %s' % (q, format(n, ',')))
    L += ['', BAR, '자수 요약  ' + ' · '.join(summary), BAR, '']
    made = '\n'.join(L)
    if check:
        now = io.open(TXT, encoding='utf-8').read()
        if now != made:
            print('FAIL build-submission-txt: 제출용 txt 가 정본과 갈라졌다')
            print('  - 정본을 고치고 txt 를 다시 안 만들었다.')
            print('  - 고치는 법: python3 scripts/audit/build-submission-txt.py')
            return 1
        print('ok build-submission-txt: 제출용 txt 가 정본과 같다')
        return 0
    io.open(TXT, 'w', encoding='utf-8').write(made)
    print('ok build-submission-txt: 8문항을 정본에서 다시 만들었다 — ' + ' · '.join(summary))
    return 0


if __name__ == '__main__':
    sys.exit(main(check='--check' in sys.argv[1:]))
