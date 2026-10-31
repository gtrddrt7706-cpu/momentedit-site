#!/usr/bin/env node
/* ★★[BGM_PREVIEW_1024 2026-10-24 사장님 «고객이 진행하면서 나레이션과 함께 들어볼 수 있게» · «고객이 고름»] 구간 음악 고르기 · 미리 듣기
   진짜 식순 화면을 «마이페이지 안»(order-preview.html?embed=1)으로 띄우고, 부모 창(가짜 마이페이지)이 GAS 대신 구간 곡 목록 · 곡(합성음)을 준다(mypage.html 중계와 같은 모양 · key 'bed').
   나레이션 파일은 짧은 소리로 바꿔 빨리 돈다(크기 · 차례만 잰다).
   A 마이페이지 안(390 · 1280)
   1 화촉 쪽 «화촉 음악» 줄 — 곡 4 · 처음엔 안 눌린 모양 · 아래 한 줄 «고르지 않으시면 ‹1순위›로 준비해요» · 목록이 오면 드라이브에 없는 곡 ▶ 는 흐림(off)
   2 감사 인사 쪽에 «감사 인사 음악» · 혼인 서약 쪽에는 그 줄이 다시 없다(같은 구간)
   3 곡을 고르면 S.bgm.M2 = { k } · 눌린 모양 · 아래 한 줄 «‹곡›으로 준비해요» · 저장 꼴(BgmSlots.clean)이 그 번호를 지킨다
   4 곡 카드 ▶ — 그 곡을 한 번 묻는다(key bed) · 그 곡을 깔고 첫 나레이션 줄을 튼다 · 음악 크기 = 그 줄의 엔진 크기 · ■ 로 멈춘다 · 다른 소리를 틀면 멈춘다(소리 하나)
   5 이 순간 전체 듣기 · 음악과 함께 — 고른 곡이 깔린다 · 줄마다 크기 = 엔진 값(말 줄 dk · 사람 구간 ldk) · 축배 «위하여» 차례가 끝나면 축배 크기(0)
   6 축사 · 편지 — «음악 없이»면 말씀 · 낭독 동안 −90 · «음악과 함께»면 그 아래 곡 고르기가 펼쳐지고 그 곡으로 −20
   7 드라이브에 곡이 없는 구간(테이블 인사) — 나레이션만 · 단추 이름 그대로 · 오류 없음
   8 한눈에 보기 «음악» — «화촉 · ‹고른 곡›» · «감사 인사 · 고르지 않으시면 ‹1순위›» · «축사 · 음악과 함께 · ‹곡›»
   9 당일 콘솔 — 이 기기에서 안 골랐으면 고객이 고른 곡이 그 구간 기본(«두 분이 고른 곡» 표시)
   B 마이페이지 밖(공개 미리보기 · 390) — 곡 이름 · 한 줄만 · ▶ 없음 · «마이페이지에서 들어 볼 수 있어요» · 곡 줄이 없는 쪽은 듣기 아래 «음악은 마이페이지에서 함께 들어 볼 수 있어요» · 단추에 «음악과 함께» 없음
   C 쪽 오류 없음 · 가로 넘침 없음
   ★★[BGM_FIX_1030 2026-10-30] 곡 번호 = 곡마다 하나(B01 …) · 새 목록(10/30 표) — 더 잰다:
   D1 옛 번호(S.bgm.M2 = { k:'M2_1' })는 «고르지 않음» — 안 눌린 모양 · «고르지 않으시면 ‹1순위›» · 저장 꼴이 버린다 · 1순위가 깔린다
   D2 한 파일 — B02 를 하객 맞이 곡 카드로 받은 뒤 축사 «음악과 함께» 곡 카드 B02 는 다시 묻지 않는다(key bed 한 번)
   D3 보컬 곡 — 곡 이름 옆 «노래»(보컬 넷만) · 고르면 아래 «가사가 있는 곡이라 안내 말씀 때는 더 작게 깔려요» · 깔리면 나레이션 −6 더(−22)
   D4 [GPT③ R1-1] 초안이 통째로 바뀌면 이 탭에서 누른 축사 칩 기억도 비운다(저장에 없는 «음악과 함께»가 눌린 모양으로 남지 않는다)
   D5 [GPT③ R1-7] 두 분이 올린 입장 곡을 스튜디오로 못 보냈으면 ④ 음악 첫 줄 «입장 곡 · 스튜디오로 보내지 못했어요» + «이동하기»
   D6 축배 — «위하여» 전 축배 나레이션은 닫는 인사 곡(M6) · 뒤에 축배 곡(M7 · B28) · ★[CHEER_TAIL_1030] «위하여»가 순간의 마지막 줄이어도(END_FLOW_1030) 꼬리 4초에 축배 곡
   E [덧붙임 4] 1 연주자는 한국 고객이 읽는 이름(久石譲 → 히사이시 조) 2 곡 이름에 «(Instrumental)» 꼬리 없음 3 곡 이름이 한 줄(390 · 하객 맞이 «바다가 보이는 마을»)
     4 아는 영화 · 드라마 곡은 아랫줄 맨 앞에 출처(«하울의 움직이는 성 · 히사이시 조 · …») 5 여러 곡을 이어 트는 구간(하객 맞이 · 테이블 인사)은 «‹곡›부터 이어서 틀어요»
   BP_OP=<order-preview.html 경로>(그 판으로 잰다 — 돌연변이 확인용 · 옛 판은 빨강)  SHOT=폴더(그림)  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const OP = process.env.BP_OP || '', SHOT = process.env.SHOT || '';
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
  const p = (OP && u === '/order-preview.html') ? OP : path.join(ROOT, u);
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
  await f.evaluate((k) => { window.__bl = []; lsPlay(k); const t = setInterval(() => { try { const st = LP.q[LP.i] || (LP.q.length ? { k: '_tail', slug: '_tail' } : null), B = BgmBed._t.BED; if (!st || LP.leadSt === st) return;   /* [LISTEN_PACE_1031] 순간 첫 줄 앞 음악 뜸(−8)은 그 줄 크기가 아니다 — listen-pace 가 잰다 */   /* [CHEER_TAIL_1030] 마지막 줄 뒤 꼬리(축배 곡 4초)도 잰다 */ window.__bl.push({ i: LP.i, k: st.k, slug: st.slug || '', talk: !!(st.talk || st.talk2 || st.skip || st.bridge), cheer: !!st.cheer, dk: st.dk, ldk: st.ldk, f: B.cur.f, want: B.cur.want, who: B.who, src: !!B.cur.src }); } catch (e) {} }, 120); window.__blT = t; }, k);
  await wait(f, ms); return f.evaluate(() => { clearInterval(window.__blT); try { lsStop(); } catch (e) {} return window.__bl.slice(); }); }
