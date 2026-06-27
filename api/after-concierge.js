// 모먼트에디트 애프터 웨딩 컨시어지 · 대화형 니즈 파악 + 장소 안내 (Vercel 서버리스)
// 프론트(mypage.html 애프터 웨딩 위저드 채팅) → POST /api/after-concierge
//
// 3층 구조(환각 0 원칙):
//   ① 대화 층(여기·Sonnet 4.6): 니즈를 묻고(최대 2질문) 카테고리·검색어·필터만 만든다. 장소 이름을 직접 말하지 않는다.
//   ② 장소 층: dining·cafe → 디렉터 검증 DB(프론트 DINE_DB·필터 자동 세팅) / kids·afterparty·attraction → 카카오 지역검색(실시간 지도 등록 업체).
//   ③ 카드 층: 장소 사실(상호·전화·거리·링크)은 전부 카카오 API 원문 그대로 — AI가 지어낼 수 없음.
//
// 필요 환경변수 (Vercel):
//   ANTHROPIC_API_KEY  ← advisor와 공용 (없으면 503 → 프론트 칩 폴백)
//   KAKAO_REST_KEY     ← 카카오디벨로퍼스 REST API 키 (없으면 지도 검색만 비활성 · 디렉터 폴백 안내)
//
// 의존성 없음(전역 fetch). 키는 코드·저장소에 두지 않는다.

const MODEL = 'claude-sonnet-4-6';   // 마이페이지 애프터웨딩 컨시어지(계약 고객): 현재 Sonnet 4.6 (그라운딩 후 Opus 재격상 검토)
const API_URL = 'https://api.anthropic.com/v1/messages';
const KAKAO_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json';
const STUDIO = { x: '126.8929', y: '37.6079' };   // 향동 스튜디오(index.html 지도와 동일 좌표)
const RADIUS = 7000;                               // 차 10~15분 생활권
const MAX_MSG_LEN = 400, MAX_TURNS = 10, MAX_TOKENS = 500;
const FOODS = ['한정식', '한우·갈비', '곰탕·국밥', '샤브·전골', '면·만두', '족발·보쌈', '오리·백숙', '중식', '해물·생선', '뷔페', '카페'];
const FALLBACK_QUERY = { kids: '키즈카페', afterparty: '맥주집', attraction: '가볼만한곳' };

const SYS =
  '너는 프라이빗 웨딩 스튜디오 "모먼트에디트"의 애프터 웨딩 컨시어지다. 결혼식이 끝난 뒤의 시간(식사·카페·아이 동반 장소·친구 뒷풀이·근처 볼거리)을 함께 그려주는 역할이다. '
  + '고객의 니즈(누구와, 몇 명, 어떤 분위기)를 먼저 파악하되, 질문은 대화 전체에서 최대 2번까지만 하고 그 뒤엔 아는 정보만으로 바로 추천을 진행한다. '
  + '★절대 규칙: 장소(가게·식당·카페·시설) 이름을 직접 언급하거나 지어내지 마라. 장소는 시스템이 지도 데이터로 보여준다. 너는 분류와 한두 문장 안내만 한다. '
  + 'reply는 존댓말 한두 문장(전각 줄표·이모지·마크다운 금지). ask는 니즈 파악용 후속 질문 1개(필요 없으면 빈 문자열). '
  + '예식·계약·가격 등 애프터 웨딩과 무관한 질문이면 intent=offtopic, reply에 "그 부분은 화면의 상담 도우미가 도와드려요"라고만 안내한다.\n'
  + 'category: dining(식사 자리) | cafe(카페·다과) | kids(아이와 함께·키즈카페) | afterparty(친구 뒷풀이·술자리) | attraction(볼거리·산책·관광) | none(아직 불명확)\n'
  + 'query: 카카오맵에 검색할 짧은 한국어 검색어(지역명 없이 업종만. 예: "키즈카페", "수제맥주 펍", "공원 산책"). category가 none이거나 dining·cafe면 빈 문자열.\n'
  + 'filters(식사·카페일 때만 · 아니면 모두 none/false): theme formal|casual|cafe|none · price low|mid|high|none · dist "10"|"15"|none · food ' + FOODS.join('|') + '|none · group room|seats|none · elderly true|false';

