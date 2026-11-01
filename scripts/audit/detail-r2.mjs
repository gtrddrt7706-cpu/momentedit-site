#!/usr/bin/env node
/* ★★[DETAIL_R2_1101 2026-11-01 BGM 섹션 — 이어 듣기 세부 여섯] 항목마다 깨 보기(지금 main 판 빨강)
   ① 축사 · 편지 «음악과 함께» — 고른 곡 뜸은 낭독 · 말씀 바로 앞(작은 플레이어 · 크게 보기 둘 다) · 그 앞 여는 말은 본식 곡(M4)
   ② 듣는 중에 음악 칩(없이 · 함께 · 곡)을 바꾸면 1.5초에 멈춤 · 다음 ▶ 에서 새 차례
   ③ 성혼 선언 따로 듣기 · 곡이 늦으면 «곡이 온 때»부터 연출(앞 곡 1.5초 → 4초 내림 → 2.5초 정적 → 멘트) · 8초 안에 안 오면 «2.5초 정적 → 멘트»
   ④ 연출 중 멈춤 → 이어 듣기 = 남은 연출부터 · 다시 돌아오면 처음부터
   ⑤ 축가 → 다음 순간 이어 듣기 — 박수 줄 3초(«하객이 박수로 축하해요») · 음악 −8
   ⑥ 편지 끝 연출이 늦게 와도 다른 순간을 틀었으면 버린다(차례 · 순간 확인)
   BP_BED · BP_OP · BP_EM · BP_PICKS · BP_FORM = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const OP = process.env.BP_OP || '', BED = process.env.BP_BED || '', EMF = process.env.BP_EM || '', SHOT = process.env.SHOT || '', PICKSF = process.env.BP_PICKS || '', FORMF = process.env.BP_FORM || '';
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
const HAVE = ['B01', 'B07', 'B09', 'B10', 'B13', 'B15', 'B16', 'B17', 'B24', 'B28'];   /* 화촉 B05 · B31 은 없다(①) */
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
  const p = (OP && u === '/order-preview.html') ? OP : (BED && u === '/assets/bgm-bed.js') ? BED : (EMF && u === '/assets/entry-music.js') ? EMF : (PICKSF && u === '/assets/bgm-picks.js') ? PICKSF : (FORMF && u === '/assets/bgm-form.js') ? FORMF : path.join(ROOT, u);
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

const go = async (f, k) => { await f.evaluate((k) => mkGo(k), k); await wait(f, 600); };
const P = require(PICKSF || path.join(ROOT, 'assets/bgm-picks.js'));
const MU = (k) => ({ src: 'rec', k, t: '시험 입장 곡', a: '시험 가수', hook: 40, hooks: [40], dur: k === 'r5' ? 140 : 70 });
const setS = (f, o) => f.evaluate((o) => { Object.keys(o.on || {}).forEach((k) => { S.on[k] = o.on[k]; }); S.freeWhat = 'speech'; S.bgm = o.bgm || {}; if (o.mu) S.mu = o.mu; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); }, o);
/* 듣기를 돌리며 100ms 마다 — 줄 · 곡 · 크기 · 소리 객체 · 알림 */
const run = (f, ks, ms, big, stopEmpty) => f.evaluate(async ({ ks, ms, big, stopEmpty }) => { const B = BgmBed._t, o = []; let n = 0;
  if (!window.__lpMs0) window.__lpMs0 = window._lpMs; window._lpMs = function () { return 1500; };
  if (big) { LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(ks, true); _lFull(); } else lsPlay(ks[0]);
  (LP.q || []).forEach((x) => { if ((x.talk || x.talk2 || x.said) && !x.walk) x.ms = 1500; });
  const t0 = performance.now(); await new Promise((res) => { const iv = setInterval(() => { const v = B.BED.cur, st = LP.q[LP.i]; if (v && v.src && !v.__id) v.__id = ++n;
    o.push({ t: performance.now() - t0, i: LP.i, k: st && st.k, slug: st && (st.slug || st.of) || '', skip: !!(st && st.skip), act: !!(st && st.act), walk: !!(st && st.walk), lead: !!LP.leadSt, who: B.BED.who, f: v && v.f, src: !!(v && v.src), want: v && v.want, id: v && v.__id || 0, note: LP.bedNote || '', relay: B.LPB.relay || 0, loop: !!(v && v.src && v.src.loop), q: LP.q.length, tail: !!(BgmBed.inTail && BgmBed.inTail()) });
    if (performance.now() - t0 > ms || (stopEmpty && !LP.q.length && performance.now() - t0 > 2000)) { clearInterval(iv); res(); } }, 100); });
  window._lpMs = window.__lpMs0; return o; }, { ks, ms, big, stopEmpty });
