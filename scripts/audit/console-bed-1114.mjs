#!/usr/bin/env node
/* ★★[CONSOLE_BED_1114 2026-11-14 BGM 섹션 · GPT 라운드 1 콘솔 쪽 검증에서 재현된 것] 당일 콘솔(console.html) 구간 곡 재생기 검사 — console-relift.mjs 와 같은 하네스 방식
   A [LIST_OPEN_ONCE_1114] 목록 곡 끝 — 다음 곡이 늦게 열려도(play() 400ms 늦춤) 감시기는 한 번만 요청한다 · 다음 곡 = 목록 바로 다음 곡 · 상태 줄 없음 ·
     여는 중에 디렉터 GO(화촉 큐)가 오면 화촉 곡이 이긴다(DETAIL_R3_1101 ③ «마지막 요청이 이긴다» 그대로 · 옛 판은 감시기가 그 요청까지 취소해 화촉 구간인데 하객 맞이 곡이 남았다)
   B [TABLE_BORROW_PLAY_1114] 테이블 인사(M8) — 곡 파일이 다 있는 날 콘솔이 실제로 트는 목록(__segPlan · 테이블 GO 뒤 BED.list) = 계획 목록(BgmPicks.plan 을 미리 듣기 playOrd 와 같은 꼴로 부른 것 · have · heard · now · seg) ·
     빌려 온 곡이 남고 합이 30분(NEED.M8) 이상 · 설정 화면 곡 칩은 제 곡만 · 이어 트는 칸(M4 · M6 · M8L)은 빠짐 0 · 미리 듣기 쪽 줄(lfNext = playOrd.filter(has))도 그대로
   C [HEARD_RESET_1114] 같은 탭에서 «■ 나가기 → 시작» — 앞 판의 들린 곡 기록(20초 넘게 들린 곡)이 0 · 음악만 멈춤 → 다시 · 전체 정지 → GO 는 기록 그대로
   D [BED_BAD_RESET_1114] 못 연 곡 표시(BED.bad) — 깨진 파일을 멀쩡한 파일로 바꿔 넣으면 그 곡 표시가 지워지고 제 차례에 다시 흐른다 · «■ 나가기 → 시작» 뒤에는 표시가 0
   깨 보기: BP_CON=<옛 console.html> 로 돌리면 고친 줄마다 빨강이어야 한다(각 칸 머리에 적음) · ONLY=A 처럼 칸을 골라 돌릴 수 있다
   곡 = 시험 사인파(곡마다 다른 높이) · 나레이션 = 0.6초 짧은 소리 · 큐는 손으로 낸다(__bgmGo.fire) · 읽는 창구 = __seg.st · __segPlan · __heard(점검용)
   ROOT = 저장소 뿌리(이 파일이 scripts/audit/ 에 있으면 저절로 · 밖에 두면 CONBED_ROOT 로) · 종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = process.env.CONBED_ROOT || path.join(HERE, '..', '..');
const CON = process.env.BP_CON || '', ONLY = String(process.env.ONLY || '').toUpperCase(), want = (k) => !ONLY || ONLY.indexOf(k) > -1;
if (!fs.existsSync(path.join(ROOT, 'console.html'))) { console.log('못 쟀다 — console.html 이 없다(CONBED_ROOT 를 저장소 뿌리로): ' + ROOT); process.exit(2); }
let pw = null; for (const p of ['playwright', path.join(process.env.NODE_PATH || '', 'playwright'), '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const O = require(path.join(ROOT, 'assets/ritual-open.js')); const P = require(path.join(ROOT, 'assets/bgm-picks.js'));
let fail = 0, cant = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 700)}`); if (!c) fail++; };
const skip = (m) => { console.log('못 쟀다 — ' + m); cant++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
/* 시험 곡 — 16비트 사인파(짧은 곡) · 8비트 4kHz 사인파(실제 길이 240초 안팎 곡 · 파일을 작게) · 못 여는 파일(소리가 아닌 글자) */
function wav(sec, f, sr = 8000) { const n = Math.round(sr * sec), b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(f ? 8000 * Math.sin(2 * Math.PI * f * i / sr) : 0), 44 + i * 2); return b; }
function wav8(sec, f, sr = 4000) { const n = Math.round(sr * sec), b = Buffer.alloc(44 + n); b.write('RIFF', 0); b.writeUInt32LE(36 + n, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr, 28); b.writeUInt16LE(1, 32); b.writeUInt16LE(8, 34); b.write('data', 36); b.writeUInt32LE(n, 40);
  for (let i = 0; i < n; i++) b[44 + i] = 128 + Math.round(40 * Math.sin(2 * Math.PI * f * i / sr)); return b; }
