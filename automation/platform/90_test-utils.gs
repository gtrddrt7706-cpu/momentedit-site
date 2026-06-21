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
  A('시그니처 9단계(시착 포함)', stageFlowFor('시그니처').length === 9);
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

// ★★ [계정 점검] 모든 고객 계정 나열 — 개인코드·이메일·단계·생성시각·비번설정 여부 (중복/엉뚱한 연동 추적) ★★
//   acctDump() 그냥 실행. 같은 이메일에 여러 코드가 있으면 재설정이 어느 걸 고르는지 보임.
function acctDump() {
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet), last = sheet.getLastRow();
  if (last < P.DATA_START_ROW) { Logger.log('계정 없음'); return '계정 없음'; }
  var vals = sheet.getRange(P.DATA_START_ROW, 1, last - P.DATA_START_ROW + 1, sheet.getLastColumn()).getValues();
  var g = function (rv, h) { var c = colOf[h]; return c ? String(rv[c - 1] == null ? '' : rv[c - 1]).trim() : ''; };
  var L = ['[acctDump] 총 ' + vals.length + '행'];
  for (var i = 0; i < vals.length; i++) {
    var rv = vals[i];
    L.push('  행' + (P.DATA_START_ROW + i)
      + ' · 코드=' + g(rv, '개인코드')
      + ' · 이메일=' + g(rv, '이메일')
      + ' · 단계=' + (g(rv, '현재단계') || '(빈값)')
      + ' · 생성=' + g(rv, '생성일시')
      + ' · 이름=' + (g(rv, '신랑이름') + '·' + g(rv, '신부이름'))
      + ' · 비번=' + (g(rv, '비번해시') ? 'O' : 'X'));
  }
  // 같은 이메일이 어느 코드로 재설정되는지
  var emails = {};
  for (var j = 0; j < vals.length; j++) { var e = g(vals[j], '이메일').toLowerCase(); if (e) (emails[e] = emails[e] || []).push(g(vals[j], '개인코드')); }
  Object.keys(emails).forEach(function (e) { if (emails[e].length > 1) L.push('  ⚠ 중복이메일 ' + e + ' → 코드: ' + emails[e].join(', ') + ' (재설정은 findLatestCustomerByEmail이 고른 1개로 감)'); });
  Logger.log(L.join('\n')); return L.join('\n');
}

// ★★ [재설정 추적] 재설정을 한 번 한 뒤 이 함수(resetDbgRun) 실행 → 폼이 보낸 비번이 입력값과 같은지 확정 ★★
//   '테스트비번'을 재설정 때 입력한 값으로 바꾸고 실행. fp가 같으면 폼이 그 값을 보낸 것(저장/로그인 쪽 문제),
//   다르면 폼이 다른 값을 보낸 것(자동완성 등 입력칸 오염 확정).
function resetDbgRun() {
  var 테스트비번 = '960612';   // ← 방금 재설정 때 입력했다고 생각하는 값
  return resetDbg(테스트비번);
}
function resetDbg(testPw) {
  var v = PropertiesService.getScriptProperties().getProperty('DBG_RESET') || '(없음 — 새 코드 재배포 후 재설정을 한 번 해야 기록됨)';
  var fp = _stretch(String(testPw || ''), 'FPSALT2026', 2).slice(0, 16);
  var same = v.indexOf('fp=' + fp) >= 0;
  var msg = '[resetDbg]\n  마지막 재설정이 받은 값: ' + v + '\n  테스트비번 길이=' + String(testPw || '').length + ' fp=' + fp
    + '\n  → ' + (same ? '✅ 일치: 폼은 그 비번을 정상 전송함(문제는 저장/로그인 쪽).' : '❌ 불일치: 폼이 다른 값을 전송함(자동완성·제안비번이 입력칸을 덮어씀 확정).');
  Logger.log(msg); return msg;
}

