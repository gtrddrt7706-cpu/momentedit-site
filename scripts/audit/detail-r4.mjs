#!/usr/bin/env node
/* ★★[DETAIL_R4_1101 2026-11-01 BGM 섹션 «당일 · 새로 생긴 회귀 먼저»] 식순 화면 둘(콘솔 ③ 은 detail-r3)
   R4 ② 입장 장면 → 받는 말 넘김(HAND)을 지키는 것은 안에서 넘겨줄 때뿐 — 고객이 순간을 옮기거나 다른 ▶ 를 틀면 장면까지 멈춘다(ENTRY_UNDER 회귀)
   R4 ① 곡 카드를 받는 중에 순간을 옮기거나 새로 들으면 — 늦게 온 카드 곡이 시작하지 않는다(받는 중인 카드 차례도 무효)
   R3 ⑤ 축배 곡이 늦으면 앞 곡을 올리지 않는다 · R3 ⑥ 축사 «음악과 함께» 뒤 본식 곡은 떠난 초부터
   R4 ⑤ 곡 카드 재생 시작이 실패하면 ▶ 로 되돌리고 한 줄
   R4 ⑥ 크게 보기 «다음 걸음» — 닫기가 늦어도 새 걸음에 머문다(lsCloseBig 콜백)
   R4 ⑦ 안내 칸(하객 맞이 · 테이블)도 곡 목록이 빈 목록으로 오면 «곡 목록을 불러오지 못했어요» + «다시 불러오기» · 누르면 다시 묻고 목록이 오면 한 줄이 걷힌다
   BP_BED · BP_OP · BP_EM(entry-music.js) = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const OP = process.env.BP_OP || '', BED = process.env.BP_BED || '', EMF = process.env.BP_EM || '', SHOT = process.env.SHOT || '';
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 600)}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
function wav(sec, f, sr = 16000) { const n = Math.round(sr * sec), b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(f ? 8000 * Math.sin(2 * Math.PI * f * i / sr) : 0), 44 + i * 2); return b; }
const SHORT = wav(12, 330);   /* 나레이션 대신 — 12초(긴 멘트)   /* 나레이션 대신 — 0.6초 */
/* 드라이브에 있는 곡(시험) — B07 · B30(화촉 3 · 4) · 테이블 인사 곡(B23 · B03 · B24 · B25)은 없다 */
const RL = [{ k: 'r5', name: '경쾌하게', t: '시험 입장 곡', a: '시험 가수', hook: 40, hook0: 40, len: 140, file: 'r5.mp3', img: '/assets/home/snap.webp', pos: '50% 50%' },
  { k: 'r1', name: '잔잔하게', t: '짧은 판 곡', a: '시험 가수', hook: 40, hook0: 40, len: 70, file: 'r1.mp3', pf: 'r1p.mp3', p0: 10, p1: 70, hooks: [40], img: '/assets/home/snap.webp', pos: '50% 50%' },
  { k: 'r7', name: '짧게', t: '아주 짧은 판 곡', a: '시험 가수', hook: 40, hook0: 40, len: 70, file: 'r7.mp3', pf: 'r7p.mp3', p0: 30, p1: 55, hooks: [40], img: '/assets/home/snap.webp', pos: '50% 50%' }];
const HAVE = ['B01', 'B02', 'B04', 'B05', 'B06', 'B09', 'B10', 'B12', 'B13', 'B15', 'B17', 'B21', 'B28'];
const SONG = {}; HAVE.forEach((k, i) => { SONG[k] = wav(20, 180 + i * 20).toString('base64'); });
const RS = { r5: wav(140, 250).toString('base64'), 'r1-p': wav(60, 300).toString('base64'), r1: wav(70, 300).toString('base64'), 'r7-p': wav(25, 320).toString('base64'), r7: wav(70, 320).toString('base64') };
const HARNESS = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><iframe id="fr" style="width:100vw;height:100vh;border:0;display:block"></iframe>
<script>
window.H={rl:${JSON.stringify(RL)},rs:${JSON.stringify(RS)},log:[],draft:null,saved:null,delay:40,dly:{},have:${JSON.stringify(HAVE)},songs:${JSON.stringify(SONG)}};
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
  const p = (OP && u === '/order-preview.html') ? OP : (BED && u === '/assets/bgm-bed.js') ? BED : (EMF && u === '/assets/entry-music.js') ? EMF : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const wait = (f, ms) => f.waitForTimeout(ms);
