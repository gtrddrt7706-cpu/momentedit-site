#!/usr/bin/env node
/* ★[PICKS_THREE_1101 2026-11-01 사장님 «구간마다 노래를 3개로 추리고 너무 힙한 건 공감 못 하니 빼자» · GPT 확인 «없음»] 구간마다 3곡
   a 목록 = 구간마다 3곡 · 정한 순서 그대로 · 뺀 7곡(B02 · B03 · B04 · B06 · B18 · B21 · B25)은 어느 목록에도 없다 · SONGS 데이터는 남는다
   b 1순위 보컬 금지(축배 M7 만 예외) 그대로
   c 고객 화면(390 · 1280) — 구간 곡 줄이 3줄 · 그 순서 · 뺀 곡 0 · 펼치고 접기
   d 예전에 뺀 곡을 골라 둔 저장값(k='B03' 등) → «고르지 않음 = 1순위» · 오류 0(고객 화면 · 당일 콘솔)
   e 당일 콘솔 «구간 음악» 기본 목록도 같은 3곡 · 뺀 곡 0
   BP_PICKS · BP_BED · BP_OP · BP_CON = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
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
const HAVE = ['B01', 'B02', 'B04', 'B05', 'B06', 'B09', 'B10', 'B12', 'B13', 'B15', 'B17', 'B21', 'B23', 'B28'];   /* [BGM_TIMING_1101] 테이블 인사 곡(B23)도 — 축배 뜸 곡 e */
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

