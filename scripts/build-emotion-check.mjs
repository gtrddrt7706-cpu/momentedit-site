// 감동 구간 — 녹음 들어가기 전에 «귀로 들리는 차례대로» 보는 판 [EMO_CHECK]
//
// 사장님 「편지 등 감동 부분들 대사 더빙전 한번 체크하게 올려줄래?」
//
// ★대사만 따로 뽑지 않는다. 사람 대사는 앞뒤 나레이션과 «한 덩어리»로 들린다 —
//   여는 말이 무엇을 예고했고 닫는 말이 무엇을 받는지를 같이 봐야 그 자리가 되는지 안 되는지 알 수 있다.
//   그래서 큐 엔진이 내는 실제 차례대로 «여는 말 → 사람 대사 → 닫는 말»을 붙여 낸다.
// ★배역 대사는 docs/plans/식순연구/배역_예시_대사.txt 가 원천이고, 나레이션은 ritual-data/cue 가 원천이다.
//   둘을 잇는 표는 ritual-story.js 의 CAST_AT 다 — 여기서 그걸 그대로 쓴다(사본을 만들지 않는다).
// ★한 예식에 다 나오지 않는다(편지 갈래·덕담 유무·헌정 방식이 갈린다). 그래서 팔레트를 훑어
//   «어느 조합에서든 한 번은 나오는» 자리를 전부 모은다. 못 모은 클립은 맨 끝에 이름을 적는다.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const require = createRequire(path.join(ROOT, 'package.json'));
const RC = require(path.join(ROOT, 'assets/ritual-cue.js'));
const ST = require(path.join(ROOT, 'assets/ritual-story.js'));
const MAN = path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json');
const OUT = path.join(ROOT, 'docs/plans/식순연구/감동구간_확인판.txt');
const OUTDIR = path.join(ROOT, 'docs/plans/식순연구/감동구간_성우별');

/* ★★[MAN_IS_SOURCE 2026-09-12] 대사를 배역_예시_대사.txt 에서 «파싱»하지 않는다.
   처음엔 그 txt 를 줄 단위로 훑었는데, 클립 사이에 섞인 «절 제목·설명 문장»이 대사인 척 딸려 왔다
   (26번 뒤에 「편지 (letter · 부모님께 / 서로에게)」와 설명 세 줄이 붙어 나왔다).
   ★manifest.json 이 이미 «어느 클립에 어느 문장이 몇 번째로 들어가는지»를 갖고 있다.
     그게 실제로 녹음·조립에 쓰이는 표다. 사람이 읽는 txt 가 아니라 기계가 쓰는 표를 읽는다.
   ★덤으로 성우 이름도 여기 있다(manifest.voice) — 역할→성우 표를 또 적을 필요가 없다. */
const M = JSON.parse(fs.readFileSync(MAN, 'utf8'));
const CLIP = new Map();
for (const c of M.clips) {
  if (c.dir !== 'assets/audio/cast') continue;
  CLIP.set(c.no + '_' + c.file, { no: c.no, who: c.role, desc: c.label, file: c.no + '_' + c.file,
                                  lines: c.sents.map((x) => x.text) });
}

/* ── 어느 조합에서든 한 번은 나오는 자리를 모은다(첫 발견만 쓴다) */
const COURSES = ['gamdong', 'family', 'damback', 'record', 'minimal', 'festive'];
const SPREAD = [];
for (const course of COURSES)
  for (const letter of ['parent', 'each', 'both'])
    for (const bless of ['on', 'off'])
      for (const tribute of ['flower', 'bow', 'hug'])
        for (const toast of ['toast', 'cake', 'both'])
          SPREAD.push({ course, letter, bless, tribute, toast });

