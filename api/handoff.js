// 모먼트에디트 · 관리자 인계(핸드오프) 두뇌 (Vercel 서버리스)
// 상담 도우미에서 AI가 못 풀어 "상담사 연결"이 발생하면, 대화를 검토해
//   관리자 전용 브리핑을 생성한다: { 핵심 문의 분류 · 요약 · 제안 답변 · 근거 · 확신도 }.
// 그 브리핑을 (설정 시) GAS 웹훅으로 전달해 관리자 페이지 카드로 띄운다.
//
// 환경변수:
//   ANTHROPIC_API_KEY     ← 요약(브리핑)에 필요. 없거나 업체가 실패해도 대화 원문은 GAS 로 보낸다([ERR_CODE_PAGES] HANDOFF_RAW · 관리자 시험(test)만 503 · 502)
//   HANDOFF_WEBHOOK_URL   ← 선택. GAS /exec URL. 설정되면 브리핑을 관리자에게 전달.
//
// 고객에게는 브리핑을 보여주지 않는다(관리자 전용). 프론트는 delivered 가 true 일 때만 "전달했어요"라 말한다(아니면 ecode · why 로 코드 A1 · A3 · A4 · A7 · A9 · HANDOFF_ECODE).

const KNOWLEDGE = require('./_kb');
const RITUAL_KB = require('./_ritual-kb');   // 접점 '식순' 인계는 식순 지식으로 브리핑(일반 KB엔 이벤트 상세가 없어 없는 옵션을 지어낼 위험 · 기획 v3 §1-2)
const MODEL = 'claude-opus-5';   // 핸드오프는 드물고 관리자 응대 품질이 중요 → 상위 모델   // [MODEL_GEN5 2026-08-03] Opus 4.8 → Opus 5. 인계는 관리자만 보는 출력이라 고객 노출 위험이 가장 낮다.
const API_URL = 'https://api.anthropic.com/v1/messages';
const MAX_MSG_LEN = 800, MAX_HISTORY = 16, MAX_TOKENS = 1300;

