#!/usr/bin/env node
/* ★★[PV_FIX_1114 2026-11-14 BGM 섹션 · 직접 넘겨 보기 + GPT 라운드 1 검증에서 재현된 미리 듣기(assets/bgm-bed.js) 고침 묶음] 깨 보기(옛 판 빨강) → 초록 → 대조
   소리는 «원하는 값(want)»이 아니라 실제 크기 마디 값(gain)으로 잰다 — 50분의 1초마다 · 나레이션은 실제로 소리가 난 때(playing · ended).
   ① [ARRIVE_SETTLE_PV_1114] 도착 멘트 첫 소리 때 입장 곡이 걷기 크기보다 18 dB 이상 아래 — 예시 코스 넷 × 연습 «흐름 보기» · «직접 해보기» · 이어 듣기(당일 콘솔 ear-d ② 와 같은 자)
        대조: 잦아듦은 멘트 0.8 ~ 1.4초 앞에 시작(사이를 늘리지 않는다) · 길이 4.5초 그대로(멘트 3.7초 뒤 −40 아래) · 걷는 동안 0 dB · 맞절 정적 · 입장만 따로 듣기(장면)는 제 잦아듦으로 이미 18 dB 아래
   ② [SONG_OPEN_FADE_PV_1114] 가족 코스 축가 여는 말 → MR 자리 — 본식 피아노가 1.5초에 걸쳐 꺼진다(당일 큐 post 1.5초 · 종전 0.3초) · 여는 말이 끝난 뒤 0.9초에도 아직 들리고 1.9초 뒤엔 정적
        대조: 내림은 한 번(다음 줄이 시작돼도 다시 걸지 않는다) · MR 자리 · 맺는 말은 정적 · 사이를 늘리지 않았다 · 정석(축가 앞이 이미 정적)은 내림 예약 0
   ③ [ENTRY_HOOK_PV_1114] 화촉 직후 입장(뜸 없는 길) — «입장!» 구호 말끝 → 입장 곡 강조 자리(문 열림) 0 ~ 0.8초(설계 0.3초 · 종전 5.3초 · 구호 길이를 모르면 1.4초) · 구호는 저장소의 실제 소리(약 20초)
        대조: 뜸 있는 길(입장부터 듣기)의 시작 자리는 H − 6 − (구호 앞 무음 + 말 길이) − 0.3(실제 구호 파일 · [ENTRY_LEAD_CALL_1115] 2026-11-15 · 종전 H − 6 − V − 0.3) · 입장만 따로 듣기(장면)의 설계 값 0.3초 · 화촉 곡과 입장 곡 사이 정적 1초 이상 · 곡 · 구호가 함께 시작
   ④ [BGM_OFF_STAYS_OFF_1114] 가족 코스 선언 뒤 박수 곡(새 곡)을 받는 중에 «음악 끄기» → 곡이 늦게 와도 새 소리 0 · «잠시 멈춤» → 멈춘 동안 새 소리 0 · 이어 들으면 그 새 곡이 그 줄 크기(−8)로
   ⑤ [LISTEN_LEN_PV_1114] 본식 순간 하나만 들을 때 곡 = 등록된 곡 길이로 센 당일 그 자리 곡 — 정석 축사 B10 · 축가 B11 · 가족 덕담 B10(종전 240초 셈 B09 · B10 · B09) · 화면 글 = 소리
   ONLY=1,2 … · BP_BED · BP_OP · BP_CUE = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const OP = process.env.BP_OP || '', BED = process.env.BP_BED || '', CUE = process.env.BP_CUE || '';
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 700)}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
function wav(sec, f, sr = 16000) { const n = Math.round(sr * sec), b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(f ? 8000 * Math.sin(2 * Math.PI * f * i / sr) : 0), 44 + i * 2); return b; }
const SHORT = wav(0.6, 330);   /* 나레이션 대신 — 0.6초(REAL 에 든 파일만 저장소의 실제 소리) */
const RL = [{ k: 'r5', name: '경쾌하게', t: '시험 입장 곡', a: '시험 가수', hook: 40, hook0: 40, len: 140, file: 'r5.mp3', img: '/assets/home/snap.webp', pos: '50% 50%' }];
const HAVE = ['B01', 'B05', 'B09', 'B10', 'B11', 'B12', 'B13', 'B15', 'B16', 'B17', 'B24', 'B28', 'B32'];
const SONG = {}; HAVE.forEach((k, i) => { SONG[k] = wav(40, 180 + i * 20).toString('base64'); });   /* 40초 — 재는 동안 곡 끝 이어 잇기가 끼지 않게 */
const RS = { r5: wav(140, 250).toString('base64') };
const HARNESS = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><iframe id="fr" style="width:100vw;height:100vh;border:0;display:block"></iframe>
<script>
window.H={rl:${JSON.stringify(RL)},rs:${JSON.stringify(RS)},log:[],draft:null,saved:null,delay:40,dly:{},hold:{},have:${JSON.stringify(HAVE)},songs:${JSON.stringify(SONG)}};
var fr=document.getElementById('fr');
function back(m){ fr.contentWindow.postMessage(m, location.origin); }
window.go=function(){ fr.src='/order-preview.html?embed=1'; };
window.addEventListener('message',function(ev){ var d=ev.data||{}; if(ev.origin!==location.origin||ev.source!==fr.contentWindow) return;
  if(d.type==='momentedit:orderReady'){ back({type:'momentedit:orderFill',draft:H.draft,done:false,cust:{name:'시험',code:'TEST01'}}); return; }
  if(d.type==='momentedit:orderDraft'){ H.saved=1; back({type:'momentedit:orderDraftSaved'}); return; }
  if(d.type==='momentedit:ritualFileGet'){ var g=d.data;
    if(g.key==='rec'){ setTimeout(function(){ if(g.id==='list'){ back({type:'momentedit:ritualFileData',key:'rec',id:'list',ok:true,songs:H.rl}); return; }
        if(!H.rs[g.id]){ back({type:'momentedit:ritualFileData',key:'rec',id:g.id,ok:false,error:'곡을 불러오지 못했어요 (코드 L3)',ecode:'L3'}); return; }
        back({type:'momentedit:ritualFileData',key:'rec',id:g.id,ok:true,mime:'audio/wav',data:H.rs[g.id]}); }, H.delay); return; }
    if(g.key==='bed'){ var send=function(){ if(g.id==='list'){ back({type:'momentedit:ritualFileData',key:'bed',id:'list',ok:true,songs:H.have.map(function(f){ return {f:f}; })}); return; }
        if(!H.songs[g.id]){ back({type:'momentedit:ritualFileData',key:'bed',id:g.id,ok:false,error:'곡 파일을 찾을 수 없어요. (코드 L3)',ecode:'L3'}); return; }
        back({type:'momentedit:ritualFileData',key:'bed',id:g.id,ok:true,mime:'audio/wav',data:H.songs[g.id]}); };
      if(H.hold[g.id]){ var iv=setInterval(function(){ if(!H.hold[g.id]){ clearInterval(iv); send(); } },40); } else setTimeout(send, H.dly[g.id]!=null?H.dly[g.id]:H.delay); return; }   /* hold = 그 곡 응답을 붙잡아 둔다(늦게 오는 곡) */
    back({type:'momentedit:ritualFileData',key:g.key,id:g.id,ok:false,error:'파일을 불러오지 못했어요 (코드 L6)',ecode:'L6'}); return; }
});
</script>`;
const serve = async (REAL) => { const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
    if (u === '/__harness.html') { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(HARNESS); return; }
    if (/^\/assets\/audio\/narration\/.+\.mp3$/.test(u) && !(REAL && REAL.test(u))) { r.writeHead(200, { 'Content-Type': 'audio/wav' }); r.end(SHORT); return; }
    const p = (OP && u === '/order-preview.html') ? OP : (BED && u === '/assets/bgm-bed.js') ? BED : (CUE && u === '/assets/ritual-cue.js') ? CUE : path.join(ROOT, u);
    fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r)); return { srv, port: srv.address().port }; };
const A = await serve(null), Bv = await serve(/\/(0[5-9]|10)_entry-[A-F]\.mp3$/);   /* Bv = 입장 구호만 실제 소리(③ · 구호 길이가 값이다) */
const PAD = require(path.join(ROOT, 'assets/narration-pad.js'));
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); A.srv.close(); process.exit(2); }
const MU = { src: 'rec', k: 'r5', t: '시험 입장 곡', a: '시험 가수', hook: 40, hooks: [40], dur: 140 };
/* 탐침 — 곡 소리 시작(AudioBufferSourceNode.start · 판 안 자리) · 나레이션이 실제로 소리 난 때를 적는다 */
const PROBE = `(() => { if (window.__pv) return; var E = window.__pv = { st: [], na: [], rp: [] }; var now = function(){ return performance.now(); };
  ['linearRampToValueAtTime', 'exponentialRampToValueAtTime'].forEach(function(m){ var o = window.AudioParam && AudioParam.prototype[m]; if (!o) return; AudioParam.prototype[m] = function(v, t){ try { var c = window.BgmBed && BgmBed._t.BED.cur; if (c && c.g && c.g.gain === this) E.rp.push({ T: now(), m: m.slice(0, 3), v: v, ms: Math.round((t - c.g.context.currentTime) * 1000), f: c.f }); } catch (e) {} return o.apply(this, arguments); }; });   /* 지금 곡 크기 마디에 걸린 내림 · 올림(모양 · 목표 · 길이) */
  var AS = window.AudioBufferSourceNode && AudioBufferSourceNode.prototype; if (AS) { var s0 = AS.start; AS.start = function(w, off){ try { E.st.push({ T: now(), off: off || 0, dur: this.buffer ? this.buffer.duration : 0, buf: this.buffer }); } catch (e) {} return s0.apply(this, arguments); }; }
  var HP = HTMLMediaElement.prototype, op = HP.play; HP.play = function(){ var el = this; if (!el.__pvL) { el.__pvL = 1; ['playing', 'ended'].forEach(function(e){ el.addEventListener(e, function(){ E.na.push({ T: now(), e: e, src: String(el.getAttribute('src') || el.src || '').split('/').pop().split('?')[0] }); }); }); } return op.apply(this, arguments); };
})();`;
async function open(port, key, { mu = true, W = 390, pre = null } = {}) {
  const ctx = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: W < 1000 }); await ctx.addInitScript(PROBE); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/__harness.html`, { waitUntil: 'load' }); if (pre) await pg.evaluate(pre); await pg.evaluate(() => go());
  await pg.waitForFunction(() => { const x = document.getElementById('fr'); return x.contentWindow && x.contentWindow.document.readyState === 'complete' && x.contentWindow.render; }, null, { timeout: 30000 }); await pg.waitForTimeout(900);
  const f = pg.frames().find((x) => /order-preview\.html/.test(x.url()));
  const nx = async () => { if (await f.isVisible('#next')) await f.click('#next'); else if (await f.isVisible('.pk-go')) await f.click('.pk-go'); await f.waitForTimeout(450); };
  await nx(); await nx();
  await f.evaluate(({ k, mu }) => { RitualOpen.applyExample(S, k); S.bgm = {}; S.guestVoice = 'nar'; S.vsAsked = 1; if (mu) S.mu = mu; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); }, { k: key, mu: mu ? MU : null });
  await nx(); await f.waitForTimeout(800); await f.waitForFunction(() => !!(window.ENG && ENG.RitualCue), null, { timeout: 15000 }).catch(() => {});
  return { ctx, pg, f, errs };
}
/* 듣기 시작 — way: flow · try(연습 큰 화면 · 그 범위만) · listen(② 이어 듣기) · 행동 · 차례 줄은 ms 로 줄인다 · 직접 해보기는 기다림 1.5초 뒤 «다 했어요»(prDone) · 20ms 마다 지금 줄 · 곡 · 크기 */
const start = (f, way, ks, ms) => f.evaluate(({ way, ks, ms }) => { const B = BgmBed._t; window.__pv.st.length = 0; window.__pv.na.length = 0; window.__pv.rp.length = 0; const R = window.__run = { o: [], t0: performance.now(), press: [] };
  if (way === 'listen') { mkGo(ks[0]); LP.fast = false; _lStart(ks, true); }
  else { const i = STEPS.findIndex((x) => x.k === 'practice'); if (i > -1 && STEPS[idx].k !== 'practice') { idx = i; render(); } prWay(way); LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(_lRows().filter((k) => ks.indexOf(k) > -1), true); _lFull(); }
  if (ms) (LP.q || []).forEach((x) => { if (x.talk || x.talk2 || x.said || x.act || x.quiet) x.ms = ms; });
  let wAt = 0; R.iv = setInterval(() => { const v = B.BED.cur, st = LP.q && LP.q[LP.i], n = performance.now();
    R.o.push({ t: n, i: LP.i, k: st && st.k, s: st ? (st.slug || '') : '', of: st ? (st.of || '') : '', act: !!(st && (st.act || st.quiet)), f: v && v.src ? v.f : '', want: v && v.src ? v.want : null, g: v && v.src && v.g ? v.g.gain.value : 0, pz: !!LP.paused });
    if (LP.wait && LP.wait === st) { if (!wAt) wAt = n; else if (n - wAt > (window.__hold || 1500)) { wAt = 0; R.press.push(n); try { prDone(); } catch (e) {} } } else wAt = 0; }, 20);
  return (LP.q || []).map((x) => x.k + ':' + (x.slug || x.of || '') + (x.act || x.quiet ? ':act' : '')); }, { way, ks, ms });
