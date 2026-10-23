// 모먼트에딧 · 당일 콘솔 «구간 음악» 추천 곡 목록  [BGM_PICKS_1023 2026-10-23]
//
// ★곡 더하는 법(세 줄)
//   1. 아래 PICKS 에서 그 구간(M1 · M2 …) 배열을 찾는다.
//   2. 한 줄 더한다: { t: '곡', a: '아티스트', v: '판(연주 · 편집)', start: null, why: '한 줄' },   ← 위가 1순위
//   3. 저장하면 끝 — 콘솔 «구간 음악» 칸에 바로 보인다(콘솔에서 «곡 추가»로 그 기기에만 더할 수도 있다).
//
// ★사장님 지시(2026-10-23 21:40) «입장곡은 지금 셋팅되어 있으니깐 나머지 이 노래들 우선 고를 수 있게 넣어줘» · «나중에 곡 더 추가할 거야»
//   → BGM 섹션 콘솔 라운드 2 덧붙임. 고객 화면이 아니라 당일 콘솔(스튜디오) 전용이다 — order-preview · mypage 는 이 파일을 싣지 않는다(고객은 입장 곡만 고른다).
// ★음원 파일은 저장소에 두지 않는다(곡 이름 · 정보만 · 저장소가 공개라서다). 파일은 콘솔에서 그 기기에 넣는다.
// start = 시작 · 강조 위치(초) — 모르면 null(축배 M7 은 리허설에서 정한다)
//
// 구간(SEGS) = 사장님 결정 «8구간»(BGM 섹션 라운드 2) — 엔진 순간(k) → 콘솔 곡
//   sub = 그 구간 안의 하위 칸(그 순간만 바꿨다가 끝나면 구간 곡으로 돌아간다) · multi = 여러 곡을 이어 트는 목록(반복) · last = 목록 끝 «마지막 곡» 한 칸
//   entry = 입장 곡(S.mu · 입장 음악 칸) 그대로 — 목록을 두지 않는다
//
// 브라우저(콘솔만): <script src="/assets/bgm-picks.js"></script> → window.BgmPicks
(function (root, factory) {
  var O = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = O;
  if (root) root.BgmPicks = O;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var PICKS = {
    M1: [   // 하객 맞이 — 잔잔한 연주 · 30분 이상 목록
      { t: 'La Vie en Rose', a: 'Louis Armstrong', v: '원곡 · 재즈 피아노 연주', start: null, why: '들어서는 순간 따뜻하게' },
      { t: "Isn't She Lovely", a: 'Ben Paterson', v: '재즈 피아노', start: null, why: '밝지만 말소리를 덮지 않는다' },
      { t: 'Clair de Lune', a: 'Debussy', v: '피아노', start: null, why: '고요하게 자리에 앉는 동안' },
      { t: 'Gymnopédie No. 1', a: 'Satie', v: '피아노', start: null, why: '느리고 담백하게' }
    ],
    M2: [   // 화촉 — 밝고 우아한 곡 · 2분 10초 이상
      { t: 'Potter Waltz', a: 'Patrick Doyle', v: '해리포터와 불의 잔 OST · 오케스트라', start: null, why: '왈츠 걸음 · 밝고 우아하게' },
      { t: '꽃날', a: '황진이 OST', v: '반복 편집본', start: null, why: '단아하게 · 어머님 걸음' },
      { t: '봄바람', a: '버스커버스커', v: '연주 · 피아노 3중주', start: null, why: '가볍고 화사하게' },
      { t: 'Someday My Prince Will Come', a: '백설공주 OST', v: '재즈 피아노', start: null, why: '동화처럼 따뜻하게' }
    ],
    M4: [   // 감사 인사 ~ 덕담 — 피아노 아주 작게 · 6분 이상 반복 편집본
      { t: 'Innocent in Sonatine', a: '우리들의 블루스 OST', v: '피아노', start: null, why: '말 아래 조용히 깔린다' },
      { t: '인생의 회전목마', a: '久石譲', v: '하울의 움직이는 성 OST · 피아노', start: null, why: '익숙하고 부드럽게' },
      { t: '매일 그대와 (Piano)', a: '달콤한꿈', v: '피아노', start: null, why: '서약 · 선언 아래 담백하게' },
      { t: 'When She Loved Me', a: 'Disney String Quartet', v: '토이스토리2 OST · 현악', start: null, why: '현악으로 잔잔하게' }
    ],
    M4S5: [   // M4 안 · 축사 «음악과 함께» — 잔잔한 연주곡 · 4분 이상
      { t: '혜화동', a: '응답하라 1988 OST', v: '기타 연주', start: null, why: '오랜 친구의 말 아래' },
      { t: '언제나 몇 번이라도', a: '센과 치히로의 행방불명 OST', v: '오르골 · 피아노', start: null, why: '작게 반짝이게' },
      { t: 'Moon River', a: 'Henry Mancini', v: '연주', start: null, why: '익숙하고 따뜻하게' }
    ],
    M4S6: [   // M4 안 · 편지 «음악과 함께» — 잔잔한 연주곡 · 5분 30초 이상
      { t: '未来へ', a: 'Kiroro', v: '오르골', start: null, why: '편지 목소리를 덮지 않게' },
      { t: 'The Rose', a: 'Bette Midler', v: '원곡 · 오르골 / 피아노', start: null, why: '서정적으로' },
      { t: '너를 만나 (Piano Ver.)', a: '폴킴', v: '피아노', start: null, why: '두 분의 이야기 아래' }
    ],
    M5: [   // 부모님께 인사 — 밝고 따뜻한 곡 · 5분 이상
      { t: 'I Love Penny Sue', a: 'Daniel May', v: '피아노', start: null, why: '밝고 따뜻하게(슬프지 않게)' },
      { t: 'Butterfly Waltz', a: 'Brian Crain', v: '피아노', start: null, why: '부드럽게 감싸 안듯' },
      { t: '사랑의 인사', a: 'Elgar', v: '현악 · 피아노', start: null, why: '단정하고 다정하게' }
    ],
    M6: [   // 닫는 인사 — 박수와 함께 힘 있는 곡 · 신호 1 ~ 2분
      { t: 'Another Day of Sun', a: '라라랜드 OST', v: '원곡(전주부터)', start: null, why: '박수와 함께 힘 있게' },
      { t: '팡파레', a: '다비치', v: '원곡', start: null, why: '축하의 문을 열듯' }
    ],
    M6P: [   // M6 안 · 단체 사진 동안 — 약 10분
      { t: 'Epilogue', a: '라라랜드 OST', v: '연주', start: null, why: '사진 찍는 동안 이어지게' }
    ],
    M7: [   // 축배 — 신나는 곡 · 1 ~ 1.5분 · start = 강조 시작 위치(리허설에서 정함)
      { t: 'Sugar', a: 'Maroon 5', v: '첫 후렴부터', start: null, why: '«위하여!» 뒤 바로 신나게' },
      { t: 'September', a: 'Earth, Wind & Fire', v: '원곡', start: null, why: '누구나 아는 흥' },
      { t: 'In the Mood', a: 'Glenn Miller Orchestra', v: '원곡', start: null, why: '경쾌한 스윙' }
    ],
    M8: [   // 테이블 인사 — 재즈 · 30분 목록
      { t: 'Fly Me to the Moon', a: 'Frank Sinatra', v: '원곡 · 재즈 연주', start: null, why: '테이블 사이를 걷는 동안' },
      { t: 'Married Life', a: 'Michael Giacchino', v: '업 OST', start: null, why: '두 분의 시작처럼' },
      { t: '둘의 대화', a: '윤석철 트리오', v: '재즈 트리오', start: null, why: '대화를 덮지 않는 재즈' },
      { t: 'How Sweet It Is (To Be Loved by You)', a: 'James Taylor', v: '원곡', start: null, why: '가볍고 다정하게' }
    ],
    M8L: [   // M8 끝 · 마지막 곡 한 칸
      { t: '우리들의 사랑', a: '유재하', v: '원곡', start: null, why: '하루를 닫는 마지막 곡' },
      { t: 'All of Me', a: 'John Legend', v: '원곡', start: null, why: '대안' }
    ]
  };

  /* 구간 — 콘솔 «구간 음악» 칸의 차례 · ks = 이 구간 곡이 흐르는 엔진 순간 */
  var SEGS = [
    { id: 'M1', nm: '하객 맞이', ks: ['guest'], multi: true, need: '30분 이상 · 개식이 늦어도 이어지게(반복 목록)' },
    { id: 'M2', nm: '화촉', ks: ['candle'], need: '2분 10초 이상' },
    { id: 'M3', nm: '입장 → 맞절', ks: ['entry', 'matjeol'], entry: true, need: '입장 음악 칸(두 분 · 스튜디오가 고른 곡) 그대로' },
    { id: 'M4', nm: '감사 인사 ~ 덕담', ks: ['welcome', 'vow', 'ring', 'declare', 'bless', 'free', 'letter'], need: '6분 이상 · 반복 편집본' },
    { id: 'M4S5', nm: '축사 «음악과 함께»', parent: 'M4', sub: 'S5', need: '4분 이상 · 두 분이 «음악과 함께»를 고른 날만' },
    { id: 'M4S6', nm: '편지 «음악과 함께»', parent: 'M4', sub: 'S6', need: '5분 30초 이상 · 두 분이 «음악과 함께»를 고른 날만' },
    { id: 'M5', nm: '부모님께 인사', ks: ['tribute'], need: '5분 이상' },
    { id: 'M6', nm: '닫는 인사', ks: ['_close'], need: '신호 1 ~ 2분' },
    { id: 'M6P', nm: '닫는 인사 뒤 단체 사진', parent: 'M6', need: '약 10분 · 비우면 닫는 인사 곡이 이어진다' },
    { id: 'M7', nm: '축배', ks: ['toast'], need: '1 ~ 1.5분 · 강조 시작 위치(초)' },
    { id: 'M8', nm: '테이블 인사 이후', ks: ['table'], multi: true, need: '30분 목록' },
    { id: 'M8L', nm: '마지막 곡', parent: 'M8', last: true, need: '마무리 인사(47)와 함께 시작' }
  ];
  var BY = {}; SEGS.forEach(function (s) { BY[s.id] = s; });
  /* 곡 아이디 — 구간 · 차례(목록이 늘어도 앞 곡의 아이디가 바뀌지 않게 이름으로 만든다) */
  function idOf(seg, p) { return seg + ':' + String(p.t || '').toLowerCase().replace(/\s+/g, ' ').trim() + '|' + String(p.a || '').toLowerCase().trim(); }
  function list(seg) { return (PICKS[seg] || []).map(function (p, i) { return { id: idOf(seg, p), t: p.t, a: p.a, v: p.v || '', start: p.start == null ? null : +p.start, why: p.why || '', rank: i + 1 }; }); }
  return { PICKS: PICKS, SEGS: SEGS, seg: function (id) { return BY[id] || null; }, list: list, idOf: idOf };
});
