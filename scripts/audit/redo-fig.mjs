// ★[REDO_FIG 2026-10-06 사장님 «클릭해서 작은 창으로 그림으로 보여 주면서 이해시키면 · 원하면 자세히 보기»] 두 분 목소리 쪽(390 · 1280)
//   ①«다시 녹음» 안내 줄 끝에 «자세히 보기» · 줄 높이 그대로 ②누르면 작은 창 — 세 걸음 + 줄 그림 세 줄(확정됨 → 그대로 · 확정 전 → 새 목소리로 · 다른 분 → 그대로)
//   ③가로 넘침 없음 · 줄 그림 칸이 한 줄 ④«알겠어요» · Esc 로 닫힘 ⑤그림 내용 = 실제 동작(_vcAutoFill renew 거르는 식)
//   ⑥[VS_READY_SHORT] 안내 목소리 창에서 AI 를 골랐을 때 두 분 목소리가 다 있으면 사람 카드 없이 한 줄 · 이동 링크
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
const SHOT = process.env.REDO_SHOT || '';
try {
  for (const w of [390, 1280]) {
    const pg = await br.newPage({ viewport: { width: w, height: 900 }, hasTouch: w < 1000 }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(700);
    await pg.evaluate(() => { courseStarted = true; S.on = S.on || {}; ['entry', 'prevideo'].forEach((k) => { S.on[k] = 1; }); S.guestVoice = 'couple'; S.entryVoice = 'couple'; S.pvVoice = 'couple'; S.vfill = { guest: 'ai', entry: 'ai', prevideo: 'nar' }; RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; VC.st = { groom: { ready: true }, bride: { ready: false } }; for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); } });
    await wait(500); await pg.evaluate(() => mkGo('_voice')); await wait(700);
    const a = await pg.evaluate(() => { const p = document.querySelector('.mk-vredo'), b = p && p.querySelector('[data-fk="mkredo"]'); if (!b) return {}; const r = b.getBoundingClientRect(); return { t: b.textContent, h: r.height, w: r.width, lh: p.getBoundingClientRect().height }; });
    ok(`${w} ① 안내 줄 끝 «자세히 보기» · 누르는 칸 44 이상`, a.t === '자세히 보기' && a.h >= 44 && a.w >= 44, JSON.stringify(a));
    await pg.click('[data-fk="mkredo"]'); await wait(400);
    const b = await pg.evaluate(() => { const d = document.getElementById('mkRecDlg'); const c = d && d.querySelector('.mk-dlg-c'); const rows = [...document.querySelectorAll('.mk-rd-row')].map((r) => [...r.children].map((x) => x.textContent.trim()).join('|'));
      const over = [...document.querySelectorAll('.mk-rd-row *')].some((x) => x.scrollWidth > x.clientWidth + 1 && getComputedStyle(x).overflow !== 'visible');
      const one = [...document.querySelectorAll('.mk-rd-row')].every((r) => r.offsetHeight <= 46);
      return { dlg: !!(d && d.querySelector('[role=dialog][aria-modal=true]')), t: (document.getElementById('mkDlgT') || {}).textContent, steps: document.querySelectorAll('.mk-rd-steps li').length, rows, over, one, hx: c ? c.scrollWidth <= c.clientWidth + 1 : false }; });
    ok(`${w} ② 작은 창 «다시 녹음하면 이렇게 돼요» · 세 걸음 · 줄 그림 세 줄`, b.dlg && b.t === '다시 녹음하면 이렇게 돼요' && b.steps === 3 && b.rows.join('/') === '신랑|하객 맞이 1|확정됨|→|그대로/신랑|하객 맞이 2|확정 전|→|새 목소리로/신부|하객 맞이 3|확정 전|→|그대로', JSON.stringify(b));
    ok(`${w} ③ 가로 넘침 없음 · 그림 칸 잘림 없음 · 줄마다 한 줄`, b.hx && !b.over && b.one, JSON.stringify(b));
    if (SHOT) await pg.screenshot({ path: `${SHOT}-${w}.png` });
    await pg.click('[data-fk="mkredook"]'); await wait(300);
    ok(`${w} ④ «알겠어요» → 닫힘`, await pg.evaluate(() => !document.getElementById('mkRecDlg') && !MK.redo));
    await pg.click('[data-fk="mkredo"]'); await wait(200); await pg.keyboard.press('Escape'); await wait(300);
    ok(`${w} ④ Esc 로 닫힘`, await pg.evaluate(() => !document.getElementById('mkRecDlg') && !MK.redo));
    /* ★[VS_READY_SHORT 2026-10-06 사장님 «여기서 이걸 보여 줄 필요가 있어?»] 안내 목소리 창 · AI 고름 — 두 분 다 있으면 사람 카드 없이 «정했어요» 한 줄 · 한 분이라도 없으면 카드 */
    const v = await pg.evaluate(() => { VC.st = { groom: { ready: true }, bride: { ready: true } }; VS.open = true; VS.ph = 'ai'; render(); const d = document.getElementById('mkRecDlg');
      const r1 = { cards: d ? d.querySelectorAll('.mk-vpc').length : -1, big: ((d && d.querySelector('.mk-dlg-big')) || {}).textContent, guide: d ? d.querySelectorAll('.mk-vsg').length : -1, link: !!(d && d.querySelector('[data-fk="mkvsvoice"]')), t: (document.getElementById('mkDlgT') || {}).textContent };
      VC.st = { groom: { ready: true }, bride: { ready: false } }; render(); const d2 = document.getElementById('mkRecDlg'); r1.part = d2 ? d2.querySelectorAll('.mk-vpc').length : -1;
      VC.st = { groom: { ready: true }, bride: { ready: true } }; render(); return r1; });
    ok(`${w} ⑥ 두 분 다 있으면 카드 없이 «두 분 목소리로 정했어요» · 한 분이 없으면 카드 [VS_READY_SHORT]`, v.cards === 0 && v.guide === 0 && /두 분 목소리로 정했어요/.test(v.big || '') && v.link && v.t === '안내 목소리 정하기' && v.part === 2, JSON.stringify(v));
    if (SHOT) await pg.screenshot({ path: `${SHOT}-vs-${w}.png` });
    await pg.click('[data-fk="mkvsvoice"]'); await wait(400);
    ok(`${w} ⑥ «두 분 목소리로 이동하기» → 창 닫힘 · 두 분 목소리 쪽`, await pg.evaluate(() => !document.getElementById('mkRecDlg') && !VS.open && !!document.querySelector('.mk-vpage')));
    ok(`${w} pageerror 0`, errs.length === 0, errs.slice(0, 2).join(' | '));
    await pg.close();
  }
  /* ⑤ 그림이 말하는 것 = 실제로 다시 만드는 줄을 거르는 식(_vcAutoFill) — «확정 안 한 · AI 로 만든 · 그분 줄»만 */
  const src = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8');
  ok('⑤ 그림의 근거 — renew 는 AI · 확정 안 한 줄만 다시 만든다', /renew&&v\.src==='ai'&&!\(S\.vkeep\|\|\{\}\)\[k\]/.test(src) && /mine=_vcLineWho\(k\)===w/.test(src));
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nREDO FIG FAIL ${fail}` : '\nREDO FIG OK'); process.exit(fail ? 1 : 0);
