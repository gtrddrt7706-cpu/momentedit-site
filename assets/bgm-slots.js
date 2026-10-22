// 모먼트에디트 · 식순 «음악 칸(슬롯)» 단일 원천  [BGM_FORM_1023 2026-10-23]
//
// ★★사장님 지시(2026-10-23) «클로드 코드 이용해서 홈페이지 식순부분에 알맞게 디자이너 관점으로 적절하게 bgm 도 구현 시켜봐» ·
//   «노래는 나중에 따로 검토하고 우선 폼형태부분만» → BGM 섹션 설계 명세 BGM_FORM_1023 v2(대본 섹션 확인 · 순간 구조 main 5d95417 확정).
//   근거 — 웨딩 BGM 자료 3,376줄(출처 1,266곳)을 순간별로 정리한 결과:
//     ① 소규모 업체는 순서마다 기본 곡을 두고 바꾸고 싶은 곳만 mp3 로 받는다 → «기본 곡 + 원하는 칸만 교체»
//     ② 붙어 있는 순서는 같은 곡을 이어 쓴다(곡이 바뀌는 횟수가 적을수록 정적 · 엇박이 준다) → 19개 순간을 음악 칸 10개로 묶는다
//     ③ 축사 · 편지 낭독은 «아주 낮은 연주곡»과 «무음»이 둘 다 정석 → 이 두 칸만 «음악 없이»
//     ④ 부모님께 인사는 슬픈 곡이면 더 울고 들뜬 곡이면 분위기가 바뀐다 → 기본은 밝고 따뜻한 곡 · «감동적인 곡»은 선택지
//
// ★이 파일은 «무엇을 고를 수 있나»만 말한다(곡 · 음원 · 가사는 없다 — 저장소가 공개라서다 · 스튜디오 곡은 아직 안 정했다).
//   화면(assets/bgm-form.js · order-preview.html ② 순간 쪽 «음악» 줄 · ④ 한눈에 보기)이 읽는다.
//   ref(역할 · 길이 · 크기 단계 · 박수 줄)는 «참고 값» — 이번에는 화면 설명에만 쓰고 당일 콘솔 · 미리 듣기 엔진에는 넣지 않는다(다음 단계).
//   S3(입장 · 맞절)는 지금의 입장 음악(assets/entry-music.js · S.mu) 그대로다 — 이 파일은 그 칸을 바꾸지 않는다.
//
// 저장 — 초안 S.bgm = { S1:{m:'studio'|'own'|'none'|'warm', own:{n,a,d}}, … } (마이페이지 저장과 함께 서버로 · S.mu 와 같은 길)
//   손대지 않은 칸은 적지 않는다(비어 있으면 'studio' 로 읽는다). 두 분이 누른 칸만 적힌다.
//
// 브라우저: <script src="/assets/bgm-slots.js"></script> → window.BgmSlots
// Node:    require('./assets/bgm-slots.js')
(function (root, factory) {
  var O = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = O;
  if (root) root.BgmSlots = O;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  /* 고르기 이름 — 칩 글자(14px 알약 · 폰 두 칸에 들어가게 짧게) */
  var PICK = { studio: '스튜디오 곡', own: '우리가 고른 곡', none: '음악 없이', warm: '감동적인 곡' };

  /* 크기 단계 이름(참고 값) — 말 아래 · 낭독 아래 · 음악이 주인공 */
  var LEVEL = { speech: '말 아래', read: '낭독 아래', main: '음악이 주인공' };

  /* ── 음악 칸 10 ──
     ks    = 덮는 순간(빌더 키 · 순서대로) — 첫 «담긴» 순간이 고르는 자리 · 나머지는 «앞 순서 곡이 이어져요»
     one   = 화면 한 줄 — 무엇을 골라도 참인 «역할»만 · 해요체 · noneOne = «음악 없이»를 고르면 바뀌는 한 줄(축사 · 편지)
     sub   = 둘째 줄 — 스튜디오가 고를 때의 곡 성격(잔잔한 피아노 · 오르골 …) · 고른 것마다(studio · warm)
             ★[BGM_LINES_TRUE 2026-10-23 BGM 섹션 검토 1] 종전 한 줄이 곡 성격까지 말해(«편지 아래 오르골 · 피아노가 …») «음악 없이» · «감동적인 곡» · 우리가 고른 곡을 골라도 그대로였다 — 성격을 한 줄에 되돌리지 말 것
     need  = 필요한 길이(초 · min 보다 짧은 «우리가 고른 곡»이면 한 줄 안내 «반복해서 이어 틀어요») · txt 는 사람이 읽는 말
     picks = 고르기(첫째가 기본 · 손대지 않으면 이것) · lab = 이 칸만 다른 칩 이름
     ref   = 참고 값(역할 · 길이 초 · 크기 단계 · 들어오는 때 · 박수 줄) — 엔진에는 아직 안 넣는다 */
  var SLOTS = [
    { id: 'S1', ks: ['guest'],
      one: '하객이 들어와 앉는 동안 흘러요', sub: { studio: '잔잔한 연주로 스튜디오가 골라 둘게요' },
      need: { min: 1500, txt: '25~30분 재생목록' }, picks: ['studio', 'own'],
      ref: { role: '배경', sec: [1500, 1800], level: LEVEL.main,
        note: '개식 인사(137)는 S1 이 잦아든 뒤 조용하게, 또는 아주 작게' } },
    /* [BGM_FORM_1023 v2] 화촉을 밝히는 분은 어머님 · 아버님 · 대표 두 분 중 하나라 «어머님»이라 쓰지 않는다 · 개식 안내에서 잇는다는 말은 뺐다(S2 는 화촉 이음말 263 부터) */
    { id: 'S2', ks: ['candle'],
      one: '화촉을 밝히는 걸음에 맞춰 흘러요', sub: { studio: '밝고 우아한 곡으로 스튜디오가 골라 둘게요' },
      need: { min: 240, txt: '4분 이상' }, picks: ['studio', 'own'],
      ref: { role: '메인', sec: 240, level: LEVEL.main,
        from: '화촉 이음말(263)부터 · 식전 영상이 없는 날은 개식 끝 박수 뒤부터' } },
    /* S3 = 입장 음악(entry-music.js) 그대로 — 고르기 · 저장은 그 칸(S.mu)이 한다 · 맞절에는 한 줄만 */
    { id: 'S3', ks: ['entry', 'matjeol'], entry: true,
      one: '입장 음악',
      need: null, picks: [],
      ref: { role: '메인', sec: null, level: LEVEL.main, note: '입장 음악(assets/entry-music.js · S.mu) 그대로 · 맞절까지 이어진다' } },
    /* [BGM_FORM_1023 v2] 한 곡으로 잇는다 · 크기 단계는 둘(나레이션 아래 «작게» · 사람이 직접 말하는 자리 «아주 작게 · 거의 들리지 않게») · 화면 한 줄은 그대로 */
    { id: 'S4', ks: ['welcome', 'vow', 'ring', 'declare', 'bless'],
      one: '말 아래 아주 작게 깔려요', sub: { studio: '잔잔한 피아노로 스튜디오가 골라 둘게요' },
      need: { min: 420, txt: '7분 이상' }, picks: ['studio', 'own'],
      ref: { role: '배경', sec: 420, level: LEVEL.speech,
        levels: [
          { at: '나레이션 아래', lv: '작게' },
          { at: '사람이 직접 말하는 자리(서약 낭독 · 성혼 선언 낭독 · 덕담)', lv: '아주 작게 · 거의 들리지 않게' }
        ],
        clap: [{ no: 57, line: '큰 박수로 축하해 주시면…', up: '짧게 올린다', down: '111 «네, 고맙습니다.»와 덕담 여는 말(23) 앞에서 다시 낮춘다' }] } },
    { id: 'S5', ks: ['free'],
      one: '축사 아래 아주 작게 깔려요', sub: { studio: '밝은 연주곡으로 스튜디오가 골라 둘게요' }, noneOne: '축사는 음악 없이 목소리만 들려요',
      need: { min: 240, txt: '4분 이상' }, picks: ['studio', 'own', 'none'],
      ref: { role: '배경', sec: 240, level: LEVEL.read } },
    { id: 'S6', ks: ['letter'],
      one: '편지 아래 끊기지 않게 흘러요', sub: { studio: '오르골 · 피아노로 스튜디오가 골라 둘게요' }, noneOne: '편지는 음악 없이 목소리만 들려요',
      need: { min: 330, txt: '5분 30초 이상' }, picks: ['studio', 'own', 'none'],
      ref: { role: '배경', sec: 330, level: LEVEL.read } },
    /* [BGM_FORM_1023 v2] 대본 여는 말이 «뭉클하실 부모님께…»라 기본은 들뜬 곡이 아니라 밝고 따뜻한 곡 · 저장 값 'warm' = 감동적인 곡(명세의 저장 꼴 그대로) */
    { id: 'S7', ks: ['tribute'],
      one: '부모님께 인사드리는 동안 흘러요', sub: { studio: '밝고 따뜻한 곡으로 스튜디오가 골라 둘게요', warm: '감동적인 곡으로 스튜디오가 골라 둘게요' },
      need: { min: 240, txt: '4분 이상' }, picks: ['studio', 'warm', 'own'],
      lab: { studio: '밝고 따뜻한 곡' },
      ref: { role: '메인', sec: 240, level: LEVEL.main } },
    { id: 'S8', ks: ['_close'],
      one: '마지막 인사와 함께 힘 있게 시작해요', sub: { studio: '힘 있는 곡으로 스튜디오가 골라 둘게요' },
      need: { min: 120, txt: '2분 이상' }, picks: ['studio', 'own'],
      ref: { role: '신호', sec: 120, level: LEVEL.main,
        clap: [{ no: 108, line: '… 하객 여러분께 인사!', up: 'S8 이 힘 있게 시작한다' }] } },
    { id: 'S9', ks: ['toast'],
      one: '«위하여!»에 맞춰 크게 시작해요', sub: { studio: '후렴부터 트는 신나는 곡으로 스튜디오가 골라 둘게요' },
      need: { min: 60, max: 90, txt: '60~90초' }, picks: ['studio', 'own'],
      ref: { role: '신호', sec: [60, 90], level: LEVEL.main } },
    /* [BGM_FORM_1023 v2] 식사가 없는 날도 있어 «식사»는 뺐다 · 우리가 고르는 것은 마지막 곡 하나(재즈 연주는 스튜디오) */
    { id: 'S10', ks: ['table'],
      one: '테이블 인사 · 사진 동안 흐르고, 마지막 곡으로 하루를 닫아요', sub: { studio: '재즈 연주와 마지막 곡을 스튜디오가 골라 둘게요' },
      need: null, picks: ['studio', 'own'], last: true,
      lab: { own: '마지막 곡만 고르기' },
      ref: { role: '배경', sec: 1800, level: LEVEL.speech, note: '30분 + 마지막 곡(테이블 인사 · 사진 · 마무리)',
        clap: [{ no: 131, line: '… 큰 박수로 맞이해 주십시오.', up: '올라와도 좋다' }] } }
  ];

  /* 음악 칸이 없는 순간 — 화면에는 한 줄만 */
  var LINE = {
    prevideo: '영상에 입힌 소리로 흘러요',
    matjeol: '입장 곡이 이어져요'
  };

  var BY = {}, OF = {};
  SLOTS.forEach(function (s) { BY[s.id] = s; s.ks.forEach(function (k) { OF[k] = s.id; }); });

  function slot(id) { return BY[id] || null; }
  function slotOfKey(k) { return OF[k] ? BY[OF[k]] : null; }
  function label(s, v) { return (s.lab && s.lab[v]) || PICK[v] || ''; }

  /* 지금 고른 것 — 비어 있거나 이 칸에 없는 값이면 첫째(기본 · 'studio') */
  function get(S, id) {
    var s = BY[id], r = (S && S.bgm && S.bgm[id]) || {}, m = String(r.m || '');
    if (!s || s.picks.indexOf(m) < 0) m = s && s.picks[0] || 'studio';
    var o = r.own && typeof r.own === 'object' ? r.own : null;
    return { m: m, own: o, set: !!(S && S.bgm && S.bgm[id] && s && s.picks.indexOf(String(S.bgm[id].m || '')) > -1) };
  }

  /* 순간 쪽에서 무엇을 그리나 — onOf(k) · seq(본식 차례) · freeVideo 는 빌더가 넘긴다
     {kind:'pick', s} 고르는 자리 · {kind:'cont', s, at} 이어지는 자리(at = 고르는 순간) · {kind:'line', t} 한 줄 · {kind:'entry'} 입장 음악 칸 · null 없음 */
  function viewOf(k, o) {
    o = o || {};
    if (k === 'prevideo') return { kind: 'line', t: LINE.prevideo };
    if (k === 'free' && o.freeVideo) return { kind: 'line', t: LINE.prevideo };   /* 옛 초안 «영상» 갈래(FREE_KIND video) */
    if (k === 'matjeol') return { kind: 'line', t: LINE.matjeol };
    if (k === 'entry') return { kind: 'entry' };
    var s = slotOfKey(k); if (!s || s.entry) return null;   /* 축가(MR 흐름) · 케이크(은퇴) 등은 없다 */
    var at = chooser(s, o);
    if (at && at !== k) return { kind: 'cont', s: s, at: at };
    return { kind: 'pick', s: s };
  }
  /* 고르는 순간 = 이 칸의 순간 중 «담긴» 첫 순간(본식 차례) — 감사 인사를 담지 않은 식순이면 다음 담긴 순간 */
  function chooser(s, o) {
    o = o || {};
    var on = typeof o.onOf === 'function' ? o.onOf : function () { return true; };
    var ks = s.ks.filter(function (k) { return on(k); });
    if (o.seq && o.seq.length) ks.sort(function (a, b) { var i = o.seq.indexOf(a), j = o.seq.indexOf(b); return (i < 0 ? 99 : i) - (j < 0 ? 99 : j); });
    return ks[0] || null;
  }

  /* 길이 말 — 200 → «3분 20초» · 180 → «3분» · 40 → «40초» */
  function lenTxt(d) {
    d = Math.max(0, Math.round(+d || 0)); var m = Math.floor(d / 60), r = d % 60;
    return (m ? m + '분' : '') + (m && r ? ' ' : '') + (r || !m ? r + '초' : '');
  }
  /* «이 곡은 3분이라 · 3분 20초라» — 받침이 있으면 «이라» */
  function lenRa(d) { var t = lenTxt(d), c = t.charCodeAt(t.length - 1); return t + ((c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28) ? '이라' : '라'); }
  /* [BGM_LINES_TRUE] 접힌 칸의 두 줄 — 한 줄(역할 · 음악 없이면 바뀐다) + 둘째 줄(고른 것) · open = 펴 있나(펴 있으면 곡 이름은 아래 카드가 말한다 · 두 번 보이지 않게) */
  var NONE_SUB = '음악 없이 조용히 진행해요';
  function lines(s, g, open) {
    var o = g.own && +g.own.d > 0 ? g.own : null, one = (g.m === 'none' && s.noneOne) || s.one, now;
    if (g.m === 'own') now = o ? (open ? (s.last ? '마지막 곡은 우리가 고른 곡' : PICK.own) : (s.last ? '마지막 곡 ' : '') + '‹' + o.n + '›') : (s.last ? '마지막 곡 · ' : PICK.own + ' · ') + '파일을 올려 주세요';
    else if (g.m === 'none') now = NONE_SUB;
    else now = (s.sub && s.sub[g.m]) || '곡은 스튜디오가 골라 둘게요';
    return { one: one, now: now };
  }
  /* 필요한 길이보다 짧으면 한 줄 — 없으면 '' */
  function shortNote(s, d) {
    if (!s || !s.need || !(+d > 0)) return '';
    if (+d < s.need.min) return '이 곡은 ' + lenRa(d) + ' 반복해서 이어 틀어요';
    return '';
  }
  /* m:ss */
  function mss(d) { d = Math.max(0, Math.floor(+d || 0)); var r = d % 60; return Math.floor(d / 60) + ':' + (r < 10 ? '0' : '') + r; }

  return { SLOTS: SLOTS, PICK: PICK, LEVEL: LEVEL, LINE: LINE, NONE_SUB: NONE_SUB, lines: lines, slot: slot, slotOfKey: slotOfKey, label: label, get: get, viewOf: viewOf, chooser: chooser, lenTxt: lenTxt, shortNote: shortNote, mss: mss };
});