const stop = (f) => f.evaluate(() => { const R = window.__run; clearInterval(R.iv); try { lsStop(); } catch (e) {} try { if (document.body.classList.contains('lsfull')) lsCloseBig(); } catch (e) {} const E = window.__pv, eb = (BgmBed._t.BUF['@ENT'] || {}).b;
  return { o: R.o, press: R.press, na: E.na.slice(), rp: E.rp.slice(), st: E.st.map((x) => ({ T: x.T, off: x.off, dur: x.dur, ent: !!(eb && x.buf === eb) })), ent: BgmBed._t.ENT(), g0: (() => { try { const x = (BgmBed._t.BUF['@ENT'] || {}).ext; return x ? x.gain * Math.pow(10, x.trim / 20) : 0; } catch (e) { return 0; } })() }; });
const dB = (x) => (x > 0 ? 20 * Math.log10(x) : -200), r1 = (x) => Math.round(x * 10) / 10;
const gAt = (o, t) => { let b = null; for (const x of o) { if (!b || Math.abs(x.t - t) < Math.abs(b.t - t)) b = x; } return b ? b.g : 0; };
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean), want = (id) => !ONLY.length || ONLY.indexOf(String(id)) > -1;
const COURSES = ['standard', 'record', 'family', 'brief'];

