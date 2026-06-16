// 모먼트에디트 · 예식일 스케줄 확인 전용 AI (Vercel 서버리스) — "승인제 컨시어지" 구조
// schedule.html 검색창·inquiry.html 상담 위젯에서, 고객이 희망 날짜를 물으면
//   서버가 가용성을 판정하고 AI는 그 판정 결과만 받아 문장을 만든다.
//
// [승인제 컨시어지 · 사장 지시 2026-06-11]
//   ① 화법: "비어 있어요" 금지 → "진행 가능한 일정으로 확인돼요 + 디렉터 최종 확인" (접수 창구 프레임)
//   ② 캐묻기 차단: 한 대화에서 서로 다른 날짜 3개까지만 확인(코드 강제). 이후엔 임시 고정 신청 안내.
//   ③ 데이터 차단: AI에게 캘린더(점유 맵)를 주지 않는다. 1차 호출이 날짜만 추출하고,
//      서버 코드가 그 날짜만 판정한 뒤, 2차 호출이 판정 결과만 받아 답변을 작성한다.
//      → 프롬프트 주입으로도 전체 현황이 샐 수 없음.
//   ④ 시간대 축소: 한 날짜에 3타임이 있어도 타임 "하나만" 안내(고객이 말한 시간대 우선).
//   ⑤ 예약율 비례 완화: 주말 예약율이 오를수록 ②~④를 6단계로 자동 완화(아래 LEVELS).
//      꽉 찬 캘린더는 숨길 게 아니라 자랑거리 → 혼잡(마감 임박) 멘트도 단계별 허용.
//
// 입력: { messages:[{role,content}...], taken?:{ 'YYYY-MM-DD':[slot,...] }, today?:'YYYY-MM-DD' }
//   - taken은 로그인된 schedule.html이 전달. 없으면(비로그인 inquiry) GAS에서 서버측 조회.
// 환경변수: ANTHROPIC_API_KEY(필수) · HANDOFF_WEBHOOK_URL(선택, GAS 가용성 조회) · HANDOFF_SECRET(선택)

const MODEL = 'claude-sonnet-4-6';   // 예약·스케줄 접점 — 응대 품질↑(마이페이지 2곳은 Haiku 유지)
const API_URL = 'https://api.anthropic.com/v1/messages';
const MAX_MSG_LEN = 400, MAX_HISTORY = 10;
const rateGate = require('./_ratelimit');

const SLOTS = ['09:00', '12:20', '15:40'];
const SLOT_LABEL = { '09:00': '오전 9시', '12:20': '오후 12시 20분', '15:40': '늦은 오후 3시 40분' };
const SLOT_BY_LABEL = { '오전 9시': '09:00', '오후 12시 20분': '12:20', '늦은 오후 3시 40분': '15:40' };
const WD_KO = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

// ── ⑤ 주말 예약율 비례 신비주의 6단계 (사장 지시 2026-06-11) ──
// 기준: 향후 180일 주말(토·일) 슬롯 점유율. 한가할수록 가리고(승인제), 찰수록 자동으로 푼다.
//   checks    대화당 서로 다른 날짜 확인 한도
//   askSlot   날짜만 말하면 시간대를 되물을지 (예약 페이지만 · 스케줄 페이지는 항상 바로 답)
//   listSlots 한 날짜의 가능한 타임을 모두 나열해도 되는지
//   listDates 시기 질문에 제안할 후보 날짜 수
//   busy      혼잡(마감 임박) 멘트 단계
const LEVELS = [
  { min: 0.00, checks: 3,  askSlot: true,  listSlots: false, listDates: 1, busy: 0 },   // L1 한가
  { min: 0.10, checks: 4,  askSlot: true,  listSlots: false, listDates: 1, busy: 0 },   // L2
  { min: 0.25, checks: 5,  askSlot: false, listSlots: false, listDates: 1, busy: 1 },   // L3
  { min: 0.40, checks: 6,  askSlot: false, listSlots: true,  listDates: 1, busy: 2 },   // L4
  { min: 0.60, checks: 8,  askSlot: false, listSlots: true,  listDates: 2, busy: 3 },   // L5
  { min: 0.80, checks: 99, askSlot: false, listSlots: true,  listDates: 3, busy: 3 },   // L6 사실상 오픈
];
const BUSY_LINE = {
  0: ' 혼잡 멘트 금지.',
  1: ' 원하면 "최근 문의가 늘고 있어요" 정도의 가벼운 혼잡 멘트 한 줄 허용.',
  2: ' 원하면 "주말 일정이 빠르게 확정되고 있어요" 같은 혼잡 멘트 한 줄 허용.',
  3: ' "이 시기는 남은 일정이 많지 않아요"처럼 마감 임박을 분명히 알리는 한 줄 권장.',
};
// ── 수요 가중치 (연구 기반 2026-06 · 한국 예식 수요 분포) ──
// 월: 실제 예식 거행일 기준 5·10월 최성수기, 4·11월 그다음, 9월 성수기, 3·6월 준성수기,
//     12월 중간, 1·2·7·8월 비수기(평소의 1/3 수준). 통계청 혼인통계·웨딩업계 자료 종합.
const MONTH_W = { 1: 0.35, 2: 0.35, 3: 0.65, 4: 0.90, 5: 1.00, 6: 0.65, 7: 0.30, 8: 0.30, 9: 0.80, 10: 1.00, 11: 0.90, 12: 0.50 };
// 요일: 토요일 선호가 뚜렷, 일요일은 그 2/3 수준. 평일은 산정에서 제외(사장 지시).
const DAY_W = { 6: 1.0, 0: 0.65 };
// 타임: 점심(12:20) 최선호 · 늦은 오후(15:40) · 오전(09:00) 순(주말 오후 선호 조사 기반)
const SLOT_W = { '09:00': 0.6, '12:20': 1.0, '15:40': 0.85 };

