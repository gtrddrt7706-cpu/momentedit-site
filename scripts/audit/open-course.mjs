// [OPEN_COURSE 2026-09-25] 「우리 예식 짓기」(순간 먼저) — 설계 명세 1 의 받아들일 기준을 기계로 잰다.
//
//   node scripts/audit/open-course.mjs          # 정적(게이트가 매번 · 브라우저 없음)
//   node scripts/audit/open-course.mjs --live   # 실브라우저(390 · 1280) — 고르기 화면을 실제로 누른다
//
// ★숫자는 명세 원문(docs/handoff/설계명세1_식순고르기_0925.md 5장 · 9장)을 **그대로** 적는다 —
//   원천(ritual-open.js)에서 다시 계산해 비교하면 «원천이 틀려도 초록»이 된다. 명세가 기준이다.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const P = (f) => path.join(ROOT, f);
const O = require(P('assets/ritual-open.js'));
const D = require(P('assets/ritual-data.js'));
const C = require(P('assets/ritual-cue.js'));
let bad = 0;
const ok = (name, cond, note = '') => { console.log((cond ? 'ok   ' : 'FAIL ') + name + (note ? '  ' + note : '')); if (!cond) bad++; };
process.on('exit', (code) => { if (bad && code === 0) process.exitCode = 1; });

/* ── 1. 순서 · 코스 ── */
ok('COURSES.open.seq = ritual-open.js ORDER (v4 · guest 포함)', JSON.stringify(D.COURSES.open.seq) === JSON.stringify(O.ORDER), D.COURSES.open.seq.join(','));
ok('v4 순서(명세 0장) + 닫는 인사 뒤 테이블 인사 [TABLE_GREET_1008] · 덕담은 선언 바로 뒤 [BLESS_AFTER_DECLARE] · 마음의 순간 = 덕담 → 준비한 순서 → 축가 → 편지 → 인사 [HEART_ORDER_1012]', O.ORDER.filter((k) => k !== 'guest').join(',') === 'prevideo,candle,entry,matjeol,welcome,vow,ring,declare,bless,free,song,letter,tribute,cake,toast,table' && O.AFTER_CLOSE.table === 1 && O.bodySeq({ on: { vow: 1, table: 1 } }).join(',') === 'entry,matjeol,vow,table,_close');   /* [END_FLOW_1030] 테이블 인사는 닫는 인사 앞 */   // [CAKE_TOAST_SPLIT] · [MATJEOL_SPLIT_1013] 맞절은 입장 바로 뒤 늘
ok('옛 코스 여섯은 지우지 않고 숨긴다(Q1 ①)', ['damback', 'gamdong', 'family', 'minimal', 'festive', 'record'].every((k) => D.COURSES[k] && D.COURSES[k].hidden));
ok('새 코스도 옛 카드 목록엔 없다(hidden)', D.COURSES.open.hidden === true && D.COURSES.open.open === true);

/* ── 2. 시간 — [DAY_60 · RANGE_40 · EX_BRIEF 2026-09-26] 스냅 60 · 합 40 · 넷째 예시 «간결» · «약속» 인사 말 없이(코워크 회신 9/26 2-3 · 2-6 표) ── */
/* ★[CLOSE_BOW 2026-09-26 코워크 회신5 4-2] 닫는 인사(108 · 목례 · 박수)가 들어가 본식이 +16~19초 · 사진과 인사가 그만큼 준다(합 50 그대로) */
// [WINE_POUR_OFF 2026-09-27 사장님] 와인 붓기(두 와인을 한 잔에 · 기본)를 걷어 축배가 약 30초 짧아졌다 — 옛 12~17 · 14~20 · 17~24 / 23~28 · 20~26 · 16~23
/* ★[TABLE_GREET_1008 2026-10-08 사장님] «기록» 예시에 테이블 인사(6테이블 × 1분 30초 = 9분)가 들어가 11~16 → 20~25 · 단체 사진 24~29 → 15~20 */
/* ★[TABLE_APART 2026-10-08 사장님 «테이블 인사는 본식 이후니까 사진과도 따로 본식과도 따로»] 본식에서 테이블 인사(9분)를 뗐다 — 기록 20~25 → 본식 11~16 · 테이블 인사 9 · 단체 사진 15~20(셋 합 40) */
/* ★[MATJEOL_1011 2026-10-11 사장님 «입장 끝에 늘 넣기»] 입장 끝 맞절 15초가 모든 예식에 들어가 본식이 15초 길다 — 옛 기록 11~16 / 15~20 · 약속 13~19 / 21~27(구현 뒤 게이트 값 · 예시 숫자는 2단계에서 다시 짠다) */
/* ★[DECLARE_BY_PERSON 2026-10-12 사장님] 선언 시간이 «누가 읽든 하나»(여는 말 · 맺는 말 12 · 낭독 15 · 건네기 8 · 여유 20)가 돼 예시가 몇 초씩 움직였다(구현 뒤 게이트 값) — 옛 가족 16~23 / 17~24 */
/* ★★[EX_STD_1012 2026-10-12 사장님 «정석 · 기록 · 가족 · 간결 (추천)»] 예시 넷을 같은 뼈대(화촉 · 서약 · 선언 · 부모님께 인사 · 축배 · 식전 영상) + 성격 한두 개로 다시 짰다 —
   반지 · 케이크 · 편지가 빠지고 정석 · 가족에 축가 · 간결에 화촉 · 인사(말 없이). 옛 기록 12~16 / 15~19 · 약속 14~20 / 20~26 · 가족 17~23 / 17~23 · 간결 8~12 / 28~32 */
const WANT = { standard: ['약 17~22분', '약 18~23분'] /* [COURSE_ONE_PROMISE_1030 검토 169] 선언 뺌 · 옛 18~23 / 17~22 */ /* [SOURCE_FIRST_1016] 자료 글 그대로라 줄이 길어져 본식 +1분쯤 · 옛 17~22 / 18~23 · [TOAST_LAST_1013] 축배를 뺌 · 옛 18~23 / 17~22 · [SPEECH_TILE_1012] + 축사 3분 · 옛 15~19 / 21~25 */, record: ['약 9~13분', '약 18~22분'] /* [COURSE_ONE_PROMISE_1030 검토 169] 선언 뺌 · 옛 10~14 / 17~21 */ /* [SOURCE_FIRST_1016] 자료 글 그대로라 줄이 길어져 본식 +1분쯤 · 옛 9~13 / 18~22 · ★[MATJEOL_4_1014] 맞절 4판 ② 여는 말 3 → 15초 · 옛 9~12 / 19~22 */, family: ['약 16~20분', '약 20~24분'] /* [COURSE_ONE_PROMISE_1030 검토 169] 서약 뺌 · 옛 18~23 / 17~22 */ /* ★[BASE_SWAP_1023 검토 156] 화촉 · 맞절 기본이 짧아져(−30초) · 153 판 18~24 / 16~22 */ /* ★[REVIEW29_1023 검토 153] 맞절 · 감사 인사 · 서약 여는 말이 자료 글로 길어져(+9초) · 옛 18~23 / 17~22 */ /* [SOURCE_FIRST_1016] 자료 글 그대로라 줄이 길어져 본식 +1분쯤 · 옛 17~22 / 18~23 · [TOAST_LAST_1013] 옛 17~23 / 17~23 */, brief: ['약 7~10분', '약 30~33분'] /* [COURSE_ONE_PROMISE_1030 검토 169] 선언 뺌 · 옛 ['약 8~11분', '약 29~32분'] */ /* [SOURCE_FIRST_1016] 자료 글 그대로라 줄이 길어져 본식 +1분쯤 · 옛 7~10 / 30~33 · [TOAST_LAST_1013] 옛 8~12 / 28~32 */ };   // [EX_ENTRY_FEEL_1012] 입장 멘트 짝(정석 담백 · 기록 힘차 · 간결 격식) — 옛 정석 14~19 / 21~26 · 기록 9~13 / 18~22
{ const T = O.applyExample({}, 'record'), s = O.span(T); ok('[TABLE_APART] ‹기록› 테이블 인사 약 9분 · 본식 + 테이블 인사 + 단체 사진 = 40(위 · 아래 끝 둘 다) · 한 줄 글', s.table === '약 9분' && s.tm === 9 && s.a + s.tm + s.pb === O.DAYMIN && s.b + s.tm + s.pa === O.DAYMIN && O.spanText(T) === '본식 약 9~13분 · 테이블 인사 약 9분 · 단체 사진 약 18~22분' /* [COURSE_ONE_PROMISE_1030 검토 169] 선언 뺌 · 옛 10~14 · 17~21 */ /* [SOURCE_FIRST_1016] 자료 글 그대로라 줄이 길어져 본식 +1분쯤 · 옛 9~13 · 18~22 · ★[MATJEOL_4_1014] 옛 9~12 · 19~22 · [MATJEOL_1011] 옛 11~16 · 15~20 · [EX_STD_1012] 옛 12~16 · 15~19 · [EX_ENTRY_FEEL_1012] 옛 9~13 · 18~22(입장 담백 23초 → 힘차 12초) */, O.spanText(T)); }
{ const T = O.applyExample({}, 'standard'), s = O.span(T); ok('[TABLE_APART] 테이블 인사를 안 담으면 가운데가 없다(종전 두 칸 그대로)', !s.tm && s.table === '' && O.spanText(T) === '본식 ' + s.body + ' · 단체 사진 ' + s.photo, O.spanText(T)); }
{ const sg = O.flowSegs(O.applyExample({}, 'record')), t = sg.filter((x) => x.after); const big = O.flowSVG(sg, 600, {}), mini = O.flowSVG(sg, 200, { mini: true }); ok('[TABLE_APART · FLOW_MOOD] 곡선 — 테이블 인사만 «본식 뒤»(after) · 잔잔(3) · 꼬리는 옅은 금 점선 · 큰 곡선에만 이름(명조) · 입장 · 닫는 인사 빈 진주 · 축 없음', t.length === 1 && t[0].k === 'table' && t[0].lv === 3 && /flow-after-line[^>]*stroke="#B89A75"[^>]*stroke-dasharray/.test(big) && /class="flow-name"[^>]*>테이블 인사</.test(big) && (big.match(/class="flow-mark"/g) || []).length === 2 && !/<line/.test(big) && /flow-after-line/.test(mini) && !/flow-name|flow-mark/.test(mini)); }
{ const S = O.applyExample({}, 'family'), V = Object.assign(O.applyExample({}, 'family'), { peak: 'vow' });   /* [COURSE_ONE_PROMISE_1030 검토 169] 선언이 있는 코스(가족)로 잰다 · 서약만인 코스는 서약이 정점(아래) */
  ok('[PEAK_PICK_OFF] 가장 벅찬 순간 고르기는 걷었다(사장님 «그래프만 바뀌는 거면 의미가 없지») — 저장된 초안에 고른 값이 남아 있어도 꼭대기는 저절로(선언) · 고르는 함수 없음', O.peakOf(S) === 'declare' && O.peakOf(V) === 'declare' && O.level('vow', V) === 4 && O.level('declare', V) === 5 && O.peakPick === undefined && O.peakCands === undefined, JSON.stringify({ v: O.peakOf(V), lv: O.level('vow', V) })); }
