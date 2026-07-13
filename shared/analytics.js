/* Moment Edit — 애널리틱스 로더 (GA4)
 * 사용법: 아래 GA_ID에 본인 GA4 '측정 ID'(G-XXXXXXX)만 넣으면 끝 — 연결된 전 페이지에서 자동 방문 추적.
 *   비워두면 아무 것도 안 함(안전·무부하). 개인정보: 페이지뷰·기본 이벤트만(IP 익명화).
 * 핵심 이벤트는 페이지에서 ME_track('상담신청') 처럼 호출하면 기록됨(선택).
 */
(function () {
  var GA_ID = 'G-PJ596EFSDS';   // GA4 측정 ID (momentedit.kr)
  if (!GA_ID) { window.ME_track = function () {}; return; }
  var s = document.createElement('script');
  s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag('js', new Date());
  // 개인정보: 자동로그인·비번재설정 토큰 등 민감 쿼리는 GA로 보내지 않는다.
  //   GA4 기본 page_view는 쿼리 포함 전체 URL(page_location)을 전송하므로, 민감 파라미터를 뺀 URL로 대체.
  var _loc = location.href;
  try {
    var _u = new URL(location.href);
    ['token', 'code', 'sig', 'exp', 't', 'secret'].forEach(function (k) { _u.searchParams.delete(k); });
    _loc = _u.href;
  } catch (e) {}
  gtag('config', GA_ID, { anonymize_ip: true, page_location: _loc });
  window.ME_track = function (name, params) { try { gtag('event', name, params || {}); } catch (e) {} };
})();
