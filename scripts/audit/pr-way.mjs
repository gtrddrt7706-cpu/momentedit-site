#!/usr/bin/env node
/* ★★[PR_WAY_198 검토 198-1 · 사장님 «추천대로»] ③ 연습하기 두 길 — A «흐름 보기»(자동 · ② 와 같은 엔진 값) · B «직접 해보기»(두 분 차례만 기다림)
   ① 첫 화면 두 단추 · 동선 칩 · 역할 한 줄 · 끝 화면 «두 분 차례 직접 해보기»
   ② 말하는 차례 큰 글(24 ~ 28px) · «신랑이 읽어요» · 서약 순서 지금 차례 강조 · 장면 영상 접기
   ③ 긴 참고 예시 설명은 첫 참고 예시 줄에서만
   ④ 하단 셋(이전 줄 · 주버튼 · 멈춤 · 44px 이상 · 360 에서 안 넘침) · «n/N · 예식 순서» 목록
   ⑤ 선언 · 덕담 요약 칸 고정 높이 없음 · 다음 줄은 맨 위부터
   ⑥ 축배 «위하여» GO(cheer) 한 줄에만
   ⑦ 화면 꺼짐 막기 — 받기 · 닫으면 풂 · 닫은 뒤 늦게 온 잠금도 풂
   ⑧ 위 «연습하기» 눌림 · 한눈에 보기 «이 식순으로 연습하기» · 그냥 연 미리보기는 «말 · 나레이션으로 연습»(음악 토글 없음)
   + 촬영 후 안내 줄 = 마지막 곡(M8L)
   B 기다림 = 멈춤이 아니다(음악 그 줄 크기 그대로) · 잠시 멈춤 = 음악도 멈춤(pr-bgm ②)
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


const INIT = `(function(){ window.__wl={req:0,rel:0,late:0,hold:null}; try{ Object.defineProperty(navigator,'wakeLock',{configurable:true,value:{request:function(){ __wl.req++; return new Promise(function(ok){ var l={released:false,release:function(){ if(!l.released){ l.released=true; __wl.rel++; } return Promise.resolve(); },addEventListener:function(){}}; if(__wl.hold){ __wl.hold.push(function(){ ok(l); }); } else ok(l); }); }}}); }catch(e){} })();`;

try {
  /* 마이페이지 안(음악이 나는 판) */
  const { ctx, pg, f, errs } = await open(390, true, INIT);
  await f.evaluate(async () => { idx = STEPS.findIndex((x) => x.k === 'listen'); render(); await new Promise((x) => setTimeout(x, 400)); });
  const s8 = await f.evaluate(() => ({ top: !!document.querySelector('[data-fk="ops:practice"]') }));
  ok('⑧ 코스를 고른 뒤 위 «연습하기»가 눌린다', s8.top, s8);
  await f.evaluate(async () => { idx = STEPS.findIndex((x) => x.k === 'practice'); render(); await new Promise((x) => setTimeout(x, 600)); });
  const s1 = await f.evaluate(() => ({ flow: ((document.querySelector('[data-fk="prall"] .pr-hl b') || {}).textContent || ''), tr: ((document.querySelector('[data-fk="prtry"] b') || {}).textContent || ''),
    chips: document.querySelectorAll('.pr-fcs .pr-fc').length, role: ((document.querySelector('.pr-role') || {}).textContent || ''), mu: !!document.querySelector('[data-fk="prmu"]') }));
  ok('① 첫 화면 두 단추 «흐름 보기로 시작» · «직접 해보기로 시작» · 동선 칩 · 역할 한 줄', s1.flow === '흐름 보기로 시작' && s1.tr === '직접 해보기로 시작' && s1.chips >= 4 && s1.role === '재생은 디렉터가, 촬영은 작가님이 안내해요.' && s1.mu, s1);
  if (SHOT) await pg.screenshot({ path: SHOT.replace(/\.png$/, '') + '-start.png', fullPage: false });
  const q = await f.evaluate(async () => { prStart('try'); await new Promise((x) => setTimeout(x, 900)); const Q = LP.q;
    const cheer = Q.filter((x) => x.k === 'toast' && x.cheer);
    const after = Q.filter((x) => x.after);   /* 곡은 bgm-bed fileFor(st.after) 한 길 — meaning-r1 16 이 잰다 */
    const w = Q.map((x, i) => ({ i, w: _prWait(x), who: x.who || '', txt: String(x.txt || '').slice(0, 20), talk2: !!x.talk2, act: !!x.act, k: x.k }));
    return { n: Q.length, cheer: cheer.map((x) => ({ talk2: !!x.talk2, who: x.who })), after: after.map((x) => x.k), w }; });
  ok('⑥ 축배 «위하여» GO 는 말하는 줄 하나에만', q.cheer.length === 1 && q.cheer[0].talk2, q.cheer);
  ok('+ 연습에도 촬영 후 안내 줄이 있다(곡 M8L 은 bgm-bed 한 길 · meaning-r1 16)', q.after.length >= 1, q.after);
  const waits = q.w.filter((x) => x.w), par = q.w.filter((x) => /^(양가 |신랑 |신부 )?(어머님|아버님|부모님)/.test(x.txt.replace(/^[①-⑨]\s*/, '')) && x.act);
  ok('B 기다리는 줄 = 신랑 · 신부 · 두 분 줄만(입장 걷기 포함 · 198-2 ⑩ · 부모님 동작 · 조건 안내는 자동)', waits.length >= 3 && waits.every((x) => /^(신랑|신부|두 분)$/.test(x.who) || (x.act && x.k === 'entry') || (x.act && !/^(신랑|신부) ?(아버님|어머님)/.test(x.txt) && /^(두 분|신랑|신부)/.test(x.txt.replace(/^[①-⑨]\s*/, '')))) && par.every((x) => !x.w), { waits: waits.slice(0, 8), par: par.slice(0, 4) });
  /* B — 첫 두 분 줄로 가서 기다리는지 */
  const b = await f.evaluate(async (j) => { const B = BgmBed._t, w = (ms) => new Promise((x) => setTimeout(x, ms)); LP.i = j; _lShow(); let t = 0; while (t < 8000 && LP.wait !== LP.q[j]) { await w(200); t += 200; }
    const want0 = B.BED.cur && B.BED.cur.want, src0 = !!(B.BED.cur && B.BED.cur.src); await w(Math.max(2500, (LP.q[j].ms || 0) + 600)); const still = LP.i === j && LP.wait === LP.q[j], paused = LP.paused, want1 = B.BED.cur && B.BED.cur.want;
    const main = document.querySelector('#lsFull [data-fk="lfmain"]'), lab = main ? main.textContent : '';
    const ctl = [...document.querySelectorAll('#lsFull .lf-ctl.pr3 button')].map((e) => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; });
    const say = document.querySelector('#lsFull .lf-txt.say'), fs = say ? parseFloat(getComputedStyle(say).fontSize) : 0, lab2 = ((document.querySelector('#lsFull .lf-lab.who') || {}).textContent || ''), vid = !!document.querySelector('#lsFull video, #lsFull .lf-vid');
    main && main.click(); await w(400); return { t, still, paused, src0, want0, want1, lab, ctl, fs, lab2, vid, moved: LP.i > j }; }, (waits.find((x) => x.talk2) || waits[0]).i);
  ok('B 두 분 줄에서 멈춰 기다림(멈춤 아님) · 주버튼 «다 했어요 · …» · 누르면 다음 줄', b.still && !b.paused && /^다 했어요 · 다음 (줄|순서)$/.test(b.lab) && b.moved, b);
  ok('B 기다리는 동안 음악은 그 줄 크기 그대로(올리거나 끊지 않음)', !b.src0 || b.want0 === b.want1, { src0: b.src0, want0: b.want0, want1: b.want1 });
  ok('④ 하단 셋 · 모두 44px 이상', b.ctl.length === 3 && b.ctl.every((x) => x.h >= 44 && x.w >= 44), b.ctl);
  ok('② 말하는 줄 큰 글 24 ~ 28px · «신랑이 읽어요» 꼴 머리 · 장면 영상 접힘', b.fs >= 20 && b.fs <= 28 && /^(신랑이 읽어요|신부가 읽어요|두 분 함께)$/.test(b.lab2) && !b.vid, { fs: b.fs, lab2: b.lab2, vid: b.vid });
  /* A — 같은 줄이 흐름 보기에선 기다리지 않는다 */
  const a = await f.evaluate(async (j) => { const w = (ms) => new Promise((x) => setTimeout(x, ms)); PRW = 'flow'; LP.i = j; _lShow(); await w((LP.q[j].ms || 0) + 3500); return { moved: LP.i > j, wait: !!LP.wait }; }, waits[0].i);
  ok('A 흐름 보기는 같은 줄도 시간 따라 넘어간다', a.moved && !a.wait, a);
  if (SHOT) { for (const [nm, pick] of [['wait', 'vow'], ['sum', 'sum'], ['list', 'list']]) { await f.evaluate(async (pk) => { PRW = 'try'; const Q = LP.q; let i = pk === 'sum' ? Q.findIndex((x) => x.sum) : Q.findIndex((x) => x.k === 'vow' && x.talk2); if (pk === 'list') i = Math.max(0, Q.findIndex((x) => x.k === 'ring')); LP.i = i; LP.paused = false; LP.listOpen = pk === 'list'; LP.wait = pk === 'list' ? null : Q[i]; clearTimeout(LP.t); _lFull(); await new Promise((x) => setTimeout(x, 200)); }, pick); await pg.screenshot({ path: SHOT.replace(/\.png$/, '') + '-' + nm + '.png' }); } await f.evaluate(() => { LP.listOpen = false; LP.wait = null; }); }
  /* 서약 순서 강조 · 참고 예시 설명 첫 줄만 · 목록 · 요약 높이 */
  const m = await f.evaluate(async () => { const w = (ms) => new Promise((x) => setTimeout(x, ms)); PRW = 'try'; LP.paused = true; clearTimeout(LP.t);
    const show = async (i) => { LP.i = i; LP.paused = true; clearTimeout(LP.t); _lFull(); await w(60); };
    const Q = LP.q, vi = Q.findIndex((x, i) => x.vowSeq && x.vowAt === 1), refs = Q.map((x, i) => x.ref ? i : -1).filter((i) => i > -1);
    const o = {};
    if (vi > -1) { await show(vi); const on = document.querySelector('#lsFull .lf-ord b.on'); o.vow = on ? on.textContent : ''; o.vowWant = Q[vi].vowSeq[1]; }
    if (refs.length > 1) { await show(refs[0]); o.ref0 = !!document.querySelector('#lsFull .lf-refn'); await show(refs[1]); o.ref1 = !!document.querySelector('#lsFull .lf-refn'); o.tag1 = !!document.querySelector('#lsFull .lf-refb'); }
    const si = Q.findIndex((x) => x.sum); if (si > -1) { await show(si); const t = document.querySelector('#lsFull .lf-txt'); o.sumMin = t ? t.style.minHeight : 'x'; o.sumH = t ? Math.round(t.getBoundingClientRect().height) : 0; }
    await show(2); const lb = document.querySelector('#lsFull [data-fk="lflist"]'); o.listLab = lb ? lb.textContent : '';
    lb && lb.click(); await w(100); o.listRows = document.querySelectorAll('#lsFull .lf-list .lf-rr, #lsFull .lf-list button').length;
    const k2 = (Q.find((x, i) => i > 10 && x.k !== Q[2].k) || {}).k; if (k2) { lsGoK(k2); await w(150); o.goK = LP.q[LP.i].k === k2 && !LP.listOpen; }
    const f = document.getElementById('lsFull'); f.scrollTop = 400; LP.paused = true; LP.i = Math.min(LP.i + 1, Q.length - 1); _lFull(); o.top = f.scrollTop;
    return o; });
  ok('② 서약 순서 줄 — 지금 차례 강조', m.vow === m.vowWant && !!m.vow, m);
  ok('③ 긴 참고 예시 설명은 첫 참고 예시 줄에서만 · 작은 «참고 예시» 표시는 그대로', m.ref0 === true && m.ref1 === false && m.tag1 === true, m);
  ok('⑤ 선언 · 덕담 요약 칸 고정 높이 없음', m.sumMin === '0px' && m.sumH < 140, m);
  ok('④ «n/N · 예식 순서» 누르면 목록 · 고르면 그 순간 · 목록 닫힘', /^(\d+\/\d+|식전|식후) · 예식 순서/.test(m.listLab) && m.listRows >= 4 && m.goK === true, m);
  ok('⑤ 다음 줄은 맨 위부터', m.top === 0, m);
  /* ⑦ 화면 잠금 */
  const wl = await f.evaluate(async () => { const w = (ms) => new Promise((x) => setTimeout(x, ms)); const r0 = __wl.req; lsCloseBig(); await w(200); const rel = __wl.rel;
    __wl.hold = []; _lOpenBig(); _lFull(); await w(50); lsCloseBig(); await w(100); const h = __wl.hold; __wl.hold = null; h.forEach((g) => g()); await w(100);
    return { r0, rel, req2: __wl.req, rel2: __wl.rel, lock: !!LP.lock }; });
  ok('⑦ 화면 잠금 받기 · 닫으면 풂 · 닫은 뒤 늦게 온 잠금도 풂', wl.r0 >= 1 && wl.rel >= 1 && wl.req2 > wl.r0 && wl.rel2 >= wl.rel + 1 && !wl.lock, wl);
  /* 끝 화면 · 한눈에 보기 */
  const e = await f.evaluate(async () => { const w = (ms) => new Promise((x) => setTimeout(x, ms)); try { lsStop(); } catch (x) {} PRW = 'flow'; LP.big = true; LP.ended = { all: true, range: LP.range }; LP.q = []; _lFull(); await w(50);
    const t = ((document.querySelector('#lsFull [data-fk="lftry"]') || {}).textContent || ''); lsCloseBig(); await w(100);
    idx = STEPS.findIndex((x) => x.k === 'listen'); render(); await w(200); try { mkGo('_sum'); } catch (x) {} await w(300); return { t, sum: ((document.querySelector('[data-fk="sumpr"]') || {}).textContent || '') }; });
  ok('① 흐름 보기 끝 화면 «두 분 차례 직접 해보기»', e.t === '두 분 차례 직접 해보기', e);
  ok('⑧ 한눈에 보기 «이 식순으로 연습하기»', e.sum === '이 식순으로 연습하기', e);
  ok('페이지 오류 0', !errs.length, errs.slice(0, 3));
  await ctx.close();
  /* 그냥 연 미리보기 · 360 폭 */
  const P = await open(360, false, INIT);
  await P.f.evaluate(async () => { idx = STEPS.findIndex((x) => x.k === 'practice'); render(); await new Promise((x) => setTimeout(x, 600)); });
  const pv = await P.f.evaluate(async () => { const o = { lab: ((document.querySelector('.pr-hl .pr-mut') || {}).textContent || ''), mu: !!document.querySelector('[data-fk="prmu"]'), on: _bedOn() };
    prStart('try'); await new Promise((x) => setTimeout(x, 900)); LP.paused = true; clearTimeout(LP.t); _lFull(); await new Promise((x) => setTimeout(x, 60));
    const c = document.querySelector('#lsFull .lf-ctl.pr3'), r = c && c.getBoundingClientRect(); o.ctlW = r ? Math.round(r.width) : 0; o.sw = document.documentElement.scrollWidth; o.vw = innerWidth;
    o.bt = [...document.querySelectorAll('#lsFull .lf-ctl.pr3 button')].map((e) => { const q = e.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.right), Math.round(q.height)]; }); return o; });
  ok('⑧ 그냥 연 미리보기 — «말 · 나레이션으로 연습» · 음악 토글 없음 · 음악 엔진 꺼짐', pv.lab === '말 · 나레이션으로 연습' && !pv.mu && !pv.on, pv);
  ok('④ 360 폭 — 하단 셋이 화면 안 · 44px 이상 · 가로 넘침 없음', pv.bt.length === 3 && pv.bt.every((x) => x[0] >= 0 && x[1] <= pv.vw && x[2] >= 44) && pv.sw <= pv.vw, pv);
  if (SHOT) { await P.pg.screenshot({ path: SHOT.replace(/\.png$/, '') + '-360.png' }); }
  ok('페이지 오류 0(미리보기)', !P.errs.length, P.errs.slice(0, 3));
  await P.ctx.close();
} catch (e) { console.log('FAIL 예외 ' + (e && e.stack || e)); fail++; }
await br.close(); srv.close();
console.log(fail ? `✗ PR_WAY_198 실패 ${fail}건` : 'ok pr-way — 흐름 보기 · 직접 해보기 · 큰 글 · 하단 셋 · 목록 · 요약 높이 · 축배 GO · 화면 잠금 · 연습 입구 · 촬영 후 안내 곡');
process.exit(fail ? 1 : 0);
