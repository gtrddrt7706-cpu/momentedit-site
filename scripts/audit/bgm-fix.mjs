#!/usr/bin/env node
/* ★★[BGM_FIX_1030 2026-10-30 BGM 섹션 · GPT(Ultra) 두 라운드 합의 · 사장님 «최선인지 판단해서 반영해 봐»] 구간 곡 새 목록 · 소리 다듬기
   A 곡 표(assets/bgm-picks.js · bgm-slots.js) — 표 그대로(27곡 · 10구간) · 곡 번호 B01 꼴 · 한 번호 = 한 파일이 여러 구간에서 쓰인다(B02 = 하객 맞이 · 축사)
     · 옛 번호(M2_1)는 «고르지 않음»(1순위로 준비 · 저장 꼴이 버린다) · 보컬 곡은 1순위가 아니다 · 곡 파일 주소 없음
   B 엔진(ritual-cue.js) — 미리 낮추기 0.8초 · vocalExtra −6 · musicTrim −3.1 · M4 사람이 말하는 자리 −20 · 덕담 음악 부풀리기 없음 ·
     반지 → 선언 = 4초에 −90 · 정적 2.5초 · 그 뒤 기본 사이 없음(gapNone) · 선언 여는 말 · 낭독 · 맺는 말 −90 · 박수 −8 을 1.5초에
   C 당일 콘솔(console.html · 실제로 띄워 duckTo · 음성 시작을 시각과 함께 잰다)
     1 반지 맺는 말 뒤 정적 2.5초(4.5초 아님) — 4초 내림이 시작한 뒤 6.5초에 선언 여는 말 · 사이에 −8 로 오르지 않는다
     2 선언 낭독 −90 · 맺는 말 박수와 함께 −8 을 1.5초에
     3 M4 사람 구간 −20(감사 인사)
     4 미리 낮추기 — GO 로 여는 큐 0.8초 · 박수 뒤 큐 1.5초 · 음성 대기 = 내림 시간
     5 뒤처리에 음악 단계가 있는 큐(편지 맺는 말) · 마지막 큐(귀가 인사) 뒤에는 −8 로 오르지 않는다
     6 맞절은 입장 곡이 잇는다(M4 로 안 바뀜) · 감사 인사부터 M4
     7 M6 = 닫는 인사 목례 · 박수부터(닫는 나레이션 동안은 앞 곡) · M7 = «위하여» 뒤 GO 에서 강조 위치부터 0.6초에 축배 크기
     8 보컬 곡(B04) 아래 나레이션 −22(−16 − 6) · 큐 사이 −8 은 그대로 · 한 파일을 하객 맞이에 넣으면 축사 칸에도 «있음»
     9 음악 전체 크기 — 리허설 musicTrim(−6 dB)이 «음악 볼륨» 막대 50 으로
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 · BF_CON / BF_CUE = 돌연변이 확인용(그 판의 console.html · ritual-cue.js 로 잰다 · 옛 판은 빨강) */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import os from 'node:os'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const CON = process.env.BF_CON || '', CUE = process.env.BF_CUE || '';
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 600)}`); if (!c) fail++; };

/* ── A 곡 표 ── */
const P = require(path.join(ROOT, 'assets/bgm-picks.js')), B = require(path.join(ROOT, 'assets/bgm-slots.js'));
const WANT = { M1: 'B01 B02 B03 B04', M2: 'B05 B06 B07 B30', M4: 'B09 B10 B11 B12', M4S5: 'B13 B14 B02 B16', M4S6: 'B10 B12 B14 B13', M5: 'B15 B06 B16 B11',
  M6: 'B17 B18 B19 B20', M7: 'B28 B29 B21 B22', M8: 'B23 B03 B24 B25', M8L: 'B26 B19 B27 B25' };
const VOCAL = ['B04', 'B20', 'B22', 'B25', 'B28', 'B29'];
const TITLES = { B01: '바다가 보이는 마을', B05: '인생의 회전목마', B09: 'Innocent in Sonatine', B13: 'Moon River', B28: 'Happy', B29: 'Best Day Of My Life', B30: '꽃바람 부는 길', B17: 'Summer Montage / Madeline', B21: "Herman's Habit", B23: '둘의 대화', B26: 'Bluebird', B27: 'At the Ivy Gate' };
{ const got = {}; Object.keys(WANT).forEach((s) => { got[s] = P.list(s).map((x) => x.f).join(' '); });
  ok('A1 곡 표 그대로 — 10구간 · 위가 1순위(2026-10-30 표)', Object.keys(WANT).every((s) => got[s] === WANT[s]), got);
  const ids = Object.keys(P.SONGS);
  ok('A1 곡 29 · 번호 B01 ~ B30 에서 B08 은 비움(다시 쓰지 않음) · 다 어딘가에 쓰인다 · 곡 이름 표와 같다', ids.length === 29 && !P.SONGS.B08 && ids.join() === Array.from({ length: 30 }, (_, i) => 'B' + String(i + 1).padStart(2, '0')).filter((f) => f !== 'B08').join() && ids.every((f) => Object.values(WANT).some((w) => w.split(' ').includes(f))) && Object.keys(TITLES).every((f) => P.SONGS[f].t === TITLES[f]), ids);
  ok('A1 사진 칸(M6P)은 비웠다 — 닫는 인사 곡이 잇는다', P.list('M6P').length === 0);
  const v = ids.filter((f) => P.SONGS[f].vocal);
  ok('A2 보컬 곡 = B04 · B20 · B22 · B25 · B28 · B29(vocal: true)', v.join() === VOCAL.join(), v);
  const first = Object.keys(P.PICKS).filter((s) => s !== 'M7' && P.list(s)[0] && P.list(s)[0].vocal);
  ok('A2 보컬 곡은 1순위가 아니다(축배 M7 만 예외 — GO 뒤에 시작해 나레이션 위로 크게 나오지 않는다 · 덧붙임 2)', !first.length && P.list('M7')[0].f === 'B28', first);
  const a = P.list('M1').find((x) => x.f === 'B02'), b = P.list('M4S5').find((x) => x.f === 'B02');
  ok('A3 한 번호 = 한 파일 — B02 가 하객 맞이 · 축사에 같은 번호 · 같은 곡 아이디(콘솔 파일도 한 번)', a && b && a.id === 'B02' && b.id === 'B02' && a.t === b.t);
  ok('A4 옛 번호(M2_1)는 «고르지 않음» — custK 빈칸 · 저장 꼴이 버린다 · 새 번호는 지킨다', P.custK({ bgm: { M2: { k: 'M2_1' } } }, 'M2') === '' && B.clean({ M2: { k: 'M2_1' } }) === undefined
    && P.custK({ bgm: { M2: { k: 'B06' } } }, 'M2') === 'B06' && JSON.stringify(B.clean({ M2: { k: 'B06' }, S5: { m: 'bed', k: 'M4S5_1' }, S6: { m: 'bed', k: 'B10' } })) === '{"S5":{"m":"bed"},"S6":{"m":"bed","k":"B10"},"M2":{"k":"B06"}}'
    && P.custK({ bgm: { M2: { k: 'B13' } } }, 'M2') === '');   // 다른 구간 곡 번호도 그 구간에서는 «고르지 않음»
  const src = fs.readFileSync(path.join(ROOT, 'assets/bgm-picks.js'), 'utf8').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');
  ok('A5 곡 파일 주소 없음(mp3 · http · drive · blob)', !/https?:|\.mp3|\.m4a|drive\.google|blob:/i.test(src));
  const gs = fs.readFileSync(path.join(ROOT, 'automation/platform/80_production.gs'), 'utf8');
  ok('A6 GAS — 드라이브 파일 이름 B01_… 을 받는다(BED_K_RE · 곡 번호 검사 B 꼴)', /BED_K_RE = \/\^\(B\\d\{2,3\}\)/.test(gs) && /\/\^B\\d\{2,3\}\$\/\.test\(k\)/.test(gs) && !/\^M\[0-9A-Z\]\{1,4\}_/.test(gs.slice(gs.indexOf('BED_ROOT_FOLDER'), gs.indexOf('REC_PUT_HASH')))); }

/* ── B 엔진 ── */
const O = require(path.join(ROOT, 'assets/ritual-open.js'));
const RC = CUE ? (() => { const D = require(path.join(ROOT, 'assets/ritual-data.js')); const m = { exports: {} }; new Function('module', 'exports', 'require', fs.readFileSync(CUE, 'utf8'))(m, m.exports, (x) => require(x.startsWith('./') ? path.join(ROOT, 'assets', x) : x)); return m.exports; })() : require(path.join(ROOT, 'assets/ritual-cue.js'));
const SOF = (ex, more) => { const S = O.applyExample({ course: 'open' }, ex); S.course = 'open'; S.on = Object.assign({}, S.on, { ring: 1, bless: 1 }); S.ring = 'on'; S.bless = 'on'; return Object.assign(S, more || {}); };
{ const PA = RC.PARAM;
  ok('B1 엔진 값 — 미리 낮추기 0.8초 · vocalExtra −6 · musicTrim −3.1 · 덕담 swellTo 없음', PA.duck.leadMs === 800 && PA.vocalExtra === -6 && PA.musicTrim === -3.1 && PA.bless.swellTo === undefined, { lead: PA.duck.leadMs, v: PA.vocalExtra, t: PA.musicTrim, b: PA.bless });
  const r = RC.build(SOF('standard'), { mode: 'console' }), C = (sl) => r.cues.find((c) => c.slug === sl), i = r.cues.findIndex((c) => c.slug === 'narr-ring-out');
  const ro = r.cues[i], di = r.cues[i + 1], dout = C('narr-declare-family-out');
  ok('B2 반지 맺는 말 뒤 — 4초에 −90 · 정적 2.5초 · 다음 선언 여는 말은 기본 사이 없음(gapNone)', ro && JSON.stringify(ro.post) === '[{"music":"to","v":-90,"ms":4000},{"wait":2500}]' && di && di.k === 'declare' && di.gapNone === true && di.fire === 'chain', { post: ro && ro.post, di: di && { k: di.k, gapNone: di.gapNone, fire: di.fire } });
  ok('B3 선언 — 여는 말 · 낭독 · 맺는 말 −90 · 박수 −8 을 1.5초에', di.duck === -90 && di.live && di.live.duck === -90 && dout.duck === -90 && dout.live && dout.live.duck === -8 && dout.live.upMs === 1500, { di: [di.duck, di.live && di.live.duck], dout: [dout.duck, dout.live] });
  const say = r.cues.filter((c) => /^(welcome|vow|bless)$/.test(c.k) && c.live && c.live.doing === 'say');
  ok('B4 M4 사람이 말하는 자리(감사 인사 · 서약 · 덕담) −20 · 덕담은 음악 부풀리기 없음', say.length >= 3 && say.every((c) => c.live.duck === -20) && say.every((c) => c.live.swellTo === undefined && c.live.swellMs === undefined), say.map((c) => [c.slug, c.live.duck, c.live.swellTo])); }

/* ── C 당일 콘솔 ── */
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
function wav(sec, f, ch = 1, sr = 16000) { const n = Math.round(sr * sec), b = Buffer.alloc(44 + n * 2 * ch); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2 * ch, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(ch, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2 * ch, 28); b.writeUInt16LE(2 * ch, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2 * ch, 40);
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) b.writeInt16LE(Math.round(6000 * Math.sin(2 * Math.PI * f * i / sr)), 44 + (i * ch + c) * 2); return b; }
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'bgmfix-')), F = {}; [['a', 330], ['b', 440], ['c', 550], ['d', 660]].forEach(([k, hz]) => { F[k] = path.join(TMP, k + '.wav'); fs.writeFileSync(F[k], wav(30, hz, 2)); });
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const p = (CON && u === '/console.html') ? CON : (CUE && u === '/assets/ritual-cue.js') ? CUE : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
async function open(S0, opt) { opt = opt || {};
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.addInitScript((reh) => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; try { if (reh) localStorage.setItem('me_bgm_reh_v1', JSON.stringify(reh)); } catch (e) {} }, opt.reh || null);
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: '{"ok":true}' })));
  await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S0)).toString('base64'))}`); await pg.waitForTimeout(700);
  for (const [sel, f] of (opt.files || [])) { await pg.setInputFiles(sel, f); await pg.waitForTimeout(250); }
  if (opt.before) await opt.before(pg);
  await pg.click('#go'); await pg.waitForTimeout(400);
  await pg.evaluate(() => { window.__L = window.__bgmLog = [];
    document.getElementById('aNarr').addEventListener('play', () => window.__L.push({ t: Math.round(performance.now()), play: (document.getElementById('aNarr').getAttribute('src') || '').split('/').pop() })); });
  return { ctx, pg, errs };
}
const idx = (pg, slug) => pg.evaluate((s) => window.__bgmR().findIndex((c) => c.slug === s), slug);
const st = (pg) => pg.evaluate(() => window.__bgmSt());
const L = (pg) => pg.evaluate(() => window.__L.slice());
const segSt = (pg) => pg.evaluate(() => window.__seg.st());
const waitFn = (pg, fn, arg, ms) => pg.waitForFunction(fn, arg, { timeout: ms || 60000 }).then(() => true, () => false);
const row = (seg, n) => `.sg[data-seg="${seg}"] .sg-song:nth-of-type(${n}) [data-seg-file]`;
try {
  const probe = await open(SOF('standard'));
  if (!(await probe.pg.evaluate(() => typeof window.__bgmSt === 'function' && !!window.__bgmGo && !!window.__seg))) { ok('콘솔 점검 고리가 있다', false, '없음'); throw new Error('hook'); }
  await probe.ctx.close();

  /* 1 · 2 반지 → 선언 */
  { const { ctx, pg, errs } = await open(SOF('standard'));
    const ir = await idx(pg, 'narr-ring-out'), id = await idx(pg, 'narr-declare-in-friend');
    await pg.evaluate((i) => window.__bgmGo.fire(i), ir);
    const got = await waitFn(pg, () => window.__L.some((x) => x.play && /declare-in-friend/.test(x.play)), null, 40000);
    const Ls = await L(pg), d90 = Ls.find((x) => x.db === -90 && x.ms === 4000), pd = Ls.find((x) => x.play && /declare-in-friend/.test(x.play));
    const gap = d90 && pd ? pd.t - d90.t : null, mid = Ls.filter((x) => d90 && pd && x.t > d90.t && x.t < pd.t && x.db !== undefined);
    ok(`C1 반지 맺는 말 뒤 4초 내림 → 정적 2.5초 → 선언 여는 말(${gap} ms · 6.5초 · 종전 8.5초) · 사이에 −8 없음`, got && id === ir + 1 && gap != null && gap > 6200 && gap < 7300 && !mid.some((x) => x.db > -90), { gap, mid });
    const live = await waitFn(pg, (j) => window.__bgmSt().cur === j && window.__bgmSt().phase === 'live', id, 40000);
    const A = await st(pg);
    ok('C2 선언 낭독 동안 −90', live && A.want === -90, A);
    await pg.evaluate(() => { window.__L.length = 0; }); await pg.evaluate(() => window.__bgmGo.tap());
    const lv2 = await waitFn(pg, (j) => window.__bgmSt().cur === j + 1 && window.__bgmSt().phase === 'live', id, 40000);
    const L2 = await L(pg), up = L2.filter((x) => x.db === -8);
    ok('C2 선언 맺는 말(−90) 뒤 박수와 함께 −8 을 1.5초에', lv2 && L2.some((x) => x.db === -90) && up.length >= 1 && up[0].ms === 1500, L2.filter((x) => x.db !== undefined));
    /* 4 박수 뒤 큐 — 1.5초 내림 · 음성은 1.5초 뒤 */
    await pg.evaluate(() => { window.__L.length = 0; }); await pg.evaluate(() => window.__bgmGo.tap());
    await waitFn(pg, () => window.__L.some((x) => x.play), null, 20000);
    const L4 = await L(pg); ok('C4 박수 뒤 큐(감사 박수 이음말 −8)는 크기가 같아 낮추지 않는다 · 음성 바로', !L4.some((x) => x.db !== undefined && x.db < -8 && x.ms === 1500), L4.slice(0, 3));
    ok('C 쪽 오류 0(반지 → 선언)', !errs.length, errs.slice(0, 2)); await ctx.close(); }

  /* 3 · 4 · 6 감사 인사 · 미리 낮추기 · 맞절 */
  { const { ctx, pg, errs } = await open(SOF('standard'), { files: [[row('M4', 1), F.a], [row('M2', 1), F.b]] });
    /* 6 맞절 — 화촉 곡(M2)에서 맞절을 쏴도 M4 로 바뀌지 않는다 · 감사 인사에서 M4 */
    const ic = await idx(pg, 'narr-candle-in-mothers'); await pg.evaluate((i) => window.__bgmGo.fire(i), ic); await pg.waitForTimeout(500);
    const ib = await idx(pg, 'narr-entry-bow'); await pg.evaluate((i) => window.__bgmGo.fire(i), ib); await pg.waitForTimeout(600);
    const s6 = await segSt(pg);
    ok('C6 맞절 — 구간이 M4 로 바뀌지 않는다(입장 곡 · 앞 곡이 잇는다)', s6.seg !== 'M4', s6.seg);
    /* 4 GO 로 여는 큐 — −8 상태에서 서약 여는 말(−16): 0.8초 내림 · 음성 0.8초 뒤 */
    const iv = await idx(pg, 'narr-vow-in'); await pg.evaluate(() => { window.__bgmGo.duck(-8, 10); }); await pg.waitForTimeout(200); await pg.evaluate(() => { window.__L.length = 0; });
    await pg.evaluate((i) => window.__bgmGo.fire(i), iv); await waitFn(pg, () => window.__L.some((x) => x.play), null, 20000);
    const L4 = await L(pg), d4 = L4.find((x) => x.db === -16), p4 = L4.find((x) => x.play), lead4 = d4 && p4 ? p4.t - d4.t : null;
    ok(`C4 GO 로 여는 큐(−8 → 서약 −16) — 0.8초에 내리고 음성은 그 뒤(${lead4} ms)`, d4 && d4.ms === 800 && lead4 != null && lead4 >= 760 && lead4 <= 1150, { d4, lead4 });
    const s4 = await segSt(pg); ok('C6 감사 인사 · 서약 쪽에서는 M4', s4.seg === 'M4', s4.seg);
    /* 3 M4 사람 구간 −20 */
    const lv = await waitFn(pg, (j) => window.__bgmSt().cur === j && window.__bgmSt().phase === 'live', iv, 40000); const A3 = await st(pg);
    ok('C3 서약 사람 구간 −20(낭독 아래)', lv && A3.want === -20, A3);
    /* 4 박수 뒤 큐(편지 낭독 −90 · fadeMs 1.5초) — −8 상태에서 1.5초 내림 · 음성 1.5초 뒤 */
    const S2 = SOF('standard', { on: Object.assign({}, SOF('standard').on, { letter: 1 }) }); await ctx.close();
    const o2 = await open(S2); const il = await idx(o2.pg, 'letter-each');
    if (il < 0) ok('C4 편지 낭독 큐가 있다', false, await o2.pg.evaluate(() => window.__bgmR().map((c) => c.slug)));
    else { const fm = await o2.pg.evaluate((i) => window.__bgmR()[i], il);
      await o2.pg.evaluate(() => { window.__bgmGo.duck(-8, 10); }); await o2.pg.waitForTimeout(200); await o2.pg.evaluate(() => { window.__L.length = 0; });
      await o2.pg.evaluate((i) => window.__bgmGo.fire(i), il); await waitFn(o2.pg, () => window.__L.some((x) => x.play), null, 20000);
      const L5 = await L(o2.pg), d5 = L5.find((x) => x.db === -90), p5 = L5.find((x) => x.play), lead5 = d5 && p5 ? p5.t - d5.t : null;
      ok(`C4 박수 뒤 큐(편지 −90) — 1.5초에 내리고 음성은 그 뒤(${lead5} ms)`, d5 && d5.ms === 1500 && lead5 != null && lead5 >= 1450 && lead5 <= 1850, { d5, lead5, fm });
      /* 5 뒤처리에 음악 단계가 있는 큐(편지 맺는 말) 뒤 −8 로 오르지 않는다 */
      const ie = await idx(o2.pg, 'narr-letter-end'); await o2.pg.evaluate(() => { window.__L.length = 0; }); await o2.pg.evaluate((i) => window.__bgmGo.fire(i), ie);
      await waitFn(o2.pg, (j) => window.__bgmSt().cur === j && window.__bgmSt().phase === 'done', ie, 40000); await o2.pg.waitForTimeout(800);
      const L6 = await L(o2.pg);
      ok('C5 편지 맺는 말(뒤처리 −16 4초) 뒤 −8 로 오르지 않는다', L6.some((x) => x.db === -16 && x.ms === 4000) && !L6.some((x) => x.db === -8), L6.filter((x) => x.db !== undefined));
      /* 5 마지막 큐(귀가 인사) — 긴 뒤처리를 비우고 잰다 */
      const n = await o2.pg.evaluate(() => window.__bgmR().length), last = n - 1, ls = await o2.pg.evaluate((i) => window.__bgmR()[i].slug, last);
      if (!(await o2.pg.evaluate(() => typeof window.__bgmGo.post === 'function'))) ok('C5 마지막 큐 — 점검 고리(__bgmGo.post)가 있다', false, '없음 — 옛 판');
      else { await o2.pg.evaluate((i) => window.__bgmGo.post(i, []), last); await o2.pg.evaluate(() => { window.__L.length = 0; }); await o2.pg.evaluate((i) => window.__bgmGo.fire(i), last);
        await waitFn(o2.pg, () => ['done', 'end'].includes(window.__bgmSt().phase), null, 40000); await o2.pg.waitForTimeout(600);
        const L7 = await L(o2.pg);
        ok(`C5 마지막 큐(${ls}) 뒤 −8 로 오르지 않는다`, ls === 'end-2-goodbye' && !L7.some((x) => x.db === -8), L7.filter((x) => x.db !== undefined)); } }
    ok('C 쪽 오류 0(감사 인사 · 편지)', !errs.length && !o2.errs.length, errs.concat(o2.errs).slice(0, 2)); await o2.ctx.close(); }

  /* 7 · 8 닫는 인사 · 축배 · 보컬 · 한 파일 */
  { const S = SOF('record');
    const { ctx, pg, errs } = await open(S, { files: [[row('M1', 4), F.a], [row('M1', 2), F.d], [row('M5', 1), F.b], [row('M6', 1), F.c], [row('M7', 1), F.d]],
      before: async (p) => { await p.fill('[data-seg-start="B28"]', '5'); await p.dispatchEvent('[data-seg-start="B28"]', 'change'); } });
    const shared = await pg.evaluate(() => { const r = [...document.querySelectorAll('.sg[data-seg="M4S5"] .sg-song')].find((x) => /Day and Age/.test(x.textContent)); return r ? { st: r.querySelector('.sg-st').textContent, lab: r.querySelector('.filebtn').textContent } : null; });
    ok('C8 한 파일 — 하객 맞이 B02 에 넣은 파일이 축사 «음악과 함께» B02 칸에도 «있음»(곡 아이디 = 번호)', shared && /^✓/.test(shared.st) && shared.lab === '파일 바꾸기', shared);
    /* 하객 맞이 = B04(노래) · B02 — 첫 곡이 B02 면 B04 차례까지 가지 않는다 → 하객 맞이 칸에서 B04 하나만 고른다 */
    await ctx.close(); }
  { const S = SOF('record');
    const { ctx, pg, errs } = await open(S, { files: [[row('M1', 4), F.a], [row('M5', 1), F.b], [row('M6', 1), F.c], [row('M7', 1), F.d]],
      before: async (p) => { await p.fill('[data-seg-start="B28"]', '5'); await p.dispatchEvent('[data-seg-start="B28"]', 'change'); } });
    const s0 = await segSt(pg);
    const ig = await idx(pg, 'guest-1-arrival'); await pg.evaluate(() => { window.__L.length = 0; }); await pg.evaluate((i) => window.__bgmGo.fire(i), ig); await pg.waitForTimeout(500);
    const L8 = await L(pg), g8 = L8.find((x) => x.db === -16);
    ok('C8 보컬 곡(B04) 아래 나레이션 −22(−16 − 6)', s0.seg === 'M1' && s0.id === 'B04' && g8 && g8.eff === -22, { s0: { seg: s0.seg, id: s0.id }, g8 });
    await pg.evaluate(() => { window.__L.length = 0; window.__bgmGo.duck(-8, 10); }); await pg.waitForTimeout(100); const L8b = await L(pg);
    ok('C8 보컬 곡이어도 큐 사이 −8 은 그대로', L8b.some((x) => x.db === -8 && x.eff === -8), L8b);
    /* 7 닫는 인사 — 나레이션 동안 앞 곡(부모님께 인사 M5) · 목례 · 박수부터 M6 */
    const it = await idx(pg, 'tribute-out'); await pg.evaluate((i) => window.__bgmGo.fire(i), it); await pg.waitForTimeout(400);
    const ik = await idx(pg, 'narr-close-bow'); await pg.evaluate((i) => window.__bgmGo.fire(i), ik); await pg.waitForTimeout(500);
    const k1 = await segSt(pg); const lvk = await waitFn(pg, (j) => window.__bgmSt().cur === j && window.__bgmSt().phase === 'live', ik, 40000); await pg.waitForTimeout(300); const k2 = await segSt(pg);
    ok('C7 닫는 인사 — 나레이션 동안은 앞 곡(M5) · 목례 · 박수(사람 순간)부터 M6', k1.seg === 'M5' && lvk && k2.seg === 'M6', { k1: k1.seg, k2: k2.seg });
    /* 7 축배 — 축배 나레이션 동안 M6 이 잇는다 · «위하여» 뒤 GO 에서 M7(B28) 강조 위치 5초부터 · 0.6초에 0 */
    const ix = await idx(pg, 'toast-toast'); await pg.evaluate((i) => window.__bgmGo.fire(i), ix); await pg.waitForTimeout(500); const x1 = await segSt(pg);
    const lvx = await waitFn(pg, (j) => window.__bgmSt().cur === j && window.__bgmSt().phase === 'live', ix, 40000); const x2 = await segSt(pg);
    await pg.evaluate(() => { window.__L.length = 0; }); await pg.evaluate(() => window.__bgmGo.tap()); await pg.waitForTimeout(200);
    const x3 = await segSt(pg), pos = await pg.evaluate(() => { const s = window.__seg.st(); return document.querySelectorAll('audio')[0] ? [...document.querySelectorAll('#aBgm,#aBgm2')].map((a) => a.currentTime) : null; }), L9 = await L(pg);
    ok('C7 축배 — 나레이션 · «위하여» 동안은 M6 · GO 에서 M7(B28)', x1.seg === 'M6' && lvx && x2.seg === 'M6' && x3.seg === 'M7' && x3.id === 'B28', { x1: x1.seg, x2: x2.seg, x3: [x3.seg, x3.id] });
    ok('C7 축배 곡은 강조 위치(5초)부터 · 0.6초에 축배 크기(0)', pos && pos[x3.on] >= 4.9 && pos[x3.on] < 6.5 && L9.some((x) => x.db === 0 && x.ms === 600), { pos, on: x3.on, L9: L9.filter((x) => x.db !== undefined) });
    ok('C 쪽 오류 0(닫는 인사 · 축배 · 보컬)', !errs.length, errs.slice(0, 2)); await ctx.close(); }

  /* 9 음악 전체 크기 */
  { const a = await open(SOF('brief')); const v0 = await a.pg.evaluate(() => document.getElementById('vol').value); await a.ctx.close();
    const b = await open(SOF('brief'), { reh: { cur: 'T', prof: { T: { musicTrim: -6 } } } }); const v1 = await b.pg.evaluate(() => document.getElementById('vol').value); await b.ctx.close();
    ok('C9 음악 전체 크기 — 기본 −3.1 dB = 막대 70 · 리허설 −6 dB = 막대 50', v0 === '70' && v1 === '50', { v0, v1 }); }
} catch (e) { if (e.message !== 'hook') ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 500)); }
await br.close(); srv.close(); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
console.log(fail ? `BGM FIX FAIL ${fail}` : 'BGM FIX OK'); process.exit(fail ? 1 : 0);
