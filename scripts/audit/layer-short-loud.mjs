#!/usr/bin/env node
/* ★[LAYER_PLAN_1108 · 대본 21:55] 짧은 클립(3초 미만) 말소리 크기 — 층 결과가 main(2236d108) 판보다 1 dB 넘게 다르면 표시
   말소리 크기 = −30 dB 넘는 10ms 창 RMS(scripts/lib/speech-rms.mjs) · 쓰기: node scripts/audit/layer-short-loud.mjs [--base 2236d108] → 표 · 종료 0(표시만) */
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { execFileSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { speechRms } from '../lib/speech-rms.mjs'; import { pcm } from '../lib/cps.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), NAR = path.join(ROOT, 'assets/audio/narration');
const i = process.argv.indexOf('--base'), BASE = i > -1 ? process.argv[i + 1] : '2236d108', T = fs.mkdtempSync(path.join(os.tmpdir(), 'shl-'));
const used = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/층_씀목록_1108.json'), 'utf8')).filter((x) => x.use).map((x) => x.k);
const rows = []; for (const k of used) { const f = path.join(NAR, k + '.mp3'); if (!fs.existsSync(f)) continue; const d = pcm(f).length / 48000; if (d >= 3) continue;
  const b = path.join(T, k + '.mp3'); try { fs.writeFileSync(b, execFileSync('git', ['show', `${BASE}:assets/audio/narration/${k}.mp3`], { cwd: ROOT, maxBuffer: 1 << 26 })); } catch { continue; }
  const n = speechRms(f), o = speechRms(b), dd = +(n.rms - o.rms).toFixed(2); rows.push({ k, d: +d.toFixed(2), o: o.rms, n: n.rms, dd, pk: n.peak, flag: Math.abs(dd) > 1 }); }
console.log('| 클립 | 길이 | main 말소리 dB | 지금 | 차이 | 최고 | 표시 |\n|---|---|---|---|---|---|---|\n' + rows.map((x) => `| ${x.k} | ${x.d} | ${x.o} | ${x.n} | ${x.dd} | ${x.pk} | ${x.flag ? '⚠ 1 dB 넘음' : ''} |`).join('\n'));
console.log(`\n짧은 클립 ${rows.length} · 1 dB 넘게 다름 ${rows.filter((x) => x.flag).length}`);
