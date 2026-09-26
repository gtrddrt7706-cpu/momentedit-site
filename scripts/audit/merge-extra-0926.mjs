// [MERGE_EXTRA_0926 2026-09-26 코워크 «병합 중 추가 점검»] P1 · P2 · 접근성 — 재현을 실브라우저 · 엔진으로 잰다.
//
//   node scripts/audit/merge-extra-0926.mjs
//   AUDIT_ROOT=<옛 main 작업 사본> node scripts/audit/merge-extra-0926.mjs   # 고치기 전 판에서 같은 검사가 붉은지(재현 증거)
//
// ★종료 코드 [CANT_LOOK] 0 = 통과 · 1 = 실패 · 2 = 재지 못함(playwright 없음)
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = process.env.AUDIT_ROOT || path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0;
const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d == null ? '' : ' → ' + d}`); if (!c) fail++; };
const safe = async (m, f) => { try { await f(); } catch (e) { ok(m, false, String(e.message || e).slice(0, 160)); } };

/* ── 엔진 · 원천(브라우저 없이) ── */
const O = require(path.join(ROOT, 'assets/ritual-open.js'));
const C = require(path.join(ROOT, 'assets/ritual-cue.js'));
await safe('P2-2 본식 + 단체 사진 = 40 — 1024조합 전부(반올림한 본식에서 뺀다) [SPAN_SUM40]', () => {
  let bad = 0; const ks = ['candle', 'welcome', 'bless', 'vow', 'ring', 'declare', 'tribute', 'free', 'letter', 'toast'];
  for (let m = 0; m < 1 << ks.length; m++) { const S = { on: {} }; ks.forEach((k, i) => { if (m >> i & 1) S.on[k] = 1; }); const sp = O.span(S); if (sp.a + sp.pb !== 40 || sp.b + sp.pa !== 40) bad++; }
  ok('P2-2 본식 + 단체 사진 = 40 — 1024조합 전부(반올림한 본식에서 뺀다) [SPAN_SUM40]', bad === 0, bad + '조합 어긋남');
});
await safe('P2-5 알림 글과 단추가 같은 판정', () => {
  const front = O.noticeFull({ on: { bless: 1, vow: 1, tribute: 1, toast: 1 } });
  const back = O.noticeFull({ on: { declare: 1, tribute: 1, free: 1, letter: 1, toast: 1 }, freeWhat: 'speech', freeLen: '1' });
  const fa = front.acts.map((a) => a[0]).join('|'), ba = back.acts.map((a) => a[0]).join('|');
  ok('P2-5 앞쪽 사슬(덕담 · 서약 · 인사) = «반지나 선언» 글 + 반지 · 선언 단추 [NOTE_ACT_MATCH]', /반지나 선언/.test(front.msg) && /반지 교환 담기/.test(fa) && !/말 없이/.test(fa), front.msg + ' / ' + fa);
  ok('P2-5 뒤쪽 사슬 = «말 없이» 글 + 단추 «인사를 «말 없이»로»', /말 없이/.test(back.msg) && ba === '인사를 «말 없이»로', back.msg + ' / ' + ba);
});
await safe('P2-1 닫은 알림 뒤에 걸린 알림이 뜬다', () => {
  // 덕담 · 서약 · 인사 사슬 + 편지(부모님께) + 인사 400자 → 알림 ① 과 ② 가 함께 걸린다
  const S = { on: { bless: 1, vow: 1, tribute: 1, letter: 1, toast: 1 }, tributeSay: 'long', letter: 'parent' };
  const L = (O.noticeList || (() => []))(S), n1 = O.noticeFull(S), shut = {}; if (n1) shut[n1.key] = 1;
  const n2 = O.noticeFull(S, shut);
  ok('P2-1 닫은 알림 뒤에 걸린 알림이 뜬다(앞 알림 «괜찮아요» → 다음 알림) [NOTICE_QUEUE]', L.length >= 2 && n1 && n2 && n2.key !== n1.key, JSON.stringify({ n: L.length, k1: n1 && n1.key, k2: n2 && n2.key }));
  // ④(단체 사진 부족)는 닫을 수 없다 — 앞 알림을 다 닫아도 남는다
  const S4 = O.applyExample({}, 'family'); S4.on.free = 1; S4.on.bless = 1; S4.on.vow = 1;
  const all = {}; (O.noticeList ? O.noticeList(S4) : []).forEach(() => { const n = O.noticeFull(S4, all); if (n && n.close) all[n.key] = 1; });
  const last = O.noticeFull(S4, all);
  ok('P2-1 단체 사진 부족 알림은 앞 알림을 닫아도 남는다', !!last && last.key === 'short' && last.close === false, JSON.stringify(last && last.key));
});
await safe('P1-6 축사를 담은 날 «축사는 따로 두지 않았습니다»가 없다', () => {
    const openCourse = 'open';
  const mk = (fw) => ({ course: openCourse, on: { toast: 1, free: 1, declare: 1 }, freeWhat: fw, freeLen: '2' });
  const slugs = (S) => { const r = C.build(S, { mode: 'console' }); return r.cues.map((c) => c.slug); };
  const sp = slugs(mk('speech')), vd = slugs(mk('video'));
  ok('P1-6 준비한 순서가 축사면 narr-toast-none 빠짐 · 영상이면 그대로 [SPEECH_NO_NONE]', sp.indexOf('narr-toast-none') < 0 && vd.indexOf('narr-toast-none') > -1 && sp.indexOf('toast-toast') > -1, JSON.stringify({ sp: sp.filter((x) => /toast/.test(x)), vd: vd.filter((x) => /toast/.test(x)) }));
  const pour = slugs({ course: openCourse, on: { toast: 1, free: 1 }, freeWhat: 'speech', freeLen: '2', toast: 'toast', wine: 'mix' }).filter((x) => /toast/.test(x));
  ok('P1-6 축배만 + 두 와인 + 축사 — 붓기는 선창 앞(안내 줄이 없어도 같은 자리)', pour.indexOf('toast-pour-mix') > -1 && pour.indexOf('toast-pour-mix') < pour.indexOf('toast-toast'), pour.join(' '));
});
{
  const kb = fs.readFileSync(path.join(ROOT, 'assets/advisor-kb.js'), 'utf8');
  ok('P1-5 AI 상담 «축가 돼요»가 없다 · 라이브 노래 · 연주는 받지 않는다 [NO_LIVE_SONG_KB]', !/축가·영상 상영처럼/.test(kb) && (kb.match(/라이브 노래 · 연주는 받지 않아요/g) || []).length >= 2);
}

/* ── 실브라우저 ── */
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.css': 'text/css', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]); const p = path.join(ROOT, u === '/blank.html' ? '/__none__' : u);
  if (u === '/blank.html') { r.writeHead(200, { 'Content-Type': 'text/html' }); r.end('<!doctype html><title>blank</title>밖'); return; }
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); r.end(b); });
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port; const B = `http://127.0.0.1:${port}`;
const br = await pw.chromium.launch();
async function open(w, h, opt) {
  opt = opt || {};
  const ctx = await br.newContext({ viewport: { width: w, height: h || 900 } }); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith(B) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  if (opt.draft) await pg.addInitScript((d) => { try { if (!sessionStorage.getItem('__seeded')) { localStorage.setItem('me_order', JSON.stringify(d)); sessionStorage.setItem('__seeded', '1'); } } catch (e) {} }, opt.draft);
  await pg.goto(B + '/blank.html'); await pg.goto(B + '/order-preview.html', { waitUntil: 'load' }); await pg.waitForTimeout(700);
  return { ctx, pg, errs };
}
const next = async (pg) => { await pg.waitForTimeout(450); await pg.evaluate(() => document.getElementById('next').click()); };   // 다음 단추는 400ms 안 두 번 누름을 막는다
const step = (pg) => pg.evaluate(() => (location.pathname.indexOf('order-preview') > -1 && window.STEPS) ? STEPS[idx].k : 'OUT');
async function toListen(pg) { await next(pg); await pg.waitForTimeout(350); await next(pg); await pg.waitForTimeout(450); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300); await pg.evaluate(() => opToListen()); await pg.waitForTimeout(1200); }

