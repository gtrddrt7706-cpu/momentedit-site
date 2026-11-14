#!/usr/bin/env node
/* ★★[MID17_PICK 2026-11-07 재검증 재수정 · 사장님 «마음의 순간에 식중 영상 칸을 따로 하나»] MID17 줄 1 · 2 — 식순 고르기 · 시간
   ① 식중 영상 칸(덕담 · 축사 · 식중 영상 · 축가 · 편지) · 이름 · 칸 글 두 줄 안 · 담기 · 바꿔 담기(알림 한 줄 20자 안) · 빼기 · 축사 칸 켜짐(갈래까지)
   · 개수 줄 · 미리 보기 창(대표 나레이션 58 · 영상 판) · ② 길이 칸 + 택1 한 줄 · at:'midvideo' 두 경우 · 시간 띠(freeLen 1 · 5 · 10 · 길이 칩과 같은 셈 · 40분 상한)
   · 준비 목록에 옛 «준비한 순서 영상(휴대폰…)» 줄 없음 · 페이지 오류 0. 폭 390 · 360.
   엔진 몫(이름 · 준비 목록 · 시간)은 node 로 · 화면 몫은 Playwright.
   --selftest = 옛 판(origin/main 의 order-preview.html · assets/ritual-open.js)을 띄워 빨강이 나는지 본다(통과만 하는 검사는 죽은 검사다).
   SHOT=<폴더> 면 390 · 360 스크린샷(고르기 «마음의 순간» · ② 식중 영상 칸)을 남긴다.
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import vm from 'node:vm';
import { createRequire } from 'node:module'; import { execFileSync, spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const SELF = process.argv.includes('--selftest'), OLD = process.env.MID17_OLD || '', SHOT = process.env.SHOT || '';

if (SELF) {   /* 옛 판을 띄워 빨강을 읽는가 */
  const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });
  let base = ''; try { base = git('merge-base', 'HEAD', 'origin/main').trim(); } catch { try { base = git('rev-parse', 'HEAD~1').trim(); } catch {} }
  if (!base) { console.log('못 쟀다 — 비교할 옛 판이 없다'); process.exit(2); }
  const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'mid17-old-'));
  try { fs.writeFileSync(path.join(dir, 'order-preview.html'), git('show', base + ':order-preview.html')); fs.writeFileSync(path.join(dir, 'ritual-open.js'), git('show', base + ':assets/ritual-open.js')); }
  catch (e) { console.log('못 쟀다 — 옛 판 파일 ' + e.message); process.exit(2); }
  if (git('show', base + ':assets/ritual-open.js') === fs.readFileSync(path.join(ROOT, 'assets/ritual-open.js'), 'utf8')) { console.log('못 쟀다 — 옛 판과 지금 판이 같다(이미 병합됨)'); process.exit(2); }
  const r = spawnSync(process.execPath, [new URL(import.meta.url).pathname], { env: Object.assign({}, process.env, { MID17_OLD: dir, SHOT: '' }), encoding: 'utf8', maxBuffer: 1 << 26 });
  const fails = (r.stdout.match(/^FAIL /mg) || []).length;
  console.log(r.stdout.split('\n').filter((l) => /^FAIL /.test(l)).slice(0, 12).join('\n'));
  const good = r.status === 1 && fails >= 8;
  console.log(good ? `\nMID17 PICK SELFTEST OK — 옛 판에서 빨강 ${fails}줄(종료 ${r.status})` : `\nMID17 PICK SELFTEST FAIL — 옛 판이 빨강을 충분히 안 낸다(${fails}줄 · 종료 ${r.status})`);
  process.exit(good ? 0 : 1);
}

