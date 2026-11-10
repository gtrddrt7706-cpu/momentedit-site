#!/usr/bin/env node
/* ★[LAYER_PLAN_1108 · 6층 · 대본 11/10 11:20] 문장 크기 고르게를 mp3 에서 다시 잰다 — 같은 자(scripts/build-loud6.mjs · 몸 크기 − 클립 가운데값)
   ①만들기 기록(LAYER_LOG 의 loud · gain)이 층6_크기.json 과 한 줄도 다르지 않다 ②바꾼 문장이 가운데값 쪽으로 왔다(|d| 줄어듦 · 넘어가지 않음) ③±1.5 넘는 문장 수 5층 → 6층
   쓰기: node scripts/audit/layer-loud.mjs --log <LAYER_LOG> --seat-log <SEAT_LOG> [--dir <mp3 폴더>] · 종료 0 통과 · 1 밖 */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { pcm } from '../lib/cps.mjs'; import { bodyRms } from '../lib/speech-rms.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : ''; };
const DIR = arg('--dir') || path.join(ROOT, 'assets/audio/narration');
const T = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/audio/_src/_layers/층6_크기.json'), 'utf8')).gains;
const rd = (f) => fs.readFileSync(f, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const done = {}; for (const x of rd(arg('--log')).filter((x) => x.gain != null)) done[x.id] = x.gain;
const seat = rd(arg('--seat-log')).filter((x) => x.s != null), last = {}; for (const x of seat) last[x.key + '#' + x.s] = x;
const by = {}; for (const x of Object.values(last)) (by[x.key] = by[x.key] || []).push(x);
const D6 = {}; for (const [k, a] of Object.entries(by)) { if (a.length < 2) continue; const f = path.join(DIR, k + '.mp3'); if (!fs.existsSync(f)) continue;
  const ms = a.map((x) => ({ id: k + '#' + x.s, ...bodyRms(pcm(f, x.a, x.b)) })).filter((q) => q.rms != null), v = ms.map((q) => q.rms).sort((p, q) => p - q), med = v.length % 2 ? v[v.length >> 1] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
  for (const q of ms) D6[q.id] = +(q.rms - med).toFixed(2); }
const bad = [];
for (const [id, r] of Object.entries(T)) { if (done[id] !== r.gain) bad.push(`${id} 표 ${r.gain} · 만들기 ${done[id]}`);
  const d = D6[id]; if (d == null) { bad.push(`${id} mp3 에서 못 잼`); continue; } if (!(Math.abs(d) < Math.abs(r.d)) || Math.sign(d) === -Math.sign(r.d) && Math.abs(d) > 1.5) bad.push(`${id} 5층 ${r.d} → 6층 ${d}`); }
for (const id of Object.keys(done)) if (!T[id]) bad.push(`${id} 표에 없는데 이득을 줬다`);
const over6 = Object.values(D6).filter((d) => Math.abs(d) > 1.5).length, ch = Object.keys(T).map((id) => Math.abs(D6[id] ?? 99) - Math.abs(T[id].d));
console.log(`${bad.length ? 'FAIL' : 'ok  '} layer-loud — 바꾼 문장 ${Object.keys(T).length} · 가운데 쪽으로 평균 ${(-ch.reduce((s, x) => s + x, 0) / ch.length).toFixed(2)} dB · ±1.5 넘음 5층 ${Object.keys(T).length} → 6층 ${over6}(잰 문장 ${Object.keys(D6).length}) · 밖 ${bad.length}`);
for (const b of bad) console.log('  밖', b);
if (process.argv.includes('--all')) for (const id of Object.keys(T)) console.log(' ', id, T[id].d, '→', D6[id], 'gain', T[id].gain);
process.exit(bad.length ? 1 : 0);
