// 모먼트에디트 다이닝 AI 추천 · 자연어 → 필터 변환 엔드포인트 (Vercel 서버리스)
// 프론트(mypage.html 다이닝 위저드) → POST /api/dining-match → Claude Haiku 4.5
//
// 메인홈 상담사(advisor.js)와 '같은 Vercel 키' 사용 → 키 한 곳만 등록하면 둘 다 작동.
// 필요 환경변수 (Vercel 프로젝트 설정):
//   ANTHROPIC_API_KEY   ← 과금 계정 API 키 (없으면 503 → 프론트는 칩으로 폴백)
//
// ★ 메인홈 상담사와 역할이 다름:
//   - advisor.js = 서비스 전반 자유 Q&A(지식베이스로 '답변')
//   - 이 엔드포인트 = '다이닝(식사 자리) 조건 추출'만. 답변 챗봇이 아님.
//     식사와 무관한 질문(가격·예약·일반 문의 등)은 모든 필터 none + 안내 문구만 반환(환각·이탈 방지).
//   AI는 식당을 고르지 않고 '필터 값'만 만든다 → 실제 랭킹은 프론트의 결정형 엔진(DINE_DB).
//
// 의존성 없음(전역 fetch). package.json 불필요.

const MODEL = 'claude-haiku-4-5';
const API_URL = 'https://api.anthropic.com/v1/messages';
const MAX_MSG_LEN = 500;        // 입력 길이 상한(비용·어뷰징 가드)
const MAX_TOKENS = 400;
const FOODS = ['한정식', '한우·갈비', '곰탕·국밥', '족발·보쌈', '뷔페', '카페'];

const SYS =
  '너는 결혼식 후 하객 식사 자리(다이닝)를 찾는 한국 고객의 자연어 요청을 아래 필터 값으로만 변환한다. '
  + '식당 이름을 지어내지 말고, 각 값은 반드시 보기 중에서만 고른다. 언급이 없는 항목은 "none". '
  + '어르신·부모님·연세·좌식 같은 언급이 있으면 elderly=true. '
  + '★식사 자리와 무관한 요청(가격 문의·예약 방법·일반 질문 등)이면 모든 값을 none, elderly=false 로 두고 '
  + 'summary에 "다이닝(식사 자리) 조건을 알려주시면 맞춰드릴게요." 라고만 적는다. 절대 일반 질문에 답하지 않는다. '
  + 'summary는 고객에게 보여줄 한 문장(존댓말, 전각 줄표 사용 금지).\n'
  + 'theme: formal(정찬·한정식·한우·갈비) | casual(국밥·곰탕·족발·뷔페 등 편한 식사) | cafe(카페·브런치·다과) | none\n'
  + 'price: low(저렴) | mid(보통) | high(고급) | none\n'
  + 'dist: "10"(가까운 곳) | "15" | none\n'
  + 'food: ' + FOODS.join(' | ') + ' | none\n'
  + 'group: room(단독룸) | seats(단체석) | none\n'
  + 'elderly: true | false';

const SCHEMA = {
  type: 'object',
  properties: {
    theme:   { type: 'string', enum: ['formal', 'casual', 'cafe', 'none'] },
    price:   { type: 'string', enum: ['low', 'mid', 'high', 'none'] },
    dist:    { type: 'string', enum: ['10', '15', 'none'] },
    food:    { type: 'string', enum: FOODS.concat(['none']) },
    group:   { type: 'string', enum: ['room', 'seats', 'none'] },
    elderly: { type: 'boolean' },
    summary: { type: 'string' }
  },
  required: ['theme', 'price', 'dist', 'food', 'group', 'elderly', 'summary'],
  additionalProperties: false
};

const rateGate = require('./_ratelimit');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.statusCode = 405; res.setHeader('Allow', 'POST');
    return res.end(JSON.stringify({ ok: false, error: 'method_not_allowed' }));
  }
  if (!rateGate(req, 6, 60)) {   // 비용 가드 — 같은 IP 분당 6회·6시간 60회(정상 사용은 닿지 않음)
    res.statusCode = 429; res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: false, error: '요청이 잠시 많아요. 1분 뒤 다시 시도하시거나 아래에서 직접 골라 주세요.' }));
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.statusCode = 503; res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: false, notConfigured: true, error: 'AI 추천이 아직 설정되지 않았어요. 아래에서 직접 골라 주세요.' }));
  }

  try {
    const body = await readJson(req);
    let text = String((body && body.text) || '').trim();
    if (!text) {
      res.statusCode = 400; res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ ok: false, error: '원하는 조건을 적어 주세요.' }));
    }
    if (text.length > MAX_MSG_LEN) text = text.slice(0, MAX_MSG_LEN);

    const upstream = await fetch(API_URL, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: SYS,
        output_config: { format: { type: 'json_schema', schema: SCHEMA } },
        messages: [{ role: 'user', content: text }]
      })
    });
    if (!upstream.ok) {
      res.statusCode = 502; res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ ok: false, error: 'AI 추천이 잠시 어려워요. 아래에서 직접 골라 주세요.' }));
    }

    const data = await upstream.json();
    let txt = '';
    if (data && Array.isArray(data.content)) {
      for (const b of data.content) { if (b.type === 'text') { txt = b.text; break; } }
    }
    let p;
    try { p = JSON.parse(txt); } catch (e) {
      res.statusCode = 200; res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ ok: false, error: '결과를 해석하지 못했어요. 아래에서 직접 골라 주세요.' }));
    }

    // 방어적 sanitize — 허용값('none' 제외)만 통과. AI가 무엇을 뱉어도 우리 축 밖은 버림.
    const f = {};
    if (['formal', 'casual', 'cafe'].includes(p.theme)) f.theme = p.theme;
    if (['low', 'mid', 'high'].includes(p.price)) f.price = p.price;
    if (['10', '15'].includes(p.dist)) f.dist = p.dist;
    if (FOODS.includes(p.food)) f.food = p.food;
    if (['room', 'seats'].includes(p.group)) f.group = p.group;
    if (p.elderly === true) f.elderly = true;

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(JSON.stringify({ ok: true, filters: f, summary: String(p.summary || '').slice(0, 120) }));
  } catch (e) {
    res.statusCode = 500; res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ ok: false, error: '추천 처리에 실패했어요. 아래에서 직접 골라 주세요.' }));
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
