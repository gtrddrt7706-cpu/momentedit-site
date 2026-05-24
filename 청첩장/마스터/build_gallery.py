"""
invitation-gallery.html 의 TEMPLATES(base64) 9개 재생성기.

- 01~08: live-0X.master 를 샘플 데이터로 채워(=A 케이스: 양가 부모님 전부 + 커스텀 인사말)
          base64 인코딩. 갤러리 iframe srcdoc 로 들어가며, 내부 live.html Enter 링크는
          갤러리 런타임 JS(liveInterceptJS)가 가로채 인라인 라이브로 전환한다.
          ※ 임베드된 라이브 스냅샷(LIVE_HTML_B64)·live-inline 기능은 절대 건드리지 않음.
- 09:     "이렇게 맞춰집니다" 맞춤 안내 엔드카드(커플 이름·날짜 미노출, 메모형 주석).

실행: python3 build_gallery.py            → /tmp/gallery_templates.json 에 {01..09: b64} 저장
      python3 build_gallery.py --apply    → invitation-gallery.html 직접 패치(+ .bak 백업)
"""
import re, base64, json, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SITE = HERE.parent.parent                      # momentedit-site/
GALLERY = SITE / 'invitation-gallery.html'

# ============================================================
# 샘플 데이터 (build_all_16.py 와 동일, EVENT_ID 만 test-couple)
# ============================================================
DATA = {
 'GROOM_NAME':'박지훈','BRIDE_NAME':'김서연','GROOM_PARENTS':'박철수 · 이미경','BRIDE_PARENTS':'김영호 · 최선영',
 'GROOM_SIDE_LABEL':'신랑','BRIDE_SIDE_LABEL':'신부','GROOM_FIRST_EN_UPPER':'JIHOON','BRIDE_FIRST_EN_UPPER':'SEOYEON',
 'GROOM_FIRST_EN_SPACED':'JI HOON','BRIDE_FIRST_EN_SPACED':'SEO YEON','GROOM_FIRST_EN':'Jihoon','BRIDE_FIRST_EN':'Seoyeon',
 'GROOM_FULL_EN':'Park Jihoon','BRIDE_FULL_EN':'Kim Seoyeon','GROOM_BANK':'하나은행','GROOM_ACCOUNT':'222-456-789012','GROOM_ACCOUNT_RAW':'222456789012',
 'BRIDE_BANK':'우리은행','BRIDE_ACCOUNT':'333-456-789012','BRIDE_ACCOUNT_RAW':'333456789012',
 'GROOM_FATHER_NAME':'박철수','GROOM_FATHER_BANK':'국민은행','GROOM_FATHER_ACCOUNT':'110-123-456789','GROOM_FATHER_ACCOUNT_RAW':'110123456789',
 'GROOM_MOTHER_NAME':'이미경','GROOM_MOTHER_BANK':'신한은행','GROOM_MOTHER_ACCOUNT':'220-456-123789','GROOM_MOTHER_ACCOUNT_RAW':'220456123789',
 'BRIDE_FATHER_NAME':'김영호','BRIDE_FATHER_BANK':'농협','BRIDE_FATHER_ACCOUNT':'351-234-567890','BRIDE_FATHER_ACCOUNT_RAW':'351234567890',
 'BRIDE_MOTHER_NAME':'최선영','BRIDE_MOTHER_BANK':'카카오뱅크','BRIDE_MOTHER_ACCOUNT':'3333-12-3456789','BRIDE_MOTHER_ACCOUNT_RAW':'3333123456789',
 'WEDDING_DATE_DISPLAY':'2026. 10. 24','WEDDING_DATE_KOR':'2026년 10월 24일','WEDDING_DATE_COMPACT':'20261024','WEDDING_DATE_SPACED':'2026 10 24',
 'WEDDING_DATE_LITERARY':'이천이십육년 시월 이십사일','WEDDING_MONTH_EN':'October 2026','WEDDING_MONTH_EN_SHORT':'Oct','WEDDING_MONTH_NUM':'10','WEDDING_MONTH_NUM_PAD':'10',
 'WEDDING_MONTH_DAY_KOR':'10월 24일','WEDDING_DAY_OF_MONTH':'24','WEDDING_DAY_OF_MONTH_PAD':'24','WEDDING_DAY_KOR':'토요일','WEDDING_DAY_EN':'Saturday','WEDDING_DAY_EN_SHORT':'Sat',
 'WEDDING_YEAR':'2026','WEDDING_YEAR_EN':'Two Thousand Twenty-Six','WEDDING_YEAR_ROMAN':'MMXXVI','WEDDING_ISO_DATETIME':'2026-10-24T14:00:00+09:00',
 'WEDDING_TIME_KOR':'오후 두 시','WEDDING_TIME_KOR_FULL':'오후 두 시','WEDDING_TIME_24H':'14:00','WEDDING_TIME_DISPLAY':'오후 2:00','WEDDING_MONTH_KOR':'10월',
 'WEDDING_MONTH_DISPLAY':'2026년 10월','WEDDING_MONTH_HAN':'시월','WEDDING_DAY_HAN':'이십사일','WEDDING_MONTH_DAY_DISPLAY':'10 · 24','WEDDING_MONTH_DAY_PERIOD':'10.24',
 'WEDDING_MONTH_DAY_DOT':'10. 24','WEDDING_MONTH_SLASH':'10 / 2026','WEDDING_FULL_DATE_DOT':'2026 · 10 · 24',
 'GROOM_BIO':'풍경 사진을 좋아하고, 조용한 카페에서 책 읽는 시간을 좋아합니다.','BRIDE_BIO':'오래된 영화와 손편지를 좋아하고, 매일 작은 기록을 남기며 살아갑니다.',
 'VENUE_NAME_KO':'모먼트 에디트 스튜디오','VENUE_NAME_EN':'Moment Edit Studio',
 'VENUE_NAME_KO_URI':'%EB%AA%A8%EB%A8%BC%ED%8A%B8%20%EC%97%90%EB%94%94%ED%8A%B8%20%EC%8A%A4%ED%8A%9C%EB%94%94%EC%98%A4',
 'VENUE_ADDRESS':'경기도 고양시 덕양구 향동동 일대','VENUE_TRANSPORT':'6호선 디지털미디어시티역 1번 출구 차량 8분','VENUE_PARKING':'건물 지하 1~3층 주차 가능 (3시간 무료)',
 'VENUE_MAP_IFRAME':'https://maps.google.com/maps?q=37.6204,126.8786&z=16&output=embed','EVENT_ID':'test-couple',
}
CUSTOM_INVITATION="<p>함께 걸어온 시간이<br>7년의 봄여름을 지나 하나의 약속이 됩니다.</p><p>저희 두 사람의 시작에<br>귀한 마음 함께해 주시면<br>오래오래 기억하겠습니다.</p>"
CUSTOM_PULLQUOTE="한 장면, 한 약속, 하나의 시작."

