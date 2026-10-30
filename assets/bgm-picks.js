// 모먼트에딧 · 당일 콘솔 «구간 음악» 추천 곡 목록  [BGM_PICKS_1023 2026-10-23]
//
// ★곡 더하는 법 [BGM_FIX_1030 2026-10-30 · 곡 번호 = 곡마다 하나]
//   1. 아래 SONGS 맨 끝에 한 줄 더한다: B28: { t: '곡', a: '연주자', v: '판(앨범)', why: '한 줄(분위기만)' },   보컬이면 vocal: true
//      번호 = 다음 빈 번호(B28 · B29 …) — 한 번 정하면 바꾸지 않는다(구간 차례를 바꿔도 그대로).
//   2. PICKS 의 그 구간 배열에 번호를 넣는다(위가 1순위 · 보컬 곡은 1순위에 두지 않는다 — bgm-preview 검사가 잡는다).
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
    B01: { t: '바다가 보이는 마을 (A Town With An Ocean View)', a: 'Kazumi Tateishi Trio', v: 'GHIBLI meets JAZZ ~Beautiful Songs~', why: '산뜻한 재즈 피아노' },
    B02: { t: 'Day and Age', a: 'Julian Lage', v: "World's Fair", why: '맑은 기타 한 대' },
    B03: { t: 'August 10', a: 'Khruangbin', v: 'Con Todo El Mundo', why: '느긋하고 따뜻하게' },
    B04: { t: 'While You Were Sleeping', a: 'Laufey', v: 'Bewitched', why: '나른하고 포근하게', vocal: true },
    B05: { t: '인생의 회전목마', a: '久石譲', v: "Piano Stories Best '88–'08 (Piano Solo Ver.)", why: '익숙하고 우아한 왈츠' },
    B06: { t: 'Photograph (Instrumental)', a: 'Cody Fry', v: 'Photograph', why: '현악이 감싸듯 따뜻하게' },
    B07: { t: 'Summer', a: '久石譲', v: 'ENCORE', why: '밝고 경쾌하게' },
    B08: { t: 'Nocturne (Interlude)', a: 'Laufey', v: 'Bewitched', why: '고요하고 깊게' },
    B09: { t: 'Innocent in Sonatine', a: '조영민', v: '우리들의 블루스 OST', why: '말 아래 조용히' },
    B10: { t: 'Song for Sienna', a: 'Brian Crain', v: 'Piano and Light', why: '잔잔한 피아노' },
    B11: { t: "One Summer's Day", a: '久石譲', v: 'ENCORE', why: '그리운 마음으로' },
    B12: { t: 'Under the Willow', a: 'Brian Crain', v: 'Piano and Light', why: '부드럽고 담백하게' },
    B13: { t: 'Moon River (Instrumental)', a: 'Tommy Emmanuel', v: 'The Guitar Mastery of Tommy Emmanuel', why: '익숙한 선율을 기타로' },
    B14: { t: 'Softness and Light', a: 'Brian Crain', v: 'Piano and Light', why: '빛처럼 고요하게' },
    B15: { t: 'Butterfly Waltz', a: 'Brian Crain & Rita Chepurchenko', v: 'Piano and Violin Duet', why: '감싸 안듯 다정하게' },
    B16: { t: 'The Rose', a: 'Kazumi Tateishi Trio', v: 'GHIBLI meets JAZZ ~Beautiful Songs~', why: '서정적인 재즈 피아노' },
    B17: { t: 'Summer Montage / Madeline', a: 'Justin Hurwitz', v: 'La La Land OST', why: '박수와 함께 힘 있게' },
    B18: { t: 'I Hear a Symphony (Instrumental)', a: 'Cody Fry', v: '싱글', why: '화사하게 차오르게' },
    B19: { t: 'Italian Summer', a: 'Brian Crain & Rita Chepurchenko', v: 'Piano and Violin Duet', why: '여름처럼 환하게' },
    B20: { t: 'Popcorn', a: '도경수', v: '성장', why: '톡톡 튀는 설렘', vocal: true },
    B21: { t: "Herman's Habit", a: 'Justin Hurwitz', v: 'La La Land OST', why: '신나는 빅밴드 재즈' },
    B22: { t: 'This Will Be (An Everlasting Love)', a: 'Natalie Cole', v: 'Inseparable', why: '누구나 아는 흥', vocal: true },
    B23: { t: '둘의 대화', a: '윤석철트리오', v: 'SONGBOOK', why: '대화를 덮지 않는 재즈' },
    B24: { t: 'Take Me Home, Country Roads', a: 'Kazumi Tateishi Trio', v: 'GHIBLI meets JAZZ ~Beautiful Songs~', why: '편안한 재즈 피아노' },
    B25: { t: 'Nothing', a: 'Bruno Major', v: 'To Let a Good Thing Die', why: '나지막하고 다정하게', vocal: true },
    B26: { t: 'Bluebird', a: 'Alexis Ffrench', v: 'Evolution', why: '하루를 닫는 피아노' },
    B27: { t: 'At the Ivy Gate', a: 'Brian Crain', v: 'Piano and Light', why: '차분하게 마무리' }
  };
  /* 구간 → 곡 번호(위가 1순위 · 2026-10-30 표 그대로) */
  var PICKS = {
    M1: ['B01', 'B02', 'B03', 'B04'],     // 하객 맞이 — 30분 이상 목록(반복)
    M2: ['B05', 'B06', 'B07', 'B08'],     // 화촉
    M4: ['B09', 'B10', 'B11', 'B12'],     // 감사 인사 ~ 덕담
    M4S5: ['B13', 'B14', 'B02', 'B08'],   // 축사 «음악과 함께»
    M4S6: ['B10', 'B12', 'B14', 'B13'],   // 편지 «음악과 함께»
    M5: ['B15', 'B06', 'B16', 'B11'],     // 부모님께 인사
    M6: ['B17', 'B18', 'B19', 'B20'],     // 닫는 인사 → 사진(한 곡이 사진까지 잇는다)
    M6P: [],                              // 사진 칸은 비운다 — 닫는 인사 곡이 이어진다(콘솔에서 «곡 추가»로 그 기기에만 넣을 수는 있다)
    M7: ['B21', 'B18', 'B07', 'B22'],     // 축배 · start = 강조 위치(콘솔 «강조 시작»)
    M8: ['B23', 'B03', 'B24', 'B25'],     // 테이블 인사 — 30분 목록
    M8L: ['B26', 'B19', 'B27', 'B25']     // 마지막 곡
  };

  /* 구간 — 콘솔 «구간 음악» 칸의 차례 · ks = 이 구간 곡이 흐르는 엔진 순간
     ★[BGM_PREVIEW_1024] cust = 고객이 식순 화면에서 고르는 구간(그 구간의 첫 담긴 순간 쪽 «고르기» 칸에 «‹순간› 음악» 줄 하나) · slot = 축사 · 편지 «음악과 함께» 아래 곡 고르기(S.bgm.S5 · S6) ·
       M3(입장 곡) · M6P(사진) · M8L(마지막 곡)은 고객이 고르지 않는다(스튜디오가 정한다) */
  var SEGS = [
    { id: 'M1', nm: '하객 맞이', ks: ['guest'], multi: true, cust: true, need: '30분 이상 · 개식이 늦어도 이어지게(반복 목록)' },
    { id: 'M2', nm: '화촉', ks: ['candle'], cust: true, need: '2분 10초 이상' },
    { id: 'M3', nm: '입장 → 맞절', ks: ['entry', 'matjeol'], entry: true, need: '입장 음악 칸(두 분 · 스튜디오가 고른 곡) 그대로' },
    { id: 'M4', nm: '감사 인사 ~ 덕담', ks: ['welcome', 'vow', 'ring', 'declare', 'bless', 'free', 'letter'], cust: true, need: '6분 이상 · 반복 편집본' },
    { id: 'M4S5', nm: '축사 «음악과 함께»', parent: 'M4', sub: 'S5', slot: 'S5', ks: ['free'], need: '4분 이상 · 두 분이 «음악과 함께»를 고른 날만' },
    { id: 'M4S6', nm: '편지 «음악과 함께»', parent: 'M4', sub: 'S6', slot: 'S6', ks: ['letter'], need: '5분 30초 이상 · 두 분이 «음악과 함께»를 고른 날만' },
    { id: 'M5', nm: '부모님께 인사', ks: ['tribute'], cust: true, need: '5분 이상' },
    { id: 'M6', nm: '닫는 인사', ks: ['_close'], cust: true, need: '신호 1 ~ 2분' },
    { id: 'M6P', nm: '닫는 인사 뒤 단체 사진', parent: 'M6', need: '약 10분 · 비우면 닫는 인사 곡이 이어진다' },
    { id: 'M7', nm: '축배', ks: ['toast'], cust: true, need: '1 ~ 1.5분 · 강조 시작 위치(초)' },
    { id: 'M8', nm: '테이블 인사 이후', ks: ['table'], multi: true, cust: true, need: '30분 목록' },
    { id: 'M8L', nm: '마지막 곡', parent: 'M8', last: true, need: '마무리 인사(47)와 함께 시작' }
  ];
  var BY = {}; SEGS.forEach(function (s) { BY[s.id] = s; });
  /* 곡 아이디 — [BGM_FIX_1030] 곡 번호 그대로(같은 곡은 어느 구간에서나 같은 아이디 · 콘솔이 그 기기에 넣은 파일을 구간마다 다시 넣지 않는다) ·
     번호가 없는 곡(콘솔 «곡 추가»는 own: 아이디를 따로 쓴다)만 옛 꼴(구간 · 곡 · 연주자) */
  function idOf(seg, p) { if (p && p.f) return p.f; return seg + ':' + String(p.t || '').toLowerCase().replace(/\s+/g, ' ').trim() + '|' + String(p.a || '').toLowerCase().trim(); }
  function song(f) { var s = SONGS[f]; if (!s) return null; return { id: f, f: f, t: s.t, a: s.a, v: s.v || '', start: s.start == null ? null : +s.start, why: s.why || '', vocal: !!s.vocal }; }
  function list(seg) { return (PICKS[seg] || []).map(function (f, i) { var o = song(f); if (!o) return null; o.rank = i + 1; return o; }).filter(Boolean); }
  /* [BGM_FIX_1030] 곡 번호(f) — 'B05' 꼴(곡마다 하나) · 옛 구간 번호('M2_1')는 이 꼴이 아니라 «고르지 않음»으로 읽힌다 */
  var F_RE = /^B\d{2,3}$/;
  function byF(f) { f = String(f || '').toUpperCase(); return F_RE.test(f) ? song(f) : null; }
  /* 고객이 고른 곡 번호 — 구간(M1 …)은 S.bgm[구간].k · 축사 · 편지 하위 칸(M4S5 · M4S6)은 S.bgm.S5 · S6 의 k(«음악과 함께»일 때만) · 그 구간 목록에 없으면 ''(1순위로 준비) */
  function custK(S, seg) { var d = BY[seg]; if (!d || !S || !S.bgm) return ''; var v = S.bgm[d.slot || seg];
    if (!v || typeof v !== 'object') return ''; if (d.slot && v.m !== 'bed') return ''; var k = String(v.k || '');
    return (PICKS[seg] || []).indexOf(k) > -1 ? k : ''; }
  return { SONGS: SONGS, PICKS: PICKS, SEGS: SEGS, song: song, seg: function (id) { return BY[id] || null; }, list: list, idOf: idOf, byF: byF, custK: custK, F_RE: F_RE };
});