const seen = new Map();   // castId → { blockN, open, close, where }
for (const S of SPREAD) {
  let cues; try { cues = RC.build(S, { mode: 'console' }).cues; } catch (_) { continue; }
  cues.forEach((q, i) => {
    const ids = ST.castIds(q); const list = [].concat(ids.live || [], ids.main || []).filter(Boolean);
    if (!list.length) return;
    const close = (cues[i + 1] && cues[i + 1].text) || '';
    for (const id of list) if (!seen.has(id))
      seen.set(id, { blockN: q.blockN || '', open: q.text || '', close, order: i, course: S.course });
  });
}

/* ── 감동 구간만. 순서는 예식 차례를 따른다(첫인사 → 서약 → 편지 → 덕담 → 헌정 → 축배) */
const WANT = ['06_welcome-groom', '07_welcome-bride',
              '08_vow-groom', '09_vow-bride', '26_vow-both',
              '10_letter-parent', '11_letter-each',
              '12_bless-father', '13_bless-mother',
              '14_tribute', '27_tribute-reply', '15_toast'];
/* ★24·25 는 합창의 «재료»라 뺀다 — 그대로 틀면 같은 말이 두 번 들린다(26 이 그 둘을 겹친 결과물). */

/* 역할→성우는 manifest.voice 가 원천이다. 거기 없는 역할(시어머님)은 아직 안 정해진 것이다. */
const VOICE = (who) => M.voice[who] || (who === '신랑|신부' ? (M.voice['신랑'] + ' + ' + M.voice['신부']) : '★미정');

const W = 78;
const bar = (c) => c.repeat(W);
const out = [];
out.push(bar('═'));
out.push('  감동 구간 확인판 — 녹음 들어가기 전에 보는 판');
out.push('');
out.push('  · 귀에 들리는 차례 그대로입니다. 나레이션 «여는 말» 과 «닫는 말» 을 같이 넣었습니다.');
out.push('    대사만 따로 보면 그 자리가 되는지 안 되는지 안 보여서입니다.');
out.push('  · 고칠 곳은 줄 앞에 아무 표시나 해서 돌려주시면 됩니다. 제가 원천에 반영합니다.');
out.push('  · 자동 생성물입니다 — 이 파일을 고쳐도 대본은 안 바뀝니다(scripts/build-emotion-check.mjs).');
out.push(bar('═'));

let n = 0, missing = [];
/* ★같은 «자리»에 두 사람 이상이 이어서 말하는 곳이 있다(첫인사 신랑→신부, 서약 신랑→신부→합창,
   덕담 아버님→어머님, 헌정 신랑→시어머님). 여는 말·닫는 말은 그 자리에 «하나»다.
   클립마다 되풀이해 찍으면 서로 다른 순서처럼 보여, 실제보다 길고 산만하게 읽힌다. 묶어서 한 번만 찍는다. */
const GROUPS = [];
for (const id of WANT) {
  const c = CLIP.get(id), at = seen.get(id);
  if (!c) { missing.push(id + ' (배역 대사 없음)'); continue; }
  if (!at) { missing.push(id + ' (어떤 조합에서도 안 걸림)'); continue; }
  const key = at.blockN + '\u0000' + at.open + '\u0000' + at.close;
  let g = GROUPS.find((x) => x.key === key);
  if (!g) { g = { key, at, clips: [] }; GROUPS.push(g); }
  g.clips.push(c);
  n++;
}
for (const g of GROUPS) {
  const at = g.at;
  out.push('');
  out.push(bar('\u2500'));
  out.push('  ' + (at.blockN || g.clips[0].desc)
    + (g.clips.length > 1 ? `   (${g.clips.map((c) => c.who).join(' \u2192 ')} \uc21c\uc11c\ub85c \uc774\uc5b4\uc9d1\ub2c8\ub2e4)` : ''));
  out.push(bar('\u2500'));
  if (at.open) { out.push(''); out.push('  \ub098\ub808\uc774\uc158(\uc6b0\uc131) \u2014 \uc5ec\ub294 \ub9d0'); for (const s of split(at.open)) out.push('    ' + s); }
  for (const c of g.clips) {
    out.push('');
    out.push(`  [${c.no}] ${c.who} \u00b7 \uc131\uc6b0 ${VOICE(c.who)} \u00b7 ${c.lines.length}\ubb38\uc7a5 \u00b7 ${c.file}`);
    out.push('');
    for (const l of c.lines) out.push('      ' + l);
  }
  if (at.close) { out.push(''); out.push('  \ub098\ub808\uc774\uc158(\uc6b0\uc131) \u2014 \ub2eb\ub294 \ub9d0'); for (const s of split(at.close)) out.push('    ' + s); }
}