const stop = (f) => f.evaluate(() => { try { lsStop(); } catch (e) {} try { lsCloseBig(); } catch (e) {} });
try {
  const { ctx, pg, f, errs } = await open(390, true);
  await f.evaluate(() => { S.song = 'family'; S.songBy = 'friend'; _persist(); render(); });
  /* ① 뜸 자리 */
  for (const [k, slot] of [['free', 'S5'], ['letter', 'S6']]) {
    await setS(f, { bgm: { [slot]: { m: 'bed' } } }); await go(f, k);
    if (k === 'free') { const r = await run(f, ['free'], 9000); await stop(f); const op = r.filter((x) => x.i === 0 && x.src && !x.lead && x.want > -60);
      ok('① 작은 플레이어 실제 소리 — 여는 말 동안은 본식 곡(B09) · 고른 곡(B13)은 그 뒤', op.length > 3 && op.every((x) => x.f === 'B09') && r.some((x) => x.f === 'B13' && x.src), { op: [...new Set(op.map((x) => x.f))], fs: [...new Set(r.filter((x) => x.src).map((x) => x.i + ':' + x.f))] }); }
    const m = await f.evaluate(({ k }) => { const r = {}; for (const big of [false, true]) { if (big) { LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart([k], true, true); _lFull(); } else lsPlay(k);
        _lPreMark(); const q = LP.q, L = q.findIndex((x) => x._leadHere), T = q.findIndex((x) => x.bridge || x.talk2); r[big ? 'big' : 'small'] = { L, T, base: q.slice(0, Math.max(0, L)).every((x) => x._base === 'M4' && x._noLead), n: q.length }; try { lsStop(); } catch (e) {} try { lsCloseBig(); } catch (e) {} } return r; }, { k });
    ok(`① ${k === 'free' ? '축사' : '편지'} «음악과 함께» — 고른 곡 뜸은 ${k === 'free' ? '말씀' : '낭독'} 바로 앞(작은 플레이어 · 크게 보기) · 그 앞 여는 말은 본식 곡(M4)`, m.small.L > 0 && m.small.L === m.small.T && m.small.base && m.big.L > 0 && m.big.L === m.big.T && m.big.base, m); }
  /* ② 칩 바꾸기 */
  { await setS(f, { bgm: { S5: { m: 'bed' } } }); await go(f, 'free'); await f.evaluate(() => lsPlay('free')); await wait(f, 6500);
    const a = await f.evaluate(() => ({ q: LP.q.length, src: !!BgmBed._t.BED.cur.src })); await f.evaluate(() => bgmAct('pick', 'S5', 'none')); await wait(f, 1800);
    const b = await f.evaluate(() => ({ q: LP.q.length, src: !!BgmBed._t.BED.cur.src, who: BgmBed._t.BED.who }));
    const c = await f.evaluate(() => { lsPlay('free'); _lPreMark(); const r = { base: LP.q.some((x) => x._base), n: LP.q.length }; lsStop(); return r; });
    ok('② 듣는 중 축사 음악 «함께 → 없이» — 1.5초에 멈춤 · 다음 ▶ 는 새 차례(«음악 없이» 줄 · 본식 곡 표시 0)', a.q > 0 && a.src && b.q === 0 && !b.src && !c.base, { a, b, c });
    await setS(f, { bgm: {} }); await go(f, 'welcome'); await f.evaluate(() => lsPlay('welcome')); await wait(f, 5000); const a2 = await f.evaluate(() => LP.q.length);
    await f.evaluate(() => bedAct('pick', 'B10', 'welcome', 'M4')); await wait(f, 1800); const b2 = await f.evaluate(() => ({ q: LP.q.length, src: !!BgmBed._t.BED.cur.src }));
    ok('② 듣는 중 감사 인사 곡을 바꾸면 — 1.5초에 멈춤', a2 > 0 && b2.q === 0 && !b2.src, { a2, b2 }); await setS(f, { bgm: {} }); }
  /* ③ 선언 · 곡이 늦게 */
  const decl = async (dly) => { await setS(f, { bgm: {} }); await go(f, 'welcome'); await f.evaluate(() => { Object.keys(BgmBed._t.BUF).forEach((k) => { delete BgmBed._t.BUF[k]; }); }); await pg.evaluate((d) => { H.dly.B09 = d; }, dly); await go(f, 'declare');
    await f.evaluate(() => { Object.keys(BgmBed._t.BUF).forEach((k) => { delete BgmBed._t.BUF[k]; }); });
    const r = await run(f, ['declare'], dly > 9000 ? 15000 : 16000); await stop(f); await pg.evaluate(() => { H.dly.B09 = null; }); return r; };
  { const r = await decl(4000), l0 = r.find((x) => x.lead), tA = (r.find((x) => x.f === 'B09' && x.src) || {}).t, tM = (r.find((x) => l0 && x.t > l0.t && !x.lead && x.k === 'declare') || {}).t;
    ok('③ 선언 따로 듣기 · 곡 4초 늦음 — 곡이 온 때부터 연출(1.5 + 4 + 2.5 = 8초) 뒤 멘트', !!l0 && tA != null && tM != null && Math.abs((tM - tA) - 8000) < 1000, { l0: l0 && Math.round(l0.t), tA: tA && Math.round(tA), tM: tM && Math.round(tM) }); }
  { const r = await decl(30000), l0 = r.find((x) => x.lead), tM = (r.find((x) => l0 && x.t > l0.t && !x.lead && x.k === 'declare') || {}).t, mus = r.filter((x) => x.src && x.want > -60 && (tM == null || x.t < tM));
    ok('③ 곡이 8초 안에 안 오면 — 연출 없이 2.5초 정적 → 멘트(뜸 시작에서 약 10.5초) · 그 사이 음악 0', !!l0 && tM != null && Math.abs((tM - l0.t) - 10500) < 1100 && mus.length === 0, { l0: l0 && Math.round(l0.t), tM: tM && Math.round(tM), mus: mus.length }); }
  /* ④ 연출 중 멈춤 → 이어 듣기 · 다시 돌아오면 처음부터 */
  { await setS(f, { bgm: {} }); await pg.evaluate(() => { H.dly.B09 = null; }); await go(f, 'declare'); await f.evaluate(() => { Object.keys(BgmBed._t.BUF).forEach((k) => { delete BgmBed._t.BUF[k]; }); BgmBed.lpWarm(['declare']); }); await wait(f, 1500);
    const z = await f.evaluate(async () => { const B = BgmBed._t, o = []; lsPlay('declare'); const t0 = performance.now(); let tL = null, tP = null, tR = null, tM = null, after = [];
      await new Promise((res) => { const iv = setInterval(() => { const t = performance.now() - t0, st = LP.q[LP.i];
        if (tL == null && LP.leadSt) tL = t; if (tL != null && tP == null && t - tL > 3000) { tP = t; lsToggle(); }
        if (tP != null && tR == null && t - tP > 2000) { tR = t; lsToggle(); }
        if (tR != null && tM == null && !LP.leadSt && st && st.k === 'declare') tM = t;
        if (tR != null && tM == null && t - tR < 1500) after.push({ src: !!B.BED.cur.src, f: B.BED.cur.f, want: B.BED.cur.want });
        if (tM != null || t > 25000) { clearInterval(iv); res(); } }, 100); });
      const back = await new Promise((res) => { lsJump(-1); setTimeout(() => res({ lead: !!LP.leadSt, i: LP.i }), 400); }); try { lsStop(); } catch (e) {} return { tL, tP, tR, tM, after: after.slice(0, 4), back }; });
    const used = z.tM != null ? (z.tM - z.tL) - (z.tR - z.tP) : null;
    ok('④ 선언 연출 중 2초 멈춤 → 이어 들으면 남은 연출부터(멈춘 시간 빼고 약 5.5 ~ 8초 뒤 멘트 · 곡 다시 흐름) · 다시 돌아오면 연출을 처음부터', used != null && used > 5000 && used < 9000 && z.after.some((x) => x.src && x.f === 'B09') && z.back.lead, { used: used && Math.round(used), z }); }
  /* ⑤ 축가 → 부모님께 인사 */
  { await setS(f, { bgm: {} }); await go(f, 'song'); const r = await run(f, ['song', 'tribute'], 22000, true); await stop(f); const q = await f.evaluate(() => null);
    const clap = r.filter((x) => x.k === 'song' && x.act && x.src && !x.lead), txt = await f.evaluate(() => { LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(['song', 'tribute'], true, true); const c = LP.q.filter((x) => x.clap).map((x) => [x.txt, x.ms]); lsStop(); try { lsCloseBig(); } catch (e) {} return c; });
    ok('⑤ 축가 → 부모님께 인사 이어 듣기 — 박수 줄 3초 «하객이 박수로 축하해요» · 음악 −8', txt.length === 1 && txt[0][0] === '하객이 박수로 축하해요' && txt[0][1] === 3000 && clap.length > 5 && clap.slice(-5).every((x) => x.want === -8), { txt, clap: [...new Set(clap.map((x) => x.f + ':' + x.want))] }); }
  /* ⑥ 편지 끝 연출 경합 */
  { await setS(f, { on: { letter: 1, tribute: 1 }, bgm: {} }); await go(f, 'welcome'); await f.evaluate(() => BgmBed.lpWarm(['welcome', 'tribute'])); await wait(f, 1500); await go(f, 'letter');
    const z = await f.evaluate(async () => { const B = BgmBed._t; lsPlay('letter'); const t0 = performance.now(); await new Promise((res) => { const iv = setInterval(() => { if ((B.LPB.tailTo && B.LPB.tailTo > Date.now()) || performance.now() - t0 > 40000) { clearInterval(iv); res(); } }, 50); });
      const hit = !!(B.LPB.tailTo && B.LPB.tailTo > Date.now()); mkGo('welcome'); await new Promise((r) => setTimeout(r, 300)); lsPlay('welcome'); const o = [];
      await new Promise((res) => { const t1 = performance.now(), iv = setInterval(() => { const v = B.BED.cur; o.push({ f: v.f, src: !!v.src, want: v.want }); if (performance.now() - t1 > 6000) { clearInterval(iv); res(); } }, 100); });
      try { lsStop(); } catch (e) {} return { hit, bad: o.filter((x) => x.f === 'B15' && x.src && x.want > -60).length, fs: [...new Set(o.filter((x) => x.src).map((x) => x.f))] }; });
    ok('⑥ 편지 끝 연출(정적 → 다음 곡) 중에 다른 순간을 틀면 — 늦게 오는 부모님께 인사 곡(B15)이 감사 인사 위로 나오지 않는다', z.hit && z.bad === 0 && z.fs.indexOf('B09') > -1, z); }
  /* ⑥ 편지 끝 연출 중 다음 곡이 아직 오는 사이 차례가 다른 순간으로 — 늦게 온 곡은 버린다 · 순간을 옮기면 차례(turn)가 오른다 */
  { await setS(f, { on: { letter: 1, tribute: 1 }, bgm: {} }); await go(f, 'welcome'); await f.evaluate(() => BgmBed.lpWarm(['welcome'])); await wait(f, 1500); await pg.evaluate(() => { H.dly.B15 = 600000; }); await go(f, 'letter');
    const z = await f.evaluate(async () => { const B = BgmBed._t; delete B.BUF.B15; lsPlay('letter'); const t0 = performance.now(); await new Promise((res) => { const iv = setInterval(() => { if ((B.LPB.tailTo && B.LPB.tailTo > Date.now()) || performance.now() - t0 > 40000) { clearInterval(iv); res(); } }, 50); });
      const hit = !!(B.LPB.tailTo && B.LPB.tailTo > Date.now()), pend = B.LPB.pend; LP.q.push({ k: 'toast', lab: '시험', txt: '시험', ms: 4000 }); LP.i = LP.q.length - 1; return { hit, pend }; });   /* 차례가 다른 순간(축배)으로 넘어간 상태 — 그 사이 lt 를 올리는 일(■ · 옮기기 · 새 뜸)은 없다 */
    await wait(f, 300); await pg.evaluate(() => { const fr = document.getElementById('fr'); fr.contentWindow.postMessage({ type: 'momentedit:ritualFileData', key: 'bed', id: 'B15', ok: true, mime: 'audio/wav', data: H.songs.B15 }, location.origin); });
    const o = await f.evaluate(async () => { const B = BgmBed._t, o = []; await new Promise((res) => { const t1 = performance.now(), iv = setInterval(() => { const v = B.BED.cur; o.push({ f: v.f, src: !!v.src, want: v.want }); if (performance.now() - t1 > 4000) { clearInterval(iv); res(); } }, 100); }); try { lsStop(); } catch (e) {} return { ok15: !!(B.BUF.B15 && B.BUF.B15.st === 'ok'), bad: o.filter((x) => x.f === 'B15' && x.src).length, fs: [...new Set(o.map((x) => x.f + (x.src ? '+' : '')))] }; });
    await pg.evaluate(() => { H.dly.B15 = null; });
    ok('⑥ 편지 끝 연출 중 다음 곡(B15)이 오는 사이 차례가 다른 순간으로 넘어가면 — 그 뒤에 온 곡을 틀지 않는다(순간 확인)', z.hit && z.pend === 'B15' && o.ok15 && o.bad === 0, { z, o }); }
  { const t = await f.evaluate(() => { if (!BgmBed.turn) return null; mkGo('free'); const a = BgmBed._t.LPB.lt; mkGo('welcome'); const b = BgmBed._t.LPB.lt; mkGo('letter'); return [a, b, BgmBed._t.LPB.lt]; });
    ok('⑥ 순간을 옮길 때마다 차례(turn)가 오른다', !!t && t[1] > t[0] && t[2] > t[1], t); }
  ok('쪽 오류 0', !errs.length, errs.slice(0, 3));
  await ctx.close();
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); }
await br.close(); srv.close();
console.log(fail ? `DETAIL R2 FAIL ${fail}` : 'DETAIL R2 OK');
process.exit(fail ? 1 : 0);