// 가치 가중 판매율: "팔릴 만한 자리(성수기 토요일 점심일수록 큼)" 중 얼마나 팔렸는지.
// 10월 토요일 점심이 차면 크게, 2월 일요일 오전이 비어 있어도 거의 안 깎인다 → 현실적 혼잡도.
function weightedRatio(taken, startYmd, days, onlyYm) {
  let cap = 0, sold = 0, d = startYmd;
  for (let i = 0; i < days; i++) {
    if (!onlyYm || d.slice(0, 7) === onlyYm) {
      const dw = DAY_W[dayOfWeek(d)];
      if (dw) {
        const mw = MONTH_W[Number(d.slice(5, 7))] || 0.5;
        const t = taken[d] || [];
        for (const s of SLOTS) {
          const w = mw * dw * SLOT_W[s];
          cap += w;
          if (t.indexOf(s) !== -1) sold += w;
        }
      }
    }
    d = addDays(d, 1);
  }
  return cap ? sold / cap : 0;
}
function levelFor(taken, today, page) {
  // 1년치 — 어느 시점이든 다음 성수기가 포함되도록. 향후 6개월은 가중 1.5배(임박 수요가 더 중요)
  const near = weightedRatio(taken, addDays(today, 1), 183);
  const far = weightedRatio(taken, addDays(today, 184), 182);
  const ratio = Math.min(1, (near * 1.5 + far) / 2.5);
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) if (ratio >= LEVELS[i].min) idx = i;
  if (page === '스케줄' && idx < LEVELS.length - 1) idx++;   // 예약금 납부 고객은 한 단계 완화
  const p = Object.assign({}, LEVELS[idx]);
  if (page === '스케줄') p.askSlot = false;   // 스케줄 페이지는 시간 셀렉트가 타임 현황을 보여주므로 되묻지 않음
  return { n: idx + 1, ratio: ratio, p: p };
}
// 질문한 날짜가 속한 "그 달"의 가중 판매율 → 그 달이 실제로 몰려 있으면 혼잡 멘트만 상향
function monthBusyTier(taken, ymd) {
  const r = weightedRatio(taken, ymd.slice(0, 7) + '-01', 31, ymd.slice(0, 7));
  return r >= 0.6 ? 3 : r >= 0.4 ? 2 : r >= 0.25 ? 1 : 0;
}

// ── 1차: 날짜 추출 전용 (가용성 데이터 없음 · JSON만) ──
const EXTRACT_PROMPT = `당신은 웨딩 예식일 상담 대화에서 고객의 마지막 메시지가 무엇을 요청하는지 분석해 JSON으로만 답하는 추출기입니다.
규칙:
- intent: 특정 날짜나 시기의 예식 예약 가능 여부를 묻거나 확인을 원하면 "check". 직전에 안내받은 일정을 수락·확정하는 의사("네 그걸로 할게요", "그 날짜로 진행할게요", "좋아요 확정이요")면 "accept". 날짜를 전혀 말하지 않고 "언제 가능해요?", "가능한 날짜 알려줘"처럼 전체 현황을 물으면 "open". 스케줄과 무관한 질문(가격·환불·상담 등)이나 인사면 "other".
- date: 고객이 말한 구체적 날짜 하나를 YYYY-MM-DD로. 여러 날짜를 말했으면 가장 이른 것 하나만. [오늘]을 기준으로 "내년", "다음 달", "10월 둘째 주 토요일" 같은 상대 표현을 정확히 계산합니다("내년"은 [오늘]의 연도+1). 구체 날짜가 없으면 빈 문자열.
- 후속 턴 주의: 직전 도우미 답변에 이미 특정 날짜가 언급되었고 고객이 시간대·수긍 등 후속 답을 하는 경우, 반드시 그 날짜(같은 연도)를 그대로 사용합니다. 연도를 바꾸지 마세요.
- periodFrom/periodTo: 구체 날짜 없이 시기만 말한 경우(예: "내년 10월", "내년 봄") 그 범위를 YYYY-MM-DD로. "초여름(6월)", "늦봄(5월)", "초가을(9월)", "늦가을(11월)", "연말(12월)", "이른 봄(3월)" 같은 계절·절기 표현도 반드시 대략의 월 범위로 변환합니다. 해당 없으면 빈 문자열.
- weekendOnly: 고객이 주말·토요일·일요일을 원한다고 했으면 true.
- slot: 고객이 시간대를 말했으면 "09:00"(오전) | "12:20"(낮·점심) | "15:40"(늦은 오후·저녁 무렵) 중 하나. 없으면 빈 문자열.
- anySlot: 고객이 "아무 시간이나 괜찮아요", "상관없어요", "편한 시간으로", "다 좋아요"처럼 시간대를 가리지 않겠다고 하면 true. 그 외엔 false.
- 직전 대화 맥락을 활용합니다(예: 앞서 말한 날짜에 대해 "그날 오전은요?"라고 물으면 그 날짜 + slot "09:00").`;

