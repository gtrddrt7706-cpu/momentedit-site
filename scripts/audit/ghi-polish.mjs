// [GHI 2026-09-26 코워크 최종판 5장] ② ③ ④ 다듬기 — 실브라우저로 잰다.
//
//   node scripts/audit/ghi-polish.mjs        # 390 · 1280
//
// 보는 것(최종판 5장 그대로)
//   G4 입장 줄 — 맺는 말 · 첫 모습은 걷었다 [ENTRY_OUT_OFF] (옛 [ENTRY_OUT_MORE] 더 고르기 판은 없다)
//   G5 «이렇게 흘러요» — «위하여» 줄이 잔 드는 큐 뒤(붓기 · 커팅 앞 아님) [TOAST_TALK_GLASS]
//      말 없는 줄(옅게 · 소리 없음 · 재생 목록 밖) [QUIET_LINES] · 첫 줄 이름(화촉 «여는 말» · 선언 «선언 · 엄숙하게» · R3-10) [FIRST_LINE_NAME]
//   H1 ③ 칸 이름 · aria-label · 대본 줄 = «첫인사» [H1_FIRST_HELLO]
//   H2 ③ 보낼 것 — 식전 영상(링크 칸 · 설명 · 보내는 길 상자)이 한 덩어리 · 축배 음료 줄은 그 뒤 [H2_SEND_LUMP]
//   H3 ③ 도와주실 분 — 불러 모아 주실 분(«가족 · 친구 스냅») [H3_CALLER_HELPER]
//   I1 ④ 머리 «담은 순간 N · 본식 … · 단체 사진 …» [I1_HEAD] · I2 감동 흐름 그림(★ · 넓으면 이름) [I2_DONE_FLOW] · I3 고칠 수 있는 때 [I3_EDIT_WINDOW]
//
// ★종료 코드 [CANT_LOOK] 0 = 통과 · 1 = 실패 · 2 = 재지 못함(도구 없음)
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0;
const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br;
try { br = await pw.chromium.launch(); } catch (e) { console.log('못 쟀다 — 브라우저를 못 띄웠다'); srv.close(); process.exit(2); }

async function open(w) {
  const ctx = await br.newContext({ viewport: { width: w, height: 844 } });
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await pg.waitForTimeout(600);
  for (let i = 0; i < 5; i++) { if ((await pg.evaluate(() => STEPS[idx] && STEPS[idx].k)) === 'pick') break; await pg.click('#next'); await pg.waitForTimeout(450); }
  return { ctx, pg, errs };
}
const go = async (pg, k) => { await pg.evaluate((k) => { idx = STEPS.findIndex((s) => s.k === k); render(); }, k); await pg.waitForTimeout(500); };

