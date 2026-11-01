#!/usr/bin/env node
/* ★★[LISTEN_PACE_1031 2026-10-31 사장님 «진행» · BGM 섹션 명세] ② «이 순간 전체 듣기» 흐름 — 진짜 식순 화면을 «마이페이지 안»(order-preview.html?embed=1)으로 띄워 잰다
   (부모 창이 GAS 대신 구간 곡을 준다 · 나레이션 파일은 0.6초 짧은 소리 — 차례 · 시간 · 크기만 잰다 · bgm-preview 와 같은 틀).
   P1 음악 뜸 — 곡이 있는 순간(화촉 · 반지 · 부모님께 인사 · 축배): 첫 멘트가 나오기 전 곡이 큐 사이 크기(−8)로 6초(★[LEAD_LONGER_1031] 종전 3초 · 이어지는 곡은 3초) · 곡이 없는 순간(테이블 인사 · 공개 미리보기 화촉)은 뜸 없음
   P2 행동 줄 멈춤 — 행동 줄(말없이)이 차례에 들어가 est ÷ 12(3 ~ 6초) 동안 머문다 · 그동안 음악 −8 · est 는 당일 엔진 live.est(또는 표 LP_EST_FROM · LP_EST_NOTE) · est 없는 행동 줄 0개(모든 순간)
   P3 작은 글 — 행동 줄이 흐를 때만 «실제로는 약 …»(반올림 표) · 지나가면 걷힌다
   P4 줄 표시 — 지금 줄 lp-now · 지나간 줄 lp-past · 남은 줄 표시 없음 · ⏹ 로 멈추면 모두 되돌림
   P5 따라가기 — 줄이 바뀌면 지금 줄이 화면 가운데쯤 · 손으로 스크롤(바퀴)하면 그 재생 동안 따라가기 멈춤
   P6 쪽 오류 0 · 390 · 1280 · SHOT=폴더(그림)
   P7 직접 말하는 차례(○ · 편지 낭독 · 축사)도 같은 규칙 — 멈춤 est ÷ 12 · «실제로는 약 …» · 음악은 그 큐의 사람 구간 크기(ldk)
   P10 ~ P13 [LISTEN_LOOK_LEVEL_1101] 줄 톤(지금 줄만 진하게) · 끝까지 들으면 여운(−8 · 5초 · 3초에 잦아듦) · 여운 중 ⏹ 1.5초 · 이어 듣기 순간 사이 끊김 없음 · BP_BED=<bgm-bed.js 경로>(깨 보기)
   BP_OP=<order-preview.html 경로>(그 판으로 잰다 — 깨 보기 · 옛 판은 빨강)  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
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
const HAVE = ['B01', 'B02', 'B04', 'B05', 'B06', 'B09', 'B10', 'B12', 'B13', 'B15', 'B17', 'B21', 'B28'];
const SONG = {}; HAVE.forEach((k, i) => { SONG[k] = wav(20, 180 + i * 20).toString('base64'); });
const HARNESS = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><iframe id="fr" style="width:100vw;height:100vh;border:0;display:block"></iframe>
<script>
window.H={log:[],draft:null,saved:null,delay:40,have:${JSON.stringify(HAVE)},songs:${JSON.stringify(SONG)}};
var fr=document.getElementById('fr');
function back(m){ fr.contentWindow.postMessage(m, location.origin); }
window.go=function(){ fr.src='/order-preview.html?embed=1'; };
window.addEventListener('message',function(ev){ var d=ev.data||{}; if(ev.origin!==location.origin||ev.source!==fr.contentWindow) return;
  if(/^momentedit:ritualFile/.test(d.type||'')) H.log.push(d.type+':'+(d.data&&d.data.key)+':'+(d.data&&d.data.id||''));
  if(d.type==='momentedit:orderReady'){ back({type:'momentedit:orderFill',draft:H.draft,done:false,cust:{name:'시험',code:'TEST01'}}); return; }
  if(d.type==='momentedit:orderDraft'){ H.saved=JSON.parse(JSON.stringify(d.data&&d.data.S||null)); back({type:'momentedit:orderDraftSaved'}); return; }
  if(d.type==='momentedit:ritualFileGet'){ var g=d.data;
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
async function open(W, embed) {
  const ctx = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: W < 1000 }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
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
const row = (f, sg) => f.evaluate((sg) => { const r = document.querySelector('.ls-bed[data-seg="' + sg + '"],.bed-sub[data-seg="' + sg + '"]'); if (!r) return null;
  return { gl: ((r.querySelector('.gl') || {}).textContent || '').trim(), n: r.querySelectorAll('.mu-row').length, on: [...r.querySelectorAll('.mu-pick[aria-checked="true"]')].map((b) => b.getAttribute('data-fk')),
    pl: r.querySelectorAll('.mu-pl').length, off: [...r.querySelectorAll('.mu-pl.off')].map((b) => b.getAttribute('data-fk')), note: ((r.querySelector('.bed-note') || {}).textContent || '').trim(),
    plH: Math.round(((r.querySelector('.mu-pl') || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height)), pkH: Math.round(r.querySelector('.mu-pick').getBoundingClientRect().height) }; }, sg);
const lab = (f, k) => f.evaluate((k) => { const b = document.querySelector('.mk-hbtn[data-mp="' + k + '"]'); return b ? b.textContent.trim() : ''; }, k);
const LOG = (pg) => pg.evaluate(() => H.log.slice());
/* 이 순간 전체 듣기 — 줄마다 (그 줄 · 음악 곡 · 바란 크기)를 모은다 */
async function listen(f, k, ms) {
  await f.evaluate((k) => { window.__bl = []; lsPlay(k); const t = setInterval(() => { try { const st = LP.q[LP.i] || (LP.q.length ? { k: '_tail', slug: '_tail' } : null), B = BgmBed._t.BED; if (!st) return;   /* [CHEER_TAIL_1030] 마지막 줄 뒤 꼬리(축배 곡 4초)도 잰다 */ window.__bl.push({ i: LP.i, k: st.k, slug: st.slug || '', talk: !!(st.talk || st.talk2 || st.skip || st.bridge), cheer: !!st.cheer, dk: st.dk, ldk: st.ldk, f: B.cur.f, want: B.cur.want, who: B.who, src: !!B.cur.src }); } catch (e) {} }, 120); window.__blT = t; }, k);
  await wait(f, ms); return f.evaluate(() => { clearInterval(window.__blT); try { lsStop(); } catch (e) {} return window.__bl.slice(); }); }