for (const k in WANT) { const s = O.span(O.applyExample({}, k)); ok(`예시 ‹${O.exampleOf(k).nm}› 본식 ${WANT[k][0]} · 사진과 인사 ${WANT[k][1]}`, s.body === WANT[k][0] && s.photo === WANT[k][1], `${s.body} / ${s.photo}`); }
// 4-9 초 단위 — 기록 11:49~16:49 · 약속 14:25~20:39 · 전부 17:47~24:59 (CLOSE_BOW 뒤 · 옛 11:33~16:31 · 14:09~20:21 · 17:31~24:41)
const mmss = (x) => { const r = Math.round(x); return Math.floor(r / 60) + ':' + String(r % 60).padStart(2, '0'); };   // [REVIEW31_1023] 59.6초가 «:60»으로 찍히던 것 — 반올림을 먼저
const SEC = { standard: '17:09~21:44' /* [COURSE_ONE_PROMISE_1030 검토 169] 옛 17:44~22:43 */ /* [BASE_SWAP_1023] −30초 · 153 판 18:14~23:13 */ /* ★[REVIEW29_1023 검토 153] +9초 · 옛 18:05~23:04 */ /* [SOURCE_FIRST_1016] 자료 글 그대로라 줄이 길어져 본식 +1분쯤 · 옛 16:59~21:54 · ★[B2_TIME_1014] 화촉 +12.5 · 입장 받는 말 +4.5 · 부모님께 인사 −18(지금 소리로 다시 잼) · 옛 17:00~21:55 · ★[MATJEOL_4_1014] 맞절 +12 · 입장 A −9(ENTRY_TIME_1014) · 옛 16:57~21:52 ·  [TOAST_LAST_1013] 축배(42 ~ 82초)를 뺌 · 옛 17:39~23:14 · [SPEECH_TILE_1012] + 축사 3분 · 옛 14:33~19:18 */, record: '18:24~21:54' /* [COURSE_ONE_PROMISE_1030 검토 169] 옛 18:59~22:53 */ /* [BASE_SWAP_1023] 153 판 19:29~23:23 */ /* [REVIEW29_1023] 옛 19:20~23:14 */ /* [SOURCE_FIRST_1016] 자료 글 그대로라 줄이 길어져 본식 +1분쯤 · 옛 17:44~21:34 · ★[MATJEOL_4_1014] 옛 17:37~21:27 ·  [EX_ENTRY_FEEL_1012] 옛 14:26~19:11 · 17:48~21:38 · 8:02~11:46(입장 격식 16 → 담백 23 · 담백 23 → 힘차 12 · 담백 23 → 격식 16) · [TABLE_GREET_1008] 테이블 인사 9분 + 여는 말 7초 · 옛 11:18~16:08 · [MATJEOL_1011] 맞절 +15초 · 옛 20:25~25:15 · [DECLARE_BY_PERSON] 박수 판 → 사람 낭독 · 옛 20:40~25:30 · [EX_STD_1012] 반지 · 케이크가 빠져 옛 20:30~25:28 */, family: '15:41~20:13' /* [COURSE_ONE_PROMISE_1030 검토 169] 옛 17:53~23:00 */ /* [REVIEW31_1023 검토 157] 입장 E −3.9초 · 156 판 17:57~23:04 · 153 판 18:27~23:34 */ /* [REVIEW29_1023] 옛 18:18~23:25 */ /* [SOURCE_FIRST_1016] 자료 글 그대로라 줄이 길어져 본식 +1분쯤 · 옛 16:57~22:01 · ★[MATJEOL_4_1014] 옛 16:46~21:50 ·  [TOAST_LAST_1013] 옛 17:28~23:12 */, brief: '7:20~10:00' /* [COURSE_ONE_PROMISE_1030 검토 169] 옛 7:55~10:59 */ /* [BASE_SWAP_1023] 153 판 8:25~11:29 */ /* [REVIEW29_1023] 옛 8:17~11:21 */ /* [SOURCE_FIRST_1016] 자료 글 그대로라 줄이 길어져 본식 +1분쯤 · 옛 7:16~10:19 · ★[MATJEOL_4_1014] 맞절 +12 · 입장 C −4 · 옛 7:13~10:17 ·  [TOAST_LAST_1013] 옛 7:55~11:39 · [EX_STD_1012] 옛 8:19~11:58(반지 · 케이크) */ };   // [DECLARE_BY_PERSON] 옛 13:39~19:34 · 8:08~11:59   // [MATJEOL_1011] 옛 13:24~19:19 · 7:53~11:44   // [WINE_POUR_OFF] 옛 11:49~16:49 · 13:55~20:00 · 8:24~12:25
for (const k in SEC) { const b = O.bodySec(O.applyExample({}, k)); ok(`예시 ‹${O.exampleOf(k).nm}› ${SEC[k]}`, mmss(b[0]) + '~' + mmss(b[1]) === SEC[k], mmss(b[0]) + '~' + mmss(b[1])); }
ok('예시 넷 알림 없음 · 축사(free 칸)는 정석에만 · 늘 축사 판([SPEECH_TILE_1012] · [EX_STD_1012] 기록도 — 반지 · 케이크가 빠져 단체 사진 18~22 · 옛 기록은 고르자마자 알림 ④ «15분»)', O.EXAMPLES.every((e) => (e.on.indexOf('free') < 0 || (e.k === 'standard' && e.set.free === 'speech')) && !O.noticeOf(O.applyExample({}, e.k)) && O.noticeList(O.applyExample({}, e.k)).length === 0) && O.applyExample({}, 'standard').freeWhat === 'speech');
/* [TRIB_ONE_SAY 2026-10-06] 말의 길이 하나(말로 인사 = long) · 옛 one 도 long 으로 */
ok('[TRIB_ONE_SAY] 말로 인사 + 편지 부모님께 → 인사 판 이름 «서로의 부모님께 말로 인사» · 칩은 말로 인사 · 말 없이 둘', (() => { const S = O.applyExample({}, 'family'); S.on.letter = 1; O.setChip(S, 'tribute', 'long'); O.setChip(S, 'letter', 'parent'); return O.chipLabel('tribute', S) === '서로의 부모님께 말로 인사' && O.CHIPS.tribute.map((c) => c[1]).join('|') === '말로 인사|말없이' && O.chipOf('tribute', { tributeSay: 'one' }) === 'long'; })());
ok('[EX_BRIEF] 넷째 예시는 «간결» · «전부»(all)는 거뒀다', O.EXAMPLES[3].k === 'brief' && O.EXAMPLES[3].nm === '간결' && !O.exampleOf('all') && O.originOf({ on: { vow: 1 }, pickFrom: 'all' }) === '직접 고르셨어요.');
/* ★★[EX_STD_1012 2026-10-12 사장님 «정석 · 기록 · 가족 · 간결 (추천)»] 같은 뼈대 + 성격 한두 개 · 반지 · 케이크 · 편지는 예시에 없다(+ 로 담기) · 약속은 걷었다 · 테이블 인사는 기록에만 */
{ const SPINE = ['prevideo', 'candle', 'tribute'] /* [COURSE_ONE_PROMISE_1030 검토 169] 서약 · 선언은 하나만(아래) */ /* [TOAST_LAST_1013] 축배는 뼈대에서 내려 기록에만 */, X = (k) => O.exampleOf(k).on.join(',');
  ok('[EX_STD_1012] 예시 넷 = 정석 · 기록 · 가족 · 간결(이 차례) · 약속(promise)은 걷었다 — 옛 초안은 «직접 고르셨어요.»', O.EXAMPLES.map((e) => e.k + ':' + e.nm).join(',') === 'standard:정석,record:기록,family:가족,brief:간결' && !O.exampleOf('promise') && O.originOf({ on: { vow: 1, letter: 1 }, pickFrom: 'promise' }) === '직접 고르셨어요.');
  ok('[EX_STD_1012] 넷 모두 뼈대(식전 영상 · 화촉 · 서약 또는 선언 하나 · 부모님께 인사)를 담고 · 반지 · 케이크 · 편지는 어디에도 없다 · 축사는 정석에만([SPEECH_TILE_1012]) · 축배는 기록에만([TOAST_LAST_1013])', O.EXAMPLES.every((e) => SPINE.every((k) => e.on.indexOf(k) > -1) && ((e.on.indexOf('vow') > -1) !== (e.on.indexOf('declare') > -1)) && ['ring', 'cake', 'letter'].every((k) => e.on.indexOf(k) < 0)) && O.EXAMPLES.filter((e) => e.on.indexOf('free') > -1).map((e) => e.k).join(',') === 'standard' && O.EXAMPLES.filter((e) => e.on.indexOf('toast') > -1).map((e) => e.k).join(',') === 'record');
  ok('[EX_STD_1012] 성격 — 정석 + 첫인사 · 축사 · 축가([SPEECH_TILE_1012]) / 기록 + 첫인사 · 테이블 인사 / 가족 + 첫인사 · 덕담 · 축가 / 간결 뼈대만(ORDER 차례)', X('standard') === 'prevideo,candle,welcome,vow,free,song,tribute' && X('record') === 'prevideo,candle,welcome,vow,tribute,toast,table' && X('family') === 'prevideo,candle,welcome,declare,bless,song,tribute' && X('brief') === 'prevideo,candle,vow,tribute' && ['standard', 'record', 'brief'].every((k) => O.peakOf(O.applyExample({}, k)) === 'vow') && O.peakOf(O.applyExample({}, 'family')) === 'declare', O.EXAMPLES.map((e) => e.k + '=' + e.on.join('/')).join(' '));
  ok('[EX_STD_1012] 테이블 인사는 기록에만 · 축가는 정석 · 가족 · 인사 말 — 정석 · 가족 말로 / 기록 · 간결 말 없이', O.EXAMPLES.filter((e) => e.on.indexOf('table') > -1).map((e) => e.k).join(',') === 'record' && O.EXAMPLES.filter((e) => e.on.indexOf('song') > -1).map((e) => e.k).join(',') === 'standard,family' && O.EXAMPLES.map((e) => O.chipOf('tribute', O.applyExample({}, e.k))).join(',') === 'long,none,long,none');
  /* 테이블 인사 9분 + 축가면 늦어진 날 단체 사진이 기준(SHORT_MIN 16) 아래 — 그래서 기록에 축가를 넣지 않았다(5테이블까지는 괜찮다) */
  const R5 = O.applyExample({ tableN: 6 }, 'record'), R4 = O.applyExample({ tableN: 5 }, 'record'); R5.on.song = 1; R4.on.song = 1;   /* [COURSE_ONE_PROMISE_1030 검토 169] 선언을 빼 1분쯤 줄어 6테이블부터 · 옛 «5테이블 알림 · 4테이블 없음» */   /* [SOURCE_FIRST_1016] 본식 +1분쯤 — 옛 «6테이블 알림 · 5테이블 없음» */
  ok('[EX_STD_1012] 기록 + 축가 — 6테이블이면 알림 ④(단체 사진 기준 아래) · 5테이블이면 없음', O.span(R5).pa < O.SHORT_MIN && O.span(R4).pa >= O.SHORT_MIN, JSON.stringify([O.span(R5).photo, O.span(R4).photo])); }
  /* [EX_ENTRY_FEEL_1012 2026-10-12 사장님 «느낌에 맞춰 넷 다 (추천)»] 예시가 누르는 입장 멘트 칩 = 예시 느낌 — 정석은 빌더 기본값(order-preview S.entry)과 같다 */
  ok('[EX_ENTRY_FEEL_1012] 입장 멘트 짝 — 정석 담백하게(빌더 기본값) · 기록 힘차게 · 가족 다정하게 · 간결 격식 있게(간결엔 첫인사가 없어 입장에서 하객께 감사)', O.EXAMPLES.map((e) => e.k + ':' + e.set.entry).join(',') === 'standard:A,record:B,family:E,brief:C' && O.applyExample({}, 'brief').entry === 'C' && /var S=\{course:'open',[^\n]*?entry:'A'/.test(fs.readFileSync(P('order-preview.html'), 'utf8')) && (() => { const cs = C.build(O.applyExample({ course: 'open' }, 'brief'), { mode: 'console' }).cues, ei = cs.findIndex((c) => c.k === 'entry'); return ei > 0 && cs.slice(0, ei).some((c) => /감사/.test(c.text || '')); })() && !/귀한 걸음/.test(D.ENTRY.C.nar) && O.EXAMPLES.find((e) => e.k === 'brief').on.indexOf('welcome') < 0, O.EXAMPLES.map((e) => e.k + ':' + e.set.entry).join(','));   /* ★[ENTRY_C_THANKS_MOVED_1014] «간결»(첫인사 없음)의 하객 감사는 입장 멘트가 아니라 입장 앞 줄이 한다 — 원고 2판 «귀한 걸음»은 상투어(GUEST_EX_RS) · 감사는 하객 맞이(01)와 개식 선언(라운드 1 결정)이 맡는다 · 입장 앞 어딘가에 «감사»가 있어야 초록 */
const E = O.span({ on: {} });
ok('빈 채 시작: 본식 약 3분 · 단체 사진 약 37분([BASE_SWAP_1023] 맞절 기본 «격식 있게» 22초 · 옛 3~4 / 36~37)', E.body === '약 3분' && E.photo === '약 37분', `${E.body} / ${E.photo}`);   // [SOURCE_FIRST_1016] 자료 글 그대로라 줄이 길어져 본식 +1분쯤(맞절 여는 말 자료 EE) · 옛 2~3 / 37~38
ok('빈 채 시작: 알림 없음', O.noticeOf({ on: {} }) === '');
// 전 조합 — 넉넉 합(준비한 순서 3분 판까지)
let mx = 0, mxS = null; const V = { declare: ['solemn', 'warm', 'clap', 'family'], tribute: ['one', 'long', 'none'], letter: ['each', 'parent'], toast: ['both', 'toast', 'cake'], wine: ['mix', 'family', 'none'], free: ['video', 'speech'] };
for (let m = 0; m < (1 << O.PICKABLE.length); m++) {
  const on = {}; O.PICKABLE.forEach((k, i) => { if (m >> i & 1) on[k] = 1; });
  for (const d of V.declare) for (const t of V.tribute) for (const l of V.letter) for (const w of V.toast) for (const wi of V.wine) for (const f of V.free) {
    const S = { on, entry: 'A' }; O.setChip(S, 'declare', d); O.setChip(S, 'tribute', t); O.setChip(S, 'letter', l); O.setChip(S, 'toast', w); O.setChip(S, 'wine', wi); O.setChip(S, 'free', f);
    const b = O.bodySec(S)[1]; if (b > mx) { mx = b; mxS = S; }   // [PHOTO_FLOOR0] 가장 무거운 판을 쥐고 아래에서 단체 사진 표시를 잰다
  }
}
ok('전 조합 넉넉 합 ≤ 45분(가장 무거운 판 + 준비한 순서 3분 + 테이블 인사 9분 [TABLE_GREET_1008])', mx / 60 <= 45, (mx / 60).toFixed(1) + '분');
/* ★[PHOTO_FLOOR0 · TABLE_MAX6 2026-10-08] 본식이 40분을 넘는 판 — 단체 사진 분이 0 아래로 안 보인다 · 위 값까지 0이면 «시간이 모자라요» · 부족 알림도 같은 말 · 테이블 수 상한은 좌석과 같은 6 */
{
  const heavy = Object.assign({}, mxS, { freeLen: '10', tableN: 99 }); O.setChip(heavy, 'free', 'speech');
  const sp = O.span(heavy), none = { a: 60, b: 70 };
  ok('[PHOTO_FLOOR0] 가장 무거운 판 + 축사 10분 + 테이블 인사 — 단체 사진 분이 0 아래로 안 보인다', sp.pa >= 0 && sp.pb >= 0 && !/-/.test(sp.photo), sp.body + ' / ' + sp.photo);
  ok('[PHOTO_FLOOR0] 부족 알림 — 0분이면 «약 0분으로 줄어요»가 아니라 «시간이 모자라요»', /시간이 모자라요/.test(O.NOTICE.short(0)) && !/약 0분/.test(O.NOTICE.short(0)) && /약 8분으로 줄어요/.test(O.NOTICE.short(8)));
  ok('[TABLE_MAX6] 테이블 수 상한 6(좌석 배치도와 같다) · 모르면 6', O.tableN({ tableN: 99 }) === 6 && O.tableN({}) === 6 && O.tableN({ tableN: 3 }) === 3, String(O.tableN({ tableN: 99 })));
  void none;
}
ok('고객 범위(RANGE) 합 = 40 · 예시 넷이 그 안', O.RANGE.body[0] + O.RANGE.photo[1] === O.DAYMIN && O.RANGE.body[1] + O.RANGE.photo[0] === O.DAYMIN
  && Object.keys(WANT).every((k) => { const s = O.bodySec(O.applyExample({}, k)); return s[0] / 60 >= O.RANGE.body[0] - 4 && Math.round(s[1] / 60) <= O.RANGE.body[1]; }));   /* [TABLE_GREET_1008] 고객이 보는 값(span · 분으로 둥글림)으로 잰다 — 기록 넉넉 합 25.2분 = 화면 «약 20~25분» */
ok('40 = DAY(140 − 준비 − 스냅 − 배웅) · 스냅 60 [DAY_60]', O.DAYMIN === 40 && O.DAYMIN === D.DAY.total - D.DAY.ready - D.DAY.snap - D.DAY.farewell && D.DAY.snap === 60);

ok('모든 순간에 칸 글이 있다(tileOf 빈 값 0) [TILE_SWALLOW]', Object.keys(O.CARDS).every((k) => O.tileOf(k, {}).length > 0), Object.keys(O.CARDS).filter((k) => !O.tileOf(k, {})).join(','));
/* ── 3. 알림 넷 — 조건 그대로(명세 3-6 · 둘째 판 4-1 · 4-7) ── */
ok('① 앞쪽 사슬(서약 · 덕담 · 인사 · 덕담은 선언 뒤라 서약 다음) → 알림 ①', O.noticeOf({ on: { bless: 1, vow: 1, toast: 1 }, tributeSay: 'one' }) === '' && O.noticeOf({ on: { bless: 1, vow: 1, tribute: 1, toast: 1 } }) === O.NOTICE.heavy);
{ const _bs = { on: { declare: 1, bless: 1, tribute: 1, letter: 1, toast: 1 } }, _n = O.noticeFull(_bs);   /* [BLESS_AFTER_DECLARE 2026-10-12] 반지 · 선언은 덕담 앞이라 이 사슬을 못 푼다 */
  ok('① 덕담으로 시작해 인사로 끝나는 사슬(덕담 · 편지 · 인사)은 뒤쪽 문구 · 단추 «인사를 말 없이로» — «반지나 선언»이 아니다 [BLESS_AFTER_DECLARE · HEART_ORDER_1012]', O.noticeOf(_bs) === O.NOTICE.heavyBack && !!_n && _n.acts.map((a) => a[0]).join('|') === '인사를 «말없이»로', _n && _n.msg); }
{ /* ★[HEART_ORDER_1012 2026-10-12] 인사가 마음의 순간 끝 — 사슬에 인사가 있으면 «말 없이», 없으면(덕담 → 축사 → 편지) 그 사이 빈 자리는 축가 하나 */
  const mid = { on: { declare: 1, bless: 1, free: 1, letter: 1, toast: 1 }, freeWhat: 'speech', freeLen: '1' }, nm = O.noticeFull(mid);
  ok('① 인사 없는 사슬(덕담 · 축사 · 편지) → «축가를 담으면» · 단추 «축가 담기» [HEART_ORDER_1012]', O.noticeOf(mid) === O.NOTICE.heavyMid && !!nm && nm.acts.map((a) => a[0]).join('|') === '축가 담기' && /^부모님 덕담 → 축사 → 편지 낭독 · /.test(nm.msg) /* [SPEECH_TILE_1012] 옛 이름 «준비한 순서» */, nm && nm.msg);
  ok('① 축가를 담으면 그 사슬은 풀린다(축가가 축사와 편지 사이) [HEART_ORDER_1012]', O.noticeOf(Object.assign({}, mid, { on: Object.assign({}, mid.on, { song: 1 }) })) !== O.NOTICE.heavyMid);
  const four = { on: { declare: 1, bless: 1, free: 1, letter: 1, tribute: 1, toast: 1 }, freeWhat: 'speech', freeLen: '1' }, n4 = O.noticeFull(four);
  ok('① 넷 이어진 사슬(덕담 · 축사 · 편지 · 인사) — 이름 셋은 인사까지(«인사를 말 없이로»를 말하니까) [HEART_ORDER_1012]', O.noticeOf(four) === O.NOTICE.heavyBack && !!n4 && /^축사 → 편지 낭독 → 부모님께 인사 · /.test(n4.msg) /* [SPEECH_TILE_1012] */, n4 && n4.msg);
  ok('[HEART_ORDER_1012] 까닭 — 인사 · 준비한 순서는 이웃을 담았을 때만 그 말을(WHY_NEIGHBOR)', O.whyOf('tribute', { on: { tribute: 1 } }) !== O.CARDS.tribute.why && O.whyOf('tribute', { on: { tribute: 1, letter: 1 } }) === O.CARDS.tribute.why
    && O.whyOf('free', { on: { free: 1 } }) !== O.CARDS.free.why && O.whyOf('free', { on: { free: 1, song: 1 } }) === O.CARDS.free.why && !/편지 앞|선언 다음/.test(O.CARDS.free.why + O.CARDS.tribute.why));
  ok('[HEART_ORDER_1012 · ACTS_SHIFT_1013] 막 — 여는 순간 = 영상 · 화촉 · 입장 · 맞절 / 약속의 순간 = 감사 인사 · 서약 · 반지 · 선언 / 마음의 순간 = 덕담 · 축사(free · [SPEECH_TILE_1012]) · 축가 · 편지 / 닫는 막 첫 칸 = 부모님께 인사(막마다 넷 · 막을 이으면 ORDER 와 같다)', (O.SECTIONS.find((x) => x.n === '여는 순간') || {}).ks.join(',') === 'prevideo,candle,entry,matjeol' && (O.SECTIONS.find((x) => x.n === '약속의 순간') || {}).ks.join(',') === 'welcome,vow,ring,declare' && (O.SECTIONS.find((x) => x.n === '마음의 순간') || {}).ks.join(',') === 'bless,free,song,letter' && O.SECTIONS[3].ks[0] === 'tribute'
    && O.SECTIONS.map((x) => x.ks.join(',')).join(',') === O.ORDER.filter((k) => !O.PRE[k] || k === 'prevideo').filter((k) => !O.AFTER_CLOSE[k]).join(',') + ',_close,' + O.ORDER.filter((k) => O.AFTER_CLOSE[k]).join(','));   // [TOAST_LAST_1013] 마지막 막 칸 차례 = 실제 차례(닫는 인사 → 축배 → 테이블 인사)
}
ok('[SONG_3MIN] 축가 MR 보낼 것에 «3분 안팎 한 곡»(자료 B · C · L · 시간 표 210초)', O.prepOf('song', { on: { song: 1 } }).some((q) => /축가 반주\(MR\) 파일 · 곡 이름과 함께 · 3분 안팎 한 곡/.test(q[1])) && O.TIME.song[2] === 210);
ok('[TRIBUTE_BRIDE_FIRST] 콘솔 메모 — 신부 부모님께 먼저(자료 G · P · Q) · 새 코스만', (() => { const r = C.build({ course: 'open', on: { tribute: 1 } }, { mode: 'console' }); const c = r.cues.find((x) => x.slug === 'tribute-in'); return !!c && /신부 부모님께 먼저/.test(c.note || ''); })());
ok('[BLESS_ORDER_1012] 콘솔 메모 — 양가 모두 말씀하시면 신랑 측 먼저(자료 O) · 새 코스만 · 옛 코스는 그대로', (() => { const r = C.build({ course: 'open', on: { declare: 1, bless: 1 } }, { mode: 'console' }); const c = r.cues.find((x) => x.slug === 'narr-bless-mid'); const o = C.build({ course: 'family' }, { mode: 'console' }).cues.find((x) => x.slug === 'narr-bless-open'); return !!c && /신랑 측 먼저/.test(c.note || '') && !!o && !o.note; })());
ok('① 뒤쪽 사슬(축사 · 편지 · 인사) → 뒤쪽 문구', O.noticeOf({ on: { declare: 1, tribute: 1, free: 1, letter: 1, toast: 1 }, freeWhat: 'speech', freeLen: '1' }) === O.NOTICE.heavyBack);
ok('① 인사 «말 없이»면 앉아 듣는 순간이 아니다', O.noticeOf({ on: { declare: 1, tribute: 1, free: 1, letter: 1, toast: 1 }, tributeSay: 'none', freeWhat: 'speech', freeLen: '1' }) !== O.NOTICE.heavyBack);
{ const _mk = (t) => { const S = O.applyExample({}, 'standard'); delete S.on.cake; delete S.on.toast; if (t) S.on.table = 1; return S; };   /* [EX_STD_1012] 옛 약속(promise) 예시 → 정석 */   /* [QUIET_END_CLOSE 2026-10-09 A~Z 1라운드 A-6] 테이블 인사는 닫는 인사 뒤에 선다(bodySeq) — «닫는 인사 바로 앞»을 seq[len-2] 로 집으면 _close 를 집어 알림이 사라졌다 */
  ok('② [TOAST_LAST_1013] «끝이 조용한 편» 알림은 걷었다 — 축배를 안 담아도(테이블 인사가 있어도 없어도) 그 알림 없음 · NOTICE.toast 없음(옛 QUIET_END_CLOSE)', O.NOTICE.toast === undefined && [false, true].every((t) => O.noticeList(_mk(t)).every((m) => !/끝이 조용/.test(m))), JSON.stringify([O.noticeList(_mk(false)), O.noticeList(_mk(true))])); }
ok('① 준비한 순서가 영상이면 사슬이 끊긴다', O.noticeOf({ on: { declare: 1, tribute: 1, free: 1, letter: 1, toast: 1 }, freeWhat: 'video', freeLen: '1' }) === '');
ok('[TRIB_ONE_SAY] 말로 인사 + 편지 부모님께 → «말이 두 번» 알림 없음(서로의 부모님께라 겹치지 않는다)', O.noticeOf({ on: { tribute: 1, declare: 1, letter: 1, ring: 1, toast: 1 }, tributeSay: 'long', letter: 'parent' }) !== O.NOTICE.twice);
/* [DETAIL_0925 A2] 알림 ③ 은 고른 순간이 넷 이상일 때만 — 셋 이하면 «끝이 조용하다»를 말하지 않는다 */
ok('③ [TOAST_LAST_1013] 축배 없음 + 끝이 선언 → 알림 없음(옛 알림 ③ 걷음)', O.noticeOf({ on: { declare: 1 } }) === ''
  && O.noticeOf({ on: { bless: 1, ring: 1, vow: 1, declare: 1 } }) === ''
  && O.noticeOf({ on: { bless: 1, ring: 1, vow: 1, cake: 1 } }) === ''   // [CAKE_TOAST_SPLIT] 케이크만 = 축배 없음
  && O.noticeOf({ on: { bless: 1, ring: 1, record: 1, declare: 1 } }) === ''
  && O.noticeOf({ on: { bless: 1, ring: 1, declare: 1, cake: 1 } }) === ''
  && O.noticeOf({ on: { bless: 1, ring: 1, declare: 1, toast: 1 } }) === '');
/* ★★[TOAST_LAST_1013 2026-10-13 사장님 «축배는 마지막에» · «축배 코스 한 곳에»] 축배 = 닫는 인사 뒤 · 테이블 인사 앞 · 예시는 «기록» 한 곳 · 시간 · «본식 n / N» 은 본식 안(APART = 테이블 인사 하나) */
{ const R = O.applyExample({}, 'record'), st = O.applyExample({}, 'standard'); st.on.toast = 1;
  const cs = (S) => C.build(Object.assign({ course: 'open' }, S), { mode: 'console' }).cues.map((c) => c.slug);
  const rs = cs(R), i = (x) => rs.indexOf(x);
  ok('[END_FLOW_1030 검토 167] 차례 — 테이블 인사 → 축배 → 잔 내려놓기 → 닫는 인사 → 사진 전 안내(bodySeq · 큐 둘 다) · 56 없음 · 닫는 인사는 잔이 내려간 뒤 디렉터 GO', O.bodySeq(R).slice(-3).join(',') === 'table,toast,_close' && i('narr-table-in') > -1 && i('narr-table-in') < i('toast-toast') && i('toast-toast') < i('narr-close-bow') && i('narr-toast-out') < 0 && i('narr-close') < 0 && i('narr-close-bow') < i('narr-photo-pre')
    && (C.build(Object.assign({ course: 'open' }, R), { mode: 'console' }).cues.find((c) => c.slug === 'narr-close-bow') || {}).fire === 'manual', rs.slice(-12).join(' > '));
  ok('[TOAST_LAST_1013] 축배는 본식 안 — APART 는 테이블 인사 하나 · 곡선 «본식 뒤»도 테이블 인사만 · 자리 글 «닫는 인사 다음» · 테이블 인사 «축배 다음»', JSON.stringify(O.APART) === '{"table":1}' && O.AFTER_CLOSE.toast === 1 && O.flowSegs(R).filter((x) => x.after).map((x) => x.k).join(',') === 'table'
    && /번째 · 테이블 인사 다음$/.test(O.slotText('toast', R)) && /번째 · 부모님께 인사 다음$/.test(O.slotText('table', R)) && O.slotText('toast', O.applyExample({}, 'brief')) === '담으면 부모님께 인사 다음, 닫는 인사 앞에 들어가요' /* [END_FLOW_1030] */, [O.slotText('toast', R), O.slotText('table', R)].join(' / '));
  ok('[END_FLOW_1030] 정석에 축배를 더해도 닫는 인사 앞 · 옛 코스는 차례 그대로(축배가 닫는 인사 앞)', (() => { const s = cs(st); return s.indexOf('toast-toast') > -1 && s.indexOf('toast-toast') < s.indexOf('narr-close-bow'); })()
    && ['festive', 'record', 'damback'].every((c) => { const s = C.build({ course: c }, { mode: 'console' }).cues.map((x) => x.slug), t = s.findIndex((x) => /^toast-/.test(x || '')); return t > -1 && t < s.indexOf('narr-close-bow'); }));
  /* ★[SOURCE_FIRST_1016] 자료 글로 간결이 8:17 이 됐다 — 범위 아래 끝 7 은 그대로 두고(1분 남짓 여유 · 위 끝 25 도 가족 23:25 에 여유) «예시 넷이 범위 안»을 잰다.
     범위 숫자를 바꾸면 계약서(v1.15 «예시 기준 약 7~25분»)까지 판을 올려야 한다 — 예시 넷(8~23분)이 이미 안에 든다 · 아래 끝 여유가 1분 30초를 넘으면 빨강 */
  ok('[TOAST_LAST_1013 · SOURCE_FIRST_1016] 본식 범위 7~25 · 단체 사진 15~33(합 40) · 예시 넷이 범위 안 · 간결이 아래 끝 근처(1분 30초 안)', O.RANGE.body.join('~') === '7~25' && O.RANGE.photo.join('~') === '15~33' && O.RANGE.body[0] + O.RANGE.photo[1] === O.DAYMIN
    && (() => { const lo = O.bodySec(O.applyExample({}, 'brief'))[0] / 60; return lo >= O.RANGE.body[0] && lo - O.RANGE.body[0] < 1.5; })()
    && O.EXAMPLES.every((e) => { const b = O.bodySec(O.applyExample({}, e.k)); return b[0] / 60 >= O.RANGE.body[0] && b[1] / 60 <= O.RANGE.body[1]; })); }
/* [DETAIL_0925 A2] ④ 의 N 은 띠의 «사진과 인사» 아래 값(span.pa)과 같은 수 — 알림과 띠가 다른 숫자를 말하지 않는다 */
ok('④ 가족 + 서약 + 준비한 순서 3분 → 알림 ④(단체 사진 < 16분 · 띠와 같은 값) [RANGE_40]', (() => { const S = O.applyExample({}, 'family'); S.on.free = 1; S.on.vow = 1;   /* [COURSE_ONE_PROMISE_1030 검토 169] 가족이 서약을 빼 축사만으로는 16분 */ const pa = O.span(S).pa; return O.noticeOf(S) === O.NOTICE.short(pa) && pa < 16 && O.SHORT_MIN === 16 && /단체 사진이 약/.test(O.NOTICE.short(pa)) && !/테이블/.test(O.NOTICE.short(pa)); })());
ok('준비한 순서 칩이 시간 · 준비 목록에 곧장', (() => { const S = { on: { free: 1 } }; const a = O.bodySec(S)[0]; O.setChip(S, 'freeLen', '1'); const b = O.bodySec(S)[0]; O.setChip(S, 'free', 'speech'); O.setChip(S, 'freeLen', '2'); const c = O.bodySec(S);
  return a - b === 120 && Math.round(O.partsOf('free', S).reduce((x, y) => x + y) - 10) === 126 - 0 && /^축사 원고 · /.test(O.prepOf('free', S)[0][1]); })());   // [LINE_R1_1014] 준비 줄은 덕담과 같은 «축사 원고 · …» 꼴
ok('축사 2분 = 대본 126초 · 넉넉 161초', (() => { const S = { on: { free: 1 }, freeWhat: 'speech', freeLen: '2' }; const p = O.partsOf('free', S); return p[0] + p[1] + p[2] === 126 && Math.round(p[0] + 1.25 * p[1] + p[2] + p[3]) === 161; })());
ok('준비한 순서 자리 = 덕담 뒤 · 축가 앞 · 편지 → 인사 [HEART_ORDER_1012]', (() => { const q = O.bodySeq({ on: { declare: 1, bless: 1, tribute: 1, free: 1, song: 1, letter: 1 } }); return q.indexOf('bless') + 1 === q.indexOf('free') && q.indexOf('free') + 1 === q.indexOf('song') && q.indexOf('song') + 1 === q.indexOf('letter') && q.indexOf('letter') + 1 === q.indexOf('tribute'); })());
/* ★[PREVIDEO_PICK 2026-09-27 사장님 «식전 영상은 필수로 하지 말자 · 선택할 수 있게»] 종전 «늘 있다(PREVIDEO_ALWAYS)»를 뒤집었다 */
ok('식전 영상은 담는 순간(빈 채엔 없음 · 담으면 식전 · 예시 넷은 담아 둔다) [PREVIDEO_PICK]', !O.ALWAYS.prevideo && O.PICKABLE.indexOf('prevideo') > -1 && O.seqOf({ on: {} }).indexOf('prevideo') < 0 && O.seqOf({ on: { prevideo: 1 } }).indexOf('prevideo') > -1 && !!O.PRE.prevideo && O.EXAMPLES.every((e) => e.on.indexOf('prevideo') > -1));
/* ★[CAKE_OFF_1013 2026-10-13 사장님 «케익은 빼자»] 케이크 커팅은 새로 담지 않는다 — 새로 담는 목록(OFFER)에 없고, 옛 초안이 담아 둔 케이크는 그대로 돈다(PICKABLE · 순서 · 큐) */
{ const L = { course: 'open', on: { cake: 1, toast: 1 } }; L.toast = O.toastMode(L);
  ok('[CAKE_OFF_1013 · CAKE_OLD_OFF_1017] 케이크는 새로 담지 않는다(OFFER 에 없음 · RETIRED) · ★10/17 옛 초안에 담아 둔 케이크도 순서 · 큐에 없다(PICKABLE 에는 옛 값 읽기용으로 남는다)',
    O.RETIRED && O.RETIRED.cake === 1 && O.OFFER.indexOf('cake') < 0 && O.OFFER.length === O.PICKABLE.length - 1 && O.PICKABLE.indexOf('cake') > -1
    && O.seqOf(L).indexOf('cake') < 0 && O.picked(L).indexOf('cake') < 0 && !O.onOf(L, 'cake') && O.EXAMPLES.every((e) => e.on.indexOf('cake') < 0)); }
/* ★[FLOWER_OFF_1013 2026-10-13 사장님 «부모님 인사에서 꽃 주는 건 빼자»] 새 코스의 부모님께 인사는 꽃 없이 — 큐 이름 · 현장 지문 · 예식 이야기 장면 · 준비물 · 장면 글 어디에도 «꽃»이 없다 · 옛 코스는 그대로 */
{ const ST = require(P('assets/ritual-story.js'));
  const flw = (x) => /꽃/.test(JSON.stringify(x || ''));
  const miss = [];
  for (const say of ['long', 'none']) for (const ex of O.EXAMPLES.map((e) => e.k).concat([''])) {
    const S = ex ? O.applyExample({ course: 'open' }, ex) : { course: 'open', on: {} };
    S.course = 'open'; S.on.tribute = 1; O.setChip(S, 'tribute', say);
    const cs = C.build(C.norm(JSON.parse(JSON.stringify(S))), { mode: 'console' }).cues.filter((c) => c.k === 'tribute');
    if (!cs.length) miss.push((ex || '빈') + ':' + say + ' 큐 없음');
    cs.forEach((c) => {
      if (flw([c.name, c.pick, c.live, c.note, c.hint])) miss.push((ex || '빈') + ':' + say + ' ' + c.slug);
      const sc = c.live && c.live.t ? ST.liveOf(c) : null;
      if (c.live && c.live.t && (!sc || flw(sc))) miss.push((ex || '빈') + ':' + say + ' 이야기 ' + (sc ? '꽃' : '없음'));
    });
    if (flw(O.goodsOf(S))) miss.push((ex || '빈') + ':' + say + ' 준비물');
  }
  ok('[FLOWER_OFF_1013] 새 코스 부모님께 인사 — 큐 · 현장 지문 · 예식 이야기 · 준비물에 «꽃» 없음(예시 넷 + 빈 초안 · 말로 인사 / 말 없이) · 장면 글 · 인사 판 글도',
    !miss.length && !flw(O.SCENE.tribute) && !flw(O.TRIB_ACT) && O.TRIB_ACT.d === '인사와 포옹' && !O.goodsOf({ course: 'open', on: { tribute: 1 } }).length, miss.join(' · '));
  const old = C.build(C.norm({ course: 'gamdong' }), { mode: 'console' }).cues.filter((c) => c.k === 'tribute');
  ok('[FLOWER_OFF_1013] 옛 코스 부모님 헌정은 그대로(꽃 헌정 판 · 지문) — 옛 예식의 소리 · 지문이 바뀌지 않는다', old.length > 0 && old.some((c) => flw([c.pick, c.live]))); }
ok('«축하의 말» 칸은 거뒀다 — 축사는 free 칸(옛 준비한 순서 · [SPEECH_TILE_1012])이 맡는다 · 새 키를 만들지 않았다', O.ORDER.indexOf('speech') < 0 && !O.CARDS.speech && O.CHIPS.free.some((c) => c[0] === 'speech'));
ok('[SPEECH_TILE_1012] 새 칸 = 축사 — 이름 · 기본 갈래(빈 값 · 모르는 값도) · 장면 영상 = 축사 영상(speech.mp4 · [VIDEO_SET_1023] 10/23 영상이 생겼다) · 정석 큐는 103 여는 말 · «축사 없음 안내» 빠짐', O.CARDS.free.n === '축사' && O.CARDS.free.sn === '축사' && O.DEF.freeWhat === 'speech' && O.chipOf('free', {}) === 'speech' && O.chipOf('free', { freeWhat: 'zzz' }) === 'speech' && /^\/assets\/video\/moments\/speech\.mp4(\?|$)/.test((O.firstVideo('free', { on: { free: 1 } }) || {}).mp4 || '') && O.firstVideo('free', { on: { free: 1 }, freeWhat: 'gift' }) === null && (() => { const cs = C.build(C.norm(O.applyExample({ course: 'open' }, 'standard')), { mode: 'console' }).cues; const f = cs.find((c) => c.k === 'free'); return !!f && f.slug === 'narr-free-in-speech' && f.blockN === '축사' && cs.every((c) => c.slug !== 'narr-toast-none'); })());
ok('[SPEECH_TILE_1012] 옛 초안(영상 · 선물 · 기타)은 그대로 돈다 — 이름 «준비한 순서» · 영상 판은 free.mp4 · 큐 블록도 옛 이름 · 저장된 값은 그대로', ['video', 'gift', 'etc'].every((w) => { const L = { course: 'open', on: { free: 1 }, freeWhat: w }; const cs = C.build(C.norm(JSON.parse(JSON.stringify(L))), { mode: 'console' }).cues.filter((c) => c.k === 'free'); return O.nameOf('free', L) === '준비한 순서' && O.chipOf('free', L) === w && cs.length && cs[0].blockN === '준비한 순서'; }) && !!O.firstVideo('free', { on: { free: 1 }, freeWhat: 'video' }) && O.nameOf('free', { on: { free: 1 } }) === '축사');

/* ── 4. 고객 문구 — 금지어 · 전각 줄표 ── */
const TXT = JSON.stringify([O.CARDS, O.CHIPS, O.SECTIONS, O.EXAMPLES, O.NOTICE, O.NAR, O.CANDLE_WHO, O.NOTICE.short(20), O.helpersOf({ on: { free: 1, ring: 1 }, freeWhat: 'gift' }, { mealGuide: 1 })]);
/* ★[SONG_BACK_1011 2026-10-11 사장님 «축가 만들자»] «축가»는 금지어에서 뺐다 — 9/25 설계 명세 1 의 받아들일 기준(«추천 · 인기 · 베스트 · 축가 · 추가 비용» 없음)을 사장님이 뒤집었다 */
['추천', '인기', '베스트', '추가 비용', '—'].forEach((w) => ok(`고객 문구에 «${w}» 없음`, TXT.indexOf(w) < 0));
ok('축가 자리 = 성혼 선언 뒤 · 부모님께 인사 앞 [SONG_BACK_1011]', (() => { const q = O.bodySeq({ on: { declare: 1, song: 1, tribute: 1 } }); return q.indexOf('declare') + 1 === q.indexOf('song') && q.indexOf('song') + 1 === q.indexOf('tribute'); })());
ok('축가 카드가 «악기 연주는 받지 않아요»를 말한다 · 축사 카드는 축하의 말([SPEECH_TILE_1012] · 옛 준비한 순서 카드의 «노래는 축가로» 줄은 걷음) · «라이브 노래 · 연주는 받지 않아요»는 없다 [SONG_BACK_1011]', /악기 연주는 받지 않아요/.test(O.CARDS.song.one) && /축하의 말/.test(O.CARDS.free.one) && !/라이브 노래/.test(TXT));

/* ★[VOW_DECL_DIFF 2026-10-11 사장님 «서약과 성혼선언 차이를 헷갈릴 수 있으니 · 조사한 자료를 참고해서 · 이벤트 클릭하면 나오는 설명에»]
   자료 R «누가 읽느냐로 구분한다» — 서약 = 두 분이 서로에게 직접 / 선언 = 하객 앞에서 · 두 분 대신 아버님이나 친구 · 지인 한 분([DECLARE_BY_PERSON 2026-10-12] 나레이션 · 가족은 걷었다).
   ① 미리 보기 창(PV_DESC) · ② 순간 쪽 설명과 AI 상담 지식(CARDS.one) 두 곳이 같은 기준을 말한다 */
{
  const OP = fs.readFileSync(P('order-preview.html'), 'utf8');
  const pv = (k) => ((OP.match(new RegExp("\\n  " + k + ":'([^']+)'")) || [])[1] || '');
  const vowOk = (t) => /서로에게/.test(t) && /직접/.test(t), declOk = (t) => /하객 앞에서/.test(t) && /두 분이 정하신 한 분이 읽/.test(t) && !/아버님이나|친구 · 지인|신랑 아버님|신부 아버님/.test(t) && !/나레이션|가족이/.test(t) && /성혼 선언문을 읽으면/.test(t);   // [DECLARE_BY_PERSON] · [DECLARE_ANYONE] 특정한 분을 박지 않는다
  ok('[VOW_DECL_DIFF] ② · AI 지식 — 서약 «서로에게 · 직접» / 선언 «하객 앞에서 · 두 분이 정하신 한 분»(DECLARE_ANYONE)', vowOk(O.CARDS.vow.one) && declOk(O.CARDS.declare.one), O.CARDS.vow.one + ' | ' + O.CARDS.declare.one);
  ok('[VOW_DECL_DIFF] ① 미리 보기 창 — 같은 기준 · 옛 «부부가 되었음을 알리고»(두 분이 알리는 것처럼 읽힘) 없음', vowOk(pv('vow')) && declOk(pv('declare')) && !/되었음을 알리고/.test(pv('declare')), pv('vow') + ' | ' + pv('declare'));
}

/* ★[PARENTS_ENTRY_OFF 2026-10-12 사장님 «양가부모님 입장은 생략»] 화촉 «서는 분» = 10/11 전 차례 — 양가 어머님(기본) · 양가 아버님 · 양가 부모님 네 분 · 다른 두 분 · 입장 +20초 · 하객 인사 걷음 */
ok('[PARENTS_ENTRY_OFF · CANDLE_FOUR_OFF_1019] 칩 = 어머님 · 아버님 · 다른 두 분(네 분은 10/19 사장님 결정으로 뺐다) · 기본은 어머님 · 저장된 네 분은 어머님으로 읽는다 · 부탁 글에 «함께 들어와» 없음', O.CANDLE_WHO.map((c) => c[1]).join() === '양가 어머님,양가 아버님,다른 두 분' && O.DEF.candleWho === 'mothers'
  && O.candleWhoOf({ candleWho: 'parents' }) === 'mothers' && O.prepOf('candle', { candleWho: 'parents' }).join() === O.prepOf('candle', { candleWho: 'mothers' }).join()
  && !/함께 들어와|들어와 하객께|입장/.test(JSON.stringify(O.prepOf('candle', { candleWho: 'mothers' }))));
ok('[OPEN_WORDS_1013 · LINE_R1_1014] 화촉 부탁 글 = 두 분이면 불을 밝히고 서로 한 번, 하객께 한 번 · 다른 두 분 판은 부탁 줄 그대로', ['mothers', 'fathers'].every((w) => /불을 밝히고 서로 한 번, 하객께 한 번 인사해 주세요$/.test(O.prepOf('candle', { candleWho: w })[0][1])) && O.prepOf('candle', { candleWho: 'others' })[0][1] === '화촉을 밝혀 주실 두 분께 부탁드리기');
ok('[CANDLE_FOUR_OFF_1019] 콘솔 — 저장된 네 분(parents)은 어머님 판으로 · 네 분 소리(narr-candle-in-parents · narr-candle-bow-four)는 큐에 없다', (() => { const r = C.build({ course: 'open', on: { candle: 1 }, candleWho: 'parents' }, { mode: 'console' }); const sl = r.cues.map((x) => x.slug || ''); return sl.indexOf('narr-candle-in-mothers') > -1 && sl.indexOf('narr-candle-in-parents') < 0 && sl.indexOf('narr-candle-bow-four') < 0; })());
ok('[CANDLE_BOW_1012] 두 분이 서는 판 — 불을 밝힌 뒤 서로 · 하객께 인사 · 이야기 장면이 그 글을 받는다', ['mothers', 'fathers', 'others'].every((w) => { const r = C.build({ course: 'open', on: { candle: 1 }, candleWho: w }, { mode: 'console' }); const c = r.cues.find((x) => x.slug === 'narr-candle-in-' + w); const t = ((c && c.live) || {}).t || ''; const b = r.cues.find((x) => x.slug === { mothers: 'narr-candle-bow', fathers: 'narr-candle-bow-fathers', others: 'narr-candle-bow-others' }[w]); const bt = ((b && b.live) || {}).t || '';   /* [CANDLE_CALL_SRC_1016] 구호에 서는 분 이름 · 판마다 클립 */
  return /초에 불을 밝힘$/.test(t) && /^두 분이 서로 맞절 · 하객께 인사한 뒤 자리로$/.test(bt) && b.fire === 'chain' && !/입장/.test(t + bt); }) && /서로 한 번, 하객께 한 번/.test(fs.readFileSync(P('assets/ritual-story.js'), 'utf8')));   // ★[CANDLE_CALL_1014] 인사는 인사 안내 줄(138) 뒤
/* ★[SONG_SELF_1011 2026-10-11 사장님 «추천대로»] 축가는 두 분이 직접 불러도 된다(자료 C 신랑 축가 · G 신랑이 신부에게 · Q 두 분 듀엣) */
ok('[SONG_SELF_1011] 축가 카드 · 미리 보기 창이 «두 분이 직접 불러도 돼요»', /두 분이 직접 불러도 돼요/.test(O.CARDS.song.one) && /song:'[^']*두 분이 직접 불러도 돼요/.test(fs.readFileSync(P('order-preview.html'), 'utf8')));

