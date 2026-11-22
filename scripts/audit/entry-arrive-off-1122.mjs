#!/usr/bin/env node
/* ★★[ENTRY_ARRIVE_OFF_1122 대표님 11/22 «144 이 멘트도 필요할까? 맞절 멘트가 바로 나온다면?» · 대본 찬성] 입장 받는 말(144) 걷기
   ① 새 코스 예시 넷 × 맞절 칩 다섯 — 144 없음 · 입장 줄 바로 뒤 맞절 여는 말(디렉터 GO · hint «두 분이 앞에 서고 박수가 잦아든 뒤») · 도착 잦아듦(fadeWith · 4.5초 · −90)
   ② 144 는 RETIRED(파일 보존) · 옛 코스는 그대로(144 원래 없음)  ③ 미리 듣기 잦아듦 — bgm-bed 가 순간 경계에서도 fadeWith 를 읽는다
   종료 0 초록 · 1 빨강 */
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(import.meta.url);
const O = require(path.join(ROOT, 'assets/ritual-open.js')); require(path.join(ROOT, 'assets/ritual-data.js')); const C = require(path.join(ROOT, 'assets/ritual-cue.js'));
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
for (const ex of ['standard', 'family', 'brief', 'record']) for (const n of [0, 1, 2, 3, 4]) {
  const S = O.applyExample({ course: 'open' }, ex); S.course = 'open'; S.narEx = Object.assign({}, S.narEx, { matjeol: n });
  const cs = C.build(C.norm(S), { mode: 'console' }).cues, i = cs.findIndex((c) => c.k === 'matjeol'), c = cs[i], p = cs[i - 1] || {};
  ok(!cs.some((q) => q.slug === 'narr-entry-arrive') && p.k === 'entry' && c.slug === 'narr-entry-bow' && c.fire === 'manual' && /두 분이 앞에 서고 박수가 잦아든 뒤/.test(c.hint || '') && c.fadeWith === true && c.fadeMs === 4500 && c.duck <= -60,
    `① ${ex} 맞절 칩 ${n + 1} — 144 없음 · 입장 → 맞절 여는 말(${String(c.file).split('_')[0]}) GO · 도착 잦아듦 4.5초`);
}
const cue = fs.readFileSync(path.join(ROOT, 'assets/ritual-cue.js'), 'utf8');
ok(/'narr-entry-arrive': 1 \/\* ★\[ENTRY_ARRIVE_OFF_1122\]/.test(cue), '② 144 RETIRED(파일 보존)');
ok(fs.existsSync(path.join(ROOT, 'assets/audio/narration/144_narr-entry-arrive.mp3')), '② 144 소리 파일은 그대로');
ok(!C.build(C.norm({ course: 'record' }), { mode: 'console' }).cues.some((q) => q.slug === 'narr-entry-arrive'), '② 옛 코스 — 144 원래 없음 그대로');
ok(/var _fw0=\(pv&&nx&&pv\.k!==nx\.k\)\?cueBy\(nx\.slug\):null; if\(_fw0&&_fw0\.fadeWith\)/.test(fs.readFileSync(path.join(ROOT, 'assets/bgm-bed.js'), 'utf8')), '③ 미리 듣기 — 순간 경계에서도 도착 잦아듦(fadeWith)');
console.log(bad ? `✗ ENTRY_ARRIVE_OFF_1122 실패 ${bad}건` : '✓ ENTRY_ARRIVE_OFF_1122 맞음'); process.exit(bad ? 1 : 0);
