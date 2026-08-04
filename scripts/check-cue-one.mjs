#!/usr/bin/env node
/* [CUE_ONE] 스크롤 표시가 정말 '한 벌'인지 기계로 확인한다 (2026-08-04).
 *
 * 왜 grep 개수로 안 세는가 —
 *   개수는 "있다"만 말한다. 이 화면의 요구는 "**같다**"였다(사용자: "하나를왜남겨? 전부똑같이",
 *   "차라리 해당 스크롤 표시를 전체적으로 통일되게하고 위치도 동일하게").
 *   숫자 하나만 어긋난 판이 생겨도 개수 검사는 통과한다 — 그래서 값 자체를 맞대어 본다.
 *
 * 무엇을 보는가 —
 *   ① 청첩장 16장: [CUE_GLIDE] 블록이 **글자까지 동일**한가(한 판만 손대면 여기서 걸린다)
 *   ② animation:none 이 살아 있는가
 *      ★옛 fadeInUp(지연 2.4s·forwards)이 남아 있으면 애니메이션이 전환을 이겨,
 *        사라질 때 위치만 흐르고 불투명도는 뚝 끊긴다(실측: transform 1.15s / opacity 0ms).
 *   ③ 등장·퇴장 리듬(0.5s / 2.2s)과 스크롤 즉시 퇴장(CUE_OFFSCROLL)이 16장 모두에 있는가
 *   ④ 갤러리가 직접 만드는 큐(안내 카드용)와 하객 안내 두 판이 같은 숫자를 쓰는가
 *      — 갤러리에서 좌우로 넘기면 이 화면들도 한 카드로 지나간다. 거기서만 다르면 줄이 끊긴다.
 *
 * 실패하면 무엇을 하나 — 어긋난 파일과 값을 찍는다. 값을 되돌리거나, 바꿀 거면 **전부** 바꾼다.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => readFileSync(join(ROOT, p), 'utf8');

const INVITES = [];
for (let i = 1; i <= 8; i++) INVITES.push(`i/cover-0${i}.html`);
for (let i = 1; i <= 8; i++) INVITES.push(`i-family/family-0${i}.html`);

const bad = [];
const note = (f, msg) => bad.push(`${f} — ${msg}`);

// ── ① [CUE_GLIDE] 블록이 16장에서 글자까지 같은가
const START = '/* [CUE_GLIDE';
const END = 'transition:opacity 1.15s cubic-bezier(.37,0,.63,1),transform 1.15s cubic-bezier(.37,0,.63,1)}';
const blocks = new Map();
for (const f of INVITES) {
  if (!existsSync(join(ROOT, f))) { note(f, '파일이 없다'); continue; }
  const s = R(f);
  const a = s.indexOf(START);
  const b = s.indexOf(END, a);
  if (a < 0 || b < 0) { note(f, '[CUE_GLIDE] 블록이 없다'); continue; }
  const block = s.slice(a, b + END.length).replace(/\r/g, '');
  blocks.set(f, block);

  if (!/animation:none;/.test(block)) note(f, 'animation:none 이 빠졌다 — 옛 fadeInUp 이 전환을 이겨 불투명도가 뚝 끊긴다');
  if (!s.includes('CUE_OFFSCROLL')) note(f, '스크롤 즉시 퇴장(CUE_OFFSCROLL)이 없다');
  if (!s.includes("el.classList.add('in'); }, 500)")) note(f, '등장 시점(0.5s)이 다르다');
  if (!s.includes("el.classList.add('hidden'); }, 500 + 2200)")) note(f, '퇴장 시점(2.2s)이 다르다');
}
const uniq = [...new Set(blocks.values())];
if (uniq.length > 1) {
  const first = blocks.values().next().value;
  for (const [f, v] of blocks) if (v !== first) note(f, '[CUE_GLIDE] 블록이 다른 판과 다르다 — 한 판만 손대면 줄이 끊긴다');
}

// ── ② 한 벌의 숫자 — 갤러리가 만드는 큐 · 하객 안내 두 판도 같은 값을 쓰는가
const SHARED = [
  // 청첩장 16장은 var(--cue-bottom,80px), 나머지는 80px 을 직접 쓴다 — 값이 80 이면 같은 자리다
  ['자리 80px', /bottom:calc\((?:var\(--cue-bottom,)?80px\)?\s*\+\s*env\(safe-area-inset-bottom/],
  ['알약 배경 .42', /rgba\(250,250,248,\.42\)/],
  ['알약 여백 9/20/11', /padding:9px 20px 11px/],
  ['라벨 10.5px', /font-size:10\.5px/],
  ['라벨 자간 .13em', /letter-spacing:\.?0?\.13em/],
  ['선 22px', /height:22px/],
  ['선 리듬 cueDrip 2.1s', /cueDrip 2\.1s cubic-bezier\(0\.4,0,0\.2,1\) infinite/],
  ['등장 0.95s', /\.95s cubic-bezier\(\.22,\.61,\.36,1\)/],
  ['퇴장 1.15s', /1\.15s cubic-bezier\(\.37,0,\.63,1\)/],
  ['가라앉는 거리 9px', /translateY\(9px\)/],
];
for (const f of ['invitation-gallery.html', 'guide.html', 'i/invitations/invitation-09-guide.html', ...INVITES.slice(0, 1)]) {
  if (!existsSync(join(ROOT, f))) { note(f, '파일이 없다'); continue; }
  const s = R(f);
  for (const [what, re] of SHARED) if (!re.test(s)) note(f, `${what} 이(가) 한 벌 값과 다르다`);
}

// ── ③ 되살아나면 안 되는 옛 값
const GONE = [
  ['guide.html', /gScrollDrop/, '옛 리듬 gScrollDrop'],
  ['i/invitations/invitation-09-guide.html', /gdScrollBounce/, '옛 리듬 gdScrollBounce'],
  ['i/cover-01.html', /let scrollFaded/, '죽은 scrollEl 리스너(ReferenceError)'],
  ['i-family/family-05.html', /let scrollFaded/, '죽은 scrollEl 리스너(ReferenceError)'],
];
for (const [f, re, what] of GONE) if (existsSync(join(ROOT, f)) && re.test(R(f))) note(f, `${what} 이(가) 되살아났다`);

if (bad.length) {
  console.error('[CUE_ONE] 스크롤 표시가 한 벌이 아니다:');
  for (const b of bad) console.error('  ✗ ' + b);
  process.exit(1);
}
console.log(`[CUE_ONE] ok — 청첩장 ${INVITES.length}장 + 갤러리 + 하객 안내 2판이 같은 한 벌`);
