// AI 교육(운영자 보충지식) — GAS에서 접점별 활성 노트를 가져와 챗봇 KB '뒤에' 덧붙인다.
//   핵심 가격·계약 KB를 못 덮도록, 호출 측에서 항상 핵심 블록 '다음'에 별도 블록으로 붙인다.
//   5분 메모리 캐시(접점별) — 매 응답마다 GAS를 때리지 않게. 실패/미설정 시 빈 문자열.
const _c = {};   // surface -> { at, notes }
module.exports = async function getKbNotes(surface) {
  surface = String(surface || '메인');
  try {
    const hook = process.env.HANDOFF_WEBHOOK_URL;
    if (!hook || !/^https:\/\//.test(hook)) return '';
    const now = Date.now();
    const hit = _c[surface];
    if (hit && (now - hit.at) < 120000) return hit.notes;   // 2분 캐시 — 교육 반영을 빠르게(효과 확인 UX) · 비용 영향 미미
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 2000);
    let notes = '';
    try {
      const r = await fetch(hook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'aiKbNotes', surface }), signal: ctl.signal });
      const j = await r.json();
      notes = (j && typeof j.notes === 'string') ? j.notes.slice(0, 4000) : '';
    } finally { clearTimeout(t); }
    _c[surface] = { at: now, notes };
    return notes;
  } catch (e) { return (_c[surface] && _c[surface].notes) || ''; }
};
