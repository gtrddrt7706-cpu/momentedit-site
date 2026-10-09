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
const CHAIN = [...new Set([...src.matchAll(/try \{ (?:if \(typeof (\w+) === 'function'\) )?(\w+)\(/g)].map((m) => m[2]).filter((n) => /^purge/.test(n)))];
// 반드시 매달려 있어야 할 개인정보 · 기록 파기(줄이 빠지면 빨강 — 본문에서 읽은 목록만 믿지 않는다)
const REQUIRED = ['purgeAwDemandLog', 'purgeAiCostLog', 'purgeLeads', 'purgeStaleCustomers', 'purgeKakaoClicks', 'purgeAiHandoff', 'purgeSmsLog', 'purgeNfTrack', 'purgeSnapRefs', 'purgeRitualFiles'];
const lost = REQUIRED.filter((n) => !CHAIN.includes(n));
if (lost.length) { console.log('━━ purge-chain — 빨강 · 주간 정리에서 빠진 파기: ' + lost.join(' · ') + ' [PURGE_CHAIN_ALWAYS]'); process.exit(1); }

function run(label, sheet, victim) {
  const { sandbox: G } = loadGas(makeSandbox());
  const called = [];
  for (const n of CHAIN) G[n] = () => { called.push(n); if (n === victim) throw new Error('파기 하나 실패'); };
  G.SpreadsheetApp = { getActive: () => ({ getSheetByName: () => sheet }) };
  try { G.purgeAdvisorLog({ triggerUid: 'T' }); } catch (e) { return { label, called, err: String(e && e.message) }; }
  return { label, called };
}
const old = new Date(Date.now() - 200 * 86400000).toISOString(), recent = new Date().toISOString();
let deleted = 0;
const withRows = { getLastRow: () => 3, getRange: () => ({ getValues: () => [[old], [recent]] }), deleteRows: (a, n) => { deleted += n; } };
const throwing = { getLastRow: () => 5, getRange: () => { throw new Error('Service Spreadsheets timed out'); }, deleteRows: () => { throw new Error('out of bounds'); } };
const cases = [run('시트 없음', null), run('머리글만', { getLastRow: () => 1 }), run('기록 있음', withRows), run('읽기 실패', throwing)];
// 매단 파기 하나가 던져도 나머지는 다 불린다(각자 try)
for (const v of CHAIN) cases.push(Object.assign(run(v + ' 이 던짐', null, v), { victim: v }));
const bad = [];
for (const c of cases) {
  if (c.err) bad.push(c.label + ': 던졌다 — ' + c.err);
  const miss = CHAIN.filter((n) => !c.called.includes(n) && n !== c.victim);
  if (miss.length) bad.push(c.label + ': 파기 ' + miss.length + '개를 건너뛰었다(' + miss.slice(0, 4).join(' · ') + ')');
}
if (deleted !== 1) bad.push('기록 있음: 90일 지난 질문 1줄을 지워야 하는데 ' + deleted + '줄');
if (bad.length) { console.log('━━ purge-chain — 빨강 ' + bad.length + '건 [PURGE_CHAIN_ALWAYS]'); for (const b of bad) console.log('  ✖ ' + b); process.exit(1); }
console.log('━━ purge-chain — 통과 · 매단 파기 ' + CHAIN.length + '개(꼭 있어야 할 ' + REQUIRED.length + '개 포함) · 시트 없음 · 머리글만 · 기록 있음 · 읽기 실패 · 하나씩 던짐 ' + CHAIN.length + ' 모두 끝까지 [PURGE_CHAIN_ALWAYS]');
