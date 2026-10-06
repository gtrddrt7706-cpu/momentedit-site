// ★[STAGE_LINES 2026-10-06 사장님 «성혼 선언을 한 것인가? 의문이 들 수 있어» · «이 대사 이후에 가서 액션을 하는데 화면에는 그 액션에 대한 내용이 없으니 헷갈릴 수 있지»]
//   식순 만들기 «이렇게 흘러요» 줄 목록 — 모든 순간 × 모든 칩 조합에서
//   ①나레이션이 있는 순간(하객 맞이 제외)엔 그 사이에 하는 일 줄(말 없이 · 사람 차례 · 영상)이 적어도 하나
//   ②«…끝나면» 줄 바로 앞은 하는 일 줄(무엇이 끝나는지 화면에 있다)
//   ③줄 이름에 만드는 사람의 말(여는 말 · 맺는 말 · 이음말)이 없다
//   ④성혼 선언의 선언 줄 이름은 «성혼 선언문» · 박수는 선언 «뒤» 축하(«박수 · 부부가 돼요» 없음)
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
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const pg = await br.newPage({ viewport: { width: 1280, height: 900 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(800);
  const res = await pg.evaluate(() => { courseStarted = true; const R = RitualOpen; R.ORDER.forEach((k) => { S.on[k] = 1; }); buildSteps();
    const all = [];
    R.ORDER.concat(['_close']).forEach((k) => { let gs = []; try { gs = _lGroups(k).filter((g) => g.list && g.list.length && !g.q); } catch (e) {}
      let combos = [{}]; gs.forEach((g) => { const n = []; combos.forEach((c) => g.list.forEach((it) => { const v = Array.isArray(it) ? it[0] : (it.v || it.k || it); n.push(Object.assign({}, c, { [g.key]: v })); })); combos = n; });
      combos.forEach((c) => { const S0 = JSON.stringify(S); Object.keys(c).forEach((key) => { try { _lSet(key, c[key]); } catch (e) {} });
        let st = []; try { st = _lSteps(ENG, [k]); } catch (e) {}
        all.push({ k, c: JSON.stringify(c), rows: st.map((x) => ({ t: x.quiet || x.talk || x.skip ? 'A' : x.own ? 'O' : 'N', lab: x.lab, txt: String(x.txt || '') })) });
        S = JSON.parse(S0); }); });
    return all; });
  let n1 = [], n2 = [], n3 = [], n4 = [];
  res.forEach((m) => { const r = m.rows, id = m.k + ' ' + m.c;
    if (m.k !== 'guest' && r.some((x) => x.t === 'N') && !r.some((x) => x.t === 'A')) n1.push(id);
    r.forEach((x, i) => { if (x.t === 'N' && /끝나면$/.test(x.lab) && !(i > 0 && r[i - 1].t === 'A')) n2.push(id + ' «' + x.lab + '»');
      if (x.t === 'N' && /^(여는 말|맺는 말|이음말)/.test(x.lab)) n3.push(id + ' «' + x.lab + '»'); });
    if (m.k === 'declare') { const d = r.find((x) => x.t === 'N' && /이제 두 사람은 부부입니다/.test(x.txt) && !/^끝나면$/.test(x.lab)); if (d && !/^성혼 선언문/.test(d.lab)) n4.push(id + ' «' + d.lab + '»');
      if (r.some((x) => /박수 · 두 분이 부부가 돼요/.test(x.txt))) n4.push(id + ' 옛 박수 줄'); } });
  ok(`조합 ${res.length}개를 다 봤다(순간 ${new Set(res.map((m) => m.k)).size}개)`, res.length >= 30 && new Set(res.map((m) => m.k)).size >= 14, String(res.length));
  ok('① 나레이션이 있는 순간마다 하는 일 줄이 하나 이상 [STAGE_LINES]', !n1.length, n1.join(' | '));
  ok('② «…끝나면» 줄 바로 앞은 하는 일 줄 [STAGE_LINES]', !n2.length, n2.join(' | '));
  ok('③ 줄 이름에 «여는 말 · 맺는 말 · 이음말» 없음 [STAGE_LINES]', !n3.length, n3.join(' | '));
  ok('④ 선언 줄 이름 = «성혼 선언문» · «박수 · 부부가 돼요» 없음 [STAGE_LINES]', !n4.length, n4.join(' | '));
  const tn = res.find((m) => m.k === 'tribute' && /none/.test(m.c)), ck = res.find((m) => m.k === 'cake'), vw = res.find((m) => m.k === 'vow');
  ok('부모님께 인사 «말 없이» — 여는 말과 맺는 말 사이 «꽃을 건네고 안겨요 · 말 없이»', !!tn && tn.rows.some((x) => x.t === 'A' && /꽃을 건네고 안겨요 · 말 없이$/.test(x.txt)), tn && JSON.stringify(tn.rows));
  ok('케이크 — «두 분이 함께 케이크를 잘라요» · 서약 — «마지막 두 문장은 … 하객 쪽으로 돌아서서»', !!ck && ck.rows.some((x) => x.t === 'A' && /케이크를 잘라요/.test(x.txt)) && !!vw && vw.rows.some((x) => x.t === 'A' && /하객 쪽으로 돌아서서/.test(x.txt)));
  ok('성혼 선언 설명 «성혼 선언문을 읽으면 두 분이 부부가 돼요»', await pg.evaluate(() => RitualOpen.CARDS ? /성혼 선언문을 읽으면/.test(JSON.stringify(RitualOpen.CARDS.declare || '')) : true));
  ok('pageerror 0', !errs.length, errs.slice(0, 2).join(' | '));
  await pg.close();
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nSTAGE LINES FAIL ${fail}` : '\nSTAGE LINES OK'); process.exit(fail ? 1 : 0);