// ★★ [복구] 두 값만 바꾸고 이 함수(pwFixRun)를 실행 → 그 비번으로 즉시 로그인 가능 ★★
//   재설정이 꼬여 로그인 안 될 때 응급 복구. 비번해시를 직접 바르게 설정하고 검증까지 한다.
function pwFixRun() {
  var 개인코드 = 'X6W7PC';        // ← 본인 개인코드
  var 새비밀번호 = '960612';      // ← 앞으로 쓸 비밀번호
  return pwSet(개인코드, 새비밀번호);
}
function pwSet(code, newPw) {
  code = String(code || '').trim().toUpperCase();
  var r = findCustomerByCode(code);
  if (!r) { var m0 = '❌ 개인코드 못 찾음: ' + code; Logger.log(m0); return m0; }
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  touchCustomer(sheet, colOf, r.num, { '비번해시': hashPassword(String(newPw)) });
  var ok = verifyPassword(String(newPw), findCustomerByCode(code).get('비번해시'));
  var msg = '✅ ' + code + ' (행 ' + r.num + ') 비밀번호 설정 완료 · 검증=' + ok + (ok ? ' → 이제 그 비번으로 로그인하세요.' : ' (검증 실패 — 알려주세요)');
  Logger.log(msg); return msg;
}

// ★★ [진단] 두 값만 바꾸고 pwDiagRun 실행 → 로그 확인 ★★
function pwDiagRun() {
  var 개인코드 = 'X6W7PC';            // ← 본인 개인코드
  var 새비밀번호 = '여기에_새비밀번호'; // ← 확인할 비밀번호
  return pwDiag(개인코드, 새비밀번호);
}

// ── [진단] 비밀번호 재설정·로그인 문제 추적 (편집기 실행) ──
//   사용법: 위 pwDiagRun()의 두 값을 채우고 pwDiagRun 실행 → 로그 확인. (원문 비번은 로그에 안 남김)
//   "저장된 해시가 그 비번을 통과하는가"를 시트 실제값으로 검증한다. (원문 비번은 로그에 안 남김)
//   verifyOK=true  → 백엔드 정상. 로그인 실패는 프론트가 보낸 비번이 다른 것(자동완성 등) 또는 다른 행.
//   verifyOK=false → 저장된 해시가 그 비번과 불일치(재설정이 다른 값/행에 저장됐거나 옛 해시 잔존).
function pwDiag(code, testPw) {
  code = String(code || '').trim().toUpperCase();
  var L = ['[pwDiag] code=' + code];
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  L.push('비번해시 컬럼번호: ' + (colOf['비번해시'] || '❌ 헤더 못 찾음'));
  // 같은 개인코드 행이 몇 개인지(중복 시 재설정/로그인이 다른 행을 볼 수 있음)
  var last = sheet.getLastRow(), cCode = colOf['개인코드'], rows = [];
  if (cCode && last >= P.DATA_START_ROW) {
    var vals = sheet.getRange(P.DATA_START_ROW, 1, last - P.DATA_START_ROW + 1, sheet.getLastColumn()).getValues();
    for (var i = 0; i < vals.length; i++) {
      if (String(vals[i][cCode - 1] || '').trim().toUpperCase() === code) rows.push(P.DATA_START_ROW + i);
    }
  }
  L.push('개인코드 일치 행: ' + (rows.length ? rows.join(', ') : '없음') + (rows.length > 1 ? '  ⚠ 중복! (재설정/로그인이 다른 행을 볼 수 있음)' : ''));
  var r = findCustomerByCode(code);
  if (!r) { L.push('findCustomerByCode: 못 찾음'); Logger.log(L.join('\n')); return L.join('\n'); }
  L.push('findCustomerByCode 행: ' + r.num);
  var stored = String(r.get('비번해시') || '');
  var parts = stored.split('$');
  L.push('저장해시: ' + (stored ? (parts[0] + '$' + parts[1] + '$' + (parts[2] || '').slice(0, 6) + '…$len' + (parts[3] || '').length + ' (전체 ' + stored.length + '자, 조각 ' + parts.length + ')') : '❌ 비어있음'));
  if (testPw != null && testPw !== '') {
    L.push('verifyPassword(테스트비번): ' + verifyPassword(String(testPw), stored));
    // 같은 비번으로 새 해시를 만들어 형식 비교(라운드·구조 일치 확인)
    var fresh = hashPassword(String(testPw));
    L.push('지금 같은 비번 새 해시 형식: ' + fresh.split('$').slice(0, 2).join('$') + '$… (저장과 라운드 일치? ' + (parts[1] === fresh.split('$')[1]) + ')');
  } else {
    L.push('(testPw 미지정 — pwDiag("코드","비번")으로 비번까지 넣으면 통과 여부 확인)');
  }
  Logger.log(L.join('\n'));
  return L.join('\n');
}

