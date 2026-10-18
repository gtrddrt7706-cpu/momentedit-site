#!/usr/bin/env node
/* ★[REF_OLD_1018 인스타 섹션 검토 10판 91 ~ 106] 참고 예시(assets/ritual-ref.js · 원천 TSV)의 글을 바꾸면 그 전에 칸에 채운 옛 글은 표와 안 맞는다 —
   옛 글을 order-preview.html REF_OLD_1018(줄 아이디마다)에 남겨야 이름 바꾸기(_exMineOld)가 그 칸을 알아본다(하객 맞이 EX_OLD_1006 · ex-old-cover 와 같은 몫).
   origin/main 의 표와 지금 표를 대조한다 — 글이 바뀐 줄은 옛 글이 목록에 있어야 하고, 목록에 든 글은 지금 표 글과 달라야 한다(지금 글을 옛 글로 적으면 안 된다).
   --selftest = 깨 보기(목록에서 하나를 빼면 빨강) · 종료 코드 0 통과 · 1 빠짐 · 2 재지 못함(origin/main 없음) */
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const SELF = process.argv.includes('--selftest');
const rowsOf = (src) => { const m = /window\.RITUAL_REF=(\{[\s\S]*?\});?\s*$/.exec(src.trim()); if (!m) throw new Error('RITUAL_REF 를 못 읽었다'); return JSON.parse(m[1]).rows; };
const oldOf = (html) => { const m = /var REF_OLD_1018=(\{[^\n]*\});/.exec(html); if (!m) throw new Error('REF_OLD_1018 을 못 찾았다'); return JSON.parse(m[1]); };
let base;
try { base = execFileSync('git', ['show', 'origin/main:assets/ritual-ref.js'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); }
catch (e) { console.log('못 쟀다 — origin/main 의 assets/ritual-ref.js 없음'); process.exit(2); }
const now = rowsOf(fs.readFileSync(path.join(ROOT, 'assets/ritual-ref.js'), 'utf8'));
const html = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8');
function check(OLD, baseRows) {
  const bad = [], byId = Object.fromEntries(now.map((r) => [r.id, r]));
  for (const r of baseRows || rowsOf(base)) {
    const n = byId[r.id]; if (!n || n.text === r.text) continue;
    if (!(OLD[r.id] || []).includes(r.text)) bad.push(`${r.id}: 옛 글이 REF_OLD_1018 에 없다 «${r.text.slice(0, 30)}…»`);
  }
  for (const [id, L] of Object.entries(OLD)) for (const t of L) if (byId[id] && byId[id].text === t) bad.push(`${id}: 지금 글을 옛 글로 적었다`);
  return bad;
}
const OLD = oldOf(html);
if (SELF) {
  /* 깨 보기는 main 과 지금 표가 같아도 돌아야 한다 — «main 이 옛 글이었던 판»을 스스로 만든다(한 줄을 옛 글로 되돌린 표) */
  const k = Object.keys(OLD).find((id) => now.some((r) => r.id === id)); const broken = { ...OLD }; delete broken[k];
  const fake = now.map((r) => (r.id === k ? { ...r, text: OLD[k][0] } : r));
  const b = check(broken, fake);
  console.log(`${b.length ? 'ok  ' : 'FAIL'} 깨 보기 — 목록에서 ${k} 를 빼면 빨강(${b.length}건)`);
  process.exit(b.length ? 0 : 1);
}
const bad = check(OLD);
console.log(`비교 — 참고 예시 ${now.length}줄 · 옛 글 목록 ${Object.keys(OLD).length}줄`);
bad.forEach((b) => console.log('FAIL ' + b));
console.log(bad.length ? `REF OLD COVER FAIL ${bad.length}` : 'REF OLD COVER OK — 바뀐 참고 예시 글은 전부 옛 글 목록에 있다');
process.exit(bad.length ? 1 : 0);
