// [B19_LOCK 2026-10-09] 공개 입구(google.script.run) 잠금 점검 — 사장님 «바로 막기»
//
// 왜: GAS 함수 이름이 `_` 로 끝나지 않으면 HTML 서비스 화면의 `google.script.run` 으로도 부를 수 있다(구글 규칙).
//     그래서 관리 · 편집기 도구는 _requireAdmin 으로 잠그고 · 서명 · 열쇠 · 발송 함수는 밑줄 이름으로 둔다(기획 §16-4).
//
// 지키는 것
//   1) 밑줄 이름: 옛 공개 이름이 함수로 남아 있으면 빨강 · 새 밑줄 이름이 없으면 빨강
//   2) 잠금: 관리 · 편집기 도구(LOCKED)의 첫 문장이 _requireAdmin( 이 아니면 빨강
//   3) adminCall 의 FNS 에 들어간 함수는 모두 _requireAdmin 을 지난다(FNS_LATER 만 예외 · 1-s 둘째 조각 _gsr_)
//   4) `_AUTHED = true` 는 정해진 곳에서만 · 메일 단추 · 카드 길은 finally 로 되돌린다
//   5) 행동: 소유자가 아니면 잠긴 함수가 «관리자 전용»으로 막히고 · 소유자 · _AUTHED 면 지난다
//      메일 단추(servePayConfirm)는 서명이 맞으면 확인 함수까지 가고 창이 닫힌다 · 서명이 틀리거나 기한이 지나면 안 닿는다
//   6) 돌연변이: 1~4 를 일부러 깨뜨린 원문에서 빨강이 되는지 스스로 본다(통과만 하는 검사는 죽은 검사다)
//   ── 둘째 조각 [GSR_GATE] ──
//   7) 모든 공개 함수의 첫 줄은 넷 중 하나: 입구 `_SRV = true` · 예약 실행 `_trigIn_(` · 관리 `_requireAdmin(` · 그 밖 `_gsr_()` (OPEN 만 예외)
//   8) `_SRV = true` 는 입구 다섯에서만 · `_TRUST = true` 는 _trigIn_ 에서만 · adminCall 은 _adminTokenCheck_(토큰을 스스로)
//   9) 행동: 익명이면 운영 도우미가 «허용되지 않은 요청»으로 막힌다 · 예약 실행 확인(아이디 · 편집 이벤트 · 소유자 · 배우기 전 · 배운 뒤)
//      · 토큰 없는 adminCall 은 _AUTHED 가 켜져 있어도 FNS 를 안 돈다 · doPost(action=adminCall) 도 같다
//  10) 돌연변이: 문을 활짝 열거나(_gsr_ · _trigIn_ 이 다 통과) 한 줄을 빼면 빨강이 되는지
//  11) [OWNER_SELF] 편집기 소유자 = 서버 길 밖 · 실행한 사람과 권한 주인이 같은 실행(목록에 없는 편집기 계정도 지난다)
//      · 웹 앱 화면의 다른 계정 · 익명 · 권한 주인을 못 읽음은 막힌다 · 서버 길 안에서는 소유자 신원으로도 토큰 없이 못 지난다 · 돌연변이 셋
//
// 종료: 0 통과 · 1 빨강 · 2 재지 못함(브라우저가 필요 없는 검사라 merge-guard 는 2 도 빨강으로 친다)
import { makeSandbox, loadGas } from './gas-lint.mjs';

const RENAMED = ['getSecret', 'sign', 'verifySig', 'actionUrl', 'cancelPageUrl', 'makeResetSig', 'verifyResetSig',
  '_nfPayConfirmAction', '_payCfg', '_nfProps', '_vcCfg', '_depositCardConfirm', 'morningBriefData', 'monthBusinessData',
  'sendConfirmEmail', 'sendCancelEmail', 'sendSignupEmail', 'sendFindCodeEmail', 'sendFindCodeKakao', 'sendResetPwEmail',
  '_kakaoSend', '_nfCustomerEmailFallback', '_ltSendToRecipients', '_resolveAdmin'];   // _resolveAdmin = 둘째 조각에서 밑줄 안쪽으로(토큰 → 관리자)

// 관리 화면만 부르는 함수 · 그 안쪽 · 편집기(소유자) 도구 — 첫 문장이 _requireAdmin() 이어야 한다
const LOCKED = `adminFittingDoc _setContactCore _adminIssueCashReceiptCore _adminUndoCashReceiptCore _undoConfirmCore _adminLock _resultLinkCheck _clearForwardData _resetConsultBooking _rbCalRetitle _adminUndoRefundedCore _adminMarkRefundedCore
adminListLeads adminResolveLead adminStartRetouch _nfHoldDrop solapiUsageSummary adminErrLog
aiTestScenarios aiTestScenariosSave aiKbNoteList aiKbNoteAdd aiKbNoteSetActive aiKbNoteDelete aiQuestionResolve aiQuestionReport aiTestRunSave aiBudgetGet aiBudgetSet aiSafetyNow aiSafetyHistory aiDigestPreview aiFactsList aiFactSet aiFactDelete aiFactHistory aiFactRollback aiRegList aiRegAdd aiRegSetActive aiRegDelete aiDraftAnswer adminListAiHandoffs adminResolveAiHandoff
setupAdmins setAdminAccount markConsultDone addProposalMemoColumn sendUrlEmail sendNewInquiryEmail diagnoseEmail cancelByRow seedAvailabilityRange seedWeekdaySlots seedWeekendSlots seedAllDaysUntil2027 seedWeekdaySlotsUntil2027 seedWeekendSlotsUntil2027 setupConsultation formatConsultationSheet
setupCustomers formatCustomersSheet findCustomerByEmail previewStaleCustomers setupAllTriggers addBalanceColumns checkProdCapOverflow addProdTrackColumns addGuideTokenColumn previewRitualFiles vcLastErrors previewVoiceClones vcSelfTest addGuestPhotoColumns purgeGuestPhotos purgeGuestPhotosApply previewSnapRefs addResultSelectionColumns backfillProduceStage backfillProduceStageApply
previewCoupleData letterMigrate aw_setKey auditDineDb setupAwAudit collectDinePool collectDinePoolDeep
platformSelfTest testSignupSignature testSignupSnap _testSignup testLoginRoundTrip acctDump resetDbgRun resetDbg pwFixRun pwSet pwDiagRun pwDiag adminSmokeTest testMemoNotLeaked adminReadCheck adminActionCheck
notifyTestAdminSms notifyTestCustomerByCode notifyTestKakao notifyTestKakaoAll addKakaoTemplate addT17 testKakaoT17 testKakaoAll setKakaoTemplates _nfTplMerge importKakaoTemplates _notifyCustomerEmail ZZ_kakaoTestAll
aiMorningPreview aiHandoffNightFlush aiHandoffReminder dumpPendingAiHandoff clearAllPendingAiHandoff ZZ_tossPing
adminConfirmBalance _adminConfirmBalanceCore adminConfirmMid _adminConfirmMidCore adminConfirmMidBalance _adminConfirmMidBalanceCore adminConfirmExtra _confirmDepositCore
aiCostSummary24h aiQuestionLog`.split(/\s+/).filter(Boolean);

// FNS 에 있지만 서버 길(예약 실행 · doPost)에서도 부르는 «두 쓰임» — _requireAdmin 대신 첫 줄 _gsr_() 로 닫는다. 여기 이름을 늘리지 말 것.
const FNS_LATER = ['aiAlertAdmin'];
// 입구(공개 화면 · HTTP 가 부르는 다섯) · 첫 줄을 고르지 않는 진단(편집기 전용 · 읽기만) · 문 자체
const ENTRY = ['doGet', 'doPost', 'submitApplication', 'submitSchedule', 'submitProposal', 'mailButtonGo'];   // mailButtonGo = 메일 단추 확인 화면의 단추 [MAIL_BTN_CONFIRM]
const OPEN = ['deployCheck', 'deployStampCheck', 'contractCheck', 'contractCheckHelp', 'notifySetupCheck', 'checkCustomerHeaderOrder', 'sendMorningBrief', '_requireAdmin'];
// `_AUTHED = true` 를 써도 되는 곳 — 토큰 · 서명 · 토스 승인 · 예약 실행을 확인한 뒤에만
const AUTHED_OK = ['adminCall', 'morningBriefData_', '_payConfirmRun_', 'handleCardConfirm'];   // [MAIL_BTN_CONFIRM] 메일 단추의 처리는 단추를 누른 뒤(_payConfirmRun_)
const AUTHED_RESTORE = ['_payConfirmRun_', 'handleCardConfirm', 'adminCall', 'morningBriefData_'];   // [AUTHED_RESTORE] 창은 «이전 값»으로 닫는다
// [DIAG_OWNER_ONLY] 편집기 진단 — 첫 줄에서 소유자가 아니면 돌려보낸다(공개 화면에서 돌지 않게 · admin.gs 가 없으면 진단은 돈다)
const DIAG = ['deployCheck', 'deployStampCheck', 'contractCheck', 'contractCheckHelp', 'notifySetupCheck', 'checkCustomerHeaderOrder'];

