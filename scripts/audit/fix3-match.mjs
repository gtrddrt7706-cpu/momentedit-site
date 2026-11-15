#!/usr/bin/env node
/* ★[REC_FIX3_1110 · 대본 11/10 23:15 배포준비_나레이션_1110 2절] 새 녹음 3문장 — 엔진 결과 mp3 가 사장님이 들어서 정한 승인 소리(override)와 같은가
   문장마다: 초당(쉼 뺀 빠르기 · lib/cps cps2 = 대본 22:55 재는 법 · 0.25초 넘는 쉼 뺀 말소리) ±2% · 문장 안 쉼(−30 dB 들리는 무음 · 0.1초 넘는 것을 자리끼리 짝지어) ±0.05초 · 문장 사이 쉼 ±0.1초 · 말소리 크기(RMS · −30 dB 위 창) ±1.5 dB
   (0.12초 문턱 자(cps)는 0.12 ~ 0.13초 쉼 하나가 넘나들며 3% 씩 뛰어 쓰지 않는다 · 22#0 실측)
   문장 구간 = 0.8초 넘는 무음 가운데(lib/cps sentSpans · 가이드 8) · 목소리 높이는 엔진이 atempo 만 쓰니 따로 재지 않는다
   쓰기: node scripts/audit/fix3-match.mjs --a <승인 폴더(override)> [--b <엔진 mp3 폴더 · 기본 assets/audio/narration>] · 종료 0 통과 · 1 밖 */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { pcm, quietRuns, cps2, sentSpans } from '../lib/cps.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (k, d = '') => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : d; };
const A = arg('--a'), B = arg('--b', path.join(ROOT, 'assets/audio/narration'));
export const FIX3 = { '22_narr-bless-open': [0], '149_narr-open-ex3': [1], '150_narr-open-ex4': [2] };   // 클립 → 새 녹음 문장
const T = Object.fromEntries(fs.readFileSync(path.join(ROOT, 'assets/audio/_src/_layers/빠르기표_최종_1109.tsv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t')).map((r) => [r[0], r[7]]));
const SR = 48000;
const a0 = (y) => { const h = quietRuns(y, -30, 0.01).runs.find((r) => r.head); return h ? h.b : 0; };   // 문장 첫 소리
/* 쉼 짝짓기 — 한쪽에서 0.1초 넘는 쉼마다 다른 쪽에서 문장 첫 소리 기준 ±0.25초 안 가장 가까운 쉼(없으면 0) */
const pair = (P, Q) => P.filter((u) => u.len >= 0.1).map((u) => { const v = Q.reduce((m, q) => (Math.abs(q.t - u.t) <= 0.25 && (!m || Math.abs(q.t - u.t) < Math.abs(m.t - u.t)) ? q : m), null); return { t: u.t, a: u.len, b: v ? v.len : 0 }; });
function measure(f, key) { const n = Object.keys(T).filter((k) => k.startsWith(key + '#')).length, sp = sentSpans(f, n), x = pcm(f), { runs } = quietRuns(x, -30, 0.01);
  const gaps = runs.filter((r) => !r.head && !r.tail && r.b - r.a >= 0.8).sort((p, q) => p.a - q.a).map((r) => +(r.b - r.a).toFixed(3));
  return { gaps, sents: sp.map(([a, b], i) => { const text = T[key + '#' + i], c = cps2(f, text, a, b), y = pcm(f, a, b);
    const inner = quietRuns(y, -30, 0.01).runs.filter((r) => !r.head && !r.tail && r.b - r.a >= 0.06).map((r) => ({ t: +(r.a - a0(y)).toFixed(3), len: +(r.b - r.a).toFixed(3) }));
    const w = 480; let e = 0, m = 0; for (let k = 0; k + w <= y.length; k += w) { let s = 0; for (let j = k; j < k + w; j++) s += y[j] * y[j]; const r = Math.sqrt(s / w); if (r > 0.0316) { e += r * r; m++; } }
    return { i, cps: c.cps, inner, db: +(10 * Math.log10(e / Math.max(1, m))).toFixed(2) }; }) }; }
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  let bad = 0;
  for (const [key, ss] of Object.entries(FIX3)) { const a = measure(path.join(A, key + '.mp3'), key), b = measure(path.join(B, key + '.mp3'), key);
    const gd = a.gaps.map((g, k) => +(Math.abs(g - (b.gaps[k] ?? 0))).toFixed(3)), gok = a.gaps.length === b.gaps.length && gd.every((d) => d <= 0.1);
    if (!gok) bad++; console.log(`${gok ? 'ok  ' : 'FAIL'} ${key} 문장 사이 승인 ${a.gaps.join(' · ')} / 엔진 ${b.gaps.join(' · ')}`);
    for (const s of ss) { const p = a.sents[s], q = b.sents[s], r = q.cps / p.cps, dd = q.db - p.db, pr = [...pair(p.inner, q.inner), ...pair(q.inner, p.inner).map((x) => ({ t: x.t, a: x.b, b: x.a }))].filter((x, k, A) => A.findIndex((y) => Math.abs(y.t - x.t) <= 0.25 && y.a === x.a && y.b === x.b) === k);
      const iok = pr.every((x) => Math.abs(x.a - x.b) <= 0.05), ok = Math.abs(r - 1) <= 0.02 && Math.abs(dd) <= 1.5 && iok;
      if (!ok) bad++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${key}#${s} 초당 ${p.cps} / ${q.cps} (${(r * 100 - 100).toFixed(2)}%) · 안 쉼(승인/엔진) ${pr.map((x) => x.a + '/' + x.b).join(' · ') || '-'} · 크기 ${p.db} / ${q.db} (${dd.toFixed(2)} dB)`); }
    for (const q of b.sents) if (!ss.includes(q.i)) { const p = a.sents[q.i]; console.log(`     ${key}#${q.i}(안 바뀐 문장) 초당 ${p.cps} / ${q.cps} · 크기 ${p.db} / ${q.db}`); } }
  console.log(bad ? `FAIL fix3-match — 밖 ${bad}` : 'ok   fix3-match — 3문장 승인 소리와 같음');
  process.exit(bad ? 1 : 0); }
export { measure };
