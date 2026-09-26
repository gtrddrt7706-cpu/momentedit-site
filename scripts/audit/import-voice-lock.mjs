// [IMPORT_VOICE_LOCK 2026-09-26 코워크 회신8-3] sent-lib --import 가 남의 성우 자리를 덮지 않는지 — 가짜 묶음으로 잰다.
//
//   node scripts/audit/import-voice-lock.mjs
//   SENT_LIB_SRC=<옛 sent-lib.mjs> node scripts/audit/import-voice-lock.mjs   # 고치기 전 판이 붉은지(재현 증거)
//
// ★저장소 창고(assets/audio/_src)는 건드리지 않는다 — 임시 폴더에 필요한 파일만 옮겨 그 안에서 돌린다.
// 보는 것
//   ⓪ 가짜 진한(신랑) 묶음(2_진한.txt 56줄) → 남의 자리 0 · 신랑 자리 전부
//   ① 가짜 예슬(신부 · 옛 서진) 묶음(3_예슬.txt 42줄 · audio_0 부터) · --voice 예슬 로도(다시받기/_순서.json 성우별 순서표) → 남의 자리 0 · 서진 자리 전부
//   ② 가짜 정숙 묶음(7_정숙.txt 5줄) → 남의 자리 0 · 정숙 자리 전부(«서준아.» 는 정숙 27_tribute-reply 로)
//   ③ 오늘 진희 + 우성 묶음 모양(0_전체_화자표기 1~155 · audio_35 «신랑 신부,» 없음 · audio_36 «입장!») → 175자리 · 남의 성우 0
//      + --patch "신랑 신부, 입장!" --keep-gap → 6자리 · 합 181 · --stage 파일 이름에 _JOINED_
//   ④ --todo 는 폐지 클립 자리를 «받을 것»에 넣지 않는다([TODO_RETIRED])
// 종료 코드 0 통과 · 1 실패 · 2 재지 못함(ffmpeg 없음)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); } catch { console.log('못 쟀다 — ffmpeg 없음'); process.exit(2); }
let fail = 0;
const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d == null ? '' : ' → ' + d}`); if (!c) fail++; };

const T = fs.mkdtempSync(path.join(os.tmpdir(), 'voicelock-'));
const cp = (rel, src) => { const d = path.join(T, rel); fs.mkdirSync(path.dirname(d), { recursive: true }); fs.cpSync(src || path.join(ROOT, rel), d, { recursive: true }); };
cp('scripts/sent-lib.mjs', process.env.SENT_LIB_SRC || undefined);
for (const f of ['scripts/lib/whole-take.mjs', 'scripts/clip-select.mjs', 'scripts/build-typecast-import.mjs', 'assets/ritual-cue.js', 'assets/ritual-story.js', 'assets/ritual-data.js', 'assets/ritual-open.js', 'assets/audio/_src']) if (fs.existsSync(path.join(ROOT, f))) cp(f);
/* ★[FIXTURE_0926 2026-09-26] 다시받기 순서표는 «9/26 녹음 전» 판을 얼려 둔 것을 쓴다(scripts/audit/fixtures/voicelock-0926).
   녹음이 다 들어오면 살아 있는 다시받기는 비어서(받을 것 0) 가짜 묶음을 못 만든다 — 그러면 이 검사는 아무것도 재지 않고 붉어진다.
   재는 것은 «들이기 도구»이지 «지금 남은 목록»이 아니다. 같은 모양의 묶음을 늘 같은 순서표로 잰다. */
cp('docs/plans/식순연구/타입캐스트/다시받기', path.join(ROOT, 'scripts/audit/fixtures/voicelock-0926/다시받기'));
/* [FIXTURE_0926] 대장(manifest)도 같은 날 판으로 — 그 뒤 원천 글이 바뀌면(축배 · 감사 인사 · 26 한 문장 빼기) 자리 수가 움직여 기대값을 매번 새로 셈해야 했다. 묶음 · 순서표 · 대장을 한 날로 맞추면 늘 175 다. */
cp('docs/plans/식순연구/타입캐스트/manifest.json', path.join(ROOT, 'scripts/audit/fixtures/voicelock-0926/manifest.json'));
const LIB = path.join(T, 'assets/audio/_src'), DIR = path.join(T, 'docs/plans/식순연구/타입캐스트/다시받기');
const man = JSON.parse(fs.readFileSync(path.join(T, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
const ord = JSON.parse(fs.readFileSync(path.join(DIR, '_전체_순서.json'), 'utf8'));
const VOICE = man.voice;
const roleOf = new Map(); for (const c of man.clips) for (const s of (c.sents || [])) roleOf.set(String(c.no).padStart(2, '0') + '_' + c.file + '#' + s.i, s.role || c.role);
const run = (...a) => spawnSync('node', [path.join(T, 'scripts/sent-lib.mjs'), ...a], { encoding: 'utf8', cwd: T });
const md5 = (f) => { try { return crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex'); } catch { return ''; } };
const snap = () => { const m = new Map(); const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (e.name.endsWith('.flac')) m.set(path.relative(LIB, p).replace(/\/(\d+)\.flac$/, '#$1'), md5(p)); } }; if (fs.existsSync(LIB)) walk(LIB); return m; };
const diff = (a, b) => [...b.keys()].filter((k) => a.get(k) !== b.get(k));
let tone = 200;
const safe = (s) => s.replace(/[\/\\:*?"<>|]/g, '').replace(/\s+/g, '_');
function batch(name, rows) {   // rows: [[번호, 글]] → zip
  const d = path.join(T, 'in', name); fs.mkdirSync(d, { recursive: true });
  for (const [no, text] of rows) execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `sine=frequency=${tone++}:duration=0.6`, '-ar', '44100', '-ac', '1', path.join(d, `audio_${no}_${safe(text)}.wav`)]);
  return d;
}
const slotsOfVoice = (v) => { const out = new Set(); for (const r of ord) if (r.voice === v) for (const a of r.at || []) out.add(a.clip + '#' + a.i); return out; };
const lines = (f) => fs.readFileSync(path.join(DIR, f), 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);

function checkVoiceBatch(label, file, voice, viaVoice) {
  const before = snap();
  const d = batch(label, lines(file).map((t, i) => [i, t]));
  const r = viaVoice ? run('--import', d, '--voice', voice) : run('--import', d);
  const ch = diff(before, snap());
  const other = ch.filter((id) => VOICE[roleOf.get(id)] !== voice);
  const mine = [...slotsOfVoice(voice)].filter((id) => roleOf.has(id));
  const missed = mine.filter((id) => !ch.includes(id));
  ok(`${label} 묶음 → 남의 자리 0 [IMPORT_VOICE_LOCK]`, other.length === 0, other.map((id) => `${id}(${VOICE[roleOf.get(id)]})`).join(' · '));
  ok(`${label} 묶음 → ${voice} 자리 전부(${mine.length})`, missed.length === 0, `빈 채 ${missed.length}: ${missed.slice(0, 6).join(' · ')}`);
  if (r.status !== 0) console.log(r.stdout.slice(-400), r.stderr.slice(-300));
}
checkVoiceBatch('가짜 진한(신랑)', '2_진한.txt', '진한');   // [VOICE_GROOM_3] 신랑 56줄 — 남의 자리 0 · 신랑 자리 전부
checkVoiceBatch('가짜 예슬(신부)', '3_예슬.txt', '예슬');   // [VOICE_BRIDE_2] 옛 3_서진
// [STEPMOM_RETIRE 2026-09-26] 시어머님(정숙) 27_tribute-reply 를 폐지해 7_정숙.txt 가 없다 — 그 묶음 검사는 뺐다(옛 판 재현 «서준아.» → 서진 09 는 커밋 기록에 남아 있다)
checkVoiceBatch('가짜 예슬 --voice(성우별 순서표)', '3_예슬.txt', '예슬', true);   // [VOICE_ORDER]

/* ③ 오늘 묶음 모양 — 1~155줄 · 36번째 줄이 «신랑 신부, / 입장!» 으로 쪼개져 35 없음 · 36 = «입장!» */
{
  const all = lines('0_전체_화자표기.txt').slice(0, 155).map((l) => l.replace(/^[^:]+:\s*/, ''));
  const rows = [];
  all.forEach((t, k) => { if (k < 35) rows.push([k, t]); else if (k === 35) rows.push([36, '입장!']); else rows.push([k + 1, t]); });
  const before = snap();
  const d = batch('오늘 진희 우성', rows);
  const r = run('--import', d);
  const after = snap(), ch = diff(before, after);
  const other = ch.filter((id) => !['진희', '우성'].includes(VOICE[roleOf.get(id)]));
  const want175 = { size: 175 };   // [FIXTURE_0926] 얼린 묶음 · 순서표 · 대장(9/26 녹음 전) — 코워크 재현값
  ok(`오늘 진희 + 우성 묶음 → ${want175.size}자리(얼린 순서표 기준 · 원천 그대로면 175) · 남의 성우 0`, ch.length === want175.size && other.length === 0, `${ch.length}자리 · 남의 ${other.length}`);
  const w = path.join(T, 'in', 'entry.wav'); execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=900:duration=3.35', '-ar', '44100', '-ac', '1', w]);
  const p = run('--patch', '--sent', '신랑 신부, 입장!', '--wav', w, '--keep-gap');
  const ch2 = diff(after, snap());
  ok(`«신랑 신부, 입장!» --patch --keep-gap → 여섯 자리(entry-A~F) · 합 ${want175.size + 6}`, ch2.length === 6 && ch2.every((id) => /entry-[A-F]#/.test(id)) && ch.length + ch2.length === want175.size + 6, `${ch2.length} · ${p.stdout.split('\n')[0]}`);
  const st = path.join(T, 'stage'); const s = run('--stage', st, '--clip', '=05_entry-A');
  const names = fs.existsSync(st) ? fs.readdirSync(st) : [];
  ok('--stage → 그 자리 이름에 _JOINED_ (조립기가 안쪽 쉼을 안 깎는다) [ENTRY_GAP_KEEP]', names.some((n) => /_JOINED_\.flac$/.test(n)) && names.filter((n) => /_JOINED_/.test(n)).length === 1, names.join(' '));
  if (r.status !== 0) console.log(r.stdout.slice(-400), r.stderr.slice(-300));
}
/* ⑤ [CLIP_ORDER] 몇 클립만 다시 받은 묶음 — 08_vow-groom 10 + 24_vow-both-1 2 = 12(audio_0~11) → 그 12자리만 · 남의 자리 0 */
{
  const sel = man.clips.filter((c) => ['vow-groom', 'vow-both-1'].includes(c.file) && !c.mix).sort((a, b) => a.no - b.no);
  const rows = []; let k = 0; const want = [];
  for (const c of sel) for (const s of c.sents) { rows.push([k++, s.text]); want.push(String(c.no).padStart(2, '0') + '_' + c.file + '#' + s.i); }
  const before = snap(); const d = batch('신랑 서약 다시', rows);
  const r = run('--import', d, '--clip', sel.map((c) => '=' + String(c.no).padStart(2, '0') + '_' + c.file).join(','));
  const ch = diff(before, snap());
  ok(`--import --clip 부분 재녹음(${rows.length}) → 그 자리만 · 남의 자리 0 [CLIP_ORDER]`, ch.length === want.length && ch.every((id) => want.includes(id)), `${ch.length} · ${ch.filter((id) => !want.includes(id)).join(' ')} · ${r.stdout.split('\n').find((l) => /CLIP_ORDER/.test(l)) || r.stdout.slice(-200)}`);
}
/* ④ --todo 는 폐지 자리를 안 센다 */
{
  const st = run('--status').stdout, td = run('--todo').stdout;
  const sum = (txt, re) => { let n = 0; for (const m of txt.matchAll(re)) n += +m[1]; return n; };
  const stN = sum(st.split('다시 받아야 할 것')[1] || '', /\s(\d+)문장/g), tdN = +((td.match(/→ 받으실 줄 (\d+)줄/) || [])[1] || -1);
  const gatherOff = run('--todo').stdout;
  ok('--todo 줄 수 ≤ --status 문장 수(폐지 자리를 «받을 것»에 넣지 않는다) [TODO_RETIRED]', tdN >= 0 && tdN <= stN, `todo ${tdN} · status ${stN}`);
}
fs.rmSync(T, { recursive: true, force: true });
console.log(fail ? `\n결과 — 실패 ${fail}건` : '\n결과 — 전부 통과'); process.exit(fail ? 1 : 0);
