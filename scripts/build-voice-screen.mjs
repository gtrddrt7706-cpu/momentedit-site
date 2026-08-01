#!/usr/bin/env node
// ★VOICE_SCREEN — 보이스를 "하나씩 클릭하며 고르기" 위한 스크리닝 대본 생성기.
//
// 왜 있나: 2026-08-01, 내가 문서 설명만 읽고 좁힌 8자리 후보가 1차 청취에서 전량 반려됐다.
//   이 환경은 소리를 못 듣는다. 그러니 후보 '생성'을 내가 계속 맡는 구조가 틀렸다.
//   사람이 귀로 좁히고, 내가 밈 이력으로 거른다 — 그 역할 분담을 물리적으로 가능하게 하는 도구다.
//
// 무엇을 만드나:
//   1_스크리닝_8자리.txt   자리당 한 덩어리. 붙여넣으면 화자 칩 8개가 생긴다.
//                          칩 하나를 잡고 보이스만 갈아끼우며 10초씩 듣는 용도.
//   2_본선_8자리.txt       스크리닝에서 살아남은 3명에게 거는 긴 대사.
//   README.md              안내는 전부 여기. 붙여넣기 파일에는 한 줄도 넣지 않는다.
//
// ★이 폴더의 산출물은 조립 대상이 아니다. assemble-narration.mjs 는 이걸 쳐다보지 않는다.
//   다운로드하지 말 것 — 크레딧이 즉시 차감되고 취소가 안 된다. 미리듣기(0원)로만 쓴다.
//
// ★PASTE_NO_COMMENT 준수 — 붙여넣기 파일에 안내 주석을 넣지 않는다.
//   2026-08-01 실사고: '#'로 시작하는 머리 주석 8줄이 통째로 기본 화자(박창수)에 배정돼 같이 낭독됐다.
//   타입캐스트에 주석 문법은 없다. '#'은 그냥 글자다. 문구를 고치는 게 아니라 채널을 갈라서 끝낸다.
//
// 실행: node scripts/build-voice-screen.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json');
const OUT = path.join(ROOT, 'docs/plans/식순연구/타입캐스트/보이스찾기');

const SCREEN_FILE = '1_스크리닝_8자리.txt';
const FINAL_FILE = '2_본선_8자리.txt';

// ★스크리닝 한 덩어리의 최소 길이. 이보다 짧으면 다음 문장을 한 줄 더 붙인다.
//   3초짜리로는 판단이 안 선다. 10초 안팎이 스크리닝의 적정 길이다.
const MIN_CHARS = 25;
const MAX_SENTS = 2;