/* 한 문단짜리 나레이션은 문장마다 줄을 바꾼다 — 소리로는 한 문장이 한 호흡이다 */
function split(t) { return String(t).split(/(?<=[.!?])\s+/).filter(Boolean); }

out.push('');
out.push(bar('═'));
out.push(`  클립 ${n}개 · 문장 ${WANT.map((i) => (CLIP.get(i) || { lines: [] }).lines.length).reduce((a, b) => a + b, 0)}개`);
if (missing.length) { out.push('  ★빠진 것: ' + missing.join(' / ')); }
out.push(bar('═'));

fs.writeFileSync(OUT, out.join('\n') + '\n');
console.log(`[EMO_CHECK] ${n}클립 → ${path.relative(ROOT, OUT)}`);
if (missing.length) console.log('  ★빠진 것: ' + missing.join(' / '));

/* ═══════════════════════════════════════════════════════════════
   붙여넣기용 — 성우별 맨몸 대본  [PASTE_CLEAN]

   ★★왜 따로 만드나 (2026-09-12 사장님 실사고)
     위 «확인판»을 타입캐스트에 그대로 붙이셨더니 구분선·머리말·설명문까지 전부 읽혔다.
     11분 45초짜리가 나왔고, 첫 문장이 「감동 구간 확인판 — 녹음 들어가기 전에 보는 판」이었다.
     ★확인판은 «눈»으로 보는 판이고, 이 폴더는 «기계»에 붙이는 판이다. 한 파일이 둘을 겸할 수 없다.
     ★그래서 여기 나가는 줄은 «대사와 나레이션 문장뿐»이다. 제목도 번호도 설명도 한 줄 없다.
       그걸 사람 눈이 아니라 아래 검사가 지킨다 — 장식이 한 글자라도 섞이면 아무것도 안 쓴다.
   ★26(합창)은 두 성우 파일에 «둘 다» 들어간다 — 실제로 둘이 따로 녹음해 겹치는 클립이다.
     0_전체 에는 한 번만 넣는다(두 번 넣으면 붙여 들을 때 같은 말이 두 번 들린다). */
