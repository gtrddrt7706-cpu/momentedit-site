// [EDIT_CANCEL_FILES 2026-10-03 · R6-01] ④ «변경»으로 들어간 수정에서 줄 파일을 지우고 «취소»하면 —
//   글 · 칩은 스냅샷으로 돌아가지만 파일 상태(S.up)는 지운 그대로 남아야 한다(서버에서 이미 지워졌다).
//   종전엔 S 를 통째로 되돌려 S.up 이 휴지통에 간 옛 파일 id 를 다시 가리켰고, ②·④ 는 완료인데 소리는 없었다.
//
//   node scripts/audit/edit-cancel-files.mjs      # 390 · 1280
// ★종료 코드 [CANT_LOOK] 0 = 통과 · 1 = 실패 · 2 = 재지 못함(도구 없음)
// ★깨 보기: 같은 길을 종전 취소(S=JSON.parse(_editSnap))로 돌리면 S.up.g0 이 되살아나야 한다 — 이 검사가 살아 있는지 함께 본다.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0;
const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch();
for (const w of [390, 1280]) {
  const ctx = await br.newContext({ viewport: { width: w, height: 900 }, hasTouch: w < 1000 });
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await pg.waitForTimeout(600);
  const next = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(450); };
  await next(); await next();
  await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(400);
  // AI 판 · 하객 맞이 첫 줄(g0)을 AI 로 만들어 둔 상태 → ④
  await pg.evaluate(() => { RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; S.vsChip = 1; S.vsAsked = 1; S.guestVoice = 'couple'; S.vfill = { guest: 'ai' }; S.up = { g0: { n: 'AI', id: 'F_OLD', at: '2026-10-03 10:00', src: 'ai', by: 'groom' } }; S.fAt = S.fAt || {}; S.fAt['up.g0'] = 1000; S.welcome = 'self'; opSync(); goDone(); });
  await pg.waitForTimeout(500);
  const run = async (legacy) => {
    await pg.evaluate(() => { S.up = { g0: { n: 'AI', id: 'F_OLD', at: '2026-10-03 10:00', src: 'ai', by: 'groom' } }; S.fAt['up.g0'] = 1000; goDone(); });
    await pg.waitForTimeout(300);
    await pg.click('[data-fk="sum:guest"]'); await pg.waitForTimeout(500);
    // 수정 중에 글 칸도 하나 바꾼다(이것은 취소로 되돌아가야 한다)
    await pg.evaluate(() => { S.welcomeText = '취소되어야 할 글'; mkUpDel('g0'); });
    await pg.waitForTimeout(200);
    await pg.click('.ord-ask .oa-yes'); await pg.waitForTimeout(300);
    const mid = await pg.evaluate(() => ({ up: (S.up || {}).g0, er: editReturn }));
    if (legacy) await pg.evaluate(() => { window._editCancel = function () { S = JSON.parse(_editSnap); }; });   // 깨 보기 — 종전 취소
    await pg.click('#prev'); await pg.waitForTimeout(500);
    return Object.assign(mid, await pg.evaluate(() => ({ k: STEPS[idx].k, up: (S.up || {}).g0, at: (S.fAt || {})['up.g0'], txt: S.welcomeText, saved: localStorage.getItem('me_order') || '' })));
  };
  const r = await run(false);
  ok(`${w} ④ «변경» → 줄 지우기 → «취소» — ④ 로 돌아온다`, r.k === 'done' && r.er === true, JSON.stringify(r).slice(0, 200));
  ok(`${w} 취소 뒤에도 지운 파일은 지운 그대로(S.up.g0 === 0 · 시각도 지금 것) [EDIT_CANCEL_FILES]`, r.up === 0 && r.at > 1000, JSON.stringify({ up: r.up, at: r.at }));
  ok(`${w} 고르는 값(글)은 스냅샷으로 되돌아간다`, r.txt !== '취소되어야 할 글', String(r.txt));
  ok(`${w} 기기 저장본도 지운 상태(옛 파일 id 없음)`, !/F_OLD/.test(r.saved), r.saved.slice(0, 120));
  const b = await run(true);
  ok(`${w} 깨 보기 — 종전 취소는 옛 파일을 되살린다(검사가 살아 있음)`, b.up && b.up.id === 'F_OLD', JSON.stringify(b.up));
  ok(`${w} pageerror 0`, errs.length === 0, errs.join(' | '));
  await ctx.close();
}
await br.close(); srv.close();
process.exit(fail ? 1 : 0);
