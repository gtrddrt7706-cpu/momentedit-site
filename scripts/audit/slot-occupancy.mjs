/* ★[SLOT_OCC 2026-08-26 더블부킹 시뮬레이션] 예식 슬롯 점유 판정(_weddingOccupancy·_weddingSlotTaken)의
   일곱 가지 의미를 고정한다 — «한 타임 한 팀»은 이 스튜디오의 정체성이라, 판정 한 줄이 바뀌면
   더블부킹(두 팀이 같은 시간에 서명) 또는 유령 점유(취소된 슬롯이 안 풀림)가 된다.
   실측(2026-08-26): 일곱 경우 전부 올바랐다. 이 검사는 그 상태를 고정한다.
   ★⑥ «발송은 점유 아님»은 의도다 — 미서명 계약이 슬롯을 72시간 잠그는 것이 더 나쁘다.
     서명 시점 가드(handleSignContract 244행)가 늦게 온 쪽을 정중히 돌려보낸다(락으로 원자적).
   사용: node scripts/audit/slot-occupancy.mjs */
import { openWorld } from './_gasworld.mjs';
const { G, world } = openWorld();
let fail = 0;
const ok = (c, m, d) => { console.log(`  ${c ? '✅' : '❌'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const ymd = (d) => { const x = new Date(Date.now() + d * 86400000 + 9 * 3600e3), z = (n) => String(n).padStart(2, '0');
  return `${x.getUTCFullYear()}-${z(x.getUTCMonth() + 1)}-${z(x.getUTCDate())}`; };
const taken = (row, qDate, qSlot) => { world(Object.assign({ 개인코드: 'ME-AAAA' }, row));
  const sheet = G.getCustomersSheet(), colOf = G.buildHeaderIndex(sheet);
  return G._weddingSlotTaken(sheet, colOf, qDate, qSlot, 'ME-BBBB'); };
const D = ymd(120);
const signed = { 현재단계: '입금완료', 계약상태: '서명완료', 예식일: D, 동의기록: JSON.stringify({ 계약정보: { weddingTime: '12:20' } }) };

ok(taken(signed, D, '12:20') === true, '서명완료 고객의 슬롯은 점유다');
ok(taken(signed, D, '15:40') === false, '같은 날 다른 슬롯은 비어 있다');
ok(taken(Object.assign({}, signed, { 현재단계: '취소' }), D, '12:20') === false, '취소되면 슬롯이 풀린다');
ok(taken({ 현재단계: '상담확정', 동의기록: JSON.stringify({ 가예약: { status: '승인', date: D, slot: '09:00', expires: ymd(7) } }) }, D, '09:00') === true, '유효한 가예약은 점유다');
ok(taken({ 현재단계: '상담확정', 동의기록: JSON.stringify({ 가예약: { status: '승인', date: D, slot: '09:00', expires: ymd(-1) } }) }, D, '09:00') === false, '만료된 가예약은 자동 해제된다');
ok(taken({ 현재단계: '상담완료', 계약상태: '발송', 예식일: D, 동의기록: JSON.stringify({ 계약정보: { weddingTime: '12:20' } }) }, D, '12:20') === false, '발송(미서명)은 점유가 아니다 — 의도(위 주석)');
ok(taken(Object.assign({}, signed, { 예식일: ymd(200) }), D, '12:20') === false, '예식일을 옮기면 옛 슬롯이 풀린다');

console.log(`\n결과 — ${fail ? ('문제 ' + fail + '건') : '문제 0건'}`);
process.exit(fail ? 1 : 0);
