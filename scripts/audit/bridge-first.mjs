#!/usr/bin/env node
/* ★★[BRIDGE_FIRST_1101 2026-11-01 사장님 «이어듣기 누르면 노래가 먼저 나오는데 순서가 맞아?»] 이음말이 먼저, 새 곡은 그 뒤
   다음 순간 몫으로 붙은 이음말(b8 하객 쪽으로 · b12 경건하게 · b14 화촉 순서 알림)은 앞 장면을 닫는 말 — 화면 음악 줄(«이 순간부터 …»)이 그 뒤에 서는 것과 같게 소리도:
   a 그 순간만 듣기 — 첫 소리 = 이음말(음악 없이) · 새 곡 뜸(6초)은 이음말 뒤 · 다음 멘트 앞
   b 이어 듣기(맞절 → 감사 인사) — 이음말 동안 입장 곡이 말 아래 크기(≤ −16) · 새 곡(피아노)은 이음말 뒤에 시작
   c 화촉(b14) · 부모님께 인사(b12)도 같은 규칙 · d 이음말 없는 순간은 맨 앞 뜸 그대로
   e 당일 콘솔 segOfCue — b8 · b12 · b14 큐 = ''(앞 곡이 잇는다) · 그다음 큐 = M4 · M5 · M2
   f 코스 · 조합마다 «화면 음악 줄 자리» == «미리 듣기 뜸 자리»(위에 서는 칸 · top)
   BP_OP · BP_BED · BP_SLOTS · BP_CON = 깨 보기용 다른 판 경로  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const OP = process.env.BP_OP || '', BED = process.env.BP_BED || '', SLOTS = process.env.BP_SLOTS || '', CON = process.env.BP_CON || '';
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
const HAVE = ['B01', 'B02', 'B04', 'B05', 'B06', 'B09', 'B10', 'B12', 'B13', 'B15', 'B17', 'B21', 'B28'];
const SONG = {}; HAVE.forEach((k, i) => { SONG[k] = wav(20, 180 + i * 20).toString('base64'); });
const RS = { r5: wav(140, 250).toString('base64'), 'r1-p': wav(60, 300).toString('base64'), r1: wav(70, 300).toString('base64') };
const HARNESS = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><iframe id="fr" style="width:100vw;height:100vh;border:0;display:block"></iframe>
<script>
window.H={rl:${JSON.stringify(RL)},rs:${JSON.stringify(RS)},log:[],draft:null,saved:null,delay:40,have:${JSON.stringify(HAVE)},songs:${JSON.stringify(SONG)}};
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
        back({type:'momentedit:ritualFileData',key:'bed',id:g.id,ok:true,mime:'audio/wav',data:H.songs[g.id]}); }, H.delay); return; }
    back({type:'momentedit:ritualFileData',key:g.key,id:g.id,ok:false,error:'파일을 불러오지 못했어요 (코드 L6)',ecode:'L6'}); return; }
});
</script>`;
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/__harness.html') { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(HARNESS); return; }
  if (/^\/assets\/audio\/narration\/.+\.mp3$/.test(u)) { r.writeHead(200, { 'Content-Type': 'audio/wav' }); r.end(SHORT); return; }
  const p = (OP && u === '/order-preview.html') ? OP : (BED && u === '/assets/bgm-bed.js') ? BED : (SLOTS && u === '/assets/bgm-slots.js') ? SLOTS : path.join(ROOT, u);
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
const go = async (f, k) => { await f.evaluate((k) => mkGo(k), k); await wait(f, 600); };
const MU = (k) => ({ src: 'rec', k, t: '시험 입장 곡', a: '시험 가수', hook: 40, hooks: [40], dur: 140 });
const PRE = /^bridge-(b8-face-guests|b12-tribute-calm|b14-candle-name)$/;
/* 틀며 0.1초마다 (줄 번호 · 줄 열쇠 · 뜸 중인가 · 곡 · 바란 크기)를 모은다 · q = 줄 목록(열쇠 · 표시) */
async function trace(f, ks, ms, big) {
  return f.evaluate(async ({ ks, ms, big }) => { const B = BgmBed._t, o = [];
    if (big) { LP.fast = false; LP.noChips = false; _lOpenBig(); _lStart(ks, true); _lFull(); } else lsPlay(ks[0]);
    const t0 = performance.now();
    await new Promise((res) => { const iv = setInterval(() => { const v = B.BED.cur, st = LP.q[LP.i];
      o.push({ t: performance.now() - t0, i: LP.i, k: st && st.k, slug: st && (st.slug || st.of) || '', lead: !!LP.leadSt, who: B.BED.who, f: v && v.f, src: !!(v && v.src), want: v && v.want });
      if (performance.now() - t0 > ms) { clearInterval(iv); res(); } }, 100); });
    const q = LP.q.map((x) => ({ k: x.k, slug: x.slug || x.of || '', pre: !!x._pre, lh: !!x._leadHere }));
    try { lsStop(); } catch (x) {} try { if (big) lsCloseBig(); } catch (x) {} return { o, q }; }, { ks, ms, big }); }
