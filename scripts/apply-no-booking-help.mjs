/* 「예약을 도와준다」는 말을 전부 걷어낸다  [NO_BOOKING_HELP]
 *
 * ★사장님 2026-09-19: *"디렉터가 직접 움직인다는 부분은 수정하고 싶어"* → *"직접 무언가를 하지 않아"*
 *   → *"예약 관련 우리가 도움을 주는 건 없어"*
 *
 * ★실측한 시스템(mypage.html 다이닝 카드) — 우리가 «실제로» 주는 것은 넷이다:
 *     ①검증한 식당 목록  ②「전화로 예약하기 · 번호」  ③지도·길찾기
 *     ④「예약 시 이렇게 말해보세요」 — 날짜·도착 시각·인원을 넣어 자동으로 만든 통화 문장
 *   예약은 두 분이 직접 하신다. 디렉터가 대신 걸거나 잡아 주지 않는다.
 *
 * ★그런데 문구는 «대신 움직입니다»·«디렉터가 도와드립니다»로 여덟 자리에 퍼져 있었다.
 *   한 곳만 고치면 나머지로 샌다 — 그래서 한 번에 고치고, 자리마다 개수를 센다.
 *   하나라도 안 맞으면 **아무것도 쓰지 않는다**(반만 고친 판이 가장 나쁘다).
 *
 * ★빼기만 하지 않는다 — 빠져 있던 «진짜»를 넣는다.
 *   지도와 «자동으로 만들어 주는 통화 문장»은 실제로 하는 일인데 어느 문구에도 없었다.
 *
 *   node scripts/apply-no-booking-help.mjs [--write]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (r) => path.join(ROOT, r);
const WRITE = process.argv.includes('--write');

const E = [
  /* ① 어른께 드리는 편지 — 화면 */
  ['parents.html', 1,
   '예약이 어려운 곳은 디렉터가 대신 움직입니다.',
   '연락처와 예약하실 때 그대로 말씀하실 문구까지 정리해 드립니다.'],
  /* ①-a 그 문단의 «사실 근거» 주석도 옛 홈 문구를 인용하고 있었다 — 인용을 지운다 */
  ['parents.html', 1,
   '사실 근거: 홈 「맛·주차·프라이버시까지 확인해 추천」·「예약이 어려우면 디렉터가 대신 움직입니다」,',
   '사실 근거: 홈 「맛·주차·프라이버시까지 확인해 추천」 · mypage 다이닝 카드(연락처·지도·통화 문장 제공),'],
  /* ② 홈 애프터웨딩 — 실제 화면이 주는 것으로 */
  ['index.html', 1,
   '고르시면 연락처와 예약 문구까지 정리해 드리고, 예약이 어려우면 디렉터가 대신 움직입니다.',
   '고르시면 연락처와 지도, 예약하실 때 그대로 말씀하실 문장까지 마이페이지에 정리해 드립니다.'],
  /* ③ 홈 FAQ + 구조화 데이터 — 같은 문장이 두 벌이다 */
  ['index.html', 2,
   '예약이 어려우신 경우 디렉터가 도와드립니다.',
   '예약은 두 분이 직접 하시게 됩니다.'],
  /* ④ 챗봇 지식 — 봇이 약속하지 않도록 «대행하지 않는다»를 명시한다 */
  ['api/_kb.js', 1,
   '- 인근 식당 제안·예약 안내(연락처와 통화 문구 제공, 예약이 어려우면 디렉터가 도움).',
   '- 인근 식당 제안·예약 안내(연락처·지도·통화 문장 제공 · 예약은 고객이 직접 하며 우리가 대행하거나 돕지 않는다).'],
  ['assets/advisor-kb.js', 1,
   '연락처와 예약 안내 문구까지 정리해 드리고, 예약이 어려우신 경우 디렉터가 도와드립니다.',
   '연락처와 예약 안내 문구까지 정리해 드립니다. 예약은 두 분이 직접 하시게 됩니다.'],
  /* ⑤ 마이페이지 다이닝 카드 — 여기가 실제 화면이라 여기서부터 참이어야 한다 */
  ['mypage.html', 1,
   ' 예약이 어려우면 디렉터에게 요청해 주세요.',
   ''],
  ['mypage.html', 1,
   '전화번호는 확정되는 대로 안내해 드릴게요. 디렉터에게 요청하셔도 돼요.',
   '전화번호는 확정되는 대로 안내해 드릴게요.'],
  /* ★낭독 대본(build-dubbing-script.mjs)은 여기서 안 건드린다 — 그 문장은 아직 대본에 없다.
     B판 차례와 함께 들어가야 하므로 apply-parents-b.mjs 가 한 번에 넣는다. 두 곳에서 고치면 갈린다. */
];

let bad = 0;
const plan = [];
for (const [f, n, from, to] of E) {
  let src;
  try { src = fs.readFileSync(P(f), 'utf8'); } catch (e) { console.log(`✗ ${f} 를 못 읽었다`); bad++; continue; }
  const got = src.split(from).length - 1;
  /* ★[ALREADY_DONE] 이미 고쳐진 자리는 «틀림»이 아니다.
     병렬 세션이 같은 파일을 건드려 main 을 합친 뒤 다시 돌릴 일이 생긴다. 그때 옛 문구가 0개인 것은
     정상이고, 새 문구가 제 개수만큼 있으면 그 자리는 끝난 것이다. 그걸 실패로 세면 «반만 고친 판»을
     막으려던 가드가 거꾸로 «전부 못 고치게» 막는다. */
  /* ★지우는 자리(to 가 빈 문자열)는 «옛 문구가 0개»인 것 자체가 끝난 증거다 */
  if (got === 0 && (to === '' || (src.split(to).length - 1) >= n)) { console.log(`ok ${f} — 이미 되어 있음(${n}자리)`); continue; }
  if (got !== n) { console.log(`✗ ${f} — 「${from.slice(0, 34)}…」 ${n}개를 바랐는데 ${got}개다`); bad++; continue; }
  plan.push([f, from, to, n]);
  console.log(`ok ${f} — ${n}자리`);
}
if (bad) { console.log(`\n✗ ${bad}자리가 안 맞는다 — 아무것도 쓰지 않았다(반만 고친 판이 가장 나쁘다)`); process.exit(1); }
if (!WRITE) { console.log('\n(안 씀 · --write 로 실제 반영)'); process.exit(0); }
const byFile = {};
for (const [f, from, to] of plan) (byFile[f] ||= []).push([from, to]);
for (const f of Object.keys(byFile)) {
  let src = fs.readFileSync(P(f), 'utf8');
  for (const [from, to] of byFile[f]) src = src.split(from).join(to);
  fs.writeFileSync(P(f), src);
  console.log(`  썼다: ${f}`);
}
