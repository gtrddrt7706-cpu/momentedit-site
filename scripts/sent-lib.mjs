/* ★★[SENT_LIB 2026-09-13 사장님 「보수하기쉽게셋팅해 여러번 한문장씩수정하는부분들이 있을거야」]
 *
 * 문장 «한 자리»의 소리를 창고에 두고, 고친 문장만 갈아 끼워 클립을 다시 붙인다.
 *
 * ── 왜 필요했나
 *   원본 문장 wav 가 저장소에 «0개»였다. 그래서 4문장짜리 클립에서 한 줄만 고쳐도
 *   그 클립을 통째로 다시 받아야 했다(실측: 75문장 고치는 데 200문장 재녹음 vs 79종).
 *   조립된 mp3 를 잘라 쓰는 길은 이 저장소가 이미 막아 두었다 — 정규화·페이드가 걸린 결과물이라
 *   다시 인코딩하면 소리가 상하고, 문장 경계를 무음으로 «추정»해야 한다. 추정한 자리는 언젠가 틀린다.
 *   그러니 «받은 그대로»를 남겨 두는 것이 유일한 길이다.
 *
 * ── 이름을 «자리»로 짓는다  [SLOT_NAME]
 *   타입캐스트가 주는 audio_137_… 번호는 «그날 붙여넣은 순서»일 뿐이다. 대본이 한 줄 늘면 전부 밀린다.
 *   창고는 assets/audio/_src/<NN_file>/<i>.flac 로 둔다 — 클립과 문장 자리는 대장이 정하므로 안 밀린다.
 *
 * ── 무손실로 절반  [FLAC_HALF]
 *   flac 은 무손실이라 소리가 하나도 안 상하고 크기는 절반이다(실측 264KB → 133KB).
 *   조립기는 ffmpeg 로 읽으므로 형식을 가리지 않는다.
 *
 * ── 글이 바뀌면 그 자리는 «낡은» 것이다  [SRC_STALE]
 *   창고에 그 자리의 «그때 글»을 함께 적어 둔다. 대장의 글과 다르면 낡은 것이고, 다시 받아야 한다.
 *   적어 두지 않으면 옛 소리를 새 글의 자리에 조용히 끼우게 된다 — 가장 나쁜 실패다.
 *
 * 쓰기
 *   node scripts/sent-lib.mjs --status
 *       자리마다 있음/없음/낡음을 센다. 아무것도 안 쓴다.
 *   node scripts/sent-lib.mjs --import <폴더|zip> [--order <_전체_순서.json>] [--voice 예슬] [--clip =08_vow-groom,=24_vow-both-1]
 *       --clip 은 몇 클립만 다시 받았을 때 — 대장에서 그 클립들의 문장 차례로 순서표를 만든다([CLIP_ORDER]).
 *       타입캐스트 «문장별 분리» 다운로드를 창고에 넣는다. 이름과 글을 대조해 넣고, 안 맞으면 안 넣는다.
 *       묶음의 성우는 내용으로 알아내 그 성우의 줄에서만 찾는다([IMPORT_VOICE_LOCK]) · --voice 는 손으로 알려 주는 덤.
 *   node scripts/sent-lib.mjs --patch --sent "<문장>" --wav <파일> [--keep-gap]
 *       그 문장이 있는 «모든» 자리의 소리를 새것으로 바꾼다. --keep-gap 이면 조립 때 안쪽 쉼을 안 깎는다([ENTRY_GAP_KEEP]).
 *   node scripts/sent-lib.mjs --prune [--write]
 *       문안에서 빠져 «주인이 없어진» 자리를 창고에서도 뺀다. 기본은 미리보기.
 *   node scripts/sent-lib.mjs --stage <나갈폴더> [--clip =12_bless-father,…]
 *       창고에서 꺼내 조립기가 먹는 모양(번호순 낱개)으로 깔아 준다. 그 뒤 assemble-narration 을 부른다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { isWholeTake } from './lib/whole-take.mjs';   // [LETTER_WHOLE_TAKE]

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (r) => path.join(ROOT, r);
const LIB = P('assets/audio/_src');
const IDX = path.join(LIB, '_index.json');
const MAN = P('docs/plans/식순연구/타입캐스트/manifest.json');
const ORD = P('docs/plans/식순연구/타입캐스트/다시받기/_전체_순서.json');

const arg = (k, d = '') => { const i = process.argv.indexOf(k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const has = (k) => process.argv.includes(k);
const pad2 = (n) => String(n).padStart(2, '0');

let man; try { man = JSON.parse(fs.readFileSync(MAN, 'utf8')); }
catch (e) { console.log('✗ 대장을 못 읽었다 — ' + e.message); process.exit(2); }

/* 대장이 정하는 «모든 자리» */
/* ★★[SENT_RETIRED 2026-09-19] 폐지한 클립의 자리는 «다시 받을 것»에 세지 않는다.
   ★왜 자리 자체는 남기나 — 폐지해도 파일·번호는 그대로 둔다(SONG_RETIRED). 창고에서 지우면
     되살릴 때 다시 받아야 하고, 지금 당장은 sent-lib-check 가 «대장에 없는 자리»로 붉어진다.
   ★왜 그래도 가르나 — ROUND_FREE 직후 실측: 폐지한 두 클립 때문에 --status 가 「다시 받아야 할 것
     3문장」이라고 했는데, 정작 다시받기 목록(build-redub-byvoice)은 0줄이었다. 둘이 어긋나면
     사람이 «있지도 않은 할 일»을 하러 간다. 세는 자와 시키는 자가 같은 것을 봐야 한다. */
/* ★★[RETIRED_TWO_SOURCES 2026-09-21] 폐지 원천이 **두 곳**이다 — 한 곳만 보면 절반이 샌다.
     ① assets/ritual-cue.js 의 RETIRED          (나레이션 · 예: 79_narr-entry-out-B)
     ② build-typecast-import.mjs 의 CAST_HOLD   (배역 · 예: 15_toast)
   sent-lib-check 는 이미 둘을 본다([RETIRED_SLOT]). 이 파일은 ①만 봤다 —
   그래서 «세는 자»와 «시키는 자»가 또 갈라져 있었다. 위 64행이 경계한 바로 그 어긋남이다.
   ★실제로 걸렸다: --prune 이 15_toast 7자리를 «주인 없는 자리»로 보고 지우려 했다.
     그건 사장님 지시로 끈 클립이지 없앤 클립이 아니다(2026-09-20 「친구부분멘트 아예 삭제」). */
