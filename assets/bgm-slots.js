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
  /* ★★[BGM_R1_1023 2026-10-23 사장님 «최선인지 디자이너 시선으로 개선 검토해 봐 · 라운드별로» → BGM 섹션 라운드 1 «안내는 ‹흐름›으로 · 고르기에는 고를 것만»]
     고를 것이 없는 음악 안내(one · LINE)는 «고르기» 칸이 아니라 «흐름»(이 순간 전체 듣기 아래 줄)의 채운 점 줄 하나다 — 입장 «음악에 맞춰 걸어 들어와요»와 같은 꼴(li.q · 새 아이콘 · 색 · ♪ 없음).
     ▶ 가 없는 줄이라 «이 순간 전체 듣기 · n줄»의 n · 듣기 · 이어 듣기 순서에 끼지 않는다(화면만 그린다 · 엔진 줄이 아니다).
     자리(at) = 음악이 시작되는 때 — top 맨 앞 · video 영상 상영 줄 바로 앞(없으면 맨 앞) · bow «목례» 줄 바로 뒤 · cheers «위하여!» 줄 바로 뒤.
     ★[BGM_R2_1023] «맨 앞»은 모든 칸 한 규칙 — 쪽의 첫 줄이 «다음 순서로 넘어가며» 이음말(bridge-…)이면 그 바로 뒤, 아니면 맨 앞(head).
       화촉(263 화촉 순서 알림) · 감사 인사(맞절에서 넘어오는 «하객 쪽으로») · 축가 바로 뒤 부모님께 인사(«경건하게»)가 이음말로 시작한다.
     흐름 음악 줄의 글은 «행동» 줄보다 한 단계 조용하다(굵기 400 · var(--sub) · 점 · 크기는 같다 · order-preview CSS) — «배경 안내»와 «할 일»이 한눈에 갈린다.
     ★★[BGM_R3_1023 2026-10-23 BGM 섹션 라운드 3 «다른 섹션 작업에 깨지지 않게»]
       식전 영상은 흐름 음악 줄이 없다 — 바로 다음 줄 «여기서 두 분의 영상이 흘러요»와 같은 말을 두 번 했다. 영상 소리 안내는 «식전 영상 링크» 칸 아래 한 줄(order-preview _mkPrep).
       닫는 인사 · 축배 자리는 글자(«목례» · «위하여»)가 아니라 줄이 나온 큐의 열쇠(빌더 _lSteps 줄의 of = 큐 slug)로 찾는다 — 대본이 줄 글을 고쳐도 자리가 그대로다.
       못 찾으면 맨 앞(head)으로 물러나되 flowFind 가 hit:false 로 알리고 bgm-form 검사가 코스 · 조합 전부에서 빨강으로 잡는다.
     «고르기»에 남는 음악 칸은 입장 · 축사 · 편지뿐 · 이름표 «입장 음악 · 축사 음악 · 편지 음악».
     ★고를 것이 없는 음악 한 줄을 «고르기» 칸(이름표 «음악» + 글)에 다시 두지 말 것 — 2026-10-23 사용자 지시로 옮김 [BGM_R1_1023] */
  var PICK = { none: '음악 없이', bed: '음악과 함께' };

  /* 크기 단계 이름(참고 값) — 말 아래 · 낭독 아래 · 음악이 주인공 */
  var LEVEL = { speech: '말 아래', read: '낭독 아래', main: '음악이 주인공' };

  /* ── 음악 칸 10 ──
     ks    = 덮는 순간(빌더 키 · 순서대로) — 첫 «담긴» 순간이 안내 한 줄을 받는다 · 나머지는 «앞 순서 곡이 그대로 이어져요»(S4)
     one   = 화면 한 줄(해요체) — 고를 것이 없는 칸의 안내
     picks = 고르기(축사 · 편지만 · 첫째가 기본) · lines = 고른 것마다 아래 한 줄 · short = 한눈에 보기에 쓰는 짧은 이름
     ref   = 참고 값(역할 · 길이 초 · 크기 단계 · 들어오는 때 · 박수 줄) — 다음 단계(곡 고르기 · 콘솔)가 쓴다 */
  var SLOTS = [
    { id: 'S1', ks: ['guest'], picks: [], at: 'top',
      one: '하객이 앉는 동안 잔잔한 연주가 흘러요',
      ref: { role: '배경', sec: [1500, 1800], level: LEVEL.main,
        note: '개식 인사(137)는 S1 이 잦아든 뒤 조용하게, 또는 아주 작게' } },
    /* [BGM_FORM_1023 v2] 화촉을 밝히는 분은 어머님 · 아버님 · 대표 두 분 중 하나라 «어머님»이라 쓰지 않는다 · 개식 안내에서 잇는다는 말은 뺐다(S2 는 화촉 이음말 263 부터) */
    { id: 'S2', ks: ['candle'], picks: [], at: 'top',
      one: '화촉을 밝히는 동안 밝고 우아한 곡이 흘러요',   /* [BGM_R4_1023] «걸음에 맞춰»는 걸음마다 박자를 맞추는 것처럼 읽혔다 */
      ref: { role: '메인', sec: 240, level: LEVEL.main,
        from: '화촉 이음말(263)부터 · 식전 영상이 없는 날은 개식 끝 박수 뒤부터' } },
    /* S3 = 입장 음악(entry-music.js) 그대로 — 고르기 · 저장은 그 칸(S.mu)이 한다 · 맞절에는 한 줄만 */
    { id: 'S3', ks: ['entry', 'matjeol'], entry: true, picks: [],
      one: '입장 음악',
      ref: { role: '메인', sec: null, level: LEVEL.main, note: '입장 음악(assets/entry-music.js · S.mu) 그대로 · 맞절까지 이어진다' } },
    /* [BGM_FORM_1023 v2] 한 곡으로 잇는다 · 크기 단계는 둘(나레이션 아래 «작게» · 사람이 직접 말하는 자리 «아주 작게 · 거의 들리지 않게») */
    { id: 'S4', ks: ['welcome', 'vow', 'ring', 'declare', 'bless'], picks: [], at: 'top',
      one: '이 순간부터 피아노가 아주 작게 흘러요',   /* [BGM_R4_1023] «뒤로»가 «말이 끝난 뒤»로도 읽혔다 · 다음 순간 «{at}부터 … 이어져요»와 짝 · 첫 담긴 순간이 서약이어도 맞다 · [BGM_R1_1023] «말 아래»는 고객에게 낯선 말 · [BGM_R2_1023] 폰에서 «아주 / 작게»로 갈리지 않게 «잔잔한»을 뺐다 */
      ref: { role: '배경', sec: 420, level: LEVEL.speech,
        levels: [
          { at: '나레이션 아래', lv: '작게' },
          { at: '사람이 직접 말하는 자리(서약 낭독 · 성혼 선언 낭독 · 덕담)', lv: '아주 작게 · 거의 들리지 않게' }
        ],
        clap: [{ no: 57, line: '큰 박수로 축하해 주시면…', up: '짧게 올린다', down: '111 «네, 고맙습니다.»와 덕담 여는 말(23) 앞에서 다시 낮춘다' }] } },
    /* [BGM_INFO_1023] 축사 · 편지는 엔진이 무음(duckOff)이다 — 기본은 «음악 없이» · «음악과 함께»를 고른 칸만 엔진 · 장면 글 · 미리 듣기 · 당일 콘솔이 낭독 아래 −20 으로 따라간다 */
    { id: 'S5', ks: ['free'], picks: ['none', 'bed'], short: '축사',   /* 이름표 «축사 음악»(short + ' 음악' · BGM_R1_1023) */
      lines: { none: '축사 동안은 음악 없이 목소리만 들려요', bed: '축사 동안 잔잔한 연주곡이 아주 작게 흘러요', unset: '고르지 않으시면 축사 동안 음악 없이 목소리만 들려요' },   /* [BGM_R4_1023] «아래 · 깔려요»는 만드는 쪽 말 · 곡은 아직 안 정했다 · unset = 아직 안 누름(입장 «고르지 않으시면 …»과 같은 말투) */
      ref: { role: '배경', sec: 240, level: LEVEL.read } },
    { id: 'S6', ks: ['letter'], picks: ['none', 'bed'], short: '편지',
      lines: { none: '편지 동안은 음악 없이 두 분 목소리만 들려요', bed: '편지 동안 잔잔한 연주곡이 아주 작게 흘러요', unset: '고르지 않으시면 편지 동안 음악 없이 두 분 목소리만 들려요' },   /* [BGM_R4_1023] 악기 둘을 약속하는 글로 읽혔다 */
      ref: { role: '배경', sec: 330, level: LEVEL.read } },
    /* [BGM_INFO_1023] 대본 판정 «뭉클한 여는 말에도 밝고 따뜻한 곡» · 자료(슬픈 곡이면 더 운다) — 고르기 없이 한 줄 */
    { id: 'S7', ks: ['tribute'], picks: [], at: 'top',
      one: '인사드리는 동안 밝고 따뜻한 곡이 흘러요',   /* [BGM_R2_1023] 순간 이름(부모님께 인사)을 되풀이하지 않는다 · 폰 한 줄 */
      ref: { role: '메인', sec: 240, level: LEVEL.main } },
    { id: 'S8', ks: ['_close'], picks: [], at: 'bow',
      one: '박수와 함께 힘 있는 곡이 시작돼요',   /* [BGM_R4_1023] 엔진은 목례 → 박수 → 음악 바뀜(narr-close-bow live) · «인사!»는 맞절 · 부모님께 인사 구호와도 겹친다 · 자리는 큐 열쇠(bow) 그대로 */
      ref: { role: '신호', sec: 120, level: LEVEL.main,
        clap: [{ no: 108, line: '… 하객 여러분께 인사!', up: 'S8 이 힘 있게 시작한다' }] } },
    { id: 'S9', ks: ['toast'], picks: [], at: 'cheers',
      one: '«위하여!»에 맞춰 신나는 곡이 시작돼요',   /* [BGM_R1_1023] «터져요»는 브랜드 톤보다 가볍다 · [BGM_R4_1023] «울려 퍼져요»는 30명 스튜디오에 커 보인다 · S8 과 끝말 «시작돼요» */
      ref: { role: '신호', sec: [60, 90], level: LEVEL.main } },
    /* [BGM_FORM_1023 v2] 식사가 없는 날도 있어 «식사»는 뺐다 */
    { id: 'S10', ks: ['table'], picks: [], at: 'top',
      one: '테이블 인사와 사진 동안 재즈가 흐르고, 마지막 곡으로 하루를 마무리해요',   /* [BGM_R1_1023] 무엇을 닫는지(하루) */
      ref: { role: '배경', sec: 1800, level: LEVEL.speech, note: '30분 + 마지막 곡(테이블 인사 · 사진 · 마무리)',
        clap: [{ no: 131, line: '… 큰 박수로 맞이해 주십시오.', up: '올라와도 좋다' }] } }
  ];

  /* 음악 칸이 없는 순간 · 이어지는 순간 — 흐름 줄 하나(BGM_R1_1023) · cont 의 {at} = 그 칸의 첫 담긴 순간 이름(chooser · 빌더 nameOf) */
  var LINE = {
    prevideo: '영상에 입힌 소리로 흘러요',
    matjeol: '입장 곡이 이어져요',
    cont: '{at}부터 피아노가 조용히 이어져요'   /* [BGM_R2_1023] 짧게(폰 한 줄) · S4 의 서약 · 반지 · 선언 · 덕담 — 감사 인사부터 흐르던 곡(감사 인사를 뺀 식순이면 «혼인 서약부터…») */
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

  /* 순간 쪽에서 무엇을 그리나 — onOf(k) · seq(본식 차례) · freeKind(축사 칸의 판) · nameOf(k)(순간 이름)는 빌더가 넘긴다
     {kind:'pick', s} 축사 · 편지 칩 둘(«고르기») · {kind:'entry'} 입장 음악 칸(«고르기») · {kind:'flow', t, at, s?} 흐름 줄 하나 · null 없음 [BGM_R1_1023] */
  function viewOf(k, o) {
    o = o || {};
    if (k === 'prevideo') return null;   /* ★[BGM_R3_1023] 식전 영상 흐름 음악 줄 없음 — 다음 줄 «여기서 두 분의 영상이 흘러요»와 같은 말 두 번 · 안내는 링크 칸 아래 한 줄 · 되살리지 말 것 */
    if (k === 'free' && o.freeKind === 'video') return { kind: 'flow', t: LINE.prevideo, at: 'video' };   /* 옛 초안 «영상» 갈래(FREE_KIND video) */
    if (k === 'free' && o.freeKind && o.freeKind !== 'speech') return null;                  /* 옛 초안 선물 · 기타 — 엔진도 그대로 무음 */
    if (k === 'matjeol') return { kind: 'flow', t: LINE.matjeol, at: 'top' };
    if (k === 'entry') return { kind: 'entry' };
    var s = slotOfKey(k); if (!s || s.entry) return null;   /* 축가(MR 흐름) · 케이크(은퇴) 등은 없다 */
    if (s.picks.length) return { kind: 'pick', s: s };
    var first = chooser(s, o);
    if (first && first !== k) {
      var nm = ''; try { nm = typeof o.nameOf === 'function' ? String(o.nameOf(first) || '') : ''; } catch (e) {}
      return { kind: 'flow', t: LINE.cont.replace('{at}', nm || '앞 순서'), at: 'top', s: s };
    }
    return { kind: 'flow', t: s.one, at: s.at || 'top', s: s };
  }
  /* 흐름 줄을 놓을 자리 — 엔진 줄(빌더 _lSteps) 차례에서 «이 줄 앞에»의 번호(0 = 맨 앞 · st.length = 맨 뒤)
     x.skip = 영상 상영 줄 · x.talk = 차례 줄 · x.quiet = 행동 줄 · x.slug 'bridge-…' = 넘어가는 이음말
     ★[BGM_R2_1023] head = 쪽의 첫 줄이 이음말이면 1(그 바로 뒤) · 아니면 0 — top 과 못 찾은 자리(영상 · 목례 · 위하여 줄이 없을 때)가 다 이것을 쓴다.
       ★음악 줄을 이음말 앞(쪽의 맨 위)에 다시 두지 말 것 — 2026-10-23 사용자 지시 [BGM_R2_1023] */
  function head(st) { return (st && st[0] && /^bridge-/.test(String(st[0].slug || ''))) ? 1 : 0; }
  /* ★[BGM_R3_1023] 자리를 찾는 열쇠 = 줄이 나온 큐(빌더 _lSteps 의 of · 엔진 slug) — 글자(«목례» · «위하여»)로 찾지 않는다
     bow = 끝 선언 큐(narr-close-bow)에서 나온 말 없는 줄 바로 뒤 · cheers = 잔 드는 축배 큐(toast-…)에서 나온 «위하여» 차례 줄 바로 뒤 · video = 영상 상영 줄(skip) 바로 앞 */
  var AT_OF = { bow: { quiet: true, of: /^narr-close-bow/, after: 1 }, cheers: { talk: true, of: /^toast-/, after: 1 }, video: { skip: true, after: 0 } };
  function flowFind(at, st) {
    st = st || []; var i, h = head(st), m = AT_OF[at];
    if (!m) return { i: h, hit: true };   /* top(옛 bridge 도 같다) */
    for (i = 0; i < st.length; i++) { var x = st[i]; if (!x) continue;
      if (m.quiet && !x.quiet) continue; if (m.talk && !x.talk) continue; if (m.skip && !x.skip) continue;
      if (m.of && !m.of.test(String(x.of || ''))) continue;
      return { i: i + m.after, hit: true }; }
    return { i: h, hit: false };   /* 못 찾음 — 맨 앞으로 물러난다 · bgm-form 이 빨강으로 알린다 */
  }
  function flowAt(at, st) { return flowFind(at, st).i; }
  /* 칸의 첫 순간 = 이 칸의 순간 중 «담긴» 첫 순간(본식 차례) — 감사 인사를 담지 않은 식순이면 다음 담긴 순간이 안내 한 줄을 받는다 */
  function chooser(s, o) {
    o = o || {};
    var on = typeof o.onOf === 'function' ? o.onOf : function () { return true; };
    var ks = s.ks.filter(function (k) { return on(k); });
    if (o.seq && o.seq.length) ks.sort(function (a, b) { var i = o.seq.indexOf(a), j = o.seq.indexOf(b); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j); });
    return ks[0] || null;
  }

  return { SLOTS: SLOTS, PICK: PICK, LEVEL: LEVEL, LINE: LINE, slot: slot, slotOfKey: slotOfKey, label: label, get: get, clean: clean, lineOf: lineOf, viewOf: viewOf, flowAt: flowAt, flowFind: flowFind, chooser: chooser };
});
