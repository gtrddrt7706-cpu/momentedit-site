/* [TURN_GAP_1102] 줄 사이 쉼 · 행동 줄 머무는 시간 — 사장님 확정 값(미리 듣기 / 연습)
   쉼: 같은 순간 1.6 / 1.6 · 제목 바뀜 2.5 · 몇 분 떨어짐 6 · 순간 바뀜 2.2 · 말 → 행동 0.8 · 행동 끝 → 말 1.2 · 마음이 움직이는 행동 → 말 2.2 · 안내 → 두 분 2.0 / 3.0 · 두 분 끝 → 받는 말 1.4 / 2.2
   머무는 시간: 맞절 5 / 8 · 목례 박수 6 / 8 · 부모님께 인사 6 / 8 · 포옹 6 / 8 · 반지 6 / 8 · 촛불 6 / 6 · 이동 6 / 8 · 테이블 8 / 8 · 박수(선언 · 축가) 6 / 6 · 박수(덕담 · 축사) 5 / 5 · 그 밖 5 / 6
   BP_OP = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
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
const HAVE = ['B01', 'B07', 'B09', 'B10', 'B12', 'B13', 'B15', 'B16', 'B17', 'B24', 'B28', 'B32'];   /* [MEANING_R1_1102 16] 마지막 곡(M8L 1순위 B32) */   /* 화촉 1 · 2(B05 · B31)는 없다 — d */   /* [BGM_TIMING_1101] 테이블 인사 곡(B23)도 — 축배 뜸 곡 e */
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


try {
  const { ctx, f, errs } = await open(390, true);
  const r = await f.evaluate(() => { const o = {}; if (typeof _turn !== 'function' || typeof _dwellMs !== 'function') return null;
    ['same', 'title', 'mins', 'moment', 'toAct', 'actEnd', 'actEmo', 'toCouple', 'coupleEnd'].forEach((n) => { LP.prc = false; const a = _turn(n); LP.prc = true; const b = _turn(n); o[n] = [a, b]; }); LP.prc = false;
    const rows = { matjeol: { k: 'matjeol', of: 'narr-entry-bow' }, bow: { k: '_close', of: 'narr-close-bow' }, call: { k: 'tribute', of: 'tribute-call-say' }, hug: { k: 'tribute', of: 'tribute-hug' }, ring: { k: 'ring', of: 'narr-ring-in' },
      candle: { k: 'candle', of: 'narr-candle-in-mothers' }, move: { k: 'tribute', of: 'tribute-in' }, table: { k: 'table', of: 'narr-table-in' }, clapBig: { k: 'declare', txt: '하객 박수' }, clapSmall: { k: 'bless', txt: '하객 박수' }, def: { k: 'vow', txt: '말없이' } };
    o.dw = {}; Object.keys(rows).forEach((n) => { o.dw[n] = [_dwellMs(rows[n], false), _dwellMs(rows[n], true)]; }); return o; });
  const WANT = { same: [1600, 1600], title: [2500, 2500], mins: [6000, 6000], moment: [2200, 2200], toAct: [800, 800], actEnd: [1200, 1200], actEmo: [2200, 2200], toCouple: [2000, 3000], coupleEnd: [1400, 2200] };
  const DW = { matjeol: [5, 8], bow: [6, 8], call: [6, 8], hug: [6, 8], ring: [6, 8], candle: [6, 6], move: [6, 8], table: [8, 8], clapBig: [6, 6], clapSmall: [5, 5], def: [5, 6] };
  ok('쉼 표 — 미리 듣기 / 연습 확정 값', !!r && Object.keys(WANT).every((n) => r[n] && r[n][0] === WANT[n][0] && r[n][1] === WANT[n][1]), r && Object.keys(WANT).filter((n) => !r[n] || r[n].join() !== WANT[n].join()).map((n) => [n, r[n]]));
  ok('머무는 시간 표 — 미리 듣기 / 연습 확정 값(연습이 2초 하나가 아니다)', !!r && Object.keys(DW).every((n) => r.dw[n][0] === DW[n][0] * 1000 && r.dw[n][1] === DW[n][1] * 1000), r && Object.keys(DW).filter((n) => r.dw[n].join() !== DW[n].map((x) => x * 1000).join()).map((n) => [n, r.dw[n]]));
  /* 실제 차례 — 미리 듣기 · 연습 큐의 행동 줄 ms 가 표를 읽는다 */
  const q = await f.evaluate(() => { const ks = ['matjeol', 'tribute', 'table']; const st = _lSteps(ENG, ks).filter((x) => x.quiet && x.txt); return st.map((x) => [x.k, x.of, _dwellMs(x, false), _dwellMs(x, true)]); });
  ok('행동 줄(맞절 · 부모님께 인사 · 테이블)이 표 값을 받는다', q.length >= 2 && q.every((x) => x[2] >= 5000 && x[3] >= 6000), q.slice(0, 6));
  /* 줄 사이 쉼을 정하는 곳(_lNext)과 차례를 만드는 곳(lsPlay · go)이 표를 읽는다 — 미리 듣기 · 연습 둘 다 */
  const w = await f.evaluate(() => { const n = String(_lNext), g = String(_lStart);
    return { n: ['same', 'moment', 'toAct', 'actEnd', 'actEmo', 'toCouple', 'coupleEnd'].filter((x) => n.indexOf("_turn('" + x + "')") < 0), prc: /LP\.pace\|\|LP\.prc/.test(n), dw: (g.match(/_dwellMs\(x,(true|false)\)/g) || []).length, prcSet: /LP\.prc=_prc/.test(g) }; });
  ok('쉼 · 머무는 시간 표를 실제 차례가 읽는다(미리 듣기 · 연습 · 같은 표)', !!w && !w.n.length && w.prc && w.dw === 2 && w.prcSet, w);
  ok('쪽 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close();
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 500)); }
await br.close(); srv.close();
console.log(fail ? `TURN TABLE FAIL ${fail}` : 'TURN TABLE OK');
process.exit(fail ? 1 : 0);
