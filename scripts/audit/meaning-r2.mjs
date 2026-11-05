#!/usr/bin/env node
/* ★★[MEANING_R2_1102 2026-11-02 사장님 «도착에서 잦아듦으로 고쳐» · «이런 포인트들을 식순 전체에 녹여»] 행진은 음악 · 의식은 조용한 고점 · 새 장면은 새 곡
   E 엔진 한 표(미리 듣기 · 연습 · 당일 콘솔) — b7 −16 · 줄 끝 2초 −90 + 정적 1초 · 도착 멘트 −90 을 4.5초(fadeWith) · 맞절 안내 · 맞절 정적 · b8 정적 → 감사 인사 6초 앞 −8 ·
     선언 뒤 박수 새 곡(newSong · 0.6초) · 부모님께 걸어가기 −12(walkDuck) · 말하는 차례 −20
   P 미리 듣기 이어 듣기(화촉 → 입장 → 맞절 → 감사 인사 → … → 덕담) —
     1 걷기 0 dB · 도착 멘트 동안 −90 · 맞절 · b8 동안 재생 0 · b8 뒤 감사 인사 곡이 무음에서(−8 뜸)
     2 b7 −16 · 화촉 곡과 입장 곡 사이 정적 ≥ 1초(겹침 0)
     3 곡 길이 9초(하네스) — 반지 · 두 분 차례 · 행동 줄 안에서 곡이 바뀌는 일 0(다음 나레이션 줄에서 넘김)
     4 선언 뒤 박수 = 앞 곡이 아닌 새 곡 · 강조 자리부터
     5 부모님께 걸어가는 줄 −12 · 말하는 차례 −20
   R 연습 — B 두 분 차례 줄에 60초 머묾(곡 9초 · 실제 곡이면 수십 분) → 곡 이름 바뀜 0 · 같은 곡 반복 ≥ 1회 · 정적 0 · 걷기 20초 머묾 → 입장 곡 0 dB 그대로
   S 화면 글 — 맞절 «두 분이 앞에 서시면 음악이 잦아들고 …» · 선언 «… 축하 박수와 함께 새 곡이 시작돼요»
   BP_BED · BP_OP · BP_CUE · BP_SLOTS = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
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
const HAVE = ['B01', 'B07', 'B09', 'B10', 'B12', 'B13', 'B15', 'B16', 'B17', 'B24', 'B28', 'B32'];   /* B32 = 마지막 곡(M8L) — 촬영 후 안내 */   /* 화촉 1 · 2(B05 · B31)는 없다 — d */   /* [BGM_TIMING_1101] 테이블 인사 곡(B23)도 — 축배 뜸 곡 e */
const SONG = {}; HAVE.forEach((k, i) => { SONG[k] = wav(9, 180 + i * 20).toString('base64'); });
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

const go = async (f, k) => { await f.evaluate((k) => mkGo(k), k); await wait(f, 700); };
const MU = { src: 'rec', k: 'r5', t: '시험 입장 곡', a: '시험 가수', hook: 40, hooks: [40], dur: 140 };
const setX = (f, o) => f.evaluate((o) => { Object.keys(o.on || {}).forEach((k) => { S.on[k] = o.on[k]; }); S.freeWhat = 'speech'; S.bgm = o.bgm || {}; S.mu = o.mu; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); }, o);
const run = (f, ks, ms) => f.evaluate(async ({ ks, ms }) => { const BB = BgmBed._t, o = []; if (!window.__lpMs0) window.__lpMs0 = window._lpMs; window._lpMs = function () { return 2500; };
  if (ks.length > 1) { LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(ks, true); _lFull(); } else lsPlay(ks[0]);
  (LP.q || []).forEach((x) => { if (x.talk || x.talk2 || x.said || x.act || x.quiet) x.ms = 2500; });
  const t0 = performance.now(); await new Promise((res) => { const iv = setInterval(() => { const v = BB.BED.cur, st = LP.q[LP.i]; o.push({ t: performance.now() - t0, k: st && st.k, s: st && st.slug || '', i: LP.i, lab: st && st.lab || '', of: st && st.of || '', act: !!(st && (st.act || st.quiet)), talk: !!(st && (st.talk || st.talk2 || st.bridge)), f: v && v.f, on: !!(v && v.src && v.want > -60), want: v && v.want, off: v && v.off });
    if (performance.now() - t0 > ms || !LP.q.length) { clearInterval(iv); res(); } }, 100); });
  try { lsStop(); } catch (x) {} try { if (ks.length > 1) lsCloseBig(); } catch (x) {} window._lpMs = window.__lpMs0; return o; }, { ks, ms });
