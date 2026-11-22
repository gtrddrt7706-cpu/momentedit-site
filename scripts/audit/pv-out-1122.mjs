#!/usr/bin/env node
/* ★★[PV_OUT_OFF_1122 대표님 11/22 17:16 · 17:33 · 영상 방 PREVIDEO_OUT_1122] 식전 영상 끝 — 261 «두 사람의 진심이 …» 없음 · 영상 끝(GO) → 다음 순간 곡(6초 뜸) → 곡 위로 첫 줄
   ① 예시 넷 · 소개 멘트 판 셋 모두 261 없음 · RETIRED  ② 화촉 날 영상 뒤 = 263(GO · 곡 뜸 6초 · 말 아래) → 여는 말 사슬 1.2초  ③ 첫 문장부터 «촛불»인 여는 말(아버님 93)은 263 없이 여는 말이 첫 줄(GO · 곡 뜸)
   ④ 화촉 없는 날 = B7(정적 · 입장 곡은 입장 GO)  ⑤ 영상 없는 날(개식 → 화촉)은 종전 그대로
   종료 0 초록 · 1 빨강 */
import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(import.meta.url);
const O = require(path.join(ROOT, 'assets/ritual-open.js')); require(path.join(ROOT, 'assets/ritual-data.js')); const C = require(path.join(ROOT, 'assets/ritual-cue.js'));
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const no = (c) => String((c || {}).file || '').split('_')[0];
const build = (S) => C.build(C.norm(S), { mode: 'console' }).cues;
const ex = (e, add) => { const S = O.applyExample({ course: 'open' }, e); S.course = 'open'; return Object.assign(S, add || {}); };
ok(!!(C.RETIRED || {})['narr-prevideo-out'] || /'narr-prevideo-out': 1 \/\* ★\[PV_OUT_OFF_1122\]/.test(require('node:fs').readFileSync(path.join(ROOT, 'assets/ritual-cue.js'), 'utf8')), '① 261 RETIRED(번호 · 파일 보존)');
for (const e of ['standard', 'family', 'brief', 'record']) for (const pv of [0, 1, 2]) {
  const cs = build(ex(e, { pvEx: pv })), i = cs.findIndex((c) => c.k === 'prevideo'); if (i < 0) continue;
  ok(!cs.some((c) => c.slug === 'narr-prevideo-out'), `① ${e} 소개 판 ${pv + 1} — 261 없음`);
  const a = cs[i + 1], b = cs[i + 2];
  ok(no(a) === '263' && a.fire === 'manual' && a.goLeadMs === 6000 && a.leadDb != null && a.duck > -60 && /영상이 끝나면/.test(a.hint || ''), `② ${e} 판 ${pv + 1} 영상 끝 GO → 곡 6초 뜸 → 263(말 아래)`);
  ok(b && b.k === 'candle' && /^narr-candle-in-/.test(b.slug || '') && b.fire === 'chain' && b.gapMs === 1200 && !b.goLeadMs, `② ${e} 판 ${pv + 1} 263 → 여는 말(${no(b)}) 사슬 1.2초`);
}
{ const cs = build({ course: 'open', on: { candle: 1, prevideo: 1 }, candleWho: 'fathers' }), i = cs.findIndex((c) => c.k === 'prevideo'), a = cs[i + 1];
  ok(no(a) === '93' && a.fire === 'manual' && a.goLeadMs === 6000 && !cs.some((c) => c.slug === 'bridge-b14-candle-name'), '③ 아버님 화촉(첫 문장 «촛불») — 263 없이 93 이 첫 줄 · GO · 곡 뜸'); }
{ const S = ex('standard'); delete S.on.candle; const cs = build(S), i = cs.findIndex((c) => c.k === 'prevideo'), a = cs[i + 1];
  ok(no(a) === '243' && a.fire === 'manual' && a.duck <= -60, '④ 화촉 없는 날 — 영상 끝 GO → B7(정적) · 입장 곡은 입장 GO'); }
{ const S = ex('standard'); delete S.on.prevideo; const cs = build(S), i = cs.findIndex((c) => c.k === 'candle');
  ok(no(cs[i]) === '151' && cs[i - 1].slug === 'narr-open' && !cs.some((c) => c.slug === 'bridge-b14-candle-name'), '⑤ 영상 없는 날(개식 → 화촉 «이제 …») 종전 그대로 263 없음'); }
console.log(bad ? `✗ PV_OUT_OFF_1122 실패 ${bad}건` : '✓ PV_OUT_OFF_1122 맞음'); process.exit(bad ? 1 : 0);
