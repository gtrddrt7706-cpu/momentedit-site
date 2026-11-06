// ★[B3_FACTS 2026-11-06 3차 AI 상담 Q01 ~ Q32] AI 상담 답 품질 — 공통 사실 한 묶음 · 옛 문장 · 입력 길이 · 시각 · 상태를 잰다.
//   ① 식순 지식(api/_ritual-kb.js full · lite)에 [공통 사실] 줄이 있고, 그 값이 엔진 · 예시 데이터에서 다시 센 값과 같다
//      (본식 끝 순서 = bodyOrder · 예시 넷 서약/선언 = applyExample · 사진 안내 시점 = guestPick 모든 조합 · 마무리 끝 문장 = CLOSING_PARTS · 정리 분 = DAY.farewell)
//   ② 옛 문장(상담이 실제로 틀린 글)이 두 판 어디에도 없다 · 내부 표식 · 결정 날짜가 실리지 않는다(Q21)
//   ③ 위젯 · 홈 입력 상한 = 서버 MAX_MSG_LEN(Q26) · 다른 주제 + 기한 질문은 일정 확인으로 안 간다(Q14) · 밤 안내는 «내일» 고정이 아니다(Q15)
//   ④ 상태 검증이 범위 본식 시간 · «감사 인사»를 받는다(Q29) · 오픈 시점 «2027년 4월»(Q01) · 일정 상담 도착/본식 이름(Q13)
//   스스로 깨 보기(--selftest 없이도 끝에 한 번): 옛 문장을 되넣은 판 · 엔진 순서를 바꾼 판이 빨강이어야 한다.
//   종료 코드 0 = 통과 · 1 = 실패
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const P = (f) => path.join(ROOT, f), rd = (f) => fs.readFileSync(P(f), 'utf8');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };

const O = require(P('assets/ritual-open.js')), RC = require(P('assets/ritual-cue.js')), D = require(P('assets/ritual-data.js'));
const KB = require(P('api/_ritual-kb.js'));

