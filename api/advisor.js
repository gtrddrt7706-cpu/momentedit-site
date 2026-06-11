// 모먼트에디트 AI 상담사 · 2단 자유질문 엔드포인트 (Vercel 서버리스)
// 프론트(index.html 위젯) → POST /api/advisor → Claude Haiku 4.5
// 지식베이스(KB) 안의 사실만으로 답하고, 모르면 [[ESCALATE]] 신호로 상담사 연결을 유도한다.
//
// 필요 환경변수 (Vercel 프로젝트 설정):
//   ANTHROPIC_API_KEY   ← 과금 계정 API 키 (없으면 503 반환, 1단 즉답 칩은 키 없이 작동)
//
// 의존성 없음(전역 fetch 사용). package.json 불필요.
//
// ※ 아래 KNOWLEDGE는 2026-06-11 현재 시스템(index.html·inquiry.html·privacy.html·
//   cancel.html·contract/*·mypage.html·platform-config) 기준. 가격·정책 변경 시 함께 갱신.
//   옛 카카오 챗봇 자료(momentedit-docs/kakao-chatbot)는 수치가 달라 참조만, 인용 금지.

const MODEL = 'claude-haiku-4-5';
const API_URL = 'https://api.anthropic.com/v1/messages';

// 어뷰징·비용 가드
const MAX_MSG_LEN = 600;        // 사용자 1발 입력 길이 상한
const MAX_HISTORY = 12;         // 누적 대화 턴 상한
const MAX_TOKENS = 700;         // 응답 토큰 상한

const KNOWLEDGE = require('./_kb');
const rateGate = require('./_ratelimit');

const SYSTEM_PROMPT = `당신은 웨딩 브랜드 "모먼트에디트"의 AI 상담 도우미입니다. 예비 부부의 질문에 따뜻하고 단정하게 답합니다.

[엄격한 규칙]
1. 아래 <지식> 안에 적힌 사실만으로 답합니다. 지식에 없는 내용은 절대 지어내지 않습니다.
2. 가격·예약금·계약금·잔금·환불·시착·날짜·포함내역 등 구체적 수치나 정책은 <지식>에 있는 값만 인용합니다. 확실하지 않으면 추측하지 말고 상담사 연결을 안내합니다.
3. "19. 아직 개별 안내 전" 항목에 해당하는 질문(정확한 주소, 결과물 수령 시점, 반려동물·전통의상·종교의식, 상담 언어 등)은 답을 만들어내지 말고, 아는 범위까지만 답한 뒤 상담사 연결로 안내합니다.
4. 답변에 전각 줄표(—)를 쓰지 않습니다. 연결은 가운뎃점(·)을 쓰거나 문장을 나눕니다.
5. 답변은 보통 2~5문장으로 간결하게. 존댓말. 과장·이모지 남용 금지. 디렉터 개인 이름 등 지식에 없는 정보는 언급하지 않습니다.
6. 결혼식·서비스와 무관한 질문, 혹은 <지식>으로 답할 수 없는 질문에는 짧게 양해를 구하고 상담사 연결을 권합니다.
7. 이메일·전화번호·카카오 등 다른 연락 수단을 절대 안내하지 않습니다. "문의하셔도 됩니다" 같은 외부 채널 유도 문구를 쓰지 않습니다. 이 대화 안에서 해결하고, 해결이 어려우면 [[ESCALATE]] 토큰만 사용합니다(버튼은 시스템이 띄웁니다).
8. 마크다운을 쓰지 않습니다(**굵게**, 제목 #, 목록 - 등 금지). 일반 문장과 가운뎃점(·)만 사용합니다.
9. 다음 중 하나라도 해당하면 답변 맨 끝에 정확히 [[ESCALATE]] 토큰을 한 번 덧붙입니다(사용자에게는 보이지 않게 시스템이 처리합니다): (a) 지식 밖이라 정확히 답하지 못함, (b) 19번 미정 항목, (c) 개인 일정·계약·결제 등 사람이 확인해야 하는 요청, (d) 사용자가 사람 상담을 원함.

<지식>
${KNOWLEDGE}
</지식>`;

