#!/usr/bin/env python3
# 검사기 자신을 검사한다 [CHECK_THE_CHECK] — 2026-09-20
#
# 왜 — 「빨강 없음」은 두 가지 뜻이다. ①정말 깨끗하다 ②검사가 안 잡는다.
#   0회차에서 편지 지표 네 개가 전부 0인데 실제로는 여섯 편이 같은 틀이었다.
#   그래서 초록을 믿기 전에, 일부러 틀린 글을 넣어 «빨개지는지»부터 본다.
import json, subprocess, sys, copy, tempfile, os, glob, io

# ★회차가 늘 때 여기를 안 고치면 시험이 조용히 헛돕니다 — 그 회차를 건드리는 고장은
#   파일에 반영이 안 되고, 검사는 «멀쩡한 글»을 보고 초록을 냅니다. 실제로 한 번 당했습니다.
#   그래서 목록을 손으로 적지 않고 폴더에서 긁습니다.
BASE = sorted(glob.glob('round[0-9].json'))
assert BASE, 'round*.json 을 못 찾았습니다'
BODY = '본문_여섯편.txt'

def run(mut=None):
    """mut = (파일, 클립번호, 문장i, 새 글) 또는 그 목록. 갈아 끼우고 검사를 돌린다."""
    muts = [] if mut is None else (mut if isinstance(mut, list) else [mut])
    tmp, args = [], []
    for f in BASE:
        d = json.load(open(f, encoding='utf-8'))
        for m in muts:
            if m[0] != f: continue
            for c in d['clips']:
                for s in c['sents']:
                    if (c['no'], s['i']) == (m[1], m[2]): s['new'] = m[3]
        h = tempfile.NamedTemporaryFile('w', suffix='.json', delete=False, encoding='utf-8')
        json.dump(d, h, ensure_ascii=False); h.close(); tmp.append(h.name); args.append(h.name)
    out = subprocess.run([sys.executable, 'check-copy.py', *args, BODY],
                         capture_output=True, text=True).stdout
    for f in tmp: os.unlink(f)
    return out

CASES = [
    # (이름, 갈아 끼울 글, 빨강/노랑에 나와야 할 말)
    ('검사2 섞임 — 부탁 어미가 한쪽으로 쏠리면',
     [('round2.json', '15', 2, '그대로 보고 계셔 주세요.'),
      ('round2.json', '16', 1, '박수로 축하해 주세요.'),
      ('round3.json', '21', 1, '준비되시면 읽어 주세요.'),
      ('round3.json', '30', 4, '두 사람에게 박수를 보내 주세요.'),
      ('round3.json', '34', 4, '제가 여쭙고 나면 다 같이 답해 주세요.')], '부탁 어미 쏠림'),
    ('검사19 얼림 — 얼린 줄이 클립에서 통째로 사라지면',
     ('round3.json', '34', 2, '다 같이 이렇게 답해 주시면 되겠습니다.'), '얼려 둔 줄'),
    ('검사6 겹침 — 배타가 아닌 두 클립이 같은 말을 하면',
     ('round2.json', '14', 0, '이제 두 분 손에 같은 것이 하나씩 생겼습니다.'), '클립 간 겹침'),
    # ★★[CASE_TIED_TO_BODY 2026-09-20] 이 케이스는 «본문 문면»에 묶여 있다. 본문이 바뀌면 조용히 헛돈다.
    #   실제로 그랬다 — 아버지 덕담이 사장님 지시로 「한 번 말렸다」→「선뜻 반기지 못했다」로 바뀌자
    #   「말렸던」이 겹칠 대상을 잃어 10/10 이 9/10 이 됐다. 검사는 멀쩡했고 시험이 낡은 것이다.
    #   ★본문에 묶인 케이스는 본문을 고친 그 커밋에서 함께 고친다(README 의 「항목을 넣으면
    #     그 항목이 빨개지는 고장도 넣어라」의 사촌이다 — 이쪽은 «넣어 둔 고장이 상해 간다»).
    ('검사5 선취 — 예고가 본문의 속을 먼저 말하면',
     ('round2.json', '13', 0, '두 사람이 서로에게 할 약속이 있습니다. 선뜻 반기지 못했던 결혼입니다.'), '선취'),
    ('검사18 되살림 — 사장님이 지우신 문장을 다른 자리에서',
     ('round2.json', '15', 2, '앉으신 자리에서 편히 보시면 됩니다.'), '되살린 말'),
    ('검사18 예약 — 성혼선언이 예약한 「큰 박수」를 반지가 먼저',
     ('round2.json', '16', 1, '큰 박수로 축하해 주십시오.'), '되살린 말'),
    ('검사19 얼림 — 게이트가 지키는 줄을 한 글자 다듬으면',
     ('round2.json', '16', 0, '이제 두 사람 손에 같은 것이 하나씩 생겼습니다.'), '얼려 둔 줄'),
    ('검사16 예우 — 높임 수식어를 군더더기로 빼면',
     ('round0.json', '22', 0, '오늘 예식의 문을, 부모님의 말씀으로 엽니다.'), '예우'),
    ('검사8 현장 전제 — 녹음이 볼 수 없는 것을 단정하면',
     ('round2.json', '15', 0, '앞자리에 반지가 놓여 있습니다.'), '현장 전제'),
    ('검사3 닳은 낱말 — 「천천히」를 한 번 더 쓰면',
     [('round2.json', '15', 2, '천천히 하셔도 되고, 천천히 보셔도 천천히 됩니다.'),
      ('round2.json', '13', 1, '천천히, 천천히 다듬어 온 말입니다.')], '닳은 낱말'),
]

base = run()
assert '빨강 없음' in base, '기준선이 이미 빨갛다 — 먼저 문안을 고칠 것'
print(f'기준선  빨강 없음 ✓  (회차 {len(BASE)}개: {", ".join(BASE)})\n')
bad = 0
for name, mut, want in CASES:
    out = run(mut)
    ok = want in out
    print(f"{'✓' if ok else '✗ 안 잡음'}  {name}")
    if not ok:
        bad += 1
        print('    ─ 검사가 이 고장을 못 봅니다. 이 자리는 사람이 눈으로 봐야 합니다.')
print(f"\n일부러 넣은 고장 {len(CASES)}개 중 {len(CASES)-bad}개를 잡았습니다.")
sys.exit(1 if bad else 0)