const RETIRED_CLIP = (() => {
  const out = new Set();
  try {
    const cue = fs.readFileSync(P('assets/ritual-cue.js'), 'utf8');
    const b = /var RETIRED = \{([\s\S]*?)\};/.exec(cue);
    if (b) for (const m of b[1].matchAll(/'([^']+)'\s*:\s*1/g)) out.add(m[1]);
  } catch { /* 못 읽으면 아무것도 봐주지 않는다 — 조용히 넓어지는 쪽으로 틀리지 않는다 */ }
  try {
    const ti = fs.readFileSync(P('scripts/build-typecast-import.mjs'), 'utf8');
    if (/\/\^R-toast\$\/\.test\(id\)/.test(ti)) out.add('toast');
  } catch { /* 같음 */ }
  return out;
})();
const slots = [];
for (const c of man.clips) {
  if (c.mix) continue;
  if (isWholeTake(c)) continue;   // [LETTER_WHOLE_TAKE] 통낭독은 문장 단위 창고가 해당 없다
  const key = pad2(c.no) + '_' + c.file;
  const off = RETIRED_CLIP.has(c.file);   // [SENT_RETIRED] 자리는 남기고 «안 나간다»고만 적는다
  c.sents.forEach((s) => slots.push({ key, i: s.i, id: key + '#' + s.i, text: s.text, role: s.role || c.role, off }));
}
const VOICE = man.voice || {};
const bySlot = new Map(slots.map((s) => [s.id, s]));

const loadIdx = () => { try { return JSON.parse(fs.readFileSync(IDX, 'utf8')); } catch { return { _왜: '문장 한 자리의 «받은 그대로» 소리. 글이 바뀌면 그 자리는 낡은 것이다(SRC_STALE).', slots: {} }; } };
const saveIdx = (j) => {
  const sorted = {};
  for (const k of Object.keys(j.slots).sort()) sorted[k] = j.slots[k];
  j.slots = sorted;
  j._언제 = `${new Date().toISOString().slice(0, 10)} · ${Object.keys(sorted).length}자리`;
  fs.mkdirSync(LIB, { recursive: true });
  fs.writeFileSync(IDX, JSON.stringify(j, null, 1) + '\n');
};
const fileOf = (id) => path.join(LIB, id.split('#')[0], id.split('#')[1] + '.flac');

/* ── 상태 ─────────────────────────────────────────────── */
function status() {
  const j = loadIdx();
  const have = [], stale = [], none = [];
  for (const s of slots) {
    const e = j.slots[s.id];
    if (!e || !fs.existsSync(fileOf(s.id))) { none.push(s); continue; }
    (e.text === s.text ? have : stale).push(s);
  }
  console.log(`[SENT_LIB] 대장의 문장 자리 ${slots.length}개`);
  console.log(`   ✓ 소리가 있고 글도 그대로 : ${have.length}`);
  console.log(`   ★글이 바뀌어 낡은 자리    : ${stale.length}`);
  console.log(`   · 아직 소리가 없는 자리   : ${none.length}`);
  const byVoice = {};
  const offN = [...stale, ...none].filter((s) => s.off).length;   // [SENT_RETIRED]
  for (const s of [...stale, ...none]) { if (s.off) continue; const v = VOICE[s.role] || '★미정'; (byVoice[v] ??= []).push(s); }
  if (offN) console.log(`   (그중 ${offN}자리는 폐지한 클립이라 «다시 받을 것»에 세지 않습니다)`);
  if (Object.keys(byVoice).length) {
    console.log('\n   다시 받아야 할 것 (성우별)');
    for (const [v, l] of Object.entries(byVoice).sort((a, b) => b[1].length - a[1].length))
      console.log(`     ${v.padEnd(6)} ${String(l.length).padStart(3)}문장`);
  }
  if (stale.length) {
    console.log('\n   ★낡은 자리 (글이 바뀌었다 · 옛 소리를 그대로 쓰면 안 된다)');
    for (const s of stale.slice(0, 12)) {
      console.log(`     ${s.id}  ${VOICE[s.role] || '★미정'}${s.off ? '  · 폐지된 클립(안 나갑니다)' : ''}`);
      console.log(`        지금 글 「${s.text}」`);
      console.log(`        창고 글 「${j.slots[s.id].text}」`);
    }
    if (stale.length > 12) console.log(`     … 그 밖 ${stale.length - 12}자리`);
  }
  return { have, stale, none };
}

