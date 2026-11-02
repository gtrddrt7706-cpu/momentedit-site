#!/usr/bin/env node
/* ★[GUEST_TIME_1102 2026-11-02 사장님 «우리가 세팅한 프로그램 시간표를 봐»] 하객 입장 = 본식 − DAY.guestIn(ritual-data · 10:00 · 10:20 → 20분)
   G1 원천 — DAY.guestIn = 20 · BgmPicks.guestMin = 20 · 하객 맞이 곡 목록 길이(NEED.M1) = 1200초 · 콘솔 구간 칸 글 «20분 이상» · 손으로 적은 −30 · «약 30분»(하객 맞이) 없음
   G2 식순 화면(390 · 1280) — 하객 맞이 «하객 입장 때 → 시작 10분 전» 사이 «… 약 10분 뒤» · 하객 맞이 음악 안내 «… · 약 20분»
   G3 깨 보기 — 원천을 guestIn 30 으로 바꿔 내보내면 같은 화면이 «… 약 20분 뒤» · «약 30분» · NEED.M1 = 1800(숫자가 원천을 따라간다)
   BP_ROOT = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = process.env.BP_ROOT || path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 500)}`); if (!c) fail++; };

/* G1 — Node */
{ const RD = require(path.join(ROOT, 'assets/ritual-data.js')), P = require(path.join(ROOT, 'assets/bgm-picks.js'));
  const g = P.guestMin ? P.guestMin() : null, seg = P.seg('M1') || {};
  ok('G1 원천 DAY.guestIn = 20(하객 입장 10:00 · 본식 10:20) · BgmPicks.guestMin 이 그 값', RD.DAY && RD.DAY.guestIn === 20 && g === 20, { guestIn: RD.DAY && RD.DAY.guestIn, g });
  ok('G1 하객 맞이 곡 목록 길이(NEED.M1) = guestIn × 60 · 콘솔 구간 칸 글 «20분 이상»', P.NEED.M1 === 1200 && /^20분 이상/.test(seg.need || ''), { need: P.NEED.M1, txt: seg.need });
  const was = RD.DAY.guestIn; RD.DAY.guestIn = 30; const n30 = P.NEED.M1, t30 = (P.seg('M1') || {}).need; RD.DAY.guestIn = was;
  ok('G3 원천을 30 으로 바꾸면 NEED.M1 = 1800 · «30분 이상»(손으로 적은 값이 아니다)', n30 === 1800 && /^30분 이상/.test(t30 || ''), { n30, t30 });
  const op = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8'), bed = fs.readFileSync(path.join(ROOT, 'assets/bgm-bed.js'), 'utf8'), pk = fs.readFileSync(path.join(ROOT, 'assets/bgm-picks.js'), 'utf8');
  ok('G1 손으로 적은 값 없음 — _tgAm 의 return -30 · INFO.M1 «약 30분» · NEED M1: 1800 · need «30분 이상»', !/arrival\/\.test\(c\.slug\|\|''\)\) return -30/.test(op) && !/M1:'하객이 들어와 앉는 동안 아래 곡들이 차례로 흘러요 · 약 30분'/.test(bed) && !/M1: 1800/.test(pk) && !/need: '30분 이상/.test(pk)); }

/* G2 · G3 — 식순 화면 */
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
let DAYIN = 20;
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), p = path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; }
    if (u === '/assets/ritual-data.js' && DAYIN !== 20) b = Buffer.from(String(b).replace(/guestIn: 20\b/, 'guestIn: ' + DAYIN));
    r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch();
async function look(W) {
  const ctx = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: W < 1000 }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await pg.waitForTimeout(700);
  const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else if (await pg.isVisible('.pk-go')) await pg.click('.pk-go'); await pg.waitForTimeout(450); };
  await nx(); await nx(); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300); await nx(); await pg.waitForTimeout(800);
  await pg.evaluate(() => mkGo('guest')); await pg.waitForTimeout(900);
  const r = await pg.evaluate(() => ({ rows: [...document.querySelectorAll('.mk-flow li.q-tg')].map((x) => x.textContent.replace(/ /g, ' ').trim()),
    info: ((document.querySelector('[data-seg="M1"] .bed-info') || document.querySelector('.bed-info')) || {}).textContent || '', gm: window.BgmPicks ? BgmPicks.guestMin() : -1 }));
  r.info = r.info.replace(/ /g, ' ').trim(); r.errs = errs; await ctx.close(); return r; }
try {
  for (const W of [390, 1280]) {
    DAYIN = 20; const a = await look(W);
    ok(`${W} G2 하객 맞이 — 첫 사이 «… 약 10분 뒤»(하객 입장 때 → 시작 10분 전) · 음악 안내 «· 약 20분»`, a.rows[0] === '… 약 10분 뒤' && /흘러요 · 약 20분$/.test(a.info) && a.gm === 20, a);
    DAYIN = 30; const b = await look(W);
    ok(`${W} G3 깨 보기 — 원천 guestIn 30 이면 «… 약 20분 뒤» · «약 30분»`, b.rows[0] === '… 약 20분 뒤' && /흘러요 · 약 30분$/.test(b.info) && b.gm === 30, b);
    ok(`${W} 쪽 오류 0`, !a.errs.length && !b.errs.length, [...a.errs, ...b.errs].slice(0, 3));
  }
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 500)); }
await br.close(); srv.close();
console.log(fail ? `GUEST TIME FAIL ${fail}` : 'GUEST TIME OK');
process.exit(fail ? 1 : 0);
