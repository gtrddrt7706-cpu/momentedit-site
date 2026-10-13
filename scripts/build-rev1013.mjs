// [NARR_REV_1013] 3단계 원고 2판(2026-10-13) 녹음 · 플레이 03 — 사장님 녹음(우성 30 · 진희 7) + 10/10 녹음 + 옛 문장 원천(_src) + 옛 예시 클립에서 잘라 낸 문장을 이어 붙인다.
// 엔진은 이 폴더를 모른다. 사장님이 플레이 03 을 듣고 확정하면 원천 · manifest 로 옮긴다(docs/plans/식순연구/3단계_원고_1013.md 7장).
// ★받은 그대로 남긴다(SENT_LIB) — wav 를 flac 으로 rev1013/src 에 넣고 «그때 글»을 _index.json 에 적는다. 파일 이름의 글이 녹음 목록과 다르면 안 넣는다.
// ★[NARR_AUDIO_REAL] 줄마다 «붙인 조각들의 글 = 그 줄의 글»이고, 그 글이 원고에 있어야 만든다 — 하나라도 어긋나면 멈춘다.
//   1판 · 2판에 «문장마다 소리 원천이 있다(빠짐 0)»라고 적었는데 그건 대본 목록끼리의 대조였다. 실제 소리 파일로 대조하니
//   옛 예시 줄(하객 맞이 예시 · 영상 소개 예시 · 테이블 인사 · 신부부터 서약) 25문장은 줄째 클립 안에만 있고 문장 낱개가 없었다.
//   그 문장은 줄째 클립에서 잘라 쓴다(c: 조각 · 10/10 의 EXSRC 와 같은 길).
//
//   node scripts/build-rev1013.mjs --import <우성 폴더> <진희 폴더> <10/10 폴더>
//   node scripts/build-rev1013.mjs [--play-out <플레이03.mp3 경로>]   → rev1013/<줄>.mp3 · 플레이03.mp3 · docs/.../플레이/플레이03.txt
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'assets/audio/narration-draft/rev1013'), SRC = path.join(OUT, 'src'), IDX = path.join(SRC, '_index.json');
const LIB = path.join(ROOT, 'assets/audio/_src'), LIBIDX = path.join(LIB, '_index.json'), NARR = path.join(ROOT, 'assets/audio/narration');
const PLAN = path.join(ROOT, 'docs/plans/식순연구'), DOC = path.join(PLAN, '3단계_원고_1013.md'), PLAYTXT = path.join(PLAN, '플레이/플레이03.txt');
const GAP = 1.25, CHANT = 0.6, HEAD = 0.4, TAIL = 0.45, LINE = 2.2;   // PACE_D(문장 사이 1.25 · 구호 앞 0.6) · 줄 사이 2.2(플레이 01 과 같은 간격)
const norm = (t) => String(t).replace(/[\s.,!?·«»~_]/g, '');
const lines = (f) => fs.readFileSync(path.join(PLAN, f), 'utf8').split('\n').map((l) => l.replace(/^(우성|진희):\s*/, '').trim()).filter(Boolean);
// 녹음 목록(타입캐스트에 붙인 순서 그대로 = 받은 파일 번호)
const LISTS = {
  u: { voice: '우성', list: () => lines('타입캐스트_3단계_우성_1013.txt') },
  j: { voice: '진희', list: () => lines('타입캐스트_3단계_진희_1013.txt') },
  r: { voice: null, list: () => [...lines('타입캐스트_전체개선_우성_1010.txt'), ...lines('타입캐스트_전체개선_진희_1010.txt')] }   // 10/10 은 한 묶음(우성 27 → 진희 18)
};
const pad = (n) => String(n).padStart(2, '0');

if (process.argv[2] === '--import') {
  const dirs = { u: process.argv[3], j: process.argv[4], r: process.argv[5] };
  const idx = fs.existsSync(IDX) ? JSON.parse(fs.readFileSync(IDX, 'utf8')) : {};
  let n = 0, bad = 0;
  for (const [k, d] of Object.entries(dirs)) {
    if (!d) continue; const want = LISTS[k].list(); fs.mkdirSync(path.join(SRC, k), { recursive: true });
    const files = fs.readdirSync(d).filter((f) => /^audio_\d+_.*\.wav$/.test(f));
    if (files.length !== want.length) { console.log(`✗ ${k}: 파일 ${files.length}개 · 목록 ${want.length}줄 — 다르다`); bad++; }
    for (const f of files) {
      const m = f.match(/^audio_(\d+)_(.*)\.wav$/); const i = +m[1]; const t = want[i];
      const got = m[2].endsWith('~') ? norm(m[2].slice(0, -1)) : norm(m[2]);
      const ok = t && (m[2].endsWith('~') ? norm(t).startsWith(got) : norm(t) === got);
      if (!ok) { console.log(`✗ ${k} ${i}: 이름 «${m[2]}» ≠ 목록 «${t || '(없음)'}»`); bad++; continue; }
      const voice = LISTS[k].voice || (i < 27 ? '우성' : '진희');
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(d, f), '-c:a', 'flac', '-compression_level', '8', path.join(SRC, k, pad(i) + '.flac')]);
      idx[`${k}/${pad(i)}`] = { text: t, voice, when: k === 'r' ? '2026-10-10' : '2026-10-13' }; n++;
    }
  }
  fs.writeFileSync(IDX, JSON.stringify(idx, null, 1) + '\n');
  console.log(bad ? `✗ 넣지 못한 것 ${bad}` : `✓ 창고에 ${n}문장(flac · 글 대조 통과)`); process.exit(bad ? 1 : 0);
}

