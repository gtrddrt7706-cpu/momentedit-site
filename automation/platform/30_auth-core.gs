/**
 * Moment Edit · 통합 플랫폼 (Phase 1) — T5 인증 코어 (비번 해시 · 세션 토큰)
 * ──────────────────────────────────────────────────────────────────────────
 * 비밀번호 원문은 시트·응답·로그 어디에도 남기지 않는다(DoD).
 *   저장 형식: 'sha256$<rounds>$<salt>$<hash>'  ← per-user 솔트 + 라운드 스트레칭
 *   (GAS 에는 bcrypt 가 없어 SHA-256 스트레칭으로 대체. 솔트로 레인보우 방어.)
 *
 * 토큰은 makeToken()(=UUID 32자) 재사용. 만료는 KST 'YYYY-MM-DD HH:mm' 문자열로 저장.
 */

// ============================ 비밀번호 해시 ============================
function hashPassword(pw) {
  var salt = _randomSaltHex(16);
  var hash = _stretch(String(pw), salt, P.PW_HASH_ROUNDS);
  return 'sha256$' + P.PW_HASH_ROUNDS + '$' + salt + '$' + hash;
}

// 입력 비번이 저장 해시와 일치하는지 — 상수시간 비교.
function verifyPassword(pw, stored) {
  var parts = String(stored || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'sha256') return false;
  var rounds = parseInt(parts[1], 10), salt = parts[2];
  if (!rounds || !salt) return false;
  var calc = _stretch(String(pw), salt, rounds);
  return _constTimeEq(calc, parts[3]);
}

// salt+pw 를 rounds 번 SHA-256 스트레칭 → base64
function _stretch(pw, salt, rounds) {
  var h = salt + '|' + pw;
  for (var i = 0; i < rounds; i++) {
    var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h, Utilities.Charset.UTF_8);
    h = Utilities.base64Encode(raw);
  }
  return h;
}

function _randomSaltHex(nBytes) {
  // UUID 두 개를 이어 충분한 엔트로피의 hex 솔트 생성
  var s = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  return s.slice(0, nBytes * 2);
}

// 길이·내용 모두 상수시간에 가깝게 비교 (타이밍 누출 최소화)
function _constTimeEq(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= (a.charCodeAt(i) ^ b.charCodeAt(i));
  return diff === 0;
}

// 비번 정책 검사 — 통과 시 '' , 실패 시 사유 문자열
function pwPolicyError(pw) {
  pw = String(pw == null ? '' : pw);
  if (pw.length < P.PW_MIN_LEN) return '비밀번호는 ' + P.PW_MIN_LEN + '자 이상이어야 합니다.';
  if (pw.length > 100) return '비밀번호가 너무 깁니다.';
  return '';
}

// ============================ 세션 토큰 ============================
// 토큰 발급(=갱신). 기존 토큰이 있으면 새 토큰으로 덮어써 이전 토큰을 무효화한다.
// 반환: { token, expiry } (expiry = KST 문자열)
function issueToken(sheet, colOf, rowNum) {
  var token = makeToken(); // UUID 32자 재사용
  var expiry = fmtKST(new Date(Date.now() + P.TOKEN_VALID_DAYS * 86400 * 1000));
  touchCustomer(sheet, colOf, rowNum, { '로그인토큰': token, '토큰만료': expiry });
  return { token: token, expiry: expiry };
}

// 토큰 문자열이 만료됐는지 (저장 만료 문자열 기준)
function tokenExpired(expiryStr) {
  var d = parseKSTString(expiryStr);
  if (!d) return true;            // 만료값이 없거나 깨졌으면 만료로 간주(안전)
  return Date.now() > d.getTime();
}

// 'YYYY-MM-DD HH:mm' (KST) → Date. 스크립트 타임존과 무관하게 정확히 파싱.
function parseKSTString(str) {
  var m = String(str || '').match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!m) return null;
  var ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - 9 * 3600 * 1000; // KST=UTC+9
  return new Date(ms);
}

// 토큰으로 고객 행을 찾고 유효성(존재+미만료)까지 확인.
// 반환: { ok, row, sheet, colOf } 또는 { ok:false, reason }
function resolveSession(token) {
  token = String(token || '').trim();
  if (!token) return { ok: false, reason: 'no_token' };
  var rowObj = findCustomerByToken(token);
  if (!rowObj) return { ok: false, reason: 'invalid' };
  if (tokenExpired(rowObj.get('토큰만료'))) return { ok: false, reason: 'expired' };
  var sheet = getCustomersSheet();
  var colOf = buildHeaderIndex(sheet);
  return { ok: true, row: rowObj, sheet: sheet, colOf: colOf };
}

// ============================ 비번 재설정용 서명 링크 (resetPw) ============================
// 메일로 보내는 재설정 링크를 HMAC 서명한다. 기존 sign()/getSecret() 재사용 + 만료 포함.
// payload: 개인코드 + 만료 epoch. 링크 변조·무한 사용 방지.
function makeResetSig(code, expEpoch) {
  // 기존 sign(token, action) 시그니처 형태에 맞춰 'reset' 액션으로 서명
  return sign(code + '.' + expEpoch, 'resetpw');
}
function verifyResetSig(code, expEpoch, sig) {
  if (!sig) return false;
  if (Date.now() > Number(expEpoch)) return false;        // 만료
  return _constTimeEq(sig, makeResetSig(code, expEpoch));
}
