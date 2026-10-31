// ★★[DECL_TITLE_1031 검토 174 · 사장님 «호칭으로 불러 드리는 게 예의» · GPT 4라운드 → 0] 성혼 선언 «읽어 주실 분» 호칭 칩 + 호칭 나레이션
//   칩 다섯(신랑 아버님 · 신부 아버님 · 신랑 어머님 · 신부 어머님 · 그 밖의 분 · 처음엔 안 고름) · 여는 말 = 말투 앞 문장 + «오늘의 성혼 선언은 H께서 직접 해 주시겠습니다.» ·
//   자리로 «Hx께서는 자리로 돌아가셔도 좋습니다.»(그 밖의 분 · 안 고름은 255) · 덕담 이어 하기 묻기(글자 추측 없음) · 옛 데이터 · 원천 한 곳(흐름 · 대본 · 공유 · 콘솔 · 관리 화면)
//   node scripts/audit/decl-title.mjs   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const O = require(path.join(ROOT, 'assets/ritual-open.js')); global.RitualOpen = O; const C = require(path.join(ROOT, 'assets/ritual-cue.js'));
const H = { gdad: '신랑 아버님', bdad: '신부 아버님', gmom: '신랑 어머님', bmom: '신부 어머님' };
const HEAD = ['', '다음은 두 사람이 부부가 되었음을 선언하는 성혼 선언입니다.', '이제 이 결혼식의 가장 엄숙한 순서, 성혼 선언이 있겠습니다.', '다음은 성혼 선언입니다.'];
const want = (i, h) => (HEAD[i] ? HEAD[i] + ' ' : '') + '오늘의 성혼 선언은 ' + h + '께서 직접 해 주시겠습니다.';
const mk = (ex, x) => { const S = O.applyExample({ course: 'open' }, ex || 'family'); S.course = 'open'; S.on = Object.assign({}, S.on, { declare: 1 }); Object.assign(S, x || {}); return S; };
const cuesOf = (S, mode) => C.build(C.norm(S), { mode: mode || 'console' }).cues;
// ── 1. 칩 · 20조합 문안
ok('칩 다섯 · 순서 · 이름', JSON.stringify(O.DECL_TITLES) === JSON.stringify([['gdad', '신랑 아버님'], ['bdad', '신부 아버님'], ['gmom', '신랑 어머님'], ['bmom', '신부 어머님'], ['other', '그 밖의 분']]));
{ const bad = [];
  for (const t of ['gdad', 'bdad', 'gmom', 'bmom', 'other', '']) for (let i = 0; i < 4; i++) {
    const S = mk('family', Object.assign({ declTitle: t || undefined }, t === 'other' ? { declareWho: '신랑 할아버님' } : {})); if (i) S.narEx = Object.assign({}, S.narEx, { declare: i }); else if (S.narEx) delete S.narEx.declare;
    const d = cuesOf(S).find((c) => c.slug === 'narr-declare-in-friend'), h = H[t] || '신랑 신부가 부탁드린 분';
    if (!d || d.text !== want(i, h)) bad.push(`${t || '안 고름'} · 말투 ${i + 1} → ${d && d.text}`);
    if (H[t] && !new RegExp(`_narr-declare-in-friend${i ? '-ex' + (i + 1) : ''}-${t}$`).test(d.file || '')) bad.push(`${t} · 말투 ${i + 1} 파일 ${d.file}`);
    if (!H[t] && /-(gdad|bdad|gmom|bmom)$/.test(d.file || '')) bad.push(`${t || '안 고름'} 인데 호칭 파일 ${d.file}`); }
  ok('여는 말 6판(호칭 넷 · 그 밖의 분 · 안 고름) × 말투 넷 = 24 — 공통형 «오늘의 성혼 선언은 H께서 직접 해 주시겠습니다.» · 부모님은 호칭 클립 · 그 밖의 분 · 안 고름은 지금 소리', !bad.length, bad.slice(0, 3).join(' | ')); }
