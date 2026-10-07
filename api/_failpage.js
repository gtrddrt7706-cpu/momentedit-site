// ★[SCRIPT_FILE_BACK 2026-10-07 triage-builder #23] «파일로» 돌려주는 길(api/script-file.js · api/voice-file.js)이 실패할 때 보여 줄 짧은 페이지.
//   두 길은 폼 POST 로 «지금 화면을 이동시켜» 파일을 받는다(카톡 · 인스타 앱 안에서도 되는 유일한 길 · SAVE_INAPP · VOICE_KEEP).
//   성공하면 브라우저가 파일만 받고 화면은 그대로다. 그런데 실패(429 · 413 · 400 · GAS 실패)면 그 응답이 화면을 «통째로» 덮는다 —
//   종전엔 흰 화면에 글 한 줄(«잠시 뒤에 다시 눌러 주세요.»)뿐이라 빌더(식순 화면 iframe)는 돌아갈 단추도 코드도 없었다(마이페이지 ✕ 는 숨겨 둔다).
//   이제 까닭 한 줄 + 코드(있으면 · 한 덩어리) + «돌아가기»(방금 화면으로 되돌아간다 · 기록이 없으면 마이페이지로).
// ★글 · 토큰은 싣지 않는다 — 우리가 정한 문장만 넣는다(이스케이프도 한다). 상태 번호는 종전 그대로 둔다(검사 · 기록이 같은 번호를 본다).
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

module.exports = function failPage(res, status, title, line) {
  const body = esc(line).replace(/\(코드 [^)<]*\)/g, (c) => '<span class="c">' + c + '</span>');   // [ERR_CODE_GLUE] 코드는 한 덩어리
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end('<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">'
    + '<title>' + esc(title) + ' · Moment Edit</title><style>html{color-scheme:light only}body{margin:0;min-height:100vh;box-sizing:border-box;display:flex;align-items:center;justify-content:center;'
    + 'padding:24px 16px;background:#FAFAF8;color:#3A2D22;font-family:"Noto Serif KR","Nanum Myeongjo",serif;word-break:keep-all}main{max-width:420px;text-align:center}'
    + 'h1{font:inherit;font-size:16px;font-weight:500;margin:0 0 8px}p{font-size:14px;line-height:1.8;color:#5A554C;margin:0 0 22px}.c{white-space:nowrap}'
    + 'a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 24px;border:1px solid #DDD8D1;border-radius:999px;background:#fff;color:#3A2D22;text-decoration:none;font-size:13px}'
    + 'a:focus-visible{outline:2px solid #6B2A24;outline-offset:3px}</style></head><body><main role="alert"><h1>' + esc(title) + '</h1><p>' + body + '</p>'
    + '<a href="/mypage.html" target="_top" id="back">돌아가기</a></main>'
    + '<script>document.getElementById("back").addEventListener("click",function(e){ if(history.length>1){ e.preventDefault(); history.back(); } });</script></body></html>');
};
