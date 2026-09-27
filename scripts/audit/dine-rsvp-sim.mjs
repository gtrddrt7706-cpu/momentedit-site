#!/usr/bin/env node
/* [DINE_RSVP_SIM] 하객 안내 식사 답 [DINING_RSVP] · 식사 여부 먼저 [MEAL_ASK_FIRST] — 실제 브라우저로 누르고 본다(2026-09-27)
 *
 * ★실제 요청은 나가지 않는다 — script.google.com 을 전부 가로채 시나리오별 가짜 응답을 준다([GP_SIM] 과 같은 방식).
 *   guide.html 은 진짜 토큰 경로(?g=<토큰>)로 연다 — 표본(?g=demo)은 서버를 부르지 않아 보내기 · 거절 · 끊김을 못 잰다([GP_SIM_NOT_DEMO]).
 * ★body · section · .reveal 이 opacity:0 으로 시작하는 화면이 있다 — 강제로 연다(빈 스크린샷을 «괜찮다»고 읽지 않게).
 *
 * 잰다
 *   guide 390 · 360 — 처음(물음 + 단추 둘) · 함께할게요 연 모습 · 보낸 뒤 · 다시 들어옴(이 기기 기억) · 서버 거절 글 · 통신 실패(적던 값 남음)
 *                     숨김(rsvp:false · 예식 당일 · 식당 없고 rsvp:false) · 두 번 그리기 사이 적던 이름 · 표본(시트 · 서버 요청 0)
 *                     식당 없는 식사 칸(한 줄 + 물음) · 식당 있는 날(카드 → 모이는 줄 → 답 칸 → 함께 들르기 좋은 곳)
 *                     «예식만 함께할게요» 한 줄 · 점이 글자에 안 닿음 · 44px · 16px · 초점 링 · .ps-btn 누르는 동안 글자 보임 · 새 글자색 대비 4.5:1
 *   mypage 390 · 1280 — 셈 · 명단 · 직접 넣기 · 지우기 · 좌석 맞춰 보기 · 끄기 · 청첩장 1단계 물음(오프라인 · 둘 다 · 종이만 · 세 답 · 이미 정했으면 없음 · «있어요» 뒤 하객 안내 QR)
 *   오프라인 청첩장 단추 글 — byEvent rsvp 참이면 새 글 · 거짓이면 지금 글
 *
 * 종료코드: 0 통과 · 1 위반 · 2 못 쟀다(브라우저 없음 · 포트)
 * 그림: DR_SHOTS(기본 scripts/audit/_shots/dine-rsvp)
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';
import { freePort } from './_freeport.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SHOTS = process.env.DR_SHOTS || path.join(ROOT, 'scripts/audit/_shots/dine-rsvp');
fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json', '.woff2': 'font/woff2' };
const PORT = await freePort();
const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (/^\/g\/[A-Za-z0-9_-]+\/?$/.test(u)) u = '/guide.html';
  const f = path.join(ROOT, u);
  if (f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile()) { res.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream'); res.end(fs.readFileSync(f)); }
  else { res.statusCode = 404; res.end('nf'); }
});
await new Promise((r, j) => { srv.on('error', j); srv.listen(PORT, '127.0.0.1', r); }).catch((e) => { console.log('· 못 봄(포트 · ' + String(e && e.code || e) + ')'); process.exit(2); });
const eng = await launchBrowser();
if (!eng) { console.log('· 못 봄(브라우저 없음)'); srv.close(); process.exit(2); }

const bad = [], okn = [];
const t = (c, m, d) => { (c ? okn : bad).push(m + (c || d === undefined ? '' : '  →  ' + (typeof d === 'string' ? d : JSON.stringify(d)))); };
const J = (o) => ({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(o) });
const kst = (days) => new Date(Date.now() + 9 * 3600e3 + days * 86400e3).toISOString().slice(0, 10);
const FORCE = 'html,body,section,.reveal{opacity:1 !important;transform:none !important} html{scroll-behavior:auto !important} *{content-visibility:visible !important}';
/* ★마이페이지 · 청첩장은 숨겨 둔 판(상담 도우미 · 모달)이 section 이다 — visibility 까지 강제로 열면 그 판이 화면을 덮는다(첫 판에서 실제로 덮였다) */
const FORCE_SOFT = 'html,body,.reveal{opacity:1 !important} html{scroll-behavior:auto !important}';
const WED = kst(20), DUE = kst(13);
const GUIDE = (dining, over) => Object.assign({ groom: '이서준', bride: '정하윤', date: WED, seatToken: '', seatFull: true, photoShare: '',
  dining: Object.assign({ on: true, pick: '라 트라토리아', rtime: '12:30', rname: '이서준', restos: [{ n: '카페 모먼트', m: '디저트 · 도보 3분' }], spots: [], rsvp: true, rsvpDue: DUE }, dining || {}) }, over || {});

/* 대비 — 글자색과 «실제로 칠해진» 뒤판(조상을 타고 올라가 처음 만나는 불투명 배경) */
const CONTRAST = `(sel) => {
  const L = (c) => { const m = c.match(/\\d+(\\.\\d+)?/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
  const bgOf = (e) => { while (e) { const b = getComputedStyle(e).backgroundColor; const m = b.match(/\\d+(\\.\\d+)?/g); if (m && (m.length < 4 || +m[3] > 0.9)) return b; e = e.parentElement; } return 'rgb(255,255,255)'; };
  return [...document.querySelectorAll(sel)].filter((e) => e.getBoundingClientRect().width > 0 && (e.textContent || '').trim()).map((e) => {
    const a = L(getComputedStyle(e).color), b = L(bgOf(e)); const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    return { sel: e.className || e.tagName, r: Math.round(r * 100) / 100, txt: (e.textContent || '').trim().slice(0, 14) };
  });
}`;

async function guidePage(vw, { guide, handler, cache, path: pth, token = 'Gsimtoken000001', mem } = {}) {
  const { page, errors } = await eng.newPage({ port: PORT, viewport: { width: vw, height: 844 } });
  const hits = [];
  await page.route('**://script.google.com/**', async (route) => {
    let body = ''; try { body = route.request().postData() || ''; } catch (e) {}
    hits.push(body);
    let b = {}; try { b = JSON.parse(body); } catch (e) {}
    if (b.action === 'guideView') return handler && handler.view ? handler.view(route, b) : route.fulfill(J({ ok: true, guide }));
    if (b.action === 'dineRsvp') return handler && handler.rsvp ? handler.rsvp(route, b) : route.fulfill(J({ ok: true, name: String(b.name || '').trim(), ans: b.ans, n: b.ans === 'Y' ? b.n : 0 }));
    return route.fulfill(J({ ok: true }));
  });
  if (cache || mem) await page.addInitScript(([tk, c, m]) => { try { if (c) localStorage.setItem('me_guide_' + tk, JSON.stringify(c)); if (m) localStorage.setItem('me_dr_' + tk, JSON.stringify(m)); } catch (e) {} }, [token, cache || null, mem || null]);
  await page.goto(`http://localhost:${PORT}${pth || ('/guide.html?g=' + token)}`, { waitUntil: 'load' });
  await page.addStyleTag({ content: FORCE });
  await page.waitForTimeout(700);
  return { page, errors, hits };
}
const shot = async (page, name, sel) => {
  if (sel) { await page.evaluate((s) => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'center' }); }, sel); await page.waitForTimeout(150); }
  await page.screenshot({ path: path.join(SHOTS, name) });
};
const Q = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { h: r.height, w: r.width, t: r.top, x: r.left, txt: (e.innerText || '').replace(/\s+/g, ' ').trim() }; }, sel);

