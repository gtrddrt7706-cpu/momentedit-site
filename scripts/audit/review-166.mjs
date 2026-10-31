// ★★[REVIEW_166_1030 검토 166] 프리뷰 실화면 전수 점검 — B 동작(B1 · B2 · B3 · B4 · B7 · B8 · B9 · B10 · B11 · B12 · B13) · C1 · C2 를 실제 빌더에서 잰다
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
  const r = await pg.evaluate(() => { courseStarted = true; const R = RitualOpen, S0 = JSON.stringify(S), out = {};
    const q = (k) => _lRefExpand(_lSteps(ENG, [k]).filter((x) => !x.quiet)).filter((x) => x.talk2).map((x) => x.who + '|' + (x.mine ? 'M:' : x.site ? 'S:' : '') + x.txt);
    S = JSON.parse(S0); R.applyExample(S, 'family'); S.on.letter = 1; R.setChip(S, 'letter', 'parent'); R.setChip(S, 'tribute', 'long'); buildSteps();
    S.tx = Object.assign({}, S.tx || {}, { 'letter.g': '신랑 편지.', 'letter.b': '신부 편지.', 'tribute.g': '신랑 인사.', 'tribute.b': '신부 인사.' });
    LS.ref = { letter: 3, tribute: 3 }; out.b1l = q('letter'); out.b1t = q('tribute');
    S = JSON.parse(S0); R.applyExample(S, 'family'); S.on.free = 1; S.on.vow = 1; S.freeWhat = 'speech'; buildSteps();   /* [COURSE_ONE_PROMISE_1030] 가족 코스에 서약이 없어 B3 는 담아서 잰다 */ S.tx = Object.assign({}, S.tx || {}, { 'bless.p': '덕담 원고.', 'free.p': '축사 원고.' }); out.b2 = q('bless').concat(q('free'));
    S.tx['vow.g'] = '신랑 서약.'; S.tx['vow.b'] = '신부 서약.'; S.mkc = Object.assign({}, S.mkc || {}, { 'vow.g': 1 }); S.vowHow = 'each'; out.b3 = q('vow'); const t3 = scriptTextOpen(); out.b3s = !/신랑 서약\./.test(t3) && /신부 서약\./.test(t3);
    S = JSON.parse(S0); R.applyExample(S, 'family'); R.setChip(S, 'tribute', 'none'); buildSteps(); S.tributeText = '옛 인사 글ZZ'; out.b4 = !/ZZ/.test(scriptTextOpen());
    S = JSON.parse(S0); R.applyExample(S, 'standard'); S.vow = 'ok'; S.vowHow = 'alt'; buildSteps(); LS.ref = { vow: 2 }; out.b7 = q('vow');
    out.b8 = R.prepOf('song', { on: { song: 1 }, songBy: 'self' }).every((x) => !/부르실 분 정하기/.test(x[1])) && R.prepOf('song', { on: { song: 1 } }).some((x) => /부르실 분 정하기/.test(x[1]));
    S = JSON.parse(S0); S.on = { declare: 1, tribute: 1 }; R.setChip(S, 'tribute', 'long'); buildSteps(); out.b12 = R.narExList(S, 'tribute').map((x) => x[1]).join(',');
    S = JSON.parse(S0); S.on = { declare: 1 }; buildSteps(); out.b11 = _declNoWho();
    S = JSON.parse(S0); R.applyExample(S, 'standard'); buildSteps(); idx = STEPS.findIndex((x) => x.k === 'listen'); render(); LP.q = [{ k: 'declare', txt: 'x' }]; LP.paused = false; LP.cur = 'declare'; out.b13ok = R.narExOk(S, 'declare', 2); mkNarEx('declare', 2); out.b13 = LP.paused === true;
    S = JSON.parse(S0); R.applyExample(S, 'standard'); S.on.prevideo = 1; S.on.song = 1; S.vowHow = 'each'; S.vow = 'ok'; buildSteps(); LS.ref = {};
    const all = _lRefExpand(_lSteps(ENG, ['prevideo', 'vow', 'song'])); out.c1 = all.filter((x) => x.vk).map((x) => x.k + ':' + _vTag(x.k, x).replace(/<[^>]+>/g, ''));
    out.c2 = all.filter((x) => x.k === 'vow' && x.quiet && /함께 읽어요$/.test(x.txt)).length;
    const B = document.documentElement.outerHTML; out.b9 = /'축사하실 분이 현장에서'/.test(B); out.b10 = /_txIsLast\(kind,w\[0\]\)\?' · 끝 신호를 적어 주세요':''/.test(B);
    S = JSON.parse(S0); return out; });
  const W = (a) => a.map((x) => x.split('|')[0]).join(',');
  ok('[REVIEW_166_1030 B1] 한 사람 판 참고 예시(편지 4 · 교차 인사 4)여도 두 분이 적은 글은 연습에 둘 다', W(r.b1l) === '신랑,신부' && W(r.b1t) === '신랑,신부' && r.b1l.every((x) => /\|M:/.test(x)), JSON.stringify([r.b1l, r.b1t]));
  ok('[REVIEW_166_1030 B2] 덕담 · 축사 받은 원고 = 연습에 원고(예시 아님)', r.b2.join(' / ') === '부모님|M:덕담 원고. / 축사하시는 분|M:축사 원고.', r.b2.join(' / '));
  ok('[REVIEW_166_1030 B3] 적어 둔 뒤 «현장에서»로 바꾸면 연습 · 대본에서 그 글을 빼고 보관', /^신랑\|S:/.test(r.b3[0]) && /^신부\|M:신부 서약\./.test(r.b3[1]) && r.b3s, JSON.stringify(r.b3));
  ok('[REVIEW_166_1030 B4] 부모님께 인사 «말없이»면 대본에 적어 둔 인사 글 없음', r.b4);
  const b7w = W(r.b7).split(',').filter((w) => w !== '두 분');
  ok('[REVIEW_166_1030 B7] «한 줄씩 번갈아» — 인용으로 시작하는 줄은 앞 문장과 한 칸 · 같은 사람 줄 연달아 없음', !r.b7.some((x) => /\|["“]/.test(x)) && b7w.every((w, i) => !i || w !== b7w[i - 1]), JSON.stringify(r.b7));
  ok('[REVIEW_166_1030 B8] 축가 «두 분이 직접» = «부르실 분 정하기» 없음 · MR 은 그대로', r.b8);
  ok('[REVIEW_166_1030 B9 · B10] 한눈에 보기 — 축사 «축사하실 분이 현장에서» · 끝 신호는 칸이 있는 분에게만', r.b9 && r.b10);
  ok('[REVIEW_166_1030 B11] 서약 없는 날 선언 읽는 분 안 적음 = «… 이 순간을 빼 주세요» (서약으로 마무리 아님)', /성혼 선언을 하지 않으려면 이 순간을 빼 주세요\.$/.test(r.b11), r.b11);
  ok('[REVIEW_166_1030 B12] 선언 바로 뒤 부모님께 인사 — 기본과 같은 소리가 되는 칩 숨김', r.b12 === '뭉클하게,담백하게,감사하게', r.b12);
  ok('[REVIEW_166_1030 B13] 말투 칩을 바꾸면 «이 순간 전체 듣기» 멈춤', r.b13, 'narExOk=' + r.b13ok);
  ok('[REVIEW_166_1030 C1 · C2 → TAG_OFF_1101] 영상 · 축가 자리 줄 옆 표(«영상 상영» · «당일 노래») 없음 · «두 분 함께» 뒤 같은 지시 없음', r.c1.join() === 'prevideo:,song:' && r.c2 === 0, JSON.stringify(r.c1) + ' c2=' + r.c2);   /* ★[TAG_OFF_1101 2026-11-01 사장님] 줄 옆 부수 표를 걷었다 */
  ok('pageerror 0', !errs.length, errs.slice(0, 2).join(' | '));
  await pg.close();
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nREVIEW 166 FAIL ${fail}` : '\nREVIEW 166 OK'); process.exit(fail ? 1 : 0);
