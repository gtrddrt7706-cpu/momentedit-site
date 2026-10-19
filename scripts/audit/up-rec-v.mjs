#!/usr/bin/env node
/* ★★[UP_REC_V_1019 2026-10-19 BGM 섹션 명세 2 · 사장님 «모든 bgm전부(입장)»] 두 분이 올린 곡의 «추천» 자리 = 지금 입장 목소리 길이로
   진짜 식순 화면(order-preview.html) ② 입장 «입장 음악 · 두 분이 고른 곡»에 시험 곡을 올린다
   (합성음 · 200초 · 30 · 50 · 80초에서 크게 · 찾기 점수 30 > 50 > 80 · 저장소에 음원을 두지 않는다).
   1 멘트 A(약 14.9초)로 올리면 «추천» · 고른 자리 0:30 · 장면 tv 10 · tm 0 · 문 열림은 고른 자리 그대로(엔진이 다른 후보로 옮기지 않는다)
   2 B(약 32.7초) → 0:50 · E(약 40.1초) → 1:20(0:50 은 0.4초 모자람) · 각각 tv 10 · tm 0
   3 멘트를 바꾸면 «추천 ·» 표시만 옮겨 가고 고른 자리(S.mu.hook)는 그대로 · 늦으면 «늦게 들어와요 · 더 뒤 자리를 고르면…» · 자리 줄 높이 그대로(흔들림 없음)
   4 직접 적은 자리(1:05)는 멘트를 바꿔도 그대로(«직접 적은 자리 ·»)
   5 AI 목소리를 안 만들었으면(목소리 없음) 지금 규칙(0:30)
   6 목소리를 받는 중이면(4초 안에 못 풀면) 올리자마자 고르는 자리는 지금 규칙(0:30) · 다 받으면 표시만 0:50 으로 · 고른 자리 그대로
   7 규칙 단위(upRecOf) — 다 이르면 지금 규칙 그대로(회귀 없음) · 목소리 없음(null)이면 옛 규칙과 같다 · 걷는 동안 이어지는 후보가 없으면 뒤가 가장 긴 것
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 · EM_MOD = 돌연변이 확인용(그 판의 entry-music.js 로 잰다) · SHOT = 그림 폴더 */
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const MOD = process.env.EM_MOD || '', SHOT = process.env.SHOT || '';   // SHOT=폴더 — 자리 줄 · 장면을 그림으로 남긴다(눈으로 보기)
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 600)}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const p = (MOD && u === '/assets/entry-music.js') ? MOD : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
/* 시험 곡 — 200초 · 22050Hz 모노 16bit · 조용(0.04) → 30초 크게(0.5) → 40 조용 → 50 크게(0.4) → 60 조용 → 80초부터 끝까지 크게(0.3) · 0.5초 박 */
function testSong() { const sr = 22050, n = sr * 200, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  let s = 11; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 - 0.5; };
  const lvl = (t) => t >= 80 ? 0.3 : t >= 60 ? 0.04 : t >= 50 ? 0.4 : t >= 40 ? 0.04 : t >= 30 ? 0.5 : 0.04;
  for (let i = 0; i < n; i++) { const t = i / sr, L = lvl(t), a = L > 0.1 ? L * (((t % 0.5) < 0.06) ? 1 : 0.4) : L; const v = a * (Math.sin(2 * Math.PI * 220 * t) * 0.6 + Math.sin(2 * Math.PI * 330 * t) * 0.3 + rnd() * 0.2); b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * 32767))), 44 + i * 2); }
  const f = path.join(os.tmpdir(), 'up-rec-v-test-song.wav'); fs.writeFileSync(f, b); return f; }
