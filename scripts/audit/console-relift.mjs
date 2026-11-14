#!/usr/bin/env node
/* ★★[NO_RELIFT_XF_1114 2026-11-14 BGM 섹션 · 직접 넘겨 보기에서 잡음] 당일 콘솔 «정적 뒤 앞 곡 되살아남» 검사(ear-d.mjs 와 같은 하네스 방식)
   당일 콘솔(console.html) — 정적 뒤 구간 곡이 바뀔 때 «꺼져 있던 앞 곡»이 새 곡과 함께 되살아나지 않는다.
   ① 정적(개식 −90) 뒤 화촉 큐 — 하객 맞이 곡 재생기의 «스피커까지 크기 곱»이 요청 뒤 내내 −60 dB 아래 · 새 화촉 곡은 3.5초 안에 −20 dB 위로 오른다
   ② 정적(맞절 −90) 뒤 감사 인사 큐 — 화촉 곡 재생기가 요청 뒤 내내 −60 dB 아래 · 새 본식 곡은 3.5초 안에 −20 dB 위로
   ③ 대조 — 들리던 채 바뀌는 자리(감사 인사 곡이 들리는 중 부모님께 인사 큐)는 종전대로 겹쳐 넘긴다(두 곡이 함께 −40 dB 위로 1초 넘게)
   ④ 쪽 오류 0
   ⑤ 새 곡을 끝내 못 열 때(정적 뒤 화촉 곡 파일이 4초 안에 안 열림 · BED_OPEN_MS) — 꺼 두었던 앞 곡(하객 맞이)은 «앞 곡 그대로»(DETAIL_R3_1101 ②)로 돌아오되 계단 없이 0.8초에 걸쳐 오른다(bedUnhush) · 빨간 한 줄 «재생 중인 곡은 그대로»
   깨 보기: BP_CON=<옛 console.html> 로 돌리면 ① ② 가 빨강(앞 곡이 −9 ~ −13 dB 로 1.5 ~ 2초 되살아난다) · ③ 은 옛 판 · 새 판 모두 초록이어야 한다
   곡 = 30초 시험 사인파(구간마다 다른 높이) · 나레이션 = 0.6초 짧은 소리(시간을 줄이려고) · 큐는 손으로 낸다(__bgmGo.fire)
   ROOT = 저장소 뿌리(이 파일이 scripts/audit/ 에 있으면 저절로 · 밖에 두면 RELIFT_ROOT 로) · 종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = process.env.RELIFT_ROOT || path.join(HERE, '..', '..');
const CON = process.env.BP_CON || '';
if (!fs.existsSync(path.join(ROOT, 'console.html'))) { console.log('못 쟀다 — console.html 이 없다(RELIFT_ROOT 를 저장소 뿌리로): ' + ROOT); process.exit(2); }
let pw = null; for (const p of ['playwright', path.join(process.env.NODE_PATH || '', 'playwright'), '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const O = require(path.join(ROOT, 'assets/ritual-open.js'));
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 600)}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
function wav(sec, f, sr = 16000) { const n = Math.round(sr * sec), b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(f ? 8000 * Math.sin(2 * Math.PI * f * i / sr) : 0), 44 + i * 2); return b; }
const SHORT = wav(0.6, 330);   /* 나레이션 대신 — 0.6초 */
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
  if (/^\/assets\/audio\/narration\/.+\.mp3$/.test(u)) { r.writeHead(200, { 'Content-Type': 'audio/wav' }); r.end(SHORT); return; }
  const p = (CON && u === '/console.html') ? CON : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
