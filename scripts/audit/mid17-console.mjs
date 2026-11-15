#!/usr/bin/env node
/* ★★[MID17_CONSOLE 2026-11-07 사장님 결정 · 식중 영상 · 계획 docs/handoff/midvideo-17.md 줄 10 · 11] 당일 콘솔 · 디지털 참석
   ① 엔진(node) — 식중 영상 큐의 디렉터 메모(note)가 식전 영상 큐 메모와 같은 꼴(«영상 링크는 D-7 까지 받는다(…)» · «상영 중 배경음은 끈다») ·
       메모는 영상 사람 순간을 든 큐에(두 줄 날 129 · 129 겹친 날 58) · 길이 · «…_식중» 폴더 «미리보기…» · «소개 말이 끝나면 영상을 튼다» ·
       [재생 안 됨] 이름 · 영상 동안 소리 크기(배경음 끔)가 식전 영상과 같다 · 영상 뒤 다음 순간은 손(GO) · «… 후» 힌트 ·
       디지털 참석 날에도 식전 영상 · 식중 영상 큐가 한 글자도 안 바뀐다(식전 영상에도 중계 처리가 없다 — 둘이 같다) · 축사 · 선물 · 기타는 메모 없음
   ② 콘솔 화면(Playwright 390 · 360 · console.html) — 재생 순서 기록(window.__playLog · 점검이 켰을 때만)에 58 → 129 → 영상(사람 순간) → 다음 순간 ·
       129 겹친 날 58 → 영상 → 다음 순간 · 영상 자리에서 이름 «준비한 영상 상영 (영상은 디렉터가 튼다)» · 메모(힌트 칸) · «막히면: … [재생 안 됨]» ·
       갈래 칩 «당일 직접»(식전 영상과 같다 · «축사하시는 분» 아님) · [재생 안 됨] 단추가 눌리고 누르면 미룬 순서 «식중 영상» · «다음» 칸 «축가 시작 · … 후» · 디지털 날 영상 자리 화면 = 디지털 아닌 날(식전 영상도 같다) ·
       고객 미리 듣기(embed=1 · 390) 이름 «식중 영상 시작 · 1분» · «식중 영상 소개» · 블록 «식중 영상» · 디렉터 글(D-7 · 막히면) 안 보임 · pageerror 0
   ★★[SPEECH_SONG_1115 2026-11-15 대표님] 식중 영상 = 따로 넣고 빼는 순간 midvid(큐 열쇠 midvid · 축사 · 축가 뒤 · 편지 앞) — 옛 기대(큐 열쇠 free · 다음 순간 축가)는 은퇴
   ★★[NARR_ROLE_1115 d262d560] 식중 영상 큐 = 353 여는 말(영상 사람 순간 · 메모 · [재생 안 됨]) → 355 박수(«영상이 끝나면» · 손) — 옛 기대(58 → 129 · 129 겹친 날 58 하나 · 메모는 129 에)는 은퇴
   --selftest — 옛 동작(메모 없음 · 메모가 박수 줄에 · 디지털이 메모를 바꿈 · 박수 줄 없음 · 힌트 없음 · 축사 칩)을 빨강으로 읽는지 본다
   종료 코드 0 통과 · 1 실패 · 2 재지 못함(브라우저 없음 — 엔진 검사는 돈다) */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const C = require(path.join(ROOT, 'assets/ritual-cue.js'));
