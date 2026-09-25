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
     guest(하객 맞이)는 목록에 안 보이고 늘 들어간다. entry 와 _close 는 «늘 있어요». */
  var ORDER = ['guest', 'prevideo', 'candle', 'entry', 'welcome', 'bless', 'vow', 'ring', 'declare', 'tribute', 'free', 'letter', 'toast'];
  var ALWAYS = { guest: 1, entry: 1 };
  var PRE = { guest: 1, prevideo: 1 };          // 본식 시간에 들지 않는다(하객이 앉는 동안)
  var PICKABLE = ORDER.filter(function (k) { return !ALWAYS[k]; });

  var SECTIONS = [
    { n: '여는 순간', d: '예식이 시작되는 자리', ks: ['prevideo', 'candle', 'entry', 'welcome'] },
    { n: '약속의 순간', d: '말과 반지로 부부가 되는 자리', ks: ['bless', 'vow', 'ring', 'declare'] },
    { n: '마음의 순간', d: '부부가 되어 처음 건네는 마음', ks: ['tribute', 'free', 'letter'] },
    { n: '축하의 순간', d: '모두 함께 잔을 드는 자리', ks: ['toast'] },
    { n: '닫는 순간', d: '인사와 사진', ks: ['_close'] }
  ];

  /* ── 카드 문구(시안 2판 EV + 명세 4장 고침) ──
     n 화면 이름 · sn 짧은 이름(띠·목록) · one 한 줄 설명 · shot 남는 장면 · who 누가 · why 이 자리인 까닭 */
  var CARDS = {
    prevideo: { n: '식전 영상', sn: '영상', one: '두 분이 준비한 영상(3분 안)을 하객이 자리에 앉는 동안 상영해요.', shot: '영상을 보는 가족들의 얼굴', who: '하객(두 분은 문 밖에서 기다려요)' },
    candle: { n: '화촉', sn: '화촉', one: '양가 어머님이 촛불을 밝혀 예식의 시작을 알려요.', shot: '불빛에 비친 어머님 얼굴', who: '양가 어머님(누가 서실지는 두 분이 정해요)' },
    entry: { n: '입장', sn: '입장', one: '두 분이 함께 걸어 들어와, 서로 바라보거나 맞절하는 첫 장면을 남겨요.', shot: '문이 열리는 순간 · 두 분의 첫 장면', who: '두 분' },
    welcome: { n: '첫인사', sn: '첫인사', one: '두 분이 하객께 짧게 첫인사를 드려요.', shot: '하객을 바라보며 인사하는 두 분', who: '두 분' },
    bless: { n: '부모님 덕담', sn: '덕담', one: '부모님이 두 분께 덕담을 해 주세요(한 분 1분 남짓).', shot: '말씀하시는 부모님과 듣는 두 분', who: '부모님 한 분~네 분', why: '서약 바로 앞이에요. 부모님 말씀으로 약속의 문을 여는 자리예요.' },
    vow: { n: '혼인 서약', sn: '서약', one: '두 분이 서로에게 하는 약속을 읽어요(한 사람 1분 남짓).', shot: '서로를 보며 약속하는 옆얼굴', who: '두 분' },
    ring: { n: '반지 교환', sn: '반지', one: '서로의 손에 반지를 끼워 줘요.', shot: '반지를 끼워 주는 두 손', who: '두 분(건네는 손은 가족 · 아이도 돼요)' },
    declare: { n: '성혼 선언', sn: '선언', one: '두 분이 부부가 되었음을 알려요. 말투와 누가 선언할지 고를 수 있어요.', shot: '서른 분이 박수 치는 넓은 장면', who: '성우 또는 가족 한 분 · 하객은 박수' },
    tribute: { n: '부모님께 인사', sn: '인사', one: '부부가 되어 처음 부모님께 드리는 인사예요. 꽃과 인사, 포옹으로 고마움을 전해요.', shot: '부모님께 안기는 순간', who: '두 분 · 양가 부모님', why: '선언 다음이에요. 부부가 된 뒤 처음 드리는 인사라서예요(한국 예식의 오랜 차례).' },
    free: { n: '두 사람이 준비한 순서', sn: '준비한 순서', one: '두 분이 준비한 영상이나 가족의 깜짝 축하 같은 순서예요(3분 안). 라이브 노래는 받지 않아요. 영상 속 노래는 괜찮아요.', shot: '함께 보며 웃는 하객들', who: '두 분 · 준비한 가족이나 친구', why: '편지 앞이에요. 편지가 마지막 큰 순간이 되도록.' },
    letter: { n: '편지 낭독', sn: '편지', one: '부모님께, 또는 서로에게 쓴 편지를 읽어요.', shot: '편지를 읽는 목소리와 듣는 얼굴', who: '두 분' },
    toast: { n: '케이크 · 축배', sn: '케이크 · 축배', one: '케이크를 함께 자르고, 두 분이 두 와인을 한 잔에 부은 뒤 모두가 잔을 들어 «위하여». 잔을 드는 자리는 여기 하나예요.', shot: '자르는 손 · 섞이는 잔 · 서른 개의 잔', who: '두 분 · 하객 모두', why: '와인도 여기서 해요. 두 와인을 붓는 일과 모두의 «위하여»를 한자리에 모았어요(잔 드는 순간이 둘로 갈리지 않게).' },
    _close: { n: '닫는 인사', sn: '닫는 인사', one: '두 분이 인사를 드리고 본식을 마쳐요. 이어서 가족 · 하객과 사진을 남겨요.', shot: '두 분 뒤로 보이는 하객들 · 단체 사진', who: '두 분 · 하객 모두' }
  };

  /* ── 판 칩(카드 안 · 담은 뒤에만 보인다) ──
     값은 **기존 S 키**에 그대로 쓴다 — 엔진과 연출 단계가 이미 읽는 자리라 새 번역이 없다.
       declare → S.declareWho / S.declare   ([DECLARE_CLAP] 'clap' 은 새 판 · ask/chorus 와 별개)
       tribute → S.tributeSay (새 키 · 말의 길이) — 방식(꽃·포옹)은 연출 단계의 S.tribute 그대로
       letter  → S.letter   (both 는 새 코스 칩에 없다 · 옛 코스엔 그대로)
       toast   → S.toast · S.wine (새 키 · 축배가 있을 때만) */
  var CHIPS = {
    declare: [['solemn', '성우 · 엄숙하게'], ['warm', '성우 · 따뜻하게'], ['clap', '하객이 박수로 답하는'], ['family', '가족이 낭독']],
    tribute: [['one', '한마디씩'], ['long', '400자씩'], ['none', '말 없이']],
    letter: [['each', '서로에게'], ['parent', '각자 부모님께']],
    toast: [['both', '케이크와 축배'], ['toast', '축배만'], ['cake', '케이크만']],
    wine: [['mix', '두 와인을 한 잔에'], ['family', '양가가 한 병씩'], ['none', '붓지 않음']]
  };
  // 칩 값 ↔ S
  function chipOf(k, S) {
    S = S || {};
    if (k === 'declare') return S.declareWho === 'family' ? 'family' : S.declare === 'clap' ? 'clap' : S.declare === '2' ? 'warm' : 'solemn';
    if (k === 'tribute') return CHIP_OK('tribute', S.tributeSay) ? S.tributeSay : 'one';
    if (k === 'letter') return S.letter === 'parent' ? 'parent' : 'each';
    if (k === 'toast') return CHIP_OK('toast', S.toast) ? S.toast : 'both';
    if (k === 'wine') return CHIP_OK('wine', S.wine) ? S.wine : 'mix';
    return '';
  }
  function CHIP_OK(k, v) { return (CHIPS[k] || []).some(function (c) { return c[0] === v; }); }
  function setChip(S, k, v) {
    if (!CHIP_OK(k, v)) return S;
    if (k === 'declare') {
      if (v === 'family') S.declareWho = 'family';
      else { S.declareWho = 'narr'; S.declare = (v === 'warm' ? '2' : v === 'clap' ? 'clap' : '1'); }
    } else if (k === 'tribute') S.tributeSay = v;
    else if (k === 'letter') S.letter = v;
    else if (k === 'toast') S.toast = v;
    else if (k === 'wine') S.wine = v;
    return S;
  }
  // 손으로 처음 담을 때의 기본 판(명세 5장)
  var DEF = { entry: 'A', declareWho: 'narr', declare: '1', tributeSay: 'one', letter: 'each', toast: 'both', wine: 'mix', candleWho: 'mothers' };

  /* ── 화촉 서는 분(연출 단계 · S.candleWho) ── */
  var CANDLE_WHO = [['mothers', '양가 어머님'], ['parents', '어머님과 아버님'], ['fathers', '아버님 두 분'], ['others', '다른 두 분']];

  /* ── 예시 넷(명세 5장) · on = 담는 순간(늘 있는 guest·entry 제외) · set = 판 ── */
  var EXAMPLES = [
    { k: 'record', nm: '기록', title: '부부가 되는 순간, 모두의 박수', on: ['candle', 'welcome', 'vow', 'ring', 'declare', 'toast'], set: { entry: 'A', declare: 'clap', toast: 'both', wine: 'mix' } },
    { k: 'promise', nm: '약속', title: '서로에게 쓴 말', on: ['candle', 'welcome', 'vow', 'ring', 'declare', 'letter', 'toast'], set: { entry: 'F', declare: 'warm', letter: 'each', toast: 'both', wine: 'mix' } },
    { k: 'family', nm: '가족', title: '부모님과 나누는 순간', on: ['candle', 'welcome', 'bless', 'vow', 'ring', 'declare', 'tribute', 'toast'], set: { entry: 'E', declare: 'solemn', tribute: 'long', toast: 'both', wine: 'family' } },
    { k: 'all', nm: '전부', title: '하나도 빼고 싶지 않아요', on: PICKABLE.slice(), set: { entry: 'A', declare: 'solemn', tribute: 'one', letter: 'parent', toast: 'both', wine: 'mix' } }
  ];
  function exampleOf(k) { for (var i = 0; i < EXAMPLES.length; i++) if (EXAMPLES[i].k === k) return EXAMPLES[i]; return null; }
  // 예시를 S 에 입힌다 — 순간은 통째로 바꾸고, 판은 기본 위에 예시 값을 얹는다
  function applyExample(S, k) {
    var ex = exampleOf(k); if (!ex) return S;
    S.on = {}; ex.on.forEach(function (x) { S.on[x] = 1; });
    S.entry = ex.set.entry || DEF.entry;
    setChip(S, 'declare', ex.set.declare || 'solemn');
    setChip(S, 'tribute', ex.set.tribute || DEF.tributeSay);
    setChip(S, 'letter', ex.set.letter || DEF.letter);
    setChip(S, 'toast', ex.set.toast || DEF.toast);
    setChip(S, 'wine', ex.set.wine || DEF.wine);
    S.pickFrom = k;
    return S;
  }

  /* ── 순서 계산 ── */
  function onOf(S, k) { return !!(ALWAYS[k] || (S && S.on && S.on[k])); }
  function seqOf(S) { return ORDER.filter(function (k) { return onOf(S, k); }); }       // guest 포함 · _close 제외
  function bodySeq(S) { return seqOf(S).filter(function (k) { return !PRE[k]; }).concat(['_close']); }   // 본식만 + 닫는 인사
  function picked(S) { return PICKABLE.filter(function (k) { return S && S.on && S.on[k]; }); }

  /* ── 시간 표(부록 A · 초) — [대본(성우), 사람 말, 말 없는 시간, 여유] ──
     ★«축배만 · 케이크만»은 명세가 «지금 코드 길이를 옮긴 뒤 코워크가 채운다»고 비워 둔 줄이다.
       지금 값은 **코드 추정**(엔진 문안 음절 · TOAST.est)이다 — 코워크가 채우면 이 두 줄만 바꾼다.
     ★입장 B·D 는 표에 없다(예시·기본이 안 쓰는 판). 문안 음절로 추정했다.
     ★«입장 첫 장면 · 함께 불 밝히기 +15초»는 첫 장면 키가 아직 없어 넣지 않았다(구현 보고). */
  var TIME = {
    prevideo: [7, 0, 180, 0],
    candle: [12.5, 0, 70, 38],
    entry: { A: [23, 0, 25, 42], B: [12, 0, 25, 42], C: [16, 0, 25, 42], D: [20, 0, 25, 42], E: [20, 0, 25, 42], F: [17, 0, 25, 42] },
    welcome: [5, 26, 8, 0],
    bless: [17, 153, 8, 20],
    vow: [21, 100, 8, 10],
    ring: { toDeclare: [20, 0, 80, 2], other: [20, 0, 68, 2] },
    declare: { solemn: [16, 0, 8, 36], warm: [12, 0, 8, 40], clap: [30, 0, 15, 15], family: [11, 15, 8, 30] },
    tribute: { one: [38, 34.7, 25, 30], long: [38, 138.8, 25, 30], none: [42.5, 0, 25, 30] },
    free: [12, 0, 188, 5],
    letter: { each: [19, 122, 16, 10], parent: [16, 138.8, 16, 10] },
    toast: {
      'both.none': [41, 0, 63, 106], 'both.mix': [47, 0, 88, 116], 'both.family': [53, 0, 88, 116],
      'toast.none': [22, 0, 20, 40], 'toast.mix': [28, 0, 45, 50], 'toast.family': [34, 0, 45, 50],   // ★코드 추정 · 코워크가 채움
      'cake.none': [26, 0, 35, 45]                                                                        // ★코드 추정 · 코워크가 채움
    },
    _close: { withTribute: [39, 0, 8, 13], noTribute: [39, 0, 13, 8] }
  };
  function partsOf(k, S, seq) {
    S = S || {}; seq = seq || bodySeq(S);
    var t = TIME[k], i = seq.indexOf(k);
    switch (k) {
      case 'entry': return t[String(S.entry || 'A').toUpperCase()] || t.A;
      case 'ring': return seq[i + 1] === 'declare' ? t.toDeclare : t.other;
      case 'declare': return t[chipOf('declare', S)];
      case 'tribute': return t[chipOf('tribute', S)];
      case 'letter': return t[chipOf('letter', S)];
      case 'toast': { var w = chipOf('toast', S); return t[w + '.' + (w === 'cake' ? 'none' : chipOf('wine', S))]; }
      case '_close': return seq.indexOf('tribute') > -1 ? t.withTribute : t.noTribute;
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
  /* ★[OPEN_RANGE] 고객에게 적는 범위(명세 8장) — «본식 10~30분쯤 · 사진과 인사 25~45분쯤»(둘을 더해 55분).
     사이트 · 빌더 안내 · AI 상담 · 진행표가 모두 이 값을 쓴다(scripts/check-source-drift.mjs 가 열 벌을 대조).
     ★«쯤»인 까닭 — 빈 채(입장·닫는 인사만)는 2~3분이고, 가장 긴 조합의 넉넉 합은 30.5분이다.
       예시 넷(11~28분)이 모두 이 안에 든다(scripts/audit/open-course.mjs 가 전 조합을 잰다). */
  var RANGE = { body: [10, 30], photo: [25, 45] };
  var DAYMIN = 55;   // 본식 + 사진과 인사 = DAY.total − ready − snap − farewell (ritual-data.js [DAY_PLAN]) · 검사가 대조
  function rng(x, y) { return x === y ? ('약 ' + x + '분') : ('약 ' + x + '~' + y + '분'); }
  // 띠 한 줄에 필요한 모든 값
  function span(S) {
    var s = bodySec(S), a = Math.round(s[0] / 60), b = Math.round(s[1] / 60);
    var pa = Math.round(DAYMIN - s[1] / 60), pb = Math.round(DAYMIN - s[0] / 60);
    return { sec: s, a: a, b: b, pa: pa, pb: pb, body: rng(a, b), photo: rng(pa, pb), midMin: (s[0] + s[1]) / 120 };
  }
  // 카드의 «약 n분»(이 순간을 담으면)
  function momentLabel(k, S) {
    if (PRE[k]) return '본식 시간에 들지 않아요';
    var on = {}; for (var x in (S.on || {})) on[x] = S.on[x]; if (k !== '_close') on[k] = 1;
    var T = {}; for (var y in S) T[y] = S[y]; T.on = on;
    var seq = bodySeq(T), r = lohi(partsOf(k, T, seq));
    return rng(Math.max(1, Math.round(r[0] / 60)), Math.max(1, Math.round(r[1] / 60)));
  }

  /* ── 절정(세기 5 가운데 마지막) — 선언 · 편지 · 400자 인사 ── */
  function level(k, S) { if (k === 'declare' || k === 'letter') return 5; if (k === 'tribute') return chipOf('tribute', S) === 'long' ? 5 : 4; return 3; }
  function peakOf(S) { var p = null; bodySeq(S).forEach(function (k) { if (level(k, S) === 5) p = k; }); return p; }

  /* ── 준비할 것 · [누구, 무엇] (부모님 몫은 «부모님께 여쭐 것») ── */
  function prepOf(k, S) {
    switch (k) {
      case 'prevideo': return [['couple', '영상 링크(3분 안 · 사흘 전까지)']];
      case 'candle': return [['parents', '화촉 · 불을 밝힐 두 분']];
      case 'entry': return [['couple', '선창 말투 · 첫 장면 고르기']];
      case 'welcome': return [['couple', '첫인사 한두 문장']];
      case 'bless': return [['parents', '덕담 원고 400자 안팎(저희가 받아 큰 글씨로)']];
      case 'vow': return [['couple', '서약문(비슷한 길이로)']];
      case 'ring': return [['couple', '반지(끼고 오셔도 돼요)']];
      case 'declare': return chipOf('declare', S) === 'family' ? [['parents', '선언을 읽을 가족 한 분']] : [];
      case 'tribute': { var t = chipOf('tribute', S); return t === 'none' ? [] : [['couple', t === 'long' ? '부모님께 드릴 말이나 편지 400자씩' : '부모님께 드릴 한마디씩']]; }
      case 'free': return [['couple', '준비한 순서 파일(3분 안)']];
      case 'letter': return [['couple', chipOf('letter', S) === 'each' ? '서로에게 편지 400자씩' : '부모님께 편지 400자씩']];
      case 'toast': {
        var w = chipOf('toast', S), wine = (w === 'cake') ? 'none' : chipOf('wine', S), out = [];
        if (wine === 'family') out.push(['parents', '양가에서 와인 한 병씩']);
        if (w !== 'cake') out.push(['couple', (wine === 'mix' ? '색이 다른 와인 두 병(또는 음료 둘) · ' : '') + '자리별 음료(좌석표)']);
        return out;
      }
    }
    return [];
  }

  /* ── 알림 셋(명세 3-6) — 한 번에 하나 · 하나라도 담은 뒤에만 · 위에서부터 먼저 걸리는 것 ──
     ★규칙은 여기 한 곳이다([THIN_WARN] 과 같은 원칙). 빌더도 엔진(meta.warn)도 이 함수를 부른다.
     ★옛 코스의 warnOf(마음 자리 · 선언 · 하객 맞이)는 새 코스에서 쓰지 않는다 — 빈 채로 열면 셋이 한꺼번에 뜬다. */
  var HEAVY = { bless: 1, vow: 1, tribute: 1, letter: 1 };
  var NOTICE = {
    heavy: '앉아서 듣는 순간이 셋 이어져요. 반지나 선언을 남겨 두면 사이가 풀려요. 반지는 끼고 오셔도 할 수 있어요.',
    twice: '부모님께 드리는 말이 두 번이에요. 인사를 «한마디씩»으로 바꾸면 겹치지 않아요.',
    toast: '축배는 술 대신 음료로도 해요. 남겨 두면 서른 분이 함께 잔을 들며 밝게 끝나요.'
  };
  function noticeOf(S) {
    if (!picked(S).length) return '';
    var seq = bodySeq(S), run = 0, mx = 0;
    seq.forEach(function (k) { run = HEAVY[k] ? run + 1 : 0; if (run > mx) mx = run; });
    if (mx >= 3) return NOTICE.heavy;
    if (seq.indexOf('tribute') > -1 && chipOf('tribute', S) === 'long' && seq.indexOf('letter') > -1 && chipOf('letter', S) === 'parent') return NOTICE.twice;
    var noToast = seq.indexOf('toast') < 0 || chipOf('toast', S) === 'cake';
    var last = seq[seq.length - 2];   // 닫는 인사 바로 앞
    if (noToast && (HEAVY[last] || last === 'declare' || seq.indexOf('declare') < 0)) return NOTICE.toast;
    return '';
  }

  /* ── 자리 문구(명세 3-3) ── */
  function slotText(k, S) {
    if (PRE[k]) return '하객이 앉는 동안 · 본식 앞';
    var order = ORDER.filter(function (x) { return !PRE[x]; }).concat(['_close']);
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
    if (!picked(S).length) return '아직 담은 순간이 없어요. 입장과 닫는 인사는 늘 있어요.';
    var ex = exampleOf(S.pickFrom);
    if (!ex) return '직접 고르셨어요.';
    var base = {}, bits = [], diff = 0;
    ex.on.forEach(function (x) { base[x] = 1; });
    PICKABLE.forEach(function (x) {
      if (onOf(S, x) && !base[x]) bits.push('+ ' + CARDS[x].sn);
      if (base[x] && !onOf(S, x)) bits.push('− ' + CARDS[x].sn);
    });
    var T = applyExample({}, ex.k);
    ['declare', 'tribute', 'letter', 'toast', 'wine'].forEach(function (c) {
      var home = c === 'wine' ? 'toast' : c;
      if (onOf(S, home) && chipOf(c, S) !== chipOf(c, T)) diff++;
    });
    if (diff) bits.push('판 바꿈 ' + diff);
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
    guest4Pre: '곧 예식을 시작하겠습니다. 오늘 예식은 미리 준비한 안내 음성으로 진행되고, 순서도 목소리도 신랑 신부가 정했습니다. 휴대폰은 잠시 진동 모드로 부탁드립니다. 입장 때 따로 일어서실 것 없습니다. 사진은 마음껏 남겨 주셔도 좋습니다. 이제, 두 사람을 기다리겠습니다.',
    prevideoIn: '두 분이 준비한 영상을 함께 보시겠습니다.',
    candleIn: {
      mothers: '예식의 시작을 알리는 촛불을 밝히겠습니다. 양가 어머님께서 앞으로 나와 주시겠습니다.',
      parents: '예식의 시작을 알리는 촛불을 밝히겠습니다. 양가 부모님께서 앞으로 나와 주시겠습니다.',
      fathers: '예식의 시작을 알리는 촛불을 밝히겠습니다. 양가 아버님께서 앞으로 나와 주시겠습니다.',   // ★명세 7장에 없는 판 — 4장 표의 «아버님 두 분»을 위해 같은 틀로 썼다(말맛은 사장님)
      others: '예식의 시작을 알리는 촛불을 밝히겠습니다. 양가를 대표하는 두 분께서 앞으로 나와 주시겠습니다.'
    },
    candleOut: '두 집의 불이 밝혀졌습니다. 따뜻한 박수 부탁드립니다.',
    clapAsk: '여러분은 방금 두 사람의 약속을 함께 지켜보셨습니다. 이 약속의 증인이 되어 주신다면, 큰 박수로 답해 주십시오.',
    clapDeclare: '오늘 이 자리에서, 두 사람은 서로의 평생이 되었습니다. 이제 두 사람은 부부입니다.',
    pourMix: '두 분이 각자 고른 와인을 한 잔에 붓습니다. 한 번 어우러진 맛은 다시 나뉘지 않지요.',
    pourFamily: '양가에서 한 병씩 고른 와인을, 이제 한 잔에 모읍니다.'
  };

  return {
    ORDER: ORDER, ALWAYS: ALWAYS, PRE: PRE, PICKABLE: PICKABLE, SECTIONS: SECTIONS, CARDS: CARDS,
    CHIPS: CHIPS, DEF: DEF, CANDLE_WHO: CANDLE_WHO, EXAMPLES: EXAMPLES, TIME: TIME, NOTICE: NOTICE, NAR: NAR, DAYMIN: DAYMIN, RANGE: RANGE,
    chipOf: chipOf, setChip: setChip, exampleOf: exampleOf, applyExample: applyExample, sameAsExample: sameAsExample,
    onOf: onOf, seqOf: seqOf, bodySeq: bodySeq, picked: picked, partsOf: partsOf, bodySec: bodySec, span: span, rng: rng,
    momentLabel: momentLabel, peakOf: peakOf, level: level, prepOf: prepOf, noticeOf: noticeOf, slotText: slotText, originOf: originOf
  };
});
