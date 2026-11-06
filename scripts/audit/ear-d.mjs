#!/usr/bin/env node
/* ★★[EAR_D_1106 2026-11-06 BGM 섹션 묶음 D · 크기 로그(50ms)로 귀에 걸린 두 자리] 깨 보기(옛 판 빨강) → 초록 → 대조 — 당일 콘솔 입장 장면
   ① 짧은 입장 곡이 걷는 중 끝나 본식 곡(M4)으로 넘길 때 — 두 소리 합이 겹치는 동안 3 dB 넘게 비지 않는다(종전: 입장 곡 선형 내림 + 배경음 지수 오름 · 약 1초 6 dB 넘게 빔)
   ② 도착 멘트 첫 단어 — 잦아듦(4.5초)이 GO 에서 먼저 시작해 첫 단어 때 입장 곡이 걷기 크기보다 18 dB 이상 아래(종전: 멘트와 함께 시작 · 첫 단어가 0 dB 위)
   대조: 긴 곡 이어 잇기(LONG · 같은 곡선 함수) 합 낙차 3 dB 이하 · 정지는 정지(K16)는 seam-b2 음06K 가 지킨다
   ONLY=A,B,C · BP_CON = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const PICKSF = process.env.BP_PICKS || '', OP = process.env.BP_OP || '', BED = process.env.BP_BED || '', SLOTS = process.env.BP_SLOTS || '', CON = process.env.BP_CON || '', CUE = process.env.BP_CUE || '';
const O = require(path.join(ROOT, 'assets/ritual-open.js')); require(path.join(ROOT, 'assets/ritual-data.js')); const C = require(CUE || path.join(ROOT, 'assets/ritual-cue.js'));
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 600)}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
function wav(sec, f, sr = 16000) { const n = Math.round(sr * sec), b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(f ? 8000 * Math.sin(2 * Math.PI * f * i / sr) : 0), 44 + i * 2); return b; }
const SHORT = wav(0.6, 330);   /* 나레이션 대신 — 0.6초 */
/* 드라이브에 있는 곡(시험) — B07 · B30(화촉 3 · 4) · 테이블 인사 곡(B23 · B03 · B24 · B25)은 없다 */
const RL = [{ k: 'r5', name: '경쾌하게', t: '시험 입장 곡', a: '시험 가수', hook: 40, hook0: 40, len: 140, file: 'r5.mp3', img: '/assets/home/snap.webp', pos: '50% 50%' },
  { k: 'r1', name: '잔잔하게', t: '짧은 판 곡', a: '시험 가수', hook: 40, hook0: 40, len: 70, file: 'r1.mp3', pf: 'r1p.mp3', p0: 10, p1: 70, hooks: [40], img: '/assets/home/snap.webp', pos: '50% 50%' }];
