#!/usr/bin/env node
/* ★★[AFTER_PHOTO_LOOP_1102 사장님 «음악도 계속 나와야지»] 촬영 후 안내 뒤 추가 촬영(원하는 하객 · 두 분) 동안 음악이 끊기지 않는다.
   a 엔진 — 촬영 후 안내(after-photo) = 안내 −14 · 끝나면 1.5초에 −8 · 그 뒤 기다림 · 소거 없음(옛 90초 → 20초 걷음) · 옛 코스 귀가 인사는 종전 그대로
   b 곡 계획 — 마지막 곡(M8L) = 이어 트는 목록 · 차례 = 1순위 → 나머지 · 앞 칸에서 흐른 곡은 빼지 않고 맨 뒤로(R3 ⑦ 보탬)
   c 화면 글 — 닫는 인사 둘째 줄 «촬영 후 안내부터 마지막 곡 ‹곡명›이 흐르고, 추가 촬영이 끝날 때까지 이어져요»
   d 당일 콘솔 — after-photo GO → 안내 −14 → −8 · 가상 시간 10분이 지나도 −8 그대로(소리 있음) · 곡 끝에서 다음 곡으로 넘김 · ■ 끝내기에서만 3초에 잦아듦
   BP_CUE · BP_PICKS · BP_CON = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const CUE = process.env.BP_CUE || '', PICKSF = process.env.BP_PICKS || '', CON = process.env.BP_CON || '';
const O = require(path.join(ROOT, 'assets/ritual-open.js')); const D = require(path.join(ROOT, 'assets/ritual-data.js'));
const C = require(CUE || path.join(ROOT, 'assets/ritual-cue.js')); const P = require(PICKSF || path.join(ROOT, 'assets/bgm-picks.js'));
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 600)}`); if (!c) fail++; };

/* a 엔진 */
const base = () => { const S0 = O.applyExample({ course: 'open' }, 'standard'); S0.course = 'open'; return S0; };
const r0 = C.build(base(), { mode: 'console' }), ap = r0.cues.find((c) => /^after-photo/.test(c.slug || '')) || {};
ok('a 촬영 후 안내 — 안내 −14 · 끝나면 1.5초에 −8 · 그 뒤 기다림 · 소거 없음', ap.duck === -14 && JSON.stringify(ap.post) === JSON.stringify([{ music: 'to', v: -8, ms: 1500 }]), { slug: ap.slug, duck: ap.duck, post: ap.post });
const old = Object.keys(D.COURSES).filter((k) => !D.COURSES[k].open).map((k) => C.build({ course: k }, { mode: 'console' }).cues.filter((c) => c.slug === 'end-2-goodbye').pop()).filter(Boolean);
ok('a 옛 코스 귀가 인사는 종전 그대로(90초 → 20초)', old.length > 0 && old.every((g) => JSON.stringify(g.post) === JSON.stringify([{ music: 'to', v: -8, ms: 1500 }, { wait: 90000 }, { music: 'to', v: -90, ms: 20000 }])), old.map((g) => g.post));

/* b 곡 계획 */
const pl = P.plan(base(), { on: () => true }), m8 = pl.M8L || {}, m4 = (pl.M4 || {}).list || [];
const shared = (P.PICKS.M8L || []).filter((f) => m4.indexOf(f) > -1);
ok('b 마지막 곡 = 이어 트는 목록(M8L) · 1순위 먼저 · 세 곡 모두 · 앞 칸에서 흐른 곡은 맨 뒤로', P.loopy('M8L') && (m8.list || []).length === (P.PICKS.M8L || []).length && m8.list[0] === P.PICKS.M8L[0] && shared.every((f) => m8.list.indexOf(f) >= m8.list.length - shared.length), { list: m8.list, m4, shared });

/* c 화면 글 */
const SL = fs.readFileSync(path.join(ROOT, 'assets/bgm-slots.js'), 'utf8');
ok('c 닫는 인사 둘째 줄 — «촬영 후 안내부터 마지막 곡 ‹곡명›이 흐르고, 추가 촬영이 끝날 때까지 이어져요»', SL.indexOf("last: '촬영 후 안내부터 마지막 곡 ‹{f}›이 흐르고, 추가 촬영이 끝날 때까지 이어져요'") > -1);

/* d 당일 콘솔 */
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); console.log(fail ? `AFTER PHOTO LOOP FAIL ${fail}` : 'AFTER PHOTO LOOP OK (콘솔 못 잼)'); process.exit(fail ? 1 : 2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
function wav(sec, f, sr = 16000) { const n = Math.round(sr * sec), b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(f ? 8000 * Math.sin(2 * Math.PI * f * i / sr) : 0), 44 + i * 2); return b; }
const SHORT = wav(0.6, 330);
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
  if (/^\/assets\/audio\/narration\/.+\.mp3$/.test(u)) { r.writeHead(200, { 'Content-Type': 'audio/wav' }); r.end(SHORT); return; }
  const p = (PICKSF && u === '/assets/bgm-picks.js') ? PICKSF : (CUE && u === '/assets/ritual-cue.js') ? CUE : (CON && u === '/console.html') ? CON : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
