// ★★[R7_MYPAGE 2026-10-09 고객 여정 A~Z 점검 2라운드 · 마이페이지] 고친 것을 «사람이 하는 길»로 다시 잰다 — 되돌리면 빨강.
//   ★2026-10-10 사장님 «화면 디자인까지 바꿀 필요는 없어 · 버그 오류만» — 화면 모양 고침(C2-6 · C2-7 · C2-12 · C2-13 · C2-14 · C2-16 ·
//     C2-4 막대 z · C2-11 의 고르게 · 20자 · C2-10 의 미리 막기)은 되돌렸고 그 검사도 뺐다. 아래는 버그만이다.
//   C2-1  [C2_LED_SETTLE]      내 내역 «최종 인원 확정하기» → 좌석 화면 → 뒤로가기 한 번 = 좌석 화면만 닫힌다(마이페이지를 안 떠난다)
//   C2-2  [C2_RESEND_ACCT]     계약서 재발송 «요청함»은 그 계정에만 — 로그아웃 뒤 다른 계정은 켜진 단추
//   C2-3  [C2_ADV_RESET]       로그아웃 뒤 다른 계정 — 앞사람 AI 상담 대화가 안 보이고 다음 질문에 안 실린다
//   C2-4  [C2_LOADBAR_SWEEP]   불러오기 실패 막대는 로그아웃(로그인 화면) 뒤 없다
//   C2-5  [C2_LAYER_INERT]     주소 창 · 확인 판 · 내 내역에서 Tab 이 뒤 페이지로 안 나간다 · 주소 창이 떠 있으면 로그아웃 안 받음 ·
//                              가족·친구 스냅 «나가기» 판 단추가 실제로 눌린다 · 같은 모양의 계약서 · 시착 동의서 뷰어 · 청첩장 샘플 · 그림 미리보기도
//                              (열면 초점이 창 안 · 닫으면 연 자리로 · 편집 화면 위에 겹쳐 열어도)
//   C2-9  [C2_SAVE_INFLIGHT]   저장이 도는 중 «나가기» — 사실과 다른 판 없이 저장이 끝난 뒤 나간다 · 머리 알약 «저장 중…»
//   C2-10 [C2_BIRTH_19]        생년 목록 위끝 = 한국 올해-19(서버가 늘 거절하는 해를 두지 않는다)
//   C2-11 [C2_DONE_NAMES]      긴 영문 이름이 320 에서 카드 밖으로 잘리지 않는다
//   C2-15 [C2_CI_ONE_LISTENER] 계약 요청 폼을 다시 그려도 #mp_contract click 리스너가 늘지 않는다
//   E2-7  [E2_CR_SAME]         현금영수증 번호 판정 = 서버(00_platform-config _crKR · 70_journey _crOk)와 같은 답(브라우저 없이 · 받는 곳 여섯이 한 함수)
//   R2_ROOT=<다른 폴더> 로 돌리면 그 판을 잰다(옛 판 빨강 확인용). SHOT_DIR=<폴더> 면 390 · 1280 화면을 남긴다.
//   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함(브라우저 없음 · 정적 E2-7 은 그래도 잰다 — 정적이 빨강이면 1)
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
import { openWorld, kstAhead, kstAheadWeekday, kstAgo } from './_gasworld.mjs';
const require = createRequire(import.meta.url);
const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(process.env.R2_ROOT || path.join(HERE, '..', '..'));
const SHOT = process.env.SHOT_DIR || '';
let fail = 0, n = 0;
const ok = (m, c, d) => { n++; console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d == null ? '' : ' → ' + String(d).slice(0, 400)}`); if (!c) fail++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

/* ══════════ E2-7 [E2_CR_SAME] 정적 — 화면 판정 = 서버 판정 ══════════ */
function fnSrc(src, name) {   // 그 이름의 함수 몸통(중괄호 짝) — 정규식 {7,8} 같은 짝 맞는 괄호는 그대로 센다
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) return '';
  let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { const ch = src[k]; if (ch === '{') d++; else if (ch === '}') { d--; if (!d) return src.slice(i, k + 1); } }
  return '';
}
console.log('━━ E2-7 [E2_CR_SAME] 현금영수증 번호 — 화면 판정 = 서버 판정');
{
  const my = read('mypage.html'), cfg = read('automation/platform/00_platform-config.gs'), j70 = read('automation/platform/70_journey.gs');
  let cli = null, srv = null;
  try { cli = new Function(fnSrc(my, '_crDigitsKR') + '\n' + fnSrc(my, '_crOk') + '\nreturn _crOk;')(); } catch (e) { cli = null; }
  try { srv = new Function('function _gsr_(){}\n' + fnSrc(cfg, '_crKR') + '\n' + fnSrc(j70, '_crOk') + '\nreturn function(v){ var n=_crKR(v); return !n || _crOk(n); };')(); } catch (e) { srv = null; }
  ok('화면 _crOk · 서버 _crKR + _crOk 를 꺼냈다(못 꺼내면 못 잰 것이다 — 빨강)', !!cli && !!srv);
  if (cli && srv) {
    const CORPUS = ['', '01012345678', '010-1234-5678', '0101234567', '0111234567', '01612345678', '01712345678', '01812345678', '01912345678',
      '0121234567', '01212345678', '0131234567', '01312345678', '0151234567', '01512345678', '0141234567',
      '0311234567', '0701234567', '07012345678', '0212345678', '0201234567', '0501234567',
      '2208612345', '1234567890', '9876543210', '123', '99', '12345', '9001011234567', '0101234567890', '012345678901234567',
      '+82 10-1234-5678', '821012345678', '00821012345678', '+82 31-123-4567', '8211234567', '82112345678', '+82 010-1234-5678'];
    const diff = CORPUS.filter((v) => cli(v) !== srv(v)).map((v) => `${JSON.stringify(v)}: 화면 ${cli(v)} · 서버 ${srv(v)}`);
    ok(`E2-7 번호 ${CORPUS.length}개 — 화면과 서버가 같은 답(012 · 013 · 015 · 031 · 070 · +82 꼴 포함)`, !diff.length, diff.join(' | '));
    ok('E2-7 받는 곳 여섯(계약금 · 중도금 · 잔금 · 내 내역 잔금 · 소득공제 판 · 계약 요청)이 같은 판정(_crCheck → _crOk)을 지난다',
      ['mp_payerCR', 'mp_mCR', 'mp_bCR', 'mp_lbCR', 'mp_ciCR'].every((id) => my.includes(`_crCheck('${id}')`)) && /check:function\(\)\{ return _crCheck\('mp_crEdit'\); \}/.test(my) && (my.match(/function _crOk\(/g) || []).length === 1);
  }
}

/* ══════════ 브라우저 ══════════ */
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
let br = null; if (pw) { try { br = await pw.chromium.launch(); } catch { br = null; } }
if (!br) { console.log(fail ? `\nMYPAGE R2 FAIL ${fail} (브라우저 없음 · 정적만)` : '\n못 쟀다 — 브라우저 없음(정적 E2-7 은 통과)'); process.exit(fail ? 1 : 2); }

/* 상태 — 실제 GAS(handleGetMyState)로 뜬다(읽기만 · 시트 쓰기는 이벤트로 가로챈다) */
const { G, world } = openWorld();
const AMT = 3300000, SIGNED = kstAgo(1);
const WED = kstAhead(60), WED8 = kstAhead(8);
const FIT = { 시착: { type: '시착동의', version: '시착동의-v4', signedAt: kstAgo(200), 예약금: 100000, 기본벌수: 2, 추가벌비용: 50000, 벌수: 2 } };
const CI = (wd) => JSON.stringify({ ...FIT, 계약정보: { weddingDate: wd, weddingTime: '12:20', groomBirth: '1993-03-02', brideBirth: '1994-05-06', groomAddr: '서울시 마포구 월드컵로 1', brideAddr: '서울시 은평구 2', requestedAt: kstAgo(30) } });
const BK = (o) => Object.assign({ 상태: '확정', 입금확인: '확인', 선택날짜: kstAhead(-40), 선택시간: '14:50', 토큰: 'BKTOK' }, o || {});
const BKF = (o) => BK(Object.assign({ 선택날짜: kstAheadWeekday(5) }, o || {}));
const PAID = { 계약상태: '서명완료', 계약서명일시: SIGNED, 계약총액: AMT, 입금상태: '확인', 입금자명: '김희준', 시착동의상태: '동의완료', 시착동의일시: kstAgo(200) };
const FX = {
  S01: [{ 현재단계: '신청접수' }, { 상태: '신청접수', 토큰: 'BKTOK' }],
  W01: [{ 현재단계: '신청접수', 상품타입: '웨딩스냅' }, { 상태: '신청접수', 토큰: 'BKTOK' }],
  S03: [{ 현재단계: '신청접수' }, BKF({ 상태: '변경제안', 입금확인: '', 변경제안날짜: kstAheadWeekday(7), 변경제안시간: '18:10', 변경제안메모: '이 시간은 어떠세요?' })],
  S07: [{ 현재단계: '시착', 시착동의상태: '동의완료', 시착동의일시: kstAgo(2), 동의기록: JSON.stringify({ 시착: { type: '시착동의', version: '시착동의-v4', signedAt: kstAgo(2), 예약금: 100000, 기본벌수: 2, 추가벌비용: 50000 } }) }, BK({ 선택날짜: kstAhead(0), 선택시간: '11:30' })],
  S08: [{ 현재단계: '상담완료', 시착동의상태: '동의완료', 시착동의일시: kstAgo(30) }, BK()],
  S09: [{ 현재단계: '상담완료', 시착동의상태: '동의완료', 시착동의일시: kstAgo(30), 예식일: WED, 동의기록: CI(WED) }, BK()],
  S11: [{ 현재단계: '계약완료', 계약상태: '발송', 계약서발송일시: kstAgo(80), 계약총액: AMT, 예식일: WED, 동의기록: CI(WED), 시착동의상태: '동의완료' }, BK()],
  S15: [Object.assign({}, PAID, { 현재단계: '제작중', 예식일: WED, 동의기록: CI(WED) }), BK()],
  S16: [Object.assign({}, PAID, { 현재단계: '제작중', 예식일: WED8, 중도금상태: '확인', 동의기록: CI(WED8) }), BK()],
};
function stateOf(k) {
  const [row, bk] = FX[k];
  world(Object.assign({ 신랑이름: '김희준', 신부이름: '이미쿠', 상품타입: '시그니처', 개인코드: 'ME-TEST', 동의기록: '{}', 이메일: 'test@example.com', 연락처: '01012345678' }, row), bk);
  const ref = G.findCustomerByCode('ME-TEST'); G.resolveSession = () => ({ ok: true, row: ref });
  return JSON.parse(JSON.stringify(G.handleGetMyState({ token: 't' })));
}
const ST = {}; for (const k of Object.keys(FX)) { try { ST[k] = stateOf(k); } catch (e) { ST[k] = null; } }
ok('상태 아홉 벌을 실제 GAS 로 떴다', Object.values(ST).every((x) => x && x.ok !== false), Object.keys(ST).filter((k) => !ST[k]).join(','));

const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const srvH = http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/__r2_prev.html') { r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); r.end('<!doctype html><meta charset="utf-8"><title>prev</title><p>prev'); return; }
  const p = path.join(ROOT, u); if (!p.startsWith(ROOT)) { r.writeHead(403); r.end(); return; }
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); });
});
await new Promise((r) => srvH.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srvH.address().port;
const FAKE_DAUM = "window.daum={Postcode:function(o){ this.embed=function(el){ el.innerHTML='<button type=\"button\" id=\"fakePick\" style=\"margin:20px\">고르기</button><input id=\"fakeQ\" placeholder=\"검색\">'; el.querySelector('button').onclick=function(){ o.oncomplete({roadAddress:'서울 마포구 월드컵로 1', jibunAddress:'서울 마포구 성산동 1'}); }; }; }};";
async function open({ w = 390, h = 844, state, gas, init, prev = false, touch } = {}) {
  const ctx = await br.newContext({ viewport: { width: w, height: h }, hasTouch: touch != null ? touch : w < 1000, isMobile: w < 1000, locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
  await ctx.addInitScript('window.__ME_PREVIEW_GUARD_TEST_OFF = true;');
  await ctx.addInitScript("try{ if(!sessionStorage.getItem('__r2tok')){ sessionStorage.setItem('__r2tok','1'); localStorage.setItem('me_token','TOK'); } localStorage.setItem('me_ledtip_v1','o'); ['ME-TEST','BBBBBB'].forEach(function(c){ localStorage.setItem('me_wedcele_'+c,'o'); }); }catch(e){}");
  if (init) await ctx.addInitScript(init);
  const S = { state, gas, log: [], adv: [], advReply: '답' };
  await ctx.route('**/*', async (rt) => {
    const u = rt.request().url();
    if (u.includes('script.google.com') || u.includes('script.googleusercontent.com')) {
      let p = {}; try { p = JSON.parse(rt.request().postData() || '{}'); } catch {}
      if (rt.request().method() === 'GET') p = Object.fromEntries(new URL(u).searchParams);
      S.log.push(p.action);
      let hh = null; if (typeof S.gas === 'function') hh = await S.gas(p.action, p);
      if (hh == null && p.action === 'getMyState') hh = { json: typeof S.state === 'function' ? S.state() : S.state };
      if (hh == null && /^(login|autologin|verify)$/.test(String(p.action))) hh = { json: { ok: true, token: 'TOK' } };
      if (hh == null) hh = { json: { ok: true } };
      if (hh.hold) await wait(hh.hold);
      return rt.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(hh.json) }).catch(() => {});
    }
    if (/\/api\/advisor(\?|$)/.test(u)) { let b = {}; try { b = JSON.parse(rt.request().postData() || '{}'); } catch {} S.adv.push(b); return rt.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, reply: S.advReply }) }).catch(() => {}); }
    if (u.startsWith(BASE)) return rt.continue();
    return rt.fulfill({ status: 200, body: '' }).catch(() => {});
  });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(String((e && e.message) || e)));
  if (prev) await pg.goto(BASE + '/__r2_prev.html');
  await pg.goto(BASE + '/mypage.html', { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => { const v = document.getElementById('mypageView'); return v && v.classList.contains('show'); }, null, { timeout: 20000 });
  await wait(1200);
  return { ctx, pg, S, errs };
}
const shot = async (pg, name) => { if (!SHOT) return; try { fs.mkdirSync(SHOT, { recursive: true }); await pg.screenshot({ path: path.join(SHOT, `mypage-r2-${name}.png`) }); } catch {} };
const visBtn = (sel) => `[...document.querySelectorAll('${sel}')].filter(function(e){ var r=e.getBoundingClientRect(); return r.width>0&&r.height>0; })[0]`;
const exitClick = (pg) => pg.evaluate(`(function(){ var b=${visBtn('[data-wiz-exit]')}; if(b) b.click(); return !!b; })()`);
const exitY = (pg) => pg.evaluate(`(function(){ var b=${visBtn('[data-wiz-exit]')}; return b?Math.round(b.getBoundingClientRect().top):null; })()`);
const modalOpen = (pg) => pg.evaluate(() => { const m = document.getElementById('mpModal'); return !!(m && m.classList.contains('open')); });
/* 초점이 어디 있나 — 'in'(그 층 안) · 'body'(문서 · 브라우저 칸) · 'out:…'(뒤 페이지) */
const where = (pg, sel) => pg.evaluate((sel) => { const a = document.activeElement; if (!a || a === document.body || a === document.documentElement) return 'body'; const L = document.querySelector(sel); return (L && L.contains(a)) ? 'in' : 'out:' + (a.id || a.tagName + '.' + String(a.className || '').slice(0, 20)); }, sel);
async function tabWalk(pg, sel, steps, shift) { const seen = []; for (let i = 0; i < steps; i++) { await pg.keyboard.press(shift ? 'Shift+Tab' : 'Tab'); await wait(60); seen.push(await where(pg, sel)); } return seen; }
const LOADBAR = "(function(){ var e=new Error('끊김'); e.meKind='net'; _loadFailBar(e); return !!document.getElementById('mp_loadBar'); })()";

/* 한 갈래 = 한 화면(따로 연다) — 한 갈래가 빨갛게 멈춰도 다른 갈래는 끝까지 잰다(옛 판에서도 전 항목의 빨강을 본다) */
async function sec(title, opts, fn) {
  console.log('━━ ' + title);
  let o = null;
  try { o = await open(opts); await fn(o); if (o.errs.length) ok(title + ' — 화면 오류 없음', false, o.errs.join(' | ')); }
  catch (e) { ok(title + ' — 끝까지 잼(예외 없이)', false, String((e && e.message) || e).split('\n')[0]); }
  finally { if (o) { try { await o.ctx.close(); } catch {} } }
}
const S16v = () => { const st = JSON.parse(JSON.stringify(ST.S16)); st.balance.due = false; st.balance.dday = 20; st.balance.extraPending = true; return st; };
const AV = { gas: (a) => (a === 'weddingAvailability' ? { json: { ok: true, slots: ['09:00', '12:20', '15:40'], labels: {}, taken: {} } } : null) };

try {
  await sec('C2-1 [C2_LED_SETTLE] 내 내역 «최종 인원 확정하기» → 좌석 화면 → 뒤로가기', { state: S16v(), prev: true }, async ({ pg }) => {
    await pg.evaluate(() => openLedModal()); await wait(500);
    await pg.evaluate(() => { const v = document.getElementById('mp_ledBalView'); if (v) v.click(); }); await wait(300);
    const has = await pg.evaluate(() => !!document.querySelector('#mp_ledger [data-bal-final]'));
    if (has) await pg.evaluate(() => document.querySelector('#mp_ledger [data-bal-final]').click());
    await wait(1300);
    const a = await pg.evaluate(() => ({ seat: !!(window.SEATFLOW && SEATFLOW.active), led: document.getElementById('mp_ledger').classList.contains('open') }));
    await pg.goBack().catch(() => {}); await wait(1200);
    const b = await pg.evaluate(() => ({ path: location.pathname, seat: !!(window.SEATFLOW && SEATFLOW.active) })).catch(() => ({ path: '?' }));
    ok('C2-1 좌석 화면이 열렸고 뒤로가기 한 번에 좌석 화면만 닫힌다(마이페이지에 남는다)', has && a.seat && !a.led && b.path === '/mypage.html' && !b.seat, JSON.stringify({ has, a, b }));
  });

  {
    const A = JSON.parse(JSON.stringify(ST.S11)); A.contract.expired = true; A.contract.remainingSec = 0;
    const B = JSON.parse(JSON.stringify(A)); B.name = '박서준 · 최하늘'; B.groom = '박서준'; B.bride = '최하늘'; B.code = 'BBBBBB'; B.contractResendAt = '';
    let who = 'A';
    await sec('C2-2 · C2-3 · C2-4 같은 탭에서 로그아웃 → 다른 계정', { state: () => (who === 'A' ? A : B), gas: (a, p) => {
      if (a === 'login') { who = String(p.code || '').toUpperCase() === 'BBBBBB' ? 'B' : 'A'; return { json: { ok: true, token: 'TOK' + who } }; }
      if (a === 'requestContractResend') return { json: { ok: true, at: '2026-10-09 22:00' } };
      return null; } }, async ({ pg, S }) => {
      await pg.evaluate(() => { const b = document.getElementById('mp_ctResend'); if (b) b.click(); }); await wait(900);
      const nA = await pg.evaluate(() => { const b = document.getElementById('mp_ctResend'), n = document.getElementById('mp_ctResendNote'); return { dis: b && b.getAttribute('aria-disabled'), t: n ? n.textContent.trim() : '', prev: n && n.previousElementSibling ? n.previousElementSibling.id : '' }; });
      ok('C2-2 (전제) 앞 계정(김희준)은 재발송을 요청한 뒤 «요청함»(흐린 단추 · 알림 줄)', nA.dis === 'true' && !!nA.t, JSON.stringify(nA));
      await shot(pg, 'resend-A-390');
      S.advReply = '김희준 님 잔금은 1,650,000원이에요.';
      await pg.evaluate(() => { window.MEAdvisor.open(); window.MEAdvisor.ask('잔금 얼마예요?'); }); await wait(1600);
      await pg.evaluate(() => window.MEAdvisor.close()); await wait(300);
      const barA = await pg.evaluate(LOADBAR);
      await pg.evaluate(() => document.getElementById('mp_logout').click()); await wait(900);
      const afterOut = await pg.evaluate(() => ({ login: document.getElementById('loginView').classList.contains('show'), bar: !!document.getElementById('mp_loadBar') }));
      ok('C2-4 불러오기 실패 막대는 로그아웃(로그인 화면)에서 걷힌다', barA && afterOut.login && !afterOut.bar, JSON.stringify({ barA, afterOut }));
      await pg.fill('#li_code', 'BBBBBB'); await pg.fill('#li_pw', 'pw1234'); await pg.click('#li_btn');
      await pg.waitForFunction(() => document.getElementById('mypageView').classList.contains('show'), null, { timeout: 15000 }).catch(() => {}); await wait(1500);
      const nB = await pg.evaluate(() => { const b = document.getElementById('mp_ctResend'); return { who: (document.getElementById('mypageView').innerText.match(/박서준|김희준/) || [''])[0], dis: b ? b.getAttribute('aria-disabled') : 'none', cls: b ? b.className : '', note: !!document.getElementById('mp_ctResendNote') }; });
      ok('C2-2 다른 계정(박서준)의 재발송 단추는 켜져 있고 «요청함» 줄이 없다', nB.who === '박서준' && nB.dis !== 'true' && !/cc-btn-wait/.test(nB.cls) && !nB.note, JSON.stringify(nB));
      await pg.evaluate(() => window.MEAdvisor.open()); await wait(700);
      const msgs = await pg.evaluate(() => [...document.querySelectorAll('#meAdvBody .me-adv-msg')].map((e) => e.textContent.trim()));
      ok('C2-3 다른 계정이 연 AI 창에 앞사람 질문 · 답이 없다', msgs.length >= 1 && !msgs.some((t) => /잔금 얼마예요|김희준 님 잔금/.test(t)), JSON.stringify(msgs));
      S.advReply = 'B 답';
      await pg.evaluate(() => window.MEAdvisor.ask('우리 예식 언제예요?')); await wait(1600);
      const last = S.adv[S.adv.length - 1] || {};
      const sent = (last.messages || []).map((m) => m.role + ':' + String(m.content));
      ok('C2-3 다른 계정의 다음 질문에 앞사람 대화가 실려 가지 않는다', sent.length === 1 && /우리 예식 언제예요/.test(sent[0]), JSON.stringify(sent));
      await shot(pg, 'adv-B-390');
    });
  }

  await sec('C2-9 [C2_SAVE_INFLIGHT] 저장이 도는 중 «나가기»(S15) 390', { state: ST.S15, gas: (a) => (a === 'saveInvitationDraft' ? { hold: 3000, json: { ok: true } } : null) }, async ({ pg }) => {
    await pg.evaluate(() => document.getElementById('mp_invStart').click()); await wait(900);
    await pg.evaluate(() => { const o = document.querySelector('.inv-opt[data-m="online"]'); if (o) o.click(); }); await wait(200);
    await pg.fill('#mp_gEn', 'Heejun'); await pg.fill('#mp_bEn', 'Miku');
    await pg.evaluate(() => document.getElementById('iv_next').click()); await wait(250);
    const pill = await pg.evaluate(`(function(){ var b=${visBtn('[data-wiz-save]')}; return b?b.textContent.trim():''; })()`);
    await exitClick(pg); await wait(700);
    const mid = await pg.evaluate(() => ({ modal: document.getElementById('mpModal').classList.contains('open') ? document.getElementById('mpModalBody').innerText.replace(/\s+/g, ' ') : '', active: !!(window.INVFLOW && INVFLOW.active) }));
    await wait(3600);
    const end = await pg.evaluate(() => ({ modal: document.getElementById('mpModal').classList.contains('open'), active: !!(window.INVFLOW && INVFLOW.active), path: location.pathname }));
    ok('C2-9 저장이 도는 동안 머리 알약은 «저장 중…»', pill === '저장 중…', pill);
    ok('C2-9 저장이 도는 중 «나가기» — «저장하지 않으면 남지 않아요» 판 없이 기다렸다가 저장이 끝나면 나간다', !mid.modal && mid.active && !end.modal && !end.active && end.path === '/mypage.html', JSON.stringify({ mid, end }));
  });

  await sec('C2-5 [C2_LAYER_INERT] 내 내역 · 확인 판 · 가족·친구 스냅 판(S15) 390', { state: ST.S15 }, async ({ pg }) => {
    await pg.evaluate(() => { document.getElementById('mp_logout').focus(); openLedModal(); }); await wait(500);
    const led0 = await where(pg, '#mp_ledger');
    const ledT = await tabWalk(pg, '#mp_ledger', 12, false);
    ok('C2-5 내 내역 — 열면 초점이 창 안 · Tab 12번이 창 밖(뒤 페이지)으로 안 나간다', led0 === 'in' && !ledT.some((x) => x.startsWith('out')), JSON.stringify([led0].concat(ledT)));
    await pg.evaluate(() => closeLedModal()); await wait(400);
    await pg.evaluate(() => { window.__r2m = mpConfirm({ title: '점검', body: '판', yes: '확인', no: '취소' }); }); await wait(600);
    const mT = await tabWalk(pg, '#mpModal', 6, false);
    ok('C2-5 확인 판 — Tab 6번이 «확인 · 취소» 밖으로 안 나간다', !mT.some((x) => x.startsWith('out')), JSON.stringify(mT));
    await pg.keyboard.press('Escape'); await wait(400);
    await pg.evaluate(() => document.getElementById('mp_photoStart').click()); await wait(1200);
    const fr = await pg.$('#mp_photoFriend'); if (fr) await fr.fill('대학 동기들과 한 장');
    await wait(200); await exitClick(pg); await wait(800);
    const ph = await pg.evaluate(() => { const m = document.getElementById('mpModal'); let inert = ''; for (let e = m; e; e = e.parentElement) { if (e.inert || e.hasAttribute('inert')) { inert = e.tagName + '#' + e.id; break; } } const b = document.querySelector('#mpModalActions button:last-child'); let hit = false; if (b) { const r = b.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); hit = !!(el && b.contains(el)); } return { open: m.classList.contains('open'), inert, hit }; });
    let clicked = false; try { await pg.click('#mpModalActions button:last-child', { timeout: 3000 }); clicked = true; } catch {}
    await wait(900);
    const phEnd = await pg.evaluate(() => ({ photo: !!document.getElementById('mp_photoOverlay'), modal: document.getElementById('mpModal').classList.contains('open') }));
    ok('C2-5 가족·친구 스냅 «나가기» 판 — 뒤 페이지 막음(inert)에 갇히지 않고 손가락으로 눌린다', ph.open && !ph.inert && ph.hit && clicked && !phEnd.photo && !phEnd.modal, JSON.stringify({ ph, clicked, phEnd }));
  });

  await sec('C2-11 [C2_DONE_NAMES] 320 긴 영문 이름', { w: 320, h: 568, state: ST.S15 }, async ({ pg }) => {
    const r = await pg.evaluate(() => { const d = document.createElement('div'); d.className = 'mp-fs'; d.innerHTML = '<div class="consult-card inv-wrap done-wrap"><div class="done-names" id="r2dn"></div></div>'; document.body.appendChild(d);
      const el = document.getElementById('r2dn'); const res = [];
      for (const nm of ['SEUNGYEONHYUN', 'SEUNGYEONHYUNWOO', 'SEUNGYEONHYUNWOOJIN']) { el.innerHTML = nm + ' <span>&amp;</span> MIKU'; res.push(el.scrollWidth <= el.clientWidth + 1 && d.scrollWidth <= d.clientWidth + 1); }
      d.remove(); return res; });
    ok('C2-11 320 — 13 · 16 · 19자 영문 이름도 완성 화면 이름 줄이 안 넘친다', r.every(Boolean), JSON.stringify(r));
  });

  await sec('C2-15 [C2_CI_ONE_LISTENER] 계약 요청 폼 리스너(S08) 390', Object.assign({ state: ST.S08 }, AV), async ({ pg }) => {
    const cdp = await pg.context().newCDPSession(pg);
    const clicks = async () => { const { result } = await cdp.send('Runtime.evaluate', { expression: "document.getElementById('mp_contract')" }); const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId }); return listeners.filter((l) => l.type === 'click').length; };
    const c0 = await clicks();
    await pg.evaluate(() => { for (let i = 0; i < 3; i++) { renderMyPage(window._mpStateD); show('mypageView'); } }); await wait(600);
    const c1 = await clicks();
    ok('C2-15 계약 요청 폼을 세 번 다시 그려도 #mp_contract click 리스너 수가 그대로', c0 >= 1 && c1 === c0, JSON.stringify({ c0, c1 }));
  });

  await sec('C2-10 [C2_BIRTH_19] 생년 목록(S08) 390', Object.assign({ state: ST.S08 }, AV), async ({ pg }) => {
    const k = new Date(Date.now() + 9 * 3600e3), ky = k.getUTCFullYear();
    const yrs = await pg.evaluate(() => [...document.querySelectorAll('#mp_ciGB_y option')].map((o) => +o.value).filter(Boolean));
    ok(`C2-10 생년 목록 위끝 = 한국 올해-19(${ky - 19})`, yrs.length > 0 && Math.max(...yrs) === ky - 19, String(Math.max(...yrs)));
  });

  await sec('C2-5 [C2_LAYER_INERT] 주소 찾기 창(S08) 390', Object.assign({ state: ST.S08, init: FAKE_DAUM }, AV), async ({ pg }) => {
    const inert0 = await pg.evaluate(() => [...document.querySelectorAll('body *')].filter((e) => e.inert).length);   // 처음부터 막혀 있는 것(진행 시간표 창 등)은 빼고 센다
    await pg.evaluate(() => { const b = document.getElementById('mp_ciGA_find'); b.scrollIntoView({ block: 'center' }); b.click(); }); await wait(600);
    const aT = await tabWalk(pg, '#mp_addrOverlay', 8, false);
    const aS = await tabWalk(pg, '#mp_addrOverlay', 5, true);
    ok('C2-5 주소 창 — Tab 8번 · Shift+Tab 5번이 창 밖(뒤 페이지 · 로그아웃)으로 안 나간다', !aT.concat(aS).some((x) => x.startsWith('out')), JSON.stringify({ aT, aS }));
    const behind = await pg.evaluate(() => { const b = document.getElementById('mp_ciBA_find'); b.focus(); return document.activeElement === b; });
    ok('C2-5 주소 창이 떠 있는 동안 뒤 «신부 주소 찾기»에 초점이 안 간다', !behind, String(behind));
    await pg.evaluate(() => document.getElementById('mp_logout').click()); await wait(500);
    const g = await pg.evaluate(() => ({ login: document.getElementById('loginView').classList.contains('show'), addr: document.getElementById('mp_addrOverlay').style.display }));
    ok('C2-5 주소 창이 떠 있는 동안 로그아웃은 받지 않는다([LOGOUT_FS_GUARD])', !g.login && g.addr === 'flex', JSON.stringify(g));
    await shot(pg, 'addr-390');
    await pg.keyboard.press('Escape'); await wait(400);
    const closed = await pg.evaluate(() => ({ addr: document.getElementById('mp_addrOverlay').style.display, inert: [...document.querySelectorAll('body *')].filter((e) => e.inert).length }));
    ok('C2-5 주소 창을 닫으면 뒤 페이지 막음이 다 풀린다(연 뒤 막은 것만큼 · 처음부터 막힌 것은 그대로)', closed.addr === 'none' && closed.inert === inert0, JSON.stringify({ closed, inert0 }));
  });

  /* [C2_LAYER_INERT] 같은 모양의 다른 창도([COURSE_WIDE]) — 계약서 뷰어 · 시착 동의서 뷰어 · 청첩장 샘플 · 그림 미리보기 */
  const INERTN = () => [...document.querySelectorAll('body *')].filter((e) => e.inert).length;
  const ESC = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  await sec('C2-5 [C2_LAYER_INERT] 계약서 뷰어 · 시착 동의서 뷰어(S11) 390', { state: ST.S11 }, async ({ pg }) => {
    const inert0 = await pg.evaluate(INERTN);
    await pg.evaluate(() => { document.getElementById('mp_logout').focus(); openContractView(); }); await wait(700);
    const f0 = await where(pg, '#mp_ctViewer');
    const T = await tabWalk(pg, '#mp_ctViewer', 3, true);
    const behind = await pg.evaluate(() => { const b = document.getElementById('mp_logout'); b.focus(); return document.activeElement === b; });
    ok('C2-5 계약서 뷰어 — 열면 초점이 창 안 · Shift+Tab 3번이 창 밖으로 안 나간다 · 뒤 «로그아웃»에 초점이 안 간다', f0 === 'in' && !T.some((x) => x.startsWith('out')) && !behind, JSON.stringify({ f0, T, behind }));
    await pg.evaluate(ESC); await wait(500);
    const c = await pg.evaluate(() => ({ gone: !document.getElementById('mp_ctViewer'), inert: [...document.querySelectorAll('body *')].filter((e) => e.inert).length, f: (document.activeElement || {}).id || '' }));
    ok('C2-5 계약서 뷰어를 닫으면 막음이 다 풀리고 초점은 연 자리(로그아웃)로', c.gone && c.inert === inert0 && c.f === 'mp_logout', JSON.stringify({ c, inert0 }));
    const hasFit = await pg.evaluate(() => !!window._fittingDoc);
    ok('C2-5 시착 동의서가 있는 상태다(아래 검사가 뜻이 있다)', hasFit);
    await pg.evaluate(() => { document.getElementById('mp_logout').focus(); openFittingView(); }); await wait(700);
    const g0 = await where(pg, '#mp_ftViewer'), gT = await tabWalk(pg, '#mp_ftViewer', 3, true);
    const gB = await pg.evaluate(() => { const b = document.getElementById('mp_logout'); b.focus(); return document.activeElement === b; });
    ok('C2-5 시착 동의서 뷰어 — 열면 초점이 창 안 · Shift+Tab 3번이 창 밖으로 안 나간다 · 뒤 «로그아웃»에 초점이 안 간다', g0 === 'in' && !gT.some((x) => x.startsWith('out')) && !gB, JSON.stringify({ g0, gT, gB }));
    await pg.evaluate(ESC); await wait(500);
    const gc = await pg.evaluate(() => ({ gone: !document.getElementById('mp_ftViewer'), inert: [...document.querySelectorAll('body *')].filter((e) => e.inert).length, f: (document.activeElement || {}).id || '' }));
    ok('C2-5 시착 동의서 뷰어를 닫으면 막음이 다 풀리고 초점은 연 자리로', gc.gone && gc.inert === inert0 && gc.f === 'mp_logout', JSON.stringify({ gc, inert0 }));
  });
  await sec('C2-5 [C2_LAYER_INERT] 청첩장 샘플 · 그림 미리보기 — 청첩장 편집 화면 안에서(S15) 390', { state: ST.S15 }, async ({ pg }) => {
    await pg.evaluate(() => document.getElementById('mp_invStart').click()); await wait(1300);
    const inert0 = await pg.evaluate(INERTN);
    const EXIT = visBtn('[data-wiz-exit]');
    await pg.evaluate(`(function(){ var b=${EXIT}; b.focus(); openInviteSamples(); })()`); await wait(700);
    const s0 = await where(pg, '#mp_invSample'), sT = await tabWalk(pg, '#mp_invSample', 3, true);
    const sB = await pg.evaluate(`(function(){ var b=${EXIT}; b.focus(); return document.activeElement===b; })()`);
    ok('C2-5 청첩장 샘플 — 열면 초점이 창 안 · Shift+Tab 3번이 창 밖으로 안 나간다 · 뒤 편집 화면 «나가기»에 초점이 안 간다', s0 === 'in' && !sT.some((x) => x.startsWith('out')) && !sB, JSON.stringify({ s0, sT, sB }));
    await pg.evaluate(ESC); await wait(600);
    const sc = await pg.evaluate(`(function(){ var b=${EXIT}; return { gone: !document.getElementById('mp_invSample'), inert: [].filter.call(document.querySelectorAll('body *'), function(e){ return e.inert; }).length, back: document.activeElement===b }; })()`);
    ok('C2-5 청첩장 샘플을 닫으면 막음이 다 풀리고 초점은 연 자리(편집 화면 «나가기»)로 — 편집 화면 위에 겹쳐 열었어도', sc.gone && sc.inert === inert0 && sc.back, JSON.stringify({ sc, inert0 }));
    await pg.evaluate(`(function(){ var b=${EXIT}; b.focus(); mpImgView('/assets/preview/sec-live-account.png','점검'); })()`); await wait(700);
    const p0 = await where(pg, '#pvModal'), pT = await tabWalk(pg, '#pvModal', 4, false);
    const pB = await pg.evaluate(`(function(){ var b=${EXIT}; b.focus(); return document.activeElement===b; })()`);
    ok('C2-5 그림 미리보기 — 열면 초점이 «닫기» · Tab 4번이 창 밖으로 안 나간다 · 뒤 «나가기»에 초점이 안 간다', p0 === 'in' && !pT.some((x) => x.startsWith('out')) && !pB, JSON.stringify({ p0, pT, pB }));
    await shot(pg, 'pv-390');
    await pg.evaluate(ESC); await wait(500);
    const pc = await pg.evaluate(`(function(){ var b=${EXIT}, m=document.getElementById('pvModal'); return { open: !!(m && m.classList.contains('open')), inert: [].filter.call(document.querySelectorAll('body *'), function(e){ return e.inert; }).length, back: document.activeElement===b }; })()`);
    ok('C2-5 그림 미리보기를 닫으면 막음이 다 풀리고 초점은 연 자리로', !pc.open && pc.inert === inert0 && pc.back, JSON.stringify({ pc, inert0 }));
  });

  if (SHOT) {
    await sec('1280 화면(눈으로 볼 것)', { w: 1280, h: 900, state: ST.S01 }, async ({ pg }) => { await shot(pg, 'now-S01-1280'); });
    await sec('1280 청첩장 1걸음(눈으로 볼 것)', { w: 1280, h: 900, state: ST.S15 }, async ({ pg }) => { await pg.evaluate(() => document.getElementById('mp_invStart').click()); await wait(900); await shot(pg, 'inv1-1280'); });
    await sec('1280 계약서 기한 지남(눈으로 볼 것)', { w: 1280, h: 900, state: (() => { const A = JSON.parse(JSON.stringify(ST.S11)); A.contract.expired = true; A.contract.remainingSec = 0; return A; })(), gas: (a) => (a === 'requestContractResend' ? { json: { ok: true, at: '2026-10-09 22:00' } } : null) }, async ({ pg }) => {
      await pg.evaluate(() => { const b = document.getElementById('mp_ctResend'); if (b) { b.click(); } }); await wait(900); await pg.evaluate(() => { const b = document.getElementById('mp_ctResend'); if (b) b.scrollIntoView({ block: 'center' }); }); await wait(300); await shot(pg, 'resend-A-1280'); });
  }
} catch (e) { ok('예외 없이 끝까지', false, (e && e.stack) || e); }
finally { try { await br.close(); } catch {} try { srvH.close(); } catch {} }
console.log(fail ? `\nMYPAGE R2 FAIL ${fail}/${n}` : `\nMYPAGE R2 OK ${n}`);
process.exit(fail ? 1 : 0);