def build_calendar_cells():
    cells = ['<div class="date-cal-cell when-cal-cell empty" aria-hidden="true"></div>']*4
    for day in range(1,32):
        s=' sun' if day in (4,11,18,25) else ''
        mk=' marked' if day==24 else ''
        ar=' aria-current="date"' if day==24 else ''
        cells.append(f'<div class="date-cal-cell when-cal-cell{s}{mk}"{ar}><span>{day}</span></div>')
    return '\n'.join(cells)
CAL = build_calendar_cells()

def process_optional(t,k,a,c=None):
    p=re.compile(rf'<!-- OPTIONAL:{re.escape(k)} -->(.*?)<!-- /OPTIONAL:{re.escape(k)} -->',re.DOTALL)
    if a=='keep':    return p.sub(lambda m:m.group(1),t)
    if a=='remove':  return p.sub('',t)
    if a=='replace': return p.sub(lambda m:c,t)
    return t

def fill_master(num, has_pq, has_bio):
    t = (HERE / f'live-{num}.master').read_text(encoding='utf-8')
    t = process_optional(t,'invitationText','replace',CUSTOM_INVITATION)
    if has_pq:
        t = process_optional(t,'pullQuote','replace',CUSTOM_PULLQUOTE)
    for k in ['envelope','groomParents','brideParents','groomAccount','brideAccount',
              'groomFatherAccount','groomMotherAccount','brideFatherAccount','brideMotherAccount']:
        t = process_optional(t,k,'keep')
    if has_bio:
        for k in ['groomBio','brideBio']:
            t = process_optional(t,k,'keep')
    for k,v in DATA.items():
        t = t.replace('{{'+k+'}}', str(v))
    t = t.replace('{{CALENDAR_CELLS_HTML}}', CAL)
    return t

