#!/usr/bin/env node
/* ★★[REC_SONG_1012 2026-10-12 사장님 «추천대로»(추천 곡 1번 · 드라이브에 두고 로그인한 두 분에게만) · «왜 추천 노래 부분이 없어?»] 4단계-나 — 빌더 ② 입장 «추천 곡» 카드
   진짜 식순 화면을 «마이페이지 안»(order-preview.html?embed=1)으로 띄우고, 부모 창(가짜 마이페이지)이 GAS 대신 곡 목록 · 곡(합성음)을 준다(mypage.html 중계와 같은 모양).
   A 기기(390 · 1280)
   1 칩 둘 · 처음엔 안 눌린 모양 · «추천 곡» → 목록을 한 번 묻는다 · 받는 동안 카드 자리 «추천 곡을 불러오는 중이에요» → 카드(곡 수만큼 · 첫 카드 · 제목 · 가수 · 분위기 · 사진은 사이트 그림) · ‹ 꺼짐 · ✓ 안 눌림
   2 › → 다음 카드 · 점 · 알림 줄 · ← → 도 같다
   3 ▶ → 그 곡을 한 번 묻는다 · 받는 동안 ■(aria-busy) + 그 카드 가운데 «곡을 불러오는 중이에요» → 소리 · 소리 막대([NOW_EQ]) · 문이 열리는 자리 6초 앞부터([CAR_LEN80])
   4 가사([LY_SYNC · LY_ON_CUE · LY_FROM_HOOK]) — 문이 열리기 전에 끝나는 줄은 안 뜬다 · 문이 열리는 줄은 그 순간 뜬다 · 사진이 밝아진다(lit)
   5 넘겨도 듣던 노래는 그대로([CAR_KEEP_PLAY]) · 다른 카드에서도 ■ = 그 곡 멈추기 · 점이 금빛 · ■ → 멈춤 · 가사 걷힘
   6 ✓ → S.mu = 추천 곡(키 · 이름 · 가수 · 자리 = hook0 · 사진) · 접힌 한 줄([MU_FOLD]) · 알림 · 장면(음악과 함께 듣기)이 이 곡으로 짠다(H = hook0)
   7 «바꾸기» → 펼쳐 고른 곡 카드 · ✓ 눌린 모양 · 다시 ✓ → 풀림(S.mu 없음 · 장면 없음 · «고른 곡을 풀었어요»)
   8 저장 → 초안(orderDraft)에 S.mu 가 실려 간다(당일 콘솔이 보는 그것 · src rec · k · hook)
   9 이 기기에 둔 곡 — 다시 들으면 다시 묻지 않는다(새로 연 쪽에서도)
   10 올린 곡 ↔ 추천 곡 — 올린 곡을 고른 채 추천 곡을 고르면 올린 곡 기록은 S.muUp 으로(서버 파일 그대로) · «두 분이 고른 곡» 칩 → 곡 줄만(안 고른 모양) → 누르면 다시 그 곡(fid 그대로)
   11 못 받으면 — 목록 «추천 곡을 불러오지 못했어요 · 다시 불러오기 (코드 L6)» → 다시 불러오기 → 카드 · 곡 «곡을 불러오지 못했어요 · 인터넷을 확인해 주세요 (코드 L6)» · ▶ 로 돌아옴
   12 마이페이지 밖(embed 아님) — «추천 곡은 마이페이지에서 들어 볼 수 있어요» · 아무것도 묻지 않는다
   13 쪽 오류 없음 · 가로 넘침 없음
   ★[REC_CLIP_1013 2026-10-13 사장님 «기다림 완전 짧게 · 없으면 더 좋고»] 미리 받기 · 짧은 판
   1 · 3 은 이제 — ② 입장 쪽을 열면 칩을 누르기 전에 목록과 첫 카드 곡을 받아 둔다 · «추천 곡»을 누르면 목록을 다시 묻지 않는다 · ▶ 는 바로 소리
   14 미리 받기 — 칩 전에는 받아만(풀지 않는다) · 칩을 누르면 지금 카드를 풀고 다음 카드를 받는다 · 받는 중에 ▶ 를 누르면 같은 받기를 기다린다(두 번 묻지 않는다 · ■ aria-busy)
   15 짧은 판 — 목록에 pf 가 있으면 '<키>-p' 만 묻는다 · 미리 듣기 자리 · 가사는 원곡 시각 그대로 · 장면은 판이 다 담으면 그 판 · 못 담으면 곡 전체를 묻는다
      [BGM_FIRST_1013] 멘트가 곡 앞부분보다 길면 같은 소절이 다시 나오는 뒤 자리(hooks)에 문 열림 · 음악이 4초 먼저 · «늦게 들어와요» 알림 없음
      [REC_CLIP_1013 2번] 고른 곡을 받는 동안 그래프 칸에 «곡을 불러오는 중이에요»
   시험 곡은 여기서 만든다(합성음 · 저장소에 음원 · 가사를 두지 않는다).  종료 코드 0 통과 · 1 실패 · 2 재지 못함
   EM_MOD = 돌연변이 확인용 — 그 판의 entry-music.js 로 잰다 · SHOT=폴더 — 카드를 그림으로 남긴다(눈으로 보기) */
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const MOD = process.env.EM_MOD || '', SHOT = process.env.SHOT || '';
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 500)}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
/* 시험 곡 — WAV 16bit 모노 22050 · 앞은 작게 · hook 초부터 크게(0.5초 박) · 곡마다 높이가 달라 바이트가 다르다 */
function wav(sec, hook, f, sr = 22050) { const n = sr * sec, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  let s = 11; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 - 0.5; };
  for (let i = 0; i < n; i++) { const t = i / sr, a = t >= hook ? 0.45 * ((t % 0.5) < 0.06 ? 1 : 0.35) : 0.05, v = a * (Math.sin(2 * Math.PI * f * t) * 0.6 + Math.sin(2 * Math.PI * f * 1.5 * t) * 0.3 + rnd() * 0.2); b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * 32767))), 44 + i * 2); }
  return b.toString('base64'); }
