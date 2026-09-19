/* ★[DEPLOY_CONTRACT 2026-09-19] 값 계약 점검 — deployCheck 가 «못 보는» 자리를 본다.
 *
 * ── 왜 따로 만들었나
 * deployCheck 는 «표식이 그 함수 안에 있는가»만 본다. 값은 안 본다.
 * 실제로 이런 일이 있었다 — 하객 추가금을 50000 → 0 으로 바꾸고 표식(GUEST30_NOFEE)을 달았는데,
 * 그 파일을 GAS 에 안 붙여도 deployCheck 는 «누락 0건»이라고 답했다. 이유는 둘이다.
 *   ① 표식 목록을 사이트(main 배포본)에서 가져오는데, 새 표식은 아직 main 에 없어 «검사 대상»이 아니었다.
 *   ② 설령 목록에 있었어도 표식의 «존재»만 보므로, 값이 50000 이어도 초록이었다.
 * 그 사이 28명이 오는 계약자에게는 15만 원이 계속 청구된다. 조용한 실패다.
 *
 * ── 무엇을 보는가
 *   kind=gas  : GAS 안에서 식을 평가해 기대값과 대조한다(붙여넣기 누락을 «값»으로 잡는다).
 *   kind=web  : 배포된 사이트를 가져와 문자열이 있는지/없는지 본다(Vercel 배포 누락을 잡는다).
 * 즉 GAS 와 사이트 «양쪽»을 같은 자리에서 본다. 한쪽만 올라간 상태가 가장 위험한데, 그것을 잡는다.
 *
 * ── 계약은 어디에 있나
 *   deploy-marks.json 의 contracts 배열. 저장소 쪽은 scripts/audit/deploy-contracts.mjs 가
 *   같은 계약을 검사하므로, 계약과 코드가 갈라지면 merge-guard 가 푸시를 막는다.
 *
 * 사용: 이 파일을 열고 contractCheck 실행
 *
 * ★.gs 주석에서 다른 규칙 이름을 대괄호로 인용하지 말 것 — 이 파일에서 세 번 걸렸다.
 *   deploycheck-coverage·deploycheck-sim 은 .gs 안의 [대문자] 를 «이 파일의 표식»으로 읽는다.
 *   설명하려고 적은 GUEST30_NOFEE·FILE_COVER 가(대괄호를 쳤더니) «목록에 없는 표식»으로 붉어졌다.
 *   ★이 경고문을 쓰면서도 예시에 대괄호를 쳐서 한 번 더 걸렸다 — 네 번째였다.
 *   규칙 이름을 언급할 때는 대괄호 없이 쓴다(예: CLAUDE.md 의 FILE_COVER 규칙).
 */
/* ★목록이 없어도 «GAS 값»만은 본다.
   실제로 겪었다 — main 병합 전이라 사이트 목록에 계약이 없었고, 그래서 contractCheck 가
   「계약이 없습니다」 두 줄만 찍고 끝났다. 정작 알고 싶었던 것(이 파일이 붙었나)은 못 봤다.
   목록이 원본인 것은 맞지만, 원본이 아직 안 왔다고 «아무것도 안 보는» 것은 과하다.
   ★이 표가 deploy-marks.json 의 contracts(kind=gas)와 갈라지면 merge-guard 가 막는다
     (scripts/audit/deploy-contracts.mjs). 한쪽만 고치지 말 것. */
var CONTRACT_FALLBACK = [
  { expr: 'FINAL_CONFIRM.초과단가', eq: 0, file: '80_production' },
  { expr: 'FINAL_CONFIRM.최대', eq: 30, file: '80_production' },
  { expr: 'FINAL_CONFIRM.착석', eq: 30, file: '80_production' }   // SEATED30 — 서른 분 전원 착석(2026-09-13 검토38)
];

