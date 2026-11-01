#!/usr/bin/env node
/* ★★[BGM_TIMING2_1101 2026-11-01 BGM 섹션 결정] 투입 시점 2판
   a 축사 «음악과 함께» — 여는 말은 앞 곡(M4) −16 아래 · 말씀 차례 시작에서 M4S5 로 3초 겹쳐 −20 · 다음 순간(축가)에서 M4 로 3초 겹쳐 되돌아간다 · 축가는 M4S5 를 0번 튼다
   b 편지 «음악과 함께» — 같은 모양(여는 말 M4 → 낭독 차례 M4S6) · 편지 끝 정적 없이 다음 순간 곡으로 3초 겹침(M4 재등장 없음)
   c 미리 듣기 뜸 자리 == 화면 음악 줄 자리 — 축사 · 편지 «음악과 함께» 포함 · 코스 · 조합마다
   d 단체 사진(하객 단체 · 가족 구도) −18 · 노래 곡이면 −24 · 자유 사진 −12 그대로
   e 편지 «음악 없이» 그 순간만 — 끝 정적 2초 뒤 오르는 곡 = 식순 차례상 다음 순간의 곡(M4 아님)
   f 피크 — 3초 겹침 · 축배 M7 0 dB 진입 · 곡 카드 +7 dB 에서 최종 출력 ≤ −1 dBTP(미리 듣기 소리 길 · OfflineAudioContext · 4배 오버샘플 어림)
   BP_CUE · BP_OP · BP_BED · BP_SLOTS · BP_CON = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
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
/* 드라이브에 있는 곡(시험) — B07 · B30(화촉 3 · 4) · 테이블 인사 곡(B23 · B03 · B24 · B25)은 없다 */
const RL = [{ k: 'r5', name: '경쾌하게', t: '시험 입장 곡', a: '시험 가수', hook: 40, hook0: 40, len: 140, file: 'r5.mp3', img: '/assets/home/snap.webp', pos: '50% 50%' },
  { k: 'r1', name: '잔잔하게', t: '짧은 판 곡', a: '시험 가수', hook: 40, hook0: 40, len: 70, file: 'r1.mp3', pf: 'r1p.mp3', p0: 10, p1: 70, hooks: [40], img: '/assets/home/snap.webp', pos: '50% 50%' }];
const HAVE = ['B01', 'B02', 'B04', 'B05', 'B06', 'B09', 'B10', 'B12', 'B13', 'B15', 'B17', 'B21', 'B23', 'B28'];   /* [BGM_TIMING_1101] 테이블 인사 곡(B23)도 — 축배 뜸 곡 e */
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
    if (!window.__lpMs0) window.__lpMs0 = window._lpMs; window._lpMs = function () { return 1500; };   /* 시험만 — 말하는 차례 · 행동 줄 멈춤을 1.5초로 */
    if (big) { LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(ks, true); _lFull(); } else lsPlay(ks[0]);
    (LP.q || []).forEach((x) => { if (x.talk2 || x.said) x.ms = 1500; });
    const t0 = performance.now(), Q0 = LP.q; let QL = LP.q, swap = 0;
    await new Promise((res) => { const iv = setInterval(() => { const v = BB.BED.cur, st = LP.q[LP.i]; if (LP.q !== QL) { swap++; QL = LP.q; }
      o.push({ t: performance.now() - t0, i: LP.i, k: st && st.k, lead: !!LP.leadSt, f: v && v.f, src: !!(v && v.src), want: v && v.want, sw: swap, nl: !!(st && st._noLead), lh: !!(st && st._leadHere) });
      if (performance.now() - t0 > ms) { clearInterval(iv); res(); } }, 100); });
    const q = (Q0 && Q0.length ? Q0 : LP.q).map((x) => ({ k: x.k, slug: x.slug || x.of || '', talk: !!(x.talk || x.talk2), nl: !!x._noLead, lh: !!x._leadHere, base: x._base || '' }));
    try { lsStop(); } catch (x) {} try { if (big) lsCloseBig(); } catch (x) {} window._lpMs = window.__lpMs0; return { o, q, swap }; }, { ks, ms, big }); }