const ALL = ['candle', 'welcome', 'vow', 'ring', 'declare', 'free', 'letter', 'tribute', 'toast', 'table'];
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
/* ★[MUSIC_FOLD_PICK_1031 따라감] 고르면 바로 한 줄로 접힌다 — 접힌 줄이면 «바꾸기»로 펴서 목록을 잰다(종전엔 .mu-pick 이 없어 검사가 멈췄다) */
const row = (f, sg) => f.evaluate((sg) => { const Q = () => document.querySelector('.ls-bed[data-seg="' + sg + '"],.bed-sub[data-seg="' + sg + '"]'); let r = Q(); if (!r) return null;
  if (!r.querySelector('.mu-pick')) { const cb = r.querySelector('.mu-chg'); if (cb) { cb.click(); r = Q(); if (!r) return null; } }
  return { gl: ((r.querySelector('.gl') || {}).textContent || '').trim(), n: r.querySelectorAll('.mu-row').length, on: [...r.querySelectorAll('.mu-pick[aria-checked="true"]')].map((b) => b.getAttribute('data-fk')),
    pl: r.querySelectorAll('.mu-pl').length, off: [...r.querySelectorAll('.mu-pl.off')].map((b) => b.getAttribute('data-fk')), note: ((r.querySelector('.bed-note') || {}).textContent || '').trim(),
    plH: Math.round(((r.querySelector('.mu-pl') || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height)), pkH: Math.round(r.querySelector('.mu-pick').getBoundingClientRect().height) }; }, sg);
const lab = (f, k) => f.evaluate((k) => { const b = document.querySelector('.mk-hbtn[data-mp="' + k + '"]'); return b ? b.textContent.trim() : ''; }, k);
const LOG = (pg) => pg.evaluate(() => H.log.slice());
/* 이 순간 전체 듣기 — 줄마다 (그 줄 · 음악 곡 · 바란 크기)를 모은다 */
async function listen(f, k, ms) {
  await f.evaluate((k) => { window.__bl = []; lsPlay(k); const t = setInterval(() => { try { const st = LP.q[LP.i] || (LP.q.length ? { k: '_tail', slug: '_tail' } : null), B = BgmBed._t.BED; if (!st || LP.leadSt === st) return;   /* [LISTEN_PACE_1031] 순간 첫 줄 앞 음악 뜸(−8)은 그 줄 크기가 아니다 — listen-pace 가 잰다 */   /* [CHEER_TAIL_1030] 마지막 줄 뒤 꼬리(축배 곡 4초)도 잰다 */ window.__bl.push({ i: LP.i, k: st.k, slug: st.slug || '', talk: !!(st.talk || st.talk2 || st.skip || st.bridge), cheer: !!st.cheer, dk: st.dk, ldk: st.ldk, f: B.cur.f, want: B.cur.want, who: B.who, src: !!B.cur.src }); } catch (e) {} }, 120); window.__blT = t; }, k);
  await wait(f, ms); return f.evaluate(() => { clearInterval(window.__blT); try { lsStop(); } catch (e) {} return window.__bl.slice(); }); }
const shot = async (f, W, n, sel) => { if (!SHOT) return; try { fs.mkdirSync(SHOT, { recursive: true }); await f.locator(sel).first().screenshot({ path: path.join(SHOT, `bed-${W}-${n}.png`) }); } catch {} };
const MU = (k) => ({ src: 'rec', k, t: '시험 입장 곡', a: '시험 가수', hook: 40, hooks: [40], dur: k === 'r5' ? 140 : 70 });
const BEDP = (pg) => null;
/* 맞절을 끝까지 틀며 음악(곡 · 크기 · 소리 객체)과 차례를 모은다 */
async function trace(f, ks, ms, big) {
  return f.evaluate(async ({ ks, ms, big }) => { const B = BgmBed._t, o = []; let n = 0;
    if (big) { LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(ks, true); _lFull(); } else lsPlay(ks[0]);
    const t0 = performance.now();
    await new Promise((res) => { const iv = setInterval(() => { const v = B.BED.cur, st = LP.q[LP.i]; if (v && v.src && !v.__id) v.__id = ++n;
      o.push({ t: performance.now() - t0, k: st && st.k, act: !!(st && st.act), who: B.BED.who, f: v && v.f, src: !!(v && v.src), want: v && v.want, id: v && v.__id || 0, off: v && v.off, g: v && v.g ? v.g.gain.value : null, lead: !!LP.leadSt });
      if (performance.now() - t0 > ms) { clearInterval(iv); res(); } }, 100); });
    try { lsStop(); } catch (x) {} try { if (big) lsCloseBig(); } catch (x) {} return o; }, { ks, ms, big }); }
/* 듣기를 끝까지 — 100ms 마다 (줄 · 곡 · 소리 객체 · 크기 · 겹쳐 잇기 수 · 장면) · LP 가 끝나고 tail 초 더 */
async function run(f, k, max, tail) {
  return f.evaluate(async ({ k, max, tail }) => { const B = BgmBed._t, o = []; let n = 0, endT = null;
    lsPlay(k); const t0 = performance.now();
    await new Promise((res) => { const iv = setInterval(() => { const v = B.BED.cur, st = LP.q[LP.i], sc = EntryMusic._t.scene(); if (v && v.src && !v.__id) v.__id = ++n;
      const busy = !!(LP.q && LP.q.length && st && !LP.ended) || !!sc.run || !!sc.pend;
      o.push({ t: performance.now() - t0, i: LP.i, k: st && st.k, slug: st && st.slug, act: !!(st && st.act), talk: !!(st && (st.talk || st.said)), lead: !!LP.leadSt, rest: !!LP.entRest, who: B.BED.who, f: v && v.f, src: !!(v && v.src), want: v && v.want, id: v && v.__id || 0, g: v && v.g ? v.g.gain.value : null, relay: B.LPB.relay || 0, sc: !!sc.run, scx: sc.x, busy });
      if (!busy && endT == null && performance.now() - t0 > 3000) endT = performance.now();
      if ((endT != null && performance.now() - endT > tail) || performance.now() - t0 > max) { clearInterval(iv); res(); } }, 100); });
    const r = { o, need: null, DUR: Object.values(B.DUR || {}) }; try { lsStop(); } catch (x) {} return r; }, { k, max, tail }); }
/* 첫 입장 곡 소리 ~ 마지막 줄 끝 사이에 곡 소리가 0 인 순간(장면이 흐르는 동안은 장면 소리) */
const holes = (o) => { const i0 = o.findIndex((x) => (x.f === '@ENT' && x.src) || x.sc); const lastBusy = o.map((x) => x.busy).lastIndexOf(true); if (i0 < 0 || lastBusy < 0) return { i0, lastBusy, n: -1 };
  const h = o.slice(i0, lastBusy + 1).filter((x) => !x.sc && !(x.f === '@ENT' && x.src && x.g > 0.0002)); return { i0, lastBusy, n: h.length, first: h.slice(0, 3) }; };
try {
  const { ctx, pg, f, errs } = await open(390, true);
  /* R4 ② 넘긴 장면 + 고객 조작 */
  await f.evaluate((mu) => { S.mu = mu; _persist(); render(); EntryScene.SP.after = 6; }, MU('r5'));
  for (const how of ['move', 'play']) {
    await go(f, 'entry'); await wait(f, 900);
    const z = await f.evaluate(async (how) => { lsPlay('entry'); const t0 = performance.now(); let hand = false;
      await new Promise((res) => { const iv = setInterval(() => { const sc = EntryMusic._t.scene(); if (sc.hand && sc.run && LP.entRest) { hand = true; clearInterval(iv); res(); } if (performance.now() - t0 > 140000) { clearInterval(iv); res(); } }, 100); });
      if (how === 'move') mkGo('welcome'); else lsPlay('welcome');
      await new Promise((r) => setTimeout(r, 500)); const sc = EntryMusic._t.scene(); const r = { hand, run: !!sc.run, scHand: !!sc.hand }; try { lsStop(); } catch (e) {} return r; }, how);
    ok(`R4 ② 입장 장면이 받는 말로 넘어간 뒤(잦아드는 중) 고객이 ${how === 'move' ? '순간을 옮기면' : '다른 순간 ▶ 를 누르면'} — 장면까지 멈춘다`, z.hand && !z.run && !z.scHand, z);
  }
  /* R4 ② 안에서 넘겨줄 때는 장면이 끝까지 잦아든다(종전 그대로) */
  { await go(f, 'entry'); await wait(f, 900);
    const z = await f.evaluate(async () => { lsPlay('entry'); const t0 = performance.now(); let at = null, after = null;
      await new Promise((res) => { const iv = setInterval(() => { const sc = EntryMusic._t.scene(); if (at == null && sc.hand && sc.run && LP.entRest) at = performance.now(); if (at != null && after == null && performance.now() - at > 300) { after = { run: !!sc.run, rest: !!LP.entRest }; clearInterval(iv); res(); } if (performance.now() - t0 > 140000) { clearInterval(iv); res(); } }, 50); });
      try { lsStop(); } catch (e) {} return { at: at != null, after }; });
    ok('R4 ② 안에서 넘겨줄 때(lsRest)는 넘긴 장면이 그대로 잦아든다 · 받는 말이 이어진다', z.at && z.after && z.after.run && z.after.rest, z); }
  /* R4 ① 받는 중인 곡 카드 */
  for (const how of ['move', 'play']) {
    await go(f, 'welcome'); await wait(f, 900);
    const fk = await f.evaluate(() => { const b = document.querySelector('[data-fk^="bedp:M4:"]'); return b ? b.getAttribute('data-fk') : ''; }), cf = fk.split(':')[2];
    await f.evaluate((cf) => { delete BgmBed._t.BUF[cf]; }, cf); await pg.evaluate((cf) => { H.dly[cf] = 2500; }, cf);
    await f.click(`[data-fk="${fk}"]`); await wait(f, 400);
    const ld = await f.evaluate(() => ({ st: BgmBed._t.CARD ? BgmBed._t.CARD.st : null }));
    await f.evaluate((how) => { if (how === 'move') mkGo('free'); else lsPlay('welcome'); }, how);
    const o = await f.evaluate(async (cf) => { const B = BgmBed._t, o = []; await new Promise((res) => { const t0 = performance.now(), iv = setInterval(() => { const v = B.BED.cur; o.push({ who: B.BED.who, f: v && v.f, solo: !!(v && v.solo), src: !!(v && v.src) }); if (performance.now() - t0 > 4000) { clearInterval(iv); res(); } }, 100); }); try { lsStop(); } catch (e) {} return { card: o.filter((x) => x.who === 'card' || (x.f === cf && x.solo && x.src)).length }; }, cf);
    await pg.evaluate((cf) => { H.dly[cf] = null; }, cf);
    ok(`R4 ① 곡 카드(${cf})를 받는 중에 ${how === 'move' ? '순간을 옮기면' : '이 순간 전체 듣기를 시작하면'} — 늦게 온 카드 곡이 시작하지 않는다`, !!cf && o.card === 0, { fk, ld, o });
  }
  /* R4 ⑦ 안내 칸 빈 목록 */
  for (const k of ['guest', 'table']) {
    await f.evaluate(() => { const A = BgmBed._t.AV; A.st = ''; A.set = {}; }); await pg.evaluate(() => { window.__haveKeep = H.have; H.have = []; });
    await go(f, k === 'guest' ? 'welcome' : 'welcome'); await go(f, k); await wait(f, 900);
    const a = await f.evaluate(() => { const n = [...document.querySelectorAll('.bed-av')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()); const b = document.querySelector('.mu-ro ~ .bed-av [data-fk^="bedrelist:"], .bed-av [data-fk^="bedrelist:"]'); return { n, btn: !!b, ro: !!document.querySelector('.mu-ro') }; });
    await pg.evaluate(() => { H.have = window.__haveKeep; }); await f.evaluate(() => { const b = document.querySelector('.bed-av [data-fk^="bedrelist:"]'); if (b) b.click(); }); await wait(f, 900);
    const b = await f.evaluate(() => ({ n: document.querySelectorAll('.bed-av').length, ro: !!document.querySelector('.mu-ro') }));
    ok(`R4 ⑦ ${k === 'guest' ? '하객 맞이' : '테이블 인사'} 안내 칸 — 빈 목록이면 «곡 목록을 불러오지 못했어요 · 다시 불러오기» · 누르면 다시 묻고 한 줄이 걷힌다`, a.ro && a.btn && a.n.some((t) => /^곡 목록을 불러오지 못했어요 · 다시 불러오기$/.test(t)) && b.ro && b.n === 0, { a, b });
  }
  /* ★[DETAIL_R3_1101 ⑤] 축배 곡(M7)이 늦게 오면 — «위하여» 뒤 앞 곡을 축배 크기(0)로 올리지 않고 «음악을 불러오는 중이에요» */
  { await f.evaluate(() => { delete BgmBed._t.BUF.B28; }); await pg.evaluate(() => { H.dly.B28 = 60000; }); await go(f, 'toast');
    const r5 = await f.evaluate(async () => { const B = BgmBed._t, o = []; lsPlay('toast'); const t0 = performance.now();
      await new Promise((res) => { const iv = setInterval(() => { const v = B.BED.cur; o.push({ t: Math.round(performance.now() - t0), cheer: !!B.LPB.cheer, f: v && v.f, src: !!(v && v.src), want: v && v.want, note: B.LPB.note || '' }); if (performance.now() - t0 > 40000) { clearInterval(iv); res(); } }, 100); });
      try { lsStop(); } catch (x) {} return o; });
    await pg.evaluate(() => { H.dly.B28 = 40; });
    const ic = r5.findIndex((x) => x.cheer), aft = ic < 0 ? [] : r5.slice(ic, ic + 40).filter((x) => x.src);
    ok('R3 ⑤ 축배 곡이 아직 — «위하여» 뒤 앞 곡을 축배 크기로 올리지 않는다(−1 dB 아래) · «음악을 불러오는 중이에요»', ic > -1 && aft.every((x) => x.f !== 'B28' && x.want < -1) && r5.slice(ic).some((x) => x.note === '음악을 불러오는 중이에요'), { ic, aft: aft.slice(0, 3), notes: [...new Set(r5.map((x) => x.note))] }); }
  /* ★[DETAIL_R3_1101 ⑥ · DETAIL_R5_1101 규칙 6] 축사 «음악과 함께»(M4S5) 뒤 본식 곡(M4)으로 돌아오면 — 떠난 자리에서 잇는다(0초가 아니다) */
  { await f.evaluate(() => { S.freeWhat = 'speech'; S.on.free = 1; S.on.letter = 1; S.bgm = { S5: { m: 'bed' } }; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); });
    await go(f, 'free'); const m40 = await f.evaluate(() => BgmBed._t.eff('M4'));
    const o6 = await f.evaluate(async (m4) => { const B = BgmBed._t, o = []; let n = 0, jumped = false, s5t = null; LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(['free', 'letter'], true); _lFull(); const t0 = performance.now();
      await new Promise((res) => { const iv = setInterval(() => { const v = B.BED.cur, st = LP.q[LP.i]; if (v && v.src && !v.__id) v.__id = ++n;
        o.push({ t: performance.now() - t0, k: st && st.k, f: v && v.f, src: !!(v && v.src), id: v && v.__id || 0, off: v && v.off });
        if (!jumped && st && st.k === 'free' && v && v.src && v.f && v.f !== m4) { if (s5t == null) s5t = performance.now(); else if (performance.now() - s5t > 3000) { jumped = true; lsJump(1); } }   /* 축사 «음악과 함께» 곡이 3초 흐른 뒤 다음 순간(편지)으로 */
        if (performance.now() - t0 > 50000 || (jumped && performance.now() - s5t > 15000)) { clearInterval(iv); res(); } }, 100); });
      try { lsStop(); } catch (x) {} try { lsCloseBig(); } catch (x) {} return o; }, m40);
    const m4 = await f.evaluate(() => BgmBed._t.eff('M4')), ids = [...new Set(o6.filter((x) => x.src && x.f === m4).map((x) => x.id))], s5 = o6.some((x) => x.src && x.f !== m4 && x.k === 'free');
    const back = ids.length > 1 ? o6.find((x) => x.id === ids[ids.length - 1]) : null;
    ok('R3 ⑥ 축사 «음악과 함께» 곡 뒤 본식 곡으로 돌아오면 떠난 초부터(0초 아님)', s5 && !!back && back.off > 1, { m4, ids, back, s5, seq: [...new Set(o6.filter((x) => x.src).map((x) => x.k + ':' + x.f + ':' + x.id + ':' + Math.round(x.off || 0)))].slice(0, 24) }); }
  /* ★[DETAIL_R5_1101 규칙 6] 새로 듣기(처음부터)는 위치 0 — 앞 흐름의 «떠난 초»를 새 듣기에 들고 오지 않는다 */
  { const m4 = await f.evaluate(() => BgmBed._t.eff('M4')), kp = await f.evaluate((m4) => (BgmBed._t.LPB.keep || {})[m4] || 0, m4); await go(f, 'letter');
    const o7 = await trace(f, ['letter'], 9000, false), v1 = o7.find((x) => x.src && x.f === m4);
    ok('R5 규칙 6 새로 듣기 — 본식 곡은 처음(0초)부터 · 앞 흐름의 떠난 초를 이어 쓰지 않는다', !!v1 && v1.off < 1, { m4, kp, v1 }); }
  /* ★[DETAIL_R4_1101 ⑥] 크게 보기 «다음 걸음» — 닫기(뒤로가기)가 늦게 와도 새 걸음에 머문다(lsCloseBig 콜백) · 옛 30ms 뒤 opGoStep 은 옛 걸음으로 되돌아왔다 */
  { const runPat = async (code) => { await go(f, 'welcome'); await f.evaluate(() => { try { lsBig('welcome'); } catch (e) {} }); await wait(f, 700);
      return f.evaluate(async (code) => { const ob = history.back.bind(history); history.back = function () { setTimeout(ob, 300); };   /* 뒤로가기 응답이 늦은 폰 */
        const ev = [], og = window.opGoStep, onPop = () => ev.push('pop'); window.addEventListener('popstate', onPop); window.opGoStep = function () { ev.push('go'); return og.apply(this, arguments); };
        const big0 = !!(history.state && history.state.big); try { (0, eval)(code); } catch (e) {} await new Promise((r) => setTimeout(r, 1300)); history.back = ob; window.opGoStep = og; window.removeEventListener('popstate', onPop);
        try { lsStop(); } catch (e) {} return { big0, k: STEPS[idx] && STEPS[idx].k, big: !!LP.big, ev: ev.join(',') }; }, code); };
    const btn = await f.evaluate(() => { const h = document.body.innerHTML; return { cb: (h.match(/lsCloseBig\(function\(\)\{ opGoStep\(/g) || []).length, old: (h.match(/lsCloseBig\(\);setTimeout\(function\(\)\{ opGoStep/g) || []).length }; });
    const nw = await runPat("lsCloseBig(function(){ opGoStep('practice'); })"), od = await runPat("lsCloseBig();setTimeout(function(){ opGoStep('practice'); },30)");
    ok('R4 ⑥ 크게 보기 «다음 걸음» — 뒤로가기가 0.3초 늦어도 새 걸음(연습)에 머문다 · 뒤로가기가 끝난 뒤에 걸음을 옮긴다 · 크게 보기는 닫힘 · 화면 단추는 콜백 꼴(30ms 꼴 0)', nw.big0 && nw.k === 'practice' && !nw.big && /^pop,go/.test(nw.ev) && btn.old === 0 && /^go/.test(od.ev), { nw, od, btn }); }   /* 순서 = 뒤로가기(pop)가 끝난 뒤에 걸음을 옮긴다 · 옛 꼴은 go 가 먼저 */
  /* ★[DETAIL_R4_1101 ⑤ · ROW_FILL_PLAY_1101] 곡 카드 재생 시작이 실패하면 — ■ 로 남지 않고 ▶ 로 · «재생하지 못했어요 · 다시 눌러 주세요» */
  { await go(f, 'candle'); await wait(f, 600);
    const r5c = await f.evaluate(async () => { const P0 = AudioContext.prototype.createBufferSource; const b = document.querySelector('.ls-bed[data-seg="M2"] .mu-pl[data-fk^="bedp:M2:"]:not(.off)');
      if (!b) return { none: true }; const fk = b.getAttribute('data-fk'); AudioContext.prototype.createBufferSource = function () { throw new Error('시험 — 재생 실패'); };
      try { b.click(); await new Promise((r) => setTimeout(r, 1500)); } finally { AudioContext.prototype.createBufferSource = P0; }
      const t = BgmBed._t, u = document.getElementById('lsToast'), bb = document.querySelector('[data-fk="' + fk + '"]');
      return { fk, cf: t.CARD.f, st: t.CARD.st, who: t.BED.who, toast: u && !u.hidden ? u.textContent.trim() : '', pressed: bb && bb.getAttribute('aria-pressed') }; });
    ok('R4 ⑤ 곡 카드 재생 시작 실패 — ▶ 로 되돌림(CARD 비움 · aria-pressed false) · «재생하지 못했어요 · 다시 눌러 주세요»', !r5c.none && r5c.cf === '' && r5c.st === '' && r5c.who !== 'card' && r5c.pressed === 'false' && /재생하지 못했어요 · 다시 눌러 주세요/.test(r5c.toast), r5c); }
  ok('쪽 오류 0', !errs.length, errs.slice(0, 3));
  await ctx.close();
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); }
await br.close(); srv.close();
console.log(fail ? `DETAIL R4 FAIL ${fail}` : 'DETAIL R4 OK');
process.exit(fail ? 1 : 0);