// ══════════════════ 하객 화면 ══════════════════
const ONLY = process.env.DR_ONLY || '';
for (const vw of (ONLY && ONLY !== 'guide') ? [] : [390, 360]) {
  const tag = 'guide-' + vw;
  // ① 처음 — 물음 + 단추 둘 · 자리(카드 → 모이는 줄 → 답 칸 → 함께 들르기 좋은 곳)
  let { page, errors } = await guidePage(vw, { guide: GUIDE() });
  const order = await page.evaluate(() => { const sec = document.querySelector('.dr') && document.querySelector('.dr').closest('.sec'); if (!sec) return null;
    return [...sec.children].map((e) => e.className.split(' ')[0]).filter((c) => ['pick', 'gather', 'dr', 'subh', 'dn-wait'].includes(c)); });
  t(JSON.stringify(order) === JSON.stringify(['pick', 'gather', 'dr', 'subh']), `${tag} 자리 — 카드 → 모이는 줄 → 답 칸 → 함께 들르기 좋은 곳`, order);
  const first = await page.evaluate(() => ({ q: (document.querySelector('.dr-q') || {}).textContent, due: (document.querySelector('.dr-due') || {}).textContent,
    btns: [...document.querySelectorAll('.dr-b')].map((b) => b.textContent), more: !!document.querySelector('.dr-more') }));
  t(first.q === '식사 자리도 함께하시나요?' && first.btns.join('|') === '함께할게요|예식만 함께할게요' && !first.more, `${tag} 처음엔 물음과 단추 둘만`, first);
  const dm = DUE.split('-'); t(first.due === `${+dm[1]}월 ${+dm[2]}일까지 알려 주세요`, `${tag} 마감 줄 «○월 ○일까지 알려 주세요»(예식 7일 전)`, first.due);
  await shot(page, `${tag}-1-first.png`, '.dr');
  // ② «예식만 함께할게요» — 한 줄 · 점이 글자에 안 닿음
  await page.click('.dr-b[data-v="N"]');
  const onlyN = await page.evaluate(() => { const b = document.querySelector('.dr-b[data-v="N"]'); const r = b.getBoundingClientRect();
    const rg = document.createRange(); rg.selectNodeContents(b); const tr = rg.getBoundingClientRect(); const lines = rg.getClientRects().length;
    const dot = { l: r.right - 7 - 6, t: r.top + 7, b: r.top + 13 };
    return { pressed: b.getAttribute('aria-pressed'), lines, h: r.height, gap: Math.round(dot.l - tr.right), vgap: Math.round(tr.top - dot.b), n: !!document.querySelector('.dr-n'), name: !!document.getElementById('drName') }; });
  t(onlyN.pressed === 'true' && onlyN.lines === 1, `${tag} «예식만 함께할게요» 고른 뒤에도 한 줄`, onlyN);
  t(onlyN.gap >= 2 || onlyN.vgap >= 2, `${tag} 모서리 점이 글자에 닿지 않는다`, onlyN);
  t(!onlyN.n && onlyN.name, `${tag} 예식만이면 인원 줄은 빠지고 이름 · 알림 · 보내기는 같다`, onlyN);
  // ③ «함께할게요» — 인원 칸 · 44px · 16px · 초점 링
  await page.click('.dr-b[data-v="Y"]');
  const open = await page.evaluate(() => {
    const px = (s) => [...document.querySelectorAll(s)].map((e) => Math.round(e.getBoundingClientRect().height));
    const inp = document.getElementById('drName');
    return { pm: px('.dr-pm'), b: px('.dr-b'), send: px('.dr .ps-btn'), inFont: inp ? parseFloat(getComputedStyle(inp).fontSize) : 0, inH: inp ? Math.round(inp.getBoundingClientRect().height) : 0,
      n: (document.getElementById('drNum') || {}).textContent, nl: (document.querySelector('.dr-nl') || {}).textContent, help: (document.querySelector('.dr-help') || {}).textContent,
      lab: (document.querySelector('.dr-lab') || {}).textContent, ph: inp && inp.placeholder, ac: inp && inp.getAttribute('autocomplete'), ek: inp && inp.getAttribute('enterkeyhint'), ml: inp && inp.maxLength,
      note: (document.querySelector('.dr-note') || {}).textContent, href: (document.querySelector('.dr-note a') || {}).getAttribute && document.querySelector('.dr-note a').getAttribute('href'),
      tgt: document.querySelector('.dr-note a') && document.querySelector('.dr-note a').target, sendTxt: (document.querySelector('.dr .ps-btn') || {}).textContent,
      pmLabels: [...document.querySelectorAll('.dr-pm')].map((b) => b.getAttribute('aria-label')), decDis: document.querySelector('.dr-pm[data-dr="dec"]').getAttribute('aria-disabled') };
  });
  t(open.pm.every((h) => h >= 44) && open.b.every((h) => h >= 44) && open.send.every((h) => h >= 44) && open.inH >= 44, `${tag} 누르는 자리 44px 이상`, open);
  t(open.inFont >= 16, `${tag} 이름 칸 글자 16px 이상`, open.inFont);
  t(open.n === '1' && open.nl === '몇 분이 오시나요?' && open.help === '가족이 함께 오시면 한 분만 보내 주세요 · 아이도 한 분으로 세어 주세요' && open.decDis === 'true', `${tag} 인원 칸 — 기본 1 · 머리 · 작은 글 · 1에서 줄이기 잠김`, open);
  t(open.lab === '보내시는 분 이름' && open.ph === '이름' && open.ac === 'name' && open.ek === 'send' && open.ml === 20, `${tag} 이름 칸 — 이름 · 자리표시 · autocomplete=name · enterkeyhint=send · 20자`, open);
  t(open.note === '이름 · 답 · 인원은 두 분의 식사 준비에만 쓰고, 예식 30일 뒤 지워요. 원하지 않으시면 두 분께 직접 알려 주세요. 자세히' && open.href === '/privacy.html#dine-rsvp' && open.tgt === '_blank', `${tag} 알림 한 줄 + «자세히»(새 탭 · #dine-rsvp)`, open.note);
  t(open.sendTxt === '동의하고 보내기' && open.pmLabels.join('|') === '한 분 줄이기|한 분 늘리기', `${tag} 보내기 단추 · −/+ 이름`, open);
  for (let i = 0; i < 5; i++) await page.click('.dr-pm[data-dr="inc"]');
  await page.click('.dr-pm[data-dr="inc"]', { force: true });   // 6 에서 한 번 더 — 잠겨 있어야 한다
  t((await Q(page, '#drNum')).txt === '6' && (await page.getAttribute('.dr-pm[data-dr="inc"]', 'aria-disabled')) === 'true', `${tag} 인원 1~6(6에서 늘리기 잠김)`);
  await page.click('.dr-pm[data-dr="dec"]'); await page.click('.dr-pm[data-dr="dec"]'); await page.click('.dr-pm[data-dr="dec"]'); await page.click('.dr-pm[data-dr="dec"]');
  // 초점 링 — 키보드로 들어가면
  await page.focus('.dr-pm[data-dr="inc"]'); await page.keyboard.press('Tab');
  const ring = await page.evaluate(() => { const a = document.activeElement; const c = getComputedStyle(a); return { id: a.id, os: c.outlineStyle, ow: parseFloat(c.outlineWidth) }; });
  t(ring.id === 'drName' && ring.os !== 'none' && ring.ow >= 2, `${tag} 이름 칸 초점 링`, ring);
  await shot(page, `${tag}-2-open.png`, '.dr');
  // .ps-btn 누르는 동안 글자가 보인다
  const act = await page.evaluate(() => { const b = document.querySelector('.dr .ps-btn'); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.mouse.move(act.x, act.y); await page.mouse.down();
  const pressed = await page.evaluate(() => { const c = getComputedStyle(document.querySelector('.dr .ps-btn')); return { bg: c.backgroundColor, fg: c.color }; });
  await page.mouse.move(5, 5); await page.mouse.up();
  t(pressed.bg !== pressed.fg && !/58, 45, 34/.test(pressed.bg), `${tag} .ps-btn 누르는 동안 배경이 글자색으로 차지 않는다`, pressed);
  // 대비
  const cs = await page.evaluate(`(${CONTRAST})('.dr-q, .dr-due, .dr-b, .dr-nl, .dr-help, .dr-lab, .dr-note, .dr-note a, .dr .ps-btn, .dr-num')`);
  const low = cs.filter((c) => c.r < 4.5);
  t(!low.length, `${tag} 새 글자색 대비 4.5:1 이상(${cs.length}곳)`, low);
  // ④ 보내기 → 보낸 뒤
  await page.fill('#drName', '홍길동');
  await page.click('.dr .ps-btn');
  await page.waitForSelector('.dr-thx', { timeout: 5000 }).catch(() => {});
  const done = await page.evaluate(() => ({ st: !!document.querySelector('.dr [role="status"]'), thx: (document.querySelector('.dr-thx') || {}).textContent, v: (document.querySelector('.dr-v') || {}).textContent, k: (document.querySelector('.dr-k') || {}).textContent,
    edit: (document.querySelector('.dr-edit') || {}).textContent, mem: (() => { try { return JSON.parse(localStorage.getItem('me_dr_Gsimtoken000001')); } catch (e) { return null; } })() }));
  t(done.st && done.thx === '알려 주셔서 고맙습니다. 바뀌면 다시 눌러 주세요.' && done.k === '보내 주신 답' && done.v === '함께할게요 2분 · 홍길동' && done.edit === '바꾸기', `${tag} 보낸 뒤 — 고맙습니다 · 보내 주신 답 · 함께할게요 2분 · 홍길동 [바꾸기]`, done);
  t(done.mem && done.mem.name === '홍길동' && done.mem.ans === 'Y' && done.mem.n === 2 && done.mem.at > 0, `${tag} 이 기기 기억 me_dr_+토큰 = {name, ans, n, at}`, done.mem);
  const editH = await Q(page, '.dr-edit'); t(editH && editH.h >= 44, `${tag} [바꾸기] 44px`, editH);
  await shot(page, `${tag}-3-sent.png`, '.dr');
  // 바꾸기 → 채워진 채로 다시 열림
  await page.click('.dr-edit');
  const re = await page.evaluate(() => ({ y: document.querySelector('.dr-b[data-v="Y"]').getAttribute('aria-pressed'), n: (document.getElementById('drNum') || {}).textContent, name: (document.getElementById('drName') || {}).value }));
  t(re.y === 'true' && re.n === '2' && re.name === '홍길동', `${tag} [바꾸기] 누르면 고른 단추 · 인원 · 이름이 채워진 채로`, re);
  await page.close();

  // ⑤ 다시 들어옴 — 이 기기 기억(고맙습니다 문장은 빠진다)
  ({ page } = await guidePage(vw, { guide: GUIDE(), mem: { name: '김영희', ans: 'N', n: 0, at: 1 } }));
  const back = await page.evaluate(() => ({ thx: !!document.querySelector('.dr-thx'), v: (document.querySelector('.dr-v') || {}).textContent, q: !!document.querySelector('.dr-q') }));
  t(!back.thx && !back.q && back.v === '예식만 함께할게요 · 김영희', `${tag} 다시 들어옴 — «보내 주신 답 …» 한 줄 + [바꾸기](고맙습니다 없음)`, back);
  await shot(page, `${tag}-4-back.png`, '.dr');
  await page.close();

  // ⑥ 서버 거절 · ⑦ 통신 실패 — 적던 값 남음
  let n7 = 0;
  ({ page } = await guidePage(vw, { guide: GUIDE(), handler: { rsvp: (route) => (++n7 === 1 ? route.fulfill(J({ ok: false, error: '잠시 뒤에 다시 보내 주세요.' })) : route.abort()) } }));
  await page.click('.dr-b[data-v="Y"]'); await page.click('.dr-pm[data-dr="inc"]'); await page.fill('#drName', '박하객');
  await page.click('.dr .ps-btn'); await page.waitForSelector('.dr-err', { timeout: 5000 }).catch(() => {});
  const rej = await page.evaluate(() => ({ err: (document.querySelector('.dr-err') || {}).textContent, role: document.querySelector('.dr-err') && document.querySelector('.dr-err').getAttribute('role'), name: document.getElementById('drName').value, n: document.getElementById('drNum').textContent, send: document.querySelector('.dr .ps-btn').textContent }));
  t(rej.err === '잠시 뒤에 다시 보내 주세요.' && rej.role === 'alert' && rej.name === '박하객' && rej.n === '2' && rej.send === '동의하고 보내기', `${tag} 서버 거절 — 서버 글 그대로 · 적던 값 남음`, rej);
  await shot(page, `${tag}-5-reject.png`, '.dr');
  await page.click('.dr .ps-btn'); await page.waitForFunction(() => /연결을 확인/.test((document.querySelector('.dr-err') || {}).textContent || ''), null, { timeout: 5000 }).catch(() => {});
  const net = await page.evaluate(() => ({ err: (document.querySelector('.dr-err') || {}).textContent, name: document.getElementById('drName').value }));
  t(net.err === '보내지 못했어요. 연결을 확인하고 다시 눌러 주세요.' && net.name === '박하객', `${tag} 통신 실패 — 화면 글 · 적던 값 남음`, net);
  await shot(page, `${tag}-6-neterr.png`, '.dr');
  await page.close();

  // ⑧ 보내는 중 잠금 — 두 번 눌러도 한 번만
  let calls = 0;
  ({ page } = await guidePage(vw, { guide: GUIDE(), handler: { rsvp: async (route, b) => { calls++; await new Promise((r) => setTimeout(r, 900)); return route.fulfill(J({ ok: true, name: b.name, ans: b.ans, n: b.n })); } } }));
  await page.click('.dr-b[data-v="N"]'); await page.fill('#drName', '최하객');
  await page.click('.dr .ps-btn');
  const busy = await page.evaluate(() => ({ txt: document.querySelector('.dr .ps-btn').textContent, dis: document.querySelector('.dr .ps-btn').getAttribute('aria-disabled'), dot: !!document.querySelector('.dr-dot') }));
  await page.click('.dr .ps-btn').catch(() => {}); await page.click('.dr .ps-btn').catch(() => {});
  await page.waitForSelector('.dr-thx', { timeout: 5000 }).catch(() => {});
  t(busy.txt === '보내는 중' && busy.dis === 'true' && busy.dot && calls === 1, `${tag} 보내는 중 — «보내는 중» + 점 · 잠금 · 두 번 눌러도 한 번`, { busy, calls });
  await page.close();

  // ⑨ 두 번 그리기 사이 적던 이름이 남는다(캐시로 한 번 · 서버 응답으로 한 번)
  ({ page } = await guidePage(vw, { guide: GUIDE(), cache: GUIDE(), handler: { view: async (route) => { await new Promise((r) => setTimeout(r, 1500)); return route.fulfill(J({ ok: true, guide: GUIDE({ rtime: '13:00' }) })); } } }));
  await page.click('.dr-b[data-v="Y"]').catch(() => {}); await page.click('#drName').catch(() => {}); await page.keyboard.type('이적던', { delay: 20 });
  await page.waitForFunction(() => /13:00/.test(document.body.innerText), null, { timeout: 6000 }).catch(() => {});
  await page.keyboard.type('중', { delay: 20 });
  const rep = await page.evaluate(() => ({ v: (document.getElementById('drName') || {}).value, f: document.activeElement && document.activeElement.id, y: (document.querySelector('.dr-b[data-v="Y"]') || {}).getAttribute && document.querySelector('.dr-b[data-v="Y"]').getAttribute('aria-pressed'), second: /13:00/.test(document.body.innerText) }));
  t(rep.second && rep.v === '이적던중' && rep.f === 'drName' && rep.y === 'true', `${tag} 두 번 그리기 사이 — 적던 이름 · 고른 단추 · 초점이 남는다`, rep);
  await page.close();

  // ⑩ 숨김 — rsvp:false · 예식 당일 · 식당 없고 rsvp:false · 옛 캐시(rsvp 없음)
  ({ page } = await guidePage(vw, { guide: GUIDE({ rsvp: false, rsvpDue: '' }) }));
  t(!(await page.$('.dr')) && !!(await page.$('.pick')), `${tag} 숨김 — rsvp:false(식사 안내는 그대로)`);
  await page.close();
  ({ page } = await guidePage(vw, { guide: GUIDE({}, { date: kst(0) }) }));
  t(!(await page.$('.dr')), `${tag} 숨김 — 예식 당일(서버가 rsvp:true 여도 화면에서 한 번 더)`);
  await page.close();
  ({ page } = await guidePage(vw, { guide: GUIDE({ on: false, pick: '', restos: [], rsvp: false, rsvpDue: '' }) }));
  t(!(await page.$('.dr')) && !(await page.$('.dn-wait')) && !(await page.evaluate(() => /식사 · 애프터/.test(document.body.innerText))), `${tag} 숨김 — 식당 없고 rsvp:false 면 식사 칸 통째로 없음`);
  await page.close();

  // ⑪ 식당 없는 식사 칸 — 머리 + 한 줄 + 물음
  ({ page } = await guidePage(vw, { guide: GUIDE({ on: false, pick: '', restos: [], rtime: '', rname: '' }) }));
  const wait = await page.evaluate(() => { const sec = document.querySelector('.dr') && document.querySelector('.dr').closest('.sec'); return sec ? { h: (sec.querySelector('.sec-t') || {}).textContent, w: (sec.querySelector('.dn-wait') || {}).textContent, order: [...sec.children].map((e) => e.className.split(' ')[0]) } : null; });
  t(wait && wait.h === '식사 · 애프터' && wait.w === '예식이 끝난 뒤 함께하는 식사 자리예요. 장소와 시간은 두 분이 정하시면 여기에 적혀요.' && JSON.stringify(wait.order) === JSON.stringify(['sec-h', 'dn-wait', 'dr']), `${tag} 식당 없는 날 — «식사 · 애프터» · 한 줄 · 물음 [MEAL_ASK_FIRST]`, wait);
  await shot(page, `${tag}-7-nopick.png`, '.dr');
  await page.close();

  // ⑪-2 식사가 없어졌을 때 [CHANGE_TELL 5-4] — 이 기기에 보낸 답이 있는데 식사 칸이 없어졌으면 한 줄 · 기억이 없으면 아무것도
  ({ page } = await guidePage(vw, { guide: GUIDE({ on: false, pick: '', restos: [], rsvp: false, rsvpDue: '' }), mem: { name: '홍길동', ans: 'Y', n: 2, at: 1 } }));
  const gone = await page.evaluate(() => { const w = [...document.querySelectorAll('.dn-wait')].map((e) => e.textContent); return { w, dr: !!document.querySelector('.dr') }; });
  t(gone.w.join('|') === '보내 주신 식사 답이 있어요 · 지금은 식사 안내가 없어요. 두 분께 여쭤 주세요.' && !gone.dr, `${tag} 식사가 없어졌을 때 — 한 줄(보낸 답이 있을 때만)`, gone);
  await shot(page, `${tag}-9-gone.png`, '.dn-wait');
  await page.close();

  // ⑫ 표본(?g=demo) — 칸이 보이고 보내기가 시트를 연다 · 서버 요청 0 · 이 기기 기억 안 씀
  let hitsD;
  ({ page, hits: hitsD } = await guidePage(vw, { path: '/guide.html?g=demo' }));
  const dd = await page.evaluate(() => ({ dr: !!document.querySelector('.dr'), due: (document.querySelector('.dr-due') || {}).textContent }));
  await page.click('.dr-b[data-v="Y"]'); await page.fill('#drName', '표본'); await page.click('.dr .ps-btn');
  await page.waitForTimeout(500);
  const sheet = await page.evaluate(() => { const o = document.getElementById('dtipOv'); return o ? { show: o.classList.contains('show'), k: o.querySelector('.k').textContent, h: o.querySelector('.h').textContent, d: o.querySelector('.d').textContent } : null; });
  const memD = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.indexOf('me_dr_') === 0).length);
  t(dd.dr && dd.due === '12월 10일까지 알려 주세요', `${tag} 표본 — 답 칸 · «12월 10일까지 알려 주세요»`, dd);
  t(sheet && sheet.show && sheet.k === 'Sample' && sheet.h === '표본이라 답이 전해지지 않아요' && sheet.d === '실제로는 보내는 순간 두 분의 마이페이지에 이름과 인원이 모여요.', `${tag} 표본 — «동의하고 보내기»가 시트를 연다`, sheet);
  t(hitsD.length === 0 && memD === 0, `${tag} 표본 — 서버 요청 0 · 이 기기 기억 0`, { hits: hitsD.length, memD });
  await shot(page, `${tag}-8-demo-sheet.png`);
  await page.close();
  const real = errors.filter((e) => !/favicon|net::ERR|Failed to load resource/.test(e));
  t(real.length === 0, `${tag} 콘솔 오류 0`, real.slice(0, 3));
}