/* 곡 목록 — 드라이브 목록과 같은 칸(키 · 이름 · 가수 · 분위기 · 자리 · 사진 · 가사) · 가사는 시험 글(가짜) */
const LIST = [
  { k: 'r1', name: '경쾌하게', t: 'Test Song One', a: '시험 가수', hook: 40, hook0: 40.06, len: 70, img: '/assets/home/snap.webp', pos: '58% 50%', file: 'r1.mp3',
    ly: [[37.5, 'before the door', '문 앞'], [40.4, 'line one', '첫 줄'], [43.2, 'line two', '둘째 줄']] },
  { k: 'r3', name: '웅장하게', t: '시험 행진곡', a: '시험 작곡가', hook: 40, hook0: 40.07, len: 70, img: '/assets/home/gallery-05.webp', pos: '50% 24%', file: 'r3.mp3' },
  { k: 'r9', name: '잔잔하게', t: 'Test Song Nine', a: '시험 OST', hook: 40, hook0: 40.05, len: 70, img: '/assets/home/gallery-01.webp', pos: '38% 50%', file: 'r9.mp3', lyEn: 'dreams line', lyKo: '꿈 줄', lyT: [36, 40.3, 44], lyAt: [40.3] },
  { k: '../bad', name: '나쁜 키', t: 'bad', hook: 10, len: 70 } ];   // 키가 이상하다 — 화면에서 빠진다
const SONGS = { r1: wav(70, 40, 220), r3: wav(70, 40, 262), r9: wav(70, 40, 196) };
/* [REC_CLIP_1013] 짧은 판 — 같은 WAV 의 [t0, t1) 만(원곡 프레임을 그대로 자른 것과 같은 뜻) */
function wavCut(b64, t0, t1, sr = 22050) { const b = Buffer.from(b64, 'base64'), a = Math.round(t0 * sr), z = Math.round(t1 * sr), n = z - a, o = Buffer.alloc(44 + n * 2); b.copy(o, 0, 0, 44); o.writeUInt32LE(36 + n * 2, 4); o.writeUInt32LE(n * 2, 40); b.copy(o, 44, 44 + a * 2, 44 + z * 2); return o.toString('base64'); }
const LISTC = [
  Object.assign({}, LIST[0], { pf: 'r1p.mp3', p0: 10, p1: 66, g: 1.5, hooks: [40.06] }),   // 장면을 다 담는 판
  { k: 'r3', name: '웅장하게', t: '이른 자리 곡', a: '시험 작곡가', hook: 12, hook0: 12, len: 70, img: '/assets/home/gallery-05.webp', pos: '50% 24%', file: 'r3.mp3', pf: 'r3p.mp3', p0: 0, p1: 70, hooks: [12, 45] },   // 앞부분(12초)이 멘트보다 짧다 — 뒤 자리 45초
  Object.assign({}, LIST[2], { pf: 'r9p.mp3', p0: 34, p1: 70, hooks: [40.05] }) ];   // 판이 장면 앞부분을 못 담는다 — 곡 전체
