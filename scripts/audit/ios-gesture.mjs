#!/usr/bin/env node
/* ★★[IOS_GESTURE_1107 2026-11-07 사장님 아이폰 실청 · BGM 섹션 → 입장 세션 묶음 G] 첫 방문(곡을 아직 안 받음 · 곡이 탭 4초 뒤 도착)에서
   ① 하객 맞이 «이 순간 전체 듣기» — 나레이션과 함께 곡이 실제로 난다 ② 입장 «이 순간 전체 듣기 · 음악과 함께» — «멈춤» 알약이면 시계가 간다(진행 · 목소리 시작)
   ③ 받는 동안 알약 «불러오는 중…» · 10초 넘으면 «연결이 느려요 · 잠시만요» → 오면 시작 ④ 목록이 늦게 와 고른 곡의 자리가 바뀌어도 준비 중인 장면을 걷지 않고 새 자리로 튼다
   WebKit 이 없어 크롬에 «아이폰 흉내»(IOS)를 씌운다 — 탭(touchend · click) 뒤 1초 안에만 AudioContext.resume · 재생이 된다 ·
   1초 넘어 start/play 하면 막히고(소리 0) 엔진이 선다(suspend) · 단 그 컨텍스트 · 그 재생기가 탭 안에서 한 번 소리를 냈으면(풀림) 그 뒤로는 된다.
   BP_BED · BP_EM · BP_OP = 깨 보기(옛 파일) · 종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const OP = process.env.BP_OP || '', BED = process.env.BP_BED || '', EM = process.env.BP_EM || '', SHOT = process.env.SHOT || '';
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
const HAVE = ['B01', 'B02', 'B04', 'B05', 'B06', 'B09', 'B10', 'B12', 'B13', 'B15', 'B17', 'B21', 'B28'];
const SONG = {}; HAVE.forEach((k, i) => { SONG[k] = wav(20, 180 + i * 20).toString('base64'); });
const RS = { r5: wav(140, 250).toString('base64'), 'r1-p': wav(60, 300).toString('base64'), r1: wav(70, 300).toString('base64') };
const HARNESS = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><iframe id="fr" style="width:100vw;height:100vh;border:0;display:block"></iframe>
<script>
window.H={sdelay:40,ldelay:40,rl:${JSON.stringify(RL)},rs:${JSON.stringify(RS)},log:[],draft:null,saved:null,delay:40,have:${JSON.stringify(HAVE)},songs:${JSON.stringify(SONG)}};
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
        back({type:'momentedit:ritualFileData',key:'rec',id:g.id,ok:true,mime:'audio/wav',data:H.rs[g.id]}); }, g.id==='list'?H.ldelay:H.sdelay); return; }
    if(g.key==='bed'){ setTimeout(function(){ if(g.id==='list'){ back({type:'momentedit:ritualFileData',key:'bed',id:'list',ok:true,songs:H.have.map(function(f){ return {f:f}; })}); return; }
        if(!H.songs[g.id]){ back({type:'momentedit:ritualFileData',key:'bed',id:g.id,ok:false,error:'곡 파일을 찾을 수 없어요. (코드 L3)',ecode:'L3'}); return; }
        back({type:'momentedit:ritualFileData',key:'bed',id:g.id,ok:true,mime:'audio/wav',data:H.songs[g.id]}); }, g.id==='list'?H.ldelay:H.sdelay); return; }
    back({type:'momentedit:ritualFileData',key:g.key,id:g.id,ok:false,error:'파일을 불러오지 못했어요 (코드 L6)',ecode:'L6'}); return; }
});
</script>`;
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/__harness.html') { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(HARNESS); return; }
  if (/^\/assets\/audio\/narration\/.+\.mp3$/.test(u)) { r.writeHead(200, { 'Content-Type': 'audio/wav' }); r.end(SHORT); return; }
  const p = (OP && u === '/order-preview.html') ? OP : (BED && u === '/assets/bgm-bed.js') ? BED : (EM && u === '/assets/entry-music.js') ? EM : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });   /* 막기는 아래 아이폰 흉내(IOS)가 한다 — 크롬 자체 정책은 끈다 */ } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const wait = (f, ms) => f.waitForTimeout(ms);
const ALL = ['candle', 'welcome', 'vow', 'ring', 'declare', 'free', 'letter', 'tribute', 'toast', 'table'];
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