// ══════════════════ 오프라인 청첩장 단추 글(shared/hydrate.js) ══════════════════
for (const rsvp of (ONLY && ONLY !== 'cta') ? [] : [true, false]) {
  const { page } = await eng.newPage({ port: PORT, viewport: { width: 390, height: 844 } });
  await page.route('**://script.google.com/**', (route) => {
    const req = route.request(); let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (e) {}
    if (b.action === 'guideView' && b.byEvent) return route.fulfill(J({ ok: true, g: 'Gsimtoken000001', rsvp }));
    return route.fulfill(J({ ok: false }));
  });
  await page.goto(`http://localhost:${PORT}/i-family/family-01.html?e=ev-sim-0101`, { waitUntil: 'load' });
  await page.addStyleTag({ content: FORCE_SOFT });
  await page.waitForSelector('#meGuideCta', { timeout: 8000 }).catch(() => {});
  const cta = await page.evaluate(() => { const c = document.getElementById('meGuideCta'); if (!c) return null; const d = c.querySelector('div > div:nth-child(2)'); const spans = d ? [...d.querySelectorAll('span')] : [];
    return { txt: d ? d.innerText.replace(/\s+/g, ' ').trim() : '', spans: spans.map((s) => ({ t: s.textContent, fs: getComputedStyle(s).fontSize, disp: getComputedStyle(s).display })), btn: (document.getElementById('meGuideCtaBtn') || {}).textContent }; });
  if (rsvp) t(cta && cta.txt === '식사 자리도 함께하시는지 알려 주세요. 예식 당일의 식사 안내와 자리 찾기도 여기에 있어요.' && cta.spans.length === 2 && cta.spans[1].fs === '12.5px' && cta.spans.every((s) => s.disp === 'block') && cta.btn === '하객 안내 열기', '오프라인 청첩장 단추 글 — rsvp 참이면 새 글(두 줄 · 둘째 줄 12.5px) · 단추 그대로', cta);
  else t(cta && cta.txt === '예식 당일의 식사 안내와 자리 찾기를 한 곳에 모아 두었어요.' && cta.btn === '하객 안내 열기', '오프라인 청첩장 단추 글 — rsvp 거짓이면 지금 글', cta);
  if (cta) { await page.evaluate(() => document.getElementById('meGuideCta').scrollIntoView({ block: 'center' })); await page.waitForTimeout(400); await page.screenshot({ path: path.join(SHOTS, `invite-cta-${rsvp ? 'rsvp' : 'plain'}.png`) }); }
  await page.close();
}

