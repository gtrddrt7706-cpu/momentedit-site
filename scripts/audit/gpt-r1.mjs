#!/usr/bin/env node
/* ★★[GPT_R1_1106 2026-11-06 GPT 하객 관점 검토(11/02 · 기준 b179b4e) 중 main 에 남은 것 · BGM 몫] 깨 보기(옛 판 빨강) → 초록 → 정상 대조
   ① 순간 이동 곡 상속 — 앞 곡 잇기(축배 · 닫는 인사 첫 줄 · 식전 영상)는 자연 진행일 때만 · 앞 · 다음 · 순간 이동이면 그 자리 계획(toastBed · backBed)
   ② 목록 자리 — 순간 이동 · 새 시작에서 목록이 넘긴 곡(LPB.lf · lfw)을 다시 정한다
   ③ 새 곡 받기 실패 · 늦음 — «음악 없이 먼저» · «불러오지 못했어요»가 뜨면 앞 곡도 1.5초에 내린다(화면 = 소리)
   ④ 화촉 여는 말 · 맺는 말 · 인사 안내는 −16 · 점화 · 인사 행동은 −8(엔진 · 미리 듣기 · 당일 콘솔 한 표)
   ⑤ 본식(M4) · 닫는 인사(M6) 곡을 고르지 않은 기본 상태에도 «여러 연주곡이 차례로 이어져요»
   ONLY=1,2,… · BP_BED · BP_CUE · BP_CON · BP_OP = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const PICKSF = process.env.BP_PICKS || '', OP = process.env.BP_OP || '', BED = process.env.BP_BED || '', SLOTS = process.env.BP_SLOTS || '', CON = process.env.BP_CON || '', CUE = process.env.BP_CUE || '';
const O = require(path.join(ROOT, 'assets/ritual-open.js')); require(path.join(ROOT, 'assets/ritual-data.js')); const C = require(CUE || path.join(ROOT, 'assets/ritual-cue.js'));
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 600)}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
function wav(sec, f, sr = 16000) { const n = Math.round(sr * sec), b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(f ? 8000 * Math.sin(2 * Math.PI * f * i / sr) : 0), 44 + i * 2); return b; }
const SHORT = wav(0.6, 330);   /* 나레이션 대신 — 0.6초 */
/* 드라이브에 있는 곡(시험) — B07 · B30(화촉 3 · 4) · 테이블 인사 곡(B23 · B03 · B24 · B25)은 없다 */
const RL = [{ k: 'r5', name: '경쾌하게', t: '시험 입장 곡', a: '시험 가수', hook: 40, hook0: 40, len: 140, file: 'r5.mp3', img: '/assets/home/snap.webp', pos: '50% 50%' },
  { k: 'r1', name: '잔잔하게', t: '짧은 판 곡', a: '시험 가수', hook: 40, hook0: 40, len: 70, file: 'r1.mp3', pf: 'r1p.mp3', p0: 10, p1: 70, hooks: [40], img: '/assets/home/snap.webp', pos: '50% 50%' }];
