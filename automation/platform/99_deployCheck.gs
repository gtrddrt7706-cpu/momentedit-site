/* ★[DEPLOY_CHECK 2026-08-26 · 갱신 2026-08-29] 「전부 올렸는지」를 GAS 안에서 스스로 확인한다.
 *
 * 쓰는 법 — 이 파일 내용을 통째로 붙여넣고,
 *   상단 드롭다운에서 deployCheck 를 골라 실행 → 실행 로그를 본다.
 *   ★재배포 없이 실행된다(편집기는 저장된 코드로 돈다). 아무것도 쓰지 않는다(읽기 전용).
 *
 * 무엇을 보나
 *   ①파일이 다 있는가 — 파일마다 «그 파일에만 있는 함수» 하나로 존재를 확인
 *   ①-B 그 파일이 «끝까지» 붙었는가 — 최상위 함수 588개를 전수 대조(붙여넣다 잘린 뒷부분을 잡는다)
 *   ①-C 화면 파일 4벌(Admin·ScreenA·B·C)이 붙었는가 — 템플릿 본문을 읽어 표식으로 확인
 *   ⑦설정값(스크립트 속성) — 스위치가 켜졌는데 키가 비어 있으면 «오류 없이» 그 기능만 안 돈다
 *   ②최근 변경이 실제로 올라갔는가 — 새 함수의 존재 + 함수 본문 안의 표식(toString)
 *   ★표식은 주석이라 «붙여넣다 잘렸는지»까지 잡는다. 이름만 맞고 내용이 옛것이면 여기서 걸린다.
 *
 * ★★[MARKS_REMOTE 2026-08-30 사용자 질문 "99파일은 매번 같이 업로드해야하는거야?"]
 *   답은 «그랬다» 였다 — 목록이 이 파일 안에 있어서, 새 변경이 main 에 들어올 때마다 목록이 늘고
 *   이 파일도 함께 붙여넣어야 했다. 게이트가 그걸 강제하니 사실상 매번이었다.
 *   ★이제 목록은 https://momentedit.kr/deploy-marks.json 에 있다. main 병합 → Vercel 자동 배포라
 *     늘 최신이다. **이 파일은 한 번만 붙여넣으면 그 뒤로 안 바꿔도 된다.**
 *   ★사이트를 못 읽으면 아래 FILES(파일 존재 확인)만으로 돈다. 그때는 «목록을 못 읽었다»고 크게 알린다 —
 *     조용히 줄어든 점검은 «통과»로 읽혀서 가장 위험하다.
 *   ★FILES 를 파일 안에 남겨 두는 이유: 파일이 늘거나 줄 때만 바뀌어 거의 안 변하고,
 *     사이트가 죽었을 때 최소한 «통째로 안 붙인 파일»은 잡아 주기 때문이다.
 *
 * ★[FIX 2026-08-29] 두 가지를 고쳤다. 되돌리지 말 것.
 *   ①90_test-utils 의 기준이 `setupAllTriggers` 였는데 그 함수는 **70_journey.gs** 에 있다.
 *     → 90_test-utils 를 통째로 안 붙여도 「OK」가 나오던 자리다(일부러 빼서 확인). `platformSelfTest` 로 교체.
 *   ②8/29 확정(예식 확인서) 변경 중 CF_ONCE·CF_LOG 가 항목에 없어 못 잡았다 → ②에 추가.
 *   기준 함수 24개가 실제로 어느 파일에 있는지 전수 대조했고, 지금 코드로 돌려 54항목 전부 통과한다.
 */