// ★자리 순서 = 클립 수 순서 = 중요도 순서. 진행이 41/54클립(76%)이라 맨 위다.
//   pick   : [클립 id, 시작 문장 인덱스] — 스크리닝용. MIN_CHARS까지 자동으로 이어 담는다.
//   final  : [[클립 id, 시작, 개수], ...] — 본선용. 클립 통째가 기본이고 편지만 앞을 자른다.
//   filter : 타입캐스트 보이스 목록에서 걸 필터.
//   skip   : 통째로 건너뛸 카테고리. 여기 걸리면 들어볼 필요도 없다.
//
// ★★CLIP_NO 로 참조하지 말 것 — 클립 번호는 **파트 안에서만** 유일하다.
//   2026-08-01 실사고: no 를 전역 키로 Map 을 만들었더니 배역 파트의 no01(R-guest-1 · 신랑)이
//   나레이션 파트의 no01(G1-1 · 안내)을 덮어썼다. 안내 자리 스크리닝 줄에 신랑 대사가 들어갔고,
//   화자 수 검사(8명)는 그대로 통과했다 — 개수는 맞고 내용만 틀렸기 때문이다.
//   id 는 전역 유일하다. 참조는 반드시 id 로 하고, 아래 두 가드를 지우지 말 것.
const SEATS = [
  {
    role: '진행',
    screen: 12,
    finalists: 3,
    rank: '★1순위',
    why: '54클립 중 41개. 여기만 맞으면 예식은 선다.',
    pick: ['G4-parent', 0],
    final: [['G4-parent', 0, 3], ['W2-b', 0, 7]],
    finalWhy: '가장 조용한 대목(편지 도입)과 가장 형식적인 대목(서약 문답). 성격이 정반대라 둘 다 걸어야 한다.',
    filter: '남성 · 30~40대 · 다큐 / 오디오북 / 아나운서 / 나레이션',
    skip: '쇼츠 · 광고 · 캐릭터 · 사투리',
  },
  {
    role: '안내',
    screen: 8,
    finalists: 3,
    rank: '2순위',
    why: '식전·식후 12클립. 정보가 정확히 꽂혀야 하는 자리다.',
    pick: ['G1-1', 1],
    final: [['G1-1', 0, 4]],
    finalWhy: '좌석 안내 전형. 숫자와 안내 문구가 뭉개지지 않는지 본다.',
    filter: '여성 · 20~30대 · 아나운서 / 리포트 / 안내방송',
    skip: '감정 연기 · 발랄 · 캐릭터',
  },
  {
    role: '편지',
    screen: 8,
    finalists: 3,
    rank: '3순위',
    why: '1클립이지만 3분 통낭독. 한 명이 3분을 혼자 끌고 간다.',
    pick: ['G10', 3],
    final: [['G10', 0, 6]],
    finalWhy: '3분 전체를 들을 필요는 없다. 앞 6문장에서 호흡이 무너지면 뒤도 무너진다.',
    filter: '진행과 성별이 갈리는 쪽 · 낭독 / 라디오 / 감성 팟캐스트',
    skip: '진행으로 고른 목소리 — 41클립과 겹치면 같은 사람이 계속 말하는 예식이 된다',
  },
  {
    role: '신랑',
    screen: 6,
    finalists: 2,
    rank: '배역',
    why: '가상 인물 이준호(31). 미리듣기 전용이라 당일 재생하지 않는다.',
    pick: ['R-vow-groom', 3],
    final: [['R-vow-groom', 0, 5]],
    finalWhy: '혼인 서약. 감정을 넣지 않고 담담히 읽는지가 전부다.',
    filter: '남성 · 30대 · 차분 / 잔잔 / 오디오북',
    skip: '과장 · 울먹임 · 낭독톤 과다',
  },
  {
    role: '신부',
    screen: 6,
    finalists: 2,
    rank: '배역',
    why: '가상 인물 정세영(29).',
    pick: ['R-vow-bride', 1],
    final: [['R-vow-bride', 0, 5]],
    finalWhy: '혼인 서약. 단정한 톤이 끝까지 유지되는지 본다.',
    filter: '여성 · 20대 후반~30대 · 단정 / 차분',
    skip: '발랄 과다 · 밝음 · 캐릭터',
  },
  {
    role: '아버님',
    screen: 4,
    finalists: 2,
    rank: '배역',
    why: '가상 인물 이만수(62). 대사 1클립뿐이라 짧게 끝난다.',
    pick: ['R-bless-father', 1],
    final: [['R-bless-father', 0, 5]],
    finalWhy: '덕담 전체. 무뚝뚝한데 정이 새어 나오는지가 관건이다.',
    filter: '남성 · 50~60대 · 무뚝뚝 / 생활감 / 중저음',
    skip: '사투리 · 유행 캐릭터 · 코믹',
  },
  {
    role: '어머님',
    screen: 4,
    finalists: 2,
    rank: '배역',
    why: '가상 인물 김영자(58). 대사 1클립.',
    pick: ['R-bless-mother', 1],
    final: [['R-bless-mother', 0, 4]],
    finalWhy: '덕담 전체. 잔소리 같은데 정이 느껴져야 한다.',
    filter: '여성 · 50대 · 단단하고 정 있는 톤',
    skip: '인간극장 나레이션 톤 · 유행 캐릭터',
  },
  {
    role: '하객대표',
    screen: 4,
    finalists: 2,
    rank: '배역',
    why: '축배 1클립 15초. 노출이 가장 적다.',
    pick: ['R-toast', 0],
    final: [['R-toast', 0, 4]],
    finalWhy: '축배 전체. 낭독이 아니라 친구가 마이크 잡고 하는 말처럼 들려야 한다.',
    filter: '남성 · 30대 · 대화체 / 자연스러운 말투',
    skip: '낭독톤 · 아나운서톤',
  },
];