const IOS = () => { let tap = -1e9; const W = window; const mark = () => { tap = performance.now(); }; ['touchend', 'click'].forEach((t) => W.addEventListener(t, mark, true));
  const inG = () => performance.now() - tap < 1000; W.__ios = { ok: [], blocked: [], deny: 0, ctxs: [] }; const Real = W.AudioContext; if (!Real) return;
  const rs = Real.prototype.resume; Real.prototype.resume = function () { if (inG()) return rs.call(this); W.__ios.deny++; return new Promise(() => {}); };
  const C = function (o) { const a = new Real(o); if (!inG()) a.suspend(); W.__ios.ctxs.push(a); return a; }; C.prototype = Real.prototype; W.AudioContext = C;
  const st = AudioBufferSourceNode.prototype.start; AudioBufferSourceNode.prototype.start = function (...a) { const c = this.context, d = this.buffer ? Math.round(this.buffer.duration * 10) / 10 : 0;
    if (typeof OfflineAudioContext !== 'undefined' && c instanceof OfflineAudioContext) return st.apply(this, a);
    if (inG() || c.__unl) { if (inG()) c.__unl = true; W.__ios.ok.push({ t: performance.now(), d, g: inG() }); return st.apply(this, a); }
    W.__ios.blocked.push({ t: performance.now(), d }); try { c.suspend(); } catch (e) {} };
  const pl = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { if (inG()) { this.__unl = true; return pl.call(this); } if (this.__unl) return pl.call(this);
    W.__ios.blocked.push({ t: performance.now(), el: 1 }); return Promise.reject(new DOMException('blocked', 'NotAllowedError')); }; };

