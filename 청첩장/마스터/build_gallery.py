"""
invitation-gallery.html 의 TEMPLATES(base64) 9개 재생성기.

미리보기 일관성 원칙 (huijun 지시):
- 더미 커플은 **이서준 · 정하윤 (2027.11.27 토)** 로 고정 — 갤러리 인라인 라이브
  스냅샷(LIVE_HTML_B64)과 동일. 모든 미리보기에서 일관된 기본값.
- 인사말·대표문구·자기소개는 **기본값(마스터 내장)** 사용(커스텀 미적용).
- 혼주 표기 + 양가 부모님 계좌는 **어울리는 디자인에만** 표기:
    SHOW = 01 Classic · 03 Letterpress · 04 Vermilion · 06 Hangeul  (격식/전통)
    HIDE = 02 Editorial · 05 Botanical · 07 Architect · 08 Noir      (모던/에디토리얼)
  신랑·신부 본인 계좌(마음 전하실 곳)는 8종 전부 표기.
- 09: "이렇게 맞춰집니다" 맞춤 안내 엔드카드(이름·날짜 미노출, 메모형 주석).

※ 임베드 라이브 스냅샷(LIVE_HTML_B64)·live-inline(Enter) 기능은 절대 건드리지 않음.

실행: python3 build_gallery.py            → /tmp/gallery_templates.json
      python3 build_gallery.py --apply    → invitation-gallery.html 직접 패치(+ .bak 백업)
"""
import re, base64, json, sys, datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
SITE = HERE.parent.parent
GALLERY = SITE / 'invitation-gallery.html'

