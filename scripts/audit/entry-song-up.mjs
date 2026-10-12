#!/usr/bin/env node
/* ★★[ENTRY_SONG_UP 2026-10-12 사장님 «일단 전부 올려 · 지금 오픈 전이니깐»] 입장 음악 3단계-가 — 올린 곡을 스튜디오로(서버 보관)
   진짜 식순 화면을 «마이페이지 안»(order-preview.html?embed=1)으로 띄우고, 부모 창(가짜 마이페이지)이 GAS 대신 메모리에 파일을 둔다.
   A 기기(390 · 1280)
   1 곡을 올리면 마이페이지로 한 번 보낸다(자리 mu · 파일 이름 · audio/* · 바이트 그대로) · 보내는 동안 카드에 «스튜디오로 보내는 중이에요» · 끝나면 알림 «스튜디오로 보냈어요»
   2 초안 S.mu.fid = 받은 id · 머리 «저장»이 켜지고 누르면 초안(orderDraft)에 실려 간다(서버 저장은 2026-08-13 부터 사람이 누를 때만 · ORD_SAVE_BTN) · 줄 파일 처리기는 mu 를 건너뛴다
   3 자리만 바꾸면(직접 적기) 다시 보내지 않는다 · fid 그대로
   4 다른 곡으로 바꾸면 새 곡을 보내고 옛 파일은 지운다(서버에 하나만)
   5 못 보내면(U6) 곡 줄 아래 «스튜디오로 보내지 못했어요 · 다시 보내기 (코드 U6)» → 다시 보내기 → 보냄
   6 20MB 넘는 파일은 보내지 않고 «20MB가 넘어 …» 한 줄 · 바꾸기 전 곡의 서버 파일은 지운다
   B 기기(이 기기에 파일 없음 · 같은 초안)
   7 스튜디오에 보낸 파일로 다시 받아 같은 자리를 되살린다(«‹곡› 불러오는 중이에요» → 곡 줄 · 고른 자리 · 음악과 함께 듣기 칸)
   8 못 받으면 «곡을 불러오지 못했어요 · 다시 불러오기 (코드 L6)» → 다시 불러오기 → 되살림
   9 빼기 → 서버 파일도 지운다 · 쪽 오류 없음
   시험 곡은 여기서 만든다(합성음 · 저장소에 음원을 두지 않는다).  종료 코드 0 통과 · 1 실패 · 2 재지 못함
   EM_MOD = 돌연변이 확인용 — 그 판의 entry-music.js 로 잰다 */
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const MOD = process.env.EM_MOD || '', SHOT = process.env.SHOT || '';   // SHOT=폴더 — 새 줄들을 그 자리 그림으로 남긴다(눈으로 보기)
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 500)}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
/* 가짜 마이페이지 — 빌더가 보내는 orderReady · orderDraft · ritualFile · ritualFileGet · ritualFileDel 에 답한다(mypage.html 중계와 같은 모양) */
const HARNESS = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><iframe id="fr" style="width:100vw;height:100vh;border:0;display:block"></iframe>
<script>
window.H={files:{},log:[],dels:[],draft:null,saved:null,failUp:0,failGet:0,delay:60,n:0};
var fr=document.getElementById('fr');
function back(m){ fr.contentWindow.postMessage(m, location.origin); }
window.go=function(){ fr.src='/order-preview.html?embed=1'; };
window.addEventListener('message',function(ev){ var d=ev.data||{}; if(ev.origin!==location.origin||ev.source!==fr.contentWindow) return;
  if(/^momentedit:ritualFile/.test(d.type||'')) H.log.push(d.type+':'+(d.data&&d.data.key));
  if(d.type==='momentedit:orderReady'){ back({type:'momentedit:orderFill',draft:H.draft,done:false,cust:{name:'시험',code:'TEST01'}}); return; }
  if(d.type==='momentedit:orderDraft'){ H.saved=JSON.parse(JSON.stringify(d.data&&d.data.S||null)); back({type:'momentedit:orderDraftSaved'}); return; }
  if(d.type==='momentedit:ritualFile'){ var x=d.data; setTimeout(function(){
      if(H.failUp>0){ H.failUp--; back({type:'momentedit:ritualFileDone',key:x.key,tk:x.tk,ok:false,error:'파일을 올리지 못했어요 · 다시 눌러 주세요 (코드 U6)',ecode:'U6'}); return; }
      var id='FILE'+(++H.n)+'abcdefghij'; H.files[id]={key:x.key,name:x.name,mime:x.mime,src:x.src,data:String(x.data).replace(/^data:[^,]*,/,'')};
      back({type:'momentedit:ritualFileDone',key:x.key,tk:x.tk,ok:true,id:id,name:x.name,at:'2026-10-12 10:00'}); }, H.delay); return; }
  if(d.type==='momentedit:ritualFileGet'){ var g=d.data, f=H.files[g.id]; setTimeout(function(){
      if(H.failGet>0||!f){ if(H.failGet>0) H.failGet--; back({type:'momentedit:ritualFileData',key:g.key,id:g.id,ok:false,error:'파일을 불러오지 못했어요 · 다시 눌러 주세요 (코드 L6)',ecode:'L6'}); return; }
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
/* 시험 곡 — WAV 16bit 모노 · 앞은 작게 · hook 초부터 크게(0.5초 박) · 곡마다 높이(f)가 달라 바이트가 다르다 */
function wav(name, sec, hook, f, sr = 22050, ch = 1) { const n = sr * sec, b = Buffer.alloc(44 + n * 2 * ch); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2 * ch, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(ch, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2 * ch, 28); b.writeUInt16LE(2 * ch, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2 * ch, 40);
  let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 - 0.5; };
  for (let i = 0; i < n; i++) { const t = i / sr, a = t >= hook ? 0.45 * ((t % 0.5) < 0.06 ? 1 : 0.35) : 0.05; const v = a * (Math.sin(2 * Math.PI * f * t) * 0.6 + Math.sin(2 * Math.PI * f * 1.5 * t) * 0.3 + rnd() * 0.2), q = Math.max(-32767, Math.min(32767, Math.round(v * 32767))); for (let c = 0; c < ch; c++) b.writeInt16LE(q, 44 + (i * ch + c) * 2); }
  const p = path.join(os.tmpdir(), name); fs.writeFileSync(p, b); return p; }
const SONG1 = wav('song-up-1.wav', 150, 40, 220), SONG2 = wav('song-up-2.wav', 140, 35, 262), SONG3 = wav('song-up-3.wav', 130, 30, 196);
const BIG = wav('song-up-big.wav', 130, 30, 247, 44100, 2);   // 약 22.9MB — 서버 한도 20MB 를 넘는다
const fr = (pg) => pg.frames().find((f) => /order-preview\.html/.test(f.url()));
async function open(ctx, seed) {
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); return rt.fulfill({ status: 200, body: '' }); });
  await pg.goto(`http://127.0.0.1:${port}/__harness.html`, { waitUntil: 'load' });
  if (seed) await pg.evaluate((sd) => { H.draft = sd.draft; H.files = sd.files; H.n = sd.n; }, seed);
  await pg.evaluate(() => go()); await pg.waitForFunction(() => { const f = document.getElementById('fr'); return f.contentWindow && f.contentWindow.EntryMusic && f.contentWindow.document.readyState === 'complete'; }, null, { timeout: 30000 });
  await pg.waitForTimeout(900);
  const f = fr(pg);
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
const H = (pg) => pg.evaluate(() => ({ files: Object.keys(H.files).map((k) => ({ id: k, key: H.files[k].key, name: H.files[k].name, mime: H.files[k].mime, len: H.files[k].data.length })), log: H.log.slice(), dels: H.dels.slice(), saved: H.saved && H.saved.mu ? H.saved.mu : null }));
const st = (f) => f.evaluate(() => ({ mu: window.S && S.mu ? JSON.parse(JSON.stringify(S.mu)) : null, sv: EntryMusic._t.sv(), ups: (() => { const u = EntryMusic._t.ups(); return u ? { busy: !!u.busy, dl: !!u.dl, sg: !!u.Sg, dur: u.Sg ? Math.round(u.Sg.dur) : 0, pick: u.pick } : null; })(),
  sv1: (document.querySelector('.ls-mu .mu-sv') || {}).textContent || '', busy: (document.querySelector('.ls-mu .mu-upbusy') || {}).textContent || '', toasts: (window.__toasts || []).slice(), scene: !!document.querySelector('.em-scene'),
  upLs: Object.keys(window.S && S.up || {}), rfErr: (window.MK && MK.lineErr) ? Object.keys(MK.lineErr) : [] }));
const b64len = (p) => Math.ceil(fs.statSync(p).size / 3) * 4;
const shot = async (f, W, n) => { if (!SHOT) return; try { fs.mkdirSync(SHOT, { recursive: true }); await f.locator('.ls-mu').screenshot({ path: path.join(SHOT, `song-up-${W}-${n}.png`) }); } catch {} };
try {
  let carry = null;
  for (const W of [390, 1280]) {
    const ctx = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: W < 1000 });
    const { pg, f, errs } = await open(ctx, null);
    const at = await toEntry(f); ok(`${W} 0 마이페이지 안(embed) 식순 ② 입장 — 입장 음악 줄`, at);
    if (!at) { await ctx.close(); continue; }
    // 1 · 2
    await pg.evaluate(() => { H.delay = 900; });
    await f.setInputFiles('#muUpFile', SONG1);
    await f.waitForFunction(() => { const u = EntryMusic._t.ups(); return u && u.Sg && !u.busy; }, null, { timeout: 60000 });
    await f.waitForFunction(() => EntryMusic._t.sv().st === 'up', null, { timeout: 10000 }).catch(() => {});
    const S1a = await st(f); await shot(f, W, '1-sending');
    await f.waitForFunction(() => window.S && S.mu && S.mu.fid, null, { timeout: 30000 }).catch(() => {}); await f.waitForTimeout(500);
    const S1 = await st(f), H1 = await H(pg), SB1 = await f.evaluate(() => { const b = document.getElementById('obSave'); return b ? { t: b.textContent, on: b.classList.contains('on') } : null; });
    await f.evaluate(() => window._saveBakeSend()); await pg.waitForFunction(() => H.saved && H.saved.mu && H.saved.mu.fid, null, { timeout: 15000 }).catch(() => {});
    const H1s = await H(pg);
    ok(`${W} 1 곡을 올리면 마이페이지로 한 번 보낸다(자리 mu · 이름 · audio/* · 바이트 그대로) · 보내는 동안 «스튜디오로 보내는 중이에요» · 끝나면 알림 «스튜디오로 보냈어요»`,
      S1a.sv1 === '스튜디오로 보내는 중이에요' && H1.files.length === 1 && H1.files[0].key === 'mu' && H1.files[0].name === 'song-up-1.wav' && /^audio\//.test(H1.files[0].mime) && H1.files[0].len === b64len(SONG1)
      && H1.log.filter((x) => x === 'momentedit:ritualFile:mu').length === 1 && S1.toasts.includes('스튜디오로 보냈어요') && S1.sv1 === '', { S1a: S1a.sv1, H1, toasts: S1.toasts, sv1: S1.sv1 });
    ok(`${W} 2 초안 S.mu.fid = 받은 id · 머리 «저장»이 켜지고 누르면 초안에 실려 간다 · 줄 파일 처리기는 mu 를 건너뛴다`, S1.mu && S1.mu.fid === (H1.files[0] || {}).id && !!S1.mu.sid && SB1 && SB1.on && SB1.t === '저장' && H1s.saved && H1s.saved.fid === S1.mu.fid && !S1.upLs.includes('mu') && !S1.rfErr.includes('mu'), { mu: S1.mu, SB1, saved: H1s.saved, upLs: S1.upLs, rfErr: S1.rfErr });
    // 3
    await pg.evaluate(() => { H.delay = 60; });
    await f.fill('#muOwn', '105'); await f.click('[data-fk="muownset"]'); await f.waitForTimeout(600);
    const S3 = await st(f), H3 = await H(pg);
    ok(`${W} 3 자리만 바꾸면(직접 적기 1:05) 다시 보내지 않는다 · fid · 곡 번호 그대로`, S3.mu && S3.mu.typed === 65 && S3.mu.fid === S1.mu.fid && S3.mu.sid === S1.mu.sid && H3.log.filter((x) => x === 'momentedit:ritualFile:mu').length === 1 && H3.files.length === 1 && H3.dels.length === 0, { mu: S3.mu, log: H3.log, dels: H3.dels });
    // 4
    await f.setInputFiles('#muUpFile', SONG2);
    await f.waitForFunction((old) => window.S && S.mu && S.mu.fid && S.mu.fid !== old, S1.mu.fid, { timeout: 60000 }).catch(() => {}); await f.waitForTimeout(500);
    const S4 = await st(f), H4 = await H(pg);
    ok(`${W} 4 다른 곡으로 바꾸면 새 곡을 보내고 옛 파일은 지운다(서버에 하나만)`, S4.mu && S4.mu.name === 'song-up-2' && S4.mu.sid !== S1.mu.sid && H4.files.length === 1 && H4.files[0].id === S4.mu.fid && H4.files[0].name === 'song-up-2.wav' && H4.dels.includes(S1.mu.fid), { mu: S4.mu, files: H4.files, dels: H4.dels });
    // 5
    await pg.evaluate(() => { H.failUp = 1; });
    await f.setInputFiles('#muUpFile', SONG3);
    await f.waitForFunction(() => EntryMusic._t.sv().st === 'fail', null, { timeout: 60000 }).catch(() => {}); await f.waitForTimeout(300);
    const S5a = await st(f), H5a = await H(pg); await shot(f, W, '5-fail');
    const btn = await f.evaluate(() => { const b = document.querySelector('.ls-mu .mu-sv [data-fk="musvagain"]'); return b ? b.textContent : null; });
    ok(`${W} 5a 못 보내면(U6) 곡 줄 아래 «스튜디오로 보내지 못했어요 · 다시 보내기 (코드 U6)» · 바꾸기 전 곡 파일은 지웠다`, S5a.sv1 === '스튜디오로 보내지 못했어요 · 다시 보내기 (코드 U6)' && btn === '다시 보내기' && S5a.mu && !S5a.mu.fid && H5a.files.length === 0 && H5a.dels.includes(S4.mu.fid), { sv1: S5a.sv1, mu: S5a.mu, files: H5a.files });
    await f.click('.ls-mu .mu-sv [data-fk="musvagain"]');
    await f.waitForFunction(() => window.S && S.mu && S.mu.fid, null, { timeout: 30000 }).catch(() => {}); await f.waitForTimeout(400);
    const S5 = await st(f), H5 = await H(pg);
    ok(`${W} 5b «다시 보내기» → 보냄(줄 걷힘 · fid · 서버에 하나)`, S5.mu && S5.mu.fid && S5.sv1 === '' && H5.files.length === 1 && H5.files[0].id === S5.mu.fid && H5.files[0].name === 'song-up-3.wav', { mu: S5.mu, sv1: S5.sv1, files: H5.files });
    carry = { draft: { S: await f.evaluate(() => JSON.parse(JSON.stringify(window.S))) }, files: await pg.evaluate(() => H.files), n: await pg.evaluate(() => H.n), song: S5.mu };
    // 6
    await f.setInputFiles('#muUpFile', BIG);
    await f.waitForFunction(() => { const u = EntryMusic._t.ups(); return u && u.Sg && !u.busy && window.S && S.mu && S.mu.name === 'song-up-big'; }, null, { timeout: 90000 }).catch(() => {}); await f.waitForTimeout(500);
    const S6 = await st(f), H6 = await H(pg); await shot(f, W, '6-big');
    ok(`${W} 6 20MB 넘는 파일은 보내지 않고 «20MB가 넘어 스튜디오로 보내지 못했어요 · MP3로 올려 주세요» · 바꾸기 전 곡의 서버 파일은 지운다`, S6.sv1 === '20MB가 넘어 스튜디오로 보내지 못했어요 · MP3로 올려 주세요' && S6.mu && !S6.mu.fid && H6.log.filter((x) => x === 'momentedit:ritualFile:mu').length === H5.log.filter((x) => x === 'momentedit:ritualFile:mu').length && H6.files.length === 0 && H6.dels.includes(S5.mu.fid), { sv1: S6.sv1, mu: S6.mu, log: H6.log.length, files: H6.files });
    ok(`${W} 6b 쪽 오류 없음`, errs.length === 0, errs);
    await ctx.close();
    // B 기기 — 이 기기에 파일 없음 · 같은 초안(fid) · 스튜디오에 파일이 있다
    if (!carry) continue;
    const ctx2 = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: W < 1000 });
    const o2 = await open(ctx2, carry);
    await o2.pg.evaluate(() => { H.delay = 4000; });   // 받는 동안 «불러오는 중» 줄을 볼 수 있게
    const at2 = await toEntry(o2.f);
    const S7a = await st(o2.f); await shot(o2.f, W, '7-loading');
    await o2.f.waitForFunction(() => { const u = EntryMusic._t.ups(); return u && u.Sg && !u.busy; }, null, { timeout: 60000 }).catch(() => {}); await o2.f.waitForTimeout(800);
    const S7 = await st(o2.f), H7 = await H(o2.pg);
    ok(`${W} 7 다른 기기 — 스튜디오에 보낸 파일로 다시 받아 같은 자리(«‹곡› 불러오는 중이에요» → 곡 줄 · 고른 자리 · 음악과 함께 듣기 칸)`, at2 && /불러오는 중이에요$/.test(S7a.busy) && S7.ups && S7.ups.sg && S7.ups.dur === 130 && S7.mu && S7.mu.fid === carry.song.fid && S7.mu.hook === carry.song.hook && H7.log.includes('momentedit:ritualFileGet:mu') && !H7.log.includes('momentedit:ritualFile:mu') && S7.scene, { at2, busy: S7a.busy, ups: S7.ups, mu: S7.mu, log: H7.log, scene: S7.scene });
    await ctx2.close();
    const ctx3 = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: W < 1000 });
    const o3 = await open(ctx3, carry);
    await o3.pg.evaluate(() => { H.failGet = 1; });
    await toEntry(o3.f);
    await o3.f.waitForFunction(() => EntryMusic._t.sv().gerr, null, { timeout: 30000 }).catch(() => {}); await o3.f.waitForTimeout(300);
    const S8a = await st(o3.f); await shot(o3.f, W, '8-loadfail');
    ok(`${W} 8a 못 받으면 «곡을 불러오지 못했어요 · 다시 불러오기 (코드 L6)» · 고른 것은 남아 있다`, S8a.sv1 === '곡을 불러오지 못했어요 · 다시 불러오기 (코드 L6)' && S8a.mu && S8a.mu.fid === carry.song.fid, { sv1: S8a.sv1, mu: S8a.mu });
    await o3.f.click('.ls-mu .mu-sv [data-fk="musvget"]');
    await o3.f.waitForFunction(() => { const u = EntryMusic._t.ups(); return u && u.Sg && !u.busy; }, null, { timeout: 60000 }).catch(() => {}); await o3.f.waitForTimeout(500);
    const S8 = await st(o3.f);
    ok(`${W} 8b «다시 불러오기» → 되살림(줄 걷힘)`, S8.ups && S8.ups.sg && S8.sv1 === '' && !S8.sv.gerr, { ups: S8.ups, sv1: S8.sv1, sv: S8.sv });
    // 9
    await o3.f.click('[data-fk="muupdel"]'); await o3.f.waitForTimeout(500);
    const S9 = await st(o3.f), H9 = await o3.pg.evaluate(() => ({ files: Object.keys(H.files), dels: H.dels.slice() }));
    ok(`${W} 9 빼기 → 서버 파일도 지운다 · S.mu 없음`, !S9.mu && H9.files.length === 0 && H9.dels.includes(carry.song.fid), { mu: S9.mu, H9 });
    ok(`${W} 9b 쪽 오류 없음(다른 기기 둘)`, o2.errs.length === 0 && o3.errs.length === 0, o2.errs.concat(o3.errs));
    await ctx3.close();
  }
} catch (e) { ok('잴 수 없었다 — ' + (e && e.message || e).split('\n')[0], false); }
await br.close(); srv.close();
console.log(fail ? `entry-song-up: FAIL ${fail}` : 'entry-song-up: ok');
process.exit(fail ? 1 : 0);
