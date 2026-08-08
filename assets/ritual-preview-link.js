/* 예식 미리듣기 링크 조립 — 한 곳에서만 [PREVIEW_LINK_V1]
 *
 * 식순 초안 S 를 미리듣기 화면(/console.html?mode=preview&embed=1)이 읽을 수 있는 주소로 바꾼다.
 * 부르는 곳은 둘이다 — mypage.html 의 식순 행, order-preview.html 의 완성 화면.
 * 두 곳이 각자 주소를 조립하면 한쪽만 고치는 날이 오고, 그날 한쪽 미리듣기만 조용히 낡는다.
 *
 * ★왜 '담을 것'을 세는가 (화이트리스트 · 블랙리스트가 아니다)
 *   식순 초안 S 에는 고객이 직접 쓴 글이 함께 산다 — vowText(서약문) · letterText(편지) ·
 *   welcomeText(첫인사) · up(올린 음성 파일 이름). 미리듣기는 이 글을 한 글자도 읽지 않는다.
 *   (당일까지 비밀 · 실물 낭독의 감정을 미리 소진하지 않는다 · 민감 텍스트를 밖으로 내보내지 않는다)
 *   그런데 S 를 통째로 실으면 그 글이 주소창 · 브라우저 방문기록 · 접속로그에 남는다.
 *   담을 것을 세는 쪽이 안전하다 — 나중에 S 에 새 글칸이 늘어도, 여기 손대지 않는 한 밖으로 안 나간다.
 *   ★KEYS 를 '빼는 목록'으로 뒤집지 말 것. 뒤집는 순간 새로 생긴 글칸이 기본값으로 새어 나간다.
 *
 * ★KEYS = 미리듣기 엔진(assets/ritual-cue.js)이 실제로 읽는 S 키 전부.
 *   엔진이 새 키를 읽기 시작했는데 여기 없으면, 미리듣기는 그 자리를 조용히 기본값으로 흘린다 —
 *   화면은 멀쩡한데 고객이 고른 것과 다른 예식이 들린다. 화면이 안 깨지니 아무도 모른다.
 *   그래서 scripts/build-course-story.mjs 의 [PREVIEW_KEYS] 가 매 푸시마다 엔진을 훑어 이 목록과 대조한다.
 *   목록을 고칠 일이 생기면 엔진을 먼저 보고, 검사를 통과시키려고 여기만 고치지 말 것.
 */