ok('그 밖의 분 칸 글(이름 · 관계)은 소리 글에 안 나온다', cuesOf(mk('family', { declTitle: 'other', declareWho: '김철수 삼촌' }), 'preview').every((c) => !String(c.text || '').includes('김철수')));
// ── 2. 자리로 · 덕담 연결
const near = (S) => { const cs = cuesOf(S), i = cs.findIndex((c) => c.k === 'bless'); return { seat: cs.slice(0, i).filter((c) => c.slug === 'bridge-b9-declare-seat-end').map((c) => c.text), bless: cs[i] }; };
{ const yes = mk('family', { declTitle: 'gdad', declBless: 'yes' }); yes.declBlessKey = O.declBlessKey(yes); const r = near(yes);
  ok('같은 부모님(네) — 자리로 없이 그분이 첫 덕담 · 메모', !r.seat.length && r.bless.fire !== 'manual' && /첫 덕담 · 성혼 선언을 읽으신 신랑 아버님께서/.test(r.bless.note || ''), JSON.stringify(r)); }
{ const no = mk('family', { declTitle: 'bmom', declBless: 'no' }); no.declBlessKey = O.declBlessKey(no); const r = near(no);
  ok('다른 분(아니요) — «신부 어머님께서는 자리로 돌아가셔도 좋습니다.» → 디렉터 GO', r.seat[0] === '신부 어머님께서는 자리로 돌아가셔도 좋습니다.' && r.bless.fire === 'manual', JSON.stringify(r.seat)); }
{ const r = near(mk('family', { declTitle: 'other', declareWho: '아버지 친구' }));
  ok('«아버지 친구»(그 밖의 분) — 글자 추측 없이 자리로(255) → GO', r.seat[0] === '선언해 주신 분께서는 자리로 돌아가셔도 좋습니다.' && r.bless.fire === 'manual', JSON.stringify(r.seat)); }
{ const r = near(mk('family', {})); ok('안 고름 — 추정하지 않음(자리로 255 + GO)', r.seat.length === 1 && r.bless.fire === 'manual'); }
{ const S = mk('standard', { declTitle: 'gmom' }); S.on = Object.assign({}, S.on, { declare: 1 }); delete S.on.bless; const cs = cuesOf(S), i = cs.findIndex((c) => c.slug === 'bridge-b9-declare-seat-end');
  ok('다음이 덕담 아님 — 자리로(호칭) → 귀석까지 디렉터 GO', i > -1 && cs[i].text === '신랑 어머님께서는 자리로 돌아가셔도 좋습니다.' && cs[i + 1] && cs[i + 1].fire === 'manual', JSON.stringify(cs.slice(i, i + 2).map((c) => [c.slug, c.fire, c.hint]))); }
{ const S = mk('brief', { declTitle: 'bdad' }); S.on = { declare: 1 }; const cs = cuesOf(S), seat = cs.filter((c) => c.slug === 'bridge-b9-declare-seat-end');
  ok('선언이 마지막인 날 — 닫는 인사 앞 자리로도 호칭(«신부 아버님께서는 …»)', seat.length === 1 && seat[0].text === '신부 아버님께서는 자리로 돌아가셔도 좋습니다.', JSON.stringify(seat.map((c) => c.text))); }
// ── 3. 다시 확인 · 옛 데이터
{ const S = mk('family', { declTitle: 'gdad', declBless: 'yes' }); S.declBlessKey = O.declBlessKey(S); const a = O.declBlessOf(S); S.declTitle = 'bdad'; const b = O.declBlessOf(S); const T = mk('family', { declTitle: 'gdad', declBless: 'yes' }); T.declBlessKey = O.declBlessKey(T); delete T.on.bless; const c = O.declBlessOf(T);
  ok('호칭 · 덕담 유무가 바뀌면 답은 다시 확인(빈 값 = 자리로 + GO)', a === 'yes' && b === '' && c === '', JSON.stringify([a, b, c])); }
