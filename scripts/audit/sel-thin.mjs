#!/usr/bin/env node
/* ★★[SEL_THIN 2026-10-11 사장님 «버튼 테두리 골드색 그거 좀 얇게 하는 건 어때?» → 시안 A «추천대로»]
   «고른 표시»(칩 · 카드 · 토글 · 사진 칸)는 짙은 금 테 한 겹(바깥 1px)이다 — 안쪽 1px 를 더 그린 «두 겹»(실제 2px)과 2px 테는 걷었다.
   식순 화면 · 마이페이지의 CSS 규칙을 읽어
     · 고른 상태 선택자(.on · .sel · .rep · .selected · [aria-pressed|checked|selected="true"])이면서
     · 짙은 금(--gold-deep) 테두리와 짙은 금 그림자 테를 함께 쓰거나(두 겹) · 짙은 금 그림자 테가 2px 이상이면
   빨강이다. 포커스(:focus · :focus-visible · :focus-within)는 역할이 달라 보지 않는다(입력칸 초점 두 겹 FOCUS_ONE 은 그대로).
   ★스스로 깨 본다 — 두 겹 · 2px 가짜 규칙을 잡아야 하고, 고른 금빛 규칙을 너무 적게 찾으면(읽기가 깨진 것) 빨강이다. */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const FILES = ['order-preview.html', 'mypage.html'];
const MIN_FOUND = 12;   // 지금 약 16 — 0 이 되면 조용히 통과하지 않게

const SEL = /\.(on|sel|rep|selected)\b|\[aria-(pressed|checked|selected)="true"\]/;
const FOCUS = /:focus/;
const GOLD = /var\(--gold-deep\)/;

/* <style> 안 글만 · 주석을 지우고 가장 안쪽 «선택자{선언}»을 꺼낸다(@media 안 규칙도 같이 나온다) */
export function rules(html) {
  const out = []; const st = /<style[^>]*>([\s\S]*?)<\/style>/g; let m;
  while ((m = st.exec(html))) {
    const css = m[1].replace(/\/\*[\s\S]*?\*\//g, ''); const re = /([^{}]+)\{([^{}]*)\}/g; let r;
    while ((r = re.exec(css))) out.push({ sel: r[1].trim(), decl: r[2] });
  }
  return out;
}
/* 고른 상태에 짙은 금을 쓰는 규칙 · 판정 */
export function judge(list) {
  const found = [], bad = [];
  for (const r of list) {
    const sels = r.sel.split(',').map((x) => x.trim()).filter((x) => SEL.test(x) && !FOCUS.test(x));
    if (!sels.length || !GOLD.test(r.decl)) continue;
    found.push(r);
    const bc = /border(-color)?\s*:[^;]*var\(--gold-deep\)/.test(r.decl);
    const sh = (r.decl.match(/box-shadow\s*:([^;]*)/) || [])[1] || '';
    if (!GOLD.test(sh)) continue;
    const w = Math.max(0, ...[...sh.matchAll(/0\s+0\s+0\s+(\d+(?:\.\d+)?)px/g)].map((x) => +x[1]));
    if (bc) bad.push({ sel: r.sel, why: '두 겹 — 짙은 금 테두리 + 짙은 금 그림자 테' });
    else if (w >= 2) bad.push({ sel: r.sel, why: `짙은 금 그림자 테 ${w}px` });
  }
  return { found, bad };
}

const direct = !!process.argv[1] && /sel-thin\.mjs$/.test(process.argv[1]);
if (direct) {
  let fail = 0, n = 0;
  for (const f of FILES) {
    const p = path.join(ROOT, f); if (!fs.existsSync(p)) { console.log('FAIL 파일 없음 ' + f); fail++; continue; }
    const { found, bad } = judge(rules(fs.readFileSync(p, 'utf8')));
    n += found.length;
    for (const b of bad) { fail++; console.log(`FAIL ${f} ${b.sel.slice(0, 90)} — ${b.why}`); }
  }
  if (n < MIN_FOUND) { fail++; console.log(`FAIL 고른 금빛 규칙을 ${n}개밖에 못 찾았다(기준 ${MIN_FOUND}) — 읽기가 깨졌는지 본다`); }
  /* 스스로 깨 보기 — 두 겹 · 2px 는 잡고 · 한 겹 · 포커스는 놓아준다 */
  const probe = judge(rules('<style>.a.on{border-color:var(--gold-deep);box-shadow:inset 0 0 0 1px var(--gold-deep)}.b[aria-checked="true"]{border-color:var(--gold-deep);box-shadow:0 0 0 1px var(--gold-deep) inset}.c.on .x{box-shadow:0 0 0 2px var(--gold-deep)}.d.sel{border-color:var(--gold-deep)}.e:focus{border-color:var(--gold-deep);box-shadow:inset 0 0 0 1px var(--gold-deep)}.f.on{box-shadow:inset 0 0 0 1px var(--gold-deep)}</style>'));
  const pb = probe.bad.map((b) => b.sel.trim()[1]).join('');
  if (pb !== 'abc') { fail++; console.log(`FAIL 스스로 깨 보기 — 두 겹 a · b · 2px c 만 잡아야 하는데 «${pb}»`); }
  console.log(fail ? `✗ SEL_THIN 실패 ${fail}건` : `ok sel-thin — 고른 표시 ${n}곳 · 전부 짙은 금 테 한 겹(두 겹 · 2px 없음)`);
  process.exit(fail ? 1 : 0);
}