/* ① 도착 멘트 — 코스 하나(쪽 하나)에서 세 길을 차례로 */
async function arrive(key) { const { ctx, f, errs } = await open(A.port, key); const out = {};
  for (const way of ['flow', 'try', 'listen']) { await f.evaluate(() => { try { BgmBed.turn(); } catch (e) {} window.__hold = 3000; }); const q = await start(f, way, ['entry', 'matjeol'], 3200);   /* 걷는 줄 3.2초 — 걷기 크기(0 dB)까지 다 오른 뒤 넘긴다 */
    try { await f.waitForFunction(() => window.__pv.na.some((x) => x.e === 'playing' && /narr-entry-arrive/.test(x.src)), null, { timeout: 60000, polling: 50 }); await f.waitForTimeout(5600); } catch (e) {}
    const d = await stop(f), vp = d.na.find((x) => x.e === 'playing' && /narr-entry-arrive/.test(x.src));
    if (!vp || !(d.g0 > 0)) { out[way] = { none: true, q: q.slice(0, 6), g0: d.g0 }; continue; }
    const tv = vp.T, w = d.o.filter((x) => x.t < tv - 1500 && x.k === 'entry' && x.f === '@ENT'), walk = w.filter((x) => x.act);
    const fall = d.rp.filter((x) => x.f === '@ENT' && x.v <= 1e-4 && x.T > tv - 4000 && x.T < tv + 1000)[0], mj = d.o.filter((x) => x.k === 'matjeol' && x.t > tv + 4200);   /* 무음으로 가는 첫 내림 예약 = 잦아듦 시작 */
    out[way] = { rel0: r1(dB(gAt(d.o, tv)) - dB(d.g0)), rel1: r1(dB(gAt(d.o, tv + 1000)) - dB(d.g0)), rel37: r1(dB(gAt(d.o, tv + 3700)) - dB(d.g0)), pre: r1(dB(gAt(d.o, tv - 1500)) - dB(d.g0)), lead: fall ? Math.round(tv - fall.T) : null, shape: fall ? fall.m + '/' + fall.ms : null, walkDb: walk.length ? r1(dB(Math.max(...walk.map((x) => x.g))) - dB(d.g0)) : null, walkWant: walk.length ? walk[walk.length - 1].want : null,
      gap: (() => { const a = d.o.find((x) => /narr-entry-arrive/.test(x.s)); return a ? Math.round(tv - a.t) : null; })(), mjOn: mj.filter((x) => x.f && x.want > -60).length, mjN: mj.length }; }
  await ctx.close(); return { key, out, errs }; }

