#!/usr/bin/env node
/* ★★[RESCHED_NOW 2026-10-09 점검 D-3 · D-8 · D-19] 마이페이지 «시간 변경»(schedule.html) · 메일 링크 화면 B 를 서버 원문 · 진짜 화면으로 잰다.
   서버(_gasworld · 진짜 .gs)
     ① getAvailability 가 currentTime · currentStatus(confirmed · picked · '') · depositPaid(입금 확인 · 카드 승인) · depositCard 를 싣는다 · 스냅의 «예약금» 카드 키는 상담 예약금이 아니다
     ② 낸 예약금이면 submitSchedule 이 입금자명을 덮지 않고 «카드 결제 대기»도 걸지 않는다 · 상태는 «시간선택완료»로 돌아가고 관리자 메일은 «예약금은 이미 받았어요»
     ③ 안 낸 예약금이면 종전대로(입금자명 저장)
   화면(playwright · 390 · 1280)
     ④ schedule.html — 옛 서버(값 없음)면 종전 그대로 · 확인 중이면 «신청한 시간 · 확인 중» + «이미 입금하셨다면…» · 낸 예약금이면 «지금 잡힌 시간» ·
        예약금 · 계좌 · 입금자명 · 카드 칸이 걷히고 «이미 받았어요» 한 줄 · 입금자명 없이 신청이 나가고(payer · 현금영수증 빈 값) 완료 창 글이 «시간 변경» ·
        응답이 늦어 다시 물을 때 같은 날 시간만 바꾼 신청도 «들어갔다»로 가린다(currentTime)
     ⑤ 화면 B(ScreenB_schedule) — [CAL_FULL_DIM] 시간이 모두 마감된 날은 «예약 가능일»이 아니다 · 첫 달은 빈 날이 있는 달 ·
        [REVISIT_NUM_JOSA] «14:50 으로 · 14:50 이»처럼 숫자 뒤 띄어 쓴 조사가 없다 · 낸 예약금이면 예약금 칸이 걷힌다
   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { openWorld, kstAheadWeekday } from './_gasworld.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let bad = 0;
const ok = (c, m, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + String(d).slice(0, 260)}`); if (!c) bad++; };
let G, world;
try { ({ G, world } = openWorld()); } catch (e) { console.log('━━ resched-paid — GAS 세계를 못 만들었습니다 · 재지 못했습니다: ' + e.message); process.exit(2); }
for (const fn of ['handleGetAvailability', 'handleSubmitSchedule', 'submitSchedule', '_consultDeposit', 'serveScheduleB']) {
  if (typeof G[fn] !== 'function') { console.log(`━━ resched-paid — ${fn} 이 없습니다 · 재지 못했습니다`); process.exit(2); }
}
const CUR = kstAheadWeekday(20), NEW = kstAheadWeekday(25);
let notes = [], mails = [];
function mk(cust, book) {
  const w = world(Object.assign({ 현재단계: '상담확정', 상품타입: '시그니처', 동의기록: '{}', 신랑이름: '김신랑', 신부이름: '이신부', 입금자명: '김신랑' }, cust || {}),
    Object.assign({ 상태: '확정', 선택날짜: CUR, 선택시간: '14:50', 입금확인: '확인', 토큰: 'ctok', 이메일: 'a@b.c', 연락처: '01012345678', 신청일시: new Date() }, book || {}));
  G.resolveSession = () => ({ ok: true, row: G.findCustomerByCode() });
  G._sessionToConsult = () => ({ ok: true, code: 'ME-TEST', cust: G.findCustomerByCode(), consult: G.findRowByPersonalCode() });
  G._cachedAvailability = () => ({ avail: [], full: {} });
  G.findRowByToken = () => ({ num: 2, get: (h) => (h in w.B ? w.B[h] : '') });
  G._slotTaken = () => false; G.lockBusySignal = () => {};
  notes = []; mails = [];
  G.notifyKakao = (k, c, x) => { notes.push({ k, x: x || {} }); };
  G.sendAdminNotifyEmail = (row, dk, tm, flex, etc, byCard, paid) => { mails.push({ byCard: !!byCard, paid: !!paid }); };
  return w;
}
const rec = (w) => { try { return JSON.parse(w.C['동의기록'] || '{}'); } catch (e) { return {}; } };
const avail = () => { try { return G.handleGetAvailability({ token: 't' }); } catch (e) { return { threw: e.message }; } };

console.log('━━ 서버 ① getAvailability 가 싣는 값');
{ mk(); const a = avail(); ok(a && a.ok && a.currentDate === CUR && a.currentTime === '14:50' && a.currentStatus === 'confirmed' && a.depositPaid === true && a.depositCard === false, '확정 · 계좌 입금 확인 → confirmed · 14:50 · depositPaid', JSON.stringify(a)); }
{ mk({}, { 상태: '시간선택완료', 입금확인: '' }); const a = avail(); ok(a && a.currentStatus === 'picked' && a.depositPaid === false, '시간선택완료 · 입금 전 → picked · depositPaid false', JSON.stringify(a)); }
{ mk({ 동의기록: JSON.stringify({ 결제수단: { 예약금: '카드' } }) }, { 상태: '승인완료' }); const a = avail(); ok(a && a.currentStatus === 'confirmed' && a.depositPaid === true && a.depositCard === true, '카드 승인 → depositCard true', JSON.stringify(a)); }
{ mk({ 동의기록: JSON.stringify({ 결제수단: { 예약금: '카드' } }) }, { 상태: '시간선택완료', 입금확인: '' }); const a = avail(); ok(a && a.depositPaid === true && a.depositCard === true, '카드 승인인데 입금확인 칸 기록 전(B-1) → 그래도 낸 예약금', JSON.stringify(a)); }
{ mk({ 상품타입: '웨딩스냅', 동의기록: JSON.stringify({ 결제수단: { 예약금: '카드' } }) }, { 상태: '시간선택완료', 입금확인: '' }); const a = avail(); ok(a && a.depositPaid === false && a.depositCard === false, '스냅의 «예약금» 카드 키(계약금 카드분)는 상담 예약금이 아니다', JSON.stringify(a)); }
{ const t = new Date(2026, 0, 1, 9, 5); mk({}, { 선택시간: t }); const a = avail(); ok(a && a.currentTime === '09:05', '시트가 시각으로 바꿔 둔 선택시간도 HH:MM', JSON.stringify(a && a.currentTime)); }
{ mk({}, { 상태: '신청접수', 선택날짜: '', 선택시간: '', 입금확인: '' }); const a = avail(); ok(a && a.currentStatus === '' && a.currentTime === '' && a.depositPaid === false, '신청접수(시간 없음) → 빈 값', JSON.stringify(a)); }

console.log('━━ 서버 ②③ 시간을 바꿀 때');
{ const w = mk(); G._IN_POST = true; let r; try { r = G.handleSubmitSchedule({ token: 't', dateKey: NEW, time: '18:10', payer: '새사람', cashReceipt: '', payBy: 'card' }); } catch (e) { r = { threw: e.message }; }
  ok(r && r.ok, '낸 예약금 · 시간 변경 → ok', JSON.stringify(r));
  ok(w.C['입금자명'] === '김신랑' && !w.writes().some((e) => e.h === '입금자명'), '② 입금자명을 덮지 않는다(«새사람»을 보내도)', w.C['입금자명']);
  ok(!rec(w).예약금결제, '② «카드 결제 대기»를 걸지 않는다(payBy card 를 보내도)', w.C['동의기록']);
  ok(w.B['상태'] === '시간선택완료' && w.B['입금확인'] === '확인' && w.B['선택시간'] === '18:10', '② 상태는 «시간선택완료»로 · 입금확인은 그대로 · 새 시간', JSON.stringify({ st: w.B['상태'], dep: w.B['입금확인'], t: w.B['선택시간'] }));
  const sp = notes.find((n) => n.k === 'admin.slotPicked');
  ok(!!sp && sp.x.card === false && mails.length === 1 && mails[0].paid === true && mails[0].byCard === false, '② 관리자 알림 · 메일 — 카드 대기 아님 · «예약금은 이미 받았어요»', JSON.stringify({ notes, mails }));
  G._IN_POST = false; }
{ const w = mk({}, { 상태: '시간선택완료', 입금확인: '' }); G._IN_POST = true; let r; try { r = G.handleSubmitSchedule({ token: 't', dateKey: NEW, time: '18:10', payer: '새사람', cashReceipt: '', payBy: 'bank' }); } catch (e) { r = { threw: e.message }; }
  ok(r && r.ok && w.C['입금자명'] === '새사람' && mails.length === 1 && mails[0].paid === false, '③ 입금 전이면 종전대로 입금자명 저장 · 관리자 메일 «입금 확인 후»', JSON.stringify({ r, payer: w.C['입금자명'], mails }));
  G._IN_POST = false; }
{ const src = fs.readFileSync(path.join(ROOT, 'automation/consultation/consultation-booking.gs'), 'utf8');
  ok(/예약금은 이미 받았어요<\/b> · 바뀐 시간만 확인하고 승인해 주세요/.test(src), '② 관리자 메일 본문에 «예약금은 이미 받았어요 · 바뀐 시간만 확인» 갈래가 있다'); }

/* ── 화면 ── */
const T0 = new Date(); T0.setHours(0, 0, 0, 0);
const dOf = (off) => { const d = new Date(T0); d.setDate(d.getDate() + off); return d; };
const nk = (d) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
const pk = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const wkOff = (from) => { for (let i = from; i < from + 14; i++) { const w = dOf(i).getDay(); if (w !== 0 && w !== 6) return i; } return from; };
const o1 = wkOff(3), o2 = wkOff(o1 + 1), o3 = wkOff(o2 + 1);
const SW = ['11:30', '14:50', '18:10', '19:30'], SE = ['18:20'];
const BASE = { ok: true, avail: [nk(dOf(o1)), nk(dOf(o2)), nk(dOf(o3))], full: {}, holdActive: false, slotsWeekday: SW, slotsWeekend: SE, duration: 40, names: '정하윤 · 김도현', depositStr: '100,000', account: '기업 000-000-00000', holder: '모먼트에디트' };
const CASES = {
  old: Object.assign({}, BASE, { currentDate: pk(dOf(o1)) }),
  picked: Object.assign({}, BASE, { currentDate: pk(dOf(o1)), currentTime: '14:50', currentStatus: 'picked', depositPaid: false, depositCard: false }),
  paid: Object.assign({}, BASE, { currentDate: pk(dOf(o1)), currentTime: '14:50', currentStatus: 'confirmed', depositPaid: true, depositCard: false }),
  card: Object.assign({}, BASE, { currentDate: pk(dOf(o1)), currentTime: '14:50', currentStatus: 'confirmed', depositPaid: true, depositCard: true }),
};
let measured = true;
try {
  const { launchBrowser } = await import('./_browser.mjs');
  const eng = await launchBrowser();
  if (!eng || eng.kind !== 'playwright') { measured = false; if (eng) await eng.close(); console.log('skip 화면 — playwright 없음(재지 못한 것이지 결함이 아님)'); }
  else {
    const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'resched-'));
    const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const f = u.startsWith('/__tmp/') ? path.join(TMP, u.slice(7)) : path.join(ROOT, u);
      if (!(f.startsWith(ROOT) || f.startsWith(TMP)) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : f.endsWith('.css') ? 'text/css' : 'text/html; charset=utf-8' }); r.end(fs.readFileSync(f)); });
    await new Promise((res) => srv.listen(0, res)); const port = srv.address().port;
    const shotDir = process.env.SHOT_DIR || '';
    async function open(server, vw, opt) {
      opt = opt || {};
      const pg = await eng.newPage({ port, viewport: { width: vw, height: 900 } });
      await pg.page.addInitScript((cfg) => {
        try { localStorage.setItem('me_token', 'tok_resched_00000000'); } catch (e) {}
        window.__gasLog = []; const _f = window.fetch;
        window.fetch = function (u, o) {
          if (String(u).indexOf('script.google.com') !== -1) {
            let b = {}; try { b = JSON.parse((o && o.body) || '{}'); } catch (e) {}
            window.__gasLog.push(b);
            if (b.action === 'submitSchedule' && cfg.abortSubmit) return Promise.reject(new DOMException('aborted', 'AbortError'));
            let res = { ok: true };
            if (b.action === 'getAvailability') res = (cfg.after && window.__gasLog.filter((x) => x.action === 'submitSchedule').length) ? cfg.after : cfg.server;
            else if (b.action === 'weddingAvailability') res = { ok: true, taken: {} };
            else if (b.action === 'cardPayConfig') res = { ok: true, enabled: false };
            return Promise.resolve(new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } }));
          }
          return _f.apply(this, arguments);
        };
      }, { server, after: opt.after || null, abortSubmit: !!opt.abortSubmit });
      pg.page.setDefaultTimeout(8000);
      await pg.page.goto(`http://localhost:${port}/schedule.html?me=1`, { waitUntil: 'load' }); await pg.page.waitForTimeout(700);
      return pg;
    }
    const pickTime = async (page, off, t) => {
      for (let k = 0; k < 3; k++) { const ok1 = await page.$(`#calGrid button.day.avail[aria-label^="${dOf(off).getFullYear()}년 ${dOf(off).getMonth() + 1}월 ${dOf(off).getDate()}일 "]`); if (ok1) { await ok1.click(); break; }
        const nx = await page.$('#nextM'); if (!nx || await nx.isDisabled()) break; await nx.click(); await page.waitForTimeout(120); }
      await page.waitForTimeout(150);
      const btn = await page.$$('#slots button.slot:not(.full)'); for (const b of btn) { if ((await b.textContent()).indexOf(t) !== -1) { await b.click(); break; } }
      await page.waitForTimeout(250);
    };
    const shown = (page, sel) => page.$eval(sel, (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length)).catch(() => false);
    const txt = (page, sel) => page.$eval(sel, (e) => e.textContent.replace(/\s+/g, ' ').trim()).catch(() => null);
    for (const vw of [390, 1280]) {
      // ④-옛 서버
      { const { page, errors } = await open(CASES.old, vw);
        ok(!(await page.$('#kiNow')), `${vw} ④ 옛 서버 — «지금 잡힌 시간» 줄 없음`);
        await pickTime(page, o2, '18:10');
        ok(await shown(page, '#payBank .deposit-acct') && await shown(page, '#depPayer') && !(await shown(page, '#depPaid')), `${vw} ④ 옛 서버 — 예약금 · 계좌 · 입금자명 칸 그대로`);
        await page.click('#submitBtn'); await page.waitForTimeout(300);
        ok((await page.evaluate(() => window.__gasLog.filter((b) => b.action === 'submitSchedule').length)) === 0, `${vw} ④ 옛 서버 — 입금자명 없이는 종전대로 막힌다`);
        ok(errors.length === 0, `${vw} ④ 옛 서버 화면 오류 없음`, errors.join(' | ')); await page.close(); }
      // ④-확인 중(입금 전)
      { const { page, errors } = await open(CASES.picked, vw);
        const k = await txt(page, '#kiNow');
        ok(k && /^신청한 시간/.test(k) && /14:50/.test(k) && /확인 중/.test(k), `${vw} ④ 확인 중 — «신청한 시간 … 14:50 · 확인 중»`, k);
        await pickTime(page, o2, '18:10');
        ok(await shown(page, '#depAgain') && /이미 입금하셨다면 다시 보내지 않으셔도 돼요/.test(await txt(page, '#depAgain') || '') && await shown(page, '#depPayer'), `${vw} ④ 확인 중 — 계좌는 그대로 · «이미 입금하셨다면…» 한 줄`);
        ok(errors.length === 0, `${vw} ④ 확인 중 화면 오류 없음`, errors.join(' | ')); await page.close(); }
      // ④-낸 예약금(계좌) · 카드
      for (const key of ['paid', 'card']) {
        const { page, errors } = await open(CASES[key], vw);
        const k = await txt(page, '#kiNow');
        ok(k && /^확정된 시간/.test(k) && /14:50/.test(k) && !/확인 중/.test(k), `${vw} ④ ${key} — «확정된 시간 … 14:50»`, k);
        const kh = await page.$eval('#kiNow .keyinfo-val', (e) => { const r = e.getBoundingClientRect(), lh = parseFloat(getComputedStyle(e).lineHeight) || 22; return Math.round(r.height / lh); }).catch(() => 9);
        const vx = await page.$$eval('.keyinfo .keyinfo-row .keyinfo-val', (a) => a.map((e) => Math.round(e.getBoundingClientRect().left)));
        ok(kh <= 1 && vx.length >= 3 && vx.every((x) => x === vx[0]), `${vw} ④ ${key} — «확정된 시간» 값이 한 줄 · 이름표가 다른 줄과 같은 폭(값이 같은 세로줄)`, kh + '줄 · 값 왼쪽 ' + JSON.stringify(vx));
        ok(/이미 받았어요/.test(await txt(page, '.keyinfo-row:not(#kiNow) .keyinfo-sub') || '') && /새 시간을 확인한 뒤/.test(await txt(page, '.keyinfo-note') || ''), `${vw} ④ ${key} — 맨 위 안내가 «이미 받았어요 · 새 시간을 확인한 뒤»`);
        await pickTime(page, o2, '18:10');
        ok(!(await shown(page, '#guide .deposit:not(#depPaid)')) && await shown(page, '#depPaid') && !(await shown(page, '#depPayer')) && !(await shown(page, '#payMethod')), `${vw} ④ ${key} — 예약금 · 계좌 · 입금자명 · 카드 칸이 걷히고 «이미 받았어요» 한 줄`);
        const dp = await txt(page, '#depPaidT');
        ok(key === 'card' ? /^예약금은 카드로 이미 받았어요 ?다시 결제하지 않으셔도 돼요$/.test(dp || '') : /^예약금은 이미 받았어요 ?다시 보내지 않으셔도 돼요$/.test(dp || ''), `${vw} ④ ${key} — «${dp}»`);
        const dl = await page.$$eval('#depPaidT > div', (a) => a.map((e) => Math.round(e.getBoundingClientRect().height / (parseFloat(getComputedStyle(e).lineHeight) || 20))));
        ok(dl.length === 2 && dl.every((n) => n <= 1), `${vw} ④ ${key} — «이미 받았어요» 두 줄이 각각 한 줄(낱말이 떨어지지 않게)`, JSON.stringify(dl));
        if (shotDir && vw === 390) { try { await page.screenshot({ path: path.join(shotDir, `resched-${key}-390-top.png`), clip: { x: 0, y: 0, width: 390, height: 900 } }); await page.evaluate(() => document.getElementById('depPaid').scrollIntoView({ block: 'center' })); await page.screenshot({ path: path.join(shotDir, `resched-${key}-390-deposit.png`) }); } catch (x) {} }
        await page.click('#submitBtn'); await page.waitForTimeout(400);
        const s = await page.evaluate(() => window.__gasLog.filter((b) => b.action === 'submitSchedule'));
        ok(s.length === 1 && s[0].payer === '' && s[0].cashReceipt === '' && s[0].payBy === 'bank' && s[0].time === '18:10', `${vw} ④ ${key} — 입금자명 없이 신청이 나간다(payer · 현금영수증 빈 값 · 계좌 갈래)`, JSON.stringify(s));
        const mt = await txt(page, '#modalTitle'), mb = await txt(page, '#modal .modal-body');
        ok(mt === '시간 변경이 접수되었습니다' && /예약금은 이미 받아 다시 보내지 않으셔도 됩니다/.test(mb || '') && /확정 메일을 보내 드립니다/.test(mb || '') && !/입금 확인 후/.test(mb || ''), `${vw} ④ ${key} — 완료 창 «시간 변경이 접수되었습니다» · 예약금 다시 안 냄 · 확정 메일`, mt + ' / ' + mb);
        if (shotDir && vw === 390 && key === 'paid') { try { await page.screenshot({ path: path.join(shotDir, 'resched-paid-390-modal.png') }); } catch (x) {} }
        ok(errors.length === 0, `${vw} ④ ${key} 화면 오류 없음`, errors.join(' | ')); await page.close();
      }
      // ④-응답이 늦어 다시 물음 — 같은 날 시간만 바꾼 신청
      { const after = Object.assign({}, CASES.paid, { currentTime: '18:10', currentStatus: 'picked' });
        const { page, errors } = await open(CASES.paid, vw, { abortSubmit: true, after });
        await pickTime(page, o1, '18:10'); await page.click('#submitBtn'); await page.waitForTimeout(700);
        ok(await shown(page, '#modal.show .modal') || (await page.$eval('#modal', (e) => e.classList.contains('show')).catch(() => false)), `${vw} ④ 늦은 답 → 다시 물어 같은 날 시간만 바꾼 신청도 «들어갔다»(currentTime)`, await txt(page, '#summary'));
        ok(errors.length === 0, `${vw} ④ 늦은 답 화면 오류 없음`, errors.join(' | ')); await page.close(); }
    }
    // ⑤ 화면 B
    { const f8 = dOf(o1), f9 = dOf(o2);
      const server = { slotsWeekday: SW, slotsWeekend: SE, duration: 40, avail: [nk(f8), nk(f9)], full: { [nk(f8)]: SW.slice() }, names: '김신랑 · 이신부', token: 'tok123456789', me: false,
        picked: { date: pk(f9), time: '14:50', status: '확정' }, depositPaid: true };
      const sub = { names: server.names, account: '기업 000-000-00000', holder: '모먼트에디트', depositStr: '100,000', kakao: 'https://pf.kakao.com/x', serverJson: JSON.stringify(server).replace(/</g, '\\u003c') };
      const gesc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
      let h = fs.readFileSync(path.join(ROOT, 'automation/consultation/ScreenB_schedule.html'), 'utf8');
      h = h.replace(/<\?!=\s*(\w+)\s*\?>/g, (m, k) => sub[k] ?? '').replace(/<\?=\s*(\w+)\s*\?>/g, (m, k) => gesc(sub[k] ?? ''));
      fs.writeFileSync(path.join(TMP, 'b.html'), h);
      const server2 = Object.assign({}, server, { picked: { date: pk(f9), time: '14:50', status: '시간선택완료' }, depositPaid: false });
      fs.writeFileSync(path.join(TMP, 'b2.html'), h.replace(sub.serverJson, JSON.stringify(server2).replace(/</g, '\\u003c')));
      for (const vw of [390, 1280]) {
        const { page, errors } = await eng.newPage({ port, viewport: { width: vw, height: 900 } });
        await page.addInitScript(() => { window.google = { script: { run: new Proxy({}, { get: () => () => new Proxy({}, { get: () => () => {} }) }), host: { close() {}, setHeight() {} } } }; });
        await page.goto(`http://localhost:${port}/__tmp/b.html`, { waitUntil: 'load' }); await page.waitForTimeout(500);
        const lab = (d) => `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
        const cls = await page.evaluate(([y, m]) => { const out = {}; [...document.querySelectorAll('#calGrid .day')].forEach((e) => { out[e.textContent.trim()] = e.className; }); return { title: document.getElementById('calTitle').textContent, out }; }, [0, 0]);
        let fullCls = null, freeCls = null;
        for (let k = 0; k < 3; k++) {
          const t = await page.$eval('#calTitle', (e) => e.textContent.trim());
          const want8 = f8.getFullYear() + ' ' + f8.toLocaleString('en', { month: 'long' }), want9 = f9.getFullYear() + ' ' + f9.toLocaleString('en', { month: 'long' });
          const days = await page.$$eval('#calGrid .day', (a) => a.map((e) => [e.textContent.trim(), e.className]));
          if (t === want8 && fullCls == null) fullCls = (days.find((d) => d[0] === String(f8.getDate())) || [])[1] || '';
          if (t === want9 && freeCls == null) freeCls = (days.find((d) => d[0] === String(f9.getDate())) || [])[1] || '';
          if (fullCls != null && freeCls != null) break;
          const nx = await page.$('#nextM'); if (!nx || await nx.isDisabled()) break; await nx.click(); await page.waitForTimeout(120);
        }
        void cls; void lab;
        ok(fullCls != null && !/\bavail\b/.test(fullCls) && /\boff\b/.test(fullCls), `${vw} ⑤ [CAL_FULL_DIM] 시간이 모두 마감된 날(${nk(f8)})은 흐리게(off)`, fullCls);
        ok(freeCls != null && /\bavail\b/.test(freeCls), `${vw} ⑤ 빈 시간이 있는 날(${nk(f9)})은 예약 가능일`, freeCls);
        const rv = await txt(page, '#revisit');
        ok(rv && /^확정된 상담은 .*14:50입니다\./.test(rv) && !/ 으로 | 이 접수/.test(rv), `${vw} ⑤ [REVISIT_NUM_JOSA] «확정된 상담은 … 14:50입니다.»`, rv);
        ok(!(await shown(page, '#guide .deposit')) && /이미 받았습니다/.test(await txt(page, '.keyinfo-note') || ''), `${vw} ⑤ [RESCHED_NOW] 화면 B — 낸 예약금이면 예약금 칸이 걷히고 맨 위 안내가 «이미 받았습니다»`);
        if (shotDir && vw === 390) { try { await page.evaluate(() => document.getElementById('revisit').scrollIntoView({ block: 'center' })); await page.screenshot({ path: path.join(shotDir, 'screenb-390-revisit.png') }); } catch (x) {} }
        await page.goto(`http://localhost:${port}/__tmp/b2.html`, { waitUntil: 'load' }); await page.waitForTimeout(400);
        const rv2 = await txt(page, '#revisit');
        ok(rv2 && /^접수된 신청은 .*14:50입니다\./.test(rv2) && !/ 이 접수/.test(rv2), `${vw} ⑤ «접수된 신청은 … 14:50입니다.»`, rv2);
        ok(await page.$eval('#guide .deposit', (e) => !e.hidden).catch(() => false), `${vw} ⑤ 입금 전이면 예약금 칸 그대로`);
        ok(errors.length === 0, `${vw} ⑤ 화면 B 오류 없음`, errors.join(' | ')); await page.close();
      }
      // 첫 달 — 첫 상담가능일이 꽉 찬 날이고 빈 날이 다음 달이면 다음 달로 연다
      { const a = new Date(T0.getFullYear(), T0.getMonth() + 1, 1); let fa = null, fb = null;
        for (let i = 0; i < 28 && (!fa || !fb); i++) { const d = new Date(a.getFullYear(), a.getMonth(), a.getDate() + i); const w = d.getDay(); if (w === 0 || w === 6) continue; if (!fa) fa = d; }
        const nm = new Date(a.getFullYear(), a.getMonth() + 1, 1); for (let i = 0; i < 28 && !fb; i++) { const d = new Date(nm.getFullYear(), nm.getMonth(), nm.getDate() + i); if (d.getDay() !== 0 && d.getDay() !== 6) fb = d; }
        const s3 = Object.assign({}, server, { avail: [nk(fa), nk(fb)], full: { [nk(fa)]: SW.slice() }, picked: null, depositPaid: false });
        fs.writeFileSync(path.join(TMP, 'b3.html'), h.replace(sub.serverJson, JSON.stringify(s3).replace(/</g, '\\u003c')));
        const { page, errors } = await eng.newPage({ port, viewport: { width: 390, height: 900 } });
        await page.addInitScript(() => { window.google = { script: { run: new Proxy({}, { get: () => () => new Proxy({}, { get: () => () => {} }) }), host: { close() {}, setHeight() {} } } }; });
        await page.goto(`http://localhost:${port}/__tmp/b3.html`, { waitUntil: 'load' }); await page.waitForTimeout(400);
        const t = await page.$eval('#calTitle', (e) => e.textContent.trim());
        ok(t === fb.getFullYear() + ' ' + fb.toLocaleString('en', { month: 'long' }), '⑤ 첫 달 — 첫 상담가능일이 꽉 찼으면 빈 날이 있는 달로 연다', t);
        ok(errors.length === 0, '⑤ 첫 달 화면 오류 없음', errors.join(' | ')); await page.close(); }
    }
    await eng.close(); srv.close(); fs.rmSync(TMP, { recursive: true, force: true });
  }
} catch (e) { measured = false; bad++; console.log('FAIL 화면 검사 도중 멈춤 — ' + String((e && e.message) || e).split('\n')[0]); }

if (bad) { console.log(`━━ resched-paid — 빨강 ${bad}건 [RESCHED_NOW]`); process.exit(1); }
console.log(`━━ resched-paid — 통과 · 시간 변경 서버 값 · 낸 예약금 입금자명 안 덮음${measured ? ' · schedule.html(옛 서버 · 확인 중 · 계좌 · 카드 · 늦은 답) · 화면 B(마감일 흐림 · 조사 · 예약금)' : ' · (화면은 못 잼)'} [RESCHED_NOW]`);
process.exit(0);
