#!/usr/bin/env node
/* ★★[KNOBS_1031 2026-10-31 BGM 섹션 · GPT 2라운드 + 판정] 쉼과 감정 연출 — listen-pace 와 같은 틀(마이페이지 안 order-preview · 나레이션은 0.6초 짧은 소리)
   K1 표 — assets/narration-pad.js 가 나레이션 파일 전부의 앞 · 뒤 무음을 갖는다 · gap = 목표 − (앞 뒤 무음 + 다음 앞 무음) · 0 아래면 0
   K2 미리 듣기 «말끝 → 말머리» — 화촉 · 부모님께 인사(멘트가 이어 나오는 순간): 나레이션 줄 사이 실제 쉼 + 표의 무음 = 목표(멘트 사이 1초 · 사슬 1.25초 · 1초) ±0.3초
   K2b 당일 사슬 — 화촉 · 서약 · 반지 · 부모님께 인사 순간의 사슬 큐 사이(콘솔 식 그대로): 쉼 + 무음 = 목표(2초 · 1.25 · 서약 뒤 4.5 · 1초) ±0.3초 · 서약 · 반지는 순간 안 멘트 사이에 행동 줄이 끼어 순간 미리 듣기엔 «멘트 → 멘트»가 없다
   K3 성혼 선언 앞 — 음악이 4초에 걸쳐 0(−60 dB 아래)까지 · 정적 2.5초 뒤 첫 멘트(당일 값 · 미리 듣기 1.2초로 줄이지 않는다)
   K4 편지 끝 — 마지막 멘트 뒤 정적 2초 → 4초에 걸쳐 말 아래 크기로
   K5 당일 콘솔 — 사슬 큐 사이도 같은 표로 한 번만(코드 대조)
   BP_OP=<order-preview.html 경로>(깨 보기) · 종료 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const SONG_DB = (() => { try { const m = fs.readFileSync(new URL('../../assets/ritual-cue.js', import.meta.url), 'utf8').match(/songGain:\s*(-?\d+(?:\.\d+)?)/); return m ? +m[1] : 0; } catch (e) { return 0; } })();   // [LISTEN_LOOK_LEVEL_1101] K4 기준을 곡 보정만큼
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const OP = process.env.BP_OP || '', SHOT = process.env.SHOT || '';
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
  const p = (OP && u === '/order-preview.html') ? OP : path.join(ROOT, u);
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

const NP = require(path.join(ROOT, 'assets/narration-pad.js'));
{ const files = fs.readdirSync(path.join(ROOT, 'assets/audio/narration')).filter((x) => x.endsWith('.mp3')).map((x) => x.slice(0, -4)); const miss = files.filter((x) => !NP.PAD[x]);
  ok(`K1 표 — 나레이션 ${files.length}개 전부`, !miss.length, miss.slice(0, 5));
  ok('K1 gap = 목표 − 무음 · 0 아래면 0 · 표에 없으면 목표 그대로', NP.gap('05_entry-A', '06_entry-B', 2000) === 2000 - NP.PAD['05_entry-A'][1] - NP.PAD['06_entry-B'][0] && NP.gap('05_entry-A', '06_entry-B', 100) === 0 && NP.gap('x', '05_entry-A', 1500) === 1500); }
{ const CON = fs.readFileSync(path.join(ROOT, 'console.html'), 'utf8');
  ok('K5 콘솔 — 사슬 사이를 표로 한 번만(두 분 목소리는 그대로)', /_gap = NarrPad\.gap\(c\.file, nx\.file, _gap\)/.test(CON) && /narration-pad\.js/.test(CON) && /!RF_OWN\[c\.slug\] && !RF_OWN\[nx\.slug\]/.test(CON)); }
{ const CON = fs.readFileSync(path.join(ROOT, 'console.html'), 'utf8'), m = /var nx = R\.cues\[i\+1\], _gap = ([^;]+);[\s\S]*?(if \(nx && _gap > 0 && window\.NarrPad[^\n]*?;)/.exec(CON);
  const C = require(path.join(ROOT, 'assets/ritual-cue.js')), PARAM = C.PARAM;
  const S = { course: 'open', exv: 2, on: { prevideo: 1, candle: 1, welcome: 1, vow: 1, ring: 1, declare: 1, tribute: 1 }, tributeSay: 'long' };
  const cues = C.build(S, { mode: 'console' }).cues, bad = []; let n = 0;
  if (!m) ok('K2b 콘솔 사슬 식을 찾았다', false);
  else { const f = new Function('R', 'i', 'c', 'PARAM', 'RF_OWN', 'window', 'NarrPad', 'var nx = R.cues[i+1], _gap = ' + m[1] + ';\n' + m[2] + '\nreturn _gap;');
    cues.forEach((c, i) => { const nx = cues[i + 1]; if (!nx || nx.fire !== 'chain' || !/^(candle|vow|ring|tribute)$/.test(nx.k) || !c.file || !nx.file || nx.gapNone) return; const a = NP.of(c.file), b = NP.of(nx.file); if (!a || !b) return;
      const tg = nx.gapMs || PARAM.gapMs, g = f({ cues }, i, c, PARAM, {}, { NarrPad: NP }, NP), real = g + a[1] + b[0]; n++;
      if (tg - a[1] - b[0] > 0 ? Math.abs(real - tg) > 300 : g !== 0) bad.push({ a: c.slug, b: nx.slug, tg, g, real }); }); }
  ok(`K2b 당일 사슬 — 화촉 · 서약 · 반지 · 부모님께 인사 쉼 + 무음 = 목표 ±0.3초 (${n}쌍)`, n >= 3 && !bad.length, { n, bad }); }
/* 순간을 틀며 나레이션 소리 시작(play) · 끝(ended) · 음악 크기를 모은다 */
async function run(f, k, ms) {
  await f.evaluate((k) => { window.__ev = []; window.__mu = []; window.__q = null; window.__t0 = performance.now();
    if (!window.__kHook) { window.__kHook = 1; const op = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { const el = this; try { const s = String(el.src || el.currentSrc || ''); window.__ev.push({ e: 'play', t: performance.now() - window.__t0, s, i: LP.i });
      if (!el.__kEnd) { el.__kEnd = 1; el.addEventListener('ended', () => { window.__ev.push({ e: 'end', t: performance.now() - window.__t0, s: String(el.src || ''), i: LP.i }); }); } } catch (e) {} return op.apply(this, arguments); }; }
    lsPlay(k); window.__muT = setInterval(() => { try { const B = BgmBed._t.BED, g = B.cur && B.cur.g ? B.cur.g.gain.value : 0; if (LP.q && LP.q.length && !window.__q) window.__q = LP.q.map((x) => ({ k: x.k, file: x.file || '', src: x.src || '', gm: x.gm || 0, nar: !x.talk && !x.talk2 && !x.skip && !x.bridge && !x.act })); window.__mu.push({ t: performance.now() - window.__t0, i: LP.i, src: !!B.cur.src, db: g > 0 ? 20 * Math.log10(g) : -120, want: B.cur.want }); } catch (e) {} }, 50); }, k);
  await wait(f, ms); return f.evaluate(() => { clearInterval(window.__muT); const q = window.__q || []; try { lsStop(); } catch (e) {} return { ev: window.__ev.slice(), mu: window.__mu.slice(), q }; }); }
