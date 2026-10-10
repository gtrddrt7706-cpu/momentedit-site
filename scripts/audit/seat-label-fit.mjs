// ★[SEAT_LABEL_FIT · SEAT_NAME_BELOW · SEAT_LABEL_CLAMP · IME_QUIET 2026-10-09 고객 여정 A~Z 점검 2라운드 D2-1 ~ D2-3] 하객 좌석 화면(seat.html · guide.html)을 실제로 그려 잰다.
//   ① 표 이름 — 부부가 붙인 이름(«신부 대학 동기» · «Bride Friends Table» · 24자)은 원 «아래» 한 줄(.tbl-cap · .gr-cap) · 원 안 이름(.tbl-nm)은 없다 ·
//      seat 번호 배지는 원 가운데 · guide 번호 칸(.gr-no)에는 번호만 · 표 이름 줄은 제 칸(열) 안 · 이름표 · 다른 표 이름과 안 겹친다
//   ② 이름표 칸 — 1 ~ 6명 표 × 긴 이름(5자 · 6자 · 영문) × 폭 320 · 360 · 390 · 412 · 1280: 같은 표 이름표끼리 · 번호(배지)와 · 다른 표 이름표와 안 겹치고
//      제 칸(카드 끝 · 통로)을 넘지 않는다 · 배치도가 가로로 밀리지 않는다 · «내 자리만» 검색 결과(seat mineRoomHtml · guide seatRoomHtml)의 알약도 같다
//   ③ 한글 조합 — ㄱ → 기 → 김 → 김ㅁ … 조합 중에는 «찾지 못했어요»가 안 뜨고 화면이 안 뛴다 · 이름 하나에 서버 검색은 한 번(seat · guide «내 자리만») ·
//      조합이 안 끝난 채 손을 멈춰도(폰 키보드) 잠시 뒤 한 번 찾는다
//   SLF_ROOT=<다른 폴더> 로 돌리면 그 판을 잰다(되돌리면 빨강 확인용). 종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = process.env.SLF_ROOT || path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.ico': 'image/x-icon' };
const srv = http.createServer((q, r) => { let u = decodeURIComponent(q.url.split('?')[0]); if (/^\/g\/[A-Za-z0-9_-]+\/?$/.test(u)) u = '/guide.html';
  const p = path.join(ROOT, u); if (!p.startsWith(ROOT)) { r.writeHead(404); return r.end(); }
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port;
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const COUPLE = { groom: '김도현', bride: '정하윤', date: '2027-10-23' };
const NAMES = {
  k5: '크리스토퍼 알렉산드라 남궁민수정 제갈현우진 엘리자베스 큰어머니님 이모부부님 김민수부부 박지영가족 외할머니님'.split(' '),
  k6: '외삼촌김철수 큰어머니박씨 이모부이정훈 제갈공명선생 남궁민수부부 신랑대학동기 신부회사동료 김민수아버님 박지영어머님 고모할머니님'.split(' '),
  en: 'Michael Jennifer Tom Emma Christopher Olivia Daniel Sophie William Grace'.split(' '),
};
const TNAMES = ['신부 대학 동기', '회사 동료 · 신랑 팀장님', 'Bride Friends Table', '신랑측가족친지석', '양가부모님석', '가'.repeat(24)];
// 좌우 각 열에 1 ~ 6명 표를 두 번씩(엇갈림 + · −) · 표 이름은 번갈아 붙인다(없는 표도 섞는다)
function layout(ns) { let ni = 0, ti = 0; const names = NAMES[ns]; const nm = () => names[(ni++) % names.length]; const L = [], R = [];
  for (const n of [1, 2, 3, 4, 5, 6]) for (let k = 0; k < 2; k++) for (const side of ['L', 'R']) { const t = { name: (ti % 3 === 2) ? '' : TNAMES[ti % TNAMES.length], side, seats: Array.from({ length: n }, nm) }; ti++; (side === 'L' ? L : R).push(t); }
  const out = []; for (let i = 0; i < L.length; i++) { out.push(L[i]); out.push(R[i]); } return out; }

async function open(url, w, gas, mobile) {
  const ctx = await br.newContext({ viewport: { width: w, height: 900 }, isMobile: !!mobile, hasTouch: !!mobile });
  await ctx.addInitScript('window.__ME_PREVIEW_GUARD_TEST_OFF = true;');
  const qs = [];
  await ctx.route('**/*', async (rt) => { const u = rt.request().url();
    if (u.includes('script.google.com')) { let b = {}; try { b = JSON.parse(rt.request().postData() || '{}'); } catch {} if (b.q) qs.push(b.q);
      const r = await gas(b.action || '', b); return rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: JSON.stringify(r) }); }
    if (u.startsWith(BASE)) return rt.continue();
    return rt.fulfill({ status: 200, body: '' }); });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(BASE + url, { waitUntil: 'load' });
  return { ctx, page, errs, qs };
}

