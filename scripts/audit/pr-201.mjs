#!/usr/bin/env node
/* ★★[PR_REVIEW_201 검토 201 · 연습 개편 최종 검수] 상1 축배 펼친 동작 줄도 «다 했어요» 대기 · 상2 역할 전달(화촉 맞절 · 하객 인사 · 착석 · 덕담 마친 뒤) · 중3 완료 화면 재생 단추 = 한 번 더 · 중4 촬영 후 안내만 연습 = 식후 블록 · 중5 A ↔ B 바꾸면 곡 크기 바로
   하네스는 pr-way4 와 같다 · 종료 0 통과 · 1 실패 · 2 재지 못함 */
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



try {
  const { ctx, pg, f, errs } = await open(390, true);
  await f.evaluate(async () => { S.on.bless = 1; S.candleWho = 'mothers'; try { opSync(); } catch (e) {} _persist(); idx = STEPS.findIndex((x) => x.k === 'practice'); render(); await new Promise((x) => setTimeout(x, 700)); });
  const r = await f.evaluate(async () => { const w = (ms) => new Promise((x) => setTimeout(x, ms)); prStart('try'); await w(900); LP.paused = true; clearTimeout(LP.t);
    const o = {};
    const tq = LP.q.filter((x) => x.k === 'toast' && /잔을 들고 하객을 바라봐요|화답을 기다리며/.test(x.txt || '')); o.toast = tq.map((x) => [!!x.act, x.who2, _prWait(x), x.ms > 0]);
    const par = _prRoleOf('par') || { m: [] }; const cd = par.m.find((m) => /화촉/.test(m.n)) || { s: [] }, bl = par.m.find((m) => /덕담/.test(m.n)) || { s: [] };
    o.candle = cd.s.map((x) => x[0] + ':' + String(x[1]).slice(0, 40)); o.bless = bl.s.map((x) => x[0] + ':' + String(x[1]).slice(0, 30));
    /* 중4 */
    const ai = LP.q.findIndex((x) => x.seg === '_after'); LP.i = ai; LP.paused = false; prOnly(); await w(300); o.only = LP.only; o.at = LP.q[LP.i] && [LP.q[LP.i].seg, LP.q[LP.i].k]; o.before = LP.q[LP.i - 1] && LP.q[LP.i - 1].seg;
    /* 중3 — 이 순간 끝 */
    LP.paused = true; clearTimeout(LP.t); let j = LP.i; while (LP.q[j + 1] && _oK(LP.q[j + 1]) === '_after') j++; LP.i = j; LP.wait = null; _lNext(); await w(100); _lFull(); await w(60);
    o.end = LP.onlyEnd; const tg = document.querySelector('#lsFull [data-fk="lftog"]'); o.tog = tg && tg.getAttribute('onclick'); if (tg) tg.click(); await w(300); o.after = [LP.onlyEnd, LP.only, LP.q[LP.i] && LP.q[LP.i].seg];
    /* 중5 */
    try { lsStop(); } catch (e) {} prStart('try'); await w(600); LP.paused = true; clearTimeout(LP.t); let n = 0; const B = window.BgmBed, keep = B && B.lpLevel; if (B) B.lpLevel = function () { n++; }; window._bedOn = function () { return true; };
    const k = LP.q.findIndex((x) => x.act && x.who2 === 'couple'); LP.i = k; LP.paused = false; _lShow(); await w(200); prWay('flow'); prWay('try'); o.lv = n; if (B) B.lpLevel = keep;
    return o; });
  ok('상1 축배 펼친 두 동작 줄 = 동작 · 두 분 · B 대기 · 시간 있음', r.toast.length === 2 && r.toast.every((x) => x[0] && x[1] === 'couple' && x[2] && x[3]), r.toast);
  ok('상2 화촉 역할 = 점화 뒤 맞절 · 하객께 인사 · 자리로 · 착석 안내까지', r.candle.some((x) => /^하실 일:.*자리로/.test(x)) && r.candle.some((x) => /^안내 음성:.*맞절/.test(x)), r.candle);
  ok('상2 덕담 역할 = 마친 뒤 «마이크 · 자리로» 한 줄', r.bless.some((x) => /^마치면:마이크는 디렉터에게/.test(x)), r.bless);
  ok('중4 촬영 후 안내에서 «이 순간만 연습» = 식후 블록 첫 줄(단체 사진)부터 · 닫는 인사 아님', r.only === '_after' && r.at && r.at[0] === '_after' && r.before !== '_after', r);
  ok('중3 완료 화면 재생 단추 = 한 번 더(처음부터 · 완료 표시 걷힘)', r.end === '_after' && /prOnlyAgain/.test(r.tog || '') && r.after[0] == null && r.after[1] === '_after' && r.after[2] === '_after', r);
  ok('중5 재생 중 A ↔ B 바꾸면 곡 크기 갱신을 부른다', r.lv >= 2, r.lv);
  ok('페이지 오류 0', !errs.length, errs.slice(0, 3));
  await ctx.close();
} catch (e) { console.log('FAIL 예외 ' + (e && e.stack || e)); fail++; }
await br.close(); srv.close();
console.log(fail ? `✗ PR_REVIEW_201 실패 ${fail}건` : 'ok pr-201 — 축배 동작 대기 · 역할 전달 · 완료 화면 · 촬영 후 안내 범위 · 음악 크기');
process.exit(fail ? 1 : 0);