# ============================================================
# 더미 커플 — 이서준 · 정하윤 / 2027.11.27(토) 10:00 / 스냅샷과 동일
# ============================================================
DATA = {
 'GROOM_NAME':'이서준','BRIDE_NAME':'정하윤',
 'GROOM_PARENTS':'이재환 · 최미경','BRIDE_PARENTS':'정영석 · 박윤희',
 'GROOM_SIDE_LABEL':'신랑','BRIDE_SIDE_LABEL':'신부',
 'GROOM_FIRST_EN_UPPER':'SEOJUN','BRIDE_FIRST_EN_UPPER':'HAYOON',
 'GROOM_FIRST_EN_SPACED':'SEO JUN','BRIDE_FIRST_EN_SPACED':'HA YOON',
 'GROOM_FIRST_EN':'Seojun','BRIDE_FIRST_EN':'Hayoon',
 'GROOM_FULL_EN':'Lee Seojun','BRIDE_FULL_EN':'Jung Hayoon',
 'GROOM_BANK':'하나은행','GROOM_ACCOUNT':'222-456-789012','GROOM_ACCOUNT_RAW':'222456789012',
 'BRIDE_BANK':'우리은행','BRIDE_ACCOUNT':'333-456-789012','BRIDE_ACCOUNT_RAW':'333456789012',
 'GROOM_FATHER_NAME':'이재환','GROOM_FATHER_BANK':'국민은행','GROOM_FATHER_ACCOUNT':'110-123-456789','GROOM_FATHER_ACCOUNT_RAW':'110123456789',
 'GROOM_MOTHER_NAME':'최미경','GROOM_MOTHER_BANK':'신한은행','GROOM_MOTHER_ACCOUNT':'220-456-123789','GROOM_MOTHER_ACCOUNT_RAW':'220456123789',
 'BRIDE_FATHER_NAME':'정영석','BRIDE_FATHER_BANK':'농협','BRIDE_FATHER_ACCOUNT':'351-234-567890','BRIDE_FATHER_ACCOUNT_RAW':'351234567890',
 'BRIDE_MOTHER_NAME':'박윤희','BRIDE_MOTHER_BANK':'카카오뱅크','BRIDE_MOTHER_ACCOUNT':'3333-12-3456789','BRIDE_MOTHER_ACCOUNT_RAW':'3333123456789',
 # 날짜 — 2027.11.27 토요일
 'WEDDING_DATE_DISPLAY':'2027. 11. 27','WEDDING_DATE_KOR':'2027년 11월 27일','WEDDING_DATE_COMPACT':'20271127','WEDDING_DATE_SPACED':'2027 11 27',
 'WEDDING_DATE_LITERARY':'이천이십칠년 십일월 이십칠일','WEDDING_MONTH_EN':'November 2027','WEDDING_MONTH_EN_SHORT':'Nov','WEDDING_MONTH_NUM':'11','WEDDING_MONTH_NUM_PAD':'11',
 'WEDDING_MONTH_DAY_KOR':'11월 27일','WEDDING_DAY_OF_MONTH':'27','WEDDING_DAY_OF_MONTH_PAD':'27','WEDDING_DAY_KOR':'토요일','WEDDING_DAY_EN':'Saturday','WEDDING_DAY_EN_SHORT':'Sat',
 'WEDDING_YEAR':'2027','WEDDING_YEAR_EN':'Two Thousand Twenty-Seven','WEDDING_YEAR_ROMAN':'MMXXVII','WEDDING_ISO_DATETIME':'2027-11-27T10:00:00+09:00',
 'WEDDING_TIME_KOR':'오전 열 시','WEDDING_TIME_KOR_FULL':'오전 열 시','WEDDING_TIME_24H':'10:00','WEDDING_TIME_DISPLAY':'오전 10:00','WEDDING_MONTH_KOR':'11월',
 'WEDDING_MONTH_DISPLAY':'2027년 11월','WEDDING_MONTH_HAN':'십일월','WEDDING_DAY_HAN':'이십칠일','WEDDING_MONTH_DAY_DISPLAY':'11 · 27','WEDDING_MONTH_DAY_PERIOD':'11.27',
 'WEDDING_MONTH_DAY_DOT':'11. 27','WEDDING_MONTH_SLASH':'11 / 2027','WEDDING_FULL_DATE_DOT':'2027 · 11 · 27',
 'GROOM_BIO':'풍경 사진을 좋아하고, 조용한 카페에서 책 읽는 시간을 좋아합니다.','BRIDE_BIO':'오래된 영화와 손편지를 좋아하고, 매일 작은 기록을 남기며 살아갑니다.',
 'VENUE_NAME_KO':'모먼트 에디트 스튜디오','VENUE_NAME_EN':'Moment Edit Studio',
 'VENUE_NAME_KO_URI':'%EB%AA%A8%EB%A8%BC%ED%8A%B8%20%EC%97%90%EB%94%94%ED%8A%B8%20%EC%8A%A4%ED%8A%9C%EB%94%94%EC%98%A4',
 'VENUE_ADDRESS':'경기도 고양시 덕양구 향동동 일대','VENUE_TRANSPORT':'6호선 디지털미디어시티역 1번 출구 차량 8분','VENUE_PARKING':'건물 지하 1~3층 주차 가능 (3시간 무료)',
 'VENUE_MAP_IFRAME':'https://maps.google.com/maps?q=37.6204,126.8786&z=16&output=embed','EVENT_ID':'test-couple',
}

# ============================================================
# 캘린더 — 2027년 11월(1일=월요일), 결혼일 27일 marked
# ============================================================
def build_calendar_cells(year=2027, month=11, marked=27):
    first = datetime.date(year, month, 1)
    lead = (first.weekday() + 1) % 7           # 일요일 시작 달력에서 1일의 칸 위치
    nxt = datetime.date(year + (month == 12), (month % 12) + 1, 1)
    ndays = (nxt - first).days
    cells = ['<div class="date-cal-cell when-cal-cell empty" aria-hidden="true"></div>'] * lead
    for day in range(1, ndays + 1):
        col = (lead + day - 1) % 7
        s = ' sun' if col == 0 else ''
        mk = ' marked' if day == marked else ''
        ar = ' aria-current="date"' if day == marked else ''
        cells.append(f'<div class="date-cal-cell when-cal-cell{s}{mk}"{ar}><span>{day}</span></div>')
    return '\n'.join(cells)
