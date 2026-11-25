#!/usr/bin/env node
/* ★★[PR_SIMPLE_1124 2026-11-24 사장님 «우측 골라서 연습하기가 같은 역할 아니야? 중복되는 거 전부 삭제 심플하게» · «ai 목소리 먼저 듣기 이거는 삭제하자»(→ «카드 하나만 남기기») ·
     «역할 전달하기 · 연습하기 페이지랑 분리해서 연습하기 전담으로» · «이건뭐지?»(그림 위 ▶)] ③ 연습하기 첫 화면 — 실브라우저(390 · 1280 · 마이페이지 안) · PR_CLEAN_1123 검사(pr-clean)를 잇는다
   ① «오늘 흐름»(.pr-flow · 자리 차례) 없음 · 머리 아래 한 줄 = «집에서는 …» · «예식 순서 n · 말하는 차례가 오면 …» 없음
   ② 시작 카드 하나(«직접 소리 내어 해보기» · prtry) · A(prall «AI 목소리로 먼저 듣기» / «흐름 보기로 시작») · 업체 전송 알림 · AI 준비 칸 없음 · AI 스위치가 켜진 예식이어도 같다
      덧말 «연습 약 n분 · 두 분 속도에 따라 달라요»(n = 실제 연습 줄 계산) · 폰 · PC 모두 그림 위 글 아래(그림이 왼쪽 칸 폭을 다 쓴다)
   ③ 그림 위 ▶ 동그라미(.pr-hp) 없음 · 제목 끝 ›
   ④ 누르면 직접 해보기(PT.mode 'self' · PRW 'try') · 연습하기에서 AI 로 읽기 꺼짐(_ptAi false · PT.mode 'ai' 여도)
   ⑤ «역할 전달하기»는 연습하기에 없다(재생 중 «이 역할 전달하기» 포함) · ④ 완성 화면에 있다
   ⑥ «글로 한눈에 보기» · «음악 끄기» 한 줄 · «골라서 연습하기» 목록 그대로 · 가로 넘침 없음 · 페이지 오류 0
   SHOT_DIR=디렉터리 → 390 · 1280 스크린샷  PW_OP = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
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
const rect = (f, sel) => f.evaluate((sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { l: Math.round(r.left), t: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height), b: Math.round(r.bottom + scrollY), r: Math.round(r.right) }; }, sel);
try {
  for (const W of [390, 1280]) {
    const { ctx, pg, f, errs } = await open(W, true);
    for (const on of [true, false]) {
      const tag = `${W} AI 스위치 ${on ? '켬' : '끔'}`;
      await toPractice(f, on);
      if (SHOT_DIR && on) { await pg.setViewportSize({ width: W, height: W < 1000 ? 2000 : 1000 }); await wait(pg, 400); await pg.screenshot({ path: `${SHOT_DIR}/${W}-practice.png` }); await pg.setViewportSize({ width: W, height: 900 }); await wait(pg, 300); }
      const s = await f.evaluate(() => { const P = document.querySelector('.op.pr'), t = (sel) => ((document.querySelector(sel) || {}).textContent || '').replace(/ /g, ' ');
        return { flow: !!document.querySelector('.pr-flow, .pr-fcs'), one: [...P.querySelectorAll('p.mk-one')].map((e) => e.textContent), cnt: /예식 순서 \d+ ·|말하는 차례가 오면 화면이 알려/.test(P.textContent),
          a: !!document.querySelector('[data-fk="prall"]'), ask: !!document.querySelector('.pr-ask, [data-fk="prmyes"]'), prep: !!document.getElementById('prPrep'), aiTxt: /AI 목소리로 먼저 듣기|흐름 보기로 시작/.test(P.textContent),
          n: document.querySelectorAll('.pr-sts > .pr-st').length, b: t('[data-fk="prtry"] .pr-hl b'), bx: t('[data-fk="prtry"] .pr-hx'), est: Math.round(_prEstMs(_lRows()) / 60000),
          hp: document.querySelectorAll('.pr-hp').length, cv: getComputedStyle(document.querySelector('[data-fk="prtry"] .pr-hl b'), '::after').content,
          roles: !!P.querySelector('.pr-roles, [data-fk^="prrole:"]'), list: document.querySelectorAll('.pr-list [data-fk^="prj:"]').length, sw: document.documentElement.scrollWidth, vw: innerWidth }; });
      ok(`${tag} ① «오늘 흐름» 없음 · 머리 아래 한 줄 = «집에서는 …» · «예식 순서 n» 줄 없음`, !s.flow && s.one.length === 1 && /^집에서는 입장 출발점/.test(s.one[0]) && !s.cnt, s);
      ok(`${tag} ② 시작 카드 하나(직접 소리 내어 해보기) · AI 카드 · 알림 · 준비 칸 없음`, !s.a && !s.ask && !s.prep && !s.aiTxt && s.n === 1 && s.b === '직접 소리 내어 해보기', s);
      ok(`${tag} ② 덧말 «연습 약 n분 · 두 분 속도에 따라 달라요»(실제 계산)`, s.bx === '연습 약 ' + s.est + '분 · 두 분 속도에 따라 달라요', { bx: s.bx, est: s.est });
      ok(`${tag} ③ 그림 위 ▶ 없음 · 제목 끝 ›`, s.hp === 0 && /›|203A/.test(s.cv), { hp: s.hp, cv: s.cv });
      ok(`${tag} ⑤ 연습하기에 «역할 전달하기» 없음 · ⑥ «골라서 연습하기» 목록 그대로 · 가로 넘침 없음`, !s.roles && s.list >= 10 && s.sw <= s.vw, s);
      const im = await rect(f, '[data-fk="prtry"] .pr-hm'), hl = await rect(f, '[data-fk="prtry"] .pr-hl');
      const ld = await rect(f, '.pr-lead');
      ok(`${tag} ② 카드 짜임 — 그림 위 · 글 아래 · 그림이 왼쪽 칸 폭을 다 쓴다`, hl.t >= im.b - 1 && (!ld || Math.abs(im.w - ld.w) <= 2), { im, hl, ld });
      const sv = await rect(f, '[data-fk="prsv"]'), mu = await rect(f, '[data-fk="prmu"]');
      ok(`${tag} ⑥ «글로 한눈에 보기» · «음악 끄기» 한 줄`, !!sv && !!mu && sv.t === mu.t, { sv, mu });
      await f.evaluate(() => { PT.mode = 'ai'; });
      const ai = await f.evaluate(() => _ptAi());
      ok(`${tag} ④ 연습하기 AI 로 읽기 꺼짐(PT.mode 'ai' 여도 _ptAi false)`, ai === false, ai);
      await f.click('[data-fk="prtry"]'); await wait(pg, 600);
      if (await f.$('.ord-ask.on')) { await f.click('.ord-ask.on .oa-no'); await wait(pg, 600); }   /* [PR_RZ_ASK_1125] 앞 바퀴에 멈춘 기록이 있으면 «이어서» 창 — «처음부터» */
      const b1 = await f.evaluate(() => ({ mode: PT.mode, w: PRW, big: !!LP.big, role: !!document.querySelector('[data-fk="lfrole"]') }));
      ok(`${tag} ④ 누르면 직접 해보기(self · try · 크게 보기) · 재생 중 «이 역할 전달하기» 없음`, b1.mode === 'self' && b1.w === 'try' && b1.big && !b1.role, b1);
      await f.evaluate(() => { try { lsStop(); } catch (e) {} render(); }); await wait(pg, 300);
    }
    /* ⑤ 완성 화면에 역할 전달하기 */
    await f.evaluate(async () => { try { lsStop(); } catch (e) {} idx = STEPS.findIndex((x) => x.k === 'done'); render(); await new Promise((x) => setTimeout(x, 600)); });
    const d = await f.evaluate(() => ({ roles: document.querySelectorAll('.pr-roles [data-fk^="prrole:"]').length, h: ((document.querySelector('.pr-roles h4') || {}).textContent || '') }));
    ok(`${W} ⑤ ④ 완성 화면에 «역할 전달하기»(그분 몫 단추)`, d.roles >= 1 && d.h === '역할 전달하기', d);
    if (SHOT_DIR) { const el = await f.$('.pr-roles'); if (el) { await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: `${SHOT_DIR}/${W}-done-roles.png` }); } }
    ok(`${W} 페이지 오류 0`, !errs.length, errs.slice(0, 3));
    await ctx.close();
  }
} catch (e) { console.log('FAIL 예외 ' + (e && e.stack || e)); fail++; }
await br.close(); srv.close();
console.log(fail ? `✗ PR_SIMPLE_1124 실패 ${fail}건` : 'ok pr-simple — 연습 첫 화면: 오늘 흐름 · AI 카드 없음 · 시작 카드 하나(›) · 역할 전달은 완성 화면');
process.exit(fail ? 1 : 0);