/* ★[MATJEOL_1011 2026-10-11 사장님 «입장 끝에 늘 넣기»(추천대로 · 10/02 ENTRY_OUT_OFF «맞절도 빼고»를 뒤집음)] 새 코스는 입장 끝에 맞절이 늘 있다 — 고를 것 없음 */
ok('[MATJEOL_1011 · MATJEOL_SPLIT_1013] 빈 채에도 입장 바로 뒤 맞절 순간 한 줄(132 · k matjeol · 블록 «신랑·신부 맞절» · 디렉터 GO · 사람 순간 3·3·3) · 옛 바라보기 도착 큐는 없다', (() => { const r = C.build({ course: 'open', on: {} }, { mode: 'console' }); const s = r.cues.map((c) => c.slug); const i = s.indexOf('narr-entry-bow'), b = r.cues[i] || {};
  const a = r.cues[s.indexOf('narr-entry-arrive')] || {};   // ★[ENTRY_ARRIVE_1014] 입장 → 받는 말(144 · 두 분이 앞에 서고 박수가 잦아들면 GO) → 맞절(1.25초 사슬)
  return s.indexOf('narr-entry-arrive') === s.indexOf('entry-A') + 1 && i === s.indexOf('narr-entry-arrive') + 1 && a.fire === 'manual' && /두 분이 앞에 서고 박수가 잦아들면/.test(a.hint || '') && !a.live
    && b.k === 'matjeol' && b.blockN === '신랑·신부 맞절' && b.fire === 'chain' && b.gapMs === 1250 && /3초 숙이고 · 3초 멈추고 · 3초 일어나기/.test((b.live || {}).t || '') && s.indexOf('narr-entry-out') < 0 && r.cues.filter((c) => c.k === 'entry').length === 2; })());
