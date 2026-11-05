#!/usr/bin/env node
/* ★★[SEAM_BG 2026-11-05 이음매 명세 BGM 몫 · 대본 검토 · 기준 main 3c2043a8] 항목마다 T 조건 — 깨 보기(옛 판 빨강) → 고친 뒤 초록 → 정상 대조
   BG08 음악값 0 을 무음으로 오인하지 않는다 — lpShow · lpLevel 의 크기 비교 기본값은 유한한 숫자 그대로(0 dB 정상) · 없거나 NaN 만 −90
     T01 0 → −12 내림 400ms · −8 → −12 내림 · −20 → −12 올림 1200ms   T02 lpLevel 0 → −20 은 조절함 · −90 / −60 은 조절 안 함 · 0 → 0 은 무음 아님
     T03 미지정 · null · NaN = −90(조절 안 함)
   BG01 화촉 없는 입장 전 무음 유지 — T01 영상 → b7 → 입장: 영상 끝부터 입장 GO 전까지 −8 명령 0(콘솔) · 미리 듣기도 소리 0   T02 개식사 → b7: 오래 기다려도 재상승 0 · b7 없는 입장 E 도
     T03 화촉 있음 대조: 화촉 첫 큐 6초 뜸 · b7 −16 · 입장 클립 · 걷기 0 dB 그대로
   BG03 편지 끝 다음 음악 — 목적지 = 실제 다음 장면 첫 큐(b8 · b12 · b14 는 건너뛰되 정적이면 거기서 정적) · 정적 목적지 아래 M4 올림 0 · 새 곡 전환 한 번 · 들리는 이음말 제 크기 · 늦은 곡 콜백 취소(콘솔 · 미리 듣기)
   BG04 축가 뒤 b12 — 앞 곡 −90 그대로 · M5 는 부모님께 인사 첫 큐 뜸에서 · «밝게»(b12 없음) 판 그대로 · 앞 곡이 들리던 이음말은 제 크기
   BG07 테이블 인사 음악 카드 설명 — «테이블 인사 동안 차례로 흘러요 · 준비된 음악 약 30분»
   BG02 축가(정적) → «음악과 함께» 편지 — T01 여는 말 동안 M4 상승 · 재시작 0(엔진 · 미리 듣기)   T02 낭독 시작에서만 고른 편지 곡(M4S6) −20(미리 듣기 · 콘솔)   T03 앞 곡이 들리면 여는 말 −16 · 낭독 곡으로 3초 전환 그대로
   ONLY=BG08,… 로 항목만 · BP_BED · BP_OP · BP_CUE · BP_CON = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
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
const near = (x, y) => x != null && Math.abs(x - y) <= 40;   /* [SEAM_BG_MS] 걸린 시간은 오디오 시계로 재서 CI 에서 수 ms ~ 수십 ms 어긋난다(388 · 400) — ±40ms 안이면 같은 값(내림 400 · 올림 1200 은 그대로 갈린다) */
const probe = (f, fn, st, w0) => f.evaluate(({ fn, st, w0 }) => { const v = BgmBed._t.BED.cur; v.want = w0 === 'undef' ? undefined : w0 === 'NaN' ? NaN : w0; window.__rl.length = 0; const s1 = Object.assign({ k: LP.q[LP.i].k }, st);
  try { if (fn === 'show') BgmBed.lpShow(s1); else BgmBed.lpLevel(s1); } catch (e) { return { err: String(e) }; } const r = window.__rl.slice(); return { n: r.length, ms: r.length ? r[r.length - 1].ms : null, want: v.want, f: v.f }; }, { fn, st, w0 });

