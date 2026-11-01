#!/usr/bin/env node
/* ★★[PREVIEW_LINK_SONGS_1101 2026-11-01 BGM 섹션] «음악까지 미리듣기» · 마이페이지 «연습 · 준비» — 두 분이 고른 구간 곡이 흐른다(예시 한 곡이 아니다)
   a 링크(RitualPreviewLink.url)가 구간 곡 선택(S.bgm · 곡 번호만)을 싣고 콘솔이 같은 값을 읽는다
   b 미리듣기(preview) 재생 — 화촉 B31 · 부모님께 인사 B16(PREVIEW_BED 아님) · 이어지는 테이블은 같은 곡 다시 시작 0
   c 식순 화면 안에서 연 판(openRitualPreview · 식순 화면이 마이페이지로 곡을 받아 잇는다)도 b 와 같다 · 마이페이지 «연습 · 준비» 판은 같은 중계(정적)
   d 곡 하나(화촉 B31)를 못 받으면 그 구간만 예시 음악 + «곡을 불러오지 못해 예시 음악이 흘러요» · 다른 구간은 고른 곡
   e 옛 링크(bgm 값 없음) → 기본곡 계획(화촉 1순위 B05 · 예시 한 곡이 아님)
   f 고지 줄 · 안내 글 세 곳에 «상담에서 함께 골라요» · «저희가 골라 준비» 가 남지 않는다
   BP_CON · BP_LINK · BP_OP = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const CON = process.env.BP_CON || '', LINK = process.env.BP_LINK || '', OP = process.env.BP_OP || '';
const O = require(path.join(ROOT, 'assets/ritual-open.js')); require(path.join(ROOT, 'assets/ritual-data.js')); const P = require(path.join(ROOT, 'assets/bgm-picks.js'));
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 700)}`); if (!c) fail++; };
function wav(sec, f, sr = 16000) { const n = Math.round(sr * sec), b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(f ? 8000 * Math.sin(2 * Math.PI * f * i / sr) : 0), 44 + i * 2); return b; }
const linkSrc = fs.readFileSync(LINK || path.join(ROOT, 'assets/ritual-preview-link.js'), 'utf8');
const W = { location: { origin: 'http://x' }, btoa: (s) => Buffer.from(s, 'binary').toString('base64'), unescape, encodeURIComponent }; W.window = W; vm.createContext(W); vm.runInContext(linkSrc, W);
const L = W.RitualPreviewLink;
const base = () => { const S = O.applyExample({ course: 'open' }, 'standard'); S.course = 'open'; S.on = Object.assign({}, S.on, { tribute: 1, table: 1, toast: 1 }); return S; };
const decodeS = (u) => { const q = new URL(u, 'http://x').searchParams.get('S'); return JSON.parse(decodeURIComponent(escape(Buffer.from(q, 'base64').toString('binary')))); };
/* a */
const SA = base(); SA.bgm = { M2: { k: 'B31' }, M5: { k: 'B16' }, S5: { m: 'bed' } };
const ua = L.url(SA, {}), sa = ua ? decodeS(ua) : null;
ok('a 링크가 화촉 B31 · 부모님께 인사 B16 · 축사 «음악과 함께»를 싣는다', !!sa && sa.bgm && sa.bgm.M2 && sa.bgm.M2.k === 'B31' && sa.bgm.M5 && sa.bgm.M5.k === 'B16' && sa.bgm.S5 && sa.bgm.S5.m === 'bed', sa && sa.bgm);
const SX = base(); SX.bgm = { M2: { k: 'M2_1' }, M4: { k: 'zzz' } }; const sx = decodeS(L.url(SX, {}));
ok('a 옛 «M2_1» 꼴 · 모르는 값은 싣지 않는다(고르지 않음)', !(sx.bgm && (sx.bgm.M2 || sx.bgm.M4)), sx.bgm);
/* f */
{ const files = { 'console.html': CON || path.join(ROOT, 'console.html'), 'assets/advisor-kb.js': path.join(ROOT, 'assets/advisor-kb.js'), 'api/_kb.js': path.join(ROOT, 'api/_kb.js'), 'api/_ritual-kb.js': path.join(ROOT, 'api/_ritual-kb.js') };
  const bad = Object.keys(files).filter((k) => /상담에서 함께 골라요|저희가 골라 준비/.test(fs.readFileSync(files[k], 'utf8')));
  const con = fs.readFileSync(files['console.html'], 'utf8');
  ok('f 고지 줄 «두 분이 고른 곡으로 흘러요 · 고르지 않은 칸은 저희가 정한 곡이에요» · 옛 문장(«상담에서 함께 골라요» · «저희가 골라 준비») 0 곳', !bad.length && con.indexOf('두 분이 고른 곡으로 흘러요 · 고르지 않은 칸은 저희가 정한 곡이에요') > -1, bad);
  const mp = fs.readFileSync(path.join(ROOT, 'mypage.html'), 'utf8'), m = mp.indexOf("fr.id='mp_rpFrame'"), seg = m > -1 ? mp.slice(m, m + 6000) : '';
  ok("c 마이페이지 «연습 · 준비» 판 — 미리듣기 창이 곡(bed) 받기를 두 분 계정으로 잇는다(ritualFileGet · key bed)", /momentedit:ritualFileGet/.test(seg) && /key:'bed'/.test(seg), null); }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(fail ? 1 : 2); }
