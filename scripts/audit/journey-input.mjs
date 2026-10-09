#!/usr/bin/env node
/* ★★[JOURNEY_INPUT 2026-10-09 점검 C-9 · C-16 · C-20 · D-1] 고객 여정 입력 · 요청을 «진짜 .gs 함수»로 불러 잰다(_gasworld · 시트 쓰기는 가로챈다).
   C-9  [BIRTH_REAL]      계약 요청 생년월일 — 달력에 없는 날(2/31 · 4/31 · 평년 2/29) · 1930년 전 · 만 18세 안 됨은 거절 · 경계 날짜는 받는다 · 거절이면 아무것도 쓰지 않는다
   C-16 [CR_NUM_VALID]    현금영수증 번호 — 휴대폰(01x · 10~11자리) · 사업자번호(10자리)만 · 빈 값은 자진발급 · 받는 곳 여섯이 같은 규칙 · 이미 저장된 값은 건드리지 않는다
   C-20 [CT_RESEND_ONCE]  계약서 재발송 요청 — 24시간 안 다시 누름은 «이미 요청함»(알림 한 번) · getMyState 에 contractResendAt · 24시간이 지나면 다시 · 마이페이지 단추(같은 이름 · 같은 높이 · 흐리게 · 아래 한 줄)
   D-1  [APPLY_A_RETIRE]  /exec 기본 화면은 새 신청서 안내 한 장 · 옛 화면 A 의 제출(submitApplication) · action 없는 doPost 는 같은 안내로 거절 · 가입 길(signup)은 그대로
   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { openWorld, kstAheadWeekday } from './_gasworld.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let bad = 0;
const ok = (c, m, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + String(d).slice(0, 240)}`); if (!c) bad++; };
let G, world;
try { ({ G, world } = openWorld()); } catch (e) { console.log('━━ journey-input — GAS 세계를 못 만들었습니다 · 재지 못했습니다: ' + e.message); process.exit(2); }
for (const fn of ['handleRequestContract', '_birthBad', '_crOk', '_crReject', 'handleSaveCashReceipt', 'handlePaymentSignal', 'handleMidSignal', 'handleBalanceSignal', '_saveCashReceipt',
  'handleRequestContractResend', '_ctResendAt', 'handleGetMyState', 'serveApplyA', 'submitApplication', 'doPost', 'submitSchedule']) {
  if (typeof G[fn] !== 'function') { console.log(`━━ journey-input — ${fn} 이 없습니다 · 재지 못했습니다`); process.exit(2); }
}
const props = G.PropertiesService.getScriptProperties();
const WED = kstAheadWeekday(70);
const kstYmd = (d) => { const k = new Date(d.getTime() + 9 * 3600e3); return k.getUTCFullYear() + '-' + String(k.getUTCMonth() + 1).padStart(2, '0') + '-' + String(k.getUTCDate()).padStart(2, '0'); };
const T = kstYmd(new Date());
const yrs = (n) => (+T.slice(0, 4) - n) + T.slice(4);   // 오늘 한국 날짜의 n년 전
const plus1 = (ymd) => { const d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };
let notes = [];
function mk(cells, booking) {
  const w = world(Object.assign({ 현재단계: '상담완료', 계약상태: '', 동의기록: '{}', 신랑이름: '김신랑', 신부이름: '이신부' }, cells || {}), booking === null ? null : Object.assign({ 상태: '확정', 입금확인: '확인' }, booking || {}));
  G.resolveSession = () => ({ ok: true, row: G.findCustomerByCode() });
  G._weddingSlotTaken = () => false; G._holdCalCreate = () => {}; G._holdCalDelete = () => {};
  G._recordHandler = () => {}; notes = [];
  G.notifyKakao = (k) => { notes.push(k); }; G.notifyStudio = (t) => { notes.push('studio:' + t); };
  G.lockBusySignal = () => {};
  return w;
}
const rec = (w) => { try { return JSON.parse(w.C['동의기록'] || '{}'); } catch (e) { return {}; } };
const call = (fn) => { try { return fn(); } catch (e) { return { threw: e.message }; } };
const INFO = (o) => Object.assign({ weddingDate: WED, weddingTime: '12:20', groomBirth: '1990-01-01', brideBirth: '1991-02-02', groomAddr: '서울 1', brideAddr: '서울 2', consent: true }, o || {});
const reqC = (w, o) => call(() => G.handleRequestContract({ token: 't', info: INFO(o) }));

console.log('━━ C-9 [BIRTH_REAL] 계약 요청 생년월일');
{ let w = mk(); let r = reqC(w); ok(r && r.ok === true, '보통 날짜(1990-01-01 · 1991-02-02) → 받는다', JSON.stringify(r)); ok(rec(w).계약정보 && rec(w).계약정보.groomBirth === '1990-01-01', '받은 값이 계약정보에 남는다', w.C['동의기록']); }
for (const [v, re, why] of [['1990-02-31', /신랑 생년월일이 달력에 없는 날짜예요/, '2/31'], ['1990-04-31', /달력에 없는 날짜/, '4/31'], ['2023-02-29', /달력에 없는 날짜/, '평년 2/29'],
  ['1929-12-31', /신랑 생년월일을 다시 확인해 주세요\.$/, '1930년 전'], [plus1(yrs(18)), /만 18세 이상만 계약할 수 있어요/, '만 18세 하루 전'], ['2090-01-01', /만 18세/, '미래'], ['1990-1-1', /다시 골라 주세요/, '꼴이 틀림']]) {
  const w = mk(); const r = reqC(w, { groomBirth: v });
  ok(r && r.ok === false && re.test(r.error || '') && w.writes().length === 0 && notes.length === 0, `${why}(${v}) → 거절 · 아무것도 쓰지 않음`, JSON.stringify(r) + ' writes ' + w.writes().length);
}
{ const w = mk(); const r = reqC(w, { brideBirth: '1995-06-31' }); ok(r && r.ok === false && /^신부 생년월일이 달력에 없는 날짜예요/.test(r.error || ''), '신부 6/31 → «신부» 로 거절', JSON.stringify(r)); }
for (const [v, why] of [['2000-02-29', '윤년 2/29'], ['1930-01-01', '1930-01-01(경계)'], [yrs(18), '오늘 만 18세(경계)']]) {
  const w = mk(); const r = reqC(w, { groomBirth: v }); ok(r && r.ok === true, `${why} → 받는다`, JSON.stringify(r));
}

console.log('━━ C-16 [CR_NUM_VALID] 현금영수증 번호');
const GOOD = [['01012345678', '01012345678', '휴대폰 11자리'], ['0111234567', '0111234567', '휴대폰 10자리(011)'], ['010-1234-5678', '01012345678', '줄표'], ['+82 10-1234-5678', '01012345678', '+82'], ['2208612345', '2208612345', '사업자번호 10자리'], ['220-86-12345', '2208612345', '사업자번호 줄표']];
const BAD = [['123', '세 자리'], ['0212345678', '지역 번호'], ['0201234567', '0 으로 시작하는 10자리'], ['9001011234567', '13자리'], ['012345678901234567', '18자리'], ['0101234567890', '13자리 휴대폰 꼴']];
for (const [v, want, why] of GOOD) ok(G._crOk(G._crNum(v)) && G._crNum(v) === want, `${why}(${v}) → ${want} 받음`, G._crNum(v));
for (const [v, why] of BAD) ok(!G._crOk(G._crNum(v)), `${why}(${v}) → 거절`, G._crNum(v));
ok(G._crReject('') === null && G._crReject(null) === null, '빈 값은 거절이 아니다(자진발급)');
{ const w = mk(); const r = reqC(w, { cashReceipt: '123' }); ok(r && r.ok === false && /휴대폰 번호나 사업자번호/.test(r.error || '') && w.writes().length === 0, '① 계약 요청 «123» → 거절 · 아무것도 쓰지 않음', JSON.stringify(r)); }
{ const w = mk(); const r = reqC(w, { cashReceipt: '+82 10-1234-5678' }); ok(r && r.ok && rec(w).현금영수증 === '01012345678', '① 계약 요청 «+82 10-…» → 010 으로 저장', w.C['동의기록']); }
{ const w = mk(); const r = reqC(w, { cashReceipt: '' }); ok(r && r.ok && !rec(w).현금영수증, '① 계약 요청 빈 값 → 저장하지 않음(자진발급)', w.C['동의기록']); }
{ const w = mk({ 동의기록: JSON.stringify({ 현금영수증: '01099998888' }) }); let r = call(() => G.handleSaveCashReceipt({ token: 't', cashReceipt: '12345' }));
  ok(r && r.ok === false && /사업자번호/.test(r.error || '') && rec(w).현금영수증 === '01099998888', '② 내 내역 저장 «12345» → 거절 · 저장된 번호 그대로', JSON.stringify(r) + ' ' + w.C['동의기록']);
  r = call(() => G.handleSaveCashReceipt({ token: 't', cashReceipt: '' })); ok(r && r.ok && rec(w).현금영수증 === '', '② 빈 값 → 등록 해제(종전 그대로)', JSON.stringify(r) + ' ' + w.C['동의기록']); }
{ const w = mk({ 계약상태: '서명완료', 현재단계: '계약완료', 입금상태: '대기' }); const r = call(() => G.handlePaymentSignal({ token: 't', payerName: '김신랑', cashReceipt: '1234' }));
  ok(r && r.ok === false && /사업자번호/.test(r.error || '') && w.writes().length === 0, '③ 계약금 입금 신호 «1234» → 거절 · 신호 · 입금자명도 쓰지 않음', JSON.stringify(r) + ' writes ' + w.writes().length); }
{ const w = mk({ 계약상태: '서명완료', 현재단계: '입금완료', 중도금상태: '' }); const r = call(() => G.handleMidSignal({ token: 't', payerName: '김신랑', cashReceipt: '0212345678' }));
  ok(r && r.ok === false && w.writes().length === 0, '④ 중도금 신호 지역 번호 → 거절', JSON.stringify(r)); }
{ const w = mk({ 계약상태: '서명완료', 현재단계: '제작중', 잔금상태: '' }); const r = call(() => G.handleBalanceSignal({ token: 't', payerName: '김신랑', cashReceipt: '99' }));
  ok(r && r.ok === false && w.writes().length === 0, '⑤ 잔금 신호 «99» → 거절', JSON.stringify(r)); }
{ const w = mk({ 계약상태: '서명완료', 현재단계: '입금완료', 중도금상태: '' }); const r = call(() => G.handleMidSignal({ token: 't', payerName: '김신랑', cashReceipt: '2208612345' }));
  ok(r && r.ok && rec(w).현금영수증 === '2208612345', '④ 중도금 신호 사업자번호 → 받고 저장', JSON.stringify(r) + ' ' + w.C['동의기록']); }
{ const w = mk(); G._saveCashReceipt(G.findCustomerByCode(), G.getCustomersSheet(), G.buildHeaderIndex(G.getCustomersSheet()), '777'); ok(w.writes().length === 0, '받침 — _saveCashReceipt 는 틀린 꼴을 저장하지 않는다', JSON.stringify(w.writes())); }
{ const w = mk({ 동의기록: JSON.stringify({ 현금영수증: '123' }) }); ok(G._cashReceiptOf(G.findCustomerByCode()) === '123' && w.writes().length === 0, '이미 저장된 값은 건드리지 않는다(읽기 그대로)', G._cashReceiptOf(G.findCustomerByCode())); }
{ const w = mk({}, { 상태: '시간선택완료', 선택날짜: '', 선택시간: '', 입금확인: '', 토큰: 'ctok', 신청일시: new Date() }); G.findRowByToken = () => ({ num: 2, get: (h) => (h in w.B ? w.B[h] : '') });
  G._IN_POST = true; const day = kstAheadWeekday(9); let th = ''; try { G.submitSchedule('ctok', day, '14:50', [], '', null, '777', '김신랑', 'bank', true); } catch (e) { th = e.message; }
  ok(/휴대폰 번호나 사업자번호/.test(th) && w.writes().length === 0, '⑥ 상담 신청(submitSchedule · 마이페이지 길) «777» → 거절 · 아무것도 쓰지 않음', th + ' writes ' + w.writes().length); G._IN_POST = false; }

console.log('━━ C-20 [CT_RESEND_ONCE] 계약서 재발송 요청');
{ const SENT_OLD = (() => { const d = new Date(Date.now() - 120 * 3600e3 + 9 * 3600e3); return d.toISOString().slice(0, 16).replace('T', ' '); })();
  const w = mk({ 현재단계: '계약완료', 계약상태: '발송', 계약서발송일시: SENT_OLD, 계약총액: 3300000 }); props.deleteProperty('CTRESEND_ME-TEST');
  const s0 = call(() => G.handleGetMyState({ token: 't' }));
  ok(s0 && s0.ok && s0.contractResendAt === '', '요청 전 — contractResendAt 빈 값', JSON.stringify(s0 && s0.contractResendAt));
  const r1 = call(() => G.handleRequestContractResend({ token: 't' })), n1 = notes.length;
  ok(r1 && r1.ok && !r1.already && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(r1.at || '') && n1 >= 1, '첫 요청 → ok · 시각 · 관리자 알림', JSON.stringify(r1) + ' notes ' + n1);
  const r2 = call(() => G.handleRequestContractResend({ token: 't' }));
  ok(r2 && r2.ok && r2.already === true && notes.length === n1, '24시간 안 다시 누름 → «이미 요청함» · 알림 다시 안 감', JSON.stringify(r2) + ' notes ' + notes.length);
  const s1 = call(() => G.handleGetMyState({ token: 't' }));
  ok(s1 && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(s1.contractResendAt || ''), 'getMyState 에 contractResendAt(한국 시각 · 새로고침해도 단추를 흐리게)', JSON.stringify(s1 && s1.contractResendAt));
  props.setProperty('CTRESEND_ME-TEST', String(Date.now() - 25 * 3600e3));
  const s2 = call(() => G.handleGetMyState({ token: 't' })), r3 = call(() => G.handleRequestContractResend({ token: 't' }));
  ok(s2 && s2.contractResendAt === '' && r3 && r3.ok && !r3.already && notes.length > n1, '24시간이 지나면 빈 값 · 다시 요청하면 알림이 간다', JSON.stringify({ at: s2 && s2.contractResendAt, r3, n: notes.length }));
  const w2 = mk({ 현재단계: '계약완료', 계약상태: '서명완료' }); const r4 = call(() => G.handleRequestContractResend({ token: 't' }));
  ok(r4 && r4.ok === false && /이미 서명이 완료된/.test(r4.error || ''), '서명완료면 종전대로 거절', JSON.stringify(r4)); void w; void w2; }

console.log('━━ D-1 [APPLY_A_RETIRE] 옛 신청서 화면 A');
{ const w = mk({}, null); G._LAST_INFO = null; call(() => G.doGet({ parameter: {} }));
  const li = G._LAST_INFO || {};
  ok(li.title === '신청서가 옮겨졌어요' && /신청은 momentedit\.kr 신청서에서 받아요/.test(li.body || '') && /href="https:\/\/www\.momentedit\.kr\/inquiry\.html"/.test(li.body || '') && /신청서 열기/.test(li.body || ''), '/exec 를 인자 없이 열면 새 신청서 안내 한 장 + 단추', JSON.stringify(li));
  const form = { groom: '가', bride: '나', phone: '01012345678', email: 'a@b.co', memo: '', detail: '', hp: '' };
  G._IN_POST = false; const keepOwner = G._ownerRunNow_; G._ownerRunNow_ = () => false; let th = '';
  try { G.submitApplication(form); } catch (e) { th = e.message; }
  ok(/신청은 momentedit\.kr 신청서에서 받아요 · https:\/\/www\.momentedit\.kr\/inquiry\.html/.test(th) && w.writes().length === 0, '옛 화면 A 의 제출 → 같은 안내로 거절(던짐 · 화면이 그 글을 보인다) · 시트에 안 씀', th + ' writes ' + w.writes().length);
  G._ownerRunNow_ = keepOwner;
  let sub = 0; const keepSA = G.submitApplication, keepJO = G.jsonOut; G.submitApplication = () => { sub++; return { ok: true }; }; G.jsonOut = (o) => o;
  const out = call(() => G.doPost({ postData: { contents: JSON.stringify({ groom: '가', bride: '나', phone: '010', email: 'a@b.co' }) } }));
  ok(out && out.ok === false && /신청서에서 받아요/.test(out.error || '') && out.moved === 'https://www.momentedit.kr/inquiry.html' && sub === 0, 'action 없는 doPost(옛 신청서 캐시) → 받지 않고 같은 안내', JSON.stringify(out) + ' sub ' + sub);
  G.submitApplication = keepSA; G.jsonOut = keepJO; G._IN_POST = false; }
{ const w = mk({}, null); G._IN_POST = true; G.makeToken = () => 'newtok'; let th = '';
  try { G.submitApplication({ groom: '가', bride: '나', phone: '01012345678', email: 'a@b.co', memo: '', detail: '', hp: '' }, 'ME1234'); } catch (e) { th = e.message; }
  ok(!th && w.writes().some((e) => e.h === '개인코드' && e.v === 'ME1234'), '가입 길(doPost signup → submitApplication)은 그대로 받는다', th || JSON.stringify(w.writes().slice(0, 3))); G._IN_POST = false; }

/* ── C-20 화면 — 마이페이지 «계약서 재발송 요청» 단추(브라우저가 있으면) ──
   ★발송 시각은 120시간 전 — 이 세계의 _parseKstStr 는 기계 시계(UTC)로 읽어 9시간 늦게 보므로 72시간 기한을 넉넉히 넘긴다 */
