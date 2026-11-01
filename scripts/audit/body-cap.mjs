// ★★[BODY_CAP_1030 · END_FLOW_1030 검토 167 2026-10-30 사장님] 본식 상한 · 예식 뒷부분 흐름 — 엔진 값과 실제 빌더 동작을 잰다
// ★★[EVENT_COUNT_CAP 검토 183 2026-11-01 사장님 «이벤트 최대 몇 개까지 · 그 안에서는 자유롭게» → «추천대로 진행»] 상한은 «분 계산» 대신 «개수 규칙»
//   ① 고르는 본식 순간 6개까지 ② 그중 긴 순간 3개까지(테이블 인사 = 2) ③ 그 안은 자유 — 본식 상한(capSec = 단체 사진 16분만 남긴 몫)을 넘는 드문 조합은
//   엔진이 테이블 인사를 넘는 만큼만 줄인다(+ 한 줄 알림) · 길이 칩을 늘리는 쪽은 줄이기 전 값으로 재서 «무엇을 할지» 창으로 막는다
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
const O = require(path.join(ROOT, 'assets/ritual-open.js')), C = require(path.join(ROOT, 'assets/ritual-cue.js')), D = require(path.join(ROOT, 'assets/ritual-data.js'));
const exS = (k, add) => { const S = O.applyExample({ course: 'open' }, k); S.course = 'open'; return Object.assign(S, add || {}); };
{ /* ── 규칙 값 */
  ok('[EVENT_COUNT_CAP] 셈 대상 12순간 · 긴 순간 다섯 + 테이블 인사 2 · 6개 · 긴 3개', JSON.stringify(O.CNT_PICK) === JSON.stringify(['candle', 'welcome', 'vow', 'ring', 'declare', 'bless', 'free', 'song', 'letter', 'tribute', 'toast', 'table'])
    && JSON.stringify(O.CNT_LONG) === JSON.stringify({ bless: 1, free: 1, song: 1, letter: 1, tribute: 1, table: 2 }) && O.CNT_MAX === 6 && O.CNT_LONG_MAX === 3);
  ok('[EVENT_COUNT_CAP] 본식 상한 = (40 − 단체 사진 최소 ' + O.SHORT_MIN + ')분 − 닫는 인사 뒤 몫(예시 최장 조건 없음)', O.capSec({ digital: false, meal: false, guide: false }) === (O.DAYMIN - O.SHORT_MIN) * 60 && O.capSec({ digital: true }) === (O.DAYMIN - O.SHORT_MIN) * 60 - O.postSec({ digital: true }));
  /* ── 예시 넷 */
  const ex = O.EXAMPLES.map((e) => { const S = exS(e.k), c = O.countOf(S); return { k: e.k, n: c.n, l: c.long, hi: O.bodySec(S)[1], cap: O.capSec(S), cut: O.tableCut(S) }; });
  ok('예시 넷 모두 규칙 안 · 상한 안 · 테이블 인사 그대로(' + ex.map((x) => x.k + ' ' + x.n + '/' + x.l).join(' · ') + ')', ex.every((x) => x.n <= 6 && x.l <= 3 && x.hi <= x.cap && !x.cut), JSON.stringify(ex));
  /* ── 규칙 안 전 조합(정석 예시의 설정 · 12순간 담기/빼기) — 테이블 인사를 줄인 뒤 ≤ 상한 */
  const base = exS('standard'); let n = 0, cut = 0, over = 0, maxRaw = 0, maxFit = 0, badCut = 0;
  for (let m = 0; m < (1 << O.CNT_PICK.length); m++) { const t = JSON.parse(JSON.stringify(base)); t.on = { prevideo: 1 };
    O.CNT_PICK.forEach((k, i) => { if (m & (1 << i)) t.on[k] = 1; });
    const c = O.countOf(t); if (c.n > 6 || c.long > 3) continue; n++;
    const raw = O.bodyRaw(t)[1], fit = O.bodySec(t)[1], cap = O.capSec(t); maxRaw = Math.max(maxRaw, raw); maxFit = Math.max(maxFit, fit);
    if (raw > cap + 0.5) { cut++; if (!O.onOf(t, 'table') || !O.tableCut(t)) badCut++; } else if (O.tableCut(t)) badCut++;
    if (fit > cap + 0.5) over++; }
  ok(`규칙 안 전 조합 ${n}개 — 넘는 ${cut}개는 테이블 인사만 줄여 맞춤 · 줄인 뒤 넘는 조합 ${over} · 최장 ${(maxRaw / 60).toFixed(1)} → ${(maxFit / 60).toFixed(1)}분`, n > 1000 && over === 0 && badCut === 0 && maxFit <= O.capSec(base), JSON.stringify({ n, cut, over, badCut }));
  /* ── 콘솔도 같은 테이블 인사 시간 */
  { const t = JSON.parse(JSON.stringify(base)); t.on = { prevideo: 1, candle: 1, welcome: 1, vow: 1, ring: 1, free: 1, table: 1 };
    const r = C.build(C.norm(t)), cs = Array.isArray(r) ? r : r.cues, tb = cs.find((x) => x.live && /테이블을 돌며/.test(x.live.t || ''));
    ok('콘솔 테이블 인사 시간 = 엔진(줄인 값 ' + Math.round(O.tableSecOf(t)) + '초) · 메모에 «약 n분 안에»', O.tableCut(t) > 0 && !!tb && tb.live.est === O.tableSecOf(t) && /약 \d+분 안에/.test(tb.note || ''), tb && JSON.stringify({ est: tb.live.est, note: tb.note })); }
  /* ── 늘리는 쪽만 막는다 */
  const six = exS('standard'), plus = JSON.parse(JSON.stringify(six)); plus.on.ring = 1; const lng = JSON.parse(JSON.stringify(exS('brief'))); lng.on.bless = 1; lng.on.song = 1; lng.on.letter = 1;
  ok('7번째 → «n» · 긴 순간 넷째 → «long» · 같은 판 · 빼기는 통과', O.countNo(six, plus) === 'n' && O.countNo(exS('brief'), lng) === 'long' && O.countNo(six, six) === '' && O.countNo(plus, six) === '');
  ok('막힘 창 글 — «본식 순간은 6개까지예요» · «긴 순간은 3개까지예요»(테이블 인사 = 2)', O.COUNT_MSG.n.title === '본식 순간은 6개까지예요' && /하나 빼고 골라 주세요/.test(O.COUNT_MSG.n.body) && O.COUNT_MSG.long.title === '긴 순간은 3개까지예요' && /테이블 인사는 2개로/.test(O.COUNT_MSG.long.body));
  /* ★[CLOSING_LINE_1031 검토 178] 마무리 멘트가 26 보다 긴 몫(POST_SEC 다섯 판) = 엔진 글 길이 셈과 같다 · postSec 도 같은 판을 고른다 */
  const est = (o) => { const S = exS('standard', o); const r = C.build(C.norm(S)); const cs = Array.isArray(r) ? r : r.cues; const c = cs.find((x) => /^narr-closing/.test(x.slug || '')); return c ? Math.max(0, Math.round(c.est * (1 - String(D.NARR.close).length / String(c.text).length))) : 0; };   // [CLOSING_NO_CREW_1031] 마무리 멘트가 없는 판(294 쉼) = 늘어난 몫 0
  const CL = [['meal', { meal: true, mealFull: true, resv: true, guide: true }], ['soft', { meal: true, guide: false }], ['softGuide', { meal: true, guide: true, mealFull: false }], ['none', { meal: false, guide: false }], ['noneGuide', { meal: false, guide: true }]];
  CL.slice().forEach(([k, o]) => CL.push([k + 'Nt', Object.assign({ narEx: { close: 2 } }, o)]));   // ★[CLOSING_SRC_1031] 닫는 멘트 186(·187)을 고른 날
  ok('마무리 멘트 늘어난 몫 = 엔진 셈(' + CL.map(([k, o]) => k + ' ' + est(o)).join(' · ') + '초) · postSec 같은 판', CL.every(([k, o]) => est(o) === O.POST_SEC[k] && O.postSec(Object.assign({ digital: false, mealFull: false, resv: false }, o)) === O.POST_SEC[k]));
  const sp = O.span(exS('standard', { digital: true })), sp0 = O.span(exS('standard'));
  ok('40분 셈에 온라인 인사 2분 — 디지털 참석 날 단체 사진이 2분 준다(본식 + 테이블 인사 + 닫는 인사 뒤 몫 + 단체 사진 = 40)', sp.pm === 2 && sp0.pm === 0 && sp.pa === sp0.pa - 2 && sp.tb + sp.pm + sp.pa === O.DAYMIN);
  ok('테이블 인사 9분(6테이블 기준) = TABLE_SEC × 6 · 카드 글이 같은 숫자', O.TABLE_SEC * 6 === 540 && O.tableFull({}) === 540 && /테이블 인사 약 9분\(6테이블 기준\) · 그만큼 사진 시간이 줄어요/.test(O.CARDS.table.one));
  ok('차례 — 테이블 인사 → 축배 → 닫는 인사(bodyOrder 끝)', O.bodyOrder().slice(-3).join(',') === 'table,toast,_close');
}
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  for (const W of [390, 1280]) {
    const pg = await br.newPage({ viewport: { width: W, height: 900 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(900);
    const r = await pg.evaluate(async () => { const R = RitualOpen, out = {}, w = (ms) => new Promise((x) => setTimeout(x, ms));
      const ask = () => { const d = document.querySelector('.ord-ask'); const t = d ? d.textContent : ''; const y = document.querySelector('.ord-ask button'); if (y) y.click(); return t; };
      const add = (k) => { document.querySelectorAll('.ord-ask').forEach((e) => e.remove()); const b = JSON.stringify(S.on); opTgl(k); const t = ask(); return { k, added: JSON.stringify(S.on) !== b, t }; };
      const set = (ks) => { R.applyExample(S, 'brief'); S.on = { prevideo: 1 }; ks.forEach((k) => { S.on[k] = 1; }); opSync(); };
      try { opGoStep('pick'); } catch (e) {} await w(300);
      /* 6개(긴 3) 다음 7번째 */
      R.applyExample(S, 'standard'); opSync(); out.seven = add('ring');
      /* 긴 순간 넷째 — 짧은 순간 둘 + 긴 셋 → 긴 하나 더 */
      set(['candle', 'vow', 'bless', 'song', 'letter']); out.long4 = add('tribute');
      /* 테이블 인사 = 긴 2 — 긴 둘 + 테이블 */
      set(['candle', 'bless', 'song']); out.tbl = add('table');
      /* 규칙 안 · 넘는 조합 → 테이블 인사 자동 맞춤 + 한 줄 알림 */
      set(['candle', 'welcome', 'vow', 'ring', 'table']); document.querySelectorAll('.note-toast,#noteToast').forEach((e) => e.remove()); out.fit = add('bless'); await w(400);
      out.fitCut = R.tableCut(S); out.toast = [...document.querySelectorAll('body *')].filter((e) => e.children.length === 0 && /테이블 인사를 약 \d+분으로 맞췄어요/.test(e.textContent)).map((e) => e.textContent)[0] || '';
      /* 규칙 안 · 짧은 순간 담기는 된다 */
      set(['candle', 'vow']); out.free = add('ring');
      /* 길이 칩 — 축사 길게(테이블 인사로 메우지 않는다) · 할 일을 말한다 */
      set(['candle', 'welcome', 'vow', 'bless', 'free', 'song']); S.freeLen = '3'; S.blessN = '2'; opSync(); document.querySelectorAll('.ord-ask').forEach((e) => e.remove());
      lsFreeLen(10); out.len = { v: S.freeLen, t: ask() };
      /* 카운터 — ① · ③ */
      R.applyExample(S, 'standard'); opSync(); try { opGoStep('pick'); } catch (e) {} await w(300);
      out.cntPk = (document.querySelector('[data-fk="pkcnt:pk"]') || {}).textContent || '';
      try { opGoStep('listen'); mkGo('_sum'); } catch (e) {} await w(400);
      out.cntSum = (document.querySelector('[data-fk="pkcnt:sum"]') || {}).textContent || '';
      R.applyExample(S, 'family'); S.on.ring = 1; S.on.free = 1; opSync(); try { opGoStep('pick'); } catch (e) {} render(); await w(200);
      out.over = [...document.querySelectorAll('.pk-left')].filter((e) => getComputedStyle(e).display !== 'none').map((e) => e.textContent);
      return out; });
    ok(W + ' 7번째 담기 → 막힘 «본식 순간은 6개까지예요»', !r.seven.added && /본식 순간은 6개까지예요/.test(r.seven.t) && !/덜어 주세요/.test(r.seven.t), JSON.stringify(r.seven));
    ok(W + ' 긴 순간 넷째 → 막힘 «긴 순간은 3개까지예요»', !r.long4.added && /긴 순간은 3개까지예요/.test(r.long4.t), JSON.stringify(r.long4));
    ok(W + ' 긴 둘 + 테이블 인사(= 2) → 막힘 «긴 순간은 3개까지예요 … 테이블 인사는 2개로»', !r.tbl.added && /긴 순간은 3개까지예요/.test(r.tbl.t) && /테이블 인사는 2개로/.test(r.tbl.t), JSON.stringify(r.tbl));
    ok(W + ' 규칙 안인데 넘는 조합 → 담김 · 테이블 인사 자동 맞춤 · 한 줄 «테이블 인사를 약 n분으로 맞췄어요»', r.fit.added && !r.fit.t && r.fitCut > 0 && !!r.toast, JSON.stringify({ fit: r.fit, cut: r.fitCut, toast: r.toast }));
    ok(W + ' 규칙 안 짧은 순간 담기는 된다(창 없음)', r.free.added && !r.free.t, JSON.stringify(r.free));
    ok(W + ' 길이 칩(축사 10분)이 넘으면 막고 할 일을 말한다 «이 길이로 하려면 다른 순간을 하나 빼거나 부모님 덕담을 짧게 해 주세요»', r.len.v === '3' && /이 길이로 하려면 다른 순간을 하나 빼거나 부모님 덕담을 짧게 해 주세요/.test(r.len.t) && !/분 덜어/.test(r.len.t), JSON.stringify(r.len));
    ok(W + ' 카운터 «본식 순간 6/6 · 긴 순간 3/3»(① · ③ · 분 숫자 없음)', r.cntPk === '본식 순간 6/6 · 긴 순간 3/3' && r.cntSum === r.cntPk, JSON.stringify([r.cntPk, r.cntSum]));
    ok(W + ' 이미 넘은 옛 초안은 알림만(«본식이 약 n분 길어요 · 순간을 하나 빼 주세요»)', r.over.length <= 1 && r.over.every((x) => /^본식이 약.\d+분 길어요 · 순간을 하나 빼 주세요$/.test(x)), JSON.stringify(r.over));
    ok(W + ' pageerror 0', !errs.length, errs.slice(0, 2).join(' | '));
    await pg.close();
  }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nBODY CAP FAIL ${fail}` : '\nBODY CAP OK'); process.exit(fail ? 1 : 0);
