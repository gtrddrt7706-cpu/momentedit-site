#!/usr/bin/env node
/* ★★[PV_R3_1115 2026-11-15 BGM 섹션 · GPT 라운드 3 — 미리 듣기 · 연습(assets/bgm-bed.js) 고침 묶음] 깨 보기(옛 판 빨강) → 초록 → 대조
   소리는 «원하는 값(want)»이 아니라 실제 크기 마디 값(gain)으로 잰다 — 50분의 1초마다 · 나레이션은 실제로 소리가 난 때(playing · ended).
   01 [ARRIVE_ONCE_VISIT_1115] 크게 보기에서 도착 멘트 줄 · 축가 MR 줄까지 저절로 간 뒤 «이전 줄 → 다음 줄»(lsLine)로 다시 들어와도 내림이 다시 걸린다
        도착: 다시 든 멘트 첫 소리 +1초에 걷기 크기보다 12 dB 넘게 아래 · 무음으로 가는 내림 1회 이상 / MR: 다시 든 뒤 2초에 정적(−60 아래)
   13 [ENTRY_LATE_MUSIC_1115] 화촉 직후 입장 · 강조 자리가 앞(0:05)인 곡 — 강조가 구호 말끝 뒤 0 ~ 0.8초(곡이 모자라는 만큼 늦게 들어온다 · 장면 LATE_MUSIC 과 같다)
   14 [ENTRY_LATE_FILE_1115] 화촉 직후 입장 · 입장 곡이 구호 시작보다 1.5초 늦게 도착 — 강조가 구호 말끝 뒤 0 ~ 0.8초(지난 시간만큼 뒤에서 시작)
   15 [ENTRY_LEAD_CALL_1115] «입장부터 듣기»(뜸 있는 길) · 입장 쪽을 안 열어 구호 길이를 모름 — 강조가 구호 말끝 뒤 0 ~ 0.8초(실제 구호 파일 길이 · 앞뒤 무음)
   16 [ENTRY_RATE_1115] 두 분 AI 구호를 고른 빠르기(1.2배)로 틀 때 — 시작 자리 셈이 빠르기를 안다(강조가 말끝 뒤 0.3초 · 함수 값)
   17 [CLAP_PEND_KEEP_1115] 선언 뒤 박수 곡(B10)을 받는 중 멈춤 → 도착 전에 이어 듣기 — 앞 곡(B09)을 되살리지 않고, 늦게 온 B10 이 그 줄 크기(−8)로
   19 [DAY_KEY_READY_1115] 곡 목록이 큐 엔진보다 먼저 와 빈 시간표를 그린 뒤에도 엔진이 오면 당일 자리 곡(정석 축사 B10 · 축가 B11)
   20 [WARM_DAY_1115] 순간 쪽을 열면 미리 받는 곡 = 순간 하나 듣기 첫 곡(dayAt · 가족 덕담 B10)
   ONLY=01,13 … · BP_BED = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const BED = process.env.BP_BED || '';
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 700)}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
function wav(sec, f, sr = 16000) { const n = Math.round(sr * sec), b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(f ? 8000 * Math.sin(2 * Math.PI * f * i / sr) : 0), 44 + i * 2); return b; }
const SHORT = wav(0.6, 330), LONG = wav(4, 330);   /* 나레이션 대신 — 0.6초 · 다시 들어오는 줄만 4초(LONG) */
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
        back({type:'momentedit:ritualFileData',key:'bed',id:g.id,ok:true,mime:'audio/wav',data:H.songs[g.id]}); }, H.dly[g.id]!=null?H.dly[g.id]:H.delay); return; }   /* hold = 그 곡(rec r5 · bed B10) 응답을 붙잡아 둔다 */
    back({type:'momentedit:ritualFileData',key:g.key,id:g.id,ok:false,error:'파일을 불러오지 못했어요 (코드 L6)',ecode:'L6'}); return; }
});
</script>`; };
const serve = async ({ REAL = null, LONGRE = null, hk = 40 } = {}) => { const HT = harness(hk); const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
    if (u === '/__harness.html') { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(HT); return; }
    if (/^\/assets\/audio\/narration\/.+\.mp3$/.test(u) && !(REAL && REAL.test(u))) { r.writeHead(200, { 'Content-Type': 'audio/wav' }); r.end(LONGRE && LONGRE.test(u) ? LONG : SHORT); return; }
    const p = (BED && u === '/assets/bgm-bed.js') ? BED : path.join(ROOT, u);
    fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r)); return { srv, port: srv.address().port }; };
const ENTRY_REAL = /\/(0[5-9]|10)_entry-[A-F]\.mp3$/;
const A = await serve({ LONGRE: /narr-entry-arrive|narr-song(?!-(end|out))/ }), Bv = await serve({ REAL: ENTRY_REAL }), Bs = await serve({ REAL: ENTRY_REAL, hk: 5 });   /* Bv = 입장 구호만 실제 소리 · Bs = 그 위에 강조 0:05 곡 */
const PAD = require(path.join(ROOT, 'assets/narration-pad.js'));
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); [A, Bv, Bs].forEach((x) => x.srv.close()); process.exit(2); }
const MU = (hk) => ({ src: 'rec', k: 'r5', t: '시험 입장 곡', a: '시험 가수', hook: hk, hooks: [hk], dur: 140 });
const PROBE = `(() => { if (window.__pv) return; var E = window.__pv = { st: [], na: [], rp: [] }; var now = function(){ return performance.now(); };
  ['linearRampToValueAtTime', 'exponentialRampToValueAtTime'].forEach(function(m){ var o = window.AudioParam && AudioParam.prototype[m]; if (!o) return; AudioParam.prototype[m] = function(v, t){ try { var c = window.BgmBed && BgmBed._t.BED.cur; if (c && c.g && c.g.gain === this) E.rp.push({ T: now(), m: m.slice(0, 3), v: v, ms: Math.round((t - c.g.context.currentTime) * 1000), f: c.f }); } catch (e) {} return o.apply(this, arguments); }; });
  var AS = window.AudioBufferSourceNode && AudioBufferSourceNode.prototype; if (AS) { var s0 = AS.start; AS.start = function(w, off){ try { var ctxT = this.context ? this.context.currentTime : 0; E.st.push({ T: now() + Math.max(0, ((w || 0) - ctxT) * 1000), off: off || 0, dur: this.buffer ? this.buffer.duration : 0, buf: this.buffer }); } catch (e) {} return s0.apply(this, arguments); }; }
  var HP = HTMLMediaElement.prototype, op = HP.play; HP.play = function(){ var el = this; if (!el.__pvL) { el.__pvL = 1; ['playing', 'ended'].forEach(function(e){ el.addEventListener(e, function(){ E.na.push({ T: now(), e: e, src: String(el.getAttribute('src') || el.src || '').split('/').pop().split('?')[0] }); }); }); } return op.apply(this, arguments); };
})();`;
async function open(sv, key, { mu = 40, W = 390, pre = null } = {}) {
  const ctx = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: W < 1000 }); await ctx.addInitScript(PROBE); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + sv.port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${sv.port}/__harness.html`, { waitUntil: 'load' }); if (pre) await pg.evaluate(pre); await pg.evaluate(() => go());
  await pg.waitForFunction(() => { const x = document.getElementById('fr'); return x.contentWindow && x.contentWindow.document.readyState === 'complete' && x.contentWindow.render; }, null, { timeout: 30000 }); await pg.waitForTimeout(900);
  const f = pg.frames().find((x) => /order-preview\.html/.test(x.url()));
  const nx = async () => { if (await f.isVisible('#next')) await f.click('#next'); else if (await f.isVisible('.pk-go')) await f.click('.pk-go'); await f.waitForTimeout(450); };
  await nx(); await nx();
  await f.evaluate(({ k, mu }) => { RitualOpen.applyExample(S, k); S.bgm = {}; S.guestVoice = 'nar'; S.vsAsked = 1; if (mu) S.mu = mu; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); }, { k: key, mu: mu ? MU(mu) : null });
  await nx(); await f.waitForTimeout(800); await f.waitForFunction(() => !!(window.ENG && ENG.RitualCue), null, { timeout: 15000 }).catch(() => {});
  return { ctx, pg, f, errs };
}
const start = (f, way, ks, ms, msQ) => f.evaluate(({ way, ks, ms, msQ }) => { const B = BgmBed._t; window.__pv.st.length = 0; window.__pv.na.length = 0; window.__pv.rp.length = 0; const R = window.__run = { o: [], t0: performance.now(), press: [] };
  if (way === 'listen') { mkGo(ks[0]); LP.fast = false; _lStart(ks, true); }
  else { const i = STEPS.findIndex((x) => x.k === 'practice'); if (i > -1 && STEPS[idx].k !== 'practice') { idx = i; render(); } prWay(way); LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(_lRows().filter((k) => ks.indexOf(k) > -1), true); _lFull(); }
  if (ms) (LP.q || []).forEach((x) => { if (x.talk || x.talk2 || x.said || x.act || x.quiet) x.ms = ms; });
  if (msQ) (LP.q || []).forEach((x) => { if (msQ.re && new RegExp(msQ.re).test(x.slug || x.of || '') && (x.act || x.quiet)) x.ms = msQ.ms; });
  R.iv = setInterval(() => { const v = B.BED.cur, st = LP.q && LP.q[LP.i], n = performance.now();
    R.o.push({ t: n, i: LP.i, k: st && st.k, s: st ? (st.slug || '') : '', of: st ? (st.of || '') : '', act: !!(st && (st.act || st.quiet)), f: v && v.src ? v.f : '', want: v && v.src ? v.want : null, g: v && v.src && v.g ? v.g.gain.value : 0, pz: !!LP.paused }); }, 20);
  return (LP.q || []).map((x) => x.k + ':' + (x.slug || x.of || '') + (x.act || x.quiet ? ':act' : '')); }, { way, ks, ms, msQ });