const SELF = process.argv.includes('--selftest');
const SHOT = process.env.SHOT_DIR || '';
let fail = 0;
const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + String(typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 500)}`); if (!c) fail++; return !!c; };

const O = require(path.join(ROOT, 'assets/ritual-open.js'));
const IN = ((O.MID_TONE || {}).plain || [])[0] || 'midvideo-in-plain', OUT = ((O.MID_TONE || {}).plain || [])[1] || 'midvideo-out-story';   // [NARR_ROLE_1115] 353 → 355
const ON = { bless: 1, song: 1, midvid: 1, letter: 1 };   // [SPEECH_SONG_1115] 축가 → 식중 영상 → 편지
const base = (x) => Object.assign({ course: 'open', on: Object.assign({}, ON), midLen: '4' }, x || {});
const withPv = (x) => base(Object.assign({ on: Object.assign({ prevideo: 1 }, ON) }, x || {}));
const build = (S) => C.build(C.norm(JSON.parse(JSON.stringify(S))), { mode: 'console' }).cues;
const pick = (cues, k) => cues.filter((c) => c.k === k);
const vNote = (c) => c && c.live && c.rescue ? c : null;   // 영상 사람 순간을 든 큐

/* ── 판정(검사 · 깨 보기가 같은 함수를 쓴다) ── */
const NOTE_HEAD = '영상 링크는 D-7 까지 받는다(';
function midNoteOk(n, len) {
  return typeof n === 'string' && n.indexOf(NOTE_HEAD) === 0 && n.indexOf('마이페이지 «식중 영상» 확정 기한과 같다') > -1 && n.indexOf('길이 ' + len + '분') > -1
    && n.indexOf('_식중» 폴더의 «미리보기…» 파일') > -1 && n.indexOf('소개 말이 끝나면 영상을 튼다') > -1 && /상영 중 배경음은 끈다$/.test(n) && n.indexOf('—') < 0;
}
function engine(src) {
  const r = {};
  r.video = src.cues(base());
  r.video1 = src.cues(base({ midLen: '1' }));
  r.pv129 = src.cues(withPv({ pvEx: 2 }));
  r.pv90 = src.cues(withPv({ pvEx: 0 }));
  r.dVideo = src.cues(base({ digital: true }));
  r.dPv129 = src.cues(withPv({ pvEx: 2, digital: true }));
  r.dPv90 = src.cues(withPv({ pvEx: 0, digital: true }));
  r.speech = src.cues({ course: 'open', on: { bless: 1, free: 1, letter: 1 }, freeWhat: 'speech' });
  r.gift = src.cues({ course: 'open', on: { bless: 1, free: 1, song: 1 }, freeWhat: 'gift' });
  r.etc = src.cues({ course: 'open', on: { bless: 1, free: 1, song: 1 }, freeWhat: 'etc', freeEtc: '형제 깜짝 영상편지' });
  r.oldDraft = src.cues({ course: 'open', on: { bless: 1, free: 1, song: 1, letter: 1 }, freeWhat: 'video', freeLen: '4' });   // [SPEECH_SONG_1115] 옛 초안 → midMigrate
  return r;
}
function judgeEngine(r) {
  let bad = 0; const t = (m, c, d) => { if (!ok(m, c, d)) bad++; };
  const fv = pick(r.video, 'midvid'), f1 = pick(r.video1, 'midvid'), fo = pick(r.pv129, 'midvid');
  t('[NARR_ROLE_1115] 메모는 영상 사람 순간을 든 여는 말(' + IN + ')에 · 박수 줄(' + OUT + ')은 메모 없음 · 식전 영상과 같은 꼴 · 길이 4분 · «…_식중» 폴더 «미리보기…» · 소개 말이 끝나면 튼다',
    fv.length === 2 && fv[0].slug === IN && !!vNote(fv[0]) && midNoteOk(fv[0].note, 4) && fv[1].slug === OUT && !fv[1].note, fv.map((c) => [c.slug, c.note]));
  t('길이 1분 날 메모 «길이 1분»', f1.length === 2 && midNoteOk(f1[0].note, 1), f1.map((c) => c.note));
  t('[NARR_ROLE_1115] 식전 영상 소개가 129 인 날(pvEx 2)도 같은 두 줄 · 메모도 여는 말에(옛 «129 겹친 날 58 하나» 은퇴)', fo.length === 2 && fo[0].slug === IN && !!vNote(fo[0]) && midNoteOk(fo[0].note, 4) && fo[1].slug === OUT, fo.map((c) => [c.slug, c.note]));
  /* 식전 영상과 같은 꼴 — 메모 머리 · 상영 중 배경음 · [재생 안 됨] 이름 · 영상 동안 소리 크기 */
  const pv = pick(r.pv90, 'prevideo').find((c) => c.live && c.rescue), mv = pick(r.pv90, 'midvid').find((c) => c.live && c.rescue);
  t('식전 영상 · 식중 영상 — 메모 머리 «영상 링크는 D-7 까지 받는다(» · «상영 중 배경음은 끈다» · [재생 안 됨] 이름 · 영상 동안 소리 크기(배경음 끔)가 같다',
    !!pv && !!mv && pv.note.indexOf(NOTE_HEAD) === 0 && mv.note.indexOf(NOTE_HEAD) === 0 && /상영 중 배경음은 끈다/.test(pv.note) && /상영 중 배경음은 끈다/.test(mv.note)
    && pv.rescue.name === mv.rescue.name && pv.live.duck === mv.live.duck && mv.live.duck <= -60, pv && mv && [pv.note, mv.note, pv.rescue.name, mv.rescue.name, pv.live.duck, mv.live.duck]);
  /* 끝나면 GO — 영상 뒤 박수 줄은 손으로 · 힌트 «영상이 끝나면» · 다음 순간(편지) 첫 큐도 손 */
  const nx = (cues) => { const ms = cues.filter((c) => c.k === 'midvid'), i = cues.indexOf(ms.slice(-1)[0]); return [ms[0], ms[1], cues[i + 1]]; };
  const [lv, ov, nv] = nx(r.video), [lo, oo, no] = nx(r.pv129);
  t('[NARR_ROLE_1115] 영상이 끝나면 GO — 박수 줄(' + OUT + ')은 손 · 힌트 «영상이 끝나면» · 다음 순간(편지) 첫 큐도 손(두 판 다)',
    !!ov && ov.slug === OUT && ov.fire === 'manual' && ov.hint === '영상이 끝나면' && !!nv && nv.k === 'letter' && nv.fire === 'manual' && !!oo && oo.fire === 'manual' && oo.hint === '영상이 끝나면' && !!no && no.k === 'letter' && no.fire === 'manual', [ov && [ov.slug, ov.fire, ov.hint], nv && [nv.slug, nv.fire, nv.hint], no && no.slug]);
  t('영상 자리 이름(사람 순간) = «준비한 영상 상영 (영상은 디렉터가 튼다)» — 영상은 디렉터가 튼다', !!lv && lv.live.t === '준비한 영상 상영 (영상은 디렉터가 튼다)' && !!lo && lo.live.t === lv.live.t, [lv && lv.live.t, lo && lo.live.t]);
  /* 디지털 참석 — 식전 영상 · 식중 영상 큐가 디지털 날에도 한 글자도 같다(식전 영상에도 중계 처리가 없다 · 둘이 같다) */
  const js = (cues, k) => JSON.stringify(pick(cues, k).map((c) => Object.assign({}, c, { idx: undefined })));   // 자리 번호(idx)만 뺀다 — 디지털 날은 앞에 온라인 환영(48)이 하나 더 서 번호가 한 칸 밀린다
  t('디지털 참석 날 — 식중 영상 큐(식전 소개 판 둘 다) = 디지털 아닌 날', js(r.dVideo, 'midvid') === js(r.video, 'midvid') && js(r.dPv129, 'midvid') === js(r.pv129, 'midvid'), [js(r.dVideo, 'midvid').length, js(r.video, 'midvid').length]);
  t('디지털 참석 날 — 식전 영상 큐 = 디지털 아닌 날(식전 · 식중 처리가 같다)', js(r.dPv90, 'prevideo') === js(r.pv90, 'prevideo') && js(r.dPv129, 'prevideo') === js(r.pv129, 'prevideo'), [js(r.dPv90, 'prevideo').length, js(r.pv90, 'prevideo').length]);
  t('축사 · 선물 · 기타(옛 초안)에는 영상 메모가 없다(식중 영상만 · 축사 맺는 이음말 메모는 그대로)', [r.speech, r.gift, r.etc].every((cs) => pick(cs, 'free').length > 0 && pick(cs, 'free').every((c) => (c.note || '').indexOf(NOTE_HEAD) < 0)), [r.speech, r.gift, r.etc].map((cs) => pick(cs, 'free').map((c) => c.note)));
  t('[SPEECH_SONG_1115] 옛 초안(free + video) — 콘솔 큐도 식중 영상(midvid)으로 · 새 초안과 같은 메모 · free 큐 없음', js(r.oldDraft, 'midvid') === js(r.video, 'midvid') && pick(r.oldDraft, 'free').length === 0, [js(r.oldDraft, 'midvid').length, pick(r.oldDraft, 'free').length]);
  return bad;
}
const live = { cues: build };

/* 콘솔 화면 판정 — 재생 순서 기록 · 영상 자리 화면 */
function seqOf(log, from) {   // from 부터 «슬러그(사람 순간이면 :live)» 한 줄씩(같은 것 연달아는 하나로)
  const out = []; (log || []).filter((x) => x.i >= from).forEach((x) => { const k = x.slug + (x.phase === 'live' ? ':live' : ''); if (out[out.length - 1] !== k) out.push(k); });
  return out.filter((k, i, a) => a.indexOf(k) === i);
}
function judgeDay(d, width, tag) {
  let bad = 0; const t = (m, c, x) => { if (!ok(`${width} ${m}`, c, x)) bad++; };
  const want = [IN, IN + ':live', OUT];
  const sq = seqOf(d.log, d.from);
  t('[NARR_ROLE_1115] ' + tag + ' 재생 순서 기록 = 여는 말(' + IN + ') → 영상(사람 순간) → 박수 줄(' + OUT + ') · 129 없음',
    JSON.stringify(sq.slice(0, want.length)) === JSON.stringify(want) && sq.every((k) => !/^narr-prevideo-in-ex3|^narr-free-in$/.test(k)), sq);
  const L = d.atLive || {};
  t(tag + ' 영상 자리 — 이름 «준비한 영상 상영 (영상은 디렉터가 튼다)» · «막히면: 영상 · 음원이 안 나오면 [재생 안 됨]» · 힌트 칸 = 메모(D-7 · «식중 영상» · 소개 말이 끝나면 영상을 튼다)',
    L.name === '준비한 영상 상영 (영상은 디렉터가 튼다)' && /막히면: 영상 · 음원이 안 나오면 \[재생 안 됨\]/.test(L.txt || '') && L.hintOn && (L.hint || '').indexOf(NOTE_HEAD) === 0 && /«식중 영상»/.test(L.hint) && /소개 말이 끝나면 영상을 튼다/.test(L.hint), L);
  t(tag + ' 영상 자리 — [재생 안 됨] 단추가 눌린다 · «다음» 칸 «식중 영상 마무리 · 손 · 영상이 끝나면»', L.bw === false && /식중 영상 마무리/.test(L.u1 || '') && /영상이 끝나면/.test(L.u1 || ''), L);
  t(tag + ' 영상 자리 갈래 칩 — «축사» 아님(식전 영상 자리와 같은 «당일 직접»)', Array.isArray(L.tags) && L.tags.indexOf('당일 직접') > -1 && !L.tags.some((x) => /축사/.test(x)), L.tags);
  t(tag + ' 누른 뒤 박수 줄(' + OUT + ')이 나간다 · 쪽 오류 0', d.after === OUT && !d.errs.length, [d.after, d.errs.slice(0, 2)]);
  return bad;
}

/* ── 깨 보기 ── */
if (SELF) {
  const quiet = (fn) => { const lg = console.log; console.log = () => {}; try { return fn(); } finally { console.log = lg; } };
  const mapFree = (fn) => ({ cues: (S) => build(S).map((c) => c.k === 'midvid' ? fn(Object.assign({}, c), S) : c) });
  const fakes = [
    ['메모 없음(옛 엔진)', mapFree((c) => Object.assign(c, { note: '' }))],
    ['메모가 박수 줄에(영상 사람 순간과 떨어짐)', { cues: (S) => { const cs = build(S); const f = cs.filter((c) => c.k === 'midvid'); if (f.length === 2) { f[1].note = f[0].note; f[0].note = ''; } return cs; } }],
    ['박수 줄 없음(옛 한 줄 꼴)', { cues: (S) => { const cs = build(S); const i = cs.findIndex((c) => c.k === 'midvid' && c.slug === OUT); if (i > -1) cs.splice(i, 1); return cs; } }],
    ['큐 열쇠 free(옛 축사 칸 갈래)', { cues: (S) => build(S).map((c) => c.k === 'midvid' ? Object.assign({}, c, { k: 'free' }) : c) }],
    ['디지털 날 메모가 바뀜', mapFree((c, S) => S.digital && c.note ? Object.assign(c, { note: c.note + ' · 중계 화면을 영상으로' }) : c)],
    ['영상 동안 배경음이 남음(식전 영상과 다름)', mapFree((c) => c.live ? Object.assign(c, { live: Object.assign({}, c.live, { duck: -20 }) }) : c)],
  ];
  let dead = 0;
  for (const [nm, src] of fakes) { const b = quiet(() => judgeEngine(engine(src))); fail = 0; if (!b) { dead++; console.log('FAIL 깨 보기 «' + nm + '» — 빨강이 안 됐다'); } else console.log('ok   깨 보기 «' + nm + '» → 빨강 ' + b); }
  const okNow = quiet(() => judgeEngine(engine(live))); fail = 0;
  if (okNow) { dead++; console.log('FAIL 깨 보기 — 지금 엔진이 빨강이다(' + okNow + ')'); }
  /* 화면 판정 깨 보기 — 기록 · 화면 값을 옛 꼴로 만들어 넣는다 */
  const goodLive = { tags: ['손으로', '식중 영상 · 1분', '당일 직접', '사람의 시간'], name: '준비한 영상 상영 (영상은 디렉터가 튼다)', txt: '막히면: 영상 · 음원이 안 나오면 [재생 안 됨] · …', hintOn: true, hint: NOTE_HEAD + '마이페이지 «식중 영상» … · 소개 말이 끝나면 영상을 튼다 · 상영 중 배경음은 끈다', bw: false, u1: '다음식중 영상 마무리손으로 · 영상이 끝나면 · 355번' };
  const L = (arr) => arr.map((x, j) => ({ i: 10 + j, slug: x.split(':')[0], phase: x.endsWith(':live') ? 'live' : 'clip' }));
  const good = { from: 10, log: L([IN, IN + ':live', OUT, OUT + ':live']), atLive: goodLive, after: OUT, errs: [] };
  if (quiet(() => judgeDay(good, 'self', '깨 보기'))) { dead++; console.log('FAIL 깨 보기 — 맞는 화면 값을 빨강으로 읽었다'); } fail = 0;
  const sfakes = [
    ['58 → 129 → 영상(옛 순서)', Object.assign({}, good, { log: L(['narr-free-in', 'narr-prevideo-in-ex3', 'narr-prevideo-in-ex3:live', 'letter-each']) })],
    ['박수 줄 없이 다음 순간', Object.assign({}, good, { log: L([IN, IN + ':live', 'letter-each']) })],
    ['영상 자리 힌트 칸 빔', Object.assign({}, good, { atLive: Object.assign({}, goodLive, { hintOn: false, hint: '' }) })],
    ['[재생 안 됨] 흐림', Object.assign({}, good, { atLive: Object.assign({}, goodLive, { bw: true }) })],
    ['갈래 칩 «축사 · 1분»(free 칩 이름을 물려받음)', Object.assign({}, good, { atLive: Object.assign({}, goodLive, { tags: ['손으로', '축사 · 1분', '당일 직접', '사람의 시간'] }) })],
    ['다음 칸이 축가(옛 차례)', Object.assign({}, good, { atLive: Object.assign({}, goodLive, { u1: '다음축가 시작손 · 준비한 영상 상영 (영상은 디렉터가 튼다) 후' }) })],
    ['박수 줄이 안 나감', Object.assign({}, good, { after: IN })],
  ];
  for (const [nm, d] of sfakes) { const b = quiet(() => judgeDay(d, 'self', '깨 보기')); fail = 0; if (!b) { dead++; console.log('FAIL 깨 보기 «' + nm + '» — 빨강이 안 됐다'); } else console.log('ok   깨 보기 «' + nm + '» → 빨강 ' + b); }
  console.log(dead ? `\nMID17_CONSOLE selftest FAIL ${dead}` : '\nMID17_CONSOLE selftest OK');
  process.exit(dead ? 1 : 0);
}

judgeEngine(engine(live));

/* ── ② 콘솔 화면 ── */
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음(화면 검사 건너뜀)'); console.log(fail ? `\nMID17_CONSOLE FAIL ${fail}` : '\nMID17_CONSOLE OK(엔진만)'); process.exit(fail ? 1 : 2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.wav': 'audio/wav' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((res) => { srv.once('error', () => srv.listen(0, '127.0.0.1', res)); srv.listen(+(process.env.PORT || 8763), '127.0.0.1', res); });
const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function open(S0, width, guest) {
  const ctx = await br.newContext({ viewport: { width, height: 860 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; window.__playLog = []; });
  await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); return rt.fulfill({ status: 200, body: '{}' }); });
  await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S0)).toString('base64'))}${guest ? '&embed=1' : ''}`); await sleep(700);
  await pg.click(guest ? '#giGo' : '#go'); await sleep(500);
  return { ctx, pg, errs };
}
const view = (pg) => pg.evaluate(() => { const q = (s) => document.querySelector(s), h = q('#nHint'), b = q('#bWait'), nb = q('#nBlk');
  return Object.assign(window.__rr.st(), { name: q('#nName').textContent, txt: q('#nTxt').textContent, hintOn: h ? !h.hidden : false, hint: h ? h.textContent : '', bw: b ? b.disabled : null,
    u1: q('#u1') ? q('#u1').textContent : '', tags: Array.from(document.querySelectorAll('#nTag .pill')).map((e) => e.textContent), blk: nb && !nb.hidden ? nb.textContent : '', body: document.body.innerText }); });
