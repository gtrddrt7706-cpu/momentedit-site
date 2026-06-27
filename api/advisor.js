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

// 모델: 고객 상담 접점은 Sonnet 4.6. 실시간 채팅이라 thinking 비활성 + effort low.
//   (마이페이지는 실시간 상태 그라운딩을 붙인 뒤 Opus 재격상 검토 · 그래서 상수·분기는 남겨둠)
const MODEL_PUBLIC = 'claude-sonnet-4-6';
const MODEL_MYPAGE = 'claude-sonnet-4-6';   // 마이페이지(계약 고객): 현재 Sonnet. 그라운딩 후 Opus 재격상 시 이 값만 교체
const API_URL = 'https://api.anthropic.com/v1/messages';

// 어뷰징·비용 가드
const MAX_MSG_LEN = 600;        // 사용자 1발 입력 길이 상한
const MAX_HISTORY = 12;         // 누적 대화 턴 상한
const MAX_TOKENS = 700;         // 응답 토큰 상한
const MAX_STATE_LEN = 1800;     // 마이페이지 그라운딩 상태 요약 길이 상한

const KNOWLEDGE = require('./_kb');
const rateGate = require('./_ratelimit');

const SYSTEM_PROMPT = `당신은 웨딩 브랜드 "모먼트에디트"의 AI 상담 도우미입니다. 예비 부부의 질문에 따뜻하고 단정하게 답합니다.

[엄격한 규칙]
1. 아래 <지식> 안의 사실, 그리고 그 사실들에서 상식적으로 도출되는 결론까지 적극적으로 답합니다(예: 날짜·금액 계산 방식, 정책의 당연한 귀결, 두 사실을 합친 안내). 다만 <지식>에 없는 새로운 수치·날짜·고유명사·약속은 절대 지어내지 않습니다. (추론은 허용, 날조는 금지)
2. 가격·예약금·계약금·잔금·환불·시착·날짜·포함내역 등 구체적 수치나 정책은 <지식>에 있는 값만 인용합니다. 확실하지 않으면 추측하지 말고 상담사 연결을 안내합니다.
3. "19. 아직 개별 안내 전" 항목에 해당하는 질문(정확한 주소, 결과물 수령 시점, 반려동물·전통의상·종교의식, 상담 언어 등)은 답을 만들어내지 말고, 아는 범위까지만 답한 뒤 상담사 연결로 안내합니다.
4. 답변에 전각 줄표(—)를 쓰지 않습니다. 연결은 가운뎃점(·)을 쓰거나 문장을 나눕니다.
5. 답변은 보통 2~5문장으로 간결하게. 존댓말. 과장·이모지 남용 금지. 디렉터 개인 이름 등 지식에 없는 정보는 언급하지 않습니다.
6. 결혼식·서비스와 무관한 질문, 혹은 <지식>으로 답할 수 없는 질문에는 짧게 양해를 구하고 상담사 연결을 권합니다.
7. 이메일·전화번호·카카오 등 다른 연락 수단을 절대 안내하지 않습니다. "문의하셔도 됩니다" 같은 외부 채널 유도 문구를 쓰지 않습니다. 이 대화 안에서 해결하고, 해결이 어려우면 [[ESCALATE]] 토큰만 사용합니다(버튼은 시스템이 띄웁니다).
8. 마크다운을 쓰지 않습니다(**굵게**, 제목 #, 목록 - 등 금지). 일반 문장과 가운뎃점(·)만 사용합니다.
9. 에스컬레이션(상담사 연결)은 최후의 수단입니다. 기본적인 질문(서비스 개념·정책의 의미·날짜나 금액의 계산 방식·포함 내역 등)은 <지식>과 그 추론으로 끝까지 답하고 토큰을 붙이지 않습니다. 목표는 대부분의 문의를 이 대화 안에서 해결하는 것입니다. 다음의 경우에만 답변 맨 끝에 정확히 [[ESCALATE]] 토큰을 한 번 덧붙입니다(사용자에게는 안 보이게 시스템이 처리): (a) <지식>으로도 그 추론으로도 도저히 답할 수 없는 '새로운 사실'을 요구함, (b) 19번 '미정' 항목(정확한 도로명 주소·결과물 수령 시점 등), (c) 지금 이 고객 개인의 일정·계약·결제·환불 금액 확정처럼 사람이 실데이터를 확인해야 하는 요청, (d) 사용자가 명시적으로 사람(디렉터) 상담을 원함. 일반 정책·계산 방식·개념 질문은 (a)에 해당하지 않으니 그냥 답합니다.

<지식>
${KNOWLEDGE}
</지식>`;

