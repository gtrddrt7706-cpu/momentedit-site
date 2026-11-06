#!/usr/bin/env node
/* ★★[LISTEN_RESUME_1106 2026-11-06 사장님 네 말씀] 입장 걸음 절반 · 축배 60초([TOAST_EST60_1106] · BGM 시뮬레이션) · «본식 피아노» 글 · 이어 듣기 = 멘트 바로 · 듣기 로딩 표시 — 실브라우저(390)로 잰다
   1 [WALK_HALF_1106]  걸음 = RitualOpen.WALK 한 곳(당일 어림 51 · 본식 표 12.5 · 장면 30) · 엔진 입장 큐(판 A ~ F · 화촉 있음 / 없음 · 예시 넷) · 장면 SP.after · «실제로는 약 50초»
   2 [PIANO_WORD_1106] 맞절 음악 줄 «… 하객을 향해 서시면 본식 피아노가 잔잔하게 깔려요» · 고객 글 어디에도 «감사 인사 곡» 없음(주석 빼고)
   3 [RESUME_TALK_NOW_1106] 뜸(음악만 먼저) 중 멈춤 → 이어 듣기 = 0.5초 안에 그 줄 멘트 · 곡이 늦어도(8초) 멘트는 기다리지 않는다 · 처음 ▶ 는 뜸부터 그대로 ·
      장면(입장 «이 순간 전체 듣기 · 음악과 함께»)도 멘트 앞에서 멈췄으면 멘트 자리부터
   4 [LOAD_SHOW_1106]  멘트 파일이 늦으면(서버에서 늦춤 · 3G 흉내) 0.3초 뒤 지금 줄 ▶ 원 자리 돌기 · 알약 «불러오는 중…»(폭 그대로) · 소리가 나오면 «멈춤» ·
      10초 넘으면 «연결이 느려요 · 잠시만요» · 크게 보기도 · 못 받으면 종전 까닭 글(코드)
   --selftest = 넷을 하나씩 되돌린 판으로 돌려 빨강을 확인한다(되돌리면 빨강)
   LR_OPEN · LR_ES · LR_OP · LR_SLOTS · LR_EM = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import os from 'node:os'; import vm from 'node:vm'; import { createRequire } from 'node:module'; import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const SELF = new URL(import.meta.url).pathname;
const F = { open: process.env.LR_OPEN || '', es: process.env.LR_ES || '', op: process.env.LR_OP || '', slots: process.env.LR_SLOTS || '', em: process.env.LR_EM || '' };
const SHOT = process.env.SHOT || '';
const ONLY = process.env.LR_ONLY || '';   /* 깨 보기에서 한 갈래만(1 · 2 · 3 · 4) */
const want = (n) => !ONLY || ONLY.split(',').includes(String(n));