let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 500)}`); if (!c) fail++; };
const OPEN_SRC = OLD ? path.join(OLD, 'ritual-open.js') : path.join(ROOT, 'assets/ritual-open.js');
const OP_SRC = OLD ? path.join(OLD, 'order-preview.html') : path.join(ROOT, 'order-preview.html');
const vis = (t) => String(t).replace(/[«»‹›「」]/g, '').trim();

/* ── 엔진(node) ── */
const O = (() => { const sb = { console }; sb.window = sb; sb.self = sb; vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/ritual-data.js'), 'utf8'), sb); vm.runInContext(fs.readFileSync(OPEN_SRC, 'utf8'), sb); return sb.RitualOpen; })();
const ex = (k) => { const S = O.applyExample({ course: 'open' }, k); S.course = 'open'; return S; };
const mv = (S, L) => { const t = JSON.parse(JSON.stringify(S)); t.on = t.on || {}; t.on.free = 1; t.freeWhat = 'video'; if (L) t.freeLen = String(L); return t; };
{
  const V = mv({ course: 'open', on: {} }, 3);
  ok('[MID17_NAME] 이름 «식중 영상» — nameOf · 칩 이름 · chipLabel(«식중 영상 · 3분»)', O.nameOf('free', V) === '식중 영상' && O.labelOf('free', 'video') === '식중 영상' && O.chipLabel('free', V) === '식중 영상 · 3분', [O.nameOf('free', V), O.labelOf('free', 'video'), O.chipLabel('free', V)]);
  ok('[MID17_NAME] 축사는 «축사» · 옛 초안 선물 · 기타는 «준비한 순서» 그대로', O.nameOf('free', { course: 'open', on: { free: 1 }, freeWhat: 'speech' }) === '축사' && O.nameOf('free', { course: 'open', on: { free: 1 }, freeWhat: 'gift' }) === '준비한 순서' && O.nameOf('free', { course: 'open', on: { free: 1 }, freeWhat: 'etc' }) === '준비한 순서');
  ok('[MID17_NAME] 칸 글 · ② 머리 한 줄이 영상 갈래 글(축사 글이 아니게)', /영상/.test(O.tileOf('free', V)) && /영상/.test(O.oneOf('free', V)) && !/축하의 말/.test(O.tileOf('free', V) + O.oneOf('free', V)), [O.tileOf('free', V), O.oneOf('free', V)]);
  const pr = O.prepOf('free', V);
  ok('[MID17_PREP] 준비 목록 — 식중 영상은 빈 목록(마이페이지가 받는다 · 식전 영상과 같은 결정)', Array.isArray(pr) && pr.length === 0, pr);
  ok('[MID17_PREP] 옛 할 일 «준비한 순서 영상(휴대폰으로 가로로 찍은 영상» 문장이 ritual-open 에 없다', !/'준비한 순서 영상\(휴대폰/.test(fs.readFileSync(OPEN_SRC, 'utf8')));
  /* 시간 — 60 × 분 + 8 · 본식 · 단체 사진 띠가 그만큼 · 40분 안 */
  const b = ex('brief'), rows = [1, 5, 10].map((L) => { const t = mv(b, L), sp = O.span(t); return { L, p: O.partsOf('free', t), hi: O.bodySec(t)[1], sp, sum: sp.tb + sp.tm + sp.pm + sp.pa, txt: O.spanText(t) }; });
  ok('[MID17_TIME] 영상 몫 = 60 × 분 + 8(1 · 5 · 10분 → 68 · 308 · 608초)', rows.every((r) => r.p[2] === 60 * r.L + 8), rows.map((r) => r.p));
  ok('[MID17_TIME] 본식 · 단체 사진 띠가 freeLen 만큼 바뀐다 · 본식 + 단체 사진 = 40분(' + rows.map((r) => r.L + '분 ' + r.txt).join(' | ') + ')', rows[1].hi - rows[0].hi === 240 && rows[2].hi - rows[1].hi === 300 && rows.every((r) => r.sum === O.DAYMIN) && rows[0].sp.pb > rows[1].sp.pb && rows[1].sp.pb > rows[2].sp.pb, rows.map((r) => [r.hi, r.sum]));
  const st = ex('standard'), st10 = mv(st, 10), st3 = mv(st, 3);
  ok('[MID17_TIME] 정석(축사 3분 · 6개 꽉 참)을 식중 영상으로 바꾸면 3분은 상한 안 · 10분은 상한 밖(capOver)', !O.capOver(st, st3) && O.capOver(st, st10) && O.bodySec(st10)[1] > O.capSec(st10), [O.bodySec(st3)[1], O.bodySec(st10)[1], O.capSec(st10)]);
  ok('[MID17_TIME] 예시 코스 넷 그대로 — 정석은 축사 · 나머지는 축사 칸 없음 · 넷 다 6개/3개 안', ex('standard').freeWhat === 'speech' && O.onOf(ex('standard'), 'free') && ['record', 'family', 'brief'].every((k) => !O.onOf(ex(k), 'free')) && O.EXAMPLES.every((e) => { const c = O.countOf(ex(e.k)); return c.n <= 6 && c.long <= 3; }));
  for (const t of ['축사 대신 식중 영상을 담았어요', '식중 영상 대신 축사를 담았어요', '식중 영상으로 바꿔 담았어요'])
    ok(`[TOAST_MIN] 바꿔 담기 알림 20자 안 · «·» 한 번까지 «${t}» ${vis(t).length}자`, vis(t).length <= 20 && (t.match(/·/g) || []).length <= 1);
}

/* ── 화면(Playwright) ── */
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' };
const HARNESS = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="margin:0"><iframe id="fr" style="width:100vw;height:100vh;border:0;display:block"></iframe>
<script>window.H={draft:null,at:''};var fr=document.getElementById('fr');function back(m){ fr.contentWindow.postMessage(m, location.origin); }
window.go=function(){ fr.src='/order-preview.html?embed=1'; };
window.addEventListener('message',function(ev){ var d=ev.data||{}; if(ev.origin!==location.origin||ev.source!==fr.contentWindow) return;
  if(d.type==='momentedit:orderReady'){ back({type:'momentedit:orderFill',draft:H.draft,done:false,at:H.at,cust:{name:'시험',code:'TEST01'}}); return; }
  if(d.type==='momentedit:orderDraft'){ back({type:'momentedit:orderDraftSaved'}); return; } });</script>`;
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/__harness.html') { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(HARNESS); return; }
  const p = u === '/order-preview.html' ? OP_SRC : u === '/assets/ritual-open.js' ? OPEN_SRC : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const FREE_IN = '다음은 오늘 예식에서 두 사람이 가장 마음을 쏟아 준비한 순서입니다.';
