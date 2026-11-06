#!/usr/bin/env node
/* ★[B5_PRACTICE 2026-11-06 5차 P v2] 연습 회귀 — NI08 편지 두 분 따로 시간 몫 한 번 · NI11 머리 «본식 뒤» · P01 · P14 A 복귀 8초 · 본인 축가 3초 · 글 A/B
   NI14 A 짧은 잔여(0 · 200 · 300ms) 재시작 금지 · P17 멈춤 중 음악 켜기는 설정만 · P-N02 이어서 연습 자리 계정마다 · P-N03 역할 복사 실패 창
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const OP = process.env.PW_OP || '', BED = process.env.PW_BED || '', EMF = process.env.BP_EM || '', SHOT = process.env.SHOT || '', PICKSF = process.env.BP_PICKS || '';
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 600)}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
function wav(sec, f, sr = 16000) { const n = Math.round(sr * sec), b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(f ? 8000 * Math.sin(2 * Math.PI * f * i / sr) : 0), 44 + i * 2); return b; }
const SHORT = wav(2, 330);   /* 나레이션 대신 — 12초(긴 멘트)   /* 나레이션 대신 — 0.6초 */
const RL = [{ k: 'r5', name: '경쾌하게', t: '시험 입장 곡', a: '시험 가수', hook: 40, hook0: 40, len: 140, file: 'r5.mp3', img: '/assets/home/snap.webp', pos: '50% 50%' },
  { k: 'r1', name: '잔잔하게', t: '짧은 판 곡', a: '시험 가수', hook: 40, hook0: 40, len: 70, file: 'r1.mp3', pf: 'r1p.mp3', p0: 10, p1: 70, hooks: [40], img: '/assets/home/snap.webp', pos: '50% 50%' },
  { k: 'r7', name: '짧게', t: '아주 짧은 판 곡', a: '시험 가수', hook: 40, hook0: 40, len: 70, file: 'r7.mp3', pf: 'r7p.mp3', p0: 30, p1: 55, hooks: [40], img: '/assets/home/snap.webp', pos: '50% 50%' }];
