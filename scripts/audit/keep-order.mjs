// ★[KEEP_ORDER 2026-10-06 사장님 «목소리 만들기부터 설명 시작 · 처음 하객 맞이 부분만 펼쳐 있고 그 이후는 접힌 상태» → «추천대로»] 확정 안내(390 · 1280)
//   ①첫 AI 순간(하객 맞이) = 펼침 · 네 줄 · 첫 줄이 목소리 · 셋째 줄 안에 단추 모양 둘 ②다음 순간(입장 인사) = «확정 안내 보기» 한 줄로 접힘
//   ③누르면 작은 창(KEEP_DLG · 종전 펼침 «확정 안내 접기»는 걷음) ④하객 맞이가 나레이션이면 입장 인사가 첫 순간 = 펼침
//   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
//   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SHOT = process.env.KEEP_SHOT || '';
const look = (pg) => pg.evaluate(() => { const g = document.querySelector('.mk-keepg'); if (!g) return { none: 1 }; const li = [...g.querySelectorAll('.mk-keepl li')].map((x) => x.textContent.trim());
  return { shut: g.classList.contains('shut'), li, kp: g.querySelectorAll('.mk-keepl li:nth-child(3) .mk-kp').length, tg: ((g.querySelector('.mk-keept') || {}).textContent || ''), hx: document.documentElement.scrollWidth <= innerWidth }; });