const SONG = {}; const ALLF = new Set(); Object.values(P.PICKS).forEach((a) => a.forEach((f) => ALLF.add(f))); Object.values(P.FILL).forEach((a) => a.forEach((f) => ALLF.add(f)));
[...ALLF].forEach((f, i) => { SONG[f] = wav(14, 200 + i * 15).toString('base64'); });
const HARNESS = `<!doctype html><meta charset="utf-8"><body style="margin:0"><iframe id="fr" allow="autoplay" style="width:100vw;height:100vh;border:0"></iframe><script>
window.H={songs:${JSON.stringify(SONG)},gone:{},log:[],delay:60};
var fr=document.getElementById('fr'); window.go=function(u){ fr.src=u; };
window.addEventListener('message',function(ev){ var d=ev.data||{}; if(ev.origin!==location.origin||ev.source!==fr.contentWindow) return;
  if(d.type==='momentedit:orderReady'){ fr.contentWindow.postMessage({type:'momentedit:orderFill',draft:null,done:false,cust:{name:'시험',code:'TEST01'}}, location.origin); return; }
  if(d.type==='momentedit:ritualFileGet'&&d.data&&d.data.key==='bed'){ var g=d.data; H.log.push(g.id); setTimeout(function(){ if(g.id==='list'){ fr.contentWindow.postMessage({type:'momentedit:ritualFileData',key:'bed',id:'list',ok:true,songs:Object.keys(H.songs).map(function(f){ return {f:f}; })},location.origin); return; }
    if(!H.songs[g.id]||H.gone[g.id]){ fr.contentWindow.postMessage({type:'momentedit:ritualFileData',key:'bed',id:g.id,ok:false,error:'곡 파일을 찾을 수 없어요. (코드 L3)',ecode:'L3'},location.origin); return; }
    fr.contentWindow.postMessage({type:'momentedit:ritualFileData',key:'bed',id:g.id,ok:true,mime:'audio/wav',data:H.songs[g.id]},location.origin); }, H.delay); return; }
});</script>`;
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp4': 'video/mp4' };
const SHORT = wav(0.6, 330);
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/__h.html') { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(HARNESS); return; }
  if (/\.mp3$/.test(u)) { r.writeHead(200, { 'Content-Type': 'audio/wav' }); r.end(SHORT); return; }
  const p = (CON && u === '/console.html') ? CON : (LINK && u === '/assets/ritual-preview-link.js') ? LINK : (OP && u === '/order-preview.html') ? OP : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
async function page() { const ctx = await br.newContext({ viewport: { width: 390, height: 860 } }), pg = await ctx.newPage(), errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; });
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: '{"ok":true}' })));
  await pg.goto(`http://127.0.0.1:${port}/__h.html`); return { ctx, pg, errs }; }
