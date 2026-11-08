#!/usr/bin/env node
/* ★★[TEMPO_1107 2026-11-07 사장님 확정] 나레이션 말빠르기 표(assets/audio/_src/tempo.json)와 실제 mp3 가 맞는지 잰다.
   ① 표 모양 — 공식(0.98 − 0.035 × (n − 1) / 19) · 진희 단계 · 순간 키 단계(0 ~ 20 정수) · 우성 클립의 순간 키가 표에 있다
   ② 대장(manifest)의 우성 클립이 전부 표에 있다(새 클립이 생기면 순간 키를 적게 — 없으면 빨강) · 표에만 있는 낡은 열쇠도 빨강
   ③ _recorded.json 의 tempo(조립이 실제로 입힌 배속)가 표에서 나온 배속과 같다 — 진희 · 우성 전부(편지 통낭독 parents-letter 도 letter 13 — 페이지가 튼다)
   ③ 의 기대 배속 = 단계 배속 × global [GLOBAL_SLOW_1107]
   ④ 깨 보기 셋(global 을 바꿔도 ③ 빨강) — 표에서 우성 열쇠 하나를 지우면 ② 빨강 · 순간 단계 하나를 바꾸면 ③ 빨강
   node scripts/audit/tempo-check.mjs   종료 코드 0 통과 · 1 실패 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { loadTempo, tempoOf, speedOfStep, sentSpeed, stdOn, flatOn } from '../lib/tempo.mjs';

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
  /* ★★[SPEED97_1108 사장님 11/08 «97%는 표준» · 1안] 표준 방식 — 순간 단계 차이 없음 · 기본 = 구호 = 0.970 · 안내 = 0.985 · 감정은 사장님 선택(정하기 전 0.970 · 정한 뒤 0.940 ~ 0.965) · global 은 쓰지 않음(1) */
  const S = T.standard || {}, R = S.roles || {};
  /* ★★[SPEED3_1108 사장님 11/08 «3%가 적절»] 한 값 방식이 먼저 — 우성 · 진희 전부 0.970 · 43 은 1 · standard(역할별)는 꺼져 있어야 함(보관만) */
  if (flatOn(T)) { const F = T.flat;
    if (+F.speed !== 0.97) bad.push(`① [SPEED3_1108] flat.speed ${F.speed} ≠ 0.97`);
    if (T.standard && T.standard.on) bad.push('① [SPEED3_1108] standard(역할별 빠르기)는 취소 — on 이 켜져 있음');
    if (!(F.skip || []).includes('43_parents-letter')) bad.push('① [SPEED3_1108] 편지 통낭독 43 이 skip 에 없음');
    if (+T.global !== 1) bad.push('① [SPEED3_1108] global 은 1');
  } else {
  if (!stdOn(T)) bad.push('① [SPEED97_1108] standard.on 이 꺼져 있음');
  if (R.base !== 0.97 || R.cheer !== 0.97) bad.push(`① [SPEED97_1108] 기본 · 구호 배속이 0.970 이 아님(${R.base} · ${R.cheer})`);
  if (R.guide !== 0.985) bad.push(`① [SPEED97_1108] 안내 배속이 0.985(표준 +1.5%)가 아님(${R.guide})`);
  if (S.emotionPending ? R.emotion !== 0.97 : !(R.emotion >= 0.94 && R.emotion <= 0.965)) bad.push(`① [SPEED97_1108] 감정 배속 ${R.emotion} — 정하기 전에는 0.970 · 정한 뒤(emotionPending false)에는 0.940 ~ 0.965`);
  if (+T.global !== 1) bad.push('① [SPEED97_1108] 표준 방식에서 global 은 1 이어야 함(옛 0.96 · 취소된 1.0125 금지)');
  }
  const okStep = (v) => Number.isInteger(v) && v >= 0 && v <= 20;
  if (!okStep((T.voice || {})['진희']?.step)) bad.push('① 진희 단계가 0 ~ 20 정수가 아님');
  for (const [m, v] of Object.entries(T.moments || {})) if (!m.startsWith('_') && !okStep(v)) bad.push(`① 순간 ${m} 단계 ${v}`);
  for (const [k, m] of Object.entries(T.woosung || {})) if (!((T.moments || {})[m] != null)) bad.push(`① ${k} 순간 키 ${m} 가 moments 에 없음`);
  const wo = narr.filter((c) => voiceOf(c) === '우성').map(keyOf);
  for (const k of wo) if (!(T.woosung || {})[k]) bad.push(`② 우성 ${k} 가 표에 없음 — 순간 키를 적을 것`);
  for (const k of Object.keys(T.woosung || {})) if (!wo.includes(k)) bad.push(`② 표의 ${k} 가 대장 우성 클립에 없음(낡은 열쇠)`);
  let n = 0, nS = 0, nOne = 0;
  for (const c of narr) {
    const v = voiceOf(c); if (v !== '진희' && v !== '우성') continue;
    if (RETIRED[c.file] && c.file !== 'parents-letter') continue;   // 편지 통낭독은 예식 큐에선 빠졌지만 어른께 드리는 안내(parents.html)가 튼다 — 대본 11/07 «편지 = 13»
    const k = keyOf(c); const r = rec[k]; if (!r || typeof r !== 'object') continue;   // 아직 녹음 전 · 옛 기록은 다시받기 쪽 몫
    const exp = tempoOf(T, k, v); if (exp == null) continue;                           // ② 에서 이미 빨강
    const got = r.tempo == null ? 1 : +r.tempo; n++;
    if (Math.abs(got - exp) > 5e-4) bad.push(`③ ${k}(${v}) 입힌 배속 ${got} ≠ 표 ${exp}`);
    /* [SPEED97_1108] 문장 역할 배속 — 조립이 적은 sent(없으면 전부 클립 배속)가 표의 역할 배속과 같다 · 문장 원본이 없는 클립(편지 통낭독 · tempoNote)은 클립 한 값 */
    if (stdOn(T) && !r.tempoNote && c.file !== 'parents-letter') { const want = c.sents.map((x) => sentSpeed(T, x.text, v)), have = Array.isArray(r.sent) ? r.sent : c.sents.map(() => got);
      want.forEach((w, i) => { nS++; if (Math.abs((+have[i] || 0) - w) > 5e-4) bad.push(`③ ${k}#${i}(${v}) 문장 배속 ${have[i]} ≠ 표 ${w} «${String(c.sents[i].text).slice(0, 24)}»`); }); }
    else if (stdOn(T)) nOne++;
  }
  if (!quiet) console.log(`  표 대조 ${n}클립 · 문장 ${nS} · 클립 한 값 ${nOne}(원본 문장 없음) · 표준 ${(T.standard || {}).roles ? JSON.stringify(T.standard.roles) : '-'}${(T.standard || {}).emotionPending ? ' · 감정 값 대기' : ''} · 진희 ×${tempoOf(T, '', '진희')}`);
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
if (flatOn(T)) t2.flat.speed = 0.95; else if (stdOn(T)) t2.standard.roles.base = 0.96;   // [SPEED97_1108] 표준 방식에선 순간 단계 대신 표준 값을 바꿔 깬다
const b2 = !mk || check(t2, true).some((b) => b.startsWith('③'));
console.log((b2 ? 'ok  ' : 'FAIL') + ' ④ 깨 보기 — 순간 단계(표준 방식에선 표준 값)를 바꾸면 ③ 빨강');

