#!/usr/bin/env node
/* ★[B2_FIX_R2 2026-11-06 재검증 재수정 2묶음] 나38 · 나41 · 나51 · 글30 · 나03 · 나50 · NI17 · 나02 · 나20 — 화면 함수를 브라우저에서 직접 불러 잰다(390 · 360)
   종료 코드 0 통과 · 1 실패 · 2 재지 못함(브라우저 없음) · --selftest 는 옛 동작을 흉내 낸 값이 빨강으로 읽히는지 본다 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;

let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 300)}`); if (!c) fail++; };
const want38 = ['신랑1', '신부1', '신부2', '신랑3', '신부3'];
if (process.argv.includes('--selftest')) { srv.close(); const bad = ['신랑1', '신부1', '신랑3', '신부2', '신부3'].join() === want38.join(); console.log(bad ? 'FAIL selftest' : 'ok   selftest 옛 차례(신랑3 이 신부2 앞) = 빨강'); process.exit(bad ? 1 : 0); }
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('못 쟀다 — 브라우저 없음'); srv.close(); process.exit(2); }
const OP = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8'), CO = fs.readFileSync(path.join(ROOT, 'console.html'), 'utf8'), MP = fs.readFileSync(path.join(ROOT, 'mypage.html'), 'utf8');
for (const W of [360, 375, 390]) {
  const ctx = await br.newContext({ viewport: { width: W, height: 900 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`); await pg.waitForTimeout(700);
  for (let j = 0; j < 2; j++) { if (await pg.isVisible('#next')) await pg.click('#next'); else if (await pg.isVisible('.pk-go')) await pg.click('.pk-go'); await pg.waitForTimeout(400); }
  const geo = await pg.evaluate(() => { document.body.style.opacity = 1; document.querySelectorAll('.reveal,section').forEach((e) => { e.style.opacity = 1; e.style.contentVisibility = 'visible'; });
    return [...document.querySelectorAll('.pk-ex')].map((c) => { const m = c.querySelector('.pk-ex-m'), g = c.querySelector('.pk-ex-gw'); if (!m || !g) return null; const a = m.getBoundingClientRect(), b = g.getBoundingClientRect(); return { t: m.textContent, over: a.right > b.left + 0.5 && a.bottom > b.top && a.top < b.bottom }; }).filter(Boolean); });
  ok(`${W} [B2_FIX_NA_50] 기록 카드 시간 줄이 곡선 칸과 안 겹친다`, geo.length >= 3 && geo.every((x) => !x.over), geo.filter((x) => x.over));
  if (W !== 390) { await ctx.close(); continue; }
  const r = await pg.evaluate(() => { const R = RitualOpen, o = {};
    S.on = { vow: 1, bless: 1, toast: 1 }; S.vowHow = 'alt'; S.vowFirst = 'g'; S.tx = S.tx || {}; S.txLn = S.txLn || {};
    S.tx['vow.g'] = '신랑1\n\n신랑3'; S.txLn['vow.g'] = 1; S.tx['vow.b'] = '신부1\n신부2\n신부3'; S.txLn['vow.b'] = 1;
    try { buildSteps(); } catch (e) {}
    const pr = () => _lRefExpand(_lSteps(ENG, _lRows())).filter((x) => x.k === 'vow' && x.wk).map((x) => x.txt);
    o.v38 = pr(); S.tx['vow.g'] = '\n\n신랑3'; try { buildSteps(); } catch (e) {} o.v38b = pr(); S.tx['vow.g'] = '신랑1\n\n신랑3'; try { buildSteps(); } catch (e) {} o.sigAlt = _prAtSig('vow'); S.vowHow = 'each'; o.sigEach = _prAtSig('vow'); S.vowHow = 'alt';
    o.p41 = _sentPieces('당신은 "괜찮아."라고 말했죠. 고마워요.');
    S.tx['toast.g'] = ''; S.tx['toast.b'] = ''; o.t0 = _lSum('toast'); o.o0 = R.talkOf('toast', S);
    S.tx['toast.b'] = '고맙습니다.'; o.t1 = _lSum('toast'); o.o1 = R.talkOf('toast', S); S.tx['toast.g'] = '감사합니다.'; o.o2 = R.talkOf('toast', S);
    const fs2 = _flowSec('bless'); o.g30 = [_fgMin('bless'), '당일 ' + R.secTxt(Math.round((fs2.lo + fs2.hi) / 2))];
    return o; });
  ok('[B2_FIX_NA_38] 번갈아 서약 연습 = 편지 화면 · 대본 차례에서 빈 차례만 뺀 것', r.v38.join() === want38.join(), r.v38);
  ok('[B2_FIX_NA_38_ONE] 빈 줄 뒤 한 줄(«\\n\\n신랑3»)도 제 자리 — 신부1 · 신부2 · 신랑3 · 신부3', r.v38b.join() === '신부1,신부2,신랑3,신부3', r.v38b);
  ok('[B2_FIX_NA_03] 읽는 방식(번갈아 ↔ 각자)을 바꾸면 이어서 연습 지문이 바뀐다', !!r.sigAlt && r.sigAlt !== r.sigEach && /^v2:/.test(r.sigAlt), [r.sigAlt, r.sigEach]);
  ok('[B2_FIX_NA_41] 문장 가운데 인용(«"괜찮아."라고 …»)은 한 카드', r.p41.length === 2 && r.p41[0] === '당신은 "괜찮아."라고 말했죠.', r.p41);
  ok('[B2_FIX_NA_51] 축배 한마디 — 아무도 안 적으면 «한마디» 없음 · 신부만이면 «신부 한마디 뒤» · 둘이면 «한마디와 함께»', !/한마디/.test(r.t0) && !/한마디/.test(r.o0) && /^신부 한마디 뒤 두 분이/.test(r.o1) && /신부 한마디 뒤/.test(r.t1) && /^두 분이 한마디와 함께/.test(r.o2), [r.t0, r.t1, r.o1, r.o2]);
  ok('[B2_FIX_GEUL_30] ③ 오늘 흐름 시간 = ② 순간 머리와 같은 자', r.g30[0] === r.g30[1], r.g30);
  ok(`390 페이지 오류 없음`, errs.length === 0, errs.slice(0, 2));
  await ctx.close();
}
ok('[B2_FIX_NA_02] 손 대기 중 시각 큐 단추 글 = 직접 눌러 주세요', CO.includes("' · 손 대기 중이에요. 직접 눌러 주세요.'") && CO.includes("' · 예정 시각이 지났어요. 필요하면 직접 눌러 주세요.'") && CO.indexOf('MAN_HOLD = true;   // ★[B2_FIX_NA_02_ORDER') > -1 && CO.indexOf('MAN_HOLD = true;   // ★[B2_FIX_NA_02_ORDER') < CO.indexOf("toast(ESD.paused") && CO.indexOf("typeof MAN_HOLD !== 'undefined' && MAN_HOLD) {") < CO.indexOf("'에 저절로 나갑니다</small>'"));
ok('[B2_FIX_NA_20] 미리듣기 끝 화면 = 장면 카드 · 직접 맡습니다(«목소리로 바뀝니다» 없음)', CO.includes('장면 카드로 보신 말하기 차례는 두 분과 가까운 분들이 직접 맡습니다.') && !CO.includes('가까운 분들의 목소리로 바뀝니다'));
ok('[B2_FIX_NI17] 예약 시각 도움말 «예약을 마친 시각만 적어 주세요.» · «미정이면 비워 두셔도 괜찮아요»', MP.includes('예약을 마친 시각만 적어 주세요.') && MP.includes('미정이면 비워&nbsp;두셔도 괜찮아요'));
await br.close(); srv.close();
console.log(fail ? `✗ b2-fix-r2 ${fail}건` : 'ok b2-fix-r2 — 나38 · 나41 · 나51 · 글30 · 나03 · 나50 · NI17 · 나02 · 나20');
process.exit(fail ? 1 : 0);
