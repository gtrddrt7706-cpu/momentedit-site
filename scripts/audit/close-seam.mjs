#!/usr/bin/env node
/* ★[CLOSE_SEAM_1018 인스타 섹션 검토 86 · 87] 마지막 순간 → 닫는 인사 이음새
   엔진 — 담을 순간 13개의 모든 조합(분위기 없음 · seamFit 을 거친 판)에서
     ① 마지막 순간이 축사면 닫는 인사 앞에 B10 «축사해 주신 분께 박수» · ② 선언 박수면 B9 «선언해 주신 분께서는 …»
     ③ B9 뒤 닫는 인사는 디렉터 GO(사슬 아님) · ④ B10 과 닫는 멘트가 둘 다 박수를 청하는 판 0 · ⑤ 옛 코스는 그대로(이음말 없음)
   화면(폰 390 · PC 1280 · 브라우저가 있을 때) — 정석에서 축가 · 부모님께 인사를 빼면 닫는 멘트 칩이 예시 3 으로 눌리고 ·
     순간을 되살리면 예시 1 로 돌아오고 · 두 분이 닫는 멘트 칩을 누른 날은 그대로
   --selftest = 깨 보기(이음새를 끄면 ① 이 빨강) · --fast = 가드용(CI 3분 한도 · 뒤쪽 순간 8개만 전수 × 앞쪽 두 판 · 화면 건너뜀) · 종료 코드 0 통과 · 1 실패 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const SELF = process.argv.includes('--selftest'), FAST = process.argv.includes('--fast');
const TAIL = ['declare', 'bless', 'free', 'song', 'letter', 'tribute', 'toast', 'table'];   // 닫는 인사 앞 «마지막 순간»을 가르는 순간들
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };

function load(off) {
  const vm = require('node:vm'); const ctx = { console }; ctx.window = ctx; ctx.self = ctx; vm.createContext(ctx);
  for (const f of ['assets/ritual-data.js', 'assets/ritual-open.js', 'assets/ritual-cue.js']) {
    let src = fs.readFileSync(path.join(ROOT, f), 'utf8');
    if (off && f.endsWith('ritual-cue.js')) src = src.replace("if (_cSeam) cues.push(", 'if (false) cues.push(');
    vm.runInContext(src, ctx, { filename: f });
  }
  return { O: ctx.RitualOpen, C: ctx.RitualCue };
}
const CLAP = /박수[^.!?]*(부탁|바랍니다|주시면|주십시오|주세요|맞아)/;
function sweep({ O, C }) {
  const P = O.PICKABLE.filter((k) => O.picked({ course: 'open', on: { [k]: 1 } }).length);
  const base = O.applyExample({ course: 'open' }, 'standard');
  const r = { n: 0, sp: 0, spMiss: 0, de: 0, deMiss: 0, chain: 0, dbl: 0, P: P.length };
  const masks = [];
  if (!FAST) for (let m = 1; m < (1 << P.length); m++) masks.push(m);
  else { const head = P.filter((k) => !TAIL.includes(k)), all = (1 << P.length) - 1;
    const hb = head.reduce((a, k) => a | (1 << P.indexOf(k)), 0);
    for (const h of [hb, 0]) for (let t = 0; t < (1 << P.length); t++) { if (t & hb) continue; const m = h | t; if (m && m <= all) masks.push(m); } }
  for (const m of masks) {
    const S = JSON.parse(JSON.stringify(base)); S.on = {}; P.forEach((k, i) => { if (m >> i & 1) S.on[k] = 1; });
    C.seamFit(S, 'close');
    let cs; try { cs = C.build(S, { mode: 'console' }).cues; } catch (e) { continue; } r.n++;
    const i = cs.findIndex((c) => c.slug === 'narr-close-bow'); if (i < 1) continue;
    const seam = /^bridge-b(9|10)-/.test(cs[i - 1].slug) ? cs[i - 1] : null, last = seam ? cs[i - 2] : cs[i - 1];
    if (last.k === 'free' && S.freeWhat === 'speech' && O.picked(S).includes('free')) { r.sp++; if (!seam || seam.slug !== 'bridge-b10-speech-clap') r.spMiss++; }
    if (last.k === 'declare' && last.live && last.live.applause) { r.de++; if (!seam || seam.slug !== 'bridge-b9-declare-seat-end') r.deMiss++; }
    if (seam && seam.slug === 'bridge-b9-declare-seat-end' && cs[i].fire !== 'manual') r.chain++;
    if (seam && CLAP.test(seam.text) && CLAP.test(cs[i].text)) r.dbl++;
  }
  return r;
}

if (SELF) {
  const r = sweep(load(true));
  const caught = r.spMiss > 0 && r.deMiss > 0;
  console.log(`${caught ? 'ok  ' : 'FAIL'} 깨 보기 — 이음새를 끄면 ① · ② 가 빨강(축사 ${r.spMiss}/${r.sp} · 선언 ${r.deMiss}/${r.de})`);
  process.exit(caught ? 0 : 1);
}

const E = load(false), r = sweep(E);
ok(`엔진 ${r.n}판(순간 ${r.P}개 조합) · ① 축사가 마지막 ${r.sp}판 모두 B10`, r.sp > 0 && r.spMiss === 0, `${r.spMiss}판 빠짐`);
ok(`엔진 · ② 선언이 마지막 ${r.de}판 모두 B9`, r.de > 0 && r.deMiss === 0, `${r.deMiss}판 빠짐`);
ok('엔진 · ③ B9 뒤 닫는 인사는 디렉터 GO', r.chain === 0, `${r.chain}판 사슬`);
ok('엔진 · ④ B10 과 닫는 멘트가 둘 다 박수를 청하는 판 0(seamFit)', r.dbl === 0, `${r.dbl}판`);
{ const S = E.O.applyExample({ course: 'open' }, 'standard'); delete S.on.song; delete S.on.tribute; const T = JSON.parse(JSON.stringify(S)); delete T.course;
  let cs = []; try { cs = E.C.build(T, { mode: 'console' }).cues; } catch (e) {}
  ok('엔진 · ⑤ 옛 코스는 닫는 인사 앞 이음말이 없다', !cs.some((c) => /^bridge-/.test(c.slug)), cs.filter((c) => /^bridge-/.test(c.slug)).map((c) => c.slug).join(','));
  ok('엔진 · 분위기 날도 같은 판정(moodFit 이 닫는 멘트를 박수 없는 예시로)', (() => { const M = JSON.parse(JSON.stringify(S)); E.O.moodApply(M, 'formal'); E.C.moodFit(M); const t = E.C.EXTRA[E.O.narExCue(M, 'narr-close-bow')] || ''; return t && !CLAP.test(t); })()); }

let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
let br = null; if (pw && !FAST) { try { br = await pw.chromium.launch(); } catch (e) {} }
if (!br || FAST) console.log(FAST ? 'skip 화면 — --fast(가드)' : 'skip 화면 — 브라우저 없음(엔진 검사만 돌았다)');
else {
  const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };
  const srv = http.createServer((q, s) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { s.writeHead(404); s.end(); return; } s.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); s.end(b); }); });
  await new Promise((x) => srv.listen(0, '127.0.0.1', x)); const port = srv.address().port;
  for (const W of [390, 1280]) {
    const ctx = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: W < 1000 }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`); await pg.waitForTimeout(700);
    const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(500); };
    await nx(); await nx(); await pg.click('[data-fk="opx:standard"]'); await pg.waitForTimeout(500);
    await pg.waitForFunction(() => typeof ENG !== 'undefined' && ENG && ENG.RitualCue && ENG.RitualCue.seamFit, null, { timeout: 8000 }).catch(() => {});
    const a = await pg.evaluate(async () => { const w = (t) => new Promise((x) => setTimeout(x, t)); const o = {};
      delete S.on.song; delete S.on.tribute; _persist(); render(); await w(200); o.cut = (S.narEx || {}).close || 0; o.auto = JSON.stringify(S.closeAuto || null);
      S.on.tribute = 1; _persist(); render(); await w(200); o.back = (S.narEx || {}).close || 0; o.auto2 = S.closeAuto ? 1 : 0;
      delete S.on.tribute; _persist(); render(); await w(200); o.cut2 = (S.narEx || {}).close || 0;
      mkNarEx('close', 0); await w(200); o.hand = (S.narEx || {}).close || 0; o.handK = S.closeHand || 0; _persist(); o.hand2 = (S.narEx || {}).close || 0;
      return o; });
    ok(`${W} 정석 − 축가 · 인사 → 닫는 멘트 예시 3(n=2) · 되살리면 예시 1 · 다시 빼면 예시 3`, a.cut === 2 && a.back === 0 && a.auto2 === 0 && a.cut2 === 2, JSON.stringify(a));
    ok(`${W} 두 분이 닫는 멘트 칩(예시 1)을 누르면 그대로`, a.handK === 1 && a.hand === 0 && a.hand2 === 0, JSON.stringify(a));
    ok(`${W} 화면 오류 없음`, !errs.length, errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
  await br.close(); srv.close();
}
console.log(fail ? `CLOSE SEAM FAIL ${fail}` : 'CLOSE SEAM OK');
process.exit(fail ? 1 : 0);
