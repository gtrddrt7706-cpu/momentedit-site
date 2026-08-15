// 더빙할 것을 **한 파일**로 합친다 [DUB_ONEFILE]
//
//   node scripts/build-dub-onefile.mjs           대조만 (파일 안 씀)
//   node scripts/build-dub-onefile.mjs --write   파일 씀
//
// ★왜 합치나 — 2026-08-15 사용자 지시:
//   *"어조명단, 리드보강도 파일만붙이면 바로 만들수있게 만들어죠 4개 파일 그냥 하나로 만들고
//     너한테 보내면 너가알아서 분리해도돼잖아"*
//   사람이 타입캐스트에 붙여넣는 횟수는 **한 번**이면 된다. 나눠 붙이면 그때마다 순서가
//   섞일 창이 생기고, 어느 파일을 붙였는지 기억해야 한다. 그건 기계가 할 일이다.
//   되돌리는 쪽(wav → 클립별 이름)은 `순서.json` 을 읽어 내가 한다.
//
// ★규격을 여기서 새로 정의하지 않는다 [ONE_SPEC]
//   원천은 이미 있는 **생성물 둘**이다 —
//     · 어조_붙여넣기.txt / 어조_명단.txt      ← build-tone-dub.mjs
//     · 재더빙_붙여넣기.txt / 재더빙_리드보강.txt ← check-text-audio.mjs --redub
//   여기서는 **읽어서 잇기만** 한다. 문안을 다시 쓰지 않는다.
//   ★그리고 이은 결과가 원천과 같은지 되대조한다 — 명단에서 뽑은 문장을 이으면
//   붙여넣기 파일과 **글자 하나까지 같아야** 한다. 다르면 둘 중 하나가 낡은 것이다.
//
// ★자동생성물이다. 손으로 고치지 말 것 — 고칠 것이 있으면 원천 생성기를 고치고 다시 뽑는다.
//
// ★종료 코드 [CANT_LOOK] 0 통과 · 1 재서 틀림 · 2 재지 못함
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'docs/plans/식순연구/타입캐스트');
const WRITE = process.argv.includes('--write');

let bad = 0;
const no = (m) => { console.error('✗ ' + m); bad++; };

/* ── 원천 둘 ─────────────────────────────────────────────────────────────────
   묶음마다 「붙여넣기(문장만)」와 「명단(클립 경계가 있는 것)」이 짝을 이룬다.
   경계는 명단에서만 알 수 있고, 문장은 붙여넣기가 정본이다 — 둘을 대조해 쓴다. */
const SRC = [
  { key: 'tone',  paste: '어조_붙여넣기.txt',   list: '어조_명단.txt',      ko: '어조 60벌' },
  { key: 'redub', paste: '재더빙_붙여넣기.txt', list: '재더빙_리드보강.txt', ko: '재더빙 대기' },
];

const LINE = /^([가-힣A-Za-z0-9]{1,10}): (\S.*)$/;   // check-paste-format.mjs 의 그 줄 꼴
const HEAD = /^\[(\d+)\]\s+(\S+)/;                    // `[63] narr-final-warn   …`

const groups = [];      // { src, no, slug, ko, lines: ['우성: …'] }
const allLines = [];