async function page(W, embed) {
  const ctx = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: true }); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  return { ctx, pg, errs };
}
try {
  for (const W of [390, 360]) {
    const { ctx, pg, errs } = await page(W);
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(900);
    const r = await pg.evaluate(async () => { const R = RitualOpen, out = {}, w = (ms) => new Promise((x) => setTimeout(x, ms));
      const tile = (k) => { const b = document.querySelector('[data-fk="pto:' + k + '"]'), t = b && b.closest('.pk-tile'); if (!t) return null;
        const s = t.querySelector('.pk-s'), lh = s ? parseFloat(getComputedStyle(s).lineHeight) || 0 : 0, sel = t.querySelector('.pk-sel');
        return { n: (t.querySelector('.pk-n') || {}).textContent || '', s: s ? s.textContent : '', lines: s && lh ? Math.round(s.getBoundingClientRect().height / lh) : 0, clip: s ? s.scrollHeight - s.clientHeight : 0,
          on: t.classList.contains('on'), pressed: sel ? sel.getAttribute('aria-pressed') : '', sec: (t.closest('.pk-act') && t.closest('.pk-act').querySelector('.pk-act-h') || {}).textContent || '' }; };
      const heart = () => { const s = [...document.querySelectorAll('.pk-act')].find((a) => /마음의 순간/.test(a.textContent)); return s ? [...s.querySelectorAll('.pk-n')].map((e) => e.textContent) : []; };
      const undo = () => { const u = document.getElementById('pkUndo'); return u && !u.hidden ? u.textContent : ''; };
      const ask = () => { const d = document.querySelector('.ord-ask'); const t = d ? d.textContent : ''; const y = document.querySelector('.ord-ask button'); if (y) y.click(); return t; };
      const cnt = () => (document.querySelector('[data-fk="pkcnt:pk"]') || {}).textContent || '';
      const st = () => ({ on: !!(S.on && S.on.free), w: S.freeWhat });
      const tap = async (k) => { document.querySelectorAll('.ord-ask').forEach((e) => e.remove()); const b = document.querySelector('[data-fk="opt:' + k + '"]'); if (!b) return false; b.click(); await w(250); return true; };
      try { opGoStep('pick'); } catch (e) {} S.on = {}; opSync(); await w(400);
      out.heart = heart(); out.mv0 = tile('midvid'); out.sp0 = tile('free');
      out.add = await tap('midvid'); out.addSt = st(); out.mv1 = tile('midvid'); out.sp1 = tile('free'); out.cnt1 = cnt();
      out.toSp = await tap('free'); out.toSpSt = st(); out.toSpU = undo(); out.mv2 = tile('midvid'); out.sp2 = tile('free');
      out.toMv = await tap('midvid'); out.toMvSt = st(); out.toMvU = undo(); out.mv3 = tile('midvid'); out.sp3 = tile('free'); out.cnt3 = cnt();
      out.rm = await tap('midvid'); out.rmSt = st(); out.mv4 = tile('midvid'); out.sp4 = tile('free');
      /* 정석(6개 · 축사 담김) → 식중 영상 ＋ = 바꿔 담기(개수 그대로) · 가족(6개 · 축사 없음) → 막힘 «본식 순간은 6개까지예요» */
      R.applyExample(S, 'standard'); opSync(); await w(200); const c0 = cnt(); await tap('midvid'); out.stdSt = st(); out.stdCnt = [c0, cnt()]; out.stdAsk = ask();
      R.applyExample(S, 'family'); opSync(); await w(200); await tap('midvid'); out.famSt = st(); out.famAsk = ask();
      /* 미리 보기 창 — 식중 영상 판 */
      S.on = {}; S.freeWhat = 'speech'; opSync(); await w(200);
      const cl = (q) => { const e = document.querySelector(q); if (e) e.click(); return !!e; };   /* 옛 판(selftest)엔 칸이 없다 — 멈추지 않고 빨강으로 센다 */
      cl('[data-fk="pto:midvid"]'); await w(1500);
      const pv = document.getElementById('pvSheet');
      out.pv = pv ? { t: (pv.querySelector('#pvT') || {}).textContent, q: (pv.querySelector('#pvQ') || {}).textContent, line: (typeof _pvLine === 'function' && _pvLine(PV.k)) || null,
        vid: (() => { const v = pv.querySelector('#pvM video'); return v ? v.getAttribute('src') || '' : ''; })(), act: (pv.querySelector('#pvAct') || {}).textContent } : null;
      const addB = pv && pv.querySelector('#pvAct .pv-add'); if (addB) addB.click(); await w(250); out.pvAddSt = st(); out.pvAct2 = pv ? (pv.querySelector('#pvAct') || {}).textContent : '';
      try { opPvClose(); } catch (e) {} await w(300);
      cl('[data-fk="pto:free"]'); await w(1200); out.pvSp = pv ? { t: (pv.querySelector('#pvT') || {}).textContent, act: (pv.querySelector('#pvAct') || {}).textContent, line: (typeof _pvLine === 'function' && _pvLine(PV.k)) || null } : null;
      try { opPvClose(); } catch (e) {} await w(300);
      /* [MID17_FREE_BACK] 이번 방문에 뺀 칸을 다시 담으면 뺄 때 갈래 · 칸을 지정하면 그 칸 갈래 · 처음 담는 축사 칸은 축사 */
      const fw = () => ({ on: !!(S.on && S.on.free), w: S.freeWhat, etc: S.freeEtc || '', n: (tile('free') || {}).n });
      window._freeWas = null; S.on = { free: 1 }; S.freeWhat = 'etc'; S.freeEtc = '형제 깜짝 영상편지'; opSync(); await w(150);
      await tap('free'); out.fbOff = fw(); await tap('free'); out.fbEtc = fw();
      await tap('free'); await tap('midvid'); out.fbMv = fw();
      await tap('midvid'); await tap('free'); out.fbSp = fw();
      await tap('free'); await tap('midvid'); await tap('midvid'); try { lsAdd('free'); } catch (e) { out.fbErr = e.message; } await w(200); out.fbLs = fw();
      try { opGoStep('pick'); } catch (e) {} window._freeWas = null; S.on = {}; S.freeWhat = 'video'; opSync(); await w(200); await tap('free'); out.fbFirst = fw();
      /* [MID17_FREE_BACK] 누르기 전 보인 이름 = 담긴 뒤 이름(세 경우) */
      const nmNow = () => R.onOf(S, 'free') ? R.nameOf('free', S) : '';
      // ① 옛 기타 → ✓ 빼기 → 빈 축사 칸 이름 → ＋
      window._freeWas = null; S.on = { free: 1 }; S.freeWhat = 'etc'; S.freeEtc = '형제 깜짝 영상편지'; opSync(); await w(150);
      await tap('free'); const e0 = (tile('free') || {}).n; await tap('free'); out.nmEtc = { before: e0, after: nmNow(), tile: (tile('free') || {}).n, w: S.freeWhat };
      // ② 흐름 줄 — 식중 영상 빼기 → 빈 줄 이름 → 다시 담기
      window._freeWas = null; R.applyExample(S, 'brief'); S.on.free = 1; S.freeWhat = 'video'; S.freeLen = '3'; opSync(); await w(150);
      try { opGoStep('listen'); mkGo('_intro'); } catch (e) { out.nmErr = e.message; } await w(600);
      const rowNm = () => { const li = document.querySelector('li.cf-r[data-k="free"]'); return li ? ((li.querySelector('.cf-nm') || {}).textContent || '') : null; };
      try { mkFlowTgl('free'); } catch (e) { out.nmErr = e.message; } await w(400); const v0 = rowNm(), v0on = !!(S.on && S.on.free);
      try { mkFlowTgl('free'); } catch (e) { out.nmErr = e.message; } await w(400); out.nmVid = { before: v0, offOk: !v0on, after: nmNow(), row: rowNm(), w: S.freeWhat };
      // ② 담지 않은 순간 — 옛 선물 lsRemove → 빈 줄 이름(_lName) · 알림 → lsAdd
      window._freeWas = null; S.on.free = 1; S.freeWhat = 'gift'; opSync(); await w(150);
      try { lsRemove('free'); } catch (e) { out.nmErr = e.message; } await w(150); const g0 = _lName('free'), gMsg = LS.msg || '';
      try { lsAdd('free'); } catch (e) { out.nmErr = e.message; } await w(150); out.nmGift = { before: g0, msg: gMsg, after: nmNow(), w: S.freeWhat };
      return out; });
    ok(W + ' [MID17_TILE] 마음의 순간 = 덕담 · 축사 · 식중 영상 · 축가 · 편지', JSON.stringify(r.heart) === JSON.stringify(['부모님 덕담', '축사', '식중 영상', '축가', '편지 낭독']), r.heart);
    ok(W + ' [MID17_TILE] 식중 영상 칸 이름 · 칸 글 두 줄 안(잘림 없음)', !!r.mv0 && r.mv0.n === '식중 영상' && /영상/.test(r.mv0.s) && r.mv0.lines >= 1 && r.mv0.lines <= 2 && r.mv0.clip <= 1, r.mv0);
    ok(W + ' [MID17_TILE] 빈 판에서 ＋ → free 담김 · 갈래 video · 식중 영상 칸만 켜짐(축사 칸 꺼짐)', r.add && r.addSt.on && r.addSt.w === 'video' && r.mv1.on && r.mv1.pressed === 'true' && !r.sp1.on && r.sp1.pressed === 'false' && r.sp1.n === '축사', { st: r.addSt, mv: r.mv1, sp: r.sp1 });
    ok(W + ' [MID17_TILE] 개수 줄 «고른 본식 순간 1/6 · 긴 순간 1/3»', r.cnt1 === '고른 본식 순간 1/6 · 긴 순간 1/3', r.cnt1);
    ok(W + ' [MID17_TILE] 영상 날 축사 ＋ → 바꿔 담기(speech) · 알림 «식중 영상 대신 축사를 담았어요»', r.toSpSt.on && r.toSpSt.w === 'speech' && r.toSpU === '식중 영상 대신 축사를 담았어요' && r.sp2.on && !r.mv2.on, { st: r.toSpSt, u: r.toSpU });
    ok(W + ' [MID17_TILE] 축사 날 식중 영상 ＋ → 되돌려 바꿔 담기(video) · 알림 «축사 대신 식중 영상을 담았어요» · 개수 그대로', r.toMvSt.on && r.toMvSt.w === 'video' && r.toMvU === '축사 대신 식중 영상을 담았어요' && r.mv3.on && !r.sp3.on && r.cnt3 === r.cnt1, { st: r.toMvSt, u: r.toMvU, c: r.cnt3 });
    ok(W + ' [MID17_TILE] 식중 영상 ✓ → 빼기(두 칸 다 꺼짐)', !r.rmSt.on && !r.mv4.on && !r.sp4.on, r.rmSt);
    ok(W + ' [MID17_TILE] 정석(6개 · 축사) + 식중 영상 = 바꿔 담기(개수 6/6 그대로 · 창 없음)', r.stdSt.on && r.stdSt.w === 'video' && r.stdCnt[0] === r.stdCnt[1] && !r.stdAsk, { st: r.stdSt, c: r.stdCnt, a: r.stdAsk });
    ok(W + ' [MID17_TILE] 가족(6개 · 축사 없음) + 식중 영상 = 막힘 «본식 순간은 6개까지예요»', !r.famSt.on && /본식 순간은 6개까지예요/.test(r.famAsk), { st: r.famSt, a: r.famAsk });
    ok(W + ' [MID17_TILE] 미리 보기 창 = 식중 영상 판(이름 · 설명 · 대표 나레이션 58 · 장면 영상 free.mp4)', !!r.pv && r.pv.t === '식중 영상' && /영상/.test(r.pv.q) && !/축하의 말/.test(r.pv.q) && !!r.pv.line && r.pv.line.text === FREE_IN && /\/free\.mp4/.test(r.pv.vid), r.pv);
    ok(W + ' [MID17_TILE] 창 «이 순간 담기» → 식중 영상 담김 · 창이 «✓ 담겨 있어요»', r.pvAddSt.on && r.pvAddSt.w === 'video' && /담겨 있어요/.test(r.pvAct2 || ''), { st: r.pvAddSt, a: r.pvAct2 });
    ok(W + ' [MID17_TILE] 영상 날 축사 칸 창 = 축사 판(안 담김 · 대표 나레이션은 축사 여는 말)', !!r.pvSp && r.pvSp.t === '축사' && /이 순간 담기/.test(r.pvSp.act || '') && !!r.pvSp.line && r.pvSp.line.text !== FREE_IN, r.pvSp);
    ok(W + ' [MID17_FREE_BACK] 옛 기타(이름 «형제 깜짝 영상편지»)를 빼고 축사 칸으로 다시 담으면 기타 그대로(이름 «준비한 순서»)', !r.fbOff.on && r.fbEtc.on && r.fbEtc.w === 'etc' && r.fbEtc.etc === '형제 깜짝 영상편지' && r.fbEtc.n === '준비한 순서', { off: r.fbOff, back: r.fbEtc });
    ok(W + ' [MID17_FREE_BACK] 칸을 지정하면 그 칸 갈래 — 기타를 빼고 식중 영상 칸 = video · 식중 영상을 빼고 축사 칸 = speech', r.fbMv.on && r.fbMv.w === 'video' && r.fbSp.on && r.fbSp.w === 'speech', { mv: r.fbMv, sp: r.fbSp });
    ok(W + ' [MID17_FREE_BACK] 식중 영상을 빼고 ② «담지 않은 순간»에서 다시 담으면 식중 영상 그대로', !r.fbErr && r.fbLs.on && r.fbLs.w === 'video', { ls: r.fbLs, e: r.fbErr });
    ok(W + ' [MID17_FREE_BACK] 누르기 전 이름 = 담긴 이름 · ① 옛 기타를 빼면 빈 칸이 «준비한 순서» → ＋ = «준비한 순서»(기타)', r.nmEtc.before === '준비한 순서' && r.nmEtc.after === '준비한 순서' && r.nmEtc.tile === '준비한 순서' && r.nmEtc.w === 'etc', r.nmEtc);
    ok(W + ' [MID17_FREE_BACK] 누르기 전 이름 = 담긴 이름 · ② 흐름에서 식중 영상을 빼면 빈 줄 «식중 영상» → 다시 담기 = 식중 영상', !r.nmErr && r.nmVid.offOk && r.nmVid.before === '식중 영상' && r.nmVid.after === '식중 영상' && r.nmVid.row === '식중 영상' && r.nmVid.w === 'video', { v: r.nmVid, e: r.nmErr });
    ok(W + ' [MID17_FREE_BACK] 누르기 전 이름 = 담긴 이름 · ② 옛 선물을 빼면 빈 줄 «준비한 순서»(알림도 «준비한 순서»·«담지 않은 순간») → 담기 = 선물', r.nmGift.before === '준비한 순서' && /«준비한 순서»를 뺐어요/.test(r.nmGift.msg) && /담지 않은 순간/.test(r.nmGift.msg) && r.nmGift.after === '준비한 순서' && r.nmGift.w === 'gift', r.nmGift);
    ok(W + ' [MID17_FREE_BACK] 식중 영상을 뺀 날 ① 축사 칸은 «축사»로 보이고 «축사»로 담긴다(칸 지정이 이긴다)', r.fbSp.n === '축사' && r.fbSp.w === 'speech', r.fbSp);
    ok(W + ' [MID17_FREE_BACK] 이번 방문에 뺀 적 없으면 축사 칸은 늘 축사(SPEECH_TILE_1012 · 남은 freeWhat video 무시)', r.fbFirst.on && r.fbFirst.w === 'speech', r.fbFirst);
    if (SHOT) { await pg.evaluate(async () => { S.on = { bless: 1, free: 1, song: 1 }; S.freeWhat = 'video'; opSync(); }); await wait(400);
      const h = await pg.$('.pk-act:nth-of-type(3)'); fs.mkdirSync(SHOT, { recursive: true }); if (h) { await h.scrollIntoViewIfNeeded(); await wait(500); await h.screenshot({ path: path.join(SHOT, `pick-heart-${W}.png`) }); } }

    /* ② 하나씩 만들기 — 식중 영상 칸 · 시간 */
    const q = await pg.evaluate(async () => { const R = RitualOpen, out = {}, w = (ms) => new Promise((x) => setTimeout(x, ms));
      R.applyExample(S, 'brief'); S.on.free = 1; S.freeWhat = 'video'; S.freeLen = '3'; opSync(); await w(200);
      try { opGoStep('listen'); mkGo('free'); } catch (e) { out.err = e.message; } await w(700);
      const head = document.getElementById('mkHead') || document.querySelector('.mk h3, .mk h2');
      out.head = head ? head.textContent : ''; const fl = document.querySelector('[data-fk="freelen"]');
      out.my = ((document.querySelector('.mk-pvmy') || {}).textContent || '').replace(/\s+/g, ' ').trim();   /* [VIDEO_NAME_1114] «어디서 준비하나» 한 덩어리 */
      out.len = !!fl; out.note = fl ? ((fl.closest('.ls-cg') || {}).textContent || '') : '';
      out.what = [...document.querySelectorAll('.ls-cg .gl')].map((e) => e.textContent);
      out.gift = /깜짝 선물/.test((document.querySelector('.mk') || document.body).textContent);
      const big = () => { const sp = R.span(S); return { body: sp.body, photo: sp.photo, sum: sp.tb + sp.tm + sp.pm + sp.pa, hi: R.bodySec(S)[1] }; };
      out.t = {}; for (const L of [1, 5, 10]) { document.querySelectorAll('.ord-ask').forEach((e) => e.remove()); lsFreeLen(L); await w(150); const a = document.querySelector('.ord-ask'); out.t[L] = Object.assign({ v: S.freeLen, ask: a ? a.textContent : '' }, big()); if (a) { const y = a.querySelector('button'); if (y) y.click(); } }
      /* 같은 셈 — 엔진에 바로 넣은 값과 길이 칸으로 바꾼 값이 같은가 */
      const T2 = JSON.parse(JSON.stringify(S)); T2.freeLen = '5'; lsFreeLen(5); await w(150); out.same = JSON.stringify(R.span(T2)) === JSON.stringify(R.span(S));
      /* 정석 + 식중 영상 3분 → 10분은 상한 밖 → 막힘 */
      R.applyExample(S, 'standard'); S.freeWhat = 'video'; S.freeLen = '3'; opSync(); await w(150); document.querySelectorAll('.ord-ask').forEach((e) => e.remove()); lsFreeLen(10); await w(150); out.cap = { v: S.freeLen, ask: (document.querySelector('.ord-ask') || {}).textContent || '' };
      document.querySelectorAll('.ord-ask').forEach((e) => e.remove());
      /* ③ 한눈에 보기 · 보낼 것 — 식중 영상 날 옛 «준비한 순서 영상(휴대폰…)» · «준비한 순서 파일» 없음 */
      R.applyExample(S, 'brief'); S.on.free = 1; S.freeWhat = 'video'; S.freeLen = '3'; opSync(); await w(150);
      out.prep = JSON.stringify((R.prepOf('free', S) || [])); try { mkGo('_sum'); } catch (e) {} await w(500); const tx = document.body.innerText;   /* 보이는 글만(본문 안 스크립트 글은 빼고) */
      out.sum = { old: /준비한 순서 영상\(휴대폰/.test(tx), file: /준비한 순서 파일/.test(tx) };
      return out; });
    ok(W + ' [MID17_LEN] ② 머리 «식중 영상» · 길이 칸(1 ~ 10분) · 택1 한 줄 · 무엇을 줄 없음', /식중 영상/.test(q.head) && q.len && /축사와 같은 자리라 둘 중 하나만 담을 수 있어요/.test(q.note) && !q.what.includes('무엇을') && !q.gift, q);
    ok(W + ' [MID17_TIME] ② 길이 칸 1 · 5 · 10분 → 본식 · 단체 사진 띠가 바뀌고 합은 늘 40분(' + [1, 5, 10].map((L) => L + '분 본식 ' + (q.t[L] || {}).body + ' · 사진 ' + (q.t[L] || {}).photo).join(' | ') + ')',
      [1, 5, 10].every((L) => q.t[L] && q.t[L].v === String(L) && !q.t[L].ask && q.t[L].sum === 40) && q.t[5].hi - q.t[1].hi === 240 && q.t[10].hi - q.t[5].hi === 300, q.t);
    ok(W + ' [MID17_TIME] 길이 칸으로 바꾼 값 = 엔진에 바로 넣은 값(같은 셈)', q.same);
    ok(W + ' [VIDEO_NAME_1114] ② 식중 영상 칸 아래 «식중 영상 · 기한 · 마이페이지 «식중 영상»에서 준비해요»(식전 영상과 같은 한 덩어리)', /^식중 영상/.test(q.my) && /예식 7일 전/.test(q.my) && /마이페이지 «?식중 영상»?에서 준비해요/.test(q.my), q.my);
    ok(W + ' [MID17_TIME] 정석 + 식중 영상 10분 = 40분 예산 밖 → 막힘(길이 그대로 3분)', q.cap.v === '3' && /이 길이로 하려면/.test(q.cap.ask), q.cap);
    ok(W + ' [MID17_PREP] 식중 영상 날 준비 목록 빈 칸 · 한눈에 보기에 옛 «준비한 순서 영상(휴대폰…)» · «준비한 순서 파일» 없음', q.prep === '[]' && !q.sum.old && !q.sum.file, { p: q.prep, s: q.sum });
    if (SHOT) { await pg.evaluate(async () => { const R = RitualOpen; R.applyExample(S, 'brief'); S.on.free = 1; S.freeWhat = 'video'; S.freeLen = '5'; opSync(); try { mkGo('free'); } catch (e) {} }); await wait(800);
      const f = await pg.$('[data-fk="freelen"]'); if (f) { await f.scrollIntoViewIfNeeded(); await pg.evaluate(() => window.scrollBy(0, -260)); await wait(400); } await pg.screenshot({ path: path.join(SHOT, `listen-midvideo-${W}.png`) }); }
    ok(W + ' 페이지 오류 0(고르기 · ②)', !errs.length, errs.slice(0, 3));
    await ctx.close();

    /* at:'midvideo' — 담긴 초안 → ② 식중 영상 칸 · 안 담긴 초안 → ① 식중 영상 칸 깜빡 */
    for (const on of [true, false]) {
      const E = await page(W); const DS = ex('brief'); if (on) { DS.on.free = 1; DS.freeWhat = 'video'; DS.freeLen = '4'; }
      await E.pg.goto(`http://127.0.0.1:${port}/__harness.html`, { waitUntil: 'load' });
      await E.pg.evaluate(([d]) => { H.draft = { S: d }; H.at = 'midvideo'; go(); }, [DS]);
      let f = null; for (let i = 0; i < 60 && !f; i++) { await wait(200); f = E.pg.frames().find((x) => /order-preview\.html/.test(x.url())); }
      let a = null;
      if (f) { await f.waitForFunction(() => window.render && typeof STEPS !== 'undefined', null, { timeout: 20000 }).catch(() => {}); await wait(400);
        const seen = await f.evaluate(async () => { const w = (ms) => new Promise((x) => setTimeout(x, ms)); let fl = false; for (let i = 0; i < 12; i++) { const t = document.querySelector('.pk-tile.pk-flash'); if (t && t.querySelector('[data-fk="pto:midvid"]')) fl = true; await w(100); } return fl; });
        a = await f.evaluate((fl) => ({ step: STEPS[idx] && STEPS[idx].k, at: (typeof _mkState === 'function' ? _mkState().at : ''), len: !!document.querySelector('[data-fk="freelen"]'), flash: fl, on: !!(S.on && S.on.free), w: S.freeWhat }), seen); }
      if (on) ok(W + ' [MID17_AT] at:\'midvideo\' · 식중 영상 담김 → ② 식중 영상 칸(길이 칸 보임)', !!a && a.step === 'listen' && a.at === 'free' && a.len && a.w === 'video', a);
      else ok(W + ' [MID17_AT] at:\'midvideo\' · 안 담김 → ① 고르기 · 식중 영상 칸 깜빡(담지는 않는다)', !!a && a.step === 'pick' && a.flash && !a.on, a);
      ok(W + ' [MID17_AT] 페이지 오류 0(' + (on ? '담김' : '안 담김') + ')', !E.errs.length, E.errs.slice(0, 3));
      await E.ctx.close();
    }
  }
} catch (e) { console.log('FAIL 예외', e && e.stack || e); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nMID17 PICK FAIL ${fail}` : '\nMID17 PICK OK'); process.exit(fail ? 1 : 0);
