#!/usr/bin/env node
/* ★★[NO_RELIFT_1102 2026-11-02 사장님 «이어 듣기 하면 전에 틀었던 BGM 이 나오는 버그»] 정적 뒤 앞 곡을 되살리지 않는다 — 미리 듣기 · 연습 · 당일 콘솔이 읽는 한 표(엔진 duck · live.duck)
   E 엔진 표 — 축사 «음악 없이» 뒤 박수 · 축가 여는 말 · 축가 끝 박수 = −90 · 본식 곡 칸에서 정적 뒤 다시 올라오는 자리 0(성혼 선언 예외) · 다시 올라 10초 안에 정적 0
     (축사 «음악과 함께» · 축사를 뺀 날 · 부모님께 인사 · 테이블을 뺀 날도) · 다음 순간 곡(부모님께 인사 · 닫는 인사)은 무음에서 그대로
   P 미리 듣기 하루 이어 듣기(감사 인사 → … → 축배 → 닫는 인사) — 정적이 된 곡이 다른 줄에서 다시 올라오는 일 0(성혼 선언 뒤 · 축배 곡 M7 예외) ·
     축가 여는 말 · 축가 끝 박수 · 편지 첫 줄 동안 음악 0 · 축가(MR) 앞 정적 ≥ 1초 · 축배 «위하여» 뒤 축배 곡(M7) 1회 이상 · 순간 하나(축가 · 편지)만 들어도 같은 규칙
   BP_BED · BP_OP · BP_CUE = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
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
const HAVE = ['B01', 'B07', 'B09', 'B10', 'B12', 'B13', 'B15', 'B16', 'B17', 'B24', 'B28', 'B32'];   /* B32 = 마지막 곡(M8L) — 촬영 후 안내 */   /* 화촉 1 · 2(B05 · B31)는 없다 — d */   /* [BGM_TIMING_1101] 테이블 인사 곡(B23)도 — 축배 뜸 곡 e */
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

const go = async (f, k) => { await f.evaluate((k) => mkGo(k), k); await wait(f, 700); };
const setX = (f, o) => f.evaluate((o) => { Object.keys(o.on || {}).forEach((k) => { S.on[k] = o.on[k]; }); S.freeWhat = 'speech'; S.bgm = o.bgm || {}; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); }, o);
/* 엔진 표 — 줄마다 (순간 · 줄 · 자리 · 크기 · 시간) */
const table = (f, o) => f.evaluate((o) => { const S1 = JSON.parse(JSON.stringify(S)); Object.keys(o.on || {}).forEach((k) => { S1.on[k] = o.on[k]; }); S1.bgm = o.bgm || {};
  const P = []; ENG.RitualCue.build(S1, { mode: 'console' }).cues.forEach((c) => { P.push({ k: c.k, s: c.slug || '', w: 'say', v: c.duck, t: +c.est || 0 }); (c.post || []).forEach((p) => { if (p.music === 'to') P.push({ k: c.k, s: c.slug || '', w: 'post', v: p.v, t: 0 }); }); if (c.live && c.live.duck != null) P.push({ k: c.k, s: c.slug || '', w: 'live', v: c.live.duck, t: +(c.live.est || 0) }); });
  return P; }, o);
const M4K = (k, o) => /^(welcome|vow|ring|declare|bless|song)$/.test(k) || (k === 'free' && !(o.bgm && o.bgm.S5)) || (k === 'letter' && !(o.bgm && o.bgm.S6));
/* 본식 곡 칸에서 정적 뒤 다시 올라오는 자리 · 올라 10초 안에 정적 */
const relifts = (P, o) => { const bad = []; let quiet = false, toastM4 = false, lastK = '';
  for (let j = 0; j < P.length; j++) { const x = P[j]; if (x.v == null) continue; if (x.k !== lastK) { if (x.k === 'toast') toastM4 = M4K(lastK, o); lastK = x.k; } const m4 = M4K(x.k, o) || (x.k === 'toast' && toastM4);
    if (!m4) { quiet = false; continue; } if (x.v <= -60) { quiet = true; continue; } if (x.k === 'declare') { quiet = false; continue; }
    if (quiet) bad.push(`${x.k}/${x.s}/${x.w} ${x.v}`); }
  for (let j = 1; j < P.length; j++) { if (!(P[j - 1].v <= -60 && P[j].v > -60)) continue; let t = 0, back = false; for (let m = j; m < P.length; m++) { if (P[m].v <= -60) { back = true; break; } t += P[m].t; if (t >= 10) break; }
    if (back && t < 10 && P[j].k !== 'declare' && P[j].k !== 'prevideo') bad.push(`10초 ${P[j].k}/${P[j].s}/${P[j].w} → ${t}s`); }
  return bad; };
