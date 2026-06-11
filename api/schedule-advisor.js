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
//
// 입력: { messages:[{role,content}...], taken?:{ 'YYYY-MM-DD':[slot,...] }, today?:'YYYY-MM-DD' }
//   - taken은 로그인된 schedule.html이 전달. 없으면(비로그인 inquiry) GAS에서 서버측 조회.
// 환경변수: ANTHROPIC_API_KEY(필수) · HANDOFF_WEBHOOK_URL(선택, GAS 가용성 조회) · HANDOFF_SECRET(선택)

const MODEL = 'claude-haiku-4-5';
const API_URL = 'https://api.anthropic.com/v1/messages';
const MAX_MSG_LEN = 400, MAX_HISTORY = 10;
const MAX_DATE_CHECKS = 3;          // ② 대화당 서로 다른 날짜 확인 한도
const rateGate = require('./_ratelimit');

const SLOTS = ['09:00', '12:20', '15:40'];
const SLOT_LABEL = { '09:00': '오전 9시', '12:20': '오후 12시 20분', '15:40': '늦은 오후 3시 40분' };
const WD_KO = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

// ── 1차: 날짜 추출 전용 (가용성 데이터 없음 · JSON만) ──
const EXTRACT_PROMPT = `당신은 웨딩 예식일 상담 대화에서 고객의 마지막 메시지가 무엇을 요청하는지 분석해 JSON으로만 답하는 추출기입니다.
규칙:
- intent: 특정 날짜나 시기의 예식 예약 가능 여부를 묻거나 확인을 원하면 "check". 날짜를 전혀 말하지 않고 "언제 가능해요?", "가능한 날짜 알려줘"처럼 전체 현황을 물으면 "open". 스케줄과 무관한 질문(가격·환불·상담 등)이나 인사면 "other".
- date: 고객이 말한 구체적 날짜 하나를 YYYY-MM-DD로. 여러 날짜를 말했으면 가장 이른 것 하나만. [오늘]을 기준으로 "내년", "다음 달", "10월 둘째 주 토요일" 같은 상대 표현을 정확히 계산합니다. 구체 날짜가 없으면 빈 문자열.
- periodFrom/periodTo: 구체 날짜 없이 시기만 말한 경우(예: "내년 10월", "내년 봄") 그 범위를 YYYY-MM-DD로. 해당 없으면 빈 문자열.
- weekendOnly: 고객이 주말·토요일·일요일을 원한다고 했으면 true.
- slot: 고객이 시간대를 말했으면 "09:00"(오전) | "12:20"(낮·점심) | "15:40"(늦은 오후·저녁 무렵) 중 하나. 없으면 빈 문자열.
- 직전 대화 맥락을 활용합니다(예: 앞서 말한 날짜에 대해 "그날 오전은요?"라고 물으면 그 날짜 + slot "09:00").`;

const EXTRACT_SCHEMA = {
  type: 'object',
  properties: {
    intent: { type: 'string', enum: ['check', 'open', 'other'] },
    date: { type: 'string' },
    periodFrom: { type: 'string' },
    periodTo: { type: 'string' },
    weekendOnly: { type: 'boolean' },
    slot: { type: 'string', enum: ['', '09:00', '12:20', '15:40'] },
  },
  required: ['intent', 'date', 'periodFrom', 'periodTo', 'weekendOnly', 'slot'],
  additionalProperties: false,
};

