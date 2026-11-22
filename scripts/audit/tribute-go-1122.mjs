#!/usr/bin/env node
/* ★★[TRIBUTE_GO_1122 대표님 11/22 15:50 «E가 좋은 거 같은데» · 대본 TRIBUTE_GO_1122 · REC141_1122] 부모님께 인사 장면 «규칙 판 + 새 141 E»
   ① 141 = 한 문장 통째 테이크 5 · 글 «부모님께,» 쉼표(엔진 · 녹음 기록 · 녹음 대본 셋이 같은 글) · 받은 테이크가 저장소에 있다
   ② 새 코스 걷는 말 기본 = 236(«… 이동해 주시기 바랍니다.») · 38 은 새 코스 기본에 없다 · 예시 칩 3 · 4 는 그 칩 글 그대로
   ③ 쉼 — 248 → 이름 줄 1.2초 · 이름 줄 → 걷는 말 1.7초(간결 · 기록은 서약 맺는 말 뒤 4.5초 그대로)
   종료 0 초록 · 1 빨강 */
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(import.meta.url);
const O = require(path.join(ROOT, 'assets/ritual-open.js')); require(path.join(ROOT, 'assets/ritual-data.js')); const C = require(path.join(ROOT, 'assets/ritual-cue.js'));
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const cues = (ex, add) => { const S = O.applyExample({ course: 'open' }, ex); S.course = 'open'; Object.assign(S, add || {}); return C.build(S, { mode: 'console' }).cues; };
const no = (c) => String(c.file || '').split('_')[0];
const at = (cs, n) => cs.findIndex((c) => no(c) === String(n));
const T141 = '기쁘면서도 섭섭하고, 대견하면서도 마음 한편이 뭉클하실 부모님께, 신랑 신부가 감사의 마음을 전하겠습니다.';
/* ① 글 · 소리 */
ok(O.NAR.tributeName === T141, '① 141 엔진 글 «부모님께,» 쉼표');
{ const R = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/audio/narration/_recorded.json'), 'utf8')).clips['141_narr-tribute-name'] || {};
  ok(R.text === T141 && /REC141_1122/.test(R.splice || ''), '① 141 녹음 기록 = 같은 글 · REC141_1122 테이크'); }
{ const M = fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'); ok(M.includes(T141), '① 녹음 대본(manifest)도 같은 글'); }
ok(fs.existsSync(path.join(ROOT, 'assets/audio/_src/_takes/REC141_1122/e5__narr-tribute-name-0.flac')), '① 받은 테이크 5 가 저장소에(scripts/rec141-1122.py 가 다시 만든다)');
/* ②③ 예시 넷 */
for (const ex of ['standard', 'family', 'brief', 'record']) {
  const cs = cues(ex), n = at(cs, 141), w = at(cs, 236);
  ok(n > -1 && w === n + 1, `② ${ex} 141 바로 뒤 걷는 말 = 236`);
  ok(at(cs, 38) < 0, `② ${ex} 38(«… 이동하겠습니다.») 안 나옴`);
  ok(w > -1 && cs[w].slug === 'tribute-in' && cs[w].fire === 'chain' && cs[w].gapMs === 1700, `③ ${ex} 141 → 236 사슬 1.7초`);
  const b = at(cs, 248);
  if (b > -1) ok(n === b + 1 && cs[n].fire === 'chain' && cs[n].gapMs === 1200 && !cs[n].goLeadMs && cs[n].leadDb == null, `③ ${ex} 248 → 141 사슬 1.2초 · 음악 뜸 없음(TRIBUTE_GAP_1122 · 곡은 141 아래에서 오름)`);
  else ok(n > -1 && cs[n].gapMs === 4500, `③ ${ex} 248 없는 날 · 서약 맺는 말 뒤 4.5초 그대로`);
}
/* ★[TRIBUTE_GAP_1122] 248 뒤 곡 내림(1.5초)은 걸어 두고 기다리지 않는다(free) — 기다리면 콘솔에서 말 사이 2.7초 · 콘솔 runPost 가 free 를 읽는다 */
{ const cs = cues('standard'), b = at(cs, 248), p = (cs[b].post || [])[0] || {};
  ok(p.music === 'to' && p.v <= -60 && p.free === true, '③ 248 뒤 곡 내림 free(사슬 쉼이 말끝부터)');
  ok(/later\(function\(\)\{ runPost\(list, i\+1, done\); \}, st\.free \? 0 : \(st\.ms \|\| 0\)\)/.test(fs.readFileSync(path.join(ROOT, 'console.html'), 'utf8')), '③ 콘솔 runPost 가 free 를 읽는다'); }
/* 예시 칩 — 3 · 4 는 그 칩 걷는 말 · 5 · 6 은 걷는 말이 없어 새 기본(236) · 쉼은 칩과 상관없이 같은 자리 */
for (const [n, f] of [[1, '236'], [2, '182'], [3, '237'], [4, '236'], [5, '236']]) {
  const cs = cues('standard', { narEx: Object.assign({}, O.applyExample({ course: 'open' }, 'standard').narEx, { tribute: n }) }), w = cs.findIndex((c) => /^tribute-in/.test(c.slug || ''));
  if (f) ok(w > -1 && no(cs[w]) === f && cs[w].gapMs === 1700, `② 칩 ${n + 1} 걷는 말 = ${f} · 1.7초`);
  else ok(w > -1 && no(cs[w]) !== '38' && cs[w].gapMs === 1700, `② 칩 ${n + 1} 걷는 말 = 그 칩 글(${no(cs[w] || {})}) · 1.7초`);
}
/* 옛 코스는 38 그대로 */
{ const D = require(path.join(ROOT, 'assets/ritual-data.js')); ok(D.TRIBUTE.nar === '신랑 신부는 천천히 부모님 앞으로 이동하겠습니다.', '② 옛 코스 글(38)은 그대로'); }
console.log(bad ? `✗ TRIBUTE_GO_1122 실패 ${bad}건` : '✓ TRIBUTE_GO_1122 맞음'); process.exit(bad ? 1 : 0);