for (const w of [390, 1280]) {
  const { ctx, pg, errs } = await open(w);
  try {
  // [UNDO_CLOSE_ON_TGL 코워크 회신7 #868-1] 예시 → 6초 안에 ＋ → 되돌리기 알림이 닫힌다(남으면 눌러도 아무 일 없는 단추)
  await pg.click('[data-fk="opx:record"]'); await pg.waitForTimeout(300);
  const u0 = await pg.evaluate(() => { const u = document.getElementById('pkUndo'); return !!u && !u.hidden; });
  await pg.click('[data-fk="opt:letter"]'); await pg.waitForTimeout(300);
  const u1 = await pg.evaluate(() => { const u = document.getElementById('pkUndo'); return { shown: !!u && !u.hidden, letter: !!(S.on && S.on.letter) }; });
  ok(`${w} ① 예시 → ＋ 담기 → 되돌리기 알림이 닫힌다 · 담은 것은 그대로 [UNDO_CLOSE_ON_TGL]`, u0 && !u1.shown && u1.letter, JSON.stringify({ u0, u1 }));
  await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(500);
  await go(pg, 'listen');
  // G4 입장 줄
  /* [FLOW_MAKE 2026-09-27] ② 는 순간마다 한 쪽 — 옛 목록 줄(.ls-row.open) 대신 그 순간 쪽(.mk-pg)에서 잰다 */
  /* ★★[ENTRY_OUT_OFF 2026-10-02 사장님 지시] 맺는 말 · 첫 모습을 걷었다 — 입장 쪽 묶음은 입장 멘트(+ AI 가 켜지면 «어떻게 준비할까요»)뿐 · «더 고르기»도 없다 */
  await pg.evaluate(() => { LS.more = {}; S.entryOut = ''; mkGo('entry'); }); await pg.waitForTimeout(300);
  const g4 = await pg.evaluate(() => { const r = document.querySelector('.mk-pg'); const b = r && r.querySelector('[data-fk="lsmore:entry"]');
    return { btn: !!b, outRow: !!(r && r.querySelector('[role=radiogroup][aria-label="맺는 말"]')), scene: !!(r && r.querySelector('[role=radiogroup][aria-label="첫 모습"]')), rows: r ? r.querySelectorAll('[role=radiogroup]').length : 0, vc: !!RitualOpen.FEATURE.voiceClone, bow: /맞절/.test(r ? r.textContent : '') }; });
  ok(`${w} G4 입장 쪽 — 맺는 말 · 첫 모습 · 더 고르기 · «맞절» 없음 · 묶음 하나(AI 가 켜지면 둘) [ENTRY_OUT_OFF · VP_NO_DIRECT]`, !g4.btn && !g4.outRow && !g4.scene && !g4.bow && g4.rows === (g4.vc ? 2 : 1), JSON.stringify(g4));
  // G5 이렇게 흘러요 — 예시 넷 × 축배 판 셋 × 와인 셋
  const g5 = await pg.evaluate(() => {
    const R = RitualOpen, keep = JSON.parse(JSON.stringify(S)), bad = [], seen = {};
    R.EXAMPLES.forEach((ex) => { ['both', 'toast', 'cake'].forEach((t) => { ['mix', 'family', 'none'].forEach((wn) => {
      R.applyExample(S, ex.k); if (t === 'cake') { S.on.cake = 1; delete S.on.toast; } else if (t === 'toast') { delete S.on.cake; S.on.toast = 1; } else { S.on.cake = 1; S.on.toast = 1; } S.toast = R.toastMode(S); R.setChip(S, 'wine', wn);   // [CAKE_TOAST_SPLIT] 판 = 담은 두 칸
      const st = _lSteps(ENG, ['cake', 'toast'].filter((x) => R.onOf(S, x))) /* 담은 칸만(빼 둔 순간은 미리 듣기로 불린다) */, i = st.findIndex((x) => x.talk && /위하여/.test(x.txt));
      const glass = st.findIndex((x) => LS_GLASS[x.slug]), pour = st.findIndex((x) => /^toast-pour-/.test(x.slug || '')), cut = st.findIndex((x) => x.slug === 'toast-both');
      const q = st.filter((x) => x.quiet);
      const k = ex.k + '/' + t + '/' + wn;
      if (t === 'cake') { if (i >= 0) bad.push(k + ' 케이크만인데 위하여'); }
      else { if (i < 0) bad.push(k + ' 위하여 줄 없음'); else if (glass < 0 || i !== glass + 1) bad.push(k + ' 위하여가 잔 드는 큐 바로 뒤가 아님(' + i + '/' + glass + ')'); if (pour >= 0 && i < pour) bad.push(k + ' 붓기 앞'); if (cut >= 0 && i < cut) bad.push(k + ' 커팅 앞'); }
      const want = wn === 'family' ? '양가 와인을 한 잔에 모아요' : '두 분이 고른 와인을 한 잔에 부어요';   // [POUR_BY_PICK] 판 이름과 같은 말
      const pq = q.filter((x) => /한 잔에 (부어요|모아요)/.test(x.txt)), pOk = pq.length === 1 && pq[0].txt === want;
      if (pq.length !== 0 || pour >= 0) bad.push(k + ' [WINE_POUR_OFF] 붓기 줄이 남았다 ' + pq.map((x) => x.txt).join('/'));   // 와인 붓기는 걷었다(2026-09-27 사장님) · 어느 값이 와도 없다
      seen[k] = 1;
    }); }); });
    Object.assign(S, keep); render();
    return { bad, n: Object.keys(seen).length };
  });
  ok(`${w} G5 «위하여» 줄은 잔 드는 큐 바로 뒤 · 케이크만이면 없음 · 붓는 판에만 붓기 줄 · 판마다 제 말 [POUR_BY_PICK] (${g5.n}조합) [TOAST_TALK_GLASS]`, g5.n === 36 && g5.bad.length === 0, g5.bad.slice(0, 4).join(' | '));
  const g5b = await pg.evaluate(() => {
    const R = RitualOpen, keep = JSON.parse(JSON.stringify(S)), out = {};
    R.applyExample(S, 'family'); S.on.ring = 1; S.on.declare = 1; S.on.candle = 1;
    const ks = ['candle', 'entry', 'ring', 'declare', 'toast', '_close'], st = _lSteps(ENG, ks);
    ks.forEach((k) => { out[k] = st.filter((x) => x.k === k && x.quiet).map((x) => x.txt); });
    out.labs = { candle: (st.find((x) => x.k === 'candle' && !x.quiet && !x.talk) || {}).lab, declare: (st.find((x) => x.k === 'declare' && !x.quiet && !x.talk) || {}).lab };
    const fams = []; ['solemn', 'warm', 'clap', 'family'].forEach((d) => { R.setChip(S, 'declare', d); const q = _lSteps(ENG, ['declare']).filter((x) => x.quiet); fams.push(d + ':' + q.length); });
    out.fams = fams.join(',');
    S.entryScene = 'bow'; out.bow = _lSteps(ENG, ['entry']).filter((x) => x.quiet).map((x) => x.txt).join('');   // [ENTRY_OUT_OFF] 옛 초안의 bow 도 같은 줄
    out.lq = LP.q.filter ? true : true;
    Object.assign(S, JSON.parse(JSON.stringify(keep))); delete S.entryScene; if (keep.entryScene) S.entryScene = keep.entryScene;
    return out;
  });
  ok(`${w} G5 말 없는 줄 — 순간마다 하나 · 표 그대로([R1-45] 입장 · 반지는 위 설명과 겹치지 않게) [QUIET_LINES]`, g5b.candle.length === 1 && /이 앞으로 나와 불을 밝혀요 · 말 없이$|가 앞으로 나와 불을 밝혀요 · 말 없이$/.test(g5b.candle[0])
    && g5b.entry.length === 1 && g5b.entry[0] === '음악에 맞춰 걸어 들어와요' && g5b.bow === '음악에 맞춰 걸어 들어와요'
    && g5b.ring[0] === '두 분이 서로 반지를 끼워요' && g5b.declare[0] === '하객이 박수로 축하해요' /* [STAGE_LINES 2026-10-06] 종전 «하객 박수 · 두 분이 부부가 돼요» */ && g5b._close[0] === '두 분이 하객께 목례 · 박수'
    && g5b.fams === 'solemn:1,warm:1,clap:2,family:1' /* [STAGE_LINES] 박수판 = 증인의 박수 + 축하 박수 */, JSON.stringify(g5b));
  ok(`${w} G5 첫 줄 이름 — 화촉 «시작할 때» · 선언 «성혼 선언문 · 엄숙하게»(R3-10 · STAGE_LINES) [FIRST_LINE_NAME]`, g5b.labs.candle === '시작할 때' && g5b.labs.declare === '성혼 선언문 · 엄숙하게' /* [STAGE_LINES 2026-10-06] 줄 이름 = 언제 · 선언문이 곧 선언 */   /* [R3-10] 갈래 표가 «나레이션»이라 이름에서 뺐다 */, JSON.stringify(g5b.labs));
  await pg.evaluate(() => mkGo('toast')); await pg.waitForTimeout(300);
  const g5c = await pg.evaluate(() => { const li = [...document.querySelectorAll('.mk-pg .mk-flow li')];
    return { txt: li.map((l) => { const c = l.cloneNode(true); c.querySelectorAll('.vk').forEach((v) => v.remove()); return (l.className === 'q' ? '[quiet]' : '') + c.textContent; }), quietColor: (() => { const q = document.querySelector('.mk-pg .mk-flow li.q'); return q ? getComputedStyle(q).color : ''; })() }; });
  /* [FLOW_MAKE] ② 쪽 흐름에서 «위하여»는 두 분 차례(«신랑 차례» · 글은 연습에서 흐른다) — 잔 드는 큐 바로 뒤에 온다 */
  const wi = g5c.txt.findIndex((t) => /^신랑 차례/.test(t)), pi = g5c.txt.findIndex((t) => /한 잔에 (모아요|부어요)/.test(t)), gi = g5c.txt.findIndex((t) => /축배 · 잔을 들고 선창/.test(t));
  ok(`${w} G5 화면 — 잔 드는 큐 → «위하여» 순서 · 붓기 줄 없음 [WINE_POUR_OFF]`, pi < 0 && gi >= 0 && wi === gi + 1, JSON.stringify(g5c));
  /* 옅은 줄의 색 · 재생 길이는 반지 교환 쪽(말 없이 지나가는 줄)에서 잰다 — 축배의 옅은 줄(붓기)은 걷었다 */
  await pg.evaluate(() => { S.on.ring = 1; opSync(); mkGo('ring'); render(); }); await pg.waitForTimeout(300);
  /* ★[FLOW_THREAD 2026-10-07 사장님 → 시안 A «흐름선»] 행동 줄 = 먹빛 · ● 마디 — 종전 «G5 옅은 줄 색 = --light»(QUIET_LINES)는 이 결정으로 바뀌었다(행동이 위 멘트의 각주처럼 읽혔다) · 자세한 잣대는 flow-thread.mjs */
  ok(`${w} G5 행동 줄 = 먹빛 · ● 마디 [FLOW_THREAD]`, await pg.evaluate(() => { const q = document.querySelector('.mk-pg .mk-flow li.q'); return !!q && getComputedStyle(q).color === 'rgb(58, 45, 34)' && getComputedStyle(q, '::after').backgroundColor === 'rgb(107, 42, 36)' /* [FLOW_DOT_SEAL] ● 진사 */; }));
  ok(`${w} G5 옅은 줄은 재생 목록 · 들을 길이에 안 든다`, await pg.evaluate(() => { const st = _lSteps(ENG, ['ring']), q = st.filter((x) => x.quiet); return q.length === 1 && _lLen(q) === 0; }));
  // H1 · H2 · H3 — [FLOW_MAKE] 옛 ③ 준비하기는 걷었다: 첫인사 칸은 ② 첫인사 쪽 · 보낼 길은 ② 식전 영상 쪽 · 도와주실 분은 ② 한눈에 보기
  await pg.evaluate(() => { S.on.welcome = 1; S.welcome = 'self'; S.on.prevideo = 1; opSync(); mkGo('welcome'); }); await pg.waitForTimeout(400);
  const h1 = await pg.evaluate(() => ({ ta: !!document.querySelector('textarea[aria-label="첫인사 · 신랑"]') && !!document.querySelector('textarea[aria-label="첫인사 · 신부"]'), oldName: /인사말/.test(document.getElementById('stage').textContent) }));
  ok(`${w} H1 ② 첫인사 칸 이름 · aria-label = «첫인사 · 신랑/신부» [H1_FIRST_HELLO]`, h1.ta && !h1.oldName, JSON.stringify(h1));
  await pg.evaluate(() => mkGo('prevideo')); await pg.waitForTimeout(300);
  const h2 = await pg.evaluate(() => { const st = document.getElementById('stage'), link = st.querySelector('input[aria-label="식전 영상 링크"]'), how = st.querySelector('.send-how');
    return { link: !!link, how: !!how, order: !!(link && how && (link.compareDocumentPosition(how) & Node.DOCUMENT_POSITION_FOLLOWING)) }; });
  ok(`${w} H2 ② 식전 영상 쪽 — 링크 칸 하나 · 보내는 길 상자 없음 [H2_SEND_LUMP → PREVIDEO_FREE 2026-10-02 사장님 «링크 칸 하나만»]`, h2.link && !h2.how, JSON.stringify(h2));
  await pg.evaluate(() => mkGo('_sum')); await pg.waitForTimeout(300);
  ok(`${w} H3 ② 한눈에 보기 도와주실 분 «불러 모아 주실 분 · «가족 · 친구 스냅»» [H3_CALLER_HELPER]`, await pg.evaluate(() => /가족사진 때 친척분들을 불러 모아 주실 분\s*양가 한 분씩 · 마이페이지 «?가족\s·\s친구\s스냅»?에 적어 두면 디렉터가 먼저 말씀드려요/.test(document.getElementById('stage').textContent)));
  const scr = await pg.evaluate(() => { S.welcomeText = '안녕하세요'; return typeof buildScript === 'function' ? buildScript() : (typeof scriptText === 'function' ? scriptText() : ''); });
  if (scr) ok(`${w} H1 대본 줄 «첫인사(두 분 작성):»`, /첫인사\(두 분 작성\):\n안녕하세요/.test(scr) && !/인사말\(두 분 작성\)/.test(scr), scr.slice(0, 80));
  // I1 · I2 · I3 ④
  await go(pg, 'done'); await pg.waitForTimeout(400);
  const d = await pg.evaluate(() => { const hd = document.querySelector('.done-hd .s'), f = document.querySelector('.done-flow'), svg = f && f.querySelector('svg.flow-svg');
    /* [RIT_WRAP 2026-09-27 4부 22] 화면 글은 «약 · 일 전» 사이가 NBSP 로 묶인다 — 글자로 잴 때는 보통 공백으로 되돌려 잰다 */
    return { s: hd ? hd.textContent.replace(/\u00a0/g, ' ') : '', svg: !!svg, w: svg ? +svg.getAttribute('width') : 0, h: svg ? +svg.getAttribute('height') : 0, star: svg ? [...svg.querySelectorAll('text')].some((t) => /6B2A24/i.test(t.getAttribute('fill') || '') && t.textContent.trim()) && ![...svg.querySelectorAll('text')].some((t) => /★/.test(t.textContent)) : false,   /* [PEAK_COLOR 2026-10-07] ★ 없이 진사 이름 */
      names: svg ? svg.querySelectorAll('text').length : 0, fw: f ? Math.round(f.getBoundingClientRect().width) : 0,
      edit: [...document.querySelectorAll('.done-edit')].map((e) => e.textContent.replace(/\u00a0/g, ' ')), ow: document.documentElement.scrollWidth - innerWidth }; });
  ok(`${w} I1 ④ 머리 «담은 순간 N · 본식 약 … · 단체 사진 약 …» [I1_HEAD]`, /^담은 순간 \d+ · 본식 약 \d+~\d+분 · 단체 사진 약 \d+~\d+분$/.test(d.s), d.s);
  ok(`${w} I2 ④ 감동 흐름 그림 — 진사 이름(★ 없음) · 폭 맞춤${w >= 1000 ? ' · 순간 이름 줄 없음 · 높이 120' : ' · 높이 112'} [I2_DONE_FLOW] · [FLOW_NONAMES 2026-10-07 사장님 «그래프 밑 글씨 빽빽 · 아예 빼기»]`, d.svg && d.star && Math.abs(d.w - d.fw) <= 2 && (w >= 1000 ? (d.h === 120 && d.names <= 1) : d.h === 112), JSON.stringify(d));
  ok(`${w} I3 ④ «순서는 예식 14일 전까지, 글은 예식 7일 전까지 고칠 수 있어요.» 한 번 [I3_EDIT_WINDOW]`, d.edit.length === 1 && d.edit[0] === '순서는 예식 14일 전까지, 글은 예식 7일 전까지 고칠 수 있어요.', JSON.stringify(d.edit));
  ok(`${w} ④ 가로 넘침 0`, d.ow <= 0, d.ow);
  ok(`${w} pageerror 0`, errs.length === 0, errs.slice(0, 2).join(' | '));
  } catch (e) { ok(`${w} 끝까지 돌았다`, false, String(e.message || e).split('\n')[0]); }
  await ctx.close();
}
await br.close(); srv.close();
console.log(fail ? `GHI 실패 ${fail}건` : 'GHI OK');
process.exit(fail ? 1 : 0);