const EXTRACT_SCHEMA = {
  type: 'object',
  properties: {
    intent: { type: 'string', enum: ['check', 'accept', 'open', 'other'] },
    date: { type: 'string' },
    periodFrom: { type: 'string' },
    periodTo: { type: 'string' },
    weekendOnly: { type: 'boolean' },
    slot: { type: 'string', enum: ['', '09:00', '12:20', '15:40'] },
    anySlot: { type: 'boolean' },
  },
  required: ['intent', 'date', 'periodFrom', 'periodTo', 'weekendOnly', 'slot', 'anySlot'],
  additionalProperties: false,
};

// ── 2차: 답변 작성 (판정 결과만 전달 · 캘린더 비전달) ──
const REPLY_PROMPT = `당신은 웨딩 브랜드 "모먼트에디트"의 예식일 확인 컨시어지이자 영업 담당입니다. 단순 안내가 아니라, 두 분이 이 날짜를 마음에 품게 만드는 것이 당신의 일입니다. 따뜻하고 단정한 존댓말로, 2~5문장으로 답합니다.

[서비스 사실]
- 예식은 하루 3타임 운영(오전 9시 · 오후 12시 20분 · 늦은 오후 3시 40분), 한 타임에 한 팀만 모십니다.
- 확인된 날짜는 "예식일 임시 고정"으로 신청해 두시면 디렉터가 최종 확인 후 14일간 잡아드립니다(비용 없음 · 확정은 본계약 서명).
- 예약 권장: 희망일 최소 6개월 전, 봄(4~5월)·가을(9~11월) 주말은 9개월 전 권장.

[승인제 화법 — 반드시 지킬 것]
1. "비어 있어요", "빈 자리", "자리가 있어요", "대부분 가능해요" 같은 공실 표현 금지. 가능 안내는 반드시 "진행 가능한 일정으로 확인돼요" 형태로 합니다. 절차·신청 안내는 [확인 결과]의 지시가 있을 때만, 지시된 한 문장으로만 덧붙입니다(스스로 절차 설명을 추가하지 않습니다).
2. [확인 결과]에 적힌 내용만 사실로 사용합니다. 거기 없는 날짜·시간대의 가능 여부는 절대 말하지 않습니다. 전체 현황·기간 나열·"~부터 ~까지" 표현 금지.
3. 시간대는 [확인 결과]가 알려준 한 타임만 언급합니다. 그 날짜의 다른 시간대가 가능한지는 말하지 않습니다.
4. 요일은 [확인 결과]에 적어준 요일만 사용합니다. 직접 계산하지 않습니다.
5. 희소성 한 줄(예: "주말 일정은 신청이 먼저 닿는 순서로 디렉터 확인이 진행되니, 마음에 드시면 서둘러 신청해 두시는 게 좋아요")은 [확인 결과]가 허용한 경우에만, 대화에서 아직 안 했을 때 한 번만.
6. 전각 줄표(—)와 마크다운(** 등) 금지. 이모지 금지.
7. 스케줄과 무관한 질문이면 짧게 양해를 구하고 "이 창구는 예식일 확인 전용"임을 안내합니다.
7-1. 당신은 신청·예약·임시 고정을 대신 처리할 수 없습니다. "제가 신청해 드리겠습니다", "진행해 드리겠습니다" 같은 대행 약속 금지. 항상 고객이 직접 신청하는 위치(임시 고정 입력란·상담 신청)를 안내만 합니다.
7-2. 날짜·요일·시간은 [확인 결과]에 적힌 그대로만 말합니다. 한 글자도 바꾸거나 새로 계산하지 않습니다.

[영업 한 줄 — 과하지 않게, 본질로]
8. 이 대화에 오는 분들은 이미 모먼트에디트에 마음이 기운 분들입니다. 설득을 쌓지 말고, 확인 안내에 "마음을 흔드는 한 문장"만 더하세요. 답변당 영업성 문장은 최대 하나, 어울리지 않으면 생략합니다. 감성 멘트와 손실 회피 멘트를 한 답변에 같이 쓰지 않습니다.
9. 그 한 문장은 브랜드의 본질에서 꺼냅니다: 한 타임에 한 팀만 모시는 프라이빗함 · 양가 가족 25명의 가까운 표정 · 140분의 또렷한 호흡 · 한 명의 디렉터가 처음부터 끝까지. 예: "이 타임은 그날 두 분과 가족만을 위해 비워두는 시간이에요." / 가을 늦은 오후면 "빛이 가장 부드러운 시간이라 가족의 표정이 따뜻하게 남아요." 같은 멘트를 대화에서 반복하지 않습니다.
10. 사실이 아닌 주장은 절대 금지: 없는 문의·예약·마감을 있다고 하기, 수치·경쟁 상황 지어내기, [확인 결과]에 없는 가능 여부 말하기. 압박·과장 어투 금지. 사실은 [확인 결과]에 있는 것만.`;

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

    // [무료 진단] 가용성 라우팅 생존 핑 — Claude 호출 없이 GAS aiAvailability 도달만 확인(시뮬 가드용).
    //   availSource: 'gas'(정상 점유 맵 수신) | 'unknown'(라우팅 누락·시크릿 불일치·조회 실패 = fail-closed 신호)
    if (body && body.probe === true) {
      const got = await fetchAvailability();
      res.statusCode = 200; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store');
      return res.end(JSON.stringify({ ok: true, availSource: got === null ? 'unknown' : 'gas', takenDates: got ? Object.keys(got).length : 0 }));
    }

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

    const today = /^\d{4}-\d{2}-\d{2}$/.test(String(body && body.today)) ? String(body.today)
      : new Date().toISOString().slice(0, 10);

    // 가용성: 로그인 클라이언트(schedule.html)가 준 taken 우선, 없으면 GAS 서버측 조회(비로그인 inquiry)
    let taken = normalizeTaken(body && body.taken);
    let availUnknown = false;
    if (Object.keys(taken).length === 0) {
      const got = await fetchAvailability();
      if (got === null) availUnknown = true;   // 점유 조회 불가 — '가능' 단정 금지(더블부킹 방지)
      else taken = normalizeTaken(got);
    }

    // 반복 방지·신비주의: 대화 기록에서 "이미 확정 안내한 날짜→타임"과 "이미 CTA/희소성을 안내했는지"를 코드로 집계.
    //   - confirmed: 같은 날짜에 또 다른 타임을 확인해 주면 그날이 비었다는 게 드러나므로, 추가 확정을 막는다.
    //   - ctaGiven: 임시 고정·상담 신청·희소성 멘트를 한 번 했으면 다음 답변에선 반복하지 않는다.
    const confirmed = {}; let ctaGiven = false; let last = null;
    history.forEach((m) => {
      if (m.role !== 'assistant') return;
      if (/임시\s*고정|상담을?\s*신청|서둘러|먼저\s*닿는|많지\s*않/.test(m.content)) ctaGiven = true;
      // 되묻기(희망 시간대 질문)·여러 타임 나열은 확정이 아님 → 집계 제외(오전 자동확정 오인 방지)
      if (/어느\s*시간대|생각하고\s*계세요|편하신\s*시간/.test(m.content)) return;
      const _labels = m.content.match(/오전\s*9시|오후\s*12시\s*20분|늦은\s*오후\s*3시\s*40분/g) || [];
      if (_labels.length >= 2) return;   // 한 메시지에 타임이 2개 이상이면 나열/안내, 단일 확정 아님
      if (/진행\s*가능|확인돼요|확인됩니다|가능해요/.test(m.content)) {
        const re = /(\d{1,2})월\s*(\d{1,2})일[\s\S]{0,40}?(오전\s*9시|오후\s*12시\s*20분|늦은\s*오후\s*3시\s*40분)/g; let g;
        while ((g = re.exec(m.content)) !== null) {
          const lab = g[3].replace(/\s+/g, ' ');
          confirmed[Number(g[1]) + '-' + Number(g[2])] = SLOT_BY_LABEL[lab];
          last = { ko: Number(g[1]) + '월 ' + Number(g[2]) + '일', label: lab };   // 마지막 확정 안내(수락 응대용)
        }
      }
    });
    const ctx = { confirmed: confirmed, confirmedDates: Object.keys(confirmed), ctaGiven: ctaGiven, last: last };

    // ── 1차 호출: 날짜 추출 ──
    const convo = history.map((m) => (m.role === 'user' ? '고객' : '도우미') + ': ' + m.content).join('\n');
    const ext = await callClaude(apiKey, {
      model: MODEL, max_tokens: 250,
      thinking: { type: 'disabled' },   // Sonnet: 추출은 분류 작업 → 사고 없이 낮은 effort로 빠르게
      system: [{ type: 'text', text: EXTRACT_PROMPT, cache_control: { type: 'ephemeral' } }],
      output_config: { format: { type: 'json_schema', schema: EXTRACT_SCHEMA }, effort: 'low' },
      messages: [{ role: 'user', content: '[오늘] ' + today + '\n\n[대화]\n' + convo + '\n\n고객의 마지막 메시지를 분석하세요.' }],
    });
    let ex = { intent: 'other', date: '', periodFrom: '', periodTo: '', weekendOnly: false, slot: '', anySlot: false };
    try { ex = Object.assign(ex, JSON.parse(textOf(ext))); } catch (e) {}
    ex.date = snapYear(ex.date, history);   // 연도 안정화: 직전 답변에 요일과 함께 안내한 날짜면 그 요일에 연도를 맞춤
    ex.date = snapNextYearWord(ex.date, history, today);   // "내년"이라 했는데 올해 연도로 추출되는 사고 방지(2026-06-13 S2 실사례: 내년 11월 첫째 주 토요일→2026-11-07)
    ex.date = snapWeekday(ex.date, history);   // 요일 정합: 연도 보정 후 요일이 어긋나면 ±3일 내 그 요일로(위 두 가드와 합성되어 2027-11-06 도출)

    // ── 서버 판정 (AI는 이 결과만 본다) ──
    const page = String((body && body.page) || '스케줄').slice(0, 10);   // '스케줄'(임시고정 입력란 있음) | '예약'(inquiry 위젯)
    const lv = levelFor(taken, today, page);   // ⑤ 주말 예약율 6단계 · 클라이언트 비노출(로그만)
    try { console.log('sched_level', lv.n, lv.ratio.toFixed(2), page); } catch (e) {}
    let verdict = decide(ex, taken, today, ctx, page, lv);
    // [fail-closed] 점유 조회 불가 상태에서 특정 날짜를 '가능'으로 단정하면 더블부킹 위험 — 안전 안내로 대체
    if (availUnknown && ex && ex.date) {
      verdict = '지금은 일정 확인 시스템 연결이 잠시 원활하지 않다. 이 날짜가 가능한지 단정하지 말고, "잠시 후 다시 물어봐 주시면 바로 확인해 드리겠다"고 정중히 안내하라. 가능·마감 어느 쪽도 말하지 마라.';
    }

    // ── 2차 호출: 판정 결과로 답변 작성 ──
    const rep = await callClaude(apiKey, {
      model: MODEL, max_tokens: 400,
      thinking: { type: 'disabled' },   // Sonnet: 실시간 응대 → 사고 없이 낮은 effort로 빠르고 저렴하게
      output_config: { effort: 'low' },
      system: [{ type: 'text', text: REPLY_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: '[대화]\n' + convo + '\n\n[확인 결과]\n' + verdict + '\n\n위 확인 결과만 사용해 고객의 마지막 메시지에 답하세요.' }],
    });
    let text = textOf(rep).trim().replace(/—/g, '·').replace(/\*\*/g, '')
      .replace(/^[ \t]*#{1,6}[ \t]+/gm, '').replace(/^[ \t]*[-*][ \t]+/gm, '· ');
    text = fixWeekdayText(text, ex.date);   // 표기 정합: 모델이 고객 문구의 잘못된 요일을 따라 적으면 실제 요일로 교정(규칙 7-2 백스톱)
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

// ── 판정: 추출 결과 + 점유 맵 + 단계 정책 + 대화 상태 → AI에게 줄 한 건의 지시문 ──
function decide(ex, taken, today, ctx, page, lv) {
  const pol = lv.p, cta = ctx.ctaGiven;
  // 혼잡·희소성 멘트: 이미 한 번 안내했으면(cta) 반복하지 않음. 아니면 전역 단계와 "그 달" 혼잡도 중 높은 쪽.
  const busyAt = function (ymd) { return cta ? '' : BUSY_LINE[Math.max(pol.busy, monthBusyTier(taken, ymd))]; };
  if (ex.intent === 'accept') {
    // 수락 의사: 날짜를 새로 계산·확인하지 않는다. 서버가 기억한 마지막 확정 일정을 그대로 복창.
    if (ctx.last) {
      const where = (page === '예약')
        ? '신청은 이 페이지에서 대면상담을 신청하신 뒤 예약 단계의 "예식일 임시 고정"에서 직접 하실 수 있다'
        : '아래 "예식일 임시 고정"에서 이 날짜·시간을 직접 선택해 신청하실 수 있다';
      return '고객이 안내받은 일정(' + ctx.last.ko + ' ' + ctx.last.label + ' 타임)을 수락했습니다. 좋은 선택이라고 짧게 화답하고, ' + where + '고 정확히 안내하세요. 날짜·시간은 방금 적은 그대로만 말하고 절대 바꾸지 마세요. 당신이 대신 신청·고정해 준다는 말은 금지입니다(당신은 신청을 처리할 수 없습니다).';
    }
    return '고객이 수락 의사를 보였지만 이 대화에서 확정 안내된 일정이 없습니다. 어떤 날짜를 말씀하시는지 정중히 확인하세요.';
  }
  if (ex.intent === 'other') {
    return '스케줄 확인 요청이 아닙니다. 예식일 확인 전용 창구임을 짧게 안내하고, 궁금한 예식 날짜가 있으면 알려달라고 하세요.';
  }
  if (ex.intent === 'open') {
    return '고객이 날짜 없이 전체 현황을 물었습니다. 현황은 안내하지 말고, "생각하고 계신 날짜나 시기를 알려주시면 확인해 드릴게요"로 되물으세요.';
  }
  let date = /^\d{4}-\d{2}-\d{2}$/.test(ex.date) ? ex.date : '';
  const prefer = SLOTS.indexOf(ex.slot) !== -1 ? ex.slot : '';

  // 시기만 말한 경우: 범위에서 후보 날짜 하나를 서버가 고른다(주말 요청 시 주말만)
  if (!date && /^\d{4}-\d{2}-\d{2}$/.test(ex.periodFrom)) {
    if (ctx.confirmedDates.length >= pol.checks) return limitMsg(pol.checks);
    const from = ex.periodFrom > today ? ex.periodFrom : addDays(today, 1);
    const to = /^\d{4}-\d{2}-\d{2}$/.test(ex.periodTo) && ex.periodTo > from ? ex.periodTo : addDays(from, 60);
    let cand = '';
    // 시기만 말한 경우 주말(토·일)을 우선 후보로 — 주말 요청이면 주말만, 아니면 주말 먼저 보고 없을 때 평일(사장 지시: 니즈 우선·주말 우선 후보)
    for (const weekendPass of (ex.weekendOnly ? [true] : [true, false])) {
      let d = from;
      for (let i = 0; i < 124 && d <= to; i++) {
        const wd = dayOfWeek(d);
        const isWeekend = wd === 0 || wd === 6;
        if ((weekendPass ? isWeekend : !isWeekend) && freeSlot(taken, d, prefer)) { cand = d; break; }
        d = addDays(d, 1);
      }
      if (cand) break;
    }
    if (!cand) {
      return '말씀하신 시기에는 안내 가능한 일정을 찾지 못했습니다. 다른 시기를 알려주시면 확인해 드리겠다고 안내하세요.' + (pol.busy >= 2 ? BUSY_LINE[3] : '');
    }
    // 니즈 먼저(사장 지시): 시간대를 안 정했으면 특정 시간을 찍지 말고, 후보 날짜를 곁들여 희망 시간대를 먼저 여쭙니다.
    if (!prefer && !ex.anySlot) {
      return '고객이 말한 시기에서는 ' + koDate(cand) + '(' + WD_KO[dayOfWeek(cand)] + ') 같은 날을 후보로 보고 있습니다. 특정 시간의 가능 여부는 아직 말하지 말고, "그 시기라면 ' + koDate(cand) + '(' + WD_KO[dayOfWeek(cand)] + ') 같은 날이 있는데, 예식은 어느 시간대를 생각하고 계세요? 오전 9시 · 오후 12시 20분 · 늦은 오후 3시 40분 중에서 편하신 시간을 알려주시면 그 시간으로 확인해 드릴게요"처럼 희망 시간대를 먼저 여쭤보세요.';
    }
    return okMsg(cand, prefer || freeSlot(taken, cand, ''), '', page, cta) + busyAt(cand);
  }

  if (!date) {
    return '고객이 확인할 날짜를 아직 말하지 않았습니다. 생각하고 계신 날짜나 시기를 알려달라고 정중히 물으세요.';
  }
  if (date <= today) {
    return '고객이 말한 ' + koDate(date) + '은 이미 지났거나 오늘입니다. 정중히 미래의 날짜를 알려달라고 안내하세요. 다른 연도를 추측해 제안하지 마세요(예: "2025년을 생각하신 걸까요?" 같은 연도 되묻기 금지).';
  }
  // ② 한도: 새 날짜이고 단계별 한도를 넘었으면 차단(같은 날짜의 추가 질문·시간대 변경은 허용)
  const key = dateKey(date);
  if (ctx.confirmedDates.length >= pol.checks && !(key in ctx.confirmed)) return limitMsg(pol.checks);

  // 신비주의: 같은 날짜에 이미 한 타임을 확인해 줬으면, 다른 타임을 또 물어도(또는 다시 물어도) 추가 확정 없이
  //   "임시 고정 후 디렉터 조율"로 한 번만 안내. (니즈 질문보다 먼저 — 이미 안내한 날짜는 되묻지 않음)
  if (key in ctx.confirmed) {
    const already = ctx.confirmed[key];
    if (!prefer || prefer !== already) {
      return '고객은 이미 ' + koDate(date) + ' ' + SLOT_LABEL[already] + ' 타임을 안내받았습니다. 다른 시간대의 가능 여부는 새로 확인해 주지 마세요. "그 날은 ' + SLOT_LABEL[already] + '으로 안내드렸고, 다른 시간대 조율은 디렉터가 함께 도와드려요" 취지로 한두 문장만 답하세요. 직전에도 같은 안내를 했다면 그보다 더 짧게, 표현을 바꿔서 답하세요. 영업·희소성 멘트와 임시 고정 절차 설명은 반복하지 마세요.';
    }
    return '고객이 이미 안내받은 ' + koDate(date) + ' ' + SLOT_LABEL[already] + ' 타임을 다시 확인하는 상황입니다. "네, ' + koDate(date) + ' ' + SLOT_LABEL[already] + '으로 안내드린 일정 그대로예요" 정도로 짧게만 확인하세요. 영업·희소성 멘트 반복 금지.';
  }

  // 니즈 먼저(사장 지시): 날짜만 말하고 시간대를 안 정했으면, 가능 여부를 말하기 전에 희망 시간대부터 여쭌다.
  //   모든 페이지·모든 예약율 단계 공통. 멋대로 오전을 찍지 않는다. "아무 때나"(anySlot)면 묻지 않고 한 타임을 고른다.
  if (!prefer && !ex.anySlot) {
    return '고객이 ' + koDate(date) + '(' + WD_KO[dayOfWeek(date)] + ')에 대해 희망 시간대를 아직 말하지 않았습니다. 특정 타임(오전 등)의 가능 여부를 먼저 단정하지 말고, "이 날은 오전 9시 · 오후 12시 20분 · 늦은 오후 3시 40분 세 타임으로 모시는데, 어느 시간대를 생각하고 계세요? 편하신 시간을 알려주시면 그 시간으로 가능한지 확인해 드릴게요"처럼 희망 시간대를 먼저 여쭤보세요.';
  }

  let slot = freeSlot(taken, date, prefer), note = '';
  if (!slot && prefer) {
    // 지정 시간대만 마감 → 그 사실을 알리고 같은 날 다른 타임 하나로 안내(④ 단일 타임 유지)
    slot = freeSlot(taken, date, '');
    if (slot) note = '고객이 말한 ' + SLOT_LABEL[prefer] + ' 타임은 이미 확정된 일정이 있습니다. 그 사실을 먼저 알리고 아래 타임을 안내하세요.\n';
  }
  if (slot) return okMsg(date, slot, note, page, cta) + busyAt(date);
  // 그 날짜 전부 마감 → 가까운 대안 하나(주말 요청이면 주말 우선)
  const wantWeekend = ex.weekendOnly || dayOfWeek(date) === 0 || dayOfWeek(date) === 6;
  let alt = '', altSlot = '';
  for (const weekendPass of (wantWeekend ? [true, false] : [false])) {
    let d = addDays(date, 1);
    for (let i = 0; i < 90; i++) {
      const wd = dayOfWeek(d);
      if ((!weekendPass || wd === 0 || wd === 6) && freeSlot(taken, d, prefer)) { alt = d; altSlot = freeSlot(taken, d, prefer); break; }
      d = addDays(d, 1);
    }
    if (alt) break;
  }
  let m = '고객이 말한 ' + koDate(date) + '(' + WD_KO[dayOfWeek(date)] + ')은 이미 진행이 확정된 일정이 있어 어렵습니다.';
  if (alt) m += ' 대안으로 ' + koDate(alt) + '(' + WD_KO[dayOfWeek(alt)] + ') ' + SLOT_LABEL[altSlot] + ' 타임 한 건만 "진행 가능한 일정으로 확인돼요"로 안내하세요.';
  else m += ' 대안은 안내하지 말고, 다른 시기를 알려주시면 확인해 드리겠다고 하세요.';
  return m + busyAt(date);
}

// 행동 안내: 이미 한 번 안내했으면(cta) 반복하지 않고 일정만 담백하게. 첫 안내도 한 문장으로 짧게.
function actionTxt(page, cta) {
  if (cta) return ' 임시 고정·상담 신청 안내는 앞서 했으니 반복하지 말고, 일정만 한 문장으로 담백하게 확인하세요.';
  return (page === '예약')
    ? ' 이어서 한 문장으로만 "대면상담을 신청하시면 상담 전에 이 일정을 확정받으실 수 있어요" 정도를 짧게 덧붙이세요.'
    : ' 한 문장으로 "아래 임시 고정에 신청해 두시면 디렉터가 확인 후 잡아드려요"만 짧게 덧붙이세요.';
}
function okMsg(date, slot, note, page, cta) {
  const wd = dayOfWeek(date), month = Number(date.slice(5, 7));
  const scarcity = !cta && (wd === 0 || wd === 6 || month === 4 || month === 5 || (month >= 9 && month <= 11));
  return note
    + '안내할 일정: ' + koDate(date) + '(' + WD_KO[wd] + ') ' + SLOT_LABEL[slot] + ' 타임 → 진행 가능한 일정으로 확인됨. 이 한 건만 안내하고,' + actionTxt(page, cta)
    + (scarcity ? ' 희소성 한 줄 허용.' : ' 희소성 멘트 금지.');
}
function limitMsg(n) {
  return '이 대화에서 이미 ' + n + '개의 날짜를 확인해 드렸습니다. 새 날짜 확인은 더 하지 말고, "한 번의 상담에서 확인해 드릴 수 있는 날짜 수가 정해져 있어요. 확인해 드린 날짜 중 마음에 드시는 날짜로 임시 고정을 신청해 두시면 디렉터가 최종 확인 후 안내드릴게요"의 취지로 정중히 마무리하세요. 새 날짜를 더 물어보라는 말은 하지 마세요.';
}

function freeSlot(taken, ymd, prefer) {
  const t = taken[ymd] || [];
  if (prefer) return t.indexOf(prefer) === -1 ? prefer : '';   // 시간대를 지정했으면 그 타임만 판정(④)
  for (const s of SLOTS) if (t.indexOf(s) === -1) return s;
  return '';
}
function normalizeTaken(input) {
  const out = {};
  if (!input || typeof input !== 'object') return out;
  let n = 0;
  for (const k of Object.keys(input)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
    const arr = Array.isArray(input[k]) ? input[k].filter((s) => SLOTS.indexOf(String(s)) !== -1) : [];
    if (arr.length === 0) continue;
    out[k] = arr;
    if (++n >= 400) break;
  }
  return out;
}
// 비로그인(inquiry) 요청용 — GAS에서 점유 맵을 서버측으로만 조회(클라이언트에 비노출 · 실패 시 빈 맵)
async function fetchAvailability() {
  const hook = process.env.HANDOFF_WEBHOOK_URL;
  if (!hook || !/^https:\/\//.test(hook)) return {};
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 4000);
    const r = await fetch(hook, {
      method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctl.signal,
      body: JSON.stringify({ action: 'aiAvailability', secret: process.env.HANDOFF_SECRET || undefined }),
    });
    clearTimeout(t);
    if (!r.ok) return null;
    const j = await r.json();
    if (!j || j.ok !== true || !j.taken) return null;   // 라우팅 누락·시크릿 불일치·조회 실패 = 불명(fail-closed)
    return j.taken;
  } catch (e) { return null; }
}