async function until(pg, fn, ms) { const t0 = Date.now(); for (;;) { const v = await view(pg); if (fn(v)) return v; if (Date.now() - t0 > (ms || 40000)) return null; await sleep(80); } }
const cuesOf = (pg) => pg.evaluate(() => window.__rr.cues());

async function day(S0, width, shot) {
  const { ctx, pg, errs } = await open(S0, width);
  try {
    const cs = await cuesOf(pg), from = cs.findIndex((c) => c.k === 'midvid'), vi = cs.findIndex((c) => c.k === 'midvid' && c.live && c.rescue);
    await pg.evaluate((j) => window.__esd.fire(j), from);
    const atLive = await until(pg, (v) => v.cur === vi && v.phase === 'live');
    if (shot && atLive) await pg.screenshot({ path: shot });
    await pg.evaluate(() => window.__bgmGo.tap());
    const af = await until(pg, (v) => v.cur > vi, 8000);
    const log = await pg.evaluate(() => window.__playLog.slice());
    const after = af ? (await cuesOf(pg))[af.cur].slug : '';
    return { from, log, atLive, after, errs, vi };
  } finally { await ctx.close(); }
}
async function liveScreen(S0, k, width) {   // 영상 자리 화면(이름 · 글 · 힌트 · 단추)만 — 디지털 같음 대조용
  const { ctx, pg, errs } = await open(S0, width);
  try {
    const cs = await cuesOf(pg), vi = cs.findIndex((c) => c.k === k && c.live && c.rescue);
    await pg.evaluate((j) => window.__esd.fire(j), vi);
    const v = await until(pg, (x) => x.cur === vi && x.phase === 'live');
    return { v: v && { name: v.name, txt: v.txt, hint: v.hint, hintOn: v.hintOn, bw: v.bw, tags: v.tags }, errs };
  } finally { await ctx.close(); }
}
async function rescue(S0, width) {
  const { ctx, pg, errs } = await open(S0, width);
  try {
    const cs = await cuesOf(pg), vi = cs.findIndex((c) => c.k === 'midvid' && c.live && c.rescue);
    await pg.evaluate((j) => window.__esd.fire(j), vi);
    await until(pg, (x) => x.cur === vi && x.phase === 'live');
    await pg.click('#bWait'); await sleep(300);
    return { st: await view(pg), errs };
  } finally { await ctx.close(); }
}
async function guest(S0, width, shot) {
  const { ctx, pg, errs } = await open(S0, width, true);
  try {
    const cs = await cuesOf(pg), from = cs.findIndex((c) => c.k === 'midvid'), vi = cs.findIndex((c) => c.k === 'midvid' && c.live && c.rescue), oi = cs.findIndex((c) => c.k === 'midvid' && c.slug === OUT);
    await pg.evaluate((j) => window.__esd.fire(j), from);
    const a = await until(pg, (v) => v.cur === from && v.phase === 'clip');
    const c = await until(pg, (v) => v.cur === vi && v.phase === 'live');
    if (shot && c) await pg.screenshot({ path: shot });
    await pg.evaluate((j) => window.__esd.fire(j), oi);
    const b = await until(pg, (v) => v.cur === oi && v.phase === 'clip');
    return { a, b, c, errs };
  } finally { await ctx.close(); }
}