// ══════════════════ 마이페이지 ══════════════════
const SIG = ['신청접수', '상담확정', '시착', '상담완료', '계약완료', '입금완료', '제작중', '예식완료', '결과물전달', '후기'];
const PROD = (over) => Object.assign({ entered: true, base: { groomKo: '희준', brideKo: '미쿠', groomEn: 'Heejun', brideEn: 'Miku', weddingDate: WED, weddingTime: '13:20' },
  tracks: { invitation: '완료', dining: '시작전', ritual: '시작전', final: '완료', seat: '완료' },
  diningDraft: { dining_on: 'Y' }, finalDraft: { headcount: '4', standing: 0, extraFee: 0, drink: '샴페인' }, ritualDraft: null,   // final 완료 — 좌석 완료인데 final 이 비면 _seatFinHeal 이 저장 · 새로고침을 불러 가짜 상태가 덮인다
  seatDraft: { tables: [{ name: 'A', seats: ['홍길동', '김영희', '이모부', '박사촌'], drinks: [] }] }, seatToken: 'Sseat', guideToken: 'Gsimtoken000001',
  guideinfoDraft: { seatMode: 'all', reserveTime: '', reserveName: '' }, confirm: null, confirmStale: false, rev: 'r', trackRevs: {},
  dineRsvp: { live: true, meal: true, off: false, open: true, due: DUE, days: 20, maxN: 6, nameMax: 20 } }, over || {});
const STATE = (prod, inv) => ({ name: '김희준 · 이미쿠', product: '시그니처', code: 'ME-SIM', stage: '제작중', stageIndex: SIG.indexOf('제작중'), stageList: SIG.slice(), nextAction: '', contract: { signed: true }, payment: { confirmed: true }, weddingDate: WED, result: null, isException: false,
  invitation: inv || { status: '완료', draft: { method: 'offline', designFamily: '05', invitationUrls: { family: 'https://momentedit.kr/i-family/family-05.html?e=a' } }, published: { eventId: 'a', urls: { family: 'https://momentedit.kr/i-family/family-05.html?e=a' } } },
  production: prod });
const ROWS = [
  { name: '홍길동', key: '홍길동', ans: 'Y', n: 2, by: 'guest', at: kst(-1) + ' 10:00:00' },
  { name: '큰아버지', key: '큰아버지', ans: 'Y', n: 3, by: 'couple', at: kst(-2) + ' 10:00:00' },
  { name: '낯선 이름', key: '낯선이름', ans: 'N', n: 0, by: 'guest', at: kst(-3) + ' 10:00:00' }];
const LIST = (rows, over) => Object.assign({ ok: true, live: true, meal: true, off: false, open: true, due: DUE, days: 20, rows, maxN: 6, nameMax: 20,
  yes: rows.reduce((a, r) => a + (r.ans === 'Y' ? r.n : 0), 0), no: rows.filter((r) => r.ans === 'N').length }, over || {});