const HAVE = ['B01', 'B07', 'B09', 'B10', 'B15', 'B16', 'B17', 'B24', 'B28'];   /* 화촉 B05 · B31 은 없다(①) */
const SONG = {}; HAVE.forEach((k, i) => { SONG[k] = wav(12, 180 + i * 20).toString('base64'); });
const RS = { r5: wav(140, 250).toString('base64'), 'r1-p': wav(60, 300).toString('base64'), r1: wav(70, 300).toString('base64'), 'r7-p': wav(25, 320).toString('base64'), r7: wav(70, 320).toString('base64') };
const HARNESS = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><iframe id="fr" style="width:100vw;height:100vh;border:0;display:block"></iframe>
<script>
window.H={dly:{},rl:${JSON.stringify(RL)},rs:${JSON.stringify(RS)},log:[],draft:null,saved:null,delay:40,have:${JSON.stringify(HAVE)},songs:${JSON.stringify(SONG)}};
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
        back({type:'momentedit:ritualFileData',key:'bed',id:g.id,ok:true,mime:'audio/wav',data:H.songs[g.id]}); }, H.dly[g.id]!=null?H.dly[g.id]:H.delay); return; }
    back({type:'momentedit:ritualFileData',key:g.key,id:g.id,ok:false,error:'파일을 불러오지 못했어요 (코드 L6)',ecode:'L6'}); return; }
});
</script>`;
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/__harness.html') { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(HARNESS); return; }
  if (/^\/assets\/audio\/narration\/.+\.mp3$/.test(u)) { r.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': SHORT.length }); r.end(SHORT); return; }   /* 길이를 실어 보낸다(실제 사이트와 같게 · 없으면 브라우저가 길이를 모른다) */
  const p = (OP && u === '/order-preview.html') ? OP : (BED && u === '/assets/bgm-bed.js') ? BED : (EMF && u === '/assets/entry-music.js') ? EMF : (PICKSF && u === '/assets/bgm-picks.js') ? PICKSF : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const wait = (f, ms) => f.waitForTimeout(ms);
const ALL = ['prevideo', 'candle', 'welcome', 'vow', 'ring', 'declare', 'free', 'letter', 'tribute', 'toast', 'table'];
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

const W = (f, ms) => f.waitForTimeout(ms);
const toPr = (f) => f.evaluate(async () => { idx = STEPS.findIndex((x) => x.k === 'practice'); render(); await new Promise((x) => setTimeout(x, 700)); });
try {
  { const { ctx, f } = await open(1280, true); await toPr(f);
    /* NI08 — 신부만 있는 부모님께 편지 예시 + 두 분 따로 준비: 합이 그 순간 몫 한 번 · 신랑 → 신부 */
    const n8 = await f.evaluate(() => { RitualOpen.setChip(S, 'letter', 'parent'); S.mkc = S.mkc || {}; S.mkc['letter.g'] = 1; S.mkc['letter.b'] = 1; const sets = _lRefSets('letter'), n = sets.findIndex((s) => s.length === 1 && s[0].who === '신부');
      LS.ref = LS.ref || {}; LS.ref.letter = n; LS.refN = {}; const q = _prQ(['letter']).filter((x) => x.talk2), hs = (RitualOpen.partsOf('letter', S) || [])[1];
      const r = { n, hs, who: q.map((x) => x.who).join('>'), sum: q.reduce((a, x) => a + x.ms, 0) }; S.mkc['letter.g'] = 0; S.mkc['letter.b'] = 0; return r; });
    ok('NI08 편지 두 분 따로 — 신랑 > 신부 · 합 = 그 순간 몫 한 번(각 몫 × 2 아님) [B5_NI08]', n8.n > -1 && n8.who === '신랑>신부' && Math.abs(n8.sum - n8.hs * 1000) <= 2, n8);
    /* P01 · P14 */
    const p1 = await f.evaluate(() => { S.on.song = 1; S.songBy = 'self'; S.on.tribute = 1; try { opSync(); } catch (e) {} buildSteps(); idx = STEPS.findIndex((x) => x.k === 'practice'); const o = {};
      for (const w of ['flow', 'try']) { PRW = w; const q = _prQ(_lRows()); const sg = q.find((x) => x.aid === 'narr-song:self'), tb = q.find((x) => x.act && /^tribute-out/.test(x.of || ''));
        o[w] = { sg: sg && [sg.ms, sg.txt, _prWait(sg)], tb: tb && [tb.ms, _prWait(tb)] }; } PRW = 'flow'; return o; });
    ok('P01 · P14 A — 부모님께 인사 뒤 복귀 8초 · 본인 축가 3초 · A 글 [B5_P01]', p1.flow.sg && p1.flow.sg[0] === 3000 && p1.flow.sg[1] === '직접 부르는 차례예요 · 흐름 보기에서는 짧게 넘겨요.' && !p1.flow.sg[2] && p1.flow.tb && p1.flow.tb[0] === 8000 && !p1.flow.tb[1], p1);
    ok('P14 B — 본인 축가 · 복귀 둘 다 «다 했어요»까지 · B 글 [B5_P14]', p1.try.sg && p1.try.sg[1] === '직접 부르는 차례예요. 시작과 끝 인사를 연습해 보세요.' && p1.try.sg[2] && p1.try.tb && p1.try.tb[1], p1);
    await ctx.close(); }
  { const { ctx, f } = await open(1280, true); await toPr(f);
    /* NI11 */
    const n11 = await f.evaluate(async () => { prStart('flow'); await new Promise((x) => setTimeout(x, 1200)); const o = [];
      for (let i = 0; i < LP.q.length; i++) { if (LP.q[i].seg !== '_after') continue; LP.i = i; LP.paused = true; clearTimeout(LP.t); _lFull(); o.push((document.querySelector('.lf-listb,.lf-mode') || {}).textContent || ''); } lsStop(true); return o; });
    ok('NI11 본식 뒤 세 줄 — 머리 «본식 뒤 · 예식 순서»(9 / 9 아님) [B5_NI11]', n11.length >= 3 && n11.every((t) => /^본식 뒤 · 예식 순서/.test(t)), n11);
    /* NI14 */
    const n14 = {}; for (const left of [0, 200, 300, 1000]) n14[left] = await f.evaluate(async (left) => { const w = (ms) => new Promise((x) => setTimeout(x, ms)); lsStop(true); prStart('flow'); await w(900);
      const ti = LP.q.findIndex((x) => x.k === 'matjeol' && x.act); LP.i = ti; clearTimeout(LP.t); LP.tAt = 0; _lShow(); let n = 0; while (n++ < 60 && !(LP.tAt && LP.i === ti)) await w(100);
      clearTimeout(LP.t); LP.tAt = Date.now() - (LP.tMs - left); lsToggle(); await w(30); lsToggle(); const rem = LP.tAt ? LP.tMs - (Date.now() - LP.tAt) : -1, i1 = LP.i; await w(left + 700); return { ti, i1, rem, i2: LP.i }; }, left);
    ok('NI14 A 재개 — 남은 0ms 는 다음 줄 · 200 · 300 · 1000ms 는 그만큼만(줄 전체 8초를 다시 세지 않는다) [B5_NI14]', n14[0].i2 === n14[0].ti + 1 && [200, 300, 1000].every((l) => n14[l].i1 === n14[l].ti && n14[l].rem <= l && n14[l].i2 === n14[l].ti + 1), n14);
    /* P17 */
    const p17 = await f.evaluate(async () => { const B = BgmBed._t, w = (ms) => new Promise((x) => setTimeout(x, ms)), on = () => !!(B.BED.cur && B.BED.cur.src); lsStop(true);
      prStart('flow'); let t = 0; while (t < 20000 && !(on() && B.BED.cur.want > -60)) { await w(200); t += 200; } const o = { start: on() };
      lsToggle(); await w(800); prMusicTgl(); await w(200); const tr = []; prMusicTgl(); for (let k = 0; k < 6; k++) { tr.push(on()); await w(100); } o.pauseOn = tr; lsToggle(); await w(1500); o.resumed = on(); lsStop(true); return o; });
    ok('P17 멈춤 중 음악 켜기는 곡을 틀지 않는다 · 이어 하면 지금 줄 곡으로 [B5_P17]', p17.start && p17.pauseOn.every((x) => !x) && p17.resumed, p17);
    /* P-N02 */
    const n02 = await f.evaluate(async () => { const w = (ms) => new Promise((x) => setTimeout(x, ms)); prStart('flow'); await w(900); const j = LP.q.findIndex((x) => x.k === 'vow' && x.talk2); LP.i = j; LP.paused = false; _lShow(); await w(300); LP.paused = true; clearTimeout(LP.t);
      const a0 = _ACCT, o = { key: _prAtKey(), mine: !!_prAtGet() }; _ACCT = 'OTHER1'; o.other = !!_prAtGet(); _ACCT = ''; o.unknown = !!_prAtGet(); o.noKey = _prAtKey() === ''; _ACCT = a0; lsStop(true); return o; });
    ok('P-N02 이어서 연습 자리 — 계정마다 칸 · 다른 계정 · 미확인은 못 읽는다 [B5_PN02]', n02.key === 'me_pr_at_TEST01' && n02.mine && !n02.other && !n02.unknown && n02.noKey, n02);
    await ctx.close(); }
  { const { ctx, f } = await open(390, true); await toPr(f);
    const n03 = await f.evaluate(async () => { const id = _prRoles()[0].id, ts = []; const T = window.toast; window.toast = function (m) { ts.push(m); return T.apply(this, arguments); };
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('denied')) } }); prRole(id); await new Promise((x) => setTimeout(x, 300));
      const d = document.getElementById('mkRecDlg'), ta = d && d.querySelector('textarea.role-copy'), inp = d && d.querySelector('input.role-copy');
      return { ts, note: d && (d.querySelector('[role=alert]') || {}).textContent, ta: ta ? ta.value.length : 0, link: inp ? /\/role\.html#r=/.test(inp.value) : false }; });
    ok('P-N03 역할 복사 실패 — 고를 수 있는 글 · 링크 창 · 성공 알림 없음 [B5_PN03]', n03.note === '복사하지 못했어요. 아래 글을 길게 눌러 복사해 주세요.' && n03.ta > 50 && n03.link && !n03.ts.some((t) => /복사했어요/.test(t)), n03);
    await ctx.close(); }
} catch (e) { console.log('못 쟀다 — ' + (e && e.message)); await br.close(); srv.close(); process.exit(2); }
await br.close(); srv.close();
console.log(fail ? `B5 PRACTICE FAIL ${fail}` : 'B5 PRACTICE OK'); process.exit(fail ? 1 : 0);