// ★반려된 1차 후보. 지우지 않고 기준선으로 남긴다 — "이 사람보다 나은가"를 재는 자가 필요하다.
const BASELINE = [
  ['진행', '대길', '공철'],
  ['안내', '김경화 앵커', '송진섭 기자'],
  ['편지', '한준', '현주'],
  ['신랑', '진', '강일'],
  ['신부', '에이프릴', '서현'],
  ['아버님', '대진', '모건'],
  ['어머님', '정숙', '주하'],
  ['하객대표', '세진', '지훈'],
];

// ★10초 안에 떨어뜨릴 신호. 스크리닝은 좋은 걸 찾는 단계가 아니라 떨어뜨리는 단계다.
const REJECT_SIGNALS = [
  '어디서 들어본 목소리다 — 최우선 탈락. 하객 중 누군가가 알아듣는다.',
  '쉼표에서 안 쉰다. 또는 필요 이상으로 쉰다.',
  '`-습니다` 어미를 뉴스처럼 올려 읽는다.',
  '감정을 넣는다. 예식 진행은 담담해야 하고, 우는 건 사람이 한다.',
  '숨소리 · 입소리 · 치찰음이 들린다. 예식장 스피커에서는 더 커진다.',
  '속도가 빠르다. 300음절/분이 우리 기준이고, 그보다 빠르면 안내가 안 꽂힌다.',
];

// ── 여기부터 실행 ─────────────────────────────────────────────────────────────

if (!fs.existsSync(MANIFEST)) {
  console.error(`\n✗ manifest.json 이 없습니다 — ${MANIFEST}`);
  console.error('  먼저 node scripts/build-typecast-import.mjs 를 돌리세요.\n');
  process.exit(1);
}
const manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));

// ★가드 1 — id 가 전역 유일하다는 전제를 실제로 검사한다.
//   no 는 파트 안에서만 유일해서 Map 키로 쓰면 조용히 덮어쓴다(위 주석의 실사고).
//   id 마저 겹치는 날이 오면 여기서 멈춰야지, 엉뚱한 대사가 실린 파일이 나가면 안 된다.
const dupId = Object.entries(
  manifest.clips.reduce((a, c) => ((a[c.id] = (a[c.id] || 0) + 1), a), {}),
).filter(([, n]) => n > 1);
if (dupId.length) {
  console.error(`\n✗ manifest 에 중복 id 가 ${dupId.length}개 있습니다 — id 참조가 안전하지 않습니다.`);
  for (const [id, n] of dupId) console.error(`   ${id} × ${n}`);
  process.exit(1);
}
const CLIP = new Map(manifest.clips.map((c) => [c.id, c]));

const clipOf = (id, expectRole) => {
  const c = CLIP.get(id);
  if (!c) {
    console.error(`\n✗ 클립 '${id}' 가 manifest 에 없습니다. 대본이 바뀌었다면 SEATS 의 id 를 고치세요.\n`);
    process.exit(1);
  }
  // ★가드 2 — 뽑아 온 클립의 역할이 그 자리와 같은지 본다.
  //   개수만 세는 검사는 "안내 자리에 신랑 대사"를 못 잡는다. 실제로 못 잡았다.
  if (expectRole && c.role !== expectRole) {
    console.error(`\n✗ '${id}' 의 역할은 '${c.role}' 인데 '${expectRole}' 자리에 배치돼 있습니다.`);
    console.error('  다른 자리의 대사가 섞였습니다. SEATS 의 id 를 확인하세요.\n');
    process.exit(1);
  }
  return c;
};

// 스크리닝 — MIN_CHARS 를 넘길 때까지 문장을 이어 담되 MAX_SENTS 를 넘지 않는다.
const screenLines = [];
const screenMeta = [];
for (const s of SEATS) {
  const [id, from] = s.pick;
  const c = clipOf(id, s.role);
  const taken = [];
  let chars = 0;
  for (let i = from; i < c.sents.length && taken.length < MAX_SENTS; i++) {
    taken.push(c.sents[i].text);
    chars += c.sents[i].text.length;
    if (chars >= MIN_CHARS) break;
  }
  for (const t of taken) screenLines.push(`${s.role}: ${t}`);
  screenMeta.push({ ...s, srcNo: c.no, srcLabel: c.label, sents: taken, chars });
}

