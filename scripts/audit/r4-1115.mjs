#!/usr/bin/env node
/* ★★[R4_1115 2026-11-15 BGM 섹션 · GPT 라운드 4] 당일 콘솔(console.html) · 미리 듣기(assets/bgm-bed.js) 고침 묶음 — console-r3-1115 · pv-r3-1115 하네스 방식
   A [HEARD_XF_1115] (07) 본식 피아노 자연 넘김(8초 겹침) 동안에도 들린 초를 센다 — 기록 = 탐침이 잰 −60 dB 위 초(±1초) · 같은 곡이 두 재생기로 이어지면 한 번만 · 테이블 인사 목록에서 들린 B10 은 안 들린 B12 뒤
   B [DECLARE_PLAYABLE_1115] (01) 짧은 입장 곡 인계에서 본식 곡을 하나도 못 열어 음악 없이(m4None) 이은 뒤 선언 → 박수 — 못 연 곡을 다시 열지 않고 정적에 꺼진 화촉 곡도 되살리지 않는다
       ② 대조 — 본식 곡 하나(B10)만 열리는 날은 박수에 B10 을 강조 자리부터(DECLARE_ONE_1115 그대로) · 화촉 곡은 꺼진 채
   C [ENTRY_WAIT_HUSH_1115] (14) 미리 듣기 화촉 → 입장(뜸 없는 길) · 입장 곡이 1.5초 늦게 도착 — 기다리는 동안 화촉 곡은 정적(−60 dB 아래) · 입장 곡 시작은 한 번 · 강조는 구호 말끝 뒤 0 ~ 0.8초
       (강조 40초 곡 · 강조 0:05 곡 둘 다) · ③ 대조 — 제때 온 곡은 종전 그대로(한 번 · 0 ~ 0.8초)
   깨 보기: BP_CON=<옛 console.html> → A ① ② · B ① 빨강 / BP_BED=<옛 assets/bgm-bed.js> → C ① ② 빨강 · ONLY=AB 처럼 칸을 골라 돌린다
   ROOT = 저장소 뿌리(R4_ROOT 로 바꿀 수 있다) · 종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = process.env.R4_ROOT || path.join(HERE, '..', '..');
const CON = process.env.BP_CON || '', BEDJS = process.env.BP_BED || '', ONLY = String(process.env.ONLY || '').toUpperCase(), want = (k) => !ONLY || ONLY.indexOf(k) > -1;
if (!fs.existsSync(path.join(ROOT, 'console.html'))) { console.log('못 쟀다 — console.html 이 없다(R4_ROOT 를 저장소 뿌리로): ' + ROOT); process.exit(2); }
let fail = 0, cant = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 700)}`); if (!c) fail++; };
const skip = (m) => { console.log('못 쟀다 — ' + m); cant++; };
const O = require(path.join(ROOT, 'assets/ritual-open.js')); require(path.join(ROOT, 'assets/ritual-data.js'));
const SOF = (ex) => { const S = O.applyExample({ course: 'open' }, ex || 'standard'); S.course = 'open'; S.bgm = {}; return S; };
let pw = null; for (const p of ['playwright', path.join(process.env.NODE_PATH || '', 'playwright'), '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
function wav(sec, f, sr = 16000) { const n = Math.round(sr * sec), b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(f ? 8000 * Math.sin(2 * Math.PI * f * i / sr) : 0), 44 + i * 2); return b; }
const SHORT = wav(0.6, 330);
const done = () => { console.log(fail ? `r4-1115: FAIL ${fail}` : cant ? `r4-1115: 못 잰 칸 ${cant}` : 'r4-1115: ok'); process.exit(fail ? 1 : cant ? 2 : 0); };

/* ── 당일 콘솔 하네스(console-r3-1115 와 같다) ── */
function inject(h) { const a = h.indexOf("'use strict';"), e = a < 0 ? -1 : h.indexOf('\n</script>', a), z = e < 0 ? -1 : h.lastIndexOf('})();', e); if (z < 0) return h; return h.slice(0, z) + 'window.__r3i = function(s){ return eval(s); };\n' + h.slice(z); }
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
  window.__mkWav = function (sec, f, sr) { sr = sr || 8000; var n = Math.round(sr * sec), b = new ArrayBuffer(44 + n * 2), v = new DataView(b), s = function (o, t) { for (var i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    s(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); s(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); s(36, 'data'); v.setUint32(40, n * 2, true);
    for (var i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(8000 * Math.sin(2 * Math.PI * f * i / sr)), true); return b; };
  window.__put = function (ids, sec, bad) { ids.forEach(function (id, j) { var f = (bad || []).indexOf(id) > -1 ? new File([new Uint8Array(4000).fill(65)], id + '.wav', { type: 'audio/wav' }) : new File([window.__mkWav(sec || 40, 200 + j * 37)], id + '.wav', { type: 'audio/wav' }); window.__r3i('segAddFile')(id, f); }); }; })();`;
let br = null, srvC = null, portC = 0;
async function conSrv() { if (srvC) return; srvC = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
    if (/^\/assets\/audio\/narration\/.+\.mp3$/.test(u)) { r.writeHead(200, { 'Content-Type': 'audio/wav' }); r.end(SHORT); return; }
    const p = (CON && u === '/console.html') ? CON : path.join(ROOT, u);
    fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } if (u === '/console.html') b = Buffer.from(inject(b.toString('utf8'))); r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
  await new Promise((r) => srvC.listen(0, '127.0.0.1', r)); portC = srvC.address().port; }
async function openC(S, opt) {
  opt = opt || {}; await conSrv();
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); await ctx.addInitScript(PROBE); await ctx.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; });
  const pg = await ctx.newPage(), errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('dialog', (d) => d.accept().catch(() => {}));
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + portC) ? rt.continue() : rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: '{"ok":true}' })));
  await pg.goto(`http://127.0.0.1:${portC}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S)).toString('base64'))}`); await pg.waitForTimeout(900);
  const hook0 = await pg.evaluate(() => typeof window.__r3i === 'function' && typeof window.__put === 'function');
  if (hook0 && opt.files) await pg.evaluate(([ids, sec, bad]) => window.__put(ids, sec, bad), [opt.files, opt.sec || 40, opt.bad || []]);
  await pg.waitForTimeout(1500);
  await pg.evaluate(() => document.getElementById('go').click()); await pg.waitForTimeout(600);
  const hook = hook0 && await pg.evaluate(() => typeof window.__bgmSt === 'function' && !!window.__bgmGo && !!window.__seg && !!window.__rl && typeof window.__heard === 'function' && typeof window.__r3i('esdEnd') === 'function');
  return { ctx, pg, errs, ok: hook,
    fire: (i) => pg.evaluate((i) => { window.__bgmGo.fire(i); return performance.now(); }, i),
    now: () => pg.evaluate(() => performance.now()),
    on: () => pg.evaluate(() => { window.__rl.smp = []; window.__rl.on = true; }),
    st: () => pg.evaluate(() => window.__seg.st()),
    heard: () => pg.evaluate(() => { const h = window.__heard(), o = {}; Object.keys(h).forEach((f) => { o[f] = Math.round(h[f].sec * 100) / 100; }); return o; }),
    waitDb: (nm, fn, ms) => pg.waitForFunction(([nm, f]) => { const a = window.__rl.smp, s = a[a.length - 1]; const v = s && s.s[nm]; return new Function('v', 'return ' + f)(v); }, [nm, fn], { timeout: ms || 20000 }).then(() => true, () => false),
    smp: () => pg.evaluate(() => window.__rl.smp),
    w: (ms) => pg.waitForTimeout(ms) };
}
const peak = (w, nm) => { let b = -140; for (const s of w) { const v = nm ? s.s[nm] : Math.max(-140, ...Object.values(s.s)); if (v != null && v > b) b = v; } return b; };
const win = (smp, t0, ms) => smp.filter((s) => s.t >= t0 && s.t <= t0 + ms);
/* −60 dB 위 초 — 탐침 표본 사이 간격을 더한다(표본 0.05초) */
const aboveSec = (smp, t0, t1, nm) => { let s = 0; for (let i = 1; i < smp.length; i++) { const a = smp[i - 1], b = smp[i]; if (b.t < t0 || a.t > t1) continue; if (b.s[nm] != null && b.s[nm] > -60) s += Math.min(b.t, t1) - Math.max(a.t, t0); } return Math.round(s / 10) / 100; };
const entryEnd = (c, iE) => c.pg.evaluate((iE) => { window.__bgmGo.duck(-90, 10); return new Promise((ok) => setTimeout(() => { window.__r3i('cur = ' + iE + "; phase = 'clip'; ESD.short = true; ESD.run = { i: " + iE + ' }; esdEnd(ESD.run, true);'); ok(performance.now()); }, 300)); }, iE);

