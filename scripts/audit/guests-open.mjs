/* 하객 구성을 «가족 한정»으로 말하는 문장이 고객 면에 되살아나지 않았나  [GUESTS_OPEN]
 *   node scripts/audit/guests-open.mjs
 *
 * ★왜 — 2026-09-26 사장님: 「직계가족으로 한정하게 되면 친구들끼리 하는 웨딩에는 적합하지 않나?
 *   라는 고객을 놓칠 우려 … 가까운 이들만, 직계가족 한정이라는 느낌을 주는 부분들 전부 찾아서 개선」
 *   규칙은 원래 열려 있었다 — 30명 안에서 구성은 두 분이 정한다(api/_kb.js 「10. 인원」).
 *   그런데 9/9 [HERO_SUB_OPEN] 이 히어로 한 줄만 열고 나머지를 «검색 자산»이라며 남겨 두었고,
 *   그 사이 17일 동안 홈 카드는 「직계가족 30명」, 챗봇은 「친구도 초대할 수 있나요?」에
 *   「직계가족 중심의 자리를 제안드리지만」으로 답했다. 한 자리만 고치면 나머지가 옛말을 계속한다.
 *   그래서 «자리 목록»이 아니라 «고객이 읽는 면 전체»를 문장 모양으로 훑는다.
 *
 * 무엇을 보나 — 고객이 읽는 면(화면 · 검색 설명 · 스키마 · AI 상담 원천 · 스마트스토어 원본)에서
 *   주석을 걷어낸 본문. 주석은 «왜 바꿨나»를 옛 문장을 인용해 적어야 하므로 뺀다([NOCHK_QUOTES_ITSELF]).
 * 무엇을 안 보나(일부러 남긴 것) —
 *   ①법률 문장 「본인·직계가족의 사망」(예식일 변경 면제 · 계약서 제8조)
 *   ②식순의 「가족만」(링 워밍을 돌리는 범위 — 하객 구성이 아니다)
 *   ③검색 키워드 칸(meta keywords 의 「직계가족결혼식」 · 숨은 h2 「양가 직계가족 결혼식」 한 곳)
 *   ④고객이 묻는 질문 그대로의 라벨(「가족끼리만 하면 너무 썰렁하지 않을까요?」)
 *
 * 종료코드: 0 통과 · 1 되살아남
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/* 고객이 읽는 면 — 새 면을 만들면 여기에 더할 것(빠지면 그 면은 검사 밖이다) */
const FILES = [
  'index.html', 'inquiry.html', 'live.html', 'parents.html', 'mypage.html', 'guide.html',
  'schedule.html', 'console.html', 'invitation-gallery.html',
  'automation/consultation/ScreenA_apply.html',
  'api/_kb.js', 'api/advisor.js', 'api/ritual-advisor.js', 'api/schedule-advisor.js', 'api/_ritual-kb.js',
  'assets/advisor-kb.js',
  'docs/smartstore/상세페이지_원본.html',
];
for (const dir of ['i', 'i/invitations', 'i-family']) {
  for (const f of fs.readdirSync(path.join(ROOT, dir))) if (f.endsWith('.html')) FILES.push(`${dir}/${f}`);
}

/* 하객 구성을 좁히는 문장 모양 — 낱말이 아니라 «모양»을 건다.
   「직계가족」 낱말 자체를 막으면 ①법률 문장과 ③검색 이름표까지 걸린다. */
const BAN = [
  [/직계가족\s*\d+\s*명/, '「직계가족 N명」 — 하객 상한을 직계가족으로 말한다'],
  [/직계가족\s*(중심|을 위한|만)/, '「직계가족 중심·을 위한·만」'],
  [/가족\s*중심/, '「가족 중심」 — 예식을 가족의 것으로 좁힌다(작은 예식 · 가까운 분들로)'],
  [/가족만을\s*위해/, '「가족만을 위해」 — 공간 독점은 «초대하신 분들»의 것이다'],
  [/가까운\s*(가족|이들)만/, '「가까운 가족만·가까운 이들만」'],
  [/가족\s*\d+\s*명의/, '「가족 N명의」 — 하객을 가족으로 센다'],
  [/양가\s*가족만\s*모시는/, '「양가 가족만 모시는」 — 9/9 에 걷은 옛 히어로'],
  [/가족스냅/, '「가족스냅」 — 가격 줄 구성 이름(단체사진)'],
];

