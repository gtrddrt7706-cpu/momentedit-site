#!/usr/bin/env node
/* ★[NARR_GO_1122 ②] REC_SEC(나레이션 파일 길이표) ↔ 실제 mp3 길이 — 10분 전 «약 N 분» 판 고르기가 이 표로 잰다.
   ① 표에 없는 파일 · 파일이 없는 표 칸 0 ② 길이 차 0.15초 안 ③ 예시 넷의 10분 전 판(정석 = 이십 · 기록 = 이십 · 가족 = 이십 · 간결 = 십) ④ 깨 보기: 표가 비면 종전 bodySec 로 돌아가 정석이 십오가 된다
   종료 0 초록 · 1 빨강 · 2 못 쟀다(ffprobe 없음) */
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url'; import { execFileSync } from 'node:child_process';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), require = createRequire(import.meta.url);
try { execFileSync('ffprobe', ['-version'], { stdio: 'ignore' }); } catch { console.log('못 쟀다 — ffprobe 없음'); process.exit(2); }
const { measure } = await import(path.join(ROOT, 'scripts/rec-sec.mjs'));
const O = require(path.join(ROOT, 'assets/ritual-open.js')); require(path.join(ROOT, 'assets/ritual-data.js')); const C = require(path.join(ROOT, 'assets/ritual-cue.js'));
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const T = C.REC_SEC, M = measure(), tk = Object.keys(T), mk = Object.keys(M);
ok(mk.every((k) => k in T) && tk.every((k) => k in M), `표 ${tk.length} · 파일 ${mk.length} — 빠진 칸 ${mk.filter((k) => !(k in T)).concat(tk.filter((k) => !(k in M))).slice(0, 5).join(' ') || '0'}`);
const off = mk.filter((k) => k in T && Math.abs(T[k] - M[k]) > 0.15); ok(!off.length, '길이 차 0.15초 넘는 칸 ' + (off.slice(0, 5).join(' ') || '0'));
const WANT = { standard: 'guest-w-10m-n20', record: 'guest-w-10m-n20', family: 'guest-w-10m-n20', brief: 'guest-w-10m-n10' };
for (const [ex, want] of Object.entries(WANT)) for (const dig of [false, true]) { const S = O.applyExample({ course: 'open' }, ex); S.course = 'open'; S.digital = dig;
  const g = C.build(S, { mode: 'console' }).cues.find((c) => /^guest-w-10m/.test(c.slug || '')); ok(g && g.slug === want, `${ex}${dig ? ' · 온라인' : ''} 10분 전 = ${g && g.slug} (기대 ${want} · 녹음 길이 ${Math.round(C.bodyRecSec(C.norm(S)) / 6) / 10}분)`); }
/* 깨 보기 — 표를 비우면 글로 잰 값으로 돌아가 정석 본식 셈이 20초 넘게 짧아져야 한다(이 셈이 표를 실제로 읽는다는 증거 · 릴스 방 실측 «23줄 합 약 25초») */
const S0 = C.norm(Object.assign(O.applyExample({ course: 'open' }, 'standard'), { course: 'open' })), full = C.bodyRecSec(S0);
const keep = Object.assign({}, T); Object.keys(T).forEach((k) => delete T[k]); S0.x_break = 1; const empty = C.bodyRecSec(S0); Object.assign(T, keep);
ok(full - empty > 20, `깨 보기 — 표를 비우면 정석 본식 셈이 ${Math.round(full - empty)}초 짧아짐(기대 20초 넘게)`);
console.log(bad ? `✗ REC_SEC 실패 ${bad}건` : '✓ REC_SEC 맞음'); process.exit(bad ? 1 : 0);