const loud = (x) => x.src && x.want != null && x.want > -60;
const setS = (f, o) => f.evaluate((o) => { Object.keys(o.on || {}).forEach((k) => { S.on[k] = o.on[k]; }); if (o.bgm) S.bgm = JSON.parse(JSON.stringify(o.bgm)); else delete S.bgm; if (o.course) S.course = o.course;
  try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); }, o);
const lead = (r, i) => { const l = r.o.filter((x) => x.i === i && x.lead); return { n: l.length, ms: l.length ? l[l.length - 1].t - l[0].t : 0, f: l.length ? l[l.length - 1].f : '' }; };
try {
  /* ── 엔진 값 ── */
  { const S = { on: { vow: 1, ring: 1, free: 1, song: 1, letter: 1, tribute: 1, toast: 1, table: 1, welcome: 1, declare: 1 }, freeWhat: 'speech', song: 'family', songBy: 'friend', tributeSay: 'short' };
    const cb = B(Object.assign({}, S, { bgm: { S5: { m: 'bed' }, S6: { m: 'bed' } } })), cn = B(S);
    const fi = by(cb, 'narr-free-in-speech'), li = cb.find((c) => /^letter-/.test(c.slug || '')) || {}, le = by(cb, 'narr-letter-end'), lin = cn.find((c) => /^letter-/.test(c.slug || '')) || {};
    ok('a 축사 «음악과 함께» — 여는 말 −16(앞 곡 아래) · 말씀 차례 −20', fi.duck === -16 && fi.live && fi.live.duck === -20, [fi.duck, fi.live && fi.live.duck]);
    ok('b 편지 «음악과 함께» — 여는 말 −16 · 낭독 차례 −20 · 끝 = 정적 없이 다음 곡으로 3초 겹침(xf)', li.duck === -16 && li.live && li.live.duck === -20 && JSON.stringify(le.post) === JSON.stringify([{ music: 'next', v: -16, ms: 4000, nextMs: 3000, xf: true }]), { li: [li.duck, li.live && li.live.duck], post: le.post });
    ok('b 편지 «음악 없이» 여는 말은 그대로 무음', lin.duck <= -60, lin.duck);
    const pa = cn.find((c) => c.actId === 'photo-all') || {}, pf = cn.find((c) => c.actId === 'photo-family') || {}, pr = cn.find((c) => c.actId === 'photo-free') || {};
    ok('d 단체 사진(하객 단체 · 가족 구도) −18 · 자유 사진 −12 그대로', pa.duck === -18 && pf.duck === -18 && (!pa.live || pa.live.duck == null || pa.live.duck === -18) && (!pf.live || pf.live.duck == null || pf.live.duck === -18) && pr.duck === -12, { pa: [pa.duck, pa.live && pa.live.duck], pf: [pf.duck, pf.live && pf.live.duck], pr: pr.duck }); }
  /* ── 미리 듣기 ── */
  for (const W of [390, 1280]) {
    const { ctx, pg, f, errs } = await open(W, true);
    await f.evaluate(() => { S.freeWhat = 'speech'; S.song = 'family'; S.songBy = 'friend'; S.tributeSay = 'short'; delete S.bgm; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); });
    const F = await f.evaluate(() => { const t = BgmBed._t; return { m4: t.eff('M4'), m5s: t.eff('M4S5'), m6s: t.eff('M4S6'), m5: t.eff('M5') }; });
    /* a 축사 «음악과 함께» → 축가 */
    { await setS(f, { on: { letter: 0, free: 1, song: 1 }, bgm: { S5: { m: 'bed' } } }); await go(f, 'free');
      const r = await trace(f, ['free', 'song'], 30000, true), q = r.q, i0 = q.findIndex((x) => x.k === 'free'), iT = q.findIndex((x) => x.k === 'free' && x.lh && x.talk), iS = q.findIndex((x) => x.k === 'song');
      const open1 = r.o.filter((x) => x.i >= i0 && x.i < iT && !x.lead && loud(x)), L = lead(r, iT), tLe = (r.o.filter((x) => x.i === iT && x.lead).pop() || {}).t, turn = r.o.filter((x) => x.i === iT && !x.lead && loud(x) && tLe != null && x.t > tLe), tS = (r.o.find((x) => x.k === 'song' && x.lead) || {}).t, song = r.o.filter((x) => x.k === 'song' && loud(x) && tS != null && x.t >= tS);   /* 순간이 바뀌는 틈(0.4초 · 큐 사이 −8)은 앞 곡 끝자락 — 축가 뜸(3초 겹침)부터 잰다 */
      const vT = await f.evaluate((fx) => BgmBed._t.vx(-20, fx), F.m5s);
      ok(`${W} a 축사 «음악과 함께» 여는 말 = 앞 곡(${F.m4}) · 뜸 없음 · M4S5(${F.m5s}) 안 나옴`, i0 > -1 && iT > i0 && q[i0].nl && q[i0].base === 'M4' && open1.length > 2 && open1.every((x) => x.f === F.m4) && !r.o.some((x) => x.i < iT && x.lead), { q: q.slice(0, 4), open1: open1.slice(0, 2), n: open1.length });
      ok(`${W} a 말씀 차례 바로 앞 뜸 = 새 곡(M4S5) 6초(3초 겹침 포함) → 차례 동안 ${vT}`, q[iT] && q[iT].lh && L.ms > 5200 && L.ms < 6800 && L.f === F.m5s && turn.length > 3 && turn.every((x) => x.f === F.m5s && Math.abs(x.want - vT) < 0.6), { L, turn: turn.slice(0, 2) });
      ok(`${W} a 다음 순간(축가)에서 M4 로 3초 겹쳐 되돌아간다 · 축가가 M4S5 를 트는 횟수 0`, iS > iT && tS != null && lead(r, iS).f === F.m4 && song.length > 3 && !song.some((x) => x.f === F.m5s) && song.some((x) => x.f === F.m4), { iS, n: song.length, fs: [...new Set(song.map((x) => x.f))] }); }
    /* b 편지 «음악과 함께» → 부모님께 인사 */
    { await setS(f, { on: { letter: 1, free: 0, song: 0, tribute: 1 }, bgm: { S6: { m: 'bed' } } }); await go(f, 'letter');
      const r = await trace(f, ['letter', 'tribute'], 30000, true), q = r.q, i0 = q.findIndex((x) => x.k === 'letter'), iT = q.findIndex((x) => x.k === 'letter' && x.lh && x.talk);
      const open1 = r.o.filter((x) => x.i >= i0 && x.i < iT && !x.lead && loud(x)), L = lead(r, iT), t6 = (r.o.find((x) => x.f === F.m6s && loud(x)) || {}).t, tN = (r.o.find((x) => x.f === F.m5 && loud(x)) || {}).t;
      const gap = (t6 != null && tN != null) ? r.o.filter((x) => x.t > t6 && x.t < tN + 500 && !x.lead && !loud(x)) : null, tL0 = (r.o.find((x) => x.i === iT && x.lead) || {}).t, m4back = r.o.filter((x) => tL0 != null && x.t > tL0 + 3100 && x.f === F.m4 && loud(x));   /* 낭독 차례 뜸(3초 겹침) 뒤로 M4 가 다시 나오면 빨강 */
      ok(`${W} b 편지 «음악과 함께» 여는 말 = M4 · 낭독 차례 바로 앞 뜸 = M4S6(${F.m6s}) 6초`, q[i0] && q[i0].nl && open1.length > 2 && open1.every((x) => x.f === F.m4) && q[iT] && q[iT].lh && L.ms > 5200 && L.ms < 6800 && L.f === F.m6s, { q: q.slice(0, 4), L, n: open1.length });
      ok(`${W} b 편지 끝 — 정적 없이 다음 순간 곡(${F.m5})으로 · M4 재등장 0`, tN != null && t6 != null && tN > t6 && gap && gap.length === 0 && !m4back.length, { t6, tN, gap: gap && gap.slice(0, 3), m4back: m4back.length }); }
    /* e 편지 «음악 없이» 그 순간만 — 끝에 오르는 곡 = 다음 순간 곡 */
    { await setS(f, { on: { letter: 1, free: 0, song: 0, tribute: 1 } }); await go(f, 'tribute'); await go(f, 'letter');
      const r = await trace(f, ['letter'], 16000, true), first = r.o.findIndex(loud), before = first > 15 ? r.o.slice(first - 15, first) : [];
      ok(`${W} e 편지(음악 없이) 그 순간만 — 정적 뒤 오르는 곡 = 다음 순간(부모님께 인사) 곡 ${F.m5} · M4 0`, first > -1 && r.o[first].f === F.m5 && F.m5 !== F.m4 && before.length === 15 && before.every((x) => !loud(x)) && !r.o.some((x) => x.f === F.m4 && loud(x)), { first: first > -1 ? r.o[first] : null, fs: [...new Set(r.o.filter(loud).map((x) => x.f))], tl: r.o.filter((x, i) => i % 10 === 0).map((x) => [Math.round(x.t), x.i, x.k, x.f, x.src ? 1 : 0, x.want].join(',')) }); }
    /* c 뜸 자리 == 화면 음악 줄 자리(축사 · 편지 «음악과 함께» · 코스 · 조합) */
    { const R = await f.evaluate(() => { const bad = [], seen = [], keep = JSON.parse(JSON.stringify({ c: S.course, on: S.on, bgm: S.bgm || null })), sig = (x) => x ? (x.slug || x.of || '') + (x.talk || x.talk2 ? ':t' : '') : '';
        const CS = Object.keys(COURSES), BEDS = [{ S5: { m: 'bed' } }, { S6: { m: 'bed' } }, { S5: { m: 'bed' }, S6: { m: 'bed' } }], CO = [{}, { song: 0 }, { letter: 0 }, { tribute: 0 }, { free: 0 }];
        for (const c of CS) for (const bd of BEDS) for (const co of CO) { S.course = c; ['free', 'letter', 'song', 'tribute', 'vow', 'ring', 'declare', 'welcome'].forEach((k) => { S.on[k] = 1; }); Object.keys(co).forEach((k) => { S.on[k] = co[k]; }); S.bgm = JSON.parse(JSON.stringify(bd)); S.freeWhat = 'speech';
          try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {}
          for (const k of ['free', 'letter']) { if (!_lRows().includes(k)) continue; const st = _lSteps(ENG, [k]), bq = BgmForm.flowRow(k, st); if (!bq || (bq.by !== 'speech' && bq.by !== 'letter')) continue;
            const isBed = !!(S.bgm[k === 'free' ? 'S5' : 'S6']); LP.q = _lpTag(st).filter((x) => !x.quiet || x.txt); LP.q._pm = 0; _lPreMark();
            const li = LP.q.findIndex((x) => x._leadHere), r = { c, k, bed: isBed, hit: bq.hit, scr: sig(st[bq.at]), lead: li > -1 ? sig(LP.q[li]) : '', pre: LP.q.slice(0, Math.max(0, li)).every((x) => x._noLead && x._base === 'M4') };
            LP.q = [];
            if (!isBed) { if (li > -1) bad.push(r); continue; }
            if (!bq.hit) { if (li > -1) bad.push(r); continue; }   /* 옛 코스 «자유 한 칸» = 말씀 줄 없음 — 뜸은 맨 앞(음악 줄도 bgm-form 이 따로 잰다) */
            seen.push(c + ':' + k); if (r.scr !== r.lead || !r.pre || li < 1) bad.push(r); } }
        S.course = keep.c; S.on = keep.on; if (keep.bgm) S.bgm = keep.bgm; else delete S.bgm; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); return { bad, seen }; });
      ok(`${W} c 코스 · 조합 — «음악과 함께» 축사 · 편지 화면 음악 줄 자리 == 미리 듣기 뜸 자리(${R.seen.length}곳) · «음악 없이»는 맨 앞 그대로`, !R.bad.length && R.seen.length >= 20, { bad: R.bad.slice(0, 4), n: R.seen.length }); }
    /* f 피크 — 미리 듣기 소리 길(BgmBed 의 버스 · 크기 함수) 그대로 OfflineAudioContext 에서 */
    if (W === 390) { const P = await f.evaluate(async () => { const t = BgmBed._t; if (!t.mkBus || !t.PR) return { none: true }; const p = t.PR(), SR = 48000;
        function tp(ch, from) { const N = 16, L = 4; let m = 0; for (let i = from; i < ch.length; i++) { const a = Math.abs(ch[i]); if (a > m) m = a; }
          for (let i = Math.max(N, from); i < ch.length - N; i++) for (let q = 1; q < L; q++) { const fr = q / L; let s = 0; for (let k = -N + 1; k <= N; k++) { const x = k - fr, w = 0.5 + 0.5 * Math.cos(Math.PI * x / N), sc = Math.sin(Math.PI * x) / (Math.PI * x); s += ch[i + k] * sc * w; } const a = Math.abs(s); if (a > m) m = a; }
          return 20 * Math.log10(m); }
        let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
        async function song(kind, tpT) { const dur = 8, oc = new OfflineAudioContext(1, SR * dur, SR), b = oc.createBuffer(1, SR * dur, SR), d = b.getChannelData(0);
          if (kind === 'piano') { for (let n = 0; n < dur * 6; n++) { const t0 = n / 6 + rnd() * 0.02, fq = 110 * Math.pow(2, rnd() * 4), s0 = Math.floor(t0 * SR); for (let i = s0; i < d.length && i < s0 + SR * 1.2; i++) { const tt = (i - s0) / SR, e = Math.min(1, tt / 0.001) * Math.exp(-tt / 0.35); let v = 0; for (let h = 1; h <= 5; h++) if (fq * h < 9000) v += Math.sin(2 * Math.PI * fq * h * tt) / h; d[i] += 0.3 * e * v; } } }
          else if (kind === 'drum') { for (let i = 0; i < d.length; i++) { const tt = i / SR, ph = tt % 0.5; d[i] = (ph < 0.08 ? Math.exp(-ph / 0.02) * (rnd() * 2 - 1) : 0) + 0.3 * Math.sin(2 * Math.PI * 55 * tt) * Math.exp(-ph / 0.2); } }
          else { for (let i = 0; i < d.length; i++) { const tt = i / SR; let v = 0; for (let h = 0; h < 12; h++) v += Math.sin(2 * Math.PI * (80 + h * 137) * tt + h); d[i] = Math.tanh(v * 0.6); } }
          const s = oc.createBufferSource(); s.buffer = b; const lp = oc.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 12000; s.connect(lp); lp.connect(oc.destination); s.start(0);
          const o = await oc.startRendering(), c = o.getChannelData(0), k = Math.pow(10, tpT / 20) / Math.pow(10, tp(c, 0) / 20); for (let i = 0; i < c.length; i++) c[i] *= k; return o; }
        const SG = { piano: await song('piano', -2), drum: await song('drum', -2), master: await song('master', -1) };
        async function scene(a, b, g0, g1, fadeMs, hold) { const dur = 1 + fadeMs / 1000 + hold, oc = new OfflineAudioContext(1, Math.round(SR * dur), SR), bus = t.mkBus(oc);
          const mk = (buf, from, to) => { const s = oc.createBufferSource(), g = oc.createGain(); s.buffer = buf; s.loop = true; s.connect(g); g.connect(bus); g.gain.setValueAtTime(from, 0); g.gain.setValueAtTime(from, 1); g.gain.linearRampToValueAtTime(to, 1 + fadeMs / 1000); s.start(0); };
          if (a) mk(SG[a], g0, 0.00003); if (b) mk(SG[b], 0.00003, g1);
          const o = await oc.startRendering(); return Math.round(tp(o.getChannelData(0), Math.round(SR * 0.5)) * 100) / 100; }
        const R = {};
        for (const [a, b] of [['piano', 'drum'], ['drum', 'master'], ['master', 'piano']]) { R['3초 겹침 큐 사이 ' + a + '→' + b] = await scene(a, b, t.gainOf(p.music), t.gainOf(p.music), 3000, 2); R['3초 겹침 말 아래 ' + a + '→' + b] = await scene(a, b, t.gainOf(p.speech), t.gainOf(t.vx(p.speech, '')), 3000, 2); }
        for (const b of ['piano', 'drum', 'master']) R['축배 M7 ' + p.toast + ' dB 진입 ' + b] = await scene('piano', b, t.gainOf(p.speech), t.gainOf(p.toast), p.toastUp || 600, 4);
        for (const b of ['drum', 'master']) R['곡 카드 +7 dB ' + b] = await scene(null, b, 0, Math.pow(10, 7 / 20), 800, 4);
        return R; });
      if (P.none) ok('f 미리 듣기 버스(mkBus)를 찾았다', false); else { const over = Object.keys(P).filter((k) => !(P[k] <= -1));
        ok(`f 피크 — 3초 겹침 · 축배 0 dB 진입 · 곡 카드에서 최종 출력 ≤ −1 dBTP(4배 오버샘플 · 가장 큰 값 ${Math.max(...Object.values(P))})`, !over.length, over.length ? over.map((k) => k + ' ' + P[k]) : P); } }
    ok(`${W} 쪽 오류 0`, !errs.length, errs.slice(0, 3));
    await ctx.close();
  }
  /* ── 당일 콘솔 ── */
  const conOpen = async (S0, rows) => { const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }), errs = [], pg = await ctx.newPage(); pg.on('pageerror', (e) => errs.push(e.message));
    await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; window.__bgmLog = []; });
    await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: '{"ok":true}' })));
    await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S0)).toString('base64'))}`); await pg.waitForTimeout(900);
    const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'bgmtime2-')), miss = [];
    for (const [sg, hz] of rows) { const p = path.join(TMP, sg + '.wav'); fs.writeFileSync(p, wav(20, hz)); try { await pg.setInputFiles('.sg[data-seg="' + sg + '"] .sg-song:nth-of-type(1) [data-seg-file]', p, { timeout: 4000 }); } catch (e) { miss.push(sg); } }
    await pg.waitForTimeout(1200); await pg.click('#go'); await pg.waitForTimeout(700);
    const R = await pg.evaluate(() => window.__bgmR()); return { ctx, pg, errs, R, miss, ix: (fn) => R.findIndex(fn) }; };
  const sample = (pg, i, ms) => pg.evaluate(async ({ i, ms }) => { const o = []; window.__bgmLog.length = 0; const t0 = performance.now(); if (i != null) window.__bgmGo.fire(i);
    await new Promise((res) => { const iv = setInterval(() => { const g = window.__seg.st(), b = window.__bgmSt(); o.push({ t: performance.now() - t0, seg: g.seg, xg: g.xg, want: b.want, slug: b.slug, ph: b.phase }); if (performance.now() - t0 > ms) { clearInterval(iv); res(); } }, 100); });
    return o; }, { i, ms });
  const xf = (o) => o.some((x) => x.xg && x.xg[0] > 0.05 && x.xg[1] > 0.05);
  const base = () => { const S0 = O.applyExample({ course: 'open' }, 'standard'); S0.course = 'open'; S0.freeWhat = 'speech'; S0.song = 'family'; S0.songBy = 'friend'; return S0; };
  /* a 콘솔 축사 «음악과 함께» */
  { const S0 = base(); S0.on = Object.assign({}, S0.on, { free: 1, song: 1, letter: 0, tribute: 1 }); S0.bgm = { S5: { m: 'bed' } };
    const C1 = await conOpen(S0, [['M4', 440], ['M4S5', 520], ['M5', 600]]), iF = C1.ix((c) => c.slug === 'narr-free-in-speech'), iS = C1.ix((c, i) => i > iF && c.k === 'song');
    ok('콘솔 시험 조건 — 곡 파일 칸(M4 · M4S5 · M5) · 축사 · 축가 큐', !C1.miss.length && iF > 0 && iS > iF, { miss: C1.miss, iF, iS });
    if (iF > 0) { await C1.pg.evaluate((i) => window.__bgmGo.fire(i), iF - 1); await C1.pg.waitForTimeout(3600);
      const o = await sample(C1.pg, iF, 9000), nar = o.filter((x) => x.slug === 'narr-free-in-speech' && x.ph !== 'live' && x.t > 300), live = o.filter((x) => x.ph === 'live'), l0 = live.length ? live[0].t : null;
      ok('a 콘솔 축사 여는 말 = M4 · 말씀(사람 구간) 시작에서 M4S5 로 3초 겹침 · −20', nar.length > 2 && nar.every((x) => x.seg === 'M4') && live.length > 5 && live[live.length - 1].seg === 'M4S5' && xf(live) && live[live.length - 1].want === -20, { nar: nar.slice(0, 2), l0, last: live[live.length - 1] });
      const o2 = await sample(C1.pg, iF + 1, 2500);
      ok('a 콘솔 맺는 말 · 박수 동안 M4S5 그대로', o2.every((x) => x.seg === 'M4S5'), [...new Set(o2.map((x) => x.seg))]);
      const o3 = await sample(C1.pg, iS, 6000), late = o3.filter((x) => x.t > 3300);
      ok('a 콘솔 다음 순간(축가) 첫 큐에서 M4 로 3초 겹쳐 되돌아간다 · 그 뒤 M4S5 0', o3[o3.length - 1].seg === 'M4' && xf(o3) && late.every((x) => x.seg === 'M4'), { segs: [...new Set(o3.map((x) => x.seg))] });
      const iP = C1.ix((c) => c.actId === 'photo-all'), iPf = C1.ix((c) => c.actId === 'photo-family');
      if (iP < 0 || iPf < 0) ok('d 콘솔 단체 사진 큐 있다(시험 조건)', false); else {
        const V = await C1.pg.evaluate(async ({ a, b }) => { const G = window.__bgmGo, w = (ms) => new Promise((r) => setTimeout(r, ms)), o = {}; if (!G.bedAs) return { none: 1 };
          const sv = G.bedAs('seg', 'B22'); G.fire(a); await w(900); o.vocal = window.__bgmSt().now;
          G.bedAs('seg', 'B23'); G.fire(b); await w(900); o.plain = window.__bgmSt().now; G.bedAs(sv.m, sv.id); return o; }, { a: iP, b: iPf });
        ok('d 콘솔 단체 사진 — 노래 곡이면 −24 · 아니면 −18', V.vocal === -24 && V.plain === -18, V); } }
    ok('콘솔(축사) 쪽 오류 0', !C1.errs.length, C1.errs.slice(0, 3)); await C1.ctx.close(); }
  /* b 콘솔 편지 «음악과 함께» */
  { const S0 = base(); S0.on = Object.assign({}, S0.on, { free: 0, song: 0, letter: 1, tribute: 1 }); S0.bgm = { S6: { m: 'bed' } };
    const C2 = await conOpen(S0, [['M4', 440], ['M4S6', 520], ['M5', 600]]), iL = C2.ix((c) => /^letter-/.test(c.slug || '')), iE = C2.ix((c) => c.slug === 'narr-letter-end');
    ok('콘솔 시험 조건 — 곡 파일 칸(M4 · M4S6 · M5) · 편지 큐', !C2.miss.length && iL > 0 && iE > iL, { miss: C2.miss, iL, iE });
    if (iL > 0 && iE > iL) { await C2.pg.evaluate((i) => window.__bgmGo.fire(i), iL - 1); await C2.pg.waitForTimeout(3600);
      const o = await sample(C2.pg, iL, 9000), nar = o.filter((x) => /^letter-/.test(x.slug || '') && x.ph !== 'live' && x.t > 300), live = o.filter((x) => x.ph === 'live');
      ok('b 콘솔 편지 여는 말 = M4 · 낭독(사람 구간) 시작에서 M4S6 로 3초 겹침 · −20', nar.length > 2 && nar.every((x) => x.seg === 'M4') && live.length > 5 && live[live.length - 1].seg === 'M4S6' && xf(live) && live[live.length - 1].want === -20, { nar: nar.slice(0, 2), last: live[live.length - 1] });
      const o2 = await sample(C2.pg, iE, 9000), post = o2.filter((x) => x.ph === 'done' || x.seg === 'M5');
      ok('b 콘솔 편지 끝 — 정적 없이 다음 순간 곡(M5)으로 3초 겹침 · M4 재등장 0', o2[o2.length - 1].seg === 'M5' && xf(o2) && !o2.some((x) => x.seg === 'M4') && post.every((x) => x.want > -60), { segs: [...new Set(o2.map((x) => x.seg))], quiet: post.filter((x) => x.want <= -60).slice(0, 2) }); }
    ok('콘솔(편지) 쪽 오류 0', !C2.errs.length, C2.errs.slice(0, 3)); await C2.ctx.close(); }
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 500)); }
await br.close(); srv.close();
console.log(fail ? `BGM TIMING2 FAIL ${fail}` : 'BGM TIMING2 OK');
process.exit(fail ? 1 : 0);
