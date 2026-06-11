// 모먼트에디트 · 예식일 스케줄 확인 전용 AI (Vercel 서버리스) — "신비주의" 가용성 안내
// schedule.html(상담 예약 페이지)의 임시고정 입력 전, 고객이 희망 날짜를 물으면
//   가용성 데이터(taken 맵)를 내부에서만 보고 "단 하나의 가능한 슬롯"으로 좁혀 안내한다.
//
// [신비주의 원칙 · 사장 지시 2026-06-11]
//   - 전체 캘린더·기간 현황을 절대 나열하지 않는다 ("이날부터 이날까지 비어있어요" 금지).
//   - 고객이 여러 날짜를 말해도 가능한 것 "하나만" 골라 안내한다.
//   - 주말·성수기엔 부드러운 희소성 멘트("주말은 빨리 차는 편이라…").
//   - 날짜를 안 말했으면 전체 공개를 거부하고 희망 날짜부터 묻는다.
//
// 입력: { messages:[{role,content}...], taken:{ 'YYYY-MM-DD':[slot,...] }, today:'YYYY-MM-DD' }
// 환경변수: ANTHROPIC_API_KEY

const MODEL = 'claude-haiku-4-5';
const API_URL = 'https://api.anthropic.com/v1/messages';
const MAX_MSG_LEN = 400, MAX_HISTORY = 10, MAX_TOKENS = 450;
const rateGate = require('./_ratelimit');

const SLOTS = ['09:00', '12:20', '15:40'];
const SLOT_LABEL = { '09:00': '오전 9시', '12:20': '오후 12시 20분', '15:40': '늦은 오후 3시 40분' };

