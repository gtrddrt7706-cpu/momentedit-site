#!/usr/bin/env python3
# [TONE_TEXT_GATE] 코워크가 보낸 어조 문면이 «정말로» 저장소에 들어갔는지 매번 대조한다 (2026-09-20)
#
# ★★왜 — 열여덟 건이 통째로 샜다
#   「넣었습니다」라고 답하고 **아무도 확인하지 않았다.** 코워크가 열흘 뒤 자기 파일과
#   내 산출물을 한 줄씩 맞춰 보고서야 드러났다. 사람이 확인하는 자리는 언젠가 빈다.
#   그 사이 [ENTRY_PROMOTE] 가 돌아 **고치기 전 문면이 기본값으로 승격**됐다 — 손실이 커졌다.
#
# ★이 검사는 [LOCKED_PROPOSAL] 의 **반대쪽**이다
#   그쪽 : 들어온 제안이 «잠근 결정»을 깨는가   (넣기 전에 본다)
#   이쪽 : 받기로 한 문면이 «실제로 들어갔는가» (넣은 뒤에 본다)
#   둘이 짝이라야 「받은 것 = 넣은 것」이 닫힌다 [DECISION_GATE].
#
# ★★[SPOT_NOT_BLOB] «문자열이 어딘가 있다»로 재면 안 된다. **그 자리의 값을 꺼내** 본다.
#   파일을 통째로 이어 붙여 `in` 으로 찾는 판을 먼저 만들었다가 **깨뜨려 보다 세 번 연속 통과했다**:
#     ① 한 파일만 옛 것으로 되돌림 → 다른 파일에 새 문면이 남아 가려 줬다
#     ② 옛 문면이 새 문면의 앞부분인 자리 → 옛 것이 영원히 «남아 있는» 것으로 보였다 [SUB_TRAP]
#     ③ 덧붙인 문장을 지움 → **그 글자가 다른 자리(both 조각)에 같이 있어** 통과했다
#   셋 다 원인이 하나다 — «어딘가»를 물었지 «그 자리»를 안 물었다.
#   그래서 pick-list 가 자리별로 뽑아 주는 «고객이 실제로 보는 문면»과 한 줄씩 맞춘다.
#
#   python3 scripts/audit/tone-text-applied.py
import io, csv, re, sys, subprocess

TSV = 'docs/plans/식순연구/어조표_문면_대조.tsv'
EV  = {'입장': 'entry', '성혼 선언': 'declare', '편지 낭독': 'letter',
       '부모님 헌정': 'tribute', '축배·케이크': 'toast'}

try:
    rows = list(csv.DictReader(io.open(TSV, encoding='utf-8'), delimiter='\t'))
except IOError:
    print('[TONE_TEXT_GATE] 대조표가 없다 — 건너뜀'); sys.exit(0)

# ★★[PARSE_ZERO] 표 모양이 바뀌어 0줄을 읽고 «조용히 통과»하는 것이 가장 나쁘다 [REVIEW_GATE]
if len(rows) < 10 or '갈 문면' not in rows[0]:
    print('[TONE_TEXT_GATE] FAIL 대조표를 %d줄밖에 못 읽었다 — 표 모양이 깨졌다' % len(rows)); sys.exit(1)

try:
    out = subprocess.check_output(['node', 'scripts/audit/pick-list.mjs'],
                                  stderr=subprocess.DEVNULL).decode('utf-8')
except Exception as e:
    print('[TONE_TEXT_GATE] FAIL pick-list 를 못 돌렸다 —', e); sys.exit(1)

spot, ev = {}, None
for ln in out.splitlines():
    m = re.match(r'^##\s+(.+?)\s+`(\w+)`', ln)
    if m: ev = m.group(2); continue
    m = re.match(r'^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*[\d-]+\s*\|\s*(.+?)\s*\|$', ln)
    if m and ev and m.group(1) not in ('갈래', '---'):
        spot[(ev, m.group(1).strip(), m.group(2).strip())] = re.sub(r'\s+', ' ', m.group(3)).strip()

# ★[PARSE_ZERO] 자리표가 비면 모든 대조가 «자리 없음»으로 빠져나간다 — 그것도 막는다
if len(spot) < 20:
    print('[TONE_TEXT_GATE] FAIL pick-list 에서 자리를 %d개밖에 못 읽었다' % len(spot)); sys.exit(1)

norm = lambda s: re.sub(r'\s+', ' ', s).strip()
ok = later = bad = miss = 0
for r in rows:
    key = (r['이벤트'].strip(), r['갈래'].strip(), r['판'].strip())
    now, go = norm(r['지금 문면(저장소)']), norm(r['갈 문면'])
    tag = '%s·%s·%s' % key
    cur = spot.get(key)
    if cur is None:
        miss += 1; print('  FAIL %-22s 그 자리가 목록에 없다 — 갈래가 사라졌나' % tag); continue
    # 현행은 끝에 「신랑 신부, 입장!」 같은 고정 꼬리가 붙는다 — 앞부분만 견준다
    if   cur.startswith(go)  or cur == go:  ok += 1
    elif cur.startswith(now) or cur == now:
        bad += 1; print('  FAIL %-22s 아직 옛 문면이다' % tag)
    else:
        later += 1; print('  .... %-22s 그 뒤에 또 바뀐 자리로 본다' % tag)

print('[TONE_TEXT_GATE] 자리 %d개 · 대조 %d줄 — 반영 %d · 이후 재변경 %d · 미반영 %d · 자리없음 %d'
      % (len(spot), len(rows), ok, later, bad, miss))
sys.exit(1 if (bad or miss) else 0)
