"""
8개 디자인 × 라이브/가족 = 16개 검토용 빌드
- 01~05: 핸드오프 원본 마스터 사용 (작업 안 함)
- 06~08: 현재 작업본 사용
- 모두 A 케이스 (부모 정보 전부 + 커스텀 인사말)
"""

import re, html, sys
from pathlib import Path

# ============================================================
# 시뮬레이션 데이터 (공통)
# ============================================================
DATA = {
    'GROOM_NAME': '박지훈',
    'BRIDE_NAME': '김서연',
    'GROOM_PARENTS': '박철수 · 이미경',
    'BRIDE_PARENTS': '김영호 · 최선영',

    # 측 라벨 정책: 항상 "신랑" / "신부" (측 없이)
    'GROOM_SIDE_LABEL': '신랑',
    'BRIDE_SIDE_LABEL': '신부',
    'GROOM_FIRST_EN_UPPER': 'JIHOON',
    'BRIDE_FIRST_EN_UPPER': 'SEOYEON',
    'GROOM_FIRST_EN_SPACED': 'JI HOON',
    'BRIDE_FIRST_EN_SPACED': 'SEO YEON',
    'GROOM_FIRST_EN': 'Jihoon',
    'BRIDE_FIRST_EN': 'Seoyeon',
    'GROOM_FULL_EN': 'Park Jihoon',
    'BRIDE_FULL_EN': 'Kim Seoyeon',

    # 계좌
    'GROOM_BANK': '하나은행',
    'GROOM_ACCOUNT': '222-456-789012',
    'GROOM_ACCOUNT_RAW': '222456789012',
    'BRIDE_BANK': '우리은행',
    'BRIDE_ACCOUNT': '333-456-789012',
    'BRIDE_ACCOUNT_RAW': '333456789012',
    'GROOM_FATHER_NAME': '박철수',
    'GROOM_FATHER_BANK': '국민은행',
    'GROOM_FATHER_ACCOUNT': '110-123-456789',
    'GROOM_FATHER_ACCOUNT_RAW': '110123456789',
    'GROOM_MOTHER_NAME': '이미경',
    'GROOM_MOTHER_BANK': '신한은행',
    'GROOM_MOTHER_ACCOUNT': '220-456-123789',
    'GROOM_MOTHER_ACCOUNT_RAW': '220456123789',
    'BRIDE_FATHER_NAME': '김영호',
    'BRIDE_FATHER_BANK': '농협',
    'BRIDE_FATHER_ACCOUNT': '351-234-567890',
    'BRIDE_FATHER_ACCOUNT_RAW': '351234567890',
    'BRIDE_MOTHER_NAME': '최선영',
    'BRIDE_MOTHER_BANK': '카카오뱅크',
    'BRIDE_MOTHER_ACCOUNT': '3333-12-3456789',
    'BRIDE_MOTHER_ACCOUNT_RAW': '3333123456789',

    # 날짜
    'WEDDING_DATE_DISPLAY': '2026. 10. 24',
    'WEDDING_DATE_KOR': '2026년 10월 24일',
    'WEDDING_DATE_COMPACT': '20261024',
    'WEDDING_DATE_SPACED': '2026 10 24',
    'WEDDING_DATE_LITERARY': '이천이십육년 시월 이십사일',
    'WEDDING_MONTH_EN': 'October 2026',
    'WEDDING_MONTH_EN_SHORT': 'Oct',
    'WEDDING_MONTH_NUM': '10',
    'WEDDING_MONTH_NUM_PAD': '10',
    'WEDDING_MONTH_DAY_KOR': '10월 24일',
    'WEDDING_DAY_OF_MONTH': '24',
    'WEDDING_DAY_OF_MONTH_PAD': '24',
    'WEDDING_DAY_KOR': '토요일',
    'WEDDING_DAY_EN': 'Saturday',
    'WEDDING_DAY_KOR': '토요일',
    'WEDDING_DAY_EN_SHORT': 'Sun',
    'WEDDING_YEAR': '2026',
    'WEDDING_YEAR_EN': 'Two Thousand Twenty-Six',
    'WEDDING_YEAR_ROMAN': 'MMXXVI',
    'WEDDING_ISO_DATETIME': '2026-10-24T14:00:00+09:00',
    'WEDDING_TIME_KOR': '오후 두 시',
    'WEDDING_TIME_KOR_FULL': '오후 두 시',
    'WEDDING_TIME_24H': '14:00',
    'WEDDING_TIME_DISPLAY': '오후 2:00',
    'WEDDING_MONTH_KOR': '10월',
    'WEDDING_MONTH_DISPLAY': '2026년 10월',
    'WEDDING_MONTH_HAN': '시월',
    'WEDDING_DAY_HAN': '이십사일',
    'WEDDING_MONTH_DAY_DISPLAY': '10 · 24',
    'WEDDING_MONTH_DAY_PERIOD': '10.24',
    'WEDDING_MONTH_DAY_DOT': '10. 24',
    'WEDDING_MONTH_SLASH': '10 / 2026',
    'WEDDING_FULL_DATE_DOT': '2026 · 10 · 24',

    # 08 Noir 자기소개
    'GROOM_BIO': '풍경 사진을 좋아하고, 조용한 카페에서 책 읽는 시간을 좋아합니다.',
    'BRIDE_BIO': '오래된 영화와 손편지를 좋아하고, 매일 작은 기록을 남기며 살아갑니다.',

    # Venue
    'VENUE_NAME_KO': '모먼트 에디트 스튜디오',
    'VENUE_NAME_EN': 'Moment Edit Studio',
    'VENUE_NAME_KO_URI': '%EB%AA%A8%EB%A8%BC%ED%8A%B8%20%EC%97%90%EB%94%94%ED%8A%B8%20%EC%8A%A4%ED%8A%9C%EB%94%94%EC%98%A4',
    'VENUE_ADDRESS': '경기도 고양시 덕양구 향동동 일대',
    'VENUE_TRANSPORT': '6호선 디지털미디어시티역 1번 출구 차량 8분',
    'VENUE_PARKING': '건물 지하 1~3층 주차 가능 (3시간 무료)',
    'VENUE_MAP_IFRAME': 'https://maps.google.com/maps?q=37.6204,126.8786&z=16&output=embed',

    'EVENT_ID': 'sample',
}

