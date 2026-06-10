// 카톡·SNS 미리보기 봇 전용 — 청첩장 OG 메타에 부부 이름 주입 (Vercel 서버리스)
// vercel.json routes가 '미리보기 봇 UA + /i/cover-NN.html·/i-family/family-NN.html'만 이리로 보낸다.
// 하객(사람) 트래픽은 라우트에 안 걸려 정적 파일 그대로 — 속도 영향 없음. 실패 시 원본 그대로 응답(안전 폴백).
const COUPLE_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwWuUVCgRRclss-i0gO_RAwyVVtgVh_fPUgYpFg40gFQJlmo4Su4IxGwj3s-qDvrqbAyg/exec';
const PAGE_RE = /^\/(?:i\/cover-\d{2}|i-family\/family-\d{2})\.html$/;

module.exports = async (req, res) => {
  try {
    const page = String((req.query && req.query.page) || '');
    if (!PAGE_RE.test(page)) { res.statusCode = 404; return res.end('not found'); }
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || 'https';

    // 원본 정적 HTML — 이 서버 측 fetch는 봇 UA가 아니라서 라우트에 다시 안 걸림(루프 없음)
    const sr = await fetch(proto + '://' + host + page);
    if (!sr.ok) { res.statusCode = 502; return res.end('upstream'); }
    let html = await sr.text();

    // 부부 이름 조회 (4초 제한 — 실패하면 기본 문구 그대로)
    const e = String((req.query && req.query.e) || '').trim();
    let g = '', b = '';
    if (e && e.length <= 64) {
      try {
        const ctl = new AbortController();
        const t = setTimeout(() => ctl.abort(), 4000);
        const r = await fetch(COUPLE_WEBHOOK_URL + '?action=getCouple&eventId=' + encodeURIComponent(e), { signal: ctl.signal });
        clearTimeout(t);
        const d = await r.json();
        if (d && d.ok && d.couple) {
          g = String(d.couple.groomName || '').trim();
          b = String(d.couple.brideName || '').trim();
        }
      } catch (_) {}
    }

    if (g && b) {
      const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const names = esc(g) + ' &amp; ' + esc(b);   // 표지 표기(HUIJUN & MIKU)와 같은 무드
      const title = names + ' 결혼식에 초대합니다 · Moment Edit';
      const desc = names + ' 두 분의 결혼식에 진심으로 초대합니다.';
      html = html
        .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/i, '$1' + title + '$2')
        .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/i, '$1' + desc + '$2')
        .replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/i, '$1' + title + '$2')
        .replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/i, '$1' + desc + '$2')
        .replace(/<title>[^<]*<\/title>/i, '<title>' + title + '</title>');
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=600');
    res.statusCode = 200;
    res.end(html);
  } catch (_) {
    res.statusCode = 500; res.end('error');
  }
};
