/* ★[DEPLOY_CHECK 2026-08-26 · 갱신 2026-08-29] 「전부 올렸는지」를 GAS 안에서 스스로 확인한다.
 *
 * 쓰는 법 — 이 파일 내용을 통째로 붙여넣고,
 *   상단 드롭다운에서 deployCheck 를 골라 실행 → 실행 로그를 본다.
 *   ★재배포 없이 실행된다(편집기는 저장된 코드로 돈다). 아무것도 쓰지 않는다(읽기 전용).
 *
 * 무엇을 보나
 *   ①파일이 다 있는가 — 파일마다 «그 파일에만 있는 함수» 하나로 존재를 확인
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

  if (REMOTE) L.push('목록: 사이트에서 가져옴 (' + MARKS_URL + ')');
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
  L.push('  --   파일 Admin.html    (화면 틀이라 코드로 확인 불가 · 관리자 페이지가 열리면 그게 확인이다)');

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
  /* ★★[DEPLOY_LIVE 2026-08-30] 위 ①~③ 은 «저장된 코드»만 본다 — 편집기가 그것으로 돌기 때문이다.
     그래서 「전부 올렸는데 화면은 그대로」가 계속 나온다. 재배포를 안 한 것이 원인인데
     사람이 그걸 기억해야만 했다. 여기서 «배포본»을 직접 찔러 기억할 필요를 없앤다.
     ★틀린 토큰을 보내므로 아무것도 올라가지 않는다. 읽기 전용이라는 성질은 그대로다.
     ★응답이 갈린다 — 배포됐으면 handleGuestPhoto 가 「잘못된 주소」로 막고,
       배포가 낡았으면 라우터가 「알 수 없는 요청」을 낸다. */
  /* ★★[DEPLOY_LIVE_URL 2026-08-30 실기 실측] getUrl() 은 «편집기에서 수동 실행»하면 /dev 를 준다.
     /dev 는 소유자 로그인이 필요한 개발 주소라, 서버끼리 찌르면 앱이 아니라 «구글 로그인 화면»이
     돌아온다(실측 응답: <!DOCTYPE html>…window['ppConf']…). 그걸 「응답을 못 읽었습니다」로 세니
     배포가 멀쩡한데도 늘 붉었다. 고객이 쓰는 주소는 /exec 이므로 그쪽으로 바꿔 찌른다.
     ★그래도 앱 응답이 아니면 «실패»가 아니라 «확인 불가»로 남긴다 — 못 잰 것을 실패로 세면
       「누락 0건」이 영영 안 나오고, 그러면 사람이 MISS 를 무시하기 시작한다. 게이트가 죽는 길이다. */
  /* ★★[DEPLOY_LIVE_WHY 2026-08-30] 두 번을 돌려도 「확인 불가」만 나왔다. 그 줄은 «무엇을 해야
     하는지»를 안 알려 준다 — 확인 불가가 반복되면 사람은 그 줄을 읽지 않게 된다.
     그래서 «무엇을 찔렀고 무엇이 왔는지»를 함께 남긴다: 끝 주소(/exec 인가 /dev 인가) · HTTP 코드 ·
     리다이렉트 여부. 이 셋이면 다음 한 번의 실행으로 원인이 갈린다.
       · /dev 를 찔렀다        → getUrl 이 준 주소가 개발용(치환이 안 먹은 것)
       · /exec + 200 + 로그인  → 웹앱 접근이 «모든 사용자»가 아니다
       · /exec + 302/401       → 같은 프로젝트가 자기 /exec 를 부르는 것을 구글이 막는다(구조적)
     ★주소 전체는 안 찍는다 — 로그에 남는 배포 주소는 그 자체가 열쇠다. 끝 8자만 남긴다. */
  try {
    var _u = ScriptApp.getService().getUrl();
    if (!_u) chk('배포 URL 읽기', false, '웹앱으로 배포돼 있는지 확인하세요');
    else {
      var _live = _u.replace(/\/dev(\?|$)/, '/exec$1');
      var _tail = (_live.match(/\/(exec|dev)(\?|$)/) || [])[1] || '알수없음';
      var _r = UrlFetchApp.fetch(_live, { method: 'post', contentType: 'text/plain;charset=utf-8',
        payload: JSON.stringify({ action: 'guestPhoto', g: 'x' }), muteHttpExceptions: true, followRedirects: true });
      var _t = String(_r.getContentText() || '');
      var _code = 0; try { _code = _r.getResponseCode(); } catch (e2) {}
      var _why = '주소 …/' + _tail + ' · HTTP ' + _code;
      if (_t.indexOf('잘못된 주소') >= 0)          chk('배포본이 최신이다 (하객사진 경로 있음)', true);
      else if (_t.indexOf('알 수 없는 요청') >= 0) chk('배포본이 최신이다', false, '저장만 했습니다 — 배포 관리에서 «새 버전»으로 재배포하세요');
      else if (/ppConf|accounts\.google\.com/i.test(_t)) {
        L.push('  --   배포본 판정  (구글 로그인 화면 · 확인 불가 · 실패 아님) — ' + _why);
        L.push('       ' + (_tail === 'dev'
          ? '개발 주소를 찔렀습니다 — getUrl() 이 /dev 를 줬고 치환이 안 먹었습니다(점검 파일 문제).'
          : 'HTTP ' + _code + ' 입니다. 200 이면 웹앱 접근을 «모든 사용자»로, 그 외면 GAS 가 자기 /exec 를 부르는 것을 막는 것이라 이 방법으론 못 잽니다.'));
      }
      else L.push('  --   배포본 판정  (모르는 응답 · 확인 불가 · 실패 아님) — ' + _why + ' · ' + _t.replace(/\s+/g, ' ').slice(0, 60));
    }
  } catch (e) { L.push('  --   배포 확인  (권한/네트워크로 확인 불가 · 실패 아님): ' + (e && e.message)); }

  L.push('');
  L.push('══ ⑤ 시트가 준비됐는가 (함수만 있고 컬럼이 없으면 저장이 조용히 사라진다) ══');
  /* ★addGuestPhotoColumns 는 «배포 전에» 한 번 돌려야 한다. 안 돌리면 writeCell 이 헤더 없는 칸을
     조용히 건너뛰어 저장이 통째로 사라진다(화면엔 「저장됐어요」). 그 상태를 여기서 잡는다. */
  try {
    var _sh = getCustomersSheet();
    var _hd = _sh.getRange(1, 1, 1, _sh.getLastColumn()).getValues()[0].map(function (v) { return String(v).trim(); });
    var _need = ['하객사진수', '하객사진MB', '하객사진최근', '하객사진폴더ID'];
    var _lack = _need.filter(function (h) { return _hd.indexOf(h) < 0; });
    chk('하객사진 컬럼 4개', _lack.length === 0, '없는 것: ' + _lack.join(', ') + ' → 80_production 을 열고 addGuestPhotoColumns 실행');
  } catch (e) { chk('시트 확인', false, String(e && e.message)); }

  L.push('');
  L.push(badN === 0
    ? '결과 — 누락 0건. 파일이 전부 있고, 최근 변경도 전부 올라갔고, 배포·시트도 준비됐습니다. (확인 ' + okN + '항목)'
    : '결과 — ★누락 ' + badN + '건. 위 MISS 줄의 파일을 다시 붙여넣고 «새 버전»으로 배포하세요. (확인 ' + okN + '항목)');
  L.push('※ ①~③ 은 «저장된 코드» 기준이고, ④ 가 «배포본»을 직접 찔러 확인한다.');
  var out = L.join('\n');
  Logger.log(out);
  return out;
}
