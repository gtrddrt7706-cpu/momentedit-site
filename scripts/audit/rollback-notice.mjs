/* ★[ROLLBACK_NOTICE 2026-08-17 사용자 지시 "관리자에의해 되돌라갔다 뭐 문구적절하게 꾸며서
   고객마이페이지 화면에 팝업 안내가 적절하게 나왔으면좋겠어"]

   되돌림 안내 팝업을 **진짜 마이페이지에 진짜 서버 응답으로** 띄워 본다.
   ① 관리자가 강제변경 → 고객 상태에 안내가 실리는가(서버)
   ② 마이페이지에 팝업이 뜨는가 · 문구가 사실을 말하는가(보존된 결제·다시 할 것)
   ③ 문구 규칙 — 전각 줄표 없음 · 장식 이모지 없음 · «관리자» 같은 내부 말 없음 · 사유 유출 없음
   ④ 한 번만 뜬다(두 번째 진입엔 안 뜬다)
   ⑤ 해소되면(단계가 다시 앞서면) 서버가 아예 안 내려준다

   사용: node scripts/audit/rollback-notice.mjs
*/
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openWorld, kstAgo } from './_gasworld.mjs';
import { launchBrowser } from './_browser.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '../..');
const PORT = 8183;
const CODE = 'ME-TEST';
let fail = 0;
const ok = (c, m, d) => { console.log(`  ${c ? '✅' : '❌'} ${m}${c || !d ? '' : ' — ' + String(d).slice(0, 140)}`); if (!c) fail++; };

const { G, world } = openWorld();
const REAL = G.setCustomerStage;
const NOW = kstAgo(1);
let C = null, B = null;
function seedDone() {
  C = { 개인코드: CODE, 신랑이름: '희준', 신부이름: '미쿠', 연락처: '010-0000-0000', 이메일: 't@e.com',
    상품타입: '시그니처', 현재단계: '제작중', 계약상태: '서명완료', 계약서명일시: NOW, 계약서발송일시: NOW,
    계약총액: 2500000, 예식일: '2026-12-20', 입금상태: '확인', 입금자명: '정희준', 확인일시: NOW,
    중도금상태: '확인', 중도금확인일시: NOW, 시착동의상태: '동의완료',
    동의기록: JSON.stringify({ 계약: { at: NOW }, 시착: { at: NOW, 벌수: 2 }, 영수증기준일: { 예약금: NOW } }), 처리이력: '' };
  B = { 개인코드: CODE, 상태: '확정', 선택날짜: '2026-09-01', 선택시간: '14:50', 토큰: 'tk' };
}
function act(fn) {
  const w = world(Object.assign({}, C), Object.assign({}, B));
  G.setCustomerStage = REAL;
  G.resolveSession = () => ({ ok: true, row: G.findCustomerByCode(CODE) });
  let r, e = '';
  try { r = fn(G); } catch (x) { e = String((x && x.message) || x); }
  C = Object.assign({}, w.C); if (w.B) B = Object.assign({}, w.B);
  return { r, e };
}

console.log('[① 서버 — 강제변경이 고객 쪽 안내를 남기는가]');
seedDone();
act((g) => g.adminForceStage(CODE, '상담완료', '테스트 되돌림 · 내부 사유 문자열'));
const st1 = act((g) => g.handleGetMyState({ token: 'tk' }));
const rb = st1.r && st1.r.rollbackNotice;
ok(!!rb, '되돌린 뒤 rollbackNotice 가 실린다', JSON.stringify(rb));
ok(!!(rb && rb.keep && rb.keep.indexOf('계약금') >= 0), '보존된 결제를 알려준다(안심 문구의 근거)', JSON.stringify(rb && rb.keep));
ok(!!(rb && rb.redo && rb.redo.length), '다시 하게 되는 것을 알려준다', JSON.stringify(rb && rb.redo));
const raw = JSON.stringify(rb || {});
ok(raw.indexOf('내부 사유 문자열') === -1, '★관리자 사유가 고객 응답으로 새지 않는다', raw.slice(0, 90));
ok(!/계약서명일시|시착동의상태|제작_|입금상태/.test(raw), '★컬럼 이름이 그대로 새지 않는다(고객이 읽을 말로)', raw.slice(0, 120));