const HAVE = ['B01', 'B07', 'B09', 'B10', 'B12', 'B13', 'B15', 'B16', 'B17', 'B24', 'B28'];   /* 화촉 1 · 2(B05 · B31)는 없다 — d */   /* [BGM_TIMING_1101] 테이블 인사 곡(B23)도 — 축배 뜸 곡 e */
const SONG = {}; HAVE.forEach((k, i) => { SONG[k] = wav(30, 180 + i * 20).toString('base64'); });   /* 30초 — 재는 동안 곡이 끝나지 않게 */
const RS = { r5: wav(140, 250).toString('base64'), 'r1-p': wav(60, 300).toString('base64'), r1: wav(70, 300).toString('base64') };
const HARNESS = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><iframe id="fr" style="width:100vw;height:100vh;border:0;display:block"></iframe>
<script>
window.H={rl:${JSON.stringify(RL)},rs:${JSON.stringify(RS)},log:[],draft:null,saved:null,delay:40,dly:{},bad:{},gone:{},have:${JSON.stringify(HAVE)},songs:${JSON.stringify(SONG)}};
var fr=document.getElementById('fr');
function back(m){ fr.contentWindow.postMessage(m, location.origin); }
window.go=function(){ fr.src='/order-preview.html?embed=1'; };
window.addEventListener('message',function(ev){ var d=ev.data||{}; if(ev.origin!==location.origin||ev.source!==fr.contentWindow) return;
  if(/^momentedit:ritualFile/.test(d.type||'')) H.log.push(d.type+':'+(d.data&&d.data.key)+':'+(d.data&&d.data.id||''));
  if(d.type==='momentedit:orderReady'){ back({type:'momentedit:orderFill',draft:H.draft,done:false,cust:{name:'시험',code:'TEST01'}}); return; }
  if(d.type==='momentedit:orderDraft'){ H.saved=JSON.parse(JSON.stringify(d.data&&d.data.S||null)); back({type:'momentedit:orderDraftSaved'}); return; }
  if(d.type==='momentedit:ritualFileGet'){ var g=d.data;
    if(g.key==='rec'){ setTimeout(function(){ if(g.id==='list'){ back({type:'momentedit:ritualFileData',key:'rec',id:'list',ok:true,songs:H.rl}); return; }
        if(!H.rs[g.id]){ back({type:'momentedit:ritualFileData',key:'rec',id:g.id,ok:false,error:'곡을 불러오지 못했어요 (코드 L3)',ecode:'L3'}); return; }
        back({type:'momentedit:ritualFileData',key:'rec',id:g.id,ok:true,mime:'audio/wav',data:H.rs[g.id]}); }, H.delay); return; }
    if(g.key==='bed'){ setTimeout(function(){ if(g.id==='list'){ back({type:'momentedit:ritualFileData',key:'bed',id:'list',ok:true,songs:H.have.map(function(f){ return {f:f}; })}); return; }
        if(!H.songs[g.id]||H.gone[g.id]){ back({type:'momentedit:ritualFileData',key:'bed',id:g.id,ok:false,error:'곡 파일을 찾을 수 없어요. (코드 L3)',ecode:'L3'}); return; }
        back({type:'momentedit:ritualFileData',key:'bed',id:g.id,ok:true,mime:'audio/wav',data:H.bad[g.id]?'AAAAAAAAAAAAAAAA':H.songs[g.id]}); }, H.dly[g.id]!=null?H.dly[g.id]:H.delay); return; }
    back({type:'momentedit:ritualFileData',key:g.key,id:g.id,ok:false,error:'파일을 불러오지 못했어요 (코드 L6)',ecode:'L6'}); return; }
});
</script>`;
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/__harness.html') { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(HARNESS); return; }
  if (/^\/assets\/audio\/narration\/.+\.mp3$/.test(u)) { r.writeHead(200, { 'Content-Type': 'audio/wav' }); r.end(SHORT); return; }
  const p = (PICKSF && u === '/assets/bgm-picks.js') ? PICKSF : (OP && u === '/order-preview.html') ? OP : (BED && u === '/assets/bgm-bed.js') ? BED : (SLOTS && u === '/assets/bgm-slots.js') ? SLOTS : (CUE && u === '/assets/ritual-cue.js') ? CUE : (CON && u === '/console.html') ? CON : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const wait = (f, ms) => f.waitForTimeout(ms);
const ALL = ['prevideo', 'candle', 'welcome', 'vow', 'ring', 'declare', 'free', 'letter', 'song', 'tribute', 'toast', 'table'];
async function open(W, embed, init) {
  const ctx = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: W < 1000 }); if (init) await ctx.addInitScript(init); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  let f;
  if (embed) { await pg.goto(`http://127.0.0.1:${port}/__harness.html`, { waitUntil: 'load' }); await pg.evaluate(() => go());
    await pg.waitForFunction(() => { const x = document.getElementById('fr'); return x.contentWindow && x.contentWindow.document.readyState === 'complete' && x.contentWindow.render; }, null, { timeout: 30000 }); await pg.waitForTimeout(900);
    f = pg.frames().find((x) => /order-preview\.html/.test(x.url())); }
  else { await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await pg.waitForTimeout(700); f = pg.mainFrame(); }
  const nx = async () => { if (await f.isVisible('#next')) await f.click('#next'); else if (await f.isVisible('.pk-go')) await f.click('.pk-go'); await wait(f, 450); };
  await nx(); await nx();
  await f.evaluate((ks) => { ks.forEach((k) => { S.on[k] = 1; }); S.guestVoice = 'nar'; S.vsAsked = 1; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); }, ALL);
  await nx(); await wait(f, 800);
  return { ctx, pg, f, errs };
}