const stop = (f) => f.evaluate(() => { const R = window.__run; clearInterval(R.iv); try { lsStop(); } catch (e) {} try { if (document.body.classList.contains('lsfull')) lsCloseBig(); } catch (e) {} const E = window.__pv, eb = (BgmBed._t.BUF['@ENT'] || {}).b;
  return { o: R.o, na: E.na.slice(), rp: E.rp.slice(), st: E.st.map((x) => ({ T: x.T, off: x.off, dur: x.dur, ent: !!(eb && x.buf === eb) })), ent: BgmBed._t.ENT(), g0: (() => { try { const x = (BgmBed._t.BUF['@ENT'] || {}).ext; return x ? x.gain * Math.pow(10, x.trim / 20) : 0; } catch (e) { return 0; } })() }; });
const dB = (x) => (x > 0 ? 20 * Math.log10(x) : -200), r1 = (x) => Math.round(x * 10) / 10, r2 = (x) => Math.round(x * 100) / 100;
const gAt = (o, t) => { let b = null; for (const x of o) { if (!b || Math.abs(x.t - t) < Math.abs(b.t - t)) b = x; } return b ? b.g : 0; };
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean), want = (id) => !ONLY.length || ONLY.indexOf(String(id)) > -1;
const waitNa = (f, re, e, after, ms) => f.waitForFunction(({ re, e, after }) => window.__pv.na.some((x) => x.e === e && new RegExp(re).test(x.src) && x.T > after), { re, e, after }, { timeout: ms || 60000, polling: 50 });

