/* ★[BTN_SERVER 2026-08-17 사용자 지시 "구석구석 찾아내자 경우의수 따져서 전부말이야"]

   «보이는 버튼이 실제로 눌리는가» — 화면과 서버를 맞대어 본다.

   ── 왜 이것이 따로 필요한가
   stage-reach 는 **서버만** 두드린다(버튼을 모른다). 그래서 서버가 되는데 화면에 문이 없는 경우,
   반대로 화면엔 문이 있는데 서버가 막는 경우를 둘 다 못 본다.
   이번에 사람이 신고한 [PAID_STAGE_RESYNC] 가 앞쪽이었고, 뒤쪽도 실제로 있었다 —
   후기 단계에서 «보정본 등록» 버튼은 그려지는데 서버가 «결과물 준비 단계가 아닙니다»로 거부했다.
   **보이는데 안 되는 버튼은 없는 버튼보다 나쁘다** — 운영자가 자기 손을 의심하게 된다.

   ── 어떻게
   ① 진짜 .gs 로 adminDetail 페이로드를 만든다 → 진짜 admin.html 에 그린다(openDetail)
   ② 그 화면에 실제로 보이는 버튼(data-da)을 전부 긁는다
   ③ 버튼 → 서버 함수 대응표를 **admin.html 을 파싱해서** 만든다(손으로 적으면 늘 어긋난다)
   ④ 각 버튼을 같은 상태의 새 세계에서 실제로 호출한다 → «상태·단계 때문에» 거부되면 실패
   ★입력값이 없어 나는 거부(«…를 입력해 주세요»)는 실패로 세지 않는다 — 그건 화면 모달이 채운다.
   ★대응표에서 못 찾은 버튼은 조용히 넘기지 않고 «못 잼»으로 세어 출력한다.

   사용: node scripts/audit/admin-btn-server.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openWorld, kstAgo } from './_gasworld.mjs';
import { launchBrowser } from './_browser.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '../..');
const PORT = 8161;
const CODE = 'ME-TEST';
let fail = 0, unknown = [];
const ok = (c, m, d) => { console.log(`  ${c ? '✅' : '❌'} ${m}${c || !d ? '' : '\n       ' + d}`); if (!c) fail++; };

/* ── ③ 버튼 → 서버 함수 대응표를 admin.html 에서 뽑는다 ───────────────────────
   두 단계다: act 문자열 → do* 함수 이름 → 그 함수 안의 runAct(['admin*', …]).
   ★손으로 적은 표는 버튼이 늘 때 조용히 낡는다. 파일에서 읽으면 같이 늙지 않는다. */
const SRC = fs.readFileSync(path.join(SITE, 'admin.html'), 'utf8');
const ACT2DO = {};
/* act 를 받는 두 가지 꼴을 모두 읽는다 — 하나만 읽으면 나머지가 «못 잼»으로 조용히 빠진다.
   ① else if(act==='X') fnName(...)            ② if(act.indexOf('X:')===0){ fnName(...) }
   ★함수 이름을 do* 로 좁히지 않는다 — 실제로는 openPropose·openSendContract 처럼 open* 도 있다. */