/* 그 순간만 듣기 — 첫 줄이 이음말인 순간(a · c) */
function solo(W, k, r) { const q = r.q, o = r.o, i0 = q.findIndex((x) => x.k === k);
  const isPre = i0 > -1 && PRE.test(q[i0].slug);
  if (!isPre) { ok(`${W} ${k} 첫 줄이 이음말(b8 · b12 · b14)이다(시험 조건)`, false, q.slice(0, 3)); return; }
  const onB = o.filter((x) => x.i === i0), bEnd = (o.find((x) => x.i > i0) || {}).t, ld = o.filter((x) => x.i === i0 + 1 && x.lead), s1 = o.find((x) => x.src);
  const ldMs = ld.length ? ld[ld.length - 1].t - ld[0].t : 0, nxPlay = (o.find((x) => x.i === i0 + 1 && !x.lead && x.t > (ld.length ? ld[0].t : 0)) || {}).t;
  ok(`${W} ${k} 그 순간만 듣기 — 첫 소리 = 이음말(${q[i0].slug}) · 그동안 음악 없음 · 뜸 표시는 그 다음 줄(${(q[i0 + 1] || {}).slug})`, q[i0].pre && q[i0 + 1] && q[i0 + 1].lh && onB.length > 2 && !onB.some((x) => x.src || x.lead), { q: q.slice(0, 3), onB: onB.filter((x) => x.src || x.lead).slice(0, 3) });
  ok(`${W} ${k} 새 곡 시작 > 이음말 끝 · 뜸 약 6초가 이음말과 다음 멘트 사이`, bEnd != null && s1 && s1.t >= bEnd - 50 && ldMs > 5200 && ldMs < 6800 && nxPlay != null && nxPlay > bEnd, { bEnd, s1: s1 && s1.t, ldMs: Math.round(ldMs), nxPlay }); }
