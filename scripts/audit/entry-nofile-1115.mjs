#!/usr/bin/env node
/* ★★[ENTRY_NOFILE_OWNER_1115 2026-11-15 대표님 결정 A · BGM 결정 카드 ①] 당일 콘솔 — 두 분이 입장곡을 골랐는데 그 파일을 받지 못해 입장 장면이 못 서는 날
   ① 화촉(M2 곡) → 입장 준비(정적 · ENTRY_HUSH) → 입장 GO — 꺼 둔 화촉 곡 재생기가 GO 뒤 8초 내내 −60 dB 아래(되살아나지 않는다)
   ② 같은 GO 에서 본식 피아노(M4) 첫 곡이 새로 시작해 6초 안에 −30 dB 위로(걷기 크기로 · 짧은 입장곡 인계 ENTRY_SHORT 와 같은 곡)
   ③ 쪽 오류 0
   ④ [ENTRY_NOFILE_DUCK15_1115 대본 판단] 그 GO 에서 입장 멘트 아래 크기(duckWant) = 말 아래 표준 −15(입장 장면 값 −12 가 아니라)
   깨 보기: BP_CON=<옛 console.html> 이면 ① ② 빨강(종전 ENTRY_SCENE_DAY «못 받으면 배경음» = 화촉 곡이 걷기 크기로 되살아남)
   하네스는 console-relift.mjs 와 같다(시험 사인파 · 나레이션 0.6초 · 큐는 __bgmGo.fire) · 종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = process.env.NOFILE_ROOT || path.join(HERE, '..', '..');
const CON = process.env.BP_CON || '';
if (!fs.existsSync(path.join(ROOT, 'console.html'))) { console.log('못 쟀다 — console.html 이 없다(NOFILE_ROOT 를 저장소 뿌리로): ' + ROOT); process.exit(2); }
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
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'nofile-'));
/* [RELIFT_OBS_1115] 앞 곡 관측 — 요청 ±0.3초 안에 그 이름의 재생기가 보였나(재생 중 · 멈춤) · 판정 창 안에 길 끊김(u) 표본이 없나 · 아니면 «누락»(못 쟀다) */
const MISS = []; const obs = (smp, t0, ms, nm, tag) => { const near = smp.filter((x) => x.t >= t0 - 300 && x.t <= t0 + 300), seen = near.some((x) => x.s[nm] != null || (x.p && x.p[nm])), cut = smp.some((x) => x.t >= t0 && x.t <= t0 + ms && x.u && x.u[nm]);
  const r = seen && !cut ? '관측됨' : '누락'; if (r === '누락') MISS.push(tag + ' ' + nm + (seen ? '(창 안 길 끊김)' : '(요청 ±0.3초에 재생기 없음)')); return r; };
const FILES = [['M1', 220], ['M2', 262], ['M4', 330], ['M5', 392], ['M6', 440]];   /* 구간마다 첫 곡 칸에 30초 시험 곡 */
/* ★[ENTRY_NONE_1116 2026-11-16 대본 결정 · BGM GPT 라운드 3] 세 경우 — none = 입장 곡이 아예 없는 날(S.mu 없음) · nofile = 골랐는데 못 받은 날(GAS 응답 없음) · got = 받은 날(입장 장면이 선다)
   none · nofile: 입장 GO 뒤 화촉 곡이 걷기 크기로 남지 않고(6 ~ 8초 −60 아래 · none 은 3초 겹침으로 잦아듦) · 피아노(M4) 첫 곡이 6초 안에 −30 위 · 멘트 아래 −15
   got: 장면이 맡는다 — 피아노 · 화촉 곡 모두 8초 내내 −60 아래 · 멘트 아래는 입장 큐 값 그대로(−15 아님) */