const SONGSC = { 'r1-p': wavCut(SONGS.r1, 10, 66), 'r3-p': wavCut(SONGS.r3, 0, 70), 'r9-p': wavCut(SONGS.r9, 34, 70), r1: SONGS.r1, r3: SONGS.r3, r9: SONGS.r9 };
const HARNESS = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><iframe id="fr" style="width:100vw;height:100vh;border:0;display:block"></iframe>
<script>
window.H={files:{},log:[],dels:[],draft:null,saved:null,failList:0,failSong:0,failId:{},delay:60,listDelay:60,n:0,list:null,songs:null};
var fr=document.getElementById('fr');
function back(m){ fr.contentWindow.postMessage(m, location.origin); }
window.go=function(){ fr.src='/order-preview.html?embed=1'; };
window.addEventListener('message',function(ev){ var d=ev.data||{}; if(ev.origin!==location.origin||ev.source!==fr.contentWindow) return;
  if(/^momentedit:ritualFile/.test(d.type||'')) H.log.push(d.type+':'+(d.data&&d.data.key)+':'+(d.data&&d.data.id||''));
  if(d.type==='momentedit:orderReady'){ back({type:'momentedit:orderFill',draft:H.draft,done:false,cust:{name:'시험',code:'TEST01'}}); return; }
  if(d.type==='momentedit:orderDraft'){ H.saved=JSON.parse(JSON.stringify(d.data&&d.data.S||null)); back({type:'momentedit:orderDraftSaved'}); return; }
  if(d.type==='momentedit:ritualFile'){ var x=d.data; setTimeout(function(){ var id='FILE'+(++H.n)+'abcdefghij'; H.files[id]={key:x.key,name:x.name,mime:x.mime,data:String(x.data).replace(/^data:[^,]*,/,'')};
      back({type:'momentedit:ritualFileDone',key:x.key,tk:x.tk,ok:true,id:id,name:x.name,at:'2026-10-12 10:00'}); }, H.delay); return; }
  if(d.type==='momentedit:ritualFileGet'){ var g=d.data;
    if(g.key==='rec'){ if(g.id==='list'){ setTimeout(function(){ if(H.failList>0){ H.failList--; back({type:'momentedit:ritualFileData',key:'rec',id:'list',ok:false,error:'추천 곡을 불러오지 못했어요 (코드 L6)',ecode:'L6'}); return; }
          back({type:'momentedit:ritualFileData',key:'rec',id:'list',ok:true,songs:H.list}); }, H.listDelay); return; }
      setTimeout(function(){ if(H.failId[g.id]>0||H.failSong>0||!H.songs[g.id]){ if(H.failId[g.id]>0) H.failId[g.id]--; else if(H.failSong>0) H.failSong--; back({type:'momentedit:ritualFileData',key:'rec',id:g.id,ok:false,error:'곡을 불러오지 못했어요 (코드 L6)',ecode:'L6'}); return; }
        back({type:'momentedit:ritualFileData',key:'rec',id:g.id,ok:true,mime:'audio/wav',data:H.songs[g.id]}); }, H.delay); return; }
    var f=H.files[g.id]; setTimeout(function(){ if(!f){ back({type:'momentedit:ritualFileData',key:g.key,id:g.id,ok:false,error:'파일을 불러오지 못했어요 (코드 L6)',ecode:'L6'}); return; }
      back({type:'momentedit:ritualFileData',key:g.key,id:g.id,ok:true,mime:f.mime,data:f.data}); }, H.delay); return; }
  if(d.type==='momentedit:ritualFileDel'){ var q=d.data; H.dels.push(q.id); delete H.files[q.id]; back({type:'momentedit:ritualFileDelDone',key:q.key,id:q.id,ok:true}); return; }
});
</script>`;
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/__harness.html') { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(HARNESS); return; }
  const p = (MOD && u === '/assets/entry-music.js') ? MOD : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
/* 올린 곡(10) — WAV 파일 */
const UPF = path.join(os.tmpdir(), 'rec-ui-up.wav'); fs.writeFileSync(UPF, Buffer.from(wav(90, 35, 247), 'base64'));
const fr = (pg) => pg.frames().find((f) => /order-preview\.html/.test(f.url()));
async function open(ctx, seed, embed = true) {
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); return rt.fulfill({ status: 200, body: '' }); });
  let f;
  if (embed) {
    await pg.goto(`http://127.0.0.1:${port}/__harness.html`, { waitUntil: 'load' });
    await pg.evaluate((sd) => { H.list = sd.list; H.songs = sd.songs; if (sd.draft) H.draft = sd.draft; if (sd.files) { H.files = sd.files; H.n = sd.n; } if (sd.listDelay) H.listDelay = sd.listDelay; if (sd.delay) H.delay = sd.delay; if (sd.failList) H.failList = sd.failList; if (sd.failId) H.failId = sd.failId; }, Object.assign({ list: LIST, songs: SONGS }, seed || {}));
    await pg.evaluate(() => go()); await pg.waitForFunction(() => { const f = document.getElementById('fr'); return f.contentWindow && f.contentWindow.EntryMusic && f.contentWindow.document.readyState === 'complete'; }, null, { timeout: 30000 });
    await pg.waitForTimeout(900); f = fr(pg);
  } else { await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await pg.waitForTimeout(700); f = pg.mainFrame(); }
  await f.evaluate(() => { window.__toasts = []; const o = window._lsToast; window._lsToast = function (m) { window.__toasts.push(String(m)); return o.apply(this, arguments); }; });
  return { pg, f, errs };
}
const clickNext = async (f) => { if (await f.isVisible('#next')) await f.click('#next'); else await f.click('.pk-go'); };
async function toEntry(f) {
  if (!(await f.evaluate(() => !!document.querySelector('.ls-mu')))) {
    for (let i = 0; i < 3; i++) { await clickNext(f); await f.waitForTimeout(i === 2 ? 1500 : 500); }
    await f.evaluate(() => mkGo('entry')); await f.waitForTimeout(800);
    if (await f.evaluate(() => !!document.querySelector('[data-fk="lsc:entryVoice:nar"]'))) { await f.click('[data-fk="lsc:entryVoice:nar"]'); await f.waitForTimeout(600); }
  }
  return f.evaluate(() => !!document.querySelector('.ls-mu'));
}
const HL = (pg) => pg.evaluate(() => H.log.slice());
const recReqs = (log, id) => log.filter((x) => x === 'momentedit:ritualFileGet:rec:' + id).length;
const view = (f) => f.evaluate(() => { const r = document.querySelector('.ls-mu'), c = r && r.querySelector('.mu-car:not(.mu-car0)'), sl = c ? [...c.querySelectorAll('.mu-slide')] : [], cur = sl.find((x) => x.classList.contains('cur'));
  const t = c && c.querySelector('.mu-tpp'), pk = c && c.querySelector('.mu-pk'), fd = r && r.querySelector('.mu-fold');
  return { chips: r ? [...r.querySelectorAll('.mu-src [role="radio"]')].map((x) => x.getAttribute('aria-checked')).join(',') : '', wait: ((r && r.querySelector('.mu-car0 .mu-wt')) || {}).textContent || '', err: ((r && r.querySelector('.mu-rec0')) || {}).textContent || '',
    n: sl.length, keys: sl.map((x) => x.getAttribute('data-k')).join(','), cur: cur ? cur.getAttribute('data-k') : null, tt: cur ? (cur.querySelector('.mu-tt') || {}).textContent : '', ta: cur ? (cur.querySelector('.mu-ta') || {}).textContent : '', img: cur && cur.querySelector('.mu-ph img') ? cur.querySelector('.mu-ph img').getAttribute('src') : '',
    lit: !!(cur && cur.classList.contains('lit')), pl: sl.filter((x) => x.classList.contains('pl')).map((x) => x.getAttribute('data-k')).join(','), ly: cur ? cur.querySelector('.mu-lines').textContent : '', lyAll: sl.map((x) => x.querySelector('.mu-lines').textContent).join('|'), lyOn: cur ? cur.querySelector('.mu-lines').classList.contains('cur') : false,
    arl: c ? c.querySelector('.mu-arl').getAttribute('aria-disabled') : null, arr: c ? c.querySelector('.mu-arr').getAttribute('aria-disabled') : null, tpp: t ? { p: t.getAttribute('aria-pressed'), l: t.getAttribute('aria-label'), b: t.getAttribute('aria-busy') } : null,
    pk: pk ? { p: pk.getAttribute('aria-pressed'), l: pk.getAttribute('aria-label'), on: pk.classList.contains('on') } : null, dots: c ? [...c.querySelectorAll('.mu-dots i')].map((d) => d.className || '-').join(',') : '', live: ((r && r.querySelector('.mu-live')) || {}).textContent || '',
    fold: fd ? { t: (fd.querySelector('.mu-ftt') || {}).textContent, a: (fd.querySelector('.mu-fta') || {}).textContent, img: fd.querySelector('img') ? fd.querySelector('img').getAttribute('src') : '', exp: fd.getAttribute('aria-expanded') } : null,
    eq: (() => { const e = cur && cur.querySelector('.mu-eq'); return e ? getComputedStyle(e).opacity : null; })(), mu: window.S && S.mu ? JSON.parse(JSON.stringify(S.mu)) : null, muUp: window.S && S.muUp ? JSON.parse(JSON.stringify(S.muUp)) : null,
    rec: EntryMusic._t.rec(), scene: !!document.querySelector('.em-scene'), toasts: (window.__toasts || []).slice(), focus: document.activeElement && document.activeElement.getAttribute('data-fk'), over: document.documentElement.scrollWidth > innerWidth + 1 }; });
