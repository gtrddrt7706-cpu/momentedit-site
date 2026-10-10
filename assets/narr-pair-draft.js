// 모먼트에디트 · 순간 사이 연결 멘트 «초안» (내부 검토용 · 아직 원천이 아니다)  [PAIR_DRAFT]
//
// ★2026-10-09 사장님 작업 순서 — ① 연결 멘트를 경우의 수대로 전부 만든다 ② 나레이션 전용 테스트 도구로
//   하나씩 들으며 검토 ③ 개선 ④ 나중에 적용. 이 파일은 ①이고, 도구는 pair-7c2e.html · flow-7c2e.html 이 읽는다.
// ★엔진(assets/ritual-cue.js)은 이 파일을 읽지 않는다 — 고객 화면 · 당일 진행에는 아무 변화가 없다.
//   확정되면 문안을 assets/ritual-open.js NAR 로 옮기고 엔진 build() 의 [BRIDGE_LINK] 자리에 규칙을 넣은 뒤 이 파일을 지운다.
//
// ★★[PAIR_DRAFT_V3 2026-10-10 사장님 «추천대로»] 세 피드백(구글 · 코워크 · 클로드 리서치)이 모인 «이름은 한 번만»(C안).
//   ① 다음 여는 줄이 첫 문장에서 이름을 말하면 연결 줄은 비운다(첫인사 · 서약 · 반지 · 준비한 순서 · 편지 · 케이크 · 화촉 · 입장)
//   ② 이름이 늦게 나오는 세 순간(성혼 선언 · 부모님께 인사 · «축사는 따로…»로 여는 축배) 앞에만 이름 줄 · 덕담 앞은 뜻 줄 하나
//   ③ 입장 직후도 그 세 순간 앞이면 이름 줄을 둔다(10/2 B1 의 예외 · 입장곡이 끝나고 디렉터가 누를 때)
//   ④ 케이크만 고른 날 «축사는 따로…»는 케이크 뒤 · 닫는 인사 앞으로 옮긴다(엔진 적용 때 · 도구는 그렇게 흉내 낸다)
//   ⑤ 케이크 앞 B6 «조금 가벼운 순서로»는 지금 엔진 그대로 편지 → 케이크에서만(연결 줄로 또 넣지 않는다)
//   조건 — 성혼 이름 줄은 나레이션이 선언하는 날만(가족이 선언하면 «가족께서 선언하십니다»가 이름) ·
//          축배 이름 줄은 그 축배가 «축사는 따로…»로 열리는 날만(준비한 순서가 축사인 날은 말 없음).
//   코드 이견 반영: «부모님께 감사를 전할 시간입니다»(코워크) → «부모님께 감사를 전하겠습니다.»(규칙 6 · «~의 시간입니다»로 열지 않는다)
(function (root, factory) {
  var P = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = P;
  else root.NarrPair = P;
})(typeof self !== 'undefined' ? self : this, function () {
  // 앞 순간이 정해 주는 짝 줄
  var PAIR = {
    'declare>tribute': '부부가 되어 처음으로, 부모님께 갑니다.'
  };
  // 다음 순간이 정하는 기본 줄 · 없는 순간은 말 없음
  var NEXT = {
    bless: '두 사람의 오늘은, 부모님에게서 시작되었습니다.',
    declare: '성혼을 선언하겠습니다.',
    tribute: '부모님께 감사를 전하겠습니다.',
    toast: '이제, 건배하겠습니다.'
  };
  var REC = {};   // 이미 녹음된 줄(글 → 파일) · 지금은 없음
  var NAMED = { welcome: '첫인사', vow: '혼인 서약', ring: '반지 교환', free: '준비한 순서', letter: '편지', cake: '케이크', candle: '화촉', entry: '입장' };
  // v = { declareFamily: 가족이 선언하는 날, speech: 준비한 순서가 축사인 날 }
  function silentWhy(a, b, v) {
    v = v || {};
    if (b === '_close') return '닫는 인사가 «이것으로 오늘의 본식을 모두 마칩니다»로 스스로 잇는다';
    if (a === '_close' && b === 'table') return '테이블 인사 여는 말(131)이 스스로 잇는다';
    if (b === 'declare' && v.declareFamily) return '가족이 선언하는 날 · 여는 줄 «두 사람의 성혼은, 가족께서 선언하십니다»가 이름';
    if (b === 'toast' && v.speech) return '준비한 순서가 축사인 날 · 축배가 «마지막으로, 다 같이 잔을 들어 주세요»로 곧바로 열린다';
    if (a === 'entry' && !NEXT[b]) return '입장 직후 · 입장곡이 주인공(B1) · 다음 여는 줄이 첫 문장에서 이름을 말한다';
    if (a === 'entry' && b === 'bless') return '입장 직후 · 입장곡이 주인공(B1) · 덕담 여는 줄이 첫 문장에서 이름';
    if (a === 'letter' && b === 'cake') return '기존 이음말 B6 «이제, 조금 가벼운 순서로 넘어가겠습니다»가 엔진에서 나온다(연결 줄로 또 넣지 않는다)';
    if (NAMED[b]) return NAMED[b] + ' 여는 줄이 첫 문장에서 이름을 말한다(이름은 한 번만)';
    return '';
  }
  function lineOf(a, b, v) {
    var k = a + '>' + b, w = silentWhy(a, b, v);
    if (w) return { text: '', src: 'silent', why: w };
    if (Object.prototype.hasOwnProperty.call(PAIR, k)) return { text: PAIR[k], src: 'pair', file: REC[PAIR[k]] || '' };
    if (NEXT[b]) return { text: NEXT[b], src: 'next', file: REC[NEXT[b]] || '' };
    return { text: '', src: 'silent', why: '정하지 않음' };
  }
  // 실제로 생길 수 있는 짝 전부 — 순서(ORDER)에서 앞이 뒤보다 먼저인 것 · 입장은 늘 있다
  function allPairs(ORDER) {
    var body = ORDER.filter(function (k) { return k !== 'guest' && k !== 'table'; });
    var out = [], ei = body.indexOf('entry');
    for (var i = 0; i < body.length; i++) {
      var a = body[i], nexts = [];
      if (i < ei) { for (var j = i + 1; j <= ei; j++) nexts.push(body[j]); }
      else { for (var j2 = i + 1; j2 < body.length; j2++) nexts.push(body[j2]); nexts.push('_close'); }
      nexts.forEach(function (b) { out.push([a, b]); });
    }
    out.push(['_close', 'table']);
    return out;
  }
  return { PAIR: PAIR, NEXT: NEXT, REC: REC, lineOf: lineOf, allPairs: allPairs, silentWhy: silentWhy, V: 3 };
});
