// 모먼트에딧 · 당일 콘솔 «구간 음악» 추천 곡 목록  [BGM_PICKS_1023 2026-10-23]
//
// ★곡 더하는 법 [BGM_FIX_1030 2026-10-30 · 곡 번호 = 곡마다 하나]
//   1. 아래 SONGS 맨 끝에 한 줄 더한다: B31: { t: '곡', a: '연주자', v: '판(앨범)', why: '한 줄(분위기만)' },   보컬이면 vocal: true · 아는 영화 · 드라마 곡이면 src: '출처'
//      번호 = 다음 빈 번호(B31 · B32 …) · 비운 번호(B08)는 다시 쓰지 않는다 — 한 번 정하면 바꾸지 않는다(구간 차례를 바꿔도 그대로).
//   2. PICKS 의 그 구간 배열에 번호를 넣는다(위가 1순위 · 보컬 곡은 1순위에 두지 않는다(축배 M7 만 예외) — bgm-fix 검사가 잡는다).
//      곡 이름은 한 줄에 들게 짧게 · «(Instrumental)» 꼬리는 붙이지 않는다(«노래» 표시가 없으면 연주곡) · 연주자는 한국 고객이 읽는 이름(히사이시 조)
//      같은 곡을 여러 구간에 넣어도 번호 · 파일은 하나다.
//   3. 드라이브 «ME_구간곡» 폴더에 그 번호로 시작하는 파일 하나(예: B28_곡이름.mp3) — 고객 미리 듣기가 그 번호로 찾는다 [BGM_PREVIEW_1024]
//      콘솔은 그 기기에 «파일 넣기»로 한 번 넣으면 그 곡이 든 모든 구간에서 쓴다(곡 아이디 = 번호).
//   ★곡 크기는 파일에서 맞춘다(−23 LUFS · 피크 −2 dBTP 이하 · BGM 섹션이 맞춰 드린다) — 엔진은 곡마다 보정하지 않는다(PARAM.musicTrim 하나).
//
// ★사장님 지시(2026-10-23 21:40) «입장곡은 지금 셋팅되어 있으니깐 나머지 이 노래들 우선 고를 수 있게 넣어줘» · «나중에 곡 더 추가할 거야»
//   → BGM 섹션 콘솔 라운드 2 덧붙임.
// ★★[BGM_PREVIEW_1024 2026-10-24 사장님 «고객이 진행하면서 나레이션과 함께 들어볼 수 있게» · «우리가 리스트를 만들면 그 안에서 고객이 ‹이 시간에는 이 노래가 좋겠어› 선택할 수 있게» · 질문 답 «고객이 고름»]
//   이제 식순 화면(order-preview)도 이 파일을 싣는다 — 고객이 구간(cust)마다 이 목록 안에서 곡을 듣고 고른다(목록은 스튜디오가 정한다 · 올리기 · 직접 곡은 입장만).
//   고른 곡 = S.bgm[구간] = { k: 곡 번호 f('B05' 꼴 · 옛 'M2_1' 꼴은 «고르지 않음»으로 읽는다 [BGM_FIX_1030]) } · 축사 · 편지는 S.bgm.S5 · S6 = { m: 'bed', k } · 당일 콘솔은 그 곡을 구간 기본으로 쓴다(이 기기에서 고른 것이 있으면 그것이 먼저).
//   ★곡 파일 주소는 싣지 않는다 — 곡 이름 · 정보 · 번호만(파일은 드라이브 «ME_구간곡» · 로그인한 두 분에게만 서버가 앞부분을 건넨다).
// ★음원 파일은 저장소에 두지 않는다(곡 이름 · 정보만 · 저장소가 공개라서다). 파일은 콘솔에서 그 기기에 넣는다.
// start = 시작 · 강조 위치(초) — 모르면 null(축배 M7 은 리허설에서 정한다 · 콘솔 «강조 시작» 칸)
//
// 구간(SEGS) = 사장님 결정 «8구간»(BGM 섹션 라운드 2) — 엔진 순간(k) → 콘솔 곡
//   sub = 그 구간 안의 하위 칸(그 순간만 바꿨다가 끝나면 구간 곡으로 돌아간다) · multi = 여러 곡을 이어 트는 목록(반복) · last = 목록 끝 «마지막 곡» 한 칸
//   entry = 입장 곡(S.mu · 입장 음악 칸) 그대로 — 목록을 두지 않는다
//
// 브라우저(콘솔 · 식순 화면): <script src="/assets/bgm-picks.js"></script> → window.BgmPicks
(function (root, factory) {
  var O = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = O;
  if (root) root.BgmPicks = O;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  /* ★★[BGM_FIX_1030 2026-10-30 BGM 섹션 · GPT(Ultra) 두 라운드 합의 · 사장님 «최선인지 판단해서 반영해 봐»] 곡 표 — 이 표가 최종(10/23 목록 31곡은 버렸다)
     f = 곡 번호(곡마다 하나 · 같은 번호 = 같은 파일) · vocal = 가사가 있는 곡(고객 화면 «노래» · 깔릴 때 PARAM.vocalExtra 만큼 더 낮게) */
  var SONGS = {
    B01: { t: '바다가 보이는 마을', src: '마녀 배달부 키키', a: '히사이시 조 · 런던 심포니 오케스트라', v: '히사이시 조 에센셜 앨범', why: '오케스트라로 넓고 산뜻하게' },   // [PICKS_TRUE_1031] 받은 판 = 오케스트라(재즈 트리오 아님)
    B02: { t: 'Day and Age', a: 'Julian Lage', v: "World's Fair", why: '맑은 기타 한 대' },   /* [PICKS_THREE_1101] 구간 목록에서 뺐다(데이터만 둔다) */
    B03: { t: 'August 10', a: 'Khruangbin', v: 'Con Todo El Mundo', why: '느긋하고 따뜻하게' },   /* [PICKS_THREE_1101] 구간 목록에서 뺐다(데이터만 둔다) */
    B04: { t: 'While You Were Sleeping', a: 'Laufey', v: 'Bewitched', why: '나른하고 포근하게', vocal: true },   /* [PICKS_THREE_1101] 구간 목록에서 뺐다(데이터만 둔다) */
    B05: { t: '인생의 회전목마', src: '하울의 움직이는 성', a: '히사이시 조', v: "Piano Stories Best '88–'08 (Piano Solo Ver.)", why: '익숙하고 우아한 왈츠' },
    B06: { t: 'Photograph', a: 'Cody Fry', v: 'Photograph · 연주판(Instrumental)', why: '현악이 감싸듯 따뜻하게' },   /* [PICKS_THREE_1101] 구간 목록에서 뺐다(데이터만 둔다) */
    B07: { t: 'Summer', src: '기쿠지로의 여름', a: '피아노 연주', v: '세상에서 가장 아름다운 선율', why: '밝고 경쾌하게' },   // [PICKS_TRUE_1031] 받은 판 = 피아노 판
    // B08 은 비운다(2026-10-30 덧붙임 2 · Laufey «Nocturne (Interlude)» 1분 40초 — 화촉 2분 10초보다 짧다) · 이 번호는 다시 쓰지 않는다
    B09: { t: 'Innocent in Sonatine', src: '우리들의 블루스', a: '조영민', v: '우리들의 블루스 OST', why: '말 아래 조용히' },
    B10: { t: 'Song for Sienna', a: 'Brian Crain', v: 'Piano and Light · 피아노 독주', why: '잔잔한 피아노' },   // [PICKS_TRUE_1031] 받은 판 = Solo Piano Version
    B11: { t: "One Summer's Day", src: '센과 치히로의 행방불명', a: '히사이시 조', v: 'ENCORE', why: '그리운 마음으로' },
    B12: { t: 'Under the Willow', a: 'Brian Crain', v: 'Piano and Light', why: '부드럽고 담백하게' },
    B13: { t: 'Moon River', src: '티파니에서 아침을', a: 'Tommy Emmanuel', v: 'The Guitar Mastery of Tommy Emmanuel · 연주판(Instrumental)', why: '익숙한 선율을 기타로' },
    B14: { t: 'Softness and Light', a: 'Brian Crain', v: 'Piano and Light', why: '빛처럼 고요하게' },
    B15: { t: 'Butterfly Waltz', a: 'Brian Crain', v: '피아노', why: '감싸 안듯 다정하게' },   // [PICKS_TRUE_1031] 받은 판 = 피아노 독주(바이올린 듀엣 아님)
    B16: { t: 'The Rose', src: '추억은 방울방울', a: 'Kazumi Tateishi Trio', v: 'STUDIO GHIBLI meets JAZZ BEST', why: '서정적인 재즈 피아노' },   // [PICKS_TRUE_1031] 받은 판
    B17: { t: 'Summer Montage / Madeline', src: '라라랜드', a: 'Justin Hurwitz', v: 'La La Land OST', why: '박수와 함께 힘 있게' },
    B18: { t: 'I Hear a Symphony', a: 'Cody Fry', v: '싱글 · 연주판(Instrumental)', why: '화사하게 차오르게' },   /* [PICKS_THREE_1101] 구간 목록에서 뺐다(데이터만 둔다) */
    B19: { t: 'Italian Summer', a: 'Brian Crain & Rita Chepurchenko', v: 'Piano and Violin Duet', why: '여름처럼 환하게' },
    B20: { t: 'Popcorn', a: '도경수', v: '성장', why: '톡톡 튀는 설렘', vocal: true },
    B21: { t: "Herman's Habit", src: '라라랜드', a: 'Justin Hurwitz', v: 'La La Land OST', why: '신나는 빅밴드 재즈' },   /* [PICKS_THREE_1101] 구간 목록에서 뺐다(데이터만 둔다) */
    B22: { t: 'This Will Be (An Everlasting Love)', a: 'Natalie Cole', v: 'Best Of Natalie Cole', why: '누구나 아는 흥', vocal: true },   // [PICKS_TRUE_1031] 받은 판
    B23: { t: '둘의 대화', a: '윤석철트리오', v: 'SONGBOOK', why: '대화를 덮지 않는 재즈' },
    B24: { t: 'Take Me Home, Country Roads', src: '귀를 기울이면', a: 'Kazumi Tateishi Trio', v: 'STUDIO GHIBLI meets JAZZ BEST', why: '편안한 재즈 피아노' },   // [PICKS_TRUE_1031] 받은 판
    B25: { t: 'Nothing', a: 'Bruno Major', v: 'To Let a Good Thing Die', why: '나지막하고 다정하게', vocal: true },   /* [PICKS_THREE_1101] 구간 목록에서 뺐다(데이터만 둔다) */
    B26: { t: 'Bluebird', a: 'Alexis Ffrench', v: 'Evolution', why: '하루를 닫는 피아노' },
    B27: { t: 'At the Ivy Gate', a: 'Brian Crain', v: 'Piano and Light', why: '차분하게 마무리' },
    /* [BGM_FIX_1030 덧붙임 2] 축배는 «위하여» 뒤 크게 트는 자리 — 첫 소절부터 다 아는 밝은 팝(웨딩 BGM 자료 · 축배 · 퇴장은 밝은 팝이 압도적) · 화촉은 부모님 세대도 아는 드라마 OST */
    B28: { t: 'Happy', a: 'Pharrell Williams', v: 'G I R L · 원곡', why: '다 같이 손뼉 치게', vocal: true },
    B29: { t: 'Best Day Of My Life', a: 'American Authors', v: 'Oh, What a Life', why: '하루를 축하하듯 신나게', vocal: true },
    B30: { t: '꽃바람 부는 길', src: '성균관 스캔들', a: '', v: '성균관 스캔들 OST · 연주곡', why: '단아하게 · 천천히 걷는 걸음' },   /* [BGM_FIX_1030] «어머님 걸음» → 화촉은 «두 분이 부탁한 분들»이 밝힌다(식순 화면) · 어머님으로 못 박지 않는다 */   /* [GHIBLI_ADD_1101] 구간 목록에서 뺐다(데이터만 둔다) */
    /* ★[GHIBLI_ADD_1101 2026-11-01 사장님 «지브리 음악은 좀 더 추가했으면 좋겠어» · GPT 와 판 고름] 지브리 4곡 — 드라이브 ME_구간곡 B31_ ~ B34_(−23 LUFS · 끝 무음 자름 · 짧은 곡은 겹쳐 이어 7 ~ 9분) */
    B31: { t: '언제나 몇 번이라도', src: '센과 치히로의 행방불명', a: 'Elizabeth Bright', v: 'Piano Ghibli', why: '단정한 피아노' },
    B32: { t: '너를 태우고', src: '천공의 성 라퓨타', a: 'Elizabeth Bright', v: 'Piano Ghibli', why: '차분한 여운' },
    B33: { t: '바람이 지나가는 길', src: '이웃집 토토로', a: 'Kazumi Tateishi Trio', v: 'GHIBLI meets JAZZ ~Beautiful Songs~', why: '산들바람 같은 재즈 피아노' },
    B34: { t: '산책', src: '이웃집 토토로', a: 'Kazumi Tateishi Trio', v: 'GHIBLI meets JAZZ ~Memorable Songs~', why: '경쾌한 재즈 피아노' }
  };
  /* 구간 → 곡 번호(위가 1순위 · 2026-10-30 표 그대로) */
  /* ★★[PICKS_THREE_1101 사장님 «구간마다 노래를 3개로 추리고 너무 힙한 건 공감 못 하니 빼자» · GPT 확인 «없음»] 구간마다 3곡(위가 1순위) —
       목록에서 뺀 곡: B02 · B03 · B04 · B06 · B18 · B21 · B25(SONGS 데이터는 그대로 둔다 · 예전에 고른 저장값은 custK 가 «고르지 않음 = 1순위»로 읽는다) */
  /* ★[GHIBLI_ADD_1101] 지브리 4곡을 넣은 판 — 화촉 · 부모님께 인사 · 닫는 인사 · 마지막 곡을 바꿨다(B30 · B20 · B26 은 목록에서 빠지고 데이터만 남는다) */
  var PICKS = {
    M1: ['B01', 'B24', 'B13'],     // 하객 맞이 — 바다가 보이는 마을 · Country Roads · Moon River(반복 목록 · 뒤에 FILL)
    M2: ['B05', 'B31', 'B07'],     // 화촉
    M4: ['B09', 'B10', 'B11'],     // 감사 인사 ~ 덕담
    M4S5: ['B13', 'B14', 'B12'],   // 축사 «음악과 함께»
    M4S6: ['B10', 'B12', 'B14'],   // 편지 «음악과 함께»
    M5: ['B15', 'B31', 'B16'],     // 부모님께 인사
    M6: ['B17', 'B34', 'B19'],     // 닫는 인사 → 사진(한 곡이 사진까지 잇는다)
    M6P: [],                       // 사진 칸은 비운다 — 닫는 인사 곡이 이어진다(콘솔에서 «곡 추가»로 그 기기에만 넣을 수는 있다)
    M7: ['B28', 'B29', 'B22'],     // 축배 · start = 강조 위치(콘솔 «강조 시작») · 보컬 1순위 허용(GO 뒤에 시작해 나레이션 위로 크게 나오지 않는다)
    M8: ['B24', 'B23', 'B16'],     // 테이블 인사(반복 목록 · 뒤에 FILL)
    M8L: ['B32', 'B11', 'B27']     // 마지막 곡
  };
  /* ★★[BGM_FILL_1101 2026-11-01 사장님 «하객 맞이 음악은 계속 흐르는 건가? 한 곡만으로는 힘들지 않아?»] 목록 칸(multi · M1 · M8)은 30분을 채운다 —
       고객이 고르는 곡은 3곡 그대로 · 당일 콘솔이 트는 차례 끝에 «배경으로만 이어 트는 곡»(fill)을 붙인다(고객 화면 곡 줄 · 곡 카드 · 미리 듣기에는 없다 · 순서 줄에는 보인다)
       차례 = 고른 곡(없으면 1순위) → 그 구간 나머지 → fill · 한 바퀴 뒤 처음으로 · ★[GHIBLI_ADD_1101] fill 이 다른 구간에서 두 분이 고른 곡이면 건너뛴다(겹쳐 들리지 않게) */
  var FILL = { M1: ['B16', 'B33'], M8: ['B13', 'B14'], M6: ['B07', 'B16'] };   /* ★[DAYLONG_1101] 닫는 인사 → 사진(약 15분) 뒤에 이어 트는 곡 */
  /* 본식 차례(«앞 구간» · 같은 곡 두 구간 한 줄) — 테이블 인사 → 축배 → 닫는 인사(END_FLOW_1030) */
  var CORDER = ['M1', 'M2', 'M4', 'M4S5', 'M4S6', 'M5', 'M8', 'M7', 'M6'];

  /* 구간 — 콘솔 «구간 음악» 칸의 차례 · ks = 이 구간 곡이 흐르는 엔진 순간
     ★[BGM_PREVIEW_1024] cust = 고객이 식순 화면에서 고르는 구간(그 구간의 첫 담긴 순간 쪽 «고르기» 칸에 «‹순간› 음악» 줄 하나) · slot = 축사 · 편지 «음악과 함께» 아래 곡 고르기(S.bgm.S5 · S6) ·
       M3(입장 곡) · M6P(사진) · M8L(마지막 곡)은 고객이 고르지 않는다(스튜디오가 정한다) */
  var SEGS = [
    { id: 'M1', nm: '하객 맞이', ks: ['guest'], multi: true, cust: true, need: '30분 이상 · 개식이 늦어도 이어지게(반복 목록)' },
    { id: 'M2', nm: '화촉', ks: ['candle'], cust: true, need: '2분 10초 이상' },
    { id: 'M3', nm: '입장 → 맞절', ks: ['entry', 'matjeol'], entry: true, need: '입장 음악 칸(두 분 · 스튜디오가 고른 곡) 그대로' },
    { id: 'M4', nm: '감사 인사 ~ 덕담', ks: ['welcome', 'vow', 'ring', 'declare', 'bless', 'free', 'letter'], cust: true, loop: true, need: '6분 이상 · 반복 편집본' },
    { id: 'M4S5', nm: '축사 «음악과 함께»', parent: 'M4', sub: 'S5', slot: 'S5', ks: ['free'], need: '4분 이상 · 두 분이 «음악과 함께»를 고른 날만' },
    { id: 'M4S6', nm: '편지 «음악과 함께»', parent: 'M4', sub: 'S6', slot: 'S6', ks: ['letter'], need: '5분 30초 이상 · 두 분이 «음악과 함께»를 고른 날만' },
    { id: 'M5', nm: '부모님께 인사', ks: ['tribute'], cust: true, need: '5분 이상' },
    { id: 'M6', nm: '닫는 인사', ks: ['_close'], cust: true, loop: true, need: '신호 1 ~ 2분' },
    { id: 'M6P', nm: '닫는 인사 뒤 단체 사진', parent: 'M6', need: '약 10분 · 비우면 닫는 인사 곡이 이어진다' },
    { id: 'M7', nm: '축배', ks: ['toast'], cust: true, need: '1 ~ 1.5분 · 강조 시작 위치(초)' },
    { id: 'M8', nm: '테이블 인사 이후', ks: ['table'], multi: true, cust: true, need: '30분 목록' },
    { id: 'M8L', nm: '마지막 곡', parent: 'M8', last: true, need: '마무리 인사(47)와 함께 시작' }
  ];
  /* ★★[DAYLONG_1101 2026-11-01 사장님 «한 곡이 너무 오래 반복돼» · 감사 인사 ~ 덕담 약 18분 · 닫는 인사 → 사진 약 15분] loop = 고르는 칸 그대로(3곡 · «바꾸기») · 당일은 이어 트는 목록 —
       차례 = 고른 곡(없으면 1순위) → 나머지 → (닫는 인사만) fill → 한 바퀴 뒤 처음으로 · fill 건너뛰기 · 앞 곡 잇기(CARRY_SAME) 그대로 · 축사 · 편지 «음악과 함께»(M4S5 · M4S6)는 한 곡 그대로 */
  var BY = {}; SEGS.forEach(function (s) { BY[s.id] = s; });
  function loopy(seg) { var d = BY[seg]; return !!(d && (d.multi || d.loop)); }   /* 이어 트는 목록 칸(고르지 않는 M1 · M8 + 고르는 M4 · M6) */
  /* 곡 아이디 — [BGM_FIX_1030] 곡 번호 그대로(같은 곡은 어느 구간에서나 같은 아이디 · 콘솔이 그 기기에 넣은 파일을 구간마다 다시 넣지 않는다) ·
     번호가 없는 곡(콘솔 «곡 추가»는 own: 아이디를 따로 쓴다)만 옛 꼴(구간 · 곡 · 연주자) */
  function idOf(seg, p) { if (p && p.f) return p.f; return seg + ':' + String(p.t || '').toLowerCase().replace(/\s+/g, ' ').trim() + '|' + String(p.a || '').toLowerCase().trim(); }
  function song(f) { var s = SONGS[f]; if (!s) return null; return { id: f, f: f, t: s.t, a: s.a || '', src: s.src || '', v: s.v || '', start: s.start == null ? null : +s.start, why: s.why || '', vocal: !!s.vocal }; }   /* src = 아는 영화 · 드라마(고객 화면 아랫줄 맨 앞 · 덧붙임 4) */
  function list(seg) { return (PICKS[seg] || []).map(function (f, i) { var o = song(f); if (!o) return null; o.rank = i + 1; return o; }).filter(Boolean); }
  /* [BGM_FIX_1030] 곡 번호(f) — 'B05' 꼴(곡마다 하나) · 옛 구간 번호('M2_1')는 이 꼴이 아니라 «고르지 않음»으로 읽힌다 */
  var F_RE = /^B\d{2,3}$/;
  function byF(f) { f = String(f || '').toUpperCase(); return F_RE.test(f) ? song(f) : null; }
  /* 고객이 고른 곡 번호 — 구간(M1 …)은 S.bgm[구간].k · 축사 · 편지 하위 칸(M4S5 · M4S6)은 S.bgm.S5 · S6 의 k(«음악과 함께»일 때만) · 그 구간 목록에 없으면 ''(1순위로 준비) */
  /* ★★[LIST_NO_PICK_1101 2026-11-01 사장님 «이러면 굳이 곡을 안 골라도 되잖아»] 목록 칸(multi · 하객 맞이 M1 · 테이블 인사 M8)은 고르지 않는다 — 다섯 곡이 다 흐르고 고르면 시작 곡만 바뀌었다 ·
       S.bgm.M1 · M8 의 k 는 쓰지 않는다(옛 저장값이 있어도 '' · 차례는 1순위부터 고정 · fill 과 다른 구간 곡 빼기는 그대로) · 되살리지 말 것 */
  function custK(S, seg) { var d = BY[seg]; if (!d || d.multi || !S || !S.bgm) return ''; var v = S.bgm[d.slot || seg];
    if (!v || typeof v !== 'object') return ''; if (d.slot && v.m !== 'bed') return ''; var k = String(v.k || '');
    return (PICKS[seg] || []).indexOf(k) > -1 ? k : ''; }
  /* ★[BGM_FILL_1101] 곡 차례 한 곳 — 당일 콘솔 segSel(목록 칸 기본 · 한 곡 칸의 «파일 있는 다음 곡») · 식순 화면 M1 · M8 순서 줄이 이 함수 하나를 쓴다
       order(S, 구간) = [고른 곡(없으면 1순위), 그 구간 나머지, (목록 칸이면) fill 중 다른 구간에서 고른 곡이 아닌 것] · 곡 번호 배열 · 중복 없음 */
  function chosenBy(S, seg, on) { var o = {}; CORDER.forEach(function (s) { if (s === seg || (on && !on(s))) return; var k = custK(S, s); if (k && !o[k]) o[k] = s; }); return o; }   /* [DETAIL_R3_1101 ⑧] on = 담긴 구간만(뺀 순간의 옛 선택은 세지 않는다) */
  /* ★★[CARRY_SAME_1101 2026-11-01 사장님 «음악이 연달아 있으면 그냥 그 곡으로 이어서 가는 게 좋지 않아?»] 바로 앞 순간에 흐르던 곡(prev)이 이 구간 목록(3곡 · 목록 칸이면 fill 까지)에 있으면 그 곡을 그대로 잇는다 —
       한 곡 칸 = 두 분이 이 구간에서 다른 곡을 골랐으면 고른 곡이 이긴다(3초 겹쳐 넘김) · 목록 칸 = 그 곡을 맨 앞에 · 나머지는 원래 차례 ·
       바로 앞에서 이어 온 곡은 fill 에서 빼지 않는다(이어지지 않는 구간에서 고른 곡은 종전대로 뺀다) · prev 를 정하는 쪽: 식순 화면 = 앞 순간 구간의 곡(목록 칸이면 모른다 · '') · 당일 콘솔 = 지금 흐르는 곡 */
  function inList(seg, f) { var d = BY[seg]; return !!f && ((PICKS[seg] || []).indexOf(f) > -1 || (loopy(seg) && (FILL[seg] || []).indexOf(f) > -1)); }
  function carryOf(S, seg, prev) { prev = String(prev || '').toUpperCase(); if (!inList(seg, prev)) return ''; var k = custK(S, seg); return (k && k !== prev) ? '' : prev; }
  function order(S, seg, prev, on) { var L = PICKS[seg] || [], k = custK(S, seg), c = carryOf(S, seg, prev), out = [], add = function (f) { if (f && SONGS[f] && out.indexOf(f) < 0) out.push(f); };
    add(c || k || L[0]); L.forEach(add); if (loopy(seg)) { var el = chosenBy(S, seg, on); (FILL[seg] || []).forEach(function (f) { if (!el[f] || f === c) add(f); }); }
    return out; }
  /* ★[DETAIL_R4_1101 ⑧] 앞 곡이 잇는 자리(축배 나레이션 · 닫는 인사 첫 줄)에서 «음악과 함께» 곡(M4S5 · M4S6)이 흐르면 본식 곡 M4 로 — 판단은 «지금 실제로 흐르는 구간»(곡 번호 아님) · 당일 콘솔 segOfCue · 미리 듣기 carry 가 같이 쓴다 */
  function backSeg(seg) { return /^M4S[56]$/.test(String(seg || '')) ? 'M4' : ''; }
  /* ★[GHIBLI_ADD_1101] 같은 곡을 두 구간에서 골랐으면 뒤 구간 → 앞 구간 번호(본식 차례) · 아니면 '' — 막지는 않는다(식순 화면 곡 칸 아래 한 줄) */
  function dupSeg(S, seg, on) { var k = custK(S, seg), i = CORDER.indexOf(seg); if (!k || i < 0) return ''; for (var j = 0; j < i; j++) { if (on && !on(CORDER[j])) continue; if (custK(S, CORDER[j]) === k) return CORDER[j]; } return ''; }   /* [DETAIL_R3_1101 ⑧] 담긴 구간만 */
  /* ★★[DETAIL_R5_1101 규칙 1 · DETAIL_R3_1101 ⑦ ⑧ · 보탬 2] 곡 계획 한 곳 — 식순 화면 · 미리 듣기 · 당일 콘솔이 이 결과를 쓴다(고객이 저장한 S.bgm 은 바꾸지 않는다)
       순서: ① 담긴 순간의 구간만(o.on) ② 실제로 틀 수 있는 곡(o.have · 파일이 없으면 그 구간 목록의 다음 곡 = 대체곡) ③ 이어짐(CARRY_SAME · o.prev) · 중복 셈 ④ 표시
       · 한 곡 칸 = 이어받기 < 고객이 고른 곡 · 고르지 않았으면 앞 곡 이어받기 → 1순위 · 실제로 쓰일 곡(기본곡 포함)은 «예약»
       · 목록 칸(하객 맞이 · 테이블 · 감사 인사 ~ 덕담 · 닫는 인사 · fill 포함) = 예약된 곡과 앞 목록에 나온 곡을 뺀다 — 이어진 곡(carry)은 한 번 들은 걸로 친다
         · 빼서 목록 합이 필요한 길이(NEED · 처리된 전체 파일 길이 o.dur · 모르면 곡당 LEN0 초) 밑으로 내려가면 빼지 않고 맨 뒤로(먼저 들은 때와 가장 멀리)
       · dup = 앞 담긴 한 곡 칸과 같은 곡(실제 소리 기준) — 화면 «…에서도 고른 곡이에요» 한 줄 */
  var NEED = { M1: 1800, M8: 1800, M4: 1080, M6: 900 }, LEN0 = 240;
  function plan(S, o) {
    o = o || {}; var on = o.on || function () { return true; }, have = o.have || function () { return true; }, dur = o.dur || function () { return 0; }, prevOf = o.prev || function () { return ''; };
    var R = {}, rsv = {}, firstBy = {}, segs = CORDER.filter(function (sg) { return on(sg); });
    var pick1 = function (sg, want) { var L = PICKS[sg] || []; if (!want) return ''; if (have(want)) return want; var i = L.indexOf(want), c = i < 0 ? L : L.slice(i + 1).concat(L.slice(0, i)); for (var j = 0; j < c.length; j++) { if (have(c[j])) return c[j]; } return ''; };
    var prevF = function (sg) { var p = prevOf(sg); if (!p || !R[p] || loopy(p)) return ''; return R[p].first || ''; };
    segs.forEach(function (sg) { if (loopy(sg)) return; var k = custK(S, sg), c = carryOf(S, sg, prevF(sg)), want = c || k || (PICKS[sg] || [])[0] || '', f = pick1(sg, want);
      var dup = ''; if (f && firstBy[f] && firstBy[f] !== sg && !c) dup = firstBy[f]; if (f && !firstBy[f]) firstBy[f] = sg;
      R[sg] = { seg: sg, want: want, first: f, pick: k, carry: c, list: f ? [f] : [], dup: dup }; if (f) rsv[f] = rsv[f] || sg; });
    var seen = {};
    segs.forEach(function (sg) { if (!loopy(sg)) return; var k = custK(S, sg), c = carryOf(S, sg, prevF(sg)), base = order(S, sg, c || '', function () { return false; }), L = base.filter(function (f) { return have(f); });
      var lenOf = function (a) { return a.reduce(function (t, f) { var d = +dur(f); return t + (d > 0 ? d : LEN0); }, 0); }, need = NEED[sg] || 0, keep = [], back = [];
      /* [DETAIL_R3_1101 ⑦ 보탬] 앞 칸에서 고른 배경 곡(fill)도 «빼기»가 아니라 같은 셈(예약 · 들은 곡)으로 — 빼면 모자랄 때 맨 뒤로(order 의 fill 빼기는 여기서 쓰지 않는다) */
      L.forEach(function (f) { var taken = (f !== c) && ((rsv[f] && rsv[f] !== sg) || seen[f]); if (taken) back.push(f); else keep.push(f); });
      var out = keep.slice(); back.forEach(function (f) { if (lenOf(out) < need) out.push(f); });   /* 빼서 모자라면 맨 뒤로 · 모자라지 않으면 뺀다 */
      if (!out.length && L.length) out = L.slice();
      out.forEach(function (f) { seen[f] = 1; });
      R[sg] = { seg: sg, want: c || k || base[0] || '', first: out[0] || '', pick: k, carry: c, list: out, dup: '' }; });
    return R; }
  return { SONGS: SONGS, PICKS: PICKS, FILL: FILL, CORDER: CORDER, SEGS: SEGS, song: song, seg: function (id) { return BY[id] || null; }, list: list, idOf: idOf, byF: byF, custK: custK, order: order, carryOf: carryOf, loopy: loopy, dupSeg: dupSeg, backSeg: backSeg, F_RE: F_RE, plan: plan, NEED: NEED, LEN0: LEN0 };
});
