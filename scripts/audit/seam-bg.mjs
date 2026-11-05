#!/usr/bin/env node
/* ★★[SEAM_BG 2026-11-05 이음매 명세 BGM 몫 · 대본 검토 · 기준 main 3c2043a8] 항목마다 T 조건 — 깨 보기(옛 판 빨강) → 고친 뒤 초록 → 정상 대조
   BG08 음악값 0 을 무음으로 오인하지 않는다 — lpShow · lpLevel 의 크기 비교 기본값은 유한한 숫자 그대로(0 dB 정상) · 없거나 NaN 만 −90
     T01 0 → −12 내림 400ms · −8 → −12 내림 · −20 → −12 올림 1200ms   T02 lpLevel 0 → −20 은 조절함 · −90 / −60 은 조절 안 함 · 0 → 0 은 무음 아님
     T03 미지정 · null · NaN = −90(조절 안 함)
   ONLY=BG08,… 로 항목만 · BP_BED · BP_OP · BP_CUE · BP_CON = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
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
try {
  const { ctx, f, errs } = await open(390, true);
  await f.waitForFunction(() => !!(window.ENG && ENG.RitualCue), null, { timeout: 15000 }).catch(() => {});
  if (want('BG08')) {
    await hold(f, 'welcome'); const f0 = await f.evaluate(() => BgmBed._t.BED.cur.f), P = await f.evaluate(() => BgmBed._t.PR());
    const a = await probe(f, 'show', { dk: -12 }, 0), b = await probe(f, 'show', { dk: -12 }, -8), c = await probe(f, 'show', { dk: -12 }, -20);
    ok(`BG08-T01 lpShow — 0 → −12 내림 ${P.down}ms · −8 → −12 내림 · −20 → −12 올림 ${P.up}ms (곡 그대로 ${f0})`, a.ms === P.down && b.ms === P.down && c.ms === P.up && [a, b, c].every((x) => x.f === f0 && x.want === -12), { a, b, c });
    const d = await probe(f, 'level', { talk: true, ldk: -20 }, 0), e = await probe(f, 'level', { talk: true, ldk: -20 }, -90), g = await probe(f, 'level', { talk: true, ldk: -20 }, -60), h = await probe(f, 'level', { talk: true, ldk: 0 }, 0);
    ok('BG08-T02 lpLevel — 0 → −20 조절함(내림) · −90 · −60 은 조절 안 함(무음 보호) · 0 → 0 은 무음으로 보지 않음', d.n === 1 && d.ms === P.down && d.want === -20 && e.n === 0 && g.n === 0 && h.n === 1 && h.want === 0, { d, e, g, h });
    const u = await probe(f, 'level', { talk: true, ldk: -20 }, 'undef'), nn = await probe(f, 'level', { talk: true, ldk: -20 }, null), na = await probe(f, 'level', { talk: true, ldk: -20 }, 'NaN');
    ok('BG08-T03 미지정 · null · NaN = −90(조절 안 함) · 곡 파일 그대로', u.n === 0 && nn.n === 0 && na.n === 0 && [u, nn, na].every((x) => x.f === f0), { u, nn, na });
    await f.evaluate(() => { try { lsStop(); } catch (e) {} });
  }
  ok('쪽 오류 0', !errs.length, errs.slice(0, 3));
  await ctx.close();
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); }
await br.close(); srv.close();
console.log(fail ? `SEAM BG FAIL ${fail}` : 'SEAM BG OK');
process.exit(fail ? 1 : 0);
