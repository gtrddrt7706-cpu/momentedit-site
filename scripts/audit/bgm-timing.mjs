#!/usr/bin/env node
/* ★★[BGM_TIMING_1101 2026-11-01 사장님 «BGM 투입 시점 적절함 — GPT 랑 하나하나 스텝 바이 스텝으로 토론해서 최적화해» · BGM 섹션 결정] 투입 시점 열 가지
   a 편지 «음악 없이» — 그 순간만 듣기 = 첫 소리가 여는 말 · 피아노 뜸 없음 · 이어 듣기에서 곡이 흐르다 오면 1.5초에 −90 → 정적 1초 → 여는 말
   b 편지 끝 → 부모님께 인사 — 편지 곡(M4) 되살림 0 · 정적 2초 뒤 부모님께 인사 곡이 무음에서 3초에(당일 콘솔 · 미리 듣기)
   c 축사 · 축가 맺는 말 «… 박수 부탁드립니다» −90 · 박수에서 1.5초에 −8(«음악과 함께» 축사는 맺는 말 −16)
   d 크기 — 축사 여는 말 −16 · 반지 행동 −12 · 부모님께 고마운 말 −20 · 서약 마지막 한 문장 −20 · 축배 여는 말 · «위하여» −16(잔 나누는 이음말 −8 그대로)
   e 축배만 듣기 뜸 곡 = 테이블 인사 곡(담겼으면) · 아니면 축배 바로 앞 순간의 곡(종전 닫는 인사 곡)
   f 귀가 인사 — 나레이션 끝 1.5초에 −8 → 90초 → 20초 소거
   BP_CUE · BP_OP · BP_BED · BP_CON = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
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
window.H={rl:${JSON.stringify(RL)},rs:${JSON.stringify(RS)},log:[],draft:null,saved:null,delay:40,have:${JSON.stringify(HAVE)},songs:${JSON.stringify(SONG)}};
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
        if(!H.songs[g.id]){ back({type:'momentedit:ritualFileData',key:'bed',id:g.id,ok:false,error:'곡 파일을 찾을 수 없어요. (코드 L3)',ecode:'L3'}); return; }
        back({type:'momentedit:ritualFileData',key:'bed',id:g.id,ok:true,mime:'audio/wav',data:H.songs[g.id]}); }, H.delay); return; }
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
const B = (S) => C.build(Object.assign({ course: 'open' }, S), { mode: 'console' }).cues, by = (cs, sl) => cs.find((c) => c.slug === sl) || {};
async function trace(f, ks, ms, big) {
  return f.evaluate(async ({ ks, ms, big }) => { const BB = BgmBed._t, o = [];
    if (!window.__lpMs0) window.__lpMs0 = window._lpMs; window._lpMs = function () { return 1500; };   /* 시험만 — 말하는 차례 · 행동 줄 멈춤을 1.5초로(편지 · 다음 순간까지 빨리 닿게 · 재는 것은 그 앞뒤 음악) */
    if (big) { LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(ks, true); _lFull(); } else lsPlay(ks[0]);
    (LP.q || []).forEach((x) => { if (x.talk2 || x.said) x.ms = 1500; });   /* 시험만 — 크게 보기 말하는 차례(50 ~ 60초)를 1.5초로 */
    const t0 = performance.now();
    await new Promise((res) => { const iv = setInterval(() => { const v = BB.BED.cur, st = LP.q[LP.i];
      o.push({ t: performance.now() - t0, i: LP.i, k: st && st.k, slug: st && (st.slug || st.of) || '', lead: !!LP.leadSt, who: BB.BED.who, f: v && v.f, src: !!(v && v.src), want: v && v.want });
      if (performance.now() - t0 > ms) { clearInterval(iv); res(); } }, 100); });
    const q = LP.q.map((x) => ({ k: x.k, slug: x.slug || x.of || '', dk: x.dk, ldk: x.ldk, act: !!x.act, talk: !!(x.talk || x.talk2) }));
    try { lsStop(); } catch (x) {} try { if (big) lsCloseBig(); } catch (x) {} window._lpMs = window.__lpMs0; return { o, q }; }, { ks, ms, big }); }