// 영업 한 줄 — 마이페이지(이미 계약한 고객) 외 모든 페이지에 가볍게 적용 (2026-06-11 사장 지시)
// 핵심: 과하지 않게, 답변당 한 문장만, 본질 강점에서, 사실 왜곡 없이.
const SALES_CORE = `

[영업 한 줄 · 과하지 않게 · 심리학적으로]
10. 당신은 안내원이자 이 브랜드의 영업 담당입니다. 질문에 정확히 답한 뒤, 자연스러울 때만 마음을 흔드는 한 문장을 더합니다. 답변당 최대 하나, 어울리지 않으면 생략합니다. 같은 멘트를 반복하지 않습니다.
11. 그 한 문장은 <지식> 21번의 브랜드 본질 강점에서 꺼냅니다(추가금 없는 단일 정찰가 · 원본 전량 제공 · 한 타임 한 팀의 프라이빗함 · 가족 25명의 가까운 표정 · 140분의 또렷한 호흡 · 한 명의 디렉터). 압박·과장 어투 금지.
12. 고객이 불안(추가금·원본·위약금·가족만 예식 등)을 내비치면, <지식> 20번의 업계 일반 통계를 "안심 근거"로 한 답변에 하나만, 업계 자료임을 전제로 가볍게 인용할 수 있습니다. 숫자를 나열하지 않습니다. 사실이 아닌 주장(없는 후기·예약·할인)은 절대 만들지 않습니다.`;

// 예약(상담 신청) 페이지 보강 — 위 영업 한 줄에 더해, 흐름이 무르익으면 가끔 상담 신청을 권유
const SALES_BOOKING = `

[예약 페이지 보강 · 행동 유도]
지금은 상담 예약(신청) 페이지입니다. 대화 흐름이 자연스러울 때만 가끔 마무리에 "이 페이지에서 바로 상담을 신청하실 수 있어요" 정도로 다음 걸음을 권합니다. 매 답변 반복·압박 금지.`;