for (const s of SRC) {
  const pp = path.join(DIR, s.paste), lp = path.join(DIR, s.list);
  if (!fs.existsSync(pp)) { no(`${s.paste} 이 없다 — 원천 생성기를 먼저 돌릴 것`); continue; }
  if (!fs.existsSync(lp)) { no(`${s.list} 이 없다 — 원천 생성기를 먼저 돌릴 것`); continue; }

  const pasteLines = fs.readFileSync(pp, 'utf8').split('\n').filter((l) => l.trim());
  pasteLines.forEach((l) => { if (!LINE.test(l)) no(`${s.paste} 줄 꼴이 규격과 다르다: ${l.slice(0, 40)}`); });

  /* 명단에서 클립 경계를 읽는다 — `[NN] slug` 를 만나면 새 클립, `화자: 대사` 는 그 클립에 쌓는다 */
  let cur = null;
  const mine = [];
  for (const raw of fs.readFileSync(lp, 'utf8').split('\n')) {
    const l = raw.replace(/\r$/, '');
    if (/^\s*#/.test(l)) continue;                       // 머리말
    const h = HEAD.exec(l.trim());
    if (h) { cur = { src: s.key, no: h[1], slug: h[2], ko: l.trim().slice(h[0].length).trim(), lines: [] }; mine.push(cur); continue; }
    if (LINE.test(l) && cur) cur.lines.push(l);
  }
  if (!mine.length) { no(`${s.list} 에서 클립을 하나도 못 읽었다(형식이 바뀌었나)`); continue; }
  mine.forEach((g) => { if (!g.lines.length) no(`${s.list} · ${g.slug} 에 문장이 0개다`); });

  /* ★★순서의 정본은 **붙여넣기 쪽**이다 [PASTE_IS_ORDER]
     둘의 순서는 일부러 다를 수 있다 — `재더빙_붙여넣기.txt` 는 **클립 번호 오름차순**으로
     정렬되고(check-text-audio.mjs 의 [PASTE_ONLY] 주석: "조립기가 받은 파일을 정렬해 대장의
     문장 순서에 하나씩 대응시킨다"), 명단은 발견 순서다. 실측으로 확인한 실제 차이:
     붙여넣기 38·63·80 / 명단 63·80·38.
     그러니 **순서가 같은지 묻지 않는다.** 사람이 붙여넣을 것이 붙여넣기 파일이고,
     wav 도 그 순서로 돌아오기 때문이다. 명단에서는 **경계(어디서 어디까지가 한 클립인지)만**
     가져와, 붙여넣기 줄을 앞에서부터 훑으며 맞는 클립을 하나씩 집어낸다.
     ★검사는 약해지지 않는다 — 한 줄도 남거나 모자라면 그 자리에서 붉어진다. */
  const pool = mine.slice();
  const picked = [];
  let p = 0;
  while (p < pasteLines.length) {
    const i = pool.findIndex((g) => g.lines.every((l, k) => pasteLines[p + k] === l));
    if (i === -1) {
      no(`${s.ko}: ${p + 1}번째 줄에서 맞는 클립을 못 찾았다 — 명단과 붙여넣기가 어긋난다(원천 생성기를 다시 돌릴 것)\n    줄: ${String(pasteLines[p]).slice(0, 50)}`);
      break;
    }
    const g = pool.splice(i, 1)[0];
    picked.push(g); p += g.lines.length;
  }
  if (pool.length) no(`${s.ko}: 명단에만 있고 붙여넣기엔 없는 클립 ${pool.length}개 (${pool.map((g) => g.slug).join(' · ')}) — 원천 생성기를 다시 돌릴 것`);

  groups.push(...picked);
  allLines.push(...pasteLines);
}

if (!groups.length && !bad) no('합칠 것이 하나도 없다');

/* ── 산출물 ───────────────────────────────────────────────────────────────── */
const paste = allLines.join('\n') + '\n';

/* 순서표 — wav 를 되돌려 나눌 때 읽는다. 손으로 적지 않는다(groups 에서 계산). */
let at = 0;
const order = groups.map((g, i) => {
  const o = { 순번: i + 1, 묶음: g.src, 번호: g.no, slug: g.slug, 이름: g.ko, 문장수: g.lines.length, 시작줄: at + 1, 끝줄: at + g.lines.length };
  at += g.lines.length;
  return o;
});

const orderJson = JSON.stringify({
  마커: 'DUB_ONEFILE',
  총클립: groups.length,
  총문장: allLines.length,
  안내: 'wav 를 이름순으로 정렬해 위에서부터 문장수만큼 끊어 각 클립에 배정한다. scripts/split-dub-onefile.mjs 가 읽는다.',
  클립: order,
}, null, 1) + '\n';

/* 사람이 보는 안내 — 파일 하나만 붙이면 된다는 것과, 순서가 곧 정본이라는 것 */
const guide = [
  `# [DUB_ONEFILE] 더빙 한 번에 · 클립 ${groups.length}개 · 문장 ${allLines.length}개`,
  `# ★최신인지 한눈에: 이 줄이 클립 ${groups.length}개 · 문장 ${allLines.length}개면 최신입니다.`,
  '#',
  '# 붙여넣을 파일은 옆의 「더빙_한번에.txt」 하나뿐입니다(머리말이 없어 읽혀 나갈 것이 없습니다).',
  '# 목소리는 전부 진행 나레이션 · 우성 입니다.',
  '# 뽑은 wav 는 이름을 바꾸지 말고 폴더째 주세요 — 순서대로 끊어 제가 나눕니다.',
  '#',
  '# 아래는 「몇 번째가 무엇인지」 보는 표입니다. 붙여넣지 마세요.',
  '',
  ...groups.map((g, i) => {
    const s = order[i];
    return `[${String(i + 1).padStart(3, '0')}] ${g.slug}   ${g.ko}\n` +
      `      ${g.src === 'redub' ? '재더빙' : '어조'} · 문장 ${g.lines.length}개 · ${s.시작줄}~${s.끝줄}번째 줄\n` +
      g.lines.map((l) => '      ' + l).join('\n') + '\n';
  }),
].join('\n');

console.log(`더빙 한 번에 — 클립 ${groups.length}개 · 문장 ${allLines.length}개`);
const byS = {}; groups.forEach((g) => { byS[g.src] = (byS[g.src] || 0) + g.lines.length; });
console.log('  묶음별 문장:', Object.entries(byS).map(([k, v]) => (k === 'redub' ? '재더빙' : '어조') + ' ' + v).join(' · '));

const OUT = [['더빙_한번에.txt', paste], ['더빙_한번에_순서.json', orderJson], ['더빙_한번에_명단.txt', guide]];
if (WRITE && !bad) {
  OUT.forEach(([n, v]) => fs.writeFileSync(path.join(DIR, n), v));
  console.log('  썼다: ' + OUT.map(([n]) => n).join(' · '));
} else if (!WRITE) {
  /* 기본 모드는 대조다 — 커밋된 파일이 지금 생성물과 같은가(build-tone-dub 의 [TONE_DUB_DIFF] 와 같은 규칙) */
  for (const [n, want] of OUT) {
    const p = path.join(DIR, n);
    if (!fs.existsSync(p)) no(`${n} 이 없다 — --write 로 뽑을 것`);
    else if (fs.readFileSync(p, 'utf8') !== want) no(`${n} 이 생성물과 다르다 — 손으로 고쳤거나 옛 판이다(--write 로 다시 뽑을 것)`);
  }
  if (!bad) console.log('  대조 ok — 커밋된 세 파일이 생성물과 같다');
}

console.log(bad ? `틀림 ${bad}건` : '더빙 한 번에 OK');
process.exit(bad ? 1 : 0);
