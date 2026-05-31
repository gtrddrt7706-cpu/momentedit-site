/**
 * Moment Edit · 통합 플랫폼 (Phase 1) — 테스트·셀프체크 유틸
 * ──────────────────────────────────────────────────────────────────────────
 * GAS 편집기에서 함수를 골라 ▶실행 → 실행 로그(보기 > 로그)로 결과 확인.
 *   · platformSelfTest()      : 순수 로직 검증(시트·메일 없이). 가장 먼저 돌려볼 것.
 *   · testSignupSignature()   : 시그니처 테스트 고객 1행 생성 + 접수 메일(관리자 메일로).
 *   · testSignupSnap()        : 웨딩스냅 테스트 고객 1행 생성(진행바 6단계 검증용).
 *   · testLoginRoundTrip()    : 마지막 테스트 코드로 login→verify→getMyState 한 바퀴.
 *
 * ⚠️ test* 함수는 실제 시트에 행을 만들고 메일을 보냅니다(수신=CONFIG.ADMIN_EMAIL).
 *    운영 시작 후에는 테스트 행을 지워 주세요.
 */

// 마지막 테스트 코드 기억(라운드트립 테스트 연계용)
var _LAST_TEST_CODE = null;

// ── 순수 로직 셀프테스트 (시트·메일 불필요) ──────────────
function platformSelfTest() {
  var log = [];
  function ok(name, cond) { log.push((cond ? '  ✓ ' : '  ✗ FAIL ') + name); return !!cond; }
  var allPass = true;
  function A(n, c) { if (!ok(n, c)) allPass = false; }

  // 개인코드 문자 생성 1000회
  var ALPHA = P.CODE_ALPHABET, CONF = /[0O1IL2Z5S8B]/, good = true, len6 = true;
  for (var i = 0; i < 1000; i++) {
    var c = _randomCode();
    if (c.length !== P.CODE_LEN) len6 = false;
    if (CONF.test(c)) good = false;
    for (var j = 0; j < c.length; j++) if (ALPHA.indexOf(c.charAt(j)) < 0) good = false;
  }
  A('1000x 코드 전부 ' + P.CODE_LEN + '자', len6);
  A('1000x 코드 혼동문자 미포함·알파벳만', good);

  // 비번 해시 round-trip
  var h = hashPassword('Secret123!');
  A('해시 형식', /^sha256\$\d+\$[0-9a-f]+\$.+$/.test(h));
  A('해시에 원문 미포함', h.indexOf('Secret123!') < 0);
  A('맞는 비번 통과', verifyPassword('Secret123!', h) === true);
  A('틀린 비번 거부', verifyPassword('nope', h) === false);
  A('같은 비번도 솔트로 상이', hashPassword('Secret123!') !== h);

  // 비번 정책
  A('짧은 비번 거부', pwPolicyError('123') !== '');
  A('정상 비번 통과', pwPolicyError('123456') === '');

  // KST 만료
  A('과거 만료', tokenExpired('2020-01-01 00:00') === true);
  A('미래 미만료', tokenExpired('2099-01-01 00:00') === false);
  A('빈값 만료(안전)', tokenExpired('') === true);

  // reset 서명
  var exp = Date.now() + 3600000, sig = makeResetSig('A7K2QX', exp);
  A('reset 서명 통과', verifyResetSig('A7K2QX', exp, sig) === true);
  A('reset 서명 변조 거부', verifyResetSig('A7K2QX', exp, 'x') === false);
  A('reset 만료 거부', verifyResetSig('A7K2QX', Date.now() - 1, makeResetSig('A7K2QX', Date.now() - 1)) === false);

  // 진행바
  A('시그니처 9단계', stageFlowFor('시그니처').length === 9);
  A('웨딩스냅 6단계', stageFlowFor('웨딩스냅').length === 6);
  A('미지 상품 기본=시그니처', stageFlowFor('zzz').length === 9);
  A('신청접수 index 0', stageFlowFor('시그니처').indexOf('신청접수') === 0);
  A('스냅 신청접수 문구 촬영 언급', /촬영/.test(nextActionFor('웨딩스냅', '신청접수')));

  log.unshift(allPass ? '✅ platformSelfTest 전부 통과' : '❌ platformSelfTest 실패 항목 있음');
  var out = log.join('\n');
  Logger.log(out);
  return out;
}

// ── 테스트 고객 생성 (시그니처) ──────────────────────────
function testSignupSignature() {
  return _testSignup(P.PRODUCT_SIGNATURE);
}
// ── 테스트 고객 생성 (웨딩스냅) ──────────────────────────
function testSignupSnap() {
  return _testSignup(P.PRODUCT_SNAP);
}
function _testSignup(product) {
  var to = (CONFIG.ADMIN_EMAIL && CONFIG.ADMIN_EMAIL.charAt(0) !== '[') ? CONFIG.ADMIN_EMAIL : 'test@example.com';
  var res = handleSignup({
    action: 'signup',
    groom: '테스트신랑',
    bride: (product === P.PRODUCT_SNAP) ? '스냅신부' : '예식신부',
    phone: '010-0000-0000',
    email: to,
    memo: '테스트 신청 (' + product + ')',
    detail: '희망 예식 일자: 2026-09-19\n예상 하객 인원: 20명',
    pw: 'test1234',
    pw2: 'test1234',
    product: product
  });
  _LAST_TEST_CODE = res && res.code || null;
  Logger.log('테스트 신청(' + product + ') 결과: ' + JSON.stringify(res) +
    '\n  → 개인코드: ' + _LAST_TEST_CODE + ' / 비번: test1234 / 메일 수신: ' + to);
  return res;
}

// ── login → verify → getMyState 라운드트립 ──────────────
function testLoginRoundTrip() {
  if (!_LAST_TEST_CODE) {
    Logger.log('먼저 testSignupSignature() 또는 testSignupSnap() 을 실행하세요.');
    return '테스트 코드 없음';
  }
  var login = handleLogin({ action: 'login', code: _LAST_TEST_CODE, pw: 'test1234' });
  Logger.log('login: ' + JSON.stringify(login));
  if (!login.ok) return login;
  var verify = handleVerify({ token: login.token });
  Logger.log('verify: ' + JSON.stringify(verify));
  var state = handleGetMyState({ token: login.token });
  Logger.log('getMyState: ' + JSON.stringify(state));
  // 민감정보 미포함 확인
  var leak = ('비번해시' in state) || ('pwHash' in state) || JSON.stringify(state).indexOf('sha256$') >= 0;
  Logger.log(leak ? '❌ 응답에 민감정보 누출!' : '✅ 응답에 민감정보 없음');
  return state;
}