// 본선 — 클립을 통째로, 또는 지정한 구간만.
const finalLines = [];
const finalMeta = [];
for (const s of SEATS) {
  const blocks = [];
  for (const [id, from, count] of s.final) {
    const c = clipOf(id, s.role);
    const texts = c.sents.slice(from, from + count).map((x) => x.text);
    for (const t of texts) finalLines.push(`${s.role}: ${t}`);
    blocks.push({ no: c.no, label: c.label, sents: texts });
  }
  finalMeta.push({ ...s, blocks, total: blocks.reduce((a, b) => a + b.sents.length, 0) });
}

// ★PASTE_NO_COMMENT 자가검사 — 대사 줄이 아닌 것이 하나라도 섞이면 파일을 쓰지 않는다.
//   타입캐스트는 이 파일을 통째로 낭독한다. 안내 한 줄이 새면 그 줄도 읽힌다.
for (const [name, lines] of [[SCREEN_FILE, screenLines], [FINAL_FILE, finalLines]]) {
  const stray = lines.filter((l) => l.trim() && !/^[^:：]{1,20}[:：]\s*\S/.test(l));
  if (stray.length) {
    console.error(`\n✗ ${name} 에 대사 줄이 아닌 줄이 ${stray.length}개 있습니다 — 타입캐스트가 이걸 낭독합니다.`);
    for (const l of stray.slice(0, 5)) console.error(`   ${l}`);
    process.exit(1);
  }
  if (!lines.length) {
    console.error(`\n✗ ${name} 이 비었습니다.\n`);
    process.exit(1);
  }
}

// ★화자 수 검사 — 붙여넣었을 때 생겨야 할 칩 개수와 SEATS 가 어긋나면 안 된다.
const spkInScreen = new Set(screenLines.map((l) => l.split(':')[0]));
if (spkInScreen.size !== SEATS.length) {
  console.error(`\n✗ 스크리닝 화자가 ${spkInScreen.size}명입니다 — SEATS 는 ${SEATS.length}자리입니다.\n`);
  process.exit(1);
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, SCREEN_FILE), screenLines.join('\n') + '\n', 'utf8');
fs.writeFileSync(path.join(OUT, FINAL_FILE), finalLines.join('\n') + '\n', 'utf8');

// ── README — 안내는 전부 여기로 온다. 이 블록을 지우면 안내가 어디에도 없게 된다. ──────

const R = [];
R.push('# 보이스 찾기 — 하나씩 클릭하며 고르는 대본', '');
R.push('1차 후보가 청취에서 전량 반려됐습니다. 문서 설명으로 좁히는 방식이 한계에 닿았습니다.');
R.push('이 폴더는 **귀로 직접 고르기 위한** 대본입니다. 후보를 데려오는 쪽과 걸러내는 쪽을 갈랐습니다.', '');
R.push('| | 하는 일 | 못 하는 일 |');
R.push('|---|---|---|');
R.push('| **형님** | 듣고 좁힌다. 후보 이름을 데려온다 | 밈 노출 이력 대조 |');
R.push('| **나** | 데려온 이름을 밈 지도와 대조 · 탈락 사유 제시 · 다음 탐색 방향 | **듣기. 전부.** |');
R.push('');
R.push('---', '');

R.push('## ★먼저 — 이 폴더 파일은 다운로드하지 않습니다', '');
R.push('- **미리듣기 전용입니다.** 미리듣기는 무제한 0원, 다운로드는 즉시 차감 · 취소 불가입니다.');
R.push('- **조립 대상이 아닙니다.** `assemble-narration.mjs` 는 이 폴더를 쳐다보지 않습니다.');
R.push('- 무료 플랜은 체험 보이스만 받아지고 **상업 이용이 불가**합니다. 지금 받으면 못 쓸 파일에 한도만 태웁니다.');
R.push('- 순서는 **미리듣기로 확정 → 플랜 결제 → 본 제작분만 다운로드** 입니다.');
R.push('');