const SONG = testSong();
const clickNext = async (p) => { if (await p.isVisible('#next')) await p.click('#next'); else await p.click('.pk-go'); };
const near = (a, b, e = 0.15) => Math.abs(a - b) <= e;
async function openPage(W, delayB) {
  const ctx = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: W < 1000 }); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', async (rt) => { const u = rt.request().url(); if (!u.startsWith('http://127.0.0.1:' + port)) return rt.fulfill({ status: 200, body: '' });
    if (delayB && /\/06_entry-B\.mp3/.test(u)) { await new Promise((r) => setTimeout(r, delayB)); } return rt.continue(); });
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await pg.waitForTimeout(700);
  await clickNext(pg); await pg.waitForTimeout(400); await clickNext(pg); await pg.waitForTimeout(500); await clickNext(pg); await pg.waitForTimeout(1500);
  await pg.evaluate(() => mkGo('entry')); await pg.waitForTimeout(800);
  return { ctx, pg, errs };
}
const voice = async (pg, v) => { const fk = `[data-fk="lsc:entryVoice:${v}"]`; if (await pg.evaluate((s) => !!document.querySelector(s), fk)) { await pg.click(fk); await pg.waitForTimeout(600); } };
const ver = async (pg, v) => { await pg.click(`[data-fk="lsc:entry:${v}"]`); await pg.waitForTimeout(600); };
const hasSrc = (pg, v) => pg.evaluate((e) => { const e0 = S.entry; S.entry = e; try { opSync(); } catch (x) {} const st = _lSteps(ENG, ['entry']).filter((x) => /^entry-[A-F]$/.test(x.slug || ''))[0], r = !!(st && st.src); S.entry = e0; try { opSync(); } catch (x) {} return r; }, v);
async function upload(pg, first) {
  await pg.evaluate(() => { window.__u0 = EntryMusic._t.ups(); });
  if (first) { await pg.click('[data-fk="musrc:up"]'); await pg.waitForTimeout(500); if (await pg.isVisible('#mkRecDlg .mk-dlg-go')) { await pg.click('#mkRecDlg .mk-dlg-go'); await pg.waitForTimeout(300); } }
  const fc = pg.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null);
  await pg.click(first ? '[data-fk="muupopen"]' : '[data-fk="muupagain"]'); const ch = await fc;
  if (ch) await ch.setFiles(SONG); else await pg.setInputFiles('#muUpFile', SONG);
  await pg.waitForFunction(() => { const u = EntryMusic._t.ups(); return u && u !== window.__u0 && u.Sg && !u.busy; }, null, { timeout: 60000 }); await pg.waitForTimeout(400);
}
const waitV = (pg) => pg.waitForFunction(() => typeof EntryMusic._t.upNeed() === 'number', null, { timeout: 20000 }).catch(() => {});
const waitPlan = (pg, h) => pg.waitForFunction((h) => { const p = EntryMusic._t.scene().plan; return p && (h == null || Math.abs(p.H - h) < 0.2); }, h, { timeout: 20000 }).catch(() => {});
const kept = (x) => !!(x && x.plan && x.hook != null && Math.abs(x.plan.H - x.hook) < 1e-6);   // 엔진 문 열림 = 고른 자리(다른 후보로 옮기지 않았다)
const look = (pg) => pg.evaluate(() => { const u = EntryMusic._t.ups(), sc = EntryMusic._t.scene(), rows = [...document.querySelectorAll('.ls-mu .mu-hks .mu-row')], late = document.querySelector('.em-scene .em-late'), ul = document.querySelector('.ls-mu .mu-hks');
  return { cands: u && u.cands ? u.cands.map((c) => ({ t: c.t, sc: c.sc, rec: !!c.rec })) : null, pick: u && u.pick, hook: S.mu && S.mu.hook, typed: S.mu ? S.mu.typed : null, need: EntryMusic._t.upNeed(),
    plan: sc.plan, on: rows.filter((r) => r.classList.contains('on')).map((r) => r.querySelector('.mu-t').textContent).join(), rec: rows.filter((r) => /^추천 · /.test(r.querySelector('.mu-a').textContent)).map((r) => r.querySelector('.mu-t').textContent).join(),
    notes: rows.map((r) => r.querySelector('.mu-a').textContent), hs: rows.map((r) => Math.round(r.getBoundingClientRect().height * 10) / 10), ulh: ul ? Math.round(ul.getBoundingClientRect().height * 10) / 10 : null,
    late: !!late, lateTxt: late ? late.textContent.replace(/\s+/g, ' ').trim() : '', hz: document.documentElement.scrollWidth > innerWidth + 1 }; });