(function (w) {
  'use strict';

  var KEYS = [
    'course',                                  // 코스(담백·감동·가족·미니멀·축하)
    'ord', 'extra',                            // 순서 조정 · 더한 순서(둘 다 키 목록일 뿐 · 글은 없다)
    /* ★[ALL_OPTIONAL 2026-08-07] 뺀 순서. 빠지면 미리듣기가 고객이 뺀 자리를 그대로 들려준다
       (화면은 멀쩡한데 들리는 예식이 다르다 — 이 파일이 15~19행에서 경고하는 바로 그 사고).
       ★값은 {키:1} 형태의 키 목록일 뿐 글이 아니다 — 서약문·편지는 여기에도 주소에도 싣지 않는다. */
    'off',                                     // 뺀 순서(키 목록)
    'entry', 'entryVoice',                     // 입장 멘트 · 입장 목소리
    'guestVoice',                              // 하객 맞이 목소리
    // [VEIL_RETIRED 2026-08-03] 베일 다운 폐지 — 전 예식 동시입장이라 실행 불가. 되살리지 말 것.
    'ringwarm', 'ring',                        // 링 워밍 · 반지 교환
    // ★[PEAK_ONE 2026-08-07] 기록형은 서약과 편지 중 하나만 한다 — 그 선택이 S.vow 로 표현된다.
    //   빠지면 미리듣기가 늘 서약을 켠 채로 들려준다(고객이 편지를 골랐는데도).
    //   ★값은 'ok'/'off' 뿐이고 글이 아니다 — 서약문은 여기에도 주소에도 절대 싣지 않는다.
    'vow',                                     // 정점 선택(서약 켬/끔)
    'declare', 'declareWho',                   // 성혼 선언 문안 · 누가
    'valley', 'song', 'toast', 'tribute',      // 사이 순서 · 축가 · 축배 · 부모님 헌정
    'letter',                                  // 편지 낭독 대상
    'bless', 'blessProxy',                     // 부모님 덕담 · 나레이션 대독
    'digital'                                  // 디지털 참석(배웅 장면이 갈린다) — ★INJECT · 식순 S 에는 없다
  ];

  /* ★INJECT = 엔진은 읽는데 식순 초안 S 에는 없는 키 [PREVIEW_DIGITAL]
     식순 빌더는 이 값을 묻지 않는다 — 청첩장 트랙에서 이미 정해진 것이라 다시 물으면 답이 둘이 된다.
     그래서 주소를 조립하는 이 순간에만 밖에서 받아 얹는다(url 의 두 번째 인자).
     ★S 에 써 넣지 말 것. order-preview 의 _embedSave() 가 S 를 통째로 부모에 보내 서버 초안에 굳는다 —
       청첩장 방식이 바뀌는 날 식순 초안에 박힌 옛 값만 남는다(확정 정보를 두 군데 적으면 한쪽만 고치는 날이 온다).
     이 목록이 있어야 [PREVIEW_KEYS] 검사가 "엔진은 읽는데 아무도 값을 안 만드는 키"를 잡을 수 있다.
     (2026-08-02 실제 사고: digital 이 KEYS 에만 있고 값을 넣는 곳이 없어, 디지털 참석 예식도 미리듣기는
      늘 오프라인 배웅으로 흘렀다. 검사는 '목록에 있나'만 봤고 '값이 오나'는 안 봤다.) */
  var INJECT = ['digital'];

  // 고를 것만 골라 담는다. undefined·null 은 넣지 않는다 — 미리듣기 쪽 기본값이 그대로 서게(병합 주입).
  function pick(S) {
    var o = {};
    if (!S) return o;
    for (var i = 0; i < KEYS.length; i++) {
      var k = KEYS[i];
      if (S[k] !== undefined && S[k] !== null) o[k] = S[k];
    }
    return o;
  }

  /* 청첩장 상태(getMyState 의 invitation)에서 '디지털 참석'을 읽는다 [PREVIEW_DIGITAL]
     ★규칙의 원문은 서버 한 곳뿐이다 — automation/platform/85_invitation.gs 의 _invCouplesFields():
         var live = (method==='online'||method==='both'||(method==='self'&&draft.selfQR)) ? 'Y' : 'N';
       그 조건을 여기에 옮겨 적지 않는다. 옮겨 적으면 규칙이 바뀌는 날 이 사본만 옛 규칙을 지킨다.
       여기서는 서버가 이미 계산해 넘긴 '결과'만 읽는다:
         ① inv.digital            — buildInvitationState 가 같은 함수로 계산해 준 값(발행 전 초안도 유효)
         ② inv.published.urls.live — 발행된 청첩장의 라이브 주소(''이면 디지털 참석 없음)
       ①이 없는 화면(GAS 재배포 전)에서는 ②로 내려앉는다 — 미발행이면 false, 즉 오늘까지의 동작 그대로다.
       조용히 틀리는 대신 조용히 예전대로 도는 쪽을 고른 것이다(고치는 방향이 둘일 때 덜 나쁜 쪽). */
  function digitalOf(inv) {
    if (!inv) return false;
    if (typeof inv.digital === 'boolean') return inv.digital;
    var u = inv.published && inv.published.urls;
    return !!(u && u.live);
  }

  // 한글이 섞여도 안전한 base64 — 받는 쪽(console.html)은 atob → decodeURIComponent(escape(...)) 로 푼다.
  function enc(o) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(o))));
  }

  /* 미리듣기 주소. S 가 없거나 코스가 없으면 '' — 부르는 쪽은 이 빈 값으로 '들려줄 게 없다'를 판단한다.
     (버튼을 띄울지 말지를 두 곳이 각자 판단하면 조건이 갈라진다)
     extra = INJECT 키만 받는다(여기서도 담을 것을 센다) · 없으면 미리듣기 쪽 기본값이 그대로 선다. */
  function url(S, extra) {
    if (!S || !S.course) return '';
    var o = pick(S);
    if (extra) {
      for (var i = 0; i < INJECT.length; i++) {
        var k = INJECT[i];
        if (extra[k] !== undefined && extra[k] !== null) o[k] = extra[k];
      }
    }
    return '/console.html?mode=preview&embed=1&S=' + encodeURIComponent(enc(o));
  }

  // 초안(p.ritualDraft)에서 바로 — 마이페이지처럼 서버 초안만 쥔 곳이 쓴다. v3 초안만 미리듣기가 읽을 수 있다.
  function urlFromDraft(rd, extra) {
    if (!rd || rd._v !== 3 || !rd.S) return '';
    return url(rd.S, extra);
  }

  w.RitualPreviewLink = { KEYS: KEYS, INJECT: INJECT, pick: pick, url: url, urlFromDraft: urlFromDraft, digitalOf: digitalOf };
})(window);
