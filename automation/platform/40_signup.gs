/**
 * Moment Edit · 통합 플랫폼 (Phase 1) — T3 signup + T4 접수 메일
 * ──────────────────────────────────────────────────────────────────────────
 * inquiry.html 이 fetch(POST·JSON, action:'signup')로 보낸다.
 *   payload: { action:'signup', groom, bride, phone, email, memo, detail, hp, pw, pw2, product? }
 *
 * 흐름: 허니팟·필수값·비번 검증 → 비번 해시(원문 폐기) → 개인코드 발급
 *       → Customers 행 생성(현재단계 '신청접수') → 토큰 발급(메일 자동로그인용)
 *       → 접수 메일 1통(코드 + 마이페이지 링크) → { ok:true, code }
 *
 * 응답에 비번해시·토큰 등 민감정보는 절대 넣지 않는다(DoD).
 */

function handleSignup(body) {
  body = body || {};

  // 1) 허니팟(봇) — hp 채워져 있으면 조용히 성공인 척(행·메일·코드 없음)
  if (String(body.hp || '').trim()) {
    Logger.log('  (signup honeypot 걸림 — 봇 의심, 기록·메일 생략)');
    return { ok: true };
  }

  // 2) 필수값
  var groom = String(body.groom || '').trim();
  var bride = String(body.bride || '').trim();
  var phone = String(body.phone || '').trim();
  var email = String(body.email || '').trim();
  var memo = String(body.memo || '').trim();
  var detail = String(body.detail || '').trim();
  if (!groom || !bride) throw new Error('성함을 입력해 주세요.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('이메일 주소를 정확히 입력해 주세요.');
  if (!phone) throw new Error('연락처를 입력해 주세요.');

  // 3) 비밀번호 — 일치 + 정책
  var pw = String(body.pw || '');
  var pw2 = String(body.pw2 || '');
  if (!pw || !pw2) throw new Error('예약 조회용 비밀번호를 입력해 주세요.');
  if (pw !== pw2) throw new Error('비밀번호가 일치하지 않습니다.');
  var pwErr = pwPolicyError(pw);
  if (pwErr) throw new Error(pwErr);

  // 4) 상품타입 — payload.product 가 유효 목록에 있으면 사용, 없으면 시그니처(현 inquiry 폼)
  var product = String(body.product || '').trim();
  if (CUSTOMER_VALS['상품타입'].indexOf(product) === -1) product = P.PRODUCT_SIGNATURE;

  // 5) 더블클릭/중복 제출 가드 — 같은 (이메일+이름) 짧은 시간 내 재요청이면 같은 코드 반환
  var dedupKey = 'SIGNUP_' + _shortHash((email + '|' + groom + '|' + bride).toLowerCase());
  var cache = CacheService.getScriptCache();
  var cached = cache.get(dedupKey);
  if (cached) return { ok: true, code: cached };  // 직전 발급 코드 그대로(행·메일 중복 방지)

  // 6) 비번 해시 (원문은 여기서 끝 — 어디에도 저장 안 함)
  var pwHash = hashPassword(pw);

  // 7) 행 생성은 잠금으로 직렬화(개인코드 충돌·동시 쓰기 방지)
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { throw new Error('잠시 후 다시 시도해 주세요. (서버 혼잡)'); }
  var code, token;
  try {
    // 잠금 안에서 다시 한 번 dedup 확인(경합 방어)
    cached = cache.get(dedupKey);
    if (cached) { lock.releaseLock(); return { ok: true, code: cached }; }

    var sheet = getCustomersSheet();
    var colOf = buildHeaderIndex(sheet);
    code = makePersonalCode();

    var rowNum = sheet.getLastRow() + 1;
    if (rowNum < P.DATA_START_ROW) rowNum = P.DATA_START_ROW;
    var now = fmtKST(new Date());

    // 한 번에 기록 (touchCustomer 가 최종수정까지 찍음)
    touchCustomer(sheet, colOf, rowNum, {
      '개인코드': code,
      '비번해시': pwHash,
      '신랑이름': groom,
      '신부이름': bride,
      '연락처': phone,
      '이메일': email,
      '상품타입': product,
      '현재단계': '신청접수',
      '계약상태': '미발송',
      '입금상태': '대기',
      '제작상태': (product === P.PRODUCT_SIGNATURE) ? '잠금' : '',  // 스냅은 제작 미해당
      '결과물상태': '대기',
      '관리자메모': memo ? ('신청메모: ' + memo) : '',
      '생성일시': now
    });

    // 메일 자동로그인용 토큰 발급
    var t = issueToken(sheet, colOf, rowNum);
    token = t.token;

    cache.put(dedupKey, code, 120); // 2분 dedup
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }

  // 7-b) [P1.5 작업1] 상담예약 행도 같은 개인코드로 생성 (Customers + 상담예약 두 행 = 한 개인코드).
  //   실패해도 Customers·코드·접수메일은 유지(원자성·가) — 고객 진입을 막지 않는다.
  //   고객 접수메일은 아래 sendSignupEmail 1통뿐(submitApplication은 메일 안 보냄 = 다이어트됨).
  try {
    submitApplication({ groom: groom, bride: bride, phone: phone, email: email, memo: memo, detail: detail, hp: '' }, code);
  } catch (consErr) {
    notifyStudio('[플랫폼] ⚠️오류 · 상담예약 행 생성 실패',
      '개인코드: ' + code + '\n' + groom + ' · ' + bride + '\n오류: ' + (consErr && consErr.message) +
      '\n(Customers·코드·접수메일은 정상. 상담예약 행만 수동 보완 필요.)');
  }

  // 8) 접수 메일 — 실패해도 행/코드는 유지(메일은 재시도 가능). 관리자에 오류 알림.
  try {
    sendSignupEmail(email, groom + ' · ' + bride, code, token, product, detail);
  } catch (mailErr) {
    notifyStudio('[플랫폼] ⚠️오류 · 신청 접수 메일 발송 실패',
      groom + ' · ' + bride + '\n수신: ' + email + '\n코드: ' + code + '\n오류: ' + (mailErr && mailErr.message));
  }

  // 9) 관리자 신규 신청 알림(가벼운 1줄) — 선택. 한도 의식해 dedup.
  try {
    notifyStudio('[플랫폼] 신규 신청 · ' + groom + '·' + bride + ' (' + product + ')',
      '개인코드: ' + code + '\n상품: ' + product + '\n연락처: ' + phone + '\n이메일: ' + email,
      'NEWSIGNUP_' + code);
  } catch (e) {}
  notifyKakao('admin.newSignup', code, { names: groom + '·' + bride, product: product, phone: phone });   // 관리자: 신규 신청 — 일정 잡기(카톡)

  return { ok: true, code: code };
}

// 짧은 해시(캐시 키용) — 충돌 가능성 낮은 16자
function _shortHash(s) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, String(s), Utilities.Charset.UTF_8);
  return raw.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('').slice(0, 16);
}