const shot = async (f, W, n, sel) => { if (!SHOT) return; try { fs.mkdirSync(SHOT, { recursive: true }); await f.locator(sel).first().screenshot({ path: path.join(SHOT, `bed-${W}-${n}.png`) }); } catch {} };
const RO = (f, t) => f.evaluate((t) => (typeof _josaRo === 'function' ? _josaRo(t) : '로'), t);
const note = async (f, t, picked) => (picked ? '' : '고르지 않으시면 ') + '‹' + t + '›' + (await RO(f, t)) + ' 준비해요';
try {
  for (const W of [390, 1280]) {
    const { ctx, pg, f, errs } = await open(W, true);
    /* D1 옛 번호 — 옛 초안의 S.bgm.M2 = { k:'M2_1' } */
    await f.evaluate(() => { S.bgm = { M2: { k: 'M2_1' } }; render(); }); await go(f, 'candle'); await wait(f, 400);
    let r = await row(f, 'M2'); const d1 = await f.evaluate(() => ({ c: BgmSlots.clean(S.bgm) || null, eff: BgmBed._t.eff('M2') }));
    ok(`${W} D1 옛 번호(M2_1)는 «고르지 않음» — 안 눌린 모양 · «고르지 않으시면 ‹인생의 회전목마›» · 저장 꼴이 버린다 · 1순위(B05)가 깔린다`, r && r.on.length === 0 && r.note === await note(f, '인생의 회전목마') && d1.c === null && d1.eff === 'B05', { r, d1 });
    await f.evaluate(() => { delete S.bgm; render(); }); await go(f, 'candle'); await wait(f, 300);
    /* 1 화촉 */
    r = await row(f, 'M2');
    ok(`${W} 1 화촉 «화촉 음악» 줄 · 곡 4 · 안 눌린 모양 · «고르지 않으시면 ‹인생의 회전목마›로 준비해요»`, r && r.gl === '화촉 음악' && r.n === 4 && r.on.length === 0 && r.note === '고르지 않으시면 ‹인생의 회전목마›로 준비해요', r);
    ok(`${W} 1 드라이브에 없는 곡 ▶ 는 흐림(B07 · B30) · ▶ 44px 이상 · 줄 60px`, r && r.off.join() === 'bedp:M2:B07,bedp:M2:B30' && r.plH >= 44 && r.pkH >= 60, r);
    await shot(f, W, 'candle', '.ls-bed[data-seg="M2"]');
    /* E [덧붙임 4] 1 · 2 · 4 — 화촉 줄 글 */
    const e1 = await f.evaluate(() => ({ a: [...document.querySelectorAll('.ls-bed[data-seg="M2"] .mu-a')].map((x) => x.textContent), t: [...document.querySelectorAll('.ls-bed[data-seg="M2"] .mu-t')].map((x) => x.textContent),
      han: Object.values(BgmPicks.SONGS).filter((x) => /[\u4e00-\u9fff]/.test(x.a || '') || /[\u4e00-\u9fff]/.test(x.t || '')).map((x) => x.t), inst: Object.values(BgmPicks.SONGS).filter((x) => /\(Instrumental\)/i.test(x.t)).map((x) => x.t) }));
    ok(`${W} E1 연주자는 한국 고객이 읽는 이름 — «히사이시 조» · 곡 표에 한자 이름 없음`, e1.a[0] && e1.a[0].indexOf('히사이시 조') > -1 && !e1.a.some((x) => /久石譲/.test(x)) && !e1.han.length, e1);
    ok(`${W} E2 곡 이름에 «(Instrumental)» 꼬리 없음 — 화촉 «Photograph»`, !e1.inst.length && e1.t.includes('Photograph'), e1);
    ok(`${W} E4 아는 영화 · 드라마 곡은 아랫줄 앞에 출처 — «하울의 움직이는 성 · 히사이시 조 · …» · «성균관 스캔들 · …» · 출처 없는 곡은 연주자부터`, e1.a[0].indexOf('하울의 움직이는 성 · 히사이시 조 · ') === 0 && e1.a[3].indexOf('성균관 스캔들 · ') === 0 && e1.a[1].indexOf('Cody Fry · ') === 0, e1.a);
    /* 2 감사 인사 · 혼인 서약 */
    await go(f, 'welcome'); const rw = await row(f, 'M4'); await go(f, 'vow'); const rv = await row(f, 'M4');
    ok(`${W} 2 감사 인사 쪽에 «감사 인사 음악» · 혼인 서약 쪽엔 다시 없음`, rw && rw.gl === '감사 인사 음악' && !rv, { rw, rv });
    /* 3 고르기 */
    await go(f, 'candle'); await f.click('[data-fk="bed:M2:B06"]'); await wait(f, 300);
    r = await row(f, 'M2'); const bg = await f.evaluate(() => ({ s: JSON.parse(JSON.stringify(S.bgm || null)), c: BgmSlots.clean(S.bgm) }));
    ok(`${W} 3 고르면 S.bgm.M2.k = B06 · 눌린 모양 · «‹Photograph›…준비해요» · 저장 꼴이 지킨다`, r && r.on.join() === 'bed:M2:B06' && r.note === await note(f, 'Photograph', true) && bg.s && bg.s.M2 && bg.s.M2.k === 'B06' && bg.c && bg.c.M2 && bg.c.M2.k === 'B06', { r, bg });
    /* 4 곡 카드 ▶ — [SONG_CARD_SOLO_1031] 곡만(나레이션 없음) · +7 dB · 그 길에만 리미터 · 0.8초에 오름 */
    await f.evaluate(() => { window.__narReq = 0; if (!window.__nrHook) { window.__nrHook = 1; const op = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { try { if (/\/narration\//.test(String(this.src || ''))) window.__narReq++; } catch (e) {} return op.apply(this, arguments); }; } });
    await f.click('[data-fk="bedp:M2:B05"]'); await wait(f, 2600);
    const c4 = await f.evaluate(() => { const B = BgmBed._t, v = B.BED.cur, l = v.lim; return { who: B.BED.who, f: B.BED.cur.f, solo: !!v.solo, g: v.g ? Math.round(20 * Math.log10(v.g.gain.value) * 10) / 10 : null, loop: v.src ? v.src.loop : null,
      lim: l ? [l.threshold.value, l.ratio.value, Math.round(l.attack.value * 1000), Math.round(l.release.value * 1000)] : null, nar: window.__narReq, na: B.CARD.na ? String(B.CARD.na.src || '') : '', pressed: document.querySelector('[data-fk="bedp:M2:B05"]').getAttribute('aria-pressed'),
      hint: ((document.querySelector('.ls-bed[data-seg="M2"] .bed-hint') || {}).textContent || '').trim(), lab: (document.querySelector('[data-fk="bedp:M2:B06"]') || { getAttribute: () => '' }).getAttribute('aria-label') }; });   /* 틀지 않은 ▶ 의 이름(트는 ▶ 는 «멈추기») */
    const lg4 = await LOG(pg);
    ok(`${W} 4 곡 카드 ▶ — key bed 로 그 곡(B05)을 묻고 · 곡만(나레이션 요청 0) · +7 dB · 리미터(−1 dB · 20 · 2ms · 150ms) · ■ [SONG_CARD_SOLO_1031]`, lg4.includes('momentedit:ritualFileGet:bed:B05') && lg4.includes('momentedit:ritualFileGet:bed:list') && c4.who === 'card' && c4.f === 'B05' && c4.solo && c4.nar === 0 && !/narration/.test(c4.na) && Math.abs(c4.g - 7) <= 0.2 && c4.lim && c4.lim.join() === '-1,20,2,150' && c4.loop === false && c4.pressed === 'true', { c4, lg4 });
    ok(`${W} 4 곡 칸 맨 아래 한 줄 «나레이션과 함께 들어 보려면 위 ‹이 순간 전체 듣기›를 눌러 주세요» · ▶ 이름 «곡만 듣기»`, c4.hint === '나레이션과 함께 들어 보려면 위 ‹이 순간 전체 듣기›를 눌러 주세요' && / · 곡만 듣기$/.test(c4.lab || ''), c4);
    await f.click('[data-fk="bedp:M2:B05"]'); await wait(f, 400);
    const c4b = await f.evaluate(() => ({ who: BgmBed._t.BED.who, src: !!BgmBed._t.BED.cur.src, pressed: document.querySelector('[data-fk="bedp:M2:B05"]').getAttribute('aria-pressed') }));
    ok(`${W} 4 ■ 로 멈춘다`, !c4b.src && c4b.pressed === 'false', c4b);
    await f.click('[data-fk="bedp:M2:B05"]'); await wait(f, 600); await f.evaluate(() => { try { _stopMk(); } catch (e) {} }); await wait(f, 300);
    ok(`${W} 4 다른 소리를 틀면(_stopMk) 곡 카드 소리는 멈춘다`, await f.evaluate(() => !BgmBed._t.BED.cur.src && BgmBed._t.CARD.f === ''));
    /* 5 화촉 이 순간 전체 듣기 */
    const l5 = await lab(f, 'candle');
    const b5 = await listen(f, 'candle', 9000);
    const v5 = b5.filter((x) => x.src && x.f), bad5 = v5.filter((x) => x.f !== 'B06' || (x.talk ? x.want !== (x.ldk != null ? x.ldk : -8) : (x.dk != null && Math.abs(x.want - x.dk) > 0.01 && !x.cheer)));
    ok(`${W} 5 화촉 «이 순간 전체 듣기 · 음악과 함께» · 고른 곡(B06)이 깔리고 줄마다 엔진 크기`, l5 === '이 순간 전체 듣기 · 음악과 함께' && v5.length > 3 && !bad5.length, { l5, n: v5.length, bad5: bad5.slice(0, 4), seq: [...new Set(b5.map((x) => x.slug + ':' + x.want))].slice(0, 12) });
    /* D3 보컬 — 하객 맞이 */
    {
      await go(f, 'guest'); r = await row(f, 'M1');
      const voc = await f.evaluate(() => [...document.querySelectorAll('.ls-bed[data-seg="M1"] .mu-row')].map((x) => [x.querySelector('.mu-pick').getAttribute('data-fk'), !!x.querySelector('.mu-voc'), ((x.querySelector('.mu-voc') || {}).textContent || '').trim()]));
      const e3 = await f.evaluate(() => [...document.querySelectorAll('.ls-bed[data-seg="M1"] .mu-t')].map((x) => { const c = x.cloneNode(true); const v = c.querySelector('.mu-voc'); if (v) v.remove(); const lh = parseFloat(getComputedStyle(x).lineHeight) || 20; return { t: c.textContent.trim(), lines: Math.round(x.getBoundingClientRect().height / lh) }; }));
      ok(`${W} E3 곡 이름이 한 줄 — 하객 맞이 «바다가 보이는 마을»(괄호 영문 꼬리 없음)`, e3[0] && e3[0].t === '바다가 보이는 마을' && e3.every((x) => x.lines === 1), e3);
      ok(`${W} E4 하객 맞이 1순위 아랫줄 «마녀 배달부 키키 · Kazumi Tateishi Trio · 산뜻한 재즈 피아노»`, (await f.evaluate(() => document.querySelector('.ls-bed[data-seg="M1"] .mu-a').textContent)) === '마녀 배달부 키키 · Kazumi Tateishi Trio · 산뜻한 재즈 피아노');
      ok(`${W} E5 여러 곡을 이어 트는 구간 — 안 고르면 «고르지 않으시면 ‹바다가 보이는 마을›부터 이어서 틀어요»`, r && r.note === '고르지 않으시면 ‹바다가 보이는 마을›부터 이어서 틀어요', r && r.note);
      ok(`${W} D3 하객 맞이 — 이름표 «하객 맞이 음악» · «노래»는 보컬 곡(B04)에만 · 작은 글`, r && r.gl === '하객 맞이 음악' && r.n === 4 && voc.filter((v) => v[1]).map((v) => v[0]).join() === 'bed:M1:B04' && voc.find((v) => v[1])[2] === '노래', voc);
      ok(`${W} D3 고르기 전엔 보컬 한 줄 없음`, !(await f.evaluate(() => !!document.querySelector('.ls-bed[data-seg="M1"] .bed-voc'))));
      /* D2 한 파일 — 하객 맞이 B02 곡 카드 */
      await f.click('[data-fk="bedp:M1:B02"]'); await wait(f, 1500); await f.click('[data-fk="bedp:M1:B02"]'); await wait(f, 300);
      await f.click('[data-fk="bed:M1:B04"]'); await wait(f, 300);
      const vl = await f.evaluate(() => ((document.querySelector('.ls-bed[data-seg="M1"] .bed-voc') || {}).textContent || '').trim());
      await shot(f, W, 'guest', '.ls-bed[data-seg="M1"]');
      ok(`${W} D3 보컬 곡을 고르면 아래 «가사가 있는 곡이라 안내 말씀 때는 더 작게 깔려요»`, vl === '가사가 있는 곡이라 안내 말씀 때는 더 작게 깔려요', vl);
      const n5 = await f.evaluate(() => ((document.querySelector('.ls-bed[data-seg="M1"] .bed-note') || {}).textContent || '').trim());
      ok(`${W} E5 고르면 «‹While You Were Sleeping›부터 이어서 틀어요»`, n5 === '‹While You Were Sleeping›부터 이어서 틀어요', n5);
      const bg3 = await listen(f, 'guest', 7000); const n3 = bg3.filter((x) => x.src && x.f === 'B04' && !x.talk && x.dk != null && x.dk < -8.5);
      ok(`${W} D3 보컬 곡(B04) 아래 나레이션은 엔진 크기 − 6(−16 → −22)`, n3.length > 0 && n3.every((x) => Math.abs(x.want - (x.dk - 6)) < 0.01), { n: n3.length, s: n3.slice(0, 3) });
    }
    /* D6 · 5 축배 */
    await go(f, 'toast'); const b6 = await listen(f, 'toast', 16000);
    const ch = b6.findIndex((x) => x.cheer), pre = b6.slice(0, ch > -1 ? ch : 0).filter((x) => x.src), post = ch > -1 ? b6.slice(ch).filter((x) => x.src && !x.cheer) : [];
    ok(`${W} D6 축배 — «위하여» 전은 닫는 인사 곡(B17) · 뒤는 축배 곡(B28) · 축배 크기(0)`, ch > -1 && pre.length > 0 && pre.every((x) => x.f === 'B17') && post.some((x) => x.f === 'B28' && x.want === 0), { ch, seq: [...new Set(b6.map((x) => (x.cheer ? '!' : '') + x.slug + ':' + x.f + ':' + x.want))].slice(0, 20) });
    /* 6 축사 · 편지 */
    await go(f, 'free'); const b7 = await listen(f, 'free', 9000); const t7 = b7.filter((x) => x.talk && x.src);
    ok(`${W} 6 축사 «음악 없이» — 말씀 동안 −90 · 곡 B09(감사 인사 1순위)`, t7.length && t7.every((x) => x.want === -90 && x.f === 'B09'), t7.slice(0, 3));
    await f.click('[data-fk="bgm:S5:bed"]'); await wait(f, 400); const rs = await row(f, 'M4S5');
    await shot(f, W, 'free', '.ls-bgm[data-slot="S5"]');
    ok(`${W} 6 축사 «음악과 함께» → 그 아래 곡 고르기(4) · «고르지 않으시면 ‹Moon River›…»`, rs && rs.n === 4 && rs.note === await note(f, 'Moon River'), rs);
    if (W === 390) {
      const before = (await LOG(pg)).filter((x) => x === 'momentedit:ritualFileGet:bed:B02').length;
      await f.click('[data-fk="bedp:M4S5:B02"]'); await wait(f, 1500);
      const d2 = await f.evaluate(() => ({ f: BgmBed._t.BED.cur.f, who: BgmBed._t.BED.who, p: document.querySelector('[data-fk="bedp:M4S5:B02"]').getAttribute('aria-pressed') }));
      const after = (await LOG(pg)).filter((x) => x === 'momentedit:ritualFileGet:bed:B02').length;
      ok(`${W} D2 한 파일 — 축사 칸 B02 곡 카드는 하객 맞이에서 받은 그 파일(다시 묻지 않는다 · key bed:B02 한 번)`, before === 1 && after === 1 && d2.f === 'B02' && d2.who === 'card' && d2.p === 'true', { before, after, d2 });
      await f.click('[data-fk="bedp:M4S5:B02"]'); await wait(f, 300);
    }
    const b8 = await listen(f, 'free', 9000); const t8 = b8.filter((x) => x.talk && x.src), n8 = b8.filter((x) => !x.talk && x.src);
    ok(`${W} 6 축사 «음악과 함께» — 곡 B13 · 말씀 동안 −20`, t8.length && t8.every((x) => x.want === -20 && x.f === 'B13') && n8.every((x) => x.f === 'B13'), { t8: t8.slice(0, 2), n8: n8.slice(0, 2) });
    /* D4 [R1-1] 초안이 통째로 바뀌면 칩 기억도 비운다 */
    await f.click('[data-fk="bgm:S5:none"]'); await wait(f, 200); await f.click('[data-fk="bgm:S5:bed"]'); await wait(f, 200);
    await f.evaluate(() => { S = JSON.parse(JSON.stringify(S)); if (S.bgm) { delete S.bgm.S5; delete S.bgm.S6; } render(); }); await go(f, 'free'); await wait(f, 300);
    const d4 = await f.evaluate(() => [...document.querySelectorAll('.ls-bgm[data-slot="S5"] .op-chip')].map((b) => b.getAttribute('aria-checked')));
    ok(`${W} D4 [R1-1] 초안이 바뀌면(저장에 «음악과 함께» 없음) 축사 칩은 안 눌린 모양으로`, d4.length === 2 && d4.every((v) => v === 'false'), d4);
    await f.click('[data-fk="bgm:S5:bed"]'); await wait(f, 300);
    await go(f, 'letter'); await f.click('[data-fk="bgm:S6:bed"]'); await wait(f, 300); await f.click('[data-fk="bed:M4S6:B12"]'); await wait(f, 300);
    const b9 = await listen(f, 'letter', 9000); const t9 = b9.filter((x) => x.talk && x.src);
    ok(`${W} 6 편지 «음악과 함께» + 곡 고름 — S.bgm.S6 = { m:bed, k:B12 } · 낭독 동안 −20 · 곡 B12`, t9.length && t9.every((x) => x.want === -20 && x.f === 'B12') && (await f.evaluate(() => S.bgm.S6 && S.bgm.S6.m === 'bed' && S.bgm.S6.k === 'B12')), t9.slice(0, 2));
    /* 7 곡 없는 구간 */
    await go(f, 'table'); const l10 = await lab(f, 'table'); const b10 = await listen(f, 'table', 4000);
    ok(`${W} 7 테이블 인사(드라이브에 곡 없음) — 나레이션만 · 단추 이름 그대로 · 오류 없음`, !/음악과 함께/.test(l10) && b10.every((x) => !x.src) && !errs.length, { l10, src: b10.filter((x) => x.src).length, errs });
    /* 8 한눈에 보기 */
    const sum = await f.evaluate(() => { const d = document.createElement('div'); d.innerHTML = BgmForm.sumHtml(); return [...d.querySelectorAll('.mk-vn')].map((x) => x.textContent.trim()); });
    ok(`${W} 8 한눈에 보기 — 화촉 · 고른 곡 · 감사 인사 · 고르지 않으시면 · 축사 · 편지 곡 · 차례(하객 맞이 → 화촉 → 입장 …)`, sum.includes('화촉 · ‹Photograph›') && sum.includes('감사 인사 · 고르지 않으시면 ‹Innocent in Sonatine›') && sum.includes('축사 · 음악과 함께 · 고르지 않으시면 ‹Moon River›') && sum.includes('편지 · 음악과 함께 · ‹Under the Willow›') && sum.indexOf('화촉 · ‹Photograph›') < sum.findIndex((t) => /^입장 곡/.test(t)), sum);
    /* D5 [R1-7] 올린 입장 곡을 스튜디오로 못 보냈으면 */
    const d5 = await f.evaluate(() => { const mu0 = S.mu; S.mu = { src: 'up', t: '시험 곡', name: 'a.mp3', sid: 'x1' }; const d = document.createElement('div'); d.innerHTML = BgmForm.sumHtml();
      const li = d.querySelector('.bgm-sl'); S.mu = Object.assign({}, S.mu, { fid: 'F1' }); const d2 = document.createElement('div'); d2.innerHTML = BgmForm.sumHtml(); const li2 = d2.querySelector('.bgm-sl'); if (mu0 === undefined) delete S.mu; else S.mu = mu0;
      return { t: li ? li.querySelector('.mk-vn').textContent.trim() : '', b: li ? ((li.querySelector('.mk-vb') || {}).textContent || '') : '', t2: li2 ? li2.querySelector('.mk-vn').textContent.trim() : '', b2: li2 ? !!li2.querySelector('.mk-vb') : null }; });
    ok(`${W} D5 [R1-7] 올린 곡을 스튜디오로 못 보냈으면 «입장 곡 · 스튜디오로 보내지 못했어요» + «이동하기» · 보냈으면 곡 이름 · 단추 없음`, d5.t === '입장 곡 · 스튜디오로 보내지 못했어요' && d5.b === '이동하기' && d5.t2 === '입장 곡 · ‹시험 곡›' && d5.b2 === false, d5);
    ok(`${W} C 오류 없음 · 가로 넘침 없음`, !errs.length && !(await f.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), errs);
    /* 9 당일 콘솔 */
    if (W === 390) {
      const Sx = await f.evaluate(() => JSON.parse(JSON.stringify(S)));
      const cp = await ctx.newPage(); await cp.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
      const b64 = Buffer.from(JSON.stringify(Sx), 'utf8').toString('base64');
      await cp.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(b64)}`, { waitUntil: 'load' }); await cp.waitForTimeout(800);
      const cs = await cp.evaluate(() => { const L = (id) => BgmPicks.list(id), sel = window.__segSel; if (!sel) return { none: 1 }; const b = document.querySelector('[data-seg="M2"]');
        return { m2: sel('M2'), want: 'B06', s6: sel('M4S6'), want6: 'B12', m1: sel('M1')[0], want1: 'B04', m4: sel('M4'), want4: L('M4')[0].id, tag: b ? b.textContent.indexOf('두 분이 고른 곡') > -1 : null }; });
      ok('9 당일 콘솔 — 고객이 고른 곡이 구간 기본(화촉 B06 · 편지 B12 · 하객 맞이 B04 맨 앞) · 안 고른 구간은 1순위 · «두 분이 고른 곡» 표시', cs.m2 === cs.want && cs.s6 === cs.want6 && cs.m1 === cs.want1 && cs.m4 === cs.want4 && cs.tag === true, cs);
      await cp.close();
    }
    await ctx.close();
  }
  /* B 공개 미리보기 */
  { const { ctx, pg, f, errs } = await open(390, false);
    await go(f, 'candle'); const r = await row(f, 'M2'); const l = await lab(f, 'candle');
    ok('B 공개 — «화촉 음악» 곡 이름 · 한 줄만 · ▶ 없음 · «마이페이지에서 들어 볼 수 있어요» · 단추에 «음악과 함께» 없음', r && r.n === 4 && r.pl === 0 && /마이페이지에서 들어 볼 수 있어요$/.test(r.note) && !/음악과 함께/.test(l), { r, l });
    await go(f, 'vow'); const pub = await f.evaluate(() => ((document.querySelector('.bed-pub') || {}).textContent || '').trim());
    ok('B 공개 — 곡 줄이 없는 쪽(혼인 서약)은 듣기 아래 «음악은 마이페이지에서 함께 들어 볼 수 있어요»', pub === '음악은 마이페이지에서 함께 들어 볼 수 있어요', pub);
    await go(f, 'candle'); const pub2 = await f.evaluate(() => !!document.querySelector('.bed-pub'));
    ok('B 공개 — 곡 줄이 있는 쪽(화촉)은 그 한 줄을 다시 두지 않는다', !pub2);
    ok('B 공개 — 곡을 받지 않는다(key bed 묻지 않음)', !(await f.evaluate(() => Object.keys(BgmBed._t.BUF).length)) && (await f.evaluate(() => BgmBed._t.AV.st)) === '');
    ok('B 공개 — 오류 없음 · 가로 넘침 없음', !errs.length && !(await f.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), errs);
    await shot(f, 390, 'public', '.ls-bed[data-seg="M2"]');
    await ctx.close(); }
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 500)); }
await br.close(); srv.close();
console.log(fail ? `BGM PREVIEW FAIL ${fail}` : 'BGM PREVIEW OK');
process.exit(fail ? 1 : 0);