/* 01 — 도착 멘트 다시 들어오기(크게 보기 · 흐름 보기 · 줄 단추 lsLine) */
async function arriveBack(key) { const { ctx, f, errs } = await open(A, key); let r = null;
  try { await start(f, 'flow', ['entry', 'matjeol'], 3200);
    await waitNa(f, 'narr-entry-arrive', 'playing', 0); await f.waitForTimeout(1500);   /* 저절로 든 도착 줄(내림이 돌고 있다) */
    await f.evaluate(() => { lsLine(-1); }); await f.waitForTimeout(1600);   /* 걷는 줄로 — 걷기 크기로 다시 오른다 */
    const tR = await f.evaluate(() => { lsLine(1); return performance.now(); });
    await waitNa(f, 'narr-entry-arrive', 'playing', tR, 15000); await f.waitForTimeout(2600);
    const d = await stop(f), vp = d.na.filter((x) => x.e === 'playing' && /narr-entry-arrive/.test(x.src)), v1 = vp[0], v2 = vp.filter((x) => x.T > tR)[0];
    const falls = (a, b) => d.rp.filter((x) => x.f === '@ENT' && x.v <= 1e-4 && x.T >= a && x.T < b).length;
    r = { first: v1 ? { rel1: r1(dB(gAt(d.o, v1.T + 1000)) - dB(d.g0)), falls: falls(v1.T - 2500, v1.T + 1000) } : null,
      back: r1(dB(gAt(d.o, tR - 50)) - dB(d.g0)), again: v2 ? { rel0: r1(dB(gAt(d.o, v2.T)) - dB(d.g0)), rel1: r1(dB(gAt(d.o, v2.T + 1000)) - dB(d.g0)), rel2: r1(dB(gAt(d.o, v2.T + 2000)) - dB(d.g0)), falls: falls(tR - 20, v2.T + 2000) } : null };
  } catch (e) { r = { none: String(e).slice(0, 200) }; }
  await ctx.close(); return { key, errs, ...r }; }
