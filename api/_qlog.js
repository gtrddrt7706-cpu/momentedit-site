// 고객 질문 로그(익명) — 질문·접점·구분(정상/애매/막힘)을 GAS에 적재. 자주 막히거나 애매한 곳을 보고/개선하기 위함.
//   GAS(handleAdvisorLog)가 전화·이메일 마스킹 후 저장(90일 자동 정리). 실패해도 고객 응답엔 영향 없음(fire-and-forget·2초 타임아웃).
//   '애매' = AI가 답은 했지만 자신 없어 얼버무린 신호 — 답변 텍스트의 헤지 표현으로 감지(추가 토큰 0).
const SHAKY = /(정확하지\s?않을\s?수|정확히는\s?모르|확실하지\s?않|잘\s?모르겠|담당자에게|직접\s?문의|안내\s?(가|를|드리기)\s?어렵|확인\s?후\s?안내|도움\s?드리기\s?어렵|답변\s?드리기\s?어렵|확인\s?(이|후)\s?필요)/;

module.exports = async function logQuestion(surface, q, opts) {
  try {
    const hook = process.env.HANDOFF_WEBHOOK_URL;
    if (!hook || !/^https:\/\//.test(hook)) return;
    q = String(q || '').slice(0, 300);
    if (!q) return;
    const escalate = !!(opts && opts.escalate);
    const reply = String((opts && opts.reply) || '');
    const shaky = !escalate && SHAKY.test(reply);
    const flag = escalate ? '막힘' : (shaky ? '애매' : '정상');
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 2000);
    try {
      await fetch(hook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'advisorLog', q, escalate, flag, surface: String(surface || '') }), signal: ctl.signal });
    } finally { clearTimeout(t); }
  } catch (e) { /* 로깅 실패는 무시 */ }
};
