#!/usr/bin/env node
/* ★★[NO_RELIFT_XF_1114 2026-11-14 BGM 섹션 · 직접 넘겨 보기에서 잡음] 당일 콘솔 «정적 뒤 앞 곡 되살아남» 검사(ear-d.mjs 와 같은 하네스 방식)
   당일 콘솔(console.html) — 정적 뒤 구간 곡이 바뀔 때 «꺼져 있던 앞 곡»이 새 곡과 함께 되살아나지 않는다.
   ① 정적(개식 −90) 뒤 화촉 큐 — 하객 맞이 곡 재생기의 «스피커까지 크기 곱»이 요청 뒤 내내 −60 dB 아래 · 새 화촉 곡은 3.5초 안에 −20 dB 위로 오른다
   ② 정적(맞절 −90) 뒤 감사 인사 큐 — 화촉 곡 재생기가 요청 뒤 내내 −60 dB 아래 · 새 본식 곡은 3.5초 안에 −20 dB 위로
   ③ 대조 — 들리던 채 바뀌는 자리(감사 인사 곡이 들리는 중 부모님께 인사 큐)는 종전대로 겹쳐 넘긴다(두 곡이 함께 −40 dB 위로 1초 넘게)
   ④ 쪽 오류 0
   ⑤ 새 곡을 끝내 못 열 때(정적 뒤 화촉 곡 파일이 4초 안에 안 열림 · BED_OPEN_MS) — 꺼 두었던 앞 곡(하객 맞이)은 «앞 곡 그대로»(DETAIL_R3_1101 ②)로 돌아오되 계단 없이 0.8초에 걸쳐 오른다(bedUnhush) · 빨간 한 줄 «재생 중인 곡은 그대로»
   ★★[NO_RELIFT_ALL_1115 · NO_RELIFT_WANT_1115 · M4_HANDOFF_NONE_1115 · NO_RELIFT_FB_1115 2026-11-15 BGM 섹션 · GPT 라운드 2] 칸을 더했다
   ⑥ 본식 피아노 목록 넘김(두 재생기 8초 겹침) 중 정적 → 부모님께 인사 큐 — 잦아들던 재생기까지 요청 뒤 5초 내내 −60 dB 아래 · 새 곡은 오른다
   ⑦ 선언처럼 4초에 걸쳐 내려가는 중(gBgm −60 ~ −54 dB · 청한 크기 −90)에 다른 구간(부모님께 인사)으로 점프 — 앞 곡이 점프 때 크기보다 오르지 않고 3.3초 뒤부터 −60 dB 아래(3초에 걸쳐 계속 내린다 · DUCK_SKIP_3S_OWNER_1115 · 종전 0.5초)
   ★[DUCK_SKIP_3S_OWNER_1115 2026-11-15 대표님 «추천대로» · BGM 결정 카드 ④ B] ⑩ 같은 내림의 «아직 들리는» 자리(0.6초째 · 약 −30 dB)에서 점프 — 앞 곡이 점프 때 크기보다 오르지 않고(새 큐가 전체 크기를 올려도) · 1.2 ~ 1.8초에도 아직 들리고(0.5초에 끄지 않는다) · 3.3초 뒤 −60 dB 아래
   ⑧ 짧은 입장 곡이 끝났는데 이어받을 본식 피아노(M4) 파일이 하나도 없다 — 꺼져 있던 화촉 곡이 입장 끝 뒤 8초 내내 −60 dB 아래 · 디렉터 상태 한 줄 «음악 없이 이어 가요»
   ⑨ Web Audio 가 없는 대체 경로(el.volume) — 정적 뒤 화촉 곡을 여는 데 1.5초 걸려도 하객 맞이 곡 볼륨이 요청 뒤 5초 내내 −60 dB 아래
   ★[RELIFT_OBS_1115] «앞 곡을 못 봤는데 −140 으로 초록»을 막는다 — 탐침은 재생 중 · 멈춤(src 그대로) · 길 끊김을 가려 적고, 판정 창 시작 ±0.3초 안에 앞 곡 재생기가 보이지 않거나(누락)
     창 안에서 길이 끊긴 표본이 있으면 그 칸은 «못 쟀다»(종료 2) · 멈춤 · 다른 곡으로 바뀐 뒤 사라짐은 «관측됨(소리 없음)»
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
  var AC = window.AudioContext || window.webkitAudioContext; if (AC) { var P = AC.prototype;
  var cg = P.createGain; P.createGain = function () { var n = cg.apply(this, arguments); n.__g = 1; return n; };
  var cm = P.createMediaElementSource; P.createMediaElementSource = function (el) { var n = cm.apply(this, arguments); n.__el = el; R.srcs.push(n); return n; };
  var co = AudioNode.prototype.connect, dc = AudioNode.prototype.disconnect;
  AudioNode.prototype.connect = function (d) { if (d && d instanceof AudioNode) (this.__out = this.__out || []).push(d); return co.apply(this, arguments); };
  AudioNode.prototype.disconnect = function (d) { if (d && d instanceof AudioNode) this.__out = (this.__out || []).filter(function (x) { return x !== d; }); else if (!arguments.length) this.__out = []; return dc.apply(this, arguments); }; }
  function down(n, seen) { if (n instanceof AudioDestinationNode) return 1; seen = seen || []; if (seen.indexOf(n) > -1) return null; seen.push(n); var best = null, outs = n.__out || [];
    for (var i = 0; i < outs.length; i++) { var r = down(outs[i], seen); if (r != null && (best == null || r > best)) best = r; } seen.pop(); if (best == null) return null; return n.__g ? best * n.gain.value : best; }
  setInterval(function () { if (!R.on) return; var o = { t: performance.now(), s: {} };
    var els = [].slice.call(document.querySelectorAll('audio')).filter(function (e) { return e.id !== 'aNarr'; });   /* [RELIFT_OBS_1115] 대체 경로(소스 마디 없음)는 el.volume */
    o.p = {}; o.u = {};
    els.forEach(function (el) { var nm = R.blob[el.getAttribute('src') || ''] || R.blob[el.currentSrc || '']; if (!nm) return; if (el.paused) { o.p[nm] = 1; return; }
      var s = R.srcs.filter(function (x) { return x.__el === el; })[0], g; if (s) { g = down(s); if (g == null) { o.u[nm] = 1; return; } g = g * el.volume; } else if (R.srcs.length) { o.u[nm] = 1; return; } else g = el.volume;
      var db = g > 1e-7 ? 20 * Math.log10(g) : -140; if (o.s[nm] == null || db > o.s[nm]) o.s[nm] = Math.round(db * 10) / 10; });
    R.smp.push(o); }, 50);
  var sd = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'src'); Object.defineProperty(HTMLMediaElement.prototype, 'src', { configurable: true, get: function () { return sd.get.call(this); }, set: function (v) { this.__hang = !!(window.__hang && R.blob[v] === window.__hang); return sd.set.call(this, v); } });
  var pl = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { if (this.__hang) return new Promise(function () {}); var d = window.__slow && window.__slow[R.blob[this.getAttribute('src') || '']]; if (d) { var me = this; return new Promise(function (ok, no) { setTimeout(function () { pl.apply(me).then(ok, no); }, d); }); } return pl.apply(this, arguments); }; })();`;   /* [NO_RELIFT_FB_1115 ⑨] __slow[이름] = 여는 데 걸리는 ms */   /* [NO_RELIFT_XF_1114 ⑤] 이름이 __hang 인 곡은 재생이 시작되지 않는다(소리도 오류도 없이 · 4초 한도까지 «여는 중») */
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'relift-'));
/* [RELIFT_OBS_1115] 앞 곡 관측 — 요청 ±0.3초 안에 그 이름의 재생기가 보였나(재생 중 · 멈춤) · 판정 창 안에 길 끊김(u) 표본이 없나 · 아니면 «누락»(못 쟀다) */
const MISS = []; const obs = (smp, t0, ms, nm, tag) => { const near = smp.filter((x) => x.t >= t0 - 300 && x.t <= t0 + 300), seen = near.some((x) => x.s[nm] != null || (x.p && x.p[nm])), cut = smp.some((x) => x.t >= t0 && x.t <= t0 + ms && x.u && x.u[nm]);
  const r = seen && !cut ? '관측됨' : '누락'; if (r === '누락') MISS.push(tag + ' ' + nm + (seen ? '(창 안 길 끊김)' : '(요청 ±0.3초에 재생기 없음)')); return r; };
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
  const A = win(tA, 5000), B = win(tB, 5000), C = win(tC, 4500); obs(smp, tA, 5000, 'M1', '①'); obs(smp, tB, 5000, 'M2', '②'); obs(smp, tC, 4500, 'M4', '③');
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
  await p5.evaluate(() => { var X = window.__xgs = []; window.__xgT = setInterval(function () { try { var st = window.__seg.st(); X.push({ t: performance.now(), on: st.on, xg: st.xg.slice() }); } catch (e) {} }, 20); });   /* [RELIFT_XG_1115] 재생기 크기 마디(xg)를 20ms 마다 — 전체 크기(gBgm)가 같이 움직여도 «앞 곡 재생기가 몇 초에 걸쳐 오르나»만 본다 */
  const tE = await fire5(iC); await p5.waitForTimeout(9000);
  const s5 = await p5.evaluate(() => { window.__rl.on = false; clearInterval(window.__xgT); return { smp: window.__rl.smp, xgs: window.__xgs, err: (window.__seg && window.__seg.st().err) || '' }; });
  obs(s5.smp, tE, 9000, 'M1', '⑤'); const E = s5.smp.filter((s) => s.t >= tE && s.t <= tE + 9000), up = E.find((s) => s.t > tE + 1000 && s.s.M1 != null && s.s.M1 > -60);
  const fin5 = E.filter((s) => up && s.t >= up.t && s.t <= up.t + 2000 && s.s.M1 != null).map((s) => s.s.M1), lv5 = fin5.length ? Math.max(...fin5) : -140;
  /* ★[RELIFT_XG_1115 2026-11-15] «계단 없이»는 앞 곡 재생기의 크기 마디(xg)로 잰다 — 종전엔 스피커까지 곱(전체 크기 · 화촉 말 아래 낮춤이 같이 움직임)의 «2초 안 최고 크기»와 견주어
       부하 때 표본 위상에 따라 0.8초 곡선도 빨강이 됐다(바탕 판도 4번 중 3번) · 기준: 오르기 시작한 뒤 0.1초 크기 ≤ 0.5(0.8초 직선이면 약 0.13 · 한 번에 켜면 1) · 1.5초 안에 0.9 위 */
  const X5 = (s5.xgs || []).filter((x) => x.t >= tE + 1000), k5 = X5.length ? X5[0].on : -1, x0 = X5.find((x) => x.xg[k5] != null && x.xg[k5] > 0.001);
  const at5 = (ms) => { const x = x0 && X5.find((y) => y.t >= x0.t + ms); return x ? x.xg[k5] : null; };
  const g100 = at5(100), gTop = x0 ? Math.max(...X5.filter((y) => y.t >= x0.t && y.t <= x0.t + 1500).map((y) => y.xg[k5] || 0)) : null;
  const fast = (x0 && g100 != null) ? (g100 <= 0.5 && gTop >= 0.9 ? 0 : 1) : -1;
  const rE = { 준비: [put5, g5, q5], 되돌아옴_ms: up ? Math.round(up.t - tE) : null, 끝크기: lv5, 재생기: k5, 오른뒤100ms_xg: g100, 최고xg_1500ms: gTop, 계단: fast, xg표본: X5.length, 글: s5.err, n: E.length };
  console.log('  재 본 값 ⑤', JSON.stringify(rE));
  if (put5 < 2 || !g5 || !q5 || E.length < 100) { console.log('못 쟀다 — ⑤ 준비 단계(곡 틀기 · 정적)가 안 됐다'); await br.close(); srv.close(); process.exit(2); }
  ok('⑤ 새 곡을 못 열면 꺼 둔 앞 곡이 «그대로» 돌아온다(4초 한도 뒤 · 끝 크기 −40 dB 위) [NO_RELIFT_XF_1114 bedUnhush]', !!up && rE.되돌아옴_ms >= 3500 && lv5 > -40, rE);
  ok('⑤ 돌아올 때 계단 없이 — 앞 곡 재생기 크기(xg)가 오르기 시작한 뒤 0.1초에 0.5 아래 · 1.5초 안에 0.9 위(0.8초에 걸쳐 오른다 · 한 번에 켜면 0.1초에 이미 1) [RELIFT_XG_1115]', fast === 0, rE);
  ok('⑤ 빨간 한 줄 «재생 중인 곡은 그대로 이어집니다» · 쪽 오류 0', /그대로 이어집니다/.test(s5.err) && !e5.length, { err: s5.err, e5: e5.slice(0, 3) });
  await ctx5.close();
  /* ── ⑥ ~ ⑨ (2026-11-15 GPT 라운드 2) — 콘솔 하나 여는 도우미 ── */
  const open = async ({ files, init, S1, rf, gas }) => { const cx = await br.newContext({ viewport: { width: 1280, height: 900 } }); await cx.addInitScript(PROBE); await cx.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; }); if (init) await cx.addInitScript(init);
    const pg = await cx.newPage(), er = []; pg.on('pageerror', (e) => er.push(e.message));
    await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); if (gas) { const g = gas(rt); if (g) return g; } return rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: '{"ok":true}' }); });
    if (rf) { await pg.goto(`http://127.0.0.1:${port}/console.html`); await pg.evaluate(() => { localStorage.setItem('me_admin_token', 'T0K'); }); }
    await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S1 || S)).toString('base64'))}${rf ? '&rf=' + rf : ''}`); await pg.waitForTimeout(900);
    let n = 0; for (const [sg, hz, sec, nth] of files) { const nm = sg + (nth > 1 ? 'b' : ''), q = fs.mkdtempSync(path.join(TMP, 'f')), f = path.join(q, nm + '.wav'); fs.writeFileSync(f, wav(sec, hz));   /* 곡 이름 = 파일 이름(탐침이 이 이름으로 적는다) */
      try { await pg.setInputFiles(`.sg[data-seg="${sg}"] .sg-song:nth-of-type(${nth || 1}) [data-seg-file]`, f, { timeout: 4000 }); n++; } catch {} }
    await pg.waitForTimeout(1200);
    return { cx, pg, er, n, fire: (i) => pg.evaluate((i) => { window.__bgmGo.fire(i); return performance.now(); }, i), now: () => pg.evaluate(() => performance.now()), on: () => pg.evaluate(() => { window.__rl.on = true; }), smp: () => pg.evaluate(() => { window.__rl.on = false; return window.__rl.smp; }),
      wait: (nm, fn, ms) => pg.waitForFunction(([nm, f]) => { const a = window.__rl.smp, s = a[a.length - 1]; const v = s && s.s[nm]; return new Function('v', 'return ' + f)(v); }, [nm, fn], { timeout: ms || 20000 }).then(() => true, () => false) }; };
  const peakW = (w, nm) => peak(w, nm), skip = (m) => { console.log('못 쟀다 — ' + m); MISS.push(m); };
  /* ⑥ 본식 피아노 목록 넘김(8초 겹침) 중 정적 → 부모님께 인사 — M4 · M4b(목록 둘째) 70초(추천 곡 강조 자리 50 ~ 120초 · 같은 곡을 강조 자리부터 이어 틀 수 있게) */
  { const c = await open({ files: [['M1', 220, 30], ['M4', 330, 70], ['M4', 350, 70, 2], ['M5', 392, 30]] }); await c.pg.click('#go'); await c.pg.waitForTimeout(500); await c.on();
    await c.fire(iG); await c.wait('M1', 'v != null && v > -30', 15000); await c.fire(iW); const a6 = await c.wait('M4', 'v != null && v > -30', 15000);
    const live = (n) => c.pg.waitForFunction((n) => { const s = window.__seg.st(); const m = s.paused.filter((p, k) => !p && s.src[k]).length; return !s.opening && (n === 1 ? m === 1 : m >= 2); }, n, { timeout: 30000, polling: 50 }).then(() => true, () => false);
    const one6 = await live(1); await c.pg.waitForFunction(() => window.__bgmSt().phase === 'live', null, { timeout: 15000 }).catch(() => {}); await c.pg.waitForTimeout(1000);
    await c.pg.evaluate(() => { const e = [...document.querySelectorAll('audio')].find((x) => x.id !== 'aNarr' && !x.paused && x.getAttribute('src')); if (e) e.currentTime = Math.max(0, e.duration - 9.5); });   /* 곡 끝 9.5초 전으로 건너뛴다(넘김을 기다리는 60초를 줄임) */
    const fl = one6 && (await live(2));   /* 하객 맞이 → 본식 곡 겹침(3초)이 끝나 한 대만 남은 뒤 · 본식 곡 끝 8초 전 넘김(말하는 자리면 같은 곡을 강조 자리부터 · LIST_HOLD)으로 다시 두 대 */
    await c.pg.waitForTimeout(600); await c.pg.evaluate(() => window.__bgmGo.duck(-90, 300)); await c.pg.waitForTimeout(800);
    const two = await c.pg.evaluate(() => { const s = window.__seg.st(); return s.paused.filter((p, k) => !p && s.src[k]).length; });
    const t6 = await c.fire(iT); await c.pg.waitForTimeout(5600); const sm = await c.smp(), w = sm.filter((x) => x.t >= t6 && x.t <= t6 + 5000);
    const r6 = { 준비: [c.n, a6, fl, two], M4최고: peakW(w, 'M4'), M4b최고: peakW(w, 'M4b'), M4_60위_ms: above(w, 'M4', -60) + above(w, 'M4b', -60), 새곡최고: peakW(sm.filter((x) => x.t >= t6 && x.t <= t6 + 3500), 'M5'), n: w.length };
    console.log('  재 본 값 ⑥', JSON.stringify(r6));
    if (c.n < 4 || !a6 || !fl || two < 2 || w.length < 60) skip('⑥ 준비(곡 넣기 · 본식 곡 · 목록 넘김 두 재생기)가 안 됐다');
    else { const nm6 = [...new Set(sm.filter((x) => x.t >= t6 - 300 && x.t <= t6).flatMap((x) => Object.keys(x.s)))].filter((n) => /^M4b?$/.test(n));   /* 말하는 자리면 같은 곡을 강조 자리부터(LIST_HOLD · 두 재생기 다 M4) · 아니면 목록 다음 곡(M4b) — 요청 직전 들리던 이름만 본다 */
      const o6 = nm6.map((n) => n + ':' + obs(sm, t6, 5000, n, '⑥')); if (!nm6.includes('M4')) skip('⑥ 요청 직전 본식 곡(M4) 재생기를 못 봤다');
      ok('⑥ 본식 목록 넘김(두 재생기 겹침) 중 정적 → 부모님께 인사 — 잦아들던 재생기까지 요청 뒤 5초 내내 −60 dB 아래 [NO_RELIFT_ALL_1115]', r6.M4최고 <= -60 && r6.M4b최고 <= -60, Object.assign({ o6 }, r6));
      ok('⑥ 새 곡(부모님께 인사)은 3.5초 안에 −20 dB 위로', r6.새곡최고 > -20, r6); ok('⑥ 쪽 오류 0', !c.er.length, c.er.slice(0, 3)); }
    await c.cx.close(); }
  /* ⑦ 선언처럼 4초 내림(−90)이 −52 ~ −60 dB 에 있을 때 부모님께 인사로 점프 */
  { const c = await open({ files: [['M1', 220, 30], ['M4', 330, 30], ['M5', 392, 30]] }); await c.pg.click('#go'); await c.pg.waitForTimeout(500); await c.on();
    await c.fire(iG); await c.wait('M1', 'v != null && v > -30', 15000); await c.fire(iW); const a7 = await c.wait('M4', 'v != null && v > -30', 15000); await c.pg.waitForFunction(() => window.__bgmSt().phase === 'live', null, { timeout: 15000 }).catch(() => {}); await c.pg.waitForTimeout(3000);   /* 감사 인사 사람 구간(−20)이 자리 잡은 뒤에 내린다 */
    await c.pg.evaluate(() => window.__bgmGo.duck(-90, 4000));
    const hit = await c.pg.waitForFunction(() => { const b = window.__earD().b; return b > 0 && 20 * Math.log10(b) <= -54; }, null, { timeout: 8000, polling: 10 }).then(() => true, () => false);
    const at = await c.pg.evaluate(() => { const b = window.__earD().b; return Math.round(20 * Math.log10(Math.max(1e-9, b)) * 10) / 10; });
    const t7 = await c.fire(iT); await c.pg.waitForTimeout(5600); const sm = await c.smp(), w = sm.filter((x) => x.t >= t7 && x.t <= t7 + 5000);
    const j0 = sm.filter((x) => x.t >= t7 - 120 && x.t <= t7 + 60 && x.s.M4 != null).map((x) => x.s.M4), lv0 = j0.length ? Math.max(...j0) : null;
    const r7 = { 준비: [c.n, a7, hit], 점프때_gBgm: at, 점프때_앞곡: lv0, M4최고: peakW(w, 'M4'), 뒤_M4최고: peakW(w.filter((x) => x.t >= t7 + 3300), 'M4'), M4_60위_ms: above(w, 'M4', -60), 새곡최고: peakW(sm.filter((x) => x.t >= t7 && x.t <= t7 + 3500), 'M5'), n: w.length };
    console.log('  재 본 값 ⑦', JSON.stringify(r7));
    if (c.n < 3 || !a7 || !hit || !(at > -60) || lv0 == null || w.length < 60) skip('⑦ 준비(본식 곡 · 내림 중 −60 위 자리)가 안 됐다 · 점프 때 ' + at + ' dB');
    else { const o = obs(sm, t7, 5000, 'M4', '⑦');
      ok('⑦ 정적으로 내려가는 중(청한 크기 −90 · 지금 −60 위)에 다른 구간으로 점프 — 앞 곡이 점프 때 크기보다 오르지 않고(1 dB 안) 3.3초 뒤부터 5초까지 −60 dB 아래 [NO_RELIFT_WANT_1115 · DUCK_SKIP_3S_OWNER_1115]', lv0 != null && r7.M4최고 <= Math.max(lv0, -60) + 1 && r7.뒤_M4최고 <= -60, Object.assign({ o }, r7));
      ok('⑦ 새 곡은 3.5초 안에 −20 dB 위로 · 쪽 오류 0', r7.새곡최고 > -20 && !c.er.length, { r7, er: c.er.slice(0, 3) }); }
    await c.cx.close(); }
  /* ⑩ [DUCK_SKIP_3S_OWNER_1115] 같은 4초 내림의 0.6초째(아직 들림)에 부모님께 인사로 점프 — 앞 곡은 3초에 걸쳐 계속 내려간다 */
  { const c = await open({ files: [['M1', 220, 30], ['M4', 330, 30], ['M5', 392, 30]] }); await c.pg.click('#go'); await c.pg.waitForTimeout(500); await c.on();
    await c.fire(iG); await c.wait('M1', 'v != null && v > -30', 15000); await c.fire(iW); const a10 = await c.wait('M4', 'v != null && v > -30', 15000); await c.pg.waitForFunction(() => window.__bgmSt().phase === 'live', null, { timeout: 15000 }).catch(() => {}); await c.pg.waitForTimeout(3000);
    await c.pg.evaluate(() => window.__bgmGo.duck(-90, 4000)); await c.pg.waitForTimeout(600);
    const t10 = await c.fire(iT); await c.pg.waitForTimeout(5600); const sm = await c.smp(), w = sm.filter((x) => x.t >= t10 && x.t <= t10 + 5000);
    const j0 = sm.filter((x) => x.t >= t10 - 120 && x.t <= t10 + 60 && x.s.M4 != null).map((x) => x.s.M4), lv0 = j0.length ? Math.max(...j0) : null;
    const mid = w.filter((x) => x.t >= t10 + 1200 && x.t <= t10 + 1800 && x.s.M4 != null).map((x) => x.s.M4);
    const r10 = { 준비: [c.n, a10], 점프때_앞곡: lv0, M4최고: peakW(w, 'M4'), 중간_M4최저: mid.length ? Math.min(...mid) : null, 뒤_M4최고: peakW(w.filter((x) => x.t >= t10 + 3300), 'M4'), 새곡최고: peakW(sm.filter((x) => x.t >= t10 && x.t <= t10 + 3500), 'M5'), n: w.length };
    console.log('  재 본 값 ⑩', JSON.stringify(r10));
    if (c.n < 3 || !a10 || lv0 == null || !(lv0 > -45) || w.length < 60) skip('⑩ 준비(본식 곡 · 내림 0.6초째 들리는 자리)가 안 됐다 · 점프 때 ' + lv0 + ' dB');
    else { const o = obs(sm, t10, 5000, 'M4', '⑩');
      ok('⑩ 들리는 크기에서 내려가던 중 점프 — 앞 곡이 점프 때 크기보다 오르지 않는다(1 dB 안 · 새 큐가 전체 크기를 올려도) [DUCK_SKIP_3S_OWNER_1115]', r10.M4최고 <= lv0 + 1, Object.assign({ o }, r10));
      ok('⑩ 앞 곡은 3초에 걸쳐 계속 내린다 — 1.2 ~ 1.8초에도 −60 dB 위(0.5초에 끄지 않는다) · 3.3초 뒤부터 −60 dB 아래 [DUCK_SKIP_3S_OWNER_1115]', mid.length > 3 && r10.중간_M4최저 > -60 && r10.뒤_M4최고 <= -60, r10);
      ok('⑩ 새 곡은 3.5초 안에 −20 dB 위로 · 쪽 오류 0', r10.새곡최고 > -20 && !c.er.length, { r10, er: c.er.slice(0, 3) }); }
    await c.cx.close(); }
  /* ⑧ 짧은 입장 곡(32초 · 강조 24초) · 본식 피아노(M4) 파일 없음 · 화촉 곡(M2) 있음 */
  { const SR = 22050, sec = 32, hook = 24, SONG = wav(sec, 220, SR).toString('base64'), FID = 'SONGID0123456789abcd';
    const S8 = Object.assign(O.applyExample({ course: 'open' }, 'standard'), { course: 'open', entry: 'A', bgm: {}, entryVoice: 'nar', mu: { src: 'up', name: 'song-day', t: '시험 곡', a: '', dur: sec, hook, typed: null, sid: 'x1', fid: FID } }); S8.on = Object.assign({}, S8.on, { prevideo: 0 });
    const gas = (rt) => { const u = rt.request().url(), H = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }; if (!/script\.google\.com/.test(u)) return null; let b = {}; try { b = JSON.parse(rt.request().postData() || '{}'); } catch {}
      if (b.fn === 'adminRitualFiles') return rt.fulfill({ status: 200, headers: H, body: JSON.stringify({ ok: true, sup: {}, files: [{ key: 'mu', id: FID, name: '입장 음악 · song-day.wav' }] }) });
      if (b.fn === 'adminRitualFileGet') return rt.fulfill({ status: 200, headers: H, body: JSON.stringify({ ok: true, id: FID, mime: 'audio/wav', data: SONG }) }); return null; };
    const c = await open({ files: [['M1', 220, 60], ['M2', 262, 60]], S1: S8, rf: 'ME0001', gas });
    await c.pg.waitForFunction(() => window.__esd.s().st === 'ok', null, { timeout: 60000 }).catch(() => {}); await c.pg.click('#go'); await c.pg.waitForTimeout(500);
    await c.pg.waitForFunction(() => window.__esd.s().v0 && window.__esd.idx().e >= 0, null, { timeout: 60000 }).catch(() => {});
    const R8 = await c.pg.evaluate(() => window.__bgmR()), jG = R8.findIndex((x) => /^guest-w-arrival/.test(x.slug || '')), jC = R8.findIndex((x) => /^narr-candle-in/.test(x.slug || '')), I = await c.pg.evaluate(() => window.__esd.idx());
    await c.on(); await c.fire(jG); await c.wait('M1', 'v != null && v > -30', 15000); await c.fire(jC); const m2 = await c.wait('M2', 'v != null && v > -30', 15000); await c.pg.waitForTimeout(3500);
    await c.pg.evaluate((j) => window.__esd.fire(j), I.e); await c.pg.waitForTimeout(500);
    for (let k = 0; k < 3 && !(await c.pg.evaluate(() => window.__esd.s().run)); k++) { await c.pg.waitForTimeout(1500); await c.pg.evaluate((j) => window.__esd.fire(j), I.e); await c.pg.waitForTimeout(500); }
    const es = await c.pg.evaluate(() => window.__esd.s()); const gone = await c.pg.waitForFunction(() => !window.__esd.s().run, null, { timeout: 60000 }).then(() => true, () => false); const t8 = await c.now();
    await c.pg.waitForTimeout(8200); const err = await c.pg.evaluate(() => (window.__seg.st().err || '')); const sm = await c.smp(), w = sm.filter((x) => x.t >= t8 && x.t <= t8 + 8000);
    const r8 = { 준비: [c.n, jG, jC, m2, es.run, es.short, gone], M2최고: peakW(w, 'M2'), M2_60위_ms: above(w, 'M2', -60), 글: err, n: w.length };
    console.log('  재 본 값 ⑧', JSON.stringify(r8));
    if (c.n < 2 || jG < 0 || jC < 0 || !m2 || !es.run || !es.short || !gone || w.length < 100) skip('⑧ 준비(화촉 곡 · 짧은 입장 장면 · 곡 끝)가 안 됐다');
    else { const o = obs(sm, t8, 8000, 'M2', '⑧');
      ok('⑧ 짧은 입장 곡이 끝났는데 이어받을 본식 피아노 파일이 없다 — 꺼져 있던 화촉 곡이 8초 내내 −60 dB 아래(배경을 올리지 않는다) [M4_HANDOFF_NONE_1115]', r8.M2최고 <= -60, Object.assign({ o }, r8));
      ok('⑧ 디렉터 상태 한 줄 «음악 없이 이어 가요» · 쪽 오류 0', /음악 없이 이어 가요/.test(err) && !c.er.length, { err, er: c.er.slice(0, 3) }); }
    await c.cx.close(); }
  /* ⑨ Web Audio 없음(대체 경로) — 하객 맞이 → 개식(정적) → 화촉 큐 · 화촉 곡은 여는 데 1.5초 */
  { const c = await open({ files: [['M1', 220, 30], ['M2', 262, 30]], init: 'window.AudioContext = undefined; window.webkitAudioContext = undefined; window.__slow = { M2: 1500 };' }); await c.pg.click('#go'); await c.pg.waitForTimeout(500); await c.on();
    await c.fire(iG); const g9 = await c.wait('M1', 'v != null && v > -30', 15000); await c.fire(iO); const q9 = await c.wait('M1', 'v != null && v <= -60', 15000); await c.pg.waitForTimeout(600);
    const t9 = await c.fire(iC); await c.pg.waitForTimeout(5600); const sm = await c.smp(), w = sm.filter((x) => x.t >= t9 && x.t <= t9 + 5000);
    const r9 = { 준비: [c.n, g9, q9], M1최고: peakW(w, 'M1'), M1_60위_ms: above(w, 'M1', -60), 새곡최고: peakW(w, 'M2'), n: w.length };
    console.log('  재 본 값 ⑨', JSON.stringify(r9));
    if (c.n < 2 || !g9 || !q9 || w.length < 60) skip('⑨ 준비(대체 경로 하객 맞이 곡 · 정적)가 안 됐다');
    else { const o = obs(sm, t9, 5000, 'M1', '⑨');
      ok('⑨ 대체 경로(el.volume) — 정적 뒤 새 곡을 여는 1.5초 동안 크기 명령이 와도 하객 맞이 곡이 5초 내내 −60 dB 아래 [NO_RELIFT_FB_1115]', r9.M1최고 <= -60, Object.assign({ o }, r9));
      ok('⑨ 새 곡(화촉)은 −20 dB 위로 · 쪽 오류 0', r9.새곡최고 > -20 && !c.er.length, { r9, er: c.er.slice(0, 3) }); }
    await c.cx.close(); }
} catch (e) { console.log('못 쟀다 —', String(e && e.stack || e).slice(0, 500)); try { await br.close(); } catch {} srv.close(); process.exit(2); }
await br.close(); srv.close(); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
if (MISS.length) { console.log('못 쟀다 — 앞 곡 관측 누락 · 준비 실패(RELIFT_OBS_1115): ' + MISS.join(' / ') + (fail ? ` · 그 밖 FAIL ${fail}` : '')); process.exit(2); }
console.log(fail ? `console-relift: FAIL ${fail}` : 'console-relift: ok'); process.exit(fail ? 1 : 0);
