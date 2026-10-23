#!/usr/bin/env node
/* ★[FLOW_SIDE_STEADY 2026-10-23 사장님 «기록과 가족 그래프 창이 위아래 넓이가 넓어지고 줄어들고 하는데 똑같이 맞춰줘 · 움직임 없이 그래프 바꿔도»]
   ① 고르기 «우리 예식의 감동 흐름» 판 — 예시(정석 · 기록 · 가족 · 간결)를 차례로 눌러도 판 높이 · 그림 칸 · «다음 · 하나씩 만들기» 단추 자리가 그대로인가(390 · 1024 · 1280).
   까닭: PC 오른쪽 설명은 테이블 인사가 있으면 세 줄(테이블 · 단체 사진 · 셋을 합쳐), 없으면 두 줄이라 판이 20px 씩 늘었다 줄었다 했다.
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 900)}`); if (!c) fail++; };
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('skip flow-steady: 브라우저가 없어 재지 못함'); process.exit(2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('skip flow-steady: 브라우저 ' + e.message); srv.close(); process.exit(2); }
const clickNext = async (p) => { if (await p.isVisible('#next')) await p.click('#next'); else await p.click('.pk-go'); };
try {
  for (const W of [390, 1024, 1280]) {
    const ctx = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: W < 1000 }); const pg = await ctx.newPage(); const errs = [];
    pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route('**/*', (rt) => { const u = rt.request().url(); if (!u.startsWith('http://127.0.0.1:' + port)) return rt.fulfill({ status: 200, body: '' }); return rt.continue(); });
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await pg.waitForTimeout(800);
    await clickNext(pg); await pg.waitForTimeout(400); await clickNext(pg); await pg.waitForTimeout(600);
    const keys = await pg.evaluate(() => [...document.querySelectorAll('.pk-ex[data-fk^="opx:"]')].map((b) => b.getAttribute('data-fk')));
    const seen = [];
    for (const k of [...keys, ...keys.slice(0, -1).reverse()]) {   /* 같은 예시를 두 번 연달아 누르면 예시가 풀려 빈 판이 된다(원래 동작) — 겹치지 않게 오간다 */
      await pg.click(`[data-fk="${k}"]`); await pg.waitForTimeout(450);
      seen.push(await pg.evaluate((k) => { const fp = document.getElementById('pkFlow'), go = fp && [...fp.querySelectorAll('.pk-go')].find((b) => b.offsetParent), g = fp && fp.querySelector('.pk-fg-wrap'), exs = document.querySelector('.pk-exs');
        const r = (x) => x ? x.getBoundingClientRect() : null, f = r(fp);
        return { k, h: f ? Math.round(f.height * 10) / 10 : null, go: go ? Math.round((r(go).top - f.top) * 10) / 10 : null, gh: g ? Math.round(r(g).height * 10) / 10 : null,
          ex: exs ? Math.round(r(exs).height * 10) / 10 : null, tm: !!fp && /테이블/.test(fp.textContent), hz: document.documentElement.scrollWidth > innerWidth + 1 }; }, k));
    }
    const same = (f) => seen.every((x) => Math.abs(x[f] - seen[0][f]) < 0.6);
    ok(`${W} 예시 ${keys.length}개를 오가도 «감동 흐름» 판 높이 · 그림 칸 높이 · «다음» 단추 자리 · 예시 줄 높이가 그대로(테이블 인사가 있는 판 · 없는 판 둘 다 지난다) · 가로 넘침 없음`,
      keys.length === 4 && seen.some((x) => x.tm) && seen.some((x) => !x.tm) && same('h') && same('gh') && same('go') && same('ex') && seen.every((x) => !x.hz) && errs.length === 0, { seen, errs });
    await ctx.close();
  }
} finally { await br.close(); srv.close(); }
console.log(fail ? `flow-steady: FAIL ${fail}` : 'flow-steady: ok');
process.exit(fail ? 1 : 0);