// 배치도 하나(그 문서의 모든 .tbl · .gr-tbl)를 잰다 — 숫자는 px · 0.5 넘게 겹치면 센다
const MEASURE = `(() => {
  const W = document.documentElement.clientWidth;
  const R = (e) => e.getBoundingClientRect();
  const ix = (a, c) => Math.min(a.right, c.right) - Math.max(a.left, c.left), iy = (a, c) => Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
  const hit = (a, c, m) => ix(a, c) > (m || 0.5) && iy(a, c) > (m || 0.5);
  const txt = (e) => (e.textContent || '').trim().slice(0, 14);
  const textRect = (el) => { const rg = document.createRange(); rg.selectNodeContents(el); const rs = [...rg.getClientRects()].filter((r) => r.width); if (!rs.length) return null;
    return { left: Math.min(...rs.map((r) => r.left)), right: Math.max(...rs.map((r) => r.right)), top: Math.min(...rs.map((r) => r.top)), bottom: Math.max(...rs.map((r) => r.bottom)) }; };
  const out = { pair: [], center: [], col: [], cross: [], cap: [], dot: [], nm: document.querySelectorAll('.tbl-nm').length, grNoKids: 0, room: [], n: 0 };
  const all = [];
  document.querySelectorAll('.tbl, .gr-tbl').forEach((t, ti) => {
    const col = t.closest('.col, .gr-col'); const cb = col ? R(col) : null;
    const labs = [...t.querySelectorAll('.seat:not(.seat-li), .gr-nm:not(.gr-li), .gr-me')]; out.n += labs.length;
    const cen = t.querySelector('.tbl-no') ? R(t.querySelector('.tbl-no')) : (t.querySelector('.gr-no') ? textRect(t.querySelector('.gr-no')) : null);
    if (t.querySelector('.gr-no') && t.querySelector('.gr-no').children.length) out.grNoKids++;
    const dots = [...t.querySelectorAll('.seat-dot, .gr-dot')].map(R);
    const bs = labs.map(R);
    for (let i = 0; i < bs.length; i++) { all.push({ ti, b: bs[i], n: txt(labs[i]) });
      for (let j = i + 1; j < bs.length; j++) if (hit(bs[i], bs[j])) out.pair.push(txt(labs[i]) + '×' + txt(labs[j]) + ' ' + Math.round(ix(bs[i], bs[j])));
      if (cen && hit(bs[i], cen)) out.center.push(txt(labs[i]) + '×번호 ' + Math.round(ix(bs[i], cen)) + 'x' + Math.round(iy(bs[i], cen)));
      if (cb && (bs[i].left < cb.left - 0.5 || bs[i].right > cb.right + 0.5)) out.col.push(txt(labs[i]) + ' 칸 밖 ' + Math.round(Math.max(cb.left - bs[i].left, bs[i].right - cb.right)));
      for (const d of dots) if (hit(bs[i], d, 1)) out.dot.push(txt(labs[i]) + '×점');
    }
    // 표 이름 줄 — 원 아래(다음 형제) 한 줄 · 제 칸 안
    const cap = t.parentElement && t.parentElement.querySelector(':scope > .tbl-cap, :scope > .gr-cap');
    if (cap) { const c = R(cap); const lh = parseFloat(getComputedStyle(cap).lineHeight) || 16;
      if (c.height > lh * 1.5) out.cap.push('두 줄 «' + txt(cap) + '» ' + Math.round(c.height));
      if (c.top < R(t).bottom - 0.5) out.cap.push('원 안쪽 «' + txt(cap) + '»');
      if (cb && (c.left < cb.left - 0.5 || c.right > cb.right + 0.5)) out.cap.push('칸 밖 «' + txt(cap) + '»');
      all.push({ ti: 'cap' + ti, b: c, n: '[' + txt(cap) + ']' }); }
  });
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) { if (all[i].ti === all[j].ti) continue; if (hit(all[i].b, all[j].b)) out.cross.push(all[i].n + '×' + all[j].n); }
  document.querySelectorAll('.room, .gr-room').forEach((r) => { const p = r.closest('.mtb-wrap') || r; if (p.scrollWidth - p.clientWidth > 1) out.room.push('가로로 밀림 ' + (p.scrollWidth - p.clientWidth)); });
  out.pageSW = document.documentElement.scrollWidth - W;
  return out;
})()`;
const bad = (m) => m.pair.length + m.center.length + m.col.length + m.cross.length + m.cap.length + m.dot.length + m.room.length + (m.pageSW > 0 ? 1 : 0);
const brief = (m) => JSON.stringify({ pair: m.pair.slice(0, 3), center: m.center.slice(0, 3), col: m.col.slice(0, 3), cross: m.cross.slice(0, 3), cap: m.cap.slice(0, 3), dot: m.dot.slice(0, 3), room: m.room.slice(0, 2), pageSW: m.pageSW });

