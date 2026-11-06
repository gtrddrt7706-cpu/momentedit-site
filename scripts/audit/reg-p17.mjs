#!/usr/bin/env node
/* ★★[REG_P17 2026-11-06 GPT 검토 P17 · BGM 몫(엔진)] 멈춘 동안 «음악 켜기» — order-preview prMusicTgl 이 BgmBed.lpShow 를 불러도 소리를 먼저 내지 않는다
   T01 멈춘 동안 lpShow · lpLead = 소리 0(새 곡을 걸지 않는다) · «보류된 켜기»만 적는다
   T02 이어 듣기(lpResume) = 지금 줄 곡 · 저장 위치(±1초) · 지금 줄 크기로 0.6초에
   T03 대조 — 멈춤이 아닐 때 켜기 = 바로 재생
   T04 대조 — 의도적 무음 줄(맞절 · 목표 −60 이하)에서 이어 들으면 무음 그대로
   T05 끄기 · 끝내기 · 새 시작은 보류를 지운다(이어 들어도 소리 0)
   T06 다음 순간 몫 이음말(_pre) 줄에서 보류 뒤 이어 들어도 새 곡을 한 줄 일찍 걸지 않는다(lpShow 규칙 그대로 · 검토 B)
   하네스는 seam-b2 와 같다 · BP_BED = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
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
/* 멈춘 듣기를 만든다 — 감사 인사(또는 ks) 듣기를 열고 곡이 흐르면 멈춘다(멈춤 감시가 곡 · 자리를 적고 끈다) · 그 뒤 «음악 끄기» */
const setup = async (ks, pickRow) => {
  const { ctx, f, errs } = await open(390, true);
  await f.evaluate(() => { const i = STEPS.findIndex((x) => x.k === 'listen'); if (i > -1) { idx = i; render(); } });
  const r0 = await f.evaluate(async ({ ks, pickRow }) => { const BB = BgmBed._t, W = (ms) => new Promise((r) => setTimeout(r, ms)), on = () => !!(BB.BED.cur && BB.BED.cur.src && BB.BED.cur.want > -60);
    LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(ks, true); _lFull(); (LP.q || []).forEach((x) => { if (x.talk || x.talk2 || x.said || x.act || x.quiet) x.ms = 2500; });
    for (let k = 0; k < 150 && !(LP.i >= 1 && on()); k++) await W(100); await W(800); const a0 = on(), f0 = BB.BED.cur && BB.BED.cur.f;
    LP.paused = true; clearTimeout(LP.t); LP.tok++; await W(1200); const a1 = on(); BgmBed.lpEnd(); await W(1800);
    const lv = (st) => { const ff = BgmBed._t.LPB && st ? (window.BgmBed._t.fileFor ? window.BgmBed._t.fileFor(st) : null) : null; return ff; };
    let pick = -1; for (let j = 0; j < LP.q.length; j++) { const x = LP.q[j]; if (pickRow === 'pre' ? !!x._pre : pickRow === 'silent' ? (x.k === 'matjeol' && x.dk != null && x.dk <= -60 && !x._pre) : (x.k === 'welcome' && !x._pre && !x.bridge && x.dk != null && x.dk > -60 && !/narr-welcome-in/.test(x.slug || '') && !/^bridge-/.test(x.slug || ''))) { pick = j; break; } }
    window.__pk = pick; if (pick > -1) LP.i = pick; return { a0, f0, a1, pick, n: LP.q.length, ks: LP.q.map((x) => x.k + ':' + x.dk).slice(0, 40) }; }, { ks, pickRow });
  return { ctx, f, errs, r0 };
};
/* 0.9초 동안 30ms 마다 — 들리는 소리(BED.cur 의 실제 이득)가 생기는가 */
const listen = (f, ms) => f.evaluate((ms) => new Promise((res) => { const B = BgmBed._t.BED, o = { src: 0, gmax: 0 }, t0 = performance.now(), iv = setInterval(() => { const v = B.cur; if (v && v.src) { o.src++; if (v.g) o.gmax = Math.max(o.gmax, v.g.gain.value); } if (performance.now() - t0 > ms) { clearInterval(iv); o.gmax = Math.round(o.gmax * 10000) / 10000; res(o); } }, 30); }), ms);
try {
  await Promise.all([
  (async () => { try { if (want('A')) {
    const { ctx, f, errs, r0 } = await setup(['welcome'], 'talk');
    ok('준비 — 감사 인사 듣기 곡이 흐르다 멈추면 꺼진다', r0.a0 && !r0.a1, r0);
    const r1 = await f.evaluate(() => { const st = LP.q[LP.i]; BgmBed.lpShow(st); return { slug: st.slug, hold: !!BgmBed._t.LPB.hold }; }); const l1 = await listen(f, 1200);
    const r1b = await f.evaluate(() => { const st = LP.q[LP.i]; const ms = BgmBed.lpLead(st); return { ms, hold: !!BgmBed._t.LPB.hold }; }); const l1b = await listen(f, 900);
    ok('T01 멈춘 동안 lpShow · lpLead(«음악 켜기») — 소리 0 · 보류된 켜기만 적는다', l1.src === 0 && l1.gmax === 0 && l1b.src === 0 && r1.hold && r1b.hold, { r1, l1, r1b, l1b });
    const r2 = await f.evaluate(async () => { const BB = BgmBed._t, W = (ms) => new Promise((r) => setTimeout(r, ms)), st = LP.q[LP.i];
      const pz = BB.LPB.pz, f0 = pz && pz.keep && pz.st === st ? pz.f : null, kp = Object.assign({}, BB.LPB.keep);
      LP.paused = false; const rr = BgmBed.lpResume(); await W(250); const v = BB.BED.cur, at0 = v ? (f0 && pz.pos != null ? pz.pos : (kp[v.f] || 0)) : null, g250 = v && v.g ? v.g.gain.value : 0; await W(700);
      const ac = v && v.g && v.g.context, pos = v && v.src && v.src.buffer && ac ? ((v.off + (ac.currentTime - v.t0)) % v.src.buffer.duration) : null;
      return { rr, f: v && v.f, f0, at0: at0 != null ? Math.round(at0 * 10) / 10 : null, pos: pos != null ? Math.round(pos * 10) / 10 : null, want: v && v.want, lv: v && BB.lvOf(st, v.f), g250: Math.round(g250 * 1000) / 1000, g950: v && v.g ? Math.round(v.g.gain.value * 1000) / 1000 : 0, hold: !!BB.LPB.hold }; });
    ok('T02 이어 듣기 — 지금 줄 곡 · 저장 위치 ±1초 · 지금 줄 크기 · 0.6초에 오른다(0.25초엔 아직 오르는 중)', r2.rr && r2.f && (!r2.f0 || r2.f === r2.f0) && r2.at0 != null && r2.pos != null && Math.abs(r2.pos - (r2.at0 + 0.95)) <= 1 && r2.want === r2.lv && r2.want > -60 && r2.g250 < r2.g950 && !r2.hold, r2);
    ok('A 쪽 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close(); } } catch (e) { ok('A 갈래가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); } })(),
  (async () => { try { if (want('B')) {
    const { ctx, f, errs, r0 } = await setup(['welcome'], 'talk');
    /* T03 대조 — 멈춤이 아닐 때 켜기 = 바로 */
    const r3 = await f.evaluate(async () => { const BB = BgmBed._t, W = (ms) => new Promise((r) => setTimeout(r, ms)); LP.paused = false; clearTimeout(LP.t); LP.tok++; BgmBed.lpShow(LP.q[LP.i]); await W(700); const v = BB.BED.cur; return { src: !!(v && v.src), want: v && v.want, g: v && v.g ? Math.round(v.g.gain.value * 1000) / 1000 : 0 }; });
    ok('T03 대조 — 멈춤이 아닐 때 «음악 켜기» = 바로 재생', r0.a0 && r3.src && r3.want > -60 && r3.g > 0, { r0, r3 });
    /* T05 끄기 · 끝내기는 보류를 지운다 */
    const r5 = await f.evaluate(async () => { const BB = BgmBed._t, W = (ms) => new Promise((r) => setTimeout(r, ms)); LP.paused = true; clearTimeout(LP.t); LP.tok++; await W(600); BgmBed.lpEnd(); await W(1700);
      BgmBed.lpShow(LP.q[LP.i]); const h1 = !!BB.LPB.hold; BgmBed.lpEnd(); const h2 = !!BB.LPB.hold; LP.paused = false; const rr = BgmBed.lpResume(); await W(1200); const v = BB.BED.cur; return { h1, h2, rr, src: !!(v && v.src && v.want > -60) }; });
    ok('T05 멈춘 동안 켰다가 끄면(lpEnd) 보류가 지워져 이어 들어도 소리 0', r5.h1 && !r5.h2 && !r5.rr && !r5.src, r5);
    ok('B 쪽 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close(); } } catch (e) { ok('B 갈래가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); } })(),
  (async () => { try { if (want('C')) {
    const { ctx, f, errs, r0 } = await setup(['entry', 'matjeol', 'welcome'], 'silent');
    const r4 = await f.evaluate(async () => { const BB = BgmBed._t, W = (ms) => new Promise((r) => setTimeout(r, ms)), st = LP.q[LP.i]; BgmBed.lpShow(st); const hold = !!BB.LPB.hold; await W(600); LP.paused = false; const rr = BgmBed.lpResume(); await W(1200); const v = BB.BED.cur; return { k: st.k, slug: st.slug, dk: st.dk, hold, rr, src: !!(v && v.src && v.want > -60), g: v && v.g ? Math.round(v.g.gain.value * 1000) / 1000 : 0 }; });
    console.log('T04 줄', r4.k, r4.slug, r4.dk); ok('T04 대조 — 의도적 무음 줄(맞절 · 목표 −60 이하)에서 «음악 켜기» 뒤 이어 들으면 무음 그대로', r0.pick > -1 && r4.k === 'matjeol' && r4.dk <= -60 && !r4.src && r4.g < 0.01, { r0: { pick: r0.pick, ks: r0.ks }, r4 });
    ok('C 쪽 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close(); } } catch (e) { ok('C 갈래가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); } })(),
  (async () => { try { if (want('D')) {
    const { ctx, f, errs, r0 } = await setup(['entry', 'matjeol', 'welcome'], 'pre');
    const r6 = await f.evaluate(async () => { const BB = BgmBed._t, W = (ms) => new Promise((r) => setTimeout(r, ms)), st = LP.q[LP.i]; st.dk = -16; st.ldk = null;   /* 이음말이 말 아래 크기(−16)인 판(b12 · b14 꼴) */
      BgmBed.lpShow(st); const hold = !!BB.LPB.hold; await W(600); LP.paused = false; BgmBed.lpResume(); await W(1200); const v = BB.BED.cur; return { slug: st.slug, pre: !!st._pre, hold, src: !!(v && v.src && v.want > -60), f: v && v.f, g: v && v.g ? Math.round(v.g.gain.value * 1000) / 1000 : 0 }; });
    ok('T06 다음 순간 몫 이음말(_pre)에서 보류 뒤 이어 듣기 — 새 곡을 한 줄 일찍 걸지 않는다', r0.pick > -1 && r6.pre && r6.hold && !r6.src && r6.g < 0.01, { r0: { pick: r0.pick }, r6 });
    ok('D 쪽 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close(); } } catch (e) { ok('D 갈래가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); } })(),
  ]);
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); }
await br.close(); srv.close();
console.log(fail ? `REG P17 FAIL ${fail}` : 'REG P17 OK');
process.exit(fail ? 1 : 0);