R.push('## 순서', '');
R.push(`1. \`${SCREEN_FILE}\` 를 통째로 복사해서 타입캐스트 「대본 가져오기 → 텍스트 붙여넣기」에 붙입니다.`);
R.push(`   화자 칩 **${SEATS.length}개**가 생깁니다 — ${SEATS.map((s) => s.role).join(' · ')}.`);
R.push('   표에 없는 화자가 하나라도 더 잡혔다면 그 칩을 눌러 그 블록을 지우세요. 본문이 아닙니다.');
R.push('2. **`진행` 칩부터 하세요.** 8자리를 동시에 하지 마세요 — 진행이 54클립 중 41개입니다.');
R.push('   진행 하나만 맞으면 예식은 섭니다. 나머지는 그 다음입니다.');
R.push('3. **스크리닝.** 칩의 보이스를 갈아끼우며 같은 줄을 반복 재생합니다.');
R.push('   한 명당 10초입니다. 진행은 12명, 배역 1클립짜리는 4명이면 됩니다(아래 표).');
R.push('   좋은 걸 찾는 단계가 아니라 **떨어뜨리는** 단계입니다.');
R.push('   ★문장을 바꾸지 마세요. 사람마다 다른 문장으로 들으면 비교가 되지 않습니다.');
R.push('4. **본선.** 살아남은 2~3명만 `' + FINAL_FILE + '` 로 다시 겁니다. 여기서 긴 호흡이 드러납니다.');
R.push('5. **확정 1명.** 이름을 적어 두고 다음 자리로 넘어갑니다.');
R.push('6. 여덟 자리가 다 차면 이름 목록만 넘겨 주세요. 밈 노출 이력을 대조해 드립니다.');
R.push('');

R.push('## 자리별로 무엇을 찾나', '');
R.push('| 자리 | 클립 | 들어볼 인원 | 찾을 조건 | 통째로 건너뛸 것 |');
R.push('|---|---|---|---|---|');
for (const m of screenMeta) {
  const clips = manifest.clips.filter((c) => c.role === m.role).length;
  const star = m.rank === '★1순위' ? ' ★' : '';
  R.push(`| **${m.role}**${star} | ${clips} | ${m.screen} → ${m.finalists} → 1 | ${m.filter} | ${m.skip} |`);
}
R.push('');
R.push(`전부 합쳐 ${screenMeta.reduce((a, m) => a + m.screen, 0)}명 · 한 명 10초면 스크리닝만 ${Math.round(screenMeta.reduce((a, m) => a + m.screen, 0) / 6)}분입니다.`);
R.push('클립이 많은 자리일수록 많이 들어야 합니다. 배역 1클립짜리에 12명을 걸 필요는 없습니다.');
R.push('');
for (const m of screenMeta) {
  R.push(`- **${m.role}** — ${m.why}`);
}
R.push('');

R.push('## 10초 안에 떨어뜨릴 신호', '');
for (const s of REJECT_SIGNALS) R.push(`- ${s}`);
R.push('');
R.push('★**3~4명이 같은 줄에서 똑같이 이상하면 목소리가 아니라 그 줄을 의심하세요.**');
R.push('그건 보이스 교체로 안 고쳐집니다. 처방은 문안 수정이고 `assets/ritual-data.js` 부터 손대야 합니다.');
R.push('그런 줄이 나오면 어느 줄인지 알려 주세요.');
R.push('');

R.push('## 기준선 — 반려된 1차 후보', '');
R.push('지우지 않고 남깁니다. 새 후보를 들을 때 **"이 사람보다 나은가"** 를 재는 자가 필요합니다.', '');
R.push('| 자리 | 1순위(반려) | 대안(반려) |');
R.push('|---|---|---|');
for (const [role, a, b] of BASELINE) R.push(`| ${role} | ${a} | ${b} |`);
R.push('');
R.push('반려 이유는 하나입니다 — 톤 **설명**을 읽고 좁힌 것이지 **소리**를 듣고 고른 것이 아니었습니다.');
R.push('설명이 맞아도 소리는 틀릴 수 있습니다. 귀가 이기는 게 정상입니다.');
R.push('');

