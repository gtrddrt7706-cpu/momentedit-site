// ★★[LOCKUP_SAID 2026-08-10] 히어로 자물쇠 — **적어 둔 숫자와 실제 값이 같은가**
//
//   node scripts/check-hero-lockup.mjs
//
// ■ 왜 이 검사가 생겼나 — 세 번 같은 일이 났다
//   폰·PC 사이 간격을 30 → 22 → 18 → 13 으로 옮기는 동안, **코드는 세 번 다 맞았고
//   설명만 낡았다.** 커밋 제목이 "폰만 22px", 본문이 "PC 30px 은 손대지 않았다",
//   가드 주석이 "0.80배(폰 18 · PC 28)" — 전부 그 시점의 실제 값과 달랐다.
//   값이 틀린 것보다 **틀린 채 남은 설명이 오래 해롭다.** 다음 사람이 그 설명을 근거로
//   "PC 는 28 이어야 하는데" 하고 되돌린다.
//
// ■ 그래서 습관이 아니라 검사로 바꾼다
//   "패치 내기 전에 눈으로 대조하자"는 세 번 다 지켜지지 않았다. 사람이 기억해야 하는 규칙은
//   기억이 끊기는 날 조용히 사라진다. 여기서는 기계가 매번 대조한다.
//   ★이 검사는 브라우저도 서버도 필요 없다(파일만 읽는다) → merge-guard 가 그냥 돌릴 수 있다.
//     check-tap-targets 를 게이트에 못 넣는 이유(로컬 서버 필요)와 다른 점이다.
//
// ■ 무엇을 보나
//   실제 값 : .hero-logo-eyebrow 의 PC margin 과 ≤680px 안의 margin-top
//   적은 값 : index.html 히어로 주석 · merge-guard 의 chk 줄에 적힌 「폰 N · PC M」 꼴 전부
//   둘이 다르면 실패. 어느 쪽이 맞는지는 사람이 정한다 — 검사는 **갈렸다는 사실**만 말한다.
//   ★설명을 지워서 통과시키지 말 것. 그러면 다음 사람이 근거 없이 이 값을 만진다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const gd = fs.readFileSync(path.join(ROOT, 'automation/tests/merge-guard.sh'), 'utf8');

let bad = 0;
const no = (m) => { console.error('✗ ' + m); bad++; };
process.on('exit', (c) => { if (bad && c === 0) process.exitCode = 1; });   // [EXIT_TRAP]

/* ── 1) 실제 값 ─────────────────────────────────────────────
   ★못 찾으면 통과가 아니라 실패다. 선택자 이름이 바뀌면 이 검사는 아무것도 못 보는데,
     그때 조용히 초록이면 '검사가 있다'는 착각만 남는다. */
const pcM = /\.hero-logo-eyebrow\s*\{[^}]*?\bmargin:\s*(\d+)px\s+0\s+0/.exec(idx);
const moM = /@media\s*\(max-width:\s*680px\)[\s\S]*?\.hero-logo-eyebrow\s*\{[^}]*?\bmargin-top:\s*(\d+)px/.exec(idx);
if (!pcM) no('PC 값(.hero-logo-eyebrow margin)을 못 찾았습니다 — 선택자나 형식이 바뀌었습니다(통과 아님)');
if (!moM) no('폰 값(≤680px 안 .hero-logo-eyebrow margin-top)을 못 찾았습니다(통과 아님)');
if (!pcM || !moM) { console.error('\n먼저 이 검사가 무엇을 읽어야 하는지 고칠 것.'); process.exit(1); }
const PC = +pcM[1], MO = +moM[1];

/* ── 2) 적어 둔 값 ───────────────────────────────────────────
   「폰 13」·「폰 13px」·「PC 21」·「PC 21px」 꼴을 전부 줍는다.
   주석이든 가드 줄이든 가리지 않는다 — 사람이 읽는 자리면 어디든 낡을 수 있다. */
