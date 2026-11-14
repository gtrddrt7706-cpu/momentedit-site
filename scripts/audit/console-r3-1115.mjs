#!/usr/bin/env node
/* ★★[CONSOLE_R3_1115 2026-11-15 BGM 섹션 · GPT 라운드 3] 당일 콘솔(console.html) · 곡 계획(assets/bgm-picks.js) 검사 — console-r2-1115.mjs 와 같은 하네스 방식
   A [LATER_DROP_1115] (01) 재생기 셋이 다 차 미뤄 둔 요청(BED.later)이 있는데 정적 뒤 새 요청(화촉)이 자리를 얻으면 — 옛 요청을 버린다(마지막 요청이 이긴다 · DETAIL_R3_1101 ③)
   B [M4_HANDOFF_NEXT_1115] (02) 짧은 입장 곡 → 본식 피아노 인계에서 첫 곡을 못 열면 다음 곡을 한 번씩 · 꺼 둔 화촉 곡은 되살리지 않는다(NO_RELIFT_1102 · M4_HANDOFF_NONE_1115)
   C [M4_NONE_DROP_1115] (03) 본식 피아노가 없어 음악 없이 이을 때(m4None) 여는 중이던 곡 · 실패 뒤 다음 곡 · 미룬 요청을 함께 거둔다 — 멀쩡한 곡을 «못 연 곡»으로 적지 않는다
   D [HUSH_SOFT_FREE_1115] (04) 0.5초에 끄는 정적(HUSH_SOFT)이 끝나면 조용해진 앞 재생기를 비운다 — 미룬 새 요청이 옛 겹침 끝(최대 겹침 길이)을 기다리지 않는다
   E [BACK_DROP_ORIGIN_1115] (05) 늦게 열리는 화촉 곡 — 같은 구간 다음 큐 뒤 «뒤로» 두 번(그 곡을 건 큐 밖으로) 되돌아가면 그 요청을 거둔다(BACK_DROP_OPEN_1115 확장)
   F [FINISH_NO_NEXT_1115] (06) «끝내기» 뒤 3초 잦아드는 동안 목록 감시가 다음 곡을 열지 않는다(AFTER_PHOTO_LOOP_1102)
   G [RESET_PLAYERS_1115] (07) 끝낸 뒤 «처음으로» → 첫 GO — 앞 판 재생기(사진곡)가 새 판에 되살아나지 않는다
   H [RESET_PLAYERS_1115] (08) 구간 곡으로 진행 → 나가기 → 공용 «배경 음악 파일» 한 곡으로 새로 시작 — 그 곡이 들린다(0번 재생기 크기 1)
   I [PAUSE_REOPEN_1115] (09) 곡 파일을 여는 중 «잠시 멈춤»(setPaused · GUEST_PAUSE) — 멀쩡한 곡을 «못 연 곡»으로 적지 않고 이어 들을 때 그 곡을 다시 연다 · 앞 곡은 되살리지 않는다
   J [DECLARE_ONE_1115] (10) 선언 뒤 박수(newSong) — 틀 수 있는 본식 피아노가 한 곡뿐이면 그 곡을 강조 자리부터 새로(DECLARE_LIFT 주석 «없으면 지금 곡을 강조 자리부터»)
   K [CARRY_HEARD_1115] (11) 들린 기록으로 다시 짠 테이블 인사 목록 — 이어받은 곡(CARRY_SAME)은 이미 흐른 초를 빼고 첫 반복 ≥ 30분(REPEAT_RULE_1107 · FILL_XF_1115)
   깨 보기: BP_CON=<옛 console.html> → A ~ J 의 ① 빨강 / BP_PICKS=<옛 assets/bgm-picks.js> → K ① 빨강 · ONLY=AB 처럼 칸을 골라 돌린다
   곡 = 쪽 안에서 만든 시험 사인파(곡 번호 이름 · segAddFile) · 나레이션 = 0.6초 짧은 소리 · 큐는 손으로 낸다(__bgmGo.fire) · «뒤로» · «나가기»는 실제 단추 · 입장 곡 끝 인계는 esdEnd 를 직접 부른다(입장 장면 흉내)
   ROOT = 저장소 뿌리(R3_ROOT 로 바꿀 수 있다) · 종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = process.env.R3_ROOT || path.join(HERE, '..', '..');
const CON = process.env.BP_CON || '', PICKS = process.env.BP_PICKS || '', ONLY = String(process.env.ONLY || '').toUpperCase(), want = (k) => !ONLY || ONLY.indexOf(k) > -1;
if (!fs.existsSync(path.join(ROOT, 'console.html'))) { console.log('못 쟀다 — console.html 이 없다(R3_ROOT 를 저장소 뿌리로): ' + ROOT); process.exit(2); }
let fail = 0, cant = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 700)}`); if (!c) fail++; };
const skip = (m) => { console.log('못 쟀다 — ' + m); cant++; };
const O = require(path.join(ROOT, 'assets/ritual-open.js')); require(path.join(ROOT, 'assets/ritual-data.js')); const RC = require(path.join(ROOT, 'assets/ritual-cue.js'));
const P = require(PICKS || path.join(ROOT, 'assets/bgm-picks.js'));
const SOF = (ex) => { const S = O.applyExample({ course: 'open' }, ex || 'standard'); S.course = 'open'; S.bgm = {}; return S; };
const done = () => { console.log(fail ? `console-r3-1115: FAIL ${fail}` : cant ? `console-r3-1115: 못 잰 칸 ${cant}` : 'console-r3-1115: ok'); process.exit(fail ? 1 : cant ? 2 : 0); };

/* ── K [CARRY_HEARD_1115] 곡 계획(브라우저 없이) — 부모님께 인사 곡(B16)을 120 · 185초 듣고 테이블 인사로 이어받은 날 ── */
if (want('K')) {
  const fm = (s) => { s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const dOf = (f) => (P.lenOf(f, 0) || P.LEN0);
  const S = SOF('record'), ks = new Set(RC.build(S, { mode: 'console' }).cues.map((c) => c.k));
  const on = (id) => { let d = P.seg(id); if (d && id === 'M8L' && !d.ks) d = Object.assign({}, d, { ks: ['_goodbye'] }); if (!d || !d.ks) return false; return d.ks.some((k) => ks.has(k)); };
  const rows = [];
  for (const sec of [120, 185]) {
    const n = 5000, h = { B16: { t0: n - sec, seg: 'M5', sec, last: n, lseg: 'M5' } };
    const r = (P.plan(S, { on, heard: h, now: n, seg: 'M8', cur: 'B16', curAt: sec }).M8 || {}).list || [];
    const first = r.reduce((a, f) => a + dOf(f), 0) - r.length * P.xfOf('M8') - (r[0] === 'B16' ? sec : 0);   /* 이어받은 곡은 지금 자리에서 잇는다 — 이미 흐른 초는 칸 안에서 다시 들리지 않는다 */
    rows.push({ 들은초: sec, 첫곡: r[0], n: r.length, 첫반복: fm(first), 필요: fm(P.NEED.M8), ok: r[0] === 'B16' && first >= P.NEED.M8 });
  }
  console.log('  재 본 값 K', JSON.stringify(rows));
  ok('K ① 이어받은 곡(B16 · 120 · 185초 흐름)으로 다시 짠 테이블 인사 목록 — 첫 반복 ≥ 30분(흐른 초를 뺀 셈) [CARRY_HEARD_1115]', rows.every((x) => x.ok), rows);
  /* ② 대조 — 이어받지 않은 날(cur 없음)은 종전 목록 그대로 */
  { const n = 5000, h = { B16: { t0: n - 120, seg: 'M5', sec: 120, last: n, lseg: 'M5' } };
    const a = (P.plan(S, { on, heard: h, now: n, seg: 'M8' }).M8 || {}).list || [], b = (P.plan(S, { on, heard: h, now: n, seg: 'M8', curAt: 120 }).M8 || {}).list || [];
    ok('K ② 대조 — 이어받는 곡이 없으면 지금 자리(curAt)는 목록을 바꾸지 않는다', a.join() === b.join() && a.length > 0, { a, b }); }
}

const BROWSER = 'ABCDEFGHIJ'.split('').some(want);
if (!BROWSER) done();

let pw = null; for (const p of ['playwright', path.join(process.env.NODE_PATH || '', 'playwright'), '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
function wav(sec, f, sr = 16000) { const n = Math.round(sr * sec), b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(f ? 8000 * Math.sin(2 * Math.PI * f * i / sr) : 0), 44 + i * 2); return b; }
const SHORT = wav(0.6, 330);
/* 점검 고리 — 콘솔 본 스크립트(즉시 실행 함수 안)의 끝에 «그 안에서 식 하나를 읽고 쓰는» 창구를 이 검사 서버에서만 끼운다(사이트 파일은 바꾸지 않는다 · 옛 판 · 새 판 똑같이) */
function inject(h) { const a = h.indexOf("'use strict';"), e = a < 0 ? -1 : h.indexOf('\n</script>', a), z = e < 0 ? -1 : h.lastIndexOf('})();', e); if (z < 0) return h; return h.slice(0, z) + 'window.__r3i = function(s){ return eval(s); };\n' + h.slice(z); }
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
  if (/^\/assets\/audio\/narration\/.+\.mp3$/.test(u)) { r.writeHead(200, { 'Content-Type': 'audio/wav' }); r.end(SHORT); return; }
  const p = (CON && u === '/console.html') ? CON : (PICKS && u === '/assets/bgm-picks.js') ? PICKS : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } if (u === '/console.html') b = Buffer.from(inject(b.toString('utf8'))); r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
/* 탐침 — console-r2-1115 와 같다(곡 재생기마다 스피커까지 gain 곱 · 0.05초 · 곡 이름 = 넣은 파일 이름 · 이름이 __slowName 인 곡의 play() 를 __slowMs 늦춘다 · 그사이 pause() 면 AbortError) */
const PROBE = `(() => { if (window.__rl) return; var R = window.__rl = { srcs: [], smp: [], on: false, blob: {} };
  var cu = URL.createObjectURL; URL.createObjectURL = function (f) { var u = cu.apply(this, arguments); try { if (f && f.name) R.blob[u] = String(f.name).replace(/\\.wav$/, ''); } catch (e) {} return u; };
  var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; var P = AC.prototype;
  var cg = P.createGain; P.createGain = function () { var n = cg.apply(this, arguments); n.__g = 1; return n; };
  var cm = P.createMediaElementSource; P.createMediaElementSource = function (el) { var n = cm.apply(this, arguments); n.__el = el; R.srcs.push(n); return n; };
  var co = AudioNode.prototype.connect, dc = AudioNode.prototype.disconnect;
  AudioNode.prototype.connect = function (d) { if (d && d instanceof AudioNode) (this.__out = this.__out || []).push(d); return co.apply(this, arguments); };
  AudioNode.prototype.disconnect = function (d) { if (d && d instanceof AudioNode) this.__out = (this.__out || []).filter(function (x) { return x !== d; }); else if (!arguments.length) this.__out = []; return dc.apply(this, arguments); };
  function down(n, seen) { if (n instanceof AudioDestinationNode) return 1; seen = seen || []; if (seen.indexOf(n) > -1) return null; seen.push(n); var best = null, outs = n.__out || [];
    for (var i = 0; i < outs.length; i++) { var r = down(outs[i], seen); if (r != null && (best == null || r > best)) best = r; } seen.pop(); if (best == null) return null; return n.__g ? best * n.gain.value : best; }
  setInterval(function () { if (!R.on) return; var o = { t: performance.now(), s: {} };
    R.srcs.forEach(function (s) { var el = s.__el; if (!el || el.id === 'aNarr' || el.paused) return; var nm = R.blob[el.currentSrc || el.getAttribute('src') || '']; if (!nm) return; var g = down(s); if (g == null) return; g = g * el.volume; var db = g > 1e-7 ? 20 * Math.log10(g) : -140; if (o.s[nm] == null || db > o.s[nm]) o.s[nm] = Math.round(db * 10) / 10; });
    R.smp.push(o); }, 50);
  var op = HTMLMediaElement.prototype.play, ps = HTMLMediaElement.prototype.pause;
  HTMLMediaElement.prototype.play = function () { var el = this, nm = R.blob[el.getAttribute('src') || ''], ms = window.__slowMs || 0; if (!ms || !nm || nm !== window.__slowName) return op.call(el);
    el.__tk = (el.__tk || 0) + 1; var tk = el.__tk; return new Promise(function (res, rej) { setTimeout(function () { if (el.__tk !== tk) { rej(new DOMException('aborted by pause', 'AbortError')); return; } op.call(el).then(res, rej); }, ms); }); };
  HTMLMediaElement.prototype.pause = function () { this.__tk = (this.__tk || 0) + 1; return ps.call(this); };
  /* 시험 곡 — 쪽 안에서 만든다(곡 번호 = 파일 이름 · 못 여는 곡 = 소리 파일이 아닌 바이트) */
  window.__mkWav = function (sec, f, sr) { sr = sr || 8000; var n = Math.round(sr * sec), b = new ArrayBuffer(44 + n * 2), v = new DataView(b), s = function (o, t) { for (var i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    s(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); s(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); s(36, 'data'); v.setUint32(40, n * 2, true);
    for (var i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(8000 * Math.sin(2 * Math.PI * f * i / sr)), true); return b; };
  window.__put = function (ids, sec, bad) { ids.forEach(function (id, j) { var f = (bad || []).indexOf(id) > -1 ? new File([new Uint8Array(4000).fill(65)], id + '.wav', { type: 'audio/wav' }) : new File([window.__mkWav(sec || 40, 200 + j * 37)], id + '.wav', { type: 'audio/wav' }); window.__r3i('segAddFile')(id, f); }); }; })();`;
async function open(S, opt) {
  opt = opt || {};
  const ctx = await br.newContext(opt.vp || { viewport: { width: 1280, height: 900 } }); await ctx.addInitScript(PROBE); await ctx.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; });
  const pg = await ctx.newPage(), errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('dialog', (d) => d.accept().catch(() => {}));
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: '{"ok":true}' })));
  await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S)).toString('base64'))}`); await pg.waitForTimeout(900);
  const hook0 = await pg.evaluate(() => typeof window.__r3i === 'function' && typeof window.__put === 'function');
  if (hook0 && opt.files) await pg.evaluate(([ids, sec, bad]) => window.__put(ids, sec, bad), [opt.files, opt.sec || 40, opt.bad || []]);
  await pg.waitForTimeout(1500);
  if (opt.bg) await pg.evaluate(() => { const u = URL.createObjectURL(new File([window.__mkWav(40, 700)], 'BG.wav', { type: 'audio/wav' })); window.__r3i('BGMURL = ' + JSON.stringify(u)); });
  await pg.evaluate(() => document.getElementById('go').click()); await pg.waitForTimeout(600);
  const hook = hook0 && await pg.evaluate(() => typeof window.__bgmSt === 'function' && !!window.__bgmGo && !!window.__seg && !!window.__rl && typeof window.__r3i('esdEnd') === 'function');
  const c = { ctx, pg, errs, ok: hook,
    fire: (i) => pg.evaluate((i) => { window.__bgmGo.fire(i); return performance.now(); }, i),
    now: () => pg.evaluate(() => performance.now()),
    on: () => pg.evaluate(() => { window.__rl.smp = []; window.__rl.on = true; }),
    st: () => pg.evaluate(() => window.__seg.st()),
    waitDb: (nm, fn, ms) => pg.waitForFunction(([nm, f]) => { const a = window.__rl.smp, s = a[a.length - 1]; const v = s && s.s[nm]; return new Function('v', 'return ' + f)(v); }, [nm, fn], { timeout: ms || 20000 }).then(() => true, () => false),
    smp: () => pg.evaluate(() => window.__rl.smp),
    w: (ms) => pg.waitForTimeout(ms) };
  return c;
}
const peak = (w, nm) => { let b = -140; for (const s of w) { const v = nm ? s.s[nm] : Math.max(-140, ...Object.values(s.s)); if (v != null && v > b) b = v; } return b; };
const win = (smp, t0, ms) => smp.filter((s) => s.t >= t0 && s.t <= t0 + ms);
const firstAbove = (smp, t0, nm, db) => { const s = smp.find((x) => x.t >= t0 && x.s[nm] != null && x.s[nm] > db); return s ? Math.round(s.t - t0) : null; };
/* 입장 장면 흉내 — 입장 곡이 흐르는 동안 배경음은 −90(duckTo 가 ESD.run 을 본다) · 짧은 곡 끝(ended) = esdEnd 인계 */
const entryEnd = (c, iE) => c.pg.evaluate((iE) => { window.__bgmGo.duck(-90, 10); return new Promise((ok) => setTimeout(() => { window.__r3i('cur = ' + iE + "; phase = 'clip'; ESD.short = true; ESD.run = { i: " + iE + ' }; esdEnd(ESD.run, true);'); ok(performance.now()); }, 300)); }, iE);
try {
  /* ── A [LATER_DROP_1115] (01) — 옛 판: 정적 뒤 화촉 곡이 자리를 얻은 뒤 옛 겹침 끝이 미뤄 둔 본식 요청(B12)을 틀어 화촉 곡을 밀어낸다(① 빨강) ── */
  if (want('A')) {
    const c = await open(SOF('record'), { files: ['B01', 'B12', 'B23', 'B05'] });
    if (!c.ok) skip('A — 콘솔 점검 고리를 못 찾았다');
    else {
      await c.on(); await c.fire(0); const g = await c.waitDb('B01', 'v != null && v > -30', 15000); await c.w(4000);
      await c.fire(14); await c.w(400); await c.fire(22); await c.w(400); await c.fire(14); await c.w(100);
      const L0 = await c.st(); await c.pg.evaluate(() => window.__bgmGo.duck(-90, 10)); await c.w(250);
      const tC = await c.fire(7); await c.w(7000);
      const s1 = await c.st(), W = win(await c.smp(), tC + 1500, 5500);
      const rA = { 준비: g, 미룬요청: L0.later, 지금곡: s1.id, 화촉곡최고: peak(W, 'B05'), 본식곡최고: peak(W, 'B12'), 테이블곡최고: peak(W, 'B23') };
      console.log('  재 본 값 A', JSON.stringify(rA));
      if (!g || !L0.later) skip('A — 준비(재생기 셋이 차 요청이 미뤄짐)를 못 만들었다 ' + JSON.stringify(rA));
      else {
        ok('A ① 미뤄 둔 요청이 있는데 화촉 곡이 자리를 얻으면 — 옛 요청을 버린다(지금 곡 = 화촉 곡 · 화촉 GO 1.5초 뒤 5.5초 동안 다른 곡 −60 dB 아래) [LATER_DROP_1115]', rA.지금곡 === 'B05' && rA.본식곡최고 <= -60 && rA.테이블곡최고 <= -60, rA);
        ok('A ② 화촉 곡은 −30 dB 위로 흐른다', rA.화촉곡최고 > -30, rA);
      }
      ok('A 쪽 오류 0', !c.errs.length, c.errs.slice(0, 3));
    }
    await c.ctx.close();
  }
  /* ── B [M4_HANDOFF_NEXT_1115] (02) — 옛 판: 첫 본식 곡(B09)을 못 열면 B10 요청 0회 · 꺼 둔 화촉 곡이 인계 뒤 다시 오른다(① 빨강) ── */
  if (want('B')) {
    for (const v of ['next', 'none']) {
      const c = await open(SOF('standard'), { files: ['B05', 'B09', 'B10'], bad: v === 'next' ? ['B09'] : ['B09', 'B10'] });
      if (!c.ok) { skip('B — 콘솔 점검 고리를 못 찾았다'); await c.ctx.close(); continue; }
      await c.on(); await c.fire(7); const g = await c.waitDb('B05', 'v != null && v > -30', 15000); await c.w(4000);
      const p0 = (await c.st()).plays; const tE = await entryEnd(c, 11); await c.w(8000);
      const s1 = await c.st(), W = win(await c.smp(), tE + 1000, 7000);
      const rB = { 판: v, 준비: g, 요청: s1.plays - p0, 지금곡: s1.id, 못연곡: s1.bad, 글: s1.err, 화촉곡최고: peak(W, 'B05'), B10최고: peak(W, 'B10') };
      console.log('  재 본 값 B ' + v, JSON.stringify(rB));
      if (!g) skip('B — 화촉 곡이 안 흘렀다 ' + JSON.stringify(rB));
      else if (v === 'next') {
        ok('B ① 첫 본식 곡(B09)을 못 열면 다음 곡(B10)을 연다 — B10 이 −30 dB 위 · 꺼 둔 화촉 곡은 인계 1초 뒤 7초 동안 −60 dB 아래 [M4_HANDOFF_NEXT_1115]', rB.지금곡 === 'B10' && rB.B10최고 > -30 && rB.화촉곡최고 <= -60, rB);
      } else {
        ok('B ② 본식 곡을 하나도 못 열면 음악 없이(m4None 한 줄 · 화촉 곡 −60 dB 아래 · M4_HANDOFF_NONE_1115 와 같은 끝)', rB.화촉곡최고 <= -60 && /본식 피아노/.test(rB.글 || ''), rB);
      }
      ok('B 쪽 오류 0 · ' + v, !c.errs.length, c.errs.slice(0, 3));
      await c.ctx.close();
    }
  }
  /* ── C [M4_NONE_DROP_1115] (03) — 옛 판: 음악 없이 이을 때 여는 중이던 화촉 곡이 «못 연 곡»이 되고 글이 «열지 못했어요»로 바뀐다(① 빨강) ── */
  if (want('C')) {
    const c = await open(SOF('standard'), { files: ['B05'] });
    if (!c.ok) skip('C — 콘솔 점검 고리를 못 찾았다');
    else {
      await c.on(); await c.fire(7); const g = await c.waitDb('B05', 'v != null && v > -30', 15000); await c.w(4000);
      await c.pg.evaluate(() => { window.__slowName = 'B05'; window.__slowMs = 2500; window.__r3i("bedPlay('B05', 3)"); });   /* 같은 곡을 다시 여는 중(곡 끝 잇기 · LIST_HOLD 와 같은 길) */
      const op = (await c.st()).opening; await c.w(200); await entryEnd(c, 11); await c.w(5500);
      const s1 = await c.st(), W = win(await c.smp(), (await c.now()) - 5000, 5000), rC = { 준비: g, 여는중: op, 못연곡: s1.bad, 글: s1.err, 지금곡: s1.id, 화촉곡최고: peak(W, 'B05') };
      console.log('  재 본 값 C', JSON.stringify(rC));
      if (!g || op !== 'B05') skip('C — 준비(화촉 곡을 다시 여는 중)를 못 만들었다 ' + JSON.stringify(rC));
      else ok('C ① 음악 없이 이을 때 — 여는 중이던 멀쩡한 곡을 «못 연 곡»으로 적지 않고 글은 «본식 피아노 파일이 없어» 그대로 · 늦게 열린 그 곡이 되살아나지 않는다(마지막 5초 −60 dB 아래) [M4_NONE_DROP_1115]', rC.못연곡.indexOf('B05') < 0 && /본식 피아노/.test(rC.글 || '') && rC.화촉곡최고 <= -60, rC);
      ok('C 쪽 오류 0', !c.errs.length, c.errs.slice(0, 3));
    }
    await c.ctx.close();
  }
  /* ── D [HUSH_SOFT_FREE_1115] (04) — 옛 판: 세 곡 겹침 중 0.5초 정적 → 새 요청이 옛 겹침 끝(약 2.5초)까지 미뤄진다(① 빨강) ── */
  if (want('D')) {
    const c = await open(SOF('record'), { files: ['B01', 'B12', 'B05', 'B23'] });
    if (!c.ok) skip('D — 콘솔 점검 고리를 못 찾았다');
    else {
      await c.on(); await c.fire(0); const g = await c.waitDb('B01', 'v != null && v > -30', 15000); await c.w(4000);
      await c.fire(14); await c.w(300); await c.fire(7); await c.w(300);
      await c.pg.evaluate(() => window.__bgmGo.duck(-90, 1600)); await c.w(100);
      const tJ = await c.fire(22); const L0 = (await c.st()).later; await c.w(1200); const qd = await c.pg.evaluate(() => window.__seg.st().paused);
      await c.w(4000); const sm = await c.smp(), s1 = await c.st();
      const rD = { 준비: g, 미룬요청: L0, 지금곡: s1.id, 테이블곡_첫소리ms: firstAbove(sm, tJ, 'B23', -60) };
      console.log('  재 본 값 D', JSON.stringify(rD), JSON.stringify(qd));
      if (!g || L0 !== 'B23') skip('D — 준비(세 곡 겹침 중 정적 · 새 요청이 미뤄짐)를 못 만들었다 ' + JSON.stringify(rD));
      else ok('D ① 0.5초 정적이 끝나면 조용해진 앞 재생기를 비워 미룬 테이블 곡이 1.5초 안에 소리를 낸다(옛 겹침 끝을 기다리지 않는다) [HUSH_SOFT_FREE_1115]', rD.지금곡 === 'B23' && rD.테이블곡_첫소리ms != null && rD.테이블곡_첫소리ms <= 1500, rD);
      ok('D 쪽 오류 0', !c.errs.length, c.errs.slice(0, 3));
    }
    await c.ctx.close();
  }
  /* ── E [BACK_DROP_ORIGIN_1115] (05) — 옛 판: 늦게 열리는 화촉 곡이 같은 구간 다음 큐 · 뒤로 두 번 뒤 식전 영상 손 대기에서 오른다(① 빨강) ── */
  if (want('E')) {
    const c = await open(SOF('standard'), { files: ['B01', 'B05'] });
    if (!c.ok) skip('E — 콘솔 점검 고리를 못 찾았다');
    else {
      await c.on(); await c.fire(0); const g = await c.waitDb('B01', 'v != null && v > -30', 15000); await c.w(4000);
      await c.fire(4); const q = await c.waitDb('B01', 'v == null || v <= -60', 15000); await c.w(600);
      await c.pg.evaluate(() => { window.__slowName = 'B05'; window.__slowMs = 2500; });
      await c.fire(7); await c.w(500); await c.fire(8); await c.w(200);
      const tB = await c.now(); await c.pg.click('#bBack'); await c.w(200); await c.pg.click('#bBack'); await c.w(9500);
      const s1 = await c.st(), sb = await c.pg.evaluate(() => window.__bgmSt()), W = win(await c.smp(), tB, 9500);
      const rE = { 준비: [g, q], 화면큐: sb.cur, 단계: sb.phase, 화촉곡최고: peak(W, 'B05'), 앞곡최고: peak(W, 'B01'), 지금곡: s1.id, 구간: s1.seg };
      console.log('  재 본 값 E', JSON.stringify(rE));
      if (!g || !q) skip('E — 준비(하객 맞이 곡 · 개식 정적)를 못 만들었다 ' + JSON.stringify(rE));
      else {
        ok('E ① 화촉 곡을 건 큐 밖으로 «뒤로» — 늦게 열린 화촉 곡이 9.5초 내내 −60 dB 아래(식전 영상 손 대기 · 다음 GO 없이 시작하지 않는다) [BACK_DROP_ORIGIN_1115]', rE.화면큐 === 6 && rE.화촉곡최고 <= -60 && rE.앞곡최고 <= -60, rE);
        await c.pg.evaluate(() => { window.__slowMs = 0; window.__rl.smp = []; }); const tRe = await c.fire(7); await c.w(4000);
        const W2 = win(await c.smp(), tRe, 4000), rE2 = { 화촉곡최고: peak(W2, 'B05'), 앞곡최고: peak(W2, 'B01') };
        console.log('  재 본 값 E ②', JSON.stringify(rE2));
        ok('E ② 다시 화촉 GO — 화촉 곡이 −20 dB 위로 · 앞 곡은 꺼진 채', rE2.화촉곡최고 > -20 && rE2.앞곡최고 <= -60, rE2);
      }
      ok('E 쪽 오류 0', !c.errs.length, c.errs.slice(0, 3));
    }
    await c.ctx.close();
  }
  /* ── F · G [FINISH_NO_NEXT_1115 · RESET_PLAYERS_1115] (06 · 07) — 옛 판: 끝내기 0.1초 뒤 다음 곡(B27)을 연다(F ① 빨강) · 처음으로 → 첫 GO 에 앞 판 사진곡이 −15 로(G ① 빨강) ── */
  for (const FG of ['F', 'G'].filter(want)) {
    const c = await open(SOF('standard'), { files: ['B32', 'B27'] });
    if (!c.ok) { skip(FG + ' — 콘솔 점검 고리를 못 찾았다'); await c.ctx.close(); continue; }
    await c.on(); await c.fire(30); const g = await c.waitDb('B32', 'v != null && v > -40', 15000); await c.w(4000);
    const pr = await c.pg.evaluate(() => { const x = window.__r3i, B = x('BED'), el = B.el[B.on], X = x('segXf()'), m = x('SEGST').meta[B.id] || {}, end = x('BP').lenOf(B.id, m.end || el.duration); el.currentTime = Math.max(0, end - X - 0.1); return { X, end, id: B.id, seg: B.seg }; });
    await c.w(50); const p0 = (await c.st()).plays, tF = await c.pg.evaluate(() => { window.__bgmGo.fire(window.__r3i('R.cues.length')); return performance.now(); }); await c.w(200);
    if (!g || pr.seg !== 'M8L') skip(FG + ' — 준비(마지막 곡 · 추가 촬영)를 못 만들었다 ' + JSON.stringify(pr));
    else if (FG === 'F') { await c.w(2800); const s1 = await c.st(), W = win(await c.smp(), tF, 3000), rF = { 준비: pr, 요청: s1.plays - p0, 다음곡최고: peak(W, 'B27'), 지금곡: s1.id };
      console.log('  재 본 값 F', JSON.stringify(rF));
      ok('F ① «끝내기» — 3초 잦아드는 동안 다음 곡을 열지 않는다(요청 0 · 다음 곡 −100 dB 아래) [FINISH_NO_NEXT_1115]', rF.요청 === 0 && rF.다음곡최고 <= -100, rF); }
    else { await c.pg.evaluate(() => window.__r3i('mainTap()')); await c.w(1400);
      const sb = await c.pg.evaluate(() => window.__bgmSt()); await c.pg.evaluate(() => { window.__rl.smp = []; }); const tG = await c.fire(0); await c.w(4000);
      const W = win(await c.smp(), tG, 4000), rG = { 끝낸뒤ms: Math.round(tG - tF), 처음으로뒤단계: sb.phase, 앞판곡최고: peak(W, null), 멈춤: (await c.st()).paused };
      console.log('  재 본 값 G', JSON.stringify(rG));
      ok('G ① 끝낸 뒤 0.2초 «처음으로» → 1.6초 첫 GO(하객 맞이 곡 파일 없음) — 앞 판 곡이 4초 내내 −60 dB 아래 [RESET_PLAYERS_1115]', rG.처음으로뒤단계 === 'idle' && rG.끝낸뒤ms < 2500 && rG.앞판곡최고 <= -60, rG); }
    ok(FG + ' 쪽 오류 0', !c.errs.length, c.errs.slice(0, 3));
    await c.ctx.close();
  }
  /* ── H [RESET_PLAYERS_1115] (08) — 옛 판: 나가기 뒤 공용 배경 음악 파일 한 곡으로 새로 시작하면 −88 dB(① 빨강) ── */
  if (want('H')) {
    const c = await open(SOF('standard'), { files: ['B09'], bg: true });
    if (!c.ok) skip('H — 콘솔 점검 고리를 못 찾았다');
    else {
      await c.on(); const g = await c.waitDb('BG', 'v != null && v > -40', 8000); const W0 = win(await c.smp(), 0, 1e12), bg0 = peak(W0, 'BG');
      await c.fire(14); const m = await c.waitDb('B09', 'v != null && v > -40', 10000); await c.w(4000);
      await c.pg.click('#bExit'); await c.w(800); await c.pg.evaluate(() => { window.__rl.smp = []; }); const tS = await c.now(); await c.pg.click('#go'); await c.w(4000);
      const W = win(await c.smp(), tS + 500, 3500), s1 = await c.st(), rH = { 준비: [g, m], 첫판배경곡: bg0, 새판배경곡최고: peak(W, 'BG'), xg: s1.xg, 재생기: s1.on };
      console.log('  재 본 값 H', JSON.stringify(rH));
      if (!g || !m) skip('H — 준비(배경 음악 파일 · 본식 곡)를 못 만들었다 ' + JSON.stringify(rH));
      else ok('H ① 나가기 뒤 새 판 배경 음악 파일 — 첫 판과 같은 크기(±3 dB · −40 dB 위) [RESET_PLAYERS_1115]', rH.새판배경곡최고 > -40 && Math.abs(rH.새판배경곡최고 - rH.첫판배경곡) <= 3, rH);
      ok('H 쪽 오류 0', !c.errs.length, c.errs.slice(0, 3));
    }
    await c.ctx.close();
  }
  /* ── I [PAUSE_REOPEN_1115] (09) — 옛 판: 여는 중 멈춤 → 멀쩡한 화촉 곡이 «못 연 곡» · 이어 들으면 하객 맞이 곡이 되살아난다(① 빨강) ── */
  if (want('I')) {
    for (const hold of [5000, 1000]) {
      const c = await open(SOF('standard'), { files: ['B01', 'B05'] });
      if (!c.ok) { skip('I — 콘솔 점검 고리를 못 찾았다'); await c.ctx.close(); continue; }
      await c.on(); await c.fire(0); const g = await c.waitDb('B01', 'v != null && v > -30', 15000); await c.w(4000);
      await c.fire(4); const q = await c.waitDb('B01', 'v == null || v <= -60', 15000); await c.w(600);
      await c.pg.evaluate(() => { window.__slowName = 'B05'; window.__slowMs = 1300; });
      await c.fire(7); await c.w(400); await c.pg.evaluate(() => window.__r3i('setPaused(true)')); await c.w(hold);
      await c.pg.evaluate(() => { window.__slowMs = 0; }); const tR = await c.pg.evaluate(() => { window.__r3i('setPaused(false)'); return performance.now(); }); await c.w(5000);
      const s1 = await c.st(), W = win(await c.smp(), tR, 5000), rI = { 멈춤ms: hold, 준비: [g, q], 못연곡: s1.bad, 글: s1.err, 지금곡: s1.id, 화촉곡최고: peak(W, 'B05'), 앞곡최고: peak(W, 'B01') };
      console.log('  재 본 값 I', JSON.stringify(rI));
      if (!g || !q) skip('I — 준비(하객 맞이 곡 · 개식 정적)를 못 만들었다 ' + JSON.stringify(rI));
      else ok(`I ① 여는 중 ${hold / 1000}초 멈춤 → 이어 듣기 — 화촉 곡은 «못 연 곡»이 아니고 −30 dB 위로 · 앞 곡은 5초 내내 −60 dB 아래 [PAUSE_REOPEN_1115]`, rI.못연곡.indexOf('B05') < 0 && rI.지금곡 === 'B05' && rI.화촉곡최고 > -30 && rI.앞곡최고 <= -60, rI);
      ok('I 쪽 오류 0 · ' + hold, !c.errs.length, c.errs.slice(0, 3));
      await c.ctx.close();
    }
  }
  /* ── J [DECLARE_ONE_1115] (10) — 옛 판: 틀 수 있는 본식 곡이 하나(B09)면 선언 뒤 박수에 새 곡 요청 0회 · 정적 동안 흐른 자리에서 그대로 오른다(① 빨강) ── */
  if (want('J')) {
    for (const v of ['one', 'bad']) {
      const c = await open(SOF('family'), v === 'one' ? { files: ['B09'], sec: 120 } : { files: ['B09', 'B10'], bad: ['B10'], sec: 120 });
      if (!c.ok) { skip('J — 콘솔 점검 고리를 못 찾았다'); await c.ctx.close(); continue; }
      const iN = await c.pg.evaluate(() => window.__r3i('R').cues.findIndex((x) => x.live && x.live.newSong)), iD = await c.pg.evaluate(() => window.__r3i('R').cues.findIndex((x) => x.k === 'declare'));
      await c.on(); await c.fire(14); const g = await c.waitDb('B09', 'v != null && v > -40', 15000); await c.w(5000);
      await c.fire(iD); await c.w(3000); if (iN !== iD) { await c.fire(iN); }
      const p0 = (await c.st()).plays, hk = await c.pg.evaluate(() => window.__r3i("reHookC('B09')"));
      const got = await c.pg.waitForFunction((i) => { const a = window.__bgmSt(); return a.cur === i && a.phase === 'live'; }, iN, { timeout: 15000 }).then(() => true, () => false); await c.w(3000);
      const s1 = await c.st(), t1 = await c.pg.evaluate(() => window.__r3i('BED.el[BED.on].currentTime'));
      const rJ = { 판: v, 준비: [g, got, iD, iN], 요청: s1.plays - p0, 지금곡: s1.id, 못연곡: s1.bad, 강조자리: hk, 지금초: Math.round(t1 * 10) / 10 };
      console.log('  재 본 값 J', JSON.stringify(rJ));
      if (!g || !got || iN < 0) skip('J — 준비(본식 곡 · 선언 · 박수 사람 구간)를 못 만들었다 ' + JSON.stringify(rJ));
      else ok(`J ${v === 'one' ? '①' : '②'} 본식 곡 ${v === 'one' ? '한 곡뿐' : '다음 곡(B10)을 못 엶'} — 선언 뒤 박수에 B09 를 강조 자리부터 새로(지금 초 = 강조 자리 + 박수 뒤 약 3초 · 정적 동안 흐른 자리가 아니다) [DECLARE_ONE_1115]`, rJ.요청 >= 1 && rJ.지금곡 === 'B09' && rJ.지금초 >= hk && rJ.지금초 <= hk + 6, rJ);
      ok('J 쪽 오류 0 · ' + v, !c.errs.length, c.errs.slice(0, 3));
      await c.ctx.close();
    }
  }
} catch (e) { console.log('못 쟀다 —', String(e && e.stack || e).slice(0, 500)); try { await br.close(); } catch {} srv.close(); process.exit(2); }
await br.close(); srv.close();
done();