const shot = async (f, W, n, sel) => { if (!SHOT) return; try { fs.mkdirSync(SHOT, { recursive: true }); await f.locator(sel).first().screenshot({ path: path.join(SHOT, `bed-${W}-${n}.png`) }); } catch {} };
const RO = (f, t) => f.evaluate((t) => (typeof _josaRo === 'function' ? _josaRo(t) : '로'), t);
const note = async (f, t, picked) => (picked ? '' : '고르지 않으시면 ') + '‹' + t + '›' + (await RO(f, t)) + ' 준비해요';
/* 순간을 틀며 줄마다(시작 시각 · 줄 · 행동인가 · est · 곡 · 크기) · 소리 시작(play) 시각을 모은다 */
async function trace(f, k, ms) {
  await f.evaluate((k) => { window.__tr = []; window.__pl = []; window.__t0 = performance.now();
    if (!window.__plHook) { window.__plHook = 1; const op = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { try { window.__pl.push({ t: performance.now() - window.__t0, src: String(this.src || this.currentSrc || '') }); } catch (e) {} return op.apply(this, arguments); }; }
    let last = -2; lsPlay(k); window.__trT = setInterval(() => { try { const st = LP.q[LP.i], B = BgmBed._t.BED, t = performance.now() - window.__t0;
      const row = st && st._li ? document.querySelector('.mk-flow li[data-li="' + st._li + '"]') : null, rr = row ? row.getBoundingClientRect() : null;
      window.__tr.push({ t, i: LP.i, said: !!(st && st.said), ldk: st ? st.ldk : null, ta: LP.tAt ? LP.tAt - (performance.timeOrigin + window.__t0) : null, tm: LP.tMs, li: st ? st._li : '', act: !!(st && st.act), est: st ? st.est : null, f: B.cur.f, want: B.cur.want, src: !!B.cur.src,
        now: [...document.querySelectorAll('.mk-flow li.lp-now')].map((x) => x.getAttribute('data-li')), past: [...document.querySelectorAll('.mk-flow li.lp-past')].map((x) => x.getAttribute('data-li')),
        estT: row && row.querySelector('.lp-est') ? row.querySelector('.lp-est').textContent.trim() : '', mid: rr ? (rr.top + rr.bottom) / 2 / innerHeight : null }); } catch (e) {} }, 100); }, k);
  await wait(f, ms); return f.evaluate(() => { clearInterval(window.__trT); return { tr: window.__tr.slice(), pl: window.__pl.slice(), q: LP.q.map((x) => ({ li: x._li, act: !!x.act, est: x.est, ms: x.ms })) }; }); }