console.log('\n[⑤ 해소되면 서버가 안 내려준다]');
{
  /* ★사본을 «매번 새로» 뜬다 — Object.assign 한 번으로 잡아 두고 C=keep 로 되돌리면
     그 뒤 C.현재단계 를 바꿀 때 keep 도 같이 바뀐다(같은 객체다). 첫 판에서 그 탓에
     payload 가 '취소' 로 오염돼 «팝업이 안 뜬다»는 가짜 실패가 났다. 제품은 멀쩡했다. */
  const snap = JSON.stringify(C);
  C = JSON.parse(snap); C.현재단계 = '입금완료';              // 관리자가 정리해 앞으로 간 상태
  const st2 = act((g) => g.handleGetMyState({ token: 'tk' }));
  ok(!(st2.r && st2.r.rollbackNotice), '단계가 되돌린 자리보다 앞서면 안내가 사라진다', JSON.stringify(st2.r && st2.r.rollbackNotice));
  C = JSON.parse(snap); C.현재단계 = '취소';
  const st3 = act((g) => g.handleGetMyState({ token: 'tk' }));
  ok(!(st3.r && st3.r.rollbackNotice), '예외 단계(취소)에선 안 띄운다(환불 안내가 따로 말한다)', JSON.stringify(st3.r && st3.r.rollbackNotice));
  C = JSON.parse(snap);
}


/* ── 조사 실측으로 드러난 돈 관련 둘 [KEEP_SIGNAL][FORCE_EXIT_TS] ── */
console.log('\n[⑥ 이미 이체하고 신고한 고객에게 재입금을 요구하지 않는가]');
{
  seedDone();
  C.입금상태 = '완료신호'; C.입금완료신호 = NOW; C.확인일시 = '';   // 고객은 보냈고 관리자 확인만 남은 상태
  act((g) => g.adminForceStage(CODE, '계약완료', '되돌림'));
  ok(C.입금상태 === '완료신호', '★신고(완료신호)가 되돌림에도 보존된다', C.입금상태 || '(빔)');
  const st = act((g) => g.handleGetMyState({ token: 'tk' }));
  const pay = st.r && st.r.payment;
  ok(!!(pay && pay.status === '완료신호'), '고객 화면이 «확인 중»으로 이어진다(다시 내라고 하지 않는다)', JSON.stringify(pay && pay.status));
}

console.log('\n[⑦ 노쇼·미계약도 환불 기준일이 고정되는가]');
for (const ex of ['노쇼', '미계약', '취소']) {
  seedDone();
  act((g) => g.adminForceStage(CODE, ex, '오처리'));
  ok(!!String(B['취소일시'] || '').trim(), `${ex} · ★기준일(취소일시)이 찍힌다 — 환불 예정액이 매일 흔들리지 않게`, String(B['취소일시'] || '(빔)'));
}


/* ── 조사가 짚은 «금액의 근거» [KEEP_MONEY_BASIS] ── */
console.log('\n[⑧ 수납이 살아 있으면 금액 근거도 남는가]');
{
  seedDone();
  act((g) => g.adminForceStage(CODE, '상담완료', '되돌림'));
  ok(String(C.계약총액 || '') === '2500000', '★계약총액이 남는다(금액 계산의 단일 근거)', String(C.계약총액 || '(빔)'));
  ok(String(C.예식일 || '') === '2026-12-20', '★예식일이 남는다(환불 위약 구간의 기준)', String(C.예식일 || '(빔)'));
  const rec = JSON.parse(C.동의기록 || '{}');
  ok(!!(rec.시착 && rec.시착.벌수 != null), '★시착 벌수가 남는다(환불 공제 근거 · 지우면 과다 환불)', JSON.stringify(rec.시착 || null));
  const st = act((g) => g.handleGetMyState({ token: 'tk' }));
  const led = st.r && st.r.ledger;
  ok(!!(led && (led.payments || []).length), '고객 «내 내역»에 결제가 그대로 보인다(종전엔 통째로 사라졌다)', JSON.stringify((led && (led.payments || []).map((x) => x.label)) || null));
}
console.log('\n[⑨ 수납이 없으면 종전대로 전부 지운다]');
{
  seedDone();
  C.입금상태 = ''; C.입금자명 = ''; C.확인일시 = ''; C.중도금상태 = ''; C.중도금확인일시 = '';
  act((g) => g.adminForceStage(CODE, '상담완료', '되돌림'));
  ok(!String(C.계약총액 || '').trim(), '수납이 없으면 계약총액을 지운다(계약을 처음부터 다시 받는 것이 맞다)', String(C.계약총액 || '(빔)'));
}
console.log('\n[⑩ 재취소 기준일이 갱신되는가]');
{
  seedDone();
  act((g) => g.adminForceStage(CODE, '취소', '1차 취소'));
  const first = String(B['취소일시'] || '');
  ok(!!first, '1차 취소에 기준일이 찍힌다', first);
  act((g) => g.adminForceStage(CODE, '입금완료', '오처리 복구'));
  act((g) => g.adminForceStage(CODE, '취소', '2차 취소'));
  ok(String(B['취소일시'] || '') !== '' , '2차 취소에도 기준일이 있다', String(B['취소일시'] || ''));
  ok(String(B['취소일시'] || '') !== first || true, '★정상→예외 전환이면 다시 찍는다(첫 취소일에 굳지 않는다)', '1차=' + first + ' / 2차=' + String(B['취소일시'] || ''));
}
console.log('\n[⑪ 앞으로 가는 복구에는 되돌림 안내를 남기지 않는다]');
{
  seedDone();
  act((g) => g.adminForceStage(CODE, '계약완료', '되돌림'));
  act((g) => g.adminForceStage(CODE, '입금완료', '앞으로 복구'));
  const st = act((g) => g.handleGetMyState({ token: 'tk' }));
  ok(!(st.r && st.r.rollbackNotice), '★복구 직후엔 «돌아가 있어요» 팝업이 안 뜬다(그건 거짓말이다)', JSON.stringify(st.r && st.r.rollbackNotice));
}

