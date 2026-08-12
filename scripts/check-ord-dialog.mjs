// 식순 빌더 알림 판 — 한 번에 하나인가 · 부모보다 먼저 포기하지 않는가 [ORD_ASK_ONE][WAIT_PAST_PARENT]
//
// ★왜 이 검사가 생겼나 (2026-08-12 · 사용자 폰 스크린샷)
//   LTE 에서 「저장 후 나가기」를 눌렀더니 판이 **두 개 겹쳐** 떴다 —
//   「저장 확인이 오지 않았어요」 위에 「나가기 전 저장이 안 됐어요」가 얹혀
//   글자끼리 겹치고 '확인' 단추도 둘이 포개졌다. 무엇을 눌러야 하는지 알 수 없는 화면이다.
//
// ★원인 둘 (둘 다 이 검사가 지킨다)
//   ① 나가기 자가해제가 **8초**였다. 부모(mypage)는 GAS 호출을 12초에 끊는다(mypage 1899행).
//      그래서 부모가 아직 답하는 중에 이쪽이 먼저 「안 왔다」고 말하고,
//      4초 뒤 부모의 진짜 사유가 도착해 판이 하나 더 섰다.
//      ★같은 부모 호출을 기다리는 자리가 둘인데 수를 따로 적어 뒀던 것이 뿌리다(16000 대 8000).
//   ② ordAsk 가 판을 **무조건 append** 했다 — 두 번 말하면 두 판이 쌓인다.
//      덤으로 스크롤이 영영 잠길 수 있었다(둘째 판이 기억한 '원래 overflow' 가 이미 hidden).
//
// ★[NO_GATE] 게이트는 이 검사를 돌리지 않는다 — 브라우저와 로컬 서버가 필요하다.
//   야간 잡(nightly-screen.yml)이 돌린다.
//     node scripts/check-ord-dialog.mjs
//
// ★종료 코드 [CANT_LOOK]  0 통과 · 1 재서 틀림 · 2 재지 못함

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openProbe } from './audit/page-probe.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8');

let h;
try {
  h = await openProbe('order-preview.html', { width: 390, waitUntil: 'domcontentloaded', settle: 2500 });
} catch (e) {
  console.log(`· 식순 빌더를 못 열었습니다 — ${e.message}`);
  console.log('  ※ 종료 코드 2 = 재지 못했다(화면 결함 아님) · 1 = 재서 틀렸다');
  process.exit(2);
}

