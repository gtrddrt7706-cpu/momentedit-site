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
    'entry', 'entryVoice',                     // 입장 멘트 · 입장 목소리
    'guestVoice',                              // 하객 맞이 목소리
    'veil', 'ringwarm', 'ring',                // 베일 다운 · 링 워밍 · 반지 교환
    'declare', 'declareWho',                   // 성혼 선언 문안 · 누가
    'valley', 'song', 'toast', 'tribute',      // 사이 순서 · 축가 · 축배 · 부모님 헌정
    'letter',                                  // 편지 낭독 대상
    'bless', 'blessProxy',                     // 부모님 덕담 · 나레이션 대독
    'digital'                                  // 디지털 참석(배웅 장면이 갈린다)
  ];

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

  // 한글이 섞여도 안전한 base64 — 받는 쪽(console.html)은 atob → decodeURIComponent(escape(...)) 로 푼다.
  function enc(o) {
    return btoa(unescape(encodeURIComponent(JSON.stringify(o))));
  }

  /* 미리듣기 주소. S 가 없거나 코스가 없으면 '' — 부르는 쪽은 이 빈 값으로 '들려줄 게 없다'를 판단한다.
     (버튼을 띄울지 말지를 두 곳이 각자 판단하면 조건이 갈라진다) */
  function url(S) {
    if (!S || !S.course) return '';
    return '/console.html?mode=preview&embed=1&S=' + encodeURIComponent(enc(pick(S)));
  }

  // 초안(p.ritualDraft)에서 바로 — 마이페이지처럼 서버 초안만 쥔 곳이 쓴다. v3 초안만 미리듣기가 읽을 수 있다.
  function urlFromDraft(rd) {
    if (!rd || rd._v !== 3 || !rd.S) return '';
    return url(rd.S);
  }

  w.RitualPreviewLink = { KEYS: KEYS, pick: pick, url: url, urlFromDraft: urlFromDraft };
})(window);
