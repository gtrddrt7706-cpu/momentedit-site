/* 원천끼리 어긋나는지 본다 — 식순 챗봇 KB ↔ 메인 KB ↔ 계약서  [KB_CROSS_TRUTH]
 *   node scripts/audit/kb-cross-truth.mjs
 *
 * ★왜 — 2026-09-13 점검 실측. 식순 챗봇(api/_ritual-kb.js)이 **이미 정해진 것**을
 *   「확정 전 정책」·「단정하지 말고」로 답하고 있었다. 셋 다 두 벌 중 한 벌만 고친 자리였다:
 *
 *     ①시간 연장 — 계약서 제8조 ④ 가 명문으로 정한다:
 *        「단축된 시퀀스 시간은 환불·연장의 대상이 되지 아니하며 … 하루 3팀 운영 구조상 당일 연장은 불가하다」.
 *        고객이 **서명한 조항**을 챗봇이 «아직 안 정해졌다»고 답하고 있었다.
 *     ②반려동물 — api/_kb.js 가 «케이지 동반 시 입장 가능»으로 정해 뒀는데 「가능·불가를 단정하지 말라」였다.
 *     ③음악 — 2026-08-03 «노래선정부분 완전삭제» 뒤에도 D-14 목록에 「음악 2곡 정하기」가 남아 있었다.
 *        같은 날 같은 목록에서 '베일 다운'은 지워졌다(VEIL_RETIRED) — 음악만 남은 것이다.
 *
 * ★kb-chatbot-truth 와 무엇이 다른가 — 그쪽은 «화면에 없는 기능을 있다고 하는가»(정적 챗봇 ↔ _kb.js)를 본다.
 *   이쪽은 «정해진 것을 안 정해졌다고 하는가»(식순 KB ↔ _kb.js·계약서)를 본다. 어긋나는 방향이 반대다.
 *
 * ★앵커가 사라지면 통과가 아니라 실패다 — 원천이 바뀌면 이 검사도 함께 고치라는 뜻이다(kb-chatbot-truth 와 같은 규칙).
 * 종료코드: 0 통과 · 1 어긋남
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const kb = read('api/_kb.js');
const ritualRaw = read('api/_ritual-kb.js');
const contract = read('contract/v1-1.html').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

/* ★주석을 걷어내고 잰다 — 이 규칙들의 «근거»가 바로 그 파일 주석에 적혀 있어서,
   안 걷으면 검사가 **자기 설명문**을 위반으로 잡는다(2026-09-13 이 세션에서 두 번 당한 자기충돌). */
const ritual = ritualRaw.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

// [원천파일, 원천에 있어야 할 앵커, 식순 KB 에 있으면 안 되는 꼴, 설명]
const RULES = [
  ['contract/v1-1.html', contract, '당일 연장은 불가하다',
    /시간 연장[^\n]{0,24}확정 전|연장[^\n]{0,16}(아직|미정|정해지지)/,
    '당일 시간 연장 — 계약서 8조 ④ 가 「불가」로 명문화했다. 서명한 조항을 «확정 전»이라 답하면 안 된다'],
  ['api/_kb.js', kb, '별도 예행연습 없이',
    /리허설[^\n]{0,24}(확정 전|미정|아직)/,
    '리허설 — _kb.js 가 「별도 예행연습 없이 당일 시퀀스 안에서」로 정해 뒀다'],
  ['api/_kb.js', kb, '케이지(이동장) 동반 시 입장 가능',
    /반려동물[^\n]{0,40}단정하지 말/,
    '반려동물 입장 — _kb.js 가 「케이지 동반 시 가능」으로 정해 뒀다. 정해지지 않은 것은 «식순 연출로 고르는 것»뿐이다'],
  ['api/_kb.js', kb, '곡을 넣는 칸은 따로 없다',
    /음악\s*\d*\s*곡[^\n]{0,24}정하(기|세요|시면)/,
    '음악 — 2026-08-03 곡 선정 폐지. 입력칸이 없는데 «두 분이 정하라»는 숙제를 주면 안 된다'],
];

const bad = [], ok = [];
for (const [srcName, src, anchor, wrong, why] of RULES) {
  if (!src.includes(anchor)) {
    bad.push(`원천(${srcName})에서 「${anchor}」를 못 찾았다 — 원천이 바뀌었으면 이 검사도 함께 고칠 것`);
    continue;
  }
  const hit = ritual.match(wrong);
  if (hit) bad.push(`${why}\n        식순 KB: 「…${hit[0]}…」`);
  else ok.push(why.split(' — ')[0]);
}

ok.forEach(o => console.log(`  ok ${o}`));
bad.forEach(b => console.log(`  ❌ ${b}`));
console.log(`\n[KB_CROSS_TRUTH] 규칙 ${RULES.length}개 — 통과 ${ok.length} · 어긋남 ${bad.length}`);
if (bad.length) console.log('  단일 진실원은 api/_kb.js 와 계약서다. 식순 KB 를 그쪽에 맞춘다(반대가 아니다).');
process.exit(bad.length ? 1 : 0);