const lvAt = (P, s, w) => { const x = P.find((y) => y.s === s && y.w === w); return x ? x.v : null; };
/* 미리 듣기 — 이어 듣기(또는 순간 하나)를 틀고 0.1초마다 (줄 · 곡 · 크기) */
const run = (f, ks, ms) => f.evaluate(async ({ ks, ms }) => { const BB = BgmBed._t, o = []; if (!window.__lpMs0) window.__lpMs0 = window._lpMs; window._lpMs = function () { return 2500; };
  if (ks.length > 1) { LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(ks, true); _lFull(); } else lsPlay(ks[0]);
  (LP.q || []).forEach((x) => { if (x.talk || x.talk2 || x.said || x.act || x.quiet) x.ms = 2500; });
  const t0 = performance.now(); await new Promise((res) => { const iv = setInterval(() => { const v = BB.BED.cur, st = LP.q[LP.i]; o.push({ t: performance.now() - t0, k: st && st.k, s: st && st.slug || '', i: LP.i, lab: st && st.lab || '', f: v && v.f, on: !!(v && v.src && v.want > -60), want: v && v.want });
    if (performance.now() - t0 > ms || !LP.q.length) { clearInterval(iv); res(); } }, 100); });
  try { lsStop(); } catch (x) {} try { if (ks.length > 1) lsCloseBig(); } catch (x) {} window._lpMs = window.__lpMs0; return o; }, { ks, ms });
/* 정적이 된 곡이 다른 줄에서 다시(선언 뒤 · M7 예외) */
const backAgain = (o, m7) => { const hz = {}, heard = {}, bad = []; o.forEach((x) => { if (!x.f) return; if (!x.on) { if (heard[x.f] && x.want != null && x.want <= -60 && hz[x.f] == null) hz[x.f] = x.i; return; } heard[x.f] = 1;   /* 들렸던 곡이 정적이 된 뒤만 센다(처음부터 소리 없이 깔린 곡은 아니다) */
  if (hz[x.f] != null && hz[x.f] !== x.i) { if (x.k === 'declare' || x.f === m7) { delete hz[x.f]; return; } bad.push(`${x.f} #${hz[x.f]}→#${x.i} ${x.k} ${x.s || x.lab}`); delete hz[x.f]; } }); return [...new Set(bad)]; };