// ── [관리자] 등록 계정 확인 (편집기 실행) — 비번해시는 표시하지 않음 ──
function adminSmokeTest() {
  var sh = _adminSheet();
  if (!sh) { Logger.log('Admins 시트 없음 — setupAdmins() 먼저 실행'); return 'Admins 시트 없음'; }
  var last = sh.getLastRow(), colOf = buildHeaderIndex(sh), log = ['등록된 관리자 계정:'];
  if (last < 2) { log.push('  (없음 — setAdminAccount("아이디","비번","이름")으로 등록)'); }
  else {
    var vals = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
    vals.forEach(function (r) {
      log.push('  · 아이디=' + r[(colOf['아이디'] || 1) - 1] + ' · 이름=' + r[(colOf['이름'] || 3) - 1] +
        ' · 비번=' + (r[(colOf['비번해시'] || 2) - 1] ? '설정됨' : '없음') + ' · 토큰=' + (r[(colOf['로그인토큰'] || 5) - 1] ? '발급됨' : '없음'));
    });
  }
  Logger.log(log.join('\n'));
  return log.join('\n');
}

// ── 회귀: 관리자 메모(21열)가 고객 getMyState 응답에 새지 않는지 ──
function testMemoNotLeaked() {
  if (!_LAST_TEST_CODE) { Logger.log('먼저 testSignupSignature() 실행'); return; }
  // 해당 코드에 메모 심기
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  var cust = findCustomerByCode(_LAST_TEST_CODE);
  if (cust) touchCustomer(sheet, colOf, cust.num, { '관리자메모': '내부전용-비밀메모-LEAKTEST' });
  var login = handleLogin({ code: _LAST_TEST_CODE, pw: 'test1234' });
  var state = handleGetMyState({ token: login.token });
  var json = JSON.stringify(state);
  var leaked = json.indexOf('LEAKTEST') >= 0 || ('관리자메모' in state) || ('memo' in state);
  Logger.log(leaked ? '❌ 메모가 마이페이지 응답에 노출됨!' : '✅ 관리자 메모 미노출(회귀 통과)');
  return !leaked;
}

// ── ⑧ 관리자 읽기 함수 점검 (묶음② 검증) — 편집기에서 ▶실행 → 보기>로그 ──
//    adminHome(큐+현황)·adminDetail(첫 고객·product-aware)·adminArchive(끝난 고객) 한 번에 로그.
function adminReadCheck() {
  var log = [];
  function L(s) { log.push(s); }

  // 1) adminHome — 큐 + 현황 + 카운트
  var h = adminHome();
  L('■ adminHome (오늘 ' + h.today + ')');
  L('  처리할 일: 총 ' + h.counts.total + ' (긴급 ' + h.counts.urgent + ')');
  L('  현황 인원: 시그 ' + h.pipeCounts['시그니처'] + ' · 스냅 ' + h.pipeCounts['웨딩스냅']);
  h.queue.urgent.concat(h.queue.normal).slice(0, 10).forEach(function (q) {
    L('   · [' + q.kind + '] ' + q.names + ' (' + q.product + ')' + (q.badge ? ' — ' + q.badge.text : ''));
  });
  h.pipeline['시그니처'].forEach(function (g) { if (g.count) L('   현황(시그) ' + g.stage + ' (' + g.count + ')' + (g.hasUrgent ? ' 🔴' : '')); });
  h.pipeline['웨딩스냅'].forEach(function (g) { if (g.count) L('   현황(스냅) ' + g.stage + ' (' + g.count + ')' + (g.hasUrgent ? ' 🔴' : '')); });

  // 2) adminDetail — 데이터의 첫 고객 코드로
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet), last = sheet.getLastRow(), code = '';
  if (last >= P.DATA_START_ROW) {
    var vals = sheet.getRange(P.DATA_START_ROW, colOf['개인코드'], last - P.DATA_START_ROW + 1, 1).getValues();
    for (var i = 0; i < vals.length; i++) { var c = String(vals[i][0] || '').trim(); if (c) { code = c; break; } }
  }
  L('■ adminDetail(' + code + ')');
  if (code) {
    var d = adminDetail(code);
    L('  ' + d.names + ' · ' + d.product + ' · 단계=' + d.stage);
    L('  cards: ' + (d.cards || []).join(', '));
    L('  pin: 예식일=' + d.pin['예식일'] + ' 하객=' + d.pin['하객']);
    var mk = []; Object.keys(d.mirror || {}).forEach(function (k) { if (d.mirror[k]) mk.push(k); });
    L('  거울(non-null): ' + (mk.join(', ') || '(없음)'));
    L('  raw: 단계=' + d.raw['현재단계'] + ' 계약=' + d.raw['계약상태'] + ' 입금=' + d.raw['입금상태']);
    L('  처리이력 ' + (d.history ? d.history.length : 0) + '줄 · 동의기록(시착)=' + (d.consent && d.consent.fitting ? 'Y' : 'N'));
  } else { L('  (고객 데이터 없음)'); }

  // 3) adminArchive — 끝난 고객(미계약·취소·노쇼·결과물전달)
  var a = adminArchive('', 'all');
  L('■ adminArchive: 총 ' + a.total + ' · 최근 ' + a.results.length + '명');
  a.results.slice(0, 6).forEach(function (r) { L('   · ' + r.names + ' | ' + r.endType + '(' + r.endTypeLabel + ') | 종료 ' + (r.modified || '—')); });

  var out = log.join('\n');
  Logger.log(out);
  return out;
}