const segs = (o, pr) => o.filter(pr);
try {
  /* 두 판을 나란히(CI 칸 20분 한도) — 엔진 표 + 이어 듣기 / 부모님께 · 연습 · 화면 글 */
  const ON = { candle: 1, bless: 1, free: 1, song: 1, letter: 1, tribute: 1, table: 1, toast: 1 };
  const prep = async () => { const r = await open(390, true); await r.f.waitForFunction(() => !!(window.ENG && ENG.RitualCue), null, { timeout: 15000 }).catch(() => {}); await setX(r.f, { on: ON, bgm: {}, mu: MU }); return r; };
  const A = async () => { const { ctx, f, errs } = await prep();
    /* E 엔진 한 표 */
    { const E = await f.evaluate(() => { const cs = ENG.RitualCue.build(S, { mode: 'console' }).cues, by = (s) => cs.find((c) => c.slug === s) || {}, ix = (s) => cs.findIndex((c) => c.slug === s);
        const b8 = ix('bridge-b8-face-guests'), nx8 = cs[b8 + 1] || {}, mj = cs.find((c) => c.k === 'matjeol') || {};
        return { b7: [by('bridge-b7-entry-ready').duck, JSON.stringify(by('bridge-b7-entry-ready').post)], ar: [by('narr-entry-arrive').duck, by('narr-entry-arrive').fadeMs, !!by('narr-entry-arrive').fadeWith], mj: [mj.duck, mj.live && mj.live.duck],
          b8: [by('bridge-b8-face-guests').duck, nx8.k, nx8.goLeadMs, nx8.leadDb], dl: (by('narr-declare-family-out').live || {}), ti: (by('tribute-in').live || {}) }; });
      ok('E 입장 앞 b7 −16 · 줄 끝 2초에 −90 + 정적 1초', E.b7[0] === -16 && E.b7[1] === '[{"music":"to","v":-90,"ms":2000},{"wait":1000}]', E.b7);
      ok('E 도착 멘트 −90 을 4.5초(멘트와 함께) · 맞절 안내 · 맞절 정적 · b8 정적 → 감사 인사 6초 앞 −8', E.ar.join() === '-90,4500,true' && E.mj.join() === '-90,-90' && E.b8[0] === -90 && E.b8[1] === 'welcome' && E.b8[2] >= 6000 && E.b8[3] === -8, E);
      ok('E 선언 뒤 박수 = 새 곡(newSong · 0.6초 · −8) · 부모님께 걸어가기 −12 · 말하는 차례 −20', E.dl.newSong === true && E.dl.upMs === 600 && E.dl.duck === -8 && E.ti.walkDuck === -12 && E.ti.duck === -20, { dl: E.dl, ti: E.ti }); }
    /* P 이어 듣기 */
    await go(f, 'candle');
    const o = await run(f, ['candle', 'entry', 'matjeol', 'welcome', 'vow', 'ring', 'declare', 'bless'], 150000);
    const b7 = segs(o, (x) => x.s === 'bridge-b7-entry-ready' && x.on && x.f !== '@ENT');
    const lastC = o.reduce((a, x, i) => (x.on && x.f && x.f !== '@ENT' && x.k !== 'welcome' && i < o.findIndex((y) => y.f === '@ENT' && y.on) ? i : a), -1), firstE = o.findIndex((x) => x.f === '@ENT' && x.on);
    ok('P2 b7 줄 −16 · 화촉 곡과 입장 곡 사이 정적 ≥ 1초(겹침 0)', b7.length > 0 && b7[b7.length - 1].want === -16 && firstE > lastC && lastC >= 0 && o[firstE].t - o[lastC].t >= 1000 && !o.slice(lastC + 1, firstE).some((x) => x.on), { b7: b7.length && b7[b7.length - 1].want, gap: firstE > 0 && lastC >= 0 ? Math.round(o[firstE].t - o[lastC].t) : null });
    const walk = segs(o, (x) => x.k === 'entry' && x.act && x.on), arr = segs(o, (x) => x.s === 'narr-entry-arrive'), arrQ = arr.filter((x) => !x.on);
    const mjb8 = segs(o, (x) => (x.k === 'matjeol' || x.s === 'bridge-b8-face-guests') && x.on), w1 = o.findIndex((x) => x.k === 'welcome' && x.on && x.f !== '@ENT');
    ok('P1 걷기 0 dB · 도착 멘트 동안 −90 으로 · 맞절 안내 · 맞절 · b8 재생 0 · 감사 인사 곡은 무음에서 −8 뜸', walk.length > 0 && walk[walk.length - 1].want === 0 && arrQ.length > 0 && !mjb8.length && w1 > 0 && !o[w1 - 1].on && o[w1].want === -8,
      { walk: [...new Set(walk.map((x) => x.want))], arrQ: arrQ.length, mjb8: mjb8.slice(0, 3).map((x) => [x.k, x.s || x.lab, x.f, x.want]), w1: w1 > 0 ? [o[w1].f, o[w1].want] : null });
    /* 3 곡 넘김은 장면 경계에서만 — 같은 줄(i) 안의 행동 · 두 분 차례 줄에서 곡 이름이 바뀌지 않는다 */
    const chg = []; for (let j = 1; j < o.length; j++) { const a = o[j - 1], b = o[j]; if (a.i === b.i && a.on && b.on && a.f !== b.f && (b.act || b.talk) && /^(welcome|vow|ring|bless)$/.test(b.k)) chg.push([b.k, b.lab, a.f + '→' + b.f]); }
    const sw = []; for (let j = 1; j < o.length; j++) { const a = o[j - 1], b = o[j]; if (a.on && b.on && a.f !== b.f && /^(welcome|vow|ring|bless)$/.test(b.k)) sw.push([b.k, b.s || b.lab]); }
    ok('P3 곡 9초 — 반지 · 두 분 차례 · 행동 줄 안에서 곡 바뀜 0 · 넘김은 나레이션 줄에서', !chg.length && sw.length >= 2 && sw.every((x) => x[1] && !/자리|차례/.test(x[1])), { chg, sw: sw.slice(0, 8) });
    /* 4 선언 뒤 박수 */
    const dq = o.findIndex((x) => x.k === 'declare' && !x.on && x.want != null && x.want <= -60), before = dq > 0 ? o.slice(0, dq).reverse().find((x) => x.on && x.f !== '@ENT') : null, clap = o.find((x, j) => j > dq && x.k === 'declare' && x.on);
    const hook = clap ? await f.evaluate((fid) => { const s = BgmPicks.byF(fid); return s && s.start != null ? +s.start : 0; }, clap.f) : null;
    ok('P4 선언 뒤 박수 = 앞 곡이 아닌 새 곡 · 강조 자리부터(곡에 강조 자리가 있으면 시작 자리 > 0) · −8', !!before && !!clap && clap.f !== before.f && clap.want === -8 && (!(hook > 0) || (clap.off || 0) > 0), { before: before && before.f, clap: clap && [clap.f, clap.want, clap.off], hook });

    ok('쪽 오류 0(이어 듣기)', !errs.length, errs.slice(0, 3)); await ctx.close(); };
  const Bq = async () => { const { ctx, f, errs } = await prep();
    /* 5 부모님께 걸어가기 */
    await go(f, 'tribute'); const ot = await run(f, ['tribute'], 16000), wk = ot.filter((x) => x.of === 'tribute-in' && x.act && !x.talk && x.on), tk = ot.filter((x) => x.of === 'tribute-in' && x.talk && x.on);
    ok('P5 부모님께 걸어가는 줄 −12 · 말하는 차례 −20', wk.length > 0 && wk[wk.length - 1].want === -12 && tk.length > 0 && tk[tk.length - 1].want === -20, { wk: [...new Set(wk.map((x) => x.want))], tk: [...new Set(tk.map((x) => x.want))] });
    /* R 연습 */
    await f.evaluate(async () => { idx = STEPS.findIndex((x) => x.k === 'practice'); render(); await new Promise((x) => setTimeout(x, 600)); prStart('try'); await new Promise((x) => setTimeout(x, 900)); });
    const stay = (pick, ms) => f.evaluate(async ({ pick, ms }) => { const B = BgmBed._t, w = (t) => new Promise((x) => setTimeout(x, t)); const Q = LP.q, j = Q.findIndex((x) => pick === 'vow' ? (x.k === 'vow' && x.talk2 && x.who === '신랑') : (x.k === 'entry' && (x.act || x.quiet) && !x.talk2));
        if (j < 0) return { j }; B.LPB.relay = 0; LP.i = j; _lShow(); await w(4000); const o = []; const t0 = performance.now(); while (performance.now() - t0 < ms) { const v = B.BED.cur; o.push({ i: LP.i, f: v && v.f, on: !!(v && v.src && v.want > -60), want: v && v.want }); await w(250); }
        return { j, o, rl: B.LPB.relay || 0, wait: LP.wait === Q[j] }; }, { pick, ms });
    const rv = await stay('vow', 60000), fv = rv.o ? [...new Set(rv.o.map((x) => x.f))] : [];
    ok('R 연습 B · 신랑 차례 줄에 60초(곡 9초) — 곡 이름 바뀜 0 · 같은 곡 반복 ≥ 1회 · 정적 0', rv.j >= 0 && rv.wait && fv.length === 1 && rv.rl >= 1 && rv.o.every((x) => x.on && x.i === rv.j), { j: rv.j, wait: rv.wait, fv, rl: rv.rl, quiet: rv.o && rv.o.filter((x) => !x.on).length });
    const re = await stay('entry', 20000), fe = re.o ? [...new Set(re.o.map((x) => x.f + '@' + x.want))] : [];
    const fe1 = re.o ? [...new Set(re.o.map((x) => x.f))] : [];
    ok('R 연습 · 입장 걷기 20초 머묾 → 입장 곡이 끊기지 않고 그대로(8초로 줄이지 않음 · 곡 바뀜 0 · 정적 0)', re.j >= 0 && fe1.length === 1 && fe1[0] === '@ENT' && re.o.every((x) => x.on), { j: re.j, fe });
    /* 크기 — 연습 B 대기 줄은 order-preview _prWaitLv 가 정한다(나레이션 섹션이 «엔진 ldk 가 있으면 그 값»으로 고치는 중) · 고친 뒤엔 걷기 = 엔진 0 dB */
    console.log(`note R 연습 걷기 크기 = ${fe.join(' ')} (엔진 0 dB · _prWaitLv 고침 뒤 0 이어야 한다)`);
    /* S 화면 글 */
    const SLx = await f.evaluate(() => ({ m: BgmSlots && BgmSlots.LINE ? BgmSlots.LINE.matjeol : '', d: BgmSlots && BgmSlots.LINE ? BgmSlots.LINE.declare : '' }));
    ok('S 화면 글 — 맞절 · 선언', SLx.m === '두 분이 앞에 서시면 음악이 잦아들고, 맞절은 조용히 · 하객을 향해 서시면 감사 인사 곡이 시작돼요' && SLx.d === '선언문을 읽는 동안은 음악 없이, 축하 박수와 함께 새 곡이 시작돼요', SLx);

    ok('쪽 오류 0(부모님께 · 연습)', !errs.length, errs.slice(0, 3)); await ctx.close(); };
  await Promise.all([A(), Bq()]);
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); }
await br.close(); srv.close();
console.log(fail ? `MEANING R2 FAIL ${fail}` : 'MEANING R2 OK');
process.exit(fail ? 1 : 0);