const HAVE = ['B01', 'B07', 'B09', 'B10', 'B12', 'B13', 'B15', 'B16', 'B17', 'B24', 'B28'];   /* 화촉 1 · 2(B05 · B31)는 없다 — d */   /* [BGM_TIMING_1101] 테이블 인사 곡(B23)도 — 축배 뜸 곡 e */
const SONG = {}; HAVE.forEach((k, i) => { SONG[k] = wav(30, 180 + i * 20).toString('base64'); });   /* 30초 — 재는 동안 곡이 끝나지 않게 */
const RS = { r5: wav(140, 250).toString('base64'), 'r1-p': wav(60, 300).toString('base64'), r1: wav(70, 300).toString('base64') };
const HARNESS = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><iframe id="fr" style="width:100vw;height:100vh;border:0;display:block"></iframe>
<script>
window.H={rl:${JSON.stringify(RL)},rs:${JSON.stringify(RS)},log:[],draft:null,saved:null,delay:40,dly:{},bad:{},gone:{},have:${JSON.stringify(HAVE)},songs:${JSON.stringify(SONG)}};
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
        if(!H.songs[g.id]||H.gone[g.id]){ back({type:'momentedit:ritualFileData',key:'bed',id:g.id,ok:false,error:'곡 파일을 찾을 수 없어요. (코드 L3)',ecode:'L3'}); return; }
        back({type:'momentedit:ritualFileData',key:'bed',id:g.id,ok:true,mime:'audio/wav',data:H.bad[g.id]?'AAAAAAAAAAAAAAAA':H.songs[g.id]}); }, H.dly[g.id]!=null?H.dly[g.id]:H.delay); return; }
    back({type:'momentedit:ritualFileData',key:g.key,id:g.id,ok:false,error:'파일을 불러오지 못했어요 (코드 L6)',ecode:'L6'}); return; }
});
</script>`;
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/__harness.html') { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(HARNESS); return; }
  if (/^\/assets\/audio\/narration\/.+\.mp3$/.test(u)) { r.writeHead(200, { 'Content-Type': 'audio/wav' }); r.end(SHORT); return; }
  const p = (PICKSF && u === '/assets/bgm-picks.js') ? PICKSF : (OP && u === '/order-preview.html') ? OP : (BED && u === '/assets/bgm-bed.js') ? BED : (SLOTS && u === '/assets/bgm-slots.js') ? SLOTS : (CUE && u === '/assets/ritual-cue.js') ? CUE : (CON && u === '/console.html') ? CON : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const wait = (f, ms) => f.waitForTimeout(ms);
const ALL = ['prevideo', 'candle', 'welcome', 'vow', 'ring', 'declare', 'free', 'letter', 'song', 'tribute', 'toast', 'table'];
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


const ONLY = (process.env.ONLY || '').split(',').filter(Boolean), want = (id) => !ONLY.length || ONLY.indexOf(id) > -1;
const go = async (f, k) => { await f.evaluate((k) => mkGo(k), k); await wait(f, 700); };
/* 곡을 하나 틀어 둔 뒤 진행을 멈춘다 — 그 곡의 크기 조절 호출(값 · 걸린 시간)을 엿본다 */
const hold = async (f, k) => { await go(f, k); await f.evaluate((k) => { try { lsStop(); } catch (e) {} lsPlay(k); }, k);
  await f.waitForFunction(() => { const B = BgmBed._t.BED; return B.who === 'lp' && B.cur && B.cur.src && B.cur.g; }, null, { timeout: 30000 }); await wait(f, 7500);
  await f.evaluate(() => { clearTimeout(LP.t); LP.tok++; const v = BgmBed._t.BED.cur, g = v.g.gain, o = g.linearRampToValueAtTime.bind(g); window.__rl = []; g.linearRampToValueAtTime = function (val, t) { window.__rl.push({ val, ms: Math.round((t - v.g.context.currentTime) * 1000) }); return o(val, t); }; }); };
const probe = (f, fn, st, w0) => f.evaluate(({ fn, st, w0 }) => { const v = BgmBed._t.BED.cur; v.want = w0 === 'undef' ? undefined : w0 === 'NaN' ? NaN : w0; window.__rl.length = 0; const s1 = Object.assign({ k: LP.q[LP.i].k }, st);
  try { if (fn === 'show') BgmBed.lpShow(s1); else BgmBed.lpLevel(s1); } catch (e) { return { err: String(e) }; } const r = window.__rl.slice(); return { n: r.length, ms: r.length ? r[r.length - 1].ms : null, want: v.want, f: v.f }; }, { fn, st, w0 });

const at = (tr, i) => tr.find((x) => x.cur >= i), before = (tr, i) => tr.filter((x) => x.cur < i), upTo = (lg, tr, i) => { const a = at(tr, i); return lg.filter((x) => x.db > -60 && (!a || x.t < a.T - 50)); };
const S0of = (on, entry) => { const S = O.applyExample({ course: 'open' }, 'standard'); S.course = 'open'; S.on = Object.assign({}, S.on, on); S.entry = entry || 'A'; S.bgm = {}; return S; };
/* 당일 콘솔 — 큐를 손으로 내고(fire) 그사이 음악 크기 명령(duckTo)을 모은다 */
const con = async (S, files) => { const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }), errs = [], pg = await ctx.newPage(); pg.on('pageerror', (e) => errs.push(e.message));
  await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; window.__bgmLog = []; });
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: '{"ok":true}' })));
  await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S)).toString('base64'))}`); await pg.waitForTimeout(900);
  if (files && files.length) { const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'seambg-')); for (const [sg, hz, sec] of files) { const p = path.join(TMP, sg + '.wav'); fs.writeFileSync(p, wav(sec || 40, hz)); await pg.setInputFiles(`.sg[data-seg="${sg}"] .sg-song:nth-of-type(1) [data-seg-file]`, p, { timeout: 4000 }); } await pg.waitForTimeout(1200); }
  await pg.click('#go'); await pg.waitForTimeout(700);
  const Rq = await pg.evaluate(() => window.__bgmR()); return { ctx, pg, errs, Rq,
    trace: (ms) => pg.evaluate((ms) => new Promise((res) => { const o = [], t0 = performance.now(), iv = setInterval(() => { const a = window.__bgmSt(), b = window.__seg.st(); o.push({ t: Math.round(performance.now() - t0), T: Math.round(performance.now()), cur: a.cur, slug: a.slug, want: a.want, seg: b.seg, id: b.id, plays: b.plays }); if (performance.now() - t0 > ms) { clearInterval(iv); res(o); } }, 100); }), ms), ix: (pr) => Rq.findIndex(pr), fire: (i) => pg.evaluate((i) => window.__bgmGo.fire(i), i), log0: () => pg.evaluate(() => { window.__bgmLog.length = 0; }), log: () => pg.evaluate(() => window.__bgmLog.slice()) }; };
