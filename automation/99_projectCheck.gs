/* ★[PROJECT_CHECK 2026-09-05 사용자 "완성도높게 테스트하면 전부 체크할수있게 개선해봐"]
 *
 * 「별도 GAS 프로젝트」 세 곳을 위한 점검. 본 프로젝트(R3n9Mr)의 deployCheck 는 여기 못 닿는다 —
 * typeof 는 «같은 프로젝트 안»에서만 통하기 때문이다. 그래서 각자 스스로 세게 한다.
 *
 * 쓰는 법 — 이 파일을 **세 프로젝트 각각에** 붙여넣고 projectCheck 를 실행한다.
 *   ★어느 프로젝트인지 스스로 알아본다(그 프로젝트에만 있는 기준 함수로). 고칠 것 없다.
 *   ★목록은 https://momentedit.kr/deploy-marks.json 에서 읽는다 — 한 번 붙여넣으면 그 뒤로 안 바꿔도 된다.
 *   ★읽기 전용이다. 아무것도 쓰지 않는다.
 *
 * 대상
 *   form-to-couple        부부폼 — 예식 영상 등록·D-3 점검(vimeoGuardDaily 트리거가 여기 있다)
 *   guest-letter-webhook  하객 편지 웹훅
 *   가족청첩장빌드          가족 청첩장 빌드
 */
function projectCheck() {
  var L = [], okN = 0, badN = 0;
  function chk(label, cond, hint) {
    if (cond) { okN++; L.push('  OK   ' + label); }
    else { badN++; L.push('  MISS ' + label + (hint ? ('   → ' + hint) : '')); }
  }
  function has(name) { try { return eval('typeof ' + name) === 'function'; } catch (e) { return false; } }
  function hasAny(name) { try { return eval('typeof ' + name) !== 'undefined'; } catch (e) { return false; } }

  var MARKS_URL = 'https://momentedit.kr/deploy-marks.json';
  var REMOTE = null, why = '';
  try {
    var r = UrlFetchApp.fetch(MARKS_URL, { muteHttpExceptions: true, followRedirects: true });
    if (r.getResponseCode() === 200) REMOTE = JSON.parse(r.getContentText());
    else why = 'HTTP ' + r.getResponseCode();
  } catch (e) { why = String((e && e.message) || e).slice(0, 60); }

  if (!REMOTE || !REMOTE.projects) {
    L.push('★★목록을 못 읽었습니다 (' + (why || '항목 없음') + ') — 이번 실행은 «확인하지 못했다»입니다(통과 아님).');
    Logger.log(L.join('\n')); return L.join('\n');
  }

  /* ★내가 어느 프로젝트인지 — «가장 많이 맞는 쪽»으로 가른다.
     ★기준 함수 하나로 가르면 안 된다 — 하필 그 함수가 빠진 판에서 「여기가 어디인지 못 알아봤다」로 빠져
       원인을 틀리게 말한다(반증에서 세 프로젝트 모두 그랬다). 그건 «어느 함수가 없다»여야 한다.
     ★점수로 가르면 한둘이 빠져도 자기를 알아보고, 빠진 것을 이름으로 짚는다. */
  var me = null, best = 0;
  for (var i = 0; i < REMOTE.projects.length; i++) {
    var pj = REMOTE.projects[i], score = 0;
    for (var q = 0; q < pj.fns.length; q++) if (has(pj.fns[q])) score++;
    var ratio = pj.fns.length ? (score / pj.fns.length) : 0;
    if (ratio > best && ratio >= 0.3) { best = ratio; me = pj; }
  }

  if (!me) {
    L.push('★★여기가 어느 프로젝트인지 못 알아봤습니다.');
    L.push('   어느 프로젝트의 함수도 30% 넘게 있지 않습니다.');
    L.push('   → 이 파일을 «별도 프로젝트»(부부폼·하객편지·가족청첩장)에 붙여넣으셨는지 확인해 주세요.');
    L.push('     본 프로젝트(R3n9Mr)에서는 projectCheck 가 아니라 deployCheck 를 실행합니다.');
    Logger.log(L.join('\n')); return L.join('\n');
  }

  L.push('여기는 ' + me.name + ' — ' + me.why);
  L.push('목록 만든 때 ' + (REMOTE['_생성'] || '(모름)'));
  L.push('');
  L.push('══ 함수·표가 다 붙었는가 (전수 대조) ══');
  var lack = [];
  for (var j = 0; j < me.fns.length; j++) if (!has(me.fns[j])) lack.push(me.fns[j]);
  var vlack = [];
  for (var k = 0; k < (me.vars || []).length; k++) if (!hasAny(me.vars[k])) vlack.push(me.vars[k]);
  chk('함수 ' + me.fns.length + '개' + (me.vars && me.vars.length ? (' · 표 ' + me.vars.length + '개') : ''),
    lack.length === 0 && vlack.length === 0,
    '없는 것: ' + lack.concat(vlack).slice(0, 8).join(', ') +
    ((lack.length + vlack.length) > 8 ? ' …' : '') + '  → 이 파일을 통째로 다시 붙여넣으세요');

  L.push('');
  L.push(badN === 0
    ? '결과 — 누락 0건. 이 프로젝트는 저장소와 같습니다. (확인 ' + okN + '항목)'
    : '결과 — ★누락 ' + badN + '건. 위 MISS 줄의 파일을 다시 붙여넣고, 웹앱이면 «새 버전»으로 배포하세요.');
  L.push('※ 이 점검은 «코드가 다 붙었는가»만 본다 — 트리거·설정값은 그 프로젝트에서 따로 확인한다.');
  var out = L.join('\n');
  Logger.log(out);
  return out;
}
