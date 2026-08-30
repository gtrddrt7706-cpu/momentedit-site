// 교육 초안 생성 — 관리자 «원클릭»이 부른다. 답이 갈렸거나 막힌 질문 하나를 받아,
// **KB·핵심정보에 실제로 적힌 것만 근거로** 정답 초안을 쓴다.
//
// ★★[KB_DRAFT 2026-08-17 사용자 지시 "원클릭 버튼 누르면 ai가 자동으로 관련시스템을 파악후
//   나에게 «이렇게 대답하면 맞을까요?» … 그대로진행할지 수정부분 체크한뒤 다시 학습"]
//
// ★이 엔드포인트가 하지 «못하는» 것을 분명히 해 둔다 — 여기서 거짓 기대가 생기면 사고가 난다.
//   이 서버는 저장소 코드를 읽지 못한다(Vercel 런타임에 소스 검색 기능이 없다).
//   즉 «관련 시스템을 파악»한다는 말의 실제 범위는 **KB(_kb.js) + 핵심정보(핵심정보 시트) + 교육 노트**다.
//   그 셋에 없는 사실은 **지어내지 말고 «근거 없음»으로 돌려보낸다** — 그게 이 파일의 존재 이유다.
//   (2026-08-17 사고: 「마이」가 «청첩장에 개인 사진 넣을 수 있다»고 없는 기능을 지어냈다.
//    초안 생성기가 같은 짓을 하면, 그 거짓이 «승인된 교육»이 되어 전 직원에 영구히 박힌다.)
//
// 반환: { ok, draft, grounded:boolean, basis:'인용문', note }
//   grounded=false 면 관리자 화면이 «근거 없음 — 사장님이 사실을 알려주세요»로 표시한다(초안 미제시).
const KB = require('./_kb');
const getFacts = require('./_facts');
const getNotes = require('./_kbnotes');
const rateLimit = require('./_ratelimit');

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-5';
const MAX_Q = 300;

const SYS = `너는 모먼트에디트의 «지식 정리 담당»이다. 고객에게 직접 답하지 않는다.
사장이 검토할 **교육 초안**을 쓴다.

[절대 규칙]
1. 아래 «근거 자료»에 **명시적으로 적힌 것만** 쓴다. 적혀 있지 않으면 추론·상식·일반적인 웨딩업계 관행으로 채우지 마라.
2. 근거가 없으면 draft 를 쓰지 말고 grounded=false 로 답한다. **모르는 것을 아는 척하는 것이 이 시스템에서 가장 큰 사고다.**
3. 근거가 있으면 그 근거 문장을 basis 에 **그대로 인용**한다(요약·의역 금지).
4. draft 는 고객에게 그대로 나갈 문장이다: 존댓말·간결·2~4문장. 이모지 금지. 전각 줄표(—) 금지.
5. 할 수 없는 것을 물으면 «안 된다»를 분명히 말하고, 대신 할 수 있는 것을 한 가지 안내한다.

[출력 형식 — JSON 한 덩어리만]
{"grounded": true|false, "draft": "...", "basis": "근거 문장 그대로", "note": "사장이 알아야 할 한 줄(없으면 빈 문자열)"}`;

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ ok: false, error: 'method' }); return; }
  /* ★★[KB_DRAFT_RATE 2026-08-30 보안 점검에서 잡음] 이 가드는 **한 번도 작동한 적이 없었다.**
     _ratelimit 의 실제 시그니처는 `rateGate(req, perMin, per6h, key)` → **불리언**인데,
     초판은 ①두 번째 인자로 객체를 넘겨 perMin 자리에 객체가 들어갔고(숫자 비교가 전부 false)
     ②반환값을 `rl.limited` 로 읽어(불리언에 그런 속성이 없어 undefined) 조건이 영영 성립하지 않았다.
     실측: 같은 IP 로 200회 연속 호출 → 차단 0 · 통과 200(정상 호출은 30회 뒤 차단).
     이 엔드포인트는 호출 1회당 Claude API 비용이 나가므로 그대로 두면 비용이 무제한으로 샌다.
     ★관리자 원클릭용이라 빈도가 낮다 — 분당 3 · 6시간 30 이면 정상 사용은 닿지 않는다(faq-draft 와 같은 급).
     ★인증(공유 시크릿)은 GAS 호출부(_aiPost_)가 아직 시크릿을 싣지 않아 여기서 요구하면 기능이 죽는다 →
       양쪽 동시 변경이 필요해 결정 대기함으로 넘겼다. 그때까지는 이 레이트 가드가 유일한 방어다. */
  if (!rateLimit(req, 3, 30)) { res.status(429).json({ ok: false, error: '잠시 후 다시 시도해 주세요.' }); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  body = body || {};

  const q = String(body.question || '').trim().slice(0, MAX_Q);
  if (!q) { res.status(400).json({ ok: false, error: '질문이 없습니다.' }); return; }
  // 직원들이 실제로 뭐라고 답했는지(갈린 답) — 초안이 그 오답을 반복하지 않게 보여 준다
  const said = Array.isArray(body.answers) ? body.answers.slice(0, 5) : [];

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { res.status(500).json({ ok: false, error: 'API 키 미설정' }); return; }

  let facts = '', notes = '';
  try { facts = await getFacts(); } catch (e) {}
  try { notes = await getNotes(); } catch (e) {}

  const basis = [
    '## 서비스 사실 지식(KB)', KB,
    facts ? '\n## 핵심정보(관리자가 고친 최신 사실 — KB보다 우선)\n' + facts : '',
    notes ? '\n## 기존 교육 노트\n' + notes : '',
  ].join('\n');

  const userMsg = [
    '[고객 질문]', q,
    said.length ? ('\n[직원들이 실제로 한 답 — 서로 갈렸다. 이 중 근거 없는 것은 따라 쓰지 마라]\n'
      + said.map((a) => `- ${a.surface || '?'}: ${String(a.text || '').slice(0, 200)}`).join('\n')) : '',
    '\n[근거 자료]\n' + basis,
  ].join('\n');

  try {
    const r = await fetch(API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 900, system: SYS, messages: [{ role: 'user', content: userMsg }] }),
    });
    if (!r.ok) { res.status(502).json({ ok: false, error: '생성 실패(' + r.status + ')' }); return; }
    const j = await r.json();
    const raw = String((j.content && j.content[0] && j.content[0].text) || '').trim();
    let out = null;
    try { out = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, '')); } catch (e) {}
    if (!out || typeof out !== 'object') { res.status(200).json({ ok: true, grounded: false, draft: '', basis: '', note: '초안 형식을 읽지 못했어요 · 다시 시도해 주세요.' }); return; }
    res.status(200).json({
      ok: true,
      grounded: out.grounded === true && String(out.draft || '').trim() !== '',
      draft: String(out.draft || '').slice(0, 800),
      basis: String(out.basis || '').slice(0, 400),
      note: String(out.note || '').slice(0, 200),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: '생성 중 오류' });
  }
};