const SCHEMA = {
  type: 'object',
  properties: {
    intent:   { type: 'string', enum: ['place', 'offtopic'] },
    category: { type: 'string', enum: ['dining', 'cafe', 'kids', 'afterparty', 'attraction', 'none'] },
    query:    { type: 'string' },
    theme:    { type: 'string', enum: ['formal', 'casual', 'cafe', 'none'] },
    price:    { type: 'string', enum: ['low', 'mid', 'high', 'none'] },
    dist:     { type: 'string', enum: ['10', '15', 'none'] },
    food:     { type: 'string', enum: FOODS.concat(['none']) },
    group:    { type: 'string', enum: ['room', 'seats', 'none'] },
    elderly:  { type: 'boolean' },
    ask:      { type: 'string' },
    reply:    { type: 'string' }
  },
  required: ['intent', 'category', 'query', 'theme', 'price', 'dist', 'food', 'group', 'elderly', 'ask', 'reply'],
  additionalProperties: false
};

const rateGate = require('./_ratelimit');

// 고객 노출 문구 세이프넷 — 전각 줄표·마크다운·이모지 제거(CLAUDE.md 하드룰)
function clean(t) {
  return String(t || '').replace(/—/g, '·').replace(/\*\*/g, '').replace(/[#`]/g, '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}️]/gu, '')
    .replace(/\s{2,}/g, ' ').trim();
}

async function kakaoSearch(query) {
  const key = process.env.KAKAO_REST_KEY;
  if (!key) return { down: true, places: [] };
  try {
    const u = KAKAO_URL + '?query=' + encodeURIComponent(query)
      + '&x=' + STUDIO.x + '&y=' + STUDIO.y + '&radius=' + RADIUS + '&sort=distance&size=7';
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 4000);
    const r = await fetch(u, { headers: { Authorization: 'KakaoAK ' + key }, signal: ctl.signal });
    clearTimeout(t);
    if (!r.ok) return { down: true, places: [] };
    const j = await r.json();
    const places = (j.documents || []).map((d) => ({
      name: String(d.place_name || '').slice(0, 60),
      dist: Number(d.distance) || null,                                  // m
      phone: String(d.phone || '').slice(0, 20),
      addr: String(d.road_address_name || d.address_name || '').slice(0, 80),
      url: /^https?:\/\/place\.map\.kakao\.com\//.test(String(d.place_url || '')) ? d.place_url : '',
      cat: String(d.category_name || '').split('>').pop().trim().slice(0, 20)
    })).filter((p) => p.name);
    return { down: false, places };
  } catch (e) { return { down: true, places: [] }; }
}

module.exports = async (req, res) => {
  const out = (code, obj) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(obj)); };
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return out(405, { ok: false, error: 'method_not_allowed' }); }
  if (!rateGate(req, 6, 80)) return out(429, { ok: false, error: '요청이 잠시 많아요. 1분 뒤 다시 시도해 주세요.' });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return out(503, { ok: false, error: 'unconfigured' });

  try {
    let raw = ''; await new Promise((rs, rj) => { req.on('data', (c) => { raw += c; if (raw.length > 60000) rj(new Error('too_large')); }); req.on('end', rs); req.on('error', rj); });
    let body = {}; try { body = raw ? JSON.parse(raw) : {}; } catch (e) { return out(400, { ok: false, error: 'bad_json' }); }

    // [무료 진단] probe — Claude 미호출. 카카오 키 주입·도달 상태만 보고(배포 점검용 · 키 값은 노출하지 않음)
    if (body.probe === true) {
      const keyPresent = !!process.env.KAKAO_REST_KEY;
      let kakaoHttp = null;
      if (keyPresent) {
        try {
          const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 4000);
          const r2 = await fetch(KAKAO_URL + '?query=' + encodeURIComponent('카페') + '&x=' + STUDIO.x + '&y=' + STUDIO.y + '&radius=1000&size=1',
            { headers: { Authorization: 'KakaoAK ' + process.env.KAKAO_REST_KEY }, signal: ctl.signal });
          clearTimeout(t); kakaoHttp = r2.status;
        } catch (e) { kakaoHttp = 'fetch_fail'; }
      }
      return out(200, { ok: true, keyPresent, kakaoHttp });
    }

    let history = Array.isArray(body.messages) ? body.messages : [];
    history = history
      .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
      .slice(-MAX_TURNS)
      .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MSG_LEN).trim() }))
      .filter((m) => m.content);
    while (history.length && history[0].role !== 'user') history.shift();
    if (!history.length || history[history.length - 1].role !== 'user') return out(400, { ok: false, error: 'empty_message' });
    const userTurns = history.filter((m) => m.role === 'user').length;

    let sysA = SYS;   // 운영자 보충지식(교육) — 핵심 뒤에 참고용으로
    try { const fct = await require('./_facts')(); if (fct) sysA += '\n\n[운영 핵심정보 — 최신·최우선. 위 지식과 다르면 아래를 따른다]\n' + fct; } catch (e) {}
    try { const n = await require('./_kbnotes')('애프터'); if (n) sysA += '\n\n[운영자 보충지식 — 참고용 · 가격·계약 등 핵심 정책과 충돌하면 핵심 우선]\n' + n; } catch (e) {}
    const r = await fetch(API_URL, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, system: sysA,
        thinking: { type: 'disabled' },   // Sonnet: 실시간 채팅 → 사고 없이 낮은 effort
        output_config: { format: { type: 'json_schema', schema: SCHEMA }, effort: 'low' }, messages: history })
    });
    if (!r.ok) return out(502, { ok: false, error: 'ai_unavailable' });
    const data = await r.json();
    if (!(body && body.test)) { try { await require('./_costlog')('애프터', MODEL, data.usage); } catch (e) {} }
    let parsed = {};
    try { parsed = JSON.parse((data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')); } catch (e) { return out(502, { ok: false, error: 'ai_parse' }); }

    // sanitize — 허용값만 통과(AI가 무엇을 뱉어도 축 밖은 버림)
    const cat = ['dining', 'cafe', 'kids', 'afterparty', 'attraction'].indexOf(parsed.category) >= 0 ? parsed.category : 'none';
    const f = {};
    if (['formal', 'casual', 'cafe'].indexOf(parsed.theme) >= 0) f.theme = parsed.theme;
    if (['low', 'mid', 'high'].indexOf(parsed.price) >= 0) f.price = parsed.price;
    if (['10', '15'].indexOf(parsed.dist) >= 0) f.dist = parsed.dist;
    if (FOODS.indexOf(parsed.food) >= 0) f.food = parsed.food;
    if (['room', 'seats'].indexOf(parsed.group) >= 0) f.group = parsed.group;
    if (parsed.elderly === true) f.elderly = true;
    let ask = clean(parsed.ask).slice(0, 120);
    if (userTurns >= 2) ask = '';                                    // 니즈 질문은 최대 2번 — 그 뒤엔 추천으로 진행
    const reply = clean(parsed.reply).slice(0, 240) || '어울리는 곳을 함께 찾아드릴게요.';

    // 장소 층 — dining·cafe는 디렉터 검증 DB(프론트), 그 외는 카카오 지도 실시간 검색
    let places = [], mapDown = false, source = 'none';
    if (parsed.intent !== 'offtopic' && (cat === 'kids' || cat === 'afterparty' || cat === 'attraction') && !ask) {
      const q = clean(parsed.query).slice(0, 40) || FALLBACK_QUERY[cat];
      const got = await kakaoSearch(q);
      places = got.places; mapDown = got.down; source = got.down ? 'none' : 'kakao';
    } else if (parsed.intent !== 'offtopic' && (cat === 'dining' || cat === 'cafe')) {
      source = 'db';                                                  // 프론트가 DINE_DB 필터로 노출
    }

    if (!(body && body.test)) { try { await require('./_qlog')('애프터', history[history.length - 1].content, { reply: reply }); } catch (e) {} }

    return out(200, { ok: true, intent: parsed.intent === 'offtopic' ? 'offtopic' : 'place',
      category: cat, reply, ask, filters: f, places, source, mapDown });
  } catch (err) {
    console.error('after_concierge_exception', err && err.message);
    return out(500, { ok: false, error: 'server_error' });
  }
};
