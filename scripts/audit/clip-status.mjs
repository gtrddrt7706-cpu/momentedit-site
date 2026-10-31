#!/usr/bin/env node
/* ★★[CLIP_STATUS_1031 검토 175 · 고침 3 · 4] 안 나는 녹음 표시가 맞는지 · 도구들이 같은 것을 빼는지 잰다.
   원천 셋: ritual-cue RETIRED(나레이션 폐지 슬러그) · ritual-story CAST_MUTE(안 트는 배역) · assets/audio/clip-status.json(파일 단위 retired · legacy · dormant).
   틀린 표는 실청 · 쉼 도구가 «살아 있는 소리»를 빼게 만든다(가장 나쁜 쪽) — 그래서 엔진을 돌려 본다.
   ① 열쇠마다 파일이 있다 · 상태는 retired · legacy · dormant 셋 중 하나 · 까닭 한 줄 · CAST_MUTE 배역은 표에 다시 적지 않는다(원천 하나)
   ② retired · dormant — 엔진 전 조합(build-course-story 훑기 + 옛 코스 덧붙임 하나씩 · 전부 · 두 분 목소리 판)에서 한 번도 안 난다 · console · live · guide 가 파일을 직접 부르지 않는다
   ③ legacy — 나레이션: 새 코스에선 안 나고 옛 코스에서만 난다 · 배역: «직접 녹음»(couple) 판에서만 나고 그 옛 판에선 그대로 난다(새 고객 기준 소리 나는 배역 0)
   ④ CAST_MUTE 배역은 엔진이 소리로 부르지 않는다(castMain 에 안 선다)
   ⑤ 살아 있는 넷(narration 24 · 25 · 43 · 22)은 표에 없다
   ⑦ manual_off(수동 전용 · AUTO_ONLY_1031) — 새 코스 식순 큐가 부르지 않는다 · 콘솔 · 식순 화면 · 라이브 · 하객 안내에 식순 큐 밖 재생 길(playLoose · HELPERS · 촬영 연출 판 재생 단추)이 없다
   ⑥ 도구가 같은 것을 뺀다 — 실청(build-listen-all) · check-recorded · flow-gaps · keepgap-text(음성 쉼)가 찍는 «실청 기준 나레이션 N»이 이 검사가 원천에서 따로 센 값과 같다 ·
      실청 화면(listen-abb5d829.html)에 RETIRED · LEGACY · CAST_MUTE 줄이 없고 dormant 줄은 «지금 안 남» 표시
   스스로 깨 보기 넷. node scripts/audit/clip-status.mjs   종료 코드 0 통과 · 1 실패 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);
const STATUS_FILE = 'assets/audio/clip-status.json';
const MANI = 'docs/plans/식순연구/타입캐스트/manifest.json';
const LISTEN = 'listen-abb5d829.html';
const LIVE_FIX = ['narration/24_narr-bless-end', 'narration/25_narr-bless-end-long'];   // [AUTO_ONLY_1031] 25 는 덕담 3분 넘으면 같은 자리에서 콘솔이 자동으로 바꿔 트는 판 · 43 · 22 는 검토 177 로 manual_off
const MANUAL_SRC = ['console.html', 'order-preview.html', 'live.html', 'guide.html'];   // [AUTO_ONLY_1031] 식순 큐 밖 재생 길을 볼 곳
const SCREENS = ['console.html', 'live.html', 'guide.html'];

/* 엔진 훑기 — 소리 난 파일마다 어디서 났나(open · old · couple · narr)를 모은다 */
function sweep() {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'clipst-')), 'hits.json');
  const code = `
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const ROOT = ${JSON.stringify(ROOT)}; const require = createRequire(path.join(ROOT, 'scripts/x.js'));
const RC = require(path.join(ROOT, 'assets/ritual-cue.js')); const ST = require(path.join(ROOT, 'assets/ritual-story.js'));
const hit = {}; const orig = RC.build;
const add = (f, S) => { if (!f) return; const h = (hit[f] = hit[f] || {}); h[S && S.course === 'open' ? 'open' : 'old'] = 1;
  h[S && (S.entryVoice === 'couple' || S.guestVoice === 'couple' || S.pvVoice === 'couple') ? 'couple' : 'narr'] = 1; };
RC.build = function (S) { const r = orig.apply(this, arguments); try { for (const c of r.cues) {
  add(c.file, S); if (c.alt) add(c.alt.file || (c.alt.slug && RC.fileOf && RC.fileOf(c.alt.slug)), S); if (c.rescue) add(c.rescue.file, S);
  for (const x of (ST.castMainOf ? ST.castMainOf(c) : [])) add('cast:' + x.id, S); } } catch (e) {} return r; };
process.on('exit', () => { fs.writeFileSync(${JSON.stringify(out)}, JSON.stringify(hit)); });
/* 옛 초안 훑기 — build-course-story 는 옛 코스의 덧붙임(extra)을 다 켜지 않는다(자유 한 칸 · 59 가 그렇게 빠졌다) */
const D = require(path.join(ROOT, 'assets/ritual-data.js'));
const EXK = ['bless', 'ringwarm', 'welcome', 'tribute', 'toast', 'song', 'letter', 'free', 'valley'];
for (const course of Object.keys(D.COURSES || {})) {
  const all = {}; EXK.forEach((k) => { all[k] = true; }); const open = (D.COURSES[course] || {}).open;
  for (const ex of open ? [{}] : [{}, all].concat(EXK.map((k) => ({ [k]: true })))) for (const v of [{}, { entryVoice: 'couple', guestVoice: 'couple' }, { bless: 'on' }]) for (const mode of ['console', 'preview']) {
    try { RC.build(Object.assign({ course, extra: ex }, v), { mode }); } catch (e) {} } }
process.chdir(ROOT); process.argv.push('--check');
await import(path.join(ROOT, 'scripts/build-course-story.mjs'));`;
  spawnSync(process.execPath, ['--input-type=module', '-e', code], { cwd: ROOT, stdio: 'ignore' });
  try { return JSON.parse(fs.readFileSync(out, 'utf8')); } catch { return null; }
}

