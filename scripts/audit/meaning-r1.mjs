#!/usr/bin/env node
/* ★★[MEANING_R1_1102 2026-11-02 사장님 «이런 디테일 놓치지 말라고 · 심리적으로도»] 뜻으로 맞는 음악 — 1차(13 · 14 · 15 · 16)
   13 하루 이어 듣기에서 «위하여» 뒤 축배 곡(M7) 1회 이상(차례로 나눈 줄에도 cheer)
   14 닫는 인사 «마치겠습니다» 앞 정적 ≥ 0.8초 · 그 줄 음악 없이 · 목례 · 박수에서 M6 −8 · 당일 큐(−90 · 2초 · 3초 / 마무리 멘트 −16)
   15 온라인 인사 — 두 분이 카메라에 말하는 동안 −20(당일 큐)
   16 촬영 후 안내 = 마지막 곡(M8L)
   BP_OP · BP_BED · BP_CUE = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
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
const HAVE = ['B01', 'B07', 'B09', 'B10', 'B12', 'B13', 'B15', 'B16', 'B17', 'B24', 'B28', 'B32'];   /* [MEANING_R1_1102 16] 마지막 곡(M8L 1순위 B32) */   /* 화촉 1 · 2(B05 · B31)는 없다 — d */   /* [BGM_TIMING_1101] 테이블 인사 곡(B23)도 — 축배 뜸 곡 e */
const SONG = {}; HAVE.forEach((k, i) => { SONG[k] = wav(9, 180 + i * 20).toString('base64'); });
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

const SHOT = process.env.SHOT || '';
const shot = async (f, W, n, sel) => { if (!SHOT) return; try { fs.mkdirSync(SHOT, { recursive: true }); await f.locator(sel).first().screenshot({ path: path.join(SHOT, `fill-${W}-${n}.png`) }); } catch {} };
const go = async (f, k) => { await f.evaluate((k) => mkGo(k), k); await wait(f, 700); };
const P = require(PICKSF || path.join(ROOT, 'assets/bgm-picks.js')), SL = require(SLOTS || path.join(ROOT, 'assets/bgm-slots.js'));
const setS = (f, bgm) => f.evaluate((b) => { S.freeWhat = 'speech'; S.bgm = b; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); }, bgm);
const look = (f, sg) => f.evaluate((sg) => { const b = document.querySelector('.ls-bed[data-seg="' + sg + '"], .bed-sub[data-seg="' + sg + '"]'); if (!b) return null; const info = b.querySelector('.bed-info');
  return { info: info ? info.textContent.replace(/\u00a0/g, ' ').trim() : '',   /* 화면이 «약 30분» 사이를 줄바꿈 없는 공백으로 묶는다 */ fs: info ? getComputedStyle(info).fontSize : '', list: [...b.querySelectorAll('li.mu-row[data-f]')].map((x) => x.getAttribute('data-f')), pl: b.querySelectorAll('li.mu-row[data-f] .mu-pl').length,
    tA: [...b.querySelectorAll('li.mu-row[data-f]')].map((x) => [x.querySelector('.mu-t').textContent, x.querySelector('.mu-a').textContent]),
    rows: b.querySelectorAll('.mu-pick').length, chg: b.querySelectorAll('.mu-chg').length, on: b.querySelectorAll('[aria-checked="true"]').length, fold: !!b.querySelector('.mu-fsel'), ord: b.querySelectorAll('.bed-ord, .bed-flow').length,
    dup: ((b.querySelector('.bed-dup') || {}).textContent || '').trim() }; }, sg);


const setX = (f, o) => f.evaluate((o) => { Object.keys(o.on || {}).forEach((k) => { S.on[k] = o.on[k]; }); S.freeWhat = 'speech'; S.bgm = o.bgm || {}; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); }, o);
const LN = (f, sg) => f.evaluate((sg) => { const b = document.querySelector('.ls-bed[data-seg="' + sg + '"]'); const l = b && b.querySelector('.bed-long'); return { t: l ? l.textContent.replace(/ /g, ' ').trim() : '', fs: l ? getComputedStyle(l).fontSize : '', fold: !!(b && b.querySelector('.mu-fsel')) }; }, sg);
const minNode = (S, ks) => { let s = 0; C.build(S, { mode: 'console' }).cues.forEach((c) => { if (ks.indexOf(c.k) < 0) return; s += (+c.est || 0) + ((c.live && (+(c.live.fullEst || c.live.est) || 0)) || 0); }); return Math.max(1, Math.round(s / 60)); };
const K4 = ['welcome', 'vow', 'ring', 'declare', 'bless', 'free', 'letter', 'song'], K6 = ['_close', '_photo'];

