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
const CASTSRC = path.join(ROOT, 'docs/plans/식순연구/배역_예시_대사.txt');
const OUT = path.join(ROOT, 'docs/plans/식순연구/감동구간_확인판.txt');

/* ── 배역 대사 파싱 — 머리줄 `[NN] R-slug · 역할 · 설명 → NN_file.mp3` 로 끊는다 */
const CLIP = new Map();
{
  let cur = null;
  for (const raw of fs.readFileSync(CASTSRC, 'utf8').split('\n')) {
    const h = /^\[(\d{2})\]\s*(R-[\w-]+)\s*·\s*([^·]+?)\s*·\s*(.+?)\s*→\s*(\S+)\s*$/.exec(raw.trim());
    if (h) { cur = { no: h[1], slug: h[2], who: h[3].trim(), desc: h[4].trim(), file: h[5], lines: [] };
             CLIP.set(h[5].replace(/\.mp3$/, ''), cur); continue; }
    if (!cur) continue;
    const t = raw.trim();
    if (!t) continue;
    if (/^[─═—-]{5,}$/.test(t)) { cur = null; continue; }     // 구분선이면 그 묶음 끝
    if (/^[★※(]/.test(t)) continue;                            // 지문·주석은 대사가 아니다
    cur.lines.push(t);
  }
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

const VOICE = { '신랑': '이겸', '신부': '서진', '아버님': '권일', '어머님': '주하',
                '하객대표': '규민', '시어머님': '★미정', '신랑|신부': '이겸 + 서진' };

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
    out.push(`  [${c.no}] ${c.who} \u00b7 \uc131\uc6b0 ${VOICE[c.who] || '?'} \u00b7 ${c.lines.length}\ubb38\uc7a5 \u00b7 ${c.file}`);
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