/* 01 — 축가 MR 줄 다시 들어오기(가족 · 본식 피아노가 여는 말 아래로 흐르던 날) */
async function mrBack(key) { const { ctx, f, errs } = await open(A, key, { mu: 0 }); let r = null;
  try { await start(f, 'flow', ['song'], 1500, { re: '^narr-song$|song', ms: 12000 });
    await waitNa(f, 'narr-song', 'ended', 0, 90000); await f.waitForTimeout(2600);   /* 저절로 든 MR 줄(1.5초 내림 뒤 정적) */
    const s0 = await f.evaluate(() => { const c = BgmBed._t.BED.cur; return { k: (LP.q[LP.i] || {}).k, s: (LP.q[LP.i] || {}).slug || (LP.q[LP.i] || {}).of || '', g: c && c.src && c.g ? c.g.gain.value : 0 }; });
    await f.evaluate(() => { lsLine(-1); }); await f.waitForTimeout(1800);
    const s1 = await f.evaluate(() => { const c = BgmBed._t.BED.cur; return { s: (LP.q[LP.i] || {}).slug || '', want: c && c.src ? c.want : null, g: c && c.src && c.g ? c.g.gain.value : 0 }; });
    const tR = await f.evaluate(() => { lsLine(1); return performance.now(); }); await f.waitForTimeout(2600);
    const d = await stop(f), g2 = gAt(d.o, tR + 2400), at = d.o.filter((x) => x.t > tR + 50 && x.t < tR + 2400);
    r = { onMR: s0, under: { s: s1.s, want: s1.want, db: r1(dB(s1.g)) }, again: { k: (at[0] || {}).k, s: (at[0] || {}).s || (at[0] || {}).of, db24: r1(dB(g2)), downs: d.rp.filter((x) => x.T > tR - 20 && x.v <= 1e-4).length } };
  } catch (e) { r = { none: String(e).slice(0, 200) }; }
  await ctx.close(); return { key, errs, ...r }; }