for (const m of SRC.matchAll(/act===\s*'([^']+)'\s*\)\s*\{?\s*([A-Za-z_$][\w$]*)\s*\(/g)) ACT2DO[m[1]] = m[2];
for (const m of SRC.matchAll(/act\.indexOf\('([^':]+):'\)\s*===\s*0\s*\)\s*\{\s*([A-Za-z_$][\w$]*)\s*\(/g)) ACT2DO[m[1]] = m[2];
const DO2FN = {};
for (const name of new Set(Object.values(ACT2DO))) {
  const i = SRC.indexOf('function ' + name + '(');
  if (i < 0) continue;
  /* ★스캔을 «그 함수의 몸»으로 끊는다. 4000자를 그냥 훑으면 다음 함수로 넘어가
     doConsultDone 이 바로 아래 doConfirmPay 의 adminConfirmPayment 를 제 것처럼 집어온다(실제로 그랬다). */
  const nx = SRC.indexOf('\nfunction ', i + 1);
  const body = SRC.slice(i, nx > 0 ? nx : i + 4000);
  /* runAct 의 첫 인자가 삼항인 꼴도 읽는다 — doDelivered 는 미수금 여부로 인자를 갈라 넣는다
     (runAct(unpaid.length?['adminMarkDelivered',code,true]:[...])). 배열 리터럴만 찾으면 놓친다. */
  /* 서버를 부르는 꼴이 두 가지다 — runAct([...]) 와 gas('admin…', …).
     doConsultDone 은 gas() 를 쓴다. 한 꼴만 읽으면 그 버튼이 «못 잼»으로 조용히 빠진다. */
  const ra = body.search(/runAct\(|gas\(/);
  const hit = ra < 0 ? null : body.slice(ra, ra + 400).match(/'(admin[A-Za-z]+)'/);
  if (hit) DO2FN[name] = hit[1];
}
const fnFor = (act) => DO2FN[ACT2DO[String(act).split(':')[0]]] || null;

/* ── ④ 인자가 필요한 호출 — 화면 모달이 채워 주는 값을 여기서 대신 채운다.
   ★값이 없어 나는 거부는 «화면과 서버의 어긋남»이 아니다. 그걸 실패로 세면 진짜 신호가 묻힌다. */
const ARGS = {
  adminCancel: () => ['점검'],
  adminProposeTime: () => ['2026-09-02', '18:10', ''],
  adminSetFittingCount: () => [2],
  /* [SEND_TIME_REQ 2026-08-29] 발송 대화상자가 실제로 넘기는 인자(링크·총액·예식일·예식 시간).
     시간을 빼면 서버가 정당하게 거부해 «보이는데 안 눌리는 버튼»으로 잘못 잡힌다. */
  adminSendContract: () => ['https://momentedit.kr/contract/v1-1.html', 2500000, '2026-12-20', '12:20'],
  adminSetResultLinks: () => [{ 원본: 'https://drive.google.com/drive/folders/AAAAAAAAAAAA',
    보정본: 'https://drive.google.com/drive/folders/BBBBBBBBBBBB', 영상: 'https://vimeo.com/1' }],
  adminUndoConfirmPayment: (act) => [String(act).split(':')[1] || '계약금', '점검'],
  adminUndoRefunded: () => ['점검'],
  adminIssueCashReceipt: (act) => [String(act).split(':')[1] || '예약금', '123456789'],
  adminUndoCashReceipt: (act) => [String(act).split(':')[1] || '예약금'],
  adminIssueCoupon: () => [['data:image/png;base64,AAA'], '', ''],
};
/* 서버를 부르지 않는 버튼(문서 열기·복사·모달 전용) — 대응표에 없어도 정상 */
const NO_SERVER = ['viewContract', 'viewFitting', 'notify', 'copy', 'memo', 'archive'];

const { G, world } = openWorld();
const REAL_SET_STAGE = G.setCustomerStage;
const stamp = kstAgo(2);

/* ── 상태 판 — 두 상품의 모든 단계 × 수납·결과물의 대표 조합 ── */
function seed(o) {
  return Object.assign({
    개인코드: CODE, 신랑이름: '김희준', 신부이름: '이미쿠', 연락처: '010-1234-5678', 이메일: 't@example.com',
    상품타입: '시그니처', 예식일: '2026-12-20', 계약총액: 3300000, 계약서발송일시: stamp,
    /* ★영수증기준일 — 진짜 입금 확인이 남기는 흔적(admin.gs 1433). 이걸 빼고 시드하면
       되돌리기가 «확인 시각이 기록에 없어요(예전 데이터)»로 거부돼, 화면·서버 어긋남이 아닌
       «시드가 비현실적이라 생긴 실패»가 섞인다. 실제 고객 행의 모양을 그대로 만든다. */
    동의기록: JSON.stringify({ 시착: { at: stamp, 벌수: 2 }, 계약: { at: stamp },
      영수증기준일: { 예약금: stamp, 계약금: stamp, 중도금: stamp, 잔금: stamp } }), 처리이력: '',
  }, o);
}
const PAID = { 계약상태: '서명완료', 계약서명일시: stamp, 입금상태: '확인', 확인일시: stamp, 입금자명: '정희준' };
const ALLPAID = Object.assign({}, PAID, { 중도금상태: '확인', 중도금확인일시: stamp, 잔금상태: '확인', 잔금확인일시: stamp });
const LINKS = { 원본링크: 'https://drive.google.com/drive/folders/AAAAAAAAAAAA', 보정본폴더: 'https://drive.google.com/drive/folders/BBBBBBBBBBBB' };
const BK = (st) => ({ 개인코드: CODE, 상태: st, 선택날짜: '2026-09-01', 선택시간: '14:50',
  신랑이름: '김희준', 신부이름: '이미쿠', 이메일: 't@example.com', 토큰: 'tk' });

const CASES = [
  ['신청접수', seed({ 현재단계: '신청접수' }), BK('시간선택완료')],
  ['상담확정', seed({ 현재단계: '상담확정' }), BK('확정')],
  ['시착(동의요청)', seed({ 현재단계: '시착', 시착동의상태: '동의요청' }), BK('확정')],
  ['시착(동의완료)', seed({ 현재단계: '시착', 시착동의상태: '동의완료' }), BK('확정')],
  ['상담완료', seed({ 현재단계: '상담완료', 시착동의상태: '동의완료' }), BK('확정')],
  ['계약발송', seed({ 현재단계: '상담완료', 시착동의상태: '동의완료', 계약상태: '발송' }), BK('확정')],
  ['계약완료(입금대기)', seed({ 현재단계: '계약완료', 계약상태: '서명완료', 계약서명일시: stamp, 입금상태: '완료신호', 입금자명: '정희준' }), BK('확정')],
  ['★계약완료인데 입금은 확인됨(신고 사례)', seed(Object.assign({ 현재단계: '계약완료' }, PAID)), BK('확정'), ['단계 맞추기 · 입금완료로']],
  ['입금완료', seed(Object.assign({ 현재단계: '입금완료' }, PAID)), BK('확정')],
  ['★입금완료·제작 미진입', seed(Object.assign({ 현재단계: '입금완료' }, ALLPAID)), BK('확정')],
  ['제작중', seed(Object.assign({ 현재단계: '제작중' }, ALLPAID)), BK('확정')],
  ['예식완료(링크 전)', seed(Object.assign({ 현재단계: '예식완료' }, ALLPAID)), BK('확정')],
  ['예식완료(선택완료)', seed(Object.assign({ 현재단계: '예식완료', 결과물상태: '선택완료' }, ALLPAID, LINKS)), BK('확정')],
  ['예식완료(컨펌완료)', seed(Object.assign({ 현재단계: '예식완료', 결과물상태: '컨펌완료' }, ALLPAID, LINKS)), BK('확정')],
  ['결과물전달(후기 대기)', seed(Object.assign({ 현재단계: '결과물전달', 결과물상태: '전달완료', 설문상태: '대기' }, ALLPAID, LINKS)), BK('확정')],
  ['★후기 단계', seed(Object.assign({ 현재단계: '후기', 결과물상태: '전달완료', 설문상태: '대기' }, ALLPAID, LINKS)), BK('확정')],
  ['★후기 단계(결과물 미완)', seed(Object.assign({ 현재단계: '후기', 결과물상태: '선택완료', 설문상태: '대기' }, ALLPAID, LINKS)), BK('확정')],
  ['취소(환불 대기)', seed(Object.assign({ 현재단계: '취소' }, PAID)), BK('취소')],
  ['노쇼', seed({ 현재단계: '노쇼' }), BK('확정')],
  ['미계약', seed({ 현재단계: '미계약' }), BK('확정')],
  ['스냅 촬영확정', seed({ 현재단계: '촬영확정', 상품타입: '웨딩스냅', 계약총액: 1200000 }), BK('확정')],
  ['스냅 계약완료', seed({ 현재단계: '계약완료', 상품타입: '웨딩스냅', 계약총액: 1200000, 계약상태: '서명완료', 계약서명일시: stamp, 입금상태: '완료신호', 입금자명: '정희준' }), BK('확정')],
  ['스냅 입금완료', seed(Object.assign({ 현재단계: '입금완료', 상품타입: '웨딩스냅', 계약총액: 1200000 }, PAID)), BK('확정')],
  /* ★[RESYNC_SNAP_FLOW] 스냅이 「촬영확정」에 입금확인인 채 갇힌 자리 — 이 화면의 유일한 문이
     상품 흐름을 잘못 읽어 스냅에게만 닫혀 있었다. 여기 못 박아 다시 닫히지 않게 한다. */
  ['★스냅 촬영확정인데 입금은 확인됨', seed(Object.assign({ 현재단계: '촬영확정', 상품타입: '웨딩스냅', 계약총액: 1200000 }, PAID)), BK('확정'), ['단계 맞추기 · 입금완료로']],
  ['스냅 촬영완료', seed(Object.assign({ 현재단계: '촬영완료', 상품타입: '웨딩스냅', 계약총액: 1200000, 결과물상태: '컨펌완료' }, PAID, LINKS)), BK('확정')],
  ['스냅 결과물전달', seed(Object.assign({ 현재단계: '결과물전달', 상품타입: '웨딩스냅', 계약총액: 1200000, 결과물상태: '전달완료', 설문상태: '대기' }, PAID, LINKS)), BK('확정')],
];

let CUR = CASES[0];
const HOME = { ok: true, name: '점검', queue: [], results: [], pipeline: {}, survey: [], blocks: [],
  stageFlow: G.STAGE_FLOW, stageEx: G.STAGE_EXCEPTIONS };
function serverCall(p) {
  try {
    if (p.action !== 'adminCall') return { ok: true };
    if (p.fn === 'adminHome') return HOME;
    world(Object.assign({}, CUR[1]), Object.assign({}, CUR[2]));
    G.setCustomerStage = REAL_SET_STAGE;
    if (typeof G[p.fn] !== 'function') return { ok: false, error: '없는 함수: ' + p.fn };
    const r = G[p.fn].apply(null, p.args || []);
    return r === undefined ? { ok: true } : r;
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}
/* 값이 없어 나는 거부인가(=화면 모달이 채울 것) — 그러면 어긋남이 아니다 */
const INPUT_ERR = /입력해 주세요|선택해 주세요|올바르지 않|올바른 주소|첨부해 주세요|용량|너무 (커|길)/;

const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', SITE], { stdio: 'ignore' });
process.on('exit', () => { try { srv.kill(); } catch {} });
await new Promise((r) => setTimeout(r, 1500));
const eng = await launchBrowser();
if (!eng) { console.log('브라우저 없음 — 건너뜀'); srv.kill(); process.exit(0); }

const { page, errors } = await eng.newPage({ port: PORT, viewport: { width: 430, height: 1400 } });
await page.route('**script.google.com**', async (route) => {
  let p = {}; try { p = JSON.parse(route.request().postData() || '{}'); } catch {}
  await route.fulfill({ status: 200, contentType: 'application/json',
    headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(serverCall(p)) });
});
await page.addInitScript(() => { localStorage.setItem('me_admin_token', 'CHK-TOKEN'); });
await page.goto(`http://localhost:${PORT}/admin.html`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(700);

console.log('[보이는 버튼을 실제로 눌러 본다 — 단계별]');
for (const c of CASES) {
  CUR = c;
  await page.evaluate((code) => window.openDetail(code, 'home'), CODE);
  await page.waitForTimeout(260);
  const acts = await page.evaluate(() => Array.from(document.querySelectorAll('[data-da]'))
    .filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0; })
    .map((b) => ({ a: b.getAttribute('data-da'), t: (b.textContent || '').trim() })));
  const bad = [];
  for (const it of acts) {
    const base = String(it.a).split(':')[0];
    if (NO_SERVER.indexOf(base) !== -1) continue;
    const fn = fnFor(it.a);
    if (!fn) { unknown.push(`${c[0]} · ${it.a}(${it.t})`); continue; }
    world(Object.assign({}, c[1]), Object.assign({}, c[2]));
    G.setCustomerStage = REAL_SET_STAGE;
    let r, threw = '';
    try { r = G[fn] ? G[fn].apply(null, [CODE].concat((ARGS[fn] || (() => []))(it.a))) : { ok: false, error: '함수 없음: ' + fn }; }
    catch (e) { threw = String((e && e.message) || e); }
    if (threw) { bad.push(`${it.t}(${fn}) → 예외 ${threw.slice(0, 60)}`); continue; }
    if (r && r.ok === false && !INPUT_ERR.test(String(r.error || ''))) {
      bad.push(`${it.t}(${fn}) → ${String(r.error || '').slice(0, 80)}`);
    }
  }
  ok(bad.length === 0, `${c[0]} — 보이는 버튼 ${acts.length}개가 전부 눌린다`, bad.join('\n       '));
  /* ★«보이는 버튼이 되는가»만 보면 **없는 버튼**은 영원히 안 걸린다 — 그게 이번 사고의 모양이다.
     갇힌 자리에는 «반드시 있어야 하는 문»을 이름으로 못 박는다. */
  if (c[3]) for (const need of c[3]) {
    ok(acts.some((a) => a.t === need), `${c[0]} — 「${need}」 버튼이 있다`,
      '보이는 버튼: ' + acts.map((a) => a.t).join(' · '));
  }
}

console.log('\n[대응표에서 못 찾은 버튼 — 검사가 «못 잰» 것]');
const uq = [...new Set(unknown)];
ok(uq.length === 0, '모든 버튼이 서버 함수와 이어진다', uq.slice(0, 12).join('\n       '));
ok((errors || []).length === 0, '브라우저 콘솔 오류 0건', String((errors || []).length));
console.log(`\n결과 — ${fail ? '실패 ' + fail + '건' : '실패 0건 (전부 통과)'}`);
await eng.close?.(); srv.kill();
process.exit(fail ? 1 : 0);
