#!/usr/bin/env node
/* ★★[PR_WAY_198 검토 198-3] ⑫ «이 역할 전달하기» — 부모님 · 축사 · 선언하실 분께 그분 몫만
   ① 연습 첫 화면 «역할 전달하기» 목록(그 식순에 있는 역할만) ② 복사 글 = 안내 음성 · 읽으실 글 · 하실 일 · 마치면(두 분 · 하객 몫은 빠짐) + 읽기 전용 링크
   ③ 링크(role.html#r=…)를 열면 그분 몫만 · 고칠 칸 없음 · noindex ④ 크게 보기 선언 · 축사 요약 줄에도 같은 단추
   PW_OP = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
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
  await f.evaluate(async () => { idx = STEPS.findIndex((x) => x.k === 'practice'); render(); await new Promise((x) => setTimeout(x, 700)); });
  const a = await f.evaluate(async () => { const ids = [...document.querySelectorAll('.pr-roles [data-fk^="prrole:"]')].map((b) => b.getAttribute('data-fk').slice(7));
    let got = ''; const c0 = navigator.clipboard; try { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: (t) => { got = t; return Promise.resolve(); } } }); } catch (e) {}
    const T = {}; for (const id of ['declare', 'free', 'par']) { got = ''; prRole(id); await new Promise((x) => setTimeout(x, 50)); T[id] = got; }
    return { ids, T }; });
  ok('① 첫 화면 «역할 전달하기» — 선언 · 축사 · 부모님', ['declare', 'free', 'par'].every((x) => a.ids.includes(x)), a.ids);
  const D = a.T.declare, F = a.T.free, P = a.T.par;
  ok('② 선언 — 안내 음성 · 읽으실 글(선언문) · 자리로 돌아가는 안내 · 하객 박수 줄 없음 · 링크', /^\[성혼 선언을 읽어 주실 분께\]/.test(D) && /안내 음성 · 오늘의 성혼 선언은/.test(D) && /읽으실 글[^\n]*\n이제 신랑/.test(D) && /자리로 돌아가셔도/.test(D) && !/하객이 박수/.test(D) && /role\.html#r=/.test(D), D.slice(0, 400));
  ok('② 축사 — 읽으실 글 · 마치면 자리로(없던 안내를 한 줄)', /읽으실 글/.test(F) && /마치면 · 자리로 돌아가 앉아 주세요/.test(F), F.slice(0, 300));
  ok('② 부모님 — 앉을 자리 · 화촉(두 분 몫 빼고) · 인사 받기(안아 주세요) · 서로 인사 차례', /정면 첫 줄/.test(P) && /양가 어머님이 앞으로 나와 불을 밝혀요/.test(P) && !/신랑 신부는 입장 전/.test(P) && /부모님께서는 두 사람을 따뜻하게 안아/.test(P) && /서로 인사/.test(P), P.slice(0, 500));
  /* ③ 링크 열기 */
  const url = (D.match(/https?:\/\/\S+role\.html#r=\S+/) || [])[0];
  const pg2 = await ctx.newPage(); const e2 = []; pg2.on('pageerror', (e) => e2.push(e.message)); await pg2.goto(url, { waitUntil: 'load' }); await pg2.waitForTimeout(300);
  const r = await pg2.evaluate(() => ({ h1: (document.querySelector('h1') || {}).textContent || '', mo: document.querySelectorAll('.mo').length, say: ((document.querySelector('.st.say .tx') || {}).textContent || '').slice(0, 20), inputs: document.querySelectorAll('input,textarea,[contenteditable]').length, robots: (document.querySelector('meta[name=robots]') || {}).content || '', sw: document.documentElement.scrollWidth, vw: innerWidth }));
  ok('③ 읽기 전용 쪽 — 제목 · 그 순간 · 읽으실 글 · 고칠 칸 없음 · noindex · 가로 넘침 없음', r.h1 === '성혼 선언을 읽어 주실 분께' && r.mo >= 1 && /^이제 신랑/.test(r.say) && r.inputs === 0 && /noindex/.test(r.robots) && r.sw <= r.vw && !e2.length, { r, e2 });
  if (SHOT) await pg2.screenshot({ path: SHOT.replace(/\.png$/, '') + '-role.png', fullPage: true });
  await pg2.goto(url.replace(/#r=.*/, '#r=xx'), { waitUntil: 'load' }); await pg2.waitForTimeout(200);
  ok('③ 링크가 깨졌으면 한 줄 안내', /안내를 열지 못했어요/.test(await pg2.evaluate(() => document.body.textContent)), '');
  /* ④ 크게 보기 */
  const b = await f.evaluate(async () => { prStart('flow'); await new Promise((x) => setTimeout(x, 800)); const j = LP.q.findIndex((x) => x.k === 'declare' && x.sum); LP.i = j; LP.paused = true; clearTimeout(LP.t); _lFull(); await new Promise((x) => setTimeout(x, 100)); return !!document.querySelector('#lsFull [data-fk="lfrole"]'); });
  ok('④ 크게 보기 선언 요약 줄에 «이 역할 전달하기»', b, b);
  if (SHOT) await pg.screenshot({ path: SHOT.replace(/\.png$/, '') + '-start.png', fullPage: false });
  ok('페이지 오류 0', !errs.length, errs.slice(0, 3));
  await ctx.close();
} catch (e) { console.log('FAIL 예외 ' + (e && e.stack || e)); fail++; }
await br.close(); srv.close();
console.log(fail ? `✗ PR_WAY_198-3 실패 ${fail}건` : 'ok pr-way3 — 역할 전달하기(복사 글 · 읽기 전용 링크)');
process.exit(fail ? 1 : 0);
