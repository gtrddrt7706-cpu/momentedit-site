#!/usr/bin/env node
/* [B2_MA_11 2026-11-06 2차 B2-마11] 청첩장 발행 행 주인 — 진짜 85_invitation 의 _invResolveEventId 를 시트만 가로채 부른다.
   ① 이 고객의 eventId 행은 다시 쓴다 ② 이름 · 월일이 같아도 다른 고객 몫이면 새 ID ③ 주인을 모르는 이름 일치 행이면 멈춘다(conflict)
   종료코드: 0 통과 · 1 위반 · 2 못 쟀다 */
import { loadGas } from './gas-lint.mjs';
const { sandbox: G, errors } = loadGas();
if (errors.length || typeof G._invResolveEventId !== 'function') { console.log('━━ inv-owner — GAS 로드 실패'); process.exit(2); }
let bad = 0; const ok = (c, m, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' → ' + x)); if (!c) bad++; };
const rows = [['kim-lee-1024-aaaaaa', '김민', '이나'], ['kim-lee-1024-bbbbbb', '김민', '이나']];
const sheet = { getRange: (r, c, n) => ({ getValues: () => rows.slice(0, n).map((x) => [x[c - 1]]) }) };
const colOf = { eventId: 1, groomName: 2, brideName: 3 };
G.INV.DATA_START_ROW = 1; G._invFindLastRow = () => rows.length; G._invRandEventSuffix = () => 'zzzzzz';
let owners = {};
G._findCustomerBy = (h, v) => (owners[v] ? { get: (k) => (k === '개인코드' ? owners[v] : '') } : null);
owners = { 'kim-lee-1024-aaaaaa': 'ME-A', 'kim-lee-1024-bbbbbb': 'ME-B' };
let r = G._invResolveEventId(sheet, colOf, 'kim-lee-1024', '김민', '이나', 'kim-lee-1024-bbbbbb', 'ME-B');
ok(r.eventId === 'kim-lee-1024-bbbbbb' && r.rowNum === 2, '① 이 고객의 eventId 행을 다시 쓴다', JSON.stringify(r));
r = G._invResolveEventId(sheet, colOf, 'kim-lee-1024', '김민', '이나', '', 'ME-C');
ok(r.eventId === 'kim-lee-1024-zzzzzz' && r.rowNum === 3, '② 이름 · 월일이 같아도 다른 고객 몫이면 새 ID · 새 행', JSON.stringify(r));
owners = { 'kim-lee-1024-bbbbbb': 'ME-B' };
r = G._invResolveEventId(sheet, colOf, 'kim-lee-1024', '김민', '이나', '', 'ME-C');
ok(r.conflict === true, '③ 주인을 모르는 이름 일치 행이면 멈춘다', JSON.stringify(r));
r = G._invResolveEventId(sheet, colOf, 'kim-lee-1024', '김민', '이나', '', 'ME-B');
ok(r.eventId === 'kim-lee-1024-bbbbbb', '이 고객 몫(eventId 없이 저장된 옛 고객)은 앞에 주인 모를 행이 있어도 그 행', JSON.stringify(r));
console.log(bad ? `━━ inv-owner — 빨강 ${bad}건` : '━━ inv-owner OK — 청첩장 행 주인은 고객 코드 · 연결된 예식 ID 로 [B2_MA_11]');
process.exit(bad ? 1 : 0);
