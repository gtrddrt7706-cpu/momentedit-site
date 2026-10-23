#!/usr/bin/env node
/* ★★[BGM_CONSOLE2_1023 REHEARSAL · DOOR_LEAD 2026-10-23 BGM 섹션 라운드 2 PR 3] 리허설 칸 · 문 신호
   ① 설정 «리허설» — 다섯 값(말 아래 −16 · 음악이 주인공 −8 · 낭독 아래 −20 · 축배 크기 0 · 축배 오름 0.6초) · 지금 프로필 «기본값(엔진)»
   ② 장소 · 출력 이름으로 저장 → 다시 열어도 그 프로필 · 그 값(이 기기)
   ③ 시작하면 그 값으로 큐를 만든다 — 서약 여는 말 크기 = 저장한 «말 아래» · 축배 GO 오름 = 저장한 축배 크기 · 오름 시간 · 위쪽 줄에 «리허설 ‹이름›»
   ④ 고객 미리 듣기는 엔진 기본값 그대로
   ⑤ 입장 장면 진행 막대에 «문 열기 시작» — «입장!» 발화 끝(하이라이트 · 출발) − doorLeadSec(3초) 자리 · 다음 큐에서 걷힌다
   ⑥ 쪽 오류 0
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 · BR_CON = 돌연변이 확인용(그 판의 console.html) */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const CON = process.env.BR_CON || '';
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const O = require(path.join(ROOT, 'assets/ritual-open.js')), C = require(path.join(ROOT, 'assets/ritual-cue.js'));
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 600)}`); if (!c) fail++; };
function wav(sec, hz) { const sr = 22050, n = sr * sec, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(0.3 * 32767 * Math.sin(2 * Math.PI * hz * i / sr)), 44 + i * 2); return b; }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const p = (CON && u === '/console.html') ? CON : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const SOF = (ex, more) => { const S = O.applyExample({ course: 'open' }, ex); S.course = 'open'; return Object.assign(S, more || {}); };
const q = (S) => `S=${encodeURIComponent(Buffer.from(JSON.stringify(S)).toString('base64'))}`;
const errs = [];
async function page(ctx, qs, gas) { const pg = await ctx.newPage(); pg.on('pageerror', (e) => errs.push(e.message));
  await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; });
  await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); const H = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
    if (gas && /script\.google\.com/.test(u)) { let b = {}; try { b = JSON.parse(rt.request().postData() || '{}'); } catch {} const g = gas(b); if (g) return rt.fulfill({ status: 200, headers: H, body: JSON.stringify(g) }); }
    return rt.fulfill({ status: 200, headers: H, body: '{"ok":true}' }); });
  await pg.goto(`http://127.0.0.1:${port}/console.html?${qs}`); await pg.waitForTimeout(900); return pg; }
