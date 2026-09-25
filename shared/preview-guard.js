/* ★★[PREVIEW_GUARD 2026-09-25 사장님 결정 «가지 미리보기를 켜되 안전장치를 먼저»]
 *
 * 운영 주소(momentedit.kr · www.momentedit.kr)가 아닌 곳에서는 페이지가 GAS(script.google.com)를
 * 부르지 못하게 한다. 미리보기 · 로컬(127.0.0.1) · 다른 도메인 전부 해당한다.
 *
 * ── 왜
 *   페이지에 GAS 주소가 고정으로 박혀 있고, 환경에 따라 바뀌는 곳이 하나도 없다.
 *   테스트용 백엔드·테스트용 시트도 없다. 그래서 미리보기에서 신청·저장을 누르면
 *   **실제 예약 시트에 들어간다.** 실제로 테스트 고객으로 단계를 밟다 알림 5건이
 *   실발송 큐에 쌓인 일이 있다([HOLD_DROP_ON_ROLLBACK] · 2026-09-24).
 *
 * ── 무엇을 막나 (부르는 길 다섯 · 하나라도 빠지면 그 길로 샌다)
 *   ① fetch  ② XMLHttpRequest  ③ <script src>(JSONP · mypage·hydrate 가 쓴다)
 *   ④ navigator.sendBeacon  ⑤ 링크·폼·window.open 으로 GAS 화면에 가는 것
 *   막힌 요청은 «연결 실패»처럼 보인다 — 각 화면이 이미 가진 실패 화면이 그대로 뜬다.
 *
 * ── 운영 주소에서는 아무것도 안 한다
 *   첫 줄에서 hostname 을 보고 곧바로 돌아간다. 전역 하나(ME_PREVIEW_GUARD)만 남긴다.
 *   ★운영에서 동작이 바뀌면 이 장치의 존재 이유가 뒤집힌다 — 검사가 그걸 지킨다
 *     (scripts/audit/preview-guard.mjs).
 *
 * ── 부르는 곳
 *   페이지(mypage·admin·guide·inquiry·seat·schedule·cancel·live)는 <head> 맨 앞에서 부른다.
 *   청첩장 템플릿(i/ · i-family/)은 손대지 않는다 — 템플릿이 모두 동기로 먼저 부르는
 *   shared/venue.js 가 운영 주소가 아닐 때만 이 파일을 끼워 넣는다.
 */
