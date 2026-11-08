#!/usr/bin/env node
/* ★★[SPEED3_1108 사장님 11/08 «3%가 적절» · 승인 16:53] 나레이션 말빠르기 표(assets/audio/_src/tempo.json flat)와 실제 mp3 가 맞는지 잰다
   ① 표: flat.on · speed 0.97 · voices 우성 · 진희 · skip 편지 통낭독 43
   ② _recorded.json 의 tempo(조립이 실제로 입힌 배속)가 표와 같다 — 우성 · 진희 나레이션 클립 전부(43 은 1) · 쓰지 않는(RETIRED) 클립은 뺀다
   ③ 깨 보기 — speed 를 바꾸면 ② 빨강 · 43 을 skip 에서 빼면 ② 빨강
   node scripts/audit/tempo-check.mjs   종료 코드 0 통과 · 1 실패 */
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
import { loadTempo, tempoOf } from '../lib/tempo.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
const rec = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/audio/narration/_recorded.json'), 'utf8')).clips || {};
const RETIRED = createRequire(import.meta.url)(path.join(ROOT, 'assets/ritual-cue.js')).RETIRED || {};
const CST = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/audio/clip-status.json'), 'utf8')).clips || {};   // 쓰지 않는 클립(retired)은 다시 조립하지 않는다
const keyOf = (c) => String(c.no).padStart(2, '0') + '_' + c.file, voiceOf = (c) => (man.voice || {})[String(c.role).split('|')[0]] || null;
const narr = man.clips.filter((c) => (c.dir || 'assets/audio/narration') === 'assets/audio/narration');
function check(T) { const bad = []; const F = T.flat || {};
  if (!F.on) bad.push('① flat.on 이 꺼져 있음');
  if (+F.speed !== 0.97) bad.push(`① flat.speed ${F.speed} ≠ 0.97 [SPEED3_1108]`);
  if (!['우성', '진희'].every((v) => (F.voices || []).includes(v))) bad.push('① voices 에 우성 · 진희가 없음');
  if (!(F.skip || []).includes('43_parents-letter')) bad.push('① 편지 통낭독 43 이 skip 에 없음');
  let n = 0;
  for (const c of narr) { const v = voiceOf(c); if (v !== '우성' && v !== '진희') continue;
    const k = keyOf(c), r = rec[k]; if (!r || typeof r !== 'object') continue; if ((RETIRED[c.file] || (CST['narration/' + k] && CST['narration/' + k].s === 'retired')) && c.file !== 'parents-letter') continue;
    const exp = tempoOf(T, k, v), got = r.tempo == null ? 1 : +r.tempo; n++;
    if (Math.abs(got - exp) > 5e-4) bad.push(`② ${k}(${v}) 입힌 배속 ${got} ≠ 표 ${exp}`); }
  return { bad, n }; }
const T = loadTempo(ROOT), R = check(T);
R.bad.slice(0, 30).forEach((b) => console.log('FAIL ' + b));
console.log(`  표 대조 ${R.n}클립 · ×${T.flat.speed}`);
const t1 = JSON.parse(JSON.stringify(T)); t1.flat.speed = 0.96; const b1 = check(t1).bad.some((b) => b.startsWith('②'));
console.log((b1 ? 'ok  ' : 'FAIL') + ' ③ 깨 보기 — 배속을 바꾸면 ② 빨강');
const t2 = JSON.parse(JSON.stringify(T)); t2.flat.skip = []; const b2 = check(t2).bad.some((b) => b.includes('43_parents-letter'));
console.log((b2 ? 'ok  ' : 'FAIL') + ' ③ 깨 보기 — 43 을 skip 에서 빼면 빨강');
const fail = R.bad.length || !b1 || !b2;
console.log(fail ? 'TEMPO_SPEED3 FAIL' : 'TEMPO_SPEED3 OK');
process.exit(fail ? 1 : 0);
