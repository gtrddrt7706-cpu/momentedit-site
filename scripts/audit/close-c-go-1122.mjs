#!/usr/bin/env node
/* ★★[CLOSE_C_GO_1122 대표님 11/22 19:17 «추천대로» · 대본 CLOSE_C_GO_1122 · CLOSE_ONE_BOW_1122] 온라인 날 폐식 인사 한 번
   ① 온라인 날(S.digital) — 폐식 판(108 · 칩 185 · 186 · 187)이 386 ~ 389(구령 앞 «현장과 화면 너머에서 함께해 주신 모든 분들, 정말 고맙습니다.») · 62(온라인 인사) 없음 · 송출 종료 = 마무리 멘트(liveEnd)
   ② 오프라인 날 — 108 · 칩 판 그대로 · 62 없음 · liveEnd 없음  ③ 글 = 녹음 기록 = 녹음 대본 · 소리 파일 있음  ④ 옛 코스는 그대로(62 는 사진 구간)
   종료 0 초록 · 1 빨강 */
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(import.meta.url);
const O = require(path.join(ROOT, 'assets/ritual-open.js')); const D = require(path.join(ROOT, 'assets/ritual-data.js')); const C = require(path.join(ROOT, 'assets/ritual-cue.js'));
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const no = (c) => String((c || {}).file || '').split('_')[0];
const LINE = '현장과 화면 너머에서 함께해 주신 모든 분들, 정말 고맙습니다.', CALL = '신랑 신부, 하객 여러분께 인사!';
const REC = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/audio/narration/_recorded.json'), 'utf8')).clips, MAN = fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8');
const base = { 0: '108', 1: '185', 2: '186', 3: '187' }, onl = { 0: '386', 1: '387', 2: '388', 3: '389' };
for (const ex of ['standard', 'family', 'brief', 'record']) for (const dg of [false, true]) for (const n of [0, 1, 2, 3]) {
  const S = O.applyExample({ course: 'open' }, ex); S.course = 'open'; S.digital = dg; S.narEx = Object.assign({}, S.narEx, { close: n });
  const cs = C.build(C.norm(S), { mode: 'console' }).cues, i = cs.findIndex((c) => c.k === '_close'), c = cs[i], nx = cs[i + 1] || {};
  const want = dg ? onl[n] : base[n], tag = `${ex} ${dg ? '온라인' : '오프라인'} 칩 ${n + 1}`;
  ok(no(c) === want && c.slug === 'narr-close-bow', `①② ${tag} 폐식 = ${want}`);
  ok(!cs.some((q) => q.slug === 'narr-online-in'), `①② ${tag} 62 없음`);
  ok(/^narr-closing/.test(nx.slug || '') && !!nx.liveEnd === dg && !nx.goLeadMs, `①② ${tag} 다음 = 마무리 멘트 · 송출 종료 ${dg ? '여기' : '없음'} · 뜸 없음`);
  if (dg) { const k = c.file; ok(c.text.endsWith(LINE + ' ' + CALL) && REC[k] && REC[k].text === c.text && MAN.includes(LINE) && MAN.includes(k.split("_").slice(1).join("_")) && fs.existsSync(path.join(ROOT, 'assets/audio/narration', k + '.mp3')), `③ ${tag} 글 = 녹음 기록 = 녹음 대본 · 소리 있음`); }
}
{ const cs = C.build(C.norm({ course: 'record', digital: true }), { mode: 'console' }).cues; ok(!cs.some((q) => /-online$/.test(q.ex || q.slug || '')), '④ 옛 코스 온라인 날 — 386 ~ 389 안 씀'); }
console.log(bad ? `✗ CLOSE_C_GO_1122 실패 ${bad}건` : '✓ CLOSE_C_GO_1122 맞음'); process.exit(bad ? 1 : 0);