try {
  const lanes = [];
  const prep = async () => { const { ctx, f, errs } = await open(390, true); await f.waitForFunction(() => !!(window.ENG && ENG.RitualCue), null, { timeout: 15000 }).catch(() => {});
    const setOn = (on, bgm) => f.evaluate(({ on, bgm }) => { Object.keys(on).forEach((k) => { S.on[k] = on[k]; }); S.bgm = bgm || {}; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); const i = STEPS.findIndex((x) => x.k === 'listen'); if (i > -1) { idx = i; render(); } }, { on, bgm });
    await f.evaluate(() => { try { BgmBed.on('welcome'); } catch (e) {} }); await f.waitForFunction(() => BgmBed._t.AV.st === 'ok', null, { timeout: 20000 }).catch(() => {});   /* 곡 목록이 온 뒤 */
    return { ctx, f, errs, setOn }; };
  if (want('1') || want('2')) lanes.push((async () => { try { const { ctx, f, errs, setOn } = await prep();
    await setOn({ toast: 1, table: 0, letter: 0, tribute: 0, song: 0, free: 0 });
    const r = await f.evaluate(async () => { const BB = BgmBed._t, W = (ms) => new Promise((r) => setTimeout(r, ms)), cur = () => ({ k: LP.q[LP.i] && LP.q[LP.i].k, s: LP.q[LP.i] && LP.q[LP.i].slug || '', f: BB.BED.cur && BB.BED.cur.f, on: !!(BB.BED.cur && BB.BED.cur.src && BB.BED.cur.want > -60) });
      LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(['toast', '_close'], true); _lFull(); (LP.q || []).forEach((x) => { if (x.talk || x.talk2 || x.said || x.act || x.quiet) x.ms = 2500; });
      let t0 = null, bow = null, m6 = null, pv = null;
      for (let k = 0; k < 400; k++) { await W(100); const c = cur(); if (c.k === '_close' && c.s === 'narr-close-bow' && c.on && !bow) { bow = c; t0 = pv; } if (!bow && c.on) pv = c; if (c.k === '_close' && !c.s && c.on) { m6 = c; break; } }
      await W(1500); const m6b = cur(); BB.LPB.lf = { sg: 'M6', f: m6b.f }; BB.LPB.lfw = { k0: '_close' };
      lsJump(-1); await W(300); const lf = BB.LPB.lf, lfw = BB.LPB.lfw; lsJump(-1); await W(3500); const back = cur(), tb = BB.toastBed();
      try { lsStop(); } catch (e) {} try { lsCloseBig(); } catch (e) {} return { tb, t0, bow, m6: m6b, back, lf, lfw }; });
    if (want('1')) { ok('①-T01 닫는 인사 곡이 흐른 뒤 «앞 순간»으로 축배 — 그 자리 계획 곡(toastBed) · 닫는 인사 곡 이어받기 0', !!r.m6 && r.m6.on && r.back.k === 'toast' && r.back.f === r.tb && r.back.f !== r.m6.f, r);
      ok('①-T02 대조 자연 진행 — 축배 → 닫는 인사 첫 줄은 축배 곡(M7 · «위하여» 뒤) 그대로 · 닫는 인사 곡(M6)은 목례부터', !!r.bow && r.bow.on && r.bow.f === 'B28' && r.m6.f !== 'B28', { t0: r.t0, bow: r.bow, m6: r.m6 }); }
    if (want('2')) ok('②-T01 순간 이동하면 목록이 넘긴 곡 기억(LPB.lf · lfw)을 다시 정한다', r.lf === null && r.lfw === null, { lf: r.lf, lfw: r.lfw });
    ok('①② 쪽 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close(); } catch (e) { ok('①② 갈래가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); } })());
  if (want('3')) lanes.push((async () => { try { const { ctx, f, errs, setOn } = await prep();
    await setOn({ tribute: 1, table: 1, toast: 0, letter: 0, song: 0, free: 0 });
    const r = await f.evaluate(async () => { const BB = BgmBed._t, H = window.parent.H, W = (ms) => new Promise((r) => setTimeout(r, ms)), f8 = [...new Set(['B24', 'B13', 'B14'].concat(((BB.plan(true) || {}).M8 || {}).list || [], ((BB.plan(false) || {}).M8 || {}).list || [], window.parent.H.have.filter((x) => x !== 'B15')))];   /* 테이블 곡 — ★[REPEAT_FIX_1107] 계획이 빌려 온 곡까지 전부 늦춘다(원곡 len 으로 목록이 길어졌다) */
      f8.forEach((x) => { H.dly[x] = 60000; delete BB.BUF[x]; });
      LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(['tribute', 'table'], true); _lFull(); (LP.q || []).forEach((x) => { if (x.talk || x.talk2 || x.said || x.act || x.quiet) x.ms = 2500; });
      let tIn = null, o = []; for (let k = 0; k < 600; k++) { await W(100); const st = LP.q[LP.i], v = BB.BED.cur; if (st && st.k === 'table' && tIn == null) tIn = k; if (tIn != null) o.push({ t: (k - tIn) / 10, f: v && v.f, want: v && v.want, on: !!(v && v.src && v.want > -60), note: BB.LPB.note || '' }); if (tIn != null && k - tIn > 260) break; }
      try { lsStop(); } catch (e) {} try { lsCloseBig(); } catch (e) {} f8.forEach((x) => { delete H.dly[x]; }); return { f8, o: o.filter((x, i) => i % 10 === 0) }; });
    const nm = r.o.filter((x) => /음악 없이|불러오지/.test(x.note)), late = nm.length ? r.o.filter((x) => x.t >= nm[0].t + 2) : [];
    ok('③-T01 다음 구간 곡이 늦으면 «음악 없이 먼저»가 뜬 뒤 앞 곡도 내린다(화면 = 소리)', nm.length > 0 && late.length > 0 && late.every((x) => !x.on), { f8: r.f8, first: nm[0], late: late.slice(0, 3), seen: r.o.slice(0, 4) });
    ok('③ 쪽 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close(); } catch (e) { ok('③ 갈래가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); } })());
  if (want('4')) lanes.push((async () => { try {
    const ws = ['mothers', 'parents', 'fathers', 'others'], E = ws.map((w) => { const S = S0of({ candle: 1, prevideo: 0 }); S.candleWho = w; return C.build(S, { mode: 'console' }).cues.filter((c) => c.k === 'candle' && /^narr-candle/.test(c.slug || '')); });
    ok('④-T01 엔진 화촉 — 여는 말 · 맺는 말 · 인사 안내 −16 · 점화 · 인사 행동(사람 구간) −8 · 서는 분 넷 다', E.every((cs) => cs.length === 3 && cs.every((c) => c.duck === -16) && cs.filter((c) => c.live).every((c) => c.live.duck === -8)), E.map((cs) => cs.map((c) => [c.slug, c.duck, c.live && c.live.duck])));
    const { ctx, f, errs, setOn } = await prep(); await setOn({ candle: 1, prevideo: 0 });
    const q = await f.evaluate(() => _lpTag(_lSteps(ENG, ['candle'])).map((x) => ({ s: x.slug || '', lab: x.lab, dk: x.dk, ldk: x.ldk, act: !!(x.act || x.quiet || x.talk) })));
    const nar = q.filter((x) => /^narr-candle/.test(x.s)), act = q.filter((x) => !x.s && x.act);
    ok('④-T02 미리 듣기 줄 — 화촉 말 줄 −16 · 행동 줄 −8(엔진과 한 표)', nar.length === 3 && nar.every((x) => x.dk === -16) && act.length > 0 && act.every((x) => x.ldk === -8), q);
    ok('④ 쪽 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close();
    const c = await con(S0of({ candle: 1, prevideo: 0 }, 'A'), [['M2', 330, 60]]), iO = c.ix((x) => x.slug === 'narr-candle-out'); await c.log0(); await c.fire(iO); await c.pg.waitForTimeout(1500); const lg = await c.log();
    ok('④-T03 당일 콘솔 화촉 맺는 말 — 말 아래 −16', lg.some((x) => x.db === -16) && !lg.some((x) => x.db === -8), lg); await c.ctx.close();
  } catch (e) { ok('④ 갈래가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); } })());
  if (want('5')) lanes.push((async () => { try { const { ctx, f, errs } = await prep();
    const r = await f.evaluate(async () => { const out = {}; for (const [k, sg] of [['welcome', 'M4'], ['_close', 'M6']]) { S.bgm = {}; _persist(); try { mkGo(k); } catch (e) {} await new Promise((r) => setTimeout(r, 800)); out[sg] = [...document.querySelectorAll('.bed-long')].map((x) => x.textContent); } return out; });
    ok('⑤-T01 본식(M4) · 닫는 인사(M6) 곡을 고르지 않아도 «여러 연주곡이 차례로 이어져요»', r.M4.some((t) => /여러 연주곡이 차례로 이어져요/.test(t)) && r.M6.some((t) => /여러 연주곡이 차례로 이어져요/.test(t)), r);
    ok('⑤ 쪽 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close(); } catch (e) { ok('⑤ 갈래가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); } })());
  await Promise.all(lanes);
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); }
await br.close(); srv.close();
console.log(fail ? `GPT R1 FAIL ${fail}` : 'GPT R1 OK');
process.exit(fail ? 1 : 0);