/* ── 당일 큐 한 표(① 미리 듣기 · 연습 · 콘솔이 같이 읽는다) — 브라우저 없이 ── */
{ const B2 = (S) => C.build(Object.assign({ course: 'open' }, S), { mode: 'console' }).cues, by = (cs, sl) => cs.find((c) => c.slug === sl) || {}, bi = (cs, sl) => cs.findIndex((c) => c.slug === sl);
  const A = B2({ on: { vow: 1, ring: 1, free: 1, song: 1, letter: 1, tribute: 1, toast: 1, table: 1, welcome: 1, declare: 1, matjeol: 1 }, freeWhat: 'speech', song: 'family', songBy: 'friend', tributeSay: 'short' });
  /* 1 · 20 개식사 — 2초 내림 · 3초 앞(정적 1초) · 박수 live 는 정적 위 · 영상이 없는 날도 박수 live */
  const O1 = B2({ on: { prevideo: 0, candle: 1 } }), O2 = B2({ on: { prevideo: 0, candle: 0 } }), o1 = by(O1, 'narr-open'), o2 = by(O2, 'narr-open');
  const c1 = O1[bi(O1, 'narr-open') + 1] || {};
  ok('1 개식사 — 하객 맞이 곡 2초 내림 + 정적 1초 · 멘트 · 박수는 음악 없이', o1.duck === -90 && o1.fadeMs === 2000 && o1.goLeadMs >= 3000 && (!o1.live || o1.live.duck === -90), { duck: o1.duck, fade: o1.fadeMs, lead: o1.goLeadMs, live: o1.live && o1.live.duck });
  ok('1 영상 없는 날 — 화촉 첫 큐는 정적 1초 뒤 무음에서 M2 를 6초 앞서(−8)', c1.k === 'candle' && c1.goLeadMs >= 6000 && c1.leadDb === -8 && c1.gapMs >= 1000, { k: c1.k, lead: c1.goLeadMs, ldb: c1.leadDb, gap: c1.gapMs });
  const b7 = by(O2, 'bridge-b7-entry-ready');
  ok('17 영상 · 화촉 없는 날 — 입장 앞 이음말(b7)은 정적 위(하객 맞이 곡이 돌아오지 않는다)', b7.duck === -90, { b7: b7.duck });
  ok('20 영상 없는 날도 박수를 청하는 개식사면 박수 live(사람이 GO)', !!(o2.live && o2.live.applause) || !/박수/.test(o2.text || ''), { live: !!o2.live, text: String(o2.text || '').slice(0, 30) });
  /* 4 · 5 · 7 · 8 · 9 · 11 · 12 */
  const b8 = by(A, 'bridge-b8-face-guests'), b3 = by(A, 'bridge-b3-clap-thanks'), b9 = A.find((c) => /^bridge-b9-declare-seat-end/.test(c.slug || '')) || {};
  ok('4 맞절 → 감사 인사 이음말 −16', b8.duck === -16, { b8: b8.duck });
  ok('5 선언 박수 뒤 b3 · b9 −16(0.8초 미리 낮춤)', b3.duck === -16 && b3.fadeMs === 800 && b9.duck === -16 && b9.fadeMs === 800, { b3: [b3.duck, b3.fadeMs], b9: [b9.duck, b9.fadeMs] });
  const L1 = B2({ on: { welcome: 1, free: 1 }, freeWhat: 'speech' }), L2 = B2({ on: { welcome: 1, free: 1 }, freeWhat: 'speech', bgm: { S5: { m: 'bed' } } }), s1 = L1.filter((c) => c.slug === 'bridge-b10-speech-clap'), s2 = L2.filter((c) => c.slug === 'bridge-b10-speech-clap');
  ok('7 축사가 마지막인 날 b10 — «음악 없이»면 부탁 문장 정적 · «음악과 함께»면 −16 · 박수 −8', s1.length && s1.every((c) => c.duck === -90 && c.live && c.live.duck === -8) && s2.length && s2.every((c) => c.duck === -16), { none: s1.map((c) => [c.duck, c.live && c.live.duck]), bed: s2.map((c) => c.duck) });
  const sg = by(A, 'narr-song'), sgp = (sg.post || [])[0] || {};
  ok('8 축가 여는 말 −16 · 줄 끝 1.5초에 정적', sg.duck === -16 && sgp.v === -90 && sgp.ms === 1500, { duck: sg.duck, post: sg.post });
  const T = B2({ on: { song: 1, tribute: 1 }, song: 'family', songBy: 'friend' }), b12 = by(T, 'bridge-b12-tribute-calm'), t1 = T[bi(T, 'bridge-b12-tribute-calm') + 1] || {};
  ok('9 축가 → 부모님께 인사 이음말 −16 → 정적 · 정적 1초 뒤 M5 무음에서 6초 앞서', b12.duck === -16 && ((b12.post || [])[0] || {}).v === -90 && t1.k === 'tribute' && t1.goLeadMs >= 6000 && t1.leadDb === -8 && t1.gapMs >= 1000, { b12: [b12.duck, b12.post], next: [t1.k, t1.goLeadMs, t1.leadDb, t1.gapMs] });
  const ti = by(A, 'narr-table-in');
  ok('11 테이블 인사 여는 말 −16 · 이동 −12', ti.duck === -16 && ti.live && ti.live.duck === -12, { duck: ti.duck, live: ti.live && ti.live.duck });
  const b13 = by(A, 'bridge-b13-toast-stay');
  ok('12 축배 앞 «자리를 지켜 주시면» 말 −16 · 잔 나누는 40초 −8', b13.duck === -16 && b13.live && b13.live.duck === -8, { duck: b13.duck, live: b13.live && b13.live.duck });
  const G = B2({ on: { welcome: 1, free: 1 }, freeWhat: 'gift' }), gf = G.find((c) => c.k === 'free' && c.live) || {};
  ok('6 선물 전달 동작 −12', gf.live && gf.live.duck === -12, { live: gf.live && gf.live.duck });
  /* 화면 음악 안내 글(5 · 11) */
  const vd = SL.viewOf('declare', { onOf: () => true, seq: K4, nameOf: (k) => k }), vt = SL.viewOf('table', { onOf: () => true, seq: ['table'], nameOf: (k) => k });
  ok('5 · 11 화면 음악 글 — 선언 «선언문을 읽는 동안은 음악 없이 …» · 테이블 «테이블 인사 동안 재즈가 흘러요»', !!vd && vd.t === '선언문을 읽는 동안은 음악 없이, 축하 박수부터 음악이 이어져요' && !!vt && vt.t === '테이블 인사 동안 재즈가 흘러요', { d: vd && vd.t, t: vt && vt.t });
  /* 원칙 — 나레이션 줄은 말 아래(−16 이하) · 예외 목록(화촉 −8 · 입장 −12 · 부모님 «인사!» 구호 −12 · 맺는 말 · 정적 줄) */
  const NARR_OK = /^(narr-candle|entry-|narr-entry|tribute-call|narr-song-end|narr-free-out|narr-letter-end|narr-vow-out|declare-clap|narr-ring-out|narr-declare|toast-|narr-cheer|bridge-b14|bridge-b10|guest-|narr-photo|narr-final|narr-goodbye|after-|narr-close$)/;
  const loud = A.filter((c) => /^(narr-|bridge-)/.test(c.slug || '') && c.duck > -16 && !NARR_OK.test(c.slug || ''));
  ok('원칙 — 나레이션 · 이음말 줄은 −16 이하(예외 목록 밖)', !loud.length, loud.map((c) => c.slug + ' ' + c.duck));
}