try {
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }), errs = [], pg = await ctx.newPage(); pg.on('pageerror', (e) => errs.push(e.message));
  await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; window.__bgmLog = [];   /* 30초 이상 기다리는 예약을 적어 둔다 — 옛 판은 촬영 후 안내 뒤 90초 → 20초 소거를 건다 */
    const st = window.setTimeout, ct = window.clearTimeout; window.__longT = new Map(); window.__longOn = false;
    window.setTimeout = function (f, ms) { const id = st.apply(window, arguments); if (window.__longOn && +ms >= 30000) window.__longT.set(id, +ms); return id; };
    window.clearTimeout = function (id) { window.__longT.delete(id); return ct.apply(window, arguments); }; });
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: '{"ok":true}' })));
  await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(base())).toString('base64'))}`); await pg.waitForTimeout(900);
  const TMP = fs.mkdtempSync(path.join(require('os').tmpdir(), 'apl-'));
  for (let n = 1; n <= 3; n++) { const p = path.join(TMP, 'M8L' + n + '.wav'); fs.writeFileSync(p, wav(9, 200 + n * 40)); await pg.setInputFiles(`.sg[data-seg="M8L"] .sg-song:nth-of-type(${n}) [data-seg-file]`, p, { timeout: 4000 }); }
  await pg.waitForTimeout(1200); await pg.click('#go'); await pg.waitForTimeout(700);
  const plan = await pg.evaluate(() => window.__segPlan('M8L'));
  ok('d 콘솔 마지막 곡 재생 목록 = 세 곡(이어 트는 목록)', Array.isArray(plan) && plan.length === 3, plan);
  const iA = await pg.evaluate(() => window.__bgmR().findIndex((c) => /^after-photo/.test(c.slug || '')));
  await pg.evaluate((i) => { window.__longOn = true; window.__bgmGo.fire(i); }, iA);
  const tr = []; for (let z = 0; z < 24; z++) { await pg.waitForTimeout(500); tr.push(await pg.evaluate(() => { const b = window.__bgmSt(), s = window.__seg.st(); return [b.phase, b.want, s.seg, s.id]; })); if (z > 4 && tr[tr.length - 1][1] === -8 && tr[tr.length - 1][0] !== 'clip') break; }
  ok('d after-photo GO → 안내 동안 −14 → 끝나면 −8 · 마지막 곡(M8L)', tr.some((x) => x[1] === -14) && tr[tr.length - 1][1] === -8 && tr[tr.length - 1][2] === 'M8L', tr);
  await pg.waitForTimeout(2500);   /* 뒤처리(−8 로 1.5초)가 다 걸린 뒤 */
  const a10 = await pg.evaluate(() => { const b = window.__bgmSt(), s = window.__seg.st(); return { want: b.want, now: b.now, seg: s.seg, id: s.id, paused: s.paused, phase: b.phase, longT: [...window.__longT.values()] }; });
  ok('d 추가 촬영 동안 −8 · 재생 중 · 긴 예약(30초 이상 · 옛 90초 기다림 → 20초 소거) 0 = 몇 분이 지나도 음악이 그대로', a10.want === -8 && a10.seg === 'M8L' && a10.paused.some((p) => p === false) && !a10.longT.length, a10);
  const ids = new Set([a10.id]); for (let z = 0; z < 26; z++) { await pg.waitForTimeout(500); const s = await pg.evaluate(() => window.__seg.st()); ids.add(s.id); }   /* 곡(9초)은 실제 시간으로 흐른다 — 끝 3초 전 다음 곡 */
  const a2 = await pg.evaluate(() => { const b = window.__bgmSt(), s = window.__seg.st(); return { want: b.want, seg: s.seg, id: s.id, list: s.list, paused: s.paused }; });
  ok('d 곡 끝에서 목록의 다음 곡으로 넘김(13초 동안 두 곡 이상) · 크기 −8 그대로', ids.size >= 2 && a2.want === -8 && a2.seg === 'M8L', { ids: [...ids], a2 });
  const vol = () => pg.evaluate(() => { const s = window.__seg.st(); return { v: Math.max.apply(null, s.vol.map((x, k) => (s.paused[k] ? 0 : +x || 0))), phase: window.__bgmSt().phase }; });
  const h0 = await vol(); const nLog = await pg.evaluate(() => window.__bgmLog.length); await pg.evaluate(() => window.__bgmGo.tap());   /* ■ 끝내기(마지막 큐 뒤 GO) */
  await pg.waitForTimeout(1500); const h1 = await vol(); await pg.waitForTimeout(2200); const h2 = await vol(); const lg = await pg.evaluate((n) => window.__bgmLog.slice(n).map((x) => [x.db, x.ms]), nLog);
  ok('d ■ 끝내기에서만 잦아듦 — 3초에(1.5초엔 아직 들림 · 3.7초엔 끝 · 옛 6초면 3.7초에 아직 들림)', h1.v > 0.005 && h2.v <= 0.005 && h2.phase === 'end' && lg.length === 1 && lg[0][0] === -90 && lg[0][1] === 3000, { h0, h1, h2, lg });
  ok('d 쪽 오류 0', !errs.length, errs.slice(0, 3)); await ctx.close();
} catch (e) { ok('d 검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 500)); }
await br.close(); srv.close();
console.log(fail ? `AFTER PHOTO LOOP FAIL ${fail}` : 'AFTER PHOTO LOOP OK');
process.exit(fail ? 1 : 0);