DESIGNS = [('01',False,False),('02',True,False),('03',False,False),('04',False,False),
           ('05',False,False),('06',False,False),('07',False,False),('08',False,True)]

# ============================================================
# 09 — "이렇게 맞춰집니다" 맞춤 안내 엔드카드 (이름·날짜 미노출, 메모형)
# ============================================================
GUIDE_CARD = """<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta name="theme-color" content="#FAF8F4">
<meta name="color-scheme" content="light only">
<title>이렇게 맞춰집니다 · Moment Edit</title>
<meta name="description" content="모먼트 에디트 청첩장이 두 분께 맞춰지는 방식 — 인사말, 혼주 표기, 마음 전하실 곳(양가 부모님 계좌까지). 온라인·오프라인 두 편을 함께.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Noto+Serif+KR:wght@300;400;500&family=Noto+Sans+KR:wght@300;400&display=swap" rel="stylesheet">
<style>
  *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
  :root{
    --bg:#FAF8F4;--paper:#FFFFFF;--text:#1C1B19;--sub:#5A554C;--light:#8B857A;
    --gold:#B89A75;--seal:#6B2A24;--line:#E7E2DA;
    --serif:'Cormorant Garamond',Georgia,serif;
    --serif-ko:'Noto Serif KR','Nanum Myeongjo',serif;
    --sans:'Noto Sans KR',-apple-system,sans-serif;
  }
  html{-webkit-text-size-adjust:100%}
  body{background:var(--bg);color:var(--text);font-family:var(--serif-ko);line-height:1.8;-webkit-font-smoothing:antialiased;padding:0 0 64px}
  .gd-page{max-width:560px;margin:0 auto;padding:0 26px}
  .gd-head{text-align:center;padding:62px 0 38px}
  .gd-eyebrow{font-family:var(--serif);font-style:italic;font-size:13px;letter-spacing:0.26em;text-transform:uppercase;color:var(--seal)}
  .gd-title{font-family:var(--serif-ko);font-size:25px;font-weight:500;letter-spacing:0.04em;margin:16px 0 0}
  .gd-sub{font-size:13.5px;font-weight:300;color:var(--sub);letter-spacing:0.02em;margin:13px 0 0}
  .gd-rule{width:40px;height:1px;background:var(--gold);margin:26px auto 0}
  .gd-step{margin:0 0 38px}
  .gd-stepnum{font-family:var(--serif);font-style:italic;font-size:15px;letter-spacing:0.08em;color:var(--gold);margin-bottom:11px;text-align:center}
  .gd-card{background:var(--paper);border:1px solid var(--line);border-radius:8px;padding:26px 24px;text-align:center}
  .gd-greet{font-family:var(--serif-ko);font-size:14px;font-weight:300;color:var(--text);line-height:2.0;letter-spacing:0.01em}
  .gd-par{font-family:var(--serif-ko);font-size:13.5px;font-weight:300;color:var(--sub);line-height:2.2;letter-spacing:0.02em}
  .gd-par b{font-weight:500;color:var(--text)}
  .gd-acc{border:1px solid var(--line);border-radius:6px;overflow:hidden}
  .gd-acc-hd{font-family:var(--serif);font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:var(--seal);padding:13px}
  .gd-acc-row{display:flex;justify-content:space-between;align-items:center;padding:11px 18px;font-size:13px;color:var(--sub);border-top:1px solid var(--line)}
  .gd-acc-row b{font-weight:500;color:var(--text)}
  .gd-acc-row em{font-family:var(--sans);font-style:normal;font-size:11px;color:var(--light);letter-spacing:0.02em}
  .gd-memo{margin:14px 4px 0;padding:13px 16px 13px 18px;background:rgba(184,154,117,0.10);border-left:2px solid var(--gold);border-radius:0 6px 6px 0;text-align:left}
  .gd-memo-tag{font-family:var(--serif);font-style:italic;font-size:12.5px;letter-spacing:0.05em;color:var(--seal);display:block;margin-bottom:4px}
  .gd-memo-tag::before{content:"\\270E  ";font-style:normal}
  .gd-memo-txt{font-size:12px;font-weight:300;color:var(--sub);line-height:1.78;letter-spacing:0.01em}
  .gd-foot{margin-top:6px;text-align:center;padding-top:36px;border-top:1px solid var(--line)}
  .gd-foot-en{font-family:var(--serif);font-style:italic;font-size:13px;letter-spacing:0.14em;color:var(--gold)}
  .gd-foot-ko{font-family:var(--serif-ko);font-size:16px;font-weight:500;letter-spacing:0.03em;margin:12px 0 0}
  .gd-foot-desc{font-size:12.5px;font-weight:300;color:var(--sub);line-height:1.8;margin:11px 0 0}
  .gd-two{display:flex;gap:12px;margin:22px 0 0}
  .gd-two>div{flex:1;background:var(--paper);border:1px solid var(--line);border-radius:7px;padding:16px 14px}
  .gd-two-t{font-family:var(--serif);font-size:13px;font-weight:500;letter-spacing:0.05em;color:var(--seal)}
  .gd-two-d{font-size:11px;font-weight:300;color:var(--light);line-height:1.65;margin-top:6px}
</style>
</head>
<body>
<div class="gd-page">
  <div class="gd-head">
    <div class="gd-eyebrow">Tailored to you</div>
    <h1 class="gd-title">이렇게 맞춰집니다</h1>
    <p class="gd-sub">디자인은 그대로, 내용은 두 분의 뜻대로.</p>
    <div class="gd-rule"></div>
  </div>

  <div class="gd-step">
    <div class="gd-stepnum">i. 인사말</div>
    <div class="gd-card">
      <p class="gd-greet">서로를 향해 걸어온 길이<br>이제 하나의 약속이 됩니다.<br><br>그 시작의 자리에<br>귀한 마음 더해 주시면<br>오래 간직하겠습니다.</p>
    </div>
    <div class="gd-memo">
      <span class="gd-memo-tag">인사말</span>
      <span class="gd-memo-txt">두 분의 문장을 그대로 새겨 드립니다. 따로 적지 않으시면 정갈한 기본 인사말로 채워집니다.</span>
    </div>
  </div>

  <div class="gd-step">
    <div class="gd-stepnum">ii. 혼주 표기</div>
    <div class="gd-card">
      <p class="gd-par"><b>신랑측</b> 아버지 · 어머니 의 아들<br><b>신부측</b> 아버지 · 어머니 의 딸</p>
    </div>
    <div class="gd-memo">
      <span class="gd-memo-tag">혼주 표기</span>
      <span class="gd-memo-txt">양가 부모님을 인사말 아래 함께 모실 수 있습니다. 원치 않으시면 표기 없이 비워 둡니다.</span>
    </div>
  </div>

  <div class="gd-step">
    <div class="gd-stepnum">iii. 마음 전하실 곳</div>
    <div class="gd-card">
      <div class="gd-acc">
        <div class="gd-acc-hd">마음 전하실 곳</div>
        <div class="gd-acc-row"><b>신랑</b><em>계좌</em></div>
        <div class="gd-acc-row"><b>신부</b><em>계좌</em></div>
        <div class="gd-acc-row"><b>신랑 혼주</b><em>아버지 · 어머니</em></div>
        <div class="gd-acc-row"><b>신부 혼주</b><em>아버지 · 어머니</em></div>
      </div>
    </div>
    <div class="gd-memo">
      <span class="gd-memo-tag">마음 전하실 곳</span>
      <span class="gd-memo-txt">양가 부모님 계좌까지 함께 담을 수 있습니다. 필요하신 분만 펼쳐 보도록 정중히 접어 둡니다.</span>
    </div>
  </div>

  <div class="gd-foot">
    <div class="gd-foot-en">Two invitations, one preparation</div>
    <p class="gd-foot-ko">온라인 · 오프라인, 두 편을 함께</p>
    <p class="gd-foot-desc">멀리 계신 하객께는 링크로,<br>가까운 분들께는 직접 건네는 한 편으로.</p>
    <div class="gd-two">
      <div><div class="gd-two-t">Online</div><div class="gd-two-d">링크 한 번으로<br>예식 영상까지</div></div>
      <div><div class="gd-two-t">Offline</div><div class="gd-two-d">직접 건네는<br>오시는 길과 함께</div></div>
    </div>
  </div>
</div>
</body>
</html>"""