const shot = async (pg, W, name) => { if (!SHOT) return; fs.mkdirSync(SHOT, { recursive: true }); const box = await pg.evaluate(() => { const a = document.querySelector('.ls-mu'), b = document.querySelector('.em-scene') || a; if (!a) return null; const r1 = a.getBoundingClientRect(), r2 = b.getBoundingClientRect(); return { x: 0, y: Math.max(0, r1.top + scrollY - 8), width: innerWidth, height: Math.min(2400, r2.bottom - r1.top + 16) }; }); if (box) await pg.screenshot({ path: path.join(SHOT, `${name}-${W}.png`), clip: box, fullPage: true }); };
const sameH = (a, b) => a.hs.length === b.hs.length && a.hs.every((h, i) => Math.abs(h - b.hs[i]) < 0.6) && Math.abs(a.ulh - b.ulh) < 0.6;
const want = { A: 30, B: 50, E: 80 };
try {
  for (const W of [390, 1280]) {
    const { ctx, pg, errs } = await openPage(W, 0);
    await voice(pg, 'nar');
    const src = { A: await hasSrc(pg, 'A'), B: await hasSrc(pg, 'B'), E: await hasSrc(pg, 'E') };
    if (!src.A || !src.B || !src.E) { console.log(`못 쟀다 — 입장 멘트 A · B · E 중 소리가 없는 판이 있다(녹음 대기) ${JSON.stringify(src)}`); await ctx.close(); await br.close(); srv.close(); process.exit(fail ? 1 : 2); }
    // 1 — A 로 올리면 0:30
    await ver(pg, 'A'); await upload(pg, true); await waitV(pg); await waitPlan(pg, 30); const A1 = await look(pg);
    const ts = (A1.cands || []).slice().sort((a, b) => a.sc - b.sc).map((c) => c.t);
    ok(`${W} 0 시험 곡 후보 0:30 · 0:50 · 1:20 · 찾기 점수 30 > 50 > 80`, ts.length === 3 && near(ts[0], 30) && near(ts[1], 50) && near(ts[2], 80), A1.cands);
    const P = A1.plan || {};
    ok(`${W} 1 멘트 A(${typeof A1.need === 'number' ? (A1.need - 10.3).toFixed(2) : '?'}초)로 올리면 «추천» · 고른 자리 0:30 · S.mu.hook 30 · 장면 tv 10 · tm 0 · 문 열림 그대로 30(옮기지 않음)`,
      A1.rec === '0:30' && A1.on === '0:30' && near(A1.hook, 30) && P.tv === 10 && P.tm === 0 && near(P.H, 30) && kept(A1) && !A1.late && !A1.hz, A1);
    // 3 — 멘트를 B 로 바꾸면 표시만 0:50 · 고른 자리 그대로 · 늦게 들어와요 · 줄 높이 그대로
    await ver(pg, 'B'); await waitV(pg); await pg.waitForFunction(() => { const p = EntryMusic._t.scene().plan; return p && p.V > 30; }, null, { timeout: 20000 }).catch(() => {}); await pg.waitForTimeout(400); const B3 = await look(pg);
    ok(`${W} 3 멘트를 B 로 바꾸면 «추천 ·» 표시만 0:50 으로 · 고른 자리 0:30 그대로(S.mu.hook 30) · «늦게 들어와요 · 더 뒤 자리를 고르면…» · 자리 줄 높이 그대로`,
      B3.rec === '0:50' && B3.on === '0:30' && near(B3.hook, 30) && B3.late && /늦게 들어와요/.test(B3.lateTxt) && /더 뒤 자리를 고르면 음악이 먼저 흘러요/.test(B3.lateTxt) && sameH(A1, B3) && kept(B3) && near(B3.plan.H, 30) && B3.plan.tm > 0, { B3, hsA: A1.hs, ulA: A1.ulh });
    // 2 — B 로 다시 올리면 0:50 · E 로 바꾸면 표시만 1:20 · E 로 다시 올리면 1:20
    await upload(pg, false); await waitPlan(pg, 50); const B2 = await look(pg); await shot(pg, W, 'up-rec-B');
    ok(`${W} 2 멘트 B(${typeof B2.need === 'number' ? (B2.need - 10.3).toFixed(2) : '?'}초)로 올리면 «추천» · 고른 자리 0:50 · 장면 tv 10 · tm 0 · 문 열림 그대로 50`,
      B2.rec === '0:50' && B2.on === '0:50' && near(B2.hook, 50) && B2.plan && B2.plan.tv === 10 && B2.plan.tm === 0 && near(B2.plan.H, 50) && kept(B2) && !B2.late, B2);
    await ver(pg, 'E'); await waitV(pg); await pg.waitForFunction(() => { const p = EntryMusic._t.scene().plan; return p && p.V > 38; }, null, { timeout: 20000 }).catch(() => {}); await pg.waitForTimeout(400); const E3 = await look(pg); await shot(pg, W, 'up-rec-B-to-E');
    ok(`${W} 3b 멘트를 E 로 바꾸면 «추천 ·» 표시만 1:20 · 고른 자리 0:50 그대로 · 0:50 은 E 에 ${E3.plan ? (10 - E3.plan.tv).toFixed(2) : '?'}초 모자람(음악이 ${E3.plan ? E3.plan.tv.toFixed(2) : '?'}초 먼저) · 줄 높이 그대로`,
      E3.rec === '1:20' && E3.on === '0:50' && near(E3.hook, 50) && E3.plan && E3.plan.tm === 0 && E3.plan.tv < 10 && E3.plan.tv > 9 && sameH(B2, E3), E3);
    await upload(pg, false); await waitPlan(pg, 80); const E2 = await look(pg);
    ok(`${W} 2b 멘트 E(${typeof E2.need === 'number' ? (E2.need - 10.3).toFixed(2) : '?'}초)로 올리면 «추천» · 고른 자리 1:20 · 장면 tv 10 · tm 0 · 문 열림 그대로 80`,
      E2.rec === '1:20' && E2.on === '1:20' && near(E2.hook, 80) && E2.plan && E2.plan.tv === 10 && E2.plan.tm === 0 && near(E2.plan.H, 80) && kept(E2), E2);
    // 4 — 직접 적은 자리는 멘트를 바꿔도 그대로
    await pg.fill('#muOwn', '105'); await pg.click('[data-fk="muownset"]'); await pg.waitForTimeout(500); await ver(pg, 'A'); await waitV(pg); await pg.waitForFunction(() => { const p = EntryMusic._t.scene().plan; return p && p.V < 20; }, null, { timeout: 20000 }).catch(() => {}); await pg.waitForTimeout(400); const O4 = await look(pg);
    ok(`${W} 4 직접 적은 자리(1:05)는 멘트를 A 로 바꿔도 그대로(S.mu.typed 65 · «직접 적은 자리 ·») · «추천 ·» 표시는 0:30`,
      O4.typed === 65 && O4.on === '1:05' && O4.rec === '0:30' && O4.notes.some((x) => /^직접 적은 자리 · /.test(x)) && kept(O4), O4);
    ok(`${W} 9 쪽 오류 없음 · 가로 넘침 없음`, errs.length === 0 && !O4.hz, errs);
    await ctx.close();
  }
  // 5 · 6 — 목소리 없음 · 받는 중(06_entry-B 를 10초 늦게)
  { const { ctx, pg, errs } = await openPage(390, 10000);
    await pg.evaluate(() => { RitualOpen.FEATURE = RitualOpen.FEATURE || {}; RitualOpen.FEATURE.voiceClone = true; render(); }); await pg.waitForTimeout(400);
    await voice(pg, 'ai'); for (let i = 0; i < 3; i++) { if (await pg.evaluate(() => !!document.getElementById('mkRecDlg'))) { await pg.evaluate(() => mkDlgClose()); await pg.waitForTimeout(400); } }
    const nv = await pg.evaluate(() => EntryMusic._t.upNeed());
    await upload(pg, true); await pg.waitForTimeout(300); const N5 = await look(pg);
    ok(`390 5 AI 목소리를 안 만들었으면(목소리 없음 · need ${nv}) 지금 규칙 — «추천» · 고른 자리 0:30`, nv === null && N5.rec === '0:30' && N5.on === '0:30' && near(N5.hook, 30), N5);
    await voice(pg, 'nar'); await ver(pg, 'B');
    // 다른 곡 올리기 — B 목소리가 10초 늦게 온다 · 올리기는 길어야 4초 더 기다리고 지금 규칙으로 고른다
    const t0 = Date.now(); await upload(pg, false); const dt = (Date.now() - t0) / 1000; const W6 = await look(pg);
    ok(`390 6 목소리를 받는 중이면(4초 안에 못 풂 · ${dt.toFixed(1)}초 만에 끝) 올리자마자 고르는 자리는 지금 규칙 0:30`, W6.on === '0:30' && W6.rec === '0:30' && near(W6.hook, 30) && W6.need === 'wait', W6);
    await waitV(pg); await pg.waitForTimeout(600); const W6b = await look(pg);
    ok(`390 6b 다 받으면 «추천 ·» 표시만 0:50 으로 · 고른 자리 0:30 그대로 · 줄 높이 그대로`, W6b.rec === '0:50' && W6b.on === '0:30' && near(W6b.hook, 30) && sameH(W6, W6b), W6b);
    ok(`390 6c 쪽 오류 없음`, errs.length === 0, errs);
    await ctx.close(); }
  // 7 — 규칙 단위
  { const { ctx, pg } = await openPage(390, 0);
    const R7 = await pg.evaluate(() => { const R = EntryMusic._t.upRecOf, mk = (a) => a.map(([t, af]) => ({ t, after: af }));
      const old = (L) => { let rec = null; L.forEach((c) => { if (!rec && c.after >= 102 && c.t >= 15) rec = c; }); if (!rec) L.forEach((c) => { if (c.t >= 15 && (!rec || c.after > rec.after)) rec = c; }); return rec || L[0]; };
      const L1 = mk([[30, 170], [50, 150], [80, 120]]), g = (L, n) => R(L, n).t;
      let s = 5; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; let same = 0, early = 0, N = 400;
      for (let i = 0; i < N; i++) { const dur = 90 + rnd() * 200, k = 1 + Math.floor(rnd() * 3), L = mk(Array.from({ length: k }, () => { const t = Math.round(rnd() * (dur - 10) * 100) / 100; return [t, dur - t]; }));
        if (R(L, null) === old(L)) same++; const mx = Math.max(...L.map((c) => c.t)); if (R(L, mx + 1 + rnd() * 30) === old(L)) early++; }
      return { a: g(L1, 25.18), b: g(L1, 43.0), e: g(L1, 50.36), all: g(L1, 90), nul: g(L1, null), und: g(L1, undefined), walk: g(mk([[120, 80], [100, 100]]), 60), same, early, N }; });
    ok(`390 7 규칙 단위 — 30 · 50 · 80 에서 A 30 · B 50 · E 80 · 다 이르면(90) 지금 규칙 30 · 목소리 없음 30 · 걷는 동안 이어지는 후보가 없으면 뒤가 가장 긴 것(100) · 옛 규칙과 같음 ${R7.same}/${R7.N} · 다 이를 때 ${R7.early}/${R7.N}`,
      R7.a === 30 && R7.b === 50 && R7.e === 80 && R7.all === 30 && R7.nul === 30 && R7.und === 30 && R7.walk === 100 && R7.same === R7.N && R7.early === R7.N, R7);
    await ctx.close(); }
} finally { await br.close(); srv.close(); }
console.log(fail ? `up-rec-v: FAIL ${fail}` : 'up-rec-v: ok');
process.exit(fail ? 1 : 0);