/* ★[MATJEOL_SPLIT_1013 2026-10-13 사장님 «입장 이후 맞절»] 맞절 몫 15초는 이제 맞절 순간이 진다 — 입장 몫은 입장 판 그대로 · 둘을 더하면 종전 입장 몫(본식 합 그대로) */
ok('[MATJEOL_SPLIT_1013] 맞절 몫 34초(22 · 0 · 12 · 0 · [BASE_SWAP_1023] 기본 «격식 있게» · 옛 49 · 43 · 15)는 맞절 순간 · 입장 몫 = 입장 판 · 카드는 따로(입장 글에 맞절 없음 · 맞절 카드)', O.partsOf('matjeol', {}).join(',') === '22,0,12,0' && O.partsOf('entry', { entry: 'A' }).join(',') === O.TIME.entry.A.join(',') && !/맞절/.test(O.CARDS.entry.one) && /맞절/.test(O.CARDS.matjeol.one) && O.CARDS.matjeol.n === '맞절' && !!O.TILE.matjeol && O.videoKeys('matjeol').join(',') === 'entry-look' && O.videoKeys('entry').join(',') === 'entry');

/* ── 5. 엔진 — 고른 값이 콘솔 큐로 그대로 간다 ── */
const slugs = (S) => C.build(S, { mode: 'console' }).cues.map((c) => c.slug);
ok('빈 채: 하객 맞이 넷 + 입장 + 닫는 인사(식전 영상 없음 · 04 는 원래 판) [PREVIDEO_PICK]', (() => { const r = C.build({ course: 'open', on: {} }, { mode: 'console' }); const s = slugs({ course: 'open', on: {} }); return r.seq.join(',') === 'guest,entry,matjeol' && s.indexOf('guest-4-1min') > -1 && s.indexOf('narr-prevideo-in') < 0; })());
/* [ONEMIN_FIRST 2026-10-05 사장님] 1분 전 공지(89 판) → 식전 영상 → 입장 · [CEREMONY_AT_VIDEO] 영상은 예식 시작 시각(0) · 02~04 는 늘 -10 · -5 · -1 */
ok('[ONEMIN_FIRST · CEREMONY_AT_VIDEO] 식전 영상을 담으면 04(89 판) 뒤 · 입장 앞 · 영상 0(예식 시작) · 02 · 04 = -10 · -1(5분 전 칸은 걷었다 · GUEST_5MIN_OFF_1023)', (() => { const r = C.build({ course: 'open', on: { prevideo: 1 } }, { mode: 'console' }); const s = r.cues.map((c) => c.slug); const pv = r.cues[s.indexOf('narr-prevideo-in')];
  const g = r.cues.filter((c) => /^guest-[234]/.test(c.slug || '')).map((c) => c.atMin).join(',');
  const op = r.cues[s.indexOf('narr-open')] || {};   // ★[OPEN_DECL_1014] 예식 시작 시각(0)에 개식 선언 → 식전 영상은 사슬로 이어서
  return s.indexOf('guest-4-1min') < 0 && s.indexOf('guest-4-1min-pre') < s.indexOf('narr-open') && s.indexOf('narr-open') + 1 === s.indexOf('narr-prevideo-in') && r.cues.slice(s.indexOf('narr-prevideo-in') + 1).every((c) => c.k !== 'guest')
    && op.fire === 'clock' && op.atMin === 0 && pv.fire === (op.live ? 'manual' : 'chain') && g === '-10,-1'; })());   /* [OPEN_CLAP_GO_1019] 기본 개식(힘차게)은 박수를 청해 영상 소개가 디렉터 GO */
/* ★[OPEN_BLOCK_1014 · OPEN_GAP_1014 · PV_RESCUE_1014 라운드 3] 개식 선언은 블록 «예식 시작»(설명 한 줄 · 하객 맞이 설명을 빌리지 않는다) · 뒤 줄은 3초 쉬고 사슬 · 식전 영상은 [재생 안 됨](105) */
ok('[OPEN_BLOCK_1014 · OPEN_GAP_1014 · PV_RESCUE_1014] 개식 = 블록 «예식 시작» · 디지털 참석 날에도 하객 맞이 블록이 두 번 서지 않는다 · 뒤 줄(영상 · 화촉) 4.5초 사슬 · 식전 영상 [재생 안 됨] = 소리 없이 디렉터가 말로(FREE_FAIL_VOICE_OFF_1023) + 이야기 안심', (() => {
  const ST = require(P('assets/ritual-story.js'));
  const r = C.build({ course: 'open', on: { prevideo: 1 }, digital: 1 }, { mode: 'console' }), s = r.cues.map((c) => c.slug), i = s.indexOf('narr-open'), op = r.cues[i] || {}, nx = r.cues[i + 1] || {};
  const runs = []; r.cues.forEach((c) => { if (!runs.length || runs[runs.length - 1] !== c.blockN) runs.push(c.blockN); });
  const r2 = C.build({ course: 'open', on: { candle: 1 }, narEx: { candle: 1 } /* [BASE_SWAP_1023] 기본 «이제 …»는 B14 를 안 끼운다 · 뭉클 칩 */ }, { mode: 'console' }), s2 = r2.cues.map((c) => c.slug), nx2 = r2.cues[s2.indexOf('narr-open') + 1] || {}, nx3 = r2.cues[s2.indexOf('narr-open') + 2] || {};   /* [CANDLE_NAME_1019] 개식 → B14 → 화촉 여는 말 */
  const pv = r.cues.find((c) => c.k === 'prevideo') || {}, sc = ST.LIVE ? ST.LIVE[(pv.live || {}).t] : (ST.liveOf ? ST.liveOf((pv.live || {}).t) : null);
  return op.blockN === '예식 시작' && runs.filter((b) => b === '하객 맞이').length === 1 && !!(ST.blockOf && ST.blockOf('예식 시작') && ST.blockOf('예식 시작').how)
    && nx.slug === 'narr-prevideo-in' && nx.fire === 'manual' && !!(op.live && op.live.applause) && nx2.slug === 'bridge-b14-candle-name' && nx2.fire === 'chain' && nx2.gapMs === 4500 && /^narr-candle-in-/.test(nx3.slug || '') && nx3.fire === 'chain' && !nx3.gapMs   /* [SOURCE_FIRST_1016] 개식이 자료 BB 3 «…박수와 함성으로 시작하겠습니다!»로 박수를 청한다 — 잦아들 4.5초 · 옛 3초 */
    && pv.rescue && pv.rescue.slug === '' && /디렉터가/.test((pv.live || {}).fallback || '') && !!(pv.live && pv.live.fallback)   /* ★[FREE_FAIL_VOICE_OFF_1023 검토 151-1 4)] [재생 안 됨]은 남고 녹음 한 줄(105)은 쉰다 — 디렉터가 말로 */ && (!sc || (sc.safe && sc.fbSrc === pv.live.fallback)); })());
ok('[ONEMIN_FIRST · PHOTO_UP_1019] 식전 영상 + 사진 부탁(하객 안내 · 바깥 링크) + 온라인 참석 — 공지 클립이 모두 영상 앞', (() => { const s = slugs({ course: 'open', on: { prevideo: 1 }, guide: 1, photoShare: 1, digital: 1 }); const v = s.indexOf('narr-prevideo-in');
  return v > s.indexOf('narr-photo-ask') && v > s.indexOf('online-3-welcome') && s.indexOf('narr-photo-ask') > -1 && s.indexOf('online-3-welcome') > -1; })());
/* ★[CANDLE_NAME_1019 · OPEN_GAP_CHIP_1019 · PHOTO_UP_1019 검토 138-2 · 139] */
/* ★[OPEN_CLAP_GO_1019 검토 142-4] 박수를 청하는 개식 칩(힘차게 · 담백하게 · 다정하게) + 식전 영상 — 개식 줄에 하객 박수 사람 순간 · 영상 소개는 디렉터 GO(힌트 · 음악 내림) · 미리 듣기는 사슬 4.5초 그대로 · 나머지 칩 · 영상 없는 날은 사슬 그대로 */
ok('[OPEN_CLAP_GO_1019] 박수 청하는 개식 뒤 식전 영상 소개 = 디렉터 GO(콘솔) · 미리 듣기 4.5초 사슬 · 나머지 칩 3초 사슬 · 영상 없는 날 사슬', (() => {
  const at = (n, mode, on) => { const r = C.build({ course: 'open', on: on || { prevideo: 1 }, narEx: { open: n } }, { mode }); const i = r.cues.findIndex((c) => c.slug === 'narr-open'); return [r.cues[i], r.cues[i + 1]]; };
  const con = [0, 1, 2, 3, 4, 5].map((n) => { const [a, b] = at(n, 'console'); return (a.live && a.live.applause ? 'L' : '-') + b.fire[0] + (b.gapMs || 0); }).join();
  const pre = [0, 1, 2, 3, 4, 5].map((n) => { const [a, b] = at(n, 'preview'); return (a.live ? 'L' : '-') + b.fire[0] + (b.gapMs || 0); }).join();
  const [a0, b0] = at(0, 'console'), [c0, d0] = at(0, 'console', { candle: 1 });
  return con === 'Lm4500,-c3000,-c3000,-c3000,-c3000,-c3000' && pre === '-c4500,-c3000,-c3000,-c3000,-c3000,-c3000'   /* ★[SRC_ALL_1023 검토 144-5] 담백하게(149 · T2) · 다정하게(150 · NN)가 실제 개식사로 바뀌어 박수를 청하지 않는다 — 박수 칩은 힘차게(137) 하나 */
    && b0.slug === 'narr-prevideo-in' && !!b0.hint && b0.fadeMs > 0 && !c0.live && d0.fire === 'chain' && d0.gapMs === 4500; })());
ok('[OPEN_GAP_CHIP_1019] 개식 뒤 쉼 — 박수를 청하는 칩(힘차게) 4.5초 · 나머지(격식 있게 · 담백하게 · 다정하게 · 뭉클하게 · 차분하게) 3초', (() => { const g = (n) => { const r = C.build({ course: 'open', on: { prevideo: 1 }, narEx: { open: n } }, { mode: 'console' }); const s = r.cues.map((c) => c.slug); return r.cues[s.indexOf('narr-open') + 1].gapMs; }; return [0, 1, 2, 3, 4, 5].map(g).join() === '4500,3000,3000,3000,3000,3000'; })());   // [SRC_ALL_1023 검토 144-5] 박수를 청하는 칩은 힘차게 하나
ok('[CANDLE_NAME_1019] 영상 받는 말(261) → 3초 → «이어서, 화촉 점화가 있겠습니다.» → 화촉 여는 말(사슬) · 화촉 멘트가 «이제 · 먼저 · 그럼»으로 열면 안 끼운다 · 옛 코스엔 없다', (() => {
  const r = C.build({ course: 'open', on: { prevideo: 1, candle: 1 }, narEx: { candle: 1 } /* [BASE_SWAP_1023] 뭉클 칩 */ }, { mode: 'console' }), s = r.cues.map((c) => c.slug), i = s.indexOf('bridge-b14-candle-name'), b = r.cues[i] || {}, n = r.cues[i + 1] || {};
  const skip = [0, 2].every((n2) => C.build({ course: 'open', on: { candle: 1 }, narEx: { candle: n2 } }, { mode: 'console' }).cues.every((c) => c.slug !== 'bridge-b14-candle-name'));
  const old = Object.keys(D.COURSES).filter((k) => !D.COURSES[k].open).every((k) => C.build({ course: k }, { mode: 'console' }).cues.every((c) => c.slug !== 'bridge-b14-candle-name'));
  return s[i - 1] === 'narr-prevideo-out' && b.gapMs === 3000 && b.k === 'candle' && b.text === '먼저 오늘의 성스러운 예식을 위하여 축복의 촛불을 밝히는 순서가 있겠습니다.' /* [SRC_ALL_1023 검토 144-2] 자료 RR 그대로 */ && /^narr-candle-in-/.test(n.slug || '') && n.fire === 'chain' && skip && old; })());
ok('[PHOTO_UP_1019 · GUEST_5MIN_OFF_1023] 사진 안내 — 새 코스는 5분 전 시각(10분 전과 1분 전 사이 · clock -5) · 하객 안내 날 264(우리 올리기) · 바깥 링크 날 84 · 안내 없으면 없음 · 85 도 하객 안내 날 · 옛 코스는 종전대로(1분 전 뒤 · 링크 날)', (() => {
  const s = (o) => slugs(Object.assign({ course: 'open', on: {} }, o));
  const a = s({ guide: 1 }), b = s({ guide: 1, photoShare: 1 }), c = s({ photoShare: 1 }), d = s({});
  const after5 = (x, sl) => x.indexOf(sl) === x.indexOf('guest-2-10min') + 1 && x.indexOf(sl) + 1 === x.findIndex((y) => /^guest-4-1min/.test(y || '')) && x.indexOf('guest-3-5min') < 0;
  const oldK = Object.keys(D.COURSES).filter((k) => !D.COURSES[k].open)[0], o = slugs({ course: oldK, photoShare: 1 });
  return after5(a, 'narr-photo-upload') && a.indexOf('narr-photo-ask') < 0 && a.indexOf('narr-photo-send') > -1 && after5(b, 'narr-photo-ask') && b.indexOf('narr-photo-upload') < 0
    && c.indexOf('narr-photo-ask') < 0 && c.indexOf('narr-photo-upload') < 0 && c.indexOf('narr-photo-send') < 0 && d.indexOf('narr-photo-send') < 0
    && o.indexOf('narr-photo-ask') === o.findIndex((x) => /^guest-4-1min/.test(x || '')) + 1 && o.indexOf('narr-photo-upload') < 0; })());
ok('[ONEMIN_FIRST · GUEST_5MIN_OFF_1023] 식전 영상이 없어도 시각 같음(-10 · -1) · 하객 안내가 열린 날 사진 안내는 -5 시각', C.build({ course: 'open', on: {} }, { mode: 'console' }).cues.filter((c) => /^guest-[234]/.test(c.slug || '')).map((c) => c.atMin).join(',') === '-10,-1'
  && (C.build({ course: 'open', on: {}, guide: 1 }, { mode: 'console' }).cues.find((c) => c.slug === 'narr-photo-upload') || {}).atMin === -5 && (C.build({ course: 'open', on: {}, guide: 1 }, { mode: 'console' }).cues.find((c) => c.slug === 'narr-photo-upload') || {}).fire === 'clock');
ok('화촉이 뒤에 오면 04 → 89(guest-4-1min-pre)', (() => { const s = slugs({ course: 'open', on: { candle: 1 } }); return s.indexOf('guest-4-1min-pre') > -1 && s.indexOf('guest-4-1min') < 0; })());
ok('두 분 목소리면 04 는 그대로(첫 줄이 이미 맞다)', slugs({ course: 'open', on: { candle: 1 }, guestVoice: 'couple' }).indexOf('guest-4-1min') > -1);
ok('화촉 서는 분 → 여는 말 판', ['mothers', 'fathers', 'others'].every((w) => slugs({ course: 'open', on: { candle: 1 }, candleWho: w }).indexOf('narr-candle-in-' + w) > -1));
/* ★[DECLARE_BY_PERSON 2026-10-12 사장님] 선언 박수 판(96 · 97)은 걷었다 — 옛 초안의 clap 값이 와도 여는 말 136 → 사람 낭독 → 맺는 말 57 */
ok('[DECLARE_BY_PERSON · DECLARE_ANYONE] 옛 박수 판(clap) 값 → 96 · 97 없음 · 여는 말 136 · 맺는 말 57 · 누가 읽든 여는 말 하나(134 · 135 없음)', (() => { const s = slugs({ course: 'open', on: { declare: 1 }, declare: 'clap' }); return s.indexOf('declare-clap-a') < 0 && s.indexOf('declare-clap-b') < 0 && s.indexOf('narr-declare-in-friend') > -1 && s.indexOf('narr-declare-family-out') === s.indexOf('narr-declare-in-friend') + 1; })()
  && ['gdad', 'bdad', '신부 아버님', ''].every((w) => { const s = slugs({ course: 'open', on: { declare: 1 }, declareWho: w }); return s.indexOf('narr-declare-in-friend') > -1 && s.indexOf('narr-declare-in-gdad') < 0 && s.indexOf('narr-declare-in-bdad') < 0; }));
ok('[WINE_POUR_OFF] 옛 초안의 «두 와인» 값이 와도 붓기 없음 · 선창은 40 [TOAST_40_OPEN_1013]', (() => { const s = slugs({ course: 'open', on: { toast: 1 }, toast: 'both', wine: 'mix' }); return s.every((x) => x.indexOf('toast-pour') < 0) && s.indexOf('toast-toast') > -1 && s.indexOf('toast-both-b') < 0 && s.indexOf('toast-both-pour-b') < 0; })());
/* ★[TOAST_40_OPEN_1013 2026-10-13] 옛 초안(케이크 + 축배)이어도 새 코스 축배는 40 — 76 «잔이 가는 동안»은 닫는 인사 뒤에 나가지 않는다.
   ★[CAKE_OLD_OFF_1017 2026-10-17 사장님 «옛식순케이크빼»] 케이크 몫(42)도 이제 안 나간다 · 옛 코스 «둘 다»도 축배(40)만(종전 76 그대로) */
ok('[TOAST_40_OPEN_1013 · CAKE_OLD_OFF_1017] 옛 초안(케이크 + 축배) → 축배는 40 · 56 · 76 · 42 없음 · 닫는 인사 뒤 · 옛 코스 «둘 다»도 40 · 케이크 줄 없음', (() => { const s = slugs({ course: 'open', on: { toast: 1 }, toast: 'both', wine: 'none' });
  const o = C.build({ course: 'festive', toast: 'both', extra: { toast: 1 } }, { mode: 'console' }).cues.map((x) => x.slug);
  const st = slugs({ course: 'open', on: { toast: 1, table: 1 }, toast: 'both', wine: 'none' });   /* ★[REVIEW26_1023 검토 150-1 4)] 56 은 테이블 인사가 있는 날만 */
  return s.indexOf('toast-toast') > -1 && s.indexOf('narr-toast-out') < 0 && st.indexOf('narr-toast-out') < 0 /* [END_FLOW_1030] 축배 뒤는 늘 닫는 인사 — 56 없음 */ && s.indexOf('toast-both-b') < 0 && s.indexOf('toast-both-pour-b') < 0
    && s.indexOf('toast-both') < 0 && s.indexOf('toast-toast') < s.indexOf('narr-close-bow') && o.indexOf('toast-toast') > -1 && o.indexOf('toast-both-b') < 0 && o.indexOf('toast-both') < 0 && !o.some((x) => /cake/.test(x)); })());