CAL = build_calendar_cells()

# ============================================================
# OPTIONAL 마커 처리
# ============================================================
def process_optional(t, k, a, c=None):
    p = re.compile(rf'<!-- OPTIONAL:{re.escape(k)} -->(.*?)<!-- /OPTIONAL:{re.escape(k)} -->', re.DOTALL)
    if a == 'keep':    return p.sub(lambda m: m.group(1), t)
    if a == 'remove':  return p.sub('', t)
    if a == 'replace': return p.sub(lambda m: c, t)
    return t

# 혼주 표기 + 양가 부모님 계좌를 노출할 디자인
PARENTS_SHOW = {'01', '03', '04', '06'}

def fill_master(num, has_pq, has_bio):
    t = (HERE / f'live-{num}.master').read_text(encoding='utf-8')
    # 글(인사말·대표문구·자기소개) — 기본값 유지(커스텀 미적용)
    t = process_optional(t, 'invitationText', 'keep')
    if has_pq:
        t = process_optional(t, 'pullQuote', 'keep')
    if has_bio:
        for k in ['groomBio', 'brideBio']:
            t = process_optional(t, k, 'keep')
    # 마음 전하실 곳 — 봉투 + 신랑·신부 본인 계좌는 항상 표기
    for k in ['envelope', 'groomAccount', 'brideAccount']:
        t = process_optional(t, k, 'keep')
    # 혼주 이름 표기 + 양가 부모님 계좌 — 어울리는 디자인에만
    parent_keys = ['groomParents', 'brideParents',
                   'groomFatherAccount', 'groomMotherAccount',
                   'brideFatherAccount', 'brideMotherAccount']
    action = 'keep' if num in PARENTS_SHOW else 'remove'
    for k in parent_keys:
        t = process_optional(t, k, action)
    # placeholder 치환
    for k, v in DATA.items():
        t = t.replace('{{' + k + '}}', str(v))
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
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,400&family=Noto+Serif+KR:wght@300;400;500&family=Noto+Sans+KR:wght@300;400&display=swap" rel="stylesheet">
<style>
  *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
  :root{
    --bg:#FAF8F4;--text:#1C1B19;--sub:#5A554C;--light:#8B857A;
    --gold:#B89A75;--seal:#6B2A24;--line:#EAE5DC;
    --serif:'Cormorant Garamond',Georgia,serif;
    --serif-ko:'Noto Serif KR','Nanum Myeongjo',serif;
    --sans:'Noto Sans KR',-apple-system,sans-serif;
  }
  html{-webkit-text-size-adjust:100%}
  body{background:var(--bg);color:var(--text);font-family:var(--serif-ko);line-height:1.85;-webkit-font-smoothing:antialiased;padding:0 0 76px}
  .gd-page{max-width:520px;margin:0 auto;padding:0 34px}
  .gd-head{text-align:center;padding:76px 0 8px}
  .gd-eyebrow{font-family:var(--serif);font-style:italic;font-size:13px;letter-spacing:0.26em;text-transform:uppercase;color:var(--seal)}
  .gd-title{font-family:var(--serif-ko);font-size:26px;font-weight:500;letter-spacing:0.04em;margin:16px 0 0}
  .gd-sub{font-size:13.5px;font-weight:300;color:var(--sub);letter-spacing:0.02em;margin:14px 0 0}
  .gd-rule{width:34px;height:1px;background:var(--gold);margin:32px auto 12px}
  .gd-item{text-align:center;padding:30px 0}
  .gd-item + .gd-item{border-top:1px solid var(--line)}
  .gd-label{font-family:var(--serif-ko);font-size:17px;font-weight:500;letter-spacing:0.05em;color:var(--text)}
  .gd-desc{font-size:13px;font-weight:300;color:var(--sub);letter-spacing:0.01em;line-height:1.85;margin:11px auto 0;max-width:360px;word-break:keep-all}
  .gd-foot{text-align:center;margin-top:18px;padding-top:42px;border-top:1px solid var(--line)}
  .gd-foot-en{font-family:var(--serif);font-style:italic;font-size:13px;letter-spacing:0.16em;color:var(--gold)}
  .gd-foot-ko{font-family:var(--serif-ko);font-size:17px;font-weight:500;letter-spacing:0.03em;margin:13px 0 0}
  .gd-foot-desc{font-size:12.5px;font-weight:300;color:var(--sub);line-height:1.9;margin:14px 0 0;word-break:keep-all}
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

  <div class="gd-item">
    <div class="gd-label">인사말</div>
    <p class="gd-desc">두 분의 문장을 그대로 새겨 드립니다. 따로 적지 않으시면 정갈한 기본 인사말로 채워집니다.</p>
  </div>
  <div class="gd-item">
    <div class="gd-label">혼주 표기</div>
    <p class="gd-desc">양가 부모님을 함께 모실 수 있습니다. 원치 않으시면 표기 없이 비워 둡니다.</p>
  </div>
  <div class="gd-item">
    <div class="gd-label">마음 전하실 곳</div>
    <p class="gd-desc">양가 부모님 계좌까지 함께. 필요하신 분만 펼쳐 보도록 정중히 접어 둡니다.</p>
  </div>

  <div class="gd-foot">
    <div class="gd-foot-en">Two invitations, one preparation</div>
    <p class="gd-foot-ko">온라인 · 오프라인, 두 편을 함께</p>
    <p class="gd-foot-desc">멀리 계신 하객께는 링크로,<br>가까운 분들께는 직접 건네는 한 편으로.</p>
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
        leftover = re.findall(r'\{\{[A-Z_]+\}\}', html)
        opts = re.findall(r'<!-- /?OPTIONAL:[^>]+-->', html)
        assert not leftover, f"{num}: leftover placeholders {leftover[:5]}"
        assert not opts, f"{num}: leftover OPTIONAL markers {opts[:5]}"
        assert 'live.html' in html, f"{num}: missing live.html Enter link"
        assert '이서준' in html and '정하윤' in html, f"{num}: couple name missing"
        if num in PARENTS_SHOW:
            assert '이재환' in html, f"{num}: parents expected but missing"
        out[num] = b64(html)
    assert '{{' not in GUIDE_CARD, "guide card has leftover placeholders"
    assert 'live.html' not in GUIDE_CARD, "guide card must NOT contain live.html"
    out['09'] = b64(GUIDE_CARD)
    return out

