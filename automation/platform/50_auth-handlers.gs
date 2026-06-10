/**
 * Moment Edit · 통합 플랫폼 (Phase 1) — T5 인증 핸들러 (action 분기 대상)
 * ──────────────────────────────────────────────────────────────────────────
 *  login      : 코드+비번 → 해시 대조 → 토큰 발급(갱신) → { ok, token }
 *  autologin  : 메일 링크의 토큰 → 유효·미만료 검사 → { ok, token }
 *  verify     : 토큰 유효성·만료 검사 (모든 조회의 전제) → { ok }
 *  findCode   : 이메일 → 등록 시 코드 재발송 (존재 여부 노출 최소화) → { ok }
 *  resetPw    : 이메일 → 재설정 링크 발송 (서명+만료) → { ok }
 *  doResetPw  : 재설정 링크 + 새 비번 → 해시 저장 + 토큰 회전 → { ok }
 *
 * 로그인 실패는 정보 최소 노출(코드/비번 중 무엇이 틀렸는지 구분하지 않음).
 */

// ── login ─────────────────────────────────────────────
function handleLogin(body) {
  var code = String((body && body.code) || '').trim().toUpperCase();
  var pw = String((body && body.pw) || '');
  if (!code || !pw) throw new Error('개인코드와 비밀번호를 입력해 주세요.');

  var rowObj = findCustomerByCode(code);
  var FAIL = '개인코드 또는 비밀번호가 올바르지 않습니다.';
  if (!rowObj) { Utilities.sleep(200); throw new Error(FAIL); }          // 존재 여부 노출 줄임
  if (!verifyPassword(pw, rowObj.get('비번해시'))) { Utilities.sleep(200); throw new Error(FAIL); }

  var sheet = getCustomersSheet();
  var colOf = buildHeaderIndex(sheet);
  var t = issueToken(sheet, colOf, rowObj.num); // 토큰 갱신(이전 무효화)
  return { ok: true, token: t.token };
}

// ── autologin (메일 링크 진입) ─────────────────────────
function handleAutologin(body) {
  var token = String((body && body.token) || '').trim();
  var s = resolveSession(token);
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  // 유효하면 같은 토큰으로 세션 지속(회전하지 않음 → 같은 메일 링크 재사용 가능, 만료까지)
  return { ok: true, token: token };
}

// ── verify (조회 전제) ─────────────────────────────────
function handleVerify(body) {
  var token = String((body && body.token) || '').trim();
  var s = resolveSession(token);
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  return { ok: true };
}

