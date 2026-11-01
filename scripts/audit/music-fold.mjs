#!/usr/bin/env node
/* ★★[MUSIC_FOLD_1031 2026-10-31 사장님 시안 «1 · 음악만 접기» 고름] 순간 쪽 음악 곡 목록(assets/bgm-bed.js · .ls-bed · 축사 · 편지 .bed-sub)
   진짜 식순 화면을 «마이페이지 안»(order-preview.html?embed=1 · 부모 창이 GAS 대신 곡 목록을 준다)과 «밖»(공개 미리보기)으로 띄워 잰다.
   1 안 고른 구간(«고르지 않으시면 ‹1순위›…»)은 접지 않는다 — 처음 · 쪽을 옮겨 다시 와도
   2 ★[MUSIC_FOLD_PICK_1031 2026-10-31 사장님 «저런 거 있는 곳들은 똑같이»] 고르면 바로 한 줄로 접힌다(입장 음악 추천 곡 MU_FOLD 와 같게) — 포커스는 «바꾸기» · 다시 그려도 접힌 채
   3 고른 뒤 쪽을 옮겨 다시 들어오면 한 줄로 접힌다 — ▶(마이페이지 안) · 곡 이름 · 아랫줄 · «바꾸기»(button · aria-expanded=false · aria-controls → 목록 칸) · «준비해요» 한 줄 없음 · 줄 높이 = 곡 줄 하나 · 누를 자리 44px 이상
   4 접힌 줄 ▶ 는 듣기만 — 고른 곡이 바뀌지 않는다
   5 «바꾸기» = 그 자리에서 편다(덮는 창 없음 · 칸 윗변 그대로) · 포커스는 고른 곡 줄 · 다시 그려도 편 채 · 다른 곡(또는 같은 곡)을 고르면 다시 접힌다
   6 다시 열기(초안을 새로 얹음 · 같은 쪽으로 열림)도 «새로 들어옴» — 접혀 시작한다 · ② 걸음 밖에 다녀와도 접힌다
   7 음악 목록이 있는 모든 순간이 같다 — 하객 맞이 · 화촉 · 감사 인사 · 부모님께 인사 · 테이블 인사 · 축배 · 닫는 인사 · 축사 · 편지(«음악과 함께» 아래)
   8 공개 미리보기 — 접힌 줄에 ▶ 없음 · «바꾸기»는 같다
   9 쪽 오류 없음 · 가로 넘침 없음
   MF_BED=<bgm-bed.js 경로>(그 판으로 잰다 — 되돌리면 빨강인지 확인용)  SHOT=폴더(그림 · 390 · 1280 · 접힘 · 편 뒤)  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const BED = process.env.MF_BED || '', SHOT = process.env.SHOT || '';
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 600)}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
function wav(sec, f, sr = 16000) { const n = Math.round(sr * sec), b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(f ? 8000 * Math.sin(2 * Math.PI * f * i / sr) : 0), 44 + i * 2); return b; }
const SHORT = wav(0.6, 330);
const HAVE = ['B01', 'B05', 'B07', 'B09', 'B10', 'B11', 'B12', 'B13', 'B14', 'B15', 'B17', 'B19', 'B24', 'B28', 'B29', 'B23'];   /* [PICKS_THREE_1101] 구간마다 3곡 · 뺀 7곡 대신 남은 곡 */
const SONG = {}; HAVE.forEach((k, i) => { SONG[k] = wav(12, 180 + i * 20).toString('base64'); });
const HARNESS = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><iframe id="fr" style="width:100vw;height:100vh;border:0;display:block"></iframe>
<script>
window.H={draft:null,have:${JSON.stringify(HAVE)},songs:${JSON.stringify(SONG)}};
var fr=document.getElementById('fr');
function back(m){ fr.contentWindow.postMessage(m, location.origin); }
window.go=function(){ fr.src='/order-preview.html?embed=1&t='+Date.now(); };
window.addEventListener('message',function(ev){ var d=ev.data||{}; if(ev.origin!==location.origin||ev.source!==fr.contentWindow) return;
  if(d.type==='momentedit:orderReady'){ back({type:'momentedit:orderFill',draft:H.draft,done:false,cust:{name:'시험',code:'TEST01'}}); return; }
  if(d.type==='momentedit:orderDraft'){ back({type:'momentedit:orderDraftSaved'}); return; }
  if(d.type==='momentedit:ritualFileGet'){ var g=d.data;
    if(g.key==='bed'){ setTimeout(function(){ if(g.id==='list'){ back({type:'momentedit:ritualFileData',key:'bed',id:'list',ok:true,songs:H.have.map(function(f){ return {f:f}; })}); return; }
        if(!H.songs[g.id]){ back({type:'momentedit:ritualFileData',key:'bed',id:g.id,ok:false,error:'곡 파일을 찾을 수 없어요. (코드 L3)',ecode:'L3'}); return; }
        back({type:'momentedit:ritualFileData',key:'bed',id:g.id,ok:true,mime:'audio/wav',data:H.songs[g.id]}); }, 40); return; }
    back({type:'momentedit:ritualFileData',key:g.key,id:g.id,ok:false,error:'파일을 불러오지 못했어요 (코드 L6)',ecode:'L6'}); return; }
});
</script>`;
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/__harness.html') { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(HARNESS); return; }
  if (/^\/assets\/audio\/narration\/.+\.mp3$/.test(u)) { r.writeHead(200, { 'Content-Type': 'audio/wav' }); r.end(SHORT); return; }
  const p = (BED && u === '/assets/bgm-bed.js') ? BED : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const wait = (f, ms) => f.waitForTimeout(ms);
const ALL = ['candle', 'welcome', 'vow', 'ring', 'declare', 'free', 'letter', 'tribute', 'toast', 'table'];
const frameOf = (pg) => pg.frames().find((x) => /order-preview\.html/.test(x.url()));
async function ready(pg) { await pg.waitForFunction(() => { const x = document.getElementById('fr'); return x.contentWindow && x.contentWindow.document.readyState === 'complete' && x.contentWindow.render; }, null, { timeout: 30000 }); await pg.waitForTimeout(1200); return frameOf(pg); }
async function open(W, embed) {
  const ctx = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: W < 1000 }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  let f;
  if (embed) { await pg.goto(`http://127.0.0.1:${port}/__harness.html`, { waitUntil: 'load' }); await pg.evaluate(() => go()); f = await ready(pg); }
  else { await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await pg.waitForTimeout(700); f = pg.mainFrame(); }
  const nx = async () => { if (await f.isVisible('#next')) await f.click('#next'); else if (await f.isVisible('.pk-go')) await f.click('.pk-go'); await wait(f, 450); };
  await nx(); await nx();
  await f.evaluate((ks) => { ks.forEach((k) => { S.on[k] = 1; }); S.guestVoice = 'nar'; S.vsAsked = 1; delete S.bgm; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); }, ALL);
  await nx(); await wait(f, 800);
  return { ctx, pg, f, errs };
}
const go = async (f, k) => { await f.evaluate((k) => mkGo(k), k); await wait(f, 500); };
const look = (f, sg) => f.evaluate((sg) => { const r = document.querySelector('.ls-bed[data-seg="' + sg + '"],.bed-sub[data-seg="' + sg + '"]'); if (!r) return null;
  const box = r.classList.contains('bed-sub') ? r : r.querySelector('.bed-box'), fo = r.querySelector('.mu-fold1'), ch = r.querySelector('.mu-chg'), pl = fo && fo.querySelector('.mu-pl'), rect = (x) => x ? x.getBoundingClientRect() : null;
  const row1 = (r.querySelector('.mu-pick[aria-checked="true"]') || r.querySelector('.mu-pick') || { closest: () => null }).closest('.mu-row');   /* 고른 곡 줄(없으면 첫 줄) — 접힌 줄은 그 곡을 보인다 */
  return { rows: r.querySelectorAll('.mu-row').length, fold: !!fo, on: [...r.querySelectorAll('.mu-pick[aria-checked="true"]')].map((b) => b.getAttribute('data-fk')),
    t: fo ? ((fo.querySelector('.mu-t') || {}).textContent || '').trim() : '', a: fo ? ((fo.querySelector('.mu-a') || {}).textContent || '').trim() : '',
    pl: fo ? fo.querySelectorAll('.mu-pl').length : 0, plFk: pl ? pl.getAttribute('data-fk') : '', plH: pl ? Math.round(rect(pl).height) : 0,
    ch: ch ? { tag: ch.tagName, txt: ch.textContent.trim(), exp: ch.getAttribute('aria-expanded'), ctl: ch.getAttribute('aria-controls'), ctlOk: !!(ch.getAttribute('aria-controls') && document.getElementById(ch.getAttribute('aria-controls')) === box), h: Math.round(rect(ch).height), col: getComputedStyle(ch).color, deco: getComputedStyle(ch).textDecorationLine } : null,
    note: !!r.querySelector('.bed-note'), foldH: fo ? Math.round(rect(fo).height) : 0, rowH: row1 ? Math.round(rect(row1).height) : 0, boxTop: Math.round(rect(box).top + scrollY), boxId: box.id,
    seal: getComputedStyle(document.documentElement).getPropertyValue('--seal').trim(), gold: getComputedStyle(document.documentElement).getPropertyValue('--gold-deeper').trim() }; }, sg);   /* [LINK_GOLD_1031] «바꾸기» 색 = 빌더 글 단추(.pk-link · --gold-deeper) */
