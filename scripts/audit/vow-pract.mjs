// ★[VOW_PRACT_1018 · TRIB_HUG_LINE_1018 · SEAM_KEEP_1018 인스타 섹션 검토 131] ③ 연습하기 · 글로 한눈에 보기가 당일 콘솔과 같은 차례로 흐르는가
//   131-1 먼저 읽는 분(vowFirst) · 131-2 끝에 «두 분 함께»(VOWBOTH · THANKSBOTH) · 131-3 «한 줄씩 번갈아»(vowHow alt)면 문장마다 번갈아
//   131-4 부모님께 인사 — 구호 뒤 «인사해요» · 포옹 청하기(256) 뒤 «부모님이 두 분을 안아 주세요» · 131-5 분위기 안 고른 날도 선언 뒤 박수 두 번이 없다
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
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(900);
  const r = await pg.evaluate(() => { courseStarted = true; const R = RitualOpen; R.ORDER.forEach((k) => { S.on[k] = 1; }); S.vow = 'ok'; buildSteps();
    const S0 = JSON.stringify(S), out = {};
    const vowQ = (o) => { S = JSON.parse(S0); Object.assign(S, o); return _lRefExpand(_lSteps(ENG, ['vow']).filter((x) => !x.quiet)).filter((x) => x.talk2).map((x) => (x.both ? '함께' : x.who) + '|' + x.txt); };
    out.eachB = vowQ({ vowHow: 'each', vowFirst: 'b' });
    out.altG = vowQ({ vowHow: 'alt', vowFirst: 'g' });
    out.altB = vowQ({ vowHow: 'alt', vowFirst: 'b' });
    out.thanks = vowQ({ vowKind: 'thanks', vowHow: 'each' });
    out.mineB = vowQ({ vowHow: 'alt', vowFirst: 'b', tx: { 'vow.g': '신랑 첫째. 신랑 둘째.', 'vow.b': '신부 첫째. 신부 둘째. 신부 셋째.' } });
    S = JSON.parse(S0); S.vowHow = 'each'; S.vowFirst = 'b'; S.tx = { 'vow.g': '신랑 글.', 'vow.b': '신부 글.' }; out.script = scriptTextOpen();
    S = JSON.parse(S0); S.vowHow = 'alt'; S.vowFirst = 'g'; S.tx = { 'vow.g': '신랑 하나. 신랑 둘.', 'vow.b': '신부 하나.' }; out.scriptAlt = scriptTextOpen();
    S = JSON.parse(S0); out.trib = _lSteps(ENG, ['tribute']).map((x) => x.txt);
    /* 131-5 분위기 «지금 그대로» · 예시 넷 × 축사 · 선언 — 박수 청 → 고맙습니다 → 자리 → 박수 청 */
    const CL = /박수[^.!?]*(부탁|바랍니다|주시면|주십시오|맞아)/; out.clap = []; out.clapN = 0;
    (R.EXAMPLES || []).forEach((ex) => { [0, 1, 2, 3].forEach((sp) => {
      S = JSON.parse(S0); R.applyExample(S, ex.k); S.mood = 'keep'; S.on.declare = 1; S.on.free = 1; S.freeWhat = 'speech'; S.narEx = Object.assign({}, S.narEx || {}); if (sp) S.narEx.speech = sp; else delete S.narEx.speech; delete S.seamHand; delete S.seamAuto;
      _persist(); out.clapN++; let cs = []; try { cs = ENG.RitualCue.build(S, { mode: 'console' }).cues; } catch (e) { return; }
      for (let i = 0; i + 3 < cs.length; i++) if (CL.test(cs[i].text || '') && cs[i + 1].slug === 'bridge-b3-clap-thanks' && /^bridge-b9-declare-seat/.test(cs[i + 2].slug) && CL.test(cs[i + 3].text || '')) { out.clap.push(ex.k + '/' + sp); break; } }); });
    S = JSON.parse(S0); return out; });
  const BOTH = '저희 두 사람은 서로를 존중하고 아끼며, 세월이 흘러도 변함없는 사랑을 이어갈 것을 약속합니다.';
  const who = (q) => q.map((x) => x.split('|')[0]);
  ok('[VOW_PRACT_1018 131-1] 각자 · 신부부터 — 연습 첫 차례가 신부 · 끝에 «두 분 함께»', who(r.eachB)[0] === '신부' && who(r.eachB).join() === '신부,신랑,함께' && r.eachB[2] === '함께|' + BOTH, JSON.stringify(r.eachB));
  const alt = who(r.altG); ok('[VOW_PRACT_1018 131-3] 번갈아 · 신랑부터 — 한 줄씩 번갈아(신랑 · 신부 …) · 끝에 «두 분 함께»', alt[0] === '신랑' && alt[1] === '신부' && alt.length > 3 && alt[alt.length - 1] === '함께' && alt.slice(0, -1).every((w, i, a) => i === 0 || w !== a[i - 1] || a.slice(0, i).filter((x) => x === w).length > a.slice(0, i).filter((x) => x !== w).length), JSON.stringify(r.altG));
  ok('[VOW_PRACT_1018] 번갈아 · 신부부터 — 첫 줄이 신부', who(r.altB)[0] === '신부' && who(r.altB)[1] === '신랑', JSON.stringify(r.altB));
  ok('[VOW_PRACT_1018] 두 분 글 · 번갈아 · 신부부터 — 신부 · 신랑 · 신부 · 신랑 · 신부 · 함께(적은 문장 그대로)', r.mineB.join(' / ') === '신부|신부 첫째. / 신랑|신랑 첫째. / 신부|신부 둘째. / 신랑|신랑 둘째. / 신부|신부 셋째. / 함께|' + BOTH, r.mineB.join(' / '));
  ok('[VOW_PRACT_1018 131-2] 감사문 — 끝 «두 분 함께 · 감사합니다.»', r.thanks[r.thanks.length - 1] === '함께|감사합니다.', JSON.stringify(r.thanks));
  ok('[VOW_PRACT_1018 131-1] 글로 한눈에 보기 — 각자 · 신부부터면 신부 글이 먼저', /서약문\(두 분 작성 · 카드로 인쇄\):\n신부 · 신부 글\.\n\n신랑 · 신랑 글\./.test(r.script), r.script.slice(r.script.indexOf('서약문'), r.script.indexOf('서약문') + 80));
  ok('[VOW_PRACT_1018 131-3] 글로 한눈에 보기 — 번갈아면 한 줄씩', /신랑 · 신랑 하나\.\n신부 · 신부 하나\.\n신랑 · 신랑 둘\./.test(r.scriptAlt), r.scriptAlt.slice(r.scriptAlt.indexOf('서약문'), r.scriptAlt.indexOf('서약문') + 80));
  ok('[VOW_PRACT_1018 131-2] 글로 한눈에 보기 — 괄호 줄 바로 뒤 «함께: 저희 두 사람은 …»', r.script.indexOf('하객 쪽으로 돌아서서 함께 읽어요)\n함께: ' + BOTH) > -1);
  ok('[TRIB_HUG_LINE_1018 131-4] 부모님께 인사 — 구호 뒤 «인사해요» · 256 뒤 «부모님이 두 분을 안아 주세요» · «인사하고 안아 드려요» 없음', r.trib.some((t) => /^두 분이 부모님께 인사해요/.test(t)) && r.trib.indexOf('부모님이 두 분을 안아 주세요 · 앉으신 채로도, 일어나셔도') > r.trib.findIndex((t) => /^두 분이 부모님께 인사해요/.test(t)) && !r.trib.some((t) => /인사하고 안아 드려요/.test(t)), JSON.stringify(r.trib));
  ok(`[SEAM_KEEP_1018 131-5] 분위기 안 고름 · 예시 × 축사 칩 ${r.clapN}판 — 선언 박수 → 고맙습니다 → 자리 → 다시 박수 청 0`, r.clapN >= 8 && !r.clap.length, r.clap.join(' · '));
  ok('pageerror 0', !errs.length, errs.slice(0, 2).join(' | '));
  await pg.close();
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nVOW PRACT FAIL ${fail}` : '\nVOW PRACT OK'); process.exit(fail ? 1 : 0);