/* ② 축가 여는 말 → MR 자리 */
async function songOpen(key) { const { ctx, f, errs } = await open(A.port, key, { mu: false }); await start(f, 'flow', ['bless', 'free', 'song'], 1500);
  try { await f.waitForFunction(() => window.__pv.na.some((x) => x.e === 'ended' && /narr-song(?!-(end|out))/.test(x.src)), null, { timeout: 150000, polling: 50 }); await f.waitForTimeout(4200); } catch (e) {}
  const d = await stop(f), en = d.na.filter((x) => x.e === 'ended' && /narr-song(?!-(end|out))/.test(x.src)).pop(); await ctx.close(); if (!en) return { key, none: true, errs, na: d.na.slice(-6) };
  const te = en.T, g0 = gAt(d.o, te - 120), pre = d.o.filter((x) => x.t < te - 120).pop() || {}, rps = d.rp.filter((x) => x.T > te - 300 && x.T < te + 2500), dn = rps.filter((x) => x.v <= 1e-4), i0 = (pre.i == null ? -1 : pre.i), nxt = d.o.find((x) => x.t > te && x.i > i0);
  const after = d.o.filter((x) => x.t > te + 2000 && x.k === 'song');
  return { key, errs, preWant: pre.want, preF: pre.f, r09: g0 > 0 ? r1(dB(gAt(d.o, te + 900)) - dB(g0)) : null, r19: g0 > 0 ? r1(dB(gAt(d.o, te + 1900)) - dB(g0)) : null, downs: dn.map((x) => x.m + '/' + x.ms + '@' + Math.round(x.T - te)), ramps: rps.length, ups: rps.length - dn.length, abs09: gAt(d.o, te + 900), gap: nxt ? Math.round(nxt.t - te) : null, afterOn: after.filter((x) => x.f && x.want > -60).length, afterN: after.length }; }