const isNar = (s) => /\/narration\/[^/]+\.mp3/.test(s); const fileOf = (s) => (/\/narration\/([^/?]+)\.mp3/.exec(s) || [])[1] || '';
try {
  for (const W of (process.env.KW ? process.env.KW.split(',').map(Number) : [390, 1280])) {
    const { ctx, f, errs } = await open(W, true);
    /* K2 */
    for (const k of (process.env.KK ? process.env.KK.split(',') : ['candle', 'tribute'])) {
      await go(f, k); const r = await run(f, k, 26000), plays = r.ev.filter((x) => x.e === 'play' && isNar(x.s)), ends = r.ev.filter((x) => x.e === 'end' && isNar(x.s)); let n = 0; const bad = [];
      for (let j = 1; j < plays.length; j++) { const a = r.q[plays[j - 1].i], b = r.q[plays[j].i]; if (!a || !b || plays[j].i !== plays[j - 1].i + 1 || !a.nar || !b.nar || a.k !== b.k) continue;
        const e = ends.filter((x) => x.t >= plays[j - 1].t && x.t <= plays[j].t).pop(); if (!e) continue; const pa = NP.of(fileOf(plays[j - 1].s)), pb = NP.of(fileOf(plays[j].s)); if (!pa || !pb) continue;
        const target = (b.gm > 0 && b.gm < 2000) ? b.gm : 1000, real = (plays[j].t - e.t) + pa[1] + pb[0]; n++;
        if (Math.max(0, target - pa[1] - pb[0]) > 0 && Math.abs(real - target) > 300) bad.push({ a: fileOf(plays[j - 1].s), b: fileOf(plays[j].s), real: Math.round(real), target });
        if (Math.max(0, target - pa[1] - pb[0]) === 0 && (plays[j].t - e.t) > 300) bad.push({ a: fileOf(plays[j - 1].s), b: fileOf(plays[j].s), wait: Math.round(plays[j].t - e.t), note: '무음이 목표보다 길다 · 쉼 0' }); }
      ok(`${W} K2 ${k} 말끝 → 말머리 = 목표 ±0.3초 (${n}쌍)`, n > 0 && !bad.length, { n, bad, dbg: n ? undefined : { q: r.q.map((x) => x.k + (x.nar ? '' : '*') + ':' + x.file + ':' + String(x.src).slice(-20)), pl: plays.map((x) => x.i + ':' + fileOf(x.s)), en: ends.length } }); }
    /* K3 성혼 선언 앞 */
    { await go(f, 'declare'); const r = await run(f, 'declare', 12000), p = r.ev.find((x) => x.e === 'play' && isNar(x.s)), mu = r.mu, top = mu.filter((x) => x.src).map((x) => x.db);
      const has = top.length && Math.max(...top) > -30; if (!has) ok(`${W} K3 선언 앞 — 곡 있음(시험 조건)`, false, { top: top.slice(0, 5) });
      else { const mx = Math.max(...top), pk = mu.filter((x) => x.src && x.db >= mx - 1).pop(), z = mu.find((x) => pk && x.t > pk.t && x.db <= -60), t1 = p ? p.t : null;
        ok(`${W} K3 선언 앞 — 4초에 걸쳐 0 · 2.5초 정적 · 첫 멘트`, !!pk && !!z && (z.t - pk.t) >= 3300 && (z.t - pk.t) <= 4800 && t1 != null && (t1 - z.t) >= 2000 && (t1 - z.t) <= 3400 && mu.filter((x) => x.t > z.t && x.t < t1).every((x) => x.db <= -55), { fade: pk && z ? Math.round(z.t - pk.t) : null, sil: z && t1 ? Math.round(t1 - z.t) : null }); } }
    /* K4 편지 끝 · ★[LISTEN_LOOK_LEVEL_1101] 소리 칸 값에는 곡 보정(songGain)이 함께 실린다 — «−30 을 넘는 때»도 그만큼 옮겨 잰다(같은 곡선 · main 과 같은 잣대) */
    { await go(f, 'letter'); const r = await run(f, 'letter', 30000), ends = r.ev.filter((x) => x.e === 'end' && isNar(x.s)), last = ends.pop(), mu = r.mu.filter((x) => last && x.t > last.t);
      const up = mu.find((x) => x.db > -30 + SONG_DB), lowEnd = mu.filter((x) => up && x.t < up.t).every((x) => true), quiet = mu.filter((x) => x.t < last.t + 1800);
      const bedDay = r.q.some((x) => x.k === 'letter' && x.nar) ? null : null;
      ok(`${W} K4 편지 끝 — 정적 2초 → 4초에 걸쳐 오른다`, !!last && quiet.length > 0 && quiet.every((x) => x.db <= -55) && !!up && (up.t - last.t) >= 3000 && (up.t - last.t) <= 6800, { quietMax: quiet.length ? Math.round(Math.max(...quiet.map((x) => x.db))) : null, up: up && last ? Math.round(up.t - last.t) : null }); }
    ok(`${W} 쪽 오류 0`, !errs.length, errs.slice(0, 3));
    await ctx.close();
  }
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 500)); }
await br.close(); srv.close();
console.log(fail ? `KNOBS FAIL ${fail}` : 'KNOBS OK');
process.exit(fail ? 1 : 0);