/* 원천에서 따로 센 «안 남» — lib 를 거치지 않는다(도구가 lib 를 잘못 써도 여기서 갈린다) */
function outOf(T, RET, MUTE) {
  return (dir, id) => { const e = T[dir + '/' + id]; if (e && e.s) return e.s;
    if (dir === 'cast') return MUTE[id] ? 'muted' : 'live';
    return RET[String(id).replace(/^\d+_/, '')] ? 'retired' : 'live'; };
}

export function judge(T, hits, opts) {
  const o = opts || {}, bad = [];
  const exists = o.exists || ((k) => fs.existsSync(path.join(ROOT, 'assets/audio', k + '.mp3')));
  const screens = o.screens || '', MUTE = o.MUTE || {};
  for (const [k, v] of Object.entries(T)) {
    const [dir, id] = k.split('/');
    if (!/^(narration|cast)$/.test(dir || '') || !id) { bad.push(`① 열쇠 «${k}» — «narration|cast/번호_이름» 꼴이 아니다`); continue; }
    if (!exists(k)) bad.push(`① 열쇠 «${k}» — assets/audio/${k}.mp3 가 없다`);
    if (!/^(retired|legacy|dormant|manual_off)$/.test(v.s || '')) bad.push(`① «${k}» 상태 «${v.s}» — retired · legacy · dormant · manual_off 넷 중 하나가 아니다`);
    if (!String(v.why || '').trim()) bad.push(`① «${k}» — 까닭 한 줄이 없다`);
    if (dir === 'cast' && MUTE[id]) bad.push(`① «${k}» 는 ritual-story CAST_MUTE 가 이미 정한다 — 표에 다시 적지 않는다(두 군데가 갈린다)`);
    const h = hits[(dir === 'cast' ? 'cast:' : '') + id] || {};
    if (v.s === 'retired' || v.s === 'dormant') {
      if (h.open || h.old) bad.push(`② «${k}» 를 ${v.s} 로 적었는데 엔진에서 난다(${Object.keys(h).join(' · ')}) — 표에서 빼거나 legacy 로`);
      if (screens.indexOf(id) >= 0) bad.push(`② «${k}» 를 ${v.s} 로 적었는데 ${SCREENS.join(' · ')} 가 파일 이름을 직접 부른다`);
    }
    if (v.s === 'manual_off') {   /* [AUTO_ONLY_1031] 새 코스 식순 큐는 부르지 않는다(옛 코스 자동은 legacy 와 같은 자리 · 숫자만 센다) */
      if (h.open) bad.push(`⑦ «${k}» manual_off(수동 전용)인데 새 코스 식순 큐가 부른다 — 표에서 뺄 것(식순 자동)`);
      if (h.old) (o.oldAuto || []).push(k);
    }
    if (v.s === 'legacy' && dir === 'narration') {
      if (h.open) bad.push(`③ «${k}» legacy 인데 새 코스에서 난다 — 표에서 뺄 것(살아 있음)`);
      if (!h.old) bad.push(`③ «${k}» legacy 인데 옛 코스에서도 안 난다 — retired 로 옮길 것`);
    }
    if (v.s === 'legacy' && dir === 'cast') {
      if (h.narr) bad.push(`③ «${k}» legacy(«직접 녹음» 옛 저장분 전용)인데 직접 녹음이 아닌 판에서 난다 — 새 고객에게 배역 소리가 난다`);
      if (!h.couple) bad.push(`③ «${k}» legacy 인데 «직접 녹음» 옛 판에서도 안 난다 — 옛 초안이 열리면 나야 한다(못 나면 retired 로)`);
    }
  }
  for (const id of Object.keys(MUTE)) if (hits['cast:' + id]) bad.push(`④ CAST_MUTE «cast/${id}» 를 엔진이 소리로 부른다(castMain)`);
  for (const k of LIVE_FIX) if (T[k]) bad.push(`⑤ «${k}» 는 살아 있는 소리다(검토 175 고침) — 표에 넣지 않는다`);
  return bad;
}

