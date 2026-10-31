#!/usr/bin/env node
/* ★★[FAB_NAMES_1031 사장님 «마우스 올리면 나오는 문구, 위쪽이랑 아래쪽 아이콘도 동일하게» · 코워크] 오른쪽 아이콘 줄의 모든 단추에 같은 이름표(/assets/fab-names.js).
 *
 *   1280 마이페이지(상담 뒤 · 내 내역 · 드레스 · 상담 도우미 · 맨 위로) · 메인(index) · 일정(schedule)
 *   ① 올리면 이름표가 뜬다 · 이름은 표대로 · 화면 왼쪽 밖으로 안 잘린다 · 포인터를 이름표로 옮겨도 남는다 · Esc 로 닫힌다
 *   ② 드레스 이름표 겉모습은 그대로(위치 · 크기 · 글꼴 · 색 — 옛 판 실측값과 같다)
 *   ③ 맨 위로가 안 보일 때 · 1회 말풍선이 떠 있을 때 · 상담 도우미 패널이 열렸을 때 · 전체 화면 편집 때 이름표 안 뜸
 *   ⑤ 이름표 가운데 = 아이콘 가운데(±0.5px · FAB_NM_ICO_CY) · 올림 100ms 뒤 투명 · 250ms 뒤 보임 · 나가면 바로 · 초점 바로(FAB_NM_HOVER_DELAY)
 *   ⑥ [FAB_TOUCH_FOCUS] 드레스 창을 닫아 초점이 돌아와도 — 390 터치 · 1280 마우스는 테두리 · 이름표 없음 · 1280 키보드(Tab · Enter · Esc)는 초점 · 이름표 그대로(사파리처럼 :focus-visible 강제)
 *   ④ 390 휴대폰(터치 · hover 없음) — 이름표가 뜨지 않는다
 *   종료: 0 통과 · 1 틀림 · 2 재지 못했다(브라우저 없음)
 *   캡처: FAB_NAMES_SHOTS=<폴더>
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';
import { freePort } from './_freeport.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon' };
const SHOTS = process.env.FAB_NAMES_SHOTS || '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const PORT = await freePort();
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u);
  if (!(f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile())) { r.statusCode = 404; return r.end('nf'); }
  r.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream'); r.setHeader('cache-control', 'no-store'); r.end(fs.readFileSync(f));
});
await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
const eng = await launchBrowser();
if (!eng) { console.log('━━ fab-names — 브라우저가 없어 재지 못했습니다 · 재지 못한 것이지 화면 결함이 아닙니다'); srv.close(); process.exit(2); }

let bad = 0; const rows = [];
const no = (m) => { bad++; console.log('   ✗ ' + m); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const LIST = ['신청접수', '상담확정', '시착', '상담완료', '계약완료', '입금완료', '제작중', '예식완료', '결과물전달', '후기'];
const STATE = (after) => JSON.stringify({ ok: true, name: '김희준 · 이미쿠', product: '시그니처', code: 'ME-TABS', ledger: { items: [] }, stage: after ? '상담완료' : '신청접수', stageIndex: after ? 3 : 0, stageList: LIST, nextAction: '', contract: null, payment: null, result: null, isException: false, production: null,
  consult: after ? { status: '상담완료', date: '2026년 10월 20일 (화)', time: '14:00', dress: { attire: '대여 희망 · 2벌', open: true, ymd: '2026-10-20', saved: null } } : { status: '신청접수', scheduleUrl: 'x', dress: { attire: '대여 희망 · 2벌', open: true, ymd: '', saved: null } } });
const ENTRY = (after) => after ? '#mp_dressFab' : '#mp_consult .dst';
const ANS = { none: null, part: { len: 'ankle', fit: '', pref: [] }, full: { len: 'ankle', fit: 'waist', pref: ['arms'] } };

async function page(W, H, after, opts = {}) {
  const { page: P, errors } = await eng.newPage({ port: PORT, viewport: { width: W, height: H }, gasBody: STATE(after) });
  if (eng.kind === 'puppeteer' && P.setViewport) await P.setViewport({ width: W, height: H });   // [DRESS_OPS_VIEWPORT] 와 같다
  const init = "if(location.pathname==='/dress.html'){ window.__qObs=1; new MutationObserver(function(){ if(document.querySelector('.pk-q,.pk-opt,.pk-mine,.wz-steps')) window.__qFlash=1; }).observe(document,{subtree:true,childList:true}); } try{ localStorage.setItem('me_token','TOK'); " + (opts.tipSeen === false ? '' : "localStorage.setItem('me_drfabtip_v1','o'); localStorage.setItem('me_ledtip_v1','o'); ") + (opts.ans ? "localStorage.setItem('me_dress_ans:ME-TABS', " + JSON.stringify(JSON.stringify(opts.ans)) + '); ' : "localStorage.removeItem('me_dress_ans:ME-TABS'); ") + '}catch(e){}';
  await (P.addInitScript ? P.addInitScript(init) : P.evaluateOnNewDocument(init));
  await P.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load', timeout: 30000 });
  const vp = await P.evaluate(() => [innerWidth, innerHeight]);
  if (vp[0] !== W || vp[1] !== H) throw new Error(`창 크기 ${vp.join('×')} ≠ ${W}×${H}`);
  await P.waitForSelector(ENTRY(after), { timeout: 15000, state: 'visible', visible: true });
  return { P, errors };
}
const open = async (P, after) => { await P.click(ENTRY(after)); const fr = await (await P.waitForSelector('#mp_drFrame', { timeout: 15000 })).contentFrame(); await fr.waitForSelector('#pkMain > *', { timeout: 15000, state: 'attached' }); await wait(500); return fr; };
const closeX = async (P, fr) => { await fr.click('#pkExit'); await wait(500); };

const NAMES = { mp_ledFab: '내 내역', mp_dressFab: '드레스 · 소품 · 부케', meAdvFab: '상담 도우미', mp_topFab: '맨 위로' };
/* 옛 판(드레스 전용 규칙) 실측 — 1280 · 이름표 상자 [left, top, width, height] · 글꼴 · 색 */
const DRESS_OLD = process.env.FAB_DRESS_OLD ? JSON.parse(process.env.FAB_DRESS_OLD) : [[1065.3, 398.5, 134.7, 36], '"Noto Serif KR", "Nanum Myeongjo", serif | 13px | normal | 400 | normal | rgb(90, 85, 76) | 8px 10px | 9px'];   // 2026-10-31 main 0d050e7 판(드레스 전용 규칙) 실측 · [FAB_NM_ICO_CY] 위만 400.5 → 398.5(아이콘 가운데에 맞춤 · 올리면 아이콘이 2px 뜬다)
const nmInfo = (P, sel) => P.evaluate((s) => { const b = document.querySelector(s); if (!b) return null; const n = b.querySelector('.me-fab-nm'); if (!n) return { none: 1 }; const c = getComputedStyle(n), r = n.getBoundingClientRect(), ic = b.querySelector('.me-fab-ico'), ir = ic ? ic.getBoundingClientRect() : r; return { dy: Math.round(((r.top + r.height / 2) - (ir.top + ir.height / 2)) * 10) / 10, vis: c.visibility, op: +c.opacity, txt: n.textContent, box: [r.left, r.top, r.width, r.height].map((x) => Math.round(x * 10) / 10), font: [c.fontFamily, c.fontSize, c.lineHeight, c.fontWeight, c.letterSpacing, c.color, c.padding, c.borderRadius].join(' | ') }; }, sel);
async function hover(P, sel) { const r = await P.evaluate((s) => { const b = document.querySelector(s); if (!b) return null; const q = b.getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2]; }, sel); if (!r) return false; await P.mouse.move(r[0], r[1]); await wait(450); return true; }   // [FAB_NM_HOVER_DELAY] 150ms 지연 + 0.2초 나타남
const away = async (P, W, H) => { await P.mouse.move(Math.round(W / 3), Math.round(H / 2)); await wait(320); };