/* ★★[REVIEW26_1023 검토 150] 하객 귀로 다시 듣기 — 간결 화촉 · 감사문 칩 · 닫는 멘트 220 · 56 · 마지막 순간 뒤 B8 · B9 255 · B12 · 예시 칩 · 알림 · 5분 전 */
ok('[REVIEW26_1023 검토 150] 간결 화촉 151 · 정석 축사 174 · 가족 덕담 232 · 기록 닫는 187 · 감사 인사 담은 날 감사문 칩 2 없음 · 220 없음 · 5분 전 칸 없음(GUEST_5MIN_OFF_1023 · 159 에서 걷음)', (() => {
  const ex = (k, base) => { const S = O.applyExample({ course: 'open' }, k); S.course = 'open'; return O.narExCue(S, base); };   // 큐는 기본 이름 · 고른 예시는 narExCue 가 바꿔 끼운다
  const b = ex('brief', 'narr-candle-in-mothers'), st = ex('standard', 'narr-free-in-speech'), fa = ex('family', 'narr-bless-end'), re = ex('record', 'narr-close-bow');
  const thx = (w) => O.narExOk({ course: 'open', on: { vow: 1, welcome: w ? 1 : 0 }, vowKind: 'thanks' }, 'thanks', 1);
  const g = C.build({ course: 'open', on: {} }, { mode: 'console' }).cues.find((c) => c.slug === 'guest-3-5min') || {};
  return b === '' /* [BASE_SWAP_1023] 간결 화촉 151 «담백하게»는 이제 기본 */ && ex('family', 'narr-candle-in-mothers') === 'narr-candle-in-mothers-ex2' /* 가족 = 뭉클 칩(91) */ && st === 'narr-free-in-speech-ex2' && fa === 'narr-bless-end-ex2' && re === 'narr-close-bow-ex4'
    && thx(false) && !thx(true) && O.NAR_EX.close.lines['narr-close'][1] === null && C.RETIRED['narr-close-ex3'] && !g.slug && C.RETIRED['guest-3-5min']; })());
ok('[REVIEW26_1023 검토 150] 마지막 순간이 서약 · 반지 · 편지(서로에게)면 B8 → 108 디렉터 GO · 감사문이면 B8 없음 · B9 는 늘 255 · 인사 «밝게»면 B12 없음', (() => {
  const end = (S) => { const cs = C.build(Object.assign({ course: 'open' }, S), { mode: 'console' }).cues, i = cs.findIndex((c) => c.slug === 'narr-close-bow'); return [cs[i - 1] && cs[i - 1].slug, cs[i] && cs[i].fire]; };
  const v = end({ on: { vow: 1 } }), r = end({ on: { ring: 1 } }), l = end({ on: { letter: 1 }, letter: 'each' }), t = end({ on: { vow: 1 }, vowKind: 'thanks' });
  const d = C.build({ course: 'open', on: { declare: 1, tribute: 1 } }, { mode: 'console' }).cues.map((c) => c.slug);
  const sg = (n) => C.build({ course: 'open', on: { song: 1, tribute: 1, declare: 1 }, narEx: { tribute: n } }, { mode: 'console' }).cues.map((c) => c.slug).indexOf('bridge-b12-tribute-calm');
  return v[0] === 'bridge-b8-face-guests' && v[1] === 'manual' && r[0] === 'bridge-b8-face-guests' && l[0] === 'bridge-b8-face-guests' && t[0] !== 'bridge-b8-face-guests'
    && d.indexOf('bridge-b9-declare-seat') < 0 && d.indexOf('bridge-b9-declare-seat-end') > -1 && sg(0) > -1 && sg(5) < 0; })());
ok('[REVIEW26_1023 검토 150-1 7)] 감사문 + 감사 인사를 담은 날만 알림(빼는 단추 · 닫기)', (() => {
  const a = O.noticeList({ course: 'open', on: { vow: 1, welcome: 1 }, vowKind: 'thanks' }), b = O.noticeList({ course: 'open', on: { vow: 1 }, vowKind: 'thanks' }), c = O.noticeList({ course: 'open', on: { vow: 1, welcome: 1 } });
  const n = O.noticeFull({ course: 'open', on: { vow: 1, welcome: 1 }, vowKind: 'thanks' });
  return a.some((m) => /감사 인사는 빼도 돼요/.test(m)) && !b.some((m) => /감사 인사는 빼도/.test(m)) && !c.some((m) => /감사 인사는 빼도/.test(m)) && !!n && n.key === 'thanks2' && n.close && n.acts.length === 1; })());
