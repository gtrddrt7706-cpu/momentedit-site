#!/usr/bin/env node
/* ★[LAYER_PLAN_1108 · 6층 · 대본 11/10 11:20 · 층설정표 6층] 문장 크기 고르게 — 5층 mp3(듣는 소리 · loudnorm 뒤)에서 문장마다 몸 크기를 잰다
   몸 크기 = 말소리 첫 창부터 0.4초 뒤(첫머리 힘은 빼고) −30 dBFS 넘는 10ms 창 RMS(lib/speech-rms bodyRms) · 문단 = 클립(두 문장 넘는 클립만)
   클립 가운데값보다 ±1.5 dB 넘게 튀는 문장만 차이의 절반을 반대로(최대 ±1.5 dB) → _layers/층6_크기.json · build-layers --layer 6 이 loudnorm 전 깔린 문장에 그 이득을 준다
   대본 loud_flags 첫 칸과 같은 자(04_guest-4-1min#0 대본 +3.0 · 이 자 +2.81 · 가운데 차 0.37 — 그 사이 3층 빠르기가 바뀌었다)
   쓰기: node scripts/build-loud6.mjs --seat-log <5층 SEAT_LOG> [--dir <5층 mp3 폴더>] [--write] */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { pcm } from './lib/cps.mjs'; import { bodyRms } from './lib/speech-rms.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : ''; };
const DIR = arg('--dir') || path.join(ROOT, 'assets/audio/narration');
const seat = fs.readFileSync(arg('--seat-log'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((x) => x.s != null), last = {};
for (const x of seat) last[x.key + '#' + x.s] = x;
const by = {}; for (const x of Object.values(last)) (by[x.key] = by[x.key] || []).push(x);
const gains = {}; let n = 0, head = 0;
for (const [k, a] of Object.entries(by)) { if (a.length < 2) continue; const f = path.join(DIR, k + '.mp3'); if (!fs.existsSync(f)) continue;
  const ms = a.map((x) => ({ id: k + '#' + x.s, ...bodyRms(pcm(f, x.a, x.b)) })).filter((q) => q.rms != null); n += ms.length;
  const v = ms.map((q) => q.rms).sort((p, q) => p - q), med = v.length % 2 ? v[v.length >> 1] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
  for (const q of ms) { const d = +(q.rms - med).toFixed(2); if (Math.abs(q.all - med) > 1.5 && Math.abs(d) <= 1.5) head++;
    if (Math.abs(d) > 1.5) gains[q.id] = { d, gain: +(-Math.sign(d) * Math.min(Math.abs(d) / 2, 1.5)).toFixed(2), med: +med.toFixed(2) }; } }
const out = { _왜: '[LAYER_PLAN_1108 · 6층] 5층 mp3 에서 잰 문장 몸 크기 − 클립 가운데값(d) · ±1.5 dB 넘는 문장만 gain = 차이의 절반 반대로(최대 ±1.5) · loudnorm 전 깔린 문장에 · 만든 법 scripts/build-loud6.mjs', gains };
if (process.argv.includes('--write')) fs.writeFileSync(path.join(ROOT, 'assets/audio/_src/_layers/층6_크기.json'), JSON.stringify(out, null, 1) + '\n');
const g = Object.values(gains).map((x) => x.gain);
console.log(`loud6 — 잰 문장 ${n}(두 문장 넘는 클립) · 바꿀 문장 ${g.length}(올림 ${g.filter((x) => x > 0).length} · 내림 ${g.filter((x) => x < 0).length}) · 이득 ${Math.min(...g)} ~ ${Math.max(...g)} dB · 첫머리만 튐(그대로) ${head}`);
