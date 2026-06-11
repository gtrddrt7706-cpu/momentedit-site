// 공용 호출량 가드 — 같은 IP의 폭주(반복 호출·스크립트 어뷰징)로 인한 비용 누수 차단.
// 서버리스 인스턴스 단위 인메모리(베스트에포트): 완벽한 분산 차단은 아니지만,
// 단일 출처의 루프성 어뷰징(비용 사고의 대부분)을 싸게 막는다. 정상 고객은 닿지 않는 한도.
const HITS = new Map();   // ip → { m: 분당 카운트, mUntil, l: 6시간 카운트, lUntil }

module.exports = function rateGate(req, perMin, per6h) {
  perMin = perMin || 8; per6h = per6h || 100;
  let ip = String((req.headers && req.headers['x-forwarded-for']) || '').split(',')[0].trim();
  if (!ip) ip = (req.socket && req.socket.remoteAddress) || 'unknown';
  const now = Date.now();
  let h = HITS.get(ip);
  if (!h) {
    if (HITS.size > 5000) HITS.clear();   // 메모리 가드(인스턴스 수명 내 비정상 다IP 유입 시)
    h = { m: 0, mUntil: now + 60000, l: 0, lUntil: now + 6 * 3600 * 1000 };
    HITS.set(ip, h);
  }
  if (now > h.mUntil) { h.m = 0; h.mUntil = now + 60000; }
  if (now > h.lUntil) { h.l = 0; h.lUntil = now + 6 * 3600 * 1000; }
  h.m++; h.l++;
  return h.m <= perMin && h.l <= per6h;
};