/* ── --selftest: 되돌린 판마다 빨강이어야 한다 ── */
if (process.argv.includes('--selftest')) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lr-'));
  const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  const put = (n, t) => { const p = path.join(tmp, n); fs.writeFileSync(p, t); return p; };
  const swap = (t, a, b, nm) => { if (!t.includes(a)) { console.log(`FAIL 깨 보기 ${nm} — 바꿀 글을 못 찾았다`); process.exit(1); } return t.split(a).join(b); };
  const cases = [
    ['1 걸음 절반을 되돌림(WALK_K 1)', { LR_OPEN: put('open.js', swap(rd('assets/ritual-open.js'), 'var WALK_K = 0.5,', 'var WALK_K = 1,', '1')) }, '1'],
    ['1 장면 after 를 옛 60 으로', { LR_ES: put('es.js', swap(rd('assets/entry-scene.js'), 'after:(_W&&_W.scene>0?_W.scene:30)', 'after:60', '1b')) }, '1'],
    ['1 축배 60초를 되돌림(TOAST_SEC 30)', { LR_OPEN: put('open2.js', swap(rd('assets/ritual-open.js'), 'var TOAST_SEC = 60;', 'var TOAST_SEC = 30;', '1c')) }, '1'],
    ['2 «감사 인사 곡» 글을 되돌림', { LR_SLOTS: put('slots.js', swap(rd('assets/bgm-slots.js'), '하객을 향해 서시면 본식 피아노가 잔잔하게 깔려요', '하객을 향해 서시면 감사 인사 곡이 시작돼요', '2')) }, '2'],
    ['3 이어 듣기 = 남은 뜸부터(옛 길)', { LR_OP: put('op3.html', swap(rd('order-preview.html'), 'if(!LP.paused&&LP.played&&_rst&&LP.leadLeftSt===_rst&&LP.leadSt===_rst){', 'if(false){', '3')) }, '3'],
    ['3 장면 이어 듣기 = 멈춘 자리(옛 길)', { LR_EM: put('em.js', swap(rd('assets/entry-music.js'), 'if(PAUSE&&R&&R.PL&&R.V0&&R.V0.pieces&&R.V0.pieces.length&&x<R.PL.tv) x=R.PL.tv;', '', '3b')) }, '3'],
    ['4 로딩 표시를 끔', { LR_OP: put('op4.html', swap(rd('order-preview.html'), 'var on=el>=LD_SHOW?1:0,', 'var on=0,', '4')) }, '4'],
  ];
  let bad = 0;
  for (const [nm, env, only] of cases) {
    const r = spawnSync(process.execPath, [SELF], { env: Object.assign({}, process.env, env, { LR_ONLY: only }), encoding: 'utf8', timeout: 600000 });
    const red = r.status === 1;
    console.log(`${red ? 'ok  ' : 'FAIL'} 깨 보기 — ${nm} → ${red ? '빨강' : '초록(못 잡음) · 종료 ' + r.status}`);
    if (!red) { bad++; console.log((r.stdout || '').split('\n').filter((l) => /^FAIL|못 쟀다/.test(l)).slice(0, 5).join('\n')); }
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(bad ? `listen-resume selftest: FAIL ${bad}` : 'listen-resume selftest: ok');
  process.exit(bad ? 1 : 0);
}

