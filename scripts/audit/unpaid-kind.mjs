// 관리자 «처리할 일»에서 «입금 신호 없는 기한 카드»가 «입금 확인 카드»와 갈리는지 — 실제 adminHome 으로 잰다.
//
// ★[UNPAID_KIND 2026-09-25 사장님 「중도금 고객인데 아직 입금도 안 했는데 처리할 일에 중도금확인이 떠 있는 건 왜?」]
//   재현(고치기 전 · 실제 GAS 소스): 네 경우가 전부 같은 이름 «중도금확인» · 같은 «중도금 확인» 버튼이었다.
//     · 고객이 «입금했어요»를 누름            → 중도금확인 · 입금 신호          (맞다)
//     · 입금 신호 없음 · 기한 당일(D-149)      → 중도금확인 · «입금 확인 대기»   (입금한 줄 안다)
//     · 입금 신호 없음 · 기한 10일 지남        → 중도금확인 · 미납 D+10          (이름이 반대 말을 한다)
//     · 149일 안에 오늘 서명한 임박 계약       → 중도금확인 · «미납 D+87 · 7일 최고 후 해제 절차» 빨강 (틀린 경보)
//   고객 화면은 임박 계약에 기한 대신 «계약 시 함께 납부»라고 말한다(70_journey _midDuePast). 관리자만 D-149 로 셌다.
//
//   ★[SERVED_OURS] 세계를 못 만들거나 함수를 못 찾으면 «틀렸다(1)»가 아니라 «못 쟀다(2)».
//   종료 코드: 0 통과 · 1 재서 틀렸다 · 2 재지 못했다
import { openWorld } from './_gasworld.mjs';

let G, world;
try { ({ G, world } = openWorld()); }
catch (e) { console.log('━━ unpaid-kind — GAS 세계를 못 만들었습니다 · 재지 못했습니다: ' + e.message); process.exit(2); }
if (typeof G.adminHome !== 'function') { console.log('━━ unpaid-kind — adminHome 이 없습니다 · 재지 못했습니다'); process.exit(2); }