/* ⑥ 도구 숫자 · 실청 화면 */
function grabD(html) {
  const i = html.indexOf('var D = '); if (i < 0) return null; const s = html.indexOf('{', i); let d = 0, j = s;
  for (; j < html.length; j++) { const ch = html[j]; if (ch === '{') d++; else if (ch === '}') { d--; if (!d) { j++; break; } } }
  try { return JSON.parse(html.slice(s, j)); } catch { return null; }
}
/* ⑦ 식순 큐 밖 재생 길 — playLoose · 보조 단추(HELPERS) · 촬영 연출 판의 재생 단추가 다시 생기지 않았나 [AUTO_ONLY_1031] */
export function noManualPath(srcs) {
  const bad = [];
  for (const [f, raw] of Object.entries(srcs)) {
    const s = String(raw || '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/(^|[^:'"])\/\/[^\n]*/g, '$1');   // 주석은 기록이라 뺀다
    if (/playLoose\s*\(/.test(s)) bad.push(`⑦ ${f} 에 식순 큐 밖 재생(playLoose)이 있다`);
    if (/var\s+HELPERS\s*=/.test(s)) bad.push(`⑦ ${f} 에 «따로 쓰는 클립» 단추 목록(HELPERS)이 있다`);
    const i = s.indexOf("$('#pcBody')");
    if (i >= 0) { const blk = s.slice(i, s.indexOf('})();', i)); if (/onclick|createElement\('button'\)|\.play\(/.test(blk)) bad.push(`⑦ ${f} 촬영 연출 판(PHOTOCUE_BOARD)에 재생 단추가 있다 — 글 메모만`); }
  }
  return bad;
}

export function toolsAgree(st, man, opts) {
  const o = opts || {}, bad = [];
  const want = man.clips.filter((c) => String(c.dir || '').split('/').pop() === 'narration').map((c) => `${c.no}_${c.file}`)
    .filter((id) => st('narration', id) === 'live' && fs.existsSync(path.join(ROOT, 'assets/audio/narration', id + '.mp3'))).length;
  for (const [name, txt] of Object.entries(o.outputs || {})) {
    const m = /실청 기준 나레이션 (\d+)/.exec(txt || '');
    if (!m) bad.push(`⑥ ${name} 가 «실청 기준 나레이션 N» 을 찍지 않는다 — 안 나는 녹음 표(scripts/lib/clip-status.mjs)를 안 읽는 것`);
    else if (+m[1] !== want) bad.push(`⑥ ${name} 는 실청 기준 나레이션 ${m[1]} — 원천(RETIRED + LEGACY + DORMANT + MANUAL_OFF + CAST_MUTE)으로 센 값은 ${want}`);
  }
  if (o.D) {
    const dirOfId = new Map(man.clips.map((c) => [`${c.no}_${c.file}`, String(c.dir || '').split('/').pop()]));
    for (const r of o.D.old || []) {
      const dir = dirOfId.get(r.id) || 'narration', s = st(dir, r.id);
      if (s === 'retired' || s === 'legacy' || s === 'muted') bad.push(`⑥ 실청 화면에 ${s} 줄이 있다 — ${dir}/${r.id}`);
      if (s === 'dormant' && !r.dm) bad.push(`⑥ 실청 화면의 dormant 줄에 «지금 안 남» 표시가 없다 — ${dir}/${r.id}`);
    }
    const n = (o.D.old || []).filter((r) => (dirOfId.get(r.id) || 'narration') === 'narration' && r.has && !r.dm).length;
    if (n !== want) bad.push(`⑥ 실청 화면의 소리 나는 나레이션 줄 ${n} — 원천으로 센 값 ${want}(build-listen-all --web --out ${LISTEN} 로 다시 뽑을 것)`);
  }
  return { bad, want };
}

const direct = !!process.argv[1] && /audit\/clip-status\.mjs$/.test(process.argv[1]);
if (direct) {
  let T, man;
  try { T = JSON.parse(fs.readFileSync(path.join(ROOT, STATUS_FILE), 'utf8')).clips || {}; man = JSON.parse(fs.readFileSync(path.join(ROOT, MANI), 'utf8')); }
  catch (e) { console.log('FAIL 표 · 대장을 못 읽었다 — ' + e.message); process.exit(1); }
  const hits = sweep();
  if (!hits || Object.keys(hits).length < 50) { console.log('FAIL 엔진 훑기가 돌지 않았다(build-course-story 조합) — 소리 난 파일이 ' + (hits ? Object.keys(hits).length : 0) + '개'); process.exit(1); }
  const screens = SCREENS.map((f) => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch { return ''; } }).join('\n');
  const MUTE = require(path.join(ROOT, 'assets/ritual-story.js')).CAST_MUTE || {};
  const RET = require(path.join(ROOT, 'assets/ritual-cue.js')).RETIRED || {};
  const oldAuto = [];
  const bad = judge(T, hits, { screens, MUTE, oldAuto });
  const MSRC = {}; for (const f of MANUAL_SRC) { try { MSRC[f] = fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch {} }
  bad.push(...noManualPath(MSRC));
  /* ⑥ 도구를 실제로 돌려 숫자를 받는다(실청은 임시 파일로 뽑는다 · 저장소 파일은 안 건드린다) */
  const run = (args) => { const r = spawnSync(process.execPath, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 }); return (r.stdout || '') + (r.stderr || ''); };
  const tmpListen = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'clipst-l-')), 'listen-clipst.html');
  const outputs = {
    'build-listen-all(실청)': run(['scripts/build-listen-all.mjs', '--web', '--out', tmpListen]),
    'check-recorded': run(['scripts/check-recorded.mjs']),
    'flow-gaps(흐름 쉼)': run(['scripts/audit/flow-gaps.mjs']),
    'keepgap-text(음성 쉼)': run(['scripts/audit/keepgap-text.mjs']),
  };
  let D = null; try { D = grabD(fs.readFileSync(path.join(ROOT, LISTEN), 'utf8')); } catch {}
  if (!D) bad.push(`⑥ ${LISTEN} 에서 화면 데이터(D)를 못 읽었다`);
  const st = outOf(T, RET, MUTE);
  const ag = toolsAgree(st, man, { outputs, D });
  bad.push(...ag.bad);
  for (const b of bad) console.log('FAIL ' + b);
  /* 스스로 깨 보기 */
  let dead = 0;
  const liveId = Object.keys(hits).find((f) => !f.startsWith('cast:') && hits[f].open && fs.existsSync(path.join(ROOT, 'assets/audio/narration', f + '.mp3')));
  if (!liveId || !judge({ ['narration/' + liveId]: { s: 'retired', why: '깨 보기' } }, hits, { screens, MUTE }).some((x) => x.startsWith('②'))) { dead++; console.log('FAIL 깨 보기 «살아 있는 클립을 retired 로» — 빨강이 안 됐다'); }
  if (!judge({ 'cast/26_vow-both': { s: 'legacy', why: '깨 보기' } }, hits, { screens, MUTE }).some((x) => x.startsWith('①'))) { dead++; console.log('FAIL 깨 보기 «CAST_MUTE 를 표에 또 적기» — 빨강이 안 됐다'); }
  if (!judge({ [LIVE_FIX[0]]: { s: 'legacy', why: '깨 보기' } }, hits, { screens, MUTE }).some((x) => x.startsWith('⑤'))) { dead++; console.log('FAIL 깨 보기 «바로잡은 클립을 다시 표에» — 빨강이 안 됐다'); }
  if (!toolsAgree(st, man, { outputs: { '깨 보기': `실청 기준 나레이션 ${ag.want + 1}` } }).bad.length) { dead++; console.log('FAIL 깨 보기 «도구 숫자 하나 어긋남» — 빨강이 안 됐다'); }
  if (noManualPath({ '깨 보기.html': "function playLoose(a){}\nb.onclick=function(){ playLoose('fx-wave') };" }).length < 1) { dead++; console.log('FAIL 깨 보기 «playLoose 되살림» — 빨강이 안 됐다'); }
  if (noManualPath({ '깨 보기.html': "var box = $('#pcBody'); var b = document.createElement('button'); b.onclick=function(){}; })();" }).length < 1) { dead++; console.log('FAIL 깨 보기 «연출 판 재생 단추» — 빨강이 안 됐다'); }
  if (!judge({ 'narration/01_guest-1-arrival': { s: 'manual_off', why: '깨 보기' } }, hits, { screens, MUTE }).some((x) => x.startsWith('⑦'))) { dead++; console.log('FAIL 깨 보기 «식순 자동 클립을 manual_off 로» — 빨강이 안 됐다'); }
  if (bad.length || dead) { console.log(`✗ CLIP_STATUS_1031 실패 ${bad.length + dead}건`); process.exit(1); }
  const by = {}; for (const v of Object.values(T)) by[v.s] = (by[v.s] || 0) + 1;
  console.log(`ok clip-status — 표 ${Object.keys(T).length}개(${Object.entries(by).map(([k, n]) => k + ' ' + n).join(' · ')}) + CAST_MUTE ${Object.keys(MUTE).length} · 엔진 훑기와 맞음 · 실청 · check-recorded · 흐름 쉼 · 음성 쉼 모두 실청 기준 나레이션 ${ag.want} · 식순 큐 밖 재생 길 0 · manual_off 중 옛 코스 식순에서만 나는 것 ${oldAuto.length}(${oldAuto.join(' · ') || '없음'}) · 깨 보기 7개 맞음`);
  process.exit(0);
}