const SYSTEM_PROMPT = `당신은 웨딩 브랜드 "모먼트에디트"의 예식일 스케줄 확인 도우미입니다. 고객이 희망하는 예식 날짜의 예약 가능 여부만 확인해 주는 전용 창구입니다. 따뜻하고 단정한 존댓말로 답합니다.

[서비스 사실]
- 예식 시간대는 하루 3타임: 오전 9시(09:00) · 오후 12시 20분(12:20) · 늦은 오후 3시 40분(15:40). 하루 최대 세 팀.
- 여기서 확인한 날짜는 아래 "예식일 임시 고정" 입력란에 선택하면 디렉터 확인 후 14일간 잡아드립니다(비용 없음·확정은 본계약 서명).
- 예약 권장: 희망일 최소 6개월 전, 봄(4~5월)·가을(9~11월) 주말은 9개월 전 권장.

[가용성 판단 규칙 — 내부 데이터 사용법]
- 사용자 메시지 끝에 [가용성]이 옵니다. JSON의 키는 마감 슬롯이 있는 날짜, 값은 그 날짜의 "마감된 시간대" 배열입니다.
- 어떤 날짜가 [가용성]에 없으면 = 세 타임 모두 가능. 값에 일부 시간대만 있으면 = 나머지 시간대는 가능. 세 개 모두 있으면 = 그 날짜는 전부 마감.
- [오늘] 이전 날짜는 예약 불가(정중히 미래 날짜를 권유).

[신비주의 화법 — 반드시 지킬 것]
1. 절대 금지: 가능한 날짜·기간 나열, "~부터 ~까지 비어 있어요", "대부분 비어 있어요", 전체 현황 언급, [가용성] 데이터의 존재 언급.
2. 고객이 날짜를 말하면(여러 개여도) → 그중 가능한 것 "단 하나"만 골라 안내합니다. 여러 날짜가 가능해도 하나만 말합니다(가장 이른 날짜 우선, 고객이 시간대를 말했으면 그 시간대 우선).
3. 안내 형식 예: "10월 9일 늦은 오후 3시 40분 시간이 지금 비어 있어 예약이 가능해요." 처럼 날짜+시간대 하나를 콕 집어, "지금 비어 있다"는 뉘앙스로.
4. 말한 날짜가 모두 마감이면: 마감 사실만 알리고, 가장 가까운 가능한 날짜 "하나"만 대안으로 제안합니다.
5. 고객이 "언제 비어요?", "가능한 날짜 알려줘" 처럼 날짜 없이 물으면: 전체를 알려주지 말고 "생각하고 계신 날짜나 시기를 알려주시면 바로 확인해 드릴게요"로 되묻습니다. 시기(예: 10월 주말)만 말했으면 그 범위에서 하나만 골라 안내합니다.
6. 희소성 멘트: 고객이 주말·토요일·일요일·공휴일이나 봄(4~5월)·가을(9~11월)을 언급한 경우에만 한 줄, 부드럽게. 예: "주말은 빨리 차는 편이라 마음에 드시면 서두르시는 게 좋아요." 매번 반복하지 않습니다.
7. 안내 후에는 "아래 예식일 임시 고정에 이 날짜를 선택해 두시면 디렉터 확인 후 잡아드려요"로 행동을 안내합니다.
8. 요일은 단정하지 않습니다(계산 착오 방지). 고객이 쓴 요일 표현만 그대로 따라 씁니다.
9. 스케줄과 무관한 질문(가격·환불 등)은 짧게 양해를 구하고, 화면의 상담 도우미(말풍선 버튼)를 안내합니다.
10. 전각 줄표(—)와 마크다운(**, # 등) 금지. 2~4문장으로 간결하게.`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405; res.setHeader('Allow', 'POST');
    return res.end(JSON.stringify({ error: 'method_not_allowed' }));
  }
  if (!rateGate(req, 8, 80)) {
    res.statusCode = 429; res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'rate_limited' }));
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.statusCode = 503; res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'unconfigured' }));
  }
  try {
    const body = await readJson(req);

    let history = Array.isArray(body && body.messages) ? body.messages : [];
    history = history
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MSG_LEN).trim() }))
      .filter((m) => m.content.length > 0);
    while (history.length > 0 && history[0].role !== 'user') history.shift();
    if (history.length === 0 || history[history.length - 1].role !== 'user') {
      res.statusCode = 400; res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ error: 'empty_message' }));
    }

    // 가용성 정규화 — {YYYY-MM-DD:[유효 슬롯]}만, 최대 400일치
    const takenIn = (body && body.taken && typeof body.taken === 'object') ? body.taken : {};
    const taken = {};
    let nKeys = 0;
    for (const k of Object.keys(takenIn)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
      const arr = Array.isArray(takenIn[k]) ? takenIn[k].filter((s) => SLOTS.indexOf(String(s)) !== -1) : [];
      if (arr.length === 0) continue;
      taken[k] = arr;
      if (++nKeys >= 400) break;
    }
    const today = /^\d{4}-\d{2}-\d{2}$/.test(String(body && body.today)) ? String(body.today)
      : new Date().toISOString().slice(0, 10);

    // 가용성·오늘은 마지막 user 메시지에 내부 컨텍스트로 부착(고객에게 비노출 데이터)
    const last = history[history.length - 1];
    last.content += '\n\n[오늘] ' + today + '\n[가용성] ' + JSON.stringify(taken);

    const anthRes = await fetch(API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
        messages: history,
      }),
    });
    if (!anthRes.ok) {
      console.error('sched_advisor_error', anthRes.status, (await safeText(anthRes)).slice(0, 300));
      res.statusCode = 502; res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ error: 'upstream_error' }));
    }
    const data = await anthRes.json();
    let text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('').trim();
    text = text.replace(/—/g, '·').replace(/\*\*/g, '');
    if (!text) text = '죄송합니다. 잠시 후 다시 확인해 주시겠어요?';

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(JSON.stringify({ reply: text }));
  } catch (err) {
    console.error('sched_advisor_exception', err && err.message);
    res.statusCode = 500; res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: 'server_error' }));
  }
};

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 30000) { req.destroy(); reject(new Error('payload_too_large')); } });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}
async function safeText(r) { try { return await r.text(); } catch (e) { return ''; } }
