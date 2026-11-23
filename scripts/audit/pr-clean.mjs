#!/usr/bin/env node
/* ★★[PR_CLEAN_1123 2026-11-23 사장님 «여기도 정리가 필요해 보여 · 고객 입장에서 개선해봐»] ③ 연습하기 첫 화면 정리 — 실브라우저(390 · 1280 · 마이페이지 안)
   ① 연습 방법 고르기 칸(.pr-mode)은 없다 · 시작 카드 둘(A · B)이 같은 모양 · 같은 크기(폰은 위아래 · 600 이상은 나란히)
   ② AI 연습 읽기가 열린 예식(_ptOn): A = «AI 목소리로 먼저 듣기» — 처음 누르면 업체 전송 알림이 A 바로 아래 · 동의하면 PT.mode 'ai' · 흐름 보기(PRW flow) · 준비 칸도 A 아래
      _ptOn 이 꺼지면 A = «흐름 보기로 시작»(PT.mode 는 'ai' 가 아니다)
   ③ B = «직접 소리 내어 해보기» — PT.mode 'self' · PRW 'try' · 이 기기에 기억(me_pr_mode) → 골라서 연습하기(prFrom)가 마지막 고른 방법을 따른다
   ④ 안내 줄 = 머리 아래 한 줄(.mk-one) + «오늘 흐름» 칩 아래 회색 한 줄(.pr-home) · «재생은 디렉터가 …» 없음
   ⑤ «글로 한눈에 보기» · «음악 끄기»는 한 줄 나란히 같은 모양
   SHOT=디렉터리 → 390 · 1280 × AI 켬 · 끔 스크린샷  PW_OP = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
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
const rect = (f, sel) => f.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height), b: Math.round(r.bottom + scrollY) }; }, sel);
try {
  for (const W of [390, 1280]) {
    const { ctx, pg, f, errs } = await open(W, true);
    for (const on of [true, false]) {
      const tag = `${W} AI ${on ? '켬' : '끔'}`;
      await toPractice(f, on);
      if (SHOT_DIR) { await pg.setViewportSize({ width: W, height: W < 1000 ? 2300 : 1150 }); await wait(pg, 400); await pg.screenshot({ path: `${SHOT_DIR}/${W}-ai-${on ? 'on' : 'off'}.png` }); await pg.setViewportSize({ width: W, height: 900 }); await wait(pg, 300); if (process.env.SHOT_ONLY) continue; }
      const s = await f.evaluate(() => { const P = document.querySelector('.op.pr'), G = P.querySelector('.pr-grid'), pre = [...P.children].filter((e) => e !== G && !(e.compareDocumentPosition(G) & Node.DOCUMENT_POSITION_PRECEDING));
        const lines = pre.filter((e) => e.matches('p')).map((e) => e.className), fl = P.querySelector('.pr-flow');
        const t = (sel) => ((document.querySelector(sel) || {}).textContent || '').replace(/ /g, ' ');
        return { mode: !!document.querySelector('.pr-mode, [data-fk^="prm:"]'), lines, home: !!(fl && fl.querySelector('.pr-fcs + .pr-home')), homeTxt: t('.pr-home'), dir: /재생은 디렉터가/.test(P.textContent), role: !!P.querySelector('.pr-role'),
          a: t('[data-fk="prall"] .pr-hl b'), b: t('[data-fk="prtry"] .pr-hl b'), ad: t('[data-fk="prall"] .pr-hd'), bd: t('[data-fk="prtry"] .pr-hd'), ax: t('[data-fk="prall"] .pr-hx'), bx: t('[data-fk="prtry"] .pr-hx'),
          same: (() => { const a = document.querySelector('[data-fk="prall"]'), b = document.querySelector('[data-fk="prtry"]'); return !!(a && b) && a.className.replace(/ ?pr-hero| ?pr-try/g, '') === b.className.replace(/ ?pr-hero| ?pr-try/g, '') && !!a.querySelector('.pr-hm') && !!b.querySelector('.pr-hm'); })(),
          sw: document.documentElement.scrollWidth, vw: innerWidth }; });
      ok(`${tag} ① 연습 방법 고르기 칸 없음 · 시작 카드 둘이 같은 짜임(장면 그림 · 제목 · 설명 · 덧말)`, !s.mode && s.same && !!s.ad && !!s.bd && !!s.ax && !!s.bx, s);
      ok(`${tag} ② A 제목 = ${on ? '«AI 목소리로 먼저 듣기»' : '«흐름 보기로 시작»'} · B = «직접 소리 내어 해보기»`, s.a === (on ? 'AI 목소리로 먼저 듣기' : '흐름 보기로 시작') && s.b === '직접 소리 내어 해보기' && (on ? /AI 목소리/.test(s.ad) : /글로/.test(s.ad)) && /멈춰 기다려요/.test(s.bd), s);
      ok(`${tag} ④ 안내 = 머리 아래 한 줄 + «오늘 흐름» 칩 아래 회색 한 줄 · «재생은 디렉터가» 없음`, s.lines.length === 1 && /mk-one/.test(s.lines[0]) && s.home && /^집에서는 /.test(s.homeTxt) && !s.dir && !s.role, s);
      ok(`${tag} 가로 넘침 없음`, s.sw <= s.vw, s);
      const A = await rect(f, '[data-fk="prall"]'), B = await rect(f, '[data-fk="prtry"]');
      const pair = W < 600 ? (B.t >= A.b && A.l === B.l) : (A.t === B.t && B.l > A.l);
      ok(`${tag} ① A · B 같은 폭 · 같은 높이 · ${W < 600 ? '위아래' : '나란히'}`, Math.abs(A.w - B.w) <= 1 && Math.abs(A.h - B.h) <= 1 && pair, { A, B });
      const sv = await rect(f, '[data-fk="prsv"]'), mu = await rect(f, '[data-fk="prmu"]');
      ok(`${tag} ⑤ «글로 한눈에 보기» · «음악 끄기» 한 줄 나란히 같은 높이`, !!sv && !!mu && sv.t === mu.t && sv.h === mu.h && mu.l > sv.l, { sv, mu });
      if (on) {
        /* A 처음 = 알림(A 바로 아래) · 아직 시작 안 함 */
        await f.click('[data-fk="prall"]'); await wait(pg, 300);
        const k = await rect(f, '.pr-ask'), A2 = await rect(f, '[data-fk="prall"]'), B2 = await rect(f, '[data-fk="prtry"]');
        const a1 = await f.evaluate(() => ({ mode: PT.mode, ask: PT.askMode, big: !!LP.big }));
        ok(`${tag} ② A 처음 누름 = 업체 전송 알림이 A 바로 아래(${W < 600 ? 'B 위' : '두 카드 아래'}) · 아직 시작 안 함`, !!k && a1.ask && a1.mode !== 'ai' && !a1.big && k.t >= A2.b && k.t - A2.b <= 40 && (W < 600 ? k.b <= B2.t : k.t >= B2.b), { k, A2, B2, a1 });
        if (SHOT_DIR) { await f.evaluate(() => document.querySelector('.pr-ask').scrollIntoView({ block: 'center' })); await wait(pg, 200); await pg.screenshot({ path: `${SHOT_DIR}/${W}-ai-ask.png` }); }
        await f.click('[data-fk="prmyes"]'); await wait(pg, 250);
        const a2 = await f.evaluate(() => ({ mode: PT.mode, keep: localStorage.getItem('me_pr_mode'), ok: localStorage.getItem('me_ptts_ok'), w: PRW, wait: typeof PT.startAfter === 'function', big: !!LP.big, prep: !!document.getElementById('prPrep') }));
        const pp = await rect(f, '#prPrep'), A3 = await rect(f, '[data-fk="prall"]');
        ok(`${tag} ② 알림에서 «AI 목소리로 듣기» = AI 로 먼저(이 기기에 기억) + 흐름 보기로 시작(준비 중이면 준비 칸이 A 아래 · 다 되면 시작)`, a2.mode === 'ai' && a2.keep === 'ai' && a2.ok === '1' && a2.w === 'flow' && (a2.wait || a2.big) && (a2.big || (a2.prep && !!pp && pp.t >= A3.b)), { a2, pp, A3 });
        if (SHOT_DIR && !a2.big) { await pg.screenshot({ path: `${SHOT_DIR}/${W}-ai-prep.png` }); }
        await f.evaluate(() => { try { lsStop(); } catch (e) {} PT.startAfter = null; PT.prep = null; render(); }); await wait(pg, 300);
        /* 두 번째부터는 알림 없이 바로 */
        await f.click('[data-fk="prall"]'); await wait(pg, 250);
        const a3 = await f.evaluate(() => ({ ask: !!document.querySelector('.pr-ask'), mode: PT.mode, w: PRW, go: typeof PT.startAfter === 'function' || !!LP.big }));
        ok(`${tag} ② 동의한 뒤 A = 알림 없이 바로(준비되면 시작)`, !a3.ask && a3.mode === 'ai' && a3.w === 'flow' && a3.go, a3);
        await f.evaluate(() => { try { lsStop(); } catch (e) {} PT.startAfter = null; render(); }); await wait(pg, 300);
      }
      /* B = 직접 소리 내어 + 직접 해보기 */
      await f.click('[data-fk="prtry"]'); await wait(pg, 500);
      const b1 = await f.evaluate(() => ({ mode: PT.mode, keep: localStorage.getItem('me_pr_mode'), w: PRW, big: !!LP.big, prep: PT.prep, ai: _ptAi() }));
      ok(`${tag} ③ B = PT.mode 'self' · PRW 'try' · 이 기기에 기억 · 바로 시작(AI 준비 없음)`, b1.mode === 'self' && b1.keep === 'self' && b1.w === 'try' && b1.big && !b1.prep && !b1.ai, b1);
      await f.evaluate(() => { try { lsStop(); } catch (e) {} render(); }); await wait(pg, 300);
      if (!on) {
        await f.click('[data-fk="prall"]'); await wait(pg, 500);
        const a4 = await f.evaluate(() => ({ mode: PT.mode, w: PRW, big: !!LP.big, ask: !!document.querySelector('.pr-ask') }));
        ok(`${tag} ② AI 꺼짐 A = 흐름 보기로 바로 시작(알림 없음 · AI 아님)`, a4.mode !== 'ai' && a4.w === 'flow' && a4.big && !a4.ask, a4);
        await f.evaluate(() => { try { lsStop(); } catch (e) {} render(); }); await wait(pg, 300);
      }
    }
    ok(`${W} 페이지 오류 0`, !errs.length, errs.slice(0, 3));
    await ctx.close();
  }
} catch (e) { console.log('FAIL 예외 ' + (e && e.stack || e)); fail++; }
await br.close(); srv.close();
console.log(fail ? `✗ PR_CLEAN_1123 실패 ${fail}건` : 'ok pr-clean — 연습 첫 화면: 시작 카드 둘(AI 로 먼저 · 직접 소리 내어) · 고르기 칸 없음 · 안내 두 줄 · 작은 단추 한 줄');
process.exit(fail ? 1 : 0);