/* ── 미리 듣기 하네스(pv-r3-1115 와 같다 · 입장 구호만 실제 소리) ── */
const HAVE = ['B01', 'B05', 'B09', 'B10', 'B11', 'B12', 'B13', 'B15', 'B16', 'B17', 'B24', 'B28', 'B32'];
const SONG = {}; HAVE.forEach((k, i) => { SONG[k] = wav(40, 180 + i * 20).toString('base64'); });
const RS = { r5: wav(140, 250).toString('base64') };
const harness = (hk) => { const RL = [{ k: 'r5', name: '경쾌하게', t: '시험 입장 곡', a: '시험 가수', hook: hk, hook0: hk, len: 140, file: 'r5.mp3', img: '/assets/home/snap.webp', pos: '50% 50%' }];
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><iframe id="fr" style="width:100vw;height:100vh;border:0;display:block"></iframe>
<script>
window.H={rl:${JSON.stringify(RL)},rs:${JSON.stringify(RS)},log:[],draft:null,saved:null,delay:40,dly:{},hold:{},have:${JSON.stringify(HAVE)},songs:${JSON.stringify(SONG)}};
var fr=document.getElementById('fr');
function back(m){ fr.contentWindow.postMessage(m, location.origin); }
function later(id,fn,ms){ if(H.hold[id]){ var iv=setInterval(function(){ if(!H.hold[id]){ clearInterval(iv); fn(); } },40); } else setTimeout(fn,ms); }
window.go=function(){ fr.src='/order-preview.html?embed=1'; };
window.addEventListener('message',function(ev){ var d=ev.data||{}; if(ev.origin!==location.origin||ev.source!==fr.contentWindow) return;
  if(d.type==='momentedit:orderReady'){ back({type:'momentedit:orderFill',draft:H.draft,done:false,cust:{name:'시험',code:'TEST01'}}); return; }
  if(d.type==='momentedit:orderDraft'){ H.saved=1; back({type:'momentedit:orderDraftSaved'}); return; }
  if(d.type==='momentedit:ritualFileGet'){ var g=d.data;
    if(g.key==='rec'){ later(g.id==='list'?'':g.id,function(){ if(g.id==='list'){ back({type:'momentedit:ritualFileData',key:'rec',id:'list',ok:true,songs:H.rl}); return; }
        if(!H.rs[g.id]){ back({type:'momentedit:ritualFileData',key:'rec',id:g.id,ok:false,error:'곡을 불러오지 못했어요 (코드 L3)',ecode:'L3'}); return; }
        back({type:'momentedit:ritualFileData',key:'rec',id:g.id,ok:true,mime:'audio/wav',data:H.rs[g.id]}); }, H.delay); return; }
    if(g.key==='bed'){ later(g.id==='list'?'':g.id,function(){ if(g.id==='list'){ back({type:'momentedit:ritualFileData',key:'bed',id:'list',ok:true,songs:H.have.map(function(f){ return {f:f}; })}); return; }
        if(!H.songs[g.id]){ back({type:'momentedit:ritualFileData',key:'bed',id:g.id,ok:false,error:'곡 파일을 찾을 수 없어요. (코드 L3)',ecode:'L3'}); return; }
        back({type:'momentedit:ritualFileData',key:'bed',id:g.id,ok:true,mime:'audio/wav',data:H.songs[g.id]}); }, H.dly[g.id]!=null?H.dly[g.id]:H.delay); return; }
    back({type:'momentedit:ritualFileData',key:g.key,id:g.id,ok:false,error:'파일을 불러오지 못했어요 (코드 L6)',ecode:'L6'}); return; }
});
</script>`; };
const ENTRY_REAL = /\/(0[5-9]|10)_entry-[A-F]\.mp3$/;
const svs = [];
const serveP = async (hk) => { const HT = harness(hk); const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
    if (u === '/__harness.html') { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(HT); return; }
    if (/^\/assets\/audio\/narration\/.+\.mp3$/.test(u) && !ENTRY_REAL.test(u)) { r.writeHead(200, { 'Content-Type': 'audio/wav' }); r.end(SHORT); return; }
    const p = (BEDJS && u === '/assets/bgm-bed.js') ? BEDJS : path.join(ROOT, u);
    fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r)); svs.push(srv); return { srv, port: srv.address().port, hk }; };
const PPROBE = `(() => { if (window.__pv) return; var E = window.__pv = { st: [], na: [] }; var now = function(){ return performance.now(); };
  var AS = window.AudioBufferSourceNode && AudioBufferSourceNode.prototype; if (AS) { var s0 = AS.start; AS.start = function(w, off){ try { var ctxT = this.context ? this.context.currentTime : 0; E.st.push({ T: now() + Math.max(0, ((w || 0) - ctxT) * 1000), off: off || 0, dur: this.buffer ? this.buffer.duration : 0, buf: this.buffer }); } catch (e) {} return s0.apply(this, arguments); }; }
  var HP = HTMLMediaElement.prototype, op = HP.play; HP.play = function(){ var el = this; if (!el.__pvL) { el.__pvL = 1; ['playing', 'ended'].forEach(function(e){ el.addEventListener(e, function(){ E.na.push({ T: now(), e: e, src: String(el.getAttribute('src') || el.src || '').split('/').pop().split('?')[0] }); }); }); } return op.apply(this, arguments); };
})();`;
const PAD = require(path.join(ROOT, 'assets/narration-pad.js'));
const dB = (x) => (x > 0 ? 20 * Math.log10(x) : -200), r1 = (x) => Math.round(x * 10) / 10, r2 = (x) => Math.round(x * 100) / 100;
async function openP(sv, key, lateMs) {
  const ctx = await br.newContext({ viewport: { width: 390, height: 900 }, hasTouch: true }); await ctx.addInitScript(PPROBE); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + sv.port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${sv.port}/__harness.html`, { waitUntil: 'load' }); if (lateMs) await pg.evaluate(() => { H.hold.r5 = true; }); await pg.evaluate(() => go());
  await pg.waitForFunction(() => { const x = document.getElementById('fr'); return x.contentWindow && x.contentWindow.document.readyState === 'complete' && x.contentWindow.render; }, null, { timeout: 30000 }); await pg.waitForTimeout(900);
  const f = pg.frames().find((x) => /order-preview\.html/.test(x.url()));
  const nx = async () => { if (await f.isVisible('#next')) await f.click('#next'); else if (await f.isVisible('.pk-go')) await f.click('.pk-go'); await f.waitForTimeout(450); };
  await nx(); await nx();
  const mu = { src: 'rec', k: 'r5', t: '시험 입장 곡', a: '시험 가수', hook: sv.hk, hooks: [sv.hk], dur: 140 };
  await f.evaluate(({ k, mu }) => { RitualOpen.applyExample(S, k); S.bgm = {}; S.guestVoice = 'nar'; S.vsAsked = 1; S.mu = mu; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); }, { k: key, mu });
  await nx(); await f.waitForTimeout(800); await f.waitForFunction(() => !!(window.ENG && ENG.RitualCue), null, { timeout: 15000 }).catch(() => {});
  return { ctx, pg, f, errs };
}
/* 화촉 → 입장(흐름 보기 · 크게 보기) · 탐침 = 20ms 마다 지금 곡(BED.cur)의 곡 · 실제 크기 마디 값 · 입장 곡 시작(AudioBufferSourceNode.start) · 구호 소리(playing · ended) */
async function entryLate(sv, lateMs) { const { ctx, pg, f, errs } = await openP(sv, 'standard', lateMs);
  await f.evaluate(() => { const B = BgmBed._t; window.__pv.st.length = 0; window.__pv.na.length = 0; const R = window.__run = { o: [] };
    const i = STEPS.findIndex((x) => x.k === 'practice'); if (i > -1 && STEPS[idx].k !== 'practice') { idx = i; render(); } prWay('flow'); LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(_lRows().filter((k) => ['candle', 'entry'].indexOf(k) > -1), true); _lFull();
    (LP.q || []).forEach((x) => { if (x.talk || x.talk2 || x.said || x.act || x.quiet) x.ms = 1500; });
    R.iv = setInterval(() => { const v = B.BED.cur; R.o.push({ t: performance.now(), f: v && v.src ? v.f : '', g: v && v.src && v.g ? v.g.gain.value : 0, all: (B.BED.all || []).length }); }, 20); });
  const waitNa = (re, e, after, ms) => f.waitForFunction(({ re, e, after }) => window.__pv.na.some((x) => x.e === e && new RegExp(re).test(x.src) && x.T > after), { re, e, after }, { timeout: ms || 150000, polling: 50 });
  let rel = null; if (lateMs) { try { await waitNa('_entry-[A-F]\\.mp3', 'playing', 0); await f.waitForTimeout(lateMs); rel = await f.evaluate(() => performance.now()); await pg.evaluate(() => { H.hold.r5 = false; }); } catch (e) {} }
  try { await waitNa('_entry-[A-F]\\.mp3', 'ended', 0); await f.waitForTimeout(1500); } catch (e) {}
  const d = await f.evaluate(() => { const R = window.__run; clearInterval(R.iv); try { lsStop(); } catch (e) {} try { if (document.body.classList.contains('lsfull')) lsCloseBig(); } catch (e) {} const E = window.__pv, eb = (BgmBed._t.BUF['@ENT'] || {}).b;
    return { o: R.o, na: E.na.slice(), st: E.st.map((x) => ({ T: x.T, off: x.off, ent: !!(eb && x.buf === eb) })), ent: BgmBed._t.ENT() }; });
  await ctx.close();
  const pl = d.na.find((x) => x.e === 'playing' && /_entry-[A-F]\.mp3/.test(x.src)), en = d.na.find((x) => x.e === 'ended' && /_entry-[A-F]\.mp3/.test(x.src)), es = d.st.filter((x) => x.ent), x = d.ent && d.ent.x;
  if (!pl || !en || !es.length || !x) return { hk: sv.hk, lateMs, none: true, errs, pl: !!pl, en: !!en, es: es.length };
  const pd = PAD.of(pl.src) || [0, 0], callEnd = en.T - pd[1], aft = (s) => r2((s.T + (x.H - x.o - s.off) * 1000 - callEnd) / 1000);
  /* 화촉 곡(B05) 크기 — 구호가 시작된 때부터 입장 곡이 처음 시작할 때까지(기다리는 동안) */
  const t1 = es[0].T, cw = d.o.filter((o) => o.t >= pl.T && o.t <= t1 && o.f === 'B05'), cMax = cw.length ? r1(Math.max(...cw.map((o) => dB(o.g)))) : -200;
  return { hk: sv.hk, lateMs, errs, late: rel ? r2((rel - pl.T) / 1000) : null, starts: es.length, after: es.map(aft), offs: es.map((s) => r2(s.off)), candleMaxWait: cMax, waitSec: r2((t1 - pl.T) / 1000) }; }