let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 600)}`); if (!c) fail++; };

/* ── 1 · 2 엔진 · 글(브라우저 없이) ── */
const loadOpen = () => { const src = fs.readFileSync(F.open || path.join(ROOT, 'assets', 'ritual-open.js'), 'utf8'); const m = { exports: {} }; new Function('module', 'exports', 'require', src)(m, m.exports, require); return m.exports; };
const O = loadOpen();
if (want(1)) {
  const W = O.WALK || {};
  ok('1 [WALK_HALF_1106] RitualOpen.WALK = 절반(당일 51 · 본식 표 12.5 · 장면 30 · 옛 102 · 25 · 60)', W.k === 0.5 && W.day === 51 && W.quiet === 12.5 && W.scene === 30 && W.was && W.was.day === 102 && W.was.quiet === 25 && W.was.scene === 60, W);
  const TE = O.TIME && O.TIME.entry, letters = Object.keys(TE || {});
  ok(`1 본식 시간 표 입장 판 ${letters.join('')} — 말 없는 시간 = WALK.quiet(12.5) · 여유 42 그대로`, letters.length === 6 && letters.every((l) => TE[l][2] === W.quiet && TE[l][3] === 42), TE);
  /* 엔진 — 판 A ~ F × 코스(새 코스 · 기록) × 화촉 있음 / 없음 + 예시 넷 */
  const D = require(path.join(ROOT, 'assets', 'ritual-data.js'));
  const cueSrc = fs.readFileSync(path.join(ROOT, 'assets', 'ritual-cue.js'), 'utf8');
  const cm = { exports: {} }; new Function('module', 'exports', 'require', cueSrc)(cm, cm.exports, (p) => /ritual-open/.test(p) ? O : /ritual-data/.test(p) ? D : require(p)); const C = cm.exports;
  const bad = [];
  const S0 = [];
  for (const e of ['A', 'B', 'C', 'D', 'E', 'F']) for (const course of ['open', 'record']) for (const candle of [0, 1]) S0.push({ course, entry: e, on: candle ? { candle: 1 } : {} });
  for (const k of ['standard', 'record', 'family', 'brief']) S0.push(O.applyExample({ course: 'open' }, k));
  S0.forEach((S) => { let r; try { r = C.build(S, { mode: 'console' }); } catch (x) { bad.push('build ' + JSON.stringify(S).slice(0, 60) + ' ' + x.message); return; }
    const c = r.cues.find((q) => q.k === 'entry' && /^entry-[A-F]$/.test(q.slug || '')); if (!c || !c.live || c.live.est !== W.day) bad.push(`${S.course}/${S.entry || 'ex'}/${S.on && S.on.candle ? '화촉' : '-'} est=${c && c.live && c.live.est}`); });
  ok(`1 엔진 입장 큐 live.est = WALK.day(51) — 판 A ~ F × 코스 둘 × 화촉 있음 / 없음 + 예시 넷(${S0.length}판) · 당일은 디렉터 GO 그대로`, !bad.length, bad.slice(0, 6));
  { const r = C.build({ course: 'open', entry: 'A', on: {} }, { mode: 'console' }), c = r.cues.find((q) => /^entry-A$/.test(q.slug || '')), i = r.cues.indexOf(c), nx = r.cues[i + 1];
    ok('1 당일 콘솔 — 입장 뒤 다음 큐(받는 말)는 그대로 사람 GO(타이머로 넘기지 않는다 · 걸음 실측과 무관)', c.fire === 'manual' && nx && nx.slug === 'narr-entry-arrive' && nx.fire === 'manual', { f: c.fire, nx: nx && [nx.slug, nx.fire] }); }
  /* [TOAST_EST60_1106] 축배 사람 구간 60초 한 곳 — 엔진(당일 · 미리 듣기 fullEst) · 본식 표 */
  { const T = []; for (const ex of ['record', 'standard']) { const S = O.applyExample({ course: 'open' }, ex); S.on.toast = 1; for (const mode of ['console', 'preview']) { const c = C.build(S, { mode }).cues.find((q) => q.slug === 'toast-toast'); T.push([ex, mode, c && c.live && (c.live.fullEst || c.live.est)]); } }
    ok('1 [TOAST_EST60_1106] 축배 사람 구간 = RitualOpen.TOAST_SEC 60초 — 엔진 당일 · 미리 듣기(«실제로는 약 1분») · 본식 표 말 없는 시간(옛 30 · 20)', O.TOAST_SEC === 60 && T.every((r) => r[2] === 60) && O.TIME.toast.only[2] === 60 && O.TIME.toast.both[2] === 60, { T, sec: O.TOAST_SEC, time: O.TIME.toast }); }
  /* 장면 — 엔진이 먼저 실린 화면(RitualOpen 있음)과 없을 때 둘 다 30 */
  const esSrc = fs.readFileSync(F.es || path.join(ROOT, 'assets', 'entry-scene.js'), 'utf8');
  const es1 = { window: { RitualOpen: O } }; vm.createContext(es1); vm.runInContext(esSrc, es1);
  const es0 = { window: {} }; vm.createContext(es0); vm.runInContext(esSrc, es0);
  ok('1 장면 문 열린 뒤 크게 머무는 초 = WALK.scene(30 · 엔진 없이 실려도 30) · «도착»까지 34초', es1.window.EntryScene.SP.after === W.scene && es0.window.EntryScene.SP.after === 30, { withO: es1.window.EntryScene.SP.after, alone: es0.window.EntryScene.SP.after });
  ok('1 장면 파일이 RitualOpen.WALK 를 읽는다(한 곳)', /window\.RitualOpen\.WALK/.test(esSrc));
}
if (want(2)) {
  const ssrc = fs.readFileSync(F.slots || path.join(ROOT, 'assets', 'bgm-slots.js'), 'utf8');
  const sb = { window: {}, module: undefined }; vm.createContext(sb); vm.runInContext(ssrc, sb); const BS = sb.window.BgmSlots || sb.BgmSlots;
  const v = BS && BS.flowAt ? null : null; void v;
  ok('2 [PIANO_WORD_1106] 맞절 음악 줄 = «두 분이 앞에 서시면 음악이 잦아들고, 맞절은 조용히 · 하객을 향해 서시면 본식 피아노가 잔잔하게 깔려요»', !!BS && BS.LINE.matjeol === '두 분이 앞에 서시면 음악이 잦아들고, 맞절은 조용히 · 하객을 향해 서시면 본식 피아노가 잔잔하게 깔려요', BS && BS.LINE.matjeol);
  /* 고객 글(따옴표 안) — 주석을 걷고 «감사 인사 곡»을 찾는다 */
  const noCmt = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/[^\n]*/g, '$1');
  const hits = [];
  [['assets/bgm-slots.js', ssrc], ['order-preview.html', fs.readFileSync(F.op || path.join(ROOT, 'order-preview.html'), 'utf8')], ['console.html', fs.readFileSync(path.join(ROOT, 'console.html'), 'utf8')], ['assets/bgm-bed.js', fs.readFileSync(path.join(ROOT, 'assets', 'bgm-bed.js'), 'utf8')], ['assets/bgm-form.js', fs.readFileSync(path.join(ROOT, 'assets', 'bgm-form.js'), 'utf8')]]
    .forEach(([n, t]) => { const s = noCmt(t).replace(/<!--[\s\S]*?-->/g, ''); const m = s.match(/['"`][^'"`\n]*감사\s?인사\s?곡[^'"`\n]*['"`]/g); if (m) hits.push(n + ': ' + m.slice(0, 2).join(' | ')); });
  ok('2 고객에게 보이는 글(따옴표 안 · 주석 빼고)에 «감사 인사 곡» 없음 — bgm-slots · 식순 화면 · 콘솔 · bgm-bed · bgm-form', !hits.length, hits);
}
if (!want(3) && !want(4) && !want(1)) { console.log(fail ? `listen-resume: FAIL ${fail}` : 'listen-resume: ok'); process.exit(fail ? 1 : 0); }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(fail ? 1 : 2); }

/* ── 브라우저 ── */
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
function wav(sec, f, sr = 16000) { const n = Math.round(sr * sec), b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(f ? 8000 * Math.sin(2 * Math.PI * f * i / sr) : 0), 44 + i * 2); return b; }
const NAR = (() => { const sr = 16000, b = wav(3.4, 0, sr); for (let i = 0; i < Math.round(sr * 3.4); i++) { const t = i / sr, on = (t > 0.2 && t < 1.4) || (t > 1.9 && t < 3.2); b.writeInt16LE(on ? Math.round(8000 * Math.sin(2 * Math.PI * 330 * t)) : 0, 44 + i * 2); } return b; })();   /* 말 두 조각 + 사이 쉼(장면이 문장을 찾게 · 앞뒤 무음) */
const RL = [{ k: 'r5', name: '경쾌하게', t: '시험 입장 곡', a: '시험 가수', hook: 40, hook0: 40, len: 140, file: 'r5.mp3', img: '/assets/home/snap.webp', pos: '50% 50%' }];
const HAVE = ['B01', 'B02', 'B04', 'B05', 'B06', 'B07', 'B09', 'B10', 'B12', 'B13', 'B15', 'B16', 'B17', 'B21', 'B24', 'B28'];
const SONG = {}; HAVE.forEach((k, i) => { SONG[k] = wav(20, 180 + i * 20).toString('base64'); });
const RS = { r5: wav(140, 250).toString('base64') };
const HARNESS = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><iframe id="fr" style="width:100vw;height:100vh;border:0;display:block"></iframe>
<script>
window.H={dly:{},rl:${JSON.stringify(RL)},rs:${JSON.stringify(RS)},draft:null,delay:40,have:${JSON.stringify(HAVE)},songs:${JSON.stringify(SONG)}};
var fr=document.getElementById('fr');
function back(m){ fr.contentWindow.postMessage(m, location.origin); }
window.go=function(){ fr.src='/order-preview.html?embed=1'; };
window.addEventListener('message',function(ev){ var d=ev.data||{}; if(ev.origin!==location.origin||ev.source!==fr.contentWindow) return;
  if(d.type==='momentedit:orderReady'){ back({type:'momentedit:orderFill',draft:H.draft,done:false,cust:{name:'시험',code:'TEST01'}}); return; }
  if(d.type==='momentedit:orderDraft'){ back({type:'momentedit:orderDraftSaved'}); return; }
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
const NET = { narDelay: 0, narFail: false };   /* 멘트 파일 늦추기(3G 흉내) · 못 받기 */
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/__harness.html') { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(HARNESS); return; }
  if (/^\/assets\/audio\/narration\/.+\.mp3$/.test(u)) { const d = NET.narDelay; setTimeout(() => { if (NET.narFail) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': NAR.length }); r.end(NAR); }, d); return; }
  const p = (F.op && u === '/order-preview.html') ? F.op : (F.em && u === '/assets/entry-music.js') ? F.em : (F.es && u === '/assets/entry-scene.js') ? F.es : (F.open && u === '/assets/ritual-open.js') ? F.open : (F.slots && u === '/assets/bgm-slots.js') ? F.slots : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const wait = (f, ms) => f.waitForTimeout(ms);
const ALL = ['candle', 'welcome', 'vow', 'ring', 'declare', 'tribute'];   /* 순간마다 처음 듣는 멘트 파일(받아 둔 소리가 없게) */
async function open(W) {
  const ctx = await br.newContext({ viewport: { width: W, height: 860 }, hasTouch: W < 1000 }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/__harness.html`, { waitUntil: 'load' }); await pg.evaluate(() => go());
  await pg.waitForFunction(() => { const x = document.getElementById('fr'); return x.contentWindow && x.contentWindow.document.readyState === 'complete' && x.contentWindow.render; }, null, { timeout: 30000 }); await pg.waitForTimeout(900);
  const f = pg.frames().find((x) => /order-preview\.html/.test(x.url()));
  const nx = async () => { if (await f.isVisible('#next')) await f.click('#next'); else if (await f.isVisible('.pk-go')) await f.click('.pk-go'); await wait(f, 450); };
  await nx(); await nx();
  await f.evaluate((ks) => { ks.forEach((k) => { S.on[k] = 1; }); S.guestVoice = 'nar'; S.vsAsked = 1; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); }, ALL);
  await nx(); await wait(f, 800);
  await f.evaluate(() => { document.body.style.opacity = 1; document.querySelectorAll('section,.reveal').forEach((x) => { x.style.opacity = 1; }); });
  return { ctx, pg, f, errs };
}
const go = async (f, k) => { await f.evaluate((k) => mkGo(k), k); await wait(f, 700); };
const shot = async (pg, n) => { if (!SHOT) return; try { fs.mkdirSync(SHOT, { recursive: true }); await pg.screenshot({ path: path.join(SHOT, `lr-${n}.png`) }); } catch {} };
/* 지금 상태 — 지금 줄 · 뜸 · 멘트 소리가 흐르는가 · 알약 글 · 돌기 */
const now = (f, k) => f.evaluate((k) => { const st = LP.q[LP.i], a = LP.el, b = document.querySelector('.mk-hbtn[data-mp="' + k + '"]');
  return { i: LP.i, n: LP.q.length, k: st && st.k, src: !!(st && st.src), lead: !!(LP.leadSt && LP.leadSt === st), paused: !!LP.paused, talk: !!(a && st && st.src && a.getAttribute('src') === st.src && !a.paused && a.readyState >= 3 && !a._lead),
    pill: b ? b.textContent.trim() : '', pw: b ? Math.round(b.getBoundingClientRect().width) : 0, spin: !!document.querySelector('.mk-flow li.lp-now.lp-ld'), pspin: !!(b && b.querySelector('.ldsp')), note: ((document.querySelector('.lp-ldnote') || {}).textContent || ''), ld: LD.on, slow: LD.slow }; }, k);
