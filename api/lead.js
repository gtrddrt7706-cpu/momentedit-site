// 모먼트에디트 · 문의 리드(콜백 요청) 접수 (Vercel 서버리스)
// 챗봇에서 고객이 동의 후 남긴 이름·연락처를 GAS로 전달 → '문의리드' 적재 + 관리자 즉시 SMS.
//   고객 화면이라 동의(consent)가 없으면 거절. 연락처는 후속 연락 목적이라 마스킹하지 않고 저장(동의 기반).
// 환경변수: HANDOFF_WEBHOOK_URL (GAS /exec URL · 없으면 503)

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('Allow', 'POST'); return res.end(JSON.stringify({ error: 'method_not_allowed' })); }
  if (!require('./_ratelimit')(req, 3, 15)) { res.statusCode = 429; res.setHeader('Content-Type', 'application/json; charset=utf-8'); return res.end(JSON.stringify({ error: 'rate_limited' })); }
  const hook = process.env.HANDOFF_WEBHOOK_URL;
  if (!hook || !/^https:\/\//.test(hook)) { res.statusCode = 503; res.setHeader('Content-Type', 'application/json; charset=utf-8'); return res.end(JSON.stringify({ error: 'unconfigured' })); }
  try {
    const body = await readJson(req);
    const name = String((body && body.name) || '').trim().slice(0, 40);
    const phone = String((body && body.phone) || '').trim().slice(0, 20);
    const consent = !!(body && body.consent);
    const surface = String((body && body.surface) || '메인').slice(0, 10);
    const context = String((body && body.context) || '').slice(0, 200);
    if (!name || phone.replace(/[^0-9]/g, '').length < 9) { res.statusCode = 400; res.setHeader('Content-Type', 'application/json; charset=utf-8'); return res.end(JSON.stringify({ error: 'invalid', message: '이름과 연락처를 정확히 입력해 주세요.' })); }
    if (!consent) { res.statusCode = 400; res.setHeader('Content-Type', 'application/json; charset=utf-8'); return res.end(JSON.stringify({ error: 'consent_required', message: '개인정보 수집·이용 동의가 필요해요.' })); }

    let ok = false;
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 5000);
      try {
        const r = await fetch(hook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'leadCapture', name, phone, consent: true, surface, context }), signal: ctl.signal });
        let j = null; try { j = await r.json(); } catch (e) {}
        ok = !!(r.ok && j && j.ok === true);
      } finally { clearTimeout(t); }
    } catch (e) { console.error('lead_forward_fail', e && e.message); }

    if (!ok) { res.statusCode = 502; res.setHeader('Content-Type', 'application/json; charset=utf-8'); return res.end(JSON.stringify({ error: 'forward_failed', message: '잠시 후 다시 시도해 주세요.' })); }
    res.statusCode = 200; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
    return res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    console.error('lead_exception', err && err.message);
    res.statusCode = 500; res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'server_error' }));
  }
};

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 8000) { req.destroy(); reject(new Error('payload_too_large')); } });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}