const SYSTEM_HEAD = `당신은 웨딩 브랜드 "모먼트에디트"의 대표(디렉터)를 돕는 내부 비서입니다. 고객과 AI 상담사의 대화를 검토해, 대표가 빠르고 정확하게 응대하도록 "관리자 전용 브리핑"을 작성합니다. 이 브리핑은 고객에게 보이지 않습니다.

[원칙]
1. 아래 <지식> 안의 사실에 근거해 작성합니다. 지식에 없는 내용은 지어내지 말고 rationale에 "확인 필요"로 표시합니다.
2. 가격·환불·계약·일정 등 민감한 수치·정책은 <지식>의 값만 사용합니다.
3. suggestedReply는 대표가 고객에게 그대로 보내도 될 만큼 정중하고 단정한 한국어 존댓말 초안으로 씁니다. 전각 줄표(—)는 쓰지 않습니다.
4. rationale에는 (a) 고객이 실제로 무엇을 원하는지 해석, (b) 그 답변의 근거(지식 어느 부분), (c) 대표가 직접 확인·결정해야 할 점을 적습니다. 특히 계약·법률·세무 등 대표가 헷갈릴 수 있는 부분은 근거를 친절히 설명합니다.
5. confidence: 지식만으로 충분히 답 가능하면 "높음", 일부 확인 필요면 "보통", 정책 미정이라 대표 판단이 필수면 "낮음".`;
function systemFor(page){ return SYSTEM_HEAD + '\n\n<지식>\n' + (page === '식순' ? RITUAL_KB.full : KNOWLEDGE) + '\n</지식>'; }

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
  try {
    const body = await readJson(req);
    const page = String((body && body.page) || '').slice(0, 20) || '메인';
    const customer = (body && body.customer && typeof body.customer === 'object') ? body.customer : null;
    const state = (body && typeof body.state === 'string') ? body.state.slice(0, 2600).trim() : '';   // (식순) 고객이 만들던 식순 요약 — 디렉터가 되묻지 않게 브리핑에 동봉
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
    const userMsg = '아래는 고객과 AI 상담사의 대화입니다.\n[유입 페이지] ' + page + '\n[' + custLine + ']'
      + (state ? '\n\n[고객이 만들던 식순 상태]\n' + state.replace(/[<>]/g, '') : '')
      + '\n\n[대화]\n' + history.join('\n') + '\n\n위 고객을 위해 대표용 브리핑을 작성하세요.';

    /* ★★[ERR_CODE_PAGES · HANDOFF_RAW 2026-10-07] 요약(브리핑)이 실패해도 인계는 잃지 않는다 — 종전엔 키가 없거나(503) 업체가 실패하면(502)
       GAS 로 아무것도 안 보내고 끝나, 고객이 디렉터 연결을 눌렀는데 관리자 화면엔 흔적이 없었다. 이제 요약이 안 되면 «요약 실패» 표시와
       대화 원문만 보낸다(GAS handleAiHandoff 는 brief.summary 가 없어도 conversation 만 있으면 받는다).
       ★관리자 시험 호출(test)은 GAS 로 보내지 않으므로, 요약이 실패하면 종전대로 실패 번호(503 · 502)를 돌려준다 — 매일 안전점검(ai-safety)이 요약 고장을 계속 잡게 */
    let brief = null, briefWhy = '';
    if (!apiKey) briefWhy = 'unconfigured';
    else {
      try {
        const ac = new AbortController(), tmo = setTimeout(() => ac.abort(), 25000);   // 업체가 붙잡고 있으면 25초에 끊고 원문이라도 보낸다
        let anthRes;
        try {
          anthRes = await fetch(API_URL, {
            method: 'POST', signal: ac.signal,
            headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({
              model: MODEL,
              max_tokens: MAX_TOKENS,
              system: await (async () => {
                const blocks = [{ type: 'text', text: systemFor(page), cache_control: { type: 'ephemeral' } }];
                try { const facts = await require('./_facts')(); if (facts) blocks.push({ type: 'text', text: '[운영 핵심정보 · 최신·최우선]\n' + facts }); } catch (e) {}   // 제안답변의 가격·기한이 낡지 않게(advisor와 동일)
                return blocks;
              })(),
              output_config: { format: { type: 'json_schema', schema: SCHEMA } },
              messages: [{ role: 'user', content: userMsg }],
            }),
          });
        } finally { clearTimeout(tmo); }
        if (!anthRes.ok) {
          console.error('handoff_anthropic_error', anthRes.status, (await safeText(anthRes)).slice(0, 300));
          briefWhy = 'upstream_' + anthRes.status;
        } else {
          const data = await anthRes.json();
          /* [AI_TEST_TAG 2026-08-07] 끄지 말고 태깅 */
          try { await require('./_costlog')(page === '식순' ? '핸드오프:식순' : '핸드오프', MODEL, data.usage, { isTest: !!(body && body.test) }); } catch (e) {}   // 식순발 인계 비용의 기원 보존(인건비 집계)
          try { brief = JSON.parse((data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')); } catch (e) { brief = null; }
          if (!brief || typeof brief !== 'object' || !brief.summary) { brief = null; briefWhy = 'parse'; }
        }
      } catch (e) { console.error('handoff_brief_fail', e && e.message); briefWhy = (e && e.name === 'AbortError') ? 'timeout' : 'exception'; }
    }
    if (!brief) {
      if (body && body.test) {   // 관리자 시험 — 요약 고장을 숨기지 않는다(ai-safety «인계 브리핑 동작»이 ok:true 만 본다)
        res.statusCode = (briefWhy === 'unconfigured') ? 503 : 502; res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.end(JSON.stringify({ error: (briefWhy === 'unconfigured') ? 'handoff_unconfigured' : 'upstream_error', why: briefWhy }));
      }
      console.warn('handoff_raw_forward', briefWhy);
      brief = { category: '요약 실패', confidence: '낮음', summary: 'AI 요약을 만들지 못했어요(' + briefWhy + ') · 아래 대화 원문을 확인해 주세요.', suggestedReply: '', rationale: '요약 단계 실패로 대화 원문만 전달됐어요.' };
    }
    // 안전망: 전각 줄표 제거
    ['summary', 'suggestedReply', 'rationale', 'category'].forEach((k) => { if (typeof brief[k] === 'string') brief[k] = brief[k].replace(/—/g, '·'); });

    // 관리자에게 전달 (GAS 웹훅 설정 시). 실패해도 고객 응답은 200 — 대신 delivered · why 로 화면이 사실대로 말한다([ERR_CODE_PAGES])
    let delivered = false, why = '', ecode = '', eid = '';
    const hook = require('./_livehook')();   // [PREVIEW_GUARD_API] 미리보기에서는 관리자 인계를 운영 시트에 안 쓴다
    if (!hook || !/^https:\/\//.test(hook)) why = 'no_hook';
    else if (body && body.test) why = 'test';   // 관리자 테스트는 관리자 인계 목록에 안 남김
    else {
      try {
        const r = await fetch(hook, {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'aiHandoff', secret: process.env.HANDOFF_SECRET || undefined, page: page, customer: customer || null, state: state || undefined, conversation: history, brief: brief, at: new Date().toISOString() }),
        });
        let jj = null; try { jj = await r.json(); } catch (e) {}
        delivered = !!(r.ok && jj && jj.ok === true && jj.id);   // GAS는 미지의 action에도 200을 주므로 ok·id까지 확인(라우팅 누락 감지)
        if (!delivered) {
          why = 'gas_' + (jj && jj.error ? String(jj.error).replace(/[^\w가-힣 .-]/g, '').slice(0, 40) : (r.ok ? 'bad_reply' : 'http_' + r.status));
          /* ★[HANDOFF_ECODE 2026-10-07 triage-pages #11] GAS 의 까닭을 화면 코드로 넘긴다 — 종전엔 비밀 키 불일치(unauthorized) · GAS 미배포(모르는 동작 A3)도
             화면이 A4(처리 실패)로 말해 관리자가 설정을 볼 생각을 못 했고, 베르셀 쪽이라 오류기록에도 남지 않았다.
             설정(HANDOFF_SECRET ≠ AI_HANDOFF_SECRET · 미배포) A3 · 잠금 대기(busy) A1 · GAS 가 1~9 를 실어 보내면 그대로(사고번호 함께) ·
             GAS 답이 JSON 이 아님(오류 화면 · 할당량 · 권한 재승인) A7 · 그 밖은 화면이 A4 로 말한다 */
          const gec = String((jj && jj.ecode) || '');
          if (jj && jj.error === 'unauthorized') ecode = 'A3';
          else if (jj && jj.error === 'busy') ecode = 'A1';
          else if (/^A[1-9]$/.test(gec)) { ecode = gec; eid = String((jj && jj.eid) || '').replace(/[^A-Z0-9]/gi, '').slice(0, 8); }
          else if (!jj) ecode = 'A7';
          if (ecode) console.warn('handoff_gas_fail', ecode, why);
        }
      } catch (e) { console.error('handoff_forward_fail', e && e.message); why = 'gas_unreachable'; }
    }

    res.statusCode = 200; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
    return res.end(JSON.stringify(Object.assign({ ok: true, delivered: delivered }, why ? { why: why } : {}, ecode ? { ecode: ecode } : {}, eid ? { eid: eid } : {}, briefWhy ? { brief: false, briefWhy: briefWhy } : {})));   // 고객엔 브리핑 비노출 · [HANDOFF_ECODE] ecode 는 화면 코드(A#)
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
