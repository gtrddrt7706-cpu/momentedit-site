#!/usr/bin/env node
/* ★★[CARRY_SAME_1101 2026-11-01 사장님 «음악이 연달아 있으면 그냥 그 곡으로 이어서 가는 게 좋지 않아?»]
   a 차례(BgmPicks.order(S, 구간, 앞 곡)) — 앞 곡이 목록(3곡 · 목록 칸 fill)에 있으면 맨 앞 · 나머지 원래 차례 · 한 곡 칸은 다른 곡을 골랐으면 고른 곡 · 이어 온 fill 곡은 빼지 않는다 · 이어지지 않는 구간에서 고른 곡은 뺀다
   b 고객 화면 — 부모님께 인사 The Rose → 테이블 곡 줄 첫 줄 The Rose + 그 아래 «부모님께 인사에서 흐르던 곡이 그대로 이어져요»(12.5px · --sub) · «…에서도 고른 곡» 0
   c 한 곡 칸 — 고르지 않았는데 앞 곡을 이으면 그 곡 한 줄 + 같은 한 줄 + «바꾸기» · 다른 곡을 고르면 고른 곡(한 줄 없음)
   d 이어지지 않는 구간(화촉)에서 고른 곡이 테이블 목록에 있으면 건너뛴다(시험만 화촉 목록에 B13 을 넣는다)
   e 미리 듣기 — 부모님께 인사 → 테이블 이어 듣기 동안 같은 소리 그대로(다시 시작 0) · 뜸 = 이어지는 곡(3초)
   f 당일 콘솔 — 지금 흐르는 곡이 다음 구간 목록에 있으면 bedPlay 0 · 목록 맨 앞 · 고른 곡이 이긴다
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
const P = require(PICKSF || path.join(ROOT, 'assets/bgm-picks.js')), SL = require(path.join(ROOT, 'assets/bgm-slots.js'));
const setS = (f, bgm) => f.evaluate((b) => { S.freeWhat = 'speech'; S.bgm = b; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); }, bgm);
const look = (f, sg) => f.evaluate((sg) => { const b = document.querySelector('.ls-bed[data-seg="' + sg + '"], .bed-sub[data-seg="' + sg + '"]'); if (!b) return null; const info = b.querySelector('.bed-info');
  return { info: info ? info.textContent.replace(/\u00a0/g, ' ').trim() : '',   /* 화면이 «약 30분» 사이를 줄바꿈 없는 공백으로 묶는다 */ fs: info ? getComputedStyle(info).fontSize : '', list: [...b.querySelectorAll('li.mu-row[data-f]')].map((x) => x.getAttribute('data-f')), pl: b.querySelectorAll('li.mu-row[data-f] .mu-pl').length,
    tA: [...b.querySelectorAll('li.mu-row[data-f]')].map((x) => [x.querySelector('.mu-t').textContent, x.querySelector('.mu-a').textContent]),
    rows: b.querySelectorAll('.mu-pick').length, chg: b.querySelectorAll('.mu-chg').length, on: b.querySelectorAll('[aria-checked="true"]').length, fold: !!b.querySelector('.mu-fsel'), ord: b.querySelectorAll('.bed-ord, .bed-flow').length,
    dup: ((b.querySelector('.bed-dup') || {}).textContent || '').trim() }; }, sg);

const PL = (f, sg) => f.evaluate((sg) => { const b = document.querySelector('.ls-bed[data-seg="' + sg + '"], .bed-sub[data-seg="' + sg + '"]'); if (!b) return null; const cs = [...b.querySelectorAll('.bed-carry')];
  return { list: [...b.querySelectorAll('li.mu-row[data-f]')].map((x) => x.getAttribute('data-f')), carry: cs.map((x) => x.textContent.trim()), inFirst: !!b.querySelector('li.mu-row[data-f]:first-child .bed-carry'),
    fs: cs[0] ? getComputedStyle(cs[0]).fontSize : '', col: cs[0] ? getComputedStyle(cs[0]).color : '', sub: (() => { const t = document.createElement('span'); t.style.color = 'var(--sub)'; b.appendChild(t); const c = getComputedStyle(t).color; t.remove(); return c; })(),
    dup: b.querySelectorAll('.bed-dup').length, fold: ((b.querySelector('.mu-fsel .mu-t') || {}).textContent || ''), chg: b.querySelectorAll('.mu-chg').length, rows: b.querySelectorAll('.mu-pick').length, on: b.querySelectorAll('[aria-checked="true"]').length }; }, sg);
