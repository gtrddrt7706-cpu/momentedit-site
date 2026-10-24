// 모먼트에딧 · 당일 콘솔 «구간 음악» 추천 곡 목록  [BGM_PICKS_1023 2026-10-23]
//
// ★곡 더하는 법(세 줄)
//   1. 아래 PICKS 에서 그 구간(M1 · M2 …) 배열을 찾는다.
//   2. 한 줄 더한다: { f: 'M2_5', t: '곡', a: '아티스트', v: '판(연주 · 편집)', start: null, why: '한 줄' },   ← 위가 1순위
//      f = 곡 번호(구간_번호 · 그 구간에서 아직 안 쓴 다음 번호) — 한 번 정하면 바꾸지 않는다(차례를 바꿔도 그대로).
//      드라이브 «ME_구간곡» 폴더의 파일 이름이 이 번호로 시작해야 고객 미리 듣기가 그 곡을 찾는다(예: M2_5_곡이름.mp3) [BGM_PREVIEW_1024]
//   3. 저장하면 끝 — 콘솔 «구간 음악» 칸에 바로 보인다(콘솔에서 «곡 추가»로 그 기기에만 더할 수도 있다).
//
// ★사장님 지시(2026-10-23 21:40) «입장곡은 지금 셋팅되어 있으니깐 나머지 이 노래들 우선 고를 수 있게 넣어줘» · «나중에 곡 더 추가할 거야»
//   → BGM 섹션 콘솔 라운드 2 덧붙임.
// ★★[BGM_PREVIEW_1024 2026-10-24 사장님 «고객이 진행하면서 나레이션과 함께 들어볼 수 있게» · «우리가 리스트를 만들면 그 안에서 고객이 ‹이 시간에는 이 노래가 좋겠어› 선택할 수 있게» · 질문 답 «고객이 고름»]
//   이제 식순 화면(order-preview)도 이 파일을 싣는다 — 고객이 구간(cust)마다 이 목록 안에서 곡을 듣고 고른다(목록은 스튜디오가 정한다 · 올리기 · 직접 곡은 입장만).
//   고른 곡 = S.bgm[구간] = { k: 곡 번호 f } · 축사 · 편지는 S.bgm.S5 · S6 = { m: 'bed', k } · 당일 콘솔은 그 곡을 구간 기본으로 쓴다(이 기기에서 고른 것이 있으면 그것이 먼저).
//   ★곡 파일 주소는 싣지 않는다 — 곡 이름 · 정보 · 번호만(파일은 드라이브 «ME_구간곡» · 로그인한 두 분에게만 서버가 앞부분을 건넨다).
// ★음원 파일은 저장소에 두지 않는다(곡 이름 · 정보만 · 저장소가 공개라서다). 파일은 콘솔에서 그 기기에 넣는다.
// start = 시작 · 강조 위치(초) — 모르면 null(축배 M7 은 리허설에서 정한다)
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

  var PICKS = {
    M1: [   // 하객 맞이 — 잔잔한 연주 · 30분 이상 목록
      { f: 'M1_1', t: 'La Vie en Rose', a: 'Louis Armstrong', v: '원곡 · 재즈 피아노 연주', start: null, why: '들어서는 순간 따뜻하게' },
      { f: 'M1_2', t: "Isn't She Lovely", a: 'Ben Paterson', v: '재즈 피아노', start: null, why: '밝지만 말소리를 덮지 않는다' },
      { f: 'M1_3', t: 'Clair de Lune', a: 'Debussy', v: '피아노', start: null, why: '고요하게 자리에 앉는 동안' },
      { f: 'M1_4', t: 'Gymnopédie No. 1', a: 'Satie', v: '피아노', start: null, why: '느리고 담백하게' }
    ],
    M2: [   // 화촉 — 밝고 우아한 곡 · 2분 10초 이상
      { f: 'M2_1', t: 'Potter Waltz', a: 'Patrick Doyle', v: '해리포터와 불의 잔 OST · 오케스트라', start: null, why: '왈츠 걸음 · 밝고 우아하게' },
      { f: 'M2_2', t: '꽃날', a: '황진이 OST', v: '반복 편집본', start: null, why: '단아하게 · 어머님 걸음' },
      { f: 'M2_3', t: '봄바람', a: '버스커버스커', v: '연주 · 피아노 3중주', start: null, why: '가볍고 화사하게' },
      { f: 'M2_4', t: 'Someday My Prince Will Come', a: '백설공주 OST', v: '재즈 피아노', start: null, why: '동화처럼 따뜻하게' }
    ],
    M4: [   // 감사 인사 ~ 덕담 — 피아노 아주 작게 · 6분 이상 반복 편집본
      { f: 'M4_1', t: 'Innocent in Sonatine', a: '우리들의 블루스 OST', v: '피아노', start: null, why: '말 아래 조용히 깔린다' },
      { f: 'M4_2', t: '인생의 회전목마', a: '久石譲', v: '하울의 움직이는 성 OST · 피아노', start: null, why: '익숙하고 부드럽게' },
      { f: 'M4_3', t: '매일 그대와 (Piano)', a: '달콤한꿈', v: '피아노', start: null, why: '서약 · 선언 아래 담백하게' },
      { f: 'M4_4', t: 'When She Loved Me', a: 'Disney String Quartet', v: '토이스토리2 OST · 현악', start: null, why: '현악으로 잔잔하게' }
    ],
    M4S5: [   // M4 안 · 축사 «음악과 함께» — 잔잔한 연주곡 · 4분 이상
      { f: 'M4S5_1', t: '혜화동', a: '응답하라 1988 OST', v: '기타 연주', start: null, why: '오랜 친구의 말 아래' },
      { f: 'M4S5_2', t: '언제나 몇 번이라도', a: '센과 치히로의 행방불명 OST', v: '오르골 · 피아노', start: null, why: '작게 반짝이게' },
      { f: 'M4S5_3', t: 'Moon River', a: 'Henry Mancini', v: '연주', start: null, why: '익숙하고 따뜻하게' }
    ],
    M4S6: [   // M4 안 · 편지 «음악과 함께» — 잔잔한 연주곡 · 5분 30초 이상
      { f: 'M4S6_1', t: '未来へ', a: 'Kiroro', v: '오르골', start: null, why: '편지 목소리를 덮지 않게' },
      { f: 'M4S6_2', t: 'The Rose', a: 'Bette Midler', v: '원곡 · 오르골 / 피아노', start: null, why: '서정적으로' },
      { f: 'M4S6_3', t: '너를 만나 (Piano Ver.)', a: '폴킴', v: '피아노', start: null, why: '두 분의 이야기 아래' }
    ],
    M5: [   // 부모님께 인사 — 밝고 따뜻한 곡 · 5분 이상
      { f: 'M5_1', t: 'I Love Penny Sue', a: 'Daniel May', v: '피아노', start: null, why: '밝고 따뜻하게(슬프지 않게)' },
      { f: 'M5_2', t: 'Butterfly Waltz', a: 'Brian Crain', v: '피아노', start: null, why: '부드럽게 감싸 안듯' },
      { f: 'M5_3', t: '사랑의 인사', a: 'Elgar', v: '현악 · 피아노', start: null, why: '단정하고 다정하게' }
    ],
    M6: [   // 닫는 인사 — 박수와 함께 힘 있는 곡 · 신호 1 ~ 2분
      { f: 'M6_1', t: 'Another Day of Sun', a: '라라랜드 OST', v: '원곡(전주부터)', start: null, why: '박수와 함께 힘 있게' },
      { f: 'M6_2', t: '팡파레', a: '다비치', v: '원곡', start: null, why: '축하의 문을 열듯' }
    ],
    M6P: [   // M6 안 · 단체 사진 동안 — 약 10분
      { f: 'M6P_1', t: 'Epilogue', a: '라라랜드 OST', v: '연주', start: null, why: '사진 찍는 동안 이어지게' }
    ],
    M7: [   // 축배 — 신나는 곡 · 1 ~ 1.5분 · start = 강조 시작 위치(리허설에서 정함)
      { f: 'M7_1', t: 'Sugar', a: 'Maroon 5', v: '첫 후렴부터', start: null, why: '«위하여!» 뒤 바로 신나게' },
      { f: 'M7_2', t: 'September', a: 'Earth, Wind & Fire', v: '원곡', start: null, why: '누구나 아는 흥' },
      { f: 'M7_3', t: 'In the Mood', a: 'Glenn Miller Orchestra', v: '원곡', start: null, why: '경쾌한 스윙' }
    ],
    M8: [   // 테이블 인사 — 재즈 · 30분 목록
      { f: 'M8_1', t: 'Fly Me to the Moon', a: 'Frank Sinatra', v: '원곡 · 재즈 연주', start: null, why: '테이블 사이를 걷는 동안' },
      { f: 'M8_2', t: 'Married Life', a: 'Michael Giacchino', v: '업 OST', start: null, why: '두 분의 시작처럼' },
      { f: 'M8_3', t: '둘의 대화', a: '윤석철 트리오', v: '재즈 트리오', start: null, why: '대화를 덮지 않는 재즈' },
      { f: 'M8_4', t: 'How Sweet It Is (To Be Loved by You)', a: 'James Taylor', v: '원곡', start: null, why: '가볍고 다정하게' }
    ],
    M8L: [   // M8 끝 · 마지막 곡 한 칸
      { f: 'M8L_1', t: '우리들의 사랑', a: '유재하', v: '원곡', start: null, why: '하루를 닫는 마지막 곡' },
      { f: 'M8L_2', t: 'All of Me', a: 'John Legend', v: '원곡', start: null, why: '대안' }
    ]
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
  /* 곡 아이디 — 구간 · 차례(목록이 늘어도 앞 곡의 아이디가 바뀌지 않게 이름으로 만든다) */
  function idOf(seg, p) { return seg + ':' + String(p.t || '').toLowerCase().replace(/\s+/g, ' ').trim() + '|' + String(p.a || '').toLowerCase().trim(); }
  function list(seg) { return (PICKS[seg] || []).map(function (p, i) { return { id: idOf(seg, p), f: p.f || '', t: p.t, a: p.a, v: p.v || '', start: p.start == null ? null : +p.start, why: p.why || '', rank: i + 1 }; }); }
  /* [BGM_PREVIEW_1024] 곡 번호(f) — 'M2_1' 꼴 · 구간 아이디 + '_' + 번호 */
  var F_RE = /^(M[0-9A-Z]{1,4})_(\d{1,2})$/;
  function byF(f) { var m = F_RE.exec(String(f || '')); if (!m) return null; return list(m[1]).filter(function (p) { return p.f === f; })[0] || null; }
  /* 고객이 고른 곡 번호 — 구간(M1 …)은 S.bgm[구간].k · 축사 · 편지 하위 칸(M4S5 · M4S6)은 S.bgm.S5 · S6 의 k(«음악과 함께»일 때만) · 목록에 없으면 '' */
  function custK(S, seg) { var d = BY[seg]; if (!d || !S || !S.bgm) return ''; var v = S.bgm[d.slot || seg];
    if (!v || typeof v !== 'object') return ''; if (d.slot && v.m !== 'bed') return ''; var k = String(v.k || '');
    return list(seg).some(function (p) { return p.f === k; }) ? k : ''; }
  return { PICKS: PICKS, SEGS: SEGS, seg: function (id) { return BY[id] || null; }, list: list, idOf: idOf, byF: byF, custK: custK, F_RE: F_RE };
});