const sealRgb = (hex) => { const h = hex.replace('#', ''); return `rgb(${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)})`; };
const shot = async (f, W, n) => { if (!SHOT) return; try { fs.mkdirSync(SHOT, { recursive: true }); await f.evaluate(() => { document.querySelectorAll('.me-fab-stack').forEach((x) => { x.style.visibility = 'hidden'; }); }); await f.locator('#stage .mk-pick').first().screenshot({ path: path.join(SHOT, `mf-${W}-${n}.png`) }); } catch (e) { console.log('그림 못 찍음 ' + n + ' ' + e.message); } };
/* 순간마다 — [구간, 그 쪽 순간, 고를 곡(1순위 아님), 다녀올 쪽] */
const CASES = [['M1', 'guest', 'B24', 'candle'], ['M2', 'candle', 'B07', 'welcome'], ['M4', 'welcome', 'B10', 'candle'], ['M5', 'tribute', 'B11', 'welcome'], ['M8', 'table', 'B23', 'welcome'], ['M7', 'toast', 'B29', 'welcome'], ['M6', '_close', 'B19', 'welcome']];
try {
  for (const W of [390, 1280]) {
    const { ctx, pg, f, errs } = await open(W, true);
    /* 1 안 고른 구간 */
    await go(f, 'candle'); let r = await look(f, 'M2');
    ok(`${W} 1 안 고른 화촉 — 곡 줄 셋 · 접힌 줄 없음 · 아래 «고르지 않으시면 …» 줄 없음(SONG_ROW_LINES_1101)`, r && r.rows === 3 && !r.fold && r.on.length === 0 && !r.note, r);
    await go(f, 'welcome'); await go(f, 'candle'); r = await look(f, 'M2');
    ok(`${W} 1 안 고른 채로 다시 들어와도 접지 않는다`, r && r.rows === 3 && !r.fold, r);
    /* 2 쪽에 머무는 동안 고르기 */
    const rowH = await f.evaluate(() => { const x = document.querySelector('[data-fk="bed:M2:B07"]'); return x ? Math.round(x.closest('.mu-row').getBoundingClientRect().height) : 0; });   /* 고를 곡(B07)의 줄 — 접힌 줄은 그 곡을 보인다(첫 곡 줄은 폰에서 두 줄일 수 있다) */
    await f.click('[data-fk="bed:M2:B07"]'); await wait(f, 700); r = await look(f, 'M2');
    const fk2 = await f.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-fk'));
    ok(`${W} 2 고르면 바로 한 줄 — 곡 줄 없음 · «Summer» · 포커스 = «바꾸기»(${fk2})`, r && r.fold && r.rows === 0 && r.t === 'Summer' && r.plFk === 'bedp:M2:B07' && fk2 === 'bedchg:M2', { r, fk2 });
    await f.click('.ls-bed[data-seg="M2"] .mu-chg'); await wait(f, 300); await f.click('[data-fk="bed:M2:B05"]'); await wait(f, 700);
    await f.click('.ls-bed[data-seg="M2"] .mu-chg'); await wait(f, 300); await f.click('[data-fk="bed:M2:B07"]'); await wait(f, 700);
    await f.evaluate(() => render()); await wait(f, 300); r = await look(f, 'M2');
    ok(`${W} 2 «바꾸기»로 열어 다른 곡을 골라도 다시 접힌다 · 다시 그려도(render) 접힌 채`, r && r.fold && r.rows === 0 && r.plFk === 'bedp:M2:B07', r);
    /* 3 다시 들어오면 접힌다 */
    await go(f, 'welcome'); await go(f, 'candle'); r = await look(f, 'M2');
    ok(`${W} 3 다시 들어오면 한 줄 — 곡 줄 없음 · «Summer» · 아랫줄 · ▶ 하나 · «준비해요» 없음`, r && r.fold && r.rows === 0 && r.t === 'Summer' && r.a === '피아노 연주'   /* ★[SONG_ROW_PLAIN_1101] 아랫줄 = 연주자만 */ && r.pl === 1 && r.plFk === 'bedp:M2:B07' && !r.note, r);
    ok(`${W} 3 «바꾸기» = button · aria-expanded=false · aria-controls → 목록 칸 · 밑줄 · 글 단추 색(--gold-deeper · LINK_GOLD_1031) · 누를 자리 44px 이상`, r && r.ch && r.ch.tag === 'BUTTON' && r.ch.txt === '바꾸기' && r.ch.exp === 'false' && r.ch.ctlOk && r.ch.h >= 44 && /underline/.test(r.ch.deco) && r.ch.col === sealRgb(r.gold), r && r.ch);
    ok(`${W} 3 접힌 줄 높이 = 같은 곡 줄 하나(${rowH}px ± 2) · ▶ 44px 이상`, r && Math.abs(r.foldH - rowH) <= 2 && r.plH >= 44, { foldH: r && r.foldH, rowH, plH: r && r.plH });
    await shot(f, W, 'candle-fold');
    /* 4 접힌 줄 ▶ 는 듣기만 */
    await f.click('[data-fk="bedp:M2:B07"]'); await wait(f, 1200);
    const c4 = await f.evaluate(() => ({ cf: BgmBed._t.CARD.f, k: S.bgm && S.bgm.M2 && S.bgm.M2.k, fold: !!document.querySelector('.ls-bed[data-seg="M2"] .mu-fold1'), pr: (document.querySelector('[data-fk="bedp:M2:B07"]') || { getAttribute: () => '' }).getAttribute('aria-pressed') }));
    await f.click('[data-fk="bedp:M2:B07"]'); await wait(f, 300);
    ok(`${W} 4 접힌 줄 ▶ — 그 곡을 듣기만(고른 곡 B07 그대로 · 접힌 채 · ■)`, c4.cf === 'B07' && c4.k === 'B07' && c4.fold && c4.pr === 'true', c4);
    /* 5 «바꾸기» */
    const dlgN = () => f.evaluate(() => [...document.querySelectorAll('[role="dialog"],[role="alertdialog"],.mk-dlg')].filter((x) => { const b = x.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(x).visibility !== 'hidden'; }).length);
    const top0 = r.boxTop, y0 = await f.evaluate(() => scrollY), d0 = await dlgN();
    await f.click('.ls-bed[data-seg="M2"] .mu-chg'); await wait(f, 300); r = await look(f, 'M2');
    const fx = await f.evaluate(() => ({ fk: document.activeElement && document.activeElement.getAttribute('data-fk'), y: scrollY })); fx.dlg = (await dlgN()) > d0;
    ok(`${W} 5 «바꾸기» — 그 자리에서 편다(곡 줄 셋 · 칸 윗변 그대로 · 화면 안 움직임 · 덮는 창 없음) · 포커스 = 고른 곡 줄 · «준비해요» 줄 없음`, r && r.rows === 3 && !r.fold && r.on.join() === 'bed:M2:B07' && Math.abs(r.boxTop - top0) <= 1 && fx.y === y0 && !fx.dlg && fx.fk === 'bed:M2:B07' && !r.note, { r, fx, top0, y0 });
    await shot(f, W, 'candle-open');
    await f.evaluate(() => render()); await wait(f, 300); await f.click('[data-fk="bed:M2:B07"]'); await wait(f, 300); await f.evaluate(() => { _persist(); render(); }); await wait(f, 300); r = await look(f, 'M2');
    ok(`${W} 5 편 뒤 다시 그려도 편 채 · 다른 곡을 고르면 다시 접힌다`, r && r.fold && r.rows === 0 && r.plFk === 'bedp:M2:B07', r);
    await f.click('.ls-bed[data-seg="M2"] .mu-chg'); await wait(f, 300); await f.click('[data-fk="bed:M2:B07"]'); await wait(f, 700); r = await look(f, 'M2');
    ok(`${W} 5 편 뒤 같은 곡을 다시 눌러도 접힌다(고른 곡 그대로)`, r && r.fold && r.rows === 0 && r.plFk === 'bedp:M2:B07', r);
    /* 6 ② 걸음 밖에 다녀오기 · 다시 열기 */
    await f.evaluate(() => { const i = STEPS.findIndex((s) => s.k === 'pick'); idx = i; render(); }); await wait(f, 300);
    await f.evaluate(() => { const i = STEPS.findIndex((s) => s.k === 'listen'); idx = i; render(); }); await wait(f, 400); r = await look(f, 'M2');
    ok(`${W} 6 ② 걸음 밖(① 고르기)에 다녀와 같은 쪽으로 들어와도 접힌다`, r && r.fold && r.rows === 0 && r.plFk === 'bedp:M2:B07', r);
    const Sx = await f.evaluate(() => { S.mk.at = 'candle'; _persist(); return JSON.parse(JSON.stringify(S)); });
    await pg.evaluate((s) => { H.draft = { S: s }; go(); }, Sx); const f2 = await ready(pg); await wait(f2, 600);
    const at = await f2.evaluate(() => ({ st: STEPS[idx] && STEPS[idx].k, at: S.mk && S.mk.at }));
    if (at.st !== 'listen' || at.at !== 'candle') await f2.evaluate(() => { const i = STEPS.findIndex((s) => s.k === 'listen'); if (S.mk) S.mk.at = 'candle'; idx = i; render(); });
    await wait(f2, 400); r = await look(f2, 'M2');
    ok(`${W} 6 다시 열기(초안을 새로 얹음) — 그 쪽으로 열리면 접혀 시작한다(${at.st} · ${at.at})`, r && r.fold && r.rows === 0, r);
    const fr = f2;
    /* 7 모든 순간 */
    const res = [];
    for (const [sg, k, pick, away] of CASES) {
      await go(fr, k); let a = await look(fr, sg);
      if (!a) { res.push([sg, k, 'no-row']); continue; }
      const st0 = a.fold ? 'fold-before' : '';
      if (a.fold) { await fr.click(`.ls-bed[data-seg="${sg}"] .mu-chg`); await wait(fr, 200); }
      await fr.click(`[data-fk="bed:${sg}:${pick}"]`); await wait(fr, 700); const b = await look(fr, sg);
      await go(fr, away); await go(fr, k); const c = await look(fr, sg);
      if (c && c.ch) { await fr.click(`.ls-bed[data-seg="${sg}"] .mu-chg`); await wait(fr, 250); }
      const d = await look(fr, sg);
      const good = b && b.rows === 0 && b.fold && b.plFk === `bedp:${sg}:${pick}` && c && c.fold && c.rows === 0 && c.pl === 1 && c.plFk === `bedp:${sg}:${pick}` && c.ch && c.ch.ctlOk && c.ch.exp === 'false' && !c.note && d && d.rows === 3 && !d.fold && d.on.join() === `bed:${sg}:${pick}`;
      res.push([sg, k, good ? 'ok' : 'FAIL', st0, b && b.rows, c && c.fold, d && d.rows]);
      if (W === 390 && sg === 'M4') { await go(fr, away); await go(fr, k); await shot(fr, W, 'welcome-fold'); await fr.click(`.ls-bed[data-seg="${sg}"] .mu-chg`); await wait(fr, 250); await shot(fr, W, 'welcome-open'); }
      if (W === 1280 && sg === 'M4') { await go(fr, away); await go(fr, k); await shot(fr, W, 'welcome-fold'); await fr.click(`.ls-bed[data-seg="${sg}"] .mu-chg`); await wait(fr, 250); await shot(fr, W, 'welcome-open'); }
    }
    /* 축사 · 편지 «음악과 함께» 아래 */
    for (const [slot, sg, k, pick] of [['S5', 'M4S5', 'free', 'B14'], ['S6', 'M4S6', 'letter', 'B12']]) {
      await go(fr, k); await fr.click(`[data-fk="bgm:${slot}:bed"]`); await wait(fr, 300);
      const a = await look(fr, sg); await fr.click(`[data-fk="bed:${sg}:${pick}"]`); await wait(fr, 700); const b = await look(fr, sg);
      await go(fr, 'welcome'); await go(fr, k); const c = await look(fr, sg);
      if (c && c.ch) { await fr.click(`.bed-sub[data-seg="${sg}"] .mu-chg`); await wait(fr, 250); }
      const d = await look(fr, sg);
      const good = a && a.rows === 3 && !a.fold && b && b.rows === 0 && b.fold && c && c.fold && c.plFk === `bedp:${sg}:${pick}` && c.ch && c.ch.ctlOk && !c.note && d && d.rows === 3 && !d.fold && d.on.join() === `bed:${sg}:${pick}`;
      res.push([sg, k, good ? 'ok' : 'FAIL', a && a.rows, b && b.rows, c && c.fold, d && d.rows]);
    }
    ok(`${W} 7 음악 목록이 있는 모든 순간 — 고르면 바로 접힘 · 다시 들어와도 접힘 · «바꾸기»로 펴짐(${res.length}곳)`, res.length === 9 && res.every((x) => x[2] === 'ok'), res);
    /* 1 이 다른 구간에서도 — 안 고른 테이블 · 축배 등은 7 에서 고르기 전 접히지 않았다 */
    ok(`${W} 1 고르기 전 접힌 구간 없음(앞에서 고른 화촉 말고 모든 순간)`, res.every((x) => x[0] === 'M2' || x[3] !== 'fold-before'), res);
    ok(`${W} 9 오류 없음 · 가로 넘침 없음`, !errs.length && !(await fr.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), errs);
    await ctx.close();
  }
  /* 8 공개 미리보기 */
  { const { ctx, f, errs } = await open(390, false);
    await go(f, 'candle'); await f.click('[data-fk="bed:M2:B07"]'); await wait(f, 700); let r = await look(f, 'M2');
    ok('8 공개 — 고르면 바로 접힘 · ▶ 없음', r && r.fold && r.rows === 0 && r.pl === 0, r);
    await go(f, 'welcome'); await go(f, 'candle'); r = await look(f, 'M2');
    ok('8 공개 — 다시 들어오면 접힘 · ▶ 없음 · «바꾸기» · «준비해요» 한 줄 없음', r && r.fold && r.pl === 0 && r.ch && r.ch.ctlOk && !r.note && r.t === 'Summer', r);
    await shot(f, 390, 'public-fold');
    await f.click('.ls-bed[data-seg="M2"] .mu-chg'); await wait(f, 300); r = await look(f, 'M2');
    ok('8 공개 — «바꾸기»로 펴짐', r && r.rows === 3 && !r.fold, r);
    ok('8 공개 — 오류 없음 · 가로 넘침 없음', !errs.length && !(await f.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), errs);
    await ctx.close(); }
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 500)); }
await br.close(); srv.close();
console.log(fail ? `MUSIC FOLD FAIL ${fail}` : 'MUSIC FOLD OK');
process.exit(fail ? 1 : 0);
