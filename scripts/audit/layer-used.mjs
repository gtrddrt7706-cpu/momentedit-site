#!/usr/bin/env node
/* ★★[LAYER_PLAN_1108 · 대본 11/08 20:20 사장님 «안 쓰는 건 버려»] «실제로 트는 나레이션» — RETIRED 목록이 아니라 엔진을 돌려서 센다
   씀 = 아래 어디서든 한 번이라도 나오는 파일:
     ① C.build 훑기 — 코스 전부 × 칸 값(엔진이 비교하는 S.칸 = '값' 전부 · 켜기/끄기 · 수) 하나씩 × 예시 칩(NAR_EX 모든 순간 · 모든 번호 · 화촉 네 분) × 조건(사진 링크 · 식사 · 식사 자리 · 온라인 · 디지털 · 예약 8가지) · 콘솔 · 미리 듣기 두 모드
     ② build-course-story --check 가 도는 상태 전부(clip-status 훑기와 같은 길) · 옛 코스 덧붙임 하나씩 · 전부
     ③ 콘솔 · 식순 화면(미리 듣기 · 연습하기) · 라이브 · 하객 안내가 파일 이름이나 슬러그를 직접 적은 곳(골라 트는 판 · 호명 등)
     ④ clip-status 의 legacy(옛 저장분 · 옛 코스)
   쓰기: node scripts/audit/layer-used.mjs --json docs/plans/식순연구/층_씀목록_1108.json (15분쯤 · merge-guard 는 이 결과를 layer-targets 로 본다) → 씀/안 씀 · 어디서 나오는지 예 하나 */
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arg = (k) => { const i = process.argv.indexOf(k); return i > -1 ? process.argv[i + 1] : ''; };
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lyused-')), 'hits.json');
const code = `
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const ROOT = ${JSON.stringify(ROOT)}; const require = createRequire(path.join(ROOT, 'scripts/x.js'));
const RC = require(path.join(ROOT, 'assets/ritual-cue.js')), D = require(path.join(ROOT, 'assets/ritual-data.js')), O = require(path.join(ROOT, 'assets/ritual-open.js'));
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
const keys = new Set(fs.readdirSync(path.join(ROOT, 'assets/audio/narration')).filter((f) => f.endsWith('.mp3')).map((f) => f.slice(0, -4)));
const bySlug = {}; for (const c of man.clips) bySlug[c.file] = String(c.no).padStart(2, '0') + '_' + c.file;
for (const k of keys) { const s = k.replace(/^\\d+_/, ''); if (!bySlug[s]) bySlug[s] = k; }
const hit = {}; let tag = '', nb = 0;
const take = (str) => { for (const m of String(str).matchAll(/\\b(\\d{1,3}_[a-zA-Z0-9][a-zA-Z0-9-]*)|"(?:slug|file)":"([a-zA-Z0-9][a-zA-Z0-9-]*)"/g)) { const k = m[1] && keys.has(m[1]) ? m[1] : (m[2] && (keys.has(m[2]) ? m[2] : bySlug[m[2]])); if (k && !hit[k]) hit[k] = tag; } };
const orig = RC.build;
const seen = new Map(); let rec = false;
RC.build = function (S, o) { if (rec && S) { const j = JSON.stringify(S); if (!seen.has(j) ) seen.set(j, S); } const r = orig.apply(this, arguments); nb++; try { take(JSON.stringify(r.cues)); } catch (e) {} return r; };
const run = (S, t) => { for (const mode of ['console', 'preview']) { tag = t + ' · ' + mode; try { RC.build(JSON.parse(JSON.stringify(S)), { mode }); } catch (e) {} } };
const src = fs.readFileSync(path.join(ROOT, 'assets/ritual-cue.js'), 'utf8');
const vals = {}; const addV = (f, v) => { (vals[f] = vals[f] || new Set()).add(v); };
for (const m of src.matchAll(/\\bS\\.([a-zA-Z_]+)\\s*[!=]==?\\s*'([^']*)'/g)) addV(m[1], m[2]);
for (const m of src.matchAll(/'([^']*)'\\s*[!=]==?\\s*S\\.([a-zA-Z_]+)/g)) addV(m[2], m[1]);
for (const m of src.matchAll(/\\bS\\.([a-zA-Z_]+)/g)) { for (const v of [0, 1, true, 2, 3, 5, 10, 30]) addV(m[1], v); }
const EXK = ['bless', 'ringwarm', 'welcome', 'tribute', 'toast', 'song', 'letter', 'free', 'valley'];
const conds = []; for (let b = 0; b < 64; b++) conds.push({ photoShare: b & 1, meal: (b >> 1) & 1, mealFull: (b >> 2) & 1, digital: (b >> 3) & 1, resv: (b >> 4) & 1, guide: (b >> 5) & 1 });
const voices = [{}, { entryVoice: 'couple', guestVoice: 'couple', pvVoice: 'couple' }, { entryVoice: 'ai', guestVoice: 'ai', pvVoice: 'ai' }];
const NE = O.NAR_EX || {};
for (const course of Object.keys(D.COURSES || {})) {
  const exs = [{}, Object.fromEntries(EXK.map((k) => [k, true]))].concat(EXK.map((k) => ({ [k]: true })));
  for (const extra of exs) for (const v of voices) for (const c of conds) run(Object.assign({ course, extra }, v, c), course + ' · 조건 ' + JSON.stringify(c));
  for (const [f, set] of Object.entries(vals)) for (const v of set) for (const c of [conds[0], conds[63]]) run(Object.assign({ course, extra: exs[1] }, c, { [f]: v }), course + ' · ' + f + '=' + v);
  for (const k of Object.keys(NE)) { const L = Object.values(NE[k].lines || {}).reduce((a, x) => Math.max(a, x.length), 0);
    for (let n = 1; n <= L; n++) for (const cw of [undefined, 'mothers', 'fathers', 'parents', 'four', 'both']) for (const c of [conds[0], conds[1], conds[3], conds[7], conds[11], conds[15], conds[63]]) for (const ex of [exs[0], exs[1]])
      run(Object.assign({ course, extra: ex, narEx: { [k]: n } }, cw ? { candleWho: cw } : {}, c), course + ' · 칩 ' + (NE[k].lab || k) + ' ' + n + (cw ? ' · ' + cw : '')); } }
tag = 'build-course-story'; rec = true;
/* build-course-story 가 돈 상태마다 조건 32가지(식사 · 식사 자리 · 예약 · 온라인 · 하객 안내 끔)를 겹쳐 다시 — 본식 길이 × 식사 같은 짝(345 ~ 347)을 놓치지 않게 */
process.on('exit', () => { rec = false; const ns = seen.size; for (const S of seen.values()) for (let b = 0; b < 32; b++) { const c = { meal: b & 1, mealFull: (b >> 1) & 1, resv: (b >> 2) & 1, digital: (b >> 3) & 1 }; if (b & 16) c.guide = 0;
    run(Object.assign({}, S, c), '코스 이야기 상태 ' + (S.course || '') + ' · 조건 ' + JSON.stringify(c)); }
  /* 새 코스 상태마다 예시 칩 하나씩(번호 전부) — 칩은 그 순간이 담겨야(S.on) · 누가(화촉 · 선언 호칭)가 맞아야 선다 */
  for (const S of seen.values()) { if (S.course !== 'open') continue; for (const k of Object.keys(NE)) { const L = Object.values(NE[k].lines || {}).reduce((a, x) => Math.max(a, x.length), 0);
    for (let n = 1; n <= L; n++) run(Object.assign({}, S, { narEx: Object.assign({}, S.narEx || {}, { [k]: n }) }), '새 코스 상태 · 칩 ' + (NE[k].lab || k) + ' ' + n); } }
  /* 칩이 서는 조건이 다른 칸에 걸린 것(서약 «두 분이 먼저» · 감사문 판 · 선언 읽는 분 호칭) — 새 코스 상태 500개 고루 × 그 칸 × 칩 */
  const opens = [...seen.values()].filter((S) => S.course === 'open'), step = Math.max(1, Math.floor(opens.length / 500));
  const FO = [{ vowFirst: 'b' }, { vowKind: 'thanks' }].concat((O.DECL_TITLES || []).flatMap(([t]) => [{ declTitle: t }, { declareWho: 'friend', declTitle: t }]));
  /* 칸 값 하나씩 × 새 코스 상태 500 — 순간이 담긴 상태에서만 서는 갈래(식전 영상 예시 S.pvEx 1 → 128 같은 것 · 11/08 대본 대조에서 놓친 자리) */
  for (let i = 0; i < opens.length; i += step) for (const [f, set] of Object.entries(vals)) for (const v of set) run(Object.assign({}, opens[i], { [f]: v }), '새 코스 상태 · ' + f + '=' + v);
  for (let i = 0; i < opens.length; i += step) { const S = opens[i]; for (const f of FO) { const S2 = Object.assign({}, S, f); if (f.vowKind && S2.on) S2.on = Object.assign({}, S2.on, { welcome: 0 });
    run(S2, '새 코스 상태 · ' + JSON.stringify(f)); for (const k of Object.keys(NE)) { const L = Object.values(NE[k].lines || {}).reduce((a, x) => Math.max(a, x.length), 0);
      for (let n = 1; n <= L; n++) run(Object.assign({}, S2, { narEx: Object.assign({}, S2.narEx || {}, { [k]: n }) }), '새 코스 상태 · ' + JSON.stringify(f) + ' · 칩 ' + (NE[k].lab || k) + ' ' + n); } } }
  fs.writeFileSync(${JSON.stringify(out)}, JSON.stringify({ hit, nb, ns })); });
process.chdir(ROOT); process.argv.push('--check');
await import(path.join(ROOT, 'scripts/build-course-story.mjs'));`;
spawnSync(process.execPath, ['--input-type=module', '-e', code], { cwd: ROOT, stdio: 'ignore', maxBuffer: 1 << 28 });
const { hit, nb, ns } = JSON.parse(fs.readFileSync(out, 'utf8'));
const keys = fs.readdirSync(path.join(ROOT, 'assets/audio/narration')).filter((f) => f.endsWith('.mp3') && f !== 'parents-letter.mp3').map((f) => f.slice(0, -4));
/* ③ 직접 부르는 곳 */
const direct = {}; for (const f of ['console.html', 'order-preview.html', 'live.html', 'guide.html', 'parents.html', 'assets/ritual-story.js']) { if (!fs.existsSync(path.join(ROOT, f))) continue; const s = fs.readFileSync(path.join(ROOT, f), 'utf8');
  for (const k of keys) if (!direct[k] && (s.includes(k + '.mp3') || (k === '43_parents-letter' && s.includes('parents-letter.mp3')) || s.includes("'" + k.replace(/^\d+_/, '') + "'") || s.includes('"' + k.replace(/^\d+_/, '') + '"'))) direct[k] = f; }
const st = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/audio/clip-status.json'), 'utf8')).clips || {};
const rows = keys.map((k) => { const s = (st['narration/' + k] || {}).s || '';
  const where = hit[k] ? '엔진 · ' + hit[k] : (direct[k] ? '직접 부름 · ' + direct[k] : (s === 'legacy' ? 'clip-status legacy(옛 저장분)' : ''));
  return { k, use: !!where, where, status: s }; });
if (arg('--json')) fs.writeFileSync(arg('--json'), JSON.stringify(rows, null, 1));
const off = rows.filter((x) => !x.use);
console.log(`layer-used — build ${nb}번(코스 이야기 상태 ${ns}) · 씀 ${rows.length - off.length} · 안 씀 ${off.length} / ${rows.length}`);
for (const x of off) console.log('  안 씀', x.k, x.status || '');
