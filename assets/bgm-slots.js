// 모먼트에디트 · 식순 «음악 칸(슬롯)» 단일 원천  [BGM_FORM_1023 2026-10-23]
//
// ★★사장님 지시(2026-10-23) «클로드 코드 이용해서 홈페이지 식순부분에 알맞게 디자이너 관점으로 적절하게 bgm 도 구현 시켜봐» ·
//   «노래는 나중에 따로 검토하고 우선 폼형태부분만» → BGM 섹션 설계 명세 BGM_FORM_1023 v2(대본 섹션 확인 · 순간 구조 main 5d95417 확정).
//   근거 — 웨딩 BGM 자료 3,376줄(출처 1,266곳)을 순간별로 정리한 결과:
//     ① 소규모 업체는 순서마다 기본 곡을 두고 바꾸고 싶은 곳만 mp3 로 받는다 → «기본 곡 + 원하는 칸만 교체»
//     ② 붙어 있는 순서는 같은 곡을 이어 쓴다(곡이 바뀌는 횟수가 적을수록 정적 · 엇박이 준다) → 19개 순간을 음악 칸 10개로 묶는다
//     ③ 축사 · 편지 낭독은 «아주 낮은 연주곡»과 «무음»이 둘 다 정석 → 이 두 칸만 «음악 없이 · 음악과 함께»를 고른다
//     ④ 부모님께 인사는 슬픈 곡이면 더 울고 들뜬 곡이면 분위기가 바뀐다 → 밝고 따뜻한 곡 한 줄(고르기 없음 · BGM_INFO_1023)
//
// ★이 파일은 «화면이 무엇을 말하나 · 무엇을 고를 수 있나»만 말한다(곡 · 음원 · 가사는 없다 — 저장소가 공개라서다 · 스튜디오 곡은 아직 안 정했다).
//   화면(assets/bgm-form.js · order-preview.html ② 순간 쪽 «음악» 줄 · ④ 한눈에 보기)이 읽는다.
//   ref(역할 · 길이 · 크기 단계 · 박수 줄)는 «참고 값» — 다음 단계(곡 고르기 · 콘솔)가 쓴다.
//   축사 · 편지의 «음악과 함께»만 지금 엔진이 읽는다(assets/ritual-cue.js 가 S.bgm 을 직접 본다 · 낭독 아래 −20 · duckRead).
//   S3(입장 · 맞절)는 지금의 입장 음악(assets/entry-music.js · S.mu) 그대로다 — 이 파일은 그 칸을 바꾸지 않는다.
//
// 저장 — 초안 S.bgm = { S5:{m:'bed'}, S6:{m:'bed'} } 만(마이페이지 저장과 함께 서버로 · S.mu 와 같은 길) [BGM_INFO_1023]
//   «음악 없이»는 기본과 같아서 적지 않는다. 옛 값(own · warm · none · studio)은 읽을 때 버린다(clean).
//
// 브라우저: <script src="/assets/bgm-slots.js"></script> → window.BgmSlots
// Node:    require('./assets/bgm-slots.js')
(function (root, factory) {
  var O = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = O;
  if (root) root.BgmSlots = O;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  /* ★★[BGM_INFO_1023 2026-10-23 사장님 «BGM 까지는 ‹우리가 고른 곡›으로 안 해도 될 것 같아» · «입장곡은 지금 세팅처럼 직접 할 수 있게» · «최선인지 한 번 더 검토해 보고 제안대로 구현»]
     음악 칸은 «안내 한 줄»이 기본이다 — 고를 것이 없는 칸은 이름표 «음악» + 글 한 줄(맞절 «입장 곡이 이어져요»와 같은 꼴 · 카드 · 꺾쇠 · 칩 · 펼치기 없음).
     진짜 고르기는 축사(S5) · 편지(S6) 둘뿐 — «음악 없이»(기본 · 엔진 지금 그대로 무음) · «음악과 함께»(엔진이 낭독 아래 −20 으로 아주 작게 깐다 · ritual-cue duckRead).
     ★음악 칸의 «우리가 고른 곡»(칩 · 곡 파일 올리기 · 곡 카드 · 짧은 곡 안내 · 이 기기 보관 me-bgm-song · «보낼 것» 음악 줄) 금지 — 2026-10-23 사장님 지시로 삭제 [BGM_INFO_1023] ·
       부모님께 인사 칩(밝고 따뜻한 곡 · 감동적인 곡) · 테이블 인사 «마지막 곡만 고르기»도 같은 날 뺐다(인사 멘트 분위기와 같은 질문을 두 번 묻는다 · 대본 판정 «뭉클한 여는 말에도 밝고 따뜻한 곡») ·
       입장 음악(S3 · assets/entry-music.js · S.mu)은 그대로다 */
  var PICK = { none: '음악 없이', bed: '음악과 함께' };

  /* 크기 단계 이름(참고 값) — 말 아래 · 낭독 아래 · 음악이 주인공 */
  var LEVEL = { speech: '말 아래', read: '낭독 아래', main: '음악이 주인공' };

  /* ── 음악 칸 10 ──
     ks    = 덮는 순간(빌더 키 · 순서대로) — 첫 «담긴» 순간이 안내 한 줄을 받는다 · 나머지는 «앞 순서 곡이 그대로 이어져요»(S4)
     one   = 화면 한 줄(해요체) — 고를 것이 없는 칸의 안내
     picks = 고르기(축사 · 편지만 · 첫째가 기본) · lines = 고른 것마다 아래 한 줄 · short = 한눈에 보기에 쓰는 짧은 이름
     ref   = 참고 값(역할 · 길이 초 · 크기 단계 · 들어오는 때 · 박수 줄) — 다음 단계(곡 고르기 · 콘솔)가 쓴다 */
  var SLOTS = [
    { id: 'S1', ks: ['guest'], picks: [],
      one: '하객이 앉는 동안 잔잔한 연주가 흘러요',
      ref: { role: '배경', sec: [1500, 1800], level: LEVEL.main,
        note: '개식 인사(137)는 S1 이 잦아든 뒤 조용하게, 또는 아주 작게' } },
    /* [BGM_FORM_1023 v2] 화촉을 밝히는 분은 어머님 · 아버님 · 대표 두 분 중 하나라 «어머님»이라 쓰지 않는다 · 개식 안내에서 잇는다는 말은 뺐다(S2 는 화촉 이음말 263 부터) */
    { id: 'S2', ks: ['candle'], picks: [],
      one: '화촉을 밝히는 걸음에 맞춰 밝고 우아한 곡이 흘러요',
      ref: { role: '메인', sec: 240, level: LEVEL.main,
        from: '화촉 이음말(263)부터 · 식전 영상이 없는 날은 개식 끝 박수 뒤부터' } },
    /* S3 = 입장 음악(entry-music.js) 그대로 — 고르기 · 저장은 그 칸(S.mu)이 한다 · 맞절에는 한 줄만 */
    { id: 'S3', ks: ['entry', 'matjeol'], entry: true, picks: [],
      one: '입장 음악',
      ref: { role: '메인', sec: null, level: LEVEL.main, note: '입장 음악(assets/entry-music.js · S.mu) 그대로 · 맞절까지 이어진다' } },
    /* [BGM_FORM_1023 v2] 한 곡으로 잇는다 · 크기 단계는 둘(나레이션 아래 «작게» · 사람이 직접 말하는 자리 «아주 작게 · 거의 들리지 않게») */
    { id: 'S4', ks: ['welcome', 'vow', 'ring', 'declare', 'bless'], picks: [],
      one: '말 아래 잔잔한 피아노가 아주 작게 깔려요',
      ref: { role: '배경', sec: 420, level: LEVEL.speech,
        levels: [
          { at: '나레이션 아래', lv: '작게' },
          { at: '사람이 직접 말하는 자리(서약 낭독 · 성혼 선언 낭독 · 덕담)', lv: '아주 작게 · 거의 들리지 않게' }
        ],
        clap: [{ no: 57, line: '큰 박수로 축하해 주시면…', up: '짧게 올린다', down: '111 «네, 고맙습니다.»와 덕담 여는 말(23) 앞에서 다시 낮춘다' }] } },
    /* [BGM_INFO_1023] 축사 · 편지는 엔진이 무음(duckOff)이다 — 기본은 «음악 없이» · «음악과 함께»를 고른 칸만 엔진 · 장면 글 · 미리 듣기 · 당일 콘솔이 낭독 아래 −20 으로 따라간다 */
    { id: 'S5', ks: ['free'], picks: ['none', 'bed'], short: '축사',
      lines: { none: '축사 동안은 음악 없이 목소리만 들려요', bed: '축사 아래 밝은 연주곡이 아주 작게 깔려요' },
      ref: { role: '배경', sec: 240, level: LEVEL.read } },
    { id: 'S6', ks: ['letter'], picks: ['none', 'bed'], short: '편지',
      lines: { none: '편지 동안은 음악 없이 두 분 목소리만 들려요', bed: '편지 아래 오르골 · 피아노가 아주 작게 흘러요' },
      ref: { role: '배경', sec: 330, level: LEVEL.read } },
    /* [BGM_INFO_1023] 대본 판정 «뭉클한 여는 말에도 밝고 따뜻한 곡» · 자료(슬픈 곡이면 더 운다) — 고르기 없이 한 줄 */
    { id: 'S7', ks: ['tribute'], picks: [],
      one: '부모님께 인사드리는 동안 밝고 따뜻한 곡이 흘러요',
      ref: { role: '메인', sec: 240, level: LEVEL.main } },
    { id: 'S8', ks: ['_close'], picks: [],
      one: '«인사!»와 함께 힘 있는 곡이 시작돼요',
      ref: { role: '신호', sec: 120, level: LEVEL.main,
        clap: [{ no: 108, line: '… 하객 여러분께 인사!', up: 'S8 이 힘 있게 시작한다' }] } },
    { id: 'S9', ks: ['toast'], picks: [],
      one: '«위하여!»와 함께 신나는 곡이 터져요',
      ref: { role: '신호', sec: [60, 90], level: LEVEL.main } },
    /* [BGM_FORM_1023 v2] 식사가 없는 날도 있어 «식사»는 뺐다 */
    { id: 'S10', ks: ['table'], picks: [],
      one: '테이블 인사 · 사진 동안 재즈가 흐르고, 마지막 곡으로 닫아요',
      ref: { role: '배경', sec: 1800, level: LEVEL.speech, note: '30분 + 마지막 곡(테이블 인사 · 사진 · 마무리)',
        clap: [{ no: 131, line: '… 큰 박수로 맞이해 주십시오.', up: '올라와도 좋다' }] } }
  ];

  /* 음악 칸이 없는 순간 · 이어지는 순간 — 화면에는 한 줄만 */
  var LINE = {
    prevideo: '영상에 입힌 소리로 흘러요',
    matjeol: '입장 곡이 이어져요',
    cont: '앞 순서 곡이 그대로 이어져요'   /* S4 의 서약 · 반지 · 선언 · 덕담 — 바꿀 것이 없어 링크도 없다 */
  };

  var BY = {}, OF = {};
  SLOTS.forEach(function (s) { BY[s.id] = s; s.ks.forEach(function (k) { OF[k] = s.id; }); });

  function slot(id) { return BY[id] || null; }
  function slotOfKey(k) { return OF[k] ? BY[OF[k]] : null; }
  function label(s, v) { return PICK[v] || ''; }

  /* 지금 고른 것 — 'bed' 는 축사 · 편지에만 · 나머지(비어 있음 · 옛 own · warm · none · studio)는 기본(첫째 · 'none') · 고를 것이 없는 칸은 null
     set = 저장된 값이 있나(«음악 없이»는 기본과 같아서 적지 않는다 · 'bed' 만 적힌다) */
  function get(S, id) {
    var s = BY[id]; if (!s || !s.picks.length) return { m: null, set: false };
    var on = !!(S && S.bgm && S.bgm[id] && S.bgm[id].m === 'bed' && s.picks.indexOf('bed') > -1);
    return { m: on ? 'bed' : s.picks[0], set: on };
  }
  /* 저장 꼴 — { S5:{m:'bed'}, S6:{m:'bed'} } 만 남긴다(옛 «우리가 고른 곡» 기록 · 곡 이름은 버린다) · 남는 것이 없으면 undefined */
  function clean(bgm) {
    var o = {}, n = 0;
    SLOTS.forEach(function (s) { if (s.picks.indexOf('bed') > -1 && bgm && bgm[s.id] && bgm[s.id].m === 'bed') { o[s.id] = { m: 'bed' }; n++; } });
    return n ? o : undefined;
  }
  /* 아래 한 줄 — 고른 것에 따라 */
  function lineOf(s, m) { return (s && s.lines && s.lines[m]) || ''; }

  /* 순간 쪽에서 무엇을 그리나 — onOf(k) · seq(본식 차례) · freeKind(축사 칸의 판)는 빌더가 넘긴다
     {kind:'pick', s} 축사 · 편지 칩 둘 · {kind:'line', t, s?} 한 줄 · {kind:'entry'} 입장 음악 칸 · null 없음 */
  function viewOf(k, o) {
    o = o || {};
    if (k === 'prevideo') return { kind: 'line', t: LINE.prevideo };
    if (k === 'free' && o.freeKind === 'video') return { kind: 'line', t: LINE.prevideo };   /* 옛 초안 «영상» 갈래(FREE_KIND video) */
    if (k === 'free' && o.freeKind && o.freeKind !== 'speech') return null;                  /* 옛 초안 선물 · 기타 — 엔진도 그대로 무음 */
    if (k === 'matjeol') return { kind: 'line', t: LINE.matjeol };
    if (k === 'entry') return { kind: 'entry' };
    var s = slotOfKey(k); if (!s || s.entry) return null;   /* 축가(MR 흐름) · 케이크(은퇴) 등은 없다 */
    if (s.picks.length) return { kind: 'pick', s: s };
    var at = chooser(s, o);
    if (at && at !== k) return { kind: 'line', t: LINE.cont, s: s };
    return { kind: 'line', t: s.one, s: s };
  }
  /* 칸의 첫 순간 = 이 칸의 순간 중 «담긴» 첫 순간(본식 차례) — 감사 인사를 담지 않은 식순이면 다음 담긴 순간이 안내 한 줄을 받는다 */
  function chooser(s, o) {
    o = o || {};
    var on = typeof o.onOf === 'function' ? o.onOf : function () { return true; };
    var ks = s.ks.filter(function (k) { return on(k); });
    if (o.seq && o.seq.length) ks.sort(function (a, b) { var i = o.seq.indexOf(a), j = o.seq.indexOf(b); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j); });
    return ks[0] || null;
  }

  return { SLOTS: SLOTS, PICK: PICK, LEVEL: LEVEL, LINE: LINE, slot: slot, slotOfKey: slotOfKey, label: label, get: get, clean: clean, lineOf: lineOf, viewOf: viewOf, chooser: chooser };
});