/* P1-2 · 첫 화면이 replaceState 만 한 경우(초안에서 ② 로 바로 열림) «← 고르기로»가 빌더를 떠났다 */
let draft = null;
await safe('P1-2 초안 만들기', async () => { const { ctx, pg } = await open(390); await toListen(pg); draft = await pg.evaluate(() => JSON.parse(localStorage.getItem('me_order'))); await ctx.close(); });
await safe('P1-2', async () => {
  const { ctx, pg } = await open(390, 900, { draft });
  const k0 = await step(pg);
  await pg.evaluate(() => opStepNav('pick')); await pg.waitForTimeout(700);
  ok('P1-2 초안에서 ② 로 열린 뒤 «← 고르기로» → 빌더 안 ① (떠나지 않는다) [STEP_NO_REWIND]', k0 === 'listen' && await step(pg) === 'pick', JSON.stringify({ k0, k1: await step(pg), url: pg.url().slice(-24) }));
  await pg.goBack(); await pg.waitForTimeout(600);
  ok('P1-2 그다음 휴대폰 뒤로 → ② (기록이 맞다)', await step(pg) === 'listen', await step(pg));
  // ④ «③ 준비하기에서 보기»
  await pg.evaluate(() => opGoStep('done')); await pg.waitForTimeout(700); await pg.evaluate(() => opGoStep('write')); await pg.waitForTimeout(600);
  ok('P1-2 ④ «③ 준비하기에서 보기» → 빌더 안 ③', await step(pg) === 'write', await step(pg));
  await ctx.close();
});
await safe('P1-2 이전', async () => {
  const { ctx, pg } = await open(390, 900, { draft });
  await pg.click('#prev'); await pg.waitForTimeout(700);
  ok('P1-2 초안에서 ② 로 열린 뒤 «이전» → 빌더 안 ①', await step(pg) === 'pick', await step(pg));
  await ctx.close();
});
/* P1-2 · 음악까지 미리듣기는 뒤로 한 번에 닫힌다 */
await safe('P1-2 미리듣기', async () => {
  const { ctx, pg } = await open(390); await toListen(pg);
  await pg.evaluate(() => openRitualPreview()); await pg.waitForTimeout(500);
  const had = await pg.evaluate(() => !!document.getElementById('ob_rpViewer'));
  await pg.goBack(); await pg.waitForTimeout(600);
  ok('P1-2 «음악까지 미리듣기» → 뒤로 한 번 = 미리듣기만 닫힘 · ② 그대로 [RP_BACK]', had && await pg.evaluate(() => !document.getElementById('ob_rpViewer')) && await step(pg) === 'listen', JSON.stringify({ had, step: await step(pg) }));
  await pg.evaluate(() => openRitualPreview()); await pg.waitForTimeout(400);
  await pg.click('#ob_rpViewer button[aria-label="닫기"]'); await pg.waitForTimeout(500);
  const st = await pg.evaluate(() => ({ rp: !!(history.state && history.state.rp), v: !!document.getElementById('ob_rpViewer') }));
  ok('P1-2 ✕ 로 닫아도 기록 칸이 남지 않는다', !st.rp && !st.v, JSON.stringify(st));
  await ctx.close();
});
/* P1-2 · 처음부터 다시 만들기 뒤 뒤로가 지워진 판의 ② 로 가지 않는다 */
await safe('P1-2 다시 만들기', async () => {
  const { ctx, pg } = await open(390); await toListen(pg);
  await pg.evaluate(() => resetAll()); await pg.waitForTimeout(300);
  await Promise.all([pg.waitForNavigation({ waitUntil: 'load' }).catch(() => {}), pg.click('.ord-ask button:has-text("지우고 시작")')]); await pg.waitForTimeout(800);
  const k0 = await step(pg);
  await pg.goBack(); await pg.waitForTimeout(900);
  const k1 = await step(pg), picked = await pg.evaluate(() => window.RitualOpen && window.S ? RitualOpen.picked(S).length : -1).catch(() => -1);
  ok('P1-2 «처음부터 다시 만들기» 뒤 휴대폰 뒤로 → 빈 코스 ② 로 가지 않는다 [STEP_NO_REWIND]', !(k1 === 'listen' || k1 === 'write' || k1 === 'done'), JSON.stringify({ k0, k1, picked }));
  await ctx.close();
});
/* P1-3 · ② 담기 · ① 알림 단추가 옛 갈래 키와 저장까지 */
await safe('P1-3', async () => {
  const { ctx, pg } = await open(390); await toListen(pg);
  const r = await pg.evaluate(() => { delete S.on.bless; delete S.on.ring; opSync(); const b0 = S.bless; lsAdd('bless'); lsAdd('ring');
    const saved = JSON.parse(localStorage.getItem('me_order')).S; return { b0, bless: S.bless, ring: S.ring, sb: saved.bless, sr: saved.ring, flow: _ordPayload(false).summary.flow }; });
  ok('P1-3 ② «담기» → S.bless · S.ring = on · 저장본도 on · 요약 흐름에 덕담 · 반지 [OP_SYNC_ALL]', r.b0 === 'off' && r.bless === 'on' && r.ring === 'on' && r.sb === 'on' && r.sr === 'on' && r.flow.some((n) => /덕담/.test(n)) && r.flow.some((n) => /반지/.test(n)), JSON.stringify(r));
  const a = await pg.evaluate(() => { opStepNav('pick'); S.on = { bless: 1, vow: 1, tribute: 1, toast: 1 }; opSync(); const n = RitualOpen.noticeFull(S); const i = n.acts.findIndex((x) => x[2] === 'ring'); opNoteAct(i); return { ring: S.ring, sr: JSON.parse(localStorage.getItem('me_order')).S.ring }; });
  ok('P1-3 ① 알림 단추 «반지 교환 담기» → S.ring = on · 저장본도', a.ring === 'on' && a.sr === 'on', JSON.stringify(a));
  await ctx.close();
});
/* P1-4 · 마이페이지 «예식 순서에서 남는 사진» = 본식 차례 · 카드 이름 · 장면 */
await safe('P1-4', async () => {
  const { ctx, pg } = await open(390); await toListen(pg);
  const sm = await pg.evaluate(() => { S.on.welcome = 1; S.on.ring = 1; opSync(); return { sm: _ordPayload(false).summary, seq: RitualOpen.bodySeq(S).map((k) => RitualOpen.CARDS[k].n) }; });
  ok('P1-4 빌더가 요약에 scenes 를 싣는다 — 본식 차례 그대로 [SCENE_FROM_SEQ]', Array.isArray(sm.sm.scenes) && JSON.stringify(sm.sm.scenes.map((x) => x.n)) === JSON.stringify(sm.seq), JSON.stringify({ sc: (sm.sm.scenes || []).map((x) => x.n), seq: sm.seq }));
  await ctx.close();
  const c2 = await br.newContext({ viewport: { width: 390, height: 900 } }); const p2 = await c2.newPage();
  await p2.route('**/*', (rt) => rt.request().url().startsWith(B) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await p2.goto(B + '/mypage.html', { waitUntil: 'domcontentloaded' }); await p2.waitForTimeout(800);
  const L = await p2.evaluate((s) => typeof photoSceneList === 'function' ? photoSceneList({ summary: s, S: {} }) : null, sm.sm);
  ok('P1-4 마이페이지가 그 목록을 그대로 그린다(첫인사 · 반지 교환 포함 · 차례 같음)', L && JSON.stringify(L.map((x) => x.n)) === JSON.stringify(sm.seq) && L.some((x) => x.n === '첫인사'), JSON.stringify(L && L.map((x) => x.n)));
  await c2.close();
});
/* P1-7 · 대본 파일 겹이름 */
await safe('P1-7', async () => {
  const { ctx, pg } = await open(390); await toListen(pg);
  const t = await pg.evaluate(async () => { S.on.declare = 1; opSync(); await new Promise((r) => setTimeout(r, 900)); return scriptTextOpen(); });
  ok('P1-7 대본에 «나레이션(선언 · 나레이션(…))» · «식전 식전» 없음 · «나레이션(선언 · 엄숙하게)» 있음 [SCRIPT_LAB]', t && !/나레이션\(선언 · 나레이션\(/.test(t) && !/식전 식전/.test(t) && /나레이션\(선언 · /.test(t), (t || '').split('\n').filter((l) => /선언|식전/.test(l)).slice(0, 4).join(' / '));
  await ctx.close();
});
/* P1-8 · P2-4 · 미리 보기 창 */
await safe('P1-8', async () => {
  const { ctx, pg } = await open(360, 560); await next(pg); await pg.waitForTimeout(350); await next(pg); await pg.waitForTimeout(450); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300);
  await pg.evaluate(() => opPv('vow')); await pg.waitForTimeout(500);
  await pg.evaluate(() => { document.querySelector('#pvSheet .pv-box').scrollTop = 400; }); await pg.evaluate(() => opPvClose()); await pg.waitForTimeout(500);
  await pg.evaluate(() => opPv('ring')); await pg.waitForTimeout(500);
  const r = await pg.evaluate(() => { const bx = document.querySelector('#pvSheet .pv-box'), a = document.querySelector('#pvAct'), ab = a.getBoundingClientRect(); return { top: bx.scrollTop, actIn: ab.bottom <= innerHeight + 1 && ab.top < innerHeight, lock: getComputedStyle(document.body).overflow === 'hidden' }; });
  ok('P1-8 창을 다시 열면 맨 위에서 [PV_TOP]', r.top === 0, r.top);
  ok('P2-4 360×560 · 담기 · 빼기 단추가 창 안 아래에 보인다 · 뒤 쪽은 잠김 [PV_ACT_STICKY]', r.actIn && r.lock, JSON.stringify(r));
  await pg.evaluate(() => opPvClose()); await pg.waitForTimeout(400);
  ok('P2-4 창을 닫으면 잠금 풀림', await pg.evaluate(() => getComputedStyle(document.body).overflow !== 'hidden'));
  await ctx.close();
});
/* P2-3 · 작은 플레이어 아래 여유 */
await safe('P2-3', async () => {
  const { ctx, pg } = await open(390); await toListen(pg);
  await pg.evaluate(() => lsPlay('vow')); await pg.waitForTimeout(800);   // 줄 재생(«처음부터»는 크게 보기로 열려 작은 플레이어가 없다)
  const r = await pg.evaluate(() => { const m = document.getElementById('lsMini'); window.scrollTo(0, document.body.scrollHeight); const last = document.querySelector('.ls-prep, .ls-off:last-of-type'); const lb = last ? last.getBoundingClientRect() : null, mb = m.getBoundingClientRect();
    return { mini: getComputedStyle(m).display, cls: document.documentElement.classList.contains('lsmini'), pad: parseInt(document.documentElement.style.scrollPaddingBottom) || 0, clear: lb ? lb.bottom <= mb.top + 1 : null }; });
  ok('P2-3 작은 플레이어가 떠 있으면 맨 아래 «준비할 것»이 그 위로 올라온다 [MINI_ROOM]', r.mini === 'flex' && r.cls && r.pad > 100 && r.clear === true, JSON.stringify(r));
  await pg.evaluate(() => lsStop()); await pg.waitForTimeout(300);
  ok('P2-3 멈추면 여유도 거둔다', await pg.evaluate(() => !document.documentElement.classList.contains('lsmini')));
  await ctx.close();
});
/* 접근성 소소 */
await safe('A11Y', async () => {
  const { ctx, pg } = await open(390); await next(pg); await pg.waitForTimeout(350); await next(pg); await pg.waitForTimeout(450); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(400);
  const r = await pg.evaluate(() => ({ hit: document.querySelectorAll('.flow-hit[tabindex], .flow-hit[role]').length, imgs: document.querySelectorAll('.pk-fg svg[role="img"]').length, undoRole: (document.getElementById('pkUndo') || { getAttribute: () => null }).getAttribute('role'), noteTag: (document.querySelector('.op-note-t') || {}).tagName || '' }));
  ok('접근성 흐름 그림 = role=img 하나 · 초점 칸 0 [FLOW_ONE_IMG]', r.hit === 0 && r.imgs >= 1, JSON.stringify(r));
  ok('접근성 되돌리기 알림에 role=status 없음 [UNDO_NO_STATUS]', r.undoRole !== 'status', r.undoRole);
  const said = await pg.evaluate(() => { S.on = { bless: 1, vow: 1, tribute: 1, toast: 1 }; opSync(); const a = document.getElementById('lsLive').textContent; opTgl('candle'); const b = document.getElementById('lsLive').textContent; return { a, b, tag: (document.querySelector('.op-note-t') || {}).tagName }; });
  ok('접근성 알림 글은 바뀔 때만 읽는다 [NOTE_SAY_ONCE]', /말로 듣는 순서/.test(said.a) && !/말로 듣는 순서/.test(said.b), JSON.stringify(said));
  ok('접근성 알림 글은 문단(P) [NOTE_PARA]', said.tag === 'P', said.tag);
  await pg.evaluate(() => { opGoStep('done'); }); await pg.waitForTimeout(900);
  const cb = await pg.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent === '전체 대본 복사'); return b ? b.getBoundingClientRect().height : 0; });
  ok('접근성 ④ «전체 대본 복사» 44px 이상 [COPY_44]', cb >= 44, cb);
  await ctx.close();
  const { ctx: c3, pg: p3 } = await open(330); await next(p3); await p3.waitForTimeout(350); await next(p3); await p3.waitForTimeout(450);
  ok('접근성 340 아래 칸 설명 세 줄 [TILE_3LINE]', await p3.evaluate(() => { const e = document.querySelector('.pk-s'); return e ? getComputedStyle(e).webkitLineClamp === '3' : false; }));
  await c3.close();
});
/* ── 사장님 피드백 1(2026-09-26) — 크게 보기 단추 한자리 · PC 오른쪽 칸 · 진사 포인트 · 케이크 한 줄 ── */
await safe('FB1', async () => {
  const { ctx, pg } = await open(390, 844); await toListen(pg);
  await pg.evaluate(() => lsPlayAll()); await pg.waitForTimeout(600);
  const ys = new Set(); for (let i = 0; i < 8; i++) { const y = await pg.evaluate(() => { const c = document.querySelector('#lsFull .lf-ctl'); return c && !document.getElementById('lsFull').hidden ? Math.round(c.getBoundingClientRect().top) : null; }); if (y == null) break; ys.add(y); await pg.evaluate(() => lsJump(1)); await pg.waitForTimeout(450); }
  ok('피드백1-1 크게 보기 ⏮ ❚❚ ⏭ 는 순간이 바뀌어도 한자리(390×844) [BIG_CTL_FIXED]', ys.size === 1 && [...ys][0] > 700, [...ys].join(' · '));
  await pg.evaluate(() => lsCloseBig()); await pg.waitForTimeout(300);
  const c = await pg.evaluate(() => { opStepNav('pick'); return 1; }); await pg.waitForTimeout(500);
  const seal = await pg.evaluate(() => { const st = document.querySelector('.op-star'), dot = document.querySelector('.pk-fg .flow-peak'), on = document.querySelector('.op-steps li.on'); return { star: st && getComputedStyle(st).color, dot: dot && dot.getAttribute('fill'), step: on && getComputedStyle(on).borderTopColor }; });
  ok('피드백1-3 진사 — ★ 글자 · 벅찬 순간 점 · 지금 걸음 윗줄 [SEAL_POINTS]', seal.star === 'rgb(107, 42, 36)' && /6B2A24/i.test(seal.dot || '') && seal.step === 'rgb(107, 42, 36)', JSON.stringify(seal));
  await pg.evaluate(() => opGoStep('done')); await pg.waitForTimeout(900);
  const nb = await pg.evaluate(() => { const n = document.getElementById('next'); return { seal: n.classList.contains('seal'), bg: getComputedStyle(n).backgroundColor, t: n.textContent }; });
  ok('피드백1-3 ④ «이대로 저장하기»만 진사 채움', nb.seal && nb.bg === 'rgb(107, 42, 36)' && /이대로 저장하기/.test(nb.t), JSON.stringify(nb));
  await pg.evaluate(() => opGoStep('write')); await pg.waitForTimeout(500);
  ok('피드백1-3 ③ 의 다음 단추는 종전 색', await pg.evaluate(() => !document.getElementById('next').classList.contains('seal')));
  await ctx.close();
  for (const w of [1000, 1150, 1280]) {
    const { ctx: c2, pg: p2 } = await open(w, 900); await next(p2); await next(p2); await p2.waitForTimeout(500); await p2.click('[data-fk="opx:family"]'); await p2.waitForTimeout(400);
    const r = await p2.evaluate(() => { const s = document.querySelector('.pk-side'), g = s.querySelector('.pk-go'), vis = [...s.children].filter((x) => x !== g && x.offsetParent), last = vis[vis.length - 1]; return { gap: Math.round(g.getBoundingClientRect().top - last.getBoundingClientRect().bottom), prepLeft: !!document.querySelector('.pk-fp-main .pk-prep-pc'), prepSide: !!s.querySelector('.pk-tm.pco') }; });
    ok(`피드백1-2 PC ${w} 오른쪽 칸 — 단추 위 16px 이상 · 준비 줄은 그림 아래 [PC_SIDE_AIR]`, r.gap >= 16 && r.prepLeft && !r.prepSide, JSON.stringify(r));
    await c2.close();
  }
  ok('피드백1-4 케이크 · 축배 창 설명에 «하나만 해도 돼요» [TOAST_ONE_OR]', /케이크나 축배 하나만 해도 돼요\(② 보고 듣기에서 골라요\)\./.test(O.CARDS.toast.one));
});
await br.close(); srv.close();
console.log(fail ? `\n결과 — 실패 ${fail}건` : '\n결과 — 전부 통과'); process.exit(fail ? 1 : 0);