CUSTOM_INVITATION = """<p>함께 걸어온 시간이<br>7년의 봄여름을 지나 하나의 약속이 됩니다.</p><p>저희 두 사람의 시작에<br>귀한 마음 함께해 주시면<br>오래오래 기억하겠습니다.</p>"""

CUSTOM_PULLQUOTE = "한 장면, 한 약속, 하나의 시작."

# ============================================================
# 캘린더 셀 — 2026/10
# 10월 1일=목, 24일=토(marked), 31일=토
# ============================================================
def build_calendar_cells():
    """4 empty + 1~31 + 0 empty (31일이 토요일이라 마지막 행 가득)"""
    cells = []
    # 앞 4 empty (일·월·화·수)
    for _ in range(4):
        cells.append('<div class="date-cal-cell when-cal-cell empty" aria-hidden="true"></div>')
    # 1~31
    for day in range(1, 32):
        # 일요일 클래스 (5, 12, 19, 26)
        sun_cls = ' sun' if day in (4, 11, 18, 25) else ''
        # marked (24일 토요일)
        marked = ' marked' if day == 24 else ''
        aria = ' aria-current="date"' if day == 24 else ''
        cells.append(f'<div class="date-cal-cell when-cal-cell{sun_cls}{marked}"{aria}><span>{day}</span></div>')
    return '\n'.join(cells)

CALENDAR_CELLS_HTML = build_calendar_cells()

# ============================================================
# OPTIONAL 마커 처리
# ============================================================
def process_optional(html_text, key, action, custom_content=None):
    """
    action = 'keep' (마커만 제거) | 'remove' (블록 통째 제거) | 'replace' (내용 교체)
    """
    pattern_inline = re.compile(
        rf'<!-- OPTIONAL:{re.escape(key)} -->(.*?)<!-- /OPTIONAL:{re.escape(key)} -->',
        re.DOTALL
    )
    if action == 'keep':
        return pattern_inline.sub(lambda m: m.group(1), html_text)
    elif action == 'remove':
        return pattern_inline.sub('', html_text)
    elif action == 'replace':
        return pattern_inline.sub(custom_content, html_text)
    return html_text

# ============================================================
# placeholder 치환
# ============================================================
def replace_placeholders(html_text, data):
    for key, value in data.items():
        html_text = html_text.replace('{{' + key + '}}', str(value))
    # 캘린더 셀
    html_text = html_text.replace('{{CALENDAR_CELLS_HTML}}', CALENDAR_CELLS_HTML)
    return html_text

# ============================================================
# 검토용 임시 컨테이너 CSS
# ============================================================
TEMP_CONTAINER_CSS = """
<style id="temp-review-container">
html { background: #ececec; }
body { max-width: 480px; margin: 0 auto; background: transparent; }
</style>
"""

# 다크 외곽 디자인 — 외곽도 다크여야 하는 디자인 (마스터 자체 html 배경 살림)
DARK_OUTER_DESIGNS = {'08-noir'}

# Vermilion 외곽 분기 — 페이퍼 본체보다 한 톤 어두운 베이지 (그림자 효과 극대화)
VERMILION_OUTER_DESIGNS = {'04-vermilion'}

# Classic 외곽 분기 — 속지 느낌 (본체 밝은 흰 + 외각 한 톤 어두운 베이지 그레이)
CLASSIC_OUTER_DESIGNS = {'01-classic'}

TEMP_CONTAINER_CSS_DARK = """
<style id="temp-review-container">
html { background: #161310; }
body { max-width: 480px; margin: 0 auto; box-shadow: inset 0 0 0 1px rgba(201,168,118,0.1), 0 20px 40px -16px rgba(0,0,0,0.7); }
</style>
"""

TEMP_CONTAINER_CSS_VERMILION = """
<style id="temp-review-container">
html { background: #E2DBC8 !important; }
body { max-width: 480px; margin: 0 auto; background: transparent; }
</style>
"""