async function mypage(vw, state, extra, query) {
  const { page, errors } = await eng.newPage({ port: PORT, viewport: { width: vw, height: vw < 500 ? 844 : 900 } });
  let rows = ROWS.slice(), off = false; const calls = [];
  await page.route('**://script.google.com/**', async (route) => {
    let b = {}; try { b = JSON.parse(route.request().postData() || '{}'); } catch (e) {}
    calls.push(b);
    if (extra && extra[b.action]) return extra[b.action](route, b);
    if (b.action === 'dineRsvpList') return route.fulfill(J(LIST(rows, { off, open: !off })));
    if (b.action === 'dineRsvpEdit') {
      if (b.op === 'del') rows = rows.filter((r) => r.key !== b.key);
      if (b.op === 'add') { const k = String(b.name).replace(/\s+/g, '').toLowerCase(); rows = rows.filter((r) => r.key !== k); rows.unshift({ name: b.name, key: k, ans: b.ans, n: b.ans === 'Y' ? b.n : 0, by: 'couple', at: kst(0) + ' 09:00:00' }); }
      return route.fulfill(J(LIST(rows, { off, open: !off })));
    }
    if (b.action === 'saveProductionTrack' && b.track === 'guideinfo') { off = (b.draft || {}).dineRsvp === 'off'; return route.fulfill(J({ ok: true, rev: 'r2', draft: b.draft })); }
    if (b.action === 'saveProductionTrack') return route.fulfill(J({ ok: true, rev: 'r3', guideToken: 'Gnewtoken000001' }));
    if (b.action === 'getMyState') return route.fulfill(J(Object.assign({ ok: true }, state)));   // 새로고침이 와도 같은 가짜 상태
    return route.fulfill(J({ ok: true }));   // 부팅 호출(자동 로그인 등)은 mypage-shot 과 같은 빈 성공 — 로그인 화면으로 튕기지 않게
  });
  await page.goto(`http://localhost:${PORT}/mypage.html${query || ''}`, { waitUntil: 'load' });
  await page.addStyleTag({ content: FORCE_SOFT });
  await page.waitForTimeout(700);
  await page.evaluate((st) => { show('mypageView'); renderMyPage(st); }, state);
  await page.waitForTimeout(300);
  return { page, errors, calls };
}

for (const vw of (ONLY && ONLY !== 'mypage') ? [] : [390, 1280]) {
  const tag = 'mypage-' + vw;
  let { page, errors, calls } = await mypage(vw, STATE(PROD()));
  await page.evaluate(() => { const b = document.getElementById('mp_guideOpen'); b.scrollIntoView({ block: 'center' }); });
  await page.evaluate(() => document.getElementById('mp_guideOpen').click());
  await page.waitForSelector('#mp_drb .drb-st', { timeout: 5000 }).catch(() => {});
  const blk = await page.evaluate(() => { const d = document.getElementById('mp_drb'); if (!d) return null; const r = d.getBoundingClientRect();
    return { h: (d.querySelector('.drb-h') || {}).textContent, s: (d.querySelector('.drb-s') || {}).textContent, st: [...d.querySelectorAll('.drb-st > div')].map((x) => x.innerText.replace(/\s+/g, ' ')),
      sums: [...d.querySelectorAll('summary')].map((x) => x.innerText.replace(/\s+/g, ' ').trim()), align: getComputedStyle(d).textAlign, afterShare: !!(d.previousElementSibling && d.previousElementSibling.querySelector && d.previousElementSibling.querySelector('.gd-share-btns')),
      tg: (d.querySelector('.drb-tgb') || {}).textContent, tgp: d.querySelector('.drb-tgb') && d.querySelector('.drb-tgb').getAttribute('aria-pressed'), chip: [...document.querySelectorAll('#mp_guidePanel .gd-chip')].map((c) => c.textContent) }; });
  const dm = DUE.split('-');
  t(blk && blk.h === '식사 답' && blk.s === `하객 안내의 식사 안내 아래에서 답을 받아요.하객 화면에는 ${+dm[1]}월 ${+dm[2]}일까지 알려 달라고 적혀 있어요.` && blk.align === 'left' && blk.afterShare, `${tag} «식사 답» — 공유 단추 아래 · 왼쪽 정렬 · 받는 중 글`, blk);
  t(blk && blk.st.join('|') === '함께 5분|예식만 1분', `${tag} 셈 — 함께 5분 · 예식만 1분(좌석에서 답이 없는 이름은 안 센다)`, blk && blk.st);
  const all = await page.evaluate(() => { const a = document.querySelector('#mp_drb .drb-all'); return a ? { t: a.innerText.replace(/\s+/g, ' ').trim(), n: (a.nextElementSibling || {}).textContent } : null; });
  t(all && all.t === '식당에 알릴 인원 함께 5분 + 두 분 = 7분' && all.n === '양가 가족도 함께하시면 «직접 넣기»로 더해 주세요', `${tag} 식당에 알릴 인원 — 함께 5분 + 두 분 = 7분 [HEAD_ALL]`, all);
  t(blk && blk.sums.join('|') === '명단 보기 · 3|직접 넣기|좌석에서 답이 없는 이름 · 3', `${tag} 접힘 셋 — 명단 · 직접 넣기 · 좌석에서 답이 없는 이름`, blk && blk.sums);
  t(blk && blk.tg === '켜짐' && blk.tgp === 'true', `${tag} 켜고 끄기 — 켜짐`, blk);
  t(blk && blk.chip.indexOf('✓ 식사 안내 · 답 받는 중') === -1 && blk.chip.indexOf('✓ 식사 답 받는 중 · 장소 미정') > -1, `${tag} 칩 — 식당 없음 + 답 받는 중 «✓ 식사 답 받는 중 · 장소 미정»`, blk && blk.chip);
  t(calls.filter((c) => c.action === 'dineRsvpList').length === 1, `${tag} 패널을 열 때 한 번만 dineRsvpList`, calls.map((c) => c.action));
  await page.evaluate(() => document.querySelectorAll('#mp_drb details').forEach((d) => { d.open = true; }));
  await page.waitForTimeout(150);
  const lst = await page.evaluate(() => [...document.querySelectorAll('#mp_drb .drb-li')].map((li) => ({ nm: li.querySelector('.nm').innerText.replace(/\s+/g, ' '), mt: li.querySelector('.mt').textContent, del: Math.round(li.querySelector('.del').getBoundingClientRect().height) })));
  t(lst.length === 3 && /^홍길동/.test(lst[0].nm) && /^함께 2분 · \d+월 \d+일$/.test(lst[0].mt) && /직접 넣음/.test(lst[1].nm) && /좌석에 없는 이름/.test(lst[2].nm) && !/좌석에 없는 이름/.test(lst[0].nm) && lst[2].mt.indexOf('예식만') === 0 && lst.every((l) => l.del >= 44), `${tag} 명단 — 줄 · «직접 넣음» · «좌석에 없는 이름» · [지우기] 44px`, lst);
  const pills = await page.evaluate(() => [...document.querySelectorAll('#mp_drb .drb-pill')].map((p) => p.textContent));
  t(pills.join('|') === '김영희|이모부|박사촌', `${tag} 좌석에서 답이 없는 이름 — 김영희 · 이모부 · 박사촌(답한 홍길동은 빠진다)`, pills);
  const csm = await page.evaluate(`(${CONTRAST})('#mp_drb .drb-h, #mp_drb .drb-s, #mp_drb .k, #mp_drb .v, #mp_drb summary, #mp_drb .nm, #mp_drb .mt, #mp_drb .del, #mp_drb .drb-note, #mp_drb .drb-pill, #mp_drb .drb-tg-l, #mp_drb .drb-tgb, #mp_drb .trk-tag')`);
  const lowm = csm.filter((c) => c.r < 4.5);
  t(!lowm.length, `${tag} 새 글자색 대비 4.5:1 이상(${csm.length}곳)`, lowm);
  await page.evaluate(() => document.getElementById('mp_drb').scrollIntoView({ block: 'start' })); await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(SHOTS, `${tag}-1-panel.png`), fullPage: false });
  // 직접 넣기
  await page.fill('#mp_drbName', '작은 어머니'); await page.click('#mp_drb [data-drb="inc"]'); await page.click('#mp_drb [data-drb="add"]');
  await page.waitForFunction(() => /작은 어머니/.test((document.getElementById('mp_drb') || {}).innerText || ''), null, { timeout: 5000 }).catch(() => {});
  const added = await page.evaluate(() => ({ st: [...document.querySelectorAll('#mp_drb .drb-st > div')].map((x) => x.innerText.replace(/\s+/g, ' ')).join('|'), name: document.getElementById('mp_drbName').value }));
  const addCall = calls.find((c) => c.action === 'dineRsvpEdit' && c.op === 'add');
  t(addCall && addCall.name === '작은 어머니' && addCall.ans === 'Y' && addCall.n === 2 && added.st === '함께 7분|예식만 1분' && added.name === '', `${tag} 직접 넣기 — 이름 · 함께 · 인원 → 넣기 · 셈 갱신 · 칸 비움`, { addCall, added });
  // 지우기
  await page.click('#mp_drb .drb-li .del[data-key="홍길동"]');
  await page.waitForTimeout(300);
  const conf = await page.evaluate(() => { const m = [...document.querySelectorAll('.mp-modal')].find((x) => x.offsetParent !== null || getComputedStyle(x).display !== 'none'); return m ? m.innerText.replace(/\s+/g, ' ') : ''; });
  t(/홍길동 님의 답을 지울까요\?/.test(conf), `${tag} 지우기 전 확인 «홍길동 님의 답을 지울까요?»`, conf.slice(0, 80));
  await page.screenshot({ path: path.join(SHOTS, `${tag}-2-delete-confirm.png`) });
  await page.evaluate(() => { const b = [...document.querySelectorAll('.mp-modal button')].find((x) => x.textContent.trim() === '지우기'); if (b) b.click(); });
  await page.waitForFunction(() => !/홍길동/.test([...document.querySelectorAll('#mp_drb .drb-li .nm')].map((n) => n.textContent).join('')), null, { timeout: 5000 }).catch(() => {});
  const afterDel = await page.evaluate(() => ({ names: [...document.querySelectorAll('#mp_drb .drb-li .nm')].map((n) => n.textContent).join(','), pills: [...document.querySelectorAll('#mp_drb .drb-pill')].map((p) => p.textContent).join(',') }));
  t(afterDel.names.indexOf('홍길동') === -1 && /홍길동/.test(afterDel.pills), `${tag} 지우기 — 줄이 빠지고 좌석 맞춰 보기에 다시 뜬다`, afterDel);
  // 끄기
  await page.click('#mp_drb [data-drb="toggle"]');
  await page.waitForFunction(() => ((document.querySelector('#mp_drb .drb-tgb') || {}).textContent || '') === '꺼짐', null, { timeout: 5000 }).catch(() => {});
  const offv = await page.evaluate(() => ({ tg: (document.querySelector('#mp_drb .drb-tgb') || {}).textContent, note: [...document.querySelectorAll('#mp_drb .drb-note')].map((n) => n.textContent).pop(), chip: [...document.querySelectorAll('#mp_guidePanel .gd-chip')].map((c) => c.textContent) }));
  const saveCall = calls.find((c) => c.action === 'saveProductionTrack' && c.track === 'guideinfo');
  t(saveCall && saveCall.draft.dineRsvp === 'off' && saveCall.draft.seatMode === 'all' && !('showSeat' in saveCall.draft), `${tag} 끄기 저장 — guideinfo 에 dineRsvp:'off'(나머지는 그대로 싣는다)`, saveCall && saveCall.draft);
  t(offv.tg === '꺼짐' && offv.note === '하객 화면에서 답 칸이 사라져요.받은 답은 그대로 있어요.' && offv.chip.indexOf('식사 안내 · 비어 있음') > -1, `${tag} 끈 뒤 — 꺼짐 · 작은 글 · 칩도 같은 판정(식당 없이 끄면 하객 화면 식사 칸이 비어 «비어 있음»)`, offv);
  await page.evaluate(() => document.getElementById('mp_drb').scrollIntoView({ block: 'start' })); await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(SHOTS, `${tag}-3-off.png`) });
  const realM = errors.filter((e) => !/favicon|net::ERR|Failed to load resource/.test(e));
  t(realM.length === 0, `${tag} 콘솔 오류 0`, realM.slice(0, 3));
  await page.close();

  // 덩어리 없음 — 스위치 전 · «안 함» / 아직 안 열림(식사 자리 모름)
  ({ page } = await mypage(vw, STATE(PROD({ dineRsvp: { live: false, meal: true, off: false, open: false, due: DUE, days: 20 } }))));
  await page.evaluate(() => document.getElementById('mp_guideOpen').click()); await page.waitForTimeout(200);
  t(!(await page.$('#mp_guidePanel .drb')), `${tag} 스위치 전 — 덩어리 없음`);
  await page.close();
  ({ page } = await mypage(vw, STATE(PROD({ diningDraft: { dining_on: 'N', venuePick: '다이닝 없이 진행할게요' }, dineRsvp: { live: true, meal: false, off: false, open: false, due: DUE, days: 20 } }))));
  await page.evaluate(() => document.getElementById('mp_guideOpen').click()); await page.waitForTimeout(200);
  t(!(await page.$('#mp_guidePanel .drb')), `${tag} 애프터 웨딩 «안 함» — 덩어리 없음`);
  await page.close();
  ({ page } = await mypage(vw, STATE(PROD({ diningDraft: {}, dineRsvp: { live: true, meal: false, off: false, open: false, due: DUE, days: 20 } }))));
  await page.evaluate(() => document.getElementById('mp_guideOpen').click()); await page.waitForTimeout(200);
  const notyet = await page.evaluate(() => { const d = document.querySelector('#mp_guidePanel .drb'); return d ? { s: (d.querySelector('.drb-s') || {}).textContent, st: !!d.querySelector('.drb-st'), det: d.querySelectorAll('details').length } : null; });
  t(notyet && notyet.s === '예식 뒤 하객분들과 식사 자리가 있으면 청첩장 1단계나 애프터 웨딩에서 알려 주세요.그때부터 하객 안내에서 식사 답을 받아요.' && !notyet.st && !notyet.det, `${tag} 아직 안 열림 — 머리 + 설명 한 문단만`, notyet);
  await page.close();
}