/* 13 · 14 · 15 — 입장 구호 말끝 → 입장 곡 강조 자리(문 열림) */
async function hook(sv, key, { ks = ['candle', 'entry'], lateMs = 0, vKnown = false } = {}) { const { ctx, pg, f, errs } = await open(sv, key, { mu: sv === Bs ? 5 : 40, pre: lateMs ? () => { H.hold.r5 = true; } : null });
  if (vKnown) { await f.evaluate(() => { mkGo('entry'); }); await f.waitForFunction(() => { try { const p = EntryMusic._t.scene().plan; return !!(p && p.V > 1); } catch (e) { return false; } }, null, { timeout: 30000 }).catch(() => {}); await f.waitForTimeout(600); }
  await start(f, 'flow', ks, 1500);
  let rel = null; if (lateMs) { try { await waitNa(f, '_entry-[A-F]\\.mp3', 'playing', 0, 150000); await f.waitForTimeout(lateMs); rel = await f.evaluate(() => performance.now()); await pg.evaluate(() => { H.hold.r5 = false; }); } catch (e) {} }
  try { await waitNa(f, '_entry-[A-F]\\.mp3', 'ended', 0, 150000); await f.waitForTimeout(1500); } catch (e) {}
  const d = await stop(f), pl = d.na.find((x) => x.e === 'playing' && /_entry-[A-F]\.mp3/.test(x.src)), en = d.na.find((x) => x.e === 'ended' && /_entry-[A-F]\.mp3/.test(x.src)), s0 = d.st.filter((x) => x.ent)[0], x = d.ent && d.ent.x;
  await ctx.close(); if (!pl || !en || !s0 || !x) return { key, none: true, errs, pl: !!pl, en: !!en, s0: !!s0 };
  const pd = PAD.of(pl.src) || [0, 0], hookAt = s0.T + (x.H - x.o - s0.off) * 1000;
  return { key, errs, H: x.H, V: x.V, off: r2(s0.off), callSec: r1((en.T - pl.T) / 1000), after: r2((hookAt - (en.T - pd[1])) / 1000), musicVsCall: r2((s0.T - pl.T) / 1000), late: rel ? r2((rel - pl.T) / 1000) : null }; }

/* 16 — 빠르기(1.2배) 두 분 AI 구호 · 시작 자리 셈(entAt)만 — 화촉 직후 길 */
async function rate() { const { ctx, f, errs } = await open(Bv, 'standard'); let r = null;
  try { await f.evaluate(() => { BgmBed.lpWarm(['entry', 'matjeol']); });
    await f.waitForFunction(() => { const o = BgmBed._t.BUF['@ENT']; return !!(o && o.st === 'ok'); }, null, { timeout: 30000 });
    r = await f.evaluate(async () => { const B = BgmBed._t, st = _lSteps(ENG, ['entry']).find((x) => x.k === 'entry' && x.src && /_entry-[A-F]\.mp3/.test(x.src)); if (!st) return { none: 'no call' };
      const a = new Audio(); a.src = st.src; await new Promise((res) => { a.onloadedmetadata = res; setTimeout(res, 4000); }); const d = a.duration, pd = NarrPad.of(st.file) || [0, 0];
      const x = B.ENT().x, s2 = Object.assign({}, st, { up: 'entryTest', couple: 1 }); B.DUR[s2.src] = d;
      const old = window._upRate; window._upRate = function(){ return 1.2; }; const S0 = window.S.up; window.S.up = Object.assign({}, S0 || {}, { entryTest: { src: 'ai', tempo: '1' } });
      const hz = (q) => (B.entHushAt ? B.entHushAt(q, 0) : B.entAt('entry', q));   /* 뜸 없는 길 셈(옛 판은 entAt 의 구호 줄 갈래) */
      let off12, off1; try { off12 = hz(s2); window._upRate = function(){ return 1; }; off1 = hz(s2); } finally { window._upRate = old; window.S.up = S0; }
      const speak = (rr) => (pd[0] / 1000 + Math.max(0.5, d - (pd[0] + pd[1]) / 1000)) / rr;
      return { d, pd, H: x.H, o: x.o, after12: Math.round(((x.H - x.o - off12) - speak(1.2)) * 100) / 100, after1: Math.round(((x.H - x.o - off1) - speak(1)) * 100) / 100 }; });
  } catch (e) { r = { none: String(e).slice(0, 300) }; }
  await ctx.close(); return { errs, ...r }; }