/* ★워드마크 **글자 크기**는 원천에서 읽어 온다 — 주석에 「워드마크가 폰 32px · PC 50px」처럼
   다른 것의 치수가 함께 적히는데, 그걸 사이값으로 세면 늑대를 부른다.
   ★'워드마크'라는 낱말이 가까이 있다는 것만으로 빼지 않는다 — 그러면 바로 옆의 진짜 사이값
     (「PC 워드마크 50px 기준 0.60배 — 폰 13px 과 같은 비율」의 13)까지 놓친다.
     **낱말이 가깝고 + 그 수가 실제 워드마크 크기일 때만** 뺀다. 크기가 바뀌면 이 판단도 따라 움직인다. */
const WORD = new Set();
{
  const push = (m) => { if (m) for (const g of m.slice(1)) if (g) WORD.add(+g); };
  push(/\.hero-logo-wordmark\s*\{[^}]*?font-size:\s*clamp\([^)]*?,\s*(\d+)px\s*\)/.exec(idx));
  push(/@media\s*\(max-width:\s*680px\)[\s\S]*?\.hero-logo-wordmark\s*\{[^}]*?font-size:\s*(\d+)px/.exec(idx));
  /* ★태그라인 글자 크기도 넣는다 — 주석이 「그 대문자 높이는 6px 뿐이라(폰 9px 글자)」처럼
     **태그라인 치수**를 함께 적는다. 워드마크만 알고 있으면 그 9 를 사이값으로 오해한다(실측). */
  push(/\.hero-logo-eyebrow\s*\{[^}]*?font-size:\s*clamp\(\s*(\d+)px[^)]*?,\s*(\d+)px\s*\)/.exec(idx));
  if (!WORD.size) no('글자 크기를 못 읽었습니다 — 크기를 모르면 「다른 것의 치수」를 가려낼 수 없습니다(통과 아님)');
}