/* ── 들이기 ───────────────────────────────────────────── */
function importFrom(src) {
  let ord; try { ord = JSON.parse(fs.readFileSync(arg('--order', ORD), 'utf8')); }
  catch (e) { console.log('✗ 붙여넣기 순서표를 못 읽었다 — ' + e.message); process.exit(2); }
  /* ★[VOICE_ORDER 2026-09-26 코워크 회신8 덧2] --voice 한 사람이고 --order 가 없으면 다시받기/_순서.json 의 그 성우 줄로 순서표를 만든다.
     성우별 zip 은 audio_0 부터 그 성우 파일(예: 3_예슬.txt) 차례라 번호와 이름이 둘 다 맞는다 — 이름 찾기로 넘어가지 않는다(예슬 42/42 · 남의 자리 0 · 코워크 재현). */
  /* ★[CLIP_ORDER 2026-09-26 코워크 회신8 덧4] --clip =08_vow-groom,=24_vow-both-1 이면 대장에서 그 클립들의 문장 차례로 순서표를 만든다(부분 재녹음).
     사장님이 몇 클립만 다시 받으면 audio_0 부터 그 클립들 차례다 — 다시받기 순서표는 조립 뒤엔 그 클립을 빼고 뽑혀(재현 195줄 중 0줄) 한 줄도 못 찾는다. */
  if (arg('--clip') && !arg('--order')) {
    const { selectClips } = require(P('scripts/clip-select.mjs'));
    const sel = selectClips(man.clips, arg('--clip')).filter((c) => !c.mix);
    if (!sel.length) { console.log('✗ --clip 에 맞는 클립이 없습니다: ' + arg('--clip')); process.exit(2); }
    let n = 0; ord = [];
    for (const c of sel) for (const s of c.sents) ord.push({ n: ++n, voice: VOICE[s.role || c.role] || null, text: s.text, at: [{ clip: pad2(c.no) + '_' + c.file, i: s.i }] });
    console.log(`[CLIP_ORDER] --clip ${arg('--clip')} → 대장 문장 차례로 ${ord.length}줄(${sel.map((c) => pad2(c.no) + '_' + c.file).join(' · ')})`);
  }
  const vOnly = arg('--voice') && !arg('--order') && !arg('--clip') && !arg('--voice').includes(',') ? arg('--voice').trim() : '';
  if (vOnly) {
    let per = null; try { per = JSON.parse(fs.readFileSync(path.join(path.dirname(ORD), '_순서.json'), 'utf8')); } catch { /* 없으면 전체 순서표 그대로 */ }
    if (per && Array.isArray(per[vOnly])) {
      ord = per[vOnly].map((x) => ({ n: x.n, voice: vOnly, text: x.text, at: [{ clip: x.clip, i: x.i }] }));
      console.log(`[VOICE_ORDER] --voice ${vOnly} → 다시받기/_순서.json 의 ${vOnly} ${ord.length}줄로 맞춥니다(번호 = 그 성우 파일 차례)`);
    }
  }

  /* zip 이면 풀고, 폴더면 그대로 훑는다 */
  const tmp = fs.mkdtempSync('/tmp/sentlib-');
  const wavs = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(wav|mp3|flac|m4a)$/i.test(e.name)) wavs.push(p);
    else if (/\.zip$/i.test(e.name)) { const o = fs.mkdtempSync(path.join(tmp, 'z-')); execFileSync('unzip', ['-qq', '-o', '-j', p, '-d', o]); walk(o); }
  } };
  if (fs.statSync(src).isFile() && /\.zip$/i.test(src)) { const o = fs.mkdtempSync(path.join(tmp, 'z-')); execFileSync('unzip', ['-qq', '-o', '-j', src, '-d', o]); walk(o); }
  else if (fs.statSync(src).isFile()) wavs.push(src);
  else walk(src);

  /* ★이름으로 «번호»와 «글»을 둘 다 본다. 번호만 믿으면 배치가 밀려도 모른다.
     타입캐스트는 한글을 #Uxxxx 로 이스케이프해 넣기도 하고, 이름을 잘라 끝에 ~ 를 붙인다. */
  const unesc = (s) => s.replace(/#U([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  /* ★★[FOLD_SPACE 2026-09-13] 띄어쓰기·구두점은 «지운다»(밑줄로 바꾸지 않는다).
     왜 — 받은 이름이 `나도___해볼게` 인데 대본은 「나도 해 볼게」다. 타입캐스트가 낭독 호흡을 위해
     공백을 더 넣거나, 사장님이 그 화면에서 띄어쓰기를 손보시기도 한다. 소리는 같은데 이름만 다르다.
     밑줄로 바꾸면 그 차이가 그대로 남아 «안 맞는다»가 되고, 실제로 15줄이 그렇게 빠졌다.
     ★지우고 나면 한글·숫자·영문만 남는다 — 문장 단위라 이것만으로도 서로 안 헷갈린다. */
  const fold = (s) => s.replace(/[^가-힣0-9a-zA-Z]/g, '');
  const byNo = new Map();
  for (const f of wavs) { const m = path.basename(f).match(/^audio_(\d+)_(.*)\.[^.]+$/i); if (m) byNo.set(+m[1], { f, name: unesc(m[2]) }); }
  if (!byNo.size) { console.log('✗ audio_번호_문장 꼴의 파일을 못 찾았다. 타입캐스트 «문장별 분리» 다운로드가 맞는지 보세요.'); process.exit(2); }

  /* ★★[BY_NAME 2026-09-13] 번호가 아니라 «이름(문장)»으로 맞춘다.
     왜 — 사장님이 50줄짜리 파일만 따로 붙여넣으시면 타입캐스트가 audio_0 부터 «새로» 번호를 매긴다.
     그 묶음은 붙여넣기 152~201번째 줄인데 파일은 0~49 다. 번호로 맞추면 150칸이 밀려 전부 엉뚱한 자리에 간다.
     ★이름은 배치를 가로질러도 안 밀린다([DUB_STAGE] 가 같은 이유로 이름을 쓴다).
     ★이름은 «잘린다» — 끝의 ~ 가 잘림 표시다. 잘린 만큼만 앞자락으로 대조한다.
     ★같은 문장이 그 묶음 안에 둘 이상이면 «번호 차례»로 가른다. 그래도 안 갈리면 안 넣는다. */
  const foldName = (g) => { const cut = g.name.endsWith('~'); return { cut, s: fold(cut ? g.name.slice(0, -1) : g.name) }; };
  const pool = [...byNo.entries()].sort((a, b) => a[0] - b[0]).map(([no, g]) => ({ no, g, ...foldName(g) }));
  const matchOf = (text) => {
    const want = fold(text);
    return pool.filter((x) => !x.used && (x.cut ? want.slice(0, x.s.length) === x.s : want === x.s));
  };
  /* ★★[NAME_FALLBACK 2026-09-14] 번호로 먼저 보되, «그 줄만» 어긋나면 그 줄은 이름으로 찾는다.
     왜 — 목록 «가운데»에 한 줄이 끼면 그 뒤가 전부 한 칸씩 밀린다. 실제로 겪었다:
     「보건실」 한 줄이 [112]에 들어가자 그 뒤 정숙 4줄이 밀려 이름이 안 맞았다.
     ★종전엔 「전체의 절반이 안 맞으면 이름으로」였다. 111/115 가 맞아 그 문턱을 못 넘었고,
       밀린 4줄은 그냥 «안 넣은 것»으로 남았다. 문턱은 «많이 밀린 경우»만 잡고 «조금 밀린 경우»를 놓친다.
     ★줄마다 판단하면 둘 다 잡힌다. 번호가 맞으면 그대로, 안 맞으면 그 줄만 이름으로. */
  const matchByNum = (r) => {
    const g = byNo.get(r.n - 1); if (!g) return null;
    const f = foldName(g), w = fold(r.text);
    return (f.cut ? w.slice(0, f.s.length) === f.s : w === f.s) ? g : null;
  };
  /* ★★[IMPORT_VOICE_LOCK 2026-09-26 코워크 회신8-3] 묶음에 든 성우를 «내용으로» 알아내고, 그 성우들의 줄에서만 찾는다.
     왜 — 성우별 zip(서진 42줄)은 audio_0 부터 번호를 다시 매긴다. 번호가 안 맞으면 [NAME_FALLBACK] 이 _전체_순서의
       «앞줄부터» 이름으로 찾았는데 성우를 안 봤다. 성우가 다르고 글자가 같은 줄이 다섯이라(진희·서진 둘 · 이겸·서진 둘 ·
       서진·정숙 «서준아.») 앞줄(다른 성우)이 먼저 가져갔다 — 가짜 서진 묶음으로 재현: 진희 세 자리 · 이겸 두 자리가 서진 소리로,
       서진 네 자리는 빈 채. 번호 맞추기도 같은 병이 있었다(서진 audio_1 «자리에 앉아…» = 진희 n=2 의 글).
     ★성우 알아내기: 한 성우의 줄에만 있는 글로 맞은 파일들이 가리키는 성우들(--voice 서진 처럼 손으로 줄 수도 있다 · 덤).
     ★성우가 다르고 글자가 같은 줄은 그 두 성우가 «한 묶음에 함께» 있을 때 번호가 맞아야만 넣는다. 안 맞으면 넣지 않고 적는다.
     ★이미 «소리 있고 글 그대로»인 다른 성우 자리는 이름 찾기로 덮지 않는다. */
  const vOf = new Map();
  for (const r of ord) { const k = fold(r.text); if (!vOf.has(k)) vOf.set(k, new Set()); vOf.get(k).add(r.voice); }
  const hitRows = (x) => ord.filter((r) => { const w = fold(r.text); return x.cut ? w.slice(0, x.s.length) === x.s : w === x.s; });
  let V;
  if (arg('--voice')) V = new Set(arg('--voice').split(',').map((s) => s.trim()).filter(Boolean));
  else { V = new Set(); for (const x of pool) { const vs = new Set(hitRows(x).map((r) => r.voice)); if (vs.size === 1) V.add([...vs][0]); } }
  if (!V.size) { console.log('✗ [IMPORT_VOICE_LOCK] 이 묶음이 어느 성우의 것인지 내용으로 알 수 없습니다. --voice <이름> 으로 알려 주세요.'); process.exit(2); }
  console.log(`[IMPORT_VOICE_LOCK] 이 묶음의 성우: ${[...V].join(' · ')}${arg('--voice') ? ' (--voice)' : ' (내용으로 알아냄)'}`);
  const rowsV = ord.filter((r) => V.has(r.voice));
  const dupBoth = (r) => [...(vOf.get(fold(r.text)) || [])].filter((v) => V.has(v)).length > 1;   // 묶음 안 두 성우가 같은 글

  let byNumHit = 0;
  for (const r of rowsV) if (matchByNum(r)) byNumHit++;
  if (byNumHit < byNo.size) console.log(`[NAME_FALLBACK] 번호로 맞는 것 ${byNumHit}/${byNo.size} — 나머지는 «이름»으로 찾습니다(${[...V].join(' · ')} 의 줄에서만).`);

  const j = loadIdx();
  let put = 0, skipSlot = 0, miss = 0, ambig = 0, lockSkip = 0, keepOther = 0;
  /* 번호로 맞는 줄을 먼저 잡아 둔다 — 그 파일을 이름 찾기에서 빼기 위해서다(두 줄이 한 파일을 가져가지 않게). */
  const bound = new Map();
  for (const r of rowsV) { const g = matchByNum(r); if (g) { bound.set(r.n, g); pool.find((x) => x.g === g).used = true; } }

  for (const r of rowsV) {
    let g = bound.get(r.n), byName = false;
    if (!g) {
      if (dupBoth(r)) { console.log(`  [IMPORT_VOICE_LOCK] n=${r.n} ${r.voice} «${r.text}» — 같은 글을 이 묶음의 다른 성우도 읽어 번호로만 넣습니다(번호가 안 맞아 안 넣음)`); lockSkip++; continue; }
      const m = matchOf(r.text);                 // [NAME_FALLBACK] 번호가 어긋난 줄만 이름으로
      if (!m.length) { miss++; continue; }
      const pick = m[0]; pick.used = true; g = pick.g; byName = true;
    }
    for (const a of r.at || []) {
      const id = a.clip + '#' + a.i;
      const s = bySlot.get(id);
      if (!s || s.text !== r.text) { skipSlot++; continue; }              // 대장과 다르면 «안 넣는다»
      /* ★★[CUT_AMBIG 2026-09-19] 이름이 «잘린» 파일은 잘린 데까지만 증명한다 — 그 뒤는 모른다.
         ★실사고: 「… 안내해 드리고, 예약이 어려운 곳은 디렉터가 대신 움직입니다.」를
           「… 안내해 드리고, 연락처와 … 정리해 드립니다.」로 고친 날, 옛 녹음의 파일 이름이
           «잘린 앞부분»만으로 새 문장에 걸려 **옛 소리가 새 글의 자리에 조용히 들어갔다.**
           SRC_STALE 이 막으려던 바로 그 실패인데, 앞자리 일치 규칙이 그 위로 넘어갔다.
         ★그래서 «그 자리에 원래 있던 글»과도 맞대 본다. 잘린 앞부분이 새 글과 옛 글 양쪽에 걸리면
           그 파일이 둘 중 무엇을 읽은 것인지 알 길이 없다 — 그러면 **안 넣는다.**
         ★추측해서 넣는 쪽이 아니라 비워 두는 쪽을 고른다. 비어 있으면 다음 검사가 잡지만,
           잘못 들어간 소리는 아무 검사도 못 잡고 식장에서 난다. */
      const prevE = j.slots[id] || {}, prevText = prevE.text;
      /* [IMPORT_VOICE_LOCK] 다른 성우의 멀쩡한 자리는 이름 찾기로 덮지 않는다 — «다른 성우»는 그 자리의 «지금 배정»(대장 성우표)으로 가른다.
         ★창고에 적힌 옛 이름(prevE.voice)으로 가르면 성우를 바꾼 날(신랑 이겸 → 진한 [VOICE_GROOM_3]) 제 자리를 못 채운다 — 가짜 진한 묶음에서 08_vow-groom 여섯 자리가 빈 채로 남았다(실측). */
      if (byName && VOICE[s.role] && VOICE[s.role] !== r.voice && prevText === s.text && fs.existsSync(fileOf(id))) { keepOther++; continue; }
      const fn = pool.find((x) => x.g === g);
      if (fn && fn.cut && prevText && prevText !== s.text) {
        const pre = fold(prevText).slice(0, fn.s.length);
        if (pre === fn.s) {
          console.log(`  [CUT_AMBIG] ${id} — 파일 이름이 잘려 옛 글과 새 글을 가릴 수 없습니다. 안 넣었습니다.`);
          console.log(`     옛 «${prevText.slice(0, 46)}…»`);
          console.log(`     새 «${s.text.slice(0, 46)}…»`);
          ambig++; continue;
        }
      }
      const out = fileOf(id);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', g.f, '-c:a', 'flac', out]);   // [FLAC_HALF] 무손실
      j.slots[id] = { text: s.text, voice: VOICE[s.role] || null, when: new Date().toISOString().slice(0, 10) };
      put++;
    }
  }
  saveIdx(j);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`[SENT_LIB] 창고에 넣은 자리 ${put}개`);
  if (ambig) console.log(`   ★같은 문장이 여럿이라 못 가른 것 ${ambig}건`);
  if (lockSkip) console.log(`   ★[IMPORT_VOICE_LOCK] 성우가 다르고 글이 같아 번호로만 넣는 줄 중 번호가 안 맞아 안 넣은 것 ${lockSkip}줄`);
  if (keepOther) console.log(`   ★[IMPORT_VOICE_LOCK] 다른 성우의 멀쩡한 자리라 덮지 않은 것 ${keepOther}자리`);
  if (miss) console.log(`   · 그 순서표의 ${miss}줄은 이번 묶음에 없었다(다른 배치일 것)`);
  if (skipSlot) console.log(`   ★대장과 글이 달라 «안 넣은» 자리 ${skipSlot}건 — 대본이 그 사이 바뀐 자리입니다`);
}