// 마이페이지 그라운딩 — 로그인 고객의 실시간 상태(단계·결제·예식일 등)를 받았을 때만 시스템 프롬프트에 더한다(개인 질문 즉답 · 환각 0).
const MYPAGE_STATE_RULE = `

[개인 상황 응대 · 마이페이지]
10. 아래 시스템 메시지의 [이 고객의 현재 상황 · 실제 데이터]는 지금 로그인한 이 고객의 진짜 데이터입니다. 고객이 '제/내/우리'처럼 본인의 상황(현재 단계, 다음 할 일, 결제 상태·금액, 예식일·남은 일수)을 물으면, 그 데이터에 적힌 사실로만 정확히 답합니다. 금액·날짜·단계는 데이터의 값을 그대로 인용합니다.
11. 그 데이터에 없는 개인 정보는 추측하거나 지어내지 않습니다. 데이터로 답할 수 없는 개인 요청은 아는 일반 정책만 짧게 안내한 뒤 답변 끝에 [[ESCALATE]]로 디렉터 연결을 안내합니다. 가격·환불 규정 등 일반 질문은 <지식>을 사용합니다.`;

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

    // 페이지별 톤: 마이페이지(계약 고객)는 중립, 그 외(메인홈·예약)는 영업 한 줄, 예약은 행동 유도까지
    const page = String((body && body.page) || '').slice(0, 10);
    // 마이페이지 그라운딩: 로그인 고객의 실시간 상태 요약(단계·결제·예식일 등)을 받으면 개인 질문에 실데이터로 즉답한다.
    const state = (body && typeof body.state === 'string') ? body.state.slice(0, MAX_STATE_LEN).trim() : '';
    const grounded = (page === '마이') && state.length > 0;

    let systemText = SYSTEM_PROMPT;
    if (page !== '마이') systemText += SALES_CORE;
    if (page === '예약') systemText += SALES_BOOKING;
    if (grounded) systemText += MYPAGE_STATE_RULE;   // 규칙은 매 요청 동일 → 캐시 블록에 포함

    // 캐싱: 안정적인 KB·규칙만 캐시(반복 요청 시 ~90% 절감). 고객별 상태는 매번 달라지므로
    //   별도 블록(비캐시)으로 분리 — 캐시 무효화·고객 간 교차오염을 막는다(prefix 캐시 규칙).
    const sysBlocks = [{ type: 'text', text: systemText, cache_control: { type: 'ephemeral' } }];
    if (grounded) sysBlocks.push({ type: 'text', text: '[이 고객의 현재 상황 · 실제 데이터]\n' + state });
    // 운영자 보충지식(교육) — 핵심 KB 뒤에 별도 블록(비캐시)으로. 핵심 정책은 못 덮음.
    try { const kbNotes = await require('./_kbnotes')(page || '메인'); if (kbNotes) sysBlocks.push({ type: 'text', text: '[운영자 보충지식 — 아래 내용은 참고용. 가격·계약·환불 등 핵심 정책과 충돌하면 위 핵심을 우선한다]\n' + kbNotes }); } catch (e) {}

    const reqBody = {
      model: (page === '마이') ? MODEL_MYPAGE : MODEL_PUBLIC,   // 현재 둘 다 Sonnet 4.6 (마이는 그라운딩 후 Opus 재격상 대비 분기 유지)
      max_tokens: MAX_TOKENS,
      thinking: { type: 'disabled' },     // 실시간 채팅 → 사고 단계 없이 즉답
      output_config: { effort: 'low' },   // 낮은 effort로 빠르고 저렴하게(품질은 모델 자체로 확보)
      system: sysBlocks,
      messages: history,
    };
    const anthRes = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(reqBody),
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

    // 안전망: 전각 줄표 → 가운뎃점, 마크다운 굵게(**)·머리표(#) 제거, 목록 머리기호(- · *)는 가운뎃점으로
    text = text.replace(/—/g, '·').replace(/\*\*/g, '');
    text = text.replace(/^[ \t]*#{1,6}[ \t]+/gm, '');            // 마크다운 제목 #
    text = text.replace(/^[ \t]*[-*][ \t]+/gm, '· ');            // 목록 머리기호 - * → ·
    // 요일 표기 정합 — "YYYY년 M월 D일 X요일"의 X가 실제 요일과 다르면 교정(고객이 잘못 말한 요일을
    //   답변이 그대로 따라 적는 사고 방지 · 2026-06-13 E11 실사례: 2027-10-10은 일요일인데 "토요일" 복창)
    text = text.replace(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일((?:\s|[은는이가도,]|\()*)([월화수목금토일])요일/g, function (all, y, mo, da, gap, w) {
      const d = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(da)));
      if (d.getUTCFullYear() !== Number(y) || d.getUTCMonth() !== Number(mo) - 1) return all;   // 무효 날짜는 손대지 않음
      const real = ['일', '월', '화', '수', '목', '금', '토'][d.getUTCDay()];
      return (w === real) ? all : (y + '년 ' + Number(mo) + '월 ' + Number(da) + '일' + gap + real + '요일');
    });
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

    if (!(body && body.test)) {
      try { await require('./_costlog')(page === '마이' ? '마이페이지' : '메인', reqBody.model, data.usage); } catch (e) {}
      try { await require('./_qlog')(page === '마이' ? '마이' : '메인', history[history.length - 1].content, { escalate, reply: text }); } catch (e) {}
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
