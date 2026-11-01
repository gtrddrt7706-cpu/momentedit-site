#!/usr/bin/env node
/* ★★[ENTRY_UNDER_1101 2026-11-01 사장님 «여기서 계속 노래가 흘러야 하는 거 아니야? 맞절까지 노래가 끝나고 멘트가 나오는데?» · «맞절에서는 노래가 중간에 끊어졌어»]
   입장 곡이 멘트 도중에 끝나지 않는다 — 나레이션 파일을 길게(12초) 주고 짧은 판 곡(25초)으로 «판 끝 겹쳐 잇기»까지 일어나게 해서 잰다.
   a 맞절 단독 듣기 · 멘트 판 넷(narEx.matjeol 0 ~ 3) × 짧은 판(25초): 첫 소리부터 마지막 줄이 끝날 때까지 입장 곡 소리가 0 인 순간이 없다 · 판 끝에서 강조 자리로 겹쳐 이었다(relay ≥ 1)
     · 남아야 할 길이 = 뜸 + 줄 실제 길이(받은 나레이션 duration) + 행동 멈춤 + 줄 사이 + 여운 8초 — 받은 길이(12초)를 썼다 · 시작 자리 = 판 안에서 그만큼 남는 가장 늦은 자리
   b 맞절 단독 · 60초 판(r1): 시작 자리 = 도착(원곡 100초)이 판 밖이라 «판 끝 − 남아야 할 길이» · 끝까지 소리
   c 입장 단독 «이 순간 전체 듣기»(장면): 장면이 도착에서 잦아들 때 남은 줄(받는 말)을 넘기고 입장 곡이 그 아래로 이어진다(크기 = 말 아래) · 장면 · 곡 엔진 사이 끊김 0 · 마지막 줄 뒤 여운(큐 사이 −8 → 잦아듦)
     · 시험에서만 장면의 «문 열린 뒤 크게 머무는 초»(SP.after 60)를 6초로 줄여 잰다(식이 같다)
   BP_BED · BP_OP · BP_EM(entry-music.js) = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const OP = process.env.BP_OP || '', BED = process.env.BP_BED || '', EMF = process.env.BP_EM || '', SHOT = process.env.SHOT || '';
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 600)}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
function wav(sec, f, sr = 16000) { const n = Math.round(sr * sec), b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(f ? 8000 * Math.sin(2 * Math.PI * f * i / sr) : 0), 44 + i * 2); return b; }
const SHORT = wav(12, 330);   /* 나레이션 대신 — 12초(긴 멘트)   /* 나레이션 대신 — 0.6초 */
/* 드라이브에 있는 곡(시험) — B07 · B30(화촉 3 · 4) · 테이블 인사 곡(B23 · B03 · B24 · B25)은 없다 */
const RL = [{ k: 'r5', name: '경쾌하게', t: '시험 입장 곡', a: '시험 가수', hook: 40, hook0: 40, len: 140, file: 'r5.mp3', img: '/assets/home/snap.webp', pos: '50% 50%' },
  { k: 'r1', name: '잔잔하게', t: '짧은 판 곡', a: '시험 가수', hook: 40, hook0: 40, len: 70, file: 'r1.mp3', pf: 'r1p.mp3', p0: 10, p1: 70, hooks: [40], img: '/assets/home/snap.webp', pos: '50% 50%' },
  { k: 'r7', name: '짧게', t: '아주 짧은 판 곡', a: '시험 가수', hook: 40, hook0: 40, len: 70, file: 'r7.mp3', pf: 'r7p.mp3', p0: 30, p1: 55, hooks: [40], img: '/assets/home/snap.webp', pos: '50% 50%' }];
