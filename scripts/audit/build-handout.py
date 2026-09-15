# -*- coding: utf-8 -*-
"""[HANDOUT_BUILD] 정본 하나에서 대표에게 드릴 두 가지를 함께 만든다.
  ① 붙여넣기용_20260915.txt — 폼에 긁어 넣을 문안(빈 줄 없음 · 캡션 제자리)
  ② 모두의창업_2차_신청서_20260915.pdf 의 원본 HTML — 사진을 제자리에 넣은 전체본
따로 만들면 갈라진다([RULE_MEASURED]). 문면과 자수를 한 번에 같이 낸다.
PDF 렌더는 scripts/audit/handout-pdf.mjs 가 이어 받는다."""
import io, re, os, sys, base64
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DOC  = os.path.join(ROOT, 'docs/국가지원금/모두의창업_신청서_최종본.md')
SHOT = os.path.join(ROOT, 'docs/국가지원금/첨부사진')
OUT_TXT  = os.path.join(ROOT, 'docs/국가지원금/붙여넣기용_20260915.txt')
OUT_HTML = os.path.join(ROOT, '_handout.html')

QS   = ['Q1','Q2','Q3-1','Q3-2','Q4-1','Q4-2','Q8','Q10']
TITLE= {'Q1':'한 줄 소개','Q2':'아이디어 배경','Q3-1':'차별점과 문제 해결','Q3-2':'수익 모델',
        'Q4-1':'사업화 계획','Q4-2':'책임멘토 요청','Q8':'본인 역량','Q10':'공개 자랑'}
LIM  = lambda q: 100 if q in ('Q1','Q10') else 2000
CH   = {'Q1','Q2','Q3-1','Q4-1','Q4-2','Q8'}        # 2차 제출본 대비 바뀐 칸
# 캡션 번호 → 사진 파일. 번호는 본문 등장 순서와 같아야 한다(아래에서 검사한다).
FILES= {1:'07_Q2_가격.png', 2:'01_Q3-1_마이페이지.png', 3:'08_Q3-1_환불조항.png',
        4:'05_Q3-1_식순_2단안.png', 5:'02_Q3-1_라이브.png', 6:'04_Q3-1_좌석세팅표.png',
        7:'09_Q4-1_하객이_만나는화면.png', 8:'06_Q4-1_하객안내.png',
        9:'10_Q4-1_관리자.png', 10:'03_Q4-1_다이닝.png'}

T = io.open(DOC, encoding='utf-8').read()
def body(q):
    i=T.index('## %s.'%q); j=T.index('```',i); k=T.index('```',j+3)
    return re.sub(r'\n{2,}','\n', T[j+4:k].strip()).strip()

fail=[]
order=[]
for q in QS:
    order += [int(m) for m in re.findall(r'^사진 (\d+)\.', body(q), re.M)]
if order != sorted(order):
    fail.append('캡션 번호가 본문 등장 순서와 어긋난다: %s' % order)
if sorted(order) != sorted(FILES):
    fail.append('캡션 %s ↔ 사진표 %s 가 다르다' % (sorted(order), sorted(FILES)))
for n,f in FILES.items():
    if not os.path.exists(os.path.join(SHOT,f)): fail.append('사진 없음: %s'%f)