const said = [];
const grab = (src, where) => {
  /* ★`px?` 로 적었다가 **'px' 없는 표기를 통째로 못 봤다** — 정규식에서 `px?` 는
     'p 다음에 x 가 있어도 되고 없어도 된다'는 뜻이라, 「폰 13」처럼 단위 없는 자리가 안 걸린다.
     가드 주석이 바로 그 꼴이라, 자가시험에서 그 줄을 낡혀 봐도 초록이 났다(실측).
     ★검사를 만들고 나면 **각 자리를 하나씩 낡혀 보고** 붉어지는지 본다 — 초록은 증명이 아니다. */
  /* ★소수는 **배수**다(「폰 0.62 · PC 0.66」). 정수만 골라야 한다 —
     안 그러면 0.62 에서 0 을 떼어 "폰 0px 이라 적혀 있다"고 우긴다(실측으로 겪었다). */
  for (const m of src.matchAll(/(폰|PC)\s*(?<![\d.])(\d{1,3})(?![\d.])(?:\s*px)?/g)) {
    /* ★'워드마크' 크기를 말하는 자리는 뺀다 — 같은 문장에 「워드마크가 폰 32px · PC 50px」처럼
       **다른 것의 치수**가 함께 적힌다. 그것까지 사이값으로 세면 검사가 늑대를 부른다(첫 판이 그랬다).
       ★반대로 범위를 더 좁히지는 말 것 — 좁힐수록 낡은 설명을 놓친다. 여기가 균형점이다. */
    const near = src.slice(Math.max(0, m.index - 40), m.index + 40);
    if (WORD.has(+m[2]) && /워드마크|태그라인|글자/.test(near)) continue;
    said.push({ who: m[1], n: +m[2], where, at: m[0] });
  }
};
// 히어로 주석 두 덩이만 본다(파일 전체를 훑으면 무관한 '폰 320px' 류가 섞인다)
for (const m of idx.matchAll(/HERO_LOCKUP_RATIO[\s\S]{0,1400}?\*\//g)) grab(m[0], 'index.html 히어로 주석');
for (const m of idx.matchAll(/margin(?:-top)?:\s*\d+px;\s*\/\*[^*]*?\[?HERO_LOCKUP_RATIO\]?[^*]*?\*\//g)) grab(m[0], 'index.html 값 옆 주석');
for (const m of idx.matchAll(/margin-top:\s*\d+px;\s*\/\*\s*폰[^*]*?\*\//g)) grab(m[0], 'index.html 값 옆 주석');
for (const l of gd.split('\n')) if (l.includes('HERO_LOCKUP_RATIO')) grab(l, 'merge-guard chk 줄');

if (!said.length) no('「폰 N · PC M」이라 적어 둔 자리를 하나도 못 찾았습니다 — 설명이 통째로 사라졌거나 형식이 바뀌었습니다');

/* ★★[SAID_ALIVE 2026-08-10 · 코드 세션 실측] **근거 덩이가 살아 있는지**를 따로 본다.
   이 파일은 위에 "설명을 지워서 통과시키지 말 것"이라고 적어 두었는데, 적기만 하고 막지는 않았다.
   실측: index.html 의 히어로 주석(왜 0.60 인지·바닥이 어디인지가 적힌 그 덩이)을 통째로 지우면
   `said` 에는 가드 줄과 값 옆 주석이 남아 `!said.length` 가 안 걸리고 **exit 0** 이 났다.
   즉 '근거를 지우는 것'이 이 검사를 통과하는 가장 쉬운 길이었다 — 막으려던 바로 그 길이다.
   ★수를 세지 않고 '있는가'만 본다. 문장 수를 못 박으면 글을 다듬을 때마다 검사가 운다.
   ★출처 이름으로는 못 가린다(내 첫 고침이 그렇게 틀렸다) — 값 옆 한 줄 주석
     「margin: 21px 0 0;  · [HERO_LOCKUP_RATIO] …」 에도 그 마커가 들어 있어서
     위 첫 정규식이 그것까지 '히어로 주석'으로 라벨한다. 그래서 **덩이의 길이**로 가른다:
     한 줄 값 주석은 100자 안팎, 근거 덩이는 600자가 넘는다.
     ★위 예시에 주석 닫는 두 글자를 그대로 적었다가 이 파일이 거기서 끊겼다(실측).
       주석 안에 주석 닫는 기호를 넣지 말 것 — 예시는 가운뎃점으로 바꿔 적는다. */
{
  const blocks = [...idx.matchAll(/HERO_LOCKUP_RATIO[\s\S]{0,1400}?\*\//g)].map((m) => m[0]);
  const REASON_MIN = 300;
  if (!blocks.some((b) => b.length >= REASON_MIN)) {
    no(`왜 이 값인지 적힌 근거 덩이(${REASON_MIN}자 이상)가 index.html 에 없습니다 — `
      + `값만 남고 근거가 사라지면 다음 사람이 아무렇게나 만집니다. 지워서 통과시키지 말 것`);
  }
}

for (const s of said) {
  const want = s.who === '폰' ? MO : PC;
  if (s.n !== want) no(`${s.where}: 「${s.at}」이라 적혀 있는데 실제는 ${want}px 입니다`);
}

/* ── 3) 두 폭이 같은 비율인가 (이 자물쇠의 원칙) ──────────────
   워드마크는 폰 32px · PC 50px 다. 같은 자물쇠로 보이려면 사이도 같은 배수여야 한다.
   ★배수를 말할 때는 자를 밝힌다 — 여기 값은 **대문자 높이를 0.7em 으로 어림한** 자다. */
const CAP = (fs_) => fs_ * 0.7;
const rMo = MO / CAP(32), rPc = PC / CAP(50);
const off = Math.abs(rMo - rPc);
if (off > 0.06) no(`폰 ${rMo.toFixed(2)}배 · PC ${rPc.toFixed(2)}배 — 두 폭의 비율이 갈렸습니다(차이 ${off.toFixed(2)}). 한쪽만 고치면 화면마다 다른 자물쇠가 됩니다`);

if (bad) { console.error('\n★설명을 지워서 통과시키지 말 것 — 근거가 사라지면 다음 사람이 이 값을 아무렇게나 만진다.'); process.exit(1); }
console.log(`HERO LOCKUP OK — 폰 ${MO}px(${rMo.toFixed(2)}배) · PC ${PC}px(${rPc.toFixed(2)}배) · 적어 둔 자리 ${said.length}곳 전부 일치`);
console.log('  (배수는 대문자 높이를 0.7em 으로 어림한 자 · 실제 글리프로 재면 값이 다르게 나온다)');
