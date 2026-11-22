// ★[SEAT_LABEL_FIT · SEAT_PLAN_9 · IME_QUIET] 하객 좌석 화면(seat.html · guide.html)을 실제로 그려 잰다.
//   ★[SEAT_PLAN_9 2026-11-22 사장님 «추천대로 적용» · «우리가 그린 그림이랑 다르잖아»] 배치가 확정 배치(맞붙인 원형 9개 · 35석 · assets/seat-plan.js)로 바뀌었다.
//     옛 결정 SEAT_NAME_BELOW(표 이름은 원 아래 한 줄) · SEAT_LABEL_CLAMP(두 열 지그재그 · 칸 끝 넘지 않기)는 이 판에서 은퇴 — 같은 PR 에서 기대를 바꿨다([DECISION_GUARD] 은퇴 길).
//   ① 표 이름 — 부부가 붙인 이름(«신부 대학 동기» · «Bride Friends Table» · 24자)은 원 «안» 번호 아래 두 줄까지(.tcap · .gt-cap) · 원 밖으로 안 나가고 번호와 안 겹친다
//   ② 이름표 — 확정 배치 35자리 × 이름(4자 · 5자 · 6자 · 영문) × 폭 320 · 360 · 390 · 412 · 1280: 이름표끼리 · 번호 · 표 이름과 안 겹치고
//      테이블 원을 지름 10% 넘게 가리지 않고 그림 상자(.smap) 밖으로 안 나간다 · 네 글자 이름은 말줄임 없이 · 쪽은 가로로 안 밀린다(그림 상자 .gmap 만 민다)
//      · 옛 6테이블 데이터도 확정 배치로 옮겨 그려 이름이 하나도 빠지지 않는다 · «내 자리만» 검색 결과(seat mineRoomHtml · guide seatRoomHtml)의 알약도 같다
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
  k4: '사촌동생 작은삼촌 회사동료 큰어머니 외할머니 할아버지 이모부님 김민수님 박지영님 고모부님'.split(' '),
  k5: '크리스토퍼 알렉산드라 남궁민수정 제갈현우진 엘리자베스 큰어머니님 이모부부님 김민수부부 박지영가족 외할머니님'.split(' '),
  k6: '외삼촌김철수 큰어머니박씨 이모부이정훈 제갈공명선생 남궁민수부부 신랑대학동기 신부회사동료 김민수아버님 박지영어머님 고모할머니님'.split(' '),
  en: 'Michael Jennifer Tom Emma Christopher Olivia Daniel Sophie William Grace'.split(' '),
};
const TNAMES = ['신부 대학 동기', '회사 동료 · 신랑 팀장님', 'Bride Friends Table', '신랑측가족친지석', '양가부모님석', '가'.repeat(24)];
const PLAN = [['L', 5], ['L', 3], ['L', 3], ['L', 5], ['R', 4], ['R', 4], ['R', 3], ['R', 3], ['R', 5]];   // assets/seat-plan.js COUNTS 와 한 벌
const PNO = [1, 2, 3, 4, 5, 6, 7, 8, 9];
// 확정 배치 35자리를 다 채운다 · 표 이름은 번갈아 붙인다(없는 표도 섞는다)
function layout(ns) { let ni = 0; const names = NAMES[ns];
  return PLAN.map(([side, n], i) => ({ name: (i % 3 === 2) ? '' : TNAMES[i % TNAMES.length], side, seats: Array.from({ length: n }, () => names[(ni++) % names.length]) })); }
// 옛 좌석표(6테이블 × 5자리 = 30명 · 지난 최대 인원) — 확정 배치로 옮겨 그려야 한다
function legacy() { let ni = 0; const nm = NAMES.k4; return [0, 1, 2, 3, 4, 5].map((i) => ({ name: i === 1 ? '신부 대학 동기' : '', side: i < 3 ? 'L' : 'R', seats: Array.from({ length: 5 }, () => nm[(ni++) % nm.length] + (ni > 10 ? ni : '')) })); }

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