const loud = (x) => x.src && x.want != null && x.want > -60;
try {
  /* ── 엔진 값(당일 콘솔 · 미리 듣기 공통 원천) ── */
  { const S = { on: { vow: 1, ring: 1, free: 1, song: 1, letter: 1, tribute: 1, toast: 1, table: 1, welcome: 1, declare: 1 }, freeWhat: 'speech', song: 'family', songBy: 'friend', tributeSay: 'short' }, cs = B(S);
    const fi = by(cs, 'narr-free-in-speech'), ri = by(cs, 'narr-ring-in'), ti = by(cs, 'tribute-in'), tt = by(cs, 'toast-toast'), b13 = by(cs, 'bridge-b13-toast-stay'), b10 = by(cs, 'bridge-b10-speech-clap'), se = cs.find((c) => /^narr-song-end/.test(c.slug || '')) || {}, vi = by(cs, 'narr-vow-in');
    ok('d 축사 여는 말 −16 · 반지 행동 −12 · 부모님께 고마운 말 −20 · 서약 낭독 −20 · 축배 여는 말 · «위하여» −16 · 잔 나누는 이음말 −8 그대로',
      fi.duck === -16 && ri.live && ri.live.duck === -12 && ti.live && ti.live.duck === -20 && vi.live && vi.live.duck === -20 && tt.duck === -16 && tt.live && tt.live.duck === -16 && b13.duck === -8,
      { fi: fi.duck, ri: ri.live && ri.live.duck, ti: ti.live && ti.live.duck, tt: [tt.duck, tt.live && tt.live.duck], b13: b13.duck });
    ok('c 축사 · 축가 맺는 말 −90(«음악 없이») · 박수 = −8 을 1.5초에', b10.duck === -90 && b10.live && b10.live.duck === -8 && b10.live.upMs === 1500 && se.duck === -90 && se.live && se.live.duck === -8 && se.live.upMs === 1500, { b10: [b10.duck, b10.live], se: [se.slug, se.duck, se.live && se.live.upMs] });
    const b10b = by(B(Object.assign({}, S, { bgm: { S5: { m: 'bed' } } })), 'bridge-b10-speech-clap');
    ok('c 축사 «음악과 함께»(M4S5)인 날은 맺는 말 −16 · 박수 −8', b10b.duck === -16 && b10b.live && b10b.live.duck === -8, [b10b.duck, b10b.live && b10b.live.duck]);
    const le = by(cs, 'narr-letter-end'), lb = by(B(Object.assign({}, S, { bgm: { S6: { m: 'bed' } } })), 'narr-letter-end');
    ok('b 편지 끝(음악 없이) post = 정적 2초 → 다음 곡(next · 3초) · «음악과 함께»는 정적 없이 다음 곡으로 3초 겹침(★[BGM_TIMING2_1101] 종전 «−16 그대로» → xf)', JSON.stringify(le.post) === JSON.stringify([{ wait: 2000 }, { music: 'next', v: -16, ms: 4000, nextMs: 3000 }]) && JSON.stringify(lb.post) === JSON.stringify([{ music: 'next', v: -16, ms: 4000, nextMs: 3000, xf: true }]), { le: le.post, lb: lb.post });
    const gb = cs.filter((c) => c.k === '_goodbye' && c.post && c.post.length).pop() || {};
    ok('f 귀가 인사 — 나레이션 끝 1.5초에 −8 → 90초 → 20초 소거', JSON.stringify(gb.post) === JSON.stringify([{ music: 'to', v: -8, ms: 1500 }, { wait: 90000 }, { music: 'to', v: -90, ms: 20000 }]), gb.post); }
  /* ── 미리 듣기(마이페이지 안 식순 화면) ── */
  for (const W of [390, 1280]) {
    const { ctx, pg, f, errs } = await open(W, true);
    await f.evaluate(() => { S.freeWhat = 'speech'; S.song = 'family'; S.songBy = 'friend'; S.tributeSay = 'short'; delete S.bgm; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); });
    /* d 줄 크기 */
    { const Q = await f.evaluate(() => { const g = (k) => _lSteps(ENG, [k]).map((x) => ({ slug: x.slug || x.of || '', txt: x.txt || '', dk: x.dk, ldk: x.ldk, q: !!x.quiet, t: !!(x.talk || x.talk2) })); return { ring: g('ring'), vow: g('vow'), tribute: g('tribute'), toast: g('toast'), free: g('free'), song: g('song') }; });
      const ringQ = Q.ring.find((x) => x.q), vowQ = Q.vow.find((x) => x.q && /함께 읽어요$/.test(x.txt)), trT = Q.tribute.find((x) => x.t && x.slug === 'tribute-in'), toN = Q.toast.find((x) => x.slug === 'toast-toast' && !x.t), toT = Q.toast.find((x) => x.slug === 'toast-toast' && x.t), frN = Q.free.find((x) => x.slug === 'narr-free-in-speech' && !x.t), b10 = Q.free.find((x) => x.slug === 'bridge-b10-speech-clap'), sE = Q.song.find((x) => /^narr-song-end/.test(x.slug));
      ok(`${W} d 미리 듣기 줄 크기 — 반지 행동 −12 · 서약 «함께 읽어요» −20 · 부모님 말 −20 · 축배 여는 말 · «위하여» −16 · 축사 여는 말 −16`, ringQ && ringQ.ldk === -12 && vowQ && vowQ.ldk === -20 && trT && trT.ldk === -20 && toN && toN.dk === -16 && toT && toT.ldk === -16 && frN && frN.dk === -16, { ringQ, vowQ, trT, toN, toT, frN });
      ok(`${W} c 미리 듣기 맺는 말(축사 b10 · 축가) −90`, b10 && b10.dk === -90 && sE && sE.dk === -90, { b10, sE }); }
    /* a 편지 «음악 없이» — 그 순간만 */
    { await go(f, 'letter'); const r = await trace(f, ['letter'], 6000, false);
      ok(`${W} a 편지(음악 없이) 그 순간만 — 첫 소리 = 여는 말 · 피아노 뜸 없음 · 음악 0`, r.q[0] && r.q[0].k === 'letter' && !r.o.some((x) => x.lead) && !r.o.some(loud), { q0: r.q[0], lead: r.o.filter((x) => x.lead).length, loud: r.o.filter(loud).slice(0, 2) }); }
    /* a 이어 듣기 — 곡이 흐르다 편지로(축사 «음악과 함께» → 편지) */
    { await f.evaluate(() => { S.bgm = { S5: { m: 'bed' } }; _persist(); render(); }); await go(f, 'free');
      const r = await trace(f, ['free', 'letter'], 30000, true), i0 = r.q.findIndex((x) => x.k === 'letter'), pre = r.o.filter((x) => x.i < i0 && loud(x)), ld = r.o.filter((x) => x.i === i0 && x.lead), t1 = ld.length ? ld[0].t : null, at = (ms) => r.o.reduce((a, x) => (Math.abs(x.t - (t1 + ms)) < Math.abs(a.t - (t1 + ms)) ? x : a), r.o[0]);
      const dur = ld.length ? ld[ld.length - 1].t - ld[0].t : 0;
      ok(`${W} a 이어 듣기 축사(음악과 함께) → 편지 — 곡이 흐르다 1.5초에 −90 → 정적 1초 → 여는 말(뜸 약 2.5초)`, pre.length > 3 && ld.length > 5 && dur > 2000 && dur < 3000 && at(1800).want === -90 && !r.o.some((x) => x.k === 'letter' && x.t > t1 && !x.lead && loud(x)) && !r.o.some((x) => x.i === i0 && x.want > -15.5 && x.src), { pre: pre.length, dur: Math.round(dur), a18: at(1800) && at(1800).want, after: r.o.filter((x) => x.k === 'letter' && x.t > t1 && !x.lead && loud(x)).slice(0, 2), bump: r.o.filter((x) => x.i === i0 && x.want > -15.5 && x.src).slice(0, 2) });   /* 뜸 앞은 앞 곡 크기(−16) 그대로 · −8 으로 튀지 않는다 */
      await f.evaluate(() => { delete S.bgm; _persist(); render(); }); }
    /* b 편지 끝 → 부모님께 인사 */
    { await go(f, 'letter'); const fT = await f.evaluate(() => BgmBed._t.songAt('tribute')), fL = await f.evaluate(() => BgmBed._t.songAt('letter'));
      const r = await trace(f, ['letter', 'tribute'], 26000, true), i0 = r.q.findIndex((x) => x.k === 'tribute'), lastL = r.o.filter((x) => x.k === 'letter').pop(), te = lastL ? lastL.t : 0;
      const after = r.o.filter((x) => x.t > te), m4 = r.o.filter((x) => x.f === fL && loud(x)), first = after.find(loud), lead = r.o.filter((x) => x.i === i0 && x.lead), ldMs = lead.length ? lead[lead.length - 1].t - lead[0].t : 0;
      ok(`${W} b 편지 끝 → 부모님께 인사 — 편지 곡(${fL}) 되살림 0 · 정적 뒤 부모님께 인사 곡(${fT})이 무음에서 올라온다 · 그 뒤 뜸은 «이어지는 곡 3초»`, !!fT && fT !== fL && !m4.length && !!first && first.f === fT && first.t - te > 1500 && ldMs > 2300 && ldMs < 3600,
        { fT, fL, m4: m4.length, first: first && { t: Math.round(first.t - te), f: first.f }, ldMs: Math.round(ldMs) }); }
    /* e 축배만 듣기 뜸 곡 */
    { const E = await f.evaluate(() => { const t = BgmBed._t, a = { tb: t.toastBed(), table: t.songAt('table') }; S.on.table = 0; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render();
        const sq = RitualOpen.bodySeq(S).filter((k) => RitualOpen.onOf(S, k) && k !== 'toast'), i = RitualOpen.bodySeq(S).indexOf('toast'); let prev = ''; for (let j = i - 1; j >= 0; j--) { const k = RitualOpen.bodySeq(S)[j]; if (!RitualOpen.onOf(S, k)) continue; const f2 = t.songAt(k); if (f2) { prev = f2; break; } }
        a.tb2 = t.toastBed(); a.prev = prev; a.m6 = t.songAt('_close'); S.on.table = 1; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); return a; });
      ok(`${W} e 축배만 듣기 뜸 곡 — 테이블 인사가 담겼으면 그 곡(${E.table}) · 없으면 축배 바로 앞 순간의 곡(${E.prev})`, !!E.table && E.tb === E.table && !!E.prev && E.tb2 === E.prev, E); }
    ok(`${W} 쪽 오류 0`, !errs.length, errs.slice(0, 3));
    await ctx.close();
  }
  /* ── 당일 콘솔 ── */
  { const S0 = O.applyExample({ course: 'open' }, 'standard'); S0.course = 'open'; S0.on = Object.assign({}, S0.on, { letter: 1, tribute: 1, free: 1, song: 1 }); S0.freeWhat = 'speech'; S0.song = 'family'; S0.songBy = 'friend'; delete S0.bgm;
    const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }), errs = [], pg = await ctx.newPage(); pg.on('pageerror', (e) => errs.push(e.message));
    await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; window.__bgmLog = []; });
    await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: '{"ok":true}' })));
    await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S0)).toString('base64'))}`); await pg.waitForTimeout(900);
    const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'bgmtime-')), FW = (n, hz) => { const p = path.join(TMP, n + '.wav'); fs.writeFileSync(p, wav(20, hz)); return p; };
    for (const [sg, n, hz] of [['M2', 'm2', 440], ['M5', 'm5', 550]]) { try { await pg.setInputFiles('.sg[data-seg="' + sg + '"] .sg-song:nth-of-type(1) [data-seg-file]', FW(n, hz)); } catch (e) {} }
    await pg.waitForTimeout(1200); await pg.click('#go'); await pg.waitForTimeout(700);
    const R = await pg.evaluate(() => window.__bgmR()), ix = (fn) => R.findIndex(fn), seg = () => pg.evaluate(() => window.__seg.st());
    /* b 편지 끝 */
    const ci = ix((c) => c.k === 'candle'); await pg.evaluate((i) => window.__bgmGo.fire(i), ci); await pg.waitForTimeout(3600);
    const le = ix((c) => c.slug === 'narr-letter-end'), ti = ix((c, i) => i > le && c.k === 'tribute');
    if (le < 0 || ti !== le + 1) ok('콘솔 시험 조건 — 편지 끝 바로 뒤가 부모님께 인사', false, { le, ti, R: R.slice(le - 1, le + 3) });
    else { const T = await pg.evaluate(async (i) => { const o = []; window.__bgmLog.length = 0; const t0 = performance.now(); window.__bgmGo.fire(i);
        await new Promise((res) => { const iv = setInterval(() => { const g = window.__seg.st(), b = window.__bgmSt(); o.push({ t: performance.now() - t0, seg: g.seg, src: g.src[g.on], want: b.want, slug: b.slug, ph: b.phase }); if (performance.now() - t0 > 12000) { clearInterval(iv); res(); } }, 100); });
        return { o, lg: window.__bgmLog.slice() }; }, le);
      const o = T.o, seg0 = o[0].seg, tN = (o.find((x) => x.seg === 'M5' && x.seg !== seg0) || {}).t, done = (o.find((x) => x.ph === 'done' && x.slug === 'narr-letter-end') || {}).t, pre = o.filter((x) => tN != null && x.t < tN), up = T.lg.find((x) => x.db === -16 && x.ms === 3000);
      ok('b 콘솔 편지 끝 — 맺는 말 · 정적 2초 동안 −90 · 편지 곡 자리(앞 곡)를 올리지 않는다', seg0 !== 'M5' && tN != null && tN >= 2000 && pre.every((x) => x.want <= -60), { seg0, tN: tN && Math.round(tN), done: done && Math.round(done), loud: pre.filter((x) => x.want > -60).slice(0, 2) });
      ok('b 콘솔 — 정적 뒤 부모님께 인사 곡(M5)이 무음에서 3초에 −16 으로', !!up && o.some((x) => x.seg === 'M5' && x.want === -16), { up, last: o[o.length - 1] });
      const src3 = (o.filter((x) => x.seg === 'M5').pop() || {}).src, s4 = await seg();
      ok('b 콘솔 — 부모님께 인사 큐에서 곡을 다시 시작하지 않는다(같은 소리 · 크로스페이드 없음)', s4.seg === 'M5' && s4.src[s4.on] === src3 && !s4.paused[s4.on] && o.some((x) => /^tribute|^narr-tribute/.test(x.slug || '')), { s4: s4.seg, same: s4.src[s4.on] === src3, slugs: [...new Set(o.map((x) => x.slug))] }); }
    /* c 축사 · 축가 박수 */
    for (const sl of ['bridge-b10-speech-clap', 'narr-song-end-friend']) { const i = ix((c) => c.slug === sl); if (i < 0) { ok(`c 콘솔 ${sl} 있다(시험 조건)`, false); continue; }
      await pg.evaluate(() => { window.__bgmLog.length = 0; }); await pg.evaluate((i) => window.__bgmGo.fire(i), i);
      await pg.waitForFunction(() => window.__bgmSt().phase === 'live', null, { timeout: 30000 }).catch(() => {}); await pg.waitForTimeout(300);
      const lg = await pg.evaluate(() => window.__bgmLog.slice()), st = await pg.evaluate(() => window.__bgmSt());
      ok(`c 콘솔 ${sl} — 맺는 말 −90 · 박수(사람 순간)에서 1.5초에 −8`, lg.length >= 2 && lg[0].db === -90 && lg.some((x) => x.db === -8 && x.ms === 1500) && st.want === -8, { lg: lg.slice(0, 4), want: st.want }); }
    ok('콘솔 쪽 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close(); }
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 500)); }
await br.close(); srv.close();
console.log(fail ? `BGM TIMING FAIL ${fail}` : 'BGM TIMING OK');
process.exit(fail ? 1 : 0);