try {
  /* ── 1280 마이페이지 ── */
  { const W = 1280, H = 900, tag = '1280 마이페이지';
    const { P, errors } = await page(W, H, true, { ans: ANS.full });
    await P.waitForSelector('#mp_ledFab', { timeout: 15000, state: 'visible', visible: true }).catch(() => {});
    await P.evaluate(() => { const d = document.createElement('div'); d.style.height = '2400px'; document.body.appendChild(d); window.scrollTo(0, 900); }); await wait(600);
    for (const id of Object.keys(NAMES)) {
      const sel = '#' + id; await away(P, W, H);
      if (!(await hover(P, sel))) { no(`${tag} ${id} 단추가 없다`); continue; }
      const n = await nmInfo(P, sel);
      if (!n || n.none) { no(`${tag} ${id} 이름표가 없다 [FAB_NAMES_1031]`); continue; }
      if (n.vis !== 'visible' || n.op < 0.9 || n.txt !== NAMES[id]) no(`${tag} ${id} 올려도 이름표 ${JSON.stringify(n)} [FAB_NAMES_1031]`);
      if (n.box[0] < 0) no(`${tag} ${id} 이름표가 왼쪽 밖으로 잘린다 ${n.box} [FAB_NAMES_1031]`);
      if (Math.abs(n.dy) > 0.5) no(`${tag} ${id} 이름표 가운데가 아이콘 가운데와 ${n.dy}px 어긋난다 [FAB_NM_ICO_CY]`);
      if (SHOTS) await P.screenshot({ path: `${SHOTS}/mypage-1280-${id}.png` });
      if (id === 'mp_dressFab') { rows.push(`${tag} 드레스 이름표 ${JSON.stringify(n.box)} ${n.font}`); if (process.argv.includes('--dress-now')) console.log('DRESS_NOW ' + JSON.stringify([n.box, n.font]));
        if (DRESS_OLD && (JSON.stringify(DRESS_OLD[0]) !== JSON.stringify(n.box) || DRESS_OLD[1] !== n.font)) no(`${tag} 드레스 이름표 겉모습이 바뀌었다 ${JSON.stringify(DRESS_OLD)} → ${JSON.stringify([n.box, n.font])} [FAB_NAMES_1031]`); }
      /* 이름표로 옮겨도 남는다 · Esc 로 닫힌다 */
      await P.mouse.move(n.box[0] + n.box[2] - 4, n.box[1] + n.box[3] / 2, { steps: 6 }); await wait(300);
      const stay = await nmInfo(P, sel);
      await P.mouse.move(n.box[0] + n.box[2] + 4, n.box[1] + n.box[3] / 2); await wait(450); const gap = await nmInfo(P, sel);   // 이름표와 아이콘 사이 8px 틈에 잠시 머물러도
      if (gap.vis !== 'visible') no(`${tag} ${id} 이름표와 아이콘 사이 틈에서 이름표가 사라진다 [FAB_NAMES_1031]`);
      await P.keyboard.press('Escape'); await wait(250); const esc = await nmInfo(P, sel);
      if (stay.vis !== 'visible' || esc.vis !== 'hidden') no(`${tag} ${id} 이름표로 옮기면 ${stay.vis} · Esc 뒤 ${esc.vis} [FAB_NAMES_1031]`);
      rows.push(`${tag} ${id} «${n.txt}» 왼끝 ${n.box[0]} · 옮겨도 ${stay.vis} · Esc ${esc.vis}`);
    }
    /* 맨 위로가 안 보일 때 */
    await away(P, W, H); await P.evaluate(() => window.scrollTo(0, 0)); await wait(700);
    await hover(P, '#mp_topFab'); const tf = await nmInfo(P, '#mp_topFab');
    if (tf && !tf.none && tf.vis !== 'hidden') no(`${tag} 맨 위로가 숨었는데 이름표가 보인다 ${tf.vis} [FAB_NAMES_1031]`);
    /* 상담 도우미 패널이 열렸을 때 */
    await away(P, W, H); await P.click('#meAdvFab'); await wait(500); await hover(P, '#mp_ledFab'); const pn = await nmInfo(P, '#mp_ledFab');
    if (pn.vis !== 'hidden') no(`${tag} 상담 도우미 패널이 열렸는데 이름표가 보인다 [FAB_NAMES_1031]`);
    await P.keyboard.press('Escape'); await wait(500);
    /* 전체 화면 편집(mp-fs-on) */
    await away(P, W, H); await P.evaluate(() => document.body.classList.add('mp-fs-on')); await hover(P, '#mp_ledFab'); const fs = await nmInfo(P, '#mp_ledFab');
    if (fs.vis !== 'hidden') no(`${tag} 전체 화면 편집 중에 이름표가 보인다 [FAB_NAMES_1031]`);
    await P.evaluate(() => document.body.classList.remove('mp-fs-on'));
    rows.push(`${tag} 맨 위로 숨음 ${tf && tf.vis} · 패널 열림 ${pn.vis} · 전체 화면 ${fs.vis}`);
    if (errors.length) no(`${tag} 페이지 오류 ${errors[0]}`);
    await P.close();
  }
  /* ── 1280 마이페이지 · 1회 말풍선 우선 ── */
  { const W = 1280, H = 900, tag = '1280 말풍선';
    const { P } = await page(W, H, true, { ans: ANS.full, tipSeen: false });
    await P.waitForSelector('.me-fab-tip', { timeout: 8000, state: 'attached' }).catch(() => {});
    const tipOn = await P.evaluate(() => !!document.querySelector('.me-fab-tip'));
    const tipBtn = await P.evaluate(() => document.querySelector('.me-fab-tip2') ? '#mp_dressFab' : '#mp_ledFab');
    await hover(P, tipBtn); const tn = await nmInfo(P, tipBtn);
    if (!tipOn) no(`${tag} 1회 말풍선이 안 떴다 — 재는 길이 틀렸다`);
    else if (tn.vis !== 'hidden') no(`${tag} 말풍선이 떠 있는데 ${tipBtn} 이름표도 보인다(겹침) [FAB_NAMES_1031]`);
    if (SHOTS) await P.screenshot({ path: `${SHOTS}/mypage-1280-tip.png` });
    rows.push(`${tag} 말풍선 ${tipOn} · ${tipBtn} 이름표 ${tn && tn.vis}`);
    await P.close();
  }
  /* ── 1280 메인 · 일정 ── */
  for (const [pg, want] of [['index.html', { '[aria-label="마이페이지"]': '마이페이지', '#meAdvFab': '상담 도우미', '#meShareFab': '공유하기', '[aria-label="상담 예약하기"]': '상담 예약' }], ['schedule.html', { '[aria-label="예식 진행 시간표 보기"]': '예식 진행 시간표' }]]) {
    const W = 1280, H = 900, tag = `1280 ${pg}`;
    const { page: P, errors } = await eng.newPage({ port: PORT, viewport: { width: W, height: H }, gasBody: '{"ok":true}' });
    if (eng.kind === 'puppeteer' && P.setViewport) await P.setViewport({ width: W, height: H });
    await P.goto(`http://localhost:${PORT}/${pg}`, { waitUntil: 'load', timeout: 30000 }); await wait(800);
    if (pg === 'index.html') {   // 첫 화면은 줄이 아직 숨어 있다(.reveal 전) — 그 자리에 올려도 이름표가 안 보여야 한다
      await hover(P, '.me-fab-stack #meAdvFab'); const pre = await nmInfo(P, '.me-fab-stack #meAdvFab');
      if (pre && !pre.none && pre.vis !== 'hidden') no(`${tag} 줄이 숨어 있는데 이름표가 보인다 [FAB_NAMES_1031]`);
      await away(P, W, H); await P.evaluate(() => window.scrollTo(0, 900)); await wait(900); }
    const hid = await P.evaluate(() => { const s = document.querySelector('.me-fab-stack'); return s ? getComputedStyle(s).visibility : 'none'; });
    let i = 0;
    for (const [sel, nm] of Object.entries(want)) {
      await away(P, W, H); if (!(await hover(P, '.me-fab-stack ' + sel))) { no(`${tag} ${sel} 단추가 없다`); continue; }
      const n = await nmInfo(P, '.me-fab-stack ' + sel);
      if (!n || n.none || n.vis !== 'visible' || n.txt !== nm || n.box[0] < 0) no(`${tag} ${sel} 이름표 ${JSON.stringify(n)} — «${nm}» [FAB_NAMES_1031]`);
      else rows.push(`${tag} «${n.txt}» 왼끝 ${n.box[0]} · 아이콘과 세로 ${n.dy}`);
      if (n && !n.none && Math.abs(n.dy) > 0.5) no(`${tag} ${sel} 이름표 가운데가 아이콘 가운데와 ${n.dy}px 어긋난다 [FAB_NM_ICO_CY]`);
      if (SHOTS && i++ < 3) await P.screenshot({ path: `${SHOTS}/${pg.replace('.html', '')}-1280-${i}.png` });
    }
    if (hid !== 'visible') no(`${tag} 줄이 안 보이는 상태에서 쟀다(${hid}) — 재는 길이 틀렸다`);
    /* [FAB_NM_HOVER_DELAY] 올림 100ms 뒤엔 아직 투명 · 250ms 뒤엔 보임 · 나가면 바로 사라지기 시작 · 키보드 초점은 바로 */
    if (pg === 'schedule.html') {
      const sel = '.me-fab-stack ' + Object.keys(want)[0];
      const c = await P.evaluate((s) => { const q = document.querySelector(s).getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2]; }, sel);
      await away(P, W, H); await P.mouse.move(c[0], c[1]); await wait(100); const t100 = await nmInfo(P, sel); await wait(150); const t250 = await nmInfo(P, sel);
      await wait(300); await away(P, W, H).catch(() => {});
      await P.mouse.move(c[0], c[1]); await wait(500); await P.mouse.move(Math.round(W / 3), Math.round(H / 2)); await wait(100); const out100 = await nmInfo(P, sel); await wait(400);
      await P.keyboard.press('Tab'); await P.evaluate((s) => document.querySelector(s).focus(), sel); await wait(100); const f100 = await nmInfo(P, sel);   // [FAB_TOUCH_FOCUS] 키보드 쓰는 중(Tab) — Shift 만으로는 키보드 사용으로 치지 않는다
      const fv = await P.evaluate((s) => document.querySelector(s).matches(':focus-visible'), sel);
      await P.evaluate(() => document.activeElement && document.activeElement.blur());
      if (t100.op > 0.05) no(`${tag} 올리고 100ms 만에 이름표가 보인다(불투명도 ${t100.op}) — 훑으면 깜빡인다 [FAB_NM_HOVER_DELAY]`);
      if (t250.vis !== 'visible' || t250.op < 0.2) no(`${tag} 올리고 250ms 뒤에도 이름표가 안 보인다 ${t250.vis} · ${t250.op} [FAB_NM_HOVER_DELAY]`);
      if (out100.op > 0.7) no(`${tag} 마우스가 나가고 100ms 뒤에도 이름표가 그대로다(${out100.op}) — 나갈 땐 지연 없이 [FAB_NM_HOVER_DELAY]`);
      if (!fv) no(`${tag} 키보드 초점 흉내가 :focus-visible 이 아니다 — 재는 길이 틀렸다`);
      else if (f100.vis !== 'visible' || f100.op < 0.3) no(`${tag} 키보드 초점 100ms 뒤에 이름표가 아직 ${f100.vis} · ${f100.op} — 초점은 지연 없이 [FAB_NM_HOVER_DELAY]`);
      rows.push(`${tag} 올림 100ms ${t100.op} · 250ms ${t250.op} · 나감 100ms ${out100.op} · 초점 100ms ${f100.op}`);
    }
    if (errors.length) no(`${tag} 페이지 오류 ${errors[0]}`);
    await P.close();
  }
  /* ── ★[FAB_TOUCH_FOCUS 2026-10-31 사장님 아이폰 스크린샷] 창을 닫아 초점이 돌아올 때 — 터치 · 마우스면 테두리 · 이름표 없음 · 키보드면 그대로 ──
     아이폰 사파리는 프로그램 초점을 :focus-visible 로 친다 — 크롬은 안 그래서, 개발 도구로 그 상태를 강제로 켜고 잰다(사파리 흉내) */
  const cdpOf = async (P) => (P.context ? await P.context().newCDPSession(P) : await P.target().createCDPSession());
  const forceFV = async (cdp, sel) => { await cdp.send('DOM.enable'); await cdp.send('CSS.enable'); const { root } = await cdp.send('DOM.getDocument', { depth: -1 }); const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel }); if (!nodeId) return false; await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['focus', 'focus-visible'] }); return true; };
  const look = (P, sel) => P.evaluate((s) => { const b = document.querySelector(s), n = b && b.querySelector('.me-fab-nm'); if (!b || !n) return null; const cb = getComputedStyle(b), cn = getComputedStyle(n);
    return { act: document.activeElement === b, ptr: b.classList.contains('nm-ptr'), op: +cn.opacity, vis: cn.visibility, ol: cb.outlineStyle === 'none' || parseFloat(cb.outlineWidth) === 0 ? 'none' : cb.outlineStyle + ' ' + cb.outlineWidth }; }, sel);
  for (const [W, H, how] of [[390, 844, 'touch'], [1280, 900, 'mouse'], [1280, 900, 'kbd']]) {
    const tag = `${W} ${how} · 드레스 창 닫은 뒤`;
    const { P, errors } = await page(W, H, true, { ans: ANS.full });
    const cdp = await cdpOf(P);
    if (how === 'touch') { await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }).catch(() => {}); await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' }).catch(() => {}); }
    await P.waitForSelector('#mp_dressFab', { timeout: 15000, state: 'visible', visible: true });
    if (how === 'kbd') { await P.keyboard.press('Tab'); await P.evaluate(() => document.getElementById('mp_dressFab').focus()); await P.keyboard.press('Enter'); }
    else if (how === 'touch') {   // 터치 흉내 중에는 page.click 이 멈춘다 — 손가락 탭을 직접 보낸다
      const c = await P.evaluate(() => { const r = document.getElementById('mp_dressFab').getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]; });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c[0], y: c[1] }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else await P.click('#mp_dressFab');
    const fr = await (await P.waitForSelector('#mp_drFrame', { timeout: 15000 })).contentFrame(); await fr.waitForSelector('#pkMain > *', { timeout: 15000, state: 'attached' }); await wait(600);
    if (how === 'kbd') { await fr.focus('#pkTabD'); await P.keyboard.press('Escape'); } else await fr.evaluate(() => document.getElementById('pkExit').click());   // 창 안 입력은 부모에 안 온다 — 닫기만 하면 된다
    await wait(700); if (how !== 'kbd') await P.mouse.move(Math.round(W / 3), Math.round(H / 2)).catch(() => {});
    await wait(300);
    const forced = await forceFV(cdp, '#mp_dressFab'); await wait(350);
    const r = await look(P, '#mp_dressFab');
    if (SHOTS) await P.screenshot({ path: `${SHOTS}/close-${how}-${W}.png` });
    if (!forced || !r) no(`${tag} 재지 못했다(강제 초점 ${forced}) — 재는 길이 틀렸다`);
    else if (how === 'kbd') { if (!r.act || r.ptr || r.op < 0.5 || r.vis !== 'visible') no(`${tag} 키보드인데 초점 · 이름표가 안 돌아왔다 ${JSON.stringify(r)} [FAB_TOUCH_FOCUS]`); }
    else if (r.op > 0.01 || r.vis === 'visible' || r.ol !== 'none') no(`${tag} 이름표 · 테두리가 남는다(아이폰 사파리 증상) ${JSON.stringify(r)} [FAB_TOUCH_FOCUS]`);
    rows.push(`${tag} ${JSON.stringify(r)}`);
    if (errors.length) no(`${tag} 페이지 오류 ${errors[0]}`);
    await P.close();
  }
  /* ── 390 휴대폰 · 터치 — 이름표 안 뜸 ── */
  { const W = 390, H = 844, tag = '390 휴대폰';
    const { P, errors } = await page(W, H, true, { ans: ANS.full });
    const cdp = P.context ? await P.context().newCDPSession(P) : await P.target().createCDPSession();
    await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }).catch(() => {});
    await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' }).catch(() => {});
    const hov = await P.evaluate(() => matchMedia('(hover:hover)').matches);
    await P.waitForSelector('#mp_ledFab', { timeout: 15000, state: 'visible', visible: true }).catch(() => {});
    const shown = [];
    for (const id of Object.keys(NAMES)) { if (!(await hover(P, '#' + id))) continue; const n = await nmInfo(P, '#' + id); if (n && !n.none && n.vis === 'visible') shown.push(id); }
    if (hov) rows.push(`${tag} 이 브라우저는 터치 흉내 뒤에도 hover:hover — 그 칸은 재지 못함`);
    else if (shown.length) no(`${tag} 휴대폰(hover 없음)에서 이름표가 뜬다 ${shown.join(' · ')} [FAB_NAMES_1031]`);
    if (SHOTS) await P.screenshot({ path: `${SHOTS}/mypage-390.png` });
    rows.push(`${tag} hover:hover ${hov} · 뜬 이름표 ${shown.length}`);
    if (errors.length) no(`${tag} 페이지 오류 ${errors[0]}`);
    await P.close();
  }
} catch (e) { no(`재다가 멈췄다 — ${String(e && e.message || e).split('\n')[0]}`); }
finally { await eng.close(); srv.close(); }
if (process.argv.includes('--print') || bad) rows.forEach((r) => console.log('   · ' + r));
if (bad) { console.log(`━━ fab-names — 실패 ${bad}건 [FAB_NAMES_1031]`); process.exit(1); }
console.log('━━ fab-names — 통과 · 마이페이지 · 메인 · 일정 줄 아이콘 이름표(올림 · 옮겨도 · Esc · 왼쪽 안 잘림 · 아이콘 가운데 · 올림 150ms 지연 · 초점 바로) · 드레스 겉모습 그대로 · 맨 위로 숨음 · 말풍선 · 패널 · 전체 화면 · 휴대폰 안 뜸 [FAB_NAMES_1031]');
