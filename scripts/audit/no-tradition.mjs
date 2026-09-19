/* ★★[PAR_NO_TRADITION 2026-09-19 사장님 지시]
 *   *"전통절차는아예없어 삭제해"* · *"이미 다 알고 있어, 갑자기 어디서 튀어나왔는지 모르겠네 —
 *    관련내용 전부 찾아서 삭제 수정해"*
 *
 * 전통 절차(폐백·예단·이바지)가 **고객이 읽는 글**에 다시 나타나지 않는지 잰다.
 *
 * ── 왜 문자열 nochk 로는 안 되나 (사장님이 짚으신 자리)
 *   종전 게이트에 이런 줄이 있었다:
 *     nochk '폐백 등 전통 절차의 진행 여부와 방식은 상담에서' assets/advisor-kb.js
 *   옛 문장 «하나»를 막는 줄이다. 그런데 같은 회피가 **말만 바꿔** 살아 있었다 —
 *   「그 밖의 전통 절차는 디렉터가 상담에서 함께 정리해 드립니다.」
 *   라벨은 「폐백 · 함 같은 전통 절차도 되나요?」라고 물어 놓고 함은 답이 없었다.
 *   ★문자열 하나를 막으면 그 문자열만 피해 간다. 그래서 «낱말»로, «렌더된 글»에서 잰다.
 *
 * ── 주석은 세지 않는다 (이 검사가 스스로를 잡지 않게)
 *   되살리기 금지 근거는 코드 주석에 남겨야 한다(제거 지시 보존 규칙). 그 주석에는
 *   금지 낱말이 들어갈 수밖에 없다. 주석을 세면 근거를 적는 것이 곧 빨강이 되어,
 *   다음 사람이 근거를 지우게 된다 — 규칙이 규칙을 잡아먹는다. 그래서 주석을 걷어내고 잰다.
 *
 * ── 「함」은 세지 않는다
 *   한국어에서 «함»은 조사·어미로 어디에나 나온다(실측 243건). 낱말로 세면 오탐만 나온다.
 *   전통 절차로서의 함은 폐백·예단과 늘 함께 나오므로 그 둘로 충분히 잡힌다.
 *
 * ── AI 가드레일 한 줄은 «허용»이다
 *   api/_ritual-kb.js 의 [실제로 없는 것 · 지어내면 안 되는 것] 은 고객이 읽는 글이 아니라
 *   **AI 에게 「이건 없다」고 알려 주는 목록**이다(「사회자(MC) 옵션은 없다」와 같은 줄).
 *   거기서 지우면 AI 가 「폐백 됩니다」라고 지어낼 수 있다 — 지우는 것이 더 나쁘다.
 *   ★단 «한 줄»만 허용한다. 둘 이상이면 설명이 번지는 것이므로 막는다.
 *
 * ── ⑤ 우리 «계획·연구 문서»도 본다  [PLAN_CLEAN 2026-09-19 사장님 *"구석구석 남아있으면 전부 찾아서 삭제"*]
 *   고객 화면만 지우면 다시 자란다. 실제로 이런 줄들이 남아 있었다:
 *     · 「전통 절차 **수용 여부**」 — 아직 안 정한 항목으로 열려 있었다. 다음 세션이 이걸 근거로 다시 꺼낸다.
 *     · 「…폐백(현장 변수 → **직접 추가**+상담)」 — «직접 추가로 넣을 수 있다»고 적힌 설계 기록이 둘.
 *   CLAUDE.md 의 교훈 그대로다 — «닫힌 항목은 그 자리만 고치면 되살아난다».
 *   ★docs/국가지원금 은 예외다. 거기 폐백은 **외부 웨딩 시장의 통점**(「폐백·이바지의 강요」)이지
 *     우리 상품 설명이 아니고, 신청서가 그걸 근거로 «우리는 그 강요를 없앴다»고 말한다. 지우면 근거가 빈다.
 *
 * ── 종료코드 [CANT_LOOK]  0 통과 · 1 나왔다 · 2 재지 못함
 * 쓰기: node scripts/audit/no-tradition.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const P = (r) => path.join(ROOT, r);
const WORDS = ['폐백', '예단', '이바지', '전통 절차', '전통절차'];
const hit = (t) => WORDS.filter((w) => t.includes(w));

let bad = 0;
const fail = (m) => { console.log(`✗ ${m}`); bad++; };

/* ── ① 어른께 드리는 안내 — 고객이 눈으로 읽는 글 ────────────────────────── */
let html;
try { html = fs.readFileSync(P('parents.html'), 'utf8'); }
catch (e) { console.log(`[NO_TRADITION] ? parents.html 을 못 읽었다 — ${e.message}`); process.exit(2); }
const visible = html
  .replace(/<!--[\s\S]*?-->/g, ' ')          /* 주석 — 되살리기 금지 근거가 여기 산다 */
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ');
const h1 = hit(visible);
if (h1.length) fail(`parents.html 화면 글에 ${h1.join('·')} 가 있다 — 고객이 읽는 자리다`);
else console.log('  ① parents.html 화면 글  ok');

