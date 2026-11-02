/* [SCREEN_SOUND_1102] 소리가 나면 화면에 쓰여 있고, 화면에 없으면 소리도 없다 — 순간마다
   ① 순간 하나만 들을 때 음악이 들리면 그 순간 쪽에 음악 줄이 있다(없으면 소리도 없다)
   ② 본식 목록(M4) 순간 — 화면 «이 순서 즈음엔 ‹곡명›» == 실제로 흐르는 곡 · 서약 · 반지 · 선언 · 덕담이 모두 같은 곡으로 시작하지 않는다(당일 시간표 곡)
   ③ 축가 · 성혼 선언 · 닫는 인사(촬영 후 마지막 곡) 화면 글
   BP_OP · BP_BED · BP_SLOTS = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
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
const HAVE = ['B01', 'B07', 'B09', 'B10', 'B11', 'B12', 'B13', 'B15', 'B16', 'B17', 'B24', 'B28', 'B32'];   /* [MEANING_R1_1102 16] 마지막 곡(M8L 1순위 B32) */   /* 화촉 1 · 2(B05 · B31)는 없다 — d */   /* [BGM_TIMING_1101] 테이블 인사 곡(B23)도 — 축배 뜸 곡 e */
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


const BgmPicks = require(PICKSF || path.join(ROOT, 'assets/bgm-picks.js'));
const go = async (f, k) => { await f.evaluate((k) => mkGo(k), k); await wait(f, 700); };
const listen = (f, ks, ms) => f.evaluate(async ({ ks, ms }) => { const BB = BgmBed._t, o = []; window._lpMs = function () { return 800; };
  LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(ks, true); _lFull();
  (LP.q || []).forEach((x) => { if (x.talk || x.talk2 || x.said || x.act || x.quiet) x.ms = 800; });
  const t0 = performance.now(); await new Promise((res) => { const iv = setInterval(() => { const v = BB.BED.cur, st = LP.q[LP.i] || {};
    o.push({ t: performance.now() - t0, k: st.k, f: v && v.f, want: v && v.src ? v.want : -90, on: !!(v && v.src && v.want > -60) });
    if (performance.now() - t0 > ms || !LP.q.length || LP.i >= LP.q.length) { clearInterval(iv); res(); } }, 100); });
  try { lsStop(); } catch (x) {} try { lsCloseBig(); } catch (x) {} return o; }, { ks, ms });
const lineOf = (f) => f.evaluate(() => [...document.querySelectorAll('.mk-flow li[data-bgm], .ls-bed, .ls-bgm')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()));
try {
  const { ctx, f, errs } = await open(390, true);
  await f.evaluate(() => { ['prevideo', 'candle', 'welcome', 'vow', 'ring', 'declare', 'bless', 'free', 'letter', 'song', 'tribute', 'toast', 'table'].forEach((k) => { S.on[k] = 1; }); S.freeWhat = 'speech'; S.song = 'family'; S.songBy = 'friend'; S.bgm = {}; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); });
  const KS = ['prevideo', 'candle', 'welcome', 'vow', 'ring', 'declare', 'bless', 'free', 'letter', 'song', 'tribute', 'table', '_close'];
  const res = {}, first = {}, names = {};
  for (const k of KS) { await go(f, k); const L = await lineOf(f); const r = await listen(f, [k], k === 'song' || k === 'table' || k === '_close' ? 30000 : 25000); const on = r.filter((x) => x.on && x.k === k);
    res[k] = { line: L.length, snd: on.length > 2 }; first[k] = (on[0] || {}).f || ''; const m = L.join(' ').match(/이 순서 즈음엔 ‹([^›]+)›/); names[k] = m ? m[1] : ''; if (k === '_close') names._last = (L.join(' ').match(/마지막 곡 ‹([^›]+)›/) || [])[1] || ''; if (k === 'song' || k === 'declare') names['t_' + k] = L.join(' '); }
  const bad1 = KS.filter((k) => res[k].snd && !res[k].line), bad1b = KS.filter((k) => !res[k].line && res[k].snd);
  ok('① 순간 하나만 들을 때 음악이 들리면 그 쪽에 음악 줄이 있다', !bad1.length && !bad1b.length, { bad: bad1, res });
  const T = (x) => { const p = BgmPicks.byF ? BgmPicks.byF(x) : null; return p ? p.t : ''; };
  const M4 = ['vow', 'ring', 'bless'], mis = M4.filter((k) => !names[k] || names[k] !== T(first[k]));
  ok('② 본식 순간 — 화면 «이 순서 즈음엔 ‹곡명›» == 실제로 흐르는 곡', !mis.length, M4.map((k) => [k, names[k], first[k], T(first[k])]));
  const fs4 = ['welcome', 'vow', 'ring', 'declare', 'bless'].map((k) => first[k]).filter(Boolean);
  ok('② 서약 · 반지 · 선언 · 덕담 · 감사 인사가 모두 같은 곡으로 시작하지 않는다(당일 시간표 곡)', fs4.length >= 4 && new Set(fs4).size > 1, fs4);
  ok('③ 축가 화면 글 — «여는 말과 박수 때는 피아노가 작게 이어지고, 노래하는 동안은 보내 주신 MR 만 흘러요»', /여는 말과 박수 때는 피아노가 작게 이어지고, 노래하는 동안은 보내 주신 MR 만 흘러요/.test(names.t_song || ''), (names.t_song || '').slice(0, 120));
  ok('③ 성혼 선언 화면 글 — «선언문을 읽는 동안은 음악 없이, 축하 박수부터 음악이 이어져요»', /선언문을 읽는 동안은 음악 없이, 축하 박수부터 음악이 이어져요/.test(names.t_declare || ''), (names.t_declare || '').slice(0, 120));
  const m8 = (BgmPicks.PICKS.M8L || []).find((x) => HAVE.includes(x)) || '';
  ok('③ 닫는 인사 — «촬영 후 안내부터 마지막 곡 ‹곡명›이 흘러요»(실제 마지막 곡)', !!names._last && names._last === T(m8), { screen: names._last, f: m8, t: T(m8) });
  /* ④ [SILENT_STAY_1102] 하객 맞이 → 식전 영상 → 화촉 이어 듣기 — 영상 · 화촉 동안 하객 맞이 곡(B01)이 되살아나지 않는다(want 최댓값 ≤ −60) */
  await go(f, 'guest'); const rr = await listen(f, ['guest', 'prevideo', 'candle'], 150000);
  const b1 = rr.filter((x) => x.f === 'B01' && (x.k === 'prevideo' || x.k === 'candle')), mx = b1.length ? Math.max(...b1.map((x) => x.want)) : -90, kc = rr.some((x) => x.k === 'candle' && x.on);
  ok('④ 식전 영상 → 화촉 사이 하객 맞이 곡(B01) want 최댓값 ≤ −60 · 화촉 곡은 흐른다', mx <= -60 && kc, { mx, n: b1.length, kc, fs: [...new Set(rr.filter((x) => x.k === 'candle' && x.on).map((x) => x.f))] });
  ok('쪽 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close();
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 500)); }
await br.close(); srv.close();
console.log(fail ? `SCREEN BGM FAIL ${fail}` : 'SCREEN BGM OK');
process.exit(fail ? 1 : 0);