/* 탐침(쪽 안) — 곡 재생기(미디어 요소 소스)마다 «스피커까지 gain 곱»을 0.05초마다 적는다 · 곡 이름 = 넣은 파일 이름 */
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
  var sd = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src'); Object.defineProperty(HTMLMediaElement.prototype, 'src', { configurable: true, get: function () { return sd.get.call(this); }, set: function (v) { this.__hang = !!(window.__hang && R.blob[v] === window.__hang); return sd.set.call(this, v); } });
  var pl = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { if (this.__hang) return new Promise(function () {}); return pl.apply(this, arguments); }; })();`;   /* [NO_RELIFT_XF_1114 ⑤] 이름이 __hang 인 곡은 재생이 시작되지 않는다(소리도 오류도 없이 · 4초 한도까지 «여는 중») */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'relift-'));
const FILES = [['M1', 220], ['M2', 262], ['M4', 330], ['M5', 392], ['M6', 440]];   /* 구간마다 첫 곡 칸에 30초 시험 곡 */
try {
  const S = O.applyExample({ course: 'open' }, 'standard'); S.course = 'open';
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); await ctx.addInitScript(PROBE); await ctx.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; });
  const pg = await ctx.newPage(), errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: '{"ok":true}' })));
  await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S)).toString('base64'))}`); await pg.waitForTimeout(900);
  let put = 0; for (const [sg, hz] of FILES) { const p = path.join(TMP, sg + '.wav'); fs.writeFileSync(p, wav(30, hz)); try { await pg.setInputFiles(`.sg[data-seg="${sg}"] .sg-song:nth-of-type(1) [data-seg-file]`, p, { timeout: 4000 }); put++; } catch {} }
  await pg.waitForTimeout(1200); await pg.click('#go'); await pg.waitForTimeout(500);
  const hook = await pg.evaluate(() => typeof window.__bgmSt === 'function' && typeof window.__bgmR === 'function' && !!window.__bgmGo && !!window.__rl);
  if (!hook || put < FILES.length) { console.log('못 쟀다 — 콘솔 점검 고리(__bgmSt · __bgmR · __bgmGo)가 없거나 곡 파일 칸을 못 찾았다(넣은 곡 ' + put + '/' + FILES.length + ')'); await br.close(); srv.close(); process.exit(2); }
  const Rq = await pg.evaluate(() => window.__bgmR()); const ix = (re, from) => Rq.findIndex((c, i) => i >= (from || 0) && re.test(c.slug || ''));
  const iG = ix(/^guest-w-arrival/), iO = ix(/^narr-open/), iC = ix(/^narr-candle-in/), iB = ix(/^narr-entry-bow/), iW = ix(/^narr-welcome-in/), iT = ix(/^narr-tribute-name/);
  if ([iG, iO, iC, iB, iW, iT].some((x) => x < 0)) { console.log('못 쟀다 — 큐를 못 찾았다', JSON.stringify({ iG, iO, iC, iB, iW, iT })); await br.close(); srv.close(); process.exit(2); }
  const fire = (i) => pg.evaluate((i) => { window.__bgmGo.fire(i); return performance.now(); }, i);
  const waitDb = (nm, fn, ms) => pg.waitForFunction(([nm, f]) => { const a = window.__rl.smp, s = a[a.length - 1]; const v = s && s.s[nm]; return new Function('v', 'return ' + f)(v); }, [nm, fn], { timeout: ms || 20000 }).then(() => true, () => false);
  await pg.evaluate(() => { window.__rl.on = true; });
  /* ① 하객 맞이 곡(M1)을 틀고 → 개식(정적) → 화촉 큐 */
  await fire(iG); const g1 = await waitDb('M1', 'v != null && v > -30', 15000);
  await fire(iO); const q1 = await waitDb('M1', 'v == null || v <= -60', 15000); await pg.waitForTimeout(600);
  const tA = await fire(iC); await pg.waitForTimeout(5200);
  /* ② 맞절(정적) → 감사 인사 큐 */
  await fire(iB); const q2 = await waitDb('M2', 'v == null || v <= -60', 15000); await pg.waitForTimeout(600);
  const tB = await fire(iW); await pg.waitForTimeout(5200);
  /* ③ 대조 — 본식 곡(M4)이 들리는 채로 부모님께 인사 큐(M5) */
  const a3 = await waitDb('M4', 'v != null && v > -30', 12000);
  const tC = await fire(iT); await pg.waitForTimeout(4800);
  const smp = await pg.evaluate(() => { window.__rl.on = false; return window.__rl.smp; });
  const win = (t0, ms) => smp.filter((s) => s.t >= t0 && s.t <= t0 + ms);
  const peak = (w, nm) => { let b = -140; for (const s of w) if (s.s[nm] != null && s.s[nm] > b) b = s.s[nm]; return b; };
  const above = (w, nm, th) => w.filter((s) => s.s[nm] != null && s.s[nm] > th).length * 50;
  const both = (w, a, b, th) => w.filter((s) => s.s[a] != null && s.s[a] > th && s.s[b] != null && s.s[b] > th).length * 50;
  const A = win(tA, 5000), B = win(tB, 5000), C = win(tC, 4500);
  const rA = { 준비: [g1, q1], 앞곡최고: peak(A, 'M1'), 앞곡_60위_ms: above(A, 'M1', -60), 새곡최고: peak(win(tA, 3500), 'M2'), n: A.length };
  const rB = { 준비: [q2], 앞곡최고: peak(B, 'M2'), 앞곡_60위_ms: above(B, 'M2', -60), 새곡최고: peak(win(tB, 3500), 'M4'), n: B.length };
  const rC = { 준비: [a3], 함께_40위_ms: both(C, 'M4', 'M5', -40), 앞곡최고: peak(C, 'M4'), 새곡최고: peak(C, 'M5'), n: C.length };
  console.log('  재 본 값 ①', JSON.stringify(rA)); console.log('  재 본 값 ②', JSON.stringify(rB)); console.log('  재 본 값 ③', JSON.stringify(rC));
  if (A.length < 60 || B.length < 60 || C.length < 50 || !g1 || !q1 || !q2) { console.log('못 쟀다 — 표본이 모자라거나 준비 단계(곡 틀기 · 정적)가 안 됐다'); await br.close(); srv.close(); process.exit(2); }
  ok('① 정적(개식) 뒤 화촉 큐 — 꺼져 있던 하객 맞이 곡이 요청 뒤 5초 내내 −60 dB 아래(되살아나지 않는다) [NO_RELIFT_XF_1114]', rA.앞곡최고 <= -60, rA);
  ok('① 새 화촉 곡은 3.5초 안에 −20 dB 위로 오른다', rA.새곡최고 > -20, rA);
  ok('② 정적(맞절) 뒤 감사 인사 큐 — 꺼져 있던 화촉 곡이 요청 뒤 5초 내내 −60 dB 아래 [NO_RELIFT_XF_1114]', rB.앞곡최고 <= -60, rB);
  ok('② 새 본식 곡은 3.5초 안에 −20 dB 위로 오른다', rB.새곡최고 > -20, rB);
  ok('③ 대조 — 들리던 채 바뀌는 자리(본식 곡 → 부모님께 인사 곡)는 겹쳐 넘긴다(두 곡이 함께 −40 dB 위로 1초 넘게)', a3 && rC.함께_40위_ms >= 1000, rC);
  ok('④ 쪽 오류 0', !errs.length, errs.slice(0, 3));
  await ctx.close();
  /* ⑤ 새 곡을 끝내 못 연다 — 하객 맞이 곡(M1) → 개식(정적) → 화촉 큐 · 화촉 곡(M2)은 답하지 않는 파일(4초 한도) */
  const ctx5 = await br.newContext({ viewport: { width: 1280, height: 900 } }); await ctx5.addInitScript(PROBE); await ctx5.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; window.__hang = 'M2'; });
  const p5 = await ctx5.newPage(), e5 = []; p5.on('pageerror', (e) => e5.push(e.message));
  await p5.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: '{"ok":true}' })));
  await p5.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S)).toString('base64'))}`); await p5.waitForTimeout(900);
  let put5 = 0; for (const [sg, hz] of FILES.slice(0, 2)) { const p = path.join(TMP, sg + '.wav'); try { await p5.setInputFiles(`.sg[data-seg="${sg}"] .sg-song:nth-of-type(1) [data-seg-file]`, p, { timeout: 4000 }); put5++; } catch {} }
  await p5.waitForTimeout(1200); await p5.click('#go'); await p5.waitForTimeout(500); await p5.evaluate(() => { window.__rl.on = true; });
  const fire5 = (i) => p5.evaluate((i) => { window.__bgmGo.fire(i); return performance.now(); }, i);
  const wait5 = (nm, fn, ms) => p5.waitForFunction(([nm, f]) => { const a = window.__rl.smp, s = a[a.length - 1]; const v = s && s.s[nm]; return new Function('v', 'return ' + f)(v); }, [nm, fn], { timeout: ms || 20000 }).then(() => true, () => false);
  await fire5(iG); const g5 = await wait5('M1', 'v != null && v > -30', 15000);
  await fire5(iO); const q5 = await wait5('M1', 'v == null || v <= -60', 15000); await p5.waitForTimeout(600);
  const tE = await fire5(iC); await p5.waitForTimeout(9000);
  const s5 = await p5.evaluate(() => { window.__rl.on = false; return { smp: window.__rl.smp, err: (window.__seg && window.__seg.st().err) || '' }; });
  const E = s5.smp.filter((s) => s.t >= tE && s.t <= tE + 9000), up = E.find((s) => s.t > tE + 1000 && s.s.M1 != null && s.s.M1 > -60);
  const fin5 = E.filter((s) => up && s.t >= up.t && s.t <= up.t + 2000 && s.s.M1 != null).map((s) => s.s.M1), lv5 = fin5.length ? Math.max(...fin5) : -140;
  const fast = up ? E.filter((s) => s.t >= up.t && s.t <= up.t + 300 && s.s.M1 != null && s.s.M1 > lv5 - 3).length : -1;
  const rE = { 준비: [put5, g5, q5], 되돌아옴_ms: up ? Math.round(up.t - tE) : null, 끝크기: lv5, 첫300ms_3dB안: fast, 글: s5.err, n: E.length };
  console.log('  재 본 값 ⑤', JSON.stringify(rE));
  if (put5 < 2 || !g5 || !q5 || E.length < 100) { console.log('못 쟀다 — ⑤ 준비 단계(곡 틀기 · 정적)가 안 됐다'); await br.close(); srv.close(); process.exit(2); }
  ok('⑤ 새 곡을 못 열면 꺼 둔 앞 곡이 «그대로» 돌아온다(4초 한도 뒤 · 끝 크기 −40 dB 위) [NO_RELIFT_XF_1114 bedUnhush]', !!up && rE.되돌아옴_ms >= 3500 && lv5 > -40, rE);
  ok('⑤ 돌아올 때 계단 없이 — 처음 0.3초는 돌아온 뒤 2초 안 최고 크기보다 3 dB 넘게 아래(0.8초에 걸쳐 오른다 · 한 번에 켜면 첫 표본부터 최고 크기)', fast === 0, rE);
  ok('⑤ 빨간 한 줄 «재생 중인 곡은 그대로 이어집니다» · 쪽 오류 0', /그대로 이어집니다/.test(s5.err) && !e5.length, { err: s5.err, e5: e5.slice(0, 3) });
  await ctx5.close();
} catch (e) { console.log('못 쟀다 —', String(e && e.stack || e).slice(0, 500)); try { await br.close(); } catch {} srv.close(); process.exit(2); }
await br.close(); srv.close(); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
console.log(fail ? `console-relift: FAIL ${fail}` : 'console-relift: ok'); process.exit(fail ? 1 : 0);
