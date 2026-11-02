#!/usr/bin/env node
/* ★★[PR_WAY_198 보충 · 1단계 검수 7건] ③ 연습하기
   상1 동작 줄 행위자 = 데이터(who2) — 두 분 동작(«양가 부모님 모두께 인사해요» 등)은 B 에서 기다림 · 부모님 · 하객 동작은 자동
   상2 연습 자동 구간 = 공통 진행 상수 표(window.RunPace) — 맞절 8 · 촛불 6 · 테이블 8 · 박수 5.5 · 안내 → 두 분 말 3.0 · 말 끝 → 받는 멘트 2.2 · 멘트 사이 1.6 · 순간 2.2(NarrPad 무음을 빼고 · 더하지 않음) · ② 듣기는 그대로
   상3 B 기다림 음악 = 말 아래(−20) · 일부러 둔 정적은 그대로
   중4 재생 중 «흐름 보기 / 직접 해보기» 바꾸기(지금 줄 그대로)
   중5 머리 «신랑이 읽어요» 20px 굵게 · 긴 대사도 24~28px
   중6 «오늘 흐름» 끝 «촬영 후 안내» · «골라서 연습하기» 끝 «식후 · 촬영 후 안내»(본식 순서 수에 안 더함)
   중7 첫 화면 «연습 약 n분» = 실제 연습 줄(_prQ)과 같은 계산 · B 는 «두 분이 직접 하는 시간에 따라 달라요»
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
  /* 중6 · 중7 첫 화면 */
  const s0 = await f.evaluate(() => { const ch = [...document.querySelectorAll('.pr-fcs .pr-fc b')].map((b) => b.textContent); const n = (document.querySelector('.mk-one') || {}).textContent || '';
    const mins = ((document.querySelector('[data-fk="prall"] .pr-hl > span') || {}).textContent || '').replace(/\u00a0/g, ' '); return { last: ch.slice(-2), list: !!document.querySelector('[data-fk="prj:_after"]'), n, mins, est: Math.round(_prEstMs(_lRows()) / 60000), tr: ((document.querySelector('[data-fk="prtry"] span') || {}).textContent || '').replace(/\u00a0/g, ' ') }; });
  ok('중6 «오늘 흐름» 끝 = 사진 → 촬영 후 안내 · 목록에 «식후 · 촬영 후 안내»', s0.last.join('>') === '사진>촬영 후 안내' && s0.list, s0);
  ok('중7 «연습 약 n분» = 실제 연습 줄 계산 · B 는 두 분 시간에 따라', new RegExp('연습 약 ' + s0.est + '분').test(s0.mins) && /두 분이 직접 하는 시간에 따라 달라요/.test(s0.tr), s0);
  const q = await f.evaluate(async () => { const pq = _prQ(_lRows()); prStart('try'); await new Promise((x) => setTimeout(x, 900)); LP.paused = true; clearTimeout(LP.t);
    const same = pq.length === LP.q.length && pq.every((x, i) => x.k === LP.q[i].k && x.txt === LP.q[i].txt && x.ms === LP.q[i].ms);
    const A = (re) => LP.q.find((x) => x.act && re.test(x.txt || ''));
    const trib = A(/양가 부모님 모두께 인사해요/), cand = A(/어머님이 앞으로 나와 불을/), clap = A(/^하객이 박수로/), mat = LP.q.find((x) => x.act && x.k === 'matjeol'), cin = LP.q.find((x) => x.act && x.k === 'candle' && /^narr-candle-in-/.test(x.of || ''));
    return { same, trib: trib && [trib.who2, _prWait(trib)], cand: cand && [cand.who2, _prWait(cand)], clap: clap && [clap.who2, _prWait(clap), clap.ms], mat: mat && mat.ms, cin: cin && cin.ms }; });
  ok('중7 예상 시간과 재생이 같은 줄(_prQ)', q.same, q.same);
  ok('상1 행위자 데이터 — 부모님께 인사(두 분) 기다림 · 화촉(부모님) · 박수(하객) 자동', q.trib && q.trib[0] === 'couple' && q.trib[1] === true && q.cand && q.cand[0] === 'parents' && !q.cand[1] && q.clap && q.clap[0] === 'guests' && !q.clap[1], q);
  ok('상2 동작 시간 = 상수 표(맞절 8초 · 촛불 6초 · 박수 5.5초)', q.mat === 8000 && q.cin === 6000 && q.clap && q.clap[2] === 5500, q);
  const g = await f.evaluate(() => { const Q = LP.q, P = (x) => (window.NarrPad && x && x.file && NarrPad.of(x.file)) || [0, 0], nar = (x) => !!x && !!x.slug && !x.talk && !x.talk2 && !x.act && !x.skip && !x.bridge, o = {};
    for (let i = 1; i < Q.length; i++) { const a = Q[i - 1], b = Q[i], gp = _lGapOf(Q, i, a, b, true);
      if (!o.c2t && nar(a) && b.talk2 && !(a.talk2)) o.c2t = { g: gp.gap, want: Math.max(0, 3000 - P(a)[1]), sp: !!(a.cheer || (b.dk != null && b.dk <= -60) || b.after) };
      if (!o.t2c && a.talk2 && nar(b)) o.t2c = { g: gp.gap, want: Math.max(0, 2200 - P(b)[0]) };
      if (!o.cc && nar(a) && nar(b) && a.k === b.k && !gp.tgk && !(b.gm > 0 && b.gm < 2000)) o.cc = { g: gp.gap, want: Math.max(0, 1600 - P(a)[1] - P(b)[0]) };
      if (!o.mm && nar(a) && nar(b) && a.k !== b.k && !(b.gm > 0 && b.gm < 2000) && !(b.dk != null && b.dk <= -60) && !b.after && !a.cheer) o.mm = { g: gp.gap, want: Math.max(0, 2200 - P(a)[1] - P(b)[0]) }; }
    return o; });
  ok('상2 쉼 = 상수 표에서 파일 무음을 뺀 값(안내 → 말 3.0 · 말 → 받는 멘트 2.2 · 멘트 사이 1.6 · 순간 2.2)', g.c2t && g.c2t.g === g.c2t.want && g.t2c && g.t2c.g === g.t2c.want && g.cc && g.cc.g === g.cc.want && g.mm && g.mm.g === g.mm.want, g);
  /* 상3 · 중4 · 중5 */
  const b = await f.evaluate(async () => { const w = (ms) => new Promise((x) => setTimeout(x, ms)); const j = LP.q.findIndex((x) => x.act && /양가 부모님 모두께 인사해요/.test(x.txt || '')); LP.i = j; LP.paused = false; _lShow(); await w(600);
    const o = { wait: LP.wait === LP.q[j], ldk: LP.q[j].ldk, tog: [...document.querySelectorAll('#lsFull [data-fk^="lfway:"]')].map((e) => e.getAttribute('aria-checked')) };
    prWay('flow'); await w(100); o.flowWait = !!LP.wait; o.ldk2 = LP.q[j].ldk; await w((LP.q[j].ms || 3000) + 2500); o.moved = LP.i > j;
    PRW = 'try'; const k2 = LP.q.findIndex((x) => x.talk2 && x.who === '신랑'); LP.i = k2; LP.paused = false; _lShow(); await w(400); const lab = document.querySelector('#lsFull .lf-lab.who'), cs = lab && getComputedStyle(lab); o.lab = cs && [cs.fontSize, cs.fontWeight];
    const lg = LP.q.findIndex((x) => x.talk2 && String(x.txt || '').length > 140); if (lg > -1) { LP.i = lg; LP.paused = true; clearTimeout(LP.t); _lFull(); await w(60); const t = document.querySelector('#lsFull .lf-txt.say'); o.long = t ? parseFloat(getComputedStyle(t).fontSize) : 0; } else o.long = -1;
    return o; });
  ok('상3 B 두 분 동작 기다림 = 말 아래(−20)', b.wait && b.ldk === -20, b);
  ok('중4 재생 중 «흐름 보기 / 직접 해보기» — 지금 줄 그대로 · 흐름으로 바꾸면 기다림이 풀려 넘어감', b.tog.join() === 'false,true' && !b.flowWait && b.moved, b);
  ok('중5 머리 20px 굵게 · 긴 대사도 24px 이상', b.lab && b.lab[0] === '20px' && +b.lab[1] >= 700 && (b.long === -1 || b.long >= 24), b);
  /* 중6 목록 → 촬영 후 안내 줄 */
  const af = await f.evaluate(async () => { try { lsStop(); } catch (e) {} lsCloseBig(); await new Promise((x) => setTimeout(x, 300)); idx = STEPS.findIndex((x) => x.k === 'practice'); render(); await new Promise((x) => setTimeout(x, 400)); document.querySelector('[data-fk="prj:_after"]').click(); await new Promise((x) => setTimeout(x, 900)); return { after: !!(LP.q[LP.i] && LP.q[LP.i].after), n: _opMoments() }; });
  ok('중6 «식후 · 촬영 후 안내»를 누르면 그 줄부터', af.after, af);
  /* ② 듣기는 그대로 */
  const l = await f.evaluate(() => { try { lsStop(); } catch (e) {} idx = STEPS.findIndex((x) => x.k === 'listen'); const Q = _lpTag(_lSteps(ENG, _lRows())); let o = null, seen = Q.length; for (let i = 1; i < Q.length; i++) { const a = Q[i - 1], b = Q[i]; if (a.slug && b.slug && a.k === b.k && !a.quiet && !b.quiet && !a.talk && !b.talk && !(b.gm > 0 && b.gm < 2000)) { const gp = _lGapOf(Q, i, a, b, true); if (gp.tgk) continue; const nf = (x) => x.src && x.file && String(x.src).indexOf(x.file) > -1 ? x.file : ''; o = { g: gp.gap, want: (nf(a) && nf(b)) ? NarrPad.gap(nf(a), nf(b), 1000) : 1000, a: a.slug, b: b.slug }; break; } } return o || { seen }; });
  ok('② 듣기 쉼은 종전 그대로(연습만 상수 표)', l && l.g != null && l.g === l.want, l);
  ok('페이지 오류 0', !errs.length, errs.slice(0, 3));
  await ctx.close();
} catch (e) { console.log('FAIL 예외 ' + (e && e.stack || e)); fail++; }
await br.close(); srv.close();
console.log(fail ? `✗ PR_WAY_198 보충 실패 ${fail}건` : 'ok pr-way4 — 행위자 · 진행 상수 · B 대기 음악 · 토글 · 글자 · 식후 · 연습 시간');
process.exit(fail ? 1 : 0);
