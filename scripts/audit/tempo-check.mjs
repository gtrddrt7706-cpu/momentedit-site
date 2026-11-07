#!/usr/bin/env node
/* ★★[TEMPO_1107 2026-11-07 사장님 확정] 나레이션 말빠르기 표(assets/audio/_src/tempo.json)와 실제 mp3 가 맞는지 잰다.
   ① 표 모양 — 공식(0.98 − 0.035 × (n − 1) / 19) · 진희 단계 · 순간 키 단계(0 ~ 20 정수) · 우성 클립의 순간 키가 표에 있다
   ② 대장(manifest)의 우성 클립이 전부 표에 있다(새 클립이 생기면 순간 키를 적게 — 없으면 빨강) · 표에만 있는 낡은 열쇠도 빨강
   ③ _recorded.json 의 tempo(조립이 실제로 입힌 배속)가 표에서 나온 배속과 같다 — 진희 · 우성 전부(편지 통낭독 parents-letter 도 letter 13 — 페이지가 튼다)
   ④ 깨 보기 둘 — 표에서 우성 열쇠 하나를 지우면 ② 빨강 · 순간 단계 하나를 바꾸면 ③ 빨강
   node scripts/audit/tempo-check.mjs   종료 코드 0 통과 · 1 실패 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { loadTempo, tempoOf, speedOfStep } from '../lib/tempo.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
const rec = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/audio/narration/_recorded.json'), 'utf8')).clips || {};
const keyOf = (c) => String(c.no).padStart(2, '0') + '_' + c.file;
const voiceOf = (c) => (man.voice || {})[String(c.role).split('|')[0]] || null;
const RETIRED = (createRequire(import.meta.url)(path.join(ROOT, 'assets/ritual-cue.js')).RETIRED) || {};   // 나레이션 폐지 슬러그 — 안 나는 소리라 다시 조립하지 않는다(③ 대조에서 뺀다)
const narr = man.clips.filter((c) => (c.dir || 'assets/audio/narration') === 'assets/audio/narration');

function check(T, quiet) {
  const bad = [];
  const F = T.formula || {};
  if (!(F.a === 0.98 && F.b === 0.035 && F.c === 19)) bad.push('① 공식이 0.98 − 0.035 × (n − 1) / 19 가 아님');
  const okStep = (v) => Number.isInteger(v) && v >= 0 && v <= 20;
  if (!okStep((T.voice || {})['진희']?.step)) bad.push('① 진희 단계가 0 ~ 20 정수가 아님');
  for (const [m, v] of Object.entries(T.moments || {})) if (!m.startsWith('_') && !okStep(v)) bad.push(`① 순간 ${m} 단계 ${v}`);
  for (const [k, m] of Object.entries(T.woosung || {})) if (!((T.moments || {})[m] != null)) bad.push(`① ${k} 순간 키 ${m} 가 moments 에 없음`);
  const wo = narr.filter((c) => voiceOf(c) === '우성').map(keyOf);
  for (const k of wo) if (!(T.woosung || {})[k]) bad.push(`② 우성 ${k} 가 표에 없음 — 순간 키를 적을 것`);
  for (const k of Object.keys(T.woosung || {})) if (!wo.includes(k)) bad.push(`② 표의 ${k} 가 대장 우성 클립에 없음(낡은 열쇠)`);
  let n = 0;
  for (const c of narr) {
    const v = voiceOf(c); if (v !== '진희' && v !== '우성') continue;
    if (RETIRED[c.file] && c.file !== 'parents-letter') continue;   // 편지 통낭독은 예식 큐에선 빠졌지만 어른께 드리는 안내(parents.html)가 튼다 — 대본 11/07 «편지 = 13»
    const k = keyOf(c); const r = rec[k]; if (!r || typeof r !== 'object') continue;   // 아직 녹음 전 · 옛 기록은 다시받기 쪽 몫
    const exp = tempoOf(T, k, v); if (exp == null) continue;                           // ② 에서 이미 빨강
    const got = r.tempo == null ? 1 : +r.tempo; n++;
    if (Math.abs(got - exp) > 5e-4) bad.push(`③ ${k}(${v}) 입힌 배속 ${got} ≠ 표 ${exp}`);
  }
  if (!quiet) console.log(`  표 대조 ${n}클립 · 진희 ×${speedOfStep(T, T.voice['진희'].step)} · 우성 ${Object.keys(T.woosung).length}클립`);
  return bad;
}

const T = loadTempo(ROOT);
const bad = check(T, false);
bad.slice(0, 30).forEach((b) => console.log('FAIL ' + b));
if (!bad.length) console.log('ok   ①②③ 표 · 대장 · 입힌 배속 일치');

/* ④ 깨 보기 */
const t1 = JSON.parse(JSON.stringify(T)); const k1 = Object.keys(t1.woosung)[0]; delete t1.woosung[k1];
const b1 = check(t1, true).some((b) => b.startsWith('② 우성 ' + k1));
console.log((b1 ? 'ok  ' : 'FAIL') + ' ④ 깨 보기 — 우성 열쇠 하나를 지우면 ② 빨강');
const t2 = JSON.parse(JSON.stringify(T)); const mk = Object.keys(t2.moments).find((m) => !m.startsWith('_') && m !== 'keep' && Object.values(t2.woosung).includes(m) && Object.keys(rec).some((rk) => t2.woosung[rk] === m));
if (mk) t2.moments[mk] = t2.moments[mk] === 1 ? 2 : 1;
const b2 = !mk || check(t2, true).some((b) => b.startsWith('③'));
console.log((b2 ? 'ok  ' : 'FAIL') + ' ④ 깨 보기 — 순간 단계 하나를 바꾸면 ③ 빨강');

const fail = bad.length || !b1 || !b2;
console.log(fail ? 'TEMPO_1107 FAIL' : 'TEMPO_1107 OK');
process.exit(fail ? 1 : 0);