const conFrame = (pg) => pg.frames().find((x) => /console\.html/.test(x.url()));
async function walk(cf, ks) { await cf.evaluate(() => { document.getElementById('go').click(); }); await cf.waitForTimeout(2500); const out = {};
  for (const k of ks) { const i = await cf.evaluate((k) => window.__bgmR().findIndex((c) => c.k === k && !/^bridge-/.test(c.slug || '')), k); if (i < 0) { out[k] = null; continue; } await cf.evaluate((i) => window.__bgmGo.fire(i), i); await cf.waitForTimeout(4200);
    out[k] = await cf.evaluate(() => { const s = window.__seg.st(), e = document.getElementById('gBed'); return { seg: s.seg, id: s.id, plays: s.plays, on: s.on, paused: s.paused[s.on], gbed: e ? e.textContent : '', gon: !!(e && e.classList.contains('on')) }; }); }
  return out; }
try {
  /* b · d · e — 콘솔을 바로 연 판(마이페이지 «연습 · 준비»와 같은 중계를 시험 판이 한다) */
  for (const [tag, S0, gone] of [['b', SA, null], ['d', SA, 'B31'], ['e', base(), null]]) {
    const { ctx, pg, errs } = await page(); if (gone) await pg.evaluate((g) => { H.gone[g] = 1; }, gone);
    await pg.evaluate((u) => go(u), L.url(S0, {})); await pg.waitForTimeout(1800); const cf = conFrame(pg);
    const o = cf ? await walk(cf, ['candle', 'tribute', 'table']) : null;
    if (tag === 'b') { ok('b 미리듣기 — 화촉 B31 · 부모님께 인사 B16(고른 곡 · 예시 음악 아님) · 고지 줄 «두 분이 고른 곡으로 흘러요»', !!o && o.candle && o.candle.id === 'B31' && !o.candle.paused && o.tribute.id === 'B16' && /두 분이 고른 곡으로 흘러요/.test(o.tribute.gbed) && o.tribute.gon, o);
      ok('b 부모님께 인사 → 테이블 — 같은 곡(B16)을 다시 시작하지 않는다(재생 수 · 재생기 그대로)', !!o && o.table && o.table.id === 'B16' && o.table.plays === o.tribute.plays && o.table.on === o.tribute.on, o && { t: o.tribute, tb: o.table }); }
    if (tag === 'd') ok('d 화촉 곡(B31)을 못 받으면 그 구간만 예시 음악 + «곡을 불러오지 못해 예시 음악이 흘러요» · 부모님께 인사는 고른 곡 B16', !!o && o.candle && o.candle.id === '@PV' && /곡을 불러오지 못해 예시 음악이 흘러요/.test(o.candle.gbed) && o.tribute.id === 'B16' && /두 분이 고른 곡/.test(o.tribute.gbed), o);
    if (tag === 'e') ok('e 옛 링크(bgm 값 없음) → 기본곡 계획(화촉 B05 · 부모님께 인사 B15 · 예시 한 곡 아님)', !!o && o.candle && o.candle.id === 'B05' && o.tribute.id === 'B15', o);
    ok(`${tag} 쪽 오류 0`, !errs.length, errs.slice(0, 3)); await ctx.close(); }
  /* c — 식순 화면 안에서 연 판 */
  { const { ctx, pg, errs } = await page(); await pg.evaluate(() => go('/order-preview.html?embed=1')); await pg.waitForTimeout(3500);
    const f = pg.frames().find((x) => /order-preview\.html/.test(x.url()));
    await f.evaluate((S0) => { Object.keys(S0).forEach((k) => { S[k] = S0[k]; }); try { render(); } catch (e) {} openRitualPreview(); }, SA); await pg.waitForTimeout(2500);
    const cf = conFrame(pg), o = cf ? await walk(cf, ['candle', 'tribute']) : null;
    ok('c 식순 화면 «음악까지 미리듣기» 판 — 식순 화면이 마이페이지로 곡을 받아 이어 준다 · 화촉 B31 · 부모님께 인사 B16', !!o && o.candle && o.candle.id === 'B31' && o.tribute && o.tribute.id === 'B16', o);
    ok('c 쪽 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close(); }
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); }
await br.close(); srv.close();
console.log(fail ? `PREVIEW SONGS FAIL ${fail}` : 'PREVIEW SONGS OK');
process.exit(fail ? 1 : 0);
