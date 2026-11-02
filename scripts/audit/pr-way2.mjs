#!/usr/bin/env node
/* ★★[PR_WAY_198 검토 198-2] ③ 연습하기 2단계
   ⑨ «이 순간만 연습» — 그 순간이 끝나면 첫 줄에 멈춰 «한 번 더 / 다음 순간» · 한 번 더 = 곡 자리 기억을 비우고(lpCut) 그 순간으로 새로 · 영상 0초
   ⑩ 입장 — «입장!» 구호 줄 앞 5초 준비(입장 곡은 그 뒤에) · 다른 순간엔 준비 없음 · 직접 해보기에서 입장 걷기 줄은 «다 했어요»를 기다림
   ⑪ 이어서 연습 — 문장 자리까지 적고 · 첫 화면에 «어디서부터»를 먼저(자동 재생 없음) · 누르면 그 줄부터 · 순서가 바뀌면 바뀐 순간부터 · 끝까지 하면 지움
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
  await f.evaluate(async () => { try { localStorage.removeItem('me_pr_at'); } catch (e) {} idx = STEPS.findIndex((x) => x.k === 'practice'); render(); await new Promise((x) => setTimeout(x, 600)); });
  /* ⑩ */
  const p = await f.evaluate(async () => { const w = (ms) => new Promise((x) => setTimeout(x, ms)), B = BgmBed._t; prStart('flow'); await w(900);
    lsGoK('entry'); await w(300); const st = LP.q[LP.i], o = { k: st.k, prep: LP.prep && LP.prep.n, num: ((document.querySelector('#lsFull .lf-prepn') || {}).textContent || ''), main: ((document.querySelector('#lsFull [data-fk="lfmain"]') || {}).textContent || ''), entF: !!(B.BED.cur && B.BED.cur.f === '@ENT') };
    await w(5600); o.after = !LP.prep && LP.q[LP.i] && LP.q[LP.i].k === 'entry';
    lsGoK('ring'); await w(300); o.ring = !LP.prep;
    lsGoK('entry'); await w(300); o.prep2 = !!LP.prep; prNext(); await w(200); o.skip = !LP.prep && LP.q[LP.i].k === 'entry' && LP.q[LP.i] === st;
    PRW = 'try'; const wk = LP.q.find((x) => x.k === 'entry' && x.act); o.walkWait = !!(wk && _prWait(wk)); PRW = 'flow'; return o; });
  ok('⑩ 입장 «입장!» 줄 앞 5초 준비(5 · 바로 «입장!» 단추 · 그동안 입장 곡 아님) · 5초 뒤 그 줄', p.k === 'entry' && p.prep === 5 && p.num === '5' && /입장!/.test(p.main) && !p.entF && p.after, p);
  ok('⑩ 다른 순간엔 준비 없음 · «바로 «입장!»»은 준비를 건너뛰고 같은 줄 · 직접 해보기에서 입장 걷기 줄은 기다림', p.ring && p.prep2 && p.skip && p.walkWait, p);
  /* ⑨ */
  const o = await f.evaluate(async () => { const w = (ms) => new Promise((x) => setTimeout(x, ms)); let cut = 0; const c0 = BgmBed.lpCut; BgmBed.lpCut = function () { cut++; return c0.apply(this, arguments); };
    lsGoK('ring'); await w(200); const btn = !!document.querySelector('#lsFull [data-fk="lfonly"]'); prOnly(); await w(200); const r = { btn, only: LP.only, cut1: cut, first: LP.q[LP.i - 1] ? LP.q[LP.i - 1].k !== 'ring' : true };
    let last = LP.i; while (LP.q[last + 1] && LP.q[last + 1].k === 'ring') last++; LP.i = last; clearTimeout(LP.t); _lNext(); await w(200);
    r.end = LP.onlyEnd; r.atFirst = LP.q[LP.i].k === 'ring' && (!LP.q[LP.i - 1] || LP.q[LP.i - 1].k !== 'ring'); r.paused = LP.paused; r.again = ((document.querySelector('#lsFull [data-fk="lfagain1"]') || {}).textContent || ''); r.main = ((document.querySelector('#lsFull [data-fk="lfmain"]') || {}).textContent || '');
    const v = document.querySelector('#lsFull video'); if (v) { try { v.currentTime = 2; } catch (e) {} }
    prOnlyAgain(); await w(300); r.again2 = { only: LP.only, end: LP.onlyEnd, paused: LP.paused, k: LP.q[LP.i].k, cut: cut, vt: v ? (document.querySelector('#lsFull video') || {}).currentTime : 0 };
    LP.i = last; clearTimeout(LP.t); _lNext(); await w(100); prOnlyNext(); await w(200); r.next = { k: LP.q[LP.i].k, only: LP.only };
    BgmBed.lpCut = c0; return r; });
  ok('⑨ «이 순간만 연습» — 그 순간 처음부터 · 끝나면 첫 줄에 멈춤 · «한 번 더» · 아래 «다음 순간»', o.btn && o.only === 'ring' && o.cut1 >= 1 && o.end === 'ring' && o.atFirst && o.paused && o.again === '한 번 더' && o.main === '다음 순간', o);
  ok('⑨ 한 번 더 = 곡 자리 비우고(lpCut) 같은 시작점 · 영상 0초 · 다음 순간 = 다음 순간으로 · 이 순간만 꺼짐', o.again2.only === 'ring' && !o.again2.end && !o.again2.paused && o.again2.k === 'ring' && o.again2.cut > o.cut1 && o.again2.vt < 1 && o.next.k !== 'ring' && !o.next.only, o);
  /* ⑪ */
  const r = await f.evaluate(async () => { const w = (ms) => new Promise((x) => setTimeout(x, ms)); PRW = 'try';
    const Q = LP.q; let j = -1, c = 0; for (let i = 0; i < Q.length; i++) { if (Q[i].k === 'vow' && Q[i].talk2 && Q[i].who === '신부') { c++; if (c === 2) { j = i; break; } } }
    LP.i = j; LP.paused = false; _lShow(); await w(200); const sv = JSON.parse(localStorage.getItem('me_pr_at') || 'null'); const want = { k: Q[j].k, who: Q[j].who, txt: Q[j].txt };
    try { lsStop(); } catch (e) {} lsCloseBig(); await w(300); idx = STEPS.findIndex((x) => x.k === 'practice'); render(); await w(500);
    const card = { d1: ((document.querySelector('.pr-rz1') || {}).textContent || ''), d2: ((document.querySelector('.pr-rz2') || {}).textContent || ''), btn: !!document.querySelector('[data-fk="prres"]'), playing: !!(LP.q.length && !LP.paused) };
    prResume(); await w(1200); const st = LP.q[LP.i]; const got = { k: st.k, who: st.who, txt: st.txt, way: PRW };
    try { lsStop(); } catch (e) {} lsCloseBig(); await w(300);
    const o2 = JSON.parse(localStorage.getItem('me_pr_at')); const rs = o2.rows.split(','); const vi = rs.indexOf('vow'); [rs[0], rs[1]] = [rs[1], rs[0]]; o2.rows = rs.join(','); localStorage.setItem('me_pr_at', JSON.stringify(o2));
    idx = STEPS.findIndex((x) => x.k === 'practice'); render(); await w(400); const ch = { d1: ((document.querySelector('.pr-rz1') || {}).textContent || ''), d2: ((document.querySelector('.pr-rz2') || {}).textContent || '') };
    prStart('flow'); await w(600); idx = STEPS.findIndex((x) => x.k === 'practice'); LP.all = true; _lEnd(); await w(100); const gone = localStorage.getItem('me_pr_at') === null;
    return { sv, want, card, got, ch, gone }; });
  ok('⑪ 문장 자리까지 적음 — «혼인 서약 · 신부 두 번째 문장» · «앞쪽 중앙에서 서로 마주 봐요»', r.sv && r.sv.d1 === '혼인 서약 · 신부 두 번째 문장' && r.sv.d2 === '앞쪽 중앙에서 서로 마주 봐요' && r.sv.way === 'try', r.sv);
  ok('⑪ 첫 화면에 어디서부터 먼저 · 자동 재생 없음 · 누르면 그 문장부터(같은 방식)', r.card.d1 === r.sv.d1 && r.card.d2 === r.sv.d2 && r.card.btn && !r.card.playing && r.got.k === r.want.k && r.got.who === r.want.who && r.got.txt === r.want.txt && r.got.way === 'try', { card: r.card, got: r.got, want: r.want });
  ok('⑪ 순서가 바뀌면 바뀐 순간부터 · 끝까지 하면 기록 지움', /· 처음부터$/.test(r.ch.d1) && /순서가 바뀌어/.test(r.ch.d2) && r.gone, { ch: r.ch, gone: r.gone });
  ok('페이지 오류 0', !errs.length, errs.slice(0, 3));
  await ctx.close();
} catch (e) { console.log('FAIL 예외 ' + (e && e.stack || e)); fail++; }
await br.close(); srv.close();
console.log(fail ? `✗ PR_WAY_198-2 실패 ${fail}건` : 'ok pr-way2 — 이 순간만 연습 · 입장 준비 5초 · 이어서 연습');
process.exit(fail ? 1 : 0);