// 그림(.smap) 하나하나를 잰다 — 숫자는 px · 0.5 넘게 겹치면 센다
const MEASURE = `(() => {
  const W = document.documentElement.clientWidth;
  const R = (e) => e.getBoundingClientRect();
  const ix = (a, c) => Math.min(a.right, c.right) - Math.max(a.left, c.left), iy = (a, c) => Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
  const hit = (a, c, m) => ix(a, c) > (m || 0.5) && iy(a, c) > (m || 0.5);
  const txt = (e) => (e.textContent || '').trim().slice(0, 14);
  const out = { pair: [], center: [], disc: [], box: [], cap: [], cut: [], old: document.querySelectorAll('.tbl-nm, .tbl-cap, .gr-cap').length, n: 0, discs: 0, caps: 0, maps: 0 };
  document.querySelectorAll('.smap').forEach((map) => { out.maps++;
    const mb = R(map);
    const labs = [...map.querySelectorAll('.smap-s > .seat, .smap-s > .gr-nm, .smap-s > .gr-me')]; out.n += labs.length;
    const discs = [...map.querySelectorAll('.smap-t')]; out.discs += discs.length;
    const nos = [...map.querySelectorAll('.tnum, .gt-no')].map(R);
    const caps = [...map.querySelectorAll('.tcap, .gt-cap')]; out.caps += caps.length;
    const bs = labs.map(R);
    for (let i = 0; i < bs.length; i++) {
      for (let j = i + 1; j < bs.length; j++) if (hit(bs[i], bs[j])) out.pair.push(txt(labs[i]) + '×' + txt(labs[j]) + ' ' + Math.round(ix(bs[i], bs[j])));
      for (const n of nos) if (hit(bs[i], n)) out.center.push(txt(labs[i]) + '×번호');
      for (const c of caps) if (hit(bs[i], R(c))) out.center.push(txt(labs[i]) + '×표 이름 ' + txt(c));
      for (const d of discs) { const r = R(d), cx = r.left + r.width / 2, cy = r.top + r.height / 2, b = bs[i];
        const nx = Math.max(b.left, Math.min(cx, b.right)), ny = Math.max(b.top, Math.min(cy, b.bottom)), inn = r.width / 2 - Math.hypot(cx - nx, cy - ny);
        if (inn > r.width * .1) out.disc.push(txt(labs[i]) + ' 원 ' + Math.round(inn)); }
      if (bs[i].left < mb.left - 2 || bs[i].right > mb.right + 2 || bs[i].top < mb.top - 2 || bs[i].bottom > mb.bottom + 2) out.box.push(txt(labs[i]) + ' 그림 밖');
      const t = (labs[i].textContent || '').trim(); if ([...t].length <= 4 && labs[i].scrollWidth > labs[i].clientWidth + 1) out.cut.push(t);
    }
    caps.forEach((c) => { const r = R(c), d = R(c.closest('.smap-t')), lh = parseFloat(getComputedStyle(c).lineHeight) || 13;
      if (r.height > lh * 2.5) out.cap.push('세 줄 «' + txt(c) + '»');
      const cx = d.left + d.width / 2, cy = d.top + d.height / 2, far = Math.max(...[[r.left, r.top], [r.right, r.top], [r.left, r.bottom], [r.right, r.bottom]].map(([x, y]) => Math.hypot(x - cx, y - cy)));
      if (far > d.width / 2 + 1) out.cap.push('원 밖 «' + txt(c) + '» ' + Math.round(far - d.width / 2));
      for (const n of nos) if (hit(r, n)) out.cap.push('번호와 겹침 «' + txt(c) + '»'); });
  });
  out.pageSW = document.documentElement.scrollWidth - W;
  return out;
})()`;
const bad = (m) => m.pair.length + m.center.length + m.disc.length + m.box.length + m.cap.length + m.cut.length + m.old + (m.pageSW > 0 ? 1 : 0) + (m.maps ? 0 : 1);
const brief = (m) => JSON.stringify({ pair: m.pair.slice(0, 3), center: m.center.slice(0, 3), disc: m.disc.slice(0, 3), box: m.box.slice(0, 3), cap: m.cap.slice(0, 3), cut: m.cut.slice(0, 3), old: m.old, maps: m.maps, pageSW: m.pageSW });