/* ③ 화촉 직후 입장 — vKnown: 입장 쪽을 먼저 열어 장면이 구호 길이(V)를 잰 뒤 */
async function hook(key, vKnown) { const { ctx, f, errs } = await open(Bv.port, key); let scene = null;
  if (vKnown) { await f.evaluate(() => { mkGo('entry'); }); await f.waitForFunction(() => { try { const p = EntryMusic._t.scene().plan; return !!(p && p.V > 1); } catch (e) { return false; } }, null, { timeout: 30000 }).catch(() => {}); await f.waitForTimeout(600);
    scene = await f.evaluate(() => { try { const p = EntryMusic._t.scene().plan; return { tv: p.tv, V: p.V, th: p.th }; } catch (e) { return null; } }); }
  await start(f, 'flow', ['candle', 'entry'], 1500);
  try { await f.waitForFunction(() => window.__pv.na.some((x) => x.e === 'ended' && /_entry-[A-F]\.mp3/.test(x.src)), null, { timeout: 150000, polling: 50 }); await f.waitForTimeout(1500); } catch (e) {}
  const d = await stop(f), pl = d.na.find((x) => x.e === 'playing' && /_entry-[A-F]\.mp3/.test(x.src)), en = d.na.find((x) => x.e === 'ended' && /_entry-[A-F]\.mp3/.test(x.src)), s0 = d.st.filter((x) => x.ent)[0], x = d.ent && d.ent.x;
  let lead = null, callD = 0;
  if (vKnown) { await f.evaluate(() => { try { BgmBed.turn(); } catch (e) {} }); await start(f, 'flow', ['entry', 'matjeol'], 1500); try { await f.waitForFunction(() => window.__pv.st.some((q) => q.buf === (BgmBed._t.BUF['@ENT'] || {}).b), null, { timeout: 30000, polling: 50 }); } catch (e) {} const d2 = await stop(f), s2 = d2.st.filter((q) => q.ent)[0]; lead = s2 ? r1(s2.off) : null; callD = await f.evaluate((u) => { const D = BgmBed._t.DUR; const k = Object.keys(D).find((q) => q.split('/').pop() === u); return k ? D[k] : 0; }, pl ? pl.src : ''); }
  await ctx.close(); if (!pl || !en || !s0 || !x) return { key, vKnown, none: true, errs, pl: !!pl, en: !!en, s0: !!s0 };
  const pd = PAD.of(pl.src) || [0, 0], hookAt = s0.T + (x.H - x.o - s0.off) * 1000, last = d.o.filter((q) => q.t < s0.T && q.f && q.f !== '@ENT' && q.want > -60).pop();
  return { key, vKnown, errs, V: x.V, off: r1(s0.off), callSec: r1((en.T - pl.T) / 1000), after: Math.round((hookAt - (en.T - pd[1])) / 10) / 100, together: Math.round(pl.T - s0.T), hush: last ? Math.round(s0.T - last.t) : null, lead, leadWant: callD > 0 ? r1(Math.max(0, x.H - 6 - pd[0] / 1000 - Math.max(0.5, callD - (pd[0] + pd[1]) / 1000) - 0.3 - x.o)) : null, scene: scene ? r1((scene.th - (scene.tv + scene.V)) * 10) / 10 : null }; }

/* ④ 박수 곡을 받는 중 끄기(off) · 멈춤(pause) — 박수 곡 응답을 붙잡아 두었다가 누른 뒤에 풀어 준다 */
async function lateClap(mode) { const { ctx, pg, f, errs } = await open(A.port, 'family', { mu: false, pre: () => { H.hold.B10 = true; } }); await start(f, 'flow', ['declare', 'bless'], 1500);
  const got = await f.evaluate(() => new Promise((res) => { const B = BgmBed._t, t0 = performance.now(), sl = ((ENG.RitualCue.build(S, { mode: 'console' }).cues || []).find((c) => c.live && c.live.newSong) || {}).slug || '';
    (LP.q || []).forEach((x) => { if (x.of === sl && (x.act || x.quiet)) x.ms = 25000; });   /* 박수 줄에 머문다 */
    const iv = setInterval(() => { const st = LP.q && LP.q[LP.i], b = B.BUF.B10; if (st && st.of === sl && (st.act || st.quiet) && b && b.st === 'wait' && b.cb && b.cb.length) { clearInterval(iv); res({ ok: true, sl, old: B.BED.cur && B.BED.cur.f }); } else if (performance.now() - t0 > 90000) { clearInterval(iv); res({ ok: false, sl, i: LP.i, b: b && b.st }); } }, 30); }));
  if (!got.ok) { await ctx.close(); return { mode, none: true, got, errs }; }
  const snap = () => f.evaluate(() => { const B = BgmBed._t, c = B.BED.cur, E = window.__pv, btn = document.querySelector('[data-fk="prmu"]'); return { T: performance.now(), src: !!(c && c.src), f: c && c.src ? c.f : '', want: c && c.src ? c.want : null, g: c && c.src && c.g ? c.g.gain.value : 0, st: E.st.length, btn: btn ? btn.textContent.trim() : '', pz: !!LP.paused, music: (typeof _prMusic === 'function') ? _prMusic() : null }; });
  const a0 = await snap(); let how = '';
  if (mode === 'off') how = await f.evaluate(() => { const b = document.querySelector('[data-fk="prmu"]'); if (b && b.offsetParent) { b.click(); return 'click'; } prMusicTgl(); return 'call'; }); else { await f.evaluate(() => { lsToggle(); }); how = 'lsToggle'; }
  await f.waitForTimeout(450); const a1 = await snap(); await pg.evaluate(() => { H.hold.B10 = false; }); await f.waitForTimeout(2600); const a2 = await snap(); let a3 = null;
  if (mode === 'pause') { await f.evaluate(() => { lsToggle(); }); await f.waitForTimeout(1600); a3 = await snap(); }
  await stop(f); await ctx.close();
  return { mode, how, errs, old: got.old, st0: a0.st, btn: a1.btn, music: a1.music, lateStarts: a2.st - a1.st, lateSrc: a2.src, lateF: a2.f, lateG: a2.g, pz: a2.pz, res: a3 ? { f: a3.f, want: a3.want, g: r1(dB(a3.g)), st: a3.st - a2.st, pz: a3.pz } : null }; }

