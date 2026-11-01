#!/usr/bin/env node
/* ★★[BGM_SEG8_1023 2026-10-23 사장님 결정 «8구간» · BGM 섹션 라운드 2 PR 2 · BGM_PICKS_1023 사장님 21:40 «나머지 이 노래들 우선 고를 수 있게»]
   당일 콘솔을 띄워 구간 음악을 잰다(시험 곡은 여기서 만든다 · 합성음 · 저장소에 음원을 두지 않는다).
   ① 설정 «구간 음악» — 구간마다 추천 목록(bgm-picks) · 1순위가 «추천 1순위»로 골라져 있다 · 파일이 없으면 «곡 파일 필요» · 입장은 목록 없이 입장 음악 칸 그대로
   ② 고르면 저장된다(다시 열어도 그대로) · «곡 추가»로 더한 곡은 «직접 더한 곡»에 · 넣은 파일은 이 기기에 남는다(다시 열어도 ✓)
   ③ 시작 = 하객 맞이 곡 · 화촉 첫 큐에서 화촉 곡으로 3초 크로스페이드(두 재생기가 겹친다 → 앞 곡은 멈춘다) · 파일 없는 구간(감사 인사)은 앞 곡이 그대로 잇는다
   ④ 축가(자체 음원 · −90) 뒤 부모님께 인사 큐에서 그 구간 곡으로 돌아오고 크기도 그 큐 값
   ⑧ [LISTEN_LOOK_LEVEL_1101] 구간 곡 = 곡 보정 +7 dB · 그 길 끝 리미터 · 리허설 칸 «곡 보정»
   ⑤ 고객 화면(order-preview)은 bgm-picks 를 싣되 곡 파일 주소는 없다 [BGM_PREVIEW_1024] · 쪽 오류 0
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 · BS_CON = 돌연변이 확인용(그 판의 console.html) */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import os from 'node:os'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const CON = process.env.BS_CON || '';
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const O = require(path.join(ROOT, 'assets/ritual-open.js'));
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 600)}`); if (!c) fail++; };
/* 시험 곡 — sec 초 · 소리 hz · 끝 tail 초 무음 */
function wav(sec, hz, tail) { const sr = 22050, n = sr * sec, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) { const t = i / sr; const v = t < sec - tail ? 0.3 * Math.sin(2 * Math.PI * hz * t) : 0; b.writeInt16LE(Math.round(v * 32767), 44 + i * 2); } return b; }
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'bgmseg-'));
const F = { m1: path.join(TMP, 'guest-song.wav'), m2: path.join(TMP, 'candle-song.wav'), m5: path.join(TMP, 'tribute-song.wav') };
fs.writeFileSync(F.m1, wav(20, 330, 2)); fs.writeFileSync(F.m2, wav(20, 440, 2)); fs.writeFileSync(F.m5, wav(20, 550, 2));
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const p = (CON && u === '/console.html') ? CON : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const S0 = (() => { const S = O.applyExample({ course: 'open' }, 'standard'); S.course = 'open'; return S; })();
const URL0 = `http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S0)).toString('base64'))}`;
const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } });   // 한 기기 — 다시 열어도 같은 localStorage · IndexedDB
const errs = [];
async function page() { const pg = await ctx.newPage(); pg.on('pageerror', (e) => errs.push(e.message));
  await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; });
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: '{"ok":true}' })));
  await pg.goto(URL0); await pg.waitForTimeout(900); return pg; }
const seg = (pg) => pg.evaluate(() => window.__seg ? window.__seg.st() : null);
const row = (pg, id) => pg.evaluate((i) => { const b = document.querySelector('.sg[data-seg="' + i + '"]'); if (!b) return null;
  return { songs: [...b.querySelectorAll('.sg-song')].map((r) => ({ t: r.querySelector('.chip').textContent, on: r.querySelector('.chip').getAttribute('aria-pressed') === 'true', meta: r.querySelector('.sg-meta').textContent, st: r.querySelector('.sg-st').textContent })), own: !!b.querySelector('.sg-sub') }; }, id);
try {
  let pg = await page();
  if (!(await pg.evaluate(() => !!window.__seg && !!window.BgmPicks))) { ok('콘솔에 구간 음악(__seg · BgmPicks)이 있다', false, '없음 — 옛 판'); throw new Error('hook'); }
  /* ① 설정 */
  const ids = await pg.evaluate(() => window.BgmPicks.SEGS.filter((s) => !s.entry).map((s) => s.id));
  const rows = {}; for (const id of ids) rows[id] = await row(pg, id);
  const P = await pg.evaluate(() => { const o = {}; window.BgmPicks.SEGS.forEach((s) => { o[s.id] = window.BgmPicks.list(s.id).length + ((s.multi || s.loop) && window.BgmPicks.FILL ? (window.BgmPicks.FILL[s.id] || []).length : 0); }); return o; });   /* ★[BGM_FILL_1101] 목록 칸(M1 · M8)은 추천 3곡 + 배경 곡 줄 */
  const bad = ids.filter((id) => !rows[id] || rows[id].songs.length !== P[id] || (P[id] > 0 && (!rows[id].songs[0].on || !/추천 1순위/.test(rows[id].songs[0].meta))) || !rows[id].songs.every((x) => x.st === '곡 파일 필요'));   /* [BGM_FIX_1030] 사진 칸(M6P)은 곡을 비웠다 — 닫는 인사 곡이 잇는다 */
  ok(`① 구간 ${ids.length}칸 — 추천 목록이 다 보이고 1순위가 «추천 1순위»로 골라져 있고 파일이 없으면 «곡 파일 필요»`, ids.length >= 11 && !bad.length, { bad, M2: rows.M2 });
  const multiOn = rows.M1.songs.every((x) => x.on) && rows.M8.songs.every((x) => x.on) && rows.M2.songs.filter((x) => x.on).length === 1;
  ok('① 목록 칸(하객 맞이 · 테이블 인사)은 추천 곡 전부 · 한 곡 칸은 하나', multiOn, { M1: rows.M1.songs.map((x) => x.on), M2: rows.M2.songs.map((x) => x.on) });
  const entry = await pg.evaluate(() => { const h = [...document.querySelectorAll('#segList .sg h3')].find((x) => /입장/.test(x.textContent)); return h ? { n: h.parentElement.querySelectorAll('.sg-song').length, t: h.parentElement.textContent } : null; });
  ok('① 입장 → 맞절은 목록 없이 입장 음악 칸 그대로', !!entry && entry.n === 0 && /입장 음악/.test(entry.t), entry);
  /* ② 고르기 · 곡 추가 · 파일 · 다시 열기 */
  await pg.click('.sg[data-seg="M2"] .sg-song:nth-of-type(2) .chip');
  await pg.fill('[data-seg-addt="M5"]', '시험 직접 곡'); await pg.fill('[data-seg-adda="M5"]', '시험 아티스트'); await pg.click('[data-seg-add="M5"]'); await pg.waitForTimeout(200);
  await pg.setInputFiles('.sg[data-seg="M1"] .sg-song:nth-of-type(1) [data-seg-file]', F.m1);
  await pg.setInputFiles('.sg[data-seg="M2"] .sg-song:nth-of-type(2) [data-seg-file]', F.m2);
  await pg.setInputFiles('.sg[data-seg="M5"] .sg-song:nth-of-type(1) [data-seg-file]', F.m5);
  await pg.waitForTimeout(1500); await pg.close();
  pg = await page(); await pg.waitForTimeout(600);
  const r2 = await row(pg, 'M2'), r5 = await row(pg, 'M5'), r1 = await row(pg, 'M1');
  ok('② 고른 곡이 다시 열어도 그대로(화촉 2번째 · 이 기기)', r2 && !r2.songs[0].on && r2.songs[1].on, r2 && r2.songs.map((x) => x.on));
  ok('② «곡 추가» — «직접 더한 곡»에 남는다', r5 && r5.own && r5.songs.some((x) => x.t === '시험 직접 곡' && /직접 더한 곡/.test(x.meta)), r5);
  ok('② 넣은 파일은 이 기기에 남는다(다시 열어도 ✓ · 끝 무음 뺀 길이)', r1 && /^✓ guest-song\.wav · 0:18$/.test(r1.songs[0].st) && /^✓ candle-song\.wav/.test(r2.songs[1].st), { r1: r1 && r1.songs[0].st, r2: r2 && r2.songs[1].st });
  /* ③ 시작 · 화촉 크로스페이드 · 빈 구간 */
  await pg.click('#go'); await pg.waitForTimeout(800);
  const A = await seg(pg);
  ok('③ 시작 = 하객 맞이 곡(구간 M1)', A.seg === 'M1' && /blob:/.test(A.src[A.on]) && !A.paused[A.on], A);
  const ci = await pg.evaluate(() => window.__bgmR().findIndex((c) => c.k === 'candle'));
  await pg.evaluate((i) => window.__bgmGo.fire(i), ci); await pg.waitForTimeout(900);
  const B = await seg(pg);
  ok('③ 화촉 첫 큐 — 화촉 곡으로 3초 크로스페이드 중(두 재생기가 함께 돈다 · 둘 다 들린다)', B.seg === 'M2' && B.on !== A.on && !B.paused[B.on] && !B.paused[A.on] &&   /* [DETAIL_R3_1101 ③] 재생기가 셋 — 새 곡 · 앞 곡 두 재생기가 함께 돈다 */ B.xg[B.on] > 0.05 && B.xg[A.on] > 0.05 && B.xg[B.on] < 0.99, B);
  await pg.waitForTimeout(2600);
  const C = await seg(pg);
  ok('③ 3초 뒤 — 화촉 곡만 남고 앞 곡은 멈춘다', C.seg === 'M2' && C.paused[A.on] && !C.paused[C.on] && C.xg[C.on] > 0.9, C);
  /* ⑧ [LISTEN_LOOK_LEVEL_1101 ②] 구간 곡 = 곡 보정 +7 dB(곡 −23 LUFS → 나레이션 −16 기준) · 그 길 끝 리미터 · 리허설 칸 «곡 보정» */
  { const SG = await pg.evaluate(() => (window.__seg.song ? window.__seg.song() : {}));
    ok('⑧ 구간 곡 = 곡 보정 +7 dB(gSong) · 그 길 끝 리미터(−1 dB · 20 · 2ms · 150ms) · 리허설 칸 «곡 보정» [LISTEN_LOOK_LEVEL_1101]', SG.mode === 'seg' && SG.g != null && Math.abs(SG.g - Math.pow(10, 7 / 20)) < 0.03 && JSON.stringify(SG.lim) === '[-1,20,2,150]' && SG.reh && SG.p === 7, SG); }
  const wi = await pg.evaluate(() => window.__bgmR().findIndex((c) => c.k === 'welcome'));
  await pg.evaluate((i) => window.__bgmGo.fire(i), wi); await pg.waitForTimeout(800);
  const D = await seg(pg);
  ok('③ 파일 없는 구간(감사 인사 · M4) — 앞 곡(화촉)이 그대로 잇는다(정적 없음)', D.seg === 'M2' && D.src[D.on] === C.src[C.on] && !D.paused[D.on], D);
  /* ④ 축가 뒤 돌아옴 */
  const si = await pg.evaluate(() => window.__bgmR().findIndex((c) => c.slug === 'narr-song'));
  await pg.evaluate((i) => window.__bgmGo.fire(i), si);
  await pg.waitForFunction(() => window.__bgmSt().phase === 'live', null, { timeout: 40000 }).catch(() => {});
  const E = await pg.evaluate(() => window.__bgmSt());
  ok('④ 축가(자체 음원) 동안 배경음은 −90', E.phase === 'live' && E.want === -90, E);
  /* ★[BRIDGE_FIRST_1101] 축가 바로 뒤 «경건하게» 이음말(b12)은 구간을 바꾸지 않고 배경음도 꺼진 채(앞의 앞 곡이 되살아나지 않게) — 구간 곡(M5)은 그다음 큐에서 */
  const bi = await pg.evaluate(() => window.__bgmR().findIndex((c) => c.slug === 'bridge-b12-tribute-calm'));
  if (bi > -1) { const g0 = await seg(pg); await pg.evaluate((i) => window.__bgmGo.fire(i), bi); await pg.waitForTimeout(1500); const G0 = await seg(pg), H0 = await pg.evaluate(() => window.__bgmSt());
    ok('④ 축가 뒤 «경건하게» 이음말(b12) — 구간을 바꾸지 않고 배경음은 꺼진 채(−90)', G0.seg === g0.seg && H0.want === -90, { g0: g0.seg, G0: G0.seg, want: H0.want }); }
  const ti = await pg.evaluate(() => window.__bgmR().findIndex((c) => c.k === 'tribute' && !/^bridge-/.test(c.slug || '')));
  const tduck = await pg.evaluate((i) => window.__bgmR()[i].duck, ti);
  await pg.evaluate((i) => window.__bgmGo.fire(i), ti); await pg.waitForTimeout(3600);
  const G = await seg(pg), H = await pg.evaluate(() => window.__bgmSt());
  ok('④ 축가 뒤 부모님께 인사 — 그 구간 곡(M5)으로 돌아오고 크기는 그 큐 값', G.seg === 'M5' && !G.paused[G.on] && H.want === tduck && H.want > -90, { G, H, tduck });
  await pg.close();
  /* ⑤ 고객 화면 */
  const op = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8'), mp = fs.readFileSync(path.join(ROOT, 'mypage.html'), 'utf8');
  /* ★[BGM_PREVIEW_1024 2026-10-24 사장님 «고객이 고름»] 고객 화면(order-preview)도 bgm-picks 를 싣는다 — 곡 이름 · 정보 · 번호만 · 곡 파일 주소는 없다(파일은 드라이브 ME_구간곡 · 마이페이지 중계) */
  const bpSrc = fs.readFileSync(path.join(ROOT, 'assets/bgm-picks.js'), 'utf8');
  ok('⑤ 고객 화면(order-preview)은 bgm-picks 를 싣되 곡 파일 주소는 없다(mp3 · http · drive 없음) · mypage 는 싣지 않는다', /bgm-picks\.js/.test(op) && !/bgm-picks/.test(mp) && !/https?:|\.mp3|\.m4a|drive\.google|blob:/i.test(bpSrc.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')));
  /* ⑥ 입장 곡이 짧을 때 — 하이라이트 뒤 180초가 안 되면 «곡 길이 모자람 · 맞절은 피아노로» · 곡 끝 3초 전에 피아노(M4)가 겹쳐 이어받는다 [ENTRY_SHORT] */
  { const FID = 'SHORTSONG0123456789ab', SONG = wav(40, 300, 0).toString('base64');
    const S1 = Object.assign({}, S0, { entry: 'A', entryVoice: 'nar', mu: { src: 'up', name: 'short', t: '짧은 곡', a: '', dur: 40, hook: 30, typed: null, sid: 'x2', fid: FID } });
    const c2 = await br.newContext({ viewport: { width: 1280, height: 900 } }); const p2 = await c2.newPage(); const e2 = []; p2.on('pageerror', (e) => e2.push(e.message));
    await p2.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; });
    await p2.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); const H = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
      if (/script\.google\.com/.test(u)) { let q = {}; try { q = JSON.parse(rt.request().postData() || '{}'); } catch {}
        if (q.fn === 'adminRitualFiles') return rt.fulfill({ status: 200, headers: H, body: JSON.stringify({ ok: true, sup: {}, files: [{ key: 'mu', id: FID, name: '입장 음악 · short.wav' }] }) });
        if (q.fn === 'adminRitualFileGet') return rt.fulfill({ status: 200, headers: H, body: JSON.stringify({ ok: true, id: FID, mime: 'audio/wav', data: SONG }) }); }
      return rt.fulfill({ status: 200, headers: H, body: '{"ok":true}' }); });
    await p2.goto(`http://127.0.0.1:${port}/console.html`); await p2.evaluate(() => { localStorage.setItem('me_admin_token', 'T0K'); });
    await p2.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S1)).toString('base64'))}&rf=ME0001`); await p2.waitForTimeout(900);
    await p2.setInputFiles('.sg[data-seg="M4"] .sg-song:nth-of-type(1) [data-seg-file]', F.m2); await p2.waitForTimeout(800);
    await p2.waitForFunction(() => window.__esd.s().st === 'ok', null, { timeout: 30000 }).catch(() => {});
    const lab = await p2.evaluate(() => (document.getElementById('rfMu') || {}).textContent || '');
    ok('⑥ 입장 곡이 짧으면(하이라이트 뒤 10초) 입장 칸에 «곡 길이 모자람 · 곡이 끝나면 피아노가 이어요»(맞절은 입장 곡 그대로 · BGM_FIX_1030)', /곡 길이 모자람 · 곡이 끝나면 피아노가 이어요$/.test(lab), lab);
    await p2.click('#go'); await p2.waitForFunction(() => window.__esd.s().v0 && window.__bgmSt().cur >= 0, null, { timeout: 30000 }).catch(() => {});   /* ★[CON_FRESH 뒤] «시작»은 최신 소리를 한 번 물은 뒤에 시작한다 — 실제로 시작(cur ≥ 0)될 때까지 기다린다 */
    const I = await p2.evaluate(() => window.__esd.idx()); const t0 = Date.now(); await p2.evaluate((i) => window.__bgmGo.fire(i), I.e); await p2.waitForTimeout(400);
    const pl = (await p2.evaluate(() => window.__esd.s())).pl || {}, endIn = (pl.tm || 0) + (40 - (pl.off || 0));
    await p2.waitForFunction(() => !window.__esd.s().run, null, { timeout: 70000 }).catch(() => {}); const t1 = (Date.now() - t0) / 1000;
    await p2.waitForTimeout(600); const Z = await p2.evaluate(() => window.__seg.st()), W = await p2.evaluate(() => window.__bgmSt());
    ok(`⑥ 곡 끝 3초 전에 이어받는다(곡 끝 ${endIn.toFixed(1)}초 · 이어받기 ${t1.toFixed(1)}초) · 피아노(M4)로 · 배경음이 −90 에서 돌아온다`, Math.abs(t1 - (endIn - 3)) < 1.6 && Z.seg === 'M4' && !Z.paused[Z.on] && W.want > -90, { t1, endIn, Z, W });
    ok('⑥ 쪽 오류 0', !e2.length, e2.slice(0, 2)); await c2.close(); }
  /* ⑦ ref 값(bgm-slots · 메모) */
  { const B = require(path.join(ROOT, 'assets/bgm-slots.js'));
    ok('⑦ ref — S7 300초 · S10 진행 600 · 확보 1800 + 마지막 곡 큐 · S1 «개식이 늦어도 이어지게(반복 목록)»', B.slot('S7').ref.sec === 300 && B.slot('S10').ref.run === 600 && B.slot('S10').ref.sec === 1800 && /마지막 곡 큐/.test(B.slot('S10').ref.note) && /개식이 늦어도 이어지게\(반복 목록\)/.test(B.slot('S1').ref.note)); }
  ok('⑤ 쪽 오류 0', !errs.length, errs.slice(0, 3));
} catch (e) { if (e.message !== 'hook') { console.log('못 쟀다 —', e.message); await br.close(); srv.close(); process.exit(2); } }
await br.close(); srv.close(); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
console.log(fail ? `bgm-seg8: FAIL ${fail}` : 'bgm-seg8: ok'); process.exit(fail ? 1 : 0);