const SV = base({ midLen: '1' }), SP = withPv({ midLen: '1', pvEx: 2 });
for (const wd of [390, 360]) {
  try {
    const d2 = await day(SV, wd, SHOT && path.join(SHOT, `mid17-console-${wd}-video.png`)); judgeDay(d2, wd, '식중 영상 날');
    const d1 = await day(SP, wd, SHOT && path.join(SHOT, `mid17-console-${wd}-pv129.png`)); judgeDay(d1, wd, '식전 소개 129 날');
    const rs = await rescue(SV, wd);
    ok(`${wd} [재생 안 됨]을 누르면 미룬 순서 «식중 영상» · 쪽 오류 0`, JSON.stringify(rs.st.rescued) === '["식중 영상"]' && !rs.errs.length, [rs.st.rescued, rs.errs.slice(0, 2)]);
    const a = await liveScreen(withPv({ midLen: '1' }), 'midvid', wd), b = await liveScreen(withPv({ midLen: '1', digital: true }), 'midvid', wd);
    const c = await liveScreen(withPv({ midLen: '1' }), 'prevideo', wd), e = await liveScreen(withPv({ midLen: '1', digital: true }), 'prevideo', wd);
    ok(`${wd} 영상 자리 갈래 칩 — 식중 영상 = 식전 영상(«당일 직접» · «축사하시는 분» 아님)`, !!a.v && !!c.v && a.v.tags.filter((x) => /^당일 직접/.test(x)).join() === c.v.tags.filter((x) => /^당일 직접/.test(x)).join() && a.v.tags.indexOf('당일 직접') > -1, [a.v && a.v.tags, c.v && c.v.tags]);
    ok(`${wd} 디지털 참석 날 — 식중 영상 자리 화면 = 디지털 아닌 날 · 식전 영상 자리도 같다(둘 다 중계 처리 없음)`,
      !!a.v && !!c.v && JSON.stringify(a.v) === JSON.stringify(b.v) && JSON.stringify(c.v) === JSON.stringify(e.v) && ![a, b, c, e].some((x) => x.errs.length), [a.v, b.v && b.v.hint, c.v && c.v.hint, e.v && e.v.hint]);
  } catch (e) { ok(`${wd} 콘솔 화면 예외`, false, e && e.message); }
}
try {
  const g = await guest(SV, 390, SHOT && path.join(SHOT, 'mid17-console-390-guest.png'));
  const leak = (v) => !!v && /D-7|막히면|미리보기…|재생 안 됨/.test(v.name + v.txt + v.hint);
  ok('390 고객 미리 듣기 — 이름 «식중 영상 시작 · 1분» → 영상(«준비한 영상을 다 같이 봐요») → «식중 영상 마무리» · 블록 «식중 영상» · «준비한 순서» 없음 · 디렉터 글 안 보임 · 쪽 오류 0 [NARR_ROLE_1115]',
    !!g.a && !!g.b && !!g.c && g.a.name === '식중 영상 시작 · 1분' && /^식중 영상/.test(g.a.blk) && g.b.name === '식중 영상 마무리' && /준비한 영상을 다 같이 봐요/.test(g.c.txt)
    && ![g.a, g.b, g.c].some((v) => leak(v) || /준비한 순서/.test(v.name + v.blk)) && !g.errs.length, [g.a && [g.a.name, g.a.blk], g.b && g.b.name, g.c && [g.c.name, g.c.txt, g.c.hint], g.errs.slice(0, 2)]);
} catch (e) { ok('390 고객 미리 듣기 예외', false, e && e.message); }
await br.close(); srv.close();
console.log(fail ? `\nMID17_CONSOLE FAIL ${fail}` : '\nMID17_CONSOLE OK');
process.exit(fail ? 1 : 0);
