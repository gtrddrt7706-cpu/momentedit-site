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
//
// 종료: 0 통과 · 1 빨강 · 2 재지 못함(브라우저가 필요 없는 검사라 merge-guard 는 2 도 빨강으로 친다)
import { makeSandbox, loadGas } from './gas-lint.mjs';

const RENAMED = ['getSecret', 'sign', 'verifySig', 'actionUrl', 'cancelPageUrl', 'makeResetSig', 'verifyResetSig',
  '_nfPayConfirmAction', '_payCfg', '_nfProps', '_vcCfg', '_depositCardConfirm', 'morningBriefData', 'monthBusinessData',
  'sendConfirmEmail', 'sendCancelEmail', 'sendSignupEmail', 'sendFindCodeEmail', 'sendFindCodeKakao', 'sendResetPwEmail',
  '_kakaoSend', '_nfCustomerEmailFallback', '_ltSendToRecipients'];

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
const AUTHED_RESTORE = ['_payConfirmRun_', 'handleCardConfirm'];

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
  // ── 둘째 조각 [GSR_GATE] — 모든 공개 함수의 첫 줄 ──
  const head = (s) => { const m = /^function\s+[\w$]+\s*\([^)]*\)\s*\{\s*([^;\n]*)/.exec(s || ''); return m ? m[1] : ''; };
  for (const [n, s] of Object.entries(src)) {
    if (n.endsWith('_') || !/^function\b/.test(s)) continue;
    const h = head(s);
    if (ENTRY.includes(n)) { if (!/^_SRV\s*=\s*true$/.test(h)) out.push(`첫 줄: 입구 ${n} 이 _SRV = true 로 시작하지 않는다`); continue; }
    if (TRIG.includes(n)) { if (!/^_trigIn_\(arguments\[0\]\)$/.test(h)) out.push(`첫 줄: 예약 실행 ${n} 이 _trigIn_(arguments[0]) 으로 시작하지 않는다`); continue; }
    if (OPEN.includes(n)) continue;
    if (FNS_LATER.includes(n)) { if (!/^_gsr_\(\)$/.test(h)) out.push(`첫 줄: ${n} 이 _gsr_() 로 시작하지 않는다`); continue; }
    if (/^_gsr_\(\)$/.test(h)) continue;
    if (/_requireAdmin\(/.test(s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, ''))) continue;
    out.push(`첫 줄: ${n} 이 넷(_SRV · _trigIn_ · _requireAdmin · _gsr_) 중 무엇으로도 시작하지 않는다 — 공개 화면에서 바로 부를 수 있다`);
  }
  for (const [n, s] of Object.entries(src)) {
    if (/\b_SRV\s*=\s*true\b/.test(s) && !ENTRY.includes(n)) out.push(`_SRV: ${n} 이 서버 길 표를 켠다(입구 다섯만)`);
    if (/\b_TRUST\s*=\s*true\b/.test(s) && n !== '_trigIn_') out.push(`_TRUST: ${n} 이 예약 실행 표를 켠다(_trigIn_ 만)`);
  }
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
const setEmail = (e) => { G.Session = Object.assign({}, G.Session, { getActiveUser: () => ({ getEmail: () => e }) }); };
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
  G.mailButtonGo({ action: 'payconfirm', code: 'ME0001', m: 'mid', exp, sig: 'x' + sig.slice(1) });
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
  G.mailButtonGo({ action: 'approve', token: tok, sig: 'x' + aSig.slice(1) });
  if (acts.length) bad('메일 단추: 틀린 서명으로 승인이 처리됐다');
  for (const k of Object.keys(keep)) G[k] = keep[k];
  G._SRV = false; G._AUTHED = false;
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
  G.ScriptApp = { getProjectTriggers: () => [{ getUniqueId: () => 'U1' }] };
  try { PP().deleteProperty('TRIG_UID_OK'); PP().deleteProperty('TRIG_PROBE'); } catch (e) {}
  reset(); try { G._trigIn_({}); if (G._TRUST !== true) out.push('예약 실행: 배우기 전에는 막지 않아야 한다(_TRUST 가 안 켜졌다)'); } catch (e) { out.push('예약 실행: 배우기 전인데 막았다 — 확인 전에 막으면 아침 보고 · 알림이 멈춘다'); }
  if (!PP().getProperty('TRIG_PROBE')) out.push('예약 실행: 배우기 전 호출의 모양을 TRIG_PROBE 에 적지 않았다');
  reset(); try { G._trigIn_({ triggerUid: 'U1' }); if (G._TRUST !== true) out.push('예약 실행: 진짜 아이디인데 _TRUST 가 안 켜졌다'); } catch (e) { out.push('예약 실행: 진짜 아이디를 막았다'); }
  if (!PP().getProperty('TRIG_UID_OK')) out.push('예약 실행: 진짜 아이디를 보고도 TRIG_UID_OK 를 안 적었다');
  reset(); if (!gsrBlocked(() => G._trigIn_({ triggerUid: 'FAKE' }))) out.push('예약 실행: 배운 뒤인데 가짜 아이디가 지난다');
  reset(); if (!gsrBlocked(() => G._trigIn_({}))) out.push('예약 실행: 배운 뒤인데 이벤트 없는 호출이 지난다');
  reset(); if (!list && !gsrBlocked(() => G.aiDaily())) out.push('예약 실행: 배운 뒤인데 aiDaily 를 공개로 부를 수 있다');
  reset(); try { G._trigIn_({ range: { getRow: () => 2 } }); } catch (e) { out.push('예약 실행: 시트 편집 이벤트를 막았다'); }
  reset(); setEmail(OWNER); try { G._trigIn_(undefined); } catch (e) { out.push('예약 실행: 소유자(편집기) 실행을 막았다'); }
  reset(); G._SRV = true; try { G._trigIn_(undefined); } catch (e) { out.push('예약 실행: 서버 길 안에서 부른 것을 막았다'); }
  G.ScriptApp = realST; try { PP().deleteProperty('TRIG_UID_OK'); PP().deleteProperty('TRIG_PROBE'); } catch (e) {}
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

if (errs.length) {
  console.log(`━━ gsr-guard — 빨강 ${errs.length}건 [B19_LOCK]`);
  for (const m of errs.slice(0, 40)) console.log('  ✖ ' + m);
  process.exit(1);
}
console.log(`━━ gsr-guard — 통과 · 밑줄 ${RENAMED.length} · 잠금 ${LOCKED.length} · 운영 도우미 ${HELPERS.length} · 입구 ${ENTRY.length} · 예약 실행 ${TRIG.length} · FNS 확인 · _AUTHED 창 ${AUTHED_RESTORE.length} · 메일 단추 9 · 돌연변이 ${MUT.length + MUT_B.length} [B19_LOCK · GSR_GATE]`);
process.exit(0);
