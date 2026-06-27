// 카톡 상담 연결 집계 (Vercel 서버리스) — 개인정보 없이 '카카오톡 상담하기' 클릭 수만 GAS에 적재(영업 전환 신호).
//   sendBeacon으로 들어오는 fire-and-forget 요청. 본문은 {surface}만. 실패해도 무방.
// 환경변수: HANDOFF_WEBHOOK_URL (GAS /exec URL)

module.exports = async (req, res) => {
  const done = (code) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify({ ok: code === 200 })); };
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return done(405); }
  const hook = process.env.HANDOFF_WEBHOOK_URL;
  if (!hook || !/^https:\/\//.test(hook)) return done(200);   // 미설정이어도 조용히 OK(집계는 부가기능)
  try {
    const body = await readJson(req);
    const surface = String((body && body.surface) || '메인').slice(0, 10);
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 2000);
      try { await fetch(hook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'leadClick', surface }), signal: ctl.signal }); }
      finally { clearTimeout(t); }
    } catch (e) {}
    return done(200);
  } catch (e) { return done(200); }
};

function readJson(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 2000) { try { req.destroy(); } catch (e) {} resolve({}); } });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}
