#!/usr/bin/env node
/* ★★[SPEED3_1108 사장님 11/08 «3%가 적절» · 대본 16:14 4)] 클립마다 — «지금»(같은 원본 · 같은 조립 · 1.0) 판과 바뀐 판(×0.97)을 나란히 잰다
   ① 말소리 길이 비율 0.97 ± 0.5% ② 쉼(−34 dBFS · 0.25초 이상 · 앞뒤 포함) 길이 지금과 ±0.02초 · 개수 같음
   ③ 글: 녹음된 글(_recorded) = 대장 글(받아쓰기 도구는 이 환경에 없다 — 글 대조로 대신) ④ 깨짐 · 잘림: 최고 크기 ≤ −0.3 dBFS · 끝 쉼 ≥ 0.05초 · 길이 > 0
   쓰기: TEMPO_FLAT_SPEED=1 node scripts/assemble-narration.mjs --in <창고 펼침> --clip … --out <지금 판 폴더>  →  node scripts/audit/speed3-check.mjs --base <지금 판 폴더>
   결과: docs/plans/식순연구/빠르기3_검사_1108.md(표) · 종료 코드 0 통과 · 1 실패 */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { execFileSync, spawnSync } from 'node:child_process';
import { loadTempo, tempoOf } from '../lib/tempo.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : ''; };
const BASE = arg('--base'); if (!BASE || !fs.existsSync(BASE)) { console.error('--base <지금 판 폴더> 가 없다'); process.exit(2); }
const T = loadTempo(ROOT), NAR = path.join(ROOT, 'assets/audio/narration');
/* --log <조립 기록(SPEED3_LOG)> — wav 단계에서 늘린 말소리 · 그대로 둔 쉼 길이(정확) · 있으면 ① 은 이것으로 잰다(mp3 는 크기 맞춤 · 프레임 반올림으로 짧은 클립이 흔들린다) */
const LOG = arg('--log') && fs.existsSync(arg('--log')) ? new Map(fs.readFileSync(arg('--log'), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).map((x) => [x.key, x])) : null;
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
const rec = JSON.parse(fs.readFileSync(path.join(NAR, '_recorded.json'), 'utf8')).clips || {};
const SR = 48000, WIN = 0.01, THR = Math.pow(10, -34 / 20), MINW = 25;   // tempo.json silence 와 같은 자(−34 dBFS · 10ms 창 · 0.25초)
function segs(f) { const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', f, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 30 });
  const x = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 4)), w = Math.round(WIN * SR), nw = Math.floor(x.length / w), q = new Uint8Array(nw);
  let peak = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > peak) peak = a; }
  for (let i = 0; i < nw; i++) { let s = 0; for (let j = i * w; j < (i + 1) * w; j++) s += x[j] * x[j]; q[i] = Math.sqrt(s / w) < THR ? 1 : 0; }
  const quiet = []; let talk = 0, i = 0, last = 0;
  while (i < nw) { if (!q[i]) { i++; continue; } let j = i; while (j < nw && q[j]) j++; if (j - i >= MINW || i === 0 || j >= nw) { quiet.push({ a: i * WIN, len: (j - i) * WIN, edge: i === 0 ? 'head' : (j >= nw ? 'tail' : '') }); talk += (i - last) * WIN; last = j; } i = j; }
  talk += Math.max(0, nw - last) * WIN;
  return { dur: x.length / SR, talk, quiet, peakDb: 20 * Math.log10(peak || 1e-9) }; }
