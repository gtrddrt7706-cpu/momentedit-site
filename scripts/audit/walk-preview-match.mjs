#!/usr/bin/env node
/* ★★[WALK_PREVIEW_MATCH_1123 2026-11-23 대본 «미리 듣기는 당일과 같아야»] 사람이 걷거나 움직이는 줄(말없이 흐르는 자리 · 행동 줄)의 미리 듣기 음악 크기 = 당일 콘솔이 그 큐 사람 구간에 내는 크기
   미리 듣기: assets/bgm-bed.js lvOf(줄) · 당일: 콘솔이 읽는 엔진 값(live.duck · 없으면 큐 duck) — 같은 곡(vx)으로 비교
   갈래: 부모님께 인사 «말로»(짧게 · 길게) · «말없이» · 코스 둘 · 모든 순간 켬 · 390 · 1280 · 입장(입장 곡 따로)은 뺀다
   BP_BED = 깨 보기용 다른 bgm-bed.js 경로  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const BED = process.env.BP_BED || '';
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 700)}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const p = (BED && u === '/assets/bgm-bed.js') ? BED : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const ALL = ['prevideo', 'candle', 'guest', 'matjeol', 'welcome', 'vow', 'ring', 'declare', 'bless', 'free', 'letter', 'song', 'tribute', 'toast', 'table', 'close'];
const VARS = [{ tributeSay: 'short' }, { tributeSay: 'long' }, { tributeSay: 'none' }, { course: 'damback' }, { course: 'yaksok' }];
try {
  for (const W of [390, 1280]) {
    const ctx = await br.newContext({ viewport: { width: W, height: 900 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await pg.waitForFunction(() => window.ENG && window.ENG.RitualCue && window.BgmBed && BgmBed._t && typeof _lSteps === 'function', null, { timeout: 30000 }).catch(() => {});
    const r = await pg.evaluate(({ ALL, VARS }) => { const BB = BgmBed._t, out = []; const s0 = JSON.stringify(S);
      for (const v of VARS) { Object.assign(S, JSON.parse(s0), v); S.on = S.on || {}; ALL.forEach((k) => { S.on[k] = 1; }); try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {}
        const by = {}; (ENG.RitualCue.build(S, { mode: 'console' }).cues || []).forEach((c) => { if (c.slug && !by[c.slug]) by[c.slug] = c; });
        for (const k of ALL) { let rows = []; try { rows = _lSteps(ENG, [k]).map(_prAct); } catch (e) { continue; }
          rows.forEach((st) => { if (!(st.act || st.quiet) || st.talk || st.talk2 || !st.of) return; const c = by[st.of]; if (!c || !c.live) return;
            const day = c.live.duck === undefined ? c.duck : c.live.duck, pv = BB.lvOf(st, 'B09'), dv = BB.vx(day, 'B09');
            out.push({ v: JSON.stringify(v), k, of: st.of, txt: String(st.txt || '').slice(0, 24), pv, dv, doing: c.live.doing, walk: c.live.walkDuck != null }); }); } }
      Object.assign(S, JSON.parse(s0)); return out; }, { ALL, VARS });
    const bad = r.filter((x) => !(Math.abs(x.pv - x.dv) < 0.6));
    const walkSay = r.filter((x) => x.walk && x.doing === 'say'), walkMove = r.filter((x) => x.walk && x.doing === 'move');
    ok(`${W} 행동 · 말없이 줄 ${r.length}개 — 미리 듣기 크기 == 당일 콘솔 크기(어긋남 0)`, r.length >= 20 && !bad.length, bad.slice(0, 6));
    ok(`${W} 부모님께 인사 «말로» 걷는 줄 = 당일 한 구간 값(낭독 아래) · ${walkSay.length}갈래`, walkSay.length >= 2 && walkSay.every((x) => Math.abs(x.pv - x.dv) < 0.6), walkSay);
    ok(`${W} 부모님께 인사 «말없이» 걷는 줄 = 걷기 값(−12) 그대로`, walkMove.every((x) => Math.abs(x.pv - x.dv) < 0.6 && Math.abs(x.dv - x.pv) < 0.6), walkMove);
    ok(`${W} 쪽 오류 0`, !errs.length, errs.slice(0, 3)); await ctx.close();
  }
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); }
await br.close(); srv.close();
console.log(fail ? `WALK PREVIEW MATCH FAIL ${fail}` : 'WALK PREVIEW MATCH OK'); process.exit(fail ? 1 : 0);