const ONLY = (process.env.ONLY || '').split(',').filter(Boolean), want = (id) => !ONLY.length || ONLY.indexOf(id) > -1;
const go = async (f, k) => { await f.evaluate((k) => mkGo(k), k); await wait(f, 700); };
/* 곡을 하나 틀어 둔 뒤 진행을 멈춘다 — 그 곡의 크기 조절 호출(값 · 걸린 시간)을 엿본다 */
const hold = async (f, k) => { await go(f, k); await f.evaluate((k) => { try { lsStop(); } catch (e) {} lsPlay(k); }, k);
  await f.waitForFunction(() => { const B = BgmBed._t.BED; return B.who === 'lp' && B.cur && B.cur.src && B.cur.g; }, null, { timeout: 30000 }); await wait(f, 7500);
  await f.evaluate(() => { clearTimeout(LP.t); LP.tok++; const v = BgmBed._t.BED.cur, g = v.g.gain, o = g.linearRampToValueAtTime.bind(g); window.__rl = []; g.linearRampToValueAtTime = function (val, t) { window.__rl.push({ val, ms: Math.round((t - v.g.context.currentTime) * 1000) }); return o(val, t); }; }); };
const probe = (f, fn, st, w0) => f.evaluate(({ fn, st, w0 }) => { const v = BgmBed._t.BED.cur; v.want = w0 === 'undef' ? undefined : w0 === 'NaN' ? NaN : w0; window.__rl.length = 0; const s1 = Object.assign({ k: LP.q[LP.i].k }, st);
  try { if (fn === 'show') BgmBed.lpShow(s1); else BgmBed.lpLevel(s1); } catch (e) { return { err: String(e) }; } const r = window.__rl.slice(); return { n: r.length, ms: r.length ? r[r.length - 1].ms : null, want: v.want, f: v.f }; }, { fn, st, w0 });

