#!/usr/bin/env node
/* ★★[MID17_PICK 2026-11-07 재검증 재수정 · 사장님 «마음의 순간에 식중 영상 칸을 따로 하나»] MID17 줄 1 · 2 — 식순 고르기 · 시간
   ★★[SPEECH_SONG_1115 2026-11-15 대표님 23:05] ① «축사 · 축가»는 한 카드 · 둘 중 하나(S.on.free 와 S.on.song 은 함께 켜지지 않는다 · RitualOpen.pairSet · pairOf · opPair)
     ② «식중 영상»은 따로 넣고 빼는 순간 midvid(S.on.midvid · 길이 S.midLen) — 축사나 축가와 함께 담는다 · 차례 덕담 → 축사 → 축가 → 식중 영상 → 편지
     ③ 옛 초안 free + video → midvid · 축사 + 축가 둘 다 → 축가만(RitualOpen.midMigrate · 엔진 norm · 빌더가 초안을 읽을 때) ④ 정석 예시 = 축가만
     ⑤ 빌더 ① 마음의 순간 = 부모님 덕담 · 축사 · 축가(한 카드) · 식중 영상 · 편지 낭독 = 4장
     옛 기대는 은퇴(RULES_SLIM_1107 ⑧) — 식중 영상 = free 칸의 영상 갈래 · 축사 ↔ 식중 영상 바꿔 담기(MID_SWAP · _mvSwap · 알림 «축사 대신 식중 영상을 담았어요») ·
     ② «축사와 같은 자리라 둘 중 하나만 담을 수 있어요» 한 줄 · 이번 방문에 뺀 갈래 되담기(MID17_FREE_BACK) · 정석에 축사 · 마음의 순간 다섯 칸
   엔진 몫(이름 · 둘 중 하나 · 옮기기 · 준비 목록 · 시간)은 node 로 · 화면 몫은 Playwright(폭 390 · 360) —
   ① 카드 넷 · 식중 영상 칸 담기 · 빼기(축사 · 축가와 상관없이) · 축사 · 축가 카드(＋ = 축사 · 고르기 칩 · 바꾸기 알림 20자 안 · ✓ = 빼기) · 개수 줄 ·
   opTgl · opPair · lsAdd · lsUndo 네 길 모두 둘 중 하나 · 미리 보기 창(식중 영상 판 · 축사 · 축가 판 «누가 하나요?» · 담기 · 바꾸기) ·
   ② 식중 영상 길이 칸(midLen · 택1 한 줄 없음) · 시간 띠 · 40분 상한 · at:'midvideo' 두 경우 · 옛 초안 두 꼴을 빌더가 옮긴다 · 페이지 오류 0
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
const J = (o) => JSON.parse(JSON.stringify(o));

/* ── 엔진(node) ── */
const O = (() => { const sb = { console }; sb.window = sb; sb.self = sb; vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets/ritual-data.js'), 'utf8'), sb); vm.runInContext(fs.readFileSync(OPEN_SRC, 'utf8'), sb); return sb.RitualOpen; })();
const ex = (k) => { const S = O.applyExample({ course: 'open' }, k); S.course = 'open'; return S; };
const mv = (S, L) => { const t = J(S); t.on = t.on || {}; t.on.midvid = 1; if (L) t.midLen = String(L); return t; };
const keys = (S) => Object.keys((S && S.on) || {}).filter((k) => S.on[k]).sort().join(',');
try {
  const V = mv({ course: 'open', on: {} }, 3);
  ok('[MID17_NAME · SPEECH_SONG_1115] 식중 영상 = 따로 넣고 빼는 순간 midvid — 이름 «식중 영상» · chipLabel «식중 영상 · 3분» · ORDER 에서 축가 뒤 · 편지 앞 · 축사 칸 칩에 영상 갈래 없음',
    O.nameOf('midvid', V) === '식중 영상' && O.chipLabel('midvid', V) === '식중 영상 · 3분' && O.ORDER.indexOf('song') + 1 === O.ORDER.indexOf('midvid') && O.ORDER.indexOf('midvid') + 1 === O.ORDER.indexOf('letter') && !O.CHIPS.free.some((c) => c[0] === 'video'),
    [O.nameOf('midvid', V), O.chipLabel('midvid', V), O.ORDER.join(','), O.CHIPS.free.map((c) => c[0])]);
  /* ★[SHOW_PAIR_1116 · RULES_SLIM ⑧] 옛 기대 «옛 초안 선물 · 기타는 «준비한 순서» 그대로» → 선물 · 기타 칩은 걷혔다(상담 메모 · 옛 초안은 midMigrate 가 끈다) · 새 갈래 축하 공연(stage) */
  ok('[MID17_NAME · SHOW_PAIR_1116] 축사는 «축사» · 축하 공연은 «축하 공연» · 칩 = 축사 · 축하 공연(선물 · 기타 없음)', O.nameOf('free', { course: 'open', on: { free: 1 }, freeWhat: 'speech' }) === '축사' && O.nameOf('free', { course: 'open', on: { free: 1 }, freeWhat: 'stage' }) === '축하 공연' && O.CHIPS.free.map((c) => c[0]).join(',') === 'speech,stage', O.CHIPS.free);
  ok('[MID17_NAME] 식중 영상 칸 글 · ② 머리 한 줄이 영상 글(축사 글이 아니게)', /영상/.test(O.tileOf('midvid', V)) && /영상/.test(O.oneOf('midvid', V)) && !/축하의 말/.test(O.tileOf('midvid', V) + O.oneOf('midvid', V)), [O.tileOf('midvid', V), O.oneOf('midvid', V)]);
  const pr = O.prepOf('midvid', V);
  ok('[MID17_PREP] 준비 목록 — 식중 영상은 빈 목록(마이페이지가 받는다 · 식전 영상과 같은 결정)', Array.isArray(pr) && pr.length === 0, pr);
  ok('[MID17_PREP] 옛 할 일 «준비한 순서 영상(휴대폰으로 가로로 찍은 영상» 문장이 ritual-open 에 없다', !/'준비한 순서 영상\(휴대폰/.test(fs.readFileSync(OPEN_SRC, 'utf8')));
  ok('[SPEECH_SONG_1115] 식중 영상은 개수 하나 · 긴 순간 하나(축사 · 축가 · 덕담 · 편지 · 인사와 같은 셈)', O.CNT_PICK.indexOf('midvid') > -1 && O.CNT_LONG.midvid === 1 && JSON.stringify(O.countOf(V)) === JSON.stringify({ n: 1, long: 1, max: 6, longMax: 3 }), O.countOf(V));
  /* [SPEECH_SONG_1115] 둘 중 하나 — pairSet · pairOf(식중 영상은 건드리지 않는다) */
  { const a = O.pairSet({ on: { midvid: 1, song: 1 }, freeWhat: 'gift' }, 'free'), b = O.pairSet({ on: { midvid: 1, free: 1 }, freeWhat: 'speech' }, 'song'), c = O.pairSet({ on: { midvid: 1, free: 1, song: 1 } }, '');
    ok('[SPEECH_SONG_1115] pairSet — 축사를 고르면 축가가 빠지고(갈래는 축사) · 축가를 고르면 축사가 빠지고 · 빈 값은 둘 다 뺀다 · 식중 영상은 그대로',
      keys(a) === 'free,midvid' && a.freeWhat === 'speech' && keys(b) === 'midvid,song' && keys(c) === 'midvid', [keys(a), a.freeWhat, keys(b), keys(c)]);
    const st = O.pairSet({ on: { midvid: 1, song: 1 } }, 'stage');
    ok('[SHOW_PAIR_1116] pairSet · pairOf 셋째 갈래 — 공연(stage)을 고르면 축가가 빠지고 free 칸이 축하 공연으로 · pairOf = stage · 식중 영상 그대로', keys(st) === 'free,midvid' && st.freeWhat === 'stage' && O.pairOf(st) === 'stage' && O.pairOf({ on: { free: 1 }, freeWhat: 'dance' }) === 'stage' && O.PAIR.join(',') === 'free,song,stage', [keys(st), st.freeWhat, O.pairOf(st), O.PAIR]);
    ok('[SPEECH_SONG_1115] pairOf — 담긴 쪽(축가 · 축사) · 안 담겼으면 빈 값 · 옛 선물 · 기타 칸은 축사가 아니다', O.pairOf({ on: { song: 1 } }) === 'song' && O.pairOf({ on: { free: 1 }, freeWhat: 'speech' }) === 'free' && O.pairOf({ on: { midvid: 1 } }) === '' && O.pairOf({ on: { free: 1 }, freeWhat: 'gift' }) === '',
      [O.pairOf({ on: { song: 1 } }), O.pairOf({ on: { free: 1 }, freeWhat: 'speech' }), O.pairOf({ on: { midvid: 1 } }), O.pairOf({ on: { free: 1 }, freeWhat: 'gift' })]); }
  /* [SPEECH_SONG_1115] 옛 초안 옮기기 — midMigrate */
  { const m = (S) => O.midMigrate(J(S));
    const a = m({ course: 'open', on: { bless: 1, free: 1 }, freeWhat: 'video', freeLen: '5' }), b = m({ course: 'open', on: { free: 1, song: 1 }, freeWhat: 'video', freeLen: '7' }),
      c = m({ course: 'open', on: { free: 1, song: 1 }, freeWhat: 'speech' }), d = m({ course: 'open', on: { free: 1, song: 1 }, freeWhat: 'gift' }),
      e = m({ course: 'open', on: { free: 1, midvid: 1 }, freeWhat: 'speech', midLen: '2' }), f = m({ course: 'open', on: { free: 1 }, freeWhat: 'video' }), g = m(a),
      h = m({ course: 'open', on: { free: 1, bless: 1 }, freeWhat: 'etc' }), i = m({ course: 'open', on: { free: 1, song: 1 }, freeWhat: 'stage' }), j = m({ course: 'open', on: { free: 1 }, freeWhat: 'show' });   /* [SHOW_PAIR_1116] */
    ok('[SPEECH_SONG_1115] midMigrate — 옛 free + video → 식중 영상(midvid · 길이 freeLen → midLen) · free 는 빠지고 갈래는 축사로',
      keys(a) === 'bless,midvid' && a.midLen === '5' && a.freeWhat === 'speech' && keys(b) === 'midvid,song' && b.midLen === '7' && keys(f) === 'midvid' && O.chipOf('midLen', f) === '3', [keys(a), a.midLen, a.freeWhat, keys(b), b.midLen, keys(f), f.midLen]);
    /* ★[SHOW_PAIR_1116 · RULES_SLIM ⑧] 옛 기대 «옛 선물 · 기타는 축가와 함께 둔다(free,song · gift)» → 선물 · 기타 = 상담 메모 · 옛 초안은 free 를 끄고 갈래는 축사로 · 둘이 켜진 옛 초안(축하 공연 + 축가도)은 축가를 남긴다 · 공연만은 그대로 */
    ok('[SPEECH_SONG_1115 · SHOW_PAIR_1116] midMigrate — 축사 + 축가 둘 다 담은 옛 초안은 축가만 · 옛 선물 · 기타는 꺼진다(갈래 축사) · 공연 + 축가도 축가만 · 공연만은 그대로 · 새 꼴(축사 + 식중 영상)은 그대로 · 두 번 돌려도 같다',
      keys(c) === 'song' && keys(d) === 'song' && d.freeWhat === 'speech' && keys(h) === 'bless' && h.freeWhat === 'speech' && keys(i) === 'song' && keys(j) === 'free' && O.pairOf(j) === 'stage' && keys(e) === 'free,midvid' && e.midLen === '2' && JSON.stringify(g) === JSON.stringify(a), [keys(c), keys(d), d.freeWhat, keys(h), keys(i), keys(j), keys(e), JSON.stringify(g) === JSON.stringify(a)]); }
  /* 시간 — 60 × 분 + 8 · 본식 · 단체 사진 띠가 그만큼 · 40분 안 */
  const b = ex('brief'), rows = [1, 5, 10].map((L) => { const t = mv(b, L), sp = O.span(t); return { L, p: O.partsOf('midvid', t), hi: O.bodySec(t)[1], sp, sum: sp.tb + sp.tm + sp.pm + sp.pa, txt: O.spanText(t) }; });
  ok('[MID17_TIME] 영상 몫 = 60 × 분 + 8(1 · 5 · 10분 → 68 · 308 · 608초 · midLen)', rows.every((r) => r.p[2] === 60 * r.L + 8), rows.map((r) => r.p));
  ok('[MID17_TIME] 본식 · 단체 사진 띠가 midLen 만큼 바뀐다 · 본식 + 단체 사진 = 40분(' + rows.map((r) => r.L + '분 ' + r.txt).join(' | ') + ')', rows[1].hi - rows[0].hi === 240 && rows[2].hi - rows[1].hi === 300 && rows.every((r) => r.sum === O.DAYMIN) && rows[0].sp.pb > rows[1].sp.pb && rows[1].sp.pb > rows[2].sp.pb, rows.map((r) => [r.hi, r.sum]));
  const st = ex('standard'), st10 = mv(st, 10), st3 = mv(st, 3);
  ok('[MID17_TIME · SPEECH_SONG_1115] 정석(축가 · 5개) + 식중 영상 3분 = 6개 · 상한 안 · 10분은 상한 밖(capOver)', O.countOf(st3).n === 6 && !O.capOver(st, st3) && O.capOver(st, st10) && O.bodySec(st10)[1] > O.capSec(st10), [O.countOf(st3), O.bodySec(st3)[1], O.bodySec(st10)[1], O.capSec(st10)]);
  ok('[SPEECH_SONG_1115] 예시 넷 — 정석은 축가만(축사 없음) · 축사 · 식중 영상은 어느 예시에도 없다 · 축사 · 축가를 함께 담은 예시 0 · 넷 다 6개/3개 안',
    O.onOf(ex('standard'), 'song') && !O.onOf(ex('standard'), 'free') && O.EXAMPLES.every((e) => { const S = ex(e.k), c = O.countOf(S); return !O.onOf(S, 'free') && !O.onOf(S, 'midvid') && !(O.onOf(S, 'free') && O.onOf(S, 'song')) && c.n <= 6 && c.long <= 3; }),
    O.EXAMPLES.map((e) => e.k + '=' + keys(ex(e.k))));
} catch (e) { ok('엔진 예외(옛 판이면 새 함수가 없다)', false, String(e && e.message)); }

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
/* 식중 영상 칸 창 대표 나레이션 = 엔진이 식중 영상 자리에서 처음 내는 줄(★[NARR_ROLE_1115] 353 · 옛 58 «다음은 오늘 예식에서 …»은 은퇴) — 창이 손으로 옮겨 적지 않고 엔진과 같은 글을 내는가 */
const MID_OLD58 = '다음은 오늘 예식에서 두 사람이 가장 마음을 쏟아 준비한 순서입니다.';
async function page(W) {
  const ctx = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: true }); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text()); });
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  return { ctx, pg, errs };
}
async function harness(W, DS, at) {   /* 마이페이지가 초안을 넣어 여는 길(orderFill) — 빌더가 초안을 읽을 때 midMigrate */
  const E = await page(W);
  await E.pg.goto(`http://127.0.0.1:${port}/__harness.html`, { waitUntil: 'load' });
  await E.pg.evaluate(([d, a]) => { H.draft = { S: d }; H.at = a; go(); }, [DS, at]);
  let f = null; for (let i = 0; i < 60 && !f; i++) { await wait(200); f = E.pg.frames().find((x) => /order-preview\.html/.test(x.url())); }
  let a = null;
  if (f) { await f.waitForFunction(() => window.render && typeof STEPS !== 'undefined', null, { timeout: 20000 }).catch(() => {}); await wait(400);
    const seen = await f.evaluate(async () => { const w = (ms) => new Promise((x) => setTimeout(x, ms)); let fl = false; for (let i = 0; i < 12; i++) { const t = document.querySelector('.pk-tile.pk-flash'); if (t && t.querySelector('[data-fk="pto:midvid"]')) fl = true; await w(100); } return fl; });
    await wait(500);
    a = await f.evaluate((fl) => ({ step: STEPS[idx] && STEPS[idx].k, at: (typeof _mkState === 'function' ? _mkState().at : ''), len: !!document.querySelector('[data-fk="midlen"]'), flash: fl,
      on: Object.keys(S.on || {}).filter((k) => S.on[k]).sort().join(','), fw: S.freeWhat, ml: S.midLen || '' }), seen); }
  await E.ctx.close(); return { a, errs: E.errs };
}
try {
  for (const W of [390, 360]) {
    const { ctx, pg, errs } = await page(W);
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(900);
    const r = await pg.evaluate(async () => { const R = RitualOpen, out = {}, w = (ms) => new Promise((x) => setTimeout(x, ms));
      const on = () => Object.keys(S.on || {}).filter((k) => S.on[k]).sort().join(',');
      const tile = (k) => { const b = document.querySelector('[data-fk="pto:' + k + '"]'), t = b && b.closest('.pk-tile'); if (!t) return null;
        const s = t.querySelector('.pk-s'), lh = s ? parseFloat(getComputedStyle(s).lineHeight) || 0 : 0, sel = t.querySelector('.pk-sel');
        return { n: (t.querySelector('.pk-n') || {}).textContent || '', s: s ? s.textContent : '', lines: s && lh ? Math.round(s.getBoundingClientRect().height / lh) : 0, clip: s ? s.scrollHeight - s.clientHeight : 0,
          on: t.classList.contains('on'), pressed: sel ? sel.getAttribute('aria-pressed') : '', chips: [...t.querySelectorAll('.pk-pc')].map((b) => b.textContent + (b.getAttribute('aria-checked') === 'true' ? '*' : '')).join('|') }; };
      const heart = () => { const s = [...document.querySelectorAll('.pk-act')].find((a) => /마음의 순간/.test(a.textContent)); return s ? [...s.querySelectorAll('.pk-tile')].map((t) => { const n = t.querySelector('.pk-n'); if (n) return n.textContent; const p = t.querySelector('.pk-pair'); return p ? [...p.querySelectorAll('.pk-pc')].map((b) => b.textContent).join(' · ') : '?'; }) : []; };
      const undo = () => { const u = document.getElementById('pkUndo'); return u && !u.hidden ? u.textContent : ''; };
      const ask = () => { const d = document.querySelector('.ord-ask'); const t = d ? d.textContent : ''; const y = document.querySelector('.ord-ask button'); if (y) y.click(); return t; };
      const cnt = () => (document.querySelector('[data-fk="pkcnt:pk"]') || {}).textContent || '';
      const tap = async (k) => { document.querySelectorAll('.ord-ask').forEach((e) => e.remove()); const b = document.querySelector('[data-fk="opt:' + k + '"]'); if (!b) return false; b.click(); await w(250); return true; };
      const chip = async (x) => { document.querySelectorAll('.ord-ask').forEach((e) => e.remove()); const b = document.querySelector('[data-fk="pair:' + x + '"]'); if (!b) return false; b.click(); await w(250); return true; };
      const call = async (fn) => { try { fn(); } catch (e) { out.err = (out.err || '') + e.message + ' | '; } await w(200); };
      try { opGoStep('pick'); } catch (e) {} S.on = {}; S.freeWhat = 'speech'; opSync(); await w(400);
      out.heart = heart(); out.mv0 = tile('midvid'); out.pr0 = tile('free'); out.cnt0 = cnt();
      /* 식중 영상 ＋ — 축사 · 축가와 상관없이 */
      out.add = await tap('midvid'); out.s1 = on(); out.mv1 = tile('midvid'); out.pr1 = tile('free'); out.cnt1 = cnt();
      /* ★[PAIR_PLUS_PV_1115] 고른 게 없을 때 카드 ＋ = 고르기 창(축사 담기 · 축가 담기) — 저희가 축사를 미리 골라 담지 않는다 */
      await tap('free'); await w(600); out.plus = { s: on(), pv: (typeof PV !== 'undefined' && PV.k) || '', act: ((document.querySelector('#pvSheet #pvAct') || {}).textContent || '') }; try { opPvClose(); } catch (e) {} await w(300);
      /* 고르기 칩 «축사» = 축사 담기(식중 영상은 그대로) */
      await chip('free'); out.s2 = on(); out.fw2 = S.freeWhat; out.pr2 = tile('free'); out.mv2 = tile('midvid'); out.cnt2 = cnt();
      /* 고르기 칩 «축가» → 바꾸기(개수 그대로 · 알림) */
      await chip('song'); out.s3 = on(); out.u3 = undo(); out.pr3 = tile('free'); out.cnt3 = cnt();
      await chip('free'); out.s4 = on(); out.u4 = undo(); out.pr4 = tile('free');
      /* [SHOW_PAIR_1116] 칩 «공연» → 바꾸기(free 칸이 축하 공연으로 · 식중 영상 그대로) → 칩 «축사»로 되돌림 */
      await chip('stage'); out.s4b = on(); out.fw4b = S.freeWhat; out.u4b = undo(); out.pr4b = tile('free'); await chip('free'); out.fw4c = S.freeWhat;
      /* ✓ = 담긴 쪽 빼기(식중 영상은 그대로) */
      await tap('free'); out.s5 = on(); out.pr5 = tile('free');
      /* 담기 전 칩 «축가» = 축가 담기(바꾸기 알림 없음) */
      await chip('song'); out.s6 = on(); out.u6 = undo(); out.pr6 = tile('free');
      /* 식중 영상 ✓ = 빼기(축가는 그대로) */
      await tap('midvid'); out.s7 = on(); out.mv7 = tile('midvid');
      out.swap = (typeof PN !== 'undefined' && typeof PN_O !== 'undefined') ? ['free', 'song', 'stage'].flatMap((a) => ['free', 'song', 'stage'].filter((b) => b !== a).map((b) => PN[a] + ' 대신 ' + PN_O[b] + ' 담았어요')) : null;   /* ★[SHOW_PAIR_1116] 옛 PAIR_SWAP 표(둘) → opPair · opTgl 이 같은 꼴로 만드는 여섯 */
      /* 네 길 — ② 흐름(opTgl) · 고르기(opPair) · ② 다시 담기(lsAdd) · 되돌리기(lsUndo) */
      S.on = { bless: 1, song: 1, midvid: 1 }; opSync(); await w(150);
      await call(() => opTgl('free')); out.p1 = [on(), S.freeWhat];
      await call(() => opTgl('song')); out.p2 = on();
      await call(() => opPair('free')); out.p3 = on();
      await call(() => opPair('song')); out.p4 = on();
      await call(() => lsAdd('free')); out.p5 = on();
      await call(() => lsAdd('song')); out.p6 = on();
      S.on = { bless: 1, song: 1 }; opSync(); await w(150); await call(() => lsRemove('song')); S.on.free = 1; S.freeWhat = 'speech'; await call(() => lsUndo()); out.p7 = on();
      /* 정석(축가 · 5개) + 식중 영상 = 담김(6/6 · 3/3 · 창 없음) · 가족(6개) + 식중 영상 = 막힘 · 가족 카드 칩 «축사» = 바꾸기(개수 그대로 · 창 없음) */
      R.applyExample(S, 'standard'); opSync(); await w(200); out.std0 = cnt(); await tap('midvid'); out.std = { s: on(), c: cnt(), a: ask() };
      R.applyExample(S, 'family'); opSync(); await w(200); out.fam0 = cnt(); await tap('midvid'); out.fam = { s: on(), a: ask() };
      await chip('free'); out.famSw = { s: on(), c: cnt(), u: undo(), a: ask() };
      /* 미리 보기 창 — 식중 영상 판 */
      S.on = {}; S.freeWhat = 'speech'; opSync(); await w(200);
      const cl = (q) => { const e = document.querySelector(q); if (e) e.click(); return !!e; };   /* 옛 판(selftest)엔 칸이 없다 — 멈추지 않고 빨강으로 센다 */
      const pvOf = () => { const pv = document.getElementById('pvSheet'); if (!pv) return null; const wd = pv.querySelector('#pvWho');
        return { t: (pv.querySelector('#pvT') || {}).textContent, q: (pv.querySelector('#pvQ') || {}).textContent, line: (typeof _pvLine === 'function' && _pvLine(PV.k)) || null, act: (pv.querySelector('#pvAct') || {}).textContent,
          who: wd && !wd.hidden ? (pv.querySelector('#pvWhoT') || {}).textContent : null, sw: (() => { const e = pv.querySelector('#pvSw'); return e && !e.hidden ? [...e.querySelectorAll('button')].map((b) => b.textContent).join('|') : ''; })(), vid: (() => { const v = pv.querySelector('#pvM video'); return v ? v.getAttribute('src') || '' : ''; })() }; };
      const pvBtn = async (re) => { const pv = document.getElementById('pvSheet'), b = pv && [...pv.querySelectorAll('#pvAct button')].find((x) => re.test(x.textContent)); if (b) b.click(); await w(400); return !!b; };
      try { const g = (typeof engine === 'function') ? await engine() : ENG; out.mvIn = ((g.RitualCue.build({ course: 'open', on: { midvid: 1 }, midLen: '3' }, { mode: 'preview' }).cues || []).find((c) => c.k === 'midvid') || {}).text || ''; } catch (e) { out.mvIn = ''; }
      cl('[data-fk="pto:midvid"]'); await w(1500); out.pv = pvOf();
      await pvBtn(/이 순간 담기/); out.pvAdd = { s: on(), act: (pvOf() || {}).act };
      try { opPvClose(); } catch (e) {} await w(300);
      /* 미리 보기 창 — 축사 · 축가 판(안 담김 → 축가 담기 → 축사로 바꾸기) */
      S.on = { midvid: 1 }; opSync(); await w(200);
      cl('[data-fk="pto:free"]'); await w(1500); out.pvP0 = pvOf();
      await pvBtn(/^축가 담기$/); out.pvP1 = Object.assign({ s: on() }, pvOf());
      cl('[data-fk="pvsw:free"]'); await w(700); out.pvP1b = pvOf();   /* ★[SHOW_PAIR_1116] 담긴 쪽을 보는 동안엔 «바꾸기»가 없다 — 보기를 축사로 옮기면 «축사로 바꾸기» */
      await pvBtn(/축사로 바꾸기/); out.pvP2 = Object.assign({ s: on(), u: undo() }, pvOf());
      try { opPvClose(); } catch (e) {} await w(300);
      return out; });
    ok(W + ' [SPEECH_SONG_1115] 마음의 순간 = 부모님 덕담 · 축사 · 축가(한 카드) · 식중 영상 · 편지 낭독 = 4장', JSON.stringify(r.heart) === JSON.stringify(['부모님 덕담', '축사 · 축가 · 공연', '식중 영상', '편지 낭독'])   /* [SHOW_PAIR_1116] 옛 '축사 · 축가' */, r.heart);
    ok(W + ' [MID17_TILE] 식중 영상 칸 이름 · 칸 글 두 줄 안(잘림 없음)', !!r.mv0 && r.mv0.n === '식중 영상' && /영상/.test(r.mv0.s) && r.mv0.lines >= 1 && r.mv0.lines <= 2 && r.mv0.clip <= 1, r.mv0);
    ok(W + ' [SPEECH_SONG_1115] 축사 · 축가 카드 — 담기 전엔 고르기 칩 둘 다 안 눌린 모양 · ＋(안 눌림) · 칸 글 두 줄 안', !!r.pr0 && r.pr0.chips === '축사|축가|공연' && !r.pr0.on && r.pr0.pressed === 'false' && r.pr0.lines >= 1 && r.pr0.lines <= 2 && r.pr0.clip <= 1, r.pr0);
    ok(W + ' [SPEECH_SONG_1115] 식중 영상 ＋ → midvid 만 담김(축사 · 축가 카드는 그대로 안 담김) · 개수 «1/6 · 1/3»', r.add && r.s1 === 'midvid' && r.mv1.on && r.mv1.pressed === 'true' && !r.pr1.on && r.pr1.chips === '축사|축가|공연' && r.cnt1 === '고른 본식 순간 1/6 · 긴 순간 1/3', { s: r.s1, mv: r.mv1, pr: r.pr1, c: r.cnt1 });
    ok(W + ' [SPEECH_SONG_1115 · PAIR_PLUS_PV_1115] 고른 게 없을 때 카드 ＋ = 아무것도 담지 않고 고르기 창(축사 담기 · 축가 담기)', r.plus.s === 'midvid' && r.plus.pv === 'free' && /축사 담기/.test(r.plus.act) && /축가 담기/.test(r.plus.act) && /공연 담기/.test(r.plus.act), r.plus);   // [SHOW_PAIR_1116] 셋
    ok(W + ' [SPEECH_SONG_1115] 식중 영상이 담긴 채 칩 «축사» → 축사 담김 · 식중 영상과 함께 켜짐 · 칩 «축사» 눌린 모양 · 개수 «2/6 · 2/3»', r.s2 === 'free,midvid' && r.fw2 === 'speech' && r.pr2.on && r.pr2.chips === '축사*|축가|공연' && r.mv2.on && r.cnt2 === '고른 본식 순간 2/6 · 긴 순간 2/3', { s: r.s2, pr: r.pr2, c: r.cnt2 });
    ok(W + ' [SPEECH_SONG_1115] 칩 «축가» → 바꾸기(축사 빠짐 · 식중 영상 그대로 · 개수 그대로) · 알림 «축사 대신 축가를 담았어요»', r.s3 === 'midvid,song' && r.u3 === '축사 대신 축가를 담았어요' && r.pr3.chips === '축사|축가*|공연' && r.cnt3 === r.cnt2, { s: r.s3, u: r.u3, c: r.cnt3 });
    ok(W + ' [SPEECH_SONG_1115] 칩 «축사» → 되돌려 바꾸기 · 알림 «축가 대신 축사를 담았어요»', r.s4 === 'free,midvid' && r.u4 === '축가 대신 축사를 담았어요' && r.pr4.chips === '축사*|축가|공연', { s: r.s4, u: r.u4 });
    ok(W + ' [SHOW_PAIR_1116] 칩 «공연» → 바꾸기(free 칸이 축하 공연 · 식중 영상 그대로) · 알림 «축사 대신 공연을 담았어요» · 칩 «공연» 눌린 모양 · 칩 «축사»로 되돌리면 갈래도 축사', r.s4b === 'free,midvid' && r.fw4b === 'stage' && r.u4b === '축사 대신 공연을 담았어요' && r.pr4b.chips === '축사|축가|공연*' && r.pr4b.on && r.fw4c === 'speech', { s: r.s4b, fw: r.fw4b, u: r.u4b, pr: r.pr4b, fw4c: r.fw4c });
    for (const t of (r.swap || ['(PN 없음)'])) ok(`${W} [TOAST_MIN] 바꾸기 알림 20자 안 · «·» 한 번까지 «${t}» ${vis(t).length}자`, !!r.swap && vis(t).length <= 20 && (t.match(/·/g) || []).length <= 1);
    ok(W + ' [SPEECH_SONG_1115] 카드 ✓ → 담긴 쪽(축사) 빼기 · 식중 영상은 그대로 · 칩 둘 다 안 눌린 모양', r.s5 === 'midvid' && !r.pr5.on && r.pr5.chips === '축사|축가|공연', { s: r.s5, pr: r.pr5 });
    ok(W + ' [SPEECH_SONG_1115] 담기 전 칩 «축가» = 축가 담기(바꾸기 알림 없음)', r.s6 === 'midvid,song' && !r.u6 && r.pr6.chips === '축사|축가*|공연' && r.pr6.on, { s: r.s6, u: r.u6, pr: r.pr6 });
    ok(W + ' [SPEECH_SONG_1115] 식중 영상 ✓ → 빼기(축가는 그대로)', r.s7 === 'song' && !r.mv7.on, { s: r.s7 });
    ok(W + ' [SPEECH_SONG_1115] 네 길 모두 둘 중 하나 — opTgl(② 흐름) · opPair(고르기) · lsAdd(② 다시 담기) · lsUndo(되돌리기) · 식중 영상은 늘 그대로',
      !r.err && r.p1[0] === 'bless,free,midvid' && r.p1[1] === 'speech' && r.p2 === 'bless,midvid,song' && r.p3 === 'bless,free,midvid' && r.p4 === 'bless,midvid,song' && r.p5 === 'bless,free,midvid' && r.p6 === 'bless,midvid,song' && r.p7 === 'bless,song',
      { p: [r.p1, r.p2, r.p3, r.p4, r.p5, r.p6, r.p7], e: r.err });
    ok(W + ' [SPEECH_SONG_1115] 정석(축가 · 5개) + 식중 영상 = 담김(6/6 · 3/3 · 창 없음)', r.std0 === '고른 본식 순간 5/6 · 긴 순간 2/3' && /midvid/.test(r.std.s) && /song/.test(r.std.s) && r.std.c === '고른 본식 순간 6/6 · 긴 순간 3/3' && !r.std.a, { c0: r.std0, std: r.std });
    ok(W + ' [MID17_TILE] 가족(6개) + 식중 영상 = 막힘 «본식 순간은 6개까지예요»', r.fam0 === '고른 본식 순간 6/6 · 긴 순간 3/3' && !/midvid/.test(r.fam.s) && /본식 순간은 6개까지예요/.test(r.fam.a), r.fam);
    ok(W + ' [SPEECH_SONG_1115] 가족(축가 · 6개) 카드 칩 «축사» = 바꾸기(개수 6/6 그대로 · 창 없음 · 축가 빠짐)', /free/.test(r.famSw.s) && !/song/.test(r.famSw.s) && r.famSw.c === r.fam0 && r.famSw.u === '축가 대신 축사를 담았어요' && !r.famSw.a, r.famSw);
    ok(W + ' [MID17_TILE · NARR_ROLE_1115] 미리 보기 창 = 식중 영상 판(이름 · 설명 · 대표 나레이션 = 엔진의 식중 영상 첫 줄 «' + r.mvIn + '» · 장면 영상 free.mp4 · «누가 하나요?»가 축사 · 축가와 따로라고 말한다)', !!r.pv && r.pv.t === '식중 영상' && /영상/.test(r.pv.q) && !/축하의 말/.test(r.pv.q) && !!r.mvIn && !!r.pv.line && r.pv.line.text === r.mvIn && r.pv.line.text !== MID_OLD58 && /\/free\.mp4/.test(r.pv.vid) && /축사/.test(r.pv.who || '') && /축가/.test(r.pv.who || ''), r.pv);
    ok(W + ' [MID17_TILE] 창 «이 순간 담기» → 식중 영상 담김 · 창이 «✓ 담겨 있어요»', r.pvAdd.s === 'midvid' && /담겨 있어요/.test(r.pvAdd.act || ''), r.pvAdd);
    ok(W + ' [SPEECH_SONG_1115] 축사 · 축가 창(안 담김) — 이름 축사 쪽(«축사 · 축가» 또는 보고 있는 쪽 «축사» · PAIR_VIEW_1115) · 단추 «축사 담기 · 축가 담기» · «누가 하나요?»(부모님 말씀은 덕담) · 대표 나레이션은 축사 여는 말(식중 영상 줄 아님)',
      !!r.pvP0 && /^(축사 · 축가|축사)$/.test(r.pvP0.t) && /축사 담기/.test(r.pvP0.act) && /축가 담기/.test(r.pvP0.act) && /공연 담기/.test(r.pvP0.act) && /부모님 덕담/.test(r.pvP0.who || '') && !!r.pvP0.line && r.pvP0.line.text !== r.mvIn && /축사/.test(r.pvP0.line.text), r.pvP0);
    /* ★[SHOW_PAIR_1116 · RULES_SLIM ⑧] 옛 기대 «✓ 축가 담겨 있어요 · 축사로 바꾸기 · 빼기» → 담긴 쪽을 보는 동안엔 «✓ … · 축가 빼기»만 · 다른 둘은 머리의 «… 보기» 링크(축사 보기 · 공연 보기) · 보기를 옮기면 «축사로 바꾸기» */
    ok(W + ' [SPEECH_SONG_1115 · SHOW_PAIR_1116] 창 «축가 담기» → 축가 담김(식중 영상 그대로) · «✓ 축가 담겨 있어요 · 축가 빼기»(바꾸기 없음) · 머리 링크 «축사 보기 · 공연 보기» · 대표 나레이션 = 축가 여는 말',
      !!r.pvP1 && r.pvP1.s === 'midvid,song' && /✓ 축가 담겨 있어요/.test(r.pvP1.act) && !/바꾸기/.test(r.pvP1.act) && /축가 빼기/.test(r.pvP1.act) && r.pvP1.sw === '축사 보기|공연 보기' && !!r.pvP1.line && /축가/.test(r.pvP1.line.text), r.pvP1);
    ok(W + ' [SHOW_PAIR_1116] 창 «축사 보기» → 축사 판으로 · «✓ 축가 담겨 있어요 · 축사로 바꾸기 · 축가 빼기» · 머리 링크 «축가 보기 · 공연 보기»', !!r.pvP1b && /✓ 축가 담겨 있어요/.test(r.pvP1b.act) && /축사로 바꾸기/.test(r.pvP1b.act) && /축가 빼기/.test(r.pvP1b.act) && r.pvP1b.sw === '축가 보기|공연 보기', r.pvP1b);
    ok(W + ' [SPEECH_SONG_1115] 창 «축사로 바꾸기» → 축사 담김 · 축가 빠짐 · 알림 «축가 대신 축사를 담았어요»', !!r.pvP2 && r.pvP2.s === 'free,midvid' && /✓ 축사 담겨 있어요/.test(r.pvP2.act) && r.pvP2.u === '축가 대신 축사를 담았어요', r.pvP2);
    if (SHOT) { await pg.evaluate(async () => { S.on = { bless: 1, free: 1, midvid: 1 }; S.freeWhat = 'speech'; opSync(); }); await wait(400);
      const h = await pg.$('.pk-act:nth-of-type(3)'); fs.mkdirSync(SHOT, { recursive: true }); if (h) { await h.scrollIntoViewIfNeeded(); await wait(500); await h.screenshot({ path: path.join(SHOT, `pick-heart-${W}.png`) }); } }

    /* ② 하나씩 만들기 — 식중 영상 칸 · 시간 */
    const q = await pg.evaluate(async () => { const R = RitualOpen, out = {}, w = (ms) => new Promise((x) => setTimeout(x, ms));
      R.applyExample(S, 'brief'); S.on.midvid = 1; S.midLen = '3'; opSync(); await w(200);
      try { opGoStep('listen'); mkGo('midvid'); } catch (e) { out.err = e.message; } await w(700);
      const head = document.getElementById('mkHead') || document.querySelector('.mk h3, .mk h2');
      out.head = head ? head.textContent : ''; const fl = document.querySelector('[data-fk="midlen"]');
      out.my = ((document.querySelector('.mk-pvmy') || {}).textContent || '').replace(/\s+/g, ' ').trim();   /* [VIDEO_NAME_1114] «어디서 준비하나» 한 덩어리 */
      try { out.chips = (window.ME_ADV_PAGE && ME_ADV_PAGE.chips ? ME_ADV_PAGE.chips() : []).map((c) => c.label); } catch (e) { out.chips = ['ERR ' + e.message]; }   /* [GPT 2-23] 식중 영상 칸의 상담 질문 · ★[SPEECH_SONG_1115] 칸 = midvid */
      try { const f0 = S.on.midvid; delete S.on.midvid; out.chipsOff = ME_ADV_PAGE.chips().map((c) => c.label); S.on.midvid = f0; out.chipsDef = (RITUAL_CHIPS._def || []).slice(); } catch (e) { out.chipsOff = null; out.chipsErr = e.message; }   /* [GPT 3-28 · 4-33] 뺀 칸은 일반 질문(_def 그대로) · 오류면 실패 · ★[SPEECH_SONG_1115] main 판은 S.on.free(옛 영상 갈래) */
      { const C0 = window.CUST; try { window.CUST = Object.assign({}, C0 || {}, { midUp: false }); try { CUST = window.CUST; } catch (e) {} mkGo('_intro'); await w(300); mkGo('midvid'); await w(500); out.myOff = [...document.querySelectorAll('.mk-pvmy')].some((e) => /식중 영상/.test(e.textContent)); out.myOffCust = String(window.CUST && window.CUST.midUp);
        window.CUST = Object.assign({}, C0 || {}, { weddingDate: '2026-11-26' }); delete window.CUST.midUp; try { CUST = window.CUST; } catch (e) {} mkGo('_intro'); await w(300); mkGo('midvid'); await w(500); out.myOld = [...document.querySelectorAll('.mk-pvmy')].some((e) => /식중 영상/.test(e.textContent));   /* [GPT 2-21] 옛 마이페이지 탭(midUp 없음)도 그리지 않는다 */
        window.CUST = Object.assign({}, C0 || {}, { midUp: true }); try { CUST = window.CUST; } catch (e) {} mkGo('_intro'); await w(300); mkGo('midvid'); await w(500); out.myOn = [...document.querySelectorAll('.mk-pvmy')].some((e) => /식중 영상/.test(e.textContent)); } finally { window.CUST = C0; try { CUST = C0; } catch (e) {} mkGo('midvid'); await w(400); } }   /* [GPT 1-01] 마이페이지가 «아직 안 받음»(midUp:false)이면 그리지 않는다 */
      out.len = !!document.querySelector('[data-fk="midlen"]'); out.note = fl ? ((fl.closest('.ls-cg') || {}).textContent || '') : '';
      out.what = [...document.querySelectorAll('.ls-cg .gl')].map((e) => e.textContent);
      out.body = ((document.querySelector('.mk') || document.body).textContent || '');
      const big = () => { const sp = R.span(S); return { body: sp.body, photo: sp.photo, sum: sp.tb + sp.tm + sp.pm + sp.pa, hi: R.bodySec(S)[1] }; };
      out.t = {}; for (const L of [1, 5, 10]) { document.querySelectorAll('.ord-ask').forEach((e) => e.remove()); try { lsMidLen(L); } catch (e) { out.err = e.message; } await w(150); const a = document.querySelector('.ord-ask'); out.t[L] = Object.assign({ v: S.midLen, ask: a ? a.textContent : '' }, big()); if (a) { const y = a.querySelector('button'); if (y) y.click(); } }
      /* 같은 셈 — 엔진에 바로 넣은 값과 길이 칸으로 바꾼 값이 같은가 */
      const T2 = JSON.parse(JSON.stringify(S)); T2.midLen = '5'; try { lsMidLen(5); } catch (e) {} await w(150); out.same = JSON.stringify(R.span(T2)) === JSON.stringify(R.span(S));
      /* 정석 + 식중 영상 3분 → 10분은 상한 밖 → 막힘 */
      R.applyExample(S, 'standard'); S.on.midvid = 1; S.midLen = '3'; opSync(); await w(150); document.querySelectorAll('.ord-ask').forEach((e) => e.remove()); try { lsMidLen(10); } catch (e) {} await w(150); out.cap = { v: S.midLen, ask: (document.querySelector('.ord-ask') || {}).textContent || '' };
      document.querySelectorAll('.ord-ask').forEach((e) => e.remove());
      /* ③ 한눈에 보기 · 보낼 것 — 식중 영상 날 옛 «준비한 순서 영상(휴대폰…)» · «준비한 순서 파일» 없음 */
      R.applyExample(S, 'brief'); S.on.midvid = 1; S.midLen = '3'; opSync(); await w(150);
      out.prep = JSON.stringify((R.prepOf('midvid', S) || [])); try { mkGo('_sum'); } catch (e) {} await w(500); const tx = document.body.innerText;   /* 보이는 글만(본문 안 스크립트 글은 빼고) */
      out.sum = { old: /준비한 순서 영상\(휴대폰/.test(tx), file: /준비한 순서 파일/.test(tx) };
      return out; });
    ok(W + ' [MID17_LEN · SPEECH_SONG_1115] ② 머리 «식중 영상» · 길이 칸(midLen · 1 ~ 10분) · «축사와 같은 자리라 둘 중 하나» 한 줄 없음 · 무엇을 줄 없음', /식중 영상/.test(q.head) && q.len && !/둘 중 하나/.test(q.note + q.body) && !q.what.includes('무엇을') && !/깜짝 선물/.test(q.body), { head: q.head, len: q.len, note: q.note, what: q.what, err: q.err });
    ok(W + ' [MID17_TIME] ② 길이 칸 1 · 5 · 10분 → 본식 · 단체 사진 띠가 바뀌고 합은 늘 40분(' + [1, 5, 10].map((L) => L + '분 본식 ' + (q.t[L] || {}).body + ' · 사진 ' + (q.t[L] || {}).photo).join(' | ') + ')',
      [1, 5, 10].every((L) => q.t[L] && q.t[L].v === String(L) && !q.t[L].ask && q.t[L].sum === 40) && q.t[5].hi - q.t[1].hi === 240 && q.t[10].hi - q.t[5].hi === 300, q.t);
    ok(W + ' [MID17_TIME] 길이 칸으로 바꾼 값 = 엔진에 바로 넣은 값(같은 셈)', q.same);
    ok(W + ' [VIDEO_NAME_1114] ② 식중 영상 칸 아래 «식중 영상 · 기한 · 마이페이지 «식중 영상»에서 준비해요»(식전 영상과 같은 한 덩어리)', /^식중 영상/.test(q.my) && /예식 7일 전/.test(q.my) && /마이페이지 «?식중 영상»?에서 준비해요/.test(q.my), q.my);
    ok(W + ' [VIDEO_NAME_1114 · GPT 1-01] 마이페이지가 식중 영상을 아직 안 받으면(midUp:false) 그 한 덩어리를 그리지 않는다', q.myOff === false, q.myOff);
    ok(W + ' [VIDEO_NAME_1114 · GPT 2-21] 옛 마이페이지 탭(midUp 없음)은 그리지 않고 · midUp:true 면 그린다', q.myOld === false && q.myOn === true, { old: q.myOld, on: q.myOn });
    ok(W + ' [VIDEO_NAME_1114 · GPT 2-23 · 3-26] 식중 영상 칸의 상담 질문은 영상 질문 · 셋 다 «식중 영상»을 말한다(축사 질문이 아니다)', (q.chips || []).length === 3 && (q.chips || []).every((t) => /식중 영상/.test(t)) && !(q.chips || []).some((t) => /축사/.test(t)), q.chips);
    ok(W + ' [VIDEO_NAME_1114 · GPT 3-28 · 4-33] 뺀 칸이면 일반 질문 셋(_def) 그대로', Array.isArray(q.chipsOff) && q.chipsOff.length === 3 && JSON.stringify(q.chipsOff) === JSON.stringify(q.chipsDef), { off: q.chipsOff, def: q.chipsDef, err: q.chipsErr });
    ok(W + ' [MID17_TIME] 정석 + 식중 영상 10분 = 40분 예산 밖 → 막힘(길이 그대로 3분)', q.cap.v === '3' && /이 길이로 하려면/.test(q.cap.ask), q.cap);
    ok(W + ' [MID17_PREP] 식중 영상 날 준비 목록 빈 칸 · 한눈에 보기에 옛 «준비한 순서 영상(휴대폰…)» · «준비한 순서 파일» 없음', q.prep === '[]' && !q.sum.old && !q.sum.file, { p: q.prep, s: q.sum });
    if (SHOT) { await pg.evaluate(async () => { const R = RitualOpen; R.applyExample(S, 'brief'); S.on.midvid = 1; S.midLen = '5'; opSync(); try { mkGo('midvid'); } catch (e) {} }); await wait(800);
      const f = await pg.$('[data-fk="midlen"]'); if (f) { await f.scrollIntoViewIfNeeded(); await pg.evaluate(() => window.scrollBy(0, -260)); await wait(400); } await pg.screenshot({ path: path.join(SHOT, `listen-midvideo-${W}.png`) }); }
    ok(W + ' 페이지 오류 0(고르기 · ②)', !errs.length, errs.slice(0, 3));
    await ctx.close();

    /* at:'midvideo' — 담긴 초안 → ② 식중 영상 칸 · 안 담긴 초안 → ① 식중 영상 칸 깜빡 */
    for (const on of [true, false]) {
      const DS = ex('brief'); if (on) { DS.on.midvid = 1; DS.midLen = '4'; }
      const { a, errs: e2 } = await harness(W, DS, 'midvideo');
      if (on) ok(W + ' [MID17_AT] at:\'midvideo\' · 식중 영상 담김 → ② 식중 영상 칸(길이 칸 보임)', !!a && a.step === 'listen' && a.at === 'midvid' && a.len && /midvid/.test(a.on), a);
      else ok(W + ' [MID17_AT] at:\'midvideo\' · 안 담김 → ① 고르기 · 식중 영상 칸 깜빡(담지는 않는다)', !!a && a.step === 'pick' && a.flash && !/midvid/.test(a.on), a);
      ok(W + ' [MID17_AT] 페이지 오류 0(' + (on ? '담김' : '안 담김') + ')', !e2.length, e2.slice(0, 3));
    }
    /* [SPEECH_SONG_1115] 옛 초안 두 꼴 — 빌더가 읽을 때 midMigrate(_applySaved) */
    { const v = await harness(W, { course: 'open', on: { bless: 1, free: 1, song: 1 }, freeWhat: 'video', freeLen: '4' }, ''), s = await harness(W, { course: 'open', on: { bless: 1, free: 1, song: 1 }, freeWhat: 'speech', freeLen: '3' }, '');
      ok(W + ' [SPEECH_SONG_1115] 빌더가 옛 초안을 읽을 때 — free + video → 식중 영상(midLen 4 · 축가 그대로) · 축사 + 축가 → 축가만 · 페이지 오류 0',
        !!v.a && v.a.on === 'bless,midvid,song' && v.a.ml === '4' && v.a.fw === 'speech' && !!s.a && s.a.on === 'bless,song' && !v.errs.length && !s.errs.length, { v: v.a, s: s.a, e: v.errs.concat(s.errs).slice(0, 2) }); }
  }
} catch (e) { console.log('FAIL 예외', e && e.stack || e); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nMID17 PICK FAIL ${fail}` : '\nMID17 PICK OK'); process.exit(fail ? 1 : 0);
