// 마이페이지 — 볼 수 있는 데까지 보고, 못 본 것은 못 봤다고 말한다 [MYPAGE_UNSEEN]
//
// ★왜 이 검사가 생겼나 (2026-08-11)
//   마이페이지는 고객이 가장 오래 머무는 화면(700KB)인데 **검사 51개 중 이 화면을 여는 것이
//   하나도 없었다.** 로그인(GAS)이 필요해서다. 그래서 이 화면은 조용한 사각지대였다 —
//   2026-08-09~10 에 고친 좌석·음료 시트는 지금까지 아무도 눈으로 확인하지 않았다.
//
// ★이 검사가 하지 않는 것 — **가짜 데이터를 지어내 통과시키지 않는다.**
//   토큰과 상태 캐시를 심으면 로그인 벽은 넘을 수 있다(실측 확인). 그런데 그 뒤 화면은
//   서버 응답 모양을 내가 지어내야 그려진다. 지어낸 것을 검사하면 **내가 만든 허구를
//   확인하는 것**이지 제품을 확인하는 게 아니다. 초록이 늘 뿐 아는 것은 늘지 않는다.
//
// ★그래서 하는 일 둘
//   ① 로그인 전 껍데기에서 **확실히 알 수 있는 것**만 잰다 —
//      JS 오류 · 가로 스크롤 · 저장 표시가 한 자리인가 · 완료 접기가 폐지된 채인가.
//      (뒤 둘은 2026-08-09 사용자 지시로 고친 것이라 되살아나면 안 된다)
//   ② **못 본 것을 목록으로 찍는다.** 사각지대를 눈에 보이게 두는 것이 이 검사의 본체다.
//      잊히면 다시 3주쯤 아무도 안 본다.
//
// ★종료 코드 [CANT_LOOK]
//   1 = 껍데기에서 잰 것이 틀렸다 (진짜 결함)
//   2 = 로그인 뒤를 못 봤다 (사각지대가 그대로다 — 통과가 아니다)
//   0 = 나오지 않는다. 로그인 뒤를 못 보는 한 이 검사는 절대 초록을 내지 않는다.
//       ★이건 고장이 아니라 설계다. 초록으로 만들려면 검사를 고칠 게 아니라
//         사람이 로그인해서 아래 '사람만 볼 수 있는 것'을 확인해야 한다.
//
// ★[NO_GATE] 게이트는 이 검사를 돌리지 않는다 — 브라우저와 로컬 서버가 필요하다.
//   야간 잡(nightly-screen.yml)이 하루 한 번 돌려 사각지대를 다시 알려 준다.
//     node scripts/check-mypage-shell.mjs

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openProbe } from './audit/page-probe.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* 로그인 뒤에만 있는 것 — 사람이 눈으로 봐야 하는 목록. 고칠 때마다 여기에 한 줄 더한다. */
const UNSEEN = [
  '좌석 · 음료 시트 — 바닥에서 올라오는지 · 3칸 타일이 균등한지 · 「선택 지우기」가 보이는지 [DRINK_SHEET]',
  '예식 준비 트랙 행 — 「좌석 · 음료」 라벨과 버튼 폭 정렬 [SEAT_DRINK_LABEL][TRK_ACT_ALIGN]',
  '저장 중 표시가 실제 저장 때 한 자리에서만 뜨는지 [BUSY_ONE_PLACE]',
  '완료된 항목이 접히지 않고 펼쳐진 채인지 [TRK_NO_FOLD]',
  '식순 빌더·미리듣기를 iframe 으로 열었을 때 상담 도우미가 겹치지 않는지 [MP_FS_OVERLAYS]',
];

let h;
try {
  h = await openProbe('mypage.html', { width: 390, waitUntil: 'domcontentloaded', settle: 3000 });
} catch (e) {
  console.log(`· 마이페이지를 못 열었습니다 — ${e.message}`);
  console.log('  ※ 종료 코드 2 = 재지 못했다(화면 결함 아님) · 1 = 재서 틀렸다');
  process.exit(2);
}

const bad = [];
try {
  const r = await h.probe();

  /* 껍데기에서 확실히 알 수 있는 것만 */
  if (r.errors.length) bad.push(`JS 오류 ${r.errors.length}건 — ${r.errors.slice(0, 2).join(' | ')}`);
  if (r.scrollsX) bad.push(`가로로 스크롤된다 (${r.scrollWidth}/${r.clientWidth})`);

  const dom = await h.page.evaluate(() => ({
    login: !!(document.getElementById('loginView') && document.getElementById('loginView').offsetParent),
    fold: document.querySelectorAll('.done-fold,[class*="done-fold"]').length,
    busy: document.querySelectorAll('.busy-row').length,
    busyIds: [...document.querySelectorAll('[id*="busy"]')].map((e) => e.id),
  }));

  /* ★[TRK_NO_FOLD] 완료 접기는 2026-08-09 사용자 지시로 폐지했다. 마크업·CSS 모두 0 이어야 한다. */
  if (dom.fold) bad.push(`완료 접기(.done-fold)가 ${dom.fold}개 되살아났다 — 2026-08-09 폐지분이다`);
  /* ★[BUSY_ONE_PLACE] 대기 표시는 한 낱말·한 자리다. 껍데기에서 잴 수 있는 것은 '짜임이 하나인가'까지. */
  if (dom.busy > 1) bad.push(`저장 표시 짜임(.busy-row)이 ${dom.busy}개 — 한 자리여야 한다`);

  console.log(`━━ mypage.html @390  로그인 화면=${dom.login} · 보이는 글 ${r.visible.length}자 · 가로스크롤 ${r.scrollsX}`);
  console.log(`   완료 접기 ${dom.fold}개(0이어야) · 저장 표시 짜임 ${dom.busy}개(1 이하) · JS 오류 ${r.errors.length}`);
  r.unseen.forEach((u) => console.log('   ☐ ' + u));
} finally {
  await h.close();
}

if (bad.length) {
  console.log('\n✗ 껍데기에서 잰 것이 틀렸습니다');
  bad.forEach((x) => console.log('   ' + x));
  process.exit(1);
}

/* ★여기서 0 을 내지 않는다. 껍데기가 멀쩡한 것과 마이페이지가 멀쩡한 것은 다르다. */
console.log('\n☐ 로그인 뒤는 재지 못했습니다 — 사람만 볼 수 있는 것 ' + UNSEEN.length + '가지:');
UNSEEN.forEach((u, i) => console.log(`   ${i + 1}. ${u}`));
console.log('\n  ※ 종료 코드 2 = 재지 못했다. 통과가 아닙니다.');
console.log('     가짜 데이터로 통과시키지 않습니다 — 지어낸 화면을 확인하는 것은 확인이 아닙니다.');
console.log(`     (${path.relative(ROOT, fileURLToPath(import.meta.url))} 머리말에 이유를 적어 뒀습니다)`);
process.exit(2);
