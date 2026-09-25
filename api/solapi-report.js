// 솔라피 «메시지 리포트» 웹훅 중계 (Vercel 서버리스) — 받은 전달결과 리포트를 GAS /exec 로 넘기고, 솔라피에는 200 으로 답한다.
// ★★[SOLAPI_RELAY 2026-09-25 솔라피 «웹훅 실패 알림» 메일 — 실패 3회 · 8회면 웹훅 비활성화] 되돌리지 말 것.
//   웹훅을 GAS /exec 에 바로 걸었더니 리포트는 처리됐는데(시트 «알림톡추적» 이 «완료»로 바뀜) 솔라피는 실패로 셌다.
//   GAS 웹앱은 POST 를 다 처리한 뒤 200 이 아니라 302(script.googleusercontent.com 으로 넘김)로 답한다 —
//   솔라피는 그 답을 실패로 보고 다시 보낸다. 그대로 두면 8번째에 웹훅이 꺼지고,
//   카톡 «전달 실패 → 고객 메일»(95_notify handleSolapiReport · KAKAO_FAIL_MAIL)이 조용히 멈춘다.
//   → 여기서 받아 GAS 로 넘기고 솔라피에는 200 으로 답한다. 같은 리포트가 두 번 와도 GAS 가 messageId 로 한 번만 처리한다.
// ★GAS 주소는 _livehook 에서만 꺼낸다(PREVIEW_GUARD_API) — 미리보기 배포에서는 운영 시트에 쓰지 않는다.
// ★리포트 모양(배열 · 또는 messageId/statusCode 가 있고 action 이 없는 객체 · 또는 그 배열을 data 로 감싼 객체)만 넘긴다.
//   감싼 것은 풀어서 넘긴다 — GAS doPost 가 리포트로 읽는 모양(배열)으로 맞춘다(RELAY_UNWRAP).
//   이 주소로 다른 GAS 동작을 부를 수 없게 한다(중계가 범용 프록시가 되지 않게).
// 환경변수: HANDOFF_WEBHOOK_URL (GAS /exec)

const rateGate = require('./_ratelimit');
const writeHook = require('./_livehook');

const MAX_BYTES = 1024 * 1024;   // 리포트 묶음 상한(한 건 1KB 안팎 · 넉넉히)
const WAIT_MS = 3000;            // GAS 를 기다리는 한도 — 넘기면 이미 넘긴 것으로 친다(GAS 는 연결이 끊겨도 끝까지 돈다)
// ★[RELAY_WAIT 2026-09-25] 7초 → 4초 → 3초. 기다림이 솔라피 한도보다 길면 느린 GAS 한 번이 곧 실패 1회다(8회면 웹훅이 꺼진다).
//   솔라피 한도는 웹훅 정보 화면 «추가 설정 → Timeout» 이다 — **기본 5초 · 최대 15초**(2026-09-25 사장님 화면으로 확인).
//   기본 5초에서도 베르셀 콜드스타트까지 넣어 넉넉히 남도록 3초로 둔다. 콘솔에서 15초로 올려 두면 여유가 더 생긴다.
//   끊어도 GAS 는 이미 받은 요청을 끝까지 처리한다. 잃는 것은 «3초 뒤에 난 GAS 오류는 다시 받지 못한다» 하나 —
//   handleSolapiReport 는 스스로 오류를 잡아 기록한다.

module.exports = async (req, res) => {
  const out = (code, obj) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify(obj));
  };
  if (req.method === 'GET' || req.method === 'HEAD') return out(200, { ok: true, relay: 'solapi-report' });   // 등록·연결 확인용
  if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return out(405, { ok: false }); }
  if (!rateGate(req, 300, 20000)) return out(429, { ok: false, error: 'rate' });   // 솔라피가 나중에 다시 보낸다
  if (writeHook.isPreview()) return out(200, { ok: true, preview: true });          // 미리보기는 운영 시트에 안 쓴다
  const hook = writeHook();
  if (!hook || !/^https:\/\//.test(hook)) return out(503, { ok: false, error: 'hook' });   // 설정이 빠졌으면 실패로 답해 다시 오게 한다

  const raw = await readRaw(req);
  if (raw === null) return out(413, { ok: false, error: 'too large' });
  let parsed = null;
  try { parsed = JSON.parse(raw || 'null'); } catch (e) { parsed = null; }
  // ★[RELAY_UNWRAP 2026-09-25] 솔라피 웹훅 정보 화면의 «Request Data» 가 {"data":[…4건]} 로 보였다.
  //   GAS doPost 는 배열이나 messageId 가 있는 객체만 리포트로 알아본다 — 감싼 모양이 그대로 가면 리포트로 안 읽힌다.
  //   그래서 감싼 모양이면 여기서 풀어 배열로 넘긴다. GAS 를 고치지 않아도 되고(재배포 불필요) 어느 모양이 와도 같다.
  let payload = parsed;
  if (payload && typeof payload === 'object' && !Array.isArray(payload) && Array.isArray(payload.data) && !payload.action) payload = payload.data;
  const isReport = Array.isArray(payload)
    ? payload.length > 0
    : !!(payload && typeof payload === 'object' && (payload.messageId || payload.statusCode) && !payload.action);
  if (!isReport) return out(400, { ok: false, error: 'not a report' });
  const body = payload === parsed ? raw : JSON.stringify(payload);

  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), WAIT_MS);
  try {
    const r = await fetch(hook, { method: 'POST', headers: { 'content-type': 'application/json' }, body, redirect: 'follow', signal: ctl.signal });
    let j = null;
    try { j = await r.json(); } catch (e) { j = null; }
    if (r.ok && !(j && j.ok === false)) return out(200, { ok: true });
    return out(502, { ok: false, error: 'gas' });   // GAS 가 받았는데 오류 — 솔라피가 다시 보낸다(같은 리포트는 GAS 가 한 번만 처리)
  } catch (e) {
    if (e && e.name === 'AbortError') return out(200, { ok: true, slow: true });   // 이미 넘겼다 — 다시 보내게 하면 실패만 쌓인다
    return out(502, { ok: false, error: 'forward' });                              // 넘기지도 못했다 — 다시 보내게 한다
  } finally {
    clearTimeout(t);
  }
};

function readRaw(req) {
  return new Promise((resolve) => {
    let raw = '', size = 0, done = false;
    const fin = (v) => { if (!done) { done = true; resolve(v); } };
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BYTES) { try { req.destroy(); } catch (e) {} fin(null); return; }
      raw += c;
    });
    req.on('end', () => fin(raw));
    req.on('error', () => fin(''));
  });
}