R.push(`## \`${SCREEN_FILE}\` 에 무엇이 들어 있나`, '');
R.push('| 자리 | 출처 클립 | 줄 | 자수 |');
R.push('|---|---|---|---|');
for (const m of screenMeta) {
  R.push(`| ${m.role} | ${String(m.srcNo).padStart(2, '0')} ${m.srcLabel} | ${m.sents.length} | ${m.chars} |`);
}
R.push('');
R.push(`합계 ${screenLines.length}줄 · ${screenLines.join('').length}자. 전부 실제 대본에서 뽑았습니다 — 예시로 새로 쓴 문장이 아닙니다.`);
R.push('배역 대사는 전부 **가상 인물**(이준호 · 정세영 · 이만수 · 김영자 · 하객대표)의 것입니다.');
R.push('고객의 실제 서약 · 편지는 어떤 경우에도 여기 들어오지 않습니다.');
R.push('');

R.push(`## \`${FINAL_FILE}\` 에 무엇이 들어 있나`, '');
for (const m of finalMeta) {
  const src = m.blocks.map((b) => `${String(b.no).padStart(2, '0')} ${b.label}`).join(' + ');
  R.push(`- **${m.role}** · ${m.total}줄 · ${src}`);
  R.push(`  - ${m.finalWhy}`);
}
R.push('');
R.push(`합계 ${finalLines.length}줄 · ${finalLines.join('').length}자.`);
R.push('');

R.push('## 확정 뒤 — 다운로드 설정', '');
R.push('여덟 자리가 다 정해지고 플랜을 결제한 뒤에야 하는 일입니다.');
R.push(`이 폴더가 아니라 상위 \`타입캐스트/\` 의 \`1_안내.txt\` ~ \`5_배역.txt\` 를 받습니다.`, '');
R.push('| 항목 | 화면 기본값 | 우리 설정 | 이유 |');
R.push('|---|---|---|---|');
R.push('| 범위 | 선택 구간 | **전체 스크립트** | 파트 단위로 한 번에 |');
R.push('| 오디오 품질 | 보통 | 보통(무료 · 베이직) / **높음**(프로 이상 👑) | 높음은 유료 잠금 |');
R.push('| 형식 | **mp3** | **★wav** | 조립기가 최종을 mp3로 뽑습니다. mp3로 받으면 이중 손실 |');
R.push('| 출력 | **한 파일로 합치기** | **★문장 별로 나누기** | 합치면 클립 경계 · 여백 · 음량을 조립기가 못 넣습니다 |');
R.push('');
R.push('★**기본값 두 개가 우리 체인과 정반대입니다**(`mp3` · `한 파일로 합치기`).');
R.push('둘 다 바꾸지 않으면 `assemble-narration.mjs` 가 아예 돌지 않습니다.');
R.push('');
R.push('받은 파일은 **파트 번호로 시작하는 폴더**에 각각 풀어 주세요 — `1_/ 2_/ 3_/ 4_/ 5_`.');
R.push('클립 번호는 파트 안에서만 유일하기 때문에, 한 폴더에 섞으면 순서가 무너집니다.');
R.push('');
R.push('넘겨 주시면 개수 · 순서 · 길이 · 음량(-16 LUFS) · 트루피크 · 무음 · 클리핑을 재고 조립기를 돌립니다.');
R.push('**다만 "이 목소리 괜찮나" 는 판정할 수 없습니다 — 이 환경은 소리를 못 듣습니다.** 그건 사람만 할 수 있습니다.');
R.push('');
R.push('---', '');
R.push('생성: `node scripts/build-voice-screen.mjs` · 원천 `docs/plans/식순연구/타입캐스트/manifest.json`');
R.push('대본이 바뀌면 다시 돌리세요. 문장을 손으로 고치면 원본과 어긋납니다.');
R.push('');

fs.writeFileSync(path.join(OUT, 'README.md'), R.join('\n'), 'utf8');

console.log('\n✓ 보이스 스크리닝 대본 생성 완료');
console.log(`  ${path.relative(ROOT, OUT)}/`);
console.log(`    ${SCREEN_FILE}   ${screenLines.length}줄 · 화자 ${spkInScreen.size}명 · ${screenLines.join('').length}자`);
console.log(`    ${FINAL_FILE}    ${finalLines.length}줄 · ${finalLines.join('').length}자`);
console.log(`    README.md`);
console.log('\n  자리별 스크리닝 줄');
for (const m of screenMeta) {
  console.log(`    ${m.role.padEnd(5)} ${String(m.chars).padStart(3)}자  ${m.sents[0].slice(0, 34)}${m.sents[0].length > 34 ? '…' : ''}`);
}
console.log('');