const ENTRY_SEC = 60, ENTRY_HOOK = 30, FID = 'ENTRYFID0123456789ab';
async function runCase(kind) {
  const S = O.applyExample({ course: 'open' }, 'standard'); S.course = 'open';
  if (kind === 'nofile') S.mu = { src: 'up', fid: 'nofile-test', hook: 30, name: '시험 입장곡' };   /* 입장곡은 골랐지만 파일은 받지 못하는 날(GAS 응답 없음) */
  else if (kind === 'got') { S.entryVoice = 'nar'; S.mu = { src: 'up', name: 'song-day', t: '시험 곡', a: '', dur: ENTRY_SEC, hook: ENTRY_HOOK, typed: null, sid: 'x1', fid: FID }; }
  else delete S.mu;
  const SONG = kind === 'got' ? wav(ENTRY_SEC, 523).toString('base64') : '';
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); await ctx.addInitScript(PROBE); await ctx.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; });
  const pg = await ctx.newPage(), errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  const H = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue();
    if (kind === 'got' && /script\.google\.com/.test(u)) { let b = {}; try { b = JSON.parse(rt.request().postData() || '{}'); } catch {}
      if (b.fn === 'adminRitualFiles') return rt.fulfill({ status: 200, headers: H, body: JSON.stringify({ ok: true, sup: {}, files: [{ key: 'mu', id: FID, name: '입장 음악 · song-day.wav' }] }) });
      if (b.fn === 'adminRitualFileGet') return rt.fulfill({ status: 200, headers: H, body: JSON.stringify({ ok: true, id: FID, mime: 'audio/wav', data: SONG }) }); }
    return rt.fulfill({ status: 200, headers: H, body: '{"ok":false}' }); });
  const base = `http://127.0.0.1:${port}`;
  if (kind === 'got') { await pg.goto(base + '/console.html'); await pg.evaluate(() => { localStorage.setItem('me_admin_token', 'T0K'); }); }   /* 로컬 서버 · 가짜 값 */
  await pg.goto(`${base}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S)).toString('base64'))}` + (kind === 'got' ? '&rf=ME0001' : '')); await pg.waitForTimeout(900);
  let put = 0; for (const [sg, hz] of FILES) { const p = path.join(TMP, sg + '.wav'); fs.writeFileSync(p, wav(30, hz)); try { await pg.setInputFiles(`.sg[data-seg="${sg}"] .sg-song:nth-of-type(1) [data-seg-file]`, p, { timeout: 4000 }); put++; } catch {} }
  await pg.waitForTimeout(1200);
  if (kind === 'got') { const okE = await pg.waitForFunction(() => window.__esd && window.__esd.s().st === 'ok' && window.__esd.s().v0, null, { timeout: 60000 }).then(() => true, () => false); if (!okE) { await ctx.close(); return { skip: '받은 날 — 입장 장면 준비 안 됨 ' + JSON.stringify(await pg.evaluate(() => window.__esd && window.__esd.s()).catch(() => null)) }; } }
  await pg.click('#go'); await pg.waitForTimeout(500);
  const hook = await pg.evaluate(() => typeof window.__bgmR === 'function' && !!window.__bgmGo && !!window.__rl);
  if (!hook || put < FILES.length) { await ctx.close(); return { skip: '콘솔 점검 고리가 없거나 곡 파일 칸을 못 찾았다(넣은 곡 ' + put + '/' + FILES.length + ')' }; }
  const Rq = await pg.evaluate(() => window.__bgmR()); const ix = (re, from) => Rq.findIndex((c, i) => i >= (from || 0) && re.test(c.slug || ''));
  const iG = ix(/^guest-w-arrival/), iC = ix(/^narr-candle-in/), iR = ix(/^bridge-b7-entry-ready/), iE = ix(new RegExp('^entry-' + (S.entry || 'A') + '$'));
  if ([iG, iC, iR, iE].some((x) => x < 0)) { await ctx.close(); return { skip: '큐를 못 찾았다 ' + JSON.stringify({ iG, iC, iR, iE }) }; }
  await pg.evaluate(() => { window.__rl.on = true; });
  const fire = (i) => pg.evaluate((i) => { window.__bgmGo.fire(i); return performance.now(); }, i);
  const wait = (nm, fn, ms) => pg.waitForFunction(([nm, f]) => { const a = window.__rl.smp, s = a[a.length - 1]; const v = s && s.s[nm]; return new Function('v', 'return ' + f)(v); }, [nm, fn], { timeout: ms || 20000 }).then(() => true, () => false);
  await fire(iG); const g1 = await wait('M1', 'v != null && v > -40', 15000);
  await fire(iC); const g2 = await wait('M2', 'v != null && v > -40', 15000);
  await fire(iR); const q2 = kind === 'none' ? await wait('M2', 'v != null && v > -40', 15000) : await wait('M2', 'v == null || v <= -60', 15000); await pg.waitForTimeout(800);   /* none = 입장 장면이 없어 입장 준비에 화촉 곡을 끄지 않는다(멘트 아래 −15) */
  const tE = await fire(iE); await pg.waitForTimeout(250); const want = await pg.evaluate(() => window.__bgmSt && window.__bgmSt().want); await pg.waitForTimeout(7750);
  const sm = await pg.evaluate(() => { window.__rl.on = false; return window.__rl.smp; });
  const W = sm.filter((x) => x.t >= tE && x.t <= tE + 8000), pk = (nm, a, b) => { const v = W.filter((x) => x.t >= tE + a && x.t <= tE + b && x.s[nm] != null).map((x) => x.s[nm]); return v.length ? Math.max(...v) : -140; };
  const r = { kind, 준비: [g1, g2, q2], 화촉곡최고_0_8: pk('M2', 0, 8000), 화촉곡최고_6_8: pk('M2', 6000, 8000), 피아노최고_6초: pk('M4', 0, 6000), 피아노최고_8초: pk('M4', 0, 8000), 멘트아래: want, 표본: W.length, 쪽오류: errs.slice(0, 3) };
  if (kind !== 'none') obs(sm, tE, 8000, 'M2', kind);
  await ctx.close();
  if (!g1 || !g2 || !q2 || W.length < 100) return { skip: '준비(하객 맞이 · 화촉 곡 · 입장 준비)가 안 됐다 ' + JSON.stringify(r) };
  return r;
}
try {
  for (const kind of (process.env.NOFILE_CASES || 'none,nofile,got').split(',')) {
    const r = await runCase(kind); console.log('  재 본 값', JSON.stringify(r));
    if (r.skip) { console.log('못 쟀다 — ' + kind + ' · ' + r.skip); await br.close(); srv.close(); process.exit(2); }
    if (kind === 'nofile') {
      ok('① 입장곡을 못 받은 날 입장 GO — 꺼 둔 화촉 곡이 8초 내내 −60 dB 아래(되살아나지 않는다) [ENTRY_NOFILE_OWNER_1115]', r.화촉곡최고_0_8 <= -60, r);
      ok('② 못 받은 날 — 같은 GO 에서 본식 피아노(M4) 첫 곡이 6초 안에 −30 dB 위로(걷기 크기)', r.피아노최고_6초 > -30, r);
      ok('④ 못 받은 날 — 입장 멘트 아래 크기 −15(말 아래 표준) [ENTRY_NOFILE_DUCK15_1115]', r.멘트아래 === -15, { want: r.멘트아래 });
    } else if (kind === 'none') {
      ok('⑤ 입장 곡이 아예 없는 날 — 화촉 곡이 걷기 곡으로 남지 않는다(GO 뒤 6 ~ 8초 −60 아래 · 3초 겹침으로 잦아듦) [ENTRY_NONE_1116]', r.화촉곡최고_6_8 <= -60, r);
      ok('⑥ 아예 없는 날 — 본식 피아노(M4) 첫 곡이 6초 안에 −30 dB 위로 [ENTRY_NONE_1116]', r.피아노최고_6초 > -30, r);
      ok('⑦ 아예 없는 날 — 입장 멘트 아래 −15 [ENTRY_NONE_1116]', r.멘트아래 === -15, { want: r.멘트아래 });
    } else {
      ok('⑧ 받은 날 — 입장 장면이 맡는다: 피아노(M4)가 8초 내내 −60 아래 [ENTRY_NONE_1116]', r.피아노최고_8초 <= -60, r);
      ok('⑨ 받은 날 — 꺼 둔 화촉 곡도 8초 내내 −60 아래', r.화촉곡최고_0_8 <= -60, r);
      ok('⑩ 받은 날 — 멘트 아래는 입장 큐 값(−15 로 바꾸지 않는다)', r.멘트아래 !== -15, { want: r.멘트아래 });
    }
    ok('③ 쪽 오류 0 · ' + kind, !r.쪽오류.length, r.쪽오류);
  }
} catch (e) { console.log('못 쟀다 —', String(e && e.stack || e).slice(0, 500)); try { await br.close(); } catch {} srv.close(); process.exit(2); }
await br.close(); srv.close(); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
if (MISS.length) { console.log('못 쟀다 — 앞 곡 관측 누락: ' + MISS.join(' / ') + (fail ? ` · 그 밖 FAIL ${fail}` : '')); process.exit(2); }
console.log(fail ? `entry-nofile-1115: FAIL ${fail}` : 'entry-nofile-1115: ok'); process.exit(fail ? 1 : 0);