/* 17 — 박수 곡(B10)을 받는 중 멈춤 → 도착 전에 이어 듣기 → 그 뒤 도착 */
async function clapEarly() { const { ctx, pg, f, errs } = await open(A, 'family', { mu: 0, pre: () => { H.hold.B10 = true; } }); await start(f, 'flow', ['declare', 'bless'], 1500);
  const got = await f.evaluate(() => new Promise((res) => { const B = BgmBed._t, t0 = performance.now(), sl = ((ENG.RitualCue.build(S, { mode: 'console' }).cues || []).find((c) => c.live && c.live.newSong) || {}).slug || '';
    (LP.q || []).forEach((x) => { if (x.of === sl && (x.act || x.quiet)) x.ms = 25000; });
    const iv = setInterval(() => { const st = LP.q && LP.q[LP.i], b = B.BUF.B10; if (st && st.of === sl && (st.act || st.quiet) && b && b.st === 'wait' && b.cb && b.cb.length) { clearInterval(iv); res({ ok: true, sl, old: B.BED.cur && B.BED.cur.f }); } else if (performance.now() - t0 > 90000) { clearInterval(iv); res({ ok: false, sl, i: LP.i, b: b && b.st }); } }, 30); }));
  if (!got.ok) { await ctx.close(); return { none: true, got, errs }; }
  const snap = () => f.evaluate(() => { const B = BgmBed._t, c = B.BED.cur, E = window.__pv; return { src: !!(c && c.src), f: c && c.src ? c.f : '', want: c && c.src ? c.want : null, g: c && c.src && c.g ? c.g.gain.value : 0, st: E.st.length, pz: !!LP.paused, i: LP.i }; });
  await f.evaluate(() => { lsToggle(); }); await f.waitForTimeout(500); const a1 = await snap();
  await f.evaluate(() => { lsToggle(); }); await f.waitForTimeout(1500); const a2 = await snap();
  await pg.evaluate(() => { H.hold.B10 = false; }); await f.waitForTimeout(2600); const a3 = await snap();
  await stop(f); await ctx.close();
  const sn = (a) => ({ f: a.f, want: a.want, db: r1(dB(a.g)), pz: a.pz });
  return { errs, old: got.old, paused: sn(a1), resumed: Object.assign(sn(a2), { starts: a2.st - a1.st }), arrived: Object.assign(sn(a3), { starts: a3.st - a2.st, same: a3.i === a1.i }) }; }

/* 19 — 곡 목록이 큐 엔진보다 먼저(엔진 없는 동안 서약 줄 한 번) → 엔진이 온 뒤 */
async function dayKey() { const { ctx, f, errs } = await open(A, 'standard', { mu: 0 }); let r = null;
  try { await f.evaluate(() => { mkGo('welcome'); }); await f.waitForFunction(() => BgmBed._t.AV.st === 'ok', null, { timeout: 20000 });
    r = await f.evaluate(() => { const ready = { free: BgmBed.dayAt('free'), song: BgmBed.dayAt('song') }; S.__r3 = Date.now();   /* 초안이 바뀐 것처럼(시간표 열쇠가 새로) */
      const g = window.ENG; window.ENG = undefined; let blind; try { blind = { vow: BgmBed.dayName('vow'), free: BgmBed.dayAt('free') }; } finally { window.ENG = g; }
      const after = { free: BgmBed.dayAt('free'), song: BgmBed.dayAt('song') }; delete S.__r3; return { ready, blind, after }; });
  } catch (e) { r = { none: String(e).slice(0, 200) }; }
  await ctx.close(); return { errs, ...r }; }