def b64(s):
    return base64.b64encode(s.encode('utf-8')).decode('ascii')

def build_all():
    out = {}
    for num, pq, bio in DESIGNS:
        html = fill_master(num, pq, bio)
        # 검증
        leftover = re.findall(r'\{\{[A-Z_]+\}\}', html)
        opts = re.findall(r'<!-- /?OPTIONAL:[^>]+-->', html)
        assert not leftover, f"{num}: leftover placeholders {leftover[:5]}"
        assert not opts, f"{num}: leftover OPTIONAL markers {opts[:5]}"
        assert 'live.html' in html, f"{num}: missing live.html Enter link"
        assert '<title>' in html, f"{num}: missing <title>"
        out[num] = b64(html)
    # 09 엔드카드
    assert '{{' not in GUIDE_CARD, "guide card has leftover placeholders"
    assert 'live.html' not in GUIDE_CARD, "guide card must NOT contain live.html"
    out['09'] = b64(GUIDE_CARD)
    return out

def apply_to_gallery(templates):
    src = GALLERY.read_text(encoding='utf-8')
    orig = src

    # 1) TEMPLATES 블록 교체
    new_block = "const TEMPLATES = {\n" + ",\n".join(
        f"    '{k}': '{templates[k]}'" for k in ['01','02','03','04','05','06','07','08','09']
    ) + "\n  };"
    src, n = re.subn(r"const TEMPLATES = \{.*?\};", lambda m: new_block, src, count=1, flags=re.DOTALL)
    assert n == 1, f"TEMPLATES block replace count={n}"

    # 2) INVITATIONS 9번째 항목 추가 (08 항목 뒤)
    inv_old = "{file:'invitation-08-noir.html', name:'Noir Editorial', bg:'#0B0A09'}"
    inv_new = inv_old + ",\n    {file:'invitation-09-guide.html', name:'Tailored · 맞춤 안내', bg:'#FAF8F4'}"
    assert src.count(inv_old) == 1, "INVITATIONS 08 entry not unique"
    src = src.replace(inv_old, inv_new, 1)

    # 3) footer 'of 8' 정적 → 동적
    of_old = ("var counterTotal = document.querySelector('.gv-counter-total');\n"
              "  if (counterTotal) counterTotal.textContent = String(INVITATIONS.length).padStart(2,'0');")
    of_new = of_old + ("\n  var metaOf = document.querySelector('.gv-meta-of');\n"
                       "  if (metaOf) metaOf.textContent = 'of ' + INVITATIONS.length;")
    assert src.count(of_old) == 1, "counterTotal anchor not unique"
    src = src.replace(of_old, of_new, 1)

    assert src != orig, "no changes applied"
    bak = GALLERY.with_suffix('.html.bak')
    bak.write_text(orig, encoding='utf-8')
    GALLERY.write_text(src, encoding='utf-8')
    print(f"✅ patched {GALLERY.name}  (backup: {bak.name})")

if __name__ == '__main__':
    t = build_all()
    for k in sorted(t):
        print(f"  {k}: {len(base64.b64decode(t[k])):,}B html  →  {len(t[k]):,}B b64")
    if '--apply' in sys.argv:
        apply_to_gallery(t)
    else:
        Path('/tmp/gallery_templates.json').write_text(json.dumps(t), encoding='utf-8')
        print("\n(dry-run) wrote /tmp/gallery_templates.json — rerun with --apply to patch the gallery")
