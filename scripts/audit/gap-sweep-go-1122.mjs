#!/usr/bin/env node
/* ★★[GAP_SWEEP_GO_1122 대표님 11/22 23:15 «①③ 승인 · 엔진 반영»] «음악만 먼저»가 승인한 쉼을 덮던 두 자리 — 음악 뜸을 걷고 쉼 그대로
   ① 맞절 뒤 «하객 쪽으로»(244) → 다음 줄(감사문 133 · 감사 인사 여는 말 칩) = 사슬 1.2초 · 뜸 없음 · 곡은 그 줄 아래에서 3초에 걸쳐 오른다
   ③ 개식 바로 뒤 사슬로 잇는 화촉 여는 말(영상 없는 날 · 이음말 없이) = 3.0초(OPEN_GAP_CHIP_1019) · 뜸 없음 · 같은 오름
   ② 가족 판 이음말(263) → 화촉 여는 말은 대표님이 판을 고르기 전까지 종전 그대로(뜸 6초) — 고르면 이 검사의 ② 기대를 그 판으로 바꾼다
   종료 0 초록 · 1 빨강 */
import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(import.meta.url);
const O = require(path.join(ROOT, 'assets/ritual-open.js')); require(path.join(ROOT, 'assets/ritual-data.js')); const C = require(path.join(ROOT, 'assets/ritual-cue.js'));
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const build = (ex, f) => { const S = O.applyExample({ course: 'open' }, ex); S.course = 'open'; if (f) f(S); return C.build(C.norm(S), { mode: 'console' }).cues; };
const no = (c) => String(c.file || '').split('_')[0];
const at = (cs, n) => cs.findIndex((c) => no(c) === String(n));
const noLead = (c) => !c.goLeadMs && c.leadDb == null;
/* ① */
for (const ex of ['standard', 'family', 'brief', 'record']) {
  const cs = build(ex, (S) => O.thanksSet && O.thanksSet(S, true)), t = at(cs, 133);
  if (t < 0) { ok(true, `① ${ex} 감사문 없음(건너뜀)`); continue; }
  ok(no(cs[t - 1]) === '244' && cs[t].fire === 'chain' && cs[t].gapMs === 1200 && noLead(cs[t]) && cs[t].fadeMs === 3000, `① ${ex} 244 → 133 사슬 1.2초 · 음악 뜸 없음 · 곡 3초 오름`);
}
{ const cs = build('standard', (S) => { S.narEx = Object.assign({}, S.narEx, { welcome: 2 }); }), b = at(cs, 244);
  if (b > -1 && cs[b + 1] && cs[b + 1].k === cs[b].k) ok(cs[b + 1].gapMs === 1200 && noLead(cs[b + 1]), `① 같은 모양(244 → 감사 인사 여는 말 칩 ${no(cs[b + 1])}) 도 1.2초 · 뜸 없음 [COURSE_WIDE]`); }
/* ③ */
for (const n of [1, 2, 3]) {
  const cs = build('standard', (S) => { delete S.on.prevideo; S.narEx = Object.assign({}, S.narEx, { open: n }); }), o = cs.findIndex((c) => /^narr-open/.test(c.slug || '')), c = cs[o + 1];
  if (c && c.k === 'candle' && c.fire === 'chain') ok(c.gapMs === 3000 && noLead(c) && c.fadeMs === 3000, `③ 개식 칩 ${n + 1} → 화촉 여는 말 ${no(c)} 사슬 3.0초 · 뜸 없음 · 곡 3초 오름`);
  else ok(true, `③ 개식 칩 ${n + 1} 뒤 사슬 화촉 아님(박수 뒤 GO 등 · 종전 그대로)`);
}
{ const cs = build('standard', (S) => { delete S.on.prevideo; S.narEx = Object.assign({}, S.narEx, { open: 2 }); }); ok(no(cs[at(cs, 151) - 1]) === '149' && at(cs, 151) > -1, '③ 담백 · 영상 없는 날 = 149 → 151'); }
/* ② 종전 그대로(판 고르기 전) */
{ const cs = build('family', (S) => { delete S.on.prevideo; }), i = at(cs, 91);
  ok(i > -1 && no(cs[i - 1]) === '263' && cs[i].goLeadMs === 6000, '② 가족 판 · 영상 없는 날 263 → 91 은 판 고르기 전까지 종전(뜸 6초)'); }
console.log(bad ? `✗ GAP_SWEEP_GO_1122 실패 ${bad}건` : '✓ GAP_SWEEP_GO_1122 맞음'); process.exit(bad ? 1 : 0);
