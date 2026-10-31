// ★★[TRIB_NO_HUG_1030 검토 172 2026-10-30 사장님 «전부 진행»(추천대로)] 부모님께 인사 «인사와 포옹 / 인사만»
//   인사만(S.tribHug 'off')이면 포옹 청하는 줄 256 · 그 동작 대기 · 동작 안내를 건너뛰고 맺는 말로 — 콘솔 · 미리 듣기 · 연습 · 전체 대본 · 길이 · 카드 글이 같은 값.
//   기본(안 고름)은 지금 그대로 인사와 포옹 · 옛 코스는 그대로 · 녹음 다시 받을 문장 0
//   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const O = require(path.join(ROOT, 'assets/ritual-open.js')), C = require(path.join(ROOT, 'assets/ritual-cue.js'));
const HUG = '부모님께서는 두 사람을 따뜻하게 안아주시길 바랍니다.';
const mk = (ex, h) => { const S = O.applyExample({ course: 'open' }, ex); S.course = 'open'; if (h) S.tribHug = h; return S; };
const trib = (S, mode) => C.build(C.norm(S), { mode }).cues.filter((c) => c.k === 'tribute');
for (const ex of ['standard', 'record', 'family', 'brief']) for (const mode of ['console', 'preview']) {
  const a = trib(mk(ex), mode), b = trib(mk(ex, 'off'), mode), o = b.find((c) => c.slug === 'tribute-out');
  ok(`${ex} · ${mode} 기본 = 포옹 줄(256) 그대로 · 인사만 = 256 없이 구호 → 맺는 말(«인사가 끝나면»)`,
    a.some((c) => c.slug === 'tribute-hug') && !b.some((c) => c.slug === 'tribute-hug' || c.text === HUG || /안아 주심/.test((c.live || {}).t || '')) && !!o && o.hint === '인사가 끝나면' && /^tribute-call/.test(b[b.indexOf(o) - 1].slug || ''),
    b.map((c) => c.slug).join(' '));
}
{ const S0 = mk('standard'), S1 = mk('standard', 'off'), d = O.bodySec(S0)[1] - O.bodySec(S1)[1], hug = trib(S0, 'console').find((c) => c.slug === 'tribute-hug');
  ok('길이 — 인사만이면 넉넉 합이 포옹 큐(소리 4.2 + 사람 35초)만큼 짧다', Math.abs(d - (O.HUG_SEC.call + 35)) < 0.01 && hug.live.est === 35, `${d} · ${hug && hug.live.est}`);
  ok('길이 — 말없이 판도 같은 값으로 짧다', (() => { const a = mk('record'), b = mk('record', 'off'); return Math.abs(O.bodySec(a)[1] - O.bodySec(b)[1] - (O.HUG_SEC.call + 35)) < 0.01; })());
  ok('카드 설명 — 인사만 «… 고마움을 전해요.» · 기본 «… 안아 드려요.»', O.oneOf('tribute', S1) === '부부가 되어 처음 부모님께 고마움을 전해요.' && /안아 드려요\.$/.test(O.oneOf('tribute', S0)));
  ok('남는 장면 — 인사만이면 인사 장면(PHOTO_SCENE_1031 tribute:nohug) · 기본은 고마움을 나누는 장면', O.shotOf('tribute', S1) === O.PSCENE['tribute:nohug'].rep && O.shotOf('tribute', S0) === O.PSCENE.tribute.rep);
  const old = { course: 'family', on: { tribute: 1 }, tribHug: 'off' };
  ok('옛 코스는 그대로(hugOff 거짓)', !O.hugOff(old)); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const pg = await br.newPage({ viewport: { width: 390, height: 900 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(900);
  const r = await pg.evaluate(async (HUG) => { const R = RitualOpen, w = (ms) => new Promise((x) => setTimeout(x, ms)), out = {};
    R.applyExample(S, 'standard'); opSync(); buildSteps(); idx = STEPS.findIndex((x) => x.k === 'listen'); render(); mkGo('tribute'); await w(400);
    const g = _lGroups('tribute').find((x) => x.key === 'tribHug'); out.chip = g ? g.list.map((x) => x[1]).join('/') : ''; out.unpicked = g ? g.picked === false && /인사와 포옹/.test(g.unote || '') : false;
    out.flow0 = _lSteps(ENG, ['tribute']).map((x) => x.txt).join(' ¦ ');
    lsChip('tribHug', 'off'); await w(400);
    out.val = S.tribHug; out.flow1 = _lSteps(ENG, ['tribute']).map((x) => x.txt).join(' ¦ ');
    out.script = scriptTextOpen(); out.chipOn = !!document.querySelector('[data-k="tribHug"].on, .on[data-v="off"]') || _lGroups('tribute').find((x) => x.key === 'tribHug').picked;
    PV.k = 'tribute'; try { _pvDraw(); } catch (e) {} const q = document.querySelector('#pvQ'); out.pv = q ? q.textContent : '';
    const pq = () => _lSteps(ENG, ['tribute']).filter((x) => x.txt).map((x) => x.txt).join(' ¦ ');   /* ③ 연습 재생 줄 = 7844 go() 와 같은 원천 */
    idx = STEPS.findIndex((x) => x.k === 'practice'); render(); await w(400); out.prac1 = pq(); out.len1 = _lLen(_lSteps(ENG, _lRows()));
    delete S.tribHug; opSync(); buildSteps(); render(); await w(300); out.prac0 = pq(); out.len0 = _lLen(_lSteps(ENG, _lRows())); out.scr0 = scriptTextOpen().includes(HUG);
    return out; }, HUG);
  ok('칩 «인사와 포옹 / 인사만» · 처음엔 안 눌린 모양 + «고르지 않으시면 인사와 포옹으로 해요»', r.chip === '인사와 포옹/인사만' && r.unpicked, r.chip);
  ok('② 흐름 — 기본엔 포옹 줄 · 동작 안내가 있다', r.flow0.includes(HUG) && /부모님이 두 분을 안아 주세요/.test(r.flow0), r.flow0);
  ok('② 흐름 — 인사만이면 256 · «부모님이 두 분을 안아 주세요 …» 없음', r.val === 'off' && !r.flow1.includes(HUG) && !/안아 주세요/.test(r.flow1), r.flow1);
  ok('전체 대본 — 기본엔 256 · 인사만이면 256 없음', r.scr0 && !r.script.includes(HUG));
  ok('③ 연습 재생 줄 — 기본엔 256 · 인사만이면 256 없음', r.prac0.includes(HUG) && !r.prac1.includes(HUG), r.prac1);
  ok('④ 전체 길이(대본 합) — 인사만이면 짧다', r.len1 < r.len0, `${r.len0} → ${r.len1}`);
  ok('① 창 설명 — 인사만이면 «품에 안기는 순간» 대신', (!/안기는/.test(r.pv) && /인사하는 순간/.test(r.pv)), r.pv);
  ok('pageerror 0', !errs.length, errs.slice(0, 2).join(' | '));
  await pg.close();
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nTRIB_NO_HUG FAIL ${fail}` : '\nTRIB_NO_HUG OK'); process.exit(fail ? 1 : 0);