/* 20 — 순간 쪽을 열 때 미리 받는 곡 */
async function warm(key, k) { const { ctx, f, errs } = await open(A, key, { mu: 0 }); let r = null;
  try { await f.waitForFunction(() => { try { BgmBed.warmK('zz'); } catch (e) {} return BgmBed._t.AV.st === 'ok'; }, null, { timeout: 20000, polling: 200 });
    r = await f.evaluate((k) => { const B = BgmBed._t; Object.keys(B.MW.tried).forEach((x) => { delete B.MW.tried[x]; }); Object.keys(B.BUF).forEach((x) => { if (x !== '@ENT') delete B.BUF[x]; });
      BgmBed.warmK(k); return { day: BgmBed.dayAt(k), song: B.songAt(k), tried: Object.keys(B.MW.tried), buf: Object.keys(B.BUF) }; }, k);
  } catch (e) { r = { none: String(e).slice(0, 200) }; }
  await ctx.close(); return { key, k, errs, ...r }; }

try {
  if (want('01')) { const [a1, a2, m1] = await Promise.all([arriveBack('standard'), arriveBack('family'), mrBack('family')]);
    console.log('  재 본 값 01 ' + JSON.stringify(a1) + ' · ' + JSON.stringify(a2) + ' · MR ' + JSON.stringify(m1));
    ok('01 도착 멘트 다시 들어오기(이전 줄 → 다음 줄) — 다시 든 멘트 +1초에 걷기 크기보다 12 dB 넘게 아래 · 내림 다시 1회 이상(정석 · 가족)', [a1, a2].every((x) => x.again && x.again.rel1 <= -12 && x.again.falls >= 1), [a1, a2].map((x) => [x.key, x.again]));
    ok('01 대조 — 저절로 든 첫 도착은 그대로(+1초 −18 아래 · 내림 1회) · 걷는 줄로 돌아가면 다시 올라온다(1.6초에 걷기 크기의 −10 dB 안)', [a1, a2].every((x) => x.first && x.first.rel1 <= -18 && x.first.falls >= 1 && x.back >= -10), [a1, a2].map((x) => [x.key, x.first, x.back]));
    ok('01 축가 MR 줄 다시 들어오기(가족) — 여는 말 줄로 돌아가면 피아노가 말 아래(−60 위) · MR 줄로 다시 들면 2.4초 뒤 정적(−60 아래) · 내림 1회 이상', !m1.none && m1.under && m1.under.want > -60 && m1.again.db24 <= -60 && m1.again.downs >= 1, m1);
    ok('01 쪽 오류 0', [a1, a2, m1].every((x) => !x.errs.length), [a1, a2, m1].map((x) => x.errs.slice(0, 2))); }
  if (want('13') || want('14') || want('15')) { const [k13, k14, k15, k15v, k0] = await Promise.all([hook(Bs, 'standard'), hook(Bv, 'standard', { lateMs: 1500 }), hook(Bv, 'standard', { ks: ['entry', 'matjeol'] }), hook(Bv, 'standard', { ks: ['entry', 'matjeol'], vKnown: true }), hook(Bv, 'standard')]);
    console.log('  재 본 값 13 ' + JSON.stringify(k13) + ' | 14 ' + JSON.stringify(k14) + ' | 15 ' + JSON.stringify(k15) + ' | 15(V 앎) ' + JSON.stringify(k15v) + ' | 대조(제때 · 강조 40초) ' + JSON.stringify(k0));
    if (want('13')) ok('13 강조 0:05 곡 · 화촉 직후 — 강조가 구호 말끝 뒤 0 ~ 0.8초(곡이 모자란 만큼 늦게 들어온다 · 곡은 처음부터)', !k13.none && k13.after >= 0 && k13.after <= 0.8 && k13.off <= 0.05 && k13.musicVsCall > 1, k13);
    if (want('14')) ok('14 입장 곡이 구호보다 1.5초 늦게 도착 — 강조가 구호 말끝 뒤 0 ~ 0.8초', !k14.none && k14.late >= 1.3 && k14.after >= 0 && k14.after <= 0.8, k14);
    if (want('15')) ok('15 입장부터 듣기 · 구호 길이를 모름 — 강조가 구호 말끝 뒤 0 ~ 0.8초 · 구호 길이를 아는 날도', [k15, k15v].every((x) => !x.none && x.after >= 0 && x.after <= 0.8), [k15, k15v]);
    ok('13 · 14 · 15 대조 — 제때 온 강조 40초 곡 · 화촉 직후는 0 ~ 0.8초 그대로 · 곡과 구호가 함께 시작(±0.4초)', !k0.none && k0.after >= 0 && k0.after <= 0.8 && Math.abs(k0.musicVsCall) <= 0.4, k0);
    ok('13 · 14 · 15 쪽 오류 0', [k13, k14, k15, k15v, k0].every((x) => !x.errs.length), [k13, k14, k15, k15v, k0].map((x) => x.errs.slice(0, 2))); }
  if (want('16')) { const r = await rate(); console.log('  재 본 값 16 ' + JSON.stringify(r));
    ok('16 두 분 AI 구호 1.2배 — 시작 자리 셈으로 강조가 말끝 뒤 0.2 ~ 0.4초 · 1배는 그대로', !r.none && r.after12 >= 0.2 && r.after12 <= 0.4 && r.after1 >= 0.2 && r.after1 <= 0.4, r);
    ok('16 쪽 오류 0', !r.errs.length, r.errs); }
  if (want('17')) { const r = await clapEarly(); console.log('  재 본 값 17 ' + JSON.stringify(r));
    ok('17 박수 곡을 받는 중 멈춤 → 도착 전 이어 듣기 — 앞 곡(B09)을 되살리지 않는다(이어 든 뒤 1.5초 · 들리는 소리 없음)', !r.none && !(r.resumed.f === r.old && r.resumed.want > -60) && !(r.resumed.db > -60), r);
    ok('17 그 뒤 박수 곡(B10)이 도착 — 그 줄 크기(−8)로 들린다(같은 줄)', !r.none && r.arrived.f === 'B10' && r.arrived.want === -8 && r.arrived.db > -60 && r.arrived.same, r);
    ok('17 쪽 오류 0', !r.errs.length, r.errs); }
  if (want('19')) { const r = await dayKey(); console.log('  재 본 값 19 ' + JSON.stringify(r));
    ok('19 엔진 없는 동안 한 번 그린 뒤 엔진이 오면 — 정석 축사 · 축가 = 엔진 먼저와 같은 곡(B10 · B11)', !r.none && r.ready.free === 'B10' && r.ready.song === 'B11' && r.after.free === r.ready.free && r.after.song === r.ready.song, r);
    ok('19 쪽 오류 0', !r.errs.length, r.errs); }
  if (want('20')) { const r = await warm('family', 'bless'); console.log('  재 본 값 20 ' + JSON.stringify(r));
    ok('20 가족 덕담 쪽을 열면 — 순간 하나 듣기 첫 곡(dayAt)을 미리 받는다', !r.none && !!r.day && r.tried.indexOf(r.day) > -1, r);
    ok('20 쪽 오류 0', !r.errs.length, r.errs); }
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 700)); }
await br.close(); [A, Bv, Bs].forEach((x) => x.srv.close());
console.log(fail ? `PV R3 1115 FAIL ${fail}` : 'PV R3 1115 OK');
process.exit(fail ? 1 : 0);
