// [DESIGN_MD_POINTER 2026-10-05] 루트 DESIGN.md 의 색 값이 index.html :root 와 같은가 — 요약본이 정본과 갈라지면 빨강.
// [HOVER_GOLD_TEXT 2026-10-05 · impeccable detect 로 찾음] 고객 면에서 마우스를 올렸을 때 글자가 장식 골드(#b89a75 · 2.5:1)로 바뀌는 자리가 없는가.
//   골드빛 글자는 --gold-text(index 등) · --gold-deep(mypage) 로만(momentedit-design «골드 2값 분리»).
// 종료 0 통과 · 1 실패
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
/* ① DESIGN.md ↔ index.html :root */
const dm = read('DESIGN.md'), idx = read('index.html');
const root = (idx.match(/:root\s*\{[\s\S]*?\n\}/) || [''])[0];
const MAP = { canvas: '--bg', 'canvas-2': '--bg2', 'canvas-3': '--bg3', ink: '--text', sub: '--sub', light: '--light', accent: '--accent', seal: '--seal', gold: '--gold', 'gold-text': '--gold-text', border: '--border', 'footer-bg': '--footer-bg', 'footer-text': '--footer-text' };
const bad = [];
for (const [k, v] of Object.entries(MAP)) {
  const a = (dm.match(new RegExp('^\\s*' + k + ':\\s*"(#[0-9a-fA-F]{3,8})"', 'm')) || [])[1];
  const b = (root.match(new RegExp(v.replace(/-/g, '\\-') + ':\\s*(#[0-9a-fA-F]{3,8})')) || [])[1];
  if (!a || !b || a.toLowerCase() !== b.toLowerCase()) bad.push(`${k}=${a || '없음'} / ${v}=${b || '없음'}`);
}
ok('DESIGN.md 색 13개 = index.html :root [DESIGN_MD_POINTER]', bad.length === 0, bad.join(' · '));
ok('DESIGN.md 가 정본(momentedit-design)을 가리킨다', /momentedit-design/.test(dm) && /DESIGN_AUTHORITY/.test(dm));
ok('PRODUCT.md 가 있다', fs.existsSync(path.join(ROOT, 'PRODUCT.md')));
/* ② hover 골드 글자 */
const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html') && !/^(__|listen-)/.test(f) && f !== 'admin.html');
const hits = [];
for (const f of pages) { const s = read(f); for (const m of s.matchAll(/([^{}]*:hover[^{}]*)\{([^}]*)\}/g)) {
  if (/(?<![-\w])color\s*:\s*(var\(--gold\)|#b89a75)/i.test(m[2])) hits.push(f + ':' + (s.slice(0, m.index).split('\n').length + 1) + ' ' + m[1].trim().slice(-50)); } }
ok(`고객 면 ${pages.length}개 — 마우스를 올려도 글자가 장식 골드로 바뀌지 않는다 [HOVER_GOLD_TEXT]`, hits.length === 0, hits.slice(0, 5).join(' | '));
console.log(fail ? `\n결과 — 실패 ${fail}` : '\n결과 — 전부 통과');
process.exit(fail ? 1 : 0);