try {
  // ── ① · ② 전체 배치도(seat) · 전체 공개 좌석표(guide)
  const sum = { seat: { n: 0, bad: 0, ex: '' }, guide: { n: 0, bad: 0, ex: '' } }; let capN = 0, capInfo = { nm: 0, grNoKids: 0 };
  for (const w of [320, 360, 390, 412, 1280]) {
    const s = await open('/seat.html?t=T1234567890ab', w, async (a) => (a === 'seatView' ? { ok: true, seat: { ...COUPLE, tables: layout('k5') } } : { ok: true }));
    await s.page.waitForSelector('.room .tbl', { timeout: 8000 }).catch(() => {}); await wait(250);
    const g = await open('/guide.html?g=t_real_1', w, async (a) => (a === 'guideView' ? { ok: true, guide: { ...COUPLE, seatToken: 'stok', seatFull: true, dining: { on: false }, photoShare: '' } } : a === 'seatView' ? { ok: true, seat: { ...COUPLE, tables: layout('k5') } } : { ok: true }));
    await g.page.waitForSelector('.gr-room .gr-tbl', { timeout: 8000 }).catch(() => {}); await wait(250);
    for (const ns of ['k5', 'k6', 'en']) {
      await s.page.evaluate((t) => render({ ...t }), { ...COUPLE, tables: layout(ns) }); await wait(120);
      const m1 = await s.page.evaluate(MEASURE); sum.seat.n += m1.n; if (bad(m1)) { sum.seat.bad += bad(m1); sum.seat.ex = sum.seat.ex || `${ns}@${w} ` + brief(m1); }
      capN += await s.page.evaluate(() => document.querySelectorAll('.tbl-wrap > .tbl-cap').length); capInfo.nm += m1.nm;
      await g.page.evaluate((t) => { SEAT = t; SEAT_STATE = 'ok'; renderFullMap(); }, { ...COUPLE, tables: layout(ns) }); await wait(120);
      const m2 = await g.page.evaluate(MEASURE); sum.guide.n += m2.n; capInfo.grNoKids += m2.grNoKids; if (bad(m2)) { sum.guide.bad += bad(m2); sum.guide.ex = sum.guide.ex || `${ns}@${w} ` + brief(m2); }
    }
    ok(`pageerror 0 (seat · guide @${w})`, !s.errs.length && !g.errs.length, (s.errs[0] || g.errs[0] || '').slice(0, 120));
    await s.ctx.close(); await g.ctx.close();
  }
  ok('① 표 이름은 원 아래 한 줄 — seat .tbl-cap 이 표 아래에 서고 원 안 이름(.tbl-nm)은 없다 · guide 번호 칸에는 번호만 [SEAT_NAME_BELOW]', capN > 0 && capInfo.nm === 0 && capInfo.grNoKids === 0, JSON.stringify({ capN, ...capInfo }));
  ok(`② seat 전체 배치도 — 이름표 ${sum.seat.n}개 · 겹침 · 번호 덮음 · 칸 밖 · 표 이름 줄 0 [SEAT_LABEL_CLAMP]`, sum.seat.n > 0 && sum.seat.bad === 0, sum.seat.ex);
  ok(`② guide 전체 공개 좌석표 — 이름표 ${sum.guide.n}개 · 겹침 · 번호 덮음 · 칸 밖 0 [SEAT_LABEL_CLAMP]`, sum.guide.n > 0 && sum.guide.bad === 0, sum.guide.ex);

  // ── ② «내 자리만» 검색 결과 — 알약 하나가 어느 자리에 서든
  const room = []; let no = 1; for (const n of [1, 2, 3, 4, 5, 6]) for (const side of ['L', 'R']) room.push({ no: no++, label: (n % 2 ? '신부 대학 동기' : ''), side, occ: Array(n).fill(1) });
  const room2 = [{ no: 1, label: '', side: 'L', occ: [1, 1] }, { no: 2, label: '', side: 'R', occ: [1, 1] }, ...room.map((t, i) => ({ ...t, no: i + 3 }))];
  const mine = { seat: { n: 0, bad: 0, ex: '' }, guide: { n: 0, bad: 0, ex: '' } }; let mineMissing = '';
  for (const w of [320, 390, 412, 1280]) {
    const s = await open('/seat.html?t=T1234567890ab', w, async (a, b) => (a === 'seatView' && !b.q ? { ok: false, mineOnly: true, seat: COUPLE } : { ok: true, mineOnly: true, hits: [] }));
    const g = await open('/guide.html?g=t_real_1', w, async (a, b) => (a === 'guideView' ? { ok: true, guide: { ...COUPLE, seatToken: 'stok', seatFull: false, dining: { on: false }, photoShare: '' } } : { ok: true, mineOnly: true, hits: [] }));
    await s.page.waitForSelector('#fr', { timeout: 8000 }).catch(() => {}); await g.page.waitForSelector('#fr', { timeout: 8000 }).catch(() => {}); await wait(200);
    for (const [pg, P, fn] of [['seat', s.page, 'mineRoomHtml'], ['guide', g.page, 'seatRoomHtml']]) {
      const has = await P.evaluate((f) => typeof window[f] === 'function', fn);
      if (!has) { mineMissing = mineMissing || `${pg}: ${fn} 이 전역에 없다(판을 그려 잴 수 없다)`; continue; }
      for (const R of [room, room2]) for (let ti = 0; ti < R.length; ti++) for (let si = 0; si < R[ti].occ.length; si++) for (const nm of ['외삼촌김철수', 'Christopher Lee', '남궁민수']) {
        const hit = { no: R[ti].no, label: R[ti].label || ('테이블 ' + R[ti].no), side: R[ti].side, hti: ti, mi: [si], nm, room: R };
        const m = await P.evaluate(({ fn, hit, M }) => { const fr = document.getElementById('fr'); fr.innerHTML = window[fn](hit); return eval(M); }, { fn, hit, M: MEASURE });
        mine[pg].n++; if (bad(m)) { mine[pg].bad += bad(m); mine[pg].ex = mine[pg].ex || `${nm} n${R[ti].occ.length} 자리${si}@${w} ` + brief(m); }
      }
    }
    ok(`pageerror 0 (내 자리만 seat · guide @${w})`, !s.errs.length && !g.errs.length, (s.errs[0] || g.errs[0] || '').slice(0, 120));
    await s.ctx.close(); await g.ctx.close();
  }
  ok(`② seat «내 자리만» 알약 ${mine.seat.n}자리 — 번호 · 점 · 칸 밖 · 겹침 0 [SEAT_LABEL_CLAMP]`, !mineMissing && mine.seat.n > 0 && mine.seat.bad === 0, mineMissing || mine.seat.ex);
  ok(`② guide «내 자리» 알약 ${mine.guide.n}자리 — 번호 · 점 · 칸 밖(통로) · 겹침 0 [SEAT_LABEL_CLAMP]`, mine.guide.n > 0 && mine.guide.bad === 0, mine.guide.ex);

  // ── ③ 한글 조합
  const STEPS = [['ㄱ'], ['기'], ['김'], ['commit', '김', 'ㅁ'], ['미'], ['민'], ['commit', '민', 'ㅅ'], ['수'], ['end', '수']];
  const type = async (page, cdp, s) => {
    if (s[0] === 'commit') { await cdp.send('Input.insertText', { text: s[1] }); await cdp.send('Input.imeSetComposition', { text: s[2], selectionStart: 1, selectionEnd: 1 }); }
    else if (s[0] === 'end') await cdp.send('Input.insertText', { text: s[1] });
    else await cdp.send('Input.imeSetComposition', { text: s[0], selectionStart: 1, selectionEnd: 1 });
  };
  const N6 = '박지영 이서준 최유나 정우성 한지민 오세훈 윤아름 장도윤 임하늘 박민준 이민호 최서윤 정다은 강민지 조현우 윤서진 장하은 이도윤 박서준 최민서 정하준 한예린 오지후 윤하늘 장서연 이준호 김민수 박하윤 김서진 이하율'.split(' ');
  const T6 = []; { let ni = 0; for (let i = 0; i < 6; i++) T6.push({ name: '', side: i % 2 ? 'R' : 'L', seats: Array.from({ length: 5 }, () => N6[(ni++) % N6.length]) }); }
  {
    const s = await open('/seat.html?t=T1234567890ab', 390, async (a) => (a === 'seatView' ? { ok: true, seat: { ...COUPLE, tables: T6 } } : { ok: true }), true);
    await s.page.waitForSelector('.room .tbl', { timeout: 8000 }).catch(() => {}); await wait(300);
    await s.page.focus('#q'); const cdp = await s.ctx.newCDPSession(s.page); const y0 = await s.page.evaluate(() => Math.round(scrollY)); const log = [];
    for (const st of STEPS) { await type(s.page, cdp, st); await wait(600); log.push(await s.page.evaluate(() => ({ v: document.getElementById('q').value, fr: document.getElementById('fr').textContent, y: Math.round(scrollY) }))); }
    const mid = log.slice(0, -1), last = log[log.length - 1];
    ok('③ seat 전체 배치도 — 조합 중(ㄱ · 기 · 김 · 김ㅁ …)에는 «찾지 못했어요»가 안 뜨고 화면이 안 뛴다 [IME_QUIET]', mid.every((x) => !/찾지 못했어요/.test(x.fr) && x.y === y0), JSON.stringify(mid.map((x) => [x.v, x.fr.slice(0, 12), x.y])));
    ok('③ seat 전체 배치도 — 조합이 끝나면 한 번 찾아 자리를 말한다(한 사람이면 그 자리로)', /자리예요/.test(last.fr), JSON.stringify(last));
    // 손을 멈춘 채 조합이 안 끝난 경우(폰 키보드) — 잠시 뒤 한 번 찾는다
    await s.page.evaluate(() => { const q = document.getElementById('q'); q.value = ''; q.dispatchEvent(new Event('input')); }); await wait(200);
    await s.page.focus('#q'); await cdp.send('Input.imeSetComposition', { text: '김민수', selectionStart: 3, selectionEnd: 3 }); await wait(1400);
    const stuck = await s.page.evaluate(() => document.getElementById('fr').textContent);
    ok('③ seat — 조합이 안 끝난 채 손을 멈춰도(폰) 0.8초 뒤 한 번 찾는다', /자리예요/.test(stuck), stuck.slice(0, 60));
    ok('pageerror 0 (조합 · seat)', !s.errs.length, (s.errs[0] || '').slice(0, 120));
    await s.ctx.close();
  }
  for (const pg of ['seat', 'guide']) {
    const url = pg === 'seat' ? '/seat.html?t=T1234567890ab' : '/guide.html?g=t_real_1';
    const gas = async (a, b) => (a === 'guideView' ? { ok: true, guide: { ...COUPLE, seatToken: 'stok', seatFull: false, dining: { on: false }, photoShare: '' } }
      : a === 'seatView' ? (b.q ? { ok: true, mineOnly: true, hits: [] } : { ok: false, mineOnly: true, seat: COUPLE }) : { ok: true });
    const s = await open(url, 390, gas, true);
    await s.page.waitForSelector('#q', { timeout: 8000 }).catch(() => {}); await wait(300);
    await s.page.focus('#q'); const cdp = await s.ctx.newCDPSession(s.page);
    for (const st of STEPS) { await type(s.page, cdp, st); await wait(600); }
    await wait(700);
    ok(`③ ${pg} «내 자리만» — 이름 하나(김민수)를 조합해 치는 동안 서버 검색은 한 번 [IME_QUIET]`, s.qs.length === 1 && s.qs[0] === '김민수', JSON.stringify(s.qs));
    ok(`pageerror 0 (조합 · ${pg} 내 자리만)`, !s.errs.length, (s.errs[0] || '').slice(0, 120));
    await s.ctx.close();
  }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nSEAT LABEL FIT FAIL ${fail}` : '\nSEAT LABEL FIT OK'); process.exit(fail ? 1 : 0);
