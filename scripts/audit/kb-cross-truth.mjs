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
const advisor = read('assets/advisor-kb.js');   // 화면 챗봇이 그대로 읽어 주는 문장
const ritualRaw = read('api/_ritual-kb.js');
const contract = read('contract/v1-1.html').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

/* ★주석을 걷어내고 잰다 — 이 규칙들의 «근거»가 바로 그 파일 주석에 적혀 있어서,
   안 걷으면 검사가 **자기 설명문**을 위반으로 잡는다(2026-09-13 이 세션에서 두 번 당한 자기충돌). */
const ritual = ritualRaw.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');

/* [원천파일, 원천, 원천에 있어야 할 앵커, 검사 대상에 있으면 안 되는 꼴, 설명, 검사 대상(기본 식순 KB)]
   ★2026-09-19 여섯째 칸을 붙였다 — 종전에는 대상이 «식순 KB» 하나로 박혀 있어
     «api/_kb.js 자신이 계약서가 정한 것을 모른다고 답하는 경우»를 아예 못 봤다.
     실제로 그랬다: 계약서 제12조①이 인도 기한(2·4·6주)을 못 박고 지연배상까지 두었는데
     _kb.js 19장이 그것을 「상담에서 확정되는 항목(추측하지 말 것)」에 올려 두었다.
     서명한 조항을 «미정»이라 답하는 것 — [KB_SETTLED] 가 막으려던 바로 그 모양인데
     검사가 한쪽만 보고 있어서 초록이었다. */
const TARGETS = { ritual: () => ritual, kb: () => kb, advisor: () => advisor };
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

  /* ── 대상이 «api/_kb.js 자신»인 규칙 (2026-09-19) ────────────────────── */
  ['contract/v1-1.html', contract, '보정본(10장) · 예식 후 4주 이내',
    /결과물[^\n]{0,40}정확한 수령 시점|수령 시점[^\n]{0,30}(상담에서|확정 전|추측하지)/,
    '[KB_DELIV] 인도 기한 — 계약서 제12조①이 원본 2주·보정본 4주·영상 6주로 못 박았고 지연배상(0.1%/일)까지 있다. «상담에서 확정»이라 답하면 서명한 조항을 미정이라 말하는 것이다', 'kb'],
  /* ★이 규칙은 «없어야 할 꼴»이 아니라 «있어야 할 줄»을 본다 — 정규식으로는 «빠진 것»을 못 잡는다.
     그래서 wrong 에 함수도 받게 했다. 정규식으로 억지로 쓰면 아무것도 매칭하지 않는
     «늘 통과하는 죽은 검사»가 된다(실제로 처음 판이 그랬고, 반증해 보고 알았다). */
  ['contract/v1-1.html', contract, '무료 재보정을 제공한다',
    (t) => {
      const sec = (t.match(/## 14\. 결과물[\s\S]*?(?=\n## )/) || [''])[0];
      if (!sec) return '14장(결과물)을 못 찾았다 — 절 제목이 바뀌었으면 이 검사도 함께 고칠 것';
      if (!/20,000원/.test(sec)) return null;
      return /무료 재보정/.test(sec) ? null : '14장이 «컷당 20,000원»만 말하고 «무료 재보정 1회»가 없다';
    },
    '[KB_DELIV] 무료 재보정 — 계약서 제5조②가 «총 1회 무료»를 준다. 그 줄 없이 «컷당 20,000원»만 답하면 고객이 권리를 모르고 돈을 낸다', 'kb'],

  /* 화면 챗봇 — 「사진은 언제 받나요?」는 고객이 제일 많이 누르는 칩이다.
     2026-09-19 까지 그 답이 「상담·계약 단계에서 안내드립니다」 + escalate:true 였다.
     계약서가 기한으로 못 박고 지연배상까지 둔 질문을 «모른다»고 답하고 사람에게 넘기고 있었다. */
  ['contract/v1-1.html', contract, '보정본(10장) · 예식 후 4주 이내',
    (t) => {
      const m = t.match(/id: 'photo-when'[^}]*}/);
      if (!m) return "'photo-when' 칩을 못 찾았다 — id 가 바뀌었으면 이 검사도 함께 고칠 것";
      if (/escalate:\s*true/.test(m[0])) return '답이 있는 질문인데 escalate:true 로 사람에게 넘긴다';
      return /2주|4주|6주/.test(m[0]) ? null : '수령 기한(2·4·6주)을 말하지 않는다';
    },
    '[KB_DELIV] 챗봇 「사진은 언제 받나요?」 — 계약서 제12조①이 정한 기한을 그대로 답해야 한다', 'advisor'],
];

const bad = [], ok = [];
for (const [srcName, src, anchor, wrong, why, targetName = 'ritual'] of RULES) {
  const target = TARGETS[targetName]();
  if (!src.includes(anchor)) {
    bad.push(`원천(${srcName})에서 「${anchor}」를 못 찾았다 — 원천이 바뀌었으면 이 검사도 함께 고칠 것`);
    continue;
  }
  const m = typeof wrong === 'function' ? wrong(target) : target.match(wrong);
  const hit = m && (typeof m === 'string' ? m : m[0]);
  if (hit) bad.push(`${why}\n        ${targetName === 'kb' ? 'api/_kb.js' : targetName === 'advisor' ? 'assets/advisor-kb.js' : '식순 KB'}: 「…${String(hit).slice(0, 90)}…」`);
  else ok.push(why.split(' — ')[0]);
}

ok.forEach(o => console.log(`  ok ${o}`));
bad.forEach(b => console.log(`  ❌ ${b}`));
console.log(`\n[KB_CROSS_TRUTH] 규칙 ${RULES.length}개 — 통과 ${ok.length} · 어긋남 ${bad.length}`);
if (bad.length) console.log('  단일 진실원은 api/_kb.js 와 계약서다. 식순 KB 를 그쪽에 맞춘다(반대가 아니다).');
process.exit(bad.length ? 1 : 0);
