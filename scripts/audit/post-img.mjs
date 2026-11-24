#!/usr/bin/env node
/* ★★[POST_IMG_1124 2026-11-24 사장님 «빈칸에 들어갈 사진 만들자» · «촬영 후 안내도 갖다 붙인 거» · «전체 사진에 테이블이 보이면 안 되지» · «창 없애고 오프라인 디자인 컨셉으로»] 식후 세 장 — 실브라우저(390 · 1280)
   ① 식후 그림 원천: 전체 단체 사진 = post-photo · 가족 사진 · 추가 촬영 = post-extra · 촬영 후 안내 = post-after (옛 close · close-end · guest-end 빌림 없음) · 큰 판 · 작은 판 파일이 있다
   ② ③ 연습 «골라서 연습하기» 식후 세 줄 모두 그림(빈 칸 없음 · 작은 판 -640)
   SHOT_DIR=디렉터리 → 스크린샷  PW_OP = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const OP = process.env.PW_OP || '', BED = process.env.PW_BED || '', EMF = process.env.BP_EM || '', SHOT = process.env.SHOT || '', PICKSF = process.env.BP_PICKS || '';
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
  const p = (OP && u === '/order-preview.html') ? OP : (BED && u === '/assets/bgm-bed.js') ? BED : (EMF && u === '/assets/entry-music.js') ? EMF : (PICKSF && u === '/assets/bgm-picks.js') ? PICKSF : path.join(ROOT, u);
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


const SHOT_DIR = process.env.SHOT_DIR || '';
async function toPractice(f, on) {
  await f.evaluate(async (on) => { try { lsStop(); } catch (e) {} RitualOpen.FEATURE.practiceTts = on; try { localStorage.removeItem('me_ptts_ok'); localStorage.removeItem('me_pr_mode'); } catch (e) {}
    PT.mode = ''; PT.askMode = false; PT.prep = null; PT.startAfter = null; PRW = 'flow';
    idx = STEPS.findIndex((x) => x.k === 'practice'); render(); await new Promise((x) => setTimeout(x, 700)); scrollTo(0, 0); }, on);
}

const SHOT_DIR2 = process.env.SHOT_DIR || '';
try {
  for (const W of [390, 1280]) {
    const { ctx, pg, f, errs } = await open(W, true);
    /* ① 식후 그림 원천 — 전체 단체 사진 · 가족 사진 · 추가 촬영(PHOTO_FIX · EXTRA_FIX) · 촬영 후 안내(_afterImg) = 전용 그림 · 파일이 실제로 있다 */
    const a = await f.evaluate(async () => { const u = [PHOTO_FIX.img, EXTRA_FIX.img, _afterImg().replace(/\?.*$/, '')]; const r = []; for (const x of u) { for (const y of [x, x.replace(/\.webp$/, '-640.webp')]) { const q = await fetch(y); r.push([y.replace(/^.*moments\//, ''), q.status]); } } return r; });
    ok(`${W} ① 식후 세 장 원천 = post-photo · post-extra · post-after(옛 close · close-end · guest-end 빌림 없음) · 큰 판 · 작은 판 모두 있음`, a.map((x) => x[0]).join(',') === 'post-photo.webp,post-photo-640.webp,post-extra.webp,post-extra-640.webp,post-after.webp,post-after-640.webp' && a.every((x) => x[1] === 200), a);
    /* ② 연습 목록 */
    await f.evaluate(async () => { idx = STEPS.findIndex((x) => x.k === 'practice'); render(); await new Promise((x) => setTimeout(x, 700)); });
    const b = await f.evaluate(async () => { const rows = [...document.querySelectorAll('.pr-list [data-fk="prj:_after"], .pr-list [data-fk^="prx:"]')];
      for (const r of rows) { r.scrollIntoView(); const i = r.querySelector('img'); if (i) i.loading = 'eager'; await new Promise((x) => setTimeout(x, 200)); }
      await new Promise((x) => setTimeout(x, 800));
      return rows.map((r) => { const i = r.querySelector('.pr-th img'); return [r.getAttribute('data-fk'), i ? (i.getAttribute('src') || '').replace(/^.*moments\//, '').replace(/\?.*$/, '') : '', i ? i.naturalWidth : 0]; }); });
    ok(`${W} ② 연습 목록 식후 세 줄 모두 그림(-640) · 불러와짐`, b.length === 3 && b.every((x) => /^post-(photo|after|extra)-640\.webp$/.test(x[1]) && x[2] > 0), b);
    if (SHOT_DIR2) { const el = await f.$('.pr-list [data-fk^="prx:_extra"]'); if (el) { await el.scrollIntoViewIfNeeded(); await pg.waitForTimeout(300); await pg.screenshot({ path: `${SHOT_DIR2}/${W}-practice-post.png` }); } }
    ok(`${W} 페이지 오류 0`, !errs.length, errs.slice(0, 3));
    await ctx.close();
  }
} catch (e) { console.log('FAIL 예외 ' + (e && e.stack || e)); fail++; }
await br.close(); srv.close();
console.log(fail ? `✗ POST_IMG_1124 실패 ${fail}건` : 'ok post-img — 식후 세 장(전체 단체 사진 · 촬영 후 안내 · 가족 사진 · 추가 촬영) 전용 그림 · 연습 목록 빈 칸 없음');
process.exit(fail ? 1 : 0);