ok('옛 데이터 — 칸 글이 네 호칭과 같으면 그 칩 · gdad · bdad 코드 그대로 · «아버님» · 실명 · 관계는 그 밖의 분(글 보존) · 빈 칸 · 옛 friend 는 안 고름',
  O.declTitleOf({ declareWho: '신부 어머님' }) === 'bmom' && O.declTitleOf({ declareWho: 'gdad' }) === 'gdad' && O.declTitleOf({ declareWho: 'bdad' }) === 'bdad'
  && O.declTitleOf({ declareWho: '아버님' }) === 'other' && O.declBy({ declareWho: '아버님' }) === '아버님' && O.declTitleOf({ declareWho: '김철수' }) === 'other'
  && O.declTitleOf({ declareWho: '' }) === '' && O.declTitleOf({ declareWho: 'friend' }) === '' && O.declTitleOf({ declareWho: ' 신랑  아버님 ' }) === 'gdad');
ok('가족 코스 예시는 부모님을 자동으로 고르지 않는다', !O.declTitleOf(mk('family')));
// ── 4. 공유 주소 · 관리 화면 거울
{ const w = {}; new Function('window', fs.readFileSync(path.join(ROOT, 'assets/ritual-preview-link.js'), 'utf8'))(w);
  const S = mk('family', { declTitle: 'other', declareWho: '김철수 삼촌', declBless: 'no', tribHug: 'off' }); S.declBlessKey = O.declBlessKey(S);
  const u = w.RitualPreviewLink.url(S, {}), o = JSON.parse(decodeURIComponent(escape(Buffer.from(decodeURIComponent(u.split('S=')[1]), 'base64').toString('latin1'))));
  ok('공유 미리 듣기 — 호칭 코드 · 이어 하기 값 · 인사만은 싣고 «그 밖의 분» 글은 싣지 않는다', o.declTitle === 'other' && o.declBless === 'no' && o.tribHug === 'off' && !('declareWho' in o) && !JSON.stringify(o).includes('김철수'), JSON.stringify(o)); }
{ const src = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8'); const fn = (n) => { const i = src.indexOf('function ' + n + '('); let d = 0, j = src.indexOf('{', i); for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}' && !--d) break; } return src.slice(i, j + 1); };
  const ctx = {}; vm.createContext(ctx); vm.runInContext(fn('_declWhoLabel') + fn('_declWhoOf'), ctx);
  const cases = [{ declTitle: 'gmom' }, { declTitle: 'other', declareWho: '신부 언니' }, { declTitle: 'other' }, { declareWho: '신랑 아버님' }, { declareWho: 'bdad' }, { declareWho: '아버님' }, {}];
  const bad = cases.filter((S) => ctx._declWhoOf(S) !== (O.declBy(S) || '아직 안 정함'));
  ok('관리 화면 «읽는 분» 거울(_declWhoOf) = RitualOpen.declBy(안 고름은 «아직 안 정함»)', !bad.length, JSON.stringify(bad)); }