try {
  br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
} catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); process.exit(2); }
try {
  /* ── A [HEARD_XF_1115] (07) — 옛 판: 8초 겹침 동안 들어오는 곡 · 나가는 곡 모두 기록이 빠진다(B10 −60 위 22초인데 14초대 · ① 빨강) · 같은 곡 잇기 3초 동안도 0(② 빨강) ── */
  if (want('A')) {
    const c = await openC(SOF('record'), { files: ['B09', 'B10', 'B11', 'B12', 'B14', 'B16', 'B23', 'B01'], sec: 40 });
    if (!c.ok) skip('A — 콘솔 점검 고리를 못 찾았다');
    else {
      await c.on(); await c.fire(14); const g = await c.waitDb('B09', 'v != null && v > -40', 15000); await c.w(1500);
      /* ② 같은 곡을 다른 재생기에서 강조 자리부터 3초 겹쳐 잇는다(곡 끝 · 말하는 자리 LIST_HOLD 와 같은 길) — 4초 동안 들린 초 = 4초(한 번만) */
      const hA = await c.heard(), tR0 = await c.pg.evaluate(() => { window.__r3i("bedPlay(BED.id, 3, reHookC(BED.id))"); return performance.now(); }); await c.w(4000);
      const hB = await c.heard(), tR1 = await c.now(), sm0 = await c.smp(), rA2 = { 준비: g, 들린초증가: r2((hB.B09 || 0) - (hA.B09 || 0)), 잰초: r2((tR1 - tR0) / 1000), 탐침: aboveSec(sm0, tR0, tR1, 'B09'), 재생기: (await c.st()).paused };
      console.log('  재 본 값 A ②', JSON.stringify(rA2));
      /* ① 본식 피아노 자연 넘김 — B09 끝 8초 겹침 → B10 · 겹침 시작에서 22.6초 뒤 기록과 탐침을 맞댄다 */
      const pr = await c.pg.evaluate(() => { const x = window.__r3i, B = x('BED'), el = B.el[B.on], X = x('segXf()'), m = x('SEGST').meta[B.id] || {}, end = x('BP').lenOf(B.id, m.end || el.duration); el.currentTime = Math.max(0, end - X - 0.1); return { X, end, id: B.id, seg: B.seg }; });
      const h0 = await c.heard(), tX = await c.now(); await c.w(22600); const h1 = await c.heard(), tY = await c.now(), sm = await c.smp();
      const rA1 = { 준비: pr, B10기록: r2((h1.B10 || 0) - (h0.B10 || 0)), B10탐침: aboveSec(sm, tX, tY, 'B10'), B09기록증가: r2((h1.B09 || 0) - (h0.B09 || 0)), B09탐침: aboveSec(sm, tX, tY, 'B09') };
      console.log('  재 본 값 A ①', JSON.stringify(rA1));
      /* ③ 그 뒤 부모님께 인사(B16 · 3초 겹침) → 테이블 인사 — 콘솔이 실제로 트는 목록 */
      await c.fire(17); await c.w(4500); await c.fire(22); await c.w(2500);
      const s3 = await c.st(), h3 = await c.heard(), L = s3.seg === 'M8' ? s3.list : [], i10 = L.indexOf('B10'), i12 = L.indexOf('B12');
      const rA3 = { 구간: s3.seg, 목록: L, 들린기록: h3 };
      console.log('  재 본 값 A ③', JSON.stringify(rA3));
      if (!g || pr.id !== 'B09' || pr.X !== 8) skip('A — 준비(본식 B09 · 8초 겹침)를 못 만들었다 ' + JSON.stringify({ g, pr }));
      else {
        ok('A ① 본식 피아노 8초 겹침 넘김 — 들어오는 B10 · 나가는 B09 의 들린 기록 = 탐침이 잰 −60 dB 위 초(±1초) · B10 20초 문턱을 넘는다 [HEARD_XF_1115]', Math.abs(rA1.B10기록 - rA1.B10탐침) <= 1 && rA1.B10기록 >= 20 && Math.abs(rA1.B09기록증가 - rA1.B09탐침) <= 1, rA1);
        ok('A ② 같은 곡을 두 재생기로 3초 겹쳐 이을 때 — 4초 동안 들린 초 ≈ 4초(한 번만 센다 · 3.5 ~ 4.5)', rA2.들린초증가 >= 3.5 && rA2.들린초증가 <= 4.5, rA2);
        ok('A ③ 테이블 인사 목록 — 들린 B10 은 빠지거나 아직 안 들린 본식 곡(B12) 뒤(REPEAT_FIX_1107 ① 빌려 오기 1순위 = 앞 칸에서 안 들린 곡)', s3.seg === 'M8' && i12 > -1 && (i10 < 0 || i10 > i12), rA3);
      }
      ok('A 쪽 오류 0', !c.errs.length, c.errs.slice(0, 3));
    }
    await c.ctx.close();
  }
  /* ── B [DECLARE_PLAYABLE_1115] (01) — 옛 판: 본식 곡을 다 못 열어 음악 없이 이은 뒤 박수에서 못 연 곡을 다시 열고 꺼진 화촉 곡(B05)을 −8 dB 로 되살린다(① 빨강) ── */
  if (want('B')) {
    for (const v of ['none', 'one']) {
      const c = await openC(SOF('family'), { files: ['B05', 'B09', 'B10'], bad: v === 'none' ? ['B09', 'B10'] : ['B09'], sec: 200 });   /* B10 강조 자리 120초 — 파일이 그보다 길어야 강조 자리에서 연다 */
      if (!c.ok) { skip('B — 콘솔 점검 고리를 못 찾았다'); await c.ctx.close(); continue; }
      const iD = await c.pg.evaluate(() => window.__r3i('R').cues.findIndex((x) => x.k === 'declare')), iN = await c.pg.evaluate(() => window.__r3i('R').cues.findIndex((x) => x.live && x.live.newSong));
      await c.on(); await c.fire(7); const g = await c.waitDb('B05', 'v != null && v > -30', 15000); await c.w(3000);
      await entryEnd(c, 11); await c.w(6000); const s0 = await c.st();
      for (const i of [12, 13, 14]) { await c.fire(i); await c.w(1500); }
      await c.fire(iD); await c.w(3000); if (iN !== iD) await c.fire(iN);
      const p0 = (await c.st()).plays, hk = await c.pg.evaluate(() => window.__r3i("reHookC('B10')"));
      const got = await c.pg.waitForFunction((i) => { const a = window.__bgmSt(); return a.cur === i && a.phase === 'live'; }, iN, { timeout: 15000 }).then(() => true, () => false);
      const tL = await c.now(); await c.w(5000);
      const s1 = await c.st(), W = win(await c.smp(), tL, 5000), t1 = await c.pg.evaluate(() => window.__r3i('BED.el[BED.on].currentTime'));
      const rB = { 판: v, 준비: [g, got, iD, iN], 인계뒤: { 지금곡: s0.id, 글: s0.err, 못연곡: s0.bad }, 박수요청: s1.plays - p0, 지금곡: s1.id, 못연곡: s1.bad, 글: s1.err, 화촉곡최고: peak(W, 'B05'), B09최고: peak(W, 'B09'), B10최고: peak(W, 'B10'), 강조자리: hk, 지금초: Math.round(t1 * 10) / 10 };
      console.log('  재 본 값 B ' + v, JSON.stringify(rB));
      if (!g || !got || iN < 0) skip('B — 준비(화촉 곡 · 선언 · 박수 사람 구간)를 못 만들었다 ' + JSON.stringify(rB));
      else if (v === 'none') ok('B ① 본식 곡을 하나도 못 연 날(m4None) 선언 뒤 박수 — 새 곡 요청 0 · 못 연 곡을 다시 열지 않는다 · 화촉 곡(B05)은 5초 내내 −60 dB 아래 [DECLARE_PLAYABLE_1115]', /본식 피아노/.test(rB.인계뒤.글 || '') && rB.박수요청 === 0 && rB.화촉곡최고 <= -60 && rB.B09최고 <= -60 && rB.B10최고 <= -60, rB);
      else ok('B ② 대조 — 본식 곡 하나(B10)만 열리는 날 박수 = B10 을 강조 자리부터(DECLARE_ONE_1115) · 화촉 곡은 −60 dB 아래', rB.지금곡 === 'B10' && rB.B10최고 > -30 && rB.화촉곡최고 <= -60 && rB.지금초 >= hk && rB.지금초 <= hk + 7, rB);
      ok('B 쪽 오류 0 · ' + v, !c.errs.length, c.errs.slice(0, 3));
      await c.ctx.close();
    }
  }
  /* ── C [ENTRY_WAIT_HUSH_1115] (14) — 옛 판: 늦은 입장 곡을 기다리는 동안 화촉 곡이 구호 크기로 되살아나고(① 빨강) · 강조 0:05 곡은 두 번 처음부터(② 빨강) ── */
  if (want('C')) {
    const Bv = await serveP(40), Bs = await serveP(5);
    const [c1, c2, c3] = await Promise.all([entryLate(Bv, 1500), entryLate(Bs, 1500), entryLate(Bv, 0)]);
    console.log('  재 본 값 C ① ' + JSON.stringify(c1) + ' | ② ' + JSON.stringify(c2) + ' | ③ 대조 ' + JSON.stringify(c3));
    const good = (x) => !x.none && x.starts === 1 && x.after[0] >= 0 && x.after[0] <= 0.8;
    ok('C ① 강조 40초 곡 · 1.5초 늦게 도착 — 기다리는 동안 화촉 곡 −60 dB 아래 · 입장 곡 시작 한 번 · 강조 말끝 뒤 0 ~ 0.8초 [ENTRY_WAIT_HUSH_1115]', good(c1) && c1.late >= 1.3 && c1.candleMaxWait <= -60, c1);
    ok('C ② 강조 0:05 곡 · 1.5초 늦게 도착 — 화촉 곡 −60 dB 아래 · 입장 곡 시작 한 번(곡 처음) · 강조 말끝 뒤 0 ~ 0.8초 [ENTRY_WAIT_HUSH_1115 · ENTRY_LATE_MUSIC_1115]', good(c2) && c2.late >= 1.3 && c2.candleMaxWait <= -60 && c2.offs[0] <= 0.05, c2);
    ok('C ③ 대조 — 제때 온 곡(강조 40초)은 종전 그대로(시작 한 번 · 0 ~ 0.8초)', good(c3), c3);
    ok('C 쪽 오류 0', [c1, c2, c3].every((x) => !x.errs.length), [c1, c2, c3].map((x) => x.errs.slice(0, 2)));
  }
} catch (e) { console.log('못 쟀다 —', String(e && e.stack || e).slice(0, 500)); try { await br.close(); } catch {} if (srvC) srvC.close(); svs.forEach((s) => s.close()); process.exit(2); }
await br.close(); if (srvC) srvC.close(); svs.forEach((s) => s.close());
done();