try {
  for (const W of [390, 1280]) {
    const { ctx, pg, f, errs } = await open(W, true);
    /* 이음말이 들어가는 조합 — 화촉 멘트 «뭉클»(narEx.candle 1 · 순서를 알리며 열지 않는다) · 축가 바로 뒤 부모님께 인사(편지 빼기 · narEx.tribute 0) · open-course · bgm-form 과 같은 조건 */
    await f.evaluate((mu) => { S.mu = mu; S.narEx = Object.assign({}, S.narEx || {}, { candle: 1, tribute: 0 }); S.on.letter = 0; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); }, MU('r5'));
    /* a 감사 인사 그 순간만 */
    await go(f, 'welcome'); solo(W, 'welcome', await trace(f, ['welcome'], 11000, false));
    /* c 화촉 · 부모님께 인사 그 순간만 */
    await go(f, 'candle'); solo(W, 'candle', await trace(f, ['candle'], 11000, false));
    await go(f, 'tribute'); solo(W, 'tribute', await trace(f, ['tribute'], 11000, false));
    /* d 이음말 없는 순간(혼인 서약) — 맨 앞 뜸 그대로 */
    { await go(f, 'vow'); const r = await trace(f, ['vow'], 4000, false), q0 = r.q[0] || {}, ld0 = r.o.filter((x) => x.i === 0 && x.lead);
      ok(`${W} d 이음말 없는 순간(혼인 서약) — 첫 줄 앞에서 뜸(옛 동작 그대로)`, q0.k === 'vow' && !PRE.test(q0.slug) && !r.q.some((x) => x.pre || x.lh) && ld0.length > 5, { q0, ld: ld0.length }); }
    /* b 이어 듣기 맞절 → 감사 인사 */
    { await go(f, 'matjeol'); const r = await trace(f, ['matjeol', 'welcome'], 34000, true), q = r.q, i0 = q.findIndex((x) => x.k === 'welcome');
      const onB = r.o.filter((x) => x.i === i0 && !x.lead), bEnd = (r.o.find((x) => x.i > i0) || {}).t, nf = r.o.find((x) => x.src && x.f && x.f !== '@ENT'), late = onB.slice(Math.floor(onB.length / 2));
      ok(`${W} b 이어 듣기 맞절 → 감사 인사 — 이음말(${(q[i0] || {}).slug}) 동안 입장 곡이 말 아래 크기(≤ −16)`, i0 > 0 && PRE.test(q[i0].slug) && late.length > 1 && late.every((x) => x.src && x.f === '@ENT' && x.want <= -16), { i0, q: q[i0], late: late.slice(0, 3) });
      ok(`${W} b 피아노(감사 인사 곡)는 이음말 뒤에 시작 · 뜸이 그 사이`, !!nf && bEnd != null && nf.t >= bEnd - 50 && r.o.some((x) => x.i === i0 + 1 && x.lead), { nf: nf && { t: Math.round(nf.t), i: nf.i, f: nf.f }, bEnd }); }
    /* c 이어 듣기 축가 → 부모님께 인사 · 식전 영상 → 화촉 — 새 곡은 이음말 뒤 */
    for (const [a, b] of [['song', 'tribute'], ['prevideo', 'candle']]) { await go(f, b); const r = await trace(f, [a, b], a === 'song' ? 28000 : 20000, true), q = r.q, i0 = q.findIndex((x) => x.k === b);   /* [DETAIL_R2_1101 ⑤] 축가 뒤 박수 줄 3초가 더해졌다 · [TIME_GAP_1102] 이벤트 줄 사이 쉼 2.5초 */
      const bEnd = (r.o.find((x) => x.i > i0) || {}).t, fa = (r.o.filter((x) => x.k === a && x.src).pop() || {}).f, nf = r.o.find((x) => x.src && x.k === b && x.f !== fa);   /* ★[BGM_TIMING2_1101] 축가가 M4 를 틀게 되어 이음말 동안 앞 곡(M4)이 말 아래로 이어진다 — «새 곡» = 앞 순간 곡이 아닌 곡 */
      ok(`${W} c 이어 듣기 ${a} → ${b} — 이음말(${(q[i0] || {}).slug}) 뒤에 새 곡 · 뜸은 그 다음 줄`, i0 > -1 && PRE.test(q[i0].slug) && !!nf && bEnd != null && nf.t >= bEnd - 50 && q[i0 + 1] && q[i0 + 1].lh, { i0, q: q.slice(Math.max(0, i0 - 1), i0 + 2), nf: nf && Math.round(nf.t), bEnd }); }
    /* a · b 감사 인사형 서약(vowKind thanks · 감사 인사 뺌) — b8 이 서약 첫 줄에 온다(BGM 섹션 전수조사 · 화면 top@1 · 콘솔 M4@b8 이던 갈래) */
    { await f.evaluate(() => { S.on.welcome = 0; S.vowKind = 'thanks'; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); });
      await go(f, 'vow'); solo(W, 'vow', await trace(f, ['vow'], 11000, false));
      await go(f, 'matjeol'); const r = await trace(f, ['matjeol', 'vow'], 34000, true), q = r.q, i0 = q.findIndex((x) => x.k === 'vow');
      const onB = r.o.filter((x) => x.i === i0 && !x.lead), bEnd = (r.o.find((x) => x.i > i0) || {}).t, nf = r.o.find((x) => x.src && x.f && x.f !== '@ENT'), late = onB.slice(Math.floor(onB.length / 2));
      ok(`${W} b 이어 듣기 맞절 → 감사 인사형 서약 — 이음말(${(q[i0] || {}).slug}) 동안 입장 곡 ≤ −16 · 피아노는 이음말 뒤`, i0 > 0 && PRE.test(q[i0].slug) && late.length > 1 && late.every((x) => x.src && x.f === '@ENT' && x.want <= -16) && !!nf && bEnd != null && nf.t >= bEnd - 50, { i0, q: q[i0], late: late.slice(0, 2), nf: nf && Math.round(nf.t), bEnd });
      await f.evaluate(() => { S.on.welcome = 1; delete S.vowKind; try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); }); }
    /* f 코스 · 조합마다 화면 음악 줄 자리 == 미리 듣기 뜸 자리 */
    { const bad = [], seen = []; const COMBO = [{}, { welcome: 0 }, { prevideo: 0 }, { song: 0 }, { candle: 0 }];
      for (const c of COMBO) { await f.evaluate((c) => { Object.keys(c).forEach((k) => { S.on[k] = c[k]; }); try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); }, c);
        const ks = await f.evaluate(() => _lRows());
        for (const k of ks) { const x = await f.evaluate((k) => { const st = _lSteps(ENG, [k]), bq = window.BgmForm && BgmForm.flowRow ? BgmForm.flowRow(k, st) : null; if (!bq || (bq.by && bq.by !== 'top')) return null;
            LP.q = _lpTag(st).filter((x) => !x.quiet || x.txt); LP.q._pm = 0; if (typeof _lPreMark === 'function') _lPreMark(); const li = LP.q.findIndex((x, i) => x._leadHere || (i === 0 && !x._pre)), sl = (x) => x ? (x.slug || x.of || '') : '';
            const r = { k, at: bq.at, scr: sl(st[bq.at]), li, lead: sl(LP.q[li]) }; LP.q = []; return r; }, k);
          if (!x) continue; seen.push(x.k + ':' + x.scr); if (x.scr !== x.lead) bad.push(Object.assign({ c }, x)); }
        await f.evaluate((c) => { Object.keys(c).forEach((k) => { S.on[k] = 1; }); try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); }, c); }
      ok(`${W} f 코스 · 조합 ${COMBO.length}개 — 화면 음악 줄 자리 == 미리 듣기 뜸 자리(${seen.length}곳 · 이음말 뒤 ${seen.filter((s) => /:/.test(s)).length})`, !bad.length && seen.length > 8, { bad: bad.slice(0, 4), seen: seen.slice(0, 12) }); }
    ok(`${W} 쪽 오류 0`, !errs.length, errs.slice(0, 3));
    await ctx.close();
  }
  /* e 당일 콘솔 segOfCue */
  { const html = fs.readFileSync(CON || path.join(ROOT, 'console.html'), 'utf8'), m = html.match(/function segOfCue\(c\)\{[\s\S]*?\n  return ''; \}/);
    if (!m) ok('e 콘솔 segOfCue 를 찾았다', false); else {
      const fn = new Function('BP', 'S', 'segPlan', 'BED', m[0] + '; return segOfCue;')({}, { bgm: {} }, () => true, { seg: '' });
      const R = { b8: fn({ k: 'welcome', slug: 'bridge-b8-face-guests' }), w: fn({ k: 'welcome', slug: 'narr-welcome-a' }), b12: fn({ k: 'tribute', slug: 'bridge-b12-tribute-calm' }), t: fn({ k: 'tribute', slug: 'tribute-in' }), b14: fn({ k: 'candle', slug: 'bridge-b14-candle-name' }), c: fn({ k: 'candle', slug: 'narr-candle-in-a' }), vb8: fn({ k: 'vow', slug: 'bridge-b8-face-guests' }), v: fn({ k: 'vow', slug: 'narr-vow-in' }) };
      ok('e 콘솔 — b8(감사 인사 · 감사 인사형 서약) · b12 · b14 큐는 구간을 바꾸지 않는다(\'\' · 앞 곡이 잇는다) · 바로 다음 큐 = M4 · M5 · M2', R.b8 === '' && R.b12 === '' && R.b14 === '' && R.w === 'M4' && R.t === 'M5' && R.c === 'M2' && R.vb8 === '' && R.v === 'M4', R); } }
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 500)); }
await br.close(); srv.close();
console.log(fail ? `BRIDGE FIRST FAIL ${fail}` : 'BRIDGE FIRST OK');
process.exit(fail ? 1 : 0);