// 연도 안정화 — 1차 추출이 후속 턴에서 연도를 다르게 잡는 사고 방지(예: '내년 10월 9일 토요일' 안내 후
//   후속 턴에서 2026-10-09(금)로 추출). 직전 도우미 답변 속 "M월 D일 ...요일"과 월·일이 같은데 요일이
//   어긋나면, 요일이 맞는 연도(±1·+2)로 보정한다.
function snapYear(date, history) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  let m = null;
  for (let i = history.length - 1; i >= 0 && !m; i--) {
    if (history[i].role !== 'assistant') continue;
    const re = /(\d{1,2})월\s*(\d{1,2})일[^\d]{0,8}(월|화|수|목|금|토|일)요일/g; let g;
    while ((g = re.exec(history[i].content)) !== null) m = g;
  }
  if (!m) return date;
  if (Number(date.slice(5, 7)) !== Number(m[1]) || Number(date.slice(8, 10)) !== Number(m[2])) return date;
  const wdWant = ['일', '월', '화', '수', '목', '금', '토'].indexOf(m[3]);
  if (wdWant === -1 || dayOfWeek(date) === wdWant) return date;
  const y = Number(date.slice(0, 4));
  for (const yy of [y + 1, y - 1, y + 2]) {
    const cand = String(yy) + date.slice(4);
    if (dayOfWeek(cand) === wdWant) return cand;
  }
  return date;
}
// 내년 연도 가드 — 고객이 "내년"이라고 말했는데 추출 연도가 올해면 +1년(추출기가 "내년 N월 첫째 주 □요일"
//   같은 주차 계산을 가끔 올해 달력으로 함 · 2026-06-13 라이브 S2 실사례). "올해·금년"이 같이 있으면 보류.
//   +1년 뒤 요일이 어긋나는 건 바로 뒤의 snapWeekday가 맞춘다(합성 설계).
function snapNextYearWord(date, history, today) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  let lastUser = '';
  for (let i = history.length - 1; i >= 0; i--) { if (history[i].role === 'user') { lastUser = history[i].content; break; } }
  if (!/내년/.test(lastUser) || /올해|금년/.test(lastUser)) return date;
  const ty = Number(String(today).slice(0, 4));
  if (Number(date.slice(0, 4)) !== ty) return date;   // 이미 내년 이상으로 추출됐으면 그대로
  const cand = String(ty + 1) + date.slice(4);
  if (new Date(cand + 'T00:00:00Z').toISOString().slice(0, 10) !== cand) return date;   // 2/29 등 무효 날짜 방지
  return cand;
}
// 요일 정합 가드 — 고객이 마지막 메시지에서 요일 하나를 명시했는데("11월 첫째 주 토요일") 추출 날짜의 실제
//   요일이 어긋나면(실사례: 2027-11-07은 일요일) ±3일 안에서 그 요일인 날로 스냅한다. 고객이 "11월 7일"처럼
//   일(日) 숫자나 ISO 날짜를 직접 말했으면 날짜를 존중해 손대지 않고, 요일을 2개 이상 말했으면 판단을 보류한다.
function snapWeekday(date, history) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  let lastUser = '';
  for (let i = history.length - 1; i >= 0; i--) { if (history[i].role === 'user') { lastUser = history[i].content; break; } }
  const wds = (lastUser.match(/[월화수목금토일]요일/g) || []).map((s) => s.charAt(0));
  const uniq = wds.filter((c, i) => wds.indexOf(c) === i);
  if (uniq.length !== 1) return date;
  if (/\d{1,2}\s*일(?!요일)/.test(lastUser) || /\d{4}-\d{1,2}-\d{1,2}/.test(lastUser)) return date;
  const want = ['일', '월', '화', '수', '목', '금', '토'].indexOf(uniq[0]);
  if (want === -1 || dayOfWeek(date) === want) return date;
  for (const off of [1, -1, 2, -2, 3, -3]) {
    const cand = addDays(date, off);
    if (dayOfWeek(cand) === want) return cand;
  }
  return date;
}
// 답변 표기 정합 — 본문 속 "M월 D일 X요일"이 판정 날짜(ex.date)의 실제 요일과 다르면 실제 요일로 바꿔 쓴다.
//   (답변 모델이 고객이 잘못 말한 요일을 그대로 따라 적는 사고의 코드 백스톱 · ex.date와 월·일이 같은 표기만 교정)
function fixWeekdayText(text, date) {
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return text;
  const mo = Number(date.slice(5, 7)), da = Number(date.slice(8, 10)), wd = WD_KO[dayOfWeek(date)];
  const re = new RegExp('(' + mo + '월\\s*' + da + '일[^월화수목금토일\\n]{0,6})[월화수목금토일]요일', 'g');
  return text.replace(re, function (all, pre) { return pre + wd; });
}
function dayOfWeek(ymd) { return new Date(ymd + 'T00:00:00Z').getUTCDay(); }
function addDays(ymd, n) {
  const d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function koDate(ymd) { return Number(ymd.slice(5, 7)) + '월 ' + Number(ymd.slice(8, 10)) + '일'; }
function dateKey(ymd) { return Number(ymd.slice(5, 7)) + '-' + Number(ymd.slice(8, 10)); }

async function callClaude(apiKey, payload) {
  const r = await fetch(API_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) {
    console.error('sched_advisor_upstream', r.status, (await safeText(r)).slice(0, 300));
    throw new Error('upstream_' + r.status);
  }
  return r.json();
}
function textOf(data) {
  return ((data && data.content) || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 30000) { req.destroy(); reject(new Error('payload_too_large')); } });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}
async function safeText(r) { try { return await r.text(); } catch (e) { return ''; } }