const until = async (f, fn, ms, step = 50) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await f.evaluate(fn)) return Date.now() - t0; await wait(f, step); } return -1; };
try {
  const VW = +process.env.LR_W || 390;   /* LR_W=1280 = PC 폭으로 한 번 더 */
  const { ctx, pg, f, errs } = await open(VW);
  const K = 'welcome';   /* 감사 인사 — 본식 피아노(M4)가 뜸으로 먼저 흐르는 순간 */
  if (want(1)) {
    await go(f, 'entry');
    const e1 = await f.evaluate(() => { const q = _lSteps(ENG, ['entry']).filter((x) => x.quiet && x.k === 'entry'); return q.map((x) => [x.txt, x.est, _lpEstT(x.est)]); });
    ok('1 ② 입장 걷는 줄 «음악에 맞춰 걸어 들어와요» 시간 = 51초 → «실제로는 약 50초»(옛 약 1분 45초) · 브라우저 RitualOpen.WALK.scene = EntryScene.SP.after', e1.some((r) => r[0] === '음악에 맞춰 걸어 들어와요' && r[1] === 51 && r[2] === '약 50초') && await f.evaluate(() => EntryScene.SP.after === RitualOpen.WALK.scene && RitualOpen.WALK.scene === 30), e1);
  }
  const talking = () => { const st = LP.q[LP.i], a = LP.el; return !!(a && st && st.src && a.getAttribute('src') === st.src && !a.paused && !a._lead && a.readyState >= 3); };
  const leading = () => !!(LP.leadSt && LP.leadSt === LP.q[LP.i]);
  if (want(3)) {
    /* 3a 처음 ▶ — 뜸부터(음악 먼저 · 멘트는 뒤) 그대로 */
    NET.narDelay = 0; await go(f, 'vow');
    await f.evaluate(() => lsPlay('vow')); const tLead = await until(f, leading, 6000);
    const s0 = await now(f, 'vow');
    ok('3 처음 ▶ 는 종전대로 뜸부터(음악이 먼저 · 멘트 아직)', tLead > -1 && s0.lead && !s0.talk, s0);
    /* 3b 뜸 중 멈춤 → 이어 듣기 = 0.5초 안에 멘트 · 음악은 말 아래 크기 */
    await f.evaluate(() => lsToggle()); await wait(f, 900); const sp = await now(f, 'vow');
    await f.evaluate(() => lsToggle()); const tTalk = await until(f, talking, 3000, 30);
    const s1 = await now(f, 'vow'); await wait(f, 800);
    const bed = await f.evaluate(() => { const B = BgmBed._t.BED; return { who: B.who, src: !!(B.cur && B.cur.src), want: B.cur && B.cur.want }; });
    ok(`3 [RESUME_TALK_NOW_1106] 뜸 중 멈춤 → 이어 듣기 = ${tTalk}ms 만에 멘트(0.5초 안 · 남은 뜸 · 곡만 먼저를 다시 돌리지 않는다)`, sp.paused && sp.lead && tTalk > -1 && tTalk <= 500 && !s1.lead, { sp, s1, tTalk });
    ok(`3 음악은 멘트와 함께 말 아래 크기로(${bed.want} dB · 뜸 크기 −8 이 아니다)`, bed.src && bed.want != null && bed.want <= -14 && bed.want > -60, bed);
    /* 3c 줄 사이(다음 멘트 줄 앞 쉼)에서 멈춤 → 이어 듣기 = 그 줄 멘트 곧바로 */
    const gapAt = await f.evaluate(() => new Promise((res) => { const t0 = performance.now(); const iv = setInterval(() => { const st = LP.q[LP.i];
      if (st && LP.i > 0 && st.src && !LP.paused && !LP.leadSt && (LP.el.getAttribute('src') || '') !== st.src) { clearInterval(iv); lsToggle(); res(LP.i); }
      else if (performance.now() - t0 > 45000 || !LP.q.length) { clearInterval(iv); res(-1); } }, 15); }));
    await wait(f, 600); const g0 = await now(f, 'vow');
    await f.evaluate(() => lsToggle()); const tG = await until(f, talking, 3000, 30); const g1 = await now(f, 'vow');
    ok(`3 줄 사이(줄 ${gapAt})에서 멈춤 → 이어 듣기 = ${tG}ms 만에 그 줄 멘트(뜸 없이)`, gapAt > 0 && g0.paused && tG > -1 && tG <= 500 && !g1.lead, { gapAt, g0, g1, tG });
    await f.evaluate(() => lsStop()); await wait(f, 400);
    /* 3d 곡이 늦게(8초) 와도 — 처음 ▶ 는 곡을 기다리는 뜸(0.3초 뒤 «불러오는 중…») · 멈춤 · 이어 듣기 멘트는 곡을 기다리지 않는다 */
    await f.evaluate(() => { const H = window.parent.H; H.have.forEach((x) => { H.dly[x] = 8000; }); });
    await go(f, 'tribute');
    const tf = await f.evaluate(() => { const B = BgmBed._t, q = _lSteps(ENG, ['tribute']), fs = [...new Set(q.map((x) => B.fileFor(x)).filter(Boolean))]; fs.forEach((x) => { if (B.BUF[x] && B.BUF[x].st === 'ok' && !(B.BED.cur && B.BED.cur.f === x)) delete B.BUF[x]; }); return fs; });   /* 이 순간 곡을 아직 안 받은 상태로(미리 받아 둔 것만 걷는다 · 흐르는 곡은 그대로) */
    await f.evaluate(() => lsPlay('tribute')); await until(f, leading, 6000); await wait(f, 700);
    const tL0 = await until(f, () => !!LD.on, 2000, 30); await wait(f, 60); const l0 = await now(f, 'tribute'); l0.tL0 = tL0; await f.evaluate(() => lsToggle()); await wait(f, 400); await f.evaluate(() => lsToggle());
    const tTalk2 = await until(f, talking, 3000, 30);
    ok(`3 곡이 늦어도(8초) 이어 듣기 멘트는 ${tTalk2}ms — 곡을 기다리지 않는다(곡은 오는 대로 말 아래로)`, l0.lead && tTalk2 > -1 && tTalk2 <= 600, { l0, tTalk2 });
    if (want(4)) ok(`4 [LOAD_SHOW_1106] 처음 ▶ 에서 곡을 받는 뜸(곡 ${tf.join(' · ')} 8초) — 0.3초 뒤 «불러오는 중…» · 지금 줄 돌기`, l0.ld && l0.pill === '불러오는 중…' && l0.spin, l0);
    await f.evaluate(() => { lsStop(); window.parent.H.dly = {}; }); await wait(f, 400);
    /* 3e 장면(입장 «이 순간 전체 듣기 · 음악과 함께») — 멘트 앞(음악만 먼저)에서 멈췄다 이어 들으면 멘트 자리부터 */
    await f.evaluate(() => { S.mu = { src: 'rec', k: 'r5', t: '시험 입장 곡', a: '시험 가수', hook: 40, hooks: [40], dur: 140 }; _persist(); render(); }); await go(f, 'entry'); await wait(f, 800);
    await f.evaluate(() => emAct('scene')); const tRun = await until(f, () => { const s = EntryMusic._t.scene(); return s.run && s.x > 2.5; }, 15000, 100);
    const pl = await f.evaluate(() => EntryMusic._t.scene().plan);
    await f.evaluate(() => emAct('scene')); await wait(f, 500); const ps = await f.evaluate(() => EntryMusic._t.scene());
    await f.evaluate(() => emAct('scene')); await until(f, () => EntryMusic._t.scene().run, 8000, 50); await wait(f, 150); const rs = await f.evaluate(() => EntryMusic._t.scene());
    ok(`3 장면 — 멘트 앞 ${ps.pause != null ? ps.pause.toFixed(1) : '?'}초에서 멈춤 → 이어 듣기 = 멘트 자리(${pl ? pl.tv : '?'}초)부터(지금 ${rs.x != null ? rs.x.toFixed(2) : '?'}초)`, tRun > -1 && pl && pl.V > 0 && ps.pause != null && ps.pause < pl.tv && rs.run && rs.x >= pl.tv - 0.05 && rs.x < pl.tv + 1.2, { ps: ps.pause, tv: pl && pl.tv, V: pl && pl.V, x: rs.x });
    /* 3f 장면 멘트 도중 멈춤 → 그 자리 그대로(되감지 않는다) */
    await wait(f, 1200); await f.evaluate(() => emAct('scene')); await wait(f, 400); const ps2 = await f.evaluate(() => EntryMusic._t.scene());
    await f.evaluate(() => emAct('scene')); await until(f, () => EntryMusic._t.scene().run, 8000, 50); await wait(f, 100); const rs2 = await f.evaluate(() => EntryMusic._t.scene());
    ok('3 장면 — 멘트 도중 멈춤은 그 자리부터 그대로', ps2.pause != null && ps2.pause >= pl.tv && Math.abs(rs2.x - ps2.pause) < 0.6, { p: ps2.pause, x: rs2.x });
    await f.evaluate(() => { try { emAct('scene'); } catch (e) {} try { lsStop(); } catch (e) {} S.mu = null; _persist(); render(); }); await wait(f, 500);
  }
  if (want(4)) {
    /* 4a 멘트 파일이 늦으면(2.5초) — 0.3초 뒤 돌기 · «불러오는 중…» · 소리가 나오면 «멈춤» · 폭 그대로 */
    NET.narDelay = 2500; await go(f, 'welcome');
    await f.evaluate(() => lsPlay('welcome'));
    const tLd = await until(f, () => !!LD.on, 12000, 40); await wait(f, 80);
    const a = await now(f, 'welcome'); await shot(pg, VW + '-loading');
    const tOn = await until(f, () => !LD.on, 6000, 40); await wait(f, 150); const b = await now(f, 'welcome'); await shot(pg, VW + '-playing');
    ok(`4 [LOAD_SHOW_1106] 멘트 파일이 늦으면(2.5초) — 지금 줄 ▶ 원 자리 돌기 · 알약 «불러오는 중…»(돌기) · 소리가 나오면 «멈춤»`, tLd > -1 && a.spin && a.pill === '불러오는 중…' && a.pspin && tOn > -1 && b.pill === '멈춤' && !b.spin && b.talk, { a, b });
    ok(`4 알약 폭 그대로 — «불러오는 중…» ${a.pw}px · «멈춤» ${b.pw}px`, a.pw > 0 && a.pw === b.pw, { a: a.pw, b: b.pw });
    await f.evaluate(() => lsStop()); await wait(f, 300);
    /* 4b 0.3초 안에 오면 표시 없음(깜빡임 없음) */
    NET.narDelay = 0; await f.evaluate(() => { window.__ldSeen = 0; window.__ldIv = setInterval(() => { if (LD.on) window.__ldSeen++; }, 30); });
    await f.evaluate(() => lsPlay('welcome')); await until(f, talking, 12000);
    const seen = await f.evaluate(() => { clearInterval(window.__ldIv); return window.__ldSeen; });
    ok('4 바로 나오는 소리(0.3초 안)에는 «불러오는 중…»이 뜨지 않는다', seen === 0, { seen });
    await f.evaluate(() => lsStop()); await wait(f, 300);
    /* 4c 10초가 넘으면 «연결이 느려요 · 잠시만요» */
    NET.narDelay = 12500; await go(f, 'declare');
    await f.evaluate(() => lsPlay('declare')); await until(f, () => !!LD.on, 12000, 50);
    const tSl = await until(f, () => !!LD.slow, 12000, 100); await wait(f, 100); const c = await now(f, 'declare'); await shot(pg, VW + '-slow');
    ok(`4 10초가 넘으면 지금 줄 아래 «연결이 느려요 · 잠시만요»(알약은 «불러오는 중…» 그대로)`, tSl > -1 && c.note === '연결이 느려요 · 잠시만요' && c.pill === '불러오는 중…' && c.spin, c);
    await f.evaluate(() => lsStop()); await wait(f, 400);
    /* 4d 크게 보기 */
    NET.narDelay = 2500; await go(f, 'candle');
    await f.evaluate(() => lsBig('candle')); await until(f, () => !!LD.on, 12000, 50); await wait(f, 120);
    const big = await f.evaluate(() => ({ st: ((document.querySelector('.lf-state.lf-ld') || {}).textContent || ''), sp: !!document.querySelector('[data-fk="lftog"] .ldsp'), lab: (document.querySelector('[data-fk="lftog"]') || { getAttribute: () => '' }).getAttribute('aria-label') }));
    await shot(pg, VW + '-big-loading');
    ok('4 크게 보기 — 받는 동안 «불러오는 중…» 한 줄 · ❚❚ 자리 돌기 · 단추 이름 «불러오는 중…»', big.st === '불러오는 중…' && big.sp && big.lab === '불러오는 중…', big);
    await until(f, () => !LD.on, 6000, 50); await wait(f, 150);
    const big2 = await f.evaluate(() => ({ st: !!document.querySelector('.lf-state.lf-ld'), sp: !!document.querySelector('[data-fk="lftog"] .ldsp') }));
    ok('4 크게 보기 — 소리가 나오면 돌기 · 한 줄이 걷힌다', !big2.st && !big2.sp, big2);
    await f.evaluate(() => { try { lsCloseBig(); } catch (e) {} lsStop(); }); await wait(f, 400);
    /* 4e 못 받으면 — 돌기 걷고 종전 까닭 글(코드) */
    NET.narDelay = 600; NET.narFail = true; await go(f, 'ring');
    await f.evaluate(() => lsPlay('ring'));
    await until(f, () => !!LD.on, 8000, 40); const d0 = await f.evaluate(() => LD.on);
    await until(f, () => { return LP.q.some((st) => st && st.pfail); }, 12000, 100); await wait(f, 200);
    const d = await f.evaluate(() => { const st = LP.q.find((x) => x && x.pfail); return { pf: st && st.pfail, ld: LD.on, spin: !!document.querySelector('.mk-flow li.lp-ld') }; });
    ok('4 못 받으면 돌기 · «불러오는 중…»을 걷고 종전 까닭(코드 L0 · L6 · M6)', d0 && !!d.pf && /^[LM]\d$/.test(d.pf) && !d.ld && !d.spin, { d0, d });
    NET.narFail = false; NET.narDelay = 0; await f.evaluate(() => lsStop()); await wait(f, 300);
  }
  ok('페이지 오류 없음', !errs.length, errs.slice(0, 3));
  await ctx.close();
} catch (e) { console.log('FAIL 실행 오류 ' + (e && e.stack || e)); fail++; }
await br.close(); srv.close();
console.log(fail ? `listen-resume: FAIL ${fail}` : 'listen-resume: ok');
process.exit(fail ? 1 : 0);
