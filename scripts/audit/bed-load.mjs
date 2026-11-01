#!/usr/bin/env node
/* ★★[BED_LOAD_1101 2026-11-01 사장님 «노래가 안 흐르는데?» · 아이폰 LTE · 블루투스] 이 순간 전체 듣기 곡 받기
   a 곡이 늦게 오면(9초) 뜸이 기다린다 · 1.5초 넘으면 지금 줄 아래 «음악을 불러오는 중이에요» · 오면 그때부터 뜸 6초 뒤 멘트
   b 아주 늦으면(15초) 뜸은 8초까지 · 멘트부터 · 곡이 오면 그 줄 크기로
   c 못 받음(L3) · 못 풂(M6) — «음악을 불러오지 못했어요 · 나레이션만 들려 드려요 (코드 …)» 한 줄 · 쪽 오류 0
   d 순간 여섯을 차례로 열고 들어도 풀어 둔 곡 ≤ 3
   e 순간 쪽을 열면 그 순간 곡 받기 요청 1번
   f 소리 길을 열 때 navigator.audioSession.type = 'playback'(iOS 무음 스위치)
   BP_OP · BP_BED = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const OP = process.env.BP_OP || '', BED = process.env.BP_BED || '', SLOTS = process.env.BP_SLOTS || '', CON = process.env.BP_CON || '', CUE = process.env.BP_CUE || '';
const O = require(path.join(ROOT, 'assets/ritual-open.js')); require(path.join(ROOT, 'assets/ritual-data.js')); const C = require(CUE || path.join(ROOT, 'assets/ritual-cue.js'));
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 600)}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
function wav(sec, f, sr = 16000) { const n = Math.round(sr * sec), b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(f ? 8000 * Math.sin(2 * Math.PI * f * i / sr) : 0), 44 + i * 2); return b; }
const SHORT = wav(0.6, 330);   /* 나레이션 대신 — 0.6초 */
/* 드라이브에 있는 곡(시험) — B30(화촉 3) · 테이블 인사 2 · 3(B23 · B16)은 없다 */
const RL = [{ k: 'r5', name: '경쾌하게', t: '시험 입장 곡', a: '시험 가수', hook: 40, hook0: 40, len: 140, file: 'r5.mp3', img: '/assets/home/snap.webp', pos: '50% 50%' },
  { k: 'r1', name: '잔잔하게', t: '짧은 판 곡', a: '시험 가수', hook: 40, hook0: 40, len: 70, file: 'r1.mp3', pf: 'r1p.mp3', p0: 10, p1: 70, hooks: [40], img: '/assets/home/snap.webp', pos: '50% 50%' }];
const HAVE = ['B01', 'B05', 'B07', 'B09', 'B10', 'B11', 'B12', 'B13', 'B15', 'B17', 'B20', 'B24', 'B28'];   /* [BGM_TIMING_1101] 테이블 인사 곡도 — 축배 뜸 곡 e · ★[PICKS_THREE_1101] 구간마다 3곡 — 테이블 1순위 B24 · 뺀 곡 대신 B07 · B11 · B20 */
const SONG = {}; HAVE.forEach((k, i) => { SONG[k] = wav(20, 180 + i * 20).toString('base64'); });
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
  const p = (OP && u === '/order-preview.html') ? OP : (BED && u === '/assets/bgm-bed.js') ? BED : (SLOTS && u === '/assets/bgm-slots.js') ? SLOTS : (CUE && u === '/assets/ritual-cue.js') ? CUE : (CON && u === '/console.html') ? CON : path.join(ROOT, u);
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
const go = async (f, k) => { await f.evaluate((k) => mkGo(k), k); await wait(f, 600); };
async function trace(f, ks, ms) {
  return f.evaluate(async ({ ks, ms }) => { const BB = BgmBed._t, o = [];
    if (!window.__lpMs0) window.__lpMs0 = window._lpMs; window._lpMs = function () { return 1500; };
    LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(ks, true); _lFull();
    (LP.q || []).forEach((x) => { if (x.talk2 || x.said) x.ms = 1500; });
    const t0 = performance.now(), Q0 = LP.q;
    await new Promise((res) => { const iv = setInterval(() => { const v = BB.BED.cur, st = LP.q[LP.i], nt = document.querySelector('.lp-bednote');
      o.push({ t: performance.now() - t0, i: LP.i, k: st && st.k, lead: !!LP.leadSt, f: v && v.f, src: !!(v && v.src), want: v && v.want, nt: nt ? nt.textContent : '' });
      if (performance.now() - t0 > ms) { clearInterval(iv); res(); } }, 100); });
    const q = (Q0 || []).map((x) => ({ k: x.k, slug: x.slug || x.of || '', dk: x.dk, ldk: x.ldk }));
    try { lsStop(); } catch (x) {} try { lsCloseBig(); } catch (x) {} window._lpMs = window.__lpMs0; return { o, q }; }, { ks, ms }); }