try {
  for (const w of [390, 1280]) {
    const pg = await br.newPage({ viewport: { width: w, height: 900 }, hasTouch: w < 1000 }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(700);
    await pg.evaluate(() => { courseStarted = true; S.on = S.on || {}; ['entry', 'prevideo'].forEach((k) => { S.on[k] = 1; }); S.guestVoice = 'couple'; S.entryVoice = 'couple'; S.pvVoice = 'couple'; S.vfill = { guest: 'ai', entry: 'ai', prevideo: 'nar' }; RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; VC.st = { groom: { ready: true }, bride: { ready: true } }; for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); } });
    await pg.evaluate(() => { S.vfill = { guest: 'ai', entry: 'ai', prevideo: 'ai' }; S.up = S.up || {}; ['g0', 'g1', 'g2', 'g3', 'entry', 'pv'].forEach((k) => { S.up[k] = { src: 'ai', by: 'groom', name: 'x.mp3' }; }); S.vkeep = {}; });
    await wait(300); await pg.evaluate(() => mkGo('guest')); await wait(600);
    const a = await look(pg);
    ok(`${w} ① 하객 맞이 = 펼침 · 네 줄 · 첫 줄 목소리 · 셋째 줄 단추 모양 둘 · 접기 단추 없음`, !a.shut && a.li.length === 4 && /^두 분 목소리를 만들면/.test(a.li[0]) && a.kp === 2 && !a.tg && /풀려면 확정됨을 한 번 더/.test(a.li[3]) && a.hx, JSON.stringify(a));
    if (SHOT) { await pg.evaluate(() => document.querySelector('.mk-keepg').scrollIntoView({ block: 'center' })); await pg.screenshot({ path: `${SHOT}-g-${w}.png` }); }
    await pg.evaluate(() => mkGo('entry')); await wait(600);
    const b = await look(pg);
    /* ★[KEEP_IN_ROW 2026-10-06 사장님 «확정 안내 보기도 나레이션 자세히 좌측으로»] 접힌 단추는 칩 줄(나레이션 자세히 왼쪽) — 두 가로선 사이 따로 뜬 줄 없음 */
    const br2 = await pg.evaluate(() => { const t = document.querySelector('.mk-pick .cg-links [data-fk="mkkeept:entry"]'), v = t && t.nextElementSibling; return { inRow: !!t, t: t && t.textContent, next: v && v.getAttribute('data-fk'), alone: !!document.querySelector('.mk-keepg.shut') }; });
    ok(`${w} ② 입장 인사 = 접힘 · «확정 안내 보기»는 칩 줄 «나레이션 자세히» 왼쪽 · 따로 뜬 줄 없음 [KEEP_IN_ROW]`, b.none && br2.inRow && br2.t === '확정 안내 보기' && br2.next === 'mkvsopen' && !br2.alone, JSON.stringify({ b, br2 }));
    if (SHOT) { await pg.evaluate(() => document.querySelector('[data-fk="mkkeept:entry"]').scrollIntoView({ block: 'center' })); await pg.screenshot({ path: `${SHOT}-e-${w}.png` }); }
    /* ★[KEEP_DLG 2026-10-07 사장님 «다시 녹음 창처럼» → «추천대로»] 누르면 펼치지 않고 작은 창 — 세 걸음 · 그림 두 줄(첫 줄 = 지금 순간) · 알겠어요로 닫으면 연 단추로 */
    const y0 = await pg.evaluate(() => document.querySelector('[data-fk="mkkeept:entry"]').getBoundingClientRect().top);
    await pg.click('[data-fk="mkkeept:entry"]'); await wait(300);
    const c = await pg.evaluate(() => { const d = document.querySelector('#mkRecDlg .mk-dlg-c'); if (!d) return { none: 1 }; const rows = [...d.querySelectorAll('.mk-rd-row')].map((r) => [...r.children].map((x) => x.textContent.trim()));
      const fig = d.querySelector('.mk-rd-fig.kp'), over = [...d.querySelectorAll('.mk-rd-r,.mk-rd-pill')].some((x) => x.scrollWidth > x.clientWidth + 1), dr = d.getBoundingClientRect();
      return { t: d.querySelector('#mkDlgT').textContent, steps: d.querySelectorAll('.mk-rd-steps > li').length, kp: d.querySelectorAll('.mk-rd-steps .mk-kp').length, rows, fig: !!fig, over, inV: dr.left >= 0 && dr.right <= innerWidth, inline: !!document.querySelector('.mk-keepg:not(.shut) .mk-keepl') && !document.querySelector('.mk-keepg') }; });
    ok(`${w} ③ 누르면 창 «확정하면 이렇게 돼요» · 세 걸음 · 단추 모양 둘 · 그림 첫 줄 = 입장 인사(확정됨 → 그대로) · 둘째 = 확정 전 → 새로 만들어요 · 글 넘침 0 [KEEP_DLG]`,
      c.t === '확정하면 이렇게 돼요' && c.steps === 3 && c.kp === 2 && c.fig && c.rows.length === 2 && c.rows[0][0] === '입장 인사' && /확정됨/.test(c.rows[0][1]) && c.rows[0][3] === '그대로' && c.rows[1][1] === '확정 전' && c.rows[1][3] === '새로 만들어요' && !c.over && c.inV, JSON.stringify(c));
    if (SHOT) await pg.screenshot({ path: `${SHOT}-dlg-${w}.png` });
    await pg.click('[data-fk="mkkeepok"]'); await wait(300);
    const c2 = await pg.evaluate(() => ({ dlg: !!document.getElementById('mkRecDlg'), f: (document.activeElement || {}).getAttribute && document.activeElement.getAttribute('data-fk'), y: document.querySelector('[data-fk="mkkeept:entry"]').getBoundingClientRect().top, open: !!document.querySelector('.mk-keepg .mk-keepl') }));
    ok(`${w} ③-2 알겠어요 → 창 닫힘 · 초점은 «확정 안내 보기» · 아래로 펼치지 않음(자리 그대로)`, !c2.dlg && c2.f === 'mkkeept:entry' && !c2.open && Math.abs(c2.y - y0) < 2, JSON.stringify({ c2, y0 }));
    await pg.evaluate(() => { MK.keepT = {}; S.guestVoice = 'nar'; S.pvVoice = 'nar'; render(); }); await wait(300);
    const d = await look(pg);
    ok(`${w} ④ 하객 맞이 · 식전 영상이 나레이션이면 입장 인사가 첫 순간 = 펼침`, !d.shut && d.li.length === 4, JSON.stringify(d));
    ok(`${w} pageerror 0`, errs.length === 0, errs.slice(0, 2).join(' | '));
    await pg.close();
  }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nKEEP ORDER FAIL ${fail}` : '\nKEEP ORDER OK'); process.exit(fail ? 1 : 0);
