#!/usr/bin/env node
/* ★★[ENTRY_CARRY_1101 2026-11-01 사장님 «진행» · BGM 섹션 → 입장 세션] 맞절에서 입장 곡 이어 듣기 + 모든 순간 «이 순간 전체 듣기»
   진짜 식순 화면을 «마이페이지 안»(order-preview.html?embed=1)으로 띄우고 부모 창이 GAS 대신 구간 곡(key bed) · 추천 곡(key rec)을 준다(bgm-preview · rec-song-ui 와 같은 틀).
   1 맞절 «이 순간 전체 듣기 · 음악과 함께» — 두 분이 고른 입장 곡(추천 곡 key rec)을 묻고 '@ENT' 로 깐다 · 시작 = 도착(문 열림 + 60초) · 곡 판이 거기까지 못 담으면 판 안에서 25초 남는 가장 늦은 자리
   2 크기 = 입장 엔진 체계(곡 gain × intro/under + BED_TRIM · 구간 곡 +7 없음) · 뜸(큐 사이) → 멘트 아래 → 맞절 행동 줄(큐 사이) → 여운 5초 → 3초에 잦아듦
   3 이어 듣기(입장 → 맞절 → 감사 인사) — 입장 곡이 같은 소리 그대로 맞절로 이어진다(다시 시작 없음) · 감사 인사 뜸에서 구간 곡(M4)으로 넘긴다(play · 3초 겹침)
   4 입장 곡을 안 골랐으면 — 나레이션만 · «입장 곡이 이어져요» 아래 «입장 곡을 고르시면 함께 들려요» · 공개 미리보기는 그 줄 없음 · 오류 0
   5 알약 — 듣기에 들어가는 줄(나레이션 · 행동 · 말하는 차례)이 둘 이상인 순간마다 «이 순간 전체 듣기» · 한 줄이면 없음
   BP_BED=<bgm-bed.js 경로> · BP_OP=<order-preview.html 경로>(깨 보기)  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const OP = process.env.BP_OP || '', BED = process.env.BP_BED || '', SHOT = process.env.SHOT || '';
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
  if (/^\/assets\/audio\/narration\/.+\.mp3$/.test(u)) { r.writeHead(200, { 'Content-Type': 'audio/wav' }); r.end(SHORT); return; }
  const p = (OP && u === '/order-preview.html') ? OP : (BED && u === '/assets/bgm-bed.js') ? BED : path.join(ROOT, u);
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
/* 맞절을 끝까지 틀며 음악(곡 · 크기 · 소리 객체)과 차례를 모은다 */
async function trace(f, ks, ms, big) {
  return f.evaluate(async ({ ks, ms, big }) => { const B = BgmBed._t, o = []; let n = 0;
    if (big) { LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(ks, true); _lFull(); } else lsPlay(ks[0]);
    const t0 = performance.now();
    await new Promise((res) => { const iv = setInterval(() => { const v = B.BED.cur, st = LP.q[LP.i]; if (v && v.src && !v.__id) v.__id = ++n;
      o.push({ t: performance.now() - t0, k: st && st.k, act: !!(st && st.act), who: B.BED.who, f: v && v.f, src: !!(v && v.src), want: v && v.want, id: v && v.__id || 0, off: v && v.off, g: v && v.g ? v.g.gain.value : null, lead: !!LP.leadSt, nd: B.entNeed && st ? B.entNeed(st.k) : null });   /* [ENTRY_UNDER_1101] 그때의 «남아야 할 길이» */
      if (performance.now() - t0 > ms) { clearInterval(iv); res(); } }, 100); });
    try { lsStop(); } catch (x) {} try { if (big) lsCloseBig(); } catch (x) {} return o; }, { ks, ms, big }); }
