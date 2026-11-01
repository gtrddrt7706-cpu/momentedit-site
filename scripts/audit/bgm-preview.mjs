#!/usr/bin/env node
/* ★★[BGM_PREVIEW_1024 2026-10-24 사장님 «고객이 진행하면서 나레이션과 함께 들어볼 수 있게» · «고객이 고름»] 구간 음악 고르기 · 미리 듣기
   진짜 식순 화면을 «마이페이지 안»(order-preview.html?embed=1)으로 띄우고, 부모 창(가짜 마이페이지)이 GAS 대신 구간 곡 목록 · 곡(합성음)을 준다(mypage.html 중계와 같은 모양 · key 'bed').
   나레이션 파일은 짧은 소리로 바꿔 빨리 돈다(크기 · 차례만 잰다).
   A 마이페이지 안(390 · 1280)
   1 화촉 쪽 «화촉 음악» 줄 — 곡 3 · 처음엔 안 눌린 모양 · 아래 한 줄 «고르지 않으시면 ‹1순위›로 준비해요» · 목록이 오면 드라이브에 없는 곡 ▶ 는 흐림(off)
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
   D2 한 파일 — B13 을 하객 맞이 곡 카드로 받은 뒤 축사 «음악과 함께» 곡 카드 B13 은 다시 묻지 않는다(key bed 한 번)
   D3 보컬 곡 — 곡 이름 옆 «노래»(보컬 넷만) · 고르면 아래 «가사가 있는 곡이라 안내 말씀 때는 더 작게 깔려요» · 깔리면 나레이션 −6 더(−22)
   D4 [GPT③ R1-1] 초안이 통째로 바뀌면 이 탭에서 누른 축사 칩 기억도 비운다(저장에 없는 «음악과 함께»가 눌린 모양으로 남지 않는다)
   D5 [GPT③ R1-7] 두 분이 올린 입장 곡을 스튜디오로 못 보냈으면 ④ 음악 첫 줄 «입장 곡 · 스튜디오로 보내지 못했어요» + «이동하기»
   D6 축배 — «위하여» 전 축배 나레이션은 테이블 인사 곡 · 없으면 축배 바로 앞 순간 곡([BGM_TIMING_1101] · 종전 닫는 인사 곡 M6) · 뒤에 축배 곡(M7 · B28) · ★[CHEER_TAIL_1030] «위하여»가 순간의 마지막 줄이어도(END_FLOW_1030) 꼬리 4초에 축배 곡
   E [덧붙임 4] 1 연주자는 한국 고객이 읽는 이름(久石譲 → 히사이시 조) 2 곡 이름에 «(Instrumental)» 꼬리 없음 3 곡 이름이 한 줄(390 · 하객 맞이 «바다가 보이는 마을»)
     4 아는 영화 · 드라마 곡은 아랫줄 맨 앞에 출처(«하울의 움직이는 성 · 히사이시 조 · …») 5 여러 곡을 이어 트는 구간(하객 맞이 · 테이블 인사)은 «‹곡›부터 이어서 틀어요»
   F [SONG_CARD_TAP_1101] 곡 카드 ▶ 첫 탭 — 곡이 3초 늦게 와도 누르자마자 차오름 · 1.5초 뒤 «곡을 불러오는 중이에요» · 오면 곡 재생 1번(아이폰 흉내: 누른 흐름 밖에서 연 소리 길은 무음) · 받는 중 다른 ▶ 는 새 곡만 · 못 받으면 ▶ 로 · 미리 받기
     BP_BED=<bgm-bed.js 경로>(그 판으로 잰다 — 깨 보기)
   BP_OP=<order-preview.html 경로>(그 판으로 잰다 — 돌연변이 확인용 · 옛 판은 빨강)  SHOT=폴더(그림)  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const OP = process.env.BP_OP || '', BED = process.env.BP_BED || '', SHOT = process.env.SHOT || '';
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 600)}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
function wav(sec, f, sr = 16000) { const n = Math.round(sr * sec), b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(f ? 8000 * Math.sin(2 * Math.PI * f * i / sr) : 0), 44 + i * 2); return b; }
const SHORT = wav(0.6, 330);   /* 나레이션 대신 — 0.6초 */
/* 드라이브에 있는 곡(시험) — B31(화촉 2 · ★[GHIBLI_ADD_1101]) · 테이블 인사 곡(B24 · B23 · B16)은 없다 · ★[PICKS_THREE_1101] 구간마다 3곡 — 뺀 곡(B02 · B04 · B06 · B21) 대신 B07 · B20 */
const HAVE = ['B01', 'B05', 'B07', 'B09', 'B10', 'B12', 'B13', 'B15', 'B17', 'B28'];
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
  const p = (OP && u === '/order-preview.html') ? OP : (BED && u === '/assets/bgm-bed.js') ? BED : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const wait = (f, ms) => f.waitForTimeout(ms);
