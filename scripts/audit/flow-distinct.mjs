#!/usr/bin/env node
/* ★★[FLOW_DIST_1017 2026-10-17 사장님 «식순에 그래프 똑같은데 개선해 봐»]
   ① 고르기의 예시 넷(정석 · 기록 · 가족 · 간결) 감동 곡선이 서로 다른 모양인가를 잰다.
   종전에는 세기가 세 단계(3 · 4 · 5)뿐이라 정석과 가족이 한 픽셀도 다르지 않았다.
     ① 예시 둘씩 곡선(시간을 0~1 로 맞춰 80점)을 견줘 평균 차이가 MIN 이상
     ② 정점은 그대로 — peakOf = flowPeak = 선언(편지가 있으면 편지) · 세기 5 는 선언 · 편지뿐
     ③ 준비한 순서(축사 · 영상 · 그 밖)는 4 아래로 꺼지지 않는다(FLOW_LINE D6)
     ④ 나머지 세기는 3 ~ 4.8
   ★스스로 깨 본다 — 옛 세 단계(level)로 같은 셈을 하면 정석 · 가족이 MIN 아래로 잡혀야 한다. */
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const O = require(path.join(ROOT, 'assets', 'ritual-open.js'));

const EX = ['standard', 'record', 'family', 'brief'];
const MIN = 0.06;   // 세기 평균 차이 — 옛 세 단계 정석 · 가족 0.033 · 지금 약 0.1(가운데에 둔다)
let fail = 0;
const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d == null ? '' : ' → ' + d}`); if (!c) fail++; };

function curve(k, useOld) {
  const S = O.applyExample({}, k), sg = O.flowSegs(S);
  if (useOld) sg.forEach((s) => { s.lv = O.level(s.k, S); });
  const total = sg.reduce((a, s) => a + s.d, 0) || 1, env = O.flowEnv(sg, total), n = 80, out = [];
  for (let i = 0; i < n; i++) out.push(env[Math.min(env.length - 1, Math.round(i / (n - 1) * (env.length - 1)))]);
  return out;
}
const mad = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length;
function pairs(useOld) { const C = {}; EX.forEach((k) => { C[k] = curve(k, useOld); }); const out = [];
  for (let i = 0; i < EX.length; i++) for (let j = i + 1; j < EX.length; j++) out.push([EX[i], EX[j], mad(C[EX[i]], C[EX[j]])]); return out; }

/* ① 예시끼리 다른 모양 */
for (const [a, b, d] of pairs(false)) ok(`${a} · ${b} 곡선 차이 ${d.toFixed(3)} (기준 ${MIN})`, d >= MIN);
/* ② 정점은 그대로 */
for (const k of EX) { const S = O.applyExample({}, k), sg = O.flowSegs(S), p = O.peakOf(S), fp = (O.flowPeak(sg) || {}).k;
  ok(`${k} 정점 = ${p} (곡선 점도 같은 순간)`, !!p && p === fp && (p === 'declare' || p === 'letter'), `peakOf ${p} · flowPeak ${fp}`); }
const S0 = O.sampleS({}), all = O.flowSegs(S0);
const five = all.filter((s) => s.lv === 5).map((s) => s.k);
ok('세기 5 는 선언 · 편지뿐', five.every((k) => k === 'declare' || k === 'letter') && five.length >= 1, five.join(','));
/* ③ 준비한 순서는 4 아래로 안 꺼진다 */
for (const f of ['speech', 'video', 'etc', 'gift']) { const S = O.sampleS({}); S.freeWhat = f; const v = O.flowLv('free', S); ok(`준비한 순서(${f}) 세기 ${v} ≥ 4`, v >= 4); }
/* ④ 나머지 세기는 3 ~ 4.8 */
const bad = all.filter((s) => s.lv !== 5 && (s.lv < 3 || s.lv > 4.8));
ok('정점 밖 세기 3 ~ 4.8', !bad.length, bad.map((s) => s.k + ':' + s.lv).join(','));
/* 스스로 깨 보기 — 옛 세 단계면 잡힌다 */
const old = pairs(true).find(([a, b]) => a === 'standard' && b === 'family');
ok(`깨 보기 — 옛 세 단계면 정석 · 가족 차이 ${old[2].toFixed(3)} < ${MIN} 로 잡힌다`, old[2] < MIN);

console.log(fail ? `✗ FLOW_DIST 실패 ${fail}건` : 'ok flow-distinct — 예시 넷 곡선이 서로 다른 모양 · 정점 그대로(선언 · 편지) · 준비한 순서 4 이상 · 깨 보기');
process.exit(fail ? 1 : 0);