try {
  for (const W of [390, 1280]) {
    const { ctx, pg, f, errs } = await open(W, true);
    /* 1 · 2 맞절 — 곡 전체(r5 · 140초 · 문 열림 40초) */
    await f.evaluate((mu) => { S.mu = mu; _persist(); render(); }, MU('r5')); await go(f, 'matjeol'); await wait(f, 500);
    const l1 = await lab(f, 'matjeol');
    ok(`${W} 1 맞절 알약 «이 순간 전체 듣기 · 음악과 함께»(입장 곡을 골랐다)`, l1 === '이 순간 전체 듣기 · 음악과 함께', l1);
    const r1 = await trace(f, ['matjeol'], 26000, false), lg1 = await LOG(pg);
    const e1 = r1.filter((x) => x.f === '@ENT' && x.src), x1 = await f.evaluate(() => ({ ent: BgmBed._t.ENT(), at: BgmBed._t.entAt('matjeol') }));
    ok(`${W} 1 입장 곡을 묻고(key rec · r5) '@ENT' 로 깐다 · 다른 구간 곡은 묻지 않는다`, lg1.includes('momentedit:ritualFileGet:rec:r5') && e1.length > 20 && !lg1.some((x) => /:bed:B/.test(x) && !/:bed:list/.test(x)), { lg1: lg1.filter((x) => /rec|bed/.test(x)).slice(0, 8), n: e1.length });
    ok(`${W} 1 시작 자리 = 도착(문 열림 40 + 60 = 100초)`, x1.ent && x1.ent.x && Math.abs(x1.ent.x.arrive - 100) < 0.05 && Math.abs(x1.at - 100) < 0.05 && e1.length && Math.abs(e1[0].off - 100) < 0.05, { x1, off: e1[0] && e1[0].off });
    const gf = await f.evaluate(() => { const x = BgmBed._t.ENT().x, gg = (db) => { const v = BgmBed._t.BED.cur; return null; }; return { gain: x.gain, ES: { intro: EntryScene.SP.intro, under: EntryScene.SP.under, trim: EntryScene.BED_TRIM } }; });
    const lead1 = e1.filter((x) => x.lead), nar1 = e1.filter((x) => !x.lead && !x.act && x.k === 'matjeol' && x.who === 'lp'), act1 = e1.filter((x) => x.act && x.who === 'lp');
    const dbOf = (x) => Math.round(20 * Math.log10(x.g / gf.gain) * 10) / 10, want = (d) => d + gf.ES.trim;
    const lastOf = (a) => a.length ? a[a.length - 1] : null;
    ok(`${W} 2 크기 = 입장 엔진 체계 — 뜸 · 행동 줄 = 큐 사이(intro ${want(gf.ES.intro)} dB) · 멘트 = 말 아래(under ${want(gf.ES.under)} dB) · 구간 곡 +7 없음`,
      lead1.length > 10 && act1.length > 5 && nar1.length > 3 && Math.abs(dbOf(lead1[Math.floor(lead1.length / 2)]) - want(gf.ES.intro)) < 0.6 && Math.abs(dbOf(lastOf(act1.slice(0, -3)) || act1[0]) - want(gf.ES.intro)) < 0.6 && nar1.some((x) => Math.abs(dbOf(x) - want(gf.ES.under)) < 0.6),
      { lead: lead1.slice(5, 7).map(dbOf), nar: nar1.slice(0, 4).map(dbOf), act: act1.slice(-4).map(dbOf) });
    const tl = r1.filter((x) => x.who === 'tail'), t0 = tl.length ? tl[0].t : null, at = (ms) => r1.reduce((a, x) => (Math.abs(x.t - (t0 + ms)) < Math.abs(a.t - (t0 + ms)) ? x : a), r1[0]);
    ok(`${W} 2 마지막 줄 뒤 여운 — 큐 사이 크기로 5초 → 3초에 잦아들며 끝(LISTEN_LOOK_LEVEL 과 같다)`, t0 != null && at(1600).src && at(1600).want >= -8.5 && at(5800).src && at(7400).want === -90 && !at(9800).src, t0 == null ? r1.slice(-5) : { a: at(1600), b: at(5800), c: at(7400), d: at(9800) });
    /* 1 짧은 판(r1 · 10 ~ 70초) — 도착(100초)이 판 밖 → 판 안에서 25초가 남는 가장 늦은 자리(45초) */
    await f.evaluate((mu) => { S.mu = mu; _persist(); render(); }, MU('r1')); await go(f, 'matjeol'); await wait(f, 300);
    const r1b = await trace(f, ['matjeol'], 9000, false), lg1b = await LOG(pg), e1b = r1b.filter((x) => x.f === '@ENT' && x.src);
    const want1b = e1b.length && e1b[0].nd != null ? Math.max(0, Math.min(70 - e1b[0].nd, 69) - 10) : null;   /* ★[ENTRY_UNDER_1101] 종전 «25초 남는 자리(판 35초)» → 그 순간 줄의 실제 길이로 잰 «남아야 할 길이»만큼 남는 가장 늦은 자리 */
    ok(`${W} 1 짧은 판에 도착 자리가 없으면 판 안에서 «남아야 할 길이»(${e1b[0] && e1b[0].nd != null ? e1b[0].nd.toFixed(1) : '?'}초)만큼 남는 가장 늦은 자리(판 ${want1b != null ? want1b.toFixed(1) : '?'}초)부터 · 곡 전체는 묻지 않는다`, lg1b.includes('momentedit:ritualFileGet:rec:r1-p') && !lg1b.includes('momentedit:ritualFileGet:rec:r1') && e1b.length && want1b != null && Math.abs(e1b[0].off - want1b) < 0.6, { off: e1b[0] && e1b[0].off, nd: e1b[0] && e1b[0].nd, lg: lg1b.filter((x) => /rec/.test(x)) });
    /* 3 이어 듣기 — 입장 → 맞절 → 감사 인사 */
    await f.evaluate((mu) => { S.mu = mu; _persist(); render(); }, MU('r5')); await go(f, 'entry'); await wait(f, 300);
    const r3 = await trace(f, ['entry', 'matjeol', 'welcome'], 52000, true);
    const ie = r3.filter((x) => x.k === 'entry' && x.f === '@ENT' && x.src), im = r3.filter((x) => x.k === 'matjeol'), iw = r3.filter((x) => x.k === 'welcome' && x.src);
    const ids = [...new Set(ie.concat(im).filter((x) => x.src).map((x) => x.id))], gap = ie.length ? r3.filter((x) => x.t >= ie[0].t && (x.k === 'entry' || x.k === 'matjeol') && !x.src) : [];
    ok(`${W} 3 이어 듣기 입장 → 맞절 — 같은 소리 하나(다시 시작 없음 · 끊김 0)`, ie.length > 10 && im.length > 10 && ids.length === 1 && !gap.length && im.every((x) => x.f === '@ENT'), { ie: ie.length, im: im.length, ids, gap: gap.slice(0, 3) });
    const fw = iw.find((x) => x.f !== '@ENT') || null, after = fw ? iw.filter((x) => x.t >= fw.t) : [];
    ok(`${W} 3 맞절 → 감사 인사 — 감사 인사 뜸에서 구간 곡(M4)으로 넘긴다(새 소리 · 그 뒤 입장 곡 없음)`, !!fw && fw.id !== ids[0] && after.every((x) => x.f !== '@ENT'), { fw, n: iw.length, ent: iw.filter((x) => x.f === '@ENT').length });
    /* 4 입장 곡 없음 */
    await f.evaluate(() => { delete S.mu; _persist(); render(); }); await go(f, 'matjeol'); await wait(f, 400);
    const n4 = await f.evaluate(() => ({ note: [...document.querySelectorAll('.mk-flow li.q[data-bgm] .ent-none')].map((x) => x.textContent.trim()), l: (document.querySelector('.mk-hbtn[data-mp="matjeol"]') || {}).textContent || '' }));
    const r4 = await trace(f, ['matjeol'], 6000, false);
    ok(`${W} 4 입장 곡을 안 골랐으면 «입장 곡이 이어져요» 아래 «입장 곡을 고르시면 함께 들려요» · 알약 «이 순간 전체 듣기» · 나레이션만`, n4.note.join() === '입장 곡을 고르시면 함께 들려요' && /^이 순간 전체 듣기/.test(n4.l.trim()) && !/음악과 함께/.test(n4.l) && !r4.some((x) => x.src), { n4, src: r4.filter((x) => x.src).length });
    /* 5 알약 — 줄 둘 이상이면 있다 · 한 줄이면 없다 */
    const P = [], ks = await f.evaluate(() => _lRows());
    for (const k of ks) { await go(f, k); P.push(await f.evaluate((k) => { const n = _lSteps(ENG, [k]).filter((x) => !x.skip && !x.talk2).length; return { k, n, pill: !!document.querySelector('.mk-hbtn[data-mp="' + k + '"],.em-scene [data-fk="emscene"]') }; }, k)); }
    const bad5 = P.filter((x) => (x.n >= 2) !== x.pill);
    ok(`${W} 5 «이 순간 전체 듣기» = 듣는 줄이 둘 이상인 순간마다(${P.filter((x) => x.pill).length}곳) · 한 줄이면 없음 · 맞절 · 테이블 인사 포함`, !bad5.length && P.some((x) => x.k === 'matjeol' && x.pill) && P.some((x) => x.k === 'table' && x.pill), { bad5, P });
    const one = await f.evaluate(() => { const o = _lSteps; window._lSteps = function (E, ks) { const a = o.apply(this, arguments); return (ks && ks[0] === 'matjeol') ? a.slice(0, 1) : a; }; try { render(); } catch (e) {} const has = !!document.querySelector('.mk-hbtn[data-mp="matjeol"]'); window._lSteps = o; try { render(); } catch (e) {} return has; });
    await go(f, 'matjeol'); const one2 = await f.evaluate(() => { const o = _lSteps; window._lSteps = function (E, ks) { const a = o.apply(this, arguments); return (ks && ks.length === 1 && ks[0] === 'matjeol') ? a.slice(0, 1) : a; }; try { render(); } catch (e) {} const has = !!document.querySelector('.mk-hbtn[data-mp="matjeol"]'); window._lSteps = o; try { render(); } catch (e) {} return has; });
    ok(`${W} 5 줄이 하나뿐인 순간엔 알약 없음(줄 ▶ 하나 · 같은 소리 단추 둘 금지)`, one2 === false, { one, one2 });
    ok(`${W} 쪽 오류 0`, !errs.length, errs.slice(0, 3));
    await ctx.close();
  }
  /* 4 공개 미리보기 — 그 줄 없음 · 나레이션만 */
  { const { ctx, f, errs } = await open(390, false); await go(f, 'matjeol'); await wait(f, 300);
    const p4 = await f.evaluate(() => ({ note: document.querySelectorAll('.ent-none').length, l: (document.querySelector('.mk-hbtn[data-mp="matjeol"]') || {}).textContent || '' }));
    ok('공개 4 맞절 — «입장 곡을 고르시면 …» 줄 없음 · 알약 «이 순간 전체 듣기»(음악과 함께 아님) · 오류 0', p4.note === 0 && /이 순간 전체 듣기/.test(p4.l) && !/음악과 함께/.test(p4.l) && !errs.length, { p4, errs });
    await ctx.close(); }
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 500)); }
await br.close(); srv.close();
console.log(fail ? `ENTRY CARRY FAIL ${fail}` : 'ENTRY CARRY OK');
process.exit(fail ? 1 : 0);
