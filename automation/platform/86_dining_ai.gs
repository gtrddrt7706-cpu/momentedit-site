/**
 * Moment Edit · 다이닝 AI 추천(선택 층) — 고객 자연어 → 필터 객체.
 * ──────────────────────────────────────────────────────────────────────────
 * 칩 필터 엔진(mypage.html DINE_DB / dineFilterUI)과 똑같은 축만 출력 → 환각 0.
 *   AI는 식당을 '고르지' 않고 필터 값만 만든다. 실제 랭킹은 프런트의 결정형 엔진이 함.
 * 모델: Claude Haiku 4.5 (claude-haiku-4-5) · structured output(json_schema).
 * API 키: Script Properties 'ANTHROPIC_API_KEY' (없으면 ok:false → 프런트는 칩으로 폴백).
 * 호출: mypage api({action:'diningMatch', token, text}) → 라우터 → handleDiningMatch.
 * [재사용] resolveSession(30) · _sessionMsg.
 */
var DINING_AI_MODEL = 'claude-haiku-4-5';                      // 단순 매칭이라 Haiku로 충분(빠르고 저렴)
var DINING_AI_FOODS = ['한정식', '한우·갈비', '곰탕·국밥', '샤브·전골', '면·만두', '족발·보쌈', '중식', '해물·생선', '뷔페', '카페'];

function handleDiningMatch(body) {
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };

  var text = String((body && body.text) || '').trim();
  if (!text) return { ok: false, error: '원하는 조건을 적어 주세요.' };
  if (text.length > 500) text = text.slice(0, 500);                       // 비용·악용 방지

  var key = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!key) return { ok: false, notConfigured: true, error: 'AI 추천이 아직 설정되지 않았어요. 아래에서 직접 골라 주세요.' };

  var sys = '너는 결혼식 후 하객 식사 자리를 찾는 한국 고객의 자연어 요청을 아래 필터 값으로만 변환한다. '
    + '식당 이름을 지어내지 말고, 각 값은 반드시 보기 중에서만 고른다. 언급이 없는 항목은 "none". '
    + '어르신·부모님·연세·좌식 같은 언급이 있으면 elderly=true. '
    + 'summary는 고객에게 보여줄 한 문장(존댓말, 전각 줄표 사용 금지).\n'
    + 'theme: formal(정찬·한정식·한우·갈비) | casual(국밥·샤브·면·중식·생선·족발·뷔페 등 편한 식사) | cafe(카페·브런치·다과) | none\n'
    + 'price: low(저렴) | mid(보통) | high(고급) | none\n'
    + 'dist: "10"(가까운 곳) | "15" | none\n'
    + 'food: ' + DINING_AI_FOODS.join(' | ') + ' | none\n'
    + 'group: room(단독룸) | seats(단체석) | none\n'
    + 'elderly: true | false';

  var schema = {
    type: 'object',
    properties: {
      theme:   { type: 'string', enum: ['formal', 'casual', 'cafe', 'none'] },
      price:   { type: 'string', enum: ['low', 'mid', 'high', 'none'] },
      dist:    { type: 'string', enum: ['10', '15', 'none'] },
      food:    { type: 'string', enum: DINING_AI_FOODS.concat(['none']) },
      group:   { type: 'string', enum: ['room', 'seats', 'none'] },
      elderly: { type: 'boolean' },
      summary: { type: 'string' }
    },
    required: ['theme', 'price', 'dist', 'food', 'group', 'elderly', 'summary'],
    additionalProperties: false
  };

  var payload = {
    model: DINING_AI_MODEL,
    max_tokens: 400,
    system: sys,
    output_config: { format: { type: 'json_schema', schema: schema } },
    messages: [{ role: 'user', content: text }]
  };

  var resp;
  try {
    resp = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
  } catch (e) {
    return { ok: false, error: 'AI 추천 호출에 실패했어요. 아래에서 직접 골라 주세요.' };
  }
  if (resp.getResponseCode() !== 200) {
    return { ok: false, error: 'AI 추천이 잠시 어려워요. 아래에서 직접 골라 주세요.' };
  }

  var data, txt = '', parsed;
  try {
    data = JSON.parse(resp.getContentText());
    if (data && data.content) {
      for (var i = 0; i < data.content.length; i++) {
        if (data.content[i].type === 'text') { txt = data.content[i].text; break; }
      }
    }
    parsed = JSON.parse(txt);
  } catch (e) {
    return { ok: false, error: '결과를 해석하지 못했어요. 아래에서 직접 골라 주세요.' };
  }

  // 방어적 sanitize — 허용값(='none' 제외)만 통과. AI가 무엇을 뱉어도 우리 축 밖은 버림.
  var f = {};
  if (['formal', 'casual', 'cafe'].indexOf(parsed.theme) >= 0) f.theme = parsed.theme;
  if (['low', 'mid', 'high'].indexOf(parsed.price) >= 0) f.price = parsed.price;
  if (['10', '15'].indexOf(parsed.dist) >= 0) f.dist = parsed.dist;
  if (DINING_AI_FOODS.indexOf(parsed.food) >= 0) f.food = parsed.food;
  if (['room', 'seats'].indexOf(parsed.group) >= 0) f.group = parsed.group;
  if (parsed.elderly === true) f.elderly = true;

  // 고객 노출 문구 세이프넷 — 전각 줄표(—→·)·이모지·마크다운(**·#) 제거(advisor.js와 동일 원칙 · CLAUDE.md 하드룰).
  var sum = String(parsed.summary || '').replace(/—/g, '·').replace(/\*\*/g, '').replace(/[#`]/g, '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\uFE0F]/gu, '').replace(/\s{2,}/g, ' ').trim().slice(0, 120);
  return { ok: true, filters: f, summary: sum };
}
