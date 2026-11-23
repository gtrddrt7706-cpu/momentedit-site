#!/usr/bin/env node
/* ★★[CARRY_SAME_1101 2026-11-01 사장님 «음악이 연달아 있으면 그냥 그 곡으로 이어서 가는 게 좋지 않아?»]
   a 차례(BgmPicks.order(S, 구간, 앞 곡)) — 앞 곡이 목록(3곡 · 목록 칸 fill)에 있으면 맨 앞 · 나머지 원래 차례 · 한 곡 칸은 다른 곡을 골랐으면 고른 곡 · 이어 온 fill 곡은 빼지 않는다 · 이어지지 않는 구간에서 고른 곡은 뺀다
   b 고객 화면 — 부모님께 인사 The Rose → 테이블 곡 줄 첫 줄 The Rose + 그 아래 «부모님께 인사에서 흐르던 곡이 그대로 이어져요»(12.5px · --sub) · «…에서도 고른 곡» 0
   c 한 곡 칸 — 고르지 않았는데 앞 곡을 이으면 그 곡 한 줄 + 같은 한 줄 + «바꾸기» · 다른 곡을 고르면 고른 곡(한 줄 없음)
   d 이어지지 않는 구간(화촉)에서 고른 곡이 테이블 목록에 있으면 건너뛴다(시험만 화촉 목록에 B13 을 넣는다)
   e 미리 듣기 — 부모님께 인사 → 테이블 이어 듣기 동안 같은 소리 그대로(다시 시작 0) · 뜸 = 이어지는 곡(3초)
   f 당일 콘솔 — 지금 흐르는 곡이 다음 구간 목록에 있으면 bedPlay 0 · 목록 맨 앞 · 고른 곡이 이긴다
   BP_PICKS · BP_BED · BP_OP · BP_CON = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
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
const SONG = {}; HAVE.forEach((k, i) => { SONG[k] = wav(20, 180 + i * 20).toString('base64'); });
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

const SHOT = process.env.SHOT || '';
const shot = async (f, W, n, sel) => { if (!SHOT) return; try { fs.mkdirSync(SHOT, { recursive: true }); await f.locator(sel).first().screenshot({ path: path.join(SHOT, `fill-${W}-${n}.png`) }); } catch {} };
const go = async (f, k) => { await f.evaluate((k) => mkGo(k), k); await wait(f, 700); };
/* ★[REF_WHO_FIRST_1123] 덕담 · 축사 기본 예시 = 고른 분이 첫 말하는 분 · 맞는 예시가 없으면 종전 기본 · 두 분이 직접 고른 예시는 그대로 */
const o = await open(390, true); const f = o.f;
const first = (k) => f.evaluate((k) => { const sets = _lRefSets(k); const c = _refCur(k, sets); return String((sets[c] && sets[c][0] || {}).who || ''); }, k);
const whoIn = (k) => f.evaluate((k) => { const sets = _lRefSets(k); const c = _refCur(k, sets); return (sets[c] || []).map((p) => p.who); }, k);
await f.evaluate(() => { S.on = S.on || {}; S.on.bless = 1; S.on.free = 1; S.free = 'speech'; S.ch = S.ch || {}; S.ch.free = 'speech'; LS.ref = {}; LS.refN = {}; });
{ await f.evaluate(() => { S.blessWho = 'gf'; }); const w = await first('bless'); ok('덕담 첫째 분 신랑 아버님 → 기본 예시 첫 말하는 분 신랑 아버지(섬세 · 신부 아버지 예시가 아니다)', w === '신랑 아버지', w); }
for (const [code, want] of [['gm', '신랑 어머니'], ['bm', '신부 어머니']]) { await f.evaluate((c) => { S.blessWho = c; }, code); const w = await whoIn('bless'); ok('덕담 첫째 분 ' + code + ' → 기본 예시에 ' + want + ' 몫이 들어 있다', w.indexOf(want) > -1, w); }
await f.evaluate(() => { S.blessWho = 'bf'; LS.ref = { bless: 2 }; LS.refN = {}; });
const kept = await f.evaluate(() => _refCur('bless', _lRefSets('bless')));
ok('두 분이 직접 고른 덕담 예시(LS.ref)는 그대로', kept === 2, kept);
const fk = await f.evaluate(() => { try { return RitualOpen.FREE_KIND[RitualOpen.chipOf('free', S)]; } catch (e) { return 'err'; } });
ok('축사 갈래를 켰다(시험 준비)', fk === 'speech', fk);
if (fk === 'speech') {
  await f.evaluate(() => { LS.ref = {}; LS.refN = {}; S.speechWho = 'gfr'; }); const a = await first('free'); ok('축사 신랑 친구 → 신랑 친구 예시', a === '신랑 친구', a);
  await f.evaluate(() => { S.speechWho = 'bfr'; }); const b = await first('free'); ok('축사 신부 친구 → 신부 친구 예시', b === '신부 친구', b);
  await f.evaluate(() => { S.speechWho = 'cfr'; }); const c = await first('free'); ok('축사 맞는 예시 없음(두 사람 친구) → 종전 기본 표 4(신부 친구)', c === '신부 친구', c);
}
await o.ctx.close(); await br.close(); srv.close();
console.log(fail ? 'REF WHO FIRST FAIL ' + fail : 'REF WHO FIRST OK'); process.exit(fail ? 1 : 0);
