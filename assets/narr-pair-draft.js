// 모먼트에디트 · 순간 사이 연결 멘트 «초안» (내부 검토용 · 아직 원천이 아니다)  [PAIR_DRAFT]
//
// ★2026-10-09 사장님 작업 순서 — ① 연결 멘트를 경우의 수대로 전부 만든다 ② 나레이션 전용 테스트 도구로
//   하나씩 들으며 검토 ③ 개선 ④ 나중에 적용. 이 파일은 ①이고, 도구는 pair-7c2e.html · flow-7c2e.html 이 읽는다.
// ★엔진(assets/ritual-cue.js)은 이 파일을 읽지 않는다 — 고객 화면 · 당일 진행에는 아무 변화가 없다.
//   확정되면 문안을 assets/ritual-open.js NAR 로 옮기고 엔진 build() 의 [BRIDGE_LINK] 자리에 규칙을 넣은 뒤 이 파일을 지운다.
// ★고르는 규칙(lineOf) — «앞>다음» 짝 줄이 있으면 그것, 없으면 «다음» 기본 줄. 빈 글('')은 «말 없음».
//   PAIR 에 짝을 하나 넣으면 그 짝만 바뀐다(검토하며 짝마다 다르게 고칠 수 있다).
(function (root, factory) {
  var P = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = P;
  else root.NarrPair = P;
})(typeof self !== 'undefined' ? self : this, function () {
  // 앞 순간이 정해 주는 짝 줄 — 기본 줄로는 말이 안 되는 짝만
  var PAIR = {
    'prevideo>candle': '두 사람이 들어오기 전에, 먼저 두 집이 준비한 순서가 있습니다.',
    'prevideo>entry': '영상 속 두 사람을, 이제 이 자리에서 맞이하겠습니다.',
    'candle>entry': '이제, 두 사람을 맞이하겠습니다.',
    'vow>ring': '방금 그 말을, 손끝에도 남기겠습니다.',
    'declare>tribute': '부부가 되어, 가장 먼저 찾아갈 곳이 있습니다.',
    'cake>toast': '두 사람이 함께 해낸 첫 번째 일이었습니다. 이제, 다 함께 축하를 나누겠습니다.'
  };
  // 다음 순간이 정하는 기본 줄
  var NEXT = {
    bless: '이 날을 누구보다 기다려 오신 분들이 계십니다.',
    vow: '오늘 가장 중요한 말이, 아직 남아 있습니다.',
    ring: '약속은, 손끝에도 남깁니다.',
    declare: '이제, 모두 앞에서 알릴 일이 하나 남았습니다.',
    tribute: '오늘 이 자리를 가장 기뻐하실 분들이 계십니다.',
    free: '이제 잠시, 분위기를 바꿔 보겠습니다.',
    letter: '조금 더 가까이, 두 사람의 이야기를 들어 보겠습니다.',
    cake: '이제, 조금 가벼운 순서로 넘어가겠습니다.',   // = B6(114) 이미 녹음
    toast: '이제, 다 함께 축하를 나누겠습니다.'
  };
  // 이미 녹음된 줄 — 같은 글이면 그 소리를 쓴다
  var REC = { '이제, 조금 가벼운 순서로 넘어가겠습니다.': '114_bridge-b6-lighter' };
  // 말 없음으로 정해 둔 자리와 까닭(도구가 보여 준다)
  function silentWhy(a, b) {
    if (a === 'entry') return '입장 직후 · 입장곡이 주인공(B1 · 2026-10-02 결정)';
    if (b === '_close') return '닫는 인사가 «이것으로 오늘의 본식을 모두 마칩니다»로 스스로 잇는다';
    if (a === '_close' && b === 'table') return '테이블 인사 여는 말(131)이 스스로 잇는다';
    return '';
  }
  function lineOf(a, b) {
    var k = a + '>' + b;
    if (Object.prototype.hasOwnProperty.call(PAIR, k)) return { text: PAIR[k], src: 'pair', file: REC[PAIR[k]] || '' };
    var w = silentWhy(a, b);
    if (w) return { text: '', src: 'silent', why: w };
    if (NEXT[b]) return { text: NEXT[b], src: 'next', file: REC[NEXT[b]] || '' };
    return { text: '', src: 'silent', why: '아직 정하지 않음' };
  }
  // 실제로 생길 수 있는 짝 전부 — 순서(ORDER)에서 앞이 뒤보다 먼저인 것 · 입장은 늘 있다
  function allPairs(ORDER) {
    var body = ORDER.filter(function (k) { return k !== 'guest' && k !== 'table'; });   // prevideo candle entry … toast
    var out = [], ei = body.indexOf('entry');
    for (var i = 0; i < body.length; i++) {
      var a = body[i];
      var nexts = [];
      if (i < ei) { for (var j = i + 1; j <= ei; j++) nexts.push(body[j]); }   // 입장 앞(영상 · 화촉)은 입장을 건너뛸 수 없다
      else { for (var j2 = i + 1; j2 < body.length; j2++) nexts.push(body[j2]); nexts.push('_close'); }
      nexts.forEach(function (b) { out.push([a, b]); });
    }
    out.push(['_close', 'table']);
    return out;
  }
  return { PAIR: PAIR, NEXT: NEXT, REC: REC, lineOf: lineOf, allPairs: allPairs, silentWhy: silentWhy };
});