const t3 = JSON.parse(JSON.stringify(T)); let b3;
if (flatOn(T)) { t3.flat.speed = 0.96; b3 = check(t3, true).some((b) => b.startsWith('③')) && check(t3, true).some((b) => b.startsWith('①')); console.log((b3 ? 'ok  ' : 'FAIL') + ' ④ 깨 보기 — 한 값(0.97)을 바꾸면 ① · ③ 빨강 [SPEED3_1108]'); }
else { t3.standard.roles.guide = 0.99; b3 = check(t3, true).some((b) => b.startsWith('③') && /#\d/.test(b)) && check(t3, true).some((b) => b.startsWith('①')); console.log((b3 ? 'ok  ' : 'FAIL') + ' ④ 깨 보기 — 안내 배속을 바꾸면 ① · ③(문장) 빨강 [SPEED97_1108]'); }
const t4 = JSON.parse(JSON.stringify(T)); t4.global = 1.0125;
const b4 = check(t4, true).some((b) => b.includes('global'));
console.log((b4 ? 'ok  ' : 'FAIL') + ' ④ 깨 보기 — 취소된 global 1.0125 를 되살리면 ① 빨강 [SPEED97_1108]');
const fail = bad.length || !b1 || !b2 || !b3 || !b4;
console.log(fail ? 'TEMPO_1107 FAIL' : 'TEMPO_1107 OK');
process.exit(fail ? 1 : 0);
