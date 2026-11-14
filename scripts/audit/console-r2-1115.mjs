#!/usr/bin/env node
/* ★★[CONSOLE_R2_1115 2026-11-15 BGM 섹션 · GPT 라운드 2] 당일 콘솔(console.html) · 곡 계획(assets/bgm-picks.js) 검사 — console-relift.mjs · console-bed-1114.mjs 와 같은 하네스 방식
   A [BACK_DROP_OPEN_1115] (새 04) 정적(개식) 뒤 화촉 큐 GO → 화촉 곡이 늦게 열리는 중(1.3초) «뒤로»(실제 단추) — 늦게 열린 화촉 곡이 다음 GO 없이 들리지 않는다 ·
       꺼 둔 앞 곡(하객 맞이)도 정적 차단 복원(bedUnhush · 8.6초 타이머)으로 되살아나지 않는다 · 다시 GO 하면 화촉 곡이 오르고 앞 곡은 그대로 꺼져 있다 · 대조: 뒤로 없이 늦게 열리면 종전대로 오른다
   B [LIVE_DOWN_MS_1115] (새 08) 사람 구간이 지금보다 낮은 크기로 시작하면(축사 · 편지 «음악과 함께» −15 → −20 등) 내림 시간(fadeDownMs 1.6초) · 오르는 사람 구간(화촉 −15 → −8)은 올림 2.0초 · 박수(upMs 1.5초)는 그대로
   C [HEARD_AUDIBLE_1115] (기존 07 확장) «음악만 멈춤» · 전체 볼륨 0 동안은 들린 기록(HEARD · REPEAT_FIX_1107 ①)이 쌓이지 않는다 · 풀면 다시 쌓인다(대조)
   D [MUTE_PRESSED_1115] (새 12) «음악만 멈춤» 단추 — aria-pressed 가 상태와 같다 · 켜진 동안 아랫줄 글이 상태를 말한다 · 단추 높이가 흔들리지 않는다(1280 · 390) · 전각 줄표 · 이모지 없음
   E [FILL_XF_1115] (새 10) 목록 칸 계획(BgmPicks.plan) — 콘솔 · 미리 듣기는 곡마다 겹침(xfOf · M8 · M1 · M6 6초 · M4 8초)만큼 일찍 다음 곡으로 넘긴다 →
       첫 반복 시각 = 곡 길이 합 − 곡 수 × 겹침 ≥ 칸 길이(NEED) · 빌려 올 곡이 남아 있는 칸(M8 · M4 · M6)에서 · 들린 기록으로 다시 짜는 길(heard)도 같다
   깨 보기: BP_CON=<옛 console.html> → A ① ② · B ① ② · C ① ② · D ① ② 빨강 / BP_PICKS=<옛 assets/bgm-picks.js> → E ① ③ 빨강 · ONLY=A 처럼 칸을 골라 돌린다
   곡 = 시험 사인파(구간마다 다른 높이) · 나레이션 = 0.6초 짧은 소리 · 큐는 손으로 낸다(__bgmGo.fire) · «뒤로» · «음악만 멈춤»은 실제 단추를 누른다
   ROOT = 저장소 뿌리(이 파일이 scripts/audit/ 에 있으면 저절로 · 밖에 두면 R2_ROOT 로) · 종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = process.env.R2_ROOT || path.join(HERE, '..', '..');
const CON = process.env.BP_CON || '', PICKS = process.env.BP_PICKS || '', ONLY = String(process.env.ONLY || '').toUpperCase(), want = (k) => !ONLY || ONLY.indexOf(k) > -1;
if (!fs.existsSync(path.join(ROOT, 'console.html'))) { console.log('못 쟀다 — console.html 이 없다(R2_ROOT 를 저장소 뿌리로): ' + ROOT); process.exit(2); }
let fail = 0, cant = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 700)}`); if (!c) fail++; };
const skip = (m) => { console.log('못 쟀다 — ' + m); cant++; };
const O = require(path.join(ROOT, 'assets/ritual-open.js')); require(path.join(ROOT, 'assets/ritual-data.js')); const RC = require(path.join(ROOT, 'assets/ritual-cue.js'));
const P = require(PICKS || path.join(ROOT, 'assets/bgm-picks.js'));
const SOF = (ex, add) => { const S = O.applyExample({ course: 'open' }, ex || 'standard'); S.course = 'open'; S.bgm = {}; return Object.assign(S, add || {}); };

/* ── E [FILL_XF_1115] 곡 계획(브라우저 없이) ── */
if (want('E')) {
  const fm = (s) => { s = Math.round(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const dOf = (f) => (P.lenOf(f, 0) || P.LEN0);
  const first = (L, sg) => L.reduce((a, f) => a + dOf(f), 0) - L.length * P.xfOf(sg);   /* 첫 반복이 시작하는 초 — 곡마다 겹침만큼 일찍 넘긴다(목록 끝 → 처음도 겹친다) */
  const rows = [];
  for (const ex of ['standard', 'record', 'family', 'brief']) {
    const S = SOF(ex), ks = new Set(RC.build(S, { mode: 'console' }).cues.map((c) => c.k));
    const on = (id) => { let d = P.seg(id); if (d && id === 'M8L' && !d.ks) d = Object.assign({}, d, { ks: ['_goodbye'] }); if (!d || !d.ks) return false; if (d.slot && !(S.bgm && S.bgm[d.slot] && S.bgm[d.slot].m === 'bed')) return false; return d.ks.some((k) => ks.has(k)); };   /* 콘솔 segOnC 와 같은 판정 */
    const pl = P.plan(S, { on });
    for (const sg of ['M4', 'M6', 'M8']) { const r = pl[sg]; if (!r) continue; rows.push({ ex, sg, n: r.list.length, 합: fm(r.list.reduce((a, f) => a + dOf(f), 0)), 첫반복: fm(first(r.list, sg)), 필요: fm(P.NEED[sg]), ok: first(r.list, sg) >= P.NEED[sg] }); }
  }
  console.log('  재 본 값 E', JSON.stringify(rows));
  const m8 = rows.filter((x) => x.sg === 'M8');
  if (!m8.length) skip('E — 테이블 인사(M8)가 담긴 예시 코스가 없다');
  else ok('E ① 테이블 인사(M8) 계획 — 첫 반복(합 − 곡 수 × 6초) ≥ 30분 · 예시 코스 전부 [FILL_XF_1115]', m8.every((x) => x.ok), m8);
  ok('E ② 본식(M4 · 8초) · 닫는 인사 → 사진(M6 · 6초) 계획도 첫 반복 ≥ 칸 길이', rows.filter((x) => x.sg !== 'M8').every((x) => x.ok), rows.filter((x) => x.sg !== 'M8'));
  /* ③ 들린 기록으로 다시 짜는 길(콘솔 · 미리 듣기 REPLAN) — 하객 맞이 3곡 · 화촉 · 본식 2곡 · 부모님께 인사가 들린 날(console-bed-1114 B 와 같은 꼴) */
  { const S = SOF('record'), ks = new Set(RC.build(S, { mode: 'console' }).cues.map((c) => c.k));
    const on = (id) => { let d = P.seg(id); if (d && id === 'M8L' && !d.ks) d = Object.assign({}, d, { ks: ['_goodbye'] }); if (!d || !d.ks) return false; return d.ks.some((k) => ks.has(k)); };
    const n = 5000, H = { B01: [-3300, 'M1', 240, -3060], B24: [-3060, 'M1', 240, -2820], B13: [-2820, 'M1', 238, -2580], B05: [-2500, 'M2', 130, -2370], B09: [-1900, 'M4', 118, -1700], B10: [-1500, 'M4', 200, -900], B15: [-400, 'M5', 200, -100] }, h = {};
    Object.keys(H).forEach((f) => { h[f] = { t0: n + H[f][0], seg: H[f][1], sec: H[f][2], last: n + H[f][3], lseg: H[f][1] }; });
    const r = (P.plan(S, { on, heard: h, now: n, seg: 'M8' }).M8 || {}).list || [];
    const rE = { 목록: r, 합: fm(r.reduce((a, f) => a + dOf(f), 0)), 첫반복: fm(first(r, 'M8')), 필요: fm(P.NEED.M8) };
    console.log('  재 본 값 E ③', JSON.stringify(rE));
    ok('E ③ 들린 기록으로 다시 짠 테이블 인사 목록도 첫 반복 ≥ 30분', r.length > 0 && first(r, 'M8') >= P.NEED.M8, rE); }
}

const BROWSER = ['A', 'B', 'C', 'D'].some(want);
if (!BROWSER) { console.log(fail ? `console-r2-1115: FAIL ${fail}` : cant ? `console-r2-1115: 못 잰 칸 ${cant}` : 'console-r2-1115: ok'); process.exit(fail ? 1 : cant ? 2 : 0); }

let pw = null; for (const p of ['playwright', path.join(process.env.NODE_PATH || '', 'playwright'), '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
function wav(sec, f, sr = 16000) { const n = Math.round(sr * sec), b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(f ? 8000 * Math.sin(2 * Math.PI * f * i / sr) : 0), 44 + i * 2); return b; }
const SHORT = wav(0.6, 330);   /* 나레이션 대신 — 0.6초 */
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
  if (/^\/assets\/audio\/narration\/.+\.mp3$/.test(u)) { r.writeHead(200, { 'Content-Type': 'audio/wav' }); r.end(SHORT); return; }
  const p = (CON && u === '/console.html') ? CON : (PICKS && u === '/assets/bgm-picks.js') ? PICKS : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
/* 탐침(쪽 안) — 곡 재생기마다 «스피커까지 gain 곱»을 0.05초마다 적는다(console-relift 와 같다) · 곡 이름 = 넣은 파일 이름 ·
   늦게 열림 흉내: 이름이 __slowName 인 곡의 play() 를 __slowMs 만큼 늦춘다 · 그사이 pause() 가 오면 실제 브라우저처럼 AbortError */
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
  HTMLMediaElement.prototype.pause = function () { this.__tk = (this.__tk || 0) + 1; return ps.call(this); }; })();`;
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'conr2-'));
const FILES = [['M1', 220], ['M2', 262], ['M4', 330], ['M5', 392], ['M6', 440]];
async function open(S, files, vp) {
  const ctx = await br.newContext(vp || { viewport: { width: 1280, height: 900 } }); await ctx.addInitScript(PROBE); await ctx.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; });
  const pg = await ctx.newPage(), errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: '{"ok":true}' })));
  await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S)).toString('base64'))}`); await pg.waitForTimeout(900);
  let put = 0; for (const [sg, hz] of (files || FILES)) { const p = path.join(TMP, sg + '.wav'); if (!fs.existsSync(p)) fs.writeFileSync(p, wav(30, hz)); try { await pg.setInputFiles(`.sg[data-seg="${sg}"] .sg-song:nth-of-type(1) [data-seg-file]`, p, { timeout: 4000 }); put++; } catch {} }
  await pg.waitForTimeout(1200); await pg.click('#go'); await pg.waitForTimeout(500);
  const hook = await pg.evaluate(() => typeof window.__bgmSt === 'function' && typeof window.__bgmR === 'function' && !!window.__bgmGo && !!window.__seg && !!window.__rl);
  const Rq = hook ? await pg.evaluate(() => window.__bgmR()) : [];
  const c = { ctx, pg, errs, ok: hook && put === (files || FILES).length, put, Rq,
    ix: (re, from) => Rq.findIndex((x, i) => i >= (from || 0) && re.test(x.slug || '')),
    fire: (i) => pg.evaluate((i) => { window.__bgmGo.fire(i); return performance.now(); }, i),
    on: () => pg.evaluate(() => { window.__rl.smp = []; window.__rl.on = true; }),
    waitDb: (nm, fn, ms) => pg.waitForFunction(([nm, f]) => { const a = window.__rl.smp, s = a[a.length - 1]; const v = s && s.s[nm]; return new Function('v', 'return ' + f)(v); }, [nm, fn], { timeout: ms || 20000 }).then(() => true, () => false),
    smp: () => pg.evaluate(() => window.__rl.smp) };
  return c;
}
const peak = (w, nm) => { let b = -140; for (const s of w) if (s.s[nm] != null && s.s[nm] > b) b = s.s[nm]; return b; };
const win = (smp, t0, ms) => smp.filter((s) => s.t >= t0 && s.t <= t0 + ms);
try {
  /* ── A [BACK_DROP_OPEN_1115] — 옛 판: 뒤로 뒤 1.1초에 화촉 곡이 −8 dB 로 오른다(다음 GO 없이 · ① 빨강) ── */
  if (want('A')) {
    const c = await open(SOF('standard'));
    const iG = c.ix(/^guest-w-arrival/), iO = c.ix(/^narr-open/), iC = c.ix(/^narr-candle-in/);
    if (!c.ok || [iG, iO, iC].some((x) => x < 0)) skip('A — 콘솔 점검 고리 · 큐 · 곡 파일 칸을 못 찾았다 ' + JSON.stringify({ ok: c.ok, put: c.put, iG, iO, iC }));
    else {
      await c.on(); await c.fire(iG); const g1 = await c.waitDb('M1', 'v != null && v > -30', 15000); await c.pg.waitForTimeout(4000);   /* 하객 맞이 곡이 자리를 잡은 겹침 뒷정리(3.1초)가 끝난 뒤에 — 그 전에 화촉 곡을 열면 뒷정리가 여는 재생기를 세운다(이 검사 밖의 좁은 창 · 보고에 적음) */
      await c.fire(iO); const q1 = await c.waitDb('M1', 'v == null || v <= -60', 15000); await c.pg.waitForTimeout(600);
      await c.pg.evaluate(() => { window.__slowName = 'M2'; window.__slowMs = 1300; });
      const tGo = await c.fire(iC); await c.pg.waitForTimeout(200);
      const tBk = await c.pg.evaluate(() => performance.now()); await c.pg.click('#bBack');
      await c.pg.waitForTimeout(10000);   /* 늦은 열림(1.3초) · 정적 차단 복원 타이머(8.6초)까지 */
      const sc = await c.pg.evaluate(() => ({ st: window.__bgmSt(), seg: window.__seg.st() }));
      const s1 = await c.smp(), W1 = win(s1, tBk, 10000);
      const rA = { 준비: [g1, q1], 뒤로뒤_화촉곡최고: peak(W1, 'M2'), 뒤로뒤_앞곡최고: peak(W1, 'M1'), 화면큐: sc.st.cur, 기대큐: iC - 1, 단계: sc.st.phase, 구간: sc.seg.seg, 지금곡: sc.seg.id, 여는중: sc.seg.opening, n: W1.length };
      console.log('  재 본 값 A ①', JSON.stringify(rA));
      if (!g1 || !q1 || W1.length < 150) skip('A — 준비(하객 맞이 곡 틀기 · 개식 정적) 또는 표본이 모자라다 ' + JSON.stringify(rA));
      else {
        ok('A ① 화촉 곡이 늦게 열리는 중 «뒤로» — 화면은 앞 큐 손 대기 · 늦게 열린 화촉 곡은 10초 내내 −60 dB 아래(다음 GO 없이 시작하지 않는다) [BACK_DROP_OPEN_1115]', rA.화면큐 === iC - 1 && rA.단계 === 'done' && rA.뒤로뒤_화촉곡최고 <= -60, rA);
        ok('A ② 꺼 둔 앞 곡(하객 맞이)도 10초 내내 −60 dB 아래(정적 차단 복원이 뒤로 때문에 앞 곡을 켜지 않는다)', rA.뒤로뒤_앞곡최고 <= -60, rA);
        await c.pg.evaluate(() => { window.__slowMs = 0; window.__rl.smp = []; }); const tRe = await c.fire(iC); await c.pg.waitForTimeout(5000);
        const s2 = await c.smp(), W2 = win(s2, tRe, 5000), rA3 = { 화촉곡최고: peak(W2, 'M2'), 앞곡최고: peak(W2, 'M1'), n: W2.length };
        console.log('  재 본 값 A ③', JSON.stringify(rA3));
        ok('A ③ 다시 GO — 화촉 곡이 5초 안에 −20 dB 위로 · 앞 곡은 −60 dB 아래 그대로', rA3.화촉곡최고 > -20 && rA3.앞곡최고 <= -60, rA3);
      }
      ok('A 쪽 오류 0', !c.errs.length, c.errs.slice(0, 3));
    }
    await c.ctx.close();
    /* 대조 — 뒤로 없이 늦게 열리면 종전대로 오른다 */
    const d = await open(SOF('standard'));
    if (d.ok && iG >= 0) {
      await d.on(); await d.fire(iG); const g2 = await d.waitDb('M1', 'v != null && v > -30', 15000); await d.pg.waitForTimeout(4000); await d.fire(iO); const q2 = await d.waitDb('M1', 'v == null || v <= -60', 15000); await d.pg.waitForTimeout(600);
      await d.pg.evaluate(() => { window.__slowName = 'M2'; window.__slowMs = 1300; }); const t0 = await d.fire(iC); await d.pg.waitForTimeout(6000);
      const W = win(await d.smp(), t0, 6000), rA4 = { 준비: [g2, q2], 화촉곡최고: peak(W, 'M2'), 앞곡최고: peak(W, 'M1') };
      console.log('  재 본 값 A ④', JSON.stringify(rA4));
      ok('A ④ 대조 — 뒤로 없이 늦게 열린 화촉 곡은 종전대로 오른다(−20 dB 위) · 앞 곡은 꺼진 채', g2 && q2 && rA4.화촉곡최고 > -20 && rA4.앞곡최고 <= -60, rA4);
    } else skip('A ④ — 콘솔을 못 열었다');
    await d.ctx.close();
  }
  /* ── B [LIVE_DOWN_MS_1115] — 옛 판: −15 → −20 사람 구간이 2.0초(올림 시간)로 내려간다(① ② 빨강) ── */
  if (want('B')) {
    const S = SOF('standard'); S.on = Object.assign({}, S.on, { letter: 1, song: 0 }); S.bgm = { S5: { m: 'bed' }, S6: { m: 'bed' } };
    const c = await open(S);
    const iW = c.ix(/^narr-welcome-in/), iF = c.ix(/^narr-free-in-speech/), iL = c.Rq.findIndex((x) => x.k === 'letter' && x.live), iCl = c.ix(/^bridge-b10-speech-clap/), iO = c.ix(/^narr-open/), iC = c.ix(/^narr-candle-in/);
    if (!c.ok || [iW, iF, iL, iCl, iO, iC].some((x) => x < 0)) skip('B — 콘솔 점검 고리 · 큐 · 곡 파일 칸을 못 찾았다 ' + JSON.stringify({ ok: c.ok, put: c.put, iW, iF, iL, iCl }));
    else {
      const PM = await c.pg.evaluate(() => ({ dn: (window.RitualCue && RitualCue.PARAM && RitualCue.PARAM.fadeDownMs) || null, up: (window.RitualCue && RitualCue.PARAM && RitualCue.PARAM.fadeUpMs) || null }));
      /* 큐 하나를 내고 사람 구간(live)에 들어선 순간의 크기 명령 — 그 직전 크기 · 새 크기 · 시간 · 실제 크기가 새 크기 0.5 dB 안에 드는 데 걸린 시간 */
      const liveOf = async (i, nm) => { await c.pg.evaluate(() => { window.__bgmLog = []; window.__rl.smp = []; }); await c.fire(i);
        const got = await c.pg.waitForFunction((i) => { const a = window.__bgmSt(); return a.cur === i && a.phase === 'live'; }, i, { timeout: 15000 }).then(() => true, () => false);
        const tL = await c.pg.evaluate(() => performance.now()); await c.pg.waitForTimeout(3500);
        const L = await c.pg.evaluate(() => window.__bgmLog.slice()), sm = await c.smp(), last = L[L.length - 1] || {}, prev = L[L.length - 2] || {};
        const W = win(sm, tL - 100, 3600).filter((s) => s.s[nm] != null), fin = W.length ? W[W.length - 1].s[nm] : null, hit = W.find((s) => fin != null && Math.abs(s.s[nm] - fin) <= 0.5);
        return { got, 앞: prev.db, 새: last.db, ms: last.ms, 닿음ms: hit ? Math.round(hit.t - tL) : null, 끝크기: fin }; };
      await c.on(); await c.fire(iW); await c.waitDb('M4', 'v != null && v > -40', 15000); await c.pg.waitForTimeout(2500);
      const rF = await liveOf(iF, 'M4');
      await c.fire(iCl); await c.pg.waitForTimeout(2500);
      const rL = await liveOf(iL, 'M4');
      const rCl = await liveOf(iCl, 'M4');
      console.log('  재 본 값 B', JSON.stringify({ PARAM: PM, 축사: rF, 편지: rL, 박수: rCl }));
      ok('B ① 축사 «음악과 함께» — 안내(−15) 뒤 낭독 −20 은 내림 시간(fadeDownMs 1.6초)으로 [LIVE_DOWN_MS_1115]', rF.got && rF.앞 === -15 && rF.새 === -20 && rF.ms === PM.dn, rF);
      ok('B ② 편지 «음악과 함께» — 안내(−15) 뒤 낭독 −20 도 1.6초', rL.got && rL.앞 === -15 && rL.새 === -20 && rL.ms === PM.dn, rL);
      ok('B ③ 대조 — 박수(축사 맺는 말 · upMs 1.5초)는 그대로 · 오르는 쪽', rCl.got && rCl.새 > rCl.앞 && rCl.ms === 1500, rCl);
      /* 화촉 — 오르는 사람 구간은 올림 2.0초 그대로 */
      await c.fire(iO); await c.pg.waitForTimeout(3500);
      const rC = await liveOf(iC, 'M2'); console.log('  재 본 값 B ④', JSON.stringify(rC));
      ok('B ④ 대조 — 화촉(−15 → −8 · 오르는 사람 구간)은 올림 시간(fadeUpMs 2.0초) 그대로', rC.got && rC.새 > rC.앞 && rC.ms === PM.up, rC);
      ok('B 쪽 오류 0', !c.errs.length, c.errs.slice(0, 3));
    }
    await c.ctx.close();
  }
  /* ── C [HEARD_AUDIBLE_1115] — 옛 판: 음악만 멈춤 · 볼륨 0 동안에도 0.25초마다 들린 초가 쌓인다(① ② 빨강) ── */
  if (want('C')) {
    const c = await open(SOF('standard'));
    const iG = c.ix(/^guest-w-arrival/);
    const ready = c.ok && iG >= 0 && await c.pg.evaluate(() => typeof window.__heard === 'function');
    if (!ready) skip('C — 콘솔 점검 고리(__heard) · 큐 · 곡 파일 칸을 못 찾았다');
    else {
      await c.on(); await c.fire(iG); const g = await c.waitDb('M1', 'v != null && v > -30', 15000); await c.pg.waitForTimeout(4500);   /* 첫 겹침(약 3.1초 · 그동안 곡 끝 감시기는 쉰다) 뒤 */
      const hs = () => c.pg.evaluate(() => { const h = window.__heard(), k = Object.keys(h); return k.length ? Math.round(k.reduce((a, f) => a + (h[f].sec || 0), 0) * 100) / 100 : 0; });
      const h0 = await hs(); await c.pg.click('#bMute'); await c.pg.waitForTimeout(300); const h1 = await hs(); await c.pg.waitForTimeout(5000); const h2 = await hs();
      await c.pg.click('#bMute'); await c.pg.waitForTimeout(3000); const h3 = await hs();
      await c.pg.evaluate(() => { const v = document.getElementById('vol'); v.value = 0; v.dispatchEvent(new Event('input')); }); await c.pg.waitForTimeout(300); const h4 = await hs(); await c.pg.waitForTimeout(5000); const h5 = await hs();
      await c.pg.evaluate(() => { const v = document.getElementById('vol'); v.value = 80; v.dispatchEvent(new Event('input')); }); await c.pg.waitForTimeout(3000); const h6 = await hs();
      const rC = { 준비: g, 처음: h0, 멈춤5초동안: Math.round((h2 - h1) * 100) / 100, 다시3초: Math.round((h3 - h2) * 100) / 100, 볼륨0_5초동안: Math.round((h5 - h4) * 100) / 100, 볼륨되돌림3초: Math.round((h6 - h5) * 100) / 100 };
      console.log('  재 본 값 C', JSON.stringify(rC));
      if (!g || h0 <= 0) skip('C — 하객 맞이 곡이 안 흘렀다 ' + JSON.stringify(rC));
      else {
        ok('C ① «음악만 멈춤» 5초 동안 들린 기록이 쌓이지 않는다(0.25초 한 칸까지) [HEARD_AUDIBLE_1115]', rC.멈춤5초동안 <= 0.25, rC);
        ok('C ② 전체 볼륨 0 의 5초 동안도 쌓이지 않는다', rC.볼륨0_5초동안 <= 0.25, rC);
        ok('C ③ 대조 — 풀면 다시 쌓인다(3초에 2초 넘게)', rC.다시3초 >= 2 && rC.볼륨되돌림3초 >= 2, rC);
      }
      ok('C 쪽 오류 0', !c.errs.length, c.errs.slice(0, 3));
    }
    await c.ctx.close();
  }
  /* ── D [MUTE_PRESSED_1115] — 옛 판: aria-pressed 없음 · 켜져도 아랫줄 «말은 그대로»(① ② 빨강) ── */
  if (want('D')) {
    for (const W of [1280, 390]) {
      const vp = W === 390 ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 900 } };
      const c = await open(SOF('standard'), [['M1', 220]], vp);
      if (!c.ok) { skip('D ' + W + ' — 콘솔을 못 열었다'); await c.ctx.close(); continue; }
      const st = () => c.pg.evaluate(() => { const b = document.getElementById('bMute'), s = b.querySelector('small'), r = b.getBoundingClientRect(), r3 = [...document.querySelectorAll('.sub3 button')].map((x) => Math.round(x.getBoundingClientRect().height)); return { ap: b.getAttribute('aria-pressed'), on: b.classList.contains('on'), txt: b.textContent.replace(/\s+/g, ' ').trim(), small: s ? s.textContent : '', h: Math.round(r.height), w: Math.round(r.width), row: r3, sc: s ? getComputedStyle(s).color : '', bg: getComputedStyle(b).backgroundColor }; });
      const s0 = await st(); if (W === 390) await c.pg.tap('#bMute'); else await c.pg.click('#bMute'); await c.pg.waitForTimeout(400); const s1 = await st();
      await c.pg.screenshot({ path: path.join(TMP, `mute-${W}.png`) }).catch(() => {});
      if (W === 390) await c.pg.tap('#bMute'); else await c.pg.click('#bMute'); await c.pg.waitForTimeout(400); const s2 = await st();
      const rD = { 처음: s0, 켬: s1, 끔: s2 }; console.log(`  재 본 값 D ${W}`, JSON.stringify(rD));
      ok(`D ① ${W} aria-pressed 가 상태와 같다(처음 false · 켜면 true · 끄면 false) [MUTE_PRESSED_1115]`, s0.ap === 'false' && s1.ap === 'true' && s1.on && s2.ap === 'false' && !s2.on, rD);
      ok(`D ② ${W} 켜진 동안 아랫줄 글이 상태를 말한다(꺼진 때와 다른 글 · 끄면 처음 글로)`, s1.small && s1.small !== s0.small && s2.small === s0.small, rD);
      ok(`D ③ ${W} 단추 높이 · 한 줄 세 단추 높이가 흔들리지 않는다 · 글에 전각 줄표 · 이모지 없음`, s0.h === s1.h && s1.h === s2.h && new Set(s1.row).size === 1 && !/[—\u{1F300}-\u{1FAFF}☀-➿]/u.test(s1.txt + s0.txt), rD);
      ok(`D ④ ${W} 쪽 오류 0`, !c.errs.length, c.errs.slice(0, 3));
      await c.ctx.close();
    }
    console.log('  화면 사진: ' + TMP + '/mute-1280.png · mute-390.png');
  }
} catch (e) { console.log('못 쟀다 —', String(e && e.stack || e).slice(0, 500)); try { await br.close(); } catch {} srv.close(); process.exit(2); }
await br.close(); srv.close();
console.log(fail ? `console-r2-1115: FAIL ${fail}` : cant ? `console-r2-1115: 못 잰 칸 ${cant}` : 'console-r2-1115: ok'); process.exit(fail ? 1 : cant ? 2 : 0);