try {
  // ── ① · ② 전체 배치도(seat) · 전체 공개 좌석표(guide)
  const sum = { seat: { n: 0, bad: 0, ex: '' }, guide: { n: 0, bad: 0, ex: '' } }; let capN = 0, discN = 0, legacyN = { seat: [], guide: [] };
  for (const w of [320, 360, 390, 412, 1280]) {
    const s = await open('/seat.html?t=T1234567890ab', w, async (a) => (a === 'seatView' ? { ok: true, seat: { ...COUPLE, tables: layout('k4') } } : { ok: true }));
    await s.page.waitForSelector('.smap .smap-t', { timeout: 8000 }).catch(() => {}); await wait(250);
    const g = await open('/guide.html?g=t_real_1', w, async (a) => (a === 'guideView' ? { ok: true, guide: { ...COUPLE, seatToken: 'stok', seatFull: true, dining: { on: false }, photoShare: '' } } : a === 'seatView' ? { ok: true, seat: { ...COUPLE, tables: layout('k4') } } : { ok: true }));
    await g.page.waitForSelector('.smap .smap-t', { timeout: 8000 }).catch(() => {}); await wait(250);
    for (const ns of ['k4', 'k5', 'k6', 'en', 'legacy']) {
      const tables = ns === 'legacy' ? legacy() : layout(ns);
      await s.page.evaluate((t) => render({ ...t }), { ...COUPLE, tables }); await wait(120);
      const m1 = await s.page.evaluate(MEASURE); sum.seat.n += m1.n; capN += m1.caps; discN += m1.discs; if (bad(m1)) { sum.seat.bad += bad(m1); sum.seat.ex = sum.seat.ex || `${ns}@${w} ` + brief(m1); }
      await g.page.evaluate((t) => { SEAT = t; SEAT_STATE = 'ok'; renderFullMap(); }, { ...COUPLE, tables }); await wait(120);
      const m2 = await g.page.evaluate(MEASURE); sum.guide.n += m2.n; if (bad(m2)) { sum.guide.bad += bad(m2); sum.guide.ex = sum.guide.ex || `${ns}@${w} ` + brief(m2); }
      if (ns === 'legacy') { legacyN.seat.push(m1.discs + '/' + m1.n); legacyN.guide.push(m2.discs + '/' + m2.n); }
    }
    ok(`pageerror 0 (seat · guide @${w})`, !s.errs.length && !g.errs.length, (s.errs[0] || g.errs[0] || '').slice(0, 120));
    await s.ctx.close(); await g.ctx.close();
  }
  ok('① 표 이름은 원 안 번호 아래 두 줄까지 — 원 밖 · 번호 겹침 0 · 옛 원 아래 줄(.tbl-cap · .gr-cap) · 원 안 옛 이름(.tbl-nm)은 없다 [SEAT_PLAN_9]', capN > 0 && discN === 5 * 5 * 9, JSON.stringify({ capN, discN }));
  ok(`② seat 전체 배치도 — 이름표 ${sum.seat.n}개 · 겹침 · 번호 덮음 · 원 가림 · 그림 밖 · 네 글자 잘림 0 [SEAT_PLAN_9]`, sum.seat.n > 0 && sum.seat.bad === 0, sum.seat.ex);
  ok(`② guide 전체 공개 좌석표 — 이름표 ${sum.guide.n}개 · 겹침 · 번호 덮음 · 원 가림 · 그림 밖 · 네 글자 잘림 0 [SEAT_PLAN_9]`, sum.guide.n > 0 && sum.guide.bad === 0, sum.guide.ex);
  ok('② 옛 6테이블 좌석표(30명)도 확정 배치 9테이블로 옮겨 30명 모두 그린다 — seat · guide', legacyN.seat.every((x) => x === '9/30') && legacyN.guide.every((x) => x === '9/30'), JSON.stringify(legacyN));

  // ── ② «내 자리만» 검색 결과 — 알약 하나가 어느 자리에 서든
  const room = PLAN.map(([side, n], i) => ({ no: PNO[i], label: (i % 2 ? '' : '신부 대학 동기'), side, occ: Array(n).fill(1) }));
  const room2 = room.map((t, i) => ({ ...t, label: i === 4 ? '가'.repeat(24) : '', occ: t.occ.map((x, j) => (j % 2 ? 0 : 1)) }));   // 빈자리 섞인 판
  const mine = { seat: { n: 0, bad: 0, ex: '' }, guide: { n: 0, bad: 0, ex: '' } }; let mineMissing = '';
  for (const w of [320, 390, 412, 1280]) {
    const s = await open('/seat.html?t=T1234567890ab', w, async (a, b) => (a === 'seatView' && !b.q ? { ok: false, mineOnly: true, seat: COUPLE } : { ok: true, mineOnly: true, hits: [] }));
    const g = await open('/guide.html?g=t_real_1', w, async (a, b) => (a === 'guideView' ? { ok: true, guide: { ...COUPLE, seatToken: 'stok', seatFull: false, dining: { on: false }, photoShare: '' } } : { ok: true, mineOnly: true, hits: [] }));
    await s.page.waitForSelector('#fr', { timeout: 8000 }).catch(() => {}); await g.page.waitForSelector('#fr', { timeout: 8000 }).catch(() => {}); await wait(200);
    for (const [pg, P, fn] of [['seat', s.page, 'mineRoomHtml'], ['guide', g.page, 'seatRoomHtml']]) {
      const has = await P.evaluate((f) => typeof window[f] === 'function', fn);
      if (!has) { mineMissing = mineMissing || `${pg}: ${fn} 이 전역에 없다(판을 그려 잴 수 없다)`; continue; }
      for (const R of [room, room2]) for (let ti = 0; ti < R.length; ti++) for (let si = 0; si < R[ti].occ.length; si++) for (const nm of ['외삼촌김철수', 'Christopher Lee', '사촌동생']) {
        const hit = { no: R[ti].no, label: R[ti].label || ('테이블 ' + R[ti].no), side: R[ti].side, hti: ti, mi: [si], nm, room: R };
        const m = await P.evaluate(({ fn, hit, M }) => { const fr = document.getElementById('fr'); fr.innerHTML = window[fn](hit); return eval(M); }, { fn, hit, M: MEASURE });
        mine[pg].n++; if (bad(m)) { mine[pg].bad += bad(m); mine[pg].ex = mine[pg].ex || `${nm} n${R[ti].occ.length} 자리${si}@${w} ` + brief(m); }
      }
    }
    ok(`pageerror 0 (내 자리만 seat · guide @${w})`, !s.errs.length && !g.errs.length, (s.errs[0] || g.errs[0] || '').slice(0, 120));
    await s.ctx.close(); await g.ctx.close();
  }
  ok(`② seat «내 자리만» 알약 ${mine.seat.n}자리 — 번호 · 원 가림 · 그림 밖 · 겹침 0 [SEAT_PLAN_9]`, !mineMissing && mine.seat.n > 0 && mine.seat.bad === 0, mineMissing || mine.seat.ex);
  ok(`② guide «내 자리» 알약 ${mine.guide.n}자리 — 번호 · 원 가림 · 그림 밖 · 겹침 0 [SEAT_PLAN_9]`, mine.guide.n > 0 && mine.guide.bad === 0, mine.guide.ex);

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
    await s.page.waitForSelector('.smap .smap-t', { timeout: 8000 }).catch(() => {}); await wait(300);
    await s.page.focus('#q'); const cdp = await s.ctx.newCDPSession(s.page); const y0 = await s.page.evaluate(() => Math.round(scrollY)); const log = [];
    await s.page.clock.install();   // [IME_QUIET] 화면 시계는 우리가 흘린다 — 한 글자 사이 600ms(사람이 치는 빠르기) · CI 부하로 틈이 늘어 «손을 멈춤»으로 읽히는 헛 FAIL 을 없앤다
    for (const st of STEPS) { await type(s.page, cdp, st); await s.page.clock.runFor(600); await wait(60); log.push(await s.page.evaluate(() => ({ v: document.getElementById('q').value, fr: document.getElementById('fr').textContent, y: Math.round(scrollY) }))); }
    const mid = log.slice(0, -1), last = log[log.length - 1];
    ok('③ seat 전체 배치도 — 조합 중(ㄱ · 기 · 김 · 김ㅁ …)에는 «찾지 못했어요»가 안 뜨고 화면이 안 뛴다 [IME_QUIET]', mid.every((x) => !/찾지 못했어요/.test(x.fr) && x.y === y0), JSON.stringify(mid.map((x) => [x.v, x.fr.slice(0, 12), x.y])));
    ok('③ seat 전체 배치도 — 조합이 끝나면 한 번 찾아 자리를 말한다(한 사람이면 그 자리로)', /자리예요/.test(last.fr), JSON.stringify(last));
    // 손을 멈춘 채 조합이 안 끝난 경우(폰 키보드) — 잠시 뒤 한 번 찾는다
    await s.page.evaluate(() => { const q = document.getElementById('q'); q.value = ''; q.dispatchEvent(new Event('input')); }); await wait(200);
    await s.page.focus('#q'); await cdp.send('Input.imeSetComposition', { text: '김민수', selectionStart: 3, selectionEnd: 3 }); await s.page.clock.runFor(1400); await wait(100);
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
    await s.page.clock.install();   // [IME_QUIET] 한 글자 사이 600ms 를 화면 시계로 정확히 — 옛 판(450ms 묶음)은 글자마다 서버로 가고 새 판(조합 중 쉼)은 한 번
    for (const st of STEPS) { await type(s.page, cdp, st); await s.page.clock.runFor(600); await wait(40); }
    await s.page.clock.runFor(1000); await wait(400);
    ok(`③ ${pg} «내 자리만» — 이름 하나(김민수)를 조합해 치는 동안 서버 검색은 한 번 [IME_QUIET]`, s.qs.length === 1 && s.qs[0] === '김민수', JSON.stringify(s.qs));
    ok(`pageerror 0 (조합 · ${pg} 내 자리만)`, !s.errs.length, (s.errs[0] || '').slice(0, 120));
    await s.ctx.close();
  }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nSEAT LABEL FIT FAIL ${fail}` : '\nSEAT LABEL FIT OK'); process.exit(fail ? 1 : 0);
