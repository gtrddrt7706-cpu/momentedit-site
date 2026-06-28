// 핵심정보 단일 진실원 — GAS '핵심정보' 시트의 활성 사실(키:값)을 가져와 챗봇 시스템 프롬프트에 "최신·최우선"으로 주입.
//   가격·일정·정책이 바뀌어도 코드 재배포 없이 관리자 화면에서 고치면 여기로 흘러든다.
//   2분 메모리 캐시 · 실패/미설정 시 빈 문자열(이 경우 _kb.js 하드코딩 사실이 그대로 쓰임 — 안전 폴백).
let _cache = { at: 0, facts: '' };
module.exports = async function getFacts() {
  try {
    const hook = process.env.HANDOFF_WEBHOOK_URL;
    if (!hook || !/^https:\/\//.test(hook)) return '';
    const now = Date.now();
    if (_cache.facts !== '' && (now - _cache.at) < 120000) return _cache.facts;
    if (_cache.at && (now - _cache.at) < 120000) return _cache.facts;   // 빈 결과도 2분 캐시(GAS 과호출 방지)
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 2000);
    let facts = '';
    try {
      const r = await fetch(hook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'aiFacts' }), signal: ctl.signal });
      const j = await r.json();
      facts = (j && typeof j.facts === 'string') ? j.facts.slice(0, 4000) : '';
    } finally { clearTimeout(t); }
    _cache = { at: now, facts };
    return facts;
  } catch (e) { return _cache.facts || ''; }
};