// ============================ T4 · 접수 메일 (코드 + 마이페이지 링크) ============================
function sendSignupEmail(to, names, code, token, product, detail) {
  var mypage = P.MYPAGE_URL + '?token=' + encodeURIComponent(token);
  var isSnap = (product === P.PRODUCT_SNAP);

  // 신청 요약 한 줄(예식일·인원) — detail 에서 추려 부담 없이
  var summary = _applySummaryFromDetail(detail);
  var summaryBlock = summary
    ? '<div style="margin:14px auto 0;max-width:380px;text-align:center;font-family:\'Noto Sans KR\',sans-serif;font-size:12px;color:#8A8475;line-height:1.7">신청 내용 · ' + esc(summary) + '</div>'
    : '';

  // 개인코드 카드 (마스터키 — 크게, 복사하기 쉽게)
  var codeCard =
    '<div style="background:#F7F5F1;padding:22px 20px;border:1px solid #E6E1D8;border-radius:8px;margin:22px 0;text-align:center">' +
      '<div style="font-family:\'Cormorant Garamond\',serif;font-size:11px;letter-spacing:.22em;color:#B89A75;text-transform:uppercase;margin-bottom:10px">Your Personal Code</div>' +
      '<div style="font-family:\'Roboto Mono\',monospace,\'Noto Serif KR\',serif;font-size:30px;font-weight:600;letter-spacing:.18em;color:#3A2D22">' + esc(code) + '</div>' +
      '<div style="font-family:\'Noto Sans KR\',sans-serif;font-size:11px;color:#A39C8E;margin-top:8px">로그인·조회에 쓰는 나만의 코드입니다</div>' +
    '</div>';

  var inner =
    centerP(esc(names) + ' 님,<br>' + (isSnap ? '웨딩스냅' : '방문 상담') + ' 신청이 <span style="color:#B89A75;font-weight:500">접수</span>되었습니다.') +
    summaryBlock +
    codeCard +
    '<div style="margin:16px auto 0;max-width:300px;padding:10px 0;border-top:1px solid rgba(184,154,117,0.4);border-bottom:1px solid rgba(184,154,117,0.4);text-align:center;font-family:\'Noto Serif KR\',serif;font-size:12px;font-weight:400;color:#8A7A5E;letter-spacing:0.02em">아직 예약이 확정된 것은 아닙니다</div>' +
    centerP('아래 버튼으로 <b style="color:#B89A75;font-weight:600">마이페이지</b>에 들어가<br>진행 상황을 확인하실 수 있습니다.') +
    emailBtn(mypage, 'My Page', '#6B2A24') +
    smallP('이 링크는 자동으로 로그인됩니다.<br>다른 기기에서는 개인코드와 비밀번호로 로그인해 주세요.') +
    // 버튼이 안 열릴 때 대비 — 주소 직접 노출
    '<div style="margin:22px auto 0;max-width:440px;text-align:center">' +
      '<details style="text-align:center">' +
        '<summary style="cursor:pointer;list-style:none;font-family:\'Noto Serif KR\',serif;font-size:11px;font-weight:400;color:#A39C8E;letter-spacing:0.02em;outline:none">버튼이 열리지 않나요?</summary>' +
        '<div style="margin-top:10px;padding:12px 14px;background:#F5F3EF;border:1px solid #E2DCD2;border-radius:4px">' +
          '<div style="font-size:10px;color:#8A8475;margin-bottom:6px;font-family:\'Noto Sans KR\',sans-serif">아래 주소를 복사해 브라우저에 붙여넣어 주세요</div>' +
          '<a href="' + safeAttr(mypage) + '" style="font-size:10px;color:#6E6557;word-break:break-all;text-decoration:none;line-height:1.6;font-family:monospace">' + esc(mypage) + '</a>' +
        '</div>' +
      '</details>' +
    '</div>' +
    smallP('문의가 필요하시면 <a href="' + safeAttr(CONFIG.KAKAO_URL) + '" style="color:#B89A75;font-weight:500">카카오톡</a>으로 연락 주세요.');

  GmailApp.sendEmail(to, '[Moment Edit] 신청이 접수되었습니다 · 개인코드 ' + code, '',
    { htmlBody: emailShell('신청이 접수되었습니다', inner), name: SYS.FROM_NAME });
}

// detail 문자열에서 '희망 예식 일자 · 예상 하객 인원'만 가볍게 추림(고객 메일용)
function _applySummaryFromDetail(detail) {
  if (!detail) return '';
  var date = '', guests = '';
  String(detail).split('\n').forEach(function (line) {
    var i = line.indexOf(': ');
    if (i < 0) return;
    var label = line.slice(0, i).trim(), val = line.slice(i + 2).trim();
    if (label === '희망 예식 일자') date = val;
    if (label === '예상 하객 인원') guests = (typeof stripGuestFlag === 'function') ? stripGuestFlag(val) : val;
  });
  return [date, guests].filter(function (x) { return x && x !== '—'; }).join(' · ');
}
