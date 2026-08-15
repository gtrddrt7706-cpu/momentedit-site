// 어조 60벌의 붙여넣기 대본을 뽑는다 [TONE_DUB]
//
//   node scripts/build-tone-dub.mjs           대조만 (파일 안 씀)
//   node scripts/build-tone-dub.mjs --write   파일 씀
//
// ★왜 따로 만드나 — `build-typecast-import.mjs` 는 `manifest.json` 을 원천으로 돈다.
//   어조 60벌은 아직 manifest 에 없다(엔진 배선·생성기 재실행이 끝난 뒤에 들어온다).
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


/* ★[NARV_DUB 2026-08-14] `NARV` 여섯 자리도 **아직 더빙이 없다.** 실측: manifest 나레이션
   82클립 안에 어조 클립이 0개다. 데이터엔 있는데 소리가 한 번도 안 만들어졌다.
   TONE 38 만 뽑아 놓고 「전부」라고 하면, 첫인사·서약·반지·덕담·자유·폐식 여섯 자리에서만
   어조가 안 먹는 예식이 된다 — 고객은 하나를 골랐는데 절반만 바뀌는 꼴이라 가장 나쁘다.
   ★index 0 은 뽑지 않는다 — 지금까지 쓰던 문안이고 이미 녹음돼 있다(NARR_PICK 규칙). */
const NARV_KO = { welcome: '첫인사', vow: '혼인 서약', ring: '반지 교환', bless: '부모님 덕담', free: '자유 한 칸', close: '폐식·단체촬영' };
const NARV_SLUG = { welcome: 'narr-welcome', vow: 'narr-vow', ring: 'narr-ring', bless: 'narr-bless', free: 'narr-free', close: 'narr-close' };
const TONE_KEY = { '담백': 'plain', '서정': 'lyric', '다정': 'warm' };

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


/* ── NARV 여섯 자리 (index 0 제외 · nar 과 end 는 서로 다른 클립이다) ──────── */
for (const k of Object.keys(D.NARV)) {
  D.NARV[k].forEach((v, i) => {
    if (i === 0) return;
    const tone = TONE_KEY[v.t] || v.t;
    for (const part of ['nar', 'end']) {
      if (!v[part]) continue;
      rows.push({
        g: 'narv', key: k, tone,
        slug: `${NARV_SLUG[k]}-${part === 'nar' ? 'in' : 'out'}-${tone}`,
        ko: `${NARV_KO[k]} · ${part === 'nar' ? '여는 말' : '닫는 말'} · ${TONE_KO[tone]}`,
        sents: splitSents(v[part]),
      });
    }
  });
}

/* ── 자가검사 — 뽑은 줄이 붙여넣기 규격을 지키는가 ─────────────────────────── */
let bad = 0;
const no = (m) => { console.error('✗ ' + m); bad++; };
const allLines = rows.flatMap((r) => r.sents.map((s) => `${VOICE}: ${s}`));
allLines.forEach((l) => { if (!LINE.test(l)) no(`줄 꼴이 규격과 다르다: ${l.slice(0, 40)}`); });
if (!rows.length) no('TONE 표에서 뽑힌 문안이 0벌이다');
/* ★60 = TONE 38 + NARV 22. **사이 순서(valley)는 넣지 않는다.**
   사용자 지시: "사이순서 없에고 어차피 축배 부분있으니깐 좋은소스들 있으면 축배쪽에 추가하고 없으면 제거".
   지금 GADD·gamdong opt 에 살아 있는 것은 제거가 미실행일 뿐이다 —
   곧 지울 자리에 더빙 돈과 사람이 듣는 시간을 쓰지 않는다. valley 를 여기 되살리지 말 것. */
if (rows.length !== 60) no(`문안이 ${rows.length}벌이다 — TONE 38 + NARV 22 = 60 여야 한다`);
{ const seen = new Set(); rows.forEach((r) => { if (seen.has(r.slug)) no(`슬러그 중복: ${r.slug}`); seen.add(r.slug); }); }