const at = (tr, i) => tr.find((x) => x.cur >= i), before = (tr, i) => tr.filter((x) => x.cur < i), upTo = (lg, tr, i) => { const a = at(tr, i); return lg.filter((x) => x.db > -60 && (!a || x.t < a.T - 50)); };
const S0of = (on, entry) => { const S = O.applyExample({ course: 'open' }, 'standard'); S.course = 'open'; S.on = Object.assign({}, S.on, on); S.entry = entry || 'A'; S.bgm = {}; return S; };
/* 당일 콘솔 — 큐를 손으로 내고(fire) 그사이 음악 크기 명령(duckTo)을 모은다 */
const con = async (S, files) => { const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }), errs = [], pg = await ctx.newPage(); pg.on('pageerror', (e) => errs.push(e.message));
  await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; window.__bgmLog = []; });
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: '{"ok":true}' })));
  await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S)).toString('base64'))}`); await pg.waitForTimeout(900);
  if (files && files.length) { const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'seambg-')); for (const [sg, hz, sec] of files) { const p = path.join(TMP, sg + '.wav'); fs.writeFileSync(p, wav(sec || 40, hz)); await pg.setInputFiles(`.sg[data-seg="${sg}"] .sg-song:nth-of-type(1) [data-seg-file]`, p, { timeout: 4000 }); } await pg.waitForTimeout(1200); }
  await pg.click('#go'); await pg.waitForTimeout(700);
  const Rq = await pg.evaluate(() => window.__bgmR()); return { ctx, pg, errs, Rq,
    trace: (ms) => pg.evaluate((ms) => new Promise((res) => { const o = [], t0 = performance.now(), iv = setInterval(() => { const a = window.__bgmSt(), b = window.__seg.st(); o.push({ t: Math.round(performance.now() - t0), T: Math.round(performance.now()), cur: a.cur, slug: a.slug, want: a.want, seg: b.seg, id: b.id, plays: b.plays }); if (performance.now() - t0 > ms) { clearInterval(iv); res(o); } }, 100); }), ms), ix: (pr) => Rq.findIndex(pr), fire: (i) => pg.evaluate((i) => window.__bgmGo.fire(i), i), log0: () => pg.evaluate(() => { window.__bgmLog.length = 0; }), log: () => pg.evaluate(() => window.__bgmLog.slice()) }; };
const SR = 22050, mk = (sec, hz) => { const n = SR * sec, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(9000 * Math.sin(2 * Math.PI * (hz || 220) * i / SR)), 44 + i * 2); return b; };
const dB = (x) => (x > 0 ? 20 * Math.log10(x) : -200);
/* 입장 장면 콘솔 — 두 분이 올린 입장 곡(sec · hook) · M4 곡 파일(있으면) · GO 판 · 입장 큐 · need = 콘솔 «긴 곡» 기준(초) */
const entryCon = async ({ sec, hook, need, m4 }) => {
  const SONG = mk(sec, 220).toString('base64'), FID = 'SONGID0123456789abcd', S1 = Object.assign(S0of({ prevideo: 0, candle: 0 }, 'A'), { entryVoice: 'nar', mu: { src: 'up', name: 'song-day', t: '시험 곡', a: '', dur: sec, hook, typed: null, sid: 'x1', fid: FID } });
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }), pg = await ctx.newPage(), errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; window.__bgmLog = []; });
  await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); const H = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
    if (/script\.google\.com/.test(u)) { let b = {}; try { b = JSON.parse(rt.request().postData() || '{}'); } catch {}
      if (b.fn === 'adminRitualFiles') return rt.fulfill({ status: 200, headers: H, body: JSON.stringify({ ok: true, sup: {}, files: [{ key: 'mu', id: FID, name: '입장 음악 · song-day.wav' }] }) });
      if (b.fn === 'adminRitualFileGet') return rt.fulfill({ status: 200, headers: H, body: JSON.stringify({ ok: true, id: FID, mime: 'audio/wav', data: SONG }) }); }
    return rt.fulfill({ status: 200, headers: H, body: '{"ok":true}' }); });
  await pg.goto(`http://127.0.0.1:${port}/console.html`); await pg.evaluate(() => { localStorage.setItem('me_admin_token', 'T0K'); });
  await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S1)).toString('base64'))}&rf=ME0001`); await pg.waitForTimeout(800);
  if (m4) { const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'eard-')), p = path.join(TMP, 'M4.wav'); fs.writeFileSync(p, mk(90, 330)); await pg.setInputFiles('.sg[data-seg="M4"] .sg-song:nth-of-type(1) [data-seg-file]', p, { timeout: 8000 }); await pg.waitForTimeout(1200); }
  await pg.waitForFunction(() => window.__esd.s().st === 'ok', null, { timeout: 60000 }).catch(() => {}); await pg.click('#go'); await pg.waitForFunction(() => window.__esd.s().v0 && window.__esd.idx().e >= 0, null, { timeout: 60000 }).catch(() => {});
  if (need != null) await pg.evaluate((n) => window.__esdT.need(n), need); const I = await pg.evaluate(() => window.__esd.idx()); await pg.evaluate((j) => window.__esd.fire(j), I.e); await pg.waitForTimeout(500);
  for (let k = 0; k < 3 && !(await pg.evaluate(() => window.__esd.s().run)); k++) { await pg.waitForTimeout(1500); await pg.evaluate((j) => window.__esd.fire(j), I.e); await pg.waitForTimeout(500); }
  const Rq = await pg.evaluate(() => window.__bgmR());
  return { ctx, pg, errs, I, Rq, smp: (ms) => pg.evaluate((ms) => new Promise((res) => { const o = [], t0 = performance.now(), iv = setInterval(() => { const x = window.__earD ? window.__earD() : null; o.push(Object.assign({ t: Math.round(performance.now() - t0) }, x || { none: 1 })); if (performance.now() - t0 > ms) { clearInterval(iv); res(o); } }, 50); }), ms) };
};
/* 겹치는 동안 합 낙차 — 배경음이 −60 dB 위로 오른 때에서 거슬러 입장 곡이 내려가기 시작한 때(시작) · 입장 곡이 사라지고 배경음이 끝 크기 95%에 닿을 때(끝) ·
   앞 크기 = 시작 앞 0.5초 입장 곡 · 뒤 크기 = 마지막 1초 배경음 · 낙차 = 둘 중 낮은 쪽 − 그사이 두 소리 합(전력)의 최저 */
const dip = (o) => { const L = o.map((x) => ({ t: x.t, e: x.e || 0, b: x.b || 0 })).map((x) => Object.assign(x, { s: Math.sqrt(x.e * x.e + x.b * x.b) }));
  const iB = L.findIndex((x) => x.b > 1e-3); if (iB < 10) return { none: true, iB };
  let i0 = iB; while (i0 > 1 && L[i0 - 1].e > L[i0].e * 1.0005) i0--;
  const tail = L.slice(-20), bF = tail.reduce((a, x) => a + x.b, 0) / tail.length; let iF = iB; while (iF < L.length - 1 && !(L[iF].e < 1e-4 && L[iF].b >= bF * 0.95)) iF++;
  const pre = L.slice(Math.max(0, i0 - 10), i0), lv0 = dB(pre.reduce((a, x) => a + x.e, 0) / Math.max(1, pre.length)), lv1 = dB(bF), w = L.slice(i0, iF + 1), lo = Math.min(...w.map((x) => dB(x.s))), at = w.find((x) => dB(x.s) === lo);
  return { lv0: Math.round(lv0 * 10) / 10, lv1: Math.round(lv1 * 10) / 10, lo: Math.round(lo * 10) / 10, drop: Math.round((Math.min(lv0, lv1) - lo) * 10) / 10, start: L[i0].t, end: L[iF].t, at: at && at.t }; };
/* 이어 잇기(LONG) — 걷기 크기가 자리 잡은 뒤(11초부터) 입장 곡 크기의 가운데 값 − 최저 */
const relayDip = (o) => { const L = o.filter((x) => x.run && x.t > 11000 && x.e > 0).map((x) => dB(x.e)); if (L.length < 40) return { none: true, n: L.length }; const srt = L.slice().sort((a, b) => a - b), med = srt[Math.floor(srt.length / 2)], lo = srt[0]; return { med: Math.round(med * 10) / 10, lo: Math.round(lo * 10) / 10, drop: Math.round((med - lo) * 10) / 10, n: L.length }; };
try {
  await Promise.all([
  (async () => { try { if (want('A')) {
    /* ① 짧은 곡(기본 180초 기준) — 32초 곡 · 강조 24초 · M4 곡 파일 있음 */
    const c = await entryCon({ sec: 32, hook: 24, m4: true }); const a = await c.pg.evaluate(() => window.__esd.s()); const o = await c.smp(26000);
    if (process.env.EAR_DUMP) console.log(o.filter((x, i) => i % 4 === 0).map((x) => x.t + ':' + dB(x.e).toFixed(1) + '/' + dB(x.b).toFixed(1) + (x.run ? 'R' : '') ).join(' '));
    const d = dip(o), seen = [...new Set(o.filter((x) => x.b > 0.01).map((x) => x.id))];
    console.log('  재 본 값 ①', JSON.stringify(d));
    ok('① 짧은 입장 곡 → 본식 곡(M4) 인계 — 겹치는 3초 동안 두 소리 합 낙차 3 dB 이하', a.run && a.short && !d.none && d.lv1 > -60 && d.drop <= 3, { a: [a.run, a.short], d, seen });
    ok('① 콘솔 오류 0', !c.errs.length, c.errs.slice(0, 3)); await c.ctx.close(); } } catch (e) { ok('A 갈래가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); } })(),
  (async () => { try { if (want('B')) {
    /* ② 도착 멘트 — 150초 곡 · 걷는 중 도착 GO */
    const c = await entryCon({ sec: 150, hook: 40 }); const iA = c.Rq.findIndex((x) => x.slug === 'narr-entry-arrive');
    await c.pg.waitForFunction(() => window.__esd.s().phase !== 'clip', null, { timeout: 60000 }).catch(() => {}); await c.pg.waitForTimeout(2000);
    const w0 = await c.pg.evaluate(() => window.__earD()); const pr = c.smp(7000); await c.pg.waitForTimeout(100); await c.pg.evaluate((j) => window.__bgmGo.fire(j), iA); const o = await pr;
    const k = o.findIndex((x) => x.cur === iA && x.nar), fw = k > -1 ? o[k] : null, go = o.findIndex((x) => x.cur === iA), rel = fw ? Math.round((dB(fw.e) - dB(w0.e)) * 10) / 10 : null;
    console.log('  재 본 값 ② 걷기', Math.round(dB(w0.e) * 10) / 10, '첫 단어', fw && Math.round(dB(fw.e) * 10) / 10, '차이', rel, 'GO→멘트 ms', fw && go > -1 ? fw.t - o[go].t : null);
    ok('② 도착 멘트 첫 단어 — 입장 곡이 걷기 크기보다 18 dB 이상 아래(잦아듦은 GO 에서 먼저 시작)', w0.run && iA > -1 && fw && rel <= -18, { walk: Math.round(dB(w0.e) * 10) / 10, firstWord: fw && Math.round(dB(fw.e) * 10) / 10, rel, goAt: go > -1 ? o[go].t : null, wordAt: fw && fw.t });
    const tail = o.filter((x) => x.t > (fw ? fw.t : 0) + 3600);
    ok('② 대조 — 잦아듦 길이 4.5초 그대로(GO 뒤 4.6초부터 입장 곡이 걷기 크기보다 40 dB 넘게 아래) · 멘트가 1초 넘게 늦지 않다', fw && go > -1 && fw.t - o[go].t <= 1400 && fw.t - o[go].t >= 800 && tail.length && tail.every((x) => dB(x.e) - dB(w0.e) <= -40), { gap: fw && go > -1 ? fw.t - o[go].t : null, tail: tail.slice(0, 2).map((x) => Math.round((dB(x.e) - dB(w0.e)) * 10) / 10) });
    ok('② 콘솔 오류 0', !c.errs.length, c.errs.slice(0, 3)); await c.ctx.close(); } } catch (e) { ok('B 갈래가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); } })(),
  (async () => { try { if (want('C')) {
    /* 대조 — 긴 곡 이어 잇기(LONG · 같은 곡선) */
    const c = await entryCon({ sec: 32, hook: 24, need: 5 }); const o = await c.smp(22000); const rl = o.filter((x) => x.run).length;
    const d = relayDip(o), relays = await c.pg.evaluate(() => window.__esd.s().relay);
    console.log('  재 본 값 LONG', JSON.stringify(d), 'relay', relays);
    ok('대조 긴 곡 이어 잇기(LONG) — 같은 곡선 · 겹치는 동안 합 낙차 3 dB 이하 · 장면 계속', rl > 100 && relays >= 1 && !d.none && d.drop <= 3, { d, rl, relays });
    ok('C 콘솔 오류 0', !c.errs.length, c.errs.slice(0, 3)); await c.ctx.close(); } } catch (e) { ok('C 갈래가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); } })(),
  ]);
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); }
await br.close(); srv.close();
console.log(fail ? `EAR D FAIL ${fail}` : 'EAR D OK');
process.exit(fail ? 1 : 0);
