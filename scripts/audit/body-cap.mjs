// ★★[BODY_CAP_1030 · END_FLOW_1030 검토 167 2026-10-30 사장님] 본식 상한 · 예식 뒷부분 흐름 — 엔진 값과 실제 빌더 동작을 잰다
//   상한 = 예시 넷 «천천히»(hi · 테이블 인사 포함) 가운데 가장 긴 값(손으로 적지 않는다) · 단체 사진 SHORT_MIN 아래로 자른다 · 늘리는 쪽만 막는다
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
{ const his = O.EXAMPLES.map((e) => O.bodySec(exS(e.k))[1]), mx = Math.max(...his);
  ok('상한 = 예시 넷 «천천히» 가운데 가장 긴 값(' + his.map((x) => Math.round(x)).join(' · ') + ' → ' + Math.round(mx) + '초)', O.capEx() === mx && O.capSec({}) === mx);
  ok('예시 넷 모두 상한 안(디지털 참석이 없는 날) · 단체 사진 SHORT_MIN ' + O.SHORT_MIN + '분이 남는다', O.EXAMPLES.every((e) => { const S = exS(e.k); return O.bodySec(S)[1] <= O.capSec(S) && O.DAYMIN * 60 - O.bodySec(S)[1] - O.postSec(S) >= O.SHORT_MIN * 60; }));
  ok('디지털 참석 날 상한 = (40 − SHORT_MIN)분 − 온라인 인사 − 사진 전 안내 늘어난 몫', O.capSec({ digital: true }) === Math.min(mx, (O.DAYMIN - O.SHORT_MIN) * 60 - O.postSec({ digital: true })) && O.capSec({ digital: true }) < mx);
  ok('늘리는 쪽만 막는다 — 같은 판 · 줄이는 판은 막지 않는다', !O.capOver(exS('family'), exS('family')) && !O.capOver(exS('family'), exS('brief')) && O.capOver(exS('brief'), Object.assign(exS('family'), { on: Object.assign({}, exS('family').on, { ring: 1, free: 1, letter: 1 }) })));
  /* 사진 전 안내가 26 보다 긴 몫(POST_SEC.pre · preNoMeal) = 엔진 글 길이 셈과 같다 */
  const est = (meal, guide) => { const S = exS('standard', { meal, guide }); const r = C.build(C.norm(S)); const cs = Array.isArray(r) ? r : r.cues; const c = cs.find((x) => /^narr-photo-pre|^narr-close$/.test(x.slug || '')); return c ? Math.round(c.est * (1 - String(D.NARR.close).length / String(c.text).length)) : -1; };
  ok('사진 전 안내 늘어난 몫 = 엔진 셈(식사 있음 ' + est(true, true) + ' · 식사 없음 ' + est(false, false) + ' · 식사만 ' + est(true, false) + '초)', est(true, true) === O.POST_SEC.pre && est(false, false) === O.POST_SEC.preNoMeal && est(true, false) === 0);
  const sp = O.span(exS('standard', { digital: true })), sp0 = O.span(exS('standard'));
  ok('40분 셈에 온라인 인사 2분 — 디지털 참석 날 단체 사진이 2분 준다(본식 + 테이블 인사 + 닫는 인사 뒤 몫 + 단체 사진 = 40)', sp.pm === 2 && sp0.pm === 0 && sp.pa === sp0.pa - 2 && sp.tb + sp.pm + sp.pa === O.DAYMIN);
  ok('테이블 인사 9분(6테이블 기준) = TABLE_SEC × 6 · 카드 글이 같은 숫자', O.TABLE_SEC * 6 === 540 && /테이블 인사 약 9분\(6테이블 기준\) · 그만큼 사진 시간이 줄어요/.test(O.CARDS.table.one));
  ok('차례 — 테이블 인사 → 축배 → 닫는 인사(bodyOrder 끝)', O.bodyOrder().slice(-3).join(',') === 'table,toast,_close');
}
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  for (const W of [390, 1280]) {
    const pg = await br.newPage({ viewport: { width: W, height: 900 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(900);
    const r = await pg.evaluate(async () => { const R = RitualOpen, out = {};
      const add = (k) => { document.querySelectorAll('.ord-ask').forEach((e) => e.remove()); const b = JSON.stringify(S.on); opTgl(k); const d = document.querySelector('.ord-ask'); const t = d ? d.textContent : ''; const y = document.querySelector('.ord-ask button'); if (y) y.click(); return { k, added: JSON.stringify(S.on) !== b, t }; };
      var _lk = R.EXAMPLES.map(function (e) { var t = R.applyExample(JSON.parse(JSON.stringify(S)), e.k); return [e.k, R.bodySec(t)[1]]; }).sort(function (a, b) { return b[1] - a[1]; })[0][0]; out.lk = _lk;   /* [COURSE_ONE_PROMISE_1030] 가장 긴 예시는 잰다(코스 표가 바뀌면 바뀐다) */
      R.applyExample(S, _lk); opSync(); out.fam = R.PICKABLE.filter((k) => !R.onOf(S, k) && !(R.RETIRED || {})[k]).map(add);
      R.applyExample(S, 'brief'); opSync(); out.br = add('ring');
      R.applyExample(S, _lk); opSync(); out.len = (() => { const b = S.freeLen; if (!R.onOf(S, 'free')) { delete S.on.letter; delete S.on.song; S.on.free = 1; S.freeLen = '1'; opSync(); } const h0 = R.bodySec(S)[1]; document.querySelectorAll('.ord-ask').forEach((e) => e.remove()); lsFreeLen(10); const d = document.querySelector('.ord-ask'); const y = document.querySelector('.ord-ask button'); if (y) y.click(); return { blocked: !!d, freeLen: S.freeLen, ok: R.bodySec(S)[1] <= Math.max(h0, R.capSec(S)) + 0.5 }; })();
      R.applyExample(S, _lk); opSync();   /* 꽉 찬 예시(남은 시간 0)로 줄을 잰다 */
      try { opGoStep('pick'); } catch (e) {} await new Promise((x) => setTimeout(x, 300));
      out.line = [...document.querySelectorAll('.pk-left')].filter((e) => getComputedStyle(e).display !== 'none').map((e) => e.textContent);
      R.applyExample(S, 'family'); S.on.ring = 1; S.on.free = 1; opSync(); render(); await new Promise((x) => setTimeout(x, 200));
      out.over = [...document.querySelectorAll('.pk-left')].filter((e) => getComputedStyle(e).display !== 'none').map((e) => e.textContent);
      return out; });
    const msg = '이 순간을 담으려면 다른 순간을 하나 빼 주세요사진 시간을 지키기 위해서예요.';
    ok(W + ' 가장 긴 예시(' + r.lk + ')에서 담기 ' + r.fam.length + '개 — 모두 막히고 창 «이 순간을 담으려면 … 사진 시간을 지키기 위해서예요.»', r.fam.length > 0 && r.fam.every((x) => !x.added && x.t.indexOf(msg) === 0), JSON.stringify(r.fam.filter((x) => x.added || x.t.indexOf(msg) !== 0)));
    ok(W + ' 간결 예시에서는 담기가 된다', r.br.added && !r.br.t, JSON.stringify(r.br));
    ok(W + ' 길이 칩(축사 길이)도 상한 밖으로 못 늘린다', r.len.ok, JSON.stringify(r.len));
    ok(W + ' 담는 쪽 한 줄 «남은 본식 시간 약 n분»이 하나 보인다', r.line.length === 1 && /^남은 본식 시간 약.\d+분$|^본식 시간이 다 찼어요$/.test(r.line[0]), JSON.stringify(r.line));
    ok(W + ' 이미 넘은 옛 초안은 알림만(«본식이 약 n분 길어요 · 순간을 하나 빼 주세요»)', r.over.length === 1 && /^본식이 약.\d+분 길어요 · 순간을 하나 빼 주세요$/.test(r.over[0]), JSON.stringify(r.over));
    ok(W + ' pageerror 0', !errs.length, errs.slice(0, 2).join(' | '));
    await pg.close();
  }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nBODY CAP FAIL ${fail}` : '\nBODY CAP OK'); process.exit(fail ? 1 : 0);