/* ⑤ 순간 하나 듣기 곡 — 화면 함수 값 · 독립 셈(노드) · 실제로 깔린 곡 */
const PK = require(path.join(ROOT, 'assets/bgm-picks.js')), RO = require(path.join(ROOT, 'assets/ritual-open.js')); require(path.join(ROOT, 'assets/ritual-data.js')); const RC = require(CUE || path.join(ROOT, 'assets/ritual-cue.js'));
async function dayOne(key, lk, pair) { const { ctx, f, errs } = await open(A.port, key, { mu: false }); if (pair) await f.evaluate((w) => { RitualOpen.pairSet(S, w); try { opSync(); } catch (e) {} }, pair);   /* ★[SPEECH_SONG_1115] 정석 = 축가만 — 축사 쪽을 재는 판은 pairSet */ await f.evaluate(() => { mkGo('welcome'); }); await f.waitForFunction(() => BgmBed._t.AV.st === 'ok', null, { timeout: 20000 }).catch(() => {});
  const pg = await f.evaluate(() => { const q = RitualOpen.bodySeq(S).filter((k) => BgmBed.segAt(k) === 'M4' && RitualOpen.onOf(S, k)); return { q, list: (BgmBed._t.plan(false).M4 || {}).list || [], at: q.map((k) => BgmBed.dayAt(k)), nm: q.map((k) => BgmBed.dayName(k)) }; });
  /* 독립 셈 — 엔진 시간 합(말 est + 사람 구간)으로 그 순간 시작 초 · 곡마다 (등록 길이 − 겹침) */
  const S0 = RO.applyExample({ course: 'open' }, key), sec = {}; if (pair) RO.pairSet(S0, pair); (RC.build(S0, { mode: 'console' }).cues || []).forEach((c) => { sec[c.k] = (sec[c.k] || 0) + (+c.est || 0) + ((c.live && (+(c.live.fullEst || c.live.est) || 0)) || 0); });
  const L = pg.list.filter((x) => HAVE.indexOf(x) > -1), X = PK.xfOf('M4'); let t0 = 0; const exp = pg.q.map((k, i) => { let t = 0, r = L[0]; if (i > 0) for (let n = 0; n < 200; n++) { const x = L[n % L.length], d = Math.max(30, (PK.lenOf(x, 0) || PK.LEN0) - X); if (t + d > t0) { r = x; break; } t += d; } const o = { k, start: Math.round(t0), f: r }; t0 += sec[k] || 0; return o; });
  let heard = null; if (lk) { await f.evaluate((k) => { mkGo(k); }, lk); await f.waitForTimeout(700); await f.evaluate((k) => { window.__pv.st.length = 0; lsPlay(k); }, lk);
    await f.waitForFunction(() => { const c = BgmBed._t.BED.cur; return !!(c && c.src && c.want > -60); }, null, { timeout: 30000, polling: 50 }).catch(() => {}); heard = await f.evaluate(() => { const c = BgmBed._t.BED.cur; return c && c.src ? c.f : ''; }); await f.evaluate(() => { try { lsStop(); } catch (e) {} }); }
  await ctx.close(); return { key, errs, q: pg.q, at: pg.at, nm: pg.nm, exp, heard, names: pg.at.map((x) => (PK.byF(x) || {}).t || '') }; }