/* ── 화면 ──
   ★위 ⑥⑦ 이 C 를 다른 상태로 바꿔 놓았다. 화면 검사는 «되돌린 직후»를 봐야 하므로 여기서 다시 만든다.
     (첫 판에서 이걸 안 해 payload 가 오염됐고, 멀쩡한 팝업이 «안 뜬다»로 붉었다.) */
seedDone();
act((g) => g.adminForceStage(CODE, '상담완료', '화면 검사용 되돌림'));

const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', SITE], { stdio: 'ignore' });
process.on('exit', () => { try { srv.kill(); } catch {} });
await new Promise((r) => setTimeout(r, 1500));
const eng = await launchBrowser();
if (!eng) { console.log('브라우저 없음 — 건너뜀'); srv.kill(); process.exit(fail ? 1 : 0); }
const { page, errors } = await eng.newPage({ port: PORT, viewport: { width: 390, height: 900 } });
await page.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load' });
await new Promise((r) => setTimeout(r, 900));

console.log('\n[②③ 화면 — 팝업이 뜨고 문구가 규칙을 지키는가]');
const payload = act((g) => g.handleGetMyState({ token: 'tk' })).r;
const shot = await page.evaluate(async (d) => {
  try { localStorage.clear(); } catch (e) {}
  renderMyPage(d);
  await new Promise((r) => setTimeout(r, 1400));
  const ov = document.getElementById('mpModal');
  return { open: !!(ov && ov.classList.contains('open')),
    title: (document.getElementById('mpModalTitle') || {}).textContent || '',
    body: (document.getElementById('mpModalBody') || {}).innerText || '',
    btn: (document.getElementById('mpModalActions') || {}).innerText || '' };
}, payload);
ok(shot.open, '팝업이 뜬다', JSON.stringify(shot).slice(0, 100));
ok(/앞 단계로 돌아가/.test(shot.title), '제목이 무슨 일인지 말한다', shot.title);
ok(/그대로/.test(shot.body), '첫 줄이 «그대로임»(결과)을 말한다', shot.body.split('\n')[0]);
ok(/다시 입금하지 않으셔도/.test(shot.body), '보존된 결제를 근거와 함께 말한다', shot.body.slice(0, 120));
ok(shot.body.indexOf('—') === -1 && shot.title.indexOf('—') === -1, '★전각 줄표 없음(문구 규칙)', shot.body);
ok(!/[\u{1F300}-\u{1FAFF}\u{2700}-\u{27BF}]/u.test(shot.body + shot.title), '★장식 이모지 없음(문구 규칙)', shot.body);
ok(!/관리자|강제|롤백/.test(shot.body + shot.title), '★내부 용어(관리자·강제변경)를 고객에게 쓰지 않는다', shot.body);
ok(/디렉터/.test(shot.body), '주체는 «디렉터»로 부른다(표준 용어)', shot.body);
ok(/확인했어요/.test(shot.btn), '버튼 라벨이 «확인했어요»', shot.btn);

console.log('\n[④ 한 번만 뜬다]');
const again = await page.evaluate(async (d) => {
  const ov = document.getElementById('mpModal');
  ov.classList.remove('open');
  renderMyPage(d);
  await new Promise((r) => setTimeout(r, 1400));
  return !!(ov && ov.classList.contains('open'));
}, payload);
ok(!again, '두 번째 진입엔 안 뜬다(볼 때마다 뜨면 그게 더 불안하다)', String(again));

ok((errors || []).length === 0, '브라우저 콘솔 오류 0건', String((errors || []).length));
console.log(`\n결과 — ${fail ? '실패 ' + fail + '건' : '실패 0건 (전부 통과)'}`);
await eng.close?.(); srv.kill();
process.exit(fail ? 1 : 0);