// ── findCode (코드 찾기) ───────────────────────────────
function handleFindCode(body) {
  var email = String((body && body.email) || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('이메일 주소를 정확히 입력해 주세요.');
  var rowObj = findLatestCustomerByEmail(email);   // 같은 이메일 다중 신청 → 최신 활성 건
  if (rowObj) {
    var names = customerNames(rowObj), code = String(rowObj.get('개인코드') || ''), phone = String(rowObj.get('연락처') || '').trim();
    try {
      // 알림톡(솔라피) 우선 — 미설정/실패면 sendFindCodeKakao가 false → 메일 폴백
      var sent = (phone && typeof sendFindCodeKakao === 'function') ? sendFindCodeKakao(phone, names, code) : false;
      if (!sent) sendFindCodeEmail(email, names, code);
    } catch (e) {
      try { sendFindCodeEmail(email, names, code); }
      catch (e2) { notifyStudio('[플랫폼] ⚠️오류 · 코드찾기 발송 실패', email + '\n' + (e2 && e2.message)); }
    }
  }
  // 등록 여부와 무관하게 항상 동일 응답(계정 존재 여부 노출 방지)
  return { ok: true };
}

// ── resetPw (재설정 링크 발송) ─────────────────────────
function handleResetPw(body) {
  var email = String((body && body.email) || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('이메일 주소를 정확히 입력해 주세요.');
  var rowObj = findLatestCustomerByEmail(email);   // 같은 이메일 다중 신청 → 최신 활성 건
  if (rowObj) {
    var code = String(rowObj.get('개인코드') || '');
    var exp = Date.now() + 60 * 60 * 1000;                 // 링크 1시간 유효
    var sig = makeResetSig(code, exp);
    var link = P.MYPAGE_URL + '?mode=reset&code=' + encodeURIComponent(code) + '&exp=' + exp + '&sig=' + encodeURIComponent(sig);
    try { sendResetPwEmail(email, customerNames(rowObj), link); }
    catch (e) { notifyStudio('[플랫폼] ⚠️오류 · 재설정 메일 실패', email + '\n' + (e && e.message)); }
  }
  return { ok: true };
}

// ── doResetPw (새 비번 저장) ───────────────────────────
function handleDoResetPw(body) {
  var code = String((body && body.code) || '').trim().toUpperCase();
  var exp = String((body && body.exp) || '');
  var sig = String((body && body.sig) || '');
  if (!verifyResetSig(code, exp, sig)) throw new Error('재설정 링크가 유효하지 않거나 만료되었습니다. 다시 요청해 주세요.');

  var pw = String((body && body.pw) || '');
  var pw2 = String((body && body.pw2) || '');
  if (!pw || !pw2) throw new Error('새 비밀번호를 입력해 주세요.');
  if (pw !== pw2) throw new Error('비밀번호가 일치하지 않습니다.');
  var pwErr = pwPolicyError(pw);
  if (pwErr) throw new Error(pwErr);

  var rowObj = findCustomerByCode(code);
  if (!rowObj) throw new Error('대상을 찾을 수 없습니다.');

  var sheet = getCustomersSheet();
  var colOf = buildHeaderIndex(sheet);
  // 새 해시 저장 + 토큰 회전(재설정 시 기존 세션 모두 무효화)
  var t = issueToken(sheet, colOf, rowObj.num);
  touchCustomer(sheet, colOf, rowObj.num, { '비번해시': hashPassword(pw) });
  return { ok: true, token: t.token };
}

// 세션 실패 사유 → 사용자 메시지
function _sessionMsg(reason) {
  if (reason === 'expired') return '로그인이 만료되었습니다. 다시 로그인해 주세요.';
  return '로그인이 필요합니다. 개인코드와 비밀번호로 로그인해 주세요.';
}

// ============================ 인증 메일 ============================
function sendFindCodeEmail(to, names, code) {
  var mypage = P.MYPAGE_URL;
  var codeCard =
    '<div style="background:#F7F5F1;padding:22px 20px;border:1px solid #E6E1D8;border-radius:8px;margin:22px 0;text-align:center">' +
      '<div style="font-family:\'Cormorant Garamond\',serif;font-size:11px;letter-spacing:.22em;color:#B89A75;text-transform:uppercase;margin-bottom:10px">Your Personal Code</div>' +
      '<div style="font-family:\'Roboto Mono\',monospace,\'Noto Serif KR\',serif;font-size:30px;font-weight:600;letter-spacing:.18em;color:#3A2D22">' + esc(code) + '</div>' +
    '</div>';
  var inner =
    centerP(esc(names) + ' 님,<br>요청하신 <b style="color:#B89A75;font-weight:600">개인코드</b>를 안내드립니다.') +
    codeCard +
    emailBtnOutline(mypage, '마이페이지 열기') +
    smallP('본인이 요청하지 않으셨다면 이 메일을 무시하셔도 됩니다.');
  GmailApp.sendEmail(to, '[Moment Edit] 개인코드 안내', '',
    { htmlBody: emailShell('개인코드 안내', inner), name: SYS.FROM_NAME });
}

// 개인코드 알림톡(솔라피) — Script Properties 미설정 시 false(호출부가 메일 폴백). [Task3]
//   필요: SOLAPI_KEY / SOLAPI_SECRET / SOLAPI_PFID / SOLAPI_TPL_FINDCODE (+선택 SOLAPI_SENDER). 승인 템플릿 변수 #{이름}·#{코드}.
function sendFindCodeKakao(phone, names, code) {
  var P_ = PropertiesService.getScriptProperties();
  var KEY = P_.getProperty('SOLAPI_KEY'), SEC = P_.getProperty('SOLAPI_SECRET');
  var PFID = P_.getProperty('SOLAPI_PFID'), TPL = P_.getProperty('SOLAPI_TPL_FINDCODE');
  if (!KEY || !SEC || !PFID || !TPL) return false;                 // 미설정 → 메일 폴백
  var to = String(phone).replace(/[^0-9]/g, ''); if (!to) return false;
  var date = new Date().toISOString(), salt = Utilities.getUuid().replace(/-/g, '');
  var sig = Utilities.computeHmacSha256Signature(date + salt, SEC);
  var hex = sig.map(function (b) { b = (b < 0 ? b + 256 : b).toString(16); return b.length === 1 ? '0' + b : b; }).join('');
  var auth = 'HMAC-SHA256 apiKey=' + KEY + ', date=' + date + ', salt=' + salt + ', signature=' + hex;
  var payload = { message: { to: to, from: P_.getProperty('SOLAPI_SENDER') || '', type: 'ATA',
    kakaoOptions: { pfId: PFID, templateId: TPL, variables: { '#{이름}': String(names || ''), '#{코드}': String(code || '') } } } };
  try {
    var res = UrlFetchApp.fetch('https://api.solapi.com/messages/v4/send',
      { method: 'post', contentType: 'application/json', headers: { Authorization: auth },
        payload: JSON.stringify(payload), muteHttpExceptions: true });
    var rc = res.getResponseCode();
    if (rc >= 200 && rc < 300) return true;
    notifyStudio('[플랫폼] ⚠️ 코드찾기 알림톡 실패(' + rc + ')', res.getContentText().slice(0, 500));
  } catch (e) { notifyStudio('[플랫폼] ⚠️ 코드찾기 알림톡 예외', String(e && e.message)); }
  return false;                                                    // 실패 → 메일 폴백
}

function sendResetPwEmail(to, names, link) {
  var inner =
    centerP(esc(names) + ' 님,<br>비밀번호 <b style="color:#B89A75;font-weight:600">재설정</b> 링크를 보내드립니다.') +
    emailBtn(link, '비밀번호 재설정') +
    smallP('이 링크는 <b>1시간</b> 동안만 유효합니다. 본인이 요청하지 않으셨다면 무시하셔도 됩니다(비밀번호는 그대로 유지됩니다).') +
    '<div style="margin:22px auto 0;max-width:440px;text-align:center">' +
      '<details style="text-align:center">' +
        '<summary style="cursor:pointer;list-style:none;font-family:\'Noto Serif KR\',serif;font-size:11px;color:#A39C8E;outline:none">버튼이 열리지 않나요?</summary>' +
        '<div style="margin-top:10px;padding:12px 14px;background:#F5F3EF;border:1px solid #E2DCD2;border-radius:4px">' +
          '<a href="' + safeAttr(link) + '" style="font-size:10px;color:#6E6557;word-break:break-all;text-decoration:none;font-family:monospace">' + esc(link) + '</a>' +
        '</div>' +
      '</details>' +
    '</div>';
  GmailApp.sendEmail(to, '[Moment Edit] 비밀번호 재설정 링크', '',
    { htmlBody: emailShell('비밀번호 재설정', inner), name: SYS.FROM_NAME });
}
