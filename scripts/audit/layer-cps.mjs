#!/usr/bin/env node
/* ★[LAYER_PLAN_1108 · 대본 11/09 19:55] 3층 문장 빠르기 — mp3 에서 문장마다 초당 낱소리(가이드 8번: 한글 글자 ÷ (말소리 − 문장 안 0.12초 넘는 무음) · −30 dB)
   = 빠르기표_최종_1109.tsv «맞춘 뒤 초당» ±1.5% · 문장 구간은 조립 기록(SEAT_LOG 의 s · a · b)
   쓰기: node scripts/audit/layer-cps.mjs --seat-log <SEAT_LOG> [--md <표>] · 종료 0 통과 · 1 밖 */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { cps } from '../lib/cps.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : ''; };
const LOG = fs.readFileSync(arg('--seat-log'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((x) => x.s != null);
const T = Object.fromEntries(fs.readFileSync(path.join(ROOT, 'assets/audio/_src/_layers/빠르기표_최종_1109.tsv'), 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t')).map((r) => [r[0], { want: +r[5], fac: +r[2], text: r[7], note: r[6] }]));
const rows = [];
for (const x of LOG) { const id = x.key + '#' + x.s, t = T[id]; if (!t) continue;
  const f = path.join(ROOT, 'assets/audio/narration', x.key + '.mp3'), got = cps(f, t.text, Math.max(0, x.a - 0.05), x.b + 0.05).cps, r = got / t.want;
  rows.push({ id, want: t.want, got, r: +r.toFixed(4), ok: Math.abs(r - 1) <= 0.015, note: t.note }); }
const bad = rows.filter((x) => !x.ok);
if (arg('--md')) fs.writeFileSync(arg('--md'), '| 문장 | 맞춘 뒤 초당(표) | 3층 mp3 | 비 | 비고 |\n|---|---|---|---|---|\n' + bad.map((x) => `| ${x.id} | ${x.want} | ${x.got} | ${x.r} | ${x.note || ''} |`).join('\n') + '\n');
const rs = rows.map((x) => x.r).sort((a, b) => a - b);
console.log(`${bad.length ? 'FAIL' : 'ok  '} layer-cps — 문장 ${rows.length} · ±1.5% 밖 ${bad.length} · 비 ${rs[0]} ~ ${rs[rs.length - 1]} · 가운데 ${rs[rs.length >> 1]}`);
for (const x of bad) console.log('  밖', x.id, x.want, x.got, x.r, x.note || '');
process.exit(bad.length ? 1 : 0);