// ── 2차: 답변 작성 (판정 결과만 전달 · 캘린더 비전달) ──
const REPLY_PROMPT = `당신은 웨딩 브랜드 "모먼트에디트"의 예식일 확인 접수 도우미입니다. 따뜻하고 단정한 존댓말로, 2~4문장으로 답합니다.

[서비스 사실]
- 예식은 하루 3타임 운영(오전 9시 · 오후 12시 20분 · 늦은 오후 3시 40분), 한 타임에 한 팀만 모십니다.
- 확인된 날짜는 "예식일 임시 고정"으로 신청해 두시면 디렉터가 최종 확인 후 14일간 잡아드립니다(비용 없음 · 확정은 본계약 서명).
- 예약 권장: 희망일 최소 6개월 전, 봄(4~5월)·가을(9~11월) 주말은 9개월 전 권장.

[승인제 화법 — 반드시 지킬 것]
1. "비어 있어요", "빈 자리", "자리가 있어요", "대부분 가능해요" 같은 공실 표현 금지. 가능 안내는 반드시 "진행 가능한 일정으로 확인돼요" 형태로, 이어서 "임시 고정으로 신청해 두시면 디렉터가 최종 확인 후 잡아드려요"로 절차를 안내합니다.
2. [확인 결과]에 적힌 내용만 사실로 사용합니다. 거기 없는 날짜·시간대의 가능 여부는 절대 말하지 않습니다. 전체 현황·기간 나열·"~부터 ~까지" 표현 금지.
3. 시간대는 [확인 결과]가 알려준 한 타임만 언급합니다. 그 날짜의 다른 시간대가 가능한지는 말하지 않습니다.
4. 요일은 [확인 결과]에 적어준 요일만 사용합니다. 직접 계산하지 않습니다.
5. 희소성 한 줄(예: "주말 일정은 신청이 먼저 닿는 순서로 디렉터 확인이 진행되니, 마음에 드시면 서둘러 신청해 두시는 게 좋아요")은 [확인 결과]가 허용한 경우에만, 대화에서 아직 안 했을 때 한 번만.
6. 전각 줄표(—)와 마크다운(** 등) 금지. 이모지 금지.
7. 스케줄과 무관한 질문이면 짧게 양해를 구하고 "이 창구는 예식일 확인 전용"임을 안내합니다.`;

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

    const today = /^\d{4}-\d{2}-\d{2}$/.test(String(body && body.today)) ? String(body.today)
      : new Date().toISOString().slice(0, 10);

    // 가용성: 로그인 클라이언트(schedule.html)가 준 taken 우선, 없으면 GAS 서버측 조회(비로그인 inquiry)
    let taken = normalizeTaken(body && body.taken);
    if (Object.keys(taken).length === 0) taken = normalizeTaken(await fetchAvailability());

    // ② 이미 답해준 서로 다른 날짜 수 — 어시스턴트 답변 속 "M월 D일"을 코드로 집계(모델 재량 아님)
    const answered = new Set();
    history.forEach((m) => {
      if (m.role !== 'assistant') return;
      const re = /(\d{1,2})월\s*(\d{1,2})일/g; let g;
      while ((g = re.exec(m.content)) !== null) answered.add(Number(g[1]) + '-' + Number(g[2]));
    });

    // ── 1차 호출: 날짜 추출 ──
    const convo = history.map((m) => (m.role === 'user' ? '고객' : '도우미') + ': ' + m.content).join('\n');
    const ext = await callClaude(apiKey, {
      model: MODEL, max_tokens: 250,
      system: [{ type: 'text', text: EXTRACT_PROMPT, cache_control: { type: 'ephemeral' } }],
      output_config: { format: { type: 'json_schema', schema: EXTRACT_SCHEMA } },
      messages: [{ role: 'user', content: '[오늘] ' + today + '\n\n[대화]\n' + convo + '\n\n고객의 마지막 메시지를 분석하세요.' }],
    });
    let ex = { intent: 'other', date: '', periodFrom: '', periodTo: '', weekendOnly: false, slot: '' };
    try { ex = Object.assign(ex, JSON.parse(textOf(ext))); } catch (e) {}

    // ── 서버 판정 (AI는 이 결과만 본다) ──
    const page = String((body && body.page) || '스케줄').slice(0, 10);   // '스케줄'(임시고정 입력란 있음) | '예약'(inquiry 위젯)
    const verdict = decide(ex, taken, today, answered, page);

    // ── 2차 호출: 판정 결과로 답변 작성 ──
    const rep = await callClaude(apiKey, {
      model: MODEL, max_tokens: 400,
      system: [{ type: 'text', text: REPLY_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: '[대화]\n' + convo + '\n\n[확인 결과]\n' + verdict + '\n\n위 확인 결과만 사용해 고객의 마지막 메시지에 답하세요.' }],
    });
    let text = textOf(rep).trim().replace(/—/g, '·').replace(/\*\*/g, '');
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

