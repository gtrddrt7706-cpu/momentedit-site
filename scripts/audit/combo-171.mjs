// ★★[COMBO_171_1030 검토 171 2026-10-30] 순간 조합 · 진행 틈 — C01 인사 받는 분이 바뀌면 한 줄 · C02 선언 → 덕담 255 · C03 축가 맺는 말 힌트 · C04 덕담 인원 시간 · C05 연습 목록 «당일 노래» · N2 콘솔 지문
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
const O = require(path.join(ROOT, 'assets/ritual-open.js')), C = require(path.join(ROOT, 'assets/ritual-cue.js'));
const fam = (w) => { const S = O.applyExample({ course: 'open' }, 'family'); S.course = 'open'; S.declareWho = w; const cs = C.build(C.norm(S), { mode: 'console' }).cues; const i = cs.findIndex((c) => c.k === 'bless'); return { cs, i }; };
{ const a = fam('신랑 아버님'), b = fam('친구 김민수');
  { const z = fam(''); ok('C02 선언한 분 = 부모님이거나 안 적었으면 255 없이 덕담으로 이어 감(종전)', a.cs[a.i - 1].slug !== 'bridge-b9-declare-seat-end' && a.cs[a.i].fire !== 'manual' && z.cs[z.i - 1].slug !== 'bridge-b9-declare-seat-end'); }
  ok('C02 다른 분이 선언하면 255(자리로) 뒤 디렉터 GO 로 덕담', b.cs[b.i - 1].slug === 'bridge-b9-declare-seat-end' && b.cs[b.i].fire === 'manual' && /마이크가 부모님께 넘어가면/.test(b.cs[b.i].hint || '')); }
{ const S = O.applyExample({ course: 'open' }, 'standard'); S.course = 'open'; const cs = C.build(C.norm(S), { mode: 'console' }).cues, e = cs.find((c) => /^narr-song-end/.test(c.slug || ''));
  ok('C03 축가 맺는 말 힌트 «마지막 음 · 잔향이 끝나면»(녹음이 박수를 이끈다)', !!e && e.hint === '마지막 음 · 잔향이 끝나면');
  S.songBy = 'self'; const s2 = C.build(C.norm(S), { mode: 'console' }).cues.find((c) => c.slug === 'narr-song');
  ok('N2 «두 분이 직접»이면 콘솔 지문 «두 분이 노래할 자리로»', !!s2 && /두 분이 노래할 자리로/.test(s2.live.t)); }
{ const b = (x) => O.partsOf('bless', Object.assign({ on: { bless: 1 } }, x))[1];
  ok('C04 덕담 시간 = 말씀하실 분 수 × 1분쯤(안 고르면 두 분 · 153) · 원고가 길면 원고', b({}) === 153 && b({ blessN: 1 }) === 77 && b({ blessN: 4 }) === 306 && b({ blessN: 1, tx: { 'bless.p': '가'.repeat(900) } }) === 180);
  const S1 = O.applyExample({}, 'family'), S4 = Object.assign(O.applyExample({}, 'family'), { blessN: 4 });
  ok('C04 본식 상한(167)에도 반영 — 네 분이면 본식이 길어진다', O.bodySec(S4)[1] > O.bodySec(S1)[1] + 100); }
{ const S = O.applyExample({ course: 'open' }, 'brief'); S.course = 'open'; S.on.letter = 1; O.setChip(S, 'tribute', 'long'); O.setChip(S, 'letter', 'parent');
  ok('C01 당일 콘솔 — 받는 분(서로의 부모님) 메모', C.build(C.norm(S), { mode: 'console' }).cues.some((c) => c.slug === 'tribute-in' && /받는 분: 서로의 부모님/.test(c.note || ''))); }
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const pg = await br.newPage({ viewport: { width: 390, height: 900 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(900);
  const r = await pg.evaluate(async () => { const R = RitualOpen, w = (ms) => new Promise((x) => setTimeout(x, ms)), out = {};
    R.applyExample(S, 'brief'); S.on.letter = 1; R.setChip(S, 'tribute', 'long'); R.setChip(S, 'letter', 'each'); S.tx = Object.assign({}, S.tx || {}, { 'tribute.g': '엄마, 아빠, 키워 주셔서 고마워요' }); opSync(); buildSteps();
    idx = STEPS.findIndex((x) => x.k === 'listen'); render(); mkGo('letter'); await w(300);
    lsChip('letter', 'parent'); await w(300); out.t = [...document.querySelectorAll('.mk-toast')].map((e) => e.textContent);
    const b = document.querySelector('[data-fk="mktoastgo"]'); if (b) b.click(); await w(300); out.at = _mkState().at; out.keep = S.tx['tribute.g'];
    S.tributeText = '엄마 고마워요'; out.card = /서로의 부모님께 드릴 말/.test(scriptTextOpen());
    R.applyExample(S, 'standard'); opSync(); buildSteps(); idx = STEPS.findIndex((x) => x.k === 'practice'); render(); await w(400);
    out.song = [...document.querySelectorAll('li')].filter((e) => /^\d+축가/.test(e.textContent.replace(/\s+/g, ''))).map((e) => e.textContent.replace(/\s+/g, ''));
    return out; });
  ok('C01 편지를 «각자 부모님께»로 바꾸면 «인사 대상이 서로의 부모님으로 바뀌었어요 · 적어 두신 글을 확인해 주세요» + 인사 칸으로 · 글은 그대로', r.t.some((x) => /^인사 대상이 서로의 부모님으로 바뀌었어요 · 적어 두신 글을 확인해 주세요/.test(x)) && r.at === 'tribute' && r.keep === '엄마, 아빠, 키워 주셔서 고마워요', JSON.stringify(r));
  ok('C01 인쇄 카드 «서로의 부모님께 드릴 말»', r.card);
  ok('C05 ③ 연습 목록 축가 = «당일 노래»', r.song.length > 0 && r.song.every((x) => /당일\s*노래/.test(x) && !/나레이션/.test(x)), JSON.stringify(r.song));
  ok('pageerror 0', !errs.length, errs.slice(0, 2).join(' | '));
  await pg.close();
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nCOMBO 171 FAIL ${fail}` : '\nCOMBO 171 OK'); process.exit(fail ? 1 : 0);