try {
  if (want(5)) { const [sd, fa, ss] = await Promise.all([dayOne('standard', 'free', 'free'), dayOne('family', 'bless'), dayOne('standard')]);   /* [SPEECH_SONG_1115] sd = 정석 축사 쪽 · ss = 정석 그대로(축가만) */ const at = (r, k) => r.at[r.q.indexOf(k)];
    console.log('  재 본 값 ⑤ 정석 ' + sd.q.map((k, i) => `${k}@${sd.exp[i].start}초=${sd.at[i]}`).join(' ') + ' · 들린 곡(축사) ' + sd.heard + ' · 가족 ' + fa.q.map((k, i) => `${k}@${fa.exp[i].start}초=${fa.at[i]}`).join(' ') + ' · 들린 곡(덕담) ' + fa.heard);
    /* ★[SPEECH_SONG_1115 · RULES_SLIM ⑧] 옛 기대 «정석 서약 B09 · 축사 B10 · 축가 B11»(축사 · 축가 한 판) → 정석 축사 쪽 서약 B09 · 축사 B10 · 정석(축가만) 서약 B09 · 축가 B10 */
    ok('⑤ 순간 하나 듣기 곡(고정 값) — 정석 축사 쪽 서약 B09 · 축사 B10 · 정석(축가만) 서약 B09 · 축가 B10 · 가족 선언 B09 · 덕담 B10 · 축가 B10', at(sd, 'vow') === 'B09' && at(sd, 'free') === 'B10' && sd.q.indexOf('song') < 0 && at(ss, 'vow') === 'B09' && at(ss, 'song') === 'B10' && ss.q.indexOf('free') < 0 && at(fa, 'declare') === 'B09' && at(fa, 'bless') === 'B10' && at(fa, 'song') === 'B10', [sd.q.map((k, i) => k + '=' + sd.at[i]), ss.q.map((k, i) => k + '=' + ss.at[i]), fa.q.map((k, i) => k + '=' + fa.at[i])]);
    ok('⑤ 독립 셈(엔진 시간 합 · 등록 길이 − 겹침)과 같다 — 본식 순간 전부', [sd, fa, ss].every((r) => r.q.length >= 3 && r.exp.every((x, i) => x.f === r.at[i])), [sd, fa].map((r) => r.exp.map((x, i) => [x.k, x.start, x.f, r.at[i]])));
    ok('⑤ 화면 글(dayName) = 그 곡 이름 · 실제로 깔린 곡도 그 곡(정석 축사 · 가족 덕담)', [sd, fa, ss].every((r) => r.nm.every((n, i) => n && n === r.names[i])) && sd.heard === 'B10' && fa.heard === 'B10', { sd: [sd.nm, sd.heard], fa: [fa.nm, fa.heard] });
    ok('⑤ 쪽 오류 0', !sd.errs.length && !fa.errs.length && !ss.errs.length, [sd.errs, fa.errs, ss.errs]); }
  if (want(4)) { const [off, pz] = await Promise.all([lateClap('off'), lateClap('pause')]);
    console.log('  재 본 값 ④ ' + JSON.stringify(off) + ' · ' + JSON.stringify(pz));
    ok('④ 박수 곡을 받는 중 «음악 끄기» → 곡이 늦게 와도 새 소리 0(곡 시작 0 · 흐르는 곡 없음 · 음악 설정 꺼짐 그대로)', !off.none && off.music === false && off.lateStarts === 0 && !off.lateSrc, off);
    ok('④ 박수 곡을 받는 중 «잠시 멈춤» → 멈춘 동안 새 소리 0', !pz.none && pz.pz && pz.lateStarts === 0 && !pz.lateSrc, pz);
    ok('④ 대조 — 이어 들으면 그 새 곡(앞 곡 아님)이 박수 줄 크기(−8)로 · 들린다', !pz.none && pz.res && pz.res.f === 'B10' && pz.res.f !== pz.old && pz.res.want === -8 && pz.res.g > -60 && pz.res.st >= 1 && !pz.res.pz, pz);
    ok('④ 쪽 오류 0', !off.errs.length && !pz.errs.length, [off.errs, pz.errs]); }
  if (want(3)) { const [k1, k0] = await Promise.all([hook('standard', true), hook('standard', false)]), k2 = await hook('family', true);
    console.log('  재 본 값 ③ ' + [k1, k0, k2].map((x) => JSON.stringify(x)).join(' · '));
    ok('③ 화촉 직후 입장 — 구호 말끝 → 강조 자리 0 ~ 0.8초(정석 · 가족 · 구호 길이를 아는 날)', [k1, k2].every((x) => !x.none && x.V > 1 && x.after >= 0 && x.after <= 0.8), [k1, k2].map((x) => [x.key, x.V, x.after, x.off]));
    ok('③ 구호 길이를 아직 모르는 날(입장 쪽을 안 열어 봄)도 0 ~ 0.8초', !k0.none && k0.after >= 0 && k0.after <= 0.8, [k0.V, k0.after, k0.off]);
    ok('③ 대조 — 곡 · 구호가 함께 시작(±0.4초) · 화촉 곡이 꺼진 뒤 1초 이상 정적 · 뜸 있는 길(입장부터)은 H − 6 − 구호(실제 파일 · 앞 무음 + 말) − 0.3 · 장면 설계 값 0.3초', [k1, k0, k2].every((x) => !x.none && Math.abs(x.together) <= 400 && x.hush >= 1000) && [k1, k2].every((x) => x.lead != null && Math.abs(x.lead - x.leadWant) <= 0.15 && Math.abs(x.scene - 0.3) <= 0.05), [k1, k0, k2].map((x) => [x.key, x.together, x.hush, x.lead, x.leadWant, x.scene]));
    ok('③ 쪽 오류 0', [k1, k0, k2].every((x) => !x.errs.length), [k1, k0, k2].map((x) => x.errs.slice(0, 2))); }
  if (want(2)) { const [fa, sd] = await Promise.all([songOpen('family'), songOpen('standard')]);
    console.log('  재 본 값 ② 가족 ' + JSON.stringify(fa) + ' · 정석 ' + JSON.stringify(sd));
    ok('② 가족 · 축가 여는 말 뒤 본식 피아노가 1.5초에 걸쳐 꺼진다(말끝 0.9초 뒤 아직 들림 −3 ~ −20 dB · 1.9초 뒤 정적)', !fa.none && fa.preWant > -60 && fa.r09 != null && fa.r09 <= -3 && fa.r09 >= -20 && fa.r19 <= -60, fa);
    ok('② 대조 — 내림 예약은 한 번 · 길이 1.4 ~ 1.6초 · 말이 끝난 때(±0.25초) 시작 · MR 자리 · 맺는 말은 정적 · 사이 그대로(1초 안)', !fa.none && fa.downs.length === 1 && fa.ramps === 1 && /^lin\/(14|15)\d\d@-?\d{1,3}$/.test(fa.downs[0]) && Math.abs(+fa.downs[0].split('@')[1]) <= 250 && fa.afterN > 0 && !fa.afterOn && fa.gap != null && fa.gap <= 1000, fa);
    /* ★[SPEECH_SONG_1115 · RULES_SLIM ⑧] 옛 대조 «정석(축가 앞이 축사 «음악 없이»라 이미 정적)은 정적 그대로» — 이제 축사 · 축가가 한 판에 같이 오지 않아 정석 축가 앞도 곡이 흐른다 →
         가족과 같은 꼴(말 아래 −15 로 흐르다 말끝에서 1.5초에 걸쳐 내림 한 번 · 1.9초 뒤 정적 · 올림 0 · MR 자리 정적) */
    ok('② 정석(축가만) · 축가 여는 말 뒤 본식 곡이 1.5초에 걸쳐 꺼진다(가족과 같은 꼴 · 올림 0 · MR 자리 정적)', !sd.none && sd.preWant > -60 && sd.r09 != null && sd.r09 <= -3 && sd.r09 >= -20 && sd.r19 <= -60 && sd.ups === 0 && sd.downs.length === 1 && !sd.afterOn, sd);
    ok('② 쪽 오류 0', !fa.errs.length && !sd.errs.length, [fa.errs, sd.errs]); }
  if (want(1)) { const rs = []; for (let i = 0; i < COURSES.length; i += 2) rs.push(...await Promise.all(COURSES.slice(i, i + 2).map(arrive)));   /* 두 코스씩 나란히 */
    const all = []; rs.forEach((r) => Object.keys(r.out).forEach((w) => all.push(Object.assign({ c: r.key, w }, r.out[w]))));
    console.log('  재 본 값 ① ' + all.map((x) => `${x.c}/${x.w}: 앞 ${x.pre} · 첫 소리 ${x.rel0} · +1초 ${x.rel1} · 앞섬 ${x.lead}ms(${x.shape}) · 줄→멘트 ${x.gap}ms`).join(' | '));
    ok('① 도착 멘트 첫 소리 — 입장 곡이 걷기 크기보다 18 dB 이상 아래(4코스 × 흐름 보기 · 직접 해보기 · 이어 듣기)', all.length === 12 && all.every((x) => !x.none && x.rel0 <= -18), all.map((x) => [x.c, x.w, x.none ? 'none' : x.rel0]));
    ok('① 대조 — 잦아듦은 멘트 0.8 ~ 1.4초 앞에 시작 · 길이 4.5초 그대로(멘트 3.7초 뒤 걷기 크기보다 40 dB 넘게 아래 · 첫 소리까지 내린 폭 27 dB 안)', all.every((x) => !x.none && x.lead >= 800 && x.lead <= 1400 && x.rel37 <= -40 && x.rel0 - x.pre >= -27 && /4500$/.test(x.shape || '')), (() => { const bad = all.filter((x) => !(!x.none && x.lead >= 800 && x.lead <= 1400 && x.rel37 <= -40 && x.rel0 - x.pre >= -27 && /4500$/.test(x.shape || ''))); return (bad.length ? bad : all).map((x) => [x.c, x.w, x.none ? 'none' : x.lead, x.shape, x.pre, x.rel0, x.rel37]); })());   /* 빨강이면 어긋난 줄만 앞에 · CI 출력이 500자에서 잘려 어느 줄인지 안 보였다 */
    const pr = all.filter((x) => x.w !== 'listen');
    ok('① 대조 — 걷는 동안 0 dB 그대로(연습 두 길) · 맞절은 정적 · 사이를 늘리지 않았다(줄이 바뀐 뒤 멘트까지 3초 안)', pr.length === 8 && pr.every((x) => x.walkWant === 0 && Math.abs(x.walkDb) <= 0.5) && all.every((x) => x.mjN > 0 && !x.mjOn && x.gap != null && x.gap <= 3000), all.map((x) => [x.c, x.w, x.walkWant, x.walkDb, x.mjOn + '/' + x.mjN, x.gap]));
    ok('① 쪽 오류 0', rs.every((r) => !r.errs.length), rs.map((r) => r.errs.slice(0, 2))); }
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 700)); }
await br.close(); A.srv.close(); Bv.srv.close();
console.log(fail ? `PV FIX 1114 FAIL ${fail}` : 'PV FIX 1114 OK');
process.exit(fail ? 1 : 0);
