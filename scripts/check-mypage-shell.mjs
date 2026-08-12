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
  /* ★[SHELL_SKELETON 2026-08-12] 「완료 항목이 접히지 않은 채인지 [TRK_NO_FOLD]」는 목록에서 뺐다 —
     빈 객체로 진짜 트랙을 그려 .trk-fold 를 실제로 세게 됐다(아래 SHELL_SKELETON).
     ★남은 것은 **값과 모양**이다. 그건 서버 데이터가 있어야 하고, 지어내면 허구 확인이 된다. */
  '예식 준비 트랙 — 값이 채워진 뒤의 줄 모양·정렬(구조는 SHELL_SKELETON 이 본다) [TRK_ACT_ALIGN]',
  '식순 빌더·미리듣기를 iframe 으로 열었을 때 상담 도우미가 겹치지 않는지 [MP_FS_OVERLAYS]',
  '★실제 로그인 payload 에 서버가 refund 를 실어 보내는지 [REFUND_STATE] — 여기서는 직렬화만 쟀다.\n      코드 근거는 60_mypage.gs 50행(refund: buildRefundQuote). 사람이 로그인해 도우미에게\n      「지금 취소하면 얼마?」를 물어 실금액이 나오는지 한 번 확인할 것',
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
    /* ★★[TRK_NO_FOLD 자 교정 2026-08-12] 폐지된 것은 `.trk-fold`(예식 준비 트랙의 완료 행 접기)다.
       이 검사는 `.done-fold` 를 세고 있었다 — 그건 **청첩장 트랙의 접힘**(하객 안내·모바일 QR)이고
       살아 있는 화면이다. mypage.html 866~871·5215~5254 가 지금도 쓴다.
       ★지금까지 안 터진 이유는 로그인 전 껍데기에 그 요소가 안 그려져서다 — 운이다.
         로그인 뒤에 한 번이라도 돌면 멀쩡한 청첩장 접힘을 보고 「폐지분이 되살아났다」고 붉는다.
         늑대를 그렇게 부르면 다음 진짜 늑대 때 아무도 안 본다(★9).
       ★자를 잘못 든 것이지 화면이 틀린 게 아니었다(★8). 자를 바꾼다. */
    fold: document.querySelectorAll('.trk-fold,[class*="trk-fold"]').length,
    /* ★★[FOLD_ALIVE_CANT_LOOK 2026-08-12] 살아 있는 쪽(청첩장 접힘)은 **여기서 못 잰다.**
       처음엔 「0 이면 오삭제 신호」로 적었는데, 실측해 보니 이 자리에서는 **언제나 0** 이다 —
       `.done-fold` 를 그리는 두 자리(4828·5141) 가 전부 `invStepDone(...)` 이고,
       그건 로그인한 고객이 청첩장을 발행한 뒤에만 불린다. 껍데기에는 올 일이 없다.
       ★그러면 「0개」라는 숫자가 **잰 값처럼 보이면서 실은 안 잰 값**이 된다 —
         방금 고친 병(자를 잘못 들어 헛붉음)의 반대쪽 얼굴이다. 0 을 본 사람이
         2026-07-18 오삭제가 또 났다고 읽으면, 이번엔 **가짜 늑대를 우리가 만든다.**
       [CANT_LOOK] 규칙대로 숫자 대신 「못 잼」이라 적는다.
       ★그럼 오삭제는 누가 지키나 — merge-guard 의 `chk 'done-fold' mypage.html 3` 이 지킨다.
         그건 화면이 아니라 **원본**을 세므로 로그인 없이도 진짜로 잰다. 여기서 겹쳐 셀 이유가 없다. */
    foldAliveCantLook: true,
    busy: document.querySelectorAll('.busy-row').length,
    busyIds: [...document.querySelectorAll('[id*="busy"]')].map((e) => e.id),
  }));

  /* ★[TRK_NO_FOLD] 완료 접기는 2026-08-09 사용자 지시로 폐지했다. 마크업·CSS 모두 0 이어야 한다. */
  if (dom.fold) bad.push(`완료 행 접기(.trk-fold)가 ${dom.fold}개 되살아났다 — 2026-08-09 폐지분이다 [TRK_NO_FOLD]`);
  /* ★[BUSY_ONE_PLACE] 대기 표시는 한 낱말·한 자리다. 껍데기에서 잴 수 있는 것은 '짜임이 하나인가'까지. */
  if (dom.busy > 1) bad.push(`저장 표시 짜임(.busy-row)이 ${dom.busy}개 — 한 자리여야 한다`);

  /* ★★[SHELL_SKELETON 2026-08-12 · 클로드코드 요청 「하네스가 되는지 봐 달라」] **된다. 단 좁게.**
     ★이 파일 머리말은 「로그인 뒤는 서버 응답 모양을 내가 지어내야 그려진다」며 거절해 왔다.
       그 말은 **내용 검사**에는 맞다(환불 금액·좌석 값은 지어내면 내 허구를 확인하는 것이다).
       그런데 **구조 검사**는 다르다 — 「폐지한 클래스가 되살아났나」는 데이터 내용과 무관하다.
     ★실측 — renderProduction({}, null) 하나로 트랙 7줄이 그려진다(글자 353자 · .trk 7).
       아무것도 안 넘겼는데 그려진다. 즉 지어낼 것이 **없다.**
     ★빈 객체는 허구가 아니라 **아무것도 안 채운 상태**다 — 제작 단계에 막 들어와
       어느 트랙도 시작하지 않은 고객이 실제로 보는 화면이다. NO_INJECT 가 막으려던 것은
       「그 화면이 거르던 것을 건너뛰는 것」인데, 여기서는 거를 것 자체를 안 넘긴다.
     ★그래서 여기서 **딱 하나만** 잰다 — 폐지분(.trk-fold)이 진짜 트랙 화면에서도 0인가.
       이것이 UNSEEN 4번이었다. 나머지(값·정렬·시트)는 여전히 못 본다 — 목록에 그대로 남긴다. */
  const sk = await h.page.evaluate(async () => {
    if (typeof window.renderProduction !== 'function') return { can: false };
    try { window._mpStateD = { stage: '제작중' }; renderProduction({}, null); } catch (e) { return { can: false, why: e.message }; }
    await new Promise((r) => setTimeout(r, 250));
    const box = document.getElementById('mp_production');
    return { can: true, shown: !!(box && box.style.display === 'block'),
      trk: document.querySelectorAll('.trk').length,
      fold: document.querySelectorAll('.trk-fold,[class*="trk-fold"]').length };
  });
  if (!sk.can) {
    /* ★못 그렸으면 「통과」가 아니라 「못 쟀다」다 — 조용히 넘기면 안 쏜 화살이 된다(11-c). */
    bad.push(`제작 트랙을 못 그렸다 — 이 구조 검사가 헛돌았다(통과 아님)${sk.why ? ' · ' + sk.why : ''} [SHELL_SKELETON]`);
  } else {
    if (!sk.shown || sk.trk < 1) bad.push(`제작 트랙이 안 그려졌다(보임=${sk.shown} · 줄 ${sk.trk}) — 겨냥이 사라졌다 [SHELL_SKELETON]`);
    if (sk.fold) bad.push(`★진짜 트랙 화면에서 완료 행 접기(.trk-fold)가 ${sk.fold}개 — 2026-08-09 폐지분이다 [TRK_NO_FOLD]`);
  }

  /* ★[REFUND_STATE 2026-08-11] 상담 도우미에 넘기는 상태에 **서버 환불 견적이 실리는가.**
     ★왜 여기서 재나 — 이 자리는 틀려도 **조용하다.** 필드 이름 하나만 어긋나면 줄이 통째로 빠지고,
       도우미는 예전처럼 「사람이 확인해야 합니다」로 답한다. 화면은 멀쩡하고 아무도 모른다.
       실제로 내가 처음 잰 판에서 전역 이름을 틀려 네 경우 전부 「없음」이 나왔다.
     ★서버 데이터는 로그인이 있어야 오므로 여기서는 **직렬화만** 잰다 —
       값을 넣었을 때 문장이 나오는가, 산정 불가일 때 추측하지 않는가, 없을 때 안 나오는가.
       (로그인 뒤 실제 payload 는 아래 UNSEEN 에 남는다 · 60_mypage.gs 50행이 refund 를 싣는다) */
  const rs = await h.page.evaluate(() => {
    const mk = (refund) => {
      localStorage.setItem('me_state_v1', JSON.stringify({ d: {
        name: '검사', stage: '제작중',
        production: { base: { weddingDate: '2026-10-14' } },
        ledger: { total: 2100000, paid: 1050000, payments: [{ label: '중도금', amount: 840000, done: true }] },
        refund } }));
      const t = (window.ME_ADV_PAGE && window.ME_ADV_PAGE.state) ? String(window.ME_ADV_PAGE.state() || '') : '';
      /* ★환불 줄은 **둘**이다 — 수치 줄과 「다시 계산하지 말 것」 지시 줄.
         처음엔 '취소·환불' 로 시작하는 줄만 골랐다가 지시 줄을 놓쳐 멀쩡한 판을 붉게 만들었다(★8 자를 잘못 듦). */
      /* ★그물을 넓힌 자리 [REFUND_SHORTFALL] — 「위약금이 받은 금액보다 큽니다」 줄은 '취소·환불' 도
         '위 환불 수치는' 도 안 들어 있다. 옛 그물로 재면 그 줄이 **있어도 안 보인다.**
         실제로 내가 그 줄을 넣고 옛 그물로 재다가 「안 나온다」고 읽을 뻔했다(★8 을 또 밟았다). */
      return t.split('\n').filter((l) => /취소·환불|위 환불 수치는|위약금이 받은/.test(l)).join(' | ');
    };
    /* ★값은 **서버가 실제로 만드는 모양**으로 넣는다(70_journey.gs out()).
       rule 은 '위약금 10%(9조)'·'무상취소(7조)'·'청약철회(7조)'·'계약 전' 넷뿐이다 —
       처음엔 '예식 149~60일 전 10%' 라는, 서버가 결코 만들지 않는 값으로 재고 있었다.
       없는 모양으로 통과한 검사는 통과했다는 사실 말고는 아무것도 말해 주지 않는다. */
    return {
      normal: mk({ paid: 1050000, fitCount: 3, fitDeduct: 150000, needCount: false,
        penalty: 210000, rate: 0.10, rule: '위약금 10%(9조)', refund: 840000, dd: 64, asOf: '2026-08-11' }),
      cant: mk({ paid: 210000, fitCount: 0, fitDeduct: 0, needCount: true, penalty: 0, rate: 0, rule: '', refund: 0, dd: 64, asOf: '2026-08-11' }),
      none: mk(null),
      /* ★[REFUND_SHORTFALL] 위약금이 받은 금액보다 큰 판 — 예약금만 낸 사람이 예식 직전에 취소.
         서버는 refund 를 Math.max(0, …) 로 깎아 0 을 준다. 9조② 위약금은 총 계약금액 기준이라
         그 사람은 0 원을 받는 게 아니라 **차액을 낸다.** 이 줄이 빠지면 도우미가
         「환불은 0원입니다」로 단정하고, 더 내야 한다는 말은 어디에도 없다. */
      short: mk({ paid: 300000, fitCount: 0, fitDeduct: 0, needCount: false,
        penalty: 1470000, rate: 0.7, rule: '위약금 70%(9조)', refund: 0, dd: 0, asOf: '2026-08-11' })
    };
  });
  if (!/840,000원/.test(rs.normal) || !/서버가 계약서/.test(rs.normal))
    bad.push(`상담 도우미 상태에 환불 견적이 안 실린다 — 도우미가 「사람이 확인해야」로 되돌아간다: ${rs.normal.slice(0, 60) || '(빈 줄)'}`);
  if (!/산정 못 함/.test(rs.cant) || /\d{2,3},\d{3}원/.test(rs.cant))
    bad.push(`산정 못 하는 상태인데 금액이 실린다(추측 금지) — ${rs.cant.slice(0, 60) || '(빈 줄)'}`);
  if (rs.none) bad.push(`환불 견적이 없는데 줄이 선다 — ${rs.none.slice(0, 60)}`);
  /* ★[REFUND_SHORTFALL] 두 방향을 다 쏜다 — 넘을 때 뜨는가, 안 넘을 때 안 뜨는가.
     한 방향만 쏘면 「늘 뜨는 줄」도 통과한다(그러면 멀쩡한 고객에게 겁을 준다). */
  if (!/위약금이 받은 금액보다 큽니다/.test(rs.short))
    bad.push(`위약금이 받은 금액보다 큰데 「환불 0원」만 넘긴다 — 도우미가 「더 내실 것 없다」로 답한다 [REFUND_SHORTFALL]: ${rs.short.slice(0, 70) || '(빈 줄)'}`);
  if (/위약금이 받은 금액보다 큽니다/.test(rs.normal))
    bad.push(`위약금이 받은 금액보다 작은데 초과 경고가 뜬다(헛경고) [REFUND_SHORTFALL]`);

  /* ★[ASK_SENDS 2026-08-11] 단추가 「상담 도우미에 물어보기」라고 말한다 — **정말 물어보는가.**
     ★왜 재나 — 이 자리는 두 가지로 조용히 죽는다.
       ① 공개 API 이름이 어긋나면 단추가 통째로 「카카오톡으로 물어봐 주세요」로 바뀐다.
          실제로 내가 처음 판에서 전역 이름을 틀려 네 경우 전부 「없음」이 나온 적이 있다.
       ② API 는 있는데 질문이 안 실리면 **빈 상자만 열린다.** 화면은 멀쩡하고, 단추 라벨만 거짓이 된다.
     ★하니스를 다시 적지 않는다 — 이 파일에 손으로 옮겨 적은 코드는 세 번 제품과 달랐다.
       그래서 **실제 mypage.html 의 그 자리 코드를 떼어 와서 그대로 돌린다**(nightly-note-table 과 같은 수법).
       지어내는 것은 단추 한 개뿐이고, 그 모양도 mypage.html 2682행 그대로다.
       원장 전체를 지어내지 않는다 — 이 파일이 거절하는 「허구 확인」이 되지 않게. */
  const ask = await h.page.evaluate(() => {
    const out = { api: null, sliced: false, spilled: false, unmatched: false, sliceLines: 0, q: '', kakao: false, wired: false, sent: '', sentMs: -1 };
    out.api = (() => { const A = window.MEAdvisor;
      return { has: !!A, available: !!(A && A.available), ask: !!(A && typeof A.ask === 'function') }; })();
    const src = [...document.querySelectorAll('script:not([src])')].map((s) => s.textContent).join('\n');
    /* ★★[SLICE_WIDTH_READ 2026-08-11 실측 · ★15 재발] 닫는 줄의 들여쓰기를 **박지 않는다.**
       처음 판은 `\n {2}\}, 0\);` 로 2칸을 박아 뒀다. ★15 의 옛 `^          }$`(10칸 고정)와 같은 실수다.
       ★실제로 넘쳐 봤다 — 이 덩이의 닫는 줄을 4칸으로 재정렬(정당한 정리)하고 뒤쪽에 2칸
         `}, 0);` 로 끝나는 평범한 덩이를 하나 두니, 그물이 **그 사이를 통째로 삼켰다.**
         그리고 아래 eval 이 삼킨 남의 코드를 **실행했다.** 검사는 「코드 떼옴=true · 눌림=true」로
         조용히 초록이었다. 지금 안 터지는 유일한 이유는 이 파일에 그런 줄이 **하나뿐**이라서다 — 운이다.
       ★그래서 ★15 의 고침 셋을 그대로 옮긴다:
         ①폭을 **첫 줄에서 읽는다** ②넘치면 섞일 것(다른 setTimeout 머리)을 그물로 본다
         ③조각의 **마지막 줄이 닫는 줄인지** 본다. ②는 목록이라 새는 날이 오고, ③은 목록이 없다. */
    const head = src.match(/^([ \t]*)setTimeout\(function\(\)\{\s*\n?\s*var _ra = \$\('mp_refundAsk'\);/m);
    if (!head) return out;
    const ind = head[1];                                        // ← 박지 않고 읽는다
    const start = src.indexOf(head[0]);
    /* ★★★[SLICE_PAREN_MATCH 2026-08-12 실측 · 들여쓰기로 재는 것을 그만둔다]
       여기서 끝을 **들여쓰기로 찾지 않는다.** 괄호를 맞춰 찾는다.

       ★왜 그만두나 — 들여쓰기 그물을 세 판 만들었고 셋 다 구멍이 있었다.
         ①닫는 폭을 2칸으로 박음        → 정당한 재정렬에 넘쳤다(SLICE_WIDTH_READ 가 고침)
         ②「마지막 줄이 닫는 줄인가」   → **구조상 늘 참**이라 죽은 그물이었다(코워크가 찾음)
         ③「안쪽은 머리보다 깊다」      → 남의 덩이 **머리를 더 깊게** 쓰면 지나간다(실측)
           재현: 제 닫는 줄 4칸 + 뒤에 `    setTimeout(function(){ … \n  }, 0);`
                 → 880자·19줄(정상 815자·16줄)을 삼켰는데 그물 셋 다 초록. eval 이 실행했다.
       ★들여쓰기는 **글의 모양**이고 범위는 **문법**이다. 모양으로 문법을 흉내 내는 한
         다음 구멍은 또 생긴다. 그래서 자를 바꾼다 — 줄자가 아니라 괄호를 센다.
       ★문자열·주석 안의 괄호는 세지 않는다. 못 맞추면 **통과가 아니라 「못 정했다」**로 붉는다. */
    const oi = src.indexOf('(', start);                         // setTimeout 의 여는 괄호
    let d = 0, st = 0, endAt = -1;                              // st: 0평문 1'  2"  3`  4//  5/* */
    for (let i = oi; i < src.length; i++) {
      const c = src[i], n = src[i + 1], p = src[i - 1];
      if (st === 0) {
        if (c === '/' && n === '/') { st = 4; i++; continue; }
        if (c === '/' && n === '*') { st = 5; i++; continue; }
        if (c === "'") { st = 1; continue; }
        if (c === '"') { st = 2; continue; }
        if (c === '`') { st = 3; continue; }
        if (c === '(') d++;
        else if (c === ')') { d--; if (d === 0) { endAt = i; break; } }
      } else if (st === 4) { if (c === '\n') st = 0; }
      else if (st === 5) { if (c === '*' && n === '/') { st = 0; i++; } }
      else if (st === 1) { if (c === '\\') i++; else if (c === "'") st = 0; }
      else if (st === 2) { if (c === '\\') i++; else if (c === '"') st = 0; }
      else if (st === 3) { if (c === '\\') i++; else if (c === '`') st = 0; }
      if (p === undefined) continue;                            // (p 는 위 분기에서 안 쓰지만 형태를 남겨 둔다)
    }
    if (endAt < 0) { out.unmatched = true; return out; }         // 못 맞췄으면 통과가 아니다
    const semi = src[endAt + 1] === ';' ? 1 : 0;
    const slice = src.slice(start, endAt + 1 + semi);
    /* ★맞춰 낸 끝이 **정말 그 setTimeout 의 끝인가** — 괄호로 찾은 자리라 이 확인은 뜻이 있다.
       (들여쓰기로 자른 뒤 「마지막 줄이 닫는 줄인가」를 묻던 옛 ②와 다르다. 그건 늘 참이었다.) */
    if (!/\}\s*,\s*0\s*\)\s*;?$/.test(slice)) { out.spilled = true; return out; }
    if ((slice.match(/mp_refundAsk/g) || []).length !== 1) { out.spilled = true; return out; }
    /* ②명령 그물 — 이 덩이 안에 **또 다른 setTimeout 머리**가 같은/바깥 들여쓰기로 있으면 넘친 것이다.
       ★괄호 맞추기가 범위를 정한 뒤라 이건 **덤**이다. 남겨 두는 이유는 하나 —
         괄호 맞추기가 언젠가 정규식 리터럴 같은 것에 걸려 헛디디면 여기서 한 번 더 걸린다.
         (지우지 말 것. 다만 「이게 막고 있다」고 적지도 말 것 — 지금 막는 것은 괄호다.) */
    const spill = new RegExp('\\n' + (ind || '') + '[ \\t]{0,1}(setTimeout|function|var (?!_ra))', 'g');
    if (spill.test(slice.slice(head[0].length))) { out.spilled = true; return out; }
    /* ★★③깊이 그물 [SLICE_DEPTH_NET 2026-08-12 실측] — 목록이 없어 일반적이다.
         **머리와 닫는 줄 사이의 모든 줄은 머리보다 깊게 들여쓰여 있다.**
       ★옛 ③(「마지막 줄이 그 닫는 줄인가」)은 **구조상 늘 참이었다.** slice 를 바로 그
         닫는 줄로 잘라 냈으니(indexOf → slice) 마지막 줄은 언제나 그것이다.
         넘친 판에서도 참이었다 — 실측: 닫는 줄을 4칸으로 정리하고 뒤에 2칸 덩이를 하나 두니
         **880자·19줄**(정상 16줄)을 삼켰는데도 마지막 줄은 그대로 '  }, 0);' 였다.
         즉 ③은 아무것도 막지 못하는 죽은 그물이었고, 보호는 전부 ②(목록 그물) 하나에 얹혀 있었다.
         ②는 「목록이라 새는 날이 온다」고 그 자리에 스스로 적어 둔 그물이다.
       ★그래서 **자른 자리**가 아니라 **안쪽 모양**을 본다 — 자른 자리를 다시 확인하는 것은
         내가 방금 한 일을 확인하는 것이지 조각을 확인하는 게 아니다.
         넘치면 남의 덩이의 머리 줄(머리와 같은 깊이)이 반드시 섞여 들어온다. 목록이 없다.
       (이 파일은 공백 들여쓰기다 — 탭이 섞이면 길이 비교가 거칠어지니 그때는 폭을 정규화할 것) */
    const lines = slice.split('\n');
    const inner = lines.slice(1, -1).filter((l) => l.trim());
    if (inner.some((l) => l.match(/^[ \t]*/)[0].length <= ind.length)) { out.spilled = true; return out; }
    const m = [slice];
    out.sliced = true;
    out.sliceLines = lines.length;
    const qm = m[0].match(/\.ask\('([^']+)'\)/);
    out.q = qm ? qm[1] : '';
    const host = document.createElement('div');
    host.innerHTML = '<button type="button" class="led-asklink" id="mp_refundAsk">상담 도우미에 물어보기</button>';
    document.body.appendChild(host);
    (0, eval)(m[0]);                          // 떼어 온 진짜 코드
    return new Promise((res) => setTimeout(() => {
      out.kakao = /카카오톡으로 물어봐 주세요/.test(host.textContent);
      const b = document.getElementById('mp_refundAsk');
      out.wired = !!(b && typeof b.onclick === 'function');
      if (out.wired) b.click();
      /* ★★[SENT_POLL 2026-08-12 실측 · ★11-b 를 우리가 밟았다] **한 시각에 한 번 보지 않는다.**
         옛 판은 「단추 120ms + ask() 안의 320ms → 넉넉히 900ms」로 **한 순간만** 봤다.
         ★실측 — 따뜻한 판에서 거품은 359·359·358ms 에 뜬다(여유 540ms). 그런데
           **차가운 판(브라우저 첫 기동) 첫 회에서 한 번 붉었다** — 「상자에 실린 말=없음」·exit 1.
           바로 다음 다섯 회는 전부 통과. 즉 제품이 아니라 **자가 흔들린 것**이다.
         ★야간 잡이 바로 그 차가운 판이다. GitHub Actions 는 매번 크로미움을 처음 띄운다.
           실험실에서만 나는 흔들림이 아니라 **운영에서 나는 쪽**의 흔들림이다.
         ★이 문서(목록 11-b)에 「정착 전에 잰 값은 값이 아니다 · 한 번 찍은 좌표는 좌표가 아니다」라고
           적어 두고, 그 글을 쓴 자리에서 한 순간만 보는 자를 만들었다. 늑대를 헛으로 부르는 검사는
           다음 진짜 늑대 때 아무도 안 본다(★9) — 그래서 고친다.
         ★느슨하게 만드는 것이 아니다. 안 뜨면 여전히 붉는다. 다만 **뜰 때까지 기다렸다가** 판정한다. */
      const t0 = performance.now();
      const look = () => [...document.querySelectorAll('.me-adv-msg.me')].map((e) => e.textContent).join(' | ');
      const tick = () => {
        const seen = look();
        if (seen || performance.now() - t0 > 6000) {      // 떴거나 · 6초까지 안 뜨면 그대로 판정
          out.sent = seen;
          out.sentMs = Math.round(performance.now() - t0);
          return res(out);
        }
        setTimeout(tick, 25);
      };
      tick();
    }, 60));
  });
  if (!ask.api.has || !ask.api.available || !ask.api.ask)
    bad.push(`상담 도우미 공개 API 가 없다 (있음=${ask.api.has} available=${ask.api.available} ask=${ask.api.ask}) — 단추가 카카오톡 안내로 바뀐다 [ASK_SENDS]`);
  /* ★[SLICE_WIDTH_READ] 넘친 것과 못 떼어 온 것을 **다른 말로** 알린다 —
     둘 다 「못 떼어 왔다」로 뭉치면, 넘쳐서 남의 코드를 실행한 판을 사람이 정규식 탓으로 읽고 넓히려 든다. */
  if (ask.unmatched)
    bad.push(`떼어 올 범위를 **괄호로 못 맞췄다** — 통과가 아니라 못 정한 것이다(정규식 리터럴 같은 것에 걸렸을 수 있다) [SLICE_PAREN_MATCH]`);
  else if (ask.spilled)
    bad.push(`떼어 온 조각이 그 덩이 **밖으로 넘쳤다** — 아래 eval 이 남의 코드를 실행할 뻔했다(★15). 그물을 넓히지 말고 그 덩이의 닫는 줄부터 확인할 것 [ASK_SENDS]`);
  else if (!ask.sliced)
    bad.push(`mypage.html 에서 그 자리 코드를 떼어 오지 못했다 — 그물이 헛돌았다(코드가 바뀌었으면 위 정규식을 고칠 것) [ASK_SENDS]`);
  else if (!ask.q)
    bad.push(`단추가 보낼 **질문 문구가 없다** — 빈 상자만 열린다. 라벨은 「물어보기」인데 [ASK_SENDS]`);
  /* ★질문은 중립이라야 한다. 이 자리에서 금액 상자를 뺀 이유가 「열어볼 때마다 취소하고 싶어진다」였다.
     한 손으로 그 이유를 지우면서 다른 손으로 취소를 선언하게 두면 앞뒤가 안 맞는다. */
  if (ask.q && /취소하고 싶|해지하고 싶|환불해 주세요|환불해주세요/.test(ask.q))
    bad.push(`질문이 취소를 **선언**한다 — 기준을 묻는 말이어야 한다: 「${ask.q}」 [ASK_SENDS]`);
  if (ask.kakao)
    bad.push(`도우미가 있는데도 단추가 카카오톡 안내로 바뀐다 — 분기 조건이 실물과 어긋났다 [ASK_SENDS]`);
  if (ask.sliced && !ask.wired)
    bad.push(`단추에 눌림이 안 붙었다 — 눌러도 아무 일도 안 일어난다 [ASK_SENDS]`);
  if (ask.q && !ask.sent.includes(ask.q))
    bad.push(`눌렀는데 그 질문이 상자에 안 실렸다 — 빈 상자만 열린다. 실린 것: 「${ask.sent || '(없음)'}」 [ASK_SENDS]`);

  console.log(`━━ mypage.html @390  로그인 화면=${dom.login} · 보이는 글 ${r.visible.length}자 · 가로스크롤 ${r.scrollsX}`);
  console.log(`   [ASK_SENDS] 공개 API=${ask.api.has && ask.api.available && ask.api.ask} · 코드 떼옴=${ask.sliced} · 눌림=${ask.wired} · 상자에 실린 말=「${ask.sent || '없음'}」 (${ask.sentMs}ms 만에 · 6000ms 까지 기다린다) [SENT_POLL]`);
  console.log(`   완료 행 접기 .trk-fold ${dom.fold}개(0이어야) · 저장 표시 짜임 ${dom.busy}개(1 이하) · JS 오류 ${r.errors.length}`);
  console.log(`   [SHELL_SKELETON] 진짜 제작 트랙을 빈 객체로 그려 봄 — 트랙 ${sk.trk}줄 · 폐지분 .trk-fold ${sk.fold}개(0이어야)`);
  /* [FOLD_ALIVE_CANT_LOOK] 살아 있는 청첩장 접힘은 여기서 숫자로 말하지 않는다 — 위 주석 참고. */
  console.log(`   ☐ 청첩장 접힘(.done-fold)은 로그인 뒤에만 그려져 여기서 못 잽니다 — 원본 쪽은 merge-guard 가 셉니다`);
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