/* ── 산출물 ───────────────────────────────────────────────────────────────── */
const paste = allLines.join('\n') + '\n';
const list = [
  /* ★첫 줄이 스스로 버전을 말한다 [TONE_DUB_SELFID]
     같은 대본이 세 번 옛 판으로 전달됐다. 사람은 파일 이름으로 구별을 못 한다 —
     이름은 `어조_명단.txt` 로 고정이고, 안이 38벌인지 60벌인지는 열어야 안다.
     그래서 **첫 줄에 벌 수를 박되 손으로 적지 않는다**(rows.length 를 쓴다).
     손으로 적으면 하드체크만 올리고 머리말은 안 고쳐 「60벌」이라 적힌 64벌 파일이 나온다. */
  `# [TONE_DUB] 어조 ${rows.length}벌 · 더빙 명단`,
  `# ★최신인지 한눈에: 이 줄이 ${rows.length}벌이면 최신 · 38벌이면 옛 파일입니다.`,
  `#   옆 「어조_붙여넣기.txt」 는 「우성:」 줄이 ${allLines.length}개여야 짝이 맞습니다.`,
  '# 이 파일은 「무엇이 몇 번인지」 보는 명단입니다. 타입캐스트에는 옆 파일',
  '# 「어조_붙여넣기.txt」 를 통째로 붙여넣으세요(머리말이 없어 읽혀 나갈 것이 없습니다).',
  '# 목소리는 전부 진행 나레이션 · 우성 입니다.',
  `# 총 ${rows.length}벌 · ${allLines.length}문장`,
  '',
  ...rows.map((r, i) => [`[${String(i + 1).padStart(2, '0')}] ${r.slug}   ${r.ko}`,
    ...r.sents.map((s) => `${VOICE}: ${s}`), ''].join('\n')),
].join('\n');

console.log(`어조 대본 — ${rows.length}벌 · ${allLines.length}문장 · 화자 ${VOICE}`);
const byG = {}; rows.forEach((r) => { byG[r.g] = (byG[r.g] || 0) + 1; });
console.log('  자리별:', Object.entries(byG).map(([k, v]) => (k === 'narv' ? 'NARV 여섯자리' : GROUP[k].ko) + ' ' + v).join(' · '));

if (WRITE && !bad) {
  fs.writeFileSync(path.join(DIR, '어조_붙여넣기.txt'), paste);
  fs.writeFileSync(path.join(DIR, '어조_명단.txt'), list);
  console.log('  썼다: 타입캐스트/어조_붙여넣기.txt · 어조_명단.txt');
} else if (!WRITE) {
  /* ★기본 모드는 **대조**다 [TONE_DUB_DIFF]
     여기 「대조만」이라고 적혀 있었지만 실제로는 아무것도 대조하지 않았다 —
     세는 것은 방금 계산한 rows 였고, 커밋된 파일은 열어 보지도 않았다.
     그래서 옛 명단이 저장소에 남아 있어도 이 검사는 초록이었다(세 번의 오전달이 그 창으로 났다).
     build-tone-table.mjs 가 이미 쓰는 방식대로, 없거나 다르면 그 자리에서 붉게 한다. */
  for (const [name, want] of [['어조_붙여넣기.txt', paste], ['어조_명단.txt', list]]) {
    const p = path.join(DIR, name);
    if (!fs.existsSync(p)) no(`${name} 이 없다 — --write 로 뽑을 것`);
    else if (fs.readFileSync(p, 'utf8') !== want) no(`${name} 이 생성물과 다르다 — 손으로 고쳤거나 옛 판이다(--write 로 다시 뽑을 것)`);
  }
  if (!bad) console.log('  대조 ok — 커밋된 두 파일이 생성물과 같다');
}

console.log(bad ? `틀림 ${bad}건` : '어조 대본 OK');
process.exit(bad ? 1 : 0);
