/* [CANT_LOOK] 0=통과 1=재서 틀림 2=못 잼 — 가격이 한 몸으로 움직이는가 [PRICE_SYNC]
 *
 * ★왜 만드나 (2026-08-14 인상 작업)
 *   같은 가격이 화면·계약서·AI 지식·관리자 드롭다운·구조화 데이터에 **열 곳 넘게** 사본으로 산다.
 *   한 곳만 고치면 고객은 280만을 보고 계약서는 330만을 말하거나, AI 상담사가 옛 가격을 답한다.
 *   금액은 조용히 틀리면 안 되는 값이라, 사람 기억 대신 게이트가 대조한다.
 *
 * ★단일 출처 = automation/platform/70_journey.gs 의 PRICING. 여기서 읽어 나머지를 맞춰 본다.
 * ★인상 전 금액(구가)이 남아 있어도 되는 곳은 둘뿐이다 — 계약서 보존본(archive/)과
 *   관리자 드롭다운의 '(인상 전)' 항목. 그 밖에서 구가가 보이면 옮겨 적기를 빠뜨린 것이다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const bad = [];

/* ── 단일 출처에서 읽는다 ── */
const src = R('automation/platform/70_journey.gs');
const m = src.match(/'시그니처':\s*\{\s*평일:\s*(\d+),\s*주말:\s*(\d+)\s*\}/);
if (!m) { console.log('못 잼: 70_journey.gs 에서 PRICING 을 못 읽었다'); process.exit(2); }
const WD = Number(m[1]), WE = Number(m[2]);
const man = (n) => String(n / 10000);                       // 2400000 → '240'
const comma = (n) => n.toLocaleString('en-US');             // 2400000 → '2,400,000'
const deposit = (n) => n / 10 - 100000;                     // 계약금 10% − 예약금 10만
console.log(`  · 단일 출처 — 주말 ${comma(WE)} / 평일 ${comma(WD)} · 계약 시 납입 ${comma(deposit(WE))} / ${comma(deposit(WD))}`);

/* ── 사본들 — [파일, 반드시 있어야 할 문자열들] ── */
const MUST = [
  /* ★[PRICE_MISS_INDEX 2026-08-15] 이 목록에 없던 자리 셋이 실제로 안 바뀐 채 라이브에 남았다 —
     게이트는 초록인데 화면엔 옛 가격이 보였다(390/1280 실렌더로 잡음). 세 자리는 꼴이 서로 달라
     한 패턴으로 안 걸린다: ①JSON-LD 의 `"price":"…"` (따옴표 사이 공백 없음)
     ②`&nbsp;` 가 낀 산문 ③`<strong>` 로 감싼 FAQ 본문. 셋 다 여기 박아 다시는 안 새게 한다. */
  ['index.html', [`평일 ${man(WD)}만·주말 ${man(WE)}만`, `"price": "${WE}"`, `"price": "${WD}"`,
    /* ★[CORE_PRICE_LINK 2026-08-16] 핵심 구성 카드의 이 산문은 「만」과 「원」 사이에도 nbsp 가 있다.
       좁은 칸에서 「원」 한 글자만 다음 줄로 떨어져 밑줄이 끊기던 것을 막는 조치다(1180px 실렌더).
       ★보이는 글자는 그대로 「250만 원」이다 — 이 검사가 보는 것은 **금액 값**이지 nbsp 자리가 아니다.
         가격이 바뀌면 여전히 여기서 걸린다. */
    `"price":"${WD}"`, `평일&nbsp;${man(WD)}만&nbsp;원·주말&nbsp;${man(WE)}만&nbsp;원`,
    `평일결혼식 <strong>${man(WD)}만 원</strong>`,
    `&#8361;${comma(WE)}`, `&#8361;${comma(WD)}`,
    `주말·공휴일 ${man(WE)}만 원, 평일결혼식 ${man(WD)}만 원`,
    `주말·공휴일 ${comma(deposit(WE))}원 / 평일 ${comma(deposit(WD))}원`]],
  ['inquiry.html', [`&#8361;${comma(WE)}`, `&#8361;${comma(WD)}`, `주말 ₩${comma(WE)} / 평일 ₩${comma(WD)}`]],
  ['automation/consultation/ScreenA_apply.html', [`&#8361;${comma(WE)}`, `&#8361;${comma(WD)}`]],
  ['contract/v1-1.html', [`주말·공휴일 ${man(WE)}만원 / 평일 ${man(WD)}만원`,
    `<strong>${comma(WE)}원</strong>`, `<strong>${comma(WD)}원</strong>`,
    `주말·공휴일 ${comma(deposit(WE))}원 · 평일 ${comma(deposit(WD))}원`]],
  ['api/_kb.js', [`주말·공휴일 올인원 패키지: ${man(WE)}만원`, `평일결혼식 올인원 패키지: ${man(WD)}만원`,
    `주말·공휴일 ${comma(deposit(WE))}원`, `평일 ${comma(deposit(WD))}원`]],
  ['assets/advisor-kb.js', [`주말·공휴일 ${man(WE)}만원, 평일결혼식 ${man(WD)}만원`,
    `주말 ${comma(deposit(WE))}원·평일 ${comma(deposit(WD))}원`]],
  ['admin.html', [`value="${WE}"`, `value="${WD}"`]],
  ['automation/admin/Admin.html', [`value="${WE}"`, `value="${WD}"`]],
];
for (const [f, needles] of MUST) {
  let s; try { s = R(f); } catch { bad.push(`${f}: 파일을 못 읽었다`); continue; }
  for (const n of needles) if (s.indexOf(n) < 0) bad.push(`${f}: 「${n}」 가 없다 — 옮겨 적기를 빠뜨렸다`);
}

