#!/usr/bin/env node
/* ★★[ONE_FLOW_1106 2026-11-06 사장님 «이벤트가 짧아 이벤트마다 노래가 바뀌면 정신없다» · 대본 판정 «순간마다 곡 → 큰 덩어리마다 곡»] 깨 보기(옛 판 빨강) → 초록 → 대조
   T01 축사 · 편지 «음악과 함께» 판 — 감사 인사 ~ 편지 끝까지 본식 목록(M4) 밖 곡 재생 0
   T02 옛 저장본(S.bgm.S5 · S6 에 곡 번호 k) — 같다(읽지 않는다 · 지우지 않는다)
   T03 본식 목록 곡 사이 겹침 8초(그 밖 구간은 3초) · 당일 콘솔도 같은 값
   T04 목록 끝 조각 — 60초 안에 의도적 무음(축가 MR · «조용히» · 선언)이 오면 다음 곡으로 넘기지 않는다 · 60초 넘게 남았으면 넘긴다(대조)
   T05 «음악과 함께» 축사 뒤 축가 여는 말 — 본식 곡 재생 0(줄 시작에서 내려 정적 → MR) · 엔진 한 표(미리 듣기 · 연습 · 콘솔)
   T06 대조 — «조용히» 판 축사 말씀 동안 정적 그대로 · 축사가 없으면 덕담 곡이 흐르다 축가 여는 말 −15(NO_RELIFT E)
   T07 화면 — 축사 · 편지 «곡 고르기» 칸 없음 · «음악과 함께 / 조용히» 고르기만
   T08 끊긴 곡 이어 듣기 — 축가(정적) 뒤 «음악과 함께» 편지에서 본식 곡은 꺼진 그 곡 · 꺼진 자리부터(정적 동안 흘러간 시간이 아니다) · 선언 뒤 새 곡 예외는 meaning-r2 가 지킨다
   하네스는 seam-b2 와 같다 · BP_BED · BP_PICKS · BP_CUE = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
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
const P = require(PICKSF || path.join(ROOT, 'assets/bgm-picks.js')), M4 = P.PICKS.M4.concat(P.FILL.M4 || []);   /* [REPEAT_RULE_1107 ①] 본식 목록 = 고르는 3곡 + 배경 곡(B12 · B14) */
/* 듣기 — S 를 바꾸고 순간들을 이어 듣는다 · 100ms 마다 지금 줄 · 들리는 곡(크기 −60 위 · 실제 이득 > 0.002)을 적는다 · 끝까지 */
const RAMP = () => { const o = AudioParam.prototype.linearRampToValueAtTime; window.__rp = []; AudioParam.prototype.linearRampToValueAtTime = function (v, t) { try { const c = window.__acx; if (v === 1 && c) window.__rp.push(Math.round((t - c.currentTime) * 1000)); } catch (e) {} return o.call(this, v, t); };
  const AC0 = window.AudioContext || window.webkitAudioContext; if (AC0) { const W = function () { const c = new AC0(...arguments); window.__acx = c; return c; }; W.prototype = AC0.prototype; window.AudioContext = W; window.webkitAudioContext = W; } };
const walk = async (f, ks, bgm, extra, msOf) => f.evaluate(async ({ ks, bgm, extra, msOf }) => { const BB = BgmBed._t, W = (ms) => new Promise((r) => setTimeout(r, ms));
  S.bgm = bgm; Object.assign(S, extra || {}); try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist();
  const i = STEPS.findIndex((x) => x.k === 'listen'); if (i > -1) { idx = i; render(); } await W(600);
  window.__rs = {}; const B0 = window.BgmBed; ['lpShow', 'lpLead'].forEach((n) => { const o = B0[n]; if (!o || o.__w) return; const w = function () { try { if (window.__rs[LP.i] == null) window.__rs[LP.i] = Date.now(); } catch (e) {} return o.apply(this, arguments); }; w.__w = 1; B0[n] = w; });   /* 줄이 실제로 시작된 때(줄 사이 쉼 뒤 첫 lpShow · lpLead) */
  LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(ks, true); _lFull(); (LP.q || []).forEach((x) => { if (x.talk || x.talk2 || x.said || x.act || x.quiet) x.ms = (msOf && msOf[x.k]) || 1500; });
  const log = [], t0 = Date.now(); let n = 0; while (LP.q && LP.q.length && n < 3000) { n++; await W(100); const st = LP.q[LP.i], v = BB.BED.cur; const au = !!(v && v.src && v.want > -60 && v.g && v.g.gain.value > 0.002);
    log.push({ t: Date.now() - t0, T: Date.now(), i: LP.i, k: st && st.k, slug: st && (st.slug || st.of || ''), act: !!(st && (st.act || st.quiet)), f: au ? v.f : '', w: v ? v.want : null, pos: (v && v.src && v.src.buffer && v.g) ? Math.round(((v.off + (v.g.context.currentTime - v.t0)) % v.src.buffer.duration) * 10) / 10 : null }); }
  try { lsStop(); } catch (e) {} try { lsCloseBig(); } catch (e) {} return { log, rp: (window.__rp || []).slice(), rs: window.__rs, q: [] }; }, { ks, bgm, extra, msOf });