(function (w, d) {
  'use strict';
  /* ★운영 주소는 여기 한 곳이다. shared/venue.js 의 판정식이 이 목록과 같아야 한다(검사가 대조). */
  var PROD_HOSTS = ['momentedit.kr', 'www.momentedit.kr'];
  function isProdHost(h) {
    h = String(h || '').toLowerCase().replace(/\.$/, '');
    for (var i = 0; i < PROD_HOSTS.length; i++) if (h === PROD_HOSTS[i]) return true;
    return false;
  }
  /* ★[PREVIEW_GUARD_TEST_OFF] 로컬 점검 스크립트는 GAS 응답을 «흉내» 내 화면을 띄운다(요청을 네트워크 층에서
     가짜 JSON 으로 돌려준다). 이 장치가 그 요청을 먼저 막으면 점검 29개가 화면에 닿지도 못한다(실측: guide-path-route).
     그래서 점검 브라우저만 페이지가 뜨기 «전에» 이 표시를 심는다(scripts/audit/_browser.mjs 등).
     ★주소창·링크로는 켤 수 없다 — 페이지 안에서 스크립트를 먼저 실행해야 한다. 그럴 수 있는 사람은
       어차피 GAS 를 직접 부를 수 있으니 이 표시가 새 구멍을 만들지 않는다. */
  var TEST_OFF = w.__ME_PREVIEW_GUARD_TEST_OFF === true;
  var ON = !isProdHost(w.location && w.location.hostname) && !TEST_OFF;
  w.ME_PREVIEW_GUARD = { isProdHost: isProdHost, PROD_HOSTS: PROD_HOSTS.slice(), on: ON, testOff: TEST_OFF, blocked: 0 };
  if (!ON) return;
  if (w.__mePreviewGuardInstalled) return;
  w.__mePreviewGuardInstalled = true;

  var BLOCK = /^(https?:)?\/\/script\.google(usercontent)?\.com\//i;
  function isBlocked(u) {
    try { return BLOCK.test(new URL(String(u), w.location.href).href); } catch (e) { return BLOCK.test(String(u || '')); }
  }
  function hit(kind) {
    w.ME_PREVIEW_GUARD.blocked++;
    try { console.warn('[PREVIEW_GUARD] 서버 연결을 막았어요 (' + kind + ')'); } catch (e) {}
    showBar();
  }

  /* ① fetch */
  if (w.fetch) {
    var _fetch = w.fetch;
    w.fetch = function (input, init) {
      var u = (typeof input === 'string' || input instanceof URL) ? String(input) : (input && input.url) || '';
      if (isBlocked(u)) { hit('fetch'); return Promise.reject(new TypeError('[PREVIEW_GUARD] blocked')); }
      return _fetch.apply(this, arguments);
    };
  }

  /* ② XMLHttpRequest — open 에서 표시하고 send 에서 실패로 끝낸다 */
  if (w.XMLHttpRequest) {
    var XP = w.XMLHttpRequest.prototype, _open = XP.open, _send = XP.send;
    XP.open = function (m, u) { this.__meBlocked = isBlocked(u); return _open.apply(this, arguments); };
    XP.send = function () {
      if (!this.__meBlocked) return _send.apply(this, arguments);
      hit('xhr');
      var x = this;
      /* [PREVIEW_GUARD_XHR_DONE 2026-09-25 코워크 검토] readyState 가 1 에 머물면 readystatechange 만 보는 코드가
         «아직 기다리는 중»으로 남는다. 진짜 연결 실패처럼 4 · status 0 으로 끝낸다(인스턴스에만 덮는다). */
      setTimeout(function () {
        try { Object.defineProperty(x, 'readyState', { configurable: true, value: 4 }); Object.defineProperty(x, 'status', { configurable: true, value: 0 }); } catch (e) {}
        try { x.dispatchEvent(new Event('readystatechange')); x.dispatchEvent(new Event('error')); x.dispatchEvent(new Event('loadend')); } catch (e) {}
      }, 0);
    };
  }

  /* ③ <script src> (JSONP) — src 속성과 setAttribute 둘 다 */
  function failScript(el) { setTimeout(function () { try { el.dispatchEvent(new Event('error')); } catch (e) {} }, 0); }
  try {
    var SP = w.HTMLScriptElement.prototype, desc = Object.getOwnPropertyDescriptor(SP, 'src');
    if (desc && desc.set) {
      Object.defineProperty(SP, 'src', {
        configurable: true, enumerable: desc.enumerable, get: desc.get,
        set: function (v) { if (isBlocked(v)) { hit('script'); failScript(this); return; } desc.set.call(this, v); }
      });
    }
    var _setAttr = w.Element.prototype.setAttribute;
    w.Element.prototype.setAttribute = function (n, v) {
      if (this.tagName === 'SCRIPT' && String(n).toLowerCase() === 'src' && isBlocked(v)) { hit('script'); failScript(this); return; }
      return _setAttr.apply(this, arguments);
    };
  } catch (e) {}

  /* ④ sendBeacon */
  if (w.navigator && w.navigator.sendBeacon) {
    var _beacon = w.navigator.sendBeacon.bind(w.navigator);
    w.navigator.sendBeacon = function (u) { if (isBlocked(u)) { hit('beacon'); return false; } return _beacon.apply(null, arguments); };
  }

  /* ⑤ 링크 · 폼 · window.open 으로 GAS 화면에 가는 것 */
  if (w.open) {
    var _wopen = w.open;
    w.open = function (u) { if (u && isBlocked(u)) { hit('open'); return null; } return _wopen.apply(this, arguments); };
  }
  d.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (a && isBlocked(a.href)) { e.preventDefault(); e.stopPropagation(); hit('link'); }
  }, true);
  /* [PREVIEW_GUARD_FORMSUBMIT 2026-09-25 코워크 검토] form.submit() 은 submit 이벤트를 안 쏜다 — 아래 듣개로는 못 막는다.
     requestSubmit() 은 이벤트를 쏘지만 함께 감싼다. 지금 페이지에는 둘 다 0건이다(검사가 새로 생기는 것을 본다). */
  try {
    var FP = w.HTMLFormElement.prototype, _fsubmit = FP.submit, _freq = FP.requestSubmit;
    FP.submit = function () { if (this.action && isBlocked(this.action)) { hit('form'); return; } return _fsubmit.apply(this, arguments); };
    if (_freq) FP.requestSubmit = function () { if (this.action && isBlocked(this.action)) { hit('form'); return; } return _freq.apply(this, arguments); };
  } catch (e) {}
  d.addEventListener('submit', function (e) {
    var f = e.target;
    if (f && f.action && isBlocked(f.action)) { e.preventDefault(); e.stopPropagation(); hit('form'); }
  }, true);

  /* 띠 — 막은 적이 없어도 처음부터 띄운다(«여기는 미리보기»를 먼저 알린다). 누르는 것을 가리지 않는다. */
  /* ★띠가 지워지면 다시 붙인다 — schedule.html 은 연결 실패 화면을 body.innerHTML 로 통째로 갈아끼운다.
     실측: 그 순간 띠도 함께 사라져 «막아 두었다»는 말이 정작 실패 화면 위에서 안 보였다. */
  var bar = null, watching = false;
  function showBar() {
    if (!d.body) return;
    if (bar) { if (!bar.isConnected) d.body.appendChild(bar); return; }
    if (!watching && w.MutationObserver) {
      watching = true;
      new w.MutationObserver(function () { if (bar && !bar.isConnected && d.body) d.body.appendChild(bar); })
        .observe(d.documentElement, { childList: true, subtree: true });
    }
    bar = d.createElement('div');
    bar.id = 'mePreviewBar';
    bar.setAttribute('role', 'status');
    bar.textContent = '미리보기 · 예약 데이터에 쓰지 않도록 서버 연결을 막아 두었어요';
    bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483646;pointer-events:none;'
      + 'background:#2A2622;color:#F2EFE9;font:500 12px/1.5 "Noto Sans KR","Apple SD Gothic Neo",-apple-system,sans-serif;'
      + 'letter-spacing:.01em;text-align:center;padding:5px 12px;word-break:keep-all;opacity:.94';
    d.body.appendChild(bar);
  }
  if (d.body) showBar(); else d.addEventListener('DOMContentLoaded', showBar);
})(window, document);
