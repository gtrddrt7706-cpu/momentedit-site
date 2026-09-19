// 관리자 화면 눈으로 확인 — admin.html을 실제 브라우저에 띄우고, 서버 응답을 '진짜 GAS 함수'로 답한다.
//   방식: script.google.com 요청을 가로채 요청 본문의 {fn,args}를 gas-lint 샌드박스의 실제 .gs 함수로 실행해 되돌려준다.
//         (고정 응답 목이 아니라 진짜 서버 로직 → 화면과 서버가 어긋나면 여기서 드러난다)
//   확인 대상: ①결제 카드 되돌리기 버튼 4종 + AC1B '중도금·잔금 한 번에 취소' 콤보
//             ②강제 단계 변경 미리보기('예식일 임시고정(가예약) 해제' · '유지됨' 줄)
//             ③입금 확인 취소 모달(계획·경고 문구)
//   사용: node scripts/audit/admin-shot.mjs   → scripts/audit/_shots/*.png
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openWorld, kstAgo } from './_gasworld.mjs';
import { launchBrowser } from './_browser.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '../..');
const OUT = path.join(HERE, '_shots');
const PORT = 8123;

let fail = 0;
const ok = (cond, label, detail) => {
  if (cond) console.log('  ✅ ' + label);
  else { fail++; console.log('  ❌ ' + label + (detail !== undefined && detail !== '' ? ' — ' + detail : '')); }
};

const { G, world } = openWorld();

const REC = JSON.stringify({
  가예약: { eventId: 'EV123', date: '2026-10-26', status: '승인', expires: '2026-12-01' },
  시착: '2026-07-01', 계약: '2026-07-02',
  영수증기준일: { 예약금: kstAgo(1) },        // 계약금 확인 시각의 원천(_undoConfirmCore 차단 E 판정)
});
const NAMES = { 신랑이름: '김희준', 신부이름: '이미쿠', 연락처: '010-1234-5678', 이메일: 'test@example.com' };

// A) 잔금까지 확인된 '제작중' 고객 — 되돌리기 버튼 4종이 전부 보이고, 계약금 되돌리기는 차단 C에 걸리는 상태
const SEED_A = Object.assign({}, NAMES, {
  현재단계: '제작중', 계약상태: '서명완료', 계약총액: '2500000', 예식일: '2026-10-26',
  입금상태: '확인', 입금자명: '김희준', 입금완료신호: '2026-07-01 10:00',
  중도금상태: '확인', 중도금입금자명: '김희준', 중도금확인일시: kstAgo(2),
  잔금상태: '확인', 잔금입금자명: '김희준', 잔금확인일시: kstAgo(2),
  시착동의상태: '동의완료', 시착동의일시: '2026-07-01 10:00',
  계약서발송일시: '2026-07-01 12:00', 계약서명일시: '2026-07-02 08:00',
  동의기록: REC,
});
/* C) 계약서를 «아직 안 보낸» 고객 — 발송 대화상자를 열 수 있는 유일한 상태.
   contractReq(고객이 입력한 계약 정보)가 있어야 발송 버튼이 그려진다(admin.html 2210행). */
const SEED_SEND = Object.assign({}, NAMES, {
  현재단계: '상담완료', 계약상태: '', 계약총액: '', 예식일: '2026-12-20',
  시착동의상태: '동의완료', 시착동의일시: '2026-07-01 10:00',
  동의기록: JSON.stringify({
    시착: { at: '2026-07-01 10:00' },
    계약정보: { weddingDate: '2026-12-20', weddingTime: '12:20', groomBirth: '1990-01-01', brideBirth: '1992-01-01', groomAddr: '서울', brideAddr: '서울' }
  }),
});
// B) 방금 계약금을 확인한 '입금완료' 고객 — 계약금 되돌리기가 정상 통과하는 상태(모달 본문 확인용)
const SEED_B = Object.assign({}, NAMES, {
  현재단계: '입금완료', 계약상태: '서명완료', 계약총액: '2500000', 예식일: '2026-10-26',
  입금상태: '확인', 입금자명: '김희준', 입금완료신호: kstAgo(1),
  시착동의상태: '동의완료', 시착동의일시: '2026-07-01 10:00',
  계약서발송일시: '2026-07-01 12:00', 계약서명일시: '2026-07-02 08:00',
  동의기록: REC,
});
const SEED_BOOKING = {
  상태: '확정', 캘린더이벤트ID: 'BK1', 개인코드: 'ME-TEST',
  '성함(신랑)': '김희준', '성함(신부)': '이미쿠', 연락처: '010-1234-5678', 이메일: 'test@example.com',
  예식일자: '2026-10-26', 하객: '30', 상담일시: '2026-06-20 14:00',
};

