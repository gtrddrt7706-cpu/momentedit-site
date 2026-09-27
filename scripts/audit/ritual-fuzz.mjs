// [RIT_FUZZ 2026-09-27 사장님 «직접 보면서 점검 · 시뮬레이션 돌려 봐»] 식순 만들기(order-preview) 무작위 조작 시뮬레이터
//
//   node scripts/audit/ritual-fuzz.mjs              # 360 · 390 · 1280 × RUNS(기본 12) × STEPS(기본 70)
//   RUNS=40 STEPS=120 SEED=7 SHOT=폴더 node scripts/audit/ritual-fuzz.mjs
//
// 보이는 [data-fk] 단추 · 다음/이전 · 글칸 · 파일 고르기를 무작위로 누르고, 매번 아래를 잰다.
//   ① pageerror 0          ② 보이는 글에 undefined · NaN · [object · null 없음
//   ③ 보이는 글에 전각 줄표(—) 없음(문구 규칙)   ④ 가로 넘침 0
//   ⑤ 참고 예시 칩 · 고른 예시 표시에 무드 이름 없음(EX_MORE 사장님 보정)
//   ⑥ 같은 id 두 번 없음   ⑦ 이름 없는 단추 없음
//   ⑧ (보고만) 한 화면에 같은 문장(14자 이상)이 두 번 보이는 곳 — «쓸데없는 중복» 후보
// ★종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import http from 'node:http';
import { execFileSync } from 'node:child_process'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const RUNS = +process.env.RUNS || 12, STEPS = +process.env.STEPS || 70, SHOT = process.env.SHOT || '';
let seed = +process.env.SEED || 20260927; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'ritfz-')); const wav = path.join(TMP, 'a.wav');
try { execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', "aevalsrc='if(between(t,0.5,2.5),0.2*sin(2*PI*220*t),0)':s=24000:d=3", wav]); } catch { fs.writeFileSync(wav, ''); }
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
const TEXTS = ['', '엄마, 아빠. 키워 주셔서 고맙습니다.', '하윤아. 오늘부터 우리 둘이 한 편이야.', '이서준 정하윤 김민재', 'a'.repeat(400), '<b>굵게</b> & "따옴표"', '가'.repeat(30) + '\n\n' + '나'.repeat(30)];
const MOOD = /담백|다정|격식|유머|그리움|솔직하게|장면 하나|짧게|나눠 읽기|한 분이 읽기/;
const bad = new Map(); const dups = new Map(); let acts = 0;
const note = (m, key, w, trail) => { if (!bad.has(key)) bad.set(key, { m, w, trail: trail.slice(-8).join(' → ') }); };
for (const w of (process.env.W || '360,390,1280').split(',').map(Number)) {
  for (let run = 0; run < RUNS; run++) {
    const ctx = await br.newContext({ viewport: { width: w, height: 860 }, permissions: ['microphone'] }); const pg = await ctx.newPage();
    const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); pg.on('dialog', (d) => d.dismiss().catch(() => {}));
    pg.on('filechooser', (fc) => fc.setFiles(wav).catch(() => {}));
    await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); return rt.fulfill({ status: 200, body: '' }); });
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`); await pg.waitForTimeout(600);
    const trail = [];
    /* 판의 절반은 ② 하나씩 만들기까지 빨리 간다(예시 하나 고르고) — 첫 화면만 맴돌지 않게 */
    if (process.env.FOCUS || run % 2 === 0) { await pg.evaluate(async () => { const z = (t) => new Promise((r) => setTimeout(r, t)); for (let i = 0; i < 2; i++) { document.getElementById('next').click(); await z(350); } const ex = [...document.querySelectorAll('[data-fk^="opx:"]')]; ex.length && ex[Math.floor(Math.random() * ex.length)].click(); await z(300); document.getElementById('next').click(); await z(900); }); trail.push('(②까지)'); }
    for (let s = 0; s < STEPS; s++) {
      const cands = await pg.evaluate(() => {
        const vis = (e) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && !e.closest('[hidden]') && !e.disabled; };
        const out = []; let i = 0;
        document.querySelectorAll('[data-fk],#next,#prev,.pk-go,textarea,input[type=text],input[type=checkbox],select').forEach((e) => { if (e.id === 'obExit' || !vis(e)) return; const id = 'fz' + (i++); e.setAttribute('data-fz', id); out.push({ id, fk: e.getAttribute('data-fk') || e.id || e.tagName.toLowerCase(), tag: e.tagName }); });
        return out;
      });
      if (process.env.FOCUS) { const keep = cands.filter((x) => !/^(prev|obguide|obrestart|mkback|done2write|lfprev)/.test(x.fk)); if (keep.length) cands.splice(0, cands.length, ...keep); }   // FOCUS=1 — 뒤로 가는 단추를 빼 ②③④ 깊이 들어간다
      if (!cands.length) break;
      // 앞으로 가는 쪽에 조금 무게를 준다(안 그러면 첫 화면만 맴돈다)
      let c = rnd() < 0.25 ? (cands.find((x) => x.fk === 'next' || /opgo|pk-go/.test(x.fk)) || pick(cands)) : pick(cands);
      if (/^(mkrecuse|mkupdel|mkvcdel|prclear)/.test(c.fk) && rnd() < 0.5) c = pick(cands);
      trail.push(c.fk);
      try {
        if (c.tag === 'TEXTAREA' || c.tag === 'INPUT' && c.fk !== 'input') { const t = await pg.$(`[data-fz="${c.id}"]`); const typ = await t.getAttribute('type'); if (typ === 'checkbox') await t.click({ timeout: 1500 }); else await t.fill(pick(TEXTS), { timeout: 1500 }); }
        else if (c.tag === 'SELECT') { await pg.evaluate((id) => { const e = document.querySelector(`[data-fz="${id}"]`); if (e && e.options.length) { e.selectedIndex = Math.floor(Math.random() * e.options.length); e.dispatchEvent(new Event('change', { bubbles: true })); } }, c.id); }
        else await pg.evaluate((id) => { const e = document.querySelector(`[data-fz="${id}"]`); if (e) { e.scrollIntoView({ block: 'center' }); e.click(); } }, c.id);   // 고정 단추 줄에 가려도 누른다(사람은 스크롤해서 누른다)
      } catch { /* 가려짐 · 떠남 — 다음 걸음 */ }
      acts++;
      await pg.waitForTimeout(/mkrec$|mkrec:/.test(c.fk) ? 900 : 160);
      if (await pg.evaluate(() => typeof MK_REC !== 'undefined' && MK_REC && MK_REC.ph === 'rec')) { await pg.waitForTimeout(700); await pg.evaluate(() => { const b = document.querySelector('[data-fk="mkrecstop"]'); b && b.click(); }); await pg.waitForTimeout(900); }
      const r = await pg.evaluate(() => {
        const st = document.getElementById('stage'); const body = document.body.innerText || '';
        const ov = document.documentElement.scrollWidth - innerWidth;
        const wide = []; if (ov > 1) document.querySelectorAll('#stage *').forEach((e) => { const b = e.getBoundingClientRect(); if (b.right > innerWidth + 1 && b.width > 0 && !e.closest('[style*="overflow"]')) wide.push((e.className || e.tagName) + ':' + Math.round(b.right)); });
        const chips = [...document.querySelectorAll('.mk-rc b,.lf-refb')].map((e) => e.innerText).join(' | ');   // 이름표만 — 미리보기 본문(«오늘은 짧게 할…»)은 예시 글이라 무드 낱말이 들어 있을 수 있다
        const ids = {}; const dupId = []; document.querySelectorAll('[id]').forEach((e) => { if (ids[e.id]) dupId.push(e.id); ids[e.id] = 1; });
        const noname = [...document.querySelectorAll('button')].filter((b) => { const r = b.getBoundingClientRect(); return r.width > 0 && getComputedStyle(b).visibility !== 'hidden' && !(b.textContent || '').trim() && !b.getAttribute('aria-label') && !b.getAttribute('title'); }).map((b) => b.getAttribute('data-fk') || b.className);
        const lines = (st ? st.innerText : '').split('\n').map((x) => x.trim()).filter((x) => x.length >= 14); const cnt = {}; lines.forEach((x) => cnt[x] = (cnt[x] || 0) + 1);
        const pageK = (typeof STEPS !== 'undefined' && typeof idx !== 'undefined' && STEPS[idx]) ? STEPS[idx].k + (typeof _mkIdx === 'function' && STEPS[idx].k === 'listen' ? ':' + _mkIdx() : '') : '?';
        return { body: body.slice(0, 20000), ov, wide: wide.slice(0, 4), chips, dupId: [...new Set(dupId)], noname, dup: Object.keys(cnt).filter((k) => cnt[k] > 1), pageK };
      });
      if (errs.length) { note('pageerror: ' + errs[0], 'pe:' + errs[0].slice(0, 80), w, trail); errs.length = 0; }
      const m = r.body.match(/[^\n]{0,30}(undefined|NaN|\[object|\bnull\b)[^\n]{0,30}/); if (m) note('보이는 글에 ' + m[1] + ': «' + m[0] + '»', 'u:' + m[0], w, trail);
      const d = r.body.match(/[^\n]{0,30}—[^\n]{0,30}/); if (d) note('전각 줄표: «' + d[0] + '»', 'd:' + d[0], w, trail);
      if (r.ov > 1) note(`가로 넘침 ${r.ov}px @${r.pageK} ${r.wide.join(' ')}`, 'ov:' + r.pageK + ':' + w, w, trail);
      const mm = r.chips.match(MOOD); if (mm) note(`칩/배지에 무드 이름 «${mm[0]}» @${r.pageK}: ${r.chips.slice(0, 120)}`, 'mood:' + mm[0], w, trail);
      if (r.dupId.length) note(`같은 id 두 번: ${r.dupId.join(',')} @${r.pageK}`, 'id:' + r.dupId.join(','), w, trail);
      if (r.noname.length) note(`이름 없는 단추: ${r.noname.join(',')} @${r.pageK}`, 'nn:' + r.noname.join(','), w, trail);
      for (const x of r.dup) { const k = r.pageK.split(':')[0] + '|' + x; if (!dups.has(k)) dups.set(k, { w, page: r.pageK, x }); }
      if (SHOT && s % 25 === 24) { fs.mkdirSync(SHOT, { recursive: true }); await pg.screenshot({ path: path.join(SHOT, `${w}-r${run}-s${s}-${r.pageK.replace(/[^a-z0-9]/gi, '_')}.png`) }); }
    }
    await ctx.close();
  }
}
await br.close(); srv.close();
console.log(`조작 ${acts}회 · 폭 3 × ${RUNS}판 × 최대 ${STEPS}걸음`);
for (const [, v] of bad) console.log(`FAIL [${v.w}] ${v.m}\n     ← ${v.trail}`);
console.log(`\n(보고만) 한 화면 같은 문장 두 번 — ${dups.size}곳`); for (const [, v] of dups) console.log(`  [${v.w} ${v.page}] ${v.x.slice(0, 90)}`);
console.log(bad.size ? `\n빨간 ${bad.size}건` : '\nRIT_FUZZ OK'); process.exit(bad.size ? 1 : 0);
