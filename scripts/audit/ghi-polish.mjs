// [GHI 2026-09-26 코워크 최종판 5장] ② ③ ④ 다듬기 — 실브라우저로 잰다.
//
//   node scripts/audit/ghi-polish.mjs        # 390 · 1280
//
// 보는 것(최종판 5장 그대로)
//   G4 입장 줄 — 맺는 말(여섯)은 «더 고르기» 뒤 · 누르면 열리고 초점은 고른 칩 · 바꿔 둔 뒤면 열린 채 [ENTRY_OUT_MORE]
//   G5 «이렇게 흘러요» — «위하여» 줄이 잔 드는 큐 뒤(붓기 · 커팅 앞 아님) [TOAST_TALK_GLASS]
//      말 없는 줄(옅게 · 소리 없음 · 재생 목록 밖) [QUIET_LINES] · 첫 줄 이름(화촉 «여는 말» · 선언 «선언 · 나레이션(엄숙하게)») [FIRST_LINE_NAME]
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
  await pg.evaluate(() => { LS.open = 'entry'; LS.more = {}; S.entryOut = ''; render(); }); await pg.waitForTimeout(300);
  const g4 = await pg.evaluate(() => { const r = document.querySelector('.ls-row.open'); const b = r && r.querySelector('[data-fk="lsmore:entry"]');
    return { btn: !!b, txt: b ? b.textContent : '', h: b ? Math.round(b.getBoundingClientRect().height) : 0, outRow: !!(r && r.querySelector('[role=radiogroup][aria-label="맺는 말"]')), rows: r ? r.querySelectorAll('[role=radiogroup]').length : 0 }; });
  ok(`${w} G4 입장 줄 — 맺는 말은 «더 고르기» 뒤 · 누를 곳 44 · 첫 화면 묶음 셋 [ENTRY_OUT_MORE]`, g4.btn && !g4.outRow && g4.rows === 3 && /더 고르기 · 맺는 말/.test(g4.txt) && g4.h >= 44, JSON.stringify(g4));
  if (g4.btn) { await pg.click('[data-fk="lsmore:entry"]'); await pg.waitForTimeout(400); }   // 단추가 없으면(깨졌으면) 다음 검사가 빨강으로 말한다 — 여기서 멈추지 않는다
  const g4b = await pg.evaluate(() => { const r = document.querySelector('.ls-row.open'), g = r && r.querySelector('[role=radiogroup][aria-label="맺는 말"]'), a = document.activeElement;
    return { open: !!g, n: g ? g.querySelectorAll('[role=radio]').length : 0, foc: !!(g && g.contains(a) && a.getAttribute('aria-checked') === 'true'), btn: !!(r && r.querySelector('[data-fk="lsmore:entry"]')) }; });
  ok(`${w} G4 «더 고르기»를 누르면 맺는 말 여섯이 열리고 초점은 고른 칩`, g4b.open && g4b.n === 6 && g4b.foc && !g4b.btn, JSON.stringify(g4b));
  await pg.evaluate(() => { LS.more = {}; S.entryOut = 'C'; render(); }); await pg.waitForTimeout(300);
  ok(`${w} G4 기본이 아닌 맺는 말을 골라 뒀으면 열린 채(고른 것이 숨지 않게)`, await pg.evaluate(() => !!document.querySelector('.ls-row.open [role=radiogroup][aria-label="맺는 말"]') && !document.querySelector('[data-fk="lsmore:entry"]')));
  await pg.evaluate(() => { S.entryOut = ''; LS.more = {}; LS.open = null; render(); });
  // G5 이렇게 흘러요 — 예시 넷 × 축배 판 셋 × 와인 셋
  const g5 = await pg.evaluate(() => {
    const R = RitualOpen, keep = JSON.parse(JSON.stringify(S)), bad = [], seen = {};
    R.EXAMPLES.forEach((ex) => { ['both', 'toast', 'cake'].forEach((t) => { ['mix', 'family', 'none'].forEach((wn) => {
      R.applyExample(S, ex.k); R.setChip(S, 'toast', t); R.setChip(S, 'wine', wn);
      const st = _lSteps(ENG, ['toast']), i = st.findIndex((x) => x.talk && /위하여/.test(x.txt));
      const glass = st.findIndex((x) => LS_GLASS[x.slug]), pour = st.findIndex((x) => /^toast-pour-/.test(x.slug || '')), cut = st.findIndex((x) => x.slug === 'toast-both');
      const q = st.filter((x) => x.quiet);
      const k = ex.k + '/' + t + '/' + wn;
      if (t === 'cake') { if (i >= 0) bad.push(k + ' 케이크만인데 위하여'); }
      else { if (i < 0) bad.push(k + ' 위하여 줄 없음'); else if (glass < 0 || i !== glass + 1) bad.push(k + ' 위하여가 잔 드는 큐 바로 뒤가 아님(' + i + '/' + glass + ')'); if (pour >= 0 && i < pour) bad.push(k + ' 붓기 앞'); if (cut >= 0 && i < cut) bad.push(k + ' 커팅 앞'); }
      const want = wn === 'family' ? '양가 와인을 한 잔에 모아요' : '두 분이 고른 와인을 한 잔에 부어요';   // [POUR_BY_PICK] 판 이름과 같은 말
      const pq = q.filter((x) => /한 잔에 (부어요|모아요)/.test(x.txt)), pOk = pq.length === 1 && pq[0].txt === want;
      if ((t !== 'cake' && wn !== 'none') ? !pOk : pq.length !== 0) bad.push(k + ' 붓기 옅은 줄 ' + pq.map((x) => x.txt).join('/'));
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
    S.entryScene = 'bow'; out.bow = _lSteps(ENG, ['entry']).filter((x) => x.quiet).map((x) => x.txt).join('');
    out.lq = LP.q.filter ? true : true;
    Object.assign(S, JSON.parse(JSON.stringify(keep))); delete S.entryScene; if (keep.entryScene) S.entryScene = keep.entryScene;
    return out;
  });
  ok(`${w} G5 말 없는 줄 — 순간마다 하나 · 표 그대로 [QUIET_LINES]`, g5b.candle.length === 1 && /이 앞으로 나와 불을 밝혀요 · 말 없이$|가 앞으로 나와 불을 밝혀요 · 말 없이$/.test(g5b.candle[0])
    && g5b.entry[0] === '두 분이 함께 걸어 들어와요 → 서로 바라봐요' && g5b.bow === '두 분이 함께 걸어 들어와요 → 맞절해요'
    && g5b.ring[0] === '두 분이 서로 반지를 끼워요 · 말 없이' && g5b.declare[0] === '하객 박수 · 두 분이 부부가 돼요' && g5b._close[0] === '두 분이 하객께 목례 · 박수'
    && g5b.fams === 'solemn:1,warm:1,clap:1,family:1', JSON.stringify(g5b));
  ok(`${w} G5 첫 줄 이름 — 화촉 «여는 말» · 선언 «선언 · 나레이션(엄숙하게)» [FIRST_LINE_NAME]`, g5b.labs.candle === '여는 말' && g5b.labs.declare === '선언 · 나레이션(엄숙하게)', JSON.stringify(g5b.labs));
  await pg.evaluate(() => { LS.open = 'toast'; render(); }); await pg.waitForTimeout(300);
  const g5c = await pg.evaluate(() => { const li = [...document.querySelectorAll('.ls-row.open .ls-flow li')];
    return { txt: li.map((l) => (l.className ? '[' + l.className + ']' : '') + l.textContent), quietColor: (() => { const q = document.querySelector('.ls-row.open .ls-flow li.quiet'); return q ? getComputedStyle(q).color : ''; })() }; });
  const wi = g5c.txt.findIndex((t) => /위하여/.test(t)), pi = g5c.txt.findIndex((t) => /양가 와인을 한 잔에 모아요/.test(t)), gi = g5c.txt.findIndex((t) => /축배 · 잔을 들고 선창/.test(t));
  ok(`${w} G5 화면 — 붓기(옅게) → 잔 드는 큐 → «위하여» 순서 · 옅은 줄 색 = --light`, pi >= 0 && gi > pi && wi === gi + 1 && /\[quiet\]/.test(g5c.txt[pi]) && g5c.quietColor === 'rgb(110, 105, 89)', JSON.stringify(g5c));
  ok(`${w} G5 옅은 줄은 재생 목록 · 들을 길이에 안 든다`, await pg.evaluate(() => { const st = _lSteps(ENG, ['toast']), q = st.filter((x) => x.quiet); return q.length === 1 && _lLen(q) === 0; }));
  // H1 · H2 · H3 ③
  await pg.evaluate(() => { S.on.welcome = 1; S.welcome = 'self'; }); await go(pg, 'write');
  const h = await pg.evaluate(() => {
    const st = document.getElementById('stage'), wn = [...st.querySelectorAll('.wn')].map((e) => e.textContent), ta = st.querySelector('textarea[aria-label="첫인사"]');
    const sec = [...st.querySelectorAll('.wr-sec')].find((x) => /^보낼 것/.test((x.querySelector('.wr-sub') || {}).textContent || ''));
    const kids = sec ? [...sec.children].map((c) => c.className + '|' + c.textContent.slice(0, 18)) : [];
    const iHow = kids.findIndex((t) => /^send-how/.test(t)), iLink = kids.findIndex((t) => /^tin/.test(t)), iDrink = kids.findIndex((t) => /축배 음료/.test(t));
    return { wn, ta: !!ta, iHow, iLink, iDrink, kids: kids.length, help: /가족사진 때 친척분들을 불러 모아 주실 분 · 양가 한 분씩 · 마이페이지 «가족\s·\s친구\s스냅»에 적어 두면 디렉터가 먼저 말씀드려요/.test(st.textContent), oldName: /인사말/.test(wn.join('')) };
  });
  ok(`${w} H1 ③ 칸 이름 · aria-label = «첫인사» [H1_FIRST_HELLO]`, h.wn.includes('첫인사') && h.ta && !h.oldName, JSON.stringify(h.wn));
  ok(`${w} H2 ③ 보낼 것 — 링크 칸 → 보내는 길 상자가 붙어 있고 축배 음료 줄은 그 뒤 [H2_SEND_LUMP]`, h.iLink >= 0 && h.iHow > h.iLink && h.iDrink > h.iHow, JSON.stringify(h));
  ok(`${w} H3 ③ 도와주실 분 «불러 모아 주실 분 · «가족 · 친구 스냅»» [H3_CALLER_HELPER]`, h.help);
  const scr = await pg.evaluate(() => { S.welcomeText = '안녕하세요'; return typeof buildScript === 'function' ? buildScript() : (typeof scriptText === 'function' ? scriptText() : ''); });
  if (scr) ok(`${w} H1 대본 줄 «첫인사(두 분 작성):»`, /첫인사\(두 분 작성\):\n안녕하세요/.test(scr) && !/인사말\(두 분 작성\)/.test(scr), scr.slice(0, 80));
  // I1 · I2 · I3 ④
  await go(pg, 'done'); await pg.waitForTimeout(400);
  const d = await pg.evaluate(() => { const hd = document.querySelector('.done-hd .s'), f = document.querySelector('.done-flow'), svg = f && f.querySelector('svg.flow-svg');
    return { s: hd ? hd.textContent : '', svg: !!svg, w: svg ? +svg.getAttribute('width') : 0, h: svg ? +svg.getAttribute('height') : 0, star: svg ? [...svg.querySelectorAll('text')].some((t) => /^★ /.test(t.textContent)) : false,
      names: svg ? svg.querySelectorAll('text').length : 0, fw: f ? Math.round(f.getBoundingClientRect().width) : 0,
      edit: [...document.querySelectorAll('.done-edit')].map((e) => e.textContent), ow: document.documentElement.scrollWidth - innerWidth }; });
  ok(`${w} I1 ④ 머리 «담은 순간 N · 본식 약 … · 단체 사진 약 …» [I1_HEAD]`, /^담은 순간 \d+ · 본식 약 \d+~\d+분 · 단체 사진 약 \d+~\d+분$/.test(d.s), d.s);
  ok(`${w} I2 ④ 감동 흐름 그림 — ★ 이름 · 폭 맞춤${w >= 1000 ? ' · 순간 이름 · 높이 150' : ' · 높이 112'} [I2_DONE_FLOW]`, d.svg && d.star && Math.abs(d.w - d.fw) <= 2 && (w >= 1000 ? (d.h === 150 && d.names > 3) : d.h === 112), JSON.stringify(d));
  ok(`${w} I3 ④ «순서는 예식 14일 전까지, 글은 예식 7일 전까지 고칠 수 있어요.» 한 번 [I3_EDIT_WINDOW]`, d.edit.length === 1 && d.edit[0] === '순서는 예식 14일 전까지, 글은 예식 7일 전까지 고칠 수 있어요.', JSON.stringify(d.edit));
  ok(`${w} ④ 가로 넘침 0`, d.ow <= 0, d.ow);
  ok(`${w} pageerror 0`, errs.length === 0, errs.slice(0, 2).join(' | '));
  } catch (e) { ok(`${w} 끝까지 돌았다`, false, String(e.message || e).split('\n')[0]); }
  await ctx.close();
}
await br.close(); srv.close();
console.log(fail ? `GHI 실패 ${fail}건` : 'GHI OK');
process.exit(fail ? 1 : 0);