const MU = (k, hook) => ({ src: 'rec', k, t: '시험 입장 곡', a: '시험 가수', hook: hook || 40, hooks: [hook || 40], dur: 140 });
const iosOf = (f) => f.evaluate(() => ({ ok: window.__ios.ok.slice(), blocked: window.__ios.blocked.slice(), deny: window.__ios.deny, st: window.__ME_AC ? window.__ME_AC.state : null }));
try {
  /* ① 하객 맞이 «이 순간 전체 듣기» — 곡을 4초 늦게 */
  { const { ctx, pg, f, errs } = await open(390, true, IOS);
    await pg.evaluate(() => { H.sdelay = 4000; }); await go(f, 'guest'); await wait(f, 300);
    const pill = await f.$('.mk-hbtn[data-mp="guest"]'); const t0 = await f.evaluate(() => performance.now());
    if (pill) await pill.tap();
    const o = await f.evaluate(async () => { const r = [], t0 = performance.now(); await new Promise((res) => { const iv = setInterval(() => { const B = BgmBed._t.BED, v = B.cur;
      r.push({ t: Math.round(performance.now() - t0), i: LP.i, k: (LP.q[LP.i] || {}).k || '', src: !!(v && v.src), f: v && v.f || '', g: v && v.g ? v.g.gain.value : 0, ct: window.__ME_AC ? Math.round(window.__ME_AC.currentTime * 10) / 10 : null, st: window.__ME_AC ? window.__ME_AC.state : '' });
      if (performance.now() - t0 > 13000) { clearInterval(iv); res(); } }, 200); }); try { lsStop(); } catch (e) {} return r; });
    const io = await iosOf(f), songOk = io.ok.filter((x) => x.d > 5 && x.t > t0 + 1500), songBl = io.blocked.filter((x) => x.d > 5), loud = o.filter((x) => x.src && x.g > 0.0005 && x.st === 'running'), lines = [...new Set(o.map((x) => x.i))];
    ok('1 하객 맞이 — 알약이 있다(첫 방문 · 곡 4초 늦게)', !!pill);
    ok('1 하객 맞이 — 곡이 탭 1.5초 뒤에 시작돼도 막히지 않는다(아이폰 흉내 · 곡 start 막힘 0)', songOk.length > 0 && !songBl.length, { ok: songOk.slice(0, 3), blocked: songBl.slice(0, 3), deny: io.deny });
    ok('1 하객 맞이 — 곡 소리가 실제로 난다(곡 · 크기 > −66 dB · 소리 엔진 running · 시계가 간다)', loud.length > 5 && o[o.length - 1].ct > o[0].ct + 8, { loud: loud.length, first: o[0], last: o[o.length - 1] });
    ok('1 하객 맞이 — 나레이션 줄이 넘어간다(줄 둘 이상)', lines.length >= 2, lines);
    console.log('   1 로그 ' + JSON.stringify(o.filter((x, i) => i % 10 === 0)).slice(0, 900));
    ok('1 쪽 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close(); }
  /* ② 입장 «이 순간 전체 듣기 · 음악과 함께» — 곡 4초 늦게 · ③ 10초 넘게 늦으면 «연결이 느려요» */
  for (const [n, sd] of [['2', 4000], ['3', 12500]]) { const { ctx, pg, f, errs } = await open(390, true, IOS);
    await pg.evaluate((d) => { H.sdelay = d; }, sd); await f.evaluate((mu) => { S.mu = mu; _persist(); render(); }, MU('r5')); await go(f, 'entry');
    await f.waitForFunction(() => !!document.querySelector('.em-scene [data-fk="emscene"]'), null, { timeout: 15000 }).catch(() => {});
    const t0 = await f.evaluate(() => performance.now()); await f.tap('.em-scene [data-fk="emscene"]');
    const o = await f.evaluate(async (ms) => { const r = [], t0 = performance.now(); await new Promise((res) => { const iv = setInterval(() => { const s = EntryMusic._t.scene(), b = document.querySelector('.em-scene [data-fk="emscene"]');
      r.push({ t: Math.round(performance.now() - t0), lab: b ? b.textContent.trim() : '', run: s.run, pend: s.pend, x: s.x != null ? Math.round(s.x * 10) / 10 : null, st: window.__ME_AC ? window.__ME_AC.state : '' });
      if (performance.now() - t0 > ms) { clearInterval(iv); res(); } }, 200); }); return r; }, sd + 13000);
    const io = await iosOf(f), runs = o.filter((x) => x.lab === '멈춤'), stuck = runs.filter((x, i) => { const y = runs[i + 5]; return y && y.t - x.t < 1400 && !(y.x > x.x + 0.4); });
    const ld = o.filter((x) => x.pend), songBl = io.blocked.filter((x) => x.d > 5), songOk = io.ok.filter((x) => x.d > 5 && x.t > t0 + 1500), xEnd = runs.length ? runs[runs.length - 1].x : null, PL = await f.evaluate(() => (EntryMusic._t.scene().plan || {}));
    ok(`${n} 입장 — 받는 동안 알약 «불러오는 중…»`, ld.length > 3 && ld.filter((x) => x.t < 9500).every((x) => x.lab === '불러오는 중…'), ld.slice(0, 3));
    if (n === '3') ok('3 입장 — 10초 넘으면 «연결이 느려요 · 잠시만요»', ld.some((x) => x.t > 10300 && x.lab === '연결이 느려요 · 잠시만요'), ld.filter((x) => x.t > 9800).slice(0, 3));
    ok(`${n} 입장 — 곡이 오면(탭 ${sd / 1000}초 뒤) 막히지 않고 시작 · «멈춤» 알약`, songOk.length > 0 && !songBl.length && runs.length > 10, { ok: songOk.slice(0, 2), blocked: io.blocked.slice(0, 3), runs: runs.length, last: o[o.length - 1] });
    ok(`${n} 입장 — «멈춤»인데 시계가 서 있는 때 0 · 진행(장면 초)이 간다 · 소리 엔진 running`, runs.length > 10 && !stuck.length && xEnd > 6 && runs.every((x) => x.st === 'running'), { stuck: stuck.slice(0, 3), xEnd });
    ok(`${n} 입장 — 목소리 차례까지 간다(장면 ${PL.tv != null ? PL.tv.toFixed(1) : '?'}초 넘김 · 목소리 start 막힘 0)`, PL.tv != null && xEnd > PL.tv + 0.5 && !io.blocked.some((x) => x.t > t0 + 1500), { tv: PL.tv, xEnd });
    console.log(`   ${n} 로그 ` + JSON.stringify(o.filter((x, i) => i % 8 === 0)).slice(0, 900));
    ok(`${n} 쪽 오류 0`, !errs.length, errs.slice(0, 3)); await ctx.close(); }
  /* ④ 목록이 늦게 와 고른 곡의 자리(hook)가 초안과 다르다 — 준비 중인 장면을 걷지 않고 새 자리로 튼다 */
  { const { ctx, pg, f, errs } = await open(390, true, IOS);
    await pg.evaluate(() => { H.rl = H.rl.map((x) => x.k === 'r5' ? Object.assign({}, x, { hook: 45, hook0: 45 }) : x); H.ldelay = 2500; H.sdelay = 4500; });
    await f.evaluate((mu) => { S.mu = mu; _persist(); render(); }, MU('r5', 40)); await go(f, 'entry');
    await f.waitForFunction(() => !!document.querySelector('.em-scene [data-fk="emscene"]'), null, { timeout: 15000 }).catch(() => {});
    await f.tap('.em-scene [data-fk="emscene"]');
    const o = await f.evaluate(async () => { const r = [], t0 = performance.now(); await new Promise((res) => { const iv = setInterval(() => { const s = EntryMusic._t.scene(); r.push({ t: Math.round(performance.now() - t0), run: s.run, pend: s.pend, x: s.x, H: s.plan ? s.plan.H : null, hook: S.mu && S.mu.hook });
      if (performance.now() - t0 > 11000) { clearInterval(iv); res(); } }, 200); }); return r; });
    const runs = o.filter((x) => x.run), last = o[o.length - 1];
    ok('4 목록이 늦게 와 자리가 바뀌어도(40 → 45초) 준비 중인 장면이 이어져 시작한다 · 새 자리로 짠다', runs.length > 10 && last.hook === 45 && Math.abs((last.H || 0) - 45) < 0.1, { runs: runs.length, last, pendEnd: o.filter((x) => x.pend).slice(-1) });
    ok('4 쪽 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close(); }
  /* ⑤ 곡이 오기 직전에 소리 엔진이 서 있으면(아이폰이 세움 · 전화) — «멈춤»(시계 정지)을 띄우지 않고 시작 전 자리 «이어 듣기» · 다음 탭에 0초(음악 먼저)부터 */
  { const { ctx, pg, f, errs } = await open(390, true, IOS);
    await pg.evaluate(() => { H.sdelay = 4000; }); await f.evaluate((mu) => { S.mu = mu; _persist(); render(); }, MU('r5')); await go(f, 'entry');
    await f.waitForFunction(() => !!document.querySelector('.em-scene [data-fk="emscene"]'), null, { timeout: 15000 }).catch(() => {});
    await f.tap('.em-scene [data-fk="emscene"]'); await wait(f, 2500); await f.evaluate(() => window.__ios.ctxs.forEach((a) => a.suspend()));   /* 옛 파일(깨 보기)은 __ME_AC 가 없다 — 만든 컨텍스트 전부 */
    const o = await f.evaluate(async () => { const r = [], t0 = performance.now(); await new Promise((res) => { const iv = setInterval(() => { const s = EntryMusic._t.scene(), b = document.querySelector('.em-scene [data-fk="emscene"]');
      r.push({ t: Math.round(performance.now() - t0), lab: b ? b.textContent.trim() : '', run: s.run, pend: s.pend, pause: s.pause, x: s.x }); if (performance.now() - t0 > 5000) { clearInterval(iv); res(); } }, 200); }); return r; });
    const stuck = o.filter((x) => x.lab === '멈춤'), last = o[o.length - 1];
    ok('5 곡이 왔을 때 엔진이 서 있으면 «멈춤»(시계 정지) 0 · 시작 전 자리에 «이어 듣기»', !stuck.length && last && last.lab === '이어 듣기' && last.pause === 0 && !last.run, { stuck: stuck.slice(0, 2), last });
    await f.tap('.em-scene [data-fk="emscene"]'); await wait(f, 3000);
    const s2 = await f.evaluate(() => ({ s: EntryMusic._t.scene(), st: window.__ios.ctxs.map((a) => a.state).join(), lab: document.querySelector('.em-scene [data-fk="emscene"]').textContent.trim() }));
    ok('5 다음 탭 — 소리 엔진을 깨워 0초(음악 먼저)부터 · 시계가 간다', s2.st === 'running' && s2.s.run && s2.lab === '멈춤' && s2.s.x > 1.5 && s2.s.x < 4, s2);
    ok('5 쪽 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close(); }
} catch (e) { console.log('못 쟀다 — ' + (e && e.stack || e)); await br.close(); srv.close(); process.exit(2); }
await br.close(); srv.close();
console.log(fail ? `IOS GESTURE FAIL ${fail}` : 'IOS GESTURE OK'); process.exit(fail ? 1 : 0);