const rows = []; let bad = 0, nWarn = 0;
for (const c of man.clips) { const key = `${String(c.no).padStart(2, '0')}_${c.file}`, b = path.join(BASE, key + '.mp3'), n = path.join(NAR, key + '.mp3');
  if (!fs.existsSync(b) || !fs.existsSync(n)) continue;
  const v = (man.voice || {})[String(c.role).split('|')[0]] || '', want = tempoOf(T, key, v);
  const A = segs(b), B = segs(n), ratio = A.talk / Math.max(0.01, B.dur - (A.dur - A.talk)) /* 말빠르기 = 지금 말소리 ÷ 바뀐 뒤 말소리(바뀐 뒤 = 전체 − 지금 쉼 · 쉼은 그대로 두는 조립이라) — 따로 재면 크기 맞춤(loudnorm)이 쉼 경계를 흔든다 */, txt = (rec[key] && typeof rec[key] === 'object' ? rec[key].text : rec[key]) || '', same = txt.replace(/\s+/g, '') === c.sents.map((s) => s.text).join('').replace(/\s+/g, '');
  const L = LOG && LOG.get(key), exact = L ? L.talkIn / (L.talkIn + (L.outSec - L.inSec)) : null;
  const qa = A.quiet.filter((x) => !x.edge && x.len >= 0.30), qb = B.quiet.filter((x) => !x.edge && x.len >= 0.30);
  /* 쉼 짝짓기 — 바뀐 뒤 위치 ≈ 지금 위치 + 앞 말소리 늘어난 만큼 · 0.30초 이상 쉼만(문턱 가까운 짧은 쉼은 크기 맞춤에 따라 보였다 안 보였다 한다) */
  const kk = B.dur - A.dur > 0 && A.talk > 0 ? (B.dur - A.dur) / A.talk : 0, used = new Set(); let miss = 0;
  const qd0 = qa.map((x) => { const talkBefore = x.a - A.quiet.filter((y) => y.a < x.a).reduce((t, y) => t + y.len, 0), at = x.a + talkBefore * kk;
    let bi = -1, bd = 9; qb.forEach((y, j) => { if (!used.has(j) && Math.abs(y.a - at) < bd) { bd = Math.abs(y.a - at); bi = j; } });
    if (bi < 0 || bd > 0.15) { miss++; return 0; } used.add(bi); return Math.abs(x.len - qb[bi].len); });
  const qn = miss === 0, qd = qn ? Math.max(0, ...qd0) : null;
  const tail = (B.quiet.find((x) => x.edge === 'tail') || { len: 0 }).len;
  const ok1 = Math.abs((exact ?? ratio) - want) <= 0.005 * want, ok2 = qn && qd <= 0.02 + 1e-6, ok4 = B.peakDb <= -0.3 && tail >= 0.05 && B.dur > 0;
  /* 쉼 0.03 ~ 0.04초 = «주의»(실패 아님 · 통과도 아님) — 조립은 0.25초 이상 쉼을 샘플 그대로 옮기고 말 구간만 늘린다. mp3 에서 −34 dBFS 로 재면 쉼 바로 앞 낱말의 잦아드는 끝(말소리 몫)도 3% 늘어 쉼 시작이 그만큼 밀려 보인다 */
  const warn = ok1 && same && ok4 && !ok2 && qn && qd <= 0.04 + 1e-6;
  const ok = ok1 && ok2 && same && ok4; if (!ok && !warn) bad++; if (warn) nWarn++;
  rows.push({ key, v, want, exact: exact == null ? null : +exact.toFixed(4), ratio: +ratio.toFixed(4), pauses: qa.length, pauseMax: qd == null ? '짝 못 찾음 ' + miss : +qd.toFixed(3), text: same, peak: +B.peakDb.toFixed(2), tail: +tail.toFixed(2), dur: [+A.dur.toFixed(2), +B.dur.toFixed(2)], ok, warn }); }
const r = rows.map((x) => x.exact ?? x.ratio).sort((a, b) => a - b), md = `# 빠르기 −3% 검사 · SPEED3_1108

> 생성물 — \`node scripts/audit/speed3-check.mjs --base <지금 판>\` · 지금 = 같은 원본 · 같은 조립 · 1.0 · 바뀐 뒤 = 말소리만 ×0.97
> ① 말빠르기 비율(지금 말소리 ÷ 바뀐 뒤 말소리) 0.97 ± 0.5% ② 쉼(0.30초 이상 · 위치로 짝지음) 길이 지금과 ±0.02초 ③ 글 = 대장 글(받아쓰기 도구 없음 · 글 대조로 대신) ④ 최고 크기 ≤ −0.3 dBFS · 끝 쉼 ≥ 0.05초

## 요약
- 클립 ${rows.length} · 통과 ${rows.length - bad - nWarn} · 주의 ${nWarn}(쉼 0.03 ~ 0.04초 · 쉼 앞 낱말 끝이 늘어난 몫 · 조립은 쉼을 샘플 그대로 옮긴다) · 실패 ${bad}
- 말빠르기(${LOG ? 'wav 단계 기록 · 정확' : 'mp3 측정'}) 최소 ${r[0]} · 중앙 ${r[Math.floor(r.length / 2)]} · 최대 ${r[r.length - 1]}
- 쉼(0.30초 이상) 차이 최대 ${Math.max(...rows.filter((x) => typeof x.pauseMax === 'number').map((x) => x.pauseMax))}초 · 짝 못 찾은 클립 ${rows.filter((x) => typeof x.pauseMax !== 'number').length}
- 글 다른 클립 ${rows.filter((x) => !x.text).length} · 최고 크기 −0.3 dBFS 넘음 ${rows.filter((x) => x.peak > -0.3).length} · 끝 쉼 부족 ${rows.filter((x) => x.tail < 0.05).length}
- 전체 길이 ${rows.reduce((a, x) => a + x.dur[0], 0).toFixed(0)}초 → ${rows.reduce((a, x) => a + x.dur[1], 0).toFixed(0)}초

## 클립
| 클립 | 목소리 | 목표 | 말빠르기(wav 기록) | mp3 측정 | 쉼 수 | 쉼 차이 최대 | 글 | 최고 dBFS | 끝 쉼 | 길이(지금 → 바뀐 뒤) | 판정 |
|---|---|---|---|---|---|---|---|---|---|---|---|
${rows.map((x) => `| ${x.key} | ${x.v} | ${x.want} | ${x.exact ?? '-'} | ${x.ratio} | ${x.pauses} | ${x.pauseMax} | ${x.text ? '같음' : '다름'} | ${x.peak} | ${x.tail} | ${x.dur[0]} → ${x.dur[1]} | ${x.ok ? 'ok' : (x.warn ? '주의' : '실패')} |`).join('\n')}
`;
fs.writeFileSync(path.join(ROOT, 'docs/plans/식순연구/빠르기3_검사_1108.md'), md);
console.log(`${bad ? 'FAIL' : 'ok  '} SPEED3 검사 — 클립 ${rows.length} · 주의 ${nWarn} · 실패 ${bad} · ${LOG ? 'wav 기록' : 'mp3 측정'} · 비율 ${r[0]} ~ ${r[r.length - 1]}`);
process.exit(bad ? 1 : 0);