def apply_to_gallery(templates):
    src = GALLERY.read_text(encoding='utf-8')
    orig = src
    new_block = "const TEMPLATES = {\n" + ",\n".join(
        f"    '{k}': '{templates[k]}'" for k in ['01','02','03','04','05','06','07','08','09']
    ) + "\n  };"
    src, n = re.subn(r"const TEMPLATES = \{.*?\};", lambda m: new_block, src, count=1, flags=re.DOTALL)
    assert n == 1, f"TEMPLATES block replace count={n}"
    bak = GALLERY.with_suffix('.html.bak')
    bak.write_text(orig, encoding='utf-8')
    GALLERY.write_text(src, encoding='utf-8')
    print(f"✅ patched {GALLERY.name}  (backup: {bak.name})")

if __name__ == '__main__':
    t = build_all()
    for k in sorted(t):
        tag = '' if k == '09' else ('  [혼주·부모계좌 표기]' if k in PARENTS_SHOW else '  [본인 계좌만]')
        print(f"  {k}: {len(base64.b64decode(t[k])):,}B html  →  {len(t[k]):,}B b64{tag}")
    if '--apply' in sys.argv:
        apply_to_gallery(t)
    else:
        Path('/tmp/gallery_templates.json').write_text(json.dumps(t), encoding='utf-8')
        print("\n(dry-run) wrote /tmp/gallery_templates.json — rerun with --apply to patch the gallery")