const DECOR = /[═─━│┃★※«»]|^\s*\[|^\s*[·•]/;
/* ★성우가 안 정해진 역할은 «★미정»이 아니라 «역할 이름»을 머리에 쓴다.
   붙여넣기 판에는 별표 한 글자도 들어가면 안 된다 — 기계가 그걸 읽는다.
   실제로 이 검사에 걸렸다(「★미정: 서준아.」). 역할 이름이면 뜻도 통하고 깨끗하다. */
const NAME = (who) => M.voice[who] || who;
const byVoice = new Map();   // 성우 → 줄[]
const whole = [];            // '성우: 문장'
const put = (v, line) => { if (!byVoice.has(v)) byVoice.set(v, []); byVoice.get(v).push(line); };

for (const g of GROUPS) {
  const narV = M.voice['진행'] || '우성';
  for (const t of split(g.at.open || '')) { put(narV, t); whole.push(narV + ': ' + t); }
  for (const c of g.clips) {
    const v = NAME(c.who);
    if (c.who === '신랑|신부') {
      /* 합창 재료 — 두 사람이 따로 녹음한다. 파일에는 둘 다, 한 번에 듣는 판에는 한 번만. */
      for (const l of c.lines) { put(M.voice['신랑'], l); put(M.voice['신부'], l); }
      for (const l of c.lines) whole.push(M.voice['신랑'] + ': ' + l);
      continue;
    }
    for (const l of c.lines) { put(v, l); whole.push(v + ': ' + l); }
  }
  for (const t of split(g.at.close || '')) { put(narV, t); whole.push(narV + ': ' + t); }
}

/* 순서를 고정한다 — 예식에서 먼저 나오는 성우가 앞 번호를 갖는다(진행이 1번) */
const ORDER = [M.voice['진행'], M.voice['신랑'], M.voice['신부'], M.voice['아버님'], M.voice['어머님'], M.voice['하객대표'], '시어머님'];
const voices = [...byVoice.keys()].sort((a, b) => {
  const ia = ORDER.indexOf(a), ib = ORDER.indexOf(b);
  return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
});

/* ★장식이 한 글자라도 섞이면 아무것도 쓰지 않는다. 절반만 깨끗한 파일이 제일 위험하다 —
   붙여 넣고 나서야 알게 되고, 그때는 이미 크레딧을 썼다. */
const dirty = [...whole, ...[...byVoice.values()].flat()].filter((l) => DECOR.test(l));
if (dirty.length) {
  console.log('  ✗ 붙여넣기 판에 장식이 섞였다 — 아무것도 쓰지 않는다:');
  dirty.slice(0, 5).forEach((l) => console.log('      ' + l));
  process.exit(2);
}

fs.mkdirSync(OUTDIR, { recursive: true });
for (const f of fs.readdirSync(OUTDIR)) fs.unlinkSync(path.join(OUTDIR, f));   // 옛 성우 파일이 남지 않게
fs.writeFileSync(path.join(OUTDIR, '0_전체_화자표기.txt'), whole.join('\n') + '\n');
voices.forEach((v, i) => {
  const name = (i + 1) + '_' + (M.voice[v] || ORDER.indexOf(v) >= 0 && v !== '시어머님' ? v : v + '_성우미정') + '.txt';
  fs.writeFileSync(path.join(OUTDIR, name), byVoice.get(v).join('\n') + '\n');
});
fs.writeFileSync(path.join(OUTDIR, 'README.md'),
  ['# 감동 구간 — 붙여넣기용 (자동 생성 · 손으로 고치지 마세요)',
   '',
   '`node scripts/build-emotion-check.mjs` 가 만듭니다.',
   '',
   '**이 폴더의 txt 는 대사 줄만 있습니다.** 제목·번호·설명이 한 줄도 없어서 그대로 붙이면 됩니다.',
   '눈으로 차례를 볼 때는 `../감동구간_확인판.txt` 를 보세요 — 그쪽은 붙이면 장식까지 읽힙니다.',
   '',
   '| 파일 | 성우 | 줄 |',
   '|---|---|---|',
   ...voices.map((v, i) => `| ${(i + 1)}_${v === '시어머님' ? '시어머님_성우미정' : v}.txt | ${v === '시어머님' ? '아직 안 정해짐' : v} | ${byVoice.get(v).length} |`),
   `| 0_전체_화자표기.txt | 전부 (\`성우: 대사\`) | ${whole.length} |`,
   '',
   '★26번(서약 마지막 합창)은 신랑·신부 파일에 **둘 다** 들어 있습니다 — 실제로 둘이 따로 녹음해 겹치는 클립입니다.',
   '  0_전체 에는 한 번만 넣었습니다(두 번 넣으면 붙여 들을 때 같은 말이 두 번 들립니다).',
   ''].join('\n'));

console.log(`[PASTE_CLEAN] ${voices.length}명 · ${whole.length}줄 → ${path.relative(ROOT, OUTDIR)}/`);
voices.forEach((v, i) => console.log(`   ${(i + 1)}_${v}  ${String(byVoice.get(v).length).padStart(3)}줄`));
