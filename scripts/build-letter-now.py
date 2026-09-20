#!/usr/bin/env python3
# 편지·덕담 여섯의 «지금 글»을 한 파일로 뽑는다 [LETTER_NOW] (2026-09-20)
#
# 코워크에 재작성을 맡기려면 「무엇을 고치나」가 손에 있어야 한다. 원천
# docs/plans/식순연구/배역_예시_대사.txt 는 345줄에 배역 전체가 섞여 있어 그대로 넘기기 나쁘다.
# ★자동 생성이다. 손으로 옮겨 적지 않는다 — 옮겨 적으면 그 자리에서 뜻이 바뀐다
#   (실청 원문을 요약해 옮겼다가 없는 모순을 만든 적이 있다).
#   python3 scripts/build-letter-now.py > docs/plans/식순연구/편지_지금글_여섯편.md
import io, json, re, sys

M = json.load(io.open('docs/plans/식순연구/타입캐스트/manifest.json', encoding='utf-8'))
V = M.get('voice', {})
CAST = 'assets/audio/cast'
SIX = [('letter-parent', '신부 → 부모님 편지', '실청 「어조전부 다시녹음」'),
       ('letter-each', '신랑 → 신부 편지', '실청 「어조전부 다시녹음」'),
       ('bless-father', '아버지 덕담', '실청 「다 로 끝나는 모자란듯한 컨셉 · 억지감동」'),
       ('bless-mother', '어머니 덕담', '실청 「억지감동멘트 개선 전부」'),
       ('tribute', '헌정(신랑 → 부모님)', '실청 「억지 감동멘트 스토리 어색 전부」'),
       ('tribute-reply', '어머니 답사', '실청 「멘트 구려 · 스토리 지어서 수정」')]
by = {c['file']: c for c in M['clips'] if not c.get('mix') and (c.get('dir') or '') == CAST}
syl = lambda s: len(re.findall(r'[가-힣]', s))

def end(t):
    t = t.strip().rstrip('.!?…')
    if re.search(r'니다$', t): return '다(합쇼)'
    if re.search(r'(세요|어요|아요|예요|에요|고요|네요|군요|요)$', t): return '요(해요)'
    if re.search(r'(다|라)$', t): return '다(반말·평서)'
    return '기타'

o = sys.stdout.write
o('# 편지·덕담 여섯 — 지금 글 전문 [LETTER_NOW]\n\n')
o('재작성 대상 **6묶음 75문장**. 이 글을 버리고 새로 짠다.\n')
o('무엇이 왜 문제인지는 `편지_재작성_20260920.md` 와 `진단/진단_3_편지덕담헌정.md`.\n\n')
o('★자동 생성이다(`python3 scripts/build-letter-now.py`). 원천은 `배역_예시_대사.txt`.\n\n')
o('| 묶음 | 클립 | 성우 | 말단계 | 문장 | 음절 |\n|---|---|---|---|---:|---:|\n')
for f, name, _ in SIX:
    c = by[f]
    lv = sorted({end(s['text']) for s in c['sents'] if syl(s['text']) > 6})
    o(f"| {name} | `{c['no']}_{f}` | {V.get(c.get('role'), '?')} | {' · '.join(lv)} | "
      f"{len(c['sents'])} | {sum(syl(s['text']) for s in c['sents'])} |\n")
o('\n★**말단계가 일부러 다르다. 통일하지 말 것.**\n\n---\n')
for f, name, said in SIX:
    c = by[f]
    o(f"\n## {c['no']}. {name} — `{f}`\n\n")
    o(f"성우 **{V.get(c.get('role'), '?')}** · {len(c['sents'])}문장 · "
      f"{sum(syl(s['text']) for s in c['sents'])}음절\n\n")
    o(f"> 사장님 판정: {said}\n\n")
    o('```\n')
    for i, s in enumerate(c['sents'], 1):
        o(f"{i:>2}. {s['text']}\n")
    o('```\n')
    first, last = c['sents'][0]['text'], c['sents'][-1]['text']
    o(f"\n- 여는 방식: {'호명' if syl(first) <= 12 and re.match(r'^[가-힣]{1,4}(아|야|,|님)', first) else '장면·기타'}"
      f" 「{first}」\n")
    o(f"- 닫는 방식: {syl(last)}음절 {'짧은 여운' if syl(last) <= 16 else '긴 문장'} 「{last}」\n")