const errs = [];
const bad = (m) => errs.push(m);

const { sandbox: G, errors } = loadGas(makeSandbox(), { srv: false });   // 공개 화면(익명)을 흉내 낸다 — 서버 길 표를 켜지 않는다
if (errors.length) { console.log('━━ gsr-guard — GAS 로드 실패 · 재지 못했습니다: ' + errors[0].file + ' ' + errors[0].message); process.exit(2); }
const SRC = {};
for (const k of Object.keys(G)) { if (typeof G[k] === 'function') { try { SRC[k] = Function.prototype.toString.call(G[k]); } catch (e) {} } }
if (!SRC.adminCall || !SRC._requireAdmin || !SRC.servePayConfirm || !SRC.mailButtonGo || !SRC._payConfirmRun_ || !SRC._gsr_ || !SRC._trigIn_ || !SRC.setupAllTriggers) { console.log('━━ gsr-guard — adminCall · _requireAdmin · servePayConfirm · _gsr_ · _trigIn_ · setupAllTriggers 중 하나를 못 찾았습니다 · 재지 못했습니다'); process.exit(2); }
// 예약 실행 = setupAllTriggers 의 plan 표 + 따로 거는 둘(월간 장소 점검 · 상담 시트 편집)
const TRIG = [...new Set([...SRC.setupAllTriggers.matchAll(/fn:\s*'([\w$]+)'/g)].map((m) => m[1]).concat(['awMonthlyAudit', 'onConsultEdit']))];
if (TRIG.length < 10) { console.log('━━ gsr-guard — 예약 실행 표를 ' + TRIG.length + '개만 읽었습니다 · 재지 못했습니다'); process.exit(2); }

