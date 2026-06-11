// 예약 위젯 라우팅(스케줄 vs 일반 상담) 회귀 테스트 — 실제 advisor-widget.js에서 함수를 추출해 검증
// 실행: node scripts/test-widget-routing.js
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'advisor-widget.js'), 'utf8');

// 위젯 소스에서 라우팅 함수 본문만 추출(드리프트 방지: 복사본이 아니라 실파일 기준)
function grab(name) {
  const m = src.match(new RegExp('function ' + name + '\\s*\\(s\\)\\s*\\{[\\s\\S]*?\\n  \\}'));
  if (!m) throw new Error(name + ' 함수를 advisor-widget.js에서 찾지 못함');
  return m[0];
}
/* eslint-disable no-eval */
eval(grab('dateish') + '\n' + grab('slotish') + '\n' + grab('affirmish') + '\n' + grab('offTopicish') + '\n' + grab('schedish'));

function route(q, mode) {
  const stay = mode === 'sched' && !offTopicish(q) && (dateish(q) || slotish(q) || affirmish(q));
  return (schedish(q) || stay) ? 'sched' : 'adv';
}

const cases = [
  // [메시지, 현재 모드, 기대 라우트]
  ['내년 10월 둘째 주 토요일 가능해요?', 'adv', 'sched'],
  ['2027년 5월에 예식 가능한 날 있어요?', 'adv', 'sched'],
  ['내년 가을 토요일 가능한가요?', 'adv', 'sched'],
  ['예식일 확인하고 싶어요', 'adv', 'sched'],
  ['크리스마스에 결혼식 돼요?', 'adv', 'sched'],
  ['오후 12시 20분', 'sched', 'sched'],
  ['오전이요', 'sched', 'sched'],
  ['12시 20분이요', 'sched', 'sched'],
  ['네 그걸로 할게요', 'sched', 'sched'],
  ['좋아요 그날로', 'sched', 'sched'],
  ['그날 오전은요?', 'sched', 'sched'],
  ['그럼 다음 주 토요일은?', 'sched', 'sched'],
  // 주제 전환 → 일반 상담
  ['가격이 얼마예요?', 'sched', 'adv'],
  ['예약금은 환불되나요?', 'sched', 'adv'],
  ['주차 되나요?', 'sched', 'adv'],
  ['취소할게요', 'sched', 'adv'],
  ['드레스는 몇 벌 입어볼 수 있어요?', 'sched', 'adv'],
  ['청첩장도 만들어주나요?', 'sched', 'adv'],
  // 일반 질문은 일반 상담
  ['안녕하세요', 'adv', 'adv'],
  ['상담 예약은 어떻게 진행되나요?', 'adv', 'adv'],
  ['140분이면 너무 짧지 않나요?', 'adv', 'adv'],
  ['하객은 몇 명까지 가능한가요?', 'adv', 'adv'],
  ['부모님과 함께 상담해도 되나요?', 'adv', 'adv'],
];

let fails = 0;
cases.forEach(function (c, i) {
  const r = route(c[0], c[1]);
  const ok = r === c[2];
  if (!ok) fails++;
  console.log((ok ? 'ok   ' : 'FAIL ') + '#' + (i + 1) + ' "' + c[0] + '" [' + c[1] + '] => ' + r + (ok ? '' : ' (기대 ' + c[2] + ')'));
});
console.log('\n결과: ' + (cases.length - fails) + '/' + cases.length + ' 통과' + (fails ? ' · 실패 ' + fails + '건' : ''));
process.exit(fails ? 1 : 0);
