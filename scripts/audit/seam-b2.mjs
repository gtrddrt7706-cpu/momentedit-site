#!/usr/bin/env node
/* ★★[SEAM_B2 2026-11-06 이음매 2차 묶음 B2 · BGM 몫(엔진) · 대본 채택 판정] 항목마다 깨 보기(옛 판 빨강) → 고친 뒤 초록 → 정상 대조 — 하네스는 seam-bg 와 같다
   음07 본식(M4)과 편지에 같은 곡을 고르면 — 곡 계획 첫 곡 = 두 분이 본식에 고른 곡(편지에 같은 곡을 써도 뒤로 밀지 않는다) · 식순 화면(미리 듣기) · 당일 콘솔 첫 곡 같음 · «…에서도 고른 곡이에요» 한 줄 그대로
   음02 R2 뒤 다시 재현 — 도착 잦아듦(4.5초)으로 맞절 · b8 · 첫 나레이션 위 입장 트랙 소거 겹침이 남지 않는다(남는 자리 0 · 검사로 고정)
   음03 맞절 바로 뒤 축배 — 본식 곡을 무음에서(당일 · 미리 듣기 같은 곡) · 옛 하객 맞이 · 화촉 곡 되살림 0 · «위하여» M7 · 축배 곡 없으면 본식 곡이 잇는다
   음06K(B2-K16 «정지는 정지») 입장 곡 도중 전체 정지 — 입장 곡 · 배경 0 · GO 재개 = 같은 곡 멈춘 자리부터(0.6초) · 도착 멘트 정상 잦아듦
   음06 일부러 정적인 자리에서 전체 정지 — 정적 그대로 · 다음 큐가 제 크기 · 촬영 후 안내 음악 그대로 · 입장 곡 도중 정지는 음06K
   음08 Web Audio 를 못 쓰는 기기의 ■ 끝내기 — 지금 크기에서 3초에 걸쳐 · 3.2초에 멈춤 · 걸음마다 음소거 · 볼륨 반영 · 새 크기 명령 · 새 시작 · 끝 정리에서 지난 페이드 무효
   음05 멈춘 동안 «음악 켜기» — 엔진은 이미 소리 0 · 이어 들을 때 멈춘 곡 자리(LPB.pz) · 줄 크기로 연다(재현 0 · 지킴이) · 단추 쪽(order-preview 7782 · 8568–8571)은 나레이션 몫
   음09 이어 든 직후 0.9초 «다시 덮지 않기»는 같은 줄에만 — 다른 줄로 옮기면 그 줄 곡 · 크기를 바로 · 끝내기 · 새 시작 때 기록을 지운다
   음10 쉼 예약에 실행 번호 + 다음 줄 — 이전 · 다음 · 순간 이동 · 멈춤 · 새 쉼에서 지난 예약 무효 · 번호와 지금 줄이 같을 때만 크기 변경
   음04 긴 입장 곡이 걷기 · 맞절 대기 중 끝나면 — 같은 곡 강조 자리부터 3초 겹쳐 잇는다(앞 장면 곡 · 배경음으로 돌아가지 않는다 · 끝 타이머 · onended 같은 정책) · 짧은 곡(ESD_NEED 미만)은 종전 M4 인계
   ONLY=음07,… 로 항목만 · BP_BED · BP_OP · BP_CUE · BP_CON · BP_PICKS = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
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
  /* [SEAM_B2_LANES] 항목마다 따로 브라우저 창 · 나란히(CI 칸 20분 안에) */
  await Promise.all([
  (async () => { try {
  if (want('음07')) {
    const P = require(PICKSF || path.join(ROOT, 'assets/bgm-picks.js')), SB = { bgm: { M4: { k: 'B10' }, S6: { m: 'bed', k: 'B10' } } }, R1 = P.plan(SB, {}), R0 = P.plan({ bgm: {} }, {}), R2 = P.plan({ bgm: { M4: { k: 'B10' } } }, {});
    ok('음07-T01 곡 계획 — 본식 B10 · 편지 «음악과 함께» B10 → 본식 첫 곡 B10(뒤로 밀지 않는다) · 편지 B10 · «본식에서도 고른 곡» 한 줄(dupSeg) 그대로', R1.M4.first === 'B10' && R1.M4S6.first === 'B10' && P.dupSeg(SB, 'M4S6') === 'M4', { M4: R1.M4.list, M4S6: R1.M4S6.first, dup: P.dupSeg(SB, 'M4S6') });
    ok('음07-T01 곡 계획 — 편지 칸을 안 써도(목록 1순위가 B10) 본식에 고른 B10 이 첫 곡', R2.M4.first === 'B10', R2.M4.list);
    ok('음07 대조 — 고르지 않으면 본식 1순위(B09)부터 · 목록 차례 그대로', R0.M4.first === P.PICKS.M4[0] && R0.M4.list.join() === R0.M4.list.join(), R0.M4.list);
    /* T02 미리 듣기 · 당일 콘솔 첫 곡이 같다 */
    const { ctx, f, errs } = await open(390, true);
    await f.evaluate(() => { S.on.letter = 1; S.bgm = { M4: { k: 'B10' }, S6: { m: 'bed', k: 'B10' } }; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); });
    const pv = await f.evaluate(() => { const pl = BgmBed._t.plan(false) || {}; return { first: pl.M4 && pl.M4.first, list: pl.M4 && pl.M4.list, day: BgmBed.dayAt ? BgmBed.dayAt('vow') : '' }; }), pf = pv.first; await ctx.close();
    const S = S0of({ letter: 1 }); S.bgm = { M4: { k: 'B10' }, S6: { m: 'bed', k: 'B10' } }; const c = await con(S, [['M4', 440]]), cf = await c.pg.evaluate(() => { const v = window.__segSel('M4'); return Array.isArray(v) ? v[0] : v; });
    ok('음07-T02 첫 곡 — 미리 듣기(곡 계획 · 감사 인사 자리 곡) · 당일 콘솔 모두 B10', pf === 'B10' && (!pv.day || pv.day === 'B10') && cf === 'B10', { preview: pv, console: cf }); ok('음07 쪽 오류 0', !errs.length && !c.errs.length, errs.concat(c.errs).slice(0, 3)); await c.ctx.close();
  }
  } catch (e) { ok('음07 갈래가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); } })(),
  (async () => { try {
  if (want('음03')) {
    /* 맞절 바로 뒤 축배(가운데 순간을 모두 뺀 판) — 본식 곡이 한 번도 안 깔렸다 · 시험 곡은 본식(M4) · 축배(M7) 둘(하객 맞이 곡 파일을 따로 두면 시험 브라우저가 두 번째 재생기를 못 연다 — 하객 맞이는 기본 배경음) */
    const OFF = { prevideo: 0, candle: 0, welcome: 0, vow: 0, free: 0, song: 0, tribute: 0, toast: 1, ring: 0, declare: 0, letter: 0, table: 0, bless: 0 };
    const day = async (FL) => { const S = S0of(OFF, 'A'); const c = await con(S, FL), iB = c.ix((x) => x.slug === 'narr-entry-bow'), i13 = c.ix((x) => x.slug === 'bridge-b13-toast-stay'), iT = c.ix((x) => x.slug === 'toast-toast');
      const s0 = await c.pg.evaluate(() => { const x = window.__seg.st(); return { seg: x.seg, id: x.id }; });
      await c.fire(iB); await c.pg.waitForTimeout(2500); await c.log0(); await c.fire(i13); const t1 = await c.trace(6000); await c.fire(iT); const t2 = await c.trace(3000);
      await c.pg.evaluate(() => window.__bgmGo.tap()); const t3 = await c.trace(3000), lg = await c.log(); await c.ctx.close(); return { iB, i13, iT, s0, t1, t2, t3, lg, errs: c.errs }; };
    const D = await day([['M4', 440, 60], ['M7', 660, 60]]), b13 = D.t1.filter((x) => x.cur === D.i13), up = D.lg.filter((x) => x.eff > -60), firstUp = up[0], segAtUp = firstUp ? (D.t1.find((x) => x.T >= firstUp.t) || {}).seg : null;
    ok('음03-T01 당일 맞절 → 축배 b13 — 본식 곡(M4)을 무음에서 · 앞 장면 곡(하객 맞이 · 기본 배경음) −16 되살림 0', D.i13 === D.iB + 1 && b13.length > 10 && b13.slice(-5).every((x) => x.seg === 'M4' && x.id === 'B09' && x.want > -60) && segAtUp === 'M4', { s0: D.s0, b13: [...new Set(b13.map((x) => x.seg + '/' + x.id + '@' + x.want))], segAtUp });
    const c3 = D.t3.slice(-5);
    ok('음03-T03 당일 «위하여» — 축배 곡(M7)이 축배 크기로(−90 으로 눌리지 않는다)', c3.every((x) => x.seg === 'M7' && x.id === 'B28') && D.lg.slice(-1)[0].eff > -60, { t3: [...new Set(D.t3.map((x) => x.seg + '/' + x.id + '@' + x.want))], last: D.lg.slice(-1)[0] });
    const N = await day([['M4', 440, 60]]), n3 = N.t3.slice(-5);
    ok('음03-T04 당일 축배 곡 파일이 없으면 — 본식 곡이 축배 크기로 이어진다(하객 맞이 · 화촉 곡으로 돌아가지 않는다)', n3.every((x) => x.seg === 'M4' && x.id === 'B09'), { t3: [...new Set(N.t3.map((x) => x.seg + '/' + x.id + '@' + x.want))] });
    ok('음03 콘솔 오류 0', !D.errs.length && !N.errs.length, D.errs.concat(N.errs).slice(0, 3));
    /* 미리 듣기 — 맞절 → 축배 이어 듣기: b13 의 곡 = 당일과 같은 본식 곡 */
    { const { ctx, f, errs } = await open(390, true);
      await f.evaluate((o) => { Object.keys(o).forEach((k) => { S.on[k] = o[k]; }); S.bgm = {}; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); }, OFF);
      await f.evaluate(() => { const i = STEPS.findIndex((x) => x.k === 'listen'); if (i > -1) { idx = i; render(); } });
      const o = await f.evaluate(async () => { const BB = BgmBed._t, o = []; LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(['matjeol', 'toast'], true); _lFull(); (LP.q || []).forEach((x) => { if (x.talk || x.talk2 || x.said || x.act || x.quiet) x.ms = 2500; });
        const t0 = performance.now(); await new Promise((res) => { const iv = setInterval(() => { const v = BB.BED.cur, st = LP.q[LP.i]; o.push({ t: performance.now() - t0, k: st && st.k, s: st && st.slug || '', f: v && v.f, on: !!(v && v.src && v.want > -60), want: v && v.want }); if (performance.now() - t0 > 16000) { clearInterval(iv); res(); } }, 100); });
        try { lsStop(); } catch (x) {} try { lsCloseBig(); } catch (x) {} return o; });
      const mj = o.filter((x) => x.k === 'matjeol' && x.on), b = o.filter((x) => x.s === 'bridge-b13-toast-stay' && x.on), fs = [...new Set(o.filter((x) => x.on).map((x) => x.f))];
      ok('음03-T02 미리 듣기 맞절 → 축배 — 맞절 정적 · b13 에서 본식 곡(B09 · 당일과 같은 곡)을 무음에서 · 곡 하나', !mj.length && b.length > 5 && fs.length === 1 && fs[0] === 'B09', { mj: mj.length, b: b.length, fs });
      ok('음03 미리 듣기 쪽 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close(); }
  }
  } catch (e) { ok('음03 갈래가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); } })(),
  (async () => { if (!want('음06K')) return; try {
    /* 음06K(B2-K16 «정지는 정지») — 입장 걷기 중 전체 정지 → 10초 · 60초 동안 입장 곡 · 배경 0 → GO 재개 = 같은 곡 멈춘 자리 ±1초 · 배경 0 → 도착 멘트에서 정상 잦아듦 */
    const SR = 22050, mk = (sec) => { const n = SR * sec, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
      for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(9000 * Math.sin(2 * Math.PI * 220 * i / SR)), 44 + i * 2); return b.toString('base64'); };
    const SONG = mk(150), FID = 'SONGID0123456789abcd', S1 = Object.assign(S0of({ prevideo: 0, candle: 0 }, 'A'), { entryVoice: 'nar', mu: { src: 'up', name: 'song-day', t: '시험 곡', a: '', dur: 150, hook: 40, typed: null, sid: 'x1', fid: FID } });
    const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }), pg = await ctx.newPage(), errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; window.__bgmLog = []; });
    await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); const H = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
      if (/script\.google\.com/.test(u)) { let b = {}; try { b = JSON.parse(rt.request().postData() || '{}'); } catch {}
        if (b.fn === 'adminRitualFiles') return rt.fulfill({ status: 200, headers: H, body: JSON.stringify({ ok: true, sup: {}, files: [{ key: 'mu', id: FID, name: '입장 음악 · song-day.wav' }] }) });
        if (b.fn === 'adminRitualFileGet') return rt.fulfill({ status: 200, headers: H, body: JSON.stringify({ ok: true, id: FID, mime: 'audio/wav', data: SONG }) }); }
      return rt.fulfill({ status: 200, headers: H, body: '{"ok":true}' }); });
    await pg.goto(`http://127.0.0.1:${port}/console.html`); await pg.evaluate(() => { localStorage.setItem('me_admin_token', 'T0K'); });
    await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S1)).toString('base64'))}&rf=ME0001`); await pg.waitForTimeout(800);
    await pg.waitForFunction(() => window.__esd.s().st === 'ok', null, { timeout: 60000 }).catch(() => {}); await pg.click('#go'); await pg.waitForFunction(() => window.__esd.s().v0 && window.__esd.idx().e >= 0, null, { timeout: 60000 }).catch(() => {});
    const Rq = await pg.evaluate(() => window.__bgmR()), I = await pg.evaluate(() => window.__esd.idx()), iA = Rq.findIndex((x) => x.slug === 'narr-entry-arrive');
    await pg.evaluate((j) => window.__esd.fire(j), I.e); await pg.waitForTimeout(500);
    for (let k = 0; k < 3 && !(await pg.evaluate(() => window.__esd.s().run)); k++) { await pg.waitForTimeout(1500); await pg.evaluate((j) => window.__esd.fire(j), I.e); await pg.waitForTimeout(500); }
    await pg.waitForFunction(() => window.__esd.s().phase !== 'clip', null, { timeout: 60000 }).catch(() => {}); await pg.waitForTimeout(2000);
    const w = await pg.evaluate(() => window.__esd.s()); await pg.evaluate(() => { window.__bgmLog.length = 0; }); await pg.evaluate(() => window.__esdT.panic());
    const smp = async () => pg.evaluate(() => { const x = window.__esd.s(); return { run: x.run, paused: x.paused, now: x.duck }; });
    await pg.waitForTimeout(10000); const s10 = await smp(); await pg.waitForTimeout(50000); const s60 = await smp(), lp = await pg.evaluate(() => window.__bgmLog.slice());
    await pg.evaluate(() => { window.__bgmLog.length = 0; }); await pg.evaluate(() => window.__bgmGo.tap()); await pg.waitForTimeout(1200); const r1 = await pg.evaluate(() => window.__esd.s()), lr = await pg.evaluate(() => window.__bgmLog.slice());
    await pg.evaluate((j) => window.__bgmGo.fire(j), iA); const ta = []; for (let k = 0; k < 70; k++) { await pg.waitForTimeout(100); ta.push(await pg.evaluate(() => { const x = window.__esd.s(); return { run: x.run, dkg: x.dkg, cur: x.cur }; })); }
    const quiet = (x) => !x.run && x.paused != null && Math.abs(x.paused - w.spos) <= 1 && x.now <= -60;
    ok('음06K-T01 입장 걷기 중 전체 정지 — 10초 · 60초 동안 입장 곡 · 배경 재생 0 · 배경 −8 복귀 0', w.run && w.spos > 0 && quiet(s10) && quiet(s60) && !lp.some((x) => x.eff > -60), { w: [w.run, w.spos, w.phase], s10, s60, up: lp.filter((x) => x.eff > -60).slice(0, 3) });
    ok('음06K-T02 GO 재개 — 같은 곡(150초 판) · 멈춘 자리 ±1초에서 이어짐 · 배경 0', r1.run && r1.sbuf === 150 && Math.abs(r1.spos - s60.paused - 1.2) <= 1 && !lr.some((x) => x.eff > -60), { r1: [r1.run, r1.sbuf, r1.spos], paused: s60.paused, lr: lr.slice(0, 3) });
    const fa = ta.filter((x) => x.run);
    ok('음06K-T03 다음 큐(도착 멘트) — 입장 곡이 정상으로 잦아든다(계속 내려가 7초 안에 −34 dB 아래로)', iA > -1 && fa.length > 10 && fa[0].cur === iA && fa[0].dkg > 0.3 && fa.every((x, j) => !j || x.dkg <= fa[j - 1].dkg + 0.001) && fa[fa.length - 1].dkg <= 0.02, { first: fa[0], last: fa[fa.length - 1], n: fa.length });
    ok('음06K 콘솔 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close();
  } catch (e) { ok('음06K 갈래가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); } })(),
  (async () => {   /* 입장 장면(곡 해독 · Web Audio)을 쓰는 둘은 차례로 — 나란히 돌리면 시험 기기 부하로 곡을 제때 못 연다 */
    try {
  if (want('음02')) {
    /* R2 뒤 다시 재현 — 입장(곡 150초) → 도착(4.5초 잦아듦) → 맞절(정적) → b8 → 감사 인사 첫 줄: 입장 전용 트랙이 b8 · 첫 나레이션 위에서 들리면 겹침 */
    const SR = 22050, mk = (sec) => { const n = SR * sec, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
      for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(9000 * Math.sin(2 * Math.PI * 220 * i / SR)), 44 + i * 2); return b.toString('base64'); };
    const SONG = mk(150), FID = 'SONGID0123456789abcd', S1 = Object.assign(S0of({ prevideo: 0, candle: 0 }, 'A'), { entryVoice: 'nar', mu: { src: 'up', name: 'song-day', t: '시험 곡', a: '', dur: 150, hook: 40, typed: null, sid: 'x1', fid: FID } });
    const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }), pg = await ctx.newPage(), errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; window.__bgmLog = []; });
    await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); const H = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
      if (/script\.google\.com/.test(u)) { let b = {}; try { b = JSON.parse(rt.request().postData() || '{}'); } catch {}
        if (b.fn === 'adminRitualFiles') return rt.fulfill({ status: 200, headers: H, body: JSON.stringify({ ok: true, sup: {}, files: [{ key: 'mu', id: FID, name: '입장 음악 · song-day.wav' }] }) });
        if (b.fn === 'adminRitualFileGet') return rt.fulfill({ status: 200, headers: H, body: JSON.stringify({ ok: true, id: FID, mime: 'audio/wav', data: SONG }) }); }
      return rt.fulfill({ status: 200, headers: H, body: '{"ok":true}' }); });
    await pg.goto(`http://127.0.0.1:${port}/console.html`); await pg.evaluate(() => { localStorage.setItem('me_admin_token', 'T0K'); });
    await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S1)).toString('base64'))}&rf=ME0001`); await pg.waitForTimeout(800);
    await pg.waitForFunction(() => window.__esd.s().st === 'ok', null, { timeout: 60000 }).catch(() => {}); await pg.click('#go'); await pg.waitForFunction(() => window.__esd.s().v0 && window.__esd.idx().e >= 0, null, { timeout: 60000 }).catch(() => {});   /* 시작(GO 판)이 서고 입장 큐가 잡힐 때까지 */
    const Rq = await pg.evaluate(() => window.__bgmR()), I = await pg.evaluate(() => window.__esd.idx()), iA = Rq.findIndex((x) => x.slug === 'narr-entry-arrive'), i8 = Rq.findIndex((x, j) => j > iA && x.slug === 'bridge-b8-face-guests'), iW = Rq.findIndex((x, j) => j > i8 && x.k !== 'entry' && x.k !== 'matjeol' && x.slug !== 'bridge-b8-face-guests');
    await pg.evaluate((j) => window.__esd.fire(j), I.e); await pg.waitForFunction(() => window.__esd.s().phase !== 'clip', null, { timeout: 60000 }).catch(() => {}); await pg.waitForTimeout(3000);
    const walk = await pg.evaluate(() => window.__esd.s()); await pg.evaluate((j) => window.__bgmGo.fire(j), iA);
    const tr = []; for (let k = 0; k < 120; k++) { await pg.waitForTimeout(100); tr.push(await pg.evaluate(() => { const x = window.__esd.s(), a = window.__bgmSt(); return { cur: a.cur, phase: a.phase, run: x.run, dkg: x.dkg }; })); }
    await pg.evaluate((j) => window.__bgmGo.fire(j), i8); const t8 = []; for (let k = 0; k < 40; k++) { await pg.waitForTimeout(100); t8.push(await pg.evaluate(() => { const x = window.__esd.s(), a = window.__bgmSt(); return { cur: a.cur, phase: a.phase, run: x.run, dkg: x.dkg }; })); }
    const mj = tr.filter((x) => Rq[x.cur] && Rq[x.cur].k === 'matjeol'), loud8 = t8.filter((x) => x.run && x.dkg > 0.01);
    ok('음02-T01 R2 뒤 — 도착에서 입장 곡이 잦아들어 맞절 동안 입장 트랙이 계속 내려가 −40 dB 아래로 · b8 · 감사 인사 첫 나레이션 위로 들리는 입장 트랙 0(소거 겹침 0)', walk.run && walk.dkg > 0.5 && mj.length > 3 && mj.every((x, j) => !j || !x.run || x.dkg <= mj[j - 1].dkg + 0.001) && (!mj[mj.length - 1].run || mj[mj.length - 1].dkg <= 0.01) && !loud8.length, { walk: [walk.run, walk.dkg], mj: mj.slice(0, 4).map((x) => x.dkg), loud8: loud8.slice(0, 3), iA, i8, iW });
    ok('음02 콘솔 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close();
  }
    } catch (e) { ok('음02 갈래가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); }
    try {
  if (want('음04')) {
    /* 시험 곡 32초 · 강조 24초 — 콘솔 «긴 곡» 기준(ESD_NEED 180초)을 5초로 낮춰 긴 곡으로 · 기본(180)이면 짧은 곡 대조 */
    const SR = 22050, mk = (sec) => { const n = SR * sec, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
      for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(9000 * Math.sin(2 * Math.PI * 220 * i / SR)), 44 + i * 2); return b.toString('base64'); };
    const SONG = mk(32), FID = 'SONGID0123456789abcd', S1 = Object.assign(S0of({}, 'A'), { entryVoice: 'nar', mu: { src: 'up', name: 'song-day', t: '시험 곡', a: '', dur: 32, hook: 24, typed: null, sid: 'x1', fid: FID } });
    const run = async (need) => { const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }), pg = await ctx.newPage(), errs = []; pg.on('pageerror', (e) => errs.push(e.message));
      await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; window.__bgmLog = []; });
      await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); const H = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
        if (/script\.google\.com/.test(u)) { let b = {}; try { b = JSON.parse(rt.request().postData() || '{}'); } catch {}
          if (b.fn === 'adminRitualFiles') return rt.fulfill({ status: 200, headers: H, body: JSON.stringify({ ok: true, sup: {}, files: [{ key: 'mu', id: FID, name: '입장 음악 · song-day.wav' }] }) });
          if (b.fn === 'adminRitualFileGet') return rt.fulfill({ status: 200, headers: H, body: JSON.stringify({ ok: true, id: FID, mime: 'audio/wav', data: SONG }) }); }
        return rt.fulfill({ status: 200, headers: H, body: '{"ok":true}' }); });
      await pg.goto(`http://127.0.0.1:${port}/console.html`); await pg.evaluate(() => { localStorage.setItem('me_admin_token', 'T0K'); });
      await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S1)).toString('base64'))}&rf=ME0001`); await pg.waitForTimeout(800);
      await pg.waitForFunction(() => window.__esd.s().st === 'ok', null, { timeout: 60000 }).catch(() => {}); await pg.click('#go'); await pg.waitForFunction(() => window.__esd.s().v0 && window.__esd.idx().e >= 0, null, { timeout: 60000 }).catch(() => {});   /* 시작(GO 판)이 서고 입장 큐가 잡힐 때까지 */
      if (need != null) await pg.evaluate((n) => window.__esdT.need(n), need); const I = await pg.evaluate(() => window.__esd.idx()); await pg.evaluate((j) => window.__esd.fire(j), I.e); await pg.waitForTimeout(500);
      for (let k = 0; k < 3 && !(await pg.evaluate(() => window.__esd.s().run)); k++) { await pg.waitForTimeout(1500); await pg.evaluate((j) => window.__esd.fire(j), I.e); await pg.waitForTimeout(500); }   /* 시험 기기가 바빠 장면이 늦게 서면 다시 GO */
      const a = await pg.evaluate(() => window.__esd.s()); await pg.evaluate(() => { window.__bgmLog.length = 0; });
      const o = []; for (let k = 0; k < (need != null ? 42 : 34); k++) { await pg.waitForTimeout(1000); const x = await pg.evaluate(() => { const x = window.__esd.s(); return { run: x.run, relay: x.relay, cur: x.cur, duck: x.duck }; }); o.push(x);
        if (need != null ? x.relay >= 2 && o.filter((y) => y.relay >= 2).length >= 3 : !x.run && o.filter((y) => !y.run).length >= 3) break; }   /* 볼 것을 보면 일찍 끝낸다(긴 곡 = 두 번 이은 뒤 3초 · 짧은 곡 = 끝난 뒤 3초) */
      const lg = await pg.evaluate(() => window.__bgmLog.slice()); await ctx.close(); return { a, o, lg, I, errs }; };
    const L = await run(5), last = L.o[L.o.length - 1];
    ok('음04-T01 긴 입장 곡이 입장 묶음 안에서 끝나면 — 같은 곡 강조 자리부터 이어 잇기(장면 계속 · 두 번 넘게 이어도 같은 run) · 배경음(앞 장면 곡) 올림 0', L.a.run && !L.a.short && L.o.every((x) => x.run) && last.relay >= 2 && !L.lg.some((x) => x.eff > -60), { a: [L.a.run, L.a.short], relays: [...new Set(L.o.map((x) => x.relay))], up: L.lg.filter((x) => x.eff > -60).slice(0, 3), errs: L.errs.slice(0, 2) });
    const Sh = await run(null), endAt = Sh.o.findIndex((x) => !x.run);
    ok('음04-T02 대조 짧은 곡(기본 180초 기준) — 곡이 끝나면 종전대로 인계(장면 끝 · 이어 잇기 0)', Sh.a.run && Sh.a.short && endAt > 0 && Sh.o.slice(0, endAt).every((x) => !x.relay), { a: [Sh.a.run, Sh.a.short, Sh.a.st, Sh.a.sg, Sh.a.v0, Sh.a.why, Sh.a.ac, Sh.a.phase, Sh.a.cur, Sh.a.ri], endAt, relays: [...new Set(Sh.o.map((x) => x.relay))] });
    ok('음04 콘솔 오류 0', !L.errs.length && !Sh.errs.length, L.errs.concat(Sh.errs).slice(0, 3));
  }
    } catch (e) { ok('음04 갈래가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); } })(),
  (async () => { try {
  if (want('음06')) {
    const c = await con(S0of({ prevideo: 0, candle: 0 }, 'A'), [['M1', 330, 60], ['M4', 440, 60]]), iB = c.ix((x) => x.slug === 'narr-entry-bow'), iW = c.ix((x) => x.slug === 'narr-welcome-in'), iV = c.ix((x, j) => j > iW && x.k === 'welcome' && x.duck > -60 && x.fire === 'manual'), iP = c.ix((x) => x.slug === 'after-photo');
    /* T01 맞절(정적 −90)에서 전체 정지 → 오래 기다려도 올림 0 · 다음 큐는 제 크기 */
    await c.fire(iB); await c.pg.waitForTimeout(2500); await c.log0(); await c.pg.evaluate(() => window.__esdT.panic()); await c.pg.waitForTimeout(4000); const l1 = await c.log(), pa = await c.pg.evaluate(() => window.__esdT.panicAt());
    await c.log0(); await c.fire(iW); await c.pg.waitForTimeout(9000); const l2 = await c.log();
    ok('음06-T01 맞절(정적)에서 전체 정지 — 올림 0(−8 로 커지지 않는다) · 정지 순간 기록(입장 곡 따로 흐름 아님 · 목표 −90) · 다음 큐(감사 인사)를 내면 그 큐 크기', !l1.some((x) => x.eff > -60) && pa && pa.esd === false && pa.want <= -60 && l2.some((x) => x.eff > -60), { l1, pa, l2: l2.slice(0, 3) });
    /* T02 대조 — 들리는 자리(감사 인사 줄)에서 정지하면 종전대로 큐 사이 크기(−8) */
    await c.log0(); await c.pg.evaluate(() => window.__esdT.panic()); await c.pg.waitForTimeout(1500); const l3 = await c.log();
    ok('음06-T02 대조 들리는 자리에서 정지 — 종전대로 −8', l3.some((x) => x.db === -8), l3);
    /* T03 촬영 후 안내(추가 촬영 음악)에서 정지 — 크기 그대로 */
    if (iP > -1) { await c.fire(iP); await c.pg.waitForTimeout(5000); await c.log0(); await c.pg.evaluate(() => window.__esdT.panic()); await c.pg.waitForTimeout(1500); const l4 = await c.log();
      ok('음06-T03 촬영 후 안내에서 정지 — 추가 촬영 음악 크기 그대로(크기 명령 0)', !l4.length, l4); } else ok('음06 시험 조건(촬영 후 안내 큐)', false, { iP });
    ok('음06 콘솔 오류 0', !c.errs.length, c.errs.slice(0, 3)); await c.ctx.close();
  }
  } catch (e) { ok('음06 갈래가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); } })(),
  (async () => { try {
  if (want('음08')) {
    /* Web Audio 를 못 쓰는 기기(대체 재생기) — ■ 끝내기가 지금 크기에서 3초에 걸쳐 내려가고 3.2초에 멈춘다 · 걸음마다 볼륨 슬라이더 반영 */
    const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }), pg = await ctx.newPage(), errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; window.__bgmLog = []; try { delete window.AudioContext; delete window.webkitAudioContext; } catch (e) {} window.AudioContext = undefined; window.webkitAudioContext = undefined; });
    await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: '{"ok":true}' })));
    const S = S0of({}, 'A'); await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S)).toString('base64'))}`); await pg.waitForTimeout(900);
    const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'seamb2-')), fp = path.join(TMP, 'M1.wav'); fs.writeFileSync(fp, wav(60, 330)); await pg.setInputFiles('.sg[data-seg="M1"] .sg-song:nth-of-type(1) [data-seg-file]', fp, { timeout: 4000 }); await pg.waitForTimeout(1200);
    await pg.click('#go'); await pg.waitForTimeout(4000);
    const n = await pg.evaluate(() => window.__bgmR().length); const v0 = await pg.evaluate(() => { const a = [...document.querySelectorAll('audio')].filter((x) => !x.paused && /blob:/.test(x.src)); return a.length ? a[0].volume : null; });
    await pg.evaluate((n) => window.__bgmGo.fire(n), n);
    const o = []; for (let k = 0; k < 20; k++) { await pg.waitForTimeout(200); if (k === 8) await pg.evaluate(() => { const v = document.getElementById('vol'); v.value = String(Math.round(+v.value / 2)); v.dispatchEvent(new Event('input')); }); o.push(await pg.evaluate(() => { const a = [...document.querySelectorAll('audio')].filter((x) => /blob:/.test(x.getAttribute('src') || '')); return a.map((x) => ({ v: Math.round(x.volume * 1000) / 1000, p: x.paused })).find((x) => x.v > 0 || !x.p) || { v: 0, p: true }; })); }
    const mid = o[5], before = o[7], after = o[9], end = o[o.length - 1];
    ok('음08-T01 대체 재생기 ■ 끝내기 — 지금 크기에서 3초에 걸쳐(1.2초 즈음 40 ~ 80%) · 볼륨 슬라이더를 절반으로 내리면 바로 반영 · 3.2초 뒤 멈춤', v0 > 0 && mid.v > v0 * 0.4 && mid.v < v0 * 0.85 && after.v < before.v * 0.75 && end.p && end.v === 0, { v0, o: o.map((x) => x.v), end });
    ok('음08 콘솔 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close();
  }
  } catch (e) { ok('음08 갈래가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); } })(),
  (async () => { try {
  if (want('음05')) {
    /* 멈춘 동안 «음악 켜기» — 켠 것만 기억(소리 0) · 이어 들을 때 지금 줄 곡 · 줄 크기로 · 끄기 · 새 시작은 기억을 지운다(엔진 몫 · 단추는 order-preview) */
    const { ctx, f, errs } = await open(390, true);
    await f.evaluate(() => { const i = STEPS.findIndex((x) => x.k === 'listen'); if (i > -1) { idx = i; render(); } });
    const r = await f.evaluate(async () => { const BB = BgmBed._t, W = (ms) => new Promise((r) => setTimeout(r, ms)), on = () => !!(BB.BED.cur && BB.BED.cur.src && BB.BED.cur.want > -60);
      LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(['welcome'], true); _lFull(); (LP.q || []).forEach((x) => { if (x.talk || x.talk2 || x.said || x.act || x.quiet) x.ms = 2500; }); for (let k = 0; k < 120 && !(LP.i >= 1 && on()); k++) await W(100); await W(800); const a0 = on();
      LP.paused = true; clearTimeout(LP.t); LP.tok++; await W(1500); BgmBed.lpEnd(); await W(2000); const a1 = on();   /* 멈춤 → (멈춘 곡 기억) → «음악 끄기» → «음악 켜기» → 이어 듣기 */
      let pick = -1; for (let j = 0; j < LP.q.length; j++) { const x = LP.q[j]; if (x.k === 'welcome' && !x._pre && !x.bridge && x.dk != null && x.dk > -60 && !/narr-welcome-in/.test(x.slug || '') && !/^bridge-/.test(x.slug || '')) { pick = j; break; } } if (pick < 0) pick = LP.q.length - 1; LP.i = pick;   /* 뜸 줄(감사 인사 첫 줄)이 아닌 줄 — lpShow 가 곡을 바로 까는 자리 */
      const st = LP.q[LP.i]; BgmBed.lpShow(st); await W(2500); const a2 = on();
      LP.paused = false; const rr = BgmBed.lpResume(); await W(1500); const a3 = on(), f3 = BB.BED.cur && BB.BED.cur.f, w3 = BB.BED.cur && BB.BED.cur.want;
      /* 대조 — 멈춘 동안 켰다가 끄면 이어 들어도 소리 0 */
      LP.paused = true; BgmBed.lpEnd(); await W(1600); BgmBed.lpShow(LP.q[LP.i]); BgmBed.lpEnd(); LP.paused = false; const rr2 = BgmBed.lpResume(); await W(1500); const a4 = on();
      try { lsStop(); } catch (e) {} try { lsCloseBig(); } catch (e) {} return { a0, a1, a2, rr, a3, f3, w3, rr2, a4, lab: st && (st.slug || st.lab) }; });
    ok('음05-T01 멈춘 동안 «음악 끄기 → 켜기» — 소리 0 · 이어 들으면 지금 줄 곡이 줄 크기로(엔진은 이미 이렇게 동작 · 지킴이)', r.a0 && !r.a1 && !r.a2 && r.rr && r.a3 && r.w3 > -60, r);
    ok('음05-T02 대조 — 멈춘 동안 켰다가 끄면 이어 들어도 소리 0(기억 지움)', !r.rr2 && !r.a4, r);
    ok('음05 쪽 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close();
  }
  } catch (e) { ok('음05 갈래가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); } })(),
  (async () => { try {
  if (want('음09')) {
    /* 이어 든 직후 0.9초 «다시 덮지 않기»(LPB.rs)는 같은 줄에만 — 다른 줄로 옮기면 그 줄 크기를 바로 */
    const { ctx, f, errs } = await open(390, true);
    await f.evaluate(() => { const i = STEPS.findIndex((x) => x.k === 'listen'); if (i > -1) { idx = i; render(); } });
    const r = await f.evaluate(async () => { const BB = BgmBed._t, W = (ms) => new Promise((r) => setTimeout(r, ms)), on = () => !!(BB.BED.cur && BB.BED.cur.src && BB.BED.cur.want > -60);
      LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(['welcome'], true); _lFull(); (LP.q || []).forEach((x) => { if (x.talk || x.talk2 || x.said || x.act || x.quiet) x.ms = 2500; }); for (let k = 0; k < 120 && !on(); k++) await W(100); await W(1500);
      const nar = LP.q.findIndex((x) => x.k === 'welcome' && !x._pre && !x.talk && !x.talk2 && x.dk === -16 && !/^bridge-/.test(x.slug || '')), tk = LP.q.findIndex((x) => x.k === 'welcome' && (x.talk || x.talk2) && x.ldk === -20);
      LP.paused = true; clearTimeout(LP.t); LP.tok++; await W(1500); LP.i = nar; LP.paused = false; const rr = BgmBed.lpResume(); await W(200); const w0 = BB.BED.cur.want;
      LP.i = tk; BgmBed.lpShow(LP.q[tk]); await W(400); const w1 = BB.BED.cur.want;
      /* 대조 — 같은 줄을 다시 보이면 0.9초 안에는 덮지 않는다 */
      LP.paused = true; await W(1500); LP.paused = false; const rr2 = BgmBed.lpResume(); await W(200); const w2 = BB.BED.cur.want, n2 = BB.BED.cur; BgmBed.lpShow(LP.q[tk]); await W(300); const same = BB.BED.cur === n2 && BB.BED.cur.want === w2;
      try { lsStop(); } catch (e) {} try { lsCloseBig(); } catch (e) {} return { nar, tk, rr, w0, w1, rr2, w2, same }; });
    ok('음09-T01 이어 든 직후(0.9초 안) 다른 줄로 옮기면 — 그 줄 크기(−20)로 바로', r.nar > -1 && r.tk > -1 && r.rr && r.w0 === -16 && r.w1 === -20, r);
    ok('음09-T02 대조 — 같은 줄은 0.9초 안에 다시 덮지 않는다', r.rr2 && r.same, r);
    ok('음09 쪽 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close();
  }
  } catch (e) { ok('음09 갈래가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); } })(),
  (async () => { try {
  if (want('음10')) {
    /* 쉼 예약(줄 사이 미리 낮추기)은 실행 번호 + 다음 줄 — 그사이 다른 줄로 옮기면 지난 예약이 크기를 덮지 않는다(감사 인사 여는 말 뒤 −16 이 −20 으로 덮이던 것) */
    const { ctx, f, errs } = await open(390, true);
    await f.evaluate(() => { const i = STEPS.findIndex((x) => x.k === 'listen'); if (i > -1) { idx = i; render(); } });
    const r = await f.evaluate(async () => { const BB = BgmBed._t, W = (ms) => new Promise((r) => setTimeout(r, ms)), on = () => !!(BB.BED.cur && BB.BED.cur.src && BB.BED.cur.want > -60);
      LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(['welcome'], true); _lFull(); (LP.q || []).forEach((x) => { if (x.talk || x.talk2 || x.said || x.act || x.quiet) x.ms = 2500; }); for (let k = 0; k < 120 && !on(); k++) await W(100); await W(1500);
      const nar = LP.q.findIndex((x) => x.k === 'welcome' && !x._pre && !x.talk && !x.talk2 && x.dk === -16 && !/^bridge-/.test(x.slug || '')), tk = LP.q.findIndex((x) => x.k === 'welcome' && (x.talk || x.talk2) && x.ldk === -20);
      LP.paused = true; clearTimeout(LP.t); LP.tok++; await W(300); LP.paused = false;
      LP.i = nar; BgmBed.lpShow(LP.q[nar]); await W(1500); const w0 = BB.BED.cur.want;
      /* 다음 줄(말 · −20) 쉼 예약을 걸고 · 그 쉼 안에 다른 줄(나레이션 · −16)로 옮긴다 */
      LP.i = tk; BgmBed.lpGap(LP.q[nar], LP.q[tk], 1500); await W(200); LP.i = nar; BgmBed.lpShow(LP.q[nar]); await W(2500); const w1 = BB.BED.cur.want;
      /* 대조 — 옮기지 않으면 예약대로 다음 줄 크기(−20)로 */
      LP.i = tk; BgmBed.lpGap(LP.q[nar], LP.q[tk], 1500); await W(2500); const w2 = BB.BED.cur.want;
      try { lsStop(); } catch (e) {} try { lsCloseBig(); } catch (e) {} return { nar, tk, w0, w1, w2 }; });
    ok('음10-T01 쉼 예약 뒤 다른 줄로 옮기면 — 지난 예약이 크기를 덮지 않는다(−16 그대로)', r.nar > -1 && r.tk > -1 && r.w0 === -16 && r.w1 === -16, r);
    ok('음10-T02 대조 — 옮기지 않으면 예약대로 다음 줄 크기(−20)', r.w2 === -20, r);
    ok('음10 쪽 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close();
  }
  } catch (e) { ok('음10 갈래가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); } })(),
  ]);
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); }
await br.close(); srv.close();
console.log(fail ? `SEAM B2 FAIL ${fail}` : 'SEAM B2 OK');
process.exit(fail ? 1 : 0);