const forget = (f, ids) => f.evaluate((ids) => { const t = BgmBed._t; ids.forEach((x) => { delete t.BUF[x]; if (t.MW) delete t.MW.tried[x]; }); }, ids);
const loud = (x) => x.src && x.want != null && x.want > -60;
const ASIS = () => { try { Object.defineProperty(navigator, 'audioSession', { value: { type: 'auto' }, configurable: true }); } catch (e) {} };
const TS = 'B15';   /* 부모님께 인사 곡(M5 1순위) */
try {
  for (const W of [390, 1280]) {
    const { ctx, pg, f, errs } = await open(W, true, ASIS);
    await f.evaluate(() => { S.tributeSay = 'short'; S.on.song = 0; S.on.letter = 0; S.on.free = 0; delete S.bgm; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); });
    const H = (o) => pg.evaluate((o) => { Object.assign(H.dly, o.dly || {}); Object.assign(H.bad, o.bad || {}); Object.assign(H.gone, o.gone || {}); if (o.log) H.log.length = 0; return H.log.slice(); }, o);
    /* e 순간 쪽을 열면 그 곡 받기 요청 1번 */
    for (const [mk, sid] of [['tribute', TS], ['table', 'B24'], ['candle', 'B05']]) { await go(f, mk === 'candle' ? 'welcome' : 'candle'); await forget(f, [sid]); await H({ log: 1 }); await go(f, mk); await wait(f, 1500); await go(f, mk === 'candle' ? 'welcome' : 'candle'); await go(f, mk); await wait(f, 800);
      const lg = (await H({})).filter((x) => x === 'momentedit:ritualFileGet:bed:' + sid);
      ok(`${W} e 순간 쪽(${mk})을 열면 그 곡(${sid}) 받기 요청 1번 · 다시 열어도 1번`, lg.length === 1, { n: lg.length }); }
    /* a 9초 늦게 */
    { await go(f, 'welcome'); await forget(f, [TS]); await H({ dly: { [TS]: 9000 } }); await go(f, 'tribute'); await wait(f, 1400);
      const r = await trace(f, ['tribute'], 24000), L = r.o.filter((x) => x.lead), l0 = L.length ? L[0].t : null, l1 = L.length ? L[L.length - 1].t : null, tS = (r.o.find((x) => x.f === TS && x.src) || {}).t;
      const ld = r.o.filter((x) => x.lead && l0 != null && x.t > l0 + 1700 && tS != null && x.t < tS - 200), late = r.o.filter((x) => tS != null && x.t > tS + 400);
      ok(`${W} a 곡이 늦게(9초) 오면 뜸이 기다린다 · 1.5초 뒤 «음악을 불러오는 중이에요» · 오면 그때부터 뜸 6초 뒤 멘트`, l0 != null && tS != null && tS - l0 > 2500 && ld.length > 3 && ld.every((x) => x.nt === '음악을 불러오는 중이에요') && l1 - tS > 5300 && l1 - tS < 6900 && late.every((x) => !x.nt) && !r.o.some((x) => x.lead && l0 != null && x.t < l0 + 1300 && x.nt),
        { l0: l0 && Math.round(l0), tS: tS && Math.round(tS), l1: l1 && Math.round(l1), note: [...new Set(r.o.map((x) => x.nt))], nld: ld.length });
      ok(`${W} a 쪽 오류 0`, !errs.length, errs.slice(0, 3)); }
    if (W === 390) {
      /* b 15초 늦게 */
      { await go(f, 'welcome'); await forget(f, [TS]); await H({ dly: { [TS]: 15000 } }); await go(f, 'tribute');
        const r = await trace(f, ['tribute'], 24000), L = r.o.filter((x) => x.lead), lm = L.length ? L[L.length - 1].t - L[0].t : 0, s1 = r.o.find((x) => x.f === TS && x.src && x.t > 1000);
        const lvAt = s1 ? r.o.filter((x) => x.f === TS && x.src && x.t > s1.t + 1600 && x.t < s1.t + 2600) : [];
        ok('b 곡이 아주 늦게(15초) 오면 뜸은 8초까지 · 멘트부터 · 곡이 오면 그 줄 크기로(큐 사이 −8 아님)', lm > 7300 && lm < 8800 && !!s1 && !s1.lead && lvAt.length > 0 && lvAt.every((x) => x.want < -10),
          { lm: Math.round(lm), s1: s1 && { t: Math.round(s1.t), i: s1.i, lead: s1.lead }, lv: lvAt.slice(0, 2).map((x) => x.want) }); }
      /* c 못 받음 · 못 풂 */
      for (const [nm, o, code] of [['파일 없음', { gone: { [TS]: true }, dly: { [TS]: 40 } }, 'L3'], ['디코딩 실패', { gone: { [TS]: false }, bad: { [TS]: true } }, 'M6']]) {
        await go(f, 'welcome'); await forget(f, [TS]); await H(o); await go(f, 'tribute');
        const r = await trace(f, ['tribute'], 7000), nts = [...new Set(r.o.map((x) => x.nt).filter(Boolean))], want = '음악을 불러오지 못했어요 · 나레이션만 들려 드려요 (코드 ' + code + ')';
        ok(`c ${nm} — 지금 줄 아래 «${want}» · 뜸에 머물지 않는다 · 오류 0`, nts.includes(want) && r.o.filter((x) => x.lead).length < 20 && !errs.length, { nts, lead: r.o.filter((x) => x.lead).length, errs: errs.slice(0, 2) }); }
      await H({ bad: { [TS]: false }, gone: { [TS]: false }, dly: { [TS]: 40 } });
      /* d 순간 여섯 — 풀어 둔 곡 ≤ 3 */
      { await f.evaluate(() => { ['candle', 'welcome', 'letter', 'tribute', 'table', 'toast'].forEach((k) => { S.on[k] = 1; }); S.bgm = { S6: { m: 'bed' } }; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); });
        const cnt = () => f.evaluate(() => { const B = BgmBed._t.BUF; return Object.keys(B).filter((x) => B[x] && B[x].st === 'ok' && B[x].b); }), seen = [];
        for (const k of ['candle', 'welcome', 'letter', 'tribute', 'table', 'toast']) { await go(f, k); await trace(f, [k], 6500); await wait(f, 400); const c = await cnt(); seen.push(k + ':' + c.length + '[' + c.join(',') + ']'); }
        ok('d 순간 여섯을 차례로 열고 들어도 풀어 둔 곡 ≤ 3', seen.every((s) => +s.split(':')[1].split('[')[0] <= 3) && seen.some((s) => +s.split(':')[1].split('[')[0] >= 2), seen); }
      /* ★[BED_LOAD_1101 덧1 · 덧2] 편지 끝 곡 · 미리 받기 목록 */
      { const F = await f.evaluate(() => { const t = BgmBed._t; return { m4: t.eff('M4'), m4s6: t.eff('M4S6'), m5: t.eff('M5'), m6: t.eff('M6'), m7: t.eff('M7') }; });
        const setOn = (o, bgm) => f.evaluate(({ o, bgm }) => { Object.keys(o).forEach((k) => { S.on[k] = o[k]; }); if (bgm) S.bgm = bgm; else delete S.bgm; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); }, { o, bgm });
        const T2 = { letter: 1, tribute: 0, table: 0, toast: 1, song: 0, free: 0 };
        /* g 편지(음악 없이) → 축배 · 편지만 듣기 — 끝에 오르는 곡 = M4 · M7 · M6 0 */
        await setOn(T2, null); await go(f, 'toast'); await go(f, 'letter');
        let r = await trace(f, ['letter'], 15000), lv = r.o.filter((x) => x.src && x.want > -60);
        ok(`g 편지(음악 없이) → 축배(부모님께 인사 · 테이블 없음) 편지만 듣기 — 끝에 오르는 곡 = M4(${F.m4}) · M7 · M6 0`, lv.length > 3 && lv[0].f === F.m4 && !r.o.some((x) => x.src && (x.f === F.m7 || x.f === F.m6)), { first: lv[0], fs: [...new Set(r.o.filter((x) => x.src).map((x) => x.f))] });
        /* j 편지 «음악과 함께» → 축배 — 축배 여는 말 곡 = M4 · M4S6 0(겹침 3초 뒤) */
        await setOn(T2, { S6: { m: 'bed' }, M4: { k: F.m4 } }); await go(f, 'toast'); await go(f, 'letter');   /* ★[CARRY_SAME_1101] 본식 곡(M4)을 골라 둔 날 — 편지 곡이 본식 목록에 있어도 고른 곡으로 돌아온다(고르지 않았으면 그대로 잇는다 · carry-same g) */
        r = await trace(f, ['letter', 'toast'], 26000); const iT = r.q.findIndex((x) => x.k === 'toast'), tT = (r.o.find((x) => x.k === 'toast') || {}).t;
        const tz = r.o.filter((x) => x.k === 'toast' && tT != null && x.t > tT + 3200 && x.src && x.want > -60);
        ok(`j 편지 «음악과 함께» → 축배 — 축배 여는 말 곡 = M4(${F.m4}) · M4S6(${F.m4s6}) 0`, iT > -1 && tz.length > 3 && tz.every((x) => x.f === F.m4) && !r.o.some((x) => x.k === 'toast' && x.t > tT + 3200 && x.f === F.m4s6 && x.src), { iT, fs: [...new Set(tz.map((x) => x.f))] });
        /* i 다음 곡이 12초 늦을 때 편지 끝 동안 옛 곡 재생 0(편지 «음악 없이» → 부모님께 인사 · M4 는 다음 첫 줄 곡이 아님) */
        await setOn({ letter: 1, tribute: 1, table: 0, toast: 0, song: 0, free: 0 }, null); await go(f, 'tribute'); await go(f, 'letter'); await forget(f, [F.m5]); await H({ dly: { [F.m5]: 12000 } });
        r = await trace(f, ['letter', 'tribute'], 22000); const tE = (r.o.filter((x) => x.k === 'letter').pop() || {}).t, s5 = r.o.find((x) => x.f === F.m5 && x.src && x.want > -60);
        ok(`i 다음 곡(${F.m5})이 12초 늦으면 편지 끝 동안 옛 곡(${F.m4}) 재생 0 · 오면 그 곡`, tE != null && !r.o.some((x) => x.t > tE - 300 && (!s5 || x.t < s5.t) && x.f === F.m4 && x.src && x.want > -60) && !!s5, { tE: tE && Math.round(tE), s5: s5 && Math.round(s5.t), old: r.o.filter((x) => x.f === F.m4 && x.src && x.want > -60).slice(0, 2) });
        await H({ dly: { [F.m5]: 40 } });
        /* k lpWarm 요청 목록 */
        const lw = async (ks, on, bgm) => { await setOn(on, bgm); await f.evaluate(() => { const t = BgmBed._t; Object.keys(t.BUF).forEach((x) => { delete t.BUF[x]; }); }); await H({ log: 1 }); await f.evaluate((ks) => BgmBed.lpWarm(ks), ks); await wait(f, 400); return [...new Set((await H({})).filter((x) => /ritualFileGet:bed:B/.test(x)).map((x) => x.split(':').pop()))].sort(); };
        const w1 = await lw(['letter'], T2, { S6: { m: 'bed' } }), w2 = await lw(['toast'], T2, null), w3 = await lw(['free'], { free: 1, letter: 0, tribute: 0, table: 0, toast: 1, song: 0 }, { S5: { m: 'bed' } });
        const F5s = await f.evaluate(() => BgmBed._t.eff('M4S5'));
        ok(`k lpWarm — 편지 «음악과 함께» = M4 + M4S6 · 축배 = 잇는 곡(M4) + M7(M6 아님) · 축사 «음악과 함께» = M4 + M4S5`, JSON.stringify(w1) === JSON.stringify([F.m4, F.m4s6].sort()) && JSON.stringify(w2) === JSON.stringify([F.m4, F.m7].sort()) && JSON.stringify(w3) === JSON.stringify([F.m4, F5s].sort()), { w1, w2, w3 }); }
      /* f 무음 스위치 */
      { const t = await f.evaluate(() => navigator.audioSession && navigator.audioSession.type);
        ok('f 소리 길을 열면 navigator.audioSession.type = playback(iOS 무음 스위치)', t === 'playback', t); }
    }
    ok(`${W} 쪽 오류 0`, !errs.length, errs.slice(0, 3));
    await ctx.close();
  }
  const conOpen = async (S0, rows) => { const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }), errs = [], pg = await ctx.newPage(); pg.on('pageerror', (e) => errs.push(e.message));
    await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; window.__bgmLog = []; });
    await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: '{"ok":true}' })));
    await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S0)).toString('base64'))}`); await pg.waitForTimeout(900);
    const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'bedload-')), miss = [];
    for (const [sg, hz, nth] of rows) { const p = path.join(TMP, sg + '.wav'); fs.writeFileSync(p, wav(20, hz)); try { await pg.setInputFiles('.sg[data-seg="' + sg + '"] .sg-song:nth-of-type(' + (nth || 1) + ') [data-seg-file]', p, { timeout: 4000 }); } catch (e) { miss.push(sg); } }
    await pg.waitForTimeout(1200); await pg.click('#go'); await pg.waitForTimeout(700);
    const R = await pg.evaluate(() => window.__bgmR()); return { ctx, pg, errs, R, miss, ix: (fn) => R.findIndex(fn) }; };
  const sample = (pg, i, ms) => pg.evaluate(async ({ i, ms }) => { const o = []; window.__bgmLog.length = 0; const t0 = performance.now(); if (i != null) window.__bgmGo.fire(i);
    await new Promise((res) => { const iv = setInterval(() => { const g = window.__seg.st(), b = window.__bgmSt(); o.push({ t: performance.now() - t0, seg: g.seg, xg: g.xg, want: b.want, slug: b.slug, ph: b.phase }); if (performance.now() - t0 > ms) { clearInterval(iv); res(); } }, 100); });
    return o; }, { i, ms });
  const xf = (o) => o.some((x) => x.xg && x.xg[0] > 0.05 && x.xg[1] > 0.05);
  const base = () => { const S0 = O.applyExample({ course: 'open' }, 'standard'); S0.course = 'open'; S0.freeWhat = 'speech'; S0.song = 'family'; S0.songBy = 'friend'; return S0; };
  /* h · j 당일 콘솔 — 편지 → 축배(부모님께 인사 · 테이블 없음) */
  for (const bed of [false, true]) { const S0 = base(); S0.on = Object.assign({}, S0.on, { letter: 1, tribute: 0, table: 0, toast: 1, song: 0, free: 0 }); if (bed) S0.bgm = { S6: { m: 'bed', k: 'B12' }, M4: { k: 'B09' } }; else delete S0.bgm;   /* [DAYLONG_1101] 편지 곡 B12 = 본식 목록에 없는 곡(본식 목록 곡이면 그대로 잇는다 · carry-same g · daylong c) */   /* [CARRY_SAME_1101] 본식 곡을 골라 둔 날(편지 곡 B10 은 본식 목록에도 있다 · 고르지 않은 날은 carry-same g) */
    const C = await conOpen(S0, bed ? [['M4', 440], ['M4S6', 520, 2], ['M7', 700]] : [['M4', 440], ['M7', 700]]), iL = C.ix((c) => /^letter-/.test(c.slug || '')), iE = C.ix((c) => c.slug === 'narr-letter-end'), iT = C.ix((c) => c.slug === 'toast-toast'), iT0 = C.ix((c) => c.k === 'toast');
    if (C.miss.length || iL < 1 || iE < iL || iT < iE || iT0 < iE) { ok(`콘솔 시험 조건(${bed ? '음악과 함께' : '음악 없이'})`, false, { miss: C.miss, iL, iE, iT0, iT }); await C.ctx.close(); continue; }
    await C.pg.evaluate((i) => window.__bgmGo.fire(i), iL - 1); await C.pg.waitForTimeout(3000);
    const o1 = await sample(C.pg, iL, 5000), o2 = await sample(C.pg, iE, 9000), o3 = [];
    for (let i = iT0; i <= iT; i++) (await sample(C.pg, i, 3500)).forEach((x) => o3.push(x));
    const before = [].concat(o1, o2, o3), tap = await C.pg.evaluate(async () => { await new Promise((r) => setTimeout(r, 300)); window.__bgmGo.tap(); await new Promise((r) => setTimeout(r, 1500)); return window.__seg.st().seg; });
    if (!bed) ok('h 콘솔 편지(음악 없이) → 축배 — M7 은 «위하여» GO 에서만 · 그 전 축배 나레이션은 M4', !before.some((x) => x.seg === 'M7') && o3.length && o3.every((x) => x.seg === 'M4') && tap === 'M7', { segs: [...new Set(before.map((x) => x.seg))], tap });
    else ok('j 콘솔 편지 «음악과 함께» → 축배 — 편지 끝에서 M4S6 → M4 로 3초 겹침 · 축배 여는 말 곡 = M4 · M4S6 0 · M7 은 «위하여» GO 에서만', o2[o2.length - 1].seg === 'M4' && xf(o2) && o3.length && o3.every((x) => x.seg === 'M4') && !before.some((x) => x.seg === 'M7') && tap === 'M7', { o2: [...new Set(o2.map((x) => x.seg))], o3: [...new Set(o3.map((x) => x.seg))], tap });
    ok(`콘솔(${bed ? '음악과 함께' : '음악 없이'}) 쪽 오류 0`, !C.errs.length, C.errs.slice(0, 3)); await C.ctx.close(); }
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 500)); }
await br.close(); srv.close();
console.log(fail ? `BED LOAD FAIL ${fail}` : 'BED LOAD OK');
process.exit(fail ? 1 : 0);