function deployCheck() {
  var L = [];
  var okN = 0, badN = 0;
  function chk(label, cond, hint) {
    if (cond) { okN++; L.push('  OK   ' + label); }
    else { badN++; L.push('  MISS ' + label + (hint ? ('   → ' + hint) : '')); }
  }
  function has(name) { try { return eval('typeof ' + name) === 'function'; } catch (e) { return false; } }
  function src(name) { try { return eval('String(' + name + ')'); } catch (e) { return ''; } }
  function mark(fn, m) { var s = src(fn); return s && s.indexOf(m) >= 0; }

  /* [MARKS_REMOTE] 목록을 사이트에서 가져온다 — 실패하면 아래 FILES 만으로 돈다. */
  var MARKS_URL = 'https://momentedit.kr/deploy-marks.json';
  var REMOTE = null, remoteWhy = '';
  try {
    var _mr = UrlFetchApp.fetch(MARKS_URL, { muteHttpExceptions: true, followRedirects: true });
    if (_mr.getResponseCode() === 200) {
      var _mj = JSON.parse(_mr.getContentText());
      if (_mj && _mj.files && _mj.files.length) REMOTE = _mj;
      else remoteWhy = '내용이 비었습니다';
    } else remoteWhy = 'HTTP ' + _mr.getResponseCode();
  } catch (e) { remoteWhy = String((e && e.message) || e).slice(0, 60); }

var FILES = [   /* 18개 — 86_dining_ai 제외(빈 슬롯) */
    ['00_platform-config', 'stageFlowFor'], ['10_customers-setup', 'setupCustomers'],
    ['20_customers-data', 'findCustomerByCode'], ['30_auth-core', 'resolveSession'],
    ['40_signup', 'handleSignup'], ['50_auth-handlers', 'handleLogin'],
    ['60_mypage', 'handleGetMyState'], ['70_journey', 'buildRefundQuote'],
    ['80_production', 'handleSaveProductionTrack'], ['85_invitation', 'handleSaveInvitationDraft'],
    ['88_place_audit', 'auditDineDb'],
    ['90_test-utils', 'platformSelfTest'],   /* ★setupAllTriggers 로 되돌리지 말 것 — 그건 70_journey 에 있다 */
    ['95_notify', 'notifySetupCheck'],
    ['96_ai_cost', 'aiMorningReport'], ['97_ai-handoff', 'aiHandoffStatus'],
    ['98_pay_card', 'ZZ_tossPing'], ['consultation-booking', 'doPost'], ['admin', 'adminHome']
  ];

  if (REMOTE) L.push('목록: 사이트에서 가져옴 (' + MARKS_URL + ')' + (REMOTE['_생성'] ? ('  · 목록 만든 때 ' + REMOTE['_생성']) : ''));
  /* ★[MARKS_AGE] 날짜가 오늘 작업보다 뒤처져 있으면, 사이트 배포가 아직 안 끝났거나 실패한 것이다.
     그 상태에서 「누락 0건」은 «옛 목록 기준»이라 그만큼만 믿을 수 있다. */
  else {
    L.push('★★목록: 사이트를 못 읽어 파일 안 사본으로 돕니다 (' + remoteWhy + ')');
    L.push('  → 파일 존재만 확인합니다. «최근 변경이 올라갔는지»는 이번 실행에서 확인하지 못했습니다.');
  }
  L.push('');

  L.push('══ ① 파일이 다 있는가 (파일마다 «그 파일에만 있는» 함수 하나로 확인) ══');
  var fileList = REMOTE ? REMOTE.files.map(function (o) { return [o.file, o.fn]; }) : FILES;
  for (var i = 0; i < fileList.length; i++) {
    chk('파일 ' + fileList[i][0] + '  (기준: ' + fileList[i][1] + ')', has(fileList[i][1]), '이 파일이 없거나 이름이 다릅니다');
  }
  L.push('  --   파일 86_dining_ai  (주석만 있는 빈 슬롯 · 실행으로 확인 불가 · 없어도 무방)');
  L.push('  --   화면 파일(Admin·ScreenA·B·C)은 바로 아래 ①-C 에서 본문을 읽어 확인한다');

  L.push('');
  L.push('══ ①-B 파일 «안쪽»까지 다 붙었는가 (함수·표 전수 대조) ══');
  /* ★★[FNS_FULL 2026-09-05 사용자 질문 "배포했는데 최신본맞는지 누락없는지"]
     ①은 파일마다 «함수 하나»로 존재만 봤다. 그래서 그 함수보다 아래가 잘려도 통과했다.
     실측 — 점검이 닿던 가장 아래 줄: 90_test-utils 6% · 40_signup 7% · 50_auth-handlers 8% · 10_customers-setup 9%.
     즉 그 파일들은 «앞 스무 줄만 붙여도» 누락 0건이 나왔다. 그 사각지대를 여기서 없앤다.
     목록(fns)은 사이트에 있으니 이 파일을 다시 붙여넣을 필요는 없다. */
  if (!REMOTE) {
    L.push('  --   목록을 못 읽어 건너뜁니다 (위 ★★줄 참고 · 통과가 아닙니다)');
  } else if (!REMOTE.fns) {
    /* 목록은 읽혔는데 fns 가 없다 = 사이트에 아직 옛 목록이 올라가 있다(병합 직후 몇 분).
       「못 읽었다」고 하면 거짓말이 된다 — 무엇이 없는지 그대로 말한다. */
    L.push('  --   목록은 읽혔지만 함수 목록(fns)이 없습니다 — 사이트가 아직 옛 판입니다 (통과가 아닙니다)');
    L.push('       → 몇 분 뒤(Vercel 배포 완료) 다시 실행하면 이 절이 돕니다.');
  } else {
    /* ★[LIST_PARTIAL 2026-09-05] 목록이 «낡았다»는 것은 이 점검이 스스로 못 보는 종류의 실패다 —
       빠진 항목은 붉어지지 않고 그냥 «안 세어질» 뿐이라, 조용히 적게 검사하고 「누락 0건」이 된다.
       나란히 일하는 세션이 늘면 이게 진짜로 생긴다(A 가 넣은 함수가 B 가 만든 목록에 없는 판).
       전부는 못 잡아도 «파일 하나가 통째로 빠진» 판은 여기서 잡는다 — ①의 파일 목록과 대조한다. */
    var _noFns = [];
    for (var fi = 0; fi < fileList.length; fi++)
      if (!REMOTE.fns[fileList[fi][0]]) _noFns.push(fileList[fi][0]);
    if (_noFns.length) {
      L.push('  ★★목록이 낡았습니다 — 함수 목록에 없는 파일: ' + _noFns.join(', '));
      L.push('       이 파일들은 이번 실행에서 «안쪽까지» 확인하지 못했습니다 (통과가 아닙니다).');
      L.push('       사이트 배포가 끝나길 기다렸다가 다시 실행하세요.');
    }
    var fnTotal = 0, fnMiss = 0;
    for (var fk in REMOTE.fns) {
      var arr = REMOTE.fns[fk], lack = [];
      for (var q = 0; q < arr.length; q++) { fnTotal++; if (!has(arr[q])) lack.push(arr[q]); }
      if (lack.length) {
        fnMiss += lack.length;
        chk('파일 ' + fk + ' 안쪽  (' + (arr.length - lack.length) + '/' + arr.length + '개 있음)', false,
          '없는 함수 ' + lack.length + '개: ' + lack.slice(0, 6).join(', ') + (lack.length > 6 ? ' …' : '') +
          '  → 이 파일을 통째로 다시 붙여넣으세요');
      }
    }
    /* ★[VARS_TOO 2026-09-05] 표(var)도 함께 본다 — CUSTOMER_HEADERS·STAGE_FLOW·PRICING·NOTIFY_EVENTS 처럼
       «함수가 아닌» 원천이 여기 있다. GAS 도 vm 도 최상위 var 는 전역 속성이 되어 같은 방법으로 확인된다.
       ★consultation-booking 의 const 5개(CONFIG·SYS·HEADERS·ST·LOCKED_STATES)는 일부러 뺐다 —
         const 는 전역 속성이 아니라, 여기서 «되는지 확인할 수 없는» 검사가 된다. 그 파일은 함수 130개로 덮인다. */
    var varTotal = 0, varMiss = 0;
    if (REMOTE.vars) for (var vk in REMOTE.vars) {
      var va = REMOTE.vars[vk], vlack = [];
      for (var w = 0; w < va.length; w++) {
        varTotal++;
        var okv = false; try { okv = eval('typeof ' + va[w]) !== 'undefined'; } catch (e) { okv = false; }
        if (!okv) vlack.push(va[w]);
      }
      if (vlack.length) {
        varMiss += vlack.length;
        chk('파일 ' + vk + ' 의 표  (' + (va.length - vlack.length) + '/' + va.length + '개 있음)', false,
          '없는 표 ' + vlack.length + '개: ' + vlack.slice(0, 6).join(', ') + (vlack.length > 6 ? ' …' : '') +
          '  → 이 파일을 통째로 다시 붙여넣으세요');
      }
    }
    /* ★[LIST_REVERSE 2026-09-05] 반대 방향 — «GAS 에는 있는데 목록에 없는» 함수.
       목록이 부분만 뒤처지면(다른 세션 것이 아직 사이트에 안 올라감) 그 함수들은 붉어지지 않고
       그냥 «안 세어진다». 그 판을 여기서 되짚는다.
       ★판정(MISS)으로 만들지 않는다 — 제가 모르는 GAS 내장이 섞이면 «고칠 수 없는 빨강»이 되고,
         그러면 사람이 이 절을 통째로 안 읽게 된다. 대신 이름을 보여 주고 판단을 넘긴다.
       ★열거 자체가 안 되면 그렇다고 말한다 — 조용히 0개로 넘어가면 «봤다»는 착각을 준다. */
    try {
      var _all = Object.getOwnPropertyNames(globalThis);
      if (_all.length < 50) {
        L.push('  --   되짚기(목록에 없는 함수 찾기)는 이 환경에서 못 했습니다 — 안 본 것입니다');
      } else {
        var _known = {};
        for (var kf in REMOTE.fns) for (var ki = 0; ki < REMOTE.fns[kf].length; ki++) _known[REMOTE.fns[kf][ki]] = 1;
        if (REMOTE.vars) for (var kv in REMOTE.vars) for (var kj = 0; kj < REMOTE.vars[kv].length; kj++) _known[REMOTE.vars[kv][kj]] = 1;
        var _std = ('Object Function Array Number Boolean String Symbol Date RegExp Error EvalError RangeError ReferenceError ' +
          'SyntaxError TypeError URIError Math JSON Promise Map Set WeakMap WeakSet Proxy Reflect BigInt ArrayBuffer ' +
          'SharedArrayBuffer DataView Int8Array Uint8Array Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array ' +
          'Float32Array Float64Array BigInt64Array BigUint64Array eval isNaN isFinite parseInt parseFloat decodeURI ' +
          'decodeURIComponent encodeURI encodeURIComponent escape unescape globalThis undefined NaN Infinity ' +
          'AggregateError FinalizationRegistry WeakRef Atomics Intl Iterator AsyncIterator console deployCheck projectCheck').split(' ');
        for (var si = 0; si < _std.length; si++) _known[_std[si]] = 1;
        var _extra = [];
        for (var ai = 0; ai < _all.length; ai++) {
          var _n = _all[ai];
          if (_known[_n]) continue;
          var _t = ''; try { _t = typeof globalThis[_n]; } catch (e) { continue; }
          if (_t !== 'function') continue;          /* GAS 서비스는 object 라 안 걸린다 */
          if (/^[A-Z][a-zA-Z]*(App|Service)$/.test(_n)) continue;   /* SpreadsheetApp·CacheService … */
          if (_n.indexOf('__') === 0) continue;   /* 검사 도구가 심는 이름 — 이 저장소에는 __ 로 시작하는 함수가 없다 */
          _extra.push(_n);
        }
        if (_extra.length) {
          L.push('  ★★목록에 없는 함수 ' + _extra.length + '개: ' + _extra.slice(0, 10).join(', ') + (_extra.length > 10 ? ' …' : ''));
          L.push('       목록이 뒤처졌을 수 있습니다(다른 작업이 아직 사이트에 안 올라감) — 그 함수들은 이번에 확인 못 했습니다.');
          L.push('       ※ 제가 모르는 GAS 내장일 수도 있습니다. 이름을 알려 주시면 다음 판에서 걸러 두겠습니다.');
        }
      }
    } catch (e) {
      L.push('  --   되짚기를 못 했습니다: ' + ((e && e.message) || e) + ' — 안 본 것입니다');
    }

    if (fnMiss === 0 && varMiss === 0)
      chk('함수 ' + fnTotal + '개 · 표 ' + varTotal + '개 전부 있음 (붙여넣다 잘린 파일 없음)', true);
    else if (fnMiss === 0)
      chk('함수 ' + fnTotal + '개는 전부 있음', true);
  }

  L.push('');
  L.push('══ ①-C 화면 파일(HTML)이 붙었는가 ══');
  /* ★[ADMIN_HTML 2026-09-05] 종전엔 Admin.html 을 「화면 틀이라 코드로 확인 불가」로 비워 두었고,
     상담 화면 셋(ScreenA·B·C)은 언급조차 없었다 — 넷을 합쳐 361KB 가 통째로 점검 밖이었다.
     사실은 볼 수 있다: 넷 다 HtmlService.createTemplateFromFile 로 읽히니 본문이 잡힌다.
     ★길이는 «판정»이 아니라 «참고»로 둔다 — 줄바꿈 처리 차이로도 달라질 수 있어, 그걸로 붉히면
       고칠 수 없는 빨강이 된다. 붙었는지·옛 판인지는 표식으로 가른다. */
  if (!REMOTE || !REMOTE.html) {
    L.push('  --   목록을 못 읽어 건너뜁니다 (통과가 아닙니다)');
  } else {
    for (var hi = 0; hi < REMOTE.html.length; hi++) {
      var _hm = REMOTE.html[hi];
      try {
        var _raw = HtmlService.createTemplateFromFile(_hm.file).getRawContent();
        var _hlack = _hm.marks.filter(function (m) { return _raw.indexOf('[' + m + ']') < 0; });
        chk(_hm.file + '.html  (표식 ' + _hm.marks.length + '개)', _hlack.length === 0,
          '없는 것: ' + _hlack.join(', ') + ' → 이 화면 파일을 다시 붙여넣으세요');
        /* ★[HTML_LEN 2026-09-05 사용자 질문 "다른 채팅방에서 파일수정하면 … 빈틈없이?"]
           길이를 «참고»로만 두었더니 구멍이 하나 남았다 — 다른 세션이 화면 본문을 고치고
           표식은 그대로 두면(대개 그렇다) 표식 검사는 통과하고, 길이 차이는 세어지지 않아
           「누락 0건」이 나온다. .gs 는 FILE_COVER 가 «마지막 커밋의 표식»을 요구해 막지만
           HTML 에는 그 규율이 없다. 그래서 길이를 판정으로 올린다.
           ★근거: 실기 4벌 전부 저장소와 «글자 수까지» 일치했다(2026-09-05 12:21) —
             GAS 가 본문을 그대로 보관한다는 실측이다. 붙여넣기가 온전하면 길이는 어긋나지 않는다.
           ★어긋나도 할 일은 하나다 — 그 파일을 다시 붙여넣는 것. 고칠 수 없는 빨강이 아니다.
           ★목록의 bytes 는 저장소가 바뀌면 게이트(gen-deploy-fns --check)가 갱신을 강제하므로
             늘 main 을 따라간다(반증으로 확인). */
        chk(_hm.file + '.html 본문 길이 ' + _hm.bytes + '자', _raw.length === _hm.bytes,
          '지금 ' + _raw.length + '자 — ' + (_raw.length < _hm.bytes ? (_hm.bytes - _raw.length) + '자 모자랍니다' : (_raw.length - _hm.bytes) + '자 많습니다') +
          ' → 이 화면 파일을 다시 붙여넣으세요 (표식은 있으니 «옛 판»입니다)');
      } catch (e) {
        chk(_hm.file + '.html', false, '못 읽었습니다: ' + ((e && e.message) || e) + ' → 그 이름의 HTML 파일이 없습니다');
      }
    }
  }

  L.push('');
  L.push('══ ② 최근 변경이 실제로 올라갔는가 ══');
  if (!REMOTE) L.push('  --   목록을 못 읽어 건너뜁니다 (위 ★★줄 참고 · 통과가 아닙니다)');
  else {
    for (var j2 = 0; j2 < REMOTE.newfn.length; j2++) {
      var f = REMOTE.newfn[j2];
      chk('[' + f.file + '] ' + f.fn + ' — ' + f.why, has(f.fn), '그 파일이 옛 버전입니다');
    }
    for (var k = 0; k < REMOTE.marks.length; k++) {
      var m = REMOTE.marks[k];
      chk('[' + m.file + '] ' + m.fn + ' 안의 ' + m.mark + ' — ' + m.why, mark(m.fn, m.mark), '그 파일이 옛 버전이거나 붙여넣다 잘렸습니다');
    }
  }

  L.push('');
  L.push('══ ③ 쿠폰 발급 안내가 켜져 있는가 ══');
  try {
    var ev = (typeof NOTIFY_EVENTS !== 'undefined') ? NOTIFY_EVENTS['cust.couponIssued'] : null;
    chk('cust.couponIssued 이벤트가 등록됨', !!ev, '95_notify 가 옛 버전입니다');
    if (ev) chk('그 이벤트가 «켜짐»(off 아님)', !ev.off, '보내려면 off: true 를 지우세요');
  } catch (e) { chk('알림 이벤트 표 읽기', false, String(e && e.message)); }

  L.push('');
  L.push('══ ④ 배포가 «먹었는가» (저장만으론 /exec 에 안 먹는다) ══');
  /* ★★[DEPLOY_STAMP 2026-08-30] 종전엔 자기 /exec 를 찔러 봤는데 구글이 막는다(실측 HTTP 401).
     그래서 방향을 뒤집었다 — 배포된 코드가 /exec 를 탈 때마다 «자기 지문»을 남기고(deployStamp),
     여기서는 «저장된 코드»의 지문을 같은 방법으로 계산해 그것과 대조한다.
     같다  → 지금 저장된 코드가 그대로 배포돼 있다.
     다르다 → 저장은 했는데 «새 버전»으로 배포를 안 했다(또는 배포 뒤 또 고쳤다).
     ★기록이 없을 수도 있다 — 배포 뒤 아직 아무도 사이트를 안 썼을 때다. 그건 «실패»가 아니라 «아직 모름»이다.
       그때는 관리자 페이지를 한 번 열면 곧바로 찍힌다고 알려 준다. */
  try {
    if (typeof deployFingerprint !== 'function') {
      L.push('  --   배포 확인  (deployStamp 가 없는 옛 00_platform-config 입니다 · 실패 아님)');
    } else {
      var _saved = deployFingerprint();
      var _rec = String(PropertiesService.getScriptProperties().getProperty('DEPLOY_CODE_FINGERPRINT') || '');
      var _live = _rec.split('|')[0], _at = _rec.split('|')[1] || '';
      if (!_rec) {
        L.push('  --   배포 확인  (배포 뒤 아직 요청이 없어 «아직 모름» · 실패 아님)');
        L.push('       → 관리자 페이지를 한 번 열고 이 점검을 다시 돌리면 판정됩니다.');
      } else if (_live === _saved) {
        chk('배포본이 지금 저장된 코드와 같다  (마지막 확인 ' + _at.slice(0, 16).replace('T', ' ') + ')', true);
      } else {
        /* ★[STAMP_MISS_WORDING 2026-09-05 사용자 "직접확인해볼래? 누락없는지" 에서 잡음]
           여기는 «다르다»고 말해야 한다. 종전엔 OK 쪽 라벨을 그대로 재사용해
           **「MISS 배포본이 지금 저장된 코드와 같다」** 가 찍혔다 — 실패인데 성공 문장이다.
           사용자가 재배포가 먹었는지 확인하는 «바로 그 순간»에 정반대를 말하던 줄이다.
           ★OK 쪽 문장으로 되돌리지 말 것(deploycheck-sim 5번이 문구까지 고정한다). */
        chk('배포본이 지금 저장된 코드와 «다르다»', false,
          '저장만 했습니다 — 배포 관리에서 «새 버전»으로 재배포하세요 (배포본 ' + _live + ' · 저장본 ' + _saved + ')');
      }
    }
  } catch (e) { L.push('  --   배포 확인  (확인 불가 · 실패 아님): ' + ((e && e.message) || e)); }

  L.push('');
  L.push('══ ⑤ 시트 컬럼이 준비됐는가 (함수만 있고 컬럼이 없으면 저장이 조용히 사라진다) ══');
  /* ★addGuestPhotoColumns 는 «배포 전에» 한 번 돌려야 한다. 안 돌리면 writeCell 이 헤더 없는 칸을
     조용히 건너뛰어 저장이 통째로 사라진다(화면엔 「저장됐어요」). 그 상태를 여기서 잡는다. */
  /* ★[COLS_ALL 2026-09-05] 종전엔 하객사진 4개만 봤다. 컬럼을 만드는 함수는 다섯이고 전부 «사람이 한 번 돌려야»
     하는 것들이라, 나머지 넷은 안 돌려도 「누락 0건」이 나왔다. 목록은 저장소에서 그 함수들을 실제로 실행해 뽑는다. */
  try {
    var _sh = getCustomersSheet();
    var _hd = _sh.getRange(1, 1, 1, _sh.getLastColumn()).getValues()[0].map(function (v) { return String(v).trim(); });
    if (!REMOTE || !REMOTE.columns) {
      L.push('  --   목록을 못 읽어 건너뜁니다 (통과가 아닙니다)');
    } else {
      for (var ci = 0; ci < REMOTE.columns.length; ci++) {
        var _c = REMOTE.columns[ci];
        var _lack = _c.need.filter(function (h) { return _hd.indexOf(h) < 0; });
        chk('컬럼 ' + _c.need.length + '개 (' + _c.fn + ')', _lack.length === 0,
          '없는 것 ' + _lack.length + '개: ' + _lack.slice(0, 8).join(', ') + (_lack.length > 8 ? ' …' : '') +
          '  → ' + _c.file + ' 을 열고 ' + _c.fn + ' 실행');
      }
    }
  } catch (e) { chk('시트 확인', false, String(e && e.message)); }

  L.push('');
  L.push('══ ⑥ 예약 실행(트리거)이 걸려 있는가 ══');
  /* ★[TRIGGERS 2026-09-05] 코드를 붙이고 «새 버전»으로 배포해도 예약 실행은 안 걸린다 — setupAllTriggers 를 사람이 돌려야 한다.
     그동안 점검이 이걸 안 봐서, 새 일일 작업이 영영 안 도는데도 「누락 0건」이 나올 수 있었다.
     ★한 번이라도 트리거를 손으로 지웠거나, 새 작업이 늘었는데 setupAllTriggers 를 다시 안 돌린 상태가 여기서 잡힌다. */
  try {
    if (!REMOTE || !REMOTE.triggers) {
      L.push('  --   목록을 못 읽어 건너뜁니다 (통과가 아닙니다)');
    } else {
      var _have = ScriptApp.getProjectTriggers().map(function (t) { return t.getHandlerFunction(); });
      var _tlack = REMOTE.triggers.filter(function (fn) { return _have.indexOf(fn) < 0; });
      chk('예약 실행 ' + REMOTE.triggers.length + '개', _tlack.length === 0,
        '안 걸린 것 ' + _tlack.length + '개: ' + _tlack.join(', ') + '  → 70_journey 를 열고 setupAllTriggers 실행');
    }
  } catch (e) { L.push('  --   트리거 확인 불가(권한 승인 전일 수 있습니다): ' + ((e && e.message) || e)); }

  L.push('');
  L.push('══ ⑦ 설정값(스크립트 속성)이 들어 있는가 ══');
  /* ★[PROPS_CHECK 2026-09-05 사용자 "완성도높게 테스트하면 전부 체크할수있게"]
     여기가 「코드는 멀쩡한데 기능만 조용히 안 도는」 자리다 — 키가 비면 문자도 카드결제도
     «오류 없이» 그냥 안 나간다. 종전엔 통째로 점검 밖이라 「누락 0건」과 무관했다.
     ★값은 절대 찍지 않는다 — «있음/없음»만 본다(비밀이 실행 로그로 새지 않게).
     ★«필수»는 스위치가 켜졌을 때만이다. 안 쓰는 기능 때문에 붉어지면 사람이 이 절을 안 읽게 된다. */
  try {
    if (!REMOTE || !REMOTE.props) {
      L.push('  --   목록을 못 읽어 건너뜁니다 (통과가 아닙니다)');
    } else {
      var _pp = PropertiesService.getScriptProperties();
      var _has = function (k) { var v = _pp.getProperty(k); return v !== null && String(v).trim() !== ''; };
      var _on = {}, _emptyOpt = [], _emptyTune = [];
      for (var pi = 0; pi < REMOTE.props.length; pi++) {
        var _p = REMOTE.props[pi];
        if (_p.kind === 'switch') {
          var _v = String(_pp.getProperty(_p.key) || '').trim();
          _on[_p.key] = _v;
          L.push('  --   ' + _p.key + ' = ' + (_v === '' ? '(비어 있음)' : _v) + '   ' + _p.a);
        } else if (_p.kind === 'tuning' && !_has(_p.key)) _emptyTune.push(_p.key);
        else if (_p.kind === 'option' && !_has(_p.key)) _emptyOpt.push(_p.key);
      }
      for (var pj = 0; pj < REMOTE.props.length; pj++) {
        var _q = REMOTE.props[pj];
        if (_q.kind !== 'needs') continue;
        var _sw = String(_on[_q.a] || '').trim();
        var _live = (_q.a === 'NOTIFY_ENABLED' || _q.a === 'PAY_CARD_ENABLED') ? (_sw === 'true') : (_sw !== '');
        if (!_live) { L.push('  --   ' + _q.key + '  (' + _q.a + ' 가 꺼져 있어 지금은 필요 없음)'); continue; }
        chk(_q.key + '  — ' + _q.b, _has(_q.key),
          '비어 있습니다 → ' + _q.a + ' 를 켜 두었으므로 이 값이 없으면 그 기능이 «오류 없이» 안 돕니다');
      }
      if (_emptyTune.length) L.push('  --   기본값으로 도는 것 ' + _emptyTune.length + '개: ' + _emptyTune.join(', ') + ' (비어 있어도 정상)');
      if (_emptyOpt.length) L.push('  --   비어 있는 곁가지 ' + _emptyOpt.length + '개: ' + _emptyOpt.join(', ') + ' (그 곁가지만 조용해집니다)');
    }
  } catch (e) { L.push('  --   설정값 확인 불가: ' + ((e && e.message) || e) + ' (통과가 아닙니다)'); }

  L.push('');
  L.push(badN === 0
    ? '결과 — 누락 0건. 파일이 전부(안쪽까지) 있고, 최근 변경도 올라갔고, 배포·시트·예약 실행까지 준비됐습니다. (확인 ' + okN + '항목)'
    : '결과 — ★누락 ' + badN + '건. 각 MISS 줄의 «→» 가 할 일을 말합니다 (①~③ 은 그 파일을 다시 붙여넣고 «새 버전» 배포 · ④ 는 배포만 · ⑤⑥ 은 함수 실행 · ⑦ 은 스크립트 속성에 값 넣기). (확인 ' + okN + '항목)');
  L.push('※ ①~③ 은 «저장된 코드» 기준 · ④ 는 배포본 지문과 대조해 «재배포했는지» · ⑤⑥⑦ 은 시트·트리거·설정이라 배포와 무관하게 사람이 한 번 넣어 두는 것.');
  L.push('※ 이 점검 밖 — 초록이어도 이 둘은 안 본 것이다:');
  L.push('   · 별도 GAS 프로젝트(form-to-couple 부부폼 · guest-letter-webhook · 가족청첩장빌드) — 각각 따로 배포한다.');
  L.push('   · consultation-booking 의 const 5개(CONFIG·SYS·HEADERS·ST·LOCKED_STATES) — 그 파일은 함수 130개로 덮인다.');
  var out = L.join('\n');
  Logger.log(out);
  return out;
}