// ── ⑧ 관리자 액션 점검 (묶음③ 검증) — ★테스트 고객 1명 생성 후 액션 체인 실행 ──
//    EX 멱등 함정·EX 우회·결과물 원본 필수 가드 등 까다로운 경로를 안전하게(실고객 X) 확인.
//    ⚠️ 테스트 고객 1행 생성 + 접수메일 1통(관리자). 끝나면 그 행 삭제 권장.
function adminActionCheck() {
  var log = [], code;
  function L(s) { log.push(s); }
  function J(o) { return JSON.stringify(o); }

  testSignupSignature();           // 테스트 시그 고객 생성 → _LAST_TEST_CODE
  code = _LAST_TEST_CODE;
  if (!code) { Logger.log('테스트 고객 생성 실패'); return; }
  L('■ 테스트 고객: ' + code + ' (시그·신청접수)');

  // 강제(정상→정상) — 신청접수→상담확정
  L('force 신청접수→상담확정: ' + J(adminForceStage(code, '상담확정', '테스트 셋업')));
  // 노쇼(정상→EX) + 멱등 함정(이미 노쇼면 already)
  L('노쇼 1차: ' + J(adminMarkNoshow(code)));
  L('노쇼 2차(멱등): ' + J(adminMarkNoshow(code)));
  // EX 우회(노쇼→상담확정 복구) + noop
  L('force 노쇼→상담확정(EX 우회): ' + J(adminForceStage(code, '상담확정', '복구')));
  L('force 동일(noop): ' + J(adminForceStage(code, '상담확정', '동일')));
  // 상담완료 + 멱등
  L('상담완료: ' + J(adminMarkConsultDone(code)));
  L('상담완료 2차(멱등): ' + J(adminMarkConsultDone(code)));
  // 결과물 체인 — 제작중→예식완료→(원본없음 거부)→링크등록→전달
  L('force →제작중: ' + J(adminForceStage(code, '제작중', '체인 테스트')));
  L('예식완료: ' + J(adminMarkEventDone(code)));
  L('전달(원본없음·거부 기대): ' + J(adminMarkDelivered(code)));
  L('링크등록: ' + J(adminSetResultLinks(code, { 원본: 'https://drive.google.com/test', 보정본: '', 영상: '' })));
  L('전달(원본있음·기대 ok+archived): ' + J(adminMarkDelivered(code)));
  // 잘못된 단계 강제(차단 기대)
  L('force 잘못된단계(거부 기대): ' + J(adminForceStage(code, '없는단계X', '오류 테스트')));

  var d = adminDetail(code);
  L('■ 처리이력 ' + (d.history ? d.history.length : 0) + '줄 (최신순):');
  (d.history || []).slice(0, 8).forEach(function (h) { L('  ' + h); });
  L('■ 최종 단계: ' + d.stage + ' / 결과물상태: ' + (d.raw && d.raw['결과물상태']));
  L('★ 테스트 고객(' + code + ') 행은 검증 후 시트에서 삭제 권장.');

  var out = log.join('\n');
  Logger.log(out);
  return out;
}