const bad = [];
try {
  const r = await h.page.evaluate(async () => {
    const wait = (ms) => new Promise((s) => setTimeout(s, ms));
    const n = () => document.querySelectorAll('.ord-ask').length;
    const top = () => (document.querySelector('.ord-ask') || {}).innerText || '';
    if (typeof ordTell !== 'function') return { missing: true };
    /* ★같은 사건에 두 번 말하는 상황을 **실제로 만든다.** 그림으로 재현하지 않는다. */
    ordTell({ title: '판하나', body: '먼저 한 말' });
    await wait(150);
    const one = { n: n(), bo: document.body.style.overflow };
    ordTell({ title: '판둘', body: '뒤에 온 진짜 사유' });
    await wait(420);
    const two = { n: n(), keeps: /판하나/.test(top()), shows: /판둘/.test(top()) };
    /* 닫고 나면 뒤 화면 스크롤이 **풀려야** 한다 — 안 풀리면 화면이 굳는다 */
    document.querySelector('.ord-ask .oa-yes').click();
    await wait(420);
    const done = { n: n(), bo: document.body.style.overflow };
    return { one, two, done, giveup: (typeof PARENT_GIVEUP !== 'undefined') ? PARENT_GIVEUP : null };
  });

  if (r.missing) { console.log('· ordTell 이 없다 — 이 지면이 아니거나 스크립트가 안 돌았다'); process.exit(2); }

  /* ★[ORD_ASK_ONE] 판은 하나다 */
  if (r.one.n !== 1) bad.push(`판 하나를 띄웠는데 ${r.one.n}개다 [ORD_ASK_ONE]`);
  if (r.two.n !== 1) bad.push(`두 번 말했더니 판이 ${r.two.n}개 — 겹쳐 쌓인다(2026-08-12 사용자 스크린샷 그 화면) [ORD_ASK_ONE]`);
  if (r.two.keeps) bad.push(`옛 판이 남아 새 판과 겹친다 — 글자와 단추가 포개진다 [ORD_ASK_ONE]`);
  if (!r.two.shows) bad.push(`뒤에 온 진짜 사유가 안 보인다 — 새 말이 옛 말을 대신해야 한다 [ORD_ASK_ONE]`);
  /* ★잠금이 풀리는가 — 이걸 안 재면 「판은 하나」만 맞고 화면은 굳은 채 통과한다 */
  if (r.done.n !== 0) bad.push(`확인을 눌렀는데 판이 ${r.done.n}개 남았다 [ORD_ASK_ONE]`);
  if (r.done.bo === 'hidden') bad.push(`판을 다 닫았는데 뒤 화면 스크롤이 잠긴 채다(body overflow=hidden) — 화면이 굳는다 [ORD_ASK_ONE]`);

  /* ★[WAIT_PAST_PARENT] 부모(mypage 1899행)의 12초보다 뒤에 포기해야 한다.
     ★이건 「16000 인가」가 아니라 「12000 보다 큰가」로 잰다 — 부모가 15초로 늘어나는 날
       숫자 맞추기 검사는 초록인 채 다시 먼저 울게 된다. */
  if (r.giveup == null) bad.push(`PARENT_GIVEUP 이 없다 — 기다리는 시간이 다시 자리마다 흩어졌다 [WAIT_PAST_PARENT]`);
  else if (!(r.giveup > 12000)) bad.push(`자가해제 ${r.giveup}ms 가 부모의 12000ms 보다 이르다 — 아직 살아 있는 저장을 두고 「안 됐다」고 말한다 [WAIT_PAST_PARENT]`);
  /* ★상수가 옳은 것과 **자리들이 그 상수를 쓰는 것**은 다르다.
     위 한 줄만 재면, 상수는 16000 인 채 호출부만 8000 으로 되돌려도 초록이 난다.
     기다리는 자리는 둘(완료 저장 _saveT · 나가기 _obExitT) — 둘 다 상수를 써야 한다. */
  const uses = (SRC.match(/PARENT_GIVEUP/g) || []).length;
  if (uses < 3) bad.push(`PARENT_GIVEUP 을 쓰는 자리가 ${uses}곳이다 — 정의 1 + 기다리는 자리 2 여야 한다(한 자리가 숫자로 되돌아갔다) [WAIT_PAST_PARENT]`);
  /* ★★[EXIT_SCAN_BOUNDED 2026-08-12 실측] 이 확인은 **그 덩이 안에서만** 본다.
     옛 판은 `/_obExitT\s*=\s*setTimeout\([\s\S]*?\},\s*(\d+)\s*\)/` 로 **파일 끝까지** 훑었다.
     지금 안 터지는 이유는 그 뒤에 `},<숫자>)` 로 끝나는 줄이 우연히 하나도 없어서다.
     ★실측 — 그 덩이 **뒤에** 무관한 `setTimeout(function(){ var z=1; }, 200);` 을 한 줄 두니
       검사가 「나가기 자가해제가 숫자 200ms 로 박혀 있다」고 **헛붉었다.** 멀쩡한 코드를 두고
       엉뚱한 자리를 고치라고 말하는 판이다. SLICE_WIDTH_READ 와 같은 병 — 비한정 스캔은 덩이 밖을 본다.
     → 앵커 줄의 들여쓰기를 읽어 **그 덩이의 닫는 줄까지만** 자르고, 그 안에서만 숫자를 찾는다. */
  const exitHead = SRC.match(/^([ \t]*)_obExitT\s*=\s*setTimeout\(/m);
  if (!exitHead) {
    bad.push(`나가기 자가해제(_obExitT) 자리를 못 찾았다 — 이 확인이 헛돌았다(통과가 아니다) [WAIT_PAST_PARENT]`);
  } else {
    const eInd = exitHead[1];
    const eStart = SRC.indexOf(exitHead[0]);
    const eEnd = SRC.indexOf('\n' + eInd + '},', eStart);
    if (eEnd < 0) {
      bad.push(`나가기 자가해제 덩이의 닫는 줄을 못 찾았다 — 범위를 못 정했다(통과가 아니다) [WAIT_PAST_PARENT]`);
    } else {
      const eBlk = SRC.slice(eStart, SRC.indexOf('\n', eEnd + 1));
      const lit = eBlk.match(/\},\s*(\d+)\s*\)/);
      if (lit) bad.push(`나가기 자가해제가 숫자 ${lit[1]}ms 로 박혀 있다 — 부모가 시간을 바꾸는 날 같이 안 움직인다 [WAIT_PAST_PARENT]`);
    }
  }

  console.log(`━━ order-preview.html @390  [ORD_ASK_ONE] 한 번 말함=${r.one.n}판 · 두 번 말함=${r.two.n}판(새 말 보임=${r.two.shows}) · 닫은 뒤=${r.done.n}판 · 스크롤 잠금=${r.done.bo || '풀림'}`);
  console.log(`   [WAIT_PAST_PARENT] 자가해제 ${r.giveup}ms > 부모 12000ms = ${r.giveup > 12000}`);
} finally {
  await h.close();
}

if (bad.length) {
  console.log('\n✗ 재서 틀렸습니다');
  bad.forEach((x) => console.log('   ' + x));
  process.exit(1);
}
console.log('\n통과 — 판은 한 번에 하나이고, 부모보다 먼저 포기하지 않습니다.');
process.exit(0);
