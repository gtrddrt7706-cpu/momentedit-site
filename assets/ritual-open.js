// 모먼트에디트 · 「우리 예식 짓기」(순간 먼저) 단일 원천  [OPEN_COURSE 2026-09-25]
//
// ★★설계 명세 1(코워크 · 9/25 · docs/handoff/설계명세1_식순고르기_0925.md)의 새 코스 «open» 이
//   읽는 것은 **전부 여기 한 파일**이다 — 순간 표 · 판 칩 · 시간 표(부록 A) · 예시 넷 · 알림 셋 · 새 나레이션 문안.
//   ★명세는 「부록 A 를 ritual-data.js 한 곳에」라고 적었다. 여기로 둔 까닭(기술 판단 · 구현 보고에 적는다):
//     빌더(order-preview.html)는 ritual-data.js 를 동기로 읽지 않고 «생성된 사본»을 쓴다. 시간 셈·알림 규칙은
//     함수라 사본(JSON)으로 옮길 수 없고, 옮기면 규칙이 두 벌이 된다([THIN_WARN] 이 막으려던 그 모양).
//     그래서 빌더 · 엔진 · AI 상담 지식이 **이 파일 하나를 그대로** 읽는다. 사본이 없으니 갈라질 곳도 없다.
//   ★고객 문구 규칙 — 전각 줄표(—) 금지 · 장식 이모지 금지 · «추천 · 인기 · 베스트» 금지(사장님 9/25 · 예시라 부른다).
//     명세 원문에 줄표가 있던 자리는 가운뎃점(·)이나 문장 나누기로 바꿨다(구현 보고 «명세와 다르게 한 것»).
//
// 브라우저: <script src="/assets/ritual-open.js"></script> → window.RitualOpen (엔진보다 먼저)
// Node:    require('./assets/ritual-open.js')
(function (root, factory) {
  var O = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = O;
  else root.RitualOpen = O;
})(typeof self !== 'undefined' ? self : this, function () {

  /* ── 순서(v4 · 고정) ────────────────────────────────────────────────────────
     ★두 분이 순서를 바꾸지 않는다(↑↓ 없음 · 사장님 9/25). 담으면 이 자리에 들어간다.
     guest(하객 맞이)는 목록에 안 보이고 늘 들어간다. entry · matjeol(맞절) · _close 는 «늘 있어요»([MATJEOL_SPLIT_1013]). */
  /* ★★[SPEECH_IN_FREE 2026-09-25 코워크 회신 둘째 판 · 사장님 결정 4] «축하의 말»을 따로 두지 않는다 —
       친구 · 가족의 축사는 «준비한 순서»의 한 판이다(덕담 뒤 · 축가 앞 [HEART_ORDER_1012 10/12 · 종전 부모님께 인사 뒤] · 10분 안 · 드물게 쓰임).
       첫째 판의 speech 칸(선언 바로 뒤)은 거뒀다. 되살리지 말 것 — 사장님 «준비한 순서만 추가 가능하게».
     ★★[SPEECH_TILE_1012 2026-10-12 사장님 «만약 축사 이벤트를 따로 추가해도 된다고 하면 추가해» → «축사로 바꾸기 (추천)»] «준비한 순서» 칸(free)이 «축사»가 됐다.
       자료: 축사 13.5/23(59%) · 실제 예식 6/8 · «덕담 또는 축사» 자리 18/23 · 자리는 덕담 뒤 · 축가 앞(17곳 중 15곳) — 위 «드물게 쓰임»과 다르다.
       영상은 식전 영상이 맡는다(자료의 영상도 대부분 예식 시작 — C · M · F · Q · N) · 깜짝 선물 · 기타는 새로 고르지 않는다(P «이벤트는 최소화»).
       키는 free 그대로 — 축사 판의 길이 · 원고(S.tx['free.p']) · 콘솔 · 마이페이지가 이미 이어져 있다 · 새 칸은 늘 speech(DEF.freeWhat).
       옛 초안의 영상 · 선물 · 기타는 그대로 돈다(무엇을 줄은 그 초안에만 보인다) · 저장된 값은 옮기지 않는다. «있을 때만» 칸 모양도 걷었다(다른 순간과 같은 칸).
     ★[PREVIDEO_ALWAYS 2026-09-25 사장님 결정 2 · 폐지] 식전 영상은 늘 있다 — 영상이 없는 날은 두 분이 보낸 사진으로 저희가 3분 영상을 만든다.
     ★★[PREVIDEO_PICK 2026-09-27 사장님 «식전 영상은 필수로 하지 말자 · 선택할 수 있게»] 위 결정을 뒤집는다 — 식전 영상은 담는 순간이다(여는 순간 칸).
       담으면 종전과 같다(영상이 없으면 사진으로 3분 영상 · 하객 맞이 03 과 04 사이). 안 담으면 하객 맞이 04 뒤 바로 본식.
       예시 넷은 종전처럼 담아 둔다(예시 화면이 바뀌지 않게) · 빼는 것은 두 분이 고른다. 늘 있는 것은 입장 · 닫는 인사 둘. */
  /* ★★[CAKE_TOAST_SPLIT 2026-09-27 사장님 «케이크랑 축배는 분리하는 게 좋을 거 같아 · 영상도 2개로»] 케이크 커팅(cake)과 축배(toast)는 두 순간이다.
     엔진의 줄(녹음 · 시간)은 종전 «케이크와 축배» 그대로를 두 순간에 나눠 담는다 — 새 녹음 없음 · 둘 다 담은 날 총 시간 그대로.
     옛 초안(on.toast + S.toast both/cake/toast)은 migrateCakeToast 가 두 칸으로 옮긴다. 옛 코스(open 아님)는 한 덩어리 그대로. */
  /* ★★[TABLE_GREET_1008 2026-10-08 사장님 «웨딩사진 전에 테이블 돌아다니면서 인사드리는 이벤트 추가» · 디테일 하나씩 결정]
       테이블 인사(table) — 닫는 인사(108 목례 · 박수) **뒤** · 사진 안내(26) **앞**. 두 분이 함께 테이블을 돌며 하객께 인사 · 테이블마다 1분 30초(TABLE_SEC) ·
       테이블 수는 좌석 배치도(S.tableN · 마이페이지가 orderFill 로 실어 준다 · 없으면 하객 수 ÷ 5 · 그것도 없으면 6) · 두 분 자유 · 시간이 다 되면 26 이 사진으로 모은다(새 마무리 줄 없음).
       고르기에서 다른 순간과 같은 모양 · 기본은 «기록» 예시에만 · 시간이 길어지면 그대로 두고 단체 사진 부족 알림(RANGE_40 ④) · 배웅 줄은 그대로.
       ★9/26 [NO_TABLE_ROUND] 는 «단체 사진 뒤 자리마다 찾아가기»를 뺀 결정이었다 — 이것은 그 자리가 아니라 본식 끝 · 사진 앞의 새 순간이다(옛 narr-round-open 은 되살리지 않는다).
       ★ORDER 끝에 두지만 bodySeq 는 _close 뒤에 놓는다(AFTER_CLOSE) — ORDER 를 쓰는 화면(고르기 · 흐름 · 쪽)은 bodyOrder() 로 자리를 잡는다. */
  /* ★★[SONG_BACK_1011 2026-10-11 사장님 «축가 만들자» → «‹축가› 순간 따로 · 노래만 · MR 반주»(둘 다 추천대로)] 축가가 따로 고르는 순간으로 돌아왔다.
       자리는 실전 자료 순서 그대로 — 성혼 선언 뒤 · 부모님께 인사 앞(자료 23개 중 19.5개 · 실제 예식 8곳 중 7곳 · 순간개편_근거장부.md).
       ★8/07 [TRIM_EVENTS] · 8/09 [SONG_RETIRED] · 9/25 [FREE_WHAT] «라이브 노래 · 연주는 받지 않음»을 사장님이 직접 뒤집었다(장부에 세 결정을 짚어 드린 뒤 «만들자»).
       ★악기 연주는 여전히 받지 않는다(반주는 두 분이 보낸 MR · 디렉터가 튼다) · 계약서 v1.13 3조 ①-2 와 같은 말. 옛 코스 팔레트(GADD)에는 넣지 않는다(옛 코스는 숨김). */
  /* ★★[BLESS_AFTER_DECLARE 2026-10-12 사장님 «추천대로»] 부모님 덕담은 성혼 선언 바로 뒤 — 자료집에서 덕담이 순서에 있는 다섯 곳(B · D · L · P · Q)이 모두 그 자리이고,
       셋(B · P · Q)은 선언을 읽은 아버님이 덕담까지 한 번에 한다. 종전 «서약 바로 앞 · 약속의 문을 여는 자리»(옛 가족 코스에서 온 차례)는 걷었다 — 되살리지 말 것 */
  /* ★★[HEART_ORDER_1012 2026-10-12 사장님 «1단계에서 놓친 거 없는지 … 개선 없을 때까지 추천대로 개선»] 마음의 순간 차례 = 덕담 → 준비한 순서 → 축가 → 편지 → 부모님께 인사.
       자료집에서 부모님께 인사와 축사 · 축가가 함께 있는 22곳 중 21곳이 인사를 축사 · 축가 «뒤»에 둔다(B 한 곳만 앞) · 축사는 축가 앞(17곳 중 15곳) ·
       편지 · 감사 한마디는 인사 바로 앞(D «특별 순서 → 양가 부모님께 인사» · G «감사 한마디 → 인사»). 10/11 참고식순 기준표 4장 «맞춰 본 뼈대»(감사가 마음 칸 뒤)가 결정 대기로 남아 있던 몫이다.
       종전 v4(9/25) «덕담 · 축가 → 인사 → 준비한 순서 → 편지»(준비한 순서 = 인사 뒤 · 편지 = 마지막 큰 순간)는 걷었다 — 되살리지 말 것.
       우리 컨셉: 행진이 없어 인사 뒤에는 2부 몫(케이크 · 축배)과 닫는 인사가 온다 */
  /* ★★[MATJEOL_SPLIT_1013 2026-10-13 사장님 «맞절 만들자 · 이벤트 대본이랑 포즈 관련 자료 줄 테니 우선 형태 뼈대만» · «입장 이후 맞절»]
       맞절이 입장 끝 15초([MATJEOL_1011] 10/11 «입장 끝에 늘 넣기»)에서 입장 바로 뒤의 따로 순간(matjeol)이 됐다 — 늘 있다(ALWAYS · 고를 것이 아니다 · 10/11 결정 그대로).
       뼈대만 세웠다: 줄(132 «두 분, 서로 마주 보고 맞절해 주세요.») · 시간(15초 · 본식 합은 그대로) · 이야기 장면(3초 숙이고 · 3초 멈추고 · 3초 일어나기) · 장면 영상(entry-look)은 입장 끝에 있던 것을 그대로 옮겼다.
       대본 · 포즈 자료가 오면 자료표 «맞절» 줄에 자료를 더한 뒤 CARDS.matjeol · TILE · NARR.entryBow · ritual-story 장면 · 빌더 맞절 쪽을 채운다.
       키는 bow 가 아니라 matjeol — bow 는 옛 코스 부모님께 인사 «큰절»(MODE · TONE · S.tribute) 값 이름이라 겹친다. 입장 끝 맞절(입장 몫 +15초)로 되돌리지 말 것 */
  var ORDER = ['guest', 'prevideo', 'candle', 'entry', 'matjeol', 'welcome', 'vow', 'ring', 'declare', 'bless', 'free', 'song', 'letter', 'tribute', 'cake', 'toast', 'table'];
  /* ★★[TOAST_LAST_1013 2026-10-13 사장님 «축배는 마지막에 하는 게 좋을 것 같아» · «축배 코스 한 곳에 넣어 볼까? 제안 있어?» → 우선 시킨 것 전부 진행]
       축배는 닫는 인사 뒤 · 테이블 인사 앞이다(자료 D · S · AA 다섯 릴스 모두 «1부를 닫은 뒤 2부의 축배 → 테이블 인사») · 우리는 2부가 없어 닫는 인사가 1부의 끝이다.
       ★차례만 닫는 인사 뒤다 — 시간 셈 · 화면의 «본식 n / N» · 흐름 곡선은 축배를 본식 안에 둔다(APART 는 테이블 인사 하나 · TABLE_APART 그대로).
       종전 «부모님께 인사 → 축배 → 닫는 인사»(9/27 CAKE_TOAST_SPLIT · 10/12 EX_STD_1012 뼈대)는 걷었다 — 되살리지 말 것. */
  var AFTER_CLOSE = { toast: 1, table: 1 };   // [TABLE_GREET_1008] 닫는 인사 뒤에 서는 순간 · [TOAST_LAST_1013] + 축배(테이블 인사 앞)
  var APART = { table: 1 };                   // [TABLE_APART · TOAST_LAST_1013] 본식과 따로 세는 순간(시간 · «본식 뒤» 묶음 · 옅은 곡선) — 축배는 닫는 인사 뒤여도 본식 안
  var TABLE_SEC = 90;               // [TABLE_GREET_1008] 테이블당 1분 30초(사장님 결정 · 고정)
  function tableN(S) { var n = +((S || {}).tableN); if (!(n >= 1)) n = 6; return Math.min(6, Math.max(1, Math.round(n))); }   /* ★[TABLE_MAX6 2026-10-08] 상한 = 좌석 배치도 상한(mypage SEAT_ADD_CAP · 6테이블 × 5석) — 종전 12 는 좌석이 허락하지 않는 수였다 */   // [TABLE_GREET_1008] 좌석 배치도 테이블 수 · 모르면 6(30명 ÷ 5 · SEAT_PER5)
  var ALWAYS = { guest: 1, entry: 1, matjeol: 1 };   // [PREVIDEO_PICK] prevideo 는 뺐다 · [MATJEOL_SPLIT_1013] 맞절은 늘(입장 바로 뒤)
  var PRE = { guest: 1, prevideo: 1 };          // 본식 시간에 들지 않는다(하객이 앉는 동안)
  var PICKABLE = ORDER.filter(function (k) { return !ALWAYS[k]; });
  /* ★★[CAKE_OFF_1013 2026-10-13 사장님 «케익은 빼자»] 케이크 커팅은 새로 담지 않는다 — 자료 23곳 중 본식에 둔 곳 0(D 노션 템플릿 2부 한 곳) · 실제 예식 0/8 ·
       본식 끝 축하는 축배가 맡는다(예시 넷 모두). ★케이크 커팅을 새로 담게 하기 금지 — 2026-10-13 사용자 지시로 삭제(계약서 v1.14 별도 비용 줄도 함께 걷음).
       옛 초안(케이크를 담아 둔 식순)은 그대로 돈다 — ORDER · PICKABLE · SECTIONS 에서 빼지 않는다(PICKABLE 에서 빼면 ritual-cue 가 저장된 케이크를 조용히 거른다).
       새로 담는 목록은 OFFER — 고르기 칸(담겨 있을 때만 보임 · order-preview _pkShow) · 담지 않은 순간 · AI 상담. */
  var RETIRED = { cake: 1 };
  var OFFER = PICKABLE.filter(function (k) { return !RETIRED[k]; });

  /* ★★[ACTS_FOUR 2026-09-26 코워크 회신 6 3-5] 네 막 — 휴대폰 · PC 같게. 준비한 순서는 실제 자리(인사와 편지 사이 → 10/12 [HEART_ORDER_1012] 덕담과 축가 사이)에 «있을 때만» 칸으로. ★[SPEECH_TILE_1012] 그 칸이 «축사»가 됐다(다른 순간과 같은 칸).
       종전 [FREE_OWN] 맨 아래 따로 묶음(«특별히 준비한 것이 있다면»)은 거뒀다 — 되살리지 말 것. */
  /* ★★[ACTS_SHIFT_1013 2026-10-13 · MATJEOL_SPLIT_1013] 맞절 칸이 생겨 여는 순간이 다섯 칸 — PC 에서 감사 인사가 혼자 둘째 줄로 떨어졌다(1280 실렌더).
       막 경계를 한 칸씩 뒤로 밀어 막마다 넷(PC 한 줄 · pick-v2 «4 · 4 · 4 · 4»)을 지킨다 — 순서(ORDER)는 그대로이고 칸이 서는 막만 바뀐다(10/12 덕담 칸을 옮겨 3 · 5 를 막은 것과 같은 길).
       여는 순간 = 영상 · 화촉 · 입장 · 맞절 / 약속의 순간 = 감사 인사 · 서약 · 반지 · 선언 / 마음의 순간 = 덕담 · 축사 · 축가 · 편지 / 닫는 순간 = 부모님께 인사 · 닫는 인사 · 축배 · 테이블 인사.
       덕담은 다시 마음의 순간 첫 칸(10/12 전 자리) · 부모님께 인사는 닫는 막 첫 칸(실전 식순의 «양가 부모님께 인사 → 하객께 인사»와 같은 끝 차례) */
  var SECTIONS = [
    { n: '여는 순간', d: '예식이 시작되는 자리', ks: ['prevideo', 'candle', 'entry', 'matjeol'] },   // [MATJEOL_SPLIT_1013] 맞절은 입장 바로 뒤 칸
    { n: '약속의 순간', d: '인사를 드리고, 말과 반지로 부부가 되는 자리', ks: ['welcome', 'vow', 'ring', 'declare'] },   // [ACTS_SHIFT_1013] 감사 인사가 이 막 첫 칸 · 종전 ★[HEART_ORDER_1012] «덕담은 이 막의 끝 칸»(선언 바로 뒤 · 자료 B · P · Py · Q 는 선언과 덕담을 한 덩어리)은 PC 칸 맞춤이었다 — 덕담의 차례는 그대로 선언 바로 뒤
    { n: '마음의 순간', d: '부부가 되어 처음 건네는 마음', ks: ['bless', 'free', 'song', 'letter'] },   // [ACTS_SHIFT_1013] 덕담이 이 막 첫 칸(10/12 BLESS_AFTER_DECLARE 때 이 막이 다섯 칸이라 약속의 순간 끝으로 옮겼던 것을 되돌림) · [SONG_BACK_1011] 축가는 선언 뒤 · [HEART_ORDER_1012] 차례는 덕담 → 축사 → 축가 → 편지 → 부모님께 인사 그대로
    /* [ACTS_SHIFT_1013] 닫는 막 — 첫 칸이 부모님께 인사 · 케이크 칸은 옛 초안이 담아 뒀을 때만([CAKE_OFF_1013] · [CAKE_TOAST_SPLIT]) · 테이블 인사는 닫는 인사 뒤([TABLE_GREET_1008]) · 칸 차례 = 실제 차례(닫는 인사 → 축배 → 테이블 인사 · [TOAST_LAST_1013])
       ★[TABLE_APART 2026-10-08 사장님 «그냥 두고 문구만 조금»] 테이블 인사 줄은 그대로 */
    { n: '축하 · 닫는 순간', d: '부모님께 인사하고 본식을 닫는 자리, 축배와 테이블 인사까지', ks: ['tribute', 'cake', '_close', 'toast', 'table'] }
  ];

  /* ── 카드 문구(시안 2판 EV + 명세 4장 고침) ──
     n 화면 이름 · sn 짧은 이름(띠·목록) · one 한 줄 설명 · shot 남는 장면 · who 누가 · why 이 자리인 까닭 */
  /* [GUESTS_ALL 2026-09-26 사장님 · 코워크 추가 전달 2 D13] «서른 분» → «하객 모두» — 하객이 스무 분인 두 분에게 «서른»은 틀린 말이 된다(정원 글은 그대로) */
  var CARDS = {
    prevideo: { n: '식전 영상', sn: '식전 영상', one: '예식 시작 시각에 두 분이 준비한 영상을 상영해요. 영상이 없으면 보내 주신 사진으로 저희가 영상을 만들어요.', shot: '영상을 보는 하객들의 얼굴',   /* ★[OPEN_WORDS_1013] «끝나면 두 분이 입장해요» 금지 — 예시 넷 모두 화촉이 영상과 입장 사이 · «가족들의 얼굴» → 하객들(GUESTS_OPEN) */ who: '하객(두 분은 문 밖에서 기다려요)' },
    candle: { n: '화촉', sn: '화촉', one: '두 집을 대표해 초에 불을 붙이고, 두 분이 걸어올 길을 먼저 밝혀요.',   /* ★[OPEN_WORDS_1013] «예식의 시작을 알려요» 금지 — 화촉은 영상 뒤 · 시작은 1분 전 안내 · 개식이 알린다(나레이션 2판 «길을 밝혀»와 같은 뜻) */ shot: '초에 불이 옮겨붙는 순간 · 불빛에 비친 얼굴',   /* [DETAIL_0925 B15] 서는 분에 따라 «누가»는 빌더가 바꾼다 */ who: '양가 어머님(누가 서실지는 두 분이 정해요)' },
    entry: { n: '입장', sn: '입장', one: '두 분이 함께 걸어 들어와, 나란히 서는 첫 장면을 남겨요.',   /* [MATJEOL_SPLIT_1013] 맞절은 바로 다음 순간 — 입장 글은 10/11 전 글로(MATJEOL_1011 때 «…맞절해요»를 붙였던 자리) */ shot: '문이 열리는 순간 · 두 분의 첫 장면', who: '두 분' },
    matjeol: { n: '맞절', sn: '맞절', one: '앞에 나란히 선 두 분이 서로 마주 보고 맞절해요.', shot: '마주 보고 고개 숙인 두 분의 옆모습', who: '두 분' },   // ★[MATJEOL_SPLIT_1013] 뼈대 글 — 대본 · 포즈 자료가 오면 고친다(자료표 «맞절» · 동작 팁 J · O «사진이 남는 순간»)
    welcome: { n: '감사 인사', sn: '감사 인사', one: '두 분이 하객께 짧게 감사 인사를 드려요.', shot: '하객을 바라보며 인사하는 두 분', who: '두 분' },   // ★[THANKS_GREET_1013 2026-10-13 사장님 «첫인사가 감사인사 부분이잖아» → «적절한 이름으로»] 이름 «첫인사» → «감사 인사» — «감사문»은 서약 카드 선택지 이름이라 겹친다 · 키 welcome · 녹음된 나레이션 글(«첫인사를 직접 드리겠습니다»)은 3단계 녹음이 바꾼다
    bless: { n: '부모님 덕담', sn: '덕담', one: '부모님이 두 분께 덕담을 들려주세요(한 분 1분쯤).', shot: '말씀하시는 부모님과 듣는 두 분', who: '부모님 한 분~네 분', why: '성혼 선언 바로 뒤예요. 부부가 된 두 분께 부모님이 건네는 첫 말씀이에요.' },   /* [BLESS_AFTER_DECLARE] 선언을 읽은 아버님이 이어서 하셔도 돼요(자료 B · P · Q) */
    vow: { n: '혼인 서약', sn: '서약', one: '두 분이 서로에게 하는 약속을 직접 읽어요(한 분 1분쯤).', oneT: '두 분이 오늘 와 주신 분들께 드리는 감사문을 직접 읽어요(한 분 1분쯤).',   /* [THANKS_IN_VOW] 감사문을 고르면 ② 머리 줄이 이 글(oneOf) */   /* ★[VOW_DECL_DIFF 2026-10-11 사장님 «서약과 성혼선언 차이를 헷갈릴 수 있으니 · 조사한 자료를 참고해서 · 이벤트 클릭하면 나오는 설명에»] 자료 R(혼인서약서 vs 성혼선언문 · «누가 읽느냐로 구분한다») · I(성혼선언문 다섯 판 · 낭독자 = 하객 대표 · 양가 아버지) — 서약 = 두 분이 서로에게 · 본인이 읽는다 / 선언 = 하객 앞에서 부부가 되었음을 · 두 분 대신 다른 분이 읽는다. 두 설명이 «누가 · 누구에게»를 같은 자리에서 말한다(① 미리 보기 PV_DESC 와 같은 뜻) */ shot: '서로를 보며 약속하는 옆얼굴', who: '두 분' },
    ring: { n: '반지 교환', sn: '반지', one: '서로의 손에 반지를 끼워 줘요.', shot: '반지를 끼워 주는 두 손', who: '두 분' },   // [RING_STAGE] 건네는 사람 없음(반지는 단상 위)
    declare: { n: '성혼 선언', sn: '선언', one: '하객 앞에서 성혼 선언문을 읽으면 두 분이 부부가 돼요. 선언문은 두 분이 정하신 한 분이 읽어요.',   /* ★[DECLARE_ANYONE 2026-10-12 사장님 «특정한 인물을 넣어 놓지는 말자»] 누구인지는 ② «읽어 주실 분» 칸에 두 분이 적는다 · 예시는 그 칸에만 */   /* ★[DECLARE_BY_PERSON 2026-10-12 사장님] 나레이션은 선언문을 읽지 않는다 · 읽을 분이 없으면 선언을 빼고 서약으로 */   /* [VOW_DECL_DIFF] 누가 읽는지(두 분이 아니다)가 서약과 가르는 기준 · 어떤 판으로 읽을지는 ② 칩이 말한다 */   /* ★[STAGE_LINES 2026-10-06 사장님] 종전 «부부가 되었음을 알려요» → «선언은 따로 있고 이 줄은 알림인가?»로 읽혔다 · 선언문이 곧 선언 */   /* [R1-35] «누가 · 말투»는 ② 칩이 말한다 */ shot: '하객 모두가 박수 치는 넓은 장면', who: '두 분이 정하신 한 분 · 하객은 박수' },   // [DECLARE_BY_PERSON] · [DECLARE_ANYONE]
    song: { n: '축가', sn: '축가', one: '가족이나 친구가 두 분을 위해 노래 한 곡을 불러요. 두 분이 직접 불러도 돼요. 반주는 보내 주신 MR로 저희가 틀어요 · 악기 연주는 받지 않아요.', shot: '부르는 모습과 듣는 얼굴들', who: '노래하실 분(가족 · 친구 · 두 분 직접도 돼요)' },   // [SONG_BACK_1011] · [SONG_SELF_1011 2026-10-11 사장님 «추천대로»] 두 분이 직접 부르는 축가도(자료 C 신랑 축가 · G 신랑이 신부에게 · Q 두 분 듀엣)
    tribute: { n: '부모님께 인사', sn: '부모님 인사', one: '부부가 되어 처음 부모님께 고마움을 전하고, 안아\u00a0드려요.',   /* ★[HUG_WORDS_1013] «안아 드려요»가 두 줄에 갈리지 않게(390 실렌더 · THANKS_GREET_1013 과 같은 방법) · 동작 말은 TRIB_ACT.how 와 같은 «안아 드려요» 하나 · «품에 안기는 순간»은 사진 줄(PV_DESC · shot)에만 */   /* [R2-37] «인사» 겹침 · 칩(꽃과 포옹 · 신랑 큰절)을 되풀이하지 않게 */ /* [BOW_GROOM] 큰절 안내는 ② «신랑 큰절» 칩을 골랐을 때 칩 아래 힌트로 옮겼다([R1-35]) · [LIST_NAMES] 띠 칩 «부모님 인사» */  shot: '부모님께 안기는 순간', who: '두 분 · 양가 부모님', why: '마음의 순간을 다 마친 뒤예요. 부부가 되어 부모님께 드리는 큰 인사라서예요(한국 예식의 오랜 차례).'   /* [ACTS_SHIFT_1013] 칸은 닫는 막 첫 칸 · 차례는 그대로 */ },   /* [BLESS_AFTER_DECLARE 10/12] «선언 다음» → «뒤» · ★[HEART_ORDER_1012] 인사는 덕담 · 준비한 순서 · 축가 · 편지 뒤(자료 17곳 중 16곳) — 그중 담은 것이 없으면 WHY_ALONE */
    /* ★[TERM_BY_SPEAKER_1013 2026-10-13 코워크 레퍼런스 모음 3-9 «결혼식 용어는 말하는 사람으로 가른다»(정태진 사회자 카드뉴스)] 서약 = 두 분 · 성혼 선언 = 제3자 · 덕담 = 부모님 · 어르신 · 축사 = 친구 · 지인.
       축사 카드의 «가족이나 친구»가 덕담(부모님)과 겹쳐 «친구나 형제자매»로 맞췄다(형제자매는 실제 예식 C «동생들 축사» · 부모님 말씀은 «부모님 덕담») ·
       카드 · 준비 목록 · 예식 이야기 · 식순 화면 · 홈 FAQ · AI 상담 지식을 함께 맞춤 · 축가(누구나 부른다)는 표 밖이라 그대로 · «가족이나 친구»로 되돌리지 말 것 */
    free: { n: '축사', sn: '축사',   /* ★[SPEECH_TILE_1012] 옛 이름 «준비한 순서»(영상 · 깜짝 선물 · 축사 · 기타) → 축사 칸 · 옛 초안의 다른 갈래는 chipLabel 이 이름을 댄다 */ one: '친구나 형제자매가 두 분께 축하의 말을 전해요(3분 안팎).', shot: '말하는 분을 보며 웃는 두 분', /* [FREE_WHAT] shot 은 shotOf 가 무엇을에 따라 고른다 */  who: '축사하실 분(친구 · 형제자매)', why: '축가 앞이에요. 축하 순서가 한자리에 이어지도록.' },   /* ★[HEART_ORDER_1012] 축사는 축가 앞(자료 13곳 중 12곳) · 축가를 안 담으면 WHY_ALONE */
    letter: { n: '편지 낭독', sn: '편지', one: '부모님께, 또는 서로에게 쓴 편지를 읽어요.', shot: '편지를 읽는 목소리와 듣는 얼굴', who: '두 분' },   // ★[LETTER_KEEP_1013 2026-10-13 사장님 «편지는 두는 게 좋을 거 같아»] 순간을 줄일 때도 편지 카드는 남긴다(자료 기본 0/23 이어도) · 빼자는 제안을 다시 올리지 않는다
    cake: { n: '케이크 커팅', sn: '케이크', one: '두 분이 나이프를 함께 잡고 케이크를 잘라요.', shot: '함께 자르는 두 손', who: '두 분' },   // [CAKE_TOAST_SPLIT]
    toast: { n: '축배', sn: '축배', one: '모두 잔을 들어 «위하여». 두 분이 먼저 외치고 하객이 함께 답해요. 축배 잔은 저희가 준비해요.', shot: '모두의 잔', who: '두 분 · 하객 모두', why: '닫는 인사 뒤예요. 잔을 드는 자리는 여기 하나예요.' },   // [CAKE_TOAST_SPLIT] · [WINE_POUR_OFF] · [CLOSE_WORDS_1013] 다른 why 처럼 «[자리]예요. [까닭]»(TOAST_LAST_1013 · 자료 AA 1 · D · S «1부를 닫은 뒤 축배»)
    _close: { n: '닫는 인사', sn: '닫는 인사', one: '두 분이 하객께 인사를 드리고 본식을 마쳐요. 단체 사진은 하객 모두와 한 장, 그다음 가족 · 친구 순서예요.',   /* ★[CLOSE_WORDS_1013] «이어서 하객 모두와 한 장» 금지 — 축배 · 테이블 인사를 담은 날은 그 뒤가 사진이다(자료 DD ③ «촬영 순서 미리») */ shot: '두 분 뒤로 보이는 하객들 · 단체 사진', who: '두 분 · 하객 모두' },
    table: { n: '테이블 인사', sn: '테이블 인사', one: '본식을 마친 두 분이 함께 테이블을 돌며 하객과 인사를 나눠요. 테이블마다 1분 30초쯤 · 다 돌면 그대로 모두 모여 단체 사진으로 이어져요.', shot: '하객 테이블로 다가가는 두 분 · 자리에서 맞는 얼굴들', who: '두 분 · 하객 모두' }   // [TABLE_GREET_1008]
  };

  /* ── 판 칩(카드 안 · 담은 뒤에만 보인다) ──
     값은 **기존 S 키**에 그대로 쓴다 — 엔진과 연출 단계가 이미 읽는 자리라 새 번역이 없다.
       declare → 칩 없음 · S.declareWho 는 두 분이 «읽어 주실 분» 칸에 적은 글([DECLARE_ANYONE 2026-10-12] · declBy · S.declare 는 더 안 쓴다)
       tribute → S.tributeSay (새 키 · 말의 길이) — 방식(꽃·포옹)은 연출 단계의 S.tribute 그대로
       letter  → S.letter   (both 는 새 코스 칩에 없다 · 옛 코스엔 그대로)
       toast   → S.toast · S.wine (새 키 · 축배가 있을 때만) */
  var CHIPS = {
    /* ★★[DECLARE_ANYONE 2026-10-12 사장님 «예를 들어 아버지 지인 친구 뭐 이렇게 얘기한 거지 특정한 인물을 넣어 놓지는 말자»] 성혼 선언은 칩이 없다 —
       읽어 주실 분은 두 분이 칸에 직접 적는다(declBy · DECL_HINT 는 그 칸의 예시). ★읽는 분 칩 되살리지 말 것:
       10/12 첫 판(신랑 아버님 · 신부 아버님 · 친구 · 지인 · DECLARE_BY_PERSON) · 그 전 판(나레이션 · 엄숙하게 / 따뜻하게 · 하객 박수로 답하기 · 가족이 낭독) */
    /* ★★[TRIB_ONE_SAY 2026-10-06 사장님 «한마디씩 · 1분쯤씩 겹치니깐 하나로 개선»] 말의 길이는 «말로 인사» 하나 + «말 없이» — 한마디부터 1분쯤까지 두 분 마음대로.
       ★값은 long 하나로 모은다 — 시간 몫(1분쯤씩)을 넉넉한 쪽으로 잡아야 140분 시간표 · 단체 사진 표 · 본식 범위(RANGE)가 그대로다(one 으로 모으면 표가 줄어 계약 문구까지 흔들린다).
       옛 값 one 은 CHIP_OK 에서 떨어져 long 으로 읽힌다(엔진 norm 도 DEF 로) · ★«한마디씩» · «1분쯤씩» 두 칩 되살리지 말 것 */
    tribute: [['long', '말로 인사'], ['none', '말 없이']],   /* [DETAIL_0925 E] 준비 목록에는 «한 분 300자 안팎»([R1-20] 1분쯤 = 300자) */
    letter: [['each', '서로에게'], ['parent', '각자 부모님께']],
    toast: [['both', '케이크와 축배'], ['toast', '축배만'], ['cake', '케이크만']],
    /* ★★[WINE_POUR_OFF 2026-09-27 사장님 «와인은 우리가 준비하는 건데 그냥 건배사를 하려고 하는 건데 · 그런 이벤트가 있다면 없애야 할 거야»]
       두 와인을 한 잔에 붓기 · 양가 와인 한 병씩을 걷었다 — 축배는 저희가 준비한 잔으로 건배사만. 값은 늘 'none'(엔진은 'none'이면 붓는 줄을 만들지 않는다 · 옛 코스와 같은 길).
       고르는 칩 · 두 분 «와인 두 병» 챙길 것 · 양가 «와인 한 병씩» 부탁도 함께 사라진다. 되살리지 말 것 */
    wine: [['none', '붓지 않음']],
    /* ★[FREE_WHAT 2026-09-25 코워크 4-4] 준비한 순서 — 무엇을 × 길이. 라이브 노래 · 연주는 받지 않는다(사장님 결정 1 · 4). */
    /* [DETAIL_0925 E] 여섯 → 넷(FREE_KIND 네 갈래와 같게). 옛 값 dance · show · hand 는 chipOf · norm 이 갈래로 옮긴다 */
    /* ★★[FREE_ETC 2026-10-06 사장님 «기타 칸 만들자 · 직접 적을 수 있게 · 길이도 직접 · 춤 공연은 빼고»] 춤 · 공연(stage) 걷음 → 기타(etc) — 무엇을 글칸(S.freeEtc) · 길이 분 칸(S.freeLen 1~10).
       옛 값 stage · dance · show 는 기타로 읽는다(FREE_OLD) · ★«춤 · 공연» 칩 되살리지 말 것 */
    free: [['video', '영상'], ['gift', '깜짝 선물 · 전달'], ['speech', '축사'], ['etc', '기타']],   // ★[R2_SPEECH_LABEL_1014] «친구 · 가족의 축사» → «축사»(칸 이름과 같게 · TERM_BY_SPEAKER_1013 덕담 = 부모님 · 콘솔 배지 «여기는 고를 수 있어요 · 축사 · 3분»)
    freeLen: [['3', '3분'], ['2', '2분'], ['1', '1분']],
    /* ★[ENTRY_SCENE 2026-09-25 코워크 회신 4-3 · 추가 전달 B7] 입장의 «첫 모습»(새 키 하나) — 서로 바라보기 · 맞절.
       소리는 같다(모습 · 영상만 달라진다) · 시간표 그대로. 새 코스에만 · 옛 코스는 norm 이 look 으로 둔다. */
    entryScene: [['look', '서로 바라보기'], ['bow', '맞절']],
    /* ★[GOODS_CHOICE 2026-09-25 사장님 결정 · 코워크 회신4 5-1] 케이크 · 부모님께 드릴 꽃은 값에 들지 않는다.
       (역사) 두 분이 직접 준비하거나 저희에게 맡기던 판 → 2026-10-06 [GOODS_STUDIO] 로 늘 저희가 준비(별도 비용).
       업체 소개는 하지 않는다(사장님 «그냥 우리가»). 새 키 둘(S.cakeBy · S.flowerBy) · 소리와 시간표는 그대로. */
    /* ★★[GOODS_STUDIO 2026-10-06 사장님 «당일 준비 케이크랑 꽃이랑 부케랑 이런 건 우리가 준비하는 걸로 하자» ·
       «기본 조화 부케는 준비 · 생화를 희망하면 별도 · 케이크 · 부모님 꽃도 별도»] 고르는 칩(직접 준비 · 맡기기) 금지 — 2026-10-06 사용자 지시로 삭제.
       키 둘(cakeBy · flowerBy)은 옛 초안 호환으로 남기되 늘 studio 다(chipOf). 두 분 «챙길 것»에 케이크 · 꽃이 다시 들어가지 않는다. */
  };
  // 준비한 순서의 무엇을 → 여는 말 · 준비할 것 · 남는 장면의 갈래(영상 / 무대 / 건네기)
  var FREE_KIND = { video: 'video', etc: 'etc', stage: 'etc', dance: 'etc', show: 'etc', gift: 'gift', hand: 'gift', speech: 'speech' };   // [FREE_ETC] 무대 갈래 → 기타
  var FREE_OLD = { dance: 'etc', show: 'etc', stage: 'etc', hand: 'gift' };   // 옛 칩 값 → 갈래 · [FREE_ETC] 춤 · 공연은 기타로
  // 칩 값 ↔ S
  function chipOf(k, S) {
    S = S || {};
    if (k === 'declare') return '';   // [DECLARE_ANYONE] 칩이 없다 — 읽는 분은 declBy(S)
    if (k === 'tribute') return CHIP_OK('tribute', S.tributeSay) ? S.tributeSay : 'long';   // [TRIB_ONE_SAY] 옛 one → long
    if (k === 'letter') return S.letter === 'parent' ? 'parent' : 'each';
    if (k === 'toast') return (S && S.on && (S.on.cake || S.on.toast)) ? toastMode(S) : (CHIP_OK('toast', S && S.toast) ? S.toast : 'both');   // [CAKE_TOAST_SPLIT] 담은 두 칸에서 따라 정한다
    if (k === 'wine') return 'none';   // [WINE_POUR_OFF]
    if (k === 'free') { var fv = FREE_OLD[S.freeWhat] || S.freeWhat; return CHIP_OK('free', fv) ? fv : 'speech'; }   // [SPEECH_TILE_1012] 모르는 값 · 빈 값은 축사(옛 기본 video)
    if (k === 'freeLen') return /^(10|[1-9])$/.test(String(S.freeLen)) ? String(S.freeLen) : '3';   // [FREE_LEN10 2026-10-06 사장님] 분을 직접 적는다 · 1~10분(계약서 v1.12 ①-2 «10분 안 · 길어진 만큼 단체 사진이 준다»)
    if (k === 'entryScene') return S.entryScene === 'bow' ? 'bow' : 'look';
    if (k === 'cakeBy' || k === 'flowerBy') return 'studio';   // [GOODS_STUDIO] 늘 저희가 준비 · 옛 초안의 self 도 studio
    return '';
  }
  /* ★★[DECLARE_ANYONE 2026-10-12 사장님 «특정한 인물을 넣어 놓지는 말자» · «낭독자는 지정해야 하는 건 맞아» · «작성하는 곳에 예시로»]
     성혼 선언문 읽어 주실 분 = 두 분이 칸에 적은 글(S.declareWho). 줄바꿈 · 겹친 띄어쓰기는 한 칸으로 · 30자까지.
     옛 칩 값(10/12 첫 판) gdad · bdad 는 그 이름으로 옮기고, 그 밖의 옛 값(friend · narr · family · ask · chorus · clap)은 빈칸(아직 안 정함)으로 읽는다. */
  var DECL_MAX = 30, DECL_HINT = '예) 아버님 · 친구 · 지인';   // 사장님 말 그대로(«아버지 지인 친구») · 폰 칸 한 줄에 선다(15자)
  var DECL_OLD = { gdad: '신랑 아버님', bdad: '신부 아버님', friend: '', narr: '', family: '', ask: '', chorus: '', clap: '' };
  function declBy(S) {
    var v = S && S.declareWho; if (typeof v !== 'string') return '';
    if (Object.prototype.hasOwnProperty.call(DECL_OLD, v)) return DECL_OLD[v];
    return v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, DECL_MAX);
  }
  function CHIP_OK(k, v) { return (CHIPS[k] || []).some(function (c) { return c[0] === v; }); }
  function setChip(S, k, v) {
    if (!CHIP_OK(k, v)) return S;
    if (k === 'tribute') S.tributeSay = v;   // [DECLARE_ANYONE] declare 칩은 없다(읽는 분은 칸에 적는다 · setv)
    else if (k === 'letter') S.letter = v;
    else if (k === 'toast') S.toast = v;
    else if (k === 'wine') S.wine = v;
    else if (k === 'free') S.freeWhat = v;
    else if (k === 'freeLen') S.freeLen = v;
    else if (k === 'freeEtc') S.freeEtc = String(v || '').slice(0, 40);   // [FREE_ETC]
    else if (k === 'entryScene') S.entryScene = v;
    else if (k === 'cakeBy' || k === 'flowerBy') S[k] = 'studio';   // [GOODS_STUDIO] 고르는 칸 없음
    return S;
  }
  /* 판 이름(목록 · 띠) — 칩 이름과 같되 둘만 다르다.
     ★[TRIBUTE_CROSS 2026-09-25 코워크 4-6] 인사 «한마디씩» + 편지 «각자 부모님께»를 함께 담으면
       인사 한마디는 **서로의** 부모님께 드린다(신랑 → 장인 · 장모님, 신부 → 시부모님) — 편지와 겹치지 않는다.
     ★준비한 순서는 «영상 · 3분»처럼 둘을 한 이름으로. */
  function crossTribute(S) { return onOf(S, 'tribute') && chipOf('tribute', S) === 'long' &&   /* [TRIB_ONE_SAY] 말로 인사 + 편지 «각자 부모님께» → 서로의 부모님께 */ onOf(S, 'letter') && chipOf('letter', S) === 'parent'; }
  function chipLabel(k, S) {
    if (k === 'tribute' && crossTribute(S)) return '서로의 부모님께 말로 인사';   // [TRIB_ONE_SAY]
    if (k === 'free') return (chipOf('free', S) === 'etc' ? (String(S.freeEtc || '').trim() || '기타') : labelOf('free', chipOf('free', S))) + ' · ' + chipOf('freeLen', S) + '분';   // [FREE_ETC] 기타는 적은 이름 · 길이는 분 그대로
    return labelOf(k, chipOf(k, S));
  }
  function labelOf(k, v) { var c = (CHIPS[k] || []).filter(function (x) { return x[0] === v; })[0]; return c ? c[1] : ''; }
  // 손으로 처음 담을 때의 기본 판(명세 5장)
  /* ★[SAVED_OK 2026-09-25 코워크 추가전달 1-2] 새 코스가 S 에 적는 값 중 옛 표(DECLARE 등)에 없는 것 — 판정은 여기 한 곳.
     «하객 박수로 답하기»(S.declare='clap')가 옛 표에 없어 ④ rowVal 이 TypeError 로 멈추고(‹기록› 예시가 ④ 를 못 열었다),
     새로고침하면 _applySaved 가 '1'(엄숙하게)로 말없이 바꿔 그대로 저장했다. */
  var SAVED_OK = { declare: ['1', '2', 'clap'] };   // [DECLARE_BY_PERSON] 옛 초안의 S.declare 값 — 더 안 쓰지만 옛 판이 읽어도 멈추지 않게 남긴다
  function savedOk(key, v) { return !!SAVED_OK[key] && SAVED_OK[key].indexOf(String(v)) > -1; }
  var DEF = { entry: 'A', declareWho: '', declare: '1', tributeSay: 'long', letter: 'each', toast: 'both', wine: 'none', candleWho: 'mothers', freeWhat: 'speech', freeLen: '3', entryScene: 'look' };   // [SPEECH_TILE_1012] freeWhat 기본 = 축사

  /* ── 화촉 서는 분(연출 단계 · S.candleWho) ── */
  /* ★★[PARENTS_ENTRY_OFF 2026-10-12 사장님 «양가부모님 입장은 생략»] 화촉 «서는 분»은 10/11 전 차례로 되돌렸다 — 양가 어머님(기본) · 양가 아버님 · 양가 부모님 네 분 · 다른 두 분.
     «네 분»은 자리에서 앞으로 나와 불을 밝히는 판이다(따로 걸어 들어오는 입장 없음). 우리는 두 분 입장 한 번이 행진이라 그 앞에 걷는 순서를 하나 더 두지 않는다
     ★[CANDLE_BOW_1012 2026-10-12 사장님 «부모님 입장을 생략한다는 얘기였어 · 신랑 신부는 입장해야지»] 생략은 부모님 입장 하나 — 신랑 신부 입장은 늘 있다(ALWAYS.entry) ·
       불을 밝힌 뒤 하객께 인사는 입장이 아니라 화촉의 한 동작이라 어느 분이 서든 한다(자료 D · G · O)
     (자료 7곳 B · C · G · M · N · P · Q 의 «리마인드 입장»은 장부 «양가 부모님 입장» 줄에서 우리 컨셉으로 걸렀다).
     ★되살리지 말 것: 첫 칸 «부모님 함께 입장»(10/11 CANDLE_PARENTS_FIRST · 네 분 입장 → 하객께 인사 → 어머님 점화 · +20초) */
  var CANDLE_WHO = [['mothers', '양가 어머님'], ['fathers', '양가 아버님'], ['parents', '양가 부모님 네 분'], ['others', '다른 두 분']];   // [R2-34] 두 분짜리끼리 먼저(어머님 · 아버님) · 키는 그대로라 저장 초안과 호환   // [R1-36] 둘째만 «양가»가 빠져 한쪽 부모님인지 네 분인지 헷갈렸다(부탁 글은 «양가 어머님과 아버님께서»)

  /* ── 예시 넷(명세 5장) · on = 담는 순간(늘 있는 guest·entry 제외) · set = 판 ── */
  /* ★★[EXAMPLES_0925 2026-09-25 사장님 결정 3 · 코워크 회신 둘째 판 4-5] 기록 · 약속에 부모님께 인사를 더함 ·
       전부는 인사 한마디를 «서로의 부모님께»(편지를 각자 부모님께 쓰므로 · TRIBUTE_CROSS).
     ★식전 영상은 넷 모두 담아 둔다(PREVIDEO_PICK · 종전 PREVIDEO_ALWAYS 와 같은 화면). 옛 «준비한 순서는 어느 예시에도 없다»(9/25 «특별히 준비했을 때만 · 몇 없음»)는
       2026-10-12 [SPEECH_TILE_1012] 로 바뀌었다 — 그 칸이 축사가 되어 «정석»에 담는다.
       기록은 12~17분 그대로(«시간보다 자연스러운 예식» — 사장님). */
  /* ★[DECLARE_BY_PERSON 2026-10-12] 예시는 성혼 선언을 누가 읽을지 정하지 않는다(종전 기록 «하객 박수로 답하기» · 약속 «나레이션 · 따뜻하게» · 가족 · 간결 «나레이션 · 엄숙하게» — 나레이션 선언을 걷었다).
     읽어 주실 분은 두 분이 고르고 부탁한다 · 안 고르면 할 일에 «읽어 주실 분 정하기»가 남는다 */
  var EXAMPLES = [
    /* ★★[EX_BRIEF 2026-09-26 사장님 결정 · 코워크 회신 9/26 3-2] 넷째 «전부» → «간결» · «약속»의 부모님께 인사 → 말 없이.
         «전부»(all)는 거뒀다 — 저장된 초안의 pickFrom:'all' 은 exampleOf 가 null 이라 originOf 가 «직접 고르셨어요.»로 조용히 보인다
         (담은 순간은 그대로). 되살리지 말 것. feel = 카드의 분위기 한 줄(① 개편 [PICK_V2] 이 쓴다). */
    /* ★★[EX_STD_1012 2026-10-12 사장님 «정석 · 기록 · 가족 · 간결 (추천)» · 2단계 «스탠다드가 되는 작업이니깐 실전 자료들 잘 참고해서 완성도 높게»]
         예시 넷 = 같은 뼈대 + 예시마다 성격 한두 개(나침반 «필수는 고정 · 선택은 2~3개» — P · yoonypic · N).
         뼈대 = 화촉(자료 23/23) · 입장 · 맞절(22) · 서약(21) · 성혼 선언(21) · 부모님께 인사(23) + 우리 몫 식전 영상 · 축배(2부가 없어 본식 끝 축하 · 빼면 «끝이 조용한 편» 알림).
         ★[TOAST_LAST_1013 2026-10-13 사장님 «축배 코스 한 곳에 넣어 볼까?» → 추천 «기록» 한 곳] 축배는 뼈대에서 내려 «기록» 예시에만 둔다 — 자료 23곳 중 본식에 둔 곳 0 · 2부에 둔 곳 2(D · S) + AA 릴스 다섯 모두 2부.
           «기록»(밝고 경쾌하게 · 하객과 가까이)은 테이블 인사가 있어 «축배 → 테이블 인사»(AA 이재련 · D)가 그대로 선다 · «끝이 조용한 편» 알림은 함께 걷었다(아래 NOTICE).
         정석 = + 첫인사 · 축사 3분(«덕담 또는 축사» 자리 18/23 · 실제 예식 7/8 · [SPEECH_TILE_1012]) · 축가(19.5/23 · 실제 예식 8곳 중 7곳) — 자료의 «실패 없는 뼈대» 그대로 · 기록 = + 첫인사 · 테이블 인사(우리 고유 · 자료 D 는 2부) ·
         가족 = + 첫인사 · 덕담(B · P · Q — 선언을 읽은 아버님이 덕담까지) · 축가 · 간결 = 뼈대만(A — 축사 · 축가 없이도 «깔끔»).
         ★예시에 넣지 말 것: 반지(9/23 · 10/11 사장님 «반지교환 이런 건 코스에 빼고 원하면 넣을 수 있게» → «반지 · 케이크») · 케이크(같은 결정 · 자료는 2부 → 10/13 [CAKE_OFF_1013] 새로 담지 않는다) ·
           편지(0/23 · «서로에게 쓴 말»은 서약이 맡는다 · 10/13 [LETTER_KEEP_1013] 카드는 남긴다) — 반지 · 편지는 + 로 담는다(장부 «기본에서 내림»).
         ★«약속»(promise · 편지 중심)은 걷었다 — 저장된 초안의 pickFrom:'promise' 는 exampleOf 가 null 이라 «직접 고르셨어요.»(담은 순간은 그대로 · EX_BRIEF 와 같은 길). 되살리지 말 것.
         ★테이블 인사는 기록에만 — 6테이블 9분이라 축가와 함께면 늦어진 날 단체 사진 14분(SHORT_MIN 16 아래 · 5테이블까지는 괜찮다) · 사장님 10/12 «지금처럼»(테이블마다 한 장 따로 남기지 않는다).
         ★숫자(본식 · 테이블 인사 · 단체 사진)는 엔진이 잰다 — scripts/audit/open-course.mjs 의 WANT · SEC. 넷 모두 알림 없음 · 홈 · 계약서의 «본식 약 N~M분»(RANGE)은 아래 RANGE 주석(TOAST_LAST_1013 · 7~25). */
    /* ★★[EX_ENTRY_FEEL_1012 2026-10-12 사장님 «느낌에 맞춰 넷 다 (추천)» · 2단계 점검] 예시가 미리 누르는 입장 멘트 칩 = 그 예시의 느낌 한 줄과 같은 결.
         정석(익숙하고 편안하게) 담백하게 — 빌더 기본값(A)과 같다 · 기록(밝고 경쾌하게 · 하객과 가까이) 힘차게 12초 ·
         가족(격식 있고 뭉클하게) 다정하게 그대로(«부모님께는 여전히 아이 같은 두 사람이») · 간결(짧고 단정하게) 격식 있게 16초 —
         간결에는 첫인사가 없어 «귀한 걸음 해 주신 여러분» 감사 한마디가 입장에서 한 번 나간다(자료 M «참석 감사 멘트는 필수»).
         옛 짝(정석 격식 있게 · 기록 담백하게 · 간결 담백하게 = 가장 긴 23초)은 걷었다.
         ★멘트 글은 그대로다 — 사장님 «멘트는 대대적으로 한번 개선 작업을 할 거야 따로»(3단계) · 그때 이 짝도 함께 다시 본다. */
    { k: 'standard', nm: '정석', title: '실제 예식에서 가장 많이 하는 순서', feel: '익숙하고 편안하게 · 가장 많이 하는 순서', on: ['prevideo', 'candle', 'welcome', 'vow', 'declare', 'free', 'song', 'tribute'], set: { entry: 'A', tribute: 'long', free: 'speech' } },   // [EX_STD_1012] · [EX_ENTRY_FEEL_1012] 입장 담백하게(빌더 기본값과 같다 · 옛 격식 있게)
    { k: 'record', nm: '기록', title: '부부가 되는 순간, 모두의 박수', feel: '밝고 경쾌하게 · 하객과 가까이' /* [TABLE_GREET_1008 사장님 «기록에 넣고 소개를 바꾼다»] 옛 «단체 사진을 넉넉히» — 테이블 인사 9분이 들어 단체 사진 15~20 → [EX_STD_1012] 반지 · 케이크가 빠져 18~22 */, on: ['prevideo', 'candle', 'welcome', 'vow', 'declare', 'tribute', 'toast', 'table'], set: { entry: 'B', tribute: 'none' } },
    { k: 'family', nm: '가족', title: '부모님과 나누는 순간', feel: '격식 있고 뭉클하게 · 부모님이 말씀하세요', on: ['prevideo', 'candle', 'welcome', 'vow', 'declare', 'bless', 'song', 'tribute'], set: { entry: 'E', tribute: 'long' } },   // [EX_STD_1012] + 축가 · − 반지 · 케이크
    { k: 'brief', nm: '간결', title: '짧게, 핵심만', feel: '짧고 단정하게 · 약속과 선언에 집중', on: ['prevideo', 'candle', 'vow', 'declare', 'tribute'], set: { entry: 'C', tribute: 'none' } }   // [EX_ENTRY_FEEL_1012] 입장 격식 있게(옛 담백하게 23초) · [EX_STD_1012] + 화촉 · 부모님께 인사(말 없이) · − 반지 · 케이크(본식 8~12 그대로)
  ];
  function exampleOf(k) { for (var i = 0; i < EXAMPLES.length; i++) if (EXAMPLES[i].k === k) return EXAMPLES[i]; return null; }
  // 예시를 S 에 입힌다 — 순간은 통째로 바꾸고, 판은 기본 위에 예시 값을 얹는다
  function applyExample(S, k) {
    var ex = exampleOf(k); if (!ex) return S;
    S.on = {}; ex.on.forEach(function (x) { S.on[x] = 1; });
    S.entry = ex.set.entry || DEF.entry;
    /* [DECLARE_BY_PERSON · DECLARE_ANYONE] 예시는 읽을 분을 정하지 않는다(두 분이 적는다) · 적어 둔 분은 그대로 둔다 */
    setChip(S, 'tribute', ex.set.tribute || DEF.tributeSay);
    setChip(S, 'letter', ex.set.letter || DEF.letter);
    S.ctSplit = 1; S.toast = toastMode(S); S.wine = 'none';   // [CAKE_TOAST_SPLIT] 케이크 · 축배는 담은 칸이 정한다 · [WINE_POUR_OFF]
    setChip(S, 'free', ex.set.free || DEF.freeWhat);
    setChip(S, 'freeLen', ex.set.freeLen || DEF.freeLen);
    S.pickFrom = k;
    return S;
  }

  /* ── 순서 계산 ── */
  function onOf(S, k) { return !!(ALWAYS[k] || (S && S.on && S.on[k])); }
  /* [CAKE_TOAST_SPLIT] 엔진 판(S.toast)은 두 칸에서 따라 정한다 — 둘 다 both · 케이크만 cake · 축배만 toast */
  function toastMode(S) { var c = onOf(S, 'cake'), t = onOf(S, 'toast'); return c && t ? 'both' : c ? 'cake' : 'toast'; }
  /* [CAKE_TOAST_SPLIT] 옛 초안 옮기기(한 번 · ctSplit 표시) — on.toast + S.toast(both · cake · 없음) → on.cake · on.toast. 되돌리지 말 것 */
  function migrateCakeToast(S) {
    if (!S || !S.on || S.ctSplit) return S;
    if (S.on.toast && !S.on.cake) { var v = S.toast; if (v === 'both' || v === 'cake' || !v) S.on.cake = 1; if (v === 'cake') delete S.on.toast; }
    S.ctSplit = 1; if (S.on.cake || S.on.toast) S.toast = toastMode(S);
    return S;
  }
  function seqOf(S) { return ORDER.filter(function (k) { return onOf(S, k); }); }       // guest 포함 · _close 제외
  /* [TABLE_GREET_1008] 본식 차례 = 담은 순간(식전 · 닫는 인사 뒤 것 제외) → 닫는 인사 → 닫는 인사 뒤 순간(테이블 인사) */
  function bodyOrder() { return ORDER.filter(function (k) { return !PRE[k] && !AFTER_CLOSE[k]; }).concat(['_close']).concat(ORDER.filter(function (k) { return AFTER_CLOSE[k]; })); }
  function bodySeq(S) { return seqOf(S).filter(function (k) { return !PRE[k] && !AFTER_CLOSE[k]; }).concat(['_close']).concat(seqOf(S).filter(function (k) { return AFTER_CLOSE[k]; })); }   // 본식만 + 닫는 인사 + 그 뒤 순간
  function picked(S) { return PICKABLE.filter(function (k) { return S && S.on && S.on[k]; }); }

  /* ── 시간 표(부록 A · 초) — [대본(성우), 사람 말, 말 없는 시간, 여유] ──
     ★«축배만 · 케이크만»은 명세가 «지금 코드 길이를 옮긴 뒤 코워크가 채운다»고 비워 둔 줄이다.
       지금 값은 **코드 추정**(엔진 문안 음절 · TOAST.est)이다 — 코워크가 채우면 이 두 줄만 바꾼다.
     ★입장 B·D 는 표에 없다(예시·기본이 안 쓰는 판). 문안 음절로 추정했다.
     ★«입장 첫 장면 · 함께 불 밝히기 +15초»는 첫 장면 키가 아직 없어 넣지 않았다(구현 보고). */
  var TIME = {
    prevideo: [9, 0, 180, 0],   // ★[SOURCE_FIRST_1016] 여는 말 90 = 자료 G2 121 대안 2(29음절 5.8초 · +2)
    candle: [58, 0, 60, 38],   // ★[SOURCE_FIRST_1016 · CANDLE_CALL_SRC_1016] 대본 25 → 58초(어머님 판 여는 말 FF 1-2 140음절 33초 + 맺는 말 4.2 + 인사 구호 11.7 + 구호 뒤 4초 둘 + 사슬 1.25) · 말 없는 시간 70 → 60(맞절 · 인사가 구호 사이 쉼으로 들어가 자리로 돌아가는 15초만 남는다)   // [PARENTS_ENTRY_OFF 2026-10-12] 판 없이 하나(입장 +20초 걷음) · [CANDLE_BOW_1012] 불을 밝힌 뒤 인사 몇 초는 여유 38초 안 · ★[CANDLE_CALL_1014] 대본 12.5 → 25초(여는 말 앞 문장 +6.3 · 인사 안내 줄 4.7 + 사슬 1.25)
    entry: { A: [23.5, 0, 25, 42], B: [51, 0, 25, 42], C: [30, 0, 25, 42], D: [39, 0, 25, 42], E: [44, 0, 25, 42], F: [22, 0, 25, 42] },   // ★[SOURCE_FIRST_1016] 입장 멘트 = 자료 CC2 그대로로 다시 쟀다(음절 ÷ 300/분 + 문장 사이 1.25 + 받는 말 4.8 + 사슬 1.25)   // ★[ENTRY_ARRIVE_1014] 입장 받는 말 3.25 + 사슬 1.25 = +4.5초(판마다)   // ★[ENTRY_TIME_1014] 원고 3단계 글로 다시 쟀다(음절 ÷ 300/분 + 문장 사이 1.25 + 구호 앞 쉼) — A 23 → 14(76 → 47음절) · C 16 → 12(10/14 엔진 · 39음절) · 나머지는 그대로
    matjeol: [31, 0, 12, 0],   // [MATJEOL_SPLIT_1013] 맞절 몫(아래 BOW 와 같은 값 · 종전엔 입장 몫에 더했다) · ★[MATJEOL_4_1014] 여는 말 3 → 15초(4판 ② 네 문장 48음절 + 마주 보기 3초 · 원고 0-4 «본식 +12초»)
    welcome: [4, 40, 8, 0],   // ★[SOURCE_FIRST_1016] 여는 말 = 정형구 18음절 · 말하는 시간 = 자료 Z 3 «약 40초 분량»(번갈아 감사 인사)
    bless: [17, 153, 8, 20],
    vow: [22, 100, 8, 10],   // [SOURCE_FIRST_1016] 여는 말 «다음은 …» · «천천히 하셔도 괜찮습니다»(T 33) +2.6 · 맺는 말 «두 사람의 서약이었습니다»(G3 P23) −1.6
    ring: { toDeclare: [20, 0, 80, 2], other: [20, 0, 68, 2] },
    declare: [12, 15, 8, 20],   // ★[DECLARE_BY_PERSON 2026-10-12] 누가 읽든 같다 — 여는 말 · 맺는 말 12초(136 24음절 · [DECLARE_ANYONE] 여는 말은 하나 + 57 26음절 · 쉼 포함) · 선언문 낭독 15초(66자) · 마이크 · 카드 건네기 8초 · 여유 20초(읽을 분은 정면 가까운 자리 · 걸어 나오고 들어가기). 옛 나레이션 판(엄숙 16 · 따뜻 12 · 박수 30) 걷음
    tribute: { one: [26, 34.7, 25, 30], long: [26, 138.8, 25, 30], none: [26, 0, 25, 30] },   // [SOURCE_FIRST_1016] 이름 줄 = 자료 FF 2-1(45음절 9초 · +6.2) · 구호 GG 1(−0.2)   // ★[TRIB_TIME_1014] 대본을 지금 소리로 다시 쟀다 — 이름 줄 2.8(짝 줄 3.4) + 사이 1 + 여는 말 7.4 + 구호 2.6 + 맺는 말 6.2 = 20초(옛 38 · 42.5 는 꽃 헌정 때 대본 · 말 없이 판도 대본은 같다)
    song: [8, 0, 210, 20],   // [SONG_BACK_1011] 여는 말 8초(19 narr-song · 32음절) · 노래 3분 30초(옛 실측 «축가 1곡» 210 · 자료 중앙값 3분) · 오가는 여유 20초(부르실 분이 앞으로 · MR 시작 · 인사)
    free: [12, 0, 188, 5],   // [FREE_WHAT] 말 없는 시간은 길이 칩에서 — 60 × 분 + 8(3분 188 · 2분 128 · 1분 68)
    letter: { each: [21, 122, 16, 10], parent: [17, 138.8, 16, 10] },   // [SOURCE_FIRST_1016] 여는 말 첫 문장 = 자료 G1 62 · GG 1
    /* [CAKE_TOAST_SPLIT] 종전 «케이크와 축배»(both.none [41, 0, 63, 106])를 두 순간에 나눈다 — 합은 그대로.
       축배 몫 = 축배만 판(여는 말 + 잔 안내 + 선창 + 마무리 · [22, 0, 20, 40]) · 케이크 몫 = 나머지. 한쪽만이면 종전 «케이크만» · «축배만» 줄. */
    cake: { both: [19, 0, 43, 66], only: [26, 0, 35, 45] },
    toast: { both: [23, 0, 20, 40], only: [23, 0, 20, 40] },   // [SOURCE_FIRST_1016] 여는 말 = 자료 AA 37 · 49(+1.5) · 마무리 AA 41
    /* ★[CLOSE_BOW 2026-09-26 코워크 회신5 4-2] 다시 쟀다 — 대본 +5(108 끝 선언 44음절 + 26 새 글 65음절 − 옛 26 85음절 · 300음절/분) ·
       말 없는 시간 +11(목례 3 · 박수 8) · 여유 +2(박수 7~9초 ±1 · 목례 ±1 · 연구 B02 · D02). 인사 유무 판 차이는 그대로.
       ★처음엔 여유 +4 로 넣었는데 «전부» 예시 넉넉 합(×1.25 포함)이 25:01 로 고객 범위(RANGE 12~25 · 코워크 결정)를 넘었다.
         +3 도 25:00.1 이라 넘는다. 범위는 설계 결정이라 코드가 넓히지 않고, 여유를 +2 로 두었다(구현 보고 6 에 적음). */
    _close: { withTribute: [46, 0, 19, 15], noTribute: [46, 0, 24, 10] },   // [SOURCE_FIRST_1016] 끝 선언 DD ① · 템플릿 3 · 사진 안내 셋째 문장 DD(+1.5)
    table: [7, 0, 90, 0]   // [TABLE_GREET_1008] 여는 말 7초 · 말 없는 시간 = TABLE_SEC × 테이블 수(partsOf 가 채운다) · 마무리 말(26)은 닫는 인사 몫에 이미 들어 있다
  };
  /* [MATJEOL_1011 2026-10-11 사장님 «입장 끝에 늘 넣기»] 맞절 몫 15초 — 청하는 한 줄 3초(14음절) · 마주 보기 · 3초 숙이고 · 3초 멈추고 · 3초 일어나기 · 다시 앞 보기 12초.
     따로 여유를 두지 않는다 — 걸어 들어와 서는 차이는 입장 여유(42초)가 이미 맡는다. ★기록 예시 단체 사진이 15분 경계(넉넉 합 25.49분)라 2단계(예시 다시 짜기)에서 숫자를 한 번에 맞춘다 → [EX_STD_1012 2026-10-12] 반지 · 케이크가 빠져 기록 단체 사진 18~22(넉넉 합 21.6분 · 알림 없음) → [EX_ENTRY_FEEL_1012] 입장 힘차게(12초)로 19~22 */
  var BOW = TIME.matjeol;   // [MATJEOL_SPLIT_1013] 따로 순간이 되어 입장 몫에 더하지 않는다 — 값은 TIME.matjeol 한 곳
  /* ★[THANKS_IN_VOW 2026-10-11 사장님 «서약 카드 안에서 고르기»] 감사문 몫 — 여는 말 7초(133 · 29음절)뿐이고 맺는 말이 없다(서약은 여는 말 + 맺는 말 21초).
     두 분이 읽는 시간(한 분 300자쯤) · 말 없는 시간 · 여유는 서약과 같다 */
  var THANKS_TIME = [7, 100, 8, 10];   // [SOURCE_FIRST_1016] 읽는 시간은 글 안내(한 분 300자쯤 · 서약과 같은 칸)를 따른다 — 자료 Z 1 은 «약 1분»(글을 짧게 쓰면 그만큼 짧다)
  function partsOf(k, S, seq) {
    S = S || {}; seq = seq || bodySeq(S);
    var t = TIME[k], i = seq.indexOf(k);
    switch (k) {
      case 'entry': return t[String(S.entry || 'A').toUpperCase()] || t.A;   // [MATJEOL_SPLIT_1013] 맞절 몫(BOW)은 matjeol 순간이 진다 — 종전 [MATJEOL_1011] 입장 끝 +15초
      case 'vow': return S.vowKind === 'thanks' ? THANKS_TIME : t;   // [THANKS_IN_VOW]
      case 'ring': return seq[i + 1] === 'declare' ? t.toDeclare : t.other;
      case 'declare': return t;   // [DECLARE_BY_PERSON] 판 없이 하나
      case 'tribute': return t[chipOf('tribute', S)];
      case 'letter': return t[chipOf('letter', S)];
      case 'free': { var fl = +chipOf('freeLen', S);   // 축사 판: 여는 말 14 · 사람 말 60×분−20 · 걸음 12 · 여유 10(2분이면 대본 126 · 넉넉 161)
        return FREE_KIND[chipOf('free', S)] === 'speech' ? [14, 60 * fl - 20, 12, 10] : [t[0], t[1], 60 * fl + 8, t[3]]; }
      case 'cake': return onOf(S, 'toast') ? t.both : t.only;   // [CAKE_TOAST_SPLIT]
      case 'toast': return onOf(S, 'cake') ? t.both : t.only;
      case '_close': return seq.indexOf('tribute') > -1 ? t.withTribute : t.noTribute;
      case 'table': return [t[0], 0, TABLE_SEC * tableN(S), 0];   // [TABLE_GREET_1008] 두 분 자유라 넉넉 여유 없이 테이블 수 × 1분 30초
    }
    return Array.isArray(t) ? t : [0, 0, 0, 0];
  }
  function lohi(p) { return [p[0] + p[1] + p[2], p[0] + 1.25 * p[1] + p[2] + p[3]]; }
  // 본식 합(초) — a = 대본 합 · b = 넉넉 합. 식전(하객 맞이·식전 영상)은 넣지 않는다.
  function bodySec(S) {
    var seq = bodySeq(S), a = 0, b = 0;
    seq.forEach(function (k) { var r = lohi(partsOf(k, S, seq)); a += r[0]; b += r[1]; });
    return [a, b];
  }
  /* ★[OPEN_RANGE] 고객에게 적는 범위(명세 8장 · 9/25 스냅 50 뒤 (가) 안) — 본식과 사진과 인사를 더해 50분.
     사이트 · 빌더 안내 · AI 상담 · 진행표가 모두 이 값을 쓴다(scripts/check-source-drift.mjs 가 열 벌을 대조).
     ★«쯤»인 까닭 — 빈 채(입장·닫는 인사만)는 2~3분이고, 가장 긴 조합의 넉넉 합은 30.5분이다.
       예시 넷(11~28분)이 모두 이 안에 든다(scripts/audit/open-course.mjs 가 전 조합을 잰다). */
  /* ★★[SNAP_50 2026-09-25] 스냅 50 으로 합이 55 → 50. 범위는 (가) 안 — 개편과 한 번에 «본식 12~25분쯤 · 사진과 인사 25~38분쯤».
     rep 은 «가운데로 적는 한 칸»(랜딩 카드 · 인사 사진 시작 시각 10:30 = 10:10 + 20)이다. 범위의 산술 가운데(22)가 아니라
     예시 넷의 가운데쯤을 사장님 표(«약 20 · 약 30»)대로 둔다. 검사(check-source-drift)가 이 값을 읽는다. */
  /* ★★[RANGE_EX4 2026-09-25 코워크 회신 2-1 (가)] 15~30 · 20~35 → 12~25 · 25~38. «예시 넷 기준»으로 좁혔다
     (기록 11:33~ · 전부 ~24:41 을 분으로 둥글림 · 둘을 더해 50). 빈 채 · 가장 긴 조합은 이 밖으로 나갈 수 있다 — 띠가
     그 판의 실제 값을 따로 보여 주므로 이 한 줄은 «대개 이만큼»이다. 가운데 한 칸(rep)은 그대로. */
  /* ★★[RANGE_40 2026-09-26 사장님 결정 · 코워크 회신 9/26 2-3] 스냅 60 으로 합이 50 → 40 · «사진과 인사» → «단체 사진».
       8 = «간결» 예시 아래 값(8:24) · 25 = 가족 예시 넉넉 합(23:37)에 1분 남짓 여유(P14 그대로) · 단체 사진 15~32 = 40 − 본식 범위(10/13 [TOAST_LAST_1013] 에 7~25 · 15~33).
       [EX_STD_1012 2026-10-12] 예시를 다시 짠 뒤에도 그대로 — 간결 8:02 · 가족 넉넉 합 23:12 · 정석 14:26~19:11 · 기록 본식 9~13(+ 테이블 인사 9).
       [EX_ENTRY_FEEL_1012 2026-10-12] 입장 멘트 짝을 바꾼 뒤에도 그대로 — 간결 7:55(«약 8분») · 가족 23:12 · 정석 14:33~19:18 · 기록 본식 9~12(+ 테이블 인사 9).
       rep 20 → 단체 사진 대표 20분(시작 10:40 = 본식 10:20 + 20). */
  /* ★[TOAST_LAST_1013 2026-10-13] 축배가 «기록» 한 곳으로 가서 «간결»이 7:13 ~ 10:17 이 됐다(축배 42 ~ 82초를 뺌) — 아래 값 8 → 7 · 단체 사진 32 → 33(합 40 그대로).
       위 값 25 는 그대로(가족 넉넉 합 21:49 · 정석 넉넉 합 21:52 · 담을수록 길어지는 판의 여유) · 계약서 v1.14 · 홈 · 빌더 · AI 상담이 같은 값을 쓴다(check-source-drift). */
  var RANGE = { body: [7, 25], photo: [15, 33], rep: 20 };
  var DAYMIN = 40;   // 본식 + 단체 사진 = DAY.total − ready − snap − farewell (ritual-data.js [DAY_PLAN] · [DAY_60]) · open-course.mjs 가 대조
  function rng(x, y) { return x === y ? ('약 ' + x + '분') : ('약 ' + x + '~' + y + '분'); }
  // 띠 한 줄에 필요한 모든 값
  /* ★★[TABLE_APART 2026-10-08 사장님 «테이블 인사는 본식 이후니까 사진과도 따로 본식과도 따로»] 보여 주는 시간을 셋으로 — 본식 · 테이블 인사 · 단체 사진.
       bodySec 은 그대로 둔다(진행표 · 콘솔 시각 · 단체 사진 몫이 «닫는 인사 + 테이블 인사까지»를 쓴다) · span 이 테이블 몫(tm)을 떼어 본식에서 뺀다.
       ★셋을 더하면 늘 DAYMIN — 본식 = (전체를 반올림) − tm 이라 «11~16 + 9 + 15~20 = 40»이 어긋나지 않는다(SPAN_SUM40 과 같은 셈).
       a · b · body · midMin = 본식만 · ta · tb = 테이블 인사까지 · tm = 테이블 인사 분(안 담으면 0 · table 은 '') */
  function tableSec(S) { return onOf(S, 'table') ? lohi(partsOf('table', S, bodySeq(S)))[1] : 0; }
  function span(S) {
    var s = bodySec(S), ta = Math.round(s[0] / 60), tb = Math.round(s[1] / 60), ts = tableSec(S), tm = ts ? Math.max(1, Math.round(ts / 60)) : 0, a = Math.max(0, ta - tm), b = Math.max(0, tb - tm);   // [TABLE_APART]
    /* ★★[PHOTO_FLOOR0 2026-10-08 · TABLE_GREET_1008] 본식이 40분을 넘는 판(순간을 거의 다 담고 축사 10분 · 테이블 인사까지)에 «단체 사진 약 -8~2분»이 보였다 —
       0 아래로 내리지 않고, 위 값까지 0이면 «시간이 모자라요»라고 말한다. 판은 막지 않는다(사장님 «그대로 두고 알림»). */
    var pa = Math.max(0, DAYMIN - tb), pb = Math.max(0, DAYMIN - ta);   // [TABLE_APART] 단체 사진 = 40 − (본식 + 테이블 인사) · ★[SPAN_SUM40 코워크 추가 점검 P2-2 2026-09-26] 반올림한 본식에서 뺀다 — 따로 반올림하면 «본식 17 + 단체 사진 24 = 41»이 보였다
    return { sec: s, a: a, b: b, ta: ta, tb: tb, tm: tm, pa: pa, pb: pb, body: rng(a, b), table: tm ? ('약 ' + tm + '분') : '', photo: pb > 0 ? rng(pa, pb) : '시간이 모자라요', midMin: (s[0] + s[1]) / 120 - ts / 60 };   // [PHOTO_FLOOR0] · [TABLE_APART]
  }
  /* [TABLE_APART] 한 줄 글 — «본식 약 a~b분 · 테이블 인사 약 n분 · 단체 사진 약 c~d분»(테이블 인사를 안 담으면 가운데가 없다) · 알림 · 콘솔 · AI 상담이 같은 말을 쓴다 */
  function spanText(S) { var p = span(S); return '본식 ' + p.body + (p.tm ? ' · 테이블 인사 ' + p.table : '') + ' · 단체 사진 ' + p.photo; }
  // 카드의 «약 n분»(이 순간을 담으면)
  function momentLabel(k, S) {
    if (k === 'prevideo') return '영상 길이만큼';   // [OPEN_WORDS_1013] «끝나면 입장» 뺌(화촉을 담으면 영상 뒤가 화촉)   // [CEREMONY_AT_VIDEO 2026-10-05] 예식 시작 시각에 흐른다 — 길면 입장이 그만큼 늦어진다
    if (PRE[k]) return '본식 시간에 들지 않아요';
    var on = {}; for (var x in (S.on || {})) on[x] = S.on[x]; if (k !== '_close') on[k] = 1;
    var T = {}; for (var y in S) T[y] = S[y]; T.on = on;
    var seq = bodySeq(T), r = lohi(partsOf(k, T, seq));
    return rng(Math.max(1, Math.round(r[0] / 60)), Math.max(1, Math.round(r[1] / 60)));
  }

  /* ── 절정(세기 5 가운데 마지막) — 선언 · 편지 · 400자 인사 ── */
  /* ★★[FLOW_LINE 2026-09-26 코워크 회신 6 3-4 · 추가 전달 2 D6] 세기 3 잔잔 · 4 깊어짐 · 5 벅참.
       3 = 화촉 · 첫인사 / 4 = 입장 · 덕담 · 서약 · 반지 · 인사(한마디씩 · 말 없이) · 준비한 순서 · 케이크 · 축배 · 닫는 인사
       / 5 = 선언 · 편지 · 인사(1분쯤씩). 5 는 종전과 같아 peakOf 는 안 바뀐다.
       ★준비한 순서는 3 → 4(D6) — 3 이면 곡선이 바닥까지 꺼져 «우리가 준비한 영상이 흐름을 깨나?» 하고 걱정하게 된다. */
  var LEVEL3 = { candle: 1, welcome: 1, table: 1 };   // [TABLE_APART] 테이블 인사 = 본식이 끝난 뒤의 여운(잔잔 3) — 곡선이 천천히 내려앉는다
  /* ★두 분이 꼭대기를 고르는 길(고른 값 · 후보 목록 · level 의 고른 값 갈래) 금지 — 2026-10-08 사용자 지시로 삭제 [PEAK_PICK_OFF]
       사장님 «그래프만 바뀌는 거면 의미가 없지 · 저 기능 빼 버려» — 순서 · 시간 · 나레이션 · 진행은 그대로였고 그림 꼭대기와 ★ 만 바뀌었다.
       꼭대기는 종전대로 저절로(선언 · 편지) · 저장된 초안에 남은 고른 값은 읽지 않는다(없는 값처럼) */
  function level(k, S) { if (k === 'declare' || k === 'letter') return 5; if (k === 'tribute') return 4;   /* [TRIB_ONE_SAY] 말로 인사 하나 — 종전 한마디씩과 같은 4(정점은 선언 · 편지) */ return LEVEL3[k] ? 3 : 4; }
  function peakOf(S) { var p = null; bodySeq(S).forEach(function (k) { if (level(k, S) === 5) p = k; }); return p; }

  /* ══ [FLOW_LINE 2026-09-26 코워크 회신 6 3-3 · 3-4 · 추가 전달 2 D3 · D5 · 3 F1] 감동 흐름 — 한 함수가 모든 자리를 그린다 ══
     자료: 본식 순간마다 [시작 초, 길이 초, 세기] · 길이 = (대본 합 + 넉넉 합) ÷ 2 · 순서 = bodySeq.
     곡선: 감동은 빨리 차오르고(20초) 천천히 가라앉는다(70초) — 1초마다 따라가고 ±8초로 고른 뒤, 3px 간격 점을
       단조 곡선(d3 curveMonotoneX 와 같은 셈)으로 잇는다. 높이: 세기 5 = 위 끝 · 3 = 아래 끝.
     선 하나 #7A5F37 · 점 하나(가장 벅찬 순간 구간 안 · 끝 + 15초까지 가장 높은 곳) #3A2D22 + 흰 테두리.
     ★색 · 회색 «앉아서 듣기» 밑줄 · 옅은 절정 칸 · 분 눈금 · 범례는 없다(사장님 «추천대로 진행» · 곡선 A). 되살리지 말 것.
     ★시안(docs/handoff/고르기_개편시안_0926.html)의 flowSVG · envOf · curvePath 를 옮겼다 — 값을 바꾸면 시안과 갈린다. */
  function flowSegs(S) {
    var seq = bodySeq(S), t = 0, out = [];
    seq.forEach(function (k) {
      var r = lohi(partsOf(k, S, seq)), d = (r[0] + r[1]) / 2;
      out.push({ k: k, n: CARDS[k].sn, st: t, d: d, lo: r[0], hi: r[1], lv: level(k, S), after: !!APART[k] });   // [TABLE_APART] 본식 뒤 순간 — 곡선이 옅은 톤으로 그린다 · [TOAST_LAST_1013] 축배는 닫는 인사 뒤여도 본식 톤
      t += d;
    });
    return out;
  }
  function flowPeak(sg) { var p = null; sg.forEach(function (s) { if (s.lv === 5) p = s; }); return p; }
  var FLOW_ENV = { up: 20, down: 70, blur: 8 };
  function flowEnv(sg, total) {
    var n = Math.max(1, Math.ceil(total)), e = [], cur = sg[0].lv, i = 0, t, j;
    for (t = 0; t <= n; t++) { while (i < sg.length - 1 && t >= sg[i].st + sg[i].d) i++; var L = sg[i].lv; cur += (L - cur) * (1 - Math.exp(-1 / (L > cur ? FLOW_ENV.up : FLOW_ENV.down))); e.push(cur); }
    var sm = []; for (t = 0; t <= n; t++) { var a = 0, c = 0; for (j = Math.max(0, t - FLOW_ENV.blur); j <= Math.min(n, t + FLOW_ENV.blur); j++) { a += e[j]; c++; } sm.push(a / c); }
    return sm;
  }
  function flowCurve(pts) {
    var n = pts.length, tg = [], i, d;
    for (i = 0; i < n; i++) tg.push(0);
    for (i = 1; i < n - 1; i++) {
      var h0 = pts[i][0] - pts[i - 1][0], h1 = pts[i + 1][0] - pts[i][0];
      var s0 = (pts[i][1] - pts[i - 1][1]) / (h0 || 1e-6), s1 = (pts[i + 1][1] - pts[i][1]) / (h1 || 1e-6);
      if (s0 * s1 <= 0) continue;
      var q = (s0 * h1 + s1 * h0) / (h0 + h1);
      tg[i] = (s0 > 0 ? 2 : -2) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(q));
    }
    d = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
    for (i = 0; i < n - 1; i++) { var x0 = pts[i][0], y0 = pts[i][1], x1 = pts[i + 1][0], y1 = pts[i + 1][1], dx = (x1 - x0) / 3;
      d += ' C' + (x0 + dx).toFixed(1) + ',' + (y0 + dx * tg[i]).toFixed(1) + ' ' + (x1 - dx).toFixed(1) + ',' + (y1 - dx * tg[i + 1]).toFixed(1) + ' ' + x1.toFixed(1) + ',' + y1.toFixed(1); }
    return d;
  }
  function fesc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  /* opt: mini(작은 선 · 이름 · 눌러 보기 없음) · h · names(선 아래 순간 이름 · PC 띠 · ④) · label */
  /* ★[SEAL_POINTS 2026-09-26 사장님 «진사 포인트 몇 군데» · 코워크 피드백 1-3] 가장 벅찬 순간의 점 · «★ 이름»은 진사(--seal).
     SVG 속성이라 CSS 변수 대신 값 하나로 둔다(선은 금갈색 그대로 · 넓은 면 · 경고에는 쓰지 않는다). */
  var PEAK_INK = '#6B2A24';
  /* ★★[TABLE_APART 2026-10-08 사장님 «그 순간 이후 그래프 색상을 바꾼다던지 디자이너 시선으로 적절하게»] 본식이 끝난 뒤(테이블 인사)의 꼬리는 옅은 금색 —
       같은 곡선을 그대로 잇고(모양은 안 바꾼다) 색만 닫는 인사 끝에서 바뀐다(가로 그라디언트 · 같은 자리에 멈춤 둘).
       큰 곡선에만 꼬리 위 작은 이름 «테이블 인사»(이름 줄을 쓰는 띠 · 작은 곡선에는 없다) · 금색 #B89A75 는 선 전용(글은 #7A5F37) */
  /* ★★[FLOW_MOOD 2026-10-08 사장님 «너무 수학적 그래프 말고 우리 무드에 맞게» → 시안 1 «추천대로 하는데 붓선은 빼자»]
       한 굵기 선은 그대로 · 바닥 가로선(축)을 걷고 · 본식이 끝나면 점선 «여운»(옅은 금 둥근 점) · 입장 · 닫는 인사에 빈 진주 점(본식의 시작과 끝) ·
       이름은 모두 명조(선언과 같은 12.5 · 600) · 이름표는 선 · 다른 이름과 안 겹치는 자리(위 → 더 위 → 아래 · 좌우로 비켜)를 찾고 없으면 점만.
       ★붓선(굵기가 변하는 먹선)은 사장님이 뺐다 — 2026-10-08 «붓선은 빼자» · 되살리지 말 것 */
  var AFTER_INK = '#B89A75', SERIF_SVG = "'Noto Serif KR','Nanum Myeongjo',serif";
  function flowSVG(sg, w, opt) {
    opt = opt || {}; var mini = !!opt.mini, names = !!opt.names, namesOn = names;
    var h = mini ? (opt.h || 40) : (opt.h || (names ? 152 : 112));
    var tiny = mini && h < 24;
    var L = mini ? 4 : 12, R = mini ? 4 : 12, T = mini ? (tiny ? 4 : 8) : 30, B = mini ? (tiny ? 3 : 6) : (names ? 46 : 12);
    var total = 0; sg.forEach(function (s) { total += s.d; }); total = total || 1;
    var iw = w - L - R, p = flowPeak(sg);
    var y = function (lv) { return T + (h - T - B) * (5 - lv) / 2; };
    var x = function (t) { return L + iw * t / total; };
    var o = ['<svg class="flow-svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="' + fesc((opt.label || '감동 흐름') + (mini ? '' : ' · ' + sg.map(function (x) { return CARDS[x.k].n; }).filter(function (n, i, A) { return n !== A[i - 1]; }).join(', ')) + (p ? ' · 가장 벅찬 순간 ' + CARDS[p.k].n : '')) + '">'];   // [FLOW_ONE_IMG] 순서는 이름표로
    if (!sg.length) { o.push('</svg>'); return o.join(''); }
    /* ★바닥 가로선(축) 금지 — 2026-10-08 사용자 지시로 삭제 [FLOW_MOOD] «너무 수학적 그래프 말고» */
    var env = flowEnv(sg, total), stp = Math.max(1, Math.round(total / iw * 3)), pts = [];
    for (var tt = 0; tt < env.length; tt += stp) pts.push([x(tt), y(env[tt])]);
    if ((env.length - 1) % stp) pts.push([x(env.length - 1), y(env[env.length - 1])]);
    var af = null, eg = null, cg = null; sg.forEach(function (s) { if (s.after && !af) af = s; if (s.k === 'entry') eg = s; if (s.k === '_close') cg = s; });   // [TABLE_APART] 본식 뒤 첫 순간 · [FLOW_MOOD] 본식의 시작 · 끝
    var ink = '#7A5F37', sw = (tiny ? 1.5 : (mini ? 1.8 : 2.25));
    if (af) { var tb = af.st, p1 = pts.filter(function (q) { return q[0] <= x(tb) + 0.01; }), p2 = pts.filter(function (q) { return q[0] >= x(tb) - 0.01; }), tbi = Math.min(env.length - 1, Math.round(tb)), bq = [x(tb), y(env[tbi])];
      if (!p1.length || p1[p1.length - 1][0] < bq[0] - 0.01) p1.push(bq); if (!p2.length || p2[0][0] > bq[0] + 0.01) p2.unshift(bq);
      if (p1.length > 1) o.push('<path class="flow-line" d="' + flowCurve(p1) + '" fill="none" stroke="' + ink + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round"/>');
      if (p2.length > 1) o.push('<path class="flow-line flow-after-line" d="' + flowCurve(p2) + '" fill="none" stroke="' + AFTER_INK + '" stroke-width="' + (tiny ? 1.2 : (mini ? 1.4 : 1.7)) + '" stroke-linecap="round" stroke-dasharray="' + (mini ? '0.1 3.4' : '0.1 5.2') + '"/>');   // [FLOW_MOOD] 점선 여운
    } else o.push('<path class="flow-line" d="' + flowCurve(pts) + '" fill="none" stroke="' + ink + '" stroke-width="' + sw + '" stroke-linecap="round" stroke-linejoin="round"/>');
    var boxes = [], lab = [];
    var tw = function (t) { return t.replace(/[\s·]/g, '').length * 12.6 + (t.match(/[\s·]/g) || []).length * 4; };
    var free = function (x0, x1, yt, yb) { if (x0 < 1 || x1 > w - 1 || yt < 1) return false; for (var i = 0; i < pts.length; i++) { var q = pts[i]; if (q[0] >= x0 - 1 && q[0] <= x1 + 1 && q[1] >= yt - 2 && q[1] <= yb + 2) return false; }
      return boxes.every(function (b) { return x1 < b[0] - 6 || x0 > b[1] + 6 || yb < b[2] - 3 || yt > b[3] + 3; }); };
    var place = function (px, py, t, fill) { var W2 = tw(t), ys = [py - 11, py - 17, py + 20, py + 26], sh = [0, -0.35, 0.35, -0.6, 0.6];
      for (var a = 0; a < ys.length; a++) for (var b = 0; b < sh.length; b++) { var cx = Math.max(W2 / 2 + 2, Math.min(w - W2 / 2 - 2, px + sh[b] * W2)), x0 = cx - W2 / 2, x1 = cx + W2 / 2;
        if (free(x0, x1, ys[a] - 12, ys[a] + 2)) { boxes.push([x0, x1, ys[a] - 12, ys[a] + 2]); lab.push('<text class="flow-name" x="' + cx.toFixed(1) + '" y="' + ys[a].toFixed(1) + '" font-family="' + fesc(SERIF_SVG) + '" font-size="12.5" font-weight="600" text-anchor="middle" fill="' + fill + '">' + fesc(t) + '</text>'); return; } } };   // 자리가 없으면 점만
    if (!mini) [eg, cg].forEach(function (s) { if (!s) return; var t = Math.min(env.length - 1, Math.max(0, Math.round(s.st + s.d / 2))); s._mx = x(s.st + s.d / 2); s._my = y(env[t]);
      o.push('<circle class="flow-mark" cx="' + s._mx.toFixed(1) + '" cy="' + s._my.toFixed(1) + '" r="3.6" fill="#FAFAF8" stroke="#7A5F37" stroke-width="1.4"/>'); });   // [FLOW_MOOD] 본식의 시작 · 끝 = 빈 진주
    if (p) {
      var bt = Math.floor(p.st), hiT = Math.min(env.length - 1, Math.ceil(p.st + p.d + 15));
      for (var k2 = bt; k2 <= hiT; k2++) { if (env[k2] > env[bt]) bt = k2; }
      var cx = x(bt), cy = y(env[bt]);
      o.push('<circle class="flow-peak" data-t="' + bt + '" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (tiny ? 2.4 : (mini ? 3 : 5)) + '" fill="' + PEAK_INK + '" stroke="#fff" stroke-width="' + (mini ? 1.5 : 2) + '"/>');
      if (!mini) { var an = cx < 44 ? 'start' : (cx > w - 44 ? 'end' : 'middle'), pw0 = tw(p.n), px0 = an === 'start' ? cx : an === 'end' ? cx - pw0 : cx - pw0 / 2; boxes.push([px0, px0 + pw0, cy - 24, cy - 10]);
        lab.push('<text class="flow-name flow-peak-name" x="' + cx.toFixed(1) + '" y="' + (cy - 12).toFixed(1) + '" font-family="' + fesc(SERIF_SVG) + '" font-size="12.5" font-weight="600" text-anchor="' + an + '" fill="' + PEAK_INK + '">' + fesc(p.n) + '</text>'); }   // [FLOW_MOOD] 명조   /* [R7-08] 굵기 상한 600 */   /* ★[PEAK_COLOR 2026-10-07 사장님 «별은 유치 · 색으로만 · 고급스러운 무드»] 곡선 위 이름 앞 ★ 걷음 · 진사 글자만 */
    }
    if (!mini && !namesOn) { [cg, eg].forEach(function (s) { if (s) place(s._mx, s._my, s.k === 'entry' ? CARDS.entry.sn : CARDS._close.sn, '#7A5F37'); });
      if (af) { var at = Math.min(env.length - 1, Math.max(0, Math.round(af.st + af.d * 0.6))); place(x(af.st + af.d * 0.6), y(env[at]), af.n, '#7A5F37'); } }   // [FLOW_MOOD] 닫는 인사 · 입장 · 테이블 인사 순으로 자리를 잡는다 · [TABLE_APART] 테이블 인사 이름은 여운 꼬리 위(큰 곡선만)
    o.push(lab.join(''));
    /* ★[FLOW_NAMES_ONE 2026-10-04 사장님 «왜 부모님 인사만 내려가 있어? 다른 곳들은 안 그래»] 이름표가 앞 이름(짧은 «선언»)에 닿으면 둘째 줄로 내렸다 —
       한 이름만 툭 떨어져 보였다. 이제 한 줄 안에서 먼저 옆으로 비켜 맞춘다(제 순간 가운데에서 이름 폭의 0.6 안쪽만) · 그래도 안 되면 종전 두 줄 */
    if (names) { var lay = function (G1, cw, lim) { var LB = sg.map(function (s) { var tw = s.n.replace(/[\s·]/g, '').length * cw + (s.n.match(/[\s·]/g) || []).length * cw * 0.32, c = x(s.st + s.d / 2); return { s: s, c: c, tw: tw, l: c - tw / 2 }; }), i1;
        for (i1 = 0; i1 < LB.length; i1++) LB[i1].l = Math.max(LB[i1].l, 2, i1 ? LB[i1 - 1].l + LB[i1 - 1].tw + G1 : 2);
        for (i1 = LB.length - 1; i1 >= 0; i1--) LB[i1].l = Math.min(LB[i1].l, (i1 < LB.length - 1 ? LB[i1 + 1].l - G1 : w - 2) - LB[i1].tw);
        return LB.every(function (b, i) { return b.l >= 1.5 && b.l + b.tw <= w - 1.5 && Math.abs(b.l + b.tw / 2 - b.c) <= Math.max(b.tw * lim, 24) && (!i || b.l >= LB[i - 1].l + LB[i - 1].tw + G1 - 0.5); }) ? LB : null; };
      var nm = function (b, cx, row, fs) { return '<text x="' + cx.toFixed(1) + '" y="' + (h - B + 26 + row * 14) + '" font-size="' + fs + '" text-anchor="middle" fill="' + (b.s === p ? '#3A2D22' : '#5A554C') + '"' + (b.s === p ? ' font-weight="600"' : '') + '>' + fesc(b.s.n) + '</text>'; };
      var LB1 = lay(8, 11, 1), fs1 = 11; if (!LB1) { LB1 = lay(5, 10, 1.2); fs1 = 10; }
      if (LB1) LB1.forEach(function (b) { o.push(nm(b, b.l + b.tw / 2, 0, fs1)); });   // 한 줄
      else sg.forEach(function (s, i) { var tw = s.n.length * 10, c = Math.max(2 + tw / 2, Math.min(w - 2 - tw / 2, x(s.st + s.d / 2))); o.push(nm({ s: s }, c, i % 2, 10.5)); });   // 그래도 좁으면 번갈아 두 줄(한 이름만 떨어지지 않게 · 이름을 빼지 않는다)
      names = false; }
    /* ★[FLOW_NAMES_ONE] 옛 «앞 이름에 닿으면 둘째 줄로» 길은 걷었다 — 한 이름만 떨어져 보였고, 두 줄이 다 차면 이름이 빠졌다 */
    /* 누르는 칸 — 순간 가운데에 폭 24 이상(짧은 순간은 12px 까지 좁아진다 · WCAG 2.5.8) · 그림 안으로 붙인다 · 이웃과 겹치면 뒤 칸이 위 */
    if (!mini) { sg.forEach(function (s, i) { var x0 = x(s.st), x1 = x(s.st + s.d), hw = Math.max(24, x1 - x0), rx = Math.max(0, Math.min(w - hw, (x0 + x1) / 2 - hw / 2));
      o.push('<rect class="flow-hit" data-i="' + i + '" x="' + rx.toFixed(1) + '" y="0" width="' + hw.toFixed(1) + '" height="' + h + '" fill="transparent"/>'); }); }   // ★[FLOW_ONE_IMG 코워크 추가 점검 · 접근성] 칸은 누르거나 올려 볼 때만 — 초점 칸 · 단추 역할은 뺐다(그림 하나 = role=img 하나 · 이름 순서는 그림 이름표가 말한다)
    o.push('</svg>'); return o.join('');
  }
  /* 읽어 주는 한 줄 [D3] — 58~85% 면 «예식 뒤쪽에서 가장 벅차오르고, 마지막까지 마음이 이어져요»(이름 없이 · [R1-34]) · 그 밖은 자리 말 없이 · 이에요/예요는 받침으로 */
  var NB = ' ';
  function josaOf(w, a, b) { var c = String(w).charCodeAt(String(w).length - 1); return (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28) ? a : b; }
  function peakLine(S) {
    var sg = flowSegs(S), p = flowPeak(sg); if (!p) return null;
    var total = 0; sg.forEach(function (s) { total += s.d; });
    var pct = Math.round((p.st + p.d / 2) / (total || 1) * 100), nm = CARDS[p.k].n;
    return { k: p.k, n: nm, be: josaOf(nm, '이에요', '예요'), pct: pct, tail: (pct >= 58 && pct <= 85) ? '예식 뒤쪽에서 가장 벅차오르고, 마지막까지 마음이' + NB + '이어져요.' : '' };   // [R1-34] 뒤쪽 정점이면 이름 없이 이 한 줄(곡선 «★ 이름»이 이미 말한다)
  }
  var PEAK_NONE = '가장 벅찬 순간이 될 것을 하나 담아 보세요 · 성혼 선언이나 편지';
  /* 순서 한 줄 [F1] — «식전 영상 →» 다음에 본식을 › 로 · 가장 벅찬 순간 뒤에 ★ */
  function orderParts(S) { var p = peakOf(S); return bodySeq(S).map(function (k) { return { k: k, n: CARDS[k].sn, peak: k === p }; }); }
  /* 준비 한 줄 [D5] — 0가지인 쪽은 뺀다 · «것 N가지»는 붙는 공백으로 */
  /* [R4-06] 선택 항목(부모님께 드릴 말 · «비워 두셔도 돼요» NOTE_TRIB)은 셈에서 뺀다 — ① · ④ 는 «두 분 8가지»인데 한눈에 보기 목록 · 미완료에는 7개였다.
     셈을 내는 곳(① prepLine · ④ · 마이페이지 «준비할 것 N가지»)이 모두 이 판정을 쓴다 */
  function prepOpt(q) { return !!q && (q.note === NOTE_TRIB || q.note === NOTE_TOAST); }   // [TOAST_SAY] 축배 한마디도 선택
  function prepCount(S) { var c = 0, pp = 0; prepList(S).forEach(function (q) { if (prepOpt(q)) return; if (q.who === 'parents') pp++; else c++; }); return { couple: c, parents: pp }; }
  /* ★★[VOICE_KIND 2026-09-27 코워크 지시 2장 · 사장님 «미리 녹음하거나 AI로 하는 부분과 직접 육성으로 얘기해야 하는 부분을 고객 입장에서 직관적으로 구분»]
     줄마다 누가 어떻게 소리 내는지 — 한 곳(여기)에서 정하고 ② · ③ · 콘솔이 같은 값을 읽는다.
       narr = 나레이션(스튜디오 나레이터) · prep = 두 분 목소리 · 미리 준비(두 분이 식장에 없을 때 · 하객 맞이 · 입장 인사 «두 분 목소리»를 골랐을 때만)
       live = 당일 직접(식장에서 사람 목소리 · 여기 글은 연습용). 말하는 사람이 가족이면 «당일 직접 · 가족» · 축사면 «당일 직접 · 축사하시는 분» */
  var VOICE_KIND = {
    narr: { lab: '나레이션', one: '스튜디오 나레이터가 읽어요' },
    prep: { lab: '두 분 목소리 · 미리 준비', one: '입장 전처럼 두 분이 아직 식장에 안 계실 때, 미리 만든 두 분 목소리가 흘러요' },   // ★[VOICE_KIND_0928] 코워크 0928 4-1 · [R1-19] «나와요» 겹침 · «식장에 없을 때» 흐림 → 언제인지 예를 들어
    live: { lab: '당일 직접', one: '식장에서 마이크로 직접 말해요. 여기 적는 글은 연습과 대본에 써요' }
  };
  /* ★[VOICE_CLONE 2026-09-27 코워크 5-1 · 5-6 · 사장님 «3단계는 스위치를 꺼 둔 채»] 기능 스위치 — 꺼져 있으면 화면에 아무것도 안 보인다.
     켜는 것은 사장님 결정(타입캐스트 확인 · 법무 · 7장) 뒤 · 서버도 따로 잠겨 있다(VOICE_CLONE_ENABLED · PRACTICE_TTS_ENABLED).
     ★[AI_NOTICE_0928 9-1] 0927 의 알림 방식 스위치(AI_NOTICE)는 없앴다 — 식순지 뒷면 한 줄 틀(자리 · 누구 · «가운데 일부는»)이 대신한다 */
  var FEATURE = { voiceClone: false, practiceTts: false, upLive: false };   // ★[VOICE_UP_FROM 2026-09-28] upLive = 두 분 목소리 날짜 문(서버가 정한다 · 마이페이지 · 빌더가 넣는다) · 닫혀 있으면 종전 글
  /* ★[GUEST_READER 2026-09-28 코워크 0928 6-1] 하객 맞이 네 줄의 읽는 사람 — 기본 번갈아(1 · 3 신랑 · 2 · 4 신부) · S.guestOne='g'|'b' 면 한 분이 모두 읽기.
     원천 데이터(ritual-data GUEST = [때, 나레이션 글, 두 분 글])에는 읽는 사람이 없어 여기 한 곳에 둔다. 입장 인사는 [ENTRY_ALT] 그대로(한 분이 모두 읽기 없음) */
  /* ★[PREP_VOICE_0928 코워크 0928 6-7] 준비 목록 상태 — «녹음 2 · AI 1 · 빈 줄 1» · 입장 인사는 한 줄이라 «AI 목소리» 처럼 갈래 이름 · 빈 줄은 나레이션으로 나온다 */
  function voiceState(S, ks) { var up = (S && S.up) || {}, c = { rec: 0, file: 0, ai: 0, none: 0 };
    ks.forEach(function (k) { var v = up[k]; if (v && typeof v === 'object') c[v.src === 'ai' ? 'ai' : v.src === 'rec' ? 'rec' : 'file']++; else c.none++; });
    if (ks.length === 1) return c.ai ? '«AI 목소리»' : (c.rec ? '«두 분 녹음»' : c.file ? '«올린 파일»' : '«비어 있음 · 나레이션으로 나와요»');
    var o = []; if (c.rec) o.push('녹음 ' + c.rec); if (c.file) o.push('올린 파일 ' + c.file); if (c.ai) o.push('AI ' + c.ai); if (c.none) o.push('빈 줄 ' + c.none);
    return '«' + o.join(' · ') + '»' + (c.none ? ' · 빈 줄은 나레이션으로 나와요' : ''); }
  /* ★[GUEST_WHO 2026-10-02 사장님 «번갈아 · 신랑이 모두 · 신부가 모두 고르는 선택창 삭제 → 신랑신부가 직접 선택 · 이 파트는 내가 저 파트는 너가»]
     줄마다 S.guestWho[i] = 'g' | 'b' — 고른 줄은 그대로 · 안 고른 줄은 옛 S.guestOne(있으면) → 번갈아(1 · 3 신랑 · 2 · 4 신부) */
  function guestReader(S, i) { var w = S && S.guestWho && S.guestWho[i]; if (w === 'g' || w === 'b') return w; var one = S && S.guestOne; if (one === 'g' || one === 'b') return one; return i % 2 === 0 ? 'g' : 'b'; }
  function voiceKind(k, S, o) { o = o || {}; if (o.talk) return 'live'; if (o.own) return 'prep'; return 'narr'; }
  function voiceLab(k, S, o) { var v = voiceKind(k, S, o); if (v !== 'live') return VOICE_KIND[v].lab;
    if (k === 'bless') return '당일 직접 · 부모님';   // [R1-36] 덕담은 부모님이 말한다 · «가족»은 범례에 없는 말
    if (k === 'declare') return '당일 직접 · ' + (declBy(S) || '선언하실 분');   // [DECLARE_ANYONE] 두 분이 적은 분 · 안 적었으면 «선언하실 분»
    if (k === 'free') return '당일 직접 · 축사하시는 분';
    if (k === 'song') return '당일 직접 · 노래해 주실 분';   // [SONG_BACK_1011]
    return '당일 직접'; }
  function prepLine(S) { var n = prepCount(S), a = [];
    if (n.couple) a.push('두 분이 준비할' + NB + '것' + NB + n.couple + '가지'); if (n.parents) a.push('부모님께' + NB + '부탁드릴' + NB + '것' + NB + n.parents + '가지');   /* [R3-11] «부모님께 / 부탁드릴 것»으로 갈렸다 */   // 3-9 «준비할 것 N가지» · «부탁드릴 것 N가지»는 한 덩어리
    return a.join(' · '); }   /* [R4-07] 개수만 돌려준다 — 안내(PREP_WHERE)까지 한 줄로 붙이면 _ndd 가 « · » 양옆을 묶어 끊을 곳 없는 덩어리가 되고 390 에서 «두 분이»만 앞줄에 남았다. 안내는 부르는 쪽이 줄을 바꿔 붙인다 */
  var PREP_WHERE = '하나씩 만들기 마지막 «한눈에' + NB + '보기»에서 모아 봐요';   /* [STEP_NONUM_OP 2026-10-03 사장님] 걸음 번호(②)를 뺐다 */   /* [R3-11] 화면 이름이 «한눈에 / 보기»로 쪼개지지 않게 · [R4-07] prepLine 과 따로 */   // [R1-33] ② 이름은 «하나씩 만들기»   // [MOMENTS_ONE] 모아 보기는 ② 마지막 «한눈에 보기»로 옮겼다(옛 ③ 준비하기 폐지) — «③에서»는 틀린 길이었다

  /* ══ [TILE_PICK 2026-09-26 코워크 회신 6 3-5] 칸 글 — «무엇인지»만(두 줄 안) · CARDS.one 은 미리 보기 창에서 쓴다 ══ */
  var TILE = {
    prevideo: '예식이 시작되면 처음 흐르는 두 분의 영상', candle: '양가 어머님이 초에 불을 밝혀요' /* [OPEN_WORDS_1013] */, entry: '두 분이 함께 걸어 들어와 나란히 서요' /* [R2-41] ② 설명(«나란히 서는 첫 장면»)과 같은 모습 */, matjeol: '서로 마주 보고 맞절해요' /* [MATJEOL_SPLIT_1013] */,
    welcome: '두 분이 하객께 짧게 감사\u00a0인사를 드려요' /* [THANKS_GREET_1013] 이름이 두 줄에 갈리지 않게(390 실렌더 «감사 / 인사를») */, bless: '부모님이 두 분께 덕담을 들려주세요', vow: '서로에게 하는 약속을 소리 내어 읽어요',
    ring: '서로의 손에 반지를 끼워 줘요', declare: '선언문을 읽는 순간, 두 분이 부부가 돼요' /* [STAGE_LINES] */, song: '가족 · 친구가 두 분께 노래를 불러요' /* [SONG_BACK_1011] */, tribute: '부부가 되어 처음 부모님께 드리는 인사',
    // [TILE_FREE_COMMA 코워크 회신7] 360 에서 «· 축사…»가 줄 머리로 — 칸 글만 쉼표
    // ★[TILE_SWALLOW 2026-09-26 코워크 회신8] 이 주석이 한때 free 줄 뒤에 붙어 letter · toast 두 항목을 삼켰다(칸 글이 빈 채 #872~#875) — 주석은 항목 줄 뒤에 붙이지 말 것
    free: '친구 · 형제자매가 축하의 말을 전해요' /* [SPEECH_TILE_1012] · [TERM_BY_SPEAKER_1013] · [TILE_FIT_1013] 360 폭에서 두 줄을 넘어 잘렸다(«두 분께»는 칸 이름이 말한다) */, letter: '부모님이나 서로에게 쓴 편지를 읽어요', cake: '두 분이 함께 케이크를 잘라요', toast: '다 함께 잔을 들어 «위하여»',
    _close: '두 분이 인사하고 본식을 마쳐요',
    table: '두 분이 테이블을 돌며 하객께 인사해요'   // [TABLE_GREET_1008]
  };
  var TILE_CANDLE = { parents: '양가 부모님이 초에 불을 밝혀요', fathers: '양가 아버님이 초에 불을 밝혀요', others: '두 분이 부탁한 분들이 촛불을 밝혀요' };
  for (var _tk in TILE) if (CARDS[_tk]) CARDS[_tk].tile = TILE[_tk];
  function tileOf(k, S) { if (k === 'candle') { var w = (S && S.candleWho) || DEF.candleWho; if (TILE_CANDLE[w]) return TILE_CANDLE[w]; } return TILE[k] || ''; }

  /* ══ [SAMPLE_CUT 2026-09-26 코워크 최종판 4장] 대표 한 줄 — 칸 · 미리 보기 창에서 순간마다 고정(판 칩과 상관없이 · 화촉만 서는 분을 따라)
     짧은 여는 말(10초 안)은 클립을 통째로 · 긴 다섯은 **같은 부모 클립**을 처음부터 틀다 둘째 문장 끝에서 멈춘다(새 녹음 0).
     멈출 자리는 녹음이 들어올 때 assemble 이 무음을 찾아 _recorded.json 에 적는다(cut2 · 자동생성) — 검사에 걸리면 글로.
     화면 글은 부모 클립 글의 앞 두 문장을 원천에서 센다(손으로 옮겨 적지 않는다).
     ★회신 6 의 새 녹음 다섯(sample-entry · sample-vow · sample-ring · sample-declare · sample-tribute)은 거뒀다 — 되살리지 말 것.
     slug: 소리 파일 · cut: 앞 몇 문장(0 이면 통째) · screen: 화면 글(소리는 쉼표 · 화면은 따옴표). ══ */
  var SAMPLE = {
    prevideo: { slug: 'narr-prevideo-in' }, candle: { slug: 'narr-candle-in-', who: 1 },
    entry: { slug: 'entry-A', cut: 2 }, matjeol: { slug: 'narr-entry-bow' } /* [MATJEOL_SPLIT_1013] 132 통째(14음절) · 녹음 전엔 글로 */, welcome: { slug: 'narr-welcome-in' }, bless: { slug: 'narr-bless-mid' } /* [BLESS_AFTER_DECLARE 10/12] 새 코스의 덕담 여는 말은 늘 가운데 문안(23) — «서약의 문을 여는»(22)은 옛 가족 코스만 */,
    vow: { slug: 'narr-vow-in', cut: 2 }, ring: { slug: 'narr-ring-in', cut: 2 },
    declare: { slug: 'narr-declare-in-friend' } /* [DECLARE_BY_PERSON] 옛 30 나레이션 선언 걷음 · 여는 말(녹음 전 · 글로 먼저) */, song: { slug: 'narr-song' } /* [SONG_BACK_1011] 여는 말 통째(10초 안) */, tribute: { slug: 'tribute-in', cut: 2 },
    free: { slug: 'narr-free-in-speech' } /* [SPEECH_TILE_1012] 103 축사 여는 말 */, letter: { slug: 'letter-each' },
    /* ★[SAMPLE_CAKE 2026-10-07 사장님 «부분만 선택할 때 이것만 음성이 없었어»] 케이크 커팅 대표 줄 = 42 toast-both(«케이크가 준비되어 있습니다…» · 이미 녹음 · 새 녹음 0).
       [CAKE_TOAST_SPLIT](09-27)로 케이크가 따로 순간이 될 때 이 표에 줄을 안 걸어, ① 창이 «처음부터»만 띄우고 소리가 없었다. slug 이름이 toast 인 것은 옛 «케이크와 축배» 시절 이름 그대로라서다(엔진 줄은 k=cake) */
    cake: { slug: 'toast-both' },
    /* ★[SAMPLE_TOAST_LIVE 2026-10-03] 축배 대표 줄 = 지금 예식에서 나는 76 toast-both-b(글자 그대로 · 화면은 따옴표).
       종전 107 toast-both-pour-b 는 [WINE_POUR_OFF](09-27)가 sampleS 를 «붓지 않음»으로 바꾼 뒤 미리 보기 엔진에 없는 줄이 되어
       ① 창 축배가 글 · 소리 · 영상 셋 다 비어 있었다(되살리지 말 것). */
    /* ★[TOAST_40_OPEN_1013] 새 코스 축배는 늘 40 — 대표 줄도 40(글자 그대로 · 화면은 따옴표). 76(케이크 판 글)으로 되돌리지 말 것 */
    toast: { slug: 'toast-toast', screen: '신랑 신부 앞날에 영원한 사랑과 행복을 위하여 다 같이 축배를 드는 시간입니다. 신랑 신부가 선창하면 «위하여»라고 해 주세요.' },   // [NAR_ENGINE_1014] 원고 3판(닫는 인사 «마지막 박수» 뒤라 «마지막으로»를 뺐다) · 둘째 문장은 10/3 녹음 꼴(라운드 1)
    _close: { slug: 'narr-close-bow' },
    table: { slug: 'narr-table-in' }   // [TABLE_GREET_1008] 131 · 녹음 전엔 글로
  };
  function sampleOf(k, S) { var sm = SAMPLE[k]; if (!sm) return null; var o = { slug: sm.slug, cut: sm.cut || 0, screen: sm.screen || '' };
    if (sm.who) o.slug = 'narr-candle-in-' + ((S && S.candleWho) || DEF.candleWho); return o; }
  function firstSentences(t, n) { var parts = String(t || '').match(/[^.?!]+[.?!]+/g) || [String(t || '')]; return parts.slice(0, n).join(' ').replace(/\s+/g, ' ').trim(); }
  /* 대표 한 줄을 들을 때 엔진을 부를 S — 모든 순간을 담고 판은 표의 판(입장 A · 엄숙 · 서로에게 · 케이크와 축배 · 와인 두 병 · 영상) */
  function sampleS(S) { var on = {}; PICKABLE.forEach(function (k) { on[k] = 1; }); return { course: 'open', on: on, entry: 'A', entryVoice: 'nar', declare: '1', declareWho: '', tributeSay: 'long', letter: 'each', toast: 'both', wine: 'none', freeWhat: 'speech', freeLen: '3', candleWho: (S && S.candleWho) || DEF.candleWho }; }   // [SPEECH_TILE_1012]

  /* ══ [PREVIEW_SHEET 2026-09-26 코워크 추가 전달 3 F2] 미리 보기 창 «② 하나씩 만들기에서 고를 것» — ② 묶음 이름(G3 로 고친 이름)과 같은 말 ══ */
  var CHOOSE_AT_LISTEN = { candle: '서는 분', entry: '입장 멘트 · 입장 목소리', declare: '읽어 주실 분', tribute: '인사 말'   /* [TRIB_ONE_SAY · GROOM_BOW_TIP] 인사 방식 칩 걷음 · [GOODS_STUDIO] 케이크 · 꽃은 저희가(고를 것 없음 · cake 키 걷음) */, letter: '받는 분', free: '길이' };   // ★[SPEECH_TILE_1012] 축사 칸 ② 는 길이 하나(무엇을 줄은 옛 초안에만)
  /* ★[REC_DLG 2026-09-28] 목소리 문이 열린 판(FEATURE.upLive)의 ② 입장 묶음 이름은 «어떻게 준비할까요»(VP_CHOICE) — 창도 같은 말을 쓴다(pick-v2 F2 · G3 가 잡았다) */
  /* ★[VP_NO_DIRECT 2026-09-28] 직접 녹음을 뺀 뒤 «어떻게 준비할까요»는 AI 가 켜진 예식에만 보인다(AI · 나레이션) — 꺼진 예식은 고를 것이 나레이션 하나라 칸이 없다 */
  Object.defineProperty(CHOOSE_AT_LISTEN, 'entry', { enumerable: true, get: function () { return '입장 멘트' + (FEATURE.upLive && FEATURE.voiceClone ? ' · 어떻게 준비할까요' : ''); } });   // [ENTRY_OUT_OFF] 첫 모습 없음

  /* ── 준비할 것 · [누구, 무엇, 갈래] ──
     누구: couple = «두 분이 준비할 것» · parents = «부모님께 부탁드릴 것» (이 이름 한 쌍을 ① 상자 · ② 칸 · ③ · 마이페이지에 똑같이)
     ★[DETAIL_0925 B2] 갈래: write 쓸 글 · send 보낼 것 · bring 챙길 것 · ask 부탁드릴 것 — 모두 ③ 준비하기 한 곳에 모인다.
     ★마감은 글에 «예식 3일 전까지»가 들어 있으면 3일 · 없으면 7일(prepList).
     ★케이크 · 부모님께 드릴 꽃 · 부케는 저희가 준비한다(GOODS_STUDIO 2026-10-06) — «챙길 것»에 넣지 않고 «저희가 준비해요»에 · 케이크 · 꽃 · 생화 부케는 별도 비용. */
  var CANDLE_ASK = { mothers: '양가 어머님께서', parents: '양가 어머님과 아버님께서', fathers: '양가 아버님께서' };   // [PARENTS_ENTRY_OFF 2026-10-12] 네 분이 함께 불을 밝힌다(따로 걷는 입장 없음 · 불을 밝힌 뒤 하객께 인사는 화촉의 한 동작 [CANDLE_BOW_1012])
  /* ★★[PREP_DUE 2026-09-25 코워크 회신3 3-4(a)] 마감은 글에서 읽지 않고 항목 데이터로 둔다.
     항목 = [누가, 무엇(마감 말 없이), 갈래, 마감, 마감 없을 때 한 줄]
       마감 3 = 예식 3일 전까지 · 7 = 예식 7일 전까지 · 0 = 당일 가져오기 · null = 마감 없음(한 줄로 말한다)
     ★종전엔 글에 «3일 전»이 있으면 3, 없으면 7 이었다 — 반지 · 와인까지 «예식 7일 전까지»가 붙었다.
     ★고객 화면의 마감 말은 «예식 7일 전» · «예식 3일 전» · «당일» 셋뿐이다([P12] · dueWord 한 곳에서 만든다). */
  var NOTE_READ = '당일 직접 읽어요 · 보내지 않아도 돼요', NOTE_ASK = '미리 말씀드려 두세요';
  var NOTE_TRIB = '적어 주시면 큰 글씨 카드로 드려요 · 비워 두셔도 돼요';   // ★[TRIB_CARD_SAME_1015 라운드 4] 직접 쓰는 글의 카드 말은 하나 — 감사 인사 · 서약문 · 감사문(«적어 주시면 큰 글씨 카드로 드려요»)과 같은 말(BOSS_WAY 5)
  /* ★[TOAST_SAY 2026-10-07 사장님 «다른 곳들과 다르게 텍스트박스가 아닌데 · 하나하나 확인해서 개선»] 축배도 첫인사처럼 «두 분이 할 말» 글칸 —
     참고 예시를 누르면 신랑 · 신부 칸에 들어간다. 선택 칸이다(부모님께 인사 NOTE_TRIB 와 같은 꼴) — 비워 두면 종전대로 두 분이 «위하여»만 외친다(엔진 cue2 · 나레이션이 하객 답을 청한다) */
  var NOTE_TOAST = '비워 두시면 당일 «위하여»만 외치셔도 돼요';   // ★[TRIB_CARD_OPT 2026-09-25 사장님 «칸은 두되 선택»] ③ 에 선택 칸이 생겼다
  function prepOf(k, S) {
    switch (k) {
      /* [REC_UPLOAD 2026-09-27 코워크 3-8] 준비 목록 이름 «두 분 목소리 준비» · 마감 D-7 · 스튜디오 나레이션을 고르면 빠진다(아래 조건 그대로) */
      case 'guest': return S && S.guestVoice === 'couple' ? [['couple', FEATURE.upLive ? '두 분 목소리 준비 · 하객 맞이 안내 ' + voiceState(S, ['g0', 'g1', 'g2', 'g3']) : '하객 맞이 안내 녹음 · 대본을 드려요(휴대폰 음성 메모로 충분해요)', 'send', 7]] : [];   // [VOICE_UP_FROM] 문이 닫혀 있으면 종전 글
      case 'prevideo': return [['couple', '식전 영상 링크', 'send', 3]];   /* ★[PV_LINK_ONE 2026-10-04 사장님 «(영상이나 사진) 삭제 · 무조건 영상 · 날짜는 오른쪽 한 줄»] */   // ★[PREVIDEO_FREE 2026-10-02 사장님] 길이 · 장수 규정 없음 · 링크 하나   // [PREVIDEO_NAME 4-c] ③ 도 이 글을 쓴다   // [PREVIDEO_ALWAYS]
      case 'candle': { var cw = (S && S.candleWho) || DEF.candleWho;
        return cw === 'others' ? [['couple', '화촉을 밝혀 주실 두 분께 부탁드리기', 'ask', null, NOTE_ASK]] : [['parents', '화촉 · ' + (CANDLE_ASK[cw] || CANDLE_ASK.mothers) + ' 불을 밝히고 ' + (cw === 'parents' ? '' : '서로 한 번, ') + '하객께' + (cw === 'parents' ? '' : ' 한 번') + ' 인사해 주세요', 'ask', null, NOTE_ASK]]   /* [LINE_R1_1014] 두 분이면 «서로 한 번, 하객께 한 번»(CANDLE_BOW_1012) */   /* [OPEN_WORDS_1013] 부탁받는 분이 «인사까지»를 미리 안다(CANDLE_BOW_1012) */; }
      case 'entry': return S && S.entryVoice === 'couple' ? [['couple', FEATURE.upLive ? '두 분 목소리 준비 · 입장 인사 ' + voiceState(S, ['entry']) : '입장 인사 녹음 · 대본을 드려요(휴대폰 음성 메모로 충분해요)', 'send', 7]] : [];   // [LISTEN_PAGE] 말투 · 첫 모습은 ② 에서 고른다
      case 'welcome': return [['couple', '감사 인사 한두 문장 · 적어 주시면 큰 글씨 카드로 드려요', 'write', 7]];   // ★[WELCOME_CARD_1014 라운드 3] 이야기 안심(«미리 적어 주신 인사말 카드를 저희가 바로 건네 드려요») · 콘솔 사다리가 약속한 카드를 준비 줄도 말한다 — 서약문 줄과 같은 말(VOW_CARD_PRINT_1014 · 실제로 인쇄)
      case 'bless': return [['parents', '덕담 원고 · 한 분 300자 안팎(1분쯤) · 받으면 큰 글씨 카드로 돌려드려요', 'ask', 7, '덕담에 넣을 이야기 하나를 골라 건네 드리면 쓰기 쉬워요']];   // ★[BLESS_STORY_NOTE_1014 원고 9장 ③ · 자료 X 1 «재료 모으기»]   // [R1-20] 400자는 약 80초라 «1분쯤»과 안 맞았다 · 끊긴 괄호 말을 끝맺음
      case 'vow': return [['couple', (S && S.vowKind === 'thanks' ? '감사문' : '서약문') + ' · 한 분 300자쯤(모두 600자쯤) · 적어 주시면 큰 글씨 카드로 드려요', 'write', 7]];   // ★[VOW_CARD_PRINT_1014 2026-10-14 사장님 «추천대로»] 실제로 인쇄한다 — 안심 «배우자분께 건네»는 종이가 있어야 된다   // [WC_LIMIT 2-5] ③ 칸과 같은 숫자 · [THANKS_IN_VOW] 감사문이면 이름만 바뀐다
      case 'ring': return [['couple', '반지 두 개 · 평소 끼던 반지여도 괜찮아요', 'bring', 0]];
      case 'declare': { var dp = declBy(S);   // [DECLARE_BY_PERSON] 늘 사람이 읽는다 · [DECLARE_ANYONE] 적은 분께 부탁 · 안 적었으면 «정하기»가 할 일로 남는다(예시는 칸에만)
        return dp ? [['couple', '성혼 선언문 낭독 · ' + dp + '께 부탁드리기', 'ask', null, NOTE_ASK]] : [['couple', '성혼 선언문 읽어 주실 분 정하기', 'ask', null, NOTE_ASK]]; }
      /* [SONG_BACK_1011] 부르실 분께 부탁 · 반주(MR)는 두 분이 사흘 전까지 보낸다(준비한 순서 영상과 같은 마감) */
      case 'song': return [['couple', '축가 부르실 분 정하기', 'ask', null, NOTE_ASK],   /* [SONG_ANYONE_WORDS_1013] «불러 주실 분께 부탁드리기»는 두 분이 직접 부르는 날 틀린 말 */ ['couple', '축가 반주(MR) 파일 · 곡 이름과 함께 · 3분 안팎 한 곡', 'send', 3]];   // ★[SONG_3MIN 2026-10-12] 자료 B «하이라이트만 3분 안쪽» · C 3:00 · L 3분 · 시간 표 210초(TIME.song)
      case 'tribute': { var t = chipOf('tribute', S), tr = t === 'none' ? [] : [['couple', crossTribute(S) ? '서로의 부모님께 드릴 말 · 한마디부터 1분쯤까지' : '부모님께 드릴 말 · 한마디부터 1분쯤까지'   /* [TRIB_ONE_SAY] */, 'write', null, NOTE_TRIB]];
        return tr.concat(goodsPrep('tribute', S)); }
      case 'free': {   // [FREE_WHAT] 무엇을 · 길이가 곧장 반영된다
        var fk = FREE_KIND[chipOf('free', S)], n = chipOf('freeLen', S);
        if (fk === 'video') return [['couple', '준비한 순서 영상(휴대폰으로 가로로 찍은 영상 · ' + n + '분 안)', 'send', 3]];   // [SEND_WORDS 2-8] 이름 없이 붙던 «영상 파일»
        if (fk === 'etc') return [['couple', '준비한 순서 알려 주기 · ' + (String(S.freeEtc || '').trim() || '무엇을 할지') + ' · ' + n + '분 · 필요한 것(음악 · 마이크 · 화면)', 'send', 7]];   // [FREE_ETC]
        if (fk === 'speech') return [['couple', '축사 원고 · 1분에 300자쯤 · 받으면 큰 글씨 카드로 돌려드려요 · 전 연인 · 술자리 이야기는 빼 주세요'   /* [LINE_R1_1014] «부탁드리기»로 열면 사흘 전 마감이 «사흘 전에 부탁해도 된다»로 읽힌다 · 덕담 줄과 같은 꼴 */   /* [SPEECH_WORDS_1013] «분당» → «1분에» · 다른 순간과 같은 «큰 글씨 카드» */, 'ask', 3]];
        return [['couple', '무엇을 누가 건넬지 알려 주기(저희가 자리를 맞춰요)', 'send', 7]];
      }
      case 'letter': return [['couple', chipOf('letter', S) === 'each' ? '서로에게 편지 · 한 분 400자쯤' : '부모님께 편지 · 한 분 400자쯤', 'write', null, NOTE_READ]];
      case 'cake': return goodsPrep('cake', S);   // [CAKE_TOAST_SPLIT] 케이크 준비만
      case 'toast': {
        var w = chipOf('toast', S), out = [];   // [WINE_POUR_OFF] 와인은 저희가 준비 · 붓는 연출 없음
        if (w !== 'cake') out.push(['couple', '자리마다 축배 음료 알려 주기 · 마이페이지 «좌석' + NB + '·' + NB + '음료»에서', 'send', 7]);   // [P10 코워크 회신3] «정하기» → «알려 주기»(같은 갈래 «건넬지 알려 주기»와 같은 꼴)
        if (w !== 'cake') out.push(['couple', '축배 한마디 · 한 분 한 문장쯤', 'write', null, NOTE_TOAST]);   // [TOAST_SAY] 글칸은 음료 줄 «뒤»에 — 음료 줄 번호(p:toast:0 · 두 분이 누른 «보냈어요»)가 그대로 남는다
        return out;   // [CAKE_TOAST_SPLIT] 케이크 준비는 케이크 순간으로
      }
    }
    return [];
  }
  /* [PREP_DUE · P12] 마감 말 한 곳 — 날짜를 알면 «9월 18일까지(예식 7일 전)» · 모르면 «예식 7일 전까지» ·
     당일 가져오기 · 마감 없음은 그 항목의 한 줄. 빌더 ③ · ④ · 마이페이지가 이 함수만 쓴다. */
  function dueWord(q, wed) {
    if (q.due == null) return q.note || '';
    if (q.due === 0) return '당일 가져오기';
    var m = String(wed || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '예식 ' + q.due + '일 전까지';
    var x = new Date(+m[1], +m[2] - 1, +m[3] - q.due); return (x.getMonth() + 1) + '월 ' + x.getDate() + '일까지(예식 ' + q.due + '일 전)';
  }
  /* ★[STUDIO_PREP 2026-09-25 사장님 결정 · 코워크 회신3 P11] 케이크 · 부모님께 드릴 꽃은 스튜디오가 준비한다.
     두 분 준비 목록에 넣지 않고 «저희가 준비해요» 한 줄로 말한다. ★계약서 ⑥ · 홈페이지 «Included»에는 아직 없다(문구는 사장님 결정). */
  /* ★[GOODS_CHOICE] 위 STUDIO_PREP(«둘 다 스튜디오 · 포함»)은 버렸다 — 사장님 9/25 밤 «케이크 꽃은 별도로 돈 받아야지 · 고르게 해».
     되살리지 말 것: «저희가 준비해요 · 케이크 · 부모님께 드릴 꽃»은 값에 든 것처럼 읽힌다.
     꽃은 인사 방식이 «꽃과 포옹»일 때만(신랑 큰절은 꽃이 없다) · 케이크는 «축배만»이 아닐 때만. */
  var GOODS = [
    { k: 'cake', key: 'cakeBy', what: '케이크', need: function () { return true; } }   // [CAKE_TOAST_SPLIT]
    /* ★[FLOWER_OFF_1013 2026-10-13 사장님 «부모님 인사에서 꽃 주는 건 빼자»] «부모님께 드릴 꽃»(tribute · flowerBy) 줄 금지 — 2026-10-13 사용자 지시로 삭제.
       부모님께 인사는 다가가 인사하고 안아 드리는 것까지(TRIB_ACT) · 저희가 꽃을 준비하지 않는다(계약서 v1.15 별도 비용 줄도 걷음 · CONTRACT_V115).
       키 flowerBy 는 옛 초안 호환으로만 남는다(chipOf · setChip) */
  ];
  /* ★★[FLOWER_OFF_1013] 새 코스의 부모님께 인사 «방식» 글은 여기 하나 — 엔진 값 S.tribute 는 옛 초안 호환 이름 «flower» 그대로(뜻은 인사와 포옹).
     옛 코스(ritual-data TRIBUTE.modes · 녹음된 옛 어조 문안)는 그대로다 — 옛 예식의 소리가 바뀌지 않게.
     ritual-cue(큐 이름 · 현장 지문) · 빌더(요약 · 연출 줄) · AI 상담이 이것을 읽는다. «꽃을 건네고» · «꽃 전달» 되살리지 말 것 */
  var TRIB_ACT = { d: '인사와 포옹', how: '부모님께 다가가 인사하고 안아 드려요',
    cue: '양가 부모님은 단상에서 가장 가까운 정면 열에 앉으신 채로 → 나레이션 흐르는 동안 → 두 분이 다가가 인사 · 포옹' };
  var GOODS_COST = '별도 비용이에요';   // [GOODS_STUDIO] 식순은 상담을 다 마친 뒤 짓는다 — «상담 때 안내» 금지(2026-10-06 사장님 «식순을 준비하는 단계는 이미 상담을 전부 진행한 후야»)
  var BOUQUET = ['기본 조화 부케', '생화를 원하시면 별도 비용이에요'];   // [GOODS_STUDIO] 부케는 순간에 매이지 않는다 · «저희가 준비해요»에 늘 한 줄
  var BOUQUET_LINE = BOUQUET[0] + '는 저희가 준비해요 · ' + BOUQUET[1];
  function goodsOf(S, only) {
    return GOODS.filter(function (g) { return (!only || g.k === only) && onOf(S, g.k) && g.need(S || {}); })
      .map(function (g) { return { k: g.k, key: g.key, what: g.what, by: chipOf(g.key, S) }; });
  }
  function goodsPrep() { return []; }   // [GOODS_STUDIO] 두 분이 챙길 케이크 · 꽃은 없다(늘 저희가 준비)
  function studioOf(k, S) { return goodsOf(S, k).filter(function (g) { return g.by === 'studio'; }).map(function (g) { return g.what; }); }
  var PREP_CAT = { write: '쓸 글', send: '보낼 것', bring: '챙길 것', ask: '부탁드릴 것' };

  /* ── 알림 셋(명세 3-6) — 한 번에 하나 · 하나라도 담은 뒤에만 · 위에서부터 먼저 걸리는 것 ──
     ★규칙은 여기 한 곳이다([THIN_WARN] 과 같은 원칙). 빌더도 엔진(meta.warn)도 이 함수를 부른다.
     ★옛 코스의 warnOf(마음 자리 · 선언 · 하객 맞이)는 새 코스에서 쓰지 않는다 — 빈 채로 열면 셋이 한꺼번에 뜬다. */
  /* ★[HEAVY_0925] 앉아 듣기 = 덕담 · 서약 · 부모님께 인사 · 편지 · 축사 판의 준비한 순서. 인사를 «말 없이»로 하면 앉아 듣는 순간이 아니다
       (알림 ① 뒤쪽 판이 바로 그걸 권한다 — 권한 대로 했는데 알림이 안 사라지면 거짓말이 된다). */
  var HEAVY = { bless: 1, vow: 1, tribute: 1, letter: 1 };
  function heavy(k, S) {
    if (k === 'free') return FREE_KIND[chipOf('free', S)] === 'speech';
    return !!HEAVY[k] && !(k === 'tribute' && chipOf('tribute', S) === 'none');
  }
  var NOTICE = {
    heavy: '앉아서 듣는 순간이 셋 이어져요. 반지나 선언을 담으면 사이가 풀려요. 반지는 끼고 오셔도 할 수 있어요.',   /* [DETAIL_0925 A2] «남겨 두면» → «담으면» */
    /* ★twice(«부모님께 드리는 말이 두 번 · 한마디씩으로») 금지 — 2026-10-06 사용자 지시로 «한마디씩» 판을 걷어 함께 삭제 [TRIB_ONE_SAY] */
    /* ★«끝이 조용한 편이에요 · 축배를 담으면» 알림(NOTICE.toast · 축배 담기 단추) 금지 — 2026-10-13 사용자 지시로 삭제 [TOAST_LAST_1013]
         축배는 닫는 인사 뒤의 고르는 순간이 됐고(예시는 «기록» 한 곳) · 닫는 인사가 9/26 부터 «인사!» 구호와 박수로 끝나 끝이 조용하지 않다(CLOSE_BOW) */
    /* [NOTICE_0925 코워크 4-7] 뒤쪽 사슬(인사 · 축사 · 편지) — 앞쪽(덕담 · 서약)은 위 heavy 그대로 · [BLESS_AFTER_DECLARE 10/12] 앞쪽은 이제 «서약 → 덕담» · 덕담으로 시작하면 뒤쪽 */
    heavyBack: '앉아서 듣는 순간이 셋 이어져요. 부모님께 인사를 «말 없이»로 하면 사이가 풀려요.',
    /* ★[HEART_ORDER_1012 2026-10-12] 덕담 → 축사 → 편지(인사 없음)는 반지 · 선언도 «말 없이»도 못 푼다 — 그 사이 빈 자리는 축가 하나 */
    heavyMid: '앉아서 듣는 순간이 셋 이어져요. 축가를 담으면 사이가 풀려요.',
    /* [NOTICE_0925 코워크 4-1] 알림 ④ — 맨 뒤 차례. N 은 내림(«약 N분»은 그보다 줄지 않는다는 뜻) */
    /* ★[RANGE_40 2026-09-26] 테이블 인사가 없어졌다([NO_TABLE_ROUND]) — 줄이는 차례는 자유 사진 → 숨 고르기 → 뒤에 고른 구도 */
    /* ★[TABLE_GREET_1008] 테이블 인사가 본식 끝(사진 앞)에 돌아왔다 — 본식 합에 들어 단체 사진이 그만큼 준다. 사장님 «그대로 두고 알림» — 이 알림 ④가 그 일을 한다 */
    short: function (n) { if (n <= 0) return '본식이 길어 단체 사진 시간이 모자라요. 순간을 하나 덜면 여유가 생겨요.';   /* [PHOTO_FLOOR0] «약 0분으로 줄어요» 대신 */
      return '천천히 진행되면 단체 사진이 약 ' + n + '분으로 줄어요. 전체 사진은 그대로 두고, 가족 구도는 앞쪽부터 담아요. 순간을 하나 덜면 여유가 생겨요.'; }
  };
  var SHORT_MIN = 16;   // [RANGE_40] 단체 사진이 이보다 짧아질 수 있으면(늦어진 날) 알림 ④ — 전체 사진 8 + 가족 구도 둘 6 + 두 분 숨 고르기 2
  /* ★[PHOTO_THANKS 2026-09-26] 감사 인사 1분은 이 문턱에 아직 안 넣었다 — 넣으면(17) 예시 «가족»(늦어진 날 16분)에 알림 ④가 새로 뜬다.
       고객 화면이 바뀌는 설계라 코워크 결정 대기(구현 보고 코드 제안). 엔진 · 마이페이지 구도 셈에는 1분이 들어가 있다. */
  /* ★[NOTICE_QUEUE 코워크 추가 점검 P2-1 2026-09-26] 걸리는 알림을 «차례대로 모두» 센다 — 앞의 것을 «괜찮아요»로 닫으면 다음 것이 뜬다.
     종전엔 첫 알림 하나만 돌려서, 앞의 것을 닫으면 뒤에 걸린 알림(④ 단체 사진 부족 포함)까지 함께 사라졌다.
     엔진(meta.warn)은 종전대로 맨 앞 하나만 본다(noticeOf). */
  function _heavyRun(S) {
    var run = [], best = [];
    bodySeq(S).forEach(function (k) { if (heavy(k, S)) { run.push(k); if (run.length > best.length) best = run.slice(); } else run = []; });
    return best;
  }
  function noticeList(S) {
    if (!picked(S).length) return [];
    var L = [], best = _heavyRun(S);
    /* ★[BLESS_AFTER_DECLARE 2026-10-12] 덕담이 성혼 선언 바로 뒤로 가서 앞쪽 사슬은 «서약으로 시작»(서약 → 덕담 · 반지 · 선언이 그 사이)뿐이다.
         덕담으로 시작하는 사슬(덕담 → 인사 → 축사 · 편지)은 뒤쪽 — 반지 · 선언은 덕담 앞이라 풀지 못하고 «인사를 말 없이»가 푼다 */
    /* [HEART_ORDER_1012] 인사가 마음의 순간 끝으로 가서 사슬에 인사가 있으면 그 사슬의 끝이 인사다 → «말 없이»가 푼다 · 인사가 없으면(덕담 → 축사 → 편지) 축가 자리 */
    if (best.length >= 3) L.push(best[0] === 'vow' ? NOTICE.heavy : best.indexOf('tribute') > -1 ? NOTICE.heavyBack : NOTICE.heavyMid);
    /* ★[TRIB_ONE_SAY 2026-10-06] «부모님께 드리는 말이 두 번» 알림 걷음 — 말로 인사 + 편지 «각자 부모님께»는 서로의 부모님께(crossTribute)라 겹치지 않는다 */
    /* [TOAST_LAST_1013] «끝이 조용한 편» 알림(QUIET_END_CLOSE)은 걷었다 — 위 NOTICE 주석 */
    var pa = span(S).pa;   // [DETAIL_0925 A2] 띠의 «단체 사진» 아래 값과 같은 반올림
    if (pa < SHORT_MIN) L.push(NOTICE.short(pa));
    return L;
  }
  function noticeOf(S) { return noticeList(S)[0] || ''; }
  /* ★[DETAIL_0925 A2] 알림 한 덩어리 — 글 · 풀어 주는 단추 · 닫기.
     key 는 «같은 상황»을 가린다(괜찮아요로 닫은 알림은 같은 상황에선 다시 안 뜬다 · 상황이 바뀌면 다시 뜬다).
     ④(사진 시간 부족)는 닫지 않는다. 단추 act = [키, 값] — 빌더가 그대로 적용한다(on:키 는 담기).
     ★[NOTE_ACT_MATCH 코워크 추가 점검 P2-5] 단추는 글과 «같은 판정»으로 고른다 — 앞쪽 사슬(덕담 · 서약으로 시작)은 «반지나 선언»,
       뒤쪽 사슬은 «인사를 «말 없이»로». 종전엔 글은 앞쪽인데 사슬에 인사가 있다고 «말 없이» 단추를 달아 글과 단추가 다른 말을 했다.
     shut(선택): 닫은 key 모음 — 닫힌 것은 건너뛰고 다음 알림을 준다(P2-1). */
  function _noticeOne(msg, S) {
    var n = { msg: msg, acts: [], close: true, key: '' };
    if (msg === NOTICE.heavy || msg === NOTICE.heavyBack || msg === NOTICE.heavyMid) {
      /* [HEART_ORDER_1012] 뒤쪽 사슬은 인사로 끝난다 — 이름 셋은 인사까지(앞 셋을 부르면 인사 없이 «인사를 말 없이로»를 말하게 된다) */
      var run = _heavyRun(S), ti = run.indexOf('tribute'), three = (msg === NOTICE.heavyBack && ti > 1) ? run.slice(ti - 2, ti + 1) : run.slice(0, 3);
      n.msg = three.map(function (k) { return CARDS[k].n; }).join(' → ') + ' · 말로 듣는 순서가 셋 이어져요. ' + (msg === NOTICE.heavyBack ? '부모님께 인사를 «말 없이»로 하면 사이가 풀려요.' : msg === NOTICE.heavyMid ? '축가를 담으면 사이가 풀려요.' : '반지나 선언을 담으면 사이가 풀려요. 반지는 끼고 오셔도 할 수 있어요.');
      if (msg === NOTICE.heavyBack) n.acts.push(['인사를 «말 없이»로', 'tribute', 'none']);
      else if (msg === NOTICE.heavyMid) n.acts.push(['축가 담기', 'on', 'song']);   // 축가를 담았으면 이 사슬은 생기지 않는다(축가가 축사와 편지 사이)
      else { if (!onOf(S, 'ring')) n.acts.push(['반지 교환 담기', 'on', 'ring']); if (!onOf(S, 'declare')) n.acts.push(['성혼 선언 담기', 'on', 'declare']); }
      n.key = 'heavy:' + three.join(',');
    } else { n.close = false; n.key = 'short'; }   // [TOAST_LAST_1013] 축배 알림 갈래는 걷었다
    return n;
  }
  function noticeFull(S, shut) {
    var L = noticeList(S);
    for (var i = 0; i < L.length; i++) { var n = _noticeOne(L[i], S); if (!shut || !shut[n.key] || !n.close) return n; }
    return null;
  }

  /* ── 자리 문구(명세 3-3) ── */
  function slotText(k, S) {
    if (k === 'prevideo') return '예식 시작 시각 · 맨 처음';   // [OPEN_WORDS_1013] 화촉을 담으면 «입장 바로 앞»이 아니다   // [CEREMONY_AT_VIDEO]   // [ONEMIN_FIRST 2026-10-05] 1분 전 공지 → 식전 영상 → 입장
    if (PRE[k]) return '하객이 앉는 동안 · 본식 앞';
    if (AFTER_CLOSE[k]) {   // [TABLE_GREET_1008] · [TOAST_LAST_1013] 닫는 인사 뒤 순간끼리도 앞뒤를 말한다(축배 → 테이블 인사)
      var ao = bodyOrder(), ai = ao.indexOf(k), ap = '_close', an = '';
      for (var y = ai - 1; y >= 0 && ao[y] !== '_close'; y--) if (onOf(S, ao[y])) { ap = ao[y]; break; }
      for (var z = ai + 1; z < ao.length; z++) if (onOf(S, ao[z])) { an = ao[z]; break; }
      return onOf(S, k) ? (bodySeq(S).indexOf(k) + 1) + '번째 · ' + CARDS[ap].n + ' 다음' : '담으면 ' + CARDS[ap].n + ' 다음, ' + (an ? CARDS[an].n : '단체 사진') + ' 앞에 들어가요';
    }
    var order = bodyOrder().filter(function (x) { return !AFTER_CLOSE[x]; });
    var i = order.indexOf(k), p = null, n = null, x;
    for (x = i - 1; x >= 0; x--) if (onOf(S, order[x])) { p = order[x]; break; }
    for (x = i + 1; x < order.length; x++) if (onOf(S, order[x]) || order[x] === '_close') { n = order[x]; break; }
    if (onOf(S, k) || k === '_close') { var seq = bodySeq(S); return (seq.indexOf(k) + 1) + '번째 · ' + (p ? CARDS[p].n + ' 다음' : '맨 처음'); }
    if (p && n) return '담으면 ' + CARDS[p].n + ' 다음, ' + CARDS[n].n + ' 앞에 들어가요';
    if (n) return '담으면 맨 처음, ' + CARDS[n].n + ' 앞에 들어가요';
    return p ? '담으면 ' + CARDS[p].n + ' 다음에 들어가요' : '';
  }

  /* ── 시작점 줄(명세 3-4) — 예시에서 시작했으면 무엇이 달라졌나 ── */
  function originOf(S) {
    if (!picked(S).length) return '아직 담은 순간이 없어요. 입장 · 맞절 · 닫는 인사는 늘 있어요.';   // [MATJEOL_SPLIT_1013]   // [WHY_NEIGHBOR 2-7] [PREVIDEO_PICK] 식전 영상은 이제 담는 순간
    var ex = exampleOf(S.pickFrom);
    if (!ex) return '직접 고르셨어요.';
    var base = {}, bits = [], diff = 0;
    ex.on.forEach(function (x) { base[x] = 1; });
    PICKABLE.forEach(function (x) {
      if (onOf(S, x) && !base[x]) bits.push('+ ' + CARDS[x].sn);
      if (base[x] && !onOf(S, x)) bits.push('− ' + CARDS[x].sn);
    });
    var T = applyExample({}, ex.k);
    ['declare', 'tribute', 'letter', 'free', 'freeLen'].forEach(function (c) {   // [CAKE_TOAST_SPLIT] 케이크 · 축배는 담은 칸이라 «+ · −»가 센다
      var home = c === 'freeLen' ? 'free' : c;
      if (onOf(S, home) && chipOf(c, S) !== chipOf(c, T)) diff++;
    });
    if (diff) bits.push('바꾼 것 ' + diff);   // [LISTEN_PAGE 코워크 4-2] 고객 화면에 «판»을 두지 않는다
    return bits.length ? ('‹' + ex.nm + '› 예시에서 시작 · ' + bits.join(' · ')) : ('‹' + ex.nm + '› 예시 그대로');
  }
  function sameAsExample(S, k) {
    var ex = exampleOf(k); if (!ex || S.pickFrom !== k) return false;
    var a = picked(S).slice().sort().join(','), b = ex.on.slice().sort().join(',');
    return a === b;
  }

  /* ── 새 나레이션 문안(명세 7장 · 초안 · 말맛과 실청은 사장님) ──
     ★녹음 전이라 콘솔은 «문안 카드»로 지나간다(noClip). 슬러그는 엔진 FILES 맨 끝(89~99)에 붙었다.
     ★[NO_ANSWER_CLAIM] 박수 판의 둘째 줄은 «박수가 나왔다»를 전제하지 않는다 — 녹음은 현장에 반응하지 못한다. */
  var NAR = {
    /* ★★[NAR_1006 2026-10-07 코워크 회신 · 사장님 확인 · 진희 다시 녹음] 128~130 글을 바꿨다(영상 내용 · 사연을 짐작하지 않는 말) — 녹음과 같은 글.
    ★★[PV_EX_NAR 2026-10-07 사장님 녹음(진희)] 식전 영상 소개 스튜디오 나레이션 예시 2~4 — 예시 1 은 prevideoIn(90 클립) 그대로.
       [0]=다정하게 · [1]=유쾌하게 · [2]=감사하게(AI 판 PV_EX 와 같은 이름 · [EX_NAME_HAGE 2026-10-09] 종전 «고마움을 담아») · 녹음은 바꿀 수 없어 어느 예식에나 맞는 말로 · 녹음 클립 128~130. 글을 고치면 다시 녹음 — 손대지 말 것 */
    pvEx: ["두 사람의 지난 시간이 담긴 영상을, 먼저 만나보겠습니다.", "본편에 앞서, 두 사람이 예고편을 준비했습니다. 편하게 즐겨 주십시오.", "이번에는 두 사람이 영상으로 고마움을 전합니다. 함께 보시겠습니다."],   // [NAR_ENGINE_1014] 원고 4판(130) — 개식 선언이 양가를 대신해 감사를 맡는다 · 영상은 두 분이 직접 하는 인사
    /* ★★[NAR_1006 2026-10-07 코워크 지시 · 사장님 확인 · 진희 다시 녹음] 115 · 116 · 117 · 119 · 120 · 123 · 125 · 126 글을 바꿨다(118 · 121 · 122 · 124 는 그대로) — 녹음과 같은 글.
    ★★[GUEST_EX_NAR 2026-10-06 사장님 녹음(진희)] 하객 맞이 스튜디오 나레이션 예시 2~4 — 예시 1 은 GUEST[i][1](01~04 클립) 그대로.
       [0]=다정하게 · [1]=유쾌하게 · [2]=격식 있게 · 줄 차례 = 입장 때 · 10분 전 · 5분 전 · 1분 전.
       ★1분 전 줄은 «곧 문이 열리고»로 시작하지 않아 화촉 · 식전 영상이 먼저인 날에도 맞다(89 판이 따로 필요 없다) · AI 고지(«오늘 모든 안내는 신랑 신부가 … 목소리로 진행됩니다» · [SOURCE_FIRST_1016] 자료 G4 글)를 품는다. ★[SOURCE_BEST_1015 라운드 5] 넷 다 자료 G4 표 1 · 2 글로 다시 짰다(1분 전 = 곧 시작 · 알림 한 마디 · 휴대폰 · 사진 허락은 10분 전).
       녹음 클립 115~126(ritual-cue FILES 끝). 글을 고치면 다시 녹음해야 한다 — 손대지 말 것.
       ★★[NAR_ENGINE_1014 2026-10-14 사장님 «전부 추천대로 … 개편해»] 3단계 원고를 옮겼다 — 기립 말(입장 때 서실 것 없다는 말) 걷기(W3 · W12 · 89 · 04 와 같은 꼴) ·
         1분 전의 «양가를 대신한 감사»는 넣지 않는다(라운드 1 결정 · 개식 선언 몫) · 10분 · 5분 줄 · 126 끝 «이제, 두 사람을 기다리겠습니다»(5판 · ★라운드 5 SOURCE_BEST_1015 에서 G4 표 글로 다시 짜며 걷었다).
         소리는 받은 녹음 + 옛 통녹음에서 쉼으로 잘라 낸 문장(창고 대장 cut · 원고 7장 5) — 다시 받으면 sent-lib --patch 로 덮는다. 기립 말 되살리지 말 것 */
    guestEx: [   // ★[NAR_1007 2026-10-07 코워크 회신 · 사장님 확인] 다정하게 · 유쾌하게 여덟 줄 합쇼체(AI 글 EX_TEXT_1007 과 같은 글) · 115~122 다시 녹음(진희)
      [
      '귀한 걸음 해 주신 여러분, 고맙습니다.',
      '십 분 뒤 본식을 시작하겠습니다. 오늘 하루는 자연스러운 사진으로 남게 되니, 곁에서 마음껏 담아 주시길 바랍니다.',
      '기다리시던 시작 오 분 전입니다.',
      '잠시 뒤 순서를 시작하겠습니다. 오늘 모든 안내는 신랑 신부가 정성껏 고른 목소리로 진행됩니다. 자리에 착석해 주시길 바랍니다. 모두를 위해 휴대폰은 진동 모드로 바꾸어 주시길 부탁드립니다.'],
      [
      '함께해 주신 여러분, 반갑습니다.',
      '십 분 뒤 본식을 시작하겠습니다. 오늘 촬영은 자연스러운 사진으로 남으니, 여러분의 카메라도 마음껏 셔터를 눌러 주시길 바랍니다.',
      '드디어 시작 오 분 전입니다.',
      '곧바로 순서를 시작하겠습니다. 오늘 모든 안내는 신랑 신부가 직접 고른 인공지능 목소리로 진행됩니다. 자리에 착석해 주시길 바랍니다. 원활한 진행을 위해 주머니 속 휴대폰은 진동 모드로 변경을 부탁드립니다.'],
      [
      '참석해 주신 내빈 여러분, 고맙습니다.',
      '십 분 뒤 본식을 시작하겠습니다. 오늘 촬영은 자연스러운 사진으로 기록되오니, 내빈 여러분께서도 마음껏 담아 주시길 바랍니다.',
      '본식 시작 오 분 전입니다.',
      '잠시 뒤 순서를 시작하겠습니다. 오늘 모든 안내는 신랑 신부가 사전에 준비한 목소리로 진행됩니다. 자리에 착석해 주시기 바랍니다. 원활한 진행을 위하여 소지하신 단말기는 진동 모드로 변경해 주시길 부탁드립니다.']
    ],
    guest4Pre: '곧 순서를 시작하겠습니다. 오늘 모든 안내는 신랑 신부가 미리 준비한 목소리로 진행됩니다. 자리에 착석해 주시길 바랍니다. 원활한 진행을 위해 휴대폰은 진동 모드로 부탁드립니다.',
    prevideoIn: '본식에 앞서, 두 사람의 이야기가 담긴 영상을 스크린으로 전해 드립니다.',   /* ★[SOURCE_FIRST_1016] 자료 G2 121 대안 2 그대로 */   // ★[NAR_1006 2026-10-07 코워크 회신 · 사장님 확인] 종전 «두 분이 준비한 영상을 함께 보시겠습니다.» — «준비한»이 바로 앞 1분 전 고지(«미리 준비한 안내 음성»)와 겹쳤다 · 90 다시 녹음(진희)
    candleIn: {
      mothers: '우리는 늘 엄마가 당연히 그 자리에 있는 존재라고 생각하지만, 사실 그 자리는 누군가의 수많은 포기와 사랑으로 지켜진 자리입니다. 그 시간 속에서 두 분은 한 번도 자신을 앞세우지 않고 늘 자식의 길에서 빛이 되어 주셨습니다. 양가 어머님께서, 두 사람이 걸어갈 길을 밝혀 주시겠습니다. 단상 위로 올라와 주십시오. 준비된 초에 함께 불을 붙여 주십시오.',   /* ★[SOURCE_FIRST_1016] 자료 FF 1-2 첫 두 문장 · T 68 */
      parents: '두 사람에게 삶의 첫 기둥이신 분들이, 오늘은 먼저 앞에 서십니다. 양가 부모님께서, 두 사람이 걸어갈 길을 밝혀 주시겠습니다. 단상 위로 올라와 주십시오. 준비된 초에 함께 불을 붙여 주십시오.',   /* ★[SOURCE_FIRST_1016] 자료 T 51 · T 68 */
      fathers: '두 사람에게 삶의 첫 기둥이신 분들이, 오늘은 먼저 앞에 서십니다. 양가 아버님께서, 두 사람이 걸어갈 길을 밝혀 주시겠습니다. 단상 위로 올라와 주십시오. 준비된 초에 함께 불을 붙여 주십시오.',   // ★명세 7장에 없는 판 — 4장 표의 «아버님 두 분»을 위해 같은 틀로 썼다(말맛은 사장님)
      others: '양가를 대표하는 두 분께서, 두 사람이 걸어갈 길을 밝혀 주시겠습니다. 단상 위로 올라와 주십시오. 준비된 초에 함께 불을 붙여 주십시오.'
    },
    /* ★[CANDLE_FF_1014] 부모님 판 셋(어머님 · 부모님 · 아버님)은 원고 4판 앞 문장(사장님 아침 확인 4 «추천대로» · 자료 FF 1 ① 보편적 기억 · ② 반전 한 문장 · 혼주 입장을 뺀 자리를 메운다 PARENTS_ENTRY_OFF) · 다른 두 분 판(others)은 그대로(참이 아닐 수 있다) */
    candleOut: '두 가정의 따뜻한 마음이 하나의 불꽃이 되었습니다.',   /* ★[SOURCE_FIRST_1016] 자료 T1 글자 그대로(140 과 같은 글) */   // ★[CLAP_FEW 2026-09-26 사장님] 박수는 청하지 않는다 · ★[SOURCE_BEST_1015 라운드 5] 자료 G2 6 표 7 추천 1 그대로(옛 «두 집의 불이 밝혀졌습니다»는 자료에 없는 우리 글)
    /* ★★[OPEN_DECL_1014 2026-10-14 사장님 «자료집 멘트를 식순에 녹이는 게 가장 중요 · 완성도 높게»] 개식 선언(137 · 우성) — 원고 3판 + 라운드 1 결정.
         자료 BB 개식사 아홉이 모두 «…예식을 시작하겠습니다»로 시작을 알리고 · «모든 분이 증인»은 BB 다섯 · S · U1 · 감사는 개식사 몫(U1 · Q · G · S · D · T4 · 1분 전 예고엔 착석 · 휴대폰만).
         자리 = 예식 시작 시각(1분 전 · 사진 부탁 뒤) → 식전 영상 · 화촉 · 입장 앞 · 새 코스에 늘(고르는 칸 없음) · 본식 앞(하객 맞이 묶음)이라 본식 시간에 들지 않는다 */
    open: '바쁜 일정에도 자리를 빛내 주신 하객께 신랑 신부와 양가를 대신해 감사드립니다. 하객 한 분 한 분이 결혼식의 증인입니다. 지금부터 신랑과 신부의 예식을 여러분의 박수와 함성으로 시작하겠습니다!',   /* ★[SOURCE_FIRST_1016] 자료 BB 12 · 9 · 3 글자 그대로(이름 자리만 «신랑과 신부») */   // ★[OPEN_WITNESS_R6_1016 라운드 6 · SOURCE_ALL_1016] 꼬리도 자료 BB 9 글자 «하객 한 분 한 분이 결혼식의 증인»(+«이») — 영상 · 화촉을 뺀 날 손 GO 입장 E «어른의 약속을»과 «약속» 두 번 · 3초 뒤 «두 사람» 되풀이를 함께 풂   // ★[OPEN_WITNESS_1015 라운드 5] 자료 BB 93 단어 바꿈 «하객 한 분 한 분이» — «이 자리에 계신 모든 분이»가 3초 뒤 화촉 여는 말 «…계셨던 분들이»와 같은 꼴(식전 영상을 뺀 날) · 입장 B «여기 계신 모든 분»과도 겹쳤다   // ★[OPEN_TODAY_1015 라운드 4] «오늘은» 금지 — 식전 영상을 뺀 날 3초 뒤 화촉 여는 말 «늘 … 오늘은 먼저 앞에 서십니다»(91 · 92 · 93 · «늘 → 오늘은»이 그 줄의 축)와 사슬로 붙어 같은 목소리로 «오늘은» 두 번(narr-words 사슬 이음 CHAIN_ECHO_1015) · 증인 정형구는 «오늘» 없이(자료 BB ④ · S · U1) · 녹음 대기라 글만
    /* ★★[CANDLE_CALL_1014] 화촉 인사 부르기(138 두 분 · 139 네 분) — 맺는 말에 이어 사슬 · 자료 여섯(G «양가 어머님 맞절!» · T3 · T4 · U1 · S · Q)이 인사를 불러 준다 ·
         CANDLE_BOW_1012 «두 분이면 서로 한 번 · 하객께 한 번 · 네 분이면 하객께 한 번» · 10/10 지적 6-1(자리로)을 이 줄에 합쳤다(원고 3판 · 4판) */
    /* ★★[SOURCE_FIRST_1016 · CANDLE_CALL_SRC_1016] 인사는 실전 구호 그대로 — G 5 «양가 어머님 맞절!» · S 3 «양가 부모님 하객분들께 인사!» · G2 6 추천 1 «불을 밝혀 주신 두 분은, …» ·
         서는 분 이름만 판마다(어머님 · 아버님 · 다른 두 분 «두 분,» · 네 분) · 구호 뒤 4초는 조립기가 넣는다(build-typecast-import [CANDLE_CALL_HOLD_1016] · 맞절 · 인사 시간) */
    candleBow: { two: '양가 어머님 맞절! 양가 어머님 하객분들께 인사! 불을 밝혀 주신 두 분은, 이제 자리로 돌아가 예식을 지켜봐 주십시오.', fathers: '양가 아버님 맞절! 양가 아버님 하객분들께 인사! 불을 밝혀 주신 두 분은, 이제 자리로 돌아가 예식을 지켜봐 주십시오.', others: '두 분, 맞절! 두 분, 하객분들께 인사! 불을 밝혀 주신 두 분은, 이제 자리로 돌아가 예식을 지켜봐 주십시오.', four: '양가 부모님 하객분들께 인사! 불을 밝혀 주신 네 분은, 이제 자리로 돌아가 예식을 지켜봐 주십시오.' },
    /* ★[CANDLE_TONE_1014] 말투 묶음(원고 3-3 · 140 맺는 말 대안) — 입장 멘트를 «격식 있게»(C)로 고른 날만 화촉 맺는 말이 따라온다 · 새 고르기 칸 없음(ENTRY_OUT_TONE 과 같은 까닭) */
    candleOutFormal: '두 가정의 따뜻한 마음이 하나의 불꽃이 되었습니다.',   /* ★[SOURCE_FIRST_1016] 자료 T1 그대로 · «따뜻한»을 다시 넣었다(W1 로 빼던 것은 지난 결정) */   // ★[SOURCE_BEST_1015 라운드 5] 자료 T1 에서 «따뜻한»(W1)만 뺐다 · 옛 «양가의 촛불이 모두 켜졌습니다»
    /* ★★[TRIB_NAME_1014] 부모님께 인사 — 이름 줄(141) · 선언 바로 뒤인 날 짝 줄(142)(PAIR_DRAFT_V3 10/10 «추천대로» · 원고 5판 · 38 첫 문장은 순간 이름을 말하지 않는다) ·
         구호(143 · 원고 4판 · 사장님 아침 확인 2 «추천대로» · 자료 S 12 · G 12 · FF 2-1 · O — 꽃이 빠져 «인사»가 이 순간의 동작이 됐다) */
    tributeName: '기쁘면서도 섭섭하고, 대견하면서도 마음 한편이 뭉클하실 부모님께 신랑 신부가 감사의 마음을 전하겠습니다.', tributePair: '부부가 되어 처음 드리는 인사는, 부모님께 올리겠습니다.',   /* ★[SOURCE_FIRST_1016] 자료 G1 60(선언 → 부모님 인사 · «유지» 판정 문장) 그대로 · 옛 «부부가 되어 처음으로, 부모님께 갑니다»(PAIR_DRAFT_V3)는 걷힘 */ tributeCall: '신랑 신부, 인사!', tributeCallSay: '그 마음을 담아 신랑 신부, 인사!',   /* ★[TRIB_CALL_SAY_1014 라운드 3] 말로 인사 날 구호(145) — 자료 GG 1 · FF 2-1 · EE 넷 자리 · T4 «마음을 담아 → 구호» 뼈대 · «그 마음»은 두 분이 방금 한 말을 받아 늘 참 · 말 없이 날은 구호만(143) */
    clapAsk: '여러분은 방금 두 사람의 약속을 함께 지켜보셨습니다. 이 약속의 증인이 되어 주신다면, 큰 박수로 답해 주십시오.',
    clapDeclare: '오늘 이 자리에서, 두 사람은 서로의 평생이 되었습니다. 이제 두 사람은 부부입니다.',
    pourMix: '두 분이 각자 고른 와인을 한 잔에 붓습니다. 한 번 어우러진 맛은 다시 나뉘지 않지요.',
    pourFamily: '양가에서 한 병씩 고른 와인을, 이제 한 잔에 모읍니다.',
    /* ★★[NAR_0925 2026-09-25 코워크 회신] 새 줄 — 이름은 부르지 않는다(나레이션은 이름을 모른다 · 사진·식순지·가족 낭독에서 불린다).
       freeIn.*·freeOut : 준비한 순서 판별 넷(FREE_WHAT · 영상 / 무대 / 선물 / 축사) · 맺는 말은 공통
       freeFail     : 영상 · 음원이 재생되지 않을 때 디렉터가 누르는 한 줄(콘솔 · 곧장 다음 순간으로)
       bowGroom     : 신랑 큰절 판(BOW_GROOM) · toastBothPour : 와인을 붓는 날의 toast-both-b(P2 · «잔이 가는 동안»을 뺀 줄) */
    /* ★[FREE_NEUTRAL 2026-09-25 코워크 회신 2-6] 영상 · 무대 · 선물은 두 분이 직접 준비한 날도 있다(두 분의 영상 · 춤 ·
       부모님께 드리는 선물). «두 분을 위해 …» · «두 분께 건넬 …»은 그날 틀린 말이라 «오늘을 위해 …»로 — 누가 준비했든 맞다.
       축사(speech)는 늘 다른 분이 하므로 그대로. 되돌리지 말 것. */
    freeIn: {
      video: '오늘을 위해 준비한 영상이 있습니다. 함께 보시겠습니다.',
      stage: '오늘을 위해 준비한 작은 무대가 있습니다. 함께 보시겠습니다.',
      gift: '오늘을 위해 마음을 담아 준비한 선물이 있습니다.',
      speech: '다음은 축사가 있겠습니다.'
    },
    freeOut: '따뜻한 박수 부탁드립니다.',
    freeFail: '이 순서는 사진 시간에 함께 보겠습니다. 다음 순서로 이동하겠습니다.',   // ★[PV_RESCUE_WORDS_1015 라운드 4] «잠시 뒤» 금지 — 이 줄을 새로 쓰는 곳은 이제 식전 영상(예식 맨 앞 · PV_RESCUE_1014)이라 «잠시 뒤»가 본식 전체(7 ~ 25분) 뒤를 가리켰다 · 고객 화면 셋(식전 영상 · 준비한 순서 · 빌더 안심)은 이미 «사진 시간에 함께 보겠습니다»로 따온다 · 다시 받을 녹음 한 줄(우성)
    bowGroom: '신랑은 큰절로, 신부는 고개 숙여, 부모님께 감사를 올립니다.',
    toastBothPour: "신랑 신부 앞날에 영원한 사랑과 행복을 위하여 다 같이 축배를 드는 시간입니다. 신랑 신부가 선창하면 '위하여'라고 해 주세요.",   /* ★[SOURCE_FIRST_1016] 축배 여는 말(40)과 같은 자료 글 AA 37 · 49 */   /* ★[TOAST_COUPLE 2026-09-26 사장님] 107 · 초안 */
    /* ★★[BRIDGE_LINK 2026-10-03 사장님 녹음 받음 · 이음말_초안_20261002.md 확정본] 순간 사이 잇는 말 넷(111~114 · 진행 · 우성).
       B1(입장 도착 → 첫 순간)은 «말 없음»이 확정이다 — 입장곡이 주인공. 넣지 말 것.
       ★다음 순간이 무엇이든 맞는 말만 · 두 분 감정을 화제로 삼지 않는다 · 한 줄 2~3초. 엔진(ritual-cue build)이 이웃 두 순간이 다 있을 때만 끼운다 */
    bridge: {
      clapThanks: '박수, 고맙습니다.',   /* B3 성혼 선언 박수 뒤 */
      breath: '모두 잠시, 숨을 고르셔도 좋습니다.',   /* B4 부모님께 인사 → 다음 순간 */
      videoOut: '영상은 여기까지입니다.',   /* B5 준비한 영상 끝 → 다음 순간(준비한 순서가 «영상»일 때만) */
      lighter: '이제, 조금 가벼운 순서로 넘어가겠습니다.'   /* B6 편지 → 케이크(바로 붙을 때만) */
    }
  };

  /* ── 남는 장면(«그날 남는 사진» · 코워크 1장 고침) — 준비한 순서는 무엇을에 따라 ── */
  var FREE_SHOT = { video: '함께 보며 웃는 하객들', etc: '두 분이 준비한 순간', gift: '선물을 건네받는 두 분', speech: '말하는 분을 보며 웃는 두 분' };   // [FREE_ETC]
  function shotOf(k, S) { if (k === 'vow' && S && S.vowKind === 'thanks') return '하객을 바라보며 읽는 두 분';   /* ★[THANKS_SHOT_1013] 감사문을 고른 날 «남는 장면»(마이페이지 summary.scenes)이 서약 장면(«서로를 보며 약속하는 옆얼굴»)이었다 — oneOf(oneT)와 같은 갈래 */
    return k === 'free' ? FREE_SHOT[FREE_KIND[chipOf('free', S)]] : (CARDS[k] || {}).shot; }

  /* ── 도와주실 분(코워크 5-6) — 두 분 준비 · 마이페이지 준비 칸. [누가, 언제] ──
     ★«식사 자리로 안내할 분»은 애프터 웨딩을 고른 날만이라 식순만으로는 모른다 — 마이페이지가 덧붙인다(mealGuide). */
  function helpersOf(S, opt) {
    opt = opt || {};
    var out = [];
    if (onOf(S, 'song')) out.push(['축가를 불러 주실 분', '가족이나 친구 · 여럿이 함께 불러도 돼요']);   // [SONG_BACK_1011] MR 은 바로 위 «보낼 것»이 말한다(되풀이하지 않는다)
    if (onOf(S, 'free') && FREE_KIND[chipOf('free', S)] === 'speech') out.push(['축사해 주실 분', '친구나 형제자매 · 한두 분']);   // [SPEECH_TILE_1012] 축가 줄과 같은 꼴
    else if (onOf(S, 'free') && FREE_KIND[chipOf('free', S)] !== 'video') out.push(['준비한 순서를 맡을 분', '담은 날 · 선물 전달 등을 하실 분']);   // 옛 초안의 선물 · 기타
    /* ★[RING_STAGE 2026-10-02 사장님 결정(R1-49)] 반지는 단상 위에 미리 놓아 둔다 — 건네는 사람이 없다. «반지를 건넬 아이나 가족» 줄은 걷었다([HELPER_WORDS 3-4(f)] 의 그 줄) · 되살리지 말 것 */
    out.push(['어르신을 모실 분', '양가 한 분씩 · 사진 때']);   // [R5-06] 바로 아래 «불러 모아 주실 분»과 같은 셈(사장님 «추천대로»)
    /* ★[H3_CALLER_HELPER 2026-09-26 코워크 최종판 5-2] 가족사진 «불러 모아 주실 분»(PHOTO_CALLER) — ③ · 마이페이지 «도와주실 분»에도.
       카드 이름은 «가족 · 친구 스냅»(#864 · GROUP_TIME_WORD) — 옛 이름 «단체 사진»으로 가리키지 않는다. */
    out.push(['가족사진 때 친척분들을 불러 모아 주실 분', '양가 한 분씩 · 마이페이지 «가족' + NB + '·' + NB + '친구' + NB + '스냅»에 적어 두면 디렉터가 먼저 말씀드려요']);   // 카드 이름은 한 덩어리(1280 에서 «친구 / 스냅»으로 갈렸다)
    out.push(['축의 받을 분', '축의금을 받으실 때만 · 두 분이 정해요']);   // [HELPER_WORDS 3-4(f)]
    if (opt.mealGuide) out.push(['식사 자리로 안내할 분', '애프터 웨딩을 고른 날']);
    return out;
  }

  /* ★[PREP_LIST 2026-09-25 코워크 P8 · 사장님 «만듭니다»] 마이페이지 «두 분 준비 · 도와주실 분» 의 원천 — 빌더와 같은 prepOf.
     due = 예식 며칠 전까지(«사흘 전»이 적힌 것은 3 · 나머지는 7). 빌더가 저장할 때 summary.prep 로 싣는다
     (마이페이지는 이 파일을 싣지 않는다 — ritual-data 와 같은 까닭). */
  /* ★[WHY_NEIGHBOR 2026-09-25 코워크 추가전달 2-7] «이 자리인 까닭»은 이웃 순간을 담았을 때만 그 이름을 말한다.
     고정 글이라 편지를 안 담아도 «편지 앞이에요»가 나왔다. 이웃이 없으면 까닭만 말한다. */
  var WHY_ALONE = {
    bless: '부부가 된 두 분께 부모님이 건네는 첫 말씀이에요.',   // [WHY_BLESS 코워크 회신4 4-f] · [BLESS_AFTER_DECLARE] 선언을 뺐을 때 — «선언 바로 뒤»라 하지 않는다
    tribute: '부부가 된 뒤 처음 드리는 인사라서예요(한국 예식의 오랜 차례).',
    free: '축하 순서가 한자리에 모이는 자리예요.'   // [HEART_ORDER_1012] 종전 «마지막 큰 순간이 앞에 몰리지 않도록 뒤쪽에»(인사 뒤 자리)는 걷었다
  };
  /* [HEART_ORDER_1012] 이웃은 하나 또는 여럿(그중 하나라도 담았으면 이웃이 있다) — 인사의 이웃은 앞의 마음의 순간들 */
  var WHY_NEXT = { free: 'song' }, WHY_PREV = { bless: 'declare', tribute: ['bless', 'free', 'song', 'letter'] };   // [BLESS_AFTER_DECLARE] 덕담의 이웃은 이제 앞의 선언
  function _anyOn(S, ks) { return [].concat(ks).some(function (x) { return onOf(S, x); }); }
  function whyOf(k, S) {
    var c = CARDS[k]; if (!c || !c.why) return '';
    if (WHY_NEXT[k] && S && !_anyOn(S, WHY_NEXT[k])) return WHY_ALONE[k];
    if (WHY_PREV[k] && S && !_anyOn(S, WHY_PREV[k])) return WHY_ALONE[k];
    return c.why;
  }
  function prepList(S) {
    var out = [];
    ORDER.filter(function (k) { return onOf(S, k); }).forEach(function (k) {
      /* [R8-06 BLESS_SITE_PREP] 덕담 «원고 없이 부모님이 현장에서 바로»(빌더 S.mkc['p:bless:j'] = 'site' · j 는 prepOf 순번 · _mkItems 와 같은 꼴)면 원고 부탁을 목록에서 뺀다 —
         한눈에 보기에서만 빠지고 ① 개수 · ② 첫 쪽 · ④ · 마이페이지(summary.prep)는 받지 않을 원고의 마감을 계속 셌다. 원천 한 곳에서 거른다 */
      /* [SPEECH_SCRIPT 2026-10-07] 축사도 «원고 없이 현장에서 바로»면 원고 부탁을 뺀다(덕담과 같은 꼴 · 빌더 S.mkc['p:free:j']) */
      prepOf(k, S).forEach(function (q, j) { if ((k === 'bless' || (k === 'free' && FREE_KIND[chipOf('free', S)] === 'speech')) && (q[2] || 'send') === 'ask' && ((S && S.mkc) || {})['p:' + k + ':' + j] === 'site') return; out.push({ k: k, who: q[0], what: q[1], cat: q[2] || 'send', due: q[3] === undefined ? 7 : q[3], note: q[4] || '' }); });   /* [PREP_DUE] */
    });
    return out;
  }

  /* ★★[LISTEN_PAGE 2026-09-25 코워크 회신 4장 · 사장님 결정] ② 보고 듣기 · 순간 영상의 원천.
     SCENE      장면 영상이 없을 때 자리에 쓰는 한 줄(무엇이 보일지)
     VIDEO_READY 들어온 장면 영상 이름 — ★파일이 오면 이 목록에 이름만 더한다(① 카드 · ② · ④ 가 함께 바뀐다).
                 파일: /assets/video/moments/<이름>.mp4 (16:9 · 1280×720 · 6~10초 · 소리 없음 · [VIDEO_V8_0928]) + <이름>.webp(첫 장면)
     videoKeys  한 순간이 쓰는 장면 이름들(판에 따라 · 차례대로) — 케이크만 cake · 축배만 toast · 둘 다 cake → toast
     talkOf     사람이 말하는 자리의 글 카드(«여기서 … · 약 n분») — 보고 듣기는 그 자리를 기다리지 않고 3초 보여 주고 넘어간다 */
  /* ★[FLOWER_OFF_1013 2026-10-13 사장님] 부모님께 인사 장면 글은 꽃 없이(인사하고 안아 드려요 · [HUG_WORDS_1013]) — «꽃을 건네고» 되살리지 말 것 */
  var SCENE = {
    guest: '테이블에 앉는 하객들 사이로 촛불이 흔들려요', prevideo: '불을 낮춘 방 · 화면 빛을 받는 하객들의 뒷모습',
    candle: '두 손이 긴 초에 불을 옮겨요', entry: '문이 열리고 두 분이 함께 걸어 들어와요', matjeol: '마주 선 두 분이 천천히 고개를 숙여요' /* [MATJEOL_SPLIT_1013] */,
    welcome: '두 분이 마이크 하나로 차례로 인사해요', bless: '자리에서 마이크를 든 부모님 · 듣는 두 분의 뒷모습',
    vow: '마주 선 두 분 · 카드를 든 손', ring: '반지를 끼워 주는 두 손', declare: '촛불 속 테이블의 하객들이 박수를 쳐요',
    song: '노래하는 사람 · 귀 기울이는 얼굴들',   /* ★[SONG_ANYONE_WORDS_1013] 두 분이 직접 부르는 날도 참(SONG_SELF_1011) */   // [SONG_BACK_1011] 장면 영상이 아직 없다 — 영상이 오면 VIDEO_READY 에 이름만 더한다
    tribute: '두 분이 부모님께 인사하고 안아 드려요', free: '말하는 분을 보며 웃는 두 분' /* [SPEECH_TILE_1012] 축사 · 옛 «영상» 판은 영상(free.mp4)이 이 글 대신 나온다 */, letter: '편지를 펼쳐 든 손 · 듣는 사람의 어깨와 손',   /* [VIDEO_V8_0928] 장면 대본 v8 과 같게 — 첫인사 목례는 닫는 인사에만 · 준비한 순서는 부모님(사장님 결정) · 편지는 얼굴 없이 */
    cake: '두 손이 함께 나이프로 케이크를 잘라요', toast: '잔들이 함께 올라가요', _close: '두 분이 인사하고 · 하객들이 앞으로 모여요',
    table: '두 분이 테이블 사이를 걸어요 · 하객들이 자리에서 맞아요'   // [TABLE_GREET_1008] 장면 글 · ★[TABLE_VIDEO_1009 2026-10-09] 이제 영상(table.mp4)이 있어 다른 순간처럼 영상이 없을 때만 쓴다
  };
  var VIDEO_DIR = '/assets/video/moments/';
  /* ★[VIDEO_IN_1003 2026-10-03 사장님 순간영상 v2 16편] 받은 mp4 그대로(H.264 High · 1280×720 · 30fps · 소리 없음 · faststart · 6~10초) +
     첫 장면 webp 두 벌(받은 표지 jpg = 첫 장면 · 1280 q80 · 640 q78 · encode-moment.sh 와 같은 값). 촬영표 17편 중 toast-pour 는 만들지 않았다(붓기 장면 없음 · 화면도 안 찾는다).
     _close 는 close · entry 는 entry → entry-look 차례(videoKeys). 이름을 빼면 그 순간은 글 한 줄(SCENE)로 돌아간다
     ★[THUMB_PICK 2026-10-03] ① 칸 그림(small · <이름>-640.webp · 칸에서만 쓴다)은 고른 장면 · 창과 영상 첫 장면(poster · <이름>.webp)은 늘 첫 장면:
       candle  9.8초          첫 장면은 초가 꺼져 있다 · 끝은 두 초 다 켜짐
       entry   8.0초          첫 장면은 손과 부케 가까이 · 문으로 들어오는 두 분
       toast   2.5초          사장님 지정 · 두 분이 잔을 가슴 높이로 든 장면(10/9 v8)
       tribute 2.8초          어머님을 안는 신부 · 곁의 신랑(자른 판 기준)
                              ★★[TRIB_HUG_CROP_1014 2026-10-14 사장님 «추천대로» · FLOWER_OFF_1013] 받은 v8 판의 «꽃 건네기» 앞 반(5.2초 컷 앞)을 자르고
                                부케를 든 오른쪽 손을 잘라(왼쪽 위 928×522 → 1280×720) «안기» 반만 남겼다(4.27초) — 칸 그림도 새로(옛 칸 그림은 부케가 보였다).
                                꽃 없이 안기는 새 영상이 오면 같은 이름으로 바꾼다(KEEP_CARD 없이 · 넷째 값으로 칸 그림을 고른다)
       prevideo 7.7초         사장님 지정 · 화면을 보는 하객 뒷모습
       나머지  첫 장면        (끝 장면은 주인공이 빠진다 · 덕담 뒷모습 · 편지 손 · 닫는 인사 발)
       ★초는 v8 받은 원본 기준(10/9 · 종전 v2 표의 6.0 · 2.0 · 6.0 은 옛 판) · 고른 다섯 편의 칸 그림은 그 원본에서 뽑아 둔 그대로다(tribute 만 10/14 자른 판에서 다시).
     ★[VID_MOVE_NOW 2026-10-09 사장님 «열자마자 움직일 수 있게»] 영상은 앞의 멈춘 구간(편마다 0.10~3.10초)을 잘라 가볍게(CRF 24 · 합 65.0MB → 21.2MB) 다시 구웠다 — 첫 장면(poster)은 자른 판의 첫 장면.
       다시 구울 때: 고른 다섯 편은 KEEP_CARD=1 sh scripts/video/encode-moment.sh 받은파일.mp4 <이름> · 나머지는 KEEP_CARD 없이(칸 그림 = 새 첫 장면) · 칸 그림을 새로 고르면 넷째 값(자른 뒤 기준 초) */
  var VIDEO_READY = ['guest', 'prevideo', 'candle', 'entry', 'entry-look', 'welcome', 'bless', 'vow', 'ring', 'declare', 'tribute', 'free', 'letter', 'cake', 'toast', 'close', 'table'];   // [TABLE_VIDEO_1009] 2026-10-09 사장님 «table 넣어» — 테이블 인사 영상(v8 묶음 · 10초)
  function videoKeys(k, S) {
    if (k === 'cake') return ['cake'];   // [CAKE_TOAST_SPLIT] 두 순간 · 두 영상
    if (k === 'toast') return ['toast'];
    /* ★[BOW_VIDEO_OFF 2026-09-26 코워크 회신5 4-7 · 연구 F02] 절 영상(entry-bow · tribute-bow)은 만들지 않는다 — AI 가 절 모양을 자주 틀린다.
       맞절을 고른 분도 바라보기 영상 · 신랑 큰절도 인사 영상이 나온다(19편 → 17편). 되살리지 말 것. */
    if (k === 'entry') return ['entry'];   // [MATJEOL_SPLIT_1013] 바라보기 영상(entry-look)은 맞절 순간으로 옮겼다 — 같은 영상이 두 순간에서 되풀이되지 않게
    if (k === 'matjeol') return ['entry-look'];   // [MATJEOL_SPLIT_1013 · BOW_VIDEO_OFF] 맞절 영상은 만들지 않는다 — 마주 보는 바라보기 영상
    if (k === 'tribute') return ['tribute'];
    if (k === '_close') return ['close'];
    if (k === 'table') return ['table'];   // ★[TABLE_VIDEO_1009 2026-10-09 사장님 «table 넣어»] 테이블 인사도 영상 — 10/8 «영상 없음(장면 글 한 줄)»을 뒤집었다
    if (k === 'free') return FREE_KIND[chipOf('free', S)] === 'video' ? ['free'] : [];   // ★[SPEECH_TILE_1012] 축사에는 장면 영상이 없다(축가처럼 장면 글) · 옛 «영상» 판만 free.mp4
    if (AFTER_CLOSE[k]) return [];   // [TABLE_GREET_1008] 닫는 인사 뒤 순간 중 영상이 없는 것은 장면 글(SCENE) 한 줄 · table 은 바로 위에서 영상
    return [k];
  }
  /* [POSTER_SMALL 2026-09-26 코워크 최종판 3-5] small = 칸용 첫 장면(640px · encode-moment.sh 가 함께 굽는다) — 칸은 영상을 돌리지 않는다 */
  function videoOf(name) { return VIDEO_READY.indexOf(name) < 0 ? null : { mp4: VIDEO_DIR + name + '.mp4', poster: VIDEO_DIR + name + '.webp', small: VIDEO_DIR + name + '-640.webp' }; }
  function firstVideo(k, S) { var ks = videoKeys(k, S); for (var i = 0; i < ks.length; i++) { if (videoOf(ks[i])) return videoOf(ks[i]); } return null; }
  function secTxt(x) { return x < 55 ? ('약 ' + Math.max(10, Math.round(x / 10) * 10) + '초') : ('약 ' + Math.round(x / 60) + '분'); }
  /* [THANKS_IN_VOW] 순간 설명 한 줄 — 서약 카드에서 감사문을 고르면 감사문 설명(CARDS.vow.oneT) · 그 밖은 CARDS[k].one */
  function oneOf(k, S) { var c = CARDS[k]; if (!c) return ''; return (k === 'vow' && S && S.vowKind === 'thanks' && c.oneT) ? c.oneT : (c.one || ''); }
  /* [SPEECH_TILE_1012] 칸 이름 — 축사 칸(free)에 옛 초안의 영상 · 선물 · 기타가 켜져 있으면 옛 이름 «준비한 순서»(새로 담으면 늘 축사 · 빌더 opTgl) */
  function nameOf(k, S) { if (k === 'free' && S && onOf(S, 'free') && FREE_KIND[chipOf('free', S)] !== 'speech') return '준비한 순서'; return CARDS[k] ? CARDS[k].n : k; }
  function talkOf(k, S) {
    var fk, n, p = 0;
    try { p = (partsOf(k, S) || [])[1] || 0; } catch (e) { p = 0; }
    switch (k) {
      case 'welcome': return '두 분이 하객께 감사 인사를 해요 · ' + secTxt(p || 30);
      case 'bless': return '부모님이 덕담을 들려주세요 · 약 1분씩';   // ★[R2_BLESS_TALK_1014] ④ 는 끝의 «· 약 …»를 떼고 «말하는 시간 한 분 약 1분씩»을 붙인다 — «한 분 1분쯤»이면 시간을 두 번 말했다(«씩»이 한 분 몫) · [LINE_R1_1014] «약 3분»(시간 표 합)은 한 분이 하시는 날 3분으로 읽혔다 · 카드 · 준비 줄 · ④ 대본과 같은 말
      case 'vow': return (S && S.vowKind === 'thanks' ? '두 분이 하객께 감사문을 읽어요 · ' : '두 분이 서약을 읽어요 · ') + secTxt(p || 100);   // [THANKS_IN_VOW]
      case 'declare': { var dw = declBy(S); return (dw ? dw + josaOf(dw, '이', '가') : '선언하실 분이') + ' 성혼 선언문을 읽어요 · ' + secTxt(p || 15); }   // [DECLARE_BY_PERSON] 늘 사람이 읽는다 · [DECLARE_ANYONE] 두 분이 적은 분
      case 'tribute': { var t = chipOf('tribute', S); if (t === 'none') return '';
        return (crossTribute(S) ? '두 분이 서로의 부모님께 고마운 말을 전해요' : '두 분이 부모님께 고마운 말을 전해요')   /* [TRIB_ONE_SAY] */ + ' · ' + secTxt(p || 30); }
      case 'letter': return (chipOf('letter', S) === 'each' ? '두 분이 서로에게 쓴 편지를 읽어요' : '두 분이 각자 부모님께 쓴 편지를 읽어요') + ' · ' + secTxt(p || 120);
      case 'song': return '축가 한 곡 · 연습에서는 건너뛰어요';   // [SONG_BACK_1011] 영상 · 기타 판 준비한 순서와 같은 꼴
      case 'toast': { var _tx = (S && S.tx) || {};   /* ★[TOAST_SAY_TALK_1013] 축배 한마디를 적었으면 그 말과 함께(자료 AA 6-1 · 감사 한 문장 + 구호) */
        return String(_tx['toast.g'] || '').trim() || String(_tx['toast.b'] || '').trim() ? '두 분이 한마디와 함께 «위하여!»를 외치면 하객이 함께 답해요 · 약 20초' : '두 분이 «위하여!»를 외치면 하객이 함께 답해요 · 약 10초'; }   // [TOAST_COUPLE 2026-09-26 코워크 회신5 3-2] ② 말하는 자리 카드
      case 'free': fk = FREE_KIND[chipOf('free', S)]; n = chipOf('freeLen', S);
        if (fk === 'speech') return '축사하실 분이 축하의 말을 전해요 · 약 ' + n + '분';   // [SPEECH_WORDS_1013] 카드 설명과 같은 «전해요»   // [SPEECH_TILE_1012]
        return chipLabel('free', S) + ' · 연습에서는 건너뛰어요';
    }
    return '';
  }

  return {
    SCENE: SCENE, VIDEO_DIR: VIDEO_DIR, VIDEO_READY: VIDEO_READY, videoKeys: videoKeys, videoOf: videoOf, firstVideo: firstVideo, talkOf: talkOf, oneOf: oneOf, secTxt: secTxt,
    prepList: prepList, whyOf: whyOf, PREP_CAT: PREP_CAT, dueWord: dueWord, studioOf: studioOf, goodsOf: goodsOf, TRIB_ACT: TRIB_ACT, GOODS_COST: GOODS_COST, BOUQUET: BOUQUET, BOUQUET_LINE: BOUQUET_LINE, savedOk: savedOk,
    ORDER: ORDER, ALWAYS: ALWAYS, PRE: PRE, PICKABLE: PICKABLE, RETIRED: RETIRED, OFFER: OFFER, SECTIONS: SECTIONS, CARDS: CARDS, AFTER_CLOSE: AFTER_CLOSE, APART: APART, TABLE_SEC: TABLE_SEC, tableN: tableN, bodyOrder: bodyOrder,   // [TABLE_GREET_1008]
    CHIPS: CHIPS, DEF: DEF, CANDLE_WHO: CANDLE_WHO, EXAMPLES: EXAMPLES, TIME: TIME, NOTICE: NOTICE, NAR: NAR, DAYMIN: DAYMIN, RANGE: RANGE,
    FREE_KIND: FREE_KIND, SHORT_MIN: SHORT_MIN, heavy: heavy, chipLabel: chipLabel, labelOf: labelOf, crossTribute: crossTribute, shotOf: shotOf, helpersOf: helpersOf,
    chipOf: chipOf, setChip: setChip, nameOf: nameOf, exampleOf: exampleOf, applyExample: applyExample, sameAsExample: sameAsExample,
    onOf: onOf, toastMode: toastMode, migrateCakeToast: migrateCakeToast, seqOf: seqOf, bodySeq: bodySeq, picked: picked, partsOf: partsOf, bodySec: bodySec, span: span, spanText: spanText, tableSec: tableSec, rng: rng,
    momentLabel: momentLabel, peakOf: peakOf, level: level, prepOf: prepOf, noticeOf: noticeOf, noticeFull: noticeFull, noticeList: noticeList, slotText: slotText, originOf: originOf,
    flowSegs: flowSegs, flowPeak: flowPeak, flowEnv: flowEnv, flowSVG: flowSVG, peakLine: peakLine, PEAK_NONE: PEAK_NONE, orderParts: orderParts, prepCount: prepCount, prepOpt: prepOpt, PREP_WHERE: PREP_WHERE, prepLine: prepLine, VOICE_KIND: VOICE_KIND, guestReader: guestReader, voiceKind: voiceKind, voiceLab: voiceLab, FEATURE: FEATURE, voiceState: voiceState,
    TILE: TILE, tileOf: tileOf, SAMPLE: SAMPLE, sampleOf: sampleOf, firstSentences: firstSentences, sampleS: sampleS, CHOOSE_AT_LISTEN: CHOOSE_AT_LISTEN, NB: NB, josaOf: josaOf,
    declBy: declBy, DECL_HINT: DECL_HINT, DECL_MAX: DECL_MAX   // [DECLARE_ANYONE]
  };
});