// ── 판정: 추출 결과 + 점유 맵 → AI에게 줄 한 건의 지시문 ──
function decide(ex, taken, today, answered, page) {
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
    if (answered.size >= MAX_DATE_CHECKS) return limitMsg();
    const from = ex.periodFrom > today ? ex.periodFrom : addDays(today, 1);
    const to = /^\d{4}-\d{2}-\d{2}$/.test(ex.periodTo) && ex.periodTo > from ? ex.periodTo : addDays(from, 60);
    let d = from;
    for (let i = 0; i < 124 && d <= to; i++) {
      const wd = dayOfWeek(d);
      if ((!ex.weekendOnly || wd === 0 || wd === 6) && freeSlot(taken, d, prefer)) {
        // 시간대까지 말했으면 바로 판정, 아니면 후보 날짜만 제안하고 시간대를 되묻는다(시간 단위 확인)
        if (prefer) return okMsg(d, prefer, '', page);
        return '고객이 말한 시기에서는 ' + koDate(d) + '(' + WD_KO[wd] + ')을 후보 날짜로 제안하세요. 가능 여부는 아직 말하지 말고, "이 날짜라면 어느 시간대로 확인해 드릴까요?"로 되물으세요. 시간대는 오전 9시 · 오후 12시 20분 · 늦은 오후 3시 40분 세 타임입니다.';
      }
      d = addDays(d, 1);
    }
    return '말씀하신 시기에는 안내 가능한 일정을 찾지 못했습니다. 다른 시기를 알려주시면 확인해 드리겠다고 안내하세요.';
  }

  if (!date) {
    return '고객이 확인할 날짜를 아직 말하지 않았습니다. 생각하고 계신 날짜나 시기를 알려달라고 정중히 물으세요.';
  }
  if (date <= today) {
    return '고객이 말한 ' + koDate(date) + '은 이미 지났거나 오늘입니다. 정중히 미래의 날짜를 알려달라고 안내하세요.';
  }
  // ② 한도: 새 날짜이고 이미 3개를 답했으면 차단(같은 날짜의 추가 질문·시간대 변경은 허용)
  const key = dateKey(date);
  if (answered.size >= MAX_DATE_CHECKS && !answered.has(key)) return limitMsg();

  // ④ 시간 단위 확인(사장 지시): 날짜만 말하고 시간대가 없으면, 가능 여부를 말하기 전에
  //   "어느 시간대로 확인해 드릴까요?"로 되묻는다(그 날에 확인 가능한 타임이 하나라도 있을 때만).
  if (!prefer && freeSlot(taken, date, '')) {
    return '고객이 ' + koDate(date) + '(' + WD_KO[dayOfWeek(date)] + ')의 시간대를 아직 말하지 않았습니다. 가능 여부는 아직 말하지 말고, "어느 시간대로 확인해 드릴까요?"라고 되물으세요. 시간대는 오전 9시 · 오후 12시 20분 · 늦은 오후 3시 40분 세 타임입니다.';
  }

  let slot = freeSlot(taken, date, prefer), note = '';
  if (!slot && prefer) {
    // 지정 시간대만 마감 → 그 사실을 알리고 같은 날 다른 타임 하나로 안내(④ 단일 타임 유지)
    slot = freeSlot(taken, date, '');
    if (slot) note = '고객이 말한 ' + SLOT_LABEL[prefer] + ' 타임은 이미 확정된 일정이 있습니다. 그 사실을 먼저 알리고 아래 타임을 안내하세요.\n';
  }
  if (slot) return okMsg(date, slot, note, page);
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
  return m;
}

function okMsg(date, slot, note, page) {
  const wd = dayOfWeek(date), month = Number(date.slice(5, 7));
  const scarcity = (wd === 0 || wd === 6 || month === 4 || month === 5 || (month >= 9 && month <= 11));
  const action = (page === '예약')
    ? '이어서 "대면상담을 신청하시면 예약 단계에서 이 일정을 임시 고정으로 신청하실 수 있고, 디렉터 확인을 거쳐 대면상담 전에 정확한 예식 일자를 확정받으실 수 있어요"로, 상담 신청을 서두르도록 부드럽게 유도하세요.'
    : '아래 예식일 임시 고정에 이 날짜로 신청해 두시면 디렉터가 최종 확인 후 14일간 잡아드린다고 덧붙이세요.';
  return note
    + '안내할 일정: ' + koDate(date) + '(' + WD_KO[wd] + ') ' + SLOT_LABEL[slot] + ' 타임 → 진행 가능한 일정으로 확인됨. 이 한 건만 안내하고, ' + action
    + (scarcity ? ' 희소성 한 줄 허용.' : ' 희소성 멘트 금지.');
}
function limitMsg() {
  return '이 대화에서 이미 세 개의 날짜를 확인해 드렸습니다. 새 날짜 확인은 더 하지 말고, "한 번의 상담에서는 세 개 날짜까지 확인을 도와드리고 있어요. 확인해 드린 날짜 중 마음에 드시는 날짜로 임시 고정을 신청해 두시면 디렉터가 최종 확인 후 안내드릴게요"의 취지로 정중히 마무리하세요. 새 날짜를 더 물어보라는 말은 하지 마세요.';
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
    if (!r.ok) return {};
    const j = await r.json();
    return (j && j.ok && j.taken) || {};
  } catch (e) { return {}; }
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