let measured = true;
try {
  const { launchBrowser } = await import('./_browser.mjs');
  const eng = await launchBrowser();
  if (!eng) { measured = false; console.log('skip 마이페이지 단추 — 브라우저 없음(재지 못한 것이지 결함이 아님)'); }
  else {
    const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8' }); r.end(fs.readFileSync(f)); });
    await new Promise((res) => srv.listen(0, res)); const port = srv.address().port;
    const SENT_OLD = (() => { const d = new Date(Date.now() - 120 * 3600e3 + 9 * 3600e3); return d.toISOString().slice(0, 16).replace('T', ' '); })();
    const state = (at) => { mk({ 현재단계: '계약완료', 계약상태: '발송', 계약서발송일시: SENT_OLD, 계약총액: 3300000 });
      if (at) props.setProperty('CTRESEND_ME-TEST', String(Date.now())); else props.deleteProperty('CTRESEND_ME-TEST');
      const d = G.handleGetMyState({ token: 't' }); return JSON.parse(JSON.stringify(d)); };
    for (const vw of [390, 1280]) {
      const { page, errors } = await eng.newPage({ port, viewport: { width: vw, height: 900 } });
      await page.goto(`http://localhost:${port}/mypage.html`, { waitUntil: 'load' }); await page.waitForTimeout(700);
      const look = () => page.evaluate(() => { const b = document.getElementById('mp_ctResend'), n = document.getElementById('mp_ctResendNote');
        return b ? { t: b.textContent.trim(), dis: b.getAttribute('aria-disabled'), cls: b.className, h: Math.round(b.getBoundingClientRect().height), lines: Math.round(b.getBoundingClientRect().height / parseFloat(getComputedStyle(b).lineHeight || '20')), note: n ? n.textContent.trim() : '', noteShown: !!(n && n.getClientRects().length) } : null; });
      // ① 요청 전(서버 값 없음)
      await page.evaluate((d) => { window.__ctResendJust = ''; renderMyPage(d); try { show('mypageView'); } catch (x) {} }, state(false)); await page.waitForTimeout(250);
      const a = await look();
      ok(a && a.t === '계약서 재발송 요청' && a.dis !== 'true' && !/cc-btn-wait/.test(a.cls) && !a.note, `${vw} ① 요청 전 — 단추가 켜져 있고 아래 줄이 없다`, JSON.stringify(a));
      // ② 눌렀다 — 같은 이름 · 같은 높이 · 흐리게 · 아래 한 줄 · 다시 눌러도 안 보낸다
      await page.evaluate(() => { window.__apiN = 0; window.api = function (p) { if (p && p.action === 'requestContractResend') window.__apiN++; return Promise.resolve({ ok: true, at: '2026-10-09 10:00' }); }; });
      await page.evaluate(() => document.getElementById('mp_ctResend').click()); await page.waitForTimeout(250);
      const b = await look();
      ok(b && b.t === '계약서 재발송 요청' && b.dis === 'true' && /cc-btn-wait/.test(b.cls) && b.h === a.h && b.note === '재발송을 요청했어요 · 24시간 안에 보내 드려요' && b.noteShown, `${vw} ② 누른 뒤 — 같은 이름 · 같은 높이(${a && a.h}px) · 흐리게 · 아래 한 줄`, JSON.stringify(b));
      await page.evaluate(() => document.getElementById('mp_ctResend').click()); await page.waitForTimeout(200);
      if (process.env.SHOT_DIR) { try { await page.evaluate(() => { const b = document.getElementById('mp_ctResend'); if (b) b.scrollIntoView({ block: 'center' }); }); await page.screenshot({ path: path.join(process.env.SHOT_DIR, `journey-input-resend-${vw}-after.png`) }); } catch (x) {} }
      ok(await page.evaluate(() => window.__apiN) === 1, `${vw} ② 흐린 단추를 다시 눌러도 요청을 또 보내지 않는다`, await page.evaluate(() => window.__apiN));
      // ③ 새로고침 — 서버 값(contractResendAt)으로 처음부터 흐리게
      await page.evaluate((d) => { window.__ctResendJust = ''; renderMyPage(d); try { show('mypageView'); } catch (x) {} }, state(true)); await page.waitForTimeout(250);
      const c = await look();
      ok(c && c.dis === 'true' && /cc-btn-wait/.test(c.cls) && c.h === a.h && c.noteShown, `${vw} ③ 새로고침(서버 값) — 처음부터 흐리게 · 같은 높이 · 아래 한 줄`, JSON.stringify(c));
      // ④ 옛 서버(값 없음) · 이번에 누른 적 없음 — 종전처럼 켜진 단추
      await page.evaluate((d) => { delete d.contractResendAt; window.__ctResendJust = ''; renderMyPage(d); try { show('mypageView'); } catch (x) {} }, state(false)); await page.waitForTimeout(250);
      const e = await look();
      ok(e && e.dis !== 'true' && !e.note, `${vw} ④ 옛 서버(값 없음) — 종전처럼 켜진 단추`, JSON.stringify(e));
      ok(errors.length === 0, `${vw} 화면 오류 없음`, errors.join(' | '));
      await page.close();
    }
    await eng.close(); srv.close();
  }
} catch (e) { measured = false; console.log('skip 마이페이지 단추 — ' + String((e && e.message) || e).split('\n')[0]); }

if (bad) { console.log(`━━ journey-input — 빨강 ${bad}건 [JOURNEY_INPUT]`); process.exit(1); }
console.log(`━━ journey-input — 통과 · 생년월일 · 현금영수증 여섯 곳 · 재발송 요청 한 번 · 옛 신청서 화면 은퇴${measured ? ' · 마이페이지 단추(390 · 1280)' : ' · (마이페이지 단추는 못 잼)'} [JOURNEY_INPUT]`);
process.exit(0);
