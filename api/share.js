// Moment Edit · 공유용 OG 링크 (부부별 카드)
// ------------------------------------------------------------------
// /api/share?e=<eventId>&d=<designNum>&v=<digital|family>
//   · d/v 로 목적지(청첩장)를 정함 → 데이터 fetch 실패해도 이동은 정확
//   · Couples 데이터에서 이름·날짜만 읽어 카톡 미리보기 카드 문구를 부부별로 구성
//   · 사람: 즉시 실제 청첩장으로 이동 / 크롤러: 부부별 og 태그를 읽음
// 기존 정적 페이지는 전혀 건드리지 않는 "추가 라우트"입니다.

const WEBHOOK = 'https://script.google.com/macros/s/AKfycbwWuUVCgRRclss-i0gO_RAwyVVtgVh_fPUgYpFg40gFQJlmo4Su4IxGwj3s-qDvrqbAyg/exec';
const OG_IMAGE = 'https://momentedit.kr/og-image.png';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}

export default async function handler(req, res) {
  try {
    var q = req.query || {};
    var e = String(q.e || '').trim();
    var d = String(q.d || '').replace(/[^0-9]/g, '').slice(0, 2);
    var v = String(q.v || 'digital');

    // 목적지(실제 청첩장) — 파라미터로 결정(데이터 fetch와 무관하게 정확)
    var dest = '/';
    if (d && e) {
      dest = (v === 'family')
        ? '/i-family/family-' + d + '.html?e=' + encodeURIComponent(e)
        : '/i/cover-' + d + '.html?e=' + encodeURIComponent(e);
    } else if (e) {
      dest = '/?e=' + encodeURIComponent(e);
    }

    // 이름·날짜만 fetch (실패해도 카드 문구만 일반값으로, 이동은 그대로)
    var names = '두 사람', dateStr = '';
    if (e) {
      try {
        var ctrl = new AbortController();
        var t = setTimeout(function () { ctrl.abort(); }, 4000);
        var r = await fetch(WEBHOOK + '?action=getCouple&eventId=' + encodeURIComponent(e), { signal: ctrl.signal });
        clearTimeout(t);
        var j = await r.json();
        if (j && j.ok && j.couple) {
          var c = j.couple;
          if (c.groomName && c.brideName) names = c.groomName + ' · ' + c.brideName;
          var m = String(c.weddingDate || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
          if (m) dateStr = m[1] + '. ' + ('0' + m[2]).slice(-2) + '. ' + ('0' + m[3]).slice(-2);
        }
      } catch (_) { /* 카드 문구만 일반값 */ }
    }

    var title = names + ' 결혼합니다';
    var desc = (dateStr ? dateStr + ' · ' : '') + '두 분의 결혼식에 초대합니다 · Moment Edit';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
    res.status(200).send(
      '<!doctype html><html lang="ko"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>' + esc(title) + ' · Moment Edit</title>' +
      '<meta name="description" content="' + esc(desc) + '">' +
      '<meta property="og:type" content="article">' +
      '<meta property="og:site_name" content="Moment Edit">' +
      '<meta property="og:title" content="' + esc(title) + '">' +
      '<meta property="og:description" content="' + esc(desc) + '">' +
      '<meta property="og:image" content="' + OG_IMAGE + '">' +
      '<meta property="og:image:width" content="1200">' +
      '<meta property="og:image:height" content="630">' +
      '<meta property="og:locale" content="ko_KR">' +
      '<meta name="twitter:card" content="summary_large_image">' +
      '<meta name="twitter:title" content="' + esc(title) + '">' +
      '<meta name="twitter:description" content="' + esc(desc) + '">' +
      '<meta name="twitter:image" content="' + OG_IMAGE + '">' +
      '<link rel="canonical" href="' + esc(dest) + '">' +
      '<meta http-equiv="refresh" content="0; url=' + esc(dest) + '">' +
      '</head><body style="margin:0;background:#FAFAF8;font-family:serif;color:#888">' +
      '<script>location.replace(' + JSON.stringify(dest) + ');</script>' +
      '<p style="text-align:center;margin-top:80px;">청첩장으로 이동 중… <a href="' + esc(dest) + '" style="color:#6B2A24">바로가기</a></p>' +
      '</body></html>'
    );
  } catch (err) {
    res.statusCode = 302;
    res.setHeader('Location', '/');
    res.end();
  }
}