// 예약(상담 신청) 페이지 전용 영업 톤 — 사실은 <지식>만, 표현은 영업 담당으로 (2026-06-11 사장 지시)
const SALES_ADDENDUM = `

[예약 페이지 추가 역할 · 영업 담당]
당신은 지금 상담 예약(신청) 페이지에서 답하고 있습니다. 위 규칙을 모두 지키면서, 다음을 더합니다.
- 질문에 정확히 답한 뒤, 자연스러울 때 그 답을 두 분의 결혼식 장면으로 잇는 감성 한 줄을 곁들입니다(주관적 표현은 자유). 예: "140분 동안은 두 분과 가족의 표정만 남아요."
- 대화 흐름상 어울리면 마무리에 "이 페이지에서 바로 상담을 신청하실 수 있어요" 정도로 부드럽게 다음 걸음을 권합니다. 매 답변 반복하거나 압박하는 어투는 금지.
- 사실이 아닌 주장(없는 예약·문의·수치·후기)은 절대 만들지 않습니다. 사실은 <지식>의 내용만.`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Allow', 'POST');
    return res.end(JSON.stringify({ error: 'method_not_allowed' }));
  }

  if (!rateGate(req, 8, 100)) {   // 비용 가드 — 같은 IP 분당 8회·6시간 100회 초과 시 차단(프론트는 상담 연결로 폴백)
    res.statusCode = 429;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'rate_limited', escalate: true }));
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // 진단: 런타임에 ANTHROPIC/API 관련 env 키 이름이 보이는지(값은 로깅 안 함)
    try {
      console.error('advisor_unconfigured', JSON.stringify({
        present: 'ANTHROPIC_API_KEY' in process.env,
        empty: process.env.ANTHROPIC_API_KEY === '',
        keys: Object.keys(process.env).filter(function (k) { return /ANTHROP|API_KEY/i.test(k); }),
      }));
    } catch (e) {}
    // 키 미설정: 프론트가 1단 즉답·상담연결로 우아하게 폴백하도록 신호
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'advisor_unconfigured', escalate: true }));
  }

  try {
    const body = await readJson(req);
    let history = Array.isArray(body && body.messages) ? body.messages : [];

    // 정규화·길이 가드: role/text만 남기고, 비정상 입력 차단
    history = history
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-MAX_HISTORY)
      .map((m) => ({
        role: m.role,
        content: m.content.slice(0, MAX_MSG_LEN).trim(),
      }))
      .filter((m) => m.content.length > 0);

    // 모델 규칙: 첫 메시지는 user여야 함 — slice로 잘린 히스토리가 assistant로 시작하면 앞을 버린다
    while (history.length > 0 && history[0].role !== 'user') history.shift();

    if (history.length === 0 || history[history.length - 1].role !== 'user') {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ error: 'empty_message' }));
    }

    // 페이지별 톤: 예약 페이지는 영업 담당 애드온(프롬프트 두 변형 모두 안정적이라 각각 캐싱됨)
    const page = String((body && body.page) || '').slice(0, 10);
    const systemText = page === '예약' ? SYSTEM_PROMPT + SALES_ADDENDUM : SYSTEM_PROMPT;

    const anthRes = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        // 안정적인 KB는 캐싱해 비용 절감(반복 요청 시 ~90%)
        system: [{ type: 'text', text: systemText, cache_control: { type: 'ephemeral' } }],
        messages: history,
      }),
    });

    if (!anthRes.ok) {
      const detail = await safeText(anthRes);
      console.error('anthropic_error', anthRes.status, detail.slice(0, 300));
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ error: 'upstream_error', escalate: true }));
    }

    const data = await anthRes.json();
    let text = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    // 안전망: 전각 줄표 → 가운뎃점, 마크다운 굵게(**) 제거, 이메일 안내 문장 제거(외부 채널 유도 금지)
    text = text.replace(/—/g, '·').replace(/\*\*/g, '');
    if (/contact@momentedit\.kr/i.test(text)) {
      text = text.split(/\n+/).filter(function (line) { return !/contact@momentedit\.kr/i.test(line); }).join('\n').trim();
    }

    let escalate = false;
    if (text.includes('[[ESCALATE]]')) {
      escalate = true;
      text = text.replace(/\[\[ESCALATE\]\]/g, '').trim();
    }
    if (!text) {
      text = '죄송합니다. 정확한 안내를 위해 상담사 연결을 도와드릴게요.';
      escalate = true;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(JSON.stringify({ reply: text, escalate }));
  } catch (err) {
    console.error('advisor_exception', err && err.message);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'server_error', escalate: true }));
  }
};

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > 20000) { req.destroy(); reject(new Error('payload_too_large')); } // 과대 payload 차단 — reject로 즉시 종료(타임아웃 대기 방지)
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

async function safeText(r) {
  try {
    return await r.text();
  } catch (e) {
    return '';
  }
}