const listen = (f, ks, ms) => f.evaluate(async ({ ks, ms }) => { const BB = BgmBed._t, o = []; window._lpMs = function () { return 800; };
  LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(ks, true); _lFull();
  (LP.q || []).forEach((x) => { if (x.talk || x.talk2 || x.said || x.act || x.quiet) x.ms = 800; });
  const t0 = performance.now(); await new Promise((res) => { const iv = setInterval(() => { const v = BB.BED.cur, st = LP.q[LP.i] || {};
    o.push({ t: performance.now() - t0, act: !!(st.act || st.quiet), pre: !!st._pre, k: st.k, slug: st.slug || st.of || '', after: !!st.after, pl: !!((LP.el && !LP.el.paused && !LP.el.ended) || LP.tAt), au: !!(LP.el && !LP.el.paused && !LP.el.ended && LP.el.currentTime > 0), f: v && v.f, src: !!(v && v.src), want: v && v.want, m7: !!BB.LPB.m7 });
    if (performance.now() - t0 > ms || !LP.q.length) { clearInterval(iv); res(); } }, 100); });
  try { lsStop(); } catch (x) {} try { lsCloseBig(); } catch (x) {} return o; }, { ks, ms });
try {
  const { ctx, f, errs } = await open(390, true);
  await setX(f, { on: { table: 1, toast: 1, song: 0, free: 0 }, bgm: {} }); await go(f, 'table');
  const r = await listen(f, ['table', 'toast', '_close'], 90000);
  /* 13 */
  const m7 = r.filter((x) => x.src && x.f === 'B28' && x.want > -2);
  ok('13 이어 듣기(테이블 → 축배 → 닫는 인사) — «위하여» 뒤 축배 곡(M7 · B28)이 올라온다', m7.length > 3, { m7: m7.length, fs: [...new Set(r.filter((x) => x.src).map((x) => x.f))] });
  /* 14 */
  const bow = r.filter((x) => x.slug === 'narr-close-bow'), bS = (bow.find((x) => x.pl) || {}).t, pre = r.filter((x) => bS != null && x.t < bS && x.t > bS - 4000), sil = pre.filter((x) => !x.src || x.want <= -60), silMs = sil.length && bS != null ? bS - sil[0].t : 0;
  const bowOn = bow.filter((x) => x.pl && !x.act), iB = r.findIndex((x) => x.slug === 'narr-close-bow'), aft = r.slice(iB).filter((x) => x.k === '_close' && !x.after && x.src && (x.act || x.slug !== 'narr-close-bow')).slice(0, 40), bowAct = aft.filter((x) => x.act && x.slug === 'narr-close-bow'), clo = aft.filter((x) => /^narr-closing/.test(x.slug || '') && !x.act);
  ok('14 닫는 인사 «마치겠습니다» 앞 정적 ≥ 0.8초 · 그 줄은 음악 없이(≤ −60)', silMs >= 800 && bowOn.length > 2 && bowOn.every((x) => !x.src || x.want <= -60), { silMs: Math.round(silMs), bow: [...new Set(bowOn.map((x) => x.want))] });
  const m6 = (await f.evaluate(() => BgmPicks.PICKS.M6 || [])).filter(Boolean);
  ok('14 목례 · 박수에서 닫는 인사 곡(M6)을 −8 로', bowAct.length > 2 && bowAct.some((x) => x.want >= -8.5 && x.want <= -7.5 && m6.includes(x.f)), [...new Set(bowAct.map((x) => x.f + ' ' + x.want))]);
  ok('14 마무리 멘트 −16(그 뒤 −8)', clo.length > 2 && clo.some((x) => x.want >= -16.5 && x.want <= -15.5), [...new Set(clo.map((x) => x.f + ' ' + x.want))]);
  /* 16 */
  const m8l = await f.evaluate(() => (BgmPicks.PICKS.M8L || [])[0] || ''), af = r.filter((x) => x.after && x.src && x.pl);
  const dbg = await f.evaluate(() => ({ av: !!BgmBed._t.AV.set.B32, st: BgmBed._t.AV.st, pl: JSON.stringify((BgmBed._t.plan(true) || {}).M8L || null), pend: BgmBed._t.LPB.pend, late: JSON.stringify(BgmBed._t.LPB.late || null), b32: BgmBed._t.BUF.B32 ? BgmBed._t.BUF.B32.st : 'none', note: BgmBed._t.LPB.note }));
  ok('16 촬영 후 안내 = 마지막 곡(M8L)', !!m8l && af.length > 2 && af.every((x) => x.f === m8l), { m8l, dbg, af: [...new Set(af.map((x) => x.f + ' ' + x.k + ' pre' + x.pre))] });
  /* 14 · 15 당일 큐 */
  const cq = await f.evaluate(() => { const S2 = JSON.parse(JSON.stringify(S)); S2.digital = true; const L = ENG.RitualCue.build(S2, { mode: 'console' }).cues, at = (fn) => L.find(fn) || {};
    const b = at((x) => x.slug === 'narr-close-bow'), cl = at((x) => /^narr-closing/.test(x.slug || '')), on = at((x) => x.slug === 'narr-online-in'); return { b: [b.duck, b.fadeMs, b.goLeadMs], cl: cl.duck, on: [on.duck, on.live && on.live.duck] }; });
  ok('14 · 15 당일 큐 — 닫는 인사 −90(2초 · 3초) · 마무리 멘트 −16 · 온라인 인사 −16 / 두 분 말하는 동안 −20', cq.b.join() === '-90,2000,3000' && cq.cl === -16 && cq.on.join() === '-16,-20', cq);
  /* 18 선언 앞 — 반지 바로 뒤일 때만 «4초 내림 + 2.5초 정적» · 그 밖에는 1.5초에 끄고 정적 1초 */
  const silBefore = (r, k) => { const i = r.findIndex((x) => x.k === k && x.au && !x.act), t = i > -1 ? r[i].t : null; if (t == null) return -1; const pre = r.filter((x) => x.t < t && x.t > t - 9000), j = pre.length - 1; let st = t; for (let q = j; q >= 0; q--) { if (pre[q].src && pre[q].want > -60) break; st = pre[q].t; } return t - st; };
  await setX(f, { on: { vow: 1, ring: 1, declare: 1 }, bgm: {} }); await go(f, 'ring');
  const rR = await listen(f, ['ring', 'declare'], 60000), sR = silBefore(rR, 'declare');
  await setX(f, { on: { vow: 1, ring: 0, declare: 1 }, bgm: {} }); await go(f, 'vow');
  const rV = await listen(f, ['vow', 'declare'], 60000), sV = silBefore(rV, 'declare');
  ok('18 선언 앞 정적 — 반지 뒤 ≥ 5초(4초 내림 + 2.5초) · 그 밖 1.5 ~ 4초(1.5초 끄고 정적 1초)', sR >= 5000 && sV >= 1500 && sV <= 4000, { ring: Math.round(sR), vow: Math.round(sV) });
  /* 10 미리 듣기 행동 줄 크기 = 당일 콘솔 live.duck(한 표) */
  await setX(f, { on: { vow: 1, ring: 1, declare: 1, welcome: 1, matjeol: 1, tribute: 1, table: 1, candle: 1, toast: 1 }, bgm: {} });
  const q10 = await f.evaluate(() => { const q = _lSteps(ENG, ['candle', 'matjeol', 'welcome', 'vow', 'ring', 'declare', 'tribute', 'table', 'toast', '_close']);
    const L = ENG.RitualCue.build(S, { mode: 'console' }).cues, out = [];
    q.forEach((x) => { if (!x.quiet || !x.of) return; const c = L.find((y) => y.slug === x.of); if (c && c.live && c.live.duck != null) out.push([x.k, x.of, x.ldk, c.live.duck]); }); return out; });
  const bad10 = q10.filter((x) => (x[2] == null ? -8 : x[2]) !== x[3]);   /* ldk 가 없으면 엔진은 큐 사이 크기(−8)로 깐다 */
  ok('10 미리 듣기 행동 줄 크기 = 당일 콘솔 live.duck(맞절 · 부모님께 인사 · 테이블 이동 · 반지 · 박수)', q10.length >= 4 && !bad10.length, { n: q10.length, bad: bad10.slice(0, 6) });
  ok('쪽 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close();
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 500)); }
await br.close(); srv.close();
console.log(fail ? `MEANING R1 FAIL ${fail}` : 'MEANING R1 OK');
process.exit(fail ? 1 : 0);