const BADFILE = Buffer.from('this is not audio at all, just bytes. '.repeat(40));
const SHORT = wav(0.6, 330, 16000);   /* 나레이션 대신 — 0.6초 */
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
  if (/^\/assets\/audio\/narration\/.+\.mp3$/.test(u)) { r.writeHead(200, { 'Content-Type': 'audio/wav' }); r.end(SHORT); return; }
  const p = (CON && u === '/console.html') ? CON : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'conbed-'));
/* 늦게 열림 흉내 — 배경 재생기(aBgm · aBgm2 · aBgm3)의 play() 를 __slowMs 만큼 늦춘다 · 그사이 pause() 가 오면 실제 브라우저처럼 AbortError */
const SLOW = () => { const op = HTMLMediaElement.prototype.play, ps = HTMLMediaElement.prototype.pause; window.__slowMs = 0;
  HTMLMediaElement.prototype.play = function () { const el = this, ms = window.__slowMs || 0; if (!/^aBgm/.test(el.id || '') || !ms) return op.call(el);
    el.__tk = (el.__tk || 0) + 1; const tk = el.__tk; return new Promise((res, rej) => { setTimeout(() => { if (el.__tk !== tk) { rej(new DOMException('aborted by pause', 'AbortError')); return; } op.call(el).then(res, rej); }, ms); }); };
  HTMLMediaElement.prototype.pause = function () { this.__tk = (this.__tk || 0) + 1; return ps.call(this); }; };