// ── 플레이 03 — 원고에서 처음 들으시는 줄만(NARR_PLAY_LOOP 2) · 순서 = 예식 차례 → 두 분이 고르는 갈래 → 대안
// 조각: u:N 우성(10/13) · j:N 진희(10/13) · r:N 10/10 녹음 · s:<자리>#i 옛 원천 · c:<클립>@<시작초>|<글> 옛 줄째 클립에서 잘라 냄 · 앞에 ! = 구호(0.6초)
const PLAY = [
  ['guest-4-1min-pre', '11', ['s:89_guest-4-1min-pre#0', 's:89_guest-4-1min-pre#1', 'j:0', 's:89_guest-4-1min-pre#2', 's:89_guest-4-1min-pre#4', 's:89_guest-4-1min-pre#5']],
  ['narr-candle-in-mothers', '6-2', ['u:0', 'u:4']],
  ['narr-candle-bow', '6-1', ['u:5']],
  ['entry-A', '11', ['u:6', '!s:05_entry-A#3']],
  ['narr-entry-bow', '11', ['u:10', '!u:11']],
  ['narr-ring-in', '12-2', ['u:13', 'u:14']],
  ['narr-declare-in-friend', '11', ['u:15']],
  ['narr-free-in-speech', '12', ['u:16']],
  ['narr-song', '12-2', ['u:17']],
  ['letter-each', '11', ['u:18', 's:28_letter-each#2']],
  ['toast-cake', '11', ['s:41_toast-cake#0', 'u:21']],
  ['toast-toast', '11', ['s:40_toast-toast#0', 's:76_toast-both-b#1']],
  ['narr-close-bow', '12', ['s:108_narr-close-bow#0', 'r:22', '!u:22']],
  ['narr-table-in', '11', ['u:23', 'c:131_narr-table-in@3.6|자리에서 편히 맞아 주시면 됩니다.']],
  ['narr-close', '12-2', ['s:26_narr-close#0', 'u:24', 'u:25']],
  // 두 분이 고르는 갈래(같은 자리의 다른 판)
  ['narr-candle-in-parents', '6-2', ['u:1']],
  ['narr-candle-in-fathers', '6-2', ['u:2']],
  ['narr-candle-in-others', '6-2', ['u:3']],
  ['entry-C', '12-2', ['u:7', 'u:8', '!s:07_entry-C#2']],
  ['entry-E', '11', ['s:09_entry-E#0', 's:09_entry-E#1', 'u:9', '!s:09_entry-E#3']],
  ['narr-thanks-in', '11', ['u:12']],
  ['letter-parent', '12-2', ['u:19', 'u:20']],
  ['guest-ex3-3-5min', '11', ['r:31', 'j:5']],
  ['guest-ex2-4-1min-thanks', '11', ['j:1']],
  ['guest-ex3-4-1min-thanks', '11', ['j:2']],
  ['guest-ex4-4-1min-thanks', '11', ['j:3']],
  ['guest-ex4-4-1min-last', '11', ['j:4']],
  ['narr-prevideo-in-ex4', '11', ['j:6', 'c:130_narr-prevideo-in-ex4@4.45|영상을 함께 보시겠습니다.']],
  // 대안(비교해 들으시게)
  ['narr-candle-in-mothers-alt', '6-2', ['s:91_narr-candle-in-mothers#0', 's:91_narr-candle-in-mothers#1', 'u:26']],
  ['narr-candle-bow-alt-1', '11', ['u:27']],
  ['narr-candle-bow-alt-2', '11', ['u:28']],
  ['narr-entry-bow-alt', '11', ['u:29']]
];

const idx = fs.existsSync(IDX) ? JSON.parse(fs.readFileSync(IDX, 'utf8')) : {};
const lib = JSON.parse(fs.readFileSync(LIBIDX, 'utf8')).slots;
const doc = norm(fs.readFileSync(DOC, 'utf8'));