/* ── ② 챗봇 — 라벨과 답변은 고객이 그대로 읽는다 ─────────────────────────── */
let kb;
try { kb = fs.readFileSync(P('assets/advisor-kb.js'), 'utf8'); }
catch (e) { console.log(`[NO_TRADITION] ? advisor-kb.js 를 못 읽었다 — ${e.message}`); process.exit(2); }
const said = [...kb.matchAll(/\b(?:label|answer|q|a)\s*:\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]);
if (!said.length) { console.log('[NO_TRADITION] ? 챗봇에서 문구를 한 줄도 못 뽑았다 — 모양이 바뀌었다'); process.exit(2); }
const h2 = said.filter((t) => hit(t).length);
if (h2.length) { fail(`챗봇 문구 ${h2.length}곳에 전통 절차가 있다:`); h2.forEach((t) => console.log(`    ${t.slice(0, 70)}`)); }
else console.log(`  ② 챗봇 문구 ${said.length}줄  ok`);

/* ── ③ 식순 KB — 가드레일 한 줄만 ──────────────────────────────────────── */
let rk;
try { rk = fs.readFileSync(P('api/_ritual-kb.js'), 'utf8'); }
catch (e) { console.log(`[NO_TRADITION] ? _ritual-kb.js 를 못 읽었다 — ${e.message}`); process.exit(2); }
const lines = rk.split('\n').filter((l) => hit(l).length);
if (lines.length > 1) { fail(`식순 KB 에 전통 절차가 ${lines.length}줄 — 가드레일 한 줄만 둔다:`); lines.forEach((l) => console.log(`    ${l.trim().slice(0, 78)}`)); }
else if (lines.length === 1 && !/지어내지 않는다/.test(lines[0])) fail(`식순 KB 의 그 한 줄이 가드레일이 아니다: ${lines[0].trim().slice(0, 70)}`);
else console.log(`  ③ 식순 KB  ok (가드레일 ${lines.length}줄)`);

/* ── ④ 되살리기 금지 근거가 살아 있나 ──────────────────────────────────── */
if (!html.includes('PAR_NO_TRADITION')) fail('parents.html 에 PAR_NO_TRADITION 근거 주석이 없다 — 지우면 다음 판이 되살린다');
else console.log('  ④ 되살리기 금지 근거  ok');

/* ── ⑤ 우리 계획·연구 문서 — 고객 화면만 지우면 다시 자란다 ─────────────── */
const OURS = 'docs/plans';
const SKIP_DIR = 'docs/국가지원금';   /* 외부 시장 통점 자료 — 우리 상품 설명이 아니다 */
const walk = (d, out = []) => {
  let ents = [];
  try { ents = fs.readdirSync(P(d), { withFileTypes: true }); } catch (e) { return out; }
  for (const e of ents) {
    const r = `${d}/${e.name}`;
    if (r.startsWith(SKIP_DIR)) continue;
    if (e.isDirectory()) walk(r, out);
    else if (/\.(md|json|txt)$/.test(e.name)) out.push(r);
  }
  return out;
};
const dirty = [];
for (const r of walk(OURS)) {
  let t = '';
  try { t = fs.readFileSync(P(r), 'utf8'); } catch (e) { continue; }
  /* ★[PLAN_CLEAN] 되살리기 금지 근거 줄은 세지 않는다 — ④ 와 같은 원칙이다.
     「전통 절차는 넣지 않는다」고 적으려면 그 낱말을 써야 한다. 그 줄을 빨강으로 만들면
     다음 사람이 근거를 지우게 된다. 그래서 PAR_NO_TRADITION 표식이 달린 줄만 면제한다. */
  t = t.split('\n').filter((l) => !l.includes('PAR_NO_TRADITION')).join('\n');
  const h = hit(t);
  if (h.length) dirty.push([r, h]);
}
if (dirty.length) {
  fail(`우리 계획·연구 문서 ${dirty.length}곳에 전통 절차가 남아 있다:`);
  for (const [r, h] of dirty) console.log(`    ${r}  (${h.join('·')})`);
  console.log('  ★문서에 남으면 다음 세션이 그걸 근거로 다시 꺼냅니다 — 열린 결정 항목이 특히 그렇습니다.');
} else console.log('  ⑤ 계획·연구 문서  ok');

if (bad) { console.log(`\n[NO_TRADITION] ✗ ${bad}곳`); process.exit(1); }
console.log('\n[NO_TRADITION] ok — 고객이 읽는 글에 전통 절차 0건');
