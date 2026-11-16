/* ★[LAYER_PLAN_1108] 글자/초 — 나레이션_제작가이드 8번 «모든 방이 같은 계산»
   한글 글자 수 ÷ (말소리 시간 − 문장 안 무음 0.12초 이상) · 무음 = −30 dB(10ms 창) · 앞뒤 무음은 뺀다
   cutAt: 무음 구간 [a, b] 를 가운데에서 자를 때 쓰는 무음 찾기도 여기 */
import { execFileSync } from 'node:child_process';
const SR = 48000, WIN = 0.01;
export function pcm(f, a, b) { const args = ['-v', 'error', '-i', f]; if (a != null) args.push('-af', `atrim=start=${a}${b != null ? ':end=' + b : ''}`); args.push('-f', 'f32le', '-ac', '1', '-ar', String(SR), '-');
  const r = execFileSync('ffmpeg', args, { maxBuffer: 1 << 30 }); return new Float32Array(r.buffer, r.byteOffset, r.length >> 2); }
export function quietRuns(x, db = -30, minSec = 0.12) { const w = Math.round(WIN * SR), nw = Math.floor(x.length / w), thr = Math.pow(10, db / 20), q = [];
  for (let i = 0; i < nw; i++) { let s = 0; for (let j = i * w; j < (i + 1) * w; j++) s += x[j] * x[j]; q.push(Math.sqrt(s / w) < thr); }
  const runs = []; let i = 0; while (i < nw) { if (!q[i]) { i++; continue; } let j = i; while (j < nw && q[j]) j++; runs.push({ a: i * WIN, b: j * WIN, head: i === 0, tail: j >= nw }); i = j; }
  return { runs: runs.filter((r) => r.head || r.tail || r.b - r.a >= minSec), dur: nw * WIN }; }
export function cps(f, text, a, b) { const x = pcm(f, a, b), { runs, dur } = quietRuns(x);
  const h = (runs.find((r) => r.head) || { b: 0 }).b, t = (runs.find((r) => r.tail) || { a: dur }).a, inner = runs.filter((r) => !r.head && !r.tail).reduce((s, r) => s + (r.b - r.a), 0);
  const n = (String(text).match(/[가-힣]/g) || []).length; return { n, talk: +(t - h - inner).toFixed(3), cps: +(n / (t - h - inner)).toFixed(3) }; }
/* [LAYER_PLAN_1108 · 대본 22:55 재는 법] 말소리 시간 = 첫 소리 ~ 끝 소리 − 0.25초 넘는 쉼(−30 dB) · 글자/초 = 한글 글자 ÷ 그 시간 */
export function cps2(f, text, a, b) { const x = pcm(f, a, b), { runs, dur } = quietRuns(x, -30, 0.01);
  const h = (runs.find((r) => r.head) || { b: 0 }).b, t = (runs.find((r) => r.tail) || { a: dur }).a, inner = runs.filter((r) => !r.head && !r.tail && r.b - r.a > 0.25).reduce((s, r) => s + (r.b - r.a), 0);
  const n = (String(text).match(/[가-힣]/g) || []).length; return { n, talk: +(t - h - inner).toFixed(3), cps: +(n / (t - h - inner)).toFixed(4) }; }
/* 문장 나누기 — 0.8초 넘는 무음 가운데(가이드 8) */
export function sentSpans(f, n) { const { runs } = quietRuns(pcm(f), -30, 0.01); const g = runs.filter((r) => !r.head && !r.tail && r.b - r.a >= 0.8).sort((p, q) => (q.b - q.a) - (p.b - p.a)).slice(0, n - 1).sort((p, q) => p.a - q.a);
  const c = [0, ...g.map((r) => +((r.a + r.b) / 2).toFixed(3)), null]; return c.slice(0, -1).map((a, i) => [a, c[i + 1]]); }