TEMP_CONTAINER_CSS_CLASSIC = """
<style id="temp-review-container">
html { background: #E8E4DA !important; }
body { max-width: 480px; margin: 0 auto; background: transparent; }
@media (max-width: 480px) {
  body { margin: 0 12px; }
}
</style>
"""

# ============================================================
# 한 마스터 빌드
# ============================================================
def build_master(master_path, design_id, has_pullquote=False, has_bio=False):
    """A 케이스 — 모든 OPTIONAL keep + 커스텀 인사말"""
    with open(master_path, 'r', encoding='utf-8') as f:
        html_text = f.read()

    # invitationText = 커스텀 인사말로
    html_text = process_optional(html_text, 'invitationText', 'replace', CUSTOM_INVITATION)

    # pullQuote (02 Editorial)
    if has_pullquote:
        html_text = process_optional(html_text, 'pullQuote', 'replace', CUSTOM_PULLQUOTE)

    # 나머지 OPTIONAL 모두 keep
    for key in ['envelope', 'groomParents', 'brideParents',
                'groomAccount', 'brideAccount',
                'groomFatherAccount', 'groomMotherAccount',
                'brideFatherAccount', 'brideMotherAccount']:
        html_text = process_optional(html_text, key, 'keep')
    if has_bio:
        for key in ['groomBio', 'brideBio']:
            html_text = process_optional(html_text, key, 'keep')

    # placeholder 치환
    html_text = replace_placeholders(html_text, DATA)

    # 임시 컨테이너 CSS 삽입 (디자인별 분기)
    if design_id in DARK_OUTER_DESIGNS:
        temp_css = TEMP_CONTAINER_CSS_DARK
    elif design_id in VERMILION_OUTER_DESIGNS:
        temp_css = TEMP_CONTAINER_CSS_VERMILION
    elif design_id in CLASSIC_OUTER_DESIGNS:
        temp_css = TEMP_CONTAINER_CSS_CLASSIC
    else:
        temp_css = TEMP_CONTAINER_CSS
    html_text = html_text.replace('</head>', temp_css + '</head>', 1)

    return html_text

# ============================================================
# 16개 빌드 정의
# ============================================================
HANDOFF_LIVE  = Path('/home/claude/handoff/handoff/output/live_masters')
HANDOFF_FAM   = Path('/home/claude/handoff/handoff/output/family_masters')
WORK = Path('/home/claude/work')
OUT  = Path('/mnt/user-data/outputs')

DESIGNS = [
    ('01-classic',     'invitation-01-classic',     False, False),
    ('02-editorial',   'invitation-02-editorial',   True,  False),
    ('03-letterpress', 'invitation-03-letterpress', False, False),
    ('04-vermilion',   'invitation-04-Vermilion',   False, False),  # 라이브는 대문자 V
    ('05-botanical',   'invitation-05-botanical',   False, False),
    ('06-hangeul',     'invitation-06-hangeul',     False, False),
    ('07-architect',   'invitation-07-architect',   False, False),
    ('08-noir',        'invitation-08-noir',        False, True),
]

WORKED_DESIGNS = {'01-classic', '02-editorial', '03-letterpress', '04-vermilion', '05-botanical', '06-hangeul', '07-architect', '08-noir'}

# 작업본 파일명 매핑 (디자인 ID → work/ 디렉토리 파일명)
WORK_FILE_MAP = {
    '01-classic':     '01',
    '02-editorial':   '02',
    '03-letterpress': '03',
    '04-vermilion':   '04',
    '05-botanical':   '05',
    '06-hangeul':     '06',
    '07-architect':   '07',
    '08-noir':        '08',
}

print("\n" + "="*70)
print("16개 디자인 전체 검토용 빌드 (A 케이스, 전부 + 커스텀)")
print("="*70 + "\n")

for design_id, base_name, has_pq, has_bio in DESIGNS:
    for kind in ['live', 'family']:
        # 마스터 경로
        if design_id in WORKED_DESIGNS:
            # 작업본 사용
            short = WORK_FILE_MAP[design_id]
            master_path = WORK / f'{kind}-{short}.master'
        else:
            # 핸드오프 원본
            base_dir = HANDOFF_LIVE if kind == 'live' else HANDOFF_FAM
            # 04만 라이브 = Vermilion, 가족 = vermilion
            if design_id == '04-vermilion' and kind == 'family':
                master_path = base_dir / 'invitation-04-vermilion.html.master'
            else:
                master_path = base_dir / f'{base_name}.html.master'

        if not master_path.exists():
            print(f"❌ MISSING: {master_path}")
            continue

        try:
            built = build_master(master_path, design_id, has_pq, has_bio)
            out_path = OUT / f'_review_{design_id}-{kind}.html'
            with open(out_path, 'w', encoding='utf-8') as f:
                f.write(built)
            size = len(built)
            print(f"✅ {design_id} {kind:6s} → {out_path.name} ({size:,} bytes)")
        except Exception as e:
            print(f"❌ {design_id} {kind}: {e}")

print("\n" + "="*70)
print("출력 경로: /mnt/user-data/outputs/_review_*.html")
print("="*70 + "\n")