const vals = (pg) => pg.evaluate(() => { const o = {}; document.querySelectorAll('[data-reh]').forEach((i) => { o[i.getAttribute('data-reh')] = i.value; }); return { o, now: (document.getElementById('rehNow') || {}).textContent || '' }; });
try {
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } });
  let pg = await page(ctx, q(SOF('record')));
  if (!(await pg.evaluate(() => !!document.getElementById('rehBox') && !!window.__bgmGo))) { ok('콘솔에 «리허설» 칸이 있다', false, '없음 — 옛 판'); throw new Error('hook'); }
  const A = await vals(pg);
  ok('① 리허설 다섯 값 = 엔진 기본(−16 · −8 · −20 · 0 · 0.6초) · 지금 프로필 «기본값(엔진)»', JSON.stringify(A.o) === JSON.stringify({ duckSpeech: '-16', duckMusic: '-8', duckRead: '-20', toastLevel: '0', toastUpMs: '0.6' }) && A.now === '기본값(엔진)', A);
  await pg.fill('[data-reh="duckSpeech"]', '-18'); await pg.fill('[data-reh="toastLevel"]', '-3'); await pg.fill('[data-reh="toastUpMs"]', '0.9'); await pg.fill('#rehName', '스튜디오 PA'); await pg.click('#rehSave'); await pg.waitForTimeout(200); await pg.close();
  pg = await page(ctx, q(SOF('record')));
  const B = await vals(pg);
  ok('② 다시 열어도 그 프로필 · 그 값(이 기기)', B.now === '스튜디오 PA' && B.o.duckSpeech === '-18' && B.o.toastLevel === '-3' && B.o.toastUpMs === '0.9' && B.o.duckMusic === '-8', B);
  await pg.evaluate(() => { window.__L = window.__bgmLog = []; }); await pg.click('#go'); await pg.waitForTimeout(500);
  const top = await pg.evaluate(() => document.getElementById('bCourse').textContent);
  const vi = await pg.evaluate(() => window.__bgmR().findIndex((c) => c.slug === 'narr-vow-in')), vd = await pg.evaluate((i) => window.__bgmR()[i].duck, vi);
  ok('③ 시작하면 그 값으로 큐를 만든다 — 서약 여는 말 크기 −18 · 위쪽 줄 «리허설 스튜디오 PA»', vd === -18 && /리허설 스튜디오 PA/.test(top), { vd, top });
  const ti = await pg.evaluate(() => window.__bgmR().findIndex((c) => c.slug === 'toast-toast')); await pg.evaluate((i) => window.__bgmGo.fire(i), ti);
  await pg.waitForFunction(() => window.__bgmSt().phase === 'live', null, { timeout: 40000 }).catch(() => {}); await pg.evaluate(() => { window.__L.length = 0; window.__bgmGo.tap(); }); await pg.waitForTimeout(200);
  const up = await pg.evaluate(() => window.__L.filter((x) => x.db !== undefined));
  ok('③ 축배 GO 오름 = 저장한 축배 크기 −3 · 0.9초', up.length >= 1 && up[0].db === -3 && up[0].ms === 900, up);
  await pg.close();
  /* ④ 미리 듣기 */
  const pv = await page(ctx, q(SOF('record')) + '&mode=preview'); await pv.click('#go'); await pv.waitForTimeout(600);
  const pd = await pv.evaluate(() => { const R0 = window.__bgmR(); const c = R0.find((x) => x.slug === 'narr-vow-in'); return c ? c.duck : null; });
  ok('④ 고객 미리 듣기는 엔진 기본값 그대로(서약 여는 말 −16)', pd === C.PARAM.duckSpeech, { pd });
  await pv.close(); await ctx.close();
  /* ⑤ 문 열기 시작 */
  { const FID = 'DOORSONG0123456789abc', SONG = wav(60, 300).toString('base64');
    const S1 = SOF('standard', { entry: 'A', entryVoice: 'nar', mu: { src: 'up', name: 'door', t: '문 시험 곡', a: '', dur: 60, hook: 40, typed: null, sid: 'x3', fid: FID } });
    const c2 = await br.newContext({ viewport: { width: 1280, height: 900 } });
    const gas = (b) => b.fn === 'adminRitualFiles' ? { ok: true, sup: {}, files: [{ key: 'mu', id: FID, name: '입장 음악 · door.wav' }] } : b.fn === 'adminRitualFileGet' ? { ok: true, id: FID, mime: 'audio/wav', data: SONG } : null;
    let p2 = await page(c2, ''); await p2.evaluate(() => { localStorage.setItem('me_admin_token', 'T0K'); }); await p2.close();
    p2 = await page(c2, q(S1) + '&rf=ME0001', gas);
    await p2.waitForFunction(() => window.__esd.s().st === 'ok', null, { timeout: 30000 }).catch(() => {});
    await p2.click('#go'); await p2.waitForFunction(() => window.__esd.s().v0, null, { timeout: 30000 }).catch(() => {});
    const I = await p2.evaluate(() => window.__esd.idx()); await p2.evaluate((i) => window.__bgmGo.fire(i), I.e); await p2.waitForTimeout(500);
    const D = await p2.evaluate(() => { const s = window.__esd.s(), pl = s.pl || {}, d = document.querySelector('#nProg .door'), l = document.getElementById('nDoor');
      return { run: s.run, th: pl.th, tot: pl.tv + pl.V, left: d ? parseFloat(d.style.left) : null, lab: l && !l.hidden ? l.textContent : '' }; });
    const want = D.tot ? (D.th - 3) / D.tot * 100 : null;
    ok(`⑤ 입장 장면 진행 막대에 «문 열기 시작» — «입장!» 끝(${D.th && D.th.toFixed(1)}초) − 3초 자리(${want && want.toFixed(1)}%)`, D.run && D.left != null && Math.abs(D.left - want) < 0.5 && /^문 열기 시작 · \d+:\d\d \(출발 3초 전\)$/.test(D.lab), D);
    await p2.evaluate((i) => window.__bgmGo.fire(i + 1), I.e); await p2.waitForTimeout(500);
    const E = await p2.evaluate(() => ({ d: !!document.querySelector('#nProg .door'), l: !document.getElementById('nDoor').hidden }));
    ok('⑤ 다음 큐(입장 받는 말)에서 걷힌다', !E.d && !E.l, E);
    await c2.close(); }
  ok('⑥ 쪽 오류 0', !errs.length, errs.slice(0, 3));
} catch (e) { if (e.message !== 'hook') { console.log('못 쟀다 —', e.message); await br.close(); srv.close(); process.exit(2); } }
await br.close(); srv.close();
console.log(fail ? `bgm-reh: FAIL ${fail}` : 'bgm-reh: ok'); process.exit(fail ? 1 : 0);
