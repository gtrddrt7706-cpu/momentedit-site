// 모먼트에디트 · FAQ 자동초안 (Vercel 서버리스 · 관리자 마케팅 도구)
// 관리자 화면(📊 리포트)에서 "자주 묻는/막힌 질문" 묶음을 보내면, <지식>에 근거한 홈페이지 FAQ 초안을 만들어 준다.
// 고객에게 자동 게시되지 않는다 — 관리자가 검토 후 직접 게시. 핵심정보·보충지식도 함께 근거로 사용.
//
// 환경변수: ANTHROPIC_API_KEY (필수) · HANDOFF_WEBHOOK_URL (선택 · 핵심정보/보충지식 주입용)

const KNOWLEDGE = require('./_kb');
const MODEL = 'claude-sonnet-4-6';
const API_URL = 'https://api.anthropic.com/v1/messages';
const MAX_TOKENS = 1600;

const SYSTEM_PROMPT = `당신은 웨딩 브랜드 "모먼트에디트"의 마케팅 담당입니다. 고객이 실제로 자주 묻거나 AI가 답하기 어려워한 질문들을 바탕으로, 홈페이지에 올릴 FAQ 초안을 작성합니다.

[원칙]
1. 아래 <지식> 안의 사실에만 근거합니다. 지식에 없으면 답을 지어내지 말고 a에 "운영자 확인 필요"라고 적습니다.
2. 정중하고 단정한 한국어 존댓말. 전각 줄표(—)는 쓰지 않습니다. 각 답변은 2~4문장으로 간결하게.
3. 같은 취지의 질문은 하나로 합쳐 대표 질문 하나로 만듭니다.
4. 가격·환불·일정 등 민감한 수치·정책은 <지식>의 값만 사용합니다(임의 추정 금지).

<지식>
${KNOWLEDGE}
</지식>`;

const SCHEMA = {
  type: 'object',
  properties: {
    faqs: {
      type: 'array',
      items: { type: 'object', properties: { q: { type: 'string' }, a: { type: 'string' } }, required: ['q', 'a'], additionalProperties: false },
    },
  },
  required: ['faqs'],
  additionalProperties: false,
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('Allow', 'POST'); return res.end(JSON.stringify({ error: 'method_not_allowed' })); }
  if (!require('./_ratelimit')(req, 3, 20)) { res.statusCode = 429; res.setHeader('Content-Type', 'application/json; charset=utf-8'); return res.end(JSON.stringify({ error: 'rate_limited' })); }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { res.statusCode = 503; res.setHeader('Content-Type', 'application/json; charset=utf-8'); return res.end(JSON.stringify({ error: 'unconfigured' })); }
  try {
    const body = await readJson(req);
    let qs = Array.isArray(body && body.questions) ? body.questions : [];
    qs = qs.map((q) => String(q || '').slice(0, 200).trim()).filter(Boolean).slice(0, 20);
    if (!qs.length) { res.statusCode = 400; res.setHeader('Content-Type', 'application/json; charset=utf-8'); return res.end(JSON.stringify({ error: 'empty_questions' })); }

    const sysBlocks = [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }];
    try { const facts = await require('./_facts')(); if (facts) sysBlocks.push({ type: 'text', text: '[운영 핵심정보 — 최신·최우선]\n' + facts }); } catch (e) {}
    try { const n = await require('./_kbnotes')('메인'); if (n) sysBlocks.push({ type: 'text', text: '[운영자 보충지식 — 참고]\n' + n }); } catch (e) {}

    const userMsg = '아래는 고객이 실제로 자주 묻거나 AI가 답하기 어려워한 질문들입니다. 이를 바탕으로 홈페이지 FAQ 초안을 작성하세요.\n\n' + qs.map((q, i) => (i + 1) + '. ' + q).join('\n');

    const anthRes = await fetch(API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, system: sysBlocks, output_config: { format: { type: 'json_schema', schema: SCHEMA } }, messages: [{ role: 'user', content: userMsg }] }),
    });
    if (!anthRes.ok) { console.error('faq_draft_upstream', anthRes.status); res.statusCode = 502; res.setHeader('Content-Type', 'application/json; charset=utf-8'); return res.end(JSON.stringify({ error: 'upstream_error' })); }
    const data = await anthRes.json();
    if (!(body && body.test)) { try { await require('./_costlog')('FAQ초안', MODEL, data.usage); } catch (e) {} }
    let parsed = { faqs: [] };
    try { parsed = JSON.parse((data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')); } catch (e) {}
    const faqs = (Array.isArray(parsed.faqs) ? parsed.faqs : []).map((f) => ({ q: String(f.q || '').replace(/—/g, '·'), a: String(f.a || '').replace(/—/g, '·') })).filter((f) => f.q && f.a);

    res.statusCode = 200; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
    return res.end(JSON.stringify({ ok: true, faqs }));
  } catch (err) {
    console.error('faq_draft_exception', err && err.message);
    res.statusCode = 500; res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'server_error' }));
  }
};

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 20000) { req.destroy(); reject(new Error('payload_too_large')); } });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}
