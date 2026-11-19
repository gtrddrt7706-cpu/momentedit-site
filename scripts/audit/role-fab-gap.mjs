#!/usr/bin/env node
/* ★[ROLE_FAB_GAP_N06 2026-11-20 NIGHT20 #06 R3X2] 폰 — 연습하기 «역할 전달하기» 줄은 오른쪽 40px 를 비워 상담 말풍선(.me-fab-stack · RAIL_LOCKED) 세로줄을 비켜선다.
   종전엔 390 · 360 에서 단추 오른쪽 34px 가 말풍선 아래로 들어갔다. 정적으로 잰다 · --selftest 로 깨 본다 */
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OP = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8');
const RULE = '@media (max-width:680px){ .pr-roles li{padding-right:40px} }';
const judge = (s) => s.includes(RULE) && !/\.me-fab-stack\{[^}]*\}[^\n]*ROLE_FAB_GAP/.test(s);
if (process.argv.includes('--selftest')) { const b = !judge(OP.replace(RULE, '')); console.log((b ? 'ok   ' : 'FAIL ') + 'selftest 여백 줄을 지우면 빨강'); process.exit(b ? 0 : 1); }
const ok = judge(OP); console.log((ok ? 'ok   ' : 'FAIL ') + '[ROLE_FAB_GAP_N06] 폰 역할 전달 줄이 말풍선을 비켜섬'); process.exit(ok ? 0 : 1);