const ALL = ['candle', 'welcome', 'vow', 'ring', 'declare', 'free', 'letter', 'tribute', 'toast', 'table'];
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
/* ★[MUSIC_FOLD_PICK_1031 따라감] 고르면 바로 한 줄로 접힌다 — 접힌 줄이면 «바꾸기»로 펴서 목록을 잰다(종전엔 .mu-pick 이 없어 검사가 멈췄다) */
const row = (f, sg) => f.evaluate((sg) => { const Q = () => document.querySelector('.ls-bed[data-seg="' + sg + '"],.bed-sub[data-seg="' + sg + '"]'); let r = Q(); if (!r) return null;
  if (!r.querySelector('.mu-pick')) { const cb = r.querySelector('.mu-chg'); if (cb) { cb.click(); r = Q(); if (!r) return null; } }
  return { gl: ((r.querySelector('.gl') || {}).textContent || '').trim(), n: r.querySelectorAll('.mu-row').length, on: [...r.querySelectorAll('.mu-pick[aria-checked="true"]')].map((b) => b.getAttribute('data-fk')),
    pl: r.querySelectorAll('.mu-pl').length, off: [...r.querySelectorAll('.mu-pl.off')].map((b) => b.getAttribute('data-fk')), note: ((r.querySelector('.bed-note') || {}).textContent || '').trim(),
    plH: Math.round(((r.querySelector('.mu-pl') || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height)), pkH: Math.round((r.querySelector('.mu-pick, .mu-info') || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height) }; }, sg);   /* [LIST_NO_PICK_1101] 목록 칸 곡 줄은 .mu-info */
const lab = (f, k) => f.evaluate((k) => { const b = document.querySelector('.mk-hbtn[data-mp="' + k + '"]'); return b ? b.textContent.trim() : ''; }, k);
const LOG = (pg) => pg.evaluate(() => H.log.slice());
/* 이 순간 전체 듣기 — 줄마다 (그 줄 · 음악 곡 · 바란 크기)를 모은다 */
async function listen(f, k, ms) {
  await f.evaluate((k) => { window.__bl = []; lsPlay(k); const t = setInterval(() => { try { const st = LP.q[LP.i] || (LP.q.length ? { k: '_tail', slug: '_tail' } : null), B = BgmBed._t.BED; if (!st || LP.leadSt === st) return;   /* [LISTEN_PACE_1031] 순간 첫 줄 앞 음악 뜸(−8)은 그 줄 크기가 아니다 — listen-pace 가 잰다 */   /* [CHEER_TAIL_1030] 마지막 줄 뒤 꼬리(축배 곡 4초)도 잰다 */ window.__bl.push({ i: LP.i, k: st.k, slug: st.slug || '', talk: !!(st.talk || st.talk2 || st.skip || st.bridge), cheer: !!st.cheer, dk: st.dk, ldk: st.ldk, f: B.cur.f, want: B.cur.want, who: B.who, src: !!B.cur.src, pend: !!st.pending || !st.src, after: !!st.after }); } catch (e) {} }, 120); window.__blT = t; }, k);
  await wait(f, ms); return f.evaluate(() => { clearInterval(window.__blT); try { lsStop(); } catch (e) {} return window.__bl.slice(); }); }
const shot = async (f, W, n, sel) => { if (!SHOT) return; try { fs.mkdirSync(SHOT, { recursive: true }); await f.locator(sel).first().screenshot({ path: path.join(SHOT, `bed-${W}-${n}.png`) }); } catch {} };
try {
  for (const W of [390, 1280]) {
    const { ctx, pg, f, errs } = await open(W, true);
    /* D1 옛 번호 — 옛 초안의 S.bgm.M2 = { k:'M2_1' } */
    await f.evaluate(() => { S.bgm = { M2: { k: 'M2_1' } }; render(); }); await go(f, 'candle'); await wait(f, 400);
    let r = await row(f, 'M2'); const d1 = await f.evaluate(() => ({ c: BgmSlots.clean(S.bgm) || null, eff: BgmBed._t.eff('M2') }));
    ok(`${W} D1 옛 번호(M2_1)는 «고르지 않음» — 안 눌린 모양 · 곡 칸 아래 안내 줄 없음(SONG_ROW_LINES_1101) · 저장 꼴이 버린다 · 1순위(B05)가 깔린다`, r && r.on.length === 0 && r.note === '' && d1.c === null && d1.eff === 'B05', { r, d1 });
    await f.evaluate(() => { delete S.bgm; render(); }); await go(f, 'candle'); await wait(f, 300);
    /* 1 화촉 */
    r = await row(f, 'M2');
    ok(`${W} 1 화촉 «화촉 음악» 줄 · 곡 3 · 안 눌린 모양 · 아래 «준비해요» 줄 없음 [SONG_ROW_LINES_1101]`, r && r.gl === '화촉 음악' && r.n === 3 && r.on.length === 0 && r.note === '', r);
    ok(`${W} 1 드라이브에 없는 곡 ▶ 는 흐림(B31) · ▶ 44px 이상 · 줄 60px`, r && r.off.join() === 'bedp:M2:B31' && r.plH >= 44 && r.pkH >= 60, r);
    await shot(f, W, 'candle', '.ls-bed[data-seg="M2"]');
    /* E [덧붙임 4] 1 · 2 · 4 — 화촉 줄 글 */
    const e1 = await f.evaluate(() => ({ a: [...document.querySelectorAll('.ls-bed[data-seg="M2"] .mu-a')].map((x) => x.textContent), t: [...document.querySelectorAll('.ls-bed[data-seg="M2"] .mu-t')].map((x) => x.textContent),
      han: Object.values(BgmPicks.SONGS).filter((x) => /[\u4e00-\u9fff]/.test(x.a || '') || /[\u4e00-\u9fff]/.test(x.t || '')).map((x) => x.t), inst: Object.values(BgmPicks.SONGS).filter((x) => /\(Instrumental\)/i.test(x.t)).map((x) => x.t) }));
    ok(`${W} E1 연주자는 한국 고객이 읽는 이름 — «히사이시 조» · 곡 표에 한자 이름 없음`, e1.a[0] && e1.a[0].indexOf('히사이시 조') > -1 && !e1.a.some((x) => /久石譲/.test(x)) && !e1.han.length, e1);
    ok(`${W} E2 곡 이름에 «(Instrumental)» 꼬리 없음 — 화촉 «Summer»`, !e1.inst.length && e1.t.includes('Summer'), e1);
    ok(`${W} E4 아랫줄 = 연주자만(★[SONG_ROW_PLAIN_1101] 출처 · 분위기 한 줄 뺌) — «히사이시 조» · «Elizabeth Bright» · «피아노 연주»`, e1.a[0] === '히사이시 조' && e1.a[1] === 'Elizabeth Bright' && e1.a[2] === '피아노 연주' && !e1.a.some((x) => /하울의 움직이는 성|성균관 스캔들/.test(x)), e1.a);
    /* 2 감사 인사 · 혼인 서약 */
    await go(f, 'welcome'); const rw = await row(f, 'M4'); await go(f, 'vow'); const rv = await row(f, 'M4');
    ok(`${W} 2 감사 인사 쪽에 «감사 인사 음악» · 혼인 서약 쪽엔 다시 없음`, rw && rw.gl === '감사 인사 음악' && !rv, { rw, rv });
    /* 3 고르기 */
    await go(f, 'candle'); await f.click('[data-fk="bed:M2:B07"]'); await wait(f, 300);
    r = await row(f, 'M2'); const bg = await f.evaluate(() => ({ s: JSON.parse(JSON.stringify(S.bgm || null)), c: BgmSlots.clean(S.bgm) }));
    ok(`${W} 3 고르면 S.bgm.M2.k = B07 · 눌린 모양 · «준비해요» 줄 없음 · 저장 꼴이 지킨다`, r && r.on.join() === 'bed:M2:B07' && r.note === '' && bg.s && bg.s.M2 && bg.s.M2.k === 'B07' && bg.c && bg.c.M2 && bg.c.M2.k === 'B07', { r, bg });
    /* 4 곡 카드 ▶ — [SONG_CARD_SOLO_1031] 곡만(나레이션 없음) · +7 dB · 그 길에만 리미터 · 0.8초에 오름 */
    await f.evaluate(() => { window.__narReq = 0; if (!window.__nrHook) { window.__nrHook = 1; const op = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { try { if (/\/narration\//.test(String(this.src || ''))) window.__narReq++; } catch (e) {} return op.apply(this, arguments); }; } });
    await f.click('[data-fk="bedp:M2:B05"]'); await wait(f, 2600);
    const c4 = await f.evaluate(() => { const B = BgmBed._t, v = B.BED.cur, l = v.lim; return { who: B.BED.who, f: B.BED.cur.f, solo: !!v.solo, g: v.g ? Math.round(20 * Math.log10(v.g.gain.value) * 10) / 10 : null, loop: v.src ? v.src.loop : null,
      lim: l ? [l.threshold.value, l.ratio.value, Math.round(l.attack.value * 1000), Math.round(l.release.value * 1000)] : null, nar: window.__narReq, na: B.CARD.na ? String(B.CARD.na.src || '') : '', pressed: document.querySelector('[data-fk="bedp:M2:B05"]').getAttribute('aria-pressed'),
      hint: ((document.querySelector('.ls-bed[data-seg="M2"] .bed-hint') || {}).textContent || '').trim(), lab: (document.querySelector('[data-fk="bedp:M2:B07"]') || { getAttribute: () => '' }).getAttribute('aria-label') }; });   /* 틀지 않은 ▶ 의 이름(트는 ▶ 는 «멈추기») */
    const lg4 = await LOG(pg);
    ok(`${W} 4 곡 카드 ▶ — key bed 로 그 곡(B05)을 묻고 · 곡만(나레이션 요청 0) · +7 dB · 리미터(−1 dB · 20 · 2ms · 150ms) · ■ [SONG_CARD_SOLO_1031]`, lg4.includes('momentedit:ritualFileGet:bed:B05') && lg4.includes('momentedit:ritualFileGet:bed:list') && c4.who === 'card' && c4.f === 'B05' && c4.solo && c4.nar === 0 && !/narration/.test(c4.na) && Math.abs(c4.g - 7) <= 0.2 && c4.lim && c4.lim.join() === '-1,20,2,150' && c4.loop === false && c4.pressed === 'true', { c4, lg4 });
    ok(`${W} 4 곡 칸 맨 아래 «나레이션과 함께 들어 보려면 …» 줄 없음 [SONG_ROW_LINES_1101] · ▶ 이름 «곡만 듣기»`, c4.hint === '' && !(await f.evaluate(() => [...document.querySelectorAll('.ls-bed,.bed-sub')].some((x) => /들어 보려면|준비해요|이어서 틀어요/.test(x.textContent)))) && / · 곡만 듣기$/.test(c4.lab || ''), c4);
    await f.click('[data-fk="bedp:M2:B05"]'); await wait(f, 400);
    const c4b = await f.evaluate(() => ({ who: BgmBed._t.BED.who, src: !!BgmBed._t.BED.cur.src, pressed: document.querySelector('[data-fk="bedp:M2:B05"]').getAttribute('aria-pressed') }));
    ok(`${W} 4 ■ 로 멈춘다`, !c4b.src && c4b.pressed === 'false', c4b);
    await f.click('[data-fk="bedp:M2:B05"]'); await wait(f, 600); await f.evaluate(() => { try { _stopMk(); } catch (e) {} }); await wait(f, 300);
    ok(`${W} 4 다른 소리를 틀면(_stopMk) 곡 카드 소리는 멈춘다`, await f.evaluate(() => !BgmBed._t.BED.cur.src && BgmBed._t.CARD.f === ''));
    /* 5 화촉 이 순간 전체 듣기 */
    const l5 = await lab(f, 'candle');
    const b5 = await listen(f, 'candle', 9000);
    const v5 = b5.filter((x) => x.src && x.f), bad5 = v5.filter((x) => x.f !== 'B07' || (x.talk ? x.want !== (x.ldk != null ? x.ldk : -8) : (x.dk != null && Math.abs(x.want - x.dk) > 0.01 && !x.cheer)));
    ok(`${W} 5 화촉 «이 순간 전체 듣기 · 음악과 함께» · 고른 곡(B07)이 깔리고 줄마다 엔진 크기`, l5 === '이 순간 전체 듣기 · 음악과 함께' && v5.length > 3 && !bad5.length, { l5, n: v5.length, bad5: bad5.slice(0, 4), seq: [...new Set(b5.map((x) => x.slug + ':' + x.want))].slice(0, 12) });
    /* G [LISTEN_LOOK_LEVEL_1101 ②] 곡 보정 +7 dB(곡 −23 LUFS → 나레이션 −16 기준 · musicTrim −3.1 은 그대로) · 음악 버스 끝 리미터(−1 dB · 20 · 2ms · 150ms) */
    const g5 = await f.evaluate(() => { const B = BgmBed._t, L = B.BUS(), p = (ENG && ENG.RitualCue && ENG.RitualCue.PARAM) || {}; return { song: p.songGain, trim: p.musicTrim, g16: B.gainOf(-16), g8: B.gainOf(-8), g0: B.gainOf(0), lim: L ? [L.n.threshold.value, L.n.ratio.value, Math.round(L.n.attack.value * 1000), Math.round(L.n.release.value * 1000)] : null }; });
    const dbOf = (g) => Math.round(20 * Math.log10(g) * 10) / 10;
    ok(`${W} G 곡 보정 +7 dB — 나레이션 아래(−16) · 큐 사이(−8) · 축배(0) 가 각각 +7 −3.1 · 음악 버스 끝 리미터 [LISTEN_LOOK_LEVEL_1101]`, g5.song === 7 && g5.trim === -3.1 && dbOf(g5.g16) === -12.1 && dbOf(g5.g8) === -4.1 && dbOf(g5.g0) === 3.9 && JSON.stringify(g5.lim) === '[-1,20,2,150]', { ...g5, d: [dbOf(g5.g16), dbOf(g5.g8), dbOf(g5.g0)] });
    /* D3 보컬 — 하객 맞이 */
    {
      await go(f, 'guest'); r = await row(f, 'M1');
      const voc = await f.evaluate(() => [...document.querySelectorAll('.ls-bed[data-seg="M1"] .mu-row')].map((x) => [x.getAttribute('data-f'), !!x.querySelector('.mu-voc'), ((x.querySelector('.mu-voc') || {}).textContent || '').trim()]));
      const e3 = await f.evaluate(() => [...document.querySelectorAll('.ls-bed[data-seg="M1"] .mu-t')].map((x) => { const c = x.cloneNode(true); const v = c.querySelector('.mu-voc'); if (v) v.remove(); const lh = parseFloat(getComputedStyle(x).lineHeight) || 20; return { t: c.textContent.trim(), lines: Math.round(x.getBoundingClientRect().height / lh) }; }));
      ok(`${W} E3 곡 이름이 한 줄 — 하객 맞이 «바다가 보이는 마을»(괄호 영문 꼬리 없음)`, e3[0] && e3[0].t === '바다가 보이는 마을' && e3.every((x) => x.lines === 1), e3);
      ok(`${W} E4 하객 맞이 1순위 아랫줄 = 연주자만 «히사이시 조 · 런던 심포니 오케스트라»(★[SONG_ROW_PLAIN_1101] 판 · 분위기 한 줄 뺌)`, (await f.evaluate(() => document.querySelector('.ls-bed[data-seg="M1"] .mu-a').textContent)) === '히사이시 조 · 런던 심포니 오케스트라');
      ok(`${W} E5 여러 곡을 이어 트는 구간도 «부터 이어서 틀어요» 줄 없음 [SONG_ROW_LINES_1101]`, r && r.note === '' && !(await f.evaluate(() => /이어서 틀어요/.test(document.querySelector('.ls-bed[data-seg="M1"]').textContent))), r && r.note);
      ok(`${W} D3 하객 맞이 — 이름표 «하객 맞이 음악» · 곡 줄 5 · «노래» 없음(★[SONG_ROW_PLAIN_1101] 가사 있는 곡 안내는 고른 뒤 한 줄)`, r && r.gl === '하객 맞이 음악' && r.n === 5 && !voc.some((v) => v[1]), voc);   /* ★[LIST_NO_PICK_1101] 고르기 없는 목록 칸 — 곡 줄 5(3곡 + 배경 곡) */
      ok(`${W} D3 고르기 전엔 보컬 한 줄 없음`, !(await f.evaluate(() => !!document.querySelector('.ls-bed[data-seg="M1"] .bed-voc'))));
      /* D2 한 파일 — 하객 맞이 B13 곡 카드(★[PICKS_THREE_1101] 하객 맞이 3 · 축사 1 이 같은 곡) */
      await f.click('[data-fk="bedp:M1:B13"]'); await wait(f, 1500); await f.click('[data-fk="bedp:M1:B13"]'); await wait(f, 300);
      /* ★[LIST_NO_PICK_1101] 하객 맞이는 고르지 않는다 — 곡 카드 ▶ 만 */
      /* ★[PICKS_THREE_1101 · GHIBLI_ADD_1101] 가사 있는 곡은 축배 목록에만 남았다 — 보컬 한 줄은 축배 2번(B29)을 골라 잰다(재고 나서 고름을 지운다) */
      await go(f, 'toast'); await f.click('[data-fk="bed:M7:B29"]'); await wait(f, 300);
      await f.evaluate(() => { const r = document.querySelector('.ls-bed[data-seg="M7"]'), cb = r && !r.querySelector('.mu-pick') && r.querySelector('.mu-chg'); if (cb) cb.click(); }); await wait(f, 200);   /* [MUSIC_FOLD_PICK_1031] 고르면 접힌다 · 아래 두 줄은 편 목록에 있다 */
      const vl = await f.evaluate(() => ((document.querySelector('.ls-bed[data-seg="M7"] .bed-voc') || {}).textContent || '').trim());
      await shot(f, W, 'toast', '.ls-bed[data-seg="M7"]');
      ok(`${W} D3 보컬 곡을 고르면 아래 «가사가 있는 곡이라 안내 말씀 때는 더 작게 깔려요»`, vl === '가사가 있는 곡이라 안내 말씀 때는 더 작게 깔려요', vl);
      const n5 = await f.evaluate(() => ((document.querySelector('.ls-bed[data-seg="M7"] .bed-note') || {}).textContent || '').trim());
      await f.evaluate(() => { delete S.bgm.M7; BgmPicks.SONGS.B17.vocal = true; render(); });   /* 나레이션 아래 −6 은 구조만 잰다 — 닫는 인사 1순위(B17)를 이 시험에서만 가사 곡으로 표시 */
      await go(f, '_close');
      ok(`${W} E5 고른 뒤에도 «부터 이어서 틀어요» 줄 없음 · 보컬 한 줄은 남는다`, n5 === '' && !!vl, n5);
      const bg3 = await listen(f, '_close', 16000);   /* [DETAIL_R1_1101 ⑨] 첫 멘트는 앞 순간 곡(뜸 6초) — 목례부터 B17 */ const n3 = bg3.filter((x) => x.src && x.f === 'B17' && !x.talk && x.dk != null && x.dk < -8.5 && !x.after);   /* [AFTER_PHOTO_191] 촬영 후 안내 줄(녹음 대기 · 소리 없음)만 뺀다 — ★[CLOSING_CHEER_195] 마무리 멘트도 지금 녹음 대기지만 엔진이 크기를 건다(재는 줄로 남긴다) */   /* ★[AFTER_PHOTO_191] 녹음 대기 줄(촬영 후 안내 등)은 나레이션 소리가 없어 음악을 내리지 않는다 — 소리 나는 줄만 잰다 */ await f.evaluate(() => { delete BgmPicks.SONGS.B17.vocal; });
      ok(`${W} D3 보컬 곡(시험 표시 B17) 아래 나레이션은 엔진 크기 − 6(−16 → −22)`, n3.length > 0 && n3.every((x) => Math.abs(x.want - (x.dk - 6)) < 0.01), { n: n3.length, s: n3.slice(0, 3) });
    }
    /* D6 · 5 축배 */
    /* ★[CHEER_WINDOW_1031] 듣는 창 16초 → 26초 — #1470(LISTEN_FIX_1031)이 축배 멘트 글을 바꾼 뒤 그 줄이 12.6초가 되어 «위하여» 꼬리(축배 곡)가 16.8초에 왔다.
       곡 바뀜은 그대로였는데 창이 먼저 닫혀 빨강이 났다 · 멘트 길이가 다시 늘어도 26초 안이면 잰다(실측 꼬리 16.8초) */
    await go(f, 'toast'); const b6 = await listen(f, 'toast', 26000);
    const ch = b6.findIndex((x) => x.cheer), pre = b6.slice(0, ch > -1 ? ch : 0).filter((x) => x.src), post = ch > -1 ? b6.slice(ch).filter((x) => x.src && !x.cheer) : [];
    /* ★[BGM_TIMING_1101] «위하여» 전 뜸 곡 = 테이블 인사 곡(담겼으면) · 아니면 축배 바로 앞 순간의 곡(BgmBed toastBed · 종전 닫는 인사 곡 B17) — 이 시험엔 테이블 곡 파일이 없어 앞 순간(부모님께 인사) 곡 */
    const tb6 = await f.evaluate(() => BgmBed._t.toastBed ? BgmBed._t.toastBed() : '');
    ok(`${W} D6 축배 — «위하여» 전은 테이블 · 앞 순간 곡(${tb6}) · 뒤는 축배 곡(B28) · 축배 크기(0)`, ch > -1 && !!tb6 && tb6 !== 'B17' && pre.length > 0 && pre.every((x) => x.f === tb6) && post.some((x) => x.f === 'B28' && x.want === 0), { ch, seq: [...new Set(b6.map((x) => (x.cheer ? '!' : '') + x.slug + ':' + x.f + ':' + x.want))].slice(0, 20) });
    /* 6 축사 · 편지 */
    await go(f, 'free'); const b7 = await listen(f, 'free', 9000); const t7 = b7.filter((x) => x.talk && x.src);
    ok(`${W} 6 축사 «음악 없이» — 말씀 동안 −90 · 곡 B09(감사 인사 1순위)`, t7.length && t7.every((x) => x.want === -90 && x.f === 'B09'), t7.slice(0, 3));
    await f.click('[data-fk="bgm:S5:bed"]'); await wait(f, 400); const rs = await row(f, 'M4S5');
    await shot(f, W, 'free', '.ls-bgm[data-slot="S5"]');
    ok(`${W} 6 축사 «음악과 함께» → 그 아래 곡 고르기(3) · 아래 «준비해요» 줄 없음`, rs && rs.n === 3 && rs.note === '', rs);
    if (W === 390) {
      const before = (await LOG(pg)).filter((x) => x === 'momentedit:ritualFileGet:bed:B13').length, held = await f.evaluate(() => { const o = BgmBed._t.BUF.B13; return !!(o && o.st === 'ok'); });   /* ★[BED_LOAD_1101 ④] 풀어 둔 곡은 셋까지 — 그 사이 다른 순간을 지나며 지워졌으면 한 번 다시 받는다(아직 들고 있으면 다시 묻지 않는다) */
      await f.click('[data-fk="bedp:M4S5:B13"]'); await wait(f, 1500);
      const d2 = await f.evaluate(() => ({ f: BgmBed._t.BED.cur.f, who: BgmBed._t.BED.who, p: document.querySelector('[data-fk="bedp:M4S5:B13"]').getAttribute('aria-pressed') }));
      const after = (await LOG(pg)).filter((x) => x === 'momentedit:ritualFileGet:bed:B13').length;
      ok(`${W} D2 한 파일 — 축사 칸 B13 곡 카드는 하객 맞이에서 받은 그 파일(다시 묻지 않는다 · key bed:B13 한 번)`, before === 1 && after === before + (held ? 0 : 1) && d2.f === 'B13' && d2.who === 'card' && d2.p === 'true', { before, after, held, d2 });
      await f.click('[data-fk="bedp:M4S5:B13"]'); await wait(f, 300);
    }
    const b8 = await listen(f, 'free', 9000); const t8a = b8.filter((x) => x.talk && x.src), i8 = t8a.length ? t8a[0].i : 99, t8 = t8a.slice(5), n8 = b8.filter((x) => !x.talk && x.src && x.i < i8);   /* 말씀 줄 첫 0.5초는 곡이 바뀌는 자리(3초 겹침이 시작) */   /* [DETAIL_R2_1101 ①] 여는 말은 본식 곡(M4) · 말씀부터 고른 곡 */
    ok(`${W} 6 축사 «음악과 함께» — 여는 말은 본식 곡(B09) · 말씀부터 곡 B13 · 말씀 동안 −20`, t8.length && t8.every((x) => x.want === -20 && x.f === 'B13') && n8.every((x) => x.f === 'B09'), { t8: t8.slice(0, 2), n8: n8.slice(0, 2) });
    /* D4 [R1-1] 초안이 통째로 바뀌면 칩 기억도 비운다 */
    await f.click('[data-fk="bgm:S5:none"]'); await wait(f, 200); await f.click('[data-fk="bgm:S5:bed"]'); await wait(f, 200);
    await f.evaluate(() => { S = JSON.parse(JSON.stringify(S)); if (S.bgm) { delete S.bgm.S5; delete S.bgm.S6; } render(); }); await go(f, 'free'); await wait(f, 300);
    const d4 = await f.evaluate(() => [...document.querySelectorAll('.ls-bgm[data-slot="S5"] .op-chip')].map((b) => b.getAttribute('aria-checked')));
    ok(`${W} D4 [R1-1] 초안이 바뀌면(저장에 «음악과 함께» 없음) 축사 칩은 안 눌린 모양으로`, d4.length === 2 && d4.every((v) => v === 'false'), d4);
    await f.click('[data-fk="bgm:S5:bed"]'); await wait(f, 300);
    await go(f, 'letter'); await f.click('[data-fk="bgm:S6:bed"]'); await wait(f, 300); await f.click('[data-fk="bed:M4S6:B12"]'); await wait(f, 300);
    const b9 = await listen(f, 'letter', 9000); const t9 = b9.filter((x) => x.talk && x.src).slice(5);   /* [DETAIL_R2_1101 ①] 낭독 줄 첫 0.5초는 곡이 바뀌는 자리 */
    ok(`${W} 6 편지 «음악과 함께» + 곡 고름 — S.bgm.S6 = { m:bed, k:B12 } · 낭독 동안 −20 · 곡 B12`, t9.length && t9.every((x) => x.want === -20 && x.f === 'B12') && (await f.evaluate(() => S.bgm.S6 && S.bgm.S6.m === 'bed' && S.bgm.S6.k === 'B12')), t9.slice(0, 2));
    /* 7 곡 없는 구간 */
    await go(f, 'table'); const l10 = await lab(f, 'table'); const b10 = await listen(f, 'table', 11000);   /* [DETAIL_R3_1101 ⑦ 보탬] 맨 뒤 B13 이 흐르므로 첫 줄 앞 뜸(6초 · listen 은 뜸을 세지 않는다) 뒤까지 */
    /* ★[DETAIL_R3_1101 ⑦ 보탬] 테이블 목록은 축사 «음악과 함께» 곡(B13)을 빼면 30분이 안 돼 맨 뒤로 보낸다(종전엔 뺐다) — 이 시험 드라이브엔 테이블 곡 가운데 B13 만 있어 그 곡이 흐른다 */
    const f10 = [...new Set(b10.filter((x) => x.src).map((x) => x.f))];
    ok(`${W} 7 테이블 인사(드라이브엔 맨 뒤 B13 하나뿐) — 있는 곡만 · 없는 곡을 기다리지 않는다 · 오류 없음`, /음악과 함께/.test(l10) && f10.join() === 'B13' && !errs.length, { l10, f10, errs });
    /* 8 한눈에 보기 */
    const sum = await f.evaluate(() => { const d = document.createElement('div'); d.innerHTML = BgmForm.sumHtml(); return [...d.querySelectorAll('.mk-vn')].map((x) => x.textContent.trim()); });
    ok(`${W} 8 한눈에 보기 — 화촉 · 고른 곡 · 감사 인사 · 고르지 않으시면 · 축사 · 편지 곡 · 차례(하객 맞이 → 화촉 → 입장 …)`, sum.includes('화촉 · ‹Summer›') && sum.includes('감사 인사 · 고르지 않으시면 ‹Innocent in Sonatine›') && sum.includes('축사 · 음악과 함께 · 고르지 않으시면 ‹Moon River›') && sum.includes('편지 · 음악과 함께 · ‹Under the Willow›') && sum.indexOf('화촉 · ‹Summer›') < sum.findIndex((t) => /^입장 곡/.test(t)), sum);
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
        return { m2: sel('M2'), want: 'B07', s6: sel('M4S6'), want6: 'B12', m1: sel('M1')[0], want1: 'B01', m4: sel('M4'), want4: L('M4')[0].id, tag: b ? b.textContent.indexOf('두 분이 고른 곡') > -1 : null }; });
      ok('9 당일 콘솔 — 고객이 고른 곡이 구간 기본(화촉 B07 · 편지 B12 · 하객 맞이는 고르지 않아 1순위 B01 맨 앞 · LIST_NO_PICK_1101) · 안 고른 구간은 1순위 · «두 분이 고른 곡» 표시', cs.m2 === cs.want && cs.s6 === cs.want6 && cs.m1 === cs.want1 && cs.m4 === cs.want4 && cs.tag === true, cs);
      await cp.close();
    }
    await ctx.close();
  }
  /* B 공개 미리보기 */
  { const { ctx, pg, f, errs } = await open(390, false);
    await go(f, 'candle'); const r = await row(f, 'M2'); const l = await lab(f, 'candle');
    ok('B 공개 — «화촉 음악» 곡 이름 · 한 줄만 · ▶ 없음 · 아래 한 줄 «마이페이지에서 들어 볼 수 있어요»뿐 · 단추에 «음악과 함께» 없음', r && r.n === 3 && r.pl === 0 && r.note === '마이페이지에서 들어 볼 수 있어요' && !/음악과 함께/.test(l), { r, l });
    await go(f, 'vow'); const pub = await f.evaluate(() => ((document.querySelector('.bed-pub') || {}).textContent || '').trim());
    ok('B 공개 — 곡 줄이 없는 쪽(혼인 서약)은 듣기 아래 «음악은 마이페이지에서 함께 들어 볼 수 있어요»', pub === '음악은 마이페이지에서 함께 들어 볼 수 있어요', pub);
    await go(f, 'candle'); const pub2 = await f.evaluate(() => !!document.querySelector('.bed-pub'));
    ok('B 공개 — 곡 줄이 있는 쪽(화촉)은 그 한 줄을 다시 두지 않는다', !pub2);
    ok('B 공개 — 곡을 받지 않는다(key bed 묻지 않음)', !(await f.evaluate(() => Object.keys(BgmBed._t.BUF).length)) && (await f.evaluate(() => BgmBed._t.AV.st)) === '');
    ok('B 공개 — 오류 없음 · 가로 넘침 없음', !errs.length && !(await f.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), errs);
    await shot(f, 390, 'public', '.ls-bed[data-seg="M2"]');
    await ctx.close(); }
  /* F [SONG_CARD_TAP_1101] 곡 카드 ▶ 첫 탭 — 곡이 3초 늦게 온다 · 아이폰 흉내(누른 흐름 밖에서 연 소리 길은 소리가 안 난다 · 데이터 절약 켬) */
  { const IOS = () => { let g = false; addEventListener('click', () => { g = true; setTimeout(() => { g = false; }, 0); }, true);
      try { Object.defineProperty(navigator, 'connection', { configurable: true, get: () => ({ saveData: true }) }); } catch (e) {}
      window.__ios = []; const P = window.AudioBufferSourceNode && AudioBufferSourceNode.prototype; if (!P) return; const st = P.start;
      P.start = function (...a) { const c = this.context; if (g) c.__ul = true; window.__ios.push({ ul: !!c.__ul, g, n: this.buffer ? this.buffer.length : 0 }); return st.apply(this, a); }; };
    const { ctx, pg, f, errs } = await open(390, true, IOS);
    await go(f, 'candle'); await wait(f, 600);
    const bedN = async (id) => (await LOG(pg)).filter((x) => x === 'momentedit:ritualFileGet:bed:' + id).length;
    const n0 = await bedN('B05');
    ok('F0 데이터 절약이면 곡 칸이 보여도 미리 받지 않는다', n0 === 0, await LOG(pg));
    await pg.evaluate(() => { H.delay = 3000; }); await f.evaluate(() => { window.__ios.length = 0; });
    const ft = () => f.evaluate(() => { const b = document.querySelector('[data-fk="bedp:M2:B05"]'); return { cls: b ? b.className : '', busy: b ? b.getAttribute('aria-busy') : null, pr: b ? b.getAttribute('aria-pressed') : null,
      note: ((document.querySelector('.ls-bed[data-seg="M2"] .mu-ld') || {}).textContent || '').trim(), below: document.querySelectorAll('.ls-bed[data-seg="M2"] .bed-load').length, st: BgmBed._t.CARD.st, who: BgmBed._t.BED.who, src: !!BgmBed._t.BED.cur.src, ios: window.__ios.slice() }; });
    await f.click('[data-fk="bedp:M2:B05"]'); await wait(f, 120); const t1 = await ft();
    ok('F1 첫 탭 즉시 — ▶ 가 차오름(wfill · ld · aria-busy) · 아직 안내 글 없음', /\bwfill\b/.test(t1.cls) && /\bld\b/.test(t1.cls) && t1.busy === 'true' && t1.st === 'load' && !t1.note, t1);
    ok('F2 누른 흐름 안에서 소리 길을 연다 — 그 순간 무음 한 칸 재생', t1.ios.some((x) => x.g && x.n <= 1), t1.ios);
    await wait(f, 1500); const t2 = await ft();
    await shot(f, 390, 'tap-load', '.ls-bed[data-seg="M2"]');
    ok('F3 1.5초가 넘으면 누른 곡 줄 안 «불러오는 중»(목록 아래 줄 0 · ROW_FILL_PLAY_1101 보탬) · ▶ 는 계속 차오름', t2.note === '불러오는 중' && t2.below === 0 && /\bld\b/.test(t2.cls), t2);
    await wait(f, 2400); const t3 = await ft(); const big = t3.ios.filter((x) => x.n > 1);
    ok('F4 곡이 오면 그 길로 튼다 — 곡 재생 1번 · 아이폰 흉내에서도 소리 남 · ■ · 차오름 · 안내 글 걷힘', t3.who === 'card' && t3.st === 'play' && t3.src && big.length === 1 && big[0].ul && t3.pr === 'true' && !/\bld\b/.test(t3.cls) && !t3.note, { ...t3, ios: t3.ios.slice(0, 6) });
    ok('F5 손가락이 닿을 때 받기 시작한 곡을 누른 뒤 다시 묻지 않는다(key bed B05 한 번)', (await bedN('B05')) === 1, await LOG(pg));
    await f.click('[data-fk="bedp:M2:B05"]'); await wait(f, 1000);
    /* 받는 중에 다른 ▶ — 앞 결과는 버리고 새 곡만 */
    await f.evaluate(() => { delete BgmBed._t.BUF.B05; window.__ios.length = 0; });
    await f.click('[data-fk="bedp:M2:B05"]'); await wait(f, 500); await f.click('[data-fk="bedp:M2:B07"]'); await wait(f, 4200);
    const t4 = await f.evaluate(() => ({ f: BgmBed._t.CARD.f, st: BgmBed._t.CARD.st, n: window.__ios.filter((x) => x.n > 1).length, b5: document.querySelector('[data-fk="bedp:M2:B05"]').getAttribute('aria-pressed'), b6: document.querySelector('[data-fk="bedp:M2:B07"]').getAttribute('aria-pressed') }));
    ok('F6 받는 중에 다른 ▶(B07)을 누르면 앞 곡(B05) 결과는 버리고 새 곡만 튼다(곡 재생 1번)', t4.f === 'B07' && t4.st === 'play' && t4.n === 1 && t4.b5 === 'false' && t4.b6 === 'true', t4);
    await f.click('[data-fk="bedp:M2:B07"]'); await wait(f, 1000);
    /* 못 받으면 — 알림 + ▶ 로 되돌림 */
    await pg.evaluate(() => { delete H.songs.B05; }); await f.evaluate(() => { delete BgmBed._t.BUF.B05; });
    await f.click('[data-fk="bedp:M2:B05"]'); await wait(f, 3500); const t5 = await ft();
    const ts = await f.evaluate(() => [...document.querySelectorAll('.mk-toast,.op-toast,[role="status"],[role="alert"]')].map((x) => (x.textContent || '').trim()).filter(Boolean).join(' | '));
    ok('F7 못 받으면 ▶ 로 되돌림(차오름 · 불러오는 중 걷힘 · 줄 안 «못 불러왔어요» 3초 · ROW_FILL_PLAY 보탬) · 알림 «곡을 준비하고 있어요»(GHIBLI_ADD_1101)', t5.st === '' && t5.pr === 'false' && !/\bld\b/.test(t5.cls) && (!t5.note || t5.note === '못 불러왔어요') && /곡을 준비하고 있어요/.test(ts), { ...t5, ios: 0, ts });
    ok('F 오류 없음 · 가로 넘침 없음', !errs.length && !(await f.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), errs);
    await ctx.close(); }
  /* F8 미리 받기 — 곡 칸이 화면에 들어오면 그 구간 첫 곡(1순위)을 조용히 받아 둔다 · 받았으면 다시 안 받음 · 누르면 바로 */
  { const { ctx, pg, f, errs } = await open(390, true);
    await go(f, 'candle'); await wait(f, 900);
    const lg = await LOG(pg), n = lg.filter((x) => /:bed:B/.test(x));
    await go(f, 'welcome'); await go(f, 'candle'); await wait(f, 600);
    const n2 = (await LOG(pg)).filter((x) => x === 'momentedit:ritualFileGet:bed:B05').length;
    ok('F8 곡 칸이 보이면 1순위(B05)를 미리 받는다 · 한 번에 하나 · 돌아와도 다시 안 받음', n.includes('momentedit:ritualFileGet:bed:B05') && n2 === 1 && (await f.evaluate(() => (BgmBed._t.BUF.B05 || {}).st)) === 'ok', { n, n2 });
    await f.click('[data-fk="bedp:M2:B05"]'); await wait(f, 200);
    ok('F9 미리 받은 곡은 누르면 바로 ■(기다림 없음)', (await f.evaluate(() => BgmBed._t.CARD.st)) === 'play', await f.evaluate(() => BgmBed._t.CARD));
    ok('F8 오류 없음', !errs.length, errs);
    await ctx.close(); }
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 500)); }
await br.close(); srv.close();
console.log(fail ? `BGM PREVIEW FAIL ${fail}` : 'BGM PREVIEW OK');
process.exit(fail ? 1 : 0);
