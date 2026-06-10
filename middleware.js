// 카톡·SNS 링크 미리보기 봇에게만 청첩장 OG 메타에 부부 이름을 주입 (Vercel Edge Middleware)
// - 사람(하객) 트래픽: UA가 봇이 아니면 즉시 통과 → 기존 정적 파일 그대로(체감 지연 없음)
// - 봇 트래픽: ?e= 이벤트ID로 커플 웹훅(getCouple)에서 이름을 받아 og:title/description·<title> 치환
// - 어떤 단계든 실패하면 조용히 통과 → 기본 문구("결혼식에 초대합니다")로 안전하게 동작
const COUPLE_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwWuUVCgRRclss-i0gO_RAwyVVtgVh_fPUgYpFg40gFQJlmo4Su4IxGwj3s-qDvrqbAyg/exec';
const BOT_UA = /kakaotalk-scrap|kakaostory|facebookexternalhit|facebookcatalog|twitterbot|slackbot|slack-imgproxy|discordbot|telegrambot|whatsapp|line-poker|linespider|naver|daumoa|daum|skypeuripreview|pinterestbot|vkshare|bingpreview|linkedinbot/i;
const PAGE_RE = /^\/(?:i\/cover-\d{2}|i-family\/family-\d{2})\.html$/;

export const config = { matcher: ['/i/:path*', '/i-family/:path*'] };

export default async function middleware(req) {
  try {
    const url = new URL(req.url);
    if (!PAGE_RE.test(url.pathname)) return;                       // 갤러리 등 다른 /i/* 경로는 손대지 않음
    const ua = req.headers.get('user-agent') || '';
    if (!BOT_UA.test(ua)) return;                                  // 사람 트래픽은 정적 그대로
    const e = (url.searchParams.get('e') || '').trim();
    if (!e || e.length > 64) return;

    // 부부 이름 조회 (4초 제한 — 늦으면 기본 문구로)
    let g = '', b = '';
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
    if (!g || !b) return;

    // 원본 정적 HTML (이 fetch는 봇 UA가 아니라서 미들웨어를 다시 타지 않음 → 루프 없음)
    const sr = await fetch(new URL(url.pathname, url.origin));
    if (!sr.ok) return;
    let html = await sr.text();

    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const names = esc(g) + ' ♥ ' + esc(b);
    const title = names + ' 결혼식에 초대합니다 · Moment Edit';
    const desc = names + ' 두 분의 결혼식에 진심으로 초대합니다.';
    html = html
      .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/i, '$1' + title + '$2')
      .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/i, '$1' + desc + '$2')
      .replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/i, '$1' + title + '$2')
      .replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/i, '$1' + desc + '$2')
      .replace(/<title>[^<]*<\/title>/i, '<title>' + title + '</title>');

    return new Response(html, {
      status: 200,
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, s-maxage=600' }
    });
  } catch (_) { return; }                                          // 미들웨어 오류가 청첩장을 막지 않게
}