/* 주석 걷기 — 줄 수는 그대로 둔다(빈칸으로 덮는다). 그래야 보고하는 줄 번호가 파일과 맞는다.
   ★블록 주석은 «줄 머리에서 여는 것»과 «코드 뒤 한 줄 안에서 닫히는 것»만 걷는다.
     처음엔 /\/\*[\s\S]*?\*\//g 한 줄로 걷었다가 api/advisor.js 11행 줄 주석 속 「contract/*」를
     여는 기호로 읽어 231행까지 **본문 220줄을 통째로 지웠다** — 52·53행 「가족 30명의」·「가족만 예식」이
     조용히 통과했다(실측). 주석을 걷는 검사는 «지나치게 걷는» 쪽이 더 위험하다 — 못 보고 초록이 된다. */
const blank = (m) => m.replace(/[^\n]/g, ' ');
const tail = (m, a, b) => a + b + blank(m.slice(a.length + b.length));
const strip = (s) => s
  .replace(/<!--[\s\S]*?-->/g, blank)                                   // HTML 주석
  .replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, blank)                          // 줄 머리에서 여는 블록 주석
  .replace(/^[ \t]*\/\/[^\n]*/gm, blank)                                // 한 줄 전체가 주석
  .replace(/([;,(){}\[\]'"`])([ \t]+)\/\/[^\n]*/g, tail)                // 코드 뒤 꼬리 주석
  .replace(/([;,(){}\[\]'"`])([ \t]*)\/\*[^\n]*?\*\//g, tail);          // 코드 뒤 한 줄짜리 블록 주석

const hits = [];
let scanned = 0;
for (const f of FILES) {
  const p = path.join(ROOT, f);
  if (!fs.existsSync(p)) { hits.push(`${f} — 파일이 없다(목록을 고칠 것)`); continue; }
  scanned++;
  const lines = strip(fs.readFileSync(p, 'utf8')).split('\n');
  lines.forEach((l, i) => {
    for (const [re, why] of BAN) {
      const m = l.match(re);
      if (m) hits.push(`${f}:${i + 1} ${why} … 「${l.slice(Math.max(0, m.index - 24), m.index + m[0].length + 24).trim()}」`);
    }
  });
}

/* 열린 문장이 «있는가»도 본다 — 좁은 말만 지우고 열린 말을 안 넣으면 친구 쪽은 여전히 모른다 */
const MUST = [
  ['index.html', '가족도 친구도', '「30 Guests」 카드 부제'],
  ['index.html', '친구들과 함께하셔도 괜찮습니다', 'FAQ 「하객은 몇 분까지」'],
  ['assets/advisor-kb.js', '가족만, 친구만, 가족과 친구 함께', '챗봇 「친구도 초대할 수 있나요?」'],
  ['api/_kb.js', '가족만·친구만·가족과 친구 함께', 'AI 상담 인원 절'],
];
for (const [f, s, where] of MUST) {
  if (!fs.readFileSync(path.join(ROOT, f), 'utf8').includes(s)) hits.push(`${f} — ${where}의 열린 문장 「${s}」이 사라졌다`);
}

if (hits.length) {
  console.log(`❌ GUESTS_OPEN — 하객을 가족으로 좁히는 문장 ${hits.length}건 (면 ${scanned}개)`);
  for (const h of hits) console.log('  ' + h);
  process.exit(1);
}
console.log(`✅ GUESTS_OPEN — 면 ${scanned}개 · 좁히는 문장 0건 · 열린 문장 ${MUST.length}곳 생존`);