const go = async (f, k) => { await f.evaluate((k) => mkGo(k), k); await wait(f, 700); };
const WANT = { M1: ['B01', 'B24', 'B13'], M2: ['B05', 'B07', 'B30'], M4: ['B09', 'B10', 'B11'], M4S5: ['B13', 'B14', 'B12'], M4S6: ['B10', 'B12', 'B14'], M5: ['B15', 'B11', 'B16'], M6: ['B17', 'B19', 'B20'], M7: ['B28', 'B29', 'B22'], M8: ['B24', 'B23', 'B16'], M8L: ['B11', 'B27', 'B26'] };
const GONE = ['B02', 'B03', 'B04', 'B06', 'B18', 'B21', 'B25'];
const P = require(PICKSF || path.join(ROOT, 'assets/bgm-picks.js'));
try {
  /* a · b 데이터 */
  { const bad = Object.keys(WANT).filter((k) => JSON.stringify(P.PICKS[k]) !== JSON.stringify(WANT[k])), all = [].concat(...Object.values(P.PICKS));
    ok('a 구간마다 3곡 · 정한 순서 그대로(M1 · M2 · M4 · M4S5 · M4S6 · M5 · M6 · M7 · M8 · M8L)', !bad.length && Object.keys(P.PICKS).every((k) => k === 'M6P' || P.PICKS[k].length === 3), { bad: bad.map((k) => [k, P.PICKS[k]]) });
    ok('a 뺀 7곡은 어느 목록에도 없다 · 곡 데이터(SONGS)는 남는다', !GONE.some((f) => all.includes(f)) && GONE.every((f) => P.SONGS[f] && P.SONGS[f].t), GONE.filter((f) => all.includes(f) || !P.SONGS[f]));
    const v1 = Object.keys(P.PICKS).filter((k) => k !== 'M7' && P.PICKS[k][0] && P.song(P.PICKS[k][0]).vocal);
    ok('b 1순위는 노래 곡이 아니다(축배 M7 만 예외)', !v1.length, v1);
    const old = { M1: { k: 'B03' }, M2: { k: 'B06' }, M8: { k: 'B25' }, M8L: { k: 'B25' }, S5: { m: 'bed', k: 'B02' }, M7: { k: 'B21' } }, S = { bgm: old };
    const ck = ['M1', 'M2', 'M8', 'M4S5', 'M7'].map((sg) => [sg, P.custK(S, sg)]);
    ok('d 예전에 뺀 곡을 골라 둔 저장값 → custK «고르지 않음»(1순위로 준비)', ck.every((x) => x[1] === ''), ck); }
  /* c · d 고객 화면 */
  for (const W of [390, 1280]) {
    const { ctx, pg, f, errs } = await open(W, true);
    await f.evaluate(() => { S.freeWhat = 'speech'; S.bgm = { S5: { m: 'bed' }, S6: { m: 'bed' } }; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); });
    const seen = {}, gone = [], fold = [];
    for (const k of ['guest', 'candle', 'welcome', 'free', 'letter', 'tribute', 'toast', 'table']) { await go(f, k);
      await f.evaluate(() => { document.querySelectorAll('.ls-bed .mu-chg[aria-expanded="false"]').forEach((b) => b.click()); }); await wait(f, 250);
      const r = await f.evaluate(() => [...document.querySelectorAll('.ls-bed[data-seg], .bed-sub[data-seg]')].map((b) => ({ sg: b.getAttribute('data-seg'), fs: [...b.querySelectorAll('.mu-pick')].map((x) => (/^bed:[^:]+:(.+)$/.exec(x.getAttribute('data-fk') || '') || [])[1]), txt: b.textContent })));
      r.forEach((x) => { if (x.fs.length) seen[x.sg] = x.fs; });
      const pk = await f.evaluate(() => { const b = document.querySelector('.ls-bed .mu-pick'); if (b) b.click(); return !!b; }); await wait(f, 300);
      if (pk) fold.push(await f.evaluate(() => { const b = document.querySelector('.ls-bed'); return { rows: b.querySelectorAll('.mu-pick').length, fsel: !!b.querySelector('.mu-fsel'), h: Math.round(b.getBoundingClientRect().height) }; })); }
    const txt = await f.evaluate(() => document.body.textContent);
    GONE.forEach((g) => { const t = P.SONGS[g].t; if (txt.indexOf(t) > -1) gone.push(t); });
    const bad = Object.keys(seen).filter((sg) => WANT[sg] && JSON.stringify(seen[sg]) !== JSON.stringify(WANT[sg]));
    ok(`${W} c 고객 화면 구간 곡 줄 = 3줄 · 정한 순서(${Object.keys(seen).join(' · ')}) · 뺀 곡 0`, Object.keys(seen).length >= 7 && !bad.length && Object.values(seen).every((x) => x.length === 3) && !gone.length, { bad: bad.map((sg) => [sg, seen[sg]]), gone });
    ok(`${W} c 고르면 한 줄로 접힌다(곡 줄 0 · 접힌 줄 1)`, fold.length >= 4 && fold.every((x) => x.rows === 0 && x.fsel), fold);
    /* d 옛 저장값 */
    await f.evaluate(() => { S.bgm = { M1: { k: 'B03' }, M2: { k: 'B06' }, M8: { k: 'B25' }, S5: { m: 'bed', k: 'B02' }, M7: { k: 'B21' } }; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); });
    const dd = [];
    for (const [k, sg, first] of [['guest', 'M1', 'B01'], ['candle', 'M2', 'B05'], ['table', 'M8', 'B24'], ['free', 'M4S5', 'B13'], ['toast', 'M7', 'B28']]) { await go(f, k);
      dd.push(await f.evaluate(({ sg, first }) => { const t = BgmBed._t, box = document.querySelector('.ls-bed[data-seg="' + sg + '"], .bed-sub[data-seg="' + sg + '"]'); return { sg, eff: t.eff(sg), first, on: box ? [...box.querySelectorAll('.mu-pick[aria-checked="true"]')].length : -1 }; }, { sg, first })); }
    ok(`${W} d 뺀 곡을 골라 둔 옛 저장값 → 1순위로 깔고(eff) · 눌린 곡 줄 없음 · 오류 0`, dd.every((x) => x.eff === x.first && x.on <= 0) && !errs.length, { dd, errs: errs.slice(0, 2) });
    ok(`${W} 쪽 오류 0`, !errs.length, errs.slice(0, 3));
    await ctx.close();
  }
  /* d · e 당일 콘솔 */
  { const S0 = O.applyExample({ course: 'open' }, 'standard'); S0.course = 'open'; S0.freeWhat = 'speech'; S0.bgm = { M1: { k: 'B03' }, M2: { k: 'B06' }, M8: { k: 'B25' }, S5: { m: 'bed', k: 'B02' }, S6: { m: 'bed' }, M7: { k: 'B21' } };
    const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }), errs = [], pg = await ctx.newPage(); pg.on('pageerror', (e) => errs.push(e.message));
    await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; });
    await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: '{"ok":true}' })));
    await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S0)).toString('base64'))}`); await pg.waitForTimeout(1200);
    const R = await pg.evaluate((W) => { const o = {}; Object.keys(W).forEach((sg) => { const b = document.querySelector('.sg[data-seg="' + sg + '"]'); o[sg] = b ? [...b.querySelectorAll('.sg-song')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()) : null; }); return { o, txt: (document.querySelector('#sgList, .sg-list, body') || document.body).textContent }; }, WANT);
    const bad = Object.keys(WANT).filter((sg) => R.o[sg] && !(R.o[sg].length === 3 && WANT[sg].every((f, i) => R.o[sg][i] && R.o[sg][i].indexOf(P.SONGS[f].t) > -1)));
    const goneC = GONE.map((g) => P.SONGS[g].t).filter((t) => [].concat(...Object.values(R.o).filter(Boolean)).some((x) => x.indexOf(t) > -1));
    ok('e 당일 콘솔 «구간 음악» 기본 목록 = 같은 3곡 · 뺀 곡 0 · 옛 저장값(뺀 곡) 오류 0', Object.values(R.o).filter(Boolean).length >= 8 && !bad.length && !goneC.length && !errs.length, { bad: bad.map((sg) => [sg, R.o[sg]]), goneC, errs: errs.slice(0, 2), segs: Object.keys(R.o).filter((k) => R.o[k]) });
    await ctx.close(); }
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 500)); }
await br.close(); srv.close();
console.log(fail ? `PICKS THREE FAIL ${fail}` : 'PICKS THREE OK');
process.exit(fail ? 1 : 0);