/* ── 대장에서 사라진 자리를 창고에서도 뺀다 ──────────── */
/* ★★[SENT_PRUNE 2026-09-19] 문안에서 문장을 «빼면» 창고에 주인 없는 소리가 남는다.
     sent-lib-check 가 그걸 잡고 «_index.json 에서도 빼세요»라고 안내하는데,
     그 말은 곧 «JSON 을 손으로 고치세요»다. 자동생성물을 손으로 고치는 것이
     이 저장소가 반복해 다친 자리라, 안내 대신 명령을 둔다.
   ★폐지한 클립(RETIRED)은 «대장에 남아 있다» — 번호를 지키려고 일부러 남긴 것이다.
     그러니 여기서 안 지워진다. 지워지는 것은 «문장이 실제로 사라진» 자리뿐이다.
   ★기본은 미리보기다. --write 를 붙여야 지운다. */
function prune() {
  const j = loadIdx();
  const live = new Set(slots.map((s) => s.id));
  /* ★★[PRUNE_KEEPS_RETIRED 2026-09-21] 폐지한 클립의 소리는 **안 지운다.**
     이 저장소의 오랜 규칙이다 — 「파일·문안은 그대로 둔다. 되살릴 결정이 오면 근거가 된다」
     (VEIL_RETIRED · SONG_RETIRED · ENTRY_OUT_B_DROP 주석이 전부 그렇게 적혀 있다).
     ★실제로 막았다: 2026-09-21 에 창고 자리 3개를 치우려고 --prune 을 돌렸더니
       33·34·35(하객이 답하기)·79 의 **원본 flac 까지 지우려** 했다. 그 넷은 어제 폐지한 것이고,
       폐지는 «끄는 것»이지 «없애는 것»이 아니다. 지우면 되살릴 근거가 사라진다.
     ★대장(_index.json) 줄도 함께 남긴다 — 소리만 남고 어느 문장이었는지 잃으면 반쪽이다. */
  /* ★RETIRED_CLIP 은 이 파일이 **이미 갖고 있다**(59행 [SENT_RETIRED]). 새로 읽지 않는다 —
     같은 것을 두 번 읽으면 언젠가 둘이 갈라진다. 실제로 두 번째 판을 만들다 이 줄을 발견했다. */
  const isRetired = (id) => RETIRED_CLIP.has(String(id).replace(/^\d+_/, '').replace(/#\d+$/, ''));
  const all = Object.keys(j.slots || {}).filter((id) => !live.has(id));
  const kept = all.filter(isRetired);
  const dead = all.filter((id) => !isRetired(id));
  if (kept.length) console.log(`[SENT_PRUNE] 폐지 클립 ${kept.length}자리는 **남깁니다**([PRUNE_KEEPS_RETIRED]) — ${[...new Set(kept.map((x) => x.replace(/#\d+$/, '')))].join(' · ')}`);
  if (!dead.length) { console.log('[SENT_PRUNE] 주인 없는 자리 없음 — 창고와 대장이 같습니다.'); return; }
  console.log(`[SENT_PRUNE] 대장에 없는 자리 ${dead.length}개`);
  for (const id of dead) console.log(`   ${id}  「${(j.slots[id] || {}).text || ''}」`);
  if (!has('--write')) { console.log('\n(미리보기) --write 를 붙이면 소리 파일과 대장 줄을 함께 지웁니다.'); return; }
  let gone = 0;
  for (const id of dead) {
    const f = fileOf(id);
    if (fs.existsSync(f)) { fs.unlinkSync(f); gone++; }
    delete j.slots[id];
    const d = path.dirname(f);
    try { if (!fs.readdirSync(d).length) fs.rmdirSync(d); } catch { /* 남아 있으면 그대로 둔다 */ }
  }
  saveIdx(j);
  console.log(`\n지웠습니다 — 대장 줄 ${dead.length}개 · 소리 파일 ${gone}개`);
}

/* ── 한 자리 갈아 끼우기 ──────────────────────────────── */
function patch() {
  const sent = arg('--sent'), wav = arg('--wav');
  if (!sent || !wav) { console.log('✗ --patch 는 --sent "<문장>" 과 --wav <파일> 이 함께 있어야 합니다.'); process.exit(2); }
  if (!fs.existsSync(wav)) { console.log('✗ 그 파일이 없습니다: ' + wav); process.exit(2); }
  const hit = slots.filter((s) => s.text === sent);
  if (!hit.length) { console.log(`✗ 대장에 그 문장이 없습니다(글자까지 같아야 합니다): 「${sent}」`); process.exit(2); }
  const voices = [...new Set(hit.map((s) => VOICE[s.role] || '★미정'))];
  if (voices.length > 1) { console.log(`✗ 그 문장이 성우가 다른 자리에 걸쳐 있습니다(${voices.join(' · ')}). 한 소리로 덮으면 안 됩니다.`); process.exit(2); }
  const j = loadIdx();
  for (const s of hit) {
    const out = fileOf(s.id);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', wav, '-c:a', 'flac', out]);
    j.slots[s.id] = { text: s.text, voice: voices[0], when: new Date().toISOString().slice(0, 10) };
    /* ★[ENTRY_GAP_KEEP 2026-09-26 사장님 «녹음 그대로 1.4초»] --keep-gap 이면 «안쪽 쉼 지킴»을 창고에 적는다 —
       --stage 가 그 자리 파일 이름에 _JOINED_ 를 붙이고, 조립기는 JOINED_ 파일의 안쪽 쉼을 SENT_CAP(0.45초)로 깎지 않는다. */
    if (has('--keep-gap')) j.slots[s.id].keepGap = true;
  }
  saveIdx(j);
  console.log(`[SENT_LIB] ${voices[0]} 「${sent}」 → ${hit.length}자리에 넣었다${has('--keep-gap') ? ' · 안쪽 쉼 지킴(--keep-gap)' : ''}`);
  for (const s of hit) console.log(`   ${s.id}`);
  console.log('\n   이제 그 클립을 다시 붙이세요:');
  console.log(`   node scripts/sent-lib.mjs --stage /tmp/붙일것 --clip ${[...new Set(hit.map((s) => '=' + s.key))].join(',')}`);
}

/* ── 조립기가 먹는 모양으로 깔기 ──────────────────────── */
function stage() {
  const out = arg('--stage');
  const spec = arg('--clip');
  const { selectClips } = require(P('scripts/clip-select.mjs'));
  const sel = spec ? selectClips(man.clips, spec) : man.clips.filter((c) => !c.mix);
  if (!sel.length) { console.log('✗ --clip 에 맞는 클립이 없습니다: ' + spec); process.exit(2); }
  const j = loadIdx();
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  let n = 0; const lack = [];
  for (const c of sel) {
    if (c.mix) continue;
    const key = pad2(c.no) + '_' + c.file;
    for (const s of c.sents) {
      const id = key + '#' + s.i;
      const src = fileOf(id);
      const e = j.slots[id];
      if (!fs.existsSync(src) || !e || e.text !== s.text) { lack.push({ id, why: !e || !fs.existsSync(src) ? '소리 없음' : '글이 바뀜' }); continue; }
      n++;
      fs.copyFileSync(src, path.join(out, String(n).padStart(4, '0') + '_' + id.replace('#', '_') + (e.keepGap ? '_JOINED_' : '') + '.flac'));   // [ENTRY_GAP_KEEP] 조립기가 안쪽 쉼을 안 깎는다
    }
  }
  if (lack.length) {
    console.log(`✗ 채울 수 없는 자리 ${lack.length}개 — 깔지 않았습니다(반쪽으로 붙이면 클립이 틀립니다):`);
    for (const x of lack.slice(0, 10)) console.log(`   ${x.id}  ${x.why}`);
    process.exit(1);
  }
  console.log(`[SENT_LIB] ${out} 에 ${n}문장 깔았다 (클립 ${sel.length}개)`);
  console.log('\n   이제 조립하세요:');
  console.log(`   node scripts/assemble-narration.mjs --in ${out} --clip ${sel.map((c) => '=' + pad2(c.no) + '_' + c.file).join(',')}`);
}

/* ── 아직 못 받은 것만 뽑기  [TODO_ONLY] ─────────────────
   창고에 «없거나 낡은» 자리만 모아 붙여넣기 판을 만든다.
   ★이미 받은 자리를 다시 요구하지 않는다 — 그게 이 창고를 만든 이유다. */
function todo() {
  const out = arg('--todo');
  const j = loadIdx();
  const need = [];
  for (const s of slots) {
    if (s.off) continue;   // ★[TODO_RETIRED 2026-09-26 코워크 회신8-4] 폐지 클립 자리는 «받을 것»이 아니다 — --status 와 같은 자([SENT_RETIRED])
    const e = j.slots[s.id];
    if (e && fs.existsSync(fileOf(s.id)) && e.text === s.text) continue;   // 이미 있고 글도 그대로
    need.push(s);
  }
  /* ★[DUP_ONCE] 같은 성우가 글자까지 같은 말을 여러 자리에서 하면 «한 번만» 받는다.
     ★다만 «한 예식에 둘 다 나가는» 말은 따로 받는다 — 같은 소리가 몇 분 사이에 두 번 나면 티가 난다.
       (신랑 「하윤아.」가 서약과 편지에 둘 다 있다. 큐 엔진 324조합 전수로 가른다.) */
  const together = new Set();
  try {
    const RC = require(P('assets/ritual-cue.js')), ST = require(P('assets/ritual-story.js'));
    for (const course of ['gamdong', 'family', 'damback', 'record', 'minimal', 'festive'])
      for (const letter of ['parent', 'each', 'both'])
        for (const bless of ['on', 'off'])
          for (const tribute of ['flower', 'bow', 'hug'])
            for (const toast of ['toast', 'cake', 'both']) {
              let cues; try { cues = RC.build({ course, letter, bless, tribute, toast }, { mode: 'console' }).cues; } catch { continue; }
              const live = new Set();
              for (const q of cues) { if (q.file) live.add(q.file);
                for (const id of (ST.castIds(q).live || [])) if (id) live.add(String(id).replace(/^\d+_/, '')); }
              const f = [...live];
              for (let a = 0; a < f.length; a++) for (let b = a + 1; b < f.length; b++) together.add([f[a], f[b]].sort().join('||'));
            }
  } catch { /* [CANT_LOOK] 못 읽으면 안 합친다 */ }
  const co = (a, b) => together.has([a.replace(/^\d+_/, ''), b.replace(/^\d+_/, '')].sort().join('||'));

  const rows = [], seen = new Map();
  for (const s of need) {
    const v = VOICE[s.role] || null;
    const k = (v || s.role) + '|' + s.text;
    const prev = seen.get(k);
    if (v && prev && !prev.at.some((x) => co(x.key, s.key))) { prev.at.push(s); continue; }
    const r = { voice: v, role: s.role, text: s.text, at: [s] };
    rows.push(r); if (!prev) seen.set(k, r);
  }
  const ready = rows.filter((r) => r.voice), pend = rows.filter((r) => !r.voice);

  if (!out) {   // 폴더를 안 주면 세기만 한다
    console.log(`[SENT_LIB] 아직 못 받은 자리 ${need.length}개 → 받으실 줄 ${ready.length}줄 (겹쳐서 뺀 ${need.length - rows.length}줄)`);
    const by = {}; for (const r of ready) (by[r.voice] ??= 0), by[r.voice]++;
    for (const [v, n] of Object.entries(by).sort((a, b) => b[1] - a[1])) console.log(`   ${v.padEnd(6)} ${String(n).padStart(3)}줄`);
    if (pend.length) console.log(`   ★성우 미정 ${pend.length}줄 (${[...new Set(pend.map((r) => r.role))].join(' · ')})`);
    return;
  }
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  /* 한 파일 — 「이름: 대사」 꼴이라 타입캐스트가 화자를 스스로 배정한다 */
  fs.writeFileSync(path.join(out, '0_전체_화자표기.txt'), ready.map((r) => `${r.voice}: ${r.text}`).join('\n') + '\n');
  fs.writeFileSync(path.join(out, '_순서.json'), JSON.stringify(
    ready.map((r, i) => ({ n: i + 1, voice: r.voice, text: r.text, at: r.at.map((s) => ({ clip: s.key, i: s.i })) })), null, 1));
  /* 성우별 낱개 — 이름을 붙이지 않는다([PASTE_WRONG_FILE] 그대로 읽힌다) */
  const by = {}; for (const r of ready) (by[r.voice] ??= []).push(r);
  const sorted = Object.entries(by).sort((a, b) => b[1].length - a[1].length);
  sorted.forEach(([v, l], n) => fs.writeFileSync(path.join(out, `${n + 1}_${v}.txt`), l.map((r) => r.text).join('\n') + '\n'));
  if (pend.length) fs.writeFileSync(path.join(out, `${sorted.length + 1}_성우미정.txt`),
    pend.map((r) => `${r.role}: ${r.text}`).join('\n') + '\n');
  console.log(`[SENT_LIB] ${out} · 받으실 줄 ${ready.length} (겹쳐서 뺀 ${need.length - rows.length}) · 파일 ${sorted.length + 2 + (pend.length ? 1 : 0)}개`);
  for (const [v, l] of sorted) console.log(`   ${v.padEnd(6)} ${String(l.length).padStart(3)}줄`);
  if (pend.length) console.log(`   ★성우 미정 ${pend.length}줄`);
}

/* ── 밀린 자리를 다시 묶기  [REBIND] ──────────────────────
   문장이 합쳐지거나 갈라지면 그 «뒤» 번호가 전부 한 칸씩 밀린다.
   소리는 멀쩡한데 자리 이름만 틀린 것이라, 다시 받을 일이 아니라 «다시 묶을» 일이다.
   ★한 클립 «안»에서만, «글자까지 같은» 것끼리만 묶는다 — 그 둘을 어기면 남의 소리가 들어온다.
   ★실제로 겪었다: [NOT_RUDE] 로 두 문장을 하나로 합치자 43_parents-letter 의 16자리가 낡음이 됐는데,
     그중 15는 소리가 그대로였다. 다시 받았으면 15줄을 헛녹음하실 뻔했다. */
/* ★★[REBIND_SAFE 2026-09-21] 세 가지를 고쳤다. 셋 다 **내가 당하고 나서** 고쳤다.
   ① **미리보기가 기본이다.** 옛 판은 `--rebind` 만으로 바로 썼다. 형제인 `--prune` 은 미리보기가
      기본이라 나는 이쪽도 그런 줄 알고 돌렸고, **flac 192개가 지워졌다.** 커밋 전이라 되돌렸다.
      ★형제 명령의 기본값이 서로 반대인 것 자체가 함정이다. 맞춘다 — 둘 다 `--write` 가 있어야 쓴다.
   ② **글자가 안 맞는 소리를 지우지 않는다.** 옛 판은 클립 안의 소리를 전부 임시로 옮긴 뒤
      «글자가 맞는 것»만 도로 썼다. 나머지는 tmp 와 함께 사라졌다. 문면을 고치는 중인 클립은
      전부 «안 맞는» 상태라, 고치는 중이라는 이유만으로 원본이 날아간다.
      ★이 저장소가 창고를 만든 이유가 «다시 받지 않으려고»인데, 그 창고가 스스로를 비우고 있었다.
   ③ **클립을 좁힐 수 있다**(`--clip`). 한 자리를 고치려고 저장소 전체를 건드리지 않는다. */
function rebind() {
  const WRITE = has('--write');
  const only = arg('--clip');
  const want = only ? new Set(only.split(',').map((x) => x.trim()).filter(Boolean)) : null;
  const j = loadIdx();
  const byClip = new Map();
  for (const s of slots) { if (!byClip.has(s.key)) byClip.set(s.key, []); byClip.get(s.key).push(s); }
  let moved = 0, keptStale = 0; const left = [], plan = [];
  for (const [key, list] of byClip) {
    if (want && !want.has(key)) continue;
    /* 이 클립에 창고가 들고 있는 것 — ★«창고 대장»에서 훑는다. 지금 자리 번호로 훑으면
       문장이 줄었을 때 «옛 마지막 번호»를 못 본다(첫 판이 그래서 #39 를 놓쳤고,
       「모먼트에디트 올림.」이 다시 받아야 할 것으로 잘못 떴다). */
    const held = [];
    for (const [id, e] of Object.entries(j.slots)) {
      if (id.split('#')[0] !== key) continue;
      if (!fs.existsSync(fileOf(id))) continue;
      held.push({ i: Number(id.split('#')[1]), text: e.text, voice: e.voice });
    }
    held.sort((a, b) => a.i - b.i);
    if (!held.length) continue;
    const wrong = list.filter((s) => { const e = j.slots[key + '#' + s.i]; return !e || e.text !== s.text; });
    if (!wrong.length) continue;
    /* 임시로 빼 두고(덮어쓰기 사고 방지) 글자로 다시 꽂는다 */
    const tmp = fs.mkdtempSync('/tmp/rebind-');
    for (const h of held) fs.copyFileSync(fileOf(key + '#' + h.i), path.join(tmp, h.i + '.flac'));
    const used = new Set();
    const neo = {};
    for (const s of list) {
      const h = held.find((x) => !used.has(x.i) && x.text === s.text);
      if (!h) { left.push({ id: key + '#' + s.i, text: s.text }); continue; }
      used.add(h.i);
      neo[key + '#' + s.i] = { file: path.join(tmp, h.i + '.flac'), voice: h.voice, from: h.i };
    }
    /* ★[REBIND_SAFE ②] 옮길 것이 하나도 없으면 이 클립은 **손대지 않는다.**
       옛 판은 그래도 held 를 전부 지우고 다시 썼다 — 그 한 줄이 192개를 날린 자리다. */
    const movingFrom = new Set(Object.values(neo).map((v) => v.from));
    if (!movingFrom.size) { keptStale += held.length; fs.rmSync(tmp, { recursive: true, force: true }); continue; }
    if (!WRITE) {
      for (const [id, v] of Object.entries(neo))
        if (String(v.from) !== id.split('#')[1]) plan.push(`   ${key}#${v.from} → #${id.split('#')[1]}  「${(bySlot.get(id) || {}).text?.slice(0, 30) || ''}」`);
      keptStale += held.filter((h) => !movingFrom.has(h.i)).length;
      fs.rmSync(tmp, { recursive: true, force: true }); continue;
    }
    /* ★옮기는 자리만 걷어낸다. 글자가 안 맞아 남는 소리는 **그대로 둔다**([REBIND_SAFE ②]). */
    for (const h of held) {
      if (!movingFrom.has(h.i)) { keptStale++; continue; }
      try { fs.unlinkSync(fileOf(key + '#' + h.i)); } catch {} delete j.slots[key + '#' + h.i];
    }
    for (const [id, v] of Object.entries(neo)) {
      const out = fileOf(id); fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.copyFileSync(v.file, out);
      const s = bySlot.get(id);
      j.slots[id] = { text: s.text, voice: v.voice || VOICE[s.role] || null, when: new Date().toISOString().slice(0, 10) };
      if (String(v.from) !== id.split('#')[1]) { moved++; console.log(`   ${key}#${v.from} → #${id.split('#')[1]}  「${s.text.slice(0, 30)}」`); }
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  if (!WRITE) {
    console.log('[REBIND] (미리보기) 옮길 소리 ' + plan.length + '개 · 글자가 달라 그대로 두는 소리 ' + keptStale + '개');
    plan.forEach((x) => console.log(x));
    console.log('\n  --write 를 붙여야 실제로 옮깁니다. --clip 12_bless-father,85_narr-photo-send 로 좁힐 수 있습니다.');
    return;
  }
  saveIdx(j);
  console.log(`\n[REBIND] 자리를 옮긴 소리 ${moved}개 · 그래도 빈 자리 ${left.length}개`);
  for (const x of left) console.log(`   ★ ${x.id}  「${x.text}」  ← 이건 정말 다시 받아야 합니다`);
}

/* ── 고른 문장만 붙여넣기 판으로  [PICK_PASTE] ───────────
   「이 문장들만 다시 받고 싶다」 할 때 쓴다. 창고에 있든 없든 상관없이 «고른 것»을 뽑는다.
   ★[DUP_ONCE] 와 [PASTE_CLEAN] 을 여기서도 그대로 건다 — 겹치는 말은 한 번만,
     머리말·주석은 한 줄도 넣지 않는다. 타입캐스트는 콜론 없는 줄을 화자로 읽거나 소리로 읽는다.
   쓰기: node scripts/sent-lib.mjs --pick <문장목록.txt> --out <폴더> */
function pick() {
  const src = arg('--pick'), out = arg('--out');
  if (!out) { console.log('✗ --pick 은 --out <폴더> 와 짝입니다.'); process.exit(2); }
  let lines;
  try { lines = fs.readFileSync(src, 'utf8').split('\n').map((x) => x.trim()).filter(Boolean); }
  catch (e) { console.log('✗ 목록을 못 읽었다 — ' + e.message); process.exit(2); }
  const want = new Set(lines);
  const need = slots.filter((s) => want.has(s.text));
  if (!need.length) { console.log('✗ 대장에서 그 문장들을 못 찾았습니다(글자까지 같아야 합니다).'); process.exit(1); }

  const together = new Set();
  try {
    const RC = require(P('assets/ritual-cue.js')), ST = require(P('assets/ritual-story.js'));
    for (const course of ['gamdong', 'family', 'damback', 'record', 'minimal', 'festive'])
      for (const letter of ['parent', 'each', 'both']) for (const bless of ['on', 'off'])
        for (const tribute of ['flower', 'bow', 'hug']) for (const toast of ['toast', 'cake', 'both']) {
          let cues; try { cues = RC.build({ course, letter, bless, tribute, toast }, { mode: 'console' }).cues; } catch { continue; }
          const live = new Set();
          for (const q of cues) { if (q.file) live.add(q.file);
            for (const id of (ST.castIds(q).live || [])) if (id) live.add(String(id).replace(/^\d+_/, '')); }
          const f = [...live];
          for (let a = 0; a < f.length; a++) for (let b = a + 1; b < f.length; b++) together.add([f[a], f[b]].sort().join('||'));
        }
  } catch { /* [CANT_LOOK] */ }
  const co = (a, b) => together.has([a.replace(/^\d+_/, ''), b.replace(/^\d+_/, '')].sort().join('||'));

  const rows = [], seen = new Map();
  for (const s of need) {
    const v = VOICE[s.role] || null;
    const k = (v || s.role) + '|' + s.text, prev = seen.get(k);
    if (v && prev && !prev.at.some((x) => co(x.key, s.key))) { prev.at.push(s); continue; }
    const r = { voice: v, role: s.role, text: s.text, at: [s] };
    rows.push(r); if (!prev) seen.set(k, r);
  }
  const ready = rows.filter((r) => r.voice), pend = rows.filter((r) => !r.voice);
  fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, '0_전체_화자표기.txt'), ready.map((r) => `${r.voice}: ${r.text}`).join('\n') + '\n');
  fs.writeFileSync(path.join(out, '_순서.json'), JSON.stringify(
    ready.map((r, i) => ({ n: i + 1, voice: r.voice, text: r.text, at: r.at.map((s) => ({ clip: s.key, i: s.i })) })), null, 1));
  const by = {}; for (const r of ready) (by[r.voice] ??= []).push(r);
  const sorted = Object.entries(by).sort((a, b) => b[1].length - a[1].length);
  sorted.forEach(([v, l], n) => fs.writeFileSync(path.join(out, `${n + 1}_${v}.txt`), l.map((r) => r.text).join('\n') + '\n'));
  console.log(`[PICK_PASTE] ${out} · ${ready.length}줄 (고른 문장 ${want.size} → 자리 ${need.length} · 겹쳐서 뺀 ${need.length - rows.length})`);
  for (const [v, l] of sorted) console.log(`   ${v.padEnd(6)} ${String(l.length).padStart(3)}줄`);
  if (pend.length) console.log(`   ★성우 미정 ${pend.length}줄`);
}

if (has('--pick')) pick();
else if (has('--rebind')) rebind();
else if (has('--todo')) todo();
else if (has('--import')) importFrom(arg('--import'));
else if (has('--prune')) prune();
else if (has('--patch')) patch();
else if (has('--stage')) stage();
else status();
