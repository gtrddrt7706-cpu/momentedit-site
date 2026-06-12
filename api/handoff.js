// 모먼트에디트 · 관리자 인계(핸드오프) 두뇌 (Vercel 서버리스)
// 상담 도우미에서 AI가 못 풀어 "상담사 연결"이 발생하면, 대화를 검토해
//   관리자 전용 브리핑을 생성한다: { 핵심 문의 분류 · 요약 · 제안 답변 · 근거 · 확신도 }.
// 그 브리핑을 (설정 시) GAS 웹훅으로 전달해 관리자 페이지 카드로 띄운다.
//
// 환경변수:
//   ANTHROPIC_API_KEY     ← 필수 (없으면 503)
//   HANDOFF_WEBHOOK_URL   ← 선택. GAS /exec URL. 설정되면 브리핑을 관리자에게 전달.
//
// 고객에게는 브리핑을 보여주지 않는다(관리자 전용). 프론트는 "전달됐어요"만 표시.

const KNOWLEDGE = require('./_kb');
const MODEL = 'claude-opus-4-8';   // 핸드오프는 드물고 관리자 응대 품질이 중요 → 상위 모델
const API_URL = 'https://api.anthropic.com/v1/messages';
const MAX_MSG_LEN = 800, MAX_HISTORY = 16, MAX_TOKENS = 1300;

const SYSTEM_PROMPT = `당신은 웨딩 브랜드 "모먼트에디트"의 대표(디렉터)를 돕는 내부 비서입니다. 고객과 AI 상담사의 대화를 검토해, 대표가 빠르고 정확하게 응대하도록 "관리자 전용 브리핑"을 작성합니다. 이 브리핑은 고객에게 보이지 않습니다.

[원칙]
1. 아래 <지식> 안의 사실에 근거해 작성합니다. 지식에 없는 내용은 지어내지 말고 rationale에 "확인 필요"로 표시합니다.
2. 가격·환불·계약·일정 등 민감한 수치·정책은 <지식>의 값만 사용합니다.
3. suggestedReply는 대표가 고객에게 그대로 보내도 될 만큼 정중하고 단정한 한국어 존댓말 초안으로 씁니다. 전각 줄표(—)는 쓰지 않습니다.
4. rationale에는 (a) 고객이 실제로 무엇을 원하는지 해석, (b) 그 답변의 근거(지식 어느 부분), (c) 대표가 직접 확인·결정해야 할 점을 적습니다. 특히 계약·법률·세무 등 대표가 헷갈릴 수 있는 부분은 근거를 친절히 설명합니다.
5. confidence: 지식만으로 충분히 답 가능하면 "높음", 일부 확인 필요면 "보통", 정책 미정이라 대표 판단이 필수면 "낮음".

<지식>
${KNOWLEDGE}
</지식>`;

const SCHEMA = {
  type: 'object',
  properties: {
    category: { type: 'string', description: '핵심 문의 분류 (예: 계약·환불, 일정 변경, 가격, 결과물 등) 짧게' },
    summary: { type: 'string', description: '고객이 무엇을 물었고 왜 AI가 못 풀었는지 2~3문장 요약' },
    suggestedReply: { type: 'string', description: '대표가 고객에게 보낼 만한 정중한 답변 초안' },
    rationale: { type: 'string', description: '해석 + 근거 + 대표가 확인/결정할 점 (관리자 전용)' },
    confidence: { type: 'string', enum: ['높음', '보통', '낮음'] },
  },
  required: ['category', 'summary', 'suggestedReply', 'rationale', 'confidence'],
  additionalProperties: false,
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405; res.setHeader('Allow', 'POST');
    return res.end(JSON.stringify({ error: 'method_not_allowed' }));
  }
  if (!require('./_ratelimit')(req, 4, 30)) {   // 비용 가드 — 상위 모델이라 더 보수적(분당 4·6시간 30)
    res.statusCode = 429; res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'rate_limited' }));
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.statusCode = 503; res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'handoff_unconfigured' }));
  }
  try {
    const body = await readJson(req);
    const page = String((body && body.page) || '').slice(0, 20) || '메인';
    const customer = (body && body.customer && typeof body.customer === 'object') ? body.customer : null;
    let history = Array.isArray(body && body.messages) ? body.messages : [];
    history = history
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-MAX_HISTORY)
      .map((m) => (m.role === 'user' ? '고객' : 'AI') + ': ' + m.content.slice(0, MAX_MSG_LEN).trim())
      .filter((s) => s.length > 3);
    if (history.length === 0) {
      res.statusCode = 400; res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ error: 'empty_conversation' }));
    }

    const custLine = customer
      ? ('고객 정보: ' + [customer.name && ('이름 ' + customer.name), customer.code && ('코드 ' + customer.code), customer.stage && ('단계 ' + customer.stage), customer.phone && ('연락처 ' + customer.phone)].filter(Boolean).join(' · '))
      : '고객 정보: 비로그인(메인/예약 페이지 방문자)';
    const userMsg = '아래는 고객과 AI 상담사의 대화입니다.\n[유입 페이지] ' + page + '\n[' + custLine + ']\n\n[대화]\n' + history.join('\n') + '\n\n위 고객을 위해 대표용 브리핑을 작성하세요.';

    const anthRes = await fetch(API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        output_config: { format: { type: 'json_schema', schema: SCHEMA } },
        messages: [{ role: 'user', content: userMsg }],
      }),
    });
    if (!anthRes.ok) {
      console.error('handoff_anthropic_error', anthRes.status, (await safeText(anthRes)).slice(0, 300));
      res.statusCode = 502; res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ error: 'upstream_error' }));
    }
    const data = await anthRes.json();
    let brief = {};
    try { brief = JSON.parse((data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')); } catch (e) {}
    // 안전망: 전각 줄표 제거
    ['summary', 'suggestedReply', 'rationale', 'category'].forEach((k) => { if (typeof brief[k] === 'string') brief[k] = brief[k].replace(/—/g, '·'); });

    // 관리자에게 전달 (GAS 웹훅 설정 시). 실패해도 고객 응답은 성공 처리.
    let delivered = false;
    const hook = process.env.HANDOFF_WEBHOOK_URL;
    if (hook && /^https:\/\//.test(hook)) {
      try {
        const r = await fetch(hook, {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'aiHandoff', secret: process.env.HANDOFF_SECRET || undefined, page: page, customer: customer || null, conversation: history, brief: brief, at: new Date().toISOString() }),
        });
        let jj = null; try { jj = await r.json(); } catch (e) {}
        delivered = !!(r.ok && jj && jj.ok === true && jj.id);   // GAS는 미지의 action에도 200을 주므로 ok·id까지 확인(라우팅 누락 감지)
      } catch (e) { console.error('handoff_forward_fail', e && e.message); }
    }

    res.statusCode = 200; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
    return res.end(JSON.stringify({ ok: true, delivered: delivered }));   // 고객엔 브리핑 비노출
  } catch (err) {
    console.error('handoff_exception', err && err.message);
    res.statusCode = 500; res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'server_error' }));
  }
};

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 40000) { req.destroy(); reject(new Error('payload_too_large')); } });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}
async function safeText(r) { try { return await r.text(); } catch (e) { return ''; } }
