#!/usr/bin/env node
/* ★[LAYER_PLAN_1108] 두 판이 «같은 소리»인가 — 클립마다 길이 · 크기(LUFS) · 파형 차이(맞춘 뒤 남는 소리 dB)
   쓰기: node scripts/audit/layer-same.mjs --a <폴더> --b <폴더> [--keys 키,키] [--md <표 파일>]
   같음 = 길이 차 ≤ 0.02초 · 크기 차 ≤ 0.3 LU · 남는 소리 ≤ −30 dB(받아쓰기 대신 파형으로 — 글이 다르면 −10 dB 위로 뜬다) */
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync, spawnSync } from 'node:child_process';
const arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : ''; };
const A = arg('--a'), B = arg('--b'), SR = 16000;
const keys = arg('--keys') ? arg('--keys').split(',') : fs.readdirSync(B).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4));
const pcm = (f) => { const r = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 30 }); return new Float32Array(r.buffer, r.byteOffset, r.length >> 2); };
const lufs = (f) => { const e = spawnSync('ffmpeg', ['-hide_banner', '-i', f, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' }).stderr; const m = [...e.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].pop(); return m ? +m[1] : NaN; };
function resid(a, b) { const n = Math.min(a.length, b.length); let best = 1e9;
  for (let lag = -320; lag <= 320; lag += 4) { let e = 0, s = 0; for (let i = 0; i < n; i += 2) { const j = i + lag; if (j < 0 || j >= b.length) continue; const d = a[i] - b[j]; e += d * d; s += a[i] * a[i]; } if (s > 0) best = Math.min(best, e / s); }
  return 10 * Math.log10(best || 1e-12); }
const rows = []; let bad = 0;
for (const k of keys) { const fa = path.join(A, k + '.mp3'), fb = path.join(B, k + '.mp3'); if (!fs.existsSync(fa) || !fs.existsSync(fb)) { rows.push({ k, miss: !fs.existsSync(fa) ? 'a 없음' : 'b 없음' }); continue; }
  const a = pcm(fa), b = pcm(fb), dd = Math.abs(a.length - b.length) / SR, ld = Math.abs(lufs(fa) - lufs(fb)), r = resid(a, b), ok = dd <= 0.02 && ld <= 0.3 && r <= -30;
  if (!ok) bad++; rows.push({ k, dur: +(b.length / SR).toFixed(2), dd: +dd.toFixed(3), ld: +ld.toFixed(2), r: +r.toFixed(1), ok }); }
const md = arg('--md'); if (md) fs.writeFileSync(md, '| 클립 | 길이 | 길이 차 | 크기 차 LU | 남는 소리 dB | 판정 |\n|---|---|---|---|---|---|\n' + rows.map((x) => x.miss ? `| ${x.k} | - | - | - | - | ${x.miss} |` : `| ${x.k} | ${x.dur} | ${x.dd} | ${x.ld} | ${x.r} | ${x.ok ? '같음' : '다름'} |`).join('\n') + '\n');
console.log(`${bad ? 'DIFF' : 'same'} 클립 ${rows.length} · 다름 ${bad} · 없음 ${rows.filter((x) => x.miss).length}`);
for (const x of rows) if (x.miss || !x.ok) console.log('  ', JSON.stringify(x));
process.exit(bad ? 1 : 0);