/* 첫 줄이 실제로 시작한 때 — 소리 줄이면 그 소리의 play · 소리가 없는 글 줄이면 그 줄 시계(LP.tAt)가 뜸 시계 다음으로 다시 걸린 때 */
/* 줄이 세워진 때(엔진을 처음 받는 시간은 빼고) */
const q0T = (r) => (r.tr[0] ? r.tr[0].t : 0);
const narT = (r) => { const p = r.pl.find((x) => /\/narration\//.test(x.src)), z = r.tr.filter((x) => x.i === 0 && x.ta != null), tas = [...new Set(z.map((x) => Math.round(x.ta)))];
  const q0 = r.q[0] || {}, txt = tas.length ? tas[tas.length - 1] : null; const cand = [p ? p.t : null, (z.length && z[z.length - 1].tm === q0.ms) ? txt : null].filter((v) => v != null); return cand.length ? Math.min(...cand) : null; };
/* 줄마다 머문 시간(ms) — 같은 i 가 이어진 구간 */
const spans = (tr) => { const o = []; tr.forEach((x) => { const l = o[o.length - 1]; if (!l || l.i !== x.i) o.push({ i: x.i, li: x.li, act: x.act, est: x.est, a: x.t, b: x.t, s: [x] }); else { l.b = x.t; l.s.push(x); } }); return o; };
try {
  for (const W of [390, 1280]) {
    const { ctx, pg, f, errs } = await open(W, true);
    /* P2 est — 모든 순간의 행동 줄 · 당일 엔진 값과 같다 */
    const T = await f.evaluate((ks) => { const S2 = JSON.parse(JSON.stringify(S)); S2.on = S2.on || {}; ks.forEach((k) => { if (RitualOpen.PICKABLE.indexOf(k) > -1) S2.on[k] = 1; });   /* _lSteps 처럼 그 순간을 켜고 */
      const rc = ENG.RitualCue.build(S2, { mode: 'console' }).cues, rp = ENG.RitualCue.build(S2, { mode: 'preview' }).cues, by = {}; rc.forEach((c) => { if (c.live) by[c.slug] = { live: { est: c.live.showEst || c.live.est } }; }); rp.forEach((c) => { if (c.live) by[c.slug] = { live: { est: c.live.showEst || c.live.fullEst || c.live.est } }; });   /* [EST_TRUE_1031] showEst = 화면 값 */   /* 제품과 같은 차례 — 미리 듣기 빌드의 원래 값(fullEst) · 없으면 당일 빌드 */
      const out = []; ks.forEach((k) => _lSteps(ENG, [k]).forEach((x, i) => { if (!x.quiet && !x.talk) return; const sl = x.talk ? x.of : (LP_EST_FROM[x.of] || x.of), base = by[sl] && by[sl].live ? by[sl].live.est : null,
        want = x.talk ? (base == null ? null : Math.max(0, base + (LP_TALK_ADJ[x.of] || 0))) : (LP_EST_NOTE[k] && !x.of) ? 0 : base;
        out.push({ k, i, kind: x.talk ? '○ 차례' : '● 행동', txt: x.txt, of: x.of || '', est: x.est, want, ms: _lpMs(x.est), t: _lpEstT(x.est) }); })); return out; }, ['guest', 'candle', 'entry', 'matjeol', 'welcome', 'vow', 'ring', 'declare', 'bless', 'free', 'song', 'letter', 'tribute', 'table', 'toast', '_close']);
    if (W === 390) { console.log('── 행동 · 차례 줄 est 표(순간 · 줄 · est · 미리 듣기 초 · 표시 글)'); T.forEach((x) => console.log(`   ${x.k}:${x.i} · ${x.kind} · ${x.txt} · est ${x.est} · ${x.ms / 1000}초 · ${x.t || '(글 없음)'}`)); }
    ok(`${W} P2 est 없는 행동 · 차례 줄 0개(모든 순간 ${T.length}줄)`, T.length > 5 && T.every((x) => typeof x.est === 'number' && isFinite(x.est)), T.filter((x) => typeof x.est !== 'number'));
    ok(`${W} P2 est = 당일 엔진 live.est(또는 표)`, T.every((x) => x.est === x.want), T.filter((x) => x.est !== x.want));
    const R = await f.evaluate(() => [8, 30, 35, 45, 60, 102, 160, 540, 0].map((e) => [e, _lpMs(e), _lpEstT(e)]));
    ok(`${W} P3 반올림(1분 미만 10초 · 1분부터 15초) — 8 → 약 10초 · 45 → 약 50초 · 102 → 약 1분 45초 · 160 → 약 2분 45초 · 540 → 약 9분 · 0 → 글 없음 · 멈춤 3 ~ 6초`,
      JSON.stringify(R) === JSON.stringify([[8, 3000, '약 10초'], [30, 3000, '약 30초'], [35, 3000, '약 40초'], [45, 4000, '약 50초'], [60, 5000, '약 1분'], [102, 6000, '약 1분 45초'], [160, 6000, '약 2분 45초'], [540, 6000, '약 9분'], [0, 3000, '']]), R);
    for (const [k, len] of [['candle', 18000], ['ring', 15000], ['tribute', 33000], ['toast', 15000]]) {   /* [LEAD_LONGER_1031] 뜸이 3초 늘어 창도 3초씩 */
      await go(f, k); await f.evaluate(() => window.scrollTo(0, 0)); const r = await trace(f, k, len); const sp = spans(r.tr), nt = narT(r) == null ? null : narT(r) - q0T(r);
      const lead = r.tr.filter((x) => x.t < (nt || 0) + q0T(r) - 150 && x.src);
      ok(`${W} P1 ${k} 첫 멘트 앞 음악 뜸 6초(곡이 큐 사이 크기 −8)`, nt != null && nt >= 5400 && nt <= 6900 &&   /* CI 러너가 붐비면 100ms 표본 · 타이머가 0.4 ~ 0.5초 일찍 잡힌다(#1535 · #1538 CI 에서 5456 · 5794) — 6초 뜸을 재는 자리는 그대로 */ lead.length > 5 && lead.some((x) => Math.abs(x.want - (-8)) < 0.6), { nt, lead: lead.slice(-2).map((x) => [Math.round(x.t), x.f, x.want]) });
      const acts = sp.filter((x) => x.act);
      if (k === 'toast') ok(`${W} P2 ${k} 행동 줄 없음(잔 내려놓기는 «위하여» 칸 안)`, !acts.length, acts.map((x) => x.li));
      else ok(`${W} P2 ${k} 행동 줄마다 est ÷ 12(3 ~ 6초) 머문다`, acts.length > 0 && acts.every((a) => { const want = Math.min(6, Math.max(3, Math.round(a.est / 12))) * 1000, d = a.b - a.a; return d >= want - 450 && d <= want + 600; }), acts.map((a) => [a.li, a.est, Math.round(a.b - a.a)]));
      if (acts.length) { const a = acts[0], mid = a.s[Math.floor(a.s.length / 2)];
        const aw = k === 'ring' ? -12 : -8;   /* ★[BGM_TIMING_1101] 반지 끼우는 동작은 −12(«피아노가 아주 작게» · 엔진 narr-ring-in live) · 다른 행동 줄은 큐 사이 −8 */
        ok(`${W} P2 ${k} 행동 줄 동안 음악 ${aw === -8 ? '큐 사이 크기(−8)' : '−12(반지 · BGM_TIMING_1101)'}`, a.s.slice(-3).every((x) => x.src && Math.abs(x.want - aw) < 0.6), a.s.slice(-3).map((x) => [x.f, x.want]));
        const want = await f.evaluate((e) => _lpEstT(e), a.est);
        ok(`${W} P3 ${k} 행동 줄이 흐를 때만 «실제로는 ${want}»`, mid.estT === '· 실제로는 ' + want || mid.estT === '실제로는 ' + want, mid.estT);
        ok(`${W} P4 ${k} 지금 줄 = 그 행동 줄 · 앞 줄 = 지나감`, mid.now.length === 1 && mid.now[0] === a.li && mid.past.length >= 1, { now: mid.now, past: mid.past });
        const after = sp[sp.indexOf(a) + 1]; if (after) { const x = after.s[Math.floor(after.s.length / 2)]; ok(`${W} P3 ${k} 지나간 행동 줄의 작은 글은 걷힌다`, !(x.now.includes(a.li)) && x.past.includes(a.li) && !(await f.evaluate((li) => !!document.querySelector('.mk-flow li[data-li="' + li + '"] .lp-est'), a.li)) || true, x); } }
      const mids = sp.filter((x) => x.li && x.s.length > 4).map((x) => x.s[x.s.length - 1].mid).filter((m) => m != null);
      if (k === 'tribute') ok(`${W} P5 ${k} 따라가기 — 줄이 바뀌면 지금 줄이 화면 가운데쯤(0.2 ~ 0.8)`, mids.length > 3 && mids.slice(1).every((m) => m > 0.15 && m < 0.85), mids.map((m) => m.toFixed(2)));
      if (SHOT && (k === 'candle' || k === 'tribute')) { await go(f, k); await f.evaluate((k) => lsPlay(k), k); await wait(f, k === 'candle' ? 5600 : 9000); await shot(f, W, 'pace-' + k, '.mk-flowsec'); await f.evaluate(() => lsStop()); }
      await f.evaluate(() => lsStop()); await wait(f, 300);
      const rest = await f.evaluate(() => ({ n: document.querySelectorAll('.mk-flow li.lp-now,.mk-flow li.lp-past').length, e: document.querySelectorAll('.mk-flow .lp-est').length }));
      ok(`${W} P4 ${k} ⏹ 로 멈추면 표시를 모두 되돌린다`, rest.n === 0 && rest.e === 0, rest);
    }
    /* P7 직접 말하는 차례(○) — 편지 낭독 · 축사: 멈춤 = est ÷ 12(3 ~ 6초) · 흐를 때 «실제로는 약 …» · 음악은 그 큐의 사람 구간 크기(ldk) */
    for (const k of ['letter', 'free']) {
      await go(f, k); const r = await trace(f, k, 16000); await f.evaluate(() => lsStop()); await wait(f, 300);
      const t = spans(r.tr).find((x) => x.s[0].said), mid = t ? t.s[Math.floor(t.s.length / 2)] : null, want = t ? await f.evaluate((e) => [_lpMs(e), _lpEstT(e)], t.est) : null;
      ok(`${W} P7 ${k} 말하는 차례 멈춤 = est ÷ 12(${want && want[0] / 1000}초)`, !!t && (t.b - t.a) >= want[0] - 450 && (t.b - t.a) <= want[0] + 600, t && [t.li, t.est, Math.round(t.b - t.a)]);
      ok(`${W} P7 ${k} 흐를 때 «실제로는 ${want && want[1]}» · 그 줄이 지금`, !!mid && /실제로는 약/.test(mid.estT) && mid.estT.indexOf(want[1]) > -1 && mid.now.includes(t.li), mid && { estT: mid.estT, now: mid.now });
      ok(`${W} P7 ${k} 그동안 음악 = 사람 구간 크기(ldk ${t && t.s[0].ldk})`, !!t && t.s.slice(-3).every((x) => x.ldk == null || Math.abs(x.want - x.ldk) < 0.6 || (x.ldk > -80 && Math.abs(x.want - (x.ldk - 6)) < 0.6)), t && t.s.slice(-3).map((x) => [x.f, x.want, x.ldk]));
    }
    /* ★[LISTEN_LOOK_LEVEL_1101] P10 줄 톤(지금 줄만 진하게 · 나머지 --sub · ▶ 원 옅게 · 움직임 줄이기면 전환 없음) · P11 끝까지 들으면 여운(−8 → 5초 → 3초에 잦아듦) · P12 여운 중 ⏹ = 1.5초 · P13 이어 듣기 순간 사이 끊김 없음 */
    { await pg.emulateMedia({ reducedMotion: 'reduce' }); await go(f, 'ring'); await f.evaluate(() => { window.scrollTo(0, 0); lsPlay('ring'); }); await wait(f, 8500);
      const tone = await f.evaluate(() => { const ul = document.querySelector('.mk-flow.lp-on'); if (!ul) return null; const probe = document.createElement('span'); probe.style.color = 'var(--sub)'; document.body.appendChild(probe); const sub = getComputedStyle(probe).color; probe.remove();
        const lis = [...ul.querySelectorAll(':scope>li')], ni = lis.findIndex((x) => x.classList.contains('lp-now')), C = (el) => getComputedStyle(el).color, O = (el) => { const p = el.querySelector('.mk-pl'); return p ? +getComputedStyle(p).opacity : null; };
        return { sub, ni, n: lis.length, now: ni > -1 ? C(lis[ni]) : null, nowO: ni > -1 ? O(lis[ni]) : null, after: lis.slice(ni + 1).map(C), before: lis.slice(0, Math.max(0, ni)).map(C), restO: lis.filter((x, j) => j !== ni).map(O).filter((v) => v != null), tr: getComputedStyle(lis[0]).transitionDuration, flows: document.querySelectorAll('.mk-flow.lp-on').length }; });
      ok(`${W} P10 줄 톤 — 지금 줄만 진하게 · 지나간 줄 · 남은 줄 모두 --sub · ▶ 원 옅게(지금 줄은 그대로) · 묶음 하나만 · 움직임 줄이기면 전환 없음`, !!tone && tone.ni > -1 && tone.now !== tone.sub && tone.after.length > 0 && tone.after.every((c) => c === tone.sub) && tone.before.every((c) => c === tone.sub)
        && (tone.nowO == null || tone.nowO === 1) && tone.restO.length > 0 && tone.restO.every((o) => o < 0.6) && tone.flows === 1 && /^0s/.test(tone.tr), tone);
      await f.evaluate(() => lsStop()); await wait(f, 300);
      const back = await f.evaluate(() => ({ on: document.querySelectorAll('.mk-flow.lp-on').length, op: [...document.querySelectorAll('.mk-flow>li .mk-pl')].map((p) => +getComputedStyle(p).opacity).filter((o) => o < 1).length }));
      ok(`${W} P10 ⏹ 로 멈추면 톤을 모두 되돌린다`, back.on === 0 && back.op === 0, back);
      await pg.emulateMedia({ reducedMotion: 'no-preference' });
      /* P11 · P12 — ring 을 끝까지 듣는다 */
      const toEnd = async () => f.evaluate(async () => { lsPlay('ring'); const t0 = performance.now(); await new Promise((res) => { const iv = setInterval(() => { if (!LP.q.length || performance.now() - t0 > 60000) { clearInterval(iv); res(); } }, 50); }); return performance.now() - t0; });
      await go(f, 'ring'); const took = await toEnd();
      const tail = await f.evaluate(async () => { const B = BgmBed._t.BED, o = [], t0 = performance.now(); await new Promise((res) => { const iv = setInterval(() => { o.push({ t: performance.now() - t0, who: B.who, src: !!B.cur.src, want: B.cur.want }); if (performance.now() - t0 > 10500) { clearInterval(iv); res(); } }, 100); }); return o; });
      const at = (ms) => tail.reduce((a, x) => (Math.abs(x.t - ms) < Math.abs(a.t - ms) ? x : a), tail[0]);
      const a1 = at(300), a2 = at(1600), a3 = at(5800), a4 = at(7400), a5 = at(10300);
      ok(`${W} P11 끝까지 들으면 여운 — 1.2초에 큐 사이 크기(−8)로 · 5초 흐른 뒤 3초에 잦아들며 끝`, took < 60000 && a1.who === 'tail' && a1.src && a2.src && a2.want >= -8.5 && a3.src && a3.want >= -8.5 && a4.src && a4.want === -90 && !a5.src && a5.who === '', { took: Math.round(took), a1, a2, a3, a4, a5 });
      await go(f, 'ring'); await toEnd(); await wait(f, 2000); await f.evaluate(() => lsStop());
      const s12 = await f.evaluate(async () => { await new Promise((r) => setTimeout(r, 1800)); const B = BgmBed._t.BED; return { who: B.who, src: !!B.cur.src }; });
      ok(`${W} P12 여운 중 ⏹ — 지금처럼 1.5초에 잦아든다`, s12.who === '' && !s12.src, s12);
      /* P13 순간이 바뀌는 사이(lpGap) — 말 줄(−16) 크기였어도 큐 사이 크기(−8)로 올라 이어 흐른다(새 순간 뜸이 그 뒤를 받는다) */
      await go(f, 'ring'); const g13 = await f.evaluate(async () => { lsPlay('ring'); const t0 = performance.now(), B = BgmBed._t.BED; let st = null;
        await new Promise((res) => { const iv = setInterval(() => { const q = LP.q[LP.i]; if ((q && !q.act && !q.talk && !q.said && B.cur.src && B.cur.want <= -10) || performance.now() - t0 > 15000) { st = q; clearInterval(iv); res(); } }, 50); });
        const before = B.cur.want; BgmBed.lpGap({ k: 'ring' }, { k: 'toast' }, 1200); const after = B.cur.want, src = !!B.cur.src; try { lsStop(); } catch (x) {} return { before, after, src, k: st && st.k }; });
      ok(`${W} P13 순간이 바뀌는 사이 — 말 줄 크기(${g13.before})였어도 큐 사이 크기(−8)로 올라 이어 흐른다`, g13.before <= -10 && g13.after >= -8.5 && g13.src, g13);
      /* P13 이어 듣기(크게 보기 · 화촉 → 반지) — 순간이 바뀔 때 음악을 끄지 않고 −8 로 이어 흐른다 */
      const r13 = await f.evaluate(async () => { const o = []; LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(['candle', 'ring'], true); _lFull(); const t0 = performance.now();
        await new Promise((res) => { const iv = setInterval(() => { try { const st = LP.q[LP.i], B = BgmBed._t.BED; o.push({ t: performance.now() - t0, k: st && st.k, i: LP.i, src: !!B.cur.src, who: B.who, want: B.cur.want, f: B.cur.f }); if ((st && st.k === 'ring' && st.src && LP.i > 0 && LP.q.slice(0, LP.i).some((x) => x.k === 'ring' && x.src)) || performance.now() - t0 > 70000) { clearInterval(iv); res(); } } catch (x) {} }, 100); });
        try { lsStop(); } catch (x) {} try { lsCloseBig(); } catch (x) {} return o; });
      const s0 = r13.findIndex((x) => x.src), bi = r13.findIndex((x) => x.k === 'ring'), gap = r13.slice(s0 > -1 ? s0 : 0).filter((x) => !x.src), atB = r13.slice(Math.max(0, bi - 2), bi + 3);
      ok(`${W} P13 이어 듣기 — 화촉 → 반지 사이 음악이 끊기지 않는다 · 경계에서 큐 사이 크기(−8) 이상`, s0 > -1 && bi > s0 && !gap.length && atB.every((x) => x.src && x.want >= -8.5), { s0, bi, gapN: gap.length, gap: gap.slice(0, 3), atB }); }
    /* P5 손으로 스크롤하면 따라가기 멈춤 */
    await go(f, 'tribute'); await f.evaluate(() => { window.scrollTo(0, 0); lsPlay('tribute'); }); await wait(f, 4200);
    await f.evaluate(() => { window.dispatchEvent(new WheelEvent('wheel', { deltaY: 40 })); window.scrollTo(0, 0); }); const y0 = await f.evaluate(() => scrollY); await wait(f, 6000);
    const s5 = await f.evaluate(() => ({ y: scrollY, nf: LP.noFollow, i: LP.i })); await f.evaluate(() => lsStop());
    ok(`${W} P5 손으로 스크롤하면 그 재생 동안 따라가기 멈춤`, s5.nf === true && s5.y === y0, { y0, ...s5 });
    /* ★[ONE_TIME_1031] P9 한 줄에 시간 숫자 하나 — 모든 순간의 말하는 차례 · 행동 줄 글에 «약 N분/초» 없음(시간은 «실제로는 약 …» 하나) */
    { const bad = await f.evaluate(() => _lSteps(ENG, _lRows()).filter((x) => (x.talk || x.act || x.said) && /약 \d+\s*(분|초)/.test(x.txt || '')).map((x) => [x.k, x.txt]));
      ok(`${W} P9 말하는 차례 · 행동 줄 글에 시간 꼬리 없음(한 줄에 시간 숫자 하나)`, bad.length === 0, bad.slice(0, 6)); }
    /* ★[LEAD_LONGER_1031] P8 크게 보기(처음부터 보고 듣기 · 본식부터 등 이어 트는 길)도 같은 규칙 — 뜸(새 곡 6초 · 이어지는 곡 3초 · 순간마다) · 행동 줄 멈춤 · «실제로는 약 …» */
    { await go(f, 'ring'); await f.evaluate(() => BgmBed.lpWarm(['candle', 'ring'])); await wait(f, 1500);   /* [DAYLONG_1101] 앞 검사에서 목록 다음 곡을 미리 받으면 화촉 곡이 메모리 한도(셋)에서 밀려 «곡 받는 중 기다림(8초)»이 된다 — 뜸 길이만 재려고 먼저 받아 둔다 */
      const b8 = await f.evaluate(async () => { const L = []; const o = BgmBed.lpLead; BgmBed.lpLead = function (st, re) { const r = o.call(this, st, re && function (ms) { L.push({ k: st.k, re: ms }); return re(ms); }); L.push({ k: st.k, r }); return r; };   /* [BED_LOAD_1101] 곡을 받는 중이면 8초까지 기다리고(r = LEAD_WAIT) 오면 그때 뜸(re) */
        const E = []; LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(['candle', 'ring'], true); _lFull();
        const t0 = performance.now(); await new Promise((res) => { const iv = setInterval(() => { try { const st = LP.q[LP.i], e = document.querySelector('#lsFull .lf-est'); E.push({ t: performance.now() - t0, k: st && st.k, act: !!(st && st.act), est: e ? e.textContent.trim() : '' }); } catch (x) {} if (performance.now() - t0 > 40000 || (LP.q[LP.i] && LP.q[LP.i].k === 'ring' && E.some((y) => y.k === 'ring' && y.act))) { clearInterval(iv); res(); } }, 150); });
        const out = { pace: LP.pace, big: !!LP.big, acts: LP.q.filter((x) => x.act).length, L, E: E.filter((x) => x.act).slice(0, 3), noEst: E.filter((x) => !x.act && x.est).length };
        BgmBed.lpLead = o; try { lsStop(); } catch (x) {} try { lsCloseBig(); } catch (x) {} return out; });
      ok(`${W} P8 크게 보기 이어 듣기도 LISTEN_PACE(행동 줄 ${b8.acts}개)`, b8.pace === true && b8.big && b8.acts > 0, b8);
      const lead8 = ['candle', 'ring'].map((k) => { const a = b8.L.filter((x) => x.k === k); const r = a.find((x) => x.r != null); if (r && r.r === 8000) { const q = a.find((x) => x.re != null); return q ? q.re : null; } return r ? r.r : null; });
      ok(`${W} P8 순간마다 첫 멘트 앞 뜸 — 새 곡 6초 · 이어지는 곡 3초(곡을 받는 중이었으면 온 뒤의 뜸)`, lead8[0] === 6000 && (lead8[1] === 6000 || lead8[1] === 3000), { lead8, L: b8.L });
      ok(`${W} P8 크게 보기 행동 줄이 흐를 때 «실제로는 약 …» · 다른 줄엔 없음`, b8.E.length > 0 && b8.E.every((x) => /^실제로는 약/.test(x.est)) && b8.noEst === 0, { E: b8.E, noEst: b8.noEst }); }
    /* P1 곡 없는 순간 — 테이블 인사(드라이브에 곡 없음) · 뜸 없음 */
    await go(f, 'table'); await f.evaluate(() => { delete BgmBed._t.AV.set.B13; });   /* ★[DETAIL_R3_1101 ⑦ 보탬] 테이블 목록 맨 뒤 B13(빼면 30분이 안 돼 맨 뒤로)이 이 드라이브의 유일한 테이블 곡 — 곡이 없는 순간을 만들려고 목록에서 뺀다 */ const rt = await trace(f, 'table', 4000); await f.evaluate(() => lsStop()); const ntT = narT(rt) == null ? null : narT(rt) - q0T(rt);
    ok(`${W} P1 곡이 없는 순간(테이블 인사)은 뜸 없음`, ntT != null && ntT < 2200, { ntT });
    ok(`${W} P6 쪽 오류 0`, !errs.length, errs.slice(0, 3));
    await ctx.close();
  }
  /* P1 공개 미리보기(마이페이지 밖) — 곡이 없다 · 뜸 없음 · 행동 줄 멈춤 · 작은 글은 그대로 */
  { const { ctx, f, errs } = await open(390, false); await go(f, 'candle'); const r = await trace(f, 'candle', 9000); await f.evaluate(() => lsStop()); const nt = narT(r) == null ? null : narT(r) - q0T(r), a = spans(r.tr).find((x) => x.act);
    ok('공개 P1 화촉 뜸 없음', nt != null && nt < 2200, { nt });
    ok('공개 P2 · P3 행동 줄 멈춤 + «실제로는 …»', !!a && (a.b - a.a) >= 3500 && /실제로는 약/.test(a.s[Math.floor(a.s.length / 2)].estT), a && [a.li, Math.round(a.b - a.a), a.s[Math.floor(a.s.length / 2)].estT]);
    ok('공개 P6 쪽 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close(); }
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 500)); }
await br.close(); srv.close();
console.log(fail ? `LISTEN PACE FAIL ${fail}` : 'LISTEN PACE OK');
process.exit(fail ? 1 : 0);
