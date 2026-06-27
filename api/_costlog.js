// AI 비용 로그 — Anthropic 응답의 usage(토큰)를 GAS 시트로 보내 접점별 24시간 집계에 쓴다.
//   기존 GAS 엔드포인트(HANDOFF_WEBHOOK_URL = /exec) 재활용 · action='aiCostLog'.
//   본 응답 직전에 await(짧은 타임아웃)로 호출 — 느려지지 않게 2초에서 끊고, 실패해도 무해(로그만 누락).
//   설정(HANDOFF_WEBHOOK_URL) 없으면 조용히 패스.
module.exports = async function logAiCost(surface, model, usage) {
  try {
    const hook = process.env.HANDOFF_WEBHOOK_URL;
    if (!hook || !/^https:\/\//.test(hook) || !usage) return;
    const payload = JSON.stringify({
      action: 'aiCostLog',
      surface: String(surface || '').slice(0, 16),
      model: String(model || '').slice(0, 40),
      in: usage.input_tokens || 0,
      out: usage.output_tokens || 0,
      cw: usage.cache_creation_input_tokens || 0,
      cr: usage.cache_read_input_tokens || 0,
    });
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 2000);
    try {
      await fetch(hook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: payload, signal: ctl.signal });
    } finally { clearTimeout(t); }
  } catch (e) { /* 비용 로그 실패는 본 응답에 영향 없음 */ }
};