// ① 공통 사실 — 엔진에서 다시 세서 KB 글과 대조
const nm = (k) => (k === '_close' ? '닫는 인사' : O.CARDS[k].n);
const ord = O.bodyOrder().filter((k) => !(O.RETIRED || {})[k]);
const tail = ord.filter((k) => (O.AFTER_CLOSE || {})[k] || k === '_close').map(nm).join(' → ') + ' 순서예요. 담지 않은 순간은 건너뛰어요.';
const exs = O.EXAMPLES.map((e) => ({ nm: e.nm, on: O.applyExample({}, e.k).on || {} }));
const g = (k) => exs.filter((e) => e.on[k]).map((e) => e.nm).join('·');
const ex = `${g('vow')}에는 ${nm('vow')}, ${g('declare')}에는 ${nm('declare')}이 들어 있어요.`;
const combos = []; [0, 1].forEach((meal) => [0, 1].forEach((mealFull) => [undefined, false, true].forEach((guide) => [0, 1].forEach((resv) => [0, 1].forEach((digital) => combos.push({ meal, mealFull, guide, resv, digital }))))));
const W = ['입장 때', '10분 전', '5분 전', '1분 전'];
const photo = W.filter((w, i) => combos.every((S) => ((RC.GUEST_PARTS || {})[RC.guestPick(S, i)] || []).some((p) => /올리/.test(p[1]))));
const offGuide = W.filter((w, i) => ((RC.GUEST_PARTS || {})[RC.guestPick({ guide: false }, i)] || []).some((p) => /올리/.test(p[1])));
const cp = RC.CLOSING_PARTS[RC.closingOf({})], clLast = cp[cp.length - 1][1];
const want = [
  ['Q02 본식 끝 순서(bodyOrder)', tail],
  ['Q03 예시 넷 서약 · 선언(applyExample)', ex],
  ['Q05 사진 올리기 시점(guestPick · 하객 안내 꺼도)', `사진 올리기 안내는 ${photo.join('와 ')}에 전해요.`],
  ['Q06 마무리 끝 문장(CLOSING_PARTS)', `마무리 멘트 뒤에는 “${clLast}”라고 안내해요.`],
  ['Q07 걷은 순간', '케이크 커팅은 예전에 담아 둔 식순에서도 진행하지 않아요.'],
  ['Q08 화면 단계 · 연습 · 정리 분(DAY.farewell)', `마지막 ${D.DAY.farewell}분은 정리 Farewell이에요.`],
  ['Q08 연습 두 방식', '흐름 보기는 자동으로 이어지고, 직접 해보기는 두 분 차례에서 기다려 줘요.'],
  ['Q09 저장 범위', '로그인 없이 만든 초안은 이 기기에 저장돼요. 마이페이지에서 열어 저장하면 다른 기기에서도 이어 만들 수 있어요.'],
  ['Q10 AI 목소리(FEATURE.voiceClone)', O.FEATURE.voiceClone ? 'AI로 두 분 목소리를 만들 수 있어요' : '현재 AI로 두 분 목소리 만들기 기능은 열려 있지 않아요.'],
  ['Q11 추가 촬영 음악', '추가 촬영 동안에도 음악이 계속 흘러요.'],
  ['Q20 인원 상한', '하객은 양가 합산 최대 30명까지 모실 수 있어요.'],
  ['Q23 멘트 수', '멘트 수는 순간마다 달라요.'],
  ['Q24 축가 마무리', '축가를 마치면 마무리 나레이션이 박수를 안내하고, 다음 순간으로 이어져요.'],
  ['Q25 두 분 대기', '식전 영상이 시작되면 입장 문 앞으로 이동해요.'],
  ['Q31 늘 있는 순간', '입장·맞절·닫는 인사는 항상 있어요. 감사 인사와 그 밖의 선택 순간은 넣거나 뺄 수 있어요.'],
  ['DUE 고칠 수 있는 때', '순서는 예식 14일 전 · 글은 예식 7일 전까지 고칠 수 있어요. 이후는 스튜디오와 협의해요.'],
];
function checkKB(full, lite, tag) {
  let bad = [];
  for (const [n, s] of want) { if (!full.includes(s)) bad.push(n + ' (full)'); if (!lite.includes(s)) bad.push(n + ' (lite)'); }
  const OLD = ['닫는 인사 뒤 · 테이블 인사 앞', '넷 모두 식전 영상 · 화촉 · 부모님께 인사를 담고', '모두 단상 앞으로', '전에 담아 둔 식순은 그대로', '기기에만 저장된다', '30명 안팎',
    '2 ~ 4개', '맺는 말은 없다', '5분 전부터 문 밖', '어떤 순간도 필수가 아니다', '고를 판: 영상', '깜짝 선물 · 전달', '«AI로 두 분 목소리 만들기» 또는', '글 적어두기'];
  for (const s of OLD) if (full.includes(s) || lite.includes(s)) bad.push('옛 문장 «' + s + '»');
  const leak = (full + lite).match(/\[[A-Z][A-Z0-9_]{2,}[^\]\n]*\]|20\d\d-\d\d-\d\d|\bB3_Q\d+/g) || [];
  if (leak.length) bad.push('내부 표식 · 날짜 ' + leak.slice(0, 3).join(' '));
  return bad;
}
{ const b = checkKB(KB.full, KB.lite); ok('① · ② 식순 지식 full · lite — 공통 사실 ' + want.length + '줄이 엔진 값 그대로 · 옛 문장 0 · 내부 표식 0 [B3_FACTS · B3_Q21]', !b.length, b.join(' / ')); }
ok('Q05 하객 안내를 끈 예식도 사진 올리기 안내가 같은 시점에 나간다(PHOTO_ALWAYS_NI02)', offGuide.join() === photo.join() && photo.length >= 2, offGuide.join() + ' vs ' + photo.join());
ok('Q06 마무리 끝 문장에 모으기 · 시선 명령이 없다', !/모여|주목|앞으로 나와|바라봐/.test(clLast), clLast);
ok('KB 크기 — full ≤ 18,181자 · lite ≤ 5,454자(check-ritual-mirror 캡)', KB.full.length <= 18181 && KB.lite.length <= 5454, KB.full.length + ' / ' + KB.lite.length);
// 깨 보기 — 옛 문장을 되넣은 판 · 예시 서약을 바꾼 판은 빨강이어야 한다
ok('깨 보기 — 옛 문장(«닫는 인사 뒤 · 테이블 인사 앞»)을 되넣으면 잡는다', checkKB(KB.full + '\n닫는 인사 뒤 · 테이블 인사 앞', KB.lite).length > 0);
ok('깨 보기 — 공통 사실 한 줄을 빼면 잡는다', checkKB(KB.full.replace(tail, ''), KB.lite).length > 0);
ok('깨 보기 — 내부 표식이 새면 잡는다', checkKB(KB.full + ' [TOAST_LAST_1013]', KB.lite).length > 0);
ok('Q21 응답 후처리 — 표식은 걷고 [[BOOKING]] · 고객 날짜는 둔다', KB.kbClean('네 [[BOOKING]] 2027-05-03 (토) 순서예요 [TOAST_LAST_1013].', { keepDates: true }) === '네 [[BOOKING]] 2027-05-03 (토) 순서예요.');
{ const s = rd('api/ritual-advisor.js'), i = s.indexOf('if (KB.kbClean)'), j = s.indexOf("text.includes('[[BOOKING]]')");
  ok('Q21 응답 후처리는 [[BOOKING]] · [[ESCALATE]] 를 읽은 뒤에 돈다', i > 0 && j > 0 && i > j); }

