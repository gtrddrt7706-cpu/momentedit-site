#!/usr/bin/env node
/* ★★[DAYLONG_1101 2026-11-01 사장님 — 감사 인사 ~ 덕담(약 18분) · 닫는 인사 → 사진(약 15분)에 한 곡만 오래 반복된다]
   a 차례 — M4 = 고른 곡 → 나머지 · M6 = 고른 곡 → 나머지 → fill(B07 · B16) · 중복 없음 · fill 건너뛰기 · 앞 곡 잇기(CARRY_SAME) 그대로 · 고르기는 그대로(custK)
   b 고객 화면 — 고른 곡 줄 아래 한 줄 «고른 곡이 먼저 흐르고, 이어서 나머지 피아노 곡이 차례로 흘러요 · 약 N분»(M6 «사진 찍는 동안 다른 곡이 차례로 이어져요») ·
     N = 그 구간 큐 엔진 시간 합(고정 글 아님 · 순간을 빼면 줄어든다) · 고르지 않았으면 줄 없음
   c 당일 콘솔 — M4 · M6 재생 목록 = 고른 곡 + 나머지(+ fill) · 끝 3초 전 다음 곡 · 축사 «음악과 함께» 뒤 M4 는 다음 곡부터(처음으로 돌아가지 않음)
   d 미리 듣기 — 그 순간만 들으면 고른 곡 그대로 · 이어 듣기에서 곡이 끝나면 3초 겹쳐 목록의 다음 곡 · 다음 줄도 그 곡
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
const HAVE = ['B01', 'B07', 'B09', 'B10', 'B12', 'B13', 'B15', 'B16', 'B17', 'B24', 'B28'];   /* 화촉 1 · 2(B05 · B31)는 없다 — d */   /* [BGM_TIMING_1101] 테이블 인사 곡(B23)도 — 축배 뜸 곡 e */
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
const P = require(PICKSF || path.join(ROOT, 'assets/bgm-picks.js')), SL = require(path.join(ROOT, 'assets/bgm-slots.js'));
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
try {
  /* a 데이터 */
  { ok('a M4 · M6 는 고르는 칸 그대로(custK) · 이어 트는 목록(loopy)', P.custK({ bgm: { M4: { k: 'B11' } } }, 'M4') === 'B11' && P.custK({ bgm: { M6: { k: 'B34' } } }, 'M6') === 'B34' && typeof P.loopy === 'function' && P.loopy('M4') && P.loopy('M6') && !P.loopy('M2') && !P.loopy('M4S5'));
    const a = P.order({ bgm: { M4: { k: 'B11' } } }, 'M4'), b = P.order({ bgm: { M6: { k: 'B34' } } }, 'M6'), c = P.order({ bgm: { M2: { k: 'B07' } } }, 'M6'), d = P.order({}, 'M6', 'B19');
    ok('a M4 = 고른 곡(B11) → 나머지(B09 · B10) · fill 없음', a.join() === 'B11,B09,B10', a);
    ok('a M6 = 고른 곡(B34) → 나머지 → fill(B07 · B16) · 화촉에서 고른 B07 은 건너뜀 · 앞 곡(B19) 잇기는 맨 앞', b.join() === 'B34,B17,B19,B07,B16' && c.join() === 'B17,B34,B19,B16' && d.join() === 'B19,B17,B34,B07,B16', { b, c, d });
    ok('a 축사 · 편지 «음악과 함께»(M4S5 · M4S6)는 한 곡 칸 그대로', P.order({}, 'M4S5').join() === 'B13,B14,B12' && !(P.FILL.M4S5 || P.FILL.M4S6)); }
  /* b 고객 화면 · d 미리 듣기 */
  for (const W of [390, 1280]) {
    const { ctx, pg, f, errs } = await open(W, true);
    await f.evaluate(() => { const L = BgmBed._t.LOPEN; if (L) L.M1 = L.M8 = true; });   /* [LIST_FOLD_1102] 아래 검사는 펼친 목록을 본다 · 접힘은 bgm-fill LIST_FOLD 가 본다 */
    await f.waitForFunction(() => !!(window.ENG && ENG.RitualCue), null, { timeout: 15000 }).catch(() => {});
    await setX(f, { bgm: {} }); await go(f, 'welcome'); let r = await LN(f, 'M4');
    ok(`${W} b 감사 인사 — 고르지 않았으면 한 줄 없음`, r.t === '' && !r.fold, r);
    await f.click('[data-fk="bed:M4:B11"]'); await wait(f, 500); r = await LN(f, 'M4');
    let Sx = await f.evaluate(() => JSON.parse(JSON.stringify(S))), n4 = minNode(Sx, K4);
    ok(`${W} b 감사 인사 B11 을 고르면 접힌 줄 아래 «고른 곡이 먼저 흐르고, 이어서 나머지 피아노 곡이 차례로 흘러요 · 약 ${n4}분»(12.5px · 큐 시간 합)`, r.fold && r.t === `고른 곡이 먼저 흐르고, 이어서 나머지 피아노 곡이 차례로 흘러요 · 약 ${n4}분` && r.fs === '12.5px', { r, n4 });
    await setX(f, { on: { letter: 0, bless: 0, free: 0 }, bgm: { M4: { k: 'B11' } } }); await go(f, 'welcome'); r = await LN(f, 'M4'); Sx = await f.evaluate(() => JSON.parse(JSON.stringify(S))); const n4b = minNode(Sx, K4);
    ok(`${W} b 순간을 빼면 분이 줄어든다(고정 글 아님) — 약 ${n4b}분 < ${n4}분`, n4b < n4 && r.t.endsWith(`약 ${n4b}분`), { r: r.t, n4b, n4 });
    await setX(f, { on: { letter: 1, bless: 1, free: 1 }, bgm: { M6: { k: 'B34' } } }); await go(f, '_close'); r = await LN(f, 'M6'); Sx = await f.evaluate(() => JSON.parse(JSON.stringify(S))); const n6 = minNode(Sx, K6);
    ok(`${W} b 닫는 인사 B34 — «고른 곡이 먼저 흐르고, 사진 찍는 동안 다른 곡이 차례로 이어져요 · 약 ${n6}분»`, r.fold && r.t === `고른 곡이 먼저 흐르고, 사진 찍는 동안 다른 곡이 차례로 이어져요 · 약 ${n6}분` && n6 >= 10, { r, n6 });
    await shot(f, W, 'daylong-close', '.ls-bed[data-seg="M6"]');
    if (W === 390) {
      /* d 미리 듣기 — 곡 9초(시험) · 감사 인사 B10 */
      await setX(f, { on: { welcome: 1, vow: 1 }, bgm: { M4: { k: 'B10' } } }); await go(f, 'welcome');
      const run = (ks, ms) => f.evaluate(async ({ ks, ms }) => { const BB = BgmBed._t, o = []; if (!window.__lpMs0) window.__lpMs0 = window._lpMs; window._lpMs = function () { return 2500; }; BB.LPB.relay = 0;
        if (ks.length > 1) { LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(ks, true); _lFull(); } else lsPlay(ks[0]);
        (LP.q || []).forEach((x) => { if (x.talk || x.talk2 || x.said || x.act || x.quiet) x.ms = 2500; });
        const t0 = performance.now(); await new Promise((res) => { const iv = setInterval(() => { const v = BB.BED.cur, st = LP.q[LP.i]; o.push({ t: performance.now() - t0, k: st && st.k, i: LP.i, f: v && v.f, src: !!(v && v.src), want: v && v.want });
          if (performance.now() - t0 > ms || !LP.q.length) { clearInterval(iv); res(); } }, 100); });
        const rl = BB.LPB.relay || 0; try { lsStop(); } catch (x) {} try { if (ks.length > 1) lsCloseBig(); } catch (x) {} window._lpMs = window.__lpMs0; return { o, rl }; }, { ks, ms });
      const one = await run(['welcome'], 14000), fs1 = [...new Set(one.o.filter((x) => x.src && x.want > -60).map((x) => x.f))];
      ok('d 감사 인사만 듣기 — 곡이 끝나도 고른 곡(B10) 그대로(다른 곡 0 · 같은 곡 처음으로 잇기는 DETAIL_R1 ⑧)', fs1.join() === 'B10', { rl: one.rl, fs1 });
      const two = await run(['welcome', 'vow'], 22000), lv = two.o.filter((x) => x.src && x.want > -60), fs2 = [...new Set(lv.map((x) => x.f))], iN = lv.findIndex((x) => x.f === 'B09'), after = []; if (iN > -1) for (const x of lv.slice(iN)) { if (x.f !== 'B09') break; after.push(x); }   /* 9초 곡이라 B09 도 곧 다음 곡으로 넘어간다 — 넘어가기 전까지 */
      ok('d 이어 듣기(감사 인사 → 서약) — 곡이 끝나면 3초 겹쳐 목록의 다음 곡(B09) · 그 뒤 줄도 B09(고른 곡으로 되돌아가지 않음)', two.rl >= 1 && fs2[0] === 'B10' && iN > -1 && after.length > 10 && new Set(after.map((x) => x.i)).size > 1 && !lv.slice(iN).some((x) => x.f === 'B10' && lv.slice(iN).findIndex((y) => y.f !== 'B09') < 0), { rl: two.rl, fs2, after: after.length, lines: [...new Set(after.map((x) => x.i))] }); }
    ok(`${W} 쪽 오류 0`, !errs.length, errs.slice(0, 3));
    await ctx.close();
  }
  /* c 당일 콘솔 */
  const con = async (S0, rows, sec) => { const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }), errs = [], pg = await ctx.newPage(); pg.on('pageerror', (e) => errs.push(e.message));
    await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; window.__bgmLog = []; });
    await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: '{"ok":true}' })));
    await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S0)).toString('base64'))}`); await pg.waitForTimeout(900);
    const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'daylong-'));
    for (const [sg, n, hz] of rows) { const p = path.join(TMP, sg + n + '.wav'); fs.writeFileSync(p, wav(sec, hz)); await pg.setInputFiles(`.sg[data-seg="${sg}"] .sg-song:nth-of-type(${n}) [data-seg-file]`, p, { timeout: 4000 }); }
    await pg.waitForTimeout(1200); await pg.click('#go'); await pg.waitForTimeout(700); const Rq = await pg.evaluate(() => window.__bgmR()); return { ctx, pg, errs, Rq }; };
  const base = (on, bgm) => { const S0 = O.applyExample({ course: 'open' }, 'standard'); S0.course = 'open'; S0.freeWhat = 'speech'; S0.on = Object.assign({}, S0.on, on); S0.bgm = bgm; return S0; };
  { const S0 = base({ welcome: 1, vow: 1, free: 1, letter: 1, song: 0 }, { M4: { k: 'B11' }, M6: { k: 'B34' } });
    const c = await con(S0, [['M4', 1, 300], ['M4', 2, 350], ['M4', 3, 400], ['M6', 1, 500], ['M6', 2, 550], ['M6', 3, 600], ['M6', 4, 650], ['M6', 5, 700]], 9);
    const pl = await c.pg.evaluate(() => ({ m4: window.__segPlan('M4'), m6: window.__segPlan('M6'), s4: window.__segSel('M4') }));
    ok('c 콘솔 M4 재생 목록 = B11 → B09 → B10 · M6 = B34 → B17 → B19 → B07 → B16(배경 곡 줄) · 고른 곡은 하나(설정 화면 칩)', (pl.m4 || []).join() === 'B11,B09,B10' && (pl.m6 || []).join() === 'B34,B17,B19,B07,B16' && pl.s4 === 'B11', pl);
    const iW = c.Rq.findIndex((x) => x.k === 'welcome' && !/^bridge-/.test(x.slug || '')); await c.pg.evaluate((i) => window.__bgmGo.fire(i), iW); await c.pg.waitForTimeout(1500); const a1 = await c.pg.evaluate(() => window.__seg.st()); await c.pg.waitForTimeout(6500); const a2 = await c.pg.evaluate(() => window.__seg.st());
    ok('c 콘솔 감사 인사 — 고른 곡(B11)부터 · 끝 3초 전 목록의 다음 곡(B09)으로', a1.seg === 'M4' && a1.id === 'B11' && a2.seg === 'M4' && a2.id === 'B09' && a2.li === 1, { a1: [a1.seg, a1.id, a1.li], a2: [a2.seg, a2.id, a2.li] });
    ok('c 콘솔 오류 0', !c.errs.length, c.errs.slice(0, 2)); await c.ctx.close(); }
  { const S0 = base({ welcome: 1, vow: 1, free: 1, letter: 1, song: 0, tribute: 0 }, { M4: { k: 'B11' }, S5: { m: 'bed' } });
    const c = await con(S0, [['M4', 1, 300], ['M4', 2, 350], ['M4', 3, 400], ['M4S5', 1, 500]], 60);
    const iW = c.Rq.findIndex((x) => x.k === 'welcome' && !/^bridge-/.test(x.slug || '')), iF = c.Rq.findIndex((x) => x.slug === 'narr-free-in-speech'), iL = c.Rq.findIndex((x) => /^letter-/.test(x.slug || ''));
    if (iW < 0 || iF < iW || iL < iF) ok('c 콘솔 시험 조건', false, { iW, iF, iL });
    else { await c.pg.evaluate((i) => window.__bgmGo.fire(i), iW); await c.pg.waitForTimeout(1200); const b0 = await c.pg.evaluate(() => window.__seg.st());
      await c.pg.evaluate((i) => window.__bgmGo.fire(i), iF); await c.pg.waitForTimeout(800); await c.pg.evaluate(() => window.__bgmGo.tap()); await c.pg.waitForTimeout(1200); const b1 = await c.pg.evaluate(() => window.__seg.st());
      await c.pg.evaluate((i) => window.__bgmGo.fire(i), iL); await c.pg.waitForTimeout(1500); const b2 = await c.pg.evaluate(() => window.__seg.st());
      ok('c 콘솔 축사 «음악과 함께»(M4S5 한 곡) 뒤 감사 인사로 돌아오면 멈춘 곡(B11)의 멈춘 초부터 — 처음 0초로 돌아가지 않는다(DETAIL_R3_1101 ⑥ · DETAIL_R5_1101 규칙 6)', b0.seg === 'M4' && b0.id === 'B11' && b1.seg === 'M4S5' && b1.res === 'M4' && b2.seg === 'M4' && b2.id === 'B11' && b2.li === 0 && b2.t >= b0.t + 0.5, { b0: [b0.seg, b0.id], b1: [b1.seg, b1.id, b1.res], b2: [b2.seg, b2.id, b2.li, b2.list, b0.t, b2.t] }); }
    ok('c 콘솔 오류 0 (2)', !c.errs.length, c.errs.slice(0, 2)); await c.ctx.close(); }
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 500)); }
await br.close(); srv.close();
console.log(fail ? `DAYLONG FAIL ${fail}` : 'DAYLONG OK');
process.exit(fail ? 1 : 0);