function contractCheck() {
  var L = [], okN = 0, badN = 0, skipN = 0;
  var SITE = 'https://momentedit.kr';
  var MARKS_URL = SITE + '/deploy-marks.json';

  function ok(m) { okN++; L.push('  OK   ' + m); }
  function bad(m, hint) { badN++; L.push('  ★MISS ' + m + (hint ? ('\n         → ' + hint) : '')); }
  function skip(m) { skipN++; L.push('  --   ' + m); }

  /* 사이트 HTML 에서 주석을 걷어낸다 — 주석에 적어 둔 «되살리지 말 것» 문장이 본문으로 읽히면
     멀쩡한 코드가 빨갛게 된다. 실제로 겪은 거짓 양성이라 여기서 먼저 막는다. */
  function stripComments(t) {
    return String(t).replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  }
  /* 목록이 없을 때 쓰는 최소 검사 — GAS 값만 본다. «통과»라고 말하지 않는다. */
  function runFallback() {
    /* [CONTRACT_FALLBACK] 목록이 아직 안 왔을 때 GAS 값만이라도 보는 자리.
       deploy-marks.json 의 gas 계약과 갈라지면 deploy-contracts.mjs 가 막는다. */
    L.push('── 파일 안 사본으로 본 GAS 값 (사이트 문장은 못 봤습니다) ──');
    for (var i = 0; i < CONTRACT_FALLBACK.length; i++) {
      var c = CONTRACT_FALLBACK[i], got;
      try { got = eval(c.expr); } catch (e) { bad(c.expr + ' 를 읽지 못했습니다', c.file + ' 파일이 안 붙었을 수 있습니다'); continue; }
      if (got === c.eq) ok(c.expr + ' = ' + JSON.stringify(got));
      else bad(c.expr + ' 가 ' + JSON.stringify(got) + ' 입니다 (기대 ' + JSON.stringify(c.eq) + ')',
        c.file + ' 를 다시 붙여넣고 «새 버전»으로 재배포하세요.');
    }
    L.push('');
    L.push(badN === 0
      ? '결과 — GAS 값 ' + okN + '건은 맞습니다.'
      : '결과 — ★어긋남 ' + badN + '건. 각 MISS 의 «→» 가 할 일을 말합니다.');
    /* ★붉든 초록이든 «못 본 것»은 항상 말한다 — 붉을 때만 침묵하면
       「어긋남 1건」을 고친 사람이 «이제 다 봤다»고 오해한다(시뮬 b3 가 잡았다). */
    L.push('※ ★사이트 문장은 이번에 못 봤습니다 — 목록이 없어 파일 안 사본으로 GAS 값만 봤습니다.');
  }

  var _webCache = {};
  function fetchWeb(path) {
    if (_webCache[path] !== undefined) return _webCache[path];
    try {
      var r = UrlFetchApp.fetch(SITE + path, { muteHttpExceptions: true, followRedirects: true });
      _webCache[path] = (r.getResponseCode() === 200) ? stripComments(r.getContentText()) : null;
    } catch (e) { _webCache[path] = null; }
    return _webCache[path];
  }

  L.push('══ 값 계약 점검 — 「표식은 있는데 값이 틀린」 것을 잡는다 ══');

  var MARKS = null, why = '';
  try {
    var mr = UrlFetchApp.fetch(MARKS_URL, { muteHttpExceptions: true, followRedirects: true });
    if (mr.getResponseCode() === 200) MARKS = JSON.parse(mr.getContentText());
    else why = 'HTTP ' + mr.getResponseCode();
  } catch (e) { why = String((e && e.message) || e).slice(0, 60); }

  if (!MARKS) {
    L.push('  ★목록을 못 읽었습니다 (' + why + ') — 사이트 문장은 이번에 못 쟀습니다.');
    L.push('');
    runFallback();
    Logger.log(L.join('\n')); return L.join('\n');
  }

  /* ── 목록 신선도 — 낡은 목록으로 낸 «초록»은 그만큼만 믿을 수 있다 ── */
  var made = String(MARKS['_생성'] || '').slice(0, 10);
  if (made) {
    var ageDays = Math.floor((new Date() - new Date(made.replace(/-/g, '/'))) / 86400000);
    if (isNaN(ageDays)) skip('목록 만든 때 ' + made + ' (경과일 계산 불가)');
    else if (ageDays >= 7) {
      bad('목록이 ' + ageDays + '일 전 판입니다 (만든 때 ' + made + ')',
        '이 초록은 «그 날짜까지»만 뜻합니다. 그 뒤 고친 것은 목록에 없어 검사조차 되지 않습니다.\n'
        + '           → main 에 병합하면 Vercel 이 deploy-marks.json 을 새로 올리고, 다음 실행부터 검사됩니다.');
    } else ok('목록이 최신입니다 (' + ageDays + '일 전 · ' + made + ')');
  } else skip('목록에 만든 때가 없습니다');

  var CT = MARKS.contracts;
  if (!CT || !CT.length) {
    bad('목록에 값 계약(contracts)이 없습니다',
      '사이트의 deploy-marks.json 이 계약을 갖기 전 판입니다 — main 병합 후 다시 실행하세요.\n'
      + '           → 그동안은 아래 «파일 안 사본»으로 GAS 값만 봅니다(사이트 문장은 못 봅니다).');
    L.push('');
    runFallback();
    Logger.log(L.join('\n')); return L.join('\n');
  }

  L.push('');
  L.push('── GAS 안의 값 ──');
  CT.filter(function (c) { return c.kind === 'gas'; }).forEach(function (c) {
    var got;
    /* 계약 항목 자체가 망가진 경우 — 「 가 undefined 입니다」 같은 뜻 모를 줄을 내지 않는다(퍼즈로 잡음) */
    if (!c.expr || !String(c.expr).trim()) { bad('계약 항목에 expr 이 없습니다', 'deploy-marks.json 의 contracts 를 고치세요: ' + JSON.stringify(c).slice(0, 90)); return; }
    if (!('eq' in c)) { bad('계약 항목에 eq 가 없습니다 (' + c.expr + ')', 'deploy-marks.json 의 contracts 를 고치세요'); return; }
    try { got = eval(c.expr); } catch (e) { bad(c.expr + ' 를 읽지 못했습니다 (' + ((e && e.message) || e) + ')', c.file ? (c.file + ' 파일이 안 붙었을 수 있습니다') : ''); return; }
    if (got === c.eq) ok(c.expr + ' = ' + JSON.stringify(got));
    else bad(c.expr + ' 가 ' + JSON.stringify(got) + ' 입니다 (기대 ' + JSON.stringify(c.eq) + ')',
      (c.why || '') + (c.file ? ('\n           → ' + c.file + ' 를 다시 붙여넣고 «새 버전»으로 재배포하세요.') : ''));
  });

  L.push('');
  L.push('── 배포된 사이트의 문장 ──');
  CT.filter(function (c) { return c.kind === 'web'; }).forEach(function (c) {
    var body = fetchWeb(c.path);
    if (body === null) { skip(c.path + ' 를 못 읽었습니다 (통과가 아닙니다)'); return; }
    if (c.present !== undefined) {
      if (body.indexOf(c.present) >= 0) ok(c.path + ' 에 「' + c.present + '」 있음');
      else bad(c.path + ' 에 「' + c.present + '」 가 없습니다', c.why || '');
    }
    if (c.absent !== undefined) {
      if (body.indexOf(c.absent) < 0) ok(c.path + ' 에 「' + c.absent + '」 없음');
      else bad(c.path + ' 에 「' + c.absent + '」 가 아직 남아 있습니다', c.why || '');
    }
  });

  /* [DEPLOY_CONTRACT] 값 계약 점검 본체 — 표식을 함수 «뒤쪽»에 둔다.
     맨 앞에 두면 붙여넣다 뒤가 잘려도 표식이 살아남아 deployCheck 가 «누락 0건»이라 답한다
     (deploycheck-sim 1-B 가 그 구멍을 잡아냈다). 앞으로 옮기지 말 것. */
  L.push('');
  L.push(badN === 0
    ? '결과 — 값 계약 ' + okN + '건 전부 맞습니다.' + (skipN ? ('  (못 잰 것 ' + skipN + '건)') : '')
    : '결과 — ★어긋남 ' + badN + '건. 각 MISS 의 «→» 가 할 일을 말합니다.');
  L.push('※ 이 점검은 «값»을 봅니다 — deployCheck 의 표식 점검과 짝입니다. 둘 다 돌리세요.');
  var out = L.join('\n');
  Logger.log(out);
  return out;
}

