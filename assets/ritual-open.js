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
  /* ★★[SPEECH_IN_FREE 2026-09-25 코워크 회신 둘째 판 · 사장님 결정 4] «축하의 말»을 따로 두지 않는다 —
       친구 · 가족의 축사는 «준비한 순서»의 한 판이다(부모님께 인사 뒤 · 3분 안 · 드물게 쓰임).
       첫째 판의 speech 칸(선언 바로 뒤)은 거뒀다. 되살리지 말 것 — 사장님 «준비한 순서만 추가 가능하게».
     ★★[PREVIDEO_ALWAYS 2026-09-25 사장님 결정 2] 식전 영상은 늘 있다 — 영상이 없는 날은 두 분이 보낸 사진으로 저희가 3분 영상을 만든다. */
  var ORDER = ['guest', 'prevideo', 'candle', 'entry', 'welcome', 'bless', 'vow', 'ring', 'declare', 'tribute', 'free', 'letter', 'toast'];
  var ALWAYS = { guest: 1, entry: 1, prevideo: 1 };
  var PRE = { guest: 1, prevideo: 1 };          // 본식 시간에 들지 않는다(하객이 앉는 동안)
  var PICKABLE = ORDER.filter(function (k) { return !ALWAYS[k]; });

  var SECTIONS = [
    { n: '여는 순간', d: '예식이 시작되는 자리', ks: ['prevideo', 'candle', 'entry', 'welcome'] },
    { n: '약속의 순간', d: '말과 반지로 부부가 되는 자리', ks: ['bless', 'vow', 'ring', 'declare'] },
    { n: '마음의 순간', d: '부부가 되어 처음 건네는 마음', ks: ['tribute', 'letter'] },
    { n: '축하의 순간', d: '모두 함께 잔을 드는 자리', ks: ['toast'] },
    { n: '닫는 순간', d: '인사와 사진', ks: ['_close'] },
    /* [FREE_OWN 2026-09-25 코워크 4-4] 맨 아래 새 묶음 — 자리는 v4 그대로(인사 뒤)이고 목록에서만 따로 둔다 */
    { n: '특별히 준비한 것이 있다면', d: '특별히 준비한 순서가 있을 때만 담아요. 어느 예시에서 시작하셨든 더할 수 있고, 없어도 예식은 자연스럽게 이어져요.', ks: ['free'], own: true }
  ];

  /* ── 카드 문구(시안 2판 EV + 명세 4장 고침) ──
     n 화면 이름 · sn 짧은 이름(띠·목록) · one 한 줄 설명 · shot 남는 장면 · who 누가 · why 이 자리인 까닭 */
  var CARDS = {
    prevideo: { n: '식전 영상', sn: '식전 영상', one: '두 분이 준비한 영상(3분 안)을 하객이 자리에 앉는 동안 상영해요. 영상이 없으면 보내 주신 사진으로 저희가 3분 영상을 만들어요.', shot: '영상을 보는 가족들의 얼굴', who: '하객(두 분은 문 밖에서 기다려요)' },
    candle: { n: '화촉', sn: '화촉', one: '두 집을 대표해 촛불을 밝히며 예식의 시작을 알려요.', shot: '초에 불이 옮겨붙는 순간 · 불빛에 비친 얼굴',   /* [DETAIL_0925 B15] 서는 분에 따라 «누가»는 빌더가 바꾼다 */ who: '양가 어머님(누가 서실지는 두 분이 정해요)' },
    entry: { n: '입장', sn: '입장', one: '두 분이 함께 걸어 들어와, 서로 바라보거나 맞절하는 첫 장면을 남겨요.', shot: '문이 열리는 순간 · 두 분의 첫 장면', who: '두 분' },
    welcome: { n: '첫인사', sn: '첫인사', one: '두 분이 하객께 짧게 첫인사를 드려요.', shot: '하객을 바라보며 인사하는 두 분', who: '두 분' },
    bless: { n: '부모님 덕담', sn: '덕담', one: '부모님이 두 분께 덕담을 들려주세요(한 분 1분쯤).', shot: '말씀하시는 부모님과 듣는 두 분', who: '부모님 한 분~네 분', why: '서약 바로 앞이에요. 부모님 말씀으로 약속의 문을 여는 자리예요.' },
    vow: { n: '혼인 서약', sn: '서약', one: '두 분이 서로에게 하는 약속을 읽어요(한 분 1분쯤).', shot: '서로를 보며 약속하는 옆얼굴', who: '두 분' },
    ring: { n: '반지 교환', sn: '반지', one: '서로의 손에 반지를 끼워 줘요.', shot: '반지를 끼워 주는 두 손', who: '두 분(건네는 손은 가족 · 아이도 돼요)' },
    declare: { n: '성혼 선언', sn: '선언', one: '두 분이 부부가 되었음을 알려요. 말투와 누가 선언할지 고를 수 있어요.', shot: '서른 분이 박수 치는 넓은 장면', who: '성우 또는 가족 한 분 · 하객은 박수' },
    tribute: { n: '부모님께 인사', sn: '부모님 인사', one: '부부가 되어 처음 부모님께 드리는 인사예요. 꽃과 인사, 포옹으로 고마움을 전해요. 원하시면 신랑은 큰절로 해요(신부는 드레스라 서서 인사해요).', /* [BOW_GROOM] [LIST_NAMES] 띠 칩 «부모님 인사» */  shot: '부모님께 안기는 순간', who: '두 분 · 양가 부모님', why: '선언 다음이에요. 부부가 된 뒤 처음 드리는 인사라서예요(한국 예식의 오랜 차례).' },
    free: { n: '준비한 순서', sn: '준비한 순서',   /* [DETAIL_0925 B3] «두 사람이» 는 친구가 축사하는 날 틀린 이름이 된다 */ one: '두 분이나 가족 · 친구가 특별히 준비한 순서가 있을 때 담아요. 영상, 춤 · 공연, 깜짝 선물, 친구의 짧은 축사(3분 안). 라이브 노래 · 연주는 받지 않아요. 영상 속 노래 · 연주, 음원에 맞춘 춤은 괜찮아요.', shot: '함께 보며 웃는 하객들', /* [FREE_WHAT] shot 은 shotOf 가 무엇을에 따라 고른다 */  who: '두 분 · 준비한 가족이나 친구', why: '편지 앞이에요. 편지가 마지막 큰 순간이 되도록.' },
    letter: { n: '편지 낭독', sn: '편지', one: '부모님께, 또는 서로에게 쓴 편지를 읽어요.', shot: '편지를 읽는 목소리와 듣는 얼굴', who: '두 분' },
    toast: { n: '케이크 · 축배', sn: '케이크 · 축배', /* [DETAIL_0925 B3] 순간 이름은 «케이크 · 축배» 하나 — 칩 «케이크와 축배»(둘 다)는 그대로 */  one: '케이크를 함께 자르고, 모두 잔을 들어 «위하여». 잔을 드는 자리는 여기 하나예요.', shot: '자르는 손 · 섞이는 잔 · 서른 개의 잔', who: '두 분 · 하객 모두', why: '와인도 여기서 해요. 두 분이 두 와인을 한 잔에 붓는 일과 모두의 «위하여»를 한자리에 모았어요(잔 드는 순간이 둘로 갈리지 않게).' },
    _close: { n: '닫는 인사', sn: '닫는 인사', one: '두 분이 인사를 드리고 본식을 마쳐요. 이어서 가족 · 하객과 사진을 남겨요.', shot: '두 분 뒤로 보이는 하객들 · 단체 사진', who: '두 분 · 하객 모두' }
  };

  /* ── 판 칩(카드 안 · 담은 뒤에만 보인다) ──
     값은 **기존 S 키**에 그대로 쓴다 — 엔진과 연출 단계가 이미 읽는 자리라 새 번역이 없다.
       declare → S.declareWho / S.declare   ([DECLARE_CLAP] 'clap' 은 새 판 · ask/chorus 와 별개)
       tribute → S.tributeSay (새 키 · 말의 길이) — 방식(꽃·포옹)은 연출 단계의 S.tribute 그대로
       letter  → S.letter   (both 는 새 코스 칩에 없다 · 옛 코스엔 그대로)
       toast   → S.toast · S.wine (새 키 · 축배가 있을 때만) */
  var CHIPS = {
    declare: [['solemn', '나레이션 · 엄숙하게'], ['warm', '나레이션 · 따뜻하게'],   /* [LAB_FIX2 코워크 추가전달 2-6] «성우» → «나레이션»(목소리가 AI 나레이션 · 흐름 · 요약 · ④와 같게) */ ['clap', '하객 박수로 답하기'], ['family', '가족이 낭독']],
    tribute: [['one', '한마디씩'], ['long', '1분쯤씩'], ['none', '말 없이']],   /* [DETAIL_0925 E] 준비 목록에는 «한 분 400자 안팎» */
    letter: [['each', '서로에게'], ['parent', '각자 부모님께']],
    toast: [['both', '케이크와 축배'], ['toast', '축배만'], ['cake', '케이크만']],
    wine: [['mix', '두 와인을 한 잔에'], ['family', '양가 와인 한 병씩'], ['none', '붓지 않음']],
    /* ★[FREE_WHAT 2026-09-25 코워크 4-4] 준비한 순서 — 무엇을 × 길이. 라이브 노래 · 연주는 받지 않는다(사장님 결정 1 · 4). */
    /* [DETAIL_0925 E] 여섯 → 넷(FREE_KIND 네 갈래와 같게). 옛 값 dance · show · hand 는 chipOf · norm 이 갈래로 옮긴다 */
    free: [['video', '영상'], ['stage', '춤 · 공연'], ['gift', '깜짝 선물 · 전달'], ['speech', '친구 · 가족의 축사']],
    freeLen: [['3', '3분'], ['2', '2분'], ['1', '1분']],
    /* ★[ENTRY_SCENE 2026-09-25 코워크 회신 4-3 · 추가 전달 B7] 입장의 «첫 모습»(새 키 하나) — 서로 바라보기 · 맞절.
       소리는 같다(모습 · 영상만 달라진다) · 시간표 그대로. 새 코스에만 · 옛 코스는 norm 이 look 으로 둔다. */
    entryScene: [['look', '서로 바라보기'], ['bow', '맞절']]
  };
  // 준비한 순서의 무엇을 → 여는 말 · 준비할 것 · 남는 장면의 갈래(영상 / 무대 / 건네기)
  var FREE_KIND = { video: 'video', stage: 'stage', dance: 'stage', show: 'stage', gift: 'gift', hand: 'gift', speech: 'speech' };
  var FREE_OLD = { dance: 'stage', show: 'stage', hand: 'gift' };   // 옛 칩 값 → 갈래
  // 칩 값 ↔ S
  function chipOf(k, S) {
    S = S || {};
    if (k === 'declare') return S.declareWho === 'family' ? 'family' : S.declare === 'clap' ? 'clap' : S.declare === '2' ? 'warm' : 'solemn';
    if (k === 'tribute') return CHIP_OK('tribute', S.tributeSay) ? S.tributeSay : 'one';
    if (k === 'letter') return S.letter === 'parent' ? 'parent' : 'each';
    if (k === 'toast') return CHIP_OK('toast', S.toast) ? S.toast : 'both';
    if (k === 'wine') return CHIP_OK('wine', S.wine) ? S.wine : 'mix';
    if (k === 'free') { var fv = FREE_OLD[S.freeWhat] || S.freeWhat; return CHIP_OK('free', fv) ? fv : 'video'; }
    if (k === 'freeLen') return CHIP_OK('freeLen', String(S.freeLen)) ? String(S.freeLen) : '3';
    if (k === 'entryScene') return S.entryScene === 'bow' ? 'bow' : 'look';
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
    else if (k === 'free') S.freeWhat = v;
    else if (k === 'freeLen') S.freeLen = v;
    else if (k === 'entryScene') S.entryScene = v;
    return S;
  }
  /* 판 이름(목록 · 띠) — 칩 이름과 같되 둘만 다르다.
     ★[TRIBUTE_CROSS 2026-09-25 코워크 4-6] 인사 «한마디씩» + 편지 «각자 부모님께»를 함께 담으면
       인사 한마디는 **서로의** 부모님께 드린다(신랑 → 장인 · 장모님, 신부 → 시부모님) — 편지와 겹치지 않는다.
     ★준비한 순서는 «영상 · 3분»처럼 둘을 한 이름으로. */
  function crossTribute(S) { return onOf(S, 'tribute') && chipOf('tribute', S) === 'one' && onOf(S, 'letter') && chipOf('letter', S) === 'parent'; }
  function chipLabel(k, S) {
    if (k === 'tribute' && crossTribute(S)) return '서로의 부모님께 한마디씩';
    if (k === 'free') return labelOf('free', chipOf('free', S)) + ' · ' + labelOf('freeLen', chipOf('freeLen', S));
    return labelOf(k, chipOf(k, S));
  }
  function labelOf(k, v) { var c = (CHIPS[k] || []).filter(function (x) { return x[0] === v; })[0]; return c ? c[1] : ''; }
  // 손으로 처음 담을 때의 기본 판(명세 5장)
  var DEF = { entry: 'A', declareWho: 'narr', declare: '1', tributeSay: 'one', letter: 'each', toast: 'both', wine: 'mix', candleWho: 'mothers', freeWhat: 'video', freeLen: '3', entryScene: 'look' };

  /* ── 화촉 서는 분(연출 단계 · S.candleWho) ── */
  var CANDLE_WHO = [['mothers', '양가 어머님'], ['parents', '어머님과 아버님'], ['fathers', '아버님 두 분'], ['others', '다른 두 분']];

  /* ── 예시 넷(명세 5장) · on = 담는 순간(늘 있는 guest·entry 제외) · set = 판 ── */
  /* ★★[EXAMPLES_0925 2026-09-25 사장님 결정 3 · 코워크 회신 둘째 판 4-5] 기록 · 약속에 부모님께 인사를 더함 ·
       전부는 인사 한마디를 «서로의 부모님께»(편지를 각자 부모님께 쓰므로 · TRIBUTE_CROSS).
     ★식전 영상은 넷 모두 늘 있다(PREVIDEO_ALWAYS). 준비한 순서는 어느 예시에도 없다 — «고객이 특별히 준비했을 때만 · 몇 없음»(사장님).
       기록은 12~17분 그대로(«시간보다 자연스러운 예식» — 사장님). */
  var EXAMPLES = [
    { k: 'record', nm: '기록', title: '부부가 되는 순간, 모두의 박수', on: ['candle', 'welcome', 'vow', 'ring', 'declare', 'tribute', 'toast'], set: { entry: 'A', declare: 'clap', tribute: 'none', toast: 'both', wine: 'mix' } },
    { k: 'promise', nm: '약속', title: '서로에게 쓴 말', on: ['candle', 'welcome', 'vow', 'ring', 'declare', 'tribute', 'letter', 'toast'], set: { entry: 'F', declare: 'warm', tribute: 'one', letter: 'each', toast: 'both', wine: 'mix' } },
    { k: 'family', nm: '가족', title: '부모님과 나누는 순간', on: ['candle', 'welcome', 'bless', 'vow', 'ring', 'declare', 'tribute', 'toast'], set: { entry: 'E', declare: 'solemn', tribute: 'long', toast: 'both', wine: 'family' } },
    { k: 'all', nm: '전부', title: '하나도 빼고 싶지 않아요', on: PICKABLE.filter(function (k) { return k !== 'free'; }), set: { entry: 'A', declare: 'solemn', tribute: 'one', letter: 'parent', toast: 'both', wine: 'mix' } }
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
    setChip(S, 'free', ex.set.free || DEF.freeWhat);
    setChip(S, 'freeLen', ex.set.freeLen || DEF.freeLen);
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
    free: [12, 0, 188, 5],   // [FREE_WHAT] 말 없는 시간은 길이 칩에서 — 60 × 분 + 8(3분 188 · 2분 128 · 1분 68)
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
      case 'free': { var fl = +chipOf('freeLen', S);   // 축사 판: 여는 말 14 · 사람 말 60×분−20 · 걸음 12 · 여유 10(2분이면 대본 126 · 넉넉 161)
        return FREE_KIND[chipOf('free', S)] === 'speech' ? [14, 60 * fl - 20, 12, 10] : [t[0], t[1], 60 * fl + 8, t[3]]; }
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
  var RANGE = { body: [12, 25], photo: [25, 38], rep: 20 };
  var DAYMIN = 50;   // 본식 + 사진과 인사 = DAY.total − ready − snap − farewell (ritual-data.js [DAY_PLAN]) · open-course.mjs 가 대조
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

  /* ── 준비할 것 · [누구, 무엇, 갈래] ──
     누구: couple = «두 분이 준비할 것» · parents = «부모님께 부탁드릴 것» (이 이름 한 쌍을 ① 상자 · ② 칸 · ③ · 마이페이지에 똑같이)
     ★[DETAIL_0925 B2] 갈래: write 쓸 글 · send 보낼 것 · bring 챙길 것 · ask 부탁드릴 것 — 모두 ③ 준비하기 한 곳에 모인다.
     ★마감은 글에 «예식 3일 전까지»가 들어 있으면 3일 · 없으면 7일(prepList).
     ★케이크 · 부모님께 드릴 꽃은 누가 준비하는지 지금 코드 문구에 없어 넣지 않았다(코워크 F · 사장님 결정 대기). */
  var CANDLE_ASK = { mothers: '양가 어머님께서', parents: '양가 어머님과 아버님께서', fathers: '양가 아버님께서' };
  /* ★★[PREP_DUE 2026-09-25 코워크 회신3 3-4(a)] 마감은 글에서 읽지 않고 항목 데이터로 둔다.
     항목 = [누가, 무엇(마감 말 없이), 갈래, 마감, 마감 없을 때 한 줄]
       마감 3 = 예식 3일 전까지 · 7 = 예식 7일 전까지 · 0 = 당일 가져오기 · null = 마감 없음(한 줄로 말한다)
     ★종전엔 글에 «3일 전»이 있으면 3, 없으면 7 이었다 — 반지 · 와인까지 «예식 7일 전까지»가 붙었다.
     ★고객 화면의 마감 말은 «예식 7일 전» · «예식 3일 전» · «당일» 셋뿐이다([P12] · dueWord 한 곳에서 만든다). */
  var NOTE_READ = '당일 직접 읽어요 · 보내지 않아도 돼요', NOTE_ASK = '미리 말씀드려 두세요';
  function prepOf(k, S) {
    switch (k) {
      case 'guest': return S && S.guestVoice === 'couple' ? [['couple', '하객 맞이 안내 녹음 · 대본을 드려요(휴대폰 음성 메모로 충분해요)', 'send', 7]] : [];
      case 'prevideo': return [['couple', '영상 링크(3분 안) 또는 사진 30~40장', 'send', 3]];   // [PREVIDEO_ALWAYS]
      case 'candle': { var cw = (S && S.candleWho) || DEF.candleWho;
        return cw === 'others' ? [['couple', '화촉을 밝혀 주실 두 분께 부탁드리기', 'ask', null, NOTE_ASK]] : [['parents', '화촉 · ' + (CANDLE_ASK[cw] || CANDLE_ASK.mothers) + ' 불을 밝혀 주세요', 'ask', null, NOTE_ASK]]; }
      case 'entry': return S && S.entryVoice === 'couple' ? [['couple', '입장 인사 녹음 · 대본을 드려요(휴대폰 음성 메모로 충분해요)', 'send', 7]] : [];   // [LISTEN_PAGE] 말투 · 첫 모습은 ② 에서 고른다
      case 'welcome': return [['couple', '첫인사 한두 문장', 'write', 7]];
      case 'bless': return [['parents', '덕담 원고 · 한 분 400자 안팎(저희가 받아 큰 글씨로)', 'ask', 7]];
      case 'vow': return [['couple', '서약문(비슷한 길이로)', 'write', 7]];
      case 'ring': return [['couple', '반지 두 개 · 평소 끼던 반지여도 괜찮아요', 'bring', 0]];
      case 'declare': return chipOf('declare', S) === 'family' ? [['parents', '선언을 읽을 가족 한 분', 'ask', null, NOTE_ASK]] : [];
      case 'tribute': { var t = chipOf('tribute', S); return t === 'none' ? [] : [['couple', t === 'long' ? '부모님께 드릴 말 · 한 분 400자 안팎' : crossTribute(S) ? '서로의 부모님께 드릴 한마디씩' : '부모님께 드릴 한마디씩', 'write', null, NOTE_READ]]; }
      case 'free': {   // [FREE_WHAT] 무엇을 · 길이가 곧장 반영된다
        var fk = FREE_KIND[chipOf('free', S)], n = chipOf('freeLen', S);
        if (fk === 'video') return [['couple', '영상 파일(가로 · ' + n + '분 안)', 'send', 3]];
        if (fk === 'stage') return [['couple', '음원 파일(' + n + '분 안) · 설 자리 폭 알려 주기', 'send', 3]];
        if (fk === 'speech') return [['couple', '축사하실 분께 부탁드리기 · 원고(분당 300자 안팎 · 큰 글씨로 돌려드려요) · 원고에 전 연인 · 술자리 이야기는 빼 주세요', 'ask', 3]];
        return [['couple', '무엇을 누가 건넬지 알려 주기(저희가 자리를 맞춰요)', 'send', 7]];
      }
      case 'letter': return [['couple', chipOf('letter', S) === 'each' ? '서로에게 편지 400자씩' : '부모님께 편지 400자씩', 'write', null, NOTE_READ]];
      case 'toast': {
        var w = chipOf('toast', S), wine = (w === 'cake') ? 'none' : chipOf('wine', S), out = [];
        if (wine === 'family') out.push(['parents', '양가에서 와인 한 병씩', 'ask', 0]);
        if (wine === 'mix') out.push(['couple', '색이 다른 와인 두 병(또는 음료 둘)', 'bring', 0]);
        if (w !== 'cake') out.push(['couple', '자리마다 축배 음료 알려 주기(좌석표에서)', 'send', 7]);   // [P10 코워크 회신3] «정하기» → «알려 주기»(같은 갈래 «건넬지 알려 주기»와 같은 꼴)
        return out;
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
  function studioOf(k, S) {
    if (k === 'toast' && chipOf('toast', S) !== 'toast') return ['케이크'];
    if (k === 'tribute') return ['부모님께 드릴 꽃'];
    return [];
  }
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
    twice: '부모님께 드리는 말이 두 번이에요. 인사를 «한마디씩»으로 바꾸면 겹치지 않아요.',
    toast: '끝이 조용한 편이에요. «케이크 · 축배»를 담으면 서른 분이 함께 잔을 들며 밝게 끝나요(술 대신 음료도 돼요).',
    /* [NOTICE_0925 코워크 4-7] 뒤쪽 사슬(인사 · 축사 · 편지) — 앞쪽(덕담 · 서약)은 위 heavy 그대로 */
    heavyBack: '앉아서 듣는 순간이 셋 이어져요. 부모님께 인사를 «말 없이»로 하면 사이가 풀려요.',
    /* [NOTICE_0925 코워크 4-1] 알림 ④ — 맨 뒤 차례. N 은 내림(«약 N분»은 그보다 줄지 않는다는 뜻) */
    short: function (n) { return '천천히 진행되면 사진과 인사가 약 ' + n + '분으로 줄어요. 단체 · 가족 사진은 그대로 두고, 테이블 인사와 두 분 쉬는 시간을 줄여요.'; }
  };
  var SHORT_MIN = 23;   // 사진과 인사가 이보다 짧아질 수 있으면(늦어진 날) 알림 ④
  function noticeOf(S) {
    if (!picked(S).length) return '';
    var seq = bodySeq(S), run = 0, mx = 0, head = '', mxHead = '';
    seq.forEach(function (k) { if (heavy(k, S)) { if (!run) head = k; run++; } else run = 0; if (run > mx) { mx = run; mxHead = head; } });
    if (mx >= 3) return (mxHead === 'bless' || mxHead === 'vow') ? NOTICE.heavy : NOTICE.heavyBack;
    if (seq.indexOf('tribute') > -1 && chipOf('tribute', S) === 'long' && seq.indexOf('letter') > -1 && chipOf('letter', S) === 'parent') return NOTICE.twice;
    var noToast = seq.indexOf('toast') < 0 || chipOf('toast', S) === 'cake';
    var last = seq[seq.length - 2];   // 닫는 인사 바로 앞
    if (noToast && picked(S).length > 3 && (heavy(last, S) || last === 'declare' || seq.indexOf('declare') < 0)) return NOTICE.toast;   // [DETAIL_0925 A2] 고른 순간이 셋 넘을 때만
    var pa = span(S).pa;   // [DETAIL_0925 A2] 띠의 «사진과 인사» 아래 값과 같은 반올림
    if (pa < SHORT_MIN) return NOTICE.short(pa);
    return '';
  }
  /* ★[DETAIL_0925 A2] 알림 한 덩어리 — 글 · 풀어 주는 단추 · 닫기.
     key 는 «같은 상황»을 가린다(괜찮아요로 닫은 알림은 같은 상황에선 다시 안 뜬다 · 상황이 바뀌면 다시 뜬다).
     ④(사진 시간 부족)는 닫지 않는다. 단추 act = [키, 값] — 빌더가 그대로 적용한다(on:키 는 담기). */
  function noticeFull(S) {
    var msg = noticeOf(S); if (!msg) return null;
    var seq = bodySeq(S), n = { msg: msg, acts: [], close: true, key: '' };
    if (msg === NOTICE.heavy || msg === NOTICE.heavyBack) {
      var run = [], best = [];
      seq.forEach(function (k) { if (heavy(k, S)) { run.push(k); if (run.length > best.length) best = run.slice(); } else run = []; });
      var three = best.slice(0, 3);
      n.msg = three.map(function (k) { return CARDS[k].n; }).join(' → ') + ' · 말로 듣는 순서가 셋 이어져요. ' + (msg === NOTICE.heavyBack ? '부모님께 인사를 «말 없이»로 하면 사이가 풀려요.' : '반지나 선언을 담으면 사이가 풀려요. 반지는 끼고 오셔도 할 수 있어요.');
      if (best.indexOf('tribute') > -1) n.acts.push(['인사를 말 없이로', 'tribute', 'none']);
      else { if (!onOf(S, 'ring')) n.acts.push(['반지 교환 담기', 'on', 'ring']); if (!onOf(S, 'declare')) n.acts.push(['성혼 선언 담기', 'on', 'declare']); }
      n.key = 'heavy:' + three.join(',');
    } else if (msg === NOTICE.twice) { n.acts.push(['인사를 한마디씩으로', 'tribute', 'one']); n.key = 'twice'; }
    else if (msg === NOTICE.toast) { n.acts.push(onOf(S, 'toast') ? ['케이크와 축배로', 'toast', 'both'] : ['케이크 · 축배 담기', 'on', 'toast']); n.key = 'toast'; }
    else { n.close = false; n.key = 'short'; }
    return n;
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
    if (!picked(S).length) return '아직 담은 순간이 없어요. 식전 영상 · 입장 · 닫는 인사는 늘 있어요.';   // [WHY_NEIGHBOR 2-7] PREVIDEO_ALWAYS
    var ex = exampleOf(S.pickFrom);
    if (!ex) return '직접 고르셨어요.';
    var base = {}, bits = [], diff = 0;
    ex.on.forEach(function (x) { base[x] = 1; });
    PICKABLE.forEach(function (x) {
      if (onOf(S, x) && !base[x]) bits.push('+ ' + CARDS[x].sn);
      if (base[x] && !onOf(S, x)) bits.push('− ' + CARDS[x].sn);
    });
    var T = applyExample({}, ex.k);
    ['declare', 'tribute', 'letter', 'toast', 'wine', 'free', 'freeLen'].forEach(function (c) {
      var home = c === 'wine' ? 'toast' : c === 'freeLen' ? 'free' : c;
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
      speech: '두 분을 오래 지켜본 분께서, 축하의 말을 준비하셨습니다.'
    },
    freeOut: '따뜻한 박수 부탁드립니다.',
    freeFail: '이 순서는 잠시 뒤, 사진 시간에 함께 보겠습니다.',
    bowGroom: '신랑은 큰절로, 신부는 고개 숙여, 부모님께 감사를 올립니다.',
    toastBothPour: '다음은 축배입니다. 우리도 다 같이 잔을 들어요. 제가 위하여, 하면 다 함께 위하여, 하고 답해 주세요. 두 사람의 새로운 시작을 위하여!'
  };

  /* ── 남는 장면(«그날 남는 사진» · 코워크 1장 고침) — 준비한 순서는 무엇을에 따라 ── */
  var FREE_SHOT = { video: '함께 보며 웃는 하객들', stage: '무대를 보며 웃는 두 분', gift: '선물을 건네받는 두 분', speech: '말하는 분을 보며 웃는 두 분' };
  function shotOf(k, S) { return k === 'free' ? FREE_SHOT[FREE_KIND[chipOf('free', S)]] : (CARDS[k] || {}).shot; }

  /* ── 도와주실 분(코워크 5-6) — 두 분 준비 · 마이페이지 준비 칸. [누가, 언제] ──
     ★«식사 자리로 안내할 분»은 애프터 웨딩을 고른 날만이라 식순만으로는 모른다 — 마이페이지가 덧붙인다(mealGuide). */
  function helpersOf(S, opt) {
    opt = opt || {};
    var out = [];
    if (onOf(S, 'free') && FREE_KIND[chipOf('free', S)] !== 'video') out.push(['준비한 순서를 맡을 분', '담은 날 · 축사 · 공연 · 선물 전달을 하실 분']);
    if (onOf(S, 'ring')) out.push(['반지를 건넬 아이나 가족', '반지 교환을 담았을 때']);   // [HELPER_WORDS 3-4(f)]
    out.push(['어르신을 모실 분', '양가 한 분 · 사진 때']);
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
    bless: '부모님 말씀으로 약속의 문을 여는 자리예요.',
    tribute: '부부가 된 뒤 처음 드리는 인사라서예요(한국 예식의 오랜 차례).',
    free: '마지막 큰 순간이 앞에 몰리지 않도록 뒤쪽에 둬요.'
  };
  var WHY_NEXT = { bless: 'vow', free: 'letter' }, WHY_PREV = { tribute: 'declare' };
  function whyOf(k, S) {
    var c = CARDS[k]; if (!c || !c.why) return '';
    if (WHY_NEXT[k] && S && !onOf(S, WHY_NEXT[k])) return WHY_ALONE[k];
    if (WHY_PREV[k] && S && !onOf(S, WHY_PREV[k])) return WHY_ALONE[k];
    return c.why;
  }
  function prepList(S) {
    var out = [];
    ORDER.filter(function (k) { return onOf(S, k); }).forEach(function (k) {
      prepOf(k, S).forEach(function (q) { out.push({ k: k, who: q[0], what: q[1], cat: q[2] || 'send', due: q[3] === undefined ? 7 : q[3], note: q[4] || '' }); });   // [PREP_DUE]
    });
    return out;
  }

  /* ★★[LISTEN_PAGE 2026-09-25 코워크 회신 4장 · 사장님 결정] ② 보고 듣기 · 순간 영상의 원천.
     SCENE      장면 영상이 없을 때 자리에 쓰는 한 줄(무엇이 보일지)
     VIDEO_READY 들어온 장면 영상 이름 — ★파일이 오면 이 목록에 이름만 더한다(① 카드 · ② · ④ 가 함께 바뀐다).
                 파일: /assets/video/moments/<이름>.mp4 (16:9 · 1280×720 · 5~8초 · 소리 없음) + <이름>.webp(첫 장면)
     videoKeys  한 순간이 쓰는 장면 이름들(판에 따라 · 차례대로) — 케이크만 cake · 축배만 toast · 둘 다 cake → toast
     talkOf     사람이 말하는 자리의 글 카드(«여기서 … · 약 n분») — 보고 듣기는 그 자리를 기다리지 않고 3초 보여 주고 넘어간다 */
  var SCENE = {
    guest: '테이블에 앉는 하객들 사이로 촛불이 흔들려요', prevideo: '불을 낮춘 방 · 화면 빛을 받는 하객들의 뒷모습',
    candle: '두 손이 긴 초에 불을 옮겨요', entry: '문이 열리고 두 분이 함께 걸어 들어와요',
    welcome: '두 분이 하객 쪽으로 서서 고개 숙여 인사해요', bless: '자리에서 마이크를 든 부모님 · 듣는 두 분의 뒷모습',
    vow: '마주 선 두 분 · 카드를 든 손', ring: '반지를 끼워 주는 두 손', declare: '촛불 속 테이블의 하객들이 박수를 쳐요',
    tribute: '두 분이 부모님께 꽃을 건네고 안겨요', free: '앞을 바라보며 웃는 하객들', letter: '편지지를 든 손 · 듣는 사람의 흐린 옆얼굴',
    toast: '잔들이 함께 올라가요', _close: '두 분이 인사하고 · 하객들이 앞으로 모여요'
  };
  var VIDEO_DIR = '/assets/video/moments/';
  var VIDEO_READY = [];
  function videoKeys(k, S) {
    if (k === 'toast') { var w = chipOf('toast', S), pour = w !== 'cake' && chipOf('wine', S) !== 'none';
      return (w === 'toast' ? [] : ['cake']).concat(w === 'cake' ? [] : (pour ? ['toast-pour', 'toast'] : ['toast'])); }
    if (k === 'entry') return ['entry', chipOf('entryScene', S) === 'bow' ? 'entry-bow' : 'entry-look'];
    if (k === 'tribute') return S && S.tribute === 'bowGroom' ? ['tribute', 'tribute-bow'] : ['tribute'];
    if (k === '_close') return ['close'];
    return [k];
  }
  function videoOf(name) { return VIDEO_READY.indexOf(name) < 0 ? null : { mp4: VIDEO_DIR + name + '.mp4', poster: VIDEO_DIR + name + '.webp' }; }
  function firstVideo(k, S) { var ks = videoKeys(k, S); for (var i = 0; i < ks.length; i++) { if (videoOf(ks[i])) return videoOf(ks[i]); } return null; }
  function secTxt(x) { return x < 55 ? ('약 ' + Math.max(10, Math.round(x / 10) * 10) + '초') : ('약 ' + Math.round(x / 60) + '분'); }
  function talkOf(k, S) {
    var fk, n, p = 0;
    try { p = (partsOf(k, S) || [])[1] || 0; } catch (e) { p = 0; }
    switch (k) {
      case 'welcome': return '두 분이 하객께 첫인사를 해요 · ' + secTxt(p || 30);
      case 'bless': return '부모님이 덕담을 들려주세요 · ' + secTxt(p || 150);
      case 'vow': return '두 분이 서약을 읽어요 · ' + secTxt(p || 100);
      case 'declare': return chipOf('declare', S) === 'family' ? '가족 한 분이 성혼 선언문을 읽어요 · ' + secTxt(p || 15) : '';
      case 'tribute': { var t = chipOf('tribute', S); if (t === 'none') return '';
        return (crossTribute(S) ? '두 분이 서로의 부모님께 한마디씩 해요' : t === 'long' ? '두 분이 부모님께 준비한 말을 전해요' : '두 분이 부모님께 한마디씩 해요') + ' · ' + secTxt(p || 30); }
      case 'letter': return (chipOf('letter', S) === 'each' ? '두 분이 서로에게 쓴 편지를 읽어요' : '두 분이 각자 부모님께 쓴 편지를 읽어요') + ' · ' + secTxt(p || 120);
      case 'free': fk = FREE_KIND[chipOf('free', S)]; n = chipOf('freeLen', S);
        if (fk === 'speech') return '준비한 분이 축하의 말을 해요 · 약 ' + n + '분';
        return chipLabel('free', S) + ' · 보고 듣기에서는 건너뛰어요';
    }
    return '';
  }

  return {
    SCENE: SCENE, VIDEO_DIR: VIDEO_DIR, VIDEO_READY: VIDEO_READY, videoKeys: videoKeys, videoOf: videoOf, firstVideo: firstVideo, talkOf: talkOf, secTxt: secTxt,
    prepList: prepList, whyOf: whyOf, PREP_CAT: PREP_CAT, dueWord: dueWord, studioOf: studioOf,
    ORDER: ORDER, ALWAYS: ALWAYS, PRE: PRE, PICKABLE: PICKABLE, SECTIONS: SECTIONS, CARDS: CARDS,
    CHIPS: CHIPS, DEF: DEF, CANDLE_WHO: CANDLE_WHO, EXAMPLES: EXAMPLES, TIME: TIME, NOTICE: NOTICE, NAR: NAR, DAYMIN: DAYMIN, RANGE: RANGE,
    FREE_KIND: FREE_KIND, SHORT_MIN: SHORT_MIN, heavy: heavy, chipLabel: chipLabel, labelOf: labelOf, crossTribute: crossTribute, shotOf: shotOf, helpersOf: helpersOf,
    chipOf: chipOf, setChip: setChip, exampleOf: exampleOf, applyExample: applyExample, sameAsExample: sameAsExample,
    onOf: onOf, seqOf: seqOf, bodySeq: bodySeq, picked: picked, partsOf: partsOf, bodySec: bodySec, span: span, rng: rng,
    momentLabel: momentLabel, peakOf: peakOf, level: level, prepOf: prepOf, noticeOf: noticeOf, noticeFull: noticeFull, slotText: slotText, originOf: originOf
  };
});