const T = G._kstYmd(new Date());
const shift = (ymd, n) => { const d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
let rc = 0;
const say = (c, m, d) => { console.log(`  ${c ? '✅' : '❌'} ${m}${c || d === undefined ? '' : ' → ' + String(d).slice(0, 220)}`); if (!c) rc = 1; };
function cards(row) {
  world(Object.assign({ 개인코드: 'ME-MID', 신랑이름: '가', 신부이름: '나', 상품타입: '시그니처', 연락처: '01012345678',
    계약상태: '서명완료', 입금상태: '확인', 현재단계: '입금완료', 계약총액: 2500000, 중도금상태: '', 잔금상태: '' }, row), null);
  G._AUTHED = true;
  const h = G.adminHome();
  return [...((h.queue && h.queue.urgent) || []), ...((h.queue && h.queue.normal) || [])]
    .filter((x) => x.code === 'ME-MID' && /중도금|잔금/.test(x.kind));
}
const one = (list) => (list.length === 1 ? list[0] : null);
const J = (x) => JSON.stringify(x);

console.log('━━ unpaid-kind — 입금 신호 없는 기한 카드는 «미납», 고객이 알린 입금은 «확인»');
{ const c = one(cards({ 예식일: shift(T, 139), 계약서명일시: shift(T, -61) + ' 10:00', 중도금상태: '완료신호', 중도금입금신호: T + ' 09:00', 중도금입금자명: '가' }));
  say(!!c && c.kind === '중도금확인' && /입금 확인/.test(c.sub), '고객이 «입금했어요» → 중도금확인 (그대로)', J(c)); }
{ const c = one(cards({ 예식일: shift(T, 149), 계약서명일시: shift(T, -51) + ' 10:00' }));
  say(!!c && c.kind === '중도금미납' && /기한일\(오늘\)/.test(c.sub) && /입금 신호 없음/.test(c.sub) && !/입금 확인 대기/.test(c.sub) && c.badge.level === 'yellow',
    '기한 당일 · 신호 없음 → 중도금미납(노랑) · «입금 확인 대기»라고 말하지 않는다', J(c)); }
{ const c = one(cards({ 예식일: shift(T, 139), 계약서명일시: shift(T, -61) + ' 10:00' }));
  say(!!c && c.kind === '중도금미납' && /D\+10/.test(c.sub) && c.badge.level === 'red' && c._urgent === true, '기한 10일 지남 → 중도금미납 D+10(빨강)', J(c)); }

console.log('━━ unpaid-kind — 149일 안에 맺은 임박 계약은 «서명일»부터 센다');
{ const c = one(cards({ 예식일: shift(T, 62), 계약서명일시: T + ' 10:00' }));
  say(!!c && c.kind === '중도금미납' && /계약 시 함께 납부/.test(c.sub) && !/D\+\d/.test(c.sub) && c.badge.level === 'yellow' && !c._urgent,
    '오늘 서명 → «계약 시 함께 납부» 노랑 · 종전 «미납 D+87 · 해제 절차» 빨강이 아니다', J(c)); }
{ const c = one(cards({ 예식일: shift(T, 62), 계약서명일시: shift(T, -3) + ' 10:00' }));
  say(!!c && c.kind === '중도금미납' && /서명 D\+3/.test(c.sub) && c.badge.level === 'red', '서명 3일째 미납 → 서명 D+3(빨강)', J(c)); }
{ const list = cards({ 예식일: shift(T, 62), 계약서명일시: T + ' 10:00', 입금상태: '' });
  say(list.length === 0, '계약금도 아직이면 중도금 카드는 안 띄운다(계약금과 함께 내는 돈 · 현황판 «입금 대기»가 맡는다)', J(list)); }
{ const c = one(cards({ 예식일: shift(T, 139), 계약서명일시: '' }));
  say(!!c && c.kind === '중도금미납' && /D\+10/.test(c.sub), '서명일 기록이 없는 옛 계약은 종전처럼 D-149 로 센다', J(c)); }

console.log('━━ unpaid-kind — 잔금도 같은 자');
{ const c = one(cards({ 예식일: shift(T, 5), 계약서명일시: shift(T, -200) + ' 10:00', 중도금상태: '확인' }));
  say(!!c && c.kind === '잔금미납' && /D\+4/.test(c.sub) && /입금 신호 없음/.test(c.sub), '잔금 기한(D-9) 4일 지남 · 신호 없음 → 잔금미납 D+4', J(c)); }
{ const c = one(cards({ 예식일: shift(T, 5), 계약서명일시: shift(T, -200) + ' 10:00' }));
  say(!!c && c.kind === '중도금잔금미납', '잔금 기한 안인데 중도금까지 통미납 → 중도금잔금미납 한 장', J(c)); }
{ const c = one(cards({ 예식일: shift(T, 5), 계약서명일시: shift(T, -200) + ' 10:00', 잔금상태: '완료신호', 잔금입금신호: T + ' 09:00', 중도금상태: '확인' }));
  say(!!c && c.kind === '잔금확인', '잔금 입금 신호 → 잔금확인 (그대로)', J(c)); }

console.log('━━ unpaid-kind — 관리자 화면이 새 이름을 안다(모르면 버튼이 사라지고 이름이 영문자처럼 보인다)');
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
for (const rel of ['admin.html', 'automation/admin/Admin.html']) {
  const s = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  for (const [k, act] of [['중도금미납', 'confirmMid'], ['잔금미납', 'confirmBalance'], ['중도금잔금미납', 'confirmMidBal']]) {
    say(s.includes(`'${k}':'${act}'`) && s.includes(`'${k}':'입금 확인'`), `${rel} — ${k} → ${act} · 버튼 «입금 확인»`);
  }
}
{ const s = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8');
  say(/'중도금미납':'중도금 미납'/.test(s) && /'중도금미납':'payment'/.test(s), 'admin.html — 칩 «중도금 미납» · 상세는 결제 카드로'); }

console.log(rc ? '━━ unpaid-kind — 틀린 곳이 있습니다' : '━━ unpaid-kind — 전부 통과');
process.exit(rc);
