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
 *   node scripts/sent-lib.mjs --import <폴더|zip> [--order <_전체_순서.json>]
 *       타입캐스트 «문장별 분리» 다운로드를 창고에 넣는다. 이름과 글을 대조해 넣고, 안 맞으면 안 넣는다.
 *   node scripts/sent-lib.mjs --patch --sent "<문장>" --wav <파일>
 *       그 문장이 있는 «모든» 자리의 소리를 새것으로 바꾼다.
 *   node scripts/sent-lib.mjs --stage <나갈폴더> [--clip =12_bless-father,…]
 *       창고에서 꺼내 조립기가 먹는 모양(번호순 낱개)으로 깔아 준다. 그 뒤 assemble-narration 을 부른다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

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
const slots = [];
for (const c of man.clips) {
  if (c.mix) continue;
  const key = pad2(c.no) + '_' + c.file;
  c.sents.forEach((s) => slots.push({ key, i: s.i, id: key + '#' + s.i, text: s.text, role: s.role || c.role }));
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
  for (const s of [...stale, ...none]) { const v = VOICE[s.role] || '★미정'; (byVoice[v] ??= []).push(s); }
  if (Object.keys(byVoice).length) {
    console.log('\n   다시 받아야 할 것 (성우별)');
    for (const [v, l] of Object.entries(byVoice).sort((a, b) => b[1].length - a[1].length))
      console.log(`     ${v.padEnd(6)} ${String(l.length).padStart(3)}문장`);
  }
  if (stale.length) {
    console.log('\n   ★낡은 자리 (글이 바뀌었다 · 옛 소리를 그대로 쓰면 안 된다)');
    for (const s of stale.slice(0, 12)) {
      console.log(`     ${s.id}  ${VOICE[s.role] || '★미정'}`);
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
  const fold = (s) => s.replace(/[^가-힣0-9a-zA-Z]/g, '_');
  const byNo = new Map();
  for (const f of wavs) { const m = path.basename(f).match(/^audio_(\d+)_(.*)\.[^.]+$/i); if (m) byNo.set(+m[1], { f, name: unesc(m[2]) }); }
  if (!byNo.size) { console.log('✗ audio_번호_문장 꼴의 파일을 못 찾았다. 타입캐스트 «문장별 분리» 다운로드가 맞는지 보세요.'); process.exit(2); }

  const j = loadIdx();
  let put = 0, skipName = 0, skipSlot = 0, miss = 0;
  for (const r of ord) {
    const g = byNo.get(r.n - 1);                 // 붙여넣기 1번째 줄 = audio_0
    if (!g) { miss++; continue; }
    const cut = g.name.endsWith('~');
    const got = fold(cut ? g.name.slice(0, -1) : g.name);
    const want = fold(r.text);
    const n = cut ? got.length : Math.max(got.length, want.length);
    if (want.slice(0, n) !== got.slice(0, n)) { skipName++; continue; }   // 이름이 다르면 «안 넣는다»
    for (const a of r.at || []) {
      const id = a.clip + '#' + a.i;
      const s = bySlot.get(id);
      if (!s || s.text !== r.text) { skipSlot++; continue; }              // 대장과 다르면 «안 넣는다»
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
  if (miss) console.log(`   · 그 순서표의 ${miss}줄은 이번 묶음에 없었다(다른 배치일 것)`);
  if (skipName) console.log(`   ★이름이 대본과 달라 «안 넣은» 것 ${skipName}건 — 배치가 밀렸는지 보세요`);
  if (skipSlot) console.log(`   ★대장과 글이 달라 «안 넣은» 자리 ${skipSlot}건 — 대본이 그 사이 바뀐 자리입니다`);
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
  }
  saveIdx(j);
  console.log(`[SENT_LIB] ${voices[0]} 「${sent}」 → ${hit.length}자리에 넣었다`);
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
      fs.copyFileSync(src, path.join(out, String(n).padStart(4, '0') + '_' + id.replace('#', '_') + '.flac'));
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

if (has('--import')) importFrom(arg('--import'));
else if (has('--patch')) patch();
else if (has('--stage')) stage();
else status();