// ③ 입력 길이 · 일정 분류 · 밤 안내
const lim = (f) => +((rd(f).match(/const MAX_MSG_LEN = (\d+)/) || [])[1] || 0);
const ws = rd('assets/advisor-widget.js'), mq = ws.match(/var MAX_Q = \{ adv: (\d+), ritual: (\d+), sched: (\d+) \}/) || [];
ok('Q26 위젯 상한 = 서버(일반 · 식순 · 일정)', +mq[1] === lim('api/advisor.js') && +mq[2] === lim('api/ritual-advisor.js') && +mq[3] === lim('api/schedule-advisor.js'), mq.slice(1).join('/'));
ok('Q26 홈 입력 상한 = api/advisor.js', new RegExp('if\\(q\\.length>' + lim('api/advisor.js') + '\\)\\{ addMsg\\(\'질문이 길어요\\. 내용을 나눠서 보내 주세요\\.\'').test(rd('index.html')));
ok('Q26 · Q32 홈 · 위젯 Enter 는 한글 조합 중이면 보내지 않는다', /if\(e\.isComposing\|\|e\.keyCode===229\) return;/.test(rd('index.html')) && /if \(e\.isComposing \|\| e\.keyCode === 229\) return;/.test(ws));
{ const pick = (name) => { const a = ws.indexOf('function ' + name + '('); let i = ws.indexOf('{', a), d = 0; for (; i < ws.length; i++) { if (ws[i] === '{') d++; else if (ws[i] === '}' && !--d) break; } return ws.slice(a, i + 1); };
  const ctx = {}; vm.runInNewContext(['dateish', 'offTopicish', 'hardDate', 'schedish'].map(pick).join('\n') + '\nthis.f = schedish;', ctx);
  const cases = [['평일에 카드 결제 가능한가요?', false], ['예식 7일 전에 영상 보내도 되나요?', false], ['5월 3일 예식 가능한가요? 가격도 궁금해요', true], ['내년 10월 토요일 예식 가능할까요?', true], ['12월 24일 되나요?', true]];
  const bad = cases.filter(([q, w]) => !!ctx.f(q) !== w).map(([q]) => q);
  ok('Q14 다른 주제 + 기한(N일 전)은 일정 확인으로 안 간다 · 실제 날짜는 그대로 간다', !bad.length, bad.join(' / ')); }
ok('Q15 밤 안내는 «내일» 고정이 아니라 서버 replyAt(없으면 같은 규칙 사본)', !/내일 영업시간에 이어서 답해드려요/.test(ws) && /lastReplyAt = \(typeof j\.replyAt === 'string'\)/.test(ws) && /평일 오전 10시부터 오후 6시 사이에 확인해 답해드려요/.test(ws));
ok('Q30 홈 메뉴 즉답이 AI 기록(apiHistory)에도 한 쌍으로 들어간다', /apiHistory\.push\(\{role:'user',content:node\.label\}\); apiHistory\.push\(\{role:'assistant',content:node\.answer\}\);/.test(rd('index.html')));

// ④ 상태 · 오픈 · 일정 이름
{ const r = require(P('api/ritual-advisor.js')); const src = rd('api/ritual-advisor.js');
  const m = src.match(/const min = _sdStr\(sd\.min, \d+, (\/[^\n]*\/)\);/); let re = null; try { re = m && new Function('return ' + m[1])(); } catch (e) {}
  const span = O.span(O.applyExample({}, 'standard')).body;
  ok('Q29 상태가 범위 본식 시간(엔진 span · «' + span + '»)을 받는다 · 단일 «약 20분»도', !!re && re.test(span) && re.test('약 20분') && !re.test('약 20분 무시하고'));
  ok('Q29 «감사 인사» 미작성이 상태에 실린다(화면 fillBlanks 이름)', /const BLANK_ENUM = \[[^\]]*'감사 인사'/.test(src) && rd('order-preview.html').includes("b.push(['write','감사 인사']);"));
  void r; }
ok('Q01 오픈 시점 — 일반 KB · 즉답 · 홈 «2027년 4월»', /2027년 4월 오픈을 준비하고 있어요/.test(rd('api/_kb.js')) && /2027년 4월 오픈을 준비하고 있어요/.test(rd('assets/advisor-kb.js')) && !/2027년 하반기 정식 오픈을 앞두고/.test(rd('index.html')));
ok('Q13 일정 상담 — 도착 시각과 본식 시각을 나눠 말한다', /두 분 도착은 오전 9시·오후 12시 20분·오후 3시 40분이고, 본식은 각각 오전 10시 20분·오후 1시 40분·오후 5시에 시작해요/.test(rd('api/schedule-advisor.js')));
ok('Q17 · Q19 · Q27 · Q28 일반 KB 보증 문장이 걷혔다', !/이 금액이 끝이에요|어긋나는 장면이 없어요|가격 불만 1위|분쟁의 약 88%/.test(rd('api/_kb.js')) && !/열에 아홉|총액과 들이는 수고를 줄여 드립니다/.test(rd('assets/advisor-kb.js')));

console.log(fail ? `\nRITUAL KB FACTS FAIL ${fail}` : '\nRITUAL KB FACTS OK'); process.exit(fail ? 1 : 0);