/* ★파일의 «끝»을 지키는 함수 — 내용보다 자리가 중요하다.
   contractCheck 하나뿐이면 붙여넣다 뒤가 잘려도 그 함수 이름은 앞에 남아 있어
   deployCheck 의 ① 도 ①-B 도 «있다»고 답한다(deploycheck-sim 1-B 가 실제로 그 구멍을 잡았다).
   파일 끝에 함수가 하나 더 있으면, 잘린 순간 이 이름이 사라져 함수 전수 대조에 걸린다.
   ★지우지 말 것 — 지우면 이 파일만 «잘려도 모르는» 상태로 되돌아간다. */
function contractCheckHelp() {
  /* [CONTRACT_TAIL] 표식은 함수 «본문 안»에 — mark() 가 함수 소스를 읽는다(CLAUDE.md 의 FILE_COVER 규칙). */
  var s = [
    '값 계약 점검 — 사용법',
    '  1) 이 파일을 열고 contractCheck 를 실행합니다.',
    '  2) deployCheck(99_deployCheck)와 «짝»입니다 — 그쪽은 표식이 있는가, 이쪽은 값이 맞는가.',
    '  3) 계약 목록은 사이트의 deploy-marks.json 안 contracts 에 있습니다.',
    '     저장소 쪽은 scripts/audit/deploy-contracts.mjs 가 같은 계약을 검사해',
    '     «계약과 코드가 갈라지는 것»을 merge-guard 가 푸시 전에 막습니다.',
    '  ★목록이 낡으면 그만큼만 믿을 수 있습니다 — contractCheck 가 목록 나이를 먼저 찍습니다.'
  ].join('\n');
  Logger.log(s);
  return s;
}