const shot = async (f, W, n) => { if (!SHOT) return; try { fs.mkdirSync(SHOT, { recursive: true }); await f.locator('.ls-mu').screenshot({ path: path.join(SHOT, `rec-${W}-${n}.png`) }); } catch {} };
const vshot = async (pg, f, W, n) => { if (!SHOT) return; try { await f.evaluate(() => { const c = document.querySelector('.ls-mu .mu-box'); if (c) c.scrollIntoView({ block: 'center' }); }); await f.waitForTimeout(300); await pg.screenshot({ path: path.join(SHOT, `rec-${W}-${n}-vp.png`) }); } catch {} };   // 한 화면 — 떠 있는 것(레일 · 상담 말풍선)이 ✓ · ▶ 를 가리지 않는지
try {
  for (const W of [390, 1280]) {
    const ctx = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: W < 1000 });
    const { pg, f, errs } = await open(ctx, { listDelay: 9000 });   // 목록이 늦게 오게 — 칩을 누를 때 아직 받는 중
    const at = await toEntry(f); ok(`${W} 0 마이페이지 안(embed) 식순 ② 입장 — 입장 음악 줄`, at);
    if (!at) { await ctx.close(); continue; }
    // 1
    const V0 = await view(f), L0 = await HL(pg);
    await f.click('[data-fk="musrc:rec"]'); await f.waitForTimeout(400); const V1a = await view(f), L1a = await HL(pg); await shot(f, W, '1-wait');
    await f.waitForFunction(() => !!document.querySelector('.ls-mu .mu-car:not(.mu-car0) .mu-slide'), null, { timeout: 20000 }).catch(() => {}); await f.waitForTimeout(400);
    const V1 = await view(f), L1 = await HL(pg); await shot(f, W, '1-card'); await vshot(pg, f, W, '1-card');
    ok(`${W} 1a 칩 둘 처음엔 안 눌린 모양 · 칩을 누르기 전에 목록을 한 번 받아 둔다([REC_CLIP_1013]) · «추천 곡» → 눌린 모양 · 다시 묻지 않는다 · 아직 받는 중이면 카드 자리 «추천 곡을 불러오는 중이에요»`, V0.chips === 'false,false' && recReqs(L0, 'list') === 1 && V1a.chips === 'false,true' && V1a.wait === '추천 곡을 불러오는 중이에요' && recReqs(L1a, 'list') === 1, { V0: V0.chips, L0, V1a: { chips: V1a.chips, wait: V1a.wait }, L1a });
    ok(`${W} 1b 카드 — 곡 수만큼(이상한 키는 빠진다) · 첫 카드 · 제목 · «가수 · 분위기» · 사진은 사이트 그림 · ‹ 꺼짐 › 켜짐 · ✓ 안 눌림 · ▶ «… 들어 보기» · 목록은 한 번만`,
      V1.n === 3 && V1.keys === 'r1,r3,r9' && V1.cur === 'r1' && V1.tt === 'Test Song One' && V1.ta === '시험 가수 · 경쾌하게' && V1.img === '/assets/home/snap.webp' && V1.arl === 'true' && V1.arr === 'false' && V1.pk && V1.pk.p === 'false' && !V1.pk.on && V1.tpp && V1.tpp.p === 'false' && V1.tpp.l === 'Test Song One 들어 보기' && V1.dots === 'on,-,-' && recReqs(L1, 'list') === 1 && !V1.over,
      { n: V1.n, keys: V1.keys, cur: V1.cur, tt: V1.tt, ta: V1.ta, img: V1.img, arl: V1.arl, arr: V1.arr, pk: V1.pk, tpp: V1.tpp, dots: V1.dots, list: recReqs(L1, 'list'), over: V1.over });
    // 2
    await f.click('.ls-mu [data-fk="mucarnext"]'); await f.waitForTimeout(600); const V2a = await view(f);
    await f.focus('.ls-mu [data-fk="mucarnext"]'); await f.press('.ls-mu [data-fk="mucarnext"]', 'ArrowRight'); await f.waitForTimeout(600); const V2b = await view(f);
    await f.press('.ls-mu [data-fk="mucarnext"]', 'ArrowLeft'); await f.waitForTimeout(600); const V2c = await view(f);
    ok(`${W} 2 › → 다음 카드 · 점 · 알림 줄 «2 / 3 · 시험 행진곡 · 시험 작곡가» · ← → 도 같다 · 끝 카드에서 › 꺼짐`, V2a.cur === 'r3' && V2a.dots === '-,on,-' && V2a.live === '2 / 3 · 시험 행진곡 · 시험 작곡가' && V2a.arl === 'false' && V2b.cur === 'r9' && V2b.arr === 'true' && V2c.cur === 'r3' && V2a.tt === '시험 행진곡', { V2a: [V2a.cur, V2a.dots, V2a.live, V2a.arl], V2b: [V2b.cur, V2b.arr], V2c: V2c.cur });
    await f.click('.ls-mu [data-fk="mucarprev"]'); await f.waitForTimeout(600);   // 첫 카드(r1)로
    // 3
    await f.waitForFunction(() => EntryMusic._t.rec().buf.includes('r1'), null, { timeout: 15000 }).catch(() => {});   // 칩을 눌렀으니 지금 카드(r1)는 받아서 풀어 둔다
    await f.click('.ls-mu [data-fk="mucarplay"]'); await f.waitForTimeout(350); const V3a = await view(f);
    await f.waitForFunction(() => { const r = EntryMusic._t.rec(); return r.prev === 'r1'; }, null, { timeout: 30000 }).catch(() => {}); await f.waitForTimeout(500);
    const V3 = await view(f), L3 = await HL(pg); await shot(f, W, '3-play');
    ok(`${W} 3a ▶ → 미리 받아 둔 곡이라 바로 소리(기다림 없음 · aria-busy 없음) · 곡은 모두 한 번만 물었다([REC_CLIP_1013])`, V3a.rec.prev === 'r1' && !V3a.rec.want && V3a.tpp.p === 'true' && V3a.tpp.b === null && V3a.tpp.l === 'Test Song One 멈추기' && recReqs(L3, 'r1') === 1, { V3a: { prev: V3a.rec.prev, want: V3a.rec.want, tpp: V3a.tpp, ly: V3a.ly }, req: recReqs(L3, 'r1') });
    ok(`${W} 3b 받으면 소리 · ■ · 소리 막대 보임([NOW_EQ]) · 문이 열리는 자리 6초 앞부터([CAR_LEN80])`, V3.rec.prev === 'r1' && V3.tpp.p === 'true' && V3.tpp.b === null && V3.pl === 'r1' && +V3.eq > 0.5 && V3.rec.x != null && V3.rec.x >= 34 && V3.rec.x < 36.5 && V3.ly === '', { prev: V3.rec.prev, tpp: V3.tpp, pl: V3.pl, eq: V3.eq, x: V3.rec.x, ly: V3.ly });
    // 4 — 문 앞 줄(37.5~40.4)은 안 뜬다 · 문이 열리는 줄(40.4)은 그 순간 · 사진이 밝아진다
    await f.waitForFunction(() => { const r = EntryMusic._t.rec(); return r.x != null && r.x >= 38.6; }, null, { timeout: 15000 }).catch(() => {}); const V4a = await view(f);
    await f.waitForFunction(() => { const r = EntryMusic._t.rec(); return r.x != null && r.x >= 40.9; }, null, { timeout: 15000 }).catch(() => {}); await f.waitForTimeout(250); const V4b = await view(f); await shot(f, W, '4-lyric');
    ok(`${W} 4 가사 — 문이 열리기 전에 끝나는 줄 «before the door»는 안 뜬다 · 문이 열리는 줄 «line one · 첫 줄»은 그 순간 · 사진이 밝아진다(lit) [LY_FROM_HOOK · LY_ON_CUE]`, V4a.ly === '' && !V4a.lit && V4b.ly === 'line one첫 줄' && V4b.lyOn && V4b.lit, { V4a: { x: V4a.rec.x, ly: V4a.ly, lit: V4a.lit }, V4b: { x: V4b.rec.x, ly: V4b.ly, lit: V4b.lit } });
    // 5
    await f.click('.ls-mu [data-fk="mucarnext"]'); await f.waitForTimeout(600); const V5a = await view(f);
    await f.click('.ls-mu [data-fk="mucarplay"]'); await f.waitForTimeout(700); const V5b = await view(f);
    ok(`${W} 5 넘겨도 듣던 노래 그대로([CAR_KEEP_PLAY]) · 다른 카드에서 ■ «Test Song One 멈추기» · 점이 금빛(pl) · ■ → 멈춤 · 가사 걷힘 · ▶ 로`, V5a.cur === 'r3' && V5a.rec.prev === 'r1' && V5a.tpp.p === 'true' && V5a.tpp.l === 'Test Song One 멈추기' && V5a.dots === 'pl,on,-' && !V5b.rec.prev && !V5b.rec.want && V5b.tpp.p === 'false' && V5b.tpp.l === '시험 행진곡 들어 보기' && !/line one/.test(V5b.lyAll),
      { V5a: [V5a.cur, V5a.rec.prev, V5a.tpp, V5a.dots], V5b: [V5b.rec.prev, V5b.tpp, V5b.lyAll] });
    await f.click('.ls-mu [data-fk="mucarprev"]'); await f.waitForTimeout(600);
    // 6
    await f.click('.ls-mu [data-fk="mucarpick"]'); await f.waitForTimeout(700);
    await f.waitForFunction(() => !!document.querySelector('.em-scene [data-fk="emscene"]') && EntryMusic._t.scene().plan, null, { timeout: 30000 }).catch(() => {}); await f.waitForTimeout(300);
    const V6 = await view(f), SC6 = await f.evaluate(() => EntryMusic._t.scene()); await shot(f, W, '6-fold');
    ok(`${W} 6a ✓ → S.mu = 추천 곡(키 · 이름 · 가수 · 자리 = hook0 · 사진 · 길이) · 접힌 한 줄([MU_FOLD] 제목 · «가수 · 분위기» · 사진) · 알림 · 초점은 접힌 줄`, V6.mu && V6.mu.src === 'rec' && V6.mu.k === 'r1' && V6.mu.t === 'Test Song One' && V6.mu.a === '시험 가수' && V6.mu.hook === 40.06 && V6.mu.dur === 70 && V6.mu.img === '/assets/home/snap.webp' && !V6.muUp
      && V6.fold && V6.fold.t === 'Test Song One' && V6.fold.a === '시험 가수 · 경쾌하게' && V6.fold.img === '/assets/home/snap.webp' && V6.fold.exp === 'false' && V6.n === 0 && V6.toasts.includes('이 곡으로 들어가요') && V6.focus === 'mufold', { mu: V6.mu, fold: V6.fold, n: V6.n, toasts: V6.toasts, focus: V6.focus });
    ok(`${W} 6b 장면(음악과 함께 듣기)이 이 곡으로 짠다 — H = hook0(당일 콘솔과 같은 자리)`, V6.scene && SC6.plan && Math.abs(SC6.plan.H - 40.06) < 0.01, { scene: V6.scene, plan: SC6.plan });
    // 7
    await f.click('.ls-mu [data-fk="mufold"]'); await f.waitForTimeout(700); const V7a = await view(f);
    await f.click('.ls-mu [data-fk="mucarpick"]'); await f.waitForTimeout(600); const V7b = await view(f);
    ok(`${W} 7 «바꾸기» → 펼쳐 고른 곡 카드 · ✓ 눌린 모양 · 초점 ✓ · 다시 ✓ → 풀림(S.mu 없음 · 장면 없음 · «고른 곡을 풀었어요») · 펼친 그대로`, V7a.n === 3 && V7a.cur === 'r1' && V7a.pk.p === 'true' && V7a.pk.on && V7a.focus === 'mucarpick' && !V7b.mu && !V7b.scene && V7b.toasts.includes('고른 곡을 풀었어요') && V7b.n === 3 && V7b.pk.p === 'false',
      { V7a: [V7a.n, V7a.cur, V7a.pk, V7a.focus], V7b: [V7b.mu, V7b.scene, V7b.n, V7b.pk] });
    // 8
    await f.click('.ls-mu [data-fk="mucarnext"]'); await f.waitForTimeout(500); await f.click('.ls-mu [data-fk="mucarnext"]'); await f.waitForTimeout(500);
    await f.click('.ls-mu [data-fk="mucarpick"]'); await f.waitForTimeout(600);
    await f.evaluate(() => window._saveBakeSend()); await pg.waitForFunction(() => H.saved && H.saved.mu, null, { timeout: 15000 }).catch(() => {});
    const SV8 = await pg.evaluate(() => H.saved && H.saved.mu);
    ok(`${W} 8 저장 → 초안에 S.mu(src rec · 키 · hook0 · 이름) — 당일 콘솔이 이것을 본다(adminRitualFileGet rec:키)`, SV8 && SV8.src === 'rec' && SV8.k === 'r9' && SV8.hook === 40.05 && SV8.t === 'Test Song Nine', SV8);
    // 9 — 이 기기에 둔 곡
    const L9a = await HL(pg); await f.click('.ls-mu [data-fk="mufold"]'); await f.waitForTimeout(600);
    await f.click('.ls-mu [data-fk="mucarprev"]'); await f.waitForTimeout(400); await f.click('.ls-mu [data-fk="mucarprev"]'); await f.waitForTimeout(500);
    await f.click('.ls-mu [data-fk="mucarplay"]'); await f.waitForFunction(() => EntryMusic._t.rec().prev === 'r1', null, { timeout: 30000 }).catch(() => {});
    const L9b = await HL(pg), V9 = await view(f); await f.click('.ls-mu [data-fk="mucarplay"]'); await f.waitForTimeout(300);
    ok(`${W} 9a 다시 들으면 다시 묻지 않는다(이 기기에 둔 곡)`, V9.rec.prev === 'r1' && recReqs(L9b, 'r1') === recReqs(L9a, 'r1') && recReqs(L9b, 'r1') === 1, { prev: V9.rec.prev, a: recReqs(L9a, 'r1'), b: recReqs(L9b, 'r1') });
    const carry = { draft: { S: await f.evaluate(() => JSON.parse(JSON.stringify(window.S))) } };
    ok(`${W} 13a 쪽 오류 없음 · 가로 넘침 없음`, errs.length === 0 && !V9.over, { errs, over: V9.over });
    // 9b — 새로 연 쪽(같은 기기) · 고른 곡(r9)은 접힌 채 · 장면을 위해 곡을 받는데 이 기기에 있어 다시 묻지 않는다
    const o2 = await open(ctx, carry); const at2 = await toEntry(o2.f);
    await o2.f.waitForFunction(() => !!document.querySelector('.em-scene [data-fk="emscene"]') && EntryMusic._t.scene().plan, null, { timeout: 30000 }).catch(() => {}); await o2.f.waitForTimeout(300);
    const V9c = await view(o2.f), L9c = await HL(o2.pg), SC9 = await o2.f.evaluate(() => EntryMusic._t.scene());
    ok(`${W} 9b 새로 연 쪽 — 칩 «추천 곡» 눌린 모양 · 고른 곡 접힌 한 줄 · 장면이 그 곡으로 · 곡을 다시 묻지 않는다`, at2 && V9c.chips === 'false,true' && V9c.fold && V9c.fold.t === 'Test Song Nine' && V9c.scene && SC9.plan && Math.abs(SC9.plan.H - 40.05) < 0.01 && recReqs(L9c, 'r9') === 0, { chips: V9c.chips, fold: V9c.fold, scene: V9c.scene, plan: SC9.plan, req: recReqs(L9c, 'r9'), log: L9c });
    ok(`${W} 13b 새로 연 쪽 오류 없음`, o2.errs.length === 0, o2.errs);
    await o2.pg.close();
    // 10 — 올린 곡 ↔ 추천 곡
    await f.click('[data-fk="musrc:up"]'); await f.waitForTimeout(400);
    if (await f.evaluate(() => !!document.getElementById('mkRecDlg'))) { await f.click('#mkRecDlg .mk-dlg-go'); await f.waitForTimeout(300); }
    await f.setInputFiles('#muUpFile', UPF);
    await f.waitForFunction(() => window.S && S.mu && S.mu.src === 'up' && S.mu.fid, null, { timeout: 60000 }).catch(() => {}); await f.waitForTimeout(300);
    const V10a = await view(f);
    await f.click('[data-fk="musrc:rec"]'); await f.waitForTimeout(500);
    if (await f.evaluate(() => !!document.querySelector('.ls-mu .mu-fold'))) { await f.click('.ls-mu [data-fk="mufold"]'); await f.waitForTimeout(500); }
    await f.click('.ls-mu [data-fk="mucarpick"]'); await f.waitForTimeout(600); const V10b = await view(f);
    await f.click('[data-fk="musrc:up"]'); await f.waitForTimeout(500);
    const V10c = await f.evaluate(() => { const r = document.querySelector('.ls-mu'), p = r.querySelector('[data-fk="musong"]'); return { chk: p && p.getAttribute('aria-checked'), hks: !!r.querySelector('.mu-hks'), own: !!r.querySelector('#muOwn'), set: !!r.querySelector('[data-fk="muownset"]'), links: [...r.querySelectorAll('.mu-upft .pk-link')].map((b) => b.textContent).join('|') }; });
    await f.click('.ls-mu [data-fk="musong"]'); await f.waitForTimeout(600); const V10d = await view(f), H10 = await pg.evaluate(() => ({ dels: H.dels.slice(), files: Object.keys(H.files) }));
    ok(`${W} 10a 올린 곡을 고른 채 추천 곡 ✓ → S.mu = 추천 곡 · 올린 곡 기록은 S.muUp(서버 파일 · 곡 번호 그대로)`, V10a.mu && V10a.mu.src === 'up' && V10b.mu && V10b.mu.src === 'rec' && V10b.muUp && V10b.muUp.fid === V10a.mu.fid && V10b.muUp.sid === V10a.mu.sid && H10.dels.indexOf(V10a.mu.fid) < 0, { a: V10a.mu, b: [V10b.mu, V10b.muUp] });
    ok(`${W} 10b «두 분이 고른 곡» 칩 → 곡 줄만(안 고른 모양 · 자리 · 직접 적기 · «맞추기» 없음 · «다른 곡 올리기 · 빼기»)`, V10c.chk === 'false' && !V10c.hks && !V10c.own && !V10c.set && V10c.links === '다른 곡 올리기|빼기', V10c);
    ok(`${W} 10c 곡 줄을 누르면 다시 그 곡(fid · 곡 번호 그대로 · S.muUp 없음 · 서버 파일 안 지움)`, V10d.mu && V10d.mu.src === 'up' && V10d.mu.fid === V10a.mu.fid && V10d.mu.sid === V10a.mu.sid && !V10d.muUp && H10.files.indexOf(V10a.mu.fid) >= 0, { mu: V10d.mu, muUp: V10d.muUp, H10 });
    ok(`${W} 13c 쪽 오류 없음(올린 곡 ↔ 추천 곡)`, errs.length === 0, errs);
    await ctx.close();
    // 11 — 못 받으면
    const ctx3 = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: W < 1000 });
    const o3 = await open(ctx3, { failList: 1, failId: { r1: 99 } }); await toEntry(o3.f);   // 쪽을 열 때 묻는 목록이 실패 · r1 은 늘 실패
    await o3.f.click('[data-fk="musrc:rec"]'); await o3.f.waitForFunction(() => !!document.querySelector('.ls-mu .mu-rec0 [data-fk="mureclist"]'), null, { timeout: 15000 }).catch(() => {});
    const V11a = await view(o3.f); await shot(o3.f, W, '11-fail');
    await o3.f.click('.ls-mu [data-fk="mureclist"]'); await o3.f.waitForFunction(() => !!document.querySelector('.ls-mu .mu-car:not(.mu-car0) .mu-slide'), null, { timeout: 15000 }).catch(() => {});
    const V11b = await view(o3.f);
    await o3.f.click('.ls-mu [data-fk="mucarplay"]'); await o3.f.waitForFunction(() => (window.__toasts || []).some((t) => /코드 L6/.test(t)), null, { timeout: 15000 }).catch(() => {}); await o3.f.waitForTimeout(700);   // 받는 중 줄은 0.4초에 걸쳐 흐려진 뒤 비운다
    const V11c = await view(o3.f);
    ok(`${W} 11a 목록을 못 받으면 «추천 곡을 불러오지 못했어요 · 다시 불러오기 (코드 L6)» → 다시 불러오기 → 카드`, V11a.err === '추천 곡을 불러오지 못했어요 · 다시 불러오기 (코드 L6)' && V11b.n === 3, { err: V11a.err, n: V11b.n });
    ok(`${W} 11b 곡을 못 받으면 «곡을 불러오지 못했어요 · 인터넷을 확인해 주세요 (코드 L6)» · ▶ 로 돌아옴`, V11c.toasts.includes('곡을 불러오지 못했어요 · 인터넷을 확인해 주세요 (코드 L6)') && V11c.tpp.p === 'false' && !V11c.rec.want && !V11c.rec.prev && V11c.ly === '', { toasts: V11c.toasts, tpp: V11c.tpp, rec: V11c.rec, ly: V11c.ly });
    ok(`${W} 13d 쪽 오류 없음(못 받음)`, o3.errs.length === 0, o3.errs);
    await ctx3.close();
    // 12 — 마이페이지 밖
    const ctx4 = await br.newContext({ viewport: { width: W, height: 900 } });
    const o4 = await open(ctx4, null, false); await toEntry(o4.f);
    await o4.f.click('[data-fk="musrc:rec"]'); await o4.f.waitForTimeout(400); const V12 = await view(o4.f);
    ok(`${W} 12 마이페이지 밖 — «추천 곡은 마이페이지에서 들어 볼 수 있어요» · 카드 없음 · 쪽 오류 없음`, V12.err === '추천 곡은 마이페이지에서 들어 볼 수 있어요' && V12.n === 0 && V12.rec.lst === 'fail' && o4.errs.length === 0, { err: V12.err, n: V12.n, rec: V12.rec, errs: o4.errs });
    await ctx4.close();
    // 14 [REC_CLIP_1013] 미리 받기 — 칩 전 · 칩 후 · 받는 중 ▶
    const ctx5 = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: W < 1000 });
    const o5 = await open(ctx5, null); await toEntry(o5.f);
    await o5.f.waitForFunction(() => EntryMusic._t.rec().lst === 'ok', null, { timeout: 15000 }).catch(() => {}); await o5.f.waitForTimeout(900);
    const L14a = await HL(o5.pg), R14a = await o5.f.evaluate(() => EntryMusic._t.rec());
    ok(`${W} 14a 칩을 누르기 전 — 목록 · 첫 카드 곡을 한 번씩 받아 둔다 · 풀지는 않는다(기기 메모리)`, recReqs(L14a, 'list') === 1 && recReqs(L14a, 'r1') === 1 && recReqs(L14a, 'r3') === 0 && R14a.buf.length === 0, { L14a, buf: R14a.buf });
    await o5.f.click('[data-fk="musrc:rec"]'); await o5.f.waitForFunction(() => EntryMusic._t.rec().buf.includes('r1'), null, { timeout: 15000 }).catch(() => {}); await o5.f.waitForTimeout(700);
    const L14b = await HL(o5.pg), R14b = await o5.f.evaluate(() => EntryMusic._t.rec());
    ok(`${W} 14b 칩을 누르면 — 지금 카드(r1)를 풀어 둔다(이 기기에 둔 것 · 다시 묻지 않는다) · 다음 카드(r3)를 받아 둔다`, R14b.buf.includes('r1') && recReqs(L14b, 'r1') === 1 && recReqs(L14b, 'r3') === 1 && recReqs(L14b, 'r9') === 0, { buf: R14b.buf, L14b });
    await o5.pg.evaluate(() => { H.delay = 2500; });
    await o5.f.click('.ls-mu [data-fk="mucarnext"]'); await o5.f.waitForTimeout(150); await o5.f.click('.ls-mu [data-fk="mucarnext"]'); await o5.f.waitForTimeout(150);   // r9 — 아직 안 받은 카드
    await o5.f.click('.ls-mu [data-fk="mucarplay"]'); await o5.f.waitForTimeout(300); const V14c = await view(o5.f);
    await o5.f.waitForFunction(() => EntryMusic._t.rec().prev === 'r9', null, { timeout: 30000 }).catch(() => {}); const L14c = await HL(o5.pg), V14d = await view(o5.f);
    ok(`${W} 14c 받는 중에 ▶ — 같은 받기를 기다린다(■ aria-busy · «곡을 불러오는 중이에요») · 받으면 소리 · r9 는 한 번만 물었다`, V14c.rec.want === 'r9' && V14c.tpp && V14c.tpp.b === 'true' && V14c.ly === '곡을 불러오는 중이에요' && V14d.rec.prev === 'r9' && recReqs(L14c, 'r9') === 1, { V14c: { want: V14c.rec.want, tpp: V14c.tpp, ly: V14c.ly }, prev: V14d.rec.prev, n: recReqs(L14c, 'r9') });
    await o5.f.click('.ls-mu [data-fk="mucarplay"]'); await o5.f.waitForTimeout(300);
    ok(`${W} 13e 쪽 오류 없음(미리 받기)`, o5.errs.length === 0, o5.errs);
    await ctx5.close();
    // 15 [REC_CLIP_1013 · BGM_FIRST_1013] 짧은 판 · 뒤 자리 · 그래프 «곡을 불러오는 중이에요»
    const ctx6 = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: W < 1000 });
    const o6 = await open(ctx6, { list: LISTC, songs: SONGSC }); await toEntry(o6.f);
    await o6.f.click('[data-fk="musrc:rec"]'); await o6.f.waitForFunction(() => EntryMusic._t.rec().buf.includes('r1'), null, { timeout: 15000 }).catch(() => {}); await o6.f.waitForTimeout(700);
    const L15a = await HL(o6.pg);
    ok(`${W} 15a 목록에 pf 가 있으면 짧은 판만 묻는다(r1-p · r3-p) · 곡 전체는 묻지 않는다`, recReqs(L15a, 'r1-p') === 1 && recReqs(L15a, 'r1') === 0 && recReqs(L15a, 'r3-p') === 1 && recReqs(L15a, 'r3') === 0, L15a);
    await o6.f.click('.ls-mu [data-fk="mucarplay"]'); await o6.f.waitForFunction(() => { const r = EntryMusic._t.rec(); return r.prev === 'r1' && r.x != null; }, null, { timeout: 15000 }).catch(() => {});
    const X15 = await o6.f.evaluate(() => EntryMusic._t.rec().x);
    await o6.f.waitForFunction(() => { const r = EntryMusic._t.rec(); return r.x != null && r.x >= 40.9; }, null, { timeout: 15000 }).catch(() => {}); await o6.f.waitForTimeout(250); const V15c = await view(o6.f);
    ok(`${W} 15b 짧은 판 미리 듣기 자리 · 가사는 원곡 시각 그대로 — 문 열림 6초 앞(${X15 == null ? '-' : X15.toFixed(2)}초)부터 · 40.4초 줄 «line one · 첫 줄»이 그 순간`, X15 != null && X15 >= 34 && X15 < 36.5 && V15c.ly === 'line one첫 줄' && V15c.lit, { X15, ly: V15c.ly, lit: V15c.lit, x: V15c.rec.x });
    await o6.f.click('.ls-mu [data-fk="mucarplay"]'); await o6.f.waitForTimeout(300);
    await o6.f.click('.ls-mu [data-fk="mucarpick"]'); await o6.f.waitForFunction(() => !!document.querySelector('.em-scene') && EntryMusic._t.scene().plan, null, { timeout: 30000 }).catch(() => {}); await o6.f.waitForTimeout(300);
    const SC15d = await o6.f.evaluate(() => EntryMusic._t.scene()), L15d = await HL(o6.pg);
    ok(`${W} 15d 판이 장면을 다 담으면 그 판으로 — 곡 전체를 묻지 않는다 · 문 열림 = hook0`, SC15d.plan && Math.abs(SC15d.plan.H - 40.06) < 0.01 && recReqs(L15d, 'r1') === 0, { plan: SC15d.plan, L15d });
    await o6.f.click('.ls-mu [data-fk="mufold"]'); await o6.f.waitForTimeout(600); await o6.f.click('.ls-mu [data-fk="mucarnext"]'); await o6.f.waitForTimeout(500);
    await o6.f.click('.ls-mu [data-fk="mucarpick"]'); await o6.f.waitForFunction(() => { const p = EntryMusic._t.scene().plan; return !!(p && Math.abs(p.H - 12) > 0.01 || (p && document.querySelector('.ls-mu .mu-fold') && /이른 자리/.test(document.querySelector('.ls-mu .mu-fold').textContent))); }, null, { timeout: 30000 }).catch(() => {}); await o6.f.waitForTimeout(400);
    const SC15e = await o6.f.evaluate(() => ({ s: EntryMusic._t.scene(), late: !!document.querySelector('.em-scene .em-late'), k: window.S && S.mu && S.mu.k, hooks: window.S && S.mu && S.mu.hooks }));
    ok(`${W} 15e 멘트(${SC15e.s.plan ? SC15e.s.plan.V.toFixed(1) : '-'}초)가 앞부분(12초)보다 길면 같은 소절이 다시 나오는 45초에 문 열림 · 음악이 4초 먼저 · «늦게 들어와요» 없음 · 초안에 hooks(당일 콘솔)`, SC15e.k === 'r3' && SC15e.s.plan && Math.abs(SC15e.s.plan.H - 45) < 0.01 && SC15e.s.plan.tm === 0 && SC15e.s.plan.tv === 4 && !SC15e.late && JSON.stringify(SC15e.hooks) === '[12,45]', SC15e);
    await o6.pg.evaluate(() => { H.delay = 2500; });
    await o6.f.click('.ls-mu [data-fk="mufold"]'); await o6.f.waitForTimeout(600); await o6.f.click('.ls-mu [data-fk="mucarnext"]'); await o6.f.waitForTimeout(400);
    await o6.f.waitForFunction(() => EntryMusic._t.rec().buf.includes('r9'), null, { timeout: 15000 }).catch(() => {});   // 지금 카드(r9) 짧은 판은 미리 받아 풀어 둔다
    await o6.f.click('.ls-mu [data-fk="mucarpick"]');
    await o6.f.waitForFunction(() => { const w = document.querySelector('.em-scene .lg-wait'); return !!(w && !w.hidden); }, null, { timeout: 15000 }).catch(() => {});
    const W15f = await o6.f.evaluate(() => { const w = document.querySelector('.em-scene .lg-wait'), r = w && w.getBoundingClientRect(); return { txt: w && w.textContent, vis: !!(w && !w.hidden && r.width > 0), plan: !!EntryMusic._t.scene().plan }; });
    await o6.f.waitForFunction(() => !!EntryMusic._t.scene().plan, null, { timeout: 30000 }).catch(() => {}); await o6.f.waitForTimeout(400);
    const SC15f = await o6.f.evaluate(() => ({ s: EntryMusic._t.scene(), wait: !!(document.querySelector('.em-scene .lg-wait') && !document.querySelector('.em-scene .lg-wait').hidden) })), L15f = await HL(o6.pg);
    ok(`${W} 15f 판이 장면 앞부분을 못 담으면 곡 전체를 한 번 묻는다 · 받는 동안 그래프 칸 «곡을 불러오는 중이에요» · 받으면 그래프`, W15f.vis && W15f.txt === '곡을 불러오는 중이에요' && !W15f.plan && SC15f.s.plan && Math.abs(SC15f.s.plan.H - 40.05) < 0.01 && !SC15f.wait && recReqs(L15f, 'r9') === 1 && recReqs(L15f, 'r9-p') === 1, { W15f, plan: SC15f.s.plan, wait: SC15f.wait, L15f });
    ok(`${W} 13f 쪽 오류 없음(짧은 판)`, o6.errs.length === 0, o6.errs);
    await ctx6.close();
  }
} catch (e) { ok('잴 수 없었다 — ' + (e && e.stack || e).split('\n').slice(0, 3).join(' | '), false); }
await br.close(); srv.close();
console.log(fail ? `rec-song-ui: FAIL ${fail}` : 'rec-song-ui: ok');
process.exit(fail ? 1 : 0);
