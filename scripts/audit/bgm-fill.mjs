#!/usr/bin/env node
/* ★[BGM_FILL_1101 · GHIBLI_ADD_1101 2026-11-01 사장님 «하객 맞이 음악은 계속 흐르는 건가? 한 곡만으로는 힘들지 않아?» · «그걸 고객 화면에 잘 표현하고 이해시켜야지» · «지브리 음악은 좀 더 추가했으면 좋겠어»]
   a 차례(BgmPicks.order) — M1 · M8 = 고른 곡(없으면 1순위) → 나머지 → fill(B16 · B33 / B13 · B14) · 5곡 · 중복 없음 · fill 이 다른 구간에서 고른 곡이면 건너뜀 · 지브리 4곡 데이터
   b 같은 곡 두 구간 — dupSeg(뒤 구간 → 앞 구간)
   c 고객 화면(390 · 1280) — M1 · M8 곡 칸 아래 두 줄(«고른 곡부터 약 30분 동안 차례로 이어 흘러요» · 차례 = order · 고른 곡 굵게 · 곡 이름 단위 nowrap) · 고르면 다시 그려짐 · 다른 구간 0 · 곡 줄은 3줄 그대로
       같은 곡을 화촉 · 부모님께 인사에서 고르면 부모님께 인사 칸에 «화촉에서도 고른 곡이에요» · fill 건너뛰기가 순서 줄에 보인다
   d 파일이 아직 없을 때 — 미리 듣기는 그 구간 목록에서 파일이 있는 다음 곡을 깐다 · 곡 이름은 그대로 · 곡 카드 ▶ 는 «곡을 준비하고 있어요»
   e 당일 콘솔 — M1 · M8 차례 = 식순 화면 순서 줄과 같다 · 한 곡 칸은 고른 곡 파일이 없으면 다음 곡 파일
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

const SHOT = process.env.SHOT || '';
const shot = async (f, W, n, sel) => { if (!SHOT) return; try { fs.mkdirSync(SHOT, { recursive: true }); await f.locator(sel).first().screenshot({ path: path.join(SHOT, `fill-${W}-${n}.png`) }); } catch {} };
const go = async (f, k) => { await f.evaluate((k) => mkGo(k), k); await wait(f, 700); };
const P = require(PICKSF || path.join(ROOT, 'assets/bgm-picks.js'));
const setS = (f, bgm) => f.evaluate((b) => { S.freeWhat = 'speech'; S.bgm = b; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); }, bgm);
const look = (f, sg) => f.evaluate((sg) => { const b = document.querySelector('.ls-bed[data-seg="' + sg + '"], .bed-sub[data-seg="' + sg + '"]'); if (!b) return null;
  const fl = [...b.querySelectorAll('.bed-flow')], od = b.querySelector('.bed-ord'), nw = od ? [...od.querySelectorAll('.nw')] : [];
  return { flow: fl.map((x) => x.textContent.trim()), ord: od ? od.getAttribute('data-ord') : '', bold: od ? [...od.querySelectorAll('b')].map((x) => x.textContent) : [], nwOne: nw.every((x) => x.getClientRects().length === 1),
    rows: b.querySelectorAll('.mu-pick').length, fold: !!b.querySelector('.mu-fsel'), ft: ((b.querySelector('.mu-fsel .mu-t') || {}).textContent || ''), dup: ((b.querySelector('.bed-dup') || {}).textContent || '').trim(),
    fs: getComputedStyle(fl[0] || b).fontSize, ordLines: od ? Math.round(od.getBoundingClientRect().height / (parseFloat(getComputedStyle(od).lineHeight) || 18)) : 0 }; }, sg);
try {
  /* a · b 데이터 */
  { const o0 = P.order({}, 'M1'), o1 = P.order({ bgm: { M1: { k: 'B13' } } }, 'M1'), o2 = P.order({ bgm: { M5: { k: 'B16' } } }, 'M1'), o3 = P.order({}, 'M8'), o4 = P.order({ bgm: { S5: { m: 'bed', k: 'B13' } } }, 'M8');
    ok('a M1 차례 = 1순위 → 나머지 → fill(B16 · B33) · 5곡 · 중복 없음', o0.join() === 'B01,B24,B13,B16,B33', o0);
    ok('a 고른 곡이 맨 앞(M1 B13 → B13 · B01 · B24 · B16 · B33)', o1.join() === 'B13,B01,B24,B16,B33', o1);
    ok('a fill 이 다른 구간에서 고른 곡이면 건너뜀(부모님께 인사 B16 → M1 은 B33 만)', o2.join() === 'B01,B24,B13,B33', o2);
    ok('a M8 = B24 · B23 · B16 · B13 · B14 · 축사 «음악과 함께» B13 을 고르면 B13 건너뜀', o3.join() === 'B24,B23,B16,B13,B14' && o4.join() === 'B24,B23,B16,B14', { o3, o4 });
    ok('a 한 곡 구간 차례 = 목록(화촉 B05 · B31 · B07) · fill 없음', P.order({}, 'M2').join() === 'B05,B31,B07' && !P.FILL.M2);
    const g = ['B31', 'B32', 'B33', 'B34'].map((f) => P.SONGS[f] && [f, P.SONGS[f].t, P.SONGS[f].a, P.SONGS[f].src].join('|'));
    ok('a 지브리 4곡 — 언제나 몇 번이라도 · 너를 태우고(Elizabeth Bright) · 바람이 지나가는 길 · 산책(Kazumi Tateishi Trio)', g.join(' / ') === 'B31|언제나 몇 번이라도|Elizabeth Bright|센과 치히로의 행방불명 / B32|너를 태우고|Elizabeth Bright|천공의 성 라퓨타 / B33|바람이 지나가는 길|Kazumi Tateishi Trio|이웃집 토토로 / B34|산책|Kazumi Tateishi Trio|이웃집 토토로', g);
    const d = { bgm: { M2: { k: 'B31' }, M5: { k: 'B31' } } };
    ok('b 같은 곡 두 구간 — 뒤 구간(부모님께 인사) → 앞 구간(화촉) · 앞 구간은 없음', P.dupSeg(d, 'M5') === 'M2' && P.dupSeg(d, 'M2') === '' && P.dupSeg({}, 'M5') === ''); }
  /* c · d 고객 화면 */
  for (const W of [390, 1280]) {
    const { ctx, pg, f, errs } = await open(W, true);
    await setS(f, {});
    await go(f, 'guest'); let r = await look(f, 'M1');
    ok(`${W} c 하객 맞이 — 곡 줄 3 · 아래 두 줄 · 차례 = order(1순위부터 · 굵은 곡 없음) · 12.5px`, r && r.rows === 3 && r.flow.length === 2 && r.flow[0] === '고른 곡부터 약 30분 동안 차례로 이어 흘러요' && r.ord === 'B01 B24 B13 B16 B33' && !r.bold.length && r.fs === '12.5px'
      && r.flow[1] === '바다가 보이는 마을 → Take Me Home, Country Roads → Moon River → The Rose → 바람이 지나가는 길', r);
    ok(`${W} c 곡 이름 중간에서 줄이 안 끊긴다(곡 이름 단위 nowrap) · ${W === 390 ? '두 줄까지' : '한두 줄'}`, r && r.nwOne && r.ordLines <= (W === 390 ? 3 : 2), { nwOne: r && r.nwOne, lines: r && r.ordLines });
    await f.click('[data-fk="bed:M1:B13"]'); await wait(f, 500); r = await look(f, 'M1');
    ok(`${W} c 고르면 접힌 줄 바로 아래 두 줄이 다시 그려진다(B13 맨 앞 · 굵게)`, r && r.fold && r.rows === 0 && r.ord === 'B13 B01 B24 B16 B33' && r.bold.join() === 'Moon River' && r.flow.length === 2, r);
    await go(f, 'table'); r = await look(f, 'M8');
    ok(`${W} c 테이블 인사 — 두 줄 · 차례 B24 · B23 · B16 · B13 · B14(하객 맞이에서 B13 을 골라도 M8 fill 의 B13 은 건너뜀)`, r && r.rows === 3 && r.flow.length === 2 && r.ord === 'B24 B23 B16 B14', r);
    const others = [];
    for (const [k, sg] of [['candle', 'M2'], ['welcome', 'M4'], ['tribute', 'M5'], ['_close', 'M6'], ['toast', 'M7']]) { await go(f, k); const x = await look(f, sg); others.push([sg, x ? x.flow.length : -1, x ? x.rows : -1]); }
    ok(`${W} c 다른 구간(화촉 · 감사 인사 · 부모님께 인사 · 닫는 인사 · 축배)에는 순서 줄 0 · 곡 줄 3`, others.every((x) => x[1] === 0 && x[2] === 3), others);
    /* 겹침 한 줄 + fill 건너뛰기가 순서 줄에 */
    await go(f, 'candle'); await f.click('[data-fk="bed:M2:B31"]'); await wait(f, 400); const c2 = await look(f, 'M2');
    await go(f, 'tribute'); await f.click('[data-fk="bed:M5:B31"]'); await wait(f, 400); const c5 = await look(f, 'M5');
    ok(`${W} c 같은 곡을 화촉 · 부모님께 인사에서 고르면 뒤 칸에만 «화촉에서도 고른 곡이에요»(막지 않는다)`, c2 && c2.dup === '' && c5 && c5.fold && c5.dup === '화촉에서도 고른 곡이에요', { c2: c2 && c2.dup, c5 });
    await f.evaluate(() => { const b = document.querySelector('.ls-bed[data-seg="M5"] .mu-chg'); if (b) b.click(); }); await wait(f, 300); await f.click('[data-fk="bed:M5:B16"]'); await wait(f, 400);
    await go(f, 'guest'); r = await look(f, 'M1');
    ok(`${W} c 부모님께 인사에서 B16 을 고르면 하객 맞이 순서 줄에서 The Rose 가 빠진다`, r && r.ord === 'B13 B01 B24 B33' && !/The Rose/.test(r.flow[1]), r);
    await shot(f, W, 'guest-flow', '.ls-bed[data-seg="M1"]');
    /* d 파일이 없을 때 — 화촉 1 · 2(B05 · B31)는 드라이브에 없다 */
    await setS(f, { M2: { k: 'B31' } }); await go(f, 'candle'); await wait(f, 600);
    const d1 = await f.evaluate(() => ({ at: BgmBed._t.songAt ? BgmBed._t.songAt('candle') : '', ft: ((document.querySelector('.ls-bed[data-seg="M2"] .mu-fsel .mu-t') || {}).textContent || '') }));
    await setS(f, {}); await go(f, 'candle'); await wait(f, 400); const d0 = await f.evaluate(() => BgmBed._t.songAt ? BgmBed._t.songAt('candle') : '');
    ok(`${W} d 고른 곡(B31) · 1순위(B05) 파일이 없으면 화촉 목록에서 파일이 있는 다음 곡(B07)을 깐다 · 접힌 줄은 원래 곡 이름`, d1.at === 'B07' && d0 === 'B07' && d1.ft === '언제나 몇 번이라도', { d1, d0 });
    await f.evaluate(() => document.querySelector('[data-fk="bedp:M2:B05"]').click()); await wait(f, 500);   /* 흐린 ▶(aria-disabled)도 누르면 알림 한 줄 */
    const tt = await f.evaluate(() => [...document.querySelectorAll('body *')].filter((x) => x.children.length === 0 && /곡을 준비하고 있어요/.test(x.textContent)).length);
    ok(`${W} d 파일이 없는 곡 ▶ — «곡을 준비하고 있어요»`, tt > 0, tt);
    ok(`${W} 쪽 오류 0`, !errs.length, errs.slice(0, 3));
    await ctx.close();
  }
  /* e 당일 콘솔 */
  { const S0 = O.applyExample({ course: 'open' }, 'standard'); S0.course = 'open'; S0.freeWhat = 'speech'; S0.bgm = { M1: { k: 'B13' }, M5: { k: 'B16' } };
    const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }), errs = [], pg = await ctx.newPage(); pg.on('pageerror', (e) => errs.push(e.message));
    await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; });
    await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: '{"ok":true}' })));
    await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S0)).toString('base64'))}`); await pg.waitForTimeout(1200);
    const c = await pg.evaluate(() => ({ m1: window.__segSel('M1'), m8: window.__segSel('M8'),
      fillRows: [...document.querySelectorAll('.sg[data-seg="M1"] .sg-song')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()).filter((t) => /배경으로만 이어 틀어요/.test(t)).length }));
    c.o1 = P.order(S0, 'M1'); c.o8 = P.order(S0, 'M8');   /* 식순 화면(빌더)이 쓰는 같은 함수 · 같은 초안 */
    ok('e 콘솔 M1 재생 목록 = 고른 곡(B13) → 나머지 → fill(다른 구간에서 고른 B16 건너뜀) · 식순 화면 순서 줄과 같은 함수', c.m1.join() === 'B13,B01,B24,B33' && c.m1.join() === c.o1.join(), c);
    ok('e 콘솔 M8 재생 목록 = B24 · B23 · B16 · B14(하객 맞이에서 고른 B13 은 건너뜀) · 배경 곡 줄에 «배경으로만 이어 틀어요»(파일을 넣는 자리)', c.m8.join() === 'B24,B23,B16,B14' && c.m8.join() === c.o8.join() && c.fillRows === 2, c);
    const fw = (n) => ({ name: n + '.wav', mimeType: 'audio/wav', buffer: wav(3, 300) });
    await pg.setInputFiles('.sg[data-seg="M2"] .sg-song:nth-of-type(3) [data-seg-file]', fw('b07')); await pg.waitForTimeout(400);
    const pl = await pg.evaluate(() => ({ sel: window.__segSel('M2'), plan: window.__segPlan('M2') }));
    ok('e 콘솔 한 곡 칸 — 1순위(B05) 파일이 없으면 화촉 목록에서 파일이 있는 다음 곡(B07)', pl.sel === 'B05' && pl.plan && pl.plan.join() === 'B07', pl);
    ok('e 콘솔 오류 0', !errs.length, errs.slice(0, 2)); await ctx.close(); }
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 500)); }
await br.close(); srv.close();
console.log(fail ? `BGM FILL FAIL ${fail}` : 'BGM FILL OK');
process.exit(fail ? 1 : 0);
