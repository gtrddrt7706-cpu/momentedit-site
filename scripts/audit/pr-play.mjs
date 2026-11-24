#!/usr/bin/env node
/* ★★[PR_PLAY_1124 2026-11-24 사장님 «(연습 재생 화면) 여기도 디자인적으로 그리고 고객 입장에서 보고 개선하자»] ③ 연습하기 크게 보기(재생 화면) — 실브라우저(390 · 1280 · 마이페이지 안)
   ① 진행 막대(.lf-seg) 없음(머리 «n / 13 · 예식 순서» · PC 오른쪽 목록과 겹쳤다)
   ② «이 순간만 연습»은 제목 줄 오른쪽(같은 줄)
   ③ 자리 알약(지금 두 분 · …)과 작은 이름표(하객 입장 때 · 두 분이 앞에 서면)는 한 줄(.lf-meta)
   ④ 여는 멘트 이름표에 제목 «여는 멘트 · »를 다시 쓰지 않는다
   ⑤ 목록 줄에 «당일»을 되풀이하지 않는다 — PC 오른쪽 목록 머리 «당일 기준» 한 번 · 첫 화면 «골라서 연습하기» 덧말에 한 번
   ⑥ «불러오는 중»은 한 줄 — 곡을 받는 중이면 «음악을 불러오는 중이에요»만(위 «불러오는 중…» 줄 없음 · 실패 알림은 그대로)
   ⑦ 가로 넘침 없음 · 페이지 오류 0
   ⑧ «흐름 보기 · 직접 해보기» 위아래 간격이 같다(종전 위 24 · 아래 0 — 그림에 붙었다 · 사장님 «버튼 간격이 좀 이상하지 않아?»)
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


const SHOT_DIR = process.env.SHOT_DIR || '';
async function toPractice(f, on) {
  await f.evaluate(async (on) => { try { lsStop(); } catch (e) {} RitualOpen.FEATURE.practiceTts = on; try { localStorage.removeItem('me_ptts_ok'); localStorage.removeItem('me_pr_mode'); } catch (e) {}
    PT.mode = ''; PT.askMode = false; PT.prep = null; PT.startAfter = null; PRW = 'flow';
    idx = STEPS.findIndex((x) => x.k === 'practice'); render(); await new Promise((x) => setTimeout(x, 700)); scrollTo(0, 0); }, on);
}
const step = async (f, pg, n) => { for (let i = 0; i < n; i++) { await f.evaluate(() => { try { prNext(); } catch (e) {} }); await wait(pg, 350); } await wait(pg, 500); };
const look = (f) => f.evaluate(() => { const F = document.getElementById('lsFull'), q = (s) => F.querySelector(s), r = (e) => e ? e.getBoundingClientRect() : null;
  const h3 = r(q('h3')), on = r(q('[data-fk="lfonly"]')), pos = q('.lf-pos'), lab = q('.lf-lab'), meta = q('.lf-meta');
  return { k: (LP.q[LP.i] || {}).k, seg: !!q('.lf-seg'), h3t: h3 && h3.top, h3b: h3 && h3.bottom, ont: on && on.top, onb: on && on.bottom, hrow: !!q('.lf-hrow h3') && !!q('.lf-hrow [data-fk="lfonly"]'),
    pos: !!pos, meta: !!meta, metaPos: !!(meta && meta.contains(pos)), metaLab: !!(meta && meta.contains(lab)), posT: pos && r(pos).top, labT: lab && r(lab).top, posB: pos && r(pos).bottom, labB: lab && r(lab).bottom,
    lab: lab && lab.textContent, rails: [...F.querySelectorAll('.lf-rail .lf-rm')].map((e) => e.textContent), rh: (q('.lf-rail .lf-rh') || {}).textContent || '', railVis: !!(q('.lf-rail') && q('.lf-rail').offsetParent),
    sw: document.documentElement.scrollWidth, vw: innerWidth,
    gap: (() => { const h = F.querySelector('.lf-h').getBoundingClientRect(), w = F.querySelector('.lf-way').getBoundingClientRect(), nx = [...F.querySelectorAll('.lf-body > *')].find((e) => e.getBoundingClientRect().height > 0); return nx ? [Math.round(w.top - h.bottom), Math.round(nx.getBoundingClientRect().top - w.bottom)] : null; })() }; });
try {
  for (const W of [390, 1280]) {
    const { ctx, pg, f, errs } = await open(W, true);
    await toPractice(f, true);
    const L = await f.evaluate(() => ({ note: ((document.querySelector('.pr-pick .mk-note') || {}).textContent || ''), mins: [...document.querySelectorAll('.pr-list .pr-min')].map((e) => e.textContent) }));
    ok(`${W} ⑤ 첫 화면 목록 — 줄마다 «당일» 없음 · 덧말에 «당일 기준» 한 번`, L.mins.length >= 8 && !L.mins.some((m) => /당일/.test(m)) && L.mins.some((m) => /^약\s/.test(m)) && /시간은\s당일\s기준이에요/.test(L.note), L);
    await f.click('[data-fk="prtry"]'); await wait(pg, 1000);
    let s = await look(f);
    ok(`${W} ① 진행 막대 없음(하객 맞이)`, !s.seg, s);
    ok(`${W} ⑧ «흐름 보기 · 직접 해보기» 위아래 간격 같음(그림 있는 줄)`, s.gap && s.gap[0] >= 10 && Math.abs(s.gap[0] - s.gap[1]) <= 2, s.gap);
    ok(`${W} ② «이 순간만 연습» 제목 줄 오른쪽(같은 줄)`, s.hrow && s.ont < s.h3b && s.onb > s.h3t, s);
    ok(`${W} ③ 자리 알약 + «안내 음성 · 하객 입장 때» 한 줄([PR_CLEAR_1124] 이름표)`, s.pos && s.meta && s.metaPos && s.metaLab && s.lab === '안내 음성 · 하객 입장 때' && s.posT < s.labB && s.labT < s.posB, s);
    if (W > 1000) ok(`${W} ⑤ 오른쪽 목록 — 머리 «당일 기준» · 줄마다 «당일» 없음`, s.railVis && /당일\s기준/.test(s.rh) && s.rails.length >= 8 && !s.rails.some((m) => /당일/.test(m)), { rh: s.rh, rails: s.rails });
    await step(f, pg, 4); s = await look(f);
    ok(`${W} ④ 여는 멘트 이름표 — 제목을 다시 쓰지 않는다(«안내 음성 · 예식 시작 시각에» · [PR_CLEAR_1124])`, s.lab === '안내 음성 · 예식 시작 시각에' && !s.seg, s);
    await step(f, pg, 13); s = await look(f);
    ok(`${W} ③ 입장 — 자리 알약 + «두 분이 앞에 서면» 한 줄 · ① 막대 없음`, s.k === 'entry' && s.metaPos && s.metaLab && !s.seg && s.posT < s.labB && s.labT < s.posB, s);
    const d = await f.evaluate(() => { LP.bedNote = '음악을 불러오는 중이에요'; LD.on = 1; LP.paused = false; _lFull(); const F = document.getElementById('lsFull'); const a = { ld: !!F.querySelector('.lf-ld'), bed: !!F.querySelector('.lp-bednote') };
      LP.bedNote = '음악을 불러오지 못했어요 · 나레이션만 들려 드려요 (코드 L6)'; _lFull(); a.fail = !!F.querySelector('.lp-bednote'); LD.on = 0; LP.bedNote = ''; _lFull(); return a; });
    ok(`${W} ⑥ «불러오는 중» 한 줄 — 곡 받는 중이면 «음악을 불러오는 중이에요»만(위 «불러오는 중…» 없음) · 실패 알림은 그대로`, !d.ld && d.bed && d.fail, d);
    await step(f, pg, 5); const g2 = await look(f);
    ok(`${W} ⑧ 위아래 간격 같음(그림 없는 말하는 차례 · ${g2.k})`, !!g2.gap && g2.gap[0] >= 10 && Math.abs(g2.gap[0] - g2.gap[1]) <= 2 && g2.k === 'welcome', { k: g2.k, gap: g2.gap });
    ok(`${W} ⑦ 가로 넘침 없음 · 페이지 오류 0`, s.sw <= s.vw && !errs.length, { sw: s.sw, vw: s.vw, errs: errs.slice(0, 3) });
    await ctx.close();
  }
} catch (e) { console.log('FAIL 예외 ' + (e && e.stack || e)); fail++; }
await br.close(); srv.close();
console.log(fail ? `✗ PR_PLAY_1124 실패 ${fail}건` : 'ok pr-play — 연습 재생 화면: 진행 막대 없음 · 이 순간만 연습 제목 줄 · 자리 알약 한 줄 · 당일 한 번 · 불러오는 중 한 줄');
process.exit(fail ? 1 : 0);