const HAVE = ['B01', 'B02', 'B04', 'B05', 'B06', 'B09', 'B10', 'B12', 'B13', 'B15', 'B17', 'B21', 'B28'];
const SONG = {}; HAVE.forEach((k, i) => { SONG[k] = wav(20, 180 + i * 20).toString('base64'); });
const RS = { r5: wav(140, 250).toString('base64'), 'r1-p': wav(60, 300).toString('base64'), r1: wav(70, 300).toString('base64'), 'r7-p': wav(25, 320).toString('base64'), r7: wav(70, 320).toString('base64') };
const HARNESS = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><iframe id="fr" style="width:100vw;height:100vh;border:0;display:block"></iframe>
<script>
window.H={rl:${JSON.stringify(RL)},rs:${JSON.stringify(RS)},log:[],draft:null,saved:null,delay:40,have:${JSON.stringify(HAVE)},songs:${JSON.stringify(SONG)}};
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
        back({type:'momentedit:ritualFileData',key:'bed',id:g.id,ok:true,mime:'audio/wav',data:H.songs[g.id]}); }, H.delay); return; }
    back({type:'momentedit:ritualFileData',key:g.key,id:g.id,ok:false,error:'파일을 불러오지 못했어요 (코드 L6)',ecode:'L6'}); return; }
});
</script>`;
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/__harness.html') { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(HARNESS); return; }
  if (/^\/assets\/audio\/narration\/.+\.mp3$/.test(u)) { r.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': SHORT.length }); r.end(SHORT); return; }   /* 길이를 실어 보낸다(실제 사이트와 같게 · 없으면 브라우저가 길이를 모른다) */
  const p = (OP && u === '/order-preview.html') ? OP : (BED && u === '/assets/bgm-bed.js') ? BED : (EMF && u === '/assets/entry-music.js') ? EMF : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
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
/* ★[MUSIC_FOLD_PICK_1031 따라감] 고르면 바로 한 줄로 접힌다 — 접힌 줄이면 «바꾸기»로 펴서 목록을 잰다(종전엔 .mu-pick 이 없어 검사가 멈췄다) */
const row = (f, sg) => f.evaluate((sg) => { const Q = () => document.querySelector('.ls-bed[data-seg="' + sg + '"],.bed-sub[data-seg="' + sg + '"]'); let r = Q(); if (!r) return null;
  if (!r.querySelector('.mu-pick')) { const cb = r.querySelector('.mu-chg'); if (cb) { cb.click(); r = Q(); if (!r) return null; } }
  return { gl: ((r.querySelector('.gl') || {}).textContent || '').trim(), n: r.querySelectorAll('.mu-row').length, on: [...r.querySelectorAll('.mu-pick[aria-checked="true"]')].map((b) => b.getAttribute('data-fk')),
    pl: r.querySelectorAll('.mu-pl').length, off: [...r.querySelectorAll('.mu-pl.off')].map((b) => b.getAttribute('data-fk')), note: ((r.querySelector('.bed-note') || {}).textContent || '').trim(),
    plH: Math.round(((r.querySelector('.mu-pl') || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height)), pkH: Math.round(r.querySelector('.mu-pick').getBoundingClientRect().height) }; }, sg);
const lab = (f, k) => f.evaluate((k) => { const b = document.querySelector('.mk-hbtn[data-mp="' + k + '"]'); return b ? b.textContent.trim() : ''; }, k);
const LOG = (pg) => pg.evaluate(() => H.log.slice());
/* 이 순간 전체 듣기 — 줄마다 (그 줄 · 음악 곡 · 바란 크기)를 모은다 */
async function listen(f, k, ms) {
  await f.evaluate((k) => { window.__bl = []; lsPlay(k); const t = setInterval(() => { try { const st = LP.q[LP.i] || (LP.q.length ? { k: '_tail', slug: '_tail' } : null), B = BgmBed._t.BED; if (!st || LP.leadSt === st) return;   /* [LISTEN_PACE_1031] 순간 첫 줄 앞 음악 뜸(−8)은 그 줄 크기가 아니다 — listen-pace 가 잰다 */   /* [CHEER_TAIL_1030] 마지막 줄 뒤 꼬리(축배 곡 4초)도 잰다 */ window.__bl.push({ i: LP.i, k: st.k, slug: st.slug || '', talk: !!(st.talk || st.talk2 || st.skip || st.bridge), cheer: !!st.cheer, dk: st.dk, ldk: st.ldk, f: B.cur.f, want: B.cur.want, who: B.who, src: !!B.cur.src }); } catch (e) {} }, 120); window.__blT = t; }, k);
  await wait(f, ms); return f.evaluate(() => { clearInterval(window.__blT); try { lsStop(); } catch (e) {} return window.__bl.slice(); }); }
const shot = async (f, W, n, sel) => { if (!SHOT) return; try { fs.mkdirSync(SHOT, { recursive: true }); await f.locator(sel).first().screenshot({ path: path.join(SHOT, `bed-${W}-${n}.png`) }); } catch {} };
const MU = (k) => ({ src: 'rec', k, t: '시험 입장 곡', a: '시험 가수', hook: 40, hooks: [40], dur: k === 'r5' ? 140 : 70 });
const BEDP = (pg) => null;
/* 맞절을 끝까지 틀며 음악(곡 · 크기 · 소리 객체)과 차례를 모은다 */
async function trace(f, ks, ms, big) {
  return f.evaluate(async ({ ks, ms, big }) => { const B = BgmBed._t, o = []; let n = 0;
    if (big) { LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(ks, true); _lFull(); } else lsPlay(ks[0]);
    const t0 = performance.now();
    await new Promise((res) => { const iv = setInterval(() => { const v = B.BED.cur, st = LP.q[LP.i]; if (v && v.src && !v.__id) v.__id = ++n;
      o.push({ t: performance.now() - t0, k: st && st.k, act: !!(st && st.act), who: B.BED.who, f: v && v.f, src: !!(v && v.src), want: v && v.want, id: v && v.__id || 0, off: v && v.off, g: v && v.g ? v.g.gain.value : null, lead: !!LP.leadSt });
      if (performance.now() - t0 > ms) { clearInterval(iv); res(); } }, 100); });
    try { lsStop(); } catch (x) {} try { if (big) lsCloseBig(); } catch (x) {} return o; }, { ks, ms, big }); }
/* 듣기를 끝까지 — 100ms 마다 (줄 · 곡 · 소리 객체 · 크기 · 겹쳐 잇기 수 · 장면) · LP 가 끝나고 tail 초 더 */
async function run(f, k, max, tail) {
  return f.evaluate(async ({ k, max, tail }) => { const B = BgmBed._t, o = []; let n = 0, endT = null;
    lsPlay(k); const t0 = performance.now();
    await new Promise((res) => { const iv = setInterval(() => { const v = B.BED.cur, st = LP.q[LP.i], sc = EntryMusic._t.scene(); if (v && v.src && !v.__id) v.__id = ++n;
      const busy = !!(LP.q && LP.q.length && st && !LP.ended) || !!sc.run || !!sc.pend;
      o.push({ t: performance.now() - t0, i: LP.i, k: st && st.k, slug: st && st.slug, act: !!(st && st.act), talk: !!(st && (st.talk || st.said)), lead: !!LP.leadSt, rest: !!LP.entRest, who: B.BED.who, f: v && v.f, src: !!(v && v.src), want: v && v.want, id: v && v.__id || 0, g: v && v.g ? v.g.gain.value : null, relay: B.LPB.relay || 0, sc: !!sc.run, scx: sc.x, busy });
      if (!busy && endT == null && performance.now() - t0 > 3000) endT = performance.now();
      if ((endT != null && performance.now() - endT > tail) || performance.now() - t0 > max) { clearInterval(iv); res(); } }, 100); });
    const r = { o, need: null, DUR: Object.values(B.DUR || {}) }; try { lsStop(); } catch (x) {} return r; }, { k, max, tail }); }
/* 첫 입장 곡 소리 ~ 마지막 줄 끝 사이에 곡 소리가 0 인 순간(장면이 흐르는 동안은 장면 소리) */
const holes = (o) => { const i0 = o.findIndex((x) => (x.f === '@ENT' && x.src) || x.sc); const lastBusy = o.map((x) => x.busy).lastIndexOf(true); if (i0 < 0 || lastBusy < 0) return { i0, lastBusy, n: -1 };
  const h = o.slice(i0, lastBusy + 1).filter((x) => !x.sc && !(x.f === '@ENT' && x.src && x.g > 0.0002)); return { i0, lastBusy, n: h.length, first: h.slice(0, 3) }; };
try {
  const { ctx, pg, f, errs } = await open(390, true);
  /* a 맞절 단독 · 멘트 판 넷 × 짧은 판 25초 */
  for (const n of [0, 1, 2, 3]) {
    await f.evaluate(({ mu, n }) => { S.mu = mu; S.narEx = Object.assign({}, S.narEx || {}, { matjeol: n }); if (!n) delete S.narEx.matjeol; _persist(); render(); }, { mu: MU('r7'), n }); await go(f, 'matjeol'); await wait(f, 600);
    const R = await run(f, 'matjeol', 120000, 1500), H = holes(R.o), e = R.o.filter((x) => x.f === '@ENT' && x.src);
    const talk = R.o.filter((x) => x.k === 'matjeol' && x.talk === false && !x.act && !x.lead && x.f === '@ENT');
    const relay = Math.max(0, ...R.o.map((x) => x.relay)), lines = [...new Set(R.o.filter((x) => x.k === 'matjeol').map((x) => x.i))].length;
    ok(`a 맞절 멘트 판 ${n}(줄 ${lines}개 · 12초 나레이션) × 짧은 판 25초 — 첫 소리부터 마지막 줄 끝까지 곡 소리 0 인 순간 없음 · 판 끝에서 강조 자리로 겹쳐 이음(${relay}번)`, e.length > 50 && H.n === 0 && relay >= 1, { H, relay, e: e.length, ids: [...new Set(e.map((x) => x.id))] });
    if (n === 0) ok('a 남아야 할 길이는 받은 나레이션 길이(12초)로 잰다 — DUR', R.DUR.some((d) => Math.abs(d - 12) < 0.2), R.DUR.slice(0, 6));
  }
  /* b 60초 판 · 맞절 «기본» — 시작 = 판 끝 − 남아야 할 길이(도착 100초가 판 밖) */
  await f.evaluate((mu) => { S.mu = mu; if (S.narEx) delete S.narEx.matjeol; _persist(); render(); }, MU('r1')); await go(f, 'matjeol'); await wait(f, 600);
  { const b0 = await f.evaluate(async () => { lsPlay('matjeol'); await new Promise((r) => setTimeout(r, 4000)); const B = BgmBed._t, x = B.ENT(), need = B.entNeed('matjeol'), at = B.entAt('matjeol'); try { lsStop(); } catch (e) {} return { x: x && x.x, need, at }; });
    const want = b0.x ? Math.max(0, Math.min(b0.x.end - b0.need, b0.x.end - 1) - b0.x.o) : null;
    ok(`b 60초 판(원곡 10 ~ 70초) — 도착(100초)이 판 밖이면 «판 끝 − 남아야 할 길이(${b0.need && b0.need.toFixed(1)}초)» 자리(판 ${want != null ? want.toFixed(1) : '?'}초)부터`, b0.x && b0.need > 30 && Math.abs(b0.at - want) < 0.01, b0);
    await go(f, 'matjeol'); await wait(f, 400); const R = await run(f, 'matjeol', 120000, 1500), H = holes(R.o);
    ok('b 60초 판 — 끝까지 곡 소리 0 인 순간 없음', H.n === 0, H); }
  /* c 입장 단독 «이 순간 전체 듣기» — 장면 → 받는 말 아래로 입장 곡 */
  await f.evaluate((mu) => { S.mu = mu; _persist(); render(); EntryScene.SP.after = 6; }, MU('r5')); await go(f, 'entry'); await wait(f, 900);
  { const R = await run(f, 'entry', 150000, 9500), o = R.o, H = holes(o);
    const restIdx = o.findIndex((x) => x.rest), rest = restIdx > -1 ? o.slice(restIdx) : [], restTalk = rest.filter((x) => x.k === 'entry' && !x.lead && !x.act && x.busy && x.f === '@ENT' && x.src);
    const scEnd = o.map((x) => x.sc).lastIndexOf(true), entStart = o.findIndex((x) => x.rest && x.f === '@ENT' && x.src);
    ok(`c 장면이 도착에서 잦아들 때 남은 줄을 넘긴다 — 장면이 아직 흐르는 동안 입장 곡이 겹쳐 받는다(장면 끝 ${scEnd} · 곡 시작 ${entStart})`, restIdx > -1 && entStart > -1 && entStart <= scEnd + 2, { restIdx, scEnd, entStart });
    const slugs = [...new Set(rest.filter((x) => x.busy).map((x) => x.slug))];
    ok(`c 받는 말(${slugs.join(' · ')}) 동안 입장 곡이 흐른다 · 크기 = 그 큐의 말 아래 값(−12 · 맞절 멘트와 같은 체계 → 입장 곡 under)`, restTalk.length > 20 && restTalk.every((x) => x.want <= -12 && x.want >= -16), { n: restTalk.length, w: [...new Set(restTalk.map((x) => x.want))] });
    ok('c 첫 소리부터 마지막 줄 끝까지 곡 소리 0 인 순간 없음(장면 → 곡 엔진 이음 포함)', H.n === 0, H);
    const after = o.slice(o.map((x) => x.busy).lastIndexOf(true) + 1), w8 = after.filter((x) => x.want === -8 && x.src), gone = after.filter((x) => !x.src || (x.want != null && x.want <= -60));
    ok(`c 마지막 줄 뒤 여운 — 큐 사이 크기(−8)로 머문 뒤 잦아든다(머묾 ${w8.length} · 잦아듦 ${gone.length})`, w8.length >= 20 && gone.length > 0, { w8: w8.length, gone: gone.length, last: after.slice(-2) }); }
  ok('쪽 오류 0', !errs.length, errs.slice(0, 3));
  await ctx.close();
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); }
await br.close(); srv.close();
console.log(fail ? `ENTRY UNDER FAIL ${fail}` : 'ENTRY UNDER OK');
process.exit(fail ? 1 : 0);