/* ── 구가가 남아 있으면 안 되는 곳 (보존본·'(인상 전)' 항목은 예외) ── */
/* ★[PRICE_OLD_TWO 2026-08-16] 인상이 두 번이라 구가도 둘이다 — 240 을 빼 두면 아무도 안 본다.
   실사고: ScreenA_apply 의 meta 셋(description·og·twitter)이 ₩2,400,000 인 채 남았는데
   게이트는 초록이었다. 그 파일은 엔티티 표기(&#8361;…)만 대조하고 있었고, 구가 목록엔 240 이 없었다.
   메타는 검색 결과·링크 미리보기로 나가는 «고객 노출 문구»다(문구 규칙이 '메타'를 명시). */
const OLD = [2800000, 2100000, 2400000].filter((v) => v !== WE && v !== WD);
const SCAN = ['index.html', 'inquiry.html', 'contract/v1-1.html', 'api/_kb.js', 'assets/advisor-kb.js',
  'automation/consultation/ScreenA_apply.html', 'docs/smartstore/상세페이지_원본.html'];
for (const f of SCAN) {
  let s; try { s = R(f); } catch { continue; }
  for (const o of OLD) {
    for (const form of [comma(o), String(o), `${man(o)}만`]) {
     /* ★첫 자리만 보지 않는다 — 한 파일에 사본이 여러 개라, 첫 개가 면제되면 나머지가 통째로 숨는다 */
     for (let i = s.indexOf(form); i >= 0; i = s.indexOf(form, i + 1)) {
      const line = s.slice(s.lastIndexOf('\n', i) + 1, s.indexOf('\n', i));
      /* 근거를 적어 둔 자리는 봐준다 — 근거 주석은 보통 **윗줄**에 있으므로 앞 400자까지 함께 본다.
         (그 줄만 보면 제 근거 주석을 제 발로 밟는다 — merge-guard 의 nochk 에서 두 번 겪은 일이다) */
      const around = s.slice(Math.max(0, i - 400), i + 120);
      if (/인상 전|PRICE_2026_08|보존|archive/.test(line) || /인상 전|PRICE_2026_08/.test(around)) continue;
      bad.push(`${f}: 인상 전 금액 「${form}」 이 남아 있다 — ${line.trim().slice(0, 90)}`);
     }
    }
  }
}

bad.forEach((b) => console.log('  ✖ ' + b));
console.log(bad.length ? `틀림 ${bad.length}건` : '가격 사본 전부 일치');
process.exit(bad.length ? 1 : 0);