const listen = (f, ks, stopK) => f.evaluate(async ({ ks, stopK }) => { const BB = BgmBed._t, o = []; if (!window.__lpMs0) window.__lpMs0 = window._lpMs; window._lpMs = function () { return 1200; };
  LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(ks, true); _lFull(); (LP.q || []).forEach((x) => { if (x.talk2 || x.said || x.act) x.ms = 1200; });
  const t0 = performance.now(); await new Promise((res) => { const iv = setInterval(() => { const v = BB.BED.cur, st = LP.q[LP.i]; o.push({ t: performance.now() - t0, k: st && st.k, lead: !!LP.leadSt, ch: !!BB.LPB.cheer, f: v && v.f, t0: v && v.t0, src: !!(v && v.src), want: v && v.want });
    if (performance.now() - t0 > 45000 || (st && st.k === stopK && !LP.leadSt && o.filter((x) => x.k === stopK && !x.lead).length > 25)) { clearInterval(iv); res(); } }, 100); });
  try { lsStop(); } catch (x) {} try { lsCloseBig(); } catch (x) {} window._lpMs = window.__lpMs0; return o; }, { ks, stopK });
const setX = (f, o) => f.evaluate((o) => { if (o.picks) Object.keys(o.picks).forEach((k) => { BgmPicks.PICKS[k] = o.picks[k]; }); Object.keys(o.on || {}).forEach((k) => { S.on[k] = o.on[k]; }); S.freeWhat = 'speech'; S.bgm = o.bgm || {}; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); }, o);
try {
  /* a 데이터 */
  { const o1 = P.order({ bgm: { M5: { k: 'B16' } } }, 'M8', 'B16'), o2 = P.order({ bgm: { S6: { m: 'bed', k: 'B14' } } }, 'M8', 'B14'), o3 = P.order({ bgm: { S6: { m: 'bed', k: 'B14' } } }, 'M8');
    ok('a 테이블(목록 칸) — 앞 곡 The Rose(B16)를 맨 앞에 · 나머지는 원래 차례(B24 · B23 · B13 · B14)', o1.join() === 'B16,B24,B23,B13,B14', o1);
    ok('a 바로 앞에서 이어 온 fill 곡(편지 «음악과 함께» B14)은 빼지 않고 맨 앞 · 이어지지 않으면 종전대로 뺀다', o2.join() === 'B14,B24,B23,B16,B13' && o3.join() === 'B24,B23,B16,B13', { o2, o3 });
    ok('a 한 곡 칸 — 고르지 않았으면 앞 곡(B05) · 같은 곡을 골랐으면 그 곡 · 다른 곡(B07)을 골랐으면 고른 곡이 이긴다(carryOf = "")',
      typeof P.carryOf === 'function' && P.carryOf({}, 'M2', 'B05') === 'B05' && P.carryOf({ bgm: { M2: { k: 'B05' } } }, 'M2', 'B05') === 'B05' && P.carryOf({ bgm: { M2: { k: 'B07' } } }, 'M2', 'B05') === '' && P.order({ bgm: { M2: { k: 'B07' } } }, 'M2', 'B05')[0] === 'B07' && P.order({}, 'M2', 'B07').join() === 'B07,B05,B31' && P.carryOf({}, 'M2', 'B24') === '');
    const keep = P.PICKS.M2; P.PICKS.M2 = ['B05', 'B31', 'B13']; const o4 = P.order({ bgm: { M2: { k: 'B13' } } }, 'M8'); P.PICKS.M2 = keep;
    ok('d 이어지지 않는 화촉에서 고른 곡(시험 B13)은 테이블 목록에서 건너뛴다', o4.join() === 'B24,B23,B16,B14', o4); }
  /* b · c · d · e 고객 화면 · 미리 듣기 */
  for (const W of [390, 1280]) {
    const { ctx, pg, f, errs } = await open(W, true);
    await f.evaluate(() => { const L = BgmBed._t.LOPEN; if (L) L.M1 = L.M8 = true; });   /* [LIST_FOLD_1102] 아래 검사는 펼친 목록을 본다 · 접힘은 bgm-fill LIST_FOLD 가 본다 */
    await setX(f, { bgm: { M5: { k: 'B16' } } }); await go(f, 'table'); let r = await PL(f, 'M8');
    const at = await f.evaluate(() => [BgmBed._t.songAt('table'), ((BgmBed._t.prevOf ? BgmBed._t.prevOf('M8') : null) || {}).sg]);
    ok(`${W} b 부모님께 인사 The Rose → 테이블 곡 줄 = The Rose 맨 앞 · 하객 맞이와 겹치는 곡은 맨 뒤(B16 · B23 · B14 · B24 · B13 · DETAIL_R3_1101 ⑦ 보탬) · 미리 듣기 곡도 B16`, r && r.list.join() === 'B16,B23,B14,B24,B13' && at[0] === 'B16' && at[1] === 'M5', { r, at });
    ok(`${W} b 첫 줄 아래 «부모님께 인사에서 흐르던 곡이 그대로 이어져요»(12.5px · --sub) 한 줄 · «…에서도 고른 곡» 0`, r && r.carry.length === 1 && r.carry[0] === '부모님께 인사에서 흐르던 곡이 그대로 이어져요' && r.inFirst && r.fs === '12.5px' && r.col === r.sub && r.dup === 0, r);
    await setX(f, { bgm: { M5: { k: 'B15' } } }); await go(f, 'table'); r = await PL(f, 'M8');
    ok(`${W} b 앞 곡이 목록에 없으면(부모님께 인사 B15) 이어받지 않는다(겹치는 곡은 맨 뒤 · B23 · B14 · B24 · B16 · B13) · 한 줄 0`, r && r.list.join() === 'B23,B14,B24,B16,B13' && r.carry.length === 0, r);
    await shot(f, W, 'carry-table', '.ls-bed[data-seg="M8"]');
    /* c 한 곡 칸 — 시험만 부모님께 인사 목록에 B10 을 넣는다 · 편지 «음악과 함께» B10 → 부모님께 인사(축가 없음) */
    const M5 = await f.evaluate(() => BgmPicks.PICKS.M5.slice());
    await setX(f, { picks: { M5: ['B15', 'B10', 'B16'] }, on: { song: 0 }, bgm: { S6: { m: 'bed', k: 'B10' } } }); await go(f, 'tribute'); r = await PL(f, 'M5');
    const c1 = await f.evaluate(() => BgmBed._t.songAt('tribute'));
    ok(`${W} c 한 곡 칸(부모님께 인사)을 고르지 않았고 앞(편지 «음악과 함께»)이 B10 — 그 곡 한 줄 + «편지에서 흐르던 곡이 그대로 이어져요» + «바꾸기» · 미리 듣기 B10`, r && r.fold === P.SONGS.B10.t && r.carry.join() === '편지에서 흐르던 곡이 그대로 이어져요' && r.chg === 1 && r.rows === 0 && c1 === 'B10', { r, c1 });
    await f.evaluate(() => { const b = document.querySelector('.ls-bed[data-seg="M5"] .mu-chg'); if (b) b.click(); }); await wait(f, 300); r = await PL(f, 'M5');
    ok(`${W} c «바꾸기» — 곡 줄 3 · 눌린 곡 0(고르지 않았다)`, r && r.rows === 3 && r.on === 0, r);
    await f.click('[data-fk="bed:M5:B15"]'); await wait(f, 400); r = await PL(f, 'M5'); const c2 = await f.evaluate(() => BgmBed._t.songAt('tribute'));
    ok(`${W} c 다른 곡(B15)을 고르면 고른 곡이 이긴다 — 한 줄 0 · 미리 듣기 B15`, r && r.fold === P.SONGS.B15.t && r.carry.length === 0 && c2 === 'B15', { r, c2 });
    /* d 이어지지 않는 화촉에서 고른 곡 */
    await setX(f, { picks: { M5: M5, M2: ['B05', 'B31', 'B13'] }, on: { song: 1 }, bgm: { M2: { k: 'B13' } } }); await go(f, 'table'); r = await PL(f, 'M8');
    ok(`${W} d 화촉(이어지지 않음)에서 고른 B13 은 테이블 곡 줄 맨 뒤로(빼면 30분이 안 된다 · DETAIL_R3_1101 ⑦ 보탬) · 한 줄 0`, r && r.list.join() === 'B23,B14,B24,B16,B13' && r.carry.length === 0, r);
    await setX(f, { picks: { M2: ['B05', 'B31', 'B07'] }, bgm: {} });
    /* e 미리 듣기 — 부모님께 인사 → 테이블 */
    if (W === 390) { await setX(f, { on: { song: 0, toast: 0 }, bgm: { M5: { k: 'B16' } } }); await go(f, 'tribute');
      const t = await listen(f, ['tribute', 'table'], 'table');
      const tb = t.filter((x) => x.k === 'table' && x.src), tr = t.filter((x) => x.k === 'tribute' && x.src && x.f === 'B16'), ld = t.filter((x) => x.k === 'table' && x.lead), ldMs = ld.length ? ld[ld.length - 1].t - ld[0].t : 0;
      const same = tr.length && tb.length && tb.every((x) => x.f === 'B16' && x.t0 === tr[tr.length - 1].t0);
      ok('e 미리 듣기 부모님께 인사(B16) → 테이블 — 같은 소리 그대로(다시 시작 0) · 뜸은 이어지는 곡 길이(약 3초)', !!same && ldMs > 2300 && ldMs < 3800, { tr: tr.length, tb: [...new Set(tb.map((x) => x.f + '@' + Math.round(x.t0 * 100)))], t0: tr.length && tr[tr.length - 1].t0, ldMs: Math.round(ldMs) });
      /* g 편지 «음악과 함께»(B10) → 축배 — 본식 곡을 고르지 않았고 B10 은 본식 목록에도 있다 → 축배 여는 말도 B10 그대로(본식 1순위 B09 로 돌아가지 않는다) */
      await setX(f, { on: { letter: 1, tribute: 0, table: 0, toast: 1, song: 0, free: 0 }, bgm: { S6: { m: 'bed' } } }); await go(f, 'toast'); await go(f, 'letter');
      const fl = await f.evaluate(() => BgmBed._t.songAt('letter')), g = await listen(f, ['letter', 'toast'], 'toast'), gl = g.filter((x) => x.k === 'letter' && x.src && x.f === fl && x.want > -60), gt = g.filter((x) => x.k === 'toast' && !x.ch && x.src && x.want > -60)   /* [TIME_GAP_1102] 축배 여는 말까지 — «위하여» 뒤 강조 자리로 옮기는 것(BGM_FIX_1030)은 따로 */;
      ok('g 미리 듣기 편지 «음악과 함께»(B10) → 축배 — 본식 곡을 안 골랐으면 축배 여는 말도 B10 그대로(다시 시작 0 · B09 0)', fl === 'B10' && gl.length > 3 && gt.length > 3 && gt.every((x) => x.f === 'B10' && x.t0 === gl[gl.length - 1].t0), { fl, gl: gl.length, gt: [...new Set(gt.map((x) => x.f + '@' + Math.round(x.t0 * 100)))] }); }
    ok(`${W} 쪽 오류 0`, !errs.length, errs.slice(0, 3));
    await ctx.close();
  }
  /* f 당일 콘솔 */
  { const S0 = O.applyExample({ course: 'open' }, 'standard'); S0.course = 'open'; S0.freeWhat = 'speech'; S0.on = Object.assign({}, S0.on, { tribute: 1, table: 1, toast: 0, song: 0 }); S0.bgm = { M5: { k: 'B16' }, M2: { k: 'B07' } };
    const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }), errs = [], pg = await ctx.newPage(); pg.on('pageerror', (e) => errs.push(e.message));
    await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; window.__bgmLog = []; });
    await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: '{"ok":true}' })));
    await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S0)).toString('base64'))}`); await pg.waitForTimeout(900);
    const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'carry-'));
    for (const [sel, hz] of [['.sg[data-seg="M5"] .sg-song:nth-of-type(3)', 400], ['.sg[data-seg="M8"] .sg-song:nth-of-type(1)', 600]]) { const p = path.join(TMP, hz + '.wav'); fs.writeFileSync(p, wav(40, hz)); await pg.setInputFiles(sel + ' [data-seg-file]', p, { timeout: 4000 }); }
    await pg.waitForTimeout(1200); await pg.click('#go'); await pg.waitForTimeout(700);
    const Rq = await pg.evaluate(() => window.__bgmR()), i5 = Rq.findIndex((c) => c.k === 'tribute'), i8 = Rq.findIndex((c) => c.k === 'table');
    const d = await pg.evaluate(() => ({ m2: window.__segSel('M2', 'B05'), m2b: window.__segSel('M2', 'B07'), m5: window.__segSel('M5', 'B15'), m8: window.__segSel('M8', 'B16') }));
    ok('f 콘솔 차례 — 한 곡 칸은 두 분이 고른 곡이 이긴다(화촉 B07 · 부모님께 인사 B16) · 목록 칸은 지금 곡을 맨 앞', d.m2 === 'B07' && d.m2b === 'B07' && d.m5 === 'B16' && Array.isArray(d.m8) && d.m8[0] === 'B16' && d.m8.every((f) => P.order(S0, 'M8', 'B16', () => false).indexOf(f) > -1), d);   /* [DETAIL_R5_1101 규칙 1] 콘솔 목록 = 하루 곡 계획(파일이 있는 곡 · 겹침은 맨 뒤) — 차례 전부는 detail-r5 가 잰다 */
    if (i5 < 0 || i8 < i5) ok('f 콘솔 시험 조건(부모님께 인사 · 테이블 큐)', false, { i5, i8 });
    else { await pg.evaluate((i) => window.__bgmGo.fire(i), i5); await pg.waitForTimeout(2500); const s1 = await pg.evaluate(() => window.__seg.st());
      await pg.evaluate((i) => window.__bgmGo.fire(i), i8); await pg.waitForTimeout(1500); const s2 = await pg.evaluate(() => window.__seg.st());
      ok('f 콘솔 부모님께 인사(B16) → 테이블 — bedPlay 0(같은 재생기 · 위치 이어짐) · 구간 M8 · 목록 맨 앞 B16', s1.seg === 'M5' && s1.id === 'B16' && s2.seg === 'M8' && s2.id === 'B16' && s2.plays === s1.plays && s2.on === s1.on && s2.t > s1.t && s2.list[0] === 'B16' && s2.li === 0, { s1: [s1.seg, s1.id, s1.plays, s1.on, s1.t], s2: [s2.seg, s2.id, s2.plays, s2.on, s2.t, s2.list] }); }
    ok('f 콘솔 오류 0', !errs.length, errs.slice(0, 2)); await ctx.close(); }
  /* g 당일 콘솔 — 편지 «음악과 함께»(B10) → 축배 · 본식 곡을 안 골랐으면 B10 그대로 */
  { const S0 = O.applyExample({ course: 'open' }, 'standard'); S0.course = 'open'; S0.freeWhat = 'speech'; S0.on = Object.assign({}, S0.on, { letter: 1, tribute: 0, table: 0, toast: 1, song: 0, free: 0 }); S0.bgm = { S6: { m: 'bed' } };
    const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }), errs = [], pg = await ctx.newPage(); pg.on('pageerror', (e) => errs.push(e.message));
    await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; window.__bgmLog = []; });
    await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: '{"ok":true}' })));
    await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S0)).toString('base64'))}`); await pg.waitForTimeout(900);
    const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'carry-'));
    for (const [sel, hz] of [['.sg[data-seg="M4"] .sg-song:nth-of-type(1)', 440], ['.sg[data-seg="M4S6"] .sg-song:nth-of-type(1)', 520]]) { const p = path.join(TMP, hz + '.wav'); fs.writeFileSync(p, wav(60, hz)); await pg.setInputFiles(sel + ' [data-seg-file]', p, { timeout: 4000 }); }
    await pg.waitForTimeout(1200); await pg.click('#go'); await pg.waitForTimeout(700);
    const Rq = await pg.evaluate(() => window.__bgmR()), iL = Rq.findIndex((c) => /^letter-/.test(c.slug || '')), iE = Rq.findIndex((c) => c.slug === 'narr-letter-end'), iT = Rq.findIndex((c) => c.k === 'toast');
    if (iL < 1 || iE < iL || iT < iE) ok('g 콘솔 시험 조건', false, { iL, iE, iT });
    else { await pg.evaluate((i) => window.__bgmGo.fire(i), iL - 1); await pg.waitForTimeout(2000); await pg.evaluate((i) => window.__bgmGo.fire(i), iL); await pg.waitForTimeout(3800); const s1 = await pg.evaluate(() => window.__seg.st());
      await pg.evaluate((i) => window.__bgmGo.fire(i), iE); await pg.waitForTimeout(6000); await pg.evaluate((i) => window.__bgmGo.fire(i), iT); await pg.waitForTimeout(1500); const s2 = await pg.evaluate(() => window.__seg.st());
      ok('g 콘솔 편지 «음악과 함께»(B10) → 축배 — 본식 곡을 안 골랐으면 B10 그대로(bedPlay 0 · 구간은 M4)', s1.seg === 'M4S6' && s1.id === 'B10' && s2.seg === 'M4' && s2.id === 'B10' && s2.plays === s1.plays && s2.t > s1.t, { s1: [s1.seg, s1.id, s1.plays, s1.t], s2: [s2.seg, s2.id, s2.plays, s2.t] }); }
    ok('g 콘솔 오류 0', !errs.length, errs.slice(0, 2)); await ctx.close(); }
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 500)); }
await br.close(); srv.close();
console.log(fail ? `CARRY SAME FAIL ${fail}` : 'CARRY SAME OK');
process.exit(fail ? 1 : 0);
