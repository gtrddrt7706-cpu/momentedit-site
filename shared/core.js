/* Moment Edit — 공통 코어 유틸 (single source of truth)
 * 용도: mypage·admin·schedule에 흩어진 api()/escapeHtml()/qp()/복사/토큰 헬퍼 중복을 일원화.
 * 적용(추후·직접수정 단계): 각 페이지 <head>에  <script src="/shared/core.js"></script>  추가 후
 *   그 페이지의 동일 인라인 함수들을 ME.* 호출로 교체. (지금은 어디에도 연결 안 됨 = 라이브 영향 0)
 * 네임스페이스(window.ME)로 격리 — 기존 전역 함수와 충돌하지 않음.
 */
(function (w) {
  'use strict';
  var ME = w.ME || {};

  ME.$ = function (id) { return document.getElementById(id); };

  ME.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  };

  ME.qp = function (name) {
    try { return new URLSearchParams(w.location.search).get(name) || ''; }
    catch (e) { return ''; }
  };

  // GAS 단순요청(text/plain → CORS preflight 회피). url=EXEC_URL, payload=객체. JSON 반환.
  ME.api = function (url, payload) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); });
  };

  // 토큰 헬퍼 — key는 페이지별로 다름(고객 'me_token' / 관리자 'me_admin_token')
  ME.token = {
    get: function (key) { try { return localStorage.getItem(key) || ''; } catch (e) { return ''; } },
    set: function (key, v) { try { localStorage.setItem(key, v); } catch (e) {} },
    clear: function (key) { try { localStorage.removeItem(key); } catch (e) {} }
  };

  // 복사(+레거시 폴백). btn 주면 '복사됨' 피드백.
  ME.copy = function (text, btn) {
    function done() {
      if (!btn) return;
      var t = btn.getAttribute('data-lbl') || btn.textContent;
      btn.setAttribute('data-lbl', t); btn.textContent = '복사됨';
      setTimeout(function () { btn.textContent = t; }, 1400);
    }
    function legacy() {
      try {
        var ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (e) {}
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { legacy(); done(); });
    } else { legacy(); done(); }
  };

  w.ME = ME;
})(window);