const at = (tr, i) => tr.find((x) => x.cur >= i), before = (tr, i) => tr.filter((x) => x.cur < i), upTo = (lg, tr, i) => { const a = at(tr, i); return lg.filter((x) => x.db > -60 && (!a || x.t < a.T - 50)); };
const S0of = (on, entry) => { const S = O.applyExample({ course: 'open' }, 'standard'); S.course = 'open'; S.on = Object.assign({}, S.on, on); S.entry = entry || 'A'; S.bgm = {}; return S; };
/* 당일 콘솔 — 큐를 손으로 내고(fire) 그사이 음악 크기 명령(duckTo)을 모은다 */
const con = async (S, files) => { const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }), errs = [], pg = await ctx.newPage(); pg.on('pageerror', (e) => errs.push(e.message));
  await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; window.__bgmLog = []; });
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: '{"ok":true}' })));
  await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S)).toString('base64'))}`); await pg.waitForTimeout(900);
  if (files && files.length) { const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'seambg-')); for (const [sg, hz] of files) { const p = path.join(TMP, sg + '.wav'); fs.writeFileSync(p, wav(40, hz)); await pg.setInputFiles(`.sg[data-seg="${sg}"] .sg-song:nth-of-type(1) [data-seg-file]`, p, { timeout: 4000 }); } await pg.waitForTimeout(1200); }
  await pg.click('#go'); await pg.waitForTimeout(700);
  const Rq = await pg.evaluate(() => window.__bgmR()); return { ctx, pg, errs, Rq,
    trace: (ms) => pg.evaluate((ms) => new Promise((res) => { const o = [], t0 = performance.now(), iv = setInterval(() => { const a = window.__bgmSt(), b = window.__seg.st(); o.push({ t: Math.round(performance.now() - t0), T: Math.round(performance.now()), cur: a.cur, slug: a.slug, want: a.want, seg: b.seg, id: b.id, plays: b.plays }); if (performance.now() - t0 > ms) { clearInterval(iv); res(o); } }, 100); }), ms), ix: (pr) => Rq.findIndex(pr), fire: (i) => pg.evaluate((i) => window.__bgmGo.fire(i), i), log0: () => pg.evaluate(() => { window.__bgmLog.length = 0; }), log: () => pg.evaluate(() => window.__bgmLog.slice()) }; };
try {
  if (want('BG07')) {   /* 테이블 인사 음악 카드 — 범위 = 테이블 인사만(사진은 M6 · M8L) · 30분 = 준비된 곡 길이 */
    const src = fs.readFileSync(BED || path.join(ROOT, 'assets/bgm-bed.js'), 'utf8'), m = src.match(/M8:'([^']*)'/), sl = require(SLOTS || path.join(ROOT, 'assets/bgm-slots.js'));
    const s10 = ((sl.SLOTS || sl.slots || []).find ? (sl.SLOTS || sl.slots || []).find((x) => x.id === 'S10') : null) || {};
    ok('BG07-T01 테이블 인사 카드 설명 «테이블 인사 동안 차례로 흘러요 · 준비된 음악 약 30분» · «사진» 0', !!m && m[1] === '테이블 인사 동안 차례로 흘러요 · 준비된 음악 약 30분' && !/사진/.test(m[1]), { info: m && m[1] });
    ok('BG07 대조 — 음악 칸(S10) 한 줄도 테이블 인사만(사진 0)', !s10.one || (/테이블 인사/.test(s10.one) && !/사진/.test(s10.one)), { one: s10.one }); }
  /* [SEAM_BG_LANES] 콘솔 갈래 · 미리 듣기 갈래 둘(BG03 · 나머지)을 나란히(각자 브라우저 창) — CI e 칸 20분 안에 */
  const laneA = (async () => { try {
  if (want('BG01')) {
    /* T01 영상 있음 · 화촉 없음 · 입장 A */
    { const c = await con(S0of({ prevideo: 1, candle: 0 }, 'A')), iO = c.ix((x) => x.slug === 'narr-prevideo-out'), i7 = c.ix((x) => x.slug === 'bridge-b7-entry-ready'), iE = c.ix((x) => x.k === 'entry');
      const b7 = c.Rq[i7] || {}; await c.fire(iO); await c.pg.waitForTimeout(300); await c.log0(); await c.pg.waitForTimeout(5000); await c.fire(i7); await c.pg.waitForTimeout(7000); const lg = await c.log();
      ok('BG01-T01 영상 → b7 → 입장(화촉 없음) — b7 정적 · 영상 끝부터 입장 GO 전까지 −8 등 음악 올림 명령 0(콘솔)', iO > -1 && i7 > iO && iE > i7 && b7.duck === -90 && !lg.some((x) => x.db > -60), { b7: b7.duck, up: lg.filter((x) => x.db > -60) });
      ok('BG01 콘솔 오류 0(T01)', !c.errs.length, c.errs.slice(0, 2)); await c.ctx.close(); }
    /* T02 개식사 → b7(영상 · 화촉 없음) · b7 없는 입장 E */
    for (const e of ['A', 'E']) { const c = await con(S0of({ prevideo: 0, candle: 0 }, e)), iN = c.ix((x) => x.slug === 'narr-open'), i7 = c.ix((x) => x.slug === 'bridge-b7-entry-ready'), iE = c.ix((x) => x.k === 'entry');
      const last = e === 'A' ? i7 : iN; await c.fire(last); await c.pg.waitForTimeout(400); await c.log0(); await c.pg.waitForTimeout(9000); const lg = await c.log(), st = await c.pg.evaluate(() => window.__bgmSt());
      ok(`BG01-T02 개식사 → ${e === 'A' ? 'b7' : '(b7 없음) 입장 E'} — 오래(9초) 기다려도 앞 곡 재상승 0 · 입장 큐는 아직(cur ${st.cur} < 입장 ${iE})`, last > -1 && iE > last && !lg.some((x) => x.db > -60) && st.cur < iE, { e, up: lg.filter((x) => x.db > -60), cur: st.cur, phase: st.phase });
      await c.ctx.close(); }
    /* T03 화촉 있음 대조 */
    { const R = await (async () => { const C2 = require(path.join(ROOT, 'assets/ritual-cue.js')); return C2.build(S0of({ prevideo: 1, candle: 1 }, 'A'), { mode: 'console' }).cues; })();
      const cd = R.find((x) => x.k === 'candle') || {}, b7 = R.find((x) => x.slug === 'bridge-b7-entry-ready') || {}, en = R.find((x) => x.k === 'entry') || {};
      ok('BG01-T03 화촉 있음 대조 — 화촉 첫 큐 6초 뜸(−8) · b7 −16 + 줄 끝 정적 · 입장 클립 −12 · 걷기 0 dB 그대로', cd.goLeadMs >= 6000 && cd.leadDb === -8 && b7.duck === -16 && (b7.post || []).length === 2 && en.slug === 'entry-A' && en.duck === -12 && en.live && en.live.duck === 0, { cd: [cd.goLeadMs, cd.leadDb], b7: [b7.duck, b7.post], en: [en.slug, en.duck, en.live && en.live.duck] }); }
  }
  if (want('BG03')) {
    const SL = (on, letter, bgm) => { const S = S0of(Object.assign({ song: 0, free: 0, tribute: 0 }, on)); S.letter = letter; S.bgm = bgm || {}; return S; };
    const FL = [['M4', 440], ['M4S6', 520], ['M8', 600], ['M7', 660], ['M6', 700]];
    const runL = async (S, ms) => { const c = await con(S, FL), iE = c.ix((x) => x.slug === 'narr-letter-end'); await c.fire(iE - 1); await c.pg.waitForTimeout(1500); await c.fire(iE); await c.log0();
      const tr = await c.trace(ms), lg = await c.log(); return { c, iE, tr, lg }; };
    const ixA = (c, iE, pr) => { const j = c.Rq.slice(iE + 1).findIndex(pr); return j < 0 ? -1 : iE + 1 + j; };
    /* T01 서로에게 → 테이블 · 음악 없이 — b8 정적 · M8 은 테이블 첫 큐에서 */
    { const { c, iE, tr, lg } = await runL(SL({ letter: 1, table: 1, toast: 1 }, 'each'), 10000), i8 = ixA(c, iE, (x) => x.slug === 'bridge-b8-face-guests'), iT = ixA(c, iE, (x) => x.k === 'table');
      const pre = before(tr, iT), aT = at(tr, iT), up = upTo(lg, tr, iT), last = tr[tr.length - 1];
      ok('BG03-T01 콘솔 서로에게 → 테이블(음악 없이) — 목적지 테이블(M8) · b8 정적 동안 M4 상승 0 · M8 은 테이블 첫 큐에서', i8 === iE + 1 && iT === i8 + 1 && !!aT && pre.length > 10 && pre.every((x) => x.seg !== 'M8' && !(x.want > -60)) && !up.length && last.seg === 'M8' && last.want > -60, { i8, iT, pre: [...new Set(pre.map((x) => x.cur + ':' + x.seg + '@' + x.want))], last: [last.cur, last.seg, last.want], up });
      ok('BG03 콘솔 오류 0(T01)', !c.errs.length, c.errs.slice(0, 2)); await c.ctx.close(); }
    /* T04 서로에게 → 테이블 · 음악과 함께 — 들리는 b8 은 제 크기(−16) · 목적지 M8 로 3초 겹침 한 번 */
    { const { c, iE, tr } = await runL(SL({ letter: 1, table: 1, toast: 1 }, 'each', { S6: { m: 'bed' } }), 9000), i8 = ixA(c, iE, (x) => x.slug === 'bridge-b8-face-guests'), iT = ixA(c, iE, (x) => x.k === 'table');
      const b8 = c.Rq[i8] || {}, d8 = tr.filter((x) => x.cur === i8), last = tr[tr.length - 1], p0 = tr[0].plays;
      ok('BG03-T04 콘솔 «음악과 함께» 편지 → 테이블 — b8 은 정해진 −16 그대로(−90 으로 바꾸지 않는다) · M8 겹침 한 번', b8.duck === -16 && d8.length > 0 && d8.every((x) => x.want === -16) && last.seg === 'M8' && last.plays - p0 === 1, { b8: b8.duck, d8: [...new Set(d8.map((x) => x.seg + '@' + x.want))], last: [last.cur, last.seg, last.want, last.plays - p0], iT });
      await c.ctx.close(); }
    /* T02 정적 목적지 — 서로에게 → 축배(b8 · b13 −90) · 서로에게 → 닫는 인사(b8 · 닫는 인사 −90) · 부모님께 → 축배 */
    for (const [nm, on, lt, ms] of [['서로에게 → 축배', { letter: 1, table: 0, toast: 1 }, 'each', 9000], ['서로에게 → 닫는 인사', { letter: 1, table: 0, toast: 0 }, 'each', 9000], ['부모님께 → 축배', { letter: 1, table: 0, toast: 1 }, 'parent', 9000]]) {
      const S = SL(on, lt), R0 = C.build(S, { mode: 'console' }).cues, i0 = R0.findIndex((x) => x.slug === 'narr-letter-end'), nx = R0.slice(i0 + 1).find((x) => !/^bridge-b(8|12|14)-/.test(x.slug || '')) || {};
      const { c, lg, tr } = await runL(S, ms), up = lg.filter((x) => x.db > -60), seen = [...new Set(tr.map((x) => x.cur + ':' + x.slug))];
      ok(`BG03-T02 콘솔 ${nm}(목적지 ${nx.slug} ${nx.duck}) — 편지 끝 · 이음말 · 다음 GO 기다림 동안 M4 −16 / −8 올림 0`, nx.duck <= -60 && !up.length, { nx: [nx.slug, nx.duck], up, seen });
      await c.ctx.close(); }
    /* T03 부모님께 → 테이블 — 무음 이음말 없이 새 곡: 정적 2초 → 3초 오름 한 번 · 테이블 첫 큐에서 다시 전환 0 */
    { const { c, iE, tr, lg } = await runL(SL({ letter: 1, table: 1, toast: 1 }, 'parent'), 9000), iT = ixA(c, iE, (x) => x.k === 'table'), p0 = tr[0].plays, last = tr[tr.length - 1], up = upTo(lg, tr, iT), aT = at(tr, iT), rise = tr.find((x) => x.seg === 'M8');
      const after = tr.filter((x) => x.cur >= iT), pT = aT ? aT.plays : -1;
      ok('BG03-T03 콘솔 부모님께 → 테이블 — 새 곡 전환 한 번(정적 2초 뒤 3초 오름 · 테이블 첫 큐에서 다시 틀기 0)', iT === iE + 1 && last.seg === 'M8' && last.plays - p0 === 1 && after.every((x) => x.plays === pT) && up.length === 1 && up[0].db === -16 && up[0].ms === 3000 && !!rise && rise.t >= 1900, { iT, iE, last: [last.cur, last.seg, last.want, last.plays - p0], up, rise: rise && rise.t });
      await c.ctx.close(); }
  }
  if (want('BG04')) {
    const ST = (narEx) => { const S = S0of({ song: 1, tribute: 1, letter: 0, free: 0 }); if (narEx) S.narEx = narEx; return S; };
    /* T01 콘솔 — 축가 끝(−90) → b12(−16) → 부모님께 인사: 이음말 동안 앞 곡 −90 그대로 · M5 는 부모님께 인사 첫 큐 뜸에서 */
    { const c = await con(ST(), [['M4', 440], ['M5', 560]]), iS = c.ix((x) => x.slug === 'narr-song-end-friend'), i12 = c.ix((x) => x.slug === 'bridge-b12-tribute-calm'), iN = c.ix((x) => x.slug === 'narr-tribute-name');
      await c.fire(iS); await c.pg.waitForTimeout(2500); await c.log0(); await c.fire(i12); const tr = await c.trace(12000), lg = await c.log(), segAt = (T) => (tr.find((x) => x.T >= T + 150) || {}).seg, last = tr[tr.length - 1];
      const old = lg.filter((x) => x.db > -60 && segAt(x.t) !== 'M5'), d12 = tr.filter((x) => x.cur === i12 && x.seg !== 'M5');
      ok('BG04-T01 콘솔 축가 끝 → b12 → 부모님께 인사 — 이음말 동안 앞 곡 −90 그대로(올림 0) · 처음 오르는 소리는 부모님께 인사 뜸의 M5(6초 뜸)', iS > -1 && i12 === iS + 1 && iN === i12 + 1 && !old.length && d12.length > 5 && d12.every((x) => !(x.want > -60)) && !!at(tr, iN) && last.seg === 'M5' && last.want > -60, { old, d12: [...new Set(d12.map((x) => x.seg + '@' + x.want))], last: [last.cur, last.seg, last.want] });
      ok('BG04 콘솔 오류 0', !c.errs.length, c.errs.slice(0, 2)); await c.ctx.close(); }
    /* T02 엔진 — «밝게» 예시(부모님께 인사 예시 글)면 b12 가 없다 · 새 이음말 · 쉼 0 */
    { const R1 = C.build(ST({ tribute: 5 }), { mode: 'console' }).cues, iS = R1.findIndex((x) => x.slug === 'narr-song-end-friend');
      ok('BG04-T02 엔진 «밝게» 판 — 축가 끝 바로 뒤 부모님께 인사 첫 큐(b12 · 새 이음말 0)', iS > -1 && /^narr-tribute-name/.test(R1[iS + 1].slug || '') && !R1.some((x) => x.slug === 'bridge-b12-tribute-calm'), R1.slice(iS, iS + 2).map((x) => x.slug)); }
  }
  } catch (e) { ok('콘솔 갈래가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); } })();
  const laneB = (async () => { try {
  const { ctx, f, errs } = await open(390, true);
  await f.waitForFunction(() => !!(window.ENG && ENG.RitualCue), null, { timeout: 15000 }).catch(() => {});
  const setX = (o) => f.evaluate((o) => { Object.keys(o.on || {}).forEach((k) => { S.on[k] = o.on[k]; }); S.freeWhat = 'speech'; S.letter = o.letter || S.letter; S.bgm = o.bgm || {}; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); }, o);
  const runP = (ks, ms) => f.evaluate(async ({ ks, ms }) => { const BB = BgmBed._t, o = []; window.__lt = []; if (!BgmBed.__lt0) { BgmBed.__lt0 = BgmBed.lpTail; BgmBed.lpTail = function (st, nx) { const r = BgmBed.__lt0(st, nx); window.__lt.push({ st: st && (st.slug || st.of || st.lab), dk: st && st.dk, nx: nx && (nx.slug || nx.of || nx.lab), ndk: nx && nx.dk, r }); return r; }; } if (!window.__lpMs0) window.__lpMs0 = window._lpMs; window._lpMs = function () { return 2500; };
    if (ks.length > 1) { LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(ks, true); _lFull(); } else lsPlay(ks[0]);
    (LP.q || []).forEach((x) => { if (x.talk || x.talk2 || x.said || x.act || x.quiet) x.ms = 2500; });
    const t0 = performance.now(); await new Promise((res) => { const iv = setInterval(() => { const v = BB.BED.cur, st = LP.q[LP.i]; o.push({ t: performance.now() - t0, k: st && st.k, s: st && st.slug || '', i: LP.i, lab: st && st.lab || '', talk: !!(st && (st.talk || st.talk2)), f: v && v.f, seg: v && v.seg, on: !!(v && v.src && v.want > -60), want: v && v.want });
      if (performance.now() - t0 > ms || !LP.q.length) { clearInterval(iv); res(); } }, 100); });
    try { lsStop(); } catch (x) {} try { if (ks.length > 1) lsCloseBig(); } catch (x) {} window._lpMs = window.__lpMs0; return o; }, { ks, ms });
  if (want('BG02')) {
    const C2 = require(path.join(ROOT, 'assets/ritual-cue.js')), eng = (on, bgm) => { const S = S0of(on); S.bgm = bgm; S.letter = 'each'; return C2.build(S, { mode: 'console' }).cues; };
    const e1 = eng({ song: 1, letter: 1, free: 0 }, { S6: { m: 'bed' } }).find((x) => /^letter-/.test(x.slug || '')) || {}, e3 = eng({ song: 0, letter: 1, free: 0 }, { S6: { m: 'bed' } }).find((x) => /^letter-/.test(x.slug || '')) || {};
    ok('BG02-T01 엔진 — 축가(정적) 뒤 «음악과 함께» 편지 여는 말 −90(M4 를 되살리지 않는다) · 낭독 −20', e1.duck === -90 && e1.live && e1.live.duck === -20, { duck: e1.duck, live: e1.live && e1.live.duck });
    ok('BG02-T03 엔진 대조 — 앞 곡이 들리면(덕담 → 편지) 여는 말 −16 · 낭독 −20 그대로', e3.duck === -16 && e3.live && e3.live.duck === -20, { duck: e3.duck, live: e3.live && e3.live.duck });
    await setX({ on: { song: 1, letter: 1, free: 0, tribute: 0 }, bgm: { S6: { m: 'bed' } }, letter: 'each' }); await go(f, 'song');
    const o = await runP(['song', 'letter'], 40000), op = o.filter((x) => x.k === 'letter' && !x.talk && x.on && x.s && /^letter-/.test(x.s)), rd = o.filter((x) => x.k === 'letter' && x.talk && x.on);
    const m4 = await f.evaluate(() => BgmPicks.PICKS.M4 || []), first = o.find((x) => x.k === 'letter' && x.on);
    ok('BG02-T01 미리 듣기 — 축가 → 편지 여는 말 동안 음악 0(M4 상승 · 재시작 0)', !op.length, { op: op.slice(0, 3).map((x) => [x.s, x.f, x.want]) });
    ok('BG02-T02 미리 듣기 — 낭독에서 처음 들리는 곡 = 고른 편지 곡(M4S6 · 앞 뜸 뒤 −20) · 그전엔 소리 0', !!first && first.talk && first.seg === 'M4S6' && rd.some((x) => x.want === -20) && rd.every((x) => x.seg === 'M4S6'), { first: first && [first.lab, first.f, first.seg, first.want] });
    await setX({ on: { song: 0, letter: 1, free: 0, tribute: 0, bless: 1 }, bgm: { S6: { m: 'bed' } }, letter: 'each' }); await go(f, 'bless');
    const o3 = await runP(['bless', 'letter'], 40000), op3 = o3.filter((x) => x.k === 'letter' && !x.talk && /^letter-/.test(x.s || '') && x.on), rd3 = o3.filter((x) => x.k === 'letter' && x.talk && x.on);
    ok('BG02-T03 미리 듣기 대조 — 덕담 곡이 흐르면 여는 말 −16(M4) → 낭독 곡 −20', op3.length > 0 && op3[op3.length - 1].seg === 'M4' && op3[op3.length - 1].want === -16 && rd3.length > 0 && rd3[rd3.length - 1].seg === 'M4S6', { op3: op3.length && [op3[op3.length - 1].f, op3[op3.length - 1].seg, op3[op3.length - 1].want], rd3: rd3.length && [rd3[rd3.length - 1].f, rd3[rd3.length - 1].seg] });
  }
  if (want('BG04')) {
    const toL = () => f.evaluate(() => { const i = STEPS.findIndex((x) => x.k === 'listen'); if (i > -1 && STEPS[idx].k !== 'listen') { idx = i; render(); } });
    for (const [nm, ex] of [['경건(b12 있음)', null], ['밝게(b12 없음)', { tribute: 5 }]]) {
      await setX({ on: { song: 1, tribute: 1, letter: 0, free: 0, table: 0 }, bgm: {} }); await f.evaluate((ex) => { S.narEx = ex || {}; _persist(); render(); }, ex); await go(f, 'song'); await toL();
      const o = await runP(['song', 'tribute'], 32000), iN = o.findIndex((x) => /^narr-tribute-name/.test(x.s || '')), b12 = o.filter((x) => x.s === 'bridge-b12-tribute-calm'), se = o.findIndex((x) => /^narr-song-end/.test(x.s || ''));
      const gap = o.slice(se, iN < 0 ? o.length : iN).filter((x) => x.on), first = o.find((x) => x.on && o.indexOf(x) >= iN);
      ok(`BG04-T0${ex ? 2 : 1} 미리 듣기 ${nm} — 축가 끝 · ${ex ? '' : 'b12 · '}사이 동안 소리 0 · 첫 소리는 부모님께 인사 첫 줄 M5`, se > -1 && iN > se && (ex ? !b12.length : b12.length > 0) && !gap.length && !!first && first.seg === 'M5' && /^narr-tribute-name/.test(first.s || ''), { b12: b12.length, gap: gap.slice(0, 3).map((x) => [x.s || x.lab, x.f, x.seg, x.want]), first: first && [first.s, first.seg, first.want] }); }
    /* T02 대조 — 앞 곡이 들리던 이음말(«음악과 함께» 편지 → b8)은 제 크기 −16 그대로 */
    await setX({ on: { song: 0, free: 0, tribute: 0, letter: 1, table: 1, toast: 1, bless: 1 }, bgm: { S6: { m: 'bed' } }, letter: 'each' }); await f.evaluate(() => { S.narEx = {}; _persist(); render(); }); await go(f, 'letter'); await toL();
    { const o = await runP(['letter', 'table'], 26000), b8 = o.filter((x) => x.s === 'bridge-b8-face-guests');
      ok('BG04-T02 미리 듣기 대조 — 앞 곡이 들리던 이음말(편지 «음악과 함께» → b8)은 −16 그대로(정적 조건을 넓히지 않는다)', b8.length > 3 && b8.slice(-3).every((x) => x.on && x.want === -16), { b8: [...new Set(b8.map((x) => x.f + '/' + x.seg + '@' + x.want))] }); }
  }
  await f.waitForFunction(() => !!(window.ENG && ENG.RitualCue), null, { timeout: 15000 }).catch(() => {});
  if (want('BG08')) {
    await hold(f, 'welcome'); const f0 = await f.evaluate(() => BgmBed._t.BED.cur.f), P = await f.evaluate(() => BgmBed._t.PR());
    const a = await probe(f, 'show', { dk: -12 }, 0), b = await probe(f, 'show', { dk: -12 }, -8), c = await probe(f, 'show', { dk: -12 }, -20);
    ok(`BG08-T01 lpShow — 0 → −12 내림 ${P.down}ms · −8 → −12 내림 · −20 → −12 올림 ${P.up}ms (곡 그대로 ${f0})`, near(a.ms, P.down) && near(b.ms, P.down) && near(c.ms, P.up) && [a, b, c].every((x) => x.f === f0 && x.want === -12), { a, b, c });
    const d = await probe(f, 'level', { talk: true, ldk: -20 }, 0), e = await probe(f, 'level', { talk: true, ldk: -20 }, -90), g = await probe(f, 'level', { talk: true, ldk: -20 }, -60), h = await probe(f, 'level', { talk: true, ldk: 0 }, 0);
    ok('BG08-T02 lpLevel — 0 → −20 조절함(내림) · −90 · −60 은 조절 안 함(무음 보호) · 0 → 0 은 무음으로 보지 않음', d.n === 1 && near(d.ms, P.down) && d.want === -20 && e.n === 0 && g.n === 0 && h.n === 1 && h.want === 0, { d, e, g, h });
    const u = await probe(f, 'level', { talk: true, ldk: -20 }, 'undef'), nn = await probe(f, 'level', { talk: true, ldk: -20 }, null), na = await probe(f, 'level', { talk: true, ldk: -20 }, 'NaN');
    ok('BG08-T03 미지정 · null · NaN = −90(조절 안 함) · 곡 파일 그대로', u.n === 0 && nn.n === 0 && na.n === 0 && [u, nn, na].every((x) => x.f === f0), { u, nn, na });
    await f.evaluate(() => { try { lsStop(); } catch (e) {} });
  }
  ok('쪽 오류 0', !errs.length, errs.slice(0, 3));
  await ctx.close();
  } catch (e) { ok('미리 듣기 갈래가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); } })();
  const laneC = (async () => { if (!want('BG03')) return; try {
    const { ctx, f, errs } = await open(390, true);
    await f.waitForFunction(() => !!(window.ENG && ENG.RitualCue), null, { timeout: 15000 }).catch(() => {});
  const setX = (o) => f.evaluate((o) => { Object.keys(o.on || {}).forEach((k) => { S.on[k] = o.on[k]; }); S.freeWhat = 'speech'; S.letter = o.letter || S.letter; S.bgm = o.bgm || {}; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); }, o);
  const runP = (ks, ms) => f.evaluate(async ({ ks, ms }) => { const BB = BgmBed._t, o = []; window.__lt = []; if (!BgmBed.__lt0) { BgmBed.__lt0 = BgmBed.lpTail; BgmBed.lpTail = function (st, nx) { const r = BgmBed.__lt0(st, nx); window.__lt.push({ st: st && (st.slug || st.of || st.lab), dk: st && st.dk, nx: nx && (nx.slug || nx.of || nx.lab), ndk: nx && nx.dk, r }); return r; }; } if (!window.__lpMs0) window.__lpMs0 = window._lpMs; window._lpMs = function () { return 2500; };
    if (ks.length > 1) { LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(ks, true); _lFull(); } else lsPlay(ks[0]);
    (LP.q || []).forEach((x) => { if (x.talk || x.talk2 || x.said || x.act || x.quiet) x.ms = 2500; });
    const t0 = performance.now(); await new Promise((res) => { const iv = setInterval(() => { const v = BB.BED.cur, st = LP.q[LP.i]; o.push({ t: performance.now() - t0, k: st && st.k, s: st && st.slug || '', i: LP.i, lab: st && st.lab || '', talk: !!(st && (st.talk || st.talk2)), f: v && v.f, seg: v && v.seg, on: !!(v && v.src && v.want > -60), want: v && v.want });
      if (performance.now() - t0 > ms || !LP.q.length) { clearInterval(iv); res(); } }, 100); });
    try { lsStop(); } catch (x) {} try { if (ks.length > 1) lsCloseBig(); } catch (x) {} window._lpMs = window.__lpMs0; return o; }, { ks, ms });
  if (want('BG03')) {
    const dump = (o) => { let l = ''; const r = []; o.forEach((x) => { const z = x.i + ' ' + x.k + ' ' + (x.s || x.lab) + ' ' + (x.on ? x.f + '/' + x.seg + '@' + x.want : '-'); if (z !== l) { r.push(Math.round(x.t) + ' ' + z); l = z; } }); return r; };
    const toListen = () => f.evaluate(() => { const i = STEPS.findIndex((x) => x.k === 'listen'); if (i > -1 && STEPS[idx].k !== 'listen') { idx = i; render(); } return STEPS[idx].k; });   /* 크게 보기를 닫으면 고르기 화면으로 간다 — 판마다 듣기 화면에서(편지 끝 처리는 듣기 화면 · 크게 보기에서만 돈다) */
    const pv = async (nm, on, lt, bg, ks, ms) => { await setX({ on: Object.assign({ song: 0, free: 0, tribute: 0, bless: 1 }, on), bgm: bg, letter: lt }); await go(f, 'letter'); await toListen(); const o = await runP(ks, ms), L = await f.evaluate(() => window.__lt.slice());
      if (process.env.DBG) console.log('== ' + nm + '\n' + dump(o).join('\n') + '\nlt ' + JSON.stringify(L)); return { o, L, iE: o.findIndex((x) => x.s === 'narr-letter-end') }; };
    /* T01 미리 듣기 — 서로에게 → 테이블: 편지 끝 · b8(정적) 동안 소리 0 · M8 은 b8 뒤에서 */
    { const { o, L, iE } = await pv('each→table', { letter: 1, table: 1, toast: 1 }, 'each', {}, ['letter', 'table'], 28000), un = o.slice(iE).filter((x) => x.k === 'letter' && x.on), tb = o.filter((x) => x.k === 'table' && x.on);
      ok('BG03-T01 미리 듣기 서로에게 → 테이블 — 편지 끝 · b8(정적) 아래 소리 0 · 편지 끝 처리는 b8 에서 한 번 · M8 은 테이블에서', iE > -1 && !un.length && L.length === 1 && L[0].st === 'bridge-b8-face-guests' && L[0].r > 0 && tb.length > 0 && tb.every((x) => x.seg === 'M8'), { un: un.slice(0, 2), L, tb: tb.length && [tb[0].f, tb[0].seg] }); }
    /* T02 미리 듣기 — 편지만 따로 들을 때 다음 장면 첫 큐가 정적(축배 b13 −90 · 닫는 인사 −90) */
    for (const [nm, on] of [['서로에게(다음 축배)', { letter: 1, table: 0, toast: 1 }], ['서로에게(다음 닫는 인사)', { letter: 1, table: 0, toast: 0 }]]) {
      const { o, L, iE } = await pv(nm, on, 'each', {}, ['letter'], 16000), un = o.slice(Math.max(0, iE)).filter((x) => x.on);
      ok(`BG03-T02 미리 듣기 ${nm} — 편지 끝 처리(lpTail)는 불리되 M4 −16 / −8 올림 0(꼬리 0)`, iE > -1 && L.length === 1 && !un.length && L.every((x) => !(x.r > 0)), { un: un.slice(0, 3).map((x) => [x.s || x.lab, x.f, x.seg, x.want]), L }); }
    /* T03 미리 듣기 — 부모님께 → 테이블: 정적 2초 → 3초 오름 한 번 · 테이블 첫 줄 뜸이 또 걸지 않는다 */
    { const { o, L, iE } = await pv('parent→table', { letter: 1, table: 1, toast: 1 }, 'parent', {}, ['letter', 'table'], 24000), iT = o.findIndex((x) => x.k === 'table'), f1 = o.find((x) => x.on), fs = [...new Set(o.filter((x) => x.on).map((x) => x.f))];
      const dip = o.slice(o.indexOf(f1) + 1).some((x, j, a) => !x.on && a.slice(j).some((y) => y.on));
      ok('BG03-T03 미리 듣기 부모님께 → 테이블 — 편지 끝 처리 한 번 · 첫 소리는 테이블 첫 줄에서 약 2초 뒤 M8 · 곡 하나 · 끊김 0', iE > -1 && L.length === 1 && L[0].st === 'narr-letter-end' && !!f1 && f1.k === 'table' && f1.seg === 'M8' && f1.t - o[iT].t >= 1500 && fs.length === 1 && !dip, { L, f1: f1 && [f1.k, f1.seg, Math.round(f1.t - o[iT].t)], fs, dip }); }
    /* T04 엔진 — 음악 없는 편지 끝은 −90 그대로 · «음악과 함께»의 b8 은 −16(무조건 −90 으로 바꾸지 않는다) */
    { const eng = (lt, bg, on) => { const S = S0of(Object.assign({ song: 0, free: 0, tribute: 0 }, on)); S.letter = lt; S.bgm = bg; return C.build(S, { mode: 'console' }).cues; };
      const a = eng('each', {}, { letter: 1, table: 1, toast: 1 }), b = eng('each', { S6: { m: 'bed' } }, { letter: 1, table: 1, toast: 1 }), le = (R) => R.find((x) => x.slug === 'narr-letter-end') || {}, b8 = (R) => R[R.indexOf(le(R)) + 1] || {};
      ok('BG03-T04 엔진 — 음악 없이 편지 끝 −90 · 이음말 b8 −90 / «음악과 함께» 편지 끝 −20 · b8 −16 그대로', le(a).duck === -90 && b8(a).slug === 'bridge-b8-face-guests' && b8(a).duck === -90 && le(b).duck === -20 && b8(b).duck === -16, { a: [le(a).duck, b8(a).slug, b8(a).duck], b: [le(b).duck, b8(b).duck] }); }
    /* T05 미리 듣기 — 다음 곡(M8)이 늦게 오는 사이 멈추면 늦은 곡도 옛 곡도 올리지 않는다 */
    { await setX({ on: { song: 0, free: 0, tribute: 0, bless: 1, letter: 1, table: 1, toast: 1 }, bgm: {}, letter: 'parent' }); await go(f, 'letter'); await toListen();
      const r = await f.evaluate(async () => { const H = window.parent.H; const M8 = [BgmBed._t.songAt('table')].filter(Boolean); (M8 || []).forEach((x) => { H.dly[x] = 7000; delete BgmBed._t.BUF[x]; });
        const BB = BgmBed._t; window.__lt = []; LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(['letter', 'table'], true); _lFull(); (LP.q || []).forEach((x) => { if (x.talk || x.talk2 || x.said || x.act || x.quiet) x.ms = 2500; });
        await new Promise((res) => { const iv = setInterval(() => { if (window.__lt.length) { clearInterval(iv); res(); } }, 50); setTimeout(res, 20000); });
        try { lsStop(); } catch (e) {} try { lsCloseBig(); } catch (e) {} const o = []; await new Promise((res) => { const t0 = performance.now(), iv = setInterval(() => { const v = BB.BED.cur; o.push({ f: v && v.f, on: !!(v && v.src && v.want > -60) }); if (performance.now() - t0 > 9000) { clearInterval(iv); res(); } }, 100); });
        (M8 || []).forEach((x) => { delete H.dly[x]; }); return { lt: window.__lt.slice(), M8, on: o.filter((x) => x.on).slice(0, 3) }; });
      ok('BG03-T05 미리 듣기 다음 곡이 늦게 오는 사이 멈춤 — 늦은 곡 · 옛 곡 올림 0', r.lt.length === 1 && !r.on.length, r); }
  }
    ok('BG03 미리 듣기 쪽 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close();
  } catch (e) { ok('BG03 미리 듣기 갈래가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); } })();
  await Promise.all([laneA, laneB, laneC]);
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); }
await br.close(); srv.close();
console.log(fail ? `SEAM BG FAIL ${fail}` : 'SEAM BG OK');
process.exit(fail ? 1 : 0);