ok('[THANKS_SHOT_1013] 감사문을 고른 날 남는 장면은 감사문 장면 · 서약은 그대로', O.shotOf('vow', { vowKind: 'thanks' }) === '하객을 바라보며 읽는 두 분' && O.shotOf('vow', {}) === O.CARDS.vow.shot);
ok('[TOAST_40_OPEN_1013] ① 대표 줄도 40 · 화면 글은 엔진 글과 같다(따옴표만 다르다)', (() => { const sm = O.sampleOf('toast', {}); const t = (C.build(O.sampleS({}), { mode: 'console' }).cues.find((c) => c.slug === 'toast-toast') || {}).text || '';
  return sm.slug === 'toast-toast' && t.length > 0 && sm.screen.replace(/[«»'"]/g, '').replace(/\s+/g, '').replace(/,/g, '') === t.replace(/[«»'"]/g, '').replace(/\s+/g, '').replace(/,/g, '')   /* [SOURCE_FIRST_1016] 엔진 글은 자료 AA 따옴표 «'위하여'» · 화면은 «위하여» */; })());
ok('[WINE_POUR_OFF] 옛 초안의 «양가 한 병씩» 값이 와도 붓기 없음', slugs({ course: 'open', on: { toast: 1 }, toast: 'toast', wine: 'family' }).every((x) => x.indexOf('toast-pour') < 0));
ok('케이크만이면 붓기 없음', slugs({ course: 'open', on: { toast: 1 }, toast: 'cake', wine: 'mix' }).every((x) => x.indexOf('toast-pour') < 0));
/* ★[CLAP_FEW 2026-09-26 사장님] 104(맺는 말 «따뜻한 박수 부탁드립니다»)는 흐름에서 뺐다 · 클립은 FILES 에 둔다 */
/* ★[FREE_IN_RR_1023 검토 151-1 3)] 영상 · 선물 여는 말(100 · 102)은 쉰다 — 축사 말고는 여는 말 58(RR 109) 하나 */
ok('준비한 순서 판별 → 축사는 여는 말 103 · 영상 · 선물은 58(100 · 102 쉼) · 맺는 말 104 는 안 나온다(CLAP_FEW · FREE_IN_RR_1023)', ['video', 'gift', 'speech'].every((w) => { const s = slugs({ course: 'open', on: { free: 1 }, freeWhat: w }); const want = w === 'speech' ? 'narr-free-in-speech' : 'narr-free-in'; return s.indexOf(want) > -1 && s.indexOf('narr-free-out-clap') < 0 && s.indexOf('narr-free-in-video') < 0 && s.indexOf('narr-free-in-gift') < 0 && (w === 'speech' ? s.indexOf('narr-free-in') < 0 : s.indexOf('narr-free-in-speech') < 0); }));
/* [FREE_ETC 2026-10-06] 춤 · 공연 걷음 · 기타 = 지목하지 않는 여는 말(58) · 옛 dance · stage 도 기타 · 길이는 직접(1~10분 · 계약서 v1.12 [FREE_LEN10]) */
ok('[FREE_ETC] 기타(옛 dance · stage 포함) → 여는 말 58(narr-free-in) · 이름은 적은 글 · 길이 6분이면 사람 구간 60×6+8 · 12분을 적으면 기본 3분 · 칩에 춤 · 공연 없음', ['etc', 'dance', 'stage'].every((w) => slugs({ course: 'open', on: { free: 1 }, freeWhat: w }).indexOf('narr-free-in') > -1) && (() => { const c = C.build({ course: 'open', on: { free: 1 }, freeWhat: 'etc', freeEtc: '형제 깜짝 영상편지', freeLen: '6' }, { mode: 'console' }).cues.filter((x) => x.k === 'free')[0]; return c.name === '준비한 순서 시작 · 형제 깜짝 영상편지 · 6분' && c.live.est === 368 && !c.rescue; })() && O.chipOf('freeLen', { freeLen: '12' }) === '3' && O.chipOf('freeLen', { freeLen: '10' }) === '10' && O.CHIPS.free.map((x) => x[1]).join('|') === '영상|깜짝 선물 · 전달|축사|기타');   // [R2_SPEECH_LABEL_1014] 축사 칩 이름 = 칸 이름
ok('영상 판만 «재생 안 됨»을 든다(소리 없이 · 105 쉼 · FREE_FAIL_VOICE_OFF_1023) · [FREE_ETC] 기타는 없다', (() => { const f = (w) => C.build({ course: 'open', on: { free: 1 }, freeWhat: w }, { mode: 'console' }).cues.filter((c) => c.k === 'free')[0].rescue; return !!f('video') && f('video').slug === '' && !f('etc') && !f('gift') && !f('speech'); })());
/* ★[TRIB_CALL_SAY_1014 · PHOTO_SEND_FIRST_1014 라운드 3] 말로 인사 날 구호는 «그 마음을 담아,»(145) · 말 없이 날은 구호만(143) · 사진 보내기 안내(85)는 전체 사진 뒤 · 감사 인사 앞 */
ok('[TRIB_CALL_SAY_1014 · PHOTO_SEND_FIRST_1014] 말로 인사 = 145 «그 마음을 담아, …» + 울컥할 때 안심(fallback) · 말 없이 = 143 · 사진 링크 날 85 는 전체 사진 → 85 → 감사 인사(사슬) · 링크 없으면 85 없이 감사 인사가 디렉터 GO', (() => {
  const tr = (say) => C.build({ course: 'open', on: { tribute: 1 }, tributeSay: say }, { mode: 'console' }).cues.filter((c) => c.k === 'tribute');
  const a = tr('long'), b = tr('none'), ca = a.find((c) => /^tribute-call/.test(c.slug || '')) || {}, cb = b.find((c) => /^tribute-call/.test(c.slug || '')) || {};
  const ph = (on) => { const r = C.build({ course: 'open', on: {}, guide: on, meal: 1 }, { mode: 'console' }).cues,   /* [PHOTO_UP_1019] 새 코스는 하객 안내가 열린 날 */ s = r.map((c) => c.slug); return { s, r }; };
  const p1 = ph(1), p0 = ph(0), i85 = p1.s.indexOf('narr-photo-send'), ith = p1.r.findIndex((c) => c.act);   /* [END_FLOW_1030] 감사 인사(45) 대신 소리 없는 가족 구도 큐 */
  return ca.slug === 'tribute-call-say' && /^그 마음을 담아 신랑 신부, 인사!$/.test(ca.text || '') && cb.slug === 'tribute-call' && cb.text === '신랑 신부, 인사!'   /* [SOURCE_FIRST_1016] 자료 GG 1 구호 그대로 */
    && !!(a[1] && a[1].live && a[1].live.fallback) && !(b[1] && b[1].live && b[1].live.fallback)
    && i85 > p1.s.indexOf('narr-photo-pre-meal') && p1.s.indexOf('narr-photo-pre-meal') > -1 && p1.s.indexOf('end-1a-farewell') < 0 && p1.s.indexOf('end-0-photo') < 0 && p1.s.indexOf('narr-photo-out') < 0 /* [SRC_ALL_1023 검토 144-4] 새 코스는 44 · 65 없음 */ && i85 + 1 === ith && p1.r[ith].fire === 'chain' && p1.r[i85].fire === 'manual'
    && p0.s.indexOf('narr-photo-send') < 0 && (p0.r.find((c) => c.act) || {}).fire === 'manual'; })());
/* ★[SPLIT_OFF_OPEN_1023 검토 148-1] 새 코스는 60(«자리를 지켜 주시기 바랍니다.»)을 틀지 않는다 — 감사 인사(45 · 110) 다음이 바로 262 · 가족 구도 목표는 감사 인사 사람 구간이 맡아 자유 사진 몫이 그대로 · 옛 코스는 60 그대로 */
ok('[SPLIT_OFF_OPEN_1023] 새 코스 = 감사 인사 → 262(60 없음 · 가족 구도 시간은 감사 인사 줄) · 옛 코스는 60 그대로', [0, 1].every((meal) => {
  const r = C.build({ course: 'open', on: {}, meal }, { mode: 'console' }).cues, s = r.map((c) => c.slug), ia = r.findIndex((c) => c.act), t = r[ia] || {};   /* [END_FLOW_1030] 45 · 110 은 새 코스에서 안 튼다 — 가족 구도는 소리 없는 동작 큐 */
  return s.indexOf('narr-photo-split') < 0 && s.indexOf('end-1a-farewell') < 0 && s.indexOf('end-1c-thanks-nomeal') < 0 && s[ia + 1] === 'narr-photo-free' && !!t.live && /가족 구도/.test(t.live.t) && t.live.est > 300 && t.live.famGoal === 360;
}) && slugs({ course: 'damback', meal: 1 }).indexOf('narr-photo-split') > -1);
ok('[GROOM_BOW_TIP] 옛 초안의 신랑 큰절(bowGroom)도 꽃과 포옹 — 큰절 줄(106) 없음 · 사람 구간은 여는 말에', (() => { const r = C.build({ course: 'open', on: { tribute: 1 }, tribute: 'bowGroom' }, { mode: 'console' }).cues.filter((c) => c.k === 'tribute'); return r.map((c) => c.slug).join(',') === 'narr-tribute-name,tribute-in,tribute-call-say,tribute-hug,tribute-out' && !!r[1].live && !!r[2].live && !!r[3].live; })());   // [TRIB_CALL_SAY_1014] 말 칸을 안 고른 옛 초안도 말로 인사 판(sayT) → 145   // ★[TRIB_NAME_1014 · TRIB_CALL_1014] 이름 줄 → 여는 말(걸음) → 구호(인사 · 포옹) → 맺는 말
/* ★[TRIB_BACK_1014] 맺는 말(39 «두 분, 다시 앞으로 와 주세요») 뒤 돌아오는 사람 순간 — 다음 큐(닫는 인사 · 옛 코스의 다음 순간)는 두 분이 나란히 선 뒤 디렉터 GO(사슬이면 걷는 중에 «하객 여러분께 인사!») */
ok('[TRIB_BACK_1014] 부모님께 인사 맺는 말 뒤는 사람 순간(돌아와 나란히 섬 · 미리 듣기에서는 걷음) → 닫는 인사는 디렉터 GO «두 분이 앞에 나란히 서면»', [{ course: 'open', on: { tribute: 1 } }, { course: 'open', on: { tribute: 1 }, tributeSay: 'none' }].every((S0) => { const cs = C.build(S0, { mode: 'console' }).cues; const i = cs.findIndex((c) => c.slug === 'tribute-out'), t = cs[i] || {}, nx = cs[i + 1] || {};
  return !!t.live && t.live.consoleOnly === true && /돌아와 나란히/.test(t.live.t) && nx.slug === 'narr-close-bow' && nx.fire === 'manual' && nx.hint === '두 분이 앞에 나란히 서면'; }));
ok('옛 코스에선 신랑 큰절이 꽃으로 돌아간다', slugs({ course: 'family', tribute: 'bowGroom' }).indexOf('tribute-bow-groom') < 0);
ok('[ENTRY_SCENE] 첫 모습은 소리가 같다(맞절이어도 큐 목록이 바라보기와 같다)', JSON.stringify(slugs({ course: 'open', on: {}, entryScene: 'bow' })) === JSON.stringify(slugs({ course: 'open', on: {}, entryScene: 'look' })));
ok('새 코스에 옛 경고 셋이 안 뜬다', C.build({ course: 'open', on: {} }, {}).meta.warn.length === 0);
ok('예시 넷 · 콘솔 큐가 선다', O.EXAMPLES.every((e) => C.build(O.applyExample({ course: 'open' }, e.k), { mode: 'console' }).cues.length > 8));

/* ── 6. 옛 코스는 소리가 한 줄도 안 바뀐다(Q1 ② · 초안을 옮기지 않는다) ── */
const NEW = ['guest-4-1min-pre', 'narr-prevideo-in', 'narr-candle-in-mothers-ex2' /* [BASE_SWAP_1023 검토 156] 91 = 뭉클 칩 */, 'narr-candle-in-parents', 'narr-candle-in-fathers', 'narr-candle-in-others', 'narr-candle-out', 'declare-clap-a', 'declare-clap-b', 'toast-pour-mix', 'toast-pour-family',
  'narr-free-in-video', 'narr-free-in-stage', 'narr-free-in-gift', 'narr-free-in-speech', 'narr-free-out-clap', 'narr-free-fail', 'tribute-bow-groom', 'toast-both-pour-b',
  'narr-close-bow',   // ★[CLOSE_BOW 2026-09-26] 108 · 본식 끝 두 분 인사
  'fx-free',   // ★[GROUP_PHOTO 2026-09-26] 109 · 골라 트는 판 «자유 사진»
  'end-1c-thanks-nomeal',   // ★[PHOTO_THANKS 2026-09-26] 110 · 식사 없는 날 감사 인사(콘솔 전용)
  'bridge-b3-clap-thanks', 'bridge-b4-breath', 'bridge-b5-video-out', 'bridge-b6-lighter',   /* ★[BRIDGE_LINK 2026-10-03] 111~114 · 이음말 넷 */
  ...[2, 3, 4].flatMap((e) => ['1-arrival', '2-10min', '3-5min', '4-1min'].map((t) => 'guest-ex' + e + '-' + t)),   /* ★[GUEST_EX_NAR 2026-10-06] 115~126 · 하객 맞이 나레이션 예시 2~4 */
  'narr-vow-in-b',   /* ★[VOW_FIRST 2026-10-06] 127 · 서약 여는 말 · 신부부터 */
  'narr-prevideo-in-ex2', 'narr-prevideo-in-ex3', 'narr-prevideo-in-ex4',
  'narr-table-in',   /* ★[TABLE_GREET_1008 2026-10-08] 131 · 테이블 인사 여는 말 */
  'narr-entry-bow-ex2' /* [BASE_SWAP_1023] 132 = 잔잔 칩 */,   /* ★[MATJEOL_1011 2026-10-11] 132 · 입장 끝 맞절 */   /* ★[PV_EX_NAR 2026-10-07] 128~130 · 식전 영상 소개 나레이션 예시 2~4 */
  'narr-thanks-in',   /* ★[THANKS_IN_VOW 2026-10-11] 133 · 감사문 여는 말 */
  'narr-declare-in-gdad', 'narr-declare-in-bdad', 'narr-declare-in-friend',   /* ★[DECLARE_BY_PERSON 2026-10-12] 134~136 · 성혼 선언 여는 말 · [DECLARE_ANYONE] 134 · 135 는 RETIRED(번호 보존) */
  'narr-open', 'narr-candle-bow', 'narr-candle-bow-four', 'narr-candle-out-formal', 'narr-tribute-name', 'narr-tribute-pair', 'tribute-call', 'narr-entry-arrive', 'tribute-call-say',
  'narr-candle-bow-fathers', 'narr-candle-bow-others',
  'narr-open-ex2', 'narr-open-ex3', 'narr-open-ex4', 'narr-candle-in-mothers' /* [BASE_SWAP_1023] 151 = 기본 */, 'narr-candle-in-mothers-ex3',
  'narr-candle-in-mothers-ex4', 'narr-candle-in-fathers-ex2', 'narr-candle-in-fathers-ex3', 'narr-candle-in-parents-ex2', 'narr-candle-in-parents-ex3',
  'narr-candle-in-parents-ex4', 'narr-candle-in-others-ex3', 'narr-entry-bow' /* [BASE_SWAP_1023] 160 = 기본 */, 'narr-entry-bow-ex3', 'narr-entry-bow-ex4',
  'narr-vow-in-ex2', 'narr-vow-in-ex3', 'narr-vow-in-ex4', 'narr-vow-in-b-ex2', 'narr-vow-in-b-ex3',
  'narr-vow-in-b-ex4', 'narr-ring-in-ex2', 'narr-ring-in-ex3', 'narr-declare-family-out-ex2', 'narr-bless-mid-ex2',
  'narr-bless-mid-ex3', 'narr-free-in-speech-ex2', 'narr-free-in-speech-ex3', 'letter-each-ex2', 'letter-each-ex3',
  'narr-letter-end-ex2', 'narr-tribute-name-ex2', 'narr-tribute-name-ex3', 'narr-tribute-name-ex4', 'tribute-in-ex3',
  'tribute-call-ex3', 'tribute-out-ex4', 'narr-close-bow-ex2', 'narr-close-bow-ex3', 'narr-close-bow-ex4',
  'toast-toast-ex2', 'toast-toast-ex3', 'narr-table-in-ex2',
  'narr-candle-in-fathers-ex4', 'narr-candle-in-others-ex2', 'narr-ring-in-ex4', 'narr-bless-mid-ex4', 'narr-bless-end-ex4', 'narr-free-in-speech-ex4',
  'narr-declare-family-out-ex3', 'narr-declare-family-out-ex4', 'letter-each-ex4', 'narr-letter-end-ex4',
  'narr-ring-out-ex4', 'narr-song-ex2', 'narr-table-in-ex3', 'narr-song-ex3', 'narr-song-ex4', 'narr-bless-end-ex3', 'toast-toast-ex4', 'narr-welcome-in-ex2', 'narr-song-ex5', 'narr-song-end', 'narr-candle-out-ex2', 'narr-candle-out-ex3', 'narr-candle-out-ex4', 'narr-welcome-in-ex3', 'narr-welcome-in-ex4', 'narr-ring-out-ex2', 'narr-ring-out-ex3', 'narr-declare-in-friend-ex2', 'narr-close-ex2', 'narr-close-ex3', 'narr-close-ex4', 'narr-table-in-ex4', 'narr-table-in-ex5', 'narr-candle-in-others-ex4', 'narr-vow-out-ex2', 'narr-vow-out-ex3', 'narr-vow-out-ex4', 'narr-thanks-in-ex2', 'narr-thanks-in-ex3', 'narr-declare-in-friend-ex3', 'narr-declare-in-friend-ex4', 'narr-bless-end-ex2', 'letter-parent-ex2', 'letter-parent-ex3', 'letter-parent-ex4', 'tribute-in-ex2', 'tribute-in-ex4', 'tribute-call-ex2', 'tribute-call-ex4', 'tribute-call-say-ex2', 'tribute-call-say-ex3', 'tribute-call-say-ex4', 'bridge-b7-entry-ready', 'bridge-b8-face-guests', 'bridge-b9-declare-seat', 'bridge-b10-speech-clap', 'bridge-b11-song-light', 'bridge-b12-tribute-calm', 'bridge-b13-toast-stay', 'narr-song-end-friend', 'narr-open-ex5', 'narr-entry-bow-ex5', 'narr-ring-out-ex9', 'narr-tribute-name-ex5', 'bridge-b9-declare-seat-end', 'tribute-hug', 'narr-open-ex6', 'narr-entry-bow-ex6', 'narr-tribute-name-ex6', 'narr-thanks-in-ex4', 'narr-prevideo-out', 'narr-photo-free', 'bridge-b14-candle-name', 'narr-photo-upload', 'narr-photo-pre', 'narr-photo-pre-meal' /* [END_FLOW_1030] 265 · 266 */];   /* ★[REVIEW24_1019 검토 132 덧 2] 257 ~ 261 */   /* ★[REVIEW5_1018 인스타 섹션 검토 5판] 224 ~ 244 */   /* ★[REVIEW4_1018 인스타 섹션 검토 4판] 211 ~ 223 */   /* ★[REVIEW23_1018 인스타 섹션 검토 2 · 3판] 209 · 210 */   /* ★[REVIEW1_1018 인스타 섹션 검토] 207 · 208 */   /* ★[R10_SRC_1018 라운드 10] 204 ~ 206 */   /* ★[NARR_R9_1018 라운드 9] 201 ~ 203 */   /* ★[NARR_LOOP_1018 첫 판] 197 ~ 200 */   /* ★[T3_OK_1017] 191 ~ 196 자료 T3 예시 여섯 */   /* ★[EX_MANY_1017] 148 ~ 190 나레이션 멘트 예시 2 ~ 4(43) */   /* ★[CANDLE_CALL_SRC_1016] 146 · 147 */   /* ★[TRIB_CALL_SAY_1014] 145 */   /* ★[OPEN_DECL_1014 · CANDLE_CALL_1014 · CANDLE_TONE_1014 · TRIB_NAME_1014 · ENTRY_ARRIVE_1014] 137~144 */
ok('FILES 맨 끝 89~266 이 새 줄 178개(265 · 266 = 사진 전 안내 · END_FLOW_1030 · 148 ~ 190 = 나레이션 멘트 예시 · EX_MANY_1017 · 191 ~ 196 = 자료 T3 예시 · T3_OK_1017 · 197 ~ 200 = 자료 루프 첫 판 · NARR_LOOP_1018 · 201 ~ 203 = 라운드 9 · NARR_R9_1018 · 204 ~ 206 = 라운드 10 · R10_SRC_1018 · 207 · 208 = 인스타 섹션 검토 · REVIEW1_1018 · 209 · 210 = 인스타 섹션 검토 2 · 3판 · REVIEW23_1018 · 211 ~ 223 = 인스타 섹션 검토 4판 · REVIEW4_1018 · 224 ~ 244 = 인스타 섹션 검토 5판 · REVIEW5_1018 · 251 ~ 254 = 검토 7판 · REVIEW7_1018 · 255 · 256 = 검토 112 · 124 · REC_NEXT_APPLIED_1018)', JSON.stringify(C.FILES.slice(88)) === JSON.stringify(NEW));

/* ★★[THANKS_IN_VOW 2026-10-11 사장님 «서약 카드 안에서 고르기»(추천대로)] 서약 카드 «무엇을 읽나요» — 감사문을 고르면
   여는 말 133 → 두 분이 하객 쪽을 본 채 읽고 마지막 한 문장(THANKSBOTH)은 함께 · 맺는 말(서약의 «약속은 말로 끝나지 않습니다») 없음 · 다음 순간은 디렉터 GO.
   고르지 않으면(모르는 값 포함) 종전 서약 그대로. 시간은 맺는 말 몫(14초)만 짧다 */
{
  const on = {}; O.PICKABLE.forEach((k) => { on[k] = 1; });
  const D = require(P('assets/ritual-data.js'));
  const vc = (S, mode) => { const r = C.build({ course: 'open', on, ...S }, { mode: mode || 'console' }); const i = r.cues.findIndex((x) => x.k === 'vow'); return { v: r.cues.filter((x) => x.k === 'vow'), next: r.cues[r.cues.findIndex((x, j) => j > i && x.k !== 'vow')] }; };
  ok('[THANKS_IN_VOW] 감사문 = 여는 말 133 하나 · 맺는 말 없음 · 블록 «감사문» · 함께 읽는 한 문장 = THANKSBOTH([SOURCE_FIRST_1016] 감사문 자료는 «감사합니다»로 맺는다) · 다음 순간 디렉터 GO «마지막 한 문장을 함께 읽고 나면»', (() => {
    const a = vc({ vowKind: 'thanks' }); const c = a.v[0];
    return a.v.length === 1 && c.file === '133_narr-thanks-in' && c.text === D.NARR.thanksIn && c.blockN === '감사문' && c.live && c.live.peak === true
      && JSON.stringify(c.live.both) === JSON.stringify(D.THANKSBOTH) && D.THANKSBOTH.length === 1 && /하객 쪽을 보고/.test(c.live.t) && /감사문/.test(c.live.fallback)
      && a.next && a.next.fire === 'manual' && a.next.hint === '마지막 한 문장을 함께 읽고 나면'; })());
  ok('[THANKS_IN_VOW] 읽는 방식 · 먼저 읽는 분은 서약과 같은 칩 — 각자 차례로 · 신부부터면 «신부 먼저» · 번갈아 · 신부부터면 «(신부부터)»', (() => {
    const e = vc({ vowKind: 'thanks', vowHow: 'each', vowFirst: 'b' }).v[0].live, al = vc({ vowKind: 'thanks', vowFirst: 'b' }).v[0].live;
    return /신부 먼저, 신랑 다음으로 감사문/.test(e.tv) && e.first === 'b' && /번갈아 감사문 낭독\(신부부터\)/.test(al.tv); })());
  ok('[THANKS_IN_VOW] 고르지 않으면 · 모르는 값이면 서약 그대로(여는 말 13 · 맺는 말 14 · VOWBOTH)', ['vow', undefined, 'x'].every((k) => {
    const a = vc(k === undefined ? {} : { vowKind: k }); return a.v.length === 2 && a.v[0].file === '13_narr-vow-in' && a.v[1].file === '14_narr-vow-out' && JSON.stringify(a.v[0].live.both) === JSON.stringify(D.VOWBOTH); }));
  ok('[THANKS_IN_VOW] 시간 = 서약보다 17초 짧다(맺는 말 몫 · [REVIEW29_1023] 서약 여는 말 고은천 글로 다시 잼 · 옛 15 · 14) · 할 일 «감사문 · 한 분 300자쯤» · 설명 · 말하는 자리 글', (() => {
    const p0 = O.partsOf('vow', { on: { vow: 1 } }), p1 = O.partsOf('vow', { on: { vow: 1 }, vowKind: 'thanks' });
    return p0[0] - p1[0] === 17 && p0.slice(1).join() === p1.slice(1).join() && /^감사문 · 한 분 300자쯤/.test(O.prepOf('vow', { vowKind: 'thanks' })[0][1]) && /^서약문 · /.test(O.prepOf('vow', {})[0][1])
      && /감사문/.test(O.oneOf('vow', { vowKind: 'thanks' })) && O.oneOf('vow', {}) === O.CARDS.vow.one && /하객께 감사문/.test(O.talkOf('vow', { vowKind: 'thanks' })); })());
  ok('[THANKS_IN_VOW] 미리듣기 주소가 판 이름을 옮긴다(thanks · 모르는 값은 vow)', (() => { const w = {}; new Function('window', fs.readFileSync(P('assets/ritual-preview-link.js'), 'utf8'))(w); const pk = w.RitualPreviewLink.pick;
    return w.RitualPreviewLink.KEYS.indexOf('vowKind') > -1 && pk({ vowKind: 'thanks' }).vowKind === 'thanks' && pk({ vowKind: 'zz' }).vowKind === 'vow'; })());
}
/* [PV_EX_NAR 2026-10-07] 식전 영상 소개 — 나레이션 판만 예시를 따른다 · 두 분 목소리 판은 90 슬러그 그대로(두 분 소리를 물린다) · 모르는 값은 0 */
ok('[PV_EX_NAR] 식전 영상 소개 나레이션 예시 2~4 → 128~130 · 두 분 목소리 판은 90 · 모르는 값은 90', (() => {
  const g = (S) => C.build(S, { mode: 'console' }).cues.filter((c) => c.k === 'prevideo').map((c) => c.slug + ':' + c.file).join(',');
  const f = (n) => C.FILES.indexOf(n) + 1;
  return g({ course: 'open', on: { prevideo: 1 }, pvEx: 2 }).indexOf('narr-prevideo-in-ex3') === 0 && f('narr-prevideo-in-ex3') === 129
    && g({ course: 'open', on: { prevideo: 1 }, pvEx: 2, pvVoice: 'couple' }).indexOf('narr-prevideo-in:') === 0
    && g({ course: 'open', on: { prevideo: 1 }, pvEx: 9 }).indexOf('narr-prevideo-in:') === 0;
})());
/* [GUEST_EX_NAR 2026-10-06] 나레이션 판만 예시를 따른다 · 두 분 목소리 판은 그대로 · 예시 2~4 는 89 판 없이(1분 전 첫 줄이 «곧 문이 열리고»가 아니다) · 모르는 값은 0 */
ok('[GUEST_EX_NAR] 나레이션 예시 2~4 → 115~126 · 두 분 목소리 판은 01~04 · 영상이 있어도 89 대신 예시 1분 전', (() => {
  const g = (S) => C.build(S, { mode: 'console' }).cues.filter((c) => c.k === 'guest' && c.slug !== 'narr-open' && !/^bridge-/.test(c.slug)).map((c) => c.slug).join(',');   // [BRIDGE_MORE_1018] 입장 앞 이음말(B7)은 앞 순간(여기선 하객 맞이 · 개식) 끝에 붙는다   // [OPEN_DECL_1014] 개식 선언(137)은 하객 맞이 끝에 늘 · 예시 · 목소리와 상관없다(아래 한 줄)
  const op = (S) => C.build(S, { mode: 'console' }).cues.filter((c) => c.k === 'guest' && !/^bridge-/.test(c.slug)).map((c) => c.slug).pop() === 'narr-open';
  return g({ course: 'open', on: { prevideo: 1 }, guestEx: 2 }) === 'guest-ex3-1-arrival,guest-ex3-2-10min,guest-ex3-4-1min'   /* [GUEST_5MIN_OFF_1023] 5분 전 걷음 */
    && g({ course: 'open', on: { prevideo: 1 }, guestEx: 0 }).endsWith('guest-4-1min-pre')
    && g({ course: 'open', on: {}, guestEx: 2, guestVoice: 'couple' }) === 'guest-1-arrival,guest-2-10min,guest-4-1min'
    && op({ course: 'open', on: {}, guestEx: 2, guestVoice: 'couple' }) && op({ course: 'open', on: { prevideo: 1 }, guestEx: 2 }) && !C.build({ course: 'family' }, { mode: 'console' }).cues.some((c) => c.slug === 'narr-open')
    && g({ course: 'open', on: {}, guestEx: 9 }).startsWith('guest-1-arrival');
})());
/* [BRIDGE_LINK 2026-10-03] 이음말은 새 코스에서만 · 이웃 두 순간이 다 있을 때만 */
{
  const sl = (S, m) => C.build(S, { mode: m || 'console' }).cues.map((c) => c.slug);
  /* ★[CAKE_OLD_OFF_1017] 케이크(옛 초안 포함)가 돌지 않아 부모님께 인사 · 편지 뒤 본식 순간이 없다 — B4(숨 고르기) · B6(가벼운 순서로)는 이제 안 나간다(소리는 FILES 에 둔다) */
  const full = { course: 'open', on: { welcome: 1, vow: 1, ring: 1, declare: 1, tribute: 1, free: 1, letter: 1, cake: 1, toast: 1 }, freeWhat: 'video' };
  const a = sl(full), at = (s) => a.indexOf(s);
  ok('[BRIDGE_LINK · CAKE_OLD_OFF_1017] 다 담은 판(옛 초안 케이크 포함) — 선언 뒤 B3 · 영상 뒤 B5 없음(B5_OFF_1023 · 디렉터 GO) · 인사 뒤는 닫는 인사라 B4 없음 · B6 없음 [HEART_ORDER_1012]',
    at('bridge-b3-clap-thanks') === at('narr-declare-family-out') + 1 && at('bridge-b4-breath') < 0   /* [DECLARE_BY_PERSON] 선언 박수는 맺는 말 57 뒤 */
    && at('bridge-b5-video-out') < 0 && at('narr-free-in') > -1 && at('bridge-b6-lighter') < 0, a.join(' '));   /* ★B5 «영상은 여기까지입니다» 금지 — 2026-10-23 검토 151-1 4) [B5_OFF_1023] */
  { const nt = sl(Object.assign({}, full, { on: Object.assign({}, full.on, { tribute: 0 }) }));   /* [HEART_ORDER_1012] 인사를 안 담으면 편지 바로 뒤가 (옛) 케이크 — 케이크가 안 돌아 B6 도 없다 */
    ok('[BRIDGE_LINK · CAKE_OLD_OFF_1017] 인사를 안 담고 케이크를 담아 둔 옛 초안도 편지 뒤 B6 없음 [HEART_ORDER_1012]', nt.indexOf('bridge-b6-lighter') < 0 && !nt.some((x) => /cake/.test(x)), nt.join(' ')); }
  ok('[BRIDGE_LINK] 옛 코스에는 없다', !sl({ course: 'damback' }).some((s) => /^bridge-b/.test(s)));
  ok('[BRIDGE_LINK] 준비한 것이 영상이 아니면 B5 없음', !sl(Object.assign({}, full, { freeWhat: 'speech' })).includes('bridge-b5-video-out'));
  const noCake = sl(Object.assign({}, full, { on: Object.assign({}, full.on, { cake: 0 }) }));
  ok('[BRIDGE_LINK] 편지 바로 뒤가 케이크가 아니면 B6 없음', !noCake.includes('bridge-b6-lighter'), noCake.join(' '));
  const last = sl({ course: 'open', on: { declare: 1 } });
  ok('[BRIDGE_LINK] 뒤에 순간이 없으면(닫는 인사만) B3 없음', !last.includes('bridge-b3-clap-thanks'), last.join(' '));
  const pv = C.build(full, { mode: 'console' }).cues, b3 = pv.find((c) => c.slug === 'bridge-b3-clap-thanks');
  ok('[BRIDGE_LINK] 박수 뒤 첫 줄은 디렉터 GO(CLAP_GO)', !!b3 && b3.fire === 'manual');
}
/* ★[CLOSE_BOW 2026-09-26] 108 은 옛 코스에도 나온다 — 26(narr-close) 글이 «본식을 마칩니다»를 108 로 넘겨서, 108 을 빼면 옛 코스가 끝맺음 없이 사진으로 간다.
   (사장님 결정 3-1 CLAP_FEW 도 옛 코스 줄(16 · 20 · 24)을 바꿨다 — Q1 ② «옛 코스 소리 그대로»는 사장님 결정 둘에 한해 물러난다) */
/* [PHOTO_THANKS 2026-09-26 사장님 결정] 110(식사 없는 날 감사 인사)도 옛 코스에 나온다 — 사진 뒤 흐름은 코스와 상관없이 같다(옛 45 배웅도 모든 코스에 나왔다). */
/* ★[DECLARE_BY_PERSON 2026-10-12 사장님 «성혼 선언은 나레이션이 하지 않을 거야»] 옛 코스도 선언 여는 말(134~136)이 나온다 — 나레이션은 어떤 코스에서도 선언하지 않는다(Q1 ② «옛 코스 소리 그대로»가 사장님 결정에 한해 물러나는 셋째 자리) */
ok('옛 코스 여섯 · 전 판 — 새 줄이 안 나온다(108 닫는 인사 · 110 감사 인사 · 134~136 선언 여는 말만 예외)', ['damback', 'gamdong', 'family', 'minimal', 'festive', 'record'].every((c) =>
  ['toast', 'cake', 'both'].every((t) => { const s = slugs({ course: c, toast: t, extra: { toast: 1, free: 1 }, wine: 'mix', declare: 'clap', tribute: 'bowGroom', freeWhat: 'speech' }); return s.every((x) => x === 'narr-close-bow' || x === 'end-1c-thanks-nomeal' || /^narr-declare-in-/.test(x) || NEW.indexOf(x) < 0) && s.indexOf('narr-close-bow') === s.indexOf('narr-close') - 1; })));

/* ── 7. 빌더 배선 ── */
const B = fs.readFileSync(P('order-preview.html'), 'utf8');
ok('빌더가 ritual-open.js 를 본문 스크립트보다 먼저 읽는다', B.search(/<script src="\/assets\/ritual-open\.js(\?v=[\w]+)?">/) > -1 && B.search(/<script src="\/assets\/ritual-open\.js(\?v=[\w]+)?">/) < B.indexOf('var S={course:')   /* [ASSET_V] ?v= 붙어도 */);
ok('빌더 엔진 로더도 ritual-open.js 를 엔진 앞에', /'\/assets\/ritual-open\.js','\/assets\/ritual-cue\.js'/.test(B));
ok('새 방문자 기본 코스 = open', /var S=\{course:'open'/.test(B));
ok('새 코스에선 ↑↓ 가 막힌다', /if\(isOpen\(\)\) return;   \/\/ \[OPEN_COURSE\]/.test(B));
const K = fs.readFileSync(P('assets/ritual-preview-link.js'), 'utf8');
ok('미리듣기 주소가 on · wine · tributeSay · candleWho · freeWhat · freeLen 을 싣는다', ['on', 'wine', 'tributeSay', 'candleWho', 'freeWhat', 'freeLen'].every((k) => K.indexOf(`'${k}'`) > -1));

/* ★[REVIEW28_1023 검토 152] 엔진 고침 — 화촉 맺는 말은 늘 95(입장 C 갈래 걷음) · 화촉 여는 말 첫 문장이 «촛불 · 화촉»을 말하면 B14 없음 · 기록형 코스(문 열림 없음)의 입장 E 는 F */
ok('[CANDLE_OUT_ONE_1023 · REVIEW28_1023 검토 152] 입장 C 날도 화촉 맺는 말 = narr-candle-out(140 RETIRED)', (() => { const s = C.build({ course: 'open', on: { candle: 1 }, entry: 'C' }, { mode: 'console' }).cues.map((c) => c.slug); return s.indexOf('narr-candle-out') > -1 && s.indexOf('narr-candle-out-formal') < 0 && !!C.RETIRED['narr-candle-out-formal']; })());
ok('[B14_SKIP_CANDLE_1023 · REVIEW28_1023 검토 152] 아버님 화촉(93 «… 앞날을 환하게 밝히는 촛불을 …»)엔 B14 없음 · 어머님(91)엔 있음', (() => { const b = (w) => C.build({ course: 'open', on: { candle: 1, prevideo: 1 }, candleWho: w, narEx: w === 'mothers' ? { candle: 1 } : {} /* [BASE_SWAP_1023] 어머님 뭉클 칩(91) */ }, { mode: 'console' }).cues.some((c) => c.slug === 'bridge-b14-candle-name'); return !b('fathers') && b('mothers'); })());
ok('[ENTRY_E_NODOOR_1023 · REVIEW28_1023 검토 152] 기록형 코스 입장 E → F(«문 뒤에서 함께 입장» 없음) · 새 코스 E 는 그대로', (() => { const e = (S) => C.build(S, { mode: 'console' }).cues.filter((c) => c.k === 'entry').map((c) => c.slug)[0]; return e({ course: 'record', entry: 'E' }) === 'entry-F' && e({ course: 'open', on: {}, entry: 'E' }) === 'entry-E'; })());

/* ★[SEAM_BLESS_1023 검토 153] 선언 박수 → 덕담 여는 말 박수(173 · 예시 3) — 식순 화면의 이음새 판정(SEAM_KEYS)에 bless 를 넣어 다음 예시로 넘긴다 */
ok('[SEAM_BLESS_1023 검토 153] 선언 박수 뒤 덕담 여는 말 173 은 박수 겹침 → seamFit 이 다음 예시로 · 식순 화면 SEAM_KEYS 에 bless', (() => {
  const T = O.applyExample({ course: 'open' }, 'family'); T.narEx.bless = 2; const c = C.moodClash(T, 'bless'); C.seamFit(T, 'bless');
  return !!c && c.k === 'bless' && O.narExOf(T, 'bless') !== 2 && !C.moodClash(T, 'bless') && /var SEAM_KEYS=\[[^\]]*'bless'/.test(fs.readFileSync(P('order-preview.html'), 'utf8')); })());
/* ★[REVIEW29_1023 검토 153] 맞절 · 감사 인사 · 서약 · 반지 · 서약 맺는 말 글 = 자료 그대로 · 선언 예시 3 이름 «엄숙하게» */
ok('[REVIEW29_1023 검토 153] 132 EE A-2 · 11 polarisians · 13 · 127 고은천 · 226 innpirit · 169 이용진 · 230 «엄숙하게»', /^이어서 신랑 신부의 맞절이 있겠습니다\..*신랑 신부, 인사!$/.test(O.NAR_EX.matjeol.lines['narr-entry-bow'][0]) /* [BASE_SWAP_1023] EE A-2 = 예시 2 */
  && D.NARR.welcome.nar === '자리해 주신 하객들을 향한 신랑 신부의 감사 인사가 있겠습니다.' && D.NARV.welcome[0].nar === D.NARR.welcome.nar
  && /^다음은 혼인 서약의 순서가 있겠습니다\. .*신랑님, 혼인 서약을 읽어 주세요\.$/.test(D.NARR.vow.nar) && D.NARR.vow.narB === D.NARR.vow.nar.replace('신랑님, 혼인 서약', '신부님, 혼인 서약') /* [MODERN_WORDS_1024 검토 164] */ && D.NARV.vow[0].nar === D.NARR.vow.nar
  && /^아름다운 사랑의 서약이었습니다\./.test(O.NAR_EX.vow.lines['narr-vow-out'][1]) && /^먼저 신랑님께서 신부님의 손에/.test(O.NAR_EX.ring.lines['narr-ring-in'][0]) && O.NAR_EX.declare.names[2] === '엄숙하게');
/* ★[BASE_SWAP_1023 검토 156] 화촉 어머님 · 맞절 기본 ↔ 예시 2 — 기본 소리 151 · 160 · 칩 91 · 132 · 옛 초안(entryScene · exv 없음)의 «1»은 기본으로 · 새 S 의 «1»은 칩 */
ok('[BASE_SWAP_1023 검토 156] 기본 = 151 «담백하게» · 160 «격식 있게» · 칩 1 = 91 · 132 · 옛 초안의 1 은 기본 · 예시가 넣는 값은 새 차례(exv 2)', (() => {
  const b = (S) => C.build(S, { mode: 'console' }).cues.filter((c) => c.k === 'candle' && /^narr-candle-in-/.test(c.slug) || c.k === 'matjeol').map((c) => +c.no).join(',');
  return b({ course: 'open', on: { candle: 1 } }) === '151,160' && b({ course: 'open', on: { candle: 1 }, narEx: { candle: 1, matjeol: 1 } }) === '91,132'
    && b({ course: 'open', on: { candle: 1 }, entryScene: 'look', narEx: { candle: 1, matjeol: 1 } }) === '151,160' && b({ course: 'open', on: { candle: 1 }, entryScene: 'look', exv: 2, narEx: { candle: 1, matjeol: 1 } }) === '91,132'
    && b({ course: 'open', on: { candle: 1 }, entryScene: 'look', candleWho: 'fathers', narEx: { candle: 1 } }).split(',')[0] === '154'
    && O.applyExample({}, 'family').exv === 2 && O.narExOf(O.applyExample({}, 'family'), 'candle') === 1 && O.NAR_EX.candle.names({}).join() === '담백하게,뭉클하게,잔잔하게,애틋하게' && O.NAR_EX.matjeol.names[0] === '격식 있게'; })());
/* ★[REVIEW31_1023 검토 157] 라운드 2 — 01 · 02 · 09 · 131 · 213 · 257 글 · 선언 칩 «힘차게» · 분위기 · 반지 두 동작 쉼(RING_TWO_HOLD_1023) · 덕담 박수 → 축가 202 넘김(SEAM_KEEP_1018 이 이미 한다) */
ok('[REVIEW31_1023 검토 157] 01 · 02 · 09 · 131 · 213 · 257 글 · 선언 칩 «힘차게» · MOOD 밝게 3 · 뭉클 2 · 반지 둘째 동작 앞 8초 · 덕담 박수 뒤 축가 202 는 seamFit 이 넘긴다', (() => {
  const man = JSON.parse(fs.readFileSync(P('docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8')), hold = (no) => { const c = man.clips.find((x) => x.no === no); return c ? c.sents.map((x) => x.after).join(',') : ''; };
  const S = { course: 'open', on: { declare: 1, bless: 1, song: 1 }, narEx: { song: 1 } }, clash = C.moodClash(S, 'song'); C.seamFit(S, 'song');
  return /신랑 신부가 정성껏 고른 목소리로 진행됩니다\.$/.test(D.GUEST[0][1]) && /저희가 정성껏 고른 목소리/.test(D.GUEST[0][2])   // [REVIEW33_1023 검토 159] 01 · 02 첫 문장은 159 에서 다시 바뀜(아래 검사)
    && / 오늘 하루의 자연스러운 모습을, 곁에서 마음껏 사진으로/.test(D.GUEST[1][1]) /* [MODERN_WORDS_1024 검토 164] */ && D.ENTRY.E.nar.indexOf('신랑 신부의 입장이 있겠습니다.') < 0
    && D.NARR.tableIn.indexOf('테이블에 도착했을 때') < 0 && O.NAR_EX.candle.lines['narr-candle-out'][2] === '촛불이 밝혀졌습니다.' && /^바쁘신 와중에도 .*시작하겠습니다\.$/.test(O.NAR_EX.open.lines['narr-open'][4])
    && O.NAR_EX.declare.names.join() === '담백하게,격식 있게,엄숙하게,힘차게' && O.MOOD.bright.narEx.declare === 3 && O.MOOD.moving.narEx.declare === 2
    && hold('169') === '8,0' && hold('170') === '8,0' /* [RETAKE_168_1030 검토 168] 170 은 두 문장(신랑 → «이번에는 신부도») · 둘째 동작 앞 8초는 그대로 */ && hold('193') === '1,8,0' && !!clash && O.narExOf(S, 'song') !== 1 && !C.moodClash(S, 'song') && /var SEAM_KEYS=\[[^\]]*'song'/.test(fs.readFileSync(P('order-preview.html'), 'utf8')); })());
/* ★[SPEECH_EX_GUIDE_1023 · SONG_OPEN_PLAIN_1023 코워크 10/23 · 외부 검토] 고객은 안내보다 예시를 따라 쓴다 — 축사 예시에 안내가 빼라는 이야기(술자리 · 전 연인 · 몰래 쓴 돈)가 없다 · 축가 여는 말이 필수처럼 들리지 않는다 */
ok('[SPEECH_EX_GUIDE_1023] 축사 참고 예시 전부 술집 · 술자리 · 기억을 잃 · 몰래 · 저금통 · 세뱃돈 · 전 연인 0건 · 안내는 «술자리 이야기는 빼 주세요» 그대로', (() => {
  const w = {}; new Function('window', fs.readFileSync(P('assets/ritual-ref.js'), 'utf8'))(w);
  const rows = w.RITUAL_REF.rows.filter((r) => /^free:speech/.test(r.key)), bad = rows.filter((r) => /술집|술자리|술을|기억을 잃|몰래|저금통|세뱃돈|전 연인|전여친|전남친/.test(r.text));
  return rows.length >= 15 && !bad.length && /술자리 이야기는 빼 주세요/.test(fs.readFileSync(P('assets/ritual-open.js'), 'utf8')); })());
ok('[SONG_OPEN_PLAIN_1023] 축가 여는 말 기본 = «두 사람의 앞날을 축복하는 축가가 있겠습니다.»(«빠질 수 없는 순서» 없음) · 식순 화면 사본 같은 글 · 칩 «담백하게»', D.NARR.song === '두 사람의 앞날을 축복하는 축가가 있겠습니다.' && !/빠질 수 없는/.test(fs.readFileSync(P('order-preview.html'), 'utf8')) && O.NAR_EX.song.names[0] === '담백하게');
/* ★[PV_PHOTO_OFF_1023 검토 158 · PV_LINK_ONE 2026-10-04 사장님 «무조건 영상»] 식전 영상은 영상만 받는다 — «사진으로 저희가 영상을 만들어요» 길을 말하는 글이 없다 */
ok('[PV_PHOTO_OFF_1023 검토 158] 식전 영상 글(카드 · 흐름 설명 · 식순 화면 · AI 상담 지식 · 콘솔 메모)에 «사진으로 저희가 · 사진을 올린 링크 · 영상으로 만들어» 0건', (() => {
  const bad = /사진으로 저희가|사진으로 영상|사진을 올린|영상으로 만들어/;
  const ST = require(P('assets/ritual-story.js')), how = ((ST.blockOf && ST.blockOf('식전 영상')) || {}).how || '';
  const files = ['assets/ritual-open.js', 'assets/ritual-story.js', 'assets/ritual-cue.js', 'api/_ritual-kb.js', 'order-preview.html'].map((f) => fs.readFileSync(P(f), 'utf8').split('\n').filter((l) => bad.test(l) && !/PV_PHOTO_OFF_1023|^\s*(\/\/|\/\*|\*)/.test(l)).length);
  return !bad.test(O.CARDS.prevideo.one) && !bad.test(how) && files.every((n) => n === 0); })());
/* ★★[REVIEW33_1023 검토 159 · ADAPT_OK_1023 사장님 2026-10-23 «자료 없는 자리는 실제 멘트를 단어 몇 개만 고쳐 써도 된다»] 하객 맞이 · 사진 올리기 · 식전 영상 격식 · 두 분 예시 · 축배 예시를 실제 자료 글로 */
ok('[REVIEW33_1023 검토 159-2] 01 · 02 · 116 · 119 · 122 · 124 · 130 · 264 = 실제 자료 글 · 두 분 판은 «저희»', (() => {
  const N = O.NAR, X = C.EXTRA || {};
  return D.GUEST[0][1] === '바쁘신 가운데 시간을 내어, 오늘 결혼식에 참석해 주셔서 감사드립니다. 오늘 모든 안내는 신랑 신부가 정성껏 고른 목소리로 진행됩니다.'
    && D.GUEST[0][2] === D.GUEST[0][1].replace('신랑 신부가', '저희가') && N.guestEx[0][0] !== D.GUEST[0][1]
    && D.GUEST[1][1].indexOf('잠시 후 신랑 신부의 결혼식이 진행될 예정입니다. ') === 0 && D.GUEST[1][2].indexOf('잠시 후 저희의 결혼식이 진행될 예정입니다. ') === 0
    && N.guestEx[0][1].indexOf('잠시 후 아름다운 두 사람의 시작을 함께하게 될 텐데요. ') === 0 && N.guestEx[1][0].indexOf('귀한 걸음 해 주신 여러분, 고맙습니다. ') === 0 /* [WEEKDAY_SAFE_1030] */
    && N.guestEx[1][3] === '잠시 후 예식이 시작됩니다. 자리에 앉아 주시고, 휴대폰은 무음으로 바꿔 주시기 바랍니다.'   /* [YUKWAE_MODERN_1024] 122 다시 */
    && N.guestEx[2][1].indexOf('잠시 후 신랑 신부의 예식이 시작될 예정입니다. ') === 0 && N.pvEx[2] === '하객 여러분께서는 스크린에 주목해 주시기 바랍니다. 영상 함께 보시겠습니다.'
    && /'narr-photo-upload': '여러분이 받으신 모바일 청첩장의 하객 안내를 통해 오늘 찍으신 사진을 바로 올리실 수 있습니다\.'/.test(fs.readFileSync(P('assets/ritual-cue.js'), 'utf8')); })());
ok('[REVIEW33_1023 검토 159-3 · 159-4] 두 분 예시(다정 g0 · 격식 g0 · 유쾌 g3 · 입장 E) · 축배 예시 다섯 = 새 글 · 옛 글은 _OLD 에', (() => {
  const w = {}; new Function('window', fs.readFileSync(P('assets/ritual-ref.js'), 'utf8'))(w);
  const t = (id) => (w.RITUAL_REF.rows.filter((r) => r.id === id)[0] || {}).text;
  return /\['다정하게',\["저희 커플을 위해 시간 내 함께해 주셔서 정말 감사합니다\./.test(B) && /\['격식 있게',\["이렇게 좋은 날, 저희를 축복해 주시기 위해 어려운 걸음 소중한 걸음 해 주셨습니다\./.test(B)
    && B.indexOf('"잠시 후 저희의 결혼식이 시작됩니다. 자리에 앉아 주시고, 휴대폰은 무음으로 바꿔 주시기 바랍니다."]],') > -1 /* [YUKWAE_MODERN_1024] */ && D.ENTRY.E.self.indexOf('오늘은 저희에게 평생 아름답게 기억될 것 같습니다. ') === 0
    && t('509_toast-bride') === '모든 분들과 저희의 미래를 위하여!' && t('618_toast-bride') === '저희의 행복한 결혼생활을 위하여!' && t('818_toast-bride') === '저희의 영원한 사랑을 위하여!'
    && t('617_toast-groom').indexOf('오신 걸음걸음') === 0 && t('817_toast-groom') === '앞으로 행복하게 잘 살며 여러분과 함께하겠습니다.'
    && /"509_toast-bride": \[[^\]]*"모두의 행복을 위하여!"/.test(B) && B.indexOf('이제, 저희가 함께 걸음을 내딛습니다.') > B.indexOf('var ENTRY_OLD='); })());
ok('[ADAPT_OK_1023] 결정 주석이 엔진에 있고 · 고쳐 쓴(ADAPT) 자료 줄마다 출처에 ADAPT_OK_1023', (() => {
  const src = JSON.parse(fs.readFileSync(P('docs/plans/식순연구/자료그대로_1016.json'), 'utf8')).sents.filter((x) => /REVIEW33_1023/.test(x.src) && /ADAPT/.test(x.src));
  return /\[ADAPT_OK_1023 사장님 2026-10-23/.test(fs.readFileSync(P('assets/ritual-data.js'), 'utf8')) && src.length >= 1 && src.every((x) => /ADAPT_OK_1023/.test(x.src)); })());
/* ★★[GUEST_5MIN_OFF_1023 검토 159-1] 하객 맞이 5분 전 «목소리» 칸을 걷었다 — 실제 대본 18개는 10분 전 → 1분 전 2단 · 5분 시점엔 사진 올리기 안내만(하객 안내가 열린 날) */
ok('[GUEST_5MIN_OFF_1023 검토 159-1] 5분 전 칸 없음 — 엔진(나레이션 · 예시 2 ~ 4 · 두 분 목소리 · 옛 코스) · RETIRED 03 · 117 · 121 · 125 · 화면 두 분 줄 셋 · 콘솔 · 관리 화면', (() => {
  const any5 = (S) => C.build(S, { mode: 'console' }).cues.some((c) => /3-5min/.test(c.slug || ''));
  const oldK = Object.keys(D.COURSES).filter((k) => !D.COURSES[k].open)[0];
  const B5 = fs.readFileSync(P('order-preview.html'), 'utf8'), CO = fs.readFileSync(P('console.html'), 'utf8'), AD = fs.readFileSync(P('admin.html'), 'utf8');
  return ![{ course: 'open', on: {} }, { course: 'open', on: {}, guestEx: 1 }, { course: 'open', on: {}, guestEx: 2 }, { course: 'open', on: {}, guestEx: 3 }, { course: 'open', on: {}, guestVoice: 'couple' }, { course: oldK }].some(any5)
    && ['guest-3-5min', 'guest-ex2-3-5min', 'guest-ex3-3-5min', 'guest-ex4-3-5min'].every((k) => C.RETIRED[k])
    && /var GUEST_KEYS=\['g0','g1','g3'\];/.test(B5) && !/\['g2','시작 5분 전','guest'\]/.test(B5) && !/'g0','g1','g2','g3'/.test(B5) && !/'g0','g1','g2','g3'/.test(CO) && !/'g0','g1','g2','g3'/.test(AD)
    && (C.build({ course: 'open', on: {}, guide: 1 }, { mode: 'console' }).cues.find((c) => /^narr-photo/.test(c.slug || '')) || {}).atMin === -5; })());
/* ★★[YUKWAE_MODERN_1024 · QUALITY_REVIEW_1024 검토 160 고침판 · 사장님 10/24 «자료에 있다고 무조건 붙이지 말고 좋은 글인지 검토 · 유쾌는 너무 올드해»] */
ok('[YUKWAE_MODERN_1024 · QUALITY_REVIEW_1024] 유쾌 120 · 122 · 85 = 요즘 입말 · 두 분 유쾌 g0 · g1 · g3 짝 · 옛 사회자 말투 0 · 48 · 입장 A · 717 그대로', (() => {
  const X = fs.readFileSync(P('assets/ritual-cue.js'), 'utf8'), N = O.NAR.guestEx[1];
  const w = {}; new Function('window', fs.readFileSync(P('assets/ritual-ref.js'), 'utf8'))(w);
  const t = (id) => (w.RITUAL_REF.rows.filter((r) => r.id === id)[0] || {}).text || '';
  const old = /주시길 바랍니다|간혹 .*하는데|너무나도 좋을 것 같습니다|사랑의 이름으로|확인해 봐 주십시오/;
  return N[1] === '십 분 뒤 예식이 시작됩니다. 오늘은 자연스러운 모습을 사진으로 남기니, 여러분도 마음껏 셔터를 눌러 주세요.' && N[3] === '잠시 후 예식이 시작됩니다. 자리에 앉아 주시고, 휴대폰은 무음으로 바꿔 주시기 바랍니다.'
    && /'narr-photo-send': '찍어 주신 사진은 하객 안내의 사진 올리기로 공유해 주세요\.'/.test(X) && /'online-3-welcome': '화면으로 보고 계신 분들, 반갑습니다\.'/.test(X)
    && /\['유쾌하게',\["귀한 걸음 해 주신 여러분, 고맙습니다\. 오늘 모든 안내는 저희가 미리 준비한 목소리로 진행됩니다\.",\s*"십 분 뒤 저희의 결혼식이 시작됩니다\./.test(B)
    && ![N[0], N[1], N[3]].some((x) => old.test(x)) && /^각자의 길을 걸어온 저희가/.test(D.ENTRY.A.self) && t('717_toast-groom') === '멋지게 잘 살겠습니다!' /* [NO_FORCED_JOKE_1024] 163 의 717 바꾸기는 걷었다 */; })());
/* ★★[REF_GUIDED_1024 검토 163] 실제 자료가 없는 자리 = 베스트 실제 대사의 낱말을 빌려 다듬은 글 · 출처 줄은 «빌린 대사» */
ok('[REF_GUIDED_1024 검토 163] 231 · 198 · 196 · 259 · 207 · 축배 예시 918 = 새 글 · 출처 «빌린 대사» · 717 · 718 은 지금 글 그대로(NO_FORCED_JOKE_1024) · 옛 918 은 REF_OLD 에', (() => {
  const E = O.NAR_EX, w = {}; new Function('window', fs.readFileSync(P('assets/ritual-ref.js'), 'utf8'))(w);
  const r = (id) => w.RITUAL_REF.rows.filter((x) => x.id === id)[0] || {};
  const J = JSON.parse(fs.readFileSync(P('docs/plans/식순연구/자료그대로_1016.json'), 'utf8')).sents.filter((x) => /REF_GUIDED_1024/.test(x.src));
  const T = fs.readFileSync(P('docs/plans/식순연구/참고예시_글예시_말하는자리_늘린판_0927.tsv'), 'utf8').split('\n').filter((l) => /\t(918_toast-bride)\t/.test(l));
  return E.declare.lines['narr-declare-in-friend'][2] === '다음은 성혼 선언입니다. 선언을 맡아 주실 분께 박수와 환호 부탁드립니다!'
    && E.declare.lines['narr-declare-family-out'][2] === '두 사람의 약속이 확인되었습니다. 부부로서 첫 발걸음을 내딛는 두 사람에게 힘찬 박수 부탁드립니다!'
    && E.speech.lines['narr-free-in-speech'][2] === '다음은 축사입니다. 큰 박수로 맞아 주세요!'
    && E.tribute.lines['narr-tribute-name'][4] === '이제 부모님께 인사드릴 시간입니다. 눈물보다 웃음으로 인사드리겠습니다.'
    && E.toast.lines['toast-toast'][2] === "이제 모두 잔을 들어 주세요! 신랑 신부가 선창하면 다 함께 '위하여!'라고 힘차게 외쳐 주세요!"
    && r('717_toast-groom').text === '멋지게 잘 살겠습니다!' && r('718_toast-bride').text === '여기 계신 모든 분을 위하여!' /* [NO_FORCED_JOKE_1024] */ && r('918_toast-bride').text === '함께 잔을 든 오늘을 위하여!' && r('1018_toast-bride').text === '우리의 행복을 위하여!'
    && T.length === 1 && T.every((l) => /REF_GUIDED_1024 · 빌린 대사/.test(l)) && J.length >= 11 && J.every((x) => /^빌린 대사/.test(x.src))
    && !/"718_toast-bride":/.test(B) && !/빨래는 제가 개겠습니다|웃음 가득한 우리 집을/.test(fs.readFileSync(P('assets/ritual-ref.js'), 'utf8')) && /"918_toast-bride": \["사랑 넘치는 오늘을 위하여!"\]/.test(B); })());
/* ★★[MODERN_WORDS_1024 검토 164 · 사장님 «식순의 모든 글은 베스트로»] 낡은 낱말만 고침 · 뜻 · 칩 결 그대로 — 녹음 목록 살아 있는 줄에 «내빈 여러분들 · 거행 · ~하도록 하겠습니다 · ~오니 · 소지하고 계신 · 정숙한 · 할애하시어 · 진행표 말투 · «네,»» 0 (감정을 싣는 칩 91 은 그대로) */
ok('[MODERN_WORDS_1024 검토 164] 녹음 목록에 낡은 낱말 0(91 빼고) · 01 · 04 · 13 · 57 · 76 · 148 · 218 · 두 분 판 · 박수 청 «주세요»', (() => {
  const man = JSON.parse(fs.readFileSync(P('docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
  const R = /내빈 여러분들|거행|할애하시어|소지하고 계신|정숙한 진행|혼인서약 낭독\.|모셔볼 텐데요|점화하도록|낭독하시겠습니다|예정이오니|기록되오니|하도록 하겠습니다|^네, /;
  const bad = man.clips.filter((c) => c.file !== 'narr-candle-in-mothers-ex2').filter((c) => c.sents.some((x) => R.test(x.text)));
  const B2 = fs.readFileSync(P('order-preview.html'), 'utf8'), N = O.NAR_EX;
  return !bad.length && D.GUEST[0][1].indexOf('바쁘신 가운데 시간을 내어, ') === 0 && D.GUEST[0][2] === D.GUEST[0][1].replace('신랑 신부가', '저희가')
    && D.GUEST[3][1] === '다시 한번 말씀드립니다. 잠시 후 예식이 시작됩니다. 자리에 앉아 주시고, 휴대폰은 무음으로 바꿔 주시기 바랍니다.' && D.GUEST[3][2] === D.GUEST[3][1]
    && /신랑님, 혼인 서약을 읽어 주세요\.$/.test(D.NARR.vow.nar) && D.NARR.declareFamilyOut === '큰 박수로 두 사람을 축하해 주세요.'
    && N.open.lines['narr-open'][0].endsWith('신랑 신부의 결혼식을 시작하겠습니다.') && N.declare.lines['narr-declare-in-friend'][0].indexOf('다음은 두 사람이 부부가 되었음을 선언하는 성혼 선언입니다.') === 0
    && /'위하여!'로 답해 주세요\.$/.test(D.TOAST.both.nar2) && /주세요\|맞아\)/.test(fs.readFileSync(P('assets/ritual-cue.js'), 'utf8').match(/var CLAP_ASK = [^;]+;/)[0])
    && /저희의 결혼식이 시작될 예정입니다\. 오늘은 자연스러운 모습을 사진으로 남기니/.test(B2) && !/저희의 결혼식이 거행되겠습니다/.test(B2.split('var EX_OLD_1006=')[0]); })());
/* ★[IG_CLOSE_1024 사장님 릴스 · 검토 164] 닫는 인사 «다정하게»(186) = 정현철 사회자 «마지막 인사» 릴스 · 구호는 다른 칩과 같다 */
ok('[IG_CLOSE_1024] 186 = 릴스 글 · 구호 «신랑 신부, 하객 여러분께 인사!» · 출처 장부에 릴스', (() => {
  const L = O.NAR_EX.close.lines['narr-close-bow'], J = JSON.parse(fs.readFileSync(P('docs/plans/식순연구/자료그대로_1016.json'), 'utf8')).sents.filter((x) => /IG_CLOSE_1024/.test(x.src));
  return L[1].indexOf('살면서 이렇게 뜨거운 응원과 축하를 받는 일이 또 얼마나 있을까요? ') === 0 && L.every((x) => /신랑 신부, 하객 여러분께 인사!$/.test(x)) && J.length === 3 && !/이전에도 그랬듯이/.test(L.join()); })());
/* ★★[MUST_FIX_165_1024 검토 165 · 사장님 «추천대로 개선»] GPT 694줄 전수 검토 → 꼭 고칠 것 27줄 */
ok('[MUST_FIX_165_1024 검토 165] 17 · 151 · 154 · 120 · 107 · 189 · 165 · 168 · 153 · 두 분 유쾌 g1 · 참고 예시 15칸 · 안내 «숨 돌릴 틈» · «미리 준비한»', (() => {
  const N = O.NAR, E = O.NAR_EX, w = {}; new Function('window', fs.readFileSync(P('assets/ritual-ref.js'), 'utf8'))(w);
  const t = (id) => (w.RITUAL_REF.rows.filter((r) => r.id === id)[0] || {}).text || '', B3 = fs.readFileSync(P('order-preview.html'), 'utf8'), OP = fs.readFileSync(P('assets/ritual-open.js'), 'utf8');
  return /각자의 와인을 한 잔에 부어 주시면 됩니다\.$/.test(D.NARR.valleyWine) && /축복의 불을 밝혀 주시겠습니다\./.test(N.candleIn.mothers) && /축복의 불을 밝혀 주시겠습니다\./.test(E.candle.lines['narr-candle-in-fathers'][0])
    && N.guestEx[1][1].indexOf('오늘은 자연스러운 모습을 사진으로 남기니, ') > 0 && N.toastBothPour.indexOf('신랑 신부의 영원한 사랑과 행복을') === 0 && /축배를 들겠습니다\./.test(E.toast.lines['toast-toast'][1])
    && E.vow.lines['narr-vow-in'][2].indexOf('사랑하는 가족, 소중한 친구,') === 0 && E.vow.lines['narr-vow-in-b'][2] === E.vow.lines['narr-vow-in'][2] && /오늘 그 멈춰 있던 시간이 다시 흐르길/.test(E.candle.lines['narr-candle-in-mothers'][2])
    && /"십 분 뒤 저희의 결혼식이 시작됩니다\. 오늘은 자연스러운 모습을 사진으로 남기니/.test(B3)
    && /앞으로도 오래 웃으며 만나자\./.test(t('622_speech-close-friend')) && !/며늘아/.test(t('609_bless-father')) && /^언제나 아내의 편이 되는 남편이 되겠습니다\./.test(t('903_vow-groom')) && /^서로의 시간을 존중하는 아내가 되겠습니다\./.test(t('904_vow-bride'))
    && !/아무 일은 서울로/.test(t('707_letter-each-groom')) && /사랑하는 사람을 어떻게 대해야 하는지/.test(t('502_letter-each-bride')) && /"609_bless-father": \[[^\]]*며늘아/.test(B3)
    && !/사이가 풀려요/.test(OP) && (OP.match(/중간에 숨 돌릴 틈이 생겨요/g) || []).length >= 6 && /미리 준비한 두 분 목소리가 흘러요/.test(OP); })());
/* ★★[REVIEW_166_1030 검토 166] 프리뷰 실화면 전수 점검 — A 띄어쓰기(녹음 기록 글도 같게) · C 표기 · D 참고 예시 */
ok('[REVIEW_166_1030 검토 166 A · C · D] 149 · 224 · 144 · 136 · 205 · 178 띄어쓰기(엔진 = 녹음 기록) · «말없이» · «인사말» · «영상이 끝나면» · 선언 · 반지 글 · 참고 예시 9칸', (() => {
  const RCJ = JSON.parse(fs.readFileSync(P('assets/audio/narration/_recorded.json'), 'utf8')).clips, w = {}; new Function('window', fs.readFileSync(P('assets/ritual-ref.js'), 'utf8'))(w);
  const t = (id) => (w.RITUAL_REF.rows.filter((r) => r.id === id)[0] || {}).text || '', B4 = fs.readFileSync(P('order-preview.html'), 'utf8'), rec = (k) => (RCJ[k] || {}).text || '';
  const A = [['149_narr-open-ex3', '오늘 함께하신 여러분도'], ['224_narr-candle-in-others-ex4', '두 분의 화촉 점화 순서가'], ['144_narr-entry-arrive', '두 사람이 한자리에 섰습니다.'], ['136_narr-declare-in-friend', '오늘의 성혼 선언은'], ['205_narr-song-ex4', '축복하는 축하 공연이'], ['178_narr-letter-end-ex2', '가득한 결혼 생활이']];
  return A.every(([k, x]) => rec(k).indexOf(x) > -1) && D.NARR.entryArrive.indexOf('한자리에') > -1 && O.CHIPS.tribute[1][1] === '말없이'
    && /'두 분이 부모님 쪽으로 돌아서 앞으로 가요'/.test(B4) && /읽으면 두 분이 부부가 되었음을 알려요/.test(O.CARDS.declare.one) && /반지를 끼우는 두 손을/.test(B4)
    && !/안지가|발표날|주위사람들에게|똑부러지게|유럽배낭여행/.test(['620_speech-story1-friend', '820_speech-story1-bride-friend', '821_speech-story2-bride-friend', '719_speech-open-brother'].map(t).join())
    && !/너가/.test(t('820_speech-story1-bride-friend') + t('821_speech-story2-bride-friend')) && /^당신과 함께한 등산은 근사한 경험이었습니다\./.test(t('09_vow-bride')) && /장인어른, 장모님, 사랑합니다\.$/.test(t('713_tribute-cross-groom'))
    && /"09_vow-bride": \[[^\]]*당신과 함께라면 등산이/.test(B4) && /function _mkSecW\(n\)/.test(B4); })());
/* ── 8. 실브라우저(--live) ── */
if (process.argv.includes('--live')) {
  let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
  if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
  const srv = http.createServer((q, r) => { const f = decodeURIComponent(q.url.split('?')[0]); const p = P(f); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/javascript' }); r.end(b); }); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
  const br = await pw.chromium.launch();
  for (const w of [390, 1280]) {
    const pg = await br.newPage({ viewport: { width: w, height: 900 } });
    const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await pg.waitForTimeout(600);
    await pg.click('#next'); await pg.waitForTimeout(600); await pg.click('#next'); await pg.waitForTimeout(600);
    /* [PICK_V2 2026-09-26] 띠(op-band)는 거뒀다 — 시간 둘은 아래 막대(#opCta) · 늘 있는 칸은 «늘 있어요»(.pk-fix) */
    const g = () => pg.evaluate(() => ({ band: ((document.getElementById('opCta') || {}).textContent || '').replace(/\u00a0/g, ' '), empty: (document.querySelector('.pk-fp-empty') || {}).textContent || '', note: (document.querySelector('.op-note .op-note-t') || {}).textContent || '', ow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      moves: document.querySelectorAll('.mvb').length, locks: document.querySelectorAll('.pk-fixmk').length   /* [FIX_MARK_O] */, text: (document.getElementById('stage') || document.body).textContent }));   // ★body 는 인라인 스크립트 글까지 센다
    let s = await g();
    ok(`${w} 빈 채 — [EMPTY_ONE_LINE_1023] 아래 막대 없음 · 흐름 판 한 줄 «입장 · 맞절 · 닫는 인사로 시작해요. 예시를 고르거나 원하는 순간을 더해 주세요.»`, (!s.band && s.empty === '입장 · 맞절 · 닫는 인사로 시작해요. 예시를 고르거나 원하는 순간을 더해 주세요.' && !/만으로도 다음으로/.test(s.text)), s.band + ' | ' + s.empty);
    ok(`${w} 빈 채 알림 없음 · 늘 있어요 셋(입장 · 맞절 · 닫는 인사 · 식전 영상은 담는 칸 [PREVIDEO_PICK] · [MATJEOL_SPLIT_1013]) · ↑↓ 없음 · 가로 넘침 0`, !s.note && s.locks === 3 && s.moves === 0 && s.ow <= 0, JSON.stringify({ note: s.note, locks: s.locks, moves: s.moves, ow: s.ow }));
    ok(`${w} 새 화면에 금지어 없음`, !['추천', '인기', '베스트', '추가 비용'].some((x) => s.text.indexOf(x) > -1));   // [SONG_BACK_1011] «축가»는 이제 순간 이름
    await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(400); s = await g();
    ok(`${w} ‹가족› 예시 → 약 17~22분(정적 WANT 사진과 인사와 같은 값 · [BASE_SWAP_1023] 153 판 16~22)`, /약 17~22분/.test(s.band), s.band);   // [WINE_POUR_OFF] · [DECLARE_BY_PERSON 10/12] 정적 WANT 는 17~23 으로 고쳤는데 이 실브라우저 줄만 16~23 에 남아 있었다
    // [ACTS_FOUR] «마음의 순간» 첫 칸 — ★[SPEECH_TILE_1012] 옛 «있을 때만» 준비한 순서 칸이 «축사»(다른 순간과 같은 칸)가 됐다
    const addBtn = await pg.$('[data-fk="opt:free"]');
    ok(`${w} 축사 칸에 담기 원이 있다 · «있을 때만» 글은 없다 [SPEECH_TILE_1012]`, !!addBtn && await pg.evaluate(() => { const t = document.querySelector('[data-fk="pto:free"]').textContent; return /축사/.test(t) && !/있을 때만/.test(t); }));
    if (addBtn) { await addBtn.click(); await pg.waitForTimeout(500); }
    const fOn = await pg.evaluate(() => !!(S.on && S.on.free) && S.freeWhat === 'speech' && document.querySelector('[data-fk="opt:free"]').getAttribute('aria-pressed') === 'true');
    ok(`${w} 누르면 축사가 담기고(늘 축사 판) 원이 ✓ 로 바뀐다`, fOn);
    /* [LISTEN_PAGE] 판 칩은 ② 로 옮겼다 — ① 에서는 값을 바로 넣어 띠가 따라오는지만 본다(칩 자체는 listen-page.mjs 가 ② 에서 누른다) */
    const b3 = (await g()).band; await pg.evaluate(() => { S.freeLen = '1'; render(); }); await pg.waitForTimeout(400); const b1 = (await g()).band;
    ok(`${w} 길이(3분 → 1분)가 띠에 곧장`, b3 !== b1, b3 + ' → ' + b1);
    await pg.click('[data-fk="opt:free"]'); await pg.waitForTimeout(400);
    await pg.click('[data-fk="opt:letter"]'); await pg.waitForTimeout(300); await pg.evaluate(() => { S.letter = 'parent'; render(); }); await pg.waitForTimeout(300); s = await g();
    ok(`${w} [TRIB_ONE_SAY] 말로 인사 + 편지 부모님께 → «말이 두 번» 알림 없음`, s.note !== O.NOTICE.twice, s.note);
    const steps = await pg.evaluate(() => (window.STEPS || []).map((x) => x.k).join(','));
    ok(`${w} 네 걸음 = 고르기 · 보고 듣기 · 연습하기 · 완성 [LISTEN_PAGE · PRACTICE_STEP]`, steps === 'intro,intro2,pick,listen,practice,done', steps);   // [PRACTICE_STEP] ③ «글 적기»(write)가 «연습하기»(practice)로 바뀐 뒤 이 줄만 남아 있었다
    ok(`${w} pageerror 0`, errs.length === 0, errs.slice(0, 2).join(' | '));
    await pg.close();
  }
  await br.close(); srv.close();
}
