// ★[TOKEN_DEFINED] 미정의 CSS 변수 검사
//
//   node scripts/check-css-tokens.mjs index.html mypage.html ...
//
// 왜 필요한가 — 실사고 2026-08-09
//   order-preview 에서 `var(--gold-text)` 를 다섯 곳에 썼는데 그 파일엔 그 토큰이 **없었다.**
//   CSS 문법은 멀쩡하고 어떤 검사도 안 잡았다. 브라우저에서만 드러났다:
//   대체값 없는 미정의 var 는 그 선언을 '계산 시점 무효'로 만들고, border-color 는 초기값인
//   currentColor 로 떨어진다 → 금색 테두리를 의도한 카드가 **검은 테두리**가 됐다.
//   사용자가 화면을 보고 바로 지적했다. 색이 아니라 오작동이다.
//
// 무엇을 잡고 무엇을 안 잡나
//   ✗ 잡는다 : `var(--x)`         — 대체값이 없다. 없으면 조용히 무너진다.
//   ○ 넘긴다 : `var(--x, #fff)`   — 대체값이 있다. 없으면 그 값으로 간다. 이건 정상 문법이다.
//              ★이걸 구분하지 않으면 `var(--serif-ko, serif)` 같은 정상 코드가 전부 빨개져
//                검사를 아무도 안 믿게 된다. 검사가 우는 늑대가 되면 없느니만 못하다.
//   ○ 넘긴다 : JS 가 넣어 주는 것  — `setProperty('--x', …)` 가 파일 안에 있으면 정의로 친다
//              (스크롤 위치 같은 값은 CSS 에 리터럴로 못 적는다).
import fs from 'node:fs';

const FILES = process.argv.slice(2);
if (!FILES.length) { console.error('✗ 점검할 파일을 주세요.'); process.exit(1); }
let bad = 0;
for (const f of FILES) {
  if (!fs.existsSync(f)) { console.log(`· ${f} 없음`); continue; }
  /* ★주석을 먼저 지운다 — 안 지우면 "예전에 var(--gold-text)를 써서 검은 테두리가 됐다"고
     적어 둔 **사고 기록 자체가** 위반으로 잡힌다(실제로 그랬다). 검사가 자기 회고록을 물면
     사람은 주석을 지우는 쪽으로 움직인다. 남겨야 할 것이 지워진다. */
  const s = fs.readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  // 대체값 유무를 나눠 센다 — 여는 괄호 뒤 이름, 그 다음 문자가 쉼표면 대체값이 있다
  const bare = new Set(), withFb = new Set();
  for (const m of s.matchAll(/var\(\s*(--[a-z0-9_-]+)\s*([,)])/gi)) (m[2] === ',' ? withFb : bare).add(m[1]);
  const defined = (v) => new RegExp('(^|[;{\\s])' + v + '\\s*:').test(s)
    || new RegExp("setProperty\\(\\s*['\"]" + v + "['\"]").test(s);
  const miss = [...bare].filter((v) => !defined(v));
  if (miss.length) { bad += miss.length; console.log(`✗ ${f} — 대체값도 정의도 없는 변수 ${miss.length}: ${miss.join(' ')}`); }
  else console.log(`ok ${f} (민 var ${bare.size}종 · 대체값 있는 var ${withFb.size}종)`);
}
if (bad) {
  console.log('\n대체값 없는 미정의 var 는 선언을 무효로 만든다 — border-color 면 currentColor(글자색)로 떨어진다.');
  console.log('정의를 넣거나, 파일에 실재하는 토큰으로 바꾸거나, `var(--x, 값)` 으로 대체값을 달 것.');
  process.exit(1);
}
console.log('TOKEN DEFINED OK');