// 준비 목록 두 줄 [BOOK_FIRST] · focus · 바뀔 때 알리기 · 애프터 웨딩 2/2
if (!ONLY || ONLY === 'mypage') {
  const rd = { _v: 3, S: {}, summary: { open: true, course: '담백', prep: [{ what: '반지 챙기기', who: 'two', due: 7 }], helpers: [] } };
  const { page } = await mypage(390, STATE(PROD({ ritualDraft: rd, tracks: { invitation: '완료', dining: '시작전', ritual: '완료', final: '완료', seat: '완료' }, dineRsvp: { live: true, meal: true, off: false, open: true, due: DUE, days: 20, restoN: 5 } })));
  await page.evaluate(() => { const d = document.querySelector('.rit-prep'); if (d) { d.open = true; d.scrollIntoView({ block: 'center' }); } });
  const prep = await page.evaluate(() => [...document.querySelectorAll('.rit-prep li')].map((l) => l.textContent.replace(/\s+/g, ' ')));
  const w = new Date(Date.UTC(+WED.slice(0, 4), +WED.slice(5, 7) - 1, +WED.slice(8, 10) - 5));
  t(prep.some((l) => l === '식당 예약하기 · 대략 인원으로 · 청첩장을 보낼 즈음') && prep.some((l) => l === `식당에 최종 인원 알리기 · 하객 안내에서 받은 답을 보고 · ${w.getUTCMonth() + 1}월 ${w.getUTCDate()}일까지(예식 5일 전)`), '준비 목록 두 줄 — 식당 예약하기 · 식당에 최종 인원 알리기(두 분이 고른 5일 전) [BOOK_FIRST]', prep);
  await page.screenshot({ path: path.join(SHOTS, 'mypage-390-4-prep.png') });
  await page.click('.rit-prep [data-drgo]');
  await page.waitForSelector('#mp_drb .drb-st', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(900);   // 부드럽게 내려가는 동안
  const opened = await page.evaluate(() => ({ panel: document.getElementById('mp_guidePanel').style.display !== 'none', blk: !!document.querySelector('#mp_drb .drb-st'), top: Math.round(document.getElementById('mp_drb').getBoundingClientRect().top) }));
  t(opened.panel && opened.blk && opened.top < 400, '준비 목록 «식당에 최종 인원 알리기»를 누르면 하객 안내 패널 «식사 답»으로', opened);
  await page.close();
  // ?focus=dine — 메일 단추로 들어오면 패널을 연 채로 «식사 답»까지
  {
    const r = await mypage(390, STATE(PROD()), null, '?focus=dine');
    await r.page.waitForSelector('#mp_drb .drb-st', { timeout: 6000 }).catch(() => {});
    await r.page.waitForTimeout(600);
    const f = await r.page.evaluate(() => ({ panel: document.getElementById('mp_guidePanel') && document.getElementById('mp_guidePanel').style.display !== 'none', blk: !!document.querySelector('#mp_drb .drb-st'), top: document.getElementById('mp_drb') ? Math.round(document.getElementById('mp_drb').getBoundingClientRect().top) : -1 }));
    t(f.panel && f.blk && f.top >= -5 && f.top < 300, '?focus=dine — 하객 안내 패널이 열린 채로 «식사 답»까지 내려간다', f);
    await r.page.close();
  }
  // 바뀔 때 알리기 [CHANGE_TELL] — 네 경우 · 답이 없으면 안 뜸
  {
    const tell = async (base, draft, inv, noRows) => {
      const r = await mypage(390, STATE(PROD({ diningDraft: base }), inv), noRows ? { dineRsvpList: (route) => route.fulfill(J(LIST([]))) } : null);
      await r.page.evaluate((dr) => { TRKFLOW = { active: false, track: 'dining', step: 1, draft: dr, base: {} }; _drTellBase(); _drTellAfter(); }, draft);
      await r.page.waitForTimeout(900);
      const mm = await r.page.evaluate(() => { const b = [...document.querySelectorAll('.mp-modal')].find((x) => getComputedStyle(x).display !== 'none' && x.getBoundingClientRect().height > 0); return b ? b.innerText.replace(/\s+/g, ' ').trim() : ''; });
      await r.page.close();
      return mm;
    };
    const PUB = { status: '완료', draft: { method: 'offline' }, published: { eventId: 'a', urls: { family: 'https://momentedit.kr/i-family/family-05.html?e=a' } } };
    const a = await tell({ dining_on: 'Y', venuePick: '소반' }, { dining_on: 'N', venuePick: '다이닝 없이 진행할게요' });
    const b = await tell({ dining_on: 'Y', venuePick: '소반' }, { dining_on: 'Y', venuePick: '라 트라토리아' });
    const c = await tell({ dining_on: 'Y', venuePick: '소반', reserveTime: '오전 11시 50분' }, { dining_on: 'Y', venuePick: '소반', reserveTime: '오후 12시' });
    const dd = await tell({}, { dining_on: 'Y' }, PUB);
    const none = await tell({ dining_on: 'Y', venuePick: '소반' }, { dining_on: 'N', venuePick: '다이닝 없이 진행할게요' }, null, true);
    const T1 = '식사를 함께한다고 답한 2분께 바뀐 내용을 직접 알려 주세요 하객 안내에는 바로 바뀌어 보여요.';
    t(a.indexOf(T1) === 0 && /하객 안내 링크 보내기/.test(a) && b.indexOf(T1) === 0 && c.indexOf(T1) === 0, '바뀔 때 알리기 — «안 함»으로 · 식당을 바꿈 · 예약 시간을 바꿈 → 함께한다고 답한 N분께 [CHANGE_TELL]', { a, b, c });
    t(dd.indexOf('이제 하객 안내에서 식사 답을 받아요 청첩장을 이미 보내셨다면 하객 안내 링크를 한 번 더 보내 주세요.') === 0, '바뀔 때 알리기 — 청첩장을 보낸 뒤 식사 답이 새로 열림', dd);
    t(!none, '바뀔 때 알리기 — «함께할게요» 답이 없으면 안 뜬다', none);
  }
  // 애프터 웨딩 2/2 [RESTO_FLOW] · [RESTO_DUE] · [RESV_TIME]
  for (const vw of [390, 1280]) {
    const dd = { dining_on: 'Y', venuePick: '소반', _favs: [{ n: '소반', m: '한정식', tel: '031-000-0000', src: 'resto' }], _step: 1 };
    const r = await mypage(vw, STATE(PROD({ diningDraft: dd, base: { groomKo: '희준', brideKo: '미쿠', weddingDate: WED, weddingTime: '10:00' } })));
    await r.page.evaluate(() => document.getElementById('mp_diningStart').click());
    await r.page.waitForSelector('#dn_rtime', { timeout: 5000 }).catch(() => {});
    const w2 = await r.page.evaluate(() => { const q = (s) => document.querySelector(s); return { script: (q('.inv-prev') || {}).innerText, ph: (q('#dn_rtime') || {}).placeholder, val: (q('#dn_rtime') || {}).value, fill: (q('#dn_rtimeFill') || {}).textContent, note: (q('.dn-rtnote') || {}).textContent,
      rdue: [...document.querySelectorAll('[data-rdue]')].map((b) => b.textContent + ':' + b.getAttribute('aria-checked')), rdn: (q('#dn_rdueN') || {}).innerText, lab: (q('#dn_rdueL') || {}).textContent }; });
    const g7 = new Date(Date.UTC(+WED.slice(0, 4), +WED.slice(5, 7) - 1, +WED.slice(8, 10) - 7)), g11 = new Date(Date.UTC(+WED.slice(0, 4), +WED.slice(5, 7) - 1, +WED.slice(8, 10) - 11));
    t(/최종 인원은 언제까지 알려 드리면 될까요\? 먼저 도착하는 분들이 조금 일찍 앉아 계셔도 될까요\?$/.test(String(w2.script || '').trim()), `2/2-${vw} 통화 문구 끝 두 문장 [RESTO_FLOW]`, w2.script);
    t(w2.ph === '예: 오전 11시 50분' && w2.val === '' && w2.fill === '이 시각으로 넣기' && w2.note === '두 분이 마무리(옷 갈아입기)를 마치고 함께 도착할 수 있는 시각이에요', `2/2-${vw} 예약 시간 — 흐린 예시 · 값은 비어 있음 · «이 시각으로 넣기» [RESV_TIME]`, w2);
    t(w2.lab === '식당에 최종 인원 알릴 날' && w2.rdue.join('|') === '7일 전:false|5일 전:false|3일 전:true|하루 전:false' && w2.rdn.replace(/\s+/g, '') === `예약할때식당에물어보고골라주세요.하객화면에는${g7.getUTCMonth() + 1}월${g7.getUTCDate()}일까지알려달라고보여요.`, `2/2-${vw} 식당 마감 — 기본 3일 전 · 하객 마감 날짜 [RESTO_DUE]`, w2);
    await r.page.evaluate(() => document.getElementById('dn_rtime').scrollIntoView({ block: 'center' }));
    await r.page.waitForTimeout(500);   // .mp-fs 가 0.22s 로 흐려지며 열린다 — 바로 찍으면 뒤 화면이 비쳐 겹쳐 보인다(9/27 실측)
    await r.page.screenshot({ path: path.join(SHOTS, `mypage-${vw}-5-dining22.png`) });
    await r.page.click('[data-rdue="7"]');
    const rd7 = await r.page.evaluate(() => ({ n: document.getElementById('dn_rdueN').innerText.replace(/\s+/g, ''), d: TRKFLOW.draft.restoDue }));
    t(rd7.d === 7 && rd7.n.indexOf(`${g11.getUTCMonth() + 1}월${g11.getUTCDate()}일까지`) > -1, `2/2-${vw} 7일 전을 고르면 하객 마감이 11일 전으로 바로 바뀐다`, rd7);
    await r.page.click('#dn_rtimeFill');
    const fl = await r.page.evaluate(() => ({ v: document.getElementById('dn_rtime').value, d: TRKFLOW.draft.reserveTime, warn: document.getElementById('dn_rtWarn').innerText }));
    t(fl.v === '오전 11시 50분' && fl.d === '오전 11시 50분' && !fl.warn, `2/2-${vw} «이 시각으로 넣기» — 칸과 초안에 · 이른 시각 줄 없음`, fl);
    await r.page.fill('#dn_rtime', '오전 11시 30분');
    const early = await r.page.evaluate(() => document.getElementById('dn_rtWarn').innerText.replace(/\s+/g, ' ').trim());
    await r.page.fill('#dn_rtime', '점심 무렵');
    const unk = await r.page.evaluate(() => document.getElementById('dn_rtWarn').innerText.trim());
    t(early === '두 분은 오전 11시 20분에 마무리가 끝나요. 이 시각이면 두 분이 늦게 도착할 수 있어요.' && !unk, `2/2-${vw} 이른 시각 한 줄 · 못 읽으면 말하지 않음`, { early, unk });
    await r.page.fill('#dn_rtime', '오전 11시 30분');
    await r.page.evaluate(() => document.getElementById('dn_rtime').scrollIntoView({ block: 'center' }));
    await r.page.screenshot({ path: path.join(SHOTS, `mypage-${vw}-6-dining22-early.png`) });
    await r.page.close();
  }
  // 스위치 전 — 2/2 가 지금과 같다
  {
    const dd = { dining_on: 'Y', venuePick: '소반', _favs: [{ n: '소반', m: '한정식', tel: '031-000-0000', src: 'resto' }], _step: 1 };
    const r = await mypage(390, STATE(PROD({ diningDraft: dd, base: { groomKo: '희준', brideKo: '미쿠', weddingDate: WED, weddingTime: '10:00' }, dineRsvp: { live: false, meal: true, off: false, open: false, due: DUE, days: 20 } })));
    await r.page.evaluate(() => document.getElementById('mp_diningStart').click());
    await r.page.waitForSelector('#dn_rtime', { timeout: 5000 }).catch(() => {});
    const off2 = await r.page.evaluate(() => ({ ph: document.getElementById('dn_rtime').placeholder, fill: !!document.getElementById('dn_rtimeFill'), rdue: !!document.querySelector('[data-rdue]'), script: /최종 인원은/.test((document.querySelector('.inv-prev') || {}).innerText || '') }));
    t(off2.ph === '예: 오후 1시 30분' && !off2.fill && !off2.rdue && !off2.script, '스위치 전 2/2 — 예시 · 단추 · 식당 마감 · 두 문장 없음(지금과 같다)', off2);
    await r.page.close();
  }
}

// 청첩장 1단계 물음 [MEAL_ASK_FIRST]
for (const vw of (ONLY && ONLY !== 'invite') ? [] : [390, 1280]) {
  const tag = 'invite-' + vw;
  const INV0 = { status: '시작전', draft: {}, published: null };
  const open = async (prod) => {
    const r = await mypage(vw, STATE(prod, INV0));
    await r.page.evaluate(() => { const b = document.getElementById('mp_invStart'); if (b) b.click(); });
    await r.page.waitForTimeout(300);
    return r;
  };
  let { page, calls } = await open(PROD({ diningDraft: {}, guideToken: '', tracks: { invitation: '시작전', dining: '시작전', ritual: '시작전', final: '시작전', seat: '시작전' }, seatDraft: null, dineRsvp: { live: true, meal: false, off: false, open: false, due: DUE, days: 20 } }));
  const vis = {};
  for (const m of ['online', 'offline', 'both', 'self', 'none']) { await page.click(`.inv-opt[data-m="${m}"]`); vis[m] = !!(await page.$('.inv-meal')); }
  t(!vis.online && vis.offline && vis.both && vis.self && !vis.none, `${tag} 물음 — 오프라인 · 둘 다 · 종이에서만`, vis);
  await page.click('.inv-opt[data-m="offline"]');
  const q = await page.evaluate(() => ({ q: document.querySelector('.inv-meal-q').textContent, b: [...document.querySelectorAll('.inv-meal-yn button')].map((b) => b.textContent + ':' + b.getAttribute('aria-checked') + ':' + Math.round(b.getBoundingClientRect().height)), n: !!document.querySelector('.inv-meal-n') }));
  t(q.q === '예식 뒤 하객분들과 함께하는 식사 자리가 있나요?' && q.b.join('|').replace(/:\d+/g, '') === '있어요:false|없어요:false|아직 몰라요:false' && q.b.every((x) => +x.split(':')[2] >= 44) && !q.n, `${tag} 물음 · 단추 셋(44px) · 처음엔 작은 글 없음`, q);
  await page.evaluate(() => document.querySelector('.inv-meal').scrollIntoView({ block: 'center' }));
  await page.screenshot({ path: path.join(SHOTS, `${tag}-1-question.png`) });
  const note = {};
  for (const [k, lab] of [['Y', '있어요'], ['N', '없어요'], ['U', '아직 몰라요']]) {
    await page.click(`.inv-meal-yn [data-meal="${k}"]`);
    await page.waitForFunction((kk) => { const b = document.querySelector(`.inv-meal-yn [data-meal="${kk}"]`); return b && b.getAttribute('aria-checked') === 'true' && !b.disabled; }, k, { timeout: 5000 }).catch(() => {});
    note[k] = await page.evaluate(() => ({ n: (document.querySelector('.inv-meal-n') || {}).textContent, dd: JSON.stringify(((window._mpStateD || {}).production || {}).diningDraft), tok: ((window._mpStateD || {}).production || {}).guideToken, dn: (((window._mpStateD || {}).production || {}).tracks || {}).dining }));
    if (k === 'Y') await page.screenshot({ path: path.join(SHOTS, `${tag}-2-yes.png`) });
  }
  t(note.Y.n === '하객 안내에서 식사 참석을 먼저 여쭤요.식당은 답을 기다리지 말고 대략 인원으로 먼저 예약해 두세요.' && /"dining_on":"Y"/.test(note.Y.dd) && note.Y.tok === 'Gnewtoken000001', `${tag} «있어요» — 작은 글 · dining_on Y · 하객 안내 링크가 생긴다`, note.Y);
  t(note.N.n === '애프터 웨딩은 «안 함»으로 둘게요.나중에 바꿀 수 있어요.' && /"dining_on":"N"/.test(note.N.dd) && note.N.dn === '완료', `${tag} «없어요» — 작은 글 · 애프터 웨딩 «안 함»과 같게(완료)`, note.N);
  t(note.U.n === '식사를 정하시면 하객 안내에 식사 답 칸이 생겨요.그때 하객 안내 링크를 한 번 더 보내 주세요.' && note.U.dd === '{}', `${tag} «아직 몰라요» — 작은 글 · 이 흐름에서 적은 것을 되돌림(처음 모양)`, note.U);
  const saves = calls.filter((c) => c.action === 'saveProductionTrack' && c.track === 'dining').map((c) => c.draft.dining_on + ':' + c.done);
  t(saves.join('|') === 'Y:false|N:true|undefined:false', `${tag} 저장 — 한 곳(애프터 웨딩 dining 트랙)`, saves);
  // 애프터 웨딩 줄 모양 — 셋 각각(청첩장에서 답해도 같은 답)
  const rowOf = async (dd, dn) => page.evaluate(([d, t2]) => { const p = window._mpStateD.production; p.diningDraft = d; p.tracks.dining = t2; INVFLOW.active = false;
    renderProduction(p, window._mpStateD.invitation); const rows = [...document.querySelectorAll('#mp_production .trk')]; const r = rows.find((x) => /애프터 웨딩/.test(x.textContent)); return r ? r.innerText.replace(/\s+/g, ' ').trim() : ''; }, [dd, dn]);
  const rY = await rowOf({ dining_on: 'Y' }, '진행중'), rN = await rowOf({ dining_on: 'N', venuePick: '다이닝 없이 진행할게요', partner: '다이닝 없이 진행할게요', venue: '', _step: 1 }, '완료'), rU = await rowOf({}, '시작전');
  t(/정하기/.test(rY) && !/안 함/.test(rY) && /안 함/.test(rN) && /다시 정하기/.test(rN) && /정하기/.test(rU) && !/안 함/.test(rU), `${tag} 애프터 웨딩 줄 — 있어요 «정하기» · 없어요 «안 함» 배지 + «다시 정하기» · 아직 몰라요 그대로`, { rY, rN, rU });
  await page.close();
  // 이미 정했으면 안 보임
  ({ page } = await open(PROD({ diningDraft: { dining_on: 'N', venuePick: '다이닝 없이 진행할게요' }, guideToken: '', dineRsvp: { live: true, meal: false, off: false, open: false, due: DUE, days: 20 } })));
  await page.click('.inv-opt[data-m="offline"]');
  const hid1 = !(await page.$('.inv-meal'));
  await page.close();
  ({ page } = await open(PROD({ diningDraft: { dining_on: 'Y', _favs: [{ n: '소반' }] }, dineRsvp: { live: true, meal: true, off: false, open: true, due: DUE, days: 20 } })));
  await page.click('.inv-opt[data-m="both"]');
  const hid2 = !(await page.$('.inv-meal'));
  await page.close();
  ({ page } = await open(PROD({ diningDraft: {}, guideToken: '', dineRsvp: { live: false, meal: false, off: false, open: false, due: DUE, days: 20 } })));
  await page.click('.inv-opt[data-m="offline"]');
  const hid3 = !(await page.$('.inv-meal'));
  await page.close();
  t(hid1 && hid2 && hid3, `${tag} 안 보임 — 이미 «안 함» · 이미 식당 · 스위치 전`, { hid1, hid2, hid3 });
  // «있어요» 뒤 완성 화면에 하객 안내 QR(종이 · QR 받기)
  ({ page } = await open(PROD({ diningDraft: {}, guideToken: '', tracks: { invitation: '시작전', dining: '시작전', ritual: '시작전', final: '시작전', seat: '시작전' }, seatDraft: null, dineRsvp: { live: true, meal: false, off: false, open: false, due: DUE, days: 20 } })));
  await page.click('.inv-opt[data-m="self"]');
  await page.click('.inv-meal-yn [data-meal="Y"]');
  await page.waitForFunction(() => !!(((window._mpStateD || {}).production || {}).guideToken), null, { timeout: 5000 }).catch(() => {});
  const qr = await page.evaluate(() => { INVFLOW.draft.method = 'self'; INVFLOW.draft.selfQR = true; const box = document.getElementById('mp_production');
    invStepDone(box, { ok: true, urls: { live: 'https://momentedit.kr/live.html?e=a' }, eventId: 'a' }); const f = document.getElementById('iv_gfold'); return { fold: !!f, url: f ? (f.querySelector('.done-url') || {}).textContent : '' }; });
  t(qr.fold && /\/g\/Gnewtoken000001$/.test(qr.url), `${tag} «있어요» 뒤 완성 화면(종이 · QR 받기)에 하객 안내 QR`, qr);
  await page.evaluate(() => { const f = document.getElementById('iv_gfold'); if (f) { f.open = true; f.scrollIntoView({ block: 'center' }); } }); await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(SHOTS, `${tag}-3-done-guideqr.png`) });
  await page.close();
}

await eng.close(); srv.close();
console.log(`━━ dine-rsvp-sim — 통과 ${okn.length} · 위반 ${bad.length} · 그림 ${SHOTS}`);
bad.forEach((b) => console.log('   ✗ ' + b));
process.exit(bad.length ? 1 : 0);