/* 콘솔 열기 — ex = 예시 코스 · files = [[곡 번호, 파일 내용(Buffer), 확장자]] 를 설정 화면 «파일 넣기» 칸에 넣는다 */
const S0of = (ex) => { const S = O.applyExample({ course: 'open' }, ex || 'standard'); S.course = 'open'; S.bgm = {}; return S; };
async function open(ex, files, init) {
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); await ctx.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; }); if (init) await ctx.addInitScript(init);
  const pg = await ctx.newPage(), errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: '{"ok":true}' })));
  const S = S0of(ex); await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S)).toString('base64'))}`); await pg.waitForTimeout(900);
  let put = 0; for (const [sid, buf, ext] of files) { const p = path.join(TMP, sid + '-' + put + (ext || '.wav')); fs.writeFileSync(p, buf); try { await pg.locator(`[data-seg-file="${sid}"]`).first().setInputFiles(p, { timeout: 6000 }); put++; } catch {} await pg.waitForTimeout(100); }
  await pg.waitForTimeout(1000);
  const c = { ctx, pg, errs, S, put, need: files.length,
    start: async () => { await pg.click('#go'); await pg.waitForTimeout(600); return pg.evaluate(() => (typeof window.__bgmR === 'function' ? window.__bgmR() : null)); },
    fire: (i) => pg.evaluate((i) => window.__bgmGo.fire(i), i), seg: () => pg.evaluate(() => window.__seg.st()),
    playing: (sg, ms) => pg.waitForFunction((sg) => { const s = window.__seg.st(); return s.seg === sg && s.id && !s.opening && !s.paused[s.on]; }, sg, { timeout: ms || 15000 }).then(() => true, () => false),
    /* 지금 곡 재생기를 «곡 끝 − back 초» 자리로 */
    nearEnd: (back) => pg.evaluate((back) => { const s = window.__seg.st(), el = document.getElementById(['aBgm', 'aBgm2', 'aBgm3'][s.on]); el.currentTime = Math.max(0, el.duration - back); return { id: s.id, dur: el.duration, plays: s.plays, list: s.list, li: s.li }; }, back),
    /* ms 동안 0.04초마다 재생기 상태를 적는다 */
    watch: (ms) => pg.evaluate((ms) => new Promise((res) => { const o = [], t0 = performance.now(), iv = setInterval(() => { const s = window.__seg.st(); o.push({ t: Math.round(performance.now() - t0), id: s.id, op: s.opening, plays: s.plays, li: s.li, err: s.err, seg: s.seg }); if (performance.now() - t0 > ms) { clearInterval(iv); res(o); } }, 40); }), ms) };
  return c;
}
const hooks = (c) => c.pg.evaluate(() => typeof window.__bgmR === 'function' && !!window.__bgmGo && !!window.__seg && typeof window.__segPlan === 'function' && typeof window.__heard === 'function');
try {
  /* ── A [LIST_OPEN_ONCE_1114] — 옛 판: 9초에 요청 24회 · 목록 곡 둘을 건너뜀 · 디렉터 GO 로 연 화촉 곡까지 감시기가 취소(① ② ④ 빨강) ── */
  if (want('A')) {
    const files = ['B01', 'B24', 'B13', 'B33', 'B05'].map((f, i) => [f, wav(40, 200 + i * 40)]);
    const c = await open('standard', files, SLOW); const R = await c.start();
    if (!R || !(await hooks(c)) || c.put < c.need) skip('A — 콘솔 점검 고리가 없거나 곡 파일 칸을 못 찾았다(넣은 곡 ' + c.put + '/' + c.need + ')');
    else {
      const iG = R.findIndex((x) => x.k === 'guest'), iC = R.findIndex((x) => x.k === 'candle'); await c.fire(iG);
      const p0 = await c.playing('M1'); await c.pg.waitForTimeout(3600);   /* 첫 겹침(3초)이 끝날 때까지 */
      const X = P.xfOf('M1'); await c.pg.evaluate(() => { window.__slowMs = 400; });
      const s0 = await c.nearEnd(X + 1.5), o = await c.watch(9000), last = o[o.length - 1];
      const rA = { 목록: s0.list, 지금곡: s0.id, 요청: last.plays - s0.plays, 여는중이던곡: [...new Set(o.map((x) => x.op).filter(Boolean))], 끝곡: last.id, 상태줄: [...new Set(o.map((x) => x.err).filter(Boolean))] };
      console.log('  재 본 값 A', JSON.stringify(rA));
      if (!p0 || iG < 0 || iC < 0 || s0.list.length < 4 || o.length < 100) skip('A — 준비(하객 맞이 곡 틀기 · 목록 4곡 · 표본)가 안 됐다 ' + JSON.stringify({ p0, iG, iC, n: o.length, list: s0.list }));
      else {
        const nx = s0.list[(s0.li + 1) % s0.list.length];
        ok('A ① 다음 곡이 0.4초 늦게 열려도 감시기 요청은 한 번(여는 중에는 다시 요청하지 않는다) [LIST_OPEN_ONCE_1114]', rA.요청 === 1, rA);
        ok('A ② 다음 곡 = 목록 바로 다음 곡(건너뛰지 않는다) · 여는 중이던 곡도 그 곡 하나', rA.끝곡 === nx && rA.여는중이던곡.join() === nx, Object.assign({ 기대: nx }, rA));
        ok('A ③ 상태 줄 없음(거짓 «다음 곡을 열지 못해» 없음)', !rA.상태줄.length, rA);
        /* 여는 중(1.5초 늦춤)에 디렉터 GO(화촉 큐) → 화촉 곡이 이긴다 · 그 화촉 곡을 여는 동안에도 감시기는 끼어들지 않는다 */
        await c.pg.waitForFunction(() => { const s = window.__seg.st(); return !s.opening && !s.paused[s.on]; }, null, { timeout: 8000 }).catch(() => {});
        await c.pg.evaluate(() => { window.__slowMs = 1500; }); const s1 = await c.nearEnd(X + 1.0);
        const op = await c.pg.waitForFunction((id) => { const s = window.__seg.st(); return s.opening && s.opening !== id; }, s1.id, { timeout: 6000 }).then(() => true, () => false);
        await c.pg.waitForTimeout(300); await c.fire(iC);
        const won = await c.pg.waitForFunction(() => { const s = window.__seg.st(); return s.seg === 'M2' && s.id === 'B05' && !s.opening; }, null, { timeout: 9000 }).then(() => true, () => false); const s2 = await c.seg();
        ok('A ④ 다음 곡을 여는 중에 디렉터 GO(화촉 큐)가 오면 화촉 곡이 이긴다(마지막 요청이 이긴다 · DETAIL_R3_1101 ③) · 감시기가 그 요청을 취소하지 않는다', op && won, { 여는중이었나: op, 구간: s2.seg, 곡: s2.id, 여는중: s2.opening });
      }
      ok('A 쪽 오류 0', !c.errs.length, c.errs.slice(0, 3));
    }
    await c.ctx.close();
  }
  /* ── B [TABLE_BORROW_PLAY_1114] — 옛 판: 계획 7곡 31분 → 콘솔 3곡 13분(① ② ③ 빨강) ── */
  if (want('B')) {
    const ids = [...new Set([].concat(...Object.values(P.PICKS), ...Object.values(P.FILL)))];
    /* 곡 길이를 실제처럼 — 원곡 길이(len)를 아는 곡은 그보다 2초 긴 파일 · 모르는 곡은 240초(LEN0) → 계획이 세는 길이가 미리 듣기(길이 모름 = len · LEN0)와 같아진다 */
    const files = ids.map((f, i) => [f, wav8(P.SONGS[f] && P.SONGS[f].len ? Math.ceil(P.SONGS[f].len) + 2 : P.LEN0, 180 + i * 12)]);
    const c = await open('record', files); await c.pg.waitForTimeout(2500); const R = await c.start(); const it = R ? R.findIndex((x) => x.k === 'table') : -1;
    const durs = await c.pg.evaluate((ids) => ids.map((f) => { const e = document.querySelector('[data-seg-st="' + f + '"]'); return e ? e.textContent : ''; }), ids);
    if (!R || !(await hooks(c)) || c.put < c.need || it < 0 || durs.some((t) => !/· \d+:\d\d/.test(t))) skip('B — 콘솔 점검 고리 · 테이블 인사 큐가 없거나 곡 파일(길이 재기)이 덜 됐다(넣은 곡 ' + c.put + '/' + c.need + ' · 길이 잰 곡 ' + durs.filter((t) => /· \d+:\d\d/.test(t)).length + ')');
    else {
      /* 들린 기록 — 하객 맞이 3곡 · 화촉 · 본식 2곡 · 부모님께 인사(가장 흔한 꼴) · 넣기 · 읽기 · 테이블 GO 를 한 번에(그사이 감시기가 기록을 건드리지 않게) */
      const H = { B01: [-3300, 'M1', 240, -3060], B24: [-3060, 'M1', 240, -2820], B13: [-2820, 'M1', 238, -2580], B05: [-2500, 'M2', 130, -2370], B09: [-1900, 'M4', 118, -1700], B10: [-1500, 'M4', 200, -900], B15: [-400, 'M5', 200, -100] };
      const r = await c.pg.evaluate(([H, it]) => { const n = performance.now() / 1000, h = {}; Object.keys(H).forEach((f) => { h[f] = { t0: n + H[f][0], seg: H[f][1], sec: H[f][2], last: n + H[f][3], lseg: H[f][1] }; }); window.__heardSet(h);
        const o = { now: n, heard: h, M8: window.__segPlan('M8', ''), M4: window.__segPlan('M4', ''), M6: window.__segPlan('M6', ''), M8L: window.__segPlan('M8L', ''), chip: window.__segSel('M8') };
        window.__bgmGo.fire(it); const s = window.__seg.st(); o.bed = { seg: s.seg, list: s.list }; return o; }, [H, it]);
      const ks = new Set(R.map((x) => x.k)), S = c.S;
      const on = (id) => { let d = P.seg(id); if (d && id === 'M8L' && !d.ks) d = Object.assign({}, d, { ks: ['_goodbye'] }); if (!d || !d.ks) return false; if (d.slot && !(S.bgm && S.bgm[d.slot] && S.bgm[d.slot].m === 'bed')) return false; return d.ks.some((k) => ks.has(k)); };   /* 콘솔 segOnC 와 같은 판정 */
      const have = (f) => ids.indexOf(f) > -1, planOf = (sg, hd) => ((P.plan(S, hd ? { on, have, heard: r.heard, now: r.now, seg: sg } : { on, have })[sg] || {}).list || []);
      const exp = planOf('M8', true), own = new Set((P.PICKS.M8 || []).concat(P.FILL.M8 || [])), sum = (L) => Math.round((L || []).reduce((a, f) => a + (P.lenOf(f, 0) || P.LEN0), 0));
      const rB = { 계획: exp, 콘솔: r.M8, 빠진곡: exp.filter((f) => (r.M8 || []).indexOf(f) < 0), 빌려온곡: (r.M8 || []).filter((f) => !own.has(f)), 합초: sum(r.M8), 필요초: P.NEED.M8, GO뒤: r.bed, 칩: r.chip };
      console.log('  재 본 값 B', JSON.stringify(rB));
      if (exp.length < 4 || !exp.some((f) => !own.has(f))) skip('B — 계획에 빌려 온 곡이 없다(자료가 바뀌었나) ' + JSON.stringify(exp));
      else {
        ok('B ① 콘솔이 트는 테이블 인사 목록 = 계획 목록(빌려 온 곡이 재생 직전에 빠지지 않는다 · 미리 듣기와 같은 목록) [TABLE_BORROW_PLAY_1114]', (r.M8 || []).join() === exp.join(), rB);
        ok('B ② 빌려 온 곡이 남고 합이 30분 이상', rB.빌려온곡.length > 0 && rB.합초 >= P.NEED.M8, rB);
        ok('B ③ 테이블 인사 GO 뒤 실제 목록(BED.list)도 같은 목록', r.bed.seg === 'M8' && r.bed.list.join() === exp.join(), rB);
        ok('B ④ 설정 화면 곡 칩(__segSel)은 종전대로 제 곡만', (r.chip || []).length > 0 && r.chip.every((f) => own.has(f)), rB);
        const loop = ['M4', 'M6', 'M8L'].map((sg) => { const pl = planOf(sg, !!(P.REPLAN && P.REPLAN[sg])); return { sg, 계획: pl.length, 콘솔: (r[sg] || []).length, 빠진곡: pl.filter((f) => (r[sg] || []).indexOf(f) < 0) }; });
        ok('B ⑤ 이어 트는 칸(M4 · M6 · M8L)은 그대로 — 계획 곡이 하나도 빠지지 않는다', loop.every((x) => x.계획 > 0 && !x.빠진곡.length), loop);
      }
      const bb = fs.readFileSync(path.join(ROOT, 'assets/bgm-bed.js'), 'utf8');
      ok('B ⑥ 미리 듣기 쪽 줄 그대로 — lfNext = playOrd(sg).filter(has)(파일이 있나로만 거른다 · 콘솔과 같은 목록)', bb.indexOf('function lfNext(sg,f){ var o=playOrd(sg).filter(has)') > -1 && bb.indexOf('heard:heardMap(), now:nowS(), seg:sg') > -1);
      ok('B 쪽 오류 0', !c.errs.length, c.errs.slice(0, 3));
    }
    await c.ctx.close();
  }
  /* ── C [HEARD_RESET_1114] — 옛 판: 나가기 → 시작 뒤에도 들린 기록 7 → 7(① 빨강) ── */
  if (want('C')) {
    const c = await open('standard', ['B01', 'B24'].map((f, i) => [f, wav(30, 220 + i * 40)])); const R = await c.start();
    if (!R || !(await hooks(c)) || c.put < c.need || !(await c.pg.evaluate(() => !!(window.__esdT && window.__esdT.panic && window.__bgmGo.tap && document.getElementById('bMute') && document.getElementById('bExit'))))) skip('C — 콘솔 점검 고리 · 단추(음악만 멈춤 · 나가기)를 못 찾았다');
    else {
      await c.fire(R.findIndex((x) => x.k === 'guest')); await c.playing('M1');
      const big = () => c.pg.evaluate(() => { const h = window.__heard(); return Object.keys(h).filter((f) => h[f] && h[f].sec >= 20).sort(); });
      await c.pg.evaluate(() => { const n = performance.now() / 1000, h = {}; ['B01', 'B24', 'B13', 'B05', 'B09', 'B10', 'B15'].forEach((f, i) => { h[f] = { t0: n - 3000 + i * 300, seg: i < 3 ? 'M1' : 'M4', sec: 200, last: n - 2800 + i * 300, lseg: i < 3 ? 'M1' : 'M4' }; }); window.__heardSet(h); });
      const h0 = await big();
      await c.pg.evaluate(() => { document.getElementById('bMute').click(); }); await c.pg.waitForTimeout(500); await c.pg.evaluate(() => { document.getElementById('bMute').click(); }); await c.pg.waitForTimeout(300); const h1 = await big();   /* 음악만 멈춤 → 다시 */
      await c.pg.evaluate(() => { window.__esdT.panic(); }); await c.pg.waitForTimeout(400); await c.pg.evaluate(() => { window.__bgmGo.tap(); }); await c.pg.waitForTimeout(500); const h2 = await big();   /* 전체 정지 → GO */
      c.pg.once('dialog', (d) => d.accept()); await c.pg.click('#bExit'); await c.pg.waitForTimeout(400); await c.pg.click('#go'); await c.pg.waitForTimeout(700); const h3 = await big(), st = await c.pg.evaluate(() => window.__bgmSt());
      const rC = { 넣은기록: h0.length, 멈춤다시뒤: h1.length, 정지GO뒤: h2.length, 나가기시작뒤: h3.length, 남은곡: h3, 새판큐: st.cur };
      console.log('  재 본 값 C', JSON.stringify(rC));
      if (h0.length !== 7) skip('C — 들린 기록을 넣지 못했다 ' + JSON.stringify(rC));
      else {
        ok('C ① «■ 나가기 → 시작» 뒤 앞 판의 들린 곡 기록이 0 [HEARD_RESET_1114]', h3.length === 0 && st.cur === -1, rC);
        ok('C ② 음악만 멈춤 → 다시 · 전체 정지 → GO 는 들린 기록을 지우지 않는다', h1.length === 7 && h2.length === 7, rC);
      }
      ok('C 쪽 오류 0', !c.errs.length, c.errs.slice(0, 3));
    }
    await c.ctx.close();
  }
  /* ── D [BED_BAD_RESET_1114] — 옛 판: 파일을 바꿔 넣어도 그 곡이 끝내 안 나온다(② 빨강) · 점검 창구(__seg.st().bad)도 없다(① ③ 빨강) ── */
  if (want('D')) {
    const c = await open('standard', [['B01', wav(40, 220)], ['B24', BADFILE, '.bin'], ['B13', BADFILE, '.bin']]); const R = await c.start();
    if (!R || !(await hooks(c)) || c.put < c.need) skip('D — 콘솔 점검 고리가 없거나 곡 파일 칸을 못 찾았다');
    else {
      const hasBad = Array.isArray((await c.seg()).bad);   /* 점검 창구 — 없으면(옛 판 · 되돌려짐) ① ③ 은 빨강 · ② 는 동작으로 잰다 */
      await c.fire(R.findIndex((x) => x.k === 'guest')); const p0 = await c.playing('M1'); await c.pg.waitForTimeout(3600); const X = P.xfOf('M1');
      await c.nearEnd(X + 1.0);   /* 곡 끝 → B24(깨짐) → B13(깨짐) → 틀 곡이 없어 지금 곡을 이어 튼다 */
      const k1 = await c.pg.waitForFunction(() => { const s = window.__seg.st(); return /다음 곡을 열지 못해/.test(s.err) && !s.opening; }, null, { timeout: 12000 }).then(() => true, () => false); const s1 = await c.seg();
      await c.pg.waitForTimeout(X * 1000 + 600);   /* 같은 곡 다시 잇기 겹침이 끝날 때까지 */
      const good = path.join(TMP, 'B24good.wav'); fs.writeFileSync(good, wav(40, 300)); await c.pg.locator('[data-seg-file="B24"]').first().setInputFiles(good); await c.pg.waitForTimeout(1200); const s2 = await c.seg();
      await c.nearEnd(X + 1.0); const k2 = await c.pg.waitForFunction(() => { const s = window.__seg.st(); return s.id === 'B24' && !s.opening; }, null, { timeout: 9000 }).then(() => true, () => false); const s3 = await c.seg();
      c.pg.once('dialog', (d) => d.accept()); await c.pg.click('#bExit'); await c.pg.waitForTimeout(400); await c.pg.click('#go'); await c.pg.waitForTimeout(700); const s4 = await c.seg();
      const rD = { 깨진뒤표시: s1.bad, 상태줄: s1.err, 바꿔넣은뒤표시: s2.bad, 다음차례곡: s3.id, 다시시작뒤표시: s4.bad };
      console.log('  재 본 값 D', JSON.stringify(rD));
      if (!p0 || !k1) skip('D — 준비(하객 맞이 곡 틀기 · 깨진 두 곡 건너뜀)가 안 됐다 ' + JSON.stringify(rD));
      else {
        ok('D ① 깨진 곡 파일을 멀쩡한 파일로 바꿔 넣으면 그 곡의 «못 연 곡» 표시만 지워진다 [BED_BAD_RESET_1114]', hasBad && s1.bad.slice().sort().join() === 'B13,B24' && s2.bad.join() === 'B13', rD);
        ok('D ② 바꿔 넣은 곡이 제 차례에 다시 흐른다(계속 건너뛰지 않는다)', k2 && s3.id === 'B24', rD);
        ok('D ③ «■ 나가기 → 시작» 뒤 «못 연 곡» 표시가 0', hasBad && s4.bad.length === 0, rD);
      }
      ok('D 쪽 오류 0', !c.errs.length, c.errs.slice(0, 3));
    }
    await c.ctx.close();
  }
} catch (e) { console.log('못 쟀다 —', String(e && e.stack || e).slice(0, 600)); try { await br.close(); } catch {} srv.close(); process.exit(2); }
await br.close(); srv.close(); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
if (cant && !fail) { console.log('console-bed-1114: 못 쟀다 ' + cant); process.exit(2); }
console.log(fail ? `console-bed-1114: FAIL ${fail}` : 'console-bed-1114: ok'); process.exit(fail ? 1 : 0);