if (process.argv[2] === '--check') {
  // [NARR_AUDIO_REAL] ffmpeg 없이 — ① 플레이 03 조각이 실제 파일로 있고 글이 원고에 있다 ② 플레이03.txt 가 표와 같다
  // ③ 원고 2 · 3장 «3단계 글»의 문장마다 실제 소리가 어디 있나(낱개 · 옛 줄째 클립 안 · 없음) — «없음»이 있으면 빨강
  let bad = 0; const fail = (m) => { console.log('✗ ' + m); bad++; };
  const exp = [];
  for (const [name, tag, toks] of PLAY) {
    try { const ps = toks.map(part); for (const p of ps) if (!fs.existsSync(p.file)) fail(`${name}: 파일 없음 ${p.file}`); const t = ps.map((p) => p.text).join(' '); if (!doc.includes(norm(t))) fail(`${name}: 원고에 없는 글 «${t}»`); exp.push(`[지적 ${tag}] ${t}`); }
    catch (e) { fail(`${name}: ${e.message}`); }
  }
  const got = fs.existsSync(PLAYTXT) ? fs.readFileSync(PLAYTXT, 'utf8').split('\n').map((l) => l.replace(/^\d+:\d\d\s+/, '').trim()).filter(Boolean) : [];
  if (got.join('\n') !== exp.join('\n')) fail('플레이03.txt 가 조립 표와 다르다 — node scripts/build-rev1013.mjs 로 다시 만든다');
  const one = new Set(); Object.entries(lib).forEach(([k, v]) => { const [d, i] = k.split('#'); if (fs.existsSync(path.join(LIB, d, i + '.flac'))) one.add(norm(v.text)); });
  Object.entries(idx).forEach(([k, v]) => { if (fs.existsSync(path.join(SRC, k + '.flac'))) one.add(norm(v.text)); });
  const inClip = new Set(); const man = JSON.parse(fs.readFileSync(path.join(PLAN, '타입캐스트/manifest.json'), 'utf8'));
  const mp3s = fs.readdirSync(NARR);
  for (const c of man.clips || []) if (c.file && mp3s.some((f) => f.endsWith('_' + c.file + '.mp3'))) for (const s of c.sents || []) inClip.add(norm(typeof s === 'string' ? s : s.text));
  /* ★[NARR_AUDIO_WAIT 2026-10-13] 녹음을 맡긴 문장은 «소리 없음»이 아니라 «녹음 대기»로 센다 — 맡긴 목록 = docs/plans/식순연구/타입캐스트_<n>판_<성우>_<날짜>.txt(사장님께 드린 타입캐스트 대본 · «성우: 문장» 한 줄씩).
       원고 판(3판 · 4판 …)은 글을 먼저 고치고 녹음은 사장님이 받아 주신다 — 그 사이 이 검사가 빨갛면 원고를 고칠 수 없다. 목록에도 없고 소리도 없는 문장은 종전대로 빨강.
       대기 수는 늘 찍는다(조용해지지 않는다) · 녹음이 오면 --import 로 rev1013/src 에 넣어 «낱개 소리»가 된다 · 2판 목록(타입캐스트_3단계_*)은 이미 받은 것이라 대기로 세지 않는다 */
  const wait = new Map(); for (const f of fs.readdirSync(PLAN).filter((x) => /^타입캐스트_\d+판_.+\.txt$/.test(x))) for (const l of fs.readFileSync(path.join(PLAN, f), 'utf8').split('\n')) { const m = l.match(/^[^:]+:\s*(.+)$/); if (m) wait.set(norm(m[1].trim()), f); }
  let n = 0, a = 0, b = 0, w = 0; const none = [], waits = [];
  let h2 = '', cols = null;
  for (const line of fs.readFileSync(DOC, 'utf8').split('\n')) {
    if (/^## /.test(line)) { h2 = line; cols = null; continue; }
    if (!/^## [23]\./.test(h2)) continue; if (!/^\|/.test(line)) { cols = null; continue; }
    const cells = line.split('|').slice(1, -1).map((c) => c.trim()); if (!cols) { cols = cells; continue; }
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue; const ti = cols.indexOf('3단계 글'); if (ti < 0) continue;
    const t = cells[ti]; if (!t || t === '—' || /^\(/.test(t)) continue;
    for (const s of (t.match(/[^.!?]+[.!?]/g) || []).map((x) => x.trim())) { n++; const k = norm(s); if (one.has(k)) a++; else if (inClip.has(k)) b++; else if (wait.has(k)) { w++; waits.push(`${cells[0].slice(0, 30)} «${s}» · ${wait.get(k)}`); } else none.push(`${cells[0].slice(0, 30)} «${s}»`); }
  }
  console.log(`원고 문장 ${n} · 낱개 소리 ${a} · 옛 줄째 클립 안에만 ${b} · 녹음 대기 ${w} · 소리 없음 ${none.length}`);
  waits.forEach((x) => console.log('… 녹음 대기 — ' + x));   // [NARR_AUDIO_WAIT]
  none.forEach((x) => fail('소리 없음 — ' + x));
  console.log(bad ? `NARR AUDIO FAIL ${bad}` : 'NARR AUDIO OK'); process.exit(bad ? 1 : 0);
}
function part(tok) {   // → { file, text, from?, chant }
  const chant = tok.startsWith('!'); const t = chant ? tok.slice(1) : tok; const [kind, rest] = [t.slice(0, 1), t.slice(2)];
  if (kind === 'u' || kind === 'j' || kind === 'r') { const k = `${kind}/${pad(+rest)}`; const e = idx[k]; if (!e) throw new Error(`창고에 없다 ${k} — --import 먼저`); return { file: path.join(SRC, k + '.flac'), text: e.text, chant }; }
  if (kind === 's') { const e = lib[rest]; const [d, i] = rest.split('#'); const f = path.join(LIB, d, i + '.flac'); if (!e || !fs.existsSync(f)) throw new Error(`옛 원천에 없다 ${rest}`); return { file: f, text: e.text, chant }; }
  if (kind === 'c') { const m = rest.match(/^([^@]+)@([\d.]+)\|(.+)$/); const f = path.join(NARR, m[1] + '.mp3'); if (!fs.existsSync(f)) throw new Error(`클립이 없다 ${m[1]}`); return { file: f, text: m[3], from: m[2], chant }; }
  throw new Error('모르는 조각 ' + tok);
}
const dur = (f) => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim();
const trim = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse';
fs.mkdirSync(OUT, { recursive: true }); fs.mkdirSync(path.dirname(PLAYTXT), { recursive: true });
let bad = 0; const built = [];
for (const [name, tag, toks] of PLAY) {
  const ps = toks.map(part); const text = ps.map((p) => p.text).join(' ');
  if (!doc.includes(norm(text))) { console.log(`✗ ${name}: 원고에 없는 글 «${text}»`); bad++; continue; }   // [NARR_AUDIO_REAL] 플레이 글 = 원고 글
  const args = ['-v', 'error', '-y']; let fc = '', seq = [], k = 0;
  ps.forEach((p, i) => { if (p.from) args.push('-ss', p.from); args.push('-i', p.file); fc += `[${i}:a]aresample=48000,aformat=channel_layouts=mono,${trim}[s${i}];`; k++; });
  const sil = (d) => { args.push('-f', 'lavfi', '-t', String(d), '-i', 'anullsrc=r=48000:cl=mono'); fc += `[${k}:a]aformat=channel_layouts=mono[z${k}];`; return `[z${k++}]`; };
  seq.push(sil(HEAD)); ps.forEach((p, i) => { if (i) seq.push(sil(p.chant ? CHANT : GAP)); seq.push(`[s${i}]`); }); seq.push(sil(TAIL));
  fc += seq.join('') + `concat=n=${seq.length}:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[o]`;
  const out = path.join(OUT, name + '.mp3');
  args.push('-filter_complex', fc, '-map', '[o]', '-ac', '1', '-b:a', '128k', out); execFileSync('ffmpeg', args);
  built.push({ name, tag, text, out, sec: dur(out) });
}
if (bad) { console.log(`✗ 플레이 03 을 만들지 않았다(${bad})`); process.exit(1); }
// 플레이 03 — 줄 사이 2.2초 · 시각은 그 줄이 시작하는 때(플레이 01 · 02 와 같은 꼴 · narr-play.mjs 가 읽는다)
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
let at = 0; const txt = []; const pargs = ['-v', 'error', '-y']; let pfc = '', pseq = [], pk = 0;
built.forEach((b, i) => {
  txt.push(`${mmss(at)}  [지적 ${b.tag}] ${b.text}`); at += b.sec + (i < built.length - 1 ? LINE : 0);
  pargs.push('-i', b.out); pseq.push(`[${pk}:a]`); pk++;
  if (i < built.length - 1) { pargs.push('-f', 'lavfi', '-t', String(LINE), '-i', 'anullsrc=r=48000:cl=mono'); pseq.push(`[${pk}:a]`); pk++; }
});
pfc = pseq.join('') + `concat=n=${pseq.length}:v=0:a=1[o]`;
const playOut = (process.argv.includes('--play-out') && process.argv[process.argv.indexOf('--play-out') + 1]) || path.join(OUT, '플레이03.mp3');
pargs.push('-filter_complex', pfc, '-map', '[o]', '-ac', '1', '-b:a', '128k', playOut); execFileSync('ffmpeg', pargs);
fs.writeFileSync(PLAYTXT, txt.join('\n') + '\n');
console.log(`✓ rev1013 ${built.length}줄 · 플레이 03 ${mmss(dur(playOut))} → ${playOut}`);
