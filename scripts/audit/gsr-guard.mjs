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

// FNS 에 있지만 서버 길(예약 실행 · doPost)에서도 부르는 «두 쓰임» — 1-s 둘째 조각(_gsr_)이 닫는다. 여기 이름을 늘리지 말 것.
const FNS_LATER = ['aiAlertAdmin'];
// `_AUTHED = true` 를 써도 되는 곳 — 토큰 · 서명 · 토스 승인 · 예약 실행을 확인한 뒤에만
const AUTHED_OK = ['adminCall', 'morningBriefData_', 'servePayConfirm', 'handleCardConfirm'];
const AUTHED_RESTORE = ['servePayConfirm', 'handleCardConfirm'];

const errs = [];
const bad = (m) => errs.push(m);

const { sandbox: G, errors } = loadGas(makeSandbox());
if (errors.length) { console.log('━━ gsr-guard — GAS 로드 실패 · 재지 못했습니다: ' + errors[0].file + ' ' + errors[0].message); process.exit(2); }
const SRC = {};
for (const k of Object.keys(G)) { if (typeof G[k] === 'function') { try { SRC[k] = Function.prototype.toString.call(G[k]); } catch (e) {} } }
if (!SRC.adminCall || !SRC._requireAdmin || !SRC.servePayConfirm) { console.log('━━ gsr-guard — adminCall · _requireAdmin · servePayConfirm 을 못 찾았습니다 · 재지 못했습니다'); process.exit(2); }

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

// 메일 단추 — 서명이 맞으면 확인 함수까지 가고 창이 닫힌다
{
  const hits = [];
  const realCore = G._adminConfirmMidCore, realInfo = G.infoPage;
  G._adminConfirmMidCore = (c) => { hits.push({ c, authed: G._AUTHED }); return { ok: true }; };
  G.infoPage = (t, b, ok) => ({ t, ok });
  const exp = String(Date.now() + 86400000);
  const sig = G.sign_('ME0001', 'payconfirm:mid:' + exp);
  G.servePayConfirm({ code: 'ME0001', m: 'mid', exp, sig });
  if (!(hits.length === 1 && hits[0].c === 'ME0001' && hits[0].authed === true)) bad('메일 단추: 서명이 맞는데 확인 함수에 닿지 않는다(창이 안 열린다)');
  if (G._AUTHED !== false) bad('메일 단추: 처리 뒤 _AUTHED 가 닫히지 않는다');
  hits.length = 0;
  G.servePayConfirm({ code: 'ME0001', m: 'mid', exp, sig: 'x' + sig.slice(1) });
  if (hits.length) bad('메일 단추: 틀린 서명으로 확인 함수에 닿는다');
  const old = String(Date.now() - 1000);
  G.servePayConfirm({ code: 'ME0001', m: 'mid', exp: old, sig: G.sign_('ME0001', 'payconfirm:mid:' + old) });
  if (hits.length) bad('메일 단추: 기한 지난 링크로 확인 함수에 닿는다');
  G._adminConfirmMidCore = () => { throw new Error('core boom'); };
  try { G.servePayConfirm({ code: 'ME0001', m: 'mid', exp, sig }); } catch (e) {}
  if (G._AUTHED !== false) bad('메일 단추: 확인 함수가 던져도 _AUTHED 가 닫혀야 한다');
  G._adminConfirmMidCore = realCore; G.infoPage = realInfo;
}

// ── 돌연변이: 정적 검사가 깨진 원문을 잡는가 ──
const MUT = [
  ['서명 비밀값을 옛 공개 이름으로', (s) => { s.getSecret = s.getSecret_; delete s.getSecret_; }],
  ['setAdminAccount 잠금 빼기', (s) => { s.setAdminAccount = s.setAdminAccount.replace(/_requireAdmin\(\);/, ''); }],
  ['FNS 함수 잠금 빼기(aiFactSet)', (s) => { s.aiFactSet = s.aiFactSet.replace(/_requireAdmin\(\);/, ''); }],
  ['아무 함수에서 _AUTHED 켜기', (s) => { s.evilEntry = 'function evilEntry() { _AUTHED = true; }'; }],
  ['메일 단추 창 안 닫기', (s) => { s.servePayConfirm = s.servePayConfirm.replace(/_AUTHED\s*=\s*_authPrev;?/, ''); }],
  ['카드 길 창 안 닫기', (s) => { s.handleCardConfirm = s.handleCardConfirm.replace(/_AUTHED\s*=\s*_authPrev;?/, ''); }],
];
for (const [name, mut] of MUT) {
  const copy = Object.assign({}, SRC); mut(copy);
  if (!staticChecks(copy).length) bad(`돌연변이: «${name}» 를 넣어도 빨강이 안 된다(검사가 죽었다)`);
}

if (errs.length) {
  console.log(`━━ gsr-guard — 빨강 ${errs.length}건 [B19_LOCK]`);
  for (const m of errs.slice(0, 40)) console.log('  ✖ ' + m);
  process.exit(1);
}
console.log(`━━ gsr-guard — 통과 · 밑줄 ${RENAMED.length} · 잠금 ${LOCKED.length} · FNS 확인 · _AUTHED 창 ${AUTHED_RESTORE.length} · 메일 단추 4 · 돌연변이 ${MUT.length} [B19_LOCK]`);
process.exit(0);
