#!/usr/bin/env node
/* ★[PURGE_CHAIN_ALWAYS 2026-10-09 점검] 주간 정리(consultation-booking · purgeAdvisorLog)는
   «상담사질문로그» 정리가 비거나(시트 없음 · 머리글만) 실패해도 뒤에 매단 파기(미계약 고객 익명화 · 목소리 파일 · 인계 만료 …)를 늘 부른다.
   문자열이 아니라 «실제로 불렀나»로 잰다.
   종료 코드: 0 통과 · 1 빨강 · 2 재지 못함 */
import { loadGas, makeSandbox } from './gas-lint.mjs';

const { sandbox: G0, errors } = loadGas(makeSandbox());
if (errors.length) { console.log('━━ purge-chain — GAS 로드 실패 · 재지 못했습니다: ' + errors[0].file); process.exit(2); }
const src = String(G0.purgeAdvisorLog || '');
// 매단 파기 이름은 함수 본문에서 읽는다(늘면 함께 잰다) — `try { [if (typeof X === 'function') ]X(` 꼴
const CHAIN = [...new Set([...src.matchAll(/try \{ (?:if \(typeof (\w+) === 'function'\) )?(\w+)\(/g)].map((m) => m[2]))];
if (CHAIN.length < 8) { console.log('━━ purge-chain — 매단 파기를 ' + CHAIN.length + '개만 찾았다 · 재지 못했습니다'); process.exit(2); }

function run(label, sheet) {
  const { sandbox: G } = loadGas(makeSandbox());
  const called = [];
  for (const n of CHAIN) G[n] = () => { called.push(n); };
  G.SpreadsheetApp = { getActive: () => ({ getSheetByName: () => sheet }) };
  try { G.purgeAdvisorLog({ triggerUid: 'T' }); } catch (e) { return { label, called, err: String(e && e.message) }; }
  return { label, called };
}
const old = new Date(Date.now() - 200 * 86400000).toISOString(), recent = new Date().toISOString();
let deleted = 0;
const withRows = { getLastRow: () => 3, getRange: () => ({ getValues: () => [[old], [recent]] }), deleteRows: (a, n) => { deleted += n; } };
const throwing = { getLastRow: () => 5, getRange: () => { throw new Error('Service Spreadsheets timed out'); }, deleteRows: () => { throw new Error('out of bounds'); } };
const cases = [run('시트 없음', null), run('머리글만', { getLastRow: () => 1 }), run('기록 있음', withRows), run('읽기 실패', throwing)];
const bad = [];
for (const c of cases) {
  if (c.err) bad.push(c.label + ': 던졌다 — ' + c.err);
  const miss = CHAIN.filter((n) => !c.called.includes(n));
  if (miss.length) bad.push(c.label + ': 파기 ' + miss.length + '개를 건너뛰었다(' + miss.slice(0, 4).join(' · ') + ')');
}
if (deleted !== 1) bad.push('기록 있음: 90일 지난 질문 1줄을 지워야 하는데 ' + deleted + '줄');
if (bad.length) { console.log('━━ purge-chain — 빨강 ' + bad.length + '건 [PURGE_CHAIN_ALWAYS]'); for (const b of bad) console.log('  ✖ ' + b); process.exit(1); }
console.log('━━ purge-chain — 통과 · 매단 파기 ' + CHAIN.length + '개 · 시트 없음 · 머리글만 · 기록 있음 · 읽기 실패 넷 다 끝까지 [PURGE_CHAIN_ALWAYS]');
