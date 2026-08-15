// [PRICE_KIND_NEW 2026-08-15] 관리자 계약 발송 — 금액 세대별 요일 자동전환 점검.
//   ★admin.html 의 **진짜 GENS 배열을 읽어** 돈다 — 로직을 여기 베끼면 제품이 아니라 사본을 재게 된다
//     (이 검사를 처음 짤 때 계약서 쪽에서 실제로 그 함정을 밟았다).
//   왜 필요한가: 8/15 인상으로 세대가 셋이 됐는데 NEW 가 240 을 신가로 들고 있어,
//   250 을 고르면 요일 자동전환이 **조용히 멈췄다**(gen=null → return). 게이트도 화면도 안 보이는 자리였다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const src = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8');
const m = src.match(/var GENS=(\[\[[^;]*\]\]);/);
if (!m) { console.log('✗ GENS 배열을 못 찾음 — 이름이 바뀌었나'); process.exit(1); }
const GENS = JSON.parse(m[1].replace(/'/g, '"'));
let bad = 0;
const pick = (cur, isWeekend) => { for (const g of GENS) if (g.indexOf(cur) >= 0) return isWeekend ? g[0] : g[1]; return null; };
const cases = [
  ['3300000', false, '2500000', '주말 신가 → 평일이면 현세대 250'],
  ['2500000', true,  '3300000', '평일 250 → 주말이면 330'],
  ['2400000', true,  '3300000', '평일 240(8/15 전) → 주말 330'],
  ['2400000', false, '2400000', '평일 240 유지(세대 안에서만 움직인다)'],
  ['2100000', true,  '2800000', '평일 210(8/14 전) → 주말 280'],
];
for (const [cur, wknd, want, label] of cases) {
  const got = pick(cur, wknd);
  const ok = got === want;
  console.log(`${ok ? 'ok ' : '✗  '}${label}: ${cur} → ${got}${ok ? '' : ` (기대 ${want})`}`);
  if (!ok) bad++;
}
console.log(bad ? `실패 ${bad}건` : '세대 전환 전부 정상');
process.exit(bad ? 1 : 0);
