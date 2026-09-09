#!/usr/bin/env node
/* [TYPO_RAMP] index.html 의 «본문·라벨» 글자 크기가 7단계 램프 안에 있는가 — [TYPO_SCALE7] 을 숫자로.
 *
 * 램프: 11 / 12 / 13 / 14 / 16 / 18 / 20 (px) · 반px 금지
 *   (.claude/skills/momentedit-design/SKILL.md 「크기 스케일 — 7단계 고정」)
 *
 * ★★[RAMP_DOMAIN] 램프의 «범위»는 11~20px 이다 — 모든 글자가 아니다.
 *   merge-guard 에 그렇게 적혀 있다: 「본문·라벨 7단계(11~20) · 반px 금지 · 목업 구역 예외」.
 *   그 위(제목·워드마크 26~52px)와 그 아래(아이브로우 8~9px)는 다른 체계다.
 *   ★첫 판에서 이걸 안 걸고 세어 «램프 밖 14종»이 나왔다. 전부 제목·아이브로우였다 —
 *     제품이 틀린 것도, 검사가 틀린 것도 아니고 «검사의 가정이 규칙과 달랐다»(§5-24).
 *
 * ★[RAMP_CANT] 못 재는 것은 «0» 이 아니라 «못 쟀다»로 센다(§10-4).
 *   em·rem·%·var()·calc() 는 부모를 알아야 px 가 나온다. 조용히 통과시키면 「0건」이 거짓이 된다.
 *   ★단, 검사할 것은 «font-size 값»이지 선언 전체가 아니다 — 첫 판에서 색의 var(--sub) 때문에
 *     멀쩡한 font-size:14px 을 「못 쟀다」로 셌다(44자리). 값만 떼어 본다.
 *
 * ★폰 목업(.dm-* · mock*)은 «화면 안의 다른 화면»이라 램프를 안 받는다 — 제외한다.
 *
 * 종료코드: 0 통과 · 1 범위 안 램프 밖 · 반px 발견
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FILE = process.argv[2] || 'index.html';
const RAMP = [11, 12, 13, 14, 16, 18, 20];
const LO = 11, HI = 20;
const SKIP = /(^|[\s,>+~])\.?(dm-|mock|phone-|device-)/i;

const src = fs.readFileSync(path.join(ROOT, FILE), 'utf8');
const decomment = (css) => css.replace(/\/\*[\s\S]*?\*\//g, ' ');

/* ★[RAMP_NO_DEAD] «안 쓰는 규칙은 빼자»를 넣었다가 뺐다 — 한 파일만 보고는 확정할 수 없다.
   실측 오탐: .me-adv-seal · .me-adv-escoffer 를 「죽었다」고 셌는데, 그 클래스는
   assets/advisor-widget.js 가 만든다. index.html 안에만 없었을 뿐 살아 있다.
   ★쓰이는지를 제대로 보려면 저장소 전체(html·js·gs)와 JS 의 문자열 조립까지 봐야 한다.
     그건 이 검사의 몫이 아니다. 못 할 일을 하는 척하느니 «크기만» 세고 판단을 사람에게 넘긴다(§10-4).
   그래서 목업 계열(.mfs 등)도 그냥 보고에 남긴다 — 무엇인지는 보는 사람이 안다. */
const off = [], half = [], outside = [], cant = [];
const take = (sel, value) => {
  const v = value.trim();
  if (/\b(em|rem|%)\b|var\(|calc\(/.test(v)) { cant.push({ sel, v }); return; }
  if (/^0$/.test(v)) return;      // font-size:0 은 «글자를 숨기는 수법»이지 크기가 아니다(--text-only 링크)
  const nums = [...v.matchAll(/(-?\d*\.?\d+)px/g)].map((m) => parseFloat(m[1]));
  if (!nums.length) { cant.push({ sel, v }); return; }
  for (const n of nums) {
    if (!Number.isInteger(n)) half.push({ sel, v, n });          // 반px 은 크기와 무관하게 금지
    else if (n >= LO && n <= HI && !RAMP.includes(n)) off.push({ sel, v, n });
    else if (n < LO || n > HI) outside.push({ sel, v, n });       // 제목·아이브로우 — 정보로만
  }
};

for (const raw of [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1])) {
  for (const m of decomment(raw).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].replace(/\s+/g, ' ').trim();
    if (SKIP.test(sel)) continue;
    for (const d of m[2].matchAll(/font-size\s*:\s*([^;}]+)/gi)) take(sel, d[1]);
  }
}
// 인라인 style="" — «값만» 떼어 본다(선언 전체를 보면 색의 var() 에 걸려 오탐이 난다)
for (const m of src.matchAll(/style\s*=\s*"([^"]*)"/gi)) {
  for (const d of m[1].matchAll(/font-size\s*:\s*([^;"]+)/gi)) take('(인라인 style)', d[1]);
}

const uniq = (a) => [...new Set(a.map((x) => x.n))].sort((x, y) => x - y);
console.log(`[TYPO_RAMP] ${FILE} — 본문·라벨 램프 ${RAMP.join('/')} (범위 ${LO}~${HI}px)`);

let bad = 0;
if (off.length) { bad += off.length;
  console.log(`  ✗ 범위 안인데 램프 밖 ${uniq(off).length}종 · ${off.length}자리 — ${uniq(off).join(' · ')}px`);
  for (const o of off) console.log(`      ${o.n}px  ${o.sel}  { font-size: ${o.v} }`);
} else console.log(`  ✓ 범위(${LO}~${HI}px) 안에서 램프 밖 0건`);

if (half.length) { bad += half.length;
  console.log(`  ✗ 반px ${uniq(half).length}종 · ${half.length}자리 — ${uniq(half).join(' · ')}px`);
  for (const o of half) console.log(`      ${o.n}px  ${o.sel}  { font-size: ${o.v} }`);
} else console.log('  ✓ 반px 0건');

console.log(`  · 범위 밖 ${uniq(outside).length}종(제목·아이브로우 — 다른 체계라 램프를 안 받는다): ${uniq(outside).join(' · ')}px`);
if (cant.length) {
  const u = [...new Set(cant.map((c) => c.v.replace(/\s+/g, ' ')))];
  console.log(`  · 못 쟀다 ${cant.length}자리(${u.length}종) — ${u.join(' · ')}`);
} else console.log('  · 못 쟀다 0건 — 전부 px 로 확정됐다');

process.exit(bad ? 1 : 0);