try {
  const { ctx, f, errs } = await open(390, true);
  await f.waitForFunction(() => !!(window.ENG && ENG.RitualCue), null, { timeout: 15000 }).catch(() => {});
  const ON = { bless: 1, free: 1, song: 1, letter: 1, tribute: 1, table: 1, toast: 1 };
  /* E 엔진 표 */
  const V = [['기본(축사 · 편지 «음악 없이»)', { on: ON, bgm: {} }], ['축사 «음악과 함께»', { on: ON, bgm: { S5: { m: 'bed' } } }], ['축사 뺌', { on: Object.assign({}, ON, { free: 0 }), bgm: {} }],
    ['부모님께 인사 · 테이블 뺌(편지 → 축배)', { on: Object.assign({}, ON, { tribute: 0, table: 0 }), bgm: {} }], ['편지 «음악과 함께»', { on: ON, bgm: { S6: { m: 'bed' } } }]];
  for (const [nm, o] of V) { const P = await table(f, o), bad = relifts(P, o); ok(`E ${nm} — 본식 곡 정적 뒤 다시 올라옴 0 · 올라 10초 안에 정적 0`, !bad.length, bad); }
  { const P = await table(f, V[0][1]);
    ok('E 기본 — 축사 뒤 박수(live) · 축가 여는 말 · 축가 끝 박수(live) = −90 · 선언 뒤 박수 −8(예외) · 부모님께 인사 첫 줄 −16(무음에서 새 곡)',
      lvAt(P, 'bridge-b10-speech-clap', 'live') === -90 && lvAt(P, 'narr-song', 'say') === -90 && lvAt(P, 'narr-song-end-friend', 'live') === -90 && lvAt(P, 'narr-declare-family-out', 'live') === -8 && lvAt(P, 'narr-tribute-name', 'say') === -16,
      ['bridge-b10-speech-clap/live', 'narr-song/say', 'narr-song-end-friend/live', 'narr-declare-family-out/live', 'narr-tribute-name/say'].map((z) => z + ' ' + lvAt(P, ...z.split('/')))); }
  { const P = await table(f, V[2][1]); ok('E 축사 뺌 — 덕담 곡이 흐르다 축가 여는 말은 −16 그대로(앞이 정적이 아니다) · MR 뒤 박수는 −90', lvAt(P, 'narr-song', 'say') === -16 && lvAt(P, 'narr-song-end-friend', 'live') === -90, [lvAt(P, 'narr-song', 'say'), lvAt(P, 'narr-song-end-friend', 'live')]); }
  /* P 미리 듣기 하루 이어 듣기 */
  await setX(f, { on: ON, bgm: {} }); await go(f, 'welcome');
  const m7 = await f.evaluate(() => BgmPicks.plan ? (BgmBed._t && (function () { try { return (BgmPicks.PICKS.M7 || [])[0]; } catch (e) { return ''; } })()) : '');
  const DAY = ['welcome', 'vow', 'ring', 'declare', 'bless', 'free', 'song', 'letter', 'tribute', 'table', 'toast', '_close'];
  const o = await run(f, DAY, 240000), ba = backAgain(o, m7);
  ok('P 하루 이어 듣기 — 정적이 된 곡이 다른 줄에서 다시 올라오는 일 0(선언 뒤 · 축배 곡 예외)', ba.length === 0 && o.length > 500, { ba, n: o.length });
  const at = (pr) => o.filter(pr), song0 = at((x) => x.k === 'song' && x.on), let0 = at((x) => x.k === 'letter' && x.s === 'letter-each' && x.on);
  ok('P 축가 여는 말 · 축가 · 축가 끝 박수 · 편지 첫 줄 동안 음악 0', !song0.length && !let0.length, { song: [...new Set(song0.map((x) => x.f + ' ' + (x.s || x.lab)))], letter: let0.length });
  const mr = o.findIndex((x) => x.k === 'song' && x.lab === '축가가 흐르는 자리'); let q0 = 0; for (let j = mr - 1; j >= 0 && !o[j].on; j--) q0 = o[mr].t - o[j].t;
  ok(`P 축가(MR) 앞 정적 ≥ 1초 (${(q0 / 1000).toFixed(1)}초)`, mr > 0 && q0 >= 1000, { mr, q0 });
  const m7on = o.filter((x) => x.f === m7 && x.on).length;
  ok(`P 축배 «위하여» 뒤 축배 곡(${m7}) 재생 1회 이상`, !!m7 && m7on > 0, { m7, m7on });
  /* 순간 하나 */
  for (const k of ['song', 'letter']) { await go(f, k); const o1 = await run(f, [k], k === 'song' ? 14000 : 20000), up = o1.filter((x) => x.on && (k === 'song' || x.s === 'letter-each')), b1 = backAgain(o1, '');
    ok(`P ${k === 'song' ? '축가' : '편지'}만 듣기 — 여는 말 · ${k === 'song' ? '축가 · 박수' : '첫 줄'} 동안 음악 0 · 되살아남 0`, !up.length && !b1.length, { up: up.map((x) => [Math.round(x.t), x.i, x.s || x.lab, x.f, x.want]), b1 }); }
  ok('쪽 오류 0', !errs.length, errs.slice(0, 3));
  await ctx.close();
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); }
await br.close(); srv.close();
console.log(fail ? `NO RELIFT FAIL ${fail}` : 'NO RELIFT OK');
process.exit(fail ? 1 : 0);
