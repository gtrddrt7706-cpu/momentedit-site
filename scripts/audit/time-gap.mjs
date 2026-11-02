#!/usr/bin/env node
/* ★★[TIME_GAP_1102 2026-11-02 사장님 «나레이션 사이 턴 — 넘어갈 때가 너무 빨라» · «이벤트마다 전부»] ② 이 순간 전체 듣기 — 이벤트 줄 사이 쉼
   T1 하객 맞이 — 시각이 1분 이상 떨어진 줄 사이 쉼 ≥ 5.5초 · 그 동안 곡 −8 · 다음 줄 시작 때 −16 · «… 약 n분 뒤» 줄 = 실제 간격 · 쉼 동안만 진하게
   T2 같은 순간 안 제목이 바뀌는 자리(시작할 때 → 끝나면 · 소개 → 영상이 끝나면) 쉼 ≥ 2.3초 · 음악은 −12 까지(정적이면 정적 그대로)
   T3 «이어서»는 같은 이벤트 — 2.3초 쉼을 붙이지 않는다
   BP_OP · BP_BED = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
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
const hookGaps = (f) => f.evaluate(() => { window.__g = []; window.__w = []; if (!window.__gh) { window.__gh = 1; const o = BgmBed.lpGap; BgmBed.lpGap = function (pv, nx, gap, tg) { try { window.__g.push({ t: performance.now(), pv: pv && pv._li, nx: nx && nx._li, plab: pv && pv.lab, nlab: nx && nx.lab, gap, tg: tg || '', w0: BgmBed._t.BED.cur.want, src: !!BgmBed._t.BED.cur.src }); } catch (e) {} return o.apply(this, arguments); }; }
  window.__wT = setInterval(() => { try { const B = BgmBed._t.BED; window.__w.push({ t: performance.now(), want: B.cur.src ? B.cur.want : -99, k: LP.tgK || '', now: document.querySelectorAll('.mk-flow li.q-tg.lp-now').length }); } catch (e) {} }, 100); });
const take = (f) => f.evaluate(() => { clearInterval(window.__wT); const r = { g: window.__g.slice(), w: window.__w.slice(), q: window.__q || [] }; try { lsStop(); } catch (e) {} return r; });
const inG = (r, g, a, b) => r.w.filter((x) => x.t >= g.t + a && x.t <= g.t + b);
try {
  for (const W of [390, 1280]) { const { ctx, f, errs } = await open(W, true);
    /* T1 하객 맞이 */
    await go(f, 'guest'); await hookGaps(f); await f.evaluate(() => { lsPlay('guest'); window.__q = LP.q.map((x) => ({ li: x._li, am: x.am, lab: x.lab })); }); await wait(f, 42000); const r1 = await take(f);
    const mg = r1.g.filter((g) => g.tg === 'min'), ams = r1.q.filter((x) => x.am != null);
    const want = []; for (let i = 1; i < ams.length; i++) want.push('… 약 ' + Math.round(Math.abs(ams[i].am - ams[i - 1].am)) + '분 뒤');
    if (SHOT) { try { fs.mkdirSync(SHOT, { recursive: true }); await f.locator('.mk-flowsec').first().screenshot({ path: path.join(SHOT, `tg-${W}.png`) }); } catch (e) {} }
    const rows = await f.evaluate(() => [...document.querySelectorAll('.mk-flow li.q-tg')].map((x) => x.textContent.replace(/\u00a0/g, ' ').trim()));   /* 화면이 «약 n분» 사이를 줄바꿈 없는 공백으로 묶는다 */
    const mid = mg.map((g) => Math.max(...inG(r1, g, 1200, g.gap - 1000).map((x) => x.want))), at = mg.map((g) => { const z = inG(r1, g, g.gap + 150, g.gap + 450); return z.length ? z[z.length - 1].want : null; });
    const lit = mg.map((g) => inG(r1, g, 300, g.gap - 300).every((x) => x.now === 1));
    ok(`${W} T1 하객 맞이 — 시각 간격 쉼 ${mg.length}곳 · 쉼 ≥ 5.5초`, mg.length >= 4 && mg.length === want.length && mg.every((g) => g.gap >= 5500), { mg: mg.map((g) => [g.plab, g.nlab, g.gap]), want });
    ok(`${W} T1 쉼 동안 곡 −8 · 다음 줄 시작 때 −16`, mg.every((g, i) => !g.src || (at[i] != null && at[i] <= -60) || (mid[i] >= -8.6 && at[i] != null && at[i] <= -15.4)) && mg.filter((g, i) => g.src && at[i] != null && at[i] > -60).length >= 2, { mid, at });   /* [MEANING_R1_1102 1] 개식사 앞 쉼은 «예식 시작» 경계 — 하객 맞이 곡이 내려가 정적(−90) */
    ok(`${W} T1 «… 약 n분 뒤» 줄 = 실제 간격(${want.join(' · ')}) · 쉼 동안만 진하게`, rows.join('|') === want.join('|') && lit.every(Boolean), { lit, rows });
    /* T2 · T3 화촉 · 식전 영상 */
    await go(f, 'candle'); await hookGaps(f); await f.evaluate(() => lsPlay('candle')); await wait(f, 30000); const r2 = await take(f);
    const ev = r2.g.filter((g) => g.tg === 'evt'), cont = r2.g.filter((g) => g.nlab === '이어서');
    const evm = ev.map((g) => { const b = inG(r2, g, 0, 200).map((x) => x.want), m = inG(r2, g, 900, g.gap - 900).map((x) => x.want); return [g.nlab, g.gap, b.length ? Math.min(...b) : null, m.length ? Math.max(...m) : null]; });
    const brg = r2.g.filter((g) => g.nlab === '다음 순서로 넘어가며');
    ok(`${W} T2 화촉 — 제목이 바뀌는 자리(시작할 때 → 끝나면) 쉼 ≥ 2.3초 · 음악 −12 까지(더 크게 올리지 않음) · 이음말(다음 순서로)은 BRIDGE_FIRST 그대로`, ev.length >= 1 && ev.some((g) => g.nlab === '끝나면') && brg.every((g) => g.tg === '') && ev.every((g) => g.gap >= 2300) && evm.every((x) => x[3] == null || x[3] <= -11.4 || x[3] <= x[2] + 0.5), evm);
    ok(`${W} T3 «이어서»는 같은 이벤트 — 2.3초 쉼 없음`, cont.length >= 1 && cont.every((g) => g.tg === ''), cont.map((g) => [g.tg, g.gap]));
    await go(f, 'prevideo'); await hookGaps(f); await f.evaluate(() => lsPlay('prevideo')); await wait(f, 16000); const r3 = await take(f);
    const pe = r3.g.filter((g) => g.tg === 'evt'), pq = pe.map((g) => { const b = inG(r3, g, 0, 200).map((x) => x.want), m = inG(r3, g, 200, g.gap - 200).map((x) => x.want); return [g.plab, g.nlab, g.gap, b.length ? Math.max(...b) : null, m.length ? Math.max(...m) : null]; });
    ok(`${W} T2 식전 영상 — 소개 → 영상이 끝나면 쉼 ≥ 2.3초 · 정적 자리는 쉼 동안도 정적`, pe.length >= 1 && pe.every((g) => g.gap >= 2300) && pq.every((x) => x[3] == null || x[3] > -60 || x[4] <= -60), pq);
    ok(`${W} 쪽 오류 0`, !errs.length, errs.slice(0, 3)); await ctx.close(); }
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 500)); }
await br.close(); srv.close();
console.log(fail ? `TIME GAP FAIL ${fail}` : 'TIME GAP OK');
process.exit(fail ? 1 : 0);
