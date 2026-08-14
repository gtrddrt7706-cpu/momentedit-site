// 어조 38벌의 붙여넣기 대본을 뽑는다 [TONE_DUB]
//
//   node scripts/build-tone-dub.mjs           대조만 (파일 안 씀)
//   node scripts/build-tone-dub.mjs --write   파일 씀
//
// ★왜 따로 만드나 — `build-typecast-import.mjs` 는 `manifest.json` 을 원천으로 돈다.
//   어조 38벌은 아직 manifest 에 없다(엔진 배선·생성기 재실행이 끝난 뒤에 들어온다).
//   그런데 더빙은 그 전에 시작할 수 있다. 문안은 이미 `TONE` 표에 다 있기 때문이다.
//   **대본을 먼저 뽑아 두면 사람이 기다리지 않는다.** 그게 이 파일의 존재 이유다.
//
// ★규격을 여기서 새로 정의하지 않는다 [ONE_SPEC]
//   줄 꼴(`화자: 대사`)·문장 쪼개기(`(?<=[.!?])\s+`)·화자 이름은 전부
//   이미 돌아가는 파이프라인에서 그대로 가져온다. 여기서 다시 정하면 규격이 둘이 되고,
//   언젠가 갈라진다(이 저장소가 실제로 겪은 병 · check-listen-export 머리말 참고).
//   ★뽑은 뒤 `node scripts/check-paste-format.mjs` 가 재는 것과 **같은 정규식**으로 자가검사한다.
//
// ★manifest 를 건드리지 않는다. 이 파일이 쓰는 것은 새 txt 둘뿐이다 —
//   자동생성물(manifest.json · 더빙_녹음_대본_*)은 생성기가 쓴다.
//
// ★종료 코드 [CANT_LOOK] 0 통과 · 1 재서 틀림 · 2 재지 못함
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'package.json'));
const D = require(path.join(ROOT, 'assets/ritual-data.js'));
const DIR = path.join(ROOT, 'docs/plans/식순연구/타입캐스트');
const WRITE = process.argv.includes('--write');

if (!D.TONE) { console.log('못 잼: ritual-data 에 TONE 표가 없다'); process.exit(2); }

/* ── 파이프라인에서 그대로 가져온 것 (여기서 정의하지 않는다) ───────────────── */
const splitSents = (para) => para.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
const LINE = /^[가-힣A-Za-z0-9]{1,10}: \S/;            // check-paste-format.mjs 의 그 줄 꼴
const VOICE = '우성';                                   // manifest.voice['진행'] — 진행 나레이션 목소리

/* ── 자리 이름·파일 이름 규칙 ────────────────────────────────────────────────
   슬러그는 기존 나레이션 파일명 관례를 따른다(entry-A · declare-1-solemn …).
   어조는 꼬리에 붙인다: `entry-A-plain`. 사람이 파일을 보고 무엇인지 알 수 있어야 한다. */
const TONE_KO = { plain: '간결(담백)', lyric: '차분(서정)', warm: '다정' };
const GROUP = {
  entry:   { ko: '입장',        slug: (k) => `entry-${k}` },
  declare: { ko: '성혼 선언',   slug: (k) => (k === 'family' ? 'declare-family' : `declare-${k}`) },
  letter:  { ko: '편지 낭독',   slug: (k) => `letter-${k}` },
  tribute: { ko: '부모님 헌정', slug: (k) => `tribute-${k}` },
  toast:   { ko: '축배·케이크', slug: (k) => `toast-${k}` },
};

const rows = [];
for (const g of Object.keys(GROUP)) {
  const tbl = D.TONE[g]; if (!tbl) continue;
  for (const key of Object.keys(tbl)) {
    for (const tone of ['plain', 'lyric', 'warm']) {
      const v = tbl[key][tone]; if (!v) continue;
      /* 축배 `both` 는 문안이 둘이다(커팅 → 잔 전달 뒤 축배). 배열이면 둘로 편다. */
      const texts = Array.isArray(v) ? v : [v];
      texts.forEach((t, i) => rows.push({
        g, key, tone,
        slug: GROUP[g].slug(key) + '-' + tone + (texts.length > 1 ? '-' + (i + 1) : ''),
        ko: `${GROUP[g].ko} · ${key} · ${TONE_KO[tone]}` + (texts.length > 1 ? ` (${i + 1}/${texts.length})` : ''),
        sents: splitSents(t),
      }));
    }
  }
}

/* ── 자가검사 — 뽑은 줄이 붙여넣기 규격을 지키는가 ─────────────────────────── */
let bad = 0;
const no = (m) => { console.error('✗ ' + m); bad++; };
const allLines = rows.flatMap((r) => r.sents.map((s) => `${VOICE}: ${s}`));
allLines.forEach((l) => { if (!LINE.test(l)) no(`줄 꼴이 규격과 다르다: ${l.slice(0, 40)}`); });
if (!rows.length) no('TONE 표에서 뽑힌 문안이 0벌이다');
/* 38 은 52_전부더빙.md 가 못 박은 수다. 어긋나면 표나 문서 한쪽이 틀렸다는 뜻이다. */
if (rows.length !== 38) no(`문안이 ${rows.length}벌이다 — 52_전부더빙.md 는 38벌로 못 박았다`);
{ const seen = new Set(); rows.forEach((r) => { if (seen.has(r.slug)) no(`슬러그 중복: ${r.slug}`); seen.add(r.slug); }); }

/* ── 산출물 ───────────────────────────────────────────────────────────────── */
const paste = allLines.join('\n') + '\n';
const list = [
  '# 어조 38벌 · 재더빙 명단 (2026-08-14)',
  '# 이 파일은 「무엇이 몇 번인지」 보는 명단입니다. 타입캐스트에는 옆 파일',
  '# 「어조38_붙여넣기.txt」 를 통째로 붙여넣으세요(머리말이 없어 읽혀 나갈 것이 없습니다).',
  '# 목소리는 전부 진행 나레이션 · 우성 입니다.',
  `# 총 ${rows.length}벌 · ${allLines.length}문장`,
  '',
  ...rows.map((r, i) => [`[${String(i + 1).padStart(2, '0')}] ${r.slug}   ${r.ko}`,
    ...r.sents.map((s) => `${VOICE}: ${s}`), ''].join('\n')),
].join('\n');

console.log(`어조 대본 — ${rows.length}벌 · ${allLines.length}문장 · 화자 ${VOICE}`);
const byG = {}; rows.forEach((r) => { byG[r.g] = (byG[r.g] || 0) + 1; });
console.log('  자리별:', Object.entries(byG).map(([k, v]) => `${GROUP[k].ko} ${v}`).join(' · '));

if (WRITE && !bad) {
  fs.writeFileSync(path.join(DIR, '어조38_붙여넣기.txt'), paste);
  fs.writeFileSync(path.join(DIR, '어조38_명단.txt'), list);
  console.log('  썼다: 타입캐스트/어조38_붙여넣기.txt · 어조38_명단.txt');
} else if (!WRITE) {
  console.log('  (대조만 · 쓰려면 --write)');
}

console.log(bad ? `틀림 ${bad}건` : '어조 대본 OK');
process.exit(bad ? 1 : 0);