// 요청마다 세계를 새로 만든다 — 화면에서 누른 미리보기가 이전 호출의 흔적을 물려받지 않게(부작용 감시 목적)
let SEED = SEED_A;
let W = null;
function freshWorld() { W = world(Object.assign({}, SEED), Object.assign({}, SEED_BOOKING)); return W; }

const HOME_STUB = {
  ok: true, name: '점검', queue: [], results: [], pipeline: {}, survey: [], blocks: [],
  stageFlow: {}, stageEx: [],
};

function serverCall(payload) {
  try {
    if (payload.action !== 'adminCall') return { ok: true };
    const fn = String(payload.fn || '');
    const args = payload.args || [];
    if (fn === 'adminHome') return HOME_STUB;
    freshWorld();
    if (typeof G[fn] !== 'function') return { ok: false, error: '없는 함수: ' + fn };
    const r = G[fn].apply(null, args);
    return r === undefined ? { ok: true } : r;
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }
}

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', SITE], { stdio: 'ignore' });
const shutdown = () => { try { server.kill(); } catch {} };
process.on('exit', shutdown);

async function main() {
  await new Promise((r) => setTimeout(r, 1500));
  fs.mkdirSync(OUT, { recursive: true });

  const eng = await launchBrowser();
  if (!eng) { console.log('브라우저 엔진 없음 — 건너뜀'); return; }
  const { page, errors } = await eng.newPage({ port: PORT, viewport: { width: Number(process.env.VW||420), height: 1000 } });

  // 고정 gasBody 대신 요청별 라우팅으로 덮어쓴다(진짜 서버 로직 연결)
  await page.route('**script.google.com**', async (route) => {
    let payload = {};
    try { payload = JSON.parse(route.request().postData() || '{}'); } catch {}
    const body = JSON.stringify(serverCall(payload));
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body });
  });
  await page.addInitScript(() => { localStorage.setItem('me_admin_token', 'SHOT-TOKEN'); });

  await page.goto(`http://localhost:${PORT}/admin.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  await page.evaluate(() => window.openDetail('ME-TEST', 'home'));
  await page.waitForTimeout(900);

  // ── ① 결제 카드 — 되돌리기 버튼 4종
  console.log('\n[SHOT-1] 결제 카드 · 입금 확인 취소 버튼 [ADM_AC1] [ADM_AC1B]');
  const payBtns = await page.evaluate(() => {
    const c = document.querySelector('.card[data-k="payment"]');
    if (!c) return null;
    return Array.from(c.querySelectorAll('[data-da]')).map((b) => ({ act: b.getAttribute("data-da"), label: (b.textContent || '').trim() }));
  });
  ok(!!payBtns, '결제 카드가 화면에 있다');
  const acts = (payBtns || []).map((b) => b.act);
  /* ★계약금은 이 픽스처(제작중 = 입금완료보다 앞선 단계)에서 **버튼이 없는 것이 정답**이다 —
     그 계약은 아래 SHOT-2A 가 «버튼 대신 사유 한 줄»로 검사한다. 여기서 다시 버튼을 기대하면
     두 검사가 서로 반대를 요구하게 된다(PR #562 이후 · 되돌리지 말 것). */
  ok(acts.indexOf('undoPay:계약금') === -1, '앞선 단계에선 계약금 되돌리기 버튼 없음(사유 줄은 2A에서 확인)', JSON.stringify(acts));
  ok(acts.indexOf('undoPay:중도금') !== -1, '중도금 되돌리기 버튼', JSON.stringify(acts));
  ok(acts.indexOf('undoPay:잔금') !== -1, '잔금 되돌리기 버튼', JSON.stringify(acts));
  ok(acts.indexOf('undoPay:중도금잔금') !== -1, '★AC1B 중도금·잔금 한 번에 취소 콤보 버튼', JSON.stringify(acts));
  const combo = (payBtns || []).find((b) => b.act === 'undoPay:중도금잔금');
  ok(combo && combo.label === '중도금·잔금 한 번에 취소', '콤보 버튼 라벨(전각 줄표 없음)', combo && combo.label);
  const payTexts = (payBtns || []).map((b) => b.label).join(' ');
  ok(payTexts.indexOf('—') === -1, '결제 카드 버튼 문구에 전각 줄표 없음');
  await shot(page, '.card[data-k="payment"]', '1-결제카드-되돌리기버튼.png');

  /* ── ②-A 앞선 단계에서는 «버튼이 아니라 이유 한 줄» (차단 C의 화면 쪽 계약)
     ★[UNDO_AHEAD_LINE 2026-08-29 점검] 이 검사는 옛 UI 를 기대해 크래시로 죽어 있었다 —
       «undoPay:계약금 버튼을 눌러 차단 모달이 뜨는지»를 봤는데, PR #562 가 그 버튼을
       **앞선 단계에서는 그리지 않기로** 바꿨다(admin.html «보이는데 안 되는 버튼은 없는
       버튼보다 나쁘다»). 제품 결정이 옳으므로 기대를 새 계약에 맞춘다.
     ★다만 «그냥 사라짐»은 막다른 길이라 안 된다 — 버튼이 없는 대신 **왜 안 되는지와
       무엇으로 정리하는지**가 화면에 남아 있는지까지 본다(설명이 사라지면 이 검사가 빨개진다). */
  console.log('\n[SHOT-2A] 앞선 단계(제작중) — 되돌리기 버튼 대신 사유 한 줄');
  const ahead = await page.evaluate(() => {
    const card = document.querySelector('.card[data-k="payment"]');
    return {
      acts: [...card.querySelectorAll('[data-act]')].map((b) => b.getAttribute('data-act')),
      gates: [...card.querySelectorAll('.gate')].map((g) => g.textContent.trim()).join(' | ')
    };
  });
  ok(ahead.acts.indexOf('undoPay:계약금') === -1, '앞선 단계에선 계약금 되돌리기 버튼을 그리지 않는다', JSON.stringify(ahead.acts));
  ok(/제작중/.test(ahead.gates) && /되돌릴 수 없어요/.test(ahead.gates), '★대신 왜 안 되는지가 한 줄로 남는다(막다른 길 금지)', ahead.gates.slice(0, 160));
  ok(/강제 단계 변경/.test(ahead.gates), '★무엇으로 정리하는지까지 알려 준다', ahead.gates.slice(0, 160));
  ok(ahead.gates.indexOf('—') === -1, '그 안내 문구에 전각 줄표 없음');
  await shot(page, '.card[data-k="payment"]', '2a-앞선단계-되돌리기불가-사유줄.png');

  // ── ②-B 정상 미리보기 모달 — 방금 확인한 '입금완료' 고객
  console.log('\n[SHOT-2B] 입금 확인 취소 모달 · 미리보기 계획');
  SEED = SEED_B;
  await page.evaluate(() => window.openDetail('ME-TEST', 'home'));
  await page.waitForTimeout(900);
  await clickAct(page, 'undoPay:계약금');
  const modal = await readModal(page);
  ok(/입금 확인을 되돌릴까요/.test(modal.text), '취소 모달이 떴다', modal.text.slice(0, 80));
  ok(modal.hasReason, '사유 입력칸(#upR)이 있다');
  ok(/계약금 · 확인/.test(modal.text) && /완료신호/.test(modal.text), '되돌아갈 상태가 계획으로 나온다', modal.text.slice(0, 200));
  ok(/현재단계/.test(modal.text) && /계약완료/.test(modal.text), '현재단계 역행이 미리 표시된다', modal.text.slice(0, 200));
  ok(/⚠/.test(modal.text), '주의 문구(notice)가 있다');
  ok(modal.text.indexOf('—') === -1, '모달 문구에 전각 줄표 없음');
  await shot(page, null, '2b-입금확인취소-모달.png');

  // 사유 없이 실행 → 막히는지(서버 도달 전 프론트 가드)
  await page.evaluate(() => {
    const y = Array.from(document.querySelectorAll('button')).filter((b) => (b.textContent || '').trim() === '입금 확인 취소' && b.offsetHeight).pop();
    if (y) y.click();
  });
  await page.waitForTimeout(300);
  const noReason = await readModal(page);
  ok(/사유를 입력/.test(noReason.text), '사유 없이 누르면 실행되지 않고 안내가 뜬다', noReason.text.slice(-80));
  ok(W && W.writes().length === 0, '★사유 없이 누른 시점까지 시트 쓰기 0건', W && String(W.writes().length));
  await closeModal(page);
  SEED = SEED_A;
  await page.evaluate(() => window.openDetail('ME-TEST', 'home'));
  await page.waitForTimeout(900);

  /* ── ②-C 계약서 발송 대화상자 — 예식 «시간» 칸 [SEND_TIME_REQ]
     서버가 시간 없는 발송을 막게 됐으므로(고객이 서명할 수 없는 계약서 방지), 화면에 고를 자리가
     반드시 있어야 한다. 칸이 없으면 관리자는 서버 거부만 보고 무엇을 해야 할지 모른다 —
     그 상태가 이 검사가 막으려는 것이다. */
  console.log('\n[SHOT-2C] 계약서 발송 대화상자 · 예식 시간 칸 [SEND_TIME_REQ]');
  SEED = SEED_SEND;
  await page.evaluate(() => window.openDetail('ME-TEST', 'home'));
  await page.waitForTimeout(900);
  const sendDlg = await page.evaluate(() => {
    const b = document.querySelector('[data-da="sendContract"]');
    if (!b) return { err: '발송 버튼이 없다' };
    b.click();
    const sel = document.getElementById('ctWedT');
    return {
      있나: !!sel,
      기본값: sel ? sel.value : null,
      보기: sel ? [...sel.options].map((o) => o.text).join(' / ') : null,
      라벨: sel && sel.closest('.field') ? sel.closest('.field').querySelector('label').textContent : null
    };
  });
  ok(sendDlg.있나 === true, '발송 대화상자에 예식 시간 선택칸이 있다', JSON.stringify(sendDlg));
  ok(sendDlg.기본값 === '12:20', '★고객이 요청한 슬롯이 기본으로 골라져 있다(손으로 다시 안 고르게)', sendDlg.기본값);
  ok(/오전|오후/.test(sendDlg.보기 || ''), '보기는 본예식 기준 표기(고객·계약서와 같은 말)', sendDlg.보기);
  ok(String(sendDlg.라벨 || '').indexOf('—') === -1, '그 칸 라벨에 전각 줄표 없음', sendDlg.라벨);
  await shot(page, '#adm_modal .modal, .modal', '2c-계약서발송-예식시간칸.png');
  await closeModal(page);
  SEED = SEED_A;
  await page.evaluate(() => window.openDetail('ME-TEST', 'home'));
  await page.waitForTimeout(900);

  // ── ③ 강제 단계 변경 미리보기
  console.log('\n[SHOT-3] 강제 단계 변경 미리보기 [ADM_AC3]');
  const before = await page.evaluate(() => !!document.getElementById('fStage'));
  ok(before, '고급(위험) 영역에 단계 선택칸(#fStage)이 있다');
  await page.evaluate(() => {
    const t = document.getElementById('advToggle'); if (t) t.click();
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const s = document.getElementById('fStage');
    s.value = '신청접수';
    s.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForTimeout(900);
  const prev = await page.evaluate(() => {
    const b = document.getElementById('fPrev');
    return { text: b ? (b.innerText || '') : '(없음)', goDisabled: !!(document.getElementById('fGo') || {}).disabled };
  });
  ok(/비워/.test(prev.text) || /초기화/.test(prev.text), '미리보기에 비워질 항목이 나온다', prev.text.slice(0, 100));
  ok(/가예약/.test(prev.text), '★예식일 임시고정(가예약) 해제 줄이 보인다', prev.text.slice(0, 200));
  ok(/유지/.test(prev.text), '★ROLLBACK_KEEP_PAID "유지됨" 줄이 보인다', prev.text.slice(0, 200));
  ok(prev.goDisabled, '동의 체크 전에는 실행 버튼이 잠겨 있다');
  ok(prev.text.indexOf('—') === -1, '미리보기 문구에 전각 줄표 없음');
  ok(W && W.holdDeletes().length === 0, '★미리보기만으로 캘린더 해제가 일어나지 않는다(AC3-BUG 재발 없음)', W && String(W.holdDeletes().length));
  ok(W && W.writes().length === 0, '★미리보기만으로 시트 쓰기가 없다', W && String(W.writes().length));
  // [ADM_GATE_CHK] 동의 체크박스가 '체크박스로 보이는지' — .adv-body input(width:100%·min-height:46px·appearance:none)에
  //   특이도로 지면 빈 대형 상자가 돼 관리자가 실행 버튼이 왜 잠겨 있는지 알 수 없다.
  const gate = await page.evaluate(() => {
    const el = document.getElementById('fAgree');
    if (!el) return null;
    const r = el.getBoundingClientRect(), s = getComputedStyle(el);
    return { w: Math.round(r.width), h: Math.round(r.height), ap: s.appearance || s.webkitAppearance };
  });
  ok(!!gate, '동의 체크박스(#fAgree)가 렌더된다');
  ok(gate && gate.w <= 24 && gate.h <= 24, '★동의 체크박스가 네이티브 크기(24px 이하)로 보인다', gate && `${gate.w}x${gate.h}`);
  ok(gate && gate.ap !== 'none', '★동의 체크박스 appearance가 none이 아니다(체크 표시가 보인다)', gate && String(gate.ap));
  await shot(page, '#advBody', '3-강제단계변경-미리보기.png');

  // ── ④ 상세 전체(눈으로 훑기)
  await page.evaluate(() => window.scrollTo(0, 0));
  await shot(page, null, '4-고객상세-전체.png', true);

  console.log('\n[JS 오류]');
  const real = errors.filter((e) => !/favicon|net::ERR/.test(e));
  ok(real.length === 0, '콘솔 오류 0건', real.slice(0, 3).join(' | '));

  await page.close();
  await eng.close();
}

async function clickAct(page, act) {
  await page.evaluate((a) => {
    const b = document.querySelector('.card[data-k="payment"] [data-da="' + a + '"]');
    if (!b) throw new Error('버튼 없음: ' + a);
    b.click();
  }, act);
  await page.waitForTimeout(700);
}
// 열려 있는 모달의 본문 텍스트 — 모달 래퍼 id를 모르니 '되돌' 문구를 가진 최상위 오버레이를 찾는다
async function readModal(page) {
  return page.evaluate(() => {
    const cands = Array.from(document.querySelectorAll('body > div')).filter((d) => {
      const s = getComputedStyle(d);
      return (s.position === 'fixed') && d.offsetHeight > 0 && (d.innerText || '').trim();
    });
    const el = cands[cands.length - 1];
    return { text: el ? (el.innerText || '') : '(모달 없음)', hasReason: !!document.getElementById('upR') };
  });
}
async function closeModal(page) {
  await page.evaluate(() => {
    try { window.closeModal(); } catch (e) {}
    Array.from(document.querySelectorAll('button')).forEach((b) => { if (['닫기', '취소', '확인'].indexOf((b.textContent || '').trim()) !== -1 && b.offsetHeight) b.click(); });
  });
  await page.waitForTimeout(400);
}

async function shot(page, sel, name, full) {
  const file = path.join(OUT, name);
  try {
    if (sel) {
      const el = await page.$(sel);
      if (el) { await el.screenshot({ path: file }); console.log('  📸 ' + name); return; }
    }
    await page.screenshot({ path: file, fullPage: !!full });
    console.log('  📸 ' + name);
  } catch (e) { console.log('  (스크린샷 실패 ' + name + ' — ' + e.message + ')'); }
}

main().then(() => {
  shutdown();
  console.log(`\n결과 — 실패 ${fail}건` + (fail ? '' : ' (전부 통과)'));
  process.exit(fail ? 1 : 0);
}).catch((e) => {
  shutdown();
  console.error(e);
  process.exit(1);
});
