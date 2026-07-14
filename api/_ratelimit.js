// 공용 호출량 가드 — 같은 IP의 폭주(반복 호출·스크립트 어뷰징)로 인한 비용 누수 차단.
// 서버리스 인스턴스 단위 인메모리(베스트에포트): 완벽한 분산 차단은 아니지만,
// 단일 출처의 루프성 어뷰징(비용 사고의 대부분)을 싸게 막는다. 정상 고객은 닿지 않는 한도.
const HITS = new Map();   // ip → { m: 분당 카운트, mUntil, l: 6시간 카운트, lUntil }

// 클라이언트 식별 — Vercel이 직접 세팅해 클라이언트가 위조할 수 없는 헤더(x-real-ip)를 우선한다.
//   x-forwarded-for 첫 홉은 요청자가 임의 값을 넣을 수 있어(뒤에 실제 IP가 붙음) 키 위조·가드 우회에 악용됨.
function clientIp(req) {
  const hs = req.headers || {};
  let ip = String(hs['x-real-ip'] || hs['x-vercel-forwarded-for'] || '').split(',')[0].trim();
  if (!ip) ip = String(hs['x-forwarded-for'] || '').split(',')[0].trim();   // 폴백(자체 프록시 환경)
  if (!ip) ip = (req.socket && req.socket.remoteAddress) || 'unknown';
  return ip;
}

// 메모리 가드 — 전체 초기화(clear)는 모든 IP의 한도를 리셋해 오히려 우회 통로가 된다.
//   대신 만료된 항목만 지우고, 그래도 넘치면 오래된(삽입순 앞) 것부터 축출한다.
function prune(now) {
  for (const [k, v] of HITS) { if (now > v.lUntil) HITS.delete(k); }
  if (HITS.size > 5000) {
    let over = HITS.size - 5000;
    for (const k of HITS.keys()) { if (over-- <= 0) break; HITS.delete(k); }
  }
}

module.exports = function rateGate(req, perMin, per6h) {
  perMin = perMin || 8; per6h = per6h || 100;
  const ip = clientIp(req);
  const now = Date.now();
  let h = HITS.get(ip);
  if (!h) {
    if (HITS.size > 5000) prune(now);
    h = { m: 0, mUntil: now + 60000, l: 0, lUntil: now + 6 * 3600 * 1000 };
    HITS.set(ip, h);
  }
  if (now > h.mUntil) { h.m = 0; h.mUntil = now + 60000; }
  if (now > h.lUntil) { h.l = 0; h.lUntil = now + 6 * 3600 * 1000; }
  h.m++; h.l++;
  return h.m <= perMin && h.l <= per6h;
};
