#!/usr/bin/env node
/* ★★[NARR_GO_1122 대표님 11/22 10:02 «나레이션 추천대로» · 대본 NARR_GO_1122 · 릴스 방 NARR_종합_1119 · ONLINE_GREET_1119] 엔진 순서 · 쉼 · 고르기 — 예시 넷 × 온라인 날로 실제 큐를 만들어 잰다
   ① 기본 개식 온라인 날 = 385 · 48 없음 · 다른 개식 예시 온라인 날은 48 그대로(316 뒤 1초)  ② 10분 전 = 녹음 길이 셈(정석 309 이십)  ④ 성혼 박수 뒤 255 → 111
   ⑤ 식전 영상 뒤 화촉 여는 말이 스스로 화촉을 말하면 263 없음 · 여는 말 3초  ⑥ 화촉 여는 말과 «밝히» 겹치면 맺는 말 95  ⑦ 예시 넷 맞절 252  ⑧ 맞절 252 바로 뒤 서약 여는 말 = 384
   종료 0 초록 · 1 빨강 */
import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(import.meta.url);
const O = require(path.join(ROOT, 'assets/ritual-open.js')); require(path.join(ROOT, 'assets/ritual-data.js')); const C = require(path.join(ROOT, 'assets/ritual-cue.js'));
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const cues = (ex, add) => { const S = O.applyExample({ course: 'open' }, ex); S.course = 'open'; Object.assign(S, add || {}); return C.build(S, { mode: 'console' }).cues; };
const no = (c) => String(c.file || '').split('_')[0];
const at = (cs, n) => cs.findIndex((c) => no(c) === String(n));
for (const ex of ['standard', 'record', 'family', 'brief']) { const cs = cues(ex); ok(cs.some((c) => no(c) === '252'), `⑦ ${ex} 맞절 = 252 · 160 없음`); ok(!cs.some((c) => no(c) === '160'), `⑦ ${ex} 160 안 나옴`); }
{ const cs = cues('standard', { digital: true }); ok(at(cs, 385) > -1 && at(cs, 48) < 0 && at(cs, 137) < 0, '① 정석 온라인 날 개식 = 385 · 48 · 137 없음'); ok(at(cs, 316) > -1 && at(cs, 316) < at(cs, 385), '① 1분 전 316 → 개식 385'); }
{ const cs = cues('standard'); ok(at(cs, 137) > -1 && at(cs, 385) < 0, '① 온라인 아닌 날은 137 그대로'); ok(at(cs, 309) > -1, '② 정석 10분 전 = 309 «약 이십 분»'); }
{ const cs = cues('family', { digital: true }), i = at(cs, 48); ok(i > -1 && !cs[i].gapMs && no(cs[i - 1]) === '316', '① 가족(개식 예시) 온라인 날 48 그대로 · 316 뒤 콘솔 기본 2초(gapMs 0 = 기본 · NARR_GO_48GAP_1122)'); ok(at(cs, 385) < 0, '① 개식 예시를 고른 날은 385 안 씀'); }
{ const cs = cues('family'), a = at(cs, 255), b = at(cs, 111); ok(a > -1 && b === a + 1, '④ 가족 성혼 박수 뒤 255 → 111'); ok(cs[a].fire === 'manual' && cs[b].fire === 'chain', '④ 박수 뒤 GO 로 255 · 111 은 이어서');
  const v = at(cs, 261); ok(v > -1 && at(cs, 263) < 0 && no(cs[v + 1]) === '91' && cs[v + 1].gapMs === 3000, '⑤ 가족 식전 영상 뒤 263 없음 · 91 이 3초 뒤'); ok(at(cs, 95) > -1 && at(cs, 211) < 0, '⑥ 가족 화촉 맺는 말 = 95(211 «밝혔습니다» 겹침 없음)'); }
{ const S = O.applyExample({ course: 'open' }, 'family'); S.course = 'open'; S.on.prevideo = 0; delete S.on.prevideo; const cs = C.build(S, { mode: 'console' }).cues; ok(at(cs, 263) > -1, '⑤ 식전 영상 없는 날(개식 → 화촉)은 263 그대로'); }
{ const cs = cues('brief'), m = at(cs, 252); ok(m > -1 && no(cs[m + 1]) === '384' && at(cs, 13) < 0, '⑧ 간결 맞절 252 바로 뒤 서약 여는 말 = 384(«마주 보고 서» 한 번)'); }
{ const S = O.applyExample({ course: 'open' }, 'brief'); S.course = 'open'; S.narEx = Object.assign({}, S.narEx, { matjeol: 0 }); const cs = C.build(S, { mode: 'console' }).cues; ok(at(cs, 13) > -1 && at(cs, 384) < 0, '⑧ 맞절 160(«마주 보고 서» 없음) 날은 13 그대로'); }
console.log(bad ? `✗ NARR_GO_1122 실패 ${bad}건` : '✓ NARR_GO_1122 맞음'); process.exit(bad ? 1 : 0);
