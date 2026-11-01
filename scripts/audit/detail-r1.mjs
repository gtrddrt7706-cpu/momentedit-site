#!/usr/bin/env node
/* ★★[DETAIL_R1_1101 2026-11-01 BGM 섹션 — 이어 듣기 세부 아홉] 항목마다 깨 보기(지금 main 판 빨강)
   ① 고른 곡(없으면 1순위) 파일이 없어 다음 곡이 대신 흐르면 줄 아래 · 미리 듣기 한 줄 «준비 중이라 지금은 ‹곡›이 대신 흘러요»
   ② 곡 목록이 늦게 오면 곡 받기와 같은 8초 기다림 · «음악을 불러오는 중이에요» · 목록이 오면 지금 줄 곡을 깐다
   ③ 멈춤 → 이어 듣기 = 그 곡 · 그 자리 · 지금 줄 크기로 0.6초에
   ④ 여운(5 + 3초)도 흐르는 중 — 다른 순간으로 · ■ 면 1.5초에 잦아듦 · 알약은 «멈춤»
   ⑤ 식전 영상 따로 듣기 — 소개 · 받는 말은 하객 맞이 곡 −16 · 영상 줄만 −90
   ⑥ 크게 보기 이어 듣기(입장 포함) — 걷는 줄 8초 · 곡 크게(0) · 그다음 받는 말은 말 아래
   ⑦ 입장 곡을 받는 중에 곡이 바뀌면 옛 곡은 버리고 새 곡
   ⑧ 짧은 판 — 끝 3초 전 처음(강조 자리)으로 3초 겹쳐 잇는다(맞붙임 loop 0)
   ⑨ 닫는 인사 따로 듣기 — 첫 멘트는 앞 순간 곡(축배 M7) −12 · 목례부터 M6
   BP_BED · BP_OP · BP_EM · BP_PICKS = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const OP = process.env.BP_OP || '', BED = process.env.BP_BED || '', EMF = process.env.BP_EM || '', SHOT = process.env.SHOT || '', PICKSF = process.env.BP_PICKS || '', CUEF = process.env.BP_CUE || '';
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 600)}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
function wav(sec, f, sr = 16000) { const n = Math.round(sr * sec), b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(f ? 8000 * Math.sin(2 * Math.PI * f * i / sr) : 0), 44 + i * 2); return b; }
const SHORT = wav(2, 330);   /* 나레이션 대신 — 12초(긴 멘트)   /* 나레이션 대신 — 0.6초 */
/* 드라이브에 있는 곡(시험) — B07 · B30(화촉 3 · 4) · 테이블 인사 곡(B23 · B03 · B24 · B25)은 없다 */
const RL = [{ k: 'r5', name: '경쾌하게', t: '시험 입장 곡', a: '시험 가수', hook: 40, hook0: 40, len: 140, file: 'r5.mp3', img: '/assets/home/snap.webp', pos: '50% 50%' },
  { k: 'r1', name: '잔잔하게', t: '짧은 판 곡', a: '시험 가수', hook: 40, hook0: 40, len: 70, file: 'r1.mp3', pf: 'r1p.mp3', p0: 10, p1: 70, hooks: [40], img: '/assets/home/snap.webp', pos: '50% 50%' },
  { k: 'r7', name: '짧게', t: '아주 짧은 판 곡', a: '시험 가수', hook: 40, hook0: 40, len: 70, file: 'r7.mp3', pf: 'r7p.mp3', p0: 30, p1: 55, hooks: [40], img: '/assets/home/snap.webp', pos: '50% 50%' }];
