#!/usr/bin/env node
/* ★★[CLOSING_SRC_1031 검토 179 사장님 21:10 «고객이 식순 화면에서 못 본 멘트는 현장에서도 안 나온다»]
   같은 식순 상태에서 «당일 콘솔이 틀 수 있는 나레이션 파일» ⊆ «식순 화면(하나씩 만들기 · 전체 대본)에 보이는 나레이션 줄의 파일»
   - 콘솔 = 엔진 당일 빌드(mode console)의 큐 파일 + 길어지면 바뀌는 말(c.alt · 25 덕담 긴 판) — 콘솔 resolve() 가 바꾸는 것은 이 둘뿐(재생 안 됨 단추는 소리를 틀지 않는다 · AUTO_ONLY_1031)
   - 화면 = order-preview _lSteps(모든 순간 · 닫는 인사) 줄의 file + 그 줄의 alt.file(«3분이 넘으면 이 말로 바뀌어요») · 전체 대본(scriptTextOpen)에 그 글이 있다
   - 상태 = ① 닫는 인사 쪽: 식사 셋 × 하객 안내 × 디지털 × 닫는 멘트 칩 전부  ② 순간마다 칩 조합 전부(stage-lines 와 같은 길 · _lSet)
   - 두 분 목소리 자리(하객 맞이 · 입장 · 영상 앞 소개)는 나레이션 판으로 잰다 — 두 분 판의 대신 나레이션은 같은 자리 · 같은 큐다
   «식순 밖 재생 0»(검토 177 · clip-status ⑦)과 짝 — 넘치는 파일이 하나라도 있으면 빨강
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + JSON.stringify(d).slice(0, 900)}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
try {
  const pg = await br.newPage({ viewport: { width: 1280, height: 900 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await pg.waitForTimeout(800);
  const res = await pg.evaluate(() => {
    courseStarted = true; const R = RitualOpen; R.ORDER.forEach((k) => { S.on[k] = 1; }); S.guestVoice = 'nar'; S.entryVoice = 'nar'; S.pvVoice = 'nar'; buildSteps();
    const BASE = JSON.stringify(S), out = { n: 0, over: [], noAlt: [], noScript: [], alts: 0, files: {} };
    function check(tag) {
      let cs = []; try { cs = ENG.RitualCue.build(S, { mode: 'console' }).cues || []; } catch (e) { out.over.push(tag + ' 엔진 빌드 오류 ' + e.message); return; }
      const scr = {}; let rows = []; try { rows = _lSteps(ENG, _lRows()); } catch (e) { out.over.push(tag + ' 화면 줄 오류 ' + e.message); return; }
      rows.forEach((x) => { if (x.file) scr[x.file] = 1; if (x.alt && x.alt.file) { scr[x.alt.file] = 1; } });
      const txt = (() => { try { return scriptTextOpen(); } catch (e) { return ''; } })();
      cs.forEach((c) => { const fs2 = []; if (c.file && !c.act) fs2.push([c.file, c.text]); if (c.alt && c.alt.file) { fs2.push([c.alt.file, c.alt.text]); out.alts++; }
        fs2.forEach(([f, t]) => { out.files[f] = 1; if (!scr[f]) out.over.push(tag + ' «' + f + '» 콘솔은 트는데 식순 화면에 없다');
          else if (t && txt.indexOf(String(t).slice(0, 24)) < 0) out.noScript.push(tag + ' «' + f + '» 전체 대본에 글이 없다'); }); });
      rows.forEach((x) => { if (x.alt && !/분이 넘으면 이 말로 바뀌어요$/.test(x.alt.when || '')) out.noAlt.push(tag + ' ' + x.file + ' alt 표시 글'); });
      out.n++;
    }
    /* ① 닫는 인사 쪽 — 식사 셋 × 하객 안내 × 디지털 × 닫는 멘트 칩 */
    const closeN = (R.narExList ? R.narExList(S, 'close') : [[0]]).map((x) => x[0]);
    [{ meal: true, mealFull: true, resv: true }, { meal: true, mealFull: false, resv: true }, { meal: false }].forEach((m) => [false, true].forEach((guide) => [false, true].forEach((digital) => closeN.forEach((cn) => {
      S = JSON.parse(BASE); Object.assign(S, m, { guide, digital }); S.narEx = Object.assign({}, S.narEx || {}, { close: cn });
      check('닫는 인사 ' + JSON.stringify({ m, guide, digital, close: cn })); }))));
    /* ② 순간마다 칩 조합 전부 */
    R.ORDER.concat(['_close']).forEach((k) => { S = JSON.parse(BASE); let gs = []; try { gs = _lGroups(k).filter((g) => g.list && g.list.length && !g.q); } catch (e) {}
      let combos = [{}]; gs.forEach((g) => { const n = []; combos.forEach((c) => g.list.forEach((it) => { const v = Array.isArray(it) ? it[0] : (it.v || it.k || it); n.push(Object.assign({}, c, { [g.key]: v })); })); combos = n; });
      combos.forEach((c) => { S = JSON.parse(BASE); Object.keys(c).forEach((key) => { try { _lSet(key, c[key]); } catch (e) {} }); check(k + ' ' + JSON.stringify(c)); }); });
    S = JSON.parse(BASE);
    return out; });
  const uniq = (a) => [...new Set(a)];
  const CL = Object.keys(res.files).filter((f) => /_narr-closing/.test(f)).sort(), ONL = Object.keys(res.files).filter((f) => /^62_/.test(f));
  ok(`잰 상태에 마무리 멘트 열네 판(287 ~ 296 · 325 ~ 328 · ★[CLOSING_CHEER_195] 294 는 응원 한 문장 판으로 다시 쓴다)과 온라인 인사(62)가 다 들어 있다 — ${CL.length} · ${ONL.length}`, CL.length === 14 && ONL.length === 1, CL);
  ok(`콘솔이 틀 수 있는 나레이션 ⊆ 식순 화면 나레이션 줄 — 상태 ${res.n}개 · 파일 ${Object.keys(res.files).length}개`, !res.over.length, uniq(res.over).slice(0, 12));
  ok('콘솔 나레이션 글이 전체 대본에 있다(복사 · 파일 저장)', !res.noScript.length, uniq(res.noScript).slice(0, 12));
  ok(`길어지면 바뀌는 말(alt)이 화면에 «N분이 넘으면 이 말로 바뀌어요» 한 줄로 — 콘솔 alt ${res.alts}곳`, res.alts > 0 && !res.noAlt.length, uniq(res.noAlt).slice(0, 6));
  ok('쪽 오류 0', !errs.length, errs.slice(0, 3));
  /* 깨 보기 — 화면 줄에서 alt 를 걷으면 빨강이어야 한다 */
  const brk = await pg.evaluate(() => { const L0 = _lSteps; _lSteps = function (g, ks) { return L0(g, ks).map((x) => Object.assign({}, x, { alt: null })); };
    let over = 0; try { const cs = ENG.RitualCue.build(S, { mode: 'console' }).cues; const scr = {}; _lSteps(ENG, _lRows()).forEach((x) => { if (x.file) scr[x.file] = 1; if (x.alt && x.alt.file) scr[x.alt.file] = 1; });
      cs.forEach((c) => { if (c.alt && c.alt.file && !scr[c.alt.file]) over++; }); } finally { _lSteps = L0; } return over; });
  ok('깨 보기 «화면에서 alt 줄을 걷음» → 넘침이 잡힌다', brk > 0, brk);
} finally { await br.close(); srv.close(); }
if (fail) { console.log(`FAIL screen-sound — ${fail}건`); process.exit(1); }
console.log('ok screen-sound — 콘솔 나레이션 ⊆ 식순 화면 줄 · 전체 대본 · alt 한 줄 · 깨 보기 1개 맞음');
