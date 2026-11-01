#!/usr/bin/env node
/* ★[SONG_ROW_PLAIN_1101 2026-11-01 사장님 «제목 가수만 나오면 될 거 같아» · 축배 음악 목록 사진] 고객 화면 구간 곡 줄 = 제목 + 가수(연주자) 둘뿐
   a 펼친 목록 · 접힌 한 줄 · 축사 · 편지 «음악과 함께» 아래 곡 고르기 — 줄 글이 제목 + 가수뿐 · 판(src) · 분위기(why) · «노래» 0 (390 · 1280)
   b 가사 있는 곡을 고르면 아래 «가사가 있는 곡이라 안내 말씀 때는 더 작게 깔려요» 한 줄
   BP_BED · BP_OP = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const OP = process.env.BP_OP || '', BED = process.env.BP_BED || '', SLOTS = process.env.BP_SLOTS || '', CON = process.env.BP_CON || '', CUE = process.env.BP_CUE || '';
const O = require(path.join(ROOT, 'assets/ritual-open.js')); require(path.join(ROOT, 'assets/ritual-data.js')); const C = require(CUE || path.join(ROOT, 'assets/ritual-cue.js'));
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 600)}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
function wav(sec, f, sr = 16000) { const n = Math.round(sr * sec), b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(f ? 8000 * Math.sin(2 * Math.PI * f * i / sr) : 0), 44 + i * 2); return b; }
const SHORT = wav(0.6, 330);   /* 나레이션 대신 — 0.6초 */
/* 드라이브에 있는 곡(시험) — B30(화촉 3) · 테이블 인사 2 · 3(B23 · B16)은 없다 */
const RL = [{ k: 'r5', name: '경쾌하게', t: '시험 입장 곡', a: '시험 가수', hook: 40, hook0: 40, len: 140, file: 'r5.mp3', img: '/assets/home/snap.webp', pos: '50% 50%' },
  { k: 'r1', name: '잔잔하게', t: '짧은 판 곡', a: '시험 가수', hook: 40, hook0: 40, len: 70, file: 'r1.mp3', pf: 'r1p.mp3', p0: 10, p1: 70, hooks: [40], img: '/assets/home/snap.webp', pos: '50% 50%' }];
const HAVE = ['B01', 'B05', 'B07', 'B09', 'B10', 'B11', 'B12', 'B13', 'B15', 'B17', 'B20', 'B24', 'B28'];   /* [BGM_TIMING_1101] 테이블 인사 곡도 — 축배 뜸 곡 e · ★[PICKS_THREE_1101] 구간마다 3곡 — 테이블 1순위 B24 · 뺀 곡 대신 B07 · B11 · B20 */
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
  const p = (OP && u === '/order-preview.html') ? OP : (BED && u === '/assets/bgm-bed.js') ? BED : (SLOTS && u === '/assets/bgm-slots.js') ? SLOTS : (CUE && u === '/assets/ritual-cue.js') ? CUE : (CON && u === '/console.html') ? CON : path.join(ROOT, u);
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
const go = async (f, k) => { await f.evaluate((k) => mkGo(k), k); await wait(f, 700); };
const rows = (f) => f.evaluate(() => { const P = BgmPicks.SONGS, o = [];
  document.querySelectorAll('.ls-bed[data-seg], .bed-sub[data-seg]').forEach((box) => { const sg = box.getAttribute('data-seg');
    box.querySelectorAll('.mu-pick, .mu-fsel').forEach((el) => { const pk = el.getAttribute('data-fk') || '', m = /^bed:[^:]+:(.+)$/.exec(pk), t = (el.querySelector('.mu-t') || {}).textContent || '', a = (el.querySelector('.mu-a') || {}).textContent || '';
      const f0 = m ? m[1] : (Object.keys(P).find((k) => P[k].t === t.trim()) || ''), s = P[f0] || {};
      o.push({ sg, f: f0, kind: el.classList.contains('mu-fsel') ? 'fold' : 'list', t: t.trim(), a: a.trim(), all: el.textContent.replace(/\s+/g, ' ').trim(), want: { t: s.t, a: s.a, why: s.why, src: s.src, v: s.v } }); }); });
  return o; });
try {
  for (const W of [390, 1280]) {
    const { ctx, pg, f, errs } = await open(W, true);
    await f.evaluate(() => { S.freeWhat = 'speech'; S.bgm = { S5: { m: 'bed' }, S6: { m: 'bed' } }; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); });
    const all = [], seen = new Set();
    for (const k of ['guest', 'candle', 'welcome', 'free', 'letter', 'song', 'tribute', 'toast', 'table']) { await go(f, k);
      await f.evaluate(() => { document.querySelectorAll('.ls-bed .mu-chg[aria-expanded="false"]').forEach((b) => b.click()); }); await wait(f, 250);   /* 펼친 목록 */
      (await rows(f)).forEach((r) => { all.push(Object.assign({ k }, r)); seen.add(r.sg); });
      const fp = await f.evaluate(() => { const p = document.querySelector('.ls-bed .mu-pick'); if (p) p.click(); return !!p; }); await wait(f, 300);   /* 하나 고르면 접힌 한 줄 */
      if (fp) (await rows(f)).filter((r) => r.kind === 'fold').forEach((r) => all.push(Object.assign({ k }, r))); }
    const bad = all.filter((r) => !r.want.t || r.t !== r.want.t || r.a !== (r.want.a || '') || /노래/.test(r.t) || (r.want.why && r.all.indexOf(r.want.why) > -1) || (r.want.src && r.all.indexOf(r.want.src) > -1));
    ok(`${W} a 곡 줄 ${all.length}개(구간 ${[...seen].join(' · ')}) — 글 = 제목 + 가수뿐 · 판 · 분위기 · «노래» 0`, all.length > 20 && seen.has('M4S5') && seen.has('M4S6') && all.some((r) => r.kind === 'fold') && !bad.length, { bad: bad.slice(0, 3), n: all.length, segs: [...seen] });
    /* b 가사 있는 곡(★[PICKS_THREE_1101] 하객 맞이에 가사 곡이 없어져 귀가 인사 Popcorn B20) */
    { await go(f, '_close'); await f.evaluate(() => { const b = document.querySelector('.ls-bed[data-seg="M6"] .mu-chg[aria-expanded="false"]'); if (b) b.click(); }); await wait(f, 250);
      await f.click('[data-fk="bed:M6:B20"]'); await wait(f, 300);
      await f.evaluate(() => { const b = document.querySelector('.ls-bed[data-seg="M6"] .mu-chg[aria-expanded="false"]'); if (b) b.click(); }); await wait(f, 250);
      const vl = await f.evaluate(() => { const v = document.querySelector('.ls-bed[data-seg="M6"] .bed-voc'); return v && v.offsetParent ? v.textContent.trim() : ''; }), voc = !!(await f.evaluate(() => BgmPicks.SONGS.B20 && BgmPicks.SONGS.B20.vocal));
      ok(`${W} b 가사 있는 곡(B20)을 고르면 아래 «가사가 있는 곡이라 안내 말씀 때는 더 작게 깔려요»`, voc && vl === '가사가 있는 곡이라 안내 말씀 때는 더 작게 깔려요', { voc, vl }); }
    ok(`${W} 쪽 오류 0`, !errs.length, errs.slice(0, 3));
    await ctx.close();
  }
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 500)); }
await br.close(); srv.close();
console.log(fail ? `SONG ROW PLAIN FAIL ${fail}` : 'SONG ROW PLAIN OK');
process.exit(fail ? 1 : 0);