for q in QS:
    b=body(q); n=len(b)-b.count('\n'); worst=n+b.count('\n')
    if worst > LIM(q) - max(LIM(q)//100,2):
        fail.append('자수 위험 %s — 최악 %d/%d'%(q,worst,LIM(q)))
if '—' in ''.join(body(q) for q in QS):
    fail.append('전각 줄표(—) 가 본문에 있다 — 가운뎃점(·)을 쓴다')
if fail:
    for f in fail: print('⛔ '+f)
    sys.exit(1)

# ── ① 붙여넣기용 txt ───────────────────────────────────────────
L=[];A=L.append
A('모두의창업 2차 · 붙여넣기용 전체 (2026-09-15)'); A('')
A('【하는 법 — 칸마다 두 번】')
A('1) 「여기부터 복사」~「여기까지」 사이를 긁어 폼 칸에 붙여 넣습니다.')
A('   빈 줄은 미리 뺐습니다. 폼이 알아서 문단 간격을 줍니다. 굵게·소제목 버튼은 쓰지 마세요.')
A('2) 붙여 넣은 뒤 「사진 N.」으로 시작하는 줄의 맨 앞에 커서를 놓고 사진을 넣습니다.')
A('   사진이 그 캡션 바로 위에 들어갑니다. 캡션은 이미 자리에 있으니 따로 쓰실 것이 없습니다.')
A('3) 폼의 자수 카운터를 봅니다. 아래 자수는 캡션 글자까지 넣어 센 값입니다.'); A('')
A('【사진 10장 — 전체 문항 합산 한도라 이게 전부입니다】')
for n in sorted(FILES): A('  사진 %-2d  %s'%(n,FILES[n]))
A('')
A('■ 갈아 끼울 칸: '+' · '.join(q for q in QS if q in CH))
A('■ 그대로 둘 칸: '+' · '.join(q for q in QS if q not in CH)+'  (제출본과 한 글자도 다르지 않습니다)')
A('')
for q in QS:
    b=body(q); n=len(b)-b.count('\n'); worst=n+b.count('\n')
    pics=[int(m) for m in re.findall(r'^사진 (\d+)\.',b,re.M)]
    A('='*62)
    h='%s  %s   %s / %s자 (줄바꿈까지 세면 %s)'%(q,TITLE[q],format(n,','),format(LIM(q),','),format(worst,','))
    if pics: h+='   · 사진 '+'·'.join(map(str,pics))
    A(h)
    A('   '+('★수정 — 갈아 끼우세요' if q in CH else '✓그대로 — 손대지 마세요'))
    A('='*62)
    if q in CH:
        A('┌─ 여기부터 복사 '+'─'*42); A(b); A('└─ 여기까지 '+'─'*46)
        for p in pics: A('   · 「사진 %d.」 줄 맨 앞에  →  %s'%(p,FILES[p]))
    else:
        A('(제출본과 같습니다. 건드리지 않으셔도 됩니다.)')
    A('')
io.open(OUT_TXT,'w',encoding='utf-8').write('\n'.join(L))

# ── ② PDF 원본 HTML ───────────────────────────────────────────
b64=lambda n:'data:image/png;base64,'+base64.b64encode(open(os.path.join(SHOT,FILES[n]),'rb').read()).decode()
esc=lambda s: s.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')
H=['<meta charset="utf-8"><title>모두의창업 2차</title><style>','''
@page{size:A4;margin:18mm 16mm 16mm}
*{box-sizing:border-box} body{margin:0;font-family:'Noto Sans KR',sans-serif;color:#1a1a1a;
 font-size:10.2pt;line-height:1.75;-webkit-font-smoothing:antialiased}
.cover{text-align:center;padding-top:62mm;page-break-after:always}
.cover h1{font-size:23pt;font-weight:700;margin:0 0 6mm;letter-spacing:-.4pt}
.cover .sub{font-size:11pt;color:#555;line-height:2}
.cover .box{display:inline-block;margin-top:14mm;padding:6mm 10mm;border:1px solid #d8d4cc;
 border-radius:3mm;font-size:9.2pt;color:#444;text-align:left;line-height:2}
.toc{page-break-after:always}
h2.q{font-size:13pt;font-weight:700;margin:0 0 1mm;padding-bottom:2.2mm;
 border-bottom:1.6pt solid #4a3b2c;letter-spacing:-.3pt}
h2.q .num{color:#7a5c3e}
.meta{font-size:8.4pt;color:#777;margin:0 0 5mm}
.meta .tag{display:inline-block;padding:.4mm 2mm;border-radius:1mm;font-size:7.8pt;
 background:#f0ece4;color:#6b5237;margin-left:2mm}
.meta .same{background:#eef0ee;color:#5a6b5a}
section{page-break-before:always} section:first-of-type{page-break-before:auto}
p{margin:0 0 3.4mm;text-align:justify;word-break:keep-all}
figure{margin:5mm 0 6mm;page-break-inside:avoid;text-align:center}
figure img{max-width:100%;max-height:215mm;border:1px solid #e2ded6;border-radius:1.5mm}
/* 152mm 로 두면 세로 1.4배가 넘는 사진이 폭 103mm 로 쪼그라들어 글자가 안 보인다.
   215mm 면 A4 한 쪽(263mm)에 캡션까지 들어가고, 열 장 중 아홉이 글줄 폭을 채운다. */
figcaption{margin-top:2.5mm;font-size:8.8pt;color:#5c5c5c}
.tbl{width:100%;border-collapse:collapse;font-size:9.4pt;margin-top:6mm}
.tbl th,.tbl td{border-bottom:1px solid #e5e1d9;padding:2.4mm 2mm;text-align:left}
.tbl th{color:#666;font-weight:500;font-size:8.6pt;border-bottom:1.2pt solid #cfc8bc}
.tbl td.n{text-align:right;font-variant-numeric:tabular-nums}
.tbl .chg{color:#7a5c3e;font-weight:700}
''','</style>']
A=H.append
A('<div class="cover"><h1>모두의 창업 프로젝트 2차</h1>')
A('<div class="sub">일반·기술 분야 &nbsp;·&nbsp; 도전신청서<br>모먼트 에디트 &nbsp;·&nbsp; 경기 고양<br>2026년 9월 15일</div>')
A('<div class="box">이 문서는 <b>폼에 넣을 내용 그대로</b>입니다.<br>사진 열 장은 본문에서 들어갈 자리에 놓았고<br>'
  '사진 아래 글이 폼에 함께 적히는 캡션입니다.<br><b>Q3-2와 Q10은 제출본과 같습니다.</b></div></div>')
A('<div class="toc"><h2 class="q">문항 목록</h2><div class="meta">자수는 폼 기준입니다</div>')
A('<table class="tbl"><tr><th>문항</th><th>제목</th><th style="text-align:right">자수</th>'
  '<th style="text-align:right">한도</th><th>사진</th><th>상태</th></tr>')
for q in QS:
    b=body(q); n=len(b)-b.count('\n')
    pics=[int(m) for m in re.findall(r'^사진 (\d+)\.',b,re.M)]
    A('<tr><td>%s</td><td>%s</td><td class="n">%s</td><td class="n">%s</td><td>%s</td><td class="%s">%s</td></tr>'
      %(q,TITLE[q],format(n,','),format(LIM(q),','),'·'.join(map(str,pics)) or '—',
        'chg' if q in CH else '','수정' if q in CH else '그대로'))
A('</table></div>')
for q in QS:
    b=body(q); n=len(b)-b.count('\n')
    A('<section><h2 class="q"><span class="num">%s</span> &nbsp;%s</h2>'%(q,TITLE[q]))
    A('<div class="meta">%s / %s자<span class="tag %s">%s</span></div>'
      %(format(n,','),format(LIM(q),','),'' if q in CH else 'same','수정함' if q in CH else '제출본과 같음'))
    for line in b.split('\n'):
        m=re.match(r'^사진 (\d+)\.\s*(.+)$',line)
        if m:
            k=int(m.group(1))
            A('<figure><img src="%s"><figcaption>사진 %d. %s</figcaption></figure>'%(b64(k),k,esc(m.group(2))))
        else:
            A('<p>%s</p>'%esc(line))
    A('</section>')
io.open(OUT_HTML,'w',encoding='utf-8').write('\n'.join(H))

print('ok build-handout: 붙여넣기 txt + PDF용 html — ' +
      ' · '.join('%s %s'%(q,format(len(body(q))-body(q).count('\n'),',')) for q in QS))