// ── 정적 검사(돌연변이 시험이 같은 함수를 다시 부른다) ──
function staticChecks(src) {
  const out = [];
  for (const n of RENAMED) {
    if (src[n] !== undefined) out.push(`밑줄 이름: ${n} 이 공개 이름으로 남아 있다(공개 화면에서 부를 수 있다) — ${n}_ 로`);
    if (src[n + '_'] === undefined) out.push(`밑줄 이름: ${n}_ 가 없다`);
  }
  const first = /^function\s+[\w$]+\s*\([^)]*\)\s*\{\s*_requireAdmin\(\s*\)\s*;/;
  for (const n of LOCKED) {
    if (src[n] === undefined) { out.push(`잠금: ${n} 함수가 없다(이름이 바뀌었으면 이 목록도 같은 커밋에서)`); continue; }
    if (!first.test(src[n])) out.push(`잠금: ${n} 의 첫 문장이 _requireAdmin() 이 아니다`);
  }
  const fm = /var\s+FNS\s*=\s*\{([\s\S]*?)\};/.exec(src.adminCall || '');
  if (!fm) out.push('FNS: adminCall 안에서 FNS 표를 못 찾았다');
  else {
    const body = fm[1].replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ');   // 주석 속 «{ok:false}» 같은 글을 짝으로 읽지 않게
    const pairs = [...body.matchAll(/([\w$]+)\s*:\s*([\w$]+)/g)];
    if (pairs.length < 50) out.push(`FNS: 표에서 ${pairs.length}개만 읽었다(모양이 바뀌었다)`);
    for (const [, key, val] of pairs) {
      if (FNS_LATER.includes(val)) continue;
      if (src[val] === undefined) { out.push(`FNS: ${key} → ${val} 함수가 없다`); continue; }
      if (!/_requireAdmin\(/.test(src[val])) out.push(`FNS: ${key} → ${val} 이 _requireAdmin 을 지나지 않는다(공개 화면에서 바로 부를 수 있다)`);
    }
  }
  for (const [n, s] of Object.entries(src)) {
    if (/\b_AUTHED\s*=\s*true\b/.test(s) && !AUTHED_OK.includes(n)) out.push(`_AUTHED: ${n} 이 관리자 권한을 켠다(정해진 곳만 · ${AUTHED_OK.join(' · ')})`);
  }
  for (const n of AUTHED_RESTORE) {
    const s = src[n] || '';
    if (!/finally\s*\{[^}]*_AUTHED\s*=\s*_authPrev/.test(s)) out.push(`_AUTHED: ${n} 이 finally 에서 창을 닫지 않는다`);
  }
  for (const n of DIAG) {
    const m = /^function\s+[\w$]+\s*\([^)]*\)\s*\{\s*([^\n]*)/.exec(src[n] || '');
    if (!m || !/^if \(typeof _effectiveEmail_ === 'function' && !_isOwnerRun_\(\)\)/.test(m[1])) out.push(`진단: ${n} 의 첫 줄이 «소유자만»(_isOwnerRun_) 이 아니다 [DIAG_OWNER_ONLY]`);
  }
  // ── 둘째 조각 [GSR_GATE] — 모든 공개 함수의 첫 줄 ──
  const head = (s) => { const m = /^function\s+[\w$]+\s*\([^)]*\)\s*\{((?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*)([^;\n]*)/.exec(s || ''); return m ? m[2] : ''; };   // 여는 괄호 뒤 주석은 건너뛰고 첫 문장
  for (const [n, s] of Object.entries(src)) {
    if (n.endsWith('_') || !/^function\b/.test(s)) continue;
    const h = head(s);
    if (ENTRY.includes(n)) { if (!/^_SRV\s*=\s*true$/.test(h)) out.push(`첫 줄: 입구 ${n} 이 _SRV = true 로 시작하지 않는다`); continue; }
    if (TRIG.includes(n)) { if (!/^_trigIn_\(arguments\[0\]\)$/.test(h)) out.push(`첫 줄: 예약 실행 ${n} 이 _trigIn_(arguments[0]) 으로 시작하지 않는다`); continue; }
    if (OPEN.includes(n)) continue;
    if (FNS_LATER.includes(n)) { if (!/^_gsr_\(\)$/.test(h)) out.push(`첫 줄: ${n} 이 _gsr_() 로 시작하지 않는다`); continue; }
    if (/^_gsr_\(\)$/.test(h)) continue;
    if (/^_requireAdmin\(/.test(h)) continue;   // [GSR_GATE] 관리 함수도 «첫 문장»이 문이어야 한다(쓰기 뒤에 문을 두면 그 전 줄이 먼저 돈다)
    out.push(`첫 줄: ${n} 이 넷(_SRV · _trigIn_ · _requireAdmin · _gsr_) 중 무엇으로도 시작하지 않는다 — 공개 화면에서 바로 부를 수 있다`);
  }
  for (const [n, s] of Object.entries(src)) {
    if (/\b_SRV\s*=\s*true\b/.test(s) && !ENTRY.includes(n)) out.push(`_SRV: ${n} 이 서버 길 표를 켠다(입구 다섯만)`);
    if (/\b_TRUST\s*=\s*true\b/.test(s) && n !== '_trigIn_') out.push(`_TRUST: ${n} 이 예약 실행 표를 켠다(_trigIn_ 만)`);
    if (/\b_IN_POST\s*=\s*true\b/.test(s) && n !== 'doPost') out.push(`_IN_POST: ${n} 이 doPost 길 표를 켠다(doPost 만 · ENTRY_ARGS_SRV)`);
  }
  // [ENTRY_ARGS_SRV] 서버 쪽 인자(개인코드 · 가예약 · 로그인 길 표)는 doPost 길에서만 — 입구가 첫 줄 다음에 스스로 지운다
  if (!/^function\s+doPost\s*\([^)]*\)\s*\{\s*_SRV\s*=\s*true;\s*_IN_POST\s*=\s*true;/.test(src.doPost || '')) out.push('입구: doPost 가 첫 줄에서 _IN_POST 를 켜지 않는다(가입 길의 개인코드를 못 받는다)');
  if (!/if \(!_IN_POST && !_ownerRunNow_\(\)\) personalCode = '';/.test(src.submitApplication || '')) out.push('입구: submitApplication 이 화면에서 온 개인코드를 지우지 않는다(남의 예약에 묶인다) [ENTRY_ARGS_SRV]');
  if (!/if \(!_IN_POST && !_ownerRunNow_\(\)\) \{ hold = null; cashReceipt = ''; payer = ''; payBy = ''; viaSession = false; \}/.test(src.submitSchedule || '')) out.push('입구: submitSchedule 이 화면에서 온 서버 쪽 인자를 지우지 않는다 [ENTRY_ARGS_SRV]');
  // [MAIL_BTN_CONFIRM] 메일 단추 주소(GET)는 확인 화면만 — 처리는 단추(mailButtonGo)를 눌러야
  if (/_AUTHED|adminConfirm|_confirmDepositCore|_payConfirmRun_/.test((src.servePayConfirm || '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''))) out.push('메일 단추: 주소를 여는 것(servePayConfirm)이 바로 처리한다 — 확인 화면만 보여야 한다');
  if (/\bact(Approve|Accept)\s*\(/.test((src.handleAction || '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''))) out.push('메일 단추: 주소를 여는 것(handleAction)이 승인 · 수락을 바로 처리한다 — 확인 화면만 보여야 한다');
  if (!/^function\s+adminCall\s*\([^)]*\)\s*\{\s*(_gsr_\(\);\s*)?_adminTokenCheck_\(token\);/.test(src.adminCall || '')) out.push('adminCall: 앞머리가 _adminTokenCheck_(token) 이 아니다(토큰을 스스로 봐야 한다)');
  if (/_requireAdmin\(/.test((src.adminCall || '').replace(/\/\/[^\n]*/g, ''))) out.push('adminCall: _requireAdmin 을 부른다(_AUTHED 지름길)');
  if (/_AUTHED|_SRV|_TRUST/.test((src._adminTokenCheck_ || 'x').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''))) out.push('adminCall: _adminTokenCheck_ 가 표를 본다(토큰 · 소유자만 봐야 한다)');
  return out;
}
for (const m of staticChecks(SRC)) bad(m);

// ── 행동 ──
const OWNER = 'side.minds.1616@gmail.com';
const SELF_EDITOR = 'boss@momentedit.test';   // [OWNER_SELF] 목록에 없는 편집기 계정
const DEPLOYER = 'owner@sim.test';   // [OWNER_SELF] 웹 앱 화면은 배포한 계정의 권한으로 돈다
// setEmail(e) = 웹 앱 화면을 연 사람 e(권한 주인은 배포한 계정) · setEmail(e, e) = e 가 편집기에서 직접 돌린 실행
const setEmail = (e, eff = DEPLOYER) => { G._ACTIVE_EMAIL = null; G._EFFECTIVE_EMAIL = null; G._OWNER_RUN = null; G.Session = Object.assign({}, G.Session, { getActiveUser: () => ({ getEmail: () => e }), getEffectiveUser: () => ({ getEmail: () => eff }) }); };   // [OWNER_MEMO] 한 실행 안 기억을 지우고 바꾼다
const blocked = (fn) => { try { fn(); return false; } catch (e) { return /관리자 전용/.test(String(e && e.message)); } };
G._AUTHED = false;
setEmail('');                       // 공개 화면(익명) — 메일이 빈 글
for (const n of LOCKED) { if (typeof G[n] === 'function' && !blocked(() => G[n]())) bad(`행동: 익명 실행에서 ${n} 이 막히지 않는다`); }
if (!blocked(() => G._requireAdmin())) bad('행동: 익명 실행에서 _requireAdmin 이 지나간다');
setEmail('someone@example.com');    // 소유자 아닌 계정
if (!blocked(() => G.setAdminAccount('x', 'pw-123456', 'x'))) bad('행동: 소유자 아닌 계정이 setAdminAccount 를 지난다');
for (const n of RENAMED) { if (typeof G[n] === 'function') bad(`행동: ${n} 이 아직 전역 공개 함수다`); }
setEmail(OWNER);
try { G._requireAdmin(); } catch (e) { bad('행동: 소유자(편집기)인데 _requireAdmin 이 막는다 — ' + e.message); }
setEmail('');
G._AUTHED = true;
try { G._requireAdmin(); } catch (e) { bad('행동: _AUTHED 인데 _requireAdmin 이 막는다'); }
G._AUTHED = false;

// 메일 단추 — 주소를 열면 확인 화면만 · 단추(mailButtonGo)를 눌러야 확인 함수까지 가고 창이 닫힌다 [MAIL_BTN_CONFIRM]
// ★[SIG_FLIP_SURE 2026-10-09] 틀린 서명은 첫 글자를 «반드시 다른 글자»로 바꿔 만든다.
//   비밀값이 실행마다 새로 생겨 서명 첫 글자도 매번 다르다 — 'x' 로 덮으면 서명이 마침 x 로 시작할 때(약 64번에 한 번)
//   «틀린 서명»이 맞는 서명과 같아져 검사가 까닭 없이 붉어진다(PR #1148 첫 CI 가 그랬다 · 로컬 · CI 흉내는 초록).
const wrongSig = (s) => { const w = (s[0] === 'A' ? 'B' : 'A') + s.slice(1); if (w === s) throw new Error('wrongSig: 같은 서명'); return w; };
{
  const hits = [];
  const keep = {}; for (const k of ['_adminConfirmMidCore', 'infoPage', 'actApprove', 'actAccept', 'findRowByToken', 'getSheet', 'buildHeaderIndex', 'coupleNames', 'prettyDate']) keep[k] = G[k];
  G._adminConfirmMidCore = (c) => { hits.push({ c, authed: G._AUTHED }); return { ok: true }; };
  const exp = String(Date.now() + 86400000);
  G._SRV = true;   // 메일 단추 주소는 doGet(입구)이 부른다 — 서버 길 안을 흉내 낸다(관리자 권한은 아니다)
  const sig = G.sign_('ME0001', 'payconfirm:mid:' + exp);
  G.servePayConfirm({ code: 'ME0001', m: 'mid', exp, sig });
  if (hits.length) bad('메일 단추: 주소를 열기만 했는데 입금 확인이 처리됐다(B11)');
  G._SRV = false;
  const r1 = G.mailButtonGo({ action: 'payconfirm', code: 'ME0001', m: 'mid', exp, sig });
  if (!(hits.length === 1 && hits[0].c === 'ME0001' && hits[0].authed === true && r1 && r1.ok)) bad('메일 단추: 단추를 눌렀는데 확인 함수에 닿지 않는다(창이 안 열린다)');
  if (G._AUTHED !== false) bad('메일 단추: 처리 뒤 _AUTHED 가 닫히지 않는다');
  hits.length = 0;
  G.mailButtonGo({ action: 'payconfirm', code: 'ME0001', m: 'mid', exp, sig: wrongSig(sig) });
  if (hits.length) bad('메일 단추: 틀린 서명으로 확인 함수에 닿는다');
  const old = String(Date.now() - 1000);
  G._SRV = true; const oldSig = G.sign_('ME0001', 'payconfirm:mid:' + old); G._SRV = false;
  G.mailButtonGo({ action: 'payconfirm', code: 'ME0001', m: 'mid', exp: old, sig: oldSig });
  if (hits.length) bad('메일 단추: 기한 지난 링크로 확인 함수에 닿는다');
  G._adminConfirmMidCore = () => { throw new Error('core boom'); };
  try { G.mailButtonGo({ action: 'payconfirm', code: 'ME0001', m: 'mid', exp, sig }); } catch (e) {}
  if (G._AUTHED !== false) bad('메일 단추: 확인 함수가 던져도 _AUTHED 가 닫혀야 한다');
  // 승인 · 수락 — 주소를 열면 확인 화면만 · 단추를 눌러야 actApprove · actAccept
  let acts = [];
  G.actApprove = () => { acts.push('approve'); return G.infoPage('승인 완료', 'x', true); };
  G.actAccept = () => { acts.push('accept'); return G.infoPage('확정 완료', 'x', true); };
  G.findRowByToken = () => ({ num: 2, get: (h) => ({ '선택날짜': '2026-11-01', '선택시간': '10:00', '변경제안날짜': '2026-11-02', '변경제안시간': '11:00' }[h] || '') });
  G.getSheet = () => ({}); G.buildHeaderIndex = () => ({}); G.coupleNames = () => '신랑 · 신부'; G.prettyDate = (d) => String(d);
  G._SRV = true;
  const tok = 'tok-approve-1', aSig = G.sign_(tok, 'approve'), cSig = G.sign_(tok, 'accept');
  G.handleAction({ token: tok, action: 'approve', sig: aSig });
  G.handleAction({ token: tok, action: 'accept', sig: cSig });
  if (acts.length) bad('메일 단추: 주소를 열기만 했는데 승인 · 수락이 처리됐다(B11)');
  G._SRV = false;
  const r2 = G.mailButtonGo({ action: 'approve', token: tok, sig: aSig });
  const r3 = G.mailButtonGo({ action: 'accept', token: tok, sig: cSig });
  if (acts.join(',') !== 'approve,accept' || !(r2 && r2.ok && r2.title === '승인 완료') || !(r3 && r3.ok)) bad('메일 단추: 승인 · 수락 단추를 눌렀는데 처리 · 결과가 맞지 않는다');
  acts = [];
  G.mailButtonGo({ action: 'approve', token: tok, sig: wrongSig(aSig) });
  if (acts.length) bad('메일 단추: 틀린 서명으로 승인이 처리됐다');
  // [MAIL_FAIL_WORDS] 예상 못 한 오류 — 원문 대신 받는 사람 말 + 코드(B9 · P9) · 고객 단추(수락)에 «관리자 페이지»가 나오면 안 된다
  G.actAccept = () => { throw new Error('accept boom'); };
  const r4 = G.mailButtonGo({ action: 'accept', token: tok, sig: cSig });
  if (!(r4 && r4.ok === false && /\(코드 B9/.test(r4.body || '') && !/관리자 페이지/.test(r4.body || '') && !/accept boom/.test(r4.body || ''))) bad('메일 단추: 고객 단추(수락)의 실패 글이 고객 말 · 코드(B9)가 아니거나 오류 원문이 보인다');
  G._adminConfirmMidCore = () => { throw new Error('core boom'); };
  const r5 = G.mailButtonGo({ action: 'payconfirm', code: 'ME0001', m: 'mid', exp, sig });
  if (!(r5 && r5.ok === false && /\(코드 P9/.test(r5.body || '') && !/core boom/.test(r5.body || ''))) bad('메일 단추: 입금 확인 단추의 실패 글에 코드(P9)가 없거나 오류 원문이 보인다');
  // [BTN_SAFE_ARGS] 서명 없는 이상한 값(글자로 바꾸다 던지는 꼴)은 오류기록 · 경보 메일 없이 거절 · 서명한 처리에서 난 오류는 한 번만 기록
  { const realRec = G._errRecord; let recs = 0; G._errRecord = () => { recs++; };
    const rz = G.mailButtonGo({ action: 'accept', token: { toString: 1 }, sig: { toString: 1 } });
    if (!(rz && rz.ok === false) || recs) bad('메일 단추: 서명 없는 이상한 값이 오류기록을 남기거나 거절되지 않는다');
    recs = 0; G.mailButtonGo({ action: { toString: 1 } }); if (recs) bad('메일 단추: 이상한 action 값이 오류기록을 남긴다');
    G.actAccept = () => { throw new Error('accept boom'); }; recs = 0;
    const rs = G.mailButtonGo({ action: 'accept', token: tok, sig: cSig });
    if (recs !== 1) bad('메일 단추: 서명한 처리에서 난 오류를 정확히 한 번 기록하지 않는다(' + recs + '번)');
    if (!(rs && rs.retry === true)) bad('메일 단추: 예상 못 한 오류(9)인데 단추를 되살리라는 표(retry)가 없다 [MAIL_RETRY]');
    G._adminConfirmMidCore = () => { throw new Error('core boom'); }; recs = 0;
    G.mailButtonGo({ action: 'payconfirm', code: 'ME0001', m: 'mid', exp, sig });
    if (recs !== 1) bad('메일 단추: 서명한 입금 확인 처리에서 난 오류를 정확히 한 번 기록하지 않는다(' + recs + '번)');
    G._errRecord = realRec; }
  // [MAIL_RETRY] 입금 확인이 몰려(잠금 못 잡음) 실패하면 다시 누를 수 있게
  { const realLS = G.LockService; G.LockService = { getScriptLock: () => ({ waitLock() { throw new Error('busy'); }, tryLock: () => false, releaseLock() {}, hasLock: () => false }) };
    G._adminConfirmMidCore = () => ({ ok: true });
    const rb = G.mailButtonGo({ action: 'payconfirm', code: 'ME0001', m: 'mid', exp, sig });
    if (!(rb && rb.ok === false && rb.retry === true && /\(코드 P1\)/.test(rb.body || ''))) bad('메일 단추: 몰림(P1) 실패에 단추를 되살리라는 표(retry)나 코드가 없다');
    G.LockService = realLS; }
  for (const k of Object.keys(keep)) G[k] = keep[k];
  G._SRV = false; G._AUTHED = false;
}

// [AUTHED_RESTORE] 행동 — 관리자 권한 창은 «이전 값»으로 닫는다(바깥 창이 열려 있었으면 열린 채로)
{
  const realFL = G.aiFactsList, realHome = G.adminHome; let seen = null;
  G.aiFactsList = () => { seen = G._AUTHED; return { ok: true }; };
  G.adminHome = () => { seen = G._AUTHED; return { ok: false }; };
  for (const outer of [false, true]) {
    G._SRV = false; G._TRUST = false; G._AUTHED = outer; setEmail(SELF_EDITOR, SELF_EDITOR); seen = null;
    try { G.adminCall('', 'aiFactsList', []); } catch (e) {}
    if (seen !== true) bad('AUTHED_RESTORE: adminCall 안에서 관리자 창이 열리지 않았다');
    if (G._AUTHED !== outer) bad(`AUTHED_RESTORE: adminCall 뒤 관리자 창이 이전 값(${outer})으로 닫히지 않았다`);
    G._AUTHED = outer; seen = null;
    try { G.morningBriefData_(); } catch (e) {}
    if (seen !== true) bad('AUTHED_RESTORE: morningBriefData_ 안에서 관리자 창이 열리지 않았다');
    if (G._AUTHED !== outer) bad(`AUTHED_RESTORE: morningBriefData_ 뒤 관리자 창이 이전 값(${outer})으로 닫히지 않았다`);
  }
  G.aiFactsList = realFL; G.adminHome = realHome; G._AUTHED = false; setEmail('');
}

// [DIAG_OWNER_ONLY] 행동 — 익명(공개 화면)이면 진단 6개가 첫 줄에서 돌아간다 · 소유자(편집기)면 그 문을 지난다
{
  G._SRV = false; G._TRUST = false; G._AUTHED = false; setEmail('');
  for (const n of DIAG) { let r; try { r = G[n](); } catch (e) { r = 'THROW ' + (e && e.message); } if (!/편집기 전용 진단/.test(String(r))) bad(`진단: 익명 실행에서 ${n} 이 돌아간다(편집기 전용이어야)`); }
  setEmail(OWNER); let r2; try { r2 = G.contractCheckHelp(); } catch (e) { r2 = 'THROW'; } if (/편집기 전용 진단/.test(String(r2))) bad('진단: 소유자(편집기)인데 contractCheckHelp 가 막힌다');
  // admin.gs 가 옛 판이면(새 소유자 판단 없음) 진단은 문 없이 돈다 — 그래야 deployCheck 가 «admin 옛 판»을 짚는다
  { const keepEE = G._effectiveEmail_; G._effectiveEmail_ = undefined; setEmail('someone@momentedit.test', DEPLOYER);
    let r3; try { r3 = G.contractCheckHelp(); } catch (e) { r3 = 'THROW'; }
    if (/편집기 전용 진단/.test(String(r3))) bad('진단: admin.gs 가 옛 판인데 진단이 문에 막힌다(admin 누락을 짚지 못한다)');
    G._effectiveEmail_ = keepEE; }
  setEmail('');
}

// [OWNER_SELF] 행동 — 편집기 소유자는 «서버 길 밖 · 자기 권한»으로 알아본다(목록에 없는 편집기 계정도) · 서버 길 안은 토큰만
const SELF = 'boss@momentedit.test';   // 목록에 없는 편집기 계정(사장님 편집기 계정이 그랬다)
function ownerChecks() {
  const out = [];
  const PPo = () => G.PropertiesService.getScriptProperties();
  const reset = () => { G._SRV = false; G._TRUST = false; G._AUTHED = false; setEmail(''); };
  const msgOf = (fn) => { try { fn(); return ''; } catch (e) { return String((e && e.message) || e); } };
  // ① 편집기 — 목록에 없어도 실행한 사람 = 권한 주인이면 지난다
  reset(); setEmail(SELF, SELF);
  if (msgOf(() => G._requireAdmin())) out.push('소유자: 목록에 없는 편집기 계정이 _requireAdmin 에서 막힌다(자기 권한 실행인데)');
  if (msgOf(() => G._gsr_())) out.push('소유자: 목록에 없는 편집기 계정이 _gsr_ 에서 막힌다');
  { let r = ''; try { r = String(G.contractCheckHelp()); } catch (e) { r = '편집기 전용 진단'; } if (/편집기 전용 진단/.test(r)) out.push('소유자: 목록에 없는 편집기 계정이 진단(contractCheckHelp)에서 막힌다'); }
  try { PPo().setProperty('TRIG_UID_OK', 'sim'); } catch (e) {}
  reset(); setEmail(SELF, SELF); if (msgOf(() => G._trigIn_(undefined))) out.push('소유자: 배운 뒤 목록에 없는 편집기 계정의 직접 실행을 _trigIn_ 이 막는다');
  // ② 웹 앱 화면의 다른 계정 · 익명 — 막힌다(배운 뒤 _trigIn_ 포함)
  for (const who of ['staff@momentedit.test', '']) {
    reset(); setEmail(who);
    if (!/관리자 전용/.test(msgOf(() => G._requireAdmin()))) out.push(`소유자: 웹 앱 화면의 «${who || '익명'}» 이 _requireAdmin 을 지난다`);
    if (!/허용되지 않은 요청/.test(msgOf(() => G._gsr_()))) out.push(`소유자: 웹 앱 화면의 «${who || '익명'}» 이 _gsr_ 를 지난다`);
    if (!/허용되지 않은 요청/.test(msgOf(() => G._trigIn_(undefined)))) out.push(`소유자: 웹 앱 화면의 «${who || '익명'}» 이 배운 뒤 _trigIn_ 을 지난다`);
    { let r = ''; try { r = String(G.contractCheckHelp()); } catch (e) { r = 'THROW'; } if (!/편집기 전용 진단/.test(r)) out.push(`소유자: 웹 앱 화면의 «${who || '익명'}» 이 진단을 돌린다`); }
  }
  try { PPo().deleteProperty('TRIG_UID_OK'); PPo().deleteProperty('TRIG_PROBE'); PPo().deleteProperty('TRIG_PROBE_X'); PPo().deleteProperty('TRIG_UID_MISS'); } catch (e) {}
  // ③ 권한 주인을 못 읽으면 닫힌다(목록에 없는 계정) · 그때는 어느 계정인지 가린 꼴로 알린다
  reset(); G._ACTIVE_EMAIL = null; G._EFFECTIVE_EMAIL = null;
  G.Session = Object.assign({}, G.Session, { getActiveUser: () => ({ getEmail: () => SELF }), getEffectiveUser: () => { throw new Error('읽기 실패'); } });
  { const m = msgOf(() => G._requireAdmin()); if (!/관리자 전용/.test(m)) out.push('소유자: 권한 주인을 못 읽었는데 목록에 없는 계정이 지난다(닫혀야 한다)'); else if (!/b…@momentedit\.test\)을 소유자로 확인하지 못했어요/.test(m)) out.push('소유자: 편집기에서 막힐 때 가린 계정 한 줄이 안 붙는다 — ' + m); }
  // ⑤ [OWNER_FIRST_ASK] 편집기 도구가 첫 줄에서 물은 뒤 안에서 입구 함수를 불러 _SRV 가 켜져도 끝까지 소유자 실행이다
  reset(); setEmail(SELF, SELF); msgOf(() => G._gsr_()); G._SRV = true;
  if (msgOf(() => G._requireAdmin())) out.push('소유자: 편집기 도구가 안에서 입구 함수를 부른 뒤(_SRV) _requireAdmin 이 막힌다 — 처음 물음에 정해야 한다');
  // ⑥ 기억 칸의 처음 값이 비어 있어도(빈 선언) 한 번은 묻는다
  reset(); G._ACTIVE_EMAIL = undefined; G._EFFECTIVE_EMAIL = undefined; G._OWNER_RUN = undefined;
  G.Session = Object.assign({}, G.Session, { getActiveUser: () => ({ getEmail: () => SELF }), getEffectiveUser: () => ({ getEmail: () => SELF }) });
  if (msgOf(() => G._gsr_())) out.push('소유자: 기억 칸의 처음 값이 비어 있으면(빈 선언) 편집기 계정이 막힌다');
  // ④ 서버 길 안 — 소유자 신원이어도 토큰 없이는 못 지난다 · 덧말도 안 붙는다
  const realFL = G.aiFactsList; let ran = 0;
  G.aiFactsList = () => { ran++; return { ok: true }; };
  for (const [who, eff] of [[DEPLOYER, DEPLOYER], [OWNER, DEPLOYER], [SELF, SELF]]) {
    reset(); setEmail(who, eff); G._SRV = true;
    const m = msgOf(() => G._requireAdmin());
    if (!/관리자 전용/.test(m)) out.push(`서버 길: 소유자 신원(${who})이면 _requireAdmin 을 토큰 없이 지난다`);
    else if (/지금 계정/.test(m)) out.push('서버 길: 관리 화면 요청의 «로그인이 필요» 글에 계정 덧말이 붙는다');
    if (!/관리자 전용/.test(msgOf(() => G._adminTokenCheck_('')))) out.push(`서버 길: 소유자 신원(${who})이면 _adminTokenCheck_ 를 토큰 없이 지난다`);
    try { G.adminCall('', 'aiFactsList', []); } catch (e) {}
    reset(); setEmail(who, eff);
    try { G.doPost({ parameter: {}, postData: { type: 'application/json', contents: JSON.stringify({ action: 'adminCall', token: '', fn: 'aiFactsList', args: [] }) } }); } catch (e) {}
  }
  if (ran) out.push(`서버 길: 소유자 신원으로 토큰 없이 FNS 가 ${ran}번 돌았다(adminCall · doPost)`);
  G.aiFactsList = realFL; reset();
  return out;
}
for (const m of ownerChecks()) bad(m);

// [OWNER_FIRST_ASK] 파일을 읽는 동안(전역) 소유자를 묻지 않는다 — 처음 물음이 서버 길 밖에서 굳으면 그 실행 끝까지 소유자로 남는다
{
  const sb = makeSandbox(); let calls = 0;
  sb.Session = Object.assign({}, sb.Session, { getActiveUser: () => { calls++; return { getEmail: () => OWNER }; }, getEffectiveUser: () => { calls++; return { getEmail: () => OWNER }; } });
  loadGas(sb, { srv: false });
  if (calls) bad(`소유자: 파일을 읽는 동안 소유자를 ${calls}번 물었다(전역에서 부르는 줄이 있다)`);
  if (sb._OWNER_RUN !== null || sb._ACTIVE_EMAIL !== null || sb._EFFECTIVE_EMAIL !== null) bad('소유자: 파일을 읽은 직후 기억 칸이 비어 있지 않다');
}

// ── 둘째 조각 행동 [GSR_GATE] ──
const HELPERS = Object.keys(SRC).filter((n) => !n.endsWith('_') && /^function\b/.test(SRC[n]) && /^function\s+[\w$]+\s*\([^)]*\)\s*\{\s*_gsr_\(\)/.test(SRC[n]));
const PP = () => G.PropertiesService.getScriptProperties();
// 돌연변이로 문을 열었을 때 몸통이 실제로 돌아도 안전한(짧고 쓰기 없는) 표본 — 전부를 돌리면 몸통이 돌며 멈춘다(실측)
const SAFE_SAMPLE = ['esc', 'jsonOut'];
function gateChecks(list) {
  const out = [];
  const reset = () => { G._SRV = false; G._TRUST = false; G._AUTHED = false; setEmail(''); };
  const gsrBlocked = (fn) => { try { fn(); return false; } catch (e) { return /허용되지 않은 요청/.test(String(e && e.message)); } };
  reset();
  let open = 0;
  for (const n of (list || HELPERS)) { reset(); if (!gsrBlocked(() => G[n]())) { open++; if (open <= 5) out.push(`행동: 익명 실행에서 운영 도우미 ${n} 이 막히지 않는다`); } }
  if (open > 5) out.push(`행동: 그 밖에 ${open - 5}개 더 막히지 않는다`);
  // 표가 켜지면 지난다
  for (const k of ['_SRV', '_TRUST', '_AUTHED']) { reset(); G[k] = true; try { G._gsr_(); } catch (e) { out.push(`행동: ${k} 인데 _gsr_ 가 막는다`); } }
  reset(); setEmail(OWNER); try { G._gsr_(); } catch (e) { out.push('행동: 소유자(편집기)인데 _gsr_ 가 막는다'); }
  // 예약 실행 확인
  const realST = G.ScriptApp;
  const clr = () => { for (const k of ['TRIG_UID_OK', 'TRIG_PROBE', 'TRIG_PROBE_X', 'TRIG_UID_MISS', 'TRIG_UIDS_KNOWN', 'TRIG_LIST_FAIL']) { try { PP().deleteProperty(k); } catch (e) {} } };
  G.ScriptApp = { getProjectTriggers: () => [{ getUniqueId: () => 'U1' }] };
  clr();
  reset(); try { G._trigIn_({}); if (G._TRUST !== true) out.push('예약 실행: 배우기 전에는 막지 않아야 한다(_TRUST 가 안 켜졌다)'); } catch (e) { out.push('예약 실행: 배우기 전인데 막았다 — 확인 전에 막으면 아침 보고 · 알림이 멈춘다'); }
  if (!PP().getProperty('TRIG_PROBE_X')) out.push('예약 실행: 배우기 전 호출의 모양을 적지 않았다(이벤트 없는 호출 → TRIG_PROBE_X)');
  // [TRIG_IN_WHY] 배우기 전 모양 기록은 누가(가린 메일) · 모양마다 따로 — 다른 계정의 호출이 앞 기록을 가리지 않게
  { setEmail('aa@x.test'); G._SRV = false; G._TRUST = false; try { G._trigIn_({}); } catch (e) {}
    const p1 = String(PP().getProperty('TRIG_PROBE_X') || '');
    setEmail('bb@x.test'); G._SRV = false; G._TRUST = false; try { G._trigIn_({}); } catch (e) {}
    const p2 = String(PP().getProperty('TRIG_PROBE_X') || '');
    if (!/ · 메일 a…@x\.test/.test(p1) || !/ · 메일 b…@x\.test/.test(p2)) out.push('예약 실행: 배우기 전 모양 기록에 누가인지 없거나 다른 계정의 기록이 6시간 가린다 — ' + p1 + ' / ' + p2);
    // [TRIG_PROBE_SLOT 라운드 6] 예약 실행 모양(triggerUid · authMode)은 TRIG_PROBE 칸 — 이벤트 없는 호출이 그 칸을 덮지 않는다
    clr(); setEmail(''); G._SRV = false; G._TRUST = false; try { G._trigIn_({ authMode: 'FULL', triggerUid: 'Z9' }); } catch (e) {}
    const t1 = String(PP().getProperty('TRIG_PROBE') || '');
    G._SRV = false; G._TRUST = false; try { G._trigIn_({}); } catch (e) {} try { G._trigIn_(undefined); } catch (e) {}
    const t2 = String(PP().getProperty('TRIG_PROBE') || '');
    if (!/uid 있음/.test(t1) || t2 !== t1 || !PP().getProperty('TRIG_PROBE_X')) out.push('예약 실행: 이벤트 없는 호출이 예약 실행 모양 기록(TRIG_PROBE)을 덮는다 — ' + t1 + ' / ' + t2);
    reset(); }
  // [TRIG_MISS_QUIET] 배우기 전 · 목록에 없는 아이디는 까닭을 남긴다 — 밖에서 온 글자는 영숫자만
  reset(); try { G._trigIn_({ triggerUid: 'NO<b>PE77' }); } catch (e) {}
  { const m0 = String(PP().getProperty('TRIG_UID_MISS') || ''); if (!/uid NObPE7 /.test(m0) || /[<>]/.test(m0)) out.push('예약 실행: 배우기 전 목록에 없는 아이디를 영숫자만으로 남기지 않았다 — ' + m0); }
  reset(); try { G._trigIn_({ triggerUid: 'U1' }); if (G._TRUST !== true) out.push('예약 실행: 진짜 아이디인데 _TRUST 가 안 켜졌다'); } catch (e) { out.push('예약 실행: 진짜 아이디를 막았다'); }
  if (!PP().getProperty('TRIG_UID_OK')) out.push('예약 실행: 진짜 아이디를 보고도 TRIG_UID_OK 를 안 적었다');
  if (PP().getProperty('TRIG_UID_MISS')) out.push('예약 실행: 배운 뒤에도 TRIG_UID_MISS 가 남아 있다(배우면 지운다)');
  if (!/U1/.test(String(PP().getProperty('TRIG_UIDS_KNOWN') || ''))) out.push('예약 실행: 진짜로 읽은 아이디를 알던 목록(TRIG_UIDS_KNOWN)에 더하지 않았다');
  reset(); if (!gsrBlocked(() => G._trigIn_({ triggerUid: 'FAKE' }))) out.push('예약 실행: 배운 뒤인데 가짜 아이디가 지난다');
  if (PP().getProperty('TRIG_UID_MISS')) out.push('예약 실행: 배운 뒤 가짜 아이디가 TRIG_UID_MISS 를 남긴다(«목록에 없음»은 배우기 전에만)');
  reset(); if (!gsrBlocked(() => G._trigIn_({}))) out.push('예약 실행: 배운 뒤인데 이벤트 없는 호출이 지난다');
  reset(); if (!list && !gsrBlocked(() => G.aiDaily())) out.push('예약 실행: 배운 뒤인데 aiDaily 를 공개로 부를 수 있다');
  reset(); try { G._trigIn_({ range: { getRow: () => 2 } }); } catch (e) { out.push('예약 실행: 시트 편집 이벤트를 막았다'); }
  reset(); setEmail(OWNER); try { G._trigIn_(undefined); } catch (e) { out.push('예약 실행: 소유자(편집기) 실행을 막았다'); }
  reset(); G._SRV = true; try { G._trigIn_(undefined); } catch (e) { out.push('예약 실행: 서버 길 안에서 부른 것을 막았다'); }
  // [TRIG_LIST_KNOWN] 목록을 못 읽으면 알던 목록으로 판정 — 진짜(U1)는 지나고 가짜는 막힌다 · 배운 뒤 아는 목록도 없으면 막고 TRIG_LIST_FAIL
  G.ScriptApp = Object.assign({}, realST, { getProjectTriggers: () => { throw new Error('일시 실패'); } });
  reset(); try { G._trigIn_({ triggerUid: 'U1' }); if (G._TRUST !== true) out.push('예약 실행: 목록을 못 읽을 때 알던 목록의 진짜 아이디에 _TRUST 가 안 켜졌다'); } catch (e) { out.push('예약 실행: 목록을 못 읽을 때 알던 목록의 진짜 아이디를 막았다'); }
  reset(); if (!gsrBlocked(() => G._trigIn_({ triggerUid: 'FORGED777' }))) out.push('예약 실행: 목록을 못 읽을 때 가짜 아이디가 지난다(알던 목록으로 판정해야)');
  try { PP().deleteProperty('TRIG_UIDS_KNOWN'); } catch (e) {}
  reset(); if (!gsrBlocked(() => G._trigIn_({ triggerUid: 'FORGED777' }))) out.push('예약 실행: 배운 뒤 아는 목록도 없는데 가짜 아이디가 지난다');
  if (!PP().getProperty('TRIG_LIST_FAIL')) out.push('예약 실행: 목록도 아는 목록도 없어 막았는데 TRIG_LIST_FAIL 을 안 남겼다');
  try { PP().deleteProperty('TRIG_UID_OK'); } catch (e) {}
  reset(); try { G._trigIn_({ triggerUid: 'U9' }); if (G._TRUST !== true) out.push('예약 실행: 배우기 전 목록 읽기 실패에 _TRUST 가 안 켜졌다'); } catch (e) { out.push('예약 실행: 배우기 전 목록 읽기 실패로 막았다(배우는 창에서는 막지 않는다)'); }
  // [TRIG_LIST_KNOWN] 목록을 새로 읽는 일은 1분에 5번까지 — 가짜 아이디로 밀어붙여도 · 한도를 다 쓴 뒤에도 진짜는 지난다
  { const realCS = G.CacheService, cm = new Map(); let reads = 0;
    G.CacheService = { getScriptCache: () => ({ get: (k) => (cm.has(k) ? cm.get(k) : null), put: (k, v) => cm.set(k, String(v)), remove: (k) => cm.delete(k), removeAll: () => cm.clear() }) };
    G.ScriptApp = { getProjectTriggers: () => { reads++; return [{ getUniqueId: () => 'U1' }]; } };
    clr(); PP().setProperty('TRIG_UID_OK', 'sim');
    for (let i = 0; i < 20; i++) { reset(); try { G._trigIn_({ triggerUid: 'FAKE' + i }); } catch (e) {} }
    if (reads > 5) out.push(`예약 실행: 가짜 아이디 20번에 목록을 ${reads}번 새로 읽었다(1분에 5번까지)`);
    reset(); try { G._trigIn_({ triggerUid: 'U1' }); } catch (e) { out.push('예약 실행: 읽기 한도를 다 쓴 뒤 진짜 아이디를 막았다'); }
    G.CacheService = realCS; }
  // [TRIG_LEARN_ANY] 배우기 전 · 기억해 둔 목록(캐시)에서 맞아도 배운다 · [TRIG_LIST_KNOWN] 못 읽고 알던 목록에도 없으면 막고 기록 · 다시 읽으면 기록 지움 · 깨진 알던 목록은 새로
  { const realCS = G.CacheService, cm = new Map();
    G.CacheService = { getScriptCache: () => ({ get: (k) => (cm.has(k) ? cm.get(k) : null), put: (k, v) => cm.set(k, String(v)), remove: (k) => cm.delete(k), removeAll: () => cm.clear() }) };
    clr(); cm.set('TRIG_UIDS', JSON.stringify(['U1']));
    G.ScriptApp = { getProjectTriggers: () => { throw new Error('읽으면 안 된다'); } };
    reset(); try { G._trigIn_({ triggerUid: 'U1' }); } catch (e) { out.push('예약 실행: 기억해 둔 목록의 진짜 아이디를 막았다'); }
    if (!PP().getProperty('TRIG_UID_OK')) out.push('예약 실행: 배우기 전 · 기억해 둔 목록에서 맞았는데 배우지 않았다(목록이 늘 따뜻하면 영영 못 배운다)');
    // [TRIG_IN_WHY] 옛 판이 배운 기록(메일 꼬리 없음)은 다음 진짜 실행에서 한 번 바로 다시 적는다(6시간 제한을 기다리지 않는다)
    PP().setProperty('TRIG_UID_OK', '2026-10-01 09:00 · U1');
    reset(); try { G._trigIn_({ triggerUid: 'U1' }); } catch (e) {}
    if (!/ · 메일 /.test(String(PP().getProperty('TRIG_UID_OK') || ''))) out.push('예약 실행: 옛 판이 배운 기록에 메일 꼬리가 끝내 안 붙는다(deployStampCheck 가 계정을 못 보여 준다)');
    cm.clear(); PP().setProperty('TRIG_UIDS_KNOWN', JSON.stringify(['U1']));
    reset(); if (!gsrBlocked(() => G._trigIn_({ triggerUid: 'NEW1' }))) out.push('예약 실행: 배운 뒤 목록을 못 읽을 때 알던 목록에 없는 아이디가 지난다');
    if (!/알던 목록에 없음/.test(String(PP().getProperty('TRIG_LIST_FAIL') || ''))) out.push('예약 실행: 목록을 못 읽고 알던 목록에도 없어 막았는데 기록(TRIG_LIST_FAIL)이 없다');
    PP().setProperty('TRIG_UIDS_KNOWN', '{깨짐');
    G.ScriptApp = { getProjectTriggers: () => [{ getUniqueId: () => 'U1' }] };
    reset(); try { G._trigIn_({ triggerUid: 'U1' }); } catch (e) { out.push('예약 실행: 목록을 다시 읽었는데 진짜 아이디를 막았다'); }
    if (PP().getProperty('TRIG_LIST_FAIL')) out.push('예약 실행: 목록을 다시 읽어 맞았는데 «못 읽음» 기록이 남아 있다');
    { let k = null; try { k = JSON.parse(PP().getProperty('TRIG_UIDS_KNOWN')); } catch (e) {} if (!Array.isArray(k) || k.indexOf('U1') < 0) out.push('예약 실행: 깨진 알던 목록을 새로 시작하지 않았다'); }
    G.CacheService = realCS; }
  G.ScriptApp = realST; clr();
  // adminCall — 토큰이 없으면 _AUTHED 가 켜져 있어도 FNS 를 안 돈다
  const realFL = G.aiFactsList; let ran = 0;
  G.aiFactsList = () => { ran++; return { ok: true }; };
  reset(); G._AUTHED = true;
  try { G.adminCall('', 'aiFactsList', []); } catch (e) {}
  if (ran) out.push('adminCall: 토큰 없이 FNS 가 돌았다(_AUTHED 지름길)');
  reset();
  try { G.doPost({ parameter: {}, postData: { type: 'application/json', contents: JSON.stringify({ action: 'adminCall', token: '', fn: 'aiFactsList', args: [] }) } }); } catch (e) {}
  if (ran) out.push('doPost(action=adminCall): 토큰 없이 FNS 가 돌았다');
  G.aiFactsList = realFL; reset();
  // [AICOST_SECRET] AI 비용 기록은 사이트 서버만 아는 공유키(AI_HANDOFF_SECRET)가 맞을 때만 쌓는다 · 키가 없으면(설정 전) 종전처럼
  { const keepS = G._aiCostSheet_, keepA = G._lockedAppend; let app = 0; G._aiCostSheet_ = () => ({ getLastRow: () => 2 }); G._lockedAppend = () => { app++; };
    PP().setProperty('AI_HANDOFF_SECRET', 'k-sim'); reset(); G._SRV = true;
    // 밖에서 온 기록은 doPost 길로 잰다(키를 보는 자리가 그 길이다 · [AICOST_POST_ONLY])
    const post = (o) => { try { G.doPost({ parameter: {}, postData: { type: 'application/json', contents: JSON.stringify(Object.assign({ action: 'aiCostLog' }, o)) } }); } catch (e) {} };
    post({ surface: 'adv', model: 'm', in: 10, out: 5, secret: 'wrong' }); post({ surface: 'adv', model: 'm', in: 10, out: 5 });
    const bad1 = app; reset(); G._SRV = true; post({ surface: 'adv', model: 'm', in: 10, out: 5, secret: 'k-sim' });
    if (bad1 !== 0 || app !== 1) out.push('AI 비용 기록: 공유키가 틀려도(없어도) 쌓거나 맞는데 안 쌓는다 — ' + bad1 + ' / ' + app);
    // [AICOST_POST_ONLY 라운드 6] GAS 안에서 부르는 목소리 기록(80_production _vcCharLog)은 키 없이도 쌓인다 — 키를 정해 둔 운영에서 목소리 비용이 통째로 빠지지 않게
    app = 0; reset(); G._SRV = true; try { G._vcCharLog(120); } catch (e) { out.push('AI 비용 기록: 목소리 기록이 던졌다 — ' + e.message); }
    if (app !== 1) out.push('AI 비용 기록: 키를 정해 두면 GAS 안의 목소리 비용 기록이 버려진다 — ' + app);
    PP().deleteProperty('AI_HANDOFF_SECRET'); app = 0; reset(); G._SRV = true; post({ surface: 'adv', model: 'm', in: 10, out: 5 });
    if (app !== 1) out.push('AI 비용 기록: 키를 아직 안 정한 때(설정 전)에 기록이 멈춘다');
    G._aiCostSheet_ = keepS; G._lockedAppend = keepA; reset(); }
  // [TRIG_PROBE_SLOT 라운드 7] 배우기 전 모양 기록은 칸 + 누가로 센다 — 밖에서 모양(키 이름)을 바꿔 가며 불러도 한 시간에 한 번만 쓴다(속성 쓰기 몫을 지킨다)
  { const realCS = G.CacheService, cm = new Map(); G.CacheService = { getScriptCache: () => ({ get: (k) => (cm.has(k) ? cm.get(k) : null), put: (k, v) => cm.set(k, String(v)), remove: (k) => cm.delete(k) }) };
    const realP = G.PropertiesService, base = realP.getScriptProperties(); let pw = 0;
    G.PropertiesService = { getScriptProperties: () => Object.assign({}, base, { getProperty: (k) => base.getProperty(k), setProperty: (k, v) => { if (k === 'TRIG_PROBE') pw++; return base.setProperty(k, v); }, deleteProperty: (k) => base.deleteProperty(k) }) };
    clr(); setEmail('');
    for (let i = 0; i < 50; i++) { G._SRV = false; G._TRUST = false; G._AUTHED = false; const ev = { triggerUid: 'Q' + i }; ev['k' + i] = 1; try { G._trigIn_(ev); } catch (e) {} }
    if (pw > 1) out.push('예약 실행: 배우기 전 모양 기록을 밖에서 모양만 바꿔 부를 때마다 다시 쓴다(속성 쓰기 몫이 샌다) — ' + pw + '번');
    G.PropertiesService = realP; G.CacheService = realCS; clr(); reset(); }
  // [AUTH_SEND_CAP 라운드 7] 코드 찾기 · 재설정 안내는 받는 주소마다 한 시간에 3통 · 전체 40통 — 답은 늘 같다
  { const realCS = G.CacheService, cm = new Map(); G.CacheService = { getScriptCache: () => ({ get: (k) => (cm.has(k) ? cm.get(k) : null), put: (k, v) => cm.set(k, String(v)), remove: (k) => cm.delete(k) }) };
    const keep = {}; for (const k of ['findLatestCustomerByEmail', 'customerNames', 'sendFindCodeKakao_', 'sendFindCodeEmail_', 'sendResetPwEmail_', 'makeResetSig_']) keep[k] = G[k];
    let sent = 0; G.findLatestCustomerByEmail = () => ({ num: 2, get: (h) => (h === '개인코드' ? 'ME0001' : h === '연락처' ? '01012345678' : '') });
    G.customerNames = () => '가 · 나'; G.sendFindCodeKakao_ = () => { sent++; return true; }; G.sendFindCodeEmail_ = () => { sent++; }; G.sendResetPwEmail_ = () => { sent++; }; G.makeResetSig_ = () => 's';
    reset(); G._SRV = true; const rs = [];
    for (let i = 0; i < 5; i++) rs.push(G.handleFindCode({ email: 'a@b.co' }));
    for (let i = 0; i < 3; i++) rs.push(G.handleResetPw({ email: 'A@B.co' }));
    const one = sent; for (let i = 0; i < 50; i++) G.handleFindCode({ email: 'u' + i + '@b.co' });
    if (one !== 3 || sent > 40 || !rs.every((r) => r && r.ok === true)) out.push('코드 찾기 · 재설정: 같은 주소로 계속 보내거나(한 시간 3통) 전체 상한(40)이 없거나 답이 달라진다 — 같은 주소 ' + one + '통 · 전체 ' + sent + '통');
    for (const k of Object.keys(keep)) G[k] = keep[k]; G.CacheService = realCS; reset(); }
  // [POST_SAFE_JSON] 밖에서 온 값의 «toString · valueOf» 칸은 받을 때 지운다 — 동작 이름이 객체여도 «모르는 동작»(3)으로 끝나고 예외(9)로 가지 않는다
  { const keepES = G._errStamp; let seen = null; G._errStamp = (o) => { seen = o; return o; };
    reset(); try { G.doPost({ parameter: {}, postData: { type: 'application/json', contents: '{"action":{"toString":1,"valueOf":1}}' } }); } catch (e) { out.push('doPost: 받은 값의 toString 칸에 던졌다'); }
    if (!(seen && /3$/.test(String(seen.ecode || '')))) out.push('doPost: 받은 값의 toString 칸이 글자로 바꾸다 예외로 갔다(받을 때 지우지 않았다) — ' + JSON.stringify(seen && seen.ecode));
    G._errStamp = keepES; reset(); }
  return out;
}
for (const m of gateChecks()) bad(m);
if (HELPERS.length < 300) bad(`운영 도우미를 ${HELPERS.length}개만 찾았다(모양이 바뀌었다)`);

// ── 돌연변이: 정적 검사가 깨진 원문을 잡는가 ──
const MUT = [
  ['서명 비밀값을 옛 공개 이름으로', (s) => { s.getSecret = s.getSecret_; delete s.getSecret_; }],
  ['setAdminAccount 잠금 빼기', (s) => { s.setAdminAccount = s.setAdminAccount.replace(/_requireAdmin\(\);/, ''); }],
  ['FNS 함수 잠금 빼기(aiFactSet)', (s) => { s.aiFactSet = s.aiFactSet.replace(/_requireAdmin\(\);/, ''); }],
  ['아무 함수에서 _AUTHED 켜기', (s) => { s.evilEntry = 'function evilEntry() { _AUTHED = true; }'; }],
  ['메일 단추 창 안 닫기', (s) => { s._payConfirmRun_ = s._payConfirmRun_.replace(/_AUTHED\s*=\s*_authPrev;?/, ''); }],
  ['메일 단추 주소가 바로 처리', (s) => { s.servePayConfirm = s.servePayConfirm.replace('{ _gsr_();', '{ _gsr_(); _payConfirmRun_(p);'); }],
  ['승인 주소가 바로 처리', (s) => { s.handleAction = s.handleAction.replace("case 'approve':", "case 'approve': actApprove(sheet, colOf, row);"); }],
  ['카드 길 창 안 닫기', (s) => { s.handleCardConfirm = s.handleCardConfirm.replace(/_AUTHED\s*=\s*_authPrev;?/, ''); }],
  ['운영 도우미 첫 줄 빼기(findCustomerByCode)', (s) => { s.findCustomerByCode = s.findCustomerByCode.replace(/_gsr_\(\);/, ''); }],
  ['아무 함수에서 _SRV 켜기', (s) => { s.evilSrv = 'function evilSrv() { _gsr_(); _SRV = true; }'; }],
  ['아무 함수에서 _IN_POST 켜기', (s) => { s.evilPost = 'function evilPost() { _gsr_(); _IN_POST = true; }'; }],
  ['신청서가 화면의 개인코드를 받기', (s) => { s.submitApplication = s.submitApplication.replace("if (!_IN_POST && !_ownerRunNow_()) personalCode = '';", ''); }],
  ['adminCall 을 옛 문으로', (s) => { s.adminCall = s.adminCall.replace('_adminTokenCheck_(token)', '_requireAdmin(token)'); }],
  ['예약 실행 첫 줄 빼기(aiDaily)', (s) => { s.aiDaily = s.aiDaily.replace(/_trigIn_\(arguments\[0\]\);/, ''); }],
];
for (const [name, mut] of MUT) {
  const copy = Object.assign({}, SRC); mut(copy);
  if (!staticChecks(copy).length) bad(`돌연변이: «${name}» 를 넣어도 빨강이 안 된다(검사가 죽었다)`);
}
// 행동 돌연변이 — 문을 활짝 열면 행동 검사가 빨강이 되는가
const MUT_B = [
  ['_gsr_ 가 다 통과', '_gsr_', function () {}],
  ['_trigIn_ 이 다 믿음', '_trigIn_', function () { G._TRUST = true; }],
  ['_adminTokenCheck_ 가 다 통과', '_adminTokenCheck_', function () { return { ok: true, name: 'x' }; }],
];
for (const [name, key, fake] of MUT_B) {
  const real = G[key]; G[key] = fake;
  let n = 0; try { n = gateChecks(SAFE_SAMPLE).length; } catch (e) { n = 1; }
  G[key] = real;
  if (!n) bad(`돌연변이: «${name}» 로 바꿔도 행동 검사가 빨강이 안 된다(검사가 죽었다)`);
}
// [OWNER_SELF] 소유자 판단 돌연변이 — 서버 길을 안 보거나 · 목록만 보거나(옛 판) · 메일만 있으면 소유자로 치면 빨강
const MUT_O = [
  ['서버 길 안도 소유자', function () { const e = G._activeEmail_(); return !!e && (G._ADMIN_OWNER_EMAILS.indexOf(e) !== -1 || e === G._effectiveEmail_()); }],
  ['목록만 본다(옛 판)', function () { if (G._SRV) return false; const e = G._activeEmail_(); return !!e && G._ADMIN_OWNER_EMAILS.indexOf(e) !== -1; }],
  ['메일만 있으면 소유자', function () { if (G._SRV) return false; return !!G._activeEmail_(); }],
  ['처음 물음에 안 정함', function () { if (G._SRV) return false; const e = G._activeEmail_(); return !!e && (G._ADMIN_OWNER_EMAILS.indexOf(e) !== -1 || e === G._effectiveEmail_()); }],
];
for (const [name, fake] of MUT_O) {
  const real = G._isOwnerRun_; G._isOwnerRun_ = fake;
  let n = 0; try { n = ownerChecks().length; } catch (e) { n = 1; }
  G._isOwnerRun_ = real;
  if (!n) bad(`돌연변이: «${name}» 로 바꿔도 소유자 검사가 빨강이 안 된다(검사가 죽었다)`);
}

if (errs.length) {
  console.log(`━━ gsr-guard — 빨강 ${errs.length}건 [B19_LOCK]`);
  for (const m of errs.slice(0, 40)) console.log('  ✖ ' + m);
  process.exit(1);
}
console.log(`━━ gsr-guard — 통과 · 밑줄 ${RENAMED.length} · 잠금 ${LOCKED.length} · 운영 도우미 ${HELPERS.length} · 입구 ${ENTRY.length} · 예약 실행 ${TRIG.length} · FNS 확인 · _AUTHED 창 ${AUTHED_RESTORE.length} · 메일 단추 9 · 소유자 확인 OWNER_SELF · 돌연변이 ${MUT.length + MUT_B.length + MUT_O.length} [B19_LOCK · GSR_GATE]`);
process.exit(0);