// ── 5. 화면(식순 빌더)
if (!pw) { console.log('못 쟀다 — playwright 없음(화면 검사 건너뜀)'); }
else {
  const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.webp': 'image/webp' };
  const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
  const br = await pw.chromium.launch();
  try {
    const pg = await br.newPage({ viewport: { width: 390, height: 900 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await new Promise((r) => setTimeout(r, 900));
    const r = await pg.evaluate(async () => { const R = RitualOpen, w = (ms) => new Promise((x) => setTimeout(x, ms)), out = {};
      R.applyExample(S, 'family'); delete S.declTitle; delete S.declBless; delete S.declBlessKey; S.declareWho = ''; opSync(); buildSteps(); idx = STEPS.findIndex((x) => x.k === 'listen'); render(); await w(300); mkGo('declare'); await w(400);
      const gs = () => _lGroups('declare'); const g0 = gs().find((x) => x.key === 'declTitle');
      out.chips = g0 ? g0.list.map((x) => x[1]).join('/') : ''; out.unpicked = g0 ? g0.picked === false && g0.unote === '아직 고르지 않았어요. 읽어 주실 한 분을 정해 주세요.' : false; out.noBlessQ = !gs().some((x) => x.key === 'declBless');
      lsChip('declTitle', 'other'); await w(300); const gi = gs().find((x) => x.key === 'declareWho'); out.otherNote = (document.querySelector('[data-fk="declwho"]') && document.querySelector('[data-fk="declwho"]').closest('.ls-cg').querySelector('.ls-gnote') || {}).textContent || '';   /* 화면에 찍힌 글로 잰다 */ out.otherPh = /신랑 할아버님 · 신부 언니 · 신랑 친구/.test(gi ? gi.html : '');
      lsChip('declTitle', 'gdad'); await w(300); const _rg = () => [...document.querySelectorAll('[role=radiogroup]')].find((e) => e.getAttribute('aria-label') === '덕담도 이어서'); out.blessQ = ((_rg() || document).querySelector('.ls-gnote') || {}).textContent || '';   /* 화면에 찍힌 글 */
      out.flow = _lSteps(ENG, ['declare']).map((x) => x.txt).join(' ¦ ');
      lsChip('declBless', 'yes'); await w(200); out.ans = R.declBlessOf(S);
      lsChip('declTitle', 'bdad'); await w(200); out.reask = ((_rg() || document).querySelector('.ls-gnote') || {}).textContent || '';
      out.script = scriptTextOpen();
      PV.k = 'declare'; const ln = _pvLine('declare'); out.pv = ln ? ln.text : '';
      // 재생 중 칩 바꾸기 — 앞 소리 · 예약은 멈춘다
      LP.q = [{ k: 'declare', txt: 'x' }]; LP.cur = 'declare'; LP.i = 0; let hushed = false; const _h = window._lpHush; window._lpHush = function () { hushed = true; return _h && _h.apply(this, arguments); };
      lsChip('declTitle', 'gmom'); await w(200); out.hushed = hushed; window._lpHush = _h;
      return out; });
    ok('칩 다섯 · 처음엔 안 고름 + «아직 고르지 않았어요. 읽어 주실 한 분을 정해 주세요.» · 안 고르면 덕담 질문 없음', r.chips === '신랑 아버님/신부 아버님/신랑 어머님/신부 어머님/그 밖의 분' && r.unpicked && r.noBlessQ, JSON.stringify(r).slice(0, 300));
    ok('그 밖의 분 — 30자 칸 · 예시 · 안내 «입력하신 이름이나 관계는 진행 대본에만 …»', r.otherPh && r.otherNote === '입력하신 이름이나 관계는 진행 대본에만 담고, 나레이션에서는 ‘신랑 신부가 부탁드린 분’으로 안내해요.', r.otherNote);
    ok('바로 다음이 덕담이면 묻기 «성혼 선언을 읽으신 분이 첫 덕담도 이어서 하시나요?» · 호칭이 바뀌면 다시 확인 문구', r.blessQ === '성혼 선언을 읽으신 분이 첫 덕담도 이어서 하시나요?' && r.ans === 'yes' && r.reask === '고르신 분이 바뀌었어요. 덕담을 이어서 하실지도 다시 확인해 주세요.', JSON.stringify([r.blessQ, r.ans, r.reask]));
    ok('② 흐름 · ① 대표 미리 보기 — 고른 호칭 소리(빈 낭독자로 다른 소리 안 냄)', /오늘의 성혼 선언은 신랑 아버님께서 직접 해 주시겠습니다/.test(r.flow) && r.pv === '오늘의 성혼 선언은 신부 아버님께서 직접 해 주시겠습니다.', JSON.stringify([r.flow.slice(0, 120), r.pv]));
    ok('전체 대본 — 동작 글 «신부 아버님께서 성혼 선언문을 읽어요» · 호칭 여는 말 · 호칭 자리로', /신부 아버님께서 성혼 선언문을 읽어요/.test(r.script) && /오늘의 성혼 선언은 신부 아버님께서 직접 해 주시겠습니다/.test(r.script), (r.script.match(/.{0,40}선언문을 읽어요.{0,20}/) || [''])[0]);
    ok('재생 중 칩을 바꾸면 앞 소리 · 예약 멈춤(166 B13 규칙)', r.hushed);
    ok('pageerror 0', !errs.length, errs.slice(0, 2).join(' | '));
  } catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
  finally { await br.close(); srv.close(); }
}
console.log(fail ? `\nDECL_TITLE FAIL ${fail}` : '\nDECL_TITLE OK'); process.exit(fail ? 1 : 0);