const HAVE = ['B01', 'B07', 'B09', 'B10', 'B15', 'B16', 'B17', 'B24', 'B28'];   /* 화촉 B05 · B31 은 없다(①) */
const SONG = {}; HAVE.forEach((k, i) => { SONG[k] = wav(12, 180 + i * 20).toString('base64'); });
const RS = { r5: wav(140, 250).toString('base64'), 'r1-p': wav(60, 300).toString('base64'), r1: wav(70, 300).toString('base64'), 'r7-p': wav(25, 320).toString('base64'), r7: wav(70, 320).toString('base64') };
const HARNESS = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><iframe id="fr" style="width:100vw;height:100vh;border:0;display:block"></iframe>
<script>
window.H={dly:{},rl:${JSON.stringify(RL)},rs:${JSON.stringify(RS)},log:[],draft:null,saved:null,delay:40,have:${JSON.stringify(HAVE)},songs:${JSON.stringify(SONG)}};
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
        back({type:'momentedit:ritualFileData',key:'bed',id:g.id,ok:true,mime:'audio/wav',data:H.songs[g.id]}); }, H.dly[g.id]!=null?H.dly[g.id]:H.delay); return; }
    back({type:'momentedit:ritualFileData',key:g.key,id:g.id,ok:false,error:'파일을 불러오지 못했어요 (코드 L6)',ecode:'L6'}); return; }
});
</script>`;
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/__harness.html') { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(HARNESS); return; }
  if (/^\/assets\/audio\/narration\/.+\.mp3$/.test(u)) { r.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': SHORT.length }); r.end(SHORT); return; }   /* 길이를 실어 보낸다(실제 사이트와 같게 · 없으면 브라우저가 길이를 모른다) */
  const p = (OP && u === '/order-preview.html') ? OP : (BED && u === '/assets/bgm-bed.js') ? BED : (EMF && u === '/assets/entry-music.js') ? EMF : (PICKSF && u === '/assets/bgm-picks.js') ? PICKSF : (CUEF && u === '/assets/ritual-cue.js') ? CUEF : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const wait = (f, ms) => f.waitForTimeout(ms);
const ALL = ['prevideo', 'candle', 'welcome', 'vow', 'ring', 'declare', 'free', 'letter', 'tribute', 'toast', 'table'];
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
const P = require(PICKSF || path.join(ROOT, 'assets/bgm-picks.js'));
const MU = (k) => ({ src: 'rec', k, t: '시험 입장 곡', a: '시험 가수', hook: 40, hooks: [40], dur: k === 'r5' ? 140 : 70 });
const setS = (f, o) => f.evaluate((o) => { Object.keys(o.on || {}).forEach((k) => { S.on[k] = o.on[k]; }); S.freeWhat = 'speech'; S.bgm = o.bgm || {}; if (o.mu) S.mu = o.mu; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); }, o);
/* 듣기를 돌리며 100ms 마다 — 줄 · 곡 · 크기 · 소리 객체 · 알림 */
const run = (f, ks, ms, big, stopEmpty) => f.evaluate(async ({ ks, ms, big, stopEmpty }) => { const B = BgmBed._t, o = []; let n = 0;
  if (!window.__lpMs0) window.__lpMs0 = window._lpMs; window._lpMs = function () { return 1500; };
  if (big) { LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(ks, true); _lFull(); } else lsPlay(ks[0]);
  (LP.q || []).forEach((x) => { if ((x.talk || x.talk2 || x.said) && !x.walk) x.ms = 1500; });
  const t0 = performance.now(); await new Promise((res) => { const iv = setInterval(() => { const v = B.BED.cur, st = LP.q[LP.i]; if (v && v.src && !v.__id) v.__id = ++n;
    o.push({ t: performance.now() - t0, i: LP.i, k: st && st.k, slug: st && (st.slug || st.of) || '', skip: !!(st && st.skip), act: !!(st && st.act), walk: !!(st && st.walk), lead: !!LP.leadSt, ta: (LP.el && !LP.el.paused && !LP.el.ended) || LP.tAt ? 1 : 0, who: B.BED.who, f: v && v.f, src: !!(v && v.src), want: v && v.want, id: v && v.__id || 0, note: LP.bedNote || '', relay: B.LPB.relay || 0, loop: !!(v && v.src && v.src.loop), q: LP.q.length, tail: !!(BgmBed.inTail && BgmBed.inTail()) });
    if (performance.now() - t0 > ms || (stopEmpty && !LP.q.length && performance.now() - t0 > 2000)) { clearInterval(iv); res(); } }, 100); });
  window._lpMs = window.__lpMs0; return o; }, { ks, ms, big, stopEmpty });
const stop = (f) => f.evaluate(() => { try { lsStop(); } catch (e) {} try { lsCloseBig(); } catch (e) {} });
try {
  const { ctx, pg, f, errs } = await open(390, true);
  /* ① 대신 흐르는 곡 */
  { await setS(f, { bgm: {} }); await go(f, 'candle'); const T7 = P.SONGS.B07.t, want = `준비 중이라 지금은 ‹${T7}›이 대신 흘러요`;
    const a = await f.evaluate(() => [...document.querySelectorAll('.ls-bed[data-seg="M2"] .bed-sub-note')].map((x) => [x.textContent.trim(), getComputedStyle(x).fontSize]));
    await f.click('[data-fk="bed:M2:B31"]'); await wait(f, 400); const b = await f.evaluate(() => [...document.querySelectorAll('.ls-bed[data-seg="M2"] .bed-sub-note')].map((x) => x.textContent.trim()));
    const r = await run(f, ['candle'], 5000); await stop(f); const notes = [...new Set(r.map((x) => x.note).filter(Boolean))];
    ok(`① 화촉 1순위(B05) · 고른 곡(B31) 파일이 없으면 줄 아래 «${want}»(12.5px) · 미리 듣기 줄도 같은 글 · 실제로 B07`, a.length === 1 && a[0][0] === want && a[0][1] === '12.5px' && b.length === 1 && b[0] === want && notes.indexOf(want) > -1 && r.some((x) => x.f === 'B07' && x.src), { a, b, notes, fs: [...new Set(r.map((x) => x.f))] }); }
  /* ② 늦은 곡 목록 */
  { await setS(f, { bgm: {} }); await go(f, 'welcome'); await f.evaluate(() => { const A = BgmBed._t.AV; A.st = ''; A.set = {}; Object.keys(BgmBed._t.BUF).forEach((k) => { delete BgmBed._t.BUF[k]; }); }); await pg.evaluate(() => { H.dly.list = 8000; });   /* 뜸은 누른 뒤 약 3.5초에 시작한다 — 그 뒤 1.5초가 지나도 목록이 아직이게 */
    const r = await run(f, ['welcome'], 16000); await stop(f); await pg.evaluate(() => { H.dly.list = null; });
    const ld = r.filter((x) => x.note === '음악을 불러오는 중이에요'), mus = r.filter((x) => x.f === 'B09' && x.src && x.want > -60), lead = r.filter((x) => x.lead);
    ok('② 곡 목록이 8초 늦게 와도 — 기다리는 동안 «음악을 불러오는 중이에요» · 목록이 오면 감사 인사 곡(B09)을 깐다 · 뜸도 그 뒤(8초 기다림 안)', ld.length > 3 && mus.length > 10 && lead.length && mus[0].t > ld[0].t, { ld: ld.length, mus: mus.length, first: mus[0] && Math.round(mus[0].t), ldT: ld[0] && Math.round(ld[0].t) }); }
  /* ③ 멈춤 → 이어 듣기 */
  { await go(f, 'welcome'); const r0 = await run(f, ['welcome'], 7500);
    const z = await f.evaluate(async () => { const B = BgmBed._t; lsToggle(); await new Promise((x) => setTimeout(x, 1600)); const pz = B.pz ? B.pz() : null, gone = !B.BED.cur.src || B.BED.cur.want <= -60;
      lsToggle(); await new Promise((x) => setTimeout(x, 120)); const v = B.BED.cur, st = LP.q[LP.i], tgt = LP.leadSt ? pz.want : B.lvOf(st, v.f), a =   /* [DETAIL_R2_1101 ④] 뜸 중에 멈췄으면 남은 뜸부터 — 그 크기(멈출 때 크기)로 */ { f: v.f, src: !!v.src, off: v.off, want: v.want, tgt };
      await new Promise((x) => setTimeout(x, 650)); a.g = v.g ? v.g.gain.value : null; a.gt = B.gfOf(tgt); return { pz, gone, a }; });
    await stop(f);
    ok('③ 멈추면 곡 · 자리 · 크기를 적고 잦아든다 · 이어 들으면 그 곡 그 자리에서 지금 줄 크기로 0.6초 안에', !!z.pz && z.gone && z.a.src && z.a.f === z.pz.f && Math.abs(z.a.off - z.pz.pos) < 0.4 && z.a.want === z.a.tgt && Math.abs(z.a.g - z.a.gt) / z.a.gt < 0.08, { z, r0: r0.length }); }
  /* ④ 여운도 흐르는 중 */
  for (const how of ['move', 'stop']) {
    await go(f, 'candle'); const r = await run(f, ['candle'], 40000, false, true); const t = r.filter((x) => x.tail);
    const lab = await f.evaluate(() => { const b = document.querySelector('.mk-hbtn[data-mp="candle"]'); return b ? b.textContent.trim() : ''; });
    const fd = await f.evaluate(async (how) => { const B = BgmBed._t; if (!(B.BED.who === 'tail' && B.BED.cur.src)) return { pre: false }; const t0 = performance.now();
      if (how === 'move') mkGo('welcome'); else { const b = document.querySelector('.mk-hbtn[data-mp="candle"]'); if (b) b.click(); }
      await new Promise((x) => setTimeout(x, 1750)); return { pre: true, who: B.BED.who, src: !!B.BED.cur.src, dt: performance.now() - t0 }; }, how);
    ok(`④ 여운이 흐르는 동안 알약 «멈춤» · ${how === 'move' ? '다른 순간으로 옮기면' : '«멈춤»을 누르면'} 1.5초에 잦아든다`, t.length > 0 && /멈춤/.test(lab) && fd.pre && !fd.src && fd.who !== 'tail', { tail: t.length, lab, fd }); }
  /* ⑤ 식전 영상 */
  { await go(f, 'prevideo'); const r = await run(f, ['prevideo'], 26000, false, true); await stop(f);
    const ln = r.filter((x) => x.k === 'prevideo' && !x.lead && x.src), pre = ln.filter((x) => x.slug === 'narr-prevideo-in' && !x.skip && !x.act), post = ln.filter((x) => x.slug === 'narr-prevideo-out'), sk = ln.filter((x) => x.slug !== 'narr-prevideo-out' && x.slug !== 'narr-prevideo-in');   /* 영상이 흐르는 줄 */
    const lds = r.filter((x) => x.k === 'prevideo' && x.lead && x.src), t1 = pre.length ? pre[0].t : null, sil = lds.filter((x) => x.want <= -60 && t1 != null && x.t < t1), silMs = sil.length ? t1 - sil[0].t : 0, w0 = lds.length ? lds[0].want : null;
    ok('⑤ [PREVIDEO_AFTER_1101] 식전 영상 따로 듣기 — 소개 · 영상 · 받는 말 모두 음악 없이(≤ −60)', pre.length > 3 && post.length > 3 && sk.length > 3 && [...pre, ...sk, ...post].every((x) => x.want <= -60), { pre: pre.length, silMs: Math.round(silMs), w0, fs: [...new Set(ln.map((x) => [x.i, x.slug, x.skip, x.act, x.f, x.want].join(':')))] }); }
  /* ⑤b [PREVIDEO_AFTER_1101] 이어 듣기 식전 영상 → 화촉 — 화촉 곡은 무음에서 · 첫 멘트는 뜸 약 6초 뒤 · 당일 큐 값(콘솔이 읽는다) */
  { await go(f, 'guest'); const r = await run(f, ['guest', 'prevideo', 'candle'], 80000, true); await stop(f);
    const pv = r.filter((x) => x.k === 'prevideo' && !x.lead), cl = r.filter((x) => x.k === 'candle' && x.lead), cn = r.filter((x) => x.k === 'candle' && !x.lead), lastPv = pv.length ? pv[pv.length - 1] : null;
    const cn2 = cl.length ? cn.filter((x) => x.t > cl[0].t) : [], ldMs = cl.length && cn2.length ? cn2[0].t - cl[0].t : 0;
    const pi = r.filter((x) => x.k === 'prevideo' && !x.lead && /^narr-prevideo-in/.test(x.slug || '')), tI = (pi.find((x) => x.ta) || {}).t ?? null,   /* 줄 시계가 걸린 때(쉼이 끝나고 소개가 나오는 때) */ gs = r.filter((x) => tI != null && x.t < tI && x.t > tI - 4000), sil = gs.filter((x) => !x.src || x.want <= -60), silMs = sil.length && tI != null ? tI - sil[0].t : 0;
    ok('⑤b 이어 듣기 하객 맞이 → 식전 영상 → 화촉 — 소개 앞 정적 ≥ 0.8초 · 받는 말까지 음악 없이 · 화촉 곡은 무음에서 · 첫 멘트는 약 6초 뒤', silMs >= 800 && !!lastPv && (!lastPv.src || lastPv.want <= -60) && cl.length > 10 && ldMs > 5200 && ldMs < 7600, { silMs: Math.round(silMs), last: lastPv && [lastPv.f, lastPv.want], ldMs: Math.round(ldMs), f: cl.length && cl[cl.length - 1].f });
    const cq = await f.evaluate(() => { const c = ENG.RitualCue.build(S, { mode: 'console' }); const L = c.cues || c; const at = (fn) => L.find(fn) || {}; const i = at((x) => /^narr-prevideo-in/.test(x.slug || '')), o = at((x) => x.slug === 'narr-prevideo-out'), io = L.indexOf(o), cd = L.slice(io + 1).find((x) => x.k === 'candle' && !/^bridge-/.test(x.slug || '')) || {};
      return { i: [i.duck, i.fadeMs, i.goLeadMs], o: o.duck, c: [cd.slug, cd.goLeadMs, cd.leadDb] }; });
    ok('⑤b 당일 큐 — 소개 −90(2초 · 3초 쉬고) · 받는 말 −90 · 화촉 첫 큐 무음에서 −8 로 6초 앞서', cq.i.join() === '-90,2000,3000' && cq.o === -90 && cq.c[1] === 6000 && cq.c[2] === -8, cq); }
  /* ⑨ 닫는 인사 따로 듣기 */
  { await go(f, '_close'); const vx12 = await f.evaluate(() => BgmBed._t.vx(-12, 'B28')); const r = await run(f, ['_close'], 30000, false, true); await stop(f);   /* 축배 곡은 가사가 있는 곡 — −12 에 vocalExtra(−6) */
    const bow = r.filter((x) => x.k === '_close' && x.slug === 'narr-close-bow' && !x.lead && x.src), cl = r.filter((x) => x.k === '_close' && x.slug !== 'narr-close-bow' && x.src && x.want > -60);
    ok('⑨ 닫는 인사 따로 듣기 — 첫 멘트는 앞 순간(축배) 곡 B28 −12(노래 곡 −6 더) · 목례부터 닫는 인사 곡 B17', bow.length > 3 && bow.some((x) => x.f === 'B28' && x.want === vx12) && cl.some((x) => x.f === 'B17'), { bow: [...new Set(bow.map((x) => x.f + ':' + x.want))], cl: [...new Set(cl.map((x) => x.f))] }); }
  /* ⑧ 짧은 판(12초) */
  { await go(f, 'welcome'); const r = await run(f, ['welcome'], 16000); await stop(f); const m = r.filter((x) => x.f === 'B09' && x.src);
    ok('⑧ 짧은 판(12초) — 끝 3초 전 처음으로 3초 겹쳐 잇는다(맞붙임 loop 0 · 곡 B09 그대로 · 지금 곡 객체 그대로)', m.length > 50 && Math.max(...r.map((x) => x.relay)) >= 1 && m.every((x) => !x.loop) && new Set(m.map((x) => x.id)).size === 1, { n: m.length, relay: Math.max(...r.map((x) => x.relay)), loop: m.some((x) => x.loop), ids: [...new Set(m.map((x) => x.id))] }); }
  /* ⑥ 크게 보기 이어 듣기(입장 → 맞절) */
  { await setS(f, { mu: MU('r5'), bgm: {} }); await go(f, 'entry'); await wait(f, 1200); const r = await run(f, ['entry', 'matjeol'], 30000, true); await stop(f);
    const wk = r.filter((x) => x.walk), wkm = wk.filter((x) => x.f === '@ENT' && x.src), iW = wk.length ? wk[wk.length - 1].i : -1, nx = r.filter((x) => x.i === iW + 1 && x.k === 'entry' && x.src && x.f === '@ENT' && !x.lead);
    const dur = wk.length ? wk[wk.length - 1].t - wk[0].t : 0, txt = await f.evaluate(() => (LP.q || []).filter((x) => x.walk).map((x) => x.txt)[0] || '');
    ok('⑥ 크게 보기 이어 듣기 — 걷는 줄 약 8초 · 입장 곡 크게(0) · 그다음 줄은 말 아래', wk.length > 50 && dur > 7000 && dur < 9500 && wkm.length > 40 && wkm.slice(10).every((x) => x.want === 0) && (nx.length === 0 || nx.every((x) => x.want <= -12)), { wk: wk.length, dur: Math.round(dur), w: [...new Set(wkm.map((x) => x.want))], nx: [...new Set(nx.map((x) => x.want))] }); }
  /* ⑦ 입장 곡 받는 중 바뀜 */
  { const z = await f.evaluate(async () => { const E = window.EntryMusic, keep = { has: E.carryHas, sig: E.carrySig, carry: E.carry }, B = BgmBed._t; let sig = 'A';
      const ac = new (window.AudioContext || window.webkitAudioContext)(), buf = ac.createBuffer(1, 8000, 8000);
      E.carryHas = () => true; E.carrySig = () => sig; E.carry = () => { const at = sig; return new Promise((res) => setTimeout(() => res({ buf, mk: at, o: 0, end: 1, H: 0.5, arrive: 0.5, gain: 1, trim: 0, intro: 0, under: -16 }), 1200)); };
      delete B.BUF['@ENT']; BgmBed.lpWarm(['matjeol']); await new Promise((x) => setTimeout(x, 300)); sig = 'B';
      await new Promise((x) => setTimeout(x, 3200)); const o1 = B.BUF['@ENT'], r1 = o1 && o1.ext ? o1.ext.mk : (o1 ? o1.st : '');
      delete B.BUF['@ENT']; sig = 'C'; BgmBed.lpWarm(['matjeol']); await new Promise((x) => setTimeout(x, 300)); sig = 'D'; BgmBed.lpWarm(['matjeol']);
      await new Promise((x) => setTimeout(x, 3200)); const o2 = B.BUF['@ENT'], r2 = o2 && o2.ext ? o2.ext.mk : (o2 ? o2.st : '');
      E.carryHas = keep.has; E.carrySig = keep.sig; E.carry = keep.carry; delete B.BUF['@ENT']; return { r1, r2 }; });
    ok('⑦ 입장 곡을 받는 중에 곡이 바뀌면 옛 곡(A · C)은 버리고 새 곡(B · D)을 받는다', z.r1 === 'B' && z.r2 === 'D', z); }
  ok('쪽 오류 0', !errs.length, errs.slice(0, 3));
  await ctx.close();
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); }
await br.close(); srv.close();
console.log(fail ? `DETAIL R1 FAIL ${fail}` : 'DETAIL R1 OK');
process.exit(fail ? 1 : 0);