const KS = ['welcome', 'vow', 'ring', 'declare', 'bless', 'free', 'song', 'letter'];
const prep = async () => { const o = await open(390, true, RAMP); await o.f.evaluate(() => { S.freeWhat = 'speech'; S.songBy = 'friend'; S.on.song = 1; S.on.free = 1; S.on.letter = 1; }); return o; };
const outM4 = (log) => [...new Set(log.filter((x) => x.k && x.f && M4.indexOf(x.f) < 0 && x.f !== '@ENT').map((x) => x.f + '@' + x.k + ':' + x.slug))];
/* 줄이 실제로 시작된 뒤(첫 lpShow · lpLead) 1.6초(1.5초 내림)부터 줄이 끝날 때까지 들리는 곡 */
const openerHits = (log, rs) => { const rows = {}; log.forEach((x) => { if (x.slug === 'narr-song') (rows[x.i] = rows[x.i] || []).push(x); }); const o = []; Object.keys(rows).forEach((i) => { const s0 = rs && rs[i]; rows[i].forEach((x) => { if (s0 && x.T - s0 > 1600 && x.f) o.push(x.f + '@' + (x.T - s0) + ':' + x.w); }); }); return { n: Object.keys(rows).length, started: Object.keys(rows).every((i) => rs && rs[i]), hit: o, rows: Object.values(rows).map((r) => r.length) }; };
try {
  await Promise.all([
  (async () => { try { if (want('A')) {
    const { ctx, f, errs } = await prep();
    const r = await walk(f, KS, { S5: { m: 'bed' }, S6: { m: 'bed' } });
    const out = outM4(r.log), heard = [...new Set(r.log.filter((x) => x.f).map((x) => x.f))], free = r.log.filter((x) => x.k === 'free' && x.f).length;
    ok('T01 축사 · 편지 «음악과 함께» — 감사 인사 ~ 편지 끝 본식 목록(M4) 밖 곡 재생 0 · 축사 동안에도 음악이 흐른다', !out.length && heard.length > 0 && free > 3, { out, heard, free, n: r.log.length });
    const xf = r.rp.filter((ms) => ms > 1000);
    ok('T03 본식 목록 곡 사이 겹침 8초(3초 겹침 0)', xf.some((ms) => Math.abs(ms - 8000) < 400) && !xf.some((ms) => Math.abs(ms - 3000) < 300), { xf: xf.slice(0, 12) });
    const oh = openerHits(r.log, r.rs);
    ok('T05 «음악과 함께» 축사 뒤 축가 여는 말 — 줄이 시작되면 1.5초에 내려 정적 · 본식 곡 재생 0', oh.n > 0 && oh.started && oh.rows.every((n) => n > 25) && !oh.hit.length, oh);
    ok('A 쪽 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close(); } } catch (e) { ok('A 갈래가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); } })(),
  (async () => { try { if (want('B')) {
    const { ctx, f, errs } = await prep();
    const r = await walk(f, KS, { S5: { m: 'bed', k: 'B13' }, S6: { m: 'bed', k: 'B26' } });   /* [REPEAT_RULE_1107] 옛 저장값은 본식 목록 밖 곡으로(B12 는 이제 본식 배경 곡) */
    const out = outM4(r.log), saved = await f.evaluate(() => JSON.stringify(S.bgm));
    ok('T02 옛 저장본(S5.k B13 · S6.k B26) — 본식 목록 밖 곡 재생 0 · 저장값은 지우지 않는다', !out.length && /"k":"B13"/.test(saved) && /"k":"B26"/.test(saved), { out, saved });
    ok('B 쪽 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close(); } } catch (e) { ok('B 갈래가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); } })(),
  (async () => { try { if (want('C')) {
    const { ctx, f, errs } = await prep();
    /* T06 대조 — «조용히» 축사 · 편지 */
    const r = await walk(f, ['bless', 'free', 'song'], {});
    const talk = r.log.filter((x) => x.k === 'free' && x.act && x.f);
    ok('T06 대조 — «조용히» 축사 말씀 동안 정적 그대로', r.log.some((x) => x.k === 'free') && !talk.length, { talk: talk.slice(0, 3) });
    /* T04 목록 끝 조각 — 단위(지금 줄 · 의도적 무음 줄까지의 시간) */
    const u = await f.evaluate(async () => { const BB = BgmBed._t, W = (ms) => new Promise((r) => setTimeout(r, ms)); if (typeof BB.hushSoon !== 'function') return { none: true };
      S.bgm = {}; _lStart(['bless', 'free', 'song'], true, true); await W(400); const q = LP.q, fM = (BB.plan && BB.plan(false).M4 && BB.plan(false).M4.first) || 'B09';
      let r = -1; for (let j = 1; j < q.length; j++) { if (BB.lvOf(q[j], fM) <= -60 && BB.segAt(q[j].k) === 'M4') { r = j; break; } } if (r < 2) return { r, ks: q.map((x) => x.k + ':' + x.dk) };
      LP.i = r - 2; const near = BB.hushSoon(fM, 60); const keep = { act: q[r - 1].act, ms: q[r - 1].ms }; q[r - 1].act = 1; q[r - 1].ms = 70000; const far = BB.hushSoon(fM, 60); q[r - 1].act = keep.act; q[r - 1].ms = keep.ms;
      try { lsStop(); } catch (e) {} return { r, near, far, slug: q[r].slug || q[r].of, k: q[r].k }; });
    ok('T04 목록 끝 조각 — 60초 안에 의도적 무음이 오면 넘기지 않는다 · 60초 넘게 남았으면 넘긴다(대조)', !u.none && u.near === true && u.far === false, u);
    ok('C 쪽 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close(); } } catch (e) { ok('C 갈래가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); } })(),
  ]);
  if (want('D')) {
    /* T05 엔진 한 표 · T06 NO_RELIFT E 대조 · T03 콘솔 · T07 화면 */
    const B = (S0) => C.build(C.norm(S0), { mode: 'console' }).cues, mk = (on, bgm) => { const S = O.applyExample({ course: 'open' }, 'standard'); S.course = 'open'; S.on = Object.assign({}, S.on, on); S.freeWhat = 'speech'; S.bgm = bgm || {}; return S; };
    const op = (S0) => (B(S0).find((c) => c.slug === 'narr-song') || {}).duck;
    ok('T05 엔진 — «음악과 함께» 축사 뒤 축가 여는 말 −90(줄 시작에서) · «조용히»도 −90', op(mk({ free: 1, song: 1 }, { S5: { m: 'bed' } })) === -90 && op(mk({ free: 1, song: 1 })) === -90);
    ok('T06 대조 — 축사가 없으면 덕담 곡이 흐르다 축가 여는 말 −15 그대로(NO_RELIFT E)', op(mk({ free: 0, song: 1, bless: 1 })) === -15);
    const con = fs.readFileSync(CON || path.join(ROOT, 'console.html'), 'utf8');
    ok('T03 당일 콘솔 — 목록 곡 사이 겹침도 같은 값(본식 8초 · BgmPicks.xfOf) · «음악과 함께» 곡 칸으로 넘기지 않는다', P.xfOf && P.xfOf('M4') === 8 && P.xfOf('M6') === 6 /* [REPEAT_RULE_1107 ⑤] 닫는 인사 6초 */ && /function segXf\(\)/.test(con) && /bedPlay\(BED\.list\[j\], segXfFor\(BED\.list\[j\]\)\)/.test(con) && /function segXfFor\(sid\)/.test(con) && !/segGo\('M4S[56]'\)/.test(con));
    ok('T01 곡 계획 — 축사 · 편지 «음악과 함께» 구간(M4S5 · M4S6)이 없다 · 옛 이름은 M4 로 읽힌다', P.CORDER.indexOf('M4S5') < 0 && P.CORDER.indexOf('M4S6') < 0 && P.oneSeg && P.oneSeg('M4S5') === 'M4' && P.oneSeg('M4S6') === 'M4' && !P.SEGS.some((s) => /^M4S/.test(s.id)));
  }
  if (want('F')) { const { ctx, f, errs } = await prep();
    const r = await walk(f, ['bless', 'song', 'letter'], { S6: { m: 'bed' } }, null, { song: 12000 });
    const L = r.log, iS = L.findIndex((x) => x.k === 'song'), before = L.slice(0, iS).filter((x) => x.f).pop(), after = L.find((x, j) => j > iS && x.k === 'letter' && x.f);
    const sil = L.filter((x) => x.k === 'song' && x.act).length / 10;
    ok('T08 끊긴 곡 이어 듣기 — 축가 뒤 «음악과 함께» 편지 = 꺼진 그 곡 · 꺼진 자리부터(±4초 · 정적 ' + sil + '초를 건너뛰지 않는다)', !!before && !!after && after.f === before.f && after.pos != null && before.pos != null && Math.abs(after.pos - before.pos) < 4 && sil > 8, { before, after, sil });
    const con = fs.readFileSync(CON || path.join(ROOT, 'console.html'), 'utf8');
    ok('T08 당일 콘솔 — 같은 규칙(끊긴 곡 기억 · 다시 오를 때 그 자리 · 선언 뒤 새 곡 · 다른 구간이면 지움)', /BED\.cut = \{ id: BED\.id, t: _ce\.currentTime/.test(con) && /BED\.cut = null;   \/\* \[ONE_FLOW_1106 ⑥\] 선언 뒤/.test(con) && /if \(id !== 'M4'\) BED\.cut = null;/.test(con));
    ok('F 쪽 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close(); }
  if (want('G')) { const { ctx, f, errs } = await prep();
    /* ★[REPEAT_FIX_1107 ②] 미룬 넘김(LIST_HOLD) — 덕담(두 분이 말하는 줄 40초)이 30초 곡보다 길어 넘김이 미뤄졌다가, 말이 끝난 뒤 축가 무음 직전에 새 곡이 몇 초만 들리던 것(가족 240초 B11 5초) ·
         60초 안 무음이면 넘기지 않고 지금 곡 그대로 → 새 곡 조각(들리기 시작해 8초 안에 무음) 0 */
    const r = await walk(f, ['bless', 'song'], {}, null, { bless: 40000, song: 6000 }), L = r.log, frag = [];
    let run = null; L.forEach((x, j) => { const pf = j ? L[j - 1].f : ''; if (x.f && x.f !== pf) run = { f: x.f, t: x.t, prev: pf, i0: j }; if (run && !x.f && pf === run.f) { const d = x.t - run.t; if (d < 8000 && L.slice(0, run.i0).some((y) => y.f && y.f !== run.f)) frag.push(run.f + ' ' + d + 'ms@' + (L[run.i0].k || '') + '→' + (x.k || '')); run = null; } });
    ok('T09 미룬 넘김도 무음 검사 — 덕담 40초 · 곡 30초 · 축가 앞에서 새 곡 조각(8초 안에 무음) 0', !frag.length && L.some((x) => x.k === 'song'), { frag, heard: [...new Set(L.filter((x) => x.f).map((x) => x.f))] });
    ok('G 쪽 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close(); }
  if (want('E')) { const { ctx, f, errs } = await prep();
    const r = await f.evaluate(async () => { S.bgm = { S5: { m: 'bed', k: 'B13' }, S6: { m: 'bed' } }; _persist(); const out = {}; for (const k of ['free', 'letter']) { try { mkGo(k); } catch (e) {} await new Promise((r) => setTimeout(r, 900)); const g = document.querySelector('.ls-bgm[data-slot="' + (k === 'free' ? 'S5' : 'S6') + '"]'); out[k] = { chips: g ? g.querySelectorAll('[role="radio"]').length : -1, sub: g ? g.querySelectorAll('.bed-sub, .bed-box').length : -1, songs: g ? g.querySelectorAll('[data-seg-pick], .bed-song, [data-bed-pick]').length : -1 }; } return out; });
    ok('T07 화면 — 축사 · 편지 «음악과 함께 / 조용히» 고르기만(곡 고르기 칸 0)', r.free.chips >= 2 && r.free.sub === 0 && r.letter.chips >= 2 && r.letter.sub === 0, r);
    ok('E 쪽 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close(); }
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); }
await br.close(); srv.close();
console.log(fail ? `ONE FLOW FAIL ${fail}` : 'ONE FLOW OK');
process.exit(fail ? 1 : 0);
